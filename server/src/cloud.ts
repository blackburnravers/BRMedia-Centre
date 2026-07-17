import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { json } from "./utils/json";
import * as mm from "music-metadata";
import {
  addLocalFileToLibrary,
  addLocalFileToLibraryWithMetadata,
  findLibraryItemByLocator,
} from "./db/library";
import { appendStatsEvent } from "./statsEvents";

type CloudProvider = "google_drive" | "dropbox";

type CloudAccount = {
  id: string;
  provider: CloudProvider;
  label: string;
  email: string;
  displayName: string;
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  scope: string;
  expiresAt: number;
  createdAt: number;
  updatedAt: number;
};

type CloudRouteConfig = {
  localAllowedBases: string[];
};

type OAuthState = {
  provider: CloudProvider;
  label: string;
  createdAt: number;
};

type GoogleDriveListItem = {
  id: string;
  name: string;
  mimeType: string;
  kind: "folder" | "file";
  size: number;
  modifiedTime: string;
  webViewLink: string;
};

type DropboxListItem = {
  id: string;
  name: string;
  path: string;
  kind: "folder" | "file";
  size: number;
  modifiedTime: string;
};

type CloudImportStatus = "queued" | "downloading" | "importing" | "complete" | "failed";
type CloudSyncStatus = "queued" | "scanning" | "syncing" | "complete" | "failed";
type CloudImportFileKind = "audio" | "image" | "text" | "file";

type CloudLinkedTrack = {
  id: string;
  title: string;
  source: "google_drive";
  sourceType: "googleDrive";
  cloudProvider: "google_drive";
  accountId: string;
  fileId: string;
  locator: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  modifiedTime: string;
  webViewLink: string;
  subtitle: string;
  artist: string;
  album: string;
  albumArtist?: string;
  genre?: string;
  comment?: string;
  year?: number | null;
  duration?: number | null;
  bitrate?: number | null;
  sampleRate?: number | null;
  numberOfChannels?: number | null;
  codec?: string;
  hasArtwork: boolean;
  artworkPath?: string;
  artworkMimeType?: string;
  importedLocalItemId?: string;
  importedLocalPath?: string;
  createdAt: number;
  updatedAt: number;
};

type CloudSyncRule = {
  id: string;
  provider: CloudProvider;
  accountId: string;
  title: string;
  folderId?: string;
  path?: string;
  category?: string;
  categoryLabel?: string;
  primaryBrand?: string;
  recursive: boolean;
  autoSync: boolean;
  createdAt: number;
  updatedAt: number;
  lastSyncAt?: number;
  lastJobId?: string;
};

type CloudSyncJob = {
  id: string;
  ruleId: string;
  provider: CloudProvider;
  accountId: string;
  title: string;
  category?: string;
  categoryLabel?: string;
  status: CloudSyncStatus;
  percent: number;
  totalFiles: number;
  importedFiles: number;
  skippedFiles: number;
  failedFiles: number;
  currentFile: string;
  message: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
};

type CloudImportJob = {
  id: string;
  provider: CloudProvider;
  accountId: string;
  sourceId: string;
  name: string;
  status: CloudImportStatus;
  percent: number;
  downloadedBytes: number;
  totalBytes: number;
  message: string;
  fileKind?: CloudImportFileKind;
  savedPath?: string;
  libraryItem?: any;
  error?: string;
  createdAt: number;
  updatedAt: number;
};

const DATA_DIR = path.join(process.cwd(), "server", "data");
const CLOUD_ACCOUNTS_PATH = path.join(DATA_DIR, "cloud-accounts.json");
const CLOUD_LINKED_TRACKS_PATH = path.join(DATA_DIR, "cloud-linked-tracks.json");
const CLOUD_LINKED_ARTWORK_DIR = path.join(DATA_DIR, "cloud-artwork");
const CLOUD_METADATA_PROBE_BYTES = 12 * 1024 * 1024;
const CLOUD_METADATA_FULL_READ_LIMIT = 64 * 1024 * 1024;
const OAUTH_STATE_TTL_MS = 15 * 60 * 1000;
const oauthStates = new Map<string, OAuthState>();
const cloudImportJobs = new Map<string, CloudImportJob>();
const CLOUD_IMPORT_JOB_KEEP_MS = 60 * 60 * 1000;
const CLOUD_SYNC_RULES_PATH = path.join(DATA_DIR, "cloud-sync-rules.json");
const cloudSyncJobs = new Map<string, CloudSyncJob>();
const CLOUD_SYNC_JOB_KEEP_MS = 4 * 60 * 60 * 1000;

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function randomId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function readCloudAccounts(): CloudAccount[] {
  ensureDataDir();
  if (!fs.existsSync(CLOUD_ACCOUNTS_PATH)) return [];
  try {
    const raw = fs.readFileSync(CLOUD_ACCOUNTS_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CloudAccount[]) : [];
  } catch {
    return [];
  }
}

function writeCloudAccounts(accounts: CloudAccount[]) {
  ensureDataDir();
  fs.writeFileSync(CLOUD_ACCOUNTS_PATH, JSON.stringify(accounts, null, 2), "utf-8");
}

