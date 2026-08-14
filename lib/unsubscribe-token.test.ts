import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("unsubscribe-token", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  describe("without ONBOARDING_UNSUBSCRIBE_SECRET set", () => {
    beforeEach(() => {
      vi.stubEnv("ONBOARDING_UNSUBSCRIBE_SECRET", "");
      vi.resetModules();
    });

    it("isUnsubscribeConfigured is false", async () => {
      const { isUnsubscribeConfigured } = await import("./unsubscribe-token");
      expect(isUnsubscribeConfigured()).toBe(false);
    });

    it("generateUnsubscribeToken throws", async () => {
      const { generateUnsubscribeToken } = await import("./unsubscribe-token");
      expect(() => generateUnsubscribeToken("user-1")).toThrow();
    });

    it("verifyUnsubscribeToken returns false rather than throwing", async () => {
      const { verifyUnsubscribeToken } = await import("./unsubscribe-token");
      expect(verifyUnsubscribeToken("user-1", "anything")).toBe(false);
    });
  });

  describe("with ONBOARDING_UNSUBSCRIBE_SECRET set", () => {
    beforeEach(() => {
      vi.stubEnv("ONBOARDING_UNSUBSCRIBE_SECRET", "test-secret-value");
      vi.resetModules();
    });

    it("a generated token verifies for the same user id", async () => {
      const { generateUnsubscribeToken, verifyUnsubscribeToken } = await import("./unsubscribe-token");
      const token = generateUnsubscribeToken("user-1");
      expect(verifyUnsubscribeToken("user-1", token)).toBe(true);
    });

    it("rejects a token generated for a different user id", async () => {
      const { generateUnsubscribeToken, verifyUnsubscribeToken } = await import("./unsubscribe-token");
      const token = generateUnsubscribeToken("user-1");
      expect(verifyUnsubscribeToken("user-2", token)).toBe(false);
    });

    it("rejects a tampered token", async () => {
      const { generateUnsubscribeToken, verifyUnsubscribeToken } = await import("./unsubscribe-token");
      const token = generateUnsubscribeToken("user-1");
      const tampered = token.slice(0, -2) + (token.slice(-2) === "00" ? "11" : "00");
      expect(verifyUnsubscribeToken("user-1", tampered)).toBe(false);
    });

    it("rejects a malformed (non-hex) token without throwing", async () => {
      const { verifyUnsubscribeToken } = await import("./unsubscribe-token");
      expect(verifyUnsubscribeToken("user-1", "not-hex-!!")).toBe(false);
    });

    it("rejects an empty token", async () => {
      const { verifyUnsubscribeToken } = await import("./unsubscribe-token");
      expect(verifyUnsubscribeToken("user-1", "")).toBe(false);
    });
  });
});
