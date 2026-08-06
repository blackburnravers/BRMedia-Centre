import assert from "node:assert/strict";
import test from "node:test";
import { encodeM26PcmFrame, encodeM26PcmPreamble, MixxxMasterStreamManager, MasterStreamError, type MasterCaptureCallbacks } from "./mixxxMasterStream";

class FakeCapture {
  starts = 0;
  stops = 0;
  callbacks: MasterCaptureCallbacks[] = [];
  start(callbacks: MasterCaptureCallbacks) {
    this.starts += 1;
    this.callbacks.push(callbacks);
    return { stop: () => { this.stops += 1; } };
  }
  data(value: string) { this.callbacks[this.callbacks.length - 1]?.data(Buffer.from(value), 123); }
  crash() { this.callbacks[this.callbacks.length - 1]?.exit(1); }
}

class FakeSink {
  chunks: Buffer[] = [];
  ended = 0;
  blocked = false;
  drain: (() => void) | null = null;
  write(chunk: Buffer) { if (this.blocked) return false; this.chunks.push(Buffer.from(chunk)); return true; }
  end() { this.ended += 1; }
  onDrain(callback: () => void) { this.drain = callback; return () => { this.drain = null; }; }
}

function fixture(overrides: any = {}) {
  const capture = new FakeCapture();
  let now = 1_000;
  let randomCounter = 0;
  const timers: Array<{ callback: () => void; cancelled: boolean }> = [];
  const manager = new MixxxMasterStreamManager({
    capture,
    allowedOrigins: ["https://brmedia.test"],
    now: () => now,
    randomBytes: (size) => Buffer.alloc(size, ++randomCounter),
    setTimer: (callback) => { const timer = { callback, cancelled: false }; timers.push(timer); return timer; },
    clearTimer: (timer) => { timer.cancelled = true; },
    ...overrides,
  });
  const create = (profileId = "rhys", remoteAddress = "phone") => manager.createSession({ authenticated: true, profileId, remoteAddress, origin: "https://brmedia.test" });
  return { manager, capture, create, timers, advance: (ms: number) => { now += ms; }, runTimer: (index: number) => { if (!timers[index].cancelled) timers[index].callback(); } };
}

test("requires authentication, validates origin and enforces opaque ownership", () => {
  const { manager, create } = fixture();
  assert.throws(() => manager.createSession({ authenticated: false, profileId: "", origin: "https://brmedia.test" }), (e: MasterStreamError) => e.code === "unauthenticated");
  assert.throws(() => manager.createSession({ authenticated: true, profileId: "rhys", origin: "https://evil.test" }), (e: MasterStreamError) => e.code === "invalid_origin");
  const session = create();
  assert.doesNotMatch(session.id, /rhys|phone/i);
  assert.throws(() => manager.attach(session.id, session.token, "other", "https://brmedia.test", new FakeSink()), (e: MasterStreamError) => e.code === "forbidden");
});

test("accepts a trusted same-origin callback without weakening malformed-origin rejection", () => {
  const fx = fixture({ allowedOrigins: [], originAllowed: (origin: string) => origin === "https://brmedia.test" });
  assert.ok(fx.create().id);
  assert.throws(() => fx.manager.createSession({ authenticated: true, profileId: "rhys", origin: "not-an-origin" }),
    (e: MasterStreamError) => e.code === "invalid_origin");
});

test("starts one capture and supports two independent listeners", () => {
  const { manager, capture, create } = fixture();
  const a = create("rhys", "a");
  const b = create("nj", "b");
  const sinkA = new FakeSink(); const sinkB = new FakeSink();
  manager.attach(a.id, a.token, "rhys", "https://brmedia.test", sinkA);
  manager.attach(b.id, b.token, "nj", "https://brmedia.test", sinkB);
  assert.equal(capture.starts, 1);
  capture.data("music");
  assert.equal(sinkA.chunks[0].subarray(0, 8).toString(), "BRM26PCM");
  assert.equal(sinkA.chunks[1].subarray(0, 4).toString(), "M26F");
  assert.equal(sinkA.chunks[1].subarray(24).toString(), "music");
  assert.equal(sinkB.chunks[1].subarray(24).toString(), "music");
  assert.throws(() => create("third", "c"), (e: MasterStreamError) => e.code === "listener_limit");
  manager.disconnect(a.id, "rhys");
  capture.data("more");
  assert.equal(sinkB.chunks[2].subarray(24).toString(), "more");
  assert.equal(capture.stops, 0);
});

