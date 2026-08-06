import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { EventEmitter } from "node:events";
import { test } from "node:test";
import { MixxxLiveState } from "./mixxxLiveState";
import {
  BRMEDIA_MIXXX_MESSAGES,
  BRMEDIA_MIXXX_MIXER_FEEDBACK,
  BRMEDIA_MIXXX_PROTOCOL,
  decodeMidiUnit,
  encodeMidiUnit,
  uiBoostToWire,
  wireToUiBoost,
} from "./mixxxProtocol";
import {
  MIXXX_MIDI_PORT_NAME,
  MixxxMidiBridge,
  type MidiInputPort,
  type MidiOutputPort,
} from "./mixxxBridge";

test("M6 protocol v3 preserves M4/M5 assignments and clamps precision", () => {
  assert.ok(BRMEDIA_MIXXX_PROTOCOL.version >= 4);
  assert.deepEqual(BRMEDIA_MIXXX_MESSAGES.deck1Play, [0x90, 0x10]);
  assert.deepEqual(BRMEDIA_MIXXX_MESSAGES.deck1Cue, [0x90, 0x11]);
  assert.deepEqual(BRMEDIA_MIXXX_MESSAGES.deck2Play, [0x90, 0x20]);
  assert.deepEqual(BRMEDIA_MIXXX_MESSAGES.deck2Cue, [0x90, 0x21]);
  assert.deepEqual(BRMEDIA_MIXXX_MESSAGES.crossfader, [0xb0, 0x50]);
  assert.equal(encodeMidiUnit(-1), 0);
  assert.equal(encodeMidiUnit(0.5), 64);
  assert.equal(encodeMidiUnit(2), 127);
  assert.equal(decodeMidiUnit(255), 1);
  assert.equal(uiBoostToWire(100), 2 / 3);
  assert.equal(wireToUiBoost(2 / 3), 100);
});

test("M6 mixer feedback updates decks independently and shared state separately", () => {
  const state = new MixxxLiveState();
  state.receive([0x90, 0x71, 3]);
  state.receive([0x90, 0x70, 127]);
  state.receive([0xb1, BRMEDIA_MIXXX_MIXER_FEEDBACK.deck1Gain, 84]);
  state.receive([0xb1, BRMEDIA_MIXXX_MIXER_FEEDBACK.deck2EqLow, 32]);
  state.receive([0xb1, BRMEDIA_MIXXX_MIXER_FEEDBACK.crossfader, 64]);
  state.receive([0xb1, BRMEDIA_MIXXX_MIXER_FEEDBACK.deck1Clipping, 127]);
  const snapshot = state.snapshot(true);
  assert.equal(snapshot.protocolCompatible, true);
  assert.equal(snapshot.deck1.mixer.gain, 84 / 127);
  assert.equal(snapshot.deck1.mixer.eqLow, null);
  assert.equal(snapshot.deck2.mixer.eqLow, 32 / 127);
  assert.equal(snapshot.deck1.mixer.clipping, true);
  assert.equal(snapshot.mixer.crossfader, 64 / 127);
  assert.equal(snapshot.mixer.masterVolume, null);
});

test("M6 mixer state becomes stale and safely recovers after heartbeat", () => {
  let now = 1000;
  const state = new MixxxLiveState(() => now, 5000);
  state.receive([0x90, 0x71, 3]);
  state.receive([0x90, 0x70, 127]);
  state.receive([0xb1, BRMEDIA_MIXXX_MIXER_FEEDBACK.deck2Meter, 60]);
  assert.equal(state.snapshot(true).deck2.mixer.stale, false);
  now += 5001;
  assert.equal(state.snapshot(true).deck2.mixer.stale, true);
  state.receive([0x90, 0x70, 127]);
  state.receive([0xb1, BRMEDIA_MIXXX_MIXER_FEEDBACK.deck2Meter, 40]);
  assert.equal(state.snapshot(true).deck2.mixer.stale, false);
  assert.equal(state.snapshot(true).deck2.mixer.meter, 40 / 127);
});

