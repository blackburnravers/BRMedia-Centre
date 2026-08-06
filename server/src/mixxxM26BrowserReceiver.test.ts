import test from "node:test";
import assert from "node:assert/strict";

const receiverApi = require("../public/dj-mixer/engine/m26-master-receiver.js");
const transportApi = require("../public/dj-mixer/engine/m26-pcm-http-transport.js");

function streamBytes(sequence = 1, capturedAt = 1000) {
  const bytes = new Uint8Array(24 + 24 + 8);
  const view = new DataView(bytes.buffer);
  bytes.set(Buffer.from("BRM26PCM"), 0); view.setUint16(8, 1, true); view.setUint16(10, 24, true);
  view.setUint32(12, 48000, true); view.setUint16(16, 2, true); view.setUint16(18, 1, true); view.setUint32(20, 960, true);
  bytes.set(Buffer.from("M26F"), 24); view.setUint32(28, sequence, true); view.setFloat64(32, capturedAt, true);
  view.setUint32(40, 8, true); view.setUint16(44, 0, true); view.setUint16(46, 0, true);
  view.setInt16(48, -32768, true); view.setInt16(50, 0, true); view.setInt16(52, 16384, true); view.setInt16(54, 32767, true);
  return bytes;
}

test("M26 PCM parser accepts fragmented authenticated stream framing", () => {
  const frames: any[] = [];
  const parser = new transportApi.PcmStreamParser((frame: any) => frames.push(frame));
  const bytes = streamBytes();
  [bytes.slice(0, 7), bytes.slice(7, 29), bytes.slice(29, 51), bytes.slice(51)].forEach((part) => parser.append(part));
  assert.equal(frames.length, 1); assert.equal(frames[0].sampleRate, 48000); assert.equal(frames[0].channels, 2);
  assert.deepEqual(Array.from(frames[0].pcm as Float32Array).map((v) => Math.round(v * 32768)), [-32768, 0, 16384, 32767]);
});

test("M26 PCM parser rejects invalid and oversized framing", () => {
  const invalid = streamBytes(); invalid[0] = 0;
  assert.throws(() => new transportApi.PcmStreamParser(() => {}).append(invalid), /preamble/);
  const oversized = streamBytes(); new DataView(oversized.buffer).setUint32(40, transportApi.MAX_PAYLOAD_BYTES + 2, true);
  assert.throws(() => new transportApi.PcmStreamParser(() => {}).append(oversized), /payload/);
});

test("M26 HTTP transport requires bounded same-origin authenticated session", () => {
  assert.throws(() => transportApi.createHttpTransport({ endpoint: "https://evil.test/audio", token: "x", fetchImpl() {} }), /Invalid/);
  assert.throws(() => transportApi.createHttpTransport({ endpoint: "/api/dj/mixxx/master-stream/x", token: "" , fetchImpl() {} }), /Invalid/);
});

test("M26 HTTP transport sends same-origin credentials and short bearer token", async () => {
  let request: any = null;
  const transport = transportApi.createHttpTransport({
    endpoint: "/api/dj/mixxx/master-stream/opaque", token: "short-token",
    async fetchImpl(url: string, options: any) {
      request = { url, options };
      return { ok: true, body: { getReader() { return { async read() { return { done: true }; }, cancel() {} }; } } };
    },
  }, {});
  await transport.connect();
  assert.equal(request.url, "/api/dj/mixxx/master-stream/opaque");
  assert.equal(request.options.credentials, "same-origin");
  assert.equal(request.options.headers.Authorization, "Bearer short-token");
  transport.close();
});

function fakeAudio() {
  const posted: any[] = [];
  const node: any = { port: { postMessage(value: any) { posted.push(value); }, onmessage: null }, connect() {}, disconnect() {} };
  const context: any = { state: "suspended", sampleRate: 48000, destination: {}, audioWorklet: { async addModule() {} }, async resume() { this.state = "running"; } };
  return { context, node, posted };
}

