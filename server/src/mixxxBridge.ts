import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { Input, Output } from "@julusian/midi";
import { json } from "./utils/json";
import { BRMEDIA_MIXXX_PROTOCOL, BRMEDIA_MIXXX_MESSAGES, BRMEDIA_MIXXX_LOAD_SYSEX, BRMEDIA_MIXXX_M20_CONTROLS, BRMEDIA_MIXXX_M7_CONTROLS, encodeMidiUnit } from "./mixxxProtocol";
import { SettingsService } from "./settings/service";
import { MixxxLiveState, type MixxxDeckNumber } from "./mixxxLiveState";
import { readMixxxTaskStatus } from "./mixxxTaskStatus";
import { defaultMixxxControllerDirectory, inspectMixxxMapping } from "./mixxxMappingStatus";

export const MIXXX_MIDI_PORT_NAME = "BRMedia Mixxx Remote";
export const MIXXX_M2_MESSAGES = {
  heartbeat: BRMEDIA_MIXXX_MESSAGES.heartbeat,
  deck1Play: BRMEDIA_MIXXX_MESSAGES.deck1Play,
  deck1Cue: BRMEDIA_MIXXX_MESSAGES.deck1Cue,
  deck1Pause: BRMEDIA_MIXXX_MESSAGES.deck1Pause,
  deck1Stop: BRMEDIA_MIXXX_MESSAGES.deck1Stop,
  deck1Unload: BRMEDIA_MIXXX_MESSAGES.deck1Unload,
  deck2Play: BRMEDIA_MIXXX_MESSAGES.deck2Play,
  deck2Cue: BRMEDIA_MIXXX_MESSAGES.deck2Cue,
  deck2Pause: BRMEDIA_MIXXX_MESSAGES.deck2Pause,
  deck2Stop: BRMEDIA_MIXXX_MESSAGES.deck2Stop,
  deck2Unload: BRMEDIA_MIXXX_MESSAGES.deck2Unload,
  crossfader: BRMEDIA_MIXXX_MESSAGES.crossfader,
  masterVolume: BRMEDIA_MIXXX_MESSAGES.masterVolume,
  deck1Gain: BRMEDIA_MIXXX_MESSAGES.deck1Gain, deck1EqHigh: BRMEDIA_MIXXX_MESSAGES.deck1EqHigh,
  deck1EqMid: BRMEDIA_MIXXX_MESSAGES.deck1EqMid, deck1EqLow: BRMEDIA_MIXXX_MESSAGES.deck1EqLow,
  deck1Filter: BRMEDIA_MIXXX_MESSAGES.deck1Filter, deck1Volume: BRMEDIA_MIXXX_MESSAGES.deck1Volume,
  deck1Pfl: BRMEDIA_MIXXX_MESSAGES.deck1Pfl,
  deck2Gain: BRMEDIA_MIXXX_MESSAGES.deck2Gain, deck2EqHigh: BRMEDIA_MIXXX_MESSAGES.deck2EqHigh,
  deck2EqMid: BRMEDIA_MIXXX_MESSAGES.deck2EqMid, deck2EqLow: BRMEDIA_MIXXX_MESSAGES.deck2EqLow,
  deck2Filter: BRMEDIA_MIXXX_MESSAGES.deck2Filter, deck2Volume: BRMEDIA_MIXXX_MESSAGES.deck2Volume,
  deck2Pfl: BRMEDIA_MIXXX_MESSAGES.deck2Pfl,
  deck1Mute: BRMEDIA_MIXXX_MESSAGES.deck1Mute, deck2Mute: BRMEDIA_MIXXX_MESSAGES.deck2Mute,
};
type Mode = "native" | "mixxx";
type Message = [number, number, number];
const M7_ACTIONS = {
  deck1Sync: 0x00, deck1Quantize: 0x01, deck1LoopIn: 0x02, deck1LoopOut: 0x03,
  deck1Reloop: 0x04, deck1AutoLoop: 0x05, deck1LoopSize: 0x06, deck1BeatJumpBack: 0x07,
  deck1BeatJumpForward: 0x08, deck2Sync: 0x20, deck2Quantize: 0x21, deck2LoopIn: 0x22,
  deck2LoopOut: 0x23, deck2Reloop: 0x24, deck2AutoLoop: 0x25, deck2LoopSize: 0x26,
  deck2BeatJumpBack: 0x27, deck2BeatJumpForward: 0x28,
} as const;
type M7Action = keyof typeof M7_ACTIONS;

export interface MidiInputPort {
  getPortCount(): number; getPortName(index: number): string;
  openPort(index: number): void; closePort(): void;
  on(event: "message", listener: (delta: number, message: number[]) => void): this;
  removeAllListeners?(event?: string): this;
  ignoreTypes?(sysex: boolean, timing: boolean, activeSensing: boolean): void;
}
export interface MidiOutputPort {
  getPortCount(): number; getPortName(index: number): string;
  openPort(index: number): void; closePort(): void; sendMessage(message: number[]): void;
}
export interface MidiPortFactory { input(): MidiInputPort; output(): MidiOutputPort; }
const factory: MidiPortFactory = { input: () => new Input(), output: () => new Output() };

export type MixxxLoadFeedback = {
  requestId: string;
  deck: 1 | 2;
  state: "accepted" | "loaded" | "failed" | "rejected-playing";
  sessionEpoch: number;
};
type LoadedIdentity = {
  stableIdentity: string;
  title: string | null;
  artist: string | null;
  album: string | null;
  genre: string | null;
  filename: string | null;
  artworkUrl: string | null;
  waveformAssociation: { brmediaTrackId: string; waveformAvailable: boolean; gridAvailable: boolean } | null;
};

function nibbleEncode(bytes: Buffer): number[] {
  const encoded: number[] = [];
  for (const value of bytes) encoded.push((value >> 4) & 0x0f, value & 0x0f);
  return encoded;
}

function nibbleDecode(values: number[]): Buffer | null {
  if (values.length % 2 || values.some((value) => !Number.isInteger(value) || value < 0 || value > 15)) return null;
  const bytes = Buffer.alloc(values.length / 2);
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = (values[index * 2] << 4) | values[index * 2 + 1];
  return bytes;
}

export function encodeMixxxLoadRequestSysex(deck: 1 | 2, requestId: string, canonicalPath: string, replacePlayingDeck: boolean): number[] {
  const spec = BRMEDIA_MIXXX_LOAD_SYSEX;
  const payload = Buffer.from(JSON.stringify({ v: 1, d: deck, r: requestId, p: canonicalPath, a: false, x: replacePlayingDeck }), "utf8");
  if (payload.length > spec.maxPayloadBytes) throw new Error("Mixxx load request exceeds the safe bridge payload limit.");
  return [spec.start, spec.manufacturer, ...spec.signature, spec.request, ...nibbleEncode(payload), spec.end];
}

