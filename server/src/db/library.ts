import fs from "node:fs";
import path from "node:path";
import { uid } from "../utils/uid";

export type LibraryItem = {
  id: string;
  title: string;
  source: "local";
  locator: string; // absolute path for local file
  mimeType?: string;
  sizeBytes?: number;

  artist?: string;
  album?: string;
  albumArtist?: string;
  genre?: string;
  comment?: string;
  year?: number | null;
  duration?: number;
  bitrate?: number | null;
  sampleRate?: number | null;
  numberOfChannels?: number | null;
  codec?: string;
  hasArtwork?: boolean;
  bpm?: number | null;
  key?: string;
  djGridVersion?: number;

  djGridAnalysisMode?:
    | "auto"
    | "normal"
    | "dynamic";

  djGridResolvedMode?:
    | "normal"
    | "dynamic";
  djGridBpm?: number | null;
  djGridRawBpm?: number | null;
  djGridDownbeat?: number;
  djGridBaseSet?: boolean;
  djGridLocked?: boolean;

  djGridSource?: string;

  djGridUpdatedAt?: number;

  djGridEditRange?:
    | "whole"
    | "from-here";

  djGridAdjustmentMs?:
    | 1
    | 3;

  djGridReviewRequired?:
    boolean;

  djGridSegments?: Array<{
    id: string;

    startTime: number;

    startBeat: number;

    bpm: number;

    source?: string;
  }>;
  djTempoConfidence?: number;

  djTempoCandidates?: Array<{
    bpm: number;
    score?: number;
    adjustedScore?: number;
  }>;

  djWaveformPrepared?: boolean;
  djWaveformPeakCount?: number;
  djWaveformUpdatedAt?: number;

  djPerformancePrepared?: boolean;
  djPerformanceBytes?: number;
  djPerformanceSourceBytes?: number;
  djPerformanceBitrateKbps?: number;
  djPerformanceVersion?: string;
  djPerformanceUpdatedAt?: number;
  sourceOnline?: boolean;
  sourceStatus?: "online" | "offline";
};

const library = new Map<string, LibraryItem>();

const AUDIO_LIBRARY_MANIFEST_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "data",
  "audio-library-manifest.json"
);

const HIDDEN_AUDIO_LIBRARY_MANIFEST_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "data",
  "audio-library-hidden.json"
);

const hiddenAudioLibrary = new Map<string, LibraryItem>();

let audioLibraryManifestWriteHold = 0;
let audioLibraryManifestDirty = false;

function normaliseAudioLocator(absPath: string) {
  return path.resolve(absPath).toLowerCase();
}

function ensureAudioLibraryManifestDir() {
  fs.mkdirSync(path.dirname(AUDIO_LIBRARY_MANIFEST_PATH), { recursive: true });
}

function persistHiddenAudioLibraryManifestNow() {
  try {
    ensureAudioLibraryManifestDir();

    fs.writeFileSync(
      HIDDEN_AUDIO_LIBRARY_MANIFEST_PATH,
      JSON.stringify(
        {
          version: 1,
          updatedAt: Date.now(),
          items: Array.from(hiddenAudioLibrary.values()),
        },
        null,
        2
      ),
      "utf8"
    );
  } catch {
    // Keep the active Player library usable if hidden-audio persistence fails.
  }
}

function persistAudioLibraryManifestNow() {
  try {
    ensureAudioLibraryManifestDir();

    fs.writeFileSync(
      AUDIO_LIBRARY_MANIFEST_PATH,
      JSON.stringify(
        {
          version: 1,
          updatedAt: Date.now(),
          items: Array.from(library.values()),
        },
        null,
        2
      ),
      "utf8"
    );

    audioLibraryManifestDirty = false;
  } catch {
    // Keep the in-memory Player library usable if disk persistence fails.
  }
}

function markAudioLibraryManifestDirty() {
  audioLibraryManifestDirty = true;

  if (audioLibraryManifestWriteHold > 0) {
    return;
  }

  persistAudioLibraryManifestNow();
}

