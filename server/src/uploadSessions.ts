import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { json } from "./utils/json";

export const UPLOAD_SCHEMA_VERSION = 1;
export const UPLOAD_DEFAULT_CHUNK_SIZE = 4 * 1024 * 1024;
export const UPLOAD_MIN_CHUNK_SIZE = 256 * 1024;
export const UPLOAD_MAX_CHUNK_SIZE = 8 * 1024 * 1024;
export const UPLOAD_MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024;
export const UPLOAD_MAX_ACTIVE_SESSIONS = 8;
export const UPLOAD_MAX_RANGES = 16_384;
export const UPLOAD_MAX_STATUS_RANGES = 512;
export const UPLOAD_GLOBAL_WRITES = 4;
export const UPLOAD_RECEIVING_RETENTION_MS = 24 * 60 * 60 * 1000;
export const UPLOAD_TERMINAL_RETENTION_MS = 60 * 60 * 1000;
export const UPLOAD_COMPLETED_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
export const UPLOAD_CLEANUP_INTERVAL_MS = 15 * 60 * 1000;
export const UPLOAD_CLEANUP_MAX_PER_PASS = 25;

export type UploadState =
  | "created"
  | "receiving"
  | "paused"
  | "finalising"
  | "completed"
  | "promoted"
  | "cancelled"
  | "failed"
  | "expired"
  | "cleanup-pending";

export type UploadRange = {
  start: number;
  end: number;
  sha256: string;
};

export type UploadSession = {
  schemaVersion: 1;
  id: string;
  tokenHash: string;
  originalFilename: string;
  displayFilename: string;
  totalSize: number;
  clientMimeType: string;
  clientLastModified: number | null;
  expectedHash: string | null;
  hashAlgorithm: "sha256" | null;
  chunkSize: number;
  createdAt: number;
  lastActivityAt: number;
  state: UploadState;
  ranges: UploadRange[];
  receivedBytes: number;
  partPath: string;
  completedPath: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  cancelledAt: number | null;
  finalisedAt: number | null;
  recoveredAt: number | null;
  recoveryRequired: boolean;
  revision: number;
  activeWrites: number;
  cancelRequested: boolean;
  validationClaimed: boolean;
};

export type UploadRoots = {
  root: string;
  metadata: string;
  incomplete: string;
  validation: string;
  quarantine: string;
};

export class UploadError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
    readonly retryable = false
  ) {
    super(message);
  }
}

function projectRoot() {
  return fs.existsSync(path.join(process.cwd(), "server", "src"))
    ? process.cwd()
    : path.resolve(__dirname, "..", "..");
}

export function defaultUploadRoots(base = path.join(
  projectRoot(), "server", ".uploads", "browser-uploads"
)): UploadRoots {
  return {
    root: path.resolve(base),
    metadata: path.resolve(base, "sessions"),
    incomplete: path.resolve(base, "incomplete"),
    validation: path.resolve(base, "validation-staging"),
    quarantine: path.resolve(base, "quarantine"),
  };
}

