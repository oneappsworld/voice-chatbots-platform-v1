import type Stripe from "stripe";
import type { DailyVolume } from "@/lib/dashboard";

export function monthlyAmountCents(item: Pick<Stripe.SubscriptionItem, "price" | "quantity">): number {
  const price = item.price;
  if (!price?.unit_amount || !price.recurring) return 0;

  const monthlyFactor = price.recurring.interval === "year" ? 1 / 12 : 1;
  return (price.unit_amount * (item.quantity ?? 1) * monthlyFactor) / price.recurring.interval_count;
}

export function calculateMrrCents(activeSubscriptions: Stripe.Subscription[]): number {
  return activeSubscriptions.reduce(
    (sum, sub) => sum + sub.items.data.reduce((itemSum, item) => itemSum + monthlyAmountCents(item), 0),
    0
  );
}

/** Churn = cancellations in the window / (still-active + those cancellations) — the "who was at risk" denominator, not total signups ever. */
export function calculateChurnRate(activeCount: number, canceledInWindowCount: number): number {
  const denominator = activeCount + canceledInWindowCount;
  return denominator > 0 ? (canceledInWindowCount / denominator) * 100 : 0;
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Cumulative total-users curve for the last `days` days (a growth curve,
 * not a daily-new-signups bar chart — that already exists on
 * /admin/analytics for this project's own users). `referenceDate` defaults
 * to now but is overridable so this stays deterministic in tests.
 */
export function buildCumulativeGrowth(
  createdAt: Date[],
  days: number,
  referenceDate: Date = new Date()
): DailyVolume[] {
  const buckets: DailyVolume[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(referenceDate);
    d.setUTCDate(d.getUTCDate() - i);
    buckets.push({ date: dayKey(d), count: 0 });
  }

  const createdDayKeys = createdAt.map(dayKey);
  const windowStartKey = buckets[0].date;
  let running = createdDayKeys.filter((k) => k < windowStartKey).length;
  for (const bucket of buckets) {
    running += createdDayKeys.filter((k) => k === bucket.date).length;
    bucket.count = running;
  }
  return buckets;
}
