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
  "zh-CN": {
    greeting: "您好！我是虚拟助手。今天有什么可以帮您的吗？",
    goodbye: "感谢您的咨询，祝您今天愉快！",
    booking_scheduling: "我可以帮您预约或改期。我们的团队会确认时间，并通过邮件或短信尽快回复您。",
    order_status: "听起来您想查询订单。请提供订单号，例如 ORD-10234，我可以帮您查询状态。",
    billing: "关于账单问题，我可以查看您的账户和最近的发票。如果有收费不对，我会标记给账单团队核实并在需要时退款。",
    password_reset: "我可以帮您重置密码。我会向您的注册邮箱发送一个安全的重置链接，请稍后查看收件箱。",
    complaint: "非常抱歉给您带来不便。我已将此记录为优先处理事项，我们团队会尽快跟进。",
    question: "这是个好问题。能再多告诉我一些吗——是关于账单、预约、密码重置，还是订单？",
    request: "很乐意帮您处理。能再提供一些细节吗？",
    unknown: "我不太确定理解您的意思。能换个说法吗？或者可以问账单、预约、密码重置或订单状态相关的问题。",
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
