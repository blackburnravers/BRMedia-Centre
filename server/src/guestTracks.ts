import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import type { IncomingMessage, ServerResponse } from "node:http";
import { json } from "./utils/json";
import { listLibrary } from "./db/library";
import { streamFileWithRange } from "./streaming/rangeStream";
import {
  UploadError,
  UploadSessionService,
  getUploadSessionService,
} from "./uploadSessions";

export const GUEST_SCHEMA_VERSION = 1;
export const GUEST_RETENTION_MS = 14 * 24 * 60 * 60 * 1000;
export const GUEST_FAILED_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
export const PROBE_TIMEOUT_MS = 15_000;
export const PROBE_MAX_OUTPUT_BYTES = 1024 * 1024;
export const PROBE_MAX_STDERR_BYTES = 64 * 1024;
export const PROBE_MAX_STREAMS = 16;
export const PROBE_MAX_TAGS = 128;
export const PROBE_MAX_TAG_TEXT = 16 * 1024;
export const DUPLICATE_CANDIDATE_LIMIT = 10;
export const GUEST_LOADING_LEASE_MS = 90 * 1000;
export const GUEST_LOADED_LEASE_MS = 5 * 60 * 1000;
export const GUEST_MAX_RESERVATIONS = 4;
export const GUEST_RELEASE_TOMBSTONE_MS = 10 * 60 * 1000;
export const GUEST_RELEASE_TOMBSTONE_LIMIT = 16;

export type ValidationState =
  | "transfer-complete" | "validation-pending" | "probing" | "valid-audio"
  | "duplicate-checking" | "duplicate-review" | "guest-promoting"
  | "guest-ready" | "validation-failed" | "unsupported" | "quarantined"
  | "cancelled" | "cleanup-pending";

type CompactMetadata = {
  title: string;
  artist: string;
  album: string;
  genre: string;
  year: number | null;
  trackNumber: number | null;
  discNumber: number | null;
  duration: number;
  container: string;
  codec: string;
  sampleRate: number | null;
  channelCount: number | null;
  bitRate: number | null;
  artworkPresent: boolean;
  artwork: { count: number; maximumBytes: number | null };
};

type DuplicateResult = {
  result: "no-duplicate" | "exact-library-duplicate" | "exact-guest-duplicate"
    | "same-content-different-name" | "same-name-different-content"
    | "probable-duplicate" | "duplicate-check-inconclusive";
  requiresReview: boolean;
  candidates: Array<{
    kind: "guest" | "library";
    id: string;
    exact: boolean;
    title: string;
    artist: string;
    duration: number | null;
  }>;
  resolution: string | null;
};

type ValidationRecord = {
  schemaVersion: 1;
  uploadSessionId: string;
  generation: number;
  revision: number;
  state: ValidationState;
  createdAt: number;
  updatedAt: number;
  validationTimestamp: number | null;
  sourceIdentity: { size: number; mtimeMs: number; ino: number; dev: number } | null;
  contentHash: string | null;
  metadata: CompactMetadata | null;
  mediaPolicy: string | null;
  duplicate: DuplicateResult | null;
  guestId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  retryable: boolean;
  userActionRequired: boolean;
  recoveredAt: number | null;
};

type GuestRecord = {
  schemaVersion: 1;
  id: string;
  sourceUploadSessionId: string;
  completedTransferIdentity: string;
  contentHash: string;
  displayFilename: string;
  metadata: CompactMetadata;
  fileSize: number;
  validationStatus: "guest-ready";
  duplicateStatus: DuplicateResult["result"];
  duplicateResolution: string | null;
  createdAt: number;
  lastAccessedAt: number;
  retentionExpiresAt: number;
  activeReferences: number;
  deckReservation: boolean;
  importReservation: boolean;
  recoveryState: "healthy" | "recovered" | "missing";
  cleanupState: "retained" | "cleanup-pending" | "cleanup-failed";
  capabilities: {
    nativeLoadEligibleLater: boolean;
    mixxxLoadEligibleLater: boolean;
    requiresConversionLater: boolean;
  };
  privateFilePath: string;
  reservations: GuestReservation[];
  releasedReservations?: ReleasedGuestReservation[];
};

type GuestReservation = {
  id: string;
  tokenHash: string;
  clientId: string;
  deckId: "d1" | "d2";
  generation: number;
  state: "loading" | "loaded";
  createdAt: number;
  refreshedAt: number;
  expiresAt: number;
};

type ReleasedGuestReservation = {
  id: string;
  tokenHash: string;
  releasedAt: number;
};

type ProbeRunner = (
  filePath: string,
  signal: AbortSignal
) => Promise<any>;

export class GuestValidationError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
    readonly retryable = false,
    readonly userActionRequired = false
  ) { super(message); }
}

function projectRoot() {
  return fs.existsSync(path.join(process.cwd(), "server", "src"))
    ? process.cwd() : path.resolve(__dirname, "..", "..");
}

export function defaultGuestRoot() {
  return path.resolve(projectRoot(), "server", ".uploads", "guest-tracks");
}

function inside(root: string, candidate: string) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function atomicJson(target: string, value: unknown) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
  try { fs.renameSync(temporary, target); }
  finally { try { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); } catch {} }
}

function cleanText(value: unknown, maximum = 256) {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximum);
}

