/** Versioned semantic protocol used by the guarded Mixxx bridge. */
export const BRMEDIA_MIXXX_PROTOCOL = {
  name: "BRMediaMixxx",
  version: 5,
  midiChannel: 1,
  feedbackMidiChannel: 2,
  ranges: {
    deck1Transport: [0x10, 0x1f],
    deck2Transport: [0x20, 0x2f],
    deck1State: [0x30, 0x3f],
    deck2State: [0x40, 0x4f],
    sharedMixerControls: [0x50, 0x51],
    deck1MixerControls: [0x52, 0x58],
    deck2MixerControls: [0x59, 0x5f],
    meteringFeedback: [0x60, 0x66],
    acknowledgements: [0x70, 0x77],
    futurePerformanceControls: [0x78, 0x7f],
    m7PerformanceOutbound: [0x00, 0x2f],
    m7PerformanceFeedback: [0x30, 0x6f],
    m20ProfessionalOutbound: [0x00, 0x3f],
    m20ProfessionalFeedback: [0x00, 0x3f],
  },
} as const;

/** Additive API-side schema reserved for a reviewed Mixxx arbitrary-load provider.
 * It is deliberately not assigned to MIDI while the runtime cannot carry opaque identities. */
export const BRMEDIA_MIXXX_LOAD_EXTENSION = {
  version: 1,
  transport: "brmedia-api",
  executableProvider: "engine-load-track-v1",
  requestFields: ["protocolVersion", "sourceSession", "requestId", "commandSequence", "deck",
    "catalogueIdentity", "catalogueRevision", "autoplay", "replacePlayingDeck", "clientGeneration"],
  acknowledgementFields: ["requestId", "deck", "accepted", "state", "stableIdentity", "mixxxSessionEpoch",
    "feedbackSequence", "clientGeneration", "errorCode", "message"],
  errorCodes: ["TRACK_NOT_FOUND", "FILE_MISSING", "PATH_OUTSIDE_ROOT", "PATH_ESCAPE", "UNSUPPORTED_CODEC",
    "DECK_PLAYING", "STALE_REQUEST", "BRIDGE_UNHEALTHY", "NATIVE_AUTHORITY", "UNSUPPORTED_RUNTIME",
    "LOAD_TIMEOUT", "MIXXX_LOAD_FAILURE", "IDENTITY_MISMATCH", "SESSION_CHANGED"],
  invariants: { autoplay: false, replacePlayingDeckDefault: false, browserPathInput: false },
} as const;

export const BRMEDIA_MIXXX_LOAD_SYSEX = {
  start: 0xf0,
  manufacturer: 0x7d,
  signature: [0x42, 0x52, 0x4d],
  request: 0x20,
  acknowledgement: 0x21,
  end: 0xf7,
  capability: [0x90, 0x73, 0x01],
  shortAcknowledgement: { deck1: 0x74, deck2: 0x75 },
  maxPayloadBytes: 2048,
  states: { accepted: 1, loaded: 2, failed: 3, rejectedPlaying: 4 },
} as const;

export const BRMEDIA_MIXXX_M4_PROTOCOL_VERSION = 1;
export const BRMEDIA_MIXXX_M5_PROTOCOL_VERSION = 2;
export const BRMEDIA_MIXXX_M6_PROTOCOL_VERSION = 3;
export const BRMEDIA_MIXXX_M7_PROTOCOL_VERSION = 4;
export const BRMEDIA_MIXXX_M12_PROTOCOL_VERSION = 5;

export const BRMEDIA_MIXXX_M7_CONTROLS = {
  status: 0xb2,
  deck1Sync: 0x00, deck1Quantize: 0x01, deck1LoopIn: 0x02, deck1LoopOut: 0x03,
  deck1Reloop: 0x04, deck1AutoLoop: 0x05, deck1LoopSize: 0x06,
  deck1BeatJumpBack: 0x07, deck1BeatJumpForward: 0x08, deck1HotcueBase: 0x10,
  deck2Sync: 0x20, deck2Quantize: 0x21, deck2LoopIn: 0x22, deck2LoopOut: 0x23,
  deck2Reloop: 0x24, deck2AutoLoop: 0x25, deck2LoopSize: 0x26,
  deck2BeatJumpBack: 0x27, deck2BeatJumpForward: 0x28, deck2HotcueBase: 0x30,
  deck1SeekHigh: 0x09, deck1SeekLow: 0x0a, deck2SeekHigh: 0x29, deck2SeekLow: 0x2a,
} as const;

export const BRMEDIA_MIXXX_M7_FEEDBACK = {
  status: 0xb3, deck1Base: 0x00, deck2Base: 0x20,
  offsets: { syncEnabled: 0, syncLeader: 1, quantize: 2, loopActive: 3,
    loopSize: 4, beatPhase: 5, beatIndexHigh: 6, beatIndexLow: 7,
    keyCode: 8, keylock: 9, fxMix: 10, fxEnabled: 11, hotcueBase: 16 },
} as const;

