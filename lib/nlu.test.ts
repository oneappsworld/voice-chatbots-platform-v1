import { describe, it, expect } from "vitest";
import { classifyIntent, containsPhrase, extractEntities } from "./nlu";

describe("containsPhrase", () => {
  it("does not false-positive on a keyword that is a substring of a longer word", () => {
    // Regression: "hi" (a greeting keyword) used to match inside "shipped"
    // and "this" via plain .includes(), misclassifying order-status and
    // complaint utterances as greetings.
    expect(containsPhrase("your order has shipped", "hi")).toBe(false);
    expect(containsPhrase("this is broken", "hi")).toBe(false);
  });

  it("matches a phrase on a real word boundary", () => {
    expect(containsPhrase("hi there", "hi")).toBe(true);
    expect(containsPhrase("oh hi!", "hi")).toBe(true);
  });

  it("does not match a numeric keyword that is a substring of a longer number", () => {
    // Regression: "500" (a budget-bucket keyword) used to match inside
    // "5000", bucketing a $5k/mo budget as under-$2k.
    expect(containsPhrase("around 5000 per month", "500")).toBe(false);
    expect(containsPhrase("around 500 per month", "500")).toBe(true);
  });
});

describe("classifyIntent", () => {
  it("classifies a greeting", () => {
    const result = classifyIntent("Hi, good morning", "en-US");
    expect(result.intent).toBe("greeting");
  });

  it("does not misclassify order-status text containing 'hi' as a greeting", () => {
    const result = classifyIntent("Where is my order? It hasn't shipped yet", "en-US");
    expect(result.intent).toBe("order_status");
  });

  it("classifies a complaint over a generic question when both signals are present", () => {
    const result = classifyIntent("This is broken and I'm really frustrated", "en-US");
    expect(result.intent).toBe("complaint");
  });

  it("falls back to unknown for unrecognized input", () => {
    const result = classifyIntent("asdkjqwlekj random gibberish zzz", "en-US");
    expect(result.intent).toBe("unknown");
  });

  it("classifies Spanish greetings the same way as English", () => {
    const result = classifyIntent("Hola, buenos días", "es-ES");
    expect(result.intent).toBe("greeting");
  });
});

describe("extractEntities", () => {
  it("extracts an email address", () => {
    const { emails } = extractEntities("send it to jamie@acmerobotics.com please", "en-US");
    expect(emails).toEqual(["jamie@acmerobotics.com"]);
  });

  it("extracts a phone number with at least 7 digits", () => {
    const { phones } = extractEntities("call me at 555-123-4567", "en-US");
    expect(phones).toEqual(["555-123-4567"]);
  });

  it("does not extract a short number as a phone number", () => {
    const { phones } = extractEntities("order ORD-1023", "en-US");
    expect(phones).toEqual([]);
  });
});
