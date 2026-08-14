"use client";

import { useEffect, useRef, useState } from "react";
import { saveVoiceSettings } from "@/app/settings/actions";
import { VOICE_STYLES, pickVoice, speakText, type VoiceStyle } from "@/lib/tts";
import type { Language } from "@/lib/nlu";

type Style = VoiceStyle;

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "en-US", label: "English (US)" },
  { value: "es-ES", label: "Spanish (Spain)" },
  { value: "zh-CN", label: "Chinese (Simplified)" },
];

const STYLES = VOICE_STYLES;

type Initial = {
  personaName: string;
  greeting: string;
  language: Language;
  style: Style;
};

export function VoiceSettingsPanel({ initial }: { initial: Initial }) {
  const [personaName, setPersonaName] = useState(initial.personaName);
  const personaNameRef = useRef<HTMLInputElement>(null);
  const [greeting, setGreeting] = useState(initial.greeting);
  const [language, setLanguage] = useState<Language>(initial.language);
  const [style, setStyle] = useState<Style>(initial.style);

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  useEffect(() => {
    // Must run post-mount, not in a lazy useState initializer: the server
    // can't detect window.speechSynthesis, so an initializer would
    // mismatch the server-rendered "supported" HTML during hydration.
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSpeechSupported(false);
      return;
    }
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  const matchingVoice = pickVoice(voices, language);

  function handlePreview() {
    if (!speechSupported) return;
    speakText(greeting || "Hi, how can I help you today?", { language, style, voices }, {
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  }

  function handleStop() {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  async function handleSave() {
    if (!personaName.trim()) {
      personaNameRef.current?.reportValidity();
      return;
    }
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
          ref={personaNameRef}
          type="text"
          className="form-input"
          value={personaName}
          onChange={(e) => setPersonaName(e.target.value)}
          required
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
