"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  testZendeskConnection,
  lookupZendeskCustomer,
  ZendeskApiError,
  type ZendeskCredentials,
} from "@/lib/zendesk";

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
