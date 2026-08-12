import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildAuthorizeUrl } from "@/lib/zendesk-oauth";

const COOKIE_NAME = "zendesk_oauth";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const subdomain = request.nextUrl.searchParams.get("subdomain")?.trim();
  if (!subdomain) {
    return NextResponse.redirect(
      new URL("/settings?zendesk_error=Enter+your+Zendesk+subdomain+first.", request.url)
    );
  }

  const nonce = crypto.randomUUID();
  const redirectUri = new URL("/api/zendesk/oauth/callback", request.url).toString();

  let authorizeUrl: string;
  try {
    authorizeUrl = buildAuthorizeUrl(subdomain, redirectUri, nonce);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Zendesk OAuth isn't configured.";
    return NextResponse.redirect(
      new URL(`/settings?zendesk_error=${encodeURIComponent(message)}`, request.url)
    );
  }

  const res = NextResponse.redirect(authorizeUrl);
  res.cookies.set(COOKIE_NAME, JSON.stringify({ nonce, subdomain }), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
