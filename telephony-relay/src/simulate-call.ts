/**
 * Stands in for a real Twilio call so Phase B can be verified before any
 * Twilio account/credentials exist. Mimics the exact message sequence
 * Twilio sends over a Media Streams WebSocket. Run against a locally
 * running `npm run dev` server: `npm run test:simulate`.
 */
import WebSocket from "ws";

const url = process.env.RELAY_URL ?? "ws://localhost:8080/media-stream";
const ws = new WebSocket(url);

const streamSid = "MZ_simulated_stream";
const callSid = "CA_simulated_call";
const accountSid = "AC_simulated_account";

// A few frames of silent 8kHz mu-law audio, base64-encoded, just to exercise
// the media-frame path without needing a real audio file.
const SILENT_MULAW_FRAME = Buffer.alloc(160, 0xff).toString("base64");

ws.on("open", async () => {
  send({ event: "connected", protocol: "Call", version: "1.0.0" });

  send({
    event: "start",
    sequenceNumber: "1",
    streamSid,
    start: {
      accountSid,
      callSid,
      streamSid,
      tracks: ["inbound"],
      mediaFormat: { encoding: "audio/x-mulaw", sampleRate: 8000, channels: 1 },
    },
  });

  for (let i = 0; i < 5; i += 1) {
    send({
      event: "media",
      sequenceNumber: String(i + 2),
      streamSid,
      media: { track: "inbound", chunk: String(i), timestamp: String(i * 20), payload: SILENT_MULAW_FRAME },
    });
    await sleep(20);
  }

  send({ event: "stop", sequenceNumber: "7", streamSid, stop: { accountSid, callSid } });

  await sleep(100);
  ws.close();
});

ws.on("close", () => {
  console.log("[simulate] connection closed, exiting");
  process.exit(0);
});

ws.on("error", (err) => {
  console.error("[simulate] connection error — is `npm run dev` running?", err);
  process.exit(1);
});

function send(message: Record<string, unknown>) {
  ws.send(JSON.stringify(message));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
