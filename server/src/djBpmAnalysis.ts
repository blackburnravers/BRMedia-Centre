import { normaliseDjConfidence } from "./djAnalysisConfidence";

export const DJ_BPM_ANALYSIS_FORMAT_VERSION = "bpm-confidence-v1";
export const DJ_BPM_MIN = 40;
export const DJ_BPM_MAX = 260;
export const DJ_BPM_MAX_ONSETS = 8192;
export const DJ_BPM_MAX_CANDIDATES = 12;
export const DJ_BPM_MAX_SECTIONS = 5;

export type DjBpmResultState =
  | "high-confidence"
  | "medium-confidence"
  | "low-confidence"
  | "octave-ambiguous"
  | "insufficient-evidence"
  | "inconsistent-sections"
  | "exact-digital"
  | "review-required";

export type DjOnsetCandidate = {
  index: number;
  time: number;
  strength: number;
  confidence: number;
};

export type DjBpmCandidateSummary = {
  bpm: number;
  rawScore: number;
  intervalScore: number;
  periodicityScore: number;
  phaseConsistency: number;
  sectionAgreement: number;
  metadataSupport: number;
};

export type DjBpmAnalysisResult = {
  formatVersion: typeof DJ_BPM_ANALYSIS_FORMAT_VERSION;
  bpm: number | null;
  confidence: number;
  rawScore: number;
  candidateMargin: number;
  octaveAmbiguous: boolean;
  sectionAgreement: number;
  phaseConsistency: number;
  phaseError: number;
  onsetQuality: number;
  onsetCoverage: number;
  exactDigitalConfidence: number;
  resultState: DjBpmResultState;
  reasonCodes: string[];
  candidates: DjBpmCandidateSummary[];
  onsetCount: number;
  analysedAt: string;
};

export type DjCanonicalBpmInput = {
  duration: number;
  normalizedAmplitude: readonly number[];
  energyWindows: readonly number[];
  transients: readonly number[];
  windowConfidence?: readonly number[];
  metadataBpm?: number | null;
  minimumBpm?: number;
  maximumBpm?: number;
  preferDigitalWhole?: boolean;
  analysedAt?: string;
};

const clampUnit = normaliseDjConfidence;
const rounded = (value: number, digits = 6) => Number((Number(value) || 0).toFixed(digits));

function quantile(values: readonly number[], target: number) {
  const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * target)))] || 0;
}

function normaliseLength(values: readonly number[], count: number) {
  if (!count) return [] as number[];
  if (values.length === count) return Array.from(values, (value) => clampUnit(value));
  if (!values.length) return new Array<number>(count).fill(0);
  return Array.from({ length: count }, (_, index) => {
    const position = (index / Math.max(1, count - 1)) * Math.max(0, values.length - 1);
    const left = Math.floor(position);
    const right = Math.min(values.length - 1, left + 1);
    const ratio = position - left;
    return clampUnit((Number(values[left]) || 0) * (1 - ratio) + (Number(values[right]) || 0) * ratio);
  });
}

