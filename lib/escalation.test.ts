import { describe, it, expect } from "vitest";
import { checkEscalation, sensitivityToThreshold } from "./escalation";

describe("checkEscalation", () => {
  it("triggers on an explicit request to speak to a human", () => {
    const result = checkEscalation("I'd like to talk to a human, please.", "en-US");
    expect(result).toEqual({ trigger: true, reason: "explicit_request" });
  });

  it("triggers on a strong complaint with multiple negative-emotion keywords", () => {
    const result = checkEscalation("This is broken and I'm really frustrated", "en-US");
    expect(result.trigger).toBe(true);
    if (result.trigger) expect(result.reason).toBe("strong_complaint");
  });

  it("does not trigger on an ordinary question", () => {
    const result = checkEscalation("What are your business hours?", "en-US");
    expect(result).toEqual({ trigger: false });
  });

  it("does not trigger on the first unrecognized turn", () => {
    const result = checkEscalation("asdkjqwlekj gibberish", "en-US", { consecutiveUnknown: 0 });
    expect(result).toEqual({ trigger: false });
  });

  it("triggers repeated_confusion once consecutiveUnknown reaches the threshold", () => {
    const result = checkEscalation("asdkjqwlekj gibberish", "en-US", {
      consecutiveUnknown: 2,
      threshold: 2,
    });
    expect(result).toEqual({ trigger: true, reason: "repeated_confusion" });
  });

  it("respects a lower (more sensitive) threshold", () => {
    const result = checkEscalation("asdkjqwlekj gibberish", "en-US", {
      consecutiveUnknown: 1,
      threshold: 1,
    });
    expect(result).toEqual({ trigger: true, reason: "repeated_confusion" });
  });

  it("recognizes the Spanish explicit-request phrase set independently of English", () => {
    const result = checkEscalation("Quiero hablar con una persona, por favor.", "es-ES");
    expect(result).toEqual({ trigger: true, reason: "explicit_request" });
  });
});

describe("sensitivityToThreshold", () => {
  it("maps high sensitivity to the lowest threshold", () => {
    expect(sensitivityToThreshold("high")).toBe(1);
  });

  it("maps normal sensitivity to the default threshold", () => {
    expect(sensitivityToThreshold("normal")).toBe(2);
  });

  it("maps low sensitivity to the highest threshold", () => {
    expect(sensitivityToThreshold("low")).toBe(3);
  });
});
