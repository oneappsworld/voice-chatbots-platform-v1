import { Resend } from "resend";
import { buildSupportEmail, type SupportRequestInput } from "@/lib/support-request";

// Same "build ahead of credentials" pattern as this project's other
// integrations (Zendesk, ElevenLabs, Twilio, GA4/Plausible): everything
// here is a clean no-op until a real Resend API key exists.

const FROM_ADDRESS = "ChatSyn <onboarding@chatsyn.io>";
const SUPPORT_INBOX = "support@chatsyn.io";

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

/**
 * Sends a help-page contact form submission to the support inbox, with
 * reply-to set to the submitter so replying goes straight to them. Unlike
 * sendEmail() above (customer-facing, needs unsubscribe headers), this is
 * an internal notification — no List-Unsubscribe header applies.
 */
export async function sendSupportEmail(input: SupportRequestInput): Promise<SendEmailResult> {
  const resend = getClient();
  const email = buildSupportEmail(input);
  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: SUPPORT_INBOX,
    replyTo: input.fromEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, messageId: data!.id };
}