function finite(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function integer(value: unknown) {
  const match = String(value ?? "").match(/^\s*(\d{1,6})/);
  return match ? Number(match[1]) : null;
}

function ffprobeExecutable() {
  const configured = String(process.env.FFPROBE_PATH || "").trim();
  if (configured) return configured;
  const bundled = "C:\\ffmpeg-8.0.1\\bin\\ffprobe.exe";
  if (process.platform === "win32" && fs.existsSync(bundled)) return bundled;
  return process.platform === "win32" ? "ffprobe.exe" : "ffprobe";
}

export function boundedFfprobe(filePath: string, signal: AbortSignal): Promise<any> {
  return new Promise((resolve, reject) => {
    let stdout = Buffer.alloc(0);
    let stderrBytes = 0;
    let settled = false;
    let child: ChildProcess;
    try {
      child = spawn(ffprobeExecutable(), [
        "-v", "error", "-print_format", "json",
        "-show_format", "-show_streams", filePath,
      ], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    } catch {
      reject(new GuestValidationError("probe-failed", "Media probe could not start", 503, true));
      return;
    }
    const finish = (error?: Error, value?: any) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      error ? reject(error) : resolve(value);
    };
    const abort = () => {
      child.kill("SIGKILL");
      finish(new GuestValidationError("validation-cancelled", "Validation was cancelled", 409));
    };
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(new GuestValidationError("probe-timeout", "Media validation timed out", 408, true));
    }, PROBE_TIMEOUT_MS);
    signal.addEventListener("abort", abort, { once: true });
    child.stdout!.on("data", (chunk: Buffer) => {
      if (stdout.length + chunk.length > PROBE_MAX_OUTPUT_BYTES) {
        child.kill("SIGKILL");
        finish(new GuestValidationError(
          "resource-limit-exceeded", "Media probe output exceeded its safe limit", 422
        ));
        return;
      }
      stdout = Buffer.concat([stdout, chunk]);
    });
    child.stderr!.on("data", (chunk: Buffer) => {
      stderrBytes += chunk.length;
      if (stderrBytes > PROBE_MAX_STDERR_BYTES) child.kill("SIGKILL");
    });
    child.on("error", () => finish(
      new GuestValidationError("probe-failed", "Media probe failed to run", 503, true)
    ));
    child.on("close", (code) => {
      if (settled) return;
      if (code !== 0 || stderrBytes > PROBE_MAX_STDERR_BYTES) {
        finish(new GuestValidationError("probe-failed", "File is not valid playable media", 422));
        return;
      }
      try { finish(undefined, JSON.parse(stdout.toString("utf8"))); }
      catch { finish(new GuestValidationError(
        "invalid-probe-output", "Media probe returned invalid data", 422
      )); }
    });
  });
}

const DIRECT_CODECS = new Set([
  "mp3", "aac", "flac", "alac", "pcm_s16le", "pcm_s24le", "pcm_s32le",
]);
const DIRECT_CONTAINERS = new Set([
  "mp3", "wav", "mov", "mp4", "m4a", "3gp", "3g2", "mj2", "flac",
]);

export function compactProbe(raw: any, fallbackTitle: string): {
  metadata: CompactMetadata; policy: string;
} {
  if (!raw || !Array.isArray(raw.streams) || !raw.format) {
    throw new GuestValidationError("invalid-probe-output", "Media probe returned incomplete data", 422);
  }
  if (raw.streams.length > PROBE_MAX_STREAMS) {
    throw new GuestValidationError("resource-limit-exceeded", "Media contains too many streams", 422);
  }
  const audio = raw.streams.filter((stream: any) => stream?.codec_type === "audio");
  if (!audio.length) {
    throw new GuestValidationError("no-audio-stream", "File does not contain an audio stream", 422);
  }
  const stream = audio[0];
  const duration = finite(stream.duration) ?? finite(raw.format.duration);
  if (duration === null || duration <= 0 || duration > 24 * 60 * 60) {
    throw new GuestValidationError("invalid-duration", "Media duration is invalid", 422);
  }
  const formatNames = cleanText(raw.format.format_name, 128).split(",");
  const container = formatNames[0] || "unknown";
  const codec = cleanText(stream.codec_name, 64).toLowerCase();
  const tags = { ...(raw.format.tags || {}), ...(stream.tags || {}) };
  const entries = Object.entries(tags);
  const tagSize = entries.reduce((sum, [key, value]) =>
    sum + String(key).length + String(value).length, 0);
  if (entries.length > PROBE_MAX_TAGS || tagSize > PROBE_MAX_TAG_TEXT) {
    throw new GuestValidationError("metadata-too-large", "Embedded metadata exceeds its safe limit", 422);
  }
  const artwork = raw.streams.filter((candidate: any) =>
    candidate?.codec_type === "video" && Number(candidate?.disposition?.attached_pic) === 1
  );
  const maximumBytes = artwork.reduce((max: number, candidate: any) =>
    Math.max(max, finite(candidate?.tags?.NUMBER_OF_BYTES) || 0), 0) || null;
  const policy = DIRECT_CODECS.has(codec) && formatNames.some((name) => DIRECT_CONTAINERS.has(name))
    ? "supported-direct" : "unsupported";
  const lookup = (name: string) => tags[name] ?? tags[name.toUpperCase()] ?? "";
  return {
    policy,
    metadata: {
      title: cleanText(lookup("title"), 256) || cleanText(fallbackTitle, 256) || "Untitled upload",
      artist: cleanText(lookup("artist"), 256),
      album: cleanText(lookup("album"), 256),
      genre: cleanText(lookup("genre"), 128),
      year: integer(lookup("date") || lookup("year")),
      trackNumber: integer(lookup("track")),
      discNumber: integer(lookup("disc")),
      duration,
      container,
      codec,
      sampleRate: finite(stream.sample_rate),
      channelCount: finite(stream.channels),
      bitRate: finite(stream.bit_rate) ?? finite(raw.format.bit_rate),
      artworkPresent: artwork.length > 0,
      artwork: { count: Math.min(artwork.length, PROBE_MAX_STREAMS), maximumBytes },
    },
  };
}

async function sha256(filePath: string, signal: AbortSignal) {
  const hash = crypto.createHash("sha256");
  for await (const chunk of fs.createReadStream(filePath, { highWaterMark: 1024 * 1024 })) {
    if (signal.aborted) throw new GuestValidationError(
      "validation-cancelled", "Validation was cancelled", 409
    );
    hash.update(chunk);
  }
  return hash.digest("hex");
}

function safeValidation(record: ValidationRecord) {
  return { ...record };
}

function safeGuest(guest: GuestRecord) {
  const {
    privateFilePath: _private,
    releasedReservations: _released,
    ...safe
  } = guest;
  const reservations = activeReservations(guest, Date.now()).map((reservation) => ({
    deckId: reservation.deckId,
    state: reservation.state,
    expiresAt: reservation.expiresAt,
  }));
  return {
    ...safe,
    reservations,
    activeReferences: reservations.length,
    deckReservation: reservations.length > 0,
    playable: guestEligibility(guest, Date.now()).ok,
    retainedFromCleanup: reservations.length > 0,
  };
}

function activeReservations(guest: GuestRecord, now: number) {
  return (Array.isArray(guest.reservations) ? guest.reservations : [])
    .filter((reservation) => reservation.expiresAt > now);
}

