const $ = (id) => document.getElementById(id);

const moduleSearchBtn = document.querySelector(".moduleSearchBtn");
const btnModuleMenu = $("btnModuleMenu");
const moduleSidebar = $("moduleSidebar");
const moduleSidebarBackdrop = $("moduleSidebarBackdrop");
const btnModuleSidebarCloseFloating = $("btnModuleSidebarCloseFloating");
const settingsSidebarTree = $("settingsSidebarTree");
const settingsCards = $("settingsCards");
const playerSettingsSubTabs = $("playerSettingsSubTabs");
const settingsSaveNotice = $("settingsSaveNotice");
const settingsActiveTitle = $("settingsActiveTitle");
const settingsActiveBadge = $("settingsActiveBadge");

const moduleSidebarScrollLock = { y: 0 };

const PLAYER_SETTINGS_KEY = "brmedia_settings_v2";
const DEVICE_PREFS_KEY = "brmedia_device_prefs_v1";
const URL_SOURCE_LINKS_KEY = "brmedia_url_source_links_v1";
const BOOKMARK_PREFS_KEY = "brmedia_bookmark_prefs";
const PREVIEW_SHARE_PREFS_KEY = "brmedia_preview_share_prefs_v1";
const SETTINGS_UI_KEY = "brmedia_universal_settings_ui_v1";
const TAGGER_SETTINGS_KEY = "brmedia_tagger_settings_v1";
const CONVERTER_SETTINGS_KEY = "brmedia_converter_settings_v1";
const TORRENT_SETTINGS_KEY =
  "brmedia_torrent_settings_v1";

const VIDEO_SETTINGS_KEY =
  "brmedia_video_settings_v1";

const VIDEO_SETTINGS_DEFAULTS = {
  resumeEnabled: true,
  saveProgress: true,
  autoplayNextPart: true,
  preferBrowserCopy: true,
  showPartSwitcher: true,

  aspectRatio: "auto",
  objectFit: "contain",
  playbackRate: 1,
  skipSeconds: 10,
  preloadMode: "metadata",
  nativeControls: false,
  startMuted: false,

  subtitlesEnabled: true,
  subtitlesDefaultOn: false,
  subtitleLanguage: "en",

  pipEnabled: true,

  showCastImages: true,
  showRelatedImages: true,
  showTrailers: true,
  showCollections: true,

  autoMetadataRefresh: true,
  richMetadataRefresh: true,
  metadataBatchSize: 3,

  promptBrowserCopy: true,
  browserCopyPreset: "fast",
  browserCopyCrf: 23,
  browserCopyAudioBitrate: "192k",
  autoOpenBrowserCopy: false,

  defaultDeleteMode: "library",
  confirmPhysicalDelete: true,
};

const TORRENT_SETTINGS_DEFAULTS = {
  engineEnabled: true,
  engineUrl: "http://127.0.0.1:8080",
  engineUser: "",
  enginePass: "",
  engineSavePath: "C:\\BRMedia\\Torrents\\Downloads",
  downloadLimitKb: 0,
  uploadLimitKb: 0,
  slowModeDownloadKb: 512,
  slowModeUploadKb: 64,
  schedulerEnabled: false,
  schedulerMode: "download-and-seed",
  schedulerOutsideMode: "slow",
  schedulerWeekdayStart: "00:00",
  schedulerWeekdayEnd: "07:00",
  schedulerWeekendStart: "00:00",
  schedulerWeekendEnd: "10:00",
  cacheEnabled: true,
  cacheSizeMb: 512,
  cacheWriteCoalesce: true,
  cacheReduceDiskWear: true,
  scanTorrentFiles: true,
  scanDownloadedFiles: true,
  blockSuspiciousFiles: true,
  quarantineSuspiciousFiles: false,
  quarantineFolder: "C:\\BRMedia\\Quarantine",
  defenderDeepScan: true,
  defenderDisableRemediation: true,
  magnetLinks: true,
  upnp: true,
  natPmp: true,
  protocolEncryption: true,
  ipv6: false,
  defaultTransferTarget: "ask",
  showPiecesMap: true,
  browserNotifications: false,
  completionNotifications: true,
  blockedNotifications: true,
  lowSeedNotifications: true,
  engineDisconnectedNotifications: true,
  diskSpaceNotifications: true,
  scanCompleteNotifications: true,
  transferCompleteNotifications: true,
  inAppHistory: true,
  speedGraph: true,
  speedGraphSampleIntervalSec: 5,
  speedGraphHistoryLength: 120,
  speedGraphShowTotals: true,
  speedGraphShowCurrent: true,
  speedGraphShowAverage: true,
  speedGraphShowPeak: true,
};

const TAGGER_SETTINGS_DEFAULTS = {
  defaultOpenTab: "main",
  defaultCategory: "Other Mixes",
  defaultReleaseType: "Mix",
  defaultTracklistStatus: "None",
  defaultSaveMode: "copy",
  warnBeforeReplace: true,
  autoSaveSidecarBeforeWrite: true,
  autoFillBrandFromCategory: true,
  preserveExistingAdvanced: true,
  artworkEmbedMode: "keep",
  artworkMaxSize: 1600,
  uploadAfterAction: "load",
};

const CONVERTER_SETTINGS_DEFAULTS = {
  defaultPresetKey: "mp3-320",
  defaultOutputName: "BRMedia Converted",
  defaultAudioFormat: "mp3",
  defaultAudioBitrate: "320k",
  defaultChannels: "2",
  defaultSampleRate: "",
  defaultVideoFormat: "mp4",
  defaultCrf: "23",
  defaultPreset: "fast",
  normalizeAudio: false,
  fastStart: true,
  addToLibrary: true,
  removeAudio: false,
  batchSequential: true,
  keepBatchAfterDone: true,
  compactProgress: true,
  openAfterDone: "stay",
  historyLimit: 30,
};

const DJ_SETTINGS_DEFAULTS = {
  defaultView: "dual",
  defaultDuoPanel: "mixer",
  singleDeckOpeningTab: "main",
  defaultDeckLoadTarget: "ask",
  mixerControlMode: "knobs",
  crossfaderMode: "smooth",
  crossfaderCentreSnap: true,
  masterVolumePercent: 100,
  deckDefaultGainPercent: 100,
  autoMasterDeck: true,
  quantizeEnabled: true,
  masterTempoEnabled: true,
  rapidTapProtection: true,
  keepAwakeDuringSet: true,

  syncDefaultMode: "beat",
  syncAutoMaster: true,
  syncAllowBpmOnly: true,
  syncBeatAlignOnPlay: true,
  syncBarAlign: true,
  syncPhraseAssist: false,
  syncNudgeMs: 12,
  keySyncEnabled: false,
  keyCompatibilityDisplay: true,

  recordCountdownSeconds: 6,
  recordOutputFormat: "wav",
  recordSampleRate: "engine",
  recordChannels: "2",
  recordWavBitDepth: "24",
  recordFlacBitDepth: "24",
  recordFlacCompression: "balanced",
  recordMp3Bitrate: "320",
  recordSaveTxtTracklist: true,
  recordSaveTimestampJson: true,
  recordSaveSessionJson: true,
  recordAutoTimestampOnDeckLoad: true,
  recordRetainRecoveryOnFailure: true,
  recordFinaliseOnServer: true,
  recordKeepBrowserCaptureOnFailure: true,
  recordOpenPlayerAfterSave: false,
  recordOutputFolderLabel: "server/data/player-runtime/dj-recordings/final",

  waveformZoomBars: "8",
  waveformSmoothRenderer: true,
  waveformShowBeatGrid: true,
  waveformShowDownbeats: true,
  waveformShowPhraseMarkers: true,
  waveformAutoDetectDownbeat: true,
  waveformJogPreview: true,
  waveformDragSensitivity: 135,
  waveformOverviewHeight: "compact",
  waveformDetailHeight: "large",

  gridSnapCueByDefault: false,
  gridAutoSave: true,
  gridShowFourthBeatMarkers: true,
  gridNudgeFineMs: 8,
  gridNudgeCoarseMs: 40,
  gridLockAfterPrep: false,

  cueSnapWhenGridTab: false,
  cueReturnOnPause: true,
  cueSetAfterWaveScrub: true,
  hotCuePads: "8",
  memoryCueAutoName: true,

  loopDefaultBars: "8",
  loopSmallSizes: true,
  loopQuantize: true,
  autoLoopOnLoad: false,

  fxDefaultBank: "pioneer-core",
  fxTapToggle: true,
  fxLongPressHold: true,
  fxClearOnSetOpen: true,
  fxDefaultTarget: "master",
  fxWetDefaultPercent: 65,

  libraryShortTracksOnly: true,
  libraryMaxTrackMinutes: 10,
  libraryIncludeLongMixes: false,
  libraryRememberSources: true,
  libraryDefaultSourceType: "dj-tracks",
  libraryDefaultSort: "title",
  libraryShowPreparedBadges: true,
  libraryShowBpmKeyColumns: true,
  libraryAutoAnalyseNewSources: true,
  librarySourceNotes: "",

  browserRequireHttpsForRecording: true,
  browserAudioWorkletEnabled: true,
  browserMidiEnabled: false,
  browserKeepScreenAwake: true,
  browserBackgroundAudioGuard: true,
};

const PLAYER_SETTINGS_DEFAULTS = {
  downloads: true,
  shuffle: false,
  savePos: true,
  saveState: true,
  autoplay: false,
  skipBackSec: 25,
  skipFwdSec: 25,
  repeatMode: "off",
  playbackRate: 1,
	
  backgroundAudio: true,
  mediaSessionControls: true,
  useRealWaveformPeaks: true,
  waveformDisplayMode: "bars",
  waveformPeakCount: 1200,
  waveformHeightMode: "normal",
  waveformDensityMode: "standard",
  waveformAutoGenerateOnUpload: true,
  waveformAutoGenerateOnImport: true,
  waveformGenerateOnFirstPlay: false,
  waveformAllowSeeking: true,
  waveformShowInMiniPlayer: true,
  waveformShowInFileManager: true,
  waveformFallbackBars: true,
  waveformRetryFailedOnly: true,
  tracklistEditLocked: true,
  autoTimestampScanDefault: "balanced",
  tracklistNameDetectDefault: true,
  brMediaTagPriority: true,
  artistMultiMembership: true,
  shortAudioRules: true,
  radioOnlyRule: true,

  uploadAddToLibrary: true,
  uploadAcceptTracklists: true,
  uploadDuplicateMode: "keep-both",
  uploadAfterAction: "stay",
  uploadAutoScanTracklist: true,

  sendDeviceRequireConfirm: true,
  sendDeviceQueueHandoff: true,
  sendDeviceTimestampSync: true,
  sendDeviceRememberTarget: true,

  previewShareDefaultLength: 30,
  previewShareIncludeArtwork: true,
  previewShareIncludeBranding: true,
  previewShareSaveHistory: true,

  bookmarkAutoName: true,
  bookmarkGroupByMix: true,
  bookmarkShowInTracklist: true,
  bookmarkSaveNotes: true,
	
  eqEnabled: false,
  eqPreset: "flat",
  eqPreamp: 0,
  eqBands: {
    "32": 0,
    "64": 0,
    "125": 0,
    "250": 0,
    "500": 0,
    "1000": 0,
    "2000": 0,
    "4000": 0,
    "8000": 0,
    "16000": 0,
  },
};

const DEVICE_PREFS_DEFAULTS = {
  deviceId: "",
  name: "This device",
  type: "phone",
  receiveTransfers: true,
  allowRemote: false,
  requireConfirm: true,
  rememberLastTarget: true,
  lastTargetId: "",
  knownDevices: [],
};

const PLAYER_SETTINGS_TABS = [
  { key: "overview", title: "Overview", icon: "gauge-high" },
  { key: "playback", title: "Playback", icon: "sliders" },
  { key: "equaliser", title: "Equaliser", icon: "sliders" },
  { key: "uploads", title: "Uploads", icon: "folder-plus" },
  { key: "waveforms", title: "Waveforms", icon: "waveform" },
  { key: "tracklists", title: "Tracklists", icon: "list-timeline" },
  { key: "library", title: "Library", icon: "folder-open" },
  { key: "devices", title: "Devices", icon: "mobile" },
  { key: "sharing", title: "Sharing", icon: "share-nodes" },
  { key: "backup", title: "Backup", icon: "floppy-disk" },
];

const CLOUD_SETTINGS_TABS = [
  { key: "overview", title: "Overview", icon: "folder-open" },
  { key: "add-files", title: "Main Hub", icon: "folder-plus" },
  { key: "data-import", title: "Data Import", icon: "file-import" },
  { key: "files", title: "View Files", icon: "folder-open" },
  { key: "duplicates", title: "Duplicates", icon: "copy" },
  { key: "google", title: "Google Drive", icon: "google-drive" },
  { key: "dropbox", title: "Dropbox", icon: "dropbox" },
  { key: "sync", title: "Cloud Sync", icon: "arrows-rotate" },
  { key: "import", title: "Import", icon: "cloud-arrow-down" },
  { key: "links", title: "Source Links", icon: "link" },
];

const CLOUD_SYNC_CATEGORY_OPTIONS = [
  { value: "auto", label: "Auto from folder name" },
  { value: "blackburn-ravers-mixes", label: "Blackburn Ravers Mixes" },
  { value: "dj-nj-mixes", label: "DJ NJ Mixes" },
  { value: "upalnite-mixes", label: "Upalnite Mixes" },
  { value: "hardcore-medley-series", label: "The Hardcore Medley Series" },
  { value: "htid-mixes", label: "HTID Mixes" },
  { value: "free-songs", label: "Blackburn Ravers Free Songs" },
  { value: "dj-mp3s-wavs", label: "DJ MP3s | WAVs / Other" },
];

const CLOUD_SYNC_CATEGORY_BRANDS = {
  "blackburn-ravers-mixes": "Blackburn Ravers",
  "free-songs": "Blackburn Ravers",
  "dj-nj-mixes": "DJ NJ",
  "upalnite-mixes": "Upalnite",
};

const SETTINGS_SUBTAB_DESCRIPTIONS = {
  centre: {
    overview: "Universal Settings wiring map and quick links into every central settings area.",
  },
  player: {
    overview: "Main audio player controls and status.",
    playback: "Queue, repeat, speed and seek buttons.",
    equaliser: "EQ on/off, preset and preamp defaults.",
    uploads: "Player upload behaviour and defaults.",
    waveforms: "Peaks, display style and generator tools.",
    tracklists: "Timestamp scan and edit protection.",
    library: "Categories, BRMedia tags and sorting rules.",
    devices: "Device names, handoff and remote control.",
    sharing: "Preview Share and bookmark defaults.",
    backup: "Export and protect Player data.",
  },
  cloud: {
    overview: "Files, imports and cloud hub.",
    "add-files": "Upload audio, artwork and tracklists.",
    files: "Browse files and open action menus.",
    duplicates: "Find duplicate audio files before batch converting.",
    google: "Browse and import from Google Drive.",
    dropbox: "Browse and import from Dropbox.",
    sync: "Synced cloud folders that become editable BRMedia library files.",
    import: "Direct/user-owned URL imports.",
    links: "Saved SoundCloud/Mixcloud references.",
  },
  video: {
    overview: "Video Player defaults and status.",
    library: "Video source folders and filters.",
    playback: "Video playback behaviour.",
    metadata: "Posters, cast, ratings and lookups.",
    subtitles: "Subtitle discovery and display.",
  },
  tagger: {
    overview: "Tagger defaults and safe workflows.",
    workflow: "Default opening section and upload behaviour.",
    write: "Copy, replace, sidecar and backup modes.",
    artwork: "Artwork source and embed choices.",
    brtags: "BRMedia custom tag source of truth.",
    category: "Category and brand placement rules.",
  },
  converter: {
    overview: "Converter defaults and handoff.",
    audio: "Audio format and quality settings.",
    video: "Video format and quality settings.",
    batch: "Batch queue and sequential conversion behaviour.",
    output: "Output naming, progress and history.",
    handoff: "Open converted files in Player, Tagger or Mastering.",
  },
  mastering: {
    overview: "Mastering defaults and workflow.",
    loudness: "LUFS targets and true peak ceiling.",
    chain: "EQ, width, warmth and limiter chain.",
    analysis: "Analyse first and warning cards.",
    render: "Output copies and render history.",
  },
  torrents: {
    overview: "qBittorrent connection, queue defaults and safety status.",
    engine: "qBittorrent Web UI connection and default download folder.",
    files: "Completed-file handoff to Audio/Video and default file priority.",
    bandwidth: "Download/upload limits and slow-mode presets.",
    scheduler: "Allowed download/seeding windows.",
    cache: "Disk cache defaults and hard-drive wear controls.",
    pieces: "Piece-map display and qBittorrent chunk visibility.",
    safety: "Fast BRMedia checks and Microsoft Defender deep-scan controls.",
    quarantine: "Quarantine folder, safe restore and permanent-delete history.",
    notifications: "Completed, blocked, engine, disk-space, scan and transfer alerts.",
    graph: "Speed-graph visibility, sampling and metric defaults.",
    completed: "Open the runtime Completed Downloads page for file-level transfer actions.",
    "scan-history": "BRMedia quick checks, Defender scans and quarantine results.",
    protocols: "Magnet links, UPnP, NAT-PMP, encryption and IPv6 options.",
  },
  server: {
    drives: "Online/offline drives, watched folders and default media destinations.",
    sources: "Audio/video folders and libraries.",
    "add-files": "Server-side add/import locations.",
    google: "Google Drive account settings.",
    dropbox: "Dropbox account settings.",
    import: "Direct URL import settings.",
    network: "Tailscale, local URLs and access.",
  },
  stats: {
    library: "Library charts and breakdowns.",
    playback: "Plays, skips, resumes and history.",
    storage: "Storage, cache and file sizes.",
    cloud: "Cloud/import totals and account stats.",
    jobs: "Waveform, import and module job history.",
  },
};

const SETTINGS_NAV_TREE = [
  {
    key: "home",
    title: "Home",
    desc: "Back to BRMedia Centre home.",
    iconPath: "/shared/branding/module-icons/home.png",
    route: "/",
  },
  {
    key: "centre",
    title: "Settings Overview",
    desc: "Central wiring map for BRMedia settings, files, imports and libraries.",
    iconPath: "/shared/branding/module-icons/settings.png",
    children: [
      {
        key: "overview",
        title: "Settings Map",
        icon: "table-list",
      },
    ],
  },
  {
    key: "player",
    title: "Player Settings",
    desc: "Audio, uploads, waveforms, devices and sharing.",
    iconPath: "/shared/branding/module-icons/player.png",
    children: PLAYER_SETTINGS_TABS,
  },
  {
    key: "cloud",
    title: "Upload Media Hub",
    desc: "One main hub for uploads, cloud media, direct imports, completed torrents and file management.",
    iconPath: "/shared/branding/categories/icons/upload-media-trans.png",
    children: CLOUD_SETTINGS_TABS,
  },
  {
    key: "video",
    title: "Video Player Settings",
    desc: "Video library, playback, metadata and subtitles.",
    iconPath: "/shared/branding/module-icons/video-player.png",
    children: [
      {
        key: "overview",
        title: "Overview",
        icon: "video",
      },
      {
        key: "library",
        title: "Video Library",
        icon: "folder-open",
      },
      {
        key: "playback",
        title: "Playback",
        icon: "circle-play",
      },
      {
        key: "screen",
        title: "Screen Ratio",
        icon: "expand",
      },
      {
        key: "copies",
        title: "MP4 Copies",
        icon: "film",
      },
      {
        key: "metadata",
        title: "Metadata Search",
        icon: "wand-magic-sparkles",
      },
      {
        key: "subtitles",
        title: "Subtitles",
        icon: "closed-captioning",
      },
      {
        key: "linkups",
        title: "Series / Parts",
        icon: "link",
      },
      {
        key: "delete",
        title: "Delete Behaviour",
        icon: "trash",
      },
      {
        key: "removed",
        title: "Removed Videos",
        icon: "rotate-left",
      },
    ],
  },
  {
    key: "tagger",
    title: "Tagger Settings",
    desc: "Metadata, artwork, write modes and BRMedia tags.",
    iconPath: "/shared/branding/module-icons/tagger.png",
    children: [
      { key: "overview", title: "Overview", icon: "tag" },
      { key: "workflow", title: "Workflow", icon: "list-check" },
      { key: "write", title: "Write Modes", icon: "floppy-disk" },
      { key: "artwork", title: "Artwork", icon: "image" },
      { key: "brtags", title: "BRMedia Tags", icon: "tags" },
      { key: "category", title: "Category Rules", icon: "folder-tree" },
    ],
  },
  {
    key: "converter",
    title: "Converter Settings",
    desc: "Audio, video, extraction, outputs and history.",
    iconPath: "/shared/branding/module-icons/converter.png",
    children: [
      { key: "overview", title: "Overview", icon: "arrows-rotate" },
      { key: "audio", title: "Audio", icon: "music" },
      { key: "video", title: "Video", icon: "video" },
      { key: "batch", title: "Batch", icon: "list-check" },
      { key: "output", title: "Output", icon: "download" },
      { key: "handoff", title: "Handoff", icon: "share-nodes" },
    ],
  },
  {
    key: "mastering",
    title: "Mastering Settings",
    desc: "Loudness, chain, analysis and render defaults.",
    iconPath: "/shared/branding/module-icons/mastering.png",
    children: [
      { key: "overview", title: "Overview", icon: "sliders" },
      { key: "loudness", title: "Loudness", icon: "gauge-high" },
      { key: "chain", title: "Chain", icon: "sliders" },
      { key: "analysis", title: "Analysis", icon: "magnifying-glass-chart" },
      { key: "render", title: "Render", icon: "waveform" },
    ],
  },
  {
    key: "torrents",
    title: "Torrents Settings",
    desc: "qBittorrent, legal downloads, bandwidth, safety and library handoff.",
    iconPath: "/shared/branding/module-icons/torrents.png",
    children: [
      { key: "overview", title: "Overview", icon: "magnet" },
      { key: "engine", title: "Engine", icon: "plug" },
      { key: "files", title: "Files / Handoff", icon: "folder-open" },
      { key: "bandwidth", title: "Speed", icon: "gauge-high" },
      { key: "scheduler", title: "Scheduler", icon: "calendar-clock" },
      { key: "cache", title: "Cache", icon: "hard-drive" },
      { key: "pieces", title: "Pieces", icon: "grip" },
      { key: "safety", title: "Security", icon: "shield-check" },
      { key: "quarantine", title: "Quarantine", icon: "box-archive" },
      { key: "notifications", title: "Notifications", icon: "bell" },
      { key: "graph", title: "Speed Graph", icon: "chart-line" },
      { key: "completed", title: "Completed", icon: "circle-check" },
      { key: "scan-history", title: "Scan History", icon: "clock-rotate-left" },
      { key: "protocols", title: "Protocols", icon: "network-wired" },
    ],
  },
  {
    key: "server",
    title: "Server Settings",
    desc: "Sources, cloud, imports, cache and admin.",
    iconPath: "/shared/branding/module-icons/server-settings.png",
    children: [
      { key: "drives", title: "Drives & Libraries", icon: "hard-drive" },
      { key: "sources", title: "Sources", icon: "folder" },
      { key: "add-files", title: "Add Files", icon: "folder-plus" },
      { key: "google", title: "Google Drive", icon: "google-drive" },
      { key: "dropbox", title: "Dropbox", icon: "dropbox" },
      { key: "import", title: "Direct URL Import", icon: "cloud-arrow-down" },
      { key: "network", title: "Network", icon: "server" },
    ],
  },
  {
    key: "stats",
    title: "Stats Settings",
    desc: "Charts, history, storage and module analytics.",
    iconPath: "/shared/branding/module-icons/stats.png",
    children: [
      { key: "library", title: "Library", icon: "chart-pie" },
      { key: "playback", title: "Playback", icon: "chart-column" },
      { key: "storage", title: "Storage", icon: "database" },
      { key: "cloud", title: "Cloud", icon: "cloud" },
      { key: "jobs", title: "Jobs", icon: "clock" },
    ],
  },
];

const SETTINGS_MODULE_NAV_LINKS = [
  { title: "Player", desc: "Audio player, queue, playlists and tracklists.", route: "/player", iconPath: "/shared/branding/module-icons/audio-home.png" },
  { title: "Video", desc: "Films, posters, playback and subtitles.", route: "/video-player", iconPath: "/shared/branding/module-icons/video-player.png" },
  { title: "Converter", desc: "Convert audio/video and batch jobs.", route: "/converter", iconPath: "/shared/branding/module-icons/converter.png" },
  { title: "Tagger", desc: "Metadata, artwork and BRMedia tags.", route: "/tagger", iconPath: "/shared/branding/module-icons/tagger.png" },
  { title: "Mastering", desc: "Audio polish, previews and compare tools.", route: "/mastering", iconPath: "/shared/branding/module-icons/mastering.png" },
  { title: "Torrents", desc: "Legal torrents, queue, transfers and safe scanning.", route: "/torrents", iconPath: "/shared/branding/module-icons/torrents.png" },
  { title: "Stats", desc: "Charts, history and library analytics.", route: "/stats", iconPath: "/shared/branding/module-icons/stats.png" },
  { title: "Server Settings", desc: "Sources, storage, FFmpeg and networking.", route: "/server-settings", iconPath: "/shared/branding/module-icons/server-settings.png" },
  { title: "Universal Settings", desc: "Global BRMedia control centre.", route: "/settings", iconPath: "/shared/branding/module-icons/settings.png" },
];

let activeChildSettingsTab = "overview";
let devicePrefs = loadDevicePrefs();
let settingsUi = readPersistedJson(SETTINGS_UI_KEY, {});
let settingsLibrary = [];
let settingsLibraryLoaded = false;
let waveformJobPollTimer = 0;
let waveformGenerationInFlight = false;
let settingsUploadQueue = [];
let settingsUploadStatus = [];
let settingsUploadBusy = false;
let settingsUploadTarget = "auto";
let settingsDuplicateSelectedIds = new Set();
let settingsCloudAccounts = [];
let settingsCloudFiles = { google: [], dropbox: [] };
let settingsCloudSyncRules = [];
let settingsCloudSyncJobs = [];
let settingsCloudSyncPollTimer = 0;
let settingsCloudState = {
  googleAccountId: "",
  googleFolderId: "root",
  googleQuery: "",
  dropboxAccountId: "",
  dropboxPath: "",
  dropboxQuery: "",
  directUrl: "",
};
let settingsCloudImportPollTimer = 0;
let settingsDirectImportPollTimer = 0;
let settingsSelectedFileId = "";
let settingsFileFilter = "all";
let settingsViewFilesKind = "audio";
let settingsViewFilesSearch = "";
let settingsViewFilesSelectedId = "";
let settingsSupportFiles = [];
let settingsSupportFilesLoaded = false;
let settingsHiddenAudioItems = [];
let settingsHiddenAudioLoaded = false;
let settingsViewFilesSourceRoot = "";
let settingsAutoOpenUploadPicker = false;
let settingsRequestedFileId = "";
let settingsRequestedVideoFileId = "";
let settingsRequestedSupportFileId = "";
let settingsRequestedQuickEdit = false;
let settingsDriveSources = [];
let settingsDriveSourcesLoaded = false;
let settingsDriveSourcesBusy = false;

let settingsVideoItems = [];
let settingsVideoLoaded = false;
let settingsVideoSelectedId = "";
let settingsVideoSearch = "";
let settingsVideoManualSearch = "";
let settingsVideoMetadataResults = [];
let settingsVideoStatus = "Ready.";
let settingsVideoPosterUploadTargetId = "";
let settingsVideoCopyJobs = [];
let settingsVideoCopyPollTimer = 0;
let settingsHiddenVideoItems = [];
let settingsHiddenVideoLoaded = false;

let settingsQuickEditId = "";
let settingsQuickEditTags = {};
let settingsTracklistFiles = [];
let settingsTracklistFilesLoaded = false;
let settingsQuickTracklistUploadTargetId = "";

let activeSettingsModule = "player";
let settingsExpandedModule = "player";
let activePlayerSettingsTab = "overview";
let playerSettings = loadPlayerSettings();
let settingsSaveNoticeTimer = 0;

const BR_ICON_BASE_PATHS = ["/shared/icons/fa-duotone/", "/player/branding/icons/"];

const BR_ICON_CLASS_MAP = {
  bars: "list-music",
  "bars-staggered": "list-music",
  xmark: "xmark",
  music: "music",
  "magnifying-glass": "magnifying-glass",
  video: "video",
  film: "film",
  tag: "tag",
  tags: "tags",
  "arrows-rotate": "arrow-rotate-right",
  sliders: "sliders",
  server: "server",
  gear: "gear-complex",
  house: "house",
  home: "house",
  "chart-pie": "chart-column",
  "chart-column": "chart-column",
  database: "database",
  cloud: "cloud",
  "cloud-arrow-up": "cloud-arrow-up",
  "cloud-arrow-down": "cloud-arrow-down",
  "google-drive": "google-drive",
  dropbox: "dropbox",
  soundcloud: "soundcloud",
  mixcloud: "mixcloud",
  whatsapp: "whatsapp",
  folder: "folder",
  mobile: "mobile-screen-button",
  waveform: "waveform",
  clock: "clock",
  download: "download",
  upload: "upload",
  palette: "palette",
  lock: "lock",
  "floppy-disk": "floppy-disks",
  "rotate-left": "arrow-rotate-left",
  "folder-plus": "folder-plus",
  "folder-open": "folder-open",
  "folder-tree": "folder-tree",
  "closed-captioning": "closed-captioning",
  "file-audio": "file-audio",
  "file-import": "file-import",
  "file-arrow-up": "file-arrow-up",
  "magnifying-glass-chart": "magnifying-glass-chart",
  "share-nodes": "share-nodes",
  "list-timeline": "list-timeline",
  "stopwatch-20": "stopwatch",
  "circle-check": "circle-check",
  "circle-play": "circle-play",
  play: "play",
  trash: "trash",
  link: "link",
  image: "image",
  box: "box",
  "table-list": "table-list",
  "record-vinyl": "record-vinyl",
  headphones: "headphones",
  magnet: "magnet",
  paperclip: "paperclip",
  "file-lines": "file-lines",
  "folder-arrow-down": "folder-arrow-down",
  "wand-magic-sparkles": "wand-magic-sparkles",
  "arrow-up-right-from-square": "arrow-up-right-from-square",
};

const SETTINGS_MODULES = {
  player: {
    title: "Player Settings",
    badge: "Audio",
    cards: [
      {
        icon: "music",
        title: "Playback Engine",
        desc: "Server-first streaming and mobile playback behaviour.",
        options: [
          ["Resume last track", "Restore last mix/song and exact position on reopen.", "On"],
          ["Background/lock-screen audio", "Keep metadata ready for iPhone, Android and PWA controls.", "On"],
          ["Seek buttons", "Default quick seek step for headphones and controls.", "15 sec"],
          ["Queue mode", "Remember queue, repeat, shuffle and now-playing state.", "Smart"],
        ],
      },
      {
        icon: "waveform",
        title: "Waveforms & Tracklists",
        desc: "Real peaks, timestamp rows, edit mode and tracklist scanning.",
        options: [
          ["Real waveform peaks", "Use cached server peaks when available.", "On"],
          ["Waveform display", "Bars by default with smooth toggle later.", "Bars"],
          ["Tracklist edit lock", "Editing stays off until you enable it.", "Protected"],
          ["Auto timestamp scan", "Detect likely mix changes with FFmpeg.", "Available"],
        ],
      },
      {
        icon: "folder",
        title: "Library & Categories",
        desc: "Brand/category sorting, Free Songs rules and custom tags.",
        options: [
          ["BRMedia tags", "Use BRMEDIA_* tags as source of truth.", "Priority"],
          ["Artist multi-membership", "Upalnite/DJ NJ/BR appear in their own folders too.", "On"],
          ["Short BRMedia audio", "Under 10 minutes goes to Free Songs.", "On"],
          ["Non-BR short audio", "Under 10 minutes goes to DJ MP3s / WAVs.", "On"],
        ],
      },
      {
        icon: "mobile",
        title: "Device & Sharing",
        desc: "Send to device, preview share, bookmarks and remote handoff.",
        options: [
          ["Send to device", "Accept/decline handoff and current queue support.", "Ready"],
          ["Preview Share", "Clip builder for sharing short previews.", "On"],
          ["Bookmarks", "Save moments per track or mix.", "On"],
          ["Media Session", "Lock-screen controls and metadata hooks.", "Planned"],
        ],
      },
    ],
  },

  video: {
    title: "Video Player Settings",
    badge: "Video",
    cards: [
      {
        icon: "video",
        title: "Video Library",
        desc: "C:\\Videos scanning, posters, metadata and watch history.",
        options: [
          ["Video source folder", "Default local video folder.", "C:\\Videos"],
          ["Poster wall", "Use poster-first card layout.", "On"],
          ["Continue watching", "Remember position and progress.", "On"],
          ["Online metadata", "TMDb/OMDb lookup support.", "Ready"],
        ],
      },
      {
        icon: "film",
        title: "Playback & Subtitles",
        desc: "Video playback shell, subtitles and format handling.",
        options: [
          ["Subtitles", "Detect VTT/SRT and prepare browser-safe subtitles.", "On"],
          ["Legacy formats", "Index VOB/MPG/MPEG but warn if browser cannot play.", "Safe"],
          ["Transcode fallback", "Future server-side playable copy option.", "Planned"],
          ["Video Media Session", "Device controls after Player stage.", "Planned"],
        ],
      },
    ],
  },

  tagger: {
    title: "Tagger Settings",
    badge: "Tags",
    cards: [
      {
        tab: "overview",
        icon: "tag",
        title: "Tagger Status",
        desc: "Main safe metadata editor defaults. These are read by /tagger on load.",
        options: [
          ["Normal tags", "Full ID3/Evertag-style sections are active.", "On"],
          ["BRMedia categories", "Only the 4 clean mix categories are shown.", "4"],
          ["Safe writing", "Copy first, replace only with backup warning.", "Protected"],
          ["Phone/PC browse", "Upload and open any supported audio file.", "On"],
        ],
      },
      {
        tab: "workflow",
        icon: "list-check",
        title: "Workflow Defaults",
        desc: "Choose where Tagger opens and what happens after browsing a file.",
        controls: [
          { type: "select", key: "defaultOpenTab", title: "Default opening section", desc: "Which Tagger section opens first.", options: [
            { value: "main", label: "Main tags" },
            { value: "brmedia", label: "BRMedia sort" },
            { value: "artwork", label: "Artwork" },
            { value: "save", label: "Save modes" },
          ] },
          { type: "select", key: "uploadAfterAction", title: "After phone/PC browse", desc: "What to do after a file is uploaded into Tagger.", options: [
            { value: "load", label: "Load it straight away" },
            { value: "save", label: "Load and open Save modes" },
            { value: "main", label: "Load and open Main tags" },
          ] },
          { type: "toggle", key: "preserveExistingAdvanced", title: "Preserve existing advanced tags", desc: "Keep extra tags already found in the file." },
        ],
      },
      {
        tab: "write",
        icon: "floppy-disk",
        title: "Save / Write Modes",
        desc: "Safety defaults for sidecar save, tagged copy and original replacement.",
        controls: [
          { type: "select", key: "defaultSaveMode", title: "Recommended save mode", desc: "The Save screen highlights this as the preferred action.", options: [
            { value: "sidecar", label: "Save BRMedia tags" },
            { value: "copy", label: "Write tagged copy" },
            { value: "download", label: "Write + download" },
          ] },
          { type: "toggle", key: "autoSaveSidecarBeforeWrite", title: "Save sidecar before writing copy", desc: "Keep category/BRMedia data synced before file writing." },
          { type: "toggle", key: "warnBeforeReplace", title: "Warn before replace original", desc: "Keep the big-boy replace button protected." },
        ],
      },
      {
        tab: "artwork",
        icon: "image",
        title: "Artwork Defaults",
        desc: "How Tagger handles embedded artwork and new cover images.",
        controls: [
          { type: "select", key: "artworkEmbedMode", title: "Artwork embed mode", desc: "Default behaviour when writing a tagged copy.", options: [
            { value: "keep", label: "Keep existing unless changed" },
            { value: "replace", label: "Replace when chosen" },
            { value: "clear", label: "Clear only when requested" },
          ] },
          { type: "number", key: "artworkMaxSize", title: "Artwork max size", desc: "Future resize target before embedding artwork.", min: 600, max: 3000, step: 100 },
        ],
      },
      {
        tab: "brtags",
        icon: "tags",
        title: "BRMedia Custom Tags",
        desc: "BRMEDIA_* tags stay the source of truth for Player category placement.",
        controls: [
          { type: "toggle", key: "autoFillBrandFromCategory", title: "Auto-fill brand from category", desc: "Blackburn Ravers/DJ NJ/Upalnite category sets matching brand image key." },
          { type: "select", key: "defaultReleaseType", title: "Default release type", desc: "Default BRMedia release type on new files.", options: [
            { value: "Mix", label: "Mix" },
            { value: "Radio Show", label: "Radio Show" },
            { value: "Free Song", label: "Free Song" },
            { value: "DJ MP3", label: "DJ MP3" },
            { value: "Master", label: "Master" },
            { value: "Other", label: "Other" },
          ] },
          { type: "select", key: "defaultTracklistStatus", title: "Default tracklist status", desc: "Initial tracklist status for new BRMedia tags.", options: [
            { value: "None", label: "None" },
            { value: "Uploaded", label: "Uploaded" },
            { value: "Auto scanned", label: "Auto scanned" },
            { value: "Needs review", label: "Needs review" },
            { value: "Complete", label: "Complete" },
          ] },
        ],
      },
      {
        tab: "category",
        icon: "folder-tree",
        title: "Category Rules",
        desc: "Keep the custom BRMedia category list clean and simple.",
        controls: [
          { type: "select", key: "defaultCategory", title: "Default BRMedia category", desc: "Used when a file does not clearly match a brand.", options: [
            { value: "Blackburn Ravers Mixes", label: "Blackburn Ravers Mixes" },
            { value: "DJ NJ Mixes", label: "DJ NJ Mixes" },
            { value: "Upalnite Mixes", label: "Upalnite Mixes" },
            { value: "Other Mixes", label: "Other Mixes" },
          ] },
        ],
      },
    ],
  },

  converter: {
    title: "Converter Settings",
    badge: "Convert",
    cards: [
      {
        tab: "overview",
        icon: "arrows-rotate",
        title: "Converter Status",
        desc: "Defaults are read by /converter on load and keep new conversions consistent.",
        options: [
          ["Batch conversion", "Sequential safe batch queue using current backend.", "On"],
          ["Result handoff", "Open finished files in Player, Tagger or Mastering.", "On"],
          ["Progress boxes", "Compact colour-fill process cards.", "On"],
          ["Non-destructive", "Outputs are new files unless explicitly changed later.", "Locked"],
        ],
      },
      {
        tab: "audio",
        icon: "music",
        title: "Audio Defaults",
        desc: "Default preset and audio quality for new Converter sessions.",
        controls: [
          { type: "select", key: "defaultPresetKey", title: "Default preset", desc: "Highlighted when Converter opens.", options: [
            { value: "mp3-320", label: "MP3 320" },
            { value: "wav", label: "WAV" },
            { value: "flac", label: "FLAC" },
            { value: "extract-audio", label: "Extract Audio" },
            { value: "mp4-fast", label: "MP4 Fast Start" },
          ] },
          { type: "select", key: "defaultAudioFormat", title: "Default audio format", desc: "Format used before choosing a preset.", options: [
            { value: "mp3", label: "MP3" },
            { value: "wav", label: "WAV" },
            { value: "flac", label: "FLAC" },
            { value: "m4a", label: "M4A" },
            { value: "aac", label: "AAC" },
            { value: "ogg", label: "OGG" },
            { value: "opus", label: "OPUS" },
          ] },
          { type: "select", key: "defaultAudioBitrate", title: "Default audio bitrate", desc: "Used for lossy audio formats.", options: [
            { value: "128k", label: "128k" },
            { value: "192k", label: "192k" },
            { value: "256k", label: "256k" },
            { value: "320k", label: "320k" },
            { value: "512k", label: "512k" },
          ] },
          { type: "select", key: "defaultChannels", title: "Default channels", desc: "Stereo is safest for Player/mobile.", options: [
            { value: "", label: "Keep source" },
            { value: "1", label: "Mono" },
            { value: "2", label: "Stereo" },
          ] },
        ],
      },
      {
        tab: "video",
        icon: "video",
        title: "Video Defaults",
        desc: "Browser/mobile-safe video conversion defaults.",
        controls: [
          { type: "select", key: "defaultVideoFormat", title: "Default video format", desc: "MP4 is best for mobile/web playback.", options: [
            { value: "mp4", label: "MP4" },
            { value: "mov", label: "MOV" },
            { value: "mkv", label: "MKV" },
            { value: "webm", label: "WEBM" },
          ] },
          { type: "select", key: "defaultCrf", title: "Default CRF", desc: "Lower is higher quality/larger files.", options: [
            { value: "18", label: "18 excellent" },
            { value: "20", label: "20 good" },
            { value: "23", label: "23 standard" },
            { value: "28", label: "28 smaller" },
          ] },
          { type: "select", key: "defaultPreset", title: "Encoder preset", desc: "Speed/quality balance.", options: [
            { value: "veryfast", label: "Very fast" },
            { value: "fast", label: "Fast" },
            { value: "medium", label: "Medium" },
            { value: "slow", label: "Slow" },
          ] },
          { type: "toggle", key: "fastStart", title: "MP4 fast start", desc: "Optimise MP4s for streaming/mobile playback." },
        ],
      },
      {
        tab: "batch",
        icon: "list-check",
        title: "Batch Conversion",
        desc: "Mass conversion queue behaviour.",
        controls: [
          { type: "toggle", key: "batchSequential", title: "Run batch safely in order", desc: "One file at a time to avoid server overload." },
          { type: "toggle", key: "keepBatchAfterDone", title: "Keep batch result cards", desc: "Leave finished process boxes visible after completion." },
        ],
      },
      {
        tab: "output",
        icon: "download",
        title: "Output Behaviour",
        desc: "Naming, add-to-library and progress behaviour.",
        controls: [
          { type: "text", key: "defaultOutputName", title: "Default output suffix/name", desc: "Used for new conversion jobs." },
          { type: "toggle", key: "addToLibrary", title: "Add audio output to Player", desc: "Successful audio outputs go back into BRMedia library." },
          { type: "toggle", key: "normalizeAudio", title: "Normalize audio by default", desc: "Use loudnorm for more even output." },
          { type: "toggle", key: "compactProgress", title: "Compact progress cards", desc: "Use colour-fill process boxes instead of long FFmpeg lines." },
          { type: "number", key: "historyLimit", title: "History limit", desc: "Future number of conversion jobs to keep.", min: 5, max: 200, step: 5 },
        ],
      },
      {
        tab: "handoff",
        icon: "share-nodes",
        title: "Result Handoff",
        desc: "Where to jump after a conversion finishes.",
        controls: [
          { type: "select", key: "openAfterDone", title: "After conversion completes", desc: "Default handoff behaviour.", options: [
            { value: "stay", label: "Stay in Converter" },
            { value: "player", label: "Open Player" },
            { value: "tagger", label: "Open Tagger" },
            { value: "mastering", label: "Open Mastering" },
          ] },
        ],
      },
    ],
  },

  mastering: {
    title: "Mastering Settings",
    badge: "Master",
    cards: [
      {
        icon: "sliders",
        title: "Mastering Chain",
        desc: "LANDR-style non-destructive mastering defaults.",
        options: [
          ["Loudness target", "Default streaming loudness target.", "-14 LUFS"],
          ["True peak ceiling", "Limiter safety ceiling.", "-1.0 dBTP"],
          ["Preserve metadata", "Carry source metadata into mastered copy.", "On"],
          ["Output suffix", "Keep mastered copies separate.", "_master"],
        ],
      },
      {
        icon: "waveform",
        title: "Analysis & Render",
        desc: "LUFS estimates, warnings, previews and render queue.",
        options: [
          ["Analysis first", "Run loudness/peak checks before render.", "On"],
          ["Preset recommendations", "Suggest chain from analysis.", "On"],
          ["A/B compare", "Original vs master preview.", "Planned"],
          ["Render history", "Keep mastered job history.", "Planned"],
        ],
      },
    ],
  },

  torrents: {
    title: "Torrents Settings",
    badge: "Torrent",
    cards: [
      {
        tab: "overview",
        icon: "magnet",
        title: "Torrents Module Status",
        desc: "Legal/authorised torrent queue, qBittorrent connection and BRMedia handoff defaults.",
        options: [
          ["Legal-only use", "Keep this module for authorised/public-domain torrents and your own files.", "Locked"],
          ["Queue / Files", "Queue controls stay in Torrents. Settings live here only.", "Centralised"],
          ["Pieces map", "uTorrent-style downloaded/downloading/missing piece display.", "On"],
          ["Transfer progress", "Audio/Video handoff shows live progress cards.", "Active"],
        ],
      },
      {
        tab: "engine",
        icon: "plug",
        title: "qBittorrent Engine",
        desc: "BRMedia talks to qBittorrent locally on the PC, while your phone uses BRMedia over Tailscale.",
        controls: [
          { type: "toggle", key: "engineEnabled", title: "Enable qBittorrent engine", desc: "Use qBittorrent Web API for real torrent downloads." },
          { type: "text", key: "engineUrl", title: "Web UI URL", desc: "Usually http://127.0.0.1:8080 on the BRMedia PC." },
          { type: "text", key: "engineUser", title: "Username", desc: "qBittorrent Web UI username." },
          { type: "text", key: "enginePass", title: "Password", desc: "qBittorrent Web UI password. Leave blank to keep current saved password." },
          { type: "text", key: "engineSavePath", title: "Default save path", desc: "Where qBittorrent stores downloads before BRMedia handoff." },
        ],
      },
      {
        tab: "files",
        icon: "folder-open",
        title: "Files / Library Handoff",
        desc: "Completed torrent files can be copied into Audio Player or Video Player safely.",
        controls: [
          { type: "select", key: "defaultTransferTarget", title: "Default transfer action", desc: "What completed-file buttons should prefer.", options: [
            { value: "ask", label: "Ask / show both" },
            { value: "audio", label: "Prefer Audio Player" },
            { value: "video", label: "Prefer Video Player" },
          ] },
          { type: "toggle", key: "showPiecesMap", title: "Show pieces map", desc: "Enable the Pieces tab in Torrents for qBittorrent chunk progress." },
        ],
        options: [
          ["MKV support", "MKV stays in Video library; MP4 copy is used for browser playback.", "Active"],
          ["Remove torrent only", "Delete torrent/magnet but keep downloaded files.", "Active"],
        ],
      },
      {
        tab: "bandwidth",
        icon: "gauge-high",
        title: "Bandwidth Limits",
        desc: "Stop downloads from lagging the network while you stream or browse.",
        controls: [
          { type: "number", key: "downloadLimitKb", title: "Download limit KB/s", desc: "0 means unlimited.", min: 0, max: 999999, step: 10 },
          { type: "number", key: "uploadLimitKb", title: "Upload limit KB/s", desc: "0 means unlimited.", min: 0, max: 999999, step: 10 },
          { type: "number", key: "slowModeDownloadKb", title: "Slow-mode download KB/s", desc: "Preset for quiet hours or streaming.", min: 0, max: 999999, step: 10 },
          { type: "number", key: "slowModeUploadKb", title: "Slow-mode upload KB/s", desc: "Preset upload cap for quiet hours.", min: 0, max: 999999, step: 10 },
        ],
      },
      {
        tab: "scheduler",
        icon: "calendar-clock",
        title: "Download Scheduler",
        desc: "Use separate weekday and weekend windows, plus an outside-hours mode.",
        controls: [
          { type: "toggle", key: "schedulerEnabled", title: "Enable scheduler", desc: "Apply the saved torrent schedule." },
          { type: "select", key: "schedulerMode", title: "Inside schedule", desc: "Choose what Torrents can do inside the active window.", options: [{ value: "download-and-seed", label: "Download and seed" }, { value: "download-only", label: "Download only" }, { value: "seed-only", label: "Seed only" }] },
          { type: "select", key: "schedulerOutsideMode", title: "Outside schedule", desc: "Pause or slow torrents outside the saved window.", options: [{ value: "paused", label: "Paused" }, { value: "slow", label: "Slow mode" }, { value: "normal", label: "Normal" }] },
          { type: "text", key: "schedulerWeekdayStart", title: "Weekday start", desc: "Mon-Fri start time, example 00:00." },
          { type: "text", key: "schedulerWeekdayEnd", title: "Weekday end", desc: "Mon-Fri end time, example 07:00." },
          { type: "text", key: "schedulerWeekendStart", title: "Weekend start", desc: "Sat-Sun start time, example 00:00." },
          { type: "text", key: "schedulerWeekendEnd", title: "Weekend end", desc: "Sat-Sun end time, example 10:00." },
        ],
      },
      {
        tab: "cache",
        icon: "hard-drive",
        title: "Disk Cache",
        desc: "Reduce hard-drive wear during large downloads.",
        controls: [
          { type: "toggle", key: "cacheEnabled", title: "Enable smart cache", desc: "Let qBittorrent use disk cache settings." },
          { type: "number", key: "cacheSizeMb", title: "Cache size MB", desc: "Disk cache size for torrent activity.", min: 0, max: 8192, step: 64 },
          { type: "toggle", key: "cacheWriteCoalesce", title: "Coalesce small writes", desc: "Group smaller writes where possible." },
          { type: "toggle", key: "cacheReduceDiskWear", title: "Reduce disk wear", desc: "Prefer settings that reduce heavy disk churn." },
        ],
      },
      {
        tab: "pieces",
        icon: "grip",
        title: "Pieces Map",
        desc: "uTorrent-style chunk map colours for downloaded/downloading/missing pieces.",
        options: [
          ["Downloaded", "Blue blocks show pieces already downloaded.", "Blue"],
          ["Downloading", "Orange blocks show active pieces being fetched.", "Orange"],
          ["Missing", "Dim blocks show pieces still needed.", "Dim"],
        ],
      },
      {
        tab: "safety",
        icon: "shield-check",
        title: "Security / Scanning",
        desc: "Keep BRMedia file-name checks enabled and allow honest Microsoft Defender custom scans where available.",
        controls: [
          { type: "toggle", key: "scanTorrentFiles", title: "Scan .torrent files", desc: "Check torrent files before queueing." },
          { type: "toggle", key: "scanDownloadedFiles", title: "Scan downloaded content", desc: "Keep downloaded-content checks enabled before handoff." },
          { type: "toggle", key: "blockSuspiciousFiles", title: "Block suspicious files", desc: "Stop obvious risky payloads before use." },
          { type: "toggle", key: "defenderDeepScan", title: "Enable Microsoft Defender deep scans", desc: "Allow Windows Security custom scans when Defender is installed." },
          { type: "toggle", key: "defenderDisableRemediation", title: "Report without automatic Defender remediation", desc: "Report custom-scan warnings without silently taking action." },
        ],
      },
      {
        tab: "quarantine",
        icon: "box-archive",
        title: "BRMedia Quarantine",
        desc: "Keep suspicious items away from the media library with explicit restore and permanent-delete actions.",
        controls: [
          { type: "toggle", key: "quarantineSuspiciousFiles", title: "Quarantine suspicious files", desc: "Allow BRMedia quarantine actions for downloaded files." },
          { type: "text", key: "quarantineFolder", title: "Quarantine folder", desc: "Default: C:\\BRMedia\\Quarantine." },
        ],
      },
      {
        tab: "notifications",
        icon: "bell",
        title: "Torrent Notifications",
        desc: "Choose which torrent events appear in BRMedia and which can request browser alerts.",
        controls: [
          { type: "toggle", key: "completionNotifications", title: "Completed download alerts", desc: "Notify when a torrent completes." },
          { type: "toggle", key: "blockedNotifications", title: "Blocked-file alerts", desc: "Notify when risky file names are detected." },
          { type: "toggle", key: "lowSeedNotifications", title: "Low-seed alerts", desc: "Warn when torrent health is poor." },
          { type: "toggle", key: "engineDisconnectedNotifications", title: "Engine disconnected alerts", desc: "Warn when qBittorrent becomes unavailable." },
          { type: "toggle", key: "diskSpaceNotifications", title: "Disk-space alerts", desc: "Reserve a central switch for low-space warnings." },
          { type: "toggle", key: "scanCompleteNotifications", title: "Scan complete alerts", desc: "Notify when BRMedia or Defender scans finish." },
          { type: "toggle", key: "transferCompleteNotifications", title: "Transfer complete alerts", desc: "Notify when library transfers complete." },
          { type: "toggle", key: "browserNotifications", title: "Browser notifications", desc: "Allow supported browsers to show optional alerts." },
          { type: "toggle", key: "inAppHistory", title: "Keep in-app history", desc: "Keep alerts visible in BRMedia history." },
        ],
      },
      {
        tab: "graph",
        icon: "chart-line",
        title: "Speed Graph",
        desc: "Set graph visibility, sampling and saved metric defaults.",
        controls: [
          { type: "toggle", key: "speedGraph", title: "Enable speed graph", desc: "Show the Graph tab in Torrents." },
          { type: "number", key: "speedGraphSampleIntervalSec", title: "Sample interval seconds", desc: "How often BRMedia should record a speed sample.", min: 2, max: 60, step: 1 },
          { type: "number", key: "speedGraphHistoryLength", title: "History samples", desc: "How many recent graph samples should remain visible.", min: 20, max: 600, step: 10 },
          { type: "toggle", key: "speedGraphShowTotals", title: "Show totals", desc: "Display total downloaded and uploaded values." },
          { type: "toggle", key: "speedGraphShowCurrent", title: "Show current speed", desc: "Display current speeds." },
          { type: "toggle", key: "speedGraphShowAverage", title: "Show average speed", desc: "Display recent averages." },
          { type: "toggle", key: "speedGraphShowPeak", title: "Show peak speed", desc: "Display recent peaks." },
        ],
      },
      {
        tab: "completed",
        icon: "circle-check",
        title: "Completed Downloads",
        desc: "File selection, transfer, Open Folder, Trackers and Peers remain runtime actions in Torrents.",
        options: [["Runtime page", "Open /torrents?tab=completed for completed-download actions.", "Live"]],
      },
      {
        tab: "scan-history",
        icon: "clock-rotate-left",
        title: "Security History",
        desc: "Review BRMedia quick checks, Microsoft Defender results and quarantined-file history.",
        options: [["Two layers", "BRMedia file-name checks stay separate from optional Defender custom scans.", "Active"]],
      },
      {
        tab: "protocols",
        icon: "network-wired",
        title: "Protocols",
        desc: "Magnet links and qBittorrent network features.",
        controls: [
          { type: "toggle", key: "magnetLinks", title: "Magnet links", desc: "Allow magnet links in BRMedia." },
          { type: "toggle", key: "upnp", title: "UPnP", desc: "Let qBittorrent request router port mapping." },
          { type: "toggle", key: "natPmp", title: "NAT-PMP", desc: "Alternative router port mapping support." },
          { type: "toggle", key: "protocolEncryption", title: "Protocol encryption", desc: "Use qBittorrent PE where available." },
          { type: "toggle", key: "ipv6", title: "IPv6", desc: "Enable IPv6 support where available." },
        ],
      },
    ],
  },
	
  server: {
    title: "Server Settings",
    badge: "Server",
    cards: [
      {
        icon: "server",
        title: "Sources & Storage",
        desc: "Local folders, allowed bases, cache and output storage.",
        options: [
          ["Audio source", "Default music/mix source folder.", "C:\\DJMixes"],
          ["Video source", "Default video source folder.", "C:\\Videos"],
          ["Output safety", "Only write inside allowed folders.", "Locked"],
          ["Cache data", "Metadata, artwork, waveforms and cloud links.", "On"],
        ],
      },
      {
        icon: "cloud",
        title: "Cloud & Imports",
        desc: "Google Drive, Dropbox, direct URL imports and source links.",
        options: [
          ["Google Drive", "Multiple linked accounts supported.", "On"],
          ["Dropbox", "Account linking and browsing supported.", "On"],
          ["Direct URL Import", "User-owned lawful direct files only.", "On"],
          ["Source Links", "SoundCloud/Mixcloud/Hearthis link storage.", "On"],
        ],
      },
      {
        icon: "mobile",
        title: "Network & Devices",
        desc: "Tailscale, phones, send-to-device and remote access.",
        options: [
          ["Tailscale access", "Phone access to local BRMedia server.", "On"],
          ["Device names", "Friendly phone/device names.", "Planned"],
          ["Server restart help", "Remote restart workflow.", "Planned"],
          ["PWA support", "Homescreen/mobile browser support.", "On"],
        ],
      },
    ],
  },

  stats: {
    title: "Stats Settings",
    badge: "Stats",
    cards: [
      {
        tab: "library",
        icon: "chart-pie",
        title: "Library Dashboard",
        desc: "Storage split, audio/video totals, formats, category and brand analytics.",
        options: [
          ["Audio + video totals", "Track all library files, sizes and browser readiness.", "Active"],
          ["Category charts", "Artist, brand, series and format splits.", "Active"],
          ["Storage warnings", "Find huge files, duplicate copies and cache growth.", "Active"],
          ["Export snapshots", "Save/share JSON reports for future compare.", "Active"],
        ],
      },
      {
        tab: "playback",
        icon: "chart-column",
        title: "Playback Analytics",
        desc: "Resume memory, completion, favourites, bookmarks and heavy-play media.",
        options: [
          ["Resume progress", "Use Player/Video memory to show currently watched/listened items.", "Active"],
          ["Favourites", "Report saved media and likely quick-access content.", "Active"],
          ["Bookmarks", "Track timestamp/bookmark use per module.", "Active"],
          ["Device handoff", "Send-to-device stats will feed here later.", "Planned"],
        ],
      },
      {
        tab: "storage",
        icon: "database",
        title: "Storage + Jobs",
        desc: "Converter, Mastering, MP4 copy jobs, waveforms and generated file pressure.",
        options: [
          ["Converter jobs", "Completed/failed/cancelled conversion job breakdown.", "Active"],
          ["Mastering jobs", "Rendered masters, preview history and queue health.", "Active"],
          ["Video MP4 copies", "Browser-copy jobs and MP4 readiness are included.", "Active"],
          ["Waveform/cache pressure", "Deeper cache reporting belongs here next.", "Planned"],
        ],
      },
      {
        tab: "cloud",
        icon: "cloud",
        title: "Cloud + Import Analytics",
        desc: "Google Drive, Dropbox, direct URL imports and cloud-only media status.",
        options: [
          ["Cloud linked files", "Report linked Google Drive/Dropbox files.", "Active"],
          ["Import history", "Direct URL and cloud import jobs feed job stats.", "Started"],
          ["Cloud-only streaming", "Future mode should have its own stats bucket.", "Planned"],
          ["Metadata success", "Show files missing artwork/tags after cloud import.", "Planned"],
        ],
      },
      {
        tab: "jobs",
        icon: "clock",
        title: "Job + Module History",
        desc: "Track what every BRMedia module is doing across the server.",
        options: [
          ["Conversion history", "Chart jobs, formats and output counts.", "Active"],
          ["Mastering history", "Chart renders, LUFS and presets.", "Active"],
          ["Torrent history", "Queue, speeds, pieces and transfer events show in Stats.", "Active"],
          ["Tagger history", "Changed tags, artwork and category changes.", "Planned"],
        ],
      },
    ],
  },
};

const brIconSvgCache = new Map();
let brIconHydrationQueue = [];
let brIconHydrationTimer = null;

function getBrIconNameFromElement(el) {
  if (!el || !el.classList) return "";
  const ignoredFaClasses = ["fa-solid", "fa-regular", "fa-brands", "fa-duotone", "fa-light", "fa-thin", "fa-sharp", "fa-spin", "fa-pulse", "fa-fw", "fa-lg", "fa-xl", "fa-2x"];
  const iconClass = Array.from(el.classList).find((className) => className.startsWith("fa-") && !ignoredFaClasses.includes(className));
  return iconClass ? iconClass.replace(/^fa-/, "") : "";
}

function getBrIconSvgName(iconName = "") {
  return BR_ICON_CLASS_MAP[iconName] || iconName || "";
}

function applyBrIconStateClasses(el) {
  el.classList.add("brSvgIconHost");
}

async function loadBrIconSvg(svgName) {
  if (brIconSvgCache.has(svgName)) return brIconSvgCache.get(svgName);

  const promise = (async () => {
    let lastError = null;
    for (const basePath of BR_ICON_BASE_PATHS) {
      try {
        const res = await fetch(`${basePath}${svgName}.svg`, { cache: "force-cache" });
        if (!res.ok) throw new Error(`Icon not found: ${basePath}${svgName}.svg`);
        const text = await res.text();
        const template = document.createElement("template");
        template.innerHTML = text.trim();
        const svg = template.content.querySelector("svg");
        if (!svg) throw new Error(`Invalid icon SVG: ${svgName}`);
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("focusable", "false");
        svg.classList.add("brSvgIconSvg");
        return svg.outerHTML;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error(`Icon not found: ${svgName}`);
  })();

  brIconSvgCache.set(svgName, promise);
  return promise;
}

async function hydrateBrIcon(el) {
  if (!el || el.nodeType !== 1 || !el.matches?.("i[class*='fa-']")) return;
  const iconName = getBrIconNameFromElement(el);
  const svgName = getBrIconSvgName(iconName);
  if (!svgName) return;

  applyBrIconStateClasses(el);

  if (el.dataset.brIconName === iconName && el.dataset.brIconSvg === svgName && el.dataset.brIconHydrated === "1") return;

  el.dataset.brIconName = iconName;
  el.dataset.brIconSvg = svgName;

  try {
    el.innerHTML = await loadBrIconSvg(svgName);
    el.dataset.brIconHydrated = "1";
  } catch {
    el.dataset.brIconHydrated = "0";
  }
}

function hydrateBrIcons(root = document) {
  if (window.BRMediaIcons?.safeHydrateIcons) {
    window.BRMediaIcons.safeHydrateIcons(root);
    return;
  }

  const nodes = root?.matches?.("i[class*='fa-']") ? [root] : Array.from(root?.querySelectorAll?.("i[class*='fa-']") || []);
  if (!nodes.length) return;

  brIconHydrationQueue.push(...nodes);
  if (brIconHydrationTimer) return;

  const runBatch = () => {
    const batch = brIconHydrationQueue.splice(0, 8);
    batch.forEach((node) => void hydrateBrIcon(node));

    if (brIconHydrationQueue.length) {
      brIconHydrationTimer = window.setTimeout(runBatch, 40);
      return;
    }

    brIconHydrationTimer = null;
  };

  brIconHydrationTimer = window.setTimeout(runBatch, 120);
}

function startBrIconHydrator() {
  const run = () => hydrateBrIcons(document);
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 1600 });
    return;
  }
  window.setTimeout(run, 900);
}

function iconHtml(icon) {
  return `<i class="fa-solid fa-${icon}"></i>`;
}

function readPersistedJson(key, fallback) {
  try {
    const rawLocal = localStorage.getItem(key);
    if (rawLocal) return JSON.parse(rawLocal);
  } catch {}

  try {
    const rawCookie = document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${key}=`));
    if (rawCookie) return JSON.parse(decodeURIComponent(rawCookie.slice(key.length + 1)));
  } catch {}

  return fallback;
}

function writePersistedJson(key, value) {
  const raw = JSON.stringify(value);
  try {
    localStorage.setItem(key, raw);
  } catch {}

  try {
    document.cookie = `${key}=${encodeURIComponent(raw)}; path=/; max-age=315360000; SameSite=Lax`;
  } catch {}
}

function loadPlayerSettings() {
  const saved = readPersistedJson(PLAYER_SETTINGS_KEY, null);
  if (!saved || typeof saved !== "object") return { ...PLAYER_SETTINGS_DEFAULTS };
  return {
    ...PLAYER_SETTINGS_DEFAULTS,
    ...saved,
    eqBands: {
      ...PLAYER_SETTINGS_DEFAULTS.eqBands,
      ...(saved.eqBands && typeof saved.eqBands === "object" ? saved.eqBands : {}),
    },
  };
}

function loadDevicePrefs() {
  const saved = readPersistedJson(DEVICE_PREFS_KEY, null);
  if (!saved || typeof saved !== "object") {
    return { ...DEVICE_PREFS_DEFAULTS, deviceId: createDeviceId() };
  }

  return {
    ...DEVICE_PREFS_DEFAULTS,
    ...saved,
    knownDevices: Array.isArray(saved.knownDevices) ? saved.knownDevices : [],
    deviceId: saved.deviceId || createDeviceId(),
  };
}

function loadTaggerSettings() {
  const saved = readPersistedJson(TAGGER_SETTINGS_KEY, null);
  return saved && typeof saved === "object" ? { ...TAGGER_SETTINGS_DEFAULTS, ...saved } : { ...TAGGER_SETTINGS_DEFAULTS };
}

function loadConverterSettings() {
  const saved = readPersistedJson(CONVERTER_SETTINGS_KEY, null);
  return saved && typeof saved === "object" ? { ...CONVERTER_SETTINGS_DEFAULTS, ...saved } : { ...CONVERTER_SETTINGS_DEFAULTS };
}


function loadTorrentSettings() {
  const saved =
    readPersistedJson(
      TORRENT_SETTINGS_KEY,
      null
    );

  return saved &&
    typeof saved === "object"
      ? {
          ...TORRENT_SETTINGS_DEFAULTS,
          ...saved,
        }
      : {
          ...TORRENT_SETTINGS_DEFAULTS,
        };
}

function loadVideoSettings() {
  const saved =
    readPersistedJson(
      VIDEO_SETTINGS_KEY,
      null
    );

  return saved &&
    typeof saved === "object"
      ? {
          ...VIDEO_SETTINGS_DEFAULTS,
          ...saved,
        }
      : {
          ...VIDEO_SETTINGS_DEFAULTS,
        };
}

let videoSettings =
  loadVideoSettings();

let taggerSettings = loadTaggerSettings();
let converterSettings = loadConverterSettings();
let torrentSettings = loadTorrentSettings();
let torrentSettingsLoaded = false;
let torrentSecurityLoaded = false;
let torrentSecurityLoading = false;
let torrentSecurityHistory = { scanHistory: [], quarantineHistory: [] };
let torrentDefenderStatus = null;
let torrentDefenderJobs = [];
let torrentDefenderPollTimer = 0;

function getTorrentSettingsSaveBody() {
  const engine = {
    enabled: !!torrentSettings.engineEnabled,
    baseUrl: torrentSettings.engineUrl || "http://127.0.0.1:8080",
    username: torrentSettings.engineUser || "",
    savePath: torrentSettings.engineSavePath || "C:\\BRMedia\\Torrents\\Downloads",
  };

  if (torrentSettings.enginePass && !String(torrentSettings.enginePass).includes("•")) {
    engine.password = torrentSettings.enginePass;
  }

  return {
    engine,
    bandwidth: {
      downloadLimitKb: Number(torrentSettings.downloadLimitKb || 0),
      uploadLimitKb: Number(torrentSettings.uploadLimitKb || 0),
      slowModeDownloadKb: Number(torrentSettings.slowModeDownloadKb || 512),
      slowModeUploadKb: Number(torrentSettings.slowModeUploadKb || 64),
    },
    scheduler: {
      enabled: !!torrentSettings.schedulerEnabled,
      mode: torrentSettings.schedulerMode || "download-and-seed",
      outsideMode: torrentSettings.schedulerOutsideMode || "slow",
      windows: [
        { day: "Mon-Fri", start: torrentSettings.schedulerWeekdayStart || "00:00", end: torrentSettings.schedulerWeekdayEnd || "07:00" },
        { day: "Sat-Sun", start: torrentSettings.schedulerWeekendStart || "00:00", end: torrentSettings.schedulerWeekendEnd || "10:00" },
      ],
    },
    cache: {
      enabled: !!torrentSettings.cacheEnabled,
      sizeMb: Number(torrentSettings.cacheSizeMb || 512),
      writeCoalesce: !!torrentSettings.cacheWriteCoalesce,
      reduceDiskWear: !!torrentSettings.cacheReduceDiskWear,
    },
    protocols: {
      magnetLinks: !!torrentSettings.magnetLinks,
      upnp: !!torrentSettings.upnp,
      natPmp: !!torrentSettings.natPmp,
      protocolEncryption: !!torrentSettings.protocolEncryption,
      ipv6: !!torrentSettings.ipv6,
    },
    security: {
      scanTorrentFiles: !!torrentSettings.scanTorrentFiles,
      scanDownloadedFiles: !!torrentSettings.scanDownloadedFiles,
      blockSuspiciousFiles: !!torrentSettings.blockSuspiciousFiles,
      quarantineSuspiciousFiles: !!torrentSettings.quarantineSuspiciousFiles,
      quarantineFolder: torrentSettings.quarantineFolder || "C:\\BRMedia\\Quarantine",
      defenderDeepScan: !!torrentSettings.defenderDeepScan,
      defenderDisableRemediation: !!torrentSettings.defenderDisableRemediation,
    },
    ui: {
      defaultTransferTarget: torrentSettings.defaultTransferTarget || "ask",
      showPiecesMap: torrentSettings.showPiecesMap !== false,
      browserNotifications: !!torrentSettings.browserNotifications,
      completionNotifications: !!torrentSettings.completionNotifications,
      blockedNotifications: !!torrentSettings.blockedNotifications,
      lowSeedNotifications: !!torrentSettings.lowSeedNotifications,
      engineDisconnectedNotifications: !!torrentSettings.engineDisconnectedNotifications,
      diskSpaceNotifications: !!torrentSettings.diskSpaceNotifications,
      scanCompleteNotifications: !!torrentSettings.scanCompleteNotifications,
      transferCompleteNotifications: !!torrentSettings.transferCompleteNotifications,
      inAppHistory: !!torrentSettings.inAppHistory,
      speedGraph: !!torrentSettings.speedGraph,
      speedGraphSampleIntervalSec: Number(torrentSettings.speedGraphSampleIntervalSec || 5),
      speedGraphHistoryLength: Number(torrentSettings.speedGraphHistoryLength || 120),
      speedGraphShowTotals: !!torrentSettings.speedGraphShowTotals,
      speedGraphShowCurrent: !!torrentSettings.speedGraphShowCurrent,
      speedGraphShowAverage: !!torrentSettings.speedGraphShowAverage,
      speedGraphShowPeak: !!torrentSettings.speedGraphShowPeak,
    },
  };
}

async function saveTorrentSettingsToServer() {
  writePersistedJson(TORRENT_SETTINGS_KEY, torrentSettings);
  try {
    const res = await fetch("/torrent/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(getTorrentSettingsSaveBody()),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Could not save torrent settings");
    showSettingsSaveNotice("Torrents settings saved.");
  } catch (err) {
    showSettingsSaveNotice(`Torrents settings saved locally, but server save failed: ${err?.message || err}`);
  }
}

function saveModuleSettings(moduleKey = "") {
  if (moduleKey === "video") {
    writePersistedJson(
      VIDEO_SETTINGS_KEY,
      videoSettings
    );

    showSettingsSaveNotice(
      "Video settings saved. Reopen Video Player if it is already open."
    );
  }

  if (moduleKey === "tagger") {
    writePersistedJson(TAGGER_SETTINGS_KEY, taggerSettings);
    showSettingsSaveNotice("Tagger settings saved. Reopen Tagger if it is already open.");
  }

  if (moduleKey === "converter") {
    writePersistedJson(CONVERTER_SETTINGS_KEY, converterSettings);
    showSettingsSaveNotice("Converter settings saved. Reopen Converter if it is already open.");
  }

  if (moduleKey === "torrents") {
    void saveTorrentSettingsToServer();
  }
}

function saveDevicePrefs(message = "Device settings saved.") {
  writePersistedJson(DEVICE_PREFS_KEY, devicePrefs);
  showSettingsSaveNotice(message);
}

function createDeviceId() {
  return `brm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadSourceLinks() {
  const saved = readPersistedJson(URL_SOURCE_LINKS_KEY, []);
  return Array.isArray(saved) ? saved : [];
}

function loadBookmarkPrefs() {
  const saved = readPersistedJson(BOOKMARK_PREFS_KEY, null);
  if (!saved || typeof saved !== "object") {
    return {
      autoName: playerSettings.bookmarkAutoName,
      groupByMix: playerSettings.bookmarkGroupByMix,
      showInTracklist: playerSettings.bookmarkShowInTracklist,
      saveNotes: playerSettings.bookmarkSaveNotes,
    };
  }
  return saved;
}

function saveBookmarkPrefs() {
  writePersistedJson(BOOKMARK_PREFS_KEY, {
    autoName: !!playerSettings.bookmarkAutoName,
    groupByMix: !!playerSettings.bookmarkGroupByMix,
    showInTracklist: !!playerSettings.bookmarkShowInTracklist,
    saveNotes: !!playerSettings.bookmarkSaveNotes,
  });
}

function loadPreviewSharePrefs() {
  const saved = readPersistedJson(PREVIEW_SHARE_PREFS_KEY, null);
  if (!saved || typeof saved !== "object") {
    return {
      defaultLength: playerSettings.previewShareDefaultLength,
      includeArtwork: playerSettings.previewShareIncludeArtwork,
      includeBranding: playerSettings.previewShareIncludeBranding,
      saveHistory: playerSettings.previewShareSaveHistory,
    };
  }
  return saved;
}

function savePreviewSharePrefs() {
  writePersistedJson(PREVIEW_SHARE_PREFS_KEY, {
    defaultLength: Number(playerSettings.previewShareDefaultLength || 30),
    includeArtwork: !!playerSettings.previewShareIncludeArtwork,
    includeBranding: !!playerSettings.previewShareIncludeBranding,
    saveHistory: !!playerSettings.previewShareSaveHistory,
  });
}

function savePlayerSettings() {
  writePersistedJson(PLAYER_SETTINGS_KEY, playerSettings);
  saveBookmarkPrefs();
  savePreviewSharePrefs();
  showSettingsSaveNotice();
}

function showSettingsSaveNotice(message = "Player settings saved. Reopen or reload Player if it is already open.") {
  if (!settingsSaveNotice) return;
  settingsSaveNotice.textContent = message;
  settingsSaveNotice.classList.add("show");
  window.clearTimeout(settingsSaveNoticeTimer);
  settingsSaveNoticeTimer = window.setTimeout(() => {
    settingsSaveNotice.classList.remove("show");
  }, 2200);
}

function clampNumber(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, Math.round(num)));
}

function clampPlaybackRate(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 1;
  return Math.max(0.5, Math.min(2, Math.round(num * 100) / 100));
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function settingControlHtml(control) {
  const value = control.source === "device" ? devicePrefs[control.key] : playerSettings[control.key];

  if (control.type === "toggle") {
    return `
      <label class="settingsLiveControl settingsLiveToggle">
        <span>
          <strong>${escapeHtml(control.title)}</strong>
          <em>${escapeHtml(control.desc)}</em>
        </span>
        <input type="checkbox" data-player-setting="${escapeHtml(control.key)}" data-source="${escapeHtml(control.source || "player")}" ${value ? "checked" : ""} />
      </label>
    `;
  }

  if (control.type === "number") {
    return `
      <label class="settingsLiveControl settingsLiveNumber">
        <span>
          <strong>${escapeHtml(control.title)}</strong>
          <em>${escapeHtml(control.desc)}</em>
        </span>
        <input
          type="number"
          inputmode="numeric"
          data-player-setting="${escapeHtml(control.key)}"
          data-source="${escapeHtml(control.source || "player")}"
          min="${control.min ?? 0}"
          max="${control.max ?? 999}"
          step="${control.step ?? 1}"
          value="${escapeHtml(value)}"
        />
      </label>
    `;
  }

  if (control.type === "text") {
    return `
      <label class="settingsLiveControl settingsLiveText">
        <span>
          <strong>${escapeHtml(control.title)}</strong>
          <em>${escapeHtml(control.desc)}</em>
        </span>
        <input
          type="text"
          data-player-setting="${escapeHtml(control.key)}"
          data-source="${escapeHtml(control.source || "player")}"
          value="${escapeHtml(value)}"
        />
      </label>
    `;
  }

  if (control.type === "select") {
    const options = (control.options || []).map((option) => `
      <option value="${escapeHtml(option.value)}" ${String(value) === String(option.value) ? "selected" : ""}>${escapeHtml(option.label)}</option>
    `).join("");

    return `
      <label class="settingsLiveControl settingsLiveSelect">
        <span>
          <strong>${escapeHtml(control.title)}</strong>
          <em>${escapeHtml(control.desc)}</em>
        </span>
        <select data-player-setting="${escapeHtml(control.key)}" data-source="${escapeHtml(control.source || "player")}">
          ${options}
        </select>
      </label>
    `;
  }

  return "";
}

function playerActionHtml(action) {
  const attrs = action.action
    ? `data-action="${escapeHtml(action.action)}"`
    : `data-route="${escapeHtml(action.route)}"`;

  return `
    <button class="settingsActionBtn settingsInlineAction ${action.secondary ? "secondary" : ""}" ${attrs} type="button">
      ${iconHtml(action.icon || "circle-play")}
      <span>${escapeHtml(action.label)}</span>
    </button>
  `;
}

function getModuleSettingsTarget(moduleKey = "") {
  if (moduleKey === "video") return videoSettings;
  if (moduleKey === "tagger") return taggerSettings;
  if (moduleKey === "converter") return converterSettings;
  if (moduleKey === "torrents") return torrentSettings;
  return {};
}

function moduleSettingControlHtml(control, moduleKey = "") {
  const target = getModuleSettingsTarget(moduleKey);
  const value = target[control.key];

  if (control.type === "toggle") {
    return `
      <label class="settingsLiveControl settingsLiveToggle">
        <span>
          <strong>${escapeHtml(control.title)}</strong>
          <em>${escapeHtml(control.desc)}</em>
        </span>
        <input type="checkbox" data-module-setting="${escapeHtml(control.key)}" data-module-settings-key="${escapeHtml(moduleKey)}" ${value ? "checked" : ""} />
      </label>
    `;
  }

  if (control.type === "number") {
    return `
      <label class="settingsLiveControl settingsLiveNumber">
        <span>
          <strong>${escapeHtml(control.title)}</strong>
          <em>${escapeHtml(control.desc)}</em>
        </span>
        <input
          type="number"
          inputmode="numeric"
          data-module-setting="${escapeHtml(control.key)}"
          data-module-settings-key="${escapeHtml(moduleKey)}"
          min="${control.min ?? 0}"
          max="${control.max ?? 9999}"
          step="${control.step ?? 1}"
          value="${escapeHtml(value)}"
        />
      </label>
    `;
  }

  if (control.type === "text") {
    return `
      <label class="settingsLiveControl settingsLiveText">
        <span>
          <strong>${escapeHtml(control.title)}</strong>
          <em>${escapeHtml(control.desc)}</em>
        </span>
        <input
          type="text"
          data-module-setting="${escapeHtml(control.key)}"
          data-module-settings-key="${escapeHtml(moduleKey)}"
          value="${escapeHtml(value)}"
        />
      </label>
    `;
  }

  if (control.type === "select") {
    return `
      <label class="settingsLiveControl settingsLiveSelect">
        <span>
          <strong>${escapeHtml(control.title)}</strong>
          <em>${escapeHtml(control.desc)}</em>
        </span>
        <select data-module-setting="${escapeHtml(control.key)}" data-module-settings-key="${escapeHtml(moduleKey)}">
          ${(control.options || []).map((option) => `
            <option value="${escapeHtml(option.value)}" ${String(value) === String(option.value) ? "selected" : ""}>${escapeHtml(option.label)}</option>
          `).join("")}
        </select>
      </label>
    `;
  }

  return "";
}

function updateModuleSettingFromField(field) {
  const moduleKey = field.dataset.moduleSettingsKey || "";
  const key = field.dataset.moduleSetting || "";
  const target = getModuleSettingsTarget(moduleKey);
  if (!key || !target) return;

  if (field.type === "checkbox") {
    target[key] = field.checked;
  } else if (field.type === "number") {
    target[key] = Number(field.value || 0);
  } else {
    target[key] = field.value;
  }

  saveModuleSettings(moduleKey);
}

function playerInfoRowHtml(row) {
  return `
    <div class="settingsInfoRow">
      <span>${escapeHtml(row.title)}</span>
      <strong>${escapeHtml(row.value)}</strong>
      <em>${escapeHtml(row.desc)}</em>
    </div>
  `;
}

function settingsToolHtml(toolName) {
  if (toolName === "upload") return uploadToolHtml();
  if (toolName === "waveforms") return waveformToolHtml();
  if (toolName === "backup") return backupToolHtml();
  return "";
}

function getCloudSyncPrefs() {
  if (!settingsUi.cloudSync || typeof settingsUi.cloudSync !== "object") {
    settingsUi.cloudSync = { defaultCategory: "auto", recursive: true, autoSync: false };
  }
  return settingsUi.cloudSync;
}

function setCloudSyncPref(key, value) {
  const prefs = getCloudSyncPrefs();
  prefs[key] = value;
  writePersistedJson(SETTINGS_UI_KEY, settingsUi);
  showSettingsSaveNotice("Cloud sync preference saved.");
}

function cloudSyncCategoryOptionsHtml(value = "auto") {
  return CLOUD_SYNC_CATEGORY_OPTIONS.map((option) => `
    <option value="${escapeHtml(option.value)}" ${String(value || "auto") === option.value ? "selected" : ""}>${escapeHtml(option.label)}</option>
  `).join("");
}

function guessCloudSyncCategoryFromTitle(title = "") {
  const text = String(title || "").toLowerCase();
  if (/hardcore\s*medley|\bthm\b/.test(text)) return "hardcore-medley-series";
  if (/\bhtid\b|hardcore till i die|weekender/.test(text)) return "htid-mixes";
  if (/free\s*songs?|giveaway/.test(text)) return "free-songs";
  if (/dj\s*nj|\bnj\b/.test(text)) return "dj-nj-mixes";
  if (/upalnite|\bup\b/.test(text)) return "upalnite-mixes";
  if (/blackburn\s*ravers|\bbr\b|brmedia/.test(text)) return "blackburn-ravers-mixes";
  return "dj-mp3s-wavs";
}

function getCloudSyncCategoryForPayload(title = "") {
  const selected = getCloudSyncPrefs().defaultCategory || "auto";
  return selected === "auto" ? guessCloudSyncCategoryFromTitle(title) : selected;
}

function getCloudSyncPrimaryBrand(category = "") {
  return CLOUD_SYNC_CATEGORY_BRANDS[category] || "";
}

function settingsUploadTargetLabel(target = settingsUploadTarget) {
  const labels = {
    auto: "Automatic sorting",
    audio: "Audio library",
    video: "Video library",
    support: "Supporting files",
  };

  return labels[target] || labels.auto;
}

function bindSettingsUploadInput() {
  const input = document.getElementById("settingsUploadInput");

  if (input && input.dataset.brmediaBound !== "1") {
    input.dataset.brmediaBound = "1";

    input.addEventListener("change", (event) => {
      settingsUploadQueue = Array.from(event.target.files || []);
      settingsUploadStatus = [];
      renderSettingsUploadQueue();
    });
  }

  document.querySelectorAll("[data-upload-target]").forEach((button) => {
    button.addEventListener("click", () => {
      settingsUploadTarget =
        button.dataset.uploadTarget || "auto";

      document
        .querySelectorAll("[data-upload-target]")
        .forEach((item) => {
          item.classList.toggle(
            "is-active",
            item.dataset.uploadTarget === settingsUploadTarget
          );
        });

      renderSettingsUploadQueue();
    });
  });

  document.querySelectorAll("[data-upload-hub-tab]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();

      renderSettingsTab(
        "cloud",
        button.dataset.uploadHubTab || "add-files"
      );
    });
  });

  document.querySelectorAll("[data-upload-hub-route]").forEach((button) => {
    button.addEventListener("click", () => {
      goToRoute(
        button.dataset.uploadHubRoute || "/"
      );
    });
  });
}

function openSettingsUploadPicker() {
  const input = document.getElementById("settingsUploadInput");

  if (!input) return;

  input.value = "";
  input.click();
}

function uploadMediaHubHtml() {
  const tiles = [
    [
      "audio",
      "file-audio",
      "Upload audio",
      "Add songs, mixes, WAVs and FLAC files to the Audio Player library.",
    ],
    [
      "video",
      "film",
      "Upload video",
      "Add films or shows to the Video Player library and refresh posters later.",
    ],
    [
      "support",
      "file-lines",
      "Supporting files",
      "Upload tracklists, cue sheets, artwork, subtitles and playlist files.",
    ],
  ];

  return `
    <div class="settingsUploadHub">
      <div class="settingsUploadHubGrid">
        ${tiles.map(([target, icon, title, desc]) => `
          <button
            class="settingsUploadHubTile ${settingsUploadTarget === target ? "is-active" : ""}"
            data-upload-target="${target}"
            type="button"
          >
            <span>${iconHtml(icon)}</span>
            <strong>${escapeHtml(title)}</strong>
            <em>${escapeHtml(desc)}</em>
          </button>
        `).join("")}

        <button class="settingsUploadHubTile" data-upload-hub-tab="google" type="button">
          <span>${iconHtml("google-drive")}</span>
          <strong>Google Drive</strong>
          <em>Browse linked Drive accounts and import selected files.</em>
        </button>

        <button class="settingsUploadHubTile" data-upload-hub-tab="dropbox" type="button">
          <span>${iconHtml("dropbox")}</span>
          <strong>Dropbox</strong>
          <em>Browse Dropbox accounts and import selected files.</em>
        </button>

        <button class="settingsUploadHubTile" data-upload-hub-tab="import" type="button">
          <span>${iconHtml("cloud-arrow-down")}</span>
          <strong>Direct URL</strong>
          <em>Import lawful direct links for files you own or are authorised to use.</em>
        </button>

        <button class="settingsUploadHubTile" data-upload-hub-route="/torrents?tab=add" type="button">
          <span>${iconHtml("magnet")}</span>
          <strong>Torrent downloads</strong>
          <em>Open the legal torrent module to add an authorised download.</em>
        </button>

        <button class="settingsUploadHubTile" data-upload-hub-route="/torrents?tab=queue&filter=complete" type="button">
          <span>${iconHtml("folder-arrow-down")}</span>
          <strong>Completed torrents</strong>
          <em>Open finished downloads ready for Audio or Video library transfer.</em>
        </button>

        <a class="settingsUploadHubTile settingsUploadHubLink" data-upload-hub-tab="files" href="/settings?module=cloud&amp;tab=files">
          <span>${iconHtml("folder-open")}</span>
          <strong>View files</strong>
          <em>Manage uploaded and imported media after it lands in BRMedia.</em>
        </a>
      </div>

      <p class="settingsUploadHubNote">
        ${iconHtml("circle-info")}
        Uploaded audio and video now go into the default library destination set in Library Sources. Supporting files stay together in BRMedia Uploads for later attachment.
      </p>
    </div>
  `;
}

function uploadToolHtml() {
  const targets = [
    [
      "auto",
      "wand-magic-sparkles",
      "Automatic",
      "Detect audio, video or supporting file type.",
    ],
    [
      "audio",
      "file-audio",
      "Audio",
      "Send every selected file to the Audio library.",
    ],
    [
      "video",
      "film",
      "Video",
      "Send every selected file to the Video library.",
    ],
    [
      "support",
      "paperclip",
      "Support",
      "Keep tracklists, artwork, subtitles and playlists together.",
    ],
  ];

  return `
    <div class="settingsToolPanel settingsUploadProPanel">
      <input
        id="settingsUploadInput"
        class="settingsHiddenInput"
        type="file"
        multiple
        accept="audio/*,video/*,image/*,.mp3,.wav,.flac,.m4a,.aac,.ogg,.opus,.mp4,.mov,.mkv,.webm,.avi,.m4v,.wmv,.vob,.mpg,.mpeg,.txt,.cue,.m3u,.m3u8,.pls,.json,.jpg,.jpeg,.png,.webp,.srt,.vtt"
      />

      <div class="settingsUploadTargetGrid">
        ${targets.map(([target, icon, title, desc]) => `
          <button
            class="settingsUploadTargetBtn ${settingsUploadTarget === target ? "is-active" : ""}"
            data-upload-target="${target}"
            type="button"
          >
            ${iconHtml(icon)}

            <span>
              <strong>${title}</strong>
              <em>${desc}</em>
            </span>
          </button>
        `).join("")}
      </div>

      <div class="settingsToolActions">
        <button class="settingsToolBtn primary" data-action="pick-upload-files" type="button">
          ${iconHtml("folder-plus")}
          <span>Choose files</span>
        </button>

        <button class="settingsToolBtn" data-action="start-upload-files" type="button">
          ${iconHtml("cloud-arrow-up")}
          <span>Start upload</span>
        </button>
      </div>

      <div id="settingsUploadSummary" class="settingsToolSummary">
        No files selected yet. Destination: ${escapeHtml(settingsUploadTargetLabel())}.
      </div>

      <div id="settingsUploadList" class="settingsJobList"></div>
    </div>
  `;
}

function waveformToolHtml() {
  const selectedCount = Number(playerSettings.waveformPeakCount || 1200);
  const processModes = [
    { value: 420, label: "Fast mobile preview", detail: "Quick check / smaller cache" },
    { value: 1200, label: "Standard pro", detail: "Recommended for normal use" },
    { value: 2400, label: "High detail", detail: "Cleaner long-mix display" },
    { value: 4200, label: "Ultra detail", detail: "Slower but maximum detail" },
  ];

  return `
    <div class="settingsToolPanel settingsWaveformProPanel">
      <div class="settingsWaveformHero settingsWaveformHeroWide">
        <div class="settingsWaveformHeroIcon">${iconHtml("waveform")}</div>
        <div>
          <strong>Waveform Generator</strong>
          <span>Server-side FFmpeg peaks with live progress, cache health, process modes, retry controls and green success states.</span>
        </div>
      </div>

      <div id="settingsWaveformHealthGrid" class="settingsWaveformStatsGrid">
        ${playerInfoRowHtml({ title: "Generated", value: "…", desc: "Cached waveform peaks ready to use." })}
        ${playerInfoRowHtml({ title: "Missing", value: "…", desc: "Files that still need waveform peaks." })}
        ${playerInfoRowHtml({ title: "Failed", value: "…", desc: "Failed jobs saved for retry." })}
      </div>

      <div class="settingsWaveformControlsGrid settingsWaveformControlsGridPro">
        <label class="settingsToolLabel settingsWaveformField" for="settingsWaveformTrackSelect">
          <span>Selected file</span>
          <select id="settingsWaveformTrackSelect" class="settingsToolSelect">
            <option value="">Loading library…</option>
          </select>
        </label>

        <label class="settingsToolLabel settingsWaveformField" for="settingsWaveformProcessMode">
          <span>Process mode</span>
          <select id="settingsWaveformProcessMode" class="settingsToolSelect">
            ${processModes.map((mode) => `
              <option value="${mode.value}" ${selectedCount === mode.value ? "selected" : ""}>${escapeHtml(mode.label)} — ${escapeHtml(mode.detail)}</option>
            `).join("")}
          </select>
        </label>
      </div>

      <div class="settingsToolActions settingsToolActionsFour settingsWaveformActionGrid">
        <button class="settingsToolBtn primary" data-action="waveform-generate-current" type="button">
          ${iconHtml("waveform")}
          <span>Generate selected</span>
        </button>
        <button class="settingsToolBtn" data-action="waveform-rebuild-current" type="button">
          ${iconHtml("rotate-left")}
          <span>Rebuild selected</span>
        </button>
        <button class="settingsToolBtn" data-action="waveform-generate-missing" type="button">
          ${iconHtml("circle-check")}
          <span>Generate missing</span>
        </button>
        <button class="settingsToolBtn dangerSoft" data-action="waveform-rebuild-all" type="button">
          ${iconHtml("arrows-rotate")}
          <span>Rebuild all</span>
        </button>
      </div>

      <div class="settingsToolActions settingsToolActionsFour settingsWaveformActionGrid secondaryWaveActions">
        <button class="settingsToolBtn" data-action="waveform-retry-failed" type="button">
          ${iconHtml("rotate-right")}
          <span>Retry failed</span>
        </button>
        <button class="settingsToolBtn" data-action="waveform-refresh-health" type="button">
          ${iconHtml("chart-column")}
          <span>Refresh health</span>
        </button>
        <button class="settingsToolBtn" data-action="waveform-clear-failed" type="button">
          ${iconHtml("trash")}
          <span>Clear failed</span>
        </button>
        <button class="settingsToolBtn danger" data-action="waveform-clear-cache" type="button">
          ${iconHtml("trash")}
          <span>Clear cache</span>
        </button>
      </div>

      <div id="settingsWaveformSummary" class="settingsToolSummary settingsWaveformSummary">Choose a file or run an all-files job.</div>
      <div id="settingsWaveformJobs" class="settingsJobList settingsWaveformJobList">
        <div class="settingsJobEmpty">No waveform jobs running.</div>
      </div>
    </div>
  `;
}

function backupToolHtml() {
  return `
    <div class="settingsToolPanel">
      <div class="settingsChecklist">
        <label><span>Player settings</span><input type="checkbox" data-backup-section="settings" checked /></label>
        <label><span>Device preferences</span><input type="checkbox" data-backup-section="devices" checked /></label>
        <label><span>Source links</span><input type="checkbox" data-backup-section="sourceLinks" checked /></label>
        <label><span>Preview / bookmark prefs</span><input type="checkbox" data-backup-section="sharing" checked /></label>
        <label><span>Server data where available</span><input type="checkbox" data-backup-section="server" checked /></label>
      </div>

      <div class="settingsToolActions">
        <button class="settingsToolBtn primary" data-action="backup-selected" type="button">
          ${iconHtml("floppy-disk")}
          <span>Export selected backup</span>
        </button>
        <button class="settingsToolBtn" data-action="backup-browser" type="button">
          ${iconHtml("database")}
          <span>Export browser data only</span>
        </button>
        <button class="settingsToolBtn" data-route="/settings?module=cloud&tab=data-import" type="button">
          ${iconHtml("file-import")}
          <span>Import / recover backup</span>
        </button>
      </div>

      <div id="settingsBackupSummary" class="settingsToolSummary">Ready to export a BRMedia backup.</div>
    </div>
  `;
}

function dataImportToolHtml() {
  return `
    <div class="settingsToolPanel settingsDataImportPanel">
      <input id="settingsDataImportInput" class="settingsHiddenInput" type="file" accept="application/json,.json" />

      <div class="settingsDataImportHero">
        <span class="settingsDataImportHeroIcon">${iconHtml("file-import")}</span>
        <div>
          <strong>Recover BRMedia Backup</strong>
          <em>Import a BRMedia backup JSON to recover browser settings, device prefs, source links, playlists/bookmarks where present, and server data such as tracklists/waveforms when the backup contains them.</em>
        </div>
      </div>

      <div class="settingsChecklist settingsDataImportChecklist">
        <label><span>Browser settings / Player prefs</span><input type="checkbox" data-restore-section="browser" checked /></label>
        <label><span>Device preferences</span><input type="checkbox" data-restore-section="devices" checked /></label>
        <label><span>Source links</span><input type="checkbox" data-restore-section="sourceLinks" checked /></label>
        <label><span>Bookmarks / Preview prefs</span><input type="checkbox" data-restore-section="sharing" checked /></label>
        <label><span>Server restore where available</span><input type="checkbox" data-restore-section="server" checked /></label>
      </div>

      <div class="settingsToolActions">
        <button class="settingsToolBtn primary" data-action="data-import-pick" type="button">
          ${iconHtml("file-import")}
          <span>Choose backup file</span>
        </button>
        <button class="settingsToolBtn" data-action="data-import-apply" type="button">
          ${iconHtml("cloud-arrow-up")}
          <span>Restore selected data</span>
        </button>
      </div>

      <div id="settingsDataImportSummary" class="settingsToolSummary">Choose a BRMedia backup JSON file to preview before restoring.</div>
      <div id="settingsDataImportPreview" class="settingsDataImportPreview"></div>
    </div>
  `;
}

function getPlayerSettingsTabDefinition(tabKey = "overview") {
  const repeatOptions = [
    { value: "off", label: "Off" },
    { value: "all", label: "Repeat all" },
    { value: "one", label: "Repeat one" },
  ];

  const speedOptions = [
    { value: 0.5, label: "0.50x" },
    { value: 0.75, label: "0.75x" },
    { value: 0.9, label: "0.90x" },
    { value: 1, label: "1.00x normal" },
    { value: 1.1, label: "1.10x" },
    { value: 1.25, label: "1.25x" },
    { value: 1.5, label: "1.50x" },
    { value: 1.75, label: "1.75x" },
    { value: 2, label: "2.00x" },
  ];

  const eqPresetOptions = [
    { value: "flat", label: "Flat" },
    { value: "club", label: "Club" },
    { value: "bass_boost", label: "Bass boost" },
    { value: "vocal_cut", label: "Vocal cut" },
    { value: "bright", label: "Bright" },
    { value: "warm", label: "Warm" },
    { value: "custom", label: "Custom" },
  ];

  const waveformOptions = [
    { value: "bars", label: "Bars" },
    { value: "smooth", label: "Smooth line" },
    { value: "compact", label: "Compact" },
    { value: "hidden", label: "Hidden" },
  ];

  const scanOptions = [
    { value: "light", label: "Light" },
    { value: "balanced", label: "Balanced" },
    { value: "deep", label: "Deep" },
  ];

  const duplicateOptions = [
    { value: "keep-both", label: "Keep both files" },
    { value: "rename-new", label: "Rename new upload" },
    { value: "skip", label: "Skip duplicate" },
  ];

  const afterUploadOptions = [
    { value: "stay", label: "Stay in Settings" },
    { value: "player", label: "Open Player" },
    { value: "tagger", label: "Open Tagger" },
  ];

  const definitions = {
    overview: {
      title: "Player Overview",
      desc: "The Audio Player settings are now being moved properly into Universal Settings.",
      cards: [
        {
          icon: "music",
          title: "Core Player Behaviour",
          desc: "Live settings saved into brmedia_settings_v2.",
          controls: [
            { type: "toggle", key: "saveState", title: "Resume last track / mix", desc: "Restore the last loaded Player state when BRMedia opens." },
            { type: "toggle", key: "savePos", title: "Save playback position", desc: "Remember each mix/song position for resume and progress." },
            { type: "toggle", key: "backgroundAudio", title: "Background / lock-screen audio", desc: "Use browser audio features for background playback and lock-screen behaviour where supported." },
            { type: "toggle", key: "mediaSessionControls", title: "Enhanced media controls", desc: "Enable lock-screen, Bluetooth, headset, keyboard and car-control integration where supported." },
          ],
        },
        {
          icon: "gauge-high",
          title: "Professional Player Tools",
          desc: "The old Player settings tools are being moved here into proper panels.",
          info: [
            { title: "Uploads", value: "Moved here", desc: "Upload queue and add-to-library defaults live in Universal Settings." },
            { title: "Waveforms", value: "Moved here", desc: "Generate selected, all missing, or rebuild all waveform peaks." },
            { title: "Devices", value: "Moved here", desc: "Device names, accept/decline and remote handoff settings." },
            { title: "Backup", value: "Moved here", desc: "Browser/server backup export controls." },
          ],
          actions: [
            { label: "Open Audio Player", route: "/player", icon: "music" },
            { label: "Reset Player settings", action: "reset-player-settings", icon: "rotate-left", secondary: true },
          ],
        },
      ],
    },

    playback: {
      title: "Playback Controls",
      desc: "Core playback behaviour, queue movement, speed and transport controls.",
      cards: [
        {
          icon: "sliders",
          title: "Queue & Transport",
          desc: "These match the current Player settings store.",
          controls: [
            { type: "toggle", key: "shuffle", title: "Shuffle queue", desc: "Keep shuffle enabled for the Player queue." },
            { type: "select", key: "repeatMode", title: "Repeat mode", desc: "Choose off, repeat all, or repeat one.", options: repeatOptions },
            { type: "select", key: "playbackRate", title: "Default playback speed", desc: "Sets the saved Player speed value.", options: speedOptions },
            { type: "toggle", key: "autoplay", title: "Autoplay next track", desc: "Keep playback moving through the queue." },
          ],
        },
        {
          icon: "stopwatch-20",
          title: "Seek Buttons",
          desc: "Controls the back/forward skip buttons in the Player.",
          controls: [
            { type: "number", key: "skipBackSec", title: "Skip back seconds", desc: "Allowed range: 5 to 120 seconds.", min: 5, max: 120, step: 1 },
            { type: "number", key: "skipFwdSec", title: "Skip forward seconds", desc: "Allowed range: 5 to 120 seconds.", min: 5, max: 120, step: 1 },
            { type: "toggle", key: "downloads", title: "Show download controls", desc: "Show/hide download buttons where the Player allows it." },
          ],
        },
      ],
    },
		
    equaliser: {
      title: "Equaliser",
      desc: "Live EQ defaults saved into the Player settings store. The locked Player EQ popup layout stays untouched.",
      cards: [
        {
          icon: "sliders",
          title: "EQ Defaults",
          desc: "These values load into the Player EQ system when the Player opens.",
          controls: [
            { type: "toggle", key: "eqEnabled", title: "Enable EQ", desc: "Turn the Player equaliser on by default." },
            { type: "select", key: "eqPreset", title: "EQ preset", desc: "Choose the starting EQ preset for the Player.", options: eqPresetOptions },
            { type: "number", key: "eqPreamp", title: "EQ preamp", desc: "Overall preamp gain from -12 dB to +12 dB.", min: -12, max: 12, step: 1 },
          ],
        },
        {
          icon: "music",
          title: "EQ Band Store",
          desc: "Detailed band sliders stay inside the Player EQ popup, but the Universal Settings backup/export includes the stored band values.",
          info: [
            { title: "Preset", value: playerSettings.eqPreset || "flat", desc: "Current saved preset." },
            { title: "Preamp", value: `${Number(playerSettings.eqPreamp || 0)} dB`, desc: "Current saved preamp." },
            { title: "Band values", value: "Saved", desc: "10-band EQ values remain in brmedia_settings_v2." },
          ],
          actions: [
            { label: "Open Player EQ", route: "/player", icon: "sliders" },
          ],
        },
      ],
    },

    uploads: {
      title: "Upload Defaults",
      desc: "Set Player upload behaviour here. Add actual media through the single Upload Media Hub.",
      cards: [
        {
          icon: "folder-plus",
          title: "Upload Defaults",
          desc: "Controls how uploaded media should behave after it lands in BRMedia.",
          controls: [
            { type: "toggle", key: "uploadAddToLibrary", title: "Add uploads to Player library", desc: "After upload, make the file available in the Player library." },
            { type: "toggle", key: "uploadAcceptTracklists", title: "Allow tracklist/text uploads", desc: "Accept .txt/.cue/.m3u style supporting files when uploading." },
            { type: "toggle", key: "uploadAutoScanTracklist", title: "Auto-scan uploaded tracklists", desc: "Try to attach uploaded tracklists to matching media." },
            { type: "select", key: "uploadDuplicateMode", title: "Duplicate filename handling", desc: "Choose what happens when a file name already exists.", options: duplicateOptions },
            { type: "select", key: "uploadAfterAction", title: "After upload", desc: "Choose what BRMedia does after upload completes.", options: afterUploadOptions },
          ],
        },
        {
          icon: "upload",
          title: "One Upload Media Hub",
          desc: "Use the central hub for device uploads, Google Drive, Dropbox, lawful direct URLs, authorised torrents, supporting files and View Files.",
          info: [
            { title: "Local uploads", value: "Centralised", desc: "Audio, video and supporting files use one upload queue." },
            { title: "Cloud + URL imports", value: "Linked", desc: "Drive, Dropbox and lawful direct links open from the same hub." },
            { title: "Completed torrents", value: "Linked", desc: "Transfer authorised completed downloads into Audio or Video." },
            { title: "Source Links", value: `${loadSourceLinks().length}`, desc: "Saved SoundCloud/Mixcloud/Hearthis/other reference links." },
          ],
          actions: [
            { label: "Open Upload Media Hub", route: "/settings?module=cloud&tab=add-files", icon: "upload" },
            { label: "View Files", route: "/settings?module=cloud&tab=files", icon: "folder-open", secondary: true },
          ],
        },
      ],
    },

    waveforms: {
      title: "Waveform Manager",
      desc: "Generate accurate server-side waveform peaks with proper progress panels.",
      cards: [
        {
          icon: "waveform",
          title: "Waveform Display",
          desc: "Controls how the Player uses and displays waveform data.",
          controls: [
            { type: "toggle", key: "useRealWaveformPeaks", title: "Use real waveform peaks", desc: "Use cached server peaks where available instead of fake/basic visual bars." },
            { type: "select", key: "waveformDisplayMode", title: "Waveform display mode", desc: "Choose the visual style used by the Player.", options: waveformOptions },
            { type: "select", key: "waveformHeightMode", title: "Waveform height", desc: "Choose compact, normal or large waveform height.", options: [
              { value: "compact", label: "Compact" },
              { value: "normal", label: "Normal" },
              { value: "large", label: "Large" },
            ] },
            { type: "select", key: "waveformDensityMode", title: "Waveform density", desc: "Choose how detailed the Player waveform should look.", options: [
              { value: "low", label: "Low" },
              { value: "standard", label: "Standard" },
              { value: "high", label: "High" },
              { value: "ultra", label: "Ultra" },
            ] },
            { type: "toggle", key: "waveformAllowSeeking", title: "Allow waveform seeking", desc: "Let users tap/click the waveform to jump through a mix." },
            { type: "toggle", key: "waveformFallbackBars", title: "Fallback to simple bars", desc: "Show basic bars when real peaks are not generated yet." },
          ],
        },
        {
          icon: "waveform",
          title: "Generate / Rebuild Peaks",
          desc: "Pick one file, generate all missing, retry failed, or rebuild the whole cache.",
          controls: [
            { type: "toggle", key: "waveformAutoGenerateOnUpload", title: "Auto-generate after upload", desc: "Queue waveform peaks when files are uploaded from Settings." },
            { type: "toggle", key: "waveformAutoGenerateOnImport", title: "Auto-generate after cloud import", desc: "Queue waveform peaks after Google Drive/Dropbox/direct imports finish." },
            { type: "toggle", key: "waveformGenerateOnFirstPlay", title: "Generate on first play", desc: "Start a waveform job the first time a missing track is played." },
            { type: "toggle", key: "waveformShowInMiniPlayer", title: "Show in Mini Player", desc: "Allow mini waveform/progress visuals in compact Player areas." },
            { type: "toggle", key: "waveformShowInFileManager", title: "Show in File Manager", desc: "Show waveform/cache status in the Files view." },
          ],
          tool: "waveforms",
        },
      ],
    },

    tracklists: {
      title: "Tracklists & Timestamp Scan",
      desc: "Editing safety, timestamp scan defaults and name-detection setup.",
      cards: [
        {
          icon: "list-timeline",
          title: "Tracklist Editing",
          desc: "Protects tracklists from accidental taps and edits.",
          controls: [
            { type: "toggle", key: "tracklistEditLocked", title: "Tracklist edit lock", desc: "Keep editing locked until you deliberately unlock it." },
            { type: "select", key: "autoTimestampScanDefault", title: "Auto timestamp scan default", desc: "Default strength for FFmpeg timestamp scanning.", options: scanOptions },
            { type: "toggle", key: "tracklistNameDetectDefault", title: "Track name detection suggestions", desc: "Show local library match suggestions for Unknown Track rows." },
          ],
        },
        {
          icon: "magnifying-glass-chart",
          title: "Scan Workflow",
          desc: "Keeps everything non-destructive.",
          info: [
            { title: "Light", value: "Fast", desc: "Quicker scan, fewer suggested changes." },
            { title: "Balanced", value: "Recommended", desc: "Best default for mixes." },
            { title: "Deep", value: "Slow", desc: "More aggressive and may find false positives." },
          ],
          actions: [
            { label: "Open Audio Player", route: "/player", icon: "music" },
          ],
        },
      ],
    },

    library: {
      title: "Library & Categories",
      desc: "Brand rules, short-audio placement, and the BRMedia tag-first direction.",
      cards: [
        {
          icon: "folder-open",
          title: "Category Rules",
          desc: "These rules drive cleaner Player library placement.",
          controls: [
            { type: "toggle", key: "brMediaTagPriority", title: "Use BRMedia tags first", desc: "Prefer BRMEDIA_* custom tags over filename/path guessing." },
            { type: "toggle", key: "artistMultiMembership", title: "Artist multi-membership", desc: "Let Upalnite/DJ NJ/Blackburn Ravers appear in artist folders as well as series folders." },
            { type: "toggle", key: "shortAudioRules", title: "Short audio category rules", desc: "Under 10 mins + BRMedia branding goes to Free Songs; non-BR goes to DJ MP3s / WAVs." },
            { type: "toggle", key: "radioOnlyRule", title: "Radio-only rule", desc: "Keep radio-tagged content in radio areas instead of flooding artist folders." },
          ],
        },
        {
          icon: "tag",
          title: "BRMedia Custom Tags",
          desc: "The future source of truth for category placement and brand visuals.",
          info: [
            { title: "Primary brand", value: "BRMEDIA_PRIMARY_BRAND", desc: "Main artist/brand logic." },
            { title: "Brand image", value: "BRMEDIA_BRAND_IMAGE_KEY", desc: "Controls Blackburn Ravers / DJ NJ / Upalnite artwork logic." },
            { title: "Category", value: "BRMEDIA_CATEGORY", desc: "Player section/category placement." },
            { title: "Series", value: "BRMEDIA_SERIES", desc: "Medley/HTID/GHSV/etc grouping." },
          ],
          actions: [
            { label: "Open Tagger", route: "/tagger", icon: "tag" },
          ],
        },
      ],
    },

    devices: {
      title: "Devices & Remote Handoff",
      desc: "Device names, accept/decline safety and remote playback handoff.",
      cards: [
        {
          icon: "mobile",
          title: "This Device",
          desc: "Friendly device naming for Send to Device.",
          controls: [
            { type: "text", source: "device", key: "name", title: "Device name", desc: "Example: Rhys iPhone, Shop PC, Home PC." },
            { type: "select", source: "device", key: "type", title: "Device type", desc: "Used for clearer device display.", options: [
              { value: "phone", label: "Phone" },
              { value: "tablet", label: "Tablet" },
              { value: "pc", label: "PC" },
              { value: "tv", label: "TV / screen" },
              { value: "other", label: "Other" },
            ] },
          ],
        },
        {
          icon: "share-nodes",
          title: "Send to Device Options",
          desc: "Controls how playback can be handed to another device.",
          controls: [
            { type: "toggle", source: "device", key: "receiveTransfers", title: "Allow incoming device requests", desc: "Let this device receive Send to Device requests." },
            { type: "toggle", source: "device", key: "requireConfirm", title: "Require accept/decline", desc: "Ask before receiving playback or queue handoffs." },
            { type: "toggle", source: "device", key: "allowRemote", title: "Allow remote playback control", desc: "Allow trusted devices to control playback." },
            { type: "toggle", key: "sendDeviceQueueHandoff", title: "Allow queue handoff", desc: "Allow full queue to be sent to another device." },
            { type: "toggle", key: "sendDeviceTimestampSync", title: "Allow timestamp sync", desc: "Send current timestamp/position with the track." },
            { type: "toggle", key: "sendDeviceRememberTarget", title: "Remember last target device", desc: "Preselect the last device you sent media to." },
          ],
        },
        {
          icon: "mobile",
          title: "Device Identity",
          desc: "Safe ID for local handoff. You can regenerate it if needed.",
          info: [
            { title: "Device ID", value: devicePrefs.deviceId || "Not set", desc: "Used locally by BRMedia device handoff." },
            { title: "Known devices", value: String((devicePrefs.knownDevices || []).length), desc: "Trusted/remembered devices." },
          ],
          actions: [
            { label: "Regenerate device ID", action: "regenerate-device-id", icon: "rotate-left", secondary: true },
          ],
        },
      ],
    },

    sharing: {
      title: "Sharing & Bookmarks",
      desc: "Preview Share defaults and bookmark behaviour.",
      cards: [
        {
          icon: "share-nodes",
          title: "Preview Share",
          desc: "Defaults for the clip/share builder.",
          controls: [
            { type: "number", key: "previewShareDefaultLength", title: "Default preview length", desc: "Clip length in seconds. Allowed range: 5 to 180.", min: 5, max: 180, step: 1 },
            { type: "toggle", key: "previewShareIncludeArtwork", title: "Include artwork", desc: "Use mix/song artwork in preview shares where supported." },
            { type: "toggle", key: "previewShareIncludeBranding", title: "Include BRMedia branding", desc: "Keep Blackburn Ravers / DJ NJ & Upalnite branding on previews." },
            { type: "toggle", key: "previewShareSaveHistory", title: "Save preview history", desc: "Remember previous preview share jobs." },
          ],
        },
        {
          icon: "bookmark",
          title: "Bookmarks",
          desc: "Controls how bookmarks behave inside long mixes.",
          controls: [
            { type: "toggle", key: "bookmarkAutoName", title: "Auto-name bookmarks", desc: "Use current timestamp track name when available." },
            { type: "toggle", key: "bookmarkGroupByMix", title: "Group bookmarks by mix", desc: "Keep bookmarks organised under each mix." },
            { type: "toggle", key: "bookmarkShowInTracklist", title: "Show bookmarks in tracklist", desc: "Display saved moments alongside timestamp tracks." },
            { type: "toggle", key: "bookmarkSaveNotes", title: "Save notes with bookmarks", desc: "Allow note text to be stored with each bookmark." },
          ],
        },
      ],
    },

    backup: {
      title: "Backup & Data",
      desc: "Export Player/browser settings and server-backed backup data.",
      cards: [
        {
          icon: "floppy-disk",
          title: "Backup Export",
          desc: "Export selected browser/server data as a JSON backup.",
          tool: "backup",
        },
        {
          icon: "database",
          title: "Included Browser Data",
          desc: "These keys are included in browser backup snapshots.",
          info: [
            { title: "Player settings", value: "brmedia_settings_v2", desc: "Main Audio Player settings." },
            { title: "Device prefs", value: "brmedia_device_prefs_v1", desc: "Device identity and handoff options." },
            { title: "Preview Share", value: "brmedia_preview_share_prefs_v1", desc: "Preview defaults/history preferences." },
            { title: "Bookmarks", value: "brmedia_bookmark_prefs", desc: "Bookmark behaviour settings." },
          ],
        },
      ],
    },
  };

  return definitions[tabKey] || definitions.overview;
}

function renderPlayerSettingsSubTabs() {
  if (!playerSettingsSubTabs) return;
  playerSettingsSubTabs.classList.remove("hidden");
  playerSettingsSubTabs.innerHTML = PLAYER_SETTINGS_TABS.map((tab) => `
    <button class="playerSettingsSubTab ${tab.key === activePlayerSettingsTab ? "active" : ""}" data-player-settings-tab="${escapeHtml(tab.key)}" type="button">
      ${iconHtml(tab.icon)}
      <span>${escapeHtml(tab.title)}</span>
    </button>
  `).join("");

  playerSettingsSubTabs.querySelectorAll("[data-player-settings-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      activePlayerSettingsTab = button.dataset.playerSettingsTab || "overview";
      renderSettingsTab("player");
    });
  });

  hydrateBrIcons(playerSettingsSubTabs);
}

function renderPlayerSettingsTab() {
  const tab = getPlayerSettingsTabDefinition(activePlayerSettingsTab);
  settingsActiveTitle.textContent = tab.title;
  settingsActiveBadge.textContent = "Audio";
  renderPlayerSettingsSubTabs();

  settingsCards.innerHTML = `
    <div class="settingsTabIntro">
      <p>${escapeHtml(tab.desc)}</p>
    </div>

    ${tab.cards.map((card) => `
      <article class="settingsCard settingsLiveCard">
        <div class="settingsCardHead">
          <span class="settingsCardIcon">${iconHtml(card.icon)}</span>
          <div>
            <h4>${escapeHtml(card.title)}</h4>
            <p>${escapeHtml(card.desc)}</p>
          </div>
        </div>

        ${card.controls ? `<div class="settingsLiveControls">${card.controls.map(settingControlHtml).join("")}</div>` : ""}
        ${card.info ? `<div class="settingsInfoGrid">${card.info.map(playerInfoRowHtml).join("")}</div>` : ""}
				${card.tool ? settingsToolHtml(card.tool) : ""}
        ${card.actions ? `<div class="settingsInlineActions">${card.actions.map(playerActionHtml).join("")}</div>` : ""}
      </article>
    `).join("")}
  `;

  settingsCards.querySelectorAll("[data-player-setting]").forEach((field) => {
    field.addEventListener("change", () => updatePlayerSettingFromField(field));
  });
	
	bindSettingsToolEvents();

  settingsCards.querySelectorAll("[data-route]").forEach((button) => {
  button.addEventListener("click", () => {
    goToRoute(button.dataset.route || "/");
  });
});

  hydrateBrIcons(settingsCards);
}

function updatePlayerSettingFromField(field) {
  const key = field.dataset.playerSetting;
  const source = field.dataset.source || "player";
  if (!key) return;

  const target = source === "device" ? devicePrefs : playerSettings;

  if (field.type === "checkbox") {
    target[key] = field.checked;
  } else if (key === "skipBackSec" || key === "skipFwdSec") {
    target[key] = clampNumber(field.value, 5, 120, 25);
    field.value = String(target[key]);
  } else if (key === "previewShareDefaultLength") {
    target[key] = clampNumber(field.value, 5, 180, 30);
    field.value = String(target[key]);
  } else if (key === "eqPreamp") {
    target[key] = clampNumber(field.value, -12, 12, 0);
    field.value = String(target[key]);
  } else if (key === "playbackRate") {
    target[key] = clampPlaybackRate(field.value);
  } else {
    target[key] = field.value;
  }

  if (source === "device") saveDevicePrefs();
  else savePlayerSettings();

  renderPlayerSettingsSubTabs();
}

function resetPlayerSettings() {
  const ok = window.confirm("Reset Audio Player settings back to BRMedia defaults?");
  if (!ok) return;
  playerSettings = { ...PLAYER_SETTINGS_DEFAULTS, eqBands: { ...PLAYER_SETTINGS_DEFAULTS.eqBands } };
  savePlayerSettings();
  renderSettingsTab("player");
}

function getSettingsSubtabDescription(moduleKey = "", child = {}) {
  return child.desc || SETTINGS_SUBTAB_DESCRIPTIONS[moduleKey]?.[child.key] || "Open this settings page.";
}

function renderSettingsSidebarTree() {
  if (!settingsSidebarTree) return;

  settingsSidebarTree.innerHTML = SETTINGS_NAV_TREE.map((item) => {
    if (item.route) {
      return `
        <div class="settingsSidebarGroup">
          <button class="sidebarNavBtn" data-route="${escapeHtml(item.route)}" type="button">
            <span class="sidebarNavIconBadge">
              <img class="sidebarNavIconImage" src="${escapeHtml(item.iconPath)}" alt="" />
            </span>
            <span class="sidebarNavText">
              <span class="sidebarNavBtnTitle">${escapeHtml(item.title)}</span>
              <span class="sidebarNavBtnSub">${escapeHtml(item.desc)}</span>
            </span>
          </button>
        </div>
      `;
    }

    const active = item.key === activeSettingsModule;
    const expanded = item.key === settingsExpandedModule;
    const activeSub = item.key === "player" ? activePlayerSettingsTab : activeChildSettingsTab;

    return `
      <div class="settingsSidebarGroup ${active ? "active" : ""} ${expanded ? "expanded" : ""}">
        <button class="sidebarNavBtn ${active ? "active" : ""}" data-settings-tab="${escapeHtml(item.key)}" type="button">
          <span class="sidebarNavIconBadge">
            <img class="sidebarNavIconImage" src="${escapeHtml(item.iconPath)}" alt="" />
          </span>
          <span class="sidebarNavText">
            <span class="sidebarNavBtnTitle">${escapeHtml(item.title)}</span>
            <span class="sidebarNavBtnSub">${escapeHtml(item.desc)}</span>
          </span>
        </button>

        <div class="settingsSidebarSubMenu">
          ${(item.children || []).map((child) => `
            <button
              class="settingsSidebarSubBtn ${active && child.key === activeSub ? "active" : ""}"
              data-settings-subtab="${escapeHtml(item.key)}:${escapeHtml(child.key)}"
              type="button"
            >
              ${iconHtml(child.icon || "circle")}
              <span class="settingsSidebarSubText">
                <span class="settingsSidebarSubTitle">${escapeHtml(child.title)}</span>
                <span class="settingsSidebarSubDesc">${escapeHtml(getSettingsSubtabDescription(item.key, child))}</span>
              </span>
            </button>
          `).join("")}
        </div>
      </div>
    `;
  }).join("") + `
    <div class="settingsSidebarGroup settingsSidebarModuleLinks">
      <div class="sidebarSectionTitle">Open modules</div>
      <div class="settingsSidebarSubMenu alwaysOpen">
        ${SETTINGS_MODULE_NAV_LINKS.map((link) => `
          <button class="settingsSidebarSubBtn settingsSidebarOpenLink ${link.route === "/settings" ? "active" : ""}" data-route="${escapeHtml(link.route)}" type="button">
            ${link.iconPath ? `<img class="settingsModuleShortcutIcon" src="${escapeHtml(link.iconPath)}" alt="" />` : iconHtml(link.icon || "circle")}
            <span class="settingsSidebarSubText">
              <span class="settingsSidebarSubTitle">${escapeHtml(link.title)}</span>
              <span class="settingsSidebarSubDesc">${escapeHtml(link.desc)}</span>
            </span>
          </button>
        `).join("")}
      </div>
    </div>
  `;

  settingsSidebarTree.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => {
      closeModuleSidebar();
      goToRoute(button.dataset.route || "/");
    });
  });

  settingsSidebarTree.querySelectorAll("[data-settings-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.settingsTab || "player";
      settingsExpandedModule = settingsExpandedModule === key ? "" : key;
      renderSettingsSidebarTree();
    });
  });

  settingsSidebarTree.querySelectorAll("[data-settings-subtab]").forEach((button) => {
    button.addEventListener("click", () => {
      const [moduleKey, subKey] = String(button.dataset.settingsSubtab || "player:overview").split(":");
      settingsExpandedModule = moduleKey || "player";
      renderSettingsTab(moduleKey || "player", subKey || "overview");
      closeModuleSidebar();
    });
  });

  hydrateBrIcons(settingsSidebarTree);
  window.BRMediaProfileLink?.refresh?.();
}

function bindSettingsToolEvents() {
  bindSettingsUploadInput();

document.getElementById("settingsWaveformTrackSelect")?.addEventListener("change", (event) => {
  playerSettings.waveformPeakCount = clampNumber(event.target.value, 420, 4200, 1200);
  savePlayerSettings();
  showSettingsSaveNotice("Waveform process mode saved.");
});

  settingsCards.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleSettingsAction(button.dataset.action || ""));
  });

  populateSettingsWaveformSelect();

  if (document.getElementById("settingsWaveformHealthGrid")) {
    void refreshWaveformHealthSummary({ quiet: true });
  }
}

function formatSettingsUploadBytes(value = 0) {
  const bytes = Number(value || 0);
  if (!bytes) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  let index = 0;
  let size = bytes;

  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }

  return `${size >= 100 || index === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[index]}`;
}

function uploadSettingsFileWithProgress(file, index) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let lastPercent = -1;

    xhr.open(
      "POST",
      `/library/upload-mobile-file?name=${encodeURIComponent(file.name)}&target=${encodeURIComponent(settingsUploadTarget)}`
    );

    xhr.setRequestHeader(
      "Content-Type",
      file.type || "application/octet-stream"
    );

    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) return;

      const percent = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
      if (percent === lastPercent) return;

      lastPercent = percent;
      settingsUploadStatus[index] = {
        name: file.name,
        state: `Uploading ${percent}%`,
        detail: `${formatSettingsUploadBytes(event.loaded)} / ${formatSettingsUploadBytes(event.total)} sent to BRMedia server…`,
        className: "isUploading",
      };
      renderSettingsUploadQueue();
    });

    xhr.addEventListener("load", () => {
      let data = {};

      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : {};
      } catch {}

      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(data?.error || data?.detail || `Upload failed: ${file.name}`));
        return;
      }

      resolve(data);
    });

    xhr.addEventListener("error", () => {
      reject(new Error(`Upload connection failed: ${file.name}`));
    });

    xhr.addEventListener("abort", () => {
      reject(new Error(`Upload cancelled: ${file.name}`));
    });

    xhr.send(file);
  });
}

function renderSettingsUploadQueue() {
  const summary = document.getElementById("settingsUploadSummary");
  const list = document.getElementById("settingsUploadList");
  if (!summary || !list) return;

  if (!settingsUploadQueue.length) {
    summary.textContent = `No files selected yet. Destination: ${settingsUploadTargetLabel()}.`;
    summary.className = "settingsToolSummary";
    list.className = "settingsJobList settingsUploadProgressList";
    list.innerHTML = "";
    return;
  }

  const totalMb = settingsUploadQueue.reduce((sum, file) => sum + (file.size || 0), 0) / 1024 / 1024;
  if (!settingsUploadBusy && !settingsUploadStatus.length) {
    summary.textContent = `${settingsUploadQueue.length} file(s) ready — ${totalMb.toFixed(1)} MB total · ${settingsUploadTargetLabel()}.`;
    summary.className = "settingsToolSummary isSuccess";
  }

  list.className = "settingsJobList settingsUploadProgressList";
  list.innerHTML = settingsUploadQueue.map((file, index) => {
    const status = settingsUploadStatus[index] || {
      state: "Queued",
      detail: `${file.type || "Unknown file type"} · ${(file.size / 1024 / 1024).toFixed(1)} MB`,
      className: "isQueued",
    };

    const cardClass = status.className === "isUploaded" ? "isDone" : status.className === "isFailed" ? "isFailed" : status.className === "isUploading" ? "isProcessing" : "";

    return `
      <div class="settingsJobCard ${cardClass}">
        <div class="settingsJobCardInner">
          <div class="settingsJobRow">
            <div>
              <div class="settingsJobTitle">${escapeHtml(file.name)}</div>
              <div class="settingsJobDetail">${escapeHtml(status.detail || "")}</div>
            </div>
            <span class="settingsJobState ${escapeHtml(status.className || "isQueued")}">${escapeHtml(status.state || "Queued")}</span>
          </div>

          ${status.openUrl || status.viewFilesUrl
            ? `<div class="settingsUploadOpenLinks">
                ${status.openUrl
                  ? `<a class="settingsUploadOpenLink" href="${escapeHtml(status.openUrl)}">${iconHtml("arrow-up-right-from-square")}<span>Open ${escapeHtml(status.openLabel || "media")}</span></a>`
                  : ""}
                ${status.viewFilesUrl
                  ? `<a class="settingsUploadOpenLink secondary" href="${escapeHtml(status.viewFilesUrl)}">${iconHtml("folder-open")}<span>Open View Files</span></a>`
                  : ""}
              </div>`
            : ""}
        </div>
      </div>
    `;
  }).join("");
}

async function uploadSettingsFiles() {
  const summary = document.getElementById("settingsUploadSummary");
  if (!settingsUploadQueue.length || settingsUploadBusy) {
    if (summary) summary.textContent = "Choose files before starting upload.";
    return;
  }

  settingsUploadBusy = true;
  settingsUploadStatus = settingsUploadQueue.map((file) => ({
    name: file.name,
    state: "Queued",
    detail: `${file.type || "Unknown file type"} · ${(file.size / 1024 / 1024).toFixed(1)} MB`,
    className: "isQueued",
  }));
  renderSettingsUploadQueue();

  if (summary) {
    summary.textContent = `Uploading ${settingsUploadQueue.length} file(s)…`;
    summary.className = "settingsToolSummary isLoading";
  }

  let uploaded = 0;
  let failed = 0;

  try {
    for (let index = 0; index < settingsUploadQueue.length; index += 1) {
      const file = settingsUploadQueue[index];
      settingsUploadStatus[index] = {
        name: file.name,
        state: "Uploading",
        detail: "Sending to BRMedia server…",
        className: "isUploading",
      };
      renderSettingsUploadQueue();

      try {
        const data =
          await uploadSettingsFileWithProgress(
            file,
            index
          );

        uploaded += 1;

        const kind = String(data?.kind || "support");
        const supportType = String(data?.supportType || "support");
        const savedName = String(data?.savedName || file.name);

        const destination = kind === "audio"
          ? "Audio Player library"
          : kind === "video"
            ? "Video Player library"
            : supportType === "tracklist"
              ? "Player Tracklist Library"
              : "BRMedia supporting files";

        if (data?.tracklistReady) {
          settingsTracklistFilesLoaded = false;
          settingsTracklistFiles = [];
        }

        settingsUploadStatus[index] = {
          name: file.name,
          state: data?.addedItems ? "Uploaded + added" : "Uploaded",
          detail: `Saved as ${savedName} in ${destination}.`,
          className: "isUploaded",
          openUrl: data?.openUrl || "",
          viewFilesUrl: data?.viewFilesUrl || "/settings?module=cloud&tab=files",
          openLabel: kind === "video"
            ? "video"
            : kind === "audio"
              ? "audio"
              : "file",
        };
      } catch (err) {
        failed += 1;
        settingsUploadStatus[index] = {
          name: file.name,
          state: "Failed",
          detail: err?.message || String(err),
          className: "isFailed",
        };
      }

      renderSettingsUploadQueue();

      if (summary) {
        summary.textContent = `Upload progress: ${uploaded} uploaded, ${failed} failed, ${settingsUploadQueue.length - uploaded - failed} left.`;
        summary.className = failed ? "settingsToolSummary isLoading" : "settingsToolSummary isLoading";
      }
    }

    if (summary) {
      summary.textContent = failed ? `Upload finished with ${failed} failed file(s).` : "Upload complete.";
      summary.className = failed ? "settingsToolSummary isError" : "settingsToolSummary isSuccess";
    }

    settingsLibraryLoaded = false;
    settingsVideoLoaded = false;
    showSettingsSaveNotice(failed ? "Upload finished with errors." : "Upload complete.");

    if (!failed && playerSettings.uploadAfterAction === "player") goToRoute("/player");
    if (!failed && playerSettings.uploadAfterAction === "tagger") goToRoute("/tagger");
  } finally {
    settingsUploadBusy = false;
  }
}

async function ensureSettingsLibraryLoaded() {
  if (settingsLibraryLoaded) return settingsLibrary;

  const merged = [];
  const seen = new Set();

  function addItems(items = [], sourcePatch = {}) {
    if (!Array.isArray(items)) return;

    items.forEach((item) => {
      if (!item || typeof item !== "object") return;
      const id = String(item.id || item.trackId || "");
      if (!id || seen.has(id)) return;
      seen.add(id);
      merged.push({ ...sourcePatch, ...item });
    });
  }

  try {
    const res = await fetch("/library", { cache: "no-store" });
    const data = await res.json();
    addItems(Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : Array.isArray(data?.tracks) ? data.tracks : []);
  } catch {
    // keep going — linked cloud media can still load
  }

  try {
    const res = await fetch("/cloud/linked-tracks", { cache: "no-store" });
    const data = await res.json();
    addItems(Array.isArray(data?.items) ? data.items : [], { source: "google_drive", sourceType: "googleDrive", cloudProvider: "google_drive" });
  } catch {
    // no linked cloud media yet
  }

  settingsLibrary = merged;
  settingsLibraryLoaded = true;
  return settingsLibrary;
}

async function populateSettingsWaveformSelect() {
  const select = document.getElementById("settingsWaveformTrackSelect");
  if (!select) return;

  select.innerHTML = `<option value="">Loading library…</option>`;
  const library = await ensureSettingsLibraryLoaded();

  if (!library.length) {
    select.innerHTML = `<option value="">No library tracks found</option>`;
    return;
  }

  select.innerHTML = `
    <option value="">Choose a mix/song…</option>
    ${library.map((track) => {
      const id = track.id || track.trackId || "";
      const title = track.title || track.name || track.filename || id;
      const artist = track.artist || track.albumArtist || "";
      return `<option value="${escapeHtml(id)}" ${settingsUi.waveformSelectedId === id ? "selected" : ""}>${escapeHtml(title)}${artist ? ` — ${escapeHtml(artist)}` : ""}</option>`;
    }).join("")}
  `;
}

async function runSettingsWaveformJob(mode) {
  if (waveformGenerationInFlight) return;

  const summary = document.getElementById("settingsWaveformSummary");
  const select = document.getElementById("settingsWaveformTrackSelect");
  const selectedId = select?.value || settingsUi.waveformSelectedId || "";

  const force = mode.includes("force");
  const failedOnly = mode.includes("failed");
  const all = mode.includes("all") || failedOnly;

  if (!all && !selectedId) {
    if (summary) {
      summary.textContent = "Choose a file first.";
      summary.className = "settingsToolSummary isError";
    }
    return;
  }

  waveformGenerationInFlight = true;

  if (summary) {
    summary.textContent = all
      ? force ? "Starting rebuild all waveform job…" : "Starting all-missing waveform job…"
      : force ? "Starting selected waveform rebuild…" : "Starting selected waveform generation…";
    summary.className = "settingsToolSummary isLoading";
  }

  try {
    const res = await fetch("/waveforms/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scope: failedOnly ? "failed" : all ? "all" : "single",
        id: all ? undefined : selectedId,
        force,
        count: playerSettings.waveformPeakCount || 1200,
        displayMode: playerSettings.waveformDisplayMode || "bars",
        densityMode: playerSettings.waveformDensityMode || "standard",
        heightMode: playerSettings.waveformHeightMode || "normal",
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || data?.detail || `Waveform HTTP ${res.status}`);

if (summary) {
  summary.textContent = "Waveform job running…";
  summary.className = "settingsToolSummary settingsWaveformSummary isLoading";
}

    startWaveformJobPolling(data?.jobId || data?.id || "");
  } catch (err) {
    if (summary) {
      summary.textContent = `Waveform failed: ${err?.message || String(err)}`;
      summary.className = "settingsToolSummary isError";
    }
  } finally {
    waveformGenerationInFlight = false;
  }
}

function startWaveformJobPolling(jobId = "") {
  window.clearInterval(waveformJobPollTimer);
  renderWaveformJobs([{ id: jobId || "starting", status: "running", progress: 0, title: "Waveform job", detail: "Starting…" }]);

  waveformJobPollTimer = window.setInterval(async () => {
    try {
      if (!jobId) return;

      const res = await fetch(`/waveforms/jobs/${encodeURIComponent(jobId)}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || data?.detail || `Waveform HTTP ${res.status}`);

      renderWaveformJobs([data]);

      const status = String(data?.status || data?.state || "").toLowerCase();
      if (status && status !== "running" && status !== "queued" && status !== "processing") {
        window.clearInterval(waveformJobPollTimer);

        const summary = document.getElementById("settingsWaveformSummary");
        if (summary) {
          const failed = Number(data?.failed || 0);
          summary.textContent = failed
            ? `Waveform job finished with ${failed} failed file(s).`
            : `Waveform job complete — ${Number(data?.generated || 0)} generated, ${Number(data?.skipped || 0)} already cached.`;
          summary.className = `settingsToolSummary settingsWaveformSummary ${failed ? "isError" : "isSuccess"}`;
        }
      }
    } catch (err) {
      window.clearInterval(waveformJobPollTimer);

      const summary = document.getElementById("settingsWaveformSummary");
      if (summary) {
        summary.textContent = `Waveform polling failed: ${err?.message || String(err)}`;
        summary.className = "settingsToolSummary settingsWaveformSummary isError";
      }
    }
  }, 700);
}

function renderWaveformJobs(jobs = []) {
  const list = document.getElementById("settingsWaveformJobs");
  if (!list) return;

  const realJobs = jobs.filter(Boolean);
  if (!realJobs.length) {
    list.innerHTML = `<div class="settingsJobEmpty">No waveform jobs running.</div>`;
    return;
  }

  list.innerHTML = realJobs.map((job) => {
    const status = String(job.status || job.state || "running").toLowerCase();
    const total = Number(job.total || (Array.isArray(job.items) ? job.items.length : 0) || 0);
    const processed = Number(job.processed || 0);
    const progress = total ? Math.round((processed / total) * 100) : Number(job.progress ?? job.percent ?? 0) || 0;
    const safeProgress = Math.max(0, Math.min(100, progress));
    const failed = Number(job.failed || 0);
    const generated = Number(job.generated || 0);
    const skipped = Number(job.skipped || 0);
    const isFinished = status.includes("done") || status.includes("complete") || status === "generated";
    const jobClass = failed > 0
      ? "isFailed"
      : isFinished
        ? "isDone"
        : status.includes("running") || status.includes("processing")
          ? "isProcessing"
          : "";

    const itemRows = Array.isArray(job.items) ? job.items.map((item) => {
      const itemStatus = String(item.status || "queued").toLowerCase();
      const itemProgress = Math.max(0, Math.min(100, Number(item.progressPercent || item.progress || 0) || 0));
      const statusLabel = {
        queued: "Queued",
        processing: "Processing",
        generated: "Complete",
        skipped: "Already cached",
        failed: "Failed",
      }[itemStatus] || itemStatus;
      const itemClass = itemStatus === "generated"
        ? "isDone"
        : itemStatus === "skipped"
          ? "isSkipped"
          : itemStatus === "failed"
            ? "isFailed"
            : itemStatus === "processing"
              ? "isProcessing"
              : "";

      return `
        <div class="settingsJobCard settingsWaveformItem ${itemClass}">
          <div class="settingsJobCardFillLayer" style="width:${itemProgress}%"></div>
          <div class="settingsJobCardInner">
            <div class="settingsJobRow">
              <div>
                <div class="settingsJobTitle">${escapeHtml(item.title || item.id || "Waveform item")}</div>
                <div class="settingsJobDetail">${escapeHtml(item.detail || "Processing waveform peaks…")}</div>
              </div>
              <span class="settingsJobRight">${escapeHtml(statusLabel)} · ${itemProgress}%</span>
            </div>
          </div>
        </div>
      `;
    }).join("") : "";

    return `
      <div class="settingsWaveformJobShell">
        <div class="settingsWaveformJobHeader ${jobClass}">
          <div>
            <strong>${status === "running" ? "Waveform job running" : failed ? "Waveform job finished with errors" : isFinished ? "Waveform job complete" : "Waveform job"}</strong>
            <span>${processed}/${total || "?"} processed · ${generated} generated · ${skipped} cached · ${failed} failed</span>
          </div>
          <em>${safeProgress}%</em>
        </div>
        <div class="settingsWaveformMasterBar"><span style="width:${safeProgress}%"></span></div>
        <div class="settingsWaveformItemList">
          ${itemRows || `<div class="settingsJobEmpty">Waiting for job items…</div>`}
        </div>
      </div>
    `;
  }).join("");

  hydrateBrIcons(list);
}

async function refreshWaveformHealthSummary(options = {}) {
  const summary = document.getElementById("settingsWaveformSummary");
  const grid = document.getElementById("settingsWaveformHealthGrid");

  try {
    if (summary && !options.quiet) {
      summary.textContent = "Checking waveform cache health…";
      summary.className = "settingsToolSummary settingsWaveformSummary isLoading";
    }

    const data = await settingsApiJson(`/waveforms/health?count=${encodeURIComponent(playerSettings.waveformPeakCount || 1200)}`);

    if (grid) {
      grid.innerHTML = `
        ${playerInfoRowHtml({ title: "Generated", value: String(data.cached || 0), desc: `${formatSettingsBytes(data.cacheBytes || 0)} cached waveform data ready.` })}
        ${playerInfoRowHtml({ title: "Missing", value: String(data.missing || 0), desc: "Generate missing builds only uncached files." })}
        ${playerInfoRowHtml({ title: "Failed", value: String(data.failed || 0), desc: "Retry failed rebuilds files that failed in earlier jobs." })}
      `;
      hydrateBrIcons(grid);
    }

    if (summary) {
      summary.textContent = `Waveform health: ${data.cached || 0}/${data.total || 0} ready · ${data.missing || 0} missing · ${data.failed || 0} failed.`;
      summary.className = "settingsToolSummary settingsWaveformSummary isSuccess";
    }
  } catch (err) {
    if (summary) {
      const total = Array.isArray(settingsLibrary) ? settingsLibrary.length : 0;
      summary.textContent = `Could not read server health yet. Library has ${total} file(s). ${err?.message || String(err)}`;
      summary.className = "settingsToolSummary settingsWaveformSummary isError";
    }
  }
}

async function clearWaveformFailedRows() {
  const list = document.getElementById("settingsWaveformJobs");
  const summary = document.getElementById("settingsWaveformSummary");

  try {
    await settingsApiJson("/waveforms/failed", { method: "DELETE" });

    if (list) {
      list.innerHTML = `<div class="settingsJobEmpty">Failed waveform history cleared.</div>`;
    }

    if (summary) {
      summary.textContent = "Failed waveform history cleared.";
      summary.className = "settingsToolSummary settingsWaveformSummary isSuccess";
    }

    await refreshWaveformHealthSummary({ quiet: true });
  } catch (err) {
    if (summary) {
      summary.textContent = `Could not clear failed history: ${err?.message || String(err)}`;
      summary.className = "settingsToolSummary settingsWaveformSummary isError";
    }
  }
}

async function clearWaveformCacheWarning() {
  const ok = window.confirm("Clear all waveform cache files for the current library? You can rebuild them afterwards with Generate missing or Rebuild all.");
  const summary = document.getElementById("settingsWaveformSummary");
  if (!summary) return;

  if (!ok) {
    summary.textContent = "Cache clear cancelled.";
    summary.className = "settingsToolSummary settingsWaveformSummary";
    return;
  }

  try {
    summary.textContent = "Clearing waveform cache…";
    summary.className = "settingsToolSummary settingsWaveformSummary isLoading";

    const data = await settingsApiJson("/waveforms/cache", { method: "DELETE" });

    summary.textContent = `Waveform cache cleared — ${Number(data.deleted || 0)} cached file(s) removed.`;
    summary.className = "settingsToolSummary settingsWaveformSummary isSuccess";

    await refreshWaveformHealthSummary({ quiet: true });
  } catch (err) {
    summary.textContent = `Could not clear waveform cache: ${err?.message || String(err)}`;
    summary.className = "settingsToolSummary settingsWaveformSummary isError";
  }
}

let settingsDataImportPayload = null;
let settingsDataImportFilename = "";

function getRestoreSections() {
  return Array.from(document.querySelectorAll("[data-restore-section]"))
    .filter((input) => input.checked)
    .map((input) => input.dataset.restoreSection);
}

function normaliseImportedBackupPayload(payload) {
  if (!payload || typeof payload !== "object") return null;
  if (payload.backup && typeof payload.backup === "object") return payload.backup;
  return payload;
}

function detectBackupSummary(payload) {
  const backup = normaliseImportedBackupPayload(payload) || {};
  const browser = backup.browser || {};
  const server = backup.server || {};
  const isRawBrowserSnapshot = !backup.format && Object.keys(backup).some((key) => key.startsWith("brmedia_"));

  return {
    format: backup.format || (isRawBrowserSnapshot ? "browser-snapshot" : "unknown"),
    generatedAt: backup.generatedAt || backup.createdAt || "Unknown",
    sections: Array.isArray(backup.sections) ? backup.sections : [],
    hasBrowserSettings: !!(browser.settings || backup[PLAYER_SETTINGS_KEY]),
    hasDevicePrefs: !!(browser.devicePrefs || backup[DEVICE_PREFS_KEY]),
    hasSourceLinks: !!(browser.sourceLinks || backup[URL_SOURCE_LINKS_KEY]),
    hasBookmarks: !!(browser.bookmarks || browser.bookmarkPrefs || backup[BOOKMARK_PREFS_KEY]),
    hasPreviewPrefs: !!(browser.previewSharePrefs || backup[PREVIEW_SHARE_PREFS_KEY]),
    hasLibraryManifest: Array.isArray(server.libraryManifest),
    hasTracklists: Array.isArray(server.tracklists),
    hasWaveforms: Array.isArray(server.waveforms),
    libraryCount: Array.isArray(server.libraryManifest) ? server.libraryManifest.length : 0,
    tracklistCount: Array.isArray(server.tracklists) ? server.tracklists.length : 0,
    waveformCount: Array.isArray(server.waveforms) ? server.waveforms.length : 0,
  };
}

function renderDataImportPreview(payload, filename = "") {
  const preview = document.getElementById("settingsDataImportPreview");
  const summaryEl = document.getElementById("settingsDataImportSummary");
  if (!preview || !summaryEl) return;

  if (!payload) {
    preview.innerHTML = "";
    summaryEl.textContent = "Choose a BRMedia backup JSON file to preview before restoring.";
    summaryEl.className = "settingsToolSummary";
    return;
  }

  const summary = detectBackupSummary(payload);
  const rows = [
    ["Format", summary.format, filename || "Selected backup file"],
    ["Generated", summary.generatedAt, "Backup creation time if available."],
    ["Browser settings", summary.hasBrowserSettings ? "Found" : "Not found", "Player/settings restore."],
    ["Device prefs", summary.hasDevicePrefs ? "Found" : "Not found", "This device / handoff settings."],
    ["Source links", summary.hasSourceLinks ? "Found" : "Not found", "Saved external references."],
    ["Bookmarks / Preview", summary.hasBookmarks || summary.hasPreviewPrefs ? "Found" : "Not found", "Bookmark and sharing preferences."],
    ["Library manifest", String(summary.libraryCount), "Server restore only where files still exist."],
    ["Tracklists", String(summary.tracklistCount), "Restores sidecar tracklist files."],
    ["Waveforms", String(summary.waveformCount), "Restores cached peaks where available."],
  ];

  summaryEl.textContent = `Backup loaded: ${filename || "BRMedia backup"}. Review sections, then restore selected data.`;
  summaryEl.className = "settingsToolSummary isSuccess";

  preview.innerHTML = `
    <div class="settingsDataImportPreviewGrid">
      ${rows.map(([title, value, desc]) => `
        <div class="settingsDataImportPreviewRow">
          <span>${escapeHtml(title)}</span>
          <strong>${escapeHtml(value)}</strong>
          <em>${escapeHtml(desc)}</em>
        </div>
      `).join("")}
    </div>
  `;
}

async function readDataImportFile(file) {
  const status = document.getElementById("settingsDataImportSummary");
  try {
    if (status) {
      status.textContent = "Reading backup file…";
      status.className = "settingsToolSummary isLoading";
    }

    const text = await file.text();
    const payload = JSON.parse(text);
    settingsDataImportPayload = normaliseImportedBackupPayload(payload);
    settingsDataImportFilename = file.name || "BRMedia backup.json";
    renderDataImportPreview(settingsDataImportPayload, settingsDataImportFilename);
  } catch (err) {
    settingsDataImportPayload = null;
    settingsDataImportFilename = "";
    renderDataImportPreview(null);
    if (status) {
      status.textContent = `Could not read backup: ${err?.message || String(err)}`;
      status.className = "settingsToolSummary isError";
    }
  }
}

function applyBrowserBackupData(backup, sections) {
  const browser = backup?.browser || {};
  let restored = 0;

  if (sections.includes("browser")) {
    if (browser.settings) {
      writePersistedJson(PLAYER_SETTINGS_KEY, browser.settings);
      playerSettings = loadPlayerSettings();
      restored += 1;
    } else if (backup?.[PLAYER_SETTINGS_KEY]) {
      writePersistedJson(PLAYER_SETTINGS_KEY, backup[PLAYER_SETTINGS_KEY]);
      playerSettings = loadPlayerSettings();
      restored += 1;
    }
  }

  if (sections.includes("devices")) {
    if (browser.devicePrefs) {
      writePersistedJson(DEVICE_PREFS_KEY, browser.devicePrefs);
      devicePrefs = loadDevicePrefs();
      restored += 1;
    } else if (backup?.[DEVICE_PREFS_KEY]) {
      writePersistedJson(DEVICE_PREFS_KEY, backup[DEVICE_PREFS_KEY]);
      devicePrefs = loadDevicePrefs();
      restored += 1;
    }
  }

  if (sections.includes("sourceLinks")) {
    const sourceLinks = browser.sourceLinks || backup?.[URL_SOURCE_LINKS_KEY];
    if (sourceLinks) {
      writePersistedJson(URL_SOURCE_LINKS_KEY, sourceLinks);
      restored += 1;
    }
  }

  if (sections.includes("sharing")) {
    if (browser.bookmarkPrefs) {
      writePersistedJson(BOOKMARK_PREFS_KEY, browser.bookmarkPrefs);
      restored += 1;
    } else if (backup?.[BOOKMARK_PREFS_KEY]) {
      writePersistedJson(BOOKMARK_PREFS_KEY, backup[BOOKMARK_PREFS_KEY]);
      restored += 1;
    }

    if (browser.previewSharePrefs) {
      writePersistedJson(PREVIEW_SHARE_PREFS_KEY, browser.previewSharePrefs);
      restored += 1;
    } else if (backup?.[PREVIEW_SHARE_PREFS_KEY]) {
      writePersistedJson(PREVIEW_SHARE_PREFS_KEY, backup[PREVIEW_SHARE_PREFS_KEY]);
      restored += 1;
    }
  }

  return restored;
}

async function restoreSelectedDataImport() {
  const status = document.getElementById("settingsDataImportSummary");
  const backup = settingsDataImportPayload;
  const sections = getRestoreSections();

  if (!backup) {
    if (status) {
      status.textContent = "Choose a backup file before restoring.";
      status.className = "settingsToolSummary isError";
    }
    return;
  }

  if (!sections.length) {
    if (status) {
      status.textContent = "Choose at least one restore section.";
      status.className = "settingsToolSummary isError";
    }
    return;
  }

  const ok = window.confirm("Restore selected BRMedia data from this backup? This can overwrite browser settings/prefs and restore server-side tracklists/waveforms where present.");
  if (!ok) return;

  try {
    if (status) {
      status.textContent = "Restoring selected data…";
      status.className = "settingsToolSummary isLoading";
    }

    const browserRestored = applyBrowserBackupData(backup, sections);
    let serverMessage = "Server restore not selected.";

    if (sections.includes("server") && backup?.server) {
      const data = await settingsPostJson("/backup/restore", { backup });
      const restored = data?.restored || {};
      serverMessage = `Server restored: ${Number(restored.libraryManifest || 0)} library, ${Number(restored.tracklists || 0)} tracklists, ${Number(restored.waveforms || 0)} waveforms.`;
      settingsLibraryLoaded = false;
    }

    if (status) {
      status.textContent = `Restore complete. Browser sections restored: ${browserRestored}. ${serverMessage}`;
      status.className = "settingsToolSummary isSuccess";
    }

    showSettingsSaveNotice("Backup data restored. Reload Player/Settings if anything still looks cached.");
  } catch (err) {
    if (status) {
      status.textContent = `Restore failed: ${err?.message || String(err)}`;
      status.className = "settingsToolSummary isError";
    }
  }
}

function buildBrowserBackupSnapshot() {
  const keys = [
    PLAYER_SETTINGS_KEY,
    DEVICE_PREFS_KEY,
    URL_SOURCE_LINKS_KEY,
    BOOKMARK_PREFS_KEY,
    PREVIEW_SHARE_PREFS_KEY,
    SETTINGS_UI_KEY,
  ];

  return keys.reduce((snapshot, key) => {
    snapshot[key] = readPersistedJson(key, null);
    return snapshot;
  }, {});
}

async function exportSettingsBackup(mode = "selected") {
  const status = document.getElementById("settingsBackupSummary");
  const sections = Array.from(document.querySelectorAll("[data-backup-section]"))
    .filter((input) => input.checked)
    .map((input) => input.dataset.backupSection);

  if (status) {
    status.textContent = "Preparing backup…";
    status.className = "settingsToolSummary isLoading";
  }

  try {
    if (mode === "browser") {
      const blob = new Blob([JSON.stringify(buildBrowserBackupSnapshot(), null, 2)], { type: "application/json" });
      downloadBlob(blob, `BRMedia browser backup ${new Date().toISOString().slice(0, 10)}.json`);
      if (status) {
        status.textContent = "Browser backup exported.";
        status.className = "settingsToolSummary isSuccess";
      }
      return;
    }

    const res = await fetch("/backup/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sections, browserData: buildBrowserBackupSnapshot() }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || data?.detail || `Backup HTTP ${res.status}`);

    const backup = data?.backup || data;
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    downloadBlob(blob, `BRMedia backup ${new Date().toISOString().slice(0, 10)}.json`);

    if (status) {
      status.textContent = "Backup exported.";
      status.className = "settingsToolSummary isSuccess";
    }
  } catch (err) {
    if (status) {
      status.textContent = `Backup failed: ${err?.message || String(err)}`;
      status.className = "settingsToolSummary isError";
    }
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function handleSettingsAction(action) {
  if (action === "reset-player-settings") return resetPlayerSettings();
  if (action === "open-add-files-picker") return void openAddFilesAndPick();
  if (action === "pick-upload-files") return openSettingsUploadPicker();
  if (action === "start-upload-files") return void uploadSettingsFiles();
  if (action === "waveform-generate-current") return void runSettingsWaveformJob("current");
  if (action === "waveform-rebuild-current") return void runSettingsWaveformJob("current-force");
  if (action === "waveform-generate-missing") return void runSettingsWaveformJob("all");
  if (action === "waveform-rebuild-all") return void runSettingsWaveformJob("all-force");
  if (action === "waveform-retry-failed") return void runSettingsWaveformJob("failed-force");
  if (action === "waveform-refresh-health") return refreshWaveformHealthSummary();
  if (action === "waveform-clear-failed") return clearWaveformFailedRows();
  if (action === "waveform-clear-cache") return clearWaveformCacheWarning();
  if (action === "backup-selected") return void exportSettingsBackup("selected");
  if (action === "backup-browser") return void exportSettingsBackup("browser");
  if (action === "data-import-pick") return document.getElementById("settingsDataImportInput")?.click();
  if (action === "data-import-apply") return void restoreSelectedDataImport();

  if (action === "regenerate-device-id") {
    const ok = window.confirm("Regenerate this device ID? Other devices may need to rediscover it.");
    if (!ok) return;

    devicePrefs.deviceId = createDeviceId();
    saveDevicePrefs("Device ID regenerated.");
    renderSettingsTab("player", "devices");
  }
}

async function openAddFilesAndPick() {
  settingsAutoOpenUploadPicker = true;
  await renderSettingsTab("cloud", "add-files");
}

function settingsApiJson(url, options = {}) {
  return fetch(url, {
    cache: "no-store",
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  }).then(async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || data?.detail || `HTTP ${res.status}`);
    return data;
  });
}

function settingsPostJson(url, body = {}) {
  return settingsApiJson(url, { method: "POST", body: JSON.stringify(body) });
}

function settingsPatchJson(url, body = {}) {
  return settingsApiJson(url, { method: "PATCH", body: JSON.stringify(body) });
}

function settingsDeleteJson(url) {
  return settingsApiJson(url, { method: "DELETE" });
}

function formatSettingsBytes(bytes = 0) {
  const value = Number(bytes || 0);
  if (!value) return "Size unknown";
  if (value >= 1024 * 1024 * 1024) return `${(value / 1024 / 1024 / 1024).toFixed(1)} GB`;
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${value} B`;
}

function normaliseSettingsDurationSeconds(value = 0) {
  const raw = Number(value || 0);
  if (!Number.isFinite(raw) || raw <= 0) return 0;

  return raw > 172800
    ? raw / 1000
    : raw;
}

function formatSettingsDuration(value = 0) {
  const totalSeconds = Math.max(
    0,
    Math.round(
      normaliseSettingsDurationSeconds(value)
    )
  );

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getSettingsTrackTitle(item = {}) {
  return item.title || item.name || item.filename || item.fileName || item.path || item.id || "Untitled file";
}

function getSettingsTrackArtist(item = {}) {
  return item.artist || item.albumArtist || item.brand || item.category || item.source || "BRMedia file";
}

function getSettingsTrackMeta(item = {}) {
  const parts = [getSettingsTrackArtist(item)];
  const duration = normaliseSettingsDurationSeconds(
    item.duration ||
    item.durationSeconds ||
    item.durationMs ||
    0
  );

  if (duration) parts.push(`${Math.round(duration / 60)} min`);
  if (item.size || item.sizeBytes) parts.push(formatSettingsBytes(item.size || item.sizeBytes));
  return parts.filter(Boolean).join(" · ");
}

function getSettingsTrackSourceKey(item = {}) {
  const source = String(item.source || item.sourceType || item.cloudProvider || item.provider || "local").toLowerCase();
  const locator = String(item.locator || "").toLowerCase();

  if (source.includes("google") || locator.startsWith("gdrive://")) return "google";
  if (source.includes("dropbox") || locator.startsWith("dropbox://")) return "dropbox";
  return "local";
}

function getSettingsTrackSourceLabel(item = {}) {
  const sourceKey = getSettingsTrackSourceKey(item);
  if (sourceKey === "google") return "Google Drive";
  if (sourceKey === "dropbox") return "Dropbox";
  return "local";
}

function getSettingsTrackThumbStyle(item = {}) {
  const id = encodeURIComponent(item.id || item.trackId || "");
  if (!id) return "";
  if (getSettingsTrackSourceKey(item) === "google" && item.hasArtwork) {
    return `background-image:url('/cloud/google/artwork/${id}')`;
  }
  return `background-image:url('/track/${id}/artwork')`;
}

function settingsProviderAccounts(provider) {
  const wanted = provider === "google" ? "google_drive" : "dropbox";
  return settingsCloudAccounts.filter((account) => account.provider === wanted);
}

function settingsAccountLabel(account = {}) {
  return account.label || account.displayName || account.email || account.id || "Cloud account";
}

function accountSelectHtml(provider) {
  const accounts = settingsProviderAccounts(provider);
  const key = provider === "google" ? "googleAccountId" : "dropboxAccountId";
  const selected = settingsCloudState[key] || accounts[0]?.id || "";
  if (!settingsCloudState[key] && selected) settingsCloudState[key] = selected;

  return `
    <label class="settingsToolLabel" for="${provider}AccountSelect">Cloud account</label>
    <select id="${provider}AccountSelect" class="settingsToolSelect" data-cloud-account-select="${provider}">
      <option value="">Choose account…</option>
      ${accounts.map((account) => `<option value="${escapeHtml(account.id)}" ${account.id === selected ? "selected" : ""}>${escapeHtml(settingsAccountLabel(account))}</option>`).join("")}
    </select>
  `;
}

function renderCloudAccountCards(provider) {
  const accounts = settingsProviderAccounts(provider);
  if (!accounts.length) {
    return `<div class="settingsJobEmpty">No ${provider === "google" ? "Google Drive" : "Dropbox"} accounts connected yet.</div>`;
  }

  return accounts.map((account) => `
    <div class="settingsCloudAccountCard">
      <div class="settingsCloudAccountMain">
        <strong>${escapeHtml(settingsAccountLabel(account))}</strong>
        <span>${escapeHtml(account.email || account.displayName || account.provider || "Connected account")}</span>
        <em>ID: ${escapeHtml(account.id)}</em>
      </div>
      <div class="settingsCloudAccountActions">
        <button class="settingsTinyBtn" data-cloud-rename="${escapeHtml(account.id)}" type="button">Rename</button>
        <button class="settingsTinyBtn danger" data-cloud-delete="${escapeHtml(account.id)}" type="button">Remove</button>
      </div>
    </div>
  `).join("");
}

function cloudBrowserProviderLabel(provider = "google") {
  return provider === "dropbox" ? "Dropbox" : "Google Drive";
}

function cloudBrowserFileTypeLabel(file = {}, isFolder = false) {
  if (isFolder) return "Folder";

  const name = String(file.name || file.path_display || file.path_lower || "").toLowerCase();
  const extension = name.includes(".") ? name.split(".").pop() : "";

  if (["mp3", "wav", "flac", "m4a", "aac", "ogg", "opus"].includes(extension)) return "Audio file";
  if (["mp4", "mkv", "mov", "m4v", "avi", "webm"].includes(extension)) return "Video file";
  if (["txt", "cue", "json", "m3u", "m3u8"].includes(extension)) return "Supporting file";
  return file.mimeType || file.type || "Cloud file";
}

function isSettingsCloudAudioFile(file = {}) {
  return cloudBrowserFileTypeLabel(file, false) === "Audio file";
}

function findSettingsGoogleLinkedTrack(file = {}) {
  const accountId =
    settingsCloudState.googleAccountId ||
    document.getElementById("googleAccountSelect")?.value ||
    "";

  if (!accountId || !file?.id) return null;

  return (settingsLibrary || []).find(
    (item) =>
      getSettingsTrackSourceKey(item) === "google" &&
      String(item.accountId || "") === String(accountId) &&
      String(item.fileId || "") === String(file.id)
  ) || null;
}

function settingsCloudFileModeHtml(provider, file = {}, isFolder = false) {
  if (isFolder) return `<span class="settingsCloudModeChip isFolder">Folder</span>`;

  if (provider !== "google" || !isSettingsCloudAudioFile(file)) {
    return `<span class="settingsCloudModeChip">Local-copy import</span>`;
  }

  const linked = findSettingsGoogleLinkedTrack(file);

  if (!linked) {
    return `<span class="settingsCloudModeChip isCloud">Cloud-only available</span>`;
  }

  return `
    <span class="settingsCloudModeChip isCloud">Cloud-only linked</span>
    ${linked.importedLocalItemId ? `<span class="settingsCloudModeChip isLocal">Local copy ready</span>` : ""}
  `;
}

function renderCloudFileRows(provider) {
  const files = settingsCloudFiles[provider] || [];
  if (!files.length) return `<div class="settingsJobEmpty">No cloud files loaded yet. Open a folder or run a search.</div>`;

  return files.map((file) => {
    const isFolder = file.mimeType === "application/vnd.google-apps.folder" || file.isFolder || file.tag === "folder" || file[".tag"] === "folder";
    const name = file.name || file.path_display || file.path_lower || file.id || "Cloud item";
    const modified = file.modifiedTime || file.server_modified || file.client_modified || "";
    const payload = encodeURIComponent(JSON.stringify(file));
    const details = [
      cloudBrowserFileTypeLabel(file, isFolder),
      !isFolder && Number(file.size || 0) ? formatSettingsBytes(file.size) : "",
      modified ? String(modified).slice(0, 10) : "",
    ].filter(Boolean).join(" · ");

    const linked = provider === "google" && !isFolder
      ? findSettingsGoogleLinkedTrack(file)
      : null;

    return `
      <article class="settingsCloudFileCard ${isFolder ? "isFolder" : "isFile"}">
        <span class="settingsCloudFileKindIcon">${iconHtml(isFolder ? "folder-open" : "file-audio")}</span>
        <div class="settingsCloudFileMeta">
          <strong>${escapeHtml(name)}</strong>
          <span>${escapeHtml(details)}</span>
          <em>${escapeHtml(cloudBrowserProviderLabel(provider))}</em>
          <div class="settingsCloudModeRow">${settingsCloudFileModeHtml(provider, file, isFolder)}</div>
        </div>

        <div class="settingsCloudFileActionGrid">
          ${isFolder ? `<button class="settingsTinyBtn primary" data-cloud-open-folder="${provider}" data-file-payload="${payload}" type="button">Open folder</button>` : ""}
          ${isFolder ? `<button class="settingsTinyBtn sync" data-cloud-sync-folder="${provider}" data-file-payload="${payload}" type="button">Sync folder</button>` : ""}
          ${provider === "google" && !isFolder && isSettingsCloudAudioFile(file) && !linked ? `<button class="settingsTinyBtn cloudOnly" data-google-cloud-link data-file-payload="${payload}" type="button">Add cloud-only</button>` : ""}
          ${provider === "google" && !isFolder && linked ? `<button class="settingsTinyBtn cloudOnly isDone" type="button" disabled>Cloud-only added</button>` : ""}
          ${!isFolder ? `<button class="settingsTinyBtn primary" data-cloud-import="${provider}" data-file-payload="${payload}" type="button">Import local copy</button>` : ""}
        </div>
      </article>
    `;
  }).join("");
}

function getGoogleDriveBreadcrumbs() {
  const crumbs = Array.isArray(settingsCloudState.googleBreadcrumbs) && settingsCloudState.googleBreadcrumbs.length
    ? settingsCloudState.googleBreadcrumbs
    : [{ id: "root", title: "My Drive" }];

  if (!crumbs.find((crumb) => crumb.id === (settingsCloudState.googleFolderId || "root"))) {
    return [...crumbs, { id: settingsCloudState.googleFolderId || "root", title: "Current folder" }];
  }

  return crumbs;
}

function getCloudTabDefinition(tabKey = "overview") {
  const sourceLinks = getSourceLinksSafe();

  const definitions = {
    overview: {
      title: "Upload Media Hub Overview",
      desc: "One main home for uploads, imported media, cloud accounts, lawful direct URLs and file management.",
      cards: [
        {
          icon: "folder-open",
          title: "Upload Media Hub",
          desc: "This is the single main hub. Player, Profile and the Home launcher feed into this area rather than carrying separate upload hubs.",
          html: `
            <div class="settingsInfoGrid">
              ${playerInfoRowHtml({ title: "Add Files", value: "Ready", desc: "Upload audio, artwork, cue sheets and tracklist text files." })}
              ${playerInfoRowHtml({ title: "Google Drive", value: String(settingsProviderAccounts("google").length), desc: "Connected Google Drive accounts." })}
              ${playerInfoRowHtml({ title: "Dropbox", value: String(settingsProviderAccounts("dropbox").length), desc: "Connected Dropbox accounts." })}
              ${playerInfoRowHtml({ title: "Source Links", value: String(sourceLinks.length), desc: "Saved external source links." })}
            </div>
          `,
        },
        {
          icon: "folder-open",
          title: "File Manager",
          desc: "List view with small thumbnail, title and tap-to-open action menu.",
          html: filesToolHtml(),
        },
      ],
    },

    "add-files": {
      title: "Upload Media Hub",
      desc: "One central page for audio, video, supporting files, cloud imports, lawful direct links, completed torrents and View Files.",
      cards: [
        {
          icon: "upload",
          title: "Choose how media enters BRMedia",
          desc: "Jump into a source, or choose a local upload destination before selecting files from this phone or PC.",
          html: uploadMediaHubHtml(),
        },
        {
          icon: "folder-plus",
          title: "Upload from this device",
          desc: "Upload audio, video or supporting files into the correct saved library destination without leaving Settings.",
          html: uploadToolHtml(),
        },
      ],
    },

    "data-import": {
      title: "Data Import",
      desc: "Recover BRMedia backups and restore saved settings/data safely.",
      cards: [
        {
          icon: "file-import",
          title: "Recover Backup",
          desc: "Preview a backup first, then restore selected sections into BRMedia.",
          html: dataImportToolHtml(),
        },
      ],
    },

    google: {
      title: "Google Drive",
      desc: "Connect, rename, browse and import from any Google Drive account.",
      cards: [
        {
          icon: "cloud",
          title: "Google Drive Accounts",
          desc: "Rename accounts like Main Drive, Shop Drive, Backup Drive etc.",
          html: googleDriveToolHtml(),
        },
      ],
    },

    dropbox: {
      title: "Dropbox",
      desc: "Connect, rename, browse/search and import from Dropbox.",
      cards: [
        {
          icon: "box",
          title: "Dropbox Accounts",
          desc: "Rename and browse Dropbox accounts from here.",
          html: dropboxToolHtml(),
        },
      ],
    },

    sync: {
      title: "Cloud Sync",
      desc: "Sync Google Drive and Dropbox folders into BRMedia so files appear in Player, View Files, Tagger, Converter and Mastering.",
      cards: [
        {
          icon: "arrows-rotate",
          title: "Google Drive / Dropbox Sync",
          desc: "Pick folders once, then sync them as local editable BRMedia media files.",
          html: cloudSyncToolHtml(),
        },
      ],
    },
		
    duplicates: {
      title: "Duplicate Audio",
      desc: "Find likely duplicate audio files created by uploads, local imports and cloud sync.",
      cards: [
        {
          icon: "copy",
          title: "Duplicate Audio Cleanup",
          desc: "Review likely duplicates before Converter V4 batch work.",
          html: duplicateAudioToolHtml(),
        },
      ],
    },

    import: {
      title: "Direct URL Import",
      desc: "Import lawful direct/user-owned audio file links into BRMedia.",
      cards: [
        {
          icon: "cloud-arrow-down",
          title: "Direct Import",
          desc: "Paste a direct audio URL and start an import job.",
          html: directImportToolHtml(),
        },
      ],
    },

    links: {
      title: "Source Links",
      desc: "Save SoundCloud, Mixcloud, Hearthis or other source links for reference.",
      cards: [
        {
          icon: "link",
          title: "Saved Source Links",
          desc: "Reference links only. Direct downloads still use Direct Import.",
          html: sourceLinksToolHtml(),
        },
      ],
    },

    files: {
      title: "View Files",
      desc: "Better list view: small thumbnail and title. Tap a file for a bigger action menu.",
      cards: [
        {
          icon: "folder-open",
          title: "Library Files",
          desc: "Open Player, Tagger, Converter, Mastering, rebuild waveform or delete.",
          html: filesToolHtml(),
        },
      ],
    },
  };

  return definitions[tabKey] || definitions.overview;
}

function googleDriveToolHtml() {
  const accountId = settingsCloudState.googleAccountId || settingsProviderAccounts("google")[0]?.id || "";
  const account = settingsCloudAccounts.find((item) => item.id === accountId) || settingsProviderAccounts("google")[0] || {};
  const crumbs = getGoogleDriveBreadcrumbs();

  return `
    <div class="settingsToolPanel settingsCloudBrowser settingsDriveBrowser">
      <div class="settingsDriveTopbar">
        <div class="settingsDriveIdentity">
          <span class="settingsDriveLogo">${iconHtml("google-drive")}</span>
          <div><strong>Google Drive browser</strong><em>${escapeHtml(settingsAccountLabel(account))}</em></div>
        </div>
        <div class="settingsDriveAccountActions">
          <button class="settingsTinyBtn" data-cloud-refresh-accounts type="button">Refresh accounts</button>
          <button class="settingsTinyBtn primary" data-cloud-connect="google" type="button">Connect Drive</button>
        </div>
      </div>

      <div class="settingsCloudBrowserNote">For audio, choose <strong>Add cloud-only</strong> to stream from Google Drive without downloading a PC copy. Use <strong>Import local copy</strong> when you need Tagger, Converter, Mastering, offline use or editing.</div>
      <div class="settingsCloudAccounts settingsDriveAccounts">${renderCloudAccountCards("google")}</div>

      <section class="settingsCloudBrowserControls">
        ${accountSelectHtml("google")}
        <label class="settingsToolLabel" for="settingsGoogleQuery">Search this Drive account</label>
        <div class="settingsDriveSearchRow">
          <input id="settingsGoogleQuery" class="settingsToolInput settingsDriveSearch" value="${escapeHtml(settingsCloudState.googleQuery || "")}" placeholder="Track, folder or file name" />
          <button class="settingsToolBtn primary" data-cloud-list="google" type="button">${iconHtml("magnifying-glass")}<span>Search</span></button>
        </div>
      </section>

      <div class="settingsDriveBreadcrumbs">
        ${crumbs.map((crumb, index) => `
          <button class="settingsDriveCrumb ${index === crumbs.length - 1 ? "active" : ""}" data-google-crumb="${escapeHtml(crumb.id)}" type="button">${index === 0 ? iconHtml("google-drive") : iconHtml("folder-open")}<span>${escapeHtml(crumb.title)}</span></button>
        `).join("")}
      </div>

      <div class="settingsCompactActionGrid settingsDriveActionRow">
        <button class="settingsToolBtn" data-google-back type="button">${iconHtml("arrow-left")}<span>Back</span></button>
        <button class="settingsToolBtn" data-cloud-root="google" type="button">${iconHtml("home")}<span>My Drive</span></button>
        <button class="settingsToolBtn" data-cloud-list="google" type="button">${iconHtml("folder-open")}<span>Refresh folder</span></button>
        <button class="settingsToolBtn primary" data-cloud-sync-current="google" type="button">${iconHtml("arrows-rotate")}<span>Sync this folder</span></button>
      </div>

      <div id="settingsGoogleStatus" class="settingsToolSummary settingsDriveStatus">Ready inside Google Drive.</div>
      <div class="settingsCloudFileList settingsDriveFileList">${renderCloudFileRows("google")}</div>
    </div>
  `;
}

function dropboxToolHtml() {
  const accountId = settingsCloudState.dropboxAccountId || settingsProviderAccounts("dropbox")[0]?.id || "";
  const account = settingsCloudAccounts.find((item) => item.id === accountId) || settingsProviderAccounts("dropbox")[0] || {};

  return `
    <div class="settingsToolPanel settingsCloudBrowser settingsDropboxBrowser">
      <div class="settingsDriveTopbar">
        <div class="settingsDriveIdentity">
          <span class="settingsDriveLogo">${iconHtml("dropbox")}</span>
          <div><strong>Dropbox browser</strong><em>${escapeHtml(settingsAccountLabel(account))}</em></div>
        </div>
        <div class="settingsDriveAccountActions">
          <button class="settingsTinyBtn" data-cloud-refresh-accounts type="button">Refresh accounts</button>
          <button class="settingsTinyBtn primary" data-cloud-connect="dropbox" type="button">Connect Dropbox</button>
        </div>
      </div>

      <div class="settingsCloudBrowserNote">Dropbox currently uses safe local-copy imports and folder sync. Direct Dropbox cloud-only playback will be added as its own bridge after Google Drive mode is proven stable.</div>
      <div class="settingsCloudAccounts settingsDriveAccounts">${renderCloudAccountCards("dropbox")}</div>

      <section class="settingsCloudBrowserControls">
        ${accountSelectHtml("dropbox")}
        <label class="settingsToolLabel" for="settingsDropboxPath">Current Dropbox folder</label>
        <input id="settingsDropboxPath" class="settingsToolInput" value="${escapeHtml(settingsCloudState.dropboxPath || "")}" placeholder="Root folder" />
        <label class="settingsToolLabel" for="settingsDropboxQuery">Search this Dropbox account</label>
        <div class="settingsDriveSearchRow">
          <input id="settingsDropboxQuery" class="settingsToolInput" value="${escapeHtml(settingsCloudState.dropboxQuery || "")}" placeholder="Track, folder or file name" />
          <button class="settingsToolBtn primary" data-cloud-search="dropbox" type="button">${iconHtml("magnifying-glass")}<span>Search</span></button>
        </div>
      </section>

      <div class="settingsDropboxPathBar">${iconHtml("folder-open")}<span>${escapeHtml(settingsCloudState.dropboxPath || "Dropbox root")}</span></div>

      <div class="settingsCompactActionGrid settingsDriveActionRow">
        <button class="settingsToolBtn" data-dropbox-back type="button">${iconHtml("arrow-left")}<span>Back</span></button>
        <button class="settingsToolBtn" data-cloud-root="dropbox" type="button">${iconHtml("home")}<span>Dropbox root</span></button>
        <button class="settingsToolBtn" data-cloud-list="dropbox" type="button">${iconHtml("folder-open")}<span>Refresh folder</span></button>
        <button class="settingsToolBtn primary" data-cloud-sync-current="dropbox" type="button">${iconHtml("arrows-rotate")}<span>Sync this folder</span></button>
      </div>

      <div id="settingsDropboxStatus" class="settingsToolSummary settingsDriveStatus">Ready inside Dropbox.</div>
      <div class="settingsCloudFileList settingsDriveFileList">${renderCloudFileRows("dropbox")}</div>
    </div>
  `;
}

function cloudSyncProviderLabel(provider) {
  return provider === "google_drive" || provider === "google" ? "Google Drive" : "Dropbox";
}

function formatSettingsDate(value) {
  const time = Number(value || 0);
  if (!time) return "Never";
  try {
    return new Date(time).toLocaleString();
  } catch {
    return "Recently";
  }
}

function cloudSyncToolHtml() {
  const rules = Array.isArray(settingsCloudSyncRules) ? settingsCloudSyncRules : [];
  const jobs = Array.isArray(settingsCloudSyncJobs) ? settingsCloudSyncJobs : [];

  return `
    <div class="settingsToolPanel settingsCloudSyncPanel">
      <div class="settingsCloudSyncHero">
        <span>${iconHtml("arrows-rotate")}</span>
        <div>
          <strong>Sync cloud folders into BRMedia</strong>
          <p>Use the Google Drive or Dropbox browser, tap <b>Sync</b> on a folder, then BRMedia downloads supported audio into the library so Player, Tagger, Converter and Mastering can edit it like a normal local file.</p>
        </div>
      </div>

      <div class="settingsCloudSyncQuickGrid">
        <button class="settingsToolBtn" data-route="/settings?module=cloud&tab=google" type="button">${iconHtml("google-drive")}<span>Pick Google Drive folder</span></button>
        <button class="settingsToolBtn" data-route="/settings?module=cloud&tab=dropbox" type="button">${iconHtml("dropbox")}<span>Pick Dropbox folder</span></button>
        <button class="settingsToolBtn primary" data-cloud-sync-run-all type="button">${iconHtml("arrows-rotate")}<span>Sync all folders</span></button>
        <button class="settingsToolBtn" data-cloud-sync-refresh type="button">${iconHtml("rotate-left")}<span>Refresh status</span></button>
      </div>

      ${renderCloudSyncPreferences()}

      <div class="settingsCloudSyncStats">
        ${playerInfoRowHtml({ title: "Synced folders", value: String(rules.length), desc: "Google Drive and Dropbox folders saved for repeat sync." })}
        ${playerInfoRowHtml({ title: "Active jobs", value: String(jobs.filter((job) => ["queued", "scanning", "syncing"].includes(job.status)).length), desc: "Sync jobs currently running or queued." })}
        ${playerInfoRowHtml({ title: "Editable copies", value: "Local", desc: "Synced audio becomes normal BRMedia media for all modules." })}
      </div>

      <div class="settingsCloudSyncSection">
        <div class="settingsCloudSyncSectionHead">
          <strong>Synced folders</strong>
          <span>Run, remove or re-sync folders any time.</span>
        </div>
        <div class="settingsCloudSyncRuleList">${renderCloudSyncRules()}</div>
      </div>

      <div class="settingsCloudSyncSection">
        <div class="settingsCloudSyncSectionHead">
          <strong>Sync progress</strong>
          <span>Shows imported, skipped and failed files.</span>
        </div>
        <div class="settingsCloudSyncJobList">${renderCloudSyncJobs()}</div>
      </div>
    </div>
  `;
}

function renderCloudSyncPreferences() {
  const prefs = getCloudSyncPrefs();
  return `
    <div class="settingsCloudSyncPrefs">
      <label class="settingsCloudSyncPref">
        <span>Default Player category</span>
        <select data-cloud-sync-pref="defaultCategory">
          ${cloudSyncCategoryOptionsHtml(prefs.defaultCategory || "auto")}
        </select>
        <em>New synced folders use this unless Auto can detect from the folder name.</em>
      </label>
      <label class="settingsCloudSyncToggle">
        <input data-cloud-sync-pref="recursive" type="checkbox" ${prefs.recursive !== false ? "checked" : ""} />
        <span>Include subfolders</span>
      </label>
      <label class="settingsCloudSyncToggle">
        <input data-cloud-sync-pref="autoSync" type="checkbox" ${prefs.autoSync === true ? "checked" : ""} />
        <span>Mark folders for auto-sync later</span>
      </label>
    </div>
  `;
}

function renderCloudSyncRules() {
  const rules = Array.isArray(settingsCloudSyncRules) ? settingsCloudSyncRules : [];
  if (!rules.length) return `<div class="settingsJobEmpty">No synced folders yet. Open Google Drive or Dropbox, then tap Sync on a folder.</div>`;

  return rules.map((rule) => {
    const provider = cloudSyncProviderLabel(rule.provider);
    const folder = rule.provider === "google_drive" ? (rule.folderId || "root") : (rule.path || "/");
    return `
      <div class="settingsCloudSyncRule">
        <span class="settingsCloudSyncIcon">${iconHtml(rule.provider === "google_drive" ? "google-drive" : "dropbox")}</span>
        <div class="settingsCloudSyncMain">
          <strong>${escapeHtml(rule.title || provider)}</strong>
          <span>${escapeHtml(provider)} · ${escapeHtml(rule.accountLabel || rule.accountId || "Cloud account")}</span>
          <em>${escapeHtml(folder)} · Last sync: ${escapeHtml(formatSettingsDate(rule.lastSyncAt))}</em>
          <label class="settingsCloudSyncRuleSelect">
            <span>Player category</span>
            <select data-cloud-sync-rule-category="${escapeHtml(rule.id)}">
              ${cloudSyncCategoryOptionsHtml(rule.category || guessCloudSyncCategoryFromTitle(rule.title || folder))}
            </select>
          </label>
        </div>
        <div class="settingsCloudSyncActions">
          <button class="settingsTinyBtn sync" data-cloud-sync-run="${escapeHtml(rule.id)}" type="button">Sync</button>
          <button class="settingsTinyBtn danger" data-cloud-sync-delete="${escapeHtml(rule.id)}" type="button">Remove</button>
        </div>
      </div>
    `;
  }).join("");
}

function renderCloudSyncJobs() {
  const jobs = Array.isArray(settingsCloudSyncJobs) ? settingsCloudSyncJobs : [];
  if (!jobs.length) return `<div class="settingsJobEmpty">No sync jobs yet.</div>`;

  return jobs.map((job) => {
    const percent = Math.max(0, Math.min(100, Number(job.percent || 0)));
    const doneClass = job.status === "complete" ? "isDone" : job.status === "failed" ? "isFailed" : "isProcessing";
    return `
      <div class="settingsJobCard ${doneClass}">
        <span class="settingsJobCardFillLayer" style="width:${percent}%"></span>
        <div class="settingsJobCardInner">
          <div class="settingsJobRow">
            <div class="settingsJobTitle">${escapeHtml(job.title || "Cloud sync")}</div>
            <div class="settingsJobRight">${Math.round(percent)}%</div>
          </div>
          <div class="settingsJobDetail">${escapeHtml(job.message || job.status || "Syncing")}${job.currentFile ? ` · ${escapeHtml(job.currentFile)}` : ""}</div>
          <div class="settingsCloudSyncJobMeta">
            <span>${escapeHtml(cloudSyncProviderLabel(job.provider))}</span>
            ${job.category ? `<span>${escapeHtml(job.categoryLabel || job.category)}</span>` : ""}
            <span>${Number(job.importedFiles || 0)} imported</span>
            <span>${Number(job.skippedFiles || 0)} skipped</span>
            <span>${Number(job.failedFiles || 0)} failed</span>
          </div>
          ${job.error ? `<div class="settingsJobDetail error">${escapeHtml(job.error)}</div>` : ""}
        </div>
      </div>
    `;
  }).join("");
}

function directImportToolHtml() {
  return `
    <div class="settingsToolPanel">
      <input id="settingsDirectImportUrl" class="settingsToolInput" value="${escapeHtml(settingsCloudState.directUrl || "")}" placeholder="https://example.com/audio-file.mp3" />

      <div class="settingsToolActions">
        <button class="settingsToolBtn primary" data-direct-import-start type="button">
          ${iconHtml("cloud-arrow-down")}
          <span>Start Direct Import</span>
        </button>
        <button class="settingsToolBtn" data-direct-import-refresh type="button">
          ${iconHtml("rotate-left")}
          <span>Refresh jobs</span>
        </button>
      </div>

      <div id="settingsDirectImportStatus" class="settingsToolSummary">Ready for direct/user-owned audio links.</div>
      <div id="settingsDirectImportJobs" class="settingsJobList"></div>
    </div>
  `;
}

function getSourceLinksSafe() {
  const saved = readPersistedJson(URL_SOURCE_LINKS_KEY, []);
  return Array.isArray(saved) ? saved : [];
}

function getSourceLinkBrandIcon(link = {}) {
  const url = String(link.url || "").toLowerCase();
  if (url.includes("soundcloud.com")) return "soundcloud";
  if (url.includes("mixcloud.com")) return "mixcloud";
  if (url.includes("wa.me") || url.includes("whatsapp.com")) return "whatsapp";
  if (url.includes("dropbox.com")) return "dropbox";
  if (url.includes("drive.google.com") || url.includes("google.com")) return "google-drive";
  return "link";
}

function sourceLinksToolHtml() {
  const links = getSourceLinksSafe();

  return `
    <div class="settingsToolPanel">
      <input id="settingsSourceLinkTitle" class="settingsToolInput" placeholder="Title / note" />
      <input id="settingsSourceLinkUrl" class="settingsToolInput" placeholder="https://soundcloud.com/…" />

      <div class="settingsToolActions">
        <button class="settingsToolBtn primary" data-source-link-add type="button">
          ${iconHtml("link")}
          <span>Save source link</span>
        </button>
        <button class="settingsToolBtn" data-route="/settings?module=cloud&tab=import" type="button">
          ${iconHtml("cloud-arrow-down")}
          <span>Open Import section</span>
        </button>
      </div>

      <div class="settingsSourceLinkList">
        ${links.length ? links.map((link, index) => `
          <div class="settingsSourceLinkRow settingsSourceLinkBrandRow">
            <span class="settingsSourceLinkIcon">${iconHtml(getSourceLinkBrandIcon(link))}</span>
            <span class="settingsSourceLinkText">
              <strong>${escapeHtml(link.title || link.url || "Source link")}</strong>
              <em>${escapeHtml(link.url || "")}</em>
            </span>
            <button class="settingsTinyBtn danger" data-source-link-remove="${index}" type="button">Remove</button>
          </div>
        `).join("") : `<div class="settingsJobEmpty">No source links saved yet.</div>`}
      </div>
    </div>
  `;
}

function getSettingsFileCounts(items = []) {
  return items.reduce((counts, item) => {
    counts.all += 1;
    counts[getSettingsTrackSourceKey(item)] = (counts[getSettingsTrackSourceKey(item)] || 0) + 1;
    return counts;
  }, { all: 0, local: 0, google: 0, dropbox: 0 });
}

function getFilteredSettingsFiles(items = []) {
  if (settingsFileFilter === "all") return items;
  return items.filter((item) => getSettingsTrackSourceKey(item) === settingsFileFilter);
}

function fileFilterButtonHtml(key, title, icon, count = 0) {
  const active = settingsFileFilter === key;
  return `
    <button class="settingsToolBtn settingsFileFilterBtn ${active ? "active" : ""}" data-file-filter="${escapeHtml(key)}" type="button">
      ${iconHtml(icon)}
      <span>${escapeHtml(title)} <b>${count}</b></span>
    </button>
  `;
}

function getSettingsQuickTagsForItem(item = {}) {
  const id = String(item.id || item.trackId || "");
  return settingsQuickEditTags[id] || item.brmediaTags || item.brmedia || {};
}

function settingsQuickBrandOptionsHtml(value = "") {
  const options = [
    ["", "Choose brand…"],
    ["Blackburn Ravers", "Blackburn Ravers"],
    ["DJ NJ", "DJ NJ"],
    ["Upalnite", "Upalnite"],
    ["DJ NJ & Upalnite", "DJ NJ & Upalnite"],
    ["Other", "Other"],
  ];

  return options.map(([key, label]) => `<option value="${escapeHtml(key)}" ${String(value || "") === key ? "selected" : ""}>${escapeHtml(label)}</option>`).join("");
}

function settingsQuickBrandImageOptionsHtml(value = "") {
  const options = [
    ["", "Auto / none"],
    ["br", "Blackburn Ravers image"],
    ["nj", "DJ NJ image"],
    ["up", "Upalnite image"],
  ];

  return options.map(([key, label]) => `<option value="${escapeHtml(key)}" ${String(value || "") === key ? "selected" : ""}>${escapeHtml(label)}</option>`).join("");
}

function settingsQuickReleaseTypeOptionsHtml(value = "Mix") {
  const options = ["Mix", "Radio Show", "Free Song", "DJ MP3 / WAV", "Preview", "Other"];
  return options.map((label) => `<option value="${escapeHtml(label)}" ${String(value || "Mix") === label ? "selected" : ""}>${escapeHtml(label)}</option>`).join("");
}

function settingsQuickCategoryOptionsHtml(value = "") {
  const safeValue = value || "auto";
  return CLOUD_SYNC_CATEGORY_OPTIONS.map((option) => `
    <option value="${escapeHtml(option.value)}" ${String(safeValue) === option.value ? "selected" : ""}>${escapeHtml(option.label)}</option>
  `).join("");
}

function settingsTracklistFilesOptionsHtml() {
  if (!settingsTracklistFilesLoaded) return `<option value="">Tracklist list not loaded yet</option>`;
  if (!settingsTracklistFiles.length) return `<option value="">No .txt / .cue / .json tracklists found</option>`;

  return [
    `<option value="">Choose existing tracklist…</option>`,
    ...settingsTracklistFiles.map((file) => `
      <option value="${escapeHtml(file.path)}">${escapeHtml(file.name)}${file.folder ? ` — ${escapeHtml(file.folder)}` : ""}</option>
    `),
  ].join("");
}

async function ensureSettingsTracklistFilesLoaded(force = false) {
  if (settingsTracklistFilesLoaded && !force) return settingsTracklistFiles;

  try {
    const data = await settingsApiJson("/tracklist-files");
    settingsTracklistFiles = Array.isArray(data?.items) ? data.items : [];
  } catch {
    settingsTracklistFiles = [];
  }

  settingsTracklistFilesLoaded = true;
  return settingsTracklistFiles;
}

async function loadSettingsQuickEditTags(id) {
  if (!id || settingsQuickEditTags[id]) return settingsQuickEditTags[id] || {};

  try {
    const data = await settingsApiJson(`/brmedia/custom-tags/${encodeURIComponent(id)}`);
    settingsQuickEditTags[id] = data?.tags && typeof data.tags === "object" ? data.tags : {};
  } catch {
    settingsQuickEditTags[id] = {};
  }

  return settingsQuickEditTags[id];
}

function settingsAudioQuickEditorHtml(item = {}) {
  const id = String(item.id || item.trackId || "");
  const tags = getSettingsQuickTagsForItem(item);
  const fileName = String(item.fileName || item.filename || item.locator || "").split(/[\\/]/).pop() || "";

  return `
    <div class="settingsAudioQuickEditor">
      <div class="settingsAudioQuickHead">
        <span>${iconHtml("sliders")}</span>
        <div>
          <strong>Audio Quick Editor</strong>
          <em>Fast organiser for name, tracklist attachment and BRMedia sorting. Use full Tagger when you want embedded ID3/FLAC tag writing.</em>
        </div>
      </div>

      ${getSettingsTrackSourceKey(item) !== "local" ? `
        <div class="settingsAudioQuickNote">This is a cloud-linked item. Save a local copy first if you want physical rename and sidecar edits.</div>
      ` : ""}

      <div class="settingsAudioQuickSectionTitle">Display / file name</div>
      <div class="settingsAudioQuickGrid">
        <label class="settingsAudioQuickField">
          <span>Display title</span>
          <input id="settingsQuickTitleInput" value="${escapeHtml(tags.title || item.title || "")}" />
        </label>

        <label class="settingsAudioQuickField">
          <span>File name</span>
          <input id="settingsQuickFileNameInput" value="${escapeHtml(fileName)}" />
        </label>

        <label class="settingsAudioQuickField">
          <span>Artist</span>
          <input id="settingsQuickArtistInput" value="${escapeHtml(tags.artist || item.artist || "")}" />
        </label>

        <label class="settingsAudioQuickField">
          <span>Album / category text</span>
          <input id="settingsQuickAlbumInput" value="${escapeHtml(tags.album || item.album || "")}" />
        </label>

        <label class="settingsAudioQuickField">
          <span>Genre</span>
          <input id="settingsQuickGenreInput" value="${escapeHtml(tags.genre || item.genre || "")}" />
        </label>

        <label class="settingsAudioQuickField">
          <span>Year</span>
          <input id="settingsQuickYearInput" value="${escapeHtml(tags.year || item.year || "")}" />
        </label>
      </div>

      <div class="settingsAudioQuickSectionTitle">BRMedia branding / sorting</div>
      <div class="settingsAudioQuickGrid three">
        <label class="settingsAudioQuickField">
          <span>Primary brand</span>
          <select id="settingsQuickPrimaryBrandInput">${settingsQuickBrandOptionsHtml(tags.primaryBrand || "")}</select>
        </label>

        <label class="settingsAudioQuickField">
          <span>Player category</span>
          <select id="settingsQuickCategoryInput">${settingsQuickCategoryOptionsHtml(tags.category || item.brmediaCategory || item.category || "auto")}</select>
        </label>

        <label class="settingsAudioQuickField">
          <span>Brand image</span>
          <select id="settingsQuickBrandImageInput">${settingsQuickBrandImageOptionsHtml(tags.brandImageKey || "")}</select>
        </label>

        <label class="settingsAudioQuickField">
          <span>Series</span>
          <input id="settingsQuickSeriesInput" value="${escapeHtml(tags.series || "")}" placeholder="The Hardcore Medley / HTID / etc." />
        </label>

        <label class="settingsAudioQuickField">
          <span>Episode</span>
          <input id="settingsQuickEpisodeInput" value="${escapeHtml(tags.episode || "")}" placeholder="15 / 001 / etc." />
        </label>

        <label class="settingsAudioQuickField">
          <span>Release type</span>
          <select id="settingsQuickReleaseTypeInput">${settingsQuickReleaseTypeOptionsHtml(tags.releaseType || "Mix")}</select>
        </label>
      </div>

      <div class="settingsAudioQuickToggleRow">
        <label class="settingsAudioQuickToggle">
          <input id="settingsQuickFreeSongInput" type="checkbox" ${tags.freeSong ? "checked" : ""} />
          <span>Free song</span>
        </label>

        <label class="settingsAudioQuickToggle">
          <input id="settingsQuickRadioOnlyInput" type="checkbox" ${tags.radioOnly ? "checked" : ""} />
          <span>Radio only</span>
        </label>
      </div>

      <div class="settingsToolActions">
        <button class="settingsToolBtn primary" data-quick-edit-save="${escapeHtml(id)}" type="button">
          ${iconHtml("floppy-disk")}
          <span>Save quick edit</span>
        </button>

        <button class="settingsToolBtn" data-route="/tagger?trackId=${encodeURIComponent(id)}" type="button">
          ${iconHtml("tags")}
          <span>Open full Tagger</span>
        </button>
      </div>

      <div class="settingsAudioTracklistBox">
        <div class="settingsAudioQuickSectionTitle">Tracklist attachment</div>

        <div class="settingsAudioTracklistActions">
          <button class="settingsToolBtn primary" data-quick-tracklist-upload="${escapeHtml(id)}" type="button">
            ${iconHtml("file-arrow-up")}
            <span>Upload + attach txt/cue/json</span>
          </button>

          <button class="settingsToolBtn" data-quick-tracklist-refresh type="button">
            ${iconHtml("arrows-rotate")}
            <span>Refresh tracklists</span>
          </button>

          <input id="settingsQuickTracklistUploadInput" class="hidden" type="file" accept=".txt,.cue,.json,text/plain,application/json" />
        </div>

        <label class="settingsAudioQuickField">
          <span>Choose already uploaded tracklist</span>
          <select id="settingsQuickExistingTracklistSelect">${settingsTracklistFilesOptionsHtml()}</select>
        </label>

        <div class="settingsAudioTracklistActions">
          <button class="settingsToolBtn" data-quick-tracklist-attach-existing="${escapeHtml(id)}" type="button">
            ${iconHtml("list-timeline")}
            <span>Attach selected tracklist</span>
          </button>

          <button class="settingsToolBtn" data-route="/player?trackId=${encodeURIComponent(id)}" type="button">
            ${iconHtml("play")}
            <span>Open Player editor</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

async function toggleSettingsAudioQuickEdit(id) {
  if (!id) return;

  if (settingsQuickEditId === id) {
    settingsQuickEditId = "";
    renderSettingsTab("cloud", "files");
    return;
  }

  settingsQuickEditId = id;
  settingsSelectedFileId = id;
  await Promise.all([
    loadSettingsQuickEditTags(id),
    ensureSettingsTracklistFilesLoaded(false),
  ]);
  renderSettingsTab("cloud", "files");
}

function getSettingsAudioQuickBody() {
  return {
    title: $("settingsQuickTitleInput")?.value || "",
    fileName: $("settingsQuickFileNameInput")?.value || "",
    artist: $("settingsQuickArtistInput")?.value || "",
    album: $("settingsQuickAlbumInput")?.value || "",
    genre: $("settingsQuickGenreInput")?.value || "",
    year: $("settingsQuickYearInput")?.value || "",
    brmediaTags: {
      title: $("settingsQuickTitleInput")?.value || "",
      artist: $("settingsQuickArtistInput")?.value || "",
      album: $("settingsQuickAlbumInput")?.value || "",
      genre: $("settingsQuickGenreInput")?.value || "",
      year: $("settingsQuickYearInput")?.value || "",
      primaryBrand: $("settingsQuickPrimaryBrandInput")?.value || "",
      category: $("settingsQuickCategoryInput")?.value || "",
      brandImageKey: $("settingsQuickBrandImageInput")?.value || "",
      series: $("settingsQuickSeriesInput")?.value || "",
      episode: $("settingsQuickEpisodeInput")?.value || "",
      releaseType: $("settingsQuickReleaseTypeInput")?.value || "Mix",
      freeSong: !!$("settingsQuickFreeSongInput")?.checked,
      radioOnly: !!$("settingsQuickRadioOnlyInput")?.checked,
      tracklistStatus: "Attached / managed in BRMedia",
    },
  };
}

async function saveSettingsAudioQuickEdit(id) {
  if (!id) return;

  try {
    const data = await settingsPostJson(`/library/${encodeURIComponent(id)}/quick-edit`, getSettingsAudioQuickBody());
    if (data?.tags) settingsQuickEditTags[id] = data.tags;

    settingsLibraryLoaded = false;
    await ensureSettingsLibraryLoaded();
    showSettingsSaveNotice(data?.renamed ? "Quick edit saved and file renamed." : "Quick edit saved.");
    renderSettingsTab("cloud", "files");
  } catch (err) {
    showSettingsSaveNotice(`Quick edit failed: ${err?.message || String(err)}`);
  }
}

async function uploadQuickTracklistFile(id, file) {
  if (!id || !file) return;

  try {
    const res = await fetch(`/tracklist-attach/${encodeURIComponent(id)}?name=${encodeURIComponent(file.name || "tracklist.txt")}`, {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

    settingsTracklistFilesLoaded = false;
    await ensureSettingsTracklistFilesLoaded(true);
    showSettingsSaveNotice("Tracklist uploaded and attached.");
    renderSettingsTab("cloud", "files");
  } catch (err) {
    showSettingsSaveNotice(`Tracklist upload failed: ${err?.message || String(err)}`);
  }
}

async function attachExistingTracklistFile(id) {
  const selectedPath = $("settingsQuickExistingTracklistSelect")?.value || "";
  if (!id || !selectedPath) {
    showSettingsSaveNotice("Choose an existing tracklist first.");
    return;
  }

  try {
    await settingsPostJson(`/tracklist-attach-existing/${encodeURIComponent(id)}`, { path: selectedPath });
    showSettingsSaveNotice("Existing tracklist attached.");
    renderSettingsTab("cloud", "files");
  } catch (err) {
    showSettingsSaveNotice(`Attach tracklist failed: ${err?.message || String(err)}`);
  }
}

async function ensureSettingsSupportFilesLoaded(refresh = false) {
  if (settingsSupportFilesLoaded && !refresh) {
    return settingsSupportFiles;
  }

  try {
    const data =
      await settingsApiJson(
        `/library/support-files${refresh ? "?refresh=1" : ""}`
      );

    settingsSupportFiles =
      Array.isArray(data?.items)
        ? data.items
        : [];
  } catch {
    settingsSupportFiles = [];
  }

  settingsSupportFilesLoaded = true;
  return settingsSupportFiles;
}

function settingsViewFilesKindButtonHtml(key, title, icon, count = 0) {
  const active = settingsViewFilesKind === key;

  return `
    <button class="settingsToolBtn settingsViewFilesKindBtn ${active ? "active" : ""}" data-view-files-kind="${escapeHtml(key)}" type="button">
      ${iconHtml(icon)}
      <span>${escapeHtml(title)} <b>${count}</b></span>
    </button>
  `;
}

function settingsViewFilesSearchMatches(item = {}) {
  const query =
    String(
      settingsViewFilesSearch ||
      ""
    )
      .trim()
      .toLowerCase();

  if (!query) return true;

  return [
    item.title,
    item.name,
    item.fileName,
    item.filename,
    item.artist,
    item.album,
    item.genre,
    item.year,
    item.supportType,
    item.extension,
    item.folder,
    item.locator,
    item.path,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function settingsViewFilesVideoThumbStyle(item = {}) {
  const poster =
    settingsVideoPosterUrl(item);

  return poster
    ? `background-image:url('${String(poster).replace(/'/g, "%27")}')`
    : "";
}

function settingsViewFilesVideoMeta(item = {}) {
  return [
    item.year,
    item.genre,
    formatSettingsBytes(item.sizeBytes || 0),
    item.sourceStatus === "offline"
      ? "Offline"
      : "Local video",
  ]
    .filter(Boolean)
    .join(" · ");
}

function settingsViewFilesSupportMeta(item = {}) {
  return [
    item.supportType || "support",
    item.extension
      ? String(item.extension).toUpperCase()
      : "",
    formatSettingsBytes(item.sizeBytes || 0),
    item.folder || "Support",
  ]
    .filter(Boolean)
    .join(" · ");
}

function settingsViewFilesVideoRowHtml(item = {}) {
  const id =
    String(
      item.id ||
      ""
    );

  const isOpen =
    id &&
    id === String(
      settingsViewFilesSelectedId ||
      ""
    );

  return `
    <div class="settingsFileInlineWrap ${isOpen ? "open" : ""}">
      <button class="settingsFileRow settingsFileRowPro" data-view-files-open="video" data-view-files-id="${escapeHtml(id)}" type="button">
        <span class="settingsFileThumb settingsFileThumbVideo" style="${escapeHtml(settingsViewFilesVideoThumbStyle(item))}">${iconHtml("video")}</span>
        <span class="settingsFileMeta">
          <strong>${escapeHtml(settingsVideoTitle(item))}</strong>
          <em>${escapeHtml(settingsViewFilesVideoMeta(item))}</em>
          <span class="settingsFileChips">
            <b>Video</b>
            ${item.sourceStatus === "offline" ? `<b>Offline source</b>` : `<b>Ready</b>`}
          </span>
        </span>
        <span class="settingsFileChevron">${isOpen ? "⌄" : "›"}</span>
      </button>

      ${isOpen ? settingsViewFilesVideoMenuHtml(item) : ""}
    </div>
  `;
}

function settingsViewFilesVideoMenuHtml(item = {}) {
  const id =
    String(
      item.id ||
      ""
    );

  return `
    <div class="settingsFileMenu settingsFileInlineMenu">
      <div class="settingsFileMenuHero">
        <span class="settingsFileMenuThumb settingsFileThumbVideo" style="${escapeHtml(settingsViewFilesVideoThumbStyle(item))}">${iconHtml("video")}</span>

        <div>
          <strong>${escapeHtml(settingsVideoTitle(item))}</strong>
          <em>${escapeHtml(settingsViewFilesVideoMeta(item))}</em>
          <small class="settingsFileMenuPath">${escapeHtml(item.locator || "")}</small>
        </div>
      </div>

      <div class="settingsToolActions settingsToolActionsFour">
        <button class="settingsToolBtn primary" data-route="/video-player?videoId=${encodeURIComponent(id)}" type="button">
          ${iconHtml("play")}
          <span>Open video</span>
        </button>

        <button class="settingsToolBtn" data-route="/settings?module=video&tab=library" type="button">
          ${iconHtml("sliders")}
          <span>Video editor</span>
        </button>

        <button class="settingsToolBtn" data-view-video-delete-library="${escapeHtml(id)}" type="button">
          ${iconHtml("folder-minus")}
          <span>Remove from library</span>
        </button>

        <button class="settingsToolBtn danger" data-view-video-delete-physical="${escapeHtml(id)}" type="button">
          ${iconHtml("trash")}
          <span>Delete physical video</span>
        </button>
      </div>
    </div>
  `;
}

function settingsViewFilesSupportRowHtml(item = {}) {
  const id =
    String(
      item.id ||
      ""
    );

  const isOpen =
    id &&
    id === String(
      settingsViewFilesSelectedId ||
      ""
    );

  return `
    <div class="settingsFileInlineWrap ${isOpen ? "open" : ""}">
      <button class="settingsFileRow settingsFileRowPro" data-view-files-open="support" data-view-files-id="${escapeHtml(id)}" type="button">
        <span class="settingsFileThumb settingsFileThumbSupport">${iconHtml(item.supportType === "artwork" ? "image" : item.supportType === "subtitle" ? "closed-captioning" : "file-import")}</span>

        <span class="settingsFileMeta">
          <strong>${escapeHtml(item.fileName || item.name || "Supporting file")}</strong>
          <em>${escapeHtml(settingsViewFilesSupportMeta(item))}</em>

          <span class="settingsFileChips">
            <b>${escapeHtml(item.supportType || "support")}</b>
            <b>Uploaded support</b>
          </span>
        </span>

        <span class="settingsFileChevron">${isOpen ? "⌄" : "›"}</span>
      </button>

      ${isOpen ? settingsViewFilesSupportMenuHtml(item) : ""}
    </div>
  `;
}

function settingsViewFilesSupportMenuHtml(item = {}) {
  const id =
    String(
      item.id ||
      ""
    );

  const icon =
    item.supportType === "artwork"
      ? "image"
      : item.supportType === "subtitle"
        ? "closed-captioning"
        : "file-import";

  return `
    <div class="settingsFileMenu settingsFileInlineMenu">
      <div class="settingsFileMenuHero">
        <span class="settingsFileMenuThumb settingsFileThumbSupport">${iconHtml(icon)}</span>

        <div>
          <strong>${escapeHtml(item.fileName || item.name || "Supporting file")}</strong>
          <em>${escapeHtml(settingsViewFilesSupportMeta(item))}</em>
          <small class="settingsFileMenuPath">${escapeHtml(item.locator || "")}</small>
        </div>
      </div>

      <div class="settingsToolActions settingsToolActionsFour">
        <a class="settingsToolBtn primary" href="${escapeHtml(item.downloadUrl || `/library/support-files/${encodeURIComponent(id)}/download`)}">
          ${iconHtml("download")}
          <span>Download file</span>
        </a>

        ${item.supportType === "tracklist" ? `
          <button class="settingsToolBtn" data-route="/player" type="button">
            ${iconHtml("list-timeline")}
            <span>Open Player tracklists</span>
          </button>
        ` : ""}

        <button class="settingsToolBtn danger" data-support-file-delete="${escapeHtml(id)}" type="button">
          ${iconHtml("trash")}
          <span>Delete support file</span>
        </button>
      </div>
    </div>
  `;
}

async function deleteSettingsViewVideoItem(id, mode = "library") {
  if (!id) return;

  const physical =
    mode === "physical";

  const ok =
    window.confirm(
      physical
        ? "Delete this physical video file from disk? This cannot be undone."
        : "Remove this video from BRMedia only? The physical file will stay on disk."
    );

  if (!ok) return;

  try {
    await settingsDeleteJson(
      `/video-library/${encodeURIComponent(id)}?mode=${physical ? "physical" : "library"}`
    );

    settingsVideoLoaded = false;
    settingsViewFilesSelectedId = "";

    await ensureSettingsVideoLoaded(true);

    showSettingsSaveNotice(
      physical
        ? "Physical video file deleted."
        : "Video removed from BRMedia. Physical file kept."
    );

    renderSettingsTab("cloud", "files");
  } catch (err) {
    showSettingsSaveNotice(
      `Video delete failed: ${err?.message || String(err)}`
    );
  }
}

async function deleteSettingsSupportFile(id) {
  if (
    !id ||
    !window.confirm(
      "Delete this supporting file from disk? This cannot be undone."
    )
  ) {
    return;
  }

  try {
    await settingsDeleteJson(
      `/library/support-files/${encodeURIComponent(id)}`
    );

    settingsSupportFilesLoaded = false;
    settingsTracklistFilesLoaded = false;
    settingsViewFilesSelectedId = "";

    await Promise.all([
      ensureSettingsSupportFilesLoaded(true),
      ensureSettingsTracklistFilesLoaded(true),
    ]);

    showSettingsSaveNotice(
      "Supporting file deleted."
    );

    renderSettingsTab("cloud", "files");
  } catch (err) {
    showSettingsSaveNotice(
      `Supporting file delete failed: ${err?.message || String(err)}`
    );
  }
}

async function ensureSettingsHiddenAudioLoaded(refresh = false) {
  if (settingsHiddenAudioLoaded && !refresh) {
    return settingsHiddenAudioItems;
  }

  try {
    const data = await settingsApiJson("/library-hidden");
    settingsHiddenAudioItems = Array.isArray(data?.items) ? data.items : [];
  } catch {
    settingsHiddenAudioItems = [];
  }

  settingsHiddenAudioLoaded = true;
  return settingsHiddenAudioItems;
}

function settingsAudioSourceStateChipHtml(item = {}) {
  const source = getSettingsTrackSourceKey(item);

  if (source === "google") {
    return item.importedLocalItemId
      ? `<b>Cloud link + local copy</b>`
      : `<b>Cloud-only linked</b>`;
  }

  if (source !== "local") {
    return `<b>Cloud linked</b>`;
  }

  return item.sourceOnline === false
    ? `<b class="isWarn">Offline source</b>`
    : `<b>Local copy ready</b>`;
}

function settingsHiddenAudioRecoveryHtml() {
  return `
    <div class="settingsHiddenAudioPanel">
      <div class="settingsHiddenAudioHead">
        <div>
          <strong>Removed audio recovery</strong>
          <em>Library-only removal keeps the Windows file safe. Restore it here whenever you need it back in Player.</em>
        </div>

        <button class="settingsToolBtn" data-hidden-audio-refresh type="button">
          ${iconHtml("arrows-rotate")}
          <span>Refresh removed audio</span>
        </button>
      </div>

      <div class="settingsHiddenAudioList">
        ${settingsHiddenAudioItems.length ? settingsHiddenAudioItems.map((item) => {
          const online = item.sourceOnline !== false;
          return `
            <article class="settingsHiddenAudioCard ${online ? "isOnline" : "isOffline"}">
              <span>${iconHtml(online ? "music" : "triangle-exclamation")}</span>

              <div>
                <strong>${escapeHtml(getSettingsTrackTitle(item))}</strong>
                <em>${escapeHtml(getSettingsTrackMeta(item))}</em>
                <small>${escapeHtml(item.locator || "")}</small>
              </div>

              <div class="settingsHiddenAudioActions">
                <button class="settingsToolBtn" data-hidden-audio-copy-path="${escapeHtml(item.id || "")}" type="button">
                  ${iconHtml("clipboard")}
                  <span>Copy path</span>
                </button>

                <button class="settingsToolBtn primary" data-hidden-audio-restore="${escapeHtml(item.id || "")}" type="button" ${online ? "" : "disabled"}>
                  ${iconHtml("arrow-rotate-left")}
                  <span>${online ? "Restore to library" : "File offline"}</span>
                </button>
              </div>
            </article>
          `;
        }).join("") : `<div class="settingsJobEmpty">No audio files have been removed from the BRMedia library.</div>`}
      </div>
    </div>
  `;
}

async function copySettingsText(text = "") {
  const value = String(text || "");
  if (!value) return false;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {}

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {}

  textarea.remove();
  return copied;
}

async function copySettingsAudioPath(id, hidden = false) {
  const collection = hidden ? settingsHiddenAudioItems : settingsLibrary;
  const item = (collection || []).find((entry) => String(entry.id || entry.trackId || "") === String(id || ""));
  const copied = await copySettingsText(item?.locator || "");
  showSettingsSaveNotice(copied ? "Windows path copied." : "Could not copy the Windows path.");
}

async function hideSettingsAudioItem(id) {
  if (!id || !window.confirm("Remove this audio item from BRMedia only? The physical Windows file will stay safely on disk and can be restored later.")) return;

  try {
    await settingsPostJson(`/library/${encodeURIComponent(id)}/hide`, {});
    settingsLibraryLoaded = false;
    settingsHiddenAudioLoaded = false;
    settingsSelectedFileId = "";
    settingsQuickEditId = "";

    await Promise.all([
      ensureSettingsLibraryLoaded(),
      ensureSettingsHiddenAudioLoaded(true),
    ]);

    showSettingsSaveNotice("Audio removed from BRMedia only. Physical file kept safely on disk.");
    renderSettingsTab("cloud", "files");
  } catch (err) {
    showSettingsSaveNotice(`Remove from library failed: ${err?.message || String(err)}`);
  }
}

async function restoreSettingsHiddenAudioItem(id) {
  if (!id) return;

  try {
    await settingsPostJson(`/library-hidden/${encodeURIComponent(id)}/restore`, {});
    settingsLibraryLoaded = false;
    settingsHiddenAudioLoaded = false;

    await Promise.all([
      ensureSettingsLibraryLoaded(),
      ensureSettingsHiddenAudioLoaded(true),
    ]);

    showSettingsSaveNotice("Audio restored to the BRMedia library.");
    renderSettingsTab("cloud", "files");
  } catch (err) {
    showSettingsSaveNotice(`Restore failed: ${err?.message || String(err)}`);
  }
}

async function rescanSettingsAudioMetadata(id) {
  if (!id) return;

  try {
    await settingsPostJson(`/library/${encodeURIComponent(id)}/rescan-metadata`, {});
    settingsLibraryLoaded = false;
    await ensureSettingsLibraryLoaded();
    showSettingsSaveNotice("Audio metadata re-scanned and saved.");
    renderSettingsTab("cloud", "files");
  } catch (err) {
    showSettingsSaveNotice(`Metadata re-scan failed: ${err?.message || String(err)}`);
  }
}

async function rebuildSettingsAudioWaveform(id) {
  if (!id) return;

  try {
    const data = await settingsPostJson("/waveforms/generate", {
      scope: "single",
      id,
      force: true,
      count: playerSettings.waveformPeakCount || 1200,
    });

    showSettingsSaveNotice(
      Number(data?.failed || 0)
        ? "Waveform rebuild finished with an error. Open Waveform Settings for details."
        : "Waveform rebuilt for this audio file."
    );
  } catch (err) {
    showSettingsSaveNotice(`Waveform rebuild failed: ${err?.message || String(err)}`);
  }
}

function settingsAudioFileEditPageHtml(item = {}) {
  const id = item.id || item.trackId || "";
  return `
    <div class="settingsFileEditPage">
      <div class="settingsEditPageTop">
        <button class="settingsToolBtn" data-file-back-list type="button">${iconHtml("arrow-left")}<span>Back to audio files</span></button>
        <button class="settingsToolBtn primary" data-route="/player?trackId=${encodeURIComponent(id)}" type="button">${iconHtml("play")}<span>Open in Player</span></button>
      </div>
      ${fileActionMenuHtml(item)}
    </div>
  `;
}

function normaliseSettingsPathKey(value = "") {
  return String(value || "")
    .trim()
    .replace(/[\\/]+/g, "\\")
    .replace(/\\+$/g, "")
    .toLowerCase();
}

function settingsViewFilesInsideSourceRoot(item = {}) {
  const root = normaliseSettingsPathKey(settingsViewFilesSourceRoot);
  if (!root) return true;

  const locator = normaliseSettingsPathKey(item.locator || item.path || "");
  return locator === root || locator.startsWith(`${root}\\`);
}

function settingsViewFilesSourceFilterHtml() {
  if (!settingsViewFilesSourceRoot) return "";

  return `
    <div class="settingsFilesSourceFilter">
      <span>
        ${iconHtml("hard-drive")}
        Showing files from <code>${escapeHtml(settingsViewFilesSourceRoot)}</code>
      </span>

      <button class="settingsToolBtn" data-files-source-clear type="button">
        ${iconHtml("xmark")}
        <span>Show all sources</span>
      </button>
    </div>
  `;
}

function filesToolHtml() {
  const allAudioItems = settingsLibrary || [];
  const audioItems = getFilteredSettingsFiles(allAudioItems)
    .filter(settingsViewFilesInsideSourceRoot)
    .filter(settingsViewFilesSearchMatches);
  const audioCounts = getSettingsFileCounts(allAudioItems);
  const videoItems = (settingsVideoItems || [])
    .filter(settingsViewFilesInsideSourceRoot)
    .filter(settingsViewFilesSearchMatches);
  const supportItems = (settingsSupportFiles || []).filter(settingsViewFilesSearchMatches);
  const selectedAudioId = String(settingsSelectedFileId || "");
  const selectedAudioItem = audioItems.find((item) => String(item.id || item.trackId || "") === selectedAudioId) || null;
  const activeAudioLabel = { all: "All audio", local: "Local audio", google: "Google Drive audio", dropbox: "Dropbox audio" }[settingsFileFilter] || "All audio";

  return `
    <div class="settingsToolPanel settingsFilesProView">
      <div class="settingsFileSectionHero settingsFilesHero">
        <strong>BRMedia Files Manager</strong>
        <span>Audio, videos and supporting files now live in one manager. Use the top tabs to switch file type, then tap a row for its actions.</span>
      </div>

      <div class="settingsCompactActionGrid settingsFileMainActions">
        <button class="settingsToolBtn primary" data-files-refresh type="button">${iconHtml("rotate-left")}<span>Refresh files</span></button>
        <button class="settingsToolBtn" data-action="open-add-files-picker" type="button">${iconHtml("folder-plus")}<span>Upload media</span></button>
        <button class="settingsToolBtn" data-route="/settings?module=cloud&tab=google" type="button">${iconHtml("cloud")}<span>Cloud browsers</span></button>
        <button class="settingsToolBtn" data-route="/settings?module=server&tab=drives" type="button">${iconHtml("hard-drive")}<span>Library sources</span></button>
      </div>

      ${settingsViewFilesSourceFilterHtml()}

      <div class="settingsViewFilesKindGrid">
        ${settingsViewFilesKindButtonHtml("audio", "Audio", "music", allAudioItems.length)}
        ${settingsViewFilesKindButtonHtml("video", "Videos", "video", settingsVideoItems.length)}
        ${settingsViewFilesKindButtonHtml("support", "Supporting files", "file-import", settingsSupportFiles.length)}
      </div>

      <div class="settingsFileSearchRow">
        <input id="settingsFilesSearchInput" class="settingsToolInput" value="${escapeHtml(settingsViewFilesSearch)}" placeholder="Search the selected file type…" />
        <button class="settingsToolBtn primary" data-files-search type="button">${iconHtml("magnifying-glass")}<span>Search</span></button>
        <button class="settingsToolBtn" data-files-search-clear type="button">${iconHtml("xmark")}<span>Clear</span></button>
      </div>

      ${settingsViewFilesKind === "audio" ? `
        <div class="settingsToolActions settingsToolActionsFour settingsFileFilterGrid">
          ${fileFilterButtonHtml("all", "All", "folder-open", audioCounts.all)}
          ${fileFilterButtonHtml("local", "Local", "music", audioCounts.local)}
          ${fileFilterButtonHtml("google", "Google Drive", "google-drive", audioCounts.google)}
          ${fileFilterButtonHtml("dropbox", "Dropbox", "dropbox", audioCounts.dropbox)}
        </div>

        ${selectedAudioItem ? settingsAudioFileEditPageHtml(selectedAudioItem) : `
          <div class="settingsToolSummary">${activeAudioLabel}: ${audioItems.length} shown from ${allAudioItems.length} audio files. Tap a row to open its own edit/actions page.</div>
          <div class="settingsFileList settingsFileInlineList">
            ${audioItems.length ? audioItems.map((item) => fileRowHtml(item, selectedAudioId)).join("") : `<div class="settingsJobEmpty">No matching ${escapeHtml(activeAudioLabel.toLowerCase())} found yet.</div>`}
          </div>
        `}

        ${settingsHiddenAudioRecoveryHtml()}
      ` : settingsViewFilesKind === "video" ? `
        <div class="settingsToolSummary">Videos: ${videoItems.length} shown from ${settingsVideoItems.length} total. Tap a poster row for playback and safe-delete actions.</div>
        <div class="settingsFileList settingsFileInlineList">
          ${videoItems.length ? videoItems.map(settingsViewFilesVideoRowHtml).join("") : `<div class="settingsJobEmpty">No matching videos found yet.</div>`}
        </div>
      ` : `
        <div class="settingsToolSummary">Supporting files: ${supportItems.length} shown from ${settingsSupportFiles.length} uploaded files. Tracklists, artwork, playlists and subtitle files stay out of Player and Video library listings.</div>
        <div class="settingsFileList settingsFileInlineList">
          ${supportItems.length ? supportItems.map(settingsViewFilesSupportRowHtml).join("") : `<div class="settingsJobEmpty">No matching supporting files found yet.</div>`}
        </div>
      `}
    </div>
  `;
}

function fileRowHtml(item = {}, selectedId = "") {
  const id = String(item.id || item.trackId || "");
  const isOpen = id && id === String(selectedId || "");
  const source = getSettingsTrackSourceLabel(item);

  return `
    <div class="settingsFileInlineWrap ${isOpen ? "open" : ""}">
      <button class="settingsFileRow settingsFileRowPro" data-file-open="${escapeHtml(id)}" type="button">
        <span class="settingsFileThumb" style="${getSettingsTrackThumbStyle(item)}">${iconHtml("music")}</span>
        <span class="settingsFileMeta">
          <strong>${escapeHtml(getSettingsTrackTitle(item))}</strong>
          <em>${escapeHtml(getSettingsTrackMeta(item))}</em>
          <span class="settingsFileChips">
            <b>${escapeHtml(source)}</b>
            ${settingsAudioSourceStateChipHtml(item)}
            ${playerSettings.waveformShowInFileManager ? `<b>Waveform ready/check</b>` : ""}
          </span>
        </span>
        <span class="settingsFileChevron">${isOpen ? "⌄" : "›"}</span>
      </button>
      ${isOpen ? fileActionMenuHtml(item) : ""}
    </div>
  `;
}

function fileActionMenuHtml(item = {}) {
  const id = item.id || item.trackId || "";
  const quickOpen = settingsQuickEditId === id;
  const sourceKey = getSettingsTrackSourceKey(item);
  const isLocal = sourceKey === "local";

  return `
    <div class="settingsFileMenu settingsFileInlineMenu settingsFileActionSheet">
      <div class="settingsFileMenuHero settingsFileActionHero">
        <span class="settingsFileMenuThumb" style="${getSettingsTrackThumbStyle(item)}">${iconHtml("music")}</span>
        <div>
          <strong>${escapeHtml(getSettingsTrackTitle(item))}</strong>
          <em>${escapeHtml(getSettingsTrackMeta(item))}</em>
          <span class="settingsFileActionBadgeRow"><b>${escapeHtml(getSettingsTrackSourceLabel(item))}</b>${settingsAudioSourceStateChipHtml(item)}</span>
          <small class="settingsFileMenuPath">${escapeHtml(item.locator || "")}</small>
        </div>
      </div>

      <section class="settingsFileActionGroup isPrimary">
        <strong>Open & organise</strong>
        <div class="settingsFileActionGrid">
          <button class="settingsToolBtn primary" data-route="/player?trackId=${encodeURIComponent(id)}" type="button">${iconHtml("play")}<span>Play</span></button>
          ${isLocal ? `<a class="settingsToolBtn" href="/download/${encodeURIComponent(id)}">${iconHtml("download")}<span>Download</span></a>` : ""}
          ${sourceKey === "google" && !item.importedLocalItemId ? `<button class="settingsToolBtn" data-google-save-local="${escapeHtml(id)}" type="button">${iconHtml("cloud-arrow-down")}<span>Save local copy</span></button>` : ""}
          ${sourceKey === "google" && item.importedLocalItemId ? `<button class="settingsToolBtn" type="button" disabled>${iconHtml("circle-check")}<span>Local copy ready</span></button>` : ""}
          ${sourceKey === "google" ? `<button class="settingsToolBtn" data-google-refresh-metadata="${escapeHtml(id)}" type="button">${iconHtml("arrows-rotate")}<span>Refresh Drive tags</span></button>` : ""}
          <button class="settingsToolBtn" data-file-quick-edit="${escapeHtml(id)}" type="button">${iconHtml("sliders")}<span>${quickOpen ? "Close quick edit" : "Quick edit"}</span></button>
        </div>
      </section>

      <section class="settingsFileActionGroup">
        <strong>Send to module</strong>
        <div class="settingsFileActionGrid three">
          <button class="settingsToolBtn" data-route="/tagger?trackId=${encodeURIComponent(id)}" type="button">${iconHtml("tag")}<span>Tagger</span></button>
          <button class="settingsToolBtn" data-route="/mastering?trackId=${encodeURIComponent(id)}" type="button">${iconHtml("sliders")}<span>Mastering</span></button>
          <button class="settingsToolBtn" data-route="/converter?trackId=${encodeURIComponent(id)}" type="button">${iconHtml("arrows-rotate")}<span>Converter</span></button>
        </div>
      </section>

      <section class="settingsFileActionGroup">
        <strong>Library tools</strong>
        <div class="settingsFileActionGrid">
          ${isLocal ? `<button class="settingsToolBtn" data-file-copy-path="${escapeHtml(id)}" type="button">${iconHtml("clipboard")}<span>Copy path</span></button>` : ""}
          ${isLocal ? `<button class="settingsToolBtn" data-file-rescan-metadata="${escapeHtml(id)}" type="button">${iconHtml("arrows-rotate")}<span>Rescan tags</span></button>` : ""}
          ${isLocal ? `<button class="settingsToolBtn" data-file-waveform-rebuild="${escapeHtml(id)}" type="button">${iconHtml("waveform")}<span>Rebuild peaks</span></button>` : ""}
          <button class="settingsToolBtn" data-file-waveform="${escapeHtml(id)}" type="button">${iconHtml("waveform")}<span>Waveform settings</span></button>
          <button class="settingsToolBtn" data-route="/player?trackId=${encodeURIComponent(id)}" type="button">${iconHtml("list-timeline")}<span>Tracklist editor</span></button>
        </div>
      </section>

      <section class="settingsFileActionGroup isDanger">
        <strong>Library safety</strong>
        <div class="settingsFileActionGrid">
          ${isLocal ? `<button class="settingsToolBtn" data-file-hide="${escapeHtml(id)}" type="button">${iconHtml("folder-minus")}<span>Remove from library only</span></button>` : ""}
          <button class="settingsToolBtn danger" data-file-delete="${escapeHtml(id)}" type="button">${iconHtml("trash")}<span>${isLocal ? "Delete physical audio" : "Remove linked item"}</span></button>
        </div>
      </section>

      ${quickOpen ? settingsAudioQuickEditorHtml(item) : ""}
    </div>
  `;
}

function settingsDjSourceTypeLabel(type = "audio") {
  if (type === "both") return "Audio + video";
  if (type === "video") return "Video";
  return "Audio / DJ";
}

function settingsDjSourceStatusLabel(source = {}) {
  if (!source.enabled) return "Disabled";
  if (!source.online) return "Offline";
  if (!source.readable) return "Unreadable";
  return source.watch ? "Online · watching" : "Online";
}

async function ensureSettingsDjSourcesLoaded(force = false) {
  if (settingsDjSourcesLoaded && !force) return settingsDjSources;

  const data = await settingsApiJson("/server-settings/library-sources");
  settingsDjSources = Array.isArray(data?.sources) ? data.sources : [];
  settingsDjSourcesLoaded = true;
  return settingsDjSources;
}

function getSettingsDjAudioSources() {
  return (settingsDjSources || []).filter((source) => source.type === "audio" || source.type === "both");
}

function renderSettingsDjSourceCard(source = {}) {
  const online = !!source.online;
  const canUseAsDefault = source.type === "audio" || source.type === "both";
  const viewHref = `/settings?module=cloud&tab=files&kind=audio&sourceRoot=${encodeURIComponent(source.path || "")}`;

  return `
    <article class="settingsDjSourceCard ${online ? "isOnline" : "isOffline"}">
      <div class="settingsDjSourceTop">
        <span>${iconHtml(online ? "hard-drive" : "triangle-exclamation")}</span>
        <div>
          <strong>${escapeHtml(source.label || source.path || "DJ source")}</strong>
          <em>${escapeHtml(source.path || "")}</em>
        </div>
        <b>${escapeHtml(settingsDjSourceStatusLabel(source))}</b>
      </div>

      <div class="settingsDjSourceBadges">
        <span>${escapeHtml(settingsDjSourceTypeLabel(source.type))}</span>
        ${source.watch ? `<span>Watch on</span>` : `<span>Watch off</span>`}
        ${source.defaultAudioTarget ? `<span class="isDefault">Default audio</span>` : ""}
        ${source.includeSubfolders !== false ? `<span>Subfolders</span>` : `<span>Top folder only</span>`}
      </div>

      <div class="settingsDjSourceMetrics">
        <span><strong>${Number(source.indexedAudio || 0)}</strong><em>audio files</em></span>
        <span><strong>${escapeHtml(formatSettingsDriveBytes(source.freeBytes || 0))}</strong><em>free</em></span>
      </div>

      <div class="settingsDjSourceActions">
        <a class="settingsToolBtn primary" href="${escapeHtml(viewHref)}">${iconHtml("folder-open")}<span>View files</span></a>
        <button class="settingsToolBtn" data-dj-source-sync="${escapeHtml(source.id)}" type="button">${iconHtml("arrows-rotate")}<span>Sync</span></button>
        <button class="settingsToolBtn" data-dj-source-toggle-watch="${escapeHtml(source.id)}" type="button">${iconHtml(source.watch ? "pause" : "play")}<span>${source.watch ? "Stop watch" : "Watch"}</span></button>
        ${canUseAsDefault ? `<button class="settingsToolBtn" data-dj-source-default="${escapeHtml(source.id)}" type="button">${iconHtml("circle-check")}<span>Default</span></button>` : ""}
        <button class="settingsToolBtn danger" data-dj-source-remove="${escapeHtml(source.id)}" type="button">${iconHtml("trash")}<span>Remove</span></button>
      </div>
    </article>
  `;
}

function renderDjSourceManagerHtml() {
  const sources = getSettingsDjAudioSources();
  const online = sources.filter((source) => source.enabled && source.online).length;
  const offline = sources.filter((source) => source.enabled && !source.online).length;
  const audioFiles = sources.reduce((sum, source) => sum + Number(source.indexedAudio || 0), 0);
  const defaultAudio = sources.find((source) => source.defaultAudioTarget)?.path || "Not selected";

  if (!settingsDjSourcesLoaded) {
    return `
      <article class="settingsCard settingsWideCard settingsDjSourceManager">
        <div class="settingsCardHead"><span class="settingsCardIcon">${iconHtml("spinner")}</span><div><h4>Loading DJ sources</h4><p>Reading saved BRMedia drives and folders.</p></div></div>
      </article>
    `;
  }

  return `
    <section class="settingsDjSourceManager">
      <div class="settingsDjSourceMetricGrid">
        <span><strong>${sources.length}</strong><em>DJ/audio sources</em></span>
        <span><strong>${online}</strong><em>online</em></span>
        <span class="${offline ? "isWarn" : ""}"><strong>${offline}</strong><em>offline</em></span>
        <span><strong>${audioFiles}</strong><em>audio files</em></span>
      </div>

      <article class="settingsCard settingsWideCard settingsDjSourceHero">
        <div class="settingsCardHead">
          <span class="settingsCardIcon">${iconHtml("hard-drive")}</span>
          <div>
            <h4>Add DJ music drives</h4>
            <p>Add E:\\, F:\\, external USB drives, network shares or any folder visible to the BRMedia server PC. Offline drives stay saved.</p>
          </div>
        </div>

        <div class="settingsDjSourceNotice">${escapeHtml(settingsDjSourcesNotice)}</div>

        <div class="settingsDjSourceForm">
          <label><span>Friendly name</span><input id="settingsDjSourceLabel" type="text" placeholder="Example: E Drive Hardcore" /></label>
          <label><span>Folder path</span><input id="settingsDjSourcePath" type="text" placeholder="Example: E:\\DJ Music" /></label>
          <label><span>Source type</span><select id="settingsDjSourceType"><option value="audio">Audio / DJ tracks</option><option value="both">Audio + video</option></select></label>
        </div>

        <div class="settingsDjSourceToggleRow">
          <label><input id="settingsDjSourceWatch" type="checkbox" checked /> <span>Watch for new files</span></label>
          <label><input id="settingsDjSourceDefault" type="checkbox" /> <span>Make default audio target</span></label>
        </div>

        <div class="settingsCompactActionGrid">
          <button class="settingsToolBtn primary" data-dj-source-add type="button">${iconHtml("folder-plus")}<span>${settingsDjSourcesBusy === "add" ? "Saving…" : "Add DJ source"}</span></button>
          <button class="settingsToolBtn" data-dj-source-sync-all type="button">${iconHtml("arrows-rotate")}<span>${settingsDjSourcesBusy === "sync-all" ? "Syncing…" : "Sync all sources"}</span></button>
          <a class="settingsToolBtn" href="/server-settings?section=sources">${iconHtml("sliders")}<span>Deep source manager</span></a>
          <a class="settingsToolBtn" href="/settings?module=cloud&amp;tab=files&amp;kind=audio">${iconHtml("folder-open")}<span>View audio files</span></a>
        </div>

        <p class="settingsDriveSafetyNote">${iconHtml("shield-check")} Removing a source here never deletes the actual files. It only removes the folder from BRMedia indexing.</p>
        <p class="settingsDjSourceDefaultPath"><strong>Default audio destination:</strong> ${escapeHtml(defaultAudio)}</p>
      </article>

      <section class="settingsDjSourceList">
        ${sources.length ? sources.map(renderSettingsDjSourceCard).join("") : `<div class="settingsJobEmpty">No DJ/audio sources yet. Add C:\\DJMixes, E:\\, F:\\ or any other folder above.</div>`}
      </section>
    </section>
  `;
}

async function addSettingsDjSource() {
  const label = $("settingsDjSourceLabel")?.value || "";
  const folderPath = $("settingsDjSourcePath")?.value || "";
  const type = $("settingsDjSourceType")?.value || "audio";
  const watch = $("settingsDjSourceWatch")?.checked !== false;
  const defaultAudioTarget = $("settingsDjSourceDefault")?.checked === true;

  if (!folderPath.trim()) {
    settingsDjSourcesNotice = "Type the folder path first, for example E:\\DJ Music.";
    renderSettingsTab("dj", activeChildSettingsTab);
    return;
  }

  settingsDjSourcesBusy = "add";
  settingsDjSourcesNotice = "Saving DJ source…";
  renderSettingsTab("dj", activeChildSettingsTab);

  try {
    const data = await settingsApiJson("/server-settings/library-sources", {
      method: "POST",
      body: JSON.stringify({
        label,
        path: folderPath,
        type,
        enabled: true,
        watch,
        includeSubfolders: true,
        defaultAudioTarget,
      }),
    });
    settingsDjSources = Array.isArray(data?.sources) ? data.sources : settingsDjSources;
    settingsDriveSourcesLoaded = false;
    settingsDjSourcesLoaded = true;
    settingsDjSourcesNotice = "DJ source saved and synced.";
    showSettingsSaveNotice("DJ source saved.");
  } catch (err) {
    settingsDjSourcesNotice = `DJ source save failed: ${err?.message || String(err)}`;
  }

  settingsDjSourcesBusy = "";
  renderSettingsTab("dj", activeChildSettingsTab);
}

async function syncSettingsDjSources(id = "") {
  settingsDjSourcesBusy = id ? `sync:${id}` : "sync-all";
  settingsDjSourcesNotice = id ? "Syncing selected DJ source…" : "Syncing all DJ sources…";
  renderSettingsTab("dj", activeChildSettingsTab);

  try {
    const url = id ? `/server-settings/library-sources/${encodeURIComponent(id)}/sync` : "/server-settings/library-sources/sync-all";
    const data = await settingsApiJson(url, { method: "POST", body: "{}" });
    settingsDjSources = Array.isArray(data?.sources) ? data.sources : settingsDjSources;
    settingsDriveSourcesLoaded = false;
    settingsDjSourcesLoaded = true;
    settingsDjSourcesNotice = id ? "DJ source synced." : "All DJ sources synced.";
  } catch (err) {
    settingsDjSourcesNotice = `DJ source sync failed: ${err?.message || String(err)}`;
  }

  settingsDjSourcesBusy = "";
  renderSettingsTab("dj", activeChildSettingsTab);
}

async function updateSettingsDjSource(id = "", patch = {}) {
  const source = settingsDjSources.find((item) => String(item.id) === String(id));
  if (!source) return;

  settingsDjSourcesBusy = `save:${id}`;
  settingsDjSourcesNotice = "Updating DJ source…";
  renderSettingsTab("dj", activeChildSettingsTab);

  try {
    const data = await settingsApiJson("/server-settings/library-sources", {
      method: "POST",
      body: JSON.stringify({ ...source, ...patch }),
    });
    settingsDjSources = Array.isArray(data?.sources) ? data.sources : settingsDjSources;
    settingsDriveSourcesLoaded = false;
    settingsDjSourcesLoaded = true;
    settingsDjSourcesNotice = "DJ source updated.";
  } catch (err) {
    settingsDjSourcesNotice = `DJ source update failed: ${err?.message || String(err)}`;
  }

  settingsDjSourcesBusy = "";
  renderSettingsTab("dj", activeChildSettingsTab);
}

async function removeSettingsDjSource(id = "") {
  const source = settingsDjSources.find((item) => String(item.id) === String(id));
  if (!source) return;
  if (!window.confirm(`Remove ${source.label || source.path} from BRMedia sources? The actual files will not be deleted.`)) return;

  settingsDjSourcesBusy = `remove:${id}`;
  settingsDjSourcesNotice = "Removing DJ source…";
  renderSettingsTab("dj", activeChildSettingsTab);

  try {
    const data = await settingsApiJson(`/server-settings/library-sources/${encodeURIComponent(id)}`, { method: "DELETE" });
    settingsDjSources = Array.isArray(data?.sources) ? data.sources : settingsDjSources.filter((item) => item.id !== id);
    settingsDriveSourcesLoaded = false;
    settingsDjSourcesLoaded = true;
    settingsDjSourcesNotice = "DJ source removed. Physical files were left untouched.";
  } catch (err) {
    settingsDjSourcesNotice = `DJ source removal failed: ${err?.message || String(err)}`;
  }

  settingsDjSourcesBusy = "";
  renderSettingsTab("dj", activeChildSettingsTab);
}

function bindDjSourceManagerEvents() {
  settingsCards.querySelector("[data-dj-source-add]")?.addEventListener("click", addSettingsDjSource);
  settingsCards.querySelector("[data-dj-source-sync-all]")?.addEventListener("click", () => syncSettingsDjSources(""));

  settingsCards.querySelectorAll("[data-dj-source-sync]").forEach((button) => {
    button.addEventListener("click", () => syncSettingsDjSources(button.dataset.djSourceSync || ""));
  });

  settingsCards.querySelectorAll("[data-dj-source-toggle-watch]").forEach((button) => {
    button.addEventListener("click", () => {
      const source = settingsDjSources.find((item) => String(item.id) === String(button.dataset.djSourceToggleWatch));
      if (source) void updateSettingsDjSource(source.id, { watch: !source.watch });
    });
  });

  settingsCards.querySelectorAll("[data-dj-source-default]").forEach((button) => {
    button.addEventListener("click", () => updateSettingsDjSource(button.dataset.djSourceDefault || "", { defaultAudioTarget: true }));
  });

  settingsCards.querySelectorAll("[data-dj-source-remove]").forEach((button) => {
    button.addEventListener("click", () => removeSettingsDjSource(button.dataset.djSourceRemove || ""));
  });
}

function renderCloudSubTabs() {
  if (!playerSettingsSubTabs) return;

  playerSettingsSubTabs.classList.remove("hidden");
  playerSettingsSubTabs.innerHTML = CLOUD_SETTINGS_TABS.map((tab) => `
    <button class="playerSettingsSubTab ${tab.key === activeChildSettingsTab ? "active" : ""}" data-cloud-settings-tab="${escapeHtml(tab.key)}" type="button">
      ${iconHtml(tab.icon)}
      <span>${escapeHtml(tab.title)}</span>
    </button>
  `).join("");

  playerSettingsSubTabs.querySelectorAll("[data-cloud-settings-tab]").forEach((button) => {
    button.addEventListener("click", () => renderSettingsTab("cloud", button.dataset.cloudSettingsTab || "overview"));
  });

  hydrateBrIcons(playerSettingsSubTabs);
}

function formatSettingsDriveBytes(value = 0) {
  const bytes = Number(value || 0);
  if (!bytes) return "—";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let index = 0;
  let size = bytes;

  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }

  return `${size >= 10 || index === 0 ? Math.round(size) : size.toFixed(1)} ${units[index]}`;
}

function settingsDriveSourceTypeLabel(type = "audio") {
  if (type === "video") return "Video library";
  if (type === "both") return "Audio + video library";
  return "Audio library";
}

async function loadSettingsDriveSources(force = false) {
  if (settingsDriveSourcesLoaded && !force) return settingsDriveSources;

  const data =
    await settingsApiJson("/server-settings/library-sources");

  settingsDriveSources =
    Array.isArray(data?.sources) ? data.sources : [];

  settingsDriveSourcesLoaded = true;

  return settingsDriveSources;
}

function renderSettingsDriveSourceCard(source = {}) {
  const online = !!source.online;
  const viewKind = source.type === "video" ? "video" : "audio";
  const viewHref = `/settings?module=cloud&tab=files&kind=${encodeURIComponent(viewKind)}&sourceRoot=${encodeURIComponent(source.path || "")}`;

  const status = !source.enabled ? "Disabled" : online ? (source.watch ? "Online · watching" : "Online · watch off") : "Offline · entries preserved";
  const storage = source.freeBytes ? `${formatSettingsDriveBytes(source.freeBytes)} free` : "Storage unavailable";

  return `
    <article class="settingsDriveSourceCard ${online ? "isOnline" : "isOffline"}">
      <div class="settingsDriveSourceCardTop">
        <span class="settingsDriveSourceIcon">${iconHtml(online ? "hard-drive" : "triangle-exclamation")}</span>
        <div><strong>${escapeHtml(source.label || source.path || "Library source")}</strong><em>${escapeHtml(source.path || "")}</em></div>
        <b>${escapeHtml(status)}</b>
      </div>

      <div class="settingsDriveSourceBadgeRow">
        <span>${escapeHtml(settingsDriveSourceTypeLabel(source.type))}</span>
        ${source.watch ? `<span>Watching folder</span>` : `<span>Watch disabled</span>`}
        ${source.defaultAudioTarget ? `<span class="isDefault">Default audio</span>` : ""}
        ${source.defaultVideoTarget ? `<span class="isDefault">Default video</span>` : ""}
      </div>

      <div class="settingsDriveSourceMetricGrid">
        <span><strong>${Number(source.indexedAudio || 0)}</strong><em>audio files</em></span>
        <span><strong>${Number(source.indexedVideo || 0)}</strong><em>video files</em></span>
        <span><strong>${escapeHtml(storage)}</strong><em>storage</em></span>
      </div>

      <div class="settingsCompactActionGrid settingsDriveSourceActions">
        <a class="settingsToolBtn primary" href="${escapeHtml(viewHref)}">${iconHtml("folder-open")}<span>View source files</span></a>
        <a class="settingsToolBtn" href="/server-settings?section=sources">${iconHtml("sliders")}<span>Manage source</span></a>
      </div>
    </article>
  `;
}

function bindSettingsDriveSourceOverviewEvents() {
  settingsCards
    .querySelector("[data-drive-sources-sync]")
    ?.addEventListener("click", async () => {
      settingsDriveSourcesBusy = true;
      renderSettingsDriveSourcesOverview();

      try {
        const data =
          await settingsApiJson("/server-settings/library-sources/sync-all", {
            method: "POST",
            body: "{}",
          });

        settingsDriveSources =
          Array.isArray(data?.sources)
            ? data.sources
            : settingsDriveSources;

        showSettingsSaveNotice("Library sources synced.");
      } catch (err) {
        showSettingsSaveNotice(
          `Library sync failed: ${err?.message || String(err)}`
        );
      }

      settingsDriveSourcesBusy = false;
      renderSettingsDriveSourcesOverview();
    });

  settingsCards
    .querySelector("[data-drive-sources-manager]")
    ?.addEventListener("click", () => {
      window.location.href =
        "/server-settings?section=sources";
    });

  settingsCards
    .querySelector("[data-drive-sources-files]")
    ?.addEventListener("click", () => {
      renderSettingsTab("cloud", "files");
    });
}

async function renderSettingsDriveSourcesOverview() {
  playerSettingsSubTabs?.classList.add("hidden");
  settingsActiveTitle.textContent = "Library Sources / Drives";
  settingsActiveBadge.textContent = "Drives";

  settingsCards.innerHTML = `<article class="settingsCard"><div class="settingsCardHead"><span class="settingsCardIcon">${iconHtml("spinner")}</span><div><h4>Loading library sources</h4><p>Reading saved BRMedia drives and folders.</p></div></div></article>`;
  renderSettingsSidebarTree();

  try {
    await loadSettingsDriveSources(true);
  } catch (err) {
    settingsCards.innerHTML = `<article class="settingsCard"><div class="settingsCardHead"><span class="settingsCardIcon">${iconHtml("triangle-exclamation")}</span><div><h4>Could not load library sources</h4><p>${escapeHtml(err?.message || String(err))}</p></div></div></article>`;
    hydrateBrIcons(settingsCards);
    return;
  }

  const sources = settingsDriveSources;
  const online = sources.filter((source) => source.enabled && source.online).length;
  const offline = sources.filter((source) => source.enabled && !source.online).length;
  const audio = sources.reduce((sum, source) => sum + Number(source.indexedAudio || 0), 0);
  const video = sources.reduce((sum, source) => sum + Number(source.indexedVideo || 0), 0);
  const defaultAudio = sources.find((source) => source.defaultAudioTarget)?.path || "Not selected";
  const defaultVideo = sources.find((source) => source.defaultVideoTarget)?.path || "Not selected";

  settingsCards.innerHTML = `
    <div class="settingsDriveMetricGrid">
      <span><strong>${sources.length}</strong><em>saved sources</em></span>
      <span><strong>${online}</strong><em>online</em></span>
      <span class="${offline ? "isWarn" : ""}"><strong>${offline}</strong><em>offline</em></span>
      <span><strong>${audio} / ${video}</strong><em>audio / video files</em></span>
    </div>

    <article class="settingsCard settingsWideCard settingsDriveOverviewHero">
      <div class="settingsCardHead"><span class="settingsCardIcon">${iconHtml("hard-drive")}</span><div><h4>Library Sources / Drives</h4><p>View source health here. Add folders, edit watches and choose default destinations inside the deeper Server Settings manager.</p></div></div>

      <div class="settingsDriveDefaultGrid">
        <span><strong>Default audio destination</strong><em>${escapeHtml(defaultAudio)}</em></span>
        <span><strong>Default video destination</strong><em>${escapeHtml(defaultVideo)}</em></span>
      </div>

      <div class="settingsCompactActionGrid">
        <button class="settingsToolBtn primary" data-drive-sources-sync type="button">${iconHtml("arrows-rotate")}<span>${settingsDriveSourcesBusy ? "Syncing…" : "Sync all sources"}</span></button>
        <button class="settingsToolBtn" data-drive-sources-manager type="button">${iconHtml("sliders")}<span>Manage drives</span></button>
        <a class="settingsToolBtn" href="/settings?module=cloud&amp;tab=files">${iconHtml("folder-open")}<span>View all files</span></a>
        <a class="settingsToolBtn" href="/settings?module=cloud&amp;tab=add-files">${iconHtml("upload")}<span>Upload media</span></a>
      </div>

      <p class="settingsDriveSafetyNote">${iconHtml("shield-check")} Offline or unplugged drives stay saved. BRMedia preserves manifest entries until the source reconnects.</p>
    </article>

    <section class="settingsDriveSourceList">${sources.length ? sources.map(renderSettingsDriveSourceCard).join("") : `<div class="settingsJobEmpty">No saved library sources yet. Open Manage drives to add your first audio or video folder.</div>`}</section>
  `;

  bindSettingsDriveSourceOverviewEvents();
  hydrateBrIcons(settingsCards);
}

function renderCloudSettingsTabContent() {
  const tab = getCloudTabDefinition(activeChildSettingsTab);

  settingsActiveTitle.textContent = tab.title;
  settingsActiveBadge.textContent = "Cloud";
  renderCloudSubTabs();

  settingsCards.innerHTML = `
    <div class="settingsTabIntro">
      <p>${escapeHtml(tab.desc)}</p>
    </div>

    ${tab.cards.map((card) => `
      <article class="settingsCard settingsLiveCard settingsWideCard">
        <div class="settingsCardHead">
          <span class="settingsCardIcon">${iconHtml(card.icon)}</span>
          <div>
            <h4>${escapeHtml(card.title)}</h4>
            <p>${escapeHtml(card.desc)}</p>
          </div>
        </div>
        ${card.html || ""}
      </article>
    `).join("")}
  `;

  bindCloudToolEvents();
  hydrateBrIcons(settingsCards);

  if (activeChildSettingsTab === "add-files" && settingsAutoOpenUploadPicker) {
    settingsAutoOpenUploadPicker = false;
    window.setTimeout(() => document.getElementById("settingsUploadInput")?.click(), 180);
  }
}

function renderCloudFilesLoadingShell() {
  settingsActiveTitle.textContent = "View Files";
  settingsActiveBadge.textContent = "Cloud";
  renderCloudSubTabs();

  settingsCards.innerHTML = `
    <article class="settingsCard settingsLiveCard settingsWideCard">
      <div class="settingsCardHead">
        <span class="settingsCardIcon">${iconHtml("spinner")}</span>
        <div>
          <h4>Loading Files Manager</h4>
          <p>Audio files are loading first. Video and supporting files will join the page as their library checks finish.</p>
        </div>
      </div>
    </article>
  `;

  hydrateBrIcons(settingsCards);
}

function settleSettingsUiTask(task, timeoutMs = 7000) {
  return Promise.race([
    Promise.resolve(task)
      .then((value) => ({ ok: true, value }))
      .catch((error) => ({ ok: false, error })),
    new Promise((resolve) => {
      window.setTimeout(
        () => resolve({ ok: false, timeout: true }),
        timeoutMs
      );
    }),
  ]);
}

function scheduleCloudFilesRepaint(task) {
  Promise.resolve(task)
    .then(() => {
      if (activeSettingsModule === "cloud" && activeChildSettingsTab === "files") {
        renderCloudSettingsTabContent();
      }
    })
    .catch(() => {});
}

function renderCloudSettingsFailure(error) {
  settingsActiveTitle.textContent = "Files / Imports";
  settingsActiveBadge.textContent = "Cloud";
  renderCloudSubTabs();

  settingsCards.innerHTML = `
    <article class="settingsCard settingsLiveCard settingsWideCard">
      <div class="settingsCardHead">
        <span class="settingsCardIcon">${iconHtml("triangle-exclamation")}</span>
        <div>
          <h4>Settings page could not finish loading</h4>
          <p>${escapeHtml(error?.message || String(error || "Unknown Settings error"))}</p>
        </div>
      </div>

      <div class="settingsToolActions">
        <button class="settingsToolBtn primary" data-cloud-settings-retry type="button">
          ${iconHtml("arrows-rotate")}
          <span>Retry this page</span>
        </button>
      </div>
    </article>
  `;

  settingsCards
    .querySelector("[data-cloud-settings-retry]")
    ?.addEventListener("click", () => {
      void renderCloudSettingsTab().catch(renderCloudSettingsFailure);
    });

  hydrateBrIcons(settingsCards);
}

async function renderCloudSettingsTab() {
  if (!CLOUD_SETTINGS_TABS.some((tab) => tab.key === activeChildSettingsTab)) {
    activeChildSettingsTab = "overview";
  }

  if (activeChildSettingsTab === "files") {
    renderCloudFilesLoadingShell();
  } else {
    settingsActiveBadge.textContent = "Cloud";
    renderCloudSubTabs();
  }

  await settleSettingsUiTask(
    ensureCloudAccountsLoaded(),
    5000
  );

  if (["files", "duplicates", "overview", "google"].includes(activeChildSettingsTab)) {
    const libraryTask = ensureSettingsLibraryLoaded();

    if (activeChildSettingsTab === "files") {
      scheduleCloudFilesRepaint(libraryTask);
    }

    await settleSettingsUiTask(
      libraryTask,
      7000
    );
  }

  if (["files", "overview"].includes(activeChildSettingsTab)) {
    const optionalTasks = [
      ensureSettingsVideoLoaded(false),
      ensureSettingsSupportFilesLoaded(false),
      ensureSettingsHiddenAudioLoaded(false),
    ];

    if (activeChildSettingsTab === "files") {
      optionalTasks.forEach(scheduleCloudFilesRepaint);
    } else {
      await Promise.all(
        optionalTasks.map((task) => settleSettingsUiTask(task, 7000))
      );
    }
  }

  if (activeChildSettingsTab === "files" && settingsRequestedFileId) {
    settingsSelectedFileId = settingsRequestedFileId;

    if (settingsRequestedQuickEdit) {
      settingsQuickEditId = settingsRequestedFileId;

      await Promise.all([
        settleSettingsUiTask(loadSettingsQuickEditTags(settingsRequestedFileId), 5000),
        settleSettingsUiTask(ensureSettingsTracklistFilesLoaded(false), 5000),
      ]);
    }

    settingsRequestedFileId = "";
    settingsRequestedQuickEdit = false;
  }

  if (activeChildSettingsTab === "files" && settingsRequestedVideoFileId) {
    settingsViewFilesKind = "video";
    settingsViewFilesSelectedId = settingsRequestedVideoFileId;
    settingsRequestedVideoFileId = "";
  }

  if (activeChildSettingsTab === "files" && settingsRequestedSupportFileId) {
    settingsViewFilesKind = "support";
    settingsViewFilesSelectedId = settingsRequestedSupportFileId;
    settingsRequestedSupportFileId = "";
  }

  if (activeChildSettingsTab === "sync" || activeChildSettingsTab === "overview") {
    await settleSettingsUiTask(
      ensureCloudSyncLoaded(),
      7000
    );
  }

  renderCloudSettingsTabContent();
}

async function ensureCloudAccountsLoaded() {
  try {
    const data = await settingsApiJson("/cloud/accounts");
    settingsCloudAccounts = Array.isArray(data?.accounts) ? data.accounts : [];
  } catch {
    settingsCloudAccounts = [];
  }

  return settingsCloudAccounts;
}

function bindCloudToolEvents() {
  bindSettingsUploadInput();

  document.getElementById("settingsDataImportInput")?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (file) void readDataImportFile(file);
  });

  settingsCards.querySelectorAll("[data-cloud-sync-pref]").forEach((field) => {
    field.addEventListener("change", () => {
      const value = field.type === "checkbox" ? !!field.checked : field.value;
      setCloudSyncPref(field.dataset.cloudSyncPref || "", value);
    });
  });

  settingsCards.querySelectorAll("[data-cloud-sync-rule-category]").forEach((field) => {
    field.addEventListener("change", () => updateCloudSyncRuleCategory(field.dataset.cloudSyncRuleCategory || "", field.value || "auto"));
  });

  settingsCards.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleSettingsAction(button.dataset.action || ""));
  });

  settingsCards.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => goToRoute(button.dataset.route || "/"));
  });

  settingsCards.querySelectorAll("[data-cloud-account-select]").forEach((select) => {
    select.addEventListener("change", () => {
      const provider = select.dataset.cloudAccountSelect;
      if (provider === "google") settingsCloudState.googleAccountId = select.value || "";
      if (provider === "dropbox") settingsCloudState.dropboxAccountId = select.value || "";
    });
  });

  settingsCards.querySelectorAll("[data-cloud-connect]").forEach((button) => {
    button.addEventListener("click", () => connectCloudProvider(button.dataset.cloudConnect || "google"));
  });

  settingsCards.querySelectorAll("[data-cloud-refresh-accounts]").forEach((button) => {
    button.addEventListener("click", async () => {
      await ensureCloudAccountsLoaded();
      renderSettingsTab("cloud", activeChildSettingsTab);
    });
  });

  settingsCards.querySelectorAll("[data-cloud-rename]").forEach((button) => {
    button.addEventListener("click", () => renameCloudAccount(button.dataset.cloudRename || ""));
  });

  settingsCards.querySelectorAll("[data-cloud-delete]").forEach((button) => {
    button.addEventListener("click", () => removeCloudAccount(button.dataset.cloudDelete || ""));
  });

  settingsCards.querySelectorAll("[data-cloud-list]").forEach((button) => {
    button.addEventListener("click", () => listCloudFiles(button.dataset.cloudList || "google"));
  });

  settingsCards.querySelectorAll("[data-cloud-search]").forEach((button) => {
    button.addEventListener("click", () => listCloudFiles(button.dataset.cloudSearch || "dropbox", true));
  });

  settingsCards.querySelectorAll("[data-cloud-root]").forEach((button) => {
    button.addEventListener("click", () => {
      const provider = button.dataset.cloudRoot || "google";

      if (provider === "dropbox") {
        settingsCloudState.dropboxPath = "";
        settingsCloudState.dropboxQuery = "";
        void listCloudFiles("dropbox");
        return;
      }

      settingsCloudState.googleFolderId = "root";
      settingsCloudState.googleQuery = "";
      settingsCloudState.googleBreadcrumbs = [{ id: "root", title: "My Drive" }];
      void listCloudFiles("google");
    });
  });

  settingsCards.querySelectorAll("[data-google-crumb]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.googleCrumb || "root";
      const crumbs = getGoogleDriveBreadcrumbs();
      const index = crumbs.findIndex((crumb) => crumb.id === id);
      settingsCloudState.googleBreadcrumbs = index >= 0 ? crumbs.slice(0, index + 1) : [{ id: "root", title: "My Drive" }];
      settingsCloudState.googleFolderId = id;
      settingsCloudState.googleQuery = "";
      void listCloudFiles("google");
    });
  });

  settingsCards.querySelector("[data-google-back]")?.addEventListener("click", () => {
    const crumbs = getGoogleDriveBreadcrumbs();
    if (crumbs.length > 1) crumbs.pop();
    settingsCloudState.googleBreadcrumbs = crumbs.length ? crumbs : [{ id: "root", title: "My Drive" }];
    settingsCloudState.googleFolderId = settingsCloudState.googleBreadcrumbs.at(-1)?.id || "root";
    settingsCloudState.googleQuery = "";
    void listCloudFiles("google");
  });
	
  settingsCards.querySelector("[data-dropbox-back]")?.addEventListener("click", () => {
    const clean = String(settingsCloudState.dropboxPath || "")
      .replace(/\\/g, "/")
      .replace(/\/+$/g, "");

    const parts = clean.split("/").filter(Boolean);
    parts.pop();

    settingsCloudState.dropboxPath = parts.length ? `/${parts.join("/")}` : "";
    settingsCloudState.dropboxQuery = "";
    void listCloudFiles("dropbox");
  });

  settingsCards.querySelectorAll("[data-cloud-open-folder]").forEach((button) => {
    button.addEventListener("click", () => openCloudFolder(button.dataset.cloudOpenFolder || "google", button.dataset.filePayload || ""));
  });

  settingsCards.querySelectorAll("[data-google-cloud-link]").forEach((button) => {
    button.addEventListener("click", () => linkGoogleDriveCloudOnlyFile(button.dataset.filePayload || ""));
  });

  settingsCards.querySelectorAll("[data-cloud-import]").forEach((button) => {
    button.addEventListener("click", () => importCloudFile(button.dataset.cloudImport || "google", button.dataset.filePayload || ""));
  });

  settingsCards.querySelectorAll("[data-cloud-sync-folder]").forEach((button) => {
    button.addEventListener("click", () => syncCloudFolder(button.dataset.cloudSyncFolder || "google", button.dataset.filePayload || ""));
  });

  settingsCards.querySelectorAll("[data-cloud-sync-current]").forEach((button) => {
    button.addEventListener("click", () => syncCurrentCloudFolder(button.dataset.cloudSyncCurrent || "google"));
  });

  settingsCards.querySelectorAll("[data-cloud-sync-run]").forEach((button) => {
    button.addEventListener("click", () => runCloudSyncRule(button.dataset.cloudSyncRun || ""));
  });

  settingsCards.querySelectorAll("[data-cloud-sync-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteCloudSyncRule(button.dataset.cloudSyncDelete || ""));
  });

  settingsCards.querySelector("[data-cloud-sync-run-all]")?.addEventListener("click", runAllCloudSyncRules);
  settingsCards.querySelector("[data-cloud-sync-refresh]")?.addEventListener("click", () => { void refreshCloudSyncStatus(true); });

  settingsCards.querySelector("[data-direct-import-start]")?.addEventListener("click", startDirectImport);
  settingsCards.querySelector("[data-direct-import-refresh]")?.addEventListener("click", refreshDirectImportJobs);

  settingsCards.querySelectorAll("[data-file-waveform]").forEach((button) => {
    button.addEventListener("click", () => {
      settingsUi.waveformSelectedId = button.dataset.fileWaveform || "";
      writePersistedJson(SETTINGS_UI_KEY, settingsUi);
      renderSettingsTab("player", "waveforms");
    });
  });
	
	
  settingsCards.querySelector("[data-files-refresh]")?.addEventListener("click", async () => {
    settingsLibraryLoaded = false;
    settingsVideoLoaded = false;
    settingsSupportFilesLoaded = false;
    settingsHiddenAudioLoaded = false;

    await Promise.all([
      ensureSettingsLibraryLoaded(),
      ensureSettingsVideoLoaded(true),
      ensureSettingsSupportFilesLoaded(true),
      ensureSettingsHiddenAudioLoaded(true),
    ]);

    showSettingsSaveNotice("Files Manager refreshed.");
    renderSettingsTab("cloud", "files");
  });

  settingsCards.querySelectorAll("[data-view-files-kind]").forEach((button) => {
    button.addEventListener("click", () => {
      settingsViewFilesKind = button.dataset.viewFilesKind || "audio";
      settingsSelectedFileId = "";
      settingsViewFilesSelectedId = "";
      settingsQuickEditId = "";
      renderSettingsTab("cloud", "files");
    });
  });
	
  settingsCards.querySelector("[data-files-source-clear]")?.addEventListener("click", () => {
    settingsViewFilesSourceRoot = "";
    settingsSelectedFileId = "";
    settingsViewFilesSelectedId = "";
    settingsQuickEditId = "";
    renderSettingsTab("cloud", "files");
  });

  const applyFilesSearch = () => {
    settingsViewFilesSearch = $("settingsFilesSearchInput")?.value || "";
    settingsSelectedFileId = "";
    settingsViewFilesSelectedId = "";
    settingsQuickEditId = "";
    renderSettingsTab("cloud", "files");
  };

  settingsCards.querySelector("[data-files-search]")?.addEventListener("click", applyFilesSearch);

  settingsCards.querySelector("[data-files-search-clear]")?.addEventListener("click", () => {
    settingsViewFilesSearch = "";
    settingsSelectedFileId = "";
    settingsViewFilesSelectedId = "";
    settingsQuickEditId = "";
    renderSettingsTab("cloud", "files");
  });

  $("settingsFilesSearchInput")?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;

    event.preventDefault();
    applyFilesSearch();
  });

  settingsCards.querySelectorAll("[data-view-files-open]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextId = button.dataset.viewFilesId || "";

      settingsViewFilesKind =
        button.dataset.viewFilesOpen ||
        settingsViewFilesKind;

      settingsViewFilesSelectedId =
        settingsViewFilesSelectedId === nextId
          ? ""
          : nextId;

      renderSettingsTab("cloud", "files");
    });
  });

  settingsCards.querySelectorAll("[data-view-video-delete-library]").forEach((button) => {
    button.addEventListener("click", () => {
      void deleteSettingsViewVideoItem(
        button.dataset.viewVideoDeleteLibrary || "",
        "library"
      );
    });
  });

  settingsCards.querySelectorAll("[data-view-video-delete-physical]").forEach((button) => {
    button.addEventListener("click", () => {
      void deleteSettingsViewVideoItem(
        button.dataset.viewVideoDeletePhysical || "",
        "physical"
      );
    });
  });

  settingsCards.querySelectorAll("[data-support-file-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      void deleteSettingsSupportFile(
        button.dataset.supportFileDelete || ""
      );
    });
  });
	
  settingsCards.querySelector("[data-hidden-audio-refresh]")?.addEventListener("click", async () => {
    settingsHiddenAudioLoaded = false;
    await ensureSettingsHiddenAudioLoaded(true);
    showSettingsSaveNotice("Removed audio list refreshed.");
    renderSettingsTab("cloud", "files");
  });

  settingsCards.querySelectorAll("[data-hidden-audio-restore]").forEach((button) => {
    button.addEventListener("click", () => {
      void restoreSettingsHiddenAudioItem(button.dataset.hiddenAudioRestore || "");
    });
  });

  settingsCards.querySelectorAll("[data-hidden-audio-copy-path]").forEach((button) => {
    button.addEventListener("click", () => {
      void copySettingsAudioPath(button.dataset.hiddenAudioCopyPath || "", true);
    });
  });

  settingsCards.querySelectorAll("[data-file-copy-path]").forEach((button) => {
    button.addEventListener("click", () => {
      void copySettingsAudioPath(button.dataset.fileCopyPath || "", false);
    });
  });

  settingsCards.querySelectorAll("[data-file-hide]").forEach((button) => {
    button.addEventListener("click", () => {
      void hideSettingsAudioItem(button.dataset.fileHide || "");
    });
  });

  settingsCards.querySelectorAll("[data-file-rescan-metadata]").forEach((button) => {
    button.addEventListener("click", () => {
      void rescanSettingsAudioMetadata(button.dataset.fileRescanMetadata || "");
    });
  });

  settingsCards.querySelectorAll("[data-file-waveform-rebuild]").forEach((button) => {
    button.addEventListener("click", () => {
      void rebuildSettingsAudioWaveform(button.dataset.fileWaveformRebuild || "");
    });
  });
  settingsCards.querySelectorAll("[data-file-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      settingsFileFilter = button.dataset.fileFilter || "all";
      settingsSelectedFileId = "";
      renderSettingsTab("cloud", "files");
    });
  });

  settingsCards.querySelectorAll("[data-google-save-local]").forEach((button) => {
    button.addEventListener("click", () => importGoogleLinkedTrackToLocal(button.dataset.googleSaveLocal || ""));
  });

  settingsCards.querySelectorAll("[data-google-refresh-metadata]").forEach((button) => {
    button.addEventListener("click", () => refreshGoogleLinkedTrackMetadata(button.dataset.googleRefreshMetadata || ""));
  });

  settingsCards.querySelectorAll("[data-file-quick-edit]").forEach((button) => {
    button.addEventListener("click", () => { void toggleSettingsAudioQuickEdit(button.dataset.fileQuickEdit || ""); });
  });

  settingsCards.querySelectorAll("[data-quick-edit-save]").forEach((button) => {
    button.addEventListener("click", () => { void saveSettingsAudioQuickEdit(button.dataset.quickEditSave || ""); });
  });

  settingsCards.querySelectorAll("[data-quick-tracklist-upload]").forEach((button) => {
    button.addEventListener("click", () => {
      settingsQuickTracklistUploadTargetId = button.dataset.quickTracklistUpload || "";
      const input = $("settingsQuickTracklistUploadInput");
      if (input) {
        input.value = "";
        input.click();
      }
    });
  });

  $("settingsQuickTracklistUploadInput")?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (file) void uploadQuickTracklistFile(settingsQuickTracklistUploadTargetId, file);
  });

  settingsCards.querySelector("[data-quick-tracklist-refresh]")?.addEventListener("click", async () => {
    await ensureSettingsTracklistFilesLoaded(true);
    showSettingsSaveNotice("Tracklist list refreshed.");
    renderSettingsTab("cloud", "files");
  });

  settingsCards.querySelectorAll("[data-quick-tracklist-attach-existing]").forEach((button) => {
    button.addEventListener("click", () => { void attachExistingTracklistFile(button.dataset.quickTracklistAttachExisting || ""); });
  });
  settingsCards.querySelectorAll("[data-file-back-list]").forEach((button) => {
    button.addEventListener("click", () => {
      settingsSelectedFileId = "";
      settingsQuickEditId = "";
      renderSettingsTab("cloud", "files");
    });
  });

  settingsCards.querySelectorAll("[data-file-open]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextId = button.dataset.fileOpen || "";
      settingsSelectedFileId = settingsSelectedFileId === nextId ? "" : nextId;
      settingsQuickEditId = "";
      renderSettingsTab("cloud", "files").then(() => {
        const selectedRow = document.querySelector(`[data-file-open="${CSS.escape(settingsSelectedFileId)}"]`);
        selectedRow?.scrollIntoView({ block: "center", behavior: "smooth" });
      });
    });
  });

  settingsCards.querySelectorAll("[data-file-waveform]").forEach((button) => {
    button.addEventListener("click", () => {
      settingsUi.waveformSelectedId = button.dataset.fileWaveform || "";
      writePersistedJson(SETTINGS_UI_KEY, settingsUi);
      renderSettingsTab("player", "waveforms");
    });
  });

  settingsCards.querySelectorAll("[data-duplicate-select]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => toggleDuplicateSelection(checkbox.dataset.duplicateSelect || "", !!checkbox.checked));
  });

  settingsCards.querySelector("[data-duplicate-select-all]")?.addEventListener("click", selectAllDuplicateFiles);
  settingsCards.querySelector("[data-duplicate-clear-selected]")?.addEventListener("click", clearDuplicateSelection);
  settingsCards.querySelector("[data-duplicate-delete-selected]")?.addEventListener("click", () => { void deleteSelectedDuplicateFiles(); });

  settingsCards.querySelectorAll("[data-file-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteLibraryFile(button.dataset.fileDelete || ""));
  });

  if (activeChildSettingsTab === "import") {
    void refreshDirectImportJobs();
  }
}

async function connectCloudProvider(provider) {
  const label = window.prompt(
    `Name this ${provider === "google" ? "Google Drive" : "Dropbox"} account`,
    provider === "google" ? "Google Drive" : "Dropbox"
  );

  if (label === null) return;

  const endpoint = provider === "google" ? "/auth/google/start" : "/auth/dropbox/start";

  try {
    const data = await settingsApiJson(`${endpoint}?label=${encodeURIComponent(label || (provider === "google" ? "Google Drive" : "Dropbox"))}`);
    if (data?.authUrl) window.location.href = data.authUrl;
  } catch (err) {
    showSettingsSaveNotice(`Cloud link failed: ${err?.message || String(err)}`);
  }
}

async function renameCloudAccount(accountId) {
  const account = settingsCloudAccounts.find((item) => item.id === accountId);
  const label = window.prompt("Rename cloud account", settingsAccountLabel(account));
  if (label === null) return;

  try {
    await settingsPatchJson(`/cloud/accounts/${encodeURIComponent(accountId)}`, { label });
    await ensureCloudAccountsLoaded();
    showSettingsSaveNotice("Cloud account renamed.");
    renderSettingsTab("cloud", activeChildSettingsTab);
  } catch (err) {
    showSettingsSaveNotice(`Rename failed: ${err?.message || String(err)}`);
  }
}

async function removeCloudAccount(accountId) {
  if (!window.confirm("Remove this cloud account from BRMedia?")) return;

  try {
    await settingsDeleteJson(`/cloud/accounts/${encodeURIComponent(accountId)}`);
    await ensureCloudAccountsLoaded();
    showSettingsSaveNotice("Cloud account removed.");
    renderSettingsTab("cloud", activeChildSettingsTab);
  } catch (err) {
    showSettingsSaveNotice(`Remove failed: ${err?.message || String(err)}`);
  }
}

async function ensureCloudSyncLoaded() {
  try {
    const data = await settingsApiJson("/cloud/sync");
    settingsCloudSyncRules = Array.isArray(data?.rules) ? data.rules : [];
    settingsCloudSyncJobs = Array.isArray(data?.jobs) ? data.jobs : [];
  } catch {
    settingsCloudSyncRules = [];
    settingsCloudSyncJobs = [];
  }
}

async function refreshCloudSyncStatus(reRender = false) {
  await ensureCloudSyncLoaded();
  if (reRender) renderSettingsTab("cloud", "sync");
}

function startCloudSyncPolling() {
  window.clearInterval(settingsCloudSyncPollTimer);
  settingsCloudSyncPollTimer = window.setInterval(async () => {
    await ensureCloudSyncLoaded();
    const active = settingsCloudSyncJobs.some((job) => ["queued", "scanning", "syncing"].includes(job.status));
    if (activeChildSettingsTab === "sync") renderSettingsTab("cloud", "sync");
    if (!active) {
      settingsLibraryLoaded = false;
      window.clearInterval(settingsCloudSyncPollTimer);
    }
  }, 1600);
}

function getGoogleCurrentSyncTitle() {
  const crumbs = getGoogleDriveBreadcrumbs();
  return crumbs.at(-1)?.title || "Google Drive Folder";
}

function buildCloudSyncPayload(provider, file = null) {
  const prefs = getCloudSyncPrefs();
  if (provider === "google") {
    const accountId = settingsCloudState.googleAccountId || document.getElementById("googleAccountSelect")?.value || "";
    const title = file?.name || getGoogleCurrentSyncTitle();
    const category = getCloudSyncCategoryForPayload(title);
    return {
      provider: "google_drive",
      accountId,
      folderId: file?.id || settingsCloudState.googleFolderId || "root",
      title,
      category,
      primaryBrand: getCloudSyncPrimaryBrand(category),
      recursive: prefs.recursive !== false,
      autoSync: prefs.autoSync === true,
    };
  }

  const accountId = settingsCloudState.dropboxAccountId || document.getElementById("dropboxAccountSelect")?.value || "";
  const title = file?.name || pathBaseName(settingsCloudState.dropboxPath || "Dropbox Folder");
  const category = getCloudSyncCategoryForPayload(title);
  return {
    provider: "dropbox",
    accountId,
    path: file?.path || file?.path_lower || file?.path_display || settingsCloudState.dropboxPath || "",
    title,
    category,
    primaryBrand: getCloudSyncPrimaryBrand(category),
    recursive: prefs.recursive !== false,
    autoSync: prefs.autoSync === true,
  };
}

function pathBaseName(value) {
  const clean = String(value || "").replace(/\\/g, "/").replace(/\/+$/, "");
  return clean.split("/").filter(Boolean).pop() || "Dropbox Folder";
}

async function createCloudSyncRule(payload) {
  if (!payload?.accountId) {
    showSettingsSaveNotice("Choose a cloud account first.");
    return null;
  }

  const data = await settingsPostJson("/cloud/sync", payload);
  await ensureCloudSyncLoaded();
  showSettingsSaveNotice("Cloud sync folder saved.");
  return data?.rule || null;
}

async function syncCloudFolder(provider, payload) {
  const file = decodeCloudPayload(payload);
  if (!file) return;

  try {
    const rule = await createCloudSyncRule(buildCloudSyncPayload(provider, file));
    if (rule?.id) await runCloudSyncRule(rule.id, false);
    renderSettingsTab("cloud", "sync");
  } catch (err) {
    showSettingsSaveNotice(`Sync folder failed: ${err?.message || String(err)}`);
  }
}

async function syncCurrentCloudFolder(provider) {
  try {
    const rule = await createCloudSyncRule(buildCloudSyncPayload(provider));
    if (rule?.id) await runCloudSyncRule(rule.id, false);
    renderSettingsTab("cloud", "sync");
  } catch (err) {
    showSettingsSaveNotice(`Sync folder failed: ${err?.message || String(err)}`);
  }
}

async function runCloudSyncRule(ruleId, reRender = true) {
  if (!ruleId) return;

  try {
    await settingsPostJson(`/cloud/sync/${encodeURIComponent(ruleId)}/run`, {});
    await ensureCloudSyncLoaded();
    showSettingsSaveNotice("Cloud sync started.");
    startCloudSyncPolling();
    if (reRender) renderSettingsTab("cloud", "sync");
  } catch (err) {
    showSettingsSaveNotice(`Sync failed: ${err?.message || String(err)}`);
  }
}

async function runAllCloudSyncRules() {
  try {
    await settingsPostJson("/cloud/sync/run-all", {});
    await ensureCloudSyncLoaded();
    showSettingsSaveNotice("All cloud sync folders started.");
    startCloudSyncPolling();
    renderSettingsTab("cloud", "sync");
  } catch (err) {
    showSettingsSaveNotice(`Sync all failed: ${err?.message || String(err)}`);
  }
}

async function updateCloudSyncRuleCategory(ruleId, category) {
  const rule = settingsCloudSyncRules.find((item) => item.id === ruleId);
  if (!rule) return;

  try {
    await settingsPostJson("/cloud/sync", {
      provider: rule.provider,
      accountId: rule.accountId,
      title: rule.title,
      folderId: rule.folderId || "",
      path: rule.path || "",
      recursive: rule.recursive !== false,
      autoSync: rule.autoSync === true,
      category,
      primaryBrand: getCloudSyncPrimaryBrand(category),
    });
    await ensureCloudSyncLoaded();
    showSettingsSaveNotice("Cloud sync category saved. Run Sync to apply it to existing files.");
    renderSettingsTab("cloud", "sync");
  } catch (err) {
    showSettingsSaveNotice(`Category save failed: ${err?.message || String(err)}`);
  }
}

async function deleteCloudSyncRule(ruleId) {
  if (!ruleId) return;
  if (!window.confirm("Remove this synced folder from BRMedia? Local files already imported will stay in your library.")) return;

  try {
    await settingsDeleteJson(`/cloud/sync/${encodeURIComponent(ruleId)}`);
    await ensureCloudSyncLoaded();
    showSettingsSaveNotice("Cloud sync folder removed.");
    renderSettingsTab("cloud", "sync");
  } catch (err) {
    showSettingsSaveNotice(`Remove sync failed: ${err?.message || String(err)}`);
  }
}

async function listCloudFiles(provider, search = false) {
  const status = document.getElementById(provider === "google" ? "settingsGoogleStatus" : "settingsDropboxStatus");

  try {
    if (status) {
      status.textContent = "Loading cloud files…";
      status.className = "settingsToolSummary isLoading";
    }

    if (provider === "google") {
      const accountId = document.getElementById("googleAccountSelect")?.value || settingsCloudState.googleAccountId;
      const query = document.getElementById("settingsGoogleQuery")?.value || "";

      settingsCloudState.googleAccountId = accountId;
      settingsCloudState.googleQuery = query;

      const data = await settingsPostJson("/cloud/google/list", {
        accountId,
        folderId: settingsCloudState.googleFolderId || "root",
        query,
      });

      settingsCloudFiles.google = Array.isArray(data?.items) ? data.items : [];
    } else {
      const accountId = document.getElementById("dropboxAccountSelect")?.value || settingsCloudState.dropboxAccountId;
      const path = document.getElementById("settingsDropboxPath")?.value || "";
      const query = document.getElementById("settingsDropboxQuery")?.value || "";

      settingsCloudState.dropboxAccountId = accountId;
      settingsCloudState.dropboxPath = path;
      settingsCloudState.dropboxQuery = query;

      const data = search && query
        ? await settingsPostJson("/cloud/dropbox/search", { accountId, query })
        : await settingsPostJson("/cloud/dropbox/list", { accountId, path });

      settingsCloudFiles.dropbox = Array.isArray(data?.items) ? data.items : [];
    }

    if (status) {
      status.textContent = "Cloud files loaded.";
      status.className = "settingsToolSummary isSuccess";
    }

    renderSettingsTab("cloud", provider === "google" ? "google" : "dropbox");
  } catch (err) {
    if (status) {
      status.textContent = `Cloud load failed: ${err?.message || String(err)}`;
      status.className = "settingsToolSummary isError";
    }
  }
}

function decodeCloudPayload(payload) {
  try {
    return JSON.parse(decodeURIComponent(payload || ""));
  } catch {
    return null;
  }
}

function openCloudFolder(provider, payload) {
  const file = decodeCloudPayload(payload);
  if (!file) return;

  if (provider === "google") {
    settingsCloudState.googleFolderId = file.id || "root";
    settingsCloudState.googleQuery = "";
    void listCloudFiles("google");
  } else {
    settingsCloudState.dropboxPath = file.path_lower || file.path_display || "";
    void listCloudFiles("dropbox");
  }
}

async function linkGoogleDriveCloudOnlyFile(payload) {
  const file = decodeCloudPayload(payload);
  if (!file?.id) return;

  const accountId =
    settingsCloudState.googleAccountId ||
    document.getElementById("googleAccountSelect")?.value ||
    "";

  if (!accountId) {
    showSettingsSaveNotice("Choose a Google Drive account first.");
    return;
  }

  try {
    showSettingsSaveNotice("Adding Google Drive cloud-only stream to BRMedia…");

    await settingsPostJson("/cloud/google/link-track", {
      accountId,
      file,
    });

    settingsLibraryLoaded = false;
    await ensureSettingsLibraryLoaded();

    showSettingsSaveNotice("Cloud-only Google Drive audio added to BRMedia Player.");
    renderSettingsTab("cloud", "google");
  } catch (err) {
    showSettingsSaveNotice(`Cloud-only add failed: ${err?.message || String(err)}`);
  }
}

async function refreshGoogleLinkedTrackMetadata(trackId = "") {
  if (!trackId) return;

  try {
    showSettingsSaveNotice("Refreshing Google Drive tags and artwork…");

    await settingsPostJson(
      `/cloud/google/linked-tracks/${encodeURIComponent(trackId)}/refresh-metadata`,
      {}
    );

    settingsLibraryLoaded = false;
    await ensureSettingsLibraryLoaded();

    showSettingsSaveNotice("Google Drive tags and artwork refreshed.");
    renderSettingsTab("cloud", "files");
  } catch (err) {
    showSettingsSaveNotice(`Drive metadata refresh failed: ${err?.message || String(err)}`);
  }
}

async function importCloudFile(provider, payload) {
  const file = decodeCloudPayload(payload);
  if (!file) return;

  try {
    if (provider === "google") {
      const accountId = settingsCloudState.googleAccountId || document.getElementById("googleAccountSelect")?.value || "";
      await settingsPostJson("/cloud/google/import-job", {
        accountId,
        fileId: file.id,
        name: file.name,
      });
    } else {
      const accountId = settingsCloudState.dropboxAccountId || document.getElementById("dropboxAccountSelect")?.value || "";
      await settingsPostJson("/cloud/dropbox/import-job", {
        accountId,
        path: file.path_lower || file.path_display,
        name: file.name || file.path_display,
      });
    }

    showSettingsSaveNotice("Cloud import job started.");
    startCloudImportPolling();
  } catch (err) {
    showSettingsSaveNotice(`Import failed: ${err?.message || String(err)}`);
  }
}

function startCloudImportPolling() {
  window.clearInterval(settingsCloudImportPollTimer);

  settingsCloudImportPollTimer = window.setInterval(async () => {
    try {
      await settingsApiJson("/cloud/import-jobs");
    } catch {
      window.clearInterval(settingsCloudImportPollTimer);
    }
  }, 1500);
}

async function startDirectImport() {
  const input = document.getElementById("settingsDirectImportUrl");
  const status = document.getElementById("settingsDirectImportStatus");
  const url = input?.value || "";

  settingsCloudState.directUrl = url;

  try {
    if (status) {
      status.textContent = "Starting import…";
      status.className = "settingsToolSummary isLoading";
    }

    await settingsPostJson("/imports/link/start", { url });

    if (status) {
      status.textContent = "Direct import job started.";
      status.className = "settingsToolSummary isSuccess";
    }

    refreshDirectImportJobs();
  } catch (err) {
    if (status) {
      status.textContent = `Direct import failed: ${err?.message || String(err)}`;
      status.className = "settingsToolSummary isError";
    }
  }
}

async function refreshDirectImportJobs() {
  const list = document.getElementById("settingsDirectImportJobs");
  if (!list) return;

  try {
    const data = await settingsApiJson("/imports/link/jobs");
    const jobs = Array.isArray(data?.jobs) ? data.jobs : [];

    list.innerHTML = jobs.length ? jobs.map((job) => {
      const state = String(job.status || "queued").toLowerCase();
      const progress = Math.max(0, Math.min(100, Number(job.percent || 0)));
      const cls = state === "complete" ? "isDone" : state === "failed" || state === "cancelled" ? "isFailed" : "";

      return `
        <div class="settingsJobCard ${cls}">
          <div class="settingsJobCardFillLayer" style="width:${progress}%"></div>
          <div class="settingsJobCardInner">
            <div class="settingsJobRow">
              <div>
                <div class="settingsJobTitle">${escapeHtml(job.name || job.url || "Import job")}</div>
                <div class="settingsJobDetail">${escapeHtml(job.message || job.url || "Queued")}</div>
              </div>
              <span class="settingsJobRight">${escapeHtml(state)} · ${progress}%</span>
            </div>
          </div>
        </div>
      `;
    }).join("") : `<div class="settingsJobEmpty">No direct import jobs yet.</div>`;

    hydrateBrIcons(list);
  } catch (err) {
    list.innerHTML = `<div class="settingsJobEmpty">Could not load import jobs: ${escapeHtml(err?.message || String(err))}</div>`;
  }

  window.clearInterval(settingsDirectImportPollTimer);
  settingsDirectImportPollTimer = window.setInterval(refreshDirectImportJobs, 2500);
}

function addSourceLinkFromFields() {
  const title = document.getElementById("settingsSourceLinkTitle")?.value || "";
  const url = document.getElementById("settingsSourceLinkUrl")?.value || "";

  if (!url.trim()) {
    showSettingsSaveNotice("Paste a source link first.");
    return;
  }

  const links = getSourceLinksSafe();
  links.unshift({
    id: `source_${Date.now()}`,
    title: title.trim() || url.trim(),
    url: url.trim(),
    savedAt: Date.now(),
  });

  writePersistedJson(URL_SOURCE_LINKS_KEY, links);
  showSettingsSaveNotice("Source link saved.");
  renderSettingsTab("cloud", "links");
}

function removeSourceLink(index) {
  const links = getSourceLinksSafe();
  if (index < 0 || index >= links.length) return;

  links.splice(index, 1);
  writePersistedJson(URL_SOURCE_LINKS_KEY, links);
  showSettingsSaveNotice("Source link removed.");
  renderSettingsTab("cloud", "links");
}

async function importGoogleLinkedTrackToLocal(trackId = "") {
  const summary = document.querySelector(".settingsToolSummary");
  if (!trackId) return;

  try {
    if (summary) {
      summary.textContent = "Saving Google Drive file as a local media copy…";
      summary.className = "settingsToolSummary isLoading";
    }

    await settingsPostJson(`/cloud/google/import-linked/${encodeURIComponent(trackId)}`, {});
    settingsLibraryLoaded = false;
    settingsSelectedFileId = "";
    await ensureSettingsLibraryLoaded();

    if (summary) {
      summary.textContent = "Google Drive file saved locally and library refreshed.";
      summary.className = "settingsToolSummary isSuccess";
    }

    renderSettingsTab("cloud", "files");
  } catch (err) {
    if (summary) {
      summary.textContent = `Could not save local copy: ${err?.message || String(err)}`;
      summary.className = "settingsToolSummary isError";
    }
  }
}

function normaliseDuplicateText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/[\[\](){}_\-]+/g, " ")
    .replace(/\b(mp3|wav|flac|m4a|aac|ogg|copy|final|master|converted)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function duplicateFileName(item = {}) {
  const raw = item.filename || item.fileName || item.name || item.locator || item.path || item.title || "";
  return String(raw || "").split(/[\\/]/).pop() || String(item.title || "Unknown file");
}

function duplicateDurationBucket(item = {}) {
  const duration = normaliseSettingsDurationSeconds(
    item.duration ||
    item.durationSeconds ||
    item.durationMs ||
    0
  );

  if (!duration) return "";
  return String(Math.round(duration));
}

function duplicateSizeBucket(item = {}) {
  const size = Number(item.sizeBytes || item.size || 0);
  if (!Number.isFinite(size) || size <= 0) return "";
  return String(Math.round(size / 1024 / 1024));
}

function buildDuplicateAudioGroups(items = []) {
  const buckets = new Map();

  const addBucket = (key, reason, item) => {
    if (!key || !item) return;
    const id = String(item.id || item.trackId || "");
    if (!id) return;
    const bucket = buckets.get(key) || { key, reason, items: [] };
    if (!bucket.items.some((existing) => String(existing.id || existing.trackId || "") === id)) {
      bucket.items.push(item);
    }
    buckets.set(key, bucket);
  };

  items.forEach((item) => {
    const title = normaliseDuplicateText(item.title || duplicateFileName(item));
    const artist = normaliseDuplicateText(item.artist || item.albumArtist || "");
    const fileName = normaliseDuplicateText(duplicateFileName(item));
    const duration = duplicateDurationBucket(item);
    const size = duplicateSizeBucket(item);
    const locator = normaliseDuplicateText(item.locator || item.path || "");

    if (locator) addBucket(`path:${locator}`, "Same file path/source", item);
    if (fileName && duration) addBucket(`file-duration:${fileName}:${duration}`, "Same filename and duration", item);
    if (title && artist && duration) addBucket(`title-artist-duration:${title}:${artist}:${duration}`, "Same title, artist and duration", item);
    if (title && size) addBucket(`title-size:${title}:${size}`, "Same title and similar file size", item);
  });

  return Array.from(buckets.values())
    .filter((group) => group.items.length > 1)
    .sort((a, b) => b.items.length - a.items.length || a.reason.localeCompare(b.reason));
}

function getDuplicateItemId(item = {}) {
  return String(item.id || item.trackId || "");
}

function getDuplicateGroupIds(groups = []) {
  return groups.flatMap((group) => group.items.map(getDuplicateItemId).filter(Boolean));
}

function syncDuplicateSelection(groups = []) {
  const valid = new Set(getDuplicateGroupIds(groups));
  settingsDuplicateSelectedIds = new Set(Array.from(settingsDuplicateSelectedIds).filter((id) => valid.has(id)));
}

function toggleDuplicateSelection(id, checked) {
  if (!id) return;
  if (checked) settingsDuplicateSelectedIds.add(id);
  else settingsDuplicateSelectedIds.delete(id);
  renderSettingsTab("cloud", "duplicates");
}

function selectAllDuplicateFiles() {
  const groups = buildDuplicateAudioGroups(settingsLibrary || []);
  getDuplicateGroupIds(groups).forEach((id) => settingsDuplicateSelectedIds.add(id));
  renderSettingsTab("cloud", "duplicates");
}

function clearDuplicateSelection() {
  settingsDuplicateSelectedIds.clear();
  renderSettingsTab("cloud", "duplicates");
}

function findSettingsLibraryItemById(id) {
  const wanted = String(id || "");
  return (settingsLibrary || []).find((item) => String(item.id || item.trackId || "") === wanted) || null;
}

function isGoogleDriveLinkedSettingsItem(item = {}) {
  const id = String(item.id || item.trackId || "");
  const source = String(item.source || item.sourceType || item.cloudProvider || "").toLowerCase();
  const locator = String(item.locator || "").toLowerCase();
  return id.startsWith("gdrive_") || source.includes("google") || locator.startsWith("gdrive://");
}

function getSettingsDeleteEndpointForId(id) {
  const item = findSettingsLibraryItemById(id);
  if (isGoogleDriveLinkedSettingsItem(item)) return `/cloud/linked-tracks/${encodeURIComponent(id)}`;
  return `/library/${encodeURIComponent(id)}`;
}

async function deleteSelectedDuplicateFiles() {
  const ids = Array.from(settingsDuplicateSelectedIds).filter(Boolean);
  if (!ids.length) {
    showSettingsSaveNotice("Tick duplicate files to delete first.");
    return;
  }

  if (!window.confirm(`Delete ${ids.length} selected duplicate file${ids.length === 1 ? "" : "s"} from BRMedia?`)) return;

  let deleted = 0;
  let failed = 0;

  for (const id of ids) {
    try {
await settingsDeleteJson(getSettingsDeleteEndpointForId(id));
      settingsDuplicateSelectedIds.delete(id);
      deleted += 1;
    } catch {
      failed += 1;
    }
  }

  settingsLibraryLoaded = false;
  settingsSelectedFileId = "";
  await ensureSettingsLibraryLoaded();
  showSettingsSaveNotice(failed ? `Deleted ${deleted}, ${failed} failed.` : `Deleted ${deleted} duplicate file${deleted === 1 ? "" : "s"}.`);
  renderSettingsTab("cloud", "duplicates");
}

function duplicateAudioToolHtml() {
  const groups = buildDuplicateAudioGroups(settingsLibrary || []);
  syncDuplicateSelection(groups);
  const duplicateItemCount = groups.reduce((sum, group) => sum + group.items.length, 0);
  const selectedCount = settingsDuplicateSelectedIds.size;

  return `
    <div class="settingsToolPanel">
      <div class="settingsDuplicateHero">
        <span>${iconHtml("copy")}</span>
        <div>
          <strong>Duplicate Audio Cleanup</strong>
          <p>Checks the current BRMedia library for likely duplicate audio after uploads, Google Drive sync, Dropbox sync and local imports. V1 uses filename, title, artist, duration and size. Audio fingerprinting can come later.</p>
        </div>
      </div>

      <div class="settingsInfoGrid">
        ${playerInfoRowHtml({ title: "Duplicate groups", value: String(groups.length), desc: "Possible duplicate clusters found." })}
        ${playerInfoRowHtml({ title: "Files involved", value: String(duplicateItemCount), desc: "Audio files that need checking." })}
        ${playerInfoRowHtml({ title: "Selected", value: String(selectedCount), desc: "Ticked files ready for mass delete." })}
      </div>

      <div class="settingsDuplicateBulkBar">
        <button class="settingsToolBtn" data-duplicate-select-all type="button" ${groups.length ? "" : "disabled"}>${iconHtml("square-check")}<span>Select all shown</span></button>
        <button class="settingsToolBtn" data-duplicate-clear-selected type="button" ${selectedCount ? "" : "disabled"}>${iconHtml("square-xmark")}<span>Clear selected</span></button>
        <button class="settingsToolBtn danger" data-duplicate-delete-selected type="button" ${selectedCount ? "" : "disabled"}>${iconHtml("trash")}<span>Delete selected (${selectedCount})</span></button>
      </div>

      <div class="settingsToolSummary ${groups.length ? "isLoading" : "isSuccess"}">
        ${groups.length ? "Tick duplicates you want to remove, then use Delete selected." : "No likely duplicates found."}
      </div>

      <div class="settingsDuplicateList">
        ${groups.length ? groups.map(duplicateGroupHtml).join("") : `<div class="settingsJobEmpty">Your library looks clean. No likely duplicate audio found.</div>`}
      </div>
    </div>
  `;
}

function duplicateGroupHtml(group) {
  const title = getSettingsTrackTitle(group.items[0] || {});
  return `
    <div class="settingsDuplicateGroup">
      <div class="settingsDuplicateGroupHead">
        <div>
          <strong>${escapeHtml(title || "Possible duplicate audio")}</strong>
          <span>${escapeHtml(group.reason || "Possible duplicate")} · Check before deleting.</span>
        </div>
        <b class="settingsDuplicateBadge">${group.items.length} files</b>
      </div>
      <div class="settingsDuplicateItems">
        ${group.items.map(duplicateItemHtml).join("")}
      </div>
    </div>
  `;
}

function duplicateItemHtml(item = {}) {
  const id = getDuplicateItemId(item);
  const checked = id && settingsDuplicateSelectedIds.has(id);
  const size = Number(item.sizeBytes || item.size || 0);
  const duration = normaliseSettingsDurationSeconds(
    item.duration ||
    item.durationSeconds ||
    item.durationMs ||
    0
  );
  const meta = [
    getSettingsTrackSourceLabel(item),
    duration ? formatSettingsDuration(duration) : "",
    size ? `${(size / 1024 / 1024).toFixed(1)} MB` : "",
  ].filter(Boolean).join(" · ");

  return `
    <div class="settingsDuplicateItem ${checked ? "isSelected" : ""}">
      <div class="settingsDuplicateItemTop">
        <label class="settingsDuplicateCheck">
          <input data-duplicate-select="${escapeHtml(id)}" type="checkbox" ${checked ? "checked" : ""} />
          <span>Delete</span>
        </label>
        <div>
          <strong>${escapeHtml(getSettingsTrackTitle(item))}</strong>
          <em>${escapeHtml(meta || getSettingsTrackMeta(item))}</em>
          <em>${escapeHtml(item.locator || item.path || item.fileName || "")}</em>
        </div>
        <span class="settingsDuplicateBadge">${escapeHtml(id ? id.slice(0, 10) : "file")}</span>
      </div>
      <div class="settingsDuplicateActions">
        <button class="settingsTinyBtn sync" data-route="/player?trackId=${encodeURIComponent(id)}" type="button">Play</button>
        <button class="settingsTinyBtn" data-route="/tagger?trackId=${encodeURIComponent(id)}" type="button">Tagger</button>
        <button class="settingsTinyBtn" data-route="/converter?trackId=${encodeURIComponent(id)}" type="button">Converter</button>
        <button class="settingsTinyBtn" data-route="/mastering?trackId=${encodeURIComponent(id)}" type="button">Mastering</button>
        <button class="settingsTinyBtn danger" data-file-delete="${escapeHtml(id)}" type="button">Delete</button>
      </div>
    </div>
  `;
}

async function deleteLibraryFile(id) {
  const item = findSettingsLibraryItemById(id);
  const local = getSettingsTrackSourceKey(item || {}) === "local";
  const message = local
    ? "Delete this physical audio file from disk and remove matching sidecars/waveform cache? This cannot be undone."
    : "Remove this linked cloud item from BRMedia?";

  if (!id || !window.confirm(message)) return;

  const returnTab = activeSettingsModule === "cloud" && activeChildSettingsTab === "duplicates" ? "duplicates" : "files";

  try {
    await settingsDeleteJson(getSettingsDeleteEndpointForId(id));
    settingsLibraryLoaded = false;
    settingsSelectedFileId = "";
    settingsDuplicateSelectedIds.delete(String(id));
    await ensureSettingsLibraryLoaded();
    showSettingsSaveNotice("File deleted.");
    renderSettingsTab("cloud", returnTab);
  } catch (err) {
    showSettingsSaveNotice(`Delete failed: ${err?.message || String(err)}`);
  }
}

function isSettingsVideoBrowserFriendly(item = {}) {
  const mime = String(item.mimeType || "").toLowerCase();
  const ext = String(item.ext || item.fileName || item.locator || "").split(".").pop()?.toLowerCase() || "";
  return mime.includes("video/mp4") || mime.includes("video/webm") || ["mp4", "m4v", "webm"].includes(ext);
}

function settingsVideoPosterUrl(item = {}) {
  if (item.customPosterUrl) return item.customPosterUrl;
  if (item.posterPath) return `/video-poster/${encodeURIComponent(item.id)}`;
  if (item.posterUrl) return `/video-online-image?url=${encodeURIComponent(item.posterUrl)}`;
  return "";
}

function settingsVideoTitle(item = {}) {
  return item.title || item.fileName || "Untitled video";
}

async function ensureSettingsHiddenVideosLoaded(refresh = false) {
  if (settingsHiddenVideoLoaded && !refresh) {
    return settingsHiddenVideoItems;
  }

  try {
    const data =
      await settingsApiJson("/video-library-hidden");

    settingsHiddenVideoItems =
      Array.isArray(data?.items)
        ? data.items
        : [];

    settingsHiddenVideoLoaded = true;
  } catch {
    settingsHiddenVideoItems = [];
    settingsHiddenVideoLoaded = true;
  }

  return settingsHiddenVideoItems;
}

function settingsHiddenVideosHtml() {
  if (!settingsHiddenVideoItems.length) {
    return `
      <div class="settingsVideoEmpty">
        No videos have been removed from BRMedia.
        Library-only removal keeps files safe here for recovery.
      </div>
    `;
  }

  return `
    <div class="settingsHiddenVideoList">
      ${settingsHiddenVideoItems.map((item) => `
        <article class="settingsHiddenVideoCard">
          <span>${iconHtml("rotate-left")}</span>

          <div>
            <strong>
              ${escapeHtml(item.title || item.fileName || "Hidden video")}
            </strong>

            <em>${escapeHtml(item.locator || "")}</em>

            <small>
              ${escapeHtml(
                [item.year, item.genre]
                  .filter(Boolean)
                  .join(" · ") ||
                "Saved physical file"
              )}
            </small>
          </div>

          <button
            class="settingsToolBtn primary"
            data-video-restore-hidden="${escapeHtml(item.id)}"
            type="button"
          >
            ${iconHtml("rotate-left")}
            <span>Restore</span>
          </button>
        </article>
      `).join("")}
    </div>
  `;
}

async function restoreSettingsHiddenVideo(id = "") {
  if (!id) return;

  try {
    await settingsPostJson(
      `/video-library-hidden/${encodeURIComponent(id)}/restore`,
      {}
    );

    settingsHiddenVideoLoaded = false;
    settingsVideoLoaded = false;

    await Promise.all([
      ensureSettingsHiddenVideosLoaded(true),
      ensureSettingsVideoLoaded(true),
    ]);

    showSettingsSaveNotice(
      "Video restored to BRMedia library."
    );

    renderVideoSettingsTab();
  } catch (err) {
    showSettingsSaveNotice(
      `Restore failed: ${err?.message || String(err)}`
    );
  }
}

async function ensureSettingsVideoLoaded(refresh = false) {
  if (settingsVideoLoaded && !refresh) return settingsVideoItems;

  settingsVideoStatus = refresh ? "Rescanning video library…" : "Loading video library…";
  try {
    const query = new URLSearchParams();
    if (refresh) query.set("refresh", "1");
    const data = await settingsApiJson(`/video-library?${query.toString()}`);
    settingsVideoItems = Array.isArray(data?.items) ? data.items : [];
    settingsVideoLoaded = true;

    if (settingsVideoSelectedId && !settingsVideoItems.some((item) => String(item.id) === String(settingsVideoSelectedId))) {
      settingsVideoSelectedId = "";
    }

    settingsVideoStatus = `${settingsVideoItems.length} video${settingsVideoItems.length === 1 ? "" : "s"} ready.`;
  } catch (err) {
    settingsVideoItems = [];
    settingsVideoLoaded = true;
    settingsVideoStatus = `Video load failed: ${err?.message || String(err)}`;
  }

  return settingsVideoItems;
}

function getSelectedSettingsVideo() {
  return settingsVideoItems.find((item) => String(item.id) === String(settingsVideoSelectedId)) || null;
}

function getFilteredSettingsVideos() {
  const query = settingsVideoSearch.toLowerCase().trim();
  return settingsVideoItems.filter((item) => {
    if (activeChildSettingsTab === "metadata" && item.metadataSource) return false;
    if (activeChildSettingsTab === "copies" && isSettingsVideoBrowserFriendly(item)) return false;
    if (activeChildSettingsTab === "subtitles" && !(Array.isArray(item.subtitles) && item.subtitles.length)) return false;
    if (activeChildSettingsTab === "linkups" && !item.linkupEnabled) return false;

    if (!query) return true;
    return [item.title, item.fileName, item.genre, item.year, item.folder, item.imdbId]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
}

function renderSettingsVideoThumb(item = {}, size = "") {
  const poster = settingsVideoPosterUrl(item);
  if (poster) return `<img src="${escapeHtml(poster)}" alt="${escapeHtml(settingsVideoTitle(item))}" loading="lazy" />`;
  return `<span>${iconHtml("film")}</span>`;
}

function settingsVideoListHtml() {
  const videos = getFilteredSettingsVideos();

  if (!videos.length) {
    return `<div class="settingsVideoEmpty">No videos found for this view.</div>`;
  }

  return videos.map((item) => {
    const active = String(item.id) === String(settingsVideoSelectedId);
    const playable = isSettingsVideoBrowserFriendly(item);
    return `
      <button class="settingsVideoRow ${active ? "isActive" : ""}" data-video-settings-select="${escapeHtml(item.id)}" type="button">
        <span class="settingsVideoThumb">${renderSettingsVideoThumb(item)}</span>
        <span>
          <strong>${escapeHtml(settingsVideoTitle(item))}</strong>
          <span>${escapeHtml([item.year, item.genre, item.folder].filter(Boolean).join(" · ") || item.fileName || "Video file")}</span>
          <em>${escapeHtml(item.rottenTomatoesRating ? `Rotten Tomatoes ${item.rottenTomatoesRating}` : item.imdbRating ? `IMDb ${item.imdbRating}` : item.metadataSource || "No online metadata yet")}</em>
        </span>
        <b class="settingsVideoBadge">${playable ? "Plays" : "Needs MP4"}</b>
      </button>
    `;
  }).join("");
}

function settingsVideoMatchPoster(result = {}) {
  const poster = result.posterUrl || result.customPosterUrl || "";
  if (poster) return `<img src="${escapeHtml(poster.startsWith("http") ? poster : poster)}" alt="${escapeHtml(result.title || "Poster")}" loading="lazy" />`;
  return iconHtml("film");
}

function settingsVideoMatchesHtml() {
  if (!settingsVideoMetadataResults.length) {
    return `<div class="settingsVideoEmpty">Search by title, year, IMDb ID or IMDb URL. Results will appear here.</div>`;
  }

  return settingsVideoMetadataResults.map((result, index) => `
    <div class="settingsVideoMatch">
      <span class="settingsVideoMatchPoster">${settingsVideoMatchPoster(result)}</span>
      <span class="settingsVideoMatchMain">
        <strong>${escapeHtml(result.title || "Metadata match")}</strong>
        <span>${escapeHtml([result.year, result.genre, result.metadataSource].filter(Boolean).join(" · "))}</span>
        <span>${escapeHtml(result.rottenTomatoesRating ? `RT ${result.rottenTomatoesRating}` : result.imdbRating ? `IMDb ${result.imdbRating}` : result.overview || "")}</span>
      </span>
      <button class="settingsTinyBtn sync" data-video-apply-match="${index}" type="button">Use this</button>
    </div>
  `).join("");
}

function isSettingsVideoCopyRunning(job = null) {
  return !!job && ["queued", "running"].includes(String(job.status || ""));
}

function getSettingsVideoCopyJobForItem(item = {}) {
  const ids = new Set(
    [
      item.id,
      item.originalVideoId,
      item.browserCopyOf,
      item.preferredBrowserCopyId,
    ]
      .filter(Boolean)
      .map((value) => String(value))
  );

  return settingsVideoCopyJobs.find((job) => {
    const sourceId =
      String(job.videoId || job.sourceId || "");

    const copyId =
      String(job.playableCopyId || job.item?.id || "");

    return ids.has(sourceId) || ids.has(copyId);
  }) || null;
}

function settingsVideoCopyJobCardHtml(job = {}) {
  const percent = Math.max(0, Math.min(100, Number(job.percent || 0)));
  const status = String(job.status || "");
  const cardClass = status === "done" ? "isDone" : status === "error" ? "isError" : "isRunning";
  const doneId = job.item?.id || job.itemId || "";

  return `
    <div class="settingsVideoCopyCard ${cardClass}" style="--copy-progress:${percent}%">
      <i></i>
      <span>${iconHtml(status === "done" ? "circle-check" : status === "error" ? "triangle-exclamation" : "film")}</span>
      <div>
        <strong>${escapeHtml(job.sourceTitle || job.fileName || "MP4 browser copy")}</strong>
        <em>${escapeHtml(job.message || status || "Working")} ${job.fileName ? `· ${escapeHtml(job.fileName)}` : ""}</em>
      </div>
      ${doneId ? `<button class="settingsTinyBtn sync" data-route="/video-player?videoId=${encodeURIComponent(doneId)}" type="button">Open copy</button>` : `<b>${Math.round(percent)}%</b>`}
    </div>
  `;
}

function settingsVideoCopyJobsHtml() {
  const jobs = settingsVideoCopyJobs.slice(0, 5);
  if (!jobs.length) return "";

  return `
    <div class="settingsVideoCopyJobs">
      ${jobs.map(settingsVideoCopyJobCardHtml).join("")}
    </div>
  `;
}

async function loadSettingsVideoCopyJobs(reRender = false) {
  try {
    const data = await settingsApiJson("/video-browser-copy-jobs");
    settingsVideoCopyJobs = Array.isArray(data?.jobs) ? data.jobs : [];
  } catch {
    settingsVideoCopyJobs = [];
  }

  if (reRender) renderVideoSettingsTab();
  return settingsVideoCopyJobs;
}

function settingsVideoEditPageHtml(item = {}) {
  return `
    <div class="settingsVideoEditPage">
      <div class="settingsEditPageTop">
        <button class="settingsToolBtn" data-video-settings-back-list type="button">${iconHtml("arrow-left")}<span>Back to video list</span></button>
        <button class="settingsToolBtn primary" data-route="/video-player?videoId=${encodeURIComponent(item.id || "")}&tab=info" type="button">${iconHtml("play")}<span>Open this video</span></button>
      </div>
      ${settingsVideoEditorHtml(item)}
    </div>
  `;
}

function settingsVideoEditorHtml(item) {
  if (!item) {
    return `<div class="settingsVideoEditor"><div class="settingsVideoEmpty">Select a video to edit.</div></div>`;
  }

  const poster = settingsVideoPosterUrl(item);
  const playable = isSettingsVideoBrowserFriendly(item);
  const copyJob = getSettingsVideoCopyJobForItem(item);
  const copyRunning = isSettingsVideoCopyRunning(copyJob);

  return `
    <div class="settingsVideoEditor">
      <div class="settingsVideoEditorTop">
        <div class="settingsVideoPosterPreview">${poster ? `<img src="${escapeHtml(poster)}" alt="${escapeHtml(settingsVideoTitle(item))}" />` : iconHtml("film")}</div>

        <div class="settingsVideoEditorHead">
          <strong>${escapeHtml(settingsVideoTitle(item))}</strong>
          <span>${escapeHtml(item.locator || item.fileName || "")}</span>
          <span>${escapeHtml([item.mimeType, item.sizeBytes ? formatSettingsBytes(item.sizeBytes) : "", playable ? "Browser friendly" : "Needs MP4 browser copy"].filter(Boolean).join(" · "))}</span>

          <div class="settingsVideoEditorActions">
            <button class="settingsToolBtn primary" data-route="/video-player?videoId=${encodeURIComponent(item.id)}&tab=info" type="button">${iconHtml("play")}<span>Open this video</span></button>
            <button class="settingsToolBtn" data-route="/converter?videoId=${encodeURIComponent(item.id)}" type="button">${iconHtml("arrows-rotate")}<span>Send to Converter</span></button>
            <button class="settingsToolBtn" data-video-browser-copy="${escapeHtml(item.id)}" type="button" ${copyRunning ? "disabled" : ""}>${iconHtml("film")}<span>${copyRunning ? "Copy running…" : playable ? "Create extra MP4 copy" : "Create MP4 copy"}</span></button>
            <button class="settingsToolBtn" data-video-delete-library="${escapeHtml(item.id)}" type="button">${iconHtml("folder-minus")}<span>Remove from library</span></button>
            <button class="settingsToolBtn danger" data-video-delete-physical="${escapeHtml(item.id)}" type="button">${iconHtml("trash")}<span>Delete physical file</span></button>
          </div>

          ${copyJob ? `<div class="settingsVideoCopyStatus">${settingsVideoCopyJobCardHtml(copyJob)}</div>` : ""}
          ${!playable ? `<div class="settingsVideoDangerNote">This file may not play in Safari/Chrome yet. Use Create MP4 copy or Send to Converter.</div>` : ""}
        </div>
      </div>

      <div class="settingsVideoEditorForm">
        <div class="settingsVideoSectionTitle">Video details</div>

        <label class="settingsVideoField">
          <span>Title</span>
          <input id="settingsVideoTitleInput" value="${escapeHtml(item.title || "")}" />
        </label>

        <div class="settingsVideoRatings">
          <label class="settingsVideoField">
            <span>Year</span>
            <input id="settingsVideoYearInput" value="${escapeHtml(item.year || "")}" />
          </label>
          <label class="settingsVideoField">
            <span>Genre</span>
            <input id="settingsVideoGenreInput" value="${escapeHtml(item.genre || "")}" />
          </label>
          <label class="settingsVideoField">
            <span>Age rating</span>
            <input id="settingsVideoCertInput" value="${escapeHtml(item.certification || "")}" />
          </label>
        </div>

        <label class="settingsVideoField">
          <span>Overview</span>
          <textarea id="settingsVideoOverviewInput">${escapeHtml(item.overview || "")}</textarea>
        </label>

        <div class="settingsVideoRatings">
          <label class="settingsVideoField">
            <span>IMDb</span>
            <input id="settingsVideoImdbRatingInput" value="${escapeHtml(item.imdbRating || item.onlineRating || "")}" />
          </label>
          <label class="settingsVideoField">
            <span>Rotten Tomatoes</span>
            <input id="settingsVideoRtRatingInput" value="${escapeHtml(item.rottenTomatoesRating || "")}" />
          </label>
          <label class="settingsVideoField">
            <span>Metacritic</span>
            <input id="settingsVideoMetaRatingInput" value="${escapeHtml(item.metacriticRating || "")}" />
          </label>
        </div>

        <div class="settingsVideoEditorActions">
          <button class="settingsToolBtn primary" data-video-save-details="${escapeHtml(item.id)}" type="button">${iconHtml("floppy-disk")}<span>Save video details</span></button>
          <button class="settingsToolBtn" data-video-refresh-one="${escapeHtml(item.id)}" type="button">${iconHtml("wand-magic-sparkles")}<span>Refresh auto metadata</span></button>
        </div>
      </div>

      <div class="settingsVideoPosterBox">
        <div class="settingsVideoSectionTitle">Own poster</div>

        <label class="settingsVideoField">
          <span>Poster image URL</span>
          <input id="settingsVideoPosterUrlInput" value="${escapeHtml(item.customPosterUrl || "")}" placeholder="https://example.com/my-poster.jpg" />
        </label>

        <div class="settingsVideoPosterActions">
          <button class="settingsToolBtn primary" data-video-save-poster-url="${escapeHtml(item.id)}" type="button">${iconHtml("image")}<span>Save poster URL</span></button>
          <button class="settingsToolBtn" data-video-upload-poster="${escapeHtml(item.id)}" type="button">${iconHtml("folder-plus")}<span>Upload poster</span></button>
          <input id="settingsVideoPosterUploadInput" class="hidden" type="file" accept="image/jpeg,image/png,image/webp" />
        </div>
      </div>

      <div class="settingsVideoMetadataSearchBox">
        <div class="settingsVideoSectionTitle">Manual IMDb / TMDb / OMDb search</div>

        <div class="settingsVideoSearchActions">
          <input id="settingsVideoManualSearchInput" class="settingsVideoSearch" value="${escapeHtml(settingsVideoManualSearch || item.title || "")}" placeholder="Search title, IMDb ID or IMDb URL" />
          <input id="settingsVideoManualYearInput" class="settingsVideoSearch" value="${escapeHtml(item.year || "")}" placeholder="Year optional" />
          <button class="settingsToolBtn primary" data-video-metadata-search="${escapeHtml(item.id)}" type="button">${iconHtml("magnifying-glass")}<span>Search</span></button>
        </div>

        <div class="settingsVideoMatches">${settingsVideoMatchesHtml()}</div>
      </div>
    </div>
  `;
}

function settingsVideoPreferencesHtml(
  tab = "overview"
) {
  const groups = {
    overview: [
      {
        type: "toggle",
        key: "resumeEnabled",
        title: "Resume playback",
        desc: "Restore the last watched position.",
      },
      {
        type: "toggle",
        key: "saveProgress",
        title: "Save watch progress",
        desc: "Persist watch positions between sessions.",
      },
      {
        type: "toggle",
        key: "autoplayNextPart",
        title: "Auto-play next linked part",
        desc: "Continue into the next linked video part.",
      },
      {
        type: "toggle",
        key: "preferBrowserCopy",
        title: "Prefer MP4 browser copy",
        desc: "Use the linked browser-safe MP4 when one exists.",
      },
    ],

    playback: [
      {
        type: "number",
        key: "skipSeconds",
        title: "Seek jump seconds",
        desc: "Rewind and forward button jump size.",
        min: 5,
        max: 120,
        step: 5,
      },
      {
        type: "select",
        key: "playbackRate",
        title: "Default speed",
        desc: "Default video playback rate.",
        options: [
          { value: "0.75", label: "0.75×" },
          { value: "1", label: "Normal" },
          { value: "1.25", label: "1.25×" },
          { value: "1.5", label: "1.5×" },
          { value: "2", label: "2×" },
        ],
      },
      {
        type: "select",
        key: "preloadMode",
        title: "Browser preload",
        desc: "How much video the browser prepares in advance.",
        options: [
          { value: "none", label: "None" },
          { value: "metadata", label: "Metadata only" },
          { value: "auto", label: "Auto" },
        ],
      },
      {
        type: "toggle",
        key: "nativeControls",
        title: "Native browser controls",
        desc: "Show the browser controls as well as BRMedia controls.",
      },
      {
        type: "toggle",
        key: "startMuted",
        title: "Start muted",
        desc: "Useful for mobile autoplay restrictions.",
      },
      {
        type: "toggle",
        key: "pipEnabled",
        title: "Picture-in-Picture",
        desc: "Keep the pop-out button where supported.",
      },
    ],

    screen: [
      {
        type: "select",
        key: "aspectRatio",
        title: "Screen ratio",
        desc: "Change the display frame without altering the video file.",
        options: [
          { value: "auto", label: "Automatic" },
          { value: "16:9", label: "16:9 widescreen" },
          { value: "4:3", label: "4:3 classic" },
          { value: "21:9", label: "21:9 cinema" },
          { value: "1:1", label: "1:1 square" },
          { value: "9:16", label: "9:16 portrait" },
        ],
      },
      {
        type: "select",
        key: "objectFit",
        title: "Screen fit",
        desc: "Fit, crop, stretch or scale down the picture.",
        options: [
          { value: "contain", label: "Fit entire video" },
          { value: "cover", label: "Fill / crop" },
          { value: "fill", label: "Stretch" },
          { value: "scale-down", label: "Scale down only" },
        ],
      },
    ],

    copies: [
      {
        type: "toggle",
        key: "preferBrowserCopy",
        title: "Use MP4 copy automatically",
        desc: "Prefer the browser-safe copy when available.",
      },
      {
        type: "toggle",
        key: "promptBrowserCopy",
        title: "Prompt when MP4 copy is needed",
        desc: "Show the MKV conversion prompt.",
      },
      {
        type: "select",
        key: "browserCopyPreset",
        title: "FFmpeg preset",
        desc: "Encoding speed versus compression efficiency.",
        options: [
          { value: "veryfast", label: "Very fast" },
          { value: "fast", label: "Fast" },
          { value: "medium", label: "Medium" },
          { value: "slow", label: "Slow" },
        ],
      },
      {
        type: "number",
        key: "browserCopyCrf",
        title: "MP4 quality (CRF)",
        desc: "Lower values give higher quality and larger files.",
        min: 18,
        max: 30,
        step: 1,
      },
      {
        type: "select",
        key: "browserCopyAudioBitrate",
        title: "Audio bitrate",
        desc: "AAC audio bitrate for browser copies.",
        options: [
          { value: "128k", label: "128 kbps" },
          { value: "160k", label: "160 kbps" },
          { value: "192k", label: "192 kbps" },
          { value: "256k", label: "256 kbps" },
        ],
      },
      {
        type: "toggle",
        key: "autoOpenBrowserCopy",
        title: "Open MP4 copy when complete",
        desc: "Jump into the playable copy after FFmpeg finishes.",
      },
    ],

    metadata: [
      {
        type: "toggle",
        key: "autoMetadataRefresh",
        title: "Automatic metadata refresh",
        desc: "Quietly refresh films with missing metadata.",
      },
      {
        type: "toggle",
        key: "richMetadataRefresh",
        title: "Allow force-rich refresh",
        desc: "Rebuild stale cast, trailers and related-film arrays.",
      },
      {
        type: "number",
        key: "metadataBatchSize",
        title: "Metadata batch size",
        desc: "How many films each background refresh handles.",
        min: 1,
        max: 30,
        step: 1,
      },
      {
        type: "toggle",
        key: "showCastImages",
        title: "Cast images",
        desc: "Show actor and director photographs.",
      },
      {
        type: "toggle",
        key: "showRelatedImages",
        title: "Related posters",
        desc: "Show poster images for related films.",
      },
      {
        type: "toggle",
        key: "showTrailers",
        title: "Trailers",
        desc: "Show trailer links where available.",
      },
      {
        type: "toggle",
        key: "showCollections",
        title: "Collections",
        desc: "Show film-series collection information.",
      },
    ],

    subtitles: [
      {
        type: "toggle",
        key: "subtitlesEnabled",
        title: "Enable subtitles",
        desc: "Load SRT and VTT subtitle tracks.",
      },
      {
        type: "toggle",
        key: "subtitlesDefaultOn",
        title: "Subtitles default on",
        desc: "Show the preferred language automatically.",
      },
      {
        type: "text",
        key: "subtitleLanguage",
        title: "Preferred subtitle language",
        desc: "Use a short language code such as en.",
      },
    ],

    linkups: [
      {
        type: "toggle",
        key: "showPartSwitcher",
        title: "Show part switcher",
        desc: "Show linked film parts above the player.",
      },
      {
        type: "toggle",
        key: "autoplayNextPart",
        title: "Auto-play next linked part",
        desc: "Continue linked items when a part finishes.",
      },
    ],

    delete: [
      {
        type: "select",
        key: "defaultDeleteMode",
        title: "Default delete action",
        desc: "Library-only keeps your physical file safe.",
        options: [
          {
            value: "library",
            label: "Remove from library only",
          },
          {
            value: "physical",
            label: "Delete physical file",
          },
        ],
      },
      {
        type: "toggle",
        key: "confirmPhysicalDelete",
        title: "Confirm physical deletion",
        desc: "Keep a warning before deleting a disk file.",
      },
    ],
  };

  const controls =
    groups[tab] ||
    groups.overview;

  return `
    <article class="settingsCard settingsVideoPreferencesCard">
      <div class="settingsCardHead">
        <span class="settingsCardIcon">
          ${iconHtml("sliders")}
        </span>

        <div>
          <h4>Video Player defaults</h4>

          <p>
            Persistent options live here.
            Reopen Video Player after changing them.
          </p>
        </div>
      </div>

      <div class="settingsLiveControls">
        ${controls
          .map((control) =>
            moduleSettingControlHtml(
              control,
              "video"
            )
          )
          .join("")}
      </div>
    </article>
  `;
}

async function renderVideoSettingsTab() {
  playerSettingsSubTabs?.classList.add("hidden");
  await Promise.all([
    ensureSettingsVideoLoaded(false),
    loadSettingsVideoCopyJobs(false),
    ensureSettingsHiddenVideosLoaded(false),
  ]);

  const activeTree = SETTINGS_NAV_TREE.find((item) => item.key === "video");
  const activeChild = activeTree?.children?.find((child) => child.key === activeChildSettingsTab) || activeTree?.children?.[0];
  const selected = getSelectedSettingsVideo();
  const videos = getFilteredSettingsVideos();

  settingsActiveTitle.textContent = activeChild ? `Video Player Settings — ${activeChild.title}` : "Video Player Settings";
  settingsActiveBadge.textContent = "Video";

  settingsCards.innerHTML = `
    <div class="settingsTabIntro">
      <p>
        Manage video files from Universal Settings:
        playback defaults, screen ratio, subtitles,
        metadata, MP4 copies, linked parts and safe
        delete behaviour.
      </p>
    </div>

    ${settingsVideoPreferencesHtml(activeChildSettingsTab)}

    <article class="settingsCard">
      <div class="settingsCardHead">
        <span class="settingsCardIcon">${iconHtml("film")}</span>
        <div>
          <h4>Video Library Editor</h4>
          <p>${escapeHtml(settingsVideoStatus)}</p>
        </div>
      </div>

      <div class="settingsVideoPanel">
        <div class="settingsVideoToolbar">
          <input id="settingsVideoSearchInput" class="settingsVideoSearch" value="${escapeHtml(settingsVideoSearch)}" placeholder="Search video library…" />
          <button class="settingsToolBtn" data-video-settings-refresh type="button">${iconHtml("arrows-rotate")}<span>Rescan videos</span></button>
          <button class="settingsToolBtn" data-route="/video-player" type="button">${iconHtml("play")}<span>Open Video Player</span></button>
        </div>

        <div class="settingsInfoGrid">
          ${playerInfoRowHtml({ title: "Videos", value: String(settingsVideoItems.length), desc: "Files found in your video folders." })}
          ${playerInfoRowHtml({ title: "Showing", value: String(videos.length), desc: "Current filter/search results." })}
          ${playerInfoRowHtml({ title: "Needs MP4", value: String(settingsVideoItems.filter((item) => !isSettingsVideoBrowserFriendly(item)).length), desc: "Unsupported browser formats." })}
        </div>

        ${settingsVideoCopyJobsHtml()}

        ${
          activeChildSettingsTab === "removed"
            ? settingsHiddenVideosHtml()
            : selected
              ? settingsVideoEditPageHtml(selected)
              : `
                <div class="settingsVideoGrid">
                  <div class="settingsVideoList">
                    ${settingsVideoListHtml()}
                  </div>

                  <div class="settingsVideoEditor">
                    <div class="settingsVideoEmpty">
                      Select a video to open its own edit/actions page.
                    </div>
                  </div>
                </div>
              `
        }
      </div>
    </article>
  `;

  bindVideoSettingsEvents();
  renderSettingsSidebarTree();
  hydrateBrIcons(settingsCards);
}

function bindVideoSettingsEvents() {
  settingsCards
    .querySelectorAll(
      '[data-module-setting][data-module-settings-key="video"]'
    )
    .forEach((field) => {
      field.addEventListener("change", () =>
        updateModuleSettingFromField(field)
      );
    });

  $("settingsVideoSearchInput")?.addEventListener("input", (event) => {
    settingsVideoSearch = event.target.value || "";
    renderVideoSettingsTab();
  });

  settingsCards
    .querySelector("[data-video-settings-refresh]")
    ?.addEventListener("click", async () => {
      settingsVideoLoaded = false;
      settingsHiddenVideoLoaded = false;

      await Promise.all([
        ensureSettingsVideoLoaded(true),
        ensureSettingsHiddenVideosLoaded(true),
      ]);

      renderVideoSettingsTab();
    });

  settingsCards.querySelectorAll("[data-video-settings-back-list]").forEach((button) => {
    button.addEventListener("click", () => {
      settingsVideoSelectedId = "";
      settingsVideoMetadataResults = [];
      renderVideoSettingsTab();
    });
  });

  settingsCards.querySelectorAll("[data-video-settings-select]").forEach((button) => {
    button.addEventListener("click", () => {
      settingsVideoSelectedId = button.dataset.videoSettingsSelect || "";
      settingsVideoMetadataResults = [];
      renderVideoSettingsTab();
    });
  });

  settingsCards.querySelectorAll("[data-video-save-details]").forEach((button) => {
    button.addEventListener("click", () => saveSettingsVideoDetails(button.dataset.videoSaveDetails || ""));
  });

  settingsCards.querySelectorAll("[data-video-refresh-one]").forEach((button) => {
    button.addEventListener("click", () => refreshSettingsVideoMetadata(button.dataset.videoRefreshOne || ""));
  });

  settingsCards.querySelectorAll("[data-video-metadata-search]").forEach((button) => {
    button.addEventListener("click", () => searchSettingsVideoMetadata(button.dataset.videoMetadataSearch || ""));
  });

  settingsCards.querySelectorAll("[data-video-apply-match]").forEach((button) => {
    button.addEventListener("click", () => applySettingsVideoMetadataMatch(Number(button.dataset.videoApplyMatch || 0)));
  });

  settingsCards.querySelectorAll("[data-video-save-poster-url]").forEach((button) => {
    button.addEventListener("click", () => saveSettingsVideoPosterUrl(button.dataset.videoSavePosterUrl || ""));
  });

  settingsCards.querySelectorAll("[data-video-upload-poster]").forEach((button) => {
    button.addEventListener("click", () => {
      settingsVideoPosterUploadTargetId = button.dataset.videoUploadPoster || "";
      const input = $("settingsVideoPosterUploadInput");
      if (input) {
        input.value = "";
        input.click();
      }
    });
  });

  $("settingsVideoPosterUploadInput")?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (file) void uploadSettingsVideoPoster(settingsVideoPosterUploadTargetId, file);
  });

  settingsCards
    .querySelectorAll("[data-video-browser-copy]")
    .forEach((button) => {
      button.addEventListener("click", () =>
        startSettingsVideoBrowserCopy(
          button.dataset.videoBrowserCopy ||
          ""
        )
      );
    });
		
  settingsCards
    .querySelectorAll("[data-video-restore-hidden]")
    .forEach((button) => {
      button.addEventListener("click", () =>
        restoreSettingsHiddenVideo(
          button.dataset.videoRestoreHidden ||
          ""
        )
      );
    });

  settingsCards
    .querySelectorAll("[data-video-delete-library]")
    .forEach((button) => {
      button.addEventListener("click", () =>
        deleteSettingsVideoItem(
          button.dataset.videoDeleteLibrary ||
          "",
          "library"
        )
      );
    });

  settingsCards
    .querySelectorAll("[data-video-delete-physical]")
    .forEach((button) => {
      button.addEventListener("click", () =>
        deleteSettingsVideoItem(
          button.dataset.videoDeletePhysical ||
          "",
          "physical"
        )
      );
    });

  settingsCards.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => goToRoute(button.dataset.route || "/"));
  });
}

async function deleteSettingsVideoItem(
  id,
  mode = "library"
) {
  if (!id) return;

  const physical =
    mode === "physical";

  const confirmed =
    window.confirm(
      physical
        ? "Delete this physical video file from disk? This cannot be undone."
        : "Remove this video from BRMedia only? The physical file will stay on disk."
    );

  if (!confirmed) return;

  try {
    await settingsDeleteJson(
      `/video-library/${encodeURIComponent(id)}?mode=${encodeURIComponent(
        physical
          ? "physical"
          : "library"
      )}`
    );

    settingsVideoLoaded = false;
    settingsHiddenVideoLoaded = false;
    settingsVideoSelectedId = "";

    await Promise.all([
      ensureSettingsVideoLoaded(true),
      ensureSettingsHiddenVideosLoaded(true),
    ]);

    showSettingsSaveNotice(
      physical
        ? "Physical video file deleted."
        : "Video removed from BRMedia. Physical file kept."
    );

    renderVideoSettingsTab();
  } catch (err) {
    showSettingsSaveNotice(
      `Video delete failed: ${err?.message || String(err)}`
    );
  }
}

async function saveSettingsVideoDetails(id) {
  if (!id) return;

  try {
    const data = await settingsPostJson(`/video-library/${encodeURIComponent(id)}/metadata/apply`, {
      title: $("settingsVideoTitleInput")?.value || "",
      year: $("settingsVideoYearInput")?.value || "",
      genre: $("settingsVideoGenreInput")?.value || "",
      certification: $("settingsVideoCertInput")?.value || "",
      overview: $("settingsVideoOverviewInput")?.value || "",
      imdbRating: $("settingsVideoImdbRatingInput")?.value || "",
      rottenTomatoesRating: $("settingsVideoRtRatingInput")?.value || "",
      metacriticRating: $("settingsVideoMetaRatingInput")?.value || "",
      metadataSource: "BRMedia Manual",
    });

    if (data?.item) {
      settingsVideoItems = settingsVideoItems.map((item) => String(item.id) === String(id) ? data.item : item);
    }

    showSettingsSaveNotice("Video details saved.");
    renderVideoSettingsTab();
  } catch (err) {
    showSettingsSaveNotice(`Video save failed: ${err?.message || String(err)}`);
  }
}

async function refreshSettingsVideoMetadata(id) {
  if (!id) return;

  try {
    const data =
      await settingsPostJson(
        `/video-library/${encodeURIComponent(id)}/metadata?refresh=1&rich=1`,
        {
          rich: true,
        }
      );
    if (data?.item) {
      settingsVideoItems = settingsVideoItems.map((item) => String(item.id) === String(id) ? data.item : item);
    }
    showSettingsSaveNotice("Video metadata refreshed.");
    renderVideoSettingsTab();
  } catch (err) {
    showSettingsSaveNotice(`Metadata refresh failed: ${err?.message || String(err)}`);
  }
}

async function searchSettingsVideoMetadata(id) {
  const query = $("settingsVideoManualSearchInput")?.value || "";
  const year = $("settingsVideoManualYearInput")?.value || "";
  settingsVideoManualSearch = query;

  if (!query.trim()) {
    showSettingsSaveNotice("Type a title, IMDb ID or IMDb URL first.");
    return;
  }

  try {
    const data = await settingsPostJson("/video-metadata/search", { query, year });
    settingsVideoMetadataResults = Array.isArray(data?.results) ? data.results : [];
    showSettingsSaveNotice(`${settingsVideoMetadataResults.length} metadata match${settingsVideoMetadataResults.length === 1 ? "" : "es"} found.`);
    renderVideoSettingsTab();
  } catch (err) {
    showSettingsSaveNotice(`Metadata search failed: ${err?.message || String(err)}`);
  }
}

async function applySettingsVideoMetadataMatch(index) {
  const selected = getSelectedSettingsVideo();
  const match = settingsVideoMetadataResults[index];
  if (!selected?.id || !match) return;

  try {
    const data = await settingsPostJson(`/video-library/${encodeURIComponent(selected.id)}/metadata/apply`, {
      ...match,
      metadataSource: match.metadataSource || "Manual Metadata Search",
    });

    if (data?.item) {
      settingsVideoItems = settingsVideoItems.map((item) => String(item.id) === String(selected.id) ? data.item : item);
    }

    settingsVideoMetadataResults = [];
    showSettingsSaveNotice("Metadata match saved to video.");
    renderVideoSettingsTab();
  } catch (err) {
    showSettingsSaveNotice(`Use match failed: ${err?.message || String(err)}`);
  }
}

async function saveSettingsVideoPosterUrl(id) {
  const posterUrl = $("settingsVideoPosterUrlInput")?.value || "";

  if (!id || !posterUrl.trim()) {
    showSettingsSaveNotice("Paste a poster URL first.");
    return;
  }

  try {
    const data = await settingsPostJson(`/video-library/${encodeURIComponent(id)}/poster-url`, { posterUrl });
    if (data?.item) {
      settingsVideoItems = settingsVideoItems.map((item) => String(item.id) === String(id) ? data.item : item);
    }
    showSettingsSaveNotice("Poster URL saved.");
    renderVideoSettingsTab();
  } catch (err) {
    showSettingsSaveNotice(`Poster URL failed: ${err?.message || String(err)}`);
  }
}

async function uploadSettingsVideoPoster(id, file) {
  if (!id || !file) return;

  try {
    const res = await fetch(`/video-library/${encodeURIComponent(id)}/poster-upload?name=${encodeURIComponent(file.name || "poster.jpg")}`, {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

    if (data?.item) {
      settingsVideoItems = settingsVideoItems.map((item) => String(item.id) === String(id) ? data.item : item);
    }

    showSettingsSaveNotice("Poster uploaded and attached.");
    renderVideoSettingsTab();
  } catch (err) {
    showSettingsSaveNotice(`Poster upload failed: ${err?.message || String(err)}`);
  }
}

async function startSettingsVideoBrowserCopy(id) {
  if (!id) return;

  try {
    showSettingsSaveNotice("Starting MP4 browser copy…");
    const data =
      await settingsPostJson(
        `/video-library/${encodeURIComponent(id)}/browser-copy`,
        {
          preset:
            videoSettings.browserCopyPreset ||
            "fast",

          crf:
            Number(
              videoSettings.browserCopyCrf ||
              23
            ),

          audioBitrate:
            videoSettings.browserCopyAudioBitrate ||
            "192k",
        }
      );
    if (data?.job) {
      settingsVideoCopyJobs = [data.job, ...settingsVideoCopyJobs.filter((job) => job.id !== data.job.id)];
      startVideoCopyPolling(data.job.id);
    }
    showSettingsSaveNotice("MP4 browser copy started.");
    renderVideoSettingsTab();
  } catch (err) {
    showSettingsSaveNotice(`MP4 copy failed: ${err?.message || String(err)}`);
  }
}

function startVideoCopyPolling(jobId) {
  window.clearInterval(settingsVideoCopyPollTimer);
  settingsVideoCopyPollTimer = window.setInterval(async () => {
    try {
      const data = await settingsApiJson(`/video-browser-copy-jobs/${encodeURIComponent(jobId)}`);
      if (data?.job) {
        settingsVideoCopyJobs = [data.job, ...settingsVideoCopyJobs.filter((job) => job.id !== data.job.id)];
        if (["done", "error", "cancelled"].includes(data.job.status)) {
          window.clearInterval(settingsVideoCopyPollTimer);
          settingsVideoLoaded = false;
          await Promise.all([
            ensureSettingsVideoLoaded(true),
            loadSettingsVideoCopyJobs(false),
          ]);
        }
        renderVideoSettingsTab();
      }
    } catch {
      window.clearInterval(settingsVideoCopyPollTimer);
    }
  }, 1800);
}

function applyTorrentSettingsFromState(data = {}) {
  const stateSettings = data?.settings || data?.state?.settings || {};
  const engine = data?.engine || data?.state?.engine || {};
  const bandwidth = stateSettings.bandwidth || {};
  const scheduler = stateSettings.scheduler || {};
  const cache = stateSettings.cache || {};
  const protocols = stateSettings.protocols || {};
  const security = stateSettings.security || {};
  const ui = stateSettings.ui || {};
  const windows = Array.isArray(scheduler.windows) ? scheduler.windows : [];
  const weekdayWindow = windows.find((item) => String(item?.day || "").toLowerCase().includes("mon")) || windows[0] || {};
  const weekendWindow = windows.find((item) => String(item?.day || "").toLowerCase().includes("sat")) || windows[1] || {};

  torrentSettings = {
    ...torrentSettings,
    engineEnabled: engine.enabled !== false,
    engineUrl: engine.baseUrl || torrentSettings.engineUrl,
    engineUser: engine.username || "",
    engineSavePath: engine.savePath || torrentSettings.engineSavePath,
    downloadLimitKb: Number(bandwidth.downloadLimitKb || torrentSettings.downloadLimitKb || 0),
    uploadLimitKb: Number(bandwidth.uploadLimitKb || torrentSettings.uploadLimitKb || 0),
    slowModeDownloadKb: Number(bandwidth.slowModeDownloadKb || torrentSettings.slowModeDownloadKb || 512),
    slowModeUploadKb: Number(bandwidth.slowModeUploadKb || torrentSettings.slowModeUploadKb || 64),
    schedulerEnabled: !!scheduler.enabled,
    schedulerMode: scheduler.mode || torrentSettings.schedulerMode,
    schedulerOutsideMode: scheduler.outsideMode || torrentSettings.schedulerOutsideMode,
    schedulerWeekdayStart: weekdayWindow.start || torrentSettings.schedulerWeekdayStart,
    schedulerWeekdayEnd: weekdayWindow.end || torrentSettings.schedulerWeekdayEnd,
    schedulerWeekendStart: weekendWindow.start || torrentSettings.schedulerWeekendStart,
    schedulerWeekendEnd: weekendWindow.end || torrentSettings.schedulerWeekendEnd,
    cacheEnabled: cache.enabled !== false,
    cacheSizeMb: Number(cache.sizeMb || torrentSettings.cacheSizeMb || 512),
    cacheWriteCoalesce: cache.writeCoalesce !== false,
    cacheReduceDiskWear: cache.reduceDiskWear !== false,
    scanTorrentFiles: security.scanTorrentFiles !== false,
    scanDownloadedFiles: !!security.scanDownloadedFiles,
    blockSuspiciousFiles: security.blockSuspiciousFiles !== false,
    quarantineSuspiciousFiles: !!security.quarantineSuspiciousFiles,
    quarantineFolder: security.quarantineFolder || torrentSettings.quarantineFolder,
    defenderDeepScan: security.defenderDeepScan !== false,
    defenderDisableRemediation: security.defenderDisableRemediation !== false,
    magnetLinks: protocols.magnetLinks !== false,
    upnp: protocols.upnp !== false,
    natPmp: protocols.natPmp !== false,
    protocolEncryption: protocols.protocolEncryption !== false,
    ipv6: !!protocols.ipv6,
    defaultTransferTarget: ui.defaultTransferTarget || torrentSettings.defaultTransferTarget,
    showPiecesMap: ui.showPiecesMap !== false,
    browserNotifications: !!ui.browserNotifications,
    completionNotifications: ui.completionNotifications !== false,
    blockedNotifications: ui.blockedNotifications !== false,
    lowSeedNotifications: ui.lowSeedNotifications !== false,
    engineDisconnectedNotifications: ui.engineDisconnectedNotifications !== false,
    diskSpaceNotifications: ui.diskSpaceNotifications !== false,
    scanCompleteNotifications: ui.scanCompleteNotifications !== false,
    transferCompleteNotifications: ui.transferCompleteNotifications !== false,
    inAppHistory: ui.inAppHistory !== false,
    speedGraph: ui.speedGraph !== false,
    speedGraphSampleIntervalSec: Number(ui.speedGraphSampleIntervalSec || torrentSettings.speedGraphSampleIntervalSec || 5),
    speedGraphHistoryLength: Number(ui.speedGraphHistoryLength || torrentSettings.speedGraphHistoryLength || 120),
    speedGraphShowTotals: ui.speedGraphShowTotals !== false,
    speedGraphShowCurrent: ui.speedGraphShowCurrent !== false,
    speedGraphShowAverage: ui.speedGraphShowAverage !== false,
    speedGraphShowPeak: ui.speedGraphShowPeak !== false,
  };
  writePersistedJson(TORRENT_SETTINGS_KEY, torrentSettings);
}

async function ensureTorrentSettingsLoaded() {
  if (torrentSettingsLoaded) return;
  try {
    const res = await fetch("/torrent/state", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Could not load torrent settings");
    applyTorrentSettingsFromState(data);
  } catch {}
  torrentSettingsLoaded = true;
}

const TORRENT_SECURITY_LIVE_TABS = new Set(["safety", "quarantine", "scan-history"]);

async function torrentSettingsRequestJson(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) throw new Error(data?.error || `Request failed: ${res.status}`);
  return data;
}

async function ensureTorrentSecurityLoaded(force = false) {
  if (torrentSecurityLoading || (torrentSecurityLoaded && !force)) return;
  torrentSecurityLoading = true;
  try {
    const [history, defender, jobs] = await Promise.all([
      torrentSettingsRequestJson("/torrent/security/history", { cache: "no-store" }),
      torrentSettingsRequestJson("/torrent/security/defender/status", { cache: "no-store" }),
      torrentSettingsRequestJson("/torrent/security/defender/jobs", { cache: "no-store" }),
    ]);
    torrentSecurityHistory = {
      scanHistory: Array.isArray(history.scanHistory) ? history.scanHistory : [],
      quarantineHistory: Array.isArray(history.quarantineHistory) ? history.quarantineHistory : [],
    };
    torrentDefenderStatus = defender;
    torrentDefenderJobs = Array.isArray(jobs.jobs) ? jobs.jobs : [];
  } catch (err) {
    torrentDefenderStatus = { available: false, note: `Could not read Defender status: ${err?.message || err}` };
  } finally {
    torrentSecurityLoaded = true;
    torrentSecurityLoading = false;
  }
}

function torrentSettingsStateClass(status = "") {
  return ["clean", "restored", "quarantined"].includes(status) ? "isDone" : ["warning", "blocked", "deleted", "error"].includes(status) ? "isFailed" : "";
}

function torrentSettingsLiveHtml(tabKey = "") {
  if (!TORRENT_SECURITY_LIVE_TABS.has(tabKey)) return "";
  if (!torrentSecurityLoaded) return `<article class="settingsCard"><div class="settingsCardHead"><span class="settingsCardIcon">${iconHtml("spinner")}</span><div><h4>Loading live torrent security</h4><p>Reading Defender and quarantine status from the BRMedia server PC.</p></div></div></article>`;

  const defender = torrentDefenderStatus || {};
  const jobs = Array.isArray(torrentDefenderJobs) ? torrentDefenderJobs : [];
  const scans = Array.isArray(torrentSecurityHistory.scanHistory) ? torrentSecurityHistory.scanHistory : [];
  const quarantine = Array.isArray(torrentSecurityHistory.quarantineHistory) ? torrentSecurityHistory.quarantineHistory : [];
  const downloads = torrentSettings.engineSavePath || "C:\\BRMedia\\Torrents\\Downloads";
  const quarantinePath = torrentSettings.quarantineFolder || "C:\\BRMedia\\Quarantine";

  if (tabKey === "safety") return `
    <article class="settingsCard settingsWideCard"><div class="settingsCardHead"><span class="settingsCardIcon">${iconHtml("shield-check")}</span><div><h4>Live Defender actions</h4><p>Defender scans are optional and remain separate from BRMedia's fast torrent file-name checks.</p></div></div>
      <div class="settingsToolPanel"><div class="settingsToolSummary ${defender.available ? "isSuccess" : "isError"}"><strong>${defender.available ? "Microsoft Defender available" : "Microsoft Defender unavailable"}</strong><br />${escapeHtml(defender.note || "Status unavailable.")}${defender.executable ? `<br /><small>${escapeHtml(defender.executable)}</small>` : ""}</div>
        <div class="settingsToolActions"><button class="settingsToolBtn primary" data-torrent-defender-scan="${escapeHtml(downloads)}" type="button" ${defender.available ? "" : "disabled"}>${iconHtml("shield-virus")}<span>Scan downloads</span></button><button class="settingsToolBtn" data-torrent-defender-scan="${escapeHtml(quarantinePath)}" type="button" ${defender.available ? "" : "disabled"}>${iconHtml("box-archive")}<span>Scan quarantine</span></button><button class="settingsToolBtn" data-torrent-security-refresh type="button">${iconHtml("rotate")}<span>Refresh</span></button></div>
        <div class="settingsJobList">${jobs.length ? jobs.slice(0, 8).map((job) => `<article class="settingsJobCard ${torrentSettingsStateClass(job.status)}"><div class="settingsJobCardInner"><strong class="settingsJobTitle">${escapeHtml(job.status || "Running")}: ${escapeHtml(job.targetPath || "Downloads")}</strong><p class="settingsJobDetail">${escapeHtml(job.message || job.error || "Microsoft Defender scan job.")}</p></div></article>`).join("") : `<div class="settingsJobEmpty">No Defender scans have been started yet.</div>`}</div>
      </div></article>`;

  if (tabKey === "quarantine") return `
    <article class="settingsCard settingsWideCard"><div class="settingsCardHead"><span class="settingsCardIcon">${iconHtml("box-archive")}</span><div><h4>Quarantine history</h4><p>Restore a trusted item or permanently delete it from the configured quarantine folder.</p></div></div>
      <div class="settingsToolActions"><button class="settingsToolBtn primary" data-torrent-quarantine-open type="button">${iconHtml("folder-open")}<span>Open quarantine folder</span></button><button class="settingsToolBtn" data-torrent-security-refresh type="button">${iconHtml("rotate")}<span>Refresh</span></button></div>
      <div class="settingsJobList">${quarantine.length ? quarantine.slice(0, 30).map((item) => `<article class="settingsJobCard ${torrentSettingsStateClass(item.status)}"><div class="settingsJobCardInner"><strong class="settingsJobTitle">${escapeHtml(item.fileName || "Quarantined file")}</strong><p class="settingsJobDetail">${escapeHtml(item.reason || "Moved to BRMedia quarantine.")}</p><p class="settingsJobDetail">${escapeHtml(item.quarantinedPath || "")}</p><div class="settingsToolActions">${item.status === "quarantined" ? `<button class="settingsToolBtn" data-torrent-quarantine-restore="${escapeHtml(item.id)}" type="button">${iconHtml("rotate-left")}<span>Restore</span></button>` : ""}${item.status !== "deleted" ? `<button class="settingsToolBtn danger" data-torrent-quarantine-delete="${escapeHtml(item.id)}" type="button">${iconHtml("trash")}<span>Delete permanently</span></button>` : ""}</div></div></article>`).join("") : `<div class="settingsJobEmpty">Nothing has been moved into quarantine yet.</div>`}</div></article>`;

  return `<article class="settingsCard settingsWideCard"><div class="settingsCardHead"><span class="settingsCardIcon">${iconHtml("clock-rotate-left")}</span><div><h4>Security scan history</h4><p>BRMedia quick checks and optional Microsoft Defender scans remain clearly labelled.</p></div></div><div class="settingsToolActions"><button class="settingsToolBtn" data-torrent-security-refresh type="button">${iconHtml("rotate")}<span>Refresh history</span></button></div><div class="settingsJobList">${scans.length ? scans.slice(0, 40).map((item) => `<article class="settingsJobCard ${torrentSettingsStateClass(item.status)}"><div class="settingsJobCardInner"><strong class="settingsJobTitle">${escapeHtml(item.scanner === "microsoft-defender" ? "Microsoft Defender" : "BRMedia quick check")}</strong><p class="settingsJobDetail">${escapeHtml(item.message || "Scan complete.")}</p><p class="settingsJobDetail">${escapeHtml(formatSettingsDate(item.completedAt || item.createdAt))}</p></div></article>`).join("") : `<div class="settingsJobEmpty">No torrent scans have been recorded yet.</div>`}</div></article>`;
}

async function runTorrentSettingsAction(url, body = {}, message = "Torrent security action complete.") {
  try {
    showSettingsSaveNotice("Working on the BRMedia server PC…");
    const data = await torrentSettingsRequestJson(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    showSettingsSaveNotice(message);
    torrentSecurityLoaded = false;
    await ensureTorrentSecurityLoaded(true);
    renderSettingsTab("torrents", activeChildSettingsTab);
    if (data?.job?.id) pollTorrentDefenderJob(data.job.id);
  } catch (err) {
    showSettingsSaveNotice(`Torrent security action failed: ${err?.message || err}`);
  }
}

function pollTorrentDefenderJob(id = "") {
  window.clearTimeout(torrentDefenderPollTimer);
  if (!id) return;
  torrentDefenderPollTimer = window.setTimeout(async () => {
    try {
      const data = await torrentSettingsRequestJson(`/torrent/security/defender/jobs/${encodeURIComponent(id)}`, { cache: "no-store" });
      torrentSecurityLoaded = false;
      await ensureTorrentSecurityLoaded(true);
      if (activeSettingsModule === "torrents" && TORRENT_SECURITY_LIVE_TABS.has(activeChildSettingsTab)) renderSettingsTab("torrents", activeChildSettingsTab);
      if (["queued", "running"].includes(data?.job?.status)) pollTorrentDefenderJob(id);
    } catch {}
  }, 1500);
}

function bindTorrentSettingsLiveEvents() {
  settingsCards.querySelectorAll("[data-torrent-security-refresh]").forEach((button) => button.addEventListener("click", async () => { torrentSecurityLoaded = false; await ensureTorrentSecurityLoaded(true); renderSettingsTab("torrents", activeChildSettingsTab); }));
  settingsCards.querySelectorAll("[data-torrent-defender-scan]").forEach((button) => button.addEventListener("click", () => runTorrentSettingsAction("/torrent/security/defender/scan", { targetPath: button.dataset.torrentDefenderScan }, "Defender scan started.")));
  settingsCards.querySelectorAll("[data-torrent-quarantine-open]").forEach((button) => button.addEventListener("click", () => runTorrentSettingsAction("/torrent/quarantine/open-folder", {}, "Quarantine folder opened on the server PC.")));
  settingsCards.querySelectorAll("[data-torrent-quarantine-restore]").forEach((button) => button.addEventListener("click", () => runTorrentSettingsAction(`/torrent/quarantine/${encodeURIComponent(button.dataset.torrentQuarantineRestore)}/restore`, {}, "Quarantine item restored.")));
  settingsCards.querySelectorAll("[data-torrent-quarantine-delete]").forEach((button) => button.addEventListener("click", () => { if (window.confirm("Permanently delete this quarantined item?")) runTorrentSettingsAction(`/torrent/quarantine/${encodeURIComponent(button.dataset.torrentQuarantineDelete)}/delete`, {}, "Quarantine item permanently deleted."); }));
}


const SETTINGS_CONTROL_CENTRE_ITEMS = [
  {
    icon: "music",
    title: "Player settings",
    desc: "Playback, uploads, waveforms, tracklists, devices, sharing and Player backup controls.",
    status: "Wired",
    tone: "is-live",
    module: "player",
    tab: "overview",
  },
  {
    icon: "film",
    title: "Video Player settings",
    desc: "Video library editor, metadata tools, posters, subtitles and browser-safe MP4 workflow.",
    status: "Editor live",
    tone: "is-live",
    module: "video",
    tab: "overview",
  },
  {
    icon: "magnet",
    title: "Torrents settings",
    desc: "qBittorrent engine, files, speed limits, scheduler, cache, safety and protocol controls.",
    status: "Wired",
    tone: "is-live",
    module: "torrents",
    tab: "overview",
  },
  {
    icon: "mobile",
    title: "Devices",
    desc: "Friendly device name, receive-transfer permissions, confirmation and handoff memory.",
    status: "Foundation",
    tone: "is-started",
    module: "player",
    tab: "devices",
  },
  {
    icon: "floppy-disk",
    title: "Backup",
    desc: "Export and restore Player data now; expand into full BRMedia server backup during the cleanup phase.",
    status: "Foundation",
    tone: "is-started",
    module: "player",
    tab: "backup",
  },
  {
    icon: "folder-plus",
    title: "Upload Media Hub",
    desc: "The single main hub for device uploads, cloud media, supporting files, lawful direct URLs, authorised torrents and View Files.",
    status: "Wired",
    tone: "is-live",
    module: "cloud",
    tab: "add-files",
  },
  {
    icon: "google-drive",
    title: "Google Drive",
    desc: "Link multiple Google Drive accounts, browse files and import selected media.",
    status: "Wired",
    tone: "is-live",
    module: "cloud",
    tab: "google",
  },
  {
    icon: "dropbox",
    title: "Dropbox",
    desc: "Link Dropbox accounts, browse folders and import selected media.",
    status: "Wired",
    tone: "is-live",
    module: "cloud",
    tab: "dropbox",
  },
  {
    icon: "folder-open",
    title: "View Files",
    desc: "Central file manager with quick edit, Tagger, Converter and Mastering handoff actions.",
    status: "Wired",
    tone: "is-live",
    module: "cloud",
    tab: "files",
  },
  {
    icon: "hard-drive",
    title: "Library Sources",
    desc: "Online/offline watched folders, indexed totals and links into the deep Server Settings drive manager.",
    status: "Wired",
    tone: "is-live",
    module: "server",
    tab: "drives",
  },
];

function settingsControlCentreItemHtml(item = {}) {
  return `
    <article class="settingsAuditCard ${escapeHtml(item.tone || "")}">
      <span class="settingsAuditIcon">
        ${iconHtml(item.icon || "circle")}
      </span>

      <div class="settingsAuditText">
        <strong>${escapeHtml(item.title || "Settings area")}</strong>
        <p>${escapeHtml(item.desc || "")}</p>
      </div>

      <b>${escapeHtml(item.status || "Ready")}</b>

      <button
        class="settingsToolBtn"
        data-settings-centre-jump="${escapeHtml(`${item.module || "player"}:${item.tab || "overview"}`)}"
        type="button"
      >
        ${iconHtml("arrow-right")}
        <span>Open</span>
      </button>
    </article>
  `;
}

function bindSettingsControlCentreEvents() {
  settingsCards
    ?.querySelectorAll("[data-settings-centre-jump]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const [moduleKey, tabKey = "overview"] =
          String(button.dataset.settingsCentreJump || "player:overview")
            .split(":");

        settingsExpandedModule = moduleKey || "player";

        renderSettingsTab(
          moduleKey || "player",
          tabKey || "overview"
        );
      });
    });
}

function renderSettingsControlCentre() {
  playerSettingsSubTabs?.classList.add("hidden");

  settingsActiveTitle.textContent =
    "Universal Settings — Wiring Map";

  settingsActiveBadge.textContent =
    "Centre";

  settingsCards.innerHTML = `
    <div class="settingsTabIntro">
      <p>
        Persistent configuration belongs here or in Server Settings.
        Use this wiring map to jump into the central page for each BRMedia area.
      </p>
    </div>

    <article class="settingsCard settingsWideCard">
      <div class="settingsCardHead">
        <span class="settingsCardIcon">
          ${iconHtml("table-list")}
        </span>

        <div>
          <h4>Universal Settings cleanup</h4>

          <p>
            Player, Video, Torrents, Devices, Backup, uploads/imports,
            Google Drive, Dropbox, View Files and Library Sources are now
            surfaced from one control centre.
          </p>
        </div>
      </div>

      <p class="settingsAuditNote">
        ${iconHtml("circle-info")}
        Module front pages should keep runtime actions only.
        Permanent options stay in Universal Settings or Server Settings.
      </p>
    </article>

    <section class="settingsAuditGrid">
      ${SETTINGS_CONTROL_CENTRE_ITEMS
        .map(settingsControlCentreItemHtml)
        .join("")}
    </section>
  `;

  bindSettingsControlCentreEvents();
  renderSettingsSidebarTree();
  hydrateBrIcons(settingsCards);
}

function renderSettingsTab(tabKey = "player", subtab = "") {
  activeSettingsModule = tabKey || "player";
if (subtab) {
  if (activeSettingsModule === "player") activePlayerSettingsTab = subtab;
  else activeChildSettingsTab = subtab;
}
  const module = SETTINGS_MODULES[activeSettingsModule] || SETTINGS_MODULES.player;
  if (!settingsCards) return;

  document.querySelectorAll("[data-settings-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.settingsTab === activeSettingsModule);
  });

  if (activeSettingsModule === "centre") {
    renderSettingsControlCentre();
    return;
  }

if (activeSettingsModule === "player") {
  if (!PLAYER_SETTINGS_TABS.some((tab) => tab.key === activePlayerSettingsTab)) {
    activePlayerSettingsTab = "overview";
  }

  void ensureSettingsLibraryLoaded().then(() => {
    if (activeSettingsModule === "player" && activePlayerSettingsTab === "waveforms") {
      renderPlayerSettingsTab();
    }
  });

  renderPlayerSettingsTab();
  renderSettingsSidebarTree();
  return;
}

  if (activeSettingsModule === "cloud") {
    void renderCloudSettingsTab().catch(renderCloudSettingsFailure);
    renderSettingsSidebarTree();
    return;
  }
	
  if (activeSettingsModule === "server" && activeChildSettingsTab === "drives") {
    void renderSettingsDriveSourcesOverview();
    return;
  }
	
  if (activeSettingsModule === "video") {
    void renderVideoSettingsTab();
    renderSettingsSidebarTree();
    return;
  }

  if (activeSettingsModule === "torrents" && !torrentSettingsLoaded) {
    settingsActiveTitle.textContent = "Torrents Settings";
    settingsActiveBadge.textContent = "Torrent";
    settingsCards.innerHTML = `<article class="settingsCard"><div class="settingsCardHead"><span class="settingsCardIcon">${iconHtml("spinner")}</span><div><h4>Loading torrent settings</h4><p>Reading qBittorrent/BRMedia torrent settings from the server.</p></div></div></article>`;
    renderSettingsSidebarTree();
    void ensureTorrentSettingsLoaded().then(() => renderSettingsTab("torrents", activeChildSettingsTab));
    return;
  }
  playerSettingsSubTabs?.classList.add("hidden");
  const activeTree = SETTINGS_NAV_TREE.find((item) => item.key === activeSettingsModule);
  const activeChild = activeTree?.children?.find((child) => child.key === activeChildSettingsTab);
  const cards = (module.cards || []).filter((card) => !card.tab || card.tab === activeChildSettingsTab);
  const visibleCards = cards.length ? cards : (module.cards || []);

  settingsActiveTitle.textContent = activeChild ? `${module.title} — ${activeChild.title}` : module.title;
  settingsActiveBadge.textContent = module.badge;

  settingsCards.innerHTML = `
    <div class="settingsTabIntro">
      <p>${escapeHtml(getSettingsSubtabDescription(activeSettingsModule, activeChild || {}))}</p>
    </div>

    ${visibleCards.map((card) => `
      <article class="settingsCard ${card.controls ? "settingsLiveCard" : ""}">
        <div class="settingsCardHead">
          <span class="settingsCardIcon">${iconHtml(card.icon)}</span>
          <div>
            <h4>${escapeHtml(card.title)}</h4>
            <p>${escapeHtml(card.desc)}</p>
          </div>
        </div>

        ${card.controls ? `<div class="settingsLiveControls">${card.controls.map((control) => moduleSettingControlHtml(control, activeSettingsModule)).join("")}</div>` : ""}

        ${card.options ? `
          <div class="settingsOptions">
            ${card.options.map(([title, desc, value], index) => `
              <div class="settingsOption">
                <div>
                  <strong>${escapeHtml(title)}</strong>
                  <span>${escapeHtml(desc)}</span>
                </div>
                <span class="settingsPill ${index % 2 ? "orange" : ""}">${escapeHtml(value)}</span>
              </div>
            `).join("")}
          </div>
        ` : ""}
      </article>
    `).join("")}

    ${activeSettingsModule === "torrents" ? torrentSettingsLiveHtml(activeChildSettingsTab) : ""}
    ${activeSettingsModule === "dj" && ["collection", "sources"].includes(activeChildSettingsTab) ? renderDjSourceManagerHtml() : ""}
  `;

  settingsCards.querySelectorAll("[data-module-setting]").forEach((field) => {
    field.addEventListener("change", () => updateModuleSettingFromField(field));
  });

  bindTorrentSettingsLiveEvents();
	
  if (activeSettingsModule === "dj" && ["collection", "sources"].includes(activeChildSettingsTab)) {
    bindDjSourceManagerEvents();
  }

  if (activeSettingsModule === "torrents" && TORRENT_SECURITY_LIVE_TABS.has(activeChildSettingsTab) && !torrentSecurityLoaded && !torrentSecurityLoading) {
    void ensureTorrentSecurityLoaded().then(() => renderSettingsTab("torrents", activeChildSettingsTab));
  }

  renderSettingsSidebarTree();
	hydrateBrIcons(settingsCards);
}

function syncTopMenuDockState() {
  const topbar = document.querySelector(".topbar");
  if (!btnModuleMenu || !topbar) return;

  const rect = topbar.getBoundingClientRect();
  const shouldFloat = rect.top < 18;

  btnModuleMenu.classList.toggle("isFloating", shouldFloat && !document.body.classList.contains("sidebarOpen"));
  btnModuleSidebarCloseFloating?.classList.toggle("hidden", !document.body.classList.contains("sidebarOpen"));
}

function openModuleSidebar() {
  moduleSidebarScrollLock.y = window.scrollY || window.pageYOffset || 0;
  document.documentElement.classList.add("sidebarLocked");
  document.body.classList.add("sidebarOpen");
  document.body.style.position = "fixed";
  document.body.style.top = `-${moduleSidebarScrollLock.y}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
  moduleSidebarBackdrop?.classList.remove("hidden");
  moduleSidebar?.classList.remove("hidden");
  btnModuleSidebarCloseFloating?.classList.remove("hidden");
  syncTopMenuDockState();
  hydrateBrIcons(moduleSidebar);
}

function closeModuleSidebar() {
  const restoreY = Math.abs(parseInt(document.body.style.top || "0", 10)) || moduleSidebarScrollLock.y || 0;
  moduleSidebarBackdrop?.classList.add("hidden");
  moduleSidebar?.classList.add("hidden");
  btnModuleSidebarCloseFloating?.classList.add("hidden");
  document.documentElement.classList.remove("sidebarLocked");
  document.body.classList.remove("sidebarOpen");
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.width = "";
  window.scrollTo(0, restoreY);
  syncTopMenuDockState();
}

function toggleModuleSidebar() {
  if (!moduleSidebar) return;
  if (moduleSidebar.classList.contains("hidden")) openModuleSidebar();
  else closeModuleSidebar();
}

function goToRoute(route) {
  if (!route) return;
  closeModuleSidebar();
  window.location.href = route;
}

btnModuleMenu?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  toggleModuleSidebar();
});

btnModuleSidebarCloseFloating?.addEventListener("click", closeModuleSidebar);
moduleSidebarBackdrop?.addEventListener("click", closeModuleSidebar);

function closeSettingsToPreviousPage() {
  closeModuleSidebar();

  try {
    const ref = document.referrer ? new URL(document.referrer) : null;
    if (ref && ref.origin === window.location.origin && ref.pathname !== "/settings") {
      window.location.href = `${ref.pathname}${ref.search}${ref.hash}` || "/player";
      return;
    }
  } catch {}

  if (window.history.length > 1) {
    window.history.back();
    return;
  }

  window.location.href = "/player";
}

moduleSearchBtn?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  closeSettingsToPreviousPage();
});

document.querySelectorAll("[data-route]").forEach((button) => {
  button.addEventListener("click", () => goToRoute(button.dataset.route || "/"));
});

document.querySelectorAll("[data-settings-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    renderSettingsTab(button.dataset.settingsTab || "player");
    closeModuleSidebar();
  });
});

window.addEventListener("scroll", syncTopMenuDockState, { passive: true });
window.addEventListener("resize", syncTopMenuDockState);

function getInitialSettingsTarget() {
  const params = new URLSearchParams(window.location.search || "");
  const hash = decodeURIComponent(String(window.location.hash || "").replace(/^#/, ""));

  settingsAutoOpenUploadPicker = params.get("pick") === "1" || params.get("picker") === "1";
  settingsFileFilter = ["all", "local", "google", "dropbox"].includes(params.get("filter")) ? params.get("filter") : settingsFileFilter;
  settingsViewFilesKind = ["audio", "video", "support"].includes(params.get("kind")) ? params.get("kind") : settingsViewFilesKind;
  settingsViewFilesSourceRoot = String(params.get("sourceRoot") || "").trim();

  settingsRequestedFileId =
    String(params.get("trackId") || params.get("id") || "").trim();

  settingsRequestedVideoFileId =
    String(params.get("videoId") || "").trim();

  settingsRequestedSupportFileId =
    String(params.get("supportId") || "").trim();

  settingsRequestedQuickEdit =
    params.get("quickEdit") === "1" ||
    params.get("edit") === "1";

  if (settingsRequestedFileId) {
    settingsSelectedFileId = settingsRequestedFileId;
  }

  if (settingsRequestedVideoFileId) {
    settingsViewFilesKind = "video";
    settingsViewFilesSelectedId = settingsRequestedVideoFileId;
  }

  if (settingsRequestedSupportFileId) {
    settingsViewFilesKind = "support";
    settingsViewFilesSelectedId = settingsRequestedSupportFileId;
  }

  let moduleKey = params.get("module") || params.get("section") || "";
  let tabKey = params.get("tab") || params.get("page") || "";

  if (hash && hash.includes(":")) {
    const [hashModule, hashTab] = hash.split(":");
    moduleKey = moduleKey || hashModule;
    tabKey = tabKey || hashTab;
  } else if (hash) {
    tabKey = tabKey || hash;
  }

  const legacyTabMap = {
    centre: ["centre", "overview"],
    overview: ["centre", "overview"],
    "google-drive": ["cloud", "google"],
    googleDrive: ["cloud", "google"],
    google: ["cloud", "google"],
    dropbox: ["cloud", "dropbox"],
    sync: ["cloud", "sync"],
    cloudSync: ["cloud", "sync"],
    import: ["cloud", "import"],
    imports: ["cloud", "import"],
    links: ["cloud", "links"],
    sourceLinks: ["cloud", "links"],
    files: ["cloud", "files"],
    viewFiles: ["cloud", "files"],
    library: ["cloud", "add-files"],
    addFiles: ["cloud", "add-files"],
    dataImport: ["cloud", "data-import"],
    restore: ["cloud", "data-import"],
    recovery: ["cloud", "data-import"],
    uploads: ["player", "uploads"],
    waveforms: ["player", "waveforms"],
    waveform: ["player", "waveforms"],
    playback: ["player", "playback"],
    devices: ["player", "devices"],
    backup: ["player", "backup"],
    sharing: ["player", "sharing"],
    tracklists: ["player", "tracklists"],
  };

  if (!moduleKey && legacyTabMap[tabKey]) {
    [moduleKey, tabKey] = legacyTabMap[tabKey];
  }

  if (moduleKey === "audio") moduleKey = "player";
  if (moduleKey === "torrent" || moduleKey === "qbittorrent") moduleKey = "torrents";
  if (moduleKey === "imports" || moduleKey === "files") moduleKey = "cloud";
  if (tabKey === "library" && moduleKey !== "dj") tabKey = "add-files";

  if ((moduleKey || "") === "video") {
    const videoId = params.get("videoId") || params.get("id") || "";
    if (videoId) settingsVideoSelectedId = videoId;
  }

  return {
    moduleKey: moduleKey || "centre",
    tabKey: tabKey || "overview",
  };
}

window.addEventListener("DOMContentLoaded", () => {
  const initialTarget = getInitialSettingsTarget();
  settingsExpandedModule = initialTarget.moduleKey || "centre";

  closeModuleSidebar();
  syncTopMenuDockState();
  renderSettingsSidebarTree();
  renderSettingsTab(initialTarget.moduleKey, initialTarget.tabKey);
  startBrIconHydrator();
});