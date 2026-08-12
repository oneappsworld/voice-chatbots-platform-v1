import { describe, it, expect } from "vitest";
import { generateSlots, matchSlot, matchService } from "./appointment-booking";

describe("generateSlots", () => {
  it("never generates a slot on a Saturday or Sunday", () => {
    const slots = generateSlots([], "en-US", { count: 20 });
    for (const slot of slots) {
      const day = new Date(slot.iso).getDay();
      expect(day).not.toBe(0);
      expect(day).not.toBe(6);
    }
  });

  it("excludes a slot that's already booked", () => {
    // Start from a fixed Monday so the first generated slot is deterministic.
    const monday = new Date("2026-08-17T00:00:00Z"); // a Monday
    const withoutBooking = generateSlots([], "en-US", { from: monday, count: 1 });
    expect(withoutBooking).toHaveLength(1);

    const firstSlotIso = withoutBooking[0].iso;
    const withBooking = generateSlots([firstSlotIso], "en-US", { from: monday, count: 1 });
    expect(withBooking[0].iso).not.toBe(firstSlotIso);
  });

  it("generates the requested number of slots", () => {
    const slots = generateSlots([], "en-US", { count: 3 });
    expect(slots).toHaveLength(3);
  });
});

describe("matchSlot", () => {
  const slots = generateSlots([], "en-US", { from: new Date("2026-08-17T00:00:00Z"), count: 3 });

  it("matches a slot by its exact label (chip click)", () => {
    const match = matchSlot(slots, slots[1].label, "en-US");
    expect(match?.iso).toBe(slots[1].iso);
  });

  it("matches a slot by ordinal word (voice input)", () => {
    const match = matchSlot(slots, "let's do the second one", "en-US");
    expect(match?.iso).toBe(slots[1].iso);
  });

  it("returns null when nothing matches", () => {
    const match = matchSlot(slots, "next Tuesday sometime maybe", "en-US");
    expect(match).toBeNull();
  });
});

describe("matchService", () => {
  it("matches 'demo' without false-matching an unrelated service", () => {
    expect(matchService("I'd like a product demo", "en-US")?.value).toBe("demo");
  });

  it("matches consultation", () => {
    expect(matchService("book a consultation call", "en-US")?.value).toBe("consultation");
  });

  it("returns null for unrecognized service text", () => {
    expect(matchService("something completely unrelated", "en-US")).toBeNull();
  });
});
