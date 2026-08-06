import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test } from "node:test";
import { decodeMixxxLoadFeedbackSysex, encodeMixxxLoadRequestSysex, MIXXX_M2_MESSAGES, MIXXX_MIDI_PORT_NAME, MixxxMidiBridge,
  type MidiInputPort, type MidiOutputPort, type MidiPortFactory } from "./mixxxBridge";

class MockInput extends EventEmitter implements MidiInputPort {
  closed = false; ignore: [boolean, boolean, boolean] | null = null; constructor(private ports: string[]) { super(); }
  getPortCount() { return this.ports.length; } getPortName(i: number) { return this.ports[i]; }
  openPort(i: number) { if (!this.ports[i]) throw new Error("missing input"); }
  closePort() { this.closed = true; }
  ignoreTypes(sysex: boolean, timing: boolean, sensing: boolean) { this.ignore = [sysex, timing, sensing]; }
}
class MockOutput implements MidiOutputPort {
  closed = false; disconnected = false; sent: number[][] = [];
  constructor(private ports: string[]) {}
  getPortCount() { return this.ports.length; } getPortName(i: number) { return this.ports[i]; }
  openPort(i: number) { if (!this.ports[i]) throw new Error("missing output"); }
  closePort() { this.closed = true; }
  sendMessage(m: number[]) { if (this.disconnected) throw new Error("loopMIDI disconnected"); this.sent.push(m); }
}
function fixture(ports = [MIXXX_MIDI_PORT_NAME]) {
  const inputs: MockInput[] = [], outputs: MockOutput[] = [];
  const factory: MidiPortFactory = {
    input: () => { const x = new MockInput(ports); inputs.push(x); return x; },
    output: () => { const x = new MockOutput(ports); outputs.push(x); return x; },
  };
  return { bridge: new MixxxMidiBridge(factory), inputs, outputs };
}
test("default mode is native and bridge is disabled", () => {
  const s = fixture().bridge.status(); assert.equal(s.mode, "native"); assert.equal(s.enabled, false); assert.equal(s.connected, false);
});
test("missing port is safely unavailable", () => {
  const s = fixture(["Other"]).bridge.open(); assert.equal(s.enabled, false); assert.equal(s.connected, false); assert.match(s.lastError || "", /unavailable/);
});
test("open and close lifecycle", () => {
  const { bridge } = fixture(); assert.equal(bridge.open().connected, true); assert.equal(bridge.close().connected, false); assert.equal(bridge.status().mode, "native");
});
test("native mode blocks sends and active native playback blocks switching", () => {
  const { bridge } = fixture(); bridge.open(); assert.throws(() => bridge.send("deck1Play"), /Native mode/);
  assert.throws(() => bridge.setMode("mixxx", true), /Stop all/); assert.equal(bridge.status().mode, "native");
});
test("fixed M2 messages send after explicit safe selection", () => {
  const { bridge, outputs } = fixture(); bridge.open();
  bridge.receiveFeedbackForTest([0x90, 0x71, 5]); bridge.receiveFeedbackForTest([0x90, 0x70, 127]);
  bridge.setMode("mixxx", false);
  bridge.send("deck1Play"); bridge.send("deck2Cue"); bridge.send("crossfader", 64);
  assert.deepEqual(outputs[outputs.length - 1]?.sent, [[...MIXXX_M2_MESSAGES.deck1Play, 127], [...MIXXX_M2_MESSAGES.deck2Cue, 127], [...MIXXX_M2_MESSAGES.deck2Cue, 0], [...MIXXX_M2_MESSAGES.crossfader, 64]]);
  assert.equal("raw" in MIXXX_M2_MESSAGES, false);
});
test("feedback is recorded", () => {
  const { bridge, inputs } = fixture(); bridge.open(); inputs[inputs.length - 1]?.emit("message", 0, [0x90, 0x7f, 127]);
  assert.ok(bridge.status().lastFeedbackAt); assert.deepEqual(bridge.status().lastFeedback, [0x90, 0x7f, 127]);
});
test("disconnect falls back to native", () => {
  const { bridge, outputs } = fixture(); bridge.open();
  bridge.receiveFeedbackForTest([0x90, 0x71, 5]); bridge.receiveFeedbackForTest([0x90, 0x70, 127]);
  bridge.setMode("mixxx", false); outputs[outputs.length - 1]!.disconnected = true;
  assert.throws(() => bridge.send("heartbeat"), /disconnected/); const s = bridge.status();
  assert.equal(s.connected, false); assert.equal(s.enabled, false); assert.equal(s.mode, "native");
});
test("shutdown cleanup has no database surface", () => {
  const { bridge, inputs, outputs } = fixture(); bridge.open(); bridge.shutdown();
  assert.equal(inputs[inputs.length - 1]?.closed, true); assert.equal(outputs[outputs.length - 1]?.closed, true);
  assert.equal(Object.getOwnPropertyNames(Object.getPrototypeOf(bridge)).some(x => /sqlite|database|file/i.test(x)), false);
});
test("M23 load SysEx carries the canonical path only inside the bridge and decodes acknowledgement identity", () => {
  const request = encodeMixxxLoadRequestSysex(2, "request_0001", "H:\\Music\\Artist £\\Track.mp3", false);
  assert.deepEqual(request.slice(0, 6), [0xf0, 0x7d, 0x42, 0x52, 0x4d, 0x20]);
  assert.ok(request.slice(6, -1).every((value) => value >= 0 && value <= 15));
  const payload = Buffer.from(request.slice(6, -1).reduce<number[]>((bytes, value, index, values) => {
    if (index % 2 === 0) bytes.push((value << 4) | values[index + 1]); return bytes;
  }, [])).toString("utf8");
  assert.deepEqual(JSON.parse(payload), { v: 1, d: 2, r: "request_0001", p: "H:\\Music\\Artist £\\Track.mp3", a: false, x: false });
  const id = Buffer.from("request_0001"); const nibbles = [...id].flatMap((value) => [(value >> 4) & 15, value & 15]);
  assert.deepEqual(decodeMixxxLoadFeedbackSysex([0xf0, 0x7d, 0x42, 0x52, 0x4d, 0x21, 2, 2, ...nibbles, 0xf7], 9),
    { requestId: "request_0001", deck: 2, state: "loaded", sessionEpoch: 9 });
});
test("M23 bridge requires a live capability heartbeat and enables SysEx reception", () => {
  const { bridge, inputs, outputs } = fixture(); bridge.open();
  const input = inputs[inputs.length - 1]!;
  assert.deepEqual(input.ignore, [false, true, true]);
  input.emit("message", 0, [0x90, 0x71, 5]); input.emit("message", 0, [0x90, 0x70, 127]); input.emit("message", 0, [0x90, 0x73, 1]);
  bridge.setMode("mixxx", false); bridge.sendM23Load(1, "H:\\Music\\Track.mp3", "request_0001", false);
  const sent = outputs[outputs.length - 1]!.sent;
  assert.equal(sent[sent.length - 1]?.[5], 0x20);
});