export function decodeMixxxLoadFeedbackSysex(message: number[], sessionEpoch: number): MixxxLoadFeedback | null {
  const spec = BRMEDIA_MIXXX_LOAD_SYSEX;
  if (message.length < 11 || message[0] !== spec.start || message[message.length - 1] !== spec.end ||
    message[1] !== spec.manufacturer || !spec.signature.every((value, index) => message[index + 2] === value) ||
    message[5] !== spec.acknowledgement || (message[6] !== 1 && message[6] !== 2)) return null;
  const names = new Map<number, MixxxLoadFeedback["state"]>([
    [spec.states.accepted, "accepted"], [spec.states.loaded, "loaded"],
    [spec.states.failed, "failed"], [spec.states.rejectedPlaying, "rejected-playing"],
  ]);
  const state = names.get(message[7]);
  const requestBytes = nibbleDecode(message.slice(8, -1));
  if (!state || !requestBytes) return null;
  const requestId = requestBytes.toString("utf8");
  if (!/^[A-Za-z0-9_-]{8,96}$/.test(requestId)) return null;
  return { requestId, deck: message[6] as 1 | 2, state, sessionEpoch };
}

function portIndex(port: Pick<MidiInputPort, "getPortCount" | "getPortName">) {
  for (let index = 0; index < port.getPortCount(); index += 1)
    if (port.getPortName(index) === MIXXX_MIDI_PORT_NAME) return index;
  return -1;
}
function mixxxRunning() {
  if (process.platform !== "win32") return null;
  try {
    const text = execFileSync("C:\\Windows\\System32\\tasklist.exe",
      ["/FI", "IMAGENAME eq mixxx.exe", "/FO", "CSV", "/NH"],
      { encoding: "utf8", timeout: 1500, windowsHide: true });
    return /"mixxx\.exe"/i.test(text);
  } catch { return null; }
}

export class MixxxMidiBridge {
  private input: MidiInputPort | null = null;
  private output: MidiOutputPort | null = null;
  private enabled = false;
  private mode: Mode = "native";
  private connected = false;
  private inputAvailable = false;
  private outputAvailable = false;
  private nativePlaybackActive: boolean | null = null;
  private lastConnectedAt: string | null = null;
  private lastMessageSentAt: string | null = null;
  private lastFeedbackAt: string | null = null;
  private lastError: string | null = null;
  private lastFeedback: Message | null = null;
  private configuredBackend: "brmedia-native" | "mixxx" = "brmedia-native";
  private configuredEnabled = false;
  private reconciliationState: "pending" | "reconciled" | "fallback-native" = "pending";
  private reconciliationReason = "startup-pending";
  private reconciledAt: string | null = null;
  private lastDisconnectAt: string | null = null;
  private reconnectAttempts = 0;
  private currentBackoffMs: number | null = null;
  private lastReconnectSuccessAt: string | null = null;
  private retryExhaustedAt: string | null = null;
  private lastBackendChangeAt: string | null = null;
  private nativeFallbackAt: string | null = null;
  private connectionEpoch = 0;
  private loadCapabilityAt = 0;
  private pendingLoads = new Map<MixxxDeckNumber, string>();
  private readonly loadFeedbackListeners = new Set<(feedback: MixxxLoadFeedback) => void>();
  private loadedIdentities: Record<1 | 2, LoadedIdentity | null> = { 1: null, 2: null };
  private pendingUnloads = new Map<MixxxDeckNumber, { requestId: string; sessionEpoch: number }>();
  private unloadListeners = new Set<(deck: MixxxDeckNumber, requestId: string | null, sessionEpoch: number) => void>();
  constructor(private readonly ports: MidiPortFactory = factory, private readonly liveState = new MixxxLiveState()) {}

