export const BRMEDIA_SETTINGS_SCHEMA_VERSION = 1 as const;

export type MixerEngine = "brmedia-native" | "mixxx";
export type RestartRequirement =
  | "none"
  | "page-reload"
  | "mixer-restart"
  | "server-restart";

export interface SettingsDocumentMetadata {
  createdAt: string;
  updatedAt: string;
  revision: number;
  migratedFrom?: number;
  migrationId?: string;
}

export interface UniversalSettings {
  theme: "system" | "dark";
  density: "comfortable" | "compact";
  reducedMotion: boolean;
  defaultLandingModule: "home" | "audio-player" | "video-player" | "dj-studio";
  restoreLastModule: boolean;
  warnUnsavedChanges: boolean;
}

export interface ServerSettings {
  host: string;
  port: number;
  publicBaseUrl: string;
  rangeStreaming: boolean;
  trustedProxy: boolean;
  httpsMode: "existing" | "disabled";
  tailscaleStatus: "detect" | "disabled";
}

export interface StorageSettings {
  approvedRoots: string[];
  temporaryRoot: string;
  cacheRoot: string;
  recordingTemporaryRoot: string;
  recordingArchiveRoot: string;
  logsRoot: string;
  minimumFreeBytes: number;
  cacheMaximumBytes: number;
  temporaryRetentionHours: number;
}

export interface LibrarySourcePreference {
  id: string;
  label: string;
  path: string;
  type: "audio" | "video" | "both";
  enabled: boolean;
  includeSubfolders: boolean;
}

export interface LibrarySettings {
  audioRoots: string[];
  videoRoots: string[];
  sources: LibrarySourcePreference[];
  scanOnStartup: boolean;
  watchEnabled: boolean;
  includeSubfolders: boolean;
  duplicatePolicy: "keep-both" | "skip" | "replace";
}

export interface AudioPlayerSettings {
  saveState: boolean;
  savePosition: boolean;
  autoplay: boolean;
  shuffle: boolean;
  repeatMode: "off" | "all" | "one";
  playbackRate: number;
  skipBackSeconds: number;
  skipForwardSeconds: number;
  backgroundAudio: boolean;
  mediaSessionControls: boolean;
  eqEnabled: boolean;
  eqPreset: string;
  eqPreampDb: number;
  waveformPeakCount: number;
  waveformDisplayMode: "bars" | "smooth";
  waveformAllowSeeking: boolean;
}

export interface VideoPlayerSettings {
  resumeEnabled: boolean;
  saveProgress: boolean;
  autoplayNextPart: boolean;
  playbackRate: number;
  skipSeconds: number;
  preloadMode: "none" | "metadata" | "auto";
  aspectRatio: "auto" | "16:9" | "4:3";
  objectFit: "contain" | "cover" | "fill";
  subtitlesEnabled: boolean;
  subtitlesDefaultOn: boolean;
  subtitleLanguage: string;
  pictureInPicture: boolean;
  defaultDeleteMode: "library" | "physical";
  confirmPhysicalDelete: boolean;
}

export interface ConverterSettings {
  defaultPreset: "mp3-320" | "wav" | "flac" | "extract-audio" | "mp4-fast";
  outputName: string;
  audioFormat: "mp3" | "wav" | "flac" | "m4a" | "aac" | "ogg";
  audioBitrate: "128k" | "192k" | "256k" | "320k";
  channels: "source" | "1" | "2";
  sampleRate: "source" | "44100" | "48000" | "88200" | "96000";
  videoFormat: "mp4" | "webm" | "mov";
  crf: number;
  encoderPreset: "ultrafast" | "veryfast" | "fast" | "medium" | "slow";
  normalizeAudio: boolean;
  fastStart: boolean;
  addToLibrary: boolean;
  batchSequential: boolean;
  historyLimit: number;
}

export interface TaggerSettings {
  defaultOpenTab: "main" | "brmedia" | "artwork" | "save";
  defaultCategory: string;
  defaultReleaseType: "Mix" | "Radio Show" | "Free Song" | "DJ MP3" | "Master" | "Other";
  defaultTracklistStatus: "None" | "Uploaded" | "Auto scanned" | "Needs review" | "Complete";
  defaultSaveMode: "sidecar" | "copy" | "download";
  warnBeforeReplace: boolean;
  autoSaveSidecarBeforeWrite: boolean;
  preserveExistingAdvanced: boolean;
  artworkEmbedMode: "keep" | "replace" | "clear";
  artworkMaximumSize: number;
}

export interface MasteringSettings {
  defaultPreset: "streaming-clean" | "club-loud" | "warm-depth" | "hardcore-punch";
  targetLufs: number;
  truePeakDbtp: number;
  compression: "gentle" | "medium" | "hard";
  stereoWidth: number;
  outputFormat: "wav" | "flac" | "mp3" | "m4a";
  outputBitrate: "128k" | "192k" | "256k" | "320k";
  sampleRate: "source" | "44100" | "48000" | "88200" | "96000";
  outputName: string;
  preserveMetadata: boolean;
}

