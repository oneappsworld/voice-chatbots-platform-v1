import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { CrmConnectionPanel } from "@/components/crm-connection-panel";
import { VoiceSettingsPanel } from "@/components/voice-settings-panel";

export const metadata: Metadata = {
  title: "Settings — Voice Chatbots Platform",
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: connection }, { data: voiceSettings }] = await Promise.all([
    supabase
      .from("crm_connections")
      .select("status, subdomain, agent_email, connected_agent_name, last_error")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("voice_settings")
      .select("persona_name, greeting, language, style")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  return (
    <div className="dash-shell">
      <AppHeader active="settings" />

      <main className="dash-main">
        <div className="wrap">
          <div className="dash-topbar">
            <div>
              <h1 className="dash-title">Settings</h1>
              <p className="dash-subtitle">
                Connect your CRM/helpdesk and shape how your voice agent sounds.
              </p>
            </div>
          </div>

          <div className="settings-grid">
            <section className="panel">
              <div className="panel-title">CRM / helpdesk integration</div>
              <div className="panel-subtitle">
                Connect Zendesk so your voice agent can pull customer details and ticket
                history mid-call.
              </div>
              <CrmConnectionPanel
                initial={{
                  status: (connection?.status as "connected" | "disconnected" | "error") ?? "disconnected",
                  subdomain: connection?.subdomain ?? null,
                  agentEmail: connection?.agent_email ?? null,
                  connectedAgentName: connection?.connected_agent_name ?? null,
                  lastError: connection?.last_error ?? null,
                }}
              />
            </section>

            <section className="panel">
              <div className="panel-title">Voice &amp; persona</div>
              <div className="panel-subtitle">
                Pick a language and voice style to match your brand, and preview it live.
              </div>
              <VoiceSettingsPanel
                initial={{
                  personaName: voiceSettings?.persona_name ?? "Ava",
                  greeting:
                    voiceSettings?.greeting ??
                    "Hi, thanks for calling — how can I help you today?",
                  language: (voiceSettings?.language as "en-US" | "es-ES") ?? "en-US",
                  style: (voiceSettings?.style as "warm" | "professional" | "energetic") ?? "professional",
                }}
              />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