function normaliseDriveLinkedTrackId(accountId: string, fileId: string) {
  const raw = `gdrive_${accountId}_${fileId}`;
  return raw.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function readCloudLinkedTracks(): CloudLinkedTrack[] {
  ensureDataDir();
  if (!fs.existsSync(CLOUD_LINKED_TRACKS_PATH)) return [];

  try {
    const raw = fs.readFileSync(CLOUD_LINKED_TRACKS_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as CloudLinkedTrack[] : [];
  } catch {
    return [];
  }
}

function writeCloudLinkedTracks(items: CloudLinkedTrack[]) {
  ensureDataDir();
  fs.writeFileSync(CLOUD_LINKED_TRACKS_PATH, JSON.stringify(items, null, 2), "utf-8");
}

function readCloudSyncRules(): CloudSyncRule[] {
  ensureDataDir();
  if (!fs.existsSync(CLOUD_SYNC_RULES_PATH)) return [];
  try {
    const raw = fs.readFileSync(CLOUD_SYNC_RULES_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as CloudSyncRule[] : [];
  } catch {
    return [];
  }
}

function writeCloudSyncRules(rules: CloudSyncRule[]) {
  ensureDataDir();
  fs.writeFileSync(CLOUD_SYNC_RULES_PATH, JSON.stringify(rules, null, 2), "utf-8");
}

const CLOUD_SYNC_CATEGORY_LABELS: Record<string, string> = {
  "blackburn-ravers-mixes": "Blackburn Ravers Mixes",
  "dj-nj-mixes": "DJ NJ Mixes",
  "upalnite-mixes": "Upalnite Mixes",
  "hardcore-medley-series": "The Hardcore Medley Series",
  "htid-mixes": "HTID Mixes",
  "free-songs": "Blackburn Ravers Free Songs",
  "dj-mp3s-wavs": "DJ MP3s | WAVs / Other",
};

function normaliseCloudSyncCategory(value: any, title = "") {
  const raw = String(value || "").trim().toLowerCase();
  if (raw && raw !== "auto" && CLOUD_SYNC_CATEGORY_LABELS[raw]) return raw;
  const text = String(title || "").toLowerCase();
  if (/hardcore\s*medley|\bthm\b/.test(text)) return "hardcore-medley-series";
  if (/\bhtid\b|hardcore till i die|weekender/.test(text)) return "htid-mixes";
  if (/free\s*songs?|giveaway/.test(text)) return "free-songs";
  if (/dj\s*nj|\bnj\b/.test(text)) return "dj-nj-mixes";
  if (/upalnite|\bup\b/.test(text)) return "upalnite-mixes";
  if (/blackburn\s*ravers|\bbr\b|brmedia/.test(text)) return "blackburn-ravers-mixes";
  return "dj-mp3s-wavs";
}

function cloudSyncCategoryLabel(category = "") {
  return CLOUD_SYNC_CATEGORY_LABELS[category] || CLOUD_SYNC_CATEGORY_LABELS["dj-mp3s-wavs"];
}

function cloudSyncBrandForCategory(category = "", preferred = "") {
  const safePreferred = String(preferred || "").trim();
  if (safePreferred) return safePreferred;
  if (category === "blackburn-ravers-mixes" || category === "free-songs") return "Blackburn Ravers";
  if (category === "dj-nj-mixes") return "DJ NJ";
  if (category === "upalnite-mixes") return "Upalnite";
  return "";
}

function publicCloudSyncRule(rule: CloudSyncRule) {
  const account = getCloudAccount(rule.accountId);
  return {
    ...rule,
    accountLabel: account?.label || account?.displayName || account?.email || rule.accountId,
    providerLabel: rule.provider === "google_drive" ? "Google Drive" : "Dropbox",
  };
}

function listCloudSyncRules(provider?: CloudProvider) {
  return readCloudSyncRules()
    .filter((rule) => !provider || rule.provider === provider)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map(publicCloudSyncRule);
}

function getCloudSyncRule(ruleId: string) {
  return readCloudSyncRules().find((rule) => rule.id === ruleId) || null;
}

function saveCloudSyncRule(input: Partial<CloudSyncRule>) {
  const provider = input.provider === "dropbox" ? "dropbox" : "google_drive";
  const accountId = String(input.accountId || "").trim();
  const account = getCloudAccount(accountId);
  if (!account || account.provider !== provider) throw new Error("Cloud account not found for sync rule");

  const now = Date.now();
  const rules = readCloudSyncRules();
  const folderId = String(input.folderId || "").trim();
  const rulePath = String(input.path || "").trim();
  const title = sanitiseFileName(String(input.title || (provider === "google_drive" ? "Google Drive Folder" : "Dropbox Folder")));
  const category = normaliseCloudSyncCategory(input.category, title);
  const existingIndex = rules.findIndex((rule) =>
    rule.provider === provider &&
    rule.accountId === accountId &&
    String(rule.folderId || "") === folderId &&
    String(rule.path || "") === rulePath
  );

  const next: CloudSyncRule = {
    ...(existingIndex >= 0 ? rules[existingIndex] : {} as CloudSyncRule),
    id: existingIndex >= 0 ? rules[existingIndex].id : randomId("cloudsync"),
    provider,
    accountId,
    title,
    folderId: provider === "google_drive" ? (folderId || "root") : "",
    path: provider === "dropbox" ? rulePath : "",
    category,
    categoryLabel: cloudSyncCategoryLabel(category),
    primaryBrand: cloudSyncBrandForCategory(category, input.primaryBrand),
    recursive: input.recursive !== false,
    autoSync: input.autoSync === true,
    createdAt: existingIndex >= 0 ? rules[existingIndex].createdAt : now,
    updatedAt: now,
  };

  if (existingIndex >= 0) rules[existingIndex] = next;
  else rules.push(next);
  writeCloudSyncRules(rules);
  return publicCloudSyncRule(next);
}

function deleteCloudSyncRule(ruleId: string) {
  const rules = readCloudSyncRules();
  const next = rules.filter((rule) => rule.id !== ruleId);
  const removed = next.length !== rules.length;
  if (removed) writeCloudSyncRules(next);
  return removed;
}

function listCloudLinkedTracks() {
  return readCloudLinkedTracks().sort((a, b) => b.updatedAt - a.updatedAt);
}

function getCloudLinkedTrack(id: string) {
  return readCloudLinkedTracks().find((item) => item.id === id) || null;
}

function findGoogleDriveLinkedTrackByFile(accountId: string, fileId: string) {
  return readCloudLinkedTracks().find(
    (item) => item.accountId === accountId && item.fileId === fileId
  ) || null;
}

function saveCloudLinkedTrack(track: CloudLinkedTrack) {
  const items = readCloudLinkedTracks();
  const index = items.findIndex((item) => item.id === track.id);
  if (index >= 0) items[index] = track;
  else items.push(track);
  writeCloudLinkedTracks(items);
  return track;
}

function deleteCloudLinkedTrack(trackId: string) {
  const id = String(trackId || "").trim();
  if (!id) return null;

  const items = readCloudLinkedTracks();
  const target = items.find((item) => item.id === id) || null;
  const next = items.filter((item) => item.id !== id);

  if (next.length === items.length) return null;
  writeCloudLinkedTracks(next);

  if (target?.artworkPath && fs.existsSync(target.artworkPath)) {
    try {
      fs.unlinkSync(target.artworkPath);
    } catch {}
  }

  return target;
}

function createGoogleDriveLinkedTrack(input: {
  accountId: string;
  fileId: string;
  name: string;
  mimeType?: string;
  size?: number;
  modifiedTime?: string;
  webViewLink?: string;
}) {
  const account = getCloudAccount(input.accountId);
  const now = Date.now();
  const name = sanitiseFileName(input.name || input.fileId);
  const title = path.parse(name).name.replace(/[_]+/g, " ").trim() || name;
  const existing = getCloudLinkedTrack(normaliseDriveLinkedTrackId(input.accountId, input.fileId));

  const track: CloudLinkedTrack = {
    ...(existing || {}),
    id: normaliseDriveLinkedTrackId(input.accountId, input.fileId),
    title: existing?.title || title,
    source: "google_drive",
    sourceType: "googleDrive",
    cloudProvider: "google_drive",
    accountId: input.accountId,
    fileId: input.fileId,
    locator: `gdrive://${input.accountId}/${input.fileId}`,
    name,
    mimeType: String(input.mimeType || existing?.mimeType || "audio/mpeg"),
    sizeBytes: Number(input.size || existing?.sizeBytes || 0),
    modifiedTime: String(input.modifiedTime || existing?.modifiedTime || ""),
    webViewLink: String(input.webViewLink || existing?.webViewLink || ""),
    subtitle: existing?.subtitle || `Google Drive${account?.label ? ` • ${account.label}` : ""}`,
    artist: existing?.artist || "",
    album: existing?.album || "Google Drive Library",
    albumArtist: (existing as any)?.albumArtist || "",
    genre: (existing as any)?.genre || "",
    comment: (existing as any)?.comment || "",
    year: (existing as any)?.year || null,
    duration: (existing as any)?.duration || null,
    bitrate: (existing as any)?.bitrate || null,
    sampleRate: (existing as any)?.sampleRate || null,
    numberOfChannels: (existing as any)?.numberOfChannels || null,
    codec: (existing as any)?.codec || "",
    hasArtwork: !!existing?.hasArtwork,
    artworkPath: (existing as any)?.artworkPath || "",
    artworkMimeType: (existing as any)?.artworkMimeType || "",
    importedLocalItemId: existing?.importedLocalItemId,
    importedLocalPath: existing?.importedLocalPath,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  return saveCloudLinkedTrack(track);
}

function firstCloudMetadataString(value: unknown): string {
  if (Array.isArray(value)) {
    return String(value.find((item) => String(item || "").trim()) || "").trim();
  }

  return String(value || "").trim();
}

function firstCloudMetadataNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function ensureCloudLinkedArtworkDir() {
  ensureDataDir();
  fs.mkdirSync(CLOUD_LINKED_ARTWORK_DIR, { recursive: true });
}

function getCloudArtworkExt(format = "") {
  const clean = String(format || "").toLowerCase();

  if (clean.includes("png")) return ".png";
  if (clean.includes("webp")) return ".webp";
  if (clean.includes("gif")) return ".gif";

  return ".jpg";
}

function getSafeCloudArtworkPath(trackId: string, format = "") {
  ensureCloudLinkedArtworkDir();

  const safeId = String(trackId || "cloud-artwork").replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(CLOUD_LINKED_ARTWORK_DIR, `${safeId}${getCloudArtworkExt(format)}`);
}

function saveCloudLinkedArtwork(trackId: string, picture: any) {
  if (!picture?.data) return null;

  const contentType = String(picture.format || "image/jpeg");
  const artworkPath = getSafeCloudArtworkPath(trackId, contentType);
  fs.writeFileSync(artworkPath, Buffer.from(picture.data));

  return {
    artworkPath,
    artworkMimeType: contentType,
  };
}

function sendCloudLinkedArtwork(res: ServerResponse, track: CloudLinkedTrack) {
  const artworkPath = String((track as any).artworkPath || "");
  const artworkMimeType = String((track as any).artworkMimeType || "image/jpeg");

  if (!artworkPath || !fs.existsSync(artworkPath)) return false;

  const buffer = fs.readFileSync(artworkPath);

  res.statusCode = 200;
  res.setHeader("Content-Type", artworkMimeType);
  res.setHeader("Content-Length", buffer.length);
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.end(buffer);
  return true;
}

async function fetchGoogleDriveMetadataProbe(track: CloudLinkedTrack) {
  const account = await getFreshGoogleAccount(track.accountId);
  const totalBytes = Number(track.sizeBytes || 0);
  const shouldReadWholeFile = totalBytes > 0 && totalBytes <= CLOUD_METADATA_FULL_READ_LIMIT;
  const endByte = shouldReadWholeFile
    ? Math.max(0, totalBytes - 1)
    : Math.max(0, CLOUD_METADATA_PROBE_BYTES - 1);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${account.accessToken}`,
  };

  if (endByte > 0) {
    headers.Range = `bytes=0-${endByte}`;
  }

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(track.fileId)}?alt=media&supportsAllDrives=true`,
    { headers }
  );

  if (!response.ok && response.status !== 206) {
    throw new Error(`Google Drive metadata read failed (${response.status})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const metadata = await mm.parseBuffer(
    buffer,
    {
      mimeType: track.mimeType || "audio/mpeg",
      size: totalBytes || buffer.length,
    },
    {
      duration: shouldReadWholeFile,
    }
  );

  return metadata;
}

async function hydrateGoogleDriveLinkedTrackMetadata(trackId: string) {
  const existing = getCloudLinkedTrack(trackId);
  if (!existing) throw new Error("Google Drive linked track not found");

  const fallbackTitle = path.parse(existing.name || existing.fileId).name.replace(/[_]+/g, " ").trim();
  const metadata = await fetchGoogleDriveMetadataProbe(existing);
  const common = metadata.common || {};
  const format = metadata.format || {};
  const picture = Array.isArray(common.picture) ? common.picture[0] : null;
  const artwork = picture ? saveCloudLinkedArtwork(existing.id, picture) : null;

  const next: CloudLinkedTrack = {
    ...existing,
    title: firstCloudMetadataString(common.title) || existing.title || fallbackTitle,
    artist: firstCloudMetadataString(common.artist) || existing.artist || "",
    album: firstCloudMetadataString(common.album) || existing.album || "Google Drive Library",
    albumArtist: firstCloudMetadataString((common as any).albumartist) || (existing as any).albumArtist || "",
    genre: firstCloudMetadataString(common.genre) || (existing as any).genre || "",
    comment: firstCloudMetadataString(common.comment) || (existing as any).comment || "",
    year: firstCloudMetadataNumber(common.year || common.date),
    duration: firstCloudMetadataNumber(format.duration),
    bitrate: firstCloudMetadataNumber(format.bitrate),
    sampleRate: firstCloudMetadataNumber(format.sampleRate),
    numberOfChannels: firstCloudMetadataNumber(format.numberOfChannels),
    codec: firstCloudMetadataString((format as any).codec),
    hasArtwork: !!artwork || existing.hasArtwork,
    artworkPath: artwork?.artworkPath || (existing as any).artworkPath,
    artworkMimeType: artwork?.artworkMimeType || (existing as any).artworkMimeType,
    subtitle: [
      firstCloudMetadataString(common.artist) || existing.artist || "Google Drive",
      firstCloudMetadataString(common.album) || existing.album || "Cloud Library",
    ].filter(Boolean).join(" • "),
    updatedAt: Date.now(),
  };

  return saveCloudLinkedTrack(next);
}

function rememberCloudLinkedImport(trackId: string, result: { savedPath?: string; item?: any }) {
  const existing = getCloudLinkedTrack(trackId);
  if (!existing) return null;

  const next: CloudLinkedTrack = {
    ...existing,
    importedLocalItemId: result.item?.id || existing.importedLocalItemId,
    importedLocalPath: result.savedPath || existing.importedLocalPath,
    updatedAt: Date.now(),
  };

  return saveCloudLinkedTrack(next);
}

async function pipeWebResponseToNode(response: Response, res: ServerResponse) {
  const body = response.body;
  if (!body) {
    const buffer = Buffer.from(await response.arrayBuffer());
    res.end(buffer);
    return;
  }

  const reader = body.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!res.write(Buffer.from(value))) {
        await new Promise<void>((resolve) => res.once("drain", resolve));
      }
    }

    res.end();
  } catch (err) {
    try { await reader.cancel(); } catch {}
    try { res.destroy(err as Error); } catch {}
  }
}

async function streamGoogleDriveLinkedTrack(req: IncomingMessage, res: ServerResponse, trackId: string) {
  const track = getCloudLinkedTrack(trackId);
  if (!track) return json(res, 404, { error: "Google Drive linked track not found" });

  if (!isSupportedCloudAudioName(track.name, track.mimeType)) {
    return json(res, 415, { error: "Only linked audio files can be streamed." });
  }

  const account = await getFreshGoogleAccount(track.accountId);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${account.accessToken}`,
  };

  const range = String(req.headers.range || "").trim();
  if (range) headers.Range = range;

  const driveRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(track.fileId)}?alt=media&supportsAllDrives=true`,
    { headers }
  );

  if (!driveRes.ok && driveRes.status !== 206) {
    return json(res, driveRes.status || 502, { error: `Google Drive stream failed (${driveRes.status})` });
  }

  res.statusCode = driveRes.status;
  res.setHeader("Content-Type", driveRes.headers.get("content-type") || track.mimeType || "audio/mpeg");
  res.setHeader("Accept-Ranges", driveRes.headers.get("accept-ranges") || "bytes");
  res.setHeader("Cache-Control", "no-store");

  const contentLength = driveRes.headers.get("content-length");
  const contentRange = driveRes.headers.get("content-range");
  if (contentLength) res.setHeader("Content-Length", contentLength);
  if (contentRange) res.setHeader("Content-Range", contentRange);

  if (req.method === "HEAD") {
    res.end();
    return true;
  }

  await pipeWebResponseToNode(driveRes, res);
  return true;
}

function listCloudAccounts(provider?: CloudProvider) {
  const accounts = readCloudAccounts();
  return accounts
    .filter((item) => !provider || item.provider === provider)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((item) => ({
      id: item.id,
      provider: item.provider,
      label: item.label,
      email: item.email,
      displayName: item.displayName,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      expiresAt: item.expiresAt,
      status: item.refreshToken ? "connected" : "token-missing",
    }));
}

function getCloudAccount(accountId: string): CloudAccount | null {
  const account = readCloudAccounts().find((item) => item.id === accountId);
  return account || null;
}

function saveCloudAccount(account: CloudAccount) {
  const accounts = readCloudAccounts();
  const existingIndex = accounts.findIndex((item) => item.id === account.id);
  if (existingIndex >= 0) {
    accounts[existingIndex] = account;
  } else {
    accounts.push(account);
  }
  writeCloudAccounts(accounts);
  return account;
}

function deleteCloudAccount(accountId: string) {
  const accounts = readCloudAccounts();
  const next = accounts.filter((item) => item.id !== accountId);
  const removed = next.length !== accounts.length;
  if (removed) writeCloudAccounts(next);
  return removed;
}

function renameCloudAccount(accountId: string, label: string) {
  const safeLabel = String(label || "").replace(/\s+/g, " ").trim();
  if (!safeLabel) return null;

  const accounts = readCloudAccounts();
  const index = accounts.findIndex((item) => item.id === accountId);
  if (index < 0) return null;

  accounts[index] = {
    ...accounts[index],
    label: safeLabel,
    updatedAt: Date.now(),
  };

  writeCloudAccounts(accounts);
  return listCloudAccounts().find((item) => item.id === accountId) || null;
}

function firstAllowedImportDir(cfg: CloudRouteConfig) {
  const fromEnv = String(process.env.CLOUD_IMPORT_DIR || "").trim();
  if (fromEnv) {
    const resolved = path.resolve(fromEnv);
    fs.mkdirSync(resolved, { recursive: true });
    return resolved;
  }

  const firstAllowed = cfg.localAllowedBases[0];
  if (!firstAllowed) {
    throw new Error("Set LOCAL_ALLOWED_BASES or CLOUD_IMPORT_DIR before importing cloud files.");
  }

  fs.mkdirSync(firstAllowed, { recursive: true });
  return firstAllowed;
}

function createOauthState(provider: CloudProvider, label: string) {
  const state = randomId(provider === "google_drive" ? "gstate" : "dstate");
  oauthStates.set(state, {
    provider,
    label: label || (provider === "google_drive" ? "Google Drive" : "Dropbox"),
    createdAt: Date.now(),
  });
  return state;
}

function takeOauthState(state: string, provider: CloudProvider) {
  const found = oauthStates.get(state);
  oauthStates.delete(state);
  if (!found) return null;
  if (found.provider !== provider) return null;
  if (Date.now() - found.createdAt > OAUTH_STATE_TTL_MS) return null;
  return found;
}

function requireEnv(name: string) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`Missing ${name} in server/.env`);
  return value;
}

function sanitiseFileName(name: string) {
  return (
    String(name || "file")
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
      .replace(/\s+/g, " ")
      .trim() || "file"
  );
}

function withQuery(base: string, params: Record<string, string>) {
  const url = new URL(base);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      String(
        (data as any)?.error_description ||
          (data as any)?.error_summary ||
          (data as any)?.error?.message ||
          (data as any)?.error ||
          `Request failed (${res.status})`
      )
    );
  }
  return data as any;
}

async function exchangeGoogleCode(code: string) {
  const body = new URLSearchParams({
    code,
    client_id: requireEnv("GOOGLE_DRIVE_CLIENT_ID"),
    client_secret: requireEnv("GOOGLE_DRIVE_CLIENT_SECRET"),
    redirect_uri: requireEnv("GOOGLE_DRIVE_REDIRECT_URI"),
    grant_type: "authorization_code",
  });

  return fetchJson("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
}

async function refreshGoogleAccount(account: CloudAccount) {
  if (!account.refreshToken) return account;
  if (Date.now() < account.expiresAt - 60_000) return account;

  const body = new URLSearchParams({
    client_id: requireEnv("GOOGLE_DRIVE_CLIENT_ID"),
    client_secret: requireEnv("GOOGLE_DRIVE_CLIENT_SECRET"),
    refresh_token: account.refreshToken,
    grant_type: "refresh_token",
  });

  const token = await fetchJson("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const updated: CloudAccount = {
    ...account,
    accessToken: String(token.access_token || account.accessToken),
    tokenType: String(token.token_type || account.tokenType || "Bearer"),
    scope: String(token.scope || account.scope || ""),
    expiresAt: Date.now() + Number(token.expires_in || 3600) * 1000,
    updatedAt: Date.now(),
  };

  saveCloudAccount(updated);
  return updated;
}

async function hydrateGoogleProfile(accessToken: string) {
  const data = await fetchJson("https://www.googleapis.com/drive/v3/about?fields=user", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const user = data?.user || {};
  return {
    email: String(user.emailAddress || ""),
    displayName: String(user.displayName || user.emailAddress || "Google Drive account"),
  };
}

async function exchangeDropboxCode(code: string) {
  const body = new URLSearchParams({
    code,
    client_id: requireEnv("DROPBOX_APP_KEY"),
    client_secret: requireEnv("DROPBOX_APP_SECRET"),
    redirect_uri: requireEnv("DROPBOX_REDIRECT_URI"),
    grant_type: "authorization_code",
  });

  return fetchJson("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
}

async function refreshDropboxAccount(account: CloudAccount) {
  if (!account.refreshToken) return account;
  if (Date.now() < account.expiresAt - 60_000) return account;

  const body = new URLSearchParams({
    refresh_token: account.refreshToken,
    client_id: requireEnv("DROPBOX_APP_KEY"),
    client_secret: requireEnv("DROPBOX_APP_SECRET"),
    grant_type: "refresh_token",
  });

  const token = await fetchJson("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const updated: CloudAccount = {
    ...account,
    accessToken: String(token.access_token || account.accessToken),
    tokenType: String(token.token_type || account.tokenType || "Bearer"),
    scope: String(token.scope || account.scope || ""),
    expiresAt: Date.now() + Number(token.expires_in || 14400) * 1000,
    updatedAt: Date.now(),
  };

  saveCloudAccount(updated);
  return updated;
}

async function hydrateDropboxProfile(accessToken: string) {
  const data = await fetchJson("https://api.dropboxapi.com/2/users/get_current_account", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: "null",
  });

  return {
    email: String(data?.email || ""),
    displayName: String(data?.name?.display_name || data?.email || "Dropbox account"),
  };
}

async function getFreshGoogleAccount(accountId: string) {
  const account = getCloudAccount(accountId);
  if (!account || account.provider !== "google_drive") {
    throw new Error("Google Drive account not found");
  }
  return refreshGoogleAccount(account);
}

async function getFreshDropboxAccount(accountId: string) {
  const account = getCloudAccount(accountId);
  if (!account || account.provider !== "dropbox") {
    throw new Error("Dropbox account not found");
  }
  return refreshDropboxAccount(account);
}

async function listGoogleDriveFiles(accountId: string, folderId = "root", query = "") {
  const account = await getFreshGoogleAccount(accountId);
  const qParts = ["trashed = false"];
  if (folderId) qParts.push(`'${folderId.replace(/'/g, "\\'")}' in parents`);
  if (query.trim()) {
    const safe = query.trim().replace(/'/g, "\\'");
    qParts.push(`name contains '${safe}'`);
  }

  const url = withQuery("https://www.googleapis.com/drive/v3/files", {
    fields: "files(id,name,mimeType,size,modifiedTime,webViewLink)",
    orderBy: "folder,name_natural",
    pageSize: "200",
    q: qParts.join(" and "),
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });

  const data = await fetchJson(url, {
    headers: { Authorization: `Bearer ${account.accessToken}` },
  });

  const items = Array.isArray(data?.files) ? data.files : [];
  return items.map(
    (item: any): GoogleDriveListItem => ({
      id: String(item.id || ""),
      name: String(item.name || "Untitled"),
      mimeType: String(item.mimeType || "application/octet-stream"),
      kind: String(item.mimeType || "").includes("folder") ? "folder" : "file",
      size: Number(item.size || 0),
      modifiedTime: String(item.modifiedTime || ""),
      webViewLink: String(item.webViewLink || ""),
    })
  );
}

async function listDropboxFiles(accountId: string, inputPath = "") {
  const account = await getFreshDropboxAccount(accountId);

  const data = await fetchJson("https://api.dropboxapi.com/2/files/list_folder", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path: inputPath || "",
      recursive: false,
      include_media_info: false,
      include_deleted: false,
      include_has_explicit_shared_members: false,
    }),
  });

  const entries = Array.isArray(data?.entries) ? data.entries : [];

  return entries.map(
    (item: any): DropboxListItem => ({
      id: String(item.id || item.path_lower || item.path_display || ""),
      name: String(item.name || "Untitled"),
      path: String(item.path_lower || item.path_display || ""),
      kind: item[".tag"] === "folder" ? "folder" : "file",
      size: Number(item.size || 0),
      modifiedTime: String(item.server_modified || ""),
    })
  );
}