export function selectDjOnsetCandidates(input: DjCanonicalBpmInput): DjOnsetCandidate[] {
  const duration = Math.max(0, Number(input.duration) || 0);
  const count = Math.min(131072, Math.max(0, input.transients.length, input.energyWindows.length, input.normalizedAmplitude.length));
  if (!duration || count < 32) return [];
  const transient = normaliseLength(input.transients, count);
  const energy = normaliseLength(input.energyWindows, count);
  const amplitude = normaliseLength(input.normalizedAmplitude, count);
  const confidence = normaliseLength(input.windowConfidence || [], count);
  const fps = count / duration;
  const minimumSpacing = Math.max(1, Math.floor((60 / DJ_BPM_MAX) * fps * 0.42));
  const activeEnergy = quantile(energy, 0.58);
  const transientFloor = Math.max(0.025, quantile(transient, 0.68) * 0.56);
  const raw: DjOnsetCandidate[] = [];

  for (let index = 2; index < count - 2; index += 1) {
    const currentTransient = transient[index];
    const localPeak = currentTransient >= transient[index - 1] && currentTransient >= transient[index + 1];
    if (!localPeak || currentTransient < transientFloor) continue;
    const previousEnergy = (energy[index - 1] + energy[index - 2]) * 0.5;
    const energyRise = Math.max(0, energy[index] - previousEnergy);
    const amplitudeRise = Math.max(0, amplitude[index] - amplitude[index - 1]);
    const sustainedPenalty = energy[index] > 0.96 && previousEnergy > 0.94 ? 0.28 : 1;
    const quietBoost = energy[index] < activeEnergy ? 1.14 : 1;
    const localConfidence = confidence.length ? confidence[index] : 1;
    const strength = clampUnit((currentTransient * 0.62 + energyRise * 0.25 + amplitudeRise * 0.13) * sustainedPenalty * quietBoost);
    if (strength < 0.035) continue;
    raw.push({
      index,
      time: rounded(index / fps, 6),
      strength,
      confidence: clampUnit((localConfidence * 0.62) + (strength * 0.38)),
    });
  }

  const selected: DjOnsetCandidate[] = [];
  for (const candidate of raw) {
    const previous = selected[selected.length - 1];
    if (previous && candidate.index - previous.index < minimumSpacing) {
      if (candidate.strength * candidate.confidence > previous.strength * previous.confidence) {
        selected[selected.length - 1] = candidate;
      }
      continue;
    }
    selected.push(candidate);
    if (selected.length >= DJ_BPM_MAX_ONSETS) break;
  }
  return selected;
}

function octaveFamily(value: number, minimum: number, maximum: number) {
  const family = new Set<number>();
  for (const multiplier of [0.25, 0.5, 1, 2, 4]) {
    const bpm = value * multiplier;
    if (bpm >= minimum && bpm <= maximum) family.add(rounded(bpm, 3));
  }
  return Array.from(family);
}

function candidateSeeds(onsets: readonly DjOnsetCandidate[], input: DjCanonicalBpmInput, minimum: number, maximum: number) {
  const histogram = new Map<number, number>();
  for (let left = 0; left < onsets.length; left += 1) {
    for (let right = left + 1; right < Math.min(onsets.length, left + 17); right += 1) {
      const interval = onsets[right].time - onsets[left].time;
      if (interval <= 0 || interval > 8) break;
      const rawBpm = 60 / interval;
      const weight = Math.sqrt(onsets[left].strength * onsets[right].strength * onsets[left].confidence * onsets[right].confidence) / Math.sqrt(right - left);
      for (const bpm of octaveFamily(rawBpm, minimum, maximum)) {
        const key = Math.round(bpm * 4) / 4;
        histogram.set(key, (histogram.get(key) || 0) + weight);
      }
    }
  }
  const seeds = Array.from(histogram.entries()).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([bpm]) => bpm);
  const metadata = Number(input.metadataBpm);
  if (Number.isFinite(metadata) && metadata >= minimum && metadata <= maximum) {
    for (const bpm of octaveFamily(metadata, minimum, maximum)) seeds.push(bpm);
  }
  return Array.from(new Set(seeds.flatMap((seed) => [-0.5, -0.25, 0, 0.25, 0.5].map((offset) => rounded(seed + offset, 3))).filter((bpm) => bpm >= minimum && bpm <= maximum)));
}

