import {
  BRMEDIA_MIXXX_FEEDBACK, BRMEDIA_MIXXX_MIXER_FEEDBACK, BRMEDIA_MIXXX_M5_PROTOCOL_VERSION,
  BRMEDIA_MIXXX_M20_FEEDBACK, BRMEDIA_MIXXX_PROTOCOL, BRMEDIA_MIXXX_M7_FEEDBACK, decodeMidiUnit,
} from "./mixxxProtocol";

export type MixxxDeckNumber = 1 | 2;
export interface MixxxDeckMixerState {
  gain: number | null; eqHigh: number | null; eqMid: number | null;
  eqLow: number | null; filter: number | null; volume: number | null;
  pfl: boolean | null; meter: number | null; clipping: boolean | null;
  mute: boolean | null;
  lastUpdatedAt: string | null; stale: boolean;
}
export interface MixxxSharedMixerState {
  crossfader: number | null; masterVolume: number | null;
  masterMeterLeft: number | null; masterMeterRight: number | null;
  masterClipping: boolean | null; lastUpdatedAt: string | null; stale: boolean;
}
export interface MixxxDeckLiveState {
  loaded: boolean | null; playing: boolean | null; cueActive: boolean | null;
  endOfTrack: boolean | null;
  title: string | null; artist: string | null; album: string | null;
  sourceIdentifier: string | null; durationSeconds: number | null;
  positionSeconds: number | null; positionNormalised: number | null;
  analysedBpm: number | null; liveBpm: number | null; rate: number | null;
  pitchRange: number | null; pitchPercentage: number | null;
  tempoRangePercentage: number | null; remainingSeconds: number | null;
  lastUpdatedAt: string | null; stale: boolean;
  mixer: MixxxDeckMixerState;
  performance: MixxxDeckPerformanceState;
}
export interface MixxxDeckPerformanceState {
  syncEnabled: boolean | null; syncLeader: boolean | null; follower: boolean | null;
  quantize: boolean | null; beatPosition: number | null; beatPhase: number | null;
  downbeat: number | null; beatAlignment: number | null; loopActive: boolean | null;
  loopSizeBeats: number | null; hotCues: Array<boolean | null>; memoryCues: null;
  keyCode: number | null; musicalKey: string | null; keylock: boolean | null;
  fxMix: number | null; fxEnabled: boolean | null; lastUpdatedAt: string | null; stale: boolean;
  fxParameter1: number | null; cuePositionNormalised: number | null;
  loopStartNormalised: number | null; loopEndNormalised: number | null;
  beatJumpSizeBeats: number | null; hotCueStates: Array<number | null>;
}
type PairName = "positionNormalised" | "durationSeconds" | "positionSeconds" |
  "analysedBpm" | "liveBpm" | "rate" | "pitchRange";
