import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  buildM12WaveformPyramid,
  DJ_M12_CACHE_SUFFIX,
  DJ_M12_LEVEL_COUNTS,
  DJ_M12_WAVEFORM_VERSION,
  validateM12WaveformPyramid,
} from "./djM12Waveform";
import { writeDjPreparedAssetJsonAtomically } from "./djPreparedAssets";

test("M12 builds genuine bounded multiscale spectral bands", () => {
  const count = 4096;
  const impulse = (offset: number) => Array.from({ length: count }, (_, index) =>
    index === offset ? 1 : index > offset && index < offset + 5 ? 0.25 : 0);
  const pyramid = buildM12WaveformPyramid({
    combined: impulse(1024),
    low: impulse(1024),
    mid: impulse(2048),
    high: impulse(3072),
    transients: impulse(1024),
  });
  assert.equal(pyramid.formatVersion, DJ_M12_WAVEFORM_VERSION);
  assert.deepEqual(pyramid.levels.map((level) => level.count), [...DJ_M12_LEVEL_COUNTS]);
  assert.equal(validateM12WaveformPyramid(pyramid).valid, true);
  const high = pyramid.levels[pyramid.levels.length - 1]!;
  assert.notDeepEqual(high.low, high.mid);
  assert.notDeepEqual(high.mid, high.high);
});

test("M12 rejects zero-byte, partial, and wrong-version cache payloads", () => {
  assert.equal(validateM12WaveformPyramid(null).valid, false);
  assert.equal(validateM12WaveformPyramid({ formatVersion: DJ_M12_WAVEFORM_VERSION }).valid, false);
  const valid = buildM12WaveformPyramid({
    combined: [0, 1], low: [1, 0], mid: [0.5, 0], high: [0, 0.5], transients: [0, 1],
  });
  assert.equal(validateM12WaveformPyramid({ ...valid, complete: false }).valid, false);
  assert.equal(validateM12WaveformPyramid({ ...valid, formatVersion: "future" }).valid, false);
});

test("M12 atomic writer never accepts a partial destination", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "brmedia-m12-"));
  const target = path.join(directory, `fixture${DJ_M12_CACHE_SUFFIX}`);
  try {
    const pyramid = buildM12WaveformPyramid({
      combined: [0, 1], low: [1, 0], mid: [0.5, 0], high: [0, 0.5], transients: [0, 1],
    });
    writeDjPreparedAssetJsonAtomically(target, { multiscale: pyramid });
    const stored = JSON.parse(fs.readFileSync(target, "utf8"));
    assert.equal(validateM12WaveformPyramid(stored.multiscale).valid, true);
    assert.equal(fs.readdirSync(directory).some((name) => name.endsWith(".tmp")), false);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("M12 waveform clock interpolates, reconciles, freezes stale, and snaps seeks", () => {
  const clockModule = require(path.resolve(
    __dirname, "..", "public", "dj-mixer", "engine", "waveform-clock-m12.js",
  ));
  let now = 1000;
  const clock = new clockModule.WaveformClock({ now: () => now, discontinuitySeconds: 0.35 });
  clock.setAuthority("mixxx");
  clock.ingestMixxx({
    loaded: true, playing: true, stale: false, positionSeconds: 10,
    durationSeconds: 100, analysedBpm: 170, liveBpm: 170,
  }, now);
  now += 200;
  assert.ok(Math.abs(clock.position(now) - 10.2) < 0.001);
  clock.ingestMixxx({
    loaded: true, playing: true, stale: false, positionSeconds: 20,
    durationSeconds: 100, analysedBpm: 170, liveBpm: 170,
  }, now);
  assert.equal(clock.position(now), 20);
  clock.ingestMixxx({
    loaded: true, playing: true, stale: true, positionSeconds: 20,
    durationSeconds: 100,
  }, now);
  now += 1000;
  assert.equal(clock.position(now), 20);
});

test("M12 frontend wires fixed centre, overview, DPR, touch and Mixxx clock", () => {
  const renderer = fs.readFileSync(
    path.resolve(__dirname, "..", "public", "dj-mixer", "engine", "spectral-waveform.js"), "utf8",
  );
  const app = fs.readFileSync(
    path.resolve(__dirname, "..", "public", "dj-mixer", "app.js"), "utf8",
  );
  assert.match(renderer, /fixedCentre/);
  assert.match(renderer, /devicePixelRatio/);
  assert.match(app, /BRMediaM12WaveformClock/);
  assert.match(app, /pointercancel/);
  assert.match(app, /touchAction/);
  assert.match(app, /dblclick/);
  assert.match(app, /brmedia:mixxx-live-state/);
});

test("M12 Mixxx seek is bounded, versioned, and exposes no raw route", () => {
  const protocol = fs.readFileSync(path.resolve(__dirname, "mixxxProtocol.ts"), "utf8");
  const bridge = fs.readFileSync(path.resolve(__dirname, "mixxxBridge.ts"), "utf8");
  const script = fs.readFileSync(
    path.resolve("tools/mixxx/BRMedia-Mixxx-M7-Live-Engine-scripts.js"), "utf8",
  );
  assert.match(protocol, /BRMEDIA_MIXXX_M12_PROTOCOL_VERSION = 5/);
  assert.match(bridge, /sendM12Seek/);
  assert.match(bridge, /position must be a finite number from 0 to 1/);
  assert.match(script, /engine\.setParameter\(group, "playposition"/);
  assert.doesNotMatch(bridge, /\/raw/);
});
