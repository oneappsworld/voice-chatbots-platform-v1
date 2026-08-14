import WebSocket from "ws";

/**
 * Wraps a per-call connection to Deepgram's real-time streaming STT API.
 * Shape matches Deepgram's documented live-transcription protocol
 * (wss://api.deepgram.com/v1/listen, Authorization: Token header, raw
 * binary audio frames in, JSON transcript results out) — written ahead of
 * having a real DEEPGRAM_API_KEY, so it has NOT been exercised against a
 * live connection yet. Re-verify param names/response shape against a real
 * account before trusting this in production, same caveat this project
 * already applies to other "build ahead of credentials" integrations.
 */

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const DEEPGRAM_MODEL = process.env.DEEPGRAM_MODEL ?? "nova-2";
// ChatSyn currently supports en-US/es-ES/zh-CN (see lib/nlu.ts in the main
// app) — "multi" enables Deepgram's code-switching multi-language
// recognition rather than committing to one language per call up front,
// matching the auto-detect need described for Phase C.
const DEEPGRAM_LANGUAGE = process.env.DEEPGRAM_LANGUAGE ?? "multi";

export function isDeepgramConfigured(): boolean {
  return Boolean(DEEPGRAM_API_KEY);
}

export interface TranscriptResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}

export interface DeepgramTranscriberOptions {
  callSid: string;
  onTranscript: (result: TranscriptResult) => void;
  onError?: (err: Error) => void;
}

export class DeepgramTranscriber {
  private ws: WebSocket | null = null;
  private readonly options: DeepgramTranscriberOptions;
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;

  constructor(options: DeepgramTranscriberOptions) {
    this.options = options;
  }

  connect(): void {
    if (!DEEPGRAM_API_KEY) {
      throw new Error("DEEPGRAM_API_KEY not configured — check isDeepgramConfigured() before constructing this.");
    }

    const params = new URLSearchParams({
      encoding: "mulaw",
      sample_rate: "8000",
      channels: "1",
      model: DEEPGRAM_MODEL,
      language: DEEPGRAM_LANGUAGE,
      punctuate: "true",
      interim_results: "true",
      endpointing: "300",
    });

    this.ws = new WebSocket(`wss://api.deepgram.com/v1/listen?${params}`, {
      headers: { Authorization: `Token ${DEEPGRAM_API_KEY}` },
    });

    this.ws.on("open", () => {
      console.log("[deepgram] connected", { callSid: this.options.callSid });
      // Deepgram closes idle connections after ~10s with no audio; Twilio
      // media frames arrive every 20ms during a real call so this is
      // mostly a safety net for gaps, not the primary keepalive.
      this.keepAliveTimer = setInterval(() => {
        this.ws?.send(JSON.stringify({ type: "KeepAlive" }));
      }, 8000);
    });

    this.ws.on("message", (raw) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw.toString());
      } catch {
        return;
      }
      const result = extractTranscript(parsed);
      if (result) this.options.onTranscript(result);
    });

    this.ws.on("error", (err) => {
      this.options.onError?.(err instanceof Error ? err : new Error(String(err)));
    });

    this.ws.on("close", () => {
      if (this.keepAliveTimer) clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    });
  }

  sendAudio(mulawFrame: Buffer): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(mulawFrame);
    }
  }

  close(): void {
    if (this.keepAliveTimer) clearInterval(this.keepAliveTimer);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "CloseStream" }));
      this.ws.close();
    }
    this.ws = null;
  }
}

export function extractTranscript(message: unknown): TranscriptResult | null {
  if (typeof message !== "object" || message === null || !("channel" in message)) return null;
  const channel = (message as { channel?: { alternatives?: { transcript?: string; confidence?: number }[] } }).channel;
  const alt = channel?.alternatives?.[0];
  if (!alt?.transcript) return null;
  const isFinal = "is_final" in message && Boolean((message as { is_final?: boolean }).is_final);
  return { transcript: alt.transcript, isFinal, confidence: alt.confidence ?? 0 };
}
