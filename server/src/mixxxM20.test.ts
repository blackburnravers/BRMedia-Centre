import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { test } from "node:test";
import {
  handleMixxxMidiRoute, MIXXX_MIDI_PORT_NAME, MixxxMidiBridge,
  waitForMixxxHandshake,
  type MidiInputPort, type MidiOutputPort,
} from "./mixxxBridge";
import { MixxxLiveState } from "./mixxxLiveState";
import { BRMEDIA_MIXXX_FEEDBACK, BRMEDIA_MIXXX_MESSAGES } from "./mixxxProtocol";

class Input extends EventEmitter implements MidiInputPort {
  getPortCount() { return 1; }
  getPortName() { return MIXXX_MIDI_PORT_NAME; }
  openPort() {}
  closePort() {}
}
class Output implements MidiOutputPort {
  sent: number[][] = [];
  getPortCount() { return 1; }
  getPortName() { return MIXXX_MIDI_PORT_NAME; }
  openPort() {}
  closePort() {}
  sendMessage(message: number[]) { this.sent.push(message); }
}
const deckMessage = (deck: 1 | 2, offset: number, value: number) =>
  [0x90, (deck === 1 ? 0x30 : 0x40) + offset, value];
function pair(messages: number[][], deck: 1 | 2, high: number, low: number, raw: number) {
  messages.push(deckMessage(deck, high, (raw >> 7) & 0x7f), deckMessage(deck, low, raw & 0x7f));
}
function orderedSnapshot(state: MixxxLiveState, epoch: number, deck: 1 | 2, sequence: number, messages: number[][]) {
  messages.forEach(message => assert.equal(state.receive(message, epoch), true));
  return state.receive(deckMessage(deck, BRMEDIA_MIXXX_FEEDBACK.offsets.snapshotSequence, sequence), epoch);
}
async function post(pathname: string, bridge: MixxxMidiBridge, body: unknown = {}) {
  const req = new EventEmitter() as IncomingMessage;
  req.method = "POST";
  const result = { status: 0, body: null as any };
  const res = {
    statusCode: 0, setHeader() {},
    end(value: string) { result.status = Number((res as any).statusCode); result.body = JSON.parse(value); },
  } as unknown as ServerResponse;
  const pending = handleMixxxMidiRoute(req, res, new URL(`http://localhost${pathname}`), bridge);
  process.nextTick(() => {
    req.emit("data", Buffer.from(JSON.stringify(body)));
    req.emit("end");
  });
  await pending;
  return result;
}
function authoritativeBridge() {
  const output = new Output();
  const bridge = new MixxxMidiBridge({ input: () => new Input(), output: () => output });
  bridge.open();
  bridge.receiveFeedbackForTest([0x90, 0x71, 5]);
  bridge.receiveFeedbackForTest([0x90, 0x70, 127]);
  bridge.receiveFeedbackForTest(deckMessage(1, 0, 1));
  bridge.receiveFeedbackForTest(deckMessage(1, 15, 1));
  bridge.setMode("mixxx", false);
  return { bridge, output };
}

test("M20 v5 adds explicit play, pause and stop without moving existing transport controls", () => {
  assert.equal(BRMEDIA_MIXXX_MESSAGES.deck1Play[1], 0x10);
  assert.equal(BRMEDIA_MIXXX_MESSAGES.deck1Cue[1], 0x11);
  assert.equal(BRMEDIA_MIXXX_MESSAGES.deck1Pause[1], 0x12);
  assert.equal(BRMEDIA_MIXXX_MESSAGES.deck1Stop[1], 0x13);
  assert.equal(BRMEDIA_MIXXX_MESSAGES.deck2Play[1], 0x20);
  assert.equal(BRMEDIA_MIXXX_MESSAGES.deck2Cue[1], 0x21);
  assert.equal(BRMEDIA_MIXXX_MESSAGES.deck2Pause[1], 0x22);
  assert.equal(BRMEDIA_MIXXX_MESSAGES.deck2Stop[1], 0x23);
});

