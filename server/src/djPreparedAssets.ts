import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const DJ_PREPARED_ASSET_METADATA_VERSION = 1;
export const DJ_SOURCE_FINGERPRINT_VERSION = "source-regions-v1";

export const DJ_IMPLEMENTATION_VERSIONS = Object.freeze({
  preparedWaveformFormat: "multiband-v1",
  spectralWaveformExtraction: "spectral-v4",
  peakAverageExtraction: "peak-max-v1",
  waveformDetailExtraction: "rms-peak-v1",
  preparedAnalysisExtraction: "energy-confidence-v1",
  transientExtraction: "prepared-flux-v1",
  confidenceEngine: "unified-confidence-v1",
  beatDetection: "beat-refinement-v1",
  gridValidation: "whole-track-grid-v1",
  finalGridDecision: "final-grid-decision-v1",
  analysisCompatibility: "strengthened-analysis-v1",
  analysisReleaseCandidate: "b12-rc1",
  bpmAnalysis: "tempo-confidence-v1",
  normalAnalysis: "grid-analysis-v4-normal",
  dynamicAnalysis: "dynamic-segments-v1",
  autoClassification: "grid-analysis-v4-auto",
  digitalTempoLock: "digital-tempo-lock-v1",
  fullTrackDriftRescue: "full-track-drift-v1",
  downbeatBarAnalysis: "downbeat-bars-v1",
  gridSchema: "dj-grid-v2",
  gridCore: "grid-core-v2",
});

export type DjPreparedAssetType =
  | "prepared-waveform"
  | "waveform-detail"
  | "prepared-analysis"
  | "spectral-bands"
  | "transient-data"
  | "bpm-analysis"
  | "beat-detection"
  | "grid-validation"
  | "final-grid-decision"
  | "downbeat-analysis"
  | "dynamic-analysis"
  | "analysis-classification"
  | "beat-grid"
  | "manual-grid"
  | "cue-memory"
  | "stems";

export type DjCompatibilityStatus =
  | "compatible"
  | "legacy-compatible"
  | "stale-source"
  | "stale-implementation"
  | "incomplete"
  | "corrupt"
  | "unknown-version"
  | "manual-protected"
  | "locked-protected"
  | "missing";

export interface DjSourceFingerprint {
  version: typeof DJ_SOURCE_FINGERPRINT_VERSION;
  value: string;
  pathIdentity: string;
  sourceSize: number;
  modifiedAtMs: number;
  extension: string;
  duration: number | null;
  sampleRate: number | null;
  channelCount: number | null;
  codec: string;
  contentFingerprint: string;
  bytesRead: number;
}

export interface DjImplementationFingerprint {
  assetType: DjPreparedAssetType;
  version: 1;
  value: string;
  components: Record<string, string>;
}

export interface DjPreparedAssetMetadata {
  metadataVersion: typeof DJ_PREPARED_ASSET_METADATA_VERSION;
  assetType: DjPreparedAssetType;
  assetFormatVersion: string;
  sourceFingerprint: DjSourceFingerprint;
  implementationFingerprint: DjImplementationFingerprint;
  createdAt: string;
  updatedAt: string;
  generator: string;
  duration: number | null;
  sampleRate: number | null;
  channelCount: number | null;
  sourceSize: number;
  compatibilityStatus: DjCompatibilityStatus;
  parentFingerprint?: string;
  manual?: boolean;
  locked?: boolean;
}

export interface DjCompatibilityResult {
  status: DjCompatibilityStatus;
  compatible: boolean;
  reusable: boolean;
  protected: boolean;
  reasons: string[];
  recommendedAction:
    | "use"
    | "use-with-notice"
    | "refresh"
    | "review"
    | "ignore"
    | "preserve";
}

export interface DjSourceFingerprintHints {
  duration?: unknown;
  sampleRate?: unknown;
  channelCount?: unknown;
  numberOfChannels?: unknown;
  codec?: unknown;
}

const REGION_BYTES = 64 * 1024;
const MAX_FINGERPRINT_BYTES = REGION_BYTES * 3;

function finiteOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function stableRecord(value: Record<string, unknown>): string {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [
          key,
          entry && typeof entry === "object" && !Array.isArray(entry)
            ? JSON.parse(stableRecord(entry as Record<string, unknown>))
            : entry,
        ]),
    ),
  );
}