export function persistAudioLibraryManifest() {
  markAudioLibraryManifestDirty();
}

function restoreHiddenAudioLibraryManifest() {
  try {
    if (!fs.existsSync(HIDDEN_AUDIO_LIBRARY_MANIFEST_PATH)) {
      return;
    }

    const raw = fs.readFileSync(HIDDEN_AUDIO_LIBRARY_MANIFEST_PATH, "utf8");
    const parsed = JSON.parse(raw);

    const items = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.items)
        ? parsed.items
        : [];

    let stale = 0;

    for (const entry of items) {
      const rawLocator = String(entry?.locator || "").trim();
      if (!entry?.id || !rawLocator) {
        stale += 1;
        continue;
      }

      const locator = path.resolve(rawLocator);
      if (!isSupportedAudioFile(locator)) {
        stale += 1;
        continue;
      }

      let sourceOnline = false;
      let sizeBytes = Number(entry.sizeBytes || 0) || undefined;

      try {
        if (fs.existsSync(locator)) {
          const stat = fs.statSync(locator);
          if (stat.isFile()) {
            sourceOnline = true;
            sizeBytes = stat.size;
          }
        }
      } catch {}

      hiddenAudioLibrary.set(String(entry.id), {
        ...entry,
        id: String(entry.id),
        source: "local",
        locator,
        mimeType: entry.mimeType || guessMimeType(locator),
        sizeBytes,
        sourceOnline,
        sourceStatus: sourceOnline ? "online" : "offline",
      });
    }

    if (stale > 0) {
      persistHiddenAudioLibraryManifestNow();
    }
  } catch {
    // Ignore a broken hidden-audio manifest. Active library recovery stays usable.
  }
}

function restoreAudioLibraryManifest() {
  try {
    if (!fs.existsSync(AUDIO_LIBRARY_MANIFEST_PATH)) {
      return;
    }

    const raw = fs.readFileSync(AUDIO_LIBRARY_MANIFEST_PATH, "utf8");
    const parsed = JSON.parse(raw);

    const items = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.items)
        ? parsed.items
        : [];

    let stale = 0;

    for (const entry of items) {
      const locator = path.resolve(String(entry?.locator || ""));

      if (!entry?.id || !locator || !isSupportedAudioFile(locator)) {
        stale += 1;
        continue;
      }

      if (isAudioLibraryLocatorHidden(locator)) {
        stale += 1;
        continue;
      }

      let sourceOnline = false;
      let sizeBytes = Number(entry.sizeBytes || 0) || undefined;

      try {
        if (fs.existsSync(locator)) {
          const stat = fs.statSync(locator);

          if (stat.isFile()) {
            sourceOnline = true;
            sizeBytes = stat.size;
          }
        }
      } catch {}

      library.set(String(entry.id), {
        ...entry,
        id: String(entry.id),
        source: "local",
        locator,
        mimeType: entry.mimeType || guessMimeType(locator),
        sizeBytes,
        sourceOnline,
        sourceStatus: sourceOnline ? "online" : "offline",
      });
    }

    if (stale > 0) {
      persistAudioLibraryManifestNow();
    }
  } catch {
    // Ignore a broken manifest. Automatic sync will quietly rebuild it.
  }
}

export function listLibrary(): LibraryItem[] {
  return Array.from(library.values());
}

export function getLibraryItem(id: string): LibraryItem | undefined {
  return library.get(id);
}

export function findLibraryItemByLocator(absPath: string): LibraryItem | undefined {
  const normalised = normaliseAudioLocator(absPath);

  return Array.from(library.values()).find(
    (item) => normaliseAudioLocator(item.locator) === normalised
  );
}

export function listHiddenAudioLibraryItems(): LibraryItem[] {
  return Array.from(hiddenAudioLibrary.values());
}

export function getHiddenAudioLibraryItem(id: string): LibraryItem | undefined {
  return hiddenAudioLibrary.get(id);
}

