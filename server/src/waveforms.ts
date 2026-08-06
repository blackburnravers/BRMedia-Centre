import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import * as mm from "music-metadata";
import { appendStatsEvent } from "./statsEvents";
import { analyseDjPreparedBpm, DjBpmAnalysisResult, DJ_BPM_ANALYSIS_FORMAT_VERSION } from "./djBpmAnalysis";
import { analyseDjPreparedDownbeat, DjDownbeatAnalysisResult, DJ_DOWNBEAT_ANALYSIS_FORMAT_VERSION } from "./djDownbeatAnalysis";
import { analyseDjDynamicTempo, DjDynamicAnalysisResult, DJ_DYNAMIC_ANALYSIS_FORMAT_VERSION } from "./djDynamicAnalysis";
import { refineDjBeatCandidates, DjBeatDetectionResult, DJ_BEAT_DETECTION_FORMAT_VERSION } from "./djBeatDetection";
import { validateDjWholeTrackGrid, DjGridValidationResult, DJ_GRID_VALIDATION_FORMAT_VERSION } from "./djGridValidation";
import { reconcileDjFinalGrid, DjFinalGridDecisionResult, DJ_FINAL_GRID_DECISION_FORMAT_VERSION } from "./djFinalGridDecision";
import { analyseMusicalKey, DjKeyAnalysisResult } from "./djKeyAnalysis";
import { selectM10AnalysisPass } from "./djM10Refinement";
import { createDjAnalysisCompatibilityMetadata, inspectDjAnalysisCompatibility, DjAnalysisCompatibilityMetadata } from "./djAnalysisCompatibility";
import {
  createDjPreparedAssetMetadata,
  createDjSourceFingerprint,
  DjCompatibilityResult,
  DjPreparedAssetMetadata,
  validateDjPreparedAsset,
  writeDjPreparedAssetJsonAtomically,
} from "./djPreparedAssets";
import { buildM12WaveformPyramid, DJ_M12_CACHE_SUFFIX, DJ_M12_WAVEFORM_VERSION, M12WaveformPyramid, validateM12WaveformPyramid } from "./djM12Waveform";

type WaveformTrackRef = {
  id: string;
  locator: string;
  title?: string;
};

type WaveformGenerateStatus = "generated" | "skipped" | "failed";

type WaveformGenerateResult = {
  id: string;
  locator: string;
  title?: string;
  status: WaveformGenerateStatus;
  detail?: string;
};

type WaveformJobItemStatus = "queued" | "processing" | "generated" | "skipped" | "failed";

type WaveformJobItem = {
  id: string;
  locator: string;
  title?: string;
  status: WaveformJobItemStatus;
  progressPercent: number;
  detail?: string;
};

type WaveformJob = {
  id: string;
  scope: "single" | "all" | "failed";
  status: "queued" | "running" | "done" | "done_with_errors";
  count: number;
  force: boolean;
  total: number;
  processed: number;
  generated: number;
  skipped: number;
  failed: number;
  startedAt: string;
  finishedAt: string | null;
  items: WaveformJobItem[];
};

export const DEFAULT_WAVEFORM_PEAKS = 420;
const WAVEFORM_CACHE_DIR = path.join(__dirname, "..", ".cache", "waveforms");
const WAVEFORM_SAMPLE_RATE = 22050;
const LEGACY_WAVEFORM_CACHE_VERSION = "multiband-m10-v1";
const WAVEFORM_CACHE_VERSION = DJ_M12_WAVEFORM_VERSION;
const WAVEFORM_GENERATOR = "brmedia-server-waveforms";
const WAVEFORM_DETAIL_FORMAT_VERSION = "rms-transient-v1";
const PREPARED_ANALYSIS_FORMAT_VERSION = "prepared-analysis-m10-v1";
const WAVEFORM_DETAIL_DENSITY = 4;
const MAX_WAVEFORM_DETAIL_POINTS = 131072;

export type WaveformBands = {
  low: number[];
  mid: number[];
  high: number[];
};

export type PreparedWaveformDetail = {
  formatVersion: typeof WAVEFORM_DETAIL_FORMAT_VERSION;
  density: number;
  peaks: number[];
  rms: number[];
  transients: number[];
};

export type CanonicalPreparedAnalysis = {
  formatVersion: typeof PREPARED_ANALYSIS_FORMAT_VERSION;
  windowCount: number;
  windowDurationSeconds: number | null;
  energy: {
    windows: number[];
    mean: number;
    minimum: number;
    maximum: number;
    variance: number;
  };
  normalizedAmplitude: number[];
  confidence: {
    windows: number[];
    coverage: number;
    energy: number;
    transients: number;
    overall: number;
  };
  bpmAnalysis?: DjBpmAnalysisResult;
  beatDetection?: DjBeatDetectionResult;
  downbeatAnalysis?: DjDownbeatAnalysisResult;
  dynamicAnalysis?: DjDynamicAnalysisResult;
  gridValidation?: DjGridValidationResult;
  finalGridDecision?: DjFinalGridDecisionResult;
  keyAnalysis?: DjKeyAnalysisResult;
  m10Refinement?: ReturnType<typeof selectM10AnalysisPass>;
  compatibility?: DjAnalysisCompatibilityMetadata;
  renderer: {
    sampleRate: number;
    amplitudeScale: "linear-normalized";
    layout: "fixed-centre-scroll";
    pointsPerLegacyPeak: number;
    preferredAmplitudeSource: "normalizedAmplitude";
  };
};

type WaveformCacheRecord = {
  cacheKey?: string;
  duration?: number;
  peaks?: number[];
  bands?: WaveformBands;
  detail?: PreparedWaveformDetail;
  analysis?: CanonicalPreparedAnalysis;
  preparedAsset?: DjPreparedAssetMetadata;
  detailAsset?: DjPreparedAssetMetadata;
  analysisAsset?: DjPreparedAssetMetadata;
  bpmAsset?: DjPreparedAssetMetadata;
  beatAsset?: DjPreparedAssetMetadata;
  downbeatAsset?: DjPreparedAssetMetadata;
  dynamicAsset?: DjPreparedAssetMetadata;
  validationAsset?: DjPreparedAssetMetadata;
  decisionAsset?: DjPreparedAssetMetadata;
  multiscale?: M12WaveformPyramid;
};

export type WaveformPreparedAssetRegistration = {
  status: DjCompatibilityResult["status"];
  reusable: boolean;
  assetFormatVersion: string | null;
  sourceFingerprint: string | null;
  implementationFingerprint: string | null;
  updatedAt: string | null;
};

function ensureDirSync(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function safeWaveformCacheName(filePath: string) {
  const base = path.parse(filePath).name.replace(/[^a-z0-9_-]+/gi, "_");
  const shortHash = Buffer.from(filePath)
    .toString("base64")
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 16);

  return `${base}-${shortHash}${DJ_M12_CACHE_SUFFIX}`;
}

function getWaveformCachePath(filePath: string) {
  ensureDirSync(WAVEFORM_CACHE_DIR);
  return path.join(WAVEFORM_CACHE_DIR, safeWaveformCacheName(filePath));
}

function getLegacyWaveformCachePath(filePath: string) {
  const current = getWaveformCachePath(filePath);
  return current.slice(0, -DJ_M12_CACHE_SUFFIX.length) + ".json";
}

