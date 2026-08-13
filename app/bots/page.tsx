import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { FaqBotPanel } from "@/components/faq-bot-panel";
import { OrderStatusBotPanel } from "@/components/order-status-bot-panel";
import { LeadQualificationBotPanel } from "@/components/lead-qualification-bot-panel";
import { AppointmentBookingBotPanel } from "@/components/appointment-booking-bot-panel";
import type { Language } from "@/lib/nlu";
import type { VoiceStyle } from "@/lib/tts";

export const metadata: Metadata = {
  title: "Bots — ChatSyn",
};

export default async function BotsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: voiceSettings } = await supabase
    .from("voice_settings")
    .select("language, style")
    .eq("user_id", user.id)
    .maybeSingle();

  const language = (voiceSettings?.language as Language) ?? "en-US";
  const style = (voiceSettings?.style as VoiceStyle) ?? "professional";

  return (
    <div className="dash-shell">
      <AppHeader active="bots" />

      <main className="dash-main">
        <div className="wrap">
          <div className="dash-topbar">
            <div>
              <span className="dash-eyebrow">Live bot demos</span>
              <h1 className="dash-title">Bots</h1>
              <p className="dash-subtitle">
                Four working chatbot skills, built on the NLU engine and speaking with
                your configured voice &amp; persona from Settings. Any bot can hand a
                caller off to a live agent — with full conversation context — the
                moment it can&apos;t resolve something.
              </p>
            </div>
          </div>

          <div className="settings-grid">
            <section className="panel">
              <div className="panel-title">FAQ Answering Bot</div>
              <div className="panel-subtitle">
                Handles common questions — billing, appointments, password resets,
                complaints, and general questions.
              </div>
              <FaqBotPanel language={language} style={style} />
            </section>

            <section className="panel">
              <div className="panel-title">Order Status Check Bot</div>
              <div className="panel-subtitle">
                Ask about an order by ID and get a spoken status update.
              </div>
              <OrderStatusBotPanel language={language} style={style} />
            </section>

            <section className="panel">
              <div className="panel-title">Lead Qualification Bot</div>
              <div className="panel-subtitle">
                Interviews a prospect — company, team size, use case, budget, timeline —
                scores their fit, and routes qualified leads to sales.
              </div>
              <LeadQualificationBotPanel language={language} style={style} />
            </section>

            <section className="panel">
              <div className="panel-title">Appointment Booking Bot</div>
              <div className="panel-subtitle">
                Books a real appointment slot end-to-end by voice, checking live
                availability so two callers can&apos;t take the same time.
              </div>
              <AppointmentBookingBotPanel language={language} style={style} />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
