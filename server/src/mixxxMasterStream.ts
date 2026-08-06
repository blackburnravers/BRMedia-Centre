import crypto from "node:crypto";

export type MasterCaptureCallbacks = {
  data(chunk: Buffer, capturedAt: number): void;
  exit(code: number | null, signal?: string): void;
  error(error: Error): void;
};

export interface MasterCaptureProcess {
  stop(): void;
}

export interface MasterCaptureFactory {
  start(callbacks: MasterCaptureCallbacks): MasterCaptureProcess;
}

export interface MasterStreamSink {
  write(chunk: Buffer): boolean;
  end(error?: Error): void;
  onDrain?(callback: () => void): () => void;
}

export type CreateMasterStreamSession = {
  profileId: string;
  origin: string;
  authenticated: boolean;
  remoteAddress?: string;
};

type Session = {
  id: string;
  tokenHash: string;
  profileId: string;
  origin: string;
  createdAt: number;
  expiresAt: number;
  attached: boolean;
  sink: MasterStreamSink | null;
  queued: Buffer[];
  queuedBytes: number;
  droppedFrames: number;
  sentFrames: number;
  sentBytes: number;
  firstPacketSentAt: number;
  latestPacketSentAt: number;
  clientTelemetry: Record<string, unknown> | null;
  clientTelemetryAt: number;
  lastHeartbeatAt: number;
  removeDrain?: () => void;
};

export type MixxxMasterStreamOptions = {
  capture: MasterCaptureFactory;
  allowedOrigins?: readonly string[];
  originAllowed?: (origin: string) => boolean;
  now?: () => number;
  randomBytes?: (size: number) => Buffer;
  sessionTtlMs?: number;
  idleStopMs?: number;
  maxListeners?: number;
  maxQueueBytes?: number;
  rateLimitWindowMs?: number;
  rateLimitCreates?: number;
  maxCaptureRestarts?: number;
  restartDelayMs?: number;
  sampleRate?: number;
  channels?: number;
  nominalFrameSamples?: number;
  setTimer?: (callback: () => void, delayMs: number) => any;
  clearTimer?: (timer: any) => void;
};

export class MasterStreamError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

/**
 * Owns one injected master capture process and fans its bounded PCM frames out to
 * authenticated listeners. It deliberately knows nothing about Windows devices,
 * HTTP, cookies or Mixxx control state, so those remain at the trusted boundary.
 */
export class MixxxMasterStreamManager {
  private readonly sessions = new Map<string, Session>();
  private readonly createAttempts = new Map<string, number[]>();
  private captureProcess: MasterCaptureProcess | null = null;
  private idleTimer: any = null;
  private restartTimer: any = null;
  private captureRestarts = 0;
  private captureStartedAt = 0;
  private packetsCaptured = 0;
  private bytesCaptured = 0;
  private nonSilentPacketsCaptured = 0;
  private sourcePeak = 0;
  private sourceRms = 0;
  private lastCaptureAt = 0;
  private lastError = "";
  private staleSessionsRemoved = 0;
  private sequence = 0;
  private captureGeneration = 0;

  private readonly now: () => number;
  private readonly randomBytes: (size: number) => Buffer;
  private readonly setTimer: (callback: () => void, delayMs: number) => any;
  private readonly clearTimer: (timer: any) => void;
  private readonly allowedOrigins: Set<string>;
  private readonly originAllowed?: (origin: string) => boolean;
  private readonly sessionTtlMs: number;
  private readonly idleStopMs: number;
  private readonly maxListeners: number;
  private readonly maxQueueBytes: number;
  private readonly rateLimitWindowMs: number;
  private readonly rateLimitCreates: number;
  private readonly maxCaptureRestarts: number;
  private readonly restartDelayMs: number;
  private readonly sampleRate: number;
  private readonly channels: number;
  private readonly nominalFrameSamples: number;

  constructor(private readonly options: MixxxMasterStreamOptions) {
    this.now = options.now || Date.now;
    this.randomBytes = options.randomBytes || crypto.randomBytes;
    this.setTimer = options.setTimer || setTimeout;
    this.clearTimer = options.clearTimer || clearTimeout;
    this.allowedOrigins = new Set((options.allowedOrigins || []).map((origin) => normaliseOrigin(origin)));
    this.originAllowed = options.originAllowed;
    this.sessionTtlMs = options.sessionTtlMs ?? 90_000;
    this.idleStopMs = options.idleStopMs ?? 30_000;
    this.maxListeners = Math.min(2, Math.max(1, options.maxListeners ?? 2));
    this.maxQueueBytes = Math.max(4_096, options.maxQueueBytes ?? 256 * 1024);
    this.rateLimitWindowMs = options.rateLimitWindowMs ?? 60_000;
    this.rateLimitCreates = Math.max(1, options.rateLimitCreates ?? 6);
    this.maxCaptureRestarts = Math.max(0, options.maxCaptureRestarts ?? 3);
    this.restartDelayMs = Math.max(10, options.restartDelayMs ?? 1_000);
    this.sampleRate = Math.max(8_000, Math.min(192_000, options.sampleRate ?? 48_000));
    this.channels = options.channels === 1 ? 1 : 2;
    this.nominalFrameSamples = Math.max(1, options.nominalFrameSamples ?? 960);
  }

