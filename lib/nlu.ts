// Foundational rule-based NLU: intent classification + entity extraction.
// Pure functions, no external dependencies — this is the backbone every
// voice-driven interaction runs through after speech-to-text produces a
// transcript. Structured so a future LLM-backed classifier can be swapped
// in behind the same `classifyIntent` signature without touching callers.

export type Language = "en-US" | "es-ES";

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
};

const QUESTION_WORDS: Record<Language, string[]> = {
  "en-US": ["what", "where", "when", "why", "how", "who", "which", "is", "are", "do", "does", "can", "could", "would", "will"],
  "es-ES": ["qué", "dónde", "cuándo", "por qué", "cómo", "quién", "cuál", "es", "está", "puedo", "puede", "podría"],
};

const REQUEST_PHRASES: Record<Language, string[]> = {
  "en-US": ["i need", "i want", "i'd like", "i would like", "can you", "could you", "please", "help me"],
  "es-ES": ["necesito", "quiero", "me gustaría", "puedes", "podrías", "por favor", "ayúdame"],
};

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/g;
const DATE_WORDS: Record<Language, string[]> = {
  "en-US": ["today", "tomorrow", "tonight", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "next week"],
  "es-ES": ["hoy", "mañana", "esta noche", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo", "la próxima semana"],
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

// Word-boundary phrase match — plain `.includes()` false-positives on
// substrings inside other words (e.g. "hi" inside "shipped" or "this").
// \b doesn't work reliably across accented characters (dónde, mañana), so
// boundaries are defined as "not a letter/digit" instead of relying on \w.
export function containsPhrase(haystack: string, phrase: string) {
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

  // Question: question mark or a leading/contained question word.
  const questionHits = QUESTION_WORDS[language].filter(
    (w) => lower.startsWith(`${w} `) || lower === w
  );
  if (text.trim().endsWith("?") || questionHits.length > 0) {
    const hits = text.trim().endsWith("?") ? [...questionHits, "?"] : questionHits;
    return { text, language, intent: "question", confidence: 0.7, matchedKeywords: hits, entities };
  }

  // Generic request: imperative / desire phrasing without a specific domain match.
  const requestHits = REQUEST_PHRASES[language].filter((p) => containsPhrase(lower, p));
  if (requestHits.length > 0) {
    return { text, language, intent: "request", confidence: 0.6, matchedKeywords: requestHits, entities };
  }

  return { text, language, intent: "unknown", confidence: 0.3, matchedKeywords: [], entities };
}
