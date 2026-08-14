export type SupportRequestInput = {
  name: string;
  fromEmail: string;
  subject: string;
  message: string;
};

export type EmailContent = { subject: string; html: string; text: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Server-side validation for the help-page contact form. Name/email come
 * from the signed-in user's own profile (never trusted client input), but
 * subject/message are free text typed by the user, so both still need a
 * basic sanity check before an email gets sent on their behalf.
 */
export function validateSupportRequest(input: SupportRequestInput): string | null {
  if (!input.fromEmail || !EMAIL_RE.test(input.fromEmail)) return "Missing a valid account email.";
  if (!input.subject.trim()) return "Please add a subject.";
  if (input.subject.length > 200) return "Subject is too long.";
  if (!input.message.trim()) return "Please describe what you need help with.";
  if (input.message.length > 5000) return "Message is too long.";
  return null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Pure formatter, kept separate from lib/resend.ts's network call so it's cheap to unit test. */
export function buildSupportEmail(input: SupportRequestInput): EmailContent {
  const from = input.name ? `${input.name} <${input.fromEmail}>` : input.fromEmail;

  return {
    subject: `[Support] ${input.subject}`,
    text: `From: ${from}\n\n${input.message}`,
    html: `<p><strong>From:</strong> ${escapeHtml(from)}</p><p>${escapeHtml(input.message).replace(/\n/g, "<br/>")}</p>`,
  };
}