export function isAudioLibraryLocatorHidden(absPath: string): boolean {
  const normalised = normaliseAudioLocator(absPath);

  return Array.from(hiddenAudioLibrary.values()).some(
    (item) => normaliseAudioLocator(item.locator) === normalised
  );
}

export function hideLibraryItem(id: string): LibraryItem | undefined {
  const existing = library.get(id);
  if (!existing) return undefined;

  const sourceOnline = fs.existsSync(existing.locator);

  library.delete(id);
  hiddenAudioLibrary.set(id, {
    ...existing,
    sourceOnline,
    sourceStatus: sourceOnline ? "online" : "offline",
  });

  markAudioLibraryManifestDirty();
  persistHiddenAudioLibraryManifestNow();

  return hiddenAudioLibrary.get(id);
}

export async function restoreHiddenAudioLibraryItem(id: string): Promise<LibraryItem | undefined> {
  const hidden = hiddenAudioLibrary.get(id);
  if (!hidden || !hidden.locator || !fs.existsSync(hidden.locator)) return undefined;

  const existing = findLibraryItemByLocator(hidden.locator);
  if (existing) {
    hiddenAudioLibrary.delete(id);
    persistHiddenAudioLibraryManifestNow();
    return existing;
  }

  const stat = fs.statSync(hidden.locator);
  const restored: LibraryItem = {
    ...hidden,
    id,
    source: "local",
    mimeType: hidden.mimeType || guessMimeType(hidden.locator),
    sizeBytes: stat.isFile() ? stat.size : hidden.sizeBytes,
    sourceOnline: true,
    sourceStatus: "online",
  };

  hiddenAudioLibrary.delete(id);
  library.set(id, restored);
  persistHiddenAudioLibraryManifestNow();
  markAudioLibraryManifestDirty();

  await refreshAudioLibraryItemMetadata(restored);
  return restored;
}

export function isSupportedAudioFile(absPath: string): boolean {
  const ext = path.extname(absPath).toLowerCase();
  return [".mp3", ".wav", ".flac", ".m4a", ".aac", ".ogg"].includes(ext);
}

export function guessMimeType(absPath: string): string | undefined {
  const ext = path.extname(absPath).toLowerCase();

  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".wav") return "audio/wav";
  if (ext === ".flac") return "audio/flac";
  if (ext === ".m4a") return "audio/mp4";
  if (ext === ".aac") return "audio/aac";
  if (ext === ".ogg") return "audio/ogg";

  return undefined;
}

export function addLocalFileToLibrary(absPath: string, title?: string): LibraryItem {
  const resolved = path.resolve(absPath);
  const existing = findLibraryItemByLocator(resolved);
  if (existing) return existing;

  const stat = fs.statSync(resolved);
  const id = uid("trk");

  const fallbackName = path.parse(resolved).name.replace(/[_]+/g, " ").trim();

  const item: LibraryItem = {
    id,
    title: title ?? fallbackName,
    source: "local",
    locator: resolved,
    mimeType: guessMimeType(resolved),
    sizeBytes: stat.isFile() ? stat.size : undefined,
    sourceOnline: true,
    sourceStatus: "online",
  };

  library.set(id, item);
  markAudioLibraryManifestDirty();

  return item;
}

export function removeLibraryItem(id: string): LibraryItem | undefined {
  const existing = library.get(id);
  if (!existing) return undefined;

  library.delete(id);
  markAudioLibraryManifestDirty();

  return existing;
}

function firstMetadataString(value: unknown): string {
  if (Array.isArray(value)) {
    return String(value.find((item) => String(item || "").trim()) || "").trim();
  }

  return String(value || "").trim();
}

function firstMetadataNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function readAudioFileMetadataForLibrary(
  absPath: string,
  fallbackTitle?: string
) {
  const fallbackName = path
    .parse(absPath)
    .name
    .replace(/[_]+/g, " ")
    .trim();

  const fallback = fallbackTitle || fallbackName;

  try {
    const mm = await import("music-metadata");

    const metadata = await mm.parseFile(absPath, {
      duration: true,
    });

    const common = metadata.common || {};
    const format = metadata.format || {};

    const title =
      firstMetadataString(common.title) ||
      fallback;

    const artist =
      firstMetadataString(common.artist);

    const album =
      firstMetadataString(common.album);

    const albumArtist =
      firstMetadataString(common.albumartist);

    const genre =
      firstMetadataString(common.genre);

    const comment =
      firstMetadataString(common.comment);

    const year =
      firstMetadataNumber(
        common.year ||
        common.date
      );

    const bpm =
      firstMetadataNumber(
        (common as any).bpm ||
        (common as any).TBPM
      );

    const key =
      firstMetadataString(
        (common as any).key ||
        (common as any).initialkey
      );

    return {
      title,
      artist,
      album,
      albumArtist,
      genre,
      comment,
      year,
      duration:
        firstMetadataNumber(format.duration) ??
        undefined,
      bitrate:
        firstMetadataNumber(format.bitrate),
      sampleRate:
        firstMetadataNumber(format.sampleRate),
      numberOfChannels:
        firstMetadataNumber(
          format.numberOfChannels
        ),
      codec:
        firstMetadataString(format.codec),
      hasArtwork:
        Array.isArray(common.picture) &&
        common.picture.length > 0,
      bpm:
        bpm && bpm > 0
          ? bpm
          : null,
      key,
    };
  } catch {
    return {
      title: fallback,
      artist: "",
      album: "",
      albumArtist: "",
      genre: "",
      comment: "",
      year: null,
      duration: undefined,
      bitrate: null,
      sampleRate: null,
      numberOfChannels: null,
      codec: "",
      hasArtwork: false,
      bpm: null,
      key: "",
    };
  }
}

export async function refreshAudioLibraryItemMetadata(itemOrId: LibraryItem | string): Promise<LibraryItem | undefined> {
  const item = typeof itemOrId === "string" ? getLibraryItem(itemOrId) : itemOrId;
  if (!item || !item.locator || !fs.existsSync(item.locator)) return undefined;

  const meta = await readAudioFileMetadataForLibrary(item.locator, item.title);
  Object.assign(item as any, meta);
  markAudioLibraryManifestDirty();

  return item;
}

export function saveAudioLibraryDjPerformance(
  id: string,

  input: {
    prepared?: unknown;
    bytes?: unknown;
    sourceBytes?: unknown;
    bitrateKbps?: unknown;
    version?: unknown;
    updatedAt?: unknown;
  } = {}
): LibraryItem | undefined {
  const item =
    getLibraryItem(id);

  if (!item) {
    return undefined;
  }

  const bytes =
    Number(input.bytes);

  const sourceBytes =
    Number(input.sourceBytes);

  const bitrateKbps =
    Number(input.bitrateKbps);

  const updatedAt =
    Number(input.updatedAt);

  item.djPerformancePrepared =
    Boolean(input.prepared);

  item.djPerformanceBytes =
    Number.isFinite(bytes) &&
    bytes > 0
      ? bytes
      : 0;

  item.djPerformanceSourceBytes =
    Number.isFinite(
      sourceBytes
    ) &&
    sourceBytes > 0
      ? sourceBytes
      : item.sizeBytes || 0;

  item.djPerformanceBitrateKbps =
    Number.isFinite(
      bitrateKbps
    ) &&
    bitrateKbps > 0
      ? Math.round(
          bitrateKbps
        )
      : undefined;

  item.djPerformanceVersion =
    String(
      input.version || ""
    ).trim();

  item.djPerformanceUpdatedAt =
    Number.isFinite(updatedAt) &&
    updatedAt > 0
      ? updatedAt
      : Date.now();

  markAudioLibraryManifestDirty();

  return item;
}