function guestEligibility(guest: GuestRecord, now: number) {
  if (guest.validationStatus !== "guest-ready") {
    return { ok: false as const, code: "guest-not-ready", status: 409 };
  }
  if (guest.cleanupState !== "retained") {
    return { ok: false as const, code: "guest-cleanup-pending", status: 410 };
  }
  if (guest.retentionExpiresAt <= now && !activeReservations(guest, now).length) {
    return { ok: false as const, code: "guest-expired", status: 410 };
  }
  if (guest.recoveryState === "missing") {
    return { ok: false as const, code: "guest-media-missing", status: 410 };
  }
  if (!guest.capabilities.nativeLoadEligibleLater ||
      guest.capabilities.requiresConversionLater) {
    return { ok: false as const, code: "guest-codec-unsupported", status: 415 };
  }
  return { ok: true as const };
}

function guestMime(metadata: CompactMetadata) {
  const codec = metadata.codec.toLowerCase();
  const container = metadata.container.toLowerCase();
  if (codec === "mp3") return { mimeType: "audio/mpeg", codecs: "mp3" };
  if (codec === "aac" && ["mov", "mp4", "m4a"].includes(container)) {
    return { mimeType: "audio/mp4", codecs: "mp4a.40.2" };
  }
  if (codec === "aac") return { mimeType: "audio/aac", codecs: "mp4a.40.2" };
  if (codec === "flac") return { mimeType: "audio/flac", codecs: "flac" };
  if (codec === "alac") return { mimeType: "audio/mp4", codecs: "alac" };
  if (codec.startsWith("pcm_")) return { mimeType: "audio/wav", codecs: "1" };
  return { mimeType: "application/octet-stream", codecs: "" };
}

