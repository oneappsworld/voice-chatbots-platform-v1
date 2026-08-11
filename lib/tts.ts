// Shared Text-to-Speech helpers built on the browser's native speechSynthesis
// — same engine used by the voice/persona preview in Settings, reused here
// so FAQ and Order Status bot responses are spoken with the account's
// configured persona (language + voice style), not a generic default voice.

import type { Language } from "@/lib/nlu";

export type VoiceStyle = "warm" | "professional" | "energetic";

export const VOICE_STYLES: {
  value: VoiceStyle;
  label: string;
  description: string;
  pitch: number;
  rate: number;
}[] = [
  { value: "warm", label: "Warm & Friendly", description: "Slower, softer — good for support & healthcare.", pitch: 1.12, rate: 0.94 },
  { value: "professional", label: "Professional", description: "Even pace, neutral tone — good for sales & ops.", pitch: 1.0, rate: 1.0 },
  { value: "energetic", label: "Energetic", description: "Faster, brighter — good for retail & promos.", pitch: 1.18, rate: 1.14 },
];

export function pickVoice(voices: SpeechSynthesisVoice[], language: Language): SpeechSynthesisVoice | null {
  const langPrefix = language.split("-")[0];
  return (
    voices.find((v) => v.lang === language) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix)) ??
    null
  );
}

export function buildUtterance(
  text: string,
  opts: { language: Language; style: VoiceStyle; voices: SpeechSynthesisVoice[] }
) {
  const activeStyle = VOICE_STYLES.find((s) => s.value === opts.style) ?? VOICE_STYLES[1];
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = opts.language;
  utterance.pitch = activeStyle.pitch;
  utterance.rate = activeStyle.rate;
  const voice = pickVoice(opts.voices, opts.language);
  if (voice) utterance.voice = voice;
  return utterance;
}

export function speakText(
  text: string,
  opts: { language: Language; style: VoiceStyle; voices: SpeechSynthesisVoice[] },
  handlers?: { onStart?: () => void; onEnd?: () => void; onError?: () => void }
) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = buildUtterance(text, opts);
  if (handlers?.onStart) utterance.onstart = handlers.onStart;
  if (handlers?.onEnd) utterance.onend = handlers.onEnd;
  if (handlers?.onError) utterance.onerror = handlers.onError;
  window.speechSynthesis.speak(utterance);
}
