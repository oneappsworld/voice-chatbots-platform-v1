"use client";

import { useState } from "react";
import { upsertBotResponse, resetBotResponse, type BotResponseOverride } from "@/app/admin/actions";
import { ALL_INTENTS, INTENT_LABELS, type Intent, type Language } from "@/lib/nlu";

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "en-US", label: "English (US)" },
  { value: "es-ES", label: "Spanish (Spain)" },
];

function overrideKey(language: Language, intent: Intent) {
  return `${language}:${intent}`;
}

export function ContentModerationPanel({
  defaults,
  overrides,
}: {
  defaults: Record<Language, Record<Intent, string>>;
  overrides: BotResponseOverride[];
}) {
  const [language, setLanguage] = useState<Language>("en-US");
  const [overrideMap, setOverrideMap] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const o of overrides) map[overrideKey(o.language, o.intent as Intent)] = o.response_text;
    return map;
  });
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  function effectiveText(intent: Intent) {
    const key = overrideKey(language, intent);
    if (key in drafts) return drafts[key];
    return overrideMap[key] ?? defaults[language][intent];
  }

  function isCustomized(intent: Intent) {
    return overrideKey(language, intent) in overrideMap;
  }

  function handleChange(intent: Intent, value: string) {
    setDrafts((prev) => ({ ...prev, [overrideKey(language, intent)]: value }));
  }

  async function handleSave(intent: Intent) {
    const key = overrideKey(language, intent);
    setBusyKey(key);
    setErrorKey(null);
    try {
      const res = await upsertBotResponse(language, intent, effectiveText(intent));
      if (!res.ok) {
        setErrorKey(res.error);
        return;
      }
      setOverrideMap((prev) => ({ ...prev, [key]: effectiveText(intent) }));
      setSavedKey(key);
      setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 2000);
    } finally {
      setBusyKey(null);
    }
  }

  async function handleReset(intent: Intent) {
    const key = overrideKey(language, intent);
    setBusyKey(key);
    setErrorKey(null);
    try {
      const res = await resetBotResponse(language, intent);
      if (!res.ok) {
        setErrorKey(res.error);
        return;
      }
      setOverrideMap((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div>
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

      {errorKey && <p className="auth-error" style={{ marginBottom: 14 }}>{errorKey}</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {ALL_INTENTS.map((intent) => {
          const key = overrideKey(language, intent);
          const customized = isCustomized(intent);
          return (
            <div className="form-group" key={key} style={{ marginBottom: 0 }}>
              <label className="form-label">
                {INTENT_LABELS[intent]}
                {customized && (
                  <span className="intent-badge intent-badge-sm intent-domain" style={{ marginLeft: 8 }}>
                    Customized
                  </span>
                )}
              </label>
              <textarea
                className="form-input"
                rows={2}
                value={effectiveText(intent)}
                onChange={(e) => handleChange(intent, e.target.value)}
              />
              <div className="voice-actions" style={{ marginTop: 8 }}>
                {customized && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={busyKey === key}
                    onClick={() => handleReset(intent)}
                  >
                    Reset to default
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={busyKey === key}
                  onClick={() => handleSave(intent)}
                >
                  {busyKey === key ? "Saving…" : savedKey === key ? "Saved ✓" : "Save"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
