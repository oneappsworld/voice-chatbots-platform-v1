// Lead Qualification Bot: a small step-based conversation state machine
// built on top of the foundational NLU engine (entity extraction for email).
// Gathers the fields a sales rep actually needs — who, company, team size,
// use case, budget, timeline — then scores fit so the bot can "route" the
// prospect (qualified/nurture/disqualified) instead of just logging a
// transcript. State is plain data so it can live in client React state; the
// only DB write happens once, on completion (see `saveLead` server action).

import type { Language } from "@/lib/nlu";
import { containsPhrase, extractEntities } from "@/lib/nlu";

export type LeadField = "name" | "company" | "team_size" | "use_case" | "budget" | "timeline" | "email";

export const LEAD_STEPS: LeadField[] = ["name", "company", "team_size", "use_case", "budget", "timeline", "email"];

export type LeadAnswers = Partial<Record<LeadField, string>>;

export type LeadState = {
  step: LeadField | "done";
  answers: LeadAnswers;
};

export function initialLeadState(): LeadState {
  return { step: "name", answers: {} };
}

type BucketOption = { value: string; points: number; label: Record<Language, string>; keywords: Record<Language, string[]> };

export const TEAM_SIZE_OPTIONS: BucketOption[] = [
  { value: "solo", points: 1, label: { "en-US": "Just me", "es-ES": "Solo yo", "zh-CN": "只有我" }, keywords: { "en-US": ["just me", "solo", "one person", "myself"], "es-ES": ["solo yo", "una persona"], "zh-CN": ["只有我", "一个人", "我自己"] } },
  { value: "small", points: 1, label: { "en-US": "2–10 people", "es-ES": "2–10 personas", "zh-CN": "2-10人" }, keywords: { "en-US": ["2", "10", "small team", "few people"], "es-ES": ["2", "10", "equipo pequeño"], "zh-CN": ["2", "10", "小团队", "几个人"] } },
  { value: "medium", points: 2, label: { "en-US": "11–50 people", "es-ES": "11–50 personas", "zh-CN": "11-50人" }, keywords: { "en-US": ["11", "50", "medium"], "es-ES": ["11", "50", "mediano"], "zh-CN": ["11", "50", "中型"] } },
  { value: "large", points: 2, label: { "en-US": "50+ people", "es-ES": "50+ personas", "zh-CN": "50人以上" }, keywords: { "en-US": ["50+", "large", "enterprise", "hundreds"], "es-ES": ["50+", "grande", "empresa grande", "cientos"], "zh-CN": ["50人以上", "大型", "企业", "上百人"] } },
];

export const BUDGET_OPTIONS: BucketOption[] = [
  { value: "under_500", points: 0, label: { "en-US": "Under $500/mo", "es-ES": "Menos de $500/mes", "zh-CN": "每月500美元以下" }, keywords: { "en-US": ["under 500", "less than 500", "no budget", "not much"], "es-ES": ["menos de 500", "sin presupuesto"], "zh-CN": ["500以下", "没有预算", "不多"] } },
  { value: "500_2k", points: 1, label: { "en-US": "$500–$2,000/mo", "es-ES": "$500–$2,000/mes", "zh-CN": "每月500-2000美元" }, keywords: { "en-US": ["500", "1000", "1500", "2000", "2k"], "es-ES": ["500", "1000", "1500", "2000"], "zh-CN": ["500", "1000", "1500", "2000"] } },
  { value: "2k_10k", points: 2, label: { "en-US": "$2,000–$10,000/mo", "es-ES": "$2,000–$10,000/mes", "zh-CN": "每月2000-10000美元" }, keywords: { "en-US": ["2000", "5000", "10000", "10k"], "es-ES": ["2000", "5000", "10000"], "zh-CN": ["2000", "5000", "10000"] } },
  { value: "10k_plus", points: 3, label: { "en-US": "$10,000+/mo", "es-ES": "$10,000+/mes", "zh-CN": "每月10000美元以上" }, keywords: { "en-US": ["10000+", "10k+", "big budget", "flexible budget"], "es-ES": ["10000+", "presupuesto grande", "presupuesto flexible"], "zh-CN": ["10000以上", "预算充足", "预算灵活"] } },
];

