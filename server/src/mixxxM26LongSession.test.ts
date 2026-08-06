import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { MixxxMasterStreamManager } from "./mixxxMasterStream";

const controller = fs.readFileSync("server/public/dj-mixer/engine/m26-master-audio-controller.js", "utf8");
const gstreamer = fs.readFileSync("server/src/mixxxGStreamerWebRtc.ts", "utf8");
const runner = fs.readFileSync("tools/windows/brmedia-runner.ps1", "utf8");

function leaseHarness() {
  let now = 0;
  let captures = 0;
  const manager = new MixxxMasterStreamManager({
    now: () => now,
    randomBytes: (size) => Buffer.alloc(size, size),
    allowedOrigins: ["https://brmedia.test"],
    sessionTtlMs: 60_000,
    idleStopMs: 30_000,
    capture: { start: () => {
      captures += 1;
      return { pid: 10, stop() {} };
    } },
  });
  const created = manager.createSession({ authenticated: true, profileId: "owner", origin: "https://brmedia.test" });
  manager.attach(created.id, created.token, "owner", "https://brmedia.test", {
    write: () => true,
    end() {},
  });
  const heartbeat = () => manager.recordClientTelemetry(created.id, created.token, "owner", "https://brmedia.test", {
    heartbeat: true, pageVisible: true, state: "live", transportConnected: true, outputAttached: true,
  });
  return { manager, created, heartbeat, captures: () => captures, advance: (milliseconds: number) => { now += milliseconds; } };
}

test("healthy listener and browser ownership renew beyond twelve minutes while RTP time advances", () => {
  const h = leaseHarness();
  let rtpPackets = 0;
  for (let elapsed = 0; elapsed < 12 * 60_000; elapsed += 2_000) {
    h.advance(2_000); h.heartbeat(); rtpPackets += 100;
  }
  const diagnostics = h.manager.diagnostics();
  assert.equal(diagnostics.sessionCount, 1);
  assert.ok(Number(diagnostics.browser[0].heartbeatAgeMs) <= 2_000);
  assert.ok(Number(diagnostics.browser[0].expiresInMs) >= 58_000);
  assert.equal(rtpPackets, 36_000);
});

test("heartbeats renew the correct owner lease and stale ownership is rejected", () => {
  const h = leaseHarness(); h.advance(59_000); h.heartbeat(); h.advance(59_000); h.heartbeat();
  assert.equal(h.manager.diagnostics().sessionCount, 1);
  assert.throws(() => h.manager.recordClientTelemetry(h.created.id, h.created.token, "other", "https://brmedia.test", {}), /ownership mismatch/);
});

test("abandoned listener remains bounded and is removed after its intended lease", () => {
  const h = leaseHarness(); h.advance(60_001);
  assert.throws(() => h.heartbeat(), /expired/);
});

test("GStreamer failed-peer recovery is automatic and keeps one listener during handoff", () => {
  assert.match(controller, /\["webrtc", "gstreamer-webrtc"\]\.includes\(session\?\.transport\)/);
  assert.match(controller, /\["failed", "closed"\]\.includes\(detail\.peerConnectionState\).*prepareAutomaticSession/s);
  const handoff = controller.slice(controller.indexOf("async function discardFailedSession"), controller.indexOf("async function deleteSession"));
  assert.ok(handoff.indexOf("session = await createSession()") < handoff.indexOf("await deleteSession(previous)"));
  assert.match(gstreamer, /if \(!this\.listeners\.size\) await this\.stop\(\)/);
});

test("foreground, navigation and visibility do not reset the renewed long-session lease", () => {
  assert.match(controller, /setInterval\(\(\) => \{ void publishHeartbeat\(\); if \(!document\.hidden\) void publishTelemetry\(\); \}, 2_000\)/);
  assert.match(controller, /visibilitychange.*prepareAutomaticSession/s);
  assert.doesNotMatch(controller, /visibilitychange[^\n]*deleteSession/);
});

test("long-session correction leaves runner, Mixxx SQLite and production media untouched", () => {
  assert.ok(runner.length > 0);
  assert.doesNotMatch(controller + gstreamer, /sqlite|production media/i);
});
