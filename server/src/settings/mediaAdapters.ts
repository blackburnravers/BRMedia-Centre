import {
  AudioPlayerSettings,
  ConverterSettings,
  MasteringSettings,
  TaggerSettings,
  TorrentSettings,
  VideoPlayerSettings,
} from "./types";

export type MediaSettingsModule =
  | "audioPlayer"
  | "videoPlayer"
  | "converter"
  | "tagger"
  | "mastering"
  | "torrents";

export interface LegacySettingsSource {
  kind: "localStorage" | "server-json" | "hard-coded" | "runtime";
  key: string;
  description: string;
  sensitive?: boolean;
}

export interface MediaModuleCompatibility {
  module: MediaSettingsModule;
  runtimeMode: "shared-defaults-with-legacy-runtime";
  sources: readonly LegacySettingsSource[];
  activeSettings: readonly string[];
  plannedSettings: readonly string[];
  notes: readonly string[];
}

export interface LegacyAdaptation<T> {
  mapped: Partial<T>;
  unknownLegacy: Record<string, unknown>;
}

const inventories: Readonly<Record<MediaSettingsModule, MediaModuleCompatibility>> = {
  audioPlayer: {
    module: "audioPlayer",
    runtimeMode: "shared-defaults-with-legacy-runtime",
    sources: [
      { kind: "localStorage", key: "brmedia_settings_v2", description: "Player preferences and EQ defaults." },
      { kind: "localStorage", key: "brmedia_track_progress_v1", description: "Remembered track position." },
      { kind: "localStorage", key: "brmedia_mini_collapsed_v1", description: "MiniPlayer collapsed state." },
      { kind: "localStorage", key: "brmedia_queue_v1 and related keys", description: "Queue, favourites, recents and playlists." },
      { kind: "server-json", key: "server/data/player-runtime-state.json", description: "Server player runtime state." },
      { kind: "hard-coded", key: "server/public/player/app.js DEFAULTS", description: "Stable player fallback defaults." },
    ],
    activeSettings: [
      "saveState", "savePosition", "autoplay", "shuffle", "repeatMode", "playbackRate",
      "skipBackSeconds", "skipForwardSeconds", "backgroundAudio", "mediaSessionControls",
      "eqEnabled", "eqPreset", "eqPreampDb",
    ],
    plannedSettings: [
      "defaultVolume", "ReplayGain", "crossfade", "gapless playback",
      "default output device", "playback quality",
    ],
    notes: ["EQ and MiniPlayer runtime behaviour remains unchanged in U5."],
  },
  videoPlayer: {
    module: "videoPlayer",
    runtimeMode: "shared-defaults-with-legacy-runtime",
    sources: [
      { kind: "localStorage", key: "brmedia_video_settings_v1", description: "Video preferences." },
      { kind: "localStorage", key: "video resume/bookmark keys", description: "Resume and continue-watching state." },
      { kind: "hard-coded", key: "server/public/video-player/app.js VIDEO_SETTINGS_DEFAULTS", description: "Stable video fallback defaults." },
    ],
    activeSettings: [
      "resumeEnabled", "saveProgress", "autoplayNextPart", "playbackRate", "skipSeconds",
      "preloadMode", "aspectRatio", "objectFit", "subtitlesEnabled", "subtitlesDefaultOn",
      "subtitleLanguage", "pictureInPicture", "defaultDeleteMode", "confirmPhysicalDelete",
    ],
    plannedSettings: [
      "defaultVolume", "preferred audio track", "fullscreen on open",
      "poster visibility", "preferred audio language",
    ],
    notes: ["Playback behaviour changes only when the module adopts an explicitly saved shared default."],
  },
  converter: {
    module: "converter",
    runtimeMode: "shared-defaults-with-legacy-runtime",
    sources: [
      { kind: "localStorage", key: "brmedia_converter_settings_v1", description: "Converter defaults and job UI preferences." },
      { kind: "hard-coded", key: "server/public/converter/app.js CONVERTER_SETTINGS_DEFAULTS", description: "Stable conversion defaults." },
      { kind: "runtime", key: "converter form/job state", description: "Current job-only values." },
    ],
    activeSettings: [
      "defaultPreset", "outputName", "audioFormat", "audioBitrate", "channels",
      "sampleRate", "videoFormat", "crf", "encoderPreset", "normalizeAudio",
      "fastStart", "addToLibrary", "batchSequential", "historyLimit",
    ],
    plannedSettings: [
      "output folder", "overwrite policy", "hardware acceleration",
      "preserve artwork", "frame rate", "resolution",
    ],
    notes: ["U5 does not alter presets or FFmpeg command construction."],
  },
  tagger: {
    module: "tagger",
    runtimeMode: "shared-defaults-with-legacy-runtime",
    sources: [
      { kind: "localStorage", key: "brmedia_tagger_settings_v1", description: "Tagger workflow defaults." },
      { kind: "hard-coded", key: "server/public/tagger/app.js TAGGER_SETTINGS_DEFAULTS", description: "Stable tagging defaults." },
      { kind: "runtime", key: "tagger editor state", description: "Unsaved tag and artwork edits." },
    ],
    activeSettings: [
      "defaultOpenTab", "defaultCategory", "defaultReleaseType", "defaultTracklistStatus",
      "defaultSaveMode", "warnBeforeReplace", "autoSaveSidecarBeforeWrite",
      "preserveExistingAdvanced", "artworkEmbedMode", "artworkMaximumSize",
    ],
    plannedSettings: [
      "rename template", "case formatting", "filename parsing", "album artist rules",
      "default save location", "backup-before-write",
    ],
    notes: ["No tags, sidecars, artwork or media files are written by this adapter."],
  },
  mastering: {
    module: "mastering",
    runtimeMode: "shared-defaults-with-legacy-runtime",
    sources: [
      { kind: "hard-coded", key: "server/public/mastering/app.js presets", description: "Mastering form and preset defaults." },
      { kind: "runtime", key: "mastering form state", description: "Current preview/export choices." },
      { kind: "runtime", key: "server mastering processor defaults", description: "Server processing request fallbacks." },
    ],
    activeSettings: [
      "defaultPreset", "targetLufs", "truePeakDbtp", "compression", "stereoWidth",
      "outputFormat", "outputBitrate", "sampleRate", "outputName", "preserveMetadata",
    ],
    plannedSettings: [
      "bit depth", "dither", "normalisation mode", "limiter controls",
      "preview quality", "output location",
    ],
    notes: ["Processing algorithms and chains remain unchanged in U5."],
  },
  torrents: {
    module: "torrents",
    runtimeMode: "shared-defaults-with-legacy-runtime",
    sources: [
      { kind: "server-json", key: "server/data/torrent-state.json", description: "qBittorrent integration and torrent runtime configuration.", sensitive: true },
      { kind: "hard-coded", key: "server/src/index.ts torrent defaults", description: "qBittorrent connection and storage fallbacks.", sensitive: true },
      { kind: "localStorage", key: "torrent browser alert preference", description: "Browser notification preference." },
    ],
    activeSettings: [
      "engineEnabled", "engineUrl", "savePath", "downloadLimitKb", "uploadLimitKb",
      "schedulerEnabled", "cacheEnabled", "cacheSizeMb", "scanTorrentFiles",
      "scanDownloadedFiles", "blockSuspiciousFiles", "quarantineFolder",
      "magnetLinks", "protocolEncryption", "completionNotifications",
    ],
    plannedSettings: [
      "credential replacement", "default category", "ratio and seeding policy",
      "completed-download action", "automatic qBittorrent configuration",
    ],
    notes: ["Credentials remain in the legacy server integration and are never returned by this adapter."],
  },
};

