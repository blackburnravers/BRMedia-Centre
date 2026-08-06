import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const runtime = require(path.resolve(
  __dirname, "..", "public", "dj-mixer", "engine", "waveform-runtime-m13.js",
));

test("M15 samples bounded, throttled, privacy-safe performance history", () => {
  let now = 0;
  const diagnostics = runtime.createDiagnostics({
    enabled: true,
    historyLimit: 10,
    sampleIntervalMs: 100,
    slowFrameThresholdMs: 20,
    now: () => now,
  });

  for (let index = 0; index < 30; index += 1) {
    now = index * 50;
    diagnostics.record("d1", {
      dpr: 2,
      cssSize: { width: 320 + index, height: 80 },
      backingSize: { width: (320 + index) * 2, height: 160 },
      selectedCacheLevel: 8192,
      frameTimingMs: index % 3 === 0 ? 24 : 4,
      snapCount: 2,
      lastFallbackReason: "invalid-data",
      trackPath: "C:\\private\\track.mp3",
    });
  }

  const history = diagnostics.history();
  assert.equal(history.decks.d1.length, 10);
  assert.equal(history.decks.d2.length, 0);
  assert.equal(history.decks.d1.at(-1)?.dpr, 2);
  assert.equal(history.decks.d1.at(-1)?.selectedCacheLevel, 8192);
  assert.equal(history.decks.d1.at(-1)?.reconciliationSnaps, 2);
  assert.equal(JSON.stringify(history).includes("private"), false);
  assert.equal(diagnostics.snapshot().decks.d1.slowFrameCount, 10);
  diagnostics.record("d1", {
    lastFallbackReason: "Could not read C:\\Users\\private\\secret.mp3",
  });
  assert.equal(diagnostics.snapshot().decks.d1.lastFallbackReason, "waveform-error");
});

test("M15 history is off by default, independent by deck, and clearable", () => {
  let now = 100;
  const diagnostics = runtime.createDiagnostics({ now: () => now });
  diagnostics.record("d1", { frameTimingMs: 30 });
  assert.equal(diagnostics.history().decks.d1.length, 0);

  diagnostics.enable();
  diagnostics.record("d1", { frameTimingMs: 3 });
  now += 300;
  diagnostics.record("d2", { frameTimingMs: 4 });
  assert.equal(diagnostics.history().decks.d1.length, 1);
  assert.equal(diagnostics.history().decks.d2.length, 1);
  diagnostics.clearHistory();
  assert.equal(diagnostics.history().decks.d1.length, 0);
  assert.equal(diagnostics.history().decks.d2.length, 0);
});

test("M15 debug surface exposes snapshots, history, and manual iPhone checklist", () => {
  const debugRoot = globalThis as typeof globalThis & { BRMediaDebug?: unknown };
  const previous = debugRoot.BRMediaDebug;
  try {
    const diagnostics = runtime.createDiagnostics({ enabled: true });
    const debug = runtime.installDebugInterface(diagnostics);
    assert.equal(typeof debug.snapshot, "function");
    assert.equal(typeof debug.history, "function");
    assert.equal(typeof debug.clearHistory, "function");
    assert.equal(debug.iPhoneChecklist().length >= 8, true);
    assert.match(debug.iPhoneChecklist().join(" "), /Retina/i);
    assert.match(debug.iPhoneChecklist().join(" "), /portrait/i);
    assert.match(debug.iPhoneChecklist().join(" "), /touch/i);
  } finally {
    debugRoot.BRMediaDebug = previous;
  }
});

test("M15 frontend retains lifecycle, DPR, fixed-centre, and touch cleanup hooks", () => {
  const app = fs.readFileSync(path.resolve(
    __dirname, "..", "public", "dj-mixer", "app.js",
  ), "utf8");
  const renderer = fs.readFileSync(path.resolve(
    __dirname, "..", "public", "dj-mixer", "engine", "spectral-waveform.js",
  ), "utf8");
  const performancePage = fs.readFileSync(path.resolve(
    __dirname, "..", "public", "dj-mixer", "performance.html",
  ), "utf8");
  const browserFixture = fs.readFileSync(path.resolve(
    __dirname, "..", "public", "dj-mixer", "m15-waveform-validation.html",
  ), "utf8");

  assert.match(app, /document\.hidden/);
  assert.match(app, /"pagehide"/);
  assert.match(app, /"orientationchange"/);
  assert.match(app, /ResizeObserver/);
  assert.match(app, /pointercancel/);
  assert.match(app, /lostpointercapture/);
  assert.match(renderer, /window\.devicePixelRatio/);
  assert.match(renderer, /fixedCentre/);
  assert.match(renderer, /centreX/);
  assert.match(performancePage, /waveform-runtime-m13\.js/);
  assert.ok(
    performancePage.indexOf("waveform-runtime-m13.js") <
      performancePage.indexOf("spectral-waveform.js"),
  );
  assert.match(browserFixture, /brWaveformValidate/);
  assert.match(browserFixture, /createDiagnostics/);
});
