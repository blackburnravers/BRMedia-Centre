import test from "node:test";
import assert from "node:assert/strict";
import { analyseMusicalKey, DJ_KEY_ANALYSIS_VERSION } from "./djKeyAnalysis";
import { scoreM10Confidence, DJ_M10_CONFIDENCE_VERSION } from "./djM10Confidence";

function chord(frequencies: number[], seconds = 24, sampleRate = 5512.5) {
  return Array.from({ length: Math.floor(seconds * sampleRate) }, (_, index) =>
    frequencies.reduce((sum, frequency) => sum + Math.sin(2 * Math.PI * frequency * index / sampleRate), 0) / frequencies.length
  );
}

test("M10 key analysis identifies a stable C-major triad", () => {
  const result = analyseMusicalKey(chord([261.626, 329.628, 391.995]), 5512.5);
  assert.equal(result.version, DJ_KEY_ANALYSIS_VERSION);
  assert.equal(result.key, "C");
  assert.equal(result.reviewRequired, false);
  assert.ok(result.confidence >= 0.58);
});

test("M10 key analysis refuses insufficient evidence", () => {
  const result = analyseMusicalKey(new Array(1024).fill(0), 5512.5);
  assert.equal(result.key, null);
  assert.equal(result.reviewRequired, true);
});

test("M10 confidence uses every weighted component", () => {
  const result = scoreM10Confidence({ transientConsistency: .8, beatSpacing: .9, phraseStrength: .7, harmonicRhythm: .6, sectionAgreement: .75, wholeTrackAgreement: .85 });
  assert.equal(result.version, DJ_M10_CONFIDENCE_VERSION);
  assert.ok(result.score > .75);
  assert.deepEqual(Object.keys(result.components).sort(), Object.keys(result.weights).sort());
});
