import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { loadConfig } from "./config";
import { applyCors } from "./middleware/cors";
import { json } from "./utils/json";
import { handleApiRoute } from "./api/router";
import { streamFileWithRange } from "./streaming/rangeStream";
import {
  addLocalFileToLibrary,
  findLibraryItemByLocator,
  getLibraryItem,
  isSupportedAudioFile,
  listLibrary,
} from "./db/library";
import * as mm from "music-metadata";
import { validateLocalPathAllowed } from "./sources/local/validateLocalPathAllowed";
import {
  DEFAULT_WAVEFORM_PEAKS,
  getCachedWaveform,
  normaliseWaveformPeakCount,
  queueWaveformGenerationForItems,
  restoreWaveformCache,
} from "./waveforms";
import {
  getTracklistAutoScanJob,
  startTracklistAutoScanJob,
} from "./tracklistAutoScan";
import {
  getTracklistNameDetectJob,
  startTracklistNameDetectJob,
} from "./tracklistNameDetect";

const cfg = loadConfig();
const PLAYER_RUNTIME_STATE_DIR = path.join(process.cwd(), "server", "data");
const PLAYER_RUNTIME_STATE_PATH = path.join(PLAYER_RUNTIME_STATE_DIR, "player-runtime-state.json");
const BRMEDIA_CUSTOM_TAGS_PATH = path.join(PLAYER_RUNTIME_STATE_DIR, "brmedia-custom-tags.json");
const VIDEO_LIBRARY_ROOTS = String(process.env.BRMEDIA_VIDEO_DIRS || process.env.VIDEO_LIBRARY_DIRS || "C:\\Videos")
  .split(/[;,]/)
  .map((entry) => entry.trim())
  .filter(Boolean);
const VIDEO_METADATA_CACHE_PATH = path.join(PLAYER_RUNTIME_STATE_DIR, "video-metadata-cache.json");
const VIDEO_LIBRARY_CACHE = new Map<string, any>();
const CONVERTER_UPLOADS = new Map<string, any>();
const CONVERTER_JOBS = new Map<string, any>();
const MASTERING_UPLOADS = new Map<string, any>();
const MASTERING_JOBS = new Map<string, any>();

function readBrMediaCustomTagsStore(): Record<string, any> {
  try {
    if (!fs.existsSync(BRMEDIA_CUSTOM_TAGS_PATH)) return {};
    const raw = fs.readFileSync(BRMEDIA_CUSTOM_TAGS_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeBrMediaCustomTagsStore(store: Record<string, any>) {
  ensurePlayerRuntimeStateDir();
  fs.writeFileSync(BRMEDIA_CUSTOM_TAGS_PATH, JSON.stringify(store || {}, null, 2), "utf8");
}

function normaliseBrMediaBrandImageKey(value: any) {
  const key = String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  const hasNj = /dj\s*nj|\bnj\b/.test(key);
  const hasUp = /upalnite|\bup\b/.test(key);

  if (hasNj && hasUp) return "br";
  if (/blackburn\s*ravers|blackburnravers|bb\s*ravers|brmedia|\bbr\b/.test(key)) return "br";
  if (hasNj) return "nj";
  if (hasUp) return "up";

  return "";
}

function normaliseMetadataTagMap(input: any = {}) {
  const output: Record<string, string> = {};

  if (!input || typeof input !== "object" || Array.isArray(input)) return output;

  Object.entries(input).forEach(([key, value]) => {
    const safeKey = String(key || "").trim().replace(/[=\r\n]/g, "");
    const text = firstString(value);
    if (!safeKey || !text) return;
    output[safeKey] = text;
  });

  return output;
}

function normaliseBrMediaCustomTags(input: any) {
  const tags = input && typeof input === "object" ? input : {};
  const str = (value: any) => firstString(value) || "";

  const extraBrands = Array.isArray(tags.extraBrands)
    ? tags.extraBrands.map((item: any) => str(item)).filter(Boolean)
    : [];

  const primaryBrand = str(tags.primaryBrand || tags.brand || tags.primary_brand);
  const brandImageKey = normaliseBrMediaBrandImageKey(tags.brandImageKey || primaryBrand || extraBrands.join(" "));

  return {
    title: str(tags.title),
    artist: str(tags.artist),
    albumArtist: str(tags.albumArtist || tags.album_artist),
    album: str(tags.album),
    genre: str(tags.genre),
    label: str(tags.label),
    year: str(tags.year),
    bpm: str(tags.bpm),
    key: str(tags.key),
    country: str(tags.country),
    trackNumber: str(tags.trackNumber || tags.track_number),
    discNumber: str(tags.discNumber || tags.disc_number),
    comment: str(tags.comment),
    customNotes: str(tags.customNotes || tags.custom_notes),

    primaryBrand,
    brandImageKey,
    extraBrands,
    category: str(tags.category || tags.navCategory || tags.brmediaCategory),
    series: str(tags.series),
    episode: str(tags.episode),
    releaseType: str(tags.releaseType || tags.release_type || "Mix") || "Mix",
    radioOnly: tags.radioOnly === true || String(tags.radioOnly || "").toLowerCase() === "true",
    freeSong: tags.freeSong === true || String(tags.freeSong || "").toLowerCase() === "true",
    tracklistStatus: str(tags.tracklistStatus || tags.tracklist_status || "None") || "None",
    advancedTags: normaliseMetadataTagMap(tags.advancedTags || tags.ffmpegTags || tags.id3Tags),
    rawMetadata: str(tags.rawMetadata || tags.raw_metadata),

    sourceType: str(tags.sourceType || tags.source_type),
    sourceLocator: str(tags.sourceLocator || tags.source_locator),

    // Keep central store light. The live Tagger request still sends artworkDataUrl to the write-copy endpoint.
    artworkDataUrl: "",

    tagFormat: "BRMEDIA_CUSTOM_TAGS_V6",
    savedAt: Date.now(),
  };
}

function getBrMediaSidecarPathForFile(filePath: string) {
  const parsed = path.parse(filePath);
  return path.join(parsed.dir, `${parsed.name}.brmedia-tags.json`);
}

function getBrMediaCustomTagKeys(item: any, suppliedKeys: any[] = []) {
  const keys = new Set<string>();

  suppliedKeys.forEach((key) => {
    const text = firstString(key);
    if (text) keys.add(text);
  });

  [item?.id, item?.bookmarkKey, item?.locator, item?.file, item?.filename, item?.path].forEach((key) => {
    const text = firstString(key);
    if (text) keys.add(text);
  });

  return Array.from(keys);
}

function readBrMediaSidecarForItem(item: any) {
  try {
    if (!item || item.source !== "local" || !item.locator) return null;

    const sidecarPath = getBrMediaSidecarPathForFile(item.locator);
    if (!fs.existsSync(sidecarPath)) return null;

    const raw = fs.readFileSync(sidecarPath, "utf8");
    const parsed = JSON.parse(raw);

    if (parsed?.brmediaTags && typeof parsed.brmediaTags === "object") {
      return parsed.brmediaTags;
    }

    if (parsed && typeof parsed === "object") return parsed;
  } catch {}

  return null;
}

function writeBrMediaSidecarForItem(item: any, tags: any, keys: string[]) {
  try {
    if (!item || item.source !== "local" || !item.locator) {
      return { written: false, path: "" };
    }

    const allowed = validateLocalPathAllowed(item.locator, cfg.localAllowedBases);
    if (!allowed.ok) {
      return { written: false, path: "", error: allowed.reason };
    }

    const sidecarPath = getBrMediaSidecarPathForFile(item.locator);
    const payload = {
      format: "BRMEDIA_SIDECAR_TAGS_V1",
      savedAt: new Date().toISOString(),
      trackId: item.id || "",
      locator: item.locator || "",
      keys,
      brmediaTags: tags,
    };

    fs.writeFileSync(sidecarPath, JSON.stringify(payload, null, 2), "utf8");
    return { written: true, path: sidecarPath };
  } catch (err: any) {
    return { written: false, path: "", error: String(err?.message || err) };
  }
}

function findBrMediaTagLibraryItem(body: any) {
  const trackId = firstString(body?.trackId || body?.id || body?.track?.id);
  if (trackId) {
    const byId = getLibraryItem(trackId);
    if (byId) return byId;
  }

  const locator = firstString(body?.locator || body?.track?.locator);
  if (locator) {
    const byLocator = findLibraryItemByLocator(locator);
    if (byLocator) return byLocator;
  }

  return null;
}

function saveBrMediaCustomTags(body: any) {
  const tags = normaliseBrMediaCustomTags(body?.tags || body?.brmediaTags || body);
  const item = findBrMediaTagLibraryItem(body);
  const trackId = firstString(body?.trackId || body?.id || body?.track?.id);
  const suppliedKeys = Array.isArray(body?.keys) ? body.keys : [];

  const keys = getBrMediaCustomTagKeys(
    item || {
      id: trackId,
      locator: firstString(body?.locator || body?.track?.locator),
      bookmarkKey: firstString(body?.bookmarkKey || body?.track?.bookmarkKey),
    },
    suppliedKeys
  );

  if (!keys.length) {
    return {
      ok: false,
      error: "No tag key supplied",
    };
  }

  const store = readBrMediaCustomTagsStore();

  keys.forEach((key) => {
    store[key] = tags;
  });

  writeBrMediaCustomTagsStore(store);

  const sidecar = item ? writeBrMediaSidecarForItem(item, tags, keys) : { written: false, path: "" };

  return {
    ok: true,
    tags,
    keys,
    savedKeys: keys.length,
    sidecar,
    store,
  };
}

function getBrMediaTaggedCopyPath(inputPath: string) {
  const parsed = path.parse(inputPath);
  const baseName = `${parsed.name} - BRMedia Tagged`;
  let candidate = path.join(parsed.dir, `${baseName}${parsed.ext}`);
  let counter = 2;

  while (fs.existsSync(candidate)) {
    candidate = path.join(parsed.dir, `${baseName} ${counter}${parsed.ext}`);
    counter += 1;
  }

  return candidate;
}

function getBrMediaTaggedWorkingPath(inputPath: string) {
  const parsed = path.parse(inputPath);
  return path.join(
    parsed.dir,
    `${parsed.name}.brmedia-writing-${Date.now()}-${Math.random().toString(16).slice(2)}${parsed.ext}`
  );
}

function getBrMediaBackupPath(inputPath: string) {
  const parsed = path.parse(inputPath);
  let candidate = path.join(parsed.dir, `${parsed.name}.brmedia-backup${parsed.ext}`);
  let counter = 2;

  while (fs.existsSync(candidate)) {
    candidate = path.join(parsed.dir, `${parsed.name}.brmedia-backup-${counter}${parsed.ext}`);
    counter += 1;
  }

  return candidate;
}

function writeTempArtworkForTagger(dataUrl: any) {
  const raw = firstString(dataUrl);
  if (!raw) return null;

  const match = raw.match(/^data:(image\/(?:png|jpe?g));base64,([a-z0-9+/=\s]+)$/i);
  if (!match) return null;

  ensurePlayerRuntimeStateDir();

  const mime = match[1].toLowerCase();
  const ext = mime.includes("png") ? ".png" : ".jpg";
  const filePath = path.join(
    PLAYER_RUNTIME_STATE_DIR,
    `tagger-artwork-${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`
  );

  fs.writeFileSync(filePath, Buffer.from(match[2].replace(/\s+/g, ""), "base64"));
  return { path: filePath, mime };
}

function addFfmpegMetadataArg(args: string[], key: string, value: any) {
  const text = firstString(value);
  if (!text) return;
  args.push("-metadata", `${key}=${text}`);
}

function buildBrMediaTagMetadataArgs(tags: any) {
  const args: string[] = [];

  addFfmpegMetadataArg(args, "title", tags.title);
  addFfmpegMetadataArg(args, "artist", tags.artist);
  addFfmpegMetadataArg(args, "album_artist", tags.albumArtist);
  addFfmpegMetadataArg(args, "album", tags.album);
  addFfmpegMetadataArg(args, "genre", tags.genre);
  addFfmpegMetadataArg(args, "date", tags.year);
  addFfmpegMetadataArg(args, "bpm", tags.bpm);
  addFfmpegMetadataArg(args, "initial_key", tags.key);
  addFfmpegMetadataArg(args, "label", tags.label);
  addFfmpegMetadataArg(args, "comment", tags.comment);
  addFfmpegMetadataArg(args, "track", tags.trackNumber);
  addFfmpegMetadataArg(args, "disc", tags.discNumber);

  addFfmpegMetadataArg(args, "BRMEDIA_PRIMARY_BRAND", tags.primaryBrand);
  addFfmpegMetadataArg(args, "BRMEDIA_BRAND_IMAGE_KEY", tags.brandImageKey);
  addFfmpegMetadataArg(args, "BRMEDIA_EXTRA_BRANDS", Array.isArray(tags.extraBrands) ? tags.extraBrands.join("; ") : "");
  addFfmpegMetadataArg(args, "BRMEDIA_CATEGORY", tags.category);
  addFfmpegMetadataArg(args, "BRMEDIA_SERIES", tags.series);
  addFfmpegMetadataArg(args, "BRMEDIA_EPISODE", tags.episode);
  addFfmpegMetadataArg(args, "BRMEDIA_RELEASE_TYPE", tags.releaseType);
  addFfmpegMetadataArg(args, "BRMEDIA_RADIO_ONLY", tags.radioOnly ? "true" : "false");
  addFfmpegMetadataArg(args, "BRMEDIA_FREE_SONG", tags.freeSong ? "true" : "false");
  addFfmpegMetadataArg(args, "BRMEDIA_TRACKLIST_STATUS", tags.tracklistStatus);
  addFfmpegMetadataArg(args, "BRMEDIA_CUSTOM_NOTES", tags.customNotes);
  addFfmpegMetadataArg(args, "BRMEDIA_TAG_FORMAT", "BRMEDIA_CUSTOM_TAGS_V6");

  const standardKeys = new Set([
    "title",
    "artist",
    "album_artist",
    "album",
    "genre",
    "date",
    "year",
    "bpm",
    "initial_key",
    "label",
    "comment",
    "track",
    "disc",
  ]);

  const advancedTags = tags?.advancedTags && typeof tags.advancedTags === "object" ? tags.advancedTags : {};

  Object.entries(advancedTags).forEach(([key, value]) => {
    const safeKey = String(key || "").trim().replace(/[=\r\n]/g, "");
    if (!safeKey || standardKeys.has(safeKey.toLowerCase())) return;
    addFfmpegMetadataArg(args, safeKey, value);
  });

  return args;
}

function runFfmpegTaggerWrite(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const ffmpeg = spawn(resolvePreviewFfmpegPath(), args, { windowsHide: true });
    let stderr = "";

    ffmpeg.stderr.on("data", (chunk) => {
      stderr += String(chunk || "");
      if (stderr.length > 12000) stderr = stderr.slice(-12000);
    });

    ffmpeg.on("error", reject);
    ffmpeg.on("close", (code: number | null) => {
      if (code === 0) return resolve();
      reject(new Error(stderr.trim() || `ffmpeg exited ${code}`));
    });
  });
}

async function writeBrMediaTaggedCopy(body: any) {
  const item = findBrMediaTagLibraryItem(body);
  if (!item) return { ok: false, error: "Selected library item not found" };

  if (item.source !== "local") {
    return { ok: false, error: "Cloud-linked files need Import local copy before Tagger can write file tags." };
  }

  const allowed = validateLocalPathAllowed(item.locator, cfg.localAllowedBases);
  if (!allowed.ok) return { ok: false, error: allowed.reason };
  if (!fs.existsSync(item.locator)) return { ok: false, error: "Source file missing" };

  const rawMode = (firstString(body?.mode || body?.saveMode) || "").toLowerCase();
  const mode = rawMode === "replace" ? "replace" : "copy";

  const rawTags = body?.tags || body?.brmediaTags || body || {};
  const tags = normaliseBrMediaCustomTags(rawTags);
  const keys = getBrMediaCustomTagKeys(item, Array.isArray(body?.keys) ? body.keys : []);
  const finalPath = mode === "replace" ? item.locator : getBrMediaTaggedCopyPath(item.locator);
  const outputPath = mode === "replace" ? getBrMediaTaggedWorkingPath(item.locator) : finalPath;
  const ext = path.extname(item.locator).toLowerCase();
  const artwork = writeTempArtworkForTagger(rawTags?.artworkDataUrl);
  const canEmbedArtwork = !!artwork && [".mp3", ".m4a", ".aac"].includes(ext);

  const args = ["-y", "-i", item.locator];

  if (canEmbedArtwork && artwork) {
    args.push("-i", artwork.path, "-map", "0:a?", "-map", "1:v:0", "-c", "copy");
  } else {
    args.push("-map", "0", "-c", "copy");
  }

  if (ext === ".mp3") {
    args.push("-id3v2_version", "3", "-write_id3v1", "1");
  }

  args.push(...buildBrMediaTagMetadataArgs(tags));

  if (canEmbedArtwork) {
    args.push(
      "-metadata:s:v",
      "title=Album cover",
      "-metadata:s:v",
      "comment=Cover (front)",
      "-disposition:v:0",
      "attached_pic"
    );
  }

  args.push(outputPath);

  try {
    await runFfmpegTaggerWrite(args);
  } finally {
    if (artwork?.path) {
      try { fs.unlinkSync(artwork.path); } catch {}
    }
  }

  if (!fs.existsSync(outputPath)) {
    return { ok: false, error: "Tagged file was not created" };
  }

  const originalStat = fs.statSync(item.locator);
  const outputStat = fs.statSync(outputPath);

  if (!outputStat.isFile() || outputStat.size < 1024) {
    try { fs.unlinkSync(outputPath); } catch {}
    return { ok: false, error: "Tagged file looks too small, so the original was not touched" };
  }

  let backupPath = "";
  let resultItem: any = null;
  let backupItem: any = null;

  if (mode === "replace") {
    backupPath = getBrMediaBackupPath(item.locator);

    try {
      fs.renameSync(item.locator, backupPath);

      try {
        fs.renameSync(outputPath, item.locator);
      } catch (err) {
        try { fs.renameSync(backupPath, item.locator); } catch {}
        throw err;
      }
    } catch (err: any) {
      if (fs.existsSync(outputPath)) {
        try { fs.unlinkSync(outputPath); } catch {}
      }

      return {
        ok: false,
        error: `Replace failed before completion: ${String(err?.message || err)}`,
      };
    }

    const finalStat = fs.statSync(item.locator);
    item.sizeBytes = finalStat.isFile() ? finalStat.size : item.sizeBytes;
    resultItem = item;
    backupItem = addLocalFileToLibrary(backupPath, `${item.title || path.parse(backupPath).name} (BRMedia Backup)`);
  } else {
    resultItem = addLocalFileToLibrary(finalPath);
  }

  const resultKeys = getBrMediaCustomTagKeys(resultItem, keys);
  const store = readBrMediaCustomTagsStore();

  [...keys, ...resultKeys].forEach((key) => {
    store[key] = tags;
  });

  writeBrMediaCustomTagsStore(store);
  const sidecar = writeBrMediaSidecarForItem(resultItem, tags, resultKeys);

  void queueWaveformGenerationForItems([resultItem], {
    peakCount: DEFAULT_WAVEFORM_PEAKS,
    onlyMissing: true,
  });

  return {
    ok: true,
    mode,
    item: resultItem,
    backupItem,
    tags,
    keys: resultKeys,
    outputPath: finalPath,
    backupPath,
    fileName: path.basename(finalPath),
    backupFileName: backupPath ? path.basename(backupPath) : "",
    downloadUrl: mode === "copy" ? `/download/${encodeURIComponent(resultItem.id)}` : "",
    sidecar,
    artworkEmbedded: canEmbedArtwork,
    note: mode === "replace"
      ? `Original replaced safely. Backup created first${backupPath ? `: ${path.basename(backupPath)}` : ""}.`
      : canEmbedArtwork
        ? "Artwork embedded in tagged copy. Original file was not changed."
        : "Metadata written to tagged copy. Original file was not changed. Artwork embedding is currently MP3/M4A/AAC only.",
    originalSizeBytes: originalStat.size,
    outputSizeBytes: outputStat.size,
  };
}

function ensurePlayerRuntimeStateDir() {
  if (!fs.existsSync(PLAYER_RUNTIME_STATE_DIR)) {
    fs.mkdirSync(PLAYER_RUNTIME_STATE_DIR, { recursive: true });
  }
}

function readPlayerRuntimeState() {
  try {
    if (!fs.existsSync(PLAYER_RUNTIME_STATE_PATH)) return null;
    const raw = fs.readFileSync(PLAYER_RUNTIME_STATE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function normalisePlayerRuntimeState(input: any) {
  const state = input?.state && typeof input.state === "object" ? input.state : null;
  const position = input?.position && typeof input.position === "object" ? input.position : null;
  const trackProgress = input?.trackProgress && typeof input.trackProgress === "object" ? input.trackProgress : {};

  return {
    state,
    position,
    trackProgress,
    savedAt: Date.now(),
  };
}

function writePlayerRuntimeState(input: any) {
  ensurePlayerRuntimeStateDir();
  const next = normalisePlayerRuntimeState(input);
  fs.writeFileSync(PLAYER_RUNTIME_STATE_PATH, JSON.stringify(next, null, 2), "utf8");
  return next;
}

function parseTrackIdAndAction(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  return {
    id: decodeURIComponent(parts[1] || ""),
    action: parts[2] || "",
  };
}

function buildArtworkCandidates(filePath: string): string[] {
  const parsed = path.parse(filePath);
  const dir = parsed.dir;
  const base = parsed.name;

  return [
    path.join(dir, `${base}.jpg`),
    path.join(dir, `${base}.jpeg`),
    path.join(dir, `${base}.png`),
    path.join(dir, `${base}.webp`),
    path.join(dir, "cover.jpg"),
    path.join(dir, "cover.jpeg"),
    path.join(dir, "cover.png"),
    path.join(dir, "cover.webp"),
    path.join(dir, "folder.jpg"),
    path.join(dir, "folder.jpeg"),
    path.join(dir, "folder.png"),
    path.join(dir, "folder.webp"),
    path.join(dir, "artwork.jpg"),
    path.join(dir, "artwork.jpeg"),
    path.join(dir, "artwork.png"),
    path.join(dir, "artwork.webp"),
  ];
}

function getContentTypeForArtwork(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

type ArtworkMemoryCacheEntry = {
  contentType: string;
  buffer: Buffer;
  savedAt: number;
};

const ARTWORK_MEMORY_CACHE_MAX = 250;
const ARTWORK_MEMORY_CACHE_TTL_MS = 30 * 60 * 1000;
const artworkMemoryCache = new Map<string, ArtworkMemoryCacheEntry>();

function getArtworkCacheKey(prefix: string, filePath: string) {
  const stat = fs.statSync(filePath);
  return `${prefix}:${filePath}:${stat.size}:${stat.mtimeMs}`;
}

function getArtworkMemoryCache(key: string) {
  const cached = artworkMemoryCache.get(key);
  if (!cached) return null;

  if (Date.now() - cached.savedAt > ARTWORK_MEMORY_CACHE_TTL_MS) {
    artworkMemoryCache.delete(key);
    return null;
  }

  return cached;
}

function rememberArtworkMemoryCache(key: string, entry: ArtworkMemoryCacheEntry) {
  artworkMemoryCache.set(key, entry);

  while (artworkMemoryCache.size > ARTWORK_MEMORY_CACHE_MAX) {
    const firstKey = artworkMemoryCache.keys().next().value;
    if (!firstKey) break;
    artworkMemoryCache.delete(firstKey);
  }
}

function sendArtworkBuffer(res: http.ServerResponse, contentType: string, buffer: Buffer) {
  res.statusCode = 200;
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Length", String(buffer.length));
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.end(buffer);
}

function firstString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string") {
        const trimmed = item.trim();
        if (trimmed) return trimmed;
      }
    }
  }

  return null;
}

function readJsonBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = "";

    req.on("data", (chunk) => {
      data += chunk;
    });

    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(err);
      }
    });

    req.on("error", reject);
  });
}

