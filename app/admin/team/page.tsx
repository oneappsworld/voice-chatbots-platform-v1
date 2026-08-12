import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { AdminTabs } from "@/components/admin-tabs";
import { TeamManagementPanel } from "@/components/team-management-panel";
import { listMembers } from "@/app/admin/actions";
import { getOrgContext } from "@/lib/org-context";

export const metadata: Metadata = {
  title: "Admin Team — Voice Chatbots Platform",
};

export default async function AdminTeamPage() {
  const org = await getOrgContext();
  if (!org) redirect("/login");
  if (!org.isAdmin) redirect("/dashboard");

  const result = await listMembers();

  return (
    <div className="dash-shell">
      <AppHeader active="admin" />

      <main className="dash-main">
        <div className="wrap">
          <div className="dash-topbar">
            <div>
              <span className="dash-eyebrow">Admin dashboard · {org.organizationName}</span>
              <h1 className="dash-title">Team</h1>
              <p className="dash-subtitle">
                Invite teammates, assign roles, and revoke access. Owners and admins can manage
                the team and reach this dashboard; agents and viewers get bot access only.
              </p>
            </div>
          </div>

          <AdminTabs active="team" />

          <section className="panel">
            <div className="panel-title">Team roster</div>
            <div className="panel-subtitle">
              An invited email joins automatically the moment they sign up with that address —
              no separate email is sent yet, so let them know to use it.
            </div>
            <TeamManagementPanel
              initialMembers={result.ok ? result.members : []}
              currentRole={org.role}
            />
          </section>
        </div>
      </main>
    </div>
  );
}
