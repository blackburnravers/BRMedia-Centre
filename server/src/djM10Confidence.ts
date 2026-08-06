export const DJ_M10_CONFIDENCE_VERSION = "weighted-confidence-m10-v1";

export type DjM10ConfidenceInput = {
  transientConsistency: number;
  beatSpacing: number;
  phraseStrength: number;
  harmonicRhythm: number;
  sectionAgreement: number;
  wholeTrackAgreement: number;
};

export function scoreM10Confidence(components: DjM10ConfidenceInput) {
  const weights = { transientConsistency: 0.14, beatSpacing: 0.22, phraseStrength: 0.14, harmonicRhythm: 0.10, sectionAgreement: 0.18, wholeTrackAgreement: 0.22 };
  const bounded = Object.fromEntries(Object.entries(components).map(([key, value]) => [key, Math.max(0, Math.min(1, Number(value) || 0))])) as unknown as DjM10ConfidenceInput;
  const score = Object.entries(weights).reduce((sum, [key, weight]) => sum + bounded[key as keyof DjM10ConfidenceInput] * weight, 0);
  return { version: DJ_M10_CONFIDENCE_VERSION, score: Math.max(0, Math.min(1, score)), components: bounded, weights };
}
