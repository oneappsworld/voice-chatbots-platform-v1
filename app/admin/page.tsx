import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { AdminTabs } from "@/components/admin-tabs";
import { TrendChart } from "@/components/trend-chart";
import { OutcomeBreakdown } from "@/components/outcome-breakdown";
import { TopicsList } from "@/components/topics-list";
import { getOrgContext, getOrgAnalytics } from "@/app/admin/actions";
import { formatDuration } from "@/lib/dashboard";

export const metadata: Metadata = {
  title: "Admin Overview — Voice Chatbots Platform",
};

const RANGE_OPTIONS = [7, 14, 30] as const;

const REASON_LABELS: Record<string, string> = {
  explicit_request: "Asked for a human",
  strong_complaint: "Strong complaint",
  repeated_confusion: "Repeated confusion",
};

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const org = await getOrgContext();
  if (!org) redirect("/login");
  if (!org.isAdmin) redirect("/dashboard");

  const params = await searchParams;
  const rangeDays = RANGE_OPTIONS.includes(Number(params.range) as (typeof RANGE_OPTIONS)[number])
    ? Number(params.range)
    : 30;

  const result = await getOrgAnalytics(rangeDays);

  return (
    <div className="dash-shell">
      <AppHeader active="admin" />

      <main className="dash-main">
        <div className="wrap">
          <div className="dash-topbar">
            <div>
              <span className="dash-eyebrow">Admin dashboard · {org.organizationName}</span>
              <h1 className="dash-title">Overview</h1>
              <p className="dash-subtitle">
                Aggregated activity across every bot and every active team member — not just
                your own account.
              </p>
            </div>
            <nav className="range-filter" aria-label="Date range">
              {RANGE_OPTIONS.map((days) => (
                <Link key={days} href={`/admin?range=${days}`} className={days === rangeDays ? "active" : ""}>
                  Last {days}d
                </Link>
              ))}
            </nav>
          </div>

          <AdminTabs active="overview" />

          {!result.ok ? (
            <div className="panel dash-empty">
              <p>Couldn&apos;t load analytics: {result.error}</p>
            </div>
          ) : (
            <>
              <div className="kpi-grid">
                <div className="kpi-card">
                  <div className="kpi-label">Team members</div>
                  <div className="kpi-value">{result.analytics.memberCount}</div>
                  <div className="kpi-delta">Active seats in your organization</div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-label">Total calls</div>
                  <div className="kpi-value">{result.analytics.call.totalCalls.toLocaleString()}</div>
                  <div className="kpi-delta">
                    Resolution rate {result.analytics.call.resolutionRate}%
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-label">Leads captured</div>
                  <div className="kpi-value">{result.analytics.leads.total}</div>
                  <div className="kpi-delta">
                    {result.analytics.leads.byQualification.qualified} qualified · avg score{" "}
                    {result.analytics.leads.avgScore}/11
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-label">Appointments booked</div>
                  <div className="kpi-value">{result.analytics.appointments.byStatus.booked}</div>
                  <div className="kpi-delta">{result.analytics.appointments.upcoming} upcoming</div>
                </div>
              </div>

              {result.analytics.call.totalCalls === 0 ? (
                <div className="panel dash-empty" style={{ marginBottom: 20 }}>
                  <p>No call activity in this range yet.</p>
                </div>
              ) : (
                <div className="dash-grid" style={{ marginBottom: 20 }}>
                  <div className="panel">
                    <div className="panel-title">Call volume</div>
                    <div className="panel-subtitle">All team members, last {rangeDays} days</div>
                    <TrendChart data={result.analytics.call.dailyVolume} />
                  </div>

                  <div className="panel-stack">
                    <div className="panel">
                      <div className="panel-title">Outcomes</div>
                      <div className="panel-subtitle">How calls in this range were resolved</div>
                      <OutcomeBreakdown outcomes={result.analytics.call.outcomes} />
                    </div>

                    <div className="panel">
                      <div className="panel-title">Common queries</div>
                      <div className="panel-subtitle">Most frequent topics this period</div>
                      <TopicsList topics={result.analytics.call.topTopics} />
                    </div>
                  </div>
                </div>
              )}

              <div className="settings-grid">
                <section className="panel">
                  <div className="panel-title">Lead qualification</div>
                  <div className="panel-subtitle">All-time, across the team</div>
                  <div className="result-row">
                    <span>Qualified</span>
                    <span>{result.analytics.leads.byQualification.qualified}</span>
                  </div>
                  <div className="result-row">
                    <span>Nurture</span>
                    <span>{result.analytics.leads.byQualification.nurture}</span>
                  </div>
                  <div className="result-row">
                    <span>Disqualified</span>
                    <span>{result.analytics.leads.byQualification.disqualified}</span>
                  </div>
                </section>

                <section className="panel">
                  <div className="panel-title">Human handoffs</div>
                  <div className="panel-subtitle">Why bots escalated, all-time</div>
                  {result.analytics.handoffs.total === 0 ? (
                    <p className="form-hint">No escalations yet.</p>
                  ) : (
                    <>
                      {Object.entries(result.analytics.handoffs.byReason).map(([reason, count]) => (
                        <div className="result-row" key={reason}>
                          <span>{REASON_LABELS[reason] ?? reason}</span>
                          <span>{count}</span>
                        </div>
                      ))}
                      <div className="chat-log" style={{ marginTop: 14 }}>
                        {result.analytics.handoffs.recent.map((h, i) => (
                          <div className="chat-turn chat-turn-bot" key={i}>
                            <span className="chat-turn-label">{h.source_bot}</span>
                            <p className="chat-turn-text">
                              {REASON_LABELS[h.reason] ?? h.reason} · agent {h.assigned_agent}
                            </p>
                            <span className="chat-turn-meta">{new Date(h.created_at).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </section>
              </div>

              <p className="form-hint" style={{ marginTop: 20 }}>
                Avg. call handle time: {formatDuration(result.analytics.call.avgDurationSeconds)}
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