let waveformSourceIndex: Map<string, string> | null = null;
function waveformSourceIdentity(filePath: string) {
  return path.resolve(filePath).replace(/\\/g, "/").replace(/\/+/g, "/").toLocaleLowerCase();
}
function getWaveformSourceIndex() {
  if (waveformSourceIndex) return waveformSourceIndex;
  const index = new Map<string, string>();
  ensureDirSync(WAVEFORM_CACHE_DIR);
  for (const name of fs.readdirSync(WAVEFORM_CACHE_DIR)) {
    if (!name.endsWith(".json")) continue;
    const cachePath = path.join(WAVEFORM_CACHE_DIR, name);
    try {
      const text = fs.readFileSync(cachePath, "utf8");
      const match = text.match(/"pathIdentity"\s*:\s*("(?:\\.|[^"\\])*")/);
      if (!match) continue;
      const identity = waveformSourceIdentity(JSON.parse(match[1]));
      const previous = index.get(identity);
      if (!previous || name.endsWith(DJ_M12_CACHE_SUFFIX)) index.set(identity, cachePath);
    } catch {}
  }
  waveformSourceIndex = index;
  return index;
}

function locateExistingWaveformCache(filePath: string) {
  const current = getWaveformCachePath(filePath);
  if (fs.existsSync(current)) return current;
  const legacy = getLegacyWaveformCachePath(filePath);
  if (fs.existsSync(legacy)) return legacy;
  return getWaveformSourceIndex().get(waveformSourceIdentity(filePath)) || null;
}

export function deleteWaveformCacheForFile(filePath: string) {
  const cachePath = getWaveformCachePath(filePath);
  if (!fs.existsSync(cachePath)) return false;
  fs.unlinkSync(cachePath);
  return true;
}

function buildWaveformCacheKey(filePath: string, peakCount: number, version = WAVEFORM_CACHE_VERSION) {
  const stat = fs.statSync(filePath);
  return `${version}:${stat.size}:${stat.mtimeMs}:${peakCount}`;
}

function hasWaveformPayload(cached: WaveformCacheRecord, peakCount: number) {
  const arrays = [
    cached.peaks,
    cached.bands?.low,
    cached.bands?.mid,
    cached.bands?.high,
  ];
  return Number.isFinite(Number(cached.duration))
    && Number(cached.duration) > 0
    && arrays.every((values) =>
      Array.isArray(values)
      && values.length === peakCount
      && values.every((value) => Number.isFinite(Number(value)))
    );
}

function validateWaveformCacheRecord(
  filePath: string,
  peakCount: number,
  cached: WaveformCacheRecord
) {
  const cacheKeyMatches = cached.cacheKey === buildWaveformCacheKey(filePath, peakCount);
  if (!cacheKeyMatches) {
    return {
      status: "incomplete",
      compatible: false,
      reusable: false,
      protected: false,
      reasons: ["waveform-cache-key-or-peak-count-mismatch"],
      recommendedAction: "refresh",
    } satisfies DjCompatibilityResult;
  }
  const source = createDjSourceFingerprint(filePath, {
    duration: cached.preparedAsset?.duration ?? cached.duration,
    sampleRate: cached.preparedAsset?.sampleRate,
    channelCount: cached.preparedAsset?.channelCount,
    codec: cached.preparedAsset?.sourceFingerprint?.codec,
  });
  return validateDjPreparedAsset(cached.preparedAsset, {
    assetType: "prepared-waveform",
    assetFormatVersion: WAVEFORM_CACHE_VERSION,
    sourceFingerprint: source.status === "ok" ? source.fingerprint : null,
    legacySafe: hasWaveformPayload(cached, peakCount),
    corrupt: !hasWaveformPayload(cached, peakCount) || !validateM12WaveformPyramid(cached.multiscale).valid,
  });
}

function validateLegacyWaveformCacheRecord(filePath: string, peakCount: number, cached: WaveformCacheRecord) {
  const keyMatches = cached.cacheKey === buildWaveformCacheKey(filePath, peakCount, LEGACY_WAVEFORM_CACHE_VERSION);
  return validateDjPreparedAsset(cached.preparedAsset, {
    assetType: "prepared-waveform", assetFormatVersion: LEGACY_WAVEFORM_CACHE_VERSION,
    legacySafe: keyMatches && hasWaveformPayload(cached, peakCount),
    corrupt: !keyMatches || !hasWaveformPayload(cached, peakCount),
  });
}

function publicWaveformRegistration(
  preparedAsset: DjPreparedAssetMetadata | undefined,
  compatibility: DjCompatibilityResult
): WaveformPreparedAssetRegistration {
  return {
    status: compatibility.status,
    reusable: compatibility.reusable,
    assetFormatVersion: preparedAsset?.assetFormatVersion || null,
    sourceFingerprint: preparedAsset?.sourceFingerprint?.value || null,
    implementationFingerprint: preparedAsset?.implementationFingerprint?.value || null,
    updatedAt: preparedAsset?.updatedAt || null,
  };
}

function getPeakMaximum(peaks: number[]) {
  return peaks.reduce((best, value) => Math.max(best, value), 0);
}

function normalisePeaksAgainstMaximum(peaks: number[], maximum: number) {
  if (maximum <= 0) return peaks.map(() => 0);
  return peaks.map((value) => Number((value / maximum).toFixed(6)));
}

function normalisePeaks(peaks: number[]) {
  return normalisePeaksAgainstMaximum(peaks, getPeakMaximum(peaks));
}

type WaveformDetailAccumulator = {
  detailCount: number;
  samplesPerPoint: number;
  sampleIndex: number;
  peaks: number[];
  squareSums: number[];
  sampleCounts: number[];
};

function createWaveformDetailAccumulator(estimatedSamples: number, detailCount: number): WaveformDetailAccumulator {
  return {
    detailCount,
    samplesPerPoint: Math.max(1, Math.ceil(estimatedSamples / detailCount)),
    sampleIndex: 0,
    peaks: new Array<number>(detailCount).fill(0),
    squareSums: new Array<number>(detailCount).fill(0),
    sampleCounts: new Array<number>(detailCount).fill(0),
  };
}

function addWaveformDetailSample(accumulator: WaveformDetailAccumulator, sample: number) {
  const bucket = Math.min(
    accumulator.detailCount - 1,
    Math.floor(accumulator.sampleIndex / accumulator.samplesPerPoint),
  );
  const magnitude = Math.abs(sample);
  if (magnitude > accumulator.peaks[bucket]) accumulator.peaks[bucket] = magnitude;
  accumulator.squareSums[bucket] += sample * sample;
  accumulator.sampleCounts[bucket] += 1;
  accumulator.sampleIndex += 1;
}

function roundNormalised(value: number) {
  return Number(Math.max(0, Math.min(1, value || 0)).toFixed(6));
}