function readBufferBody(req: http.IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    req.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    req.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    req.on("error", reject);
  });
}

type RelayDevice = {
  deviceId: string;
  name: string;
  type: string;
  receiveTransfers: boolean;
  allowRemote: boolean;
  registeredAt: number;
  lastSeenAt: number;
  online: boolean;
  statusText: string;
};

type RelayCommand = {
  commandId: string;
  fromDeviceId: string;
  action: string;
  payload: any;
  createdAt: number;
};

const DEVICE_ONLINE_WINDOW_MS = 45_000;
const relayDevices = new Map<string, RelayDevice>();
const relayCommandQueues = new Map<string, RelayCommand[]>();

function createRelayCommandId(): string {
  return `cmd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function pruneRelayDevices() {
  const now = Date.now();

  for (const [deviceId, device] of relayDevices.entries()) {
    const online = (now - device.lastSeenAt) <= DEVICE_ONLINE_WINDOW_MS;
    relayDevices.set(deviceId, {
      ...device,
      online,
      statusText: online ? "Online now" : "Offline",
    });
  }
}

function sanitiseRelayDeviceBody(body: any) {
  return {
    deviceId: firstString(body?.deviceId) || `brdev-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`,
    name: firstString(body?.name) || "My device",
    type: firstString(body?.type) || "other",
    receiveTransfers: body?.receiveTransfers !== false,
    allowRemote: body?.allowRemote !== false,
  };
}

function upsertRelayDevice(body: any): RelayDevice {
  const now = Date.now();
  const incoming = sanitiseRelayDeviceBody(body);
  const previous = relayDevices.get(incoming.deviceId);

  const next: RelayDevice = {
    deviceId: incoming.deviceId,
    name: incoming.name,
    type: incoming.type,
    receiveTransfers: incoming.receiveTransfers,
    allowRemote: incoming.allowRemote,
    registeredAt: previous?.registeredAt || now,
    lastSeenAt: now,
    online: true,
    statusText: "Online now",
  };

  relayDevices.set(next.deviceId, next);
  pruneRelayDevices();
  return next;
}

function getVisibleRelayDevices(excludeDeviceId = "") {
  pruneRelayDevices();

  return Array.from(relayDevices.values())
    .filter((device) => device.online && device.receiveTransfers && device.deviceId !== excludeDeviceId)
    .sort((a, b) => b.lastSeenAt - a.lastSeenAt)
    .map((device) => ({
      id: device.deviceId,
      name: device.name,
      type: device.type,
      online: device.online,
      allowRemote: device.allowRemote,
      lastSeenText: device.statusText,
    }));
}

function takeRelayCommands(deviceId: string): RelayCommand[] {
  const queued = relayCommandQueues.get(deviceId) || [];
  relayCommandQueues.set(deviceId, []);
  return queued;
}

function enqueueRelayCommand(targetDeviceId: string, command: RelayCommand) {
  const queued = relayCommandQueues.get(targetDeviceId) || [];
  queued.push(command);
  relayCommandQueues.set(targetDeviceId, queued);
}

function isInfoOnlyRelayAction(action: string): boolean {
  return action === "send_tracklist" || action === "send_current_track";
}

function parseTracklistTextServer(rawText: string) {
  const text = String(rawText || "").replace(/\r/g, "").trim();
  if (!text) {
    return { metaEntries: [], description: "", tracks: [] as Array<{ number: string; title: string; timeText: string }> };
  }

  const lines = text.split("\n");
  const metaEntries: Array<{ label: string; value: string }> = [];
  const descriptionLines: string[] = [];
  const tracks: Array<{ number: string; title: string; timeText: string }> = [];
  let inTrackSection = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      if (!inTrackSection) descriptionLines.push("");
      continue;
    }

    const trackMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (trackMatch) {
      inTrackSection = true;
      const fullTrackText = (trackMatch[2] || "").trim();
      const timeMatch = fullTrackText.match(/^(.*?)(?:\s+-\s+)?(\d{1,2}:\d{2}:\d{2}|\d{1,2}:\d{2})$/);
      const rawTitle = timeMatch ? (timeMatch[1] || "").trim() : fullTrackText;
      const timeText = timeMatch ? (timeMatch[2] || "").trim() : "";

      tracks.push({
        number: (trackMatch[1] || "").trim(),
        title: rawTitle.replace(/\s+/g, " ").trim(),
        timeText,
      });
      continue;
    }

    const metaMatch = !inTrackSection ? line.match(/^([^:]+):\s*(.+)$/) : null;
    if (metaMatch) {
      metaEntries.push({ label: metaMatch[1].trim(), value: metaMatch[2].trim() });
      continue;
    }

    if (!inTrackSection) descriptionLines.push(line);
  }

  return {
    metaEntries,
    description: descriptionLines.join("\n").trim(),
    tracks,
  };
}

function buildTracklistTextServer(data: any): string {
  const lines: string[] = [];
  const metaEntries = Array.isArray(data?.metaEntries) ? data.metaEntries : [];
  const description = String(data?.description || "").replace(/\r/g, "").trim();
  const tracks = Array.isArray(data?.tracks) ? data.tracks : [];

  for (const entry of metaEntries) {
    const label = typeof entry?.label === "string" ? entry.label.trim() : "";
    const value = typeof entry?.value === "string" ? entry.value.trim() : "";
    if (!label || !value) continue;
    lines.push(`${label}: ${value}`);
  }

  if (description) {
    if (lines.length) lines.push("");
    lines.push(...description.split("\n"));
  }

  const validTracks = tracks.filter((track: any) => typeof track?.title === "string" && track.title.trim());
  if (validTracks.length) {
    if (lines.length) lines.push("");
    validTracks.forEach((track: any, index: number) => {
      const number = typeof track?.number === "string" && track.number.trim() ? track.number.trim() : String(index + 1);
      const title = typeof track?.title === "string" ? track.title.trim() : `Track ${index + 1}`;
      const timeText = typeof track?.timeText === "string" ? track.timeText.trim() : "";
      lines.push(`${number}. ${title}${timeText ? ` - ${timeText}` : ""}`);
    });
  }

  return lines.join("\n").trim();
}

function getTracklistPaths(filePath: string) {
  const parsed = path.parse(filePath);
  return {
    txtPath: path.join(parsed.dir, `${parsed.name}.txt`),
    jsonPath: path.join(parsed.dir, `${parsed.name}.tracklist.json`),
    cuePath: path.join(parsed.dir, `${parsed.name}.cue`),
    fallbackPath: path.join(parsed.dir, "no_tracklist.txt"),
  };
}

function parseCueTimeToDisplay(raw: string): string {
  const match = /^(\d+):(\d+):(\d+)$/.exec(String(raw || "").trim());
  if (!match) return "";

  const mm = Number(match[1] || 0);
  const ss = Number(match[2] || 0);
  const ff = Number(match[3] || 0);

  const totalSeconds = Math.floor((mm * 60) + ss + (ff / 75));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function parseCueTracklistServer(rawText: string) {
  const lines = String(rawText || "").replace(/\r/g, "").split("\n");
  const tracks: Array<{ number: string; title: string; timeText: string }> = [];

  let currentNumber = "";
  let currentTitle = "";
  let currentPerformer = "";
  let currentIndex = "";

  const flushCurrent = () => {
    if (!currentNumber) return;
    const title = [currentPerformer, currentTitle].filter(Boolean).join(" - ") || `Track ${currentNumber}`;
    tracks.push({
      number: currentNumber,
      title,
      timeText: currentIndex ? parseCueTimeToDisplay(currentIndex) : "",
    });
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    const trackMatch = /^TRACK\s+(\d+)\s+/i.exec(line);
    if (trackMatch) {
      flushCurrent();
      currentNumber = String(Number(trackMatch[1] || 0));
      currentTitle = "";
      currentPerformer = "";
      currentIndex = "";
      continue;
    }

    const titleMatch = /^TITLE\s+"?(.*?)"?$/i.exec(line);
    if (titleMatch && currentNumber) {
      currentTitle = (titleMatch[1] || "").trim();
      continue;
    }

    const performerMatch = /^PERFORMER\s+"?(.*?)"?$/i.exec(line);
    if (performerMatch && currentNumber) {
      currentPerformer = (performerMatch[1] || "").trim();
      continue;
    }

    const indexMatch = /^INDEX\s+01\s+(\d+:\d+:\d+)$/i.exec(line);
    if (indexMatch && currentNumber) {
      currentIndex = (indexMatch[1] || "").trim();
    }
  }

  flushCurrent();

  return {
    metaEntries: [],
    description: "",
    tracks,
  };
}

function buildLocalScanTracklistData(item: { locator: string; title?: string; artist?: string; album?: string; duration?: number }) {
  const { txtPath, cuePath } = getTracklistPaths(item.locator);

  if (fs.existsSync(txtPath)) {
    const raw = fs.readFileSync(txtPath, "utf8");
    return {
      data: parseTracklistTextServer(raw),
      sourceKind: "txt",
    };
  }

  if (fs.existsSync(cuePath)) {
    const raw = fs.readFileSync(cuePath, "utf8");
    return {
      data: parseCueTracklistServer(raw),
      sourceKind: "cue",
    };
  }

  const fallbackMeta = [
    { label: "Title", value: item.title || path.parse(item.locator).name },
    { label: "Artist", value: item.artist || "" },
    { label: "Album", value: item.album || "" },
    { label: "Length", value: item.duration ? String(item.duration) : "" },
  ].filter((entry) => entry.value);

  return {
    data: {
      metaEntries: fallbackMeta,
      description: "",
      tracks: [],
    },
    sourceKind: "generated",
  };
}

function loadTracklistDataForItem(item: { locator: string; title?: string; artist?: string; album?: string; duration?: number }) {
  const { txtPath, jsonPath, fallbackPath } = getTracklistPaths(item.locator);

  if (fs.existsSync(jsonPath)) {
    const raw = fs.readFileSync(jsonPath, "utf8");
    return { data: JSON.parse(raw), sourceKind: "json", txtPath, jsonPath };
  }

  const chosenTxt = fs.existsSync(txtPath) ? txtPath : fs.existsSync(fallbackPath) ? fallbackPath : null;
  if (chosenTxt) {
    const raw = fs.readFileSync(chosenTxt, "utf8");
    return { data: parseTracklistTextServer(raw), sourceKind: chosenTxt === txtPath ? "txt" : "fallback", txtPath, jsonPath };
  }

  return { data: { metaEntries: [], description: "", tracks: [] }, sourceKind: "none", txtPath, jsonPath };
}

const BACKUP_EXPORT_SECTIONS = new Set([
  "settings",
  "favourites",
  "bookmarks",
  "playlists",
  "playlist_prefs",
  "device_prefs",
  "library_manifest",
  "tracklists",
  "waveforms",
]);

function sanitiseBackupSections(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => String(item || "").trim())
    .filter((item) => BACKUP_EXPORT_SECTIONS.has(item));
}

async function buildBackupExportPayload(sections: string[], browserData: any) {
  const items = listLibrary();

  const backup: any = {
    format: "brmedia-backup-v1",
    generatedAt: new Date().toISOString(),
    sections,
    browser: {},
    server: {},
  };

  if (sections.includes("settings")) {
    backup.browser.settings = browserData?.settings ?? {};
  }

  if (sections.includes("favourites")) {
    backup.browser.favourites = browserData?.favourites ?? {};
  }

  if (sections.includes("bookmarks")) {
    backup.browser.bookmarks = browserData?.bookmarks ?? {};
    backup.browser.bookmarkPrefs = browserData?.bookmarkPrefs ?? {};
  }

  if (sections.includes("playlists")) {
    backup.browser.playlists = browserData?.playlists ?? [];
  }

  if (sections.includes("playlist_prefs")) {
    backup.browser.playlistPrefs = browserData?.playlistPrefs ?? {};
  }

  if (sections.includes("device_prefs")) {
    backup.browser.devicePrefs = browserData?.devicePrefs ?? {};
  }

  if (sections.includes("library_manifest")) {
    backup.server.libraryManifest = items.map((item) => ({
      id: item.id,
      title: item.title,
      source: item.source,
      locator: item.locator,
      mimeType: item.mimeType || "",
      sizeBytes: item.sizeBytes || 0,
    }));
  }

  if (sections.includes("tracklists")) {
    backup.server.tracklists = items.map((item) => {
      const loaded = loadTracklistDataForItem(item);
      return {
        id: item.id,
        title: item.title,
        locator: item.locator,
        sourceKind: loaded.sourceKind,
        data: loaded.data,
      };
    });
  }

  if (sections.includes("waveforms")) {
    backup.server.waveforms = await Promise.all(items.map(async (item) => {
      try {
        const payload = await getCachedWaveform(item.locator, DEFAULT_WAVEFORM_PEAKS);
        return {
          id: item.id,
          title: item.title,
          locator: item.locator,
          count: DEFAULT_WAVEFORM_PEAKS,
          duration: payload.duration,
          peaks: payload.peaks,
          cached: payload.cached,
        };
      } catch (err: any) {
        return {
          id: item.id,
          title: item.title,
          locator: item.locator,
          error: String(err?.message || err),
        };
      }
    }));
  }

  return backup;
}

function ensureDirSyncServer(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function safeUploadFilename(fileName: string) {
  const parsed = path.parse(String(fileName || "upload.bin"));
  const safeBase = (parsed.name || "upload")
    .replace(/[^a-z0-9_\- ]+/gi, "_")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 120) || "upload";
  const safeExt = (parsed.ext || "").replace(/[^a-z0-9.]+/gi, "").slice(0, 12);
  return `${safeBase}${safeExt}`;
}

function decodeBase64FilePayload(raw: unknown) {
  const text = String(raw || "");
  const payload = text.includes(",") ? text.split(",").pop() || "" : text;
  return Buffer.from(payload, "base64");
}

function getMobileUploadDir() {
  const preferredBase = Array.isArray(cfg.localAllowedBases) && cfg.localAllowedBases.length
    ? cfg.localAllowedBases[0]
    : path.join(__dirname, "..", ".uploads", "mobile");

  const dir = path.join(preferredBase, "BRMedia Uploads");
  ensureDirSyncServer(dir);
  return dir;
}

function normaliseTracklistRestoreData(input: any) {
  return {
    metaEntries: Array.isArray(input?.metaEntries) ? input.metaEntries : [],
    description: typeof input?.description === "string" ? input.description : "",
    tracks: Array.isArray(input?.tracks) ? input.tracks : [],
  };
}

async function applyBackupRestorePayload(backup: any) {
  const sections = sanitiseBackupSections(backup?.sections);
  const serverData = backup?.server ?? {};
  const restored = {
    libraryManifest: 0,
    tracklists: 0,
    waveforms: 0,
  };

  if (sections.includes("library_manifest") && Array.isArray(serverData?.libraryManifest)) {
    for (const entry of serverData.libraryManifest) {
      const locator = firstString(entry?.locator);
      if (!locator || !fs.existsSync(locator) || !isSupportedAudioFile(locator)) continue;
      if (findLibraryItemByLocator(locator)) continue;
      addLocalFileToLibrary(locator);
      restored.libraryManifest += 1;
    }
  }

  if (sections.includes("tracklists") && Array.isArray(serverData?.tracklists)) {
    for (const entry of serverData.tracklists) {
      const locator = firstString(entry?.locator);
      if (!locator || !fs.existsSync(locator)) continue;

      const safeData = normaliseTracklistRestoreData(entry?.data);
      const paths = getTracklistPaths(locator);

      fs.writeFileSync(paths.jsonPath, JSON.stringify(safeData, null, 2), "utf8");
      fs.writeFileSync(paths.txtPath, `${buildTracklistTextServer(safeData)}\n`, "utf8");
      restored.tracklists += 1;
    }
  }

  if (sections.includes("waveforms") && Array.isArray(serverData?.waveforms)) {
    for (const entry of serverData.waveforms) {
      const locator = firstString(entry?.locator);
      if (!locator || !fs.existsSync(locator)) continue;

      const peaks = Array.isArray(entry?.peaks) ? entry.peaks.map((value: any) => Number(value || 0)) : [];
      if (!peaks.length) continue;

      const count = Number(entry?.count || DEFAULT_WAVEFORM_PEAKS) || DEFAULT_WAVEFORM_PEAKS;
      const duration = Number(entry?.duration || 0) || 0;

      if (restoreWaveformCache(locator, count, duration, peaks)) {
        restored.waveforms += 1;
      }
    }
  }

  return restored;
}

async function handleMobileUpload(files: any[]) {
  const uploadDir = getMobileUploadDir();
  const addedItems: any[] = [];
  let savedFiles = 0;

  for (const rawFile of files) {
    const fileName = safeUploadFilename(firstString(rawFile?.name) || "upload.bin");
    const targetPath = path.join(uploadDir, fileName);
    const buffer = decodeBase64FilePayload(rawFile?.base64);

    fs.writeFileSync(targetPath, buffer);
    savedFiles += 1;

    if (isSupportedAudioFile(targetPath) && !findLibraryItemByLocator(targetPath)) {
      const item = addLocalFileToLibrary(targetPath);
      addedItems.push(item);
    }
  }

  if (addedItems.length) {
    void queueWaveformGenerationForItems(addedItems, {
      peakCount: DEFAULT_WAVEFORM_PEAKS,
      onlyMissing: true,
    });
  }

  return {
    savedFiles,
    addedItems: addedItems.length,
  };
}

async function handleSingleMobileUpload(fileNameRaw: string, buffer: Buffer) {
  const uploadDir = getMobileUploadDir();
  const fileName = safeUploadFilename(fileNameRaw || "upload.bin");
  const targetPath = path.join(uploadDir, fileName);

  fs.writeFileSync(targetPath, buffer);

  let addedItems = 0;
  const addedList: any[] = [];

  if (isSupportedAudioFile(targetPath) && !findLibraryItemByLocator(targetPath)) {
    const item = addLocalFileToLibrary(targetPath);
    addedItems = 1;
    addedList.push(item);
  }

  if (addedList.length) {
    void queueWaveformGenerationForItems(addedList, {
      peakCount: DEFAULT_WAVEFORM_PEAKS,
      onlyMissing: true,
    });
  }

  return {
    savedFiles: 1,
    addedItems,
    item: addedList[0] || null,
  };
}

function makeConverterId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function getConverterUploadDir() {
  const preferredBase = Array.isArray(cfg.localAllowedBases) && cfg.localAllowedBases.length
    ? cfg.localAllowedBases[0]
    : path.join(process.cwd(), "server", "data");
  const dir = path.join(preferredBase, "BRMedia Converter Uploads");
  ensureDirSyncServer(dir);
  return dir;
}

function getConverterOutputDir() {
  const preferredBase = Array.isArray(cfg.localAllowedBases) && cfg.localAllowedBases.length
    ? cfg.localAllowedBases[0]
    : path.join(process.cwd(), "server", "data");
  const dir = path.join(preferredBase, "BRMedia Converted");
  ensureDirSyncServer(dir);
  return dir;
}

function safeConverterToken(value: any, fallback = "BRMedia Converted") {
  return (firstString(value) || fallback)
    .replace(/[^a-z0-9_\- ]+/gi, "_")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 96) || fallback;
}

function uniqueConverterOutputPath(sourcePath: string, outputFormat: string, suffix: string) {
  const parsed = path.parse(sourcePath || "converted-media");
  const outDir = getConverterOutputDir();
  const safeSuffix = safeConverterToken(suffix, "BRMedia Converted");
  const ext = `.${String(outputFormat || "mp3").replace(/[^a-z0-9]+/gi, "").toLowerCase() || "mp3"}`;
  const base = safeConverterToken(`${parsed.name} - ${safeSuffix}`, "BRMedia Converted");
  let candidate = path.join(outDir, `${base}${ext}`);
  let counter = 2;

  while (fs.existsSync(candidate)) {
    candidate = path.join(outDir, `${base} ${counter}${ext}`);
    counter += 1;
  }

  return candidate;
}

function isConverterAudioOutputFormat(format: string) {
  return ["mp3", "wav", "flac", "m4a", "aac", "ogg", "opus", "aiff"].includes(String(format || "").toLowerCase());
}

function normaliseConverterChoice(value: any, allowed: string[], fallback = "") {
  const text = firstString(value)?.toLowerCase() || "";
  return allowed.includes(text) ? text : fallback;
}

function parsePositiveNumber(value: any, fallback = 0, max = 999999) {
  const num = Number(value || 0);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return Math.min(num, max);
}

function getConverterSource(body: any) {
  const uploadId = firstString(body?.source?.uploadId || body?.uploadId);
  if (uploadId) {
    const uploaded = CONVERTER_UPLOADS.get(uploadId);
    if (!uploaded) return { ok: false, error: "Converter upload not found" };
    if (!fs.existsSync(uploaded.path)) return { ok: false, error: "Uploaded converter source is missing" };
    return { ok: true, path: uploaded.path, title: uploaded.fileName, source: uploaded };
  }

  const trackId = firstString(body?.source?.trackId || body?.trackId || body?.id);
  if (!trackId) return { ok: false, error: "Missing converter source" };

  const item = getLibraryItem(trackId);
  if (!item) return { ok: false, error: "Selected library item not found" };
  if (item.source !== "local") return { ok: false, error: "Cloud-linked files need Import local copy before Converter can write files." };

  const allowed = validateLocalPathAllowed(item.locator, cfg.localAllowedBases);
  if (!allowed.ok) return { ok: false, error: allowed.reason };
  if (!fs.existsSync(item.locator)) return { ok: false, error: "Source file missing" };

  return { ok: true, path: item.locator, title: item.title || path.basename(item.locator), source: item };
}

async function handleConverterUpload(fileNameRaw: string, buffer: Buffer, mimeType = "") {
  if (!buffer.length) return { ok: false, error: "Empty upload body" };

  const uploadDir = getConverterUploadDir();
  const fileName = safeUploadFilename(fileNameRaw || "converter-upload.bin");
  let targetPath = path.join(uploadDir, fileName);
  const parsed = path.parse(fileName);
  let counter = 2;

  while (fs.existsSync(targetPath)) {
    targetPath = path.join(uploadDir, `${parsed.name}_${counter}${parsed.ext}`);
    counter += 1;
  }

  fs.writeFileSync(targetPath, buffer);

  const id = makeConverterId("converter_upload");
  const stat = fs.statSync(targetPath);
  const source = {
    id,
    converterUploadId: id,
    title: path.parse(fileName).name.replace(/[_]+/g, " "),
    fileName: path.basename(targetPath),
    mimeType,
    sizeBytes: stat.size,
    source: "converter_upload",
    sourceType: "converter-upload",
    locator: path.basename(targetPath),
    path: targetPath,
    createdAt: Date.now(),
  };

  CONVERTER_UPLOADS.set(id, source);
  return { ok: true, source };
}

function defaultAudioCodecForFormat(format: string) {
  switch (format) {
    case "mp3": return "libmp3lame";
    case "wav": return "pcm_s16le";
    case "aiff": return "pcm_s16be";
    case "flac": return "flac";
    case "ogg": return "libvorbis";
    case "opus": return "libopus";
    case "m4a":
    case "aac": return "aac";
    default: return "aac";
  }
}

function defaultVideoCodecForFormat(format: string) {
  switch (format) {
    case "webm": return "libvpx-vp9";
    case "avi": return "mpeg4";
    default: return "libx264";
  }
}

function normaliseConverterOptions(body: any) {
  const outputFormat = normaliseConverterChoice(
    body?.outputFormat,
    ["mp3", "wav", "flac", "m4a", "aac", "ogg", "opus", "aiff", "mp4", "mov", "mkv", "webm", "avi"],
    "mp3"
  );
  const outputType = body?.outputType === "video" || !isConverterAudioOutputFormat(outputFormat) ? "video" : "audio";

  return {
    outputType,
    outputFormat,
    outputName: safeConverterToken(body?.outputName, "BRMedia Converted"),
    audioCodec: normaliseConverterChoice(
      body?.audioCodec,
      ["auto", "copy", "libmp3lame", "aac", "pcm_s16le", "pcm_s16be", "pcm_s24le", "flac", "libvorbis", "libopus"],
      "auto"
    ),
    videoCodec: normaliseConverterChoice(
      body?.videoCodec,
      ["auto", "copy", "libx264", "libx265", "libvpx-vp9", "libaom-av1", "prores_ks", "mpeg4"],
      "auto"
    ),
    audioBitrate: normaliseConverterChoice(body?.audioBitrate, ["", "128k", "192k", "256k", "320k", "512k"], ""),
    sampleRate: normaliseConverterChoice(body?.sampleRate, ["", "44100", "48000", "88200", "96000"], ""),
    channels: normaliseConverterChoice(body?.channels, ["", "1", "2", "6"], ""),
    videoBitrate: normaliseConverterChoice(body?.videoBitrate, ["", "1500k", "3000k", "6000k", "10000k", "20000k"], ""),
    crf: normaliseConverterChoice(body?.crf, ["", "16", "18", "20", "23", "28"], ""),
    preset: normaliseConverterChoice(body?.preset, ["", "ultrafast", "veryfast", "fast", "medium", "slow"], ""),
    frameRate: normaliseConverterChoice(body?.frameRate, ["", "24", "25", "30", "50", "60"], ""),
    resolution: normaliseConverterChoice(body?.resolution, ["", "720p", "1080p", "1440p", "2160p"], ""),
    trimStart: parsePositiveNumber(body?.trimStart, 0, 24 * 3600),
    trimDuration: parsePositiveNumber(body?.trimDuration, 0, 24 * 3600),
    volume: normaliseConverterChoice(body?.volume, ["", "0.5", "0.75", "1", "1.25", "1.5"], ""),
    normalizeAudio: body?.normalizeAudio === true,
    fastStart: body?.fastStart !== false,
    removeAudio: body?.removeAudio === true,
    addToLibrary: body?.addToLibrary !== false,
  };
}

function appendConverterAudioOptions(args: string[], options: any, outputFormat: string) {
  const audioCodec = options.audioCodec === "auto" ? defaultAudioCodecForFormat(outputFormat) : options.audioCodec;

  if (audioCodec) args.push("-c:a", audioCodec);

  if (
    options.audioBitrate &&
    !String(audioCodec).startsWith("pcm") &&
    audioCodec !== "flac" &&
    audioCodec !== "copy"
  ) {
    args.push("-b:a", options.audioBitrate);
  }

  if (options.sampleRate) args.push("-ar", options.sampleRate);
  if (options.channels) args.push("-ac", options.channels);

  const audioFilters: string[] = [];

  if (options.normalizeAudio) {
    audioFilters.push("loudnorm=I=-14:TP=-1.5:LRA=11");
  }

  if (options.volume) {
    audioFilters.push(`volume=${options.volume}`);
  }

  if (audioFilters.length && audioCodec !== "copy") {
    args.push("-af", audioFilters.join(","));
  }
}

function appendConverterVideoOptions(args: string[], options: any, outputFormat: string) {
  const videoCodec = options.videoCodec === "auto" ? defaultVideoCodecForFormat(outputFormat) : options.videoCodec;

  if (videoCodec) args.push("-c:v", videoCodec);

  if (options.videoBitrate && videoCodec !== "copy") {
    args.push("-b:v", options.videoBitrate);
  }

  if (options.crf && videoCodec !== "copy") {
    args.push("-crf", options.crf);
  }

  if (options.preset && ["libx264", "libx265", "libvpx-vp9", "libaom-av1"].includes(videoCodec)) {
    args.push("-preset", options.preset);
  }

  if (options.frameRate) args.push("-r", options.frameRate);

  const videoFilters: string[] = [];
  const scaleMap: Record<string, string> = {
    "720p": "scale=-2:720",
    "1080p": "scale=-2:1080",
    "1440p": "scale=-2:1440",
    "2160p": "scale=-2:2160",
  };

  if (scaleMap[options.resolution]) {
    videoFilters.push(scaleMap[options.resolution]);
  }

  if (videoFilters.length && videoCodec !== "copy") {
    args.push("-vf", videoFilters.join(","));
  }
}

function buildConverterArgs(inputPath: string, outputPath: string, options: any) {
  const args = ["-y"];

  if (options.trimStart > 0) {
    args.push("-ss", String(options.trimStart));
  }

  args.push("-i", inputPath);
  args.push("-map_metadata", "0");

  if (options.trimDuration > 0) {
    args.push("-t", String(options.trimDuration));
  }

  if (options.outputType === "audio") {
    args.push("-map", "0:a:0?", "-vn");
    appendConverterAudioOptions(args, options, options.outputFormat);
  } else {
    args.push("-map", "0:v:0?");

    if (options.removeAudio) {
      args.push("-an");
    } else {
      args.push("-map", "0:a:0?");
    }

    appendConverterVideoOptions(args, options, options.outputFormat);

    if (!options.removeAudio) {
      appendConverterAudioOptions(args, options, options.outputFormat === "webm" ? "opus" : "aac");
    }

    if (["mp4", "mov"].includes(options.outputFormat) && options.fastStart) {
      args.push("-movflags", "+faststart");
    }
  }

  args.push(outputPath);
  return args;
}

function runConverterFfmpeg(args: string[], job: any) {
  return new Promise<void>((resolve, reject) => {
    const ffmpeg = spawn(resolvePreviewFfmpegPath(), args, { windowsHide: true });
    job.process = ffmpeg;
    let stderr = "";

    ffmpeg.stderr.on("data", (chunk) => {
      const text = String(chunk || "");
      stderr += text;

      if (stderr.length > 16000) {
        stderr = stderr.slice(-16000);
      }

      const line = text.split(/\r?\n/).filter(Boolean).pop();

      if (line) {
        job.message = line.slice(0, 220);
      }
    });

    ffmpeg.on("error", reject);

    ffmpeg.on("close", (code: number | null) => {
      job.process = null;

      if (job.cancelRequested) {
        reject(new Error("Converter job cancelled"));
        return;
      }

      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr.trim() || `ffmpeg exited ${code}`));
    });
  });
}

async function runConverterJob(job: any, inputPath: string, options: any) {
  try {
    job.status = "running";
    job.message = "FFmpeg conversion started.";
    CONVERTER_JOBS.set(job.id, job);

    const args = buildConverterArgs(inputPath, job.outputPath, options);
    job.ffmpegArgs = args;

    await runConverterFfmpeg(args, job);

    if (!fs.existsSync(job.outputPath)) {
      throw new Error("Converted file was not created");
    }

    const stat = fs.statSync(job.outputPath);

    if (!stat.isFile() || stat.size < 64) {
      throw new Error("Converted file looks empty");
    }

    let libraryItem: any = null;

    if (options.addToLibrary && isSupportedAudioFile(job.outputPath) && !findLibraryItemByLocator(job.outputPath)) {
      libraryItem = addLocalFileToLibrary(job.outputPath);

      void queueWaveformGenerationForItems([libraryItem], {
        peakCount: DEFAULT_WAVEFORM_PEAKS,
        onlyMissing: true,
      });
    }

    job.status = "done";
    job.sizeBytes = stat.size;
    job.libraryItem = libraryItem;
    job.downloadUrl = `/brmedia/converter/jobs/${encodeURIComponent(job.id)}/download`;
    job.message = libraryItem
      ? "Conversion complete and audio output was added to BRMedia library."
      : "Conversion complete. Download is ready.";

    CONVERTER_JOBS.set(job.id, job);
  } catch (err: any) {
    const wasCancelled = !!job.cancelRequested;
    job.status = wasCancelled ? "cancelled" : "error";
    job.error = wasCancelled ? "" : String(err?.message || err);
    job.message = wasCancelled ? "Conversion cancelled. Partial output was removed." : job.error;
    job.process = null;

    try {
      if (job.outputPath && fs.existsSync(job.outputPath)) {
        fs.unlinkSync(job.outputPath);
      }
    } catch {}

    CONVERTER_JOBS.set(job.id, job);
  }
}

async function startConverterJob(body: any) {
  const source = getConverterSource(body || {});

  if (!source.ok) {
    return source;
  }

  const options = normaliseConverterOptions(body || {});
  const outputPath = uniqueConverterOutputPath(source.path, options.outputFormat, options.outputName);
  const id = makeConverterId("converter_job");

  const job = {
    id,
    status: "queued",
    message: "Queued for FFmpeg.",
    sourceTitle: source.title,
    outputPath,
    fileName: path.basename(outputPath),
    outputFormat: options.outputFormat,
    outputType: options.outputType,
    createdAt: Date.now(),
    downloadUrl: "",
  };

  CONVERTER_JOBS.set(id, job);
  void runConverterJob(job, source.path, options);

  return { ok: true, job };
}

function getPublicConverterJob(jobId: string) {
  const job = CONVERTER_JOBS.get(jobId);

  if (!job) return null;

  return {
    id: job.id,
    status: job.status,
    message: job.message,
    error: job.error,
    sourceTitle: job.sourceTitle,
    fileName: job.fileName,
    outputFormat: job.outputFormat,
    outputType: job.outputType,
    sizeBytes: job.sizeBytes,
    downloadUrl: job.downloadUrl,
    libraryItem: job.libraryItem,
    createdAt: job.createdAt,
  };
}

function cancelConverterJob(jobId: string) {
  const job = CONVERTER_JOBS.get(jobId);
  if (!job) return null;

  if (!["queued", "running"].includes(String(job.status || ""))) {
    return job;
  }

  job.cancelRequested = true;
  job.message = "Cancelling conversion…";

  try {
    if (job.process && typeof job.process.kill === "function") {
      job.process.kill("SIGTERM");
    } else {
      job.status = "cancelled";
      job.message = "Conversion cancelled before FFmpeg started.";
    }
  } catch (err: any) {
    job.status = "error";
    job.error = String(err?.message || err);
    job.message = job.error;
  }

  CONVERTER_JOBS.set(job.id, job);
  return getPublicConverterJob(job.id);
}

function makeMasteringId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function getMasteringUploadDir() {
  const preferredBase = Array.isArray(cfg.localAllowedBases) && cfg.localAllowedBases.length
    ? cfg.localAllowedBases[0]
    : path.join(process.cwd(), "server", "data");
  const dir = path.join(preferredBase, "BRMedia Mastering Uploads");
  ensureDirSyncServer(dir);
  return dir;
}

function getMasteringOutputDir() {
  const preferredBase = Array.isArray(cfg.localAllowedBases) && cfg.localAllowedBases.length
    ? cfg.localAllowedBases[0]
    : path.join(process.cwd(), "server", "data");
  const dir = path.join(preferredBase, "BRMedia Masters");
  ensureDirSyncServer(dir);
  return dir;
}

function safeMasteringToken(value: any, fallback = "BRMedia Master") {
  return (firstString(value) || fallback)
    .replace(/[^a-z0-9_\- ]+/gi, "_")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 96) || fallback;
}

function uniqueMasteringOutputPath(sourcePath: string, outputFormat: string, suffix: string) {
  const parsed = path.parse(sourcePath || "mastered-audio");
  const outDir = getMasteringOutputDir();
  const safeSuffix = safeMasteringToken(suffix, "BRMedia Master");
  const ext = `.${String(outputFormat || "mp3").replace(/[^a-z0-9]+/gi, "").toLowerCase() || "mp3"}`;
  const base = safeMasteringToken(`${parsed.name} - ${safeSuffix}`, "BRMedia Master");
  let candidate = path.join(outDir, `${base}${ext}`);
  let counter = 2;

  while (fs.existsSync(candidate)) {
    candidate = path.join(outDir, `${base} ${counter}${ext}`);
    counter += 1;
  }

  return candidate;
}

async function handleMasteringUpload(fileNameRaw: string, buffer: Buffer, mimeType = "") {
  if (!buffer.length) return { ok: false, error: "Empty upload body" };

  const uploadDir = getMasteringUploadDir();
  const fileName = safeUploadFilename(fileNameRaw || "mastering-upload.bin");
  let targetPath = path.join(uploadDir, fileName);
  const parsed = path.parse(fileName);
  let counter = 2;

  while (fs.existsSync(targetPath)) {
    targetPath = path.join(uploadDir, `${parsed.name}_${counter}${parsed.ext}`);
    counter += 1;
  }

  fs.writeFileSync(targetPath, buffer);

  const id = makeMasteringId("mastering_upload");
  const stat = fs.statSync(targetPath);
  const source = {
    id,
    masteringUploadId: id,
    title: path.parse(fileName).name.replace(/[_]+/g, " "),
    fileName: path.basename(targetPath),
    mimeType,
    sizeBytes: stat.size,
    source: "mastering_upload",
    sourceType: "mastering-upload",
    locator: path.basename(targetPath),
    path: targetPath,
    createdAt: Date.now(),
  };

  MASTERING_UPLOADS.set(id, source);
  return { ok: true, source };
}

function getMasteringSource(body: any) {
  const uploadId = firstString(body?.source?.uploadId || body?.uploadId);
  if (uploadId) {
    const uploaded = MASTERING_UPLOADS.get(uploadId);
    if (!uploaded) return { ok: false, error: "Mastering upload not found" };
    if (!fs.existsSync(uploaded.path)) return { ok: false, error: "Uploaded mastering source is missing" };
    return { ok: true, path: uploaded.path, title: uploaded.fileName, source: uploaded };
  }

  const trackId = firstString(body?.source?.trackId || body?.trackId || body?.id);
  if (!trackId) return { ok: false, error: "Missing mastering source" };

  const item = getLibraryItem(trackId);
  if (!item) return { ok: false, error: "Selected library item not found" };
  if (item.source !== "local") return { ok: false, error: "Cloud-linked files need Import local copy before Mastering can render files." };

  const allowed = validateLocalPathAllowed(item.locator, cfg.localAllowedBases);
  if (!allowed.ok) return { ok: false, error: allowed.reason };
  if (!fs.existsSync(item.locator)) return { ok: false, error: "Source file missing" };
  if (!isSupportedAudioFile(item.locator)) return { ok: false, error: "Mastering supports audio files only." };

  return { ok: true, path: item.locator, title: item.title || path.basename(item.locator), source: item };
}

function normaliseMasteringOptions(body: any) {
  const outputFormat = normaliseConverterChoice(body?.outputFormat, ["mp3", "wav", "flac", "m4a"], "mp3");
  const targetLufs = normaliseConverterChoice(body?.targetLufs, ["-16", "-14", "-12", "-10", "-9"], "-14");
  const truePeak = normaliseConverterChoice(body?.truePeak, ["-2", "-1.5", "-1", "-0.6"], "-1.5");

  return {
    outputFormat,
    outputName: safeMasteringToken(body?.outputName, "BRMedia Master"),
    preset: normaliseConverterChoice(body?.preset, ["streaming-clean", "club-loud", "warm-depth", "hardcore-punch"], "streaming-clean"),
    targetLufs,
    truePeak,
    compression: normaliseConverterChoice(body?.compression, ["gentle", "medium", "hard"], "medium"),
    stereoWidth: normaliseConverterChoice(body?.stereoWidth, ["1", "1.08", "1.18", "1.28"], "1.08"),
    bass: normaliseConverterChoice(body?.bass, ["0", "1", "2", "3"], "1"),
    warmth: normaliseConverterChoice(body?.warmth, ["0", "1", "2"], "1"),
    brightness: normaliseConverterChoice(body?.brightness, ["0", "1", "2", "3"], "1"),
    limiterDrive: normaliseConverterChoice(body?.limiterDrive, ["0", "1", "2", "3"], "1"),
    intensity: normaliseConverterChoice(body?.intensity, ["25", "50", "75", "100"], "50"),
    lowCut: normaliseConverterChoice(body?.lowCut, ["20", "30", "40"], "20"),
    deHarsh: normaliseConverterChoice(body?.deHarsh, ["off", "light", "medium", "strong"], "light"),
    air: normaliseConverterChoice(body?.air, ["0", "1", "2"], "1"),
    addToLibrary: body?.addToLibrary !== false,
    preserveMetadata: body?.preserveMetadata !== false,
  };
}

function limiterValueForTruePeak(truePeak: string) {
  const db = Number(truePeak || -1.5);
  if (!Number.isFinite(db)) return "0.841";
  return Math.max(0.5, Math.min(0.99, Math.pow(10, db / 20))).toFixed(3);
}

function getMasteringIntensityScale(intensity: string) {
  if (intensity === "100") return 1.25;
  if (intensity === "75") return 1;
  if (intensity === "25") return 0.5;
  return 0.75;
}

function getMasteringDeHarshGain(mode: string) {
  if (mode === "strong") return -3;
  if (mode === "medium") return -2;
  if (mode === "light") return -1;
  return 0;
}

function getMasteringCompressionFilter(mode: string, drive: string) {
  const driveGain = drive === "3" ? 4 : drive === "2" ? 3 : drive === "1" ? 2 : 0;
  if (mode === "hard") return `acompressor=threshold=-20dB:ratio=3.5:attack=6:release=80:makeup=${driveGain}`;
  if (mode === "gentle") return `acompressor=threshold=-16dB:ratio=1.8:attack=16:release=140:makeup=${Math.max(0, driveGain - 1)}`;
  return `acompressor=threshold=-18dB:ratio=2.5:attack=10:release=100:makeup=${driveGain}`;
}

function buildMasteringFilters(options: any) {
  const scale = getMasteringIntensityScale(String(options.intensity || "50"));
  const lowCut = normaliseConverterChoice(options.lowCut, ["20", "30", "40"], "20");
  const filters: string[] = [`highpass=f=${lowCut}`, "lowpass=f=20000"];

  const bass = Number(options.bass || 0) * scale;
  const warmth = Number(options.warmth || 0) * scale;
  const brightness = Number(options.brightness || 0) * scale;
  const air = Number(options.air || 0) * scale;
  const deHarshGain = getMasteringDeHarshGain(String(options.deHarsh || "light"));

  if (bass > 0) filters.push(`equalizer=f=90:t=q:w=1.1:g=${bass.toFixed(2)}`);
  if (warmth > 0) filters.push(`equalizer=f=240:t=q:w=1.0:g=${warmth.toFixed(2)}`);
  if (brightness > 0) filters.push(`equalizer=f=6500:t=q:w=1.0:g=${brightness.toFixed(2)}`);
  if (air > 0) filters.push(`equalizer=f=12000:t=q:w=0.8:g=${air.toFixed(2)}`);
  if (deHarshGain < 0) filters.push(`equalizer=f=3200:t=q:w=1.2:g=${deHarshGain}`);

  filters.push(getMasteringCompressionFilter(options.compression, options.limiterDrive));
  if (String(options.stereoWidth) !== "1") filters.push(`extrastereo=m=${options.stereoWidth}`);
  filters.push(`loudnorm=I=${options.targetLufs}:TP=${options.truePeak}:LRA=9`);
  filters.push(`alimiter=limit=${limiterValueForTruePeak(options.truePeak)}:level=disabled`);
  return filters.join(",");
}

function appendMasteringOutputCodec(args: string[], format: string) {
  if (format === "wav") {
    args.push("-c:a", "pcm_s24le", "-ar", "48000");
    return;
  }
  if (format === "flac") {
    args.push("-c:a", "flac", "-compression_level", "8");
    return;
  }
  if (format === "m4a") {
    args.push("-c:a", "aac", "-b:a", "320k");
    return;
  }
  args.push("-c:a", "libmp3lame", "-b:a", "320k");
}

function buildMasteringArgs(inputPath: string, outputPath: string, options: any) {
  const args = ["-y", "-i", inputPath];
  if (options.preserveMetadata) args.push("-map_metadata", "0");
  args.push("-vn", "-af", buildMasteringFilters(options));
  appendMasteringOutputCodec(args, options.outputFormat);
  args.push(outputPath);
  return args;
}

function runMasteringFfmpeg(args: string[], job: any) {
  return new Promise<void>((resolve, reject) => {
    const ffmpeg = spawn(resolvePreviewFfmpegPath(), args, { windowsHide: true });
    job.process = ffmpeg;
    let stderr = "";

    ffmpeg.stderr.on("data", (chunk) => {
      const text = String(chunk || "");
      stderr += text;
      if (stderr.length > 16000) stderr = stderr.slice(-16000);
      const line = text.split(/\r?\n/).filter(Boolean).pop();
      if (line) job.message = line.slice(0, 220);
    });

    ffmpeg.on("error", reject);
    ffmpeg.on("close", (code: number | null) => {
      job.process = null;
      if (job.cancelRequested) {
        reject(new Error("Mastering job cancelled"));
        return;
      }
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(stderr.trim() || `ffmpeg exited ${code}`));
    });
  });
}

async function runMasteringJob(job: any, inputPath: string, options: any) {
  try {
    job.status = "running";
    job.message = "FFmpeg mastering chain started.";
    MASTERING_JOBS.set(job.id, job);

    const args = buildMasteringArgs(inputPath, job.outputPath, options);
    job.ffmpegArgs = args;
    await runMasteringFfmpeg(args, job);

    if (!fs.existsSync(job.outputPath)) throw new Error("Mastered file was not created");
    const stat = fs.statSync(job.outputPath);
    if (!stat.isFile() || stat.size < 64) throw new Error("Mastered file looks empty");

    let libraryItem: any = null;
    if (options.addToLibrary && isSupportedAudioFile(job.outputPath) && !findLibraryItemByLocator(job.outputPath)) {
      libraryItem = addLocalFileToLibrary(job.outputPath);
      void queueWaveformGenerationForItems([libraryItem], {
        peakCount: DEFAULT_WAVEFORM_PEAKS,
        onlyMissing: true,
      });
    }

    job.status = "done";
    job.sizeBytes = stat.size;
    job.libraryItem = libraryItem;
    job.downloadUrl = `/brmedia/mastering/jobs/${encodeURIComponent(job.id)}/download`;
    job.message = libraryItem
      ? "Mastering complete and the mastered copy was added to BRMedia library."
      : "Mastering complete. Download is ready.";
    MASTERING_JOBS.set(job.id, job);
  } catch (err: any) {
    const wasCancelled = !!job.cancelRequested;
    job.status = wasCancelled ? "cancelled" : "error";
    job.error = wasCancelled ? "" : String(err?.message || err);
    job.message = wasCancelled ? "Mastering cancelled. Partial output was removed." : job.error;
    job.process = null;

    try {
      if (job.outputPath && fs.existsSync(job.outputPath)) fs.unlinkSync(job.outputPath);
    } catch {}

    MASTERING_JOBS.set(job.id, job);
  }
}

function parseLastNumberMatch(text: string, regex: RegExp) {
  const matches = [...String(text || "").matchAll(regex)];
  if (!matches.length) return null;
  const raw = matches[matches.length - 1]?.[1];
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function parseMasteringAnalysisStderr(stderr: string) {
  const text = String(stderr || "");

  const integratedLufs = parseLastNumberMatch(text, /\bI:\s*(-?\d+(?:\.\d+)?)\s*LUFS/g);
  const loudnessRange = parseLastNumberMatch(text, /\bLRA:\s*(\d+(?:\.\d+)?)\s*LU/g);
  const truePeak = parseLastNumberMatch(text, /\bPeak:\s*(-?\d+(?:\.\d+)?)\s*dBFS/g);
  const meanVolume = parseLastNumberMatch(text, /mean_volume:\s*(-?\d+(?:\.\d+)?)\s*dB/g);
  const maxVolume = parseLastNumberMatch(text, /max_volume:\s*(-?\d+(?:\.\d+)?)\s*dB/g);

  return {
    integratedLufs,
    loudnessRange,
    truePeak,
    meanVolume,
    maxVolume,
  };
}

function runMasteringAnalysisFfmpeg(inputPath: string) {
  return new Promise<string>((resolve, reject) => {
    const args = [
      "-hide_banner",
      "-nostats",
      "-i",
      inputPath,
      "-vn",
      "-af",
      "ebur128=peak=true,volumedetect",
      "-f",
      "null",
      "-",
    ];

    const ffmpeg = spawn(resolvePreviewFfmpegPath(), args, { windowsHide: true });
    let stderr = "";
    const timeout = setTimeout(() => {
      try {
        ffmpeg.kill("SIGTERM");
      } catch {}
      reject(new Error("Mastering analysis timed out"));
    }, 15 * 60 * 1000);

    ffmpeg.stderr.on("data", (chunk) => {
      stderr += String(chunk || "");
      if (stderr.length > 120000) stderr = stderr.slice(-120000);
    });

    ffmpeg.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    ffmpeg.on("close", (code: number | null) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve(stderr);
        return;
      }
      reject(new Error(stderr.trim() || `ffmpeg analysis exited ${code}`));
    });
  });
}

async function readMasteringSourceMetadata(filePath: string) {
  try {
    const stat = fs.statSync(filePath);
    const meta = await mm.parseFile(filePath, { duration: true });
    const format = meta.format || {};
    return {
      sizeBytes: stat.size,
      duration: Number(format.duration || 0) || 0,
      bitrate: Number(format.bitrate || 0) || 0,
      sampleRate: Number(format.sampleRate || 0) || 0,
      channels: Number(format.numberOfChannels || 0) || 0,
      codec: firstString(format.codec || format.container) || "",
      container: firstString(format.container) || "",
    };
  } catch {
    try {
      const stat = fs.statSync(filePath);
      return {
        sizeBytes: stat.size,
        duration: 0,
        bitrate: 0,
        sampleRate: 0,
        channels: 0,
        codec: "",
        container: "",
      };
    } catch {
      return {
        sizeBytes: 0,
        duration: 0,
        bitrate: 0,
        sampleRate: 0,
        channels: 0,
        codec: "",
        container: "",
      };
    }
  }
}

function buildMasteringAnalysisWarnings(metrics: any, meta: any) {
  const warnings: any[] = [];

  if (typeof metrics.maxVolume === "number" && metrics.maxVolume >= -0.2) {
    warnings.push({
      mode: "warn",
      title: "Peak is very close to 0 dB",
      body: "The source is already hot. Use a safer true peak ceiling or a gentler preset if it sounds crushed.",
    });
  }

  if (typeof metrics.integratedLufs === "number" && metrics.integratedLufs > -9) {
    warnings.push({
      mode: "warn",
      title: "Source is already very loud",
      body: "Avoid heavy extra limiting unless this is a club/hardcore version.",
    });
  }

  if (typeof metrics.integratedLufs === "number" && metrics.integratedLufs < -24) {
    warnings.push({
      mode: "info",
      title: "Source is quiet",
      body: "Mastering can lift this, but check noise and low-level artefacts after render.",
    });
  }

  if (typeof metrics.loudnessRange === "number" && metrics.loudnessRange > 14) {
    warnings.push({
      mode: "info",
      title: "Wide dynamics",
      body: "This file has a wide loudness range. A gentle preset may keep more life in the mix.",
    });
  }

  if (meta.sampleRate && meta.sampleRate < 44100) {
    warnings.push({
      mode: "warn",
      title: "Low sample rate",
      body: `Detected ${meta.sampleRate} Hz. Mastering will work, but quality depends on the source.`,
    });
  }

  return warnings;
}

function recommendMasteringPreset(metrics: any) {
  const lufs = Number(metrics.integratedLufs);
  const lra = Number(metrics.loudnessRange);
  const max = Number(metrics.maxVolume);

  if (Number.isFinite(max) && max >= -0.2) {
    return {
      preset: "streaming-clean",
      title: "Streaming Clean recommended",
      body: "The source is already hot, so a cleaner chain is the safest first pass.",
    };
  }

  if (Number.isFinite(lufs) && lufs < -20) {
    return {
      preset: "club-loud",
      title: "Club Loud can lift this",
      body: "The source looks quiet, so a louder master should give you a clearer comparison.",
    };
  }

  if (Number.isFinite(lra) && lra > 12) {
    return {
      preset: "warm-depth",
      title: "Warm Depth recommended",
      body: "Wide dynamics detected. Warm Depth should keep it smoother before going loud.",
    };
  }

  return {
    preset: "streaming-clean",
    title: "Streaming Clean recommended",
    body: "Good all-round first master for online playback and checking translation.",
  };
}

async function analyseMasteringSource(body: any) {
  const source = getMasteringSource(body || {});
  if (!source.ok) return source;

  const meta = await readMasteringSourceMetadata(source.path);
  const stderr = await runMasteringAnalysisFfmpeg(source.path);
  const metrics = parseMasteringAnalysisStderr(stderr);
  const warnings = buildMasteringAnalysisWarnings(metrics, meta);
  const recommendation = recommendMasteringPreset(metrics);

  return {
    ok: true,
    sourceTitle: source.title,
    sourcePath: source.path,
    analysis: {
      analysedAt: Date.now(),
      metrics,
      meta,
      warnings,
      recommendation,
    },
  };
}

async function startMasteringJob(body: any) {
  const source = getMasteringSource(body || {});
  if (!source.ok) return source;

  const options = normaliseMasteringOptions(body || {});
  const outputPath = uniqueMasteringOutputPath(source.path, options.outputFormat, options.outputName);
  const id = makeMasteringId("mastering_job");
  const job = {
    id,
    status: "queued",
    message: "Queued for FFmpeg mastering.",
    sourceTitle: source.title,
    outputPath,
    fileName: path.basename(outputPath),
    outputFormat: options.outputFormat,
    preset: options.preset,
    targetLufs: options.targetLufs,
    truePeak: options.truePeak,
    createdAt: Date.now(),
    downloadUrl: "",
  };

  MASTERING_JOBS.set(id, job);
  void runMasteringJob(job, source.path, options);
  return { ok: true, job };
}

function getPublicMasteringJob(jobId: string) {
  const job = MASTERING_JOBS.get(jobId);
  if (!job) return null;
  return {
    id: job.id,
    status: job.status,
    message: job.message,
    error: job.error,
    sourceTitle: job.sourceTitle,
    fileName: job.fileName,
    outputFormat: job.outputFormat,
    preset: job.preset,
    targetLufs: job.targetLufs,
    truePeak: job.truePeak,
    sizeBytes: job.sizeBytes,
    downloadUrl: job.downloadUrl,
    libraryItem: job.libraryItem,
    createdAt: job.createdAt,
  };
}

function cancelMasteringJob(jobId: string) {
  const job = MASTERING_JOBS.get(jobId);
  if (!job) return null;
  if (!["queued", "running"].includes(String(job.status || ""))) return getPublicMasteringJob(job.id);

  job.cancelRequested = true;
  job.message = "Cancelling mastering render…";

  try {
    if (job.process && typeof job.process.kill === "function") {
      job.process.kill("SIGTERM");
    } else {
      job.status = "cancelled";
      job.message = "Mastering cancelled before FFmpeg started.";
    }
  } catch (err: any) {
    job.status = "error";
    job.error = String(err?.message || err);
    job.message = job.error;
  }

  MASTERING_JOBS.set(job.id, job);
  return getPublicMasteringJob(job.id);
}

function detectMixBadge(meta: {
  albumArtist?: string | null;
  artist?: string | null;
  comment?: string | null;
  title?: string | null;
}) {
  const artistSource = [meta.albumArtist || "", meta.artist || ""].join(" | ").toLowerCase();
  const titleSource = String(meta.title || "").toLowerCase();
  const weakSource = String(meta.comment || "").toLowerCase();
  const fullSource = [artistSource, titleSource, weakSource].join(" | ");

  const hasBlackburnRaversStrong = /blackburn\s*ravers|blackburnravers|bb\s*ravers/.test(`${artistSource} ${titleSource}`);
  const hasNjStrong = /\bdj\s*nj\b|\bnj\b/.test(artistSource);
  const hasUpalniteStrong = /\bupalnite\b/.test(artistSource);

  if (hasBlackburnRaversStrong) return "br";
  if (hasNjStrong && hasUpalniteStrong) return "br";
  if (hasNjStrong) return "nj";
  if (hasUpalniteStrong) return "up";

  const hasBlackburnRavers = /blackburn\s*ravers|blackburnravers|bb\s*ravers/.test(fullSource);
  const hasNj = /\bdj\s*nj\b|\bnj\b/.test(fullSource);
  const hasUpalnite = /\bupalnite\b/.test(fullSource);

  if (hasBlackburnRavers && !hasNj && !hasUpalnite) return "br";
  if (hasNj && !hasUpalnite) return "nj";
  if (hasUpalnite && !hasNj) return "up";

  return "br";
}

function setAdvancedMetadataTag(output: Record<string, string>, key: string, value: any) {
  const text = firstString(value);
  if (!text) return;
  output[key] = text;
}

function extractAdvancedTrackMetadata(meta: any = {}) {
  const output: Record<string, string> = {};
  const common = meta?.common || {};
  const native = meta?.native || {};

  setAdvancedMetadataTag(output, "composer", common.composer);
  setAdvancedMetadataTag(output, "conductor", common.conductor);
  setAdvancedMetadataTag(output, "performer", common.performer);
  setAdvancedMetadataTag(output, "producer", common.producer);
  setAdvancedMetadataTag(output, "publisher", common.publisher);
  setAdvancedMetadataTag(output, "author", common.author);
  setAdvancedMetadataTag(output, "writer", common.writer);
  setAdvancedMetadataTag(output, "lyricist", common.lyricist);
  setAdvancedMetadataTag(output, "copyright", common.copyright);
  setAdvancedMetadataTag(output, "encoded_by", common.encodedby);
  setAdvancedMetadataTag(output, "isrc", common.isrc);
  setAdvancedMetadataTag(output, "barcode", common.barcode);
  setAdvancedMetadataTag(output, "catalog_number", common.catalognumber);
  setAdvancedMetadataTag(output, "media_type", common.media);
  setAdvancedMetadataTag(output, "mood", common.mood);
  setAdvancedMetadataTag(output, "language", common.language);
  setAdvancedMetadataTag(output, "rating", common.rating);
  setAdvancedMetadataTag(output, "lyrics", common.lyrics);
  setAdvancedMetadataTag(output, "description", common.description);
  setAdvancedMetadataTag(output, "MUSICBRAINZ_ALBUMARTISTID", common.musicbrainz_albumartistid);
  setAdvancedMetadataTag(output, "MUSICBRAINZ_ALBUMID", common.musicbrainz_albumid);
  setAdvancedMetadataTag(output, "MUSICBRAINZ_ARTISTID", common.musicbrainz_artistid);
  setAdvancedMetadataTag(output, "MUSICBRAINZ_RELEASEGROUPID", common.musicbrainz_releasegroupid);
  setAdvancedMetadataTag(output, "MUSICBRAINZ_RELEASETRACKID", common.musicbrainz_releasetrackid);
  setAdvancedMetadataTag(output, "MUSICBRAINZ_TRACKID", common.musicbrainz_trackid);

  Object.values(native || {}).forEach((entries: any) => {
    if (!Array.isArray(entries)) return;

    entries.forEach((entry: any) => {
      const id = firstString(entry?.id);
      const value = firstString(entry?.value);
      if (!id || !value) return;

      const lower = id.toLowerCase();
      const mapped =
        lower === "woar" ? "artist_url" :
        lower === "woaf" ? "audio_file_url" :
        lower === "woas" ? "audio_source_url" :
        lower === "wcom" ? "commercial_url" :
        lower === "wcop" ? "copyright_url" :
        lower === "wpay" ? "payment_url" :
        lower === "wpub" ? "publisher_url" :
        lower === "trck" ? "track" :
        lower === "tpos" ? "disc" :
        lower === "tcmp" ? "podcast" :
        id;

      if (!output[mapped]) output[mapped] = value;
    });
  });

  return output;
}

async function readTrackMetadata(filePath: string, fallbackTitle: string, id: string) {
  const meta = await mm.parseFile(filePath, { duration: true });
  const common = meta.common || {};
  const format = meta.format || {};

  const loadedTracklist = loadTracklistDataForItem({ locator: filePath, title: fallbackTitle });
  const metaEntries = Array.isArray(loadedTracklist?.data?.metaEntries) ? loadedTracklist.data.metaEntries : [];

  const findTracklistMetaValue = (label: string) => {
    const match = metaEntries.find((entry: any) => String(entry?.label || "").trim().toLowerCase() === label.toLowerCase());
    return firstString(match?.value);
  };

  const titleOverride = findTracklistMetaValue("Title");
  const artistOverride = findTracklistMetaValue("Artist");

  const title = titleOverride || firstString(common.title) || fallbackTitle || path.parse(filePath).name;
  const artist = artistOverride || firstString(common.artist);
  const album = firstString(common.album);
  const albumArtist = firstString(common.albumartist);
  const genre = firstString(common.genre);
  const year = typeof common.year === "number" ? common.year : null;
  const bpm = typeof common.bpm === "number" ? common.bpm : null;
  const label = firstString((common as any).label || (common as any).publisher);
  const key = firstString((common as any).initialkey || (common as any).key);
  const country = firstString((common as any).releasecountry || (common as any).country);
  const trackNumber = common.track?.no ? String(common.track.no) : "";
  const discNumber = common.disk?.no ? String(common.disk.no) : "";
  const duration = typeof format.duration === "number" ? format.duration : null;
  const comment = firstString(common.comment);
  const hasPicture = Array.isArray(common.picture) && common.picture.length > 0;
  const bitrate = typeof format.bitrate === "number" ? format.bitrate : null;
  const sampleRate = typeof format.sampleRate === "number" ? format.sampleRate : null;
  const numberOfChannels = typeof format.numberOfChannels === "number" ? format.numberOfChannels : null;
  const codec = firstString(format.codec) || firstString(format.container);

  return {
    id,
    title,
    artist,
    album,
    albumArtist,
    genre,
    year,
    bpm,
    label,
    key,
    country,
    trackNumber,
    discNumber,
    duration,
    comment,
    hasPicture,
    bitrate,
    sampleRate,
    numberOfChannels,
    codec,
    advancedTags: extractAdvancedTrackMetadata(meta),
    mixBadge: detectMixBadge({
      albumArtist,
      artist,
      comment,
      title,
    }),
  };
}

const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v", ".wmv", ".vob", ".mpg", ".mpeg"]);
const VIDEO_SUBTITLE_EXTENSIONS = new Set([".vtt", ".srt"]);
const VIDEO_POSTER_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

function isSupportedVideoFile(filePath: string) {
  return VIDEO_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function getVideoMimeType(filePath: string) {
  switch (path.extname(filePath).toLowerCase()) {
    case ".mp4":
    case ".m4v": return "video/mp4";
    case ".mov": return "video/quicktime";
    case ".mkv": return "video/x-matroska";
    case ".webm": return "video/webm";
    case ".avi": return "video/x-msvideo";
    case ".wmv": return "video/x-ms-wmv";
    case ".vob":
    case ".mpg":
    case ".mpeg": return "video/mpeg";
    default: return "application/octet-stream";
  }
}

function readVideoMetadataCache() {
  try {
    if (!fs.existsSync(VIDEO_METADATA_CACHE_PATH)) return {};
    const parsed = JSON.parse(fs.readFileSync(VIDEO_METADATA_CACHE_PATH, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeVideoMetadataCache(cache: Record<string, any>) {
  ensureDirSyncServer(path.dirname(VIDEO_METADATA_CACHE_PATH));
  fs.writeFileSync(VIDEO_METADATA_CACHE_PATH, JSON.stringify(cache || {}, null, 2));
}

function getVideoMetadataCacheKey(filePath: string) {
  return path.resolve(filePath).toLowerCase();
}

function hasVideoMetadataProvider() {
  return !!(process.env.TMDB_API_KEY || process.env.TMDB_BEARER_TOKEN || process.env.OMDB_API_KEY);
}

function normaliseOnlineVideoTitle(title: string) {
  return (firstString(title) || "")
    .replace(/\b(extended|directors? cut|unrated|remastered|proper|repack)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchJsonWithTimeout(url: string, options: any = {}, timeoutMs = 9000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchTmdbVideoMetadata(title: string, year = "") {
  const apiKey = firstString(process.env.TMDB_API_KEY);
  const bearer = firstString(process.env.TMDB_BEARER_TOKEN);

  if (!apiKey && !bearer) return null;

  const params = new URLSearchParams({
    query: normaliseOnlineVideoTitle(title),
    include_adult: "false",
    language: "en-GB",
  });

  if (year) params.set("year", year);
  if (apiKey) params.set("api_key", apiKey);

  const headers = bearer ? { Authorization: `Bearer ${bearer}` } : undefined;
  const search = await fetchJsonWithTimeout(`https://api.themoviedb.org/3/search/movie?${params.toString()}`, { headers });
  const match = Array.isArray(search?.results) ? search.results[0] : null;

  if (!match?.id) return null;

  const detailParams = new URLSearchParams({
    language: "en-GB",
    append_to_response: "credits,release_dates,external_ids",
  });

  if (apiKey) detailParams.set("api_key", apiKey);

  const detail = await fetchJsonWithTimeout(`https://api.themoviedb.org/3/movie/${encodeURIComponent(String(match.id))}?${detailParams.toString()}`, { headers });
  const releaseDate = firstString(detail.release_date || match.release_date);
  const posterPath = firstString(detail.poster_path || match.poster_path);
  const backdropPath = firstString(detail.backdrop_path || match.backdrop_path);

  const certification = Array.isArray(detail?.release_dates?.results)
    ? firstString(detail.release_dates.results.find((entry: any) => entry.iso_3166_1 === "GB")?.release_dates?.[0]?.certification)
      || firstString(detail.release_dates.results.find((entry: any) => entry.iso_3166_1 === "US")?.release_dates?.[0]?.certification)
    : "";

  return {
    matched: true,
    metadataSource: "TMDb",
    tmdbId: String(detail.id || match.id),
    imdbId: firstString(detail?.external_ids?.imdb_id),
    title: firstString(detail.title || match.title),
    originalTitle: firstString(detail.original_title || match.original_title),
    year: releaseDate ? releaseDate.slice(0, 4) : year,
    genre: Array.isArray(detail.genres) ? detail.genres.map((g: any) => g.name).filter(Boolean).join(", ") : "",
    overview: firstString(detail.overview || match.overview),
    onlineRating: detail.vote_average ? Number(detail.vote_average).toFixed(1) : "",
    rating: detail.vote_average ? Number(detail.vote_average).toFixed(1) : "",
    runtime: detail.runtime ? `${detail.runtime} min` : "",
    certification,
    director: Array.isArray(detail?.credits?.crew) ? firstString(detail.credits.crew.find((p: any) => p.job === "Director")?.name) : "",
    cast: Array.isArray(detail?.credits?.cast) ? detail.credits.cast.slice(0, 6).map((p: any) => p.name).filter(Boolean) : [],
    posterUrl: posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : "",
    backdropUrl: backdropPath ? `https://image.tmdb.org/t/p/w1280${backdropPath}` : "",
    fetchedAt: Date.now(),
  };
}