function scorePhase(onsets: readonly DjOnsetCandidate[], bpm: number) {
  const period = 60 / bpm;
  const bins = 48;
  const phases = new Array<number>(bins).fill(0);
  for (const onset of onsets) {
    const phase = ((onset.time % period) + period) % period;
    const bin = Math.min(bins - 1, Math.floor((phase / period) * bins));
    phases[bin] += onset.strength * onset.confidence;
  }
  let bestBin = 0;
  for (let index = 1; index < bins; index += 1) if (phases[index] > phases[bestBin]) bestBin = index;
  const phaseOrigin = ((bestBin + 0.5) / bins) * period;
  let weightedError = 0;
  let weight = 0;
  let aligned = 0;
  for (const onset of onsets) {
    const cycles = Math.round((onset.time - phaseOrigin) / period);
    const error = Math.abs(onset.time - (phaseOrigin + cycles * period)) / period;
    const folded = Math.min(error, 1 - error);
    const onsetWeight = onset.strength * onset.confidence;
    weightedError += folded * onsetWeight;
    weight += onsetWeight;
    aligned += Math.max(0, 1 - folded * 4) * onsetWeight;
  }
  const phaseError = weight ? weightedError / weight : 0.5;
  return { phaseConsistency: clampUnit(weight ? aligned / weight : 0), phaseError: clampUnit(phaseError) };
}

function scorePeriodicity(onsets: readonly DjOnsetCandidate[], bpm: number) {
  const period = 60 / bpm;
  let score = 0;
  let weight = 0;
  for (let index = 1; index < onsets.length; index += 1) {
    const interval = onsets[index].time - onsets[index - 1].time;
    if (interval <= 0) continue;
    const ratio = interval / period;
    const nearest = Math.max(1, Math.round(ratio));
    const error = Math.abs(ratio - nearest);
    const pairWeight = Math.sqrt(onsets[index].strength * onsets[index - 1].strength);
    score += Math.max(0, 1 - error * 4) * pairWeight / Math.sqrt(nearest);
    weight += pairWeight / Math.sqrt(nearest);
  }
  return clampUnit(weight ? score / weight : 0);
}

function boundedSections(input: DjCanonicalBpmInput, onsets: readonly DjOnsetCandidate[]) {
  const duration = input.duration;
  const candidates = [0.08, 0.30, 0.50, 0.70, 0.88].map((centre) => {
    const half = Math.min(24, Math.max(8, duration * 0.08));
    const start = Math.max(0, duration * centre - half);
    const end = Math.min(duration, duration * centre + half);
    const sectionOnsets = onsets.filter((onset) => onset.time >= start && onset.time <= end);
    const energy = sectionOnsets.reduce((sum, onset) => sum + onset.strength, 0);
    return { start, end, onsets: sectionOnsets, energy };
  });
  return candidates.filter((section) => section.onsets.length >= 4).sort((a, b) => b.energy - a.energy).slice(0, DJ_BPM_MAX_SECTIONS);
}

function scoreCandidate(onsets: readonly DjOnsetCandidate[], input: DjCanonicalBpmInput, bpm: number): DjBpmCandidateSummary & { phaseError: number } {
  const periodicity = scorePeriodicity(onsets, bpm);
  const phase = scorePhase(onsets, bpm);
  const period = 60 / bpm;
  let intervalHits = 0;
  let intervalWeight = 0;
  for (let index = 1; index < onsets.length; index += 1) {
    const interval = onsets[index].time - onsets[index - 1].time;
    const ratio = interval / period;
    const nearest = Math.max(1, Math.round(ratio));
    const error = Math.abs(ratio - nearest);
    const weight = Math.sqrt(onsets[index].confidence * onsets[index - 1].confidence) / Math.sqrt(nearest);
    intervalHits += Math.max(0, 1 - error * 5) * weight;
    intervalWeight += weight;
  }
  const intervalScore = clampUnit(intervalWeight ? intervalHits / intervalWeight : 0);
  const sections = boundedSections(input, onsets);
  const sectionScores = sections.map((section) => (scorePeriodicity(section.onsets, bpm) + scorePhase(section.onsets, bpm).phaseConsistency) * 0.5);
  const sectionAgreement = clampUnit(sectionScores.length ? sectionScores.filter((score) => score >= 0.62).length / sectionScores.length : 0);
  const metadata = Number(input.metadataBpm);
  const metadataSupport = Number.isFinite(metadata) ? clampUnit(1 - Math.min(1, Math.abs(metadata - bpm) / Math.max(1, bpm * 0.04))) : 0;
  const rawScore = clampUnit(intervalScore * 0.31 + periodicity * 0.25 + phase.phaseConsistency * 0.24 + sectionAgreement * 0.17 + metadataSupport * 0.03);
  return { bpm: rounded(bpm, 3), rawScore, intervalScore, periodicityScore: periodicity, phaseConsistency: phase.phaseConsistency, sectionAgreement, metadataSupport, phaseError: phase.phaseError };
}

