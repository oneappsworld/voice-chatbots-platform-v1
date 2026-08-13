"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "Why not just build this on Google Dialogflow or Amazon Lex?",
    a: "You can — if you have a developer team and a few months to spend. Dialogflow and Lex are toolkits, not finished products: you're building the conversation flows, the NLU tuning, and the integrations yourself from scratch. ChatSyn starts where those tools finish — pre-trained templates for your specific industry and use case, configured through a no-code interface, live in days.",
  },
  {
    q: "We tried a voice bot before and it couldn't understand our customers. What's different here?",
    a: "That's usually a generic-model problem, not a voice AI problem. Our templates are trained on real call patterns and vocabulary for specific industries — healthcare intake, e-commerce order questions, real estate scheduling — instead of one generic assistant trying to handle everything. Every trial includes call transcripts and confidence scoring so you can see exactly how it's performing before you commit a dollar, and any call it's not confident on gets warm-transferred to a human instead of guessing.",
  },
  {
    q: "Will it actually work with our existing CRM, helpdesk, and phone system?",
    a: "Starter and Pro both include native integrations with the CRMs, helpdesks, and calendar tools most small and mid-sized teams already run — no middleware project required. For less common or homegrown systems, our onboarding specialists scope the connection during your trial, so you know exactly what's possible before you're asked to pay.",
  },
  {
    q: "Why would we choose you over an enterprise platform like LivePerson?",
    a: "Enterprise platforms are built and priced for organizations with dedicated implementation budgets and multi-month rollout timelines. We built ChatSyn specifically for the businesses that gap leaves behind: flat, transparent pricing, no six-figure contract, and a self-serve deployment that a business owner or ops manager can run without a vendor implementation team.",
  },
  {
    q: "What happens after the 14-day trial if it's not the right fit?",
    a: "You're not charged during the trial, and you can cancel anytime before it ends with no obligation. If you do continue, plans are month-to-month — no annual lock-in — so the ROI dashboard has to keep earning your business every month, not just in the first two weeks.",
  },
];

export function FaqAccordion() {
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