async function fetchOmdbVideoMetadata(title: string, year = "") {
  const apiKey = firstString(process.env.OMDB_API_KEY);

  if (!apiKey) return null;

  const params = new URLSearchParams({
    apikey: apiKey,
    t: normaliseOnlineVideoTitle(title),
    plot: "short",
  });

  if (year) params.set("y", year);

  const data = await fetchJsonWithTimeout(`https://www.omdbapi.com/?${params.toString()}`);

  if (!data || data.Response === "False") return null;

  return {
    matched: true,
    metadataSource: "OMDb",
    imdbId: firstString(data.imdbID),
    title: firstString(data.Title),
    originalTitle: firstString(data.Title),
    year: (firstString(data.Year) || "").slice(0, 4) || year,
    genre: firstString(data.Genre),
    overview: firstString(data.Plot),
    onlineRating: firstString(data.imdbRating),
    rating: firstString(data.imdbRating),
    runtime: firstString(data.Runtime),
    certification: firstString(data.Rated),
    director: firstString(data.Director),
    cast: (firstString(data.Actors) || "").split(",").map((item: string) => item.trim()).filter(Boolean).slice(0, 6),
    posterUrl: firstString(data.Poster) && data.Poster !== "N/A" ? firstString(data.Poster) : "",
    fetchedAt: Date.now(),
  };
}