  createSession(request: CreateMasterStreamSession) {
    this.cleanupExpired();
    if (!request.authenticated || !request.profileId) throw new MasterStreamError("unauthenticated", "Authentication required");
    const origin = this.assertOrigin(request.origin);
    this.assertCreateRate(request.profileId, request.remoteAddress || "");
    if (this.sessions.size >= this.maxListeners) throw new MasterStreamError("listener_limit", "Listener limit reached");

    const id = this.randomBytes(18).toString("base64url");
    const token = this.randomBytes(32).toString("base64url");
    const session: Session = {
      id,
      tokenHash: hashToken(token),
      profileId: request.profileId,
      origin,
      createdAt: this.now(),
      expiresAt: this.now() + this.sessionTtlMs,
      attached: false,
      sink: null,
      queued: [],
      queuedBytes: 0,
      droppedFrames: 0,
      sentFrames: 0,
      sentBytes: 0,
      firstPacketSentAt: 0,
      latestPacketSentAt: 0,
      clientTelemetry: null,
      clientTelemetryAt: 0,
      lastHeartbeatAt: this.now(),
    };
    this.sessions.set(id, session);
    return { id, token, expiresAt: session.expiresAt };
  }

  attach(id: string, token: string, profileId: string, origin: string, sink: MasterStreamSink) {
    this.cleanupExpired();
    const session = this.authorise(id, token, profileId, origin);
    if (session.attached) throw new MasterStreamError("already_attached", "Session already has a listener");
    session.attached = true;
    session.sink = sink;
    session.removeDrain = sink.onDrain?.(() => this.flush(session));
    this.writeOrQueue(session, encodeM26PcmPreamble(this.sampleRate, this.channels, this.nominalFrameSamples));
    this.cancelIdleStop();
    this.ensureCapture();
  }

  disconnect(id: string, profileId: string) {
    const session = this.sessions.get(id);
    if (!session || session.profileId !== profileId) throw new MasterStreamError("not_found", "Session not found");
    this.removeSession(session);
    this.scheduleIdleStopIfNeeded();
  }

  recordClientTelemetry(id: string, token: string, profileId: string, origin: string, value: Record<string, unknown>) {
    const session = this.authorise(id, token, profileId, origin);
    session.lastHeartbeatAt = this.now();
    session.expiresAt = session.lastHeartbeatAt + this.sessionTtlMs;
    const number = (key: string) => Number.isFinite(Number(value[key])) ? Number(value[key]) : null;
    session.clientTelemetry = {
      state: String(value.state || "unknown").slice(0, 40),
      transportConnected: value.transportConnected === true,
      audioContextState: String(value.audioContextState || "unknown").slice(0, 40),
      framesReceived: number("framesReceived"),
      nonSilentFramesReceived: number("nonSilentFramesReceived"),
      sourcePeak: number("sourcePeak"),
      bufferedFrames: number("bufferedFrames"),
      staleFramesDropped: number("staleFramesDropped"),
      captureToReceiveMs: number("captureToReceiveMs"),
      lastError: value.lastError ? String(value.lastError).slice(0, 240) : null,
      outputAttached: value.outputAttached === true,
    };
    session.clientTelemetryAt = this.now();
  }

  stop() {
    if (this.idleTimer) this.clearTimer(this.idleTimer);
    if (this.restartTimer) this.clearTimer(this.restartTimer);
    this.idleTimer = null;
    this.restartTimer = null;
    for (const session of [...this.sessions.values()]) this.removeSession(session);
    this.stopCapture();
  }

