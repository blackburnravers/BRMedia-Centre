import assert from "node:assert/strict";
import test from "node:test";
import {
  createDjImplementationFingerprint,
  DJ_IMPLEMENTATION_VERSIONS,
} from "./djPreparedAssets";
import { extractCanonicalPreparedAnalysis } from "./waveforms";

test("B3 creates canonical per-window energy and normalized amplitude", () => {
  const result = extractCanonicalPreparedAnalysis([
    0, 0, 0, 0,
    0.25, -0.25, 0.25, -0.25,
    1, -1, 1, -1,
    0.5, -0.5, 0.5, -0.5,
  ], 4, 8);
  const analysis = result.analysis;
  assert.equal(analysis.formatVersion, "prepared-analysis-m10-v1");
  assert.equal(analysis.windowCount, 4);
  assert.equal(analysis.windowDurationSeconds, 2);
  assert.deepEqual(analysis.energy.windows, [0, 0.0625, 1, 0.25]);
  assert.deepEqual(analysis.normalizedAmplitude, [0, 0.25, 1, 0.5]);
  assert.equal(analysis.renderer.sampleRate, 22050);
  assert.equal(analysis.renderer.layout, "fixed-centre-scroll");
  assert.equal(analysis.renderer.preferredAmplitudeSource, "normalizedAmplitude");
});

test("B3 emits bounded aggregate and per-window confidence", () => {
  const { analysis } = extractCanonicalPreparedAnalysis([0, 0, 0, 0, 1, 1, 1, 1], 2);
  assert.equal(analysis.confidence.windows.length, 2);
  for (const value of [
    ...analysis.confidence.windows,
    analysis.confidence.coverage,
    analysis.confidence.energy,
    analysis.confidence.transients,
    analysis.confidence.overall,
  ]) {
    assert.ok(value >= 0 && value <= 1);
  }
  assert.equal(analysis.confidence.coverage, 1);
  assert.ok(analysis.confidence.overall > 0);
});

test("B3 implementation compatibility is independent from legacy and B2 assets", () => {
  const legacy = createDjImplementationFingerprint("prepared-waveform");
  const detail = createDjImplementationFingerprint("waveform-detail");
  const analysis = createDjImplementationFingerprint("prepared-analysis");
  const future = { ...DJ_IMPLEMENTATION_VERSIONS, preparedAnalysisExtraction: "energy-confidence-v2" };
  assert.equal(createDjImplementationFingerprint("prepared-waveform", future).value, legacy.value);
  assert.equal(createDjImplementationFingerprint("waveform-detail", future).value, detail.value);
  assert.notEqual(createDjImplementationFingerprint("prepared-analysis", future).value, analysis.value);
});
