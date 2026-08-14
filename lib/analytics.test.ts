import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("trackEvent", () => {
  afterEach(() => {
    delete window.gtag;
    delete window.plausible;
  });

  it("calls both gtag and plausible when both are present on window", async () => {
    const { trackEvent } = await import("./analytics");
    const gtag = vi.fn();
    const plausible = vi.fn();
    window.gtag = gtag;
    window.plausible = plausible;

    trackEvent("sign_up", { method: "email" });

    expect(gtag).toHaveBeenCalledWith("event", "sign_up", { method: "email" });
    expect(plausible).toHaveBeenCalledWith("sign_up", { props: { method: "email" } });
  });

  it("does not throw when neither provider is loaded", async () => {
    const { trackEvent } = await import("./analytics");
    expect(() => trackEvent("feature_usage", { bot: "faq" })).not.toThrow();
  });

  it("only calls the provider that's actually present", async () => {
    const { trackEvent } = await import("./analytics");
    const gtag = vi.fn();
    window.gtag = gtag;

    trackEvent("subscription_conversion", { plan: "pro" });

    expect(gtag).toHaveBeenCalledWith("event", "subscription_conversion", { plan: "pro" });
  });
});

describe("event helpers", () => {
  it("trackSignUp fires sign_up with the method", async () => {
    const { trackSignUp } = await import("./analytics");
    const gtag = vi.fn();
    window.gtag = gtag;

    trackSignUp("google");

    expect(gtag).toHaveBeenCalledWith("event", "sign_up", { method: "google" });
  });

  it("trackFeatureUsage fires feature_usage with the bot type", async () => {
    const { trackFeatureUsage } = await import("./analytics");
    const gtag = vi.fn();
    window.gtag = gtag;

    trackFeatureUsage("appointment_booking");

    expect(gtag).toHaveBeenCalledWith("event", "feature_usage", { bot: "appointment_booking" });
  });

  it("trackSubscriptionConversion fires subscription_conversion with the plan", async () => {
    const { trackSubscriptionConversion } = await import("./analytics");
    const gtag = vi.fn();
    window.gtag = gtag;

    trackSubscriptionConversion("pro");

    expect(gtag).toHaveBeenCalledWith("event", "subscription_conversion", { plan: "pro" });
  });
});

describe("isGaConfigured / isPlausibleConfigured", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("is false when neither NEXT_PUBLIC_GA_MEASUREMENT_ID nor NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "");
    vi.stubEnv("NEXT_PUBLIC_PLAUSIBLE_DOMAIN", "");
    const { isGaConfigured, isPlausibleConfigured } = await import("./analytics");
    expect(isGaConfigured()).toBe(false);
    expect(isPlausibleConfigured()).toBe(false);
    vi.unstubAllEnvs();
  });

  it("is true once the corresponding env var is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-TEST123");
    vi.stubEnv("NEXT_PUBLIC_PLAUSIBLE_DOMAIN", "chatsyn.io");
    const { isGaConfigured, isPlausibleConfigured } = await import("./analytics");
    expect(isGaConfigured()).toBe(true);
    expect(isPlausibleConfigured()).toBe(true);
    vi.unstubAllEnvs();
  });
});