export const TIMELINE_OPTIONS: BucketOption[] = [
  { value: "immediate", points: 3, label: { "en-US": "Ready now / this month", "es-ES": "Listo ahora / este mes", "zh-CN": "现在就要 / 本月内" }, keywords: { "en-US": ["now", "this month", "asap", "immediately", "ready now"], "es-ES": ["ahora", "este mes", "inmediatamente", "lo antes posible"], "zh-CN": ["现在", "本月", "尽快", "立即", "马上"] } },
  { value: "quarter", points: 2, label: { "en-US": "This quarter", "es-ES": "Este trimestre", "zh-CN": "本季度" }, keywords: { "en-US": ["this quarter", "few months", "next few months"], "es-ES": ["este trimestre", "próximos meses"], "zh-CN": ["本季度", "几个月内", "接下来几个月"] } },
  { value: "half_year", points: 1, label: { "en-US": "Next 6 months", "es-ES": "Próximos 6 meses", "zh-CN": "未来6个月" }, keywords: { "en-US": ["6 months", "half year", "later this year"], "es-ES": ["6 meses", "medio año", "más adelante este año"], "zh-CN": ["6个月", "半年", "今年晚些时候"] } },
  { value: "exploring", points: 0, label: { "en-US": "Just exploring", "es-ES": "Solo explorando", "zh-CN": "只是了解一下" }, keywords: { "en-US": ["just looking", "exploring", "no rush", "not sure yet"], "es-ES": ["solo mirando", "explorando", "sin prisa", "no estoy seguro"], "zh-CN": ["随便看看", "了解一下", "不着急", "还不确定"] } },
];

// Word-boundary matching, not raw substring — otherwise a keyword like "500"
// false-positives inside "5000" and buckets a $5k/mo budget as under $2k.
function matchBucket(options: BucketOption[], rawText: string, language: Language): BucketOption | null {
  const lower = rawText.trim().toLowerCase();
  for (const opt of options) {
    for (const kw of opt.keywords[language]) {
      if (containsPhrase(lower, kw.toLowerCase())) return opt;
    }
  }
  return null;
}

const PROMPTS: Record<Language, Record<LeadField, string>> = {
  "en-US": {
    name: "I'd love to learn more about what you're looking for. What's your name?",
    company: `Nice to meet you! What company are you with?`,
    team_size: "Roughly how big is your team?",
    use_case: "What would you mainly use a voice AI assistant for?",
    budget: "What's your rough monthly budget for something like this?",
    timeline: "And when are you hoping to get started?",
    email: "Last thing — what's the best email to send details to?",
  },
  "es-ES": {
    name: "Me encantaría saber más sobre lo que buscas. ¿Cuál es tu nombre?",
    company: "¡Un placer! ¿Con qué empresa trabajas?",
    team_size: "¿Aproximadamente qué tamaño tiene tu equipo?",
    use_case: "¿Para qué usarías principalmente un asistente de voz con IA?",
    budget: "¿Cuál es tu presupuesto mensual aproximado para algo así?",
    timeline: "¿Y cuándo esperas empezar?",
    email: "Última cosa — ¿cuál es el mejor correo para enviarte los detalles?",
  },
  "zh-CN": {
    name: "很高兴了解您的需求，请问您怎么称呼？",
    company: "很高兴认识您！请问您在哪家公司工作？",
    team_size: "您的团队大概有多少人？",
    use_case: "您主要想用语音AI助手做什么？",
    budget: "您每月大概的预算是多少？",
    timeline: "您希望什么时候开始？",
    email: "最后一个问题——发送详情最好用哪个邮箱？",
  },
};

export function leadPrompt(step: LeadField, language: Language): string {
  return PROMPTS[language][step];
}

