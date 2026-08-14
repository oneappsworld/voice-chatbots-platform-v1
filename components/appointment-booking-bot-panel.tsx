"use client";

import { useEffect, useState } from "react";
import {
  applyApptAnswer,
  apptPrompt,
  confirmationMessage,
  initialApptState,
  SERVICES,
  type ApptState,
  type Slot,
} from "@/lib/appointment-booking";
import { checkEscalation, handoffMessage, type EscalationReason } from "@/lib/escalation";
import { getAvailableSlots, bookAppointment, escalateToHuman, startBotSession } from "@/app/bots/actions";
import { SpeechRecognizer } from "@/components/speech-recognizer";
import { HandoffCard } from "@/components/handoff-card";
import { SessionBlockedBanner } from "@/components/session-blocked-banner";
import { playBotResponse } from "@/lib/play-bot-response";
import type { Language } from "@/lib/nlu";
import type { VoiceStyle } from "@/lib/tts";

type Turn = { who: "user" | "bot"; text: string };

const RETRY_MESSAGE: Record<Language, string> = {
  "en-US": "Sorry, that time was just taken — here are fresh options.",
  "es-ES": "Lo siento, ese horario se acaba de ocupar — aquí tienes otras opciones.",
  "zh-CN": "抱歉，该时间刚刚被预约——这里是新的可选时间。",
};

