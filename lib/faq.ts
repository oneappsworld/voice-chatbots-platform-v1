// FAQ Answering Bot: maps an NLU intent to a canned, spoken-friendly answer.
// Built directly on top of the foundational NLU engine (lib/nlu.ts) — this
// is deliberately the thinnest possible layer on top of intent
// classification, matching the "basic FAQ bot" scope of this step.

import { classifyIntent, type Intent, type Language, type NluResult } from "@/lib/nlu";

export type FaqAnswer = {
  nlu: NluResult;
  answerText: string;
  isOrderHandoff: boolean;
};

export const DEFAULT_ANSWERS: Record<Language, Record<Intent, string>> = {
  "en-US": {
    greeting: "Hi there! I'm the virtual assistant. How can I help you today?",
    goodbye: "Thanks for reaching out — have a great day!",
    booking_scheduling:
      "I can help with booking or rescheduling an appointment. Our team will confirm availability and follow up by email or text shortly.",
    order_status:
      "It sounds like you're asking about an order. Give me an order ID, like ORD-10234, and I can check its status for you.",
    billing:
      "For billing questions, I can see your account and recent invoices. If a charge looks wrong, I'll flag it for our billing team to review and refund if needed.",
    password_reset:
      "I can help you reset your password. I'll send a secure reset link to the email on file — check your inbox in the next few minutes.",
    complaint:
      "I'm really sorry to hear that. I've logged this as a priority issue, and a member of our team will follow up with you shortly.",
    question:
      "That's a great question. Could you tell me a bit more about what you need — billing, appointments, password resets, or an order?",
    request:
      "Happy to help with that. Could you give me a few more details so I can take care of it?",
    unknown:
      "I'm not totally sure I understood that. Could you rephrase, or ask about billing, appointments, password resets, or your order status?",
  },
  "es-ES": {
    greeting: "¡Hola! Soy el asistente virtual. ¿En qué puedo ayudarte hoy?",
    goodbye: "Gracias por contactarnos — ¡que tengas un buen día!",
    booking_scheduling:
      "Puedo ayudarte a reservar o reprogramar una cita. Nuestro equipo confirmará la disponibilidad y te contactará por correo o mensaje de texto.",
    order_status:
      "Parece que preguntas sobre un pedido. Dame el número de pedido, como ORD-10234, y puedo revisar su estado.",
    billing:
      "Para preguntas de facturación, puedo ver tu cuenta y facturas recientes. Si un cargo parece incorrecto, lo marcaré para que nuestro equipo lo revise y reembolse si es necesario.",
    password_reset:
      "Puedo ayudarte a restablecer tu contraseña. Enviaré un enlace seguro al correo registrado — revisa tu bandeja de entrada en unos minutos.",
    complaint:
      "Lamento mucho escuchar eso. He registrado esto como un asunto prioritario y alguien de nuestro equipo te contactará pronto.",
    question:
      "Buena pregunta. ¿Puedes contarme un poco más sobre lo que necesitas: facturación, citas, contraseña o un pedido?",
    request: "Con gusto te ayudo con eso. ¿Puedes darme más detalles para poder resolverlo?",
    unknown:
      "No estoy segura de haber entendido eso. ¿Puedes reformularlo, o preguntar sobre facturación, citas, contraseña o el estado de tu pedido?",
  },
};

export function answerFaq(text: string, language: Language): FaqAnswer {
  const nlu = classifyIntent(text, language);
  return {
    nlu,
    answerText: DEFAULT_ANSWERS[language][nlu.intent],
    isOrderHandoff: nlu.intent === "order_status",
  };
}
