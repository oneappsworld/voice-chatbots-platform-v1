"use client";

import { useState } from "react";
import { createCheckoutSession, createPortalSession } from "@/app/billing/actions";
import type { Plan } from "@/lib/plan-limits";
import type { SubscriptionStatus } from "@/lib/org-context";

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  trialing: "Free trial",
  active: "Active",
  past_due: "Payment failed",
  canceled: "Canceled",
};

const STATUS_CLASS: Record<SubscriptionStatus, string> = {
  trialing: "intent-domain",
  active: "intent-conversational",
  past_due: "intent-complaint",
  canceled: "intent-generic",
};

export function BillingPanel({
  plan,
  subscriptionStatus,
  trialDaysLeft,
  hasStripeCustomer,
  callCount,
  maxCallsPerMonth,
}: {
  plan: Plan;
  subscriptionStatus: SubscriptionStatus;
  trialDaysLeft: number | null;
  hasStripeCustomer: boolean;
  callCount: number;
  maxCallsPerMonth: number;
}) {
  const [loading, setLoading] = useState<"starter" | "pro" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function goToCheckout(target: Plan) {
    setError(null);
    setLoading(target);
    const res = await createCheckoutSession(target);
    if ("error" in res) {
      setError(res.error);
      setLoading(null);
      return;
    }
    window.location.href = res.url;
  }

  async function goToPortal() {
    setError(null);
    setLoading("portal");
    const res = await createPortalSession();
    if ("error" in res) {
      setError(res.error);
      setLoading(null);
      return;
    }
    window.location.href = res.url;
  }

  const usagePct = Math.min(100, Math.round((callCount / maxCallsPerMonth) * 100));

  return (
    <div>
      <div className="form-group">
        <span className={`intent-badge ${STATUS_CLASS[subscriptionStatus]}`}>{STATUS_LABEL[subscriptionStatus]}</span>
        {subscriptionStatus === "trialing" && trialDaysLeft !== null && (
          <p className="panel-subtitle" style={{ marginTop: 8 }}>
            {trialDaysLeft > 0 ? `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left in your trial.` : "Your trial ends today."}
          </p>
        )}
      </div>

      <div className="result-card" style={{ marginBottom: 20 }}>
        <div className="result-card-title">Current plan: {plan === "pro" ? "Pro" : "Starter"}</div>
        <div className="result-row">
          <span>Calls this month</span>
          <span>
            {callCount} / {maxCallsPerMonth}
          </span>
        </div>
        <div className="usage-bar">
          <div className="usage-bar-fill" style={{ width: `${usagePct}%` }} />
        </div>
      </div>

      {error && <p className="auth-error">{error}</p>}

      <div className="form-group" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {plan === "starter" && (
          <button type="button" className="btn btn-primary" onClick={() => goToCheckout("pro")} disabled={loading !== null}>
            {loading === "pro" ? "Redirecting…" : "Upgrade to Pro"}
          </button>
        )}
        {plan === "pro" && (
          <button type="button" className="btn btn-ghost" onClick={() => goToCheckout("starter")} disabled={loading !== null}>
            {loading === "starter" ? "Redirecting…" : "Switch to Starter"}
          </button>
        )}
        {hasStripeCustomer && (
          <button type="button" className="btn btn-ghost" onClick={goToPortal} disabled={loading !== null}>
            {loading === "portal" ? "Opening…" : "Manage billing"}
          </button>
        )}
      </div>
    </div>
  );
}