test("M23 reliable short acknowledgement binds to the exact pending deck request", () => {
  const { bridge, inputs } = fixture(); bridge.open(); const input = inputs[inputs.length - 1]!;
  input.emit("message", 0, [0x90, 0x71, 5]); input.emit("message", 0, [0x90, 0x70, 127]); input.emit("message", 0, [0x90, 0x73, 1]);
  bridge.setMode("mixxx", false); const feedback: any[] = []; bridge.onLoadFeedback(value => feedback.push(value));
  bridge.sendM23Load(2, "H:\\Music\\Track.mp3", "request_short_2", false);
  input.emit("message", 0, [0x90, 0x75, 1]); input.emit("message", 0, [0x90, 0x75, 2]);
  assert.deepEqual(feedback, [
    { requestId: "request_short_2", deck: 2, state: "accepted", sessionEpoch: 1 },
    { requestId: "request_short_2", deck: 2, state: "loaded", sessionEpoch: 1 },
  ]);
  input.emit("message", 0, [0x90, 0x74, 2]); assert.equal(feedback.length, 2);
});

test("confirmed M23 identity enriches the public deck payload and unload clears it", () => {
  const { bridge, inputs } = fixture(); bridge.open();
  const input = inputs[inputs.length - 1]!;
  input.emit("message", 0, [0x90, 0x30, 1]); input.emit("message", 0, [0x90, 0x3f, 1]);
  bridge.attachLoadedIdentity(1, {
    stableIdentity: "mixxx:31684",
    title: "Exact title", artist: "Exact artist", album: "Exact album", genre: "Hardcore",
    filename: "Exact file.mp3", artworkUrl: "/api/dj/mixxx/catalogue/mixxx%3A31684/artwork",
    waveformAssociation: { brmediaTrackId: "trk_exact", waveformAvailable: false, gridAvailable: false },
  });
  const loaded = bridge.feedbackStatus().deck1 as any;
  assert.equal(loaded.stableIdentity, "mixxx:31684");
  assert.equal(loaded.title, "Exact title");
  assert.equal(loaded.artist, "Exact artist");
  assert.match(loaded.artworkUrl, /mixxx%3A31684\/artwork/);
  assert.deepEqual(loaded.waveformAssociation, { brmediaTrackId: "trk_exact", waveformAvailable: false, gridAvailable: false });
  input.emit("message", 0, [0x90, 0x30, 0]); input.emit("message", 0, [0x90, 0x3f, 2]);
  const unloaded = bridge.feedbackStatus().deck1 as any;
  assert.equal(unloaded.loaded, false);
  assert.equal(unloaded.stableIdentity, undefined);
});

