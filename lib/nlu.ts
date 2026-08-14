// Foundational rule-based NLU: intent classification + entity extraction.
// Pure functions, no external dependencies — this is the backbone every
// voice-driven interaction runs through after speech-to-text produces a
// transcript. Structured so a future LLM-backed classifier can be swapped
// in behind the same `classifyIntent` signature without touching callers.

export type Language = "en-US" | "es-ES" | "zh-CN";

export type Intent =
  | "greeting"
  | "goodbye"
  | "booking_scheduling"
  | "order_status"
  | "billing"
  | "password_reset"
  | "complaint"
  | "question"
  | "request"
  | "unknown";

export const ALL_INTENTS: Intent[] = [
  "greeting",
  "goodbye",
  "booking_scheduling",
  "order_status",
  "billing",
  "password_reset",
  "complaint",
  "question",
  "request",
  "unknown",
];

export const INTENT_LABELS: Record<Intent, string> = {
  greeting: "Greeting",
  goodbye: "Goodbye",
  booking_scheduling: "Booking / scheduling",
  order_status: "Order status",
  billing: "Billing",
  password_reset: "Password reset",
  complaint: "Complaint",
  question: "Question",
  request: "General request",
  unknown: "Unrecognized",
};

export type Entities = {
  emails: string[];
  phones: string[];
  dates: string[];
};

export type NluResult = {
  text: string;
  language: Language;
  intent: Intent;
  confidence: number; // 0-1
  matchedKeywords: string[];
  entities: Entities;
};

const KEYWORDS: Record<Language, Record<Exclude<Intent, "question" | "request" | "unknown">, string[]>> = {
  "en-US": {
    greeting: ["hello", "hi", "hey", "good morning", "good afternoon", "good evening"],
    goodbye: ["bye", "goodbye", "see you", "that's all", "that is all", "thanks, bye", "no that's it"],
    booking_scheduling: ["book", "schedule", "appointment", "reservation", "reschedule", "availability", "book a"],
    order_status: ["order", "shipment", "tracking", "delivery", "package", "shipped", "where is my"],
    billing: ["bill", "invoice", "charge", "payment", "refund", "subscription", "overcharged", "receipt"],
    password_reset: ["password", "reset my password", "locked out", "can't log in", "cannot log in", "forgot my password"],
    complaint: ["not working", "broken", "angry", "frustrated", "complain", "complaint", "unhappy", "terrible", "worst", "unacceptable"],
  },
  "es-ES": {
    greeting: ["hola", "buenos días", "buenas tardes", "buenas noches", "qué tal"],
    goodbye: ["adiós", "hasta luego", "eso es todo", "nada más", "gracias, adiós"],
    booking_scheduling: ["reservar", "cita", "agendar", "reprogramar", "disponibilidad", "reserva"],
    order_status: ["pedido", "envío", "seguimiento", "entrega", "paquete", "dónde está mi"],
    billing: ["factura", "cobro", "pago", "reembolso", "suscripción", "me cobraron", "recibo"],
    password_reset: ["contraseña", "restablecer mi contraseña", "no puedo entrar", "olvidé mi contraseña", "bloqueada"],
    complaint: ["no funciona", "roto", "enojado", "enojada", "frustrado", "frustrada", "queja", "terrible", "inaceptable"],
  },
  "zh-CN": {
    greeting: ["你好", "您好", "早上好", "下午好", "晚上好", "嗨"],
    goodbye: ["再见", "拜拜", "就这些", "没有了", "谢谢再见"],
    booking_scheduling: ["预约", "预订", "预定", "安排时间", "改期", "空档时间"],
    order_status: ["订单", "快递", "物流", "配送", "包裹", "发货", "订单在哪"],
    billing: ["账单", "发票", "收费", "付款", "退款", "订阅", "多收费", "收据"],
    password_reset: ["密码", "重置密码", "登录不了", "无法登录", "忘记密码"],
    complaint: ["坏了", "不能用", "生气", "沮丧", "投诉", "抱怨", "不满意", "太差了", "无法接受"],
  },
};

const QUESTION_WORDS: Record<Language, string[]> = {
  "en-US": ["what", "where", "when", "why", "how", "who", "which", "is", "are", "do", "does", "can", "could", "would", "will"],
  "es-ES": ["qué", "dónde", "cuándo", "por qué", "cómo", "quién", "cuál", "es", "está", "puedo", "puede", "podría"],
  // Chinese question words can appear anywhere in a sentence (no leading
  // "does/is" the way English/Spanish structure questions), and yes/no
  // questions are marked with a trailing particle instead — matched
  // separately in classifyIntent, not via this prefix-style list.
  "zh-CN": ["什么", "哪里", "什么时候", "为什么", "怎么", "谁", "哪个", "多少"],
};

// Sentence-final particles that mark a yes/no or soft question in Chinese —
// there's no English/Spanish equivalent, so this only applies to zh-CN.
const ZH_QUESTION_PARTICLES = ["吗", "呢"];