function buildCanonicalPreparedAnalysis(
  accumulator: WaveformDetailAccumulator,
  detail: PreparedWaveformDetail,
  duration?: number,
): CanonicalPreparedAnalysis {
  const rawEnergy = accumulator.squareSums.map((sum, index) =>
    accumulator.sampleCounts[index] > 0 ? sum / accumulator.sampleCounts[index] : 0
  );
  const maximumEnergy = getPeakMaximum(rawEnergy);
  const windows = normalisePeaksAgainstMaximum(rawEnergy, maximumEnergy);
  const normalizedAmplitude = detail.peaks.map((peak, index) =>
    roundNormalised(peak * 0.65 + detail.rms[index] * 0.35)
  );
  const expectedSamples = Math.max(1, accumulator.samplesPerPoint);
  const windowConfidence = accumulator.sampleCounts.map((count, index) => {
    const coverage = Math.min(1, count / expectedSamples);
    const signal = detail.peaks[index] > 0.000001 ? 1 : 0.35;
    return roundNormalised(coverage * signal);
  });
  const populated = accumulator.sampleCounts.filter((count) => count > 0).length;
  const coverageConfidence = roundNormalised(populated / accumulator.detailCount);
  const signalWindows = detail.rms.filter((value) => value > 0.000001).length;
  const energyConfidence = roundNormalised(coverageConfidence * Math.min(1, signalWindows / Math.max(1, accumulator.detailCount * 0.25)));
  const transientWindows = detail.transients.filter((value) => value > 0.000001).length;
  const transientConfidence = roundNormalised(coverageConfidence * Math.min(1, transientWindows / Math.max(1, accumulator.detailCount * 0.02)));
  const overallConfidence = roundNormalised((coverageConfidence * 2 + energyConfidence + transientConfidence) / 4);
  const mean = windows.length ? windows.reduce((sum, value) => sum + value, 0) / windows.length : 0;
  const variance = windows.length
    ? windows.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / windows.length
    : 0;
  return {
    formatVersion: PREPARED_ANALYSIS_FORMAT_VERSION,
    windowCount: accumulator.detailCount,
    windowDurationSeconds: Number.isFinite(duration) && Number(duration) > 0
      ? Number((Number(duration) / accumulator.detailCount).toFixed(9))
      : null,
    energy: {
      windows,
      mean: roundNormalised(mean),
      minimum: windows.length ? roundNormalised(windows.reduce((best, value) => Math.min(best, value), 1)) : 0,
      maximum: windows.length ? roundNormalised(windows.reduce((best, value) => Math.max(best, value), 0)) : 0,
      variance: roundNormalised(variance),
    },
    normalizedAmplitude,
    compatibility: createDjAnalysisCompatibilityMetadata(),
    confidence: {
      windows: windowConfidence,
      coverage: coverageConfidence,
      energy: energyConfidence,
      transients: transientConfidence,
      overall: overallConfidence,
    },
    renderer: {
      sampleRate: WAVEFORM_SAMPLE_RATE,
      amplitudeScale: "linear-normalized",
      layout: "fixed-centre-scroll",
      pointsPerLegacyPeak: WAVEFORM_DETAIL_DENSITY,
      preferredAmplitudeSource: "normalizedAmplitude",
    },
  };
}

function finaliseWaveformDetail(accumulator: WaveformDetailAccumulator): PreparedWaveformDetail {
  const rms = accumulator.squareSums.map((sum, index) =>
    accumulator.sampleCounts[index] > 0 ? Math.sqrt(sum / accumulator.sampleCounts[index]) : 0
  );
  const onsetFlux = rms.map((energy, index) => index === 0 ? 0 : Math.max(0, energy - rms[index - 1]));
  const transients = onsetFlux.map((flux, index) => {
    const start = Math.max(0, index - 8);
    const history = onsetFlux.slice(start, index);
    const baseline = history.length
      ? history.reduce((total, value) => total + value, 0) / history.length
      : 0;
    return Math.max(0, flux - baseline * 1.5);
  });
  const maximum = getPeakMaximum(accumulator.peaks);
  return {
    formatVersion: WAVEFORM_DETAIL_FORMAT_VERSION,
    density: WAVEFORM_DETAIL_DENSITY,
    peaks: normalisePeaksAgainstMaximum(accumulator.peaks, maximum),
    rms: normalisePeaksAgainstMaximum(rms, maximum),
    transients: normalisePeaks(transients),
  };
}

export function extractPreparedWaveformDetail(
  samples: readonly number[],
  detailCount: number,
): PreparedWaveformDetail {
  return extractCanonicalPreparedAnalysis(samples, detailCount).detail;
}

export function extractCanonicalPreparedAnalysis(
  samples: readonly number[],
  detailCount: number,
  duration?: number,
): { detail: PreparedWaveformDetail; analysis: CanonicalPreparedAnalysis } {
  const count = Math.max(1, Math.floor(detailCount));
  const accumulator = createWaveformDetailAccumulator(Math.max(1, samples.length), count);
  for (const sample of samples) addWaveformDetailSample(accumulator, Number(sample) || 0);
  const detail = finaliseWaveformDetail(accumulator);
  return { detail, analysis: buildCanonicalPreparedAnalysis(accumulator, detail, duration) };
}

function validNormalisedArray(values: unknown, count: number) {
  return Array.isArray(values)
    && values.length === count
    && values.every((value) => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 1);
}

function hasWaveformDetailPayload(detail: unknown) {
  if (!detail || typeof detail !== "object") return false;
  const value = detail as Partial<PreparedWaveformDetail>;
  const count = value.peaks?.length || 0;
  return value.formatVersion === WAVEFORM_DETAIL_FORMAT_VERSION
    && value.density === WAVEFORM_DETAIL_DENSITY
    && count > 0
    && validNormalisedArray(value.peaks, count)
    && validNormalisedArray(value.rms, count)
    && validNormalisedArray(value.transients, count);
}

function getCompatibleWaveformDetail(
  filePath: string,
  cached: WaveformCacheRecord,
): PreparedWaveformDetail | undefined {
  if (!hasWaveformDetailPayload(cached.detail)) return undefined;
  const source = createDjSourceFingerprint(filePath, {
    duration: cached.detailAsset?.duration ?? cached.duration,
    sampleRate: cached.detailAsset?.sampleRate,
    channelCount: cached.detailAsset?.channelCount,
    codec: cached.detailAsset?.sourceFingerprint?.codec,
  });
  if (source.status !== "ok") return undefined;
  const compatibility = validateDjPreparedAsset(cached.detailAsset, {
    assetType: "waveform-detail",
    assetFormatVersion: WAVEFORM_DETAIL_FORMAT_VERSION,
    sourceFingerprint: source.fingerprint,
  });
  return compatibility.reusable ? cached.detail : undefined;
}

function hasCanonicalPreparedAnalysisPayload(analysis: unknown, count: number) {
  if (!analysis || typeof analysis !== "object") return false;
  const value = analysis as Partial<CanonicalPreparedAnalysis>;
  return value.formatVersion === PREPARED_ANALYSIS_FORMAT_VERSION
    && value.windowCount === count
    && validNormalisedArray(value.energy?.windows, count)
    && validNormalisedArray(value.normalizedAmplitude, count)
    && validNormalisedArray(value.confidence?.windows, count)
    && [value.confidence?.coverage, value.confidence?.energy, value.confidence?.transients, value.confidence?.overall]
      .every((entry) => Number.isFinite(Number(entry)) && Number(entry) >= 0 && Number(entry) <= 1);
}

