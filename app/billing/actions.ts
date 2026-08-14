"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { stripe, PLAN_PRICE_IDS } from "@/lib/stripe";
import type { Plan } from "@/lib/plan-limits";

async function requireOrg() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.organization_id) throw new Error("No organization found.");

  const { data: org } = await supabase
    .from("organizations")
    .select("id, stripe_customer_id, stripe_subscription_id")
    .eq("id", profile.organization_id)
    .maybeSingle();
  if (!org) throw new Error("No organization found.");

  return { user, organizationId: org.id as string, stripeCustomerId: org.stripe_customer_id as string | null, hasExistingSubscription: Boolean(org.stripe_subscription_id) };
}

async function siteOrigin() {
  const h = await headers();
  const host = h.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

export async function createCheckoutSession(plan: Plan): Promise<{ url: string } | { error: string }> {
  const { user, organizationId, stripeCustomerId, hasExistingSubscription } = await requireOrg();
  const origin = await siteOrigin();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: PLAN_PRICE_IDS[plan], quantity: 1 }],
      // This test-mode account has Managed Payments on by default, which
      // requires every product to carry a tax_code — see
      // reference_stripe_new_account_gotcha in project memory. Disabling it
      // per-session avoids retagging the existing Starter/Pro products.
      managed_payments: { enabled: false },
      client_reference_id: organizationId,
      ...(stripeCustomerId ? { customer: stripeCustomerId } : { customer_email: user.email }),
      subscription_data: {
        ...(hasExistingSubscription ? {} : { trial_period_days: 14 }),
        metadata: { organization_id: organizationId, plan },
      },
      metadata: { organization_id: organizationId, plan },
      success_url: `${origin}/billing?checkout=success`,
      cancel_url: `${origin}/billing?checkout=cancelled`,
    });

    if (!session.url) return { error: "Could not start checkout." };
    return { url: session.url };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not start checkout." };
  }
}

export async function createPortalSession(): Promise<{ url: string } | { error: string }> {
  const { stripeCustomerId } = await requireOrg();
  if (!stripeCustomerId) return { error: "No billing account yet — start a checkout first." };
  const origin = await siteOrigin();

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${origin}/billing`,
    });
    return { url: session.url };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not open billing portal." };
  }
}
