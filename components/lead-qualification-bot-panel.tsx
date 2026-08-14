"use client";

import { useEffect, useState } from "react";
import {
  applyLeadAnswer,
  initialLeadState,
  leadPrompt,
  scoreLead,
  closingMessage,
  optionsForStep,
  type LeadState,
  type LeadQualification,
} from "@/lib/lead-qualification";
import { checkEscalation, handoffMessage, type EscalationReason } from "@/lib/escalation";
import { saveLead, escalateToHuman, startBotSession } from "@/app/bots/actions";
import { SpeechRecognizer } from "@/components/speech-recognizer";
import { HandoffCard } from "@/components/handoff-card";
import { SessionBlockedBanner } from "@/components/session-blocked-banner";
import { playBotResponse } from "@/lib/play-bot-response";
import type { Language } from "@/lib/nlu";
import type { VoiceStyle } from "@/lib/tts";

type Turn = { who: "user" | "bot"; text: string };

const QUALIFICATION_LABEL: Record<Language, Record<LeadQualification, string>> = {
  "en-US": { qualified: "Qualified — routed to sales", nurture: "Nurture", disqualified: "Not a fit right now" },
  "es-ES": { qualified: "Calificado — enviado a ventas", nurture: "Nutrir", disqualified: "No encaja por ahora" },
};

export function LeadQualificationBotPanel({
  language: initialLanguage,
  style,
}: {
  language: Language;
  style: VoiceStyle;
}) {
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [inputText, setInputText] = useState("");
  const [busy, setBusy] = useState(false);
  const [turns, setTurns] = useState<Turn[]>(() => [{ who: "bot", text: leadPrompt("name", initialLanguage) }]);
  const [leadState, setLeadState] = useState<LeadState>(initialLeadState());
  const [result, setResult] = useState<{ score: number; qualification: LeadQualification } | null>(null);
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
    setLeadState(initialLeadState());
    setResult(null);
    setHandoff(null);
    setSessionBlocked(null);
    const session = await startBotSession("lead_qualification");
    if (!session.ok) {
      setSessionBlocked(session.reason);
      return;
    }
    const greeting = leadPrompt("name", lang);
    setTurns([{ who: "bot", text: greeting }]);
    speak(greeting);
  }

  useEffect(() => {
    // Meters + gates the very first conversation on mount, same as the
    // language-switch path in start() below — setState happens after the
    // internal await, not synchronously, so this doesn't cascade-render.
    (async () => {
      const session = await startBotSession("lead_qualification");
      if (!session.ok) {
        setSessionBlocked(session.reason);
        return;
      }
      await speak(leadPrompt("name", initialLanguage));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(text: string) {
    if (!text.trim() || busy || handoff || leadState.step === "done") return;
    setBusy(true);
    const nextTurns: Turn[] = [...turns, { who: "user", text }];
    setTurns(nextTurns);

    try {
      const escalation = checkEscalation(text, language);
      if (escalation.trigger) {
        const res = await escalateToHuman({
          sourceBot: "Lead Qualification Bot",
          reason: escalation.reason,
          turns: nextTurns,
          language,
          collected: leadState.answers,
        });
        if (res.ok) {
          setHandoff({ agentName: res.agentName, reason: escalation.reason, contextSummary: res.contextSummary });
          const msg = handoffMessage(res.agentName, escalation.reason, language);
          setTurns((prev) => [...prev, { who: "bot", text: msg }]);
          await speak(msg);
        }
        return;
      }

      const applied = applyLeadAnswer(leadState, text, language);
      setLeadState(applied.state);

      if (applied.done) {
        const { score, qualification } = scoreLead(applied.state.answers);
        setResult({ score, qualification });
        const closing = closingMessage(qualification, language);
        setTurns((prev) => [...prev, { who: "bot", text: closing }]);
        await speak(closing);
        await saveLead({
          answers: applied.state.answers,
          score,
          qualification,
          transcript: [...nextTurns, { who: "bot", text: closing }],
        });
      } else if (applied.nextPrompt) {
        const prompt = applied.nextPrompt;
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

  const stepOptions = leadState.step !== "done" ? optionsForStep(leadState.step) : null;
  const finished = leadState.step === "done" || Boolean(handoff);

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
            <label className="form-label" htmlFor="lead-text">
              Or type your answer
            </label>
            <div className="crm-lookup-form">
              <input
                id="lead-text"
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

          {stepOptions && (
            <div className="form-group">
              <label className="form-label">Or pick one</label>
              <div className="example-chips">
                {stepOptions.map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    className="example-chip"
                    onClick={() => submit(opt.label[language])}
                    disabled={busy}
                  >
                    {opt.label[language]}
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
              onClick={() => submit(language === "en-US" ? "I'd like to talk to a human, please." : "Quiero hablar con una persona, por favor.")}
            >
              {language === "en-US" ? "Talk to a human instead" : "Hablar con una persona"}
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

      {result && (
        <div className="result-card">
          <div className="result-card-title">Lead qualification result</div>
          <span className={`result-badge result-badge-${result.qualification}`}>
            {QUALIFICATION_LABEL[language][result.qualification]}
          </span>
          <div className="result-row">
            <span>Fit score</span>
            <span>{result.score} / 11</span>
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
