import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const index = fs.readFileSync("server/src/index.ts", "utf8");
const manager = fs.readFileSync("server/src/mixxxWebRtcSidecar.ts", "utf8");
const sidecar = fs.readFileSync("tools/webrtc-sidecar/app.cjs", "utf8");
const receiver = fs.readFileSync("server/public/dj-mixer/engine/m26-webrtc-receiver.js", "utf8");
const controller = fs.readFileSync("server/public/dj-mixer/engine/m26-master-audio-controller.js", "utf8");

test("M26 WebRTC sidecar remains localhost-only and BRMedia-authenticated", () => {
  assert.match(sidecar, /const host = "127\.0\.0\.1"/); assert.match(sidecar, /remoteAddress/); assert.match(sidecar, /Bearer/);
  assert.match(index, /getCurrentBrMediaProfile\(req\)/); assert.match(index, /requireM26SameOrigin\(req\)/); assert.match(index, /requireM26RequestedWith\(req\)/);
  assert.doesNotMatch(sidecar, /0\.0\.0\.0|createServer\([^]*public/i);
});
test("M26 owns one exact portable Node child with bounded shutdown", () => {
  assert.match(manager, /private child: ChildProcess \| null/); assert.match(manager, /if \(this\.child\) return/);
  assert.match(manager, /node-v22\.17\.1-win-x64/); assert.match(manager, /child\.pid === exactPid/); assert.match(manager, /child\.kill\(\)/);
  assert.doesNotMatch(manager, /taskkill|process\.kill|PATH|shell:\s*true/);
});
test("M26 WebRTC audio uses RTCAudioSource and one hidden direct Safari audio element", () => {
  assert.match(sidecar, /RTCAudioSource/); assert.match(sidecar, /source\.onData/); assert.match(sidecar, /BRM26BIN/);
  assert.equal((receiver.match(/document\.createElement\("audio"\)/g) || []).length, 1); assert.match(receiver, /playsInline = true/);
  assert.match(receiver, /style\.display = "none"/); assert.doesNotMatch(receiver, /button|toggle|getUserMedia/);
});
test("M26 WebRTC teardown stops senders, tracks, transceivers and peers", () => {
  assert.match(sidecar, /replaceTrack\(null\)/); assert.match(sidecar, /removeTrack/); assert.match(sidecar, /track\.stop/); assert.match(sidecar, /getTransceivers/); assert.match(sidecar, /pc\.close/);
});
test("M26 retains connected or awaiting-gesture peers and applies bounded failed-state cleanup", () => {
  assert.match(sidecar, /failedPeerGraceMs = 75_000/);
  assert.match(sidecar, /failed-grace-started/);
  assert.match(sidecar, /connection-failed-after-grace/);
  assert.doesNotMatch(sidecar, /\["failed", "closed"\]\.includes\(pc\.connectionState\)\) closePeer/);
});
test("M26 sends PCM before the playback gesture and keeps heartbeat independent from diagnostics", () => {
  assert.match(sidecar, /value\.source\.onData/);
  assert.match(controller, /async function publishHeartbeat/);
  assert.match(controller, /heartbeat: true/);
  assert.match(controller, /AbortController/);
  assert.match(controller, /void publishHeartbeat\(\); void publishTelemetry\(\)/);
  const telemetryBody = controller.slice(controller.indexOf("async function publishTelemetry"), controller.indexOf("async function startFromGesture"));
  assert.doesNotMatch(telemetryBody, /sessions\/\$\{encodeURIComponent\(session\.id\)\}\/telemetry/);
});
test("M26 normal session, Play, reconnect and new-peer paths cannot trigger diagnostic tone", () => {
  const route = index.slice(index.indexOf("async function handleM26MasterStreamRoute"), index.indexOf("function createBrMediaProfileSession"));
  assert.doesNotMatch(controller, /diagnostic-tone|startDiagnosticTone|\/tone/i);
  assert.doesNotMatch(route, /diagnostic-tone|startDiagnosticTone|\/tone/i);
  assert.doesNotMatch(manager, /diagnostic-tone|startDiagnosticTone|\/tone/i);
  assert.doesNotMatch(sidecar, /\btone\b|startTone|diagnosticGate|440/);
  const start = controller.slice(controller.indexOf("async function startFromGesture"), controller.indexOf("async function prepareAutomaticSession"));
  const reconnect = controller.slice(controller.indexOf("async function prepareAutomaticSession"), controller.indexOf("function activateFromExistingGesture"));
  const peer = sidecar.slice(sidecar.indexOf("async function createPeer"), sidecar.indexOf("function acceptPcm"));
  assert.doesNotMatch(start + reconnect + peer, /tone|oscillator|sine/i);
});
test("M26 test-only tone generation is isolated to non-production lifecycle probes", () => {
  const lifecycleProbe = fs.readFileSync("tools/webrtc-sidecar/lifecycle-probe.cjs", "utf8");
  const childProbe = fs.readFileSync("tools/webrtc-sidecar/sidecar-lifecycle-probe.cjs", "utf8");
  const route = index.slice(index.indexOf("async function handleM26MasterStreamRoute"), index.indexOf("function createBrMediaProfileSession"));
  assert.match(lifecycleProbe + childProbe, /const tone/);
  assert.doesNotMatch(controller + route + manager + sidecar, /diagnostic-tone|startDiagnosticTone|\/tone/i);
});
test("M26 PCM handoff uses exact parser and honours child stdin backpressure without duplicating accepted frames", () => {
  assert.match(sidecar, /ExactPcmFrameParser/);
  assert.match(sidecar, /frameBytes: FRAME_BYTES/);
  assert.match(sidecar, /emittedFrames/);
  assert.match(sidecar, /squareSum \/ Math\.max\(1, payload\.length \/ 2\)/);
  assert.match(manager, /pcmBackpressured/);
  assert.match(manager, /child\.stdin\?\.on\("drain"/);
  assert.match(manager, /if \(!this\.writeMediaRecord\(2, id, chunk\)\) \{ this\.pcmBackpressured\.add\(id\); this\.pcmBackpressureEvents \+= 1; \} return true/);
});
test("M26 deliberately replaces only a failed WebRTC peer on foreground return or Play", () => {
  assert.match(controller, /function peerNeedsReplacement/);
  assert.match(controller, /\["failed", "closed"\]\.includes/);
  assert.match(controller, /async function discardFailedSession/);
  assert.match(controller, /if \(peerNeedsReplacement\(\)\) await discardFailedSession\(\)/);
  assert.match(controller, /if \(!document\.hidden\) void prepareAutomaticSession\(\)/);
  assert.doesNotMatch(controller, /expiry <= Date\.now/);
});
test("M26 sidecar terminal cleanup releases the matching parent PCM listener", () => {
  assert.match(sidecar, /pipeDisconnects/);
  assert.match(sidecar, /clearStale/);
  assert.match(manager, /pcmClosedCallbacks/);
  assert.match(manager, /message\.type === "peer-closed"/);
  assert.match(index, /createSession\(session\.id, offer, djContext\.ownerId, \(\) =>/);
  assert.match(index, /mixxxMasterStream\.disconnect\(session\.id, djContext\.ownerId\)/);
});
test("M26 sidecar lifecycle diagnostics record exact terminal reasons", () => {
  assert.match(sidecar, /recordLifecycle/);
  assert.match(sidecar, /explicit-session-delete/);
  assert.match(sidecar, /controlled-shutdown/);
  assert.match(sidecar, /pcm-parse-error/);
  assert.match(sidecar, /cleanupReason/);
});
