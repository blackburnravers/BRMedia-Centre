import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const { ExactPcmFrameParser, PcmRealtimeScheduler, FRAME_BYTES } = require("../../tools/webrtc-sidecar/pcm-scheduler.cjs");
const sidecar = fs.readFileSync("tools/webrtc-sidecar/app.cjs", "utf8");
const manager = fs.readFileSync("server/src/mixxxWebRtcSidecar.ts", "utf8");
const capture = fs.readFileSync("server/src/mixxxMasterCapture.ts", "utf8");
const controller = fs.readFileSync("server/public/dj-mixer/engine/m26-master-audio-controller.js", "utf8");

function frame(value = 0) { const samples = new Int16Array(960); samples.fill(value); return samples; }
function harness(options: any = {}) {
  let nowNs = 0n; const output: Int16Array[] = [];
  const scheduler = new PcmRealtimeScheduler({ sampleRate: 48000, channels: 2, prebufferFrames: 1,
    targetQueueFrames: options.targetQueueFrames || 6, maxQueueFrames: options.maxQueueFrames || 20,
    nowNs: () => nowNs, setTimer: () => 1, clearTimer() {}, onFrame: (samples: Int16Array) => output.push(samples) });
  const tick = (atMs: number) => { nowNs = BigInt(Math.round(atMs * 1e6)); scheduler.timer = null; scheduler.tick(); };
  return { scheduler, output, tick };
}