test("M20 transport API emits explicit commands only with healthy Mixxx authority", async () => {
  const { bridge, output } = authoritativeBridge();
  for (const action of ["play", "pause", "stop", "cue"]) {
    assert.equal((await post(`/api/dj/mixxx/deck/1/${action}`, bridge)).status, 200);
  }
  assert.deepEqual(output.sent, [
    [0x90, 0x10, 127], [0x90, 0x12, 127], [0x90, 0x13, 127],
    [0x90, 0x11, 127], [0x90, 0x11, 0],
  ]);
  bridge.close();
  assert.equal((await post("/api/dj/mixxx/deck/1/play", bridge)).status, 409);
  assert.equal(bridge.status().effectiveBackend, "brmedia-native");
});

test("M20 ordered feedback exposes transport, tempo, elapsed, remaining and end warning", () => {
  const state = new MixxxLiveState();
  assert.equal(state.beginSession(4), true);
  const messages = [deckMessage(1, 0, 1 | 2 | 16)];
  pair(messages, 1, 3, 4, 3_000);
  pair(messages, 1, 5, 6, 1_234);
  pair(messages, 1, 7, 8, 1_280);
  pair(messages, 1, 9, 10, 1_344);
  pair(messages, 1, 11, 12, 8_192 + 410);
  pair(messages, 1, 13, 14, 327);
  assert.equal(orderedSnapshot(state, 4, 1, 12, messages), true);
  const deck = state.snapshot(true).deck1;
  assert.equal(deck.loaded, true);
  assert.equal(deck.playing, true);
  assert.equal(deck.endOfTrack, true);
  assert.equal(deck.durationSeconds, 300);
  assert.equal(deck.positionSeconds, 123.4);
  assert.ok(Math.abs(deck.remainingSeconds! - 176.6) < 0.001);
  assert.equal(deck.analysedBpm, 128);
  assert.equal(deck.liveBpm, 134.4);
  assert.ok(deck.pitchPercentage! > 4.9 && deck.pitchPercentage! < 5.1);
  assert.ok(deck.tempoRangePercentage! > 7.9 && deck.tempoRangePercentage! < 8.1);
});

test("M20 stale position cannot overwrite a newer snapshot or cross reconnect", () => {
  const state = new MixxxLiveState();
  assert.equal(state.beginSession(10), true);
  let messages: number[][] = [deckMessage(1, 0, 3)];
  pair(messages, 1, 5, 6, 500);
  assert.equal(orderedSnapshot(state, 10, 1, 20, messages), true);
  messages = [];
  pair(messages, 1, 5, 6, 900);
  assert.equal(orderedSnapshot(state, 10, 1, 21, messages), true);
  messages = [];
  pair(messages, 1, 5, 6, 600);
  assert.equal(orderedSnapshot(state, 10, 1, 20, messages), false);
  assert.equal(state.snapshot(true).deck1.positionSeconds, 90);

  assert.equal(state.beginSession(11), true);
  assert.equal(state.receive(deckMessage(1, 0, 3), 10), false);
  assert.equal(state.receive(deckMessage(1, 15, 22), 10), false);
  assert.equal(state.snapshot(true).deck1.positionSeconds, null);
  messages = [deckMessage(1, 0, 1)];
  pair(messages, 1, 5, 6, 100);
  assert.equal(orderedSnapshot(state, 11, 1, 1, messages), true);
  assert.equal(state.snapshot(true).deck1.positionSeconds, 10);
});

