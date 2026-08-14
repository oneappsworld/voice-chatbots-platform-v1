import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { BillingPanel } from "@/components/billing-panel";
import { getOrgContext } from "@/lib/org-context";
import { PLAN_LIMITS } from "@/lib/plan-limits";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Billing — ChatSyn",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const org = await getOrgContext();
  if (!org) redirect("/login");
  if (!org.isAdmin) redirect("/dashboard");

  const params = await searchParams;

  const supabase = await createClient();
  const periodStart = new Date();
  periodStart.setUTCDate(1);
  const periodStartStr = periodStart.toISOString().slice(0, 10);

  const { data: usage } = await supabase
    .from("usage_counters")
    .select("call_count")
    .eq("organization_id", org.organizationId)
    .eq("period_start", periodStartStr)
    .maybeSingle();

  // This page already reads cookies() (via getOrgContext/createClient) so it's
  // fully dynamic per-request — Date.now() here is real request time, not a
  // memoization hazard the purity rule is meant to catch.
  /* eslint-disable react-hooks/purity */
  const trialDaysLeft = org.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(org.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;
  /* eslint-enable react-hooks/purity */

  return (
    <div className="dash-shell">
      <AppHeader active="billing" />

      <main className="dash-main">
        <div className="wrap">
          <div className="dash-topbar">
            <div>
              <span className="dash-eyebrow">Plan &amp; billing</span>
              <h1 className="dash-title">Billing</h1>
              <p className="dash-subtitle">Manage your ChatSyn subscription and see this month&apos;s usage.</p>
            </div>
          </div>

          {params.checkout === "success" && (
            <p className="panel-subtitle" style={{ marginBottom: 20, color: "var(--text)" }}>
              Subscription updated successfully.
            </p>
          )}
          {params.checkout === "cancelled" && (
            <p className="panel-subtitle" style={{ marginBottom: 20 }}>
              Checkout was cancelled — no changes were made.
            </p>
          )}

          <section className="panel">
            <div className="panel-title">Subscription</div>
            <div className="panel-subtitle">Starter is $500/mo, Pro is $750/mo. Both include a 14-day free trial.</div>
            <BillingPanel
              plan={org.plan}
              subscriptionStatus={org.subscriptionStatus}
              trialDaysLeft={trialDaysLeft}
              hasStripeCustomer={Boolean(org.stripeCustomerId)}
              callCount={usage?.call_count ?? 0}
              maxCallsPerMonth={PLAN_LIMITS[org.plan].maxCallsPerMonth}
            />
          </section>
        </div>
      </main>
    </div>
  );
}
