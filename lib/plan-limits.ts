export type Plan = "starter" | "pro";

export type BotType = "faq" | "order_status" | "appointment_booking" | "lead_qualification";

export const PLAN_LIMITS: Record<Plan, { maxCallsPerMonth: number; bots: BotType[] }> = {
  starter: {
    maxCallsPerMonth: 1000,
    bots: ["faq", "order_status", "appointment_booking"],
  },
  pro: {
    maxCallsPerMonth: 6000,
    bots: ["faq", "order_status", "appointment_booking", "lead_qualification"],
  },
};

export function planIncludesBot(plan: Plan, bot: BotType): boolean {
  return PLAN_LIMITS[plan].bots.includes(bot);
}