function getCompatiblePreparedAnalysis(
  filePath: string,
  cached: WaveformCacheRecord,
  detail: PreparedWaveformDetail | undefined,
): CanonicalPreparedAnalysis | undefined {
  if (!detail || !hasCanonicalPreparedAnalysisPayload(cached.analysis, detail.peaks.length)) return undefined;
  const source = createDjSourceFingerprint(filePath, {
    duration: cached.analysisAsset?.duration ?? cached.duration,
    sampleRate: cached.analysisAsset?.sampleRate,
    channelCount: cached.analysisAsset?.channelCount,
    codec: cached.analysisAsset?.sourceFingerprint?.codec,
  });
  if (source.status !== "ok") return undefined;
  const compatibility = validateDjPreparedAsset(cached.analysisAsset, {
    assetType: "prepared-analysis",
    assetFormatVersion: PREPARED_ANALYSIS_FORMAT_VERSION,
    sourceFingerprint: source.fingerprint,
  });
  if (!compatibility.reusable || !cached.analysis) return undefined;
  const analysis = { ...cached.analysis };
  if (analysis.bpmAnalysis) {
    const bpmCompatibility = validateDjPreparedAsset(cached.bpmAsset, {
      assetType: "bpm-analysis",
      assetFormatVersion: DJ_BPM_ANALYSIS_FORMAT_VERSION,
      sourceFingerprint: source.fingerprint,
    });
    if (!bpmCompatibility.reusable) delete analysis.bpmAnalysis;
  }
  if (analysis.beatDetection) {
    const beatCompatibility = validateDjPreparedAsset(cached.beatAsset, {
      assetType: "beat-detection",
      assetFormatVersion: DJ_BEAT_DETECTION_FORMAT_VERSION,
      sourceFingerprint: source.fingerprint,
    });
    if (!beatCompatibility.reusable) delete analysis.beatDetection;
  }
  if (analysis.downbeatAnalysis) {
    const downbeatCompatibility = validateDjPreparedAsset(cached.downbeatAsset, {
      assetType: "downbeat-analysis",
      assetFormatVersion: DJ_DOWNBEAT_ANALYSIS_FORMAT_VERSION,
      sourceFingerprint: source.fingerprint,
    });
    if (!downbeatCompatibility.reusable) delete analysis.downbeatAnalysis;
  }
  if (analysis.dynamicAnalysis) {
    const dynamicCompatibility = validateDjPreparedAsset(cached.dynamicAsset, {
      assetType: "dynamic-analysis",
      assetFormatVersion: DJ_DYNAMIC_ANALYSIS_FORMAT_VERSION,
      sourceFingerprint: source.fingerprint,
    });
    if (!dynamicCompatibility.reusable) delete analysis.dynamicAnalysis;
  }
  if (analysis.gridValidation) {
    const validationCompatibility = validateDjPreparedAsset(cached.validationAsset, {
      assetType: "grid-validation",
      assetFormatVersion: DJ_GRID_VALIDATION_FORMAT_VERSION,
      sourceFingerprint: source.fingerprint,
    });
    if (!validationCompatibility.reusable) delete analysis.gridValidation;
  }
  if (analysis.finalGridDecision) {
    const decisionCompatibility = validateDjPreparedAsset(cached.decisionAsset, {
      assetType: "final-grid-decision",
      assetFormatVersion: DJ_FINAL_GRID_DECISION_FORMAT_VERSION,
      sourceFingerprint: source.fingerprint,
    });
    if (!decisionCompatibility.reusable) delete analysis.finalGridDecision;
  }
  const compatibilityDecision = inspectDjAnalysisCompatibility(analysis);
  return compatibilityDecision.loadable
    ? compatibilityDecision.sanitisedAnalysis as CanonicalPreparedAnalysis
    : undefined;
}

function fallbackWaveformBands(peaks: number[]): WaveformBands {
  return {
    low: peaks.map((value) => Number(value || 0)),
    mid: peaks.map((value) => Number((Number(value || 0) * 0.46).toFixed(6))),
    high: peaks.map((value) => Number((Number(value || 0) * 0.2).toFixed(6))),
  };
}

function normaliseWaveformBands(input: any, peaks: number[]): WaveformBands {
  const fallback = fallbackWaveformBands(peaks);

  return {
    low: Array.isArray(input?.low) ? input.low.map((value: any) => Number(value || 0)) : fallback.low,
    mid: Array.isArray(input?.mid) ? input.mid.map((value: any) => Number(value || 0)) : fallback.mid,
    high: Array.isArray(input?.high) ? input.high.map((value: any) => Number(value || 0)) : fallback.high,
  };
}

function resolveFfmpegPath() {
  const envPath = String(process.env.FFMPEG_PATH || "").trim();
  if (envPath) return envPath;

  const bundledPath = "C:\\ffmpeg-8.0.1\\bin\\ffmpeg.exe";
  if (fs.existsSync(bundledPath)) return bundledPath;

  return process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
}

