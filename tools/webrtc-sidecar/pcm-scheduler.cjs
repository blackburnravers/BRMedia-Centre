"use strict";

const FRAME_DURATION_MS = 10;
const SAMPLE_RATE = 48000;
const CHANNELS = 2;
const FRAMES_PER_CHANNEL = 480;
const SAMPLES_PER_FRAME = 960;
const FRAME_BYTES = 1920;

class ExactPcmFrameParser {
  constructor(options = {}) {
    this.frameBytes = options.frameBytes || FRAME_BYTES;
    this.onFrame = options.onFrame || (() => {});
    this.tail = Buffer.alloc(0);
    this.bytesReceived = 0;
    this.completeFramesConstructed = 0;
    this.invalidFrameSizes = 0;
    this.duplicateFrameDetections = 0;
    this.discardedStaleFrames = 0;
    this.lastFingerprint = null;
  }
  push(chunk) {
    if (!Buffer.isBuffer(chunk)) throw new TypeError("PCM pipe accepts Buffer data only");
    if (!chunk.length) return;
    this.bytesReceived += chunk.length;
    let input = this.tail.length ? Buffer.concat([this.tail, chunk]) : chunk;
    let offset = 0;
    while (input.length - offset >= this.frameBytes) {
      const frame = Buffer.from(input.subarray(offset, offset + this.frameBytes));
      offset += this.frameBytes;
      if (frame.length !== this.frameBytes) { this.invalidFrameSizes += 1; continue; }
      this.completeFramesConstructed += 1;
      this.onFrame(frame);
    }
    this.tail = offset < input.length ? Buffer.from(input.subarray(offset)) : Buffer.alloc(0);
  }
  reset(discardAsStale = true) {
    if (discardAsStale && this.tail.length) this.discardedStaleFrames += 1;
    this.tail = Buffer.alloc(0);
  }
  diagnostics() { return { bytesReceived: this.bytesReceived, completeFramesConstructed: this.completeFramesConstructed,
    partialBytesRetained: this.tail.length, invalidFrameSizes: this.invalidFrameSizes,
    duplicateFrameDetections: this.duplicateFrameDetections, discardedStaleFrames: this.discardedStaleFrames }; }
}

