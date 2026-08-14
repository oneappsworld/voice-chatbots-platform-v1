import Stripe from "stripe";
import type { Plan } from "@/lib/plan-limits";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const PLAN_PRICE_IDS: Record<Plan, string> = {
  starter: process.env.STRIPE_PRICE_STARTER!,
  pro: process.env.STRIPE_PRICE_PRO!,
};

export function planForPriceId(priceId: string | null | undefined): Plan | null {
  if (priceId === PLAN_PRICE_IDS.starter) return "starter";
  if (priceId === PLAN_PRICE_IDS.pro) return "pro";
  return null;
}
