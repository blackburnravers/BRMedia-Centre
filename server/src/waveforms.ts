import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import * as mm from "music-metadata";
import { appendStatsEvent } from "./statsEvents";

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
  status: "running" | "done" | "done_with_errors";
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
const WAVEFORM_CACHE_VERSION = "multiband-v1";

export type WaveformBands = {
  low: number[];
  mid: number[];
  high: number[];
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

  return `${base}-${shortHash}.json`;
}

function getWaveformCachePath(filePath: string) {
  ensureDirSync(WAVEFORM_CACHE_DIR);
  return path.join(WAVEFORM_CACHE_DIR, safeWaveformCacheName(filePath));
}

export function deleteWaveformCacheForFile(filePath: string) {
  const cachePath = getWaveformCachePath(filePath);
  if (!fs.existsSync(cachePath)) return false;
  fs.unlinkSync(cachePath);
  return true;
}

function buildWaveformCacheKey(filePath: string, peakCount: number) {
  const stat = fs.statSync(filePath);
  return `${WAVEFORM_CACHE_VERSION}:${stat.size}:${stat.mtimeMs}:${peakCount}`;
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

  options.onProgress?.(0);

  return await new Promise<{ duration: number; peaks: number[]; bands: WaveformBands }>((resolve, reject) => {
    const peaks = new Array<number>(peakCount).fill(0);
    const lowPeaks = new Array<number>(peakCount).fill(0);
    const midPeaks = new Array<number>(peakCount).fill(0);
    const highPeaks = new Array<number>(peakCount).fill(0);

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

      resolve({
        duration,
        peaks: normalisePeaksAgainstMaximum(peaks, maximum),
        bands: {
          low: normalisePeaksAgainstMaximum(lowPeaks, maximum),
          mid: normalisePeaksAgainstMaximum(midPeaks, maximum),
          high: normalisePeaksAgainstMaximum(highPeaks, maximum),
        },
      });
    });
  });
}

export function normaliseWaveformPeakCount(input: unknown, fallback = DEFAULT_WAVEFORM_PEAKS) {
  const numeric = Number(input || fallback);
  return Math.max(64, Math.min(32768, Math.floor(numeric || fallback)));
}

export function hasValidWaveformCache(filePath: string, peakCount = DEFAULT_WAVEFORM_PEAKS) {
  const cachePath = getWaveformCachePath(filePath);
  if (!fs.existsSync(filePath) || !fs.existsSync(cachePath)) return false;

  try {
    const cached = JSON.parse(fs.readFileSync(cachePath, "utf8")) as {
      cacheKey?: string;
      peaks?: unknown[];
      bands?: {
        low?: unknown[];
        mid?: unknown[];
        high?: unknown[];
      };
    };

    return cached?.cacheKey === buildWaveformCacheKey(filePath, peakCount)
      && Array.isArray(cached?.peaks)
      && Array.isArray(cached?.bands?.low)
      && Array.isArray(cached?.bands?.mid)
      && Array.isArray(cached?.bands?.high);
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

  fs.writeFileSync(
    cachePath,
    JSON.stringify(
      {
        cacheKey,
        duration: Number(duration || 0),
        peaks: Array.isArray(peaks) ? peaks.map((value) => Number(value || 0)) : [],
        bands: normaliseWaveformBands(bands, peaks),
      },
      null,
      2
    ),
    "utf8"
  );

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
      const cached = JSON.parse(fs.readFileSync(cachePath, "utf8")) as {
        cacheKey?: string;
        duration?: number;
        peaks?: number[];
        bands?: WaveformBands;
      };

      if (
        cached?.cacheKey === cacheKey
        && Array.isArray(cached?.peaks)
        && Array.isArray(cached?.bands?.low)
        && Array.isArray(cached?.bands?.mid)
        && Array.isArray(cached?.bands?.high)
      ) {
        options.onProgress?.(100);

        return {
          duration: Number(cached.duration || 0),
          peaks: cached.peaks,
          bands: normaliseWaveformBands(cached.bands, cached.peaks),
          cached: true,
        };
      }
    } catch {
      // ignore bad cache and rebuild
    }
  }

  const generated = await generateWaveformPeaks(filePath, peakCount, {
    onProgress: options.onProgress,
  });

  fs.writeFileSync(
    cachePath,
    JSON.stringify(
      {
        cacheKey,
        duration: generated.duration,
        peaks: generated.peaks,
        bands: generated.bands,
      },
      null,
      2
    ),
    "utf8"
  );

  return {
    duration: generated.duration,
    peaks: generated.peaks,
    bands: generated.bands,
    cached: false,
  };
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
    status: "running",
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

  void runWaveformGenerationJob(job, refs, {
    peakCount,
    force,
    onlyMissing,
  });

  return cloneWaveformJob(job);
}

export function getWaveformJobSnapshot(jobId: string) {
  const job = waveformJobs.get(jobId);
  if (!job) return null;
  return cloneWaveformJob(job);
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