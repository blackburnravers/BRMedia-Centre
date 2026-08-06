import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { MixxxLiveState, sanitiseMixxxMetadata, sanitiseMixxxSourceIdentifier } from "./mixxxLiveState";
import {
  BRMEDIA_MIXXX_FEEDBACK,
  BRMEDIA_MIXXX_MESSAGES,
  BRMEDIA_MIXXX_PROTOCOL,
} from "./mixxxProtocol";

function message(deck: 1 | 2, offset: number, value: number) {
  return [0x90, (deck === 1 ? 0x30 : 0x40) + offset, value];
}
function pair(state: MixxxLiveState, deck: 1 | 2, high: number, low: number, raw: number) {
  state.receive(message(deck, high, (raw >> 7) & 0x7f));
  state.receive(message(deck, low, raw & 0x7f));
}
function sysex(deck: 1 | 2, field: number, value: string) {
  const bytes = Buffer.from(value, "utf8");
  const nibbles = Array.from(bytes).flatMap(byte => [byte >> 4, byte & 15]);
  return [0xf0, 0x7d, 0x42, 0x52, 0x4d, 2, deck, field, 0, 1, ...nibbles, 0xf7];
}

test("M5 protocol v2 preserves every M4 transport assignment", () => {
  assert.ok(BRMEDIA_MIXXX_PROTOCOL.version >= 2);
  assert.deepEqual(BRMEDIA_MIXXX_MESSAGES.deck1Play, [0x90, 0x10]);
  assert.deepEqual(BRMEDIA_MIXXX_MESSAGES.deck1Cue, [0x90, 0x11]);
  assert.deepEqual(BRMEDIA_MIXXX_MESSAGES.deck2Play, [0x90, 0x20]);
  assert.deepEqual(BRMEDIA_MIXXX_MESSAGES.deck2Cue, [0x90, 0x21]);
  assert.deepEqual(BRMEDIA_MIXXX_MESSAGES.crossfader, [0xb0, 0x50]);
});

test("M5 heartbeat, version and timeout drive explicit stale state", () => {
  let now = 1_000;
  const state = new MixxxLiveState(() => now, 5_000);
  state.receive([0x90, 0x71, 2]);
  state.receive([0x90, 0x70, 127]);
  state.receive(message(1, 0, 1));
  let snapshot = state.snapshot(true);
  assert.equal(snapshot.protocolCompatible, true);
  assert.equal(snapshot.heartbeatHealthy, true);
  assert.equal(snapshot.stale, false);
  now += 5_001;
  snapshot = state.snapshot(true);
  assert.equal(snapshot.heartbeatHealthy, false);
  assert.equal(snapshot.deck1.stale, true);
});

test("M5 Deck 1 and Deck 2 remain isolated", () => {
  const state = new MixxxLiveState();
  state.receive([0x90, 0x70, 127]);
  state.receive(message(1, 0, 3));
  state.receive(message(2, 0, 1));
  pair(state, 1, 7, 8, 1700);
  pair(state, 2, 7, 8, 1280);
  const snapshot = state.snapshot(true);
  assert.equal(snapshot.deck1.playing, true);
  assert.equal(snapshot.deck2.playing, false);
  assert.equal(snapshot.deck1.analysedBpm, 170);
  assert.equal(snapshot.deck2.analysedBpm, 128);
});

test("M5 loaded and unloaded transitions clear session values safely", () => {
  const state = new MixxxLiveState();
  state.receive([0x90, 0x70, 127]);
  state.receive(message(1, 0, 3));
  pair(state, 1, 3, 4, 2500);
  assert.equal(state.snapshot(true).deck1.durationSeconds, 250);
  state.receive(message(1, 0, 0));
  const deck = state.snapshot(true).deck1;
  assert.equal(deck.loaded, false);
  assert.equal(deck.playing, false);
  assert.equal(deck.durationSeconds, null);
  assert.equal(deck.positionSeconds, null);
});

test("M5 metadata is Unicode-safe, bounded and sanitised", () => {
  const state = new MixxxLiveState();
  state.receive([0x90, 0x70, 127]);
  assert.equal(state.receive(sysex(1, BRMEDIA_MIXXX_FEEDBACK.metadataSysex.fields.title, " Tést\u0000 Tune\n")), true);
  assert.equal(state.snapshot(true).deck1.title, "Tést Tune");
  assert.equal(sanitiseMixxxMetadata("a".repeat(200))?.length, 96);
  assert.equal(sanitiseMixxxMetadata(123), null);
  assert.equal(sanitiseMixxxMetadata("\u0000\n"), null);
  assert.equal(sanitiseMixxxSourceIdentifier("C:\\\\Music\\\\private\\\\track.flac"), "track.flac");
});

