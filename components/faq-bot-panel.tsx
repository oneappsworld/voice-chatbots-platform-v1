"use client";

import { useEffect, useState } from "react";
import { askFaqBot } from "@/app/bots/actions";
import { SpeechRecognizer } from "@/components/speech-recognizer";
import { speakText } from "@/lib/tts";
import type { Language } from "@/lib/nlu";
import type { VoiceStyle } from "@/lib/tts";

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
};

const INTENT_LABELS: Record<string, string> = {
  greeting: "Greeting",
  goodbye: "Goodbye",
  booking_scheduling: "Booking / scheduling",
  order_status: "Order status",
  billing: "Billing",
  password_reset: "Password reset",
  complaint: "Complaint",
  question: "Question",
  request: "General request",
  unknown: "Unrecognized",
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

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  async function ask(text: string) {
    if (!text.trim()) return;
    setAsking(true);
    setTurns((prev) => [...prev, { who: "user", text }]);
    try {
      const result = await askFaqBot(text, language);
      setTurns((prev) => [
        ...prev,
        { who: "bot", text: result.answerText, intent: result.nlu.intent, confidence: result.nlu.confidence },
      ]);
      speakText(result.answerText, { language, style, voices }, {
        onStart: () => setSpeaking(true),
        onEnd: () => setSpeaking(false),
        onError: () => setSpeaking(false),
      });
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
        </div>
      </div>

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
            <button type="button" key={ex} className="example-chip" onClick={() => ask(ex)}>
              {ex}
            </button>
          ))}
        </div>
      </div>

      {speaking && (
        <p className="stt-listening-label" style={{ marginBottom: 14 }}>
          <span className="stt-dot" /> Speaking…
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
                  {INTENT_LABELS[t.intent] ?? t.intent} · {Math.round((t.confidence ?? 0) * 100)}% confidence
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