export function analyseDjPreparedBpm(input: DjCanonicalBpmInput): DjBpmAnalysisResult {
  const analysedAt = input.analysedAt || new Date().toISOString();
  const minimum = Math.max(DJ_BPM_MIN, Math.min(DJ_BPM_MAX, Number(input.minimumBpm) || DJ_BPM_MIN));
  const maximum = Math.max(minimum, Math.min(DJ_BPM_MAX, Number(input.maximumBpm) || DJ_BPM_MAX));
  const onsets = selectDjOnsetCandidates(input);
  const coverage = clampUnit(input.duration > 0 ? Math.min(1, onsets.length / Math.max(8, input.duration * 0.35)) : 0);
  const onsetQuality = clampUnit(onsets.length ? onsets.reduce((sum, onset) => sum + onset.confidence, 0) / onsets.length : 0);
  const insufficient = onsets.length < 6 || coverage < 0.12;
  if (insufficient) {
    return { formatVersion: DJ_BPM_ANALYSIS_FORMAT_VERSION, bpm: null, confidence: 0, rawScore: 0, candidateMargin: 0, octaveAmbiguous: false, sectionAgreement: 0, phaseConsistency: 0, phaseError: 1, onsetQuality, onsetCoverage: coverage, exactDigitalConfidence: 0, resultState: "insufficient-evidence", reasonCodes: ["too-few-reliable-onsets"], candidates: [], onsetCount: onsets.length, analysedAt };
  }
  const coarseScored = candidateSeeds(onsets, input, minimum, maximum)
    .map((bpm) => scoreCandidate(onsets, input, bpm))
    .sort((a, b) => b.rawScore - a.rawScore || a.bpm - b.bpm);
  const refinedBpms = coarseScored.slice(0, 6).flatMap((candidate) =>
    Array.from({ length: 61 }, (_, index) => rounded(candidate.bpm - 0.3 + index * 0.01, 3))
  ).filter((bpm) => bpm >= minimum && bpm <= maximum);
  const scored = Array.from(new Set([
    ...refinedBpms,
    ...coarseScored.map((candidate) => candidate.bpm),
  ]))
    .map((bpm) => scoreCandidate(onsets, input, bpm))
    .sort((a, b) => b.rawScore - a.rawScore || a.bpm - b.bpm);
  const selected = scored[0];
  const runnerUp = scored.find((candidate) => Math.abs(candidate.bpm - selected.bpm) >= 0.2) || scored[1];
  const margin = clampUnit(selected.rawScore - (runnerUp?.rawScore || 0));
  const octavePeers = scored.filter((candidate) => {
    const ratio = candidate.bpm / selected.bpm;
    return Math.abs(ratio - 2) < 0.025 || Math.abs(ratio - 0.5) < 0.0125;
  });
  const octavePeer = octavePeers[0];
  const octaveMargin = octavePeer ? selected.rawScore - octavePeer.rawScore : 1;
  const adjacentIntervals = onsets.slice(1).map((onset, index) => onset.time - onsets[index].time).filter((interval) => interval > 0);
  const densityBpm = adjacentIntervals.length ? 60 / quantile(adjacentIntervals, 0.5) : 0;
  const octaveDensityMargin = octavePeer
    ? Math.abs(Math.abs(selected.bpm - densityBpm) - Math.abs(octavePeer.bpm - densityBpm))
    : Infinity;
  const octaveIntervalMargin = octavePeer ? selected.intervalScore - octavePeer.intervalScore : 1;
  const octaveAmbiguous = Boolean(
    octavePeer
    && octavePeer.rawScore >= selected.rawScore * 0.94
    && octaveMargin < 0.055
    && octaveIntervalMargin < 0.025
    && octaveDensityMargin < 2
  );
  const sectionAgreement = selected.sectionAgreement;
  const confidence = clampUnit(selected.rawScore * 0.58 + margin * 1.5 + onsetQuality * 0.12 + coverage * 0.12 + sectionAgreement * 0.18 - (octaveAmbiguous ? 0.18 : 0));
  const nearestWhole = Math.round(selected.bpm);
  const wholeDistance = Math.abs(selected.bpm - nearestWhole);
  const wholeCandidate = scored.find((candidate) => Math.abs(candidate.bpm - nearestWhole) < 0.0005);
  const wholeScoreRatio = wholeCandidate ? wholeCandidate.rawScore / Math.max(0.000001, selected.rawScore) : 0;
  const exactDigitalConfidence = clampUnit(
    (1 - Math.min(1, wholeDistance / 0.08))
    * Math.min(1, wholeScoreRatio)
    * (wholeCandidate?.phaseConsistency || selected.phaseConsistency)
    * sectionAgreement
    * confidence
  );
  const exactDigital = input.preferDigitalWhole !== false
    && wholeDistance <= 0.04
    && wholeScoreRatio >= 0.995
    && exactDigitalConfidence >= 0.70
    && (wholeCandidate?.phaseError || selected.phaseError) <= 0.08;
  const reasonCodes: string[] = [];
  if (octaveAmbiguous) reasonCodes.push("octave-family-low-margin");
  if (sectionAgreement < 0.5) reasonCodes.push("section-disagreement");
  if (selected.phaseConsistency < 0.55) reasonCodes.push("weak-phase-consistency");
  if (coverage < 0.35) reasonCodes.push("limited-onset-coverage");
  if (confidence < 0.58) reasonCodes.push("low-confidence-margin");
  let resultState: DjBpmResultState = confidence >= 0.78 ? "high-confidence" : confidence >= 0.58 ? "medium-confidence" : "low-confidence";
  if (exactDigital) resultState = "exact-digital";
  else if (octaveAmbiguous) resultState = "octave-ambiguous";
  else if (sectionAgreement < 0.4) resultState = "inconsistent-sections";
  else if (confidence < 0.38) resultState = "review-required";
  const bpm = exactDigital ? Math.round(selected.bpm) : confidence >= 0.58 ? rounded(selected.bpm, 3) : rounded(selected.bpm, 1);
  const diagnosticCandidates = Array.from(
    new Map(
      [...scored.slice(0, 8), ...octavePeers]
        .sort((left, right) => right.rawScore - left.rawScore || left.bpm - right.bpm)
        .map((candidate) => [candidate.bpm, candidate])
    ).values()
  ).slice(0, DJ_BPM_MAX_CANDIDATES);
  return {
    formatVersion: DJ_BPM_ANALYSIS_FORMAT_VERSION, bpm, confidence, rawScore: selected.rawScore, candidateMargin: margin, octaveAmbiguous, sectionAgreement, phaseConsistency: selected.phaseConsistency, phaseError: selected.phaseError, onsetQuality, onsetCoverage: coverage, exactDigitalConfidence, resultState, reasonCodes,
    candidates: diagnosticCandidates.map(({ phaseError: _phaseError, ...candidate }) => candidate),
    onsetCount: onsets.length, analysedAt,
  };
}