async function lookupOnlineVideoMetadata(filePath: string, force = false) {
  const cache = readVideoMetadataCache();
  const key = getVideoMetadataCacheKey(filePath);

  if (!force && cache[key]?.matched) return cache[key];

  const parsed = parseVideoTitleFromFilename(filePath);
  let metadata: any = null;

  try {
    metadata = await fetchTmdbVideoMetadata(parsed.title, parsed.year) || await fetchOmdbVideoMetadata(parsed.title, parsed.year);
  } catch (err: any) {
    console.warn(`[BRMedia Video] metadata lookup failed for ${filePath}: ${String(err?.message || err)}`);
  }

  const finalMetadata = metadata || { matched: false, fetchedAt: Date.now() };
  cache[key] = finalMetadata;
  writeVideoMetadataCache(cache);
  return finalMetadata;
}

function getCachedOnlineVideoMetadata(filePath: string) {
  const cache = readVideoMetadataCache();
  return cache[getVideoMetadataCacheKey(filePath)] || {};
}

function makeVideoId(filePath: string) {
  return `vid_${Buffer.from(filePath).toString("base64url").slice(0, 64)}`;
}

function inferVideoGenreFromText(value: string) {
  const text = String(value || "").toLowerCase();
  const genreMap: Array<[string, RegExp]> = [
    ["Action", /\baction\b/],
    ["Adventure", /\badventure\b/],
    ["Animation", /\banimation|animated\b/],
    ["Comedy", /\bcomedy\b/],
    ["Crime", /\bcrime\b/],
    ["Documentary", /\bdocumentary|docu\b/],
    ["Drama", /\bdrama\b/],
    ["Family", /\bfamily\b/],
    ["Fantasy", /\bfantasy\b/],
    ["Horror", /\bhorror\b/],
    ["Music", /\bmusic|musical\b/],
    ["Mystery", /\bmystery\b/],
    ["Romance", /\bromance\b/],
    ["Sci-Fi", /\bsci[ -]?fi|science fiction\b/],
    ["Thriller", /\bthriller\b/],
    ["War", /\bwar\b/],
    ["Western", /\bwestern\b/],
  ];

  return genreMap.filter(([, regex]) => regex.test(text)).map(([label]) => label).join(", ");
}

