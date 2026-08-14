import { NextResponse, type NextRequest } from "next/server";
import { answerFaq } from "@/lib/faq";
import type { Language } from "@/lib/nlu";

const SUPPORTED_LANGUAGES: Language[] = ["en-US", "es-ES", "zh-CN"];

/**
 * Called by telephony-relay (Railway), not Twilio directly — this is the
 * bridge that lets real phone calls run through the same NLU/bot logic the
 * browser bots already use, instead of forking that logic into the relay.
 * Authenticated by a shared secret (not Twilio's request-signature scheme,
 * since the caller here is our own service, not a third party) — separate
 * secret from RELAY_SHARED_SECRET so a leak of one doesn't compromise the
 * other trust boundary.
 *
 * Deliberately thin for now: real order lookups, escalation logging, and
 * multi-turn flows (lead qualification, appointment booking) aren't wired
 * in yet — those need real per-org resolution for an anonymous caller,
 * which doesn't exist. This proves the routing path with real canned
 * answers instead of speakBack's placeholder echo.
 */
export async function POST(request: NextRequest) {
  const bridgeSecret = process.env.TELEPHONY_BRIDGE_SECRET;
  if (!bridgeSecret) {
    return NextResponse.json({ error: "Telephony bridge not configured yet." }, { status: 503 });
  }

  if (request.headers.get("x-bridge-secret") !== bridgeSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const transcript = typeof body?.transcript === "string" ? body.transcript.trim() : "";
  if (!transcript) {
    return NextResponse.json({ error: "Missing transcript" }, { status: 400 });
  }

  const language: Language = SUPPORTED_LANGUAGES.includes(body?.language) ? body.language : "en-US";

  const { answerText, nlu } = answerFaq(transcript, language);

  return NextResponse.json({
    responseText: answerText,
    intent: nlu.intent,
    confidence: nlu.confidence,
  });
}
