import type { Language } from "@/lib/nlu";

export type OrderStatus = "processing" | "shipped" | "in_transit" | "delivered" | "cancelled";

const ORDER_ID_RE = /\bORD-?\s?(\d{4,6})\b/i;
const BARE_NUMBER_RE = /\b(\d{4,8})\b/;

/** Pulls an order ID like "ORD-10234" out of a free-form sentence, spoken or typed. */
export function extractOrderId(rawText: string): string | null {
  const text = rawText.trim();
  const prefixed = text.match(ORDER_ID_RE);
  if (prefixed) return `ORD-${prefixed[1]}`;

  const bare = text.match(BARE_NUMBER_RE);
  if (bare) return `ORD-${bare[1]}`;

  return null;
}

const STATUS_SPOKEN: Record<Language, Record<OrderStatus, string>> = {
  "en-US": {
    processing: "being processed",
    shipped: "shipped",
    in_transit: "in progress and on its way",
    delivered: "delivered",
    cancelled: "cancelled",
  },
  "es-ES": {
    processing: "en proceso",
    shipped: "enviado",
    in_transit: "en camino",
    delivered: "entregado",
    cancelled: "cancelado",
  },
  "zh-CN": {
    processing: "处理中",
    shipped: "已发货",
    in_transit: "运输中",
    delivered: "已送达",
    cancelled: "已取消",
  },
};

export function statusSpoken(status: OrderStatus, language: Language): string {
  return STATUS_SPOKEN[language][status];
}

export function formatOrderAnswer(
  language: Language,
  input: { orderNumber: string; item: string; status: OrderStatus; updatedAt: string } | null,
  requestedId: string
): string {
  if (!input) {
    if (language === "en-US") return `I couldn't find an order with ID ${requestedId}. Please double-check the number and try again.`;
    if (language === "es-ES") return `No pude encontrar un pedido con el número ${requestedId}. Por favor verifica el número e inténtalo de nuevo.`;
    return `我没有找到订单号为 ${requestedId} 的订单。请核对订单号后重试。`;
  }

  const date = new Date(input.updatedAt).toLocaleDateString(language, { month: "long", day: "numeric" });
  const spoken = statusSpoken(input.status, language);

  if (language === "en-US") return `Order ${input.orderNumber}, ${input.item}, is currently ${spoken}. It was last updated on ${date}.`;
  if (language === "es-ES") return `El pedido ${input.orderNumber}, ${input.item}, está actualmente ${spoken}. Se actualizó por última vez el ${date}.`;
  return `订单 ${input.orderNumber}（${input.item}）目前状态为${spoken}，最后更新时间是 ${date}。`;
}