function ensureRoots(roots: UploadRoots) {
  for (const directory of Object.values(roots)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

function inside(root: string, candidate: string) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function assertSafeResolvedPath(root: string, candidate: string) {
  if (!inside(root, candidate)) {
    throw new UploadError("path-escape", "Upload staging path is invalid", 500);
  }
  const rootReal = fs.realpathSync(root);
  const parentReal = fs.realpathSync(path.dirname(candidate));
  if (!inside(rootReal, candidate) || (
    parentReal !== rootReal && !inside(rootReal, parentReal)
  )) {
    throw new UploadError("path-escape", "Upload staging path is invalid", 500);
  }
}

const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;

export function safeUploadFilename(value: unknown) {
  const original = String(value ?? "").normalize("NFC");
  if (
    !original ||
    original.length > 240 ||
    /[\u0000-\u001f\u007f]/.test(original) ||
    /[\\/:*?"<>|]/.test(original) ||
    original === "." ||
    original === ".." ||
    /^[. ]+$/.test(original) ||
    WINDOWS_RESERVED.test(original) ||
    /[. ]$/.test(original)
  ) {
    throw new UploadError("invalid-filename", "Choose a valid filename");
  }
  const parsed = path.parse(original);
  const extension = parsed.ext.replace(/[^.\p{L}\p{N}]/gu, "").slice(0, 16);
  const base = parsed.name
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, Math.max(1, 180 - extension.length));
  const filename = `${base}${extension}`;
  if (!base || WINDOWS_RESERVED.test(filename)) {
    throw new UploadError("invalid-filename", "Choose a valid filename");
  }
  return filename;
}

function tokenHash(token: string) {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

function secureEqual(left: string, right: string) {
  const a = Buffer.from(left, "hex");
  const b = Buffer.from(right, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function atomicJson(filePath: string, value: unknown) {
  const temporary = `${filePath}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`;
  const handle = fs.openSync(temporary, "wx");
  try {
    fs.writeFileSync(handle, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    fs.fsyncSync(handle);
  } finally {
    fs.closeSync(handle);
  }
  try {
    fs.renameSync(temporary, filePath);
  } finally {
    try { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); } catch {}
  }
}

function normaliseRanges(ranges: UploadRange[]) {
  return [...ranges].sort((a, b) => a.start - b.start);
}

export function receivedBytes(ranges: UploadRange[]) {
  return ranges.reduce((total, range) => total + range.end - range.start, 0);
}

export function missingRanges(ranges: UploadRange[], totalSize: number) {
  const result: Array<{ start: number; end: number }> = [];
  let cursor = 0;
  for (const range of normaliseRanges(ranges)) {
    if (range.start > cursor) result.push({ start: cursor, end: range.start });
    cursor = Math.max(cursor, range.end);
  }
  if (cursor < totalSize) result.push({ start: cursor, end: totalSize });
  return result;
}

export function compactReceivedRanges(ranges: UploadRange[]) {
  const compact: Array<{ start: number; end: number }> = [];
  for (const range of normaliseRanges(ranges)) {
    const previous = compact[compact.length - 1];
    if (previous && range.start <= previous.end) {
      previous.end = Math.max(previous.end, range.end);
    } else {
      compact.push({ start: range.start, end: range.end });
    }
  }
  return compact;
}

export function hasFullCoverage(ranges: UploadRange[], totalSize: number) {
  const missing = missingRanges(ranges, totalSize);
  return missing.length === 0 && receivedBytes(ranges) === totalSize;
}

function validatePersisted(raw: any): raw is UploadSession {
  const rangesValid = Array.isArray(raw?.ranges) &&
    raw.ranges.length <= UPLOAD_MAX_RANGES &&
    raw.ranges.every((range: any) =>
      Number.isSafeInteger(range?.start) &&
      Number.isSafeInteger(range?.end) &&
      range.start >= 0 &&
      range.end > range.start &&
      range.end <= raw.totalSize &&
      /^[a-f0-9]{64}$/.test(String(range.sha256 || ""))
    ) &&
    normaliseRanges(raw.ranges).every((range, index, ranges) =>
      index === 0 || range.start >= ranges[index - 1].end
    );
  return raw?.schemaVersion === 1 &&
    /^[a-f0-9]{48}$/.test(String(raw.id || "")) &&
    /^[a-f0-9]{64}$/.test(String(raw.tokenHash || "")) &&
    typeof raw.displayFilename === "string" &&
    Number.isSafeInteger(raw.totalSize) && raw.totalSize > 0 &&
    [
      "created", "receiving", "paused", "finalising", "completed",
      "promoted", "cancelled", "failed", "expired", "cleanup-pending",
    ].includes(raw.state) &&
    rangesValid;
}

function publicSession(session: UploadSession) {
  const missing = missingRanges(session.ranges, session.totalSize);
  const compact = compactReceivedRanges(session.ranges);
  return {
    schemaVersion: session.schemaVersion,
    id: session.id,
    filename: session.displayFilename,
    totalSize: session.totalSize,
    clientMimeType: session.clientMimeType,
    clientLastModified: session.clientLastModified,
    expectedHash: session.expectedHash,
    hashAlgorithm: session.hashAlgorithm,
    chunkSize: session.chunkSize,
    createdAt: session.createdAt,
    lastActivityAt: session.lastActivityAt,
    state: session.state,
    ranges: compact.slice(0, UPLOAD_MAX_STATUS_RANGES),
    rangesTruncated: compact.length > UPLOAD_MAX_STATUS_RANGES,
    missingRanges: missing.slice(0, UPLOAD_MAX_STATUS_RANGES),
    missingRangesTruncated: missing.length > UPLOAD_MAX_STATUS_RANGES,
    receivedBytes: session.receivedBytes,
    remainingBytes: Math.max(0, session.totalSize - session.receivedBytes),
    errorCode: session.errorCode,
    errorMessage: session.errorMessage,
    cancelledAt: session.cancelledAt,
    finalisedAt: session.finalisedAt,
    recoveredAt: session.recoveredAt,
    recoveryRequired: session.recoveryRequired,
    revision: session.revision,
    completedTransfer: session.state === "completed",
  };
}

type Diagnostics = {
  sessionsCreated: number;
  chunksReceived: number;
  duplicateChunks: number;
  bytesReceived: number;
  cancelled: number;
  failed: number;
  finalisationAttempts: number;
  finalisationSuccesses: number;
  hashMismatches: number;
  recovered: number;
  cleanupRemoved: number;
  storageRejections: number;
};

export class UploadSessionService {
  private readonly sessions = new Map<string, UploadSession>();
  private globalWrites = 0;
  private finalising = 0;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private readonly metrics: Diagnostics = {
    sessionsCreated: 0, chunksReceived: 0, duplicateChunks: 0,
    bytesReceived: 0, cancelled: 0, failed: 0, finalisationAttempts: 0,
    finalisationSuccesses: 0, hashMismatches: 0, recovered: 0,
    cleanupRemoved: 0, storageRejections: 0,
  };

  constructor(
    readonly roots = defaultUploadRoots(),
    private readonly now = () => Date.now(),
    private readonly freeBytes = (directory: string) => {
      const statfs = (fs as any).statfsSync?.(directory);
      if (!statfs) return Number.POSITIVE_INFINITY;
      return Number(statfs.bavail ?? statfs.bfree ?? 0) *
        Number(statfs.bsize ?? statfs.frsize ?? 0);
    }
  ) {
    ensureRoots(roots);
    this.recover();
  }

  startCleanup() {
    if (this.cleanupTimer) return;
    this.cleanupTimer = setInterval(() => this.cleanup(), UPLOAD_CLEANUP_INTERVAL_MS);
    this.cleanupTimer.unref?.();
  }

  stopCleanup() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    this.cleanupTimer = null;
  }

  private manifestPath(id: string) {
    return path.join(this.roots.metadata, `${id}.json`);
  }

  private persist(session: UploadSession) {
    session.receivedBytes = receivedBytes(session.ranges);
    session.lastActivityAt = this.now();
    session.revision += 1;
    atomicJson(this.manifestPath(session.id), {
      ...session,
      activeWrites: 0,
      cancelRequested: false,
    });
    this.sessions.set(session.id, session);
  }

  private authenticate(id: string, token: string) {
    const session = this.sessions.get(id);
    if (!session || !token || !secureEqual(session.tokenHash, tokenHash(token))) {
      throw new UploadError("upload-session-not-found", "Upload session was not found", 404);
    }
    return session;
  }

  private assertSpace(bytes: number) {
    const free = this.freeBytes(this.roots.incomplete);
    const margin = Math.max(256 * 1024 * 1024, Math.ceil(bytes * 0.1));
    if (!Number.isFinite(free) || free >= bytes + margin) return;
    this.metrics.storageRejections += 1;
    throw new UploadError(
      "insufficient-storage",
      "There is not enough server storage for this upload",
      507,
      true
    );
  }

  create(input: any) {
    const active = [...this.sessions.values()].filter((session) =>
      ["created", "receiving", "paused", "finalising"].includes(session.state)
    ).length;
    if (active >= UPLOAD_MAX_ACTIVE_SESSIONS) {
      throw new UploadError("session-busy", "Too many uploads are active", 429, true);
    }
    const originalFilename = String(input?.filename ?? "");
    const displayFilename = safeUploadFilename(originalFilename);
    const totalSize = Number(input?.totalSize);
    if (!Number.isSafeInteger(totalSize) || totalSize <= 0) {
      throw new UploadError("invalid-size", "Upload size must be a positive integer");
    }
    if (totalSize > UPLOAD_MAX_FILE_SIZE) {
      throw new UploadError("file-too-large", "The selected file exceeds the upload limit", 413);
    }
    const clientMimeType = String(input?.mimeType || "").trim();
    if (clientMimeType.length > 200 || /[\u0000-\u001f\u007f]/.test(clientMimeType)) {
      throw new UploadError("invalid-mime", "Client media type is invalid");
    }
    const algorithm = input?.hashAlgorithm == null || input?.hashAlgorithm === ""
      ? null : String(input.hashAlgorithm).toLowerCase();
    if (algorithm !== null && algorithm !== "sha256") {
      throw new UploadError("unsupported-hash", "Only SHA-256 hashes are supported");
    }
    const expectedHash = input?.expectedHash == null || input?.expectedHash === ""
      ? null : String(input.expectedHash).toLowerCase();
    if ((algorithm === "sha256" || expectedHash) && !/^[a-f0-9]{64}$/.test(expectedHash || "")) {
      throw new UploadError("invalid-hash", "Expected SHA-256 hash is invalid");
    }
    this.assertSpace(totalSize);
    const id = crypto.randomBytes(24).toString("hex");
    const token = crypto.randomBytes(32).toString("base64url");
    const chunkSizeRequest = Number(input?.preferredChunkSize);
    const chunkSize = Number.isSafeInteger(chunkSizeRequest) && chunkSizeRequest >= UPLOAD_MIN_CHUNK_SIZE
      ? Math.min(UPLOAD_MAX_CHUNK_SIZE, chunkSizeRequest)
      : UPLOAD_DEFAULT_CHUNK_SIZE;
    const partPath = path.join(this.roots.incomplete, `${id}.part`);
    assertSafeResolvedPath(this.roots.incomplete, partPath);
    fs.closeSync(fs.openSync(partPath, "wx"));
    const timestamp = this.now();
    const session: UploadSession = {
      schemaVersion: 1, id, tokenHash: tokenHash(token), originalFilename,
      displayFilename, totalSize, clientMimeType,
      clientLastModified: Number.isFinite(Number(input?.lastModified))
        ? Number(input.lastModified) : null,
      expectedHash, hashAlgorithm: expectedHash ? "sha256" : null, chunkSize,
      createdAt: timestamp, lastActivityAt: timestamp, state: "created",
      ranges: [], receivedBytes: 0, partPath, completedPath: null,
      errorCode: null, errorMessage: null, cancelledAt: null, finalisedAt: null,
      recoveredAt: null, recoveryRequired: false, revision: 0,
      activeWrites: 0, cancelRequested: false,
      validationClaimed: false,
    };
    this.persist(session);
    this.metrics.sessionsCreated += 1;
    return { session: publicSession(session), token, limits: this.limits() };
  }

  status(id: string, token: string) {
    return publicSession(this.authenticate(id, token));
  }

  /**
   * Server-only handoff for M21-C. Paths from this result must never be returned
   * to a browser. Authentication and completed-state checks stay owned by M21-B.
   */
  completedSource(id: string, token: string) {
    const session = this.authenticate(id, token);
    if (session.state !== "completed" || !session.completedPath) {
      throw new UploadError(
        "transfer-not-complete",
        "The upload transfer is not complete",
        409
      );
    }
    assertSafeResolvedPath(this.roots.validation, session.completedPath);
    const stat = fs.lstatSync(session.completedPath);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== session.totalSize) {
      throw new UploadError(
        "completed-transfer-invalid",
        "The completed transfer is unavailable or has changed",
        409
      );
    }
    return {
      id: session.id,
      path: session.completedPath,
      filename: session.displayFilename,
      totalSize: session.totalSize,
      expectedHash: session.expectedHash,
      clientLastModified: session.clientLastModified,
      revision: session.revision,
      statIdentity: {
        size: stat.size,
        mtimeMs: stat.mtimeMs,
        ino: Number(stat.ino),
        dev: Number(stat.dev),
      },
    };
  }

  setValidationClaim(id: string, claimed: boolean) {
    const session = this.sessions.get(id);
    if (!session || session.state !== "completed") return;
    if (session.validationClaimed === claimed) return;
    session.validationClaimed = claimed;
    this.persist(session);
  }

  markPromoted(id: string) {
    const session = this.sessions.get(id);
    if (!session || session.state !== "completed") {
      throw new UploadError(
        "transfer-not-complete",
        "Completed transfer cannot be marked as promoted",
        409
      );
    }
    session.state = "promoted";
    session.completedPath = null;
    this.persist(session);
  }

  private validateChunk(session: UploadSession, start: number, length: number) {
    if (!["created", "receiving", "paused"].includes(session.state)) {
      const code = session.state === "cancelled"
        ? "upload-session-cancelled" : "upload-session-closed";
      throw new UploadError(code, "Upload session no longer accepts chunks", 409);
    }
    if (!Number.isSafeInteger(start) || start < 0 || !Number.isSafeInteger(length) || length <= 0) {
      throw new UploadError("invalid-range", "Chunk range is invalid");
    }
    if (length > UPLOAD_MAX_CHUNK_SIZE) {
      throw new UploadError("chunk-too-large", "Chunk exceeds the upload limit", 413);
    }
    const end = start + length;
    if (!Number.isSafeInteger(end) || end > session.totalSize) {
      throw new UploadError("invalid-range", "Chunk extends beyond the upload size");
    }
    if (length < UPLOAD_MIN_CHUNK_SIZE && end !== session.totalSize) {
      throw new UploadError("invalid-chunk-length", "Only the final chunk may be smaller than the minimum");
    }
    const exact = session.ranges.find((range) => range.start === start && range.end === end);
    const overlap = session.ranges.find((range) => start < range.end && end > range.start);
    if (overlap && !exact) {
      throw new UploadError("range-conflict", "Chunk overlaps an existing range", 409);
    }
    if (!exact && session.ranges.length >= UPLOAD_MAX_RANGES) {
      throw new UploadError("too-many-ranges", "Upload range limit was reached", 409);
    }
    return { end, exact };
  }

  async writeChunk(
    id: string,
    token: string,
    start: number,
    contentLength: number,
    req: IncomingMessage,
    suppliedHash?: string
  ) {
    const session = this.authenticate(id, token);
    const { end, exact } = this.validateChunk(session, start, contentLength);
    if (session.activeWrites > 0 || this.globalWrites >= UPLOAD_GLOBAL_WRITES) {
      throw new UploadError("session-busy", "Upload session is busy", 409, true);
    }
    if (suppliedHash && !/^[a-f0-9]{64}$/i.test(suppliedHash)) {
      throw new UploadError("invalid-hash", "Chunk SHA-256 hash is invalid");
    }
    session.activeWrites += 1;
    this.globalWrites += 1;
    session.state = "receiving";
    const hash = crypto.createHash("sha256");
    let bytes = 0;
    let handle: fs.promises.FileHandle | null = null;
    try {
      if (!exact) handle = await fs.promises.open(session.partPath, "r+");
      for await (const raw of req) {
        if (session.cancelRequested) {
          throw new UploadError("upload-session-cancelled", "Upload was cancelled", 409);
        }
        const chunk = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
        bytes += chunk.length;
        if (bytes > contentLength) {
          throw new UploadError("invalid-chunk-length", "Chunk body is larger than declared", 400);
        }
        hash.update(chunk);
        if (handle) await handle.write(chunk, 0, chunk.length, start + bytes - chunk.length);
      }
      if (bytes !== contentLength) {
        throw new UploadError("invalid-chunk-length", "Chunk body length does not match declaration");
      }
      const digest = hash.digest("hex");
      if (suppliedHash && digest !== suppliedHash.toLowerCase()) {
        throw new UploadError("hash-mismatch", "Chunk checksum does not match", 422);
      }
      if (exact) {
        if (digest !== exact.sha256) {
          throw new UploadError("range-conflict", "Retried chunk differs from stored data", 409);
        }
        this.metrics.duplicateChunks += 1;
      } else {
        session.ranges = normaliseRanges([...session.ranges, { start, end, sha256: digest }]);
        this.metrics.chunksReceived += 1;
        this.metrics.bytesReceived += bytes;
      }
      session.errorCode = null;
      session.errorMessage = null;
      this.persist(session);
      return { duplicate: Boolean(exact), session: publicSession(session) };
    } catch (error) {
      if (!(error instanceof UploadError)) {
        session.errorCode = "write-failed";
        session.errorMessage = "Could not store upload chunk";
        this.metrics.failed += 1;
      }
      throw error;
    } finally {
      try { await handle?.sync(); } catch {}
      try { await handle?.close(); } catch {}
      session.activeWrites = Math.max(0, session.activeWrites - 1);
      this.globalWrites = Math.max(0, this.globalWrites - 1);
      if (session.cancelRequested) {
        session.state = "cancelled";
        session.cancelRequested = false;
        this.persist(session);
        try { fs.unlinkSync(session.partPath); } catch {}
      }
    }
  }

  cancel(id: string, token: string) {
    const session = this.authenticate(id, token);
    if (session.state === "completed") {
      throw new UploadError("upload-session-closed", "Completed transfers cannot be cancelled", 409);
    }
    if (session.state === "cancelled") return publicSession(session);
    if (session.state === "finalising") {
      throw new UploadError("session-busy", "Upload is finalising", 409, true);
    }
    session.cancelRequested = session.activeWrites > 0;
    session.state = "cancelled";
    session.cancelledAt = this.now();
    this.persist(session);
    if (session.activeWrites === 0) {
      try { fs.unlinkSync(session.partPath); } catch {}
    }
    this.metrics.cancelled += 1;
    return publicSession(session);
  }

  private async sha256(filePath: string) {
    const hash = crypto.createHash("sha256");
    for await (const chunk of fs.createReadStream(filePath, { highWaterMark: 1024 * 1024 })) {
      hash.update(chunk);
    }
    return hash.digest("hex");
  }

  async finalise(id: string, token: string) {
    const session = this.authenticate(id, token);
    if (session.state === "completed") return publicSession(session);
    if (session.state === "finalising" || session.activeWrites > 0 || this.finalising >= 1) {
      throw new UploadError("session-busy", "Upload session is busy", 409, true);
    }
    if (!["created", "receiving", "paused"].includes(session.state)) {
      throw new UploadError("upload-session-closed", "Upload cannot be finalised", 409);
    }
    if (!hasFullCoverage(session.ranges, session.totalSize)) {
      throw new UploadError("finalisation-incomplete", "Upload still has missing ranges", 409);
    }
    this.metrics.finalisationAttempts += 1;
    this.finalising += 1;
    session.state = "finalising";
    this.persist(session);
    try {
      const stat = fs.statSync(session.partPath);
      if (!stat.isFile() || stat.size !== session.totalSize) {
        throw new UploadError("size-mismatch", "Completed upload size does not match", 422);
      }
      this.assertSpace(0);
      if (session.expectedHash) {
        const digest = await this.sha256(session.partPath);
        if (digest !== session.expectedHash) {
          this.metrics.hashMismatches += 1;
          session.state = "failed";
          session.errorCode = "hash-mismatch";
          session.errorMessage = "Completed upload failed its integrity check";
          this.persist(session);
          throw new UploadError("hash-mismatch", session.errorMessage, 422);
        }
      }
      const extension = path.extname(session.displayFilename).slice(0, 16);
      const completedPath = path.join(this.roots.validation, `${session.id}${extension}`);
      assertSafeResolvedPath(this.roots.validation, completedPath);
      if (fs.existsSync(completedPath)) {
        throw new UploadError("staging-collision", "Validation staging collision", 409);
      }
      fs.renameSync(session.partPath, completedPath);
      session.completedPath = completedPath;
      session.state = "completed";
      session.finalisedAt = this.now();
      session.errorCode = null;
      session.errorMessage = null;
      this.persist(session);
      this.metrics.finalisationSuccesses += 1;
      return publicSession(session);
    } catch (error) {
      if (session.state === "finalising") {
        session.state = "failed";
        session.errorCode = error instanceof UploadError ? error.code : "finalisation-failed";
        session.errorMessage = error instanceof UploadError
          ? error.message : "Upload finalisation failed";
        this.persist(session);
        this.metrics.failed += 1;
      }
      throw error;
    } finally {
      this.finalising = Math.max(0, this.finalising - 1);
    }
  }

  recover() {
    ensureRoots(this.roots);
    let scanned = 0;
    let recovered = 0;
    let corrupt = 0;
    const entries = fs.readdirSync(this.roots.metadata, { withFileTypes: true }).slice(0, 10_000);
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
      scanned += 1;
      const source = path.join(this.roots.metadata, entry.name);
      try {
        const raw = JSON.parse(fs.readFileSync(source, "utf8"));
        if (!validatePersisted(raw)) throw new Error("invalid session manifest");
        const session = raw as UploadSession;
        session.validationClaimed = raw.validationClaimed === true;
        session.partPath = path.join(this.roots.incomplete, `${session.id}.part`);
        session.completedPath = session.state === "completed"
          ? path.join(
              this.roots.validation,
              `${session.id}${path.extname(session.displayFilename).slice(0, 16)}`
            )
          : null;
        assertSafeResolvedPath(this.roots.incomplete, session.partPath);
        if (session.completedPath) {
          assertSafeResolvedPath(this.roots.validation, session.completedPath);
        }
        session.activeWrites = 0;
        session.cancelRequested = false;
        session.ranges = normaliseRanges(session.ranges);
        session.receivedBytes = receivedBytes(session.ranges);
        session.recoveredAt = this.now();
        if (session.state === "finalising") {
          session.state = "paused";
          session.recoveryRequired = true;
          session.errorCode = "recovery-required";
          session.errorMessage = "Finalisation was interrupted; inspect and retry";
        }
        const expectedPath = session.state === "completed"
          ? session.completedPath
          : session.state === "promoted" ? null : session.partPath;
        const missingAllowed = [
          "promoted", "cancelled", "expired", "cleanup-pending",
        ].includes(session.state);
        if ((!expectedPath || !fs.existsSync(expectedPath)) && !missingAllowed) {
          session.state = "failed";
          session.recoveryRequired = true;
          session.errorCode = "recovery-required";
          session.errorMessage = "Upload staging data is missing";
        } else if (
          expectedPath &&
          fs.existsSync(expectedPath) &&
          session.state !== "completed"
        ) {
          const fileSize = fs.statSync(expectedPath).size;
          const highest = session.ranges.reduce((max, range) => Math.max(max, range.end), 0);
          if (fileSize < highest) {
            session.state = "failed";
            session.recoveryRequired = true;
            session.errorCode = "recovery-required";
            session.errorMessage = "Upload staging data does not match its manifest";
          } else if (["created", "receiving"].includes(session.state)) {
            session.state = "paused";
          }
        }
        this.sessions.set(session.id, session);
        atomicJson(source, session);
        recovered += 1;
      } catch {
        corrupt += 1;
        try {
          const target = path.join(
            this.roots.quarantine,
            `${path.basename(entry.name, ".json")}.${this.now()}.invalid.json`
          );
          fs.renameSync(source, target);
        } catch {}
      }
    }
    this.metrics.recovered += recovered;
    return { scanned, recovered, corrupt };
  }

  cleanup() {
    const now = this.now();
    let removed = 0;
    for (const session of this.sessions.values()) {
      if (removed >= UPLOAD_CLEANUP_MAX_PER_PASS) break;
      if (
        session.activeWrites > 0 ||
        session.state === "finalising" ||
        session.validationClaimed
      ) continue;
      const age = now - session.lastActivityAt;
      const retention = session.state === "completed"
        ? UPLOAD_COMPLETED_RETENTION_MS
        : session.state === "promoted"
          ? UPLOAD_COMPLETED_RETENTION_MS
        : ["cancelled", "failed", "expired"].includes(session.state)
          ? UPLOAD_TERMINAL_RETENTION_MS
          : UPLOAD_RECEIVING_RETENTION_MS;
      if (age < retention) continue;
      if (!["completed", "promoted", "cancelled", "failed", "expired", "created", "paused", "receiving"].includes(session.state)) continue;
      session.state = "cleanup-pending";
      this.persist(session);
      for (const candidate of [session.partPath, session.completedPath, this.manifestPath(session.id)]) {
        if (!candidate) continue;
        const approved = inside(this.roots.incomplete, candidate) ||
          inside(this.roots.validation, candidate) ||
          inside(this.roots.metadata, candidate);
        if (!approved) continue;
        try {
          const stat = fs.lstatSync(candidate);
          if (stat.isSymbolicLink()) continue;
          if (stat.isFile()) fs.unlinkSync(candidate);
        } catch {}
      }
      this.sessions.delete(session.id);
      removed += 1;
    }
    this.metrics.cleanupRemoved += removed;
    return { removed };
  }

  diagnostics() {
    let stagingBytes = 0;
    for (const session of this.sessions.values()) {
      try {
        const candidate = session.completedPath || session.partPath;
        stagingBytes += fs.statSync(candidate).size;
      } catch {}
    }
    return {
      ...this.metrics,
      sessionsKnown: this.sessions.size,
      sessionsActive: [...this.sessions.values()].filter((session) =>
        ["created", "receiving", "paused", "finalising"].includes(session.state)
      ).length,
      activeWrites: this.globalWrites,
      finalising: this.finalising,
      stagingBytes,
      limits: this.limits(),
    };
  }

  limits() {
    return {
      defaultChunkSize: UPLOAD_DEFAULT_CHUNK_SIZE,
      minimumChunkSize: UPLOAD_MIN_CHUNK_SIZE,
      maximumChunkSize: UPLOAD_MAX_CHUNK_SIZE,
      maximumFileSize: UPLOAD_MAX_FILE_SIZE,
      maximumActiveSessions: UPLOAD_MAX_ACTIVE_SESSIONS,
      maximumRanges: UPLOAD_MAX_RANGES,
    };
  }
}

let defaultService: UploadSessionService | null = null;

export function getUploadSessionService() {
  if (!defaultService) {
    defaultService = new UploadSessionService();
    defaultService.startCleanup();
    const recovery = defaultService.diagnostics();
    console.log(
      `[Browser uploads] recovery complete; sessions=${recovery.sessionsKnown} active=${recovery.sessionsActive}`
    );
  }
  return defaultService;
}

function readToken(req: IncomingMessage) {
  const authorization = String(req.headers.authorization || "");
  return authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : String(req.headers["x-upload-token"] || "").trim();
}

async function readSmallJson(req: IncomingMessage, maxBytes = 16 * 1024) {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const raw of req) {
    const chunk = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
    total += chunk.length;
    if (total > maxBytes) throw new UploadError("invalid-metadata", "Upload metadata is too large", 413);
    chunks.push(chunk);
  }
  if (!total) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new UploadError("invalid-metadata", "Upload metadata is invalid");
  }
}

