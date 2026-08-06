import { DjBpmAnalysisResult, DjCanonicalBpmInput, selectDjOnsetCandidates } from "./djBpmAnalysis";
import { normaliseDjConfidence } from "./djAnalysisConfidence";

export const DJ_DOWNBEAT_ANALYSIS_FORMAT_VERSION = "downbeat-bars-v1";
export const DJ_DOWNBEAT_PHASE_CANDIDATES = 32;
export const DJ_DOWNBEAT_MAX_BAR_CANDIDATES = 4;
export const DJ_DOWNBEAT_MAX_SECTIONS = 5;

export type DjDownbeatResultState =
  | "high-confidence" | "medium-confidence" | "low-confidence" | "bar-ambiguous"
  | "phase-ambiguous" | "insufficient-evidence" | "inconsistent-sections"
  | "non-4-4-or-uncertain" | "exact-digital" | "review-required";

export type DjDownbeatAnalysisResult = {
  formatVersion: typeof DJ_DOWNBEAT_ANALYSIS_FORMAT_VERSION;
  selectedBeatPhase: number | null;
  beatPhaseConfidence: number;
  beatPhaseMargin: number;
  selectedBarOffset: number | null;
  downbeatConfidence: number;
  barOffsetMargin: number;
  phraseAgreement: number;
  sectionAgreement: number;
  firstAudibleEventTime: number | null;
  firstStableBeatTime: number | null;
  firstLikelyDownbeatTime: number | null;
  gridAnchorTime: number | null;
  pickupOffsetBeats: number | null;
  resultState: DjDownbeatResultState;
  reasonCodes: string[];
  phaseCandidates: Array<{ phase: number; score: number }>;
  barCandidates: Array<{ offset: number; score: number }>;
  protectedGridDisagreement: boolean;
  protectedGridAnchor: number | null;
  analysedAt: string;
};

export type DjDownbeatInput = DjCanonicalBpmInput & {
  bpmAnalysis: DjBpmAnalysisResult;
  lowBand?: readonly number[];
  midBand?: readonly number[];
  highBand?: readonly number[];
  protectedGrid?: { locked?: boolean; manual?: boolean; anchor?: number | null };
};

const clamp = normaliseDjConfidence;
const round = (value: number, digits = 6) => Number((Number(value) || 0).toFixed(digits));

function resample(values: readonly number[] | undefined, count: number) {
  if (!count) return [] as number[];
  if (!values?.length) return new Array<number>(count).fill(0);
  return Array.from({ length: count }, (_, index) => {
    const position = (index / Math.max(1, count - 1)) * (values.length - 1);
    const left = Math.floor(position);
    const right = Math.min(values.length - 1, left + 1);
    const ratio = position - left;
    return clamp((Number(values[left]) || 0) * (1 - ratio) + (Number(values[right]) || 0) * ratio);
  });
}

function sample(values: readonly number[], time: number, duration: number) {
  if (!values.length || !duration) return 0;
  const position = Math.max(0, Math.min(values.length - 1, (time / duration) * (values.length - 1)));
  const left = Math.floor(position);
  const right = Math.min(values.length - 1, left + 1);
  const ratio = position - left;
  return (values[left] || 0) * (1 - ratio) + (values[right] || 0) * ratio;
}

function phaseDistance(time: number, phase: number, period: number) {
  const cycles = Math.round((time - phase) / period);
  return Math.abs(time - (phase + cycles * period)) / period;
}