class PcmRealtimeScheduler {
  constructor(options = {}) {
    this.sampleRate = Number(options.sampleRate || SAMPLE_RATE);
    this.channels = Number(options.channels || CHANNELS);
    this.frameDurationMs = Number(options.frameDurationMs || FRAME_DURATION_MS);
    this.framesPerChannel = Math.round(this.sampleRate * this.frameDurationMs / 1000);
    this.samplesPerFrame = this.framesPerChannel * this.channels;
    this.targetQueueFrames = Math.max(4, Number(options.targetQueueFrames || 6)); // 60 ms
    this.prebufferFrames = Math.min(this.maxQueueFrames || 20, Math.max(this.targetQueueFrames, Number(options.prebufferFrames || this.targetQueueFrames)));
    this.maxQueueFrames = Math.max(this.targetQueueFrames, Number(options.maxQueueFrames || 20)); // 200 ms
    this.onFrame = options.onFrame || (() => {});
    this.nowNs = options.nowNs || (options.now ? (() => BigInt(Math.round(options.now() * 1e6))) : (() => process.hrtime.bigint()));
    this.setTimer = options.setTimer || setTimeout;
    this.clearTimer = options.clearTimer || clearTimeout;
    this.frameNs = BigInt(Math.round(this.frameDurationMs * 1e6));
    this.queue = [];
    this.timer = null; this.running = false; this.nextDeadlineNs = 0n;
    this.startedAtNs = null; this.lastSendAtNs = null;
    this.sourceFramesReceived = 0; this.sourceFramesInserted = 0; this.silenceFramesInserted = 0;
    this.droppedFrames = 0; this.staleDrops = 0; this.duplicatedFrames = 0;
    this.underflows = 0; this.overflows = 0; this.lateFrames = 0;
    this.maxQueueDepth = 0; this.minQueueDepth = null; this.maxLatenessMs = 0;
    this.expectedFrames = 0; this.sentFrames = 0; this.schedulerResetCount = 0; this.burstSendCount = 0;
    this.cadenceErrorsMs = []; this.lastSourceSequence = null;
    this.startRequestedAtNs = null; this.startupBufferedFrames = 0; this.releaseBufferedFrames = 0; this.preRollDrops = 0;
    this.firstDeadlineNs = null; this.firstUnderflowAtFrame = null; this.firstOverflowAtSourceFrame = null;
    this.firstStaleDropAtFrame = null; this.highDepthTicks = 0; this.startupTrace = [];
  }
  enqueue(samples, sourceSequence = null, capturedAtNs = this.nowNs()) {
    if (!(samples instanceof Int16Array) || samples.length !== this.samplesPerFrame) throw new Error(`Expected ${this.samplesPerFrame} interleaved Int16 samples`);
    if (sourceSequence !== null && sourceSequence === this.lastSourceSequence) { this.duplicatedFrames += 1; return false; }
    this.lastSourceSequence = sourceSequence; this.sourceFramesReceived += 1;
    if (this.queue.length >= this.maxQueueFrames) { this.queue.shift(); this.droppedFrames += 1; this.staleDrops += 1; this.overflows += 1;
      this.firstOverflowAtSourceFrame ??= this.sourceFramesReceived; this.firstStaleDropAtFrame ??= this.sentFrames; }
    this.queue.push({ samples, sourceSequence, capturedAtNs });
    this.maxQueueDepth = Math.max(this.maxQueueDepth, this.queue.length);
    if (!this.running && this.queue.length >= this.prebufferFrames) this.start();
    return true;
  }
  start() {
    if (this.running) return;
    this.running = true; const now = this.nowNs(); this.startRequestedAtNs = now; this.startedAtNs = null;
    this.startupBufferedFrames = this.queue.length; this.nextDeadlineNs = now + this.frameNs; this.firstDeadlineNs = this.nextDeadlineNs; this.schedule();
  }
  stop(clearQueue = true) { this.running = false; if (this.timer !== null) this.clearTimer(this.timer); this.timer = null; if (clearQueue) this.clearStale(); }
  clearStale() { this.staleDrops += this.queue.length; this.droppedFrames += this.queue.length; this.queue.length = 0; }
  schedule() {
    if (!this.running || this.timer !== null) return;
    const remainingNs = this.nextDeadlineNs - this.nowNs();
    const delayMs = remainingNs > 0n ? Number(remainingNs) / 1e6 : 0;
    this.timer = this.setTimer(() => { this.timer = null; this.tick(); }, delayMs);
  }
  tick() {
    if (!this.running) return;
    const at = this.nowNs(); const latenessNs = at > this.nextDeadlineNs ? at - this.nextDeadlineNs : 0n;
    const latenessMs = Number(latenessNs) / 1e6; this.maxLatenessMs = Math.max(this.maxLatenessMs, latenessMs);
    if (latenessNs >= this.frameNs) {
      this.lateFrames += 1; const missed = Number(latenessNs / this.frameNs);
      this.expectedFrames += missed;
      const keep = Math.min(this.targetQueueFrames, this.queue.length);
      const discard = this.queue.length - keep;
      if (discard > 0) { this.queue.splice(0, discard); this.droppedFrames += discard; this.staleDrops += discard; }
      this.nextDeadlineNs += BigInt(missed) * this.frameNs;
    }
    // Anything accumulated before frame 1 is trimmed once, before it can be audible.
    if (this.sentFrames === 0) {
      this.releaseBufferedFrames = this.queue.length;
      const trim = Math.max(0, this.queue.length - this.targetQueueFrames);
      if (trim) { this.queue.splice(0, trim); this.preRollDrops += trim; this.droppedFrames += trim; this.staleDrops += trim;
        this.firstStaleDropAtFrame ??= 0; }
      this.startedAtNs = at;
    }
    // Never depth-correct the opening second. Thereafter require sustained high depth,
    // so a single coalesced process-pipe read cannot cause audible frame skipping.
    if (this.sentFrames >= 100 && this.queue.length > this.targetQueueFrames + 2) this.highDepthTicks += 1;
    else this.highDepthTicks = 0;
    if (this.highDepthTicks >= 50) { this.queue.shift(); this.droppedFrames += 1; this.staleDrops += 1;
      this.firstStaleDropAtFrame ??= this.sentFrames; this.highDepthTicks = 0; }
    const depthBeforeSend = this.queue.length;
    const queued = this.queue.shift(); const samples = queued?.samples || new Int16Array(this.samplesPerFrame);
    if (queued) this.sourceFramesInserted += 1; else { this.silenceFramesInserted += 1; this.underflows += 1; this.firstUnderflowAtFrame ??= this.sentFrames; }
    this.minQueueDepth = this.minQueueDepth === null ? this.queue.length : Math.min(this.minQueueDepth, this.queue.length);
    if (this.lastSendAtNs !== null) {
      const cadence = Number(at - this.lastSendAtNs) / 1e6;
      this.cadenceErrorsMs.push(Math.abs(cadence - this.frameDurationMs));
      if (this.cadenceErrorsMs.length > 10000) this.cadenceErrorsMs.shift();
      if (cadence < this.frameDurationMs / 2) this.burstSendCount += 1;
    }
    this.lastSendAtNs = at; this.expectedFrames += 1; this.sentFrames += 1;
    if (this.sentFrames <= 500) this.startupTrace.push({ frame: this.sentFrames,
      deadlineFromStartMs: this.firstDeadlineNs === null ? null : Number(this.nextDeadlineNs - this.firstDeadlineNs + this.frameNs) / 1e6,
      sentAtFromStartMs: this.startedAtNs === null ? null : Number(at - this.startedAtNs) / 1e6,
      latenessMs, depthBeforeSend, depthAfterSend: this.queue.length, silence: !queued });
    this.onFrame(samples, this.framesPerChannel); this.nextDeadlineNs += this.frameNs; this.schedule();
  }
  diagnostics() {
    const sorted = [...this.cadenceErrorsMs].sort((a, b) => a - b);
    const p95 = sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] : 0;
    const actualMs = this.startedAtNs !== null && this.lastSendAtNs !== null ? Number(this.lastSendAtNs - this.startedAtNs) / 1e6 + this.frameDurationMs : 0;
    const transmittedMs = this.sentFrames * this.frameDurationMs;
    const oldestAgeMs = this.queue.length ? Number(this.nowNs() - this.queue[0].capturedAtNs) / 1e6 : 0;
    return { sampleRate: this.sampleRate, channels: this.channels, bitsPerSample: 16, signed: true, littleEndian: true, interleaved: true,
      frameDurationMs: this.frameDurationMs, framesPerChannel: this.framesPerChannel, samplesPerFrame: this.samplesPerFrame,
      frameBytes: this.samplesPerFrame * 2, expectedCadenceHz: 100, targetQueueFrames: this.targetQueueFrames,
      targetQueueMs: this.targetQueueFrames * 10, prebufferFrames: this.prebufferFrames, prebufferMs: this.prebufferFrames * 10,
      startupBufferedFrames: this.startupBufferedFrames, startupBufferedMs: this.startupBufferedFrames * 10,
      releaseBufferedFrames: this.releaseBufferedFrames, releaseBufferedMs: this.releaseBufferedFrames * 10,
      firstSchedulerDeadlineMs: this.firstDeadlineNs === null || this.startRequestedAtNs === null ? null : Number(this.firstDeadlineNs - this.startRequestedAtNs) / 1e6,
      preRollDrops: this.preRollDrops, firstUnderflowAtFrame: this.firstUnderflowAtFrame,
      firstOverflowAtSourceFrame: this.firstOverflowAtSourceFrame, firstStaleDropAtFrame: this.firstStaleDropAtFrame,
      maxQueueFrames: this.maxQueueFrames, maxQueueMs: this.maxQueueFrames * 10, queueDepth: this.queue.length,
      queueDepthMs: this.queue.length * 10, minQueueDepth: this.minQueueDepth ?? 0, maxQueueDepth: this.maxQueueDepth,
      oldestFrameAgeMs: oldestAgeMs, sourceFramesReceived: this.sourceFramesReceived, sourceFramesInserted: this.sourceFramesInserted,
      silenceFramesInserted: this.silenceFramesInserted, underflows: this.underflows, overflows: this.overflows,
      droppedFrames: this.droppedFrames, staleDrops: this.staleDrops, duplicatedFrames: this.duplicatedFrames,
      expectedFrames: this.expectedFrames, sentFrames: this.sentFrames, transmittedDurationMs: transmittedMs,
      actualTimelineMs: actualMs, timelineDriftMs: actualMs - transmittedMs,
      meanCadenceMs: this.sentFrames > 1 ? (actualMs - this.frameDurationMs) / (this.sentFrames - 1) : this.frameDurationMs,
      p95CadenceErrorMs: p95, lateFrames: this.lateFrames, maxLatenessMs: this.maxLatenessMs,
      schedulerResetCount: this.schedulerResetCount, burstSendCount: this.burstSendCount,
      startupTrace: this.startupTrace, running: this.running };
  }
}

module.exports = { ExactPcmFrameParser, PcmRealtimeScheduler, FRAME_BYTES, SAMPLES_PER_FRAME, FRAMES_PER_CHANNEL };