test("bounded queue drops stale PCM and flushes on drain", () => {
  const { manager, capture, create } = fixture({ maxQueueBytes: 4096 });
  const session = create(); const sink = new FakeSink();
  manager.attach(session.id, session.token, "rhys", "https://brmedia.test", sink);
  sink.blocked = true;
  for (let i = 0; i < 6; i += 1) capture.callbacks[0].data(Buffer.alloc(1024, i), 123);
  assert.ok(manager.diagnostics().queuedBytes <= 4096);
  assert.equal(manager.diagnostics().droppedFrames, 3);
  sink.blocked = false; sink.drain?.();
  assert.equal(manager.diagnostics().queuedBytes, 0);
});

test("capture diagnostics require non-silent PCM before audio is healthy", () => {
  const { manager, capture, create } = fixture();
  const session = create();
  manager.attach(session.id, session.token, "rhys", "https://brmedia.test", new FakeSink());
  capture.callbacks[0].data(Buffer.alloc(1920), 123);
  assert.equal(manager.diagnostics().audioHealthy, false);
  assert.equal(manager.diagnostics().nonSilentPacketsCaptured, 0);
  const signal = Buffer.alloc(1920);
  signal.writeInt16LE(8192, 0);
  capture.callbacks[0].data(signal, 124);
  assert.equal(manager.diagnostics().audioHealthy, true);
  assert.ok(manager.diagnostics().sourcePeak > 0);
  assert.ok(manager.diagnostics().sourceRms > 0);
});

test("server and authenticated browser telemetry prove sent and received audio independently", () => {
  const { manager, capture, create } = fixture();
  const session = create(); const sink = new FakeSink();
  manager.attach(session.id, session.token, "rhys", "https://brmedia.test", sink);
  const signal = Buffer.alloc(1920); signal.writeInt16LE(4096, 0);
  capture.callbacks[0].data(signal, 123);
  manager.recordClientTelemetry(session.id, session.token, "rhys", "https://brmedia.test", {
    state: "live", transportConnected: true, audioContextState: "running",
    framesReceived: 480, nonSilentFramesReceived: 480, sourcePeak: 0.125,
    bufferedFrames: 96, staleFramesDropped: 0, captureToReceiveMs: 12,
    outputAttached: true,
  });
  const diagnostics: any = manager.diagnostics();
  assert.ok(diagnostics.sentFrames >= 2);
  assert.ok(diagnostics.sentBytes > signal.length);
  assert.equal(diagnostics.browser[0].state, "live");
  assert.equal(diagnostics.browser[0].audioContextState, "running");
  assert.equal(diagnostics.browser[0].nonSilentFramesReceived, 480);
  assert.equal(diagnostics.browser[0].outputAttached, true);
});

test("active browser heartbeats renew a session while missed samples expire only after bounded grace", () => {
  const fx = fixture({ sessionTtlMs: 60_000 });
  const session = fx.create(); const sink = new FakeSink();
  fx.manager.attach(session.id, session.token, "rhys", "https://brmedia.test", sink);
  fx.advance(50_000);
  fx.manager.recordClientTelemetry(session.id, session.token, "rhys", "https://brmedia.test", { state: "connected-awaiting-user-gesture" });
  fx.advance(50_000);
  fx.manager.recordClientTelemetry(session.id, session.token, "rhys", "https://brmedia.test", { state: "connected-awaiting-user-gesture" });
  assert.equal(fx.manager.diagnostics().listenerCount, 1);
  assert.ok((fx.manager.diagnostics().browser[0] as any).expiresInMs > 0);
  fx.advance(60_001);
  assert.throws(() => fx.manager.recordClientTelemetry(session.id, session.token, "rhys", "https://brmedia.test", {}),
    (e: MasterStreamError) => e.code === "stale_session");
});

