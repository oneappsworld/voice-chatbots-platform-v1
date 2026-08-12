// Server-only ElevenLabs client — voice cloning + text-to-speech. Never
// import from a Client Component; it handles the raw API key.

export class ElevenLabsApiError extends Error {}

const BASE_URL = "https://api.elevenlabs.io/v1";

async function parseError(res: Response, fallback: string) {
  try {
    const body = await res.json();
    return body?.detail?.message ?? body?.detail ?? fallback;
  } catch {
    return fallback;
  }
}

/** Verifies an API key by fetching the account's own profile. */
export async function verifyApiKey(apiKey: string): Promise<{ ok: true }> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/user`, {
      headers: { "xi-api-key": apiKey },
      cache: "no-store",
    });
  } catch {
    throw new ElevenLabsApiError("Couldn't reach ElevenLabs. Check your network and try again.");
  }

  if (!res.ok) {
    throw new ElevenLabsApiError(await parseError(res, `ElevenLabs returned ${res.status}`));
  }
  return { ok: true };
}

export type StockVoice = { voiceId: string; name: string; description: string };

/**
 * Lists ElevenLabs' built-in premade voices. Usable on any plan (unlike
 * cloning, which needs a paid tier with instant-voice-cloning enabled).
 */
export async function listPremadeVoices(apiKey: string): Promise<StockVoice[]> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/voices`, {
      headers: { "xi-api-key": apiKey },
      cache: "no-store",
    });
  } catch {
    throw new ElevenLabsApiError("Couldn't reach ElevenLabs. Check your network and try again.");
  }

  if (!res.ok) {
    throw new ElevenLabsApiError(await parseError(res, `ElevenLabs returned ${res.status}`));
  }

  const body = await res.json();
  const voices = (body?.voices ?? []) as {
    voice_id: string;
    name: string;
    category?: string;
    labels?: { description?: string };
  }[];

  return voices
    .filter((v) => v.category === "premade")
    .map((v) => ({
      voiceId: v.voice_id,
      name: v.name,
      description: v.labels?.description ?? "",
    }));
}

/** Clones a voice from a short audio sample. Returns the new voice_id. */
export async function cloneVoice(
  apiKey: string,
  voiceName: string,
  file: { buffer: ArrayBuffer; fileName: string; mimeType: string }
): Promise<{ voiceId: string; voiceName: string }> {
  const form = new FormData();
  form.append("name", voiceName);
  form.append("files", new Blob([file.buffer], { type: file.mimeType }), file.fileName);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/voices/add`, {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: form,
    });
  } catch {
    throw new ElevenLabsApiError("Couldn't reach ElevenLabs while uploading the sample.");
  }

  if (!res.ok) {
    throw new ElevenLabsApiError(await parseError(res, `Voice cloning failed (${res.status})`));
  }

  const data = await res.json();
  return { voiceId: data.voice_id as string, voiceName };
}

/** Generates speech audio (mp3 bytes) for the given text in the cloned voice. */
export async function textToSpeech(
  apiKey: string,
  voiceId: string,
  text: string
): Promise<ArrayBuffer> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.85 },
      }),
    });
  } catch {
    throw new ElevenLabsApiError("Couldn't reach ElevenLabs while generating speech.");
  }

  if (!res.ok) {
    throw new ElevenLabsApiError(await parseError(res, `Speech generation failed (${res.status})`));
  }

  return res.arrayBuffer();
}

/** Best-effort cleanup of a cloned voice on ElevenLabs' side. */
export async function deleteVoice(apiKey: string, voiceId: string): Promise<void> {
  try {
    await fetch(`${BASE_URL}/voices/${voiceId}`, {
      method: "DELETE",
      headers: { "xi-api-key": apiKey },
    });
  } catch {
    // best-effort — local disconnect proceeds regardless
  }
}
