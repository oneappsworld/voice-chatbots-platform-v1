"use server";

import { createClient } from "@/lib/supabase/server";
import { answerFaq } from "@/lib/faq";
import { extractOrderId, formatOrderAnswer, type OrderStatus } from "@/lib/orders";
import { textToSpeech, ElevenLabsApiError } from "@/lib/elevenlabs";
import { generateSlots, type Slot, type Service } from "@/lib/appointment-booking";
import { type LeadAnswers, type LeadQualification } from "@/lib/lead-qualification";
import {
  buildContextSummary,
  pickSimulatedAgent,
  sensitivityToThreshold,
  type EscalationReason,
  type EscalationSensitivity,
  type TranscriptTurn,
} from "@/lib/escalation";
import type { Language } from "@/lib/nlu";
import type { SupabaseClient } from "@supabase/supabase-js";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return { supabase, user };
}

async function getOrganizationId(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await supabase.from("profiles").select("organization_id").eq("id", userId).maybeSingle();
  return (data?.organization_id as string | undefined) ?? null;
}

export async function askFaqBot(text: string, language: Language) {
  const { supabase, user } = await requireUser();
  const base = answerFaq(text, language);

  const organizationId = await getOrganizationId(supabase, user.id);
  if (!organizationId) return base;

  const { data: override } = await supabase
    .from("bot_responses")
    .select("response_text")
    .eq("organization_id", organizationId)
    .eq("language", language)
    .eq("intent", base.nlu.intent)
    .maybeSingle();

  return override?.response_text ? { ...base, answerText: override.response_text } : base;
}

/** How many consecutive failed turns a bot should tolerate before escalating — configurable org-wide from Admin Settings. */
export async function getEscalationThreshold(): Promise<number> {
  const { supabase, user } = await requireUser();
  const organizationId = await getOrganizationId(supabase, user.id);
  if (!organizationId) return sensitivityToThreshold("normal");

  const { data } = await supabase
    .from("org_settings")
    .select("escalation_sensitivity")
    .eq("organization_id", organizationId)
    .maybeSingle();

  return sensitivityToThreshold((data?.escalation_sensitivity as EscalationSensitivity | undefined) ?? "normal");
}

export async function checkOrderStatus(text: string, language: Language) {
  const { supabase, user } = await requireUser();

  const orderId = extractOrderId(text);
  if (!orderId) {
    return {
      orderId: null as string | null,
      found: false as const,
      answerText:
        language === "en-US"
          ? "I couldn't find an order ID in that. Try saying or typing something like \"ORD-10234\"."
          : "No encontré un número de pedido en eso. Intenta decir o escribir algo como \"ORD-10234\".",
    };
  }

  const { data: order } = await supabase
    .from("orders")
    .select("order_number, item, status, updated_at")
    .eq("user_id", user.id)
    .ilike("order_number", orderId)
    .maybeSingle();

  const answerText = formatOrderAnswer(
    language,
    order
      ? {
          orderNumber: order.order_number,
          item: order.item,
          status: order.status as OrderStatus,
          updatedAt: order.updated_at,
        }
      : null,
    orderId
  );

  return {
    orderId,
    found: Boolean(order) as boolean,
    order: order
      ? {
          orderNumber: order.order_number,
          item: order.item,
          status: order.status as OrderStatus,
          updatedAt: order.updated_at,
        }
      : null,
    answerText,
  };
}

