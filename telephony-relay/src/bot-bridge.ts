/**
 * Calls back into the main ChatSyn app's real NLU/bot logic instead of
 * duplicating it here — see the architecture decision in project memory:
 * telephony-relay has no DB access and duplicating lib/nlu.ts etc. would
 * fork logic that's already had regression bugs fixed once. This is a
 * thin bridge, not a second bot brain.
 */

const TELEPHONY_BRIDGE_URL = process.env.TELEPHONY_BRIDGE_URL;
const TELEPHONY_BRIDGE_SECRET = process.env.TELEPHONY_BRIDGE_SECRET;

export function isBotBridgeConfigured(): boolean {
  return Boolean(TELEPHONY_BRIDGE_URL && TELEPHONY_BRIDGE_SECRET);
}

export interface BotResponse {
  responseText: string;
  intent: string;
  confidence: number;
}

export async function getBotResponse(transcript: string, language?: string): Promise<BotResponse> {
  if (!TELEPHONY_BRIDGE_URL || !TELEPHONY_BRIDGE_SECRET) {
    throw new Error("Telephony bridge not configured — check isBotBridgeConfigured() first.");
  }

  const response = await fetch(TELEPHONY_BRIDGE_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-bridge-secret": TELEPHONY_BRIDGE_SECRET,
    },
    body: JSON.stringify({ transcript, language }),
  });

  if (!response.ok) {
    throw new Error(`Bot bridge request failed: ${response.status} ${await response.text()}`);
  }

  return (await response.json()) as BotResponse;
}