function leaseTokenHash(token: string) {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

function safeEqualHex(left: string, right: string) {
  const a = Buffer.from(left, "hex");
  const b = Buffer.from(right, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export class GuestTrackService {
  private readonly validations = new Map<string, ValidationRecord>();
  private readonly guests = new Map<string, GuestRecord>();
  private readonly active = new Map<string, AbortController>();
  private cleanupTimer: NodeJS.Timeout | null = null;
  readonly metrics = {
    validationsStarted: 0, validationsCompleted: 0, probeFailures: 0,
    probeTimeouts: 0, unsupportedFiles: 0, exactDuplicates: 0,
    probableDuplicates: 0, duplicateResolutions: 0, guestsCreated: 0,
    cleanupSuccesses: 0, cleanupFailures: 0, sourceReselections: 0,
    sourceMismatches: 0, reservationsCreated: 0, reservationsRefreshed: 0,
    reservationsTransferred: 0, reservationsReleased: 0,
    staleReservationsExpired: 0, cleanupRetainedForDeck: 0, mediaRequests: 0,
    reservationConflicts: 0, idempotentReleases: 0,
    mediaRangeRequests: 0, mediaRequestsAborted: 0,
  };

  constructor(
    readonly uploads: UploadSessionService,
    readonly root = defaultGuestRoot(),
    readonly probe: ProbeRunner = boundedFfprobe,
    readonly now = () => Date.now()
  ) {
    for (const directory of [root, this.metadataRoot(), this.filesRoot()]) {
      fs.mkdirSync(directory, { recursive: true });
    }
    this.recover();
  }

  private metadataRoot() { return path.join(this.root, "metadata"); }
  private filesRoot() { return path.join(this.root, "files"); }
  private validationPath(id: string) { return path.join(this.metadataRoot(), `validation-${id}.json`); }
  private guestPath(id: string) { return path.join(this.metadataRoot(), `guest-${id}.json`); }
  private persistValidation(record: ValidationRecord) {
    record.updatedAt = this.now();
    record.revision += 1;
    atomicJson(this.validationPath(record.uploadSessionId), record);
    this.validations.set(record.uploadSessionId, record);
    this.uploads.setValidationClaim(record.uploadSessionId, ![
      "validation-failed", "unsupported", "cancelled", "cleanup-pending",
    ].includes(record.state));
  }
  private persistGuest(guest: GuestRecord) {
    atomicJson(this.guestPath(guest.id), guest);
    this.guests.set(guest.id, guest);
  }

  startCleanup() {
    if (this.cleanupTimer) return;
    this.cleanupTimer = setInterval(() => this.cleanup(), 60 * 60 * 1000);
    this.cleanupTimer.unref?.();
  }
  stop() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    this.cleanupTimer = null;
    for (const controller of this.active.values()) controller.abort();
  }

  private initial(uploadSessionId: string): ValidationRecord {
    const timestamp = this.now();
    return {
      schemaVersion: 1, uploadSessionId, generation: 1, revision: 0,
      state: "validation-pending", createdAt: timestamp, updatedAt: timestamp,
      validationTimestamp: null, sourceIdentity: null, contentHash: null,
      metadata: null, mediaPolicy: null, duplicate: null, guestId: null,
      errorCode: null, errorMessage: null, retryable: false,
      userActionRequired: false, recoveredAt: null,
    };
  }

  async validate(uploadSessionId: string, token: string) {
    const existing = this.validations.get(uploadSessionId);
    if (existing && ["probing", "duplicate-checking", "guest-promoting"].includes(existing.state)) {
      return safeValidation(existing);
    }
    if (existing && ["guest-ready", "duplicate-review"].includes(existing.state)) {
      return safeValidation(existing);
    }
    const source = this.uploads.completedSource(uploadSessionId, token);
    const record = existing || this.initial(uploadSessionId);
    record.generation += existing ? 1 : 0;
    record.state = "validation-pending";
    record.errorCode = record.errorMessage = null;
    record.retryable = record.userActionRequired = false;
    record.duplicate = null;
    this.persistValidation(record);
    const controller = new AbortController();
    this.active.set(uploadSessionId, controller);
    this.metrics.validationsStarted += 1;
    try {
      record.state = "probing";
      record.sourceIdentity = source.statIdentity;
      this.persistValidation(record);
      const [raw, digest] = await Promise.all([
        this.probe(source.path, controller.signal),
        sha256(source.path, controller.signal),
      ]);
      const compact = compactProbe(raw, path.parse(source.filename).name);
      record.metadata = compact.metadata;
      record.mediaPolicy = compact.policy;
      record.contentHash = digest;
      record.validationTimestamp = this.now();
      if (compact.policy === "unsupported") {
        record.state = "unsupported";
        record.errorCode = "unsupported-codec";
        record.errorMessage = "This valid audio format is not approved for guest tracks yet";
        this.metrics.unsupportedFiles += 1;
        this.persistValidation(record);
        return safeValidation(record);
      }
      record.state = "valid-audio";
      this.persistValidation(record);
      record.state = "duplicate-checking";
      this.persistValidation(record);
      record.duplicate = this.duplicates(record, source.filename);
      if (record.duplicate.requiresReview) {
        record.state = "duplicate-review";
        record.userActionRequired = true;
        record.errorCode = "duplicate-review-required";
        record.errorMessage = "Choose how to handle the possible duplicate";
        this.metrics.probableDuplicates += 1;
        this.persistValidation(record);
        return safeValidation(record);
      }
      await this.promote(record, source);
      this.metrics.validationsCompleted += 1;
      return safeValidation(record);
    } catch (error) {
      const failure = error instanceof GuestValidationError ? error :
        error instanceof UploadError ? new GuestValidationError(
          error.code, error.message, error.status, error.retryable
        ) : new GuestValidationError("probe-failed", "Media validation failed", 500, true);
      record.state = failure.code === "validation-cancelled" ? "cancelled" : "validation-failed";
      record.errorCode = failure.code;
      record.errorMessage = failure.message;
      record.retryable = failure.retryable;
      record.userActionRequired = failure.userActionRequired;
      this.metrics.probeFailures += 1;
      if (failure.code === "probe-timeout") this.metrics.probeTimeouts += 1;
      this.persistValidation(record);
      return safeValidation(record);
    } finally {
      this.active.delete(uploadSessionId);
    }
  }

  private duplicates(record: ValidationRecord, filename: string): DuplicateResult {
    const metadata = record.metadata!;
    const candidates: DuplicateResult["candidates"] = [];
    let result: DuplicateResult["result"] = "no-duplicate";
    for (const guest of this.guests.values()) {
      if (guest.contentHash === record.contentHash) {
        candidates.push({
          kind: "guest", id: guest.id, exact: true, title: guest.metadata.title,
          artist: guest.metadata.artist, duration: guest.metadata.duration,
        });
        result = guest.displayFilename === filename
          ? "exact-guest-duplicate" : "same-content-different-name";
        this.metrics.exactDuplicates += 1;
        break;
      }
      const sameName = guest.displayFilename.toLocaleLowerCase() === filename.toLocaleLowerCase();
      const sameMetadata = metadata.title && guest.metadata.title.localeCompare(
        metadata.title, undefined, { sensitivity: "base" }
      ) === 0 && metadata.artist && guest.metadata.artist.localeCompare(
        metadata.artist, undefined, { sensitivity: "base" }
      ) === 0 && Math.abs(guest.metadata.duration - metadata.duration) <= 2;
      if (sameName || sameMetadata) {
        candidates.push({
          kind: "guest", id: guest.id, exact: false, title: guest.metadata.title,
          artist: guest.metadata.artist, duration: guest.metadata.duration,
        });
        result = sameName ? "same-name-different-content" : "probable-duplicate";
      }
      if (candidates.length >= DUPLICATE_CANDIDATE_LIMIT) break;
    }
    if (candidates.length < DUPLICATE_CANDIDATE_LIMIT) {
      for (const item of listLibrary()) {
        const storedHash = cleanText(
          (item as any).contentHash || (item as any).sha256, 64
        ).toLowerCase();
        const itemTitle = cleanText(item.title, 256);
        const itemArtist = cleanText(item.artist || item.albumArtist, 256);
        const itemDuration = finite(item.duration);
        if (storedHash && /^[a-f0-9]{64}$/.test(storedHash) &&
            storedHash === record.contentHash) {
          candidates.push({
            kind: "library", id: item.id, exact: true, title: itemTitle,
            artist: itemArtist, duration: itemDuration,
          });
          result = "exact-library-duplicate";
          this.metrics.exactDuplicates += 1;
          break;
        }
        const sameName = path.basename(item.locator).toLocaleLowerCase() ===
          filename.toLocaleLowerCase();
        const sameMetadata = Boolean(metadata.title && itemTitle &&
          metadata.title.localeCompare(itemTitle, undefined, { sensitivity: "base" }) === 0 &&
          metadata.artist && itemArtist &&
          metadata.artist.localeCompare(itemArtist, undefined, { sensitivity: "base" }) === 0 &&
          itemDuration !== null && Math.abs(itemDuration - metadata.duration) <= 2);
        if (sameName || sameMetadata) {
          candidates.push({
            kind: "library", id: item.id, exact: false, title: itemTitle,
            artist: itemArtist, duration: itemDuration,
          });
          result = sameName ? "same-name-different-content" : "probable-duplicate";
        }
        if (candidates.length >= DUPLICATE_CANDIDATE_LIMIT) break;
      }
    }
    return {
      result,
      requiresReview: candidates.some((candidate) => !candidate.exact),
      candidates: candidates.slice(0, DUPLICATE_CANDIDATE_LIMIT),
      resolution: candidates.every((candidate) => candidate.exact) && candidates.length
        ? "use-existing-guest" : candidates.length ? null : "keep-separate-guest",
    };
  }

  private unchanged(source: ReturnType<UploadSessionService["completedSource"]>) {
    const stat = fs.lstatSync(source.path);
    return stat.isFile() && !stat.isSymbolicLink() && stat.size === source.statIdentity.size &&
      stat.mtimeMs === source.statIdentity.mtimeMs &&
      Number(stat.ino) === source.statIdentity.ino && Number(stat.dev) === source.statIdentity.dev;
  }

  private async promote(
    record: ValidationRecord,
    source: ReturnType<UploadSessionService["completedSource"]>
  ) {
    if (!record.metadata || !record.contentHash || record.mediaPolicy !== "supported-direct") {
      throw new GuestValidationError("guest-promotion-failed", "Validation is incomplete", 409);
    }
    if (!this.unchanged(source)) {
      throw new GuestValidationError(
        "guest-promotion-failed", "Completed media changed after validation", 409
      );
    }
    const exact = record.duplicate?.candidates.find((candidate) => candidate.exact);
    if (exact?.kind === "guest" && record.duplicate?.resolution === "use-existing-guest") {
      record.guestId = exact.id;
      record.state = "guest-ready";
      record.errorCode = record.errorMessage = null;
      this.persistValidation(record);
      return;
    }
    record.state = "guest-promoting";
    this.persistValidation(record);
    const id = crypto.randomBytes(24).toString("base64url");
    const extension = path.extname(source.filename).slice(0, 16);
    const destination = path.join(this.filesRoot(), `${id}${extension}`);
    if (!inside(this.filesRoot(), destination) || fs.existsSync(destination)) {
      throw new GuestValidationError("guest-storage-unavailable", "Guest storage is unavailable", 507, true);
    }
    fs.renameSync(source.path, destination);
    const stat = fs.lstatSync(destination);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== source.totalSize) {
      throw new GuestValidationError("guest-promotion-failed", "Guest promotion could not be verified", 500, true);
    }
    const timestamp = this.now();
    const guest: GuestRecord = {
      schemaVersion: 1, id, sourceUploadSessionId: source.id,
      completedTransferIdentity: `${source.id}:${source.revision}`,
      contentHash: record.contentHash, displayFilename: source.filename,
      metadata: record.metadata, fileSize: source.totalSize,
      validationStatus: "guest-ready",
      duplicateStatus: record.duplicate?.result || "no-duplicate",
      duplicateResolution: record.duplicate?.resolution || null,
      createdAt: timestamp, lastAccessedAt: timestamp,
      retentionExpiresAt: timestamp + GUEST_RETENTION_MS, activeReferences: 0,
      deckReservation: false, importReservation: false, recoveryState: "healthy",
      cleanupState: "retained",
      capabilities: {
        nativeLoadEligibleLater: true, mixxxLoadEligibleLater: false,
        requiresConversionLater: false,
      },
      privateFilePath: destination,
      reservations: [],
    };
    this.persistGuest(guest);
    this.uploads.markPromoted(source.id);
    record.guestId = id;
    record.state = "guest-ready";
    record.errorCode = record.errorMessage = null;
    record.userActionRequired = false;
    this.persistValidation(record);
    this.metrics.guestsCreated += 1;
  }

  cancel(id: string) {
    const record = this.validations.get(id);
    if (!record) throw new GuestValidationError(
      "validation-session-not-found", "Validation was not found", 404
    );
    this.active.get(id)?.abort();
    if (!this.active.has(id) && !["guest-ready", "cleanup-pending"].includes(record.state)) {
      record.state = "cancelled";
      record.errorCode = "validation-cancelled";
      record.errorMessage = "Validation was cancelled";
      this.persistValidation(record);
    }
    return safeValidation(record);
  }

  async resolve(id: string, token: string, choice: string, candidateId?: string) {
    const record = this.validations.get(id);
    if (!record || record.state !== "duplicate-review" || !record.duplicate) {
      throw new GuestValidationError(
        "duplicate-resolution-invalid", "This validation is not awaiting duplicate review", 409
      );
    }
    if (choice === "return-to-review") return safeValidation(record);
    if (choice === "use-existing-guest") {
      const candidate = record.duplicate.candidates.find((item) =>
        item.kind === "guest" && item.id === candidateId
      );
      if (!candidate) throw new GuestValidationError(
        "duplicate-resolution-invalid", "Duplicate guest choice is invalid", 400
      );
      record.duplicate.resolution = choice;
      record.duplicate.requiresReview = false;
      await this.promote(record, this.uploads.completedSource(id, token));
    } else if (choice === "use-existing-library") {
      const candidate = record.duplicate.candidates.find((item) =>
        item.kind === "library" && item.id === candidateId
      );
      if (!candidate) throw new GuestValidationError(
        "duplicate-resolution-invalid", "Duplicate library choice is invalid", 400
      );
      record.duplicate.resolution = choice;
      record.duplicate.requiresReview = false;
      record.state = "cleanup-pending";
      record.errorCode = record.errorMessage = null;
      record.userActionRequired = false;
      this.persistValidation(record);
    } else if (choice === "keep-separate-guest") {
      record.duplicate.resolution = choice;
      record.duplicate.requiresReview = false;
      await this.promote(record, this.uploads.completedSource(id, token));
    } else if (choice === "discard-upload") {
      record.duplicate.resolution = choice;
      record.state = "cleanup-pending";
      this.persistValidation(record);
    } else {
      throw new GuestValidationError(
        "duplicate-resolution-invalid", "Duplicate resolution is invalid", 400
      );
    }
    this.metrics.duplicateResolutions += 1;
    return safeValidation(record);
  }

  status(id: string) {
    const record = this.validations.get(id);
    if (!record) throw new GuestValidationError(
      "validation-session-not-found", "Validation was not found", 404
    );
    return safeValidation(record);
  }

  listGuests(cursor = "", limit = 25) {
    const bounded = Math.max(1, Math.min(100, limit));
    const all = [...this.guests.values()].sort((a, b) => b.createdAt - a.createdAt);
    const start = cursor ? Math.max(0, all.findIndex((guest) => guest.id === cursor) + 1) : 0;
    const page = all.slice(start, start + bounded);
    return {
      schemaVersion: GUEST_SCHEMA_VERSION,
      items: page.map(safeGuest),
      nextCursor: start + bounded < all.length ? page[page.length - 1]?.id || null : null,
    };
  }

  listGuestsForUpload(
    uploadSessionId: string,
    uploadToken: string,
    cursor = "",
    limit = 25
  ) {
    this.uploads.status(uploadSessionId, uploadToken);
    const result = this.listGuests(cursor, 100);
    const items = result.items.filter((guest) =>
      guest.sourceUploadSessionId === uploadSessionId
    ).slice(0, Math.max(1, Math.min(100, limit)));
    return {
      schemaVersion: GUEST_SCHEMA_VERSION,
      items,
      nextCursor: null,
    };
  }

  private getGuest(id: string) {
    const guest = this.guests.get(id);
    if (!guest) throw new GuestValidationError(
      "guest-not-found", "Guest track was not found", 404
    );
    return guest;
  }

  private assertEligible(guest: GuestRecord) {
    const eligibility = guestEligibility(guest, this.now());
    if (!eligibility.ok) throw new GuestValidationError(
      eligibility.code,
      eligibility.code === "guest-expired"
        ? "Guest track has expired"
        : eligibility.code === "guest-codec-unsupported"
          ? "Guest track is not eligible for native playback"
          : "Guest track is unavailable",
      eligibility.status
    );
  }

  private expireReservations() {
    const now = this.now();
    let expired = 0;
    for (const guest of this.guests.values()) {
      const before = Array.isArray(guest.reservations) ? guest.reservations.length : 0;
      guest.reservations = activeReservations(guest, now);
      if (guest.reservations.length !== before) {
        expired += before - guest.reservations.length;
        guest.activeReferences = guest.reservations.length;
        guest.deckReservation = guest.reservations.length > 0;
        this.persistGuest(guest);
      }
    }
    this.metrics.staleReservationsExpired += expired;
  }

  reserve(
    guestId: string,
    uploadToken: string,
    input: { clientId?: unknown; deckId?: unknown; generation?: unknown }
  ) {
    const guest = this.getGuest(guestId);
    this.uploads.status(guest.sourceUploadSessionId, uploadToken);
    this.expireReservations();
    this.assertEligible(guest);
    const clientId = cleanText(input.clientId, 96);
    const deckId = input.deckId === "d2" ? "d2" : input.deckId === "d1" ? "d1" : null;
    const generation = Number(input.generation);
    if (!/^[A-Za-z0-9_-]{16,96}$/.test(clientId) || !deckId ||
        !Number.isSafeInteger(generation) || generation < 1) {
      throw new GuestValidationError(
        "guest-reservation-invalid", "Guest reservation request is invalid", 400
      );
    }
    for (const candidateGuest of this.guests.values()) {
      for (const reservation of activeReservations(candidateGuest, this.now())) {
        if (reservation.deckId !== deckId) continue;
        if (reservation.clientId !== clientId) {
          this.metrics.reservationConflicts += 1;
          throw new GuestValidationError(
            "deck-reserved",
            `${deckId === "d2" ? "Deck 2" : "Deck 1"} is controlled by another active session`,
            409, true
          );
        }
        if (candidateGuest.id === guestId && reservation.generation === generation) {
          this.metrics.reservationConflicts += 1;
          throw new GuestValidationError(
            "guest-reservation-already-exists",
            "This deck load request is already active",
            409, true
          );
        }
        if (reservation.generation > generation) {
          this.metrics.reservationConflicts += 1;
          throw new GuestValidationError(
            "stale-deck-generation", "A newer deck load already exists", 409
          );
        }
      }
    }
    if (activeReservations(guest, this.now()).length >= GUEST_MAX_RESERVATIONS) {
      throw new GuestValidationError(
        "guest-reservation-limit", "Guest track has too many active reservations", 429, true
      );
    }
    const leaseToken = crypto.randomBytes(32).toString("base64url");
    const now = this.now();
    const reservation: GuestReservation = {
      id: crypto.randomBytes(18).toString("base64url"),
      tokenHash: leaseTokenHash(leaseToken), clientId, deckId, generation,
      state: "loading", createdAt: now, refreshedAt: now,
      expiresAt: now + GUEST_LOADING_LEASE_MS,
    };
    guest.reservations = [...activeReservations(guest, now), reservation];
    guest.activeReferences = guest.reservations.length;
    guest.deckReservation = true;
    guest.lastAccessedAt = now;
    this.persistGuest(guest);
    this.metrics.reservationsCreated += 1;
    return this.reservationResponse(guest, reservation, leaseToken);
  }

  private reservationResponse(
    guest: GuestRecord,
    reservation: GuestReservation,
    leaseToken: string
  ) {
    const media = guestMime(guest.metadata);
    return {
      schemaVersion: GUEST_SCHEMA_VERSION,
      guest: safeGuest(guest),
      reservation: {
        id: reservation.id, deckId: reservation.deckId,
        generation: reservation.generation, state: reservation.state,
        expiresAt: reservation.expiresAt, leaseToken,
        mediaUrl: `/api/v1/guest-tracks/${guest.id}/media`,
        mediaType: media.mimeType,
        codecProbe: media.codecs,
      },
    };
  }

  private authenticateLease(guestId: string, reservationId: string, token: string) {
    const guest = this.getGuest(guestId);
    this.expireReservations();
    const reservation = activeReservations(guest, this.now()).find((entry) =>
      entry.id === reservationId && token &&
      safeEqualHex(entry.tokenHash, leaseTokenHash(token))
    );
    if (!reservation) throw new GuestValidationError(
      "guest-reservation-not-found", "Guest reservation was not found or expired", 404
    );
    return { guest, reservation };
  }

  refresh(guestId: string, reservationId: string, token: string, commit = false) {
    const { guest, reservation } = this.authenticateLease(guestId, reservationId, token);
    this.assertEligible(guest);
    const now = this.now();
    reservation.state = commit ? "loaded" : reservation.state;
    reservation.refreshedAt = now;
    reservation.expiresAt = now + (reservation.state === "loaded"
      ? GUEST_LOADED_LEASE_MS : GUEST_LOADING_LEASE_MS);
    if (commit) {
      guest.reservations = activeReservations(guest, now).filter((entry) =>
        entry.id === reservation.id ||
        !(entry.clientId === reservation.clientId &&
          entry.deckId === reservation.deckId &&
          entry.generation < reservation.generation)
      );
      for (const candidate of this.guests.values()) {
        if (candidate.id === guest.id) continue;
        const before = activeReservations(candidate, now);
        candidate.reservations = before.filter((entry) =>
          !(entry.clientId === reservation.clientId &&
            entry.deckId === reservation.deckId &&
            entry.generation < reservation.generation)
        );
        if (candidate.reservations.length !== before.length) {
          candidate.activeReferences = candidate.reservations.length;
          candidate.deckReservation = candidate.reservations.length > 0;
          this.persistGuest(candidate);
          this.metrics.reservationsTransferred += 1;
        }
      }
    }
    guest.activeReferences = activeReservations(guest, now).length;
    guest.deckReservation = guest.activeReferences > 0;
    guest.lastAccessedAt = now;
    this.persistGuest(guest);
    this.metrics.reservationsRefreshed += 1;
    return this.reservationResponse(guest, reservation, token);
  }

  release(guestId: string, reservationId: string, token: string) {
    const guest = this.getGuest(guestId);
    const now = this.now();
    const tokenHash = token ? leaseTokenHash(token) : "";
    guest.releasedReservations = (guest.releasedReservations || [])
      .filter((entry) => entry.releasedAt + GUEST_RELEASE_TOMBSTONE_MS > now)
      .slice(-GUEST_RELEASE_TOMBSTONE_LIMIT);
    const alreadyReleased = guest.releasedReservations.find((entry) =>
      entry.id === reservationId && tokenHash &&
      safeEqualHex(entry.tokenHash, tokenHash)
    );
    if (alreadyReleased) {
      this.metrics.idempotentReleases += 1;
      return safeGuest(guest);
    }
    const { reservation } = this.authenticateLease(guestId, reservationId, token);
    guest.reservations = activeReservations(guest, this.now())
      .filter((entry) => entry.id !== reservation.id);
    guest.releasedReservations.push({
      id: reservation.id,
      tokenHash: reservation.tokenHash,
      releasedAt: now,
    });
    guest.releasedReservations = guest.releasedReservations
      .slice(-GUEST_RELEASE_TOMBSTONE_LIMIT);
    guest.activeReferences = guest.reservations.length;
    guest.deckReservation = guest.reservations.length > 0;
    this.persistGuest(guest);
    this.metrics.reservationsReleased += 1;
    return safeGuest(guest);
  }

  media(guestId: string, reservationId: string, token: string) {
    const { guest, reservation } = this.authenticateLease(guestId, reservationId, token);
    this.assertEligible(guest);
    const resolved = path.resolve(guest.privateFilePath);
    if (!inside(this.filesRoot(), resolved)) throw new GuestValidationError(
      "guest-path-invalid", "Guest media is unavailable", 500
    );
    let originalStat: fs.Stats;
    try {
      originalStat = fs.lstatSync(resolved);
    } catch {
      guest.recoveryState = "missing";
      this.persistGuest(guest);
      throw new GuestValidationError(
        "guest-media-missing", "Guest media is unavailable", 410
      );
    }
    if (!originalStat.isFile() || originalStat.isSymbolicLink()) {
      throw new GuestValidationError(
        "guest-path-invalid", "Guest media is unavailable", 500
      );
    }
    const rootReal = fs.realpathSync(this.filesRoot());
    const fileReal = fs.realpathSync(resolved);
    if (!inside(rootReal, fileReal)) throw new GuestValidationError(
      "guest-path-invalid", "Guest media is unavailable", 500
    );
    const stat = fs.lstatSync(fileReal);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== guest.fileSize) {
      guest.recoveryState = "missing";
      this.persistGuest(guest);
      throw new GuestValidationError(
        "guest-media-missing", "Guest media is unavailable", 410
      );
    }
    guest.lastAccessedAt = this.now();
    this.metrics.mediaRequests += 1;
    return {
      path: fileReal,
      mimeType: guestMime(guest.metadata).mimeType,
      etag: `"guest-${guest.contentHash}"`,
      reservation,
    };
  }

  noteMediaRange() {
    this.metrics.mediaRangeRequests += 1;
  }

  noteMediaAbort() {
    this.metrics.mediaRequestsAborted += 1;
  }

  removeGuest(id: string) {
    const guest = this.guests.get(id);
    if (!guest) throw new GuestValidationError("guest-not-found", "Guest track was not found", 404);
    if (guest.activeReferences || guest.deckReservation || guest.importReservation) {
      throw new GuestValidationError("guest-in-use", "Guest track is in use", 409);
    }
    guest.retentionExpiresAt = 0;
    this.persistGuest(guest);
    this.cleanup();
  }

  cleanup() {
    this.expireReservations();
    const timestamp = this.now();
    for (const guest of this.guests.values()) {
      if (guest.retentionExpiresAt > timestamp) continue;
      if (activeReservations(guest, timestamp).length || guest.activeReferences ||
          guest.deckReservation || guest.importReservation) {
        this.metrics.cleanupRetainedForDeck += 1;
        continue;
      }
      guest.cleanupState = "cleanup-pending";
      this.persistGuest(guest);
      try {
        if (inside(this.filesRoot(), guest.privateFilePath)) {
          try {
            const stat = fs.lstatSync(guest.privateFilePath);
            if (stat.isFile() && !stat.isSymbolicLink()) {
              fs.unlinkSync(guest.privateFilePath);
            }
          } catch (error: any) {
            if (error?.code !== "ENOENT") throw error;
          }
        }
        fs.unlinkSync(this.guestPath(guest.id));
        this.guests.delete(guest.id);
        this.uploads.setValidationClaim(guest.sourceUploadSessionId, false);
        this.metrics.cleanupSuccesses += 1;
      } catch {
        guest.cleanupState = "cleanup-failed";
        this.persistGuest(guest);
        this.metrics.cleanupFailures += 1;
      }
    }
  }

  recover() {
    let validations = 0;
    let guests = 0;
    for (const entry of fs.readdirSync(this.metadataRoot()).slice(0, 10_000)) {
      if (!entry.endsWith(".json")) continue;
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(this.metadataRoot(), entry), "utf8"));
        if (entry.startsWith("validation-") && raw.schemaVersion === 1) {
          const record = raw as ValidationRecord;
          if (["probing", "duplicate-checking", "guest-promoting"].includes(record.state)) {
            record.state = "validation-pending";
            record.errorCode = "recovery-required";
            record.errorMessage = "Validation was interrupted and can be retried";
            record.retryable = true;
            record.recoveredAt = this.now();
            atomicJson(path.join(this.metadataRoot(), entry), record);
          }
          this.validations.set(record.uploadSessionId, record);
          this.uploads.setValidationClaim(record.uploadSessionId, ![
            "validation-failed", "unsupported", "cancelled", "cleanup-pending",
          ].includes(record.state));
          validations += 1;
        } else if (entry.startsWith("guest-") && raw.schemaVersion === 1) {
          const guest = raw as GuestRecord;
          guest.reservations = activeReservations(guest, this.now());
          guest.releasedReservations = (guest.releasedReservations || [])
            .filter((entry) =>
              entry.releasedAt + GUEST_RELEASE_TOMBSTONE_MS > this.now()
            )
            .slice(-GUEST_RELEASE_TOMBSTONE_LIMIT);
          guest.activeReferences = guest.reservations.length;
          guest.deckReservation = guest.reservations.length > 0;
          const exists = inside(this.filesRoot(), guest.privateFilePath) &&
            fs.existsSync(guest.privateFilePath);
          guest.recoveryState = exists ? "recovered" : "missing";
          this.guests.set(guest.id, guest);
          guests += 1;
        }
      } catch {}
    }
    return { validations, guests };
  }

  diagnostics() {
    let storageBytes = 0;
    for (const guest of this.guests.values()) {
      try { storageBytes += fs.statSync(guest.privateFilePath).size; } catch {}
    }
    return {
      ...this.metrics,
      validationsKnown: this.validations.size,
      validationQueueDepth: [...this.validations.values()].filter((record) =>
        ["validation-pending", "probing", "duplicate-checking", "guest-promoting"].includes(record.state)
      ).length,
      activeProbeProcesses: this.active.size,
      guestsActive: this.guests.size,
      guestsExpired: [...this.guests.values()].filter((guest) =>
        guest.retentionExpiresAt <= this.now()
      ).length,
      temporaryStorageBytes: storageBytes,
      activeDeckReservations: [...this.guests.values()].reduce(
        (count, guest) => count + activeReservations(guest, this.now()).length,
        0
      ),
    };
  }
}