function stripVideoSearchNoise(value: string) {
  return String(value || "")
    .replace(/\b(19\d{2}|20\d{2})\b/g, " ")
    .replace(/\b(2160p|1080p|720p|480p|4k|uhd|hdr|hdr10|dv|bluray|blu ray|brrip|dvdrip|web[- ]?dl|webrip|hdtv|x264|x265|h264|h265|hevc|avc|aac|dts|ac3|eac3|ddp5?\.1|multi[- ]?subs?|subbed|subs?|dubbed|dub|eng|english|rus|russian|ita|spanish|french|german|proper|repack|extended|directors? cut|unrated|remastered)\b/gi, " ")
    .replace(/\b(action|adventure|animation|animated|comedy|crime|documentary|docu|drama|family|fantasy|horror|music|musical|mystery|romance|sci[ -]?fi|science fiction|thriller|war|western)\b/gi, " ")
    .replace(/[\[\](){}]+/g, " ")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseVideoTitleFromFilename(filePath: string) {
  const base = path.parse(filePath).name
    .replace(/[._]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const yearMatch = base.match(/\b(19\d{2}|20\d{2})\b/);
  const year = yearMatch ? yearMatch[1] : "";
  const beforeDash = base.split(/\s+-\s+/)[0]?.trim() || base;
  const cleanTitle = stripVideoSearchNoise(beforeDash) || stripVideoSearchNoise(base);

  return {
    title: cleanTitle || base || path.basename(filePath),
    year,
  };
}

function readVideoMetadataSidecar(filePath: string) {
  const parsed = path.parse(filePath);
  const candidates = [
    path.join(parsed.dir, `${parsed.name}.brmedia-video.json`),
    path.join(parsed.dir, `${parsed.name}.json`),
  ];

  for (const candidate of candidates) {
    try {
      if (!fs.existsSync(candidate)) continue;
      const parsedJson = JSON.parse(fs.readFileSync(candidate, "utf8"));
      if (parsedJson && typeof parsedJson === "object") return parsedJson;
    } catch {}
  }

  return {};
}

function findVideoPoster(filePath: string) {
  const parsed = path.parse(filePath);
  const baseCandidates = [parsed.name, "poster", "cover", "folder"];

  for (const base of baseCandidates) {
    for (const ext of VIDEO_POSTER_EXTENSIONS) {
      const candidate = path.join(parsed.dir, `${base}${ext}`);
      if (fs.existsSync(candidate)) return candidate;
    }
  }

  return "";
}

function findVideoSubtitles(filePath: string) {
  const parsed = path.parse(filePath);
  const output: any[] = [];

  try {
    const entries = fs.readdirSync(parsed.dir, { withFileTypes: true });
    entries.forEach((entry) => {
      if (!entry.isFile()) return;
      const ext = path.extname(entry.name).toLowerCase();
      if (!VIDEO_SUBTITLE_EXTENSIONS.has(ext)) return;
      const entryBase = path.parse(entry.name).name.toLowerCase();
      if (!entryBase.startsWith(parsed.name.toLowerCase())) return;

      const labelPart = entryBase.replace(parsed.name.toLowerCase(), "").replace(/^[. _-]+/, "").trim();
      const language = /\b(en|eng|english)\b/i.test(labelPart) ? "en" : firstString(labelPart) || "sub";
      output.push({
        id: String(output.length),
        fileName: entry.name,
        label: labelPart ? labelPart.replace(/[._-]+/g, " ") : (language === "en" ? "English" : "Subtitle"),
        language,
        ext,
        path: path.join(parsed.dir, entry.name),
      });
    });
  } catch {}

  return output;
}

function collectSupportedVideoFilesRecursive(folderPath: string): string[] {
  if (!fs.existsSync(folderPath)) return [];
  const stat = fs.statSync(folderPath);
  if (stat.isFile()) return isSupportedVideoFile(folderPath) ? [folderPath] : [];

  const results: string[] = [];
  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
        continue;
      }
      if (entry.isFile() && isSupportedVideoFile(abs)) results.push(abs);
    }
  }
  walk(folderPath);
  return results;
}

