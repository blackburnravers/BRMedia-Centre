import assert from "node:assert/strict";
import test from "node:test";

const { PcmRealtimeScheduler } = require("../../tools/webrtc-sidecar/pcm-scheduler.cjs");
const audio = (value: number) => { const frame = new Int16Array(960); frame.fill(value); return frame; };

function startupHarness() {
  let nowNs = 0n; const sent: number[] = [];
  const scheduler = new PcmRealtimeScheduler({ sampleRate: 48000, channels: 2, targetQueueFrames: 6,
    prebufferFrames: 6, maxQueueFrames: 20, nowNs: () => nowNs, setTimer: () => 1, clearTimer() {},
    onFrame: (samples: Int16Array) => sent.push(samples[0]) });
  const tick = (milliseconds: number) => { nowNs = BigInt(milliseconds) * 1_000_000n; scheduler.timer = null; scheduler.tick(); };
  return { scheduler, sent, tick };
}

test("M26 startup holds RTCAudioSource until the full 60 ms target is buffered", () => {
  const h = startupHarness();
  for (let frame = 0; frame < 5; frame += 1) h.scheduler.enqueue(audio(frame + 1), frame);
  assert.equal(h.scheduler.running, false); assert.equal(h.sent.length, 0);
  h.scheduler.enqueue(audio(6), 5); assert.equal(h.scheduler.running, true); assert.equal(h.sent.length, 0);
  const d = h.scheduler.diagnostics(); assert.equal(d.startupBufferedMs, 60); assert.equal(d.firstSchedulerDeadlineMs, 10);
});

test("M26 first 50 frames begin on deadline and remain exactly monotonic without burst or stale drop", () => {
  const h = startupHarness(); for (let frame = 0; frame < 6; frame += 1) h.scheduler.enqueue(audio(frame + 1), frame);
  for (let frame = 0; frame < 50; frame += 1) { h.tick((frame + 1) * 10); h.scheduler.enqueue(audio(frame + 7), frame + 6); }
  const d = h.scheduler.diagnostics(); assert.equal(h.sent.length, 50); assert.equal(d.startupTrace.length, 50);
  assert.deepEqual(d.startupTrace.map((row: any) => row.sentAtFromStartMs), Array.from({ length: 50 }, (_, i) => i * 10));
  assert.equal(d.maxLatenessMs, 0); assert.equal(d.firstUnderflowAtFrame, null); assert.equal(d.firstOverflowAtSourceFrame, null);
  assert.equal(d.firstStaleDropAtFrame, null); assert.equal(d.burstSendCount, 0); assert.equal(d.schedulerResetCount, 0);
});

test("M26 coalesced FFmpeg startup arrival is trimmed only before frame 1 and cannot skip audible startup", () => {
  const h = startupHarness(); for (let frame = 0; frame < 20; frame += 1) h.scheduler.enqueue(audio(frame + 1), frame);
  h.tick(10); for (let frame = 1; frame < 50; frame += 1) { h.scheduler.enqueue(audio(frame + 20), frame + 19); h.tick((frame + 1) * 10); }
  const d = h.scheduler.diagnostics(); assert.equal(d.releaseBufferedMs, 200); assert.equal(d.preRollDrops, 14);
  assert.equal(d.firstStaleDropAtFrame, 0); assert.equal(d.firstUnderflowAtFrame, null);
  assert.equal(d.burstSendCount, 0); assert.equal(d.startupTrace[0].depthBeforeSend, 6);
  assert.equal(d.startupTrace.filter((row: any) => row.silence).length, 0);
});

test("M26 first five seconds retain a bounded frame-by-frame diagnostic trace", () => {
  const h = startupHarness(); for (let frame = 0; frame < 6; frame += 1) h.scheduler.enqueue(audio(1), frame);
  for (let frame = 0; frame < 520; frame += 1) { h.tick((frame + 1) * 10); h.scheduler.enqueue(audio(1), frame + 6); }
  const trace = h.scheduler.diagnostics().startupTrace; assert.equal(trace.length, 500);
  assert.equal(trace[0].frame, 1); assert.equal(trace[499].frame, 500); assert.equal(trace[499].sentAtFromStartMs, 4990);
});
