import { test } from "node:test";
import assert from "node:assert/strict";
import { isBotBridgeConfigured } from "./bot-bridge.js";

test("isBotBridgeConfigured is false with no TELEPHONY_BRIDGE_URL/SECRET set", () => {
  assert.equal(isBotBridgeConfigured(), false);
});
