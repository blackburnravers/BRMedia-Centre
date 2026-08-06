import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const read = (file: string) => fs.readFileSync(path.resolve(file), "utf8");
const app = read("server/public/dj-mixer/app.js");
const css = read("server/public/dj-mixer/styles.css");
const router = read("server/src/api/router.ts");
const renderer = read("server/public/dj-mixer/engine/spectral-waveform.js");
const runtime = require(path.resolve("server/public/dj-mixer/engine/waveform-runtime-m13.js"));
const clockRuntime = require(path.resolve("server/public/dj-mixer/engine/waveform-clock-m12.js"));
const authorityRuntime = require(path.resolve("server/public/dj-mixer/engine/m24-waveform-authority.js"));

const realPayload = (value = 0.7) => ({
  waveform: { peaks: [value, value / 2], bands: { low: [value] }, multiscale: { levels: [] }, formatVersion: "cache-v24" },
});
const readyAuthority = (deck = "d1", identity = "mixxx:101") => {
  const authority = authorityRuntime.create();
  const pending = authority.begin(deck, identity);
  assert.equal(authority.accept(deck, identity, pending.generation, realPayload()), true);
  return authority;
};

test("M24 accepted real waveform survives repeated Mixxx snapshots", () => {
  const authority = readyAuthority();
  for (let i = 0; i < 20; i += 1) assert.deepEqual(authority.resolve("d1", { progress: i / 20 }).waveformPeaks, [0.7, 0.35]);
});

test("M24 play pause and time updates preserve accepted payload", () => {
  const authority = readyAuthority();
  for (const visual of [{ isPlaying: false, currentTime: 1 }, { isPlaying: true, currentTime: 9 }, { isPlaying: false, currentTime: 15 }]) {
    assert.equal(authority.resolve("d1", visual).waveformPeaks.length, 2);
  }
});

test("M24 metadata refresh cannot replace accepted payload", () => {
  const authority = readyAuthority();
  assert.deepEqual(authority.resolve("d1", { title: "refreshed", waveformPeaks: [] }).waveformPeaks, [0.7, 0.35]);
});

test("M24 resize repaint resolves the same accepted payload", () => {
  const authority = readyAuthority();
  assert.strictEqual(authority.resolve("d1", {}).waveformPeaks, authority.resolve("d1", { resized: true }).waveformPeaks);
});

test("M24 preparation polling cannot downgrade accepted ready state", () => {
  const authority = readyAuthority();
  authority.transition("d1", { status: "preparing", realPayloadPresence: false }, "preparation-poll");
  assert.equal(authority.states.get("d1").status, "ready");
});

test("M24 stale unavailable response cannot downgrade ready", () => {
  const authority = readyAuthority();
  authority.transition("d1", { status: "not-prepared", realPayloadPresence: false }, "stale-response");
  assert.equal(authority.states.get("d1").status, "ready");
});

test("M24 old identity response cannot overwrite newer track", () => {
  const authority = authorityRuntime.create();
  const old = authority.begin("d1", "mixxx:1");
  const current = authority.begin("d1", "mixxx:2");
  assert.equal(authority.accept("d1", "mixxx:1", old.generation, realPayload(0.1)), false);
  assert.equal(authority.accept("d1", "mixxx:2", current.generation, realPayload(0.9)), true);
});

test("M24 eject clears accepted payload", () => {
  const authority = readyAuthority();
  authority.clear("d1");
  assert.equal(authority.states.get("d1").realPayloadPresence, false);
  assert.equal(authority.resolve("d1", {}).waveformPeaks, undefined);
});

test("M24 new load replaces accepted payload", () => {
  const authority = readyAuthority();
  const next = authority.begin("d1", "mixxx:202");
  authority.accept("d1", "mixxx:202", next.generation, realPayload(0.9));
  assert.deepEqual(authority.resolve("d1", {}).waveformPeaks, [0.9, 0.45]);
});

test("M24 D1 and D2 authoritative payloads remain independent", () => {
  const authority = authorityRuntime.create();
  const d1 = authority.begin("d1", "mixxx:1"); const d2 = authority.begin("d2", "mixxx:2");
  authority.accept("d1", "mixxx:1", d1.generation, realPayload(0.2));
  authority.accept("d2", "mixxx:2", d2.generation, realPayload(0.8));
  assert.notDeepEqual(authority.resolve("d1", {}).waveformPeaks, authority.resolve("d2", {}).waveformPeaks);
});

test("M24 placeholder data is used only when real payload is absent", () => {
  const authority = authorityRuntime.create();
  authority.begin("d1", "mixxx:1");
  assert.deepEqual(authority.resolve("d1", { waveformPeaks: [0.05] }).waveformPeaks, [0.05]);
  const current = authority.states.get("d1"); authority.accept("d1", "mixxx:1", current.generation, realPayload());
  assert.deepEqual(authority.resolve("d1", { waveformPeaks: [0.05] }).waveformPeaks, [0.7, 0.35]);
});

