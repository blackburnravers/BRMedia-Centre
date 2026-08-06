export type DjCompatibilityMode =
  | "legacy only"
  | "shared settings only"
  | "shared settings with legacy fallback"
  | "session-only override over shared default";

export type DjApplyMode =
  | "immediate-safe"
  | "next-track-load"
  | "next-session"
  | "page-reload-required"
  | "server-restart-required"
  | "planned/unavailable";

export interface DjLegacySource {
  kind:
    | "localStorage"
    | "sessionStorage"
    | "hard-coded"
    | "runtime"
    | "server-json"
    | "recording-manifest"
    | "grid-analysis"
    | "html-default";
  key: string;
  description: string;
}

export interface DjSectionCompatibility {
  section: string;
  mode: DjCompatibilityMode;
  applyMode: DjApplyMode;
  sources: readonly DjLegacySource[];
  supported: readonly string[];
  planned: readonly string[];
  safety: string;
}

export interface DjLegacyAdaptation {
  mapped: Record<string, unknown>;
  unknownLegacy: Record<string, unknown>;
}

const source = (
  kind: DjLegacySource["kind"],
  key: string,
  description: string,
): DjLegacySource => ({ kind, key, description });

export const DJ_SECTION_COMPATIBILITY: readonly DjSectionCompatibility[] = [
  {
    section: "studio",
    mode: "shared settings with legacy fallback",
    applyMode: "next-session",
    sources: [
      source("localStorage", "brmedia.djMixerRestart.mixSetup.v1", "Mix Setup form state."),
      source("localStorage", "brmedia.djMixerRestart.setPlan.v1", "Set Plan form and track state."),
      source("localStorage", "brmedia.djMixerRestart.checklist.v1", "Studio checklist state."),
      source("server-json", "server/data/dj-studio-state.json", "Server DJ Studio state."),
    ],
    supported: ["defaultView", "keepAwakeDuringSet"],
    planned: ["identity defaults", "event/location defaults", "private-note visibility", "Set Plan project defaults"],
    safety: "Never populates or changes active Mix Setup or Set Plan data.",
  },
  {
    section: "engine",
    mode: "shared settings with legacy fallback",
    applyMode: "page-reload-required",
    sources: [
      source("runtime", "BRMediaDjAudioEngine", "Native Web Audio graph and live deck nodes."),
      source("hard-coded", "engine/audio-engine.js", "Native engine safety and playback defaults."),
    ],
    supported: ["backend", "backgroundAudio"],
    planned: ["Mixxx bridge", "controller mappings"],
    safety: "brmedia-native remains active; mixxx activation is rejected.",
  },
  {
    section: "decks",
    mode: "session-only override over shared default",
    applyMode: "next-track-load",
    sources: [
      source("hard-coded", "app.js deck controller defaults", "Tempo, cue, lock and deck-page defaults."),
      source("html-default", "performance.html deck controls", "Deck colours, faders and transport defaults."),
      source("runtime", "BRMediaDjDeckController", "Loaded-track and live transport state."),
    ],
    supported: ["deck colours", "tempo range", "key lock", "digital tempo lock", "live BPM", "load lock", "cue", "vinyl", "default page"],
    planned: ["slip-mode default", "per-deck remembered preference"],
    safety: "Does not unload tracks or mutate an active deck.",
  },
  {
    section: "mixer",
    mode: "session-only override over shared default",
    applyMode: "next-session",
    sources: [
      source("html-default", "performance.html mixer ranges", "Neutral gain, EQ, fader and crossfader positions."),
      source("runtime", "native mixer controls", "Live gain, EQ, filter, fader, master and PFL values."),
      source("hard-coded", "app.js mixer reset handlers", "Double-tap and safety reset behaviour."),
    ],
    supported: ["gain/EQ/filter neutral", "fader curves", "crossfader", "master/headroom", "limiter", "compressor", "auto-gain", "meter warnings", "double-tap"],
    planned: ["persistent PFL default", "cue/master blend default"],
    safety: "Persistent values are future-session defaults and never reset live controls.",
  },
  {
    section: "waveform",
    mode: "session-only override over shared default",
    applyMode: "next-session",
    sources: [
      source("hard-coded", "app.js DJ_WAVEFORM_*", "Zoom levels, default zoom and palettes."),
      source("runtime", "waveform DOM datasets", "Live zoom and selected display palette."),
      source("server-json", "server/data/dj-prep-cache.json", "Prepared waveform/analysis assets."),
    ],
    supported: ["detail/DUO zoom", "spectral/transient display", "beat/bar/cue markers", "overview/minute markers", "render quality"],
    planned: ["configurable fixed-centre playhead"],
    safety: "Display defaults only; no renderer, extraction, preparation or cache code is called.",
  },
  {
    section: "grid",
    mode: "shared settings with legacy fallback",
    applyMode: "next-session",
    sources: [
      source("localStorage", "brmedia.dj.grid.metronome.v1", "Metronome level and deck."),
      source("hard-coded", "components/grid.js Grid Core v2", "BPM limits and pre-roll defaults."),
      source("grid-analysis", "saved track beatGrid records", "Manual, locked and analysed grid data."),
    ],
    supported: ["preference", "precision", "BPM range", "pre-roll", "metronome", "downbeats/bars"],
    planned: ["edit-range default", "grid-history retention"],
    safety: "Never reads or writes saved grid records and never invokes Grid Core.",
  },
  {
    section: "analysis",
    mode: "shared settings with legacy fallback",
    applyMode: "next-track-load",
    sources: [
      source("grid-analysis", "server/data/dj-prep-cache.json and saved track records", "Prepared BPM, waveform and confidence data."),
      source("hard-coded", "grid-analysis.js and spectral-waveform.js", "Current classification and analysis behaviour."),
    ],
    supported: ["digital tempo lock", "drift rescue", "review policy", "manual-edit lock"],
    planned: ["confidence threshold", "classification override", "analysis algorithm preference"],
    safety: "No reanalysis, prepared-asset invalidation or locked-grid mutation.",
  },
  {
    section: "sync",
    mode: "session-only override over shared default",
    applyMode: "next-session",
    sources: [
      source("hard-coded", "app.js DJ_SYNC_* constants", "Ramp, tolerance, correction and cooldown defaults."),
      source("runtime", "deck sync/master state", "Current sync enablement, master and follower state."),
    ],
    supported: ["enabled default", "mode", "master selection", "manual master", "ramp and tolerances"],
    planned: ["configurable follower activation"],
    safety: "Does not modify current sync, master or shared-play/shared-cue state.",
  },
  {
    section: "quantize",
    mode: "session-only override over shared default",
    applyMode: "next-session",
    sources: [
      source("runtime", "deck quantize state", "Current session quantize toggles."),
      source("hard-coded", "cue/loop/beat-jump handlers", "Current quantize scopes."),
    ],
    supported: ["enabled default", "cue", "hot cue", "memory cue", "loops", "beat jump"],
    planned: ["separate manual loop IN/OUT default"],
    safety: "Does not modify current quantize state.",
  },
  {
    section: "hotCues",
    mode: "session-only override over shared default",
    applyMode: "next-session",
    sources: [
      source("runtime", "deck cue-memory state", "Current cue pads and preview state."),
      source("grid-analysis", "saved cue data", "Track cue positions, labels and colours."),
    ],
    supported: ["quantize via quantize.hotCue", "marker visibility via waveform", "cue hold/preview via decks"],
    planned: ["colour strategy", "naming strategy"],
    safety: "Never reads, clears, renames or rewrites saved cues.",
  },
  {
    section: "memoryCues",
    mode: "session-only override over shared default",
    applyMode: "next-session",
    sources: [
      source("runtime", "deck cue-memory state", "Current memory navigation."),
      source("grid-analysis", "saved memory cue data", "Track memory positions and labels."),
    ],
    supported: ["quantize via quantize.memoryCue", "marker visibility via waveform"],
    planned: ["navigation wrapping", "naming strategy"],
    safety: "Never reads, clears or rewrites saved memory cues.",
  },
  {
    section: "loops",
    mode: "session-only override over shared default",
    applyMode: "next-session",
    sources: [
      source("hard-coded", "app.js DJ_LOOP_SIZE_VALUES", "Supported 1/512–512 beat loop sizes."),
      source("runtime", "deck loop state", "Active loop and manual IN/OUT positions."),
    ],
    supported: ["default length", "available lengths", "manual quantize"],
    planned: ["loop-resize policy", "clear-loop confirmation"],
    safety: "Does not change active loops.",
  },
  {
    section: "beatJump",
    mode: "session-only override over shared default",
    applyMode: "next-session",
    sources: [
      source("hard-coded", "app.js DJ_BEAT_JUMP_VALUES", "Supported 1–512 beat jump sizes."),
      source("runtime", "deck beat-jump state", "Current selected jump size."),
    ],
    supported: ["default size", "available sizes"],
    planned: ["beat-jump safety confirmation"],
    safety: "Does not move either active deck.",
  },
  {
    section: "fx",
    mode: "shared settings with legacy fallback",
    applyMode: "next-session",
    sources: [
      source("localStorage", "brmedia.dj.fx.target", "Last FX route."),
      source("localStorage", "brmedia.dj.fx.amount", "Last dry/wet amount."),
      source("localStorage", "brmedia.dj.fx.beat-index", "Last timing selection."),
      source("runtime", "FX performance runtime", "Active unit, route, timing and kill state."),
    ],
    supported: ["default unit/route/dry-wet/timing", "reset behaviour", "maximum dry-wet", "guaranteed kill"],
    planned: ["remember last unit selection"],
    safety: "Guaranteed kill remains invariant and no DSP or live FX state is touched.",
  },
  {
    section: "stems",
    mode: "shared settings with legacy fallback",
    applyMode: "next-session",
    sources: [
      source("runtime", "stems-performance.js", "Live original/stem-mix and stem levels."),
      source("server-json", "DJ stems jobs/cache", "Prepared stem status and cache records."),
      source("hard-coded", "stems-performance.js", "On-demand polling and four-stem defaults."),
    ],
    supported: ["enabled", "tool/model/device", "cache root/limit/retention", "one concurrent job"],
    planned: ["persistent stem levels", "persistent stem mute defaults", "queue policy UI"],
    safety: "On-demand only; never starts or deletes a stem job.",
  },
  {
    section: "recording",
    mode: "shared settings with legacy fallback",
    applyMode: "next-session",
    sources: [
      source("localStorage", "brmedia.djMixerRestart.recordSetup.v1", "Recording setup form."),
      source("runtime", "recording-performance.js recorder state", "Active recorder, chunks, pause and retry state."),
      source("recording-manifest", "server/data/dj-recordings/recordings-manifest.json", "Archive/finalisation records."),
    ],
    supported: ["countdown", "format", "sample rate/channels", "WAV/FLAC/MP3 defaults", "sidecars", "server finalisation", "recovery"],
    planned: ["VBR mode", "configurable chunks/retries", "default handoff"],
    safety: "Never starts, pauses, finalises or changes an active recording.",
  },
  {
    section: "recordingArchive",
    mode: "shared settings with legacy fallback",
    applyMode: "server-restart-required",
    sources: [
      source("server-json", "server/data/dj-recordings.json", "Recording archive state."),
      source("recording-manifest", "server/data/dj-recordings/recordings-manifest.json", "Permanent archive manifest."),
      source("runtime", "recording archive UI state", "Filter, polling and handoff display."),
    ],
    supported: ["archive root", "failure recovery visibility", "open Player after save", "minimum free space"],
    planned: ["session naming", "filter default", "library registration default", "handoff visibility"],
    safety: "Never moves, deletes, registers or rewrites archive files.",
  },
  {
    section: "audioRouting",
    mode: "shared settings only",
    applyMode: "planned/unavailable",
    sources: [
      source("runtime", "native Web Audio destination", "Current PC-only master output and PFL graph."),
    ],
    supported: ["pc-only"],
    planned: ["iPhone only", "PC + iPhone", "master stream", "cue/PFL stream", "latency and reconnection"],
    safety: "Non-PC routing is rejected and no streaming transport is implemented.",
  },
  {
    section: "performanceUi",
    mode: "shared settings with legacy fallback",
    applyMode: "next-session",
    sources: [
      source("runtime", "body data-dj-perf-view/tab", "Current performance page and tab."),
      source("html-default", "performance.html", "MAIN, DUO and phone-first viewport defaults."),
    ],
    supported: ["open behaviour", "library filters", "confirmations", "fullscreen/orientation", "single viewport/no scroll"],
    planned: ["top/bottom destination defaults", "search persistence", "meter animation preference"],
    safety: "The performance layout and live page remain untouched.",
  },
  {
    section: "library",
    mode: "shared settings with legacy fallback",
    applyMode: "next-session",
    sources: [
      source("localStorage", "brmedia.dj.performance.library.view.v1", "Sort, preparation and BPM filters."),
      source("runtime", "DJ library sheet state", "Search, collection and load actions."),
      source("server-json", "server/data/dj-prep-cache.json", "Prepared-track catalogue cache."),
    ],
    supported: ["sort", "preparation filter", "BPM filter via performanceUi"],
    planned: ["duration rule", "load confirmation", "batch-preparation confirmation", "collection display"],
    safety: "Never loads tracks, prepares batches or changes library records.",
  },
  {
    section: "setPlan",
    mode: "legacy only",
    applyMode: "planned/unavailable",
    sources: [
      source("localStorage", "brmedia.djMixerRestart.setPlan.v1", "Current lightweight Set Plan form."),
    ],
    supported: [],
    planned: ["real Set Plan project", "view/order preferences", "collection integration"],
    safety: "Current Set Plan data is never read or modified by Universal Settings.",
  },
  {
    section: "controllers",
    mode: "legacy only",
    applyMode: "planned/unavailable",
    sources: [],
    supported: [],
    planned: ["controller mappings and device preferences"],
    safety: "No controller integration is added.",
  },
  {
    section: "mixxx",
    mode: "shared settings only",
    applyMode: "planned/unavailable",
    sources: [],
    supported: ["future preference value in schema"],
    planned: ["Mixxx bridge", "controller mapping", "audio transport"],
    safety: "Schema accepts mixxx, but U6 rejects live selection.",
  },
] as const;

