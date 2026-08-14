import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { TrendChart } from "@/components/trend-chart";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { stripe } from "@/lib/stripe";
import { calculateMrrCents, calculateChurnRate, buildCumulativeGrowth } from "@/lib/launch-metrics";
import { getOrgContext } from "@/lib/org-context";

export const metadata: Metadata = {
  title: "Launch Dashboard — ChatSyn",
};

// Command-center page for the launch window: no caching, every load hits
// Supabase + Stripe fresh. Subscriber counts, MRR, and churn come straight
// from stripe.subscriptions.list, not from the organizations.plan/
// subscription_status columns the rest of the app mirrors via webhook — so
// this page can't drift out of sync if a webhook was ever missed.
export const dynamic = "force-dynamic";

const GROWTH_WINDOW_DAYS = 30;

export default async function LaunchDashboardPage() {
  const org = await getOrgContext();
  if (!org) redirect("/login");
  if (!org.isAdmin) redirect("/dashboard");

  // This page reports platform-wide numbers across every customer
  // organization, not just the signed-in user's own org — restricted to
  // the ChatSyn founder specifically. Deny by default: with no
  // FOUNDER_EMAIL configured, every org admin (including real paying
  // customers who are admins of their own org) gets redirected, same as a
  // non-admin, rather than accidentally exposing platform revenue.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const founderEmail = process.env.FOUNDER_EMAIL?.toLowerCase();
  if (!founderEmail || user?.email?.toLowerCase() !== founderEmail) {
    redirect("/admin");
  }

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setUTCHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
  const thirtyDaysAgoStart = new Date(now);
  thirtyDaysAgoStart.setUTCDate(thirtyDaysAgoStart.getUTCDate() - (GROWTH_WINDOW_DAYS - 1));
  thirtyDaysAgoStart.setUTCHours(0, 0, 0, 0);

  // Service-role client: intentional here, and only reachable past the
  // founder-email gate above — profiles' own RLS ("Users can view their own
  // profile") only ever returns one row for a normal client, by design.
  const service = createServiceClient();

  const [{ count: totalUsers }, { count: signupsToday }, { count: signupsThisWeek }, { data: allProfiles }] =
    await Promise.all([
      service.from("profiles").select("id", { count: "exact", head: true }),
      service.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", startOfToday.toISOString()),
      service.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo.toISOString()),
      service.from("profiles").select("created_at").order("created_at", { ascending: true }),
    ]);

  const subscriptions = await stripe.subscriptions
    .list({ status: "all", limit: 100 })
    .autoPagingToArray({ limit: 1000 });

  const activeSubs = subscriptions.filter((s) => s.status === "active");
  const canceledInWindow = subscriptions.filter(
    (s) => s.status === "canceled" && s.canceled_at && s.canceled_at * 1000 >= thirtyDaysAgoStart.getTime()
  );

  const mrrCents = calculateMrrCents(activeSubs);
  const churnRate = calculateChurnRate(activeSubs.length, canceledInWindow.length);

  const growth = buildCumulativeGrowth(
    (allProfiles ?? []).map((p) => new Date(p.created_at as string)),
    GROWTH_WINDOW_DAYS,
    now
  );

  return (
    <div className="dash-shell">
      <AppHeader active="admin" />

      <main className="dash-main">
        <div className="wrap">
          <div className="dash-topbar">
            <div>
              <span className="dash-eyebrow">Founder only</span>
              <h1 className="dash-title">Launch dashboard</h1>
              <p className="dash-subtitle">
                Your command center for the first 30 days. Subscriber counts, MRR, and churn
                are pulled live from Stripe on every load — not from mirrored database
                columns — so this can&apos;t drift out of sync. No caching; reload any time
                for the current number.
              </p>
            </div>
          </div>

          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-label">Total users</div>
              <div className="kpi-value">{(totalUsers ?? 0).toLocaleString()}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Sign-ups today</div>
              <div className="kpi-value">{(signupsToday ?? 0).toLocaleString()}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Sign-ups this week</div>
              <div className="kpi-value">{(signupsThisWeek ?? 0).toLocaleString()}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Active subscribers</div>
              <div className="kpi-value">{activeSubs.length.toLocaleString()}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">MRR</div>
              <div className="kpi-value">
                ${(mrrCents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Churn rate (30d)</div>
              <div className={`kpi-value ${churnRate > 5 ? "critical" : "good"}`}>{churnRate.toFixed(1)}%</div>
            </div>
          </div>

          <section className="panel" style={{ marginTop: 20 }}>
            <div className="panel-title">Total users, last {GROWTH_WINDOW_DAYS} days</div>
            <div className="panel-subtitle">Cumulative sign-ups across every organization on ChatSyn.</div>
            <TrendChart data={growth} unitLabel="users" ariaLabel="Total users growth trend" />
          </section>
        </div>
      </main>
    </div>
  );
}
