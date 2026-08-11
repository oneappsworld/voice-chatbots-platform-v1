"use client";

import { useEffect, useState } from "react";
import { checkOrderStatus, listSampleOrderIds } from "@/app/bots/actions";
import { SpeechRecognizer } from "@/components/speech-recognizer";
import { speakText } from "@/lib/tts";
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

  async function check(text: string) {
    if (!text.trim()) return;
    setChecking(true);
    setTurns((prev) => [...prev, { who: "user", text }]);
    try {
      const result = await checkOrderStatus(text, language);
      setLastStatus(result.found && "order" in result && result.order ? result.order.status : null);
      setTurns((prev) => [...prev, { who: "bot", text: result.answerText, found: result.found }]);
      speakText(result.answerText, { language, style, voices }, {
        onStart: () => setSpeaking(true),
        onEnd: () => setSpeaking(false),
        onError: () => setSpeaking(false),
      });
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
              <button type="button" key={id} className="example-chip" onClick={() => check(`Can you check on order ${id}?`)}>
                {id}
              </button>
            ))}
          </div>
        </div>
      )}

      {speaking && (
        <p className="stt-listening-label" style={{ marginBottom: 14 }}>
          <span className="stt-dot" /> Speaking…
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
    </div>
  );
}
