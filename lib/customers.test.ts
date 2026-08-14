import { describe, it, expect } from "vitest";
import { classifyContact } from "./customers";

describe("classifyContact", () => {
  it("classifies an email-shaped contact as email", () => {
    expect(classifyContact("jane@example.com")).toEqual({ email: "jane@example.com", phone: null });
  });

  it("classifies a phone-shaped contact as phone", () => {
    expect(classifyContact("415-555-0134")).toEqual({ email: null, phone: "415-555-0134" });
  });

  it("returns both when the text contains an email and a phone number", () => {
    const result = classifyContact("reach me at jane@example.com or 415-555-0134");
    expect(result.email).toBe("jane@example.com");
    expect(result.phone).toBe("415-555-0134");
  });

  it("returns nulls for text with neither", () => {
    expect(classifyContact("just my name, Jane")).toEqual({ email: null, phone: null });
  });
});
