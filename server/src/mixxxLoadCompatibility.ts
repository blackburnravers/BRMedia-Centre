import fs from "node:fs";
import path from "node:path";
import { BRMEDIA_MIXXX_PROTOCOL } from "./mixxxProtocol";

export type MixxxLoadCapabilities = {
  runtimeVersion: string;
  provider: "unsupported" | "engine-load-track-v1";
  arbitraryPathLoad: boolean;
  catalogueIdLoad: boolean;
  selectedRowLoad: boolean;
  deckSpecificLoad: boolean;
  acknowledgement: boolean;
  loadedIdentityFeedback: boolean;
  supported: boolean;
  reason: string | null;
};

export type MixxxLoadRequest = {
  protocolVersion: 5;
  sourceSession: string;
  requestId: string;
  commandSequence: number;
  deck: 1 | 2;
  catalogueIdentity: string;
  catalogueRevision: number | null;
  autoplay: false;
  replacePlayingDeck: boolean;
  clientGeneration: number;
};

export type MixxxLoadAcknowledgement = {
  requestId: string;
  deck: 1 | 2;
  accepted: boolean;
  state: "requested" | "rejected" | "accepted" | "loading" | "loaded" | "failed" | "timed-out" | "superseded";
  stableIdentity: string | null;
  mixxxSessionEpoch: number | null;
  feedbackSequence: number | null;
  clientGeneration: number;
  errorCode: string | null;
  message: string;
};

type ResolvedTrack = { id: string; filePath: string; filename: string | null };
type Context = {
  bridgeHealthy: boolean;
  nativePlaybackActive: boolean;
  deckPlaying: boolean;
  sessionEpoch: number | null;
  runtimeLoadSupported?: boolean;
};
type LoadExecutor = (deck: 1 | 2, canonicalPath: string, request: MixxxLoadRequest) => void;

const AUDIO_EXTENSIONS = new Set([".aac", ".aiff", ".aif", ".flac", ".m4a", ".mp3", ".mp4", ".ogg", ".opus", ".wav", ".wv"]);