export function getMediaModuleCompatibility(): readonly MediaModuleCompatibility[] {
  return Object.values(inventories);
}

export function getMediaCompatibility(module: MediaSettingsModule): MediaModuleCompatibility {
  return inventories[module];
}

function adapt<T>(
  legacy: Record<string, unknown>,
  aliases: Readonly<Record<string, keyof T>>,
): LegacyAdaptation<T> {
  const mapped: Partial<T> = {};
  const unknownLegacy: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(legacy)) {
    const target = aliases[key];
    if (target) {
      mapped[target] = value as T[keyof T];
    } else {
      unknownLegacy[key] = value;
    }
  }
  return { mapped, unknownLegacy };
}

export function adaptLegacyMediaSettings(
  module: "audioPlayer",
  legacy: Record<string, unknown>,
): LegacyAdaptation<AudioPlayerSettings>;
export function adaptLegacyMediaSettings(
  module: "videoPlayer",
  legacy: Record<string, unknown>,
): LegacyAdaptation<VideoPlayerSettings>;
export function adaptLegacyMediaSettings(
  module: "converter",
  legacy: Record<string, unknown>,
): LegacyAdaptation<ConverterSettings>;
export function adaptLegacyMediaSettings(
  module: "tagger",
  legacy: Record<string, unknown>,
): LegacyAdaptation<TaggerSettings>;
export function adaptLegacyMediaSettings(
  module: "mastering",
  legacy: Record<string, unknown>,
): LegacyAdaptation<MasteringSettings>;
export function adaptLegacyMediaSettings(
  module: "torrents",
  legacy: Record<string, unknown>,
): LegacyAdaptation<TorrentSettings>;
export function adaptLegacyMediaSettings(
  module: MediaSettingsModule,
  legacy: Record<string, unknown>,
): LegacyAdaptation<
  AudioPlayerSettings | VideoPlayerSettings | ConverterSettings |
  TaggerSettings | MasteringSettings | TorrentSettings