export function optionsForStep(step: LeadField): BucketOption[] | null {
  if (step === "team_size") return TEAM_SIZE_OPTIONS;
  if (step === "budget") return BUDGET_OPTIONS;
  if (step === "timeline") return TIMELINE_OPTIONS;
  return null;
}

function nextField(step: LeadField): LeadField | "done" {
  const idx = LEAD_STEPS.indexOf(step);
  return idx >= 0 && idx < LEAD_STEPS.length - 1 ? LEAD_STEPS[idx + 1] : "done";
}

export type ApplyLeadResult = {
  state: LeadState;
  nextPrompt: string | null;
  done: boolean;
};

export function applyLeadAnswer(state: LeadState, rawText: string, language: Language): ApplyLeadResult {
  if (state.step === "done") return { state, nextPrompt: null, done: true };

  const field = state.step;
  let value = rawText.trim();

  if (field === "email") {
    const entities = extractEntities(rawText, language);
    if (entities.emails.length > 0) value = entities.emails[0];
  } else {
    const options = optionsForStep(field);
    if (options) {
      const bucket = matchBucket(options, rawText, language);
      if (bucket) value = bucket.value;
    }
  }

  const answers: LeadAnswers = { ...state.answers, [field]: value };
  const step = nextField(field);
  const done = step === "done";

  return {
    state: { step, answers },
    nextPrompt: done ? null : leadPrompt(step, language),
    done,
  };
}

export type LeadQualification = "qualified" | "nurture" | "disqualified";

export function scoreLead(answers: LeadAnswers): { score: number; qualification: LeadQualification } {
  let score = 0;
  if (answers.name) score += 1;
  if (answers.company) score += 1;
  if (answers.use_case) score += 1;

  const teamOpt = TEAM_SIZE_OPTIONS.find((o) => o.value === answers.team_size);
  score += teamOpt ? teamOpt.points : answers.team_size ? 1 : 0;

  const budgetOpt = BUDGET_OPTIONS.find((o) => o.value === answers.budget);
  score += budgetOpt ? budgetOpt.points : answers.budget ? 1 : 0;

  const timelineOpt = TIMELINE_OPTIONS.find((o) => o.value === answers.timeline);
  score += timelineOpt ? timelineOpt.points : answers.timeline ? 1 : 0;

  const qualification: LeadQualification = score >= 7 ? "qualified" : score >= 3 ? "nurture" : "disqualified";
  return { score, qualification };
}

const CLOSING: Record<Language, Record<LeadQualification, string>> = {
  "en-US": {
    qualified:
      "You're a great fit — I'm routing you straight to a sales rep who'll reach out shortly with next steps.",
    nurture:
      "Thanks for sharing all that! I'll pass your details to our team, and we'll follow up with resources that fit where you're at.",
    disqualified:
      "Thanks for the details. This doesn't look like a strong fit for us right now, but I've saved your info in case that changes.",
  },
  "es-ES": {
    qualified:
      "Encajas muy bien — te estoy enviando directamente a un representante de ventas que te contactará en breve con los próximos pasos.",
    nurture:
      "¡Gracias por compartir todo eso! Pasaré tus datos a nuestro equipo y te enviaremos recursos que se ajusten a tu situación.",
    disqualified:
      "Gracias por los detalles. Esto no parece encajar bien con nosotros por ahora, pero guardé tu información por si eso cambia.",
  },
  "zh-CN": {
    qualified: "您非常符合条件——我将直接为您转接销售代表，他们会尽快联系您并说明后续步骤。",
    nurture: "感谢您提供的信息！我会把您的资料转交给我们团队，我们会根据您的情况提供合适的资源。",
    disqualified: "感谢您提供的详细信息。目前看来暂时不太匹配，但我已保存您的信息，以备将来有变化。",
  },
};

export function closingMessage(qualification: LeadQualification, language: Language): string {
  return CLOSING[language][qualification];
}
