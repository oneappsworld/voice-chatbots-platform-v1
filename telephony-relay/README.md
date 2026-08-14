# chatsyn-telephony-relay

Small always-on WebSocket service that bridges Twilio Media Streams for real
inbound phone calls. Exists as a separate service because Vercel serverless
functions (what the main ChatSyn app runs on) can't hold a long-lived
bidirectional audio WebSocket — this is meant to run on Railway instead.

Phase B of the real-telephony build (see the main app's memory notes) —
STT/NLU/TTS are not wired in yet, this just proves the media stream
lifecycle (connect → start → media frames → stop) is handled correctly.

## Local dev

```
npm install
npm run dev              # starts the relay on :8080
npm run test:simulate    # separate terminal — simulates a Twilio call against it
```

## Wiring to a real call (not done yet)

Once a Twilio number exists, `app/api/twilio/voice/route.ts` in the main app
needs its TwiML changed from a static `<Say>` to:

```xml
<Connect>
  <Stream url="wss://<railway-domain>/media-stream?token=<RELAY_SHARED_SECRET>" />
</Connect>
```

Set `RELAY_SHARED_SECRET` the same on both this service and wherever the
TwiML is generated — the relay rejects any connection without a matching
`token` query param once that env var is set.

## Env vars

- `PORT` — set automatically by Railway.
- `RELAY_SHARED_SECRET` — optional in dev, required before pointing a real
  Twilio number here.
