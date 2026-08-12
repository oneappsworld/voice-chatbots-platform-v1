// Server-only Zendesk OAuth client. Handles the authorization-code flow —
// Zendesk retired static API tokens for accounts created on/after 2026-07-28,
// so this is now the only supported way to connect a customer's Zendesk.
// Never import from a Client Component; it handles the client secret.

export class ZendeskOAuthError extends Error {}

const SCOPE = "read";

function cleanSubdomain(raw: string) {
  return raw.trim().replace(/^https?:\/\//, "").replace(/\.zendesk\.com.*$/, "");
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new ZendeskOAuthError(`Missing ${name} — set it in the environment.`);
  return value;
}

export type ZendeskTokenSet = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
};

/** Builds the URL to send the user to for Zendesk's OAuth consent screen. */
export function buildAuthorizeUrl(subdomain: string, redirectUri: string, state: string): string {
  const clientId = requireEnv("ZENDESK_OAUTH_CLIENT_ID");
  const url = new URL(`https://${cleanSubdomain(subdomain)}.zendesk.com/oauth/authorizations/new`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", SCOPE);
  url.searchParams.set("state", state);
  return url.toString();
}

async function parseTokenResponse(res: Response, fallback: string): Promise<ZendeskTokenSet> {
  if (!res.ok) {
    let message = fallback;
    try {
      const body = await res.json();
      message = body?.error_description || body?.error || fallback;
    } catch {
      // non-JSON error body, keep fallback
    }
    throw new ZendeskOAuthError(message);
  }

  const body = await res.json();
  const expiresAt = typeof body.expires_in === "number"
    ? new Date(Date.now() + body.expires_in * 1000).toISOString()
    : null;

  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token ?? null,
    expiresAt,
  };
}

/** Exchanges an authorization code (from the OAuth callback) for tokens. */
export async function exchangeCodeForToken(
  subdomain: string,
  code: string,
  redirectUri: string
): Promise<ZendeskTokenSet> {
  const clientId = requireEnv("ZENDESK_OAUTH_CLIENT_ID");
  const clientSecret = requireEnv("ZENDESK_OAUTH_CLIENT_SECRET");

  let res: Response;
  try {
    res = await fetch(`https://${cleanSubdomain(subdomain)}.zendesk.com/oauth/tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        scope: SCOPE,
      }),
      cache: "no-store",
    });
  } catch {
    throw new ZendeskOAuthError(`Couldn't reach ${subdomain}.zendesk.com to exchange the code.`);
  }

  return parseTokenResponse(res, `Token exchange failed (${res.status}).`);
}

/** Uses a refresh token to get a new access token once the old one expires. */
export async function refreshAccessToken(
  subdomain: string,
  refreshToken: string
): Promise<ZendeskTokenSet> {
  const clientId = requireEnv("ZENDESK_OAUTH_CLIENT_ID");
  const clientSecret = requireEnv("ZENDESK_OAUTH_CLIENT_SECRET");

  let res: Response;
  try {
    res = await fetch(`https://${cleanSubdomain(subdomain)}.zendesk.com/oauth/tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
      cache: "no-store",
    });
  } catch {
    throw new ZendeskOAuthError(`Couldn't reach ${subdomain}.zendesk.com to refresh the token.`);
  }

  return parseTokenResponse(res, `Token refresh failed (${res.status}).`);
}