class Input extends EventEmitter implements MidiInputPort {
  getPortCount() { return 1; }
  getPortName() { return MIXXX_MIDI_PORT_NAME; }
  openPort() {}
  closePort() {}
}
class Output implements MidiOutputPort {
  messages: number[][] = [];
  getPortCount() { return 1; }
  getPortName() { return MIXXX_MIDI_PORT_NAME; }
  openPort() {}
  closePort() {}
  sendMessage(message: number[]) { this.messages.push(message); }
}

test("M6 Native mode emits zero mixer MIDI and Mixxx mode emits only approved mapping", () => {
  const output = new Output();
  const bridge = new MixxxMidiBridge({ input: () => new Input(), output: () => output });
  bridge.open();
  assert.throws(() => bridge.send("deck1Gain", 64), /Native mode/);
  assert.equal(output.messages.length, 0);
  bridge.receiveFeedbackForTest([0x90, 0x71, 5]);
  bridge.receiveFeedbackForTest([0x90, 0x70, 127]);
  bridge.setMode("mixxx", false);
  bridge.send("deck1Gain", 64);
  bridge.send("deck2Filter", 127);
  assert.deepEqual(output.messages, [[0xb0, 0x52, 64], [0xb0, 0x5d, 127]]);
});

test("M6 isolated mapping uses verified Mixxx controls and bounded meters", () => {
  const script = fs.readFileSync(path.resolve("tools/mixxx/BRMedia-Mixxx-M6-Core-Mixer-scripts.js"), "utf8");
  const xml = fs.readFileSync(path.resolve("tools/mixxx/BRMedia-Mixxx-M6-Core-Mixer.midi.xml"), "utf8");
  for (const control of ["pregain", "parameter3", "parameter2", "parameter1", "super1", "volume", "pfl", "vu_meter", "PeakIndicator"])
    assert.match(script, new RegExp(`"${control}"`));
  assert.match(script, /engine\.beginTimer\(50, BRMediaMixxxM6\.sendMeters\)/);
  assert.match(script, /sendChanged/);
  assert.equal((xml.match(/<control>/g) || []).length, 21);
  assert.doesNotMatch(script, /loadTrack|beatsync|hotcue|loop_|sync_enabled/);
});

test("M6 frontend isolates Native routing and Library health is non-blocking", () => {
  const app = fs.readFileSync(path.resolve("server/public/dj-mixer/app.js"), "utf8");
  const component = fs.readFileSync(path.resolve("server/public/dj-mixer/components/mixxx-backend-m3.js"), "utf8");
  const html = fs.readFileSync(path.resolve("server/public/dj-mixer/performance.html"), "utf8");
  assert.match(app, /if \(isMixxxMixerBackend\(\)\)/);
  assert.match(app, /routeMixxxDeckMixer/);
  assert.match(component, /mixerQueue/);
  assert.match(component, /setTimeout\(flushMixerQueue, 50\)/);
  assert.match(component, /setInterval\(\(\) => void poll\(\), 250\)/);
  const libraryFetch = app.indexOf('await fetch("/library"');
  const initialRender = app.indexOf("renderDjPerformanceLibrary(", libraryFetch);
  const healthFetch = app.indexOf("fetch(`/waveforms/health", initialRender);
  assert.ok(libraryFetch >= 0 && initialRender > libraryFetch && healthFetch > initialRender);
  assert.match(html, /v=20260729-m15-waveform-validation/);
});

test("M6 has no raw MIDI or Mixxx database write path", () => {
  const bridge = fs.readFileSync(path.resolve("server/src/mixxxBridge.ts"), "utf8");
  assert.doesNotMatch(bridge, /sqlite|mixxxdb|collection\.db|INSERT\s+INTO|UPDATE\s+tracks/i);
  assert.doesNotMatch(bridge, /\/raw/);
});
