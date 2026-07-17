import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import * as mm from "music-metadata";
import type { LibraryItem } from "./db/library";

type TracklistNameDetectTrackRef = {
  id: string;
  locator: string;
  title?: string;
};

type TracklistNameDetectRow = {
  number?: string;
  title?: string;
  timeText?: string;
  seconds?: number | null;
};

type TracklistNameDetectData = {
  tracks?: TracklistNameDetectRow[];
};

type LocalCandidate = {
  id: string;
  title: string;
  artist: string;
  displayTitle: string;
  locator: string;
  duration: number;
};

type AudioFeature = {
  rms: number;
  zcr: number;
  lowRatio: number;
  crest: number;
};

type NameSuggestion = {
  rowIndex: number;
  currentTitle: string;
  seconds: number;
  title: string;
  confidence: number;
  source: "local-library";
  method: "audio-signature";
  candidateId: string;
  candidateTitle: string;
  candidateArtist: string;
};

export type TracklistNameDetectJob = {
  id: string;
  trackId: string;
  title: string;
  status: "queued" | "running" | "done" | "failed";
  progressPercent: number;
  message: string;
  startedAt: string;
  finishedAt: string | null;
  error?: string;
  result?: {
    sourceKind: "hybrid-local";
    suggestions: NameSuggestion[];
    checkedCandidates: number;
    checkedRows: number;
  };
};

const NAME_DETECT_SAMPLE_RATE = 8000;
const NAME_DETECT_WINDOW_SECONDS = 2;
const NAME_DETECT_MIX_OFFSET_SECONDS = 18;
const NAME_DETECT_SNIPPET_SECONDS = 42;
const NAME_DETECT_CANDIDATE_SECONDS = 86;
const NAME_DETECT_CANDIDATE_LIMIT = 350;

const nameDetectJobs = new Map<string, TracklistNameDetectJob>();
const candidateSignatureCache = new Map<string, Promise<{ candidate: LocalCandidate; signatures: AudioFeature[][] }>>();

