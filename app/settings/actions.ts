"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  testZendeskConnection,
  lookupZendeskCustomer,
  ZendeskApiError,
  type ZendeskCredentials,
} from "@/lib/zendesk";
import {
  verifyApiKey,
  cloneVoice,
  deleteVoice,
  textToSpeech,
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

export async function connectZendesk(input: {
  subdomain: string;
  agentEmail: string;
  apiToken: string;
}) {
  const { supabase, user } = await requireUser();
  const creds: ZendeskCredentials = {
    subdomain: input.subdomain.trim(),
    agentEmail: input.agentEmail.trim(),
    apiToken: input.apiToken.trim(),
  };

  try {
    const { agentName } = await testZendeskConnection(creds);

    await supabase.from("crm_connections").upsert(
      {
        user_id: user.id,
        provider: "zendesk",
        subdomain: creds.subdomain,
        agent_email: creds.agentEmail,
        api_token: creds.apiToken,
        status: "connected",
        connected_agent_name: agentName,
        last_verified_at: new Date().toISOString(),
        last_error: null,
      },
      { onConflict: "user_id" }
    );

    revalidatePath("/settings");
    return { ok: true as const, agentName };
  } catch (err) {
    const message = err instanceof ZendeskApiError ? err.message : "Connection failed.";

    await supabase.from("crm_connections").upsert(
      {
        user_id: user.id,
        provider: "zendesk",
        subdomain: creds.subdomain,
        agent_email: creds.agentEmail,
        api_token: creds.apiToken,
        status: "error",
        last_error: message,
      },
      { onConflict: "user_id" }
    );

    revalidatePath("/settings");
    return { ok: false as const, error: message };
  }
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
    .select("subdomain, agent_email, api_token, status")
    .eq("user_id", user.id)
    .single();

  if (!connection || connection.status !== "connected") {
    return { ok: false as const, error: "Connect Zendesk before running a lookup." };
  }

  try {
    const result = await lookupZendeskCustomer(
      {
        subdomain: connection.subdomain,
        agentEmail: connection.agent_email,
        apiToken: connection.api_token,
      },
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
  language: "en-US" | "es-ES";
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
