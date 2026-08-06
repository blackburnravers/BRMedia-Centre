import { DEFAULT_SETTINGS } from "./defaults";
import { RestartRequirement } from "./types";

export type SettingValueType = "boolean" | "integer" | "number" | "string" | "array";

export interface SettingMetadata {
  path: string;
  type: SettingValueType;
  defaultValue: unknown;
  allowedValues?: readonly unknown[];
  minimum?: number;
  maximum?: number;
  restartRequired: RestartRequirement;
  pageReloadRequired: boolean;
  sensitive: boolean;
  label: string;
  description: string;
  module: string;
  section: string;
}

type MetadataOverride = Partial<
  Omit<SettingMetadata, "path" | "defaultValue" | "module" | "section">
>;

const ENUMS: Readonly<Record<string, readonly unknown[]>> = {
  "schemaVersion": [1],
  "universal.theme": ["system", "dark"],
  "universal.density": ["comfortable", "compact"],
  "universal.defaultLandingModule": ["home", "audio-player", "video-player", "dj-studio"],
  "server.httpsMode": ["existing", "disabled"],
  "server.tailscaleStatus": ["detect", "disabled"],
  "library.duplicatePolicy": ["keep-both", "skip", "replace"],
  "audioPlayer.repeatMode": ["off", "all", "one"],
  "audioPlayer.waveformDisplayMode": ["bars", "smooth"],
  "videoPlayer.preloadMode": ["none", "metadata", "auto"],
  "videoPlayer.aspectRatio": ["auto", "16:9", "4:3"],
  "videoPlayer.objectFit": ["contain", "cover", "fill"],
  "videoPlayer.defaultDeleteMode": ["library", "physical"],
  "converter.defaultPreset": ["mp3-320", "wav", "flac", "extract-audio", "mp4-fast"],
  "converter.audioFormat": ["mp3", "wav", "flac", "m4a", "aac", "ogg"],
  "converter.audioBitrate": ["128k", "192k", "256k", "320k"],
  "converter.channels": ["source", "1", "2"],
  "converter.sampleRate": ["source", "44100", "48000", "88200", "96000"],
  "converter.videoFormat": ["mp4", "webm", "mov"],
  "converter.encoderPreset": ["ultrafast", "veryfast", "fast", "medium", "slow"],
  "tagger.defaultOpenTab": ["main", "brmedia", "artwork", "save"],
  "tagger.defaultReleaseType": ["Mix", "Radio Show", "Free Song", "DJ MP3", "Master", "Other"],
  "tagger.defaultTracklistStatus": ["None", "Uploaded", "Auto scanned", "Needs review", "Complete"],
  "tagger.defaultSaveMode": ["sidecar", "copy", "download"],
  "tagger.artworkEmbedMode": ["keep", "replace", "clear"],
  "mastering.defaultPreset": ["streaming-clean", "club-loud", "warm-depth", "hardcore-punch"],
  "mastering.compression": ["gentle", "medium", "hard"],
  "mastering.outputFormat": ["wav", "flac", "mp3", "m4a"],
  "mastering.outputBitrate": ["128k", "192k", "256k", "320k"],
  "mastering.sampleRate": ["source", "44100", "48000", "88200", "96000"],
  "dj.studio.defaultView": ["studio", "recordings"],
  "dj.engine.backend": ["brmedia-native", "mixxx"],
  "dj.decks.deck1Colour": ["orange"],
  "dj.decks.deck2Colour": ["blue"],
  "dj.decks.liveBpmMode": ["whole-bpm", "precision"],
  "dj.decks.defaultPage": ["main", "hot-cue", "memory-cue", "grid", "stems"],
  "dj.mixer.channelFaderCurve": ["linear"],
  "dj.mixer.crossfaderCurve": ["linear-plateau"],
  "dj.waveform.palette": ["blue", "rgb", "threeband", "brmedia"],
  "dj.waveform.renderQuality": ["auto", "high", "balanced", "mobile"],
  "dj.grid.preference": ["auto", "normal", "dynamic"],
  "dj.grid.metronomeLevel": ["off", "low", "medium", "high"],
  "dj.grid.metronomeDeck": ["d1", "d2"],
  "dj.analysis.reviewPolicy": ["flag-low-confidence", "always", "never"],
  "dj.sync.mode": ["beat", "bpm"],
  "dj.sync.masterSelection": ["automatic-first-active", "manual"],
  "dj.fx.defaultTarget": ["d1", "d2", "both"],
  "dj.stems.devicePreference": ["auto", "cpu", "cuda"],
  "dj.recording.format": ["wav", "flac", "mp3"],
  "dj.recording.sampleRate": ["engine", "44100", "48000"],
  "dj.recording.channels": ["1", "2"],
  "dj.recording.wavBitDepth": ["16", "24", "32-float"],
  "dj.recording.flacBitDepth": ["16", "24"],
  "dj.recording.flacCompression": ["fast", "balanced", "maximum"],
  "dj.recording.mp3Bitrate": ["128", "192", "256", "320"],
  "dj.audioRouting.mode": ["pc-only", "iphone-only", "pc-and-iphone"],
  "dj.audioRouting.reconnectPolicy": ["manual", "automatic"],
  "dj.performanceUi.openBehavior": ["always-main", "remember-last-page"],
  "dj.performanceUi.librarySort": ["title-asc", "title-desc", "bpm-asc", "bpm-desc"],
  "dj.performanceUi.preparationFilter": ["all", "prepared", "review-required"],
  "dj.performanceUi.bpmFilter": ["all", "known", "unknown"],
  "dj.performanceUi.fullscreenPreference": ["manual", "request-on-open"],
  "dj.performanceUi.orientationPreference": ["auto", "portrait", "landscape"],
};

