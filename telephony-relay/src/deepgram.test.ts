import { test } from "node:test";
import assert from "node:assert/strict";
import { isDeepgramConfigured, extractTranscript } from "./deepgram.js";

test("isDeepgramConfigured is false with no DEEPGRAM_API_KEY set", () => {
  assert.equal(isDeepgramConfigured(), false);
});

test("extractTranscript reads a final result with a transcript", () => {
  const result = extractTranscript({
    channel: { alternatives: [{ transcript: "hello there", confidence: 0.98 }] },
    is_final: true,
  });
  assert.deepEqual(result, { transcript: "hello there", isFinal: true, confidence: 0.98 });
});

test("extractTranscript defaults isFinal/confidence when fields are absent", () => {
  const result = extractTranscript({
    channel: { alternatives: [{ transcript: "partial" }] },
  });
  assert.deepEqual(result, { transcript: "partial", isFinal: false, confidence: 0 });
});

test("extractTranscript returns null for an empty transcript (silence frame)", () => {
  const result = extractTranscript({
    channel: { alternatives: [{ transcript: "", confidence: 0 }] },
    is_final: false,
  });
  assert.equal(result, null);
});

test("extractTranscript returns null for a non-transcript message (e.g. Metadata)", () => {
  assert.equal(extractTranscript({ type: "Metadata", request_id: "abc" }), null);
});

test("extractTranscript returns null for malformed input", () => {
  assert.equal(extractTranscript(null), null);
  assert.equal(extractTranscript("not an object"), null);
  assert.equal(extractTranscript({ channel: {} }), null);
});
