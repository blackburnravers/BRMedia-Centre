import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import * as mm from "music-metadata";

export type TracklistAutoScanMode = "soft" | "balanced" | "deep";

type AutoScanTrackRef = {
  id: string;
  locator: string;
  title?: string;
};

type ScanWindowFeature = {
  index: number;
  seconds: number;
  rms: number;
  zcr: number;
  lowRatio: number;
  crest: number;
};

type ScanCandidate = {
  seconds: number;
  score: number;
  confidence: number;
};

export type TracklistAutoScanJob = {
  id: string;
  trackId: string;
  title: string;
  mode: TracklistAutoScanMode;
  status: "queued" | "running" | "done" | "failed";
  progressPercent: number;
  message: string;
  startedAt: string;
  finishedAt: string | null;
  error?: string;
  result?: {
    sourceKind: "auto-audio";
    duration: number;
    mode: TracklistAutoScanMode;
    candidates: ScanCandidate[];
    data: {
      metaEntries: Array<{ label: string; value: string; icon?: string }>;
      description: string;
      tracks: Array<{
        number: string;
        title: string;
        timeText: string;
        seconds: number;
        confidence: number;
        source: "auto-audio";
      }>;
    };
  };
};

const AUTO_SCAN_SAMPLE_RATE = 8000;
const AUTO_SCAN_WINDOW_SECONDS = 4;
const autoScanJobs = new Map<string, TracklistAutoScanJob>();

