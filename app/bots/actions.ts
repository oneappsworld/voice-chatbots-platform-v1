"use server";

import { createClient } from "@/lib/supabase/server";
import { answerFaq } from "@/lib/faq";
import { extractOrderId, formatOrderAnswer, type OrderStatus } from "@/lib/orders";
import { textToSpeech, ElevenLabsApiError } from "@/lib/elevenlabs";
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

export async function askFaqBot(text: string, language: Language) {
  await requireUser();
  return answerFaq(text, language);
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