  diagnostics() {
    const attached = [...this.sessions.values()].filter((session) => session.attached);
    return {
      supported: true,
      captureState: this.captureProcess ? "running" : "stopped",
      captureMethod: "injected-master-capture",
      listenerCount: attached.length,
      sessionCount: this.sessions.size,
      sessionIds: attached.map((session) => session.id.slice(0, 8)),
      codec: "pcm-s16le",
      sampleRate: this.sampleRate,
      channels: this.channels,
      packetsCaptured: this.packetsCaptured,
      bytesCaptured: this.bytesCaptured,
      pcmBytesPerSecond: this.captureProcess && this.captureStartedAt < this.now()
        ? Math.round(this.bytesCaptured * 1000 / Math.max(1, this.now() - this.captureStartedAt)) : 0,
      nonSilentPacketsCaptured: this.nonSilentPacketsCaptured,
      sourcePeak: this.sourcePeak,
      sourceRms: this.sourceRms,
      audioHealthy: this.nonSilentPacketsCaptured > 0 && this.sourcePeak > 0.0005,
      queuedBytes: attached.reduce((sum, session) => sum + session.queuedBytes, 0),
      droppedFrames: attached.reduce((sum, session) => sum + session.droppedFrames, 0),
      sentFrames: attached.reduce((sum, session) => sum + session.sentFrames, 0),
      sentBytes: attached.reduce((sum, session) => sum + session.sentBytes, 0),
      firstPacketSentAt: attached.reduce((first, session) => !session.firstPacketSentAt ? first : !first ? session.firstPacketSentAt : Math.min(first, session.firstPacketSentAt), 0) || null,
      latestPacketSentAt: attached.reduce((latest, session) => Math.max(latest, session.latestPacketSentAt), 0) || null,
      browser: attached.map((session) => ({
        sessionId: session.id.slice(0, 8),
        telemetryAt: session.clientTelemetryAt || null,
        heartbeatAgeMs: Math.max(0, this.now() - session.lastHeartbeatAt),
        expiresInMs: Math.max(0, session.expiresAt - this.now()),
        ...(session.clientTelemetry || { state: "not-reported" }),
      })),
      staleSessionsRemoved: this.staleSessionsRemoved,
      captureRestarts: this.captureRestarts,
      captureUptimeMs: this.captureProcess ? Math.max(0, this.now() - this.captureStartedAt) : 0,
      lastCaptureAt: this.lastCaptureAt || null,
      lastError: this.lastError || null,
    };
  }

  private assertOrigin(value: string) {
    const origin = normaliseOrigin(value);
    if (!origin || !(this.originAllowed?.(origin) || this.allowedOrigins.has(origin))) {
      throw new MasterStreamError("invalid_origin", "Origin is not allowed");
    }
    return origin;
  }

  private assertCreateRate(profileId: string, remoteAddress: string) {
    const key = `${profileId}:${remoteAddress}`;
    const cutoff = this.now() - this.rateLimitWindowMs;
    const recent = (this.createAttempts.get(key) || []).filter((stamp) => stamp > cutoff);
    if (recent.length >= this.rateLimitCreates) throw new MasterStreamError("rate_limited", "Too many session requests");
    recent.push(this.now());
    this.createAttempts.set(key, recent);
  }

