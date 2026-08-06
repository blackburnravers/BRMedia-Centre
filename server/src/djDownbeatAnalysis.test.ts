import assert from "node:assert/strict";
import test from "node:test";
import { analyseDjPreparedBpm } from "./djBpmAnalysis";
import { createDjImplementationFingerprint, DJ_IMPLEMENTATION_VERSIONS } from "./djPreparedAssets";
import { analyseDjPreparedDownbeat } from "./djDownbeatAnalysis";

function fixture(options: { bpm?: number; duration?: number; phase?: number; start?: number; pickup?: boolean; ambiguousBars?: boolean } = {}) {
  const bpm = options.bpm || 170; const duration = options.duration || 60; const phase = options.phase ?? 0.2; const fps = 100; const count = duration * fps; const period = 60 / bpm;
  const normalizedAmplitude = new Array<number>(count).fill(0.03); const energyWindows = new Array<number>(count).fill(0.02); const transients = new Array<number>(count).fill(0); const windowConfidence = new Array<number>(count).fill(1); const lowBand = new Array<number>(count).fill(0.03); const midBand = new Array<number>(count).fill(0.03); const highBand = new Array<number>(count).fill(0.03);
  let beat = 0; for (let time = phase; time < duration; time += period, beat += 1) {
    if (time < (options.start || 0)) continue; const index = Math.round(time * fps); if (index >= count) break; transients[index] = 1; normalizedAmplitude[index] = 0.85; energyWindows[index] = beat % 16 === 0 ? 1 : beat % 4 === 0 ? 0.82 : 0.58;
    if (options.ambiguousBars) { lowBand[index] = 0.6; midBand[index] = 0.6; highBand[index] = 0.6; } else if (beat % 2 === 0) { lowBand[index] = beat % 4 === 0 ? 1 : 0.72; } else { midBand[index] = 0.86; highBand[index] = 0.78; }
  }
  if (options.pickup) { const index = Math.round(0.05 * fps); transients[index] = 0.8; energyWindows[index] = 0.4; normalizedAmplitude[index] = 0.5; }
  const canonical = { duration, normalizedAmplitude, energyWindows, transients, windowConfidence, analysedAt: "2026-07-27T00:00:00.000Z" };
  const bpmAnalysis = analyseDjPreparedBpm(canonical);
  return { ...canonical, lowBand, midBand, highBand, bpmAnalysis };
}

test("B5 exact 4/4 pattern finds stable beat phase", () => { const result = analyseDjPreparedDownbeat(fixture()); assert.ok(result.selectedBeatPhase != null); assert.ok(Math.min(Math.abs(result.selectedBeatPhase - 0.2), Math.abs(result.selectedBeatPhase - (60 / 170))) < 0.03, JSON.stringify(result)); });

test("B5 phase survives quiet intro and pickup notes", () => { const result = analyseDjPreparedDownbeat(fixture({ start: 10, pickup: true })); assert.ok(result.firstStableBeatTime != null && result.firstStableBeatTime >= 9.5); assert.ok(result.firstAudibleEventTime != null && result.firstAudibleEventTime < result.firstStableBeatTime); assert.ok((result.pickupOffsetBeats || 0) > 1); });

test("B5 compares all four bar offsets and resolves clear downbeat", () => { const result = analyseDjPreparedDownbeat(fixture()); assert.equal(result.barCandidates.length, 4); assert.equal(new Set(result.barCandidates.map((candidate) => candidate.offset)).size, 4); assert.equal(result.selectedBarOffset, 0); });

test("B5 phrase starts and section agreement contribute confidence", () => { const result = analyseDjPreparedDownbeat(fixture({ duration: 120 })); assert.ok(result.phraseAgreement > 0.5); assert.ok(result.sectionAgreement >= 0.5); });

test("B5 ambiguous bar evidence requests review", () => { const result = analyseDjPreparedDownbeat(fixture({ ambiguousBars: true })); assert.ok(["bar-ambiguous", "low-confidence", "review-required", "non-4-4-or-uncertain"].includes(result.resultState), JSON.stringify(result)); });

test("B5 sustained non-onset material is insufficient", () => { const input = fixture(); input.transients.fill(0); const result = analyseDjPreparedDownbeat(input); assert.equal(result.resultState, "insufficient-evidence"); });

test("B5 grid anchor supports negative pre-roll and is deterministic", () => { const input = fixture({ phase: 0.25 }); const first = analyseDjPreparedDownbeat(input); const second = analyseDjPreparedDownbeat(input); assert.deepEqual(first, second); assert.ok(first.gridAnchorTime != null && first.gridAnchorTime <= 0); });

test("B5 protected manual grid remains authoritative and disagreement is report-only", () => { const input = fixture(); const before = JSON.stringify(input.bpmAnalysis); const result = analyseDjPreparedDownbeat({ ...input, protectedGrid: { manual: true, anchor: -0.7 } }); assert.equal(result.gridAnchorTime, -0.7); assert.equal(result.protectedGridAnchor, -0.7); assert.equal(JSON.stringify(input.bpmAnalysis), before); assert.equal("segments" in result, false); });

test("B5 never changes the selected B4 BPM", () => { const input = fixture({ bpm: 175 }); const bpm = input.bpmAnalysis.bpm; analyseDjPreparedDownbeat(input); assert.equal(input.bpmAnalysis.bpm, bpm); });

test("B5 compatibility is independent from waveform, BPM and grid assets", () => {
  const future = { ...DJ_IMPLEMENTATION_VERSIONS, downbeatBarAnalysis: "future-downbeat" };
  for (const type of ["prepared-waveform", "waveform-detail", "bpm-analysis", "beat-grid"] as const) {
    assert.equal(createDjImplementationFingerprint(type, future).value, createDjImplementationFingerprint(type).value);
  }
  assert.notEqual(createDjImplementationFingerprint("downbeat-analysis", future).value, createDjImplementationFingerprint("downbeat-analysis").value);
});

test("B5 low evidence never produces an auto-applicable confident anchor", () => { const input = fixture(); input.transients.fill(0); const result = analyseDjPreparedDownbeat(input); assert.equal(result.gridAnchorTime, null); assert.ok(!["high-confidence", "medium-confidence", "exact-digital"].includes(result.resultState)); });
