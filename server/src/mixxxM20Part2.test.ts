import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { test } from "node:test";
import {
  handleMixxxMidiRoute, MIXXX_MIDI_PORT_NAME, MixxxMidiBridge,
  type MidiInputPort, type MidiOutputPort,
} from "./mixxxBridge";
import { MixxxLiveState } from "./mixxxLiveState";
import {
  BRMEDIA_MIXXX_M20_CONTROLS, BRMEDIA_MIXXX_M20_FEEDBACK,
  BRMEDIA_MIXXX_M7_FEEDBACK, BRMEDIA_MIXXX_MIXER_FEEDBACK,
} from "./mixxxProtocol";

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
function authoritative() {
  const output = new Output();
  const bridge = new MixxxMidiBridge({ input: () => new Input(), output: () => output });
  bridge.open();
  bridge.receiveFeedbackForTest([0x90, 0x71, 5]);
  bridge.receiveFeedbackForTest([0x90, 0x70, 127]);
  bridge.receiveFeedbackForTest([0x90, 0x30, 1]);
  bridge.receiveFeedbackForTest([0x90, 0x3f, 1]);
  bridge.setMode("mixxx", false);
  output.sent = [];
  return { bridge, output };
}

test("M20 Part 2 mixer controls preserve gain/EQ/filter semantics and add independent mute", async () => {
  const { bridge, output } = authoritative();
  for (const [control, value] of [
    ["gain", 2 / 3], ["volume", 0.75], ["eq-high", 2 / 3],
    ["eq-mid", 2 / 3], ["eq-low", 2 / 3], ["filter", 0.5], ["mute", 1],
  ] as const)
    assert.equal((await post(`/api/dj/mixxx/deck/1/mixer/${control}`, bridge, { value })).status, 200);
  assert.equal((await post("/api/dj/mixxx/mixer/crossfader", bridge, { value: 0.5 })).status, 200);
  assert.equal((await post("/api/dj/mixxx/mixer/master-volume", bridge, { value: 2 / 3 })).status, 200);
  assert.ok(output.sent.some(message => message[0] === 0xb0 && message[1] === 0x67 && message[2] === 127));
  assert.ok(output.sent.some(message => message[0] === 0xb0 && message[1] === 0x50 && message[2] === 64));
  assert.equal((await post("/api/dj/mixxx/deck/2/mixer/mute", bridge, { value: 2 })).status, 400);
});

test("M20 Part 2 cue, hotcue, loop and sized beat-jump commands are bounded", async () => {
  const { bridge, output } = authoritative();
  assert.equal((await post("/api/dj/mixxx/deck/1/performance/cue-return", bridge)).status, 200);
  assert.equal((await post("/api/dj/mixxx/deck/1/performance/cue-set", bridge)).status, 200);
  assert.equal((await post("/api/dj/mixxx/deck/1/hotcue/3/set", bridge)).status, 200);
  assert.equal((await post("/api/dj/mixxx/deck/1/hotcue/3/trigger", bridge)).status, 200);
  assert.equal((await post("/api/dj/mixxx/deck/1/hotcue/3/clear", bridge)).status, 200);
  assert.equal((await post("/api/dj/mixxx/deck/1/performance/loop-halve", bridge)).status, 200);
  assert.equal((await post("/api/dj/mixxx/deck/1/performance/loop-double", bridge)).status, 200);
  assert.equal((await post("/api/dj/mixxx/deck/1/performance/beat-jump-forward", bridge, { beats: 8 })).status, 200);
  assert.equal((await post("/api/dj/mixxx/deck/1/performance/beat-jump-back", bridge, { beats: 0 })).status, 400);
  const p = BRMEDIA_MIXXX_M20_CONTROLS;
  assert.ok(output.sent.some(message => message[0] === p.status && message[1] === p.offsets.hotcueClear && message[2] === 3));
  assert.ok(output.sent.some(message => message[0] === p.status && message[1] === p.offsets.beatJumpSize));
});

