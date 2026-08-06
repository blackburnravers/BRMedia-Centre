import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { EventEmitter } from "node:events";
import { test } from "node:test";
import { MixxxLiveState } from "./mixxxLiveState";
import { BRMEDIA_MIXXX_M7_FEEDBACK, BRMEDIA_MIXXX_PROTOCOL, BRMEDIA_MIXXX_MESSAGES } from "./mixxxProtocol";
import { MIXXX_MIDI_PORT_NAME, MixxxMidiBridge, type MidiInputPort, type MidiOutputPort } from "./mixxxBridge";

class Input extends EventEmitter implements MidiInputPort {
  getPortCount() { return 1; } getPortName() { return MIXXX_MIDI_PORT_NAME; }
  openPort() {} closePort() {}
}
class Output implements MidiOutputPort {
  messages: number[][] = [];
  getPortCount() { return 1; } getPortName() { return MIXXX_MIDI_PORT_NAME; }
  openPort() {} closePort() {} sendMessage(message: number[]) { this.messages.push(message); }
}

test("M7 protocol v4 preserves M4-M6 assignments", () => {
  assert.ok(BRMEDIA_MIXXX_PROTOCOL.version >= 4);
  assert.deepEqual(BRMEDIA_MIXXX_MESSAGES.deck1Play, [0x90, 0x10]);
  assert.deepEqual(BRMEDIA_MIXXX_MESSAGES.deck2Cue, [0x90, 0x21]);
  assert.deepEqual(BRMEDIA_MIXXX_MESSAGES.crossfader, [0xb0, 0x50]);
});

test("M7 performance feedback remains deck-isolated and derives follower only from verified flags", () => {
  const state = new MixxxLiveState();
  state.receive([0x90, 0x71, 4]); state.receive([0x90, 0x70, 127]);
  const f = BRMEDIA_MIXXX_M7_FEEDBACK;
  state.receive([f.status, f.deck1Base + f.offsets.syncEnabled, 127]);
  state.receive([f.status, f.deck1Base + f.offsets.syncLeader, 0]);
  state.receive([f.status, f.deck2Base + f.offsets.quantize, 127]);
  state.receive([f.status, f.deck1Base + f.offsets.hotcueBase + 2, 127]);
  const snapshot = state.snapshot(true);
  assert.equal(snapshot.protocolCompatible, true);
  assert.equal(snapshot.deck1.performance.follower, true);
  assert.equal(snapshot.deck1.performance.hotCues[2], true);
  assert.equal(snapshot.deck2.performance.quantize, true);
  assert.equal(snapshot.deck2.performance.syncEnabled, null);
  assert.equal(snapshot.deck1.performance.downbeat, null);
  assert.equal(snapshot.deck1.performance.memoryCues, null);
});

test("M7 Native authority emits no performance MIDI; Mixxx sends only reserved controls", () => {
  const output = new Output();
  const bridge = new MixxxMidiBridge({ input: () => new Input(), output: () => output });
  bridge.open();
  assert.throws(() => bridge.sendM7("deck1Sync"), /Native mode|authority/);
  assert.equal(output.messages.length, 0);
  bridge.receiveFeedbackForTest([0x90, 0x71, 5]);
  bridge.receiveFeedbackForTest([0x90, 0x70, 127]);
  bridge.setMode("mixxx", false);
  bridge.sendM7("deck1Sync");
  bridge.sendM7Hotcue(2, 8);
  assert.deepEqual(output.messages, [[0xb2, 0x00, 127], [0xb2, 0x37, 127]]);
});

test("M7 mapping uses verified controls, coalesces feedback, and bounds performance to 8 Hz", () => {
  const script = fs.readFileSync(path.resolve("tools/mixxx/BRMedia-Mixxx-M7-Live-Engine-scripts.js"), "utf8");
  const xml = fs.readFileSync(path.resolve("tools/mixxx/BRMedia-Mixxx-M7-Live-Engine.midi.xml"), "utf8");
  for (const control of ["sync_enabled", "sync_leader", "quantize", "loop_in", "loop_out",
    "loop_enabled", "beatloop_size", "beatjump_backward", "beatjump_forward",
    "beat_distance", "visual_key", "keylock", "hotcue_"])
    assert.match(script, new RegExp(control));
  assert.doesNotMatch(script, /beat_closest/);
  assert.match(script, /beginTimer\(125/);
  assert.match(script, /sendChanged/);
  assert.match(xml, /status>0xb2/);
  assert.match(script, /engine\.loadTrack/);
  assert.match(xml, /status>0xF0/);
  assert.doesNotMatch(script, /collection\.db|sqlite/i);
});

test("M7 frontend asserts Native external authority and exposes no seek/raw MIDI path", () => {
  const engine = fs.readFileSync(path.resolve("server/public/dj-mixer/engine/audio-engine.js"), "utf8");
  const component = fs.readFileSync(path.resolve("server/public/dj-mixer/components/mixxx-backend-m3.js"), "utf8");
  const bridge = fs.readFileSync(path.resolve("server/src/mixxxBridge.ts"), "utf8");
  assert.match(engine, /setExternalAuthority/);
  assert.match(component, /setExternalAuthority.*effectiveBackend === "mixxx"/);
  assert.match(component, /performance\/\$\{action\}/);
  assert.doesNotMatch(bridge, /\/raw|collection\.db|sqlite/i);
});
