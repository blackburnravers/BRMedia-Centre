export const DJ_ANALYSIS_CONFIDENCE_VERSION = "unified-confidence-v1";

export type DjConfidenceEvidence = {
  id: string;
  value: number;
  weight?: number;
  reliability?: number;
  repetitions?: number;
  polarity?: "support" | "conflict";
};

export type DjConfidenceDiagnostic = {
  version: typeof DJ_ANALYSIS_CONFIDENCE_VERSION;
  score: number;
  support: number;
  conflict: number;
  agreement: number;
  coverage: number;
  contributions: Array<{ id: string; value: number; effectiveWeight: number; contribution: number }>;
};

export function normaliseDjConfidence(value: unknown): number {
  return Number(Math.max(0, Math.min(1, Number(value) || 0)).toFixed(6));
}

function median(values: readonly number[]): number {
  const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function smoothDjConfidence(previous: unknown, current: unknown, stability = 0.72): number {
  const retained = normaliseDjConfidence(stability);
  return normaliseDjConfidence(normaliseDjConfidence(previous) * retained + normaliseDjConfidence(current) * (1 - retained));
}

export function evaluateDjConfidence(evidence: readonly DjConfidenceEvidence[]): DjConfidenceDiagnostic {
  const usable = evidence.filter((item) => item && Number.isFinite(Number(item.value)) && Number(item.weight ?? 1) > 0);
  const centre = median(usable.filter((item) => item.polarity !== "conflict").map((item) => normaliseDjConfidence(item.value)));
  let supportTotal = 0;
  let conflictTotal = 0;
  let supportWeight = 0;
  let allWeight = 0;
  const contributions = usable.map((item) => {
    const value = normaliseDjConfidence(item.value);
    const repetitionGain = Math.min(2, Math.sqrt(Math.max(1, Number(item.repetitions) || 1)));
    const effectiveWeight = Math.max(0, Number(item.weight ?? 1)) * normaliseDjConfidence(item.reliability ?? 1) * repetitionGain;
    const deviation = Math.abs(value - centre);
    const outlierLimit = item.polarity === "conflict" ? value : centre + Math.sign(value - centre) * Math.min(deviation, 0.35);
    const contribution = normaliseDjConfidence(outlierLimit) * effectiveWeight;
    allWeight += effectiveWeight;
    if (item.polarity === "conflict") conflictTotal += contribution;
    else { supportTotal += contribution; supportWeight += effectiveWeight; }
    return { id: String(item.id), value, effectiveWeight: Number(effectiveWeight.toFixed(6)), contribution: Number(contribution.toFixed(6)) };
  });
  const support = normaliseDjConfidence(supportWeight ? supportTotal / supportWeight : 0);
  const conflict = normaliseDjConfidence(allWeight ? conflictTotal / allWeight : 0);
  const agreement = normaliseDjConfidence(1 - median(usable.filter((item) => item.polarity !== "conflict").map((item) => Math.abs(normaliseDjConfidence(item.value) - centre))) * 2);
  const coverage = normaliseDjConfidence(Math.min(1, usable.length / 4));
  const score = normaliseDjConfidence(support * 0.72 + agreement * 0.18 + coverage * 0.1 - conflict * 0.55);
  return { version: DJ_ANALYSIS_CONFIDENCE_VERSION, score, support, conflict, agreement, coverage, contributions };
}

export function combineDjConfidence(evidence: readonly DjConfidenceEvidence[]): number {
  return evaluateDjConfidence(evidence).score;
}