test("M20 Part 2 explicit sync, tempo and supported effect controls validate authority", async () => {
  const { bridge, output } = authoritative();
  assert.equal((await post("/api/dj/mixxx/deck/2/performance/sync", bridge, { enabled: true })).status, 200);
  assert.equal((await post("/api/dj/mixxx/deck/2/tempo/rate", bridge, { value: -0.08 })).status, 200);
  assert.equal((await post("/api/dj/mixxx/deck/2/tempo/range", bridge, { value: 0.16 })).status, 200);
  assert.equal((await post("/api/dj/mixxx/deck/2/effect/enabled", bridge, { enabled: true })).status, 200);
  assert.equal((await post("/api/dj/mixxx/deck/2/effect/mix", bridge, { value: 0.4 })).status, 200);
  assert.equal((await post("/api/dj/mixxx/deck/2/effect/parameter-1", bridge, { value: 0.6 })).status, 200);
  assert.equal((await post("/api/dj/mixxx/deck/2/tempo/rate", bridge, { value: 1.1 })).status, 400);
  assert.equal((await post("/api/dj/mixxx/deck/2/effect/mix", bridge, { value: -1 })).status, 400);
  assert.ok(output.sent.every(message => [0xb4].includes(message[0])));
  bridge.close();
  assert.equal((await post("/api/dj/mixxx/deck/2/effect/enabled", bridge, { enabled: true })).status, 409);
  assert.equal(bridge.status().effectiveBackend, "brmedia-native");
});

test("M20 Part 2 cannot select Mixxx authority without protocol v5 and heartbeat", () => {
  const bridge = new MixxxMidiBridge({ input: () => new Input(), output: () => new Output() });
  bridge.open();
  assert.throws(() => bridge.setMode("mixxx", false), /Protocol v5/);
  assert.equal(bridge.status().effectiveBackend, "brmedia-native");
});

test("M20 Part 2 professional feedback covers VU, clipping, cue, loop, hotcue, sync and effects per deck", () => {
  const state = new MixxxLiveState();
  assert.equal(state.beginSession(30), true);
  const m20 = BRMEDIA_MIXXX_M20_FEEDBACK, m7 = BRMEDIA_MIXXX_M7_FEEDBACK;
  const receive = (message: number[]) => assert.equal(state.receive(message, 30), true);
  receive([BRMEDIA_MIXXX_MIXER_FEEDBACK.status, BRMEDIA_MIXXX_MIXER_FEEDBACK.deck1Meter, 100]);
  receive([BRMEDIA_MIXXX_MIXER_FEEDBACK.status, BRMEDIA_MIXXX_MIXER_FEEDBACK.deck1Clipping, 127]);
  receive([BRMEDIA_MIXXX_MIXER_FEEDBACK.status, BRMEDIA_MIXXX_MIXER_FEEDBACK.masterMeterLeft, 90]);
  receive([BRMEDIA_MIXXX_MIXER_FEEDBACK.status, BRMEDIA_MIXXX_MIXER_FEEDBACK.masterClipping, 127]);
  receive([m7.status, m7.deck1Base + m7.offsets.syncEnabled, 127]);
  receive([m7.status, m7.deck1Base + m7.offsets.syncLeader, 127]);
  receive([m7.status, m7.deck1Base + m7.offsets.loopActive, 127]);
  receive([m7.status, m7.deck1Base + m7.offsets.fxMix, 64]);
  receive([m7.status, m7.deck1Base + m7.offsets.fxEnabled, 127]);
  receive([m20.status, m20.deck1Base + m20.offsets.cuePositionHigh, 32]);
  receive([m20.status, m20.deck1Base + m20.offsets.cuePositionLow, 0]);
  receive([m20.status, m20.deck1Base + m20.offsets.loopStartHigh, 16]);
  receive([m20.status, m20.deck1Base + m20.offsets.loopStartLow, 0]);
  receive([m20.status, m20.deck1Base + m20.offsets.loopEndHigh, 48]);
  receive([m20.status, m20.deck1Base + m20.offsets.loopEndLow, 0]);
  receive([m20.status, m20.deck1Base + m20.offsets.beatJumpSize, 88]);
  receive([m20.status, m20.deck1Base + m20.offsets.mute, 127]);
  receive([m20.status, m20.deck1Base + m20.offsets.fxParameter1, 95]);
  receive([m20.status, m20.deck1Base + m20.offsets.hotcueStateBase + 2, 127]);
  const snapshot = state.snapshot(true), deck = snapshot.deck1;
  assert.ok(deck.mixer.meter! > 0.78 && deck.mixer.clipping && deck.mixer.mute);
  assert.ok(snapshot.mixer.masterMeterLeft! > 0.7 && snapshot.mixer.masterClipping);
  assert.equal(deck.performance.syncEnabled, true);
  assert.equal(deck.performance.syncLeader, true);
  assert.equal(snapshot.syncMasterDeck, 1);
  assert.equal(deck.performance.follower, false);
  assert.equal(deck.performance.loopActive, true);
  assert.ok(deck.performance.cuePositionNormalised! > 0.24);
  assert.ok(deck.performance.loopStartNormalised! > 0.12);
  assert.ok(deck.performance.loopEndNormalised! > 0.37);
  assert.equal(deck.performance.beatJumpSizeBeats, 8);
  assert.equal(deck.performance.hotCueStates[2], 127);
  assert.ok(deck.performance.fxMix! > 0.5);
  assert.ok(deck.performance.fxParameter1! > 0.74);
  assert.equal(snapshot.deck2.performance.hotCueStates[2], null);
});

