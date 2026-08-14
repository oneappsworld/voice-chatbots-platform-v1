"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { lookupZendeskCustomer, ZendeskApiError } from "@/lib/zendesk";
import type { Language } from "@/lib/nlu";
import { refreshAccessToken, ZendeskOAuthError } from "@/lib/zendesk-oauth";
import {
  verifyApiKey,
  cloneVoice,
  deleteVoice,
  textToSpeech,
  listPremadeVoices,
  ElevenLabsApiError,
} from "@/lib/elevenlabs";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return { supabase, user };
}

export async function disconnectZendesk() {
  const { supabase, user } = await requireUser();
  await supabase.from("crm_connections").delete().eq("user_id", user.id);
  revalidatePath("/settings");
  return { ok: true as const };
}

export async function lookupCustomer(email: string) {
  const { supabase, user } = await requireUser();

  const { data: connection } = await supabase
    .from("crm_connections")
    .select("subdomain, access_token, refresh_token, token_expires_at, status")
    .eq("user_id", user.id)
    .single();

  if (!connection || connection.status !== "connected" || !connection.access_token) {
    return { ok: false as const, error: "Connect Zendesk before running a lookup." };
  }

  let accessToken = connection.access_token;

  // Refresh ahead of expiry (60s buffer) rather than waiting for a 401 —
  // Zendesk access tokens are short-lived, this keeps lookups from failing
  // mid-call.
  const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at) : null;
  const needsRefresh = expiresAt && expiresAt.getTime() - Date.now() < 60_000;

  if (needsRefresh && connection.refresh_token) {
    try {
      const tokens = await refreshAccessToken(connection.subdomain, connection.refresh_token);
      accessToken = tokens.accessToken;
      await supabase
        .from("crm_connections")
        .update({
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken ?? connection.refresh_token,
          token_expires_at: tokens.expiresAt,
        })
        .eq("user_id", user.id);
    } catch (err) {
      const message = err instanceof ZendeskOAuthError ? err.message : "Token refresh failed.";
      await supabase
        .from("crm_connections")
        .update({ status: "error", last_error: message })
        .eq("user_id", user.id);
      return { ok: false as const, error: `${message} Please reconnect Zendesk.` };
    }
  }

  try {
    const result = await lookupZendeskCustomer(
      { subdomain: connection.subdomain, accessToken },
      email.trim()
    );
    return { ok: true as const, result };
  } catch (err) {
    const message = err instanceof ZendeskApiError ? err.message : "Lookup failed.";
    return { ok: false as const, error: message };
  }
}