function scanVideoLibrary() {
  VIDEO_LIBRARY_CACHE.clear();
  const items: any[] = [];

  for (const root of VIDEO_LIBRARY_ROOTS) {
    const files = collectSupportedVideoFilesRecursive(root);
    for (const filePath of files) {
      try {
        const stat = fs.statSync(filePath);
        const parsedTitle = parseVideoTitleFromFilename(filePath);
        const sidecar = readVideoMetadataSidecar(filePath);
        const online = getCachedOnlineVideoMetadata(filePath);
        const posterPath = findVideoPoster(filePath);
        const item = {
          id: makeVideoId(filePath),
          title: firstString(sidecar.title) || firstString(online.title) || parsedTitle.title,
          originalTitle: firstString(sidecar.originalTitle) || firstString(online.originalTitle) || "",
          year: firstString(sidecar.year) || firstString(online.year) || parsedTitle.year,
          genre: firstString(sidecar.genre) || firstString(online.genre) || inferVideoGenreFromText(`${filePath} ${parsedTitle.title}`) || "Unsorted",
          overview: firstString(sidecar.overview) || firstString(sidecar.description) || firstString(online.overview) || "",
          rating: firstString(sidecar.rating) || firstString(online.rating) || "",
          onlineRating: firstString(sidecar.onlineRating || sidecar.imdbRating || sidecar.tmdbRating) || firstString(online.onlineRating) || "",
          runtime: firstString(sidecar.runtime) || firstString(online.runtime) || "",
          duration: Number(sidecar.duration || 0) || 0,
          fileName: path.basename(filePath),
          folder: path.basename(path.dirname(filePath)),
          locator: filePath,
          sizeBytes: stat.size,
          modifiedAt: stat.mtimeMs,
          mimeType: getVideoMimeType(filePath),
          hasPoster: !!posterPath || !!online.posterUrl,
          posterPath,
          posterUrl: firstString(sidecar.posterUrl) || firstString(online.posterUrl) || "",
          backdropUrl: firstString(sidecar.backdropUrl) || firstString(online.backdropUrl) || "",
          metadataSource: firstString(sidecar.metadataSource) || firstString(online.metadataSource) || "",
          imdbId: firstString(sidecar.imdbId) || firstString(online.imdbId) || "",
          tmdbId: firstString(sidecar.tmdbId) || firstString(online.tmdbId) || "",
          certification: firstString(sidecar.certification) || firstString(online.certification) || "",
          director: firstString(sidecar.director) || firstString(online.director) || "",
          cast: Array.isArray(sidecar.cast) ? sidecar.cast : (Array.isArray(online.cast) ? online.cast : []),
          subtitles: findVideoSubtitles(filePath).map((sub) => ({
            id: sub.id,
            fileName: sub.fileName,
            label: sub.label,
            language: sub.language,
            ext: sub.ext,
          })),
          audioTracks: Array.isArray(sidecar.audioTracks) ? sidecar.audioTracks : [],
        };
        VIDEO_LIBRARY_CACHE.set(item.id, item);
        items.push(item);
      } catch (err: any) {
        console.warn(`[BRMedia Video] skipped ${filePath}: ${String(err?.message || err)}`);
      }
    }
  }

  items.sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
  return items;
}

function getVideoLibraryItems() {
  if (!VIDEO_LIBRARY_CACHE.size) return scanVideoLibrary();
  return [...VIDEO_LIBRARY_CACHE.values()].sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
}

function getVideoItem(videoId: string) {
  if (!VIDEO_LIBRARY_CACHE.size) scanVideoLibrary();
  return VIDEO_LIBRARY_CACHE.get(videoId) || null;
}

async function refreshVideoItemMetadata(videoId: string, force = false) {
  const item = getVideoItem(videoId);
  if (!item) return null;

  await lookupOnlineVideoMetadata(item.locator, force);
  scanVideoLibrary();
  return getVideoItem(videoId);
}

async function refreshMissingVideoMetadata(items: any[]) {
  if (!hasVideoMetadataProvider()) return items;

  const missing = items
    .filter((item) => !item.metadataSource && !item.onlineRating)
    .slice(0, 25);

  for (const item of missing) {
    await lookupOnlineVideoMetadata(item.locator, false);
  }

  return scanVideoLibrary();
}

function validateVideoPathAllowed(filePath: string) {
  const resolved = path.resolve(filePath).toLowerCase();
  const allowed = VIDEO_LIBRARY_ROOTS.some((root) => resolved === path.resolve(root).toLowerCase() || resolved.startsWith(`${path.resolve(root).toLowerCase()}${path.sep}`));
  return allowed;
}

function convertSrtToVttText(input: string) {
  const body = String(input || "")
    .replace(/^\uFEFF/, "")
    .replace(/\r/g, "")
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");

  return body.trimStart().startsWith("WEBVTT") ? body : `WEBVTT\n\n${body}`;
}

function collectSupportedAudioFilesRecursive(folderPath: string): string[] {
  if (!fs.existsSync(folderPath)) return [];

  const stat = fs.statSync(folderPath);

  if (stat.isFile()) {
    return isSupportedAudioFile(folderPath) ? [folderPath] : [];
  }

  const results: string[] = [];

  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const abs = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        walk(abs);
        continue;
      }

      if (entry.isFile() && isSupportedAudioFile(abs)) {
        results.push(abs);
      }
    }
  }

  walk(folderPath);
  return results;
}

function autoImportAllowedBases() {
  if (!cfg.localAllowedBases.length) {
    console.log("[BRMedia Server] auto-import skipped: no LOCAL_ALLOWED_BASES set");
    return;
  }

  const addedItems = [];
  let skipped = 0;

  for (const basePath of cfg.localAllowedBases) {
    if (!fs.existsSync(basePath)) {
      console.warn(`[BRMedia Server] auto-import skipped missing path: ${basePath}`);
      continue;
    }

    const files = collectSupportedAudioFilesRecursive(basePath);

    for (const absFile of files) {
      if (findLibraryItemByLocator(absFile)) {
        skipped += 1;
        continue;
      }

      const item = addLocalFileToLibrary(absFile);
      addedItems.push(item);
    }
  }

  if (addedItems.length) {
    void queueWaveformGenerationForItems(addedItems, {
      peakCount: DEFAULT_WAVEFORM_PEAKS,
      onlyMissing: true,
    });
  }

  console.log(
    `[BRMedia Server] auto-import complete: added ${addedItems.length}, skipped ${skipped}`
  );
}

function resolvePreviewFfmpegPath() {
  const envPath = String(process.env.FFMPEG_PATH || "").trim();
  if (envPath) return envPath;

  const bundledPath = "C:\\ffmpeg-8.0.1\\bin\\ffmpeg.exe";
  if (fs.existsSync(bundledPath)) return bundledPath;

  return process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
}

