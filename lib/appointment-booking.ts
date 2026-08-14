// Appointment Booking Bot: a step-based conversation (service → time slot →
// name → contact) that lets a caller schedule a real row in the
// `appointments` table entirely by voice. Availability is computed, not
// stored — `generateSlots` walks the next weekdays at a few fixed hours and
// filters out whatever the account has already booked, so "double-booking"
// is actually prevented rather than just simulated.

import type { Language } from "@/lib/nlu";
import { containsPhrase, extractEntities } from "@/lib/nlu";

export type Service = { value: string; label: Record<Language, string>; keywords: Record<Language, string[]> };

export const SERVICES: Service[] = [
  {
    value: "consultation",
    label: { "en-US": "Consultation call", "es-ES": "Llamada de consulta", "zh-CN": "咨询电话" },
    keywords: { "en-US": ["consultation", "consult"], "es-ES": ["consulta", "consultoría"], "zh-CN": ["咨询", "顾问"] },
  },
  {
    value: "demo",
    label: { "en-US": "Product demo", "es-ES": "Demostración del producto", "zh-CN": "产品演示" },
    keywords: { "en-US": ["demo", "demonstration"], "es-ES": ["demostración", "demo"], "zh-CN": ["演示", "产品演示"] },
  },
  {
    value: "onboarding",
    label: { "en-US": "Onboarding session", "es-ES": "Sesión de incorporación", "zh-CN": "入职培训" },
    keywords: { "en-US": ["onboarding", "getting started", "setup session"], "es-ES": ["incorporación", "sesión de inicio", "configuración"], "zh-CN": ["入职", "上手", "入门培训", "初始设置"] },
  },
  {
    value: "support",
    label: { "en-US": "Support visit", "es-ES": "Visita de soporte", "zh-CN": "支持服务" },
    keywords: { "en-US": ["support", "help session", "troubleshooting"], "es-ES": ["soporte", "ayuda", "resolución de problemas"], "zh-CN": ["支持", "帮助", "故障排查"] },
  },
];

export function matchService(rawText: string, language: Language): Service | null {
  const lower = rawText.trim().toLowerCase();
  return SERVICES.find((s) => s.keywords[language].some((kw) => containsPhrase(lower, kw))) ?? null;
}

export type Slot = { iso: string; label: string; weekday: string; hour: number };

const BUSINESS_HOURS = [10, 13, 15];

/**
 * Next available weekday slots at fixed business hours, skipping whatever's
 * already booked (`bookedIso` — the account's existing `appointments.scheduled_at`
 * values). Starts tomorrow to avoid same-day past-hour edge cases.
 */
export function generateSlots(
  bookedIso: string[],
  language: Language,
  opts: { from?: Date; count?: number } = {}
): Slot[] {
  const count = opts.count ?? 6;
  const booked = new Set(bookedIso);
  const slots: Slot[] = [];

  const cursor = new Date(opts.from ?? new Date());
  cursor.setDate(cursor.getDate() + 1);
  cursor.setHours(0, 0, 0, 0);

  let daysChecked = 0;
  while (slots.length < count && daysChecked < 21) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) {
      for (const hour of BUSINESS_HOURS) {
        if (slots.length >= count) break;
        const dt = new Date(cursor);
        dt.setHours(hour, 0, 0, 0);
        const iso = dt.toISOString();
        if (!booked.has(iso)) {
          slots.push({
            iso,
            label: dt.toLocaleString(language, {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }),
            weekday: dt.toLocaleString(language, { weekday: "short" }).toLowerCase(),
            hour,
          });
        }
      }
    }
    cursor.setDate(cursor.getDate() + 1);
    daysChecked += 1;
  }

  return slots;
}

const ORDINAL_WORDS: Record<Language, string[]> = {
  "en-US": ["first", "second", "third", "fourth", "fifth", "sixth"],
  "es-ES": ["primero", "segundo", "tercero", "cuarto", "quinto", "sexto"],
  "zh-CN": ["第一个", "第二个", "第三个", "第四个", "第五个", "第六个"],
};

/** Matches a chip click (exact label) or freeform speech (ordinal, number, or weekday+hour) to one of the offered slots. */
export function matchSlot(slots: Slot[], rawText: string, language: Language): Slot | null {
  const lower = rawText.trim().toLowerCase();

  const labelHit = slots.find((s) => lower === s.label.toLowerCase() || lower.includes(s.label.toLowerCase()));
  if (labelHit) return labelHit;

  const ordinals = ORDINAL_WORDS[language];
  for (let i = 0; i < slots.length; i++) {
    if (containsPhrase(lower, ordinals[i]) || containsPhrase(lower, String(i + 1))) return slots[i];
  }

  return slots.find((s) => lower.includes(s.weekday) && lower.includes(String(s.hour))) ?? null;
}