function sendUploadError(res: ServerResponse, error: unknown) {
  if (error instanceof UploadError) {
    return json(res, error.status, {
      ok: false,
      error: error.message,
      code: error.code,
      retryable: error.retryable,
    });
  }
  console.error("[Browser uploads]", error);
  return json(res, 500, {
    ok: false,
    error: "Upload service failed",
    code: "server-unavailable",
    retryable: true,
  });
}

export async function handleUploadSessionRoute(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  service = getUploadSessionService()
): Promise<boolean> {
  const root = "/api/v1/uploads";
  if (!url.pathname.startsWith(root) && !url.pathname.startsWith("/api/v1/guest-tracks")) {
    return false;
  }
  const { handleGuestTrackRoute } = await import("./guestTracks");
  const guestHandled = await handleGuestTrackRoute(req, res, url);
  if (guestHandled) return true;
  try {
    if (req.method === "POST" && url.pathname === root) {
      const body = await readSmallJson(req);
      return json(res, 201, { ok: true, ...service.create(body) });
    }
    if (req.method === "GET" && url.pathname === `${root}/diagnostics`) {
      return json(res, 200, { ok: true, diagnostics: service.diagnostics() });
    }
    const chunk = url.pathname.match(/^\/api\/v1\/uploads\/([a-f0-9]{48})\/chunks\/(\d+)$/);
    if (req.method === "PUT" && chunk) {
      const contentLength = Number(req.headers["content-length"]);
      if (!Number.isSafeInteger(contentLength)) {
        throw new UploadError("invalid-chunk-length", "Content-Length is required", 411);
      }
      const result = await service.writeChunk(
        chunk[1], readToken(req), Number(chunk[2]), contentLength, req,
        String(req.headers["x-chunk-sha256"] || "") || undefined
      );
      return json(res, 200, { ok: true, ...result });
    }
    const action = url.pathname.match(/^\/api\/v1\/uploads\/([a-f0-9]{48})(?:\/(finalise))?$/);
    if (action && req.method === "GET" && !action[2]) {
      return json(res, 200, { ok: true, session: service.status(action[1], readToken(req)) });
    }
    if (action && req.method === "DELETE" && !action[2]) {
      return json(res, 200, { ok: true, session: service.cancel(action[1], readToken(req)) });
    }
    if (action && req.method === "POST" && action[2] === "finalise") {
      return json(res, 200, { ok: true, session: await service.finalise(action[1], readToken(req)) });
    }
    throw new UploadError("upload-session-not-found", "Upload route was not found", 404);
  } catch (error) {
    sendUploadError(res, error);
    return true;
  }
}
