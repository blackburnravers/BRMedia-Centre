import type { LibraryItem } from "./db/library";

export const DJ_M11_API_VERSION = "m11-v1";
export const KEY_CONFIDENCE_MINIMUM = 0.65;

type AnyItem = LibraryItem & Record<string, any>;

const finite = (value: unknown): number | null => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const confidence = (value: unknown): number | null => {
  const number = finite(value);
  return number === null ? null : Math.max(0, Math.min(1, number));
};

const CAMELOT: Record<string, string> = {
  "C major": "8B", "A minor": "8A", "G major": "9B", "E minor": "9A",
  "D major": "10B", "B minor": "10A", "A major": "11B", "F# minor": "11A",
  "E major": "12B", "C# minor": "12A", "B major": "1B", "G# minor": "1A",
  "F# major": "2B", "D# minor": "2A", "C# major": "3B", "A# minor": "3A",
  "G# major": "4B", "F minor": "4A", "D# major": "5B", "C minor": "5A",
  "A# major": "6B", "G minor": "6A", "F major": "7B", "D minor": "7A",
  "Db major": "3B", "Bb minor": "3A", "Ab major": "4B", "Eb major": "5B",
  "Bb major": "6B", "Gb major": "2B", "Eb minor": "2A", "Ab minor": "1A",
};

export function camelotForKey(key: unknown): string | null {
  const clean = String(key || "").trim()
    .replace(/\bmaj(or)?\b/i, "major").replace(/\bmin(or)?\b/i, "minor")
    .replace(/\s+/g, " ");
  if (!clean) return null;
  return CAMELOT[clean] || null;
}

function keyData(item: AnyItem) {
  const analysis = item.djKeyAnalysis || {};
  const key = String(analysis.key || item.key || "").trim() || null;
  const keyConfidence = confidence(analysis.confidence);
  return {
    key,
    camelot: key ? camelotForKey(key) : null,
    keyConfidence,
    keyStatus: !key ? "missing" : keyConfidence !== null && keyConfidence >= KEY_CONFIDENCE_MINIMUM ? "ready" : "uncertain",
  };
}

export function analysisSummary(item: AnyItem) {
  const storedBpm = finite(item.djGridBpm ?? item.bpm);
  const analysisConfidence = confidence(item.djAnalysisConfidence ?? item.djTempoConfidence);
  const status = String(item.djAnalysisStatus || (
    item.djGridReviewRequired ? "review-required" :
    storedBpm && item.djWaveformPrepared ? "prepared" :
    storedBpm ? "analysed" : "unanalysed"
  ));
  const reasons = Array.isArray(item.djAnalysisReasonCodes)
    ? item.djAnalysisReasonCodes.filter((reason: unknown) => typeof reason === "string").slice(0, 32)
    : [];
  return {
    apiVersion: DJ_M11_API_VERSION,
    id: item.id,
    storedBpm,
    preciseBpm: storedBpm,
    ...keyData(item),
    confidence: analysisConfidence,
    confidenceBand: analysisConfidence === null ? "unavailable" : analysisConfidence >= 0.8 ? "high" : analysisConfidence < 0.6 ? "low" : "medium",
    tempoMode: item.djGridResolvedMode === "dynamic" || (item.djGridSegments?.length || 0) > 1 ? "dynamic" : "constant",
    prepared: status === "prepared",
    reviewRequired: status === "review-required" || Boolean(item.djGridReviewRequired),
    failed: status === "failed",
    unanalysed: !storedBpm,
    analysisStatus: status,
    analysisVersion: item.djAnalysisVersion || item.djGridSource || null,
    analysedAt: item.djAnalysisAnalysedAt || (item.djGridUpdatedAt ? new Date(item.djGridUpdatedAt).toISOString() : null),
    waveformStatus: item.djWaveformPrepared && item.djWaveformAsset?.reusable !== false ? "prepared" : "missing",
    gridStatus: item.djGridLocked ? "locked" : item.djGridBaseSet && storedBpm ? "ready" : "missing",
    downbeatStatus: finite(item.djGridDownbeat) !== null && item.djGridBaseSet ? "ready" : "missing",
    reviewReasons: reasons,
    manual: item.djGridSource === "manual",
    locked: Boolean(item.djGridLocked),
  };
}