function sha256(value: string | Buffer): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function normaliseDjSourcePathIdentity(filePath: string, platform = process.platform): string {
  let resolved = path.resolve(String(filePath || "")).replace(/\\/g, "/");
  resolved = resolved.replace(/\/+/g, "/");
  if (platform === "win32" || /^[a-z]:\//i.test(resolved)) resolved = resolved.toLowerCase();
  return resolved;
}

function readBoundedRegions(filePath: string, size: number): { digest: string; bytesRead: number } {
  const handle = fs.openSync(filePath, "r");
  const hash = crypto.createHash("sha256");
  let bytesRead = 0;
  try {
    const starts = size <= MAX_FINGERPRINT_BYTES
      ? [0]
      : [0, Math.max(0, Math.floor((size - REGION_BYTES) / 2)), Math.max(0, size - REGION_BYTES)];
    for (const start of Array.from(new Set(starts))) {
      const length = size <= MAX_FINGERPRINT_BYTES
        ? Math.min(size, MAX_FINGERPRINT_BYTES)
        : Math.min(REGION_BYTES, Math.max(0, size - start));
      if (!length) continue;
      const buffer = Buffer.allocUnsafe(length);
      const read = fs.readSync(handle, buffer, 0, length, start);
      hash.update(Buffer.from(`${start}:${read}:`));
      hash.update(buffer.subarray(0, read));
      bytesRead += read;
    }
  } finally {
    fs.closeSync(handle);
  }
  return { digest: hash.digest("hex"), bytesRead };
}

export function createDjSourceFingerprint(
  filePath: string,
  hints: DjSourceFingerprintHints = {},
): { status: "ok"; fingerprint: DjSourceFingerprint } | { status: "missing"; reason: string } {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) return { status: "missing", reason: "source-file-missing" };

  let stat: fs.Stats;
  try {
    stat = fs.statSync(resolved);
  } catch {
    return { status: "missing", reason: "source-file-unreadable" };
  }
  if (!stat.isFile()) return { status: "missing", reason: "source-is-not-a-file" };

  const pathIdentity = normaliseDjSourcePathIdentity(
    (() => {
      try {
        return fs.realpathSync.native(resolved);
      } catch {
        return resolved;
      }
    })(),
  );
  const content = readBoundedRegions(resolved, stat.size);
  const extension = path.extname(resolved).toLowerCase().replace(/^\./, "");
  const duration = finiteOrNull(hints.duration);
  const sampleRate = finiteOrNull(hints.sampleRate);
  const channelCount = finiteOrNull(hints.channelCount ?? hints.numberOfChannels);
  const codec = String(hints.codec || "").trim().toLowerCase();
  const modifiedAtMs = Number(stat.mtimeMs.toFixed(3));
  const identity = {
    version: DJ_SOURCE_FINGERPRINT_VERSION,
    pathIdentity,
    sourceSize: stat.size,
    modifiedAtMs,
    extension,
    duration,
    sampleRate,
    channelCount,
    codec,
    contentFingerprint: content.digest,
  } as const;

  return {
    status: "ok",
    fingerprint: {
      ...identity,
      value: sha256(stableRecord(identity)),
      bytesRead: content.bytesRead,
    },
  };
}

const IMPLEMENTATION_COMPONENTS: Record<DjPreparedAssetType, readonly (keyof typeof DJ_IMPLEMENTATION_VERSIONS)[]> = {
  "prepared-waveform": ["preparedWaveformFormat", "peakAverageExtraction"],
  "waveform-detail": ["waveformDetailExtraction", "transientExtraction"],
  "prepared-analysis": ["preparedAnalysisExtraction", "waveformDetailExtraction", "transientExtraction"],
  "spectral-bands": ["preparedWaveformFormat", "spectralWaveformExtraction", "peakAverageExtraction"],
  "transient-data": ["transientExtraction", "spectralWaveformExtraction"],
  "bpm-analysis": ["bpmAnalysis", "transientExtraction", "digitalTempoLock"],
  "beat-detection": ["beatDetection", "confidenceEngine"],
  "grid-validation": ["gridValidation", "confidenceEngine"],
  "final-grid-decision": ["finalGridDecision", "confidenceEngine"],
  "downbeat-analysis": ["downbeatBarAnalysis"],
  "dynamic-analysis": ["dynamicAnalysis"],
  "analysis-classification": ["normalAnalysis", "autoClassification"],
  "beat-grid": ["gridSchema", "gridCore"],
  "manual-grid": ["gridSchema", "gridCore"],
  "cue-memory": ["gridSchema"],
  stems: [],
};

export function createDjImplementationFingerprint(
  assetType: DjPreparedAssetType,
  versions: Readonly<Record<string, string>> = DJ_IMPLEMENTATION_VERSIONS,
): DjImplementationFingerprint {
  const components = Object.fromEntries(
    IMPLEMENTATION_COMPONENTS[assetType].map((key) => [key, String(versions[key] || "")]),
  );
  return {
    assetType,
    version: 1,
    value: sha256(stableRecord({ assetType, components })),
    components,
  };
}