test("M23 paused unload is deck-specific, duplicate-safe, and clears only after confirmed snapshot", () => {
  const { bridge, inputs, outputs } = fixture(); bridge.open(); const input = inputs[inputs.length - 1]!;
  input.emit("message", 0, [0x90, 0x71, 5]); input.emit("message", 0, [0x90, 0x70, 127]);
  input.emit("message", 0, [0x90, 0x30, 1]); input.emit("message", 0, [0x90, 0x3f, 1]);
  input.emit("message", 0, [0x90, 0x40, 1]); input.emit("message", 0, [0x90, 0x4f, 1]);
  bridge.setMode("mixxx", false);
  bridge.attachLoadedIdentity(1, { stableIdentity: "mixxx:1", title: "D1", artist: null, album: null, genre: null, filename: null, artworkUrl: null, waveformAssociation: null });
  bridge.attachLoadedIdentity(2, { stableIdentity: "mixxx:2", title: "D2", artist: null, album: null, genre: null, filename: null, artworkUrl: null, waveformAssociation: null });
  bridge.sendUnload(1, "unload_0001", false); bridge.sendUnload(1, "unload_0001", false);
  assert.equal(outputs[outputs.length - 1]!.sent.filter((message: number[]) => message[1] === 0x14).length, 1);
  assert.equal((bridge.feedbackStatus().deck1 as any).stableIdentity, "mixxx:1");
  input.emit("message", 0, [0x90, 0x30, 0]);
  assert.equal((bridge.feedbackStatus().deck1 as any).stableIdentity, "mixxx:1");
  input.emit("message", 0, [0x90, 0x3f, 2]);
  assert.equal((bridge.feedbackStatus().deck1 as any).stableIdentity, undefined);
  assert.equal((bridge.feedbackStatus().deck2 as any).stableIdentity, "mixxx:2");
  assert.equal(bridge.status().mode, "mixxx");
});

test("M23 D2 unload and playing confirmation guard preserve the track on cancel", () => {
  const { bridge, inputs, outputs } = fixture(); bridge.open(); const input = inputs[inputs.length - 1]!;
  input.emit("message", 0, [0x90, 0x71, 5]); input.emit("message", 0, [0x90, 0x70, 127]);
  input.emit("message", 0, [0x90, 0x40, 3]); input.emit("message", 0, [0x90, 0x4f, 1]); bridge.setMode("mixxx", false);
  assert.throws(() => bridge.sendUnload(2, "unload_0002", false), /confirmation required/i);
  assert.equal(outputs[outputs.length - 1]!.sent.some((message: number[]) => message[1] === 0x24), false);
  assert.equal(bridge.feedbackStatus().deck2.loaded, true);
  bridge.sendUnload(2, "unload_0003", true);
  const sent = outputs[outputs.length - 1]!.sent;
  assert.deepEqual(sent[sent.length - 1], [0x90, 0x24, 126]);
});

test("disconnect during unload rejects stale pending state and falls back safely", () => {
  const { bridge, inputs, outputs } = fixture(); bridge.open(); const input = inputs[inputs.length - 1]!;
  input.emit("message", 0, [0x90, 0x71, 5]); input.emit("message", 0, [0x90, 0x70, 127]);
  input.emit("message", 0, [0x90, 0x30, 1]); input.emit("message", 0, [0x90, 0x3f, 1]); bridge.setMode("mixxx", false);
  outputs[outputs.length - 1]!.disconnected = true;
  assert.throws(() => bridge.sendUnload(1, "unload_0004", false), /disconnected/);
  assert.equal(bridge.status().mode, "native"); assert.equal(bridge.status().connected, false);
});
