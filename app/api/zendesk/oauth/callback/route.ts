import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForToken, ZendeskOAuthError } from "@/lib/zendesk-oauth";
import { testZendeskConnection, ZendeskApiError } from "@/lib/zendesk";

const COOKIE_NAME = "zendesk_oauth";

function fail(request: NextRequest, message: string) {
  const res = NextResponse.redirect(
    new URL(`/settings?zendesk_error=${encodeURIComponent(message)}`, request.url)
  );
  res.cookies.delete(COOKIE_NAME);
  return res;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const params = request.nextUrl.searchParams;
  const zendeskError = params.get("error");
  if (zendeskError) {
    return fail(request, params.get("error_description") || zendeskError);
  }

  const code = params.get("code");
  const returnedState = params.get("state");
  if (!code || !returnedState) {
    return fail(request, "Zendesk didn't return an authorization code.");
  }

  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  if (!cookie) {
    return fail(request, "Connection attempt expired — try again.");
  }

  let saved: { nonce: string; subdomain: string };
  try {
    saved = JSON.parse(cookie);
  } catch {
    return fail(request, "Connection attempt was invalid — try again.");
  }

  if (returnedState !== saved.nonce) {
    return fail(request, "Connection attempt didn't match — try again.");
  }

  const redirectUri = new URL("/api/zendesk/oauth/callback", request.url).toString();

  try {
    const tokens = await exchangeCodeForToken(saved.subdomain, code, redirectUri);
    const { agentName } = await testZendeskConnection({
      subdomain: saved.subdomain,
      accessToken: tokens.accessToken,
    });

    await supabase.from("crm_connections").upsert(
      {
        user_id: user.id,
        provider: "zendesk",
        subdomain: saved.subdomain,
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        token_expires_at: tokens.expiresAt,
        agent_email: null,
        api_token: null,
        status: "connected",
        connected_agent_name: agentName,
        last_verified_at: new Date().toISOString(),
        last_error: null,
      },
      { onConflict: "user_id" }
    );

    const res = NextResponse.redirect(new URL("/settings?zendesk=connected", request.url));
    res.cookies.delete(COOKIE_NAME);
    return res;
  } catch (err) {
    const message =
      err instanceof ZendeskOAuthError || err instanceof ZendeskApiError
        ? err.message
        : "Couldn't finish connecting Zendesk.";

    await supabase.from("crm_connections").upsert(
      {
        user_id: user.id,
        provider: "zendesk",
        subdomain: saved.subdomain,
        status: "error",
        last_error: message,
      },
      { onConflict: "user_id" }
    );

    return fail(request, message);
  }
}