const LIMITS: Readonly<Record<string, readonly [number, number]>> = {
  "metadata.revision": [0, Number.MAX_SAFE_INTEGER],
  "server.port": [1, 65535],
  "storage.minimumFreeBytes": [0, Number.MAX_SAFE_INTEGER],
  "storage.cacheMaximumBytes": [0, Number.MAX_SAFE_INTEGER],
  "storage.temporaryRetentionHours": [0, 87600],
  "audioPlayer.playbackRate": [0.25, 4],
  "audioPlayer.skipBackSeconds": [1, 600],
  "audioPlayer.skipForwardSeconds": [1, 600],
  "audioPlayer.eqPreampDb": [-24, 24],
  "audioPlayer.waveformPeakCount": [64, 100000],
  "videoPlayer.playbackRate": [0.25, 4],
  "videoPlayer.skipSeconds": [1, 600],
  "converter.crf": [0, 63],
  "converter.historyLimit": [0, 10000],
  "tagger.artworkMaximumSize": [64, 10000],
  "mastering.targetLufs": [-30, -5],
  "mastering.truePeakDbtp": [-12, 0],
  "mastering.stereoWidth": [0, 2],
  "torrents.downloadLimitKb": [0, Number.MAX_SAFE_INTEGER],
  "torrents.uploadLimitKb": [0, Number.MAX_SAFE_INTEGER],
  "torrents.cacheSizeMb": [0, 1048576],
  "notifications.historyLimit": [0, 100000],
  "backup.retentionCount": [1, 50],
  "diagnostics.recentEventLimit": [1, 10000],
  "diagnostics.healthCacheSeconds": [10, 3600],
  "diagnostics.toolCheckTimeoutMs": [250, 10000],
  "diagnostics.storageWarningFreePercent": [1, 50],
  "diagnostics.storageCriticalFreePercent": [0, 25],
  "diagnostics.logSummaryLineLimit": [1, 500],
  "diagnostics.automaticRefreshSeconds": [0, 86400],
  "backup.auditHistoryLimit": [10, 500],
  "dj.decks.minimumPlaybackRate": [0.25, 1],
  "dj.decks.maximumPlaybackRate": [1, 4],
  "dj.mixer.channelGainNeutralPercent": [0, 150],
  "dj.mixer.channelGainMaximumPercent": [100, 200],
  "dj.mixer.eqNeutralPercent": [0, 150],
  "dj.mixer.eqCutDb": [-96, 0],
  "dj.mixer.eqBoostDb": [0, 24],
  "dj.mixer.eqKillDb": [-120, 0],
  "dj.mixer.filterNeutral": [0, 100],
  "dj.mixer.crossfaderCutWidthPercent": [0, 100],
  "dj.mixer.crossfaderDefaultPosition": [0, 100],
  "dj.mixer.masterLevelPercent": [0, 150],
  "dj.mixer.headroomDb": [-24, 0],
  "dj.mixer.meterPeakHoldMs": [0, 10000],
  "dj.mixer.doubleTapWindowMs": [100, 1000],
  "dj.waveform.detailZoom": [1, 1024],
  "dj.waveform.duoZoom": [1, 1024],
  "dj.waveform.stemsZoom": [1, 1024],
  "dj.waveform.mobileMaximumPoints": [96, 10000],
  "dj.waveform.smoothingPasses": [0, 10],
  "dj.grid.precisionMs": [1, 1000],
  "dj.grid.minimumBpm": [20, 400],
  "dj.grid.maximumBpm": [20, 400],
  "dj.grid.preRollSeconds": [0, 60],
  "dj.sync.liveBpmRampMs": [0, 5000],
  "dj.sync.phaseLockToleranceMs": [0, 1000],
  "dj.sync.phaseReleaseToleranceMs": [0, 1000],
  "dj.sync.mediumCorrectionMs": [0, 2000],
  "dj.sync.hardCorrectionMs": [0, 5000],
  "dj.sync.hardCooldownMs": [0, 30000],
  "dj.sync.lateLaunchWindowMs": [0, 1000],
  "dj.loops.defaultLengthBeats": [1 / 512, 512],
  "dj.beatJump.defaultBeats": [1, 512],
  "dj.fx.defaultDryWet": [0, 1],
  "dj.fx.defaultTimingBeats": [1 / 128, 32],
  "dj.fx.maximumDryWet": [0, 1],
  "dj.stems.cacheMaximumBytes": [0, Number.MAX_SAFE_INTEGER],
  "dj.stems.retentionDays": [0, 3650],
  "dj.stems.concurrentJobs": [1, 16],
  "dj.recording.countdownSeconds": [0, 60],
  "dj.recordingArchive.minimumFreeBytes": [0, Number.MAX_SAFE_INTEGER],
};

