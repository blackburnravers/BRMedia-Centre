import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { MixxxMidiBridge } from "./mixxxBridge";
import { parseMixxxTaskStatus } from "./mixxxTaskStatus";

const root = path.resolve(__dirname, "..", "..");
const startup = fs.readFileSync(path.join(root, "tools/windows/mixxx-startup.ps1"), "utf8");
const frontend = fs.readFileSync(path.join(root, "server/public/dj-mixer/components/mixxx-backend-m3.js"), "utf8");
const docs = fs.readFileSync(path.join(root, "tools/windows/MIXXX_STARTUP.md"), "utf8");

test("M17 distinguishes task waiting, running, succeeded, failed, disabled and missing", () => {
  const base = { arguments: "-DelaySeconds 12 -RetryCount 12 -RetryDelaySeconds 3", missedRuns: 0 };
  assert.equal(parseMixxxTaskStatus({ ...base, state: "Ready", enabled: true, lastRunAt: "1999-11-30T00:00:00.000Z", lastResult: 267011 }).state, "waiting-for-logon");
  assert.equal(parseMixxxTaskStatus({ ...base, state: "Running", enabled: true, lastRunAt: "2026-07-29T12:00:00.000Z", lastResult: 267009 }).lastRunOutcome, "running");
  assert.equal(parseMixxxTaskStatus({ ...base, state: "Ready", enabled: true, lastRunAt: "2026-07-29T12:00:00.000Z", lastResult: 0 }).lastRunOutcome, "succeeded");
  assert.equal(parseMixxxTaskStatus({ ...base, state: "Ready", enabled: true, lastRunAt: "2026-07-29T12:00:00.000Z", lastResult: 1 }).lastRunOutcome, "failed");
  assert.equal(parseMixxxTaskStatus({ ...base, state: "Disabled", enabled: false }).state, "disabled");
  assert.equal(parseMixxxTaskStatus({ missing: true }).state, "missing");
});

test("M17 startup records genuine trigger evidence, actions, retries and bounds logs", () => {
  assert.match(startup, /TriggerObservedAt/);
  assert.match(startup, /DelayElapsedAt/);
  assert.match(startup, /RunId/);
  assert.match(startup, /process-already-running/);
  assert.match(startup, /process-launched/);
  assert.match(startup, /executable-missing/);
  assert.match(startup, /process-running-bridge-unavailable/);
  assert.match(startup, /Length -gt 524288/);
  assert.match(startup, /Get-Content \$LogPath -Tail 1000/);
});

test("M17 reconnect telemetry is bounded, cancelled and transport-free", () => {
  assert.match(frontend, /telemetry\("attempt"/);
  assert.match(frontend, /telemetry\("success"\)/);
  assert.match(frontend, /telemetry\("exhausted"\)/);
  assert.match(frontend, /telemetry\("cancelled"\)/);
  assert.match(frontend, /reconnectAttempt >= 6/);
  assert.match(frontend, /reconnectGeneration/);
  const reconnect = frontend.slice(frontend.indexOf("function beginReconnect"), frontend.indexOf("function schedulePolling"));
  assert.doesNotMatch(reconnect, /\/play|\/cue|transport\(/);
});

test("M17 readiness and telemetry remain truthful without Mixxx", () => {
  const bridge = new MixxxMidiBridge({
    input: () => ({ getPortCount: () => 0, getPortName: () => "", openPort() {}, closePort() {}, on() { return this; } }),
    output: () => ({ getPortCount: () => 0, getPortName: () => "", openPort() {}, closePort() {}, sendMessage() {} }),
  });
  const status = bridge.status();
  assert.equal(status.availableBackends[0].available, true);
  assert.equal(status.readiness.bridgeReachable, false);
  assert.equal(status.readiness.protocolConnected, false);
  assert.equal(status.readiness.heartbeatRecent, false);
  assert.equal(status.readiness.backendUsable, false);
  assert.equal(status.effectiveBackend, "brmedia-native");
  bridge.reportReconnectTelemetry("attempt", 500);
  assert.equal(bridge.status().telemetry.reconnectAttempts, 1);
  bridge.reportReconnectTelemetry("exhausted");
  assert.ok(bridge.status().telemetry.retryExhaustedAt);
});

test("M17 operator guidance requires a genuine login and never manual task start", () => {
  assert.match(docs, /Do not start the task manually/);
  assert.match(docs, /sign out and sign back in only after explicit\s+approval/);
  assert.match(docs, /Backend usable: False/);
  assert.doesNotMatch(docs, /Start-ScheduledTask/);
});
