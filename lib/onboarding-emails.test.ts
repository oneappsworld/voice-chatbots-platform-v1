import { describe, it, expect } from "vitest";
import { buildOnboardingEmail, type SequenceStep } from "./onboarding-emails";

const BASE_CTX = {
  firstName: "Jamie",
  appUrl: "https://chatsyn.io",
  unsubscribeUrl: "https://chatsyn.io/api/onboarding/unsubscribe?uid=u1&token=abc",
  isTrialing: true,
};

describe("buildOnboardingEmail", () => {
  it.each([1, 2, 3, 4, 5] as SequenceStep[])("step %i has a non-empty subject, html, and text", (step) => {
    const email = buildOnboardingEmail(step, BASE_CTX);
    expect(email.subject.length).toBeGreaterThan(0);
    expect(email.html.length).toBeGreaterThan(0);
    expect(email.text.length).toBeGreaterThan(0);
  });

  it.each([1, 2, 3, 4, 5] as SequenceStep[])("step %i includes the recipient's first name", (step) => {
    const email = buildOnboardingEmail(step, BASE_CTX);
    expect(email.html).toContain("Jamie");
    expect(email.text).toContain("Jamie");
  });

  it.each([1, 2, 3, 4, 5] as SequenceStep[])("step %i includes a working unsubscribe link in both html and text", (step) => {
    const email = buildOnboardingEmail(step, BASE_CTX);
    expect(email.html).toContain(BASE_CTX.unsubscribeUrl);
    expect(email.text).toContain(BASE_CTX.unsubscribeUrl);
  });

  it("falls back to a generic greeting when firstName is empty", () => {
    const email = buildOnboardingEmail(1, { ...BASE_CTX, firstName: "" });
    expect(email.html).toContain("there");
  });

  describe("step 5 — plan-aware branching", () => {
    it("presents the upgrade offer when still trialing", () => {
      const email = buildOnboardingEmail(5, { ...BASE_CTX, isTrialing: true });
      expect(email.subject.toLowerCase()).toContain("trial");
      expect(email.html).toContain("/billing");
    });

    it("does not push the trial-ending upgrade offer once already converted to paid", () => {
      const email = buildOnboardingEmail(5, { ...BASE_CTX, isTrialing: false });
      expect(email.subject.toLowerCase()).not.toContain("trial wraps up");
      expect(email.html).not.toContain("/billing");
    });
  });
});
