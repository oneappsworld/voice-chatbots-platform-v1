// Human Handoff & Escalation: shared trigger detection + context summary,
// used by every bot (FAQ, Order Status, Lead Qualification, Appointment
// Booking) so "can't resolve this, get me a person" behaves the same way
// everywhere. Pure functions — no DB/network — the actual handoff record is
// written by the `escalateToHuman` server action once a trigger fires.

import { classifyIntent, containsPhrase, type Language } from "@/lib/nlu";

export type EscalationReason = "explicit_request" | "strong_complaint" | "repeated_confusion";

export type EscalationCheck =
  | { trigger: false }
  | { trigger: true; reason: EscalationReason };

const EXPLICIT_PHRASES: Record<Language, string[]> = {
  "en-US": [
    "talk to a human",
    "speak to a human",
    "talk to a person",
    "speak to a person",
    "real person",
    "human agent",
    "live agent",
    "talk to someone",
    "speak to someone",
    "representative",
    "talk to a rep",
    "connect me to an agent",
    "get me a manager",
    "speak to a manager",
  ],
  "es-ES": [
    "hablar con una persona",
    "hablar con un humano",
    "persona real",
    "agente humano",
    "agente en vivo",
    "hablar con alguien",
    "representante",
    "hablar con un representante",
    "conectarme con un agente",
    "hablar con un gerente",
    "hablar con un supervisor",
  ],
  "zh-CN": [
    "转人工",
    "找人工",
    "人工客服",
    "找客服",
    "跟人说话",
    "真人客服",
    "转接人工",
    "找经理",
    "找主管",
    "人工坐席",
  ],
};

function normalize(text: string) {
  return text.trim().toLowerCase();
}

export type EscalationSensitivity = "low" | "normal" | "high";

/** Higher sensitivity escalates after fewer repeated failures. Set org-wide from Admin Settings. */
export function sensitivityToThreshold(sensitivity: EscalationSensitivity): number {
  return sensitivity === "high" ? 1 : sensitivity === "low" ? 3 : 2;
}

/**
 * Checks a single utterance for an escalation trigger. `consecutiveUnknown`
 * lets a caller pass how many turns in a row the NLU has failed to classify
 * anything useful, so repeated confusion escalates even without a magic
 * phrase — the same pattern a caller pressing "0" over and over signals.
 * `threshold` (default 2) is how many such failures it takes — configurable
 * org-wide via org_settings.escalation_sensitivity.
 */
export function checkEscalation(
  text: string,
  language: Language,
  opts: { consecutiveUnknown?: number; threshold?: number } = {}
): EscalationCheck {
  const lower = normalize(text);

  const explicitHit = EXPLICIT_PHRASES[language].some((phrase) => containsPhrase(lower, phrase));
  if (explicitHit) return { trigger: true, reason: "explicit_request" };

  const nlu = classifyIntent(text, language);
  const strongComplaint =
    nlu.intent === "complaint" &&
    (nlu.matchedKeywords.some((k) =>
      [
        "angry", "frustrated", "terrible", "worst", "unacceptable",
        "enojado", "enojada", "frustrado", "frustrada", "inaceptable",
        "生气", "沮丧", "太差了", "无法接受",
      ].includes(k)
    ) ||
      nlu.matchedKeywords.length >= 2);
  if (strongComplaint) return { trigger: true, reason: "strong_complaint" };

  if ((opts.consecutiveUnknown ?? 0) >= (opts.threshold ?? 2)) {
    return { trigger: true, reason: "repeated_confusion" };
  }

  return { trigger: false };
}

const REASON_LABEL: Record<Language, Record<EscalationReason, string>> = {
  "en-US": {
    explicit_request: "Caller asked to speak with a human agent.",
    strong_complaint: "Caller expressed strong frustration the bot couldn't resolve.",
    repeated_confusion: "Bot failed to understand the caller after multiple attempts.",
  },
  "es-ES": {
    explicit_request: "El interlocutor pidió hablar con un agente humano.",
    strong_complaint: "El interlocutor expresó frustración que el bot no pudo resolver.",
    repeated_confusion: "El bot no logró entender al interlocutor tras varios intentos.",
  },
  "zh-CN": {
    explicit_request: "来电者要求转接人工客服。",
    strong_complaint: "来电者表达了强烈的不满，机器人无法解决。",
    repeated_confusion: "机器人多次尝试后仍未能理解来电者的意思。",
  },
};

export function reasonLabel(reason: EscalationReason, language: Language): string {
  return REASON_LABEL[language][reason];
}

export type TranscriptTurn = { who: "user" | "bot"; text: string };

/**
 * Builds a short human-readable brief of the conversation so far — this is
 * the "context passed during handoff" a live agent sees instead of asking
 * the caller to repeat everything. Keeps the last few turns verbatim plus
 * any entities the bot already extracted (email/phone/dates), since those
 * are exactly what a human agent needs to pick the conversation up.
 */
export function buildContextSummary(
  turns: TranscriptTurn[],
  language: Language,
  extra?: { botName?: string; collected?: Record<string, string | undefined> }
): string {
  const lastTurns = turns.slice(-6);
  const lines: string[] = [];

  const T = {
    "en-US": { escalatedFrom: "Escalated from:", collected: "Details collected so far: ", recent: "Recent conversation:", caller: "Caller" },
    "es-ES": { escalatedFrom: "Escalado desde:", collected: "Detalles recopilados hasta ahora: ", recent: "Conversación reciente:", caller: "Interlocutor" },
    "zh-CN": { escalatedFrom: "转接来自：", collected: "目前收集到的信息：", recent: "最近的对话：", caller: "来电者" },
  }[language];

  if (extra?.botName) {
    lines.push(`${T.escalatedFrom} ${extra.botName}`);
  }

  const collectedEntries = Object.entries(extra?.collected ?? {}).filter(([, v]) => v);
  if (collectedEntries.length > 0) {
    lines.push(T.collected + collectedEntries.map(([k, v]) => `${k}: ${v}`).join(", "));
  }

  lines.push(T.recent);
  for (const t of lastTurns) {
    const speaker = t.who === "user" ? T.caller : "Bot";
    lines.push(`${speaker}: ${t.text}`);
  }

  return lines.join("\n");
}

const AGENT_POOL: Record<Language, string[]> = {
  "en-US": ["Jordan", "Priya", "Marcus", "Elena", "Sam"],
  "es-ES": ["Jordan", "Priya", "Marcus", "Elena", "Sam"],
  "zh-CN": ["Jordan", "Priya", "Marcus", "Elena", "Sam"],
};

/** Simulated round-robin agent assignment — no real agent pool/queue exists yet. */
export function pickSimulatedAgent(language: Language): string {
  const pool = AGENT_POOL[language];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function handoffMessage(agentName: string, reason: EscalationReason, language: Language): string {
  const reasonText = reasonLabel(reason, language);
  if (language === "en-US") {
    return `No problem — connecting you to a live agent now. ${reasonText} ${agentName} will pick up with full context from our conversation, so you won't need to repeat yourself.`;
  }
  if (language === "es-ES") {
    return `Sin problema — te estoy conectando con un agente en vivo. ${reasonText} ${agentName} continuará con todo el contexto de nuestra conversación, así que no tendrás que repetir nada.`;
  }
  return `没问题——现在为您转接人工客服。${reasonText}${agentName} 会接手并了解我们对话的完整背景，您无需重复之前说过的内容。`;
}
