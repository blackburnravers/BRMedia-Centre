import fs from "node:fs";
import path from "node:path";
import {
  getLibraryItem,
  listLibrary,
  persistAudioLibraryManifest,
  saveAudioLibraryDjPrep,
  type LibraryItem,
} from "./db/library";
import {
  DEFAULT_WAVEFORM_PEAKS,
  deleteWaveformCacheForFile,
  getCachedWaveform,
  getWaveformPreparedAssetRegistration,
  hasValidWaveformCache,
} from "./waveforms";
import { writeDjPreparedAssetJsonAtomically } from "./djPreparedAssets";

export const DJ_ANALYSIS_GENERATION = "brmedia-analysis-m10-v1";
export const DJ_ANALYSIS_QUEUE_SCHEMA = 1;
export const DJ_ANALYSIS_PRODUCTION_APPROVAL = "M9_FULL_CATALOGUE_APPROVED";

export type DjAnalysisQueueItemStatus =
  | "queued"
  | "analysing"
  | "preparing-waveform"
  | "prepared"
  | "review-required"
  | "failed"
  | "cancelled";

export type DjAnalysisQueueItem = {
  trackId: string;
  title: string;
  status: DjAnalysisQueueItemStatus;
  progressPercent: number;
  stage: string;
  force: boolean;
  attempts: number;
  error: string | null;
  reasonCodes: string[];
  queuedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  analysisVersion: string;
};

type PersistedQueue = {
  schemaVersion: number;
  analysisVersion: string;
  status: "idle" | "running" | "paused";
  updatedAt: string;
  items: DjAnalysisQueueItem[];
};

type QueueDriver = {
  getTrack(id: string): LibraryItem | undefined;
  listTracks(): LibraryItem[];
  analyse(track: LibraryItem, force: boolean, onProgress: (percent: number) => void): Promise<{
    reviewRequired: boolean;
    reasonCodes: string[];
  }>;
};

const QUEUE_PATH = path.resolve(__dirname, "..", "data", "dj-analysis-queue.json");

function cleanText(value: unknown, limit = 500) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, limit);
}

function atomicWrite(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  writeDjPreparedAssetJsonAtomically(filePath, value);
}

export function isCurrentAnalysis(item: LibraryItem) {
  return (item as any).djAnalysisVersion === DJ_ANALYSIS_GENERATION &&
    item.djWaveformPrepared === true &&
    item.djWaveformAsset?.reusable === true &&
    (item as any).djAnalysisStatus === "prepared" &&
    Number((item as any).djAnalysisConfidence || 0) >= 0.72;
}

export function isEligibleAnalysisTrack(item: LibraryItem) {
  const duration = Number(item.duration);
  return item.source === "local" &&
    item.sourceOnline !== false &&
    fs.existsSync(item.locator) &&
    Number.isFinite(duration) &&
    duration > 0 &&
    duration < 15 * 60;
}