export function analyseDjPreparedDownbeat(input: DjDownbeatInput): DjDownbeatAnalysisResult {
  const analysedAt = input.analysedAt || new Date().toISOString();
  const bpm = Number(input.bpmAnalysis?.bpm);
  const duration = Math.max(0, Number(input.duration) || 0);
  const base: DjDownbeatAnalysisResult = { formatVersion: DJ_DOWNBEAT_ANALYSIS_FORMAT_VERSION, selectedBeatPhase: null, beatPhaseConfidence: 0, beatPhaseMargin: 0, selectedBarOffset: null, downbeatConfidence: 0, barOffsetMargin: 0, phraseAgreement: 0, sectionAgreement: 0, firstAudibleEventTime: null, firstStableBeatTime: null, firstLikelyDownbeatTime: null, gridAnchorTime: null, pickupOffsetBeats: null, resultState: "insufficient-evidence" as DjDownbeatResultState, reasonCodes: ["missing-reliable-bpm-or-onsets"], phaseCandidates: [], barCandidates: [], protectedGridDisagreement: false, protectedGridAnchor: null, analysedAt };
  if (!duration || !Number.isFinite(bpm) || bpm < 40 || bpm > 260) return base;
  const onsets = selectDjOnsetCandidates(input);
  if (onsets.length < 8) return base;
  const period = 60 / bpm;
  const phaseCandidates = Array.from({ length: DJ_DOWNBEAT_PHASE_CANDIDATES }, (_, index) => {
    const phase = (index / DJ_DOWNBEAT_PHASE_CANDIDATES) * period;
    let aligned = 0;
    let weight = 0;
    for (const onset of onsets) {
      const onsetWeight = onset.strength * onset.confidence;
      aligned += Math.max(0, 1 - phaseDistance(onset.time, phase, period) * 5) * onsetWeight;
      weight += onsetWeight;
    }
    return { phase, score: clamp(weight ? aligned / weight : 0) };
  }).sort((left, right) => right.score - left.score || left.phase - right.phase);
  const bestPhase = phaseCandidates[0];
  const phaseRunner = phaseCandidates.find((candidate) => Math.abs(candidate.phase - bestPhase.phase) >= period / 8) || phaseCandidates[1];
  const phaseMargin = clamp(bestPhase.score - (phaseRunner?.score || 0));
  const phaseConfidence = clamp(bestPhase.score * 0.76 + phaseMargin * 1.6 + input.bpmAnalysis.phaseConsistency * 0.12);
  const phase = bestPhase.phase;
  const count = Math.max(input.energyWindows.length, input.normalizedAmplitude.length, input.transients.length);
  const energy = resample(input.energyWindows, count);
  const low = resample(input.lowBand, count);
  const mid = resample(input.midBand, count);
  const high = resample(input.highBand, count);
  const firstAudible = onsets[0]?.time ?? null;
  const alignedOnsets = onsets.filter((onset) => phaseDistance(onset.time, phase, period) <= 0.18);
  const firstStable = alignedOnsets.find((onset, index) => {
    const following = alignedOnsets.slice(index, index + 8);
    return following.length >= 6 && following[following.length - 1].time - onset.time <= period * 10;
  })?.time ?? alignedOnsets[0]?.time ?? null;
  const beatStart = Math.floor((Math.max(0, firstStable || 0) - phase) / period);
  const lastBeat = Math.min(4096, Math.ceil((duration - phase) / period));
  const beatEvidence: Array<{ beat: number; time: number; low: number; high: number; energy: number; transient: number }> = [];
  for (let beat = Math.max(-8, beatStart - 8); beat <= lastBeat; beat += 1) {
    const time = phase + beat * period;
    if (time < 0 || time > duration) continue;
    const nearby = alignedOnsets.filter((onset) => Math.abs(onset.time - time) <= period * 0.18);
    beatEvidence.push({ beat, time, low: sample(low, time, duration), high: Math.max(sample(mid, time, duration), sample(high, time, duration)), energy: sample(energy, time, duration), transient: nearby.reduce((best, onset) => Math.max(best, onset.strength), 0) });
  }
  const sections = [0.12, 0.35, 0.58, 0.78, 0.9].map((centre) => beatEvidence.filter((entry) => Math.abs(entry.time / duration - centre) <= 0.09)).filter((section) => section.length >= 8).slice(0, DJ_DOWNBEAT_MAX_SECTIONS);
  const scoreOffset = (offset: number, evidence = beatEvidence) => {
    let total = 0; let weight = 0;
    for (const entry of evidence) {
      const position = ((entry.beat - offset) % 4 + 4) % 4;
      const previousEnergy = sample(energy, Math.max(0, entry.time - period), duration);
      const entryRise = Math.max(0, entry.energy - previousEnergy);
      const phraseBeat = ((entry.beat - offset) % 16 + 16) % 16 === 0;
      const expected = position === 0
        ? entry.low * 0.42 + entry.transient * 0.22 + entryRise * 0.22 + (phraseBeat ? entryRise * 0.42 : 0)
        : position === 2
          ? entry.low * 0.28 + entry.transient * 0.18
          : entry.high * 0.26 + entry.transient * 0.16;
      total += expected; weight += 1;
    }
    return clamp(weight ? total / weight : 0);
  };
  const barCandidates = Array.from({ length: DJ_DOWNBEAT_MAX_BAR_CANDIDATES }, (_, offset) => ({ offset, score: scoreOffset(offset) })).sort((left, right) => right.score - left.score || left.offset - right.offset);
  const bestBar = barCandidates[0];
  const barMargin = clamp(bestBar.score - (barCandidates[1]?.score || 0));
  const sectionWinners = sections.map((section) => Array.from({ length: 4 }, (_, offset) => ({ offset, score: scoreOffset(offset, section) })).sort((a, b) => b.score - a.score || a.offset - b.offset)[0]);
  const sectionAgreement = clamp(sectionWinners.length ? sectionWinners.filter((winner) => winner.offset === bestBar.offset).length / sectionWinners.length : 0);
  const phraseEntries = beatEvidence.filter((entry) => ((entry.beat - bestBar.offset) % 16 + 16) % 16 === 0);
  const phraseAgreement = clamp(phraseEntries.length ? phraseEntries.filter((entry) => entry.energy >= 0.35 || entry.transient >= 0.35).length / phraseEntries.length : 0);
  const downbeatConfidence = clamp(bestBar.score * 0.44 + barMargin * 2 + sectionAgreement * 0.24 + phraseAgreement * 0.12 + phaseConfidence * 0.2);
  const stableBeatNumber = firstStable == null ? null : Math.round((firstStable - phase) / period);
  const beatsToDownbeat = stableBeatNumber == null ? null : ((bestBar.offset - stableBeatNumber) % 4 + 4) % 4;
  const firstDownbeat = firstStable == null || beatsToDownbeat == null ? null : firstStable + beatsToDownbeat * period;
  const barPeriod = period * 4;
  const gridAnchor = firstDownbeat == null ? null : firstDownbeat - Math.ceil(firstDownbeat / barPeriod) * barPeriod;
  const pickupOffset = firstAudible == null || firstStable == null ? null : round((firstStable - firstAudible) / period, 3);
  const reasons: string[] = [];
  if (phaseMargin < 0.08) reasons.push("weak-beat-phase-margin");
  if (barMargin < 0.035) reasons.push("weak-bar-offset-margin");
  if (sectionAgreement < 0.5) reasons.push("bar-position-section-conflict");
  if (phraseAgreement < 0.35) reasons.push("weak-phrase-evidence");
  if (pickupOffset != null && pickupOffset > 0.5) reasons.push("pickup-or-intro-offset");
  let state: DjDownbeatResultState = downbeatConfidence >= 0.78 && phaseConfidence >= 0.72 ? "high-confidence" : downbeatConfidence >= 0.58 && phaseConfidence >= 0.55 ? "medium-confidence" : "low-confidence";
  if (phaseMargin < 0.04) state = "phase-ambiguous";
  else if (barMargin < 0.02) state = "bar-ambiguous";
  else if (sectionAgreement < 0.35) state = "inconsistent-sections";
  else if (downbeatConfidence < 0.34) state = "non-4-4-or-uncertain";
  else if (downbeatConfidence < 0.48) state = "review-required";
  else if (input.bpmAnalysis.resultState === "exact-digital" && state === "high-confidence") state = "exact-digital";
  const protectedGrid = Boolean(input.protectedGrid?.locked || input.protectedGrid?.manual);
  const protectedAnchor = protectedGrid && Number.isFinite(Number(input.protectedGrid?.anchor)) ? Number(input.protectedGrid?.anchor) : null;
  const disagreement = protectedAnchor != null && gridAnchor != null && Math.abs(phaseDistance(gridAnchor, protectedAnchor, period)) > 0.12;
  if (disagreement) reasons.push("protected-grid-disagreement");
  return { formatVersion: DJ_DOWNBEAT_ANALYSIS_FORMAT_VERSION, selectedBeatPhase: round(phase), beatPhaseConfidence: phaseConfidence, beatPhaseMargin: phaseMargin, selectedBarOffset: bestBar.offset, downbeatConfidence, barOffsetMargin: barMargin, phraseAgreement, sectionAgreement, firstAudibleEventTime: firstAudible == null ? null : round(firstAudible), firstStableBeatTime: firstStable == null ? null : round(firstStable), firstLikelyDownbeatTime: firstDownbeat == null ? null : round(firstDownbeat), gridAnchorTime: protectedAnchor ?? (gridAnchor == null ? null : round(gridAnchor)), pickupOffsetBeats: pickupOffset, resultState: disagreement ? "review-required" : state, reasonCodes: reasons, phaseCandidates: phaseCandidates.slice(0, 8).map((candidate) => ({ phase: round(candidate.phase), score: candidate.score })), barCandidates, protectedGridDisagreement: disagreement, protectedGridAnchor: protectedAnchor, analysedAt };
}
