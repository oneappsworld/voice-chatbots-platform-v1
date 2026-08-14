import { Resend } from "resend";

// Same "build ahead of credentials" pattern as this project's other
// integrations (Zendesk, ElevenLabs, Twilio, GA4/Plausible): everything
// here is a clean no-op until a real Resend API key exists.

const FROM_ADDRESS = "ChatSyn <onboarding@chatsyn.io>";

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function getClient(): Resend {
  if (!isResendConfigured()) {
    throw new Error("Resend not configured — check isResendConfigured() first.");
  }
  return new Resend(process.env.RESEND_API_KEY);
}

export type SendEmailResult = { ok: true; messageId: string } | { ok: false; error: string };

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
  unsubscribeUrl: string;
}): Promise<SendEmailResult> {
  const resend = getClient();
  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
    headers: {
      "List-Unsubscribe": `<${params.unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, messageId: data!.id };
}
