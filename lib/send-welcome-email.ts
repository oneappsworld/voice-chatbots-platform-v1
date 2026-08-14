import { createServiceClient } from "@/lib/supabase/service";
import { isResendConfigured, sendEmail } from "@/lib/resend";
import { isUnsubscribeConfigured, generateUnsubscribeToken } from "@/lib/unsubscribe-token";
import { buildOnboardingEmail } from "@/lib/onboarding-emails";

const APP_URL = "https://chatsyn.io";

/**
 * Sends the immediate (step 1) welcome email the moment a real, already-
 * authenticated user first reaches /dashboard after signup, instead of
 * waiting for the onboarding cron (which only runs daily on this project's
 * Vercel plan — see vercel.json — too slow for something the spec calls
 * "immediate"). Steps 2-5 stay on the daily cron; only step 1 needs this.
 *
 * Safe to call with any userId that reached this point, because the only
 * caller (app/dashboard/page.tsx) derives it from `supabase.auth.getUser()`
 * on its own request — never from client-supplied input — before calling
 * this. The service client below only ever touches that one verified
 * user's own row, matched by the unique (user_id, sequence_step=1) key.
 *
 * Cheap on every other page load: the WHERE clause only matches once per
 * user, ever — after the first successful send the row's status is no
 * longer 'pending' and the query returns nothing.
 */
export async function sendWelcomeEmailIfDue(userId: string): Promise<void> {
  if (!isResendConfigured() || !isUnsubscribeConfigured()) return;

  const supabase = createServiceClient();

  const { data: row } = await supabase
    .from("onboarding_emails")
    .select("id")
    .eq("user_id", userId)
    .eq("sequence_step", 1)
    .eq("status", "pending")
    .maybeSingle();

  if (!row) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, onboarding_emails_unsubscribed")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.email || profile.onboarding_emails_unsubscribed) return;

  const unsubscribeUrl = `${APP_URL}/api/onboarding/unsubscribe?uid=${userId}&token=${generateUnsubscribeToken(userId)}`;
  const email = buildOnboardingEmail(1, {
    firstName: profile.full_name?.split(" ")[0] ?? "",
    appUrl: APP_URL,
    unsubscribeUrl,
    isTrialing: true,
  });

  const result = await sendEmail({ to: profile.email, subject: email.subject, html: email.html, text: email.text, unsubscribeUrl });

  if (result.ok) {
    await supabase
      .from("onboarding_emails")
      .update({ status: "sent", sent_at: new Date().toISOString(), resend_message_id: result.messageId })
      .eq("id", row.id);
  } else {
    await supabase.from("onboarding_emails").update({ status: "failed", error: result.error }).eq("id", row.id);
  }
}