  private scan() {
    let input: MidiInputPort | null = null, output: MidiOutputPort | null = null;
    try {
      input = this.ports.input(); output = this.ports.output();
      this.inputAvailable = portIndex(input) >= 0;
      this.outputAvailable = portIndex(output) >= 0;
    } catch (error) {
      this.inputAvailable = this.outputAvailable = false;
      this.lastError = error instanceof Error ? error.message : String(error);
    } finally {
      try { input?.closePort(); } catch {}
      try { output?.closePort(); } catch {}
    }
  }
  refresh() {
    this.scan();
    if (this.connected && (!this.inputAvailable || !this.outputAvailable)) {
      this.fail(new Error(`MIDI port "${MIXXX_MIDI_PORT_NAME}" disconnected.`));
    }
    return this.status();
  }
  private enrichedFeedbackStatus() {
    const feedback = this.liveState.snapshot(this.connected);
    for (const deckNumber of [1, 2] as const) {
      const identity = this.loadedIdentities[deckNumber];
      const deck = deckNumber === 1 ? feedback.deck1 : feedback.deck2;
      if (identity && deck.loaded === true) Object.assign(deck, identity);
    }
    return feedback;
  }
  status() {
    if (!this.connected) this.scan();
    const feedback = this.enrichedFeedbackStatus();
    const processRunning = mixxxRunning();
    const mapping = this.mappingStatus(processRunning === true, feedback.protocolCompatible && feedback.heartbeatHealthy);
    return {
      enabled: this.enabled, mode: this.mode, portName: MIXXX_MIDI_PORT_NAME,
      availableBackends: [
        { id: "native", label: "BRMedia Native", available: true },
        { id: "mixxx", label: "Mixxx Backend", available: this.inputAvailable && this.outputAvailable },
      ],
      outputAvailable: this.outputAvailable, inputAvailable: this.inputAvailable,
      connected: this.connected, mappingExpected: "BRMedia Mixxx Remote",
      mappingFile: "BRMedia-Mixxx-M7-Live-Engine.midi.xml",
      mappingStatus: mapping.state,
      mapping,
      lastConnectedAt: this.lastConnectedAt, lastMessageSentAt: this.lastMessageSentAt,
      legacyLastFeedbackAt: this.lastFeedbackAt, lastError: this.lastError,
      restartRequired: mapping.restartRequired, mixxxRunningDetected: processRunning,
      controllerMappingSelected: feedback.protocolCompatible && feedback.heartbeatHealthy ? true : null,
      controllerMappingEvidence: feedback.protocolCompatible && feedback.heartbeatHealthy
        ? "protocol-v5-heartbeat"
        : null,
      nativePlaybackActive: this.nativePlaybackActive,
      lastFeedback: this.lastFeedback,
      ...feedback,
      protocol: { name: BRMEDIA_MIXXX_PROTOCOL.name, version: BRMEDIA_MIXXX_PROTOCOL.version },
      configuredBackend: this.configuredBackend,
      configuredEnabled: this.configuredEnabled,
      effectiveBackend: this.mode === "mixxx" ? "mixxx" : "brmedia-native",
      reconciled: this.reconciliationState === "reconciled" && this.configuredBackend === (this.mode === "mixxx" ? "mixxx" : "brmedia-native"),
      reconciliationState: this.reconciliationState,
      reconciliationReason: this.reconciliationReason,
      reconciledAt: this.reconciledAt,
      readiness: {
        processRunning,
        bridgeReachable: this.inputAvailable && this.outputAvailable,
        protocolConnected: this.connected && Boolean(this.liveState.snapshot(this.connected).protocolCompatible),
        heartbeatRecent: Boolean(this.liveState.snapshot(this.connected).heartbeatHealthy),
        stale: Boolean(this.liveState.snapshot(this.connected).stale),
        backendUsable: this.mode === "mixxx" && this.connected
          && Boolean(this.liveState.snapshot(this.connected).protocolCompatible)
          && Boolean(this.liveState.snapshot(this.connected).heartbeatHealthy),
      },
      arbitraryLoadSupported: this.connected && Date.now() - this.loadCapabilityAt <= 5000,
      telemetry: {
        lastDisconnectAt: this.lastDisconnectAt,
        reconnectAttempts: this.reconnectAttempts,
        currentBackoffMs: this.currentBackoffMs,
        lastReconnectSuccessAt: this.lastReconnectSuccessAt,
        retryExhaustedAt: this.retryExhaustedAt,
        lastBackendChangeAt: this.lastBackendChangeAt,
        nativeFallbackAt: this.nativeFallbackAt,
      },
    };
  }
  private mappingStatus(processRunning: boolean, protocolHealthy: boolean) {
    const directory = defaultMixxxControllerDirectory();
    if (!directory) return inspectMixxxMapping("", { mixxxRunning: processRunning, protocolHealthy });
    return inspectMixxxMapping(directory, { mixxxRunning: processRunning, protocolHealthy });
  }
  reportReconciliation(backend: "brmedia-native" | "mixxx", enabled: boolean, state: "reconciled" | "fallback-native", reason: string) {
    const previous = this.configuredBackend;
    this.configuredBackend = backend; this.configuredEnabled = enabled;
    this.reconciliationState = state; this.reconciliationReason = reason;
    this.reconciledAt = new Date().toISOString();
    if (previous !== backend) this.lastBackendChangeAt = this.reconciledAt;
    if (state === "fallback-native") this.nativeFallbackAt = this.reconciledAt;
    return this.status();
  }
  reportReconnectTelemetry(event: "attempt" | "success" | "exhausted" | "cancelled" | "native-fallback", backoffMs: number | null = null) {
    const now = new Date().toISOString();
    if (event === "attempt") {
      this.reconnectAttempts += 1;
      this.currentBackoffMs = Number.isFinite(backoffMs) ? Math.max(0, Math.min(30_000, Number(backoffMs))) : null;
    } else if (event === "success") {
      this.lastReconnectSuccessAt = now; this.reconnectAttempts = 0; this.currentBackoffMs = null; this.retryExhaustedAt = null;
    } else if (event === "exhausted") {
      this.retryExhaustedAt = now; this.currentBackoffMs = null;
    } else if (event === "cancelled") {
      this.reconnectAttempts = 0; this.currentBackoffMs = null;
    } else {
      this.nativeFallbackAt = now; this.currentBackoffMs = null;
    }
    return this.status();
  }
  open() {
    if (this.connected) return this.status();
    const input = this.ports.input(), output = this.ports.output();
    const inputIndex = portIndex(input), outputIndex = portIndex(output);
    this.inputAvailable = inputIndex >= 0; this.outputAvailable = outputIndex >= 0;
    if (inputIndex < 0 || outputIndex < 0) {
      try { input.closePort(); output.closePort(); } catch {}
      this.lastError = `MIDI port "${MIXXX_MIDI_PORT_NAME}" is unavailable.`;
      return this.status();
    }
    try {
      const epoch = ++this.connectionEpoch;
      if (!this.liveState.beginSession(epoch)) throw new Error("Could not start a new Mixxx bridge session.");
      input.on("message", (_delta, message) => {
        if (message[0] === BRMEDIA_MIXXX_LOAD_SYSEX.capability[0] &&
          message[1] === BRMEDIA_MIXXX_LOAD_SYSEX.capability[1] && message[2] === BRMEDIA_MIXXX_LOAD_SYSEX.capability[2]) {
          this.loadCapabilityAt = Date.now();
        }
        const loadFeedback = decodeMixxxLoadFeedbackSysex(message, epoch);
        if (loadFeedback) for (const listener of this.loadFeedbackListeners) listener(loadFeedback);
        const shortAck = message[0] === 0x90 && (message[1] === BRMEDIA_MIXXX_LOAD_SYSEX.shortAcknowledgement.deck1 ||
          message[1] === BRMEDIA_MIXXX_LOAD_SYSEX.shortAcknowledgement.deck2) ? message[2] : 0;
        if (shortAck >= 1 && shortAck <= 4) {
          const deck: MixxxDeckNumber = message[1] === BRMEDIA_MIXXX_LOAD_SYSEX.shortAcknowledgement.deck1 ? 1 : 2;
          const requestId = this.pendingLoads.get(deck);
          if (requestId) {
            const states = ["accepted", "loaded", "failed", "rejected-playing"] as const;
            const feedback = { requestId, deck, state: states[shortAck - 1], sessionEpoch: epoch };
            for (const listener of this.loadFeedbackListeners) listener(feedback);
            if (shortAck !== 1) this.pendingLoads.delete(deck);
          }
        }
        if (!this.liveState.receive(message, epoch)) return;
        if ((message[0] & 0xf0) === 0x90 && (message[1] === 0x3f || message[1] === 0x4f)) {
          const deck = message[1] === 0x3f ? 1 : 2;
          if (this.liveState.deck(deck, this.connected).loaded === false) {
            const pending = this.pendingUnloads.get(deck);
            this.loadedIdentities[deck] = null;
            this.pendingUnloads.delete(deck);
            for (const listener of this.unloadListeners) listener(deck, pending?.requestId || null, epoch);
          }
        }
        if (message.length >= 3 && message[0] !== 0xf0)
          this.lastFeedback = [message[0] & 255, message[1] & 127, message[2] & 127];
        this.lastFeedbackAt = new Date().toISOString();
      });
      input.ignoreTypes?.(false, true, true);
      input.openPort(inputIndex); output.openPort(outputIndex);
      this.input = input; this.output = output; this.enabled = this.connected = true;
      this.lastConnectedAt = new Date().toISOString(); this.lastError = null;
      console.log(`[Mixxx MIDI] Connected to "${MIXXX_MIDI_PORT_NAME}"`);
    } catch (error) {
      try { input.closePort(); output.closePort(); } catch {}
      this.lastError = error instanceof Error ? error.message : String(error);
    }
    return this.status();
  }
  close() {
    try { this.input?.removeAllListeners?.("message"); this.input?.closePort(); } catch {}
    try { this.output?.closePort(); } catch {}
    this.input = this.output = null; this.enabled = this.connected = false;
    this.loadCapabilityAt = 0;
    this.loadedIdentities = { 1: null, 2: null };
    this.pendingLoads.clear();
    this.pendingUnloads.clear();
    this.liveState.markDisconnected(this.connectionEpoch);
    this.mode = "native"; this.nativePlaybackActive = null;
    return this.status();
  }
  shutdown() { if (this.input || this.output || this.enabled) this.close(); }
  onLoadFeedback(listener: (feedback: MixxxLoadFeedback) => void) {
    this.loadFeedbackListeners.add(listener);
    return () => this.loadFeedbackListeners.delete(listener);
  }
  onDeckUnload(listener: (deck: MixxxDeckNumber, requestId: string | null, sessionEpoch: number) => void) {
    this.unloadListeners.add(listener);
    return () => this.unloadListeners.delete(listener);
  }
  attachLoadedIdentity(deck: MixxxDeckNumber, identity: LoadedIdentity) {
    this.loadedIdentities[deck] = { ...identity };
  }
  reportNativePlayback(active: boolean) {
    this.nativePlaybackActive = active;
    if (active && this.mode === "mixxx") this.close();
    return this.status();
  }
  setMode(mode: Mode, nativePlaybackActive: boolean) {
    if (mode === "mixxx" && this.nativePlaybackActive === true) throw new Error("Stop all BRMedia Native decks before selecting Mixxx mode.");
    this.nativePlaybackActive = nativePlaybackActive;
    if (mode === "mixxx") {
      if (nativePlaybackActive) throw new Error("Stop all BRMedia Native decks before selecting Mixxx mode.");
      if (!this.enabled || !this.connected) throw new Error("The Mixxx MIDI bridge must be enabled and connected.");
      const feedback = this.liveState.snapshot(this.connected);
      if (!feedback.protocolCompatible || !feedback.heartbeatHealthy || feedback.stale)
        throw new Error("Protocol v5 and a current Mixxx heartbeat are required.");
    }
    this.mode = mode; return this.status();
  }
  private fail(error: unknown) {
    this.lastError = error instanceof Error ? error.message : String(error);
    try { this.input?.closePort(); this.output?.closePort(); } catch {}
    this.input = this.output = null; this.enabled = this.connected = false; this.loadCapabilityAt = 0; this.liveState.markDisconnected(this.connectionEpoch); this.mode = "native";
    this.pendingLoads.clear();
    this.pendingUnloads.clear();
    this.lastDisconnectAt = new Date().toISOString();
  }
  feedbackStatus() { return this.enrichedFeedbackStatus(); }
  deckStatus(deck: MixxxDeckNumber) {
    const feedback = this.enrichedFeedbackStatus();
    return deck === 1 ? feedback.deck1 : feedback.deck2;
  }
  receiveFeedbackForTest(message: number[]) { this.liveState.receive(message); return this.feedbackStatus(); }
  private assertAuthority() {
    const feedback = this.liveState.snapshot(this.connected);
    if (this.mode !== "mixxx")
      throw new Error("Mixxx controls are unavailable while BRMedia Native mode is selected.");
    if (!this.enabled || !this.connected || !this.output ||
      this.nativePlaybackActive !== false || !feedback.protocolCompatible ||
      !feedback.heartbeatHealthy || feedback.stale)
      throw new Error("Mixxx live-engine authority is not active.");
  }
  sendM23Load(deck: MixxxDeckNumber, canonicalPath: string, requestId: string, replacePlayingDeck = false) {
    this.assertAuthority();
    if (Date.now() - this.loadCapabilityAt > 5000) throw new Error("The running Mixxx mapping does not advertise arbitrary loading support.");
    this.pendingLoads.set(deck, requestId);
    try { this.output!.sendMessage(encodeMixxxLoadRequestSysex(deck, requestId, canonicalPath, replacePlayingDeck));
      this.lastMessageSentAt = new Date().toISOString(); }
    catch (error) { this.pendingLoads.delete(deck); throw error; }
  }
  sendUnload(deck: MixxxDeckNumber, requestId: string, confirmPlaying = false) {
    this.assertAuthority();
    if (!/^[A-Za-z0-9_-]{8,96}$/.test(requestId)) throw new Error("Invalid unload request ID.");
    const state = this.deckStatus(deck);
    if (state.loaded !== true) throw new Error("Deck is already empty.");
    if (state.playing === true && !confirmPlaying) throw new Error("Playing deck — confirmation required.");
    const existing = this.pendingUnloads.get(deck);
    if (existing) {
      if (existing.requestId === requestId) return this.status();
      throw new Error("An unload request is already pending for this deck.");
    }
    this.pendingUnloads.set(deck, { requestId, sessionEpoch: this.connectionEpoch });
    try {
      const control = deck === 1 ? MIXXX_M2_MESSAGES.deck1Unload : MIXXX_M2_MESSAGES.deck2Unload;
      this.output!.sendMessage([control[0], control[1], confirmPlaying ? 126 : 127]);
      this.lastMessageSentAt = new Date().toISOString();
    } catch (error) {
      this.pendingUnloads.delete(deck); this.fail(error); throw error;
    }
    return this.status();
  }
  sendM7(control: M7Action, value = 127) {
    this.assertAuthority();
    this.output!.sendMessage([BRMEDIA_MIXXX_M7_CONTROLS.status, M7_ACTIONS[control], Math.max(0, Math.min(127, Math.round(value)))]);
    this.lastMessageSentAt = new Date().toISOString(); return this.status();
  }
  sendM12Seek(deck: MixxxDeckNumber, position: number) {
    if (!Number.isFinite(position) || position < 0 || position > 1)
      throw new Error("position must be a finite number from 0 to 1");
    this.assertAuthority();
    const raw = Math.round(position * 16383);
    const high = deck === 1 ? BRMEDIA_MIXXX_M7_CONTROLS.deck1SeekHigh : BRMEDIA_MIXXX_M7_CONTROLS.deck2SeekHigh;
    const low = deck === 1 ? BRMEDIA_MIXXX_M7_CONTROLS.deck1SeekLow : BRMEDIA_MIXXX_M7_CONTROLS.deck2SeekLow;
    this.output!.sendMessage([BRMEDIA_MIXXX_M7_CONTROLS.status, high, (raw >> 7) & 0x7f]);
    this.output!.sendMessage([BRMEDIA_MIXXX_M7_CONTROLS.status, low, raw & 0x7f]);
    this.lastMessageSentAt = new Date().toISOString();
    return this.status();
  }
  sendM7Hotcue(deck: MixxxDeckNumber, cue: number) {
    if (!Number.isInteger(cue) || cue < 1 || cue > 8) throw new Error("hot cue must be from 1 to 8");
    const base = deck === 1 ? BRMEDIA_MIXXX_M7_CONTROLS.deck1HotcueBase : BRMEDIA_MIXXX_M7_CONTROLS.deck2HotcueBase;
    this.assertAuthority();
    this.output!.sendMessage([BRMEDIA_MIXXX_M7_CONTROLS.status, base + cue - 1, 127]);
    this.lastMessageSentAt = new Date().toISOString(); return this.status();
  }
  sendM20(deck: MixxxDeckNumber, offset: number, value = 127) {
    if (!Number.isInteger(offset) || offset < 0 || offset > 0x1f ||
      !Number.isFinite(value) || value < 0 || value > 127)
      throw new Error("Invalid professional Mixxx control.");
    this.assertAuthority();
    const base = deck === 1 ? BRMEDIA_MIXXX_M20_CONTROLS.deck1Base : BRMEDIA_MIXXX_M20_CONTROLS.deck2Base;
    this.output!.sendMessage([BRMEDIA_MIXXX_M20_CONTROLS.status, base + offset, Math.round(value)]);
    this.lastMessageSentAt = new Date().toISOString();
    return this.status();
  }
  sendM20Pair(deck: MixxxDeckNumber, highOffset: number, lowOffset: number, value: number) {
    if (!Number.isInteger(value) || value < 0 || value > 16383)
      throw new Error("Professional paired value must be an unsigned 14-bit integer.");
    this.sendM20(deck, highOffset, (value >> 7) & 0x7f);
    return this.sendM20(deck, lowOffset, value & 0x7f);
  }
  send(control: keyof typeof MIXXX_M2_MESSAGES, value = 127) {
    this.assertAuthority();
    const [status, data1] = MIXXX_M2_MESSAGES[control];
    try {
      this.output!.sendMessage([status, data1, Math.max(0, Math.min(127, Math.round(value)))]);
      if (control === "deck1Cue" || control === "deck2Cue") this.output!.sendMessage([status, data1, 0]);
      this.lastMessageSentAt = new Date().toISOString();
    } catch (error) { this.fail(error); throw error; }
    return this.status();
  }
  sendCue(deck: MixxxDeckNumber, pressed: boolean) {
    this.assertAuthority();
    const control = deck === 1 ? "deck1Cue" : "deck2Cue";
    const [status, data1] = MIXXX_M2_MESSAGES[control];
    this.output!.sendMessage([status, data1, pressed ? 127 : 0]);
    this.lastMessageSentAt = new Date().toISOString();
    return this.status();
  }
}
export const mixxxMidiBridge = new MixxxMidiBridge();
const mixxxSettings = new SettingsService();
let reconciliationQueue: Promise<unknown> = Promise.resolve();
function serialise<T>(operation: () => Promise<T>): Promise<T> {
  const next = reconciliationQueue.then(operation, operation);
  reconciliationQueue = next.then(() => undefined, () => undefined);
  return next;
}
export function updatePersistedMixxxBackend(backend: "brmedia-native" | "mixxx", enabled: boolean) {
  return mixxxSettings.updateModule("dj", { engine: { backend, mixxxEnabled: enabled, mixxxMidiPort: MIXXX_MIDI_PORT_NAME } });
}
function bridgeFeedbackHealthy(status: ReturnType<MixxxMidiBridge["status"]>) {
  return status.connected && status.protocolCompatible && status.heartbeatHealthy;
}
export async function waitForMixxxHandshake(
  bridge: MixxxMidiBridge,
  timeoutMs = 3_000,
  pollMs = 50,
) {
  const deadline = Date.now() + Math.max(0, timeoutMs);
  let status = bridge.status();
  while (!bridgeFeedbackHealthy(status) && Date.now() < deadline) {
    await new Promise<void>((resolve) => setTimeout(resolve, Math.max(10, pollMs)));
    status = bridge.status();
  }
  return status;
}
export function reconcilePersistedMixxxBackend(reason = "startup") {
  return serialise(async () => {
    const engine = mixxxSettings.readModule("dj").data.engine;
    if (engine.backend !== "mixxx" || engine.mixxxEnabled !== true) {
      mixxxMidiBridge.close();
      if (engine.backend !== "brmedia-native" || engine.mixxxEnabled !== false) await updatePersistedMixxxBackend("brmedia-native", false);
      return mixxxMidiBridge.reportReconciliation("brmedia-native", false, "reconciled", reason);
    }
    try {
      const opened = mixxxMidiBridge.open();
      const ready = bridgeFeedbackHealthy(opened) ? opened : await waitForMixxxHandshake(mixxxMidiBridge);
      if (!bridgeFeedbackHealthy(ready)) throw new Error(ready.lastError || "Mixxx bridge feedback is unavailable or stale.");
      mixxxMidiBridge.setMode("mixxx", false);
      return mixxxMidiBridge.reportReconciliation("mixxx", true, "reconciled", reason);
    } catch (error) {
      mixxxMidiBridge.close();
      await updatePersistedMixxxBackend("brmedia-native", false);
      const message = error instanceof Error ? error.message : String(error);
      return mixxxMidiBridge.reportReconciliation("brmedia-native", false, "fallback-native", `${reason}: ${message}`);
    }
  });
}
export function switchPersistedMixxxBackend(backend: "brmedia-native" | "mixxx", nativePlaybackActive: boolean, enabled = backend === "mixxx") {
  return serialise(async () => {
    if (backend === "brmedia-native") {
      mixxxMidiBridge.close();
      await updatePersistedMixxxBackend("brmedia-native", enabled);
      return mixxxMidiBridge.reportReconciliation("brmedia-native", enabled, "reconciled", "runtime-switch");
    }
    if (!enabled) throw new Error("Mixxx must be enabled before it can be selected.");
    const opened = mixxxMidiBridge.open();
    const ready = bridgeFeedbackHealthy(opened) ? opened : await waitForMixxxHandshake(mixxxMidiBridge);
    if (!bridgeFeedbackHealthy(ready)) throw new Error(ready.lastError || "Mixxx bridge feedback is unavailable or stale.");
    mixxxMidiBridge.setMode("mixxx", nativePlaybackActive);
    try {
      const result = await updatePersistedMixxxBackend("mixxx", true);
      if (!result.ok) throw new Error("The Mixxx backend setting could not be persisted.");
    } catch (error) {
      mixxxMidiBridge.close();
      await updatePersistedMixxxBackend("brmedia-native", false).catch(() => undefined);
      mixxxMidiBridge.reportReconciliation("brmedia-native", false, "fallback-native", "persistence-failed");
      throw error;
    }
    return mixxxMidiBridge.reportReconciliation("mixxx", true, "reconciled", "runtime-switch");
  });
}
export function reconnectPersistedMixxxBackend(nativePlaybackActive: boolean, reason = "bounded-reconnect") {
  return serialise(async () => {
    const engine = mixxxSettings.readModule("dj").data.engine;
    if (engine.backend !== "mixxx" || engine.mixxxEnabled !== true)
      return mixxxMidiBridge.reportReconciliation("brmedia-native", engine.mixxxEnabled === true, "fallback-native", "reconnect-cancelled-backend-changed");
    if (nativePlaybackActive || mixxxMidiBridge.status().nativePlaybackActive === true)
      return mixxxMidiBridge.reportReconciliation("mixxx", true, "fallback-native", "reconnect-blocked-native-playback");
    const opened = mixxxMidiBridge.open();
    const ready = bridgeFeedbackHealthy(opened) ? opened : await waitForMixxxHandshake(mixxxMidiBridge);
    if (!bridgeFeedbackHealthy(ready))
      return mixxxMidiBridge.reportReconciliation("mixxx", true, "fallback-native", `${reason}: bridge-unavailable`);
    mixxxMidiBridge.setMode("mixxx", false);
    return mixxxMidiBridge.reportReconciliation("mixxx", true, "reconciled", reason);
  });
}

