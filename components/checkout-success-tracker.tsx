"use client";

import { Suspense } from "react";
import { EventOnQueryParam } from "@/components/event-on-query-param";
import { trackSubscriptionConversion } from "@/lib/analytics";
import type { Plan } from "@/lib/plan-limits";

/** Fires subscription_conversion once when ?checkout=success is on the URL (the Stripe Checkout return redirect). */
export function CheckoutSuccessTracker({ plan }: { plan: Plan }) {
  return (
    <Suspense fallback={null}>
      <EventOnQueryParam param="checkout" value="success" onFire={() => trackSubscriptionConversion(plan)} />
    </Suspense>
  );
}
