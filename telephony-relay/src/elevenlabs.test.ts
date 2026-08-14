import { test } from "node:test";
import assert from "node:assert/strict";
import { isElevenLabsConfigured, chunkAudioFrames } from "./elevenlabs.js";

test("isElevenLabsConfigured is false with no API key/voice ID set", () => {
  assert.equal(isElevenLabsConfigured(), false);
});

test("chunkAudioFrames splits into exact 160-byte frames", () => {
  const audio = Buffer.alloc(320, 0x7f);
  const frames = chunkAudioFrames(audio);
  assert.equal(frames.length, 2);
  assert.equal(frames[0].length, 160);
  assert.equal(frames[1].length, 160);
});

test("chunkAudioFrames keeps a trailing partial frame instead of dropping it", () => {
  const audio = Buffer.alloc(250, 0x7f);
  const frames = chunkAudioFrames(audio);
  assert.equal(frames.length, 2);
  assert.equal(frames[0].length, 160);
  assert.equal(frames[1].length, 90);
});

test("chunkAudioFrames returns a single short frame for audio smaller than one frame", () => {
  const audio = Buffer.alloc(40, 0x7f);
  const frames = chunkAudioFrames(audio);
  assert.equal(frames.length, 1);
  assert.equal(frames[0].length, 40);
});

test("chunkAudioFrames returns no frames for empty audio", () => {
  assert.deepEqual(chunkAudioFrames(Buffer.alloc(0)), []);
});