export const BRMEDIA_MIXXX_FEEDBACK = {
  heartbeat: [0x90, 0x70],
  protocolVersion: [0x90, 0x71],
  snapshotAcknowledgement: [0x90, 0x72],
  deck1Base: 0x30,
  deck2Base: 0x40,
  offsets: {
    flags: 0, positionNormalisedHigh: 1, positionNormalisedLow: 2,
    durationDecisecondsHigh: 3, durationDecisecondsLow: 4,
    positionDecisecondsHigh: 5, positionDecisecondsLow: 6,
    analysedBpmTenthsHigh: 7, analysedBpmTenthsLow: 8,
    liveBpmTenthsHigh: 9, liveBpmTenthsLow: 10,
    rateSignedHigh: 11, rateSignedLow: 12,
    pitchRangeHigh: 13, pitchRangeLow: 14, snapshotSequence: 15,
  },
  flags: { loaded: 1, playing: 2, cueVerified: 4, cueActive: 8, endOfTrack: 16 },
  metadataSysex: {
    start: 0xf0, manufacturer: 0x7d, signature: [0x42, 0x52, 0x4d],
    fields: { title: 1, artist: 2, album: 3, sourceIdentifier: 4 },
    end: 0xf7, maxUtf8Bytes: 96,
  },
} as const;

export const BRMEDIA_MIXXX_MIXER_CONTROLS = {
  crossfader: [0xb0, 0x50], masterVolume: [0xb0, 0x51],
  deck1Gain: [0xb0, 0x52], deck1EqHigh: [0xb0, 0x53],
  deck1EqMid: [0xb0, 0x54], deck1EqLow: [0xb0, 0x55],
  deck1Filter: [0xb0, 0x56], deck1Volume: [0xb0, 0x57], deck1Pfl: [0xb0, 0x58],
  deck2Gain: [0xb0, 0x59], deck2EqHigh: [0xb0, 0x5a],
  deck2EqMid: [0xb0, 0x5b], deck2EqLow: [0xb0, 0x5c],
  deck2Filter: [0xb0, 0x5d], deck2Volume: [0xb0, 0x5e], deck2Pfl: [0xb0, 0x5f],
  deck1Mute: [0xb0, 0x67], deck2Mute: [0xb0, 0x68],
} as const;

export const BRMEDIA_MIXXX_MIXER_FEEDBACK = {
  status: 0xb1,
  crossfader: 0x50, masterVolume: 0x51,
  deck1Gain: 0x52, deck1EqHigh: 0x53, deck1EqMid: 0x54,
  deck1EqLow: 0x55, deck1Filter: 0x56, deck1Volume: 0x57, deck1Pfl: 0x58,
  deck2Gain: 0x59, deck2EqHigh: 0x5a, deck2EqMid: 0x5b,
  deck2EqLow: 0x5c, deck2Filter: 0x5d, deck2Volume: 0x5e, deck2Pfl: 0x5f,
  deck1Meter: 0x60, deck1Clipping: 0x61,
  deck2Meter: 0x62, deck2Clipping: 0x63,
  masterMeterLeft: 0x64, masterMeterRight: 0x65, masterClipping: 0x66,
  deck1Mute: 0x67, deck2Mute: 0x68,
} as const;

export const BRMEDIA_MIXXX_M20_CONTROLS = {
  status: 0xb4, deck1Base: 0x00, deck2Base: 0x20,
  offsets: {
    cueReturn: 0, cueSet: 1, loopHalve: 2, loopDouble: 3,
    beatJumpSize: 4, hotcueSet: 5, hotcueTrigger: 6, hotcueClear: 7,
    syncEnabled: 8, rateHigh: 9, rateLow: 10, tempoRangeHigh: 11,
    tempoRangeLow: 12, mute: 13, fxEnabled: 14, fxMix: 15, fxParameter1: 16,
  },
} as const;

export const BRMEDIA_MIXXX_M20_FEEDBACK = {
  status: 0xb5, deck1Base: 0x00, deck2Base: 0x20,
  offsets: {
    cuePositionHigh: 0, cuePositionLow: 1, beatJumpSize: 2, mute: 3,
    fxParameter1: 4, loopStartHigh: 5, loopStartLow: 6,
    loopEndHigh: 7, loopEndLow: 8, hotcueStateBase: 16,
  },
} as const;

export const BRMEDIA_MIXXX_MESSAGES = {
  deck1Play: [0x90, 0x10],
  deck1Cue: [0x90, 0x11],
  deck1Pause: [0x90, 0x12],
  deck1Stop: [0x90, 0x13],
  deck1Unload: [0x90, 0x14],
  deck2Play: [0x90, 0x20],
  deck2Cue: [0x90, 0x21],
  deck2Pause: [0x90, 0x22],
  deck2Stop: [0x90, 0x23],
  deck2Unload: [0x90, 0x24],
  ...BRMEDIA_MIXXX_MIXER_CONTROLS,
  heartbeat: [0x90, 0x70],
  protocolVersion: [0x90, 0x71],
} as const;

export function clampMidiUnit(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.min(1, numeric)) : 0;
}

export function encodeMidiUnit(value: unknown): number {
  return Math.round(clampMidiUnit(value) * 127);
}

export function decodeMidiUnit(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.min(127, numeric)) / 127 : 0;
}

/** UI 0..150 controls use 100 as neutral; Mixxx parameters use 0.5 as neutral. */
export function uiBoostToWire(value: unknown): number {
  const numeric = Number(value);
  return clampMidiUnit((Number.isFinite(numeric) ? numeric : 100) / 150);
}

export function wireToUiBoost(value: unknown): number {
  return clampMidiUnit(value) * 150;
}