async function generateWaveformPeaks(
  filePath: string,
  peakCount = DEFAULT_WAVEFORM_PEAKS,
  options: { onProgress?: (percent: number) => void } = {}
) {
  const meta = await mm.parseFile(filePath, { duration: true });
  const duration = Math.max(0.001, Number(meta.format.duration || 0));
  const estimatedSamples = Math.max(1, Math.ceil(duration * WAVEFORM_SAMPLE_RATE));
  const samplesPerPeak = Math.max(1, Math.ceil(estimatedSamples / peakCount));
  const detailCount = MAX_WAVEFORM_DETAIL_POINTS;
  const samplesPerSpectralPoint = Math.max(1, Math.ceil(estimatedSamples / MAX_WAVEFORM_DETAIL_POINTS));

  options.onProgress?.(0);

  return await new Promise<{ duration: number; peaks: number[]; bands: WaveformBands; detail: PreparedWaveformDetail; analysis: CanonicalPreparedAnalysis; multiscale: M12WaveformPyramid }>((resolve, reject) => {
    const peaks = new Array<number>(peakCount).fill(0);
    const lowPeaks = new Array<number>(peakCount).fill(0);
    const midPeaks = new Array<number>(peakCount).fill(0);
    const highPeaks = new Array<number>(peakCount).fill(0);
    const spectralPeaks = new Array<number>(MAX_WAVEFORM_DETAIL_POINTS).fill(0);
    const spectralLow = new Array<number>(MAX_WAVEFORM_DETAIL_POINTS).fill(0);
    const spectralMid = new Array<number>(MAX_WAVEFORM_DETAIL_POINTS).fill(0);
    const spectralHigh = new Array<number>(MAX_WAVEFORM_DETAIL_POINTS).fill(0);
    const detailAccumulator = createWaveformDetailAccumulator(estimatedSamples, detailCount);
    const harmonicSamples: number[] = [];

    const lowAlpha = 1 - Math.exp((-2 * Math.PI * 250) / WAVEFORM_SAMPLE_RATE);
    const midAlpha = 1 - Math.exp((-2 * Math.PI * 4000) / WAVEFORM_SAMPLE_RATE);

    let lowPass250 = 0;
    let lowPass4000 = 0;
    let sampleIndex = 0;
    let leftover = Buffer.alloc(0);
    let stderr = "";
    let stderrBuffer = "";
    let lastProgressPercent = 0;

    function pushProgress(percent: number) {
      const nextPercent = Math.max(0, Math.min(100, Math.floor(percent || 0)));
      if (nextPercent <= lastProgressPercent && nextPercent !== 100) return;
      lastProgressPercent = nextPercent;
      options.onProgress?.(nextPercent);
    }

    function handleProgressLine(line: string) {
      if (!line) return;

      const eqIndex = line.indexOf("=");
      if (eqIndex === -1) {
        stderr += `${line}\n`;
        return;
      }

      const key = line.slice(0, eqIndex).trim();
      const rawValue = line.slice(eqIndex + 1).trim();

      if (key === "out_time_ms") {
        const numeric = Number(rawValue || 0);
        if (!numeric || !duration) return;

        let seconds = numeric / 1000000;
        if (seconds > duration * 5) {
          seconds = numeric / 1000;
        }

        const percent = Math.min(99, Math.max(1, Math.round((seconds / duration) * 100)));
        pushProgress(percent);
        return;
      }

      if (key === "progress" && rawValue === "end") {
        pushProgress(100);
      }
    }

    const ffmpeg = spawn(
      resolveFfmpegPath(),
      [
        "-v", "error",
        "-nostats",
        "-progress", "pipe:2",
        "-i", filePath,
        "-ac", "1",
        "-ar", String(WAVEFORM_SAMPLE_RATE),
        "-f", "f32le",
        "-"
      ],
      {
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    ffmpeg.stdout.on("data", (chunk: Buffer) => {
      let data = chunk;

      if (leftover.length) {
        data = Buffer.concat([leftover, chunk]);
        leftover = Buffer.alloc(0);
      }

      const completeLength = data.length - (data.length % 4);

      if (completeLength !== data.length) {
        leftover = Buffer.from(data.subarray(completeLength));
        data = data.subarray(0, completeLength);
      }

      for (let offset = 0; offset < data.length; offset += 4) {
        const sample = data.readFloatLE(offset);
        const value = Math.abs(sample);

        lowPass250 += lowAlpha * (sample - lowPass250);
        lowPass4000 += midAlpha * (sample - lowPass4000);

        const lowValue = Math.abs(lowPass250);
        const midValue = Math.abs(lowPass4000 - lowPass250);
        const highValue = Math.abs(sample - lowPass4000);

        const bucket = Math.min(peakCount - 1, Math.floor(sampleIndex / samplesPerPeak));

        if (value > peaks[bucket]) peaks[bucket] = value;
        if (lowValue > lowPeaks[bucket]) lowPeaks[bucket] = lowValue;
        if (midValue > midPeaks[bucket]) midPeaks[bucket] = midValue;
        if (highValue > highPeaks[bucket]) highPeaks[bucket] = highValue;
        const spectralBucket = Math.min(MAX_WAVEFORM_DETAIL_POINTS - 1, Math.floor(sampleIndex / samplesPerSpectralPoint));
        if (value > spectralPeaks[spectralBucket]) spectralPeaks[spectralBucket] = value;
        if (lowValue > spectralLow[spectralBucket]) spectralLow[spectralBucket] = lowValue;
        if (midValue > spectralMid[spectralBucket]) spectralMid[spectralBucket] = midValue;
        if (highValue > spectralHigh[spectralBucket]) spectralHigh[spectralBucket] = highValue;
        addWaveformDetailSample(detailAccumulator, sample);
        if (sampleIndex >= WAVEFORM_SAMPLE_RATE * 15 && sampleIndex < WAVEFORM_SAMPLE_RATE * 135 && sampleIndex % 4 === 0) harmonicSamples.push(sample);

        sampleIndex += 1;
      }
    });

    ffmpeg.stderr.on("data", (chunk: Buffer) => {
      stderrBuffer += chunk.toString("utf8");

      let newlineIndex = stderrBuffer.indexOf("\n");
      while (newlineIndex !== -1) {
        const line = stderrBuffer.slice(0, newlineIndex).trim();
        stderrBuffer = stderrBuffer.slice(newlineIndex + 1);
        handleProgressLine(line);
        newlineIndex = stderrBuffer.indexOf("\n");
      }
    });

    ffmpeg.on("error", (err: Error) => {
      reject(new Error(`FFmpeg failed to start: ${String(err?.message || err)}`));
    });

    ffmpeg.on("close", (code: number | null) => {
      if (stderrBuffer.trim()) {
        handleProgressLine(stderrBuffer.trim());
      }

      if (code !== 0) {
        reject(new Error(stderr.trim() || `FFmpeg exited with code ${String(code)}`));
        return;
      }

      pushProgress(100);

      const maximum = getPeakMaximum(peaks);
      const detail = finaliseWaveformDetail(detailAccumulator);
      const normalisedSpectral = {
        combined: normalisePeaksAgainstMaximum(spectralPeaks, maximum),
        low: normalisePeaksAgainstMaximum(spectralLow, maximum),
        mid: normalisePeaksAgainstMaximum(spectralMid, maximum),
        high: normalisePeaksAgainstMaximum(spectralHigh, maximum),
      };
      const multiscale = buildM12WaveformPyramid({ ...normalisedSpectral, transients: detail.transients });
      const analysis = buildCanonicalPreparedAnalysis(detailAccumulator, detail, duration);
      analysis.bpmAnalysis = analyseDjPreparedBpm({
        duration,
        normalizedAmplitude: analysis.normalizedAmplitude,
        energyWindows: analysis.energy.windows,
        transients: detail.transients,
        windowConfidence: analysis.confidence.windows,
        preferDigitalWhole: true,
      });
      analysis.beatDetection = refineDjBeatCandidates({
        duration,
        normalizedAmplitude: analysis.normalizedAmplitude,
        energyWindows: analysis.energy.windows,
        transients: detail.transients,
        windowConfidence: analysis.confidence.windows,
        bpmAnalysis: analysis.bpmAnalysis,
        lowBand: normalisePeaksAgainstMaximum(lowPeaks, maximum),
        midBand: normalisePeaksAgainstMaximum(midPeaks, maximum),
        highBand: normalisePeaksAgainstMaximum(highPeaks, maximum),
        analysedAt: analysis.bpmAnalysis.analysedAt,
      });
      analysis.downbeatAnalysis = analyseDjPreparedDownbeat({
        duration,
        normalizedAmplitude: analysis.normalizedAmplitude,
        energyWindows: analysis.energy.windows,
        transients: detail.transients,
        windowConfidence: analysis.confidence.windows,
        bpmAnalysis: analysis.bpmAnalysis,
        lowBand: normalisePeaksAgainstMaximum(lowPeaks, maximum),
        midBand: normalisePeaksAgainstMaximum(midPeaks, maximum),
        highBand: normalisePeaksAgainstMaximum(highPeaks, maximum),
        analysedAt: analysis.bpmAnalysis.analysedAt,
      });
      analysis.dynamicAnalysis = analyseDjDynamicTempo({
        duration,
        normalizedAmplitude: analysis.normalizedAmplitude,
        energyWindows: analysis.energy.windows,
        transients: detail.transients,
        windowConfidence: analysis.confidence.windows,
        bpmAnalysis: analysis.bpmAnalysis,
        downbeatAnalysis: analysis.downbeatAnalysis,
        analysedAt: analysis.bpmAnalysis.analysedAt,
      });
      analysis.gridValidation = validateDjWholeTrackGrid({
        duration,
        bpmAnalysis: analysis.bpmAnalysis,
        downbeatAnalysis: analysis.downbeatAnalysis,
        dynamicAnalysis: analysis.dynamicAnalysis,
        beatDetection: analysis.beatDetection,
        analysedAt: analysis.bpmAnalysis.analysedAt,
      });
      analysis.finalGridDecision = reconcileDjFinalGrid({
        bpmAnalysis: analysis.bpmAnalysis,
        downbeatAnalysis: analysis.downbeatAnalysis,
        dynamicAnalysis: analysis.dynamicAnalysis,
        beatDetection: analysis.beatDetection,
        gridValidation: analysis.gridValidation,
        analysedAt: analysis.bpmAnalysis.analysedAt,
      });
      analysis.keyAnalysis = analyseMusicalKey(harmonicSamples, WAVEFORM_SAMPLE_RATE / 4);
      const trimmedConfidence = analysis.confidence.windows.map((value, index, values) =>
        index < values.length * 0.08 || index >= values.length * 0.92 ? 0 : value
      );
      const refinedBpm = analyseDjPreparedBpm({ duration, normalizedAmplitude: analysis.normalizedAmplitude, energyWindows: analysis.energy.windows, transients: detail.transients, windowConfidence: trimmedConfidence, preferDigitalWhole: true, analysedAt: analysis.bpmAnalysis.analysedAt });
      const refinedBeat = refineDjBeatCandidates({ duration, normalizedAmplitude: analysis.normalizedAmplitude, energyWindows: analysis.energy.windows, transients: detail.transients, windowConfidence: trimmedConfidence, bpmAnalysis: refinedBpm, lowBand: normalisePeaksAgainstMaximum(lowPeaks, maximum), midBand: normalisePeaksAgainstMaximum(midPeaks, maximum), highBand: normalisePeaksAgainstMaximum(highPeaks, maximum), analysedAt: analysis.bpmAnalysis.analysedAt });
      const refinedDownbeat = analyseDjPreparedDownbeat({ duration, normalizedAmplitude: analysis.normalizedAmplitude, energyWindows: analysis.energy.windows, transients: detail.transients, windowConfidence: trimmedConfidence, bpmAnalysis: refinedBpm, lowBand: normalisePeaksAgainstMaximum(lowPeaks, maximum), midBand: normalisePeaksAgainstMaximum(midPeaks, maximum), highBand: normalisePeaksAgainstMaximum(highPeaks, maximum), analysedAt: analysis.bpmAnalysis.analysedAt });
      const refinedDynamic = analyseDjDynamicTempo({ duration, normalizedAmplitude: analysis.normalizedAmplitude, energyWindows: analysis.energy.windows, transients: detail.transients, windowConfidence: trimmedConfidence, bpmAnalysis: refinedBpm, downbeatAnalysis: refinedDownbeat, analysedAt: analysis.bpmAnalysis.analysedAt });
      const refinedGrid = validateDjWholeTrackGrid({ duration, bpmAnalysis: refinedBpm, downbeatAnalysis: refinedDownbeat, dynamicAnalysis: refinedDynamic, beatDetection: refinedBeat, analysedAt: analysis.bpmAnalysis.analysedAt });
      const refinedDecision = reconcileDjFinalGrid({ bpmAnalysis: refinedBpm, downbeatAnalysis: refinedDownbeat, dynamicAnalysis: refinedDynamic, beatDetection: refinedBeat, gridValidation: refinedGrid, analysedAt: analysis.bpmAnalysis.analysedAt });
      const selection = selectM10AnalysisPass([
        { id: "whole-track", bpm: analysis.bpmAnalysis, downbeat: analysis.downbeatAnalysis, dynamic: analysis.dynamicAnalysis, grid: analysis.gridValidation, decision: analysis.finalGridDecision },
        { id: "intro-outro-trimmed", bpm: refinedBpm, downbeat: refinedDownbeat, dynamic: refinedDynamic, grid: refinedGrid, decision: refinedDecision },
      ], analysis.keyAnalysis, analysis.finalGridDecision.finalConfidence);
      analysis.m10Refinement = selection;
      analysis.bpmAnalysis = selection.selected.bpm;
      analysis.downbeatAnalysis = selection.selected.downbeat;
      analysis.dynamicAnalysis = selection.selected.dynamic;
      analysis.gridValidation = selection.selected.grid;
      analysis.finalGridDecision = selection.selected.decision;

      resolve({
        duration,
        peaks: normalisePeaksAgainstMaximum(peaks, maximum),
        bands: {
          low: normalisePeaksAgainstMaximum(lowPeaks, maximum),
          mid: normalisePeaksAgainstMaximum(midPeaks, maximum),
          high: normalisePeaksAgainstMaximum(highPeaks, maximum),
        },
        detail,
        analysis,
        multiscale,
      });
    });
  });
}

/**
 * Runs the bounded prepared-analysis pipeline for one authorised track without
 * deleting, replacing, or rewriting its existing waveform cache.
 */
export async function analysePreparedGridForFile(
  filePath: string,
  onProgress?: (percent: number) => void,
) {
  const generated = await generateWaveformPeaks(filePath, DEFAULT_WAVEFORM_PEAKS, { onProgress });
  return generated.analysis;
}

export function normaliseWaveformPeakCount(input: unknown, fallback = DEFAULT_WAVEFORM_PEAKS) {
  const numeric = Number(input || fallback);
  return Math.max(64, Math.min(32768, Math.floor(numeric || fallback)));
}

export function hasValidWaveformCache(filePath: string, peakCount = DEFAULT_WAVEFORM_PEAKS) {
  const cachePath = getWaveformCachePath(filePath);
  if (!fs.existsSync(filePath) || !fs.existsSync(cachePath)) return false;

  try {
    const cached = JSON.parse(fs.readFileSync(cachePath, "utf8")) as WaveformCacheRecord;
    return validateWaveformCacheRecord(filePath, peakCount, cached).reusable;
  } catch {
    return false;
  }
}

export function restoreWaveformCache(
  filePath: string,
  peakCount = DEFAULT_WAVEFORM_PEAKS,
  duration = 0,
  peaks: number[] = [],
  bands?: WaveformBands
) {
  if (!fs.existsSync(filePath)) return false;

  const cachePath = getWaveformCachePath(filePath);
  const cacheKey = buildWaveformCacheKey(filePath, peakCount);

  const restoredBands = normaliseWaveformBands(bands, peaks);
  const restoredRecord: WaveformCacheRecord = {
    cacheKey,
    duration: Number(duration || 0),
    peaks: Array.isArray(peaks) ? peaks.map((value) => Number(value || 0)) : [],
    bands: restoredBands,
  };
  if (!hasWaveformPayload(restoredRecord, peakCount)) return false;
  const source = createDjSourceFingerprint(filePath, { duration });
  if (source.status !== "ok") return false;
  const preparedAsset = createDjPreparedAssetMetadata({
    assetType: "prepared-waveform",
    assetFormatVersion: WAVEFORM_CACHE_VERSION,
    sourceFingerprint: source.fingerprint,
    generator: "brmedia-waveform-restore",
    duration,
  });
  writeDjPreparedAssetJsonAtomically(cachePath, {
    ...restoredRecord,
    preparedAsset,
  });

  return true;
}

export async function getCachedWaveform(
  filePath: string,
  peakCount = DEFAULT_WAVEFORM_PEAKS,
  options: { force?: boolean; onProgress?: (percent: number) => void } = {}
) {
  const cachePath = getWaveformCachePath(filePath);
  const cacheKey = buildWaveformCacheKey(filePath, peakCount);

  if (!options.force && fs.existsSync(cachePath)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cachePath, "utf8")) as WaveformCacheRecord;
      const compatibility = validateWaveformCacheRecord(filePath, peakCount, cached);
      if (compatibility.reusable && hasWaveformPayload(cached, peakCount)) {
        options.onProgress?.(100);
        const detail = getCompatibleWaveformDetail(filePath, cached);
        const analysis = getCompatiblePreparedAnalysis(filePath, cached, detail);
        return {
          duration: Number(cached.duration || 0),
          peaks: cached.peaks!,
          bands: normaliseWaveformBands(cached.bands, cached.peaks!),
          multiscale: cached.multiscale,
          ...(detail ? { detail } : {}),
          ...(analysis ? { analysis } : {}),
          cached: true,
          compatibility,
          preparedAsset: publicWaveformRegistration(cached.preparedAsset, compatibility),
        };
      }
      const error: any = new Error(`Prepared waveform is ${compatibility.status}`);
      error.code = "DJ_PREPARED_ASSET_INCOMPATIBLE";
      error.compatibility = compatibility;
      throw error;
    } catch (error: any) {
      if (error?.code === "DJ_PREPARED_ASSET_INCOMPATIBLE") throw error;
      const corrupt: any = new Error("Prepared waveform cache is corrupt");
      corrupt.code = "DJ_PREPARED_ASSET_INCOMPATIBLE";
      corrupt.compatibility = validateDjPreparedAsset(null, {
        assetType: "prepared-waveform",
        corrupt: true,
      });
      throw corrupt;
    }
  }

  const legacyPath = getLegacyWaveformCachePath(filePath);
  if (!options.force && !fs.existsSync(cachePath) && fs.existsSync(legacyPath)) {
    const cached = JSON.parse(fs.readFileSync(legacyPath, "utf8")) as WaveformCacheRecord;
    const compatibility = validateLegacyWaveformCacheRecord(filePath, peakCount, cached);
    if (compatibility.reusable && hasWaveformPayload(cached, peakCount)) {
      const detail = getCompatibleWaveformDetail(filePath, cached);
      const analysis = getCompatiblePreparedAnalysis(filePath, cached, detail);
      return { duration: Number(cached.duration || 0), peaks: cached.peaks!, bands: normaliseWaveformBands(cached.bands, cached.peaks!),
          multiscale: cached.multiscale,
        ...(detail ? { detail } : {}), ...(analysis ? { analysis } : {}), cached: true, legacy: true, compatibility,
        preparedAsset: publicWaveformRegistration(cached.preparedAsset, compatibility) };
    }
  }

  const generated = await generateWaveformPeaks(filePath, peakCount, {
    onProgress: options.onProgress,
  });

  const source = createDjSourceFingerprint(filePath, { duration: generated.duration });
  if (source.status !== "ok") {
    throw new Error(`Could not fingerprint waveform source: ${source.reason}`);
  }
  const preparedAsset = createDjPreparedAssetMetadata({
    assetType: "prepared-waveform",
    assetFormatVersion: WAVEFORM_CACHE_VERSION,
    sourceFingerprint: source.fingerprint,
    generator: WAVEFORM_GENERATOR,
    duration: generated.duration,
  });
  const detailAsset = createDjPreparedAssetMetadata({
    assetType: "waveform-detail",
    assetFormatVersion: WAVEFORM_DETAIL_FORMAT_VERSION,
    sourceFingerprint: source.fingerprint,
    generator: WAVEFORM_GENERATOR,
    duration: generated.duration,
    parentFingerprint: preparedAsset.implementationFingerprint.value,
  });
  const analysisAsset = createDjPreparedAssetMetadata({
    assetType: "prepared-analysis",
    assetFormatVersion: PREPARED_ANALYSIS_FORMAT_VERSION,
    sourceFingerprint: source.fingerprint,
    generator: WAVEFORM_GENERATOR,
    duration: generated.duration,
    parentFingerprint: detailAsset.implementationFingerprint.value,
  });
  const bpmAsset = createDjPreparedAssetMetadata({
    assetType: "bpm-analysis",
    assetFormatVersion: DJ_BPM_ANALYSIS_FORMAT_VERSION,
    sourceFingerprint: source.fingerprint,
    generator: WAVEFORM_GENERATOR,
    duration: generated.duration,
    parentFingerprint: analysisAsset.implementationFingerprint.value,
  });
  const beatAsset = createDjPreparedAssetMetadata({
    assetType: "beat-detection",
    assetFormatVersion: DJ_BEAT_DETECTION_FORMAT_VERSION,
    sourceFingerprint: source.fingerprint,
    generator: WAVEFORM_GENERATOR,
    duration: generated.duration,
    parentFingerprint: bpmAsset.implementationFingerprint.value,
  });
  const downbeatAsset = createDjPreparedAssetMetadata({
    assetType: "downbeat-analysis",
    assetFormatVersion: DJ_DOWNBEAT_ANALYSIS_FORMAT_VERSION,
    sourceFingerprint: source.fingerprint,
    generator: WAVEFORM_GENERATOR,
    duration: generated.duration,
    parentFingerprint: bpmAsset.implementationFingerprint.value,
  });
  const dynamicAsset = createDjPreparedAssetMetadata({
    assetType: "dynamic-analysis",
    assetFormatVersion: DJ_DYNAMIC_ANALYSIS_FORMAT_VERSION,
    sourceFingerprint: source.fingerprint,
    generator: WAVEFORM_GENERATOR,
    duration: generated.duration,
    parentFingerprint: downbeatAsset.implementationFingerprint.value,
  });
  const validationAsset = createDjPreparedAssetMetadata({
    assetType: "grid-validation",
    assetFormatVersion: DJ_GRID_VALIDATION_FORMAT_VERSION,
    sourceFingerprint: source.fingerprint,
    generator: WAVEFORM_GENERATOR,
    duration: generated.duration,
    parentFingerprint: dynamicAsset.implementationFingerprint.value,
  });
  const decisionAsset = createDjPreparedAssetMetadata({
    assetType: "final-grid-decision",
    assetFormatVersion: DJ_FINAL_GRID_DECISION_FORMAT_VERSION,
    sourceFingerprint: source.fingerprint,
    generator: WAVEFORM_GENERATOR,
    duration: generated.duration,
    parentFingerprint: validationAsset.implementationFingerprint.value,
  });
  writeDjPreparedAssetJsonAtomically(cachePath, {
    cacheKey,
    duration: generated.duration,
    peaks: generated.peaks,
    bands: generated.bands,
    detail: generated.detail,
    analysis: generated.analysis,
    multiscale: generated.multiscale,
    preparedAsset,
    detailAsset,
    analysisAsset,
    bpmAsset,
    beatAsset,
    downbeatAsset,
    dynamicAsset,
    validationAsset,
    decisionAsset,
  });

  return {
    duration: generated.duration,
    peaks: generated.peaks,
    bands: generated.bands,
    detail: generated.detail,
    analysis: generated.analysis,
    multiscale: generated.multiscale,
    cached: false,
    compatibility: validateDjPreparedAsset(preparedAsset, {
      assetType: "prepared-waveform",
      assetFormatVersion: WAVEFORM_CACHE_VERSION,
      sourceFingerprint: source.fingerprint,
    }),
    preparedAsset: publicWaveformRegistration(preparedAsset, validateDjPreparedAsset(preparedAsset, {
      assetType: "prepared-waveform",
      assetFormatVersion: WAVEFORM_CACHE_VERSION,
      sourceFingerprint: source.fingerprint,
    })),
  };
}

