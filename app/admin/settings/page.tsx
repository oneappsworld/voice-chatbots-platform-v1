import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { AdminTabs } from "@/components/admin-tabs";
import { AdminSettingsPanel } from "@/components/admin-settings-panel";
import { getOrgContext, getOrgSettings } from "@/app/admin/actions";

export const metadata: Metadata = {
  title: "Admin Settings — Voice Chatbots Platform",
};

export default async function AdminSettingsPage() {
  const org = await getOrgContext();
  if (!org) redirect("/login");
  if (!org.isAdmin) redirect("/dashboard");

  const result = await getOrgSettings();

  return (
    <div className="dash-shell">
      <AppHeader active="admin" />

      <main className="dash-main">
        <div className="wrap">
          <div className="dash-topbar">
            <div>
              <span className="dash-eyebrow">Admin dashboard · {org.organizationName}</span>
              <h1 className="dash-title">Bot Settings</h1>
              <p className="dash-subtitle">
                Global configuration every bot in your organization respects — new teammates
                inherit these defaults, and escalation sensitivity applies to every live call.
              </p>
            </div>
          </div>

          <AdminTabs active="settings" />

          <section className="panel">
            <div className="panel-title">Global bot configuration</div>
            <div className="panel-subtitle">
              These apply organization-wide, not just to your own account.
            </div>
            {result.ok ? (
              <AdminSettingsPanel initial={result.settings} />
            ) : (
              <p className="auth-error">Couldn&apos;t load settings: {result.error}</p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
