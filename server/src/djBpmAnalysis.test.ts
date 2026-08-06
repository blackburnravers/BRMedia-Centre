import assert from "node:assert/strict";
import test from "node:test";
import { analyseDjPreparedBpm, DJ_BPM_MAX_CANDIDATES, DJ_BPM_MAX_ONSETS, selectDjOnsetCandidates } from "./djBpmAnalysis";
import { createDjImplementationFingerprint, DJ_IMPLEMENTATION_VERSIONS } from "./djPreparedAssets";

function pulseFixture(bpm: number, options: { duration?: number; quietIntro?: number; quietOutro?: number; offset?: number } = {}) {
  const duration = options.duration || 60;
  const fps = 100;
  const count = duration * fps;
  const normalizedAmplitude = new Array<number>(count).fill(0.04);
  const energyWindows = new Array<number>(count).fill(0.02);
  const transients = new Array<number>(count).fill(0);
  const windowConfidence = new Array<number>(count).fill(1);
  const interval = (60 / bpm) * fps;
  const start = (options.offset || 0.5) * fps;
  for (let position = start; position < count; position += interval) {
    const time = position / fps;
    if (time < (options.quietIntro || 0) || time > duration - (options.quietOutro || 0)) continue;
    const index = Math.round(position);
    if (index >= count) break;
    transients[index] = 1;
    energyWindows[index] = 1;
    normalizedAmplitude[index] = 1;
  }
  return { duration, normalizedAmplitude, energyWindows, transients, windowConfidence, analysedAt: "2026-07-27T00:00:00.000Z" };
}

for (const bpm of [170, 175, 180, 85, 128]) {
  test("B4 resolves exact " + bpm + " BPM without octave error", () => {
    const result = analyseDjPreparedBpm(pulseFixture(bpm));
    assert.ok(result.bpm != null);
    assert.ok(Math.abs(Number(result.bpm) - bpm) <= 0.5, JSON.stringify(result));
    assert.equal(result.octaveAmbiguous, false);
  });
}

test("B4 onset selection suppresses duplicate peaks from one hit", () => {
  const input = pulseFixture(170, { duration: 10 });
  for (let index = 0; index < input.transients.length - 2; index += 1) {
    if (input.transients[index] === 1) { input.transients[index + 1] = 0.8; input.transients[index + 2] = 0.6; }
  }
  const onsets = selectDjOnsetCandidates(input);
  assert.ok(onsets.length >= 20 && onsets.length <= 32, String(onsets.length));
  assert.ok(onsets.length <= DJ_BPM_MAX_ONSETS);
});

test("B4 sustained and clipped signals do not create false onset floods", () => {
  const count = 6000;
  const input = { duration: 60, normalizedAmplitude: new Array(count).fill(1), energyWindows: new Array(count).fill(1), transients: new Array(count).fill(0.02), windowConfidence: new Array(count).fill(1), analysedAt: "fixed" };
  assert.ok(selectDjOnsetCandidates(input).length < 6);
  assert.equal(analyseDjPreparedBpm(input).resultState, "insufficient-evidence");
});

test("B4 ignores quiet intro and outro while retaining middle tempo", () => {
  const result = analyseDjPreparedBpm(pulseFixture(175, { duration: 90, quietIntro: 16, quietOutro: 14 }));
  assert.ok(result.bpm != null && Math.abs(result.bpm - 175) <= 0.5, JSON.stringify(result));
  assert.ok(result.sectionAgreement >= 0.5);
});

test("B4 conflicting sections are reported without tempo segments", () => {
  const first = pulseFixture(128, { duration: 60 });
  const second = pulseFixture(170, { duration: 60, offset: 30 });
  for (let index = 3000; index < 6000; index += 1) {
    first.transients[index] = second.transients[index];
    first.energyWindows[index] = second.energyWindows[index];
    first.normalizedAmplitude[index] = second.normalizedAmplitude[index];
  }
  const result = analyseDjPreparedBpm(first);
  assert.ok(result.sectionAgreement < 1 || result.reasonCodes.includes("section-disagreement"), JSON.stringify(result));
  assert.equal("segments" in result, false);
});

test("B4 octave families are explicit and candidate lists remain bounded", () => {
  const result = analyseDjPreparedBpm(pulseFixture(170));
  assert.ok(result.candidates.some((candidate) => Math.abs(candidate.bpm - 170) <= 0.5));
  assert.ok(result.candidates.some((candidate) => Math.abs(candidate.bpm - 85) <= 0.5));
  assert.ok(result.candidates.length <= DJ_BPM_MAX_CANDIDATES);
});

test("B4 exact digital evidence preserves precision and is deterministic", () => {
  const input = pulseFixture(180);
  const first = analyseDjPreparedBpm(input);
  const second = analyseDjPreparedBpm(input);
  assert.deepEqual(first, second);
  assert.equal(first.bpm, 180);
  assert.ok(["exact-digital", "high-confidence", "medium-confidence"].includes(first.resultState));
});

test("B4 preserves justified decimal tempo precision", () => {
  const result = analyseDjPreparedBpm(pulseFixture(170.06));
  assert.ok(result.bpm != null && Math.abs(result.bpm - 170.06) <= 0.03, JSON.stringify(result));
  assert.notEqual(result.resultState, "exact-digital");
});

test("B4 is pure and its version does not invalidate waveform assets", () => {
  const input = pulseFixture(175);
  const before = JSON.stringify(input);
  analyseDjPreparedBpm(input);
  assert.equal(JSON.stringify(input), before);
  const future = { ...DJ_IMPLEMENTATION_VERSIONS, bpmAnalysis: "future-bpm" };
  assert.equal(
    createDjImplementationFingerprint("prepared-waveform", future).value,
    createDjImplementationFingerprint("prepared-waveform").value,
  );
  assert.equal(
    createDjImplementationFingerprint("waveform-detail", future).value,
    createDjImplementationFingerprint("waveform-detail").value,
  );
  assert.notEqual(
    createDjImplementationFingerprint("bpm-analysis", future).value,
    createDjImplementationFingerprint("bpm-analysis").value,
  );
});

test("B4 sparse evidence requests review safely", () => {
  const input = pulseFixture(170, { duration: 60 });
  input.transients.fill(0);
  input.energyWindows.fill(0.02);
  for (const index of [100, 1000, 3000]) input.transients[index] = 1;
  const result = analyseDjPreparedBpm(input);
  assert.equal(result.bpm, null);
  assert.equal(result.resultState, "insufficient-evidence");
});

test("B4 long-track sampling and onset storage remain bounded", () => {
  const result = analyseDjPreparedBpm(pulseFixture(175, { duration: 600 }));
  assert.ok(result.onsetCount <= DJ_BPM_MAX_ONSETS);
  assert.ok(result.candidates.length <= DJ_BPM_MAX_CANDIDATES);
});
