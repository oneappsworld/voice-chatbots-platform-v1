import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { VoiceTestConsole } from "@/components/voice-test-console";

export const metadata: Metadata = {
  title: "Voice Test Console — Voice Chatbots Platform",
};

export default async function VoiceTestPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: voiceSettings } = await supabase
    .from("voice_settings")
    .select("language")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="dash-shell">
      <AppHeader active="voice-test" />

      <main className="dash-main">
        <div className="wrap">
          <div className="dash-topbar">
            <div>
              <span className="dash-eyebrow">Speech-to-Text · NLU</span>
              <h1 className="dash-title">Voice Test Console</h1>
              <p className="dash-subtitle">
                This is the backbone every voice call runs through: speech-to-text
                turns audio into a transcript, then the NLU engine classifies intent
                and pulls out entities. Test it live below.
              </p>
            </div>
          </div>

          <div className="voice-test-layout">
            <section className="panel">
              <div className="panel-title">Try it</div>
              <div className="panel-subtitle">
                Speak into your microphone or type a sentence — both run through the
                same pipeline.
              </div>
              <VoiceTestConsole
                initialLanguage={(voiceSettings?.language as "en-US" | "es-ES") ?? "en-US"}
              />
            </section>

            <aside className="panel voice-test-about">
              <div className="panel-title">How this works</div>
              <ul className="about-list">
                <li>
                  <strong>Speech-to-Text</strong> uses your browser&apos;s built-in
                  recognizer, live, in English or Spanish.
                </li>
                <li>
                  <strong>Intent classification</strong> runs a rule-based NLU engine
                  server-side — greeting, goodbye, booking, order status, billing,
                  password reset, complaint, question, or general request.
                </li>
                <li>
                  <strong>Entity extraction</strong> pulls out emails, phone numbers,
                  and dates mentioned in the sentence.
                </li>
                <li>
                  This foundational engine is intentionally simple and fast — it&apos;s
                  built so a smarter model can be swapped in behind the same
                  interface later without changing how the rest of the platform
                  calls it.
                </li>
              </ul>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