export type MixxxStartupState =
  | "already-running" | "starting" | "connected"
  | "process-running-bridge-unavailable" | "launch-failed"
  | "executable-missing" | "disabled" | "unknown";

export function readMixxxStartupStatus(stateDirectory = process.env.BRMEDIA_STATE_DIR || "C:\\BRMedia") {
  const fallback = {
    state: "unknown" as MixxxStartupState, updatedAt: null, runId: null, triggerObservedAt: null,
    delayElapsedAt: null, action: null, retryCount: 0, processRunning: null,
    bridgeHealthy: null, executable: null,
  };
  try {
    const raw = fs.readFileSync(path.join(stateDirectory, "mixxx-startup-status.json"), "utf8").replace(/^\uFEFF/, "");
    const value = JSON.parse(raw) as Record<string, unknown>;
    const allowed: MixxxStartupState[] = ["already-running", "starting", "connected", "process-running-bridge-unavailable", "launch-failed", "executable-missing", "disabled", "unknown"];
    return {
      state: allowed.includes(value.state as MixxxStartupState) ? value.state as MixxxStartupState : "unknown",
      updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : null,
      runId: typeof value.runId === "string" ? value.runId.slice(0, 64) : null,
      triggerObservedAt: typeof value.triggerObservedAt === "string" ? value.triggerObservedAt : null,
      delayElapsedAt: typeof value.delayElapsedAt === "string" ? value.delayElapsedAt : null,
      action: typeof value.action === "string" ? value.action.slice(0, 64) : null,
      retryCount: Number.isInteger(value.retryCount) ? Math.max(0, Number(value.retryCount)) : 0,
      processRunning: typeof value.processRunning === "boolean" ? value.processRunning : null,
      bridgeHealthy: typeof value.bridgeHealthy === "boolean" ? value.bridgeHealthy : null,
      executable: typeof value.executable === "string" ? path.basename(value.executable) : null,
    };
  } catch { return fallback; }
}
export const mixxxStartupRestoration = process.env.NODE_TEST_CONTEXT
  ? Promise.resolve(mixxxMidiBridge.reportReconciliation("brmedia-native", false, "reconciled", "test-runtime"))
  : reconcilePersistedMixxxBackend("startup-restoration");

