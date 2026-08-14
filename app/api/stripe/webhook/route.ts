import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { stripe, planForPriceId } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Stripe calls this route directly (no user session) — the signature check
 * below is the only authentication, which is why writes here go through
 * the service-role client instead of the usual RLS-gated per-user client.
 * See lib/supabase/service.ts for why that's safe specifically in this
 * signature-verified context and nowhere else.
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = createServiceClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const organizationId = session.client_reference_id;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      const plan = session.metadata?.plan === "pro" ? "pro" : "starter";
      if (!organizationId || !customerId || !subscriptionId) break;

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      await supabase
        .from("organizations")
        .update({
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          plan,
          subscription_status: subscription.status,
        })
        .eq("id", organizationId);
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
      const priceId = subscription.items.data[0]?.price.id;
      const plan = planForPriceId(priceId);

      await supabase
        .from("organizations")
        .update({
          stripe_subscription_id: subscription.id,
          subscription_status: subscription.status,
          ...(plan ? { plan } : {}),
        })
        .eq("stripe_customer_id", customerId);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

      await supabase
        .from("organizations")
        .update({ subscription_status: "canceled" })
        .eq("stripe_customer_id", customerId);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (!customerId) break;

      await supabase
        .from("organizations")
        .update({ subscription_status: "past_due" })
        .eq("stripe_customer_id", customerId);
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