export function analysisDetails(item: AnyItem) {
  const summary = analysisSummary(item);
  const refinement = item.djRefinementDiagnostics || {};
  const confidenceComponents = refinement.confidenceComponents || refinement.components || {};
  return {
    ...summary,
    title: item.title,
    artist: item.artist || "",
    fileFormat: item.codec || item.mimeType || null,
    duration: finite(item.duration),
    confidenceComponents,
    downbeatConfidence: confidence(refinement.downbeatConfidence ?? confidenceComponents.downbeat),
    phaseConfidence: confidence(refinement.phaseConfidence ?? confidenceComponents.phase),
    driftResult: refinement.driftResult ?? refinement.drift ?? null,
    digitalTempoLock: refinement.digitalTempoLock ?? null,
    phraseEvidence: refinement.phraseEvidence ?? null,
    waveformCache: item.djWaveformAsset || null,
    previousRefinement: refinement.previousRefinementSummary ?? refinement.summary ?? null,
    grid: {
      version: item.djGridVersion || null,
      downbeat: finite(item.djGridDownbeat),
      segments: Array.isArray(item.djGridSegments) ? item.djGridSegments : [],
      source: item.djGridSource || null,
      editRange: item.djGridEditRange || null,
      locked: Boolean(item.djGridLocked),
    },
    history: Array.isArray(item.djAnalysisHistory) ? item.djAnalysisHistory.slice(-20) : [],
    advanced: {
      tempoCandidates: Array.isArray(item.djTempoCandidates) ? item.djTempoCandidates : [],
      refinementDiagnostics: refinement,
    },
  };
}

export type GridAlignment = "aligned" | "minor-offset" | "bpm-mismatch" | "phase-mismatch" | "unavailable";
export function classifyGridAlignment(input: {
  storedBpm?: unknown; liveBpm?: unknown; storedBeatTime?: unknown; liveBeatTime?: unknown; stale?: boolean;
}): GridAlignment {
  if (input.stale) return "unavailable";
  const storedBpm = finite(input.storedBpm), liveBpm = finite(input.liveBpm);
  if (!storedBpm || !liveBpm) return "unavailable";
  const bpmDelta = Math.abs(storedBpm - liveBpm);
  if (bpmDelta > Math.max(0.1, storedBpm * 0.0015)) return "bpm-mismatch";
  const storedBeat = finite(input.storedBeatTime), liveBeat = finite(input.liveBeatTime);
  if (storedBeat === null || liveBeat === null) return bpmDelta <= 0.02 ? "aligned" : "minor-offset";
  const beatSeconds = 60 / storedBpm;
  const phase = Math.abs(storedBeat - liveBeat) % beatSeconds;
  const wrapped = Math.min(phase, beatSeconds - phase);
  if (wrapped <= 0.02) return "aligned";
  if (wrapped <= 0.06) return "minor-offset";
  return "phase-mismatch";
}

export type HarmonicCompatibility = "same-key" | "adjacent" | "relative" | "uncertain" | "unavailable";
export function harmonicCompatibility(left: { key?: unknown; confidence?: unknown }, right: { key?: unknown; confidence?: unknown }): HarmonicCompatibility {
  const a = camelotForKey(left.key), b = camelotForKey(right.key);
  if (!a || !b) return "unavailable";
  const ac = confidence(left.confidence), bc = confidence(right.confidence);
  if (ac === null || bc === null || ac < KEY_CONFIDENCE_MINIMUM || bc < KEY_CONFIDENCE_MINIMUM) return "uncertain";
  if (a === b) return "same-key";
  const an = Number(a.slice(0, -1)), bn = Number(b.slice(0, -1));
  const am = a.endsWith("A"), bm = b.endsWith("A");
  if (an === bn && am !== bm) return "relative";
  if (am === bm && (Math.abs(an - bn) === 1 || Math.abs(an - bn) === 11)) return "adjacent";
  return "unavailable";
}

export function appendAnalysisHistory(item: AnyItem, entry: Record<string, unknown>) {
  const history = Array.isArray(item.djAnalysisHistory) ? item.djAnalysisHistory : [];
  item.djAnalysisHistory = [...history, {
    at: new Date().toISOString(),
    analysisVersion: item.djAnalysisVersion || null,
    ...entry,
  }].slice(-100);
  return item.djAnalysisHistory;
}
