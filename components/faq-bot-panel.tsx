"use client";

import { useEffect, useState } from "react";
import { askFaqBot, escalateToHuman, getEscalationThreshold, startBotSession } from "@/app/bots/actions";
import { SpeechRecognizer } from "@/components/speech-recognizer";
import { HandoffCard } from "@/components/handoff-card";
import { SessionBlockedBanner } from "@/components/session-blocked-banner";
import { playBotResponse } from "@/lib/play-bot-response";
import { checkEscalation, handoffMessage, type EscalationReason } from "@/lib/escalation";
import { INTENT_LABELS } from "@/lib/nlu";
import type { Language } from "@/lib/nlu";
import type { VoiceStyle } from "@/lib/tts";
import { trackFeatureUsage } from "@/lib/analytics";

const EXAMPLES: Record<Language, string[]> = {
  "en-US": [
    "Hi, good morning",
    "Can I book an appointment?",
    "I was overcharged on my invoice",
    "I forgot my password",
    "This is broken and I'm frustrated",
    "What are your business hours?",
  ],
  "es-ES": [
    "Hola, buenos días",
    "Quiero reservar una cita",
    "Me cobraron de más",
    "Olvidé mi contraseña",
    "No funciona y estoy frustrado",
    "¿Cuáles son sus horarios?",
  ],
  "zh-CN": [
    "你好，早上好",
    "我可以预约吗？",
    "账单多收费了",
    "我忘记密码了",
    "这个坏了，我很生气",
    "你们的营业时间是几点？",
  ],
};

type Turn = { who: "user" | "bot"; text: string; intent?: string; confidence?: number };

export function FaqBotPanel({
  language: initialLanguage,
  style,
}: {
  language: Language;
  style: VoiceStyle;
}) {
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [inputText, setInputText] = useState("");
  const [asking, setAsking] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [voiceEngine, setVoiceEngine] = useState<"elevenlabs" | "browser" | null>(null);
  const [consecutiveUnknown, setConsecutiveUnknown] = useState(0);
  const [escalationThreshold, setEscalationThreshold] = useState(2);
  const [handoff, setHandoff] = useState<{ agentName: string; reason: EscalationReason; contextSummary: string } | null>(
    null
  );
  const [sessionBlocked, setSessionBlocked] = useState<"plan_gated" | "usage_cap" | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  useEffect(() => {
    getEscalationThreshold().then(setEscalationThreshold);
  }, []);

  async function ask(text: string) {
    if (!text.trim() || handoff || sessionBlocked) return;
    if (turns.length === 0) {
      const session = await startBotSession("faq");
      if (!session.ok) {
        setSessionBlocked(session.reason);
        return;
      }
      trackFeatureUsage("faq");
    }
    setAsking(true);
    const nextTurns = [...turns, { who: "user" as const, text }];
    setTurns(nextTurns);
    try {
      const escalation = checkEscalation(text, language, { consecutiveUnknown, threshold: escalationThreshold });
      if (escalation.trigger) {
        const res = await escalateToHuman({
          sourceBot: "FAQ Answering Bot",
          reason: escalation.reason,
          turns: nextTurns,
          language,
        });
        if (res.ok) {
          setHandoff({ agentName: res.agentName, reason: escalation.reason, contextSummary: res.contextSummary });
          const msg = handoffMessage(res.agentName, escalation.reason, language);
          setTurns((prev) => [...prev, { who: "bot", text: msg }]);
          const played = await playBotResponse(
            msg,
            { language, style, voices },
            { onStart: () => setSpeaking(true), onEnd: () => setSpeaking(false) }
          );
          setVoiceEngine(played.engine);
        }
        return;
      }

      const result = await askFaqBot(text, language);
      setConsecutiveUnknown(result.nlu.intent === "unknown" ? consecutiveUnknown + 1 : 0);
      setTurns((prev) => [
        ...prev,
        { who: "bot", text: result.answerText, intent: result.nlu.intent, confidence: result.nlu.confidence },
      ]);
      const played = await playBotResponse(
        result.answerText,
        { language, style, voices, cacheKey: `faq/${language}/${result.nlu.intent}` },
        { onStart: () => setSpeaking(true), onEnd: () => setSpeaking(false) }
      );
      setVoiceEngine(played.engine);
    } finally {
      setAsking(false);
    }
  }

  async function handleAskClick() {
    const text = inputText;
    setInputText("");
    await ask(text);
  }

  return (
    <div>
      <div className="form-group">
        <label className="form-label">Language</label>
        <div className="pill-group">
          <button type="button" className={`pill${language === "en-US" ? " active" : ""}`} onClick={() => setLanguage("en-US")}>
            English (US)
          </button>
          <button type="button" className={`pill${language === "es-ES" ? " active" : ""}`} onClick={() => setLanguage("es-ES")}>
            Spanish (Spain)
          </button>
          <button type="button" className={`pill${language === "zh-CN" ? " active" : ""}`} onClick={() => setLanguage("zh-CN")}>
            Chinese (Simplified)
          </button>
        </div>
      </div>

      {sessionBlocked && <SessionBlockedBanner reason={sessionBlocked} language={language} />}

      {!handoff && !sessionBlocked && (
        <>
          <div className="form-group">
            <label className="form-label">Ask by voice</label>
            <SpeechRecognizer language={language} onFinalTranscript={ask} />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="faq-text">
              Or type a question
            </label>
            <div className="crm-lookup-form">
              <input
                id="faq-text"
                type="text"
                className="form-input"
                placeholder="e.g. What are your business hours?"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAskClick();
                  }
                }}
              />
              <button type="button" className="btn btn-primary btn-sm" onClick={handleAskClick} disabled={asking}>
                {asking ? "Asking…" : "Ask"}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Or try an example</label>
            <div className="example-chips">
              {EXAMPLES[language].map((ex) => (
                <button type="button" key={ex} className="example-chip" onClick={() => ask(ex)} disabled={asking}>
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <div className="escalate-row">
            <button
              type="button"
              className="escalate-link"
              disabled={asking}
              onClick={() =>
                ask(
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
              {t.intent && (
                <span className="chat-turn-meta">
                  {(INTENT_LABELS as Record<string, string>)[t.intent] ?? t.intent} · {Math.round((t.confidence ?? 0) * 100)}% confidence
                </span>
              )}
            </div>
          ))}
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