test("M20 mapping commits continuous position snapshots and blocks seeks while scratching", () => {
  const script = fs.readFileSync(path.resolve("tools/mixxx/BRMedia-Mixxx-M7-Live-Engine-scripts.js"), "utf8");
  const xml = fs.readFileSync(path.resolve("tools/mixxx/BRMedia-Mixxx-M7-Live-Engine.midi.xml"), "utf8");
  assert.match(script, /sendPosition[\s\S]*commitDeck\(deck\)/);
  assert.match(script, /beginTimer\(250/);
  assert.match(script, /scratch2_enable[\s\S]*scratch_position_enable[\s\S]*setParameter\(group, "playposition"/);
  assert.match(script, /end_of_track/);
  assert.match(script, /engine\.setValue\(group, "play", 1\)/);
  assert.match(script, /pause[\s\S]*engine\.setValue\(group, "play", 0\)/);
  assert.match(script, /stop[\s\S]*engine\.setValue\(group, "play", 0\)[\s\S]*engine\.setParameter\(group, "playposition", 0\)/);
  assert.doesNotMatch(script, /start_stop/);
  assert.match(xml, /BRMediaMixxxM7\.pause[\s\S]*0x12/);
  assert.match(xml, /BRMediaMixxxM7\.stop[\s\S]*0x13/);
});

test("M20 cue hold preserves down/up state instead of collapsing to an immediate pulse", async () => {
  const { bridge, output } = authoritativeBridge();
  output.sent = [];
  assert.equal((await post("/api/dj/mixxx/deck/1/cue-down", bridge)).status, 200);
  assert.deepEqual(output.sent, [[0x90, 0x11, 127]]);
  assert.equal((await post("/api/dj/mixxx/deck/1/cue-up", bridge)).status, 200);
  assert.deepEqual(output.sent, [[0x90, 0x11, 127], [0x90, 0x11, 0]]);
});

test("M20 backend handshake waits boundedly for protocol v5 without weakening authority", async () => {
  const bridge = new MixxxMidiBridge({ input: () => new Input(), output: () => new Output() });
  bridge.open();
  setTimeout(() => {
    bridge.receiveFeedbackForTest([0x90, 0x71, 5]);
    bridge.receiveFeedbackForTest([0x90, 0x70, 127]);
  }, 25);
  const ready = await waitForMixxxHandshake(bridge, 300, 10);
  assert.equal(ready.protocolCompatible, true);
  assert.equal(ready.heartbeatHealthy, true);
  assert.equal(ready.effectiveBackend, "brmedia-native");
  bridge.setMode("mixxx", false);
  assert.equal(bridge.status().effectiveBackend, "mixxx");

  const unavailable = new MixxxMidiBridge({ input: () => new Input(), output: () => new Output() });
  unavailable.open();
  const rejected = await waitForMixxxHandshake(unavailable, 30, 10);
  assert.equal(rejected.protocolCompatible, false);
  assert.throws(() => unavailable.setMode("mixxx", false), /Protocol v5/);
});

test("M20 frontend keeps Native default and routes bounded transport and seek only in Mixxx mode", () => {
  const frontend = fs.readFileSync(path.resolve("server/public/dj-mixer/components/mixxx-backend-m3.js"), "utf8");
  const app = fs.readFileSync(path.resolve("server/public/dj-mixer/app.js"), "utf8");
  assert.match(frontend, /effectiveBackend = "brmedia-native"/);
  assert.match(frontend, /\["play", "pause", "stop", "cue"\]\.includes\(transportAction\)/);
  assert.match(frontend, /action === "play" && liveDecks\[safeDeck\]\?\.playing === true \? "pause"/);
  assert.match(frontend, /safePosition < 0 \|\| safePosition > 1/);
  assert.match(frontend, /deck\.remainingSeconds/);
  assert.match(frontend, /button\.disabled = unavailable \|\| !loaded/);
  assert.match(app, /BRMediaMixxxBackend\?\.transport\?\.\(config\.deckId, "play"\)/);
});

test("M20 blocks Native-only library loading while Mixxx is authoritative", () => {
  const frontend = fs.readFileSync(path.resolve("server/public/dj-mixer/app.js"), "utf8");
  const adapter = fs.readFileSync(path.resolve("server/public/dj-mixer/components/mixxx-backend-m3.js"), "utf8");
  assert.match(frontend, /BRMediaMixxxBackend\?\.isActive\?\.\(\) === true[\s\S]*Arbitrary BRMedia file-path loading is unavailable/);
  assert.match(adapter, /data-dj-library-load/);
  assert.match(adapter, /mixxxLoadUnavailable/);
  assert.match(adapter, /button\.disabled = true/);
});

test("M20 renders phone deck time and exposes bounded frontend feedback diagnostics", () => {
  const frontend = fs.readFileSync(path.resolve("server/public/dj-mixer/components/mixxx-backend-m3.js"), "utf8");
  const app = fs.readFileSync(path.resolve("server/public/dj-mixer/app.js"), "utf8");
  assert.match(frontend, /brDjSingleWavePills/);
  assert.match(frontend, /remainingSeconds/);
  assert.match(frontend, /positionSeconds/);
  assert.match(frontend, /getDiagnostics/);
  assert.match(frontend, /mixxxFeedbackRenderCount/);
  assert.match(app, /is-mixxx-position-live/);
  assert.match(app, /mixxxPositionSeconds/);
});