export function saveAudioLibraryDjPrep(
  id: string,

  input: {
    version?: unknown;

    analysisMode?: unknown;

    resolvedMode?: unknown;

    bpm?: unknown;

    rawBpm?: unknown;

    downbeat?: unknown;

    segments?: unknown;

    editRange?: unknown;

    adjustmentMs?: unknown;

    reviewRequired?: unknown;

    baseSet?: unknown;

    locked?: unknown;

    unlock?: unknown;

    source?: unknown;
    tempoConfidence?: unknown;
    tempoCandidates?: unknown;
    waveformPrepared?: unknown;
    waveformPeakCount?: unknown;
  } = {}
): LibraryItem | undefined {
  const item = getLibraryItem(id);

  if (!item) {
    return undefined;
  }
	
  if (
    item.djGridLocked &&
    input.unlock !== true
  ) {
    const error: any =
      new Error(
        "Analysis Lock is on for this track"
      );

    error.code =
      "DJ_GRID_LOCKED";

    throw error;
  }

  const bpm = Number(input.bpm);
  const rawBpm = Number(input.rawBpm);
  const downbeat = Number(
    input.downbeat
  );
	
  item.djGridVersion =
    Number(
      input.version
    ) === 2
      ? 2
      : item.djGridVersion ||
        1;

  const analysisMode =
    String(
      input.analysisMode ||
      item.djGridAnalysisMode ||
      "auto"
    )
      .trim()
      .toLowerCase();

  item.djGridAnalysisMode =
    analysisMode ===
      "normal" ||
    analysisMode ===
      "dynamic"
      ? analysisMode
      : "auto";

  const resolvedMode =
    String(
      input.resolvedMode ||
      item.djGridResolvedMode ||
      "normal"
    )
      .trim()
      .toLowerCase();

  item.djGridResolvedMode =
    resolvedMode ===
    "dynamic"
      ? "dynamic"
      : "normal";

  item.djGridEditRange =
    String(
      input.editRange ||
      item.djGridEditRange ||
      "whole"
    )
      .trim()
      .toLowerCase() ===
    "from-here"
      ? "from-here"
      : "whole";

  item.djGridAdjustmentMs =
    Number(
      input.adjustmentMs
    ) === 3
      ? 3
      : 1;

  item.djGridReviewRequired =
    Boolean(
      input.reviewRequired
    );

  item.djGridBpm =
    Number.isFinite(bpm) &&
    bpm >= 40 &&
    bpm <= 260
      ? bpm
      : null;

  item.djGridRawBpm =
    Number.isFinite(rawBpm) &&
    rawBpm >= 40 &&
    rawBpm <= 260
      ? rawBpm
      : item.djGridBpm;

  item.djGridDownbeat =
    Number.isFinite(downbeat)
      ? Math.max(-8, downbeat)
      : 0;

  item.djGridBaseSet = Boolean(
    input.baseSet &&
    item.djGridBpm
  );

  item.djGridLocked =
    Boolean(input.locked);

  item.djGridSource =
    String(
      input.source ||
      "manual"
    ).trim() ||
    "manual";
		
  if (
    Array.isArray(
      input.segments
    )
  ) {
    item.djGridSegments =
      input.segments
        .map(
          (
            segment: any,
            index: number
          ) => ({
            id:
              String(
                segment?.id ||
                `segment-${index + 1}`
              )
                .trim()
                .slice(0, 64) ||
              `segment-${index + 1}`,

            startTime:
              Number(
                segment?.startTime
              ),

            startBeat:
              Number(
                segment?.startBeat
              ),

            bpm:
              Number(
                segment?.bpm
              ),

            source:
              String(
                segment?.source ||
                ""
              )
                .trim()
                .slice(0, 80),
          })
        )
        .filter(
          (segment) =>
            Number.isFinite(
              segment.startTime
            ) &&
            segment.startTime >= -8 &&
            Number.isFinite(
              segment.startBeat
            ) &&
            Number.isFinite(
              segment.bpm
            ) &&
            segment.bpm >= 40 &&
            segment.bpm <= 260
        )
        .sort(
          (left, right) =>
            left.startTime -
            right.startTime
        )
        .slice(0, 512);
  } else if (
    item.djGridBpm &&
    !Array.isArray(
      item.djGridSegments
    )
  ) {
    item.djGridSegments = [
      {
        id: "segment-1",

        startTime:
          item.djGridDownbeat ||
          0,

        startBeat: 0,

        bpm:
          item.djGridBpm,

        source:
          item.djGridSource,
      },
    ];
  }

  if (
    item.djGridSegments &&
    item.djGridSegments.length > 1
  ) {
    item.djGridResolvedMode =
      "dynamic";
  }

  item.djGridUpdatedAt =
    Date.now();

  const tempoConfidence =
    Number(input.tempoConfidence);

  item.djTempoConfidence =
    Number.isFinite(
      tempoConfidence
    )
      ? Math.max(
          0,
          Math.min(
            1,
            tempoConfidence
          )
        )
      : item.djTempoConfidence;

  if (
    Array.isArray(
      input.tempoCandidates
    )
  ) {
    item.djTempoCandidates =
      input.tempoCandidates
        .map((candidate: any) => ({
          bpm: Number(
            candidate?.bpm
          ),

          score: Number(
            candidate?.score
          ),

          adjustedScore: Number(
            candidate?.adjustedScore
          ),
        }))
        .filter((candidate) =>
          Number.isFinite(
            candidate.bpm
          )
        )
        .slice(0, 12);
  }

  if (
    input.waveformPrepared !==
    undefined
  ) {
    item.djWaveformPrepared =
      Boolean(
        input.waveformPrepared
      );
  }

  const waveformPeakCount =
    Number(
      input.waveformPeakCount
    );

  if (
    Number.isFinite(
      waveformPeakCount
    ) &&
    waveformPeakCount >= 64
  ) {
    item.djWaveformPeakCount =
      Math.floor(
        waveformPeakCount
      );
  }

  if (
    item.djWaveformPrepared
  ) {
    item.djWaveformUpdatedAt =
      Date.now();
  }

  markAudioLibraryManifestDirty();
  return item;
}