async function analyseTrack(
  track: LibraryItem,
  force: boolean,
  onProgress: (percent: number) => void
) {
  if (!isEligibleAnalysisTrack(track)) throw new Error("Track is not eligible for DJ analysis");
  if (track.djGridLocked) throw new Error("Locked grid is protected and requires manual review");

  const refreshPreparedAssets = force || !hasValidWaveformCache(track.locator, DEFAULT_WAVEFORM_PEAKS);
  if (refreshPreparedAssets) deleteWaveformCacheForFile(track.locator);
  onProgress(2);
  const waveform = await getCachedWaveform(track.locator, DEFAULT_WAVEFORM_PEAKS, {
    force: refreshPreparedAssets,
    onProgress: (percent) => onProgress(Math.max(3, Math.min(88, Math.round(percent * 0.86)))),
  });
  onProgress(90);

  if (!hasValidWaveformCache(track.locator, DEFAULT_WAVEFORM_PEAKS) || !waveform.analysis) {
    deleteWaveformCacheForFile(track.locator);
    throw new Error("Generated waveform failed post-write validation");
  }

  const analysis = waveform.analysis;
  const bpm = analysis.bpmAnalysis;
  const downbeat = analysis.downbeatAnalysis;
  const dynamic = analysis.dynamicAnalysis;
  const decision = analysis.finalGridDecision;
  const recommendation = decision?.recommendation;
  const reviewReasons = Array.from(new Set([
    ...(bpm?.reasonCodes || []),
    ...(downbeat?.reasonCodes || []),
    ...(dynamic?.reasonCodes || []),
    ...(decision?.reasonCodes || []),
    ...(analysis.keyAnalysis?.reasonCodes || []),
  ])).slice(0, 32);
  const keyAnalysisUnavailable = !analysis.keyAnalysis?.key || analysis.keyAnalysis.reviewRequired;
  const reviewRequired = Boolean(
    !bpm?.bpm ||
    !recommendation ||
    decision?.reviewRequired ||
    dynamic?.reviewRequired ||
    !Number.isFinite(Number(downbeat?.gridAnchorTime)) ||
    keyAnalysisUnavailable
  );
  const waveformAsset = getWaveformPreparedAssetRegistration(track.locator, DEFAULT_WAVEFORM_PEAKS);

  const saved = saveAudioLibraryDjPrep(track.id, {
    version: 2,
    analysisMode: "auto",
    resolvedMode: recommendation?.analysisMode || dynamic?.resolvedMode || "normal",
    bpm: bpm?.bpm,
    rawBpm: bpm?.bpm,
    downbeat: recommendation?.downbeatTime ?? downbeat?.gridAnchorTime ?? 0,
    segments: recommendation?.segments || dynamic?.segments || [],
    editRange: "whole",
    adjustmentMs: 1,
    reviewRequired,
    baseSet: Boolean(bpm?.bpm),
    locked: false,
    source: DJ_ANALYSIS_GENERATION,
    tempoConfidence: decision?.finalConfidence ?? bpm?.confidence ?? 0,
    tempoCandidates: bpm?.candidates || [],
    waveformPrepared: true,
    waveformPeakCount: DEFAULT_WAVEFORM_PEAKS,
    waveformAsset,
    analysisVersion: DJ_ANALYSIS_GENERATION,
    analysisStatus: reviewRequired ? "review-required" : "prepared",
    analysisReasonCodes: reviewReasons,
    analysisConfidence: decision?.finalConfidence ?? bpm?.confidence ?? 0,
    keyAnalysis: {
      key: analysis.keyAnalysis?.key || null,
      confidence: analysis.keyAnalysis?.confidence ?? 0,
      source: "verified-chroma",
      version: analysis.keyAnalysis?.version || DJ_ANALYSIS_GENERATION,
      reviewRequired: keyAnalysisUnavailable,
    },
    analysedAt: bpm?.analysedAt || new Date().toISOString(),
  } as any);
  if (!saved) throw new Error("Track disappeared while saving analysis");
  Object.assign(saved as any, {
    djAnalysisVersion: DJ_ANALYSIS_GENERATION,
    djAnalysisStatus: reviewRequired ? "review-required" : "prepared",
    djAnalysisReasonCodes: reviewReasons,
    djAnalysisConfidence: decision?.finalConfidence ?? bpm?.confidence ?? 0,
    djAnalysisAnalysedAt: bpm?.analysedAt || new Date().toISOString(),
    djKeyAnalysis: {
      key: analysis.keyAnalysis?.key || null,
      confidence: analysis.keyAnalysis?.confidence ?? 0,
      source: "verified-chroma",
      version: analysis.keyAnalysis?.version || DJ_ANALYSIS_GENERATION,
      reviewRequired: keyAnalysisUnavailable,
    },
    djRefinementDiagnostics: analysis.m10Refinement || null,
  });
  persistAudioLibraryManifest();
  onProgress(100);
  return { reviewRequired, reasonCodes: reviewReasons };
}

