import { describe, it, expect } from "vitest";
import { computeDashboardMetrics, formatDuration, formatDayLabel, type CallRow } from "./dashboard";

function callAt(daysAgo: number, outcome: CallRow["outcome"], durationSeconds = 120): CallRow {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return {
    occurred_at: d.toISOString(),
    department: "Support",
    topic: "Order status",
    outcome,
    duration_seconds: durationSeconds,
  };
}

describe("computeDashboardMetrics", () => {
  it("only counts calls inside the requested range", () => {
    const calls = [callAt(2, "resolved"), callAt(2, "resolved"), callAt(40, "resolved")];
    const metrics = computeDashboardMetrics(calls, 7);
    expect(metrics.totalCalls).toBe(2);
  });

  it("computes resolution rate as resolved / total, rounded to one decimal", () => {
    const calls = [callAt(1, "resolved"), callAt(1, "resolved"), callAt(1, "resolved"), callAt(1, "escalated")];
    const metrics = computeDashboardMetrics(calls, 7);
    expect(metrics.resolutionRate).toBe(75);
  });

  it("returns 0 resolution rate and no crash when there are no calls in range", () => {
    const metrics = computeDashboardMetrics([], 7);
    expect(metrics.totalCalls).toBe(0);
    expect(metrics.resolutionRate).toBe(0);
    expect(metrics.volumeChangePct).toBeNull();
  });

  it("computes average call duration across calls in range", () => {
    const calls = [callAt(1, "resolved", 100), callAt(1, "resolved", 200)];
    const metrics = computeDashboardMetrics(calls, 7);
    expect(metrics.avgDurationSeconds).toBe(150);
  });

  it("sorts topTopics by count descending", () => {
    const calls = [
      { ...callAt(1, "resolved"), topic: "Billing question" },
      { ...callAt(1, "resolved"), topic: "Order status" },
      { ...callAt(1, "resolved"), topic: "Order status" },
    ];
    const metrics = computeDashboardMetrics(calls, 7);
    expect(metrics.topTopics[0].topic).toBe("Order status");
    expect(metrics.topTopics[0].count).toBe(2);
  });
});

describe("formatDuration", () => {
  it("formats seconds as minutes and seconds, zero-padded", () => {
    expect(formatDuration(65)).toBe("1m 05s");
  });

  it("formats a duration under a minute", () => {
    expect(formatDuration(42)).toBe("0m 42s");
  });
});

describe("formatDayLabel", () => {
  it("pins to en-US formatting regardless of runtime default locale", () => {
    // Regression: this used to pass `undefined` as the locale, which reads
    // the runtime's default ICU locale. That's consistent on one machine,
    // but a Client Component rendering it can hydrate on a server with a
    // different default locale than the browser (e.g. "Jul 16" vs
    // "16 Jul"), which fails hydration. Pinning to "en-US" makes the output
    // deterministic across environments.
    expect(formatDayLabel("2026-07-16")).toBe("Jul 16");
  });
});
