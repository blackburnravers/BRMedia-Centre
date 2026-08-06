import fs from "node:fs";
import path from "node:path";
import { getLibraryItem, persistAudioLibraryManifest, saveAudioLibraryDjPrep, type LibraryItem } from "./db/library";
import { analysePreparedGridForFile, getExistingWaveformCache } from "./waveforms";
import { writeDjPreparedAssetJsonAtomically } from "./djPreparedAssets";

export const M25_GRID_CACHE_VERSION = "brmedia-grid-v2";
export const M25_GRID_ANALYSIS_VERSION = "brmedia-analysis-m10-v1";
const QUEUE_PATH = path.resolve(__dirname, "..", "data", "dj-grid-queue.json");

export type M25GridStatus = "grid-not-prepared" | "grid-ready" | "grid-needs-review" | "grid-locked" | "grid-cache-mismatch" | "grid-corrupt";
export type M25GridSegment = { id: string; startTime: number; startBeat: number; bpm: number; source?: string };
export type M25GridPayload = {
  cacheVersion: string; revision: number; status: M25GridStatus; bpm: number; rawBpm: number;
  downbeat: number; barLength: number; resolvedMode: "normal" | "dynamic"; segments: M25GridSegment[];
  locked: boolean; reviewRequired: boolean; source: string; updatedAt: number | null;
  analysisVersion: string; history: unknown[];
};

const finite = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : null;

export function readM25Grid(item: LibraryItem): { state: M25GridStatus; grid: M25GridPayload | null; error?: string } {
  if (!item.djGridBaseSet || finite(item.djGridBpm) === null) return { state: "grid-not-prepared", grid: null };
  if (![1, 2].includes(Number(item.djGridVersion || 1))) return { state: "grid-cache-mismatch", grid: null, error: "Unsupported grid cache version" };
  const segments = (Array.isArray(item.djGridSegments) ? item.djGridSegments : []).map((segment, index) => ({
    id: String(segment.id || `segment-${index + 1}`), startTime: Number(segment.startTime),
    startBeat: Number(segment.startBeat), bpm: Number(segment.bpm), source: String(segment.source || item.djGridSource || ""),
  }));
  if (!segments.length) segments.push({ id: "segment-1", startTime: Number(item.djGridDownbeat) || 0, startBeat: 0, bpm: Number(item.djGridBpm), source: item.djGridSource || "" });
  const corrupt = segments.some((segment, index) => !Number.isFinite(segment.startTime) || !Number.isFinite(segment.startBeat) ||
    !Number.isFinite(segment.bpm) || segment.bpm < 40 || segment.bpm > 260 || (index > 0 && segment.startTime <= segments[index - 1].startTime));
  if (corrupt) return { state: "grid-corrupt", grid: null, error: "Grid segments are corrupt or unordered" };
  for (let index = 1; index < segments.length; index += 1) {
    const previous = segments[index - 1];
    const expected = previous.startBeat + ((segments[index].startTime - previous.startTime) * previous.bpm) / 60;
    if (Math.abs(segments[index].startBeat - expected) > 0.02) return { state: "grid-corrupt", grid: null, error: "Dynamic grid phase is discontinuous" };
  }
  const locked = item.djGridLocked === true;
  const reviewRequired = item.djGridReviewRequired === true;
  const state: M25GridStatus = locked ? "grid-locked" : reviewRequired ? "grid-needs-review" : "grid-ready";
  return { state, grid: {
    cacheVersion: M25_GRID_CACHE_VERSION, revision: Math.max(1, Number((item as any).djGridRevision) || 1), status: state,
    bpm: Number(item.djGridBpm), rawBpm: Number(item.djGridRawBpm || item.djGridBpm), downbeat: Number(item.djGridDownbeat) || 0,
    barLength: 4, resolvedMode: segments.length > 1 || item.djGridResolvedMode === "dynamic" ? "dynamic" : "normal", segments,
    locked, reviewRequired, source: String(item.djGridSource || "saved"), updatedAt: finite(item.djGridUpdatedAt),
    analysisVersion: String((item as any).djAnalysisVersion || item.djGridSource || "legacy"),
    history: Array.isArray((item as any).djGridHistory) ? (item as any).djGridHistory.slice(-50) : [],
  }};
}

type JobState = "queued" | "preparing" | "ready" | "needs-review" | "failed";
export type M25GridJob = { id: string; trackId: string; state: JobState; progress: number; error: string | null; queuedAt: string; updatedAt: string };

