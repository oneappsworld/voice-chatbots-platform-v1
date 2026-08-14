import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { AdminTabs } from "@/components/admin-tabs";
import { getOrgContext } from "@/lib/org-context";
import { GA_MEASUREMENT_ID, PLAUSIBLE_DOMAIN, isGaConfigured, isPlausibleConfigured } from "@/lib/analytics";

export const metadata: Metadata = {
  title: "Admin Analytics — ChatSyn",
};

const TRACKED_EVENTS: { name: string; description: string }[] = [
  { name: "page_view", description: "Every page load and client-side route change, site-wide." },
  { name: "sign_up", description: "A new account is created — email/password or Google, tagged by method." },
  { name: "feature_usage", description: "A caller starts a conversation with a bot — tagged by bot type (faq, order_status, appointment_booking, lead_qualification)." },
  { name: "subscription_conversion", description: "A Stripe Checkout completes successfully — tagged by the plan purchased." },
];

export default async function AdminAnalyticsPage() {
  const org = await getOrgContext();
  if (!org) redirect("/login");
  if (!org.isAdmin) redirect("/dashboard");

  const gaOn = isGaConfigured();
  const plausibleOn = isPlausibleConfigured();

  return (
    <div className="dash-shell">
      <AppHeader active="admin" />

      <main className="dash-main">
        <div className="wrap">
          <div className="dash-topbar">
            <div>
              <span className="dash-eyebrow">Admin dashboard · {org.organizationName}</span>
              <h1 className="dash-title">Analytics</h1>
              <p className="dash-subtitle">
                Site-wide traffic, sign-ups, feature usage, and subscription conversions — tracked
                via Google Analytics 4 and Plausible, viewed in each tool&apos;s own dashboard.
              </p>
            </div>
          </div>

          <AdminTabs active="analytics" />

          <div className="settings-grid">
            <section className="panel">
              <div className="panel-title">Google Analytics 4</div>
              {gaOn ? (
                <>
                  <div className="crm-status crm-status-connected" style={{ marginBottom: 14 }}>
                    <span className="crm-status-dot" />
                    Connected — Measurement ID <strong>{GA_MEASUREMENT_ID}</strong>
                  </div>
                  <a href="https://analytics.google.com/analytics/web/" target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
                    Open GA4 dashboard ↗
                  </a>
                </>
              ) : (
                <p className="panel-subtitle">
                  Not connected yet. Set <code>NEXT_PUBLIC_GA_MEASUREMENT_ID</code> to your GA4
                  property&apos;s Measurement ID (starts with &ldquo;G-&rdquo;) and redeploy — no
                  code changes needed.
                </p>
              )}
            </section>

            <section className="panel">
              <div className="panel-title">Plausible</div>
              {plausibleOn ? (
                <>
                  <div className="crm-status crm-status-connected" style={{ marginBottom: 14 }}>
                    <span className="crm-status-dot" />
                    Connected — tracking as <strong>{PLAUSIBLE_DOMAIN}</strong>
                  </div>
                  <a href={`https://plausible.io/${PLAUSIBLE_DOMAIN}`} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
                    Open Plausible dashboard ↗
                  </a>
                </>
              ) : (
                <p className="panel-subtitle">
                  Not connected yet. Add chatsyn.io as a site at plausible.io, then set{" "}
                  <code>NEXT_PUBLIC_PLAUSIBLE_DOMAIN</code> to that domain and redeploy — no code
                  changes needed.
                </p>
              )}
            </section>
          </div>

          <section className="panel" style={{ marginTop: 24 }}>
            <div className="panel-title">Events tracked</div>
            <p className="panel-subtitle">Fired to whichever provider(s) above are connected — both get the same events.</p>
            <div className="crm-result">
              {TRACKED_EVENTS.map((event) => (
                <div key={event.name} className="crm-result-row">
                  <span><code>{event.name}</code></span>
                  <span>{event.description}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
