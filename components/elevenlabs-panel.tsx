"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  connectElevenLabs,
  disconnectElevenLabs,
  cloneVoiceFromSample,
  previewElevenLabsVoice,
} from "@/app/settings/actions";

type ConnectionState = {
  status: "disconnected" | "connected" | "error";
  voiceId: string | null;
  voiceName: string | null;
  lastError: string | null;
};

export function ElevenLabsPanel({ initial }: { initial: ConnectionState }) {
  const [state, setState] = useState(initial);
  const [apiKey, setApiKey] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const [voiceName, setVoiceName] = useState("My Cloned Voice");
  const [cloning, setCloning] = useState(false);
  const [cloneError, setCloneError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewText, setPreviewText] = useState(
    "Hi, thanks for calling — how can I help you today?"
  );
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  async function handleConnect(e: FormEvent) {
    e.preventDefault();
    setConnecting(true);
    setConnectError(null);
    const res = await connectElevenLabs(apiKey);
    setConnecting(false);
    if (res.ok) {
      setState({ status: "connected", voiceId: null, voiceName: null, lastError: null });
      setApiKey("");
    } else {
      setConnectError(res.error);
      setState((s) => ({ ...s, status: "error", lastError: res.error }));
    }
  }

  async function handleDisconnect() {
    await disconnectElevenLabs();
    setState({ status: "disconnected", voiceId: null, voiceName: null, lastError: null });
  }

  async function handleClone(e: FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setCloneError("Choose an audio sample first.");
      return;
    }
    setCloning(true);
    setCloneError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("voiceName", voiceName);

    const res = await cloneVoiceFromSample(formData);
    setCloning(false);

    if (res.ok) {
      setState((s) => ({ ...s, voiceId: res.voiceId, voiceName: res.voiceName }));
    } else {
      setCloneError(res.error);
    }
  }

  async function handlePreview() {
    setPreviewing(true);
    setPreviewError(null);
    const res = await previewElevenLabsVoice(previewText);
    setPreviewing(false);
    if (res.ok) {
      if (audioRef.current) {
        audioRef.current.src = res.audioDataUri;
        audioRef.current.play();
      }
    } else {
      setPreviewError(res.error);
    }
  }

  if (state.status === "connected" || state.status === "error") {
    return (
      <div>
        {state.status === "connected" ? (
          <div className="crm-status crm-status-connected">
            <span className="crm-status-dot" />
            ElevenLabs API key connected
            <button type="button" className="crm-disconnect" onClick={handleDisconnect}>
              Disconnect
            </button>
          </div>
        ) : (
          <p className="auth-error">Last attempt failed: {state.lastError}</p>
        )}

        {state.voiceId ? (
          <div className="crm-result" style={{ marginBottom: 20 }}>
            <div className="crm-result-name">🎙 {state.voiceName}</div>
            <p className="panel-subtitle" style={{ marginBottom: 14 }}>
              Cloned voice ready. Preview it below, or upload a new sample to replace it.
            </p>
            <div className="crm-lookup-form">
              <input
                type="text"
                className="form-input"
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
              />
              <button type="button" className="btn btn-primary btn-sm" onClick={handlePreview} disabled={previewing}>
                {previewing ? "Generating…" : "▶ Preview"}
              </button>
            </div>
            {previewError && <p className="auth-error" style={{ marginTop: 12 }}>{previewError}</p>}
            <audio ref={audioRef} style={{ display: "none" }} />
          </div>
        ) : null}

        <form onSubmit={handleClone}>
          <div className="form-group">
            <label className="form-label" htmlFor="voiceName">
              Voice name
            </label>
            <input
              id="voiceName"
              type="text"
              className="form-input"
              value={voiceName}
              onChange={(e) => setVoiceName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="sample">
              {state.voiceId ? "Upload a new sample to re-clone" : "Voice sample"}
            </label>
            <input id="sample" ref={fileInputRef} type="file" accept="audio/*" className="form-input" />
            <p className="form-hint">
              A clean 1-2 minute recording, one speaker, minimal background noise, works best.
            </p>
          </div>
          {cloneError && <p className="auth-error">{cloneError}</p>}
          <button type="submit" className="btn btn-primary" disabled={cloning}>
            {cloning ? "Cloning…" : state.voiceId ? "Re-clone voice" : "Clone my voice"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <form onSubmit={handleConnect}>
      {connectError && <p className="auth-error">{connectError}</p>}
      <div className="form-group">
        <label className="form-label" htmlFor="elevenlabs-key">
          ElevenLabs API key
        </label>
        <input
          id="elevenlabs-key"
          type="password"
          className="form-input"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          required
        />
        <p className="form-hint">
          Find this at elevenlabs.io → Profile → API Keys. Voice cloning and generation are
          billed by ElevenLabs — connecting here doesn&apos;t change your plan.
        </p>
      </div>
      <button type="submit" className="btn btn-primary" disabled={connecting}>
        {connecting ? "Connecting…" : "Connect ElevenLabs"}
      </button>
    </form>
  );
}
