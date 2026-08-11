"use server";

import { createClient } from "@/lib/supabase/server";
import { answerFaq } from "@/lib/faq";
import { extractOrderId, formatOrderAnswer, type OrderStatus } from "@/lib/orders";
import type { Language } from "@/lib/nlu";

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