export function AppointmentBookingBotPanel({
  language: initialLanguage,
  style,
}: {
  language: Language;
  style: VoiceStyle;
}) {
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [inputText, setInputText] = useState("");
  const [busy, setBusy] = useState(false);
  const [turns, setTurns] = useState<Turn[]>(() => [{ who: "bot", text: apptPrompt("service", initialLanguage) }]);
  const [apptState, setApptState] = useState<ApptState>(initialApptState());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [handoff, setHandoff] = useState<{ agentName: string; reason: EscalationReason; contextSummary: string } | null>(
    null
  );
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [voiceEngine, setVoiceEngine] = useState<"elevenlabs" | "browser" | null>(null);
  const [sessionBlocked, setSessionBlocked] = useState<"plan_gated" | "usage_cap" | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  async function speak(text: string) {
    const played = await playBotResponse(
      text,
      { language, style, voices },
      { onStart: () => setSpeaking(true), onEnd: () => setSpeaking(false) }
    );
    setVoiceEngine(played.engine);
  }

  async function start(lang: Language) {
    setLanguage(lang);
    setApptState(initialApptState());
    setSlots([]);
    setConfirmed(false);
    setHandoff(null);
    setSessionBlocked(null);
    const session = await startBotSession("appointment_booking");
    if (!session.ok) {
      setSessionBlocked(session.reason);
      return;
    }
    const greeting = apptPrompt("service", lang);
    setTurns([{ who: "bot", text: greeting }]);
    speak(greeting);
  }

  useEffect(() => {
    // Meters + gates the very first conversation on mount, same as the
    // language-switch path in start() below — setState happens after the
    // internal await, not synchronously, so this doesn't cascade-render.
    (async () => {
      const session = await startBotSession("appointment_booking");
      if (!session.ok) {
        setSessionBlocked(session.reason);
        return;
      }
      await speak(apptPrompt("service", initialLanguage));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(text: string) {
    if (!text.trim() || busy || handoff || apptState.step === "done") return;
    setBusy(true);
    const nextTurns: Turn[] = [...turns, { who: "user", text }];
    setTurns(nextTurns);

    try {
      const escalation = checkEscalation(text, language);
      if (escalation.trigger) {
        const res = await escalateToHuman({
          sourceBot: "Appointment Booking Bot",
          reason: escalation.reason,
          turns: nextTurns,
          language,
          collected: {
            service: apptState.service?.label[language],
            slot: apptState.slot?.label,
            name: apptState.customerName ?? undefined,
          },
        });
        if (res.ok) {
          setHandoff({ agentName: res.agentName, reason: escalation.reason, contextSummary: res.contextSummary });
          const msg = handoffMessage(res.agentName, escalation.reason, language);
          setTurns((prev) => [...prev, { who: "bot", text: msg }]);
          await speak(msg);
        }
        return;
      }

      const applied = applyApptAnswer(apptState, text, language, { slots });
      if (!applied.ok) {
        setTurns((prev) => [...prev, { who: "bot", text: applied.error }]);
        await speak(applied.error);
        return;
      }
      setApptState(applied.state);

      if (applied.done) {
        const service = applied.state.service!;
        const slot = applied.state.slot!;
        const bookRes = await bookAppointment({
          service,
          slot,
          customerName: applied.state.customerName!,
          contact: applied.state.contact!,
        });

        if (bookRes.ok) {
          const confirmation = confirmationMessage(applied.state, language);
          setTurns((prev) => [...prev, { who: "bot", text: confirmation }]);
          setConfirmed(true);
          await speak(confirmation);
        } else {
          const retryMsg = RETRY_MESSAGE[language];
          setTurns((prev) => [...prev, { who: "bot", text: retryMsg }]);
          const fresh = await getAvailableSlots(language);
          setSlots(fresh);
          setApptState({ ...applied.state, step: "slot", slot: null });
          await speak(retryMsg);
        }
      } else if (applied.nextPrompt) {
        const prompt = applied.nextPrompt;
        if (applied.state.step === "slot") {
          const fresh = await getAvailableSlots(language);
          setSlots(fresh);
        }
        setTurns((prev) => [...prev, { who: "bot", text: prompt }]);
        await speak(prompt);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleSendClick() {
    const text = inputText;
    setInputText("");
    await submit(text);
  }

  const finished = apptState.step === "done" || confirmed || Boolean(handoff);
  const showServiceChips = apptState.step === "service";
  const showSlotChips = apptState.step === "slot" && slots.length > 0;

  return (
    <div>
      <div className="form-group">
        <label className="form-label">Language</label>
        <div className="pill-group">
          <button type="button" className={`pill${language === "en-US" ? " active" : ""}`} onClick={() => start("en-US")}>
            English (US)
          </button>
          <button type="button" className={`pill${language === "es-ES" ? " active" : ""}`} onClick={() => start("es-ES")}>
            Spanish (Spain)
          </button>
          <button type="button" className={`pill${language === "zh-CN" ? " active" : ""}`} onClick={() => start("zh-CN")}>
            Chinese (Simplified)
          </button>
        </div>
      </div>

      {sessionBlocked && <SessionBlockedBanner reason={sessionBlocked} language={language} />}

      {!finished && !sessionBlocked && (
        <>
          <div className="form-group">
            <label className="form-label">Answer by voice</label>
            <SpeechRecognizer language={language} onFinalTranscript={submit} />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="appt-text">
              Or type your answer
            </label>
            <div className="crm-lookup-form">
              <input
                id="appt-text"
                type="text"
                className="form-input"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSendClick();
                  }
                }}
              />
              <button type="button" className="btn btn-primary btn-sm" onClick={handleSendClick} disabled={busy}>
                {busy ? "…" : "Send"}
              </button>
            </div>
          </div>

          {showServiceChips && (
            <div className="form-group">
              <label className="form-label">Or pick a service</label>
              <div className="example-chips">
                {SERVICES.map((s) => (
                  <button type="button" key={s.value} className="example-chip" onClick={() => submit(s.label[language])} disabled={busy}>
                    {s.label[language]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showSlotChips && (
            <div className="form-group">
              <label className="form-label">Or pick a time</label>
              <div className="example-chips">
                {slots.map((slot) => (
                  <button type="button" key={slot.iso} className="example-chip" onClick={() => submit(slot.label)} disabled={busy}>
                    {slot.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="escalate-row">
            <button
              type="button"
              className="escalate-link"
              disabled={busy}
              onClick={() =>
                submit(
                  language === "en-US"
                    ? "I'd like to talk to a human, please."
                    : language === "es-ES"
                      ? "Quiero hablar con una persona, por favor."
                      : "我想转人工，谢谢。"
                )
              }
            >
              {language === "en-US" ? "Talk to a human instead" : language === "es-ES" ? "Hablar con una persona" : "转接人工客服"}
            </button>
          </div>
        </>
      )}

      {speaking && (
        <p className="stt-listening-label" style={{ marginBottom: 14 }}>
          <span className="stt-dot" /> Speaking{voiceEngine === "elevenlabs" ? " (cloned voice)" : voiceEngine === "browser" ? " (browser voice)" : ""}…
        </p>
      )}

      {turns.length > 0 && (
        <div className="chat-log">
          {turns.map((t, i) => (
            <div key={i} className={`chat-turn chat-turn-${t.who}`}>
              <span className="chat-turn-label">{t.who === "user" ? "You" : "Bot"}</span>
              <p className="chat-turn-text">{t.text}</p>
            </div>
          ))}
        </div>
      )}

      {confirmed && apptState.service && apptState.slot && (
        <div className="result-card">
          <div className="result-card-title">Booking confirmed</div>
          <div className="result-row">
            <span>Service</span>
            <span>{apptState.service.label[language]}</span>
          </div>
          <div className="result-row">
            <span>Time</span>
            <span>{apptState.slot.label}</span>
          </div>
          <div className="result-row">
            <span>Contact</span>
            <span>{apptState.contact}</span>
          </div>
        </div>
      )}

      {handoff && (
        <HandoffCard
          agentName={handoff.agentName}
          reason={handoff.reason}
          contextSummary={handoff.contextSummary}
          language={language}
        />
      )}
    </div>
  );
}