function createNameDetectJobId() {
  return `tnd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function resolveFfmpegPath() {
  const envPath = String(process.env.FFMPEG_PATH || "").trim();
  if (envPath) return envPath;

  const bundledPath = "C:\\ffmpeg-8.0.1\\bin\\ffmpeg.exe";
  if (fs.existsSync(bundledPath)) return bundledPath;

  return process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
}

function normaliseText(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function isUnknownTrackTitle(value: unknown) {
  const text = normaliseText(value).toLowerCase();
  if (!text) return true;
  return /^unknown\s+track\s+\d+/.test(text) || /^track\s+\d+$/.test(text);
}

function parseSecondsFromTimeText(raw: unknown) {
  const text = normaliseText(raw);
  const parts = text.split(":").map((part) => Number(part));
  if (!parts.length || parts.some((part) => !Number.isFinite(part))) return null;

  if (parts.length === 2) return (parts[0] * 60) + parts[1];
  if (parts.length === 3) return (parts[0] * 3600) + (parts[1] * 60) + parts[2];

  return null;
}

function firstString(value: any): string {
  if (Array.isArray(value)) {
    return normaliseText(value.find((item) => normaliseText(item)));
  }

  return normaliseText(value);
}

function looksLikeShortSong(duration: number) {
  return Number.isFinite(duration) && duration >= 25 && duration <= 900;
}

async function readLocalCandidate(item: LibraryItem): Promise<LocalCandidate | null> {
  try {
    if (!item?.locator || !fs.existsSync(item.locator)) return null;

    const meta = await mm.parseFile(item.locator, { duration: true });
    const duration = Number(meta.format?.duration || 0);
    if (!looksLikeShortSong(duration)) return null;

    const parsed = path.parse(item.locator);
    const title = firstString(meta.common?.title) || item.title || parsed.name;
    const artist = firstString(meta.common?.artist) || firstString(meta.common?.albumartist);
    const displayTitle = artist ? `${artist} - ${title}` : title;

    return {
      id: item.id,
      title,
      artist,
      displayTitle,
      locator: item.locator,
      duration,
    };
  } catch {
    return null;
  }
}

async function buildAudioSignature(filePath: string, startSec: number, durationSec: number): Promise<AudioFeature[]> {
  const samplesPerWindow = Math.max(1, Math.floor(NAME_DETECT_SAMPLE_RATE * NAME_DETECT_WINDOW_SECONDS));

  return await new Promise<AudioFeature[]>((resolve, reject) => {
    const features: AudioFeature[] = [];

    let sampleInWindow = 0;
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

    const lowPassAlpha = 0.04;

    function flushWindow() {
      if (sampleInWindow < Math.max(1, samplesPerWindow * 0.35)) return;

      const rms = Math.sqrt(sumSquares / sampleInWindow);
      const lowRms = Math.sqrt(lowSquares / sampleInWindow);
      const highRms = Math.sqrt(highSquares / sampleInWindow);
      const totalTone = lowRms + highRms;

      features.push({
        rms,
        zcr: zc / sampleInWindow,
        lowRatio: totalTone > 0 ? lowRms / totalTone : 0,
        crest: rms > 0 ? peak / rms : 0,
      });

      sampleInWindow = 0;
      sumSquares = 0;
      lowSquares = 0;
      highSquares = 0;
      zc = 0;
      peak = 0;
    }

    const ffmpeg = spawn(
      resolveFfmpegPath(),
      [
        "-v", "error",
        "-ss", String(Math.max(0, startSec || 0)),
        "-i", filePath,
        "-t", String(Math.max(8, durationSec || NAME_DETECT_SNIPPET_SECONDS)),
        "-ac", "1",
        "-ar", String(NAME_DETECT_SAMPLE_RATE),
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

        if (sampleInWindow >= samplesPerWindow) flushWindow();
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
      resolve(features);
    });
  });
}

function featureDistance(a: AudioFeature, b: AudioFeature) {
  const rmsDelta = Math.abs(Math.log10(a.rms + 0.000001) - Math.log10(b.rms + 0.000001));
  const zcrDelta = Math.abs(a.zcr - b.zcr);
  const toneDelta = Math.abs(a.lowRatio - b.lowRatio);
  const crestDelta = Math.abs(a.crest - b.crest);

  return (rmsDelta * 0.9) + (zcrDelta * 24) + (toneDelta * 1.9) + (crestDelta * 0.035);
}

function compareSignatures(mixSig: AudioFeature[], candidateSig: AudioFeature[]) {
  if (!mixSig.length || !candidateSig.length) return Number.POSITIVE_INFINITY;

  const sampleLength = Math.min(mixSig.length, candidateSig.length);
  if (sampleLength < 4) return Number.POSITIVE_INFINITY;

  let best = Number.POSITIVE_INFINITY;
  const maxOffset = Math.max(0, candidateSig.length - sampleLength);

  for (let offset = 0; offset <= maxOffset; offset += 1) {
    let total = 0;

    for (let i = 0; i < sampleLength; i += 1) {
      total += featureDistance(mixSig[i], candidateSig[offset + i]);
    }

    best = Math.min(best, total / sampleLength);
  }

  return best;
}

function confidenceFromDistance(distance: number) {
  if (!Number.isFinite(distance)) return 0;
  return clamp(Math.round(98 - (distance * 115)), 0, 98);
}

async function getCandidateSignatures(candidate: LocalCandidate) {
  const cacheKey = `${candidate.id}:${candidate.locator}:${Math.floor(candidate.duration)}`;

  if (candidateSignatureCache.has(cacheKey)) {
    return candidateSignatureCache.get(cacheKey)!;
  }

  const promise = (async () => {
    const starts = [8, 28, 55].filter((start) => start < Math.max(10, candidate.duration - 8));
    const signatures: AudioFeature[][] = [];

    for (const start of starts) {
      signatures.push(await buildAudioSignature(candidate.locator, start, Math.min(NAME_DETECT_CANDIDATE_SECONDS, Math.max(12, candidate.duration - start))));
    }

    return { candidate, signatures };
  })();

  candidateSignatureCache.set(cacheKey, promise);
  return promise;
}

async function buildLocalCandidates(library: LibraryItem[], currentTrackId: string) {
  const candidates: LocalCandidate[] = [];

  for (const item of library) {
    if (!item || item.id === currentTrackId) continue;
    if (item.source !== "local") continue;

    const candidate = await readLocalCandidate(item);
    if (!candidate) continue;

    candidates.push(candidate);

    if (candidates.length >= NAME_DETECT_CANDIDATE_LIMIT) break;
  }

  return candidates;
}

async function runNameDetection(
  track: TracklistNameDetectTrackRef,
  library: LibraryItem[],
  tracklistData: TracklistNameDetectData,
  onProgress: (percent: number, message?: string) => void
) {
  if (!fs.existsSync(track.locator)) {
    throw new Error("Mix audio file not found");
  }

  const rows = Array.isArray(tracklistData?.tracks) ? tracklistData.tracks : [];
  const targetRows = rows
    .map((row, rowIndex) => {
      const seconds = Number.isFinite(row?.seconds)
        ? Number(row.seconds)
        : parseSecondsFromTimeText(row?.timeText);

      return {
        row,
        rowIndex,
        seconds: Number(seconds),
        title: normaliseText(row?.title),
      };
    })
    .filter((row) => Number.isFinite(row.seconds) && row.seconds >= 0 && isUnknownTrackTitle(row.title));

  if (!targetRows.length) {
    return {
      sourceKind: "hybrid-local" as const,
      suggestions: [],
      checkedCandidates: 0,
      checkedRows: 0,
    };
  }

  onProgress(3, "Preparing local song candidates…");
  const candidates = await buildLocalCandidates(library, track.id);

  if (!candidates.length) {
    return {
      sourceKind: "hybrid-local" as const,
      suggestions: [],
      checkedCandidates: 0,
      checkedRows: targetRows.length,
    };
  }

  const suggestions: NameSuggestion[] = [];

  for (let rowIndex = 0; rowIndex < targetRows.length; rowIndex += 1) {
    const row = targetRows[rowIndex];
    const basePercent = 8 + Math.floor((rowIndex / targetRows.length) * 86);

    onProgress(basePercent, `Matching ${row.title || `row ${row.rowIndex + 1}`} against local songs…`);

    const mixStart = Math.max(0, row.seconds + NAME_DETECT_MIX_OFFSET_SECONDS);
    const mixSig = await buildAudioSignature(track.locator, mixStart, NAME_DETECT_SNIPPET_SECONDS);

    let best: {
      candidate: LocalCandidate;
      confidence: number;
      distance: number;
    } | null = null;

    for (const candidate of candidates) {
      try {
        const candidatePack = await getCandidateSignatures(candidate);

        for (const candidateSig of candidatePack.signatures) {
          const distance = compareSignatures(mixSig, candidateSig);
          const confidence = confidenceFromDistance(distance);

          if (!best || confidence > best.confidence) {
            best = {
              candidate,
              confidence,
              distance,
            };
          }
        }
      } catch {
        // Skip unreadable candidate files.
      }
    }

    if (best && best.confidence >= 58) {
      suggestions.push({
        rowIndex: row.rowIndex,
        currentTitle: row.title,
        seconds: row.seconds,
        title: best.candidate.displayTitle,
        confidence: best.confidence,
        source: "local-library",
        method: "audio-signature",
        candidateId: best.candidate.id,
        candidateTitle: best.candidate.title,
        candidateArtist: best.candidate.artist,
      });
    }
  }

  onProgress(100, `Found ${suggestions.length} possible local name match${suggestions.length === 1 ? "" : "es"}.`);

  return {
    sourceKind: "hybrid-local" as const,
    suggestions,
    checkedCandidates: candidates.length,
    checkedRows: targetRows.length,
  };
}

export function getTracklistNameDetectJob(jobId: string) {
  const job = nameDetectJobs.get(jobId);
  return job ? JSON.parse(JSON.stringify(job)) : null;
}

export function startTracklistNameDetectJob(
  track: TracklistNameDetectTrackRef,
  library: LibraryItem[],
  tracklistData: TracklistNameDetectData
) {
  const job: TracklistNameDetectJob = {
    id: createNameDetectJobId(),
    trackId: track.id,
    title: track.title || path.parse(track.locator).name,
    status: "queued",
    progressPercent: 0,
    message: "Queued name detection…",
    startedAt: new Date().toISOString(),
    finishedAt: null,
  };

  nameDetectJobs.set(job.id, job);

  setTimeout(() => {
    void (async () => {
      try {
        job.status = "running";
        job.progressPercent = 1;
        job.message = "Starting local name detection…";

        job.result = await runNameDetection(track, library, tracklistData, (percent, message) => {
          job.progressPercent = clamp(Math.floor(percent || 0), 0, 100);
          if (message) job.message = message;
        });

        job.status = "done";
        job.progressPercent = 100;
        job.message = `Done • ${job.result.suggestions.length} local suggestion${job.result.suggestions.length === 1 ? "" : "s"} found.`;
        job.finishedAt = new Date().toISOString();
      } catch (err: any) {
        job.status = "failed";
        job.error = String(err?.message || err);
        job.message = job.error || "Name detection failed.";
        job.finishedAt = new Date().toISOString();
      }
    })();
  }, 0);

  return getTracklistNameDetectJob(job.id)!;
}