test("M20 Part 2 mapping and frontend expose only structured v5 controls", () => {
  const script = fs.readFileSync(path.resolve("tools/mixxx/BRMedia-Mixxx-M7-Live-Engine-scripts.js"), "utf8");
  const xml = fs.readFileSync(path.resolve("tools/mixxx/BRMedia-Mixxx-M7-Live-Engine.midi.xml"), "utf8");
  const frontend = fs.readFileSync(path.resolve("server/public/dj-mixer/components/mixxx-backend-m3.js"), "utf8");
  const app = fs.readFileSync(path.resolve("server/public/dj-mixer/app.js"), "utf8");
  assert.match(script, /professionalInput/);
  assert.match(script, /hotcue_" \+ cue \+ suffix/);
  assert.match(script, /loop_halve/);
  assert.match(script, /loop_double/);
  assert.match(script, /beatjump_size/);
  assert.match(script, /sync_enabled/);
  assert.match(script, /EffectRack1_EffectUnit/);
  assert.match(script, /scratch2_enable[\s\S]*scratch_position_enable/);
  assert.match(script, /rateRange"\) \* 16383/);
  assert.match(xml, /<status>0xb4<\/status>/);
  assert.match(script, /engine\.loadTrack/);
  assert.doesNotMatch(script, /collection\.db|sqlite/i);
  assert.match(frontend, /BRMediaMixxxBackend\.effect/);
  assert.match(frontend, /recentCommands/);
  assert.match(frontend, /manualLoop/);
  assert.match(frontend, /linkedTransport/);
  assert.match(frontend, /cue-\$\{pressed \? "down" : "up"\}/);
  assert.match(app, /BRMediaMixxxBackend\?\.tempo/);
  assert.match(app, /hotcueAction\(config\.deckId, cue, action\)/);
  assert.match(app, /BRMediaMixxxBackend\?\.manualLoop/);
  assert.match(app, /\$\$\(`\$\{selector\} \.brDjMixerVolumeRange`\)\.forEach/);
  assert.match(frontend, /effectiveBackend = "brmedia-native"/);
});