async function searchDropboxFiles(accountId: string, query: string) {
  const account = await getFreshDropboxAccount(accountId);

  const data = await fetchJson("https://api.dropboxapi.com/2/files/search_v2", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      options: {
        path: "",
        max_results: 100,
        filename_only: false,
      },
    }),
  });

  const matches = Array.isArray(data?.matches) ? data.matches : [];

  return matches.map((entry: any): DropboxListItem => {
    const metadata = entry?.metadata?.metadata || {};

    return {
      id: String(metadata.id || metadata.path_lower || metadata.path_display || ""),
      name: String(metadata.name || "Untitled"),
      path: String(metadata.path_lower || metadata.path_display || ""),
      kind: metadata[".tag"] === "folder" ? "folder" : "file",
      size: Number(metadata.size || 0),
      modifiedTime: String(metadata.server_modified || ""),
    };
  });
}

function getCloudImportFileKind(name: string, mimeType = ""): CloudImportFileKind {
  const lowerName = String(name || "").toLowerCase();
  const lowerMime = String(mimeType || "").toLowerCase();

  if (
    lowerMime.startsWith("audio/") ||
    [".mp3", ".wav", ".flac", ".m4a", ".aac", ".ogg", ".opus"].some((ext) => lowerName.endsWith(ext))
  ) {
    return "audio";
  }

  if (
    lowerMime.startsWith("image/") ||
    [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].some((ext) => lowerName.endsWith(ext))
  ) {
    return "image";
  }

  if (
    lowerMime.startsWith("text/") ||
    [".txt", ".cue", ".lrc", ".m3u", ".m3u8", ".pls", ".json", ".xml", ".csv"].some((ext) => lowerName.endsWith(ext))
  ) {
    return "text";
  }

  return "file";
}