const SECTION_ALIASES: Readonly<Record<string, string>> = {
  defaultView: "studio.defaultView",
  keepAwakeDuringSet: "studio.keepAwakeDuringSet",
  backend: "engine.backend",
  detailZoom: "waveform.detailZoom",
  duoZoom: "waveform.duoZoom",
  metronomeLevel: "grid.metronomeLevel",
  metronomeDeck: "grid.metronomeDeck",
  enabledByDefault: "quantize.enabledByDefault",
  defaultLengthBeats: "loops.defaultLengthBeats",
  defaultBeats: "beatJump.defaultBeats",
  target: "fx.defaultTarget",
  amount: "fx.defaultDryWet",
  format: "recording.format",
  archiveRoot: "recordingArchive.root",
  sort: "performanceUi.librarySort",
  prep: "performanceUi.preparationFilter",
  bpm: "performanceUi.bpmFilter",
};

export function adaptLegacyDjSettings(legacy: Record<string, unknown>): DjLegacyAdaptation {
  const mapped: Record<string, unknown> = {};
  const unknownLegacy: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(legacy)) {
    const target = SECTION_ALIASES[key];
    if (target) mapped[target] = value;
    else unknownLegacy[key] = value;
  }
  return { mapped, unknownLegacy };
}

export function getDjCompatibility(): readonly DjSectionCompatibility[] {
  return DJ_SECTION_COMPATIBILITY;
}

export function getDjApplyMode(path: string): DjApplyMode {
  const section = path.split(".")[1] || path;
  return DJ_SECTION_COMPATIBILITY.find((entry) => entry.section === section)?.applyMode ??
    "next-session";
}