let defaultService: GuestTrackService | null = null;
export function getGuestTrackService() {
  if (!defaultService) {
    defaultService = new GuestTrackService(getUploadSessionService());
    defaultService.startCleanup();
    const recovery = defaultService.diagnostics();
    console.log(
      `[Guest tracks] recovery complete; validations=${recovery.validationsKnown} guests=${recovery.guestsActive}`
    );
  }
  return defaultService;
}

async function readJson(req: IncomingMessage, maximum = 16 * 1024) {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const raw of req) {
    const chunk = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
    bytes += chunk.length;
    if (bytes > maximum) throw new GuestValidationError(
      "invalid-metadata", "Request is too large", 413
    );
    chunks.push(chunk);
  }
  try { return bytes ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {}; }
  catch { throw new GuestValidationError("invalid-metadata", "Request is invalid"); }
}

function token(req: IncomingMessage) {
  const authorization = String(req.headers.authorization || "");
  return authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim() : String(req.headers["x-upload-token"] || "").trim();
}

export async function handleGuestTrackRoute(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  service = getGuestTrackService()
) {
  const validation = url.pathname.match(
    /^\/api\/v1\/uploads\/([a-f0-9]{48})\/validation(?:\/(cancel|resolve))?$/
  );
  try {
    if (validation && req.method === "GET" && !validation[2]) {
      service.uploads.status(validation[1], token(req));
      return json(res, 200, { ok: true, validation: service.status(validation[1]) });
    }
    if (validation && req.method === "POST" && !validation[2]) {
      return json(res, 202, {
        ok: true, validation: await service.validate(validation[1], token(req)),
      });
    }
    if (validation && req.method === "POST" && validation[2] === "cancel") {
      service.uploads.status(validation[1], token(req));
      return json(res, 200, { ok: true, validation: service.cancel(validation[1]) });
    }
    if (validation && req.method === "POST" && validation[2] === "resolve") {
      const body = await readJson(req);
      return json(res, 200, {
        ok: true,
        validation: await service.resolve(
          validation[1], token(req), String(body.choice || ""), String(body.candidateId || "")
        ),
      });
    }
    if (req.method === "GET" && url.pathname === "/api/v1/guest-tracks") {
      const sourceUploadSessionId = String(
        url.searchParams.get("sourceUploadSessionId") || ""
      );
      return json(res, 200, service.listGuestsForUpload(
        sourceUploadSessionId,
        token(req),
        url.searchParams.get("cursor") || "",
        Number(url.searchParams.get("limit") || 25)
      ));
    }
    const reservation = url.pathname.match(
      /^\/api\/v1\/guest-tracks\/([A-Za-z0-9_-]{32})\/reservations(?:\/([A-Za-z0-9_-]{24})(?:\/(commit))?)?$/
    );
    if (reservation && req.method === "POST" && !reservation[2]) {
      const body = await readJson(req);
      return json(res, 201, {
        ok: true,
        ...service.reserve(reservation[1], token(req), body),
      });
    }
    if (reservation && req.method === "POST" && reservation[2]) {
      return json(res, 200, {
        ok: true,
        ...service.refresh(
          reservation[1], reservation[2], token(req), reservation[3] === "commit"
        ),
      });
    }
    if (reservation && req.method === "DELETE" && reservation[2] && !reservation[3]) {
      return json(res, 200, {
        ok: true,
        guest: service.release(reservation[1], reservation[2], token(req)),
      });
    }
    const media = url.pathname.match(
      /^\/api\/v1\/guest-tracks\/([A-Za-z0-9_-]{32})\/media$/
    );
    if (media && (req.method === "GET" || req.method === "HEAD")) {
      const reservationId = String(req.headers["x-guest-reservation"] || "");
      const resolved = service.media(media[1], reservationId, token(req));
      if (req.headers.range) service.noteMediaRange();
      streamFileWithRange(req, res, resolved.path, {
        mimeType: resolved.mimeType,
        cacheControl: "private, no-store, max-age=0",
        etag: resolved.etag,
        onAborted: () => service.noteMediaAbort(),
      });
      return true;
    }
    const guest = url.pathname.match(/^\/api\/v1\/guest-tracks\/([A-Za-z0-9_-]{32})$/);
    if (guest && req.method === "DELETE") {
      service.removeGuest(guest[1]);
      return json(res, 200, { ok: true });
    }
    if (req.method === "GET" && url.pathname === "/api/v1/guest-tracks/diagnostics") {
      return json(res, 200, { ok: true, diagnostics: service.diagnostics() });
    }
    return false;
  } catch (error) {
    const safe = error instanceof GuestValidationError ? error :
      error instanceof UploadError ? error :
      new GuestValidationError("guest-service-failed", "Guest track service failed", 500, true);
    json(res, safe.status, {
      ok: false, code: safe.code, error: safe.message,
      retryable: safe.retryable,
      userActionRequired: safe instanceof GuestValidationError ? safe.userActionRequired : false,
    });
    return true;
  }
}
