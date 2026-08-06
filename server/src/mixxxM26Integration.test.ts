import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
const index = fs.readFileSync("server/src/index.ts", "utf8");
const controller = fs.readFileSync("server/public/dj-mixer/engine/m26-master-audio-controller.js", "utf8");
const receiver = fs.readFileSync("server/public/dj-mixer/engine/m26-master-receiver.js", "utf8");
const transport = fs.readFileSync("server/public/dj-mixer/engine/m26-pcm-http-transport.js", "utf8");
const audioEngine = fs.readFileSync("server/public/dj-mixer/engine/audio-engine.js", "utf8");
const helper = fs.readFileSync("tools/windows/m26-wasapi-loopback.cs", "utf8");
const performance = fs.readFileSync("server/public/dj-mixer/performance.html", "utf8");
const styles = fs.readFileSync("server/public/dj-mixer/styles.css", "utf8");
const djTrust = fs.readFileSync("server/src/mixxxM26DjTrust.ts", "utf8");

test("M26 signalling uses scoped DJ Performance trust without Profile login", () => {
  const route = index.slice(index.indexOf("async function handleM26MasterStreamRoute"), index.indexOf("function createBrMediaProfileSession"));
  assert.doesNotMatch(route, /getCurrentBrMediaProfile\(req\)|profile\.user|profile\.token/);
  assert.match(index, /requireM26SameOrigin\(req\)/); assert.match(index, /requireM26DjPerformanceContext\(req, origin\)/);
  assert.match(index, /x-brmedia-requested-with/); assert.match(index, /req\.headers\.authorization/i);
  assert.match(djTrust, /referer\.pathname !== "\/dj-mixer\/performance\.html"/);
  assert.match(djTrust, /x-brmedia-dj-session/); assert.match(controller, /crypto\.getRandomValues/);
});
test("M26 endpoint exposes audio only and no device or microphone selection", () => {
  const route = index.slice(index.indexOf("async function handleM26MasterStreamRoute"), index.indexOf("function createBrMediaProfileSession"));
  assert.match(route, /application\/vnd\.brmedia\.pcm/); assert.doesNotMatch(route, /endpointId|devicePath|filePath|microphone|getUserMedia/);
  assert.match(helper, /StreamLoopback/); assert.match(helper, /dataFlow != EDataFlowRender/);
});
test("M26 browser reuses one AudioContext and never requests capture", () => {
  assert.match(controller, /Engine\.getEngine\(\)\.context/); assert.doesNotMatch(controller + receiver + transport, /getUserMedia|MediaRecorder|RTCPeerConnection|video/);
  assert.equal((audioEngine.match(/new AudioContextCtor\(\)/g) || []).length, 1); assert.match(receiver, /maxBufferedMs/); assert.match(receiver, /createBoundedLegacyNode/);
});
test("M26 backend switching tears down and preserves Native authority", () => {
  assert.match(controller, /brmedia:dj-backend-state/); assert.match(controller, /if \(!backendActive && session\)/); assert.match(receiver, /backendChanged\(active\)/);
  assert.match(audioEngine, /setExternalAuthority\(active = false\)/);
});
test("M26 has no visible audio control and original header", () => {
  for (const script of ["m26-pcm-http-transport.js", "m26-master-receiver.js", "m26-master-audio-controller.js"]) assert.match(performance, new RegExp(script.replace(".", "\\.")));
  assert.doesNotMatch(performance + styles + controller, /data-m26-master-audio|brDjPerfMasterAudio|Phone Master Audio/i);
  assert.match(styles, /\.brDjPerformanceTop\s*\{[^}]*grid-template-columns:\s*44px repeat\(3, minmax\(0, 1fr\)\) 44px;/s);
});
test("M26 prepares one session and unlocks only from an existing gesture", () => {
  assert.match(controller, /function ensureSession\(\)/); assert.match(controller, /if \(sessionPromise\) return sessionPromise/);
  assert.match(controller, /document\.addEventListener\("click", activateFromExistingGesture/);
  assert.match(controller, /activeReceiver\.snapshot\(\)\.audioContextState === "running" \? null : activeReceiver\.unlockFromGesture\(\)/);
  assert.doesNotMatch(controller, /DOMContentLoaded[^]*startFromGesture/);
});
