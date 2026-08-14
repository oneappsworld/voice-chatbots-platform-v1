import { describe, it, expect } from "vitest";
import type Stripe from "stripe";
import { monthlyAmountCents, calculateMrrCents, calculateChurnRate, buildCumulativeGrowth } from "./launch-metrics";

function item(unitAmount: number | null, interval: "month" | "year", intervalCount = 1, quantity = 1) {
  return {
    quantity,
    price: unitAmount === null ? null : { unit_amount: unitAmount, recurring: { interval, interval_count: intervalCount } },
  } as unknown as Stripe.SubscriptionItem;
}

function subscription(items: Stripe.SubscriptionItem[]) {
  return { items: { data: items } } as unknown as Stripe.Subscription;
}

describe("monthlyAmountCents", () => {
  it("returns the price as-is for a monthly item", () => {
    expect(monthlyAmountCents(item(5000, "month"))).toBe(5000);
  });

  it("divides a yearly price by 12", () => {
    expect(monthlyAmountCents(item(120000, "year"))).toBe(10000);
  });

  it("multiplies by quantity", () => {
    expect(monthlyAmountCents(item(5000, "month", 1, 3))).toBe(15000);
  });

  it("divides by a multi-month interval_count", () => {
    expect(monthlyAmountCents(item(15000, "month", 3))).toBe(5000);
  });

  it("returns 0 for a missing price or non-recurring price", () => {
    expect(monthlyAmountCents(item(null, "month"))).toBe(0);
    expect(monthlyAmountCents({ quantity: 1, price: { unit_amount: 5000, recurring: null } } as unknown as Stripe.SubscriptionItem)).toBe(0);
  });
});

describe("calculateMrrCents", () => {
  it("sums monthly amounts across subscriptions and items", () => {
    const subs = [subscription([item(5000, "month")]), subscription([item(120000, "year"), item(2500, "month")])];
    expect(calculateMrrCents(subs)).toBe(5000 + 10000 + 2500);
  });

  it("returns 0 for no subscriptions", () => {
    expect(calculateMrrCents([])).toBe(0);
  });
});

describe("calculateChurnRate", () => {
  it("computes cancellations over (active + cancellations)", () => {
    expect(calculateChurnRate(95, 5)).toBe(5);
  });

  it("returns 0 when there's no active or canceled history", () => {
    expect(calculateChurnRate(0, 0)).toBe(0);
  });
});

describe("buildCumulativeGrowth", () => {
  const reference = new Date("2026-08-14T12:00:00.000Z");

  it("carries forward a running total that only grows on signup days", () => {
    const createdAt = [
      new Date("2026-08-10T00:00:00.000Z"),
      new Date("2026-08-12T00:00:00.000Z"),
      new Date("2026-08-12T23:00:00.000Z"),
      new Date("2026-08-14T00:00:00.000Z"),
    ];
    const buckets = buildCumulativeGrowth(createdAt, 5, reference);

    expect(buckets.map((b) => b.date)).toEqual(["2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13", "2026-08-14"]);
    expect(buckets.map((b) => b.count)).toEqual([1, 1, 3, 3, 4]);
  });

  it("includes signups from before the window in the first bucket's running total", () => {
    const createdAt = [new Date("2026-01-01T00:00:00.000Z"), new Date("2026-08-14T00:00:00.000Z")];
    const buckets = buildCumulativeGrowth(createdAt, 3, reference);

    expect(buckets.map((b) => b.count)).toEqual([1, 1, 2]);
  });

  it("returns all-zero buckets when there are no users yet", () => {
    const buckets = buildCumulativeGrowth([], 3, reference);
    expect(buckets.map((b) => b.count)).toEqual([0, 0, 0]);
  });
});