export function getWaveformPreparedAssetRegistration(
  filePath: string,
  peakCount = DEFAULT_WAVEFORM_PEAKS
): WaveformPreparedAssetRegistration {
  const cachePath = getWaveformCachePath(filePath);
  if (!fs.existsSync(filePath) || !fs.existsSync(cachePath)) {
    const missing = validateDjPreparedAsset(null, { assetType: "prepared-waveform" });
    return publicWaveformRegistration(undefined, missing);
  }
  try {
    const cached = JSON.parse(fs.readFileSync(cachePath, "utf8")) as WaveformCacheRecord;
    const compatibility = validateWaveformCacheRecord(filePath, peakCount, cached);
    return publicWaveformRegistration(cached.preparedAsset, compatibility);
  } catch {
    const corrupt = validateDjPreparedAsset(null, {
      assetType: "prepared-waveform",
      corrupt: true,
    });
    return publicWaveformRegistration(undefined, corrupt);
  }
}

export function getExistingWaveformCache(filePath: string) {
  if (!fs.existsSync(filePath)) return null;
  const cachePath = locateExistingWaveformCache(filePath);
  if (!cachePath) return null;
  try {
    const cached = JSON.parse(fs.readFileSync(cachePath, "utf8")) as WaveformCacheRecord;
    const peakCount = Array.isArray(cached.peaks) ? cached.peaks.length : 0;
    if (peakCount < 64 || peakCount > 32768) return null;
    const legacy = cached.preparedAsset?.assetFormatVersion === LEGACY_WAVEFORM_CACHE_VERSION;
    const compatibility = legacy
      ? validateLegacyWaveformCacheRecord(filePath, peakCount, cached)
      : validateWaveformCacheRecord(filePath, peakCount, cached);
    if (!compatibility.reusable || !hasWaveformPayload(cached, peakCount)) return null;
    return {
      duration: Number(cached.duration || 0), peaks: cached.peaks!,
      bands: normaliseWaveformBands(cached.bands, cached.peaks!),
      multiscale: cached.multiscale || null,
      analysis: getCompatiblePreparedAnalysis(filePath, cached, getCompatibleWaveformDetail(filePath, cached)),
      preparedAsset: publicWaveformRegistration(cached.preparedAsset, compatibility),
      compatibility, peakCount, legacy,
    };
  } catch { return null; }
}

