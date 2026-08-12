import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { AdminTabs } from "@/components/admin-tabs";
import { ContentModerationPanel } from "@/components/content-moderation-panel";
import { getOrgContext, listBotResponseOverrides } from "@/app/admin/actions";
import { DEFAULT_ANSWERS } from "@/lib/faq";

export const metadata: Metadata = {
  title: "Admin Content — Voice Chatbots Platform",
};

export default async function AdminContentPage() {
  const org = await getOrgContext();
  if (!org) redirect("/login");
  if (!org.isAdmin) redirect("/dashboard");

  const result = await listBotResponseOverrides();

  return (
    <div className="dash-shell">
      <AppHeader active="admin" />

      <main className="dash-main">
        <div className="wrap">
          <div className="dash-topbar">
            <div>
              <span className="dash-eyebrow">Admin dashboard · {org.organizationName}</span>
              <h1 className="dash-title">Content</h1>
              <p className="dash-subtitle">
                Edit what the FAQ Answering Bot says for each intent, per language. Changes go
                live immediately for every teammate&apos;s calls — no redeploy needed.
              </p>
            </div>
          </div>

          <AdminTabs active="content" />

          <section className="panel">
            <div className="panel-title">FAQ responses</div>
            <div className="panel-subtitle">
              Leave a response as-is to keep the default. Editing and saving creates an
              organization-specific override; resetting removes it.
            </div>
            {result.ok ? (
              <ContentModerationPanel defaults={DEFAULT_ANSWERS} overrides={result.overrides} />
            ) : (
              <p className="auth-error">Couldn&apos;t load content: {result.error}</p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