> {
  const aliases: Record<MediaSettingsModule, Readonly<Record<string, string>>> = {
    audioPlayer: {
      saveState: "saveState", savePos: "savePosition", autoplay: "autoplay",
      shuffle: "shuffle", repeatMode: "repeatMode", playbackRate: "playbackRate",
      skipBackSec: "skipBackSeconds", skipFwdSec: "skipForwardSeconds",
      backgroundAudio: "backgroundAudio", mediaSessionControls: "mediaSessionControls",
      eqEnabled: "eqEnabled", eqPreset: "eqPreset", eqPreamp: "eqPreampDb",
    },
    videoPlayer: {
      resumeEnabled: "resumeEnabled", saveProgress: "saveProgress",
      autoplayNextPart: "autoplayNextPart", playbackRate: "playbackRate",
      skipSeconds: "skipSeconds", preloadMode: "preloadMode", aspectRatio: "aspectRatio",
      objectFit: "objectFit", subtitlesEnabled: "subtitlesEnabled",
      subtitlesDefaultOn: "subtitlesDefaultOn", subtitleLanguage: "subtitleLanguage",
      pipEnabled: "pictureInPicture", defaultDeleteMode: "defaultDeleteMode",
      confirmPhysicalDelete: "confirmPhysicalDelete",
    },
    converter: {
      defaultPresetKey: "defaultPreset", defaultOutputName: "outputName",
      defaultAudioFormat: "audioFormat", defaultAudioBitrate: "audioBitrate",
      defaultChannels: "channels", defaultSampleRate: "sampleRate",
      defaultVideoFormat: "videoFormat", defaultCrf: "crf", defaultPreset: "encoderPreset",
      normalizeAudio: "normalizeAudio", fastStart: "fastStart", addToLibrary: "addToLibrary",
      batchSequential: "batchSequential", historyLimit: "historyLimit",
    },
    tagger: {
      defaultOpenTab: "defaultOpenTab", defaultCategory: "defaultCategory",
      defaultReleaseType: "defaultReleaseType", defaultTracklistStatus: "defaultTracklistStatus",
      defaultSaveMode: "defaultSaveMode", warnBeforeReplace: "warnBeforeReplace",
      autoSaveSidecarBeforeWrite: "autoSaveSidecarBeforeWrite",
      preserveExistingAdvanced: "preserveExistingAdvanced",
      artworkEmbedMode: "artworkEmbedMode", artworkMaxSize: "artworkMaximumSize",
    },
    mastering: {
      defaultPreset: "defaultPreset", targetLufs: "targetLufs", truePeakDbtp: "truePeakDbtp",
      compression: "compression", stereoWidth: "stereoWidth", outputFormat: "outputFormat",
      outputBitrate: "outputBitrate", sampleRate: "sampleRate", outputName: "outputName",
      preserveMetadata: "preserveMetadata",
    },
    torrents: {
      enabled: "engineEnabled", baseUrl: "engineUrl", savePath: "savePath",
      downloadLimitKb: "downloadLimitKb", uploadLimitKb: "uploadLimitKb",
      schedulerEnabled: "schedulerEnabled", cacheEnabled: "cacheEnabled",
      cacheSizeMb: "cacheSizeMb", scanTorrentFiles: "scanTorrentFiles",
      scanDownloadedFiles: "scanDownloadedFiles", blockSuspiciousFiles: "blockSuspiciousFiles",
      quarantineFolder: "quarantineFolder", magnetLinks: "magnetLinks",
      protocolEncryption: "protocolEncryption", completionNotifications: "completionNotifications",
    },
  };
  return adapt(legacy, aliases[module] as Readonly<Record<string, never>>);
}

export function redactLegacyTorrentCredentials(
  legacy: Record<string, unknown>,
): Record<string, unknown> {
  const redacted = { ...legacy };
  for (const key of ["password", "token", "apiKey", "cookie"]) {
    if (key in redacted) redacted[key] = "[REDACTED]";
  }
  return redacted;
}
