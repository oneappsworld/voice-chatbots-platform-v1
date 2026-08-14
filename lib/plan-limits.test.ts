import { describe, it, expect } from "vitest";
import { PLAN_LIMITS, planIncludesBot } from "./plan-limits";

describe("planIncludesBot", () => {
  it("starter includes FAQ, Order Status, and Appointment Booking", () => {
    expect(planIncludesBot("starter", "faq")).toBe(true);
    expect(planIncludesBot("starter", "order_status")).toBe(true);
    expect(planIncludesBot("starter", "appointment_booking")).toBe(true);
  });

  it("starter excludes Lead Qualification", () => {
    expect(planIncludesBot("starter", "lead_qualification")).toBe(false);
  });

  it("pro includes all four bots", () => {
    for (const bot of PLAN_LIMITS.pro.bots) {
      expect(planIncludesBot("pro", bot)).toBe(true);
    }
    expect(PLAN_LIMITS.pro.bots).toHaveLength(4);
  });

  it("pro's call cap is higher than starter's", () => {
    expect(PLAN_LIMITS.pro.maxCallsPerMonth).toBeGreaterThan(PLAN_LIMITS.starter.maxCallsPerMonth);
  });
});
