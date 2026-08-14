import { NextResponse, type NextRequest } from "next/server";
import twilio from "twilio";

/**
 * Phase A of the real telephony build: proves a real inbound call can reach
 * this app and get a spoken response, before any STT/TTS/language-detection
 * complexity is layered on. Twilio's number webhook points straight here.
 *
 * Signature validation is the only thing stopping someone from POSTing a
 * forged "incoming call" directly at this URL to manipulate call records —
 * this is a real security boundary, not a formality. The signature is
 * computed by Twilio over the exact URL it dialed (the webhook URL
 * configured on the phone number) plus the POST params, so the URL used
 * here must match that configured URL byte-for-byte. We reconstruct it
 * from a fixed production origin rather than trusting `request.url`
 * directly, since Vercel's edge network can rewrite protocol/host before
 * the request reaches this function, which would silently break validation
 * (or worse, make it pass against a URL Twilio never actually dialed).
 */
const PUBLIC_ORIGIN = "https://chatsyn.io";

export async function POST(request: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    return NextResponse.json({ error: "Twilio not configured yet." }, { status: 503 });
  }

  const signature = request.headers.get("x-twilio-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 403 });
  }

  const formData = await request.formData();
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    params[key] = value.toString();
  });

  const url = `${PUBLIC_ORIGIN}${request.nextUrl.pathname}`;
  const valid = twilio.validateRequest(authToken, signature, url, params);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const twiml = new twilio.twiml.VoiceResponse();
  twiml.say(
    { voice: "Polly.Joanna" },
    "Thanks for calling Chat Syn. The phone line is connected. Real-time voice assistant coming soon."
  );

  return new NextResponse(twiml.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}