export function canonicaliseMixxxWindowsPath(filePath: string) {
  if (!/^[A-Za-z]:[\\/]/.test(filePath)) return filePath;
  return path.win32.normalize(filePath.replace(/\//g, "\\"));
}

export function detectMixxxLoadCapabilities(runtimeVersion = "2.5.6", declaredApi = ""): MixxxLoadCapabilities {
  const supported = declaredApi === "engine-load-track-v1";
  return {
    runtimeVersion,
    provider: supported ? "engine-load-track-v1" : "unsupported",
    arbitraryPathLoad: supported,
    catalogueIdLoad: false,
    selectedRowLoad: true,
    deckSpecificLoad: supported,
    acknowledgement: supported,
    loadedIdentityFeedback: false,
    supported,
    reason: supported ? null : `Mixxx ${runtimeVersion} does not expose a documented arbitrary-path controller loading API.`,
  };
}

export function parseMixxxLoadRequest(raw: any): MixxxLoadRequest {
  const fail = (message: string): never => { throw new Error(message); };
  if (raw?.protocolVersion !== BRMEDIA_MIXXX_PROTOCOL.version) fail("protocol version mismatch");
  if (typeof raw.sourceSession !== "string" || !/^[A-Za-z0-9._:-]{1,96}$/.test(raw.sourceSession)) fail("invalid source/session identity");
  if (typeof raw.requestId !== "string" || !/^[A-Za-z0-9_-]{8,96}$/.test(raw.requestId)) fail("invalid request ID");
  if (!Number.isSafeInteger(raw.commandSequence) || raw.commandSequence < 1) fail("invalid command sequence");
  if (raw.deck !== 1 && raw.deck !== 2) fail("deck must be D1 or D2");
  if (typeof raw.catalogueIdentity !== "string" || !/^mixxx:\d+$/.test(raw.catalogueIdentity)) fail("invalid stable catalogue identity");
  if (raw.catalogueRevision !== null && (!Number.isSafeInteger(raw.catalogueRevision) || raw.catalogueRevision < 0)) fail("invalid catalogue revision");
  if (raw.autoplay !== false) fail("autoplay must be false");
  if (typeof raw.replacePlayingDeck !== "boolean") fail("replacePlayingDeck must be explicit");
  if (!Number.isSafeInteger(raw.clientGeneration) || raw.clientGeneration < 1) fail("invalid client generation");
  return raw as MixxxLoadRequest;
}

export class MixxxLoadCompatibilityProvider {
  readonly capabilities: MixxxLoadCapabilities;
  private decks = new Map<1 | 2, { request: MixxxLoadRequest; acknowledgement: MixxxLoadAcknowledgement; createdAt: number }>();
  private requests = new Map<string, MixxxLoadAcknowledgement>();

  constructor(
    readonly resolveTrack: (identity: string) => ResolvedTrack,
    readonly approvedRoot = "H:\\Music",
    runtimeVersion = "2.5.6",
    declaredApi = "",
    private readonly executeLoad?: LoadExecutor,
  ) {
    // A declaration describes the runtime API; an injected, reviewed adapter proves
    // BRMedia can actually invoke it. Never advertise support from configuration alone.
    this.capabilities = detectMixxxLoadCapabilities(runtimeVersion, executeLoad ? declaredApi : "");
  }

  private acknowledgement(request: MixxxLoadRequest, accepted: boolean, state: MixxxLoadAcknowledgement["state"], code: string | null, message: string, epoch: number | null): MixxxLoadAcknowledgement {
    return { requestId: request.requestId, deck: request.deck, accepted, state, stableIdentity: request.catalogueIdentity,
      mixxxSessionEpoch: epoch, feedbackSequence: null, clientGeneration: request.clientGeneration, errorCode: code, message };
  }

  private validateFile(track: ResolvedTrack) {
    const root = path.win32.resolve(this.approvedRoot);
    const candidate = path.win32.resolve(track.filePath);
    const relative = path.win32.relative(root, candidate);
    if (relative.startsWith("..") || path.win32.isAbsolute(relative) || candidate.startsWith("\\\\") || candidate.startsWith("\\\\?\\")) throw Object.assign(new Error("Track path is outside the approved music root."), { code: "PATH_OUTSIDE_ROOT" });
    if (!fs.existsSync(track.filePath)) throw Object.assign(new Error("Track file is missing."), { code: "FILE_MISSING" });
    if (!fs.statSync(track.filePath).isFile()) throw Object.assign(new Error("Track location is not a regular file."), { code: "FILE_NOT_REGULAR" });
    if (!AUDIO_EXTENSIONS.has(path.extname(track.filePath).toLowerCase())) throw Object.assign(new Error("Track codec or file type is unsupported."), { code: "UNSUPPORTED_CODEC" });
    const realRoot = fs.realpathSync.native(this.approvedRoot);
    const realFile = fs.realpathSync.native(track.filePath);
    const realRelative = path.win32.relative(path.win32.resolve(realRoot), path.win32.resolve(realFile));
    if (realRelative.startsWith("..") || path.win32.isAbsolute(realRelative)) throw Object.assign(new Error("Track resolves outside the approved music root."), { code: "PATH_ESCAPE" });
    return canonicaliseMixxxWindowsPath(realFile);
  }

  submit(raw: unknown, context: Context): MixxxLoadAcknowledgement {
    const request = parseMixxxLoadRequest(raw);
    const duplicate = this.requests.get(request.requestId);
    if (duplicate) return duplicate;
    const current = this.decks.get(request.deck);
    if (current && request.clientGeneration <= current.request.clientGeneration) {
      const ack = this.acknowledgement(request, false, "rejected", "STALE_REQUEST", "A newer or equal deck-load generation already exists.", context.sessionEpoch);
      this.requests.set(request.requestId, ack); return ack;
    }
    if (current && ["requested", "accepted", "loading"].includes(current.acknowledgement.state)) {
      this.update(current.request.requestId, { accepted: false, state: "superseded", errorCode: "STALE_REQUEST", message: "A newer deck-load generation superseded this request." });
    }
    let track: ResolvedTrack;
    let canonicalPath: string;
    try { track = this.resolveTrack(request.catalogueIdentity); canonicalPath = this.validateFile(track); }
    catch (error: any) {
      const ack = this.acknowledgement(request, false, "rejected", error?.code || "TRACK_NOT_FOUND", error instanceof Error ? error.message : "Track resolution failed.", context.sessionEpoch);
      this.requests.set(request.requestId, ack); return ack;
    }
    if (!context.bridgeHealthy) return this.remember(request, this.acknowledgement(request, false, "rejected", "BRIDGE_UNHEALTHY", "Mixxx bridge or heartbeat is unavailable.", context.sessionEpoch));
    if (context.nativePlaybackActive) return this.remember(request, this.acknowledgement(request, false, "rejected", "NATIVE_AUTHORITY", "BRMedia Native playback is authoritative.", context.sessionEpoch));
    if (context.deckPlaying && !request.replacePlayingDeck) return this.remember(request, this.acknowledgement(request, false, "rejected", "DECK_PLAYING", "Deck is playing; replacement was not authorised.", context.sessionEpoch));
    if (!this.capabilities.supported || context.runtimeLoadSupported === false) {
      const ack = this.acknowledgement(request, false, "rejected", "UNSUPPORTED_RUNTIME", this.capabilities.reason!, context.sessionEpoch);
      this.decks.set(request.deck, { request, acknowledgement: ack, createdAt: Date.now() });
      this.requests.set(request.requestId, ack); return ack;
    }
    try {
      this.executeLoad!(request.deck, canonicalPath, request);
      return this.remember(request, this.acknowledgement(request, true, "requested", null, "Load request sent to the compatible Mixxx mapping.", context.sessionEpoch));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Mixxx rejected the load request.";
      return this.remember(request, this.acknowledgement(request, false, "failed", "MIXXX_LOAD_FAILURE", message, context.sessionEpoch));
    }
  }

  private remember(request: MixxxLoadRequest, acknowledgement: MixxxLoadAcknowledgement) {
    this.decks.set(request.deck, { request, acknowledgement, createdAt: Date.now() });
    this.requests.set(request.requestId, acknowledgement); return acknowledgement;
  }

  private update(requestId: string, patch: Partial<MixxxLoadAcknowledgement>) {
    const previous = this.requests.get(requestId);
    if (!previous) return false;
    const acknowledgement = { ...previous, ...patch };
    this.requests.set(requestId, acknowledgement);
    const pending = this.decks.get(previous.deck);
    if (pending?.request.requestId === requestId) pending.acknowledgement = acknowledgement;
    return true;
  }

  accept(requestId: string, deck: 1 | 2, epoch: number) {
    const pending = this.decks.get(deck);
    if (!pending || pending.request.requestId !== requestId || pending.acknowledgement.mixxxSessionEpoch !== epoch) return false;
    return this.update(requestId, { accepted: true, state: "accepted", errorCode: null, message: "Mixxx accepted the load request without autoplay." });
  }

  fail(requestId: string, deck: 1 | 2, epoch: number, playing = false) {
    const pending = this.decks.get(deck);
    if (!pending || pending.request.requestId !== requestId || pending.acknowledgement.mixxxSessionEpoch !== epoch) return false;
    return this.update(requestId, { accepted: false, state: "failed", errorCode: playing ? "DECK_PLAYING" : "MIXXX_LOAD_FAILURE", message: playing ? "Mixxx rejected replacement of a playing deck." : "Mixxx rejected the load request." });
  }

  confirmLoaded(deck: 1 | 2, requestId: string, identity: string, epoch: number, sequence: number) {
    const pending = this.decks.get(deck);
    if (!pending || pending.request.requestId !== requestId || pending.acknowledgement.mixxxSessionEpoch !== epoch) return false;
    if (pending.request.catalogueIdentity !== identity) {
      this.update(requestId, { accepted: false, state: "failed", errorCode: "IDENTITY_MISMATCH", message: "Loaded identity did not match the requested track.", feedbackSequence: sequence });
      return false;
    }
    this.update(requestId, { accepted: true, state: "loaded", errorCode: null, message: "Track identity confirmed loaded.", feedbackSequence: sequence });
    return true;
  }

  expire(now = Date.now(), timeoutMs = 15_000) {
    for (const value of this.decks.values()) if (["requested", "accepted", "loading"].includes(value.acknowledgement.state) && now - value.createdAt >= timeoutMs)
      this.update(value.request.requestId, { accepted: false, state: "timed-out", errorCode: "LOAD_TIMEOUT", message: "Mixxx did not confirm the load before timeout." });
  }

  unload(deck: 1 | 2) { this.decks.delete(deck); }
  beginSession(epoch: number) { for (const value of this.decks.values()) if (value.acknowledgement.mixxxSessionEpoch !== epoch) this.update(value.request.requestId, { accepted: false, state: "failed", errorCode: "SESSION_CHANGED", message: "Mixxx session changed before identity confirmation." }); }
  externalLoad(deck: 1 | 2) { this.decks.delete(deck); return { deck, stableIdentity: null, externallyLoaded: true }; }
  status(deck: 1 | 2): MixxxLoadAcknowledgement | null;
  status(): { 1: MixxxLoadAcknowledgement | null; 2: MixxxLoadAcknowledgement | null };
  status(deck?: 1 | 2) { return deck ? this.decks.get(deck)?.acknowledgement || null : { 1: this.decks.get(1)?.acknowledgement || null, 2: this.decks.get(2)?.acknowledgement || null }; }
}
