import type { SupabaseClient } from "@supabase/supabase-js";
import { extractEntities } from "@/lib/nlu";

/** Splits a raw contact string (could be either) into a classified email/phone pair. */
export function classifyContact(raw: string): { email: string | null; phone: string | null } {
  const entities = extractEntities(raw, "en-US");
  return { email: entities.emails[0] ?? null, phone: entities.phones[0] ?? null };
}

/**
 * Upserts a customer record for this org, matched by email when known,
 * else by phone. Called whenever a lead or appointment captures a real
 * caller identity — see saveLead/bookAppointment in app/bots/actions.ts.
 * No-ops if neither identifier is present (nothing to match on).
 */
export async function upsertCustomer(
  supabase: SupabaseClient,
  organizationId: string,
  info: { email?: string | null; phone?: string | null; name?: string | null }
): Promise<void> {
  const email = info.email?.trim().toLowerCase() || null;
  const phone = info.phone?.trim() || null;
  if (!email && !phone) return;

  const query = supabase.from("customers").select("id, name").eq("organization_id", organizationId);
  const { data: existing } = email
    ? await query.eq("email", email).maybeSingle()
    : await query.eq("phone", phone).maybeSingle();

  if (existing) {
    await supabase
      .from("customers")
      .update({
        ...(email ? { email } : {}),
        ...(phone ? { phone } : {}),
        ...(info.name && !existing.name ? { name: info.name } : {}),
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    return;
  }

  await supabase.from("customers").insert({
    organization_id: organizationId,
    email,
    phone,
    name: info.name ?? null,
  });
}