export class M25GridQueue {
  private jobs: M25GridJob[] = [];
  private processing = false;
  constructor(private readonly filePath = QUEUE_PATH, private readonly lookup = getLibraryItem, autoRecover = true) {
    try { this.jobs = JSON.parse(fs.readFileSync(filePath, "utf8"))?.jobs || []; } catch {}
    this.jobs.forEach((job) => { if (job.state === "preparing") { job.state = "queued"; job.progress = 0; } });
    if (autoRecover && this.jobs.some((job) => job.state === "queued")) setImmediate(() => void this.pump());
  }
  private persist() { writeDjPreparedAssetJsonAtomically(this.filePath, { schemaVersion: 1, updatedAt: new Date().toISOString(), jobs: this.jobs.slice(-500) }); }
  snapshot(trackId?: string) {
    if (!trackId) return { concurrency: 1, jobs: this.jobs.map((job) => ({ ...job })) };
    for (let index = this.jobs.length - 1; index >= 0; index -= 1) if (this.jobs[index].trackId === trackId) return { ...this.jobs[index] };
    return null;
  }
  enqueue(trackId: string) {
    const active = this.jobs.find((job) => job.trackId === trackId && (job.state === "queued" || job.state === "preparing"));
    if (active) return { added: false, job: { ...active } };
    const now = new Date().toISOString();
    const job: M25GridJob = { id: `grid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, trackId, state: "queued", progress: 0, error: null, queuedAt: now, updatedAt: now };
    this.jobs.push(job); this.persist(); void this.pump(); return { added: true, job: { ...job } };
  }
  private async pump() {
    if (this.processing) return; this.processing = true;
    try {
      while (true) {
        const job = this.jobs.find((candidate) => candidate.state === "queued"); if (!job) break;
        job.state = "preparing"; job.progress = 10; job.updatedAt = new Date().toISOString(); this.persist();
        try {
          const item = this.lookup(job.trackId); if (!item) throw new Error("Track association no longer exists");
          const existing = readM25Grid(item); if (existing.grid) { job.state = existing.grid.reviewRequired ? "needs-review" : "ready"; job.progress = 100; }
          else {
            const waveform = getExistingWaveformCache(item.locator); if (!waveform) throw new Error("Prepare Waveform before preparing the grid");
            const analysis: any = waveform.analysis || await analysePreparedGridForFile(item.locator, (percent) => {
              job.progress = Math.max(10, Math.min(90, Math.round(Number(percent) || 0)));
              job.updatedAt = new Date().toISOString();
            });
            const recommendation = analysis?.finalGridDecision?.recommendation;
            const bpm = finite(recommendation?.bpm ?? analysis?.bpmAnalysis?.bpm);
            const downbeat = finite(recommendation?.downbeatTime ?? analysis?.downbeatAnalysis?.gridAnchorTime);
            const sourceSegments = recommendation?.segments || analysis?.dynamicAnalysis?.segments || [];
            if (!bpm || downbeat === null) throw new Error("Prepared analysis does not contain a reliable beat anchor");
            const reviewRequired = Boolean(analysis?.finalGridDecision?.reviewRequired || analysis?.dynamicAnalysis?.reviewRequired);
            const saved = saveAudioLibraryDjPrep(item.id, { version: 2, analysisMode: "auto", resolvedMode: sourceSegments.length > 1 ? "dynamic" : "normal",
              bpm, rawBpm: bpm, downbeat, segments: sourceSegments, editRange: "whole", adjustmentMs: 1, reviewRequired,
              baseSet: true, locked: false, source: M25_GRID_ANALYSIS_VERSION, tempoConfidence: analysis?.finalGridDecision?.finalConfidence ?? analysis?.bpmAnalysis?.confidence ?? 0 });
            if (!saved) throw new Error("Track disappeared while saving grid");
            (saved as any).djGridRevision = Math.max(1, Number((saved as any).djGridRevision) || 1);
            (saved as any).djGridHistory = Array.isArray((saved as any).djGridHistory) ? (saved as any).djGridHistory : [];
            persistAudioLibraryManifest(); job.state = reviewRequired ? "needs-review" : "ready"; job.progress = 100;
          }
          job.error = null;
        } catch (error) { job.state = "failed"; job.progress = 100; job.error = error instanceof Error ? error.message : "Grid preparation failed"; }
        job.updatedAt = new Date().toISOString(); this.persist();
      }
    } finally { this.processing = false; }
  }
}

export const m25GridQueue = new M25GridQueue();
