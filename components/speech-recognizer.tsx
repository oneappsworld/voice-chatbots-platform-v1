"use client";

import { useEffect, useRef, useState } from "react";
import type { Language } from "@/lib/nlu";

// Minimal shape of the Web Speech API — not in lib.dom.d.ts by default.
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "Microphone access was denied. Allow mic permission and try again.",
  "no-speech": "No speech detected — try again and speak right after pressing the mic.",
  "audio-capture": "No microphone found on this device.",
  network: "Network error reaching the speech recognition service.",
  aborted: "Listening was stopped.",
};

export function SpeechRecognizer({
  language,
  onFinalTranscript,
}: {
  language: Language;
  onFinalTranscript: (text: string) => void;
}) {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const startTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Must run post-mount, not in a lazy useState initializer: the server
    // can't detect window.SpeechRecognition, so an initializer would
    // mismatch the server-rendered "supported" HTML during hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(getRecognitionCtor() !== null);
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  function start() {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setSupported(false);
      return;
    }
    setError(null);
    setInterim("");

    const recognition = new Ctor();
    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = true;

    const clearStartTimeout = () => {
      if (startTimeoutRef.current) {
        clearTimeout(startTimeoutRef.current);
        startTimeoutRef.current = null;
      }
    };

    recognition.onstart = () => {
      clearStartTimeout();
      setListening(true);
    };
    recognition.onend = () => {
      clearStartTimeout();
      setListening(false);
    };
    recognition.onerror = (e) => {
      clearStartTimeout();
      setError(ERROR_MESSAGES[e.error] ?? `Speech recognition error: ${e.error}`);
      setListening(false);
    };
    recognition.onresult = (e) => {
      let finalText = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interimText += result[0].transcript;
      }
      if (interimText) setInterim(interimText);
      if (finalText) {
        setInterim("");
        onFinalTranscript(finalText.trim());
      }
    };

    recognitionRef.current = recognition;
    recognition.start();

    // Some environments (no mic device, blocked getUserMedia, flaky network
    // to the recognition service) never fire onstart or onerror at all —
    // without this the mic button hangs forever with no feedback.
    startTimeoutRef.current = setTimeout(() => {
      setError("Couldn't reach the microphone or speech service. Check mic permissions and try again.");
      setListening(false);
      recognitionRef.current?.stop();
    }, 6000);
  }

  function stop() {
    recognitionRef.current?.stop();
  }

  if (!supported) {
    return (
      <p className="auth-error">
        This browser doesn&apos;t support live microphone speech recognition (works in
        Chrome/Edge). Use the text field below to test NLU directly.
      </p>
    );
  }

  return (
    <div className="stt-box">
      <button
        type="button"
        className={`mic-button${listening ? " listening" : ""}`}
        onClick={listening ? stop : start}
        aria-label={listening ? "Stop listening" : "Start listening"}
      >
        <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
          <path
            d="M12 15a3 3 0 003-3V6a3 3 0 10-6 0v6a3 3 0 003 3z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path d="M19 11v1a7 7 0 01-14 0v-1M12 19v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <div className="stt-status">
        {listening ? (
          <span className="stt-listening-label">
            <span className="stt-dot" /> Listening…
          </span>
        ) : (
          <span>
            Press the mic and speak in{" "}
            {language === "en-US" ? "English" : language === "es-ES" ? "Spanish" : "Chinese"}
          </span>
        )}
        {interim && <p className="stt-interim">&ldquo;{interim}&rdquo;</p>}
        {error && <p className="auth-error" style={{ marginTop: 10 }}>{error}</p>}
      </div>
    </div>
  );
}
