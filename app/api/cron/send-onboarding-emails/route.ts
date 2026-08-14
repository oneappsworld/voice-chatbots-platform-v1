import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isResendConfigured, sendEmail } from "@/lib/resend";
import { isUnsubscribeConfigured, generateUnsubscribeToken } from "@/lib/unsubscribe-token";
import { buildOnboardingEmail, type SequenceStep } from "@/lib/onboarding-emails";

const APP_URL = "https://chatsyn.io";

/**
 * Triggered by Vercel Cron (see vercel.json — runs once daily, the most
 * frequent schedule this project's Vercel plan allows). Sends every
 * onboarding_emails row that's due (scheduled_at <= now, status='pending')
 * and hasn't been unsubscribed from. Rows are seeded per-user at signup by
 * handle_new_user — this route only sends what's already scheduled, it
 * doesn't decide who gets the sequence.
 *
 * Step 1 (the "immediate" welcome email) doesn't wait for this daily run —
 * see lib/send-welcome-email.ts, called from the dashboard the moment a
 * new user first lands there. This route still picks up any step-1 row
 * that one missed (e.g. Resend wasn't configured yet at signup time), so
 * it's a real fallback, not dead code.
 *
 * If Resend or the unsubscribe secret isn't configured yet, this
 * deliberately leaves every due row untouched (still 'pending') rather than
 * marking anything sent/failed — once real credentials are set, the next
 * cron run picks up everything that piled up in the meantime. Never sends
 * an email without a working unsubscribe link, so those two config checks
 * gate together.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured yet." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isResendConfigured() || !isUnsubscribeConfigured()) {
    return NextResponse.json({
      status: "not_configured",
      resendConfigured: isResendConfigured(),
      unsubscribeConfigured: isUnsubscribeConfigured(),
      message: "Onboarding emails are scheduled but not being sent yet — waiting on real config. Nothing was skipped or lost.",
    });
  }

  const supabase = createServiceClient();

  const { data: dueEmails, error: dueError } = await supabase
    .from("onboarding_emails")
    .select("id, user_id, sequence_step")
    .eq("status", "pending")
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(200);

  if (dueError) {
    return NextResponse.json({ error: dueError.message }, { status: 500 });
  }
  if (!dueEmails || dueEmails.length === 0) {
    return NextResponse.json({ status: "ok", processed: 0, sent: 0, skipped: 0, failed: 0 });
  }

  const userIds = [...new Set(dueEmails.map((e) => e.user_id))];
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, email, full_name, onboarding_emails_unsubscribed, organizations(subscription_status)")
    .in("id", userIds);

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of dueEmails) {
    const profile = profileById.get(row.user_id);

    if (!profile || !profile.email) {
      await supabase.from("onboarding_emails").update({ status: "failed", error: "profile or email missing" }).eq("id", row.id);
      failed += 1;
      continue;
    }

    if (profile.onboarding_emails_unsubscribed) {
      await supabase.from("onboarding_emails").update({ status: "skipped" }).eq("id", row.id);
      skipped += 1;
      continue;
    }

    const unsubscribeUrl = `${APP_URL}/api/onboarding/unsubscribe?uid=${row.user_id}&token=${generateUnsubscribeToken(row.user_id)}`;
    const org = profile.organizations as unknown as { subscription_status?: string } | null;
    const email = buildOnboardingEmail(row.sequence_step as SequenceStep, {
      firstName: profile.full_name?.split(" ")[0] ?? "",
      appUrl: APP_URL,
      unsubscribeUrl,
      isTrialing: org?.subscription_status !== "active",
    });

    const result = await sendEmail({ to: profile.email, subject: email.subject, html: email.html, text: email.text, unsubscribeUrl });

    if (result.ok) {
      await supabase
        .from("onboarding_emails")
        .update({ status: "sent", sent_at: new Date().toISOString(), resend_message_id: result.messageId })
        .eq("id", row.id);
      sent += 1;
    } else {
      await supabase.from("onboarding_emails").update({ status: "failed", error: result.error }).eq("id", row.id);
      failed += 1;
    }
  }

  return NextResponse.json({ status: "ok", processed: dueEmails.length, sent, skipped, failed });
}
