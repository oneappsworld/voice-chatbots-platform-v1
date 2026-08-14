export type SequenceStep = 1 | 2 | 3 | 4 | 5;

export type OnboardingContext = {
  firstName: string;
  appUrl: string;
  unsubscribeUrl: string;
  /** Only meaningful for step 5 — still on the 14-day trial vs already converted to a paid subscription. */
  isTrialing: boolean;
};

export type EmailContent = { subject: string; html: string; text: string };

const BRAND_GRADIENT = "linear-gradient(120deg,#7c5cff 0%,#5a7dff 50%,#37e6c4 100%)";

function wrapHtml(greeting: string, bodyHtml: string, ctaText: string, ctaUrl: string, unsubscribeUrl: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:${BRAND_GRADIENT};padding:24px 32px;">
                <span style="color:#0b0c14;font-weight:800;font-size:18px;">ChatSyn</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:#1a1a2e;font-size:15px;line-height:1.6;">
                <p style="margin:0 0 16px;">${greeting}</p>
                ${bodyHtml}
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                  <tr>
                    <td style="background:${BRAND_GRADIENT};border-radius:8px;">
                      <a href="${ctaUrl}" style="display:inline-block;padding:12px 24px;color:#0b0c14;font-weight:700;text-decoration:none;font-size:14px;">${ctaText}</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background:#f9f9fb;border-top:1px solid #eee;color:#8a8a9e;font-size:12px;line-height:1.5;">
                ChatSyn · Easy-to-deploy voice AI for sales, support &amp; ops.<br />
                <a href="${unsubscribeUrl}" style="color:#8a8a9e;">Unsubscribe from onboarding emails</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function textFooter(unsubscribeUrl: string): string {
  return `\n\n—\nChatSyn · Easy-to-deploy voice AI for sales, support & ops.\nUnsubscribe from onboarding emails: ${unsubscribeUrl}`;
}

export function buildOnboardingEmail(step: SequenceStep, ctx: OnboardingContext): EmailContent {
  const { firstName, appUrl, unsubscribeUrl, isTrialing } = ctx;
  const name = firstName || "there";

  switch (step) {
    case 1:
      return {
        subject: "Welcome to ChatSyn — here's how to get your first bot live",
        html: wrapHtml(
          `Hi ${name}, welcome to ChatSyn! 🎉`,
          `<p style="margin:0 0 16px;">You're 14 days into a free trial of a voice agent that answers calls, qualifies leads, and books appointments — no developers needed.</p>
           <p style="margin:0 0 8px;font-weight:700;">Quick start (5 minutes):</p>
           <ol style="margin:0 0 16px;padding-left:20px;">
             <li style="margin-bottom:6px;">Open <strong>Bots</strong> and try the FAQ Answering Bot with your own question.</li>
             <li style="margin-bottom:6px;">Go to <strong>Settings</strong> and set your agent's name, greeting, and voice.</li>
             <li>Check your <strong>Dashboard</strong> to see call volume and outcomes as they come in.</li>
           </ol>`,
          "Open your dashboard",
          `${appUrl}/dashboard`,
          unsubscribeUrl
        ),
        text: `Hi ${name}, welcome to ChatSyn!

You're 14 days into a free trial of a voice agent that answers calls, qualifies leads, and books appointments — no developers needed.

Quick start (5 minutes):
1. Open Bots and try the FAQ Answering Bot with your own question.
2. Go to Settings and set your agent's name, greeting, and voice.
3. Check your Dashboard to see call volume and outcomes as they come in.

Open your dashboard: ${appUrl}/dashboard${textFooter(unsubscribeUrl)}`,
      };

    case 2:
      return {
        subject: "The one feature most new teams miss first",
        html: wrapHtml(
          `Hi ${name},`,
          `<p style="margin:0 0 16px;">The single most valuable thing your agent does is <strong>answer questions instantly, 24/7</strong> — the FAQ Answering Bot.</p>
           <p style="margin:0 0 16px;">It handles billing questions, appointment requests, password resets, and complaints out of the box, and hands off to a real person the moment it can't help — with the full conversation already summarized for whoever picks up.</p>
           <p style="margin:0 0 16px;">Try it now: ask it something a real customer would ask, and watch the confidence score and intent it detects.</p>`,
          "Try the FAQ bot",
          `${appUrl}/bots`,
          unsubscribeUrl
        ),
        text: `Hi ${name},

The single most valuable thing your agent does is answer questions instantly, 24/7 — the FAQ Answering Bot.

It handles billing questions, appointment requests, password resets, and complaints out of the box, and hands off to a real person the moment it can't help — with the full conversation already summarized for whoever picks up.

Try it now: ask it something a real customer would ask, and watch the confidence score and intent it detects.

Try the FAQ bot: ${appUrl}/bots${textFooter(unsubscribeUrl)}`,
      };

    case 3:
      return {
        subject: "A ChatSyn tip most people don't discover on their own",
        html: wrapHtml(
          `Hi ${name},`,
          `<p style="margin:0 0 16px;">Here's something worth trying: your agent isn't stuck speaking English in a single tone.</p>
           <p style="margin:0 0 16px;">In <strong>Settings</strong>, you can switch your agent's language to Spanish or Chinese, and pick a voice style — Warm &amp; Friendly, Professional, or Energetic — to match your brand. Every bot picks up the change immediately, live preview included.</p>
           <p style="margin:0 0 16px;">If you serve bilingual customers or just want a different first impression, this is a two-minute change with an outsized effect on how calls feel.</p>`,
          "Customize your agent's voice",
          `${appUrl}/settings`,
          unsubscribeUrl
        ),
        text: `Hi ${name},

Here's something worth trying: your agent isn't stuck speaking English in a single tone.

In Settings, you can switch your agent's language to Spanish or Chinese, and pick a voice style — Warm & Friendly, Professional, or Energetic — to match your brand. Every bot picks up the change immediately, live preview included.

If you serve bilingual customers or just want a different first impression, this is a two-minute change with an outsized effect on how calls feel.

Customize your agent's voice: ${appUrl}/settings${textFooter(unsubscribeUrl)}`,
      };

    case 4:
      return {
        subject: "How's it going so far?",
        html: wrapHtml(
          `Hi ${name},`,
          `<p style="margin:0 0 16px;">You're a week into your trial — we'd genuinely like to know how it's going.</p>
           <p style="margin:0 0 16px;">Hit a rough edge? Not sure how to set something up? Just reply to this email — a real person reads every reply, not a bot.</p>
           <p style="margin:0 0 16px;">If everything's smooth, we'd still love a couple of sentences on what's working and what isn't.</p>`,
          "Reply and tell us how it's going",
          "mailto:support@chatsyn.io",
          unsubscribeUrl
        ),
        text: `Hi ${name},

You're a week into your trial — we'd genuinely like to know how it's going.

Hit a rough edge? Not sure how to set something up? Just reply to this email — a real person reads every reply, not a bot.

If everything's smooth, we'd still love a couple of sentences on what's working and what isn't.

Reply any time: support@chatsyn.io${textFooter(unsubscribeUrl)}`,
      };

    case 5:
      if (isTrialing) {
        return {
          subject: "Your trial wraps up today",
          html: wrapHtml(
            `Hi ${name},`,
            `<p style="margin:0 0 16px;">Your 14-day free trial ends today. Nothing breaks automatically — but to keep your agent live and taking calls without interruption, add billing now.</p>
             <p style="margin:0 0 16px;">Starter is $500/mo (FAQ, Order Status, and Appointment Booking bots). Pro is $750/mo and adds the Lead Qualification bot for teams doing active sales outreach.</p>`,
            "Choose your plan",
            `${appUrl}/billing`,
            unsubscribeUrl
          ),
          text: `Hi ${name},

Your 14-day free trial ends today. Nothing breaks automatically — but to keep your agent live and taking calls without interruption, add billing now.

Starter is $500/mo (FAQ, Order Status, and Appointment Booking bots). Pro is $750/mo and adds the Lead Qualification bot for teams doing active sales outreach.

Choose your plan: ${appUrl}/billing${textFooter(unsubscribeUrl)}`,
        };
      }
      return {
        subject: "Two weeks in — here's what to look at next",
        html: wrapHtml(
          `Hi ${name},`,
          `<p style="margin:0 0 16px;">You're two weeks in and already on a paid plan — thank you for trusting ChatSyn with real calls.</p>
           <p style="margin:0 0 16px;">Worth a look now that the basics are set: your <strong>Admin dashboard</strong> for team-wide call analytics, and inviting teammates so they can manage bots too.</p>`,
          "Open Admin dashboard",
          `${appUrl}/admin`,
          unsubscribeUrl
        ),
        text: `Hi ${name},

You're two weeks in and already on a paid plan — thank you for trusting ChatSyn with real calls.

Worth a look now that the basics are set: your Admin dashboard for team-wide call analytics, and inviting teammates so they can manage bots too.

Open Admin dashboard: ${appUrl}/admin${textFooter(unsubscribeUrl)}`,
      };
  }
}