function body(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let value = "";
    req.on("data", chunk => { value += chunk; if (value.length > 4096) reject(new Error("Payload too large")); });
    req.on("end", () => { try { resolve(value ? JSON.parse(value) : {}); } catch { reject(new Error("Invalid JSON payload")); } });
    req.on("error", reject);
  });
}
export async function handleMixxxMidiRoute(req: IncomingMessage, res: ServerResponse, url: URL,
  bridge: MixxxMidiBridge = mixxxMidiBridge): Promise<boolean> {
  const root = "/api/dj/mixxx";
  if (!url.pathname.startsWith(root)) return false;
  if (req.method === "GET" && url.pathname === `${root}/status`)
    return json(res, 200, { ok: true, bridge: bridge.refresh(), startup: readMixxxStartupStatus(), task: readMixxxTaskStatus() });
  if (req.method === "GET" && url.pathname === `${root}/decks`)
    return json(res, 200, { ok: true, ...bridge.feedbackStatus() });
  const deckMatch = url.pathname.match(/^\/api\/dj\/mixxx\/decks\/([^/]+)$/);
  if (req.method === "GET" && deckMatch) {
    if (deckMatch[1] !== "1" && deckMatch[1] !== "2") return json(res, 400, { error: "deck must be 1 or 2" });
    const deck = Number(deckMatch[1]) as MixxxDeckNumber;
    return json(res, 200, { ok: true, deckNumber: deck, deck: bridge.deckStatus(deck) });
  }
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  let data: Record<string, unknown>;
  try { data = await body(req); } catch (error) {
    return json(res, 400, { error: error instanceof Error ? error.message : String(error) });
  }
  try {
    if (url.pathname === `${root}/resync`) return json(res, 200, { ok: true, requested: false, reason: "Controller snapshots are periodic; no outbound MIDI was sent.", ...bridge.feedbackStatus() });
    if (url.pathname === `${root}/open`) {
      const status = bridge.open(); return json(res, status.connected ? 200 : 503, { ok: status.connected, bridge: status });
    }
    if (url.pathname === `${root}/close`) return json(res, 200, { ok: true, bridge: bridge.close() });
    if (url.pathname === `${root}/refresh`) return json(res, 200, { ok: true, bridge: bridge.refresh() });
    if (url.pathname === `${root}/reconnect`) {
      if (bridge !== mixxxMidiBridge) return json(res, 409, { error: "Runtime reconnection requires the runtime bridge." });
      if (typeof data.nativePlaybackActive !== "boolean") return json(res, 400, { error: "nativePlaybackActive must be explicitly supplied" });
      return json(res, 200, { ok: true, bridge: await reconnectPersistedMixxxBackend(data.nativePlaybackActive) });
    }
    if (url.pathname === `${root}/native-playback`) {
      if (typeof data.active !== "boolean") return json(res, 400, { error: "active must be a boolean" });
      return json(res, 200, { ok: true, bridge: bridge.reportNativePlayback(data.active) });
    }
    if (url.pathname === `${root}/telemetry`) {
      if (bridge !== mixxxMidiBridge) return json(res, 409, { error: "Runtime telemetry requires the runtime bridge." });
      const events = ["attempt", "success", "exhausted", "cancelled", "native-fallback"] as const;
      if (!events.includes(data.event as typeof events[number])) return json(res, 400, { error: "Invalid telemetry event" });
      const backoff = data.backoffMs === null || data.backoffMs === undefined ? null : Number(data.backoffMs);
      if (backoff !== null && !Number.isFinite(backoff)) return json(res, 400, { error: "backoffMs must be finite" });
      return json(res, 200, { ok: true, bridge: bridge.reportReconnectTelemetry(data.event as typeof events[number], backoff) });
    }
    if (url.pathname === `${root}/backend`) {
      if (bridge !== mixxxMidiBridge) return json(res, 409, { error: "Persisted switching requires the runtime bridge." });
      if (data.backend !== "brmedia-native" && data.backend !== "mixxx") return json(res, 400, { error: "backend must be brmedia-native or mixxx" });
      if (typeof data.nativePlaybackActive !== "boolean") return json(res, 400, { error: "nativePlaybackActive must be explicitly supplied" });
      if (data.enabled !== undefined && typeof data.enabled !== "boolean") return json(res, 400, { error: "enabled must be a boolean" });
      const status = await switchPersistedMixxxBackend(data.backend, data.nativePlaybackActive, data.enabled as boolean | undefined);
      return json(res, 200, { ok: true, bridge: status });
    }
    if (url.pathname === `${root}/mode`) {
      if (data.mode !== "native" && data.mode !== "mixxx") return json(res, 400, { error: "mode must be native or mixxx" });
      if (typeof data.nativePlaybackActive !== "boolean") return json(res, 400, { error: "nativePlaybackActive must be explicitly supplied" });
      return json(res, 200, { ok: true, bridge: bridge.setMode(data.mode, data.nativePlaybackActive) });
    }
    const controls: Record<string, keyof typeof MIXXX_M2_MESSAGES> = {
      [`${root}/heartbeat`]: "heartbeat", [`${root}/deck/1/play`]: "deck1Play",
      [`${root}/deck/2/play`]: "deck2Play", [`${root}/deck/1/cue`]: "deck1Cue",
      [`${root}/deck/2/cue`]: "deck2Cue", [`${root}/deck/1/pause`]: "deck1Pause",
      [`${root}/deck/2/pause`]: "deck2Pause", [`${root}/deck/1/stop`]: "deck1Stop",
      [`${root}/deck/2/stop`]: "deck2Stop",
    };
    const unloadMatch = url.pathname.match(/^\/api\/dj\/mixxx\/deck\/(1|2)\/unload$/);
    if (unloadMatch) {
      if (typeof data.requestId !== "string" || typeof data.confirmPlaying !== "boolean")
        return json(res, 400, { error: "requestId and confirmPlaying are required" });
      const deck = Number(unloadMatch[1]) as MixxxDeckNumber;
      const deckState = bridge.deckStatus(deck);
      if (deckState.playing === true && !data.confirmPlaying)
        return json(res, 409, { error: "Playing deck — confirmation required.", code: "DECK_PLAYING" });
      return json(res, 202, { ok: true, bridge: bridge.sendUnload(deck, data.requestId, data.confirmPlaying) });
    }
    if (controls[url.pathname]) return json(res, 200, { ok: true, bridge: bridge.send(controls[url.pathname]) });
    const cueHoldMatch = url.pathname.match(/^\/api\/dj\/mixxx\/deck\/(1|2)\/cue-(down|up)$/);
    if (cueHoldMatch)
      return json(res, 200, { ok: true, bridge: bridge.sendCue(Number(cueHoldMatch[1]) as MixxxDeckNumber, cueHoldMatch[2] === "down") });
    if (url.pathname === `${root}/crossfader`) {
      if (typeof data.value !== "number" || !Number.isFinite(data.value) || data.value < 0 || data.value > 1)
        return json(res, 400, { error: "value must be a finite number from 0 to 1" });
      return json(res, 200, { ok: true, bridge: bridge.send("crossfader", encodeMidiUnit(data.value)) });
    }
    const seekMatch = url.pathname.match(/^\/api\/dj\/mixxx\/deck\/(1|2)\/seek$/);
    if (seekMatch) {
      if (typeof data.position !== "number" || !Number.isFinite(data.position) || data.position < 0 || data.position > 1) return json(res, 400, { error: "position must be a finite number from 0 to 1" });
      return json(res, 200, { ok: true, bridge: bridge.sendM12Seek(Number(seekMatch[1]) as MixxxDeckNumber, data.position) });
    }
    const performanceMatch = url.pathname.match(/^\/api\/dj\/mixxx\/deck\/(1|2)\/performance\/(sync|quantize|loop-in|loop-out|reloop|auto-loop|loop-size|loop-halve|loop-double|beat-jump-back|beat-jump-forward|cue-return|cue-set)$/);
    const hotcueMatch = url.pathname.match(/^\/api\/dj\/mixxx\/deck\/(1|2)\/hotcue\/([1-8])$/);
    if (hotcueMatch) return json(res, 200, { ok: true, bridge: bridge.sendM7Hotcue(Number(hotcueMatch[1]) as MixxxDeckNumber, Number(hotcueMatch[2])) });
    const hotcueActionMatch = url.pathname.match(/^\/api\/dj\/mixxx\/deck\/(1|2)\/hotcue\/([1-8])\/(set|trigger|clear)$/);
    if (hotcueActionMatch) {
      const offsets = BRMEDIA_MIXXX_M20_CONTROLS.offsets;
      const actionOffset = hotcueActionMatch[3] === "set" ? offsets.hotcueSet :
        hotcueActionMatch[3] === "trigger" ? offsets.hotcueTrigger : offsets.hotcueClear;
      return json(res, 200, { ok: true, bridge: bridge.sendM20(Number(hotcueActionMatch[1]) as MixxxDeckNumber, actionOffset, Number(hotcueActionMatch[2])) });
    }
    if (performanceMatch) {
      const deck = performanceMatch[1], action = performanceMatch[2];
      const professional: Record<string, number> = {
        "loop-halve": BRMEDIA_MIXXX_M20_CONTROLS.offsets.loopHalve,
        "loop-double": BRMEDIA_MIXXX_M20_CONTROLS.offsets.loopDouble,
        "cue-return": BRMEDIA_MIXXX_M20_CONTROLS.offsets.cueReturn,
        "cue-set": BRMEDIA_MIXXX_M20_CONTROLS.offsets.cueSet,
      };
      if (professional[action] !== undefined)
        return json(res, 200, { ok: true, bridge: bridge.sendM20(Number(deck) as MixxxDeckNumber, professional[action]) });
      if (action === "sync" && typeof data.enabled === "boolean")
        return json(res, 200, { ok: true, bridge: bridge.sendM20(Number(deck) as MixxxDeckNumber, BRMEDIA_MIXXX_M20_CONTROLS.offsets.syncEnabled, data.enabled ? 127 : 0) });
      const suffix: Record<string, string> = { sync: "Sync", quantize: "Quantize", "loop-in": "LoopIn", "loop-out": "LoopOut", reloop: "Reloop", "auto-loop": "AutoLoop", "loop-size": "LoopSize", "beat-jump-back": "BeatJumpBack", "beat-jump-forward": "BeatJumpForward" };
      let value = 127;
      if (action === "loop-size" || action.startsWith("beat-jump-")) {
        if (typeof data.beats !== "number" || !Number.isFinite(data.beats) || data.beats < 0.03125 || data.beats > 128) return json(res, 400, { error: "beats must be from 1/32 to 128" });
        value = Math.max(1, Math.min(127, Math.round(64 + Math.log2(data.beats) * 8)));
        if (action.startsWith("beat-jump-"))
          bridge.sendM20(Number(deck) as MixxxDeckNumber, BRMEDIA_MIXXX_M20_CONTROLS.offsets.beatJumpSize, value);
      }
      return json(res, 200, { ok: true, bridge: bridge.sendM7((`deck${deck}${suffix[action]}`) as M7Action, value) });
    }
    const deckMixerMatch = url.pathname.match(/^\/api\/dj\/mixxx\/deck\/(1|2)\/mixer\/(gain|eq-high|eq-mid|eq-low|filter|volume|pfl|mute)$/);
    const sharedMixerMatch = url.pathname.match(/^\/api\/dj\/mixxx\/mixer\/(crossfader|master-volume)$/);
    if (deckMixerMatch || sharedMixerMatch) {
      if (typeof data.value !== "number" || !Number.isFinite(data.value) || data.value < 0 || data.value > 1)
        return json(res, 400, { error: "value must be a finite number from 0 to 1" });
      const names: Record<string, keyof typeof MIXXX_M2_MESSAGES> = {
        "1:gain": "deck1Gain", "1:eq-high": "deck1EqHigh", "1:eq-mid": "deck1EqMid",
        "1:eq-low": "deck1EqLow", "1:filter": "deck1Filter", "1:volume": "deck1Volume", "1:pfl": "deck1Pfl",
        "2:gain": "deck2Gain", "2:eq-high": "deck2EqHigh", "2:eq-mid": "deck2EqMid",
        "2:eq-low": "deck2EqLow", "2:filter": "deck2Filter", "2:volume": "deck2Volume", "2:pfl": "deck2Pfl",
        "1:mute": "deck1Mute", "2:mute": "deck2Mute",
        "shared:crossfader": "crossfader", "shared:master-volume": "masterVolume",
      };
      const key = deckMixerMatch ? `${deckMixerMatch[1]}:${deckMixerMatch[2]}` : `shared:${sharedMixerMatch![1]}`;
      return json(res, 200, { ok: true, bridge: bridge.send(names[key], encodeMidiUnit(data.value)) });
    }
    const tempoMatch = url.pathname.match(/^\/api\/dj\/mixxx\/deck\/(1|2)\/tempo\/(rate|range)$/);
    if (tempoMatch) {
      const deck = Number(tempoMatch[1]) as MixxxDeckNumber;
      if (typeof data.value !== "number" || !Number.isFinite(data.value))
        return json(res, 400, { error: "value must be finite" });
      if (tempoMatch[2] === "rate") {
        if (data.value < -1 || data.value > 1) return json(res, 400, { error: "rate must be from -1 to 1" });
        const raw = Math.max(0, Math.min(16383, Math.round(8192 + data.value * 8191)));
        return json(res, 200, { ok: true, bridge: bridge.sendM20Pair(deck, BRMEDIA_MIXXX_M20_CONTROLS.offsets.rateHigh, BRMEDIA_MIXXX_M20_CONTROLS.offsets.rateLow, raw) });
      }
      if (data.value < 0 || data.value > 1) return json(res, 400, { error: "range must be from 0 to 1" });
      return json(res, 200, { ok: true, bridge: bridge.sendM20Pair(deck, BRMEDIA_MIXXX_M20_CONTROLS.offsets.tempoRangeHigh, BRMEDIA_MIXXX_M20_CONTROLS.offsets.tempoRangeLow, Math.round(data.value * 16383)) });
    }
    const effectMatch = url.pathname.match(/^\/api\/dj\/mixxx\/deck\/(1|2)\/effect\/(enabled|mix|parameter-1)$/);
    if (effectMatch) {
      const deck = Number(effectMatch[1]) as MixxxDeckNumber, control = effectMatch[2];
      const value = control === "enabled" ? (data.enabled === true ? 127 : data.enabled === false ? 0 : null) :
        typeof data.value === "number" && Number.isFinite(data.value) && data.value >= 0 && data.value <= 1 ? encodeMidiUnit(data.value) : null;
      if (value === null) return json(res, 400, { error: control === "enabled" ? "enabled must be boolean" : "value must be from 0 to 1" });
      const offset = control === "enabled" ? BRMEDIA_MIXXX_M20_CONTROLS.offsets.fxEnabled :
        control === "mix" ? BRMEDIA_MIXXX_M20_CONTROLS.offsets.fxMix : BRMEDIA_MIXXX_M20_CONTROLS.offsets.fxParameter1;
      return json(res, 200, { ok: true, bridge: bridge.sendM20(deck, offset, value) });
    }
    return json(res, 404, { error: "Unknown Mixxx MIDI endpoint" });
  } catch (error) {
    return json(res, 409, { error: error instanceof Error ? error.message : String(error), bridge: bridge.status() });
  }
}
process.once("exit", () => mixxxMidiBridge.shutdown());
