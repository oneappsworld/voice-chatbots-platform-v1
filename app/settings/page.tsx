import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { CrmConnectionPanel } from "@/components/crm-connection-panel";
import { VoiceSettingsPanel } from "@/components/voice-settings-panel";
import { ElevenLabsPanel } from "@/components/elevenlabs-panel";

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

  const [{ data: connection }, { data: voiceSettings }, { data: elevenlabs }] = await Promise.all([
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
    supabase
      .from("elevenlabs_connections")
      .select("status, voice_id, voice_name, last_error")
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

          <section className="panel" style={{ marginTop: 20 }}>
            <div className="panel-title">Voice cloning (ElevenLabs)</div>
            <div className="panel-subtitle">
              Clone your own voice from a short sample for natural, expressive speech —
              replaces the browser&apos;s built-in voice for FAQ and Order Status bot
              responses once connected. Billed by ElevenLabs; FAQ answers are cached after
              the first generation to cut ongoing cost.
            </div>
            <ElevenLabsPanel
              initial={{
                status: (elevenlabs?.status as "connected" | "disconnected" | "error") ?? "disconnected",
                voiceId: elevenlabs?.voice_id ?? null,
                voiceName: elevenlabs?.voice_name ?? null,
                lastError: elevenlabs?.last_error ?? null,
              }}
            />
          </section>
        </div>
      </main>
    </div>
  );
}
