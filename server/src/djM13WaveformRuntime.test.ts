import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { validateM12WaveformPyramid } from "./djM12Waveform";

const runtime = require(path.resolve(
  __dirname, "..", "public", "dj-mixer", "engine", "waveform-runtime-m13.js",
));
const { WaveformClock } = require(path.resolve(
  __dirname, "..", "public", "dj-mixer", "engine", "waveform-clock-m12.js",
));

test("M13 computes bounded DPR backing sizes", () => {
  assert.deepEqual(runtime.canvasSize(320.4, 80.2, 2), {
    cssWidth: 320.4,
    cssHeight: 80.2,
    pixelRatio: 2,
    width: 641,
    height: 160,
  });
  assert.equal(runtime.canvasSize(100, 20, 9).pixelRatio, 3);
  assert.equal(runtime.canvasSize(0, 0, 2).width, 0);
});

test("M13 validates cache schema and safely normalises fallback arrays", () => {
  assert.equal(runtime.validatePyramid({ complete: true, levels: [] }).valid, false);
  const fallback = runtime.safeFallback(
    [0, 2, Number.NaN, -1],
    { low: [0, 0.5, 1, 2], transient: [0, 1] },
  );
  assert.deepEqual(fallback.peaks, [0, 1, 0, 0]);
  assert.deepEqual(fallback.bands.low, [0, 0.5, 1, 1]);
  assert.equal("transient" in fallback.bands, false);
});

test("M13 selects multiscale levels deterministically with hysteresis", () => {
  const levels = [512, 2048, 8192, 32768].map((count) => ({ count }));
  assert.equal(runtime.chooseLevel(levels, 1000)?.count, 2048);
  assert.equal(runtime.chooseLevel(levels, 3500, 2048)?.count, 2048);
  assert.equal(runtime.chooseLevel(levels, 5000, 2048)?.count, 8192);
  assert.equal(runtime.chooseLevel(levels, 3000, 8192)?.count, 8192);
  assert.equal(runtime.chooseLevel(levels, 2000, 8192)?.count, 2048);
});

test("M13 clock interpolates native and Mixxx, snaps discontinuities, and freezes stale feeds", () => {
  let now = 1000;
  const native = new WaveformClock({ now: () => now, maxAnchorAgeMs: 500 });
  native.ingestNative({ isLoaded: true, isPlaying: true, currentTime: 5, duration: 60 }, now);
  now += 100;
  assert.ok(Math.abs(native.position(now) - 5.1) < 0.001);
  native.ingestNative({ isLoaded: true, isPlaying: false, currentTime: 5.1, duration: 60 }, now);
  now += 1000;
  assert.ok(Math.abs(native.position(now) - 5.1) < 0.001);

  now = 2000;
  const mixxx = new WaveformClock({ now: () => now, maxAnchorAgeMs: 500 });
  mixxx.setAuthority("mixxx");
  mixxx.ingestMixxx({
    loaded: true, playing: true, positionSeconds: 10, durationSeconds: 100,
    analysedBpm: 170, liveBpm: 170,
  }, now);
  now += 2000;
  assert.equal(mixxx.position(now), 10.5);
  assert.equal(mixxx.snapshot(now).stale, true);
  mixxx.ingestMixxx({
    loaded: true, playing: true, positionSeconds: 20, durationSeconds: 100,
  }, now);
  assert.equal(mixxx.position(now), 20);
  assert.equal(mixxx.snapshot(now).reconciliations, 1);
});

test("M13 validates every approved M12 production cache without regeneration", () => {
  const cacheDirectory = path.resolve(__dirname, "..", ".cache", "waveforms");
  const caches = fs.readdirSync(cacheDirectory).filter((name) => name.endsWith(".m12wave.json"));
  assert.ok(caches.length >= 1);
  for (const cache of caches) {
    const payload = JSON.parse(fs.readFileSync(path.join(cacheDirectory, cache), "utf8"));
    assert.equal(validateM12WaveformPyramid(payload.multiscale).valid, true);
    assert.equal(runtime.validatePyramid(payload.multiscale).valid, true);
  }
});

test("M13 frontend activates validation, stale-load guards, resize and pointer hardening", () => {
  const renderer = fs.readFileSync(path.resolve(
    __dirname, "..", "public", "dj-mixer", "engine", "spectral-waveform.js",
  ), "utf8");
  const engine = fs.readFileSync(path.resolve(
    __dirname, "..", "public", "dj-mixer", "engine", "audio-engine.js",
  ), "utf8");
  const app = fs.readFileSync(path.resolve(
    __dirname, "..", "public", "dj-mixer", "app.js",
  ), "utf8");
  assert.match(renderer, /validatePyramid/);
  assert.match(renderer, /selectedLevelByTarget/);
  assert.match(engine, /BRMEDIA_STALE_DECK_LOAD/);
  assert.match(app, /deckWaveformRequestTokens/);
  assert.match(app, /event\.isPrimary === false/);
  assert.match(app, /ResizeObserver/);
  assert.match(app, /document\.hidden/);
});