test("M24 repeated snapshots create neither duplicate fetch nor render loop", () => {
  const authority = readyAuthority();
  for (let i = 0; i < 50; i += 1) { authority.begin("d1", "mixxx:101"); authority.resolve("d1", { currentTime: i }); }
  assert.equal(authority.fetches.get("d1"), 1);
  assert.equal(authority.states.size, 1);
});

test("M24 endpoint resolves only an exact Mixxx identity for reads and bounded preparation", () => {
  assert.match(router, /mixxxWaveformMatch/);
  assert.match(router, /mixxxCatalogueProvider\.resolveTrack\(identity\)/);
  assert.match(router, /findLibraryItemByLocator\(track\.filePath\)/);
  assert.match(router, /getExistingWaveformCache/);
  assert.match(router, /if \(!payload\) \{/);
  const route = router.slice(router.indexOf("const mixxxWaveformMatch"), router.indexOf("/api/dj/mixxx/workflow/add"));
  assert.match(route, /mixxxWaveformPrepareMatch/);
  assert.match(route, /startWaveformGenerationJob\(\[association\]/);
  assert.match(route, /scope: "single"/);
  assert.doesNotMatch(route, /enqueueAll|scope: "all"|listLibrary\(\)/);
  assert.match(route, /not-prepared/);
  assert.match(read("server/src/waveforms.ts"), /getWaveformSourceIndex/);
  assert.match(read("server/src/waveforms.ts"), /pathIdentity/);
  assert.match(route, /track-missing/);
});

test("M24 D1 and D2 own independent identity, abort and generation state", () => {
  assert.match(app, /const m24MixxxWaveforms = m24WaveformAuthority\?\.states \|\| new Map/);
  assert.match(app, /deckWaveformRequestPipelines\?\.begin\?\.\(config\.deckId\)/);
  assert.match(app, /request\?\.isCurrent\?\.\(\)/);
  assert.match(app, /prepared\?\.payload/);
  assert.match(app, /clearM24Waveform\(config\)/);
  assert.match(app, /stableIdentity/);
  assert.doesNotMatch(app.slice(app.indexOf("const requestM24MixxxWaveform"), app.indexOf("const lastAnimatedWaveformState")), /title.*match|artist.*match|filename.*match/);

  const pipelines = runtime.createRequestPipelines();
  const d1a = pipelines.begin("d1");
  const d2a = pipelines.begin("d2");
  const d1b = pipelines.begin("d1");
  assert.equal(d1a.isCurrent(), false);
  assert.equal(d1b.isCurrent(), true);
  assert.equal(d2a.isCurrent(), true);
  pipelines.abort("d2");
  assert.equal(d2a.isCurrent(), false);
});

test("M24 has truthful loading, empty, unavailable, mismatch and retry states", () => {
  for (const state of ["deck-empty", "loading", "not-prepared", "queued", "preparing", "preparation-failed", "cache-mismatch", "corrupt", "network-error", "identity-unavailable", "ready-grid-not-prepared"]) {
    assert.match(css, new RegExp(state));
  }
  assert.match(css, /Waveform not prepared/);
  assert.match(css, /reload track to retry/);
  assert.doesNotMatch(css, /data-mixxx-waveform-state="not-prepared"[^}]+background-image:\s*url/);
  assert.match(app, /dataset\.m24PrepareWaveform/);
  assert.match(app, /\/prepare`/);
  assert.match(app, /pollM24WaveformJob/);
  assert.match(app, /cache: "no-store"/);
});

test("M24 waveform Jobs are deduplicated and serialised", () => {
  const waveforms = read("server/src/waveforms.ts");
  assert.match(waveforms, /let waveformJobQueue: Promise<void> = Promise\.resolve\(\)/);
  assert.match(waveforms, /job\.status === "queued" \|\| job\.status === "running"/);
  assert.match(waveforms, /waveformJobQueue = waveformJobQueue\.catch/);
});

test("M24 one tap creates one job and duplicate taps are suppressed", () => {
  assert.match(app, /current\.submitPending \|\| current\.state === "queued" \|\| current\.state === "preparing"/);
  assert.match(app, /submitPending: true/);
  assert.match(app, /jobId: payload\.job\?\.id/);
  assert.match(read("server/src/waveforms.ts"), /getWaveformJobForTrack/);
});

test("M24 queued and preparing state survive transport snapshots and rerenders", () => {
  const request = app.slice(app.indexOf("const requestM24MixxxWaveform"), app.indexOf("window.addEventListener(\"brmedia:mixxx-live-state\""));
  assert.match(request, /if \(existing\?\.identity === identity\)/);
  assert.match(request, /setM24WaveformState\(config, existing\.status/);
  assert.match(app, /const accepted = transitionM24Waveform\(config, \{ stableIdentity: identity, status: lifecycleState, jobId \}, "preparation-poll"\)/);
});

test("M24 ready loads the real waveform and failed remains a stable Retry state", () => {
  assert.match(app, /await requestM24MixxxWaveform\(config, identity\)/);
  assert.match(app, /const renderM24PreparedWaveform/);
  const readyStart = app.indexOf('}, "cache-resolution-success")');
  const readyHandler = app.slice(readyStart, app.indexOf('} catch (error)', readyStart));
  assert.match(readyHandler, /renderM24PreparedWaveform\(config, prepared\)/);
  assert.match(app, /isLoaded: true/);
  assert.match(app, /waveformPeaks: waveform\.peaks/);
  assert.match(app, /state === "preparation-failed" \? "Failed — Retry"/);
  assert.match(router, /state === "failed"/);
});

test("M24 stale completion is rejected while D1 and D2 jobs remain independent", () => {
  assert.match(app, /m24MixxxWaveforms\.get\(config\.deckId\)\?\.identity === identity/);
  assert.match(app, /m24WaveformPreparationPolls\.get\(config\.deckId\) === jobId/);
  assert.match(app, /m24WaveformPreparationPolls\.delete\(config\.deckId\)/);
});

test("M24 API exposes the stable available queued preparing ready failed lifecycle", () => {
  for (const state of ["available", "queued", "preparing", "ready", "failed"]) {
    assert.match(router, new RegExp(`"${state}"`));
  }
  assert.match(router, /getWaveformJobForTrack\(association\.id\)/);
  assert.match(read("server/src/waveforms.ts"), /writeDjPreparedAssetJsonAtomically\(cachePath/);
  assert.match(read("server/src/waveforms.ts"), /createDjSourceFingerprint\(filePath/);
});

test("M24 reuses fixed-centre, stationary overview, spectral, grid, marker and multiscale rendering", () => {
  assert.match(renderer, /fixedCentre/);
  assert.match(renderer, /const playheadX = fixedCentre \? centreX/);
  assert.match(renderer, /options\.compact/);
  assert.match(renderer, /played/);
  assert.match(renderer, /drawDjBeatGrid|drawBeatGrid/);
  assert.match(renderer, /memoryPoints/);
  assert.match(renderer, /waveformMultiscale/);
  assert.match(renderer, /chooseLevel/);
  assert.match(renderer, /window\.devicePixelRatio/);
});

test("M24 clock remains authoritative across pause, play, rate, seek, stale and reconnect", () => {
  let now = 1_000;
  const clock = new clockRuntime.WaveformClock({ now: () => now });
  clock.setAuthority("mixxx");
  clock.ingestMixxx({ loaded: true, playing: false, positionSeconds: 10, durationSeconds: 100, rate: 0, stale: false });
  now += 2_000;
  assert.equal(clock.snapshot().position, 10);
  clock.ingestMixxx({ loaded: true, playing: true, positionSeconds: 10, durationSeconds: 100, rate: 0.1, stale: false });
  now += 1_000;
  assert.ok(clock.snapshot().position > 10);
  clock.ingestMixxx({ loaded: true, playing: true, positionSeconds: 70, durationSeconds: 100, rate: 0.1, stale: false });
  assert.ok(clock.snapshot().position >= 69);
  clock.ingestMixxx({ loaded: true, playing: true, positionSeconds: 70, durationSeconds: 100, stale: true });
  assert.equal(clock.snapshot().stale, true);
  clock.ingestMixxx({ loaded: true, playing: false, positionSeconds: 100, durationSeconds: 100, stale: false });
  assert.equal(clock.snapshot().progress, 1);
});

test("M24 zoom and mobile lifecycle stay bounded and touch safe", () => {
  assert.equal(runtime.canvasSize(10_000, 2_000, 8).pixelRatio, 3);
  const levels = [{ count: 64 }, { count: 512 }, { count: 4096 }];
  assert.equal(runtime.chooseLevel(levels, 300).count, 512);
  assert.match(app, /DJ_WAVEFORM_ZOOM_LEVELS/);
  assert.match(app, /orientationchange/);
  assert.match(app, /ResizeObserver/);
  assert.match(app, /document\.hidden/);
  assert.match(app, /pagehide/);
  assert.match(css, /touch-action:\s*none/);
  assert.match(css, /overscroll-behavior:\s*contain/);
});

test("M24 clean-room record pins runtime, skin, files and licence boundary", () => {
  const audit = read("tools/compatibility/mixxx-m23/M24_WAVEFORM_CLEAN_ROOM_AUDIT.md");
  assert.match(audit, /3ebac449e7e5fe2a0186596657696e87ce8b0e56/);
  assert.match(audit, /LateNight 2\.4\.0\.01/);
  assert.match(audit, /GPL-2\.0-or-later/);
  assert.match(audit, /CC BY-SA 3\.0/);
  assert.match(audit, /were not copied/);
});
