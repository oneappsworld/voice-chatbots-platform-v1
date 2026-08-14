import { describe, it, expect } from "vitest";
import { generateSlots, matchSlot, matchService, applyApptAnswer } from "./appointment-booking";
import type { ApptState } from "./appointment-booking";

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

describe("applyApptAnswer — contact step", () => {
  // Regression: ISSUE-001 — appointment booking accepted arbitrary text as
  // the contact value when it wasn't a recognizable email or phone number,
  // confirming the booking with a contact no confirmation could ever reach.
  // Found by /qa on 2026-08-14
  // Report: .gstack/qa-reports/qa-report-chatsyn-io-2026-08-14.md
  const contactStepState: ApptState = {
    step: "contact",
    service: { value: "demo", label: { "en-US": "Product demo", "es-ES": "", "zh-CN": "" }, keywords: { "en-US": [], "es-ES": [], "zh-CN": [] } },
    slot: { iso: "2026-08-17T10:00:00.000Z", label: "Mon, Aug 17, 10:00 AM", weekday: "mon", hour: 10 },
    customerName: "Jamie Valid",
    contact: null,
  };

  it("rejects text with no email or phone and re-prompts instead of confirming", () => {
    const result = applyApptAnswer(contactStepState, "asdf not an email or phone", "en-US");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.state.step).toBe("contact");
      expect(result.state.contact).toBeNull();
      expect(result.error).toBeTruthy();
    }
  });

  it("accepts a real email as contact and completes the booking", () => {
    const result = applyApptAnswer(contactStepState, "jamie.valid@example.com", "en-US");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.contact).toBe("jamie.valid@example.com");
      expect(result.done).toBe(true);
    }
  });

  it("accepts a real phone number as contact and completes the booking", () => {
    const result = applyApptAnswer(contactStepState, "555-123-4567", "en-US");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.contact).toBe("555-123-4567");
      expect(result.done).toBe(true);
    }
  });
});
