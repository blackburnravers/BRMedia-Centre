import assert from "node:assert/strict";
import test from "node:test";
import {
  createDjImplementationFingerprint,
  DJ_IMPLEMENTATION_VERSIONS,
} from "./djPreparedAssets";
import { extractPreparedWaveformDetail } from "./waveforms";

test("B2 produces dense peak, RMS and transient arrays", () => {
  const samples = [
    0, 0, 0, 0,
    0.2, 0.2, 0.2, 0.2,
    1, 1, 1, 1,
    0.2, 0.2, 0.2, 0.2,
  ];
  const detail = extractPreparedWaveformDetail(samples, 4);
  assert.equal(detail.formatVersion, "rms-transient-v1");
  assert.equal(detail.density, 4);
  assert.equal(detail.peaks.length, 4);
  assert.equal(detail.rms.length, 4);
  assert.equal(detail.transients.length, 4);
  assert.deepEqual(detail.peaks, [0, 0.2, 1, 0.2]);
  assert.deepEqual(detail.rms, [0, 0.2, 1, 0.2]);
  assert.ok(detail.transients[2] > detail.transients[1]);
  assert.ok(detail.transients.every((value) => value >= 0 && value <= 1));
});

test("B2 RMS represents energy and silence remains stable", () => {
  const detail = extractPreparedWaveformDetail([1, -1, 0, 0], 2);
  assert.equal(detail.rms[0], 1);
  assert.equal(detail.rms[1], 0);
  assert.deepEqual(extractPreparedWaveformDetail([0, 0, 0, 0], 4).transients, [0, 0, 0, 0]);
});

test("B2 detail compatibility is independent from multiband-v1", () => {
  const currentPrepared = createDjImplementationFingerprint("prepared-waveform");
  const currentDetail = createDjImplementationFingerprint("waveform-detail");
  const future = { ...DJ_IMPLEMENTATION_VERSIONS, waveformDetailExtraction: "rms-peak-v2" };
  assert.equal(
    createDjImplementationFingerprint("prepared-waveform", future).value,
    currentPrepared.value,
  );
  assert.notEqual(
    createDjImplementationFingerprint("waveform-detail", future).value,
    currentDetail.value,
  );
});