export async function addLocalFileToLibraryWithMetadata(absPath: string, title?: string): Promise<LibraryItem> {
  const resolved = path.resolve(absPath);
  const existing = findLibraryItemByLocator(resolved);
  const item = existing || addLocalFileToLibrary(resolved, title);

  await refreshAudioLibraryItemMetadata(item);
  return item;
}

export async function backfillMissingAudioLibraryMetadata(items: LibraryItem[] = listLibrary()) {
  const targets = items.filter((item) => {
    const duration = Number(item.duration || 0);
    return item.source === "local" && item.sourceOnline !== false && fs.existsSync(item.locator) && (!Number.isFinite(duration) || duration <= 0);
  });

  let updated = 0;
  let failed = 0;
  audioLibraryManifestWriteHold += 1;

  try {
    for (const item of targets) {
      try {
        const refreshed = await refreshAudioLibraryItemMetadata(item);
        if (refreshed && Number(refreshed.duration || 0) > 0) updated += 1;
        else failed += 1;
      } catch {
        failed += 1;
      }
    }
  } finally {
    audioLibraryManifestWriteHold = Math.max(0, audioLibraryManifestWriteHold - 1);
    if (audioLibraryManifestDirty) persistAudioLibraryManifestNow();
  }

  return {
    checked: targets.length,
    updated,
    failed,
  };
}

function isLocatorInsideAudioRoot(locator: string, root: string) {
  const resolvedLocator = normaliseAudioLocator(locator);
  const resolvedRoot = normaliseAudioLocator(root);

  return resolvedLocator === resolvedRoot ||
    resolvedLocator.startsWith(`${resolvedRoot}${path.sep}`);
}

function collectSupportedAudioFilesRecursiveSafe(folderPath: string): string[] {
  if (!fs.existsSync(folderPath)) return [];

  const results: string[] = [];

  function walk(currentPath: string) {
    let stat: fs.Stats;

    try {
      stat = fs.statSync(currentPath);
    } catch {
      return;
    }

    if (stat.isFile()) {
      if (isSupportedAudioFile(currentPath)) {
        results.push(path.resolve(currentPath));
      }

      return;
    }

    if (!stat.isDirectory()) return;

    let entries: fs.Dirent[] = [];

    try {
      entries = fs.readdirSync(currentPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const abs = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        walk(abs);
      } else if (entry.isFile() && isSupportedAudioFile(abs)) {
        results.push(path.resolve(abs));
      }
    }
  }

  walk(path.resolve(folderPath));
  return results;
}

