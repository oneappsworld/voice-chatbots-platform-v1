"use client";

import { useState } from "react";
import type { OutcomeSummary } from "@/lib/dashboard";

const OUTCOME_META: Record<
  OutcomeSummary["outcome"],
  { label: string; color: string; icon: React.ReactNode }
> = {
  resolved: {
    label: "Resolved by agent",
    color: "var(--status-good)",
    icon: (
      <svg viewBox="0 0 20 20" width="14" height="14" fill="none">
        <path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  escalated: {
    label: "Escalated to human",
    color: "var(--status-warning)",
    icon: (
      <svg viewBox="0 0 20 20" width="14" height="14" fill="none">
        <path d="M10 3l8.5 14.5H1.5L10 3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M10 8v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="10" cy="14.5" r="0.9" fill="currentColor" />
      </svg>
    ),
  },
  missed: {
    label: "Missed / no answer",
    color: "var(--status-critical)",
    icon: (
      <svg viewBox="0 0 20 20" width="14" height="14" fill="none">
        <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    ),
  },
};

export function OutcomeBreakdown({ outcomes }: { outcomes: OutcomeSummary[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const total = outcomes.reduce((sum, o) => sum + o.count, 0);

  return (
    <div>
      <div className="outcome-bar" role="img" aria-label="Call outcome breakdown">
        {outcomes.map((o) => {
          const width = total ? (o.count / total) * 100 : 0;
          if (width <= 0) return null;
          return (
            <div
              key={o.outcome}
              className="outcome-segment"
              style={{
                width: `${width}%`,
                background: OUTCOME_META[o.outcome].color,
                opacity: hovered && hovered !== o.outcome ? 0.55 : 1,
              }}
              onPointerEnter={() => setHovered(o.outcome)}
              onPointerLeave={() => setHovered(null)}
              tabIndex={0}
              onFocus={() => setHovered(o.outcome)}
              onBlur={() => setHovered(null)}
              title={`${OUTCOME_META[o.outcome].label}: ${o.count} calls (${o.pct}%)`}
            />
          );
        })}
      </div>
      <ul className="outcome-legend">
        {outcomes.map((o) => (
          <li
            key={o.outcome}
            className="outcome-legend-item"
            style={{ opacity: hovered && hovered !== o.outcome ? 0.55 : 1 }}
            onPointerEnter={() => setHovered(o.outcome)}
            onPointerLeave={() => setHovered(null)}
          >
            <span className="outcome-legend-icon" style={{ color: OUTCOME_META[o.outcome].color }}>
              {OUTCOME_META[o.outcome].icon}
            </span>
            <span className="outcome-legend-label">{OUTCOME_META[o.outcome].label}</span>
            <span className="outcome-legend-value">
              {o.count} <span className="outcome-legend-pct">({o.pct}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