export type ApptStep = "service" | "slot" | "name" | "contact" | "done";

export type ApptState = {
  step: ApptStep;
  service: Service | null;
  slot: Slot | null;
  customerName: string | null;
  contact: string | null;
};

export function initialApptState(): ApptState {
  return { step: "service", service: null, slot: null, customerName: null, contact: null };
}

const PROMPTS: Record<Language, Record<Exclude<ApptStep, "done">, string>> = {
  "en-US": {
    service: "Sure — what would you like to book: a consultation, a demo, onboarding, or a support visit?",
    slot: "Here are the next available times — pick one, or just say it.",
    name: "Great, what name should I put the booking under?",
    contact: "And what's the best email or phone number to send the confirmation to?",
  },
  "es-ES": {
    service: "Claro — ¿qué te gustaría reservar: una consulta, una demostración, incorporación o una visita de soporte?",
    slot: "Estos son los próximos horarios disponibles — elige uno, o dilo en voz alta.",
    name: "Perfecto, ¿a nombre de quién pongo la reserva?",
    contact: "¿Cuál es el mejor correo o número de teléfono para enviar la confirmación?",
  },
  "zh-CN": {
    service: "好的——您想预约什么服务：咨询、产品演示、入职培训，还是支持服务？",
    slot: "以下是最近可预约的时间——请选择一个，或直接说出来。",
    name: "好的，请问预约人姓名是？",
    contact: "最后，发送确认信息最好用哪个邮箱或电话号码？",
  },
};

const NO_SERVICE_MATCH: Record<Language, string> = {
  "en-US": "I didn't catch which service — try consultation, demo, onboarding, or support.",
  "es-ES": "No entendí bien el servicio — intenta con consulta, demostración, incorporación o soporte.",
  "zh-CN": "我没有听清您想预约哪种服务——请尝试说咨询、产品演示、入职培训或支持服务。",
};

const NO_SLOT_MATCH: Record<Language, string> = {
  "en-US": "I didn't catch which time — say the day and time, or pick one from the list.",
  "es-ES": "No entendí bien el horario — di el día y la hora, o elige uno de la lista.",
  "zh-CN": "我没有听清您选择的时间——请说出日期和时间，或从列表中选择一个。",
};

export type ApplyApptResult =
  | { ok: true; state: ApptState; nextPrompt: string | null; done: boolean }
  | { ok: false; state: ApptState; error: string };

export function applyApptAnswer(
  state: ApptState,
  rawText: string,
  language: Language,
  ctx: { slots?: Slot[] } = {}
): ApplyApptResult {
  if (state.step === "done") return { ok: true, state, nextPrompt: null, done: true };

  if (state.step === "service") {
    const service = matchService(rawText, language);
    if (!service) return { ok: false, state, error: NO_SERVICE_MATCH[language] };
    const next: ApptState = { ...state, service, step: "slot" };
    return { ok: true, state: next, nextPrompt: PROMPTS[language].slot, done: false };
  }

  if (state.step === "slot") {
    const slot = matchSlot(ctx.slots ?? [], rawText, language);
    if (!slot) return { ok: false, state, error: NO_SLOT_MATCH[language] };
    const next: ApptState = { ...state, slot, step: "name" };
    return { ok: true, state: next, nextPrompt: PROMPTS[language].name, done: false };
  }

  if (state.step === "name") {
    const name = rawText.trim();
    const next: ApptState = { ...state, customerName: name, step: "contact" };
    return { ok: true, state: next, nextPrompt: PROMPTS[language].contact, done: false };
  }

  // contact
  const entities = extractEntities(rawText, language);
  const contact = entities.emails[0] ?? entities.phones[0] ?? rawText.trim();
  const next: ApptState = { ...state, contact, step: "done" };
  return { ok: true, state: next, nextPrompt: null, done: true };
}

export function apptPrompt(step: Exclude<ApptStep, "done">, language: Language): string {
  return PROMPTS[language][step];
}

export function confirmationMessage(state: ApptState, language: Language): string {
  const serviceLabel = state.service?.label[language] ?? "";
  const slotLabel = state.slot?.label ?? "";
  if (language === "en-US") {
    return `You're all set, ${state.customerName}! Your ${serviceLabel.toLowerCase()} is booked for ${slotLabel}, and we'll send confirmation to ${state.contact}.`;
  }
  if (language === "es-ES") {
    return `¡Listo, ${state.customerName}! Tu ${serviceLabel.toLowerCase()} está reservada para el ${slotLabel}, y enviaremos la confirmación a ${state.contact}.`;
  }
  return `太好了，${state.customerName}！您的${serviceLabel}已预约在${slotLabel}，确认信息将发送至${state.contact}。`;
}