test("M26 receiver uses injected context, never capture APIs, and rejects stale/duplicate frames", async () => {
  const { context, node, posted } = fakeAudio(); let handlers: any;
  const original = (globalThis as any).AudioWorkletNode;
  (globalThis as any).AudioWorkletNode = function () { return node; };
  try {
    const receiver = new receiverApi.MasterReceiver({ audioContext: context, now: () => 2000,
      createTransport: async (_session: any, value: any) => { handlers = value; return { async connect() { handlers.open(); }, close() {} }; } });
    receiver.backendChanged(true); await receiver.start({ id: "opaque-session", token: "secret" });
    assert.equal(receiver.snapshot().state, "waiting-for-user-gesture");
    await receiver.unlockFromGesture();
    assert.equal(receiver.snapshot().state, "buffering");
    assert.equal(typeof (globalThis as any).navigator?.mediaDevices?.getUserMedia, "undefined");
    assert.equal(handlers.frame({ sequence: 1, captureTimestampMs: 1900, sampleRate: 48000, channels: 2, pcm: new Float32Array([.1, -.1, .1, -.1]) }), true);
    assert.equal(receiver.snapshot().captureClockOffsetMs, 100);
    assert.equal(handlers.frame({ sequence: 2, captureTimestampMs: 1000, sampleRate: 48000, channels: 2, pcm: new Float32Array(8) }), false);
    assert.equal(receiver.snapshot().staleFramesDropped, 4);
    handlers.frame({ sequence: 3, captureTimestampMs: 1950, sampleRate: 48000, channels: 2, pcm: new Float32Array([.1, -.1, .1, -.1, .1, -.1, .1, -.1]) });
    handlers.frame({ sequence: 3, captureTimestampMs: 1950, sampleRate: 48000, channels: 2, pcm: new Float32Array(8) });
    assert.equal(receiver.snapshot().state, "live"); assert.equal(receiver.snapshot().duplicateFramesDropped, 4);
    assert.equal(posted.filter((entry) => entry.type === "push").length, 2);
    receiver.backendChanged(false); assert.equal(receiver.snapshot().state, "stopped");
    assert.equal(posted[posted.length - 1].type, "reset");
  } finally { (globalThis as any).AudioWorkletNode = original; }
});

test("M26 receiver requires non-silent samples before reporting live audio", async () => {
  const { context, node } = fakeAudio(); context.state = "running"; let handlers: any;
  const original = (globalThis as any).AudioWorkletNode;
  (globalThis as any).AudioWorkletNode = function () { return node; };
  try {
    const receiver = new receiverApi.MasterReceiver({ audioContext: context, now: () => 2000,
      createTransport: async (_session: any, value: any) => { handlers = value; return { async connect() { handlers.open(); }, close() {} }; } });
    receiver.backendChanged(true); await receiver.unlockFromGesture(); await receiver.start({ id: "opaque-session" });
    handlers.frame({ sequence: 1, captureTimestampMs: 1950, sampleRate: 48000, channels: 2, pcm: new Float32Array(16) });
    assert.equal(receiver.snapshot().state, "buffering");
    assert.equal(receiver.snapshot().nonSilentFramesReceived, 0);
    handlers.frame({ sequence: 2, captureTimestampMs: 1960, sampleRate: 48000, channels: 2, pcm: new Float32Array([.05, -.05, .05, -.05]) });
    assert.equal(receiver.snapshot().state, "live");
    assert.ok(receiver.snapshot().nonSilentFramesReceived > 0);
  } finally { (globalThis as any).AudioWorkletNode = original; }
});

test("M26 receiver retries boundedly and rejects old-generation callbacks", async () => {
  const { context, node } = fakeAudio(); context.state = "running";
  const timers: Array<() => void> = []; const generations: any[] = [];
  const original = (globalThis as any).AudioWorkletNode; (globalThis as any).AudioWorkletNode = function () { return node; };
  try {
    const receiver = new receiverApi.MasterReceiver({ audioContext: context, retryDelays: [100, 100],
      setTimer(fn: () => void) { timers.push(fn); return timers.length; }, clearTimer() {},
      createTransport: async (_session: any, handlers: any) => { generations.push(handlers); return { async connect() {}, close() {} }; } });
    receiver.backendChanged(true); await receiver.unlockFromGesture(); await receiver.start({ id: "session" });
    generations[0].error(new Error("network")); assert.equal(receiver.snapshot().state, "recovering");
    timers.shift()?.(); await Promise.resolve(); await Promise.resolve();
    receiver.stop(); generations[0].frame({ sequence: 1, pcm: new Float32Array(4), channels: 2 });
    assert.equal(receiver.snapshot().framesReceived, 0); assert.equal(receiver.snapshot().state, "stopped");
  } finally { (globalThis as any).AudioWorkletNode = original; }
});

test("M26 receiver resamples capture PCM to the existing AudioContext rate", () => {
  const input = new Float32Array([0, 0, 1, 1, 0, 0, -1, -1]);
  const output = receiverApi.resampleInterleaved(input, 2, 48000, 24000);
  assert.equal(output.length, 4);
  assert.deepEqual(Array.from(output), [0, 0, 0, 0]);
});

test("M26 receiver has one bounded Safari-compatible PCM fallback without another context", () => {
  const channelData = [new Float32Array(4), new Float32Array(4)];
  const processor: any = { connect() {}, disconnect() {}, onaudioprocess: null };
  const context: any = { createScriptProcessor() { return processor; } };
  const node = receiverApi.createBoundedLegacyNode(context, 8, () => {});
  assert.strictEqual(node, processor);
  node.port.postMessage({ type: "push", channels: 2, pcm: new Float32Array([.25, -.25, .5, -.5]) });
  node.onaudioprocess({ outputBuffer: { length: 4, numberOfChannels: 2, getChannelData: (channel: number) => channelData[channel] } });
  assert.deepEqual(Array.from(channelData[0]), [.25, .5, 0, 0]);
  assert.deepEqual(Array.from(channelData[1]), [-.25, -.5, 0, 0]);
});