export async function saveVoiceSettings(input: {
  personaName: string;
  greeting: string;
  language: Language;
  style: "warm" | "professional" | "energetic";
}) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("voice_settings").upsert(
    {
      user_id: user.id,
      persona_name: input.personaName.trim() || "Ava",
      greeting: input.greeting.trim() || "Hi, thanks for calling — how can I help you today?",
      language: input.language,
      style: input.style,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  revalidatePath("/settings");
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function connectElevenLabs(apiKey: string) {
  const { supabase, user } = await requireUser();
  const key = apiKey.trim();

  try {
    await verifyApiKey(key);

    await supabase.from("elevenlabs_connections").upsert(
      { user_id: user.id, api_key: key, status: "connected", last_error: null },
      { onConflict: "user_id" }
    );

    revalidatePath("/settings");
    return { ok: true as const };
  } catch (err) {
    const message = err instanceof ElevenLabsApiError ? err.message : "Connection failed.";

    await supabase.from("elevenlabs_connections").upsert(
      { user_id: user.id, api_key: key, status: "error", last_error: message },
      { onConflict: "user_id" }
    );

    revalidatePath("/settings");
    return { ok: false as const, error: message };
  }
}

export async function disconnectElevenLabs() {
  const { supabase, user } = await requireUser();

  const { data: connection } = await supabase
    .from("elevenlabs_connections")
    .select("api_key, voice_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (connection?.voice_id) {
    await deleteVoice(connection.api_key, connection.voice_id);
  }

  await supabase.from("elevenlabs_connections").delete().eq("user_id", user.id);
  await supabase.storage
    .from("tts-cache")
    .list(user.id)
    .then(async ({ data }) => {
      if (data && data.length > 0) {
        await supabase.storage.from("tts-cache").remove(data.map((f) => `${user.id}/${f.name}`));
      }
    });

  revalidatePath("/settings");
  return { ok: true as const };
}

export async function cloneVoiceFromSample(formData: FormData) {
  const { supabase, user } = await requireUser();

  const file = formData.get("file") as File | null;
  const voiceName = (formData.get("voiceName") as string) || "My Cloned Voice";
  if (!file || file.size === 0) {
    return { ok: false as const, error: "Choose an audio sample first." };
  }

  const { data: connection } = await supabase
    .from("elevenlabs_connections")
    .select("api_key, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!connection || connection.status !== "connected") {
    return { ok: false as const, error: "Connect your ElevenLabs API key before cloning." };
  }

  try {
    const buffer = await file.arrayBuffer();
    const { voiceId } = await cloneVoice(connection.api_key, voiceName.trim(), {
      buffer,
      fileName: file.name,
      mimeType: file.type || "audio/mpeg",
    });

    await supabase
      .from("elevenlabs_connections")
      .update({ voice_id: voiceId, voice_name: voiceName.trim(), last_error: null })
      .eq("user_id", user.id);

    revalidatePath("/settings");
    return { ok: true as const, voiceId, voiceName: voiceName.trim() };
  } catch (err) {
    const message = err instanceof ElevenLabsApiError ? err.message : "Cloning failed.";
    await supabase.from("elevenlabs_connections").update({ last_error: message }).eq("user_id", user.id);
    revalidatePath("/settings");
    return { ok: false as const, error: message };
  }
}

/** Lists ElevenLabs' built-in voices — works on any plan, no cloning needed. */
export async function listStockVoices() {
  const { supabase, user } = await requireUser();

  const { data: connection } = await supabase
    .from("elevenlabs_connections")
    .select("api_key, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!connection || connection.status !== "connected") {
    return { ok: false as const, error: "Connect your ElevenLabs API key first." };
  }

  try {
    const voices = await listPremadeVoices(connection.api_key);
    return { ok: true as const, voices };
  } catch (err) {
    const message = err instanceof ElevenLabsApiError ? err.message : "Couldn't load voices.";
    return { ok: false as const, error: message };
  }
}

/** Picks one of ElevenLabs' stock voices instead of cloning your own. */
export async function selectStockVoice(voiceId: string, voiceName: string) {
  const { supabase, user } = await requireUser();

  const { data: connection } = await supabase
    .from("elevenlabs_connections")
    .select("status, voice_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!connection || connection.status !== "connected") {
    return { ok: false as const, error: "Connect your ElevenLabs API key first." };
  }

  // If a previously cloned voice is being swapped out, delete it from the
  // ElevenLabs account rather than leaving it orphaned (cloned voices count
  // against the account's voice slot limit).
  if (connection.voice_id) {
    const { data: full } = await supabase
      .from("elevenlabs_connections")
      .select("api_key")
      .eq("user_id", user.id)
      .single();
    if (full) {
      await deleteVoice(full.api_key, connection.voice_id).catch(() => {});
    }
  }

  await supabase
    .from("elevenlabs_connections")
    .update({ voice_id: voiceId, voice_name: voiceName, last_error: null })
    .eq("user_id", user.id);

  revalidatePath("/settings");
  return { ok: true as const, voiceId, voiceName };
}

export async function previewElevenLabsVoice(text: string) {
  const { supabase, user } = await requireUser();

  const { data: connection } = await supabase
    .from("elevenlabs_connections")
    .select("api_key, voice_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!connection?.voice_id) {
    return { ok: false as const, error: "Clone a voice first." };
  }

  try {
    const audio = await textToSpeech(connection.api_key, connection.voice_id, text);
    const base64 = Buffer.from(audio).toString("base64");
    return { ok: true as const, audioDataUri: `data:audio/mpeg;base64,${base64}` };
  } catch (err) {
    const message = err instanceof ElevenLabsApiError ? err.message : "Preview failed.";
    return { ok: false as const, error: message };
  }
}
