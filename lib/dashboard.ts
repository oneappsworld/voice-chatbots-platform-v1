export type Outcome = "resolved" | "escalated" | "missed";

export type CallRow = {
  occurred_at: string;
  department: string;
  topic: string;
  outcome: Outcome;
  duration_seconds: number;
};

export type DailyVolume = {
  date: string; // YYYY-MM-DD
  count: number;
};

export type TopicSummary = {
  topic: string;
  count: number;
  pct: number;
};

export type OutcomeSummary = {
  outcome: Outcome;
  count: number;
  pct: number;
};

export type DashboardMetrics = {
  totalCalls: number;
  resolutionRate: number; // 0-100
  avgDurationSeconds: number;
  outcomes: OutcomeSummary[];
  dailyVolume: DailyVolume[];
  topTopics: TopicSummary[];
  prevPeriodTotal: number;
  volumeChangePct: number | null;
};

function toDateKey(iso: string) {
  return iso.slice(0, 10);
}

export function computeDashboardMetrics(
  calls: CallRow[],
  rangeDays: number
): DashboardMetrics {
  const now = new Date();
  const rangeStart = new Date(now);
  rangeStart.setDate(rangeStart.getDate() - (rangeDays - 1));
  const rangeStartKey = toDateKey(rangeStart.toISOString());

  const inRange = calls.filter((c) => toDateKey(c.occurred_at) >= rangeStartKey);

  const prevStart = new Date(rangeStart);
  prevStart.setDate(prevStart.getDate() - rangeDays);
  const prevStartKey = toDateKey(prevStart.toISOString());
  const prevEndKey = rangeStartKey;
  const prevPeriod = calls.filter(
    (c) => toDateKey(c.occurred_at) >= prevStartKey && toDateKey(c.occurred_at) < prevEndKey
  );

  const totalCalls = inRange.length;

  const outcomeCounts: Record<Outcome, number> = {
    resolved: 0,
    escalated: 0,
    missed: 0,
  };
  let durationSum = 0;
  const topicCounts = new Map<string, number>();
  const dayCounts = new Map<string, number>();

  for (let i = 0; i < rangeDays; i++) {
    const d = new Date(rangeStart);
    d.setDate(d.getDate() + i);
    dayCounts.set(toDateKey(d.toISOString()), 0);
  }

  for (const call of inRange) {
    outcomeCounts[call.outcome] += 1;
    durationSum += call.duration_seconds;
    topicCounts.set(call.topic, (topicCounts.get(call.topic) ?? 0) + 1);
    const key = toDateKey(call.occurred_at);
    dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
  }

  const outcomes: OutcomeSummary[] = (["resolved", "escalated", "missed"] as Outcome[]).map(
    (outcome) => ({
      outcome,
      count: outcomeCounts[outcome],
      pct: totalCalls ? Math.round((outcomeCounts[outcome] / totalCalls) * 1000) / 10 : 0,
    })
  );

  const dailyVolume: DailyVolume[] = [...dayCounts.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, count]) => ({ date, count }));

  const topTopics: TopicSummary[] = [...topicCounts.entries()]
    .map(([topic, count]) => ({
      topic,
      count,
      pct: totalCalls ? Math.round((count / totalCalls) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const prevPeriodTotal = prevPeriod.length;
  const volumeChangePct =
    prevPeriodTotal > 0
      ? Math.round(((totalCalls - prevPeriodTotal) / prevPeriodTotal) * 1000) / 10
      : null;

  return {
    totalCalls,
    resolutionRate: totalCalls
      ? Math.round((outcomeCounts.resolved / totalCalls) * 1000) / 10
      : 0,
    avgDurationSeconds: totalCalls ? Math.round(durationSum / totalCalls) : 0,
    outcomes,
    dailyVolume,
    topTopics,
    prevPeriodTotal,
    volumeChangePct,
  };
}

export function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export function formatDayLabel(dateKey: string) {
  const d = new Date(`${dateKey}T00:00:00`);
  // Pinned to "en-US" rather than the runtime default locale: TrendChart
  // renders this in a Client Component, and the server's default ICU
  // locale doesn't always match the browser's ("Jul 16" vs "16 Jul"),
  // which fails hydration since the two renders produce different text.
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