const pairOffsets: Record<number, [PairName, "high" | "low"]> = {
  1: ["positionNormalised", "high"], 2: ["positionNormalised", "low"],
  3: ["durationSeconds", "high"], 4: ["durationSeconds", "low"],
  5: ["positionSeconds", "high"], 6: ["positionSeconds", "low"],
  7: ["analysedBpm", "high"], 8: ["analysedBpm", "low"],
  9: ["liveBpm", "high"], 10: ["liveBpm", "low"],
  11: ["rate", "high"], 12: ["rate", "low"],
  13: ["pitchRange", "high"], 14: ["pitchRange", "low"],
};
const emptyDeckMixer = (): MixxxDeckMixerState => ({
  gain: null, eqHigh: null, eqMid: null, eqLow: null, filter: null,
  volume: null, pfl: null, meter: null, clipping: null, mute: null,
  lastUpdatedAt: null, stale: true,
});
const emptySharedMixer = (): MixxxSharedMixerState => ({
  crossfader: null, masterVolume: null, masterMeterLeft: null,
  masterMeterRight: null, masterClipping: null, lastUpdatedAt: null, stale: true,
});
const emptyPerformance = (): MixxxDeckPerformanceState => ({
  syncEnabled: null, syncLeader: null, follower: null, quantize: null,
  beatPosition: null, beatPhase: null, downbeat: null, beatAlignment: null,
  loopActive: null, loopSizeBeats: null, hotCues: Array(8).fill(null), memoryCues: null,
  keyCode: null, musicalKey: null, keylock: null, fxMix: null, fxEnabled: null,
  fxParameter1: null, cuePositionNormalised: null, loopStartNormalised: null,
  loopEndNormalised: null, beatJumpSizeBeats: null, hotCueStates: Array(8).fill(null),
  lastUpdatedAt: null, stale: true,
});
function emptyDeck(): MixxxDeckLiveState {
  return {
    loaded: null, playing: null, cueActive: null, endOfTrack: null, title: null, artist: null,
    album: null, sourceIdentifier: null, durationSeconds: null,
    positionSeconds: null, positionNormalised: null, analysedBpm: null,
    liveBpm: null, rate: null, pitchRange: null, pitchPercentage: null,
    tempoRangePercentage: null, remainingSeconds: null, lastUpdatedAt: null,
    stale: true, mixer: emptyDeckMixer(), performance: emptyPerformance(),
  };
}
export function sanitiseMixxxMetadata(value: unknown, maxBytes = 96): string | null {
  if (typeof value !== "string") return null;
  const clean = value.replace(/[\u0000-\u001f\u007f-\u009f]/g, " ").replace(/\s+/g, " ").trim();
  if (!clean) return null;
  let output = "";
  for (const character of clean) {
    const candidate = output + character;
    if (Buffer.byteLength(candidate, "utf8") > maxBytes) break;
    output = candidate;
  }
  return output || null;
}
export function sanitiseMixxxSourceIdentifier(value: unknown): string | null {
  const clean = sanitiseMixxxMetadata(value);
  if (!clean) return null;
  return sanitiseMixxxMetadata(clean.split(/[\\/]/).filter(Boolean).pop() || clean, 96);
}
export class MixxxLiveState {
  private decks: Record<MixxxDeckNumber, MixxxDeckLiveState> = { 1: emptyDeck(), 2: emptyDeck() };
  private mixer: MixxxSharedMixerState = emptySharedMixer();
  private pairs: Record<MixxxDeckNumber, Partial<Record<PairName, { high?: number; low?: number }>>> = { 1: {}, 2: {} };
  private pendingDeckMessages: Record<MixxxDeckNumber, Array<[number, number]>> = { 1: [], 2: [] };
  private professionalPairs: Record<MixxxDeckNumber, Record<string, { high?: number; low?: number }>> = { 1: {}, 2: {} };
  private lastFeedbackMs: number | null = null;
  private lastHeartbeatMs: number | null = null;
  private protocolVersion: number | null = null;
  private snapshotSequence: Record<MixxxDeckNumber, number | null> = { 1: null, 2: null };
  private activeEpoch = 0;
  private sessionActive = false;
  private enforceSnapshotOrdering = false;
  constructor(private readonly now: () => number = Date.now, private readonly staleAfterMs = 5000) {}
  beginSession(epoch: number) {
    if (!Number.isSafeInteger(epoch) || epoch <= this.activeEpoch) return false;
    this.activeEpoch = epoch;
    this.sessionActive = true;
    this.enforceSnapshotOrdering = true;
    this.resetSessionState();
    return true;
  }
  private resetSessionState() {
    this.decks = { 1: emptyDeck(), 2: emptyDeck() };
    this.mixer = emptySharedMixer();
    this.pairs = { 1: {}, 2: {} };
    this.pendingDeckMessages = { 1: [], 2: [] };
    this.professionalPairs = { 1: {}, 2: {} };
    this.lastFeedbackMs = null;
    this.lastHeartbeatMs = null;
    this.protocolVersion = null;
    this.snapshotSequence = { 1: null, 2: null };
  }
  private touch(deck?: MixxxDeckNumber, mixer = false) {
    const timestamp = this.now();
    this.lastFeedbackMs = timestamp;
    if (deck) this.decks[deck].lastUpdatedAt = new Date(timestamp).toISOString();
    if (deck && mixer) this.decks[deck].mixer.lastUpdatedAt = new Date(timestamp).toISOString();
    if (!deck && mixer) this.mixer.lastUpdatedAt = new Date(timestamp).toISOString();
  }
  private setPair(deckNumber: MixxxDeckNumber, name: PairName, part: "high" | "low", value: number) {
    const pair = this.pairs[deckNumber][name] || {};
    pair[part] = value & 0x7f; this.pairs[deckNumber][name] = pair;
    if (pair.high === undefined || pair.low === undefined) return;
    const raw = (pair.high << 7) | pair.low, deck = this.decks[deckNumber];
    if (name === "positionNormalised") deck.positionNormalised = Math.max(0, Math.min(1, raw / 16383));
    else if (name === "durationSeconds") deck.durationSeconds = raw ? raw / 10 : null;
    else if (name === "positionSeconds") deck.positionSeconds = Math.max(0, raw / 10);
    else if (name === "analysedBpm") deck.analysedBpm = raw ? raw / 10 : null;
    else if (name === "liveBpm") deck.liveBpm = raw ? raw / 10 : null;
    else if (name === "rate") deck.rate = (raw - 8192) / 8191;
    else if (name === "pitchRange") deck.pitchRange = raw / 4096;
  }
  private receivePerformance(control: number, value: number): boolean {
    const f = BRMEDIA_MIXXX_M7_FEEDBACK;
    let deck: MixxxDeckNumber | null = null, offset = -1;
    if (control >= f.deck1Base && control < f.deck1Base + 0x20) { deck = 1; offset = control - f.deck1Base; }
    else if (control >= f.deck2Base && control < f.deck2Base + 0x20) { deck = 2; offset = control - f.deck2Base; }
    if (!deck) return false;
    const state = this.decks[deck].performance, o = f.offsets;
    if (offset === o.syncEnabled) state.syncEnabled = value > 0;
    else if (offset === o.syncLeader) state.syncLeader = value > 0;
    else if (offset === o.quantize) state.quantize = value > 0;
    else if (offset === o.loopActive) state.loopActive = value > 0;
    else if (offset === o.loopSize) state.loopSizeBeats = value ? Math.pow(2, (value - 64) / 8) : null;
    else if (offset === o.beatPhase) { state.beatPhase = decodeMidiUnit(value); state.beatAlignment = Math.min(state.beatPhase, 1 - state.beatPhase); }
    else if (offset === o.beatIndexHigh || offset === o.beatIndexLow) {
      const pair = (this.pairs[deck] as any).beatIndex || {}; pair[offset === o.beatIndexHigh ? "high" : "low"] = value;
      (this.pairs[deck] as any).beatIndex = pair;
      if (pair.high !== undefined && pair.low !== undefined) state.beatPosition = (pair.high << 7) | pair.low;
    } else if (offset === o.keyCode) state.keyCode = value || null;
    else if (offset === o.keylock) state.keylock = value > 0;
    else if (offset === o.fxMix) state.fxMix = decodeMidiUnit(value);
    else if (offset === o.fxEnabled) state.fxEnabled = value > 0;
    else if (offset >= o.hotcueBase && offset < o.hotcueBase + 8) state.hotCues[offset - o.hotcueBase] = value > 0;
    else return false;
    state.follower = state.syncEnabled === null || state.syncLeader === null ? null : state.syncEnabled && !state.syncLeader;
    const timestamp = this.now(); state.lastUpdatedAt = new Date(timestamp).toISOString(); this.touch(deck); return true;
  }
  private receiveMixer(control: number, value: number): boolean {
    const f = BRMEDIA_MIXXX_MIXER_FEEDBACK, unit = decodeMidiUnit(value);
    const deckFields: Record<number, [MixxxDeckNumber, keyof MixxxDeckMixerState, "unit" | "bool"]> = {
      [f.deck1Gain]: [1, "gain", "unit"], [f.deck1EqHigh]: [1, "eqHigh", "unit"],
      [f.deck1EqMid]: [1, "eqMid", "unit"], [f.deck1EqLow]: [1, "eqLow", "unit"],
      [f.deck1Filter]: [1, "filter", "unit"], [f.deck1Volume]: [1, "volume", "unit"],
      [f.deck1Pfl]: [1, "pfl", "bool"], [f.deck1Meter]: [1, "meter", "unit"],
      [f.deck1Clipping]: [1, "clipping", "bool"],
      [f.deck2Gain]: [2, "gain", "unit"], [f.deck2EqHigh]: [2, "eqHigh", "unit"],
      [f.deck2EqMid]: [2, "eqMid", "unit"], [f.deck2EqLow]: [2, "eqLow", "unit"],
      [f.deck2Filter]: [2, "filter", "unit"], [f.deck2Volume]: [2, "volume", "unit"],
      [f.deck2Pfl]: [2, "pfl", "bool"], [f.deck2Meter]: [2, "meter", "unit"],
      [f.deck2Clipping]: [2, "clipping", "bool"],
      [f.deck1Mute]: [1, "mute", "bool"], [f.deck2Mute]: [2, "mute", "bool"],
    };
    const deckField = deckFields[control];
    if (deckField) {
      const [deck, field, kind] = deckField;
      (this.decks[deck].mixer as any)[field] = kind === "bool" ? value > 0 : unit;
      this.touch(deck, true); return true;
    }
    const sharedFields: Record<number, [keyof MixxxSharedMixerState, "unit" | "bool"]> = {
      [f.crossfader]: ["crossfader", "unit"], [f.masterVolume]: ["masterVolume", "unit"],
      [f.masterMeterLeft]: ["masterMeterLeft", "unit"], [f.masterMeterRight]: ["masterMeterRight", "unit"],
      [f.masterClipping]: ["masterClipping", "bool"],
    };
    const shared = sharedFields[control];
    if (!shared) return false;
    (this.mixer as any)[shared[0]] = shared[1] === "bool" ? value > 0 : unit;
    this.touch(undefined, true); return true;
  }
  private receiveProfessional(control: number, value: number): boolean {
    const f = BRMEDIA_MIXXX_M20_FEEDBACK;
    let deck: MixxxDeckNumber | null = null, offset = -1;
    if (control >= f.deck1Base && control < f.deck1Base + 0x20) { deck = 1; offset = control - f.deck1Base; }
    else if (control >= f.deck2Base && control < f.deck2Base + 0x20) { deck = 2; offset = control - f.deck2Base; }
    if (!deck) return false;
    const state = this.decks[deck].performance, o = f.offsets;
    const pairField = (name: "cue" | "loopStart" | "loopEnd", part: "high" | "low") => {
      const pair = this.professionalPairs[deck][name] || {};
      pair[part] = value; this.professionalPairs[deck][name] = pair;
      if (pair.high === undefined || pair.low === undefined) return;
      const decoded = ((pair.high << 7) | pair.low) / 16383;
      if (name === "cue") state.cuePositionNormalised = decoded;
      else if (name === "loopStart") state.loopStartNormalised = decoded;
      else state.loopEndNormalised = decoded;
    };
    if (offset === o.cuePositionHigh) pairField("cue", "high");
    else if (offset === o.cuePositionLow) pairField("cue", "low");
    else if (offset === o.loopStartHigh) pairField("loopStart", "high");
    else if (offset === o.loopStartLow) pairField("loopStart", "low");
    else if (offset === o.loopEndHigh) pairField("loopEnd", "high");
    else if (offset === o.loopEndLow) pairField("loopEnd", "low");
    else if (offset === o.beatJumpSize)
      state.beatJumpSizeBeats = value ? Math.pow(2, (value - 64) / 8) : null;
    else if (offset === o.mute) this.decks[deck].mixer.mute = value > 0;
    else if (offset === o.fxParameter1) state.fxParameter1 = decodeMidiUnit(value);
    else if (offset >= o.hotcueStateBase && offset < o.hotcueStateBase + 8)
      state.hotCueStates[offset - o.hotcueStateBase] = value;
    else return false;
    const timestamp = this.now();
    state.lastUpdatedAt = new Date(timestamp).toISOString();
    this.touch(deck, offset === o.mute);
    return true;
  }
  private applyDeckMessage(deckNumber: MixxxDeckNumber, offset: number, value: number) {
    const deck = this.decks[deckNumber];
    if (offset === 0) {
      deck.loaded = Boolean(value & BRMEDIA_MIXXX_FEEDBACK.flags.loaded);
      deck.playing = Boolean(value & BRMEDIA_MIXXX_FEEDBACK.flags.playing);
      deck.cueActive = value & BRMEDIA_MIXXX_FEEDBACK.flags.cueVerified ? Boolean(value & BRMEDIA_MIXXX_FEEDBACK.flags.cueActive) : null;
      deck.endOfTrack = Boolean(value & BRMEDIA_MIXXX_FEEDBACK.flags.endOfTrack);
      if (!deck.loaded) {
        const mixer = deck.mixer;
        this.decks[deckNumber] = { ...emptyDeck(), loaded: false, playing: false, cueActive: null, endOfTrack: false, mixer };
        this.pairs[deckNumber] = {};
      }
    } else if (pairOffsets[offset]) {
      const [name, part] = pairOffsets[offset]; this.setPair(deckNumber, name, part, value);
    }
  }
  private acceptSnapshot(deckNumber: MixxxDeckNumber, sequence: number) {
    const previous = this.snapshotSequence[deckNumber];
    const distance = previous === null ? 1 : (sequence - previous + 128) & 0x7f;
    if (distance === 0 || distance > 64) {
      this.pendingDeckMessages[deckNumber] = [];
      return false;
    }
    for (const [offset, value] of this.pendingDeckMessages[deckNumber])
      this.applyDeckMessage(deckNumber, offset, value);
    this.pendingDeckMessages[deckNumber] = [];
    this.snapshotSequence[deckNumber] = sequence;
    this.touch(deckNumber);
    return true;
  }
  receive(message: number[], epoch?: number): boolean {
    if (epoch === undefined) {
      if (this.activeEpoch === 0) {
        this.activeEpoch = 1;
        this.sessionActive = true;
      }
      epoch = this.activeEpoch;
    }
    if (!this.sessionActive || !Number.isSafeInteger(epoch) || epoch <= 0 || epoch !== this.activeEpoch) return false;
    if (!Array.isArray(message) || message.some(value => !Number.isInteger(value) || value < 0 || value > 255)) return false;
    if (message[0] === 0xf0) return this.receiveMetadata(message);
    if (message.length !== 3 || message[1] > 0x7f || message[2] > 0x7f) return false;
    if ((message[0] & 0xff) === BRMEDIA_MIXXX_M7_FEEDBACK.status) return this.receivePerformance(message[1] & 0x7f, message[2] & 0x7f);
    if ((message[0] & 0xff) === BRMEDIA_MIXXX_M20_FEEDBACK.status) return this.receiveProfessional(message[1] & 0x7f, message[2] & 0x7f);
    if ((message[0] & 0xff) === BRMEDIA_MIXXX_MIXER_FEEDBACK.status)
      return this.receiveMixer(message[1] & 0x7f, message[2] & 0x7f);
    if ((message[0] & 0xf0) !== 0x90) return false;
    const control = message[1] & 0x7f, value = message[2] & 0x7f;
    if (control === BRMEDIA_MIXXX_FEEDBACK.heartbeat[1]) {
      this.lastHeartbeatMs = this.now(); this.touch(); return true;
    }
    if (control === BRMEDIA_MIXXX_FEEDBACK.protocolVersion[1]) {
      this.protocolVersion = value; this.touch(); return true;
    }
    if (control >= 0x70 && control <= 0x7f) { this.touch(); return true; }
    let deckNumber: MixxxDeckNumber | null = null, offset = -1;
    if (control >= 0x30 && control <= 0x3f) { deckNumber = 1; offset = control - 0x30; }
    if (control >= 0x40 && control <= 0x4f) { deckNumber = 2; offset = control - 0x40; }
    if (!deckNumber) return false;
    if (!this.enforceSnapshotOrdering) {
      if (offset === BRMEDIA_MIXXX_FEEDBACK.offsets.snapshotSequence)
        this.snapshotSequence[deckNumber] = value;
      else this.applyDeckMessage(deckNumber, offset, value);
      this.touch(deckNumber);
      return true;
    }
    if (offset === BRMEDIA_MIXXX_FEEDBACK.offsets.snapshotSequence)
      return this.acceptSnapshot(deckNumber, value);
    this.pendingDeckMessages[deckNumber].push([offset, value]);
    return true;
  }
  private receiveMetadata(message: number[]): boolean {
    const spec = BRMEDIA_MIXXX_FEEDBACK.metadataSysex;
    if (message.length < 11 || message[message.length - 1] !== spec.end ||
      message[1] !== spec.manufacturer || !spec.signature.every((value, index) => message[index + 2] === value)) return false;
    const version = message[5], deckNumber = message[6], field = message[7];
    if (version < BRMEDIA_MIXXX_M5_PROTOCOL_VERSION || version > BRMEDIA_MIXXX_PROTOCOL.version ||
      (deckNumber !== 1 && deckNumber !== 2)) return false;
    const nibbles = message.slice(10, -1);
    if (nibbles.length % 2 || nibbles.some(value => value < 0 || value > 15)) return false;
    const bytes = Buffer.alloc(nibbles.length / 2);
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = (nibbles[index * 2] << 4) | nibbles[index * 2 + 1];
    const value = sanitiseMixxxMetadata(bytes.toString("utf8"), spec.maxUtf8Bytes);
    const names: Record<number, "title" | "artist" | "album" | "sourceIdentifier"> = {
      [spec.fields.title]: "title", [spec.fields.artist]: "artist",
      [spec.fields.album]: "album", [spec.fields.sourceIdentifier]: "sourceIdentifier",
    };
    if (!names[field]) return false;
    this.decks[deckNumber as MixxxDeckNumber][names[field]] = names[field] === "sourceIdentifier" ? sanitiseMixxxSourceIdentifier(value) : value;
    this.touch(deckNumber as MixxxDeckNumber); return true;
  }
  markDisconnected(epoch = this.activeEpoch) {
    if (epoch !== this.activeEpoch) return false;
    this.sessionActive = false;
    this.resetSessionState();
    return true;
  }
  snapshot(bridgeConnected: boolean) {
    const timestamp = this.now();
    const feedbackStale = !bridgeConnected || this.lastFeedbackMs === null || timestamp - this.lastFeedbackMs > this.staleAfterMs;
    const heartbeatHealthy = bridgeConnected && this.lastHeartbeatMs !== null && timestamp - this.lastHeartbeatMs <= this.staleAfterMs;
    const stale = feedbackStale || !heartbeatHealthy;
    const cloneDeck = (deck: MixxxDeckLiveState) => ({
      ...deck,
      pitchPercentage: deck.rate === null ? null : deck.rate * 100,
      tempoRangePercentage: deck.pitchRange === null ? null : deck.pitchRange * 100,
      remainingSeconds: deck.durationSeconds === null || deck.positionSeconds === null
        ? null : Math.max(0, deck.durationSeconds - deck.positionSeconds),
      stale: stale || deck.lastUpdatedAt === null,
      mixer: { ...deck.mixer, stale: stale || deck.mixer.lastUpdatedAt === null },
      performance: { ...deck.performance, hotCues: [...deck.performance.hotCues],
        hotCueStates: [...deck.performance.hotCueStates], stale: stale || deck.performance.lastUpdatedAt === null },
    });
    return {
      sessionEpoch: this.activeEpoch,
      snapshotSequence: { ...this.snapshotSequence },
      protocolVersion: this.protocolVersion,
      protocolCompatible: this.protocolVersion !== null &&
        this.protocolVersion >= BRMEDIA_MIXXX_M5_PROTOCOL_VERSION &&
        this.protocolVersion <= BRMEDIA_MIXXX_PROTOCOL.version,
      bridgeConnected, heartbeatHealthy, feedbackAvailable: this.lastFeedbackMs !== null,
      lastFeedbackAt: this.lastFeedbackMs === null ? null : new Date(this.lastFeedbackMs).toISOString(),
      stale, deck1: cloneDeck(this.decks[1]), deck2: cloneDeck(this.decks[2]),
      syncMasterDeck: this.decks[1].performance.syncLeader === true ? 1 :
        this.decks[2].performance.syncLeader === true ? 2 : null,
      mixer: { ...this.mixer, stale: stale || this.mixer.lastUpdatedAt === null },
    };
  }
  deck(deckNumber: MixxxDeckNumber, bridgeConnected: boolean) {
    return this.snapshot(bridgeConnected)[deckNumber === 1 ? "deck1" : "deck2"];
  }
}