export async function generateWaveformsForTracks(
  tracks: WaveformTrackRef[],
  options: { peakCount?: number; force?: boolean; onlyMissing?: boolean } = {}
) {
  const peakCount = normaliseWaveformPeakCount(options.peakCount);
  const force = options.force === true;
  const onlyMissing = options.onlyMissing === true;

  const results: WaveformGenerateResult[] = [];

  for (const track of tracks) {
    try {
      if (onlyMissing && !force && hasValidWaveformCache(track.locator, peakCount)) {
        results.push({
          id: track.id,
          locator: track.locator,
          title: track.title,
          status: "skipped",
          detail: "already cached",
        });
        continue;
      }

      await getCachedWaveform(track.locator, peakCount, { force });

      results.push({
        id: track.id,
        locator: track.locator,
        title: track.title,
        status: "generated",
      });
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : String(err);

      results.push({
        id: track.id,
        locator: track.locator,
        title: track.title,
        status: "failed",
        detail,
      });
    }
  }

  return {
    total: results.length,
    generated: results.filter((entry) => entry.status === "generated").length,
    skipped: results.filter((entry) => entry.status === "skipped").length,
    failed: results.filter((entry) => entry.status === "failed").length,
    results,
  };
}

let waveformQueue: Promise<void> = Promise.resolve();

