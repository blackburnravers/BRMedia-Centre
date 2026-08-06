import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  inspectMixxxMapping,
  MIXXX_MAPPING_SCRIPT,
  MIXXX_MAPPING_VERSION,
  MIXXX_MAPPING_XML,
} from "./mixxxMappingStatus";
import { MixxxMidiBridge, type MidiInputPort, type MidiOutputPort } from "./mixxxBridge";
import { MixxxLiveState } from "./mixxxLiveState";

const root = path.resolve(__dirname, "..", "..");
const source = path.join(root, "tools", "mixxx");
const fixture = () => fs.mkdtempSync(path.join(os.tmpdir(), "brmedia m19 mapping "));
const installSources = (directory: string) => {
  fs.copyFileSync(path.join(source, MIXXX_MAPPING_XML), path.join(directory, MIXXX_MAPPING_XML));
  fs.copyFileSync(path.join(source, MIXXX_MAPPING_SCRIPT), path.join(directory, MIXXX_MAPPING_SCRIPT));
};

test("M19 mapping reports missing, installed current version and restart requirement", () => {
  const directory = fixture();
  assert.equal(inspectMixxxMapping(directory).state, "mapping-missing");
  installSources(directory);
  const status = inspectMixxxMapping(directory, { mixxxRunning: true, protocolHealthy: false });
  assert.equal(status.state, "mapping-installed");
  assert.equal(status.version, MIXXX_MAPPING_VERSION);
  assert.equal(status.valid, true);
  assert.equal(status.restartRequired, true);
  assert.equal(inspectMixxxMapping(directory, { mixxxRunning: true, protocolHealthy: true }).restartRequired, false);
});

test("M19 mapping reports outdated and invalid files", () => {
  const directory = fixture();
  installSources(directory);
  const script = path.join(directory, MIXXX_MAPPING_SCRIPT);
  fs.writeFileSync(script, fs.readFileSync(script, "utf8").replace("0x90, 0x71, 5", "0x90, 0x71, 4"));
  assert.equal(inspectMixxxMapping(directory).state, "mapping-version-mismatch");
  fs.writeFileSync(path.join(directory, MIXXX_MAPPING_XML), "<not-a-mixxx-mapping>");
  assert.equal(inspectMixxxMapping(directory).state, "mapping-file-invalid");
});

