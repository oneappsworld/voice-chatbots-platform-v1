import { createHmac, timingSafeEqual } from "node:crypto";

// A one-click unsubscribe link has to work for an anonymous click straight
// out of an email client — no session, no auth. HMAC(userId) with a secret
// only this server knows lets the link prove "this really is a link we
// sent for this user" without a lookup table of one-time tokens. This is
// our own internal secret (like RELAY_SHARED_SECRET/TELEPHONY_BRIDGE_SECRET
// elsewhere in this project) — generated and set directly, not a
// third-party credential the user needs to provide.

export function isUnsubscribeConfigured(): boolean {
  return Boolean(process.env.ONBOARDING_UNSUBSCRIBE_SECRET);
}

export function generateUnsubscribeToken(userId: string): string {
  const secret = process.env.ONBOARDING_UNSUBSCRIBE_SECRET;
  if (!secret) {
    throw new Error("ONBOARDING_UNSUBSCRIBE_SECRET not configured — check isUnsubscribeConfigured() first.");
  }
  return createHmac("sha256", secret).update(userId).digest("hex");
}

export function verifyUnsubscribeToken(userId: string, token: string): boolean {
  const secret = process.env.ONBOARDING_UNSUBSCRIBE_SECRET;
  if (!secret || !token) return false;

  const expected = createHmac("sha256", secret).update(userId).digest();
  let provided: Buffer;
  try {
    provided = Buffer.from(token, "hex");
  } catch {
    return false;
  }
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}
