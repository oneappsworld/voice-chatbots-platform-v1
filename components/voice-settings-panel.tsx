"use client";

import { useEffect, useRef, useState } from "react";
import { saveVoiceSettings } from "@/app/settings/actions";

type Language = "en-US" | "es-ES";
type Style = "warm" | "professional" | "energetic";

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "en-US", label: "English (US)" },
  { value: "es-ES", label: "Spanish (Spain)" },
];

const STYLES: { value: Style; label: string; description: string; pitch: number; rate: number }[] = [
  { value: "warm", label: "Warm & Friendly", description: "Slower, softer — good for support & healthcare.", pitch: 1.12, rate: 0.94 },
  { value: "professional", label: "Professional", description: "Even pace, neutral tone — good for sales & ops.", pitch: 1.0, rate: 1.0 },
  { value: "energetic", label: "Energetic", description: "Faster, brighter — good for retail & promos.", pitch: 1.18, rate: 1.14 },
];

type Initial = {
  personaName: string;
  greeting: string;
  language: Language;
  style: Style;
};

export function VoiceSettingsPanel({ initial }: { initial: Initial }) {
  const [personaName, setPersonaName] = useState(initial.personaName);
  const [greeting, setGreeting] = useState(initial.greeting);
  const [language, setLanguage] = useState<Language>(initial.language);
  const [style, setStyle] = useState<Style>(initial.style);

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSpeechSupported(false);
      return;
    }
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  const langPrefix = language.split("-")[0];
  const matchingVoice =
    voices.find((v) => v.lang === language) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix)) ??
    null;

  function handlePreview() {
    if (!speechSupported) return;
    window.speechSynthesis.cancel();

    const activeStyle = STYLES.find((s) => s.value === style)!;
    const utterance = new SpeechSynthesisUtterance(greeting || "Hi, how can I help you today?");
    utterance.lang = language;
    utterance.pitch = activeStyle.pitch;
    utterance.rate = activeStyle.rate;
    if (matchingVoice) utterance.voice = matchingVoice;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }

  function handleStop() {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await saveVoiceSettings({ personaName, greeting, language, style });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div>
      <div className="form-group">
        <label className="form-label" htmlFor="personaName">
          Persona name
        </label>
        <input
          id="personaName"
          type="text"
          className="form-input"
          value={personaName}
          onChange={(e) => setPersonaName(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="greeting">
          Greeting script
        </label>
        <textarea
          id="greeting"
          className="form-input"
          rows={3}
          value={greeting}
          onChange={(e) => setGreeting(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Language</label>
        <div className="pill-group">
          {LANGUAGES.map((l) => (
            <button
              type="button"
              key={l.value}
              className={`pill${language === l.value ? " active" : ""}`}
              onClick={() => setLanguage(l.value)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Voice style</label>
        <div className="style-grid">
          {STYLES.map((s) => (
            <button
              type="button"
              key={s.value}
              className={`style-card${style === s.value ? " active" : ""}`}
              onClick={() => setStyle(s.value)}
            >
              <span className="style-card-label">{s.label}</span>
              <span className="style-card-desc">{s.description}</span>
            </button>
          ))}
        </div>
      </div>

      {!speechSupported ? (
        <p className="auth-error">
          This browser doesn&apos;t support voice preview. Settings still save normally.
        </p>
      ) : (
        <p className="form-hint" style={{ marginBottom: 18 }}>
          Preview plays through your browser&apos;s text-to-speech
          {matchingVoice ? ` (using "${matchingVoice.name}")` : " (no matching system voice found — will use the browser default)"}.
        </p>
      )}

      <div className="voice-actions">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={speaking ? handleStop : handlePreview}
          disabled={!speechSupported}
        >
          {speaking ? "Stop" : "▶ Preview voice"}
        </button>
        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
