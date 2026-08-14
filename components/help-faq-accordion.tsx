"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "What do the four bots actually do?",
    a: "FAQ answers common questions from your knowledge base, Order Status looks up an order by ID, Appointment Booking finds and reserves an open slot, and Lead Qualification scores an inbound caller against your criteria. Try any of them live from the Bots page.",
  },
  {
    q: "How does the 14-day free trial work?",
    a: "You're not charged during the 14 days, and you can cancel anytime before it ends with no obligation. If you continue, billing is month-to-month — manage or cancel anytime from the Billing page.",
  },
  {
    q: "What's the difference between Starter and Pro?",
    a: "Starter includes the FAQ, Order Status, and Appointment Booking bots. Pro adds Lead Qualification and a higher monthly call limit. See the Billing page for your current usage and limits.",
  },
  {
    q: "How do I change or cancel my plan?",
    a: "Go to Billing and use \"Manage subscription\" to open the billing portal — you can upgrade, downgrade, or cancel from there. Changes take effect on your next billing cycle.",
  },
  {
    q: "I forgot my password — how do I get back in?",
    a: "Use \"Forgot password?\" on the login page to get a reset link by email. If it doesn't arrive within a few minutes, check spam before contacting support.",
  },
  {
    q: "How do I connect my CRM or helpdesk?",
    a: "Go to Settings → CRM / helpdesk integration and connect Zendesk. Once connected, your voice agent can pull customer details and ticket history mid-call.",
  },
  {
    q: "Can I use a custom voice for my agent?",
    a: "Yes — Settings → Voice cloning lets you clone your own voice from a short sample. Once connected, it replaces the default browser voice for FAQ and Order Status responses.",
  },
  {
    q: "Is my data secure?",
    a: "Your account and organization's data is isolated from every other customer's at the database level, and payments are processed by Stripe — we never see or store your card details.",
  },
];

export function HelpFaqAccordion() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="faq-list">
      {FAQS.map((item, i) => (
        <div key={item.q} className={`faq-item${openIndex === i ? " open" : ""}`}>
          <button
            type="button"
            className="faq-q"
            onClick={() => setOpenIndex(openIndex === i ? -1 : i)}
          >
            {item.q}
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
          <div className="faq-a">{item.a}</div>
        </div>
      ))}
    </div>
  );
}