function isSupportedCloudImportName(name: string, mimeType = "") {
  return getCloudImportFileKind(name, mimeType) !== "file";
}

function isSupportedCloudAudioName(name: string, mimeType = "") {
  return getCloudImportFileKind(name, mimeType) === "audio";
}

function pruneCloudImportJobs() {
  const cutoff = Date.now() - CLOUD_IMPORT_JOB_KEEP_MS;

  for (const [id, job] of cloudImportJobs.entries()) {
    if ((job.status === "complete" || job.status === "failed") && job.updatedAt < cutoff) {
      cloudImportJobs.delete(id);
    }
  }
}

function listCloudImportJobs() {
  pruneCloudImportJobs();

  return Array.from(cloudImportJobs.values())
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 50);
}

function updateCloudImportJob(id: string, patch: Partial<CloudImportJob>) {
  const existing = cloudImportJobs.get(id);
  if (!existing) return null;

  const next: CloudImportJob = {
    ...existing,
    ...patch,
    updatedAt: Date.now(),
  };

  cloudImportJobs.set(id, next);
  return next;
}

function createCloudImportJob(input: {
  provider: CloudProvider;
  accountId: string;
  sourceId: string;
  name: string;
  totalBytes?: number;
  fileKind?: CloudImportFileKind;
}) {
  const now = Date.now();
  const job: CloudImportJob = {
    id: randomId("cloudjob"),
    provider: input.provider,
    accountId: input.accountId,
    sourceId: input.sourceId,
    name: input.name || "Cloud import",
    status: "queued",
    percent: 0,
    downloadedBytes: 0,
    totalBytes: Number(input.totalBytes || 0),
    fileKind: input.fileKind || getCloudImportFileKind(input.name),
    message: "Queued",
    createdAt: now,
    updatedAt: now,
  };

  cloudImportJobs.set(job.id, job);
  return job;
}