test("M5 duration, positions, BPM and rate decode independently", () => {
  const state = new MixxxLiveState();
  state.receive([0x90, 0x70, 127]);
  state.receive(message(1, 0, 1));
  pair(state, 1, 1, 2, 16_383);
  pair(state, 1, 3, 4, 3_600);
  pair(state, 1, 5, 6, 1_234);
  pair(state, 1, 7, 8, 1_700);
  pair(state, 1, 9, 10, 1_734);
  pair(state, 1, 11, 12, 8_192 + 410);
  pair(state, 1, 13, 14, 327);
  const deck = state.snapshot(true).deck1;
  assert.equal(deck.positionNormalised, 1);
  assert.equal(deck.durationSeconds, 360);
  assert.equal(deck.positionSeconds, 123.4);
  assert.equal(deck.analysedBpm, 170);
  assert.equal(deck.liveBpm, 173.4);
  assert.ok(deck.rate! > 0.049 && deck.rate! < 0.051);
  assert.ok(deck.pitchRange! > 0.079 && deck.pitchRange! < 0.081);
});

test("M5 unavailable numeric values remain null", () => {
  const state = new MixxxLiveState();
  state.receive([0x90, 0x70, 127]);
  state.receive(message(1, 0, 1));
  pair(state, 1, 3, 4, 0);
  pair(state, 1, 7, 8, 0);
  pair(state, 1, 9, 10, 0);
  const deck = state.snapshot(true).deck1;
  assert.equal(deck.durationSeconds, null);
  assert.equal(deck.analysedBpm, null);
  assert.equal(deck.liveBpm, null);
  assert.equal(deck.title, null);
});

test("M5 disconnect is stale and valid feedback safely recovers", () => {
  let now = 2_000;
  const state = new MixxxLiveState(() => now);
  state.receive([0x90, 0x70, 127]);
  state.receive(message(2, 0, 1));
  assert.equal(state.snapshot(true).deck2.stale, false);
  assert.equal(state.snapshot(false).deck2.stale, true);
  now += 500;
  state.receive([0x90, 0x70, 127]);
  state.receive(message(2, 0, 3));
  assert.equal(state.snapshot(true).deck2.stale, false);
  assert.equal(state.snapshot(true).deck2.playing, true);
});

test("M5 mapping adds feedback only, with no new inbound controls", () => {
  const script = fs.readFileSync(path.resolve("tools/mixxx/BRMedia-Mixxx-M5-Bridge-scripts.js"), "utf8");
  const xml = fs.readFileSync(path.resolve("tools/mixxx/BRMedia-Mixxx-M5-Bridge.midi.xml"), "utf8");
  const bridge = fs.readFileSync(path.resolve("server/src/mixxxBridge.ts"), "utf8");
  assert.match(script, /engine\.makeConnection/);
  assert.match(script, /engine\.beginTimer\(250/);
  assert.match(script, /engine\.beginTimer\(2000/);
  assert.doesNotMatch(script, /loadTrack|beatsync|hotcue|loop_|equalizer|EffectRack/);
  assert.equal((script.match(/engine\.setValue/g) || []).length, 1);
  assert.match(script, /engine\.setValue\(group, "cue_default"/);
  assert.equal((xml.match(/<control>/g) || []).length, 5);
  assert.doesNotMatch(bridge, /sqlite|mixxxdb|collection\.db|INSERT\s+INTO|UPDATE\s+tracks/i);
});

test("M5 frontend is backend-isolated and uses bounded polling", () => {
  const frontend = fs.readFileSync(path.resolve("server/public/dj-mixer/components/mixxx-backend-m3.js"), "utf8");
  const performance = fs.readFileSync(path.resolve("server/public/dj-mixer/performance.html"), "utf8");
  assert.match(frontend, /effectiveBackend !== "mixxx"/);
  assert.match(frontend, /setInterval\(\(\) => void poll\(\), 250\)/);
  assert.match(frontend, /Mixxx state unavailable/);
  assert.match(frontend, /Metadata unavailable/);
  assert.match(performance, /v=20260729-m15-waveform-validation/);
});