const defaultDriver: QueueDriver = {
  getTrack: getLibraryItem,
  listTracks: listLibrary,
  analyse: analyseTrack,
};

export class DjAnalysisQueue {
  private state: PersistedQueue;
  private processing = false;
  private persistTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly filePath = QUEUE_PATH,
    private readonly driver: QueueDriver = defaultDriver,
    autoRecover = true
  ) {
    this.state = this.load();
    const interrupted = this.state.items.filter((item) =>
      item.status === "analysing" || item.status === "preparing-waveform"
    );
    for (const item of interrupted) {
      item.status = "queued";
      item.stage = "Recovered after restart";
      item.progressPercent = 0;
      item.error = null;
    }
    if (interrupted.length) this.persistNow();
    if (autoRecover && this.state.status === "running" && this.pendingCount()) {
      setImmediate(() => void this.pump());
    }
  }

  private load(): PersistedQueue {
    const empty: PersistedQueue = {
      schemaVersion: DJ_ANALYSIS_QUEUE_SCHEMA,
      analysisVersion: DJ_ANALYSIS_GENERATION,
      status: "idle",
      updatedAt: new Date().toISOString(),
      items: [],
    };
    if (!fs.existsSync(this.filePath)) return empty;
    try {
      const parsed = JSON.parse(fs.readFileSync(this.filePath, "utf8")) as PersistedQueue;
      if (parsed.schemaVersion !== DJ_ANALYSIS_QUEUE_SCHEMA || !Array.isArray(parsed.items)) return empty;
      return {
        ...empty,
        ...parsed,
        analysisVersion: DJ_ANALYSIS_GENERATION,
        items: parsed.items.filter((item) => item?.trackId).map((item) => ({ ...item })),
      };
    } catch {
      return empty;
    }
  }

  private persistSoon() {
    if (this.persistTimer) return;
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      this.persistNow();
    }, 150);
  }

  private persistNow() {
    this.state.updatedAt = new Date().toISOString();
    atomicWrite(this.filePath, this.state);
  }

  private pendingCount() {
    return this.state.items.filter((item) => item.status === "queued").length;
  }

  snapshot() {
    const items = this.state.items.map((item) => ({ ...item, reasonCodes: [...item.reasonCodes] }));
    const count = (status: DjAnalysisQueueItemStatus) => items.filter((item) => item.status === status).length;
    const active = items.find((item) => item.status === "analysing" || item.status === "preparing-waveform") || null;
    const completed = count("prepared") + count("review-required");
    return {
      schemaVersion: DJ_ANALYSIS_QUEUE_SCHEMA,
      analysisVersion: DJ_ANALYSIS_GENERATION,
      status: this.state.status,
      concurrency: 1,
      updatedAt: this.state.updatedAt,
      totals: {
        total: items.length,
        pending: count("queued"),
        analysing: count("analysing") + count("preparing-waveform"),
        prepared: count("prepared"),
        reviewRequired: count("review-required"),
        failed: count("failed"),
        cancelled: count("cancelled"),
        completed,
      },
      progressPercent: items.length ? Math.round((completed + count("failed") + count("cancelled")) / items.length * 100) : 0,
      activeTrack: active,
      items,
    };
  }

  enqueue(trackIds: string[], options: { force?: boolean } = {}) {
    const force = options.force === true;
    const unique = Array.from(new Set(trackIds.map((id) => cleanText(id, 128)).filter(Boolean)));
    let added = 0;
    let skipped = 0;
    for (const id of unique) {
      const track = this.driver.getTrack(id);
      if (!track || !isEligibleAnalysisTrack(track)) {
        skipped += 1;
        continue;
      }
      const existing = this.state.items.find((item) => item.trackId === id);
      if (existing && ["queued", "analysing", "preparing-waveform"].includes(existing.status)) {
        skipped += 1;
        continue;
      }
      if (!force && isCurrentAnalysis(track)) {
        skipped += 1;
        continue;
      }
      const next: DjAnalysisQueueItem = {
        trackId: id,
        title: cleanText(track.title, 180) || id,
        status: "queued",
        progressPercent: 0,
        stage: "Queued",
        force,
        attempts: existing?.attempts || 0,
        error: null,
        reasonCodes: [],
        queuedAt: new Date().toISOString(),
        startedAt: null,
        finishedAt: null,
        analysisVersion: DJ_ANALYSIS_GENERATION,
      };
      if (existing) Object.assign(existing, next);
      else this.state.items.push(next);
      added += 1;
    }
    this.persistNow();
    return { added, skipped, snapshot: this.snapshot() };
  }

  enqueueAll(options: { force?: boolean } = {}) {
    return this.enqueue(this.driver.listTracks().map((track) => track.id), options);
  }

  retry(kind: "failed" | "review-required") {
    const ids = this.state.items.filter((item) =>
      kind === "failed" ? item.status === "failed" : item.status === "review-required"
    ).map((item) => item.trackId);
    return this.enqueue(ids, { force: true });
  }

  start() {
    if (!this.pendingCount()) return this.snapshot();
    this.state.status = "running";
    this.persistNow();
    void this.pump();
    return this.snapshot();
  }

  pause() {
    this.state.status = "paused";
    this.persistNow();
    return this.snapshot();
  }

  resume() {
    this.state.status = "running";
    this.persistNow();
    void this.pump();
    return this.snapshot();
  }

  cancelPending() {
    const now = new Date().toISOString();
    let cancelled = 0;
    for (const item of this.state.items) {
      if (item.status !== "queued") continue;
      item.status = "cancelled";
      item.stage = "Cancelled before processing";
      item.finishedAt = now;
      cancelled += 1;
    }
    if (!this.processing) this.state.status = "idle";
    this.persistNow();
    return { cancelled, snapshot: this.snapshot() };
  }

  private async pump() {
    if (this.processing) return;
    this.processing = true;
    try {
      while (this.state.status === "running") {
        const item = this.state.items.find((entry) => entry.status === "queued");
        if (!item) break;
        const track = this.driver.getTrack(item.trackId);
        if (!track) {
          item.status = "failed";
          item.error = "Track no longer exists";
          item.stage = "Failed";
          item.finishedAt = new Date().toISOString();
          this.persistNow();
          continue;
        }
        item.status = "analysing";
        item.stage = "Decoding and analysing";
        item.startedAt = new Date().toISOString();
        item.attempts += 1;
        this.persistNow();
        try {
          const result = await this.driver.analyse(track, item.force, (percent) => {
            item.status = percent >= 88 ? "preparing-waveform" : "analysing";
            item.stage = percent >= 88 ? "Validating and persisting" : "Decoding and analysing";
            item.progressPercent = Math.max(item.progressPercent, Math.min(100, Math.floor(percent)));
            this.persistSoon();
          });
          item.status = result.reviewRequired ? "review-required" : "prepared";
          item.reasonCodes = result.reasonCodes.slice(0, 32);
          item.stage = result.reviewRequired ? "Review Required" : "Prepared";
          item.progressPercent = 100;
          item.error = null;
        } catch (error) {
          deleteWaveformCacheForFile(track.locator);
          item.status = "failed";
          item.stage = "Failed";
          item.progressPercent = 100;
          item.error = cleanText(error instanceof Error ? error.message : error, 500) || "Analysis failed";
        }
        item.finishedAt = new Date().toISOString();
        this.persistNow();
        if (this.snapshot().status === "paused") break;
      }
    } finally {
      this.processing = false;
      if (!this.pendingCount() && this.state.status === "running") {
        this.state.status = "idle";
        this.persistNow();
      }
    }
  }
}

export const djAnalysisQueue = new DjAnalysisQueue();