const OVERRIDES: Readonly<Record<string, MetadataOverride>> = {
  "audioPlayer.playbackRate": { type: "number" },
  "videoPlayer.playbackRate": { type: "number" },
  "server.host": { restartRequired: "server-restart" },
  "server.port": { restartRequired: "server-restart" },
  "server.publicBaseUrl": { restartRequired: "server-restart" },
  "storage.temporaryRoot": { restartRequired: "server-restart" },
  "storage.cacheRoot": { restartRequired: "server-restart" },
  "storage.recordingTemporaryRoot": { restartRequired: "server-restart" },
  "storage.recordingArchiveRoot": { restartRequired: "server-restart" },
  "storage.logsRoot": { restartRequired: "server-restart" },
  "server.rangeStreaming": { restartRequired: "server-restart" },
  "dj.engine.backend": {
    label: "Default mixer engine",
    description: "Choose BRMedia Native now or the future optional Mixxx backend.",
    restartRequired: "mixer-restart",
    pageReloadRequired: true,
  },
  "dj.decks.keyLockDefault": { restartRequired: "page-reload", pageReloadRequired: true },
  "dj.audioRouting.mode": { restartRequired: "mixer-restart", pageReloadRequired: true },
  "dj.fx.killAlwaysForcesDry": {
    label: "Guaranteed FX kill",
    description: "Safety invariant: killing FX must always restore the dry signal.",
  },
  "dj.performanceUi.preserveSingleViewport": {
    label: "Preserve single viewport",
    description: "Safety invariant for the phone-first performance layout.",
  },
  "dj.performanceUi.allowMainPageScroll": {
    label: "Allow main page scrolling",
    description: "Must remain off to preserve the performance mixer layout.",
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function valueType(value: unknown): SettingValueType {
  if (Array.isArray(value)) return "array";
  if (typeof value === "number") return Number.isInteger(value) ? "integer" : "number";
  if (typeof value === "boolean") return "boolean";
  return "string";
}

function humanise(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/^./, (character) => character.toUpperCase());
}

function ownership(path: string): { module: string; section: string } {
  const parts = path.split(".");
  return {
    module: parts[0] || "settings",
    section: parts.length > 2 ? parts[1] : "general",
  };
}

function buildMetadata(value: unknown, path = "", output: Record<string, SettingMetadata> = {}): Record<string, SettingMetadata> {
  if (isRecord(value)) {
    Object.entries(value).forEach(([key, child]) => {
      buildMetadata(child, path ? `${path}.${key}` : key, output);
    });
    return output;
  }

  const owner = ownership(path);
  const pathParts = path.split(".");
  const leafName = pathParts[pathParts.length - 1] || path;
  const limits = LIMITS[path];
  const override = OVERRIDES[path];
  const label = override?.label || humanise(leafName);

  output[path] = {
    path,
    type: valueType(value),
    defaultValue: value,
    allowedValues: ENUMS[path],
    minimum: limits?.[0],
    maximum: limits?.[1],
    restartRequired: "none",
    pageReloadRequired: false,
    sensitive: false,
    label,
    description: override?.description || `Default ${label.toLowerCase()} for ${humanise(owner.module)} ${humanise(owner.section)}.`,
    module: owner.module,
    section: owner.section,
    ...override,
  };

  return output;
}

export const SETTINGS_METADATA: Readonly<Record<string, SettingMetadata>> =
  Object.freeze(buildMetadata(DEFAULT_SETTINGS));

export function getSettingMetadata(path: string): SettingMetadata | undefined {
  return SETTINGS_METADATA[path];
}
