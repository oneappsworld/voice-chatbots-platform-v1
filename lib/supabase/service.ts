import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client — bypasses RLS entirely. Only ever import this in
 * server-only code that is itself gated by a strong, independent proof of
 * authenticity (e.g. a verified Stripe webhook signature), never in a
 * Server Action reachable by a signed-in user's own request. Every other
 * privileged write in this app goes through a signature/auth-gated route
 * plus a scoped SECURITY DEFINER function instead — reach for this only
 * when there is no request-bound user to authenticate as, which is exactly
 * the Stripe webhook's situation.
 */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
