"use client";

import { Suspense } from "react";
import { EventOnQueryParam } from "@/components/event-on-query-param";
import { trackSignUp, type SignUpMethod } from "@/lib/analytics";

/** Fires the sign_up event once when ?new_signup=1 is on the URL — used by the /auth/callback Google OAuth redirect, since a brand-new OAuth account has no client-side moment of its own to fire from. */
export function SignUpTracker({ method }: { method: SignUpMethod }) {
  return (
    <Suspense fallback={null}>
      <EventOnQueryParam param="new_signup" value="1" onFire={() => trackSignUp(method)} />
    </Suspense>
  );
}
