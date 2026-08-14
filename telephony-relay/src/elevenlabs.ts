const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID;

export function isElevenLabsConfigured(): boolean {
  return Boolean(ELEVENLABS_API_KEY && ELEVENLABS_VOICE_ID);
}

/**
 * Requests ElevenLabs' telephony-oriented output format (`ulaw_8000`)
 * directly, so no local transcoding is needed before framing the result
 * back onto the Twilio Media Stream — same encoding Twilio sends inbound.
 * Written from documented API shape; NOT yet exercised against a real
 * ElevenLabs account/key, same caveat as deepgram.ts's untested shape.
 */
export async function synthesizeSpeech(text: string): Promise<Buffer> {
  if (!ELEVENLABS_API_KEY || !ELEVENLABS_VOICE_ID) {
    throw new Error("ElevenLabs not configured — check isElevenLabsConfigured() first.");
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/stream?output_format=ulaw_8000`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({ text, model_id: "eleven_multilingual_v2" }),
    },
  );

  if (!response.ok) {
    throw new Error(`ElevenLabs TTS request failed: ${response.status} ${await response.text()}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

/**
 * Twilio's inbound mu-law frames are 160 bytes (20ms of 8kHz 8-bit audio);
 * matching that on the way out keeps outbound framing consistent with what
 * the relay already parses inbound, though Twilio doesn't require any
 * specific outbound chunk size or send pacing — it buffers and paces
 * playback itself.
 */
export function chunkAudioFrames(audio: Buffer, frameSize = 160): Buffer[] {
  const frames: Buffer[] = [];
  for (let offset = 0; offset < audio.length; offset += frameSize) {
    frames.push(audio.subarray(offset, offset + frameSize));
  }
  return frames;
}