export interface TorrentSettings {
  engineEnabled: boolean;
  engineUrl: string;
  savePath: string;
  downloadLimitKb: number;
  uploadLimitKb: number;
  schedulerEnabled: boolean;
  cacheEnabled: boolean;
  cacheSizeMb: number;
  scanTorrentFiles: boolean;
  scanDownloadedFiles: boolean;
  blockSuspiciousFiles: boolean;
  quarantineFolder: string;
  magnetLinks: boolean;
  protocolEncryption: boolean;
  completionNotifications: boolean;
}

export interface ProfileSettings {
  autoRestoreDevicePreferences: boolean;
  syncAllowedSettingsOnly: boolean;
  includeLocalUiState: boolean;
}

export interface NotificationSettings {
  inAppEnabled: boolean;
  browserEnabled: boolean;
  completionEnabled: boolean;
  warningEnabled: boolean;
  historyLimit: number;
}

export interface BackupSettings {
  includeUnknownSettings: boolean;
  redactPathsOnExport: boolean;
  automaticBackupEnabled: boolean;
  automaticBackupBeforeImport: boolean;
  automaticBackupBeforeReset: boolean;
  automaticBackupBeforeRestore: boolean;
  retentionCount: number;
  backupLocation: string;
  auditHistoryLimit: number;
}

export interface DiagnosticsSettings {
  includePathStatus: boolean;
  includeToolStatus: boolean;
  redactLocalPaths: boolean;
  recentEventLimit: number;
  healthCacheSeconds: number;
  toolCheckTimeoutMs: number;
  storageWarningFreePercent: number;
  storageCriticalFreePercent: number;
  logSummaryLineLimit: number;
  showTechnicalDetails: boolean;
  automaticRefreshSeconds: number;
}

export interface DjStudioSettings {
  defaultView: "studio" | "recordings";
  keepAwakeDuringSet: boolean;
}

export interface DjEngineSettings {
  backend: MixerEngine;
  backgroundAudio: boolean;
  mixxxEnabled: boolean;
  mixxxMidiPort: string;
}

export interface DjDeckSettings {
  deck1Colour: "orange";
  deck2Colour: "blue";
  minimumPlaybackRate: number;
  maximumPlaybackRate: number;
  keyLockDefault: boolean;
  digitalTempoLockDefault: boolean;
  liveBpmMode: "whole-bpm" | "precision";
  loadLockWhilePlaying: boolean;
  cuePreviewWhileHeld: boolean;
  cueReturnOnRelease: boolean;
  cueSnapToGrid: boolean;
  vinylDeck1Enabled: boolean;
  vinylDeck2Enabled: boolean;
  defaultPage: "main" | "hot-cue" | "memory-cue" | "grid" | "stems";
}

export interface DjMixerSettings {
  channelGainNeutralPercent: number;
  channelGainMaximumPercent: number;
  eqNeutralPercent: number;
  eqCutDb: number;
  eqBoostDb: number;
  eqKillDb: number;
  filterNeutral: number;
  channelFaderCurve: "linear";
  crossfaderCurve: "linear-plateau";
  crossfaderCutWidthPercent: number;
  crossfaderDefaultPosition: number;
  masterLevelPercent: number;
  headroomDb: number;
  limiterEnabled: boolean;
  compressorEnabled: boolean;
  autoGainEnabled: boolean;
  meterPeakHoldMs: number;
  clippingWarningEnabled: boolean;
  doubleTapReset: boolean;
  doubleTapWindowMs: number;
}

export interface DjWaveformSettings {
  detailZoom: number;
  duoZoom: number;
  stemsZoom: number;
  palette: "blue" | "rgb" | "threeband" | "brmedia";
  showSpectralBands: boolean;
  transientEmphasis: boolean;
  showBeats: boolean;
  showBars: boolean;
  showCueMarkers: boolean;
  showMemoryMarkers: boolean;
  showOverview: boolean;
  showMinuteMarkers: boolean;
  renderQuality: "auto" | "high" | "balanced" | "mobile";
  mobileMaximumPoints: number;
  smoothingPasses: number;
}

export interface DjGridSettings {
  preference: "auto" | "normal" | "dynamic";
  precisionMs: number;
  minimumBpm: number;
  maximumBpm: number;
  preRollSeconds: number;
  metronomeLevel: "off" | "low" | "medium" | "high";
  metronomeDeck: "d1" | "d2";
  showDownbeats: boolean;
  showBars: boolean;
}

export interface DjAnalysisSettings {
  digitalTempoLock: boolean;
  driftRescue: boolean;
  reviewPolicy: "flag-low-confidence" | "always" | "never";
  lockAfterManualEdit: boolean;
}

