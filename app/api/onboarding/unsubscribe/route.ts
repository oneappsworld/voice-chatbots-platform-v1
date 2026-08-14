import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isUnsubscribeConfigured, verifyUnsubscribeToken } from "@/lib/unsubscribe-token";

/**
 * One-click unsubscribe — must work for an anonymous click straight out of
 * an email client, no session. Token proves the link is genuinely one we
 * sent for this user (see lib/unsubscribe-token.ts); no auth cookie needed.
 * Also handles the List-Unsubscribe-Post one-click POST some mail clients
 * send automatically (RFC 8058) — same handler, no HTML page for that case.
 */
function page(title: string, message: string): NextResponse {
  return new NextResponse(
    `<!doctype html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f7;margin:0;padding:60px 16px;text-align:center;color:#1a1a2e;">
      <div style="max-width:420px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;">
        <h1 style="font-size:18px;margin:0 0 12px;">${title}</h1>
        <p style="margin:0;color:#5a5a6e;font-size:14px;line-height:1.6;">${message}</p>
      </div>
    </body></html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

async function unsubscribe(request: NextRequest): Promise<NextResponse> {
  const uid = request.nextUrl.searchParams.get("uid");
  const token = request.nextUrl.searchParams.get("token");

  if (!isUnsubscribeConfigured()) {
    return NextResponse.json({ error: "Unsubscribe not configured yet." }, { status: 503 });
  }
  if (!uid || !token || !verifyUnsubscribeToken(uid, token)) {
    return page("Link not valid", "This unsubscribe link is invalid or has expired. If you're still receiving unwanted emails, reply to any of them and we'll take care of it.");
  }

  const supabase = createServiceClient();
  await supabase.from("profiles").update({ onboarding_emails_unsubscribed: true }).eq("id", uid);
  await supabase.from("onboarding_emails").update({ status: "skipped" }).eq("user_id", uid).eq("status", "pending");

  return page("You're unsubscribed", "You won't receive any more onboarding emails from ChatSyn. You'll still get account and billing emails when they're needed.");
}

export async function GET(request: NextRequest) {
  return unsubscribe(request);
}

// RFC 8058 one-click unsubscribe — mail clients that support it POST here
// directly instead of opening the link in a browser.
export async function POST(request: NextRequest) {
  return unsubscribe(request);
}