test("M19 approved source identity matches Mixxx 2.5 and protocol heartbeat", () => {
  const xml = fs.readFileSync(path.join(source, MIXXX_MAPPING_XML), "utf8");
  const script = fs.readFileSync(path.join(source, MIXXX_MAPPING_SCRIPT), "utf8");
  assert.match(xml, /mixxxVersion="2\.5"/);
  assert.match(xml, /controller id="BRMedia Mixxx Remote"/);
  assert.match(xml, /functionprefix="BRMediaMixxxM7"/);
  assert.match(script, /midi\.sendShortMsg\(0x90, 0x71, 5\)/);
  assert.match(script, /beginTimer\(2000,[\s\S]*midi\.sendShortMsg\(0x90, 0x70/);
  assert.doesNotMatch(xml, /BRMediaMixxxM7\.heartbeat/);
  assert.doesNotMatch(script, /BRMediaMixxxM7\.heartbeat\s*=/);
  assert.equal((script.match(/midi\.sendShortMsg\(0x90, 0x70/g) || []).length, 1);
  assert.match(script, /beginTimer\(2000,[\s\S]*lastMidi = \{\};[\s\S]*BRMediaMixxxM7\.snapshot\(\)/);
});

test("M19 backend remains native without protocol and heartbeat", () => {
  const bridge = new MixxxMidiBridge({
    input: () => ({ getPortCount: () => 0, getPortName: () => "", openPort() {}, closePort() {}, on() { return this; } }),
    output: () => ({ getPortCount: () => 0, getPortName: () => "", openPort() {}, closePort() {}, sendMessage() {} }),
  });
  const status = bridge.status();
  assert.equal(status.readiness.protocolConnected, false);
  assert.equal(status.readiness.heartbeatRecent, false);
  assert.equal(status.readiness.backendUsable, false);
  assert.equal(status.effectiveBackend, "brmedia-native");
  assert.equal(status.controllerMappingSelected, null);
  assert.equal(status.controllerMappingEvidence, null);
});

test("M19 reports active mapping only from compatible protocol heartbeat evidence", () => {
  const sourceText = fs.readFileSync(path.join(root, "server", "src", "mixxxBridge.ts"), "utf8");
  assert.match(sourceText, /controllerMappingSelected: feedback\.protocolCompatible && feedback\.heartbeatHealthy \? true : null/);
  assert.match(sourceText, /controllerMappingEvidence:[\s\S]*protocol-v5-heartbeat/);
});

test("M19 task query uses exact root task enumeration and system PowerShell", () => {
  const sourceText = fs.readFileSync(path.join(root, "server", "src", "mixxxTaskStatus.ts"), "utf8");
  assert.match(sourceText, /TaskPath -eq '\\\\'/);
  assert.match(sourceText, /TaskName -eq 'BRMedia Mixxx Startup'/);
  assert.match(sourceText, /System32\\\\WindowsPowerShell/);
  assert.match(sourceText, /timeout: 5000/);
});

const deckMessage = (deck: 1 | 2, offset: number, value: number) =>
  [0x90, (deck === 1 ? 0x30 : 0x40) + offset, value];
const snapshot = (state: MixxxLiveState, epoch: number, deck: 1 | 2, sequence: number, flags: number) => {
  assert.equal(state.receive(deckMessage(deck, 0, flags), epoch), true);
  return state.receive(deckMessage(deck, 15, sequence), epoch);
};

test("M19 accepts ordered snapshots and rejects duplicate or lower sequence numbers", () => {
  const state = new MixxxLiveState();
  assert.equal(state.beginSession(1), true);
  assert.equal(snapshot(state, 1, 1, 10, 1), true);
  assert.equal(state.snapshot(true).deck1.loaded, true);
  assert.equal(snapshot(state, 1, 1, 11, 3), true);
  assert.equal(state.snapshot(true).deck1.playing, true);
  assert.equal(snapshot(state, 1, 1, 11, 1), false);
  assert.equal(state.snapshot(true).deck1.playing, true);
  assert.equal(snapshot(state, 1, 1, 9, 1), false);
  assert.equal(state.snapshot(true).deck1.playing, true);
});

test("M19 resets ordering per epoch, rejects old epochs and keeps decks independent", () => {
  const state = new MixxxLiveState();
  assert.equal(state.beginSession(20), true);
  assert.equal(snapshot(state, 20, 1, 40, 3), true);
  assert.equal(snapshot(state, 20, 2, 5, 1), true);
  assert.equal(snapshot(state, 20, 1, 41, 1), true);
  assert.equal(snapshot(state, 20, 2, 6, 3), true);
  assert.equal(state.snapshot(true).deck1.playing, false);
  assert.equal(state.snapshot(true).deck2.playing, true);

  assert.equal(state.beginSession(21), true);
  assert.equal(state.snapshot(true).deck1.loaded, null);
  assert.equal(state.receive(deckMessage(1, 0, 3), 20), false);
  assert.equal(state.receive(deckMessage(1, 15, 42), 20), false);
  assert.equal(state.snapshot(true).deck1.loaded, null);
  assert.equal(snapshot(state, 21, 1, 1, 1), true);
  assert.equal(state.snapshot(true).deck1.loaded, true);
  assert.deepEqual(state.snapshot(true).snapshotSequence, { 1: 1, 2: null });
});

test("M19 rejects malformed epoch and sequence input safely", () => {
  const state = new MixxxLiveState();
  assert.equal(state.beginSession(3), true);
  assert.equal(state.receive(deckMessage(1, 0, 1), 0), false);
  assert.equal(state.receive(deckMessage(1, 0, 1), Number.NaN), false);
  assert.equal(state.receive(deckMessage(1, 15, 128), 3), false);
  assert.equal(state.receive([0x90, 0x3f, 1.5], 3), false);
  assert.equal(state.snapshot(true).deck1.loaded, null);
});

test("M19 disconnect clears authority and old callbacks cannot revive a newer connection", () => {
  const listeners: Array<(delta: number, message: number[]) => void> = [];
  class InputPort implements MidiInputPort {
    getPortCount() { return 1; }
    getPortName() { return "BRMedia Mixxx Remote"; }
    openPort() {}
    closePort() {}
    on(_event: "message", listener: (delta: number, message: number[]) => void) {
      listeners.push(listener); return this;
    }
    removeAllListeners() { return this; }
  }
  class OutputPort implements MidiOutputPort {
    getPortCount() { return 1; }
    getPortName() { return "BRMedia Mixxx Remote"; }
    openPort() {}
    closePort() {}
    sendMessage() {}
  }
  const bridge = new MixxxMidiBridge({ input: () => new InputPort(), output: () => new OutputPort() });
  bridge.open();
  const old = listeners[0];
  old(0, [0x90, 0x71, 5]); old(0, [0x90, 0x70, 127]);
  old(0, deckMessage(1, 0, 3)); old(0, deckMessage(1, 15, 7));
  bridge.setMode("mixxx", false);
  assert.equal(bridge.status().effectiveBackend, "mixxx");

  bridge.close();
  old(0, [0x90, 0x70, 127]); old(0, deckMessage(1, 0, 1)); old(0, deckMessage(1, 15, 8));
  let status = bridge.status();
  assert.equal(status.effectiveBackend, "brmedia-native");
  assert.equal(status.heartbeatHealthy, false);
  assert.equal(status.deck1.loaded, null);

  bridge.open();
  const current = listeners[1];
  assert.notEqual(bridge.status().sessionEpoch, 1);
  old(0, [0x90, 0x71, 5]); old(0, [0x90, 0x70, 127]);
  old(0, deckMessage(1, 0, 3)); old(0, deckMessage(1, 15, 9));
  assert.equal(bridge.status().deck1.loaded, null);
  current(0, [0x90, 0x71, 5]); current(0, [0x90, 0x70, 127]);
  current(0, deckMessage(1, 0, 1)); current(0, deckMessage(1, 15, 1));
  status = bridge.status();
  assert.equal(status.protocolCompatible, true);
  assert.equal(status.heartbeatHealthy, true);
  assert.equal(status.deck1.loaded, true);
  assert.equal(status.snapshotSequence[1], 1);
});
