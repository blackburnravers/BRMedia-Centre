import http from "node:http";
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import zlib from "node:zlib";
import { spawn } from "node:child_process";
import { loadConfig } from "./config";
import { applyCors } from "./middleware/cors";
import { json as rawJson } from "./utils/json";
import { handleApiRoute } from "./api/router";
import { streamFileWithRange } from "./streaming/rangeStream";
import { MixxxMasterStreamManager, MasterStreamError } from "./mixxxMasterStream";
import { WasapiLoopbackCaptureFactory } from "./mixxxMasterCapture";
import { MixxxWebRtcSidecar } from "./mixxxWebRtcSidecar";
import { MixxxGStreamerWebRtc, parseMixxxMediaTransport } from "./mixxxGStreamerWebRtc";
import { resolveM26DjPerformanceContext } from "./mixxxM26DjTrust";
import { mixxxMidiBridge } from "./mixxxBridge";
import {
  addLocalFileToLibraryWithMetadata,
  backfillMissingAudioLibraryMetadata,
  persistAudioLibraryManifest,
  findLibraryItemByLocator,
  getLibraryItem,
  isSupportedAudioFile,
  listLibrary,
  removeLibraryItemsUnderRoot,
  syncAudioLibraryFromRoots,
  syncAudioLibraryFromRootsYielding,
} from "./db/library";
import * as mm from "music-metadata";
import { validateLocalPathAllowed } from "./sources/local/validateLocalPathAllowed";
import {
  DEFAULT_WAVEFORM_PEAKS,
  getCachedWaveform,
  getWaveformCacheHealth,
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
import {
  browseServerFolders,
  getAllEnabledLibrarySourcePaths,
  getDefaultLibrarySourcePath,
  getEnabledLibrarySourcePaths,
  getLibrarySourceById,
  getLibrarySourcesWithStatus,
  removeLibrarySource,
  upsertLibrarySource,
} from "./librarySources";
import {
  appendStatsEvent,
  appendStatsEventOnce,
  appendStatsEvents,
  buildProfileStatsSummary,
  buildStatsEventsSummary,
  getStatsEventsStatus,
  readRecentStatsEvents,
} from "./statsEvents";

const BRMEDIA_PROJECT_ROOT = (
  fs.existsSync(path.join(process.cwd(), "server", "src", "index.ts")) ||
  fs.existsSync(path.join(process.cwd(), "server", "public"))
) ? process.cwd() : path.resolve(__dirname, "..", "..");

const BOOTSTRAP_SERVER_DATA_DIR = path.join(BRMEDIA_PROJECT_ROOT, "server", "data");
const BOOTSTRAP_SERVER_SECRETS_PATH = path.join(BOOTSTRAP_SERVER_DATA_DIR, "brmedia-server-secrets.json");
const BOOTSTRAP_SERVER_SECRET_KEYS = new Set([
  "TMDB_API_KEY",
  "TMDB_BEARER_TOKEN",
  "OMDB_API_KEY",
  "GOOGLE_DRIVE_CLIENT_ID",
  "GOOGLE_DRIVE_CLIENT_SECRET",
  "GOOGLE_DRIVE_REDIRECT_URI",
  "GOOGLE_DRIVE_SCOPES",
  "DROPBOX_APP_KEY",
  "DROPBOX_APP_SECRET",
  "DROPBOX_REDIRECT_URI",
  "FFMPEG_PATH",
  "BRMEDIA_AUDIO_DIRS",
  "BRMEDIA_VIDEO_DIRS",
  "CLOUD_IMPORT_DIR",
  "LINK_IMPORT_DIR",
]);

function applyBootstrapServerSecretsToProcessEnv() {
  try {
    if (!fs.existsSync(BOOTSTRAP_SERVER_SECRETS_PATH)) return;

    const parsed = JSON.parse(fs.readFileSync(BOOTSTRAP_SERVER_SECRETS_PATH, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;

    Object.entries(parsed).forEach(([key, value]) => {
      if (!BOOTSTRAP_SERVER_SECRET_KEYS.has(key)) return;
      const text = String(value ?? "").trim();
      if (!text) return;
      process.env[key] = text;
    });
  } catch {
    // Ignore broken/missing secret store during bootstrap.
  }
}

applyBootstrapServerSecretsToProcessEnv();

const cfg = loadConfig();
const PLAYER_RUNTIME_STATE_DIR = path.join(BRMEDIA_PROJECT_ROOT, "server", "data");
const PLAYER_RUNTIME_STATE_PATH = path.join(PLAYER_RUNTIME_STATE_DIR, "player-runtime-state.json");
const PLAYER_EVENTS_PATH = path.join(PLAYER_RUNTIME_STATE_DIR, "player-events.jsonl");
const VIDEO_EVENTS_PATH = path.join(PLAYER_RUNTIME_STATE_DIR, "video-events.jsonl");
const BRMEDIA_CUSTOM_TAGS_PATH = path.join(PLAYER_RUNTIME_STATE_DIR, "brmedia-custom-tags.json");
function getAudioLibraryRoots() {
  return getEnabledLibrarySourcePaths("audio");
}

function getVideoLibraryRoots() {
  return getEnabledLibrarySourcePaths("video");
}

const VIDEO_METADATA_CACHE_PATH = path.join(PLAYER_RUNTIME_STATE_DIR, "video-metadata-cache.json");
const VIDEO_LIBRARY_MANIFEST_PATH = path.join(PLAYER_RUNTIME_STATE_DIR, "video-library-manifest.json");
const VIDEO_LIBRARY_CACHE = new Map<string, any>();
const VIDEO_BROWSER_COPY_JOBS = new Map<string, any>();
const VIDEO_BROWSER_COPY_PROCESSES = new Map<string, any>();
const CONVERTER_UPLOADS = new Map<string, any>();
const CONVERTER_JOBS = new Map<string, any>();
const MASTERING_UPLOADS = new Map<string, any>();
const MASTERING_JOBS = new Map<string, any>();
const SERVER_SECRETS_PATH = path.join(PLAYER_RUNTIME_STATE_DIR, "brmedia-server-secrets.json");
const TORRENT_STATE_PATH =
  path.join(
    PLAYER_RUNTIME_STATE_DIR,
    "torrent-state.json"
  );

const TORRENT_UPLOAD_DIR =
  path.join(
    PLAYER_RUNTIME_STATE_DIR,
    "torrent-uploads"
  );

const TORRENT_NOTIFICATION_LIMIT =
  120;

const TORRENT_SCAN_HISTORY_LIMIT =
  120;

const TORRENT_SPEED_HISTORY_LIMIT =
  600;

const TORRENT_QUARANTINE_HISTORY_LIMIT =
  240;
const BRMEDIA_PROFILES_PATH = path.join(PLAYER_RUNTIME_STATE_DIR, "brmedia-profiles.json");
const BRMEDIA_PROFILE_COOKIE = "brmedia_profile_token";
const SERVER_CRASH_LOG_PATH = path.join(PLAYER_RUNTIME_STATE_DIR, "server-crashes.log");
const SERVER_STARTED_AT = Date.now();

function formatServerCrashError(err: any) {
  const message = String(err?.stack || err?.message || err || "Unknown server error");
  return `[${new Date().toISOString()}] ${message}\n\n`;
}

function logServerCrash(kind: string, err: any) {
  try {
    ensurePlayerRuntimeStateDir();
    fs.appendFileSync(SERVER_CRASH_LOG_PATH, `[${kind}] ${formatServerCrashError(err)}`, "utf8");
  } catch {}

  try {
    console.error(`[BRMedia Server] ${kind}`, err);
  } catch {}
}

function json(res: http.ServerResponse, status: number, body: unknown): boolean {
  try {
    if (res.writableEnded || res.destroyed) return false;

    return rawJson(res, status, body);
  } catch (err: any) {
    logServerCrash("jsonResponseError", err);

    try {
      if (!res.writableEnded && !res.destroyed) res.end();
    } catch {}

    return false;
  }
}

function compressedJson(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  status: number,
  body: unknown,

  options: {
    cacheControl?: string;
    etag?: string;
  } = {}
): boolean {
  try {
    if (
      res.writableEnded ||
      res.destroyed
    ) {
      return false;
    }

    const raw = Buffer.from(
      JSON.stringify(body)
    );

    const acceptsGzip =
      /(?:^|,|\s)gzip(?:,|\s|$)/i
        .test(
          String(
            req.headers[
              "accept-encoding"
            ] || ""
          )
        );

    const payload =
      acceptsGzip
        ? zlib.gzipSync(
            raw,
            { level: 6 }
          )
        : raw;

    res.statusCode = status;

    res.setHeader(
      "Content-Type",
      "application/json; charset=utf-8"
    );

    res.setHeader(
      "Cache-Control",
      options.cacheControl ||
      "no-store"
    );

    res.setHeader(
      "Vary",
      "Accept-Encoding"
    );

    if (options.etag) {
      res.setHeader(
        "ETag",
        options.etag
      );

      if (
        req.headers[
          "if-none-match"
        ] === options.etag
      ) {
        res.statusCode = 304;
        res.end();
        return true;
      }
    }

    if (acceptsGzip) {
      res.setHeader(
        "Content-Encoding",
        "gzip"
      );
    }

    res.setHeader(
      "Content-Length",
      String(payload.length)
    );

    res.end(payload);
    return true;
  } catch (err: any) {
    logServerCrash(
      "compressedJsonResponseError",
      err
    );

    return json(
      res,
      500,
      {
        error:
          "Response compression failed",
      }
    );
  }
}

process.on("unhandledRejection", (err) => {
  logServerCrash("unhandledRejection", err);
});

process.on("uncaughtException", (err) => {
  logServerCrash("uncaughtException", err);

  setTimeout(() => {
    process.exit(1);
  }, 500).unref();
});

const SERVER_SECRET_FIELDS = [
  { key: "TMDB_API_KEY", label: "TMDb API Key", group: "Video metadata", kind: "secret" },
  { key: "TMDB_BEARER_TOKEN", label: "TMDb Bearer Token", group: "Video metadata", kind: "secret" },
  { key: "OMDB_API_KEY", label: "OMDb API Key", group: "Video metadata", kind: "secret" },

  { key: "GOOGLE_DRIVE_CLIENT_ID", label: "Google Drive Client ID", group: "Google Drive", kind: "text" },
  { key: "GOOGLE_DRIVE_CLIENT_SECRET", label: "Google Drive Client Secret", group: "Google Drive", kind: "secret" },
  { key: "GOOGLE_DRIVE_REDIRECT_URI", label: "Google Drive Redirect URI", group: "Google Drive", kind: "text" },
  { key: "GOOGLE_DRIVE_SCOPES", label: "Google Drive Scopes", group: "Google Drive", kind: "text" },

  { key: "DROPBOX_APP_KEY", label: "Dropbox App Key", group: "Dropbox", kind: "text" },
  { key: "DROPBOX_APP_SECRET", label: "Dropbox App Secret", group: "Dropbox", kind: "secret" },
  { key: "DROPBOX_REDIRECT_URI", label: "Dropbox Redirect URI", group: "Dropbox", kind: "text" },

  { key: "FFMPEG_PATH", label: "FFmpeg Path", group: "Tools", kind: "text" },
  { key: "BRMEDIA_AUDIO_DIRS", label: "Audio Library Folders", group: "Folders", kind: "text" },
  { key: "BRMEDIA_VIDEO_DIRS", label: "Video Library Folders", group: "Folders", kind: "text" },
  { key: "CLOUD_IMPORT_DIR", label: "Cloud Import Folder", group: "Folders", kind: "text" },
  { key: "LINK_IMPORT_DIR", label: "Direct URL Import Folder", group: "Folders", kind: "text" },
];

const SERVER_SECRET_KEYS = new Set(SERVER_SECRET_FIELDS.map((field) => field.key));

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
    backupItem = await addLocalFileToLibraryWithMetadata(backupPath, `${item.title || path.parse(backupPath).name} (BRMedia Backup)`);
    await addLocalFileToLibraryWithMetadata(item.locator, item.title);
  } else {
    resultItem = await addLocalFileToLibraryWithMetadata(finalPath);
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

function readServerSecretsStore(): Record<string, string> {
  try {
    if (!fs.existsSync(SERVER_SECRETS_PATH)) return {};
    const raw = fs.readFileSync(SERVER_SECRETS_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const out: Record<string, string> = {};
    Object.entries(parsed).forEach(([key, value]) => {
      if (!SERVER_SECRET_KEYS.has(key)) return;
      const text = firstString(value);
      if (text) out[key] = text;
    });

    return out;
  } catch {
    return {};
  }
}

function writeServerSecretsStore(store: Record<string, string>) {
  ensurePlayerRuntimeStateDir();

  const safe: Record<string, string> = {};
  Object.entries(store || {}).forEach(([key, value]) => {
    if (!SERVER_SECRET_KEYS.has(key)) return;
    const text = firstString(value);
    if (text) safe[key] = text;
  });

  fs.writeFileSync(SERVER_SECRETS_PATH, JSON.stringify(safe, null, 2), "utf8");
}

function applyServerSecretsToProcessEnv() {
  const store = readServerSecretsStore();

  Object.entries(store).forEach(([key, value]) => {
    if (!SERVER_SECRET_KEYS.has(key)) return;
    if (!value) return;
    process.env[key] = value;
  });
}

function maskServerSecretValue(value: string, kind = "secret") {
  const text = firstString(value) || "";
  if (!text) return "";

  if (kind !== "secret") {
    return text.length > 72 ? `${text.slice(0, 70)}…` : text;
  }

  if (text.length <= 4) return "••••";
  return `••••••${text.slice(-4)}`;
}

function getServerSecretsStatus() {
  const store = readServerSecretsStore();

  return SERVER_SECRET_FIELDS.map((field) => {
    const saved = !!store[field.key];
    const current = firstString(process.env[field.key]) || "";

    return {
      ...field,
      isSet: !!current,
      saved,
      source: saved ? "Server Settings" : current ? ".env / process" : "Not set",
      preview: current ? maskServerSecretValue(current, field.kind) : "",
    };
  });
}

function saveServerSecretsFromBody(body: any) {
  const values = body?.values && typeof body.values === "object" ? body.values : {};
  const store = readServerSecretsStore();
  let changed = 0;

  SERVER_SECRET_FIELDS.forEach((field) => {
    const value = firstString(values[field.key]);
    if (!value) return;

    store[field.key] = value;
    process.env[field.key] = value;
    changed += 1;
  });

  writeServerSecretsStore(store);

  return {
    ok: true,
    changed,
    status: getServerSecretsStatus(),
  };
}

function clearServerSecretsFromBody(body: any) {
  const keys: string[] = Array.isArray(body?.keys) ? body.keys.map((key: any) => String(key || "").trim()) : [];
  const store = readServerSecretsStore();
  let changed = 0;

  keys.forEach((key) => {
    if (!SERVER_SECRET_KEYS.has(key)) return;
    if (store[key]) changed += 1;
    delete store[key];
    delete process.env[key];
  });

  writeServerSecretsStore(store);

  return {
    ok: true,
    changed,
    status: getServerSecretsStatus(),
  };
}

function sanitiseRuntimeEventExtra(input: any) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return undefined;

  const output: Record<string, string | number | boolean> = {};

  Object.entries(input)
    .slice(0, 20)
    .forEach(([key, value]) => {
      const safeKey = String(key || "")
        .replace(/[\r\n\t]+/g, " ")
        .trim()
        .slice(0, 60);

      if (!safeKey) return;

      if (typeof value === "boolean") {
        output[safeKey] = value;
        return;
      }

      if (typeof value === "number" && Number.isFinite(value)) {
        output[safeKey] = value;
        return;
      }

      if (typeof value === "string") {
        output[safeKey] = value
          .replace(/[\r\n\t]+/g, " ")
          .trim()
          .slice(0, 240);
      }
    });

  return Object.keys(output).length
    ? output
    : undefined;
}

function sanitisePlayerEvent(input: any) {
  if (!input || typeof input !== "object") return null;

  const type = firstString(input.type) || "event";
  const trackId = firstString(input.trackId) || firstString(input.id) || "";
  const title = firstString(input.title) || "";
  const artist = firstString(input.artist) || "";
  const source = firstString(input.source) || "";
  const route = firstString(input.route) || "player";
  const position = Number(input.position || 0);
  const duration = Number(input.duration || 0);
  const value = Number(input.value || 0);
  const count = Number(input.count || 1);
  const status = firstString(input.status) || "";

  return {
    type: type.slice(0, 48),
    trackId: trackId.slice(0, 160),
    title: title.slice(0, 220),
    artist: artist.slice(0, 220),
    source: source.slice(0, 80),
    route: route.slice(0, 80),
    position: Number.isFinite(position) ? Math.max(0, position) : 0,
    duration: Number.isFinite(duration) ? Math.max(0, duration) : 0,
    value: Number.isFinite(value) ? value : 0,
    count: Number.isFinite(count) ? Math.max(1, Math.round(count)) : 1,
    status: status.slice(0, 80),
    isCloud: !!input.isCloud,
    extra: sanitiseRuntimeEventExtra(input.extra),
    at: Number(input.at || 0) || Date.now(),
  };
}

function appendPlayerEvents(body: any, profileId = "") {
  const rawEvents = Array.isArray(body?.events) ? body.events : [body];
  const events = rawEvents.map(sanitisePlayerEvent).filter(Boolean);
  if (!events.length) return { ok: true, saved: 0 };

  ensurePlayerRuntimeStateDir();

  fs.appendFileSync(
    PLAYER_EVENTS_PATH,
    events.map((event: any) => JSON.stringify(event)).join("\n") + "\n",
    "utf8"
  );

  appendStatsEvents(
    events.map((event: any) => ({
      ...event,
      module: "player",
      entityType: event.extra?.entityType || "audio",
      entityId: event.extra?.entityId || event.trackId,
      profileId,
    })),
    "player"
  );

  return { ok: true, saved: events.length };
}

function readRecentPlayerEvents(limit = 100) {
  try {
    if (!fs.existsSync(PLAYER_EVENTS_PATH)) return [];

    const safeLimit = Math.max(1, Math.min(1000, Number(limit || 100)));

    return fs.readFileSync(PLAYER_EVENTS_PATH, "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(-safeLimit)
      .map((line: string) => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter(Boolean)
      .reverse();
  } catch {
    return [];
  }
}

function sanitiseVideoEvent(input: any) {
  if (!input || typeof input !== "object") return null;

  const type = firstString(input.type) || "event";
  const videoId = firstString(input.videoId) || firstString(input.id) || "";
  const title = firstString(input.title) || "";
  const genre = firstString(input.genre) || "";
  const year = firstString(input.year) || "";
  const source = firstString(input.source) || "";
  const route = firstString(input.route) || "video-player";
  const position = Number(input.position || 0);
  const duration = Number(input.duration || 0);
  const value = Number(input.value || 0);
  const count = Number(input.count || 1);
  const status = firstString(input.status) || "";

  return {
    type: type.slice(0, 48),
    videoId: videoId.slice(0, 160),
    title: title.slice(0, 220),
    genre: genre.slice(0, 120),
    year: year.slice(0, 32),
    source: source.slice(0, 80),
    route: route.slice(0, 120),
    position: Number.isFinite(position) ? Math.max(0, position) : 0,
    duration: Number.isFinite(duration) ? Math.max(0, duration) : 0,
    value: Number.isFinite(value) ? value : 0,
    count: Number.isFinite(count) ? Math.max(1, Math.round(count)) : 1,
    status: status.slice(0, 80),
    extra: sanitiseRuntimeEventExtra(input.extra),
    at: Number(input.at || 0) || Date.now(),
  };
}

function appendVideoEvents(body: any, profileId = "") {
  const rawEvents = Array.isArray(body?.events) ? body.events : [body];
  const events = rawEvents.map(sanitiseVideoEvent).filter(Boolean);
  if (!events.length) return { ok: true, saved: 0 };

  ensurePlayerRuntimeStateDir();

  fs.appendFileSync(
    VIDEO_EVENTS_PATH,
    events.map((event: any) => JSON.stringify(event)).join("\n") + "\n",
    "utf8"
  );

  appendStatsEvents(
    events.map((event: any) => ({
      ...event,
      module: "video",
      entityType: event.extra?.entityType || "video",
      entityId: event.extra?.entityId || event.videoId,
      profileId,
    })),
    "video"
  );

  return { ok: true, saved: events.length };
}

function readRecentVideoEvents(limit = 100) {
  try {
    if (!fs.existsSync(VIDEO_EVENTS_PATH)) return [];

    const safeLimit = Math.max(1, Math.min(1000, Number(limit || 100)));

    return fs.readFileSync(VIDEO_EVENTS_PATH, "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(-safeLimit)
      .map((line: string) => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter(Boolean)
      .reverse();
  } catch {
    return [];
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

function readBrMediaProfileStore() {
  try {
    ensurePlayerRuntimeStateDir();
    if (!fs.existsSync(BRMEDIA_PROFILES_PATH)) return { users: [], sessions: [] };

    const parsed = JSON.parse(fs.readFileSync(BRMEDIA_PROFILES_PATH, "utf8"));
    return {
      users: Array.isArray(parsed?.users) ? parsed.users : [],
      sessions: Array.isArray(parsed?.sessions) ? parsed.sessions : [],
    };
  } catch {
    return { users: [], sessions: [] };
  }
}

function writeBrMediaProfileStore(store: any) {
  ensurePlayerRuntimeStateDir();
  fs.writeFileSync(BRMEDIA_PROFILES_PATH, JSON.stringify({
    users: Array.isArray(store?.users) ? store.users : [],
    sessions: Array.isArray(store?.sessions) ? store.sessions : [],
  }, null, 2), "utf8");
}

function normaliseProfileLogin(value: any) {
  return String(value || "").trim().toLowerCase();
}

function makeBrMediaPublicProfile(user: any) {
  if (!user) return null;
  const inbox = Array.isArray(user.inbox) ? user.inbox : [];

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName || user.username,
    email: user.email || "",
    avatar: user.avatar || "",
    role: user.role || "member",
    createdAt: Number(user.createdAt || 0),
    lastLoginAt: Number(user.lastLoginAt || 0),
    stateUpdatedAt: Number(user.state?.updatedAt || 0),
    inboxUnread: inbox.filter((item: any) => !item.readAt).length,
  };
}

function createBrMediaPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password || ""), salt, 64).toString("hex");
  return { salt, hash };
}

function hashBrMediaProfileResetPassword(password: string) {
  return crypto.createHash("sha256").update(String(password || ""), "utf8").digest("hex");
}

function verifyBrMediaProfileResetPassword(password: string, user: any) {
  const resetHash = String(user?.passwordResetHash || "").trim();
  const expiresAt = Number(user?.passwordResetExpiresAt || 0);

  if (!resetHash || !expiresAt || Date.now() > expiresAt) return false;

  try {
    const expected = Buffer.from(resetHash, "hex");
    const actual = Buffer.from(hashBrMediaProfileResetPassword(password), "hex");
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function verifyBrMediaPassword(password: string, user: any) {
  try {
    const expected = Buffer.from(String(user?.passwordHash || ""), "hex");
    const actual = Buffer.from(
      crypto.scryptSync(String(password || ""), String(user?.passwordSalt || ""), 64).toString("hex"),
      "hex"
    );

    if (!expected.length || expected.length !== actual.length) return false;
    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function parseBrMediaCookies(req: http.IncomingMessage) {
  const cookies: Record<string, string> = {};

  String(req.headers.cookie || "").split(";").forEach((entry) => {
    const index = entry.indexOf("=");
    if (index < 0) return;

    const key = entry.slice(0, index).trim();
    const value = entry.slice(index + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value || "");
  });

  return cookies;
}

function setBrMediaProfileCookie(res: http.ServerResponse, token: string) {
  res.setHeader(
    "Set-Cookie",
    `${BRMEDIA_PROFILE_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`
  );
}

function clearBrMediaProfileCookie(res: http.ServerResponse) {
  res.setHeader("Set-Cookie", `${BRMEDIA_PROFILE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

function findBrMediaProfileUser(store: any, login: string) {
  const key = normaliseProfileLogin(login);
  if (!key) return null;

  return (Array.isArray(store.users) ? store.users : []).find((user: any) => (
    normaliseProfileLogin(user.username) === key || normaliseProfileLogin(user.email) === key
  )) || null;
}

function getCurrentBrMediaProfile(req: http.IncomingMessage) {
  const token = parseBrMediaCookies(req)[BRMEDIA_PROFILE_COOKIE] || "";
  if (!token) return null;

  const store = readBrMediaProfileStore();
  const now = Date.now();

  const session = (Array.isArray(store.sessions) ? store.sessions : []).find((item: any) => (
    String(item.token) === token && Number(item.expiresAt || 0) > now
  ));

  if (!session) return null;

  const user = (Array.isArray(store.users) ? store.users : []).find((item: any) => (
    String(item.id) === String(session.userId)
  ));

  if (!user) return null;

  return { store, user, session, token };
}

const mixxxMasterCapture = new WasapiLoopbackCaptureFactory({
  projectRoot: BRMEDIA_PROJECT_ROOT,
  endpointId: process.env.BRMEDIA_MIXXX_MASTER_ENDPOINT,
});

const mixxxMasterStream = new MixxxMasterStreamManager({
  capture: mixxxMasterCapture,
  allowedOrigins: [],
  // The HTTP boundary below additionally requires the Origin host to match
  // this request's Host header. This callback only validates URL shape.
  originAllowed: (origin) => /^https?:\/\/[^/]+$/i.test(origin),
  maxListeners: 2,
  sessionTtlMs: 60_000,
  idleStopMs: 30_000,
  // At most 200 ms can wait behind observable child-stdin backpressure.
  maxQueueBytes: 38_400,
  maxCaptureRestarts: 3,
});
const mixxxWebRtcSidecar = new MixxxWebRtcSidecar(BRMEDIA_PROJECT_ROOT);
// Internal-only M26 selector. Change the environment value to custom-webrtc for immediate rollback.
const mixxxMediaTransport = parseMixxxMediaTransport(process.env.BRMEDIA_MIXXX_MEDIA_TRANSPORT || "gstreamer-webrtc");
const mixxxGStreamerWebRtc = new MixxxGStreamerWebRtc(BRMEDIA_PROJECT_ROOT);
const m26GStreamerUpgradeTokens = new Map<string, { sessionId: string; ownerId: string; expiresAt: number }>();
const m26RealBrowserDiagnostics = new Map<string, any>();
const m26IceEvidence = new Map<string, any>();
process.once("exit", () => { mixxxMasterStream.stop(); mixxxWebRtcSidecar.stopNow(); mixxxGStreamerWebRtc.stopNow(); });

function requireM26SameOrigin(req: http.IncomingMessage) {
  const host = String(req.headers.host || "").toLowerCase();
  const originHeader = String(req.headers.origin || "");
  const fetchSite = String(req.headers["sec-fetch-site"] || "").toLowerCase();
  const refererHeader = String(req.headers.referer || "");
  // Safari may omit Origin on a same-origin GET (status and PCM attachment).
  // Accept its Referer only when Fetch Metadata independently says same-origin;
  // state-changing session requests still require the CSRF marker below.
  const raw = originHeader || (fetchSite === "same-origin" ? refererHeader : "");
  try {
    const origin = new URL(raw);
    if (!host || !["http:", "https:"].includes(origin.protocol) || origin.host.toLowerCase() !== host) {
      throw new Error("origin mismatch");
    }
    return origin.origin;
  } catch {
    throw new MasterStreamError("invalid_origin", "A matching BRMedia origin is required");
  }
}

function requireM26RequestedWith(req: http.IncomingMessage) {
  if (String(req.headers["x-brmedia-requested-with"] || "") !== "dj-mixer-m26") {
    throw new MasterStreamError("csrf_rejected", "The BRMedia request marker is required");
  }
}

function requireM26DjPerformanceContext(req: http.IncomingMessage, origin: string) {
  return resolveM26DjPerformanceContext(req.headers, origin);
}

function m26StreamErrorStatus(error: unknown) {
  if (!(error instanceof MasterStreamError)) return 500;
  if (error.code === "unauthenticated") return 401;
  if (["forbidden", "invalid_origin", "csrf_rejected"].includes(error.code)) return 403;
  if (["not_found", "stale_session"].includes(error.code)) return 404;
  if (["listener_limit", "already_attached"].includes(error.code)) return 409;
  if (error.code === "rate_limited") return 429;
  return 400;
}

async function handleM26MasterStreamRoute(req: http.IncomingMessage, res: http.ServerResponse, url: URL) {
  if (!url.pathname.startsWith("/api/dj/mixxx/master-stream")) return false;
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  try {
    const origin = requireM26SameOrigin(req);
    const djContext = requireM26DjPerformanceContext(req, origin);
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");

    if (req.method === "GET" && url.pathname === "/api/dj/mixxx/master-stream/status") {
      const bridge = mixxxMidiBridge.status();
      return json(res, 200, {
        ok: true,
        stream: mixxxMasterStream.diagnostics(),
        capture: mixxxMasterCapture.diagnostics(),
        webRtcSidecar: mixxxWebRtcSidecar.diagnostics(),
        mediaTransport: { effective: mixxxMediaTransport, allowed: ["custom-webrtc", "gstreamer-webrtc"],
          customWebRtc: { ...mixxxWebRtcSidecar.diagnostics(), active: mixxxMediaTransport === "custom-webrtc" && mixxxWebRtcSidecar.diagnostics().state === "running" },
          gstreamerWebRtc: mixxxGStreamerWebRtc.diagnostics() },
        sidecarRuntime: await mixxxWebRtcSidecar.remoteDiagnostics(),
        djSession: { detected: true, ownerSource: djContext.ownerSource },
        realBrowser: m26RealBrowserDiagnostics.get(djContext.ownerId) || null,
        realBrowsers: [...m26RealBrowserDiagnostics.values()].slice(-2),
        iceEvidence: [...m26IceEvidence.values()].slice(-4),
        mixxxReady: bridge.effectiveBackend === "mixxx" && bridge.connected === true &&
          bridge.heartbeatHealthy === true && bridge.stale !== true,
      });
    }

    if (req.method === "POST" && url.pathname === "/api/dj/mixxx/master-stream/webrtc/client-telemetry") {
      requireM26RequestedWith(req); const body = await readJsonBody(req, 96 * 1024);
      const receivedAt = Date.now();
      const telemetry = body && typeof body === "object" ? body : {};
      const diagnostic = { receivedAt, trustedOwner: djContext.ownerId.slice(0, 19),
        ownerSource: djContext.ownerSource,
        userAgent: String(req.headers["user-agent"] || "").slice(0, 500), remoteAddress: String(req.socket.remoteAddress || "").slice(0, 100),
        telemetry };
      m26RealBrowserDiagnostics.set(djContext.ownerId, diagnostic);
      const receiverId = String(telemetry?.browser?.receiverIdentity || "unknown").slice(0, 128);
      const sessionId = String(telemetry?.browser?.sessionId || "pending").slice(0, 128);
      const evidenceKey = `${djContext.ownerId}:${receiverId}:${sessionId}`;
      const previous = m26IceEvidence.get(evidenceKey);
      m26IceEvidence.set(evidenceKey, { ...diagnostic, firstReceivedAt: previous?.firstReceivedAt || receivedAt,
        lastReceivedAt: receivedAt, sampleCount: Number(previous?.sampleCount || 0) + 1 });
      while (m26IceEvidence.size > 4) m26IceEvidence.delete(m26IceEvidence.keys().next().value as string);
      return json(res, 200, { ok: true, receivedAt });
    }

    if (req.method === "POST" && url.pathname === "/api/dj/mixxx/master-stream/webrtc/sessions") {
      requireM26RequestedWith(req);
      if (mixxxMediaTransport !== "custom-webrtc") return json(res, 409, { ok: false, code: "transport_inactive", error: "custom-webrtc is inactive" });
      await mixxxGStreamerWebRtc.stop();
      const bridge = mixxxMidiBridge.status();
      if (bridge.effectiveBackend !== "mixxx" || bridge.connected !== true ||
          bridge.heartbeatHealthy !== true || bridge.stale === true) {
        return json(res, 409, { ok: false, code: "mixxx_unavailable", error: "Mixxx master authority is unavailable" });
      }
      const body = await readJsonBody(req, 512 * 1024);
      const offer = String(body?.offer?.sdp || body?.sdp || "");
      if (body?.offer?.type !== "offer" || !offer.startsWith("v=0") || offer.length > 256 * 1024) {
        return json(res, 400, { ok: false, code: "invalid_offer", error: "A bounded WebRTC offer is required" });
      }
      const session = mixxxMasterStream.createSession({ authenticated: true, profileId: djContext.ownerId, origin, remoteAddress: req.socket.remoteAddress || "" });
      try {
        const answer = await mixxxWebRtcSidecar.createSession(session.id, offer, djContext.ownerId, () => {
          try { mixxxMasterStream.disconnect(session.id, djContext.ownerId); } catch {}
        });
        mixxxMasterStream.attach(session.id, session.token, djContext.ownerId, origin, mixxxWebRtcSidecar.sink(session.id));
        return json(res, 201, { ok: true, session: { id: session.id, token: session.token, expiresAt: session.expiresAt, transport: "webrtc", answer } });
      } catch (error) {
        try { mixxxMasterStream.disconnect(session.id, djContext.ownerId); } catch {}
        await mixxxWebRtcSidecar.closeSession(session.id).catch(() => {});
        throw error;
      }
    }

    if (req.method === "POST" && url.pathname === "/api/dj/mixxx/master-stream/gstreamer/sessions") {
      requireM26RequestedWith(req);
      if (mixxxMediaTransport !== "gstreamer-webrtc") return json(res, 409, { ok: false, code: "transport_inactive", error: "gstreamer-webrtc is inactive" });
      const bridge = mixxxMidiBridge.status();
      if (bridge.effectiveBackend !== "mixxx" || bridge.connected !== true || bridge.heartbeatHealthy !== true || bridge.stale === true) {
        return json(res, 409, { ok: false, code: "mixxx_unavailable", error: "Mixxx master authority is unavailable" });
      }
      await mixxxWebRtcSidecar.stop();
      const session = mixxxMasterStream.createSession({ authenticated: true, profileId: djContext.ownerId, origin, remoteAddress: req.socket.remoteAddress || "" });
      try {
        await mixxxGStreamerWebRtc.acquire(session.id);
        const upgradeToken = crypto.randomBytes(32).toString("base64url");
        m26GStreamerUpgradeTokens.set(upgradeToken, { sessionId: session.id, ownerId: djContext.ownerId, expiresAt: Date.now() + 60_000 });
        return json(res, 201, { ok: true, session: { id: session.id, token: session.token, expiresAt: session.expiresAt,
          transport: "gstreamer-webrtc", signallingEndpoint: `/api/dj/mixxx/master-stream/gstreamer/signalling?token=${upgradeToken}` } });
      } catch (error) { try { mixxxMasterStream.disconnect(session.id, djContext.ownerId); } catch {} throw error; }
    }

    const gstSessionMatch = url.pathname.match(/^\/api\/dj\/mixxx\/master-stream\/gstreamer\/sessions\/([A-Za-z0-9_-]{16,64})$/);
    if (gstSessionMatch && req.method === "DELETE") {
      requireM26RequestedWith(req); const id = gstSessionMatch[1];
      mixxxMasterStream.disconnect(id, djContext.ownerId); await mixxxGStreamerWebRtc.release(id);
      for (const [token, value] of m26GStreamerUpgradeTokens) if (value.sessionId === id) m26GStreamerUpgradeTokens.delete(token);
      return json(res, 200, { ok: true, stopped: true });
    }

    const webRtcMatch = url.pathname.match(/^\/api\/dj\/mixxx\/master-stream\/webrtc\/sessions\/([A-Za-z0-9_-]{16,64})$/);
    if (webRtcMatch && req.method === "DELETE") {
      requireM26RequestedWith(req); const id = webRtcMatch[1];
      mixxxMasterStream.disconnect(id, djContext.ownerId); await mixxxWebRtcSidecar.closeSession(id);
      return json(res, 200, { ok: true, stopped: true });
    }

    if (req.method === "POST" && url.pathname === "/api/dj/mixxx/master-stream/sessions") {
      requireM26RequestedWith(req);
      const bridge = mixxxMidiBridge.status();
      if (bridge.effectiveBackend !== "mixxx" || bridge.connected !== true ||
          bridge.heartbeatHealthy !== true || bridge.stale === true) {
        return json(res, 409, { ok: false, code: "mixxx_unavailable", error: "Mixxx master authority is unavailable" });
      }
      const session = mixxxMasterStream.createSession({ authenticated: true, profileId: djContext.ownerId, origin, remoteAddress: req.socket.remoteAddress || "" });
      return json(res, 201, {
        ok: true,
        session: {
          id: session.id,
          token: session.token,
          expiresAt: session.expiresAt,
          endpoint: `/api/dj/mixxx/master-stream/sessions/${encodeURIComponent(session.id)}/audio`,
        },
      });
    }

    const match = url.pathname.match(/^\/api\/dj\/mixxx\/master-stream\/sessions\/([A-Za-z0-9_-]{16,64})(\/audio|\/telemetry)?$/);
    if (!match) return json(res, 404, { ok: false, code: "not_found", error: "Stream route not found" });
    const id = match[1];
    if (req.method === "DELETE" && !match[2]) {
      requireM26RequestedWith(req);
      mixxxMasterStream.disconnect(id, djContext.ownerId);
      return json(res, 200, { ok: true, stopped: true });
    }
    if (req.method === "GET" && match[2] === "/audio") {
      const bearer = String(req.headers.authorization || "").match(/^Bearer\s+([A-Za-z0-9_-]{32,512})$/)?.[1] || "";
      res.statusCode = 200; res.setHeader("Content-Type", "application/vnd.brmedia.pcm"); res.setHeader("Connection", "keep-alive");
      const removeDrain = (callback: () => void) => { res.on("drain", callback); return () => res.off("drain", callback); };
      mixxxMasterStream.attach(id, bearer, djContext.ownerId, origin, {
        write: (chunk) => res.write(chunk), end: (error) => { if (res.writableEnded || res.destroyed) return; if (error) res.destroy(error); else res.end(); }, onDrain: removeDrain,
      });
      req.once("close", () => { try { mixxxMasterStream.disconnect(id, djContext.ownerId); } catch {} });
      return true;
    }
    if (req.method === "POST" && match[2] === "/telemetry") {
      requireM26RequestedWith(req);
      const bearer = String(req.headers.authorization || "").match(/^Bearer\s+([A-Za-z0-9_-]{32,512})$/)?.[1] || "";
      const body = await readJsonBody(req);
      mixxxMasterStream.recordClientTelemetry(id, bearer, djContext.ownerId, origin, body || {});
      if (mixxxMediaTransport === "gstreamer-webrtc") mixxxGStreamerWebRtc.touch(id);
      return json(res, 200, { ok: true });
    }
    return json(res, 405, { ok: false, code: "method_not_allowed", error: "Method not allowed" });
  } catch (error: any) {
    if (res.headersSent) {
      try { res.destroy(error instanceof Error ? error : new Error(String(error))); } catch {}
      return true;
    }
    return json(res, m26StreamErrorStatus(error), {
      ok: false,
      code: error instanceof MasterStreamError ? error.code : "stream_failure",
      error: error instanceof Error ? error.message : "Master stream request failed",
    });
  }
}

function createBrMediaProfileSession(store: any, userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const now = Date.now();

  const session = {
    token,
    userId,
    createdAt: now,
    expiresAt: now + 30 * 24 * 60 * 60 * 1000,
  };

  store.sessions = [
    session,
    ...(Array.isArray(store.sessions) ? store.sessions : []).filter((item: any) => Number(item.expiresAt || 0) > now),
  ].slice(0, 200);

  return session;
}

async function registerBrMediaProfile(req: http.IncomingMessage, res: http.ServerResponse) {
  const body = await readJsonBody(req).catch(() => ({}));

  const username = String(firstString(body?.username) || "").trim().replace(/\s+/g, "-").slice(0, 32);
  const displayName = String(firstString(body?.displayName) || username).trim().slice(0, 60);
  const email = String(firstString(body?.email) || "").trim().slice(0, 160);
  const password = String(firstString(body?.password) || "");

  if (!username || username.length < 2) {
    return json(res, 400, { ok: false, error: "Choose a username with at least 2 characters." });
  }

  if (!password || password.length < 4) {
    return json(res, 400, { ok: false, error: "Choose a password/PIN with at least 4 characters." });
  }

  const store = readBrMediaProfileStore();

  if (findBrMediaProfileUser(store, username) || (email && findBrMediaProfileUser(store, email))) {
    return json(res, 409, { ok: false, error: "That username or email already exists." });
  }

  const passwordData = createBrMediaPassword(password);
  const now = Date.now();

  const user = {
    id: `profile_${crypto.randomBytes(10).toString("hex")}`,
    username,
    displayName,
    email,
    avatar: "",
    role: store.users.length ? "member" : "owner",
    passwordSalt: passwordData.salt,
    passwordHash: passwordData.hash,
    createdAt: now,
    lastLoginAt: now,
    state: {
      localStorage: {},
      settings: {},
      devices: {},
      updatedAt: now,
    },
    inbox: [],
  };

  store.users.unshift(user);

  const session = createBrMediaProfileSession(store, user.id);
  writeBrMediaProfileStore(store);
  setBrMediaProfileCookie(res, session.token);

  appendStatsEvent("profile_register", "profile", {
    profileId: user.id,
    title: user.displayName || user.username,
    route: "profile",
  });

  return json(res, 200, {
    ok: true,
    profile: makeBrMediaPublicProfile(user),
  });
}

async function loginBrMediaProfile(req: http.IncomingMessage, res: http.ServerResponse) {
  const body = await readJsonBody(req).catch(() => ({}));

  const login = String(firstString(body?.login || body?.username || body?.email) || "").trim();
  const password = String(firstString(body?.password) || "");

  if (!login || !password) {
    return json(res, 400, {
      ok: false,
      code: "missing_login",
      error: "Enter your BRMedia username/email and password/PIN.",
    });
  }

  const store = readBrMediaProfileStore();
  const user = findBrMediaProfileUser(store, login);

  if (!user) {
    return json(res, 401, {
      ok: false,
      code: "profile_not_found",
      dataPath: BRMEDIA_PROFILES_PATH,
      error: "No BRMedia profile was found for that username/email. Check the profile JSON is in server/data for this BRMedia project.",
    });
  }

  const hasPasswordRecord = !!String(user.passwordHash || "").trim() && !!String(user.passwordSalt || "").trim();

  if (!hasPasswordRecord) {
    return json(res, 409, {
      ok: false,
      code: "profile_needs_password_reset",
      dataPath: BRMEDIA_PROFILES_PATH,
      error: "This profile exists, but its password/PIN record is missing. Reset the profile password/PIN from CMD.",
    });
  }

  const normalPasswordOk = verifyBrMediaPassword(password, user);
  const resetPasswordOk = !normalPasswordOk && verifyBrMediaProfileResetPassword(password, user);

  if (!normalPasswordOk && !resetPasswordOk) {
    return json(res, 401, {
      ok: false,
      code: "bad_password",
      dataPath: BRMEDIA_PROFILES_PATH,
      resetUpdatedAt: Number(user.passwordResetUpdatedAt || 0),
      resetExpiresAt: Number(user.passwordResetExpiresAt || 0),
      error: "Profile found, but the password/PIN did not match. Reset it from CMD, restart BRMedia, then try again.",
    });
  }

  if (resetPasswordOk) {
    const passwordData = createBrMediaPassword(password);
    user.passwordSalt = passwordData.salt;
    user.passwordHash = passwordData.hash;
    delete user.passwordResetHash;
    delete user.passwordResetUpdatedAt;
    delete user.passwordResetExpiresAt;
  }

  user.lastLoginAt = Date.now();

  const session = createBrMediaProfileSession(store, user.id);
  writeBrMediaProfileStore(store);
  setBrMediaProfileCookie(res, session.token);

  appendStatsEvent("profile_login", "profile", {
    profileId: user.id,
    title: user.displayName || user.username,
    route: "profile",
  });

  return json(res, 200, {
    ok: true,
    profile: makeBrMediaPublicProfile(user),
  });
}

function logoutBrMediaProfile(req: http.IncomingMessage, res: http.ServerResponse) {
  const token = parseBrMediaCookies(req)[BRMEDIA_PROFILE_COOKIE] || "";
  const store = readBrMediaProfileStore();

  store.sessions = (Array.isArray(store.sessions) ? store.sessions : []).filter((item: any) => String(item.token) !== token);

  writeBrMediaProfileStore(store);
  clearBrMediaProfileCookie(res);

  return json(res, 200, { ok: true });
}

function getBrMediaProfileState(req: http.IncomingMessage, res: http.ServerResponse) {
  const context = getCurrentBrMediaProfile(req);
  if (!context) return json(res, 401, { ok: false, error: "Not logged in." });

  return json(res, 200, {
    ok: true,
    profile: makeBrMediaPublicProfile(context.user),
    state: context.user.state || {},
  });
}

async function saveBrMediaProfileState(req: http.IncomingMessage, res: http.ServerResponse) {
  const context = getCurrentBrMediaProfile(req);
  if (!context) return json(res, 401, { ok: false, error: "Not logged in." });

  const body = await readJsonBody(req, 4 * 1024 * 1024).catch(() => ({}));

  const user = context.store.users.find((item: any) => String(item.id) === String(context.user.id));
  if (!user) return json(res, 404, { ok: false, error: "Profile not found." });

  const currentState = user.state && typeof user.state === "object" ? user.state : {};

  user.state = {
    ...currentState,
    ...body,
    localStorage: {
      ...(currentState.localStorage || {}),
      ...(body?.localStorage && typeof body.localStorage === "object" ? body.localStorage : {}),
    },
    settings: {
      ...(currentState.settings || {}),
      ...(body?.settings && typeof body.settings === "object" ? body.settings : {}),
    },
    devices: {
      ...(currentState.devices || {}),
      ...(body?.devices && typeof body.devices === "object" ? body.devices : {}),
    },
    updatedAt: Date.now(),
  };

  writeBrMediaProfileStore(context.store);

  appendStatsEvent("profile_sync", "profile", {
    profileId: user.id,
    title: user.displayName || user.username,
    route: "profile",
  });

  return json(res, 200, {
    ok: true,
    profile: makeBrMediaPublicProfile(user),
    state: user.state,
  });
}

function listBrMediaProfileUsers(req: http.IncomingMessage, res: http.ServerResponse) {
  const context = getCurrentBrMediaProfile(req);
  if (!context) return json(res, 401, { ok: false, error: "Not logged in." });

  return json(res, 200, {
    ok: true,
    users: context.store.users.map(makeBrMediaPublicProfile),
  });
}

function getBrMediaProfileInbox(req: http.IncomingMessage, res: http.ServerResponse) {
  const context = getCurrentBrMediaProfile(req);
  if (!context) return json(res, 401, { ok: false, error: "Not logged in." });

  return json(res, 200, {
    ok: true,
    inbox: Array.isArray(context.user.inbox) ? context.user.inbox.slice(0, 100) : [],
  });
}

async function updateBrMediaProfileAccount(req: http.IncomingMessage, res: http.ServerResponse) {
  const context = getCurrentBrMediaProfile(req);
  if (!context) return json(res, 401, { ok: false, error: "Not logged in." });

  const body = await readJsonBody(req).catch(() => ({}));
  const user = context.store.users.find((item: any) => String(item.id) === String(context.user.id));
  if (!user) return json(res, 404, { ok: false, error: "Profile not found." });

  const username = String(firstString(body?.username) || user.username || "").trim().replace(/\s+/g, "-").slice(0, 32);
  const displayName = String(firstString(body?.displayName) || user.displayName || username).trim().slice(0, 60);
  const email = String(firstString(body?.email) || "").trim().slice(0, 160);
  const currentPassword = String(firstString(body?.currentPassword) || "");
  const newPassword = String(firstString(body?.newPassword) || "");

  if (!username || username.length < 2) {
    return json(res, 400, { ok: false, error: "Choose a username with at least 2 characters." });
  }

  const duplicate = (Array.isArray(context.store.users) ? context.store.users : []).find((item: any) => (
    String(item.id) !== String(user.id) && (
      normaliseProfileLogin(item.username) === normaliseProfileLogin(username) ||
      (email && normaliseProfileLogin(item.email) === normaliseProfileLogin(email))
    )
  ));

  if (duplicate) {
    return json(res, 409, { ok: false, error: "That username or email is already used by another BRMedia profile." });
  }

  if (newPassword) {
    if (newPassword.length < 4) {
      return json(res, 400, { ok: false, error: "Choose a password/PIN with at least 4 characters." });
    }

    if (!currentPassword || !verifyBrMediaPassword(currentPassword, user)) {
      return json(res, 401, { ok: false, error: "Enter your current password/PIN before changing it." });
    }

    const passwordData = createBrMediaPassword(newPassword);
    user.passwordSalt = passwordData.salt;
    user.passwordHash = passwordData.hash;
  }

  user.username = username;
  user.displayName = displayName;
  user.email = email;
  user.updatedAt = Date.now();

  writeBrMediaProfileStore(context.store);

  return json(res, 200, {
    ok: true,
    profile: makeBrMediaPublicProfile(user),
  });
}

function normaliseBrMediaProfileAvatar(value: any) {
  const avatar = String(firstString(value) || "").trim();
  if (!avatar) return "";

  if (avatar.length > 3 * 1024 * 1024) return "__too_large__";

  const safeRemote = /^https?:\/\/[^\s<>"']{4,}$/i.test(avatar);
  const safeLocal = /^\/[^\s<>"']+$/i.test(avatar);
  const safeData = /^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(avatar);

  if (!safeRemote && !safeLocal && !safeData) return "__invalid__";

  return avatar;
}

async function saveBrMediaProfileAvatar(req: http.IncomingMessage, res: http.ServerResponse) {
  const context = getCurrentBrMediaProfile(req);
  if (!context) return json(res, 401, { ok: false, error: "Not logged in." });

  const body = await readJsonBody(req, 4 * 1024 * 1024).catch(() => ({}));
  const avatar = normaliseBrMediaProfileAvatar(body?.avatar || body?.avatarUrl || body?.url || "");

  if (avatar === "__too_large__") {
    return json(res, 413, { ok: false, error: "Avatar image is too large. Use an image under 2 MB." });
  }

  if (avatar === "__invalid__") {
    return json(res, 400, { ok: false, error: "Avatar must be a http/https URL, local BRMedia path, or uploaded image data." });
  }

  const user = context.store.users.find((item: any) => String(item.id) === String(context.user.id));
  if (!user) return json(res, 404, { ok: false, error: "Profile not found." });

  user.avatar = avatar;
  user.updatedAt = Date.now();

  writeBrMediaProfileStore(context.store);

  return json(res, 200, {
    ok: true,
    profile: makeBrMediaPublicProfile(user),
  });
}

async function sendBrMediaProfileMessage(req: http.IncomingMessage, res: http.ServerResponse) {
  const context = getCurrentBrMediaProfile(req);
  if (!context) return json(res, 401, { ok: false, error: "Not logged in." });

  const body = await readJsonBody(req).catch(() => ({}));

  const recipientText = String(firstString(body?.to || body?.recipient || body?.username || body?.email) || "").trim();
  const title = String(firstString(body?.title) || "BRMedia message").trim().slice(0, 120);
  const message = String(firstString(body?.message) || "").trim().slice(0, 2000);

  const recipient = findBrMediaProfileUser(context.store, recipientText);
  if (!recipient) return json(res, 404, { ok: false, error: "Profile recipient not found." });

  const inboxItem = {
    id: `msg_${Date.now()}_${crypto.randomBytes(5).toString("hex")}`,
    fromProfileId: context.user.id,
    fromName: context.user.displayName || context.user.username,
    title,
    message,
    payload: body?.payload || {},
    createdAt: Date.now(),
    readAt: 0,
    emailQueued: false,
  };

  recipient.inbox = [
    inboxItem,
    ...(Array.isArray(recipient.inbox) ? recipient.inbox : []),
  ].slice(0, 200);

  writeBrMediaProfileStore(context.store);

  return json(res, 200, {
    ok: true,
    queued: true,
    message: inboxItem,
  });
}

function readJsonBody(req: http.IncomingMessage, maxBytes = 15 * 1024 * 1024): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = "";
    let total = 0;
    let rejected = false;

    req.on("data", (chunk) => {
      if (rejected) return;

      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buffer.length;

      if (total > maxBytes) {
        rejected = true;
        reject(new Error("JSON body too large"));
        try { req.destroy(); } catch {}
        return;
      }

      data += buffer.toString("utf8");
    });

    req.on("end", () => {
      if (rejected) return;
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

function getTorrentEngineDefaultSettings() {
  return {
    enabled: false,
    type: "qbittorrent",
    baseUrl: "http://127.0.0.1:8080",
    username: "",
    password: "",
    savePath: "C:\\BRMedia\\Torrents\\Downloads",
    installed: false,
    mode: "qbittorrent-web-api",
    status: "not-connected",
    note: "Connect qBittorrent Web UI to enable real torrent downloads.",
    lastCheckedAt: 0,
  };
}

function getTorrentStateDefaultSettings() {
  return {
    bandwidth: {
      downloadLimitKb: 0,
      uploadLimitKb: 0,
      slowModeDownloadKb: 512,
      slowModeUploadKb: 64,
    },

    scheduler: {
      enabled: false,
      mode: "download-and-seed",
      outsideMode: "slow",

      windows: [
        {
          day: "Mon-Fri",
          start: "00:00",
          end: "07:00",
        },

        {
          day: "Sat-Sun",
          start: "00:00",
          end: "10:00",
        },
      ],
    },

    cache: {
      enabled: true,
      sizeMb: 512,
      writeCoalesce: true,
      reduceDiskWear: true,
    },

    protocols: {
      magnetLinks: true,
      upnp: true,
      natPmp: true,
      protocolEncryption: true,
      ipv6: true,
    },

    security: {
      scanTorrentFiles: true,
      scanDownloadedFiles: true,
      blockSuspiciousFiles: true,
      quarantineSuspiciousFiles: false,
      quarantineFolder:
        "C:\\BRMedia\\Quarantine",
      defenderDeepScan: true,
      defenderDisableRemediation: true,
    },

    ui: {
      browserNotifications: false,
      completionNotifications: true,
      blockedNotifications: true,
      lowSeedNotifications: true,
      engineDisconnectedNotifications: true,
      diskSpaceNotifications: true,
      scanCompleteNotifications: true,
      transferCompleteNotifications: true,
      inAppHistory: true,
      speedGraph: true,
      speedGraphSampleIntervalSec: 5,
      speedGraphHistoryLength: 120,
      speedGraphShowTotals: true,
      speedGraphShowCurrent: true,
      speedGraphShowAverage: true,
      speedGraphShowPeak: true,
    },
  };
}

function readTorrentStateStore(): any {
  try {
    ensurePlayerRuntimeStateDir();

    if (
      !fs.existsSync(
        TORRENT_STATE_PATH
      )
    ) {
      return {
        version: 1,

        engine:
          getTorrentEngineDefaultSettings(),

        settings:
          getTorrentStateDefaultSettings(),

        items: [],
        notifications: [],
        scanHistory: [],
        quarantineHistory: [],
        speedHistory: [],
        runtime: {},
        completedNotified: [],
        lowSeedNotified: [],

        updatedAt:
          Date.now(),
      };
    }

    const parsed =
      JSON.parse(
        fs.readFileSync(
          TORRENT_STATE_PATH,
          "utf8"
        )
      );

    if (
      !parsed ||
      typeof parsed !==
        "object"
    ) {
      throw new Error(
        "Invalid torrent state"
      );
    }

    return {
      version: 1,

      engine: {
        ...getTorrentEngineDefaultSettings(),
        ...(parsed.engine || {}),
      },

      settings: {
        ...getTorrentStateDefaultSettings(),
        ...(parsed.settings || {}),

        bandwidth: {
          ...getTorrentStateDefaultSettings()
            .bandwidth,

          ...(
            parsed
              .settings
              ?.bandwidth ||
            {}
          ),
        },

        scheduler: {
          ...getTorrentStateDefaultSettings()
            .scheduler,

          ...(
            parsed
              .settings
              ?.scheduler ||
            {}
          ),
        },

        cache: {
          ...getTorrentStateDefaultSettings()
            .cache,

          ...(
            parsed
              .settings
              ?.cache ||
            {}
          ),
        },

        protocols: {
          ...getTorrentStateDefaultSettings()
            .protocols,

          ...(
            parsed
              .settings
              ?.protocols ||
            {}
          ),
        },

        security: {
          ...getTorrentStateDefaultSettings()
            .security,

          ...(
            parsed
              .settings
              ?.security ||
            {}
          ),
        },

        ui: {
          ...getTorrentStateDefaultSettings()
            .ui,

          ...(
            parsed
              .settings
              ?.ui ||
            {}
          ),
        },
      },

      items:
        Array.isArray(
          parsed.items
        )
          ? parsed.items
          : [],

      notifications:
        Array.isArray(
          parsed.notifications
        )
          ? parsed.notifications
          : [],

      scanHistory:
        Array.isArray(
          parsed.scanHistory
        )
          ? parsed.scanHistory
          : [],

      quarantineHistory:
        Array.isArray(
          parsed.quarantineHistory
        )
          ? parsed.quarantineHistory
          : [],

      speedHistory:
        Array.isArray(
          parsed.speedHistory
        )
          ? parsed.speedHistory
          : [],

      runtime:
        parsed.runtime && typeof parsed.runtime === "object"
          ? parsed.runtime
          : {},

      completedNotified:
        Array.isArray(
          parsed.completedNotified
        )
          ? parsed.completedNotified
          : [],

      lowSeedNotified:
        Array.isArray(
          parsed.lowSeedNotified
        )
          ? parsed.lowSeedNotified
          : [],

      updatedAt:
        Number(
          parsed.updatedAt ||
          Date.now()
        ),
    };
  } catch {
    return {
      version: 1,

      engine:
        getTorrentEngineDefaultSettings(),

      settings:
        getTorrentStateDefaultSettings(),

      items: [],
      notifications: [],
      scanHistory: [],
      quarantineHistory: [],
      speedHistory: [],
      runtime: {},
      completedNotified: [],
      lowSeedNotified: [],

      updatedAt:
        Date.now(),
    };
  }
}

function getTorrentSpeedHistoryLimit(state: any) {
  const value = Number(state?.settings?.ui?.speedGraphHistoryLength || 120);
  return Math.max(20, Math.min(TORRENT_SPEED_HISTORY_LIMIT, Number.isFinite(value) ? Math.round(value) : 120));
}

function getTorrentSpeedSampleIntervalMs(state: any) {
  const value = Number(state?.settings?.ui?.speedGraphSampleIntervalSec || 5);
  return Math.max(5, Math.min(60, Number.isFinite(value) ? value : 5)) * 1000;
}

function writeTorrentStateStore(
  state: any
) {
  ensurePlayerRuntimeStateDir();

  fs.writeFileSync(
    TORRENT_STATE_PATH,

    JSON.stringify(
      {
        version: 1,

        engine:
          state.engine ||
          {},

        settings:
          state.settings ||
          getTorrentStateDefaultSettings(),

        items:
          Array.isArray(
            state.items
          )
            ? state.items
            : [],

        notifications:
          Array.isArray(
            state.notifications
          )
            ? state.notifications
                .slice(
                  0,
                  TORRENT_NOTIFICATION_LIMIT
                )
            : [],

        scanHistory:
          Array.isArray(
            state.scanHistory
          )
            ? state.scanHistory
                .slice(
                  0,
                  TORRENT_SCAN_HISTORY_LIMIT
                )
            : [],

        quarantineHistory:
          Array.isArray(
            state.quarantineHistory
          )
            ? state.quarantineHistory
                .slice(
                  0,
                  TORRENT_QUARANTINE_HISTORY_LIMIT
                )
            : [],

        speedHistory:
          Array.isArray(
            state.speedHistory
          )
            ? state.speedHistory.slice(-getTorrentSpeedHistoryLimit(state))
            : [],

        runtime:
          state.runtime && typeof state.runtime === "object"
            ? state.runtime
            : {},

        completedNotified:
          Array.isArray(
            state.completedNotified
          )
            ? state.completedNotified
                .slice(-500)
            : [],

        lowSeedNotified:
          Array.isArray(
            state.lowSeedNotified
          )
            ? state.lowSeedNotified
                .slice(-500)
            : [],

        updatedAt:
          Date.now(),
      },

      null,
      2
    ),

    "utf8"
  );
}

function pushTorrentNotification(
  state: any,
  payload: any = {}
) {
  const item = {
    id:
      `torrent_notice_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,

    type:
      firstString(
        payload?.type
      ) ||
      "info",

    title:
      firstString(
        payload?.title
      ) ||
      "Torrent update",

    message:
      firstString(
        payload?.message
      ) ||
      "",

    torrentId:
      firstString(
        payload?.torrentId
      ) ||
      "",

    actionUrl:
      firstString(
        payload?.actionUrl
      ) ||
      "",

    createdAt:
      Number(
        payload?.createdAt ||
        Date.now()
      ),
  };

  state.notifications = [
    item,

    ...(
      Array.isArray(
        state.notifications
      )
        ? state.notifications
        : []
    ),
  ].slice(
    0,
    TORRENT_NOTIFICATION_LIMIT
  );

  appendStatsEvent("torrent_notification", "torrents", {
    entityType: "torrent_notification",
    entityId: item.id,
    title: item.title,
    status: item.type,
    route: "torrents",
    extra: {
      torrentId: item.torrentId,
      actionUrl: item.actionUrl,
      message: item.message,
    },
  });

  return item;
}

function pushTorrentScanHistory(
  state: any,
  payload: any = {}
) {
  const item = {
    id:
      `torrent_scan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,

    torrentId:
      firstString(
        payload?.torrentId
      ) ||
      "",

    torrentName:
      firstString(
        payload?.torrentName
      ) ||
      "Torrent",

    status:
      firstString(
        payload?.status
      ) ||
      "clean",

    message:
      firstString(
        payload?.message
      ) ||
      "Scan complete.",

    checkedFiles:
      Number(
        payload?.checkedFiles ||
        0
      ),

    suspiciousFiles:
      Array.isArray(
        payload?.suspiciousFiles
      )
        ? payload.suspiciousFiles
        : [],

    quarantinedFiles:
      Array.isArray(
        payload?.quarantinedFiles
      )
        ? payload.quarantinedFiles
        : [],

    scanner:
      firstString(payload?.scanner) ||
      "brmedia-name-scan",

    targetPath:
      firstString(payload?.targetPath) ||
      "",

    resultCode:
      payload?.resultCode === undefined ||
      payload?.resultCode === null
        ? null
        : Number(payload.resultCode),

    startedAt:
      Number(payload?.startedAt || 0),

    completedAt:
      Number(
        payload?.completedAt ||
        payload?.createdAt ||
        Date.now()
      ),

    outputSummary:
      firstString(payload?.outputSummary) ||
      "",

    createdAt:
      Number(
        payload?.createdAt ||
        Date.now()
      ),
  };

  state.scanHistory = [
    item,

    ...(
      Array.isArray(
        state.scanHistory
      )
        ? state.scanHistory
        : []
    ),
  ].slice(
    0,
    TORRENT_SCAN_HISTORY_LIMIT
  );

  return item;
}

function pushTorrentQuarantineHistory(
  state: any,
  payload: any = {}
) {
  const item = {
    id:
      `torrent_quarantine_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    torrentId:
      firstString(
        payload?.torrentId
      ) ||
      "",
    torrentName:
      firstString(
        payload?.torrentName
      ) ||
      "Torrent",
    fileId:
      firstString(
        payload?.fileId
      ) ||
      "",
    fileName:
      firstString(
        payload?.fileName
      ) ||
      "File",
    reason:
      firstString(
        payload?.reason
      ) ||
      "Moved to BRMedia quarantine.",
    originalPath:
      firstString(
        payload?.originalPath
      ) ||
      "",
    quarantinedPath:
      firstString(
        payload?.quarantinedPath
      ) ||
      "",
    status:
      firstString(
        payload?.status
      ) ||
      "quarantined",
    createdAt:
      Number(
        payload?.createdAt ||
        Date.now()
      ),
    restoredAt:
      Number(
        payload?.restoredAt ||
        0
      ),
    deletedAt:
      Number(
        payload?.deletedAt ||
        0
      ),
  };

  state.quarantineHistory = [
    item,
    ...(
      Array.isArray(
        state.quarantineHistory
      )
        ? state.quarantineHistory
        : []
    ),
  ].slice(
    0,
    TORRENT_QUARANTINE_HISTORY_LIMIT
  );

  return item;
}

function appendTorrentSpeedHistory(state: any, summary: any = {}) {
  if (state?.settings?.ui?.speedGraph === false) return null;

  const history = Array.isArray(state.speedHistory) ? state.speedHistory : [];
  const now = Date.now();
  const last = history[history.length - 1];
  if (last && now - Number(last.at || 0) < getTorrentSpeedSampleIntervalMs(state)) return last;

  const item = {
    at: now,
    downloadSpeedKb: Number(summary?.downloadSpeedKb || 0),
    uploadSpeedKb: Number(summary?.uploadSpeedKb || 0),
  };
  state.speedHistory = [...history, item].slice(-getTorrentSpeedHistoryLimit(state));
  return item;
}

const TORRENT_SUSPICIOUS_EXTENSIONS =
  new Set([
    ".exe",
    ".scr",
    ".bat",
    ".cmd",
    ".ps1",
    ".vbs",
    ".js",
    ".jar",
    ".msi",
    ".com",
    ".pif",
  ]);

function isSuspiciousTorrentFileName(
  fileName: string
) {
  return TORRENT_SUSPICIOUS_EXTENSIONS
    .has(
      path
        .extname(
          String(
            fileName ||
            ""
          )
        )
        .toLowerCase()
    );
}

function getTorrentInputKind(input: string) {
  const text = String(input || "").trim().toLowerCase();
  if (text.startsWith("magnet:?")) return "magnet";
  if (text.endsWith(".torrent")) return "torrent-file";
  if (text.includes(".torrent")) return "torrent-url";
  return "unknown";
}

function getTorrentDisplayName(input: string, fallback = "") {
  const text = String(input || "").trim();

  try {
    if (text.startsWith("magnet:?")) {
      const params = new URLSearchParams(text.replace(/^magnet:\?/, ""));
      const dn = params.get("dn");
      if (dn) return decodeURIComponent(dn).replace(/\+/g, " ").trim();
    }
  } catch {}

  const clean = text.split(/[\\/]/).pop()?.split("?")[0] || "";
  return fallback || clean || "New torrent";
}

function getTorrentSafetyScanText(input: string) {
  const raw = String(input || "").trim();

  try {
    if (raw.toLowerCase().startsWith("magnet:?")) {
      const params = new URLSearchParams(raw.replace(/^magnet:\?/i, ""));
      const dn = params.get("dn");

      if (dn) {
        return decodeURIComponent(dn).replace(/\+/g, " ").trim();
      }

      return "magnet-link";
    }
  } catch {}

  try {
    if (/^https?:\/\//i.test(raw)) {
      const parsed = new URL(raw);
      const lastPathPart = parsed.pathname.split("/").filter(Boolean).pop() || "";
      return decodeURIComponent(lastPathPart || parsed.hostname || raw);
    }
  } catch {}

  try {
    return decodeURIComponent(
      raw
        .split(/[?#]/)[0]
        .split(/[\\/]/)
        .pop() || raw
    );
  } catch {
    return raw;
  }
}

function scanTorrentInputSafety(input: string) {
  const scanText = getTorrentSafetyScanText(input).toLowerCase();

  const blockedExtensions = [
    ".exe",
    ".scr",
    ".bat",
    ".cmd",
    ".ps1",
    ".vbs",
    ".js",
    ".jar",
    ".msi",
    ".com",
    ".pif",
  ];

  const hit = blockedExtensions.find((extension) => {
    const escaped = extension.replace(".", "\\.");
    return new RegExp(`${escaped}(?:$|[\\s"'\\)\\]\\};,?#&])`, "i").test(scanText);
  });

  if (hit) {
    return {
      status: "blocked",
      risk: "high",
      message: `Suspicious executable extension detected in torrent name/path: ${hit}`,
      scannedAt: Date.now(),
    };
  }

  return {
    status: "clean",
    risk: "low",
    message: "Initial input scan passed. Full downloaded-content scanning will run when the torrent engine is connected.",
    scannedAt: Date.now(),
  };
}

function getTorrentStatePayload() {
  const state = readTorrentStateStore();
  const items = Array.isArray(state.items) ? state.items : [];

  const active = items.filter((item: any) => ["queued", "downloading", "checking"].includes(String(item.status || ""))).length;
  const blocked = items.filter((item: any) => item?.malware?.status === "blocked" || item.status === "blocked").length;
  const completed = items.filter((item: any) => ["complete", "completed", "seeding"].includes(String(item.status || "")) || Number(item.progress || 0) >= 100).length;

  return {
    ok: true,
    ...state,
    summary: {
      total: items.length,
      active,
      blocked,
      completed,
      downloadSpeedKb: items.reduce((sum: number, item: any) => sum + Number(item.downloadSpeedKb || 0), 0),
      uploadSpeedKb: items.reduce((sum: number, item: any) => sum + Number(item.uploadSpeedKb || 0), 0),
      downloadedBytes: items.reduce((sum: number, item: any) => sum + Number(item.completedBytes || 0), 0),
      uploadedBytes: items.reduce((sum: number, item: any) => sum + Number(item.uploadedBytes || 0), 0),
    },
  };
}

function addTorrentQueueItem(raw: any) {
  const state = readTorrentStateStore();
  const input = firstString(raw?.input || raw?.magnet || raw?.url || raw?.torrent) || "";
  const label = firstString(raw?.label || raw?.name) || "";

  if (!input) {
    return { ok: false, error: "Missing magnet link or .torrent reference" };
  }

  const kind = getTorrentInputKind(input);
  if (kind === "unknown") {
    return { ok: false, error: "Only magnet links or .torrent references are accepted in this skeleton." };
  }

  const malware = scanTorrentInputSafety(input);
  const now = Date.now();
  const item = {
    id: `tor_${now}_${Math.random().toString(36).slice(2, 8)}`,
    name: getTorrentDisplayName(input, label),
    input,
    kind,
    status: malware.status === "blocked" ? "blocked" : "queued",
    progress: 0,
    sizeBytes: 0,
    downloadSpeedKb: 0,
    uploadSpeedKb: 0,
    seeds: 0,
    leeches: 0,
    priority: "normal",
    addedAt: now,
    updatedAt: now,
    malware,
    note: malware.status === "blocked"
      ? "Blocked by BRMedia safety scan before download."
      : "Queued in BRMedia. Real torrent engine wiring comes next.",
  };

  state.items = [
    item,
    ...(
      Array.isArray(
        state.items
      )
        ? state.items
        : []
    ),
  ].slice(
    0,
    250
  );

  pushTorrentNotification(
    state,
    {
      type:
        malware.status ===
        "blocked"
          ? "blocked"
          : "added",

      title:
        malware.status ===
        "blocked"
          ? "Torrent blocked"
          : "Torrent queued",

      message:
        item.name,

      torrentId:
        item.id,

      actionUrl:
        "/torrents?tab=queue",
    }
  );

  writeTorrentStateStore(
    state
  );

  return { ok: true, item, state: getTorrentStatePayload() };
}

function updateTorrentSettings(raw: any) {
  const state = readTorrentStateStore();
  const defaults = getTorrentStateDefaultSettings();

  if (raw?.engine && typeof raw.engine === "object") {
    const currentEngine = state.engine || getTorrentEngineDefaultSettings();
    const incomingPassword = typeof raw.engine.password === "string" ? raw.engine.password : "";
    const hasNewPassword = !!incomingPassword.trim() && !incomingPassword.includes("•");

    state.engine = {
      ...getTorrentEngineDefaultSettings(),
      ...currentEngine,
      ...raw.engine,
      enabled: !!raw.engine.enabled,
      baseUrl: firstString(raw.engine.baseUrl) || currentEngine.baseUrl || getTorrentEngineDefaultSettings().baseUrl,
      username: firstString(raw.engine.username) || currentEngine.username || "",
      password: hasNewPassword ? incomingPassword : (currentEngine.password || ""),
      savePath: firstString(raw.engine.savePath) || currentEngine.savePath || getTorrentEngineDefaultSettings().savePath,
    };
  }

  state.settings = {
    ...defaults,
    ...(state.settings || {}),
    bandwidth: {
      ...defaults.bandwidth,
      ...(state.settings?.bandwidth || {}),
      ...(raw?.bandwidth || {}),
    },
    scheduler: {
      ...defaults.scheduler,
      ...(state.settings?.scheduler || {}),
      ...(raw?.scheduler || {}),
    },
    cache: {
      ...defaults.cache,
      ...(state.settings?.cache || {}),
      ...(raw?.cache || {}),
    },
    protocols: {
      ...defaults.protocols,
      ...(state.settings?.protocols || {}),
      ...(raw?.protocols || {}),
    },
    security: {
      ...defaults.security,
      ...(state.settings?.security || {}),
      ...(raw?.security || {}),
    },

    ui: {
      ...defaults.ui,
      ...(state.settings?.ui || {}),
      ...(raw?.ui || {}),
    },
  };

  writeTorrentStateStore(state);
  return { ok: true, state: getTorrentStatePayload() };
}

async function updateTorrentQueueItem(id: string, action: string, raw: any) {
  const state = readTorrentStateStore();
  const items = Array.isArray(state.items) ? state.items : [];
  const index = items.findIndex((item: any) => String(item.id) === String(id));

  if (index < 0) {
    return { ok: false, error: "Torrent queue item not found" };
  }

  const item = { ...items[index], updatedAt: Date.now() };

  if (action === "pause") item.status = "paused";
  else if (action === "resume") item.status = item.malware?.status === "blocked" ? "blocked" : "queued";
  else if (action === "allow" || action === "unblock") {
    item.status = "queued";
    item.malware = {
      status: "allowed",
      risk: "manual-override",
      message: "Manually unblocked by you. Only use this for files you trust and have rights to download.",
      scannedAt: Date.now(),
    };
    item.note = "Manually unblocked in BRMedia Torrents.";
  } else if (action === "remove" || action === "remove-keep" || action === "remove-delete") {
    items.splice(index, 1);
    state.items = items;
    writeTorrentStateStore(state);
    return { ok: true, removed: id, state: await getTorrentStatePayloadLive() };
  } else if (action === "priority") {
    item.priority = ["low", "normal", "high", "top"].includes(String(raw?.priority)) ? String(raw.priority) : "normal";
  } else if (action === "scan") {
    item.malware = scanTorrentInputSafety(item.input || item.name || "");

    if (item.malware.status === "blocked") {
      item.status = "blocked";
    } else if (item.status === "blocked") {
      item.status = "queued";
    }
  } else {
    return { ok: false, error: "Unsupported torrent action" };
  }

  items[index] = item;
  state.items = items;
  writeTorrentStateStore(state);

  return { ok: true, item, state: getTorrentStatePayload() };
}

function getTorrentEngineForRuntime(state = readTorrentStateStore()) {
  const engine = {
    ...getTorrentEngineDefaultSettings(),
    ...(state.engine || {}),
  };

  const baseUrl = String(engine.baseUrl || "").trim().replace(/\/+$/, "");
  return {
    ...engine,
    baseUrl,
    enabled: !!engine.enabled,
    username: String(engine.username || ""),
    password: String(engine.password || ""),
    savePath: String(engine.savePath || ""),
  };
}

function isTorrentEngineEnabled(state = readTorrentStateStore()) {
  const engine = getTorrentEngineForRuntime(state);
  return !!(engine.enabled && engine.baseUrl);
}

async function qbitLogin(engine: any) {
  const baseUrl = String(engine.baseUrl || "").replace(/\/+$/, "");
  const body = new URLSearchParams();
  body.set("username", String(engine.username || ""));
  body.set("password", String(engine.password || ""));

  const response = await fetch(`${baseUrl}/api/v2/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Referer": `${baseUrl}/`,
      "Origin": baseUrl,
      "User-Agent": "BRMedia-Centre",
    },
    body,
  });

  const text = await response.text().catch(() => "");
  const cookie = response.headers.get("set-cookie") || "";

  if (response.ok && (!text || text.toLowerCase().includes("ok"))) {
    return cookie.split(";")[0] || "";
  }

  try {
    const probe = await fetch(`${baseUrl}/api/v2/app/version`, {
      method: "GET",
      headers: {
        "Referer": `${baseUrl}/`,
        "Origin": baseUrl,
        "User-Agent": "BRMedia-Centre",
      },
    });

    if (probe.ok) {
      return "";
    }
  } catch {}

  if (response.status === 403) {
    throw new Error(`qBittorrent login failed (403). BRMedia reached ${baseUrl}, but qBittorrent refused the saved username/password. Re-enter the Web UI password in Server Settings > Torrents Engine, then press Save + apply.`);
  }

  throw new Error(`qBittorrent login failed (${response.status})${text ? `: ${text.slice(0, 120)}` : ""}. Check Web UI username/password.`);
}

async function qbitFetch(engine: any, apiPath: string, options: any = {}) {
  const cookie = await qbitLogin(engine);
  const headers = {
    ...(options.headers || {}),
    ...(cookie ? { Cookie: cookie } : {}),
  };

  const response = await fetch(`${engine.baseUrl}${apiPath}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`qBittorrent request failed (${response.status})${text ? `: ${text.slice(0, 180)}` : ""}`);
  }

  return response;
}

async function qbitSetTorrentPaused(engine: any, hashes: string, paused: boolean) {
  const form = new URLSearchParams();
  form.set("hashes", hashes);
  const currentPath = paused ? "/api/v2/torrents/stop" : "/api/v2/torrents/start";
  const legacyPath = paused ? "/api/v2/torrents/pause" : "/api/v2/torrents/resume";
  try {
    await qbitFetch(engine, currentPath, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form });
  } catch {
    await qbitFetch(engine, legacyPath, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form });
  }
}

async function qbitSetAlternativeSpeedLimitsEnabled(engine: any, enabled: boolean) {
  const response = await qbitFetch(engine, "/api/v2/transfer/speedLimitsMode", { method: "GET" });
  const current = Number((await response.text().catch(() => "0")).trim()) === 1;
  if (current !== enabled) await qbitFetch(engine, "/api/v2/transfer/toggleSpeedLimitsMode", { method: "POST" });
  return enabled;
}

function isQbitCompletedState(state: string, progress = 0) {
  const text = String(state || "").toLowerCase();
  const percent = Number(progress || 0);

  return percent >= 0.9999 ||
    text.includes("upload") ||
    text.includes("forcedup") ||
    text.includes("stalledup") ||
    text.includes("queuedup") ||
    text.includes("pausedup") ||
    text.includes("checkingup");
}

function isQbitSeedState(state: string) {
  const text = String(state || "").toLowerCase();

  return text.includes("upload") ||
    text.includes("forcedup") ||
    text.includes("stalledup") ||
    text.includes("queuedup") ||
    text.includes("pausedup") ||
    text.includes("checkingup");
}

function qbitStateToStatus(state: string, progress = 0) {
  const text = String(state || "").toLowerCase();

  if (text.includes("error") || text.includes("missing")) return "error";
  if (isQbitCompletedState(text, progress)) return "complete";
  if (text.includes("pause")) return "paused";
  if (text.includes("forceddl") || text.includes("downloading") || text.includes("stalleddl") || text.includes("metadl")) return "downloading";
  if (text.includes("check")) return "checking";
  if (text.includes("queued")) return "queued";
  return text || "queued";
}

function mapQbitTorrentItem(item: any) {
  const hash = String(item?.hash || "");
  return {
    id: hash || `qbit_${Math.random().toString(36).slice(2, 10)}`,
    hash,
    name: firstString(item?.name) || "Torrent",
    input: hash,
    kind: "qbittorrent",
    status: qbitStateToStatus(item?.state, item?.progress),
    engineState: String(item?.state || ""),
    isSeeding: isQbitSeedState(item?.state),
    progress: Math.round(Number(item?.progress || 0) * 10000) / 100,
    sizeBytes: Number(item?.size || 0),
    completedBytes: Number(item?.completed || 0),
    uploadedBytes: Number(item?.uploaded || 0),
    downloadSpeedKb: Math.round(Number(item?.dlspeed || 0) / 1024),
    uploadSpeedKb: Math.round(Number(item?.upspeed || 0) / 1024),
    seeds: Number(item?.num_seeds || item?.seeds || 0),
    leeches: Number(item?.num_leechs || item?.leeches || 0),
    eta: Number(item?.eta || 0),
    ratio: Number(item?.ratio || 0),
    tracker: firstString(item?.tracker) || "",
    savePath: firstString(item?.save_path || item?.savePath) || "",
    contentPath: firstString(item?.content_path || item?.contentPath) || "",
    priority: Number(item?.priority || 0) > 1 ? "high" : "normal",
    addedAt: Number(item?.added_on || 0) ? Number(item.added_on) * 1000 : Date.now(),
    updatedAt: Date.now(),
    malware: {
      status: "clean",
      risk: "engine",
      message: "qBittorrent item. BRMedia safety checks apply before adding and scanning controls remain available.",
      scannedAt: Date.now(),
    },
    note: "Live from qBittorrent Web API.",
  };
}

async function getQbitTorrentItems(state = readTorrentStateStore()) {
  const engine = getTorrentEngineForRuntime(state);
  if (!engine.enabled) return null;

  const response = await qbitFetch(engine, "/api/v2/torrents/info", { method: "GET" });
  const items = await response.json().catch(() => []);
  return Array.isArray(items) ? items.map(mapQbitTorrentItem) : [];
}

const TORRENT_HANDOFF_AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".flac", ".m4a", ".aac", ".ogg", ".opus"]);
const TORRENT_HANDOFF_VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v", ".wmv", ".vob", ".mpg", ".mpeg"]);
const TORRENT_LIBRARY_HANDOFF_JOBS = new Map<string, any>();
const TORRENT_DEFENDER_SCAN_JOBS = new Map<string, any>();

async function getQbitTorrentTrackers(
  hash: string
) {
  const state =
    readTorrentStateStore();

  const engine =
    getTorrentEngineForRuntime(
      state
    );

  if (!engine.enabled) {
    return {
      ok: false,
      error:
        "qBittorrent engine is not connected.",
    };
  }

  const params =
    new URLSearchParams();

  params.set(
    "hash",
    hash
  );

  const response =
    await qbitFetch(
      engine,
      `/api/v2/torrents/trackers?${params.toString()}`,
      {
        method: "GET",
      }
    );

  const raw =
    await response
      .json()
      .catch(() => []);

  return {
    ok: true,
    hash,

    trackers:
      Array.isArray(raw)
        ? raw.map(
            (item: any) => ({
              url:
                firstString(
                  item?.url
                ) ||
                "Tracker",

              status:
                Number(
                  item?.status ||
                  0
                ),

              tier:
                Number(
                  item?.tier ||
                  0
                ),

              peers:
                Number(
                  item?.num_peers ||
                  0
                ),

              seeds:
                Number(
                  item?.num_seeds ||
                  0
                ),

              leeches:
                Number(
                  item?.num_leeches ||
                  0
                ),

              downloads:
                Number(
                  item
                    ?.num_downloaded ||
                  0
                ),

              message:
                firstString(
                  item?.msg
                ) ||
                "",
            })
          )
        : [],
  };
}

async function getQbitTorrentPeers(
  hash: string
) {
  const state =
    readTorrentStateStore();

  const engine =
    getTorrentEngineForRuntime(
      state
    );

  if (!engine.enabled) {
    return {
      ok: false,
      error:
        "qBittorrent engine is not connected.",
    };
  }

  const params =
    new URLSearchParams();

  params.set(
    "hash",
    hash
  );

  const response =
    await qbitFetch(
      engine,
      `/api/v2/sync/torrentPeers?${params.toString()}`,
      {
        method: "GET",
      }
    );

  const raw =
    await response
      .json()
      .catch(() => ({}));

  const peersObject =
    raw?.peers &&
    typeof raw.peers ===
      "object"
      ? raw.peers
      : {};

  return {
    ok: true,
    hash,

    fullUpdate:
      raw?.full_update !==
      false,

    peers:
      Object
        .entries(
          peersObject
        )
        .map(
          (
            [
              id,
              peer,
            ]: [
              string,
              any,
            ]
          ) => ({
            id,

            ip:
              firstString(
                peer?.ip
              ) ||
              id,

            client:
              firstString(
                peer?.client
              ) ||
              "Unknown client",

            country:
              firstString(
                peer
                  ?.country_code ||
                peer?.country
              ) ||
              "",

            progress:
              Math.round(
                Number(
                  peer?.progress ||
                  0
                ) *
                10000
              ) /
              100,

            downloadSpeedKb:
              Math.round(
                Number(
                  peer?.dl_speed ||
                  0
                ) /
                1024
              ),

            uploadSpeedKb:
              Math.round(
                Number(
                  peer?.up_speed ||
                  0
                ) /
                1024
              ),

            downloadedBytes:
              Number(
                peer
                  ?.downloaded ||
                0
              ),

            uploadedBytes:
              Number(
                peer
                  ?.uploaded ||
                0
              ),

            flags:
              firstString(
                peer?.flags
              ) ||
              "",
          })
        ),
  };
}

async function openTorrentDownloadFolder(
  hash: string
) {
  const state =
    readTorrentStateStore();

  const items =
    await getQbitTorrentItems(
      state
    ) ||
    [];

  const item =
    items.find(
      (entry: any) =>
        String(
          entry.hash ||
          entry.id
        ) ===
        String(hash)
    );

  if (!item) {
    return {
      ok: false,
      error:
        "Torrent not found in qBittorrent.",
    };
  }

  const folder =
    firstString(
      item.savePath ||
      item.contentPath
    ) ||
    "";

  if (
    !folder ||
    !fs.existsSync(folder)
  ) {
    return {
      ok: false,
      error:
        "Torrent download folder is unavailable.",
    };
  }

  if (
    process.platform !==
    "win32"
  ) {
    return {
      ok: true,
      folder,
      opened: false,
      note:
        "Folder path returned. Automatic Explorer launch is Windows-only.",
    };
  }

  try {
    const child =
      spawn(
        "explorer.exe",
        [folder],
        {
          detached: true,
          stdio: "ignore",
        }
      );

    child.unref();
  } catch (err: any) {
    return {
      ok: false,
      error:
        String(
          err?.message ||
          err
        ),
      folder,
    };
  }

  return {
    ok: true,
    folder,
    opened: true,
  };
}

async function scanQbitTorrentDownloadedFiles(
  hash: string
) {
  const state =
    readTorrentStateStore();

  const payload =
    await getQbitTorrentFiles(
      hash
    );

  if (!payload.ok) {
    return payload;
  }

  const suspiciousFiles =
    (
      payload.files ||
      []
    )
      .filter(
        (file: any) =>
          isSuspiciousTorrentFileName(
            file.name
          )
      )
      .map(
        (file: any) => ({
          id:
            file.id,

          index:
            file.index,

          name:
            file.name,

          sizeBytes:
            file.sizeBytes,

          progress:
            file.progress,

          reason:
            `Suspicious executable extension: ${path.extname(
              file.name
            ).toLowerCase()}`,
        })
      );

  const status =
    suspiciousFiles.length
      ? "blocked"
      : "clean";

  const scan =
    pushTorrentScanHistory(
      state,
      {
        torrentId:
          hash,

        torrentName:
          payload
            .torrent
            ?.name ||
          hash,

        status,

        checkedFiles:
          payload
            .files
            ?.length ||
          0,

        suspiciousFiles,

        message:
          suspiciousFiles.length
            ? `${suspiciousFiles.length} suspicious file${suspiciousFiles.length === 1 ? "" : "s"} detected. Review before handoff.`
            : "Downloaded-file name scan passed. Keep Windows Security enabled for full antivirus scanning.",
      }
    );

  pushTorrentNotification(
    state,
    {
      type:
        suspiciousFiles.length
          ? "blocked"
          : "scan",

      title:
        suspiciousFiles.length
          ? "Suspicious torrent files detected"
          : "Torrent scan passed",

      message:
        scan.message,

      torrentId:
        hash,

      actionUrl:
        "/torrents?tab=scan-history",
    }
  );

  writeTorrentStateStore(
    state
  );

  appendStatsEvent(
    suspiciousFiles.length
      ? "torrent_scan_warning"
      : "torrent_scan_done",
    "torrents",
    {
      entityType: "torrent_scan",
      entityId: scan.id,
      title: scan.torrentName,
      status: scan.status,
      route: "torrents",
      value: scan.checkedFiles,
      extra: {
        torrentId: hash,
        scanner: scan.scanner,
        checkedFiles: scan.checkedFiles,
        suspiciousFiles: suspiciousFiles.length,
      },
    }
  );

  return {
    ok: true,
    scan,
    state:
      getTorrentStatePayload(),
  };
}

function getTorrentDefenderExecutable() {
  if (process.platform !== "win32") return "";

  const candidates: string[] = [];
  const platformFolder = path.join(
    process.env.ProgramData || "C:\\ProgramData",
    "Microsoft",
    "Windows Defender",
    "Platform"
  );

  try {
    fs.readdirSync(platformFolder, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
      .forEach((folder) => candidates.push(path.join(platformFolder, folder, "MpCmdRun.exe")));
  } catch {}

  candidates.push(
    path.join(process.env.ProgramFiles || "C:\\Program Files", "Windows Defender", "MpCmdRun.exe"),
    "C:\\Program Files\\Windows Defender\\MpCmdRun.exe"
  );

  return candidates.find((candidate) => fs.existsSync(candidate)) || "";
}

function normaliseTorrentDefenderJob(job: any) {
  if (!job) return null;
  const copy = { ...job };
  delete copy.process;
  return copy;
}

function listTorrentDefenderJobs() {
  return Array.from(TORRENT_DEFENDER_SCAN_JOBS.values())
    .sort((a: any, b: any) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0))
    .slice(0, 30)
    .map(normaliseTorrentDefenderJob);
}

function getTorrentDefenderStatusPayload(state = readTorrentStateStore()) {
  const executable = getTorrentDefenderExecutable();
  const jobs = listTorrentDefenderJobs();
  const lastScan = (Array.isArray(state.scanHistory) ? state.scanHistory : [])
    .find((item: any) => item?.scanner === "microsoft-defender") || null;
  const available = process.platform === "win32" && !!executable;

  return {
    ok: true,
    available,
    platform: process.platform,
    executable,
    lastScan,
    latestJob: jobs[0] || null,
    note: available
      ? "Microsoft Defender custom scans are available."
      : process.platform !== "win32"
        ? "Microsoft Defender scans are only available on the Windows BRMedia server."
        : "Microsoft Defender MpCmdRun.exe could not be found on this PC.",
  };
}

function resolveTorrentDefenderTarget(rawPath: any, state = readTorrentStateStore()) {
  const requested = firstString(rawPath) || firstString(state.engine?.savePath) || getTorrentEngineDefaultSettings().savePath;
  const targetPath = path.resolve(requested);
  const allowedRoots = [
    path.resolve(firstString(state.engine?.savePath) || getTorrentEngineDefaultSettings().savePath),
    getTorrentQuarantineFolder(state),
  ];

  const allowed = allowedRoots.some((root) => targetPath === root || isPathInsideFolder(targetPath, root));
  if (!allowed) return { ok: false, error: "Refusing to scan a path outside the configured torrent downloads or BRMedia quarantine folders." };
  if (!fs.existsSync(targetPath)) return { ok: false, error: "The selected scan path does not exist on the BRMedia server PC." };
  return { ok: true, targetPath };
}

function trimTorrentDefenderOutput(value: any, limit = 12000) {
  const text = String(value || "").trim();
  return text.length <= limit ? text : `${text.slice(0, limit)}\n…output trimmed by BRMedia…`;
}

function finishTorrentDefenderScanJob(job: any, payload: any = {}) {
  if (!job || job.finished) return;

  job.finished = true;
  job.status = payload.status || "warning";
  job.resultCode = payload.resultCode === undefined || payload.resultCode === null ? null : Number(payload.resultCode);
  job.outputSummary = trimTorrentDefenderOutput(payload.outputSummary);
  job.error = firstString(payload.error) || "";
  job.completedAt = Date.now();
  job.updatedAt = Date.now();

  const state = readTorrentStateStore();
  const clean = job.status === "clean";
  const message = clean
    ? `Microsoft Defender scan passed for ${job.targetPath}.`
    : job.error
      ? `Microsoft Defender scan could not complete: ${job.error}`
      : `Microsoft Defender returned code ${job.resultCode}. Review the Defender command output saved in BRMedia.`;

  const scan = pushTorrentScanHistory(state, {
    scanner: "microsoft-defender",
    targetPath: job.targetPath,
    status: clean ? "clean" : "warning",
    resultCode: job.resultCode,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    outputSummary: job.outputSummary || job.error,
    message,
  });

  job.scanHistoryId = scan.id;
  job.message = message;

  if (state.settings?.ui?.scanCompleteNotifications !== false) {
    pushTorrentNotification(state, {
      type: clean ? "scan" : "warning",
      title: clean ? "Microsoft Defender scan passed" : "Microsoft Defender scan needs review",
      message,
      actionUrl: "/settings?module=torrents&tab=scan-history",
    });
  }

  writeTorrentStateStore(state);

  appendStatsEvent(
    clean
      ? "defender_scan_done"
      : "defender_scan_warning",
    "torrents",
    {
      entityType: "defender_scan",
      entityId: job.id,
      title: job.targetPath,
      status: clean ? "clean" : "warning",
      route: "settings",
      value: job.resultCode ?? 0,
      extra: {
        targetPath: job.targetPath,
        resultCode: job.resultCode ?? -1,
        scanHistoryId: scan.id,
        error: job.error,
      },
    }
  );
}

function startTorrentDefenderScan(raw: any = {}) {
  const state = readTorrentStateStore();
  if (state.settings?.security?.defenderDeepScan === false) {
    return { ok: false, error: "Microsoft Defender deep scans are disabled in Universal Settings." };
  }

  const defender = getTorrentDefenderStatusPayload(state);
  if (!defender.available || !defender.executable) {
    return { ok: false, unavailable: true, error: defender.note, defender };
  }

  const resolved = resolveTorrentDefenderTarget(raw?.targetPath, state);
  if (!resolved.ok) return resolved;

  const now = Date.now();
  const job: any = {
    id: `torrent_defender_${now}_${Math.random().toString(36).slice(2, 8)}`,
    scanner: "microsoft-defender",
    status: "running",
    targetPath: resolved.targetPath,
    executable: defender.executable,
    disableRemediation: state.settings?.security?.defenderDisableRemediation !== false,
    resultCode: null,
    outputSummary: "",
    error: "",
    createdAt: now,
    startedAt: now,
    completedAt: 0,
    updatedAt: now,
  };

  TORRENT_DEFENDER_SCAN_JOBS.set(job.id, job);

  appendStatsEvent("defender_scan_started", "torrents", {
    entityType: "defender_scan",
    entityId: job.id,
    title: job.targetPath,
    status: "running",
    route: "settings",
    extra: {
      targetPath: job.targetPath,
      disableRemediation: job.disableRemediation,
    },
  });

  const args = ["-Scan", "-ScanType", "3", "-File", job.targetPath];
  if (job.disableRemediation) args.push("-DisableRemediation");

  let output = "";
  try {
    const child = spawn(job.executable, args, { windowsHide: true });
    job.process = child;
    child.stdout?.on("data", (chunk) => { output = trimTorrentDefenderOutput(`${output}${chunk}`); });
    child.stderr?.on("data", (chunk) => { output = trimTorrentDefenderOutput(`${output}\n${chunk}`); });
    child.on("error", (err: any) => finishTorrentDefenderScanJob(job, { status: "warning", error: String(err?.message || err), outputSummary: output }));
    child.on("close", (code) => {
      const resultCode = Number.isFinite(Number(code)) ? Number(code) : -1;
      finishTorrentDefenderScanJob(job, { status: resultCode === 0 ? "clean" : "warning", resultCode, outputSummary: output });
    });
  } catch (err: any) {
    finishTorrentDefenderScanJob(job, { status: "warning", error: String(err?.message || err), outputSummary: output });
  }

  return { ok: true, job: normaliseTorrentDefenderJob(job) };
}

function getTorrentQuarantineFolder(
  state = readTorrentStateStore()
) {
  return path.resolve(
    firstString(
      state
        .settings
        ?.security
        ?.quarantineFolder
    ) ||
    "C:\\BRMedia\\Quarantine"
  );
}

function isPathInsideFolder(
  candidatePath: string,
  parentFolder: string
) {
  const relative =
    path.relative(
      path.resolve(parentFolder),
      path.resolve(candidatePath)
    );

  return !!relative &&
    !relative.startsWith("..") &&
    !path.isAbsolute(relative);
}

function findTorrentQuarantineHistoryItem(
  state: any,
  id: string
) {
  return (
    Array.isArray(
      state.quarantineHistory
    )
      ? state.quarantineHistory
      : []
  )
    .find(
      (entry: any) =>
        String(entry.id) ===
        String(id)
    );
}

function openTorrentQuarantineFolder() {
  const folder =
    getTorrentQuarantineFolder();

  fs.mkdirSync(
    folder,
    {
      recursive: true,
    }
  );

  if (
    process.platform !==
    "win32"
  ) {
    return {
      ok: true,
      folder,
      opened: false,
      note:
        "Quarantine folder path returned. Automatic Explorer launch is Windows-only.",
    };
  }

  try {
    const child =
      spawn(
        "explorer.exe",
        [folder],
        {
          detached: true,
          stdio: "ignore",
        }
      );

    child.unref();
  } catch (err: any) {
    return {
      ok: false,
      error:
        String(
          err?.message ||
          err
        ),
      folder,
    };
  }

  return {
    ok: true,
    folder,
    opened: true,
  };
}

function restoreTorrentQuarantineItem(
  id: string
) {
  const state =
    readTorrentStateStore();

  const item =
    findTorrentQuarantineHistoryItem(
      state,
      id
    );

  if (!item) {
    return {
      ok: false,
      error:
        "Quarantine history item not found.",
    };
  }

  const rawSourcePath =
    firstString(
      item.quarantinedPath
    ) ||
    "";

  const rawDestination =
    firstString(
      item.originalPath
    ) ||
    "";

  if (
    !rawSourcePath ||
    !rawDestination
  ) {
    return {
      ok: false,
      error:
        "This quarantine history item does not contain a safe restore path.",
    };
  }

  const quarantineFolder =
    getTorrentQuarantineFolder(
      state
    );

  const sourcePath =
    path.resolve(rawSourcePath);

  const destination =
    path.resolve(rawDestination);

  if (
    !isPathInsideFolder(
      sourcePath,
      quarantineFolder
    )
  ) {
    return {
      ok: false,
      error:
        "Refusing to restore a path outside the BRMedia quarantine folder.",
    };
  }

  if (
    !fs.existsSync(sourcePath)
  ) {
    return {
      ok: false,
      error:
        "Quarantined file no longer exists on disk.",
    };
  }

  if (
    fs.existsSync(destination)
  ) {
    return {
      ok: false,
      error:
        "The original path already contains a file. Move or rename it before restoring this quarantine item.",
    };
  }

  fs.mkdirSync(
    path.dirname(destination),
    {
      recursive: true,
    }
  );

  fs.renameSync(
    sourcePath,
    destination
  );

  item.status =
    "restored";
  item.restoredAt =
    Date.now();

  pushTorrentNotification(
    state,
    {
      type: "scan",
      title:
        "Quarantine item restored",
      message:
        `${item.fileName || "File"} was restored to its original path.`,
      torrentId:
        item.torrentId,
      actionUrl:
        "/torrents?tab=scan-history",
    }
  );

  writeTorrentStateStore(
    state
  );

  appendStatsEvent("quarantine_restore", "torrents", {
    entityType: "quarantine_item",
    entityId: item.id,
    title: item.fileName,
    status: "restored",
    route: "settings",
    extra: {
      torrentId: item.torrentId,
      torrentName: item.torrentName,
      originalPath: item.originalPath,
    },
  });

  return {
    ok: true,
    item,
  };
}

function deleteTorrentQuarantineItem(
  id: string
) {
  const state =
    readTorrentStateStore();

  const item =
    findTorrentQuarantineHistoryItem(
      state,
      id
    );

  if (!item) {
    return {
      ok: false,
      error:
        "Quarantine history item not found.",
    };
  }

  const rawSourcePath =
    firstString(
      item.quarantinedPath
    ) ||
    "";

  if (!rawSourcePath) {
    return {
      ok: false,
      error:
        "This quarantine history item does not contain a safe delete path.",
    };
  }

  const quarantineFolder =
    getTorrentQuarantineFolder(
      state
    );

  const sourcePath =
    path.resolve(rawSourcePath);

  if (
    !isPathInsideFolder(
      sourcePath,
      quarantineFolder
    )
  ) {
    return {
      ok: false,
      error:
        "Refusing to delete a path outside the BRMedia quarantine folder.",
    };
  }

  if (
    fs.existsSync(sourcePath)
  ) {
    fs.rmSync(
      sourcePath,
      {
        force: true,
        recursive:
          fs.statSync(sourcePath)
            .isDirectory(),
      }
    );
  }

  item.status =
    "deleted";
  item.deletedAt =
    Date.now();

  pushTorrentNotification(
    state,
    {
      type: "warning",
      title:
        "Quarantine item permanently deleted",
      message:
        `${item.fileName || "File"} was permanently deleted from BRMedia quarantine.`,
      torrentId:
        item.torrentId,
      actionUrl:
        "/torrents?tab=scan-history",
    }
  );

  writeTorrentStateStore(
    state
  );

  appendStatsEvent("quarantine_delete", "torrents", {
    entityType: "quarantine_item",
    entityId: item.id,
    title: item.fileName,
    status: "deleted",
    route: "settings",
    extra: {
      torrentId: item.torrentId,
      torrentName: item.torrentName,
      quarantinedPath: item.quarantinedPath,
    },
  });

  return {
    ok: true,
    item,
  };
}

async function quarantineQbitTorrentFiles(
  hash: string,
  raw: any = {}
) {
  const state =
    readTorrentStateStore();

  const payload =
    await getQbitTorrentFiles(
      hash
    );

  if (!payload.ok) {
    return payload;
  }

  const requestedIds =
    new Set(
      (
        Array.isArray(
          raw?.fileIds
        )
          ? raw.fileIds
          : String(
              raw?.fileIds ||
              ""
            )
              .split(",")
      )
        .map((value: any) =>
          String(value)
            .trim()
        )
        .filter(Boolean)
    );

  const files =
    (
      payload.files ||
      []
    )
      .filter(
        (file: any) =>
          requestedIds.size
            ? requestedIds.has(
                String(
                  file.id
                )
              ) ||
              requestedIds.has(
                String(
                  file.index
                )
              )
            : isSuspiciousTorrentFileName(
                file.name
              )
      );

  if (!files.length) {
    return {
      ok: false,
      error:
        "Choose files to quarantine, or run a scan first.",
    };
  }

  const quarantineFolder =
    getTorrentQuarantineFolder(
      state
    );

  fs.mkdirSync(
    quarantineFolder,
    {
      recursive: true,
    }
  );

  const moved: any[] = [];
  const failed: any[] = [];

  for (
    const file of files
  ) {
    try {
      const sourcePath =
        resolveTorrentFilePath(
          payload.torrent,
          file
        );

      const safeName =
        path.basename(
          file.name ||
          `torrent-file-${file.index}`
        );

      const destination =
        path.join(
          quarantineFolder,
          `${Date.now()}_${safeName}`
        );

      fs.renameSync(
        sourcePath,
        destination
      );

      const quarantineItem =
        pushTorrentQuarantineHistory(
          state,
          {
            torrentId:
              hash,
            torrentName:
              payload
                .torrent
                ?.name ||
              hash,
            fileId:
              file.id,
            fileName:
              file.name,
            reason:
              isSuspiciousTorrentFileName(
                file.name
              )
                ? `Suspicious executable extension: ${path.extname(file.name).toLowerCase()}`
                : "Manually moved to BRMedia quarantine.",
            originalPath:
              sourcePath,
            quarantinedPath:
              destination,
          }
        );

      moved.push({
        id:
          file.id,

        quarantineId:
          quarantineItem.id,

        name:
          file.name,

        from:
          sourcePath,

        to:
          destination,
      });
    } catch (err: any) {
      failed.push({
        id:
          file.id,

        name:
          file.name,

        error:
          String(
            err?.message ||
            err
          ),
      });
    }
  }

  const scan =
    pushTorrentScanHistory(
      state,
      {
        torrentId:
          hash,

        torrentName:
          payload
            .torrent
            ?.name ||
          hash,

        status:
          failed.length
            ? "warning"
            : "quarantined",

        checkedFiles:
          files.length,

        quarantinedFiles:
          moved,

        suspiciousFiles:
          failed,

        message:
          `${moved.length} file${moved.length === 1 ? "" : "s"} moved to quarantine${failed.length ? ` · ${failed.length} failed` : ""}.`,
      }
    );

  pushTorrentNotification(
    state,
    {
      type:
        failed.length
          ? "warning"
          : "quarantine",

      title:
        "Torrent quarantine updated",

      message:
        scan.message,

      torrentId:
        hash,

      actionUrl:
        "/torrents?tab=scan-history",
    }
  );

  writeTorrentStateStore(
    state
  );

  if (moved.length) {
    appendStatsEvent("quarantine_add", "torrents", {
      entityType: "torrent",
      entityId: hash,
      title: payload.torrent?.name || hash,
      status: failed.length ? "warning" : "quarantined",
      route: "torrents",
      count: moved.length,
      extra: {
        movedFiles: moved.length,
        failedFiles: failed.length,
        scanHistoryId: scan.id,
      },
    });
  }

  if (failed.length) {
    appendStatsEvent("quarantine_error", "torrents", {
      entityType: "torrent",
      entityId: hash,
      title: payload.torrent?.name || hash,
      status: "warning",
      route: "torrents",
      count: failed.length,
      extra: {
        movedFiles: moved.length,
        failedFiles: failed.length,
        scanHistoryId: scan.id,
      },
    });
  }

  return {
    ok:
      failed.length === 0,

    scan,
    moved,
    failed,

    state:
      getTorrentStatePayload(),
  };
}

function getTorrentSecurityHistoryPayload() {
  const state =
    readTorrentStateStore();

  return {
    ok: true,

    notifications:
      Array.isArray(
        state.notifications
      )
        ? state.notifications
        : [],

    scanHistory:
      Array.isArray(
        state.scanHistory
      )
        ? state.scanHistory
        : [],

    quarantineHistory:
      Array.isArray(
        state.quarantineHistory
      )
        ? state.quarantineHistory
        : [],

    speedHistory:
      Array.isArray(
        state.speedHistory
      )
        ? state.speedHistory
        : [],

    defender:
      getTorrentDefenderStatusPayload(state),
  };
}

function isBrowserSafeVideoExtension(filePath: string) {
  return [".mp4", ".m4v", ".webm"].includes(path.extname(filePath).toLowerCase());
}

function normaliseTorrentTransferJob(job: any) {
  if (!job) return null;
  const copy = { ...job };
  delete copy.process;
  return copy;
}

function listTorrentTransferJobs() {
  return Array.from(TORRENT_LIBRARY_HANDOFF_JOBS.values())
    .sort((a: any, b: any) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0))
    .slice(0, 30)
    .map(normaliseTorrentTransferJob);
}

function normaliseQbitFilePriority(priority: any) {
  const text = String(priority || "").toLowerCase();
  if (text === "skip" || text === "off" || text === "0") return 0;
  if (text === "high" || text === "6") return 6;
  if (text === "max" || text === "top" || text === "7") return 7;
  return 1;
}

function mapQbitFileItem(file: any, index: number, torrent: any = {}) {
  const name = firstString(file?.name) || `File ${index + 1}`;
  const priority = Number(file?.priority || 0);
  const progress = Math.round(Number(file?.progress || 0) * 10000) / 100;
  const ext = path.extname(name).toLowerCase();

  return {
    id: String(index),
    index,
    name,
    sizeBytes: Number(file?.size || 0),
    progress,
    priority,
    active: priority > 0,
    availability: Number(file?.availability || 0),
    completed: progress >= 100,
    type: TORRENT_HANDOFF_AUDIO_EXTENSIONS.has(ext)
      ? "audio"
      : TORRENT_HANDOFF_VIDEO_EXTENSIONS.has(ext)
        ? "video"
        : "other",
    canAddToAudio: TORRENT_HANDOFF_AUDIO_EXTENSIONS.has(ext),
    canAddToVideo: TORRENT_HANDOFF_VIDEO_EXTENSIONS.has(ext),
    downloadUrl: `/torrent/items/${encodeURIComponent(String(torrent.hash || torrent.id || ""))}/files/download?fileId=${encodeURIComponent(String(index))}`,
  };
}

async function getQbitTorrentFiles(hash: string) {
  const state = readTorrentStateStore();
  const engine = getTorrentEngineForRuntime(state);
  if (!engine.enabled) return { ok: false, error: "qBittorrent engine is not connected." };

  const liveItems = await getQbitTorrentItems(state) || [];
  const torrent = liveItems.find((item: any) => String(item.hash || item.id) === String(hash));

  const params = new URLSearchParams();
  params.set("hash", hash);

  const response = await qbitFetch(engine, `/api/v2/torrents/files?${params.toString()}`, { method: "GET" });
  const rawFiles = await response.json().catch(() => []);
  const files = Array.isArray(rawFiles) ? rawFiles.map((file, index) => mapQbitFileItem(file, index, torrent || { hash })) : [];

  return {
    ok: true,
    hash,
    torrent: torrent || { id: hash, hash, name: hash },
    files,
    targets: {
      audioRoot: path.resolve(getDefaultLibrarySourcePath("audio") || "H:\\Music"),
      videoRoot: path.resolve(getDefaultLibrarySourcePath("video") || "C:\\Videos"),
    },
  };
}

async function getQbitTorrentPieces(hash: string) {
  const state = readTorrentStateStore();
  const engine = getTorrentEngineForRuntime(state);
  if (!engine.enabled) return { ok: false, error: "qBittorrent engine is not connected." };

  const liveItems = await getQbitTorrentItems(state) || [];
  const torrent = liveItems.find((item: any) => String(item.hash || item.id) === String(hash));
  const params = new URLSearchParams();
  params.set("hash", hash);

  const statesResponse = await qbitFetch(engine, `/api/v2/torrents/pieceStates?${params.toString()}`, { method: "GET" });
  const statesRaw = await statesResponse.json().catch(() => []);
  const states = Array.isArray(statesRaw) ? statesRaw.map((value: any) => Number(value || 0)) : [];

  let hashes: string[] = [];
  try {
    const hashesResponse = await qbitFetch(engine, `/api/v2/torrents/pieceHashes?${params.toString()}`, { method: "GET" });
    const hashesRaw = await hashesResponse.json().catch(() => []);
    hashes = Array.isArray(hashesRaw) ? hashesRaw.map((value: any) => String(value || "")) : [];
  } catch {}

  const complete = states.filter((value) => value === 2).length;
  const downloading = states.filter((value) => value === 1).length;
  const missing = Math.max(0, states.length - complete - downloading);

  return {
    ok: true,
    hash,
    torrent: torrent || { id: hash, hash, name: hash },
    totalPieces: states.length,
    completePieces: complete,
    downloadingPieces: downloading,
    missingPieces: missing,
    percent: states.length ? Math.round((complete / states.length) * 10000) / 100 : 0,
    pieces: states.map((state, index) => ({
      index,
      state,
      status: state === 2 ? "complete" : state === 1 ? "downloading" : "missing",
      hash: hashes[index] || "",
    })),
  };
}

async function setQbitTorrentFilePriority(hash: string, fileIds: any, priority: any) {
  const state = readTorrentStateStore();
  const engine = getTorrentEngineForRuntime(state);
  if (!engine.enabled) return { ok: false, error: "qBittorrent engine is not connected." };

  const ids = Array.isArray(fileIds) ? fileIds : String(fileIds || "").split(",");
  const cleanedIds = ids.map((id: any) => String(id).trim()).filter(Boolean);
  if (!cleanedIds.length) return { ok: false, error: "Choose at least one torrent file." };

  const form = new URLSearchParams();
  form.set("hash", hash);
  form.set("id", cleanedIds.join("|"));
  form.set("priority", String(normaliseQbitFilePriority(priority)));

  await qbitFetch(engine, "/api/v2/torrents/filePrio", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });

  return await getQbitTorrentFiles(hash);
}

function resolveTorrentFilePath(torrent: any, file: any) {
  const fileName = firstString(file?.name) || "";
  if (!fileName) throw new Error("Torrent file name is missing.");

  const contentPath = firstString(torrent?.contentPath || torrent?.content_path) || "";
  const savePath = firstString(torrent?.savePath || torrent?.save_path) || "";
  const candidates: string[] = [];

  if (contentPath) {
    try {
      if (fs.existsSync(contentPath) && fs.statSync(contentPath).isFile()) {
        candidates.push(contentPath);
        candidates.push(path.join(path.dirname(contentPath), fileName));
      } else {
        candidates.push(path.join(contentPath, fileName));
      }
    } catch {
      candidates.push(path.join(contentPath, fileName));
    }
  }

  if (savePath) candidates.push(path.join(savePath, fileName));

  const found = candidates.find((candidate) => {
    try { return fs.existsSync(candidate) && fs.statSync(candidate).isFile(); } catch { return false; }
  });

  if (!found) {
    throw new Error(`Downloaded file is not available on disk yet: ${fileName}`);
  }

  return path.resolve(found);
}

function makeUniqueCopyPath(targetDir: string, fileName: string) {
  const safeName = path.basename(fileName).replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
  const parsed = path.parse(safeName);
  let target = path.join(targetDir, safeName);
  let counter = 1;

  while (fs.existsSync(target)) {
    target = path.join(targetDir, `${parsed.name} (${counter})${parsed.ext}`);
    counter += 1;
  }

  return target;
}

function copyFileWithProgress(sourcePath: string, targetPath: string, onProgress: (copiedBytes: number, totalBytes: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const stat = fs.statSync(sourcePath);
    const totalBytes = Math.max(1, Number(stat.size || 0));
    let copiedBytes = 0;
    const input = fs.createReadStream(sourcePath);
    const output = fs.createWriteStream(targetPath);

    const fail = (err: any) => {
      input.destroy();
      output.destroy();
      try { if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath); } catch {}
      reject(err);
    };

    input.on("data", (chunk: Buffer) => {
      copiedBytes += chunk.length;
      onProgress(copiedBytes, totalBytes);
    });
    input.on("error", fail);
    output.on("error", fail);
    output.on("finish", () => resolve());
    input.pipe(output);
  });
}

function setTorrentTransferJob(job: any, patch: any) {
  Object.assign(job, patch, { updatedAt: Date.now() });
  TORRENT_LIBRARY_HANDOFF_JOBS.set(job.id, job);
}

function pushTorrentTransferCompleteNotification(job: any) {
  const state = readTorrentStateStore();
  if (state.settings?.ui?.transferCompleteNotifications === false) return;
  pushTorrentNotification(state, {
    type: "complete",
    title: job.target === "audio" ? "Audio transfer complete" : "Video transfer complete",
    message: `${job.fileName || "Torrent file"} was added to ${job.target === "audio" ? "Audio Player" : "Video Player"}.`,
    actionUrl: job.openUrl || "/torrents?tab=completed",
  });
  writeTorrentStateStore(state);
}

async function runTorrentLibraryHandoffJob(job: any) {
  try {
    setTorrentTransferJob(job, { status: "running", stage: "copying", percent: 3, message: "Copying file into BRMedia library…" });

    fs.mkdirSync(job.targetRoot, { recursive: true });
    await copyFileWithProgress(job.sourcePath, job.copiedTo, (copiedBytes, totalBytes) => {
      const copyPercent = Math.round((copiedBytes / Math.max(1, totalBytes)) * 70);
      setTorrentTransferJob(job, {
        stage: "copying",
        percent: Math.max(3, Math.min(76, 6 + copyPercent)),
        copiedBytes,
        totalBytes,
        message: `Copying ${path.basename(job.sourcePath)}…`,
      });
    });

    if (job.target === "audio") {
      setTorrentTransferJob(job, { stage: "metadata", percent: 82, message: "Reading audio metadata and adding to Player…" });
      const item = await addLocalFileToLibraryWithMetadata(job.copiedTo);
      void queueWaveformGenerationForItems([item], { peakCount: DEFAULT_WAVEFORM_PEAKS, onlyMissing: true });
      setTorrentTransferJob(job, {
        status: "done",
        stage: "complete",
        percent: 100,
        item,
        openUrl: `/player?trackId=${encodeURIComponent(item.id)}`,
        message: "Audio copied, tagged and added to Player.",
      });

      appendStatsEvent("torrent_transfer_done", "torrents", {
        entityType: "audio",
        entityId: job.id,
        title: job.fileName,
        status: "done",
        route: "torrents",
        value: job.sizeBytes,
      });
      pushTorrentTransferCompleteNotification(job);
      return;
    }

    setTorrentTransferJob(job, { stage: "metadata", percent: 84, message: "Refreshing Video library and metadata…" });
    scanVideoLibrary();
    const item = getVideoLibraryItems().find((video: any) => path.resolve(video.locator).toLowerCase() === path.resolve(job.copiedTo).toLowerCase()) || null;
    const needsBrowserCopy = !isBrowserSafeVideoExtension(job.copiedTo);

    setTorrentTransferJob(job, {
      status: "done",
      stage: "complete",
      percent: 100,
      item,
      openUrl: item?.id ? `/video-player?videoId=${encodeURIComponent(item.id)}` : "/video-player",
      needsBrowserCopy,
      message: needsBrowserCopy
        ? "Video added. MKV/AVI/VOB files stay in the library and can be converted to a browser-safe MP4 copy from Video Player."
        : "Video copied and added to Video Player.",
    });

    appendStatsEvent("torrent_transfer_done", "torrents", {
      entityType: "video",
      entityId: job.id,
      title: job.fileName,
      status: "done",
      route: "torrents",
      value: job.sizeBytes,
    });
    pushTorrentTransferCompleteNotification(job);
  } catch (err: any) {
    setTorrentTransferJob(job, {
      status: "error",
      stage: "error",
      percent: 100,
      error: String(err?.message || err),
      message: String(err?.message || err),
    });

    appendStatsEvent("torrent_transfer_error", "torrents", {
      entityType: job.target,
      entityId: job.id,
      title: job.fileName,
      status: "error",
      route: "torrents",
    });
  }
}

async function handoffTorrentFileToLibrary(hash: string, raw: any) {
  const target = String(raw?.target || "").toLowerCase();
  const fileId = String(raw?.fileId ?? raw?.id ?? "");
  const filesPayload = await getQbitTorrentFiles(hash);
  if (!filesPayload.ok) return filesPayload;

  const files = Array.isArray(filesPayload.files) ? filesPayload.files : [];
  const file = files.find((entry: any) => String(entry.id) === fileId || String(entry.index) === fileId);
  if (!file) return { ok: false, error: "Torrent file not found." };
  if (file.progress < 100) return { ok: false, error: "That file is not complete yet." };

  const sourcePath = resolveTorrentFilePath(filesPayload.torrent, file);
  const targetRoot = target === "audio"
    ? path.resolve(getDefaultLibrarySourcePath("audio") || "H:\\Music")
    : target === "video"
      ? path.resolve(getDefaultLibrarySourcePath("video") || "C:\\Videos")
      : "";

  if (target === "audio" && !isSupportedAudioFile(sourcePath)) {
    return { ok: false, error: "This file is not a supported audio file." };
  }

  if (target === "video" && !isSupportedVideoFile(sourcePath)) {
    return { ok: false, error: "This file is not a supported video file." };
  }

  if (!targetRoot) return { ok: false, error: "Choose audio or video library." };

  const copyPath = makeUniqueCopyPath(targetRoot, path.basename(sourcePath));
  const stat = fs.statSync(sourcePath);
  const job = {
    id: makeConverterId("torrent_handoff"),
    hash,
    fileId,
    target,
    fileName: path.basename(sourcePath),
    torrentName: filesPayload.torrent?.name || hash,
    sourcePath,
    copiedTo: copyPath,
    targetRoot,
    sizeBytes: Number(stat.size || 0),
    copiedBytes: 0,
    totalBytes: Number(stat.size || 0),
    status: "queued",
    stage: "queued",
    percent: 0,
    message: target === "audio" ? "Queued for Audio library transfer." : "Queued for Video library transfer.",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  TORRENT_LIBRARY_HANDOFF_JOBS.set(job.id, job);

  appendStatsEvent("torrent_transfer_started", "torrents", {
    entityType: target,
    entityId: job.id,
    title: job.fileName,
    status: "queued",
    route: "torrents",
    value: job.sizeBytes,
  });

  void runTorrentLibraryHandoffJob(job);

  return {
    ok: true,
    job: normaliseTorrentTransferJob(job),
  };
}

function streamQbitTorrentFile(req: http.IncomingMessage, res: http.ServerResponse, hash: string, fileId: string) {
  return getQbitTorrentFiles(hash).then((payload: any) => {
    if (!payload.ok) return json(res, 400, payload);
    const files = Array.isArray(payload.files) ? payload.files : [];
    const file = files.find((entry: any) => String(entry.id) === String(fileId) || String(entry.index) === String(fileId));
    if (!file) return json(res, 404, { error: "Torrent file not found" });
    const sourcePath = resolveTorrentFilePath(payload.torrent, file);
    return streamFileWithRange(req, res, sourcePath, { asAttachment: true, downloadName: path.basename(sourcePath) });
  }).catch((err: any) => json(res, 500, { error: String(err?.message || err) }));
}

function isLocalTorrentItemReadyForEngine(item: any) {
  const status = String(item?.status || "").toLowerCase();
  const malwareStatus = String(item?.malware?.status || "").toLowerCase();

  if (!item || String(item.kind || "") === "qbittorrent" || item.hash) return false;
  if (["blocked", "error", "paused", "complete", "completed"].includes(status)) return false;
  if (malwareStatus === "blocked") return false;

  return !!firstString(item.input || item.magnet || item.url || item.torrent);
}

async function addLocalTorrentItemToQbitWithoutRefresh(item: any, engine: any) {
  const input = firstString(item?.input || item?.magnet || item?.url || item?.torrent) || "";
  const kind = getTorrentInputKind(input);
  const malware = scanTorrentInputSafety([input, item?.name].filter(Boolean).join(" "));

  if (!input) throw new Error("Missing magnet link or .torrent reference.");
  if (kind === "unknown") throw new Error("Only magnet links and .torrent references can be sent to qBittorrent.");
  if (malware.status === "blocked" && item?.malware?.status !== "allowed") throw new Error(malware.message);

  if (String(input).toLowerCase().endsWith(".torrent") && fs.existsSync(String(input))) {
    const buffer = fs.readFileSync(String(input));
    const multipart = buildMultipartTorrentBody(
      firstString(item?.name) || path.basename(String(input)),
      buffer,
      engine.savePath ? { savepath: engine.savePath } : {}
    );

    await qbitFetch(engine, "/api/v2/torrents/add", {
      method: "POST",
      headers: { "Content-Type": multipart.contentType },
      body: multipart.body,
    });
    return;
  }

  const form = new URLSearchParams();
  form.set("urls", input);
  if (engine.savePath) form.set("savepath", engine.savePath);

  await qbitFetch(engine, "/api/v2/torrents/add", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
}

async function syncLocalTorrentQueueToEngine(state: any) {
  const items = Array.isArray(state.items) ? state.items : [];
  const candidates = items.filter(isLocalTorrentItemReadyForEngine);

  if (!candidates.length) {
    return { attempted: 0, sent: 0, failed: 0, state };
  }

  const engine = getTorrentEngineForRuntime(state);
  const remaining: any[] = [];
  let sent = 0;
  let failed = 0;

  for (const item of items) {
    if (!isLocalTorrentItemReadyForEngine(item)) {
      remaining.push(item);
      continue;
    }

    try {
      await addLocalTorrentItemToQbitWithoutRefresh(item, engine);
      sent += 1;
    } catch (err: any) {
      failed += 1;
      remaining.push({
        ...item,
        status: "queued",
        engineSyncError: String(err?.message || err),
        note: `Could not send to qBittorrent yet: ${String(err?.message || err)}`,
        updatedAt: Date.now(),
      });
    }
  }

  if (sent || failed) {
    state.items = remaining;
    state.updatedAt = Date.now();
    writeTorrentStateStore(state);
  }

  return { attempted: candidates.length, sent, failed, state };
}

function getTorrentDiskSpacePayload(state: any) {
  const configuredPath = path.resolve(firstString(state.engine?.savePath) || getTorrentEngineDefaultSettings().savePath);
  let probePath = configuredPath;
  while (!fs.existsSync(probePath)) {
    const parent = path.dirname(probePath);
    if (parent === probePath) break;
    probePath = parent;
  }

  try {
    const statfsSync = (fs as any).statfsSync;
    if (typeof statfsSync !== "function") throw new Error("Disk-space checks are unavailable in this Node.js build.");
    const stats = statfsSync(probePath);
    const totalBytes = Number(stats.blocks || 0) * Number(stats.bsize || 0);
    const freeBytes = Number(stats.bavail ?? stats.bfree ?? 0) * Number(stats.bsize || 0);
    if (!totalBytes) throw new Error("Disk-space totals were unavailable for the configured torrent drive.");
    const lowThresholdBytes = Math.max(5 * 1024 * 1024 * 1024, Math.round(totalBytes * 0.05));
    return {
      available: true, path: configuredPath, probePath, totalBytes, freeBytes,
      usedBytes: Math.max(0, totalBytes - freeBytes),
      freePercent: totalBytes ? Math.round((freeBytes / totalBytes) * 1000) / 10 : 0,
      lowThresholdBytes, low: freeBytes <= lowThresholdBytes, checkedAt: Date.now(),
    };
  } catch (err: any) {
    return { available: false, path: configuredPath, probePath, low: false, checkedAt: Date.now(), error: String(err?.message || err) };
  }
}

function updateTorrentRuntimeAlerts(state: any, payload: any = {}) {
  const runtime = { ...(state.runtime || {}) };
  const ui = { ...getTorrentStateDefaultSettings().ui, ...(state.settings?.ui || {}) };

  if (payload.engineConnected === false) {
    if (!runtime.engineDisconnectedNotified && ui.engineDisconnectedNotifications !== false) {
      pushTorrentNotification(state, {
        type: "warning", title: "qBittorrent engine disconnected",
        message: firstString(payload.engineError) || "BRMedia could not reach qBittorrent Web UI.",
        actionUrl: "/settings?module=torrents&tab=network",
      });
    }
    runtime.engineDisconnectedNotified = true;
  } else if (payload.engineConnected === true) {
    runtime.engineDisconnectedNotified = false;
  }

  if (payload.diskSpace) {
    const diskSpace = payload.diskSpace;
    runtime.diskSpace = diskSpace;
    if (diskSpace.available && diskSpace.low) {
      if (!runtime.diskSpaceNotified && ui.diskSpaceNotifications !== false) {
        pushTorrentNotification(state, {
          type: "warning", title: "Torrent download drive is running low",
          message: `${Math.max(0, Number(diskSpace.freePercent || 0))}% free on ${diskSpace.path || "the torrent download drive"}.`,
          actionUrl: "/settings?module=torrents&tab=downloads",
        });
      }
      runtime.diskSpaceNotified = true;
    } else if (diskSpace.available) {
      runtime.diskSpaceNotified = false;
    }
  }

  state.runtime = runtime;
  return runtime;
}

async function getTorrentStatePayloadLive() {
  const state =
    readTorrentStateStore();

  if (!isTorrentEngineEnabled(state)) {
    return getTorrentStatePayload();
  }

  try {
    const initialItems =
      await getQbitTorrentItems(state);

    const syncResult =
      await syncLocalTorrentQueueToEngine(
        state
      );

    const freshState =
      readTorrentStateStore();

    const liveItemsAfterSync =
      syncResult.sent
        ? await getQbitTorrentItems(
            freshState
          )
        : initialItems;

    const payload =
      getTorrentStatePayload();

    const qbitItems =
      Array.isArray(liveItemsAfterSync)
        ? liveItemsAfterSync
        : [];

    const localItems =
      Array.isArray(freshState.items)
        ? freshState.items
        : [];

    const liveItems = [
      ...qbitItems,
      ...localItems,
    ];

    const completedNotified =
      new Set(
        Array.isArray(
          freshState.completedNotified
        )
          ? freshState.completedNotified
              .map((value: any) =>
                String(value)
              )
          : []
      );

    liveItems
      .filter((item: any) =>
        [
          "complete",
          "completed",
          "seeding",
        ].includes(
          String(item.status || "")
        ) ||
        Number(item.progress || 0) >= 100
      )
      .forEach((item: any) => {
        const entityId =
          String(
            item.hash ||
            item.id ||
            item.name ||
            ""
          );

        appendStatsEventOnce(
          "torrent_download_done",
          "torrents",
          {
            entityType: "torrent",
            entityId,
            title:
              String(
                item.name ||
                "Torrent download"
              ),
            status: "done",
            route: "torrents",
            value:
              Number(
                item.sizeBytes ||
                0
              ),
          }
        );

        if (
          entityId &&
          !completedNotified.has(
            entityId
          ) &&
          freshState
            .settings
            ?.ui
            ?.completionNotifications !==
            false
        ) {
          completedNotified.add(
            entityId
          );

          pushTorrentNotification(
            freshState,
            {
              type: "complete",
              title:
                "Torrent download complete",
              message:
                String(
                  item.name ||
                  "Torrent download"
                ),
              torrentId:
                entityId,
              actionUrl:
                `/torrents?tab=completed&torrent=${encodeURIComponent(
                  entityId
                )}`,
            }
          );
        }
      });

    freshState.completedNotified =
      Array
        .from(completedNotified)
        .slice(-500);

    const lowSeedNotified =
      new Set(
        Array.isArray(
          freshState.lowSeedNotified
        )
          ? freshState.lowSeedNotified
              .map((value: any) =>
                String(value)
              )
          : []
      );

    liveItems
      .filter((item: any) =>
        [
          "queued",
          "downloading",
          "checking",
        ].includes(
          String(item.status || "")
        ) &&
        Number(item.seeds || 0) <= 0
      )
      .forEach((item: any) => {
        const entityId =
          String(
            item.hash ||
            item.id ||
            item.name ||
            ""
          );

        if (
          entityId &&
          !lowSeedNotified.has(
            entityId
          ) &&
          freshState
            .settings
            ?.ui
            ?.lowSeedNotifications !==
            false
        ) {
          lowSeedNotified.add(
            entityId
          );

          pushTorrentNotification(
            freshState,
            {
              type: "warning",
              title:
                "Torrent has no active seeds",
              message:
                String(
                  item.name ||
                  "Torrent download"
                ),
              torrentId:
                entityId,
              actionUrl:
                `/torrents?tab=health&torrent=${encodeURIComponent(
                  entityId
                )}`,
            }
          );
        }
      });

    freshState.lowSeedNotified =
      Array
        .from(lowSeedNotified)
        .slice(-500);

    const liveSummary = {
      total:
        liveItems.length,

      active:
        liveItems.filter(
          (item: any) =>
            [
              "queued",
              "downloading",
              "checking",
            ].includes(
              String(
                item.status ||
                ""
              )
            )
        ).length,

      blocked:
        liveItems.filter(
          (item: any) =>
            item
              ?.malware
              ?.status ===
              "blocked" ||
            item.status ===
              "blocked"
        ).length,

      completed:
        liveItems.filter(
          (item: any) =>
            [
              "complete",
              "completed",
              "seeding",
            ].includes(
              String(
                item.status ||
                ""
              )
            ) ||
            Number(
              item.progress ||
              0
            ) >= 100
        ).length,

      downloadSpeedKb:
        liveItems.reduce(
          (
            sum: number,
            item: any
          ) =>
            sum +
            Number(
              item.downloadSpeedKb ||
              0
            ),
          0
        ),

      uploadSpeedKb:
        liveItems.reduce(
          (
            sum: number,
            item: any
          ) =>
            sum +
            Number(
              item.uploadSpeedKb ||
              0
            ),
          0
        ),

      downloadedBytes: liveItems.reduce((sum: number, item: any) => sum + Number(item.completedBytes || 0), 0),
      uploadedBytes: liveItems.reduce((sum: number, item: any) => sum + Number(item.uploadedBytes || 0), 0),
    };

    const runtime = updateTorrentRuntimeAlerts(freshState, {
      engineConnected: true,
      diskSpace: getTorrentDiskSpacePayload(freshState),
    });

    appendTorrentSpeedHistory(
      freshState,
      liveSummary
    );

    writeTorrentStateStore(
      freshState
    );

    const engineNote =
      syncResult.sent
        ? `Connected to qBittorrent Web UI. Sent ${syncResult.sent} queued BRMedia torrent${syncResult.sent === 1 ? "" : "s"} to the engine.`
        : syncResult.failed
          ? `Connected to qBittorrent Web UI, but ${syncResult.failed} queued item${syncResult.failed === 1 ? "" : "s"} could not be sent yet.`
          : "Connected to qBittorrent Web UI. Queue and controls are live.";

    return {
      ...payload,

      engine: {
        ...getTorrentEngineForRuntime(
          freshState
        ),

        password:
          freshState
            .engine
            ?.password
            ? "••••••••"
            : "",

        installed: true,
        status: "connected",
        note: engineNote,
        sync: syncResult,
        lastCheckedAt:
          Date.now(),
      },

      items:
        liveItems,

      notifications:
        Array.isArray(
          freshState.notifications
        )
          ? freshState.notifications
          : [],

      scanHistory:
        Array.isArray(
          freshState.scanHistory
        )
          ? freshState.scanHistory
          : [],

      speedHistory:
        Array.isArray(
          freshState.speedHistory
        )
          ? freshState.speedHistory
          : [],

      runtime,

      summary:
        liveSummary,
    };
  } catch (err: any) {
    const failedState = readTorrentStateStore();
    updateTorrentRuntimeAlerts(failedState, { engineConnected: false, engineError: String(err?.message || err || "Could not connect to qBittorrent Web UI.") });
    writeTorrentStateStore(failedState);
    const payload = getTorrentStatePayload();

    return {
      ...payload,

      engine: {
        ...getTorrentEngineForRuntime(
          state
        ),

        password:
          state
            .engine
            ?.password
            ? "••••••••"
            : "",

        installed: false,
        status:
          "connection-error",

        note:
          String(
            err?.message ||
            err ||
            "Could not connect to qBittorrent Web UI."
          ),

        lastCheckedAt:
          Date.now(),
      },
    };
  }
}

async function addTorrentToQbit(raw: any) {
  const state = readTorrentStateStore();
  const engine = getTorrentEngineForRuntime(state);
  const input = firstString(raw?.input || raw?.magnet || raw?.url || raw?.torrent) || "";
  const kind = getTorrentInputKind(input);
  const malware = scanTorrentInputSafety(input);

  if (!input) return { ok: false, error: "Missing magnet link or .torrent URL" };
  if (kind === "unknown") return { ok: false, error: "Only magnet links and .torrent URLs can be sent to qBittorrent here." };
  if (malware.status === "blocked") return { ok: false, error: malware.message, malware };

  const form = new URLSearchParams();
  form.set("urls", input);
  if (engine.savePath) form.set("savepath", engine.savePath);

  await qbitFetch(engine, "/api/v2/torrents/add", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });

  return { ok: true, item: { name: getTorrentDisplayName(input), input, kind, status: "queued", malware }, state: await getTorrentStatePayloadLive() };
}

async function addTorrentQueueItemLive(raw: any): Promise<any> {
  const inputList = Array.isArray(raw?.inputs)
    ? raw.inputs.map((entry: any) => firstString(entry)).filter(Boolean)
    : String(firstString(raw?.input || raw?.magnet || raw?.url || raw?.torrent) || "")
        .split(/\r?\n/)
        .map((entry) => entry.trim())
        .filter(Boolean);

  if (inputList.length > 1) {
    const results: any[] = [];
    for (const input of inputList) {
      results.push(await addTorrentQueueItemLive({ ...raw, input }));
    }
    return { ok: true, results, state: await getTorrentStatePayloadLive() };
  }

  if (isTorrentEngineEnabled()) {
    try {
      return await addTorrentToQbit(raw);
    } catch (err: any) {
      const queued = addTorrentQueueItem(raw);

      return {
        ...queued,
        warning: `qBittorrent refused the add request, so BRMedia queued it locally: ${String(err?.message || err)}`,
        state: await getTorrentStatePayloadLive(),
      };
    }
  }

  return addTorrentQueueItem(raw);
}

function buildMultipartTorrentBody(fileName: string, buffer: Buffer, fields: Record<string, string>) {
  const boundary = `----BRMediaTorrent${Date.now()}${Math.random().toString(36).slice(2)}`;
  const chunks: Buffer[] = [];

  const pushText = (value: string) => chunks.push(Buffer.from(value, "utf8"));

  Object.entries(fields).forEach(([key, value]) => {
    if (!value) return;
    pushText(`--${boundary}\r\n`);
    pushText(`Content-Disposition: form-data; name="${key}"\r\n\r\n`);
    pushText(`${value}\r\n`);
  });

  pushText(`--${boundary}\r\n`);
  pushText(`Content-Disposition: form-data; name="torrents"; filename="${fileName.replace(/"/g, "")}"\r\n`);
  pushText("Content-Type: application/x-bittorrent\r\n\r\n");
  chunks.push(buffer);
  pushText(`\r\n--${boundary}--\r\n`);

  return {
    body: Buffer.concat(chunks),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

async function uploadTorrentFileToQbit(fileName: string, buffer: Buffer) {
  const state = readTorrentStateStore();
  const engine = getTorrentEngineForRuntime(state);
  const malware = scanTorrentInputSafety(fileName);

  if (malware.status === "blocked") return { ok: false, error: malware.message, malware };

  const multipart = buildMultipartTorrentBody(fileName, buffer, engine.savePath ? { savepath: engine.savePath } : {});

  await qbitFetch(engine, "/api/v2/torrents/add", {
    method: "POST",
    headers: { "Content-Type": multipart.contentType },
    body: multipart.body,
  });

  return { ok: true, item: { name: fileName, kind: "torrent-upload", status: "queued", malware }, state: await getTorrentStatePayloadLive() };
}

async function uploadTorrentFileLive(raw: any) {
  const fileName = firstString(raw?.fileName || raw?.name) || `upload-${Date.now()}.torrent`;
  const dataBase64 = firstString(raw?.dataBase64 || raw?.base64) || "";

  if (!fileName.toLowerCase().endsWith(".torrent")) {
    return { ok: false, error: "Only .torrent files can be uploaded here." };
  }

  if (!dataBase64) {
    return { ok: false, error: "Missing .torrent file data." };
  }

  const buffer = Buffer.from(dataBase64, "base64");
  if (!buffer.length || buffer.length > 20 * 1024 * 1024) {
    return { ok: false, error: "Torrent file is empty or too large." };
  }

  ensurePlayerRuntimeStateDir();
  fs.mkdirSync(TORRENT_UPLOAD_DIR, { recursive: true });
  const safeName = fileName.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").slice(0, 160);
  const storedPath = path.join(TORRENT_UPLOAD_DIR, `${Date.now()}-${safeName}`);
  fs.writeFileSync(storedPath, buffer);

  if (isTorrentEngineEnabled()) {
    try {
      return await uploadTorrentFileToQbit(safeName, buffer);
    } catch (err: any) {
      const queued = addTorrentQueueItem({
        input: storedPath,
        label: firstString(raw?.label) || safeName,
      });

      return {
        ...queued,
        warning: `qBittorrent refused the upload, so BRMedia queued it locally: ${String(err?.message || err)}`,
        state: await getTorrentStatePayloadLive(),
      };
    }
  }

  return addTorrentQueueItem({
    input: storedPath,
    label: firstString(raw?.label) || safeName,
  });
}

function parseTorrentScheduleTime(value: string) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
  const hour = Math.max(0, Math.min(23, Number(match?.[1] || 0)));
  const minute = Math.max(0, Math.min(59, Number(match?.[2] || 0)));

  return { hour, minute };
}

function getTorrentScheduleMinutes(value: string) {
  const parsed = parseTorrentScheduleTime(value);
  return parsed.hour * 60 + parsed.minute;
}

function isTorrentTimeInsideWindow(nowMinutes: number, start: string, end: string) {
  const from = getTorrentScheduleMinutes(start);
  const to = getTorrentScheduleMinutes(end);
  if (from === to) return true;
  return from < to ? nowMinutes >= from && nowMinutes < to : nowMinutes >= from || nowMinutes < to;
}

function getTorrentSchedulerRuntimePayload(state: any, now = new Date()) {
  const scheduler = { ...getTorrentStateDefaultSettings().scheduler, ...(state.settings?.scheduler || {}) };
  const windows = Array.isArray(scheduler.windows) ? scheduler.windows : [];
  const weekend = now.getDay() === 0 || now.getDay() === 6;
  const selected = windows.find((item: any) => String(item?.day || "").toLowerCase().includes(weekend ? "sat" : "mon")) || windows[weekend ? 1 : 0] || {};
  const start = firstString(selected.start) || "00:00";
  const end = firstString(selected.end) || "07:00";
  const insideWindow = isTorrentTimeInsideWindow(now.getHours() * 60 + now.getMinutes(), start, end);
  const desiredMode = scheduler.enabled ? String(insideWindow ? scheduler.mode || "download-and-seed" : scheduler.outsideMode || "slow") : "normal";
  return { enabled: !!scheduler.enabled, weekend, windowDay: weekend ? "Sat-Sun" : "Mon-Fri", start, end, insideWindow, desiredMode, checkedAt: Date.now() };
}

function isQbitItemPaused(item: any) {
  return String(item?.engineState || "").toLowerCase().includes("paused");
}

function shouldPauseTorrentForScheduler(item: any, desiredMode: string) {
  if (!item?.hash || String(item.status) === "error") return false;
  if (desiredMode === "paused") return true;
  if (desiredMode === "download-only") return !!item.isSeeding;
  if (desiredMode === "seed-only") return !item.isSeeding;
  return false;
}

let TORRENT_SCHEDULER_RUNTIME_BUSY = false;

async function applyTorrentSchedulerRuntime() {
  if (TORRENT_SCHEDULER_RUNTIME_BUSY) return { ok: true, busy: true };
  TORRENT_SCHEDULER_RUNTIME_BUSY = true;
  const state = readTorrentStateStore();
  const scheduler = getTorrentSchedulerRuntimePayload(state);
  const previous = new Set<string>(Array.isArray(state.runtime?.scheduler?.pausedHashes) ? state.runtime.scheduler.pausedHashes.map(String) : []);

  try {
    if (!isTorrentEngineEnabled(state)) {
      state.runtime = { ...(state.runtime || {}), scheduler: { ...scheduler, pausedHashes: Array.from(previous), slowModeActive: false, note: "qBittorrent engine is disabled." } };
      writeTorrentStateStore(state);
      return { ok: false, scheduler: state.runtime.scheduler, error: "qBittorrent engine is disabled." };
    }

    const engine = getTorrentEngineForRuntime(state);
    const items = await getQbitTorrentItems(state) || [];
    const wanted = new Set<string>();
    items.forEach((item: any) => { if (shouldPauseTorrentForScheduler(item, scheduler.desiredMode)) wanted.add(String(item.hash)); });
    const currentHashes = new Set(items.map((item: any) => String(item.hash)));
    const owned = new Set(Array.from(previous).filter((hash) => currentHashes.has(hash)));
    const toPause = items.filter((item: any) => wanted.has(String(item.hash)) && !isQbitItemPaused(item)).map((item: any) => String(item.hash));
    toPause.forEach((hash) => owned.add(hash));
    const toResume = Array.from(owned).filter((hash) => !wanted.has(hash) && currentHashes.has(hash));
    toResume.forEach((hash) => owned.delete(hash));

    if (toPause.length) await qbitSetTorrentPaused(engine, toPause.join("|"), true);
    if (toResume.length) await qbitSetTorrentPaused(engine, toResume.join("|"), false);
    const wasSlowModeActive = !!state.runtime?.scheduler?.slowModeActive;
    const slowModeActive = scheduler.enabled && scheduler.desiredMode === "slow";
    if (scheduler.enabled || wasSlowModeActive) await qbitSetAlternativeSpeedLimitsEnabled(engine, slowModeActive);

    state.runtime = { ...(state.runtime || {}), scheduler: { ...scheduler, pausedHashes: Array.from(owned), slowModeActive, lastAppliedAt: Date.now(), lastError: "", note: scheduler.enabled ? `${scheduler.insideWindow ? "Inside" : "Outside"} ${scheduler.windowDay} schedule window.` : "Scheduler is disabled." } };
    writeTorrentStateStore(state);
    return { ok: true, scheduler: state.runtime.scheduler, paused: toPause.length, resumed: toResume.length };
  } catch (err: any) {
    state.runtime = { ...(state.runtime || {}), scheduler: { ...scheduler, pausedHashes: Array.from(previous), lastAppliedAt: Date.now(), lastError: String(err?.message || err), note: "BRMedia could not apply the torrent schedule." } };
    writeTorrentStateStore(state);
    return { ok: false, scheduler: state.runtime.scheduler, error: String(err?.message || err) };
  } finally {
    TORRENT_SCHEDULER_RUNTIME_BUSY = false;
  }
}

async function sendLocalTorrentItemToEngine(id: string) {
  const state = readTorrentStateStore();

  if (!isTorrentEngineEnabled(state)) {
    return { ok: false, error: "qBittorrent engine is not connected yet. Enable and test it in Network first." };
  }

  const items = Array.isArray(state.items) ? state.items : [];
  const index = items.findIndex((item: any) => String(item.id) === String(id));

  if (index < 0) {
    return { ok: false, error: "Local BRMedia torrent item not found." };
  }

  const item = items[index];
  const malware = scanTorrentInputSafety(item.input || item.name || "");

  if (malware.status === "blocked" && item?.malware?.status !== "allowed") {
    return { ok: false, error: malware.message, malware };
  }

  if (String(item.input || "").toLowerCase().endsWith(".torrent") && fs.existsSync(String(item.input))) {
    const buffer = fs.readFileSync(String(item.input));
    await uploadTorrentFileToQbit(firstString(item.name) || path.basename(String(item.input)), buffer);
  } else {
    await addTorrentToQbit({ input: item.input, label: item.name });
  }

  items.splice(index, 1);
  state.items = items;
  writeTorrentStateStore(state);

  return {
    ok: true,
    state: await getTorrentStatePayloadLive(),
    message: "Local BRMedia torrent sent to qBittorrent.",
  };
}

async function updateTorrentQueueItemLive(id: string, action: string, raw: any) {
  const state = readTorrentStateStore();
  const localItems = Array.isArray(state.items) ? state.items : [];
  const hasLocalItem = localItems.some((item: any) => String(item.id) === String(id));

  if (hasLocalItem && action === "send-to-engine") {
    return sendLocalTorrentItemToEngine(id);
  }

  if (hasLocalItem) {
    return await updateTorrentQueueItem(id, action, raw);
  }

  if ((action === "allow" || action === "unblock") && isTorrentEngineEnabled(state)) {
    return {
      ok: true,
      state: await getTorrentStatePayloadLive(),
      note: "No local blocked BRMedia item found. Live qBittorrent items do not need a BRMedia unblock override.",
    };
  }

  if (isTorrentEngineEnabled(state)) {
    const engine = getTorrentEngineForRuntime(state);
    const form = new URLSearchParams();
    form.set("hashes", id);

    if (action === "pause") {
      await qbitSetTorrentPaused(engine, id, true);
    } else if (action === "resume") {
      await qbitSetTorrentPaused(engine, id, false);
    } else if (action === "remove" || action === "remove-keep") {
      form.set("deleteFiles", "false");
      await qbitFetch(engine, "/api/v2/torrents/delete", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form });
    } else if (action === "remove-delete") {
      form.set("deleteFiles", "true");
      await qbitFetch(engine, "/api/v2/torrents/delete", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form });
    } else if (action === "priority") {
      await qbitFetch(engine, "/api/v2/torrents/topPrio", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form });
    } else if (action === "force-start") {
      form.set("value", "true");
      await qbitFetch(engine, "/api/v2/torrents/setForceStart", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form });
    } else if (action === "reannounce") {
      await qbitFetch(engine, "/api/v2/torrents/reannounce", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form });
    } else if (action === "recheck") {
      await qbitFetch(engine, "/api/v2/torrents/recheck", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form });
    } else if (action === "scan") {
      return await scanQbitTorrentDownloadedFiles(id);
    } else {
      return { ok: false, error: "Unsupported qBittorrent action" };
    }

    return { ok: true, state: await getTorrentStatePayloadLive() };
  }

    return await updateTorrentQueueItem(id, action, raw);
}

async function applyTorrentSettingsToEngine() {
  const state = readTorrentStateStore();
  if (!isTorrentEngineEnabled(state)) return { ok: false, error: "qBittorrent engine is disabled. Enable it in Network first." };

  const engine = getTorrentEngineForRuntime(state);
  const bandwidth = { ...getTorrentStateDefaultSettings().bandwidth, ...(state.settings?.bandwidth || {}) };
  const protocols = { ...getTorrentStateDefaultSettings().protocols, ...(state.settings?.protocols || {}) };
  const cache = { ...getTorrentStateDefaultSettings().cache, ...(state.settings?.cache || {}) };
  const preferences: Record<string, any> = {
    dl_limit: Math.max(0, Number(bandwidth.downloadLimitKb || 0)) * 1024,
    up_limit: Math.max(0, Number(bandwidth.uploadLimitKb || 0)) * 1024,
    alt_dl_limit: Math.max(0, Number(bandwidth.slowModeDownloadKb || 0)) * 1024,
    alt_up_limit: Math.max(0, Number(bandwidth.slowModeUploadKb || 0)) * 1024,
    scheduler_enabled: false,
    disk_cache: cache.enabled ? Math.max(0, Number(cache.sizeMb || 0)) : -1,
    disk_cache_ttl: cache.reduceDiskWear ? 300 : 60,
    upnp: !!protocols.upnp,
    pex: !!protocols.protocolEncryption,
  };

  const form = new URLSearchParams();
  form.set("json", JSON.stringify(preferences));
  await qbitFetch(engine, "/api/v2/app/setPreferences", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form });
  const scheduler = await applyTorrentSchedulerRuntime();
  return { ok: true, applied: preferences, scheduler, message: "qBittorrent preferences updated. BRMedia weekday/weekend scheduler applied on the server." };
}

async function testTorrentEngineConnection() {
  const state = readTorrentStateStore();

  if (!isTorrentEngineEnabled(state)) {
    return { ok: false, error: "Torrent engine is disabled. Enable qBittorrent Web UI first.", state: getTorrentStatePayload() };
  }

  const live = await getTorrentStatePayloadLive();
  return {
    ok: live.engine?.status === "connected",
    engine: live.engine,
    state: live,
    error: live.engine?.status === "connected" ? undefined : live.engine?.note,
  };
}

function readBufferBody(req: http.IncomingMessage, maxBytes = 250 * 1024 * 1024): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let rejected = false;

    req.on("data", (chunk) => {
      if (rejected) return;

      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buffer.length;

      if (total > maxBytes) {
        rejected = true;
        reject(new Error("Upload too large"));
        try { req.destroy(); } catch {}
        return;
      }

      chunks.push(buffer);
    });

    req.on("end", () => {
      if (rejected) return;
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

function isTracklistAttachmentFile(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  return [".txt", ".cue", ".json"].includes(ext);
}

let tracklistAttachmentFilesCache: { expiresAt: number; items: any[] } = {
  expiresAt: 0,
  items: [],
};

function invalidateTracklistAttachmentFilesCache() {
  tracklistAttachmentFilesCache = { expiresAt: 0, items: [] };
}

function summariseTracklistAttachmentFile(fullPath: string, stat: fs.Stats | null) {
  const ext = path.extname(fullPath).toLowerCase();
  const name = path.basename(fullPath);
  let data: any = null;

  try {
    const buffer = fs.readFileSync(fullPath);

    if (ext === ".json") {
      const raw = buffer.toString("utf8").replace(/^\uFEFF/, "").trim();
      const parsed = raw ? JSON.parse(raw) : {};

      const looksLikeTracklist =
        Array.isArray(parsed?.tracks) ||
        Array.isArray(parsed?.metaEntries) ||
        typeof parsed?.description === "string";

      if (!looksLikeTracklist) return null;

      data = normaliseTracklistRestoreData(parsed);
    } else {
      data = parseUploadedTracklistAttachmentServer(name, buffer).data;
    }
  } catch {
    return null;
  }

  const tracks = Array.isArray(data?.tracks) ? data.tracks : [];

  const timestamps = tracks.filter((track: any) => {
    return String(
      track?.timeText ??
      track?.timestamp ??
      track?.time ??
      ""
    ).trim();
  });

  return {
    name,
    path: fullPath,
    folder: path.basename(path.dirname(fullPath)),
    kind: ext === ".json" ? "json" : ext === ".cue" ? "cue" : "txt",
    extension: ext.replace(/^\./, ""),
    sizeBytes: stat?.size || 0,
    modifiedAt: stat?.mtimeMs || 0,
    trackCount: tracks.length,
    timestampCount: timestamps.length,
    hasTimestamps: timestamps.length > 0,
    metaCount: Array.isArray(data?.metaEntries) ? data.metaEntries.length : 0,
    description: String(data?.description || "").slice(0, 240),
    preview: tracks.slice(0, 6).map((track: any, index: number) => ({
      number: String(track?.number || index + 1),
      title: String(track?.title || `Track ${index + 1}`),
      timeText: String(
        track?.timeText ??
        track?.timestamp ??
        track?.time ??
        ""
      ),
    })),
  };
}

function listAvailableTracklistAttachmentFiles(forceRefresh = false) {
  const now = Date.now();

  if (!forceRefresh && tracklistAttachmentFilesCache.expiresAt > now) {
    return tracklistAttachmentFilesCache.items;
  }

  const roots = Array.isArray(cfg.localAllowedBases)
    ? cfg.localAllowedBases
    : [];

  const items: any[] = [];
  const maxItems = 500;

  const visit = (dirPath: string, depth = 0) => {
    if (items.length >= maxItems || depth > 8) return;

    let entries: fs.Dirent[] = [];

    try {
      entries = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (items.length >= maxItems) return;

      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        if (/node_modules|\.git|cache|waveform/i.test(entry.name)) continue;

        visit(fullPath, depth + 1);
        continue;
      }

      if (!entry.isFile() || !isTracklistAttachmentFile(fullPath)) {
        continue;
      }

      const allowed = validateLocalPathAllowed(
        fullPath,
        cfg.localAllowedBases
      );

      if (!allowed.ok) continue;

      let stat: fs.Stats | null = null;

      try {
        stat = fs.statSync(fullPath);
      } catch {}

      const summary = summariseTracklistAttachmentFile(fullPath, stat);

      if (summary) {
        items.push(summary);
      }
    }
  };

  roots.forEach((root) => {
    if (root && fs.existsSync(root)) {
      visit(root, 0);
    }
  });

  const sorted = items.sort(
    (a, b) =>
      Number(b.modifiedAt || 0) -
      Number(a.modifiedAt || 0)
  );

  tracklistAttachmentFilesCache = {
    expiresAt: now + 20_000,
    items: sorted,
  };

  return sorted;
}

function writeTracklistAttachmentDataForItem(item: any, fileName: string, buffer: Buffer) {
  if (!buffer.length) throw new Error("Empty tracklist file");

  const parsed = parseUploadedTracklistAttachmentServer(fileName, buffer);
  const loaded = loadTracklistDataForItem(item);

  fs.writeFileSync(loaded.jsonPath, JSON.stringify(parsed.data, null, 2), "utf8");
  fs.writeFileSync(loaded.txtPath, `${buildTracklistTextServer(parsed.data)}\n`, "utf8");
  invalidateTracklistAttachmentFilesCache();

  return {
    ok: true,
    sourceKind: parsed.sourceKind,
    fileName,
    data: parsed.data,
  };
}

function attachExistingTracklistFileToItem(item: any, sourcePathRaw: string) {
  const sourcePath = path.resolve(firstString(sourcePathRaw) || "");
  if (!sourcePath || !fs.existsSync(sourcePath)) throw new Error("Tracklist file not found");
  if (!isTracklistAttachmentFile(sourcePath)) throw new Error("Choose a .txt, .cue or .json tracklist file");

  const sourceAllowed = validateLocalPathAllowed(sourcePath, cfg.localAllowedBases);
  if (!sourceAllowed.ok) throw new Error(sourceAllowed.reason);

  const mediaAllowed = validateLocalPathAllowed(item.locator, cfg.localAllowedBases);
  if (!mediaAllowed.ok) throw new Error(mediaAllowed.reason);

  const buffer = fs.readFileSync(sourcePath);
  return writeTracklistAttachmentDataForItem(item, path.basename(sourcePath), buffer);
}

function parseUploadedTracklistAttachmentServer(fileNameRaw: string, buffer: Buffer) {
  const fileName = safeUploadFilename(fileNameRaw || "tracklist.txt");
  const ext = path.extname(fileName).toLowerCase();
  const raw = buffer.toString("utf8").replace(/^\uFEFF/, "").trim();

  if (!raw) {
    return {
      sourceKind: "empty-upload",
      data: { metaEntries: [], description: "", tracks: [] },
    };
  }

  if (ext === ".json") {
    try {
      const parsed = JSON.parse(raw);
      return {
        sourceKind: "json-upload",
        data: normaliseTracklistRestoreData(parsed),
      };
    } catch {
      return {
        sourceKind: "json-upload-fallback",
        data: parseTracklistTextServer(raw),
      };
    }
  }

  if (ext === ".cue") {
    return {
      sourceKind: "cue-upload",
      data: parseCueTracklistServer(raw),
    };
  }

  return {
    sourceKind: "txt-upload",
    data: parseTracklistTextServer(raw),
  };
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
          bands: payload.bands,
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

function safeAudioQuickBaseName(value: any, fallbackPath: string) {
  const fallback = path.parse(fallbackPath).name || "audio";
  const parsed = path.parse(safeUploadFilename(firstString(value) || fallback));
  return (parsed.name || fallback).replace(/\.+$/g, "").trim() || fallback;
}

function moveSidecarIfExists(oldPath: string, newPath: string) {
  if (!fs.existsSync(oldPath) || path.resolve(oldPath) === path.resolve(newPath)) return;
  if (fs.existsSync(newPath)) return;
  try {
    fs.renameSync(oldPath, newPath);
  } catch {}
}

function renameAudioFileAndSidecarsForQuickEdit(item: any, fileNameRaw: any) {
  const oldPath = path.resolve(item.locator);
  const oldParsed = path.parse(oldPath);
  const safeBase = safeAudioQuickBaseName(fileNameRaw, oldPath);
  const newPath = path.join(oldParsed.dir, `${safeBase}${oldParsed.ext}`);

  if (path.resolve(newPath) === oldPath) {
    return { renamed: false, oldPath, newPath: oldPath };
  }

  const targetAllowed = validateLocalPathAllowed(newPath, cfg.localAllowedBases);
  if (!targetAllowed.ok) throw new Error(targetAllowed.reason);
  if (fs.existsSync(newPath)) throw new Error("A file with that name already exists");

  const oldTrack = getTracklistPaths(oldPath);
  const newTrack = getTracklistPaths(newPath);
  const oldBrTags = getBrMediaSidecarPathForFile(oldPath);
  const newBrTags = getBrMediaSidecarPathForFile(newPath);

  fs.renameSync(oldPath, newPath);

  moveSidecarIfExists(oldTrack.txtPath, newTrack.txtPath);
  moveSidecarIfExists(oldTrack.jsonPath, newTrack.jsonPath);
  moveSidecarIfExists(oldTrack.cuePath, newTrack.cuePath);
  moveSidecarIfExists(oldBrTags, newBrTags);

  item.locator = newPath;
  item.title = item.title || safeBase;
  try {
    item.sizeBytes = fs.statSync(newPath).size;
  } catch {}

  return { renamed: true, oldPath, newPath };
}

function quickEditAudioLibraryItem(id: string, body: any) {
  const item = getLibraryItem(id);
  if (!item) return { ok: false, status: 404, error: "Track not found" };
  if (item.source !== "local") return { ok: false, status: 501, error: "Save a local copy before quick editing this cloud-linked item" };

  const allowed = validateLocalPathAllowed(item.locator, cfg.localAllowedBases);
  if (!allowed.ok) return { ok: false, status: 403, error: allowed.reason };
  if (!fs.existsSync(item.locator)) return { ok: false, status: 404, error: "Audio file missing" };

  let renameResult = { renamed: false, oldPath: item.locator, newPath: item.locator };

  try {
    const requestedFileName = firstString(body?.fileName);
    if (requestedFileName) {
      renameResult = renameAudioFileAndSidecarsForQuickEdit(item as any, requestedFileName);
    }

    const title = firstString(body?.title);
    const artist = firstString(body?.artist);
    const album = firstString(body?.album);
    const genre = firstString(body?.genre);
    const yearText = firstString(body?.year);

    if (title) item.title = title;
    if (artist !== null) (item as any).artist = artist || "";
    if (album !== null) (item as any).album = album || "";
    if (genre !== null) (item as any).genre = genre || "";
    if (yearText !== null) {
      const yearNumber = Number(yearText);
      (item as any).year = Number.isFinite(yearNumber) && yearNumber > 0 ? yearNumber : null;
    }

    const tags = normaliseBrMediaCustomTags({
      ...(body?.brmediaTags || {}),
      title: title || item.title,
      artist,
      album,
      genre,
      year: yearText,
    });

    const tagResult = saveBrMediaCustomTags({
      trackId: item.id,
      locator: item.locator,
      tags,
    });

    persistAudioLibraryManifest();

    return {
      ok: true,
      item,
      tags: tagResult.tags,
      renamed: renameResult.renamed,
      oldPath: renameResult.oldPath,
      newPath: renameResult.newPath,
    };
  } catch (err: any) {
    return { ok: false, status: 400, error: String(err?.message || err) };
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

type MobileUploadTarget =
  | "auto"
  | "audio"
  | "video"
  | "support";
	
const MOBILE_UPLOAD_SUPPORT_EXTENSIONS = new Set([
  ".txt",
  ".cue",
  ".json",
  ".m3u",
  ".m3u8",
  ".pls",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".srt",
  ".vtt",
]);

const MOBILE_UPLOAD_TRACKLIST_EXTENSIONS = new Set([
  ".txt",
  ".cue",
  ".json",
]);

function getMobileUploadSupportType(filePath: string) {
  const ext =
    path
      .extname(filePath)
      .toLowerCase();

  if (MOBILE_UPLOAD_TRACKLIST_EXTENSIONS.has(ext)) {
    return "tracklist";
  }

  if ([".m3u", ".m3u8", ".pls"].includes(ext)) {
    return "playlist";
  }

  if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
    return "artwork";
  }

  if ([".srt", ".vtt"].includes(ext)) {
    return "subtitle";
  }

  return MOBILE_UPLOAD_SUPPORT_EXTENSIONS.has(ext)
    ? "support"
    : "";
}

function isMobileUploadTracklistFile(filePath: string) {
  return getMobileUploadSupportType(filePath) === "tracklist";
}

function normaliseMobileUploadTarget(
  value: unknown
): MobileUploadTarget {
  const target =
    String(value || "auto")
      .trim()
      .toLowerCase();

  if (target === "audio") {
    return "audio";
  }

  if (target === "video") {
    return "video";
  }

  if (target === "support") {
    return "support";
  }

  return "auto";
}

function inferMobileUploadKind(
  filePath: string,
  requestedTarget: unknown = "auto"
): Exclude<MobileUploadTarget, "auto"> {
  const target =
    normaliseMobileUploadTarget(
      requestedTarget
    );

  const audio =
    isSupportedAudioFile(filePath);

  const video =
    isSupportedVideoFile(filePath);

  const supportType =
    getMobileUploadSupportType(filePath);

  if (target === "audio") {
    if (!audio) {
      throw new Error("Audio uploads only accept supported audio files such as MP3, WAV, FLAC, M4A, AAC, OGG or OPUS.");
    }

    return "audio";
  }

  if (target === "video") {
    if (!video) {
      throw new Error("Video uploads only accept supported video files such as MP4, MOV, MKV, WEBM, AVI, M4V, WMV, VOB, MPG or MPEG.");
    }

    return "video";
  }

  if (target === "support") {
    if (!supportType) {
      throw new Error("Supporting files only accept tracklists, cue sheets, timestamp JSON, playlists, artwork or subtitle files.");
    }

    return "support";
  }

  if (audio) {
    return "audio";
  }

  if (video) {
    return "video";
  }

  if (supportType) {
    return "support";
  }

  throw new Error("Unsupported upload file type. Choose audio, video, a tracklist, cue sheet, timestamp JSON, playlist, artwork or subtitle file.");
}

function getMobileUploadDir(
  targetRaw: unknown = "support"
) {
  const normalisedTarget =
    normaliseMobileUploadTarget(
      targetRaw
    );

  const target =
    normalisedTarget === "auto"
      ? "support"
      : normalisedTarget;

  const preferredBase =
    target === "video"
      ? getDefaultLibrarySourcePath("video")
      : getDefaultLibrarySourcePath("audio") ||
        (
          Array.isArray(
            cfg.localAllowedBases
          )
            ? cfg.localAllowedBases[0]
            : ""
        );

  const fallbackBase =
    path.join(
      __dirname,
      "..",
      ".uploads",
      "mobile"
    );

  const base =
    preferredBase ||
    fallbackBase;

  const folder =
    target === "video"
      ? "Video"
      : target === "audio"
        ? "Audio"
        : "Support";

  const dir =
    path.join(
      base,
      "BRMedia Uploads",
      folder
    );

  ensureDirSyncServer(dir);

  return dir;
}

function uniqueMobileUploadPath(
  dir: string,
  fileName: string
) {
  const initial =
    path.join(
      dir,
      fileName
    );

  if (!fs.existsSync(initial)) {
    return initial;
  }

  const parsed =
    path.parse(fileName);

  for (
    let index = 2;
    index < 10000;
    index += 1
  ) {
    const candidate =
      path.join(
        dir,
        `${parsed.name}_${index}${parsed.ext}`
      );

    if (!fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return path.join(
    dir,
    `${parsed.name}_${Date.now()}${parsed.ext}`
  );
}

function encodeMobileSupportFileId(filePath: string) {
  return Buffer
    .from(path.resolve(filePath), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeMobileSupportFileId(idRaw: string) {
  try {
    const base64 =
      String(idRaw || "")
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    return path.resolve(
      Buffer
        .from(base64, "base64")
        .toString("utf8")
    );
  } catch {
    return "";
  }
}

function isMobileSupportFilePathAllowed(filePath: string) {
  const supportRoot =
    path.resolve(
      getMobileUploadDir("support")
    );

  const resolved =
    path.resolve(filePath);

  const relative =
    path.relative(
      supportRoot,
      resolved
    );

  return !!relative &&
    !relative.startsWith("..") &&
    !path.isAbsolute(relative);
}

function getMobileSupportFileItem(filePath: string) {
  const resolved =
    path.resolve(filePath);

  if (
    !isMobileSupportFilePathAllowed(resolved) ||
    !fs.existsSync(resolved)
  ) {
    return null;
  }

  let stat: fs.Stats;

  try {
    stat = fs.statSync(resolved);
  } catch {
    return null;
  }

  if (!stat.isFile()) {
    return null;
  }

  const supportType =
    getMobileUploadSupportType(resolved);

  if (!supportType) {
    return null;
  }

  const supportRoot =
    path.resolve(
      getMobileUploadDir("support")
    );

  const id =
    encodeMobileSupportFileId(resolved);

  return {
    id,
    name: path.basename(resolved),
    fileName: path.basename(resolved),
    locator: resolved,
    folder:
      path.relative(
        supportRoot,
        path.dirname(resolved)
      ) || "Support",
    extension:
      path
        .extname(resolved)
        .replace(/^\./, "")
        .toLowerCase(),
    supportType,
    sizeBytes: stat.size,
    modifiedAt: stat.mtimeMs,
    downloadUrl:
      `/library/support-files/${encodeURIComponent(id)}/download`,
  };
}

function listMobileSupportFiles() {
  const supportRoot =
    path.resolve(
      getMobileUploadDir("support")
    );

  const items: any[] = [];

  const visit = (folder: string, depth = 0) => {
    if (depth > 8) return;

    let entries: fs.Dirent[] = [];

    try {
      entries =
        fs.readdirSync(
          folder,
          { withFileTypes: true }
        );
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath =
        path.join(
          folder,
          entry.name
        );

      if (entry.isDirectory()) {
        visit(fullPath, depth + 1);
        continue;
      }

      if (!entry.isFile()) continue;

      const item =
        getMobileSupportFileItem(fullPath);

      if (item) {
        items.push(item);
      }
    }
  };

  visit(supportRoot);

  return items.sort(
    (a, b) =>
      Number(b.modifiedAt || 0) -
      Number(a.modifiedAt || 0)
  );
}

function findMobileSupportFileById(idRaw: string) {
  const filePath =
    decodeMobileSupportFileId(idRaw);

  if (!filePath) return null;

  return getMobileSupportFileItem(filePath);
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
      await addLocalFileToLibraryWithMetadata(locator);
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

      if (restoreWaveformCache(locator, count, duration, peaks, entry?.bands)) {
        restored.waveforms += 1;
      }
    }
  }

  return restored;
}

async function handleMobileUpload(
  files: any[],
  targetRaw: unknown = "auto"
) {
  const addedAudioItems: any[] = [];
  const savedPaths: string[] = [];

  let videoUploadCount = 0;
  let savedFiles = 0;

  for (const rawFile of files) {
    const fileName =
      safeUploadFilename(
        firstString(rawFile?.name) ||
        "upload.bin"
      );

    const kind =
      inferMobileUploadKind(
        fileName,
        rawFile?.target || targetRaw
      );

    const uploadDir =
      getMobileUploadDir(kind);

    const targetPath =
      uniqueMobileUploadPath(
        uploadDir,
        fileName
      );

    const buffer =
      decodeBase64FilePayload(
        rawFile?.base64
      );

    fs.writeFileSync(
      targetPath,
      buffer
    );

    savedFiles += 1;
    savedPaths.push(targetPath);

    if (
      kind === "support" &&
      isMobileUploadTracklistFile(targetPath)
    ) {
      invalidateTracklistAttachmentFilesCache();
    }

    if (
      kind === "audio" &&
      isSupportedAudioFile(targetPath) &&
      !findLibraryItemByLocator(targetPath)
    ) {
      const item =
        await addLocalFileToLibraryWithMetadata(targetPath);

      addedAudioItems.push(item);
    }

    if (
      kind === "video" &&
      isSupportedVideoFile(targetPath)
    ) {
      videoUploadCount += 1;
    }
  }

  if (addedAudioItems.length) {
    void queueWaveformGenerationForItems(
      addedAudioItems,
      {
        peakCount: DEFAULT_WAVEFORM_PEAKS,
        onlyMissing: true,
      }
    );
  }

  if (videoUploadCount) {
    scanVideoLibrary();
  }

  return {
    savedFiles,
    addedItems:
      addedAudioItems.length +
      videoUploadCount,
    audioItems: addedAudioItems.length,
    videoItems: videoUploadCount,
    savedPaths,
  };
}

async function handleSingleMobileUpload(
  fileNameRaw: string,
  buffer: Buffer,
  targetRaw: unknown = "auto"
) {
  const fileName =
    safeUploadFilename(
      fileNameRaw ||
      "upload.bin"
    );

  const kind =
    inferMobileUploadKind(
      fileName,
      targetRaw
    );

  const uploadDir =
    getMobileUploadDir(kind);

  const targetPath =
    uniqueMobileUploadPath(
      uploadDir,
      fileName
    );

  fs.writeFileSync(
    targetPath,
    buffer
  );

  let item: any = null;

  const supportType =
    kind === "support"
      ? getMobileUploadSupportType(
          targetPath
        )
      : "";

  const supportItem =
    kind === "support"
      ? getMobileSupportFileItem(
          targetPath
        )
      : null;

  if (
    supportType === "tracklist"
  ) {
    invalidateTracklistAttachmentFilesCache();
  }

  if (
    kind === "audio" &&
    isSupportedAudioFile(targetPath)
  ) {
    item =
      findLibraryItemByLocator(
        targetPath
      ) ||
      await addLocalFileToLibraryWithMetadata(
        targetPath
      );

    void queueWaveformGenerationForItems(
      [item],
      {
        peakCount: DEFAULT_WAVEFORM_PEAKS,
        onlyMissing: true,
      }
    );
  }

  if (
    kind === "video" &&
    isSupportedVideoFile(targetPath)
  ) {
    const items =
      scanVideoLibrary();

    const resolved =
      path
        .resolve(targetPath)
        .toLowerCase();

    item =
      items.find(
        (entry: any) =>
          path
            .resolve(
              String(
                entry?.locator ||
                ""
              )
            )
            .toLowerCase() === resolved
      ) ||
      null;
  }

  return {
    savedFiles: 1,
    addedItems:
      item
        ? 1
        : 0,
    kind,
    supportType,
    supportItem,
    tracklistReady:
      supportType === "tracklist",
    savedPath: targetPath,
    savedName:
      path.basename(targetPath),
    item,
    openUrl:
      item?.id
        ? kind === "video"
          ? `/video-player?videoId=${encodeURIComponent(item.id)}`
          : `/player?trackId=${encodeURIComponent(item.id)}`
        : "",
    viewFilesUrl:
      item?.id && kind === "audio"
        ? `/settings?module=cloud&tab=files&kind=audio&trackId=${encodeURIComponent(item.id)}`
        : item?.id && kind === "video"
          ? `/settings?module=cloud&tab=files&kind=video&videoId=${encodeURIComponent(item.id)}`
          : supportItem?.id
            ? `/settings?module=cloud&tab=files&kind=support&supportId=${encodeURIComponent(supportItem.id)}`
            : "/settings?module=cloud&tab=files",
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

  const videoId = firstString(body?.source?.videoId || body?.videoId);
  if (videoId) {
    const video = getVideoItem(videoId);
    if (!video) return { ok: false, error: "Selected video not found" };
    if (!validateVideoPathAllowed(video.locator)) return { ok: false, error: "Video path is not allowed" };
    if (!fs.existsSync(video.locator)) return { ok: false, error: "Video file missing" };
    return { ok: true, path: video.locator, title: video.title || path.basename(video.locator), source: video };
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

function readFfmpegProgressValue(line: string, key: string) {
  const match = String(line || "").match(new RegExp(`(?:^|\\s)${key}=\\s*([^\\s]+)`, "i"));
  return match?.[1]?.trim() || "";
}

function getFfmpegProgressLine(text: string) {
  const lines = String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return [...lines].reverse().find((line) => /(?:^|\s)(frame|size|time|bitrate|speed|elapsed)=/i.test(line)) || "";
}

function applyCleanFfmpegProgress(job: any, text: string, message: string) {
  job.technicalLog = `${String(job.technicalLog || "")}${String(text || "")}`.slice(-16000);

  const line = getFfmpegProgressLine(text);
  if (!line) return;

  const progress = {
    raw: line.slice(0, 1000),
    frame: readFfmpegProgressValue(line, "frame"),
    fps: readFfmpegProgressValue(line, "fps"),
    size: readFfmpegProgressValue(line, "size"),
    time: readFfmpegProgressValue(line, "time"),
    bitrate: readFfmpegProgressValue(line, "bitrate"),
    speed: readFfmpegProgressValue(line, "speed"),
    elapsed: readFfmpegProgressValue(line, "elapsed"),
    updatedAt: Date.now(),
  };

  job.ffmpegProgress = {
    ...(job.ffmpegProgress || {}),
    ...progress,
  };

  job.message = message;
}

function cleanPublicFfmpegError(value: any, fallback: string) {
  const text = String(value?.message || value || "").trim();
  if (!text) return fallback;

  if (
    /(?:^|\s)(frame|fps|q|size|time|bitrate|speed|elapsed)=/i.test(text) ||
    /ffmpeg version|configuration:|libav|Stream #|Press \[q\]|Error while|Invalid data found/i.test(text)
  ) {
    return fallback;
  }

  return text.slice(0, 220);
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

      applyCleanFfmpegProgress(job, text, "Converting media…");
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
    job.message = "Conversion started.";
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
      libraryItem = await addLocalFileToLibraryWithMetadata(job.outputPath);

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

    appendStatsEvent("converter_job_done", "converter", {
      entityType: "job",
      entityId: job.id,
      title: job.sourceTitle,
      status: "done",
      route: "converter",
      value: Number(job.sizeBytes || 0),
    });
  } catch (err: any) {
    const wasCancelled = !!job.cancelRequested;
    job.status = wasCancelled ? "cancelled" : "error";
    job.error = wasCancelled ? "" : cleanPublicFfmpegError(err, "Conversion failed. Open the technical log for details.");
    job.debugMessage = wasCancelled ? "" : String(err?.message || err);
    job.message = wasCancelled ? "Conversion cancelled. Partial output was removed." : job.error;
    job.process = null;

    try {
      if (job.outputPath && fs.existsSync(job.outputPath)) {
        fs.unlinkSync(job.outputPath);
      }
    } catch {}

    CONVERTER_JOBS.set(job.id, job);

    appendStatsEvent(
      wasCancelled
        ? "converter_job_cancelled"
        : "converter_job_error",
      "converter",
      {
        entityType: "job",
        entityId: job.id,
        title: job.sourceTitle,
        status: job.status,
        route: "converter",
      }
    );
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

  appendStatsEvent("converter_job_started", "converter", {
    entityType: "job",
    entityId: id,
    title: source.title,
    status: "queued",
    route: "converter",
  });

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
    ffmpegProgress: job.ffmpegProgress,
    technicalLog: job.technicalLog,
    debugMessage: job.debugMessage,
    createdAt: job.createdAt,
  };
}

function listPublicConverterJobs() {
  return Array.from(CONVERTER_JOBS.values())
    .map((job: any) => getPublicConverterJob(String(job.id || "")))
    .filter((job: any) => !!job)
    .sort((a: any, b: any) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
    .slice(0, 60);
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

function clampMasteringNumber(value: any, min: number, max: number, fallback = 0) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return String(fallback);
  return String(Math.max(min, Math.min(max, raw)));
}

function clampMasteringNumberValue(value: any, min: number, max: number, fallback = 0) {
  return Number(clampMasteringNumber(value, min, max, fallback));
}

function calculateBpmTargetPercent(sourceBpmRaw: any, targetBpmRaw: any) {
  const sourceBpm = Number(sourceBpmRaw);
  const targetBpm = Number(targetBpmRaw);
  if (!Number.isFinite(sourceBpm) || !Number.isFinite(targetBpm) || sourceBpm <= 0 || targetBpm <= 0) return null;
  const percent = ((targetBpm / sourceBpm) - 1) * 100;
  if (!Number.isFinite(percent)) return null;
  return Math.max(-50, Math.min(50, percent));
}

function normaliseMasteringOptions(body: any) {
  const outputFormat = normaliseConverterChoice(body?.outputFormat, ["mp3", "wav", "flac", "m4a"], "wav");
  const outputBitrate = normaliseConverterChoice(body?.outputBitrate, ["64k", "96k", "128k", "160k", "192k", "256k", "320k"], "320k");
  const sampleRate = normaliseConverterChoice(body?.sampleRate, ["", "44100", "48000", "88200", "96000"], "");
  const channels = normaliseConverterChoice(body?.channels, ["", "1", "2"], "");
  const wavBitDepth = normaliseConverterChoice(body?.wavBitDepth, ["16", "24", "32"], "24");
  const flacCompression = normaliseConverterChoice(body?.flacCompression, ["0", "5", "8"], "8");
  const targetLufs = normaliseConverterChoice(body?.targetLufs, ["-16", "-14", "-12", "-10", "-9"], "-14");
  const truePeak = normaliseConverterChoice(body?.truePeak, ["-2", "-1.5", "-1", "-0.6"], "-1.5");
  const previewLengthSeconds = Number(clampMasteringNumber(body?.previewLengthSeconds, 0, 45, 0));
  const sourceBpm = clampMasteringNumberValue(body?.sourceBpm, 0, 300, 0);
  const targetBpm = clampMasteringNumberValue(body?.targetBpm, 0, 300, 0);
  const bpmControlMode = normaliseConverterChoice(body?.bpmControlMode, ["percent", "target"], targetBpm > 0 ? "target" : "percent");
  const targetPercent = calculateBpmTargetPercent(sourceBpm, targetBpm);
  const bpmChangePercent = bpmControlMode === "target" && targetPercent !== null
    ? String(Number(targetPercent.toFixed(4)))
    : clampMasteringNumber(body?.bpmChangePercent, -50, 50, 0);

  return {
    outputFormat,
    outputBitrate,
    sampleRate,
    channels,
    wavBitDepth,
    flacCompression,
    outputName: safeMasteringToken(body?.outputName, previewLengthSeconds ? `BRMedia Preview ${previewLengthSeconds}s` : "BRMedia Master"),
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
    keyShiftSemitones: clampMasteringNumber(body?.keyShiftSemitones, -12, 12, 0),
    bpmChangePercent,
    bpmControlMode,
    sourceBpm: sourceBpm > 0 ? String(Number(sourceBpm.toFixed(2))) : "",
    targetBpm: targetBpm > 0 ? String(Number(targetBpm.toFixed(2))) : "",
    bpmMode: normaliseConverterChoice(body?.bpmMode, ["keep-pitch", "vinyl"], "keep-pitch"),
    keyTempoEngine: normaliseConverterChoice(body?.keyTempoEngine, ["safe", "rubberband"], "safe"),
    clubPunch: clampMasteringNumber(body?.clubPunch, 0, 100, 0),
    driveSaturation: clampMasteringNumber(body?.driveSaturation, 0, 100, 0),
    presenceBite: clampMasteringNumber(body?.presenceBite, 0, 100, 0),
    subWarmth: clampMasteringNumber(body?.subWarmth, 0, 100, 0),
    stereoGlue: clampMasteringNumber(body?.stereoGlue, 0, 100, 0),
    previewLengthSeconds: previewLengthSeconds >= 20 ? previewLengthSeconds : 0,
    addToLibrary: body?.addToLibrary !== false && previewLengthSeconds < 20,
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

function pushAtempoFilters(filters: string[], ratioRaw: number) {
  let ratio = Number(ratioRaw);
  if (!Number.isFinite(ratio) || Math.abs(ratio - 1) < 0.001) return;
  ratio = Math.max(0.25, Math.min(4, ratio));
  while (ratio < 0.5) {
    filters.push("atempo=0.5");
    ratio /= 0.5;
  }
  while (ratio > 2) {
    filters.push("atempo=2");
    ratio /= 2;
  }
  filters.push(`atempo=${ratio.toFixed(6)}`);
}

function addMasteringPitchTempoFilters(filters: string[], options: any) {
  const keySemitones = Number(options.keyShiftSemitones || 0);
  const bpmPercent = Number(options.bpmChangePercent || 0);
  const keyRatio = Math.pow(2, Math.max(-12, Math.min(12, keySemitones)) / 12);
  const tempoRatio = Math.max(0.5, Math.min(1.5, 1 + (Math.max(-50, Math.min(50, bpmPercent)) / 100)));
  const vinylMode = String(options.bpmMode || "keep-pitch") === "vinyl";
  const rubberbandReady = String(options.keyTempoEngine || "safe") === "rubberband" && !!options.rubberbandAvailable;

  if (rubberbandReady) {
    const rbPitchRatio = keyRatio * (vinylMode ? tempoRatio : 1);
    if (Math.abs(rbPitchRatio - 1) >= 0.001 || Math.abs(tempoRatio - 1) >= 0.001) {
      filters.push(`rubberband=tempo=${tempoRatio.toFixed(6)}:pitch=${rbPitchRatio.toFixed(6)}`);
    }
    return;
  }

  const pitchRatio = keyRatio * (vinylMode ? tempoRatio : 1);
  if (Math.abs(pitchRatio - 1) >= 0.001) {
    filters.push(`asetrate=${Math.round(44100 * pitchRatio)},aresample=44100`);
  }

  let tempoCorrection = Math.abs(keyRatio - 1) >= 0.001 ? (1 / keyRatio) : 1;
  if (!vinylMode) tempoCorrection *= tempoRatio;
  pushAtempoFilters(filters, tempoCorrection);
}

function addMasteringPluginFilters(filters: string[], options: any, scale: number) {
  const percent = (key: string) => Math.max(0, Math.min(100, Number(options[key] || 0))) / 100;
  const clubPunch = percent("clubPunch");
  const drive = percent("driveSaturation");
  const presence = percent("presenceBite");
  const subWarmth = percent("subWarmth");
  const stereoGlue = percent("stereoGlue");

  if (subWarmth > 0) {
    filters.push(`equalizer=f=58:t=q:w=0.9:g=${(subWarmth * 3.0 * scale).toFixed(2)}`);
    filters.push(`equalizer=f=135:t=q:w=1.1:g=${(subWarmth * 1.8 * scale).toFixed(2)}`);
  }

  if (clubPunch > 0) {
    filters.push(`equalizer=f=82:t=q:w=1.0:g=${(clubPunch * 3.2 * scale).toFixed(2)}`);
    filters.push(`equalizer=f=180:t=q:w=0.9:g=${(clubPunch * 1.6 * scale).toFixed(2)}`);
    filters.push(`acompressor=threshold=-22dB:ratio=${(1.5 + clubPunch).toFixed(2)}:attack=5:release=80:makeup=${(clubPunch * 1.2).toFixed(2)}`);
  }

  if (drive > 0) {
    filters.push(`volume=${(drive * 1.8).toFixed(2)}dB`);
    filters.push(`acompressor=threshold=-14dB:ratio=${(1.4 + drive).toFixed(2)}:attack=3:release=90:makeup=0`);
  }

  if (presence > 0) {
    filters.push(`equalizer=f=2600:t=q:w=1.1:g=${(presence * 2.2 * scale).toFixed(2)}`);
    filters.push(`equalizer=f=4300:t=q:w=1.0:g=${(presence * 1.5 * scale).toFixed(2)}`);
  }

  if (stereoGlue > 0) {
    filters.push(`acompressor=threshold=-18dB:ratio=${(1.2 + stereoGlue * 0.5).toFixed(2)}:attack=12:release=130:makeup=0`);
    filters.push(`extrastereo=m=${(1 + stereoGlue * 0.16).toFixed(3)}`);
  }
}

function buildMasteringFilters(options: any) {
  const scale = getMasteringIntensityScale(String(options.intensity || "50"));
  const lowCut = normaliseConverterChoice(options.lowCut, ["20", "30", "40"], "20");
  const filters: string[] = [];

  addMasteringPitchTempoFilters(filters, options);
  filters.push(`highpass=f=${lowCut}`, "lowpass=f=20000");
  addMasteringPluginFilters(filters, options, scale);

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

function appendMasteringOutputCodec(args: string[], options: any) {
  const format = String(options.outputFormat || "wav");
  const bitrate = String(options.outputBitrate || "320k");
  const sampleRate = String(options.sampleRate || "");
  const channels = String(options.channels || "");
  const wavBitDepth = String(options.wavBitDepth || "24");
  const flacCompression = String(options.flacCompression || "8");

  if (sampleRate) args.push("-ar", sampleRate);
  if (channels) args.push("-ac", channels);

  if (format === "wav") {
    if (wavBitDepth === "16") args.push("-c:a", "pcm_s16le");
    else if (wavBitDepth === "32") args.push("-c:a", "pcm_f32le");
    else args.push("-c:a", "pcm_s24le");
    return;
  }

  if (format === "flac") {
    args.push("-c:a", "flac", "-compression_level", flacCompression);
    return;
  }

  if (format === "m4a") {
    args.push("-c:a", "aac", "-b:a", bitrate);
    return;
  }

  args.push("-c:a", "libmp3lame", "-b:a", bitrate);
}

function buildMasteringArgs(inputPath: string, outputPath: string, options: any) {
  const args = ["-y", "-i", inputPath];
  if (Number(options.previewLengthSeconds || 0) >= 20) args.push("-t", String(options.previewLengthSeconds));
  if (options.preserveMetadata) args.push("-map_metadata", "0");
  args.push("-vn", "-af", buildMasteringFilters(options));
  appendMasteringOutputCodec(args, options);
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
      applyCleanFfmpegProgress(
        job,
        text,
        job.previewLengthSeconds ? "Rendering BRMedia mastering preview…" : "Rendering mastered audio…"
      );
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

let MASTERING_RUBBERBAND_AVAILABLE: boolean | null = null;

function checkFfmpegRubberbandAvailable() {
  if (MASTERING_RUBBERBAND_AVAILABLE !== null) return Promise.resolve(MASTERING_RUBBERBAND_AVAILABLE);
  return new Promise<boolean>((resolve) => {
    const ffmpeg = spawn(resolvePreviewFfmpegPath(), ["-hide_banner", "-filters"], { windowsHide: true });
    let output = "";
    const finish = (available: boolean) => {
      MASTERING_RUBBERBAND_AVAILABLE = available;
      resolve(available);
    };
    ffmpeg.stdout.on("data", (chunk) => {
      output += String(chunk || "");
      if (output.length > 250000) output = output.slice(-250000);
    });
    ffmpeg.stderr.on("data", (chunk) => {
      output += String(chunk || "");
      if (output.length > 250000) output = output.slice(-250000);
    });
    ffmpeg.on("error", () => finish(false));
    ffmpeg.on("close", () => finish(/\brubberband\b/i.test(output)));
  });
}

async function runMasteringJob(job: any, inputPath: string, options: any) {
  try {
    job.status = "running";
    job.message = options.previewLengthSeconds ? `Starting ${options.previewLengthSeconds}s mastering preview…` : "Starting mastering render…";
    MASTERING_JOBS.set(job.id, job);

    const args = buildMasteringArgs(inputPath, job.outputPath, options);
    job.ffmpegArgs = args;
    await runMasteringFfmpeg(args, job);

    if (!fs.existsSync(job.outputPath)) throw new Error("Mastered file was not created");
    const stat = fs.statSync(job.outputPath);
    if (!stat.isFile() || stat.size < 64) throw new Error("Mastered file looks empty");

    let libraryItem: any = null;
    if (options.addToLibrary && isSupportedAudioFile(job.outputPath) && !findLibraryItemByLocator(job.outputPath)) {
      libraryItem = await addLocalFileToLibraryWithMetadata(job.outputPath);
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
      : options.previewLengthSeconds
        ? `${options.previewLengthSeconds}s preview render complete. Download is ready.`
        : "Mastering complete. Download is ready.";
    MASTERING_JOBS.set(job.id, job);

    appendStatsEvent("mastering_job_done", "mastering", {
      entityType: "job",
      entityId: job.id,
      title: job.sourceTitle,
      status: "done",
      route: "mastering",
      value: Number(job.sizeBytes || 0),
    });
  } catch (err: any) {
    const wasCancelled = !!job.cancelRequested;
    job.status = wasCancelled ? "cancelled" : "error";
    job.error = wasCancelled ? "" : cleanPublicFfmpegError(err, "Mastering failed. Open the technical log for details.");
    job.debugMessage = wasCancelled ? "" : String(err?.message || err);
    job.message = wasCancelled ? "Mastering cancelled. Partial output was removed." : job.error;
    job.process = null;

    try {
      if (job.outputPath && fs.existsSync(job.outputPath)) fs.unlinkSync(job.outputPath);
    } catch {}

    MASTERING_JOBS.set(job.id, job);

    appendStatsEvent(
      wasCancelled
        ? "mastering_job_cancelled"
        : "mastering_job_error",
      "mastering",
      {
        entityType: "job",
        entityId: job.id,
        title: job.sourceTitle,
        status: job.status,
        route: "mastering",
      }
    );
  }
}

function parseLastNumberMatch(text: string, regex: RegExp) {
  const matches = [...String(text || "").matchAll(regex)];
  if (!matches.length) return null;
  const raw = matches[matches.length - 1]?.[1];
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function clampMasteringAnalysisStart(meta: any) {
  const duration = Number(meta?.duration || 0);
  if (!Number.isFinite(duration) || duration <= 75) return 0;
  if (duration > 300) return 60;
  if (duration > 160) return 35;
  return 15;
}

function runMasteringPcmSample(inputPath: string, meta: any) {
  return new Promise<Int16Array>((resolve, reject) => {
    const startAt = clampMasteringAnalysisStart(meta);
    const duration = Number(meta?.duration || 0);
    const sampleSeconds = duration > 0 ? Math.max(20, Math.min(60, duration - startAt)) : 45;
    const args = [
      "-hide_banner",
      "-nostats",
      "-ss",
      String(Math.max(0, startAt)),
      "-t",
      String(Math.max(20, sampleSeconds)),
      "-i",
      inputPath,
      "-vn",
      "-ac",
      "1",
      "-ar",
      "11025",
      "-f",
      "s16le",
      "pipe:1",
    ];

    const ffmpeg = spawn(resolvePreviewFfmpegPath(), args, { windowsHide: true });
    const chunks: Buffer[] = [];
    let stderr = "";
    const timeout = setTimeout(() => {
      try {
        ffmpeg.kill("SIGTERM");
      } catch {}
      reject(new Error("BPM/key analysis timed out"));
    }, 4 * 60 * 1000);

    ffmpeg.stdout.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    ffmpeg.stderr.on("data", (chunk) => {
      stderr += String(chunk || "");
      if (stderr.length > 24000) stderr = stderr.slice(-24000);
    });
    ffmpeg.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
    ffmpeg.on("close", (code: number | null) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(stderr.trim() || `ffmpeg BPM/key analysis exited ${code}`));
        return;
      }
      const buffer = Buffer.concat(chunks);
      const samples = new Int16Array(Math.floor(buffer.length / 2));
      for (let i = 0; i < samples.length; i += 1) samples[i] = buffer.readInt16LE(i * 2);
      resolve(samples);
    });
  });
}

function estimateBpmFromPcm(samples: Int16Array, sampleRate = 11025) {
  const frame = 1024;
  const hop = 512;
  if (!samples || samples.length < frame * 16) return null;

  const energies: number[] = [];
  for (let offset = 0; offset + frame < samples.length; offset += hop) {
    let sum = 0;
    for (let i = 0; i < frame; i += 1) {
      const v = samples[offset + i] / 32768;
      sum += v * v;
    }
    energies.push(Math.sqrt(sum / frame));
  }

  const flux: number[] = [];
  for (let i = 1; i < energies.length; i += 1) flux.push(Math.max(0, energies[i] - energies[i - 1]));
  const mean = flux.reduce((sum, value) => sum + value, 0) / Math.max(1, flux.length);
  const signal = flux.map((value) => Math.max(0, value - mean * 0.72));
  const hopSeconds = hop / sampleRate;
  let best = { bpm: 0, score: 0 };
  let second = { bpm: 0, score: 0 };

  for (let bpm = 80; bpm <= 200; bpm += 0.5) {
    const lag = Math.max(1, Math.round((60 / bpm) / hopSeconds));
    let score = 0;
    let count = 0;
    for (let i = lag; i < signal.length; i += 1) {
      score += signal[i] * signal[i - lag];
      count += 1;
    }
    score = count ? score / count : 0;
    if (score > best.score) {
      second = best;
      best = { bpm, score };
    } else if (score > second.score) {
      second = { bpm, score };
    }
  }

  if (!best.bpm || best.score <= 0) return null;
  const confidence = Math.max(0, Math.min(1, second.score > 0 ? (best.score - second.score) / best.score : 0.75));
  return { bpm: Number(best.bpm.toFixed(1)), confidence: Number(confidence.toFixed(2)) };
}

function estimateKeyFromPcm(samples: Int16Array, sampleRate = 11025) {
  if (!samples || samples.length < sampleRate * 8) return null;
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
  const chroma = new Array(12).fill(0);
  const step = 4096;
  const frame = 4096;
  const maxFrames = 180;
  let analysed = 0;

  for (let offset = 0; offset + frame < samples.length && analysed < maxFrames; offset += step) {
    let rms = 0;
    for (let i = 0; i < frame; i += 1) {
      const v = samples[offset + i] / 32768;
      rms += v * v;
    }
    rms = Math.sqrt(rms / frame);
    if (rms < 0.008) continue;

    for (let midi = 36; midi <= 83; midi += 1) {
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      const w = 2 * Math.PI * freq / sampleRate;
      const coeff = 2 * Math.cos(w);
      let q0 = 0;
      let q1 = 0;
      let q2 = 0;
      for (let i = 0; i < frame; i += 1) {
        q0 = coeff * q1 - q2 + (samples[offset + i] / 32768);
        q2 = q1;
        q1 = q0;
      }
      const power = q1 * q1 + q2 * q2 - coeff * q1 * q2;
      chroma[midi % 12] += Math.max(0, power);
    }
    analysed += 1;
  }

  const total = chroma.reduce((sum, value) => sum + value, 0);
  if (!total) return null;
  const norm = chroma.map((value) => value / total);
  let best = { key: "", score: -Infinity };
  let second = { key: "", score: -Infinity };

  const scoreProfile = (root: number, profile: number[]) => profile.reduce((sum, weight, index) => sum + norm[(root + index) % 12] * weight, 0);
  for (let root = 0; root < 12; root += 1) {
    const majorScore = scoreProfile(root, majorProfile);
    const minorScore = scoreProfile(root, minorProfile);
    for (const candidate of [
      { key: `${noteNames[root]} major`, score: majorScore },
      { key: `${noteNames[root]} minor`, score: minorScore },
    ]) {
      if (candidate.score > best.score) {
        second = best;
        best = candidate;
      } else if (candidate.score > second.score) {
        second = candidate;
      }
    }
  }

  const confidence = Math.max(0, Math.min(1, (best.score - second.score) / Math.max(0.0001, best.score)));
  return { key: best.key, confidence: Number(confidence.toFixed(2)) };
}

async function estimateMasteringTempoKey(inputPath: string, meta: any) {
  const metadataBpm = Number(meta?.bpm || 0);
  const metadataKey = firstString(meta?.key || meta?.initialKey || "");
  let estimatedBpm: any = null;
  let estimatedKey: any = null;

  try {
    const samples = await runMasteringPcmSample(inputPath, meta);
    estimatedBpm = estimateBpmFromPcm(samples);
    estimatedKey = estimateKeyFromPcm(samples);
  } catch {}

  return {
    bpm: Number.isFinite(metadataBpm) && metadataBpm > 0 ? metadataBpm : estimatedBpm?.bpm || null,
    key: metadataKey || estimatedKey?.key || "",
    bpmConfidence: Number.isFinite(metadataBpm) && metadataBpm > 0 ? 1 : estimatedBpm?.confidence || 0,
    keyConfidence: metadataKey ? 1 : estimatedKey?.confidence || 0,
    bpmSource: Number.isFinite(metadataBpm) && metadataBpm > 0 ? "metadata" : estimatedBpm ? "estimated" : "unknown",
    keySource: metadataKey ? "metadata" : estimatedKey ? "estimated" : "unknown",
  };
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
      bpm: typeof meta.common?.bpm === "number" ? meta.common.bpm : Number(firstString((meta.common as any)?.bpm || "")) || null,
      key: firstString((meta.common as any)?.key || (meta.common as any)?.initialKey || ""),
      initialKey: firstString((meta.common as any)?.initialKey || ""),
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
  const tempoKey = await estimateMasteringTempoKey(source.path, meta);
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
      tempoKey,
      warnings,
      recommendation,
    },
  };
}

async function startMasteringJob(body: any) {
  const source = getMasteringSource(body || {});
  if (!source.ok) return source;

  const options: any = normaliseMasteringOptions(body || {});
  options.rubberbandAvailable = options.keyTempoEngine === "rubberband" ? await checkFfmpegRubberbandAvailable() : false;
  options.keyTempoEngineUsed = options.rubberbandAvailable ? "rubberband" : "safe";
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
    keyShiftSemitones: options.keyShiftSemitones,
    bpmChangePercent: options.bpmChangePercent,
    bpmControlMode: options.bpmControlMode,
    sourceBpm: options.sourceBpm,
    targetBpm: options.targetBpm,
    bpmMode: options.bpmMode,
    keyTempoEngine: options.keyTempoEngine,
    keyTempoEngineUsed: options.keyTempoEngineUsed,
    rubberbandAvailable: options.rubberbandAvailable,
    previewLengthSeconds: options.previewLengthSeconds,
    jobKind: options.previewLengthSeconds ? "preview" : "master",
    createdAt: Date.now(),
    downloadUrl: "",
  };

  MASTERING_JOBS.set(id, job);

  appendStatsEvent("mastering_job_started", "mastering", {
    entityType: "job",
    entityId: id,
    title: source.title,
    status: "queued",
    route: "mastering",
  });

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
    keyShiftSemitones: job.keyShiftSemitones,
    bpmChangePercent: job.bpmChangePercent,
    bpmControlMode: job.bpmControlMode,
    sourceBpm: job.sourceBpm,
    targetBpm: job.targetBpm,
    bpmMode: job.bpmMode,
    keyTempoEngine: job.keyTempoEngine,
    keyTempoEngineUsed: job.keyTempoEngineUsed,
    rubberbandAvailable: job.rubberbandAvailable,
    previewLengthSeconds: job.previewLengthSeconds,
    jobKind: job.jobKind,
    sizeBytes: job.sizeBytes,
    downloadUrl: job.downloadUrl,
    libraryItem: job.libraryItem,
    ffmpegProgress: job.ffmpegProgress,
    technicalLog: job.technicalLog,
    debugMessage: job.debugMessage,
    createdAt: job.createdAt,
  };
}

function listPublicMasteringJobs() {
  return Array.from(MASTERING_JOBS.values())
    .map((job: any) => getPublicMasteringJob(String(job.id || "")))
    .filter((job: any) => !!job)
    .sort((a: any, b: any) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
    .slice(0, 60);
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

async function fetchTmdbVideoMetadata(title: string, year = "", tmdbId = "") {
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
  const tmdbImage = (imagePath: any, size = "w500") => {
    const value = firstString(imagePath);
    return value ? `https://image.tmdb.org/t/p/${size}${value}` : "";
  };

  const mapTmdbFilm = (film: any) => {
    const releaseDate = firstString(film?.release_date);
    return {
      tmdbId: String(film?.id || ""),
      imdbId: firstString(film?.imdb_id),
      title: firstString(film?.title || film?.name),
      originalTitle: firstString(film?.original_title || film?.title || film?.name),
      year: releaseDate ? releaseDate.slice(0, 4) : "",
      overview: firstString(film?.overview),
      rating: film?.vote_average ? Number(film.vote_average).toFixed(1) : "",
      posterUrl: tmdbImage(film?.poster_path, "w500"),
      backdropUrl: tmdbImage(film?.backdrop_path, "w780"),
    };
  };

  let match: any = null;

  if (tmdbId) {
    match = { id: tmdbId };
  } else {
    const search = await fetchJsonWithTimeout(`https://api.themoviedb.org/3/search/movie?${params.toString()}`, { headers });
    match = Array.isArray(search?.results) ? search.results[0] : null;
  }

  if (!match?.id) return null;

  const detailParams = new URLSearchParams({
    language: "en-GB",
    append_to_response: "credits,release_dates,external_ids,recommendations,similar,videos",
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

  const rawCast = Array.isArray(detail?.credits?.cast) ? detail.credits.cast.slice(0, 10) : [];
  const castDetails = await Promise.all(rawCast.map(async (person: any) => {
    let personDetail: any = null;

    try {
      if (person?.id) {
        const personParams = new URLSearchParams({
          language: "en-GB",
          append_to_response: "movie_credits,external_ids",
        });
        if (apiKey) personParams.set("api_key", apiKey);
        personDetail = await fetchJsonWithTimeout(`https://api.themoviedb.org/3/person/${encodeURIComponent(String(person.id))}?${personParams.toString()}`, { headers }, 6500);
      }
    } catch {}

    const knownFor = Array.isArray(personDetail?.movie_credits?.cast)
      ? personDetail.movie_credits.cast
          .filter((credit: any) => credit?.id && String(credit?.id) !== String(detail.id))
          .sort((a: any, b: any) => Number(b?.popularity || 0) - Number(a?.popularity || 0))
          .slice(0, 8)
          .map(mapTmdbFilm)
      : [];

    return {
      tmdbPersonId: String(person?.id || ""),
      imdbId: firstString(personDetail?.external_ids?.imdb_id),
      facebookId: firstString(personDetail?.external_ids?.facebook_id),
      instagramId: firstString(personDetail?.external_ids?.instagram_id),
      twitterId: firstString(personDetail?.external_ids?.twitter_id),
      homepage: firstString(personDetail?.homepage),
      birthday: firstString(personDetail?.birthday),
      deathday: firstString(personDetail?.deathday),
      placeOfBirth: firstString(personDetail?.place_of_birth),
      knownForDepartment: firstString(personDetail?.known_for_department),
      name: firstString(person?.name),
      character: firstString(person?.character),
      profileUrl: tmdbImage(person?.profile_path || personDetail?.profile_path, "w185"),
      biography: (firstString(personDetail?.biography) || "").slice(0, 720),
      knownFor,
    };
  }));

  const rawDirectors = Array.isArray(detail?.credits?.crew)
    ? detail.credits.crew.filter((person: any) => person?.job === "Director").slice(0, 4)
    : [];

  const directorDetails = await Promise.all(rawDirectors.map(async (person: any) => {
    let personDetail: any = null;

    try {
      if (person?.id) {
        const personParams = new URLSearchParams({
          language: "en-GB",
          append_to_response: "movie_credits,external_ids",
        });
        if (apiKey) personParams.set("api_key", apiKey);
        personDetail = await fetchJsonWithTimeout(`https://api.themoviedb.org/3/person/${encodeURIComponent(String(person.id))}?${personParams.toString()}`, { headers }, 6500);
      }
    } catch {}

    const directorKnownFor = Array.isArray(personDetail?.movie_credits?.crew)
      ? personDetail.movie_credits.crew
          .filter((credit: any) => credit?.id && String(credit?.id) !== String(detail.id))
          .sort((a: any, b: any) => Number(b?.popularity || 0) - Number(a?.popularity || 0))
          .slice(0, 8)
          .map(mapTmdbFilm)
      : [];

    return {
      tmdbPersonId: String(person?.id || ""),
      imdbId: firstString(personDetail?.external_ids?.imdb_id),
      facebookId: firstString(personDetail?.external_ids?.facebook_id),
      instagramId: firstString(personDetail?.external_ids?.instagram_id),
      twitterId: firstString(personDetail?.external_ids?.twitter_id),
      homepage: firstString(personDetail?.homepage),
      birthday: firstString(personDetail?.birthday),
      deathday: firstString(personDetail?.deathday),
      placeOfBirth: firstString(personDetail?.place_of_birth),
      knownForDepartment: firstString(personDetail?.known_for_department),
      name: firstString(person?.name),
      job: firstString(person?.job || "Director"),
      character: firstString(person?.job || "Director"),
      profileUrl: tmdbImage(person?.profile_path || personDetail?.profile_path, "w185"),
      biography: (firstString(personDetail?.biography) || "").slice(0, 720),
      knownFor: directorKnownFor,
    };
  }));

  let collection: any = detail?.belongs_to_collection?.id
    ? {
        tmdbId: String(detail.belongs_to_collection.id || ""),
        name: firstString(detail.belongs_to_collection.name),
        posterUrl: tmdbImage(detail.belongs_to_collection.poster_path, "w500"),
        backdropUrl: tmdbImage(detail.belongs_to_collection.backdrop_path, "w780"),
        overview: "",
      }
    : null;

  let collectionFilms: any[] = [];
  if (collection?.tmdbId) {
    try {
      const collectionParams = new URLSearchParams({ language: "en-GB" });
      if (apiKey) collectionParams.set("api_key", apiKey);
      const collectionDetail = await fetchJsonWithTimeout(`https://api.themoviedb.org/3/collection/${encodeURIComponent(String(collection.tmdbId))}?${collectionParams.toString()}`, { headers }, 6500);
      collectionFilms = Array.isArray(collectionDetail?.parts) ? collectionDetail.parts.map(mapTmdbFilm).filter((film: any) => film.tmdbId) : [];
      collection.overview = firstString(collectionDetail?.overview);
    } catch {}
  }

  const enrichTmdbFilmImdbIds = async (films: any[]) => Promise.all(
    films.filter(Boolean).slice(0, 12).map(async (film: any) => {
      if (film?.imdbId || !film?.tmdbId) return film;

      try {
        const externalParams = new URLSearchParams({});
        if (apiKey) externalParams.set("api_key", apiKey);
        const external = await fetchJsonWithTimeout(`https://api.themoviedb.org/3/movie/${encodeURIComponent(String(film.tmdbId))}/external_ids?${externalParams.toString()}`, { headers }, 4500);
        return { ...film, imdbId: firstString(external?.imdb_id) || "" };
      } catch {
        return film;
      }
    })
  );

  collectionFilms = await enrichTmdbFilmImdbIds(collectionFilms);
  const recommendedFilms = await enrichTmdbFilmImdbIds(Array.isArray(detail?.recommendations?.results) ? detail.recommendations.results.slice(0, 12).map(mapTmdbFilm).filter((film: any) => film.tmdbId) : []);
  const similarFilms = await enrichTmdbFilmImdbIds(Array.isArray(detail?.similar?.results) ? detail.similar.results.slice(0, 12).map(mapTmdbFilm).filter((film: any) => film.tmdbId) : []);
  const trailers = Array.isArray(detail?.videos?.results)
    ? detail.videos.results
        .filter((video: any) => video?.key && /youtube/i.test(firstString(video?.site) || ""))
        .slice(0, 10)
        .map((video: any) => ({
          id: firstString(video?.id),
          key: firstString(video?.key),
          name: firstString(video?.name),
          site: firstString(video?.site),
          type: firstString(video?.type),
          official: !!video?.official,
          publishedAt: firstString(video?.published_at),
          url: `https://www.youtube.com/watch?v=${encodeURIComponent(firstString(video?.key) || "")}`,
        }))
    : [];

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
    director: directorDetails.map((person: any) => person.name).filter(Boolean).join(", "),
    directorDetails,
    cast: castDetails.map((person: any) => person.name).filter(Boolean).slice(0, 10),
    castDetails,
    recommendedFilms,
    similarFilms,
    collection,
    collectionFilms,
    trailers,
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
    plot: "full",
  });

  if (year) params.set("y", year);

  const data = await fetchJsonWithTimeout(`https://www.omdbapi.com/?${params.toString()}`);

  if (!data || data.Response === "False") return null;

  const ratings = Array.isArray(data.Ratings) ? data.Ratings : [];
  const ratingValue = (source: string) => firstString(ratings.find((entry: any) => entry?.Source === source)?.Value);
  const imdbRating = firstString(data.imdbRating);
  const rottenTomatoesRating = ratingValue("Rotten Tomatoes");
  const metacriticRating = firstString(data.Metascore) && data.Metascore !== "N/A" ? `${firstString(data.Metascore)}/100` : ratingValue("Metacritic");

  return {
    matched: true,
    metadataSource: "OMDb",
    imdbId: firstString(data.imdbID),
    title: firstString(data.Title),
    originalTitle: firstString(data.Title),
    year: (firstString(data.Year) || "").slice(0, 4) || year,
    genre: firstString(data.Genre),
    overview: firstString(data.Plot),
    onlineRating: imdbRating,
    rating: imdbRating,
    imdbRating,
    rottenTomatoesRating,
    metacriticRating,
    runtime: firstString(data.Runtime),
    certification: firstString(data.Rated),
    director: firstString(data.Director),
    cast: (firstString(data.Actors) || "").split(",").map((item: string) => item.trim()).filter(Boolean).slice(0, 6),
    posterUrl: firstString(data.Poster) && data.Poster !== "N/A" ? firstString(data.Poster) : "",
    fetchedAt: Date.now(),
  };
}

async function lookupOnlineVideoMetadata(filePath: string, force = false, hints: any = {}) {
  const cache = readVideoMetadataCache();
  const key = getVideoMetadataCacheKey(filePath);

  if (!force && cache[key]?.matched) return cache[key];

  const parsed = parseVideoTitleFromFilename(filePath);
  const sidecar = readVideoMetadataSidecar(filePath);
  const cached = cache[key] || {};

  const candidates: any[] = [];
  const seenCandidates = new Set<string>();

  const addCandidate = (candidate: any) => {
    const title = normaliseOnlineVideoTitle(firstString(candidate?.title) || "");
    const year = firstString(candidate?.year) || "";
    const tmdbId = firstString(candidate?.tmdbId) || "";
    const imdbId = firstString(candidate?.imdbId) || "";

    if (!title && !tmdbId && !imdbId) return;

    const key = `${title}|${year}|${tmdbId}|${imdbId}`.toLowerCase();
    if (seenCandidates.has(key)) return;
    seenCandidates.add(key);

    candidates.push({ title, year, tmdbId, imdbId });
  };

  [
    hints,
    sidecar,
    cached,
    { title: parsed.title, year: parsed.year },
    { title: firstString(sidecar.originalTitle || cached.originalTitle), year: firstString(sidecar.year || cached.year || parsed.year) },
  ].forEach(addCandidate);

  const titleBag = candidates.map((item) => item.title).join(" ").toLowerCase();
  if (/\bendgame\b/.test(titleBag) && /\b(avengers|marvel)\b/.test(titleBag)) {
    addCandidate({ title: "Avengers Endgame", year: firstString(hints.year || sidecar.year || cached.year || parsed.year) || "2019" });
    addCandidate({ title: "Avengers: Endgame", year: firstString(hints.year || sidecar.year || cached.year || parsed.year) || "2019" });
  }

  const mergeProviders = (tmdb: any, omdb: any) => {
    if (!tmdb && !omdb) return null;

    return tmdb && omdb
      ? {
          ...tmdb,
          metadataSource: "TMDb + OMDb",
          imdbId: firstString(tmdb.imdbId || omdb.imdbId),
          onlineRating: firstString(omdb.imdbRating || tmdb.onlineRating),
          rating: firstString(omdb.imdbRating || tmdb.rating),
          imdbRating: firstString(omdb.imdbRating),
          rottenTomatoesRating: firstString(omdb.rottenTomatoesRating),
          metacriticRating: firstString(omdb.metacriticRating),
          runtime: firstString(tmdb.runtime || omdb.runtime),
          certification: firstString(tmdb.certification || omdb.certification),
          director: firstString(tmdb.director || omdb.director),
          cast: Array.isArray(tmdb.cast) && tmdb.cast.length ? tmdb.cast : omdb.cast,
          posterUrl: firstString(tmdb.posterUrl || omdb.posterUrl),
          overview: firstString(tmdb.overview || omdb.overview),
        }
      : tmdb || omdb;
  };

  const scoreMetadata = (item: any) => {
    if (!item) return 0;

    const relatedCount =
      (Array.isArray(item.recommendedFilms) ? item.recommendedFilms.length : 0) +
      (Array.isArray(item.similarFilms) ? item.similarFilms.length : 0) +
      (Array.isArray(item.collectionFilms) ? item.collectionFilms.length : 0) +
      (Array.isArray(item.trailers) ? item.trailers.length : 0);

    const castScore = Array.isArray(item.castDetails)
      ? item.castDetails.filter((person: any) => person?.profileUrl || person?.biography || person?.knownFor?.length).length
      : 0;

    return (
      (item.tmdbId ? 80 : 0) +
      (item.imdbId ? 40 : 0) +
      (item.posterUrl ? 12 : 0) +
      (item.backdropUrl ? 10 : 0) +
      (item.imdbRating ? 10 : 0) +
      (item.rottenTomatoesRating ? 8 : 0) +
      (Array.isArray(item.directorDetails) && item.directorDetails.length ? 12 : 0) +
      (castScore * 4) +
      (relatedCount * 3)
    );
  };

  let metadata: any = null;
  let bestScore = 0;

  try {
    const searchCandidates = candidates.length ? candidates : [{ title: parsed.title, year: parsed.year }];

    for (const candidate of searchCandidates.slice(0, 8)) {
      const tmdb = await fetchTmdbVideoMetadata(candidate.title || parsed.title, candidate.year || parsed.year, candidate.tmdbId || "");
      const imdbId = firstString(tmdb?.imdbId || candidate.imdbId) || "";
      const omdb = imdbId
        ? await fetchOmdbVideoMetadataByImdbId(imdbId).catch(() => null)
        : await fetchOmdbVideoMetadata(tmdb?.title || candidate.title || parsed.title, tmdb?.year || candidate.year || parsed.year).catch(() => null);

      const merged = mergeProviders(tmdb, omdb);
      const score = scoreMetadata(merged);

      if (score > bestScore) {
        metadata = merged;
        bestScore = score;
      }

      if (score >= 150) break;
    }
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
  const resolved = path.resolve(filePath || "").toLowerCase();
  const hash = crypto.createHash("sha1").update(resolved).digest("hex").slice(0, 24);
  return `vid_${hash}`;
}

function findVideoBrowserCopySourcePath(filePath: string) {
  const parsed = path.parse(filePath);
  const match = parsed.name.match(/^(.*?)\s+-\s+BRMedia Browser Copy(?:\s+\d+)?$/i);
  if (!match) return "";

  const sourceBase = firstString(match[1]);
  if (!sourceBase) return "";

  for (const ext of VIDEO_EXTENSIONS) {
    const candidate = path.join(parsed.dir, `${sourceBase}${ext}`);
    if (path.resolve(candidate).toLowerCase() === path.resolve(filePath).toLowerCase()) continue;
    if (fs.existsSync(candidate)) return candidate;
  }

  return "";
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

function firstNonEmptyVideoArray(...values: any[]) {
  for (const value of values) {
    if (Array.isArray(value) && value.length) return value;
  }
  return [];
}

function isPathInsideRoot(filePath: string, root: string) {
  const resolved = path.resolve(filePath).toLowerCase();
  const base = path.resolve(root).toLowerCase();
  return resolved === base || resolved.startsWith(`${base}${path.sep}`);
}

function persistVideoLibraryManifest() {
  try {
    ensurePlayerRuntimeStateDir();
    fs.writeFileSync(
      VIDEO_LIBRARY_MANIFEST_PATH,
      JSON.stringify({ version: 1, updatedAt: Date.now(), items: Array.from(VIDEO_LIBRARY_CACHE.values()) }, null, 2),
      "utf8"
    );
  } catch {}
}

function restoreVideoLibraryManifest() {
  if (VIDEO_LIBRARY_CACHE.size || !fs.existsSync(VIDEO_LIBRARY_MANIFEST_PATH)) return;

  try {
    const parsed = JSON.parse(fs.readFileSync(VIDEO_LIBRARY_MANIFEST_PATH, "utf8"));
    const items = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.items) ? parsed.items : [];

    items.forEach((item: any) => {
      if (!item?.id || !item?.locator) return;
      const sourceOnline = fs.existsSync(item.locator);
      VIDEO_LIBRARY_CACHE.set(String(item.id), {
        ...item,
        sourceOnline,
        sourceStatus: sourceOnline ? "online" : "offline",
      });
    });
  } catch {}
}

function scanVideoLibrary() {
  restoreVideoLibraryManifest();
  const previous = new Map(VIDEO_LIBRARY_CACHE);
  VIDEO_LIBRARY_CACHE.clear();
  const items: any[] = [];

  const preserveOfflineRoot = (root: string) => {
    previous.forEach((item: any) => {
      if (!item?.locator || !isPathInsideRoot(item.locator, root) || VIDEO_LIBRARY_CACHE.has(item.id)) return;
      const preserved = { ...item, sourceOnline: false, sourceStatus: "offline" };
      VIDEO_LIBRARY_CACHE.set(item.id, preserved);
      items.push(preserved);
    });
  };

  for (const root of getVideoLibraryRoots()) {
    let files: string[] = [];

    try {
      if (!fs.existsSync(root)) {
        preserveOfflineRoot(root);
        continue;
      }

      files = collectSupportedVideoFilesRecursive(root);
    } catch {
      preserveOfflineRoot(root);
      continue;
    }

    for (const filePath of files) {
      try {
        const stat = fs.statSync(filePath);
        const parsedTitle = parseVideoTitleFromFilename(filePath);
        const sidecar =
          readVideoMetadataSidecar(filePath);

        if (sidecar.libraryHidden === true) {
          continue;
        }

        const online =
          getCachedOnlineVideoMetadata(filePath);
        const posterPath = findVideoPoster(filePath);
        const browserCopySourcePath = firstString(sidecar.browserCopySourcePath) || findVideoBrowserCopySourcePath(filePath);
        const item = {
          id: makeVideoId(filePath),
          title: firstString(sidecar.title) || firstString(online.title) || parsedTitle.title,
          originalTitle: firstString(sidecar.originalTitle) || firstString(online.originalTitle) || "",
          year: firstString(sidecar.year) || firstString(online.year) || parsedTitle.year,
          genre: firstString(sidecar.genre) || firstString(online.genre) || inferVideoGenreFromText(`${filePath} ${parsedTitle.title}`) || "Unsorted",
          overview: firstString(sidecar.overview) || firstString(sidecar.description) || firstString(online.overview) || "",
          rating: firstString(sidecar.rating) || firstString(online.rating) || "",
          onlineRating: firstString(sidecar.onlineRating || sidecar.imdbRating || sidecar.tmdbRating) || firstString(online.onlineRating) || "",
          imdbRating: firstString(sidecar.imdbRating) || firstString(online.imdbRating) || "",
          rottenTomatoesRating: firstString(sidecar.rottenTomatoesRating) || firstString(online.rottenTomatoesRating) || "",
          metacriticRating: firstString(sidecar.metacriticRating) || firstString(online.metacriticRating) || "",
          runtime: firstString(sidecar.runtime) || firstString(online.runtime) || "",
          duration: Number(sidecar.duration || 0) || 0,
          fileName: path.basename(filePath),
          folder: path.basename(path.dirname(filePath)),
          locator: filePath,
          sourceOnline: true,
          sourceStatus: "online",
          sizeBytes: stat.size,
          modifiedAt: stat.mtimeMs,
          mimeType: getVideoMimeType(filePath),
          hasPoster: !!posterPath || !!online.posterUrl,
          posterPath: firstString(sidecar.posterPath) || posterPath,
          posterUrl: firstString(sidecar.posterUrl) || firstString(online.posterUrl) || "",
          customPosterUrl: firstString(sidecar.customPosterUrl) || "",
          backdropUrl: firstString(sidecar.backdropUrl) || firstString(online.backdropUrl) || "",
          metadataSource: firstString(sidecar.metadataSource) || firstString(online.metadataSource) || "",
          metadataFetchedAt: Number(online.fetchedAt || sidecar.metadataFetchedAt || sidecar.updatedAt || 0) || 0,
          imdbId: firstString(sidecar.imdbId) || firstString(online.imdbId) || "",
          tmdbId: firstString(sidecar.tmdbId) || firstString(online.tmdbId) || "",
          certification: firstString(sidecar.certification) || firstString(online.certification) || "",
          director: firstString(sidecar.director) || firstString(online.director) || "",
          directorDetails: firstNonEmptyVideoArray(sidecar.directorDetails, online.directorDetails),
          cast: firstNonEmptyVideoArray(sidecar.cast, online.cast),
          castDetails: firstNonEmptyVideoArray(sidecar.castDetails, online.castDetails),
          recommendedFilms: firstNonEmptyVideoArray(sidecar.recommendedFilms, online.recommendedFilms),
          similarFilms: firstNonEmptyVideoArray(sidecar.similarFilms, online.similarFilms),
          collection: sidecar.collection && typeof sidecar.collection === "object" ? sidecar.collection : (online.collection && typeof online.collection === "object" ? online.collection : null),
          collectionFilms: firstNonEmptyVideoArray(sidecar.collectionFilms, online.collectionFilms),
          trailers: firstNonEmptyVideoArray(sidecar.trailers, online.trailers),
          subtitles: findVideoSubtitles(filePath).map((sub) => ({
            id: sub.id,
            fileName: sub.fileName,
            label: sub.label,
            language: sub.language,
            ext: sub.ext,
          })),
          audioTracks: Array.isArray(sidecar.audioTracks) ? sidecar.audioTracks : [],
          browserCopySourcePath,
          browserCopyOf:
            firstString(sidecar.browserCopyOf) ||
            (
              browserCopySourcePath
                ? makeVideoId(browserCopySourcePath)
                : ""
            ),
          isBrowserCopy:
            !!(
              firstString(sidecar.browserCopyOf) ||
              browserCopySourcePath
            ),
          preferredBrowserCopyPath:
            firstString(sidecar.preferredBrowserCopyPath),
          preferredBrowserCopyId:
            firstString(sidecar.preferredBrowserCopyId),
          linkupEnabled: !!sidecar.linkupEnabled,
          linkupMode: firstString(sidecar.linkupMode),
          linkupTitle: firstString(sidecar.linkupTitle),
          linkupSeason: Number(sidecar.linkupSeason || 0) || 0,
          linkupEpisode: Number(sidecar.linkupEpisode || 0) || 0,
          linkupEpisodeCount: Number(sidecar.linkupEpisodeCount || 0) || 0,
          linkupPartNumber: Number(sidecar.linkupPartNumber || 0) || 0,
          linkupPartTotal: Number(sidecar.linkupPartTotal || 0) || 0,
        };
        VIDEO_LIBRARY_CACHE.set(item.id, item);
        items.push(item);
      } catch (err: any) {
        console.warn(`[BRMedia Video] skipped ${filePath}: ${String(err?.message || err)}`);
      }
    }
  }

  items.sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
  persistVideoLibraryManifest();
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

async function refreshVideoItemMetadata(
  videoId: string,
  force = false,
  rich = false
) {
  const item = getVideoItem(videoId);

  if (!item) return null;

  if (rich) {
    const cache = readVideoMetadataCache();

    delete cache[getVideoMetadataCacheKey(item.locator)];

    writeVideoMetadataCache(cache);

    const current =
      readVideoMetadataSidecar(item.locator);

    fs.writeFileSync(
      getVideoSidecarPath(item.locator),
      JSON.stringify(
        {
          ...current,
          castDetails: [],
          directorDetails: [],
          recommendedFilms: [],
          similarFilms: [],
          collectionFilms: [],
          trailers: [],
          collection: null,
          metadataFetchedAt: 0,
          updatedAt: Date.now(),
        },
        null,
        2
      ),
      "utf8"
    );
  }

  await lookupOnlineVideoMetadata(
    item.locator,
    force || rich,
    item
  );

  scanVideoLibrary();

  return getVideoItem(videoId);
}

function videoNeedsAutoMetadataRefresh(item: any) {
  if (!item?.locator) return false;

  const hasCore = !!(item.metadataSource || item.onlineRating || item.tmdbId || item.imdbId);
  const hasRichCast = Array.isArray(item.castDetails) && item.castDetails.some((person: any) => person?.profileUrl || person?.biography);
  const hasDirector = !!item.director || (Array.isArray(item.directorDetails) && item.directorDetails.length > 0);
  const hasRelated =
    (Array.isArray(item.trailers) && item.trailers.length > 0) ||
    (Array.isArray(item.recommendedFilms) && item.recommendedFilms.length > 0) ||
    (Array.isArray(item.similarFilms) && item.similarFilms.length > 0) ||
    (Array.isArray(item.collectionFilms) && item.collectionFilms.length > 0);
  const fetchedAt = Number(item.metadataFetchedAt || 0);
  const stale = fetchedAt > 0 && Date.now() - fetchedAt > 1000 * 60 * 60 * 24 * 21;

  return !hasCore || !hasRichCast || !hasDirector || !hasRelated || stale;
}

async function refreshMissingVideoMetadata(items: any[]) {
  if (!hasVideoMetadataProvider()) return items;

  const missing = items
    .filter((item) => videoNeedsAutoMetadataRefresh(item))
    .slice(0, 25);

  for (const item of missing) {
    await lookupOnlineVideoMetadata(item.locator, videoNeedsAutoMetadataRefresh(item), item);
  }

  return scanVideoLibrary();
}

async function autoRefreshVideoMetadataNow(limit = 3) {
  const before = scanVideoLibrary();

  if (!hasVideoMetadataProvider()) {
    return { ok: true, metadataEnabled: false, attempted: 0, updated: 0, hasMore: false, items: [] };
  }

  const candidates = before.filter((item) => videoNeedsAutoMetadataRefresh(item));
  const selected = candidates.slice(
    0,
    Math.max(
      1,
      Math.min(30, Number(limit || 3))
    )
  );

  const beforeMap = new Map(before.map((item: any) => [String(item.id), JSON.stringify({
    metadataSource: item.metadataSource,
    tmdbId: item.tmdbId,
    imdbId: item.imdbId,
    onlineRating: item.onlineRating,
    castDetails: item.castDetails,
    directorDetails: item.directorDetails,
    trailers: item.trailers,
    recommendedFilms: item.recommendedFilms,
    similarFilms: item.similarFilms,
  })]));

  for (const item of selected) {
    await lookupOnlineVideoMetadata(item.locator, true, item);
  }

  const after = scanVideoLibrary();

  const changedItems = selected
    .map((item) => after.find((entry: any) => String(entry.id) === String(item.id)))
    .filter(Boolean)
    .filter((item: any) => beforeMap.get(String(item.id)) !== JSON.stringify({
      metadataSource: item.metadataSource,
      tmdbId: item.tmdbId,
      imdbId: item.imdbId,
      onlineRating: item.onlineRating,
      castDetails: item.castDetails,
      directorDetails: item.directorDetails,
      trailers: item.trailers,
      recommendedFilms: item.recommendedFilms,
      similarFilms: item.similarFilms,
    }));

  return {
    ok: true,
    metadataEnabled: true,
    attempted: selected.length,
    updated: changedItems.length,
    remaining: Math.max(0, candidates.length - selected.length),
    hasMore: candidates.length > selected.length,
    items: changedItems,
  };
}

function getVideoSidecarPath(filePath: string) {
  const parsed = path.parse(filePath);
  return path.join(parsed.dir, `${parsed.name}.brmedia-video.json`);
}

function normaliseVideoMetadataPatch(raw: any) {
  const patch: Record<string, any> = {};
  [
    "title",
    "originalTitle",
    "year",
    "genre",
    "overview",
    "rating",
    "onlineRating",
    "imdbRating",
    "rottenTomatoesRating",
    "metacriticRating",
    "runtime",
    "certification",
    "director",
    "posterUrl",
    "customPosterUrl",
    "backdropUrl",
    "metadataSource",
    "imdbId",
    "tmdbId",
    "preferredBrowserCopyPath",
    "preferredBrowserCopyId",
  ].forEach((key) => {
    const value = firstString(raw?.[key]);
    if (value) patch[key] = value;
  });

  if (Array.isArray(raw?.cast)) patch.cast = raw.cast.map((entry: any) => firstString(entry)).filter(Boolean).slice(0, 12);

  [
    "castDetails",
    "directorDetails",
    "recommendedFilms",
    "similarFilms",
    "collectionFilms",
    "trailers",
  ].forEach((key) => {
    if (Array.isArray(raw?.[key])) patch[key] = raw[key].filter(Boolean).slice(0, 40);
  });

  if (raw?.collection && typeof raw.collection === "object") patch.collection = raw.collection;

  if ("libraryHidden" in raw) patch.libraryHidden = !!raw?.libraryHidden;
  if ("libraryHiddenAt" in raw) {
    patch.libraryHiddenAt = Number(raw?.libraryHiddenAt || 0) || 0;
  }

  if ("linkupEnabled" in raw) patch.linkupEnabled = !!raw?.linkupEnabled;
  ["linkupMode", "linkupTitle"].forEach((key) => {
    const value = firstString(raw?.[key]);
    if (value) patch[key] = value;
    else if (key in raw) patch[key] = "";
  });
  ["linkupSeason", "linkupEpisode", "linkupEpisodeCount", "linkupPartNumber", "linkupPartTotal"].forEach((key) => {
    if (key in raw) {
      const value = Number(raw?.[key] || 0);
      patch[key] = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    }
  });

  if (raw?.replaceRichMetadata || raw?.clearRichMetadata) {
    patch.castDetails = [];
    patch.directorDetails = [];
    patch.recommendedFilms = [];
    patch.similarFilms = [];
    patch.collectionFilms = [];
    patch.trailers = [];
    patch.collection = null;
  }

  patch.updatedAt = Date.now();
  return patch;
}

function saveVideoMetadataPatch(videoId: string, rawPatch: any) {
  const item = getVideoItem(videoId);
  if (!item) return null;
  if (!validateVideoPathAllowed(item.locator)) return null;

  const sidecarPath = getVideoSidecarPath(item.locator);
  const current = readVideoMetadataSidecar(item.locator);
  const next = {
    ...current,
    ...normaliseVideoMetadataPatch(rawPatch),
  };

  fs.writeFileSync(sidecarPath, JSON.stringify(next, null, 2), "utf8");
  scanVideoLibrary();
  return getVideoItem(videoId);
}

async function saveVideoMetadataPatchWithRichRefresh(videoId: string, rawPatch: any) {
  const item = getVideoItem(videoId);
  if (!item) return null;

  let nextPatch: any = { ...(rawPatch || {}) };
  const shouldReplaceRich = !!(nextPatch.replaceRichMetadata || nextPatch.clearRichMetadata);
  const tmdbId = firstString(nextPatch.tmdbId) || "";

  if (shouldReplaceRich && tmdbId && hasVideoMetadataProvider()) {
    try {
      const tmdb = await fetchTmdbVideoMetadata(
        firstString(nextPatch.title) || "",
        firstString(nextPatch.year) || "",
        tmdbId
      );

      const omdb = await fetchOmdbVideoMetadata(
        firstString(tmdb?.title || nextPatch.title) || "",
        firstString(tmdb?.year || nextPatch.year) || ""
      );

      if (tmdb || omdb) {
        nextPatch = {
          ...nextPatch,
          ...(tmdb || {}),
          metadataSource: tmdb && omdb ? "TMDb + OMDb" : firstString(tmdb?.metadataSource || omdb?.metadataSource || nextPatch.metadataSource),
          imdbId: firstString(tmdb?.imdbId || omdb?.imdbId || nextPatch.imdbId),
          onlineRating: firstString(omdb?.imdbRating || tmdb?.onlineRating || nextPatch.onlineRating),
          rating: firstString(omdb?.imdbRating || tmdb?.rating || nextPatch.rating),
          imdbRating: firstString(omdb?.imdbRating || nextPatch.imdbRating),
          rottenTomatoesRating: firstString(omdb?.rottenTomatoesRating || nextPatch.rottenTomatoesRating),
          metacriticRating: firstString(omdb?.metacriticRating || nextPatch.metacriticRating),
          runtime: firstString(tmdb?.runtime || omdb?.runtime || nextPatch.runtime),
          certification: firstString(tmdb?.certification || omdb?.certification || nextPatch.certification),
          posterUrl: firstString(tmdb?.posterUrl || omdb?.posterUrl || nextPatch.posterUrl),
          replaceRichMetadata: false,
          clearRichMetadata: false,
        };
      }
    } catch (err: any) {
      console.warn(`[BRMedia Video] rich metadata refresh failed for ${videoId}: ${String(err?.message || err)}`);
    }
  }

  return saveVideoMetadataPatch(videoId, nextPatch);
}

function saveVideoPosterUrl(videoId: string, posterUrlRaw: any) {
  const posterUrl = firstString(posterUrlRaw) || "";
  if (!/^https?:\/\//i.test(posterUrl)) throw new Error("Poster URL must start with http:// or https://");
  return saveVideoMetadataPatch(videoId, {
    customPosterUrl: posterUrl,
    posterUrl: "",
    metadataSource: "BRMedia Poster URL",
  });
}

function saveVideoPosterUpload(videoId: string, fileNameRaw: string, buffer: Buffer) {
  const item = getVideoItem(videoId);
  if (!item) return null;
  if (!buffer.length) throw new Error("Empty poster upload");
  if (!validateVideoPathAllowed(item.locator)) throw new Error("Video path is not allowed");

  const safeName = safeUploadFilename(fileNameRaw || "poster.jpg");
  const ext = path.extname(safeName).toLowerCase();
  if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) throw new Error("Poster must be JPG, PNG or WEBP");

  const parsed = path.parse(item.locator);
  const targetPath = path.join(parsed.dir, `${parsed.name}.poster${ext}`);
  fs.writeFileSync(targetPath, buffer);

  return saveVideoMetadataPatch(videoId, {
    posterPath: targetPath,
    customPosterUrl: "",
    posterUrl: "",
    metadataSource: "BRMedia Poster Upload",
  });
}

function writeVideoBrowserCopySidecar(sourceItem: any, outputPath: string) {
  const sourceSidecar = readVideoMetadataSidecar(sourceItem.locator);
  const sourceOnline = getCachedOnlineVideoMetadata(sourceItem.locator);
  const browserCopyId = makeVideoId(outputPath);

  const patch = {
    ...sourceOnline,
    ...sourceSidecar,
    title:
      firstString(sourceSidecar.title) ||
      firstString(sourceOnline.title) ||
      firstString(sourceItem.title),
    year:
      firstString(sourceSidecar.year) ||
      firstString(sourceOnline.year) ||
      firstString(sourceItem.year),
    genre:
      firstString(sourceSidecar.genre) ||
      firstString(sourceOnline.genre) ||
      firstString(sourceItem.genre),
    overview:
      firstString(sourceSidecar.overview) ||
      firstString(sourceOnline.overview) ||
      firstString(sourceItem.overview),
    metadataSource:
      firstString(sourceSidecar.metadataSource) ||
      firstString(sourceOnline.metadataSource) ||
      firstString(sourceItem.metadataSource) ||
      "BRMedia Browser Copy",
    browserCopyOf: makeVideoId(sourceItem.locator),
    browserCopySourcePath: sourceItem.locator,
    browserCopyCreatedAt: Date.now(),
    updatedAt: Date.now(),
  };

  fs.writeFileSync(
    getVideoSidecarPath(outputPath),
    JSON.stringify(patch, null, 2),
    "utf8"
  );

  fs.writeFileSync(
    getVideoSidecarPath(sourceItem.locator),
    JSON.stringify(
      {
        ...sourceSidecar,
        preferredBrowserCopyPath: outputPath,
        preferredBrowserCopyId: browserCopyId,
        browserCopyUpdatedAt: Date.now(),
        updatedAt: Date.now(),
      },
      null,
      2
    ),
    "utf8"
  );
}

function listHiddenVideoLibraryItems() {
  const hidden: any[] = [];

  for (const root of getVideoLibraryRoots()) {
    if (!root || !fs.existsSync(root)) continue;

    let files: string[] = [];

    try {
      files = collectSupportedVideoFilesRecursive(root);
    } catch {
      continue;
    }

    for (const filePath of files) {
      try {
        const sidecar = readVideoMetadataSidecar(filePath);

        if (sidecar.libraryHidden !== true) continue;

        const stat = fs.statSync(filePath);
        const parsedTitle = parseVideoTitleFromFilename(filePath);

        hidden.push({
          id: makeVideoId(filePath),
          title: firstString(sidecar.title) || parsedTitle.title,
          year: firstString(sidecar.year) || parsedTitle.year,
          genre: firstString(sidecar.genre) || "Unsorted",
          fileName: path.basename(filePath),
          folder: path.basename(path.dirname(filePath)),
          locator: filePath,
          mimeType: getVideoMimeType(filePath),
          sizeBytes: stat.size,
          hiddenAt: Number(sidecar.libraryHiddenAt || 0) || 0,
        });
      } catch {}
    }
  }

  return hidden.sort(
    (a, b) =>
      Number(b.hiddenAt || 0) -
      Number(a.hiddenAt || 0)
  );
}

function restoreHiddenVideoLibraryItem(videoId: string) {
  const hidden = listHiddenVideoLibraryItems().find(
    (item: any) => String(item.id) === String(videoId)
  );

  if (!hidden?.locator) return null;

  const sidecar = readVideoMetadataSidecar(hidden.locator);

  delete sidecar.libraryHidden;
  delete sidecar.libraryHiddenAt;

  fs.writeFileSync(
    getVideoSidecarPath(hidden.locator),
    JSON.stringify(
      {
        ...sidecar,
        updatedAt: Date.now(),
      },
      null,
      2
    ),
    "utf8"
  );

  scanVideoLibrary();

  return {
    ok: true,
    item: getVideoItem(videoId),
  };
}

function removeVideoLibraryItem(
  videoId: string,
  modeRaw = "physical"
) {
  const item = getVideoItem(videoId);

  if (!item) return null;

  if (!validateVideoPathAllowed(item.locator)) {
    throw new Error("Video path is not allowed");
  }

  const mode =
    modeRaw === "library"
      ? "library"
      : "physical";

  const deletedPath = item.locator;

  if (mode === "library") {
    const sidecar =
      readVideoMetadataSidecar(item.locator);

    fs.writeFileSync(
      getVideoSidecarPath(item.locator),
      JSON.stringify(
        {
          ...sidecar,
          libraryHidden: true,
          libraryHiddenAt: Date.now(),
          updatedAt: Date.now(),
        },
        null,
        2
      ),
      "utf8"
    );

    scanVideoLibrary();

    return {
      ok: true,
      mode,
      deletedPath,
      id: videoId,
      physicalFileDeleted: false,
    };
  }

  if (!fs.existsSync(item.locator)) {
    throw new Error("Video file missing");
  }

  fs.unlinkSync(item.locator);

  const relatedFiles = [
    getVideoSidecarPath(deletedPath),
    ...VIDEO_POSTER_EXTENSIONS.map((ext) =>
      path.join(
        path.dirname(deletedPath),
        `${path.parse(deletedPath).name}.poster${ext}`
      )
    ),
  ];

  relatedFiles.forEach((candidate) => {
    try {
      if (fs.existsSync(candidate)) {
        fs.unlinkSync(candidate);
      }
    } catch {}
  });

  const cache = readVideoMetadataCache();

  delete cache[getVideoMetadataCacheKey(deletedPath)];

  writeVideoMetadataCache(cache);
  scanVideoLibrary();

  return {
    ok: true,
    mode,
    deletedPath,
    id: videoId,
    physicalFileDeleted: true,
  };
}

async function fetchOmdbVideoMetadataByImdbId(imdbId: string) {
  const apiKey = firstString(process.env.OMDB_API_KEY) || "";
  const safeId = firstString(imdbId) || "";
  if (!apiKey || !/^tt\d{5,12}$/i.test(safeId)) return null;

  const params = new URLSearchParams({
    apikey: apiKey,
    i: safeId,
    plot: "short",
  });

  const data = await fetchJsonWithTimeout(`https://www.omdbapi.com/?${params.toString()}`);
  if (!data || data.Response === "False") return null;

  const ratings = Array.isArray(data.Ratings) ? data.Ratings : [];
  const ratingValue = (source: string) => firstString(ratings.find((entry: any) => entry?.Source === source)?.Value);
  const imdbRating = firstString(data.imdbRating);
  const rottenTomatoesRating = ratingValue("Rotten Tomatoes");
  const metacriticRating = firstString(data.Metascore) && data.Metascore !== "N/A" ? `${firstString(data.Metascore)}/100` : ratingValue("Metacritic");

  return {
    matched: true,
    metadataSource: "OMDb IMDb",
    imdbId: firstString(data.imdbID),
    title: firstString(data.Title),
    originalTitle: firstString(data.Title),
    year: (firstString(data.Year) || "").slice(0, 4),
    genre: firstString(data.Genre),
    overview: firstString(data.Plot),
    onlineRating: imdbRating,
    rating: imdbRating,
    imdbRating,
    rottenTomatoesRating,
    metacriticRating,
    runtime: firstString(data.Runtime),
    certification: firstString(data.Rated),
    director: firstString(data.Director),
    cast: (firstString(data.Actors) || "").split(",").map((item: string) => item.trim()).filter(Boolean).slice(0, 8),
    posterUrl: firstString(data.Poster) && data.Poster !== "N/A" ? firstString(data.Poster) : "",
    fetchedAt: Date.now(),
  };
}

function extractImdbIdFromText(value: any) {
  const match = String(value || "").match(/\btt\d{5,12}\b/i);
  return match ? match[0] : "";
}

async function searchTmdbVideoMetadataMatches(queryRaw: string, year = "") {
  const apiKey = firstString(process.env.TMDB_API_KEY);
  const bearer = firstString(process.env.TMDB_BEARER_TOKEN);
  const query = normaliseOnlineVideoTitle(queryRaw);
  if (!query || (!apiKey && !bearer)) return [];

  const params = new URLSearchParams({
    query,
    include_adult: "false",
    language: "en-GB",
  });

  if (year) params.set("year", year);
  if (apiKey) params.set("api_key", apiKey);

  const headers = bearer ? { Authorization: `Bearer ${bearer}` } : undefined;
  const search = await fetchJsonWithTimeout(`https://api.themoviedb.org/3/search/movie?${params.toString()}`, { headers });
  const results = Array.isArray(search?.results) ? search.results.slice(0, 8) : [];

  const mapped = await Promise.all(results.map(async (match: any) => {
    const releaseDate = firstString(match.release_date);
    const matchYear = releaseDate ? releaseDate.slice(0, 4) : year;
    const posterPath = firstString(match.poster_path);
    const backdropPath = firstString(match.backdrop_path);
    const omdb = await fetchOmdbVideoMetadata(firstString(match.title) || "", matchYear || "").catch(() => null);

    return {
      matched: true,
      metadataSource: omdb ? "TMDb + OMDb" : "TMDb",
      tmdbId: String(match.id || ""),
      imdbId: firstString(omdb?.imdbId),
      title: firstString(match.title),
      originalTitle: firstString(match.original_title || match.title),
      year: matchYear,
      genre: firstString(omdb?.genre),
      overview: firstString(match.overview || omdb?.overview),
      onlineRating: firstString(omdb?.imdbRating) || (match.vote_average ? Number(match.vote_average).toFixed(1) : ""),
      rating: firstString(omdb?.imdbRating) || (match.vote_average ? Number(match.vote_average).toFixed(1) : ""),
      imdbRating: firstString(omdb?.imdbRating),
      rottenTomatoesRating: firstString(omdb?.rottenTomatoesRating),
      metacriticRating: firstString(omdb?.metacriticRating),
      runtime: firstString(omdb?.runtime),
      certification: firstString(omdb?.certification),
      director: firstString(omdb?.director),
      cast: Array.isArray(omdb?.cast) ? omdb.cast : [],
      posterUrl: posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : firstString(omdb?.posterUrl),
      backdropUrl: backdropPath ? `https://image.tmdb.org/t/p/w1280${backdropPath}` : "",
      fetchedAt: Date.now(),
    };
  }));

  return mapped.filter((item) => item.title);
}

async function searchVideoMetadataMatches(body: any) {
  const query = firstString(body?.query || body?.title) || "";
  const year = firstString(body?.year) || "";
  const imdbId = extractImdbIdFromText(query);
  const results: any[] = [];

  if (imdbId) {
    const omdb = await fetchOmdbVideoMetadataByImdbId(imdbId);
    if (omdb) results.push(omdb);
  }

  const tmdbResults = await searchTmdbVideoMetadataMatches(query || "", year || "").catch(() => []);
  results.push(...tmdbResults);

  const seen = new Set<string>();
  return results.filter((result) => {
    const key = (firstString(result.imdbId || result.tmdbId || `${result.title}-${result.year}`) || "").toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 10);
}

function parseVideoCopyTimestamp(value: string) {
  const match = String(value || "").match(/(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) return 0;
  return (Number(match[1]) * 3600) + (Number(match[2]) * 60) + Number(match[3]);
}

function getVideoCopyDurationFromFfmpegText(text: string) {
  const match = String(text || "").match(/Duration:\s*(\d+:\d+:\d+(?:\.\d+)?)/);
  return match ? parseVideoCopyTimestamp(match[1]) : 0;
}

function getVideoCopyTimeFromFfmpegText(text: string) {
  const match = String(text || "").match(/time=(\d+:\d+:\d+(?:\.\d+)?)/);
  return match ? parseVideoCopyTimestamp(match[1]) : 0;
}

function normaliseVideoBrowserCopyJob(job: any) {
  if (!job) return null;
  const copy = { ...job };
  delete copy.process;
  return copy;
}

function listVideoBrowserCopyJobs() {
  return Array.from(VIDEO_BROWSER_COPY_JOBS.values())
    .sort((a: any, b: any) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0))
    .slice(0, 30)
    .map(normaliseVideoBrowserCopyJob);
}

function getActiveVideoBrowserCopyJob(videoId: string) {
  return listVideoBrowserCopyJobs().find((job: any) =>
    String(job.videoId || job.sourceId || "") === String(videoId) &&
    ["queued", "running"].includes(String(job.status || ""))
  ) || null;
}

function getVideoBrowserCopyOutputPath(inputPath: string) {
  const parsed = path.parse(inputPath);
  let candidate = path.join(parsed.dir, `${parsed.name} - BRMedia Browser Copy.mp4`);
  let counter = 2;
  while (fs.existsSync(candidate)) {
    candidate = path.join(parsed.dir, `${parsed.name} - BRMedia Browser Copy ${counter}.mp4`);
    counter += 1;
  }
  return candidate;
}

function startVideoBrowserCopyJob(videoId: string, optionsRaw: any = {}) {
  const activeJob = getActiveVideoBrowserCopyJob(videoId);
  if (activeJob) return activeJob;

  const item = getVideoItem(videoId);
  if (!item) return null;
  if (!validateVideoPathAllowed(item.locator)) throw new Error("Video path is not allowed");
  if (!fs.existsSync(item.locator)) throw new Error("Video file missing");

  const outputPath = getVideoBrowserCopyOutputPath(item.locator);
  const id = makeConverterId("video_browser_copy");

  const allowedPresets = new Set([
    "veryfast",
    "fast",
    "medium",
    "slow",
  ]);

  const allowedAudioBitrates = new Set([
    "128k",
    "160k",
    "192k",
    "256k",
  ]);

  const preset = allowedPresets.has(String(optionsRaw?.preset || ""))
    ? String(optionsRaw.preset)
    : "fast";

  const crf = Math.max(
    18,
    Math.min(30, Number(optionsRaw?.crf || 23))
  );

  const audioBitrate = allowedAudioBitrates.has(
    String(optionsRaw?.audioBitrate || "")
  )
    ? String(optionsRaw.audioBitrate)
    : "192k";

  const job = {
    id,
    videoId,
    sourceId: videoId,
    sourceTitle: item.title || path.basename(item.locator),
    outputPath,
    fileName: path.basename(outputPath),
    status: "queued",
    percent: 0,
    message: "Queued for MP4 browser copy.",
    preset,
    crf,
    audioBitrate,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  VIDEO_BROWSER_COPY_JOBS.set(id, job);
  void runVideoBrowserCopyJob(job, item.locator, outputPath);
  return job;
}

async function runVideoBrowserCopyJob(job: any, inputPath: string, outputPath: string) {
  job.status = "running";
  job.percent = 3;
  job.message = "Creating browser-safe MP4 copy…";
  job.updatedAt = Date.now();
  VIDEO_BROWSER_COPY_JOBS.set(job.id, job);

  const args = [
    "-y",
    "-i", inputPath,
    "-map", "0:v:0?",
    "-map", "0:a:0?",
    "-c:v", "libx264",
    "-preset", String(job.preset || "fast"),
    "-crf", String(job.crf || 23),
    "-c:a", "aac",
    "-b:a", String(job.audioBitrate || "192k"),
    "-movflags", "+faststart",
    outputPath,
  ];

  await new Promise<void>((resolve, reject) => {
    const ffmpeg = spawn(resolvePreviewFfmpegPath(), args, { windowsHide: true });
    VIDEO_BROWSER_COPY_PROCESSES.set(job.id, ffmpeg);
    job.processId = ffmpeg.pid || 0;
    job.message = "Encoding MP4 copy…";
    job.updatedAt = Date.now();
    VIDEO_BROWSER_COPY_JOBS.set(job.id, job);
    let stderr = "";

    ffmpeg.stderr.on("data", (chunk) => {
      const text = String(chunk || "");
      stderr += text;
      if (stderr.length > 16000) stderr = stderr.slice(-16000);

      const duration = getVideoCopyDurationFromFfmpegText(text);
      if (duration > 0) job.durationSeconds = duration;

      const progressTime = getVideoCopyTimeFromFfmpegText(text);
      if (progressTime > 0 && Number(job.durationSeconds || 0) > 0) {
        job.percent = Math.max(3, Math.min(96, Math.round((progressTime / Number(job.durationSeconds || 1)) * 96)));
      } else if (text.match(/time=\d+:\d+:\d+(?:\.\d+)?/)) {
        job.percent = Math.max(job.percent || 5, Math.min(94, (job.percent || 5) + 2));
      }

      applyCleanFfmpegProgress(job, text, "Creating browser-safe MP4 copy…");
      job.updatedAt = Date.now();
      VIDEO_BROWSER_COPY_JOBS.set(job.id, job);
    });

    ffmpeg.on("error", reject);
    ffmpeg.on("close", (code: number | null) => {
      VIDEO_BROWSER_COPY_PROCESSES.delete(job.id);
      if (job.cancelRequested || job.status === "cancelled") return reject(new Error("BRMEDIA_COPY_CANCELLED"));
      if (code === 0) return resolve();
      reject(new Error(stderr.trim() || `ffmpeg exited ${code}`));
    });
  }).then(() => {
    try { writeVideoBrowserCopySidecar(getVideoItem(job.videoId), outputPath); } catch {}
    scanVideoLibrary();
    const created = getVideoLibraryItems().find((item: any) => path.resolve(item.locator).toLowerCase() === path.resolve(outputPath).toLowerCase()) || null;
    job.status = "done";
    job.percent = 100;
    job.message = "MP4 browser copy complete.";
    job.item = created;
    job.originalId = job.videoId;
    job.playableCopyId = created?.id || "";
    job.openUrl = created?.id
      ? `/video-player?videoId=${encodeURIComponent(created.id)}`
      : "/video-player";
    job.updatedAt = Date.now();
    VIDEO_BROWSER_COPY_JOBS.set(job.id, job);
  }).catch((err: any) => {
    VIDEO_BROWSER_COPY_PROCESSES.delete(job.id);
    try {
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    } catch {}

    if (String(err?.message || err) === "BRMEDIA_COPY_CANCELLED" || job.cancelRequested || job.status === "cancelled") {
      job.status = "cancelled";
      job.percent = Math.max(0, Math.min(100, Number(job.percent || 0)));
      job.message = "MP4 copy stopped. Partial output was removed.";
      job.updatedAt = Date.now();
      VIDEO_BROWSER_COPY_JOBS.set(job.id, job);
      return;
    }

    job.status = "error";
    job.percent = 100;
    job.error = cleanPublicFfmpegError(err, "MP4 copy failed. Open Tools / Convert and try again.");
    job.message = job.error;
    job.debugMessage = String(err?.message || err);
    job.updatedAt = Date.now();
    VIDEO_BROWSER_COPY_JOBS.set(job.id, job);
  });
}

function controlVideoBrowserCopyJob(jobId: string, action: string) {
  const job = VIDEO_BROWSER_COPY_JOBS.get(jobId);
  if (!job) return { ok: false, error: "MP4 copy job not found." };

  const processRef = VIDEO_BROWSER_COPY_PROCESSES.get(jobId);
  const pid = Number(job.processId || processRef?.pid || 0);
  const status = String(job.status || "");

  if (action === "cancel") {
    if (["done", "error", "cancelled"].includes(status)) {
      return { ok: true, job: normaliseVideoBrowserCopyJob(job) };
    }

    job.cancelRequested = true;
    job.status = "cancelled";
    job.percent = Math.max(0, Math.min(100, Number(job.percent || 0)));
    job.message = "MP4 copy stopped. Partial output was removed.";
    job.updatedAt = Date.now();
    VIDEO_BROWSER_COPY_JOBS.set(jobId, job);

    try {
      if (processRef && !processRef.killed) processRef.kill("SIGTERM");
      else if (pid) process.kill(pid, "SIGTERM");
    } catch {}

    try {
      if (job.outputPath && fs.existsSync(job.outputPath)) fs.unlinkSync(job.outputPath);
    } catch {}

    return { ok: true, job: normaliseVideoBrowserCopyJob(job) };
  }

  if (action === "pause") {
    if (!pid || status !== "running") return { ok: false, error: "This MP4 job is not currently running." };

    try {
      if (process.platform === "win32") {
        spawn("powershell.exe", ["-NoProfile", "-Command", `Suspend-Process -Id ${pid}`], { windowsHide: true });
      } else {
        process.kill(pid, "SIGSTOP");
      }
      job.status = "paused";
      job.message = "MP4 copy paused. Press Resume to continue.";
      job.updatedAt = Date.now();
      VIDEO_BROWSER_COPY_JOBS.set(jobId, job);
      return { ok: true, job: normaliseVideoBrowserCopyJob(job) };
    } catch (err: any) {
      return { ok: false, error: String(err?.message || err) };
    }
  }

  if (action === "resume") {
    if (!pid || status !== "paused") return { ok: false, error: "This MP4 job is not paused." };

    try {
      if (process.platform === "win32") {
        spawn("powershell.exe", ["-NoProfile", "-Command", `Resume-Process -Id ${pid}`], { windowsHide: true });
      } else {
        process.kill(pid, "SIGCONT");
      }
      job.status = "running";
      job.message = "MP4 copy resumed.";
      job.updatedAt = Date.now();
      VIDEO_BROWSER_COPY_JOBS.set(jobId, job);
      return { ok: true, job: normaliseVideoBrowserCopyJob(job) };
    } catch (err: any) {
      return { ok: false, error: String(err?.message || err) };
    }
  }

  return { ok: false, error: "Unknown MP4 copy action." };
}

function validateVideoPathAllowed(filePath: string) {
  const resolved = path.resolve(filePath).toLowerCase();
  const allowed = getVideoLibraryRoots().some((root) => resolved === path.resolve(root).toLowerCase() || resolved.startsWith(`${path.resolve(root).toLowerCase()}${path.sep}`));
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

let audioLibrarySyncTimer: NodeJS.Timeout | null = null;
let videoLibrarySyncTimer: NodeJS.Timeout | null = null;
let libraryPeriodicSyncTimer: NodeJS.Timeout | null = null;
const librarySourceWatchers: fs.FSWatcher[] = [];

function refreshRuntimeAllowedBases() {
  cfg.localAllowedBases = uniqueServerPaths([
    ...getAllEnabledLibrarySourcePaths(),
    ...splitServerPathList(process.env.LOCAL_ALLOWED_BASES || ""),
  ]);

  return cfg.localAllowedBases;
}

function runAudioLibrarySync(reason = "automatic") {
  const result = syncAudioLibraryFromRoots(getAudioLibraryRoots());

  return finishAudioLibrarySync(result, reason);
}

function finishAudioLibrarySync(result: ReturnType<typeof syncAudioLibraryFromRoots>, reason: string) {

  if (result.addedItems.length && reason !== "startup") {
    void backfillMissingAudioLibraryMetadata(result.addedItems).catch((err: any) => {
      console.warn(`[BRMedia Server] audio metadata backfill failed: ${String(err?.message || err)}`);
    });

    void queueWaveformGenerationForItems(result.addedItems, {
      peakCount: DEFAULT_WAVEFORM_PEAKS,
      onlyMissing: true,
    });
  }

  if (result.changed || reason === "startup" || reason === "manual") {
    console.log(
      `[BRMedia Server] audio library sync (${reason}): found ${result.scanned}, added ${result.added}, removed ${result.removed}, total ${result.total}`
    );
  }

  return result;
}

async function runAudioLibrarySyncYielding(reason = "automatic") {
  const result = await syncAudioLibraryFromRootsYielding(getAudioLibraryRoots());
  return finishAudioLibrarySync(result, reason);
}

function runVideoLibrarySync(reason = "automatic") {
  const items = scanVideoLibrary();

  if (reason === "startup" || reason === "manual" || reason === "source change") {
    console.log(`[BRMedia Server] video library sync (${reason}): total ${items.length}`);
  }

  return {
    roots: getVideoLibraryRoots(),
    total: items.length,
    items,
  };
}

function scheduleAudioLibrarySync(reason = "watch", delayMs = 900) {
  if (audioLibrarySyncTimer) clearTimeout(audioLibrarySyncTimer);

  audioLibrarySyncTimer = setTimeout(() => {
    audioLibrarySyncTimer = null;

    void runAudioLibrarySyncYielding(reason).catch((err: any) => {
      logServerCrash("audioLibrarySync", err);
    });
  }, Math.max(0, delayMs));

  if (typeof (audioLibrarySyncTimer as any).unref === "function") {
    (audioLibrarySyncTimer as any).unref();
  }
}

function scheduleVideoLibrarySync(reason = "watch", delayMs = 1200) {
  if (videoLibrarySyncTimer) clearTimeout(videoLibrarySyncTimer);

  videoLibrarySyncTimer = setTimeout(() => {
    videoLibrarySyncTimer = null;

    try {
      runVideoLibrarySync(reason);
    } catch (err: any) {
      logServerCrash("videoLibrarySync", err);
    }
  }, Math.max(0, delayMs));

  if (typeof (videoLibrarySyncTimer as any).unref === "function") {
    (videoLibrarySyncTimer as any).unref();
  }
}

function closeLibrarySourceWatchers() {
  while (librarySourceWatchers.length) {
    const watcher = librarySourceWatchers.pop();
    try { watcher?.close(); } catch {}
  }
}

function refreshLibrarySourceWatchers() {
  closeLibrarySourceWatchers();

  getLibrarySourcesWithStatus()
    .filter((source) => source.enabled && source.watch && source.online && source.readable)
    .forEach((source) => {
      try {
        const watcher = fs.watch(source.path, { recursive: true }, () => {
          if (source.type === "audio" || source.type === "both") {
            scheduleAudioLibrarySync("folder change", 1100);
          }

          if (source.type === "video" || source.type === "both") {
            scheduleVideoLibrarySync("folder change", 1400);
          }
        });

        if (typeof (watcher as any).unref === "function") {
          (watcher as any).unref();
        }

        librarySourceWatchers.push(watcher);
        console.log(`[BRMedia Server] watching ${source.type} library source: ${source.path}`);
      } catch (err: any) {
        console.warn(`[BRMedia Server] could not watch library source ${source.path}: ${String(err?.message || err)}`);
      }
    });

  if (!libraryPeriodicSyncTimer) {
    libraryPeriodicSyncTimer = setInterval(() => {
      scheduleAudioLibrarySync("periodic", 0);
      scheduleVideoLibrarySync("periodic", 0);
    }, 5 * 60 * 1000);

    if (typeof (libraryPeriodicSyncTimer as any).unref === "function") {
      (libraryPeriodicSyncTimer as any).unref();
    }
  }
}

function syncAllLibrarySources(reason = "manual") {
  refreshRuntimeAllowedBases();
  const audio = runAudioLibrarySync(reason);
  const video = runVideoLibrarySync(reason);
  return { audio, video };
}

function autoImportAllowedBases() {
  return syncAllLibrarySources("startup");
}

function resolvePreviewFfmpegPath() {
  const envPath = String(process.env.FFMPEG_PATH || "").trim();
  if (envPath) return envPath;

  const bundledPath = "C:\\ffmpeg-8.0.1\\bin\\ffmpeg.exe";
  if (fs.existsSync(bundledPath)) return bundledPath;

  return process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
}

function splitServerPathList(value: string) {
  return String(value || "")
    .split(/[;,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function uniqueServerPaths(paths: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];

  paths.forEach((entry) => {
    const resolved = path.resolve(entry);
    const key = resolved.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(resolved);
  });

  return out;
}

function getServerFolderTargets() {
  const audioRoots = getAudioLibraryRoots();
  const videoRoots = getVideoLibraryRoots();
  const cloudImportRoots = splitServerPathList(process.env.CLOUD_IMPORT_DIR || path.join(audioRoots[0] || "H:\\Music", "Cloud Imports"));
  const linkImportRoots = splitServerPathList(process.env.LINK_IMPORT_DIR || path.join(audioRoots[0] || "H:\\Music", "Link Imports"));
  const allowedRoots = Array.isArray(cfg.localAllowedBases) ? cfg.localAllowedBases : [];

  return [
    ...audioRoots.map((folderPath) => ({ group: "Audio", label: "Audio library", path: folderPath })),
    ...videoRoots.map((folderPath) => ({ group: "Video", label: "Video library", path: folderPath })),
    ...cloudImportRoots.map((folderPath) => ({ group: "Imports", label: "Cloud imports", path: folderPath })),
    ...linkImportRoots.map((folderPath) => ({ group: "Imports", label: "Direct URL imports", path: folderPath })),
    ...allowedRoots.map((folderPath) => ({ group: "Allowed bases", label: "Allowed local base", path: folderPath })),
  ];
}

function checkServerFolders() {
  const seen = new Set<string>();

  return getServerFolderTargets()
    .filter((target) => {
      const key = path.resolve(target.path).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((target) => {
      const resolved = path.resolve(target.path);
      const result: any = {
        ...target,
        path: resolved,
        exists: false,
        readable: false,
        writable: false,
        ok: false,
        detail: "Not checked",
      };

      try {
        if (!fs.existsSync(resolved)) {
          result.detail = "Folder does not exist";
          return result;
        }

        const stat = fs.statSync(resolved);
        if (!stat.isDirectory()) {
          result.exists = true;
          result.detail = "Path exists, but is not a folder";
          return result;
        }

        result.exists = true;

        try {
          fs.accessSync(resolved, fs.constants.R_OK);
          result.readable = true;
        } catch {}

        try {
          fs.accessSync(resolved, fs.constants.W_OK);
          result.writable = true;
        } catch {}

        result.ok = result.readable && result.writable;
        result.detail = result.ok
          ? "Readable and writable"
          : result.readable
            ? "Readable, but not writable"
            : "Not readable";
      } catch (err: any) {
        result.detail = String(err?.message || err);
      }

      return result;
    });
}

function countLibraryItemsInsideRoot(items: any[], root: string) {
  return items.filter((item) => item?.locator && isPathInsideRoot(item.locator, root)).length;
}

function getLibrarySourcesPayload() {
  const audioItems = listLibrary();
  const videoItems = getVideoLibraryItems();
  const sources = getLibrarySourcesWithStatus().map((source) => ({
    ...source,
    indexedAudio: countLibraryItemsInsideRoot(audioItems, source.path),
    indexedVideo: countLibraryItemsInsideRoot(videoItems, source.path),
  }));

  return {
    ok: true,
    defaults: {
      audio: getDefaultLibrarySourcePath("audio"),
      video: getDefaultLibrarySourcePath("video"),
    },
    allowedBases: cfg.localAllowedBases,
    sources,
  };
}

function refreshLibrarySourcesRuntime(reason = "source change") {
  refreshRuntimeAllowedBases();
  refreshLibrarySourceWatchers();
  const synced = syncAllLibrarySources(reason);
  return { ...getLibrarySourcesPayload(), synced };
}

function countVideoItemsWithMetadata(items: any[]) {
  return items.filter((item) => item?.metadataSource || item?.imdbId || item?.tmdbId || item?.onlineRating).length;
}

function getServerAdminHealth() {
  const audioItems = listLibrary();
  const videoItems = getVideoLibraryItems();
  const waveform = getWaveformCacheHealth(audioItems, DEFAULT_WAVEFORM_PEAKS);
  const folderChecks = checkServerFolders();
  const memory = process.memoryUsage();
  const secretsStatus = getServerSecretsStatus();

  return {
    ok: true,
    checkedAt: new Date().toISOString(),
    port: cfg.port,
    rangeStreaming: cfg.rangeStreaming,
    uptimeSeconds: Math.round(process.uptime()),
    memory: {
      rss: memory.rss,
      heapUsed: memory.heapUsed,
      heapTotal: memory.heapTotal,
    },
    library: {
      audio: audioItems.length,
      video: videoItems.length,
      videoMetadata: countVideoItemsWithMetadata(videoItems),
    },
    waveforms: waveform,
    folders: {
      total: folderChecks.length,
      ok: folderChecks.filter((entry) => entry.ok).length,
      items: folderChecks,
    },
    metadataEnabled: hasVideoMetadataProvider(),
    secrets: {
      total: secretsStatus.length,
      set: secretsStatus.filter((field) => field.isSet).length,
      missing: secretsStatus.filter((field) => !field.isSet).length,
    },
  };
}


function runFfmpegHealthCheck() {
  const ffmpegPath = resolvePreviewFfmpegPath();

  return new Promise<any>((resolve) => {
    const startedAt = Date.now();
    let stdout = "";
    let stderr = "";
    let settled = false;
    let child: any;

    const finish = (payload: any) => {
      if (settled) return;
      settled = true;
      resolve({
        ffmpegPath,
        durationMs: Date.now() - startedAt,
        ...payload,
      });
    };

    try {
      child = spawn(ffmpegPath, ["-version"], { stdio: ["ignore", "pipe", "pipe"] });
    } catch (err: any) {
      finish({ ok: false, status: "failed", detail: String(err?.message || err) });
      return;
    }

    const timer = setTimeout(() => {
      try { child.kill(); } catch {}
      finish({ ok: false, status: "timeout", detail: "FFmpeg check timed out after 6 seconds" });
    }, 6000);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
      if (stdout.length > 4000) stdout = stdout.slice(0, 4000);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
      if (stderr.length > 4000) stderr = stderr.slice(0, 4000);
    });

    child.on("error", (err: Error) => {
      clearTimeout(timer);
      finish({ ok: false, status: "failed", detail: String((err as any)?.message || err) });
    });

    child.on("close", (code: number | null) => {
      clearTimeout(timer);
      const text = `${stdout}\n${stderr}`.trim();
      const firstLine = text.split(/\r?\n/).find(Boolean) || "";
      finish({
        ok: code === 0,
        status: code === 0 ? "ok" : "failed",
        exitCode: code,
        version: firstLine,
        detail: text.slice(0, 900),
      });
    });
  });
}

function rescanAudioLibraryFromAllowedBases() {
  const result = runAudioLibrarySync("manual");

  return {
    ok: true,
    ...result,
    waveformQueued: result.addedItems.length,
  };
}

function rescanVideoLibraryNow() {
  const items = scanVideoLibrary();
  return {
    ok: true,
    roots: getVideoLibraryRoots(),
    count: items.length,
    metadataEnabled: hasVideoMetadataProvider(),
    withMetadata: countVideoItemsWithMetadata(items),
  };
}

async function rebuildMissingVideoMetadataNow() {
  const before = scanVideoLibrary();
  const beforeMatched = countVideoItemsWithMetadata(before);
  const refreshed = await refreshMissingVideoMetadata(before);
  const after = scanVideoLibrary();
  const afterMatched = countVideoItemsWithMetadata(after);

  return {
    ok: true,
    metadataEnabled: hasVideoMetadataProvider(),
    scanned: before.length,
    attempted: Math.min(25, before.filter((item) => !item.metadataSource && !item.onlineRating).length),
    beforeMatched,
    afterMatched,
    improved: Math.max(0, afterMatched - beforeMatched),
    items: refreshed.length,
  };
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

applyServerSecretsToProcessEnv();
const server = http.createServer(async (req, res) => {
  try {
    if (!req.url) {
      return json(res, 400, { error: "Bad request" });
    }

    const corsHandled = applyCors(req, res);
    if (corsHandled) return;

    const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

    const m26StreamHandled = await handleM26MasterStreamRoute(req, res, url);
    if (m26StreamHandled) return;

    if (req.method === "GET" && url.pathname === "/health") {
      return json(res, 200, {
        ok: true,
        port: cfg.port,
        pid: process.pid,
        uptimeSeconds: Math.round((Date.now() - SERVER_STARTED_AT) / 1000),
        memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        rangeStreaming: cfg.rangeStreaming,
        mixxxMasterStreaming: {
          effectiveTransport: mixxxMediaTransport,
          gstreamer: mixxxGStreamerWebRtc.diagnostics(),
          customWebRtc: { ...mixxxWebRtcSidecar.diagnostics(), active: mixxxMediaTransport === "custom-webrtc" && mixxxWebRtcSidecar.diagnostics().state === "running" },
          supported: mixxxMasterCapture.supported(), captureState: mixxxMasterStream.diagnostics().captureState,
          listenerCount: mixxxMasterStream.diagnostics().listenerCount, audioHealthy: mixxxMasterStream.diagnostics().audioHealthy,
          packetsCaptured: mixxxMasterStream.diagnostics().packetsCaptured, nonSilentPacketsCaptured: mixxxMasterStream.diagnostics().nonSilentPacketsCaptured,
          sourcePeak: mixxxMasterStream.diagnostics().sourcePeak, sentFrames: mixxxMasterStream.diagnostics().sentFrames,
          sentBytes: mixxxMasterStream.diagnostics().sentBytes, browser: mixxxMasterStream.diagnostics().browser,
        },
      });
    }

    if (req.method === "GET" && url.pathname === "/profile/me") {
      const context = getCurrentBrMediaProfile(req);
      return json(res, 200, {
        ok: true,
        loggedIn: !!context,
        profile: context ? makeBrMediaPublicProfile(context.user) : null,
      });
    }

    if (req.method === "POST" && url.pathname === "/profile/register") {
      return await registerBrMediaProfile(req, res);
    }

    if (req.method === "POST" && url.pathname === "/profile/login") {
      return await loginBrMediaProfile(req, res);
    }

    if (req.method === "POST" && url.pathname === "/profile/logout") {
      return logoutBrMediaProfile(req, res);
    }

    if (req.method === "GET" && url.pathname === "/profile/state") {
      return getBrMediaProfileState(req, res);
    }

    if (req.method === "POST" && url.pathname === "/profile/state") {
      return await saveBrMediaProfileState(req, res);
    }

    if (req.method === "POST" && url.pathname === "/profile/account") {
      return await updateBrMediaProfileAccount(req, res);
    }

    if (req.method === "POST" && url.pathname === "/profile/avatar") {
      return await saveBrMediaProfileAvatar(req, res);
    }

    if (req.method === "GET" && url.pathname === "/profile/users") {
      return listBrMediaProfileUsers(req, res);
    }

    if (req.method === "GET" && url.pathname === "/profile/inbox") {
      return getBrMediaProfileInbox(req, res);
    }

    if (req.method === "POST" && url.pathname === "/profile/send") {
      return await sendBrMediaProfileMessage(req, res);
    }
			
    if (req.method === "GET" && url.pathname === "/torrent/state") {
      return json(res, 200, await getTorrentStatePayloadLive());
    }

    if (req.method === "POST" && url.pathname === "/torrent/add") {
      const body = await readJsonBody(req).catch(() => ({}));
      const result: any = await addTorrentQueueItemLive(body || {});

      if (result?.ok !== false) {
        appendStatsEvent("torrent_add", "torrents", {
          entityType: "torrent",
          entityId: result?.item?.id || result?.hash || "",
          title:
            result?.item?.name ||
            firstString(
              body?.label ||
              body?.name ||
              body?.input ||
              body?.magnet
            ) ||
            "Torrent",
          status: result?.item?.status || "queued",
          route: "torrents",
        });
      }

      return json(res, 200, result);
    }

    if (req.method === "POST" && url.pathname === "/torrent/upload") {
      const body = await readJsonBody(
        req,
        25 * 1024 * 1024
      ).catch(() => ({}));

      const result: any = await uploadTorrentFileLive(body || {});

      if (result?.ok !== false) {
        appendStatsEvent("torrent_upload", "torrents", {
          entityType: "torrent",
          entityId: result?.item?.id || result?.hash || "",
          title:
            result?.item?.name ||
            firstString(body?.name || body?.fileName) ||
            "Torrent file",
          status: result?.item?.status || "queued",
          route: "torrents",
        });
      }

      return json(res, 200, result);
    }

    if (req.method === "POST" && url.pathname === "/torrent/settings") {
      const body = await readJsonBody(req).catch(() => ({}));
      const saved = updateTorrentSettings(body || {});
      let engineApply: any = null;

      if (body?.applyToEngine) {
        try {
          engineApply = await applyTorrentSettingsToEngine();
        } catch (err: any) {
          engineApply = { ok: false, error: String(err?.message || err) };
        }
      }

      return json(res, 200, { ...saved, engineApply, state: await getTorrentStatePayloadLive() });
    }

    if (req.method === "POST" && url.pathname === "/torrent/engine/test") {
      return json(res, 200, await testTorrentEngineConnection());
    }

    if (req.method === "POST" && url.pathname === "/torrent/engine/sync-local") {
      return json(res, 200, await getTorrentStatePayloadLive());
    }

    if (req.method === "GET" && url.pathname === "/torrent/transfer-jobs") {
      return json(res, 200, { ok: true, jobs: listTorrentTransferJobs() });
    }

    if (req.method === "GET" && url.pathname.startsWith("/torrent/transfer-jobs/")) {
      const jobId = decodeURIComponent(url.pathname.replace("/torrent/transfer-jobs/", "").trim());
      const job = TORRENT_LIBRARY_HANDOFF_JOBS.get(jobId);
      if (!job) return json(res, 404, { error: "Torrent transfer job not found" });
      return json(res, 200, { ok: true, job: normaliseTorrentTransferJob(job) });
    }
			
    if ((req.method === "GET" || req.method === "HEAD") && url.pathname.startsWith("/torrent/items/") && url.pathname.endsWith("/files/download")) {
      const parts = url.pathname.split("/").filter(Boolean);
      const id = decodeURIComponent(parts[2] || "");
      const fileId = firstString(url.searchParams.get("fileId")) || "0";
      return await streamQbitTorrentFile(req, res, id, fileId);
    }

    if (req.method === "GET" && url.pathname.startsWith("/torrent/items/") && url.pathname.endsWith("/pieces")) {
      const parts = url.pathname.split("/").filter(Boolean);
      const id = decodeURIComponent(parts[2] || "");
      return json(res, 200, await getQbitTorrentPieces(id));
    }

    if (req.method === "GET" && url.pathname.startsWith("/torrent/items/") && url.pathname.endsWith("/files")) {
      const parts = url.pathname.split("/").filter(Boolean);
      const id = decodeURIComponent(parts[2] || "");
      return json(res, 200, await getQbitTorrentFiles(id));
    }

    if (req.method === "POST" && url.pathname.startsWith("/torrent/items/") && url.pathname.endsWith("/files/priority")) {
      const parts = url.pathname.split("/").filter(Boolean);
      const id = decodeURIComponent(parts[2] || "");
      const body = await readJsonBody(req).catch(() => ({}));
      return json(res, 200, await setQbitTorrentFilePriority(id, body?.fileIds ?? body?.fileId, body?.priority));
    }

    if (req.method === "POST" && url.pathname.startsWith("/torrent/items/") && url.pathname.endsWith("/files/library")) {
      const parts = url.pathname.split("/").filter(Boolean);
      const id = decodeURIComponent(parts[2] || "");
      const body = await readJsonBody(req).catch(() => ({}));
      return json(res, 200, await handoffTorrentFileToLibrary(id, body || {}));
    }
		
    if (req.method === "GET" && url.pathname === "/torrent/security/history") {
      return json(res, 200, getTorrentSecurityHistoryPayload());
    }

    if (req.method === "GET" && url.pathname === "/torrent/security/defender/status") {
      return json(res, 200, getTorrentDefenderStatusPayload());
    }

    if (req.method === "GET" && url.pathname === "/torrent/security/defender/jobs") {
      return json(res, 200, { ok: true, jobs: listTorrentDefenderJobs() });
    }

    if (req.method === "GET" && url.pathname.startsWith("/torrent/security/defender/jobs/")) {
      const id = decodeURIComponent(url.pathname.replace("/torrent/security/defender/jobs/", "").trim());
      const job = TORRENT_DEFENDER_SCAN_JOBS.get(id);
      return job
        ? json(res, 200, { ok: true, job: normaliseTorrentDefenderJob(job) })
        : json(res, 404, { ok: false, error: "Microsoft Defender scan job not found." });
    }

    if (req.method === "POST" && url.pathname === "/torrent/security/defender/scan") {
      const body = await readJsonBody(req).catch(() => ({}));
      return json(res, 200, startTorrentDefenderScan(body || {}));
    }

    if (req.method === "POST" && url.pathname === "/torrent/quarantine/open-folder") {
      return json(
        res,
        200,
        openTorrentQuarantineFolder()
      );
    }

    if (
      req.method === "POST" &&
      url.pathname.startsWith("/torrent/quarantine/") &&
      url.pathname.endsWith("/restore")
    ) {
      const id = decodeURIComponent(
        url.pathname
          .replace("/torrent/quarantine/", "")
          .replace("/restore", "")
          .trim()
      );

      return json(
        res,
        200,
        restoreTorrentQuarantineItem(id)
      );
    }

    if (
      req.method === "POST" &&
      url.pathname.startsWith("/torrent/quarantine/") &&
      url.pathname.endsWith("/delete")
    ) {
      const id = decodeURIComponent(
        url.pathname
          .replace("/torrent/quarantine/", "")
          .replace("/delete", "")
          .trim()
      );

      return json(
        res,
        200,
        deleteTorrentQuarantineItem(id)
      );
    }

    if (
      req.method === "GET" &&
      url.pathname.startsWith("/torrent/items/") &&
      url.pathname.endsWith("/trackers")
    ) {
      const id = decodeURIComponent(
        url.pathname
          .replace("/torrent/items/", "")
          .replace("/trackers", "")
          .trim()
      );

      return json(
        res,
        200,
        await getQbitTorrentTrackers(id)
      );
    }

    if (
      req.method === "GET" &&
      url.pathname.startsWith("/torrent/items/") &&
      url.pathname.endsWith("/peers")
    ) {
      const id = decodeURIComponent(
        url.pathname
          .replace("/torrent/items/", "")
          .replace("/peers", "")
          .trim()
      );

      return json(
        res,
        200,
        await getQbitTorrentPeers(id)
      );
    }

    if (
      req.method === "POST" &&
      url.pathname.startsWith("/torrent/items/") &&
      url.pathname.endsWith("/open-folder")
    ) {
      const id = decodeURIComponent(
        url.pathname
          .replace("/torrent/items/", "")
          .replace("/open-folder", "")
          .trim()
      );

      return json(
        res,
        200,
        await openTorrentDownloadFolder(id)
      );
    }

    if (
      req.method === "POST" &&
      url.pathname.startsWith("/torrent/items/") &&
      url.pathname.endsWith("/scan-downloads")
    ) {
      const id = decodeURIComponent(
        url.pathname
          .replace("/torrent/items/", "")
          .replace("/scan-downloads", "")
          .trim()
      );

      return json(
        res,
        200,
        await scanQbitTorrentDownloadedFiles(id)
      );
    }

    if (
      req.method === "POST" &&
      url.pathname.startsWith("/torrent/items/") &&
      url.pathname.endsWith("/quarantine")
    ) {
      const id = decodeURIComponent(
        url.pathname
          .replace("/torrent/items/", "")
          .replace("/quarantine", "")
          .trim()
      );

      const body =
        await readJsonBody(req)
          .catch(() => ({}));

      return json(
        res,
        200,
        await quarantineQbitTorrentFiles(
          id,
          body || {}
        )
      );
    }

    if (req.method === "POST" && url.pathname.startsWith("/torrent/items/")) {
      const parts = url.pathname.split("/").filter(Boolean);
      const id = decodeURIComponent(parts[2] || "");
      const action = decodeURIComponent(parts[3] || "");
      const body = await readJsonBody(req).catch(() => ({}));
      return json(res, 200, await updateTorrentQueueItemLive(id, action, body || {}));
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
		
    if (req.method === "GET" && url.pathname === "/stats/events") {
      const limit = Number(
        url.searchParams.get("limit") || 250
      );

      return json(res, 200, {
        ok: true,
        events: readRecentStatsEvents(limit),
      });
    }
		
    if (req.method === "GET" && url.pathname === "/stats/events/status") {
      return json(
        res,
        200,
        getStatsEventsStatus()
      );
    }

    if (req.method === "GET" && url.pathname === "/stats/events/summary") {
      const limit = Number(
        url.searchParams.get("limit") || 5000
      );

      return json(
        res,
        200,
        buildStatsEventsSummary(limit)
      );
    }

    if (req.method === "POST" && url.pathname === "/stats/events") {
      const body = await readJsonBody(req).catch(() => null);

      if (!body || typeof body !== "object") {
        return json(res, 400, {
          error: "Invalid Stats event payload",
        });
      }

      return json(
        res,
        200,
        appendStatsEvents(
          {
            ...body,
            events: (
              Array.isArray(body?.events)
                ? body.events
                : [body]
            ).map((event: any) => ({
              ...event,
              profileId:
                event?.profileId ||
                getCurrentBrMediaProfile(req)?.user?.id ||
                "",
            })),
          },
          "browser"
        )
      );
    }
		
    if (req.method === "GET" && url.pathname === "/profile/stats") {
      const context = getCurrentBrMediaProfile(req);

      if (!context) {
        return json(res, 401, {
          ok: false,
          error: "Not logged in.",
        });
      }

      return json(
        res,
        200,
        buildProfileStatsSummary(
          context.user.id,
          Number(url.searchParams.get("limit") || 5000)
        )
      );
    }
		
    if (req.method === "GET" && url.pathname === "/player/runtime-state") {
      return json(res, 200, {
        ok: true,
        state: readPlayerRuntimeState(),
      });
    }

    if (req.method === "GET" && url.pathname === "/player/events") {
      const limit = Number(url.searchParams.get("limit") || 100);
      return json(res, 200, {
        ok: true,
        events: readRecentPlayerEvents(limit),
      });
    }

    if (req.method === "POST" && url.pathname === "/player/events") {
      const body = await readJsonBody(req).catch(() => null);
      if (!body || typeof body !== "object") {
        return json(res, 400, { error: "Invalid player event payload" });
      }

      return json(
        res,
        200,
        appendPlayerEvents(
          body,
          getCurrentBrMediaProfile(req)?.user?.id || ""
        )
      );
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

      appendStatsEvent("backup_export", "server", {
        entityType: "backup",
        title: "BRMedia backup export",
        status: "done",
        route: "settings",
        value: sections.length,
        extra: {
          sections: sections.join(", "),
        },
      });

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

      appendStatsEvent("backup_restore", "server", {
        entityType: "backup",
        title: "BRMedia backup restore",
        status: "done",
        route: "settings",
        value:
          Number(restored.libraryManifest || 0) +
          Number(restored.tracklists || 0) +
          Number(restored.waveforms || 0),
        extra: {
          libraryManifest: restored.libraryManifest,
          tracklists: restored.tracklists,
          waveforms: restored.waveforms,
        },
      });

      return json(res, 200, {
        ok: true,
        restored,
      });
    }
		
    if (req.method === "GET" && url.pathname === "/server-settings/library-sources/browse") {
      try {
        return json(res, 200, browseServerFolders(firstString(url.searchParams.get("path")) || ""));
      } catch (err: any) {
        return json(res, 400, { ok: false, error: String(err?.message || err) });
      }
    }

    if (req.method === "GET" && url.pathname === "/server-settings/library-sources") {
      return json(res, 200, getLibrarySourcesPayload());
    }

    if (req.method === "POST" && url.pathname === "/server-settings/library-sources/sync-all") {
      return json(res, 200, refreshLibrarySourcesRuntime("manual"));
    }

    if (req.method === "POST" && url.pathname === "/server-settings/library-sources") {
      try {
        const body = await readJsonBody(req).catch(() => ({}));
        const previous = body?.id ? getLibrarySourceById(String(body.id)) : null;
        const saved = upsertLibrarySource(body || {});
        const changedPath = previous && path.resolve(previous.path).toLowerCase() !== path.resolve(saved.source.path).toLowerCase();
        const disabled = previous?.enabled && !saved.source.enabled;
        const noLongerAudio = previous &&
          (previous.type === "audio" || previous.type === "both") &&
          !(saved.source.type === "audio" || saved.source.type === "both");

        if (previous && (changedPath || disabled || noLongerAudio) && (previous.type === "audio" || previous.type === "both")) {
          removeLibraryItemsUnderRoot(previous.path);
        }

        return json(res, 200, { ...refreshLibrarySourcesRuntime("source change"), saved: saved.source });
      } catch (err: any) {
        return json(res, 400, { ok: false, error: String(err?.message || err) });
      }
    }

    if (req.method === "POST" && url.pathname.startsWith("/server-settings/library-sources/") && url.pathname.endsWith("/sync")) {
      const id = decodeURIComponent(url.pathname.replace("/server-settings/library-sources/", "").replace("/sync", "").trim());
      const source = getLibrarySourceById(id);
      if (!source) return json(res, 404, { ok: false, error: "Library source not found." });
      return json(res, 200, refreshLibrarySourcesRuntime("manual"));
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/server-settings/library-sources/")) {
      try {
        const id = decodeURIComponent(url.pathname.replace("/server-settings/library-sources/", "").trim());
        const source = getLibrarySourceById(id);
        if (!source) return json(res, 404, { ok: false, error: "Library source not found." });
        const removed = removeLibrarySource(id);

        if (source.type === "audio" || source.type === "both") {
          removeLibraryItemsUnderRoot(source.path);
        }

        return json(res, 200, { ...refreshLibrarySourcesRuntime("source change"), removed: removed.removed });
      } catch (err: any) {
        return json(res, 400, { ok: false, error: String(err?.message || err) });
      }
    }
		
    if (req.method === "GET" && url.pathname === "/server-settings/admin/health") {
      return json(res, 200, getServerAdminHealth());
    }

    if (req.method === "POST" && url.pathname === "/server-settings/admin/ffmpeg-check") {
      return json(res, 200, await runFfmpegHealthCheck());
    }

    if (req.method === "POST" && url.pathname === "/server-settings/admin/folder-check") {
      return json(res, 200, {
        ok: true,
        items: checkServerFolders(),
      });
    }

    if (req.method === "POST" && url.pathname === "/server-settings/admin/rescan-audio") {
      const result = rescanAudioLibraryFromAllowedBases();

      appendStatsEvent("audio_rescan", "server", {
        entityType: "library_admin",
        title: "Audio library rescan",
        status: "done",
        route: "server-settings",
        value: result.scanned,
        extra: {
          scanned: result.scanned,
          added: result.added,
          removed: result.removed,
          updated: result.updated,
          waveformQueued: result.waveformQueued,
        },
      });

      return json(res, 200, result);
    }

    if (req.method === "POST" && url.pathname === "/server-settings/admin/rescan-video") {
      const result = rescanVideoLibraryNow();

      appendStatsEvent("video_rescan", "server", {
        entityType: "library_admin",
        title: "Video library rescan",
        status: "done",
        route: "server-settings",
        value: result.count,
        extra: {
          count: result.count,
          withMetadata: result.withMetadata,
        },
      });

      return json(res, 200, result);
    }

    if (req.method === "POST" && url.pathname === "/server-settings/admin/rebuild-video-metadata") {
      const result = await rebuildMissingVideoMetadataNow();

      appendStatsEvent("video_metadata_rebuild", "server", {
        entityType: "library_admin",
        title: "Video metadata rebuild",
        status: "done",
        route: "server-settings",
        value: result.improved,
        extra: {
          scanned: result.scanned,
          attempted: result.attempted,
          beforeMatched: result.beforeMatched,
          afterMatched: result.afterMatched,
          improved: result.improved,
        },
      });

      return json(res, 200, result);
    }

    if (req.method === "GET" && url.pathname === "/server-settings/secrets") {
      return json(res, 200, {
        ok: true,
        status: getServerSecretsStatus(),
      });
    }

    if (req.method === "POST" && url.pathname === "/server-settings/secrets") {
      const body = await readJsonBody(req).catch(() => ({}));
      return json(res, 200, saveServerSecretsFromBody(body || {}));
    }

    if (req.method === "POST" && url.pathname === "/server-settings/secrets/clear") {
      const body = await readJsonBody(req).catch(() => ({}));
      return json(res, 200, clearServerSecretsFromBody(body || {}));
    }
		
    if (req.method === "GET" && url.pathname === "/library/support-files") {
      return json(res, 200, {
        ok: true,
        items: listMobileSupportFiles(),
      });
    }

    if (
      (req.method === "GET" || req.method === "HEAD") &&
      url.pathname.startsWith("/library/support-files/") &&
      url.pathname.endsWith("/download")
    ) {
      const id = decodeURIComponent(
        url.pathname
          .replace("/library/support-files/", "")
          .replace(/\/download$/, "")
          .trim()
      );

      const item =
        findMobileSupportFileById(id);

      if (!item) {
        return json(res, 404, { error: "Supporting file not found" });
      }

      streamFileWithRange(req, res, item.locator, {
        asAttachment: true,
        downloadName: item.fileName,
      });
      return;
    }

    if (
      req.method === "DELETE" &&
      url.pathname.startsWith("/library/support-files/")
    ) {
      const id = decodeURIComponent(
        url.pathname
          .replace("/library/support-files/", "")
          .trim()
      );

      const item =
        findMobileSupportFileById(id);

      if (!item) {
        return json(res, 404, { error: "Supporting file not found" });
      }

      fs.unlinkSync(item.locator);

      if (item.supportType === "tracklist") {
        invalidateTracklistAttachmentFilesCache();
      }

      appendStatsEvent("support_file_delete", "imports", {
        entityType: "support_file",
        entityId: item.id,
        title: item.fileName,
        status: "done",
        route: "settings",
      });

      return json(res, 200, {
        ok: true,
        item,
      });
    }

    if (req.method === "POST" && url.pathname === "/library/upload-mobile") {
      const body = await readJsonBody(req).catch(() => null);
      const files = Array.isArray(body?.files) ? body.files : [];

      if (!files.length) {
        return json(res, 400, { error: "Pick at least one upload file" });
      }

      const result =
        await handleMobileUpload(
          files,
          body?.target || "auto"
        );

      appendStatsEvent("media_upload", "imports", {
        entityType: "media",
        title: `${result.savedFiles} uploaded file${result.savedFiles === 1 ? "" : "s"}`,
        count: result.savedFiles,
        status: "done",
        route: "settings",
      });

      return json(res, 200, {
        ok: true,
        savedFiles: result.savedFiles,
        addedItems: result.addedItems,
      });
    }
		
    if (req.method === "POST" && url.pathname === "/library/upload-mobile-file") {
      const fileName =
        firstString(
          url.searchParams.get("name")
        ) || "upload.bin";

      const target =
        firstString(
          url.searchParams.get("target")
        ) || "auto";

      const buffer =
        await readBufferBody(req);

      if (!buffer.length) {
        return json(res, 400, { error: "Empty upload body" });
      }

      const result =
        await handleSingleMobileUpload(
          fileName,
          buffer,
          target
        );

      appendStatsEvent("media_upload", "imports", {
        entityType: result.kind || "media",
        entityId: result.item?.id || "",
        title: fileName,
        count: result.savedFiles,
        status: "done",
        route: "settings",
      });

      return json(res, 200, {
        ok: true,
        savedFiles: result.savedFiles,
        addedItems: result.addedItems,
        item: result.item,
        kind: result.kind,
        supportType: result.supportType,
        supportItem: result.supportItem,
        tracklistReady: result.tracklistReady,
        savedPath: result.savedPath,
        savedName: result.savedName,
        openUrl: result.openUrl,
        viewFilesUrl: result.viewFilesUrl,
      });
    }
		
    if (req.method === "GET" && url.pathname === "/video/events") {
      const limit = Number(url.searchParams.get("limit") || 100);
      return json(res, 200, {
        ok: true,
        events: readRecentVideoEvents(limit),
      });
    }

    if (req.method === "POST" && url.pathname === "/video/events") {
      const body = await readJsonBody(req).catch(() => null);
      if (!body || typeof body !== "object") {
        return json(res, 400, { error: "Invalid video event payload" });
      }

      return json(
        res,
        200,
        appendVideoEvents(
          body,
          getCurrentBrMediaProfile(req)?.user?.id || ""
        )
      );
    }
		
    if (req.method === "POST" && url.pathname === "/video-metadata/search") {
      const body = await readJsonBody(req).catch(() => ({}));
      const results = await searchVideoMetadataMatches(body || {});
      return json(res, 200, { ok: true, results });
    }
		
    if (req.method === "POST" && url.pathname === "/video-library/metadata/auto-refresh") {
      const body = await readJsonBody(req).catch(() => ({}));
      const limit = Math.max(1, Math.min(30, Number(body?.limit || 3)));
      return json(res, 200, await autoRefreshVideoMetadataNow(limit));
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
        roots: getVideoLibraryRoots(),
        metadataEnabled: hasVideoMetadataProvider(),
        count: items.length,
        items,
      });
    }

    if (req.method === "POST" && url.pathname.startsWith("/video-library/") && url.pathname.endsWith("/metadata")) {
      const id = decodeURIComponent(url.pathname.replace("/video-library/", "").replace("/metadata", "").trim());
      const body = await readJsonBody(req).catch(() => ({}));
      const force = url.searchParams.get("refresh") === "1";
      const rich = url.searchParams.get("rich") === "1" || body?.rich === true;
      const item = await refreshVideoItemMetadata(id, force, rich);
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
		
    if (req.method === "POST" && url.pathname.startsWith("/video-library/") && url.pathname.endsWith("/metadata/apply")) {
      const id = decodeURIComponent(url.pathname.replace("/video-library/", "").replace("/metadata/apply", "").trim());
      const body = await readJsonBody(req).catch(() => ({}));
      const item = await saveVideoMetadataPatchWithRichRefresh(id, body || {});
      if (!item) return json(res, 404, { error: "Video not found" });
      return json(res, 200, { ok: true, item });
    }

    if (req.method === "POST" && url.pathname.startsWith("/video-library/") && url.pathname.endsWith("/poster-url")) {
      const id = decodeURIComponent(url.pathname.replace("/video-library/", "").replace("/poster-url", "").trim());
      const body = await readJsonBody(req).catch(() => ({}));
      const item = saveVideoPosterUrl(id, body?.posterUrl || "");
      if (!item) return json(res, 404, { error: "Video not found" });
      return json(res, 200, { ok: true, item });
    }

    if (req.method === "POST" && url.pathname.startsWith("/video-library/") && url.pathname.endsWith("/poster-upload")) {
      const id = decodeURIComponent(url.pathname.replace("/video-library/", "").replace("/poster-upload", "").trim());
      const fileName = firstString(url.searchParams.get("name")) || "poster.jpg";
      const buffer = await readBufferBody(req);
      const item = saveVideoPosterUpload(id, fileName, buffer);
      if (!item) return json(res, 404, { error: "Video not found" });
      return json(res, 200, { ok: true, item });
    }
		
    if (req.method === "GET" && url.pathname === "/video-library-hidden") {
      return json(res, 200, {
        ok: true,
        items: listHiddenVideoLibraryItems(),
      });
    }

    if (
      req.method === "POST" &&
      url.pathname.startsWith("/video-library-hidden/") &&
      url.pathname.endsWith("/restore")
    ) {
      const id = decodeURIComponent(
        url.pathname
          .replace("/video-library-hidden/", "")
          .replace("/restore", "")
          .trim()
      );

      const result = restoreHiddenVideoLibraryItem(id);

      if (!result) {
        return json(res, 404, {
          error: "Hidden video not found",
        });
      }

      return json(res, 200, result);
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/video-library/")) {
      const id = decodeURIComponent(url.pathname.replace("/video-library/", "").trim());
      const mode = url.searchParams.get("mode") === "library" ? "library" : "physical";
      const result = removeVideoLibraryItem(id, mode);
      if (!result) return json(res, 404, { error: "Video not found" });
      return json(res, 200, result);
    }

    if (req.method === "POST" && url.pathname.startsWith("/video-library/") && url.pathname.endsWith("/browser-copy")) {
      const id = decodeURIComponent(url.pathname.replace("/video-library/", "").replace("/browser-copy", "").trim());
      const body = await readJsonBody(req).catch(() => ({}));
      const job = startVideoBrowserCopyJob(id, body || {});
      if (!job) return json(res, 404, { error: "Video not found" });
      return json(res, 202, { ok: true, job });
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
      streamFileWithRange(req, res, item.locator, { mimeType: item.mimeType || getVideoMimeType(item.locator), maxChunkBytes: 8 * 1024 * 1024 });
      return;
    }
		
    if (req.method === "GET" && url.pathname === "/video-browser-copy-jobs") {
      return json(res, 200, {
        ok: true,
        jobs: listVideoBrowserCopyJobs(),
      });
    }

    if (req.method === "POST" && url.pathname.startsWith("/video-browser-copy-jobs/") && url.pathname.endsWith("/control")) {
      const jobId = decodeURIComponent(url.pathname.replace("/video-browser-copy-jobs/", "").replace("/control", "").trim());
      const body = await readJsonBody(req).catch(() => ({}));
      return json(res, 200, controlVideoBrowserCopyJob(jobId, firstString(body?.action) || ""));
    }

    if (req.method === "GET" && url.pathname.startsWith("/video-browser-copy-jobs/")) {
      const jobId = decodeURIComponent(url.pathname.replace("/video-browser-copy-jobs/", "").trim());
      const job = VIDEO_BROWSER_COPY_JOBS.get(jobId);
      if (!job) return json(res, 404, { error: "Video browser copy job not found" });
      return json(res, 200, { ok: true, job: normaliseVideoBrowserCopyJob(job) });
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

      appendStatsEvent("tagger_tags_saved", "tagger", {
        entityType: "audio",
        entityId: firstString(body?.trackId || body?.id) || "",
        title: firstString(
          body?.tags?.title ||
          body?.title
        ) || "Audio tags saved",
        status: "done",
        route: "tagger",
      });

      return json(res, 200, result);
    }

    if (req.method === "POST" && url.pathname === "/brmedia/tagger/write-copy") {
      const body = await readJsonBody(req).catch(() => null);
      const result = await writeBrMediaTaggedCopy(body || {});

      if (!result.ok) {
        return json(res, 400, { error: result.error || "Could not write tagged copy" });
      }

      appendStatsEvent("tagger_copy_written", "tagger", {
        entityType: "audio",
        entityId: firstString(body?.trackId || body?.id) || "",
        title: firstString(
          body?.tags?.title ||
          body?.title ||
          result?.fileName
        ) || "Tagged copy written",
        status: "done",
        route: "tagger",
      });

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
		
    if (req.method === "GET" && url.pathname === "/brmedia/mastering/jobs") {
      return json(res, 200, {
        ok: true,
        jobs: listPublicMasteringJobs(),
      });
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
		
    if (req.method === "GET" && url.pathname === "/brmedia/converter/jobs") {
      return json(res, 200, {
        ok: true,
        jobs: listPublicConverterJobs(),
      });
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
		
    if (req.method === "POST" && url.pathname.startsWith("/library/") && url.pathname.endsWith("/quick-edit")) {
      const id = decodeURIComponent(url.pathname.replace("/library/", "").replace("/quick-edit", "").trim());
      if (!id) return json(res, 400, { error: "Missing track id" });

      const body = await readJsonBody(req).catch(() => ({}));
      const result = quickEditAudioLibraryItem(id, body || {});

      if (!result.ok) {
        return json(res, result.status || 400, { error: result.error || "Quick edit failed" });
      }

      return json(res, 200, result);
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
      (
        req.method === "GET" ||
        req.method === "HEAD"
      ) &&
      url.pathname.startsWith(
        "/dj-performance/"
      )
    ) {
      return json(
        res,
        410,
        {
          error:
            "DJ performance copies are disabled. Load the original library audio stream instead.",
        }
      );
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
    const DJ_STATIC_DIAGNOSTIC_LOG = path.join(PLAYER_RUNTIME_STATE_DIR, "dj-static-request-diagnostics.jsonl");

    function logDjStaticResolution(details: Record<string, unknown>) {
      try {
        ensurePlayerRuntimeStateDir();
        fs.appendFileSync(DJ_STATIC_DIAGNOSTIC_LOG, `${JSON.stringify({
          at: new Date().toISOString(),
          host: req.headers.host || null,
          method: req.method || null,
          rawUrl: req.url || null,
          pathname: url.pathname,
          search: url.search,
          userAgent: req.headers["user-agent"] || null,
          forwardedHost: req.headers["x-forwarded-host"] || null,
          forwardedProto: req.headers["x-forwarded-proto"] || null,
          forwardedFor: req.headers["x-forwarded-for"] || null,
          remoteAddress: req.socket.remoteAddress || null,
          ...details,
        })}\n`, "utf8");
      } catch {}
    }

    function sendFile(filePath: string, contentType: string) {
      if (!fs.existsSync(filePath)) return false;
      try {
        if (!fs.statSync(filePath).isFile()) return false;
      } catch {
        return false;
      }

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

    // Safari retained this exact truncated DJ Performance path. Redirect only
    // that observed alias so the canonical document remains the sole entry URL.
    if (req.method === "GET" && url.pathname === "/dj-mixer/performan") {
      logDjStaticResolution({
        relativePath: "performan", safeRelativePath: "performan", publicDir: PUBLIC_DIR,
        resolvedPath: path.join(PUBLIC_DIR, "dj-mixer", "performance.html"), exists: true, isFile: true,
        resolverFailure: "canonical-truncated-safari-path", responseStatus: 302,
        responseContentType: "text/plain; charset=utf-8",
      });
      res.statusCode = 302;
      res.setHeader("Location", "/dj-mixer/performance.html");
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Redirecting to DJ Performance");
      return;
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

    function sendAppManifest(startUrl: string, name: string, extra: Record<string, any> = {}) {
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
            src: "/shared/branding/logos/icon-192.png?v=20260510-i5",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/shared/branding/logos/icon-512.png?v=20260510-i5",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
        ...extra,
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
      "/torrents/site.webmanifest": {
        startUrl: "/torrents?v=20260523",
        name: "BRMedia Torrents",
      },
      "/dj-mixer/site.webmanifest": {
        startUrl: "/dj-mixer?v=20260630-dj-restart-template",
        name: "BRMedia DJ Studio",
      },
      "/profile/site.webmanifest": {
        startUrl: "/profile?v=20260601",
        name: "BRMedia Profile",
      },
    };

    if (req.method === "GET" && appManifestRouteMap[url.pathname]) {
      const manifest = appManifestRouteMap[url.pathname];

      if (url.pathname === "/torrents/site.webmanifest") {
        return sendAppManifest(manifest.startUrl, manifest.name, {
          shortcuts: [
            {
              name: "Add torrent",
              short_name: "Add",
              description: "Open BRMedia Torrents ready to add a magnet link or .torrent file.",
              url: "/torrents?tab=add",
              icons: [{ src: "/shared/branding/logos/icon-192.png?v=20260510-i5", sizes: "192x192" }],
            },
          ],
          protocol_handlers: [
            {
              protocol: "magnet",
              url: "/torrents?source=protocol&magnet=%s",
            },
            {
              protocol: "web+brmedia-torrent",
              url: "/torrents?source=protocol&magnet=%s",
            },
          ],
        });
      }

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
      "torrents",
      "dj-mixer",
      "profile",
    ]);

    const publicAssetRoot = url.pathname.split("/").filter(Boolean)[0] || "";

    if (req.method === "GET" && publicAssetFolders.has(publicAssetRoot) && url.pathname.startsWith(`/${publicAssetRoot}/`) && url.pathname !== `/${publicAssetRoot}/`) {
      const rel = url.pathname.replace(`/${publicAssetRoot}/`, "");
      const safe = rel.replace(/^(\.\.(\/|\\|$))+/, "");
      const p = path.join(PUBLIC_DIR, publicAssetRoot, safe);
      const contentType = contentTypeFor(p);
      const exists = fs.existsSync(p);
      let isFile = false;
      let resolverFailure: string | null = exists ? null : "not-found";
      if (exists) {
        try { isFile = fs.statSync(p).isFile(); if (!isFile) resolverFailure = "not-a-file"; }
        catch (error) { resolverFailure = `stat-error:${String((error as any)?.code || (error as any)?.message || error)}`; }
      }
      if (publicAssetRoot === "dj-mixer") logDjStaticResolution({
        relativePath: rel, safeRelativePath: safe, publicDir: PUBLIC_DIR, resolvedPath: p,
        exists, isFile, resolverFailure, responseStatus: exists && isFile ? 200 : 404,
        responseContentType: exists && isFile ? contentType : "application/json; charset=utf-8",
      });
      if (sendFile(p, contentType)) return;
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
        fallbackToModules: false,
        title: "BRMedia Converter",
        appleTitle: "Converter",
        manifestHref: "/converter/site.webmanifest?v=20260505",
      },
      "/tagger": {
        key: "tagger",
        folder: "tagger",
        fallbackToModules: false,
        title: "BRMedia Tagger",
        appleTitle: "Tagger",
        manifestHref: "/tagger/site.webmanifest?v=20260505",
      },
      "/mastering": {
        key: "mastering",
        folder: "mastering",
        fallbackToModules: false,
        title: "BRMedia Mastering",
        appleTitle: "Mastering",
        manifestHref: "/mastering/site.webmanifest?v=20260505",
      },
      "/video-player": {
        key: "video-player",
        folder: "video-player",
        fallbackToModules: false,
        title: "BRMedia Video Player",
        appleTitle: "Video",
        manifestHref: "/video-player/site.webmanifest?v=20260505",
      },
      "/stats": {
        key: "stats",
        folder: "stats",
        fallbackToModules: false,
        title: "BRMedia Stats",
        appleTitle: "Stats",
        manifestHref: "/stats/site.webmanifest?v=20260505",
      },
      "/server-settings": {
        key: "server-settings",
        folder: "server-settings",
        fallbackToModules: false,
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
      "/torrents": {
        key: "torrents",
        folder: "torrents",
        fallbackToModules: false,
        title: "BRMedia Torrents",
        appleTitle: "Torrents",
        manifestHref: "/torrents/site.webmanifest?v=20260523",
      },
      "/dj-mixer": {
        key: "dj-mixer",
        folder: "dj-mixer",
        fallbackToModules: false,
        title: "BRMedia DJ Studio",
        appleTitle: "DJ Studio",
        manifestHref: "/dj-mixer/site.webmanifest?v=20260630-dj-restart-template",
      },
      "/profile": {
        key: "profile",
        folder: "profile",
        fallbackToModules: false,
        title: "BRMedia Profile",
        appleTitle: "Profile",
        manifestHref: "/profile/site.webmanifest?v=20260530",
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
		
    if (req.method === "GET" && url.pathname === "/tracklist-files") {
      return json(res, 200, {
        ok: true,
        items: listAvailableTracklistAttachmentFiles(url.searchParams.get("refresh") === "1"),
      });
    }

    if (req.method === "POST" && url.pathname.startsWith("/tracklist-attach-existing/")) {
      const id = decodeURIComponent(url.pathname.replace("/tracklist-attach-existing/", "").trim());
      if (!id) return json(res, 400, { error: "Missing id" });

      const item = getLibraryItem(id);
      if (!item) return json(res, 404, { error: "Not found" });
      if (item.source !== "local") return json(res, 501, { error: "Source not implemented yet" });

      const body = await readJsonBody(req).catch(() => ({}));
      const sourcePath = firstString(body?.path) || "";
      const result = attachExistingTracklistFileToItem(item, sourcePath);

      return json(res, 200, result);
    }

    if (req.method === "POST" && url.pathname.startsWith("/tracklist-attach/")) {
      const id = decodeURIComponent(url.pathname.replace("/tracklist-attach/", "").trim());
      if (!id) return json(res, 400, { error: "Missing id" });

      const item = getLibraryItem(id);
      if (!item) return json(res, 404, { error: "Not found" });
      if (item.source !== "local") return json(res, 501, { error: "Source not implemented yet" });

      const allowed = validateLocalPathAllowed(item.locator, cfg.localAllowedBases);
      if (!allowed.ok) return json(res, 403, { error: allowed.reason });

      const fileName = firstString(url.searchParams.get("name")) || "tracklist.txt";
      const buffer = await readBufferBody(req);

      if (!buffer.length) {
        return json(res, 400, { error: "Empty tracklist file" });
      }

      return json(res, 200, writeTracklistAttachmentDataForItem(item, fileName, buffer));
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

          const responseBody = {
            id: item.id,
            duration: payload.duration,
            peaks: payload.peaks,
            bands: payload.bands,
            multiscale: payload.multiscale || null,
            count: peakCount,
            cached: payload.cached,
            preparedAsset: payload.preparedAsset,
            canonicalAnalysis: payload.analysis,
            compatibility: {
              status: payload.compatibility.status,
              reusable: payload.compatibility.reusable,
              reasons: payload.compatibility.reasons,
            },
          };

          const waveformVersion =
            crypto
              .createHash("sha1")
              .update(
                [
                  item.locator,

                  item.sizeBytes ||
                  0,

                  item
                    .djWaveformUpdatedAt ||
                  0,

                  peakCount,
                ].join(":")
              )
              .digest("hex")
              .slice(0, 18);

          return compressedJson(
            req,
            res,
            200,
            responseBody,
            {
              cacheControl:
                "private, max-age=2592000",

              etag:
                `"wave-${waveformVersion}"`,
            }
          );
        } catch (e: any) {
          if (e?.code === "DJ_PREPARED_ASSET_INCOMPATIBLE") {
            return json(res, 409, {
              error: "Prepared waveform is not compatible",
              code: e.code,
              compatibility: e.compatibility,
            });
          }
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

server.on("upgrade", (req, socket, head) => {
  try {
    const url = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
    if (url.pathname !== "/api/dj/mixxx/master-stream/gstreamer/signalling" || mixxxMediaTransport !== "gstreamer-webrtc") throw new Error("inactive upgrade route");
    const token = url.searchParams.get("token") || ""; const grant = m26GStreamerUpgradeTokens.get(token);
    if (!grant || grant.expiresAt < Date.now()) throw new Error("expired signalling grant");
    const origin = new URL(String(req.headers.origin || ""));
    if (!req.headers.host || origin.host.toLowerCase() !== String(req.headers.host).toLowerCase()) throw new Error("origin mismatch");
    m26GStreamerUpgradeTokens.delete(token);
    const upstream = net.connect({ host: "127.0.0.1", port: mixxxGStreamerWebRtc.signallingPort }, () => {
      const headers = Object.entries(req.headers).filter(([name]) => !["host", "origin"].includes(name.toLowerCase()))
        .flatMap(([name, value]) => Array.isArray(value) ? value.map(item => `${name}: ${item}`) : [`${name}: ${value}`]);
      upstream.write([`GET / HTTP/1.1`, `Host: 127.0.0.1:${mixxxGStreamerWebRtc.signallingPort}`, `Origin: http://127.0.0.1:${mixxxGStreamerWebRtc.signallingPort}`, ...headers, "", ""].join("\r\n"));
      if (head.length) upstream.write(head); socket.pipe(upstream).pipe(socket);
    });
    upstream.once("error", () => { try { socket.destroy(); } catch {} });
  } catch { try { socket.destroy(); } catch {} }
});

function scheduleStartupAutoImport() {
  refreshRuntimeAllowedBases();
  refreshLibrarySourceWatchers();
  const delayMs = Math.max(0, Number(process.env.BRMEDIA_AUTO_IMPORT_DELAY_MS || 650));
  scheduleAudioLibrarySync("startup", delayMs);
  scheduleVideoLibrarySync("startup", delayMs + 250);
}

server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;
server.requestTimeout = 30 * 60 * 1000;

server.on("clientError", (err: any, socket: any) => {
  const code = String(err?.code || "");
  const message = String(err?.message || "");

  if (code === "ECONNRESET" || code === "EPIPE" || message.includes("ECONNRESET") || message.includes("EPIPE")) {
    try { socket.destroy(); } catch {}
    return;
  }

  logServerCrash("clientError", err);
  try {
    socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
  } catch {}
});

server.on("error", (err: any) => {
  logServerCrash("serverError", err);

  const code = String(err?.code || "");
  if (code === "EADDRINUSE" || code === "EACCES") {
    setTimeout(() => process.exit(1), 500).unref();
  }
});

let TORRENT_RUNTIME_TICK_TIMER: any = null;
let TORRENT_RUNTIME_TICK_BUSY = false;

function scheduleTorrentRuntimeTick(delayMs = 1500) {
  if (TORRENT_RUNTIME_TICK_TIMER) clearTimeout(TORRENT_RUNTIME_TICK_TIMER);
  TORRENT_RUNTIME_TICK_TIMER = setTimeout(async () => {
    if (!TORRENT_RUNTIME_TICK_BUSY) {
      TORRENT_RUNTIME_TICK_BUSY = true;
      try {
        await applyTorrentSchedulerRuntime();
        await getTorrentStatePayloadLive();
      } catch {}
      finally { TORRENT_RUNTIME_TICK_BUSY = false; }
    }
    const state = readTorrentStateStore();
    scheduleTorrentRuntimeTick(getTorrentSpeedSampleIntervalMs(state));
  }, Math.max(1000, Number(delayMs || 0)));
  TORRENT_RUNTIME_TICK_TIMER.unref?.();
}

server.listen(cfg.port, () => {
  console.log(`[BRMedia Server] listening on http://localhost:${cfg.port}`);

  appendStatsEvent("server_started", "server", {
    entityType: "server_runtime",
    entityId: String(process.pid),
    title: "BRMedia server started",
    status: "online",
    route: "server",
    extra: {
      pid: process.pid,
      port: cfg.port,
      background: process.env.BRMEDIA_BACKGROUND === "1",
    },
  });

  scheduleStartupAutoImport();
  scheduleTorrentRuntimeTick();
});