export function syncAudioLibraryFromRoots(roots: string[]) {
  const configuredRoots = Array.from(
    new Set(
      (Array.isArray(roots) ? roots : [])
        .map((entry) => path.resolve(String(entry || "").trim()))
        .filter(Boolean)
    )
  );

  const safeRoots = configuredRoots.filter((entry) => fs.existsSync(entry));
  const offlineRoots = configuredRoots.filter((entry) => !fs.existsSync(entry));

  const discovered = new Set<string>();
  const addedItems: LibraryItem[] = [];
  const removedItems: LibraryItem[] = [];
  let updated = 0;

  audioLibraryManifestWriteHold += 1;

  try {
    for (const item of Array.from(library.values())) {
      if (!offlineRoots.some((root) => isLocatorInsideAudioRoot(item.locator, root))) continue;
      if (item.sourceOnline === false && item.sourceStatus === "offline") continue;

      item.sourceOnline = false;
      item.sourceStatus = "offline";
      updated += 1;
      markAudioLibraryManifestDirty();
    }

    for (const root of safeRoots) {
      for (const absFile of collectSupportedAudioFilesRecursiveSafe(root)) {
        const key = normaliseAudioLocator(absFile);
        discovered.add(key);

        const existing = findLibraryItemByLocator(absFile);

        if (!existing) {
          if (isAudioLibraryLocatorHidden(absFile)) {
            continue;
          }

          addedItems.push(addLocalFileToLibrary(absFile));
          continue;
        }

        try {
          const stat = fs.statSync(absFile);
          const mimeType = existing.mimeType || guessMimeType(absFile);

          if (
            existing.sizeBytes !== stat.size ||
            existing.mimeType !== mimeType ||
            existing.sourceOnline !== true ||
            existing.sourceStatus !== "online"
          ) {
            existing.sizeBytes = stat.size;
            existing.mimeType = mimeType;
            existing.sourceOnline = true;
            existing.sourceStatus = "online";
            updated += 1;
            markAudioLibraryManifestDirty();
          }
        } catch {}
      }
    }

    for (const item of Array.from(library.values())) {
      if (!safeRoots.some((root) => isLocatorInsideAudioRoot(item.locator, root))) {
        continue;
      }

      if (discovered.has(normaliseAudioLocator(item.locator))) {
        continue;
      }

      library.delete(item.id);
      removedItems.push(item);
      markAudioLibraryManifestDirty();
    }
  } finally {
    audioLibraryManifestWriteHold = Math.max(0, audioLibraryManifestWriteHold - 1);

    if (audioLibraryManifestDirty) {
      persistAudioLibraryManifestNow();
    }
  }

  return {
    roots: configuredRoots,
    onlineRoots: safeRoots,
    offlineRoots,
    scanned: discovered.size,
    added: addedItems.length,
    addedItems,
    removed: removedItems.length,
    removedItems,
    updated,
    total: library.size,
    changed: addedItems.length > 0 || removedItems.length > 0 || updated > 0,
  };
}

export function removeLibraryItemsUnderRoot(root: string) {
  const removedItems: LibraryItem[] = [];
  audioLibraryManifestWriteHold += 1;

  try {
    for (const item of Array.from(library.values())) {
      if (!isLocatorInsideAudioRoot(item.locator, root)) continue;

      library.delete(item.id);
      removedItems.push(item);
      markAudioLibraryManifestDirty();
    }
  } finally {
    audioLibraryManifestWriteHold = Math.max(0, audioLibraryManifestWriteHold - 1);

    if (audioLibraryManifestDirty) {
      persistAudioLibraryManifestNow();
    }
  }

  return removedItems;
}

restoreHiddenAudioLibraryManifest();
restoreAudioLibraryManifest();