export function createDjPreparedAssetMetadata(input: {
  assetType: DjPreparedAssetType;
  assetFormatVersion: string;
  sourceFingerprint: DjSourceFingerprint;
  generator: string;
  duration?: unknown;
  sampleRate?: unknown;
  channelCount?: unknown;
  parentFingerprint?: string;
  manual?: boolean;
  locked?: boolean;
  now?: string;
  createdAt?: string;
}): DjPreparedAssetMetadata {
  const now = input.now || new Date().toISOString();
  return {
    metadataVersion: DJ_PREPARED_ASSET_METADATA_VERSION,
    assetType: input.assetType,
    assetFormatVersion: input.assetFormatVersion,
    sourceFingerprint: input.sourceFingerprint,
    implementationFingerprint: createDjImplementationFingerprint(input.assetType),
    createdAt: input.createdAt || now,
    updatedAt: now,
    generator: input.generator,
    duration: finiteOrNull(input.duration) ?? input.sourceFingerprint.duration,
    sampleRate: finiteOrNull(input.sampleRate) ?? input.sourceFingerprint.sampleRate,
    channelCount: finiteOrNull(input.channelCount) ?? input.sourceFingerprint.channelCount,
    sourceSize: input.sourceFingerprint.sourceSize,
    compatibilityStatus: "compatible",
    ...(input.parentFingerprint ? { parentFingerprint: input.parentFingerprint } : {}),
    ...(input.manual ? { manual: true } : {}),
    ...(input.locked ? { locked: true } : {}),
  };
}

export function validateDjPreparedAsset(
  metadata: unknown,
  input: {
    assetType: DjPreparedAssetType;
    sourceFingerprint?: DjSourceFingerprint | null;
    assetFormatVersion?: string;
    legacySafe?: boolean;
    corrupt?: boolean;
    manual?: boolean;
    locked?: boolean;
    implementationVersions?: Readonly<Record<string, string>>;
  },
): DjCompatibilityResult {
  const result = (
    status: DjCompatibilityStatus,
    reasons: string[],
    recommendedAction: DjCompatibilityResult["recommendedAction"],
    reusable = false,
  ): DjCompatibilityResult => ({
    status,
    compatible: status === "compatible" || status === "legacy-compatible",
    reusable,
    protected: status === "manual-protected" || status === "locked-protected",
    reasons,
    recommendedAction,
  });

  if (input.locked) return result("locked-protected", ["grid-is-locked"], "preserve", true);
  if (input.manual) return result("manual-protected", ["grid-has-manual-corrections"], "preserve", true);
  if (input.corrupt) return result("corrupt", ["asset-payload-invalid"], "ignore");
  if (!metadata) {
    return input.legacySafe
      ? result("legacy-compatible", ["metadata-missing-but-legacy-key-and-payload-match"], "use-with-notice", true)
      : result("missing", ["asset-metadata-missing"], "refresh");
  }
  if (typeof metadata !== "object") return result("corrupt", ["asset-metadata-not-an-object"], "ignore");

  const value = metadata as Partial<DjPreparedAssetMetadata>;
  if (Number(value.metadataVersion) > DJ_PREPARED_ASSET_METADATA_VERSION) {
    return result("unknown-version", ["metadata-version-is-newer"], "review");
  }
  if (value.metadataVersion !== DJ_PREPARED_ASSET_METADATA_VERSION) {
    return result("unknown-version", ["metadata-version-unsupported"], "review");
  }
  if (
    value.assetType !== input.assetType ||
    !value.sourceFingerprint?.value ||
    !value.implementationFingerprint?.value
  ) {
    return result("incomplete", ["required-fingerprint-fields-missing"], "refresh");
  }
  if (input.sourceFingerprint && value.sourceFingerprint.value !== input.sourceFingerprint.value) {
    return result("stale-source", ["source-fingerprint-changed"], "refresh");
  }
  if (input.assetFormatVersion && value.assetFormatVersion !== input.assetFormatVersion) {
    return result("stale-implementation", ["asset-format-version-changed"], "refresh");
  }

  const expected = createDjImplementationFingerprint(
    input.assetType,
    input.implementationVersions || DJ_IMPLEMENTATION_VERSIONS,
  );
  if (value.implementationFingerprint.version > expected.version) {
    return result("unknown-version", ["implementation-fingerprint-is-newer"], "review");
  }
  if (value.implementationFingerprint.value !== expected.value) {
    return result("stale-implementation", ["implementation-fingerprint-changed"], "refresh");
  }
  return result("compatible", [], "use", true);
}

export function writeDjPreparedAssetJsonAtomically(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.${crypto.randomBytes(4).toString("hex")}.tmp`;
  try {
    const handle = fs.openSync(temporaryPath, "wx");
    try {
      fs.writeFileSync(handle, `${JSON.stringify(value, null, 2)}\n`, "utf8");
      fs.fsyncSync(handle);
    } finally {
      fs.closeSync(handle);
    }
    fs.renameSync(temporaryPath, filePath);
  } finally {
    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
  }
}