function streamPreviewClip(
  res: http.ServerResponse,
  filePath: string,
  startSec: number,
  durationSec: number
) {
  const ffmpeg = spawn(resolvePreviewFfmpegPath(), [
    "-ss",
    String(Math.max(0, startSec || 0)),
    "-i",
    filePath,
    "-t",
    String(Math.max(1, durationSec || 1)),
    "-vn",
    "-acodec",
    "libmp3lame",
    "-b:a",
    "192k",
    "-f",
    "mp3",
    "pipe:1",
  ]);

  res.statusCode = 200;
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Cache-Control", "no-store");

  ffmpeg.stdout.pipe(res);

  ffmpeg.stderr.on("data", () => {});

  ffmpeg.on("error", (err: Error) => {
    if (!res.headersSent) {
      json(res, 500, {
        error: "Failed to build preview",
        detail: String((err as any)?.message || err),
      });
      return;
    }

    try {
      res.destroy(err as Error);
    } catch {}
  });

  ffmpeg.on("close", (code: number | null) => {
    if (code === 0) return;

    if (!res.writableEnded) {
      try {
        res.destroy(new Error(`ffmpeg exited ${code}`));
      } catch {}
    }
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (!req.url) {
      return json(res, 400, { error: "Bad request" });
    }

    const corsHandled = applyCors(req, res);
    if (corsHandled) return;

    const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

    if (req.method === "GET" && url.pathname === "/health") {
      return json(res, 200, {
        ok: true,
        port: cfg.port,
        rangeStreaming: cfg.rangeStreaming,
      });
    }
		
    if (req.method === "GET" && url.pathname.startsWith("/devices/") && url.pathname.endsWith("/commands")) {
      const parts = url.pathname.split("/").filter(Boolean);
      const deviceId = decodeURIComponent(parts[1] || "");

      if (!deviceId) {
        return json(res, 400, { error: "Missing device id" });
      }

      const existing = relayDevices.get(deviceId);
      if (existing) {
        existing.lastSeenAt = Date.now();
        existing.online = true;
        existing.statusText = "Online now";
        relayDevices.set(deviceId, existing);
      }

      return json(res, 200, {
        ok: true,
        commands: takeRelayCommands(deviceId),
        devices: getVisibleRelayDevices(deviceId),
      });
    }

    if (req.method === "POST" && url.pathname === "/devices/send") {
      const body = await readJsonBody(req).catch(() => null);
      const fromDeviceId = firstString(body?.fromDeviceId);
      const targetDeviceId = firstString(body?.targetDeviceId);
      const action = firstString(body?.action);

      if (!fromDeviceId || !targetDeviceId || !action) {
        return json(res, 400, { error: "Expected { fromDeviceId, targetDeviceId, action, payload? }" });
      }

      pruneRelayDevices();

      const target = relayDevices.get(targetDeviceId);
      if (!target || !target.online) {
        return json(res, 404, { error: "Target device is offline" });
      }

      if (!target.receiveTransfers) {
        return json(res, 403, { error: "Target device is not accepting transfers" });
      }

      if (!target.allowRemote && !isInfoOnlyRelayAction(action)) {
        return json(res, 403, { error: "Target device has remote playback control disabled" });
      }

      enqueueRelayCommand(targetDeviceId, {
        commandId: createRelayCommandId(),
        fromDeviceId,
        action,
        payload: body?.payload ?? {},
        createdAt: Date.now(),
      });

      return json(res, 200, {
        ok: true,
        queued: true,
        devices: getVisibleRelayDevices(fromDeviceId),
      });
    }

    if (req.method === "POST" && url.pathname === "/devices/register") {
      const body = await readJsonBody(req).catch(() => null);
      if (!body) {
        return json(res, 400, { error: "Invalid device registration body" });
      }

      const device = upsertRelayDevice(body);
      return json(res, 200, {
        ok: true,
        device,
        devices: getVisibleRelayDevices(device.deviceId),
      });
    }

    if (req.method === "POST" && url.pathname === "/devices/heartbeat") {
      const body = await readJsonBody(req).catch(() => null);
      if (!body) {
        return json(res, 400, { error: "Invalid device heartbeat body" });
      }

      const device = upsertRelayDevice(body);
      return json(res, 200, {
        ok: true,
        device,
        devices: getVisibleRelayDevices(device.deviceId),
      });
    }

    if (req.method === "GET" && url.pathname === "/devices") {
      const excludeDeviceId = firstString(url.searchParams.get("deviceId")) || "";
      return json(res, 200, {
        ok: true,
        devices: getVisibleRelayDevices(excludeDeviceId),
      });
    }
		
    if (req.method === "GET" && url.pathname === "/player/runtime-state") {
      return json(res, 200, {
        ok: true,
        state: readPlayerRuntimeState(),
      });
    }

    if (req.method === "POST" && url.pathname === "/player/runtime-state") {
      const body = await readJsonBody(req).catch(() => null);
      if (!body || typeof body !== "object") {
        return json(res, 400, { error: "Invalid player runtime state" });
      }

      const state = writePlayerRuntimeState(body);
      return json(res, 200, { ok: true, state });
    }

    if (req.method === "POST" && url.pathname === "/backup/export") {
      const body = await readJsonBody(req).catch(() => null);
      const sections = sanitiseBackupSections(body?.sections);

      if (!sections.length) {
        return json(res, 400, { error: "Pick at least one backup section" });
      }

      const backup = await buildBackupExportPayload(sections, body?.browserData || {});
      return json(res, 200, {
        ok: true,
        backup,
      });
    }

    if (req.method === "POST" && url.pathname === "/backup/restore") {
      const body = await readJsonBody(req).catch(() => null);
      const backup = body?.backup;

      if (!backup || typeof backup !== "object") {
        return json(res, 400, { error: "Missing backup payload" });
      }

      const restored = await applyBackupRestorePayload(backup);
      return json(res, 200, {
        ok: true,
        restored,
      });
    }

    if (req.method === "POST" && url.pathname === "/library/upload-mobile") {
      const body = await readJsonBody(req).catch(() => null);
      const files = Array.isArray(body?.files) ? body.files : [];

      if (!files.length) {
        return json(res, 400, { error: "Pick at least one upload file" });
      }

      const result = await handleMobileUpload(files);
      return json(res, 200, {
        ok: true,
        savedFiles: result.savedFiles,
        addedItems: result.addedItems,
      });
    }
		
    if (req.method === "POST" && url.pathname === "/library/upload-mobile-file") {
      const fileName = firstString(url.searchParams.get("name")) || "upload.bin";
      const buffer = await readBufferBody(req);

      if (!buffer.length) {
        return json(res, 400, { error: "Empty upload body" });
      }

      const result = await handleSingleMobileUpload(fileName, buffer);
      return json(res, 200, {
        ok: true,
        savedFiles: result.savedFiles,
        addedItems: result.addedItems,
        item: result.item,
      });
    }
		
    if (req.method === "GET" && url.pathname === "/video-library") {
      const refresh = url.searchParams.get("refresh") === "1";
      const matchMissing = url.searchParams.get("metadata") === "missing";
      let items = refresh ? scanVideoLibrary() : getVideoLibraryItems();

      if (matchMissing) {
        items = await refreshMissingVideoMetadata(items);
      }

      return json(res, 200, {
        ok: true,
        roots: VIDEO_LIBRARY_ROOTS,
        metadataEnabled: hasVideoMetadataProvider(),
        count: items.length,
        items,
      });
    }

    if (req.method === "POST" && url.pathname.startsWith("/video-library/") && url.pathname.endsWith("/metadata")) {
      const id = decodeURIComponent(url.pathname.replace("/video-library/", "").replace("/metadata", "").trim());
      const force = url.searchParams.get("refresh") === "1";
      const item = await refreshVideoItemMetadata(id, force);
      if (!item) return json(res, 404, { error: "Video not found" });
      return json(res, 200, {
        ok: true,
        item,
        metadata: {
          matched: !!item.metadataSource,
          source: item.metadataSource || "",
        },
      });
    }

    if (req.method === "GET" && url.pathname.startsWith("/video-library/")) {
      const id = decodeURIComponent(url.pathname.replace("/video-library/", "").trim());
      const item = getVideoItem(id);
      if (!item) return json(res, 404, { error: "Video not found" });
      return json(res, 200, { ok: true, item });
    }

    if ((req.method === "GET" || req.method === "HEAD") && url.pathname.startsWith("/video-stream/")) {
      const id = decodeURIComponent(url.pathname.replace("/video-stream/", "").trim());
      const item = getVideoItem(id);
      if (!item) return json(res, 404, { error: "Video not found" });
      if (!validateVideoPathAllowed(item.locator)) return json(res, 403, { error: "Video path not allowed" });
      if (!fs.existsSync(item.locator)) return json(res, 404, { error: "Video file missing" });
      streamFileWithRange(req, res, item.locator, { mimeType: item.mimeType || getVideoMimeType(item.locator) });
      return;
    }
		
    if (req.method === "GET" && url.pathname === "/video-online-image") {
      const imageUrl = firstString(url.searchParams.get("url")) || "";

      try {
        const parsedImageUrl = new URL(imageUrl);
        const allowedHosts = ["image.tmdb.org", "m.media-amazon.com", "ia.media-imdb.com", "img.omdbapi.com"];

        if (
          parsedImageUrl.protocol !== "https:" ||
          !allowedHosts.some((host) => parsedImageUrl.hostname === host || parsedImageUrl.hostname.endsWith(`.${host}`))
        ) {
          return json(res, 400, { error: "Image host not allowed" });
        }

        const remote = await fetch(parsedImageUrl.toString());

        if (!remote.ok) {
          return json(res, remote.status, { error: "Could not load poster image" });
        }

        const arrayBuffer = await remote.arrayBuffer();
        const contentType = remote.headers.get("content-type") || contentTypeFor(parsedImageUrl.pathname) || "image/jpeg";

        res.writeHead(200, {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400",
        });
        res.end(Buffer.from(arrayBuffer));
        return;
      } catch (err: any) {
        return json(res, 400, { error: String(err?.message || err) });
      }
    }

    if ((req.method === "GET" || req.method === "HEAD") && url.pathname.startsWith("/video-poster/")) {
      const id = decodeURIComponent(url.pathname.replace("/video-poster/", "").trim());
      const item = getVideoItem(id);
      if (!item || !item.posterPath) return json(res, 404, { error: "Poster not found" });
      if (!validateVideoPathAllowed(item.posterPath)) return json(res, 403, { error: "Poster path not allowed" });
      if (!fs.existsSync(item.posterPath)) return json(res, 404, { error: "Poster missing" });
      streamFileWithRange(req, res, item.posterPath, { mimeType: contentTypeFor(item.posterPath) });
      return;
    }

    if ((req.method === "GET" || req.method === "HEAD") && url.pathname.startsWith("/video-subtitle/")) {
      const parts = url.pathname.replace("/video-subtitle/", "").split("/").map((part) => decodeURIComponent(part));
      const [id, subtitleId] = parts;
      const item = getVideoItem(id);
      if (!item) return json(res, 404, { error: "Video not found" });
      const subtitle = findVideoSubtitles(item.locator).find((sub) => String(sub.id) === String(subtitleId));
      if (!subtitle) return json(res, 404, { error: "Subtitle not found" });
      if (!validateVideoPathAllowed(subtitle.path)) return json(res, 403, { error: "Subtitle path not allowed" });
      if (!fs.existsSync(subtitle.path)) return json(res, 404, { error: "Subtitle missing" });
      if (subtitle.ext === ".srt") {
        res.writeHead(200, {
          "Content-Type": "text/vtt; charset=utf-8",
          "Cache-Control": "no-store",
        });
        res.end(convertSrtToVttText(fs.readFileSync(subtitle.path, "utf8")));
        return;
      }

      streamFileWithRange(req, res, subtitle.path, { mimeType: "text/vtt; charset=utf-8" });
      return;
    }	
		
    if (req.method === "GET" && url.pathname === "/brmedia/custom-tags") {
      const tags = readBrMediaCustomTagsStore();
      return json(res, 200, {
        ok: true,
        tags,
        count: Object.keys(tags).length,
      });
    }

    if (req.method === "GET" && url.pathname.startsWith("/brmedia/custom-tags/")) {
      const key = decodeURIComponent(url.pathname.replace("/brmedia/custom-tags/", "").trim());
      if (!key) return json(res, 400, { error: "Missing custom tag key" });

      const store = readBrMediaCustomTagsStore();
      const direct = store[key] && typeof store[key] === "object" ? store[key] : null;
      const item = getLibraryItem(key);
      const sidecar = item ? readBrMediaSidecarForItem(item) : null;

      return json(res, 200, {
        ok: true,
        key,
        tags: direct || sidecar || {},
      });
    }

    if (req.method === "POST" && url.pathname === "/brmedia/custom-tags") {
      const body = await readJsonBody(req).catch(() => null);
      const result = saveBrMediaCustomTags(body || {});

      if (!result.ok) {
        return json(res, 400, { error: result.error || "Could not save BRMedia custom tags" });
      }

      return json(res, 200, result);
    }

    if (req.method === "POST" && url.pathname === "/brmedia/tagger/write-copy") {
      const body = await readJsonBody(req).catch(() => null);
      const result = await writeBrMediaTaggedCopy(body || {});

      if (!result.ok) {
        return json(res, 400, { error: result.error || "Could not write tagged copy" });
      }

      return json(res, 200, result);
    }
		
    if (req.method === "POST" && url.pathname === "/brmedia/mastering/upload") {
      const fileName = firstString(url.searchParams.get("name")) || "mastering-upload.bin";
      const buffer = await readBufferBody(req);
      const result = await handleMasteringUpload(fileName, buffer, firstString(req.headers["content-type"]) || undefined);

      if (!result.ok) {
        return json(res, 400, { error: result.error || "Could not upload mastering source" });
      }

      return json(res, 200, result);
    }

    if (req.method === "POST" && url.pathname === "/brmedia/mastering/analyse") {
      const body = await readJsonBody(req).catch(() => null);
      const result: any = await analyseMasteringSource(body || {});

      if (!result.ok) {
        return json(res, 400, { error: result.error || "Could not analyse mastering source" });
      }

      return json(res, 200, result);
    }

    if (req.method === "POST" && url.pathname === "/brmedia/mastering/jobs") {
      const body = await readJsonBody(req).catch(() => null);
      const result: any = await startMasteringJob(body || {});

      if (!result.ok) {
        return json(res, 400, { error: result.error || "Could not start mastering job" });
      }

      return json(res, 200, result);
    }

    if (req.method === "POST" && url.pathname.startsWith("/brmedia/mastering/jobs/") && url.pathname.endsWith("/cancel")) {
      const jobId = decodeURIComponent(url.pathname.replace("/brmedia/mastering/jobs/", "").replace("/cancel", "").trim());
      const job = cancelMasteringJob(jobId);
      if (!job) return json(res, 404, { error: "Mastering job not found" });
      return json(res, 200, { ok: true, job });
    }

    if (req.method === "GET" && url.pathname.startsWith("/brmedia/mastering/jobs/") && !url.pathname.endsWith("/download")) {
      const jobId = decodeURIComponent(url.pathname.replace("/brmedia/mastering/jobs/", "").trim());
      const job = getPublicMasteringJob(jobId);
      if (!job) return json(res, 404, { error: "Mastering job not found" });
      return json(res, 200, { ok: true, job });
    }

    if ((req.method === "GET" || req.method === "HEAD") && url.pathname.startsWith("/brmedia/mastering/jobs/") && url.pathname.endsWith("/download")) {
      const jobId = decodeURIComponent(url.pathname.replace("/brmedia/mastering/jobs/", "").replace("/download", "").trim());
      const job = MASTERING_JOBS.get(jobId);
      if (!job) return json(res, 404, { error: "Mastering job not found" });
      if (job.status !== "done" || !job.outputPath || !fs.existsSync(job.outputPath)) {
        return json(res, 409, { error: "Mastered file is not ready" });
      }

      streamFileWithRange(req, res, job.outputPath, {
        asAttachment: true,
        downloadName: path.basename(job.outputPath),
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/brmedia/converter/upload") {
      const fileName = firstString(url.searchParams.get("name")) || "converter-upload.bin";
      const buffer = await readBufferBody(req);
      const result = await handleConverterUpload(fileName, buffer, firstString(req.headers["content-type"]) || undefined);

      if (!result.ok) {
        return json(res, 400, { error: result.error || "Could not upload converter source" });
      }

      return json(res, 200, result);
    }

    if (req.method === "POST" && url.pathname === "/brmedia/converter/jobs") {
      const body = await readJsonBody(req).catch(() => null);
const result: any = await startConverterJob(body || {});

if (!result.ok) {
  return json(res, 400, { error: result.error || "Could not start converter job" });
}

return json(res, 200, result);
    }

    if (req.method === "POST" && url.pathname.startsWith("/brmedia/converter/jobs/") && url.pathname.endsWith("/cancel")) {
      const jobId = decodeURIComponent(url.pathname.replace("/brmedia/converter/jobs/", "").replace("/cancel", "").trim());
      const job = cancelConverterJob(jobId);
      if (!job) return json(res, 404, { error: "Converter job not found" });
      return json(res, 200, { ok: true, job });
    }

    if (req.method === "GET" && url.pathname.startsWith("/brmedia/converter/jobs/") && !url.pathname.endsWith("/download")) {
      const jobId = decodeURIComponent(url.pathname.replace("/brmedia/converter/jobs/", "").trim());
      const job = getPublicConverterJob(jobId);
      if (!job) return json(res, 404, { error: "Converter job not found" });
      return json(res, 200, { ok: true, job });
    }

    if ((req.method === "GET" || req.method === "HEAD") && url.pathname.startsWith("/brmedia/converter/jobs/") && url.pathname.endsWith("/download")) {
      const jobId = decodeURIComponent(url.pathname.replace("/brmedia/converter/jobs/", "").replace("/download", "").trim());
      const job = CONVERTER_JOBS.get(jobId);
      if (!job) return json(res, 404, { error: "Converter job not found" });
      if (job.status !== "done" || !job.outputPath || !fs.existsSync(job.outputPath)) {
        return json(res, 409, { error: "Converted file is not ready" });
      }

      streamFileWithRange(req, res, job.outputPath, {
        asAttachment: true,
        downloadName: path.basename(job.outputPath),
      });
      return;
    }

    const apiHandled = await handleApiRoute(req, res, url, {
      localAllowedBases: cfg.localAllowedBases,
    });
    if (apiHandled) return;

    if (req.method === "GET" && url.pathname.startsWith("/preview/")) {
      const id = decodeURIComponent(url.pathname.replace("/preview/", "").trim());

      if (!id) {
        return json(res, 400, { error: "Missing id" });
      }

      const item = getLibraryItem(id);
      if (!item) {
        return json(res, 404, { error: "Not found" });
      }

      if (item.source !== "local") {
        return json(res, 501, { error: "Source not implemented yet" });
      }

      const allowed = validateLocalPathAllowed(item.locator, cfg.localAllowedBases);
      if (!allowed.ok) {
        return json(res, 403, { error: allowed.reason });
      }

      if (!fs.existsSync(item.locator)) {
        return json(res, 404, { error: "File missing" });
      }

      const startSec = Math.max(0, Number(url.searchParams.get("start") || 0) || 0);
      const durationSec = Math.max(
        1,
        Math.min(120, Number(url.searchParams.get("duration") || 30) || 30)
      );

      streamPreviewClip(res, item.locator, startSec, durationSec);
      return;
    }

if (
  (req.method === "GET" || req.method === "HEAD") &&
  url.pathname.startsWith("/download/")
) {
  const id = decodeURIComponent(url.pathname.replace("/download/", "").trim());

  if (!id) {
    return json(res, 400, { error: "Missing id" });
  }

  const item = getLibraryItem(id);
  if (!item) {
    return json(res, 404, { error: "Not found" });
  }

  if (item.source !== "local") {
    return json(res, 501, { error: "Source not implemented yet" });
  }

  const allowed = validateLocalPathAllowed(item.locator, cfg.localAllowedBases);
  if (!allowed.ok) {
    return json(res, 403, { error: allowed.reason });
  }

  if (!fs.existsSync(item.locator)) {
    return json(res, 404, { error: "File missing" });
  }

  streamFileWithRange(req, res, item.locator, {
    asAttachment: true,
    downloadName: path.basename(item.locator),
  });
  return;
}

    if (
      req.method === "GET" &&
      url.pathname.startsWith("/stream/") &&
      url.pathname !== "/stream/local"
    ) {
      const id = decodeURIComponent(url.pathname.replace("/stream/", "").trim());

      if (!id) {
        return json(res, 400, { error: "Missing id" });
      }

      const item = getLibraryItem(id);
      if (!item) {
        return json(res, 404, { error: "Not found" });
      }

      if (item.source !== "local") {
        return json(res, 501, { error: "Source not implemented yet" });
      }

      const allowed = validateLocalPathAllowed(item.locator, cfg.localAllowedBases);
      if (!allowed.ok) {
        return json(res, 403, { error: allowed.reason });
      }

      if (!fs.existsSync(item.locator)) {
        return json(res, 404, { error: "File missing" });
      }

      streamFileWithRange(req, res, item.locator);
      return;
    }

    if (req.method === "GET" && url.pathname === "/stream/local") {
      const p = url.searchParams.get("path");

      if (!p) {
        return json(res, 400, { error: "Missing query param: path" });
      }

      const allowed = validateLocalPathAllowed(p, cfg.localAllowedBases);
      if (!allowed.ok) {
        return json(res, 403, { error: allowed.reason });
      }

      if (!fs.existsSync(p)) {
        return json(res, 404, { error: "File missing" });
      }

      streamFileWithRange(req, res, p);
      return;
    }

    const PUBLIC_DIR = path.join(__dirname, "..", "public");

    function sendFile(filePath: string, contentType: string) {
      if (!fs.existsSync(filePath)) return false;

      const ext = path.extname(filePath).toLowerCase();

      res.statusCode = 200;
      res.setHeader("Content-Type", contentType);

      if ([".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif", ".ico"].includes(ext)) {
        res.setHeader("Cache-Control", "public, max-age=86400");
      } else if ([".css", ".js"].includes(ext)) {
        res.setHeader("Cache-Control", "no-cache");
      } else if (ext === ".html") {
        res.setHeader("Cache-Control", "no-store");
      }

      fs.createReadStream(filePath).pipe(res);
      return true;
    }

    function contentTypeFor(p: string) {
      const ext = path.extname(p).toLowerCase();
      if (ext === ".html") return "text/html; charset=utf-8";
      if (ext === ".css") return "text/css; charset=utf-8";
      if (ext === ".js") return "application/javascript; charset=utf-8";
      if (ext === ".txt") return "text/plain; charset=utf-8";
      if (ext === ".svg") return "image/svg+xml";
      if (ext === ".png") return "image/png";
      if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
      if (ext === ".webp") return "image/webp";
      if (ext === ".webmanifest") return "application/manifest+json; charset=utf-8";
      return "application/octet-stream";
    }

    function sendHtmlWithAppShell(
      filePath: string,
      options: { title: string; appleTitle: string; manifestHref: string }
    ) {
      if (!fs.existsSync(filePath)) return false;

      let html = fs.readFileSync(filePath, "utf8");

      html = html.replace(/<title>.*?<\/title>/i, `<title>${options.title}</title>`);

      html = html.replace(
        /<link\s+(?:id="moduleManifest"\s+)?rel="manifest"\s+href="[^"]+"\s*\/?>/i,
        `<link id="moduleManifest" rel="manifest" href="${options.manifestHref}" />`
      );

      html = html.replace(
        /<meta\s+name="apple-mobile-web-app-title"\s+content="[^"]*"\s*\/?>/i,
        `<meta name="apple-mobile-web-app-title" content="${options.appleTitle}" />`
      );

      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.end(html);
      return true;
    }

    function sendAppManifest(startUrl: string, name: string) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");

      res.end(JSON.stringify({
        name,
        short_name: "BRMedia",
        start_url: startUrl,
        scope: "/",
        display: "standalone",
        background_color: "#182E5B",
        theme_color: "#182E5B",
        icons: [
          {
            src: "/home/icon-192.png?v=20260505",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/home/icon-512.png?v=20260505",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      }, null, 2));

      return true;
    }

    const appManifestRouteMap: Record<string, { startUrl: string; name: string }> = {
      "/home/site.webmanifest": {
        startUrl: "/home?v=20260505",
        name: "BRMedia Centre",
      },
      "/player/site.webmanifest": {
        startUrl: "/player?v=20260505",
        name: "BRMedia Player",
      },
      "/tagger/site.webmanifest": {
        startUrl: "/tagger?v=20260505",
        name: "BRMedia Tagger",
      },
      "/converter/site.webmanifest": {
        startUrl: "/converter?v=20260505",
        name: "BRMedia Converter",
      },
      "/mastering/site.webmanifest": {
        startUrl: "/mastering?v=20260505",
        name: "BRMedia Mastering",
      },
      "/stats/site.webmanifest": {
        startUrl: "/stats?v=20260505",
        name: "BRMedia Stats",
      },
      "/video-player/site.webmanifest": {
        startUrl: "/video-player?v=20260505",
        name: "BRMedia Video Player",
      },
      "/server-settings/site.webmanifest": {
        startUrl: "/server-settings?v=20260505",
        name: "BRMedia Server Settings",
      },
      "/settings/site.webmanifest": {
        startUrl: "/settings?v=20260509",
        name: "BRMedia Settings",
      },
    };

    if (req.method === "GET" && appManifestRouteMap[url.pathname]) {
      const manifest = appManifestRouteMap[url.pathname];
      return sendAppManifest(manifest.startUrl, manifest.name);
    }

    if (
      req.method === "GET" &&
      (url.pathname === "/" || url.pathname === "/home" || url.pathname === "/home/")
    ) {
      const p = path.join(PUBLIC_DIR, "home", "index.html");
      if (sendFile(p, contentTypeFor(p))) return;
      return json(res, 404, { error: "Home not found" });
    }

if (req.method === "GET" && url.pathname === "/styles.css") {
  const p = path.join(PUBLIC_DIR, "home", "styles.css");
  if (sendFile(p, contentTypeFor(p))) return;
  return json(res, 404, { error: "Home styles not found" });
}

if (req.method === "GET" && url.pathname.startsWith("/home/")) {
  const rel = url.pathname.replace("/home/", "");
  const safe = rel.replace(/^(\.\.(\/|\\|$))+/, "");
  const p = path.join(PUBLIC_DIR, "home", safe);
  if (sendFile(p, contentTypeFor(p))) return;
  return json(res, 404, { error: "Home asset not found" });
}

if (req.method === "GET" && url.pathname === "/player") {
  const p = path.join(PUBLIC_DIR, "player", "index.html");
  if (sendFile(p, contentTypeFor(p))) return;
  return json(res, 404, { error: "Player not found" });
}

    const publicAssetFolders = new Set([
      "shared",
      "settings",
      "converter",
      "tagger",
      "mastering",
      "video-player",
      "stats",
      "server-settings",
    ]);

    const publicAssetRoot = url.pathname.split("/").filter(Boolean)[0] || "";

    if (req.method === "GET" && publicAssetFolders.has(publicAssetRoot) && url.pathname.startsWith(`/${publicAssetRoot}/`)) {
      const rel = url.pathname.replace(`/${publicAssetRoot}/`, "");
      const safe = rel.replace(/^(\.\.(\/|\\|$))+/, "");
      const p = path.join(PUBLIC_DIR, publicAssetRoot, safe);
      if (sendFile(p, contentTypeFor(p))) return;
      return json(res, 404, { error: `${publicAssetRoot} asset not found` });
    }

    if (req.method === "GET" && url.pathname.startsWith("/modules/")) {
      const rel = url.pathname.replace("/modules/", "");
      const safe = rel.replace(/^(\.\.(\/|\\|$))+/, "");
      const p = path.join(PUBLIC_DIR, "modules", safe);
      if (sendFile(p, contentTypeFor(p))) return;
      return json(res, 404, { error: "Module asset not found" });
    }

    const modulePageRouteMap: Record<string, { key: string; title: string; appleTitle: string; manifestHref: string; folder?: string; fallbackToModules?: boolean }> = {
      "/converter": {
        key: "converter",
        folder: "converter",
        fallbackToModules: true,
        title: "BRMedia Converter",
        appleTitle: "Converter",
        manifestHref: "/converter/site.webmanifest?v=20260505",
      },
      "/tagger": {
        key: "tagger",
        folder: "tagger",
        fallbackToModules: true,
        title: "BRMedia Tagger",
        appleTitle: "Tagger",
        manifestHref: "/tagger/site.webmanifest?v=20260505",
      },
      "/mastering": {
        key: "mastering",
        folder: "mastering",
        fallbackToModules: true,
        title: "BRMedia Mastering",
        appleTitle: "Mastering",
        manifestHref: "/mastering/site.webmanifest?v=20260505",
      },
      "/video-player": {
        key: "video-player",
        folder: "video-player",
        fallbackToModules: true,
        title: "BRMedia Video Player",
        appleTitle: "Video",
        manifestHref: "/video-player/site.webmanifest?v=20260505",
      },
      "/stats": {
        key: "stats",
        folder: "stats",
        fallbackToModules: true,
        title: "BRMedia Stats",
        appleTitle: "Stats",
        manifestHref: "/stats/site.webmanifest?v=20260505",
      },
      "/server-settings": {
        key: "server-settings",
        folder: "server-settings",
        fallbackToModules: true,
        title: "BRMedia Server Settings",
        appleTitle: "Server",
        manifestHref: "/server-settings/site.webmanifest?v=20260505",
      },
      "/settings": {
        key: "settings",
        folder: "settings",
        fallbackToModules: false,
        title: "BRMedia Settings",
        appleTitle: "Settings",
        manifestHref: "/settings/site.webmanifest?v=20260509",
      },
    };

    const modulePageRoute = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;

    if (req.method === "GET" && modulePageRouteMap[modulePageRoute]) {
      const route = modulePageRouteMap[modulePageRoute];
      const dedicatedFolder = route.folder || route.key;
      const dedicatedIndex = path.join(PUBLIC_DIR, dedicatedFolder, "index.html");

      if (sendFile(dedicatedIndex, contentTypeFor(dedicatedIndex))) return;

      if (route.fallbackToModules !== false) {
        const p = path.join(PUBLIC_DIR, "modules", "index.html");
        if (sendHtmlWithAppShell(p, route)) return;
      }

      return json(res, 404, { error: `${route.title} page not found` });
    }

    if (req.method === "GET" && url.pathname.startsWith("/player/")) {
      const rel = url.pathname.replace("/player/", "");
      const safe = rel.replace(/^(\.\.(\/|\\|$))+/, "");
      const p = path.join(PUBLIC_DIR, "player", safe);
      if (sendFile(p, contentTypeFor(p))) return;
      return json(res, 404, { error: "Asset not found" });
    }

    if (req.method === "GET" && url.pathname.startsWith("/tracklist-data/")) {
      const id = decodeURIComponent(url.pathname.replace("/tracklist-data/", "").trim());
      if (!id) return json(res, 400, { error: "Missing id" });

      const item = getLibraryItem(id);
      if (!item) return json(res, 404, { error: "Not found" });
      if (item.source !== "local") return json(res, 501, { error: "Source not implemented yet" });

      const allowed = validateLocalPathAllowed(item.locator, cfg.localAllowedBases);
      if (!allowed.ok) return json(res, 403, { error: allowed.reason });

      const loaded = loadTracklistDataForItem(item);
      return json(res, 200, { id, sourceKind: loaded.sourceKind, data: loaded.data });
    }

    if (req.method === "POST" && url.pathname.startsWith("/tracklist-data/")) {
      const id = decodeURIComponent(url.pathname.replace("/tracklist-data/", "").trim());
      if (!id) return json(res, 400, { error: "Missing id" });

      const item = getLibraryItem(id);
      if (!item) return json(res, 404, { error: "Not found" });
      if (item.source !== "local") return json(res, 501, { error: "Source not implemented yet" });

      const allowed = validateLocalPathAllowed(item.locator, cfg.localAllowedBases);
      if (!allowed.ok) return json(res, 403, { error: allowed.reason });

      const body = await readJsonBody(req);
      const safeData = {
        metaEntries: Array.isArray(body?.metaEntries) ? body.metaEntries : [],
        description: typeof body?.description === "string" ? body.description : "",
        tracks: Array.isArray(body?.tracks) ? body.tracks : [],
      };

      const loaded = loadTracklistDataForItem(item);
      fs.writeFileSync(loaded.jsonPath, JSON.stringify(safeData, null, 2), "utf8");
      fs.writeFileSync(loaded.txtPath, `${buildTracklistTextServer(safeData)}\n`, "utf8");

      return json(res, 200, { ok: true, sourceKind: "json", data: safeData });
    }

if (req.method === "GET" && url.pathname.startsWith("/tracklist-name-detect/jobs/")) {
  const jobId = decodeURIComponent(url.pathname.replace("/tracklist-name-detect/jobs/", "").trim());
  if (!jobId) return json(res, 400, { error: "Missing name detection job id" });

  const job = getTracklistNameDetectJob(jobId);
  if (!job) return json(res, 404, { error: "Name detection job not found" });

  return json(res, 200, job);
}

if (req.method === "POST" && url.pathname.startsWith("/tracklist-name-detect/") && url.pathname.endsWith("/jobs")) {
  const id = decodeURIComponent(url.pathname.replace("/tracklist-name-detect/", "").replace(/\/jobs$/, "").trim());
  if (!id) return json(res, 400, { error: "Missing id" });

  const item = getLibraryItem(id);
  if (!item) return json(res, 404, { error: "Not found" });
  if (item.source !== "local") return json(res, 501, { error: "Source not implemented yet" });

  const allowed = validateLocalPathAllowed(item.locator, cfg.localAllowedBases);
  if (!allowed.ok) return json(res, 403, { error: allowed.reason });

  const body = await readJsonBody(req).catch(() => ({}));
  const job = startTracklistNameDetectJob(item, listLibrary(), body?.tracklistData || { tracks: [] });

  return json(res, 202, job);
}

if (req.method === "GET" && url.pathname.startsWith("/tracklist-auto-scan/jobs/")) {
  const jobId = decodeURIComponent(url.pathname.replace("/tracklist-auto-scan/jobs/", "").trim());
  if (!jobId) return json(res, 400, { error: "Missing auto scan job id" });

  const job = getTracklistAutoScanJob(jobId);
  if (!job) return json(res, 404, { error: "Auto scan job not found" });

  return json(res, 200, job);
}

if (req.method === "POST" && url.pathname.startsWith("/tracklist-auto-scan/") && url.pathname.endsWith("/jobs")) {
  const id = decodeURIComponent(url.pathname.replace("/tracklist-auto-scan/", "").replace(/\/jobs$/, "").trim());
  if (!id) return json(res, 400, { error: "Missing id" });

  const item = getLibraryItem(id);
  if (!item) return json(res, 404, { error: "Not found" });
  if (item.source !== "local") return json(res, 501, { error: "Source not implemented yet" });

  const allowed = validateLocalPathAllowed(item.locator, cfg.localAllowedBases);
  if (!allowed.ok) return json(res, 403, { error: allowed.reason });

  const body = await readJsonBody(req).catch(() => ({}));
  const job = startTracklistAutoScanJob(item, body?.mode || "balanced");

  return json(res, 202, job);
}

if (req.method === "POST" && url.pathname.startsWith("/tracklist-scan/")) {
  const id = decodeURIComponent(url.pathname.replace("/tracklist-scan/", "").trim());
  if (!id) return json(res, 400, { error: "Missing id" });

  const item = getLibraryItem(id);
  if (!item) return json(res, 404, { error: "Not found" });
  if (item.source !== "local") return json(res, 501, { error: "Source not implemented yet" });

  const allowed = validateLocalPathAllowed(item.locator, cfg.localAllowedBases);
  if (!allowed.ok) return json(res, 403, { error: allowed.reason });

  const scanned = buildLocalScanTracklistData(item);
  return json(res, 200, {
    ok: true,
    sourceKind: scanned.sourceKind,
    data: scanned.data,
  });
}

    if (req.method === "GET" && url.pathname.startsWith("/tracklist/")) {
      const id = decodeURIComponent(url.pathname.replace("/tracklist/", "").trim());
      if (!id) return json(res, 400, { error: "Missing id" });

      const item = getLibraryItem(id);
      if (!item) return json(res, 404, { error: "Not found" });
      if (item.source !== "local") return json(res, 501, { error: "Source not implemented yet" });

      const allowed = validateLocalPathAllowed(item.locator, cfg.localAllowedBases);
      if (!allowed.ok) return json(res, 403, { error: allowed.reason });

      const loaded = loadTracklistDataForItem(item);
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end(buildTracklistTextServer(loaded.data) || "No tracklist available.");
      return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/track/")) {
      const { id, action } = parseTrackIdAndAction(url.pathname);

      if (!id) return json(res, 400, { error: "Missing id" });

      const item = getLibraryItem(id);
      if (!item) return json(res, 404, { error: "Not found" });

      if (item.source !== "local") return json(res, 501, { error: "Source not implemented yet" });

      const allowed = validateLocalPathAllowed(item.locator, cfg.localAllowedBases);
      if (!allowed.ok) return json(res, 403, { error: allowed.reason });

      if (!fs.existsSync(item.locator)) {
        return json(res, 404, { error: "File missing" });
      }

      if (action === "meta") {
        try {
          const payload = await readTrackMetadata(item.locator, item.title, item.id);
          return json(res, 200, payload);
        } catch (e: any) {
          return json(res, 500, {
            error: "Failed to read metadata",
            detail: String(e?.message || e),
          });
        }
      }

      if (action === "artwork") {
        try {
          const found = buildArtworkCandidates(item.locator).find((candidate) => fs.existsSync(candidate));

          if (found) {
            const allowedImg = validateLocalPathAllowed(found, cfg.localAllowedBases);
            if (!allowedImg.ok) return json(res, 403, { error: allowedImg.reason });

            const cacheKey = getArtworkCacheKey("file", found);
            const cached = getArtworkMemoryCache(cacheKey);

            if (cached) {
              sendArtworkBuffer(res, cached.contentType, cached.buffer);
              return;
            }

            const contentType = getContentTypeForArtwork(found);
            const buffer = fs.readFileSync(found);

            rememberArtworkMemoryCache(cacheKey, {
              contentType,
              buffer,
              savedAt: Date.now(),
            });

            sendArtworkBuffer(res, contentType, buffer);
            return;
          }

          const embeddedCacheKey = getArtworkCacheKey("embedded", item.locator);
          const cached = getArtworkMemoryCache(embeddedCacheKey);

          if (cached) {
            sendArtworkBuffer(res, cached.contentType, cached.buffer);
            return;
          }

          const meta = await mm.parseFile(item.locator, { duration: false });
          const pic = meta.common?.picture?.[0];

          if (pic) {
            const contentType = pic.format || "image/jpeg";
            const buffer = Buffer.from(pic.data);

            rememberArtworkMemoryCache(embeddedCacheKey, {
              contentType,
              buffer,
              savedAt: Date.now(),
            });

            sendArtworkBuffer(res, contentType, buffer);
            return;
          }

          return json(res, 404, { error: "No embedded artwork and no image file found" });
        } catch (e: any) {
          return json(res, 500, {
            error: "Failed to read artwork",
            detail: String(e?.message || e),
          });
        }
      }

      if (action === "waveform") {
        try {
          const peakCount = normaliseWaveformPeakCount(url.searchParams.get("count"));
          const payload = await getCachedWaveform(item.locator, peakCount);

          return json(res, 200, {
            id: item.id,
            duration: payload.duration,
            peaks: payload.peaks,
            count: peakCount,
            cached: payload.cached,
          });
        } catch (e: any) {
          return json(res, 500, {
            error: "Failed to build waveform",
            detail: String(e?.message || e),
          });
        }
      }

      return json(res, 404, { error: "Unknown track action" });
    }

    return json(res, 404, { error: "Not found" });
  } catch (err: any) {
    return json(res, 500, {
      error: "Server error",
      detail: String(err?.message ?? err),
    });
  }
});

autoImportAllowedBases();

server.listen(cfg.port, () => {
  console.log(`[BRMedia Server] listening on http://localhost:${cfg.port}`);
});