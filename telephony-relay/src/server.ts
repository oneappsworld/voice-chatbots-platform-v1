import { createServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { parseInboundMessage, buildOutboundMediaFrame, buildMarkFrame } from "./twilio-media-stream.js";
import { DeepgramTranscriber, isDeepgramConfigured } from "./deepgram.js";
import { synthesizeSpeech, isElevenLabsConfigured, chunkAudioFrames } from "./elevenlabs.js";

const PORT = Number(process.env.PORT ?? 8080);
/**
 * Twilio Media Streams has no signature-validation equivalent for the WS
 * upgrade itself (unlike the voice webhook) — the accepted pattern is a
 * shared secret in the stream URL, set via a <Parameter> or query string on
 * the <Connect><Stream> TwiML. Left unset in dev; must be set before this
 * service is wired to a real Twilio number.
 */
const SHARED_SECRET = process.env.RELAY_SHARED_SECRET;

interface CallSession {
  streamSid: string;
  callSid: string;
  accountSid: string;
  mediaChunkCount: number;
  startedAt: number;
  transcriber: DeepgramTranscriber | null;
}

const sessions = new Map<WebSocket, CallSession>();

const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok", activeSessions: sessions.size }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server: httpServer, path: "/media-stream" });

wss.on("connection", (ws, request) => {
  if (SHARED_SECRET) {
    const url = new URL(request.url ?? "", "http://internal");
    if (url.searchParams.get("token") !== SHARED_SECRET) {
      ws.close(1008, "unauthorized");
      return;
    }
  }

  ws.on("message", (raw) => {
    const message = parseInboundMessage(raw.toString());
    if (!message) return;

    switch (message.event) {
      case "connected":
        console.log("[relay] twilio connected", { protocol: message.protocol, version: message.version });
        break;

      case "start": {
        const session: CallSession = {
          streamSid: message.start.streamSid,
          callSid: message.start.callSid,
          accountSid: message.start.accountSid,
          mediaChunkCount: 0,
          startedAt: Date.now(),
          transcriber: null,
        };
        sessions.set(ws, session);
        console.log("[relay] call started", {
          callSid: session.callSid,
          streamSid: session.streamSid,
          mediaFormat: message.start.mediaFormat,
        });

        if (isDeepgramConfigured()) {
          const transcriber = new DeepgramTranscriber({
            callSid: session.callSid,
            onTranscript: (result) => {
              console.log("[deepgram] transcript", {
                callSid: session.callSid,
                isFinal: result.isFinal,
                transcript: result.transcript,
              });
              if (result.isFinal && result.transcript.trim() && isElevenLabsConfigured()) {
                void speakBack(ws, session.streamSid, result.transcript).catch((err) => {
                  console.error("[elevenlabs] failed to speak response", {
                    callSid: session.callSid,
                    err: err instanceof Error ? err.message : String(err),
                  });
                });
              }
            },
            onError: (err) => {
              console.error("[deepgram] error", { callSid: session.callSid, err: err.message });
            },
          });
          transcriber.connect();
          session.transcriber = transcriber;
        }
        break;
      }

      case "media": {
        const session = sessions.get(ws);
        if (!session) break;
        session.mediaChunkCount += 1;
        session.transcriber?.sendAudio(Buffer.from(message.media.payload, "base64"));
        break;
      }

      case "stop": {
        const session = sessions.get(ws);
        session?.transcriber?.close();
        console.log("[relay] call stopped", {
          callSid: session?.callSid ?? message.stop.callSid,
          mediaChunksReceived: session?.mediaChunkCount ?? 0,
          durationMs: session ? Date.now() - session.startedAt : undefined,
        });
        sessions.delete(ws);
        break;
      }

      case "mark":
        console.log("[relay] mark acknowledged", { name: message.mark.name });
        break;

      case "dtmf":
        console.log("[relay] dtmf digit", { digit: message.dtmf.digit });
        break;
    }
  });

  ws.on("close", () => {
    sessions.get(ws)?.transcriber?.close();
    sessions.delete(ws);
  });

  ws.on("error", (err) => {
    console.error("[relay] websocket error", err);
    sessions.get(ws)?.transcriber?.close();
    sessions.delete(ws);
  });
});

/**
 * Phase E scope: proves the TTS-to-Twilio audio pipe works end-to-end once
 * real audio is flowing — it echoes back what was heard, not a real bot
 * reply. Deciding *what* to say (routing the transcript through the main
 * app's NLU/bot logic in lib/nlu.ts etc.) is separate, not-yet-built work.
 */
async function speakBack(ws: WebSocket, streamSid: string, heardText: string): Promise<void> {
  const audio = await synthesizeSpeech(`I heard you say: ${heardText}`);
  for (const frame of chunkAudioFrames(audio)) {
    ws.send(buildOutboundMediaFrame(streamSid, frame.toString("base64")));
  }
  ws.send(buildMarkFrame(streamSid, "response-complete"));
}

httpServer.listen(PORT, () => {
  console.log(`[relay] listening on :${PORT} (ws path /media-stream, health at /health)`);
});
