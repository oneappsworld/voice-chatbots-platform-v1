import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { TrendChart } from "@/components/trend-chart";
import { OutcomeBreakdown } from "@/components/outcome-breakdown";
import { TopicsList } from "@/components/topics-list";
import { computeDashboardMetrics, formatDuration, type CallRow } from "@/lib/dashboard";

export const metadata: Metadata = {
  title: "Dashboard — ChatSyn",
};

const RANGE_OPTIONS = [7, 14, 30] as const;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const params = await searchParams;
  const rangeDays = RANGE_OPTIONS.includes(Number(params.range) as (typeof RANGE_OPTIONS)[number])
    ? Number(params.range)
    : 30;

  // computeDashboardMetrics needs the requested range plus an equal prior
  // period for the vs-prior-period comparison — never all-time history.
  const rangeCutoff = new Date();
  rangeCutoff.setDate(rangeCutoff.getDate() - rangeDays * 2);

  const { data: calls } = await supabase
    .from("calls")
    .select("occurred_at, department, topic, outcome, duration_seconds")
    .eq("user_id", user.id)
    .gte("occurred_at", rangeCutoff.toISOString())
    .order("occurred_at", { ascending: true });

  const metrics = computeDashboardMetrics((calls ?? []) as CallRow[], rangeDays);
  const firstName = profile?.full_name?.split(" ")[0];

  return (
    <div className="dash-shell">
      <AppHeader active="dashboard" />

      <main className="dash-main">
        <div className="wrap">
          <div className="dash-topbar">
            <div>
              <span className="dash-eyebrow">Sample data · demo workspace</span>
              <h1 className="dash-title">
                {firstName ? `Welcome back, ${firstName}.` : "Welcome back."}
              </h1>
              <p className="dash-subtitle">
                Here&apos;s how your voice agent has been performing across sales,
                support, and internal lines.
              </p>
            </div>
            <nav className="range-filter" aria-label="Date range">
              {RANGE_OPTIONS.map((days) => (
                <Link
                  key={days}
                  href={`/dashboard?range=${days}`}
                  className={days === rangeDays ? "active" : ""}
                >
                  Last {days}d
                </Link>
              ))}
            </nav>
          </div>

          {metrics.totalCalls === 0 ? (
            <div className="panel dash-empty">
              <p>No call activity in this range yet.</p>
            </div>
          ) : (
            <>
              <div className="kpi-grid">
                <div className="kpi-card">
                  <div className="kpi-label">Total calls</div>
                  <div className="kpi-value">{metrics.totalCalls.toLocaleString()}</div>
                  <div className="kpi-delta">
                    {metrics.volumeChangePct === null ? (
                      <span>vs prior period: —</span>
                    ) : (
                      <>
                        <svg viewBox="0 0 20 20" fill="none">
                          {metrics.volumeChangePct >= 0 ? (
                            <path d="M10 15V5M5 10l5-5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          ) : (
                            <path d="M10 5v10M5 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          )}
                        </svg>
                        {Math.abs(metrics.volumeChangePct)}% vs prior {rangeDays}d
                      </>
                    )}
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-label">Resolution rate</div>
                  <div
                    className={`kpi-value ${
                      metrics.resolutionRate >= 75
                        ? "good"
                        : metrics.resolutionRate >= 60
                          ? "warning"
                          : "critical"
                    }`}
                  >
                    {metrics.resolutionRate}%
                  </div>
                  <div className="kpi-delta">Resolved by the agent, no handoff needed</div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-label">Avg. handle time</div>
                  <div className="kpi-value">{formatDuration(metrics.avgDurationSeconds)}</div>
                  <div className="kpi-delta">Per call, start to resolution</div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-label">Missed calls</div>
                  <div
                    className={`kpi-value ${
                      metrics.outcomes.find((o) => o.outcome === "missed")!.pct <= 10
                        ? "good"
                        : "critical"
                    }`}
                  >
                    {metrics.outcomes.find((o) => o.outcome === "missed")!.count}
                  </div>
                  <div className="kpi-delta">
                    {metrics.outcomes.find((o) => o.outcome === "missed")!.pct}% of total volume
                  </div>
                </div>
              </div>

              <div className="dash-grid">
                <div className="panel">
                  <div className="panel-title">Call volume</div>
                  <div className="panel-subtitle">Calls handled per day, last {rangeDays} days</div>
                  <TrendChart data={metrics.dailyVolume} />
                </div>

                <div className="panel-stack">
                  <div className="panel">
                    <div className="panel-title">Outcomes</div>
                    <div className="panel-subtitle">How calls in this range were resolved</div>
                    <OutcomeBreakdown outcomes={metrics.outcomes} />
                  </div>

                  <div className="panel">
                    <div className="panel-title">Common queries</div>
                    <div className="panel-subtitle">Most frequent topics this period</div>
                    <TopicsList topics={metrics.topTopics} />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