function createAutoScanJobId() {
  return `ats_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function resolveFfmpegPath() {
  const envPath = String(process.env.FFMPEG_PATH || "").trim();
  if (envPath) return envPath;

  const bundledPath = "C:\\ffmpeg-8.0.1\\bin\\ffmpeg.exe";
  if (fs.existsSync(bundledPath)) return bundledPath;

  return process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function formatSecondsForTracklist(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;

  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function modeSettings(mode: TracklistAutoScanMode) {
  if (mode === "soft") {
    return { minGapSeconds: 150, zMultiplier: 1.35, maxCandidates: 35 };
  }

  if (mode === "deep") {
    return { minGapSeconds: 70, zMultiplier: 0.65, maxCandidates: 80 };
  }

  return { minGapSeconds: 105, zMultiplier: 0.95, maxCandidates: 55 };
}

function normaliseMode(raw: unknown): TracklistAutoScanMode {
  const mode = String(raw || "balanced").toLowerCase().trim();
  if (mode === "soft" || mode === "deep") return mode;
  return "balanced";
}

async function analyseAudioFeatures(
  filePath: string,
  duration: number,
  onProgress: (percent: number, message?: string) => void
): Promise<ScanWindowFeature[]> {
  const samplesPerWindow = Math.max(1, Math.floor(AUTO_SCAN_SAMPLE_RATE * AUTO_SCAN_WINDOW_SECONDS));

  return await new Promise<ScanWindowFeature[]>((resolve, reject) => {
    const windows: ScanWindowFeature[] = [];

    let sampleInWindow = 0;
    let windowIndex = 0;
    let sumSquares = 0;
    let lowSquares = 0;
    let highSquares = 0;
    let zc = 0;
    let peak = 0;
    let previousSample = 0;
    let hasPreviousSample = false;
    let low = 0;
    let leftover = Buffer.alloc(0);
    let stderr = "";
    let lastProgress = 0;

    const lowPassAlpha = 0.04;

    function flushWindow() {
      if (sampleInWindow < Math.max(1, samplesPerWindow * 0.35)) return;

      const rms = Math.sqrt(sumSquares / sampleInWindow);
      const lowRms = Math.sqrt(lowSquares / sampleInWindow);
      const highRms = Math.sqrt(highSquares / sampleInWindow);
      const totalTone = lowRms + highRms;

      windows.push({
        index: windowIndex,
        seconds: windowIndex * AUTO_SCAN_WINDOW_SECONDS,
        rms,
        zcr: zc / sampleInWindow,
        lowRatio: totalTone > 0 ? lowRms / totalTone : 0,
        crest: rms > 0 ? peak / rms : 0,
      });

      windowIndex += 1;
      sampleInWindow = 0;
      sumSquares = 0;
      lowSquares = 0;
      highSquares = 0;
      zc = 0;
      peak = 0;
    }

    function pushProgressFromWindows() {
      if (!duration) return;
      const seconds = windowIndex * AUTO_SCAN_WINDOW_SECONDS;
      const percent = clamp(Math.floor((seconds / duration) * 92), 1, 92);
      if (percent <= lastProgress) return;
      lastProgress = percent;
      onProgress(percent, `Analysing audio changes… ${percent}%`);
    }

    const ffmpeg = spawn(
      resolveFfmpegPath(),
      [
        "-v", "error",
        "-i", filePath,
        "-ac", "1",
        "-ar", String(AUTO_SCAN_SAMPLE_RATE),
        "-f", "f32le",
        "-",
      ],
      { stdio: ["ignore", "pipe", "pipe"] }
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
        const abs = Math.abs(sample);

        low += lowPassAlpha * (sample - low);
        const high = sample - low;

        sumSquares += sample * sample;
        lowSquares += low * low;
        highSquares += high * high;
        if (abs > peak) peak = abs;

        if (hasPreviousSample && ((sample >= 0 && previousSample < 0) || (sample < 0 && previousSample >= 0))) {
          zc += 1;
        }

        previousSample = sample;
        hasPreviousSample = true;
        sampleInWindow += 1;

        if (sampleInWindow >= samplesPerWindow) {
          flushWindow();
          pushProgressFromWindows();
        }
      }
    });

    ffmpeg.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    ffmpeg.on("error", (err: Error) => {
      reject(new Error(`FFmpeg failed to start: ${String(err?.message || err)}`));
    });

    ffmpeg.on("close", (code: number | null) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `FFmpeg exited with code ${String(code)}`));
        return;
      }

      flushWindow();
      onProgress(94, "Detecting likely track changes…");
      resolve(windows);
    });
  });
}

function scoreWindows(windows: ScanWindowFeature[], mode: TracklistAutoScanMode, duration: number): ScanCandidate[] {
  if (windows.length < 4) return [];

  const rawScores = windows.map((window, index) => {
    if (index === 0) return 0;
    const previous = windows[index - 1];
    const rmsDelta = Math.abs(Math.log10(window.rms + 0.000001) - Math.log10(previous.rms + 0.000001));
    const zcrDelta = Math.abs(window.zcr - previous.zcr);
    const toneDelta = Math.abs(window.lowRatio - previous.lowRatio);
    const crestDelta = Math.abs(window.crest - previous.crest);

    return (rmsDelta * 2.4) + (zcrDelta * 55) + (toneDelta * 3.2) + (crestDelta * 0.09);
  });

  const smoothed = rawScores.map((score, index) => {
    const prev = rawScores[index - 1] || 0;
    const next = rawScores[index + 1] || 0;
    return (prev * 0.25) + (score * 0.5) + (next * 0.25);
  });

  const usefulScores = smoothed.filter((score, index) => windows[index].seconds >= 20 && Number.isFinite(score));
  if (!usefulScores.length) return [];

  const average = usefulScores.reduce((sum, value) => sum + value, 0) / usefulScores.length;
  const variance = usefulScores.reduce((sum, value) => sum + ((value - average) ** 2), 0) / usefulScores.length;
  const std = Math.sqrt(variance);
  const settings = modeSettings(mode);
  const threshold = average + (std * settings.zMultiplier);

  const candidates: ScanCandidate[] = [];

  for (let i = 1; i < smoothed.length - 1; i += 1) {
    const seconds = windows[i].seconds;
    if (seconds < 20 || (duration && seconds > duration - 20)) continue;

    const score = smoothed[i];
    if (score < threshold) continue;
    if (score < smoothed[i - 1] || score < smoothed[i + 1]) continue;

    const previousAccepted = candidates[candidates.length - 1];
    const confidence = clamp(Math.round(58 + (((score - threshold) / Math.max(std, 0.000001)) * 18)), 55, 98);

    if (previousAccepted && seconds - previousAccepted.seconds < settings.minGapSeconds) {
      if (score > previousAccepted.score) {
        previousAccepted.seconds = seconds;
        previousAccepted.score = score;
        previousAccepted.confidence = confidence;
      }
      continue;
    }

    candidates.push({
      seconds,
      score,
      confidence,
    });
  }

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, settings.maxCandidates)
    .sort((a, b) => a.seconds - b.seconds);
}

async function runTracklistAutoScan(track: AutoScanTrackRef, mode: TracklistAutoScanMode, onProgress: (percent: number, message?: string) => void) {
  if (!fs.existsSync(track.locator)) {
    throw new Error("Audio file not found");
  }

  onProgress(1, "Reading audio metadata…");
  const meta = await mm.parseFile(track.locator, { duration: true });
  const duration = Math.max(0, Number(meta.format.duration || 0));

  const windows = await analyseAudioFeatures(track.locator, duration, onProgress);
  const candidates = scoreWindows(windows, mode, duration);

  const allCandidates: ScanCandidate[] = [
    { seconds: 0, score: 999, confidence: 100 },
    ...candidates.filter((candidate) => candidate.seconds > 3),
  ];

  const tracks = allCandidates.map((candidate, index) => ({
    number: String(index + 1),
    title: `Unknown Track ${String(index + 1).padStart(2, "0")}`,
    timeText: formatSecondsForTracklist(candidate.seconds),
    seconds: Math.max(0, Math.floor(candidate.seconds)),
    confidence: candidate.confidence,
    source: "auto-audio" as const,
  }));

  onProgress(100, `Auto scan found ${tracks.length} timestamp${tracks.length === 1 ? "" : "s"}.`);

  return {
    sourceKind: "auto-audio" as const,
    duration,
    mode,
    candidates: allCandidates,
    data: {
      metaEntries: [
        { label: "Title", value: track.title || path.parse(track.locator).name, icon: "fa-solid fa-compact-disc" },
      ],
      description: `Auto scan suggestion (${mode}). Review these timestamps, rename tracks, delete wrong guesses, then save.`,
      tracks,
    },
  };
}

export function getTracklistAutoScanJob(jobId: string) {
  const job = autoScanJobs.get(jobId);
  return job ? JSON.parse(JSON.stringify(job)) : null;
}

export function startTracklistAutoScanJob(track: AutoScanTrackRef, rawMode?: unknown) {
  const mode = normaliseMode(rawMode);
  const job: TracklistAutoScanJob = {
    id: createAutoScanJobId(),
    trackId: track.id,
    title: track.title || path.parse(track.locator).name,
    mode,
    status: "queued",
    progressPercent: 0,
    message: "Queued audio scan…",
    startedAt: new Date().toISOString(),
    finishedAt: null,
  };

  autoScanJobs.set(job.id, job);

  setTimeout(() => {
    void (async () => {
      try {
        job.status = "running";
        job.message = "Starting audio scan…";
        job.progressPercent = 1;

        job.result = await runTracklistAutoScan(track, mode, (percent, message) => {
          job.progressPercent = clamp(Math.floor(percent || 0), 0, 100);
          if (message) job.message = message;
        });

        job.status = "done";
        job.progressPercent = 100;
        job.message = `Done • ${job.result.data.tracks.length} timestamps suggested.`;
        job.finishedAt = new Date().toISOString();
      } catch (err: any) {
        job.status = "failed";
        job.error = String(err?.message || err);
        job.message = job.error || "Auto scan failed.";
        job.finishedAt = new Date().toISOString();
      }
    })();
  }, 0);

  return getTracklistAutoScanJob(job.id)!;
}