async function writeFetchResponseToFile(
  res: Response,
  destPath: string,
  jobId: string,
  totalBytes = 0
) {
  const body = res.body;

  if (!body) {
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(destPath, buffer);

    updateCloudImportJob(jobId, {
      downloadedBytes: buffer.length,
      totalBytes: totalBytes || buffer.length,
      percent: 90,
      message: "Download complete",
    });

    return;
  }

  const reader = body.getReader();
  const stream = fs.createWriteStream(destPath);
  let downloadedBytes = 0;

  const waitForDrain = () =>
    new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        stream.off("drain", onDrain);
        stream.off("error", onError);
      };

      const onDrain = () => {
        cleanup();
        resolve();
      };

      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };

      stream.once("drain", onDrain);
      stream.once("error", onError);
    });

  const finishStream = () =>
    new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        stream.off("finish", onFinish);
        stream.off("error", onError);
      };

      const onFinish = () => {
        cleanup();
        resolve();
      };

      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };

      stream.once("finish", onFinish);
      stream.once("error", onError);
      stream.end();
    });

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      const chunk = Buffer.from(value);
      downloadedBytes += chunk.length;

      if (!stream.write(chunk)) {
        await waitForDrain();
      }

      const percent = totalBytes > 0
        ? Math.max(1, Math.min(88, Math.round((downloadedBytes / totalBytes) * 88)))
        : 35;

      updateCloudImportJob(jobId, {
        downloadedBytes,
        totalBytes,
        percent,
        message: "Downloading file",
      });
    }

    await finishStream();
  } catch (err) {
    try {
      await reader.cancel();
    } catch {
      // ignore cancel failures
    }

    stream.destroy();
    throw err;
  }
}