async function getCachedAudio(supabase: SupabaseClient, path: string): Promise<Buffer | null> {
  const { data, error } = await supabase.storage.from("tts-cache").download(path);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

/**
 * Generates spoken audio for a bot response via the account's cloned
 * ElevenLabs voice. FAQ answers pass a stable `cacheKey` (language + intent)
 * so repeat questions replay a cached file instead of re-billing the API;
 * dynamic answers (order status) omit it and always generate fresh.
 * Callers fall back to browser speechSynthesis when this returns not-ok —
 * including the common case of no ElevenLabs connection yet.
 */
export async function synthesizeSpeech(text: string, opts: { cacheKey?: string } = {}) {
  const { supabase, user } = await requireUser();

  const { data: connection } = await supabase
    .from("elevenlabs_connections")
    .select("api_key, voice_id, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!connection || connection.status !== "connected" || !connection.voice_id) {
    return { ok: false as const, reason: "not_connected" as const };
  }

  const storagePath = opts.cacheKey ? `${user.id}/${connection.voice_id}/${opts.cacheKey}.mp3` : null;

  if (storagePath) {
    const cached = await getCachedAudio(supabase, storagePath);
    if (cached) {
      return {
        ok: true as const,
        audioDataUri: `data:audio/mpeg;base64,${cached.toString("base64")}`,
        cached: true,
      };
    }
  }

  try {
    const audio = await textToSpeech(connection.api_key, connection.voice_id, text);
    const buffer = Buffer.from(audio);

    if (storagePath) {
      await supabase.storage
        .from("tts-cache")
        .upload(storagePath, buffer, { contentType: "audio/mpeg", upsert: true });
    }

    return {
      ok: true as const,
      audioDataUri: `data:audio/mpeg;base64,${buffer.toString("base64")}`,
      cached: false,
    };
  } catch (err) {
    const message = err instanceof ElevenLabsApiError ? err.message : "Speech generation failed.";
    return { ok: false as const, reason: "error" as const, error: message };
  }
}

export async function listSampleOrderIds() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("orders")
    .select("order_number")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(4);
  return (data ?? []).map((o) => o.order_number);
}

export async function getAvailableSlots(language: Language): Promise<Slot[]> {
  const { supabase, user } = await requireUser();
  // generateSlots only ever looks ~21 days ahead — a booking from months
  // ago is irrelevant to next week's availability and shouldn't be fetched.
  const { data } = await supabase
    .from("appointments")
    .select("scheduled_at")
    .eq("user_id", user.id)
    .eq("status", "booked")
    .gte("scheduled_at", new Date().toISOString());

  const bookedIso = (data ?? []).map((a) => new Date(a.scheduled_at).toISOString());
  return generateSlots(bookedIso, language);
}

export async function bookAppointment(payload: {
  service: Service;
  slot: Slot;
  customerName: string;
  contact: string;
}) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("appointments").insert({
    user_id: user.id,
    service: payload.service.value,
    customer_name: payload.customerName,
    contact: payload.contact,
    scheduled_at: payload.slot.iso,
  });

  if (error) {
    // Most likely someone else grabbed the same slot between fetch and booking.
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const };
}

export async function saveLead(payload: {
  answers: LeadAnswers;
  score: number;
  qualification: LeadQualification;
  transcript: TranscriptTurn[];
}) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("leads").insert({
    user_id: user.id,
    full_name: payload.answers.name ?? null,
    email: payload.answers.email ?? null,
    company: payload.answers.company ?? null,
    team_size: payload.answers.team_size ?? null,
    use_case: payload.answers.use_case ?? null,
    budget_range: payload.answers.budget ?? null,
    timeline: payload.answers.timeline ?? null,
    score: payload.score,
    qualification: payload.qualification,
    transcript: payload.transcript,
  });

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

/**
 * Simulates a live-agent handoff: picks an agent, builds a context brief
 * from the conversation so far, and writes a `handoffs` row a real agent
 * dashboard would poll. Any bot can call this the moment it detects an
 * escalation trigger — see lib/escalation.ts for the trigger detection.
 */
export async function escalateToHuman(payload: {
  sourceBot: string;
  reason: EscalationReason;
  turns: TranscriptTurn[];
  language: Language;
  collected?: Record<string, string | undefined>;
}) {
  const { supabase, user } = await requireUser();

  const agentName = pickSimulatedAgent(payload.language);
  const contextSummary = buildContextSummary(payload.turns, payload.language, {
    botName: payload.sourceBot,
    collected: payload.collected,
  });

  const { data, error } = await supabase
    .from("handoffs")
    .insert({
      user_id: user.id,
      source_bot: payload.sourceBot,
      reason: payload.reason,
      context_summary: contextSummary,
      transcript: payload.turns,
      assigned_agent: agentName,
      status: "connected",
    })
    .select("id")
    .single();

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, handoffId: data.id as string, agentName, contextSummary };
}
