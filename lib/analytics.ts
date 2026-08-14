// Thin wrapper over GA4 (window.gtag) and Plausible (window.plausible) so the
// rest of the app fires one call per event instead of knowing about either
// provider. Both are optional and independently configured via env vars —
// same "build ahead of credentials" pattern as this project's other
// integrations (Zendesk, ElevenLabs, Twilio): everything below is a no-op
// until a real Measurement ID / Plausible domain is set.

import type { BotType, Plan } from "@/lib/plan-limits";

export type SignUpMethod = "email" | "google";

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
export const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

export function isGaConfigured(): boolean {
  return Boolean(GA_MEASUREMENT_ID);
}

export function isPlausibleConfigured(): boolean {
  return Boolean(PLAUSIBLE_DOMAIN);
}

type EventProps = Record<string, string | number | boolean>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    plausible?: (eventName: string, options?: { props?: EventProps }) => void;
  }
}

/** Fires an event to whichever of GA4 / Plausible is loaded. Safe to call unconditionally — a no-op on the server or when neither provider is configured. */
export function trackEvent(name: string, props: EventProps = {}): void {
  if (typeof window === "undefined") return;
  window.gtag?.("event", name, props);
  window.plausible?.(name, { props });
}

export function trackPageview(path: string): void {
  trackEvent("page_view", { page_path: path });
}

export function trackSignUp(method: SignUpMethod): void {
  trackEvent("sign_up", { method });
}

export function trackFeatureUsage(bot: BotType): void {
  trackEvent("feature_usage", { bot });
}

export function trackSubscriptionConversion(plan: Plan): void {
  trackEvent("subscription_conversion", { plan });
}
