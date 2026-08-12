"use client";

import { useEffect, useState } from "react";
import { checkOrderStatus, listSampleOrderIds, escalateToHuman, getEscalationThreshold } from "@/app/bots/actions";
import { SpeechRecognizer } from "@/components/speech-recognizer";
import { HandoffCard } from "@/components/handoff-card";
import { playBotResponse } from "@/lib/play-bot-response";
import { checkEscalation, handoffMessage, type EscalationReason } from "@/lib/escalation";
import type { Language } from "@/lib/nlu";
import type { VoiceStyle } from "@/lib/tts";

type Turn = { who: "user" | "bot"; text: string; found?: boolean };

const STATUS_LABELS: Record<string, string> = {
  processing: "Processing",
  shipped: "Shipped",
  in_transit: "In progress",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_CLASS: Record<string, string> = {
  processing: "intent-generic",
  shipped: "intent-domain",
  in_transit: "intent-domain",
  delivered: "intent-conversational",
  cancelled: "intent-complaint",
};

export function OrderStatusBotPanel({
  language: initialLanguage,
  style,
}: {
  language: Language;
  style: VoiceStyle;
}) {
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [inputText, setInputText] = useState("");
  const [checking, setChecking] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [sampleIds, setSampleIds] = useState<string[]>([]);
  const [lastStatus, setLastStatus] = useState<string | null>(null);
  const [voiceEngine, setVoiceEngine] = useState<"elevenlabs" | "browser" | null>(null);
  const [consecutiveNotFound, setConsecutiveNotFound] = useState(0);
  const [escalationThreshold, setEscalationThreshold] = useState(2);
  const [handoff, setHandoff] = useState<{ agentName: string; reason: EscalationReason; contextSummary: string } | null>(
    null
  );

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  useEffect(() => {
    listSampleOrderIds().then(setSampleIds);
  }, []);

  useEffect(() => {
    getEscalationThreshold().then(setEscalationThreshold);
  }, []);

  async function check(text: string) {
    if (!text.trim() || handoff) return;
    setChecking(true);
    const nextTurns = [...turns, { who: "user" as const, text }];
    setTurns(nextTurns);
    try {
      const escalation = checkEscalation(text, language, { consecutiveUnknown: consecutiveNotFound, threshold: escalationThreshold });
      if (escalation.trigger) {
        const res = await escalateToHuman({
          sourceBot: "Order Status Check Bot",
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

      const result = await checkOrderStatus(text, language);
      setConsecutiveNotFound(result.found ? 0 : consecutiveNotFound + 1);
      setLastStatus(result.found && "order" in result && result.order ? result.order.status : null);
      setTurns((prev) => [...prev, { who: "bot", text: result.answerText, found: result.found }]);
      const played = await playBotResponse(
        result.answerText,
        { language, style, voices },
        { onStart: () => setSpeaking(true), onEnd: () => setSpeaking(false) }
      );
      setVoiceEngine(played.engine);
    } finally {
      setChecking(false);
    }
  }

  async function handleCheckClick() {
    const text = inputText;
    setInputText("");
    await check(text);
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
        </div>
      </div>

      {!handoff && (
        <>
          <div className="form-group">
            <label className="form-label">Ask by voice</label>
            <SpeechRecognizer language={language} onFinalTranscript={check} />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="order-text">
              Or type your order ID
            </label>
            <div className="crm-lookup-form">
              <input
                id="order-text"
                type="text"
                className="form-input"
                placeholder="e.g. Can you check on order ORD-10234?"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCheckClick();
                  }
                }}
              />
              <button type="button" className="btn btn-primary btn-sm" onClick={handleCheckClick} disabled={checking}>
                {checking ? "Checking…" : "Check status"}
              </button>
            </div>
          </div>

          {sampleIds.length > 0 && (
            <div className="form-group">
              <label className="form-label">Try one of your sample orders</label>
              <div className="example-chips">
                {sampleIds.map((id) => (
                  <button type="button" key={id} className="example-chip" onClick={() => check(`Can you check on order ${id}?`)} disabled={checking}>
                    {id}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="escalate-row">
            <button
              type="button"
              className="escalate-link"
              disabled={checking}
              onClick={() => check(language === "en-US" ? "I'd like to talk to a human, please." : "Quiero hablar con una persona, por favor.")}
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

      {lastStatus && (
        <div className="form-group">
          <span className={`intent-badge ${STATUS_CLASS[lastStatus] ?? "intent-generic"}`}>
            {STATUS_LABELS[lastStatus] ?? lastStatus}
          </span>
        </div>
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