async function getGoogleDriveFileMeta(accountId: string, fileId: string) {
  const account = await getFreshGoogleAccount(accountId);

  const meta = await fetchJson(
    withQuery(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`, {
      fields: "id,name,mimeType,size,modifiedTime",
      supportsAllDrives: "true",
    }),
    {
      headers: { Authorization: `Bearer ${account.accessToken}` },
    }
  );

  return { account, meta };
}

async function runGoogleDriveImportJob(jobId: string, accountId: string, fileId: string, cfg: CloudRouteConfig) {
  try {
    updateCloudImportJob(jobId, {
      status: "downloading",
      percent: 2,
      message: "Checking Google Drive file",
    });

    const { account, meta } = await getGoogleDriveFileMeta(accountId, fileId);
    const name = String(meta?.name || fileId);
    const mimeType = String(meta?.mimeType || "");
    const totalBytes = Number(meta?.size || 0);
    const fileKind = getCloudImportFileKind(name, mimeType);

    if (mimeType.includes("folder")) {
      throw new Error("Pick a file, not a folder.");
    }

    if (!isSupportedCloudImportName(name, mimeType)) {
      throw new Error("Only audio, image, text, cue and playlist files can be imported right now.");
    }

    updateCloudImportJob(jobId, {
      name,
      fileKind,
      totalBytes,
      message: fileKind === "audio" ? "Downloading media" : "Downloading file",
    });

    const targetDir = firstAllowedImportDir(cfg);
    const safeName = sanitiseFileName(name);
    const destPath = path.join(targetDir, safeName);

    if (!fs.existsSync(destPath)) {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
        {
          headers: { Authorization: `Bearer ${account.accessToken}` },
        }
      );

      if (!res.ok) {
        throw new Error(`Google Drive download failed (${res.status})`);
      }

      await writeFetchResponseToFile(res, destPath, jobId, totalBytes);
    } else {
      updateCloudImportJob(jobId, {
        fileKind,
        downloadedBytes: totalBytes,
        totalBytes,
        percent: 88,
        message: "File already downloaded",
      });
    }

    if (fileKind === "audio") {
      updateCloudImportJob(jobId, {
        status: "importing",
        percent: 94,
        savedPath: destPath,
        message: "Importing media",
      });

      const existing = findLibraryItemByLocator(destPath);
      const item = existing || await addLocalFileToLibraryWithMetadata(destPath);
      const linkedTrack = findGoogleDriveLinkedTrackByFile(accountId, fileId);

      if (linkedTrack) {
        rememberCloudLinkedImport(linkedTrack.id, {
          savedPath: destPath,
          item,
        });
      }

      const importedSize = totalBytes || fs.statSync(destPath).size;

      updateCloudImportJob(jobId, {
        status: "complete",
        percent: 100,
        downloadedBytes: importedSize,
        totalBytes: importedSize,
        savedPath: destPath,
        libraryItem: item,
        message: existing ? "Media already in library" : "Media imported",
      });

      appendStatsEvent("cloud_import_done", "imports", {
        entityType: "audio",
        entityId: item?.id || jobId,
        title: name,
        status: "done",
        route: "settings",
        value: importedSize,
        source: "google_drive",
      });

      return;
    }

    const size = fs.statSync(destPath).size;

    updateCloudImportJob(jobId, {
      status: "complete",
      percent: 100,
      downloadedBytes: totalBytes || size,
      totalBytes: totalBytes || size,
      savedPath: destPath,
      message: fileKind === "image" ? "Image downloaded" : "Text/playlist file downloaded",
    });

    appendStatsEvent("cloud_import_done", "imports", {
      entityType: fileKind,
      entityId: jobId,
      title: name,
      status: "done",
      route: "settings",
      value: totalBytes || size,
      source: "google_drive",
    });
  } catch (err: any) {
    updateCloudImportJob(jobId, {
      status: "failed",
      percent: 100,
      error: String(err?.message || err),
      message: "Failed",
    });
    appendStatsEvent("cloud_import_error", "imports", {
      entityType: "file",
      entityId: jobId,
      title: fileId,
      status: "error",
      route: "settings",
      source: "google_drive",
    });
  }
}

async function runDropboxImportJob(jobId: string, accountId: string, filePath: string, cfg: CloudRouteConfig) {
  try {
    updateCloudImportJob(jobId, {
      status: "downloading",
      percent: 2,
      message: "Checking Dropbox file",
    });

    const account = await getFreshDropboxAccount(accountId);
    const name = path.basename(filePath);
    const fileKind = getCloudImportFileKind(name);

    if (!isSupportedCloudImportName(name)) {
      throw new Error("Only audio, image, text, cue and playlist files can be imported right now.");
    }

    updateCloudImportJob(jobId, {
      fileKind,
    });

    const targetDir = firstAllowedImportDir(cfg);
    const safeName = sanitiseFileName(name);
    const destPath = path.join(targetDir, safeName);

    if (!fs.existsSync(destPath)) {
      const res = await fetch("https://content.dropboxapi.com/2/files/download", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
          "Dropbox-API-Arg": JSON.stringify({ path: filePath }),
        },
      });

      if (!res.ok) {
        throw new Error(`Dropbox download failed (${res.status})`);
      }

      let totalBytes = Number(res.headers.get("content-length") || 0);

      try {
        const metaRaw = res.headers.get("dropbox-api-result");
        if (metaRaw) {
          const parsed = JSON.parse(metaRaw);
          totalBytes = Number(parsed?.size || totalBytes || 0);
        }
      } catch {
        // keep header fallback
      }

      updateCloudImportJob(jobId, {
        name,
        fileKind,
        totalBytes,
        message: fileKind === "audio" ? "Downloading media" : "Downloading file",
      });

      await writeFetchResponseToFile(res, destPath, jobId, totalBytes);
    } else {
      const size = fs.statSync(destPath).size;
      updateCloudImportJob(jobId, {
        fileKind,
        downloadedBytes: size,
        totalBytes: size,
        percent: 88,
        message: "File already downloaded",
      });
    }

    const size = fs.statSync(destPath).size;

    if (fileKind === "audio") {
      updateCloudImportJob(jobId, {
        status: "importing",
        percent: 94,
        savedPath: destPath,
        message: "Importing media",
      });

      const existing = findLibraryItemByLocator(destPath);
      const item = existing || await addLocalFileToLibraryWithMetadata(destPath);

      updateCloudImportJob(jobId, {
        status: "complete",
        percent: 100,
        downloadedBytes: size,
        totalBytes: size,
        savedPath: destPath,
        libraryItem: item,
        message: existing ? "Media already in library" : "Media imported",
      });

      appendStatsEvent("cloud_import_done", "imports", {
        entityType: "audio",
        entityId: item?.id || jobId,
        title: name,
        status: "done",
        route: "settings",
        value: size,
        source: "dropbox",
      });
			
      return;
    }

    updateCloudImportJob(jobId, {
      status: "complete",
      percent: 100,
      downloadedBytes: size,
      totalBytes: size,
      savedPath: destPath,
      message: fileKind === "image" ? "Image downloaded" : "Text/playlist file downloaded",
    });

    appendStatsEvent("cloud_import_done", "imports", {
      entityType: fileKind,
      entityId: jobId,
      title: name,
      status: "done",
      route: "settings",
      value: size,
      source: "dropbox",
    });
  } catch (err: any) {
    updateCloudImportJob(jobId, {
      status: "failed",
      percent: 100,
      error: String(err?.message || err),
      message: "Failed",
    });

    appendStatsEvent("cloud_import_error", "imports", {
      entityType: "file",
      entityId: jobId,
      title: filePath,
      status: "error",
      route: "settings",
      source: "dropbox",
    });
  }
}

function startGoogleDriveImportJob(accountId: string, fileId: string, fileName: string, cfg: CloudRouteConfig) {
  const job = createCloudImportJob({
    provider: "google_drive",
    accountId,
    sourceId: fileId,
    name: fileName || fileId,
  });

  void runGoogleDriveImportJob(job.id, accountId, fileId, cfg);
  return job;
}

function startDropboxImportJob(accountId: string, filePath: string, fileName: string, cfg: CloudRouteConfig) {
  const job = createCloudImportJob({
    provider: "dropbox",
    accountId,
    sourceId: filePath,
    name: fileName || path.basename(filePath),
  });

  void runDropboxImportJob(job.id, accountId, filePath, cfg);
  return job;
}

function pruneCloudSyncJobs() {
  const cutoff = Date.now() - CLOUD_SYNC_JOB_KEEP_MS;
  for (const [id, job] of cloudSyncJobs.entries()) {
    if ((job.status === "complete" || job.status === "failed") && job.updatedAt < cutoff) cloudSyncJobs.delete(id);
  }
}

function listCloudSyncJobs() {
  pruneCloudSyncJobs();
  return Array.from(cloudSyncJobs.values())
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 40);
}

function updateCloudSyncJob(id: string, patch: Partial<CloudSyncJob>) {
  const existing = cloudSyncJobs.get(id);
  if (!existing) return null;
  const next: CloudSyncJob = { ...existing, ...patch, updatedAt: Date.now() };
  cloudSyncJobs.set(id, next);
  return next;
}

function createCloudSyncJob(rule: CloudSyncRule) {
  const now = Date.now();
  const job: CloudSyncJob = {
    id: randomId("cloudsyncjob"),
    ruleId: rule.id,
    provider: rule.provider,
    accountId: rule.accountId,
    title: rule.title,
    category: rule.category,
    categoryLabel: rule.categoryLabel || cloudSyncCategoryLabel(rule.category),
    status: "queued",
    percent: 0,
    totalFiles: 0,
    importedFiles: 0,
    skippedFiles: 0,
    failedFiles: 0,
    currentFile: "",
    message: "Queued",
    createdAt: now,
    updatedAt: now,
  };
  cloudSyncJobs.set(job.id, job);
  return job;
}

async function collectGoogleDriveSyncFiles(accountId: string, folderId: string, recursive: boolean, depth = 0): Promise<GoogleDriveListItem[]> {
  const items = await listGoogleDriveFiles(accountId, folderId || "root", "");
  const audioFiles = items.filter((item: GoogleDriveListItem) => item.kind === "file" && isSupportedCloudAudioName(item.name, item.mimeType));
  if (!recursive || depth >= 8) return audioFiles;

  for (const folder of items.filter((item: GoogleDriveListItem) => item.kind === "folder")) {
    const nested = await collectGoogleDriveSyncFiles(accountId, folder.id, recursive, depth + 1).catch(() => []);
    audioFiles.push(...nested);
  }

  return audioFiles;
}

async function collectDropboxSyncFiles(accountId: string, folderPath: string, recursive: boolean, depth = 0): Promise<DropboxListItem[]> {
  const items = await listDropboxFiles(accountId, folderPath || "");
  const audioFiles = items.filter((item: DropboxListItem) => item.kind === "file" && isSupportedCloudAudioName(item.name));
  if (!recursive || depth >= 8) return audioFiles;

  for (const folder of items.filter((item: DropboxListItem) => item.kind === "folder")) {
    const nested = await collectDropboxSyncFiles(accountId, folder.path, recursive, depth + 1).catch(() => []);
    audioFiles.push(...nested);
  }

  return audioFiles;
}

function markCloudSyncRuleRun(ruleId: string, jobId: string) {
  const rules = readCloudSyncRules();
  const index = rules.findIndex((rule) => rule.id === ruleId);
  if (index < 0) return;
  rules[index] = { ...rules[index], lastSyncAt: Date.now(), lastJobId: jobId, updatedAt: Date.now() };
  writeCloudSyncRules(rules);
}

function applyCloudSyncRuleToLibraryItem(item: any, rule: CloudSyncRule) {
  if (!item) return;
  const category = normaliseCloudSyncCategory(rule.category, rule.title);
  const categoryLabel = cloudSyncCategoryLabel(category);
  const primaryBrand = cloudSyncBrandForCategory(category, rule.primaryBrand);

  item.cloudSyncRuleId = rule.id;
  item.cloudProvider = rule.provider;
  item.importedFrom = rule.provider;
  item.sourceType = rule.provider === "google_drive" ? "googleDriveSync" : "dropboxSync";
  item.category = category;
  item.brmediaCategory = category;
  item.brmediaTags = {
    ...(item.brmediaTags || {}),
    category,
    navCategory: category,
    brmediaCategory: category,
    primaryBrand,
    cloudSyncRuleId: rule.id,
    cloudSyncProvider: rule.provider,
  };

  if (primaryBrand) item.artist = item.artist || primaryBrand;
  if (!item.album) item.album = categoryLabel || rule.title;
}

async function runCloudSyncJob(jobId: string, rule: CloudSyncRule, cfg: CloudRouteConfig) {
  try {
    updateCloudSyncJob(jobId, { status: "scanning", percent: 4, message: "Scanning cloud folder" });

    const files = rule.provider === "google_drive"
      ? await collectGoogleDriveSyncFiles(rule.accountId, rule.folderId || "root", rule.recursive)
      : await collectDropboxSyncFiles(rule.accountId, rule.path || "", rule.recursive);

    updateCloudSyncJob(jobId, {
      status: "syncing",
      totalFiles: files.length,
      percent: files.length ? 8 : 100,
      message: files.length ? `Found ${files.length} audio file${files.length === 1 ? "" : "s"}` : "No supported audio files found",
    });

    if (!files.length) {
      updateCloudSyncJob(jobId, { status: "complete", percent: 100, message: "Sync complete — no new audio files found" });
      markCloudSyncRuleRun(rule.id, jobId);
      return;
    }

    let importedFiles = 0;
    let skippedFiles = 0;
    let failedFiles = 0;

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index] as any;
      const fileName = String(file.name || file.path || "Cloud audio");
      updateCloudSyncJob(jobId, {
        currentFile: fileName,
        percent: Math.max(10, Math.min(96, Math.round(((index) / files.length) * 88) + 8)),
        importedFiles,
        skippedFiles,
        failedFiles,
        message: `Syncing ${index + 1} of ${files.length}`,
      });

      try {
        const result = rule.provider === "google_drive"
          ? await importGoogleDriveFile(rule.accountId, String(file.id || ""), cfg)
          : await importDropboxFile(rule.accountId, String(file.path || ""), cfg);

        const item = result.item as any;
        applyCloudSyncRuleToLibraryItem(item, rule);

        if (result.alreadyExisted) skippedFiles += 1;
        else importedFiles += 1;
      } catch {
        failedFiles += 1;
      }
    }

    updateCloudSyncJob(jobId, {
      status: failedFiles ? "failed" : "complete",
      percent: 100,
      importedFiles,
      skippedFiles,
      failedFiles,
      currentFile: "",
      message: failedFiles
        ? `Sync finished with ${failedFiles} failed file${failedFiles === 1 ? "" : "s"}`
        : `Sync complete — ${importedFiles} imported, ${skippedFiles} already existed`,
      error: failedFiles ? "Some files could not be synced. Check filenames and cloud permissions." : undefined,
    });

    markCloudSyncRuleRun(rule.id, jobId);
  } catch (err: any) {
    updateCloudSyncJob(jobId, {
      status: "failed",
      percent: 100,
      error: String(err?.message || err),
      message: "Sync failed",
    });
  }
}

function startCloudSyncRule(ruleId: string, cfg: CloudRouteConfig) {
  const rule = getCloudSyncRule(ruleId);
  if (!rule) throw new Error("Cloud sync folder not found");
  const job = createCloudSyncJob(rule);
  void runCloudSyncJob(job.id, rule, cfg);
  return job;
}

async function importGoogleDriveFile(accountId: string, fileId: string, cfg: CloudRouteConfig) {
  const { account, meta } = await getGoogleDriveFileMeta(accountId, fileId);

  if (String(meta?.mimeType || "").includes("folder")) {
    throw new Error("Pick a file, not a folder.");
  }

  const name = String(meta?.name || fileId);

  if (!isSupportedCloudAudioName(name, String(meta?.mimeType || ""))) {
    throw new Error("Only audio files can be imported into the BRMedia library right now.");
  }

  const targetDir = firstAllowedImportDir(cfg);
  const safeName = sanitiseFileName(name);
  const destPath = path.join(targetDir, safeName);

  if (!fs.existsSync(destPath)) {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
      {
        headers: { Authorization: `Bearer ${account.accessToken}` },
      }
    );

    if (!res.ok) {
      throw new Error(`Google Drive download failed (${res.status})`);
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(destPath, buffer);
  }

  const existing = findLibraryItemByLocator(destPath);
  const item = existing || await addLocalFileToLibraryWithMetadata(destPath);
  Object.assign(item as any, {
    sourceType: "googleDriveImport",
    cloudProvider: "google_drive",
    importedFrom: "google_drive",
  });
  return { savedPath: destPath, item, alreadyExisted: !!existing };
}

async function importDropboxFile(accountId: string, filePath: string, cfg: CloudRouteConfig) {
  const account = await getFreshDropboxAccount(accountId);
  const targetDir = firstAllowedImportDir(cfg);
  const safeName = sanitiseFileName(path.basename(filePath));
  const destPath = path.join(targetDir, safeName);

  if (!isSupportedCloudAudioName(safeName)) {
    throw new Error("Only audio files can be imported into the BRMedia library right now.");
  }

  if (!fs.existsSync(destPath)) {
    const res = await fetch("https://content.dropboxapi.com/2/files/download", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        "Dropbox-API-Arg": JSON.stringify({ path: filePath }),
      },
    });

    if (!res.ok) {
      throw new Error(`Dropbox download failed (${res.status})`);
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(destPath, buffer);
  }

  const existing = findLibraryItemByLocator(destPath);
  const item = existing || await addLocalFileToLibraryWithMetadata(destPath);
  Object.assign(item as any, {
    sourceType: "dropboxImport",
    cloudProvider: "dropbox",
    importedFrom: "dropbox",
  });
  return { savedPath: destPath, item, alreadyExisted: !!existing };
}

function sendAuthSuccess(res: ServerResponse, providerLabel: string) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(`<!doctype html>
<html>
<head><meta charset="utf-8"><title>${providerLabel} connected</title></head>
<body style="font-family:Arial,sans-serif;background:#12234a;color:#fff;display:grid;place-items:center;min-height:100vh;margin:0;">
  <div style="max-width:520px;padding:28px;border-radius:20px;background:rgba(255,255,255,0.08);border:1px solid rgba(97,200,255,0.18);text-align:center;">
    <h1 style="margin:0 0 10px;font-size:28px;">${providerLabel} connected</h1>
    <p style="margin:0 0 18px;color:#cfeaff;line-height:1.5;">You can close this window and go back to BRMedia Settings.</p>
    <script>
      try {
        if (window.opener) {
          window.opener.postMessage({ type: 'brmedia-cloud-connected', provider: '${providerLabel}' }, '*');
        }
      } catch (err) {}
    </script>
  </div>
</body>
</html>`);
}

export async function handleCloudRoute(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  cfg: CloudRouteConfig
): Promise<boolean> {
  if (req.method === "GET" && url.pathname === "/cloud/accounts") {
    const providerRaw = String(url.searchParams.get("provider") || "").trim();
    const provider =
      providerRaw === "google_drive" || providerRaw === "dropbox" ? providerRaw : undefined;

    return json(res, 200, {
      ok: true,
      accounts: listCloudAccounts(provider),
    });
  }

  if (req.method === "GET" && url.pathname === "/auth/google/start") {
    try {
      const state = createOauthState(
        "google_drive",
        String(url.searchParams.get("label") || "Google Drive")
      );
      const authUrl = withQuery("https://accounts.google.com/o/oauth2/v2/auth", {
        client_id: requireEnv("GOOGLE_DRIVE_CLIENT_ID"),
        redirect_uri: requireEnv("GOOGLE_DRIVE_REDIRECT_URI"),
        response_type: "code",
        access_type: "offline",
        prompt: "consent",
        scope: String(
          process.env.GOOGLE_DRIVE_SCOPES ||
            "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email"
        ),
        state,
      });

      return json(res, 200, { ok: true, authUrl });
    } catch (err: any) {
      return json(res, 400, {
        error: "Google Drive setup incomplete",
        detail: String(err?.message || err),
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/auth/google/callback") {
    const code = String(url.searchParams.get("code") || "").trim();
    const state = String(url.searchParams.get("state") || "").trim();
    const payload = takeOauthState(state, "google_drive");

    if (!code || !payload) {
      return json(res, 400, { error: "Invalid Google callback state" });
    }

    const token = await exchangeGoogleCode(code);
    const profile = await hydrateGoogleProfile(String(token.access_token || ""));

    const now = Date.now();
    const account: CloudAccount = {
      id: randomId("gdrive"),
      provider: "google_drive",
      label: payload.label,
      email: profile.email,
      displayName: profile.displayName,
      accessToken: String(token.access_token || ""),
      refreshToken: String(token.refresh_token || ""),
      tokenType: String(token.token_type || "Bearer"),
      scope: String(token.scope || ""),
      expiresAt: now + Number(token.expires_in || 3600) * 1000,
      createdAt: now,
      updatedAt: now,
    };

    saveCloudAccount(account);
    sendAuthSuccess(res, "Google Drive");
    return true;
  }

  if (req.method === "GET" && url.pathname === "/auth/dropbox/start") {
    try {
      const state = createOauthState("dropbox", String(url.searchParams.get("label") || "Dropbox"));
      const authUrl = withQuery("https://www.dropbox.com/oauth2/authorize", {
        client_id: requireEnv("DROPBOX_APP_KEY"),
        redirect_uri: requireEnv("DROPBOX_REDIRECT_URI"),
        response_type: "code",
        token_access_type: "offline",
        state,
      });

      return json(res, 200, { ok: true, authUrl });
    } catch (err: any) {
      return json(res, 400, {
        error: "Dropbox setup incomplete",
        detail: String(err?.message || err),
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/auth/dropbox/callback") {
    const code = String(url.searchParams.get("code") || "").trim();
    const state = String(url.searchParams.get("state") || "").trim();
    const payload = takeOauthState(state, "dropbox");

    if (!code || !payload) {
      return json(res, 400, { error: "Invalid Dropbox callback state" });
    }

    const token = await exchangeDropboxCode(code);
    const profile = await hydrateDropboxProfile(String(token.access_token || ""));

    const now = Date.now();
    const account: CloudAccount = {
      id: randomId("dropbox"),
      provider: "dropbox",
      label: payload.label,
      email: profile.email,
      displayName: profile.displayName,
      accessToken: String(token.access_token || ""),
      refreshToken: String(token.refresh_token || ""),
      tokenType: String(token.token_type || "Bearer"),
      scope: String(token.scope || ""),
      expiresAt: now + Number(token.expires_in || 14400) * 1000,
      createdAt: now,
      updatedAt: now,
    };

    saveCloudAccount(account);
    sendAuthSuccess(res, "Dropbox");
    return true;
  }
	
  if (req.method === "PATCH" && url.pathname.startsWith("/cloud/accounts/")) {
    const parts = url.pathname.split("/").filter(Boolean);
    const accountId = decodeURIComponent(parts[2] || "");
    const body = await readJsonBody(req).catch(() => null);
    const label = String(body?.label || "").replace(/\s+/g, " ").trim();

    if (!accountId) {
      return json(res, 400, { error: "Missing account id" });
    }

    if (!label) {
      return json(res, 400, { error: "Missing account label" });
    }

    const account = renameCloudAccount(accountId, label);
    if (!account) {
      return json(res, 404, { error: "Cloud account not found" });
    }

    return json(res, 200, { ok: true, account });
  }

  if (req.method === "DELETE" && url.pathname.startsWith("/cloud/accounts/")) {
    const parts = url.pathname.split("/").filter(Boolean);
    const accountId = decodeURIComponent(parts[2] || "");
    if (!accountId) {
      return json(res, 400, { error: "Missing account id" });
    }

    const removed = deleteCloudAccount(accountId);
    return json(res, 200, { ok: true, removed });
  }
	
  if (req.method === "GET" && url.pathname === "/cloud/linked-tracks") {
    return json(res, 200, {
      ok: true,
      items: listCloudLinkedTracks(),
    });
  }

  if (req.method === "DELETE" && url.pathname.startsWith("/cloud/linked-tracks/")) {
    const trackId = decodeURIComponent(url.pathname.replace("/cloud/linked-tracks/", "").trim());
    const removed = deleteCloudLinkedTrack(trackId);
    if (!removed) return json(res, 404, { error: "Google Drive linked track not found" });
    return json(res, 200, { ok: true, item: removed, deletedCloudLink: true });
  }

  if (req.method === "POST" && url.pathname === "/cloud/google/link-track") {
    const body = await readJsonBody(req).catch(() => null);
    const accountId = String(body?.accountId || "").trim();
    const file = body?.file || body || {};
    const fileId = String(file?.id || body?.fileId || "").trim();
    const name = String(file?.name || body?.name || "").trim();
    const mimeType = String(file?.mimeType || body?.mimeType || "").trim();

    if (!accountId || !fileId || !name) {
      return json(res, 400, { error: "Missing Google Drive link payload" });
    }

    if (!isSupportedCloudAudioName(name, mimeType)) {
      return json(res, 415, { error: "Only audio files can be added to BRMedia Library for cloud playback." });
    }

    let track = createGoogleDriveLinkedTrack({
      accountId,
      fileId,
      name,
      mimeType,
      size: Number(file?.size || body?.size || 0),
      modifiedTime: String(file?.modifiedTime || body?.modifiedTime || ""),
      webViewLink: String(file?.webViewLink || body?.webViewLink || ""),
    });

    track = await hydrateGoogleDriveLinkedTrackMetadata(track.id).catch(() => track);

    appendStatsEvent("cloud_link_add", "imports", {
      entityType: "audio",
      entityId: track.id,
      title: track.title || track.name,
      status: "done",
      route: "settings",
      source: "google_drive",
    });

    return json(res, 200, { ok: true, track });
  }

  if (
    req.method === "POST" &&
    url.pathname.startsWith("/cloud/google/linked-tracks/") &&
    url.pathname.endsWith("/refresh-metadata")
  ) {
    const trackId = decodeURIComponent(
      url.pathname
        .replace("/cloud/google/linked-tracks/", "")
        .replace(/\/refresh-metadata$/, "")
        .trim()
    );

    if (!trackId) {
      return json(res, 400, { error: "Missing Google Drive linked track id" });
    }

    const existing = getCloudLinkedTrack(trackId);
    if (!existing) {
      return json(res, 404, { error: "Google Drive linked track not found" });
    }

    const track = await hydrateGoogleDriveLinkedTrackMetadata(trackId);

    appendStatsEvent("cloud_link_metadata_refresh", "imports", {
      entityType: "audio",
      entityId: track.id,
      title: track.title || track.name,
      status: "done",
      route: "settings",
      source: "google_drive",
    });

    return json(res, 200, { ok: true, track });
  }
	
  if (req.method === "GET" && url.pathname.startsWith("/cloud/google/artwork/")) {
    const trackId = decodeURIComponent(url.pathname.replace("/cloud/google/artwork/", "").trim());
    const track = getCloudLinkedTrack(trackId);

    if (!track) return json(res, 404, { error: "Google Drive linked track not found" });

    if (!sendCloudLinkedArtwork(res, track)) {
      return json(res, 404, { error: "No Google Drive artwork cached for this track" });
    }

    return true;
  }

  if ((req.method === "GET" || req.method === "HEAD") && url.pathname.startsWith("/cloud/google/stream/")) {
    const trackId = decodeURIComponent(url.pathname.replace("/cloud/google/stream/", "").trim());
    if (!trackId) return json(res, 400, { error: "Missing Google Drive linked track id" });
    await streamGoogleDriveLinkedTrack(req, res, trackId);
    return true;
  }

  if (req.method === "POST" && url.pathname.startsWith("/cloud/google/import-linked/")) {
    const trackId = decodeURIComponent(url.pathname.replace("/cloud/google/import-linked/", "").trim());
    const track = getCloudLinkedTrack(trackId);
    if (!track) return json(res, 404, { error: "Google Drive linked track not found" });

    const result = await importGoogleDriveFile(track.accountId, track.fileId, cfg);
    const linkedTrack = rememberCloudLinkedImport(track.id, result);
    return json(res, 200, { ok: true, ...result, linkedTrack });
  }

  if (req.method === "GET" && url.pathname === "/cloud/import-jobs") {
    return json(res, 200, {
      ok: true,
      jobs: listCloudImportJobs(),
    });
  }

  if (req.method === "GET" && url.pathname === "/cloud/sync") {
    return json(res, 200, {
      ok: true,
      rules: listCloudSyncRules(),
      jobs: listCloudSyncJobs(),
    });
  }

  if (req.method === "POST" && url.pathname === "/cloud/sync") {
    const body = await readJsonBody(req).catch(() => null);
    const providerRaw = String(body?.provider || "").trim();
    const provider: CloudProvider = providerRaw === "dropbox" ? "dropbox" : "google_drive";
    const accountId = String(body?.accountId || "").trim();

    if (!accountId) {
      return json(res, 400, { error: "Missing cloud account id" });
    }

    const rule = saveCloudSyncRule({
      provider,
      accountId,
      title: String(body?.title || "Cloud Sync"),
      folderId: String(body?.folderId || "").trim(),
      path: String(body?.path || "").trim(),
      category: String(body?.category || "auto").trim(),
      primaryBrand: String(body?.primaryBrand || "").trim(),
      recursive: body?.recursive !== false,
      autoSync: body?.autoSync === true,
    });

    return json(res, 200, { ok: true, rule });
  }

  if (req.method === "DELETE" && url.pathname.startsWith("/cloud/sync/")) {
    const ruleId = decodeURIComponent(url.pathname.replace("/cloud/sync/", "").trim());
    if (!ruleId) return json(res, 400, { error: "Missing sync folder id" });
    return json(res, 200, { ok: true, removed: deleteCloudSyncRule(ruleId) });
  }

  if (req.method === "POST" && url.pathname.startsWith("/cloud/sync/") && url.pathname.endsWith("/run")) {
    const ruleId = decodeURIComponent(url.pathname.replace("/cloud/sync/", "").replace(/\/run$/, "").trim());
    if (!ruleId) return json(res, 400, { error: "Missing sync folder id" });
    const job = startCloudSyncRule(ruleId, cfg);
    return json(res, 202, { ok: true, job });
  }

  if (req.method === "POST" && url.pathname === "/cloud/sync/run-all") {
    const rules = readCloudSyncRules();
    const jobs = rules.map((rule) => startCloudSyncRule(rule.id, cfg));
    return json(res, 202, { ok: true, jobs });
  }

  if (req.method === "POST" && url.pathname === "/cloud/google/list") {
    const body = await readJsonBody(req).catch(() => null);
    const accountId = String(body?.accountId || "").trim();

    if (!accountId) {
      return json(res, 400, { error: "Missing Google account id" });
    }

    const items = await listGoogleDriveFiles(
      accountId,
      String(body?.folderId || "root"),
      String(body?.query || "")
    );

    return json(res, 200, { ok: true, items });
  }

  if (req.method === "POST" && url.pathname === "/cloud/google/import-job") {
    const body = await readJsonBody(req).catch(() => null);
    const accountId = String(body?.accountId || "").trim();
    const fileId = String(body?.fileId || "").trim();
    const name = String(body?.name || "").trim();

    if (!accountId || !fileId) {
      return json(res, 400, { error: "Missing Google Drive import payload" });
    }

    const job = startGoogleDriveImportJob(accountId, fileId, name, cfg);
    return json(res, 202, { ok: true, job });
  }

  if (req.method === "POST" && url.pathname === "/cloud/google/import") {
    const body = await readJsonBody(req).catch(() => null);
    const accountId = String(body?.accountId || "").trim();
    const fileId = String(body?.fileId || "").trim();

    if (!accountId || !fileId) {
      return json(res, 400, { error: "Missing Google Drive import payload" });
    }

    const result = await importGoogleDriveFile(accountId, fileId, cfg);
    return json(res, 200, { ok: true, ...result });
  }

  if (req.method === "POST" && url.pathname === "/cloud/dropbox/list") {
    const body = await readJsonBody(req).catch(() => null);
    const accountId = String(body?.accountId || "").trim();

    if (!accountId) {
      return json(res, 400, { error: "Missing Dropbox account id" });
    }

    const items = await listDropboxFiles(accountId, String(body?.path || ""));
    return json(res, 200, { ok: true, items });
  }

  if (req.method === "POST" && url.pathname === "/cloud/dropbox/search") {
    const body = await readJsonBody(req).catch(() => null);
    const accountId = String(body?.accountId || "").trim();
    const query = String(body?.query || "").trim();

    if (!accountId || !query) {
      return json(res, 400, { error: "Missing Dropbox search payload" });
    }

    const items = await searchDropboxFiles(accountId, query);
    return json(res, 200, { ok: true, items });
  }

  if (req.method === "POST" && url.pathname === "/cloud/dropbox/import-job") {
    const body = await readJsonBody(req).catch(() => null);
    const accountId = String(body?.accountId || "").trim();
    const filePath = String(body?.path || "").trim();
    const name = String(body?.name || "").trim();

    if (!accountId || !filePath) {
      return json(res, 400, { error: "Missing Dropbox import payload" });
    }

    const job = startDropboxImportJob(accountId, filePath, name, cfg);
    return json(res, 202, { ok: true, job });
  }

  if (req.method === "POST" && url.pathname === "/cloud/dropbox/import") {
    const body = await readJsonBody(req).catch(() => null);
    const accountId = String(body?.accountId || "").trim();
    const filePath = String(body?.path || "").trim();

    if (!accountId || !filePath) {
      return json(res, 400, { error: "Missing Dropbox import payload" });
    }

    const result = await importDropboxFile(accountId, filePath, cfg);
    return json(res, 200, { ok: true, ...result });
  }

  return false;
}