import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const performance = fs.readFileSync("server/public/dj-mixer/performance.html", "utf8");
const app = fs.readFileSync("server/public/dj-mixer/app.js", "utf8");
const controller = fs.readFileSync("server/public/dj-mixer/engine/m26-master-audio-controller.js", "utf8");
const receiver = fs.readFileSync("server/public/dj-mixer/engine/m26-webrtc-receiver.js", "utf8");

const performanceNavigation = app.slice(
  app.indexOf('$$("[data-perf-view]")'),
  app.indexOf("function syncDuoSyncRailState")
);
const deckNavigation = app.slice(
  app.indexOf('$$("[data-deck-tab]")'),
  app.indexOf("syncGridControlSet(1);")
);

test("M26 Performance navigation is one in-document shell, not document routing", () => {
  assert.match(performance, /<main class="brDjPerformanceShell"/);
  for (const view of ["deck-1", "duo", "deck-2"]) assert.match(performance, new RegExp(`data-perf-view="${view}"`));
  for (const tab of ["main", "mixer", "fx", "vinyl", "record"]) assert.match(performance, new RegExp(`data-duo-tab="${tab}"`));
  for (const tab of ["main", "grid", "hot-cue", "memory", "stems"]) assert.match(performance, new RegExp(`data-deck-tab="${tab}"`));
  assert.doesNotMatch(performanceNavigation + deckNavigation, /location\.|pushState|replaceState|href\s*=|pagehide|beforeunload/);
  assert.match(performanceNavigation + deckNavigation, /setPerformancePanelActive|syncDeckTab/);
});

test("one M26 receiver belongs to the shared Performance shell", () => {
  assert.equal((controller.match(/new WebRtcReceiver\(\)/g) || []).length, 1);
  assert.match(controller, /if \(receiver\) return receiver/);
  assert.equal((receiver.match(/document\.createElement\("audio"\)/g) || []).length, 1);
  assert.doesNotMatch(performanceNavigation + deckNavigation, /BRMediaMixxxMasterAudio|m26|receiver|RTCPeerConnection|srcObject|\.play\(/i);
});

test("Deck 1 Grid Hot Cue Memory and Stems retain receiver, stream, track and srcObject identity", () => {
  for (const transition of ["grid", "hot-cue", "memory", "stems"]) assert.match(performance, new RegExp(`data-deck-(?:tab|panel)="${transition}"`));
  assert.doesNotMatch(deckNavigation, /stop\(|closePeer|createOffer|acceptAnswer|srcObject|pause\(|reset/);
  assert.match(receiver, /this\.stream = event\.streams\?\.\[0\]/);
  assert.match(receiver, /this\.track = event\.track/);
  assert.match(receiver, /this\.audio\.srcObject = this\.stream/);
});

test("Deck 1 DUO Deck 2 and Mixer FX Vinyl Recording retain the same receiver", () => {
  assert.doesNotMatch(performanceNavigation, /stop\(|closePeer|createOffer|acceptAnswer|srcObject|pause\(|reset/);
  for (const panel of ["main", "mixer", "fx", "vinyl", "record"]) assert.match(performance, new RegExp(`data-dj-duo-panel="${panel}"`));
});

test("ordinary navigation cannot redundantly play, replace or clean up the live peer", () => {
  assert.match(controller, /if \(session && !peerNeedsReplacement\(\) && detail\?\.audioContextState === "running" && detail\?\.outputAttached\) return/);
  assert.match(receiver, /if \(this\.audio\.paused\) await this\.attemptPlay\("session-start"\)/);
  assert.doesNotMatch(performanceNavigation + deckNavigation, /attemptPlay|unlockFromGesture|discardFailedSession|deleteSession|audio\.play/);
});

test("terminal cleanup, backend cleanup and failed-peer recovery remain explicit", () => {
  assert.match(controller, /window\.addEventListener\("pagehide"/);
  assert.match(controller, /if \(!backendActive && session\)/);
  assert.match(controller, /\["failed", "closed"\]\.includes/);
  assert.match(controller, /if \(peerNeedsReplacement\(\)\) await discardFailedSession\(\)/);
  assert.match(receiver, /this\.audio\.pause\(\); this\.audio\.srcObject = null/);
});