  private authorise(id: string, token: string, profileId: string, origin: string) {
    const session = this.sessions.get(id);
    if (!session || session.expiresAt <= this.now()) throw new MasterStreamError("stale_session", "Session expired");
    if (session.profileId !== profileId || session.origin !== this.assertOrigin(origin)) throw new MasterStreamError("forbidden", "Session ownership mismatch");
    const expected = Buffer.from(session.tokenHash, "hex");
    const actual = Buffer.from(hashToken(token), "hex");
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) throw new MasterStreamError("forbidden", "Invalid session token");
    return session;
  }

  private ensureCapture() {
    if (this.captureProcess || !this.attachedCount()) return;
    const generation = ++this.captureGeneration;
    try {
      this.captureProcess = this.options.capture.start({
        data: (chunk, capturedAt) => { if (generation === this.captureGeneration) this.onCaptureData(chunk, capturedAt); },
        error: (error) => this.onCaptureFailure(generation, error),
        exit: (code, signal) => this.onCaptureFailure(generation, new Error(`Capture exited (${code ?? "null"}/${signal || "none"})`)),
      });
      this.captureStartedAt = this.now();
      this.lastError = "";
    } catch (error: any) {
      this.onCaptureFailure(generation, error instanceof Error ? error : new Error(String(error)));
    }
  }

  private onCaptureData(chunk: Buffer, capturedAt: number) {
    if (!chunk.length) return;
    this.packetsCaptured += 1;
    this.bytesCaptured += chunk.length;
    let peak = 0;
    let sumSquares = 0;
    const sampleCount = Math.floor(chunk.length / 2);
    for (let offset = 0; offset + 1 < chunk.length; offset += 2) {
      const value = Math.abs(chunk.readInt16LE(offset)) / 32768;
      if (value > peak) peak = value;
      sumSquares += value * value;
    }
    this.sourcePeak = peak;
    this.sourceRms = sampleCount ? Math.sqrt(sumSquares / sampleCount) : 0;
    if (peak > 0.0005) this.nonSilentPacketsCaptured += 1;
    this.lastCaptureAt = Number.isFinite(capturedAt) ? capturedAt : this.now();
    const packet = encodeM26PcmFrame(++this.sequence, this.lastCaptureAt, chunk);
    for (const session of this.sessions.values()) {
      if (!session.attached || !session.sink) continue;
      this.writeOrQueue(session, packet);
    }
  }

  private writeOrQueue(session: Session, packet: Buffer) {
    if (!session.queued.length && session.sink?.write(packet)) {
      session.sentFrames += 1;
      session.sentBytes += packet.length;
      session.firstPacketSentAt ||= this.now();
      session.latestPacketSentAt = this.now();
      return;
    }
    this.enqueue(session, packet);
  }

  private enqueue(session: Session, chunk: Buffer) {
    while (session.queued.length && session.queuedBytes + chunk.length > this.maxQueueBytes) {
      const dropped = session.queued.shift()!;
      session.queuedBytes -= dropped.length;
      session.droppedFrames += 1;
    }
    if (chunk.length > this.maxQueueBytes) {
      session.droppedFrames += 1;
      return;
    }
    session.queued.push(Buffer.from(chunk));
    session.queuedBytes += chunk.length;
  }

  private flush(session: Session) {
    while (session.sink && session.queued.length) {
      const chunk = session.queued[0];
      if (!session.sink.write(chunk)) return;
      session.queued.shift();
      session.queuedBytes -= chunk.length;
      session.sentFrames += 1;
      session.sentBytes += chunk.length;
      session.firstPacketSentAt ||= this.now();
      session.latestPacketSentAt = this.now();
    }
  }

  private onCaptureFailure(generation: number, error: Error) {
    if (generation !== this.captureGeneration) return;
    this.lastError = String(error.message || error);
    this.captureProcess = null;
    if (!this.attachedCount() || this.captureRestarts >= this.maxCaptureRestarts || this.restartTimer) return;
    this.captureRestarts += 1;
    this.restartTimer = this.setTimer(() => {
      this.restartTimer = null;
      this.ensureCapture();
    }, this.restartDelayMs * this.captureRestarts);
  }

  private cleanupExpired() {
    const now = this.now();
    for (const session of [...this.sessions.values()]) {
      if (session.expiresAt > now) continue;
      this.staleSessionsRemoved += 1;
      this.removeSession(session, new Error("Stream session expired"));
    }
    this.scheduleIdleStopIfNeeded();
  }

  private removeSession(session: Session, error?: Error) {
    session.removeDrain?.();
    session.sink?.end(error);
    session.queued = [];
    session.queuedBytes = 0;
    this.sessions.delete(session.id);
  }

  private attachedCount() {
    let count = 0;
    for (const session of this.sessions.values()) if (session.attached) count += 1;
    return count;
  }

  private scheduleIdleStopIfNeeded() {
    if (this.attachedCount() || !this.captureProcess || this.idleTimer) return;
    this.idleTimer = this.setTimer(() => {
      this.idleTimer = null;
      if (!this.attachedCount()) this.stopCapture();
    }, this.idleStopMs);
  }

  private cancelIdleStop() {
    if (!this.idleTimer) return;
    this.clearTimer(this.idleTimer);
    this.idleTimer = null;
  }

  private stopCapture() {
    const process = this.captureProcess;
    this.captureGeneration += 1;
    this.captureProcess = null;
    try { process?.stop(); } catch {}
  }
}

function normaliseOrigin(value: string) {
  try {
    const url = new URL(String(value || ""));
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.origin.toLowerCase();
  } catch {
    return "";
  }
}

export function encodeM26PcmPreamble(sampleRate = 48_000, channels = 2, nominalFrameSamples = 960) {
  const header = Buffer.alloc(24);
  header.write("BRM26PCM", 0, 8, "ascii");
  header.writeUInt16LE(1, 8);
  header.writeUInt16LE(24, 10);
  header.writeUInt32LE(sampleRate, 12);
  header.writeUInt16LE(channels, 16);
  header.writeUInt16LE(1, 18);
  header.writeUInt32LE(nominalFrameSamples, 20);
  return header;
}

export function encodeM26PcmFrame(sequence: number, captureTimestampMs: number, payload: Buffer, flags = 0) {
  const header = Buffer.alloc(24);
  header.write("M26F", 0, 4, "ascii");
  header.writeUInt32LE(sequence >>> 0, 4);
  header.writeDoubleLE(captureTimestampMs, 8);
  header.writeUInt32LE(payload.length, 16);
  header.writeUInt16LE(flags & 0xffff, 20);
  header.writeUInt16LE(0, 22);
  return Buffer.concat([header, payload]);
}