test("M26 production capture has one explicit FFmpeg s16le 48 kHz stereo conversion", () => {
  assert.match(capture, /"-f", "s16le", "-ar", "48000", "-ac", "2"/);
  assert.match(capture, /"-ar", "48000", "-ac", "2", "-f", "s16le", "-acodec", "pcm_s16le"/);
  assert.match(capture, /capture\.stdout\?\.pipe\(child\.stdin/);
  assert.match(sidecar, /frameBytes: FRAME_BYTES/); assert.equal(FRAME_BYTES, 1920);
});

test("M26 active PCM route is direct parent-child binary stdin and not HTTP", () => {
  assert.match(manager, /stdio: \["pipe", "pipe", "pipe"\]/);
  assert.match(manager, /BRM26BIN/); assert.match(manager, /child\?\.stdin|child\.stdin/);
  assert.doesNotMatch(manager, /\/pcm`|application\/vnd\.brmedia\.pcm/);
  assert.doesNotMatch(sidecar, /req\.method === "PUT"|\/pcm\)\?/);
});

test("hostile partial and combined pipe boundaries reconstruct exact 1,920-byte frames", () => {
  const made: Buffer[] = []; const parser = new ExactPcmFrameParser({ onFrame: (value: Buffer) => made.push(value) });
  const source = Buffer.alloc(FRAME_BYTES * 8); for (let i = 0; i < source.length; i += 1) source[i] = i % 251;
  const sizes = [1, 37, 511, 1920, 5760, 3, 17, 4096]; let offset = 0, n = 0;
  while (offset < source.length) { const size = Math.min(sizes[n++ % sizes.length], source.length - offset); parser.push(source.subarray(offset, offset + size)); offset += size; }
  assert.equal(made.length, 8); assert.deepEqual(Buffer.concat(made), source);
  assert.deepEqual(parser.diagnostics(), { bytesReceived: source.length, completeFramesConstructed: 8, partialBytesRetained: 0,
    invalidFrameSizes: 0, duplicateFrameDetections: 0, discardedStaleFrames: 0 });
});

test("bounded 60/200 ms ring drops oldest on overflow and inserts fresh silence on underflow", () => {
  const fx = harness(); for (let i = 0; i < 30; i += 1) fx.scheduler.enqueue(frame(i), i, 0n);
  let d = fx.scheduler.diagnostics(); assert.equal(d.queueDepth, 20); assert.equal(d.overflows, 10); assert.equal(d.droppedFrames, 10);
  fx.tick(10); assert.equal(fx.output.length, 1); assert.ok(fx.output[0][0] >= 10);
  fx.scheduler.clearStale(); fx.tick(20); assert.equal(fx.output[1][0], 0);
  d = fx.scheduler.diagnostics(); assert.equal(d.underflows, 1); assert.ok(d.maxQueueDepth <= 20);
});

test("exact 60-second source transmits exactly 60 seconds on the production scheduler", () => {
  const fx = harness(); for (let i = 0; i < 6; i += 1) fx.scheduler.enqueue(frame(i), i);
  for (let i = 0; i < 6000; i += 1) { fx.tick((i + 1) * 10); if (i + 6 < 6000) fx.scheduler.enqueue(frame(i + 6), i + 6); }
  const d = fx.scheduler.diagnostics(); assert.equal(d.sentFrames, 6000); assert.equal(d.transmittedDurationMs, 60000);
  assert.equal(d.actualTimelineMs, 60000); assert.equal(d.timelineDriftMs, 0); assert.equal(d.burstSendCount, 0);
});

test("ten-minute absolute monotonic timeline is 60,000 frames with zero simulated drift", () => {
  const fx = harness(); for (let i = 0; i < 6; i += 1) fx.scheduler.enqueue(frame(i), i);
  for (let i = 0; i < 60000; i += 1) { fx.tick((i + 1) * 10); if (i + 6 < 60000) fx.scheduler.enqueue(frame(i + 6), i + 6); }
  const d = fx.scheduler.diagnostics(); assert.equal(d.sentFrames, 60000); assert.equal(d.transmittedDurationMs, 600000);
  assert.equal(d.actualTimelineMs, 600000); assert.equal(d.timelineDriftMs, 0); assert.equal(d.schedulerResetCount, 0);
  assert.equal(d.burstSendCount, 0); assert.equal(d.meanCadenceMs, 10); assert.equal(d.p95CadenceErrorMs, 0);
});

test("440 Hz stereo remains 440 Hz after the active parser and scheduler", () => {
  const fx = harness(); const parser = new ExactPcmFrameParser({ onFrame: (pcm: Buffer) => {
    const samples = new Int16Array(960); for (let i = 0; i < 960; i += 1) samples[i] = pcm.readInt16LE(i * 2);
    fx.scheduler.enqueue(samples);
  } });
  let crossings = 0, previous = 0;
  const blocks: Buffer[] = [];
  for (let block = 0; block < 100; block += 1) {
    const pcm = Buffer.alloc(1920); for (let i = 0; i < 480; i += 1) { const value = Math.round(Math.sin(2 * Math.PI * 440 * (block * 480 + i) / 48000) * 12000); pcm.writeInt16LE(value, i * 4); pcm.writeInt16LE(value, i * 4 + 2); }
    blocks.push(pcm);
  }
  for (let i = 0; i < 6; i += 1) parser.push(blocks[i]);
  for (let block = 0; block < 100; block += 1) { fx.tick((block + 1) * 10); if (block + 6 < 100) parser.push(blocks[block + 6]); }
  for (const samples of fx.output) for (let i = 0; i < samples.length; i += 2) { if (previous <= 0 && samples[i] > 0) crossings += 1; previous = samples[i]; }
  assert.ok(Math.abs(crossings - 440) <= 1, `measured ${crossings} Hz`);
});

test("event-loop delay sends once, drops stale audio, and never catch-up bursts", () => {
  const fx = harness(); for (let i = 0; i < 20; i += 1) fx.scheduler.enqueue(frame(i), i, 0n);
  fx.tick(10); const before = fx.output.length; fx.tick(95); assert.equal(fx.output.length - before, 1);
  const d = fx.scheduler.diagnostics(); assert.equal(d.lateFrames, 1); assert.ok(d.staleDrops > 0); assert.equal(d.burstSendCount, 0); assert.ok(d.queueDepth <= 6);
});

test("all M26 periodic tasks are control/telemetry-only and cannot reset media", () => {
  assert.doesNotMatch(sidecar, /setInterval\([^]*5000|setInterval\([^]*10000/);
  const heartbeat = controller.slice(controller.indexOf("async function publishHeartbeat"), controller.indexOf("async function startFromGesture"));
  assert.match(heartbeat, /5_000/); assert.doesNotMatch(heartbeat, /closePeer|createOffer|srcObject\s*=|\.pause\(|scheduler|audioBuffer/);
  const intervals = sidecar.split(/\r?\n/).filter((line: string) => line.includes("setInterval"));
  assert.equal(intervals.length, 1); assert.match(intervals[0], /keepAlive.*60_000/);
});