export function queueWaveformGenerationForItems(
  tracks: WaveformTrackRef[],
  options: { peakCount?: number; force?: boolean; onlyMissing?: boolean } = {}
) {
  const refs = tracks.filter((track) => track?.id && track?.locator);
  if (!refs.length) return waveformQueue;

  waveformQueue = waveformQueue
    .catch(() => undefined)
    .then(async () => {
      await generateWaveformsForTracks(refs, options);
    });

  return waveformQueue;
}

const waveformJobs = new Map<string, WaveformJob>();
const waveformFailedTrackIds = new Set<string>();
let waveformJobCounter = 0;
let waveformJobQueue: Promise<void> = Promise.resolve();

function createWaveformJobId() {
  waveformJobCounter += 1;
  return `wavejob_${Date.now().toString(36)}_${waveformJobCounter.toString(36)}`;
}

function cloneWaveformJob(job: WaveformJob) {
  return {
    ...job,
    items: job.items.map((item) => ({ ...item })),
  };
}

async function runWaveformGenerationJob(
  job: WaveformJob,
  tracks: WaveformTrackRef[],
  options: { peakCount: number; force: boolean; onlyMissing: boolean }
) {
  job.status = "running";
  job.startedAt = new Date().toISOString();
  for (let index = 0; index < tracks.length; index += 1) {
    const track = tracks[index];
    const item = job.items[index];
    if (!item) continue;

    if (options.onlyMissing && !options.force && hasValidWaveformCache(track.locator, options.peakCount)) {
      item.status = "skipped";
      item.progressPercent = 100;
      item.detail = "Already cached";
      waveformFailedTrackIds.delete(track.id);
      job.skipped += 1;
      job.processed += 1;
      continue;
    }

    item.status = "processing";
    item.progressPercent = Math.max(item.progressPercent, 1);
    item.detail = "Generating waveform...";

    try {
      await getCachedWaveform(track.locator, options.peakCount, {
        force: options.force,
        onProgress: (percent) => {
          item.progressPercent = Math.max(item.progressPercent, Math.min(100, Math.floor(percent || 0)));
          item.detail = item.progressPercent >= 100
            ? "Finalising..."
            : `Building peaks... ${item.progressPercent}%`;
        },
      });

      item.status = "generated";
      item.progressPercent = 100;
      item.detail = options.force ? "Waveform rebuilt" : "Waveform complete";
      waveformFailedTrackIds.delete(track.id);
      job.generated += 1;
      job.processed += 1;
    } catch (err: unknown) {
      item.status = "failed";
      item.progressPercent = 100;
      item.detail = err instanceof Error ? err.message : String(err);
      waveformFailedTrackIds.add(track.id);
      job.failed += 1;
      job.processed += 1;
    }
  }

  job.status = job.failed > 0 ? "done_with_errors" : "done";
  job.finishedAt = new Date().toISOString();

  appendStatsEvent("waveform_job_done", "server", {
    entityType: "waveform_job",
    entityId: job.id,
    title: "Waveform rebuild job",
    status: job.status,
    route: "server-settings",
    value: job.generated,
    extra: {
      scope: job.scope,
      total: job.total,
      generated: job.generated,
      skipped: job.skipped,
      failed: job.failed,
    },
  });

  if (job.failed) {
    appendStatsEvent("waveform_job_error", "server", {
      entityType: "waveform_job",
      entityId: job.id,
      title: "Waveform rebuild errors",
      status: "warning",
      route: "server-settings",
      count: job.failed,
      extra: {
        scope: job.scope,
        total: job.total,
        failed: job.failed,
      },
    });
  }
}

export function startWaveformGenerationJob(
  tracks: WaveformTrackRef[],
  options: { peakCount?: number; force?: boolean; onlyMissing?: boolean; scope?: "single" | "all" | "failed" } = {}
) {
  const refs = tracks.filter((track) => track?.id && track?.locator);
  const active = Array.from(waveformJobs.values()).find((job) =>
    (job.status === "queued" || job.status === "running") &&
    refs.length === 1 &&
    job.items.some((item) => item.id === refs[0].id)
  );
  if (active) return cloneWaveformJob(active);
  const peakCount = normaliseWaveformPeakCount(options.peakCount);
  const force = options.force === true;
  const onlyMissing = options.onlyMissing === true;
  const scope = options.scope === "single"
    ? "single"
    : options.scope === "failed"
      ? "failed"
      : "all";

  const job: WaveformJob = {
    id: createWaveformJobId(),
    scope,
    status: "queued",
    count: peakCount,
    force,
    total: refs.length,
    processed: 0,
    generated: 0,
    skipped: 0,
    failed: 0,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    items: refs.map((track) => ({
      id: track.id,
      locator: track.locator,
      title: track.title,
      status: "queued",
      progressPercent: 0,
      detail: "Queued",
    })),
  };

  waveformJobs.set(job.id, job);

  waveformJobQueue = waveformJobQueue.catch(() => undefined).then(() =>
    runWaveformGenerationJob(job, refs, { peakCount, force, onlyMissing })
  );

  return cloneWaveformJob(job);
}

export function getWaveformJobSnapshot(jobId: string) {
  const job = waveformJobs.get(jobId);
  if (!job) return null;
  return cloneWaveformJob(job);
}

export function getWaveformJobForTrack(trackId: string) {
  const jobs = Array.from(waveformJobs.values()).reverse();
  const job = jobs.find((candidate) =>
    candidate.items.some((item) => item.id === trackId)
  );
  return job ? cloneWaveformJob(job) : null;
}

export function getWaveformFailedTrackIds() {
  return Array.from(waveformFailedTrackIds);
}

export function clearWaveformFailedTrackIds() {
  const count = waveformFailedTrackIds.size;
  waveformFailedTrackIds.clear();
  return count;
}

export function getWaveformCacheHealth(
  tracks: WaveformTrackRef[],
  peakCount = DEFAULT_WAVEFORM_PEAKS
) {
  const refs = tracks.filter((track) => track?.id && track?.locator);
  const failedIds = new Set(getWaveformFailedTrackIds());

  let cached = 0;
  let missing = 0;
  let missingFiles = 0;
  let cacheBytes = 0;
  const cachedTrackIds: string[] = [];

  for (const track of refs) {
    const filePath = path.resolve(track.locator);

    if (!fs.existsSync(filePath)) {
      missingFiles += 1;
      missing += 1;
      continue;
    }

    if (hasValidWaveformCache(filePath, peakCount)) {
      cached += 1;
      cachedTrackIds.push(track.id);

      try {
        const cachePath = getWaveformCachePath(filePath);
        if (fs.existsSync(cachePath)) {
          cacheBytes += fs.statSync(cachePath).size;
        }
      } catch {
        // ignore cache size read errors
      }

      continue;
    }

    missing += 1;
  }

  const failed = refs.filter((track) => failedIds.has(track.id)).length;

  return {
    total: refs.length,
    cached,
    missing,
    failed,
    missingFiles,
    cacheBytes,
    peakCount,
    cachedTrackIds,
    failedTrackIds: refs.filter((track) => failedIds.has(track.id)).map((track) => track.id),
  };
}

export function clearWaveformCacheForTracks(tracks: WaveformTrackRef[]) {
  let deleted = 0;

  for (const track of tracks) {
    if (!track?.locator) continue;

    try {
      if (deleteWaveformCacheForFile(path.resolve(track.locator))) {
        deleted += 1;
      }
    } catch {
      // ignore individual cache delete errors
    }
  }

  return deleted;
}