const REQUEST_PHRASES: Record<Language, string[]> = {
  "en-US": ["i need", "i want", "i'd like", "i would like", "can you", "could you", "please", "help me"],
  "es-ES": ["necesito", "quiero", "me gustaría", "puedes", "podrías", "por favor", "ayúdame"],
  "zh-CN": ["我需要", "我想要", "我想", "你能不能", "你可以", "请", "帮我"],
};

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/g;
const DATE_WORDS: Record<Language, string[]> = {
  "en-US": ["today", "tomorrow", "tonight", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "next week"],
  "es-ES": ["hoy", "mañana", "esta noche", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo", "la próxima semana"],
  "zh-CN": ["今天", "明天", "今晚", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日", "下周"],
};
const DATE_NUMERIC_RE = /\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/g;

export function extractEntities(rawText: string, language: Language): Entities {
  const emails = [...new Set(rawText.match(EMAIL_RE) ?? [])];
  const phones = [...new Set((rawText.match(PHONE_RE) ?? []).map((p) => p.trim()).filter((p) => p.replace(/\D/g, "").length >= 7))];

  const lower = rawText.toLowerCase();
  const dateHits = new Set<string>();
  for (const word of DATE_WORDS[language]) {
    if (containsPhrase(lower, word)) dateHits.add(word);
  }
  for (const match of rawText.match(DATE_NUMERIC_RE) ?? []) {
    dateHits.add(match);
  }

  return { emails, phones, dates: [...dateHits] };
}

function normalize(text: string) {
  return text.trim().toLowerCase();
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const HAN_RE = /\p{Script=Han}/u;
const NUMERIC_RE = /^\d+$/;

// Word-boundary phrase match — plain `.includes()` false-positives on
// substrings inside other words (e.g. "hi" inside "shipped" or "this").
// \b doesn't work reliably across accented characters (dónde, mañana), so
// boundaries are defined as "not a letter/digit" instead of relying on \w.
//
// Chinese is the exception: it has no spaces between words at all, so a
// "not a letter" boundary almost never exists around a keyword embedded in
// a real sentence (Han characters are themselves \p{L}) — the boundary
// check would silently fail to match nearly every real Chinese utterance.
// A short 2-4 character keyword substring is the correct match strategy
// for Han text, not a bug the way plain .includes() was for English.
//
// Bare-numeral keywords (e.g. "500" for a budget bucket) need their own
// rule for the same reason: a number is very often written directly
// against a Han character with no space at all ("大概500元" — no space on
// either side of 500), so requiring a non-letter boundary would reject
// real matches. What actually matters for a numeral is not being embedded
// in a *longer number* (the original "500" inside "5000" bug), so its
// boundary only needs to reject an adjacent digit, not an adjacent letter.
export function containsPhrase(haystack: string, phrase: string) {
  if (HAN_RE.test(phrase)) {
    return haystack.includes(phrase);
  }
  if (NUMERIC_RE.test(phrase)) {
    const pattern = new RegExp(`(^|[^\\p{N}])${escapeRegExp(phrase)}($|[^\\p{N}])`, "u");
    return pattern.test(haystack);
  }
  const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(phrase)}($|[^\\p{L}\\p{N}])`, "iu");
  return pattern.test(haystack);
}

export function classifyIntent(rawText: string, language: Language): NluResult {
  const text = rawText.trim();
  const lower = normalize(text);
  const entities = extractEntities(text, language);

  if (!lower) {
    return { text, language, intent: "unknown", confidence: 0, matchedKeywords: [], entities };
  }

  const domainKeywords = KEYWORDS[language];

  // Greetings and goodbyes are short, high-signal utterances — check first.
  for (const intent of ["greeting", "goodbye"] as const) {
    const hits = domainKeywords[intent].filter((kw) => containsPhrase(lower, kw));
    if (hits.length > 0) {
      return { text, language, intent, confidence: 0.9, matchedKeywords: hits, entities };
    }
  }

  // Domain intents: booking, order status, billing, password reset, complaint.
  const domainOrder: (keyof typeof domainKeywords)[] = [
    "booking_scheduling",
    "order_status",
    "billing",
    "password_reset",
    "complaint",
  ];
  let bestDomain: { intent: Intent; hits: string[] } | null = null;
  for (const intent of domainOrder) {
    const hits = domainKeywords[intent].filter((kw) => containsPhrase(lower, kw));
    if (hits.length > 0 && (!bestDomain || hits.length > bestDomain.hits.length)) {
      bestDomain = { intent, hits };
    }
  }
  if (bestDomain) {
    const confidence = bestDomain.hits.length >= 2 ? 0.92 : 0.78;
    return { text, language, intent: bestDomain.intent, confidence, matchedKeywords: bestDomain.hits, entities };
  }

  // Question: question mark, or a language-appropriate question signal.
  // English/Spanish questions front-load the interrogative ("what is...",
  // "¿qué es...") so a leading-word check is the right heuristic. Chinese
  // question words can sit anywhere in the sentence, and yes/no questions
  // are marked by a trailing particle (吗/呢) instead of word order — see
  // containsPhrase's Han-script note above for why substring matching is
  // correct here rather than a bug.
  const questionHits =
    language === "zh-CN"
      ? [
          ...QUESTION_WORDS[language].filter((w) => containsPhrase(lower, w)),
          ...ZH_QUESTION_PARTICLES.filter((p) => text.trim().endsWith(p)),
        ]
      : QUESTION_WORDS[language].filter((w) => lower.startsWith(`${w} `) || lower === w);
  if (text.trim().endsWith("?") || text.trim().endsWith("？") || questionHits.length > 0) {
    const hits = text.trim().endsWith("?") || text.trim().endsWith("？") ? [...questionHits, "?"] : questionHits;
    return { text, language, intent: "question", confidence: 0.7, matchedKeywords: hits, entities };
  }

  // Generic request: imperative / desire phrasing without a specific domain match.
  const requestHits = REQUEST_PHRASES[language].filter((p) => containsPhrase(lower, p));
  if (requestHits.length > 0) {
    return { text, language, intent: "request", confidence: 0.6, matchedKeywords: requestHits, entities };
  }

  return { text, language, intent: "unknown", confidence: 0.3, matchedKeywords: [], entities };
}
