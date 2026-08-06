import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const runtime = require(path.resolve(
  __dirname, "..", "public", "dj-mixer", "engine", "waveform-runtime-m13.js",
));

test("M14 request pipelines abort replacement without crossing decks", () => {
  const diagnostics = runtime.createDiagnostics({ enabled: true });
  const pipelines = runtime.createRequestPipelines({ diagnostics });
  const firstDeck1 = pipelines.begin("d1");
  const deck2 = pipelines.begin("d2");
  const nextDeck1 = pipelines.begin("d1");

  assert.equal(firstDeck1.signal.aborted, true);
  assert.equal(firstDeck1.isCurrent(), false);
  assert.equal(nextDeck1.isCurrent(), true);
  assert.equal(deck2.signal.aborted, false);
  assert.equal(deck2.isCurrent(), true);
  assert.equal(diagnostics.snapshot().decks.d1.abortCount, 1);
  assert.equal(diagnostics.snapshot().decks.d2.abortCount, 0);
});

test("M14 eject, navigation, and cleanup invalidate generations", () => {
  const diagnostics = runtime.createDiagnostics({ enabled: true });
  const pipelines = runtime.createRequestPipelines({ diagnostics });
  const deck1 = pipelines.begin("d1");
  const deck2 = pipelines.begin("d2");

  assert.equal(pipelines.abort("d1"), true);
  assert.equal(deck1.signal.aborted, true);
  assert.equal(deck1.isCurrent(), false);
  assert.equal(deck2.isCurrent(), true);

  pipelines.abortAll();
  assert.equal(deck2.signal.aborted, true);
  assert.equal(deck2.isCurrent(), false);
  assert.equal(diagnostics.snapshot().decks.d1.abortCount, 1);
  assert.equal(diagnostics.snapshot().decks.d2.abortCount, 1);
});

test("M14 rapid replacement rejects every stale request and retains latest", () => {
  const diagnostics = runtime.createDiagnostics({ enabled: true });
  const pipelines = runtime.createRequestPipelines({ diagnostics });
  const requests = Array.from({ length: 100 }, () => pipelines.begin("d1"));
  const latest = requests[requests.length - 1];

  requests.slice(0, -1).forEach((request) => {
    assert.equal(request.signal.aborted, true);
    assert.equal(request.isCurrent(), false);
  });
  assert.equal(latest?.isCurrent(), true);
  assert.equal(diagnostics.snapshot().decks.d1.abortCount, 99);
  assert.equal(pipelines.finish(latest), true);
  assert.equal(latest?.isCurrent(), false);
});

test("M14 abort detection is silent-specific and does not hide real errors", () => {
  const abort = new DOMException("cancelled", "AbortError");
  assert.equal(runtime.isAbortError(abort), true);
  assert.equal(runtime.isAbortError(Object.assign(new Error("stopped"), { code: "ABORT_ERR" })), true);
  assert.equal(runtime.isAbortError(new Error("HTTP 500")), false);
  assert.equal(runtime.isAbortError(new SyntaxError("bad waveform JSON")), false);
});

test("M14 diagnostics are off by default, privacy-safe, and opt-in", () => {
  const diagnostics = runtime.createDiagnostics();
  diagnostics.record("d1", { dpr: 2, lastFallbackReason: "HTTP 500", trackPath: "private" });
  assert.equal(diagnostics.snapshot().decks.d1.dpr, 1);
  assert.equal(JSON.stringify(diagnostics.snapshot()).includes("private"), false);

  diagnostics.enable(true);
  diagnostics.record("d1", {
    dpr: 2,
    cssSize: { width: 320, height: 80 },
    backingSize: { width: 640, height: 160 },
    selectedCacheLevel: 8192,
    visibleSampleRange: { start: 120, end: 900 },
    animationState: "playing",
    frameTimingMs: 3.2,
    snapCount: 2,
    lastFallbackReason: "invalid-data",
  });
  const snapshot = diagnostics.snapshot().decks.d1;
  assert.equal(snapshot.dpr, 2);
  assert.equal(snapshot.selectedCacheLevel, 8192);
  assert.deepEqual(snapshot.visibleSampleRange, { start: 120, end: 900 });
  assert.equal(snapshot.lastFallbackReason, "invalid-data");
});

test("M14 frontend wires signals, navigation cleanup, validation, and renderer destruction", () => {
  const app = fs.readFileSync(path.resolve(
    __dirname, "..", "public", "dj-mixer", "app.js",
  ), "utf8");
  const library = fs.readFileSync(path.resolve(
    __dirname, "..", "public", "dj-mixer", "components", "library.js",
  ), "utf8");
  const renderer = fs.readFileSync(path.resolve(
    __dirname, "..", "public", "dj-mixer", "engine", "spectral-waveform.js",
  ), "utf8");

  assert.match(app, /createRequestPipelines/);
  assert.match(app, /request\?\.signal/);
  assert.match(app, /brmedia:dj-deck-eject/);
  assert.match(app, /"pagehide"/);
  assert.match(app, /brWaveformValidate/);
  assert.match(app, /staleRejectionCount/);
  assert.match(library, /signal/);
  assert.match(renderer, /destroyAll/);
  assert.match(renderer, /visibleSampleRange/);
});
