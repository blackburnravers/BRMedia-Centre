import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const { WaveformClock } = require(path.resolve("server/public/dj-mixer/engine/waveform-clock-m12.js"));
const app = fs.readFileSync("server/public/dj-mixer/app.js", "utf8");
const css = fs.readFileSync("server/public/dj-mixer/styles.css", "utf8");
const spectral = fs.readFileSync("server/public/dj-mixer/engine/spectral-waveform.js", "utf8");

test("M24 interaction: playing advances, pause freezes, and resume continues", () => {
  let now = 0;
  const clock = new WaveformClock({ now: () => now, maxAnchorAgeMs: 5000 });
  clock.setAuthority("mixxx");
  clock.ingestMixxx({ loaded: true, playing: true, positionSeconds: 10, durationSeconds: 300, analysedBpm: 120, liveBpm: 120 });
  now = 750;
  assert.equal(clock.snapshot().position, 10.75);
  clock.ingestMixxx({ loaded: true, playing: false, positionSeconds: 10.75, durationSeconds: 300, analysedBpm: 120, liveBpm: 120 });
  now = 1750;
  assert.equal(clock.snapshot().position, 10.75);
  clock.ingestMixxx({ loaded: true, playing: true, positionSeconds: 10.75, durationSeconds: 300, analysedBpm: 120, liveBpm: 120 });
  now = 2250;
  assert.equal(clock.snapshot().position, 11.25);
});

test("M24 interaction: D1 and D2 clocks remain independent", () => {
  let now = 0;
  const d1 = new WaveformClock({ now: () => now }), d2 = new WaveformClock({ now: () => now });
  d1.setAuthority("mixxx"); d2.setAuthority("mixxx");
  d1.ingestMixxx({ loaded: true, playing: true, positionSeconds: 5, durationSeconds: 100 });
  d2.ingestMixxx({ loaded: true, playing: false, positionSeconds: 20, durationSeconds: 100 });
  now = 500;
  assert.equal(d1.snapshot().position, 5.5);
  assert.equal(d2.snapshot().position, 20);
});

test("M24 interaction: sole animation loop renders from authoritative clock with no M25 ownership", () => {
  assert.equal((app.match(/requestAnimationFrame\(animateM12Waveforms\)/g) || []).length, 3);
  const animation = app.slice(app.indexOf("const animateM12Waveforms"), app.indexOf("const abortM14WaveformWork"));
  assert.match(animation, /const visual = clock\.snapshot\(\)/);
  assert.match(animation, /renderM24PreparedWaveform\(config, prepared, \{ animatedOnly: true \}\)/);
  assert.doesNotMatch(animation, /m25GridAuthority|reconcilePhase|gridApi\.timeToBeat/);
  assert.doesNotMatch(app, /applyM25Grid[\s\S]{0,300}renderDjRealWaveforms\(config, getDeckStateForConfig/);
  assert.doesNotMatch(app, /current\.realGridPresence\) renderDjRealWaveforms\(config, getDeckStateForConfig/);
});

test("M24 interaction: detail drag anchors to Mixxx clock and sends the selected deck seek", () => {
  assert.match(app, /const mixxxClock = window\.BRMediaM12WaveformClock\?\.get\?\.\(config\.deckId\)\?\.snapshot\?\.\(\)/);
  assert.match(app, /waveformSeekState\.startTime = window\.BRMediaMixxxBackend\?\.isActive/);
  assert.match(app, /BRMediaMixxxBackend\.seek\(config\.deckId/);
  assert.match(app, /visibleSeconds = duration \/ Math\.max\(1, waveformZoom\)/);
});

test("M24 interaction: overview seeking remains direct and separate from detail dragging", () => {
  assert.match(app, /if \(!target\.classList\.contains\("is-fixed-centre-waveform"\)\) \{[\s\S]*seekDeckFromWaveformPointer\(event, target, true\)/);
  assert.match(app, /target\.classList\?\.contains\?\.\("is-fixed-centre-waveform"\)[\s\S]*seekRatio \* duration/);
});

test("M24 interaction: zoom controls and touch bindings cannot be cleared by snapshots", () => {
  assert.match(app, /bindDeckWaveformZoomControls\(config\)/);
  assert.match(app, /brDjWaveSeekBound/);
  assert.match(app, /pointerdown/);
  assert.match(app, /pointermove/);
  assert.doesNotMatch(app, /brmedia:mixxx-live-state[\s\S]{0,2500}removeEventListener\("pointer/);
});

test("M24 interaction: grid overlay is pointer-transparent and failure preserves waveform", () => {
  assert.doesNotMatch(css, /brM25[^\{]*\{[^\}]*pointer-events:\s*(auto|all)/i);
  assert.match(app, /M25 grid overlay failed; preserving M24 waveform/);
  assert.match(app, /beatGrid: null, showBeatGrid: false/);
});

test("M24 interaction: an isolated detail paint failure cannot terminate the animation loop", () => {
  const animation = app.slice(app.indexOf("const animateM12Waveforms"), app.indexOf("const abortM14WaveformWork"));
  assert.match(animation, /try \{[\s\S]*renderM24PreparedWaveform/);
  assert.match(animation, /catch \(error\)[\s\S]*detail waveform animation frame failed/);
  assert.match(animation, /window\.requestAnimationFrame\(animateM12Waveforms\)/);
});

test("M24 interaction: detail input captures before overlay handlers and repaint exposes viewport diagnostics", () => {
  assert.match(app, /pointerdown", async \(event\) => \{[\s\S]*\}, \{ capture: true \}\)/);
  assert.match(app, /pointermove", async \(event\) => \{[\s\S]*\}, \{ capture: true \}\)/);
  assert.match(spectral, /currentMixxxPosition: currentTime/);
  assert.match(spectral, /centreSample: Math\.round\(progress \* total\)/);
  assert.match(spectral, /lastDetailRepaintAt: Date\.now\(\)/);
});
