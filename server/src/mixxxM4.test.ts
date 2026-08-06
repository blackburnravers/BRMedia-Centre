import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { BRMEDIA_MIXXX_M4_PROTOCOL_VERSION, BRMEDIA_MIXXX_MESSAGES, BRMEDIA_MIXXX_PROTOCOL } from "./mixxxProtocol";
import { MIXXX_M2_MESSAGES, MixxxMidiBridge, type MidiInputPort, type MidiOutputPort } from "./mixxxBridge";

class Input implements MidiInputPort {
  getPortCount() { return 1; }
  getPortName() { return "BRMedia Mixxx Remote"; }
  openPort() {}
  closePort() {}
  on() { return this; }
}
class Output implements MidiOutputPort {
  sent: number[][] = [];
  getPortCount() { return 1; }
  getPortName() { return "BRMedia Mixxx Remote"; }
  openPort() {}
  closePort() {}
  sendMessage(message: number[]) { this.sent.push(message); }
}

test("M4 protocol is the single semantic mapping source", () => {
  assert.equal(BRMEDIA_MIXXX_PROTOCOL.name, "BRMediaMixxx");
  assert.equal(BRMEDIA_MIXXX_M4_PROTOCOL_VERSION, 1);
  assert.ok(BRMEDIA_MIXXX_PROTOCOL.version >= BRMEDIA_MIXXX_M4_PROTOCOL_VERSION);
  for (const key of Object.keys(MIXXX_M2_MESSAGES) as Array<keyof typeof MIXXX_M2_MESSAGES>)
    assert.deepEqual(MIXXX_M2_MESSAGES[key], BRMEDIA_MIXXX_MESSAGES[key]);
});

test("M4 backend status distinguishes configured and effective state", () => {
  const bridge = new MixxxMidiBridge({ input: () => new Input(), output: () => new Output() });
  let status = bridge.reportReconciliation("brmedia-native", false, "reconciled", "test");
  assert.equal(status.effectiveBackend, "brmedia-native");
  assert.equal(status.reconciled, true);
  bridge.open();
  bridge.receiveFeedbackForTest([0x90, 0x71, 5]);
  bridge.receiveFeedbackForTest([0x90, 0x70, 127]);
  bridge.setMode("mixxx", false);
  status = bridge.reportReconciliation("mixxx", true, "reconciled", "runtime-switch");
  assert.equal(status.effectiveBackend, "mixxx");
  assert.equal(status.configuredBackend, "mixxx");
  assert.equal(status.reconciled, true);
});

test("M4 reconciliation and switching never emit transport", () => {
  const output = new Output();
  const bridge = new MixxxMidiBridge({ input: () => new Input(), output: () => output });
  bridge.open();
  bridge.receiveFeedbackForTest([0x90, 0x71, 5]);
  bridge.receiveFeedbackForTest([0x90, 0x70, 127]);
  bridge.setMode("mixxx", false);
  bridge.reportReconciliation("mixxx", true, "reconciled", "startup-restoration");
  bridge.close();
  bridge.reportReconciliation("brmedia-native", false, "fallback-native", "disconnect");
  assert.deepEqual(output.sent, []);
});

test("M4 frontend uses one guarded persisted backend operation", () => {
  const settings = fs.readFileSync(path.resolve("server/public/settings/mixxx-m3.js"), "utf8");
  const runtime = fs.readFileSync(path.resolve("server/public/dj-mixer/components/mixxx-backend-m3.js"), "utf8");
  assert.match(settings, /\/backend/);
  assert.match(settings, /effectiveBackend/);
  assert.match(settings, /Saved \/ Runtime/);
  assert.match(runtime, /brmedia:dj-backend-state/);
  assert.doesNotMatch(settings, /\/deck\/|\/heartbeat|\/crossfader/);
});

test("M4 implementation has no Mixxx database write surface", () => {
  const source = fs.readFileSync(path.resolve("server/src/mixxxBridge.ts"), "utf8");
  assert.doesNotMatch(source, /sqlite|mixxxdb|collection\.db|INSERT\s+INTO|UPDATE\s+tracks/i);
});