export interface DjSyncSettings {
  enabledByDefault: boolean;
  mode: "beat" | "bpm";
  masterSelection: "automatic-first-active" | "manual";
  allowManualMaster: boolean;
  liveBpmRampMs: number;
  phaseLockToleranceMs: number;
  phaseReleaseToleranceMs: number;
  mediumCorrectionMs: number;
  hardCorrectionMs: number;
  hardCooldownMs: number;
  lateLaunchWindowMs: number;
}

export interface DjQuantizeSettings {
  enabledByDefault: boolean;
  cue: boolean;
  hotCue: boolean;
  memoryCue: boolean;
  loops: boolean;
  beatJump: boolean;
}

export interface DjLoopSettings {
  defaultLengthBeats: number;
  availableLengths: number[];
  manualQuantize: boolean;
}

export interface DjBeatJumpSettings {
  defaultBeats: number;
  availableSizes: number[];
}

export interface DjFxSettings {
  defaultUnit: string;
  defaultTarget: "d1" | "d2" | "both";
  defaultDryWet: number;
  defaultTimingBeats: number;
  resetOnMixerOpen: boolean;
  resetOnTrackLoad: boolean;
  resetOnSessionEnd: boolean;
  maximumDryWet: number;
  killAlwaysForcesDry: true;
}

export interface DjStemsSettings {
  enabled: boolean;
  pythonPath: string;
  demucsCommand: string;
  model: string;
  devicePreference: "auto" | "cpu" | "cuda";
  cacheRoot: string;
  cacheMaximumBytes: number;
  retentionDays: number;
  concurrentJobs: number;
}

export interface DjRecordingSettings {
  countdownSeconds: number;
  format: "wav" | "flac" | "mp3";
  sampleRate: "engine" | "44100" | "48000";
  channels: "1" | "2";
  wavBitDepth: "16" | "24" | "32-float";
  flacBitDepth: "16" | "24";
  flacCompression: "fast" | "balanced" | "maximum";
  mp3Bitrate: "128" | "192" | "256" | "320";
  saveTracklistText: boolean;
  saveTimestampJson: boolean;
  saveSessionJson: boolean;
  finaliseOnServer: boolean;
  retainRecoveryOnFailure: boolean;
}

export interface DjRecordingArchiveSettings {
  root: string;
  keepBrowserCaptureOnFailure: boolean;
  openPlayerAfterSave: boolean;
  minimumFreeBytes: number;
}

export interface DjAudioRoutingSettings {
  mode: "pc-only" | "iphone-only" | "pc-and-iphone";
  masterStreamEnabled: boolean;
  cueStreamEnabled: boolean;
  pflStreamEnabled: boolean;
  reconnectPolicy: "manual" | "automatic";
  muteLocalDuringReconnect: boolean;
  muteRemoteOnDisconnect: boolean;
}

export interface DjPerformanceUiSettings {
  openBehavior: "always-main" | "remember-last-page";
  librarySort: "title-asc" | "title-desc" | "bpm-asc" | "bpm-desc";
  preparationFilter: "all" | "prepared" | "review-required";
  bpmFilter: "all" | "known" | "unknown";
  confirmUnloadPlayingDeck: boolean;
  confirmStopBothDecks: boolean;
  confirmClearCues: boolean;
  confirmDeleteRecording: boolean;
  confirmResetGrid: boolean;
  fullscreenPreference: "manual" | "request-on-open";
  orientationPreference: "auto" | "portrait" | "landscape";
  preserveSingleViewport: true;
  allowMainPageScroll: false;
}

export interface DjSettings {
  studio: DjStudioSettings;
  engine: DjEngineSettings;
  decks: DjDeckSettings;
  mixer: DjMixerSettings;
  waveform: DjWaveformSettings;
  grid: DjGridSettings;
  analysis: DjAnalysisSettings;
  sync: DjSyncSettings;
  quantize: DjQuantizeSettings;
  loops: DjLoopSettings;
  beatJump: DjBeatJumpSettings;
  fx: DjFxSettings;
  stems: DjStemsSettings;
  recording: DjRecordingSettings;
  recordingArchive: DjRecordingArchiveSettings;
  audioRouting: DjAudioRoutingSettings;
  performanceUi: DjPerformanceUiSettings;
}

export interface BrMediaSettings {
  schemaVersion: typeof BRMEDIA_SETTINGS_SCHEMA_VERSION;
  metadata: SettingsDocumentMetadata;
  universal: UniversalSettings;
  server: ServerSettings;
  storage: StorageSettings;
  library: LibrarySettings;
  audioPlayer: AudioPlayerSettings;
  videoPlayer: VideoPlayerSettings;
  converter: ConverterSettings;
  tagger: TaggerSettings;
  mastering: MasteringSettings;
  torrents: TorrentSettings;
  profiles: ProfileSettings;
  notifications: NotificationSettings;
  backup: BackupSettings;
  diagnostics: DiagnosticsSettings;
  dj: DjSettings;
}

export type UnknownSettings = Record<string, unknown>;

export interface SettingsEnvelope {
  settings: BrMediaSettings;
  unknown: UnknownSettings;
}