test("paused playback and absent initial inbound RTP do not remove an attached listener", () => {
  const fx = fixture({ sessionTtlMs: 90_000 });
  const session = fx.create(); const sink = new FakeSink();
  fx.manager.attach(session.id, session.token, "rhys", "https://brmedia.test", sink);
  for (let elapsed = 0; elapsed < 60_000; elapsed += 2_000) {
    fx.advance(2_000);
    fx.manager.recordClientTelemetry(session.id, session.token, "rhys", "https://brmedia.test", {
      state: "connected-awaiting-user-gesture", transportConnected: true,
      framesReceived: 0, outputAttached: true,
    });
  }
  assert.equal(fx.manager.diagnostics().listenerCount, 1);
  assert.equal((fx.manager.diagnostics().browser[0] as any).state, "connected-awaiting-user-gesture");
  assert.equal(sink.ended, 0);
});

test("capture stops after idle timeout and crash recovery is bounded", () => {
  const fx = fixture({ maxCaptureRestarts: 2 });
  const session = fx.create();
  fx.manager.attach(session.id, session.token, "rhys", "https://brmedia.test", new FakeSink());
  fx.capture.crash(); fx.runTimer(0);
  assert.equal(fx.capture.starts, 2);
  fx.capture.crash(); fx.runTimer(1);
  assert.equal(fx.capture.starts, 3);
  fx.capture.crash();
  assert.equal(fx.timers.length, 2);
  assert.equal(fx.manager.diagnostics().captureState, "stopped");

  const idle = fixture();
  const idleSession = idle.create();
  idle.manager.attach(idleSession.id, idleSession.token, "rhys", "https://brmedia.test", new FakeSink());
  idle.manager.disconnect(idleSession.id, "rhys");
  idle.runTimer(0);
  assert.equal(idle.capture.stops, 1);
});

test("session expiry, rate limit and diagnostics are truthful without device paths", () => {
  const fx = fixture({ sessionTtlMs: 50, rateLimitCreates: 2 });
  const session = fx.create("rhys", "same");
  fx.advance(51);
  assert.throws(() => fx.manager.attach(session.id, session.token, "rhys", "https://brmedia.test", new FakeSink()), (e: MasterStreamError) => e.code === "stale_session");
  fx.create("rhys", "same");
  assert.throws(() => fx.create("rhys", "same"), (e: MasterStreamError) => e.code === "rate_limited");
  const text = JSON.stringify(fx.manager.diagnostics());
  assert.doesNotMatch(text, /[A-Z]:\\|device|password|token/i);
});

test("fixed PCM wire preamble and frame headers match the M26 contract", () => {
  const preamble = encodeM26PcmPreamble(48_000, 2, 960);
  assert.equal(preamble.length, 24);
  assert.equal(preamble.subarray(0, 8).toString(), "BRM26PCM");
  assert.equal(preamble.readUInt16LE(8), 1);
  assert.equal(preamble.readUInt16LE(10), 24);
  assert.equal(preamble.readUInt32LE(12), 48_000);
  assert.equal(preamble.readUInt16LE(16), 2);
  assert.equal(preamble.readUInt16LE(18), 1);
  assert.equal(preamble.readUInt32LE(20), 960);
  const frame = encodeM26PcmFrame(7, 1234.5, Buffer.from("pcm"), 2);
  assert.equal(frame.length, 27);
  assert.equal(frame.subarray(0, 4).toString(), "M26F");
  assert.equal(frame.readUInt32LE(4), 7);
  assert.equal(frame.readDoubleLE(8), 1234.5);
  assert.equal(frame.readUInt32LE(16), 3);
  assert.equal(frame.readUInt16LE(20), 2);
  assert.equal(frame.readUInt16LE(22), 0);
  assert.equal(frame.subarray(24).toString(), "pcm");
});

test("late callbacks from an old capture generation cannot disrupt recovery", () => {
  const fx = fixture();
  const session = fx.create(); const sink = new FakeSink();
  fx.manager.attach(session.id, session.token, "rhys", "https://brmedia.test", sink);
  const old = fx.capture.callbacks[0];
  fx.capture.crash(); fx.runTimer(0);
  old.exit(1);
  old.data(Buffer.from("stale"), 1);
  assert.equal(fx.manager.diagnostics().captureState, "running");
  assert.equal(fx.manager.diagnostics().captureRestarts, 1);
  assert.equal(sink.chunks.some((chunk) => chunk.subarray(24).toString() === "stale"), false);
});
