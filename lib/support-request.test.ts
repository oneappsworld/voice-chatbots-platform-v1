import { describe, it, expect } from "vitest";
import { validateSupportRequest, buildSupportEmail } from "./support-request";

const VALID = { name: "Ada", fromEmail: "ada@example.com", subject: "Can't hear the bot", message: "Voice test is silent on Chrome." };

describe("validateSupportRequest", () => {
  it("accepts a well-formed request", () => {
    expect(validateSupportRequest(VALID)).toBeNull();
  });

  it("rejects a missing/invalid email", () => {
    expect(validateSupportRequest({ ...VALID, fromEmail: "" })).toMatch(/email/i);
    expect(validateSupportRequest({ ...VALID, fromEmail: "not-an-email" })).toMatch(/email/i);
  });

  it("rejects an empty subject", () => {
    expect(validateSupportRequest({ ...VALID, subject: "   " })).toMatch(/subject/i);
  });

  it("rejects a subject over 200 chars", () => {
    expect(validateSupportRequest({ ...VALID, subject: "a".repeat(201) })).toMatch(/too long/i);
  });

  it("rejects an empty message", () => {
    expect(validateSupportRequest({ ...VALID, message: "   " })).toMatch(/help with/i);
  });

  it("rejects a message over 5000 chars", () => {
    expect(validateSupportRequest({ ...VALID, message: "a".repeat(5001) })).toMatch(/too long/i);
  });
});

describe("buildSupportEmail", () => {
  it("prefixes the subject and includes the sender", () => {
    const email = buildSupportEmail(VALID);
    expect(email.subject).toBe("[Support] Can't hear the bot");
    expect(email.text).toContain("Ada <ada@example.com>");
    expect(email.text).toContain("Voice test is silent on Chrome.");
  });

  it("escapes HTML in the message so injected markup can't render", () => {
    const email = buildSupportEmail({ ...VALID, message: "<script>alert(1)</script>\nline two" });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).toContain("<br/>");
  });

  it("falls back to a bare email when no name is set", () => {
    const email = buildSupportEmail({ ...VALID, name: "" });
    expect(email.text.startsWith("From: ada@example.com")).toBe(true);
  });
});
