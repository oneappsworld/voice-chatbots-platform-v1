export interface StartMessage {
  event: "start";
  sequenceNumber: string;
  streamSid: string;
  start: {
    accountSid: string;
    callSid: string;
    streamSid: string;
    tracks: string[];
    mediaFormat: { encoding: string; sampleRate: number; channels: number };
  };
}

export interface MediaMessage {
  event: "media";
  sequenceNumber: string;
  streamSid: string;
  media: { track: string; chunk: string; timestamp: string; payload: string };
}

export interface StopMessage {
  event: "stop";
  sequenceNumber: string;
  streamSid: string;
  stop: { accountSid: string; callSid: string };
}

export interface ConnectedMessage {
  event: "connected";
  protocol: string;
  version: string;
}

export interface MarkMessage {
  event: "mark";
  sequenceNumber: string;
  streamSid: string;
  mark: { name: string };
}

export interface DtmfMessage {
  event: "dtmf";
  sequenceNumber: string;
  streamSid: string;
  dtmf: { track: string; digit: string };
}

export type InboundStreamMessage =
  | ConnectedMessage
  | StartMessage
  | MediaMessage
  | StopMessage
  | MarkMessage
  | DtmfMessage;

export function parseInboundMessage(raw: string): InboundStreamMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("event" in parsed) ||
    typeof (parsed as { event: unknown }).event !== "string"
  ) {
    return null;
  }
  return parsed as InboundStreamMessage;
}

/** Twilio Media Streams only accepts mono 8kHz mu-law (or PCM if negotiated) back on the same track. */
export function buildOutboundMediaFrame(streamSid: string, base64Payload: string) {
  return JSON.stringify({
    event: "media",
    streamSid,
    media: { payload: base64Payload },
  });
}

export function buildMarkFrame(streamSid: string, name: string) {
  return JSON.stringify({ event: "mark", streamSid, mark: { name } });
}

export function buildClearFrame(streamSid: string) {
  return JSON.stringify({ event: "clear", streamSid });
}
