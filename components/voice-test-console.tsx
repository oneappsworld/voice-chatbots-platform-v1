"use client";

import { useState } from "react";
import { classifyUtterance } from "@/app/voice-test/actions";
import { SpeechRecognizer } from "@/components/speech-recognizer";
import type { Language, NluResult } from "@/lib/nlu";

const EXAMPLES: Record<Language, string[]> = {
  "en-US": [
    "Hi, good morning",
    "Can I book an appointment for tomorrow?",
    "Where is my order? It hasn't shipped yet",
    "I was overcharged on my last invoice",
    "I forgot my password and I'm locked out",
    "This is broken and I'm really frustrated",
    "What are your business hours?",
    "Thanks, that's all, bye",
  ],
  "es-ES": [
    "Hola, buenos días",
    "Quiero reservar una cita para mañana",
    "¿Dónde está mi pedido?",
    "Me cobraron de más en mi factura",
    "Olvidé mi contraseña",
    "No funciona, estoy muy frustrado",
    "¿Cuáles son sus horarios?",
    "Gracias, eso es todo, adiós",
  ],
};

const INTENT_LABELS: Record<NluResult["intent"], string> = {
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

const INTENT_CLASS: Record<NluResult["intent"], string> = {
  greeting: "intent-conversational",
  goodbye: "intent-conversational",
  booking_scheduling: "intent-domain",
  order_status: "intent-domain",
  billing: "intent-domain",
  password_reset: "intent-domain",
  complaint: "intent-complaint",
  question: "intent-generic",
  request: "intent-generic",
  unknown: "intent-unknown",
};

export function VoiceTestConsole({ initialLanguage }: { initialLanguage: Language }) {
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [inputText, setInputText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<NluResult[]>([]);

  async function analyze(text: string) {
    if (!text.trim()) return;
    setAnalyzing(true);
    try {
      const result = await classifyUtterance(text, language);
      setResults((prev) => [result, ...prev].slice(0, 12));
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleAnalyzeClick() {
    await analyze(inputText);
    setInputText("");
  }

  async function handleExample(text: string) {
    setInputText(text);
    await analyze(text);
  }

  async function handleFinalTranscript(text: string) {
    setInputText(text);
    await analyze(text);
  }

  const latest = results[0];

  return (
    <div>
      <div className="form-group">
        <label className="form-label">Language</label>
        <div className="pill-group">
          <button
            type="button"
            className={`pill${language === "en-US" ? " active" : ""}`}
            onClick={() => setLanguage("en-US")}
          >
            English (US)
          </button>
          <button
            type="button"
            className={`pill${language === "es-ES" ? " active" : ""}`}
            onClick={() => setLanguage("es-ES")}
          >
            Spanish (Spain)
          </button>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Speak it</label>
        <SpeechRecognizer language={language} onFinalTranscript={handleFinalTranscript} />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="nlu-text">
          Or type it
        </label>
        <div className="crm-lookup-form">
          <input
            id="nlu-text"
            type="text"
            className="form-input"
            placeholder="e.g. Can I book an appointment for tomorrow?"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAnalyzeClick();
              }
            }}
          />
          <button type="button" className="btn btn-primary btn-sm" onClick={handleAnalyzeClick} disabled={analyzing}>
            {analyzing ? "Analyzing…" : "Analyze"}
          </button>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Or try an example</label>
        <div className="example-chips">
          {EXAMPLES[language].map((ex) => (
            <button type="button" key={ex} className="example-chip" onClick={() => handleExample(ex)}>
              {ex}
            </button>
          ))}
        </div>
      </div>

      {latest && (
        <div className="nlu-result">
          <div className="nlu-result-head">
            <span className={`intent-badge ${INTENT_CLASS[latest.intent]}`}>
              {INTENT_LABELS[latest.intent]}
            </span>
            <span className="nlu-confidence">{Math.round(latest.confidence * 100)}% confidence</span>
          </div>
          <div className="nlu-confidence-track">
            <div className="nlu-confidence-fill" style={{ width: `${latest.confidence * 100}%` }} />
          </div>
          <p className="nlu-transcript">&ldquo;{latest.text}&rdquo;</p>

          {latest.matchedKeywords.length > 0 && (
            <div className="nlu-chips-row">
              <span className="nlu-chips-label">Matched:</span>
              {latest.matchedKeywords.map((k) => (
                <span key={k} className="nlu-chip">
                  {k}
                </span>
              ))}
            </div>
          )}

          {(latest.entities.emails.length > 0 ||
            latest.entities.phones.length > 0 ||
            latest.entities.dates.length > 0) && (
            <div className="nlu-chips-row">
              <span className="nlu-chips-label">Entities:</span>
              {latest.entities.emails.map((e) => (
                <span key={e} className="nlu-chip nlu-chip-entity">
                  ✉ {e}
                </span>
              ))}
              {latest.entities.phones.map((p) => (
                <span key={p} className="nlu-chip nlu-chip-entity">
                  ☎ {p}
                </span>
              ))}
              {latest.entities.dates.map((d) => (
                <span key={d} className="nlu-chip nlu-chip-entity">
                  📅 {d}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {results.length > 1 && (
        <div className="nlu-history">
          <div className="panel-title" style={{ fontSize: "0.92rem", marginBottom: 12 }}>
            History
          </div>
          <ul>
            {results.slice(1).map((r, i) => (
              <li key={i} className="nlu-history-row">
                <span className={`intent-badge intent-badge-sm ${INTENT_CLASS[r.intent]}`}>
                  {INTENT_LABELS[r.intent]}
                </span>
                <span className="nlu-history-text">&ldquo;{r.text}&rdquo;</span>
                <span className="nlu-history-confidence">{Math.round(r.confidence * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
