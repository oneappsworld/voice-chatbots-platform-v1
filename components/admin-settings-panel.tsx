"use client";

import { useState } from "react";
import { updateOrgSettings, type OrgSettings } from "@/app/admin/actions";
import { VOICE_STYLES } from "@/lib/tts";
import type { Language } from "@/lib/nlu";
import type { EscalationSensitivity } from "@/lib/escalation";

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "en-US", label: "English (US)" },
  { value: "es-ES", label: "Spanish (Spain)" },
  { value: "zh-CN", label: "Chinese (Simplified)" },
];

const SENSITIVITIES: { value: EscalationSensitivity; label: string; desc: string }[] = [
  { value: "low", label: "Low", desc: "Escalate after 3 failed turns in a row" },
  { value: "normal", label: "Normal", desc: "Escalate after 2 failed turns in a row" },
  { value: "high", label: "High", desc: "Escalate after 1 failed turn" },
];

export function AdminSettingsPanel({ initial }: { initial: OrgSettings }) {
  const [settings, setSettings] = useState<OrgSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    const res = await updateOrgSettings(settings);
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div>
      <div className="settings-grid">
        <div className="form-group">
          <label className="form-label" htmlFor="business-name">
            Business name
          </label>
          <input
            id="business-name"
            type="text"
            className="form-input"
            placeholder="Acme Inc."
            value={settings.business_name ?? ""}
            onChange={(e) => setSettings({ ...settings, business_name: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="support-email">
            Support email
          </label>
          <input
            id="support-email"
            type="email"
            className="form-input"
            placeholder="support@acme.com"
            value={settings.support_email ?? ""}
            onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Default language for new teammates</label>
        <div className="pill-group">
          {LANGUAGES.map((l) => (
            <button
              type="button"
              key={l.value}
              className={`pill${settings.default_language === l.value ? " active" : ""}`}
              onClick={() => setSettings({ ...settings, default_language: l.value })}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Default voice style for new teammates</label>
        <div className="style-grid">
          {VOICE_STYLES.map((s) => (
            <button
              type="button"
              key={s.value}
              className={`style-card${settings.default_voice_style === s.value ? " active" : ""}`}
              onClick={() => setSettings({ ...settings, default_voice_style: s.value })}
            >
              <span className="style-card-label">{s.label}</span>
              <span className="style-card-desc">{s.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Escalation sensitivity</label>
        <div className="style-grid">
          {SENSITIVITIES.map((s) => (
            <button
              type="button"
              key={s.value}
              className={`style-card${settings.escalation_sensitivity === s.value ? " active" : ""}`}
              onClick={() => setSettings({ ...settings, escalation_sensitivity: s.value })}
            >
              <span className="style-card-label">{s.label}</span>
              <span className="style-card-desc">{s.desc}</span>
            </button>
          ))}
        </div>
        <p className="form-hint">
          Applies to the FAQ and Order Status bots&apos; repeated-confusion trigger. Explicit
          &quot;talk to a human&quot; requests and strong complaints always escalate immediately,
          regardless of this setting.
        </p>
      </div>

      {error && <p className="auth-error" style={{ marginBottom: 14 }}>{error}</p>}

      <div className="voice-actions">
        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
