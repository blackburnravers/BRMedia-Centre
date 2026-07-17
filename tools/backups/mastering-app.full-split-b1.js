const moduleSearchBtn = document.querySelector(".moduleSearchBtn");
const btnModuleMenu = document.getElementById("btnModuleMenu");
const btnModuleSidebarClose = document.getElementById("btnModuleSidebarClose");
const moduleSidebar = document.getElementById("moduleSidebar");
const moduleSidebarBackdrop = document.getElementById("moduleSidebarBackdrop");
const moduleTopbar = document.querySelector(".moduleTopbar");

const moduleEyebrow = document.getElementById("moduleEyebrow");
const moduleTitle = document.getElementById("moduleTitle");
const moduleSubtitle = document.getElementById("moduleSubtitle");
const moduleComingSoonBody = document.getElementById("moduleComingSoonBody");
const moduleStatusTitle = document.getElementById("moduleStatusTitle");
const moduleStatusIcon = document.getElementById("moduleStatusIcon");
const moduleTrackPanel = document.getElementById("moduleTrackPanel");
const moduleTrackTitle = document.getElementById("moduleTrackTitle");
const moduleTrackMeta = document.getElementById("moduleTrackMeta");
const moduleTrackOpenPlayer = document.getElementById("moduleTrackOpenPlayer");
const moduleTrackClear = document.getElementById("moduleTrackClear");
const moduleFooterCopy = document.getElementById("moduleFooterCopy");

const converterPanel = document.getElementById("converterPanel");
const converterHeroTitle = document.getElementById("converterHeroTitle");
const converterHeroMeta = document.getElementById("converterHeroMeta");
const converterHeroPills = document.getElementById("converterHeroPills");
const converterDeviceFileInput = document.getElementById("converterDeviceFileInput");
const btnConverterPickDevice = document.getElementById("btnConverterPickDevice");
const btnConverterUseSelected = document.getElementById("btnConverterUseSelected");
const btnConverterStart = document.getElementById("btnConverterStart");
const btnConverterReset = document.getElementById("btnConverterReset");
const btnConverterDownload = document.getElementById("btnConverterDownload");
const btnConverterCancel = document.getElementById("btnConverterCancel");
const converterOutputFormat = document.getElementById("converterOutputFormat");
const converterOutputName = document.getElementById("converterOutputName");
const converterAudioCodec = document.getElementById("converterAudioCodec");
const converterVideoCodec = document.getElementById("converterVideoCodec");
const converterAudioBitrate = document.getElementById("converterAudioBitrate");
const converterSampleRate = document.getElementById("converterSampleRate");
const converterChannels = document.getElementById("converterChannels");
const converterVideoBitrate = document.getElementById("converterVideoBitrate");
const converterCrf = document.getElementById("converterCrf");
const converterPreset = document.getElementById("converterPreset");
const converterFrameRate = document.getElementById("converterFrameRate");
const converterResolution = document.getElementById("converterResolution");
const converterTrimStart = document.getElementById("converterTrimStart");
const converterTrimDuration = document.getElementById("converterTrimDuration");
const converterVolume = document.getElementById("converterVolume");
const converterNormalize = document.getElementById("converterNormalize");
const converterFastStart = document.getElementById("converterFastStart");
const converterRemoveAudio = document.getElementById("converterRemoveAudio");
const converterAddToLibrary = document.getElementById("converterAddToLibrary");
const converterSummaryText = document.getElementById("converterSummaryText");
const converterCommandPreview = document.getElementById("converterCommandPreview");
const converterReadinessPanel = document.getElementById("converterReadinessPanel");
const converterHistoryPanel = document.getElementById("converterHistoryPanel");
const converterProgress = document.getElementById("converterProgress");
const converterProgressStatus = document.getElementById("converterProgressStatus");
const converterProgressFill = document.getElementById("converterProgressFill");
const converterResult = document.getElementById("converterResult");

const masteringPanel = document.getElementById("masteringPanel");
const masteringHeroTitle = document.getElementById("masteringHeroTitle");
const masteringHeroMeta = document.getElementById("masteringHeroMeta");
const masteringHeroPills = document.getElementById("masteringHeroPills");
const masteringDeviceFileInput = document.getElementById("masteringDeviceFileInput");
const btnMasteringPickDevice = document.getElementById("btnMasteringPickDevice");
const btnMasteringChooseLibrary = document.getElementById("btnMasteringChooseLibrary");
const masteringOutputFormat = document.getElementById("masteringOutputFormat");
const masteringOutputName = document.getElementById("masteringOutputName");
const masteringTargetLufs = document.getElementById("masteringTargetLufs");
const masteringTruePeak = document.getElementById("masteringTruePeak");
const masteringCompression = document.getElementById("masteringCompression");
const masteringStereoWidth = document.getElementById("masteringStereoWidth");
const masteringBass = document.getElementById("masteringBass");
const masteringWarmth = document.getElementById("masteringWarmth");
const masteringBrightness = document.getElementById("masteringBrightness");
const masteringLimiterDrive = document.getElementById("masteringLimiterDrive");
const masteringIntensity = document.getElementById("masteringIntensity");
const masteringLowCut = document.getElementById("masteringLowCut");
const masteringDeHarsh = document.getElementById("masteringDeHarsh");
const masteringAir = document.getElementById("masteringAir");
const masteringAddToLibrary = document.getElementById("masteringAddToLibrary");
const masteringPreserveMetadata = document.getElementById("masteringPreserveMetadata");
const masteringSummaryText = document.getElementById("masteringSummaryText");
const masteringChainPreview = document.getElementById("masteringChainPreview");
const masteringAnalysisPanel = document.getElementById("masteringAnalysisPanel");
const masteringAnalysisSummary = document.getElementById("masteringAnalysisSummary");
const masteringAnalysisBadge = document.getElementById("masteringAnalysisBadge");
const masteringAnalysisCards = document.getElementById("masteringAnalysisCards");
const masteringReadinessPanel = document.getElementById("masteringReadinessPanel");
const btnMasteringAnalyze = document.getElementById("btnMasteringAnalyze");
const btnMasteringStart = document.getElementById("btnMasteringStart");
const btnMasteringDownload = document.getElementById("btnMasteringDownload");
const btnMasteringCancel = document.getElementById("btnMasteringCancel");
const btnMasteringReset = document.getElementById("btnMasteringReset");
const masteringProgress = document.getElementById("masteringProgress");
const masteringProgressStatus = document.getElementById("masteringProgressStatus");
const masteringProgressFill = document.getElementById("masteringProgressFill");
const masteringResult = document.getElementById("masteringResult");
const masteringTabs = Array.from(document.querySelectorAll("[data-mastering-tab]"));
const masteringTabPanels = Array.from(document.querySelectorAll("[data-mastering-tab-panel]"));

const moduleLibraryPicker = document.getElementById("moduleLibraryPicker");
const moduleLibraryPickerTitle = document.getElementById("moduleLibraryPickerTitle");
const moduleLibraryPickerSub = document.getElementById("moduleLibraryPickerSub");
const moduleLibraryPickerSearch = document.getElementById("moduleLibraryPickerSearch");
const moduleLibraryPickerList = document.getElementById("moduleLibraryPickerList");
const btnModuleLibraryPickerClose = document.getElementById("btnModuleLibraryPickerClose");
const moduleMiniPlayer = document.getElementById("moduleMiniPlayer");
const moduleMiniAudio = document.getElementById("moduleMiniAudio");
const moduleMiniArt = document.getElementById("moduleMiniArt");
const moduleMiniArtLink = document.getElementById("moduleMiniArtLink");
const moduleMiniTitle = document.getElementById("moduleMiniTitle");
const moduleMiniSub = document.getElementById("moduleMiniSub");
const moduleMiniProgressFill = document.getElementById("moduleMiniProgressFill");
const btnModuleMiniPrev = document.getElementById("btnModuleMiniPrev");
const btnModuleMiniPlay = document.getElementById("btnModuleMiniPlay");
const btnModuleMiniNext = document.getElementById("btnModuleMiniNext");

const videoPanel = document.getElementById("videoPanel");
const videoSidebarNav = document.getElementById("videoSidebarNav");
const btnVideoSidebarHome = document.getElementById("btnVideoSidebarHome");
const videoSidebarGenreList = document.getElementById("videoSidebarGenreList");
const btnVideoRefresh = document.getElementById("btnVideoRefresh");
const videoSearchInput = document.getElementById("videoSearchInput");
const videoSortSelect = document.getElementById("videoSortSelect");
const btnVideoMatchMissing = document.getElementById("btnVideoMatchMissing");
const videoStatus = document.getElementById("videoStatus");
const videoCountText = document.getElementById("videoCountText");
const videoStatTotal = document.getElementById("videoStatTotal");
const videoStatRated = document.getElementById("videoStatRated");
const videoStatContinue = document.getElementById("videoStatContinue");
const videoStatSubtitle = document.getElementById("videoStatSubtitle");
const videoSpotlightSection = document.getElementById("videoSpotlightSection");
const videoSpotlightBackdrop = document.getElementById("videoSpotlightBackdrop");
const videoSpotlightKicker = document.getElementById("videoSpotlightKicker");
const videoSpotlightTitle = document.getElementById("videoSpotlightTitle");
const videoSpotlightMeta = document.getElementById("videoSpotlightMeta");
const videoSpotlightBadges = document.getElementById("videoSpotlightBadges");
const btnVideoOpenSpotlight = document.getElementById("btnVideoOpenSpotlight");
const videoModeTabs = Array.from(document.querySelectorAll("[data-video-tab]"));
const videoModePanels = Array.from(document.querySelectorAll("[data-video-tab-panel]"));
const videoPosterWall = document.getElementById("videoPosterWall");
const videoFavouritesWall = document.getElementById("videoFavouritesWall");
const videoFavouritesCountText = document.getElementById("videoFavouritesCountText");
const videoBookmarksList = document.getElementById("videoBookmarksList");
const videoBookmarksCountText = document.getElementById("videoBookmarksCountText");
const videoContinueSection = document.getElementById("videoContinueSection");
const videoContinueRail = document.getElementById("videoContinueRail");
const videoDetailView = document.getElementById("videoDetailView");
const btnVideoBackToWall = document.getElementById("btnVideoBackToWall");
const videoDetailPoster = document.getElementById("videoDetailPoster");
const videoDetailKicker = document.getElementById("videoDetailKicker");
const videoDetailTitle = document.getElementById("videoDetailTitle");
const videoDetailMeta = document.getElementById("videoDetailMeta");
const videoDetailOverview = document.getElementById("videoDetailOverview");
const videoDetailProgress = document.getElementById("videoDetailProgress");
const videoDetailBackdrop = document.getElementById("videoDetailBackdrop");
const videoDetailBadges = document.getElementById("videoDetailBadges");
const videoDetailCredits = document.getElementById("videoDetailCredits");
const btnVideoMatchSelected = document.getElementById("btnVideoMatchSelected");
const btnVideoToggleFavourite = document.getElementById("btnVideoToggleFavourite");
const btnVideoAddBookmark = document.getElementById("btnVideoAddBookmark");
const videoRatingStars = document.getElementById("videoRatingStars");
const brVideoElement = document.getElementById("brVideoElement");
const btnVideoResume = document.getElementById("btnVideoResume");
const btnVideoRestart = document.getElementById("btnVideoRestart");
const btnVideoFullscreen = document.getElementById("btnVideoFullscreen");
const videoAudioSelect = document.getElementById("videoAudioSelect");
const videoSubtitleSelect = document.getElementById("videoSubtitleSelect");
const videoTimerSelect = document.getElementById("videoTimerSelect");
const btnVideoTimerApply = document.getElementById("btnVideoTimerApply");
const videoTimerStatus = document.getElementById("videoTimerStatus");
const btnVideoCast = document.getElementById("btnVideoCast");
const btnVideoPiP = document.getElementById("btnVideoPiP");
const videoCastStatus = document.getElementById("videoCastStatus");

const taggerPanel = document.getElementById("taggerPanel");
const taggerPreviewList = document.getElementById("taggerPreviewList");
const taggerStatus = document.getElementById("taggerStatus");
const taggerPlacementChips = document.getElementById("taggerPlacementChips");
const taggerPlacementRule = document.getElementById("taggerPlacementRule");
const btnTaggerSave = document.getElementById("btnTaggerSave");
const btnTaggerReset = document.getElementById("btnTaggerReset");
const btnTaggerWriteCopy = document.getElementById("btnTaggerWriteCopy");
const btnTaggerWriteDownload = document.getElementById("btnTaggerWriteDownload");
const btnTaggerWriteResult = document.getElementById("taggerWriteResult");
const btnTaggerExportSidecar = document.getElementById("btnTaggerExportSidecar");
const btnTaggerPickDevice = document.getElementById("btnTaggerPickDevice");
const btnTaggerChooseLibrary = document.getElementById("btnTaggerChooseLibrary");
const taggerDeviceFileInput = document.getElementById("taggerDeviceFileInput");
const taggerSourceText = document.getElementById("taggerSourceText");
const taggerArtworkPreview = document.getElementById("taggerArtworkPreview");
const taggerArtworkInput = document.getElementById("taggerArtworkInput");
const btnTaggerPickArtwork = document.getElementById("btnTaggerPickArtwork");
const btnTaggerClearArtwork = document.getElementById("btnTaggerClearArtwork");
const taggerHeroArtwork = document.getElementById("taggerHeroArtwork");
const taggerHeroTitle = document.getElementById("taggerHeroTitle");
const taggerHeroMeta = document.getElementById("taggerHeroMeta");
const taggerHeroPills = document.getElementById("taggerHeroPills");
const taggerAudioProperties = document.getElementById("taggerAudioProperties");
const taggerAdvancedFields = document.getElementById("taggerAdvancedFields");
const taggerRawMetadata = document.getElementById("taggerRawMetadata");

const BRMEDIA_CUSTOM_TAGS_KEY = "brmedia_custom_tags_v1";
let selectedTrackForModule = null;
let taggerLoadedFileKey = "";
let taggerDeviceFile = null;
let taggerArtworkDataUrl = "";
let brMediaServerCustomTagStore = {};
const CONVERTER_HISTORY_KEY = "brmedia_converter_history_v1";
const converterState = {
  kind: "audio",
  source: null,
  pendingFile: null,
  currentJobId: "",
  pollTimer: null,
  isRunning: false,
  activePreset: "",
};
const masteringState = {
  source: null,
  pendingFile: null,
  currentJobId: "",
  pollTimer: null,
  isRunning: false,
  isAnalysing: false,
  activePreset: "streaming-clean",
  activeTab: "source",
  analysis: null,
};
const moduleLibraryPickerState = {
  target: "tagger",
  items: [],
  query: "",
};
const moduleMiniState = {
  items: [],
  queue: [],
  queueIndex: 0,
  track: null,
  stateLoadedAt: 0,
  userTouched: false,
};
const VIDEO_RESUME_KEY = "brmedia_video_resume_v1";
const VIDEO_LIBRARY_CACHE_KEY = "brmedia_video_library_cache_v5";
const VIDEO_PREFS_KEY = "brmedia_video_prefs_v1";
const VIDEO_FAVOURITES_KEY = "brmedia_video_favourites_v1";
const VIDEO_RATINGS_KEY = "brmedia_video_ratings_v1";
const VIDEO_BOOKMARKS_KEY = "brmedia_video_bookmarks_v1";
const VIDEO_TIMER_KEY = "brmedia_video_timer_v1";
const videoState = {
  items: [],
  selected: null,
  query: "",
  sort: "title",
  filter: "all",
  genre: "",
  activeTab: "browse",
  spotlightId: "",
  timerEndAt: Number(readJsonStorage(VIDEO_TIMER_KEY, 0) || 0),
  timerMode: "",
  timerInterval: null,
  resume: readJsonStorage(VIDEO_RESUME_KEY, {}),
  prefs: readJsonStorage(VIDEO_PREFS_KEY, {}),
  favourites: readJsonStorage(VIDEO_FAVOURITES_KEY, []),
  ratings: readJsonStorage(VIDEO_RATINGS_KEY, {}),
  bookmarks: readJsonStorage(VIDEO_BOOKMARKS_KEY, {}),
};
const moduleSidebarScrollLock = {
  y: 0,
  startX: 0,
  startY: 0,
  dragging: false,
  movedAt: 0,
};
let taggerMetadataRequestId = 0;

const BR_ICON_BASE_PATH = "/player/branding/icons/";
const BR_ICON_CLASS_MAP = {
  bars: "list-music",
  "bars-staggered": "list-music",
  xmark: "xmark",

  headphones: "headphones",
  play: "play",
  pause: "pause",

  "arrows-rotate": "arrow-rotate-right",
  "right-left": "right-left",
  "backward-step": "backward-step",
  "forward-step": "forward-step",
  "file-audio": "file-audio",
  "mobile-screen-button": "mobile-screen-button",
  waveform: "waveform",
  "wave-pulse": "wave-pulse",
  download: "download",
  "gauge-high": "gauge-high",
  stars: "stars",
  bolt: "bolt",

  tag: "tag",
  tags: "tags",
  "file-pen": "file-pen",
  "file-music": "file-music",
  image: "image",
  upload: "upload",
  "cloud-arrow-down": "cloud-arrow-down",
  "floppy-disk": "floppy-disk",
  "arrow-rotate-left": "arrow-rotate-left",
  "wand-magic-sparkles": "wand-magic-sparkles",
  album: "album",
  "music-note": "music-note",
  "list-music": "list-music",
  "list-ul": "list-ul",
  "id-card": "id-card",
  "chevron-down": "chevron-down",
  "compact-disc": "compact-disc",
  palette: "palette",

  sliders: "sliders",
  "sliders-up": "sliders-up",

  film: "film",
  video: "video",
  "file-video": "file-video",
  "circle-play": "circle-play",
  "closed-captioning": "closed-captioning",
  subtitles: "subtitles",
  language: "language",
  house: "house",
  heart: "heart",
  bookmark: "bookmark",
  timer: "clock",
  clock: "clock",
  expand: "expand",
  "backward-fast": "backward-fast",
  star: "star",
  tv: "tv",
  "share-nodes": "share-nodes",

  "chart-column": "chart-column",
  server: "server",
  gear: "gear-complex",
  "screwdriver-wrench": "gear-complex",

  folder: "folder",
  "folder-open": "folder-open",
  "folder-plus": "folder-plus",
  "magnifying-glass": "magnifying-glass",

  "circle-check": "circle-check",
  "circle-info": "circle-info",
  "circle-question": "circle-question",
  "triangle-exclamation": "triangle-exclamation",
};

const brIconSvgCache = new Map();
let brIconObserver = null;
let brIconHydrationQueue = [];
let brIconHydrationTimer = null;

function getBrIconNameFromElement(el) {
  if (!el || !el.classList) return "";

  const ignoredFaClasses = [
    "fa-solid",
    "fa-regular",
    "fa-brands",
    "fa-duotone",
    "fa-light",
    "fa-thin",
    "fa-sharp",
    "fa-spin",
    "fa-pulse",
    "fa-fw",
    "fa-lg",
    "fa-xl",
    "fa-2x",
  ];

  const iconClass = Array.from(el.classList).find((className) =>
    className.startsWith("fa-") && !ignoredFaClasses.includes(className)
  );

  return iconClass ? iconClass.replace(/^fa-/, "") : "";
}

async function loadBrIconSvg(svgName) {
  if (brIconSvgCache.has(svgName)) return brIconSvgCache.get(svgName);

  const promise = fetch(`${BR_ICON_BASE_PATH}${svgName}.svg`, { cache: "force-cache" })
    .then((res) => {
      if (!res.ok) throw new Error(`Icon not found: ${svgName}`);
      return res.text();
    })
    .then((text) => {
      const template = document.createElement("template");
      template.innerHTML = text.trim();
      const svg = template.content.querySelector("svg");
      if (!svg) throw new Error(`Invalid icon SVG: ${svgName}`);
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("focusable", "false");
      svg.classList.add("brSvgIconSvg");
      return svg.outerHTML;
    });

  brIconSvgCache.set(svgName, promise);
  return promise;
}

function applyBrIconStateClasses(el) {
  el.classList.add("brSvgIconHost");
  el.style.setProperty("--br-icon-primary", "#ffffff");
  el.style.setProperty("--br-icon-secondary", "#F2A007");
  el.style.setProperty("--br-icon-primary-opacity", "1");
  el.style.setProperty("--br-icon-secondary-opacity", "1");
}

async function hydrateBrIcon(el) {
  if (!el || el.nodeType !== 1 || !el.matches?.("i[class*='fa-']")) return;

  const iconName = getBrIconNameFromElement(el);
  const svgName = BR_ICON_CLASS_MAP[iconName] || "";
  if (!svgName) return;

  applyBrIconStateClasses(el);

  if (el.dataset.brIconName === iconName && el.dataset.brIconSvg === svgName && el.dataset.brIconHydrated === "1") {
    return;
  }

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
  const nodes = root?.matches?.("i[class*='fa-']")
    ? [root]
    : Array.from(root?.querySelectorAll?.("i[class*='fa-']") || []);

  if (!nodes.length) return;

  brIconHydrationQueue.push(...nodes);

  if (brIconHydrationTimer) return;

  const runBatch = () => {
    const batch = brIconHydrationQueue.splice(0, 8);

    batch.forEach((node) => {
      void hydrateBrIcon(node);
    });

    if (brIconHydrationQueue.length) {
      brIconHydrationTimer = window.setTimeout(runBatch, 40);
      return;
    }

    brIconHydrationTimer = null;
  };

  brIconHydrationTimer = window.setTimeout(runBatch, 120);
}

function startBrIconHydrator() {
  if (brIconObserver) return;

  // Same safe approach as the Player: hydrate once, slowly.
  // Do not run the old full-page MutationObserver on iPhone/Safari.
  brIconObserver = { safeMode: true };

  const run = () => hydrateBrIcons(document);

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 1600 });
    return;
  }

  window.setTimeout(run, 900);
}

const MODULE_CONFIG = {
  "/converter": {
    eyebrow: "BRMedia Converter",
    title: "Converter",
    subtitle: "Audio and video conversion, queues, presets, and output rules.",
    body: "Converter can now receive a selected file from the Player. Full batch conversion tools are next.",
    icon: "fa-solid fa-arrows-rotate",
    action: "Convert this file",
  },
  "/tagger": {
    eyebrow: "BRMedia Tagger",
    title: "Tagger",
    subtitle: "Deep metadata, artwork, ID3 editing, and mass save tools.",
    body: "Tagger can now receive a selected file from the Player. Full metadata editing tools are next.",
    icon: "fa-solid fa-tags",
    action: "Edit tags",
  },
  "/mastering": {
    eyebrow: "BRMedia Mastering",
    title: "Mastering",
    subtitle: "LANDR-style mastering, loudness targets, polish presets and final mastered copies.",
    body: "Mastering can receive Player files, library files or uploads, then render a safe mastered copy with FFmpeg.",
    icon: "fa-solid fa-sliders",
    action: "Master this file",
  },
  "/video-player": {
    eyebrow: "BRMedia Video Player",
    title: "Video Player",
    subtitle: "Poster-wall streaming from C:\\Videos with resume, subtitles and audio/dub controls.",
    body: "Video Player scans your C:\\Videos folder and opens videos in a BRMedia theatre view.",
    icon: "fa-solid fa-film",
    action: "Open video",
  },
  "/stats": {
    eyebrow: "BRMedia Stats",
    title: "Stats",
    subtitle: "Usage, playback, library, and module reporting.",
    body: "Stats will show playback, library activity and wider BRMedia usage once the reporting engine is wired.",
    icon: "fa-solid fa-chart-column",
    action: "View stats",
  },
  "/server-settings": {
    eyebrow: "BRMedia Server Settings",
    title: "Server Settings",
    subtitle: "Sources, local folders, network options, and system setup.",
    body: "Server Settings will control folders, networking, source rules and system setup.",
    icon: "fa-solid fa-server",
    action: "Server setup",
  },
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normaliseSearchText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function openModuleSidebar() {
  moduleSidebarScrollLock.y = window.scrollY || window.pageYOffset || 0;
  moduleSidebarScrollLock.dragging = false;
  moduleSidebarScrollLock.movedAt = 0;

  document.documentElement.classList.add("sidebarLocked");
  document.body.classList.add("sidebarOpen");
  document.body.style.position = "fixed";
  document.body.style.top = `-${moduleSidebarScrollLock.y}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
  btnModuleMenu?.classList.remove("isFloating");
  moduleSidebar?.classList.remove("hidden");
  moduleSidebarBackdrop?.classList.remove("hidden");
  document.getElementById("btnModuleSidebarCloseFloating")?.classList.remove("hidden");
}

function closeModuleSidebar() {
  const restoreY =
    Math.abs(parseInt(document.body.style.top || "0", 10)) ||
    moduleSidebarScrollLock.y ||
    0;

  document.documentElement.classList.remove("sidebarLocked");
  document.body.classList.remove("sidebarOpen");
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.width = "";
  moduleSidebar?.classList.add("hidden");
  moduleSidebarBackdrop?.classList.add("hidden");
  document.getElementById("btnModuleSidebarCloseFloating")?.classList.add("hidden");
  window.scrollTo(0, restoreY);
  syncModuleMenuDockState();
}

function syncModuleMenuDockState() {
  if (!btnModuleMenu || !moduleTopbar) return;

  const rect = moduleTopbar.getBoundingClientRect();
  const shouldFloat = rect.bottom < 78;
  btnModuleMenu.classList.toggle("isFloating", shouldFloat && !document.body.classList.contains("sidebarOpen"));
}

async function getLibraryItems() {
  const res = await fetch("/library", { cache: "no-store" });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error || `Library request failed (${res.status})`);
  }

  return Array.isArray(data?.items) ? data.items : [];
}

function getTrackIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return String(params.get("trackId") || "").trim();
}

function formatTrackMeta(track) {
  const bits = [];

  if (track.artist) bits.push(track.artist);
  if (track.mimeType) bits.push(track.mimeType);
  if (track.sizeBytes) bits.push(`${(Number(track.sizeBytes) / 1024 / 1024).toFixed(1)} MB`);
  if (track.locator) bits.push(track.locator);

  return bits.join(" • ") || "BRMedia library file";
}

function readJsonStorage(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "");
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJsonStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

async function refreshServerCustomTags() {
  try {
    const res = await fetch("/brmedia/custom-tags", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || data?.ok === false) {
      throw new Error(data?.error || `Custom tag request failed (${res.status})`);
    }

    brMediaServerCustomTagStore = data?.tags && typeof data.tags === "object" ? data.tags : {};
    return brMediaServerCustomTagStore;
  } catch (err) {
    console.warn("BRMedia custom tags unavailable", err);
    return brMediaServerCustomTagStore;
  }
}

function getTaggerCustomTagKeys(track = selectedTrackForModule, fallbackKey = "") {
  return [
    fallbackKey,
    track?.id,
    track?.bookmarkKey,
    track?.locator,
    track?.file,
    track?.filename,
    track?.path,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value, index, arr) => arr.indexOf(value) === index);
}

function stripFileExtension(name = "") {
  return String(name || "")
    .replace(/\.[a-z0-9]{2,8}$/i, "")
    .replace(/[_]+/g, " ")
    .trim();
}

function formatBytes(bytes = 0) {
  const size = Number(bytes || 0);
  if (!Number.isFinite(size) || size <= 0) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function isConverterAudioFormat(format = "") {
  return ["mp3", "wav", "flac", "m4a", "aac", "ogg", "opus", "aiff"].includes(String(format || "").toLowerCase());
}

function getConverterValue(el) {
  return String(el?.value || "").trim();
}

function setConverterValue(el, value) {
  if (el) el.value = value ?? "";
}

function setConverterChecked(el, checked) {
  if (el) el.checked = !!checked;
}

function setConverterStatus(message, mode = "") {
  if (converterSummaryText) converterSummaryText.textContent = message || "Ready.";
  if (converterCommandPreview) converterCommandPreview.dataset.mode = mode || "";
}

function setConverterRunning(isRunning = false) {
  converterState.isRunning = !!isRunning;

  [
    btnConverterStart,
    btnConverterPickDevice,
    btnConverterUseSelected,
    converterOutputFormat,
    converterOutputName,
    converterAudioCodec,
    converterVideoCodec,
    converterAudioBitrate,
    converterSampleRate,
    converterChannels,
    converterVideoBitrate,
    converterCrf,
    converterPreset,
    converterFrameRate,
    converterResolution,
    converterTrimStart,
    converterTrimDuration,
    converterVolume,
    converterNormalize,
    converterFastStart,
    converterRemoveAudio,
    converterAddToLibrary,
  ].forEach((el) => {
    if (el) el.disabled = !!isRunning;
  });

  document.querySelectorAll("[data-converter-kind], [data-converter-preset]").forEach((el) => {
    el.disabled = !!isRunning;
  });

  btnConverterCancel?.classList.toggle("hidden", !isRunning);
  btnConverterReset?.classList.toggle("hidden", !!isRunning);

  if (btnConverterStart) {
    btnConverterStart.classList.toggle("is-busy", !!isRunning);
  }
}

function getConverterOutputLabel(payload = buildConverterPayload()) {
  const format = String(payload.outputFormat || "mp3").toUpperCase();
  if (payload.outputType === "video") return `${format} video`;
  if (converterState.kind === "extract") return `${format} extracted audio`;
  return `${format} audio`;
}

function getConverterSourceKind(source = converterState.source) {
  const raw = String(source?.mimeType || source?.type || source?.locator || source?.fileName || "").toLowerCase();
  if (raw.includes("video") || /\.(mp4|mov|mkv|webm|avi|m4v|wmv|vob|mpg|mpeg)$/i.test(raw)) return "video";
  if (raw.includes("audio") || /\.(mp3|wav|flac|m4a|aac|ogg|opus|aiff|aif)$/i.test(raw)) return "audio";
  return "unknown";
}

function getConverterValidationItems(payload = buildConverterPayload()) {
  const items = [];
  const hasSource = !!converterState.source || !!payload.source?.trackId || !!payload.source?.uploadId;
  const sourceKind = getConverterSourceKind();

  items.push({
    mode: hasSource ? "ok" : "error",
    title: hasSource ? "Source loaded" : "No source selected",
    body: hasSource ? getConverterSourceTitle() : "Choose from library or open media from this device.",
  });

  items.push({
    mode: payload.outputFormat ? "ok" : "error",
    title: payload.outputFormat ? `Output: ${getConverterOutputLabel(payload)}` : "Output missing",
    body: payload.outputName ? `Suffix: ${payload.outputName}` : "Add an output suffix before writing.",
  });

  if (converterState.kind === "extract") {
    items.push({
      mode: sourceKind === "video" || sourceKind === "unknown" ? "ok" : "warn",
      title: "Extract audio mode",
      body: sourceKind === "audio" ? "This source already looks like audio, so normal audio convert may be better." : "Audio will be pulled out and saved as a new audio file.",
    });
  }

  if (payload.outputType === "video" && sourceKind === "audio") {
    items.push({ mode: "warn", title: "Audio source to video", body: "This source looks audio-only. Choose Audio output unless you are testing." });
  }

  if (payload.audioCodec === "copy" && (payload.normalizeAudio || payload.volume || payload.sampleRate || payload.channels || payload.audioBitrate)) {
    items.push({ mode: "warn", title: "Copy audio ignores audio edits", body: "Use an actual audio codec if you want bitrate, volume, normalize, sample-rate or channel changes." });
  }

  if (payload.videoCodec === "copy" && (payload.crf || payload.videoBitrate || payload.frameRate || payload.resolution || payload.preset)) {
    items.push({ mode: "warn", title: "Copy video ignores video edits", body: "Use an encoder such as H.264 if you want CRF, bitrate, FPS or resolution changes." });
  }

  if (payload.trimDuration && !payload.trimStart) {
    items.push({ mode: "info", title: "Duration trim set", body: `Output will be limited to ${payload.trimDuration}s from the start.` });
  }

  if (payload.addToLibrary && payload.outputType === "video") {
    items.push({ mode: "info", title: "Video library note", body: "Audio outputs auto-add to Player. Video library support comes with the Video Player module." });
  }

  return items;
}

function renderConverterReadiness(payload = buildConverterPayload()) {
  if (!converterReadinessPanel) return;
  const items = getConverterValidationItems(payload);

  converterReadinessPanel.innerHTML = items.map((item) => `
    <div class="converterReadyItem" data-mode="${escapeHtml(item.mode)}">
      <i class="fa-solid ${item.mode === "ok" ? "fa-circle-check" : item.mode === "error" ? "fa-triangle-exclamation" : "fa-circle-info"}"></i>
      <span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.body)}</small></span>
    </div>
  `).join("");

  hydrateBrIcons(converterReadinessPanel);
}

function getConverterHistory() {
  try {
    const items = JSON.parse(localStorage.getItem(CONVERTER_HISTORY_KEY) || "[]");
    return Array.isArray(items) ? items.slice(0, 8) : [];
  } catch {
    return [];
  }
}

function saveConverterHistoryItem(job = {}) {
  if (!job?.id || job.status !== "done") return;
  const items = getConverterHistory().filter((item) => item.id !== job.id);
  items.unshift({
    id: job.id,
    fileName: job.fileName || "Converted media",
    message: job.message || "Conversion complete.",
    outputFormat: job.outputFormat || "",
    outputType: job.outputType || "",
    sizeBytes: job.sizeBytes || 0,
    downloadUrl: job.downloadUrl || "",
    libraryItemId: job.libraryItem?.id || "",
    savedAt: Date.now(),
  });
  localStorage.setItem(CONVERTER_HISTORY_KEY, JSON.stringify(items.slice(0, 8)));
  renderConverterHistory();
}

function renderConverterHistory() {
  if (!converterHistoryPanel) return;
  const items = getConverterHistory();
  converterHistoryPanel.classList.toggle("hidden", !items.length);

  if (!items.length) {
    converterHistoryPanel.innerHTML = "";
    return;
  }

  converterHistoryPanel.innerHTML = `
    <div class="converterHistoryHead"><strong>Recent conversions</strong><span>Latest successful outputs on this device.</span></div>
    ${items.slice(0, 3).map((item) => `
      <div class="converterHistoryItem">
        <span><strong>${escapeHtml(item.fileName)}</strong><small>${escapeHtml(formatBytes(item.sizeBytes) || item.message || "Ready")}</small></span>
        <a href="${escapeHtml(item.downloadUrl || "#")}">Download</a>
        ${item.libraryItemId ? `<a href="/player?trackId=${encodeURIComponent(item.libraryItemId)}">Player</a>` : ""}
      </div>
    `).join("")}
  `;
}

function syncConverterPolishState(payload = buildConverterPayload()) {
  if (!converterPanel) return;
  converterPanel.dataset.kind = converterState.kind;
  converterPanel.dataset.sourceKind = getConverterSourceKind();

  document.querySelectorAll("[data-converter-preset]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.getAttribute("data-converter-preset") === converterState.activePreset);
  });

  if (btnConverterStart) {
    const label = converterState.isRunning ? "Converting…" : `Start ${getConverterOutputLabel(payload)}`;
    const span = btnConverterStart.querySelector("span");
    if (span) span.textContent = label;
  }

  renderConverterReadiness(payload);
  renderConverterHistory();
}

function getConverterSourceTitle(source = converterState.source) {
  return source?.title || source?.name || source?.fileName || "No file loaded";
}

function renderConverterSource(source = converterState.source) {
  const hasSource = !!source;

  if (converterHeroTitle) converterHeroTitle.textContent = hasSource ? getConverterSourceTitle(source) : "No file loaded";
  if (converterHeroMeta) converterHeroMeta.textContent = hasSource ? formatTrackMeta(source) : "Open media from this device, or send a file from Player/View Files.";

  if (converterHeroPills) {
    const pills = [];

    if (hasSource) {
      pills.push(`<span class="converterPill isGold">${escapeHtml(source.sourceType || source.source || "local")}</span>`);
      if (source.sizeBytes) pills.push(`<span class="converterPill isBlue">${escapeHtml(formatBytes(source.sizeBytes))}</span>`);
      if (source.mimeType) pills.push(`<span class="converterPill">${escapeHtml(source.mimeType)}</span>`);
    } else {
      pills.push(`<span class="converterPill isBlue">Audio + video</span>`);
      pills.push(`<span class="converterPill isGold">FFmpeg powered</span>`);
    }

    converterHeroPills.innerHTML = pills.join("");
  }

  updateConverterPreview();
}

function setConverterSource(source, message = "") {
  converterState.source = source || null;
  selectedTrackForModule = source || selectedTrackForModule;

  if (moduleTrackPanel && source) moduleTrackPanel.classList.remove("hidden");
  if (moduleTrackTitle && source) moduleTrackTitle.textContent = getConverterSourceTitle(source);
  if (moduleTrackMeta && source) moduleTrackMeta.textContent = formatTrackMeta(source);

  if (moduleTrackOpenPlayer && source?.id && !String(source.id).startsWith("converter_upload_")) {
    moduleTrackOpenPlayer.href = `/player?trackId=${encodeURIComponent(source.id)}`;
  }

  renderConverterSource(source);
  if (message) setConverterStatus(message, "success");
}

async function uploadConverterDeviceFile(file) {
  const res = await fetch(`/brmedia/converter/upload?name=${encodeURIComponent(file.name || "converter-upload.bin")}`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || "Could not upload media for conversion");
  }

  return data;
}

async function loadConverterDeviceFile(file) {
  if (!file) return;

  const tempSource = {
    id: `converter_upload_${Date.now()}`,
    title: stripFileExtension(file.name || "Converter upload"),
    name: file.name || "Converter upload",
    fileName: file.name || "converter-upload",
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size || 0,
    source: "converter_upload",
    sourceType: "device upload",
  };

  converterState.pendingFile = file;
  setConverterSource(tempSource, "Uploading media to Converter…");

  try {
    const uploaded = await uploadConverterDeviceFile(file);
    converterState.pendingFile = null;
    setConverterSource(uploaded.source, "Media loaded in Converter.");
  } catch (err) {
    console.warn("Converter upload failed", err);
    setConverterStatus(err?.message || "Converter upload failed", "error");
  }
}

function setConverterKind(kind = "audio") {
  converterState.kind = kind === "video" ? "video" : kind === "extract" ? "extract" : "audio";

  document.querySelectorAll("[data-converter-kind]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.getAttribute("data-converter-kind") === converterState.kind);
  });

  if (converterState.kind === "video") {
    if (isConverterAudioFormat(getConverterValue(converterOutputFormat))) {
      setConverterValue(converterOutputFormat, "mp4");
    }
  } else {
    if (!isConverterAudioFormat(getConverterValue(converterOutputFormat))) {
      setConverterValue(converterOutputFormat, "mp3");
    }
  }

  updateConverterPreview();
}

function applyConverterPreset(preset = "") {
  converterState.activePreset = preset || "";

  if (preset === "mp3-phone") {
    setConverterKind("audio");
    setConverterValue(converterOutputFormat, "mp3");
    setConverterValue(converterAudioCodec, "libmp3lame");
    setConverterValue(converterAudioBitrate, "320k");
    setConverterValue(converterSampleRate, "44100");
    setConverterValue(converterChannels, "2");
    setConverterValue(converterVideoCodec, "auto");
    setConverterValue(converterVideoBitrate, "");
    setConverterValue(converterCrf, "");
    setConverterValue(converterPreset, "");
    setConverterChecked(converterNormalize, false);
    setConverterChecked(converterFastStart, true);
    setConverterChecked(converterRemoveAudio, false);
    setConverterChecked(converterAddToLibrary, true);
  }

  if (preset === "wav-master") {
    setConverterKind("audio");
    setConverterValue(converterOutputFormat, "wav");
    setConverterValue(converterAudioCodec, "pcm_s16le");
    setConverterValue(converterAudioBitrate, "");
    setConverterValue(converterSampleRate, "48000");
    setConverterValue(converterChannels, "2");
    setConverterValue(converterVideoCodec, "auto");
    setConverterValue(converterVideoBitrate, "");
    setConverterValue(converterCrf, "");
    setConverterValue(converterPreset, "");
    setConverterChecked(converterNormalize, false);
    setConverterChecked(converterFastStart, true);
    setConverterChecked(converterRemoveAudio, false);
    setConverterChecked(converterAddToLibrary, true);
  }

  if (preset === "flac-archive") {
    setConverterKind("audio");
    setConverterValue(converterOutputFormat, "flac");
    setConverterValue(converterAudioCodec, "flac");
    setConverterValue(converterAudioBitrate, "");
    setConverterValue(converterSampleRate, "");
    setConverterValue(converterChannels, "");
    setConverterValue(converterVideoCodec, "auto");
    setConverterValue(converterVideoBitrate, "");
    setConverterValue(converterCrf, "");
    setConverterValue(converterPreset, "");
    setConverterChecked(converterNormalize, false);
    setConverterChecked(converterFastStart, true);
    setConverterChecked(converterRemoveAudio, false);
    setConverterChecked(converterAddToLibrary, true);
  }

  if (preset === "mp4-share") {
    setConverterKind("video");
    setConverterValue(converterOutputFormat, "mp4");
    setConverterValue(converterVideoCodec, "libx264");
    setConverterValue(converterAudioCodec, "aac");
    setConverterValue(converterAudioBitrate, "192k");
    setConverterValue(converterVideoBitrate, "");
    setConverterValue(converterCrf, "20");
    setConverterValue(converterPreset, "fast");
    setConverterValue(converterFrameRate, "");
    setConverterValue(converterResolution, "");
    setConverterChecked(converterNormalize, false);
    setConverterChecked(converterFastStart, true);
    setConverterChecked(converterRemoveAudio, false);
    setConverterChecked(converterAddToLibrary, false);
  }

  updateConverterPreview();
  setConverterStatus("Converter preset applied.", "success");
}

function buildConverterPayload() {
  const hasUpload = !!converterState.source?.converterUploadId;
  const trackId =
    !hasUpload && converterState.source?.id
      ? converterState.source.id
      : getTrackIdFromUrl();

  return {
    source: hasUpload
      ? { uploadId: converterState.source.converterUploadId }
      : { trackId },
    outputType: converterState.kind === "video" ? "video" : "audio",
    outputFormat: getConverterValue(converterOutputFormat) || "mp3",
    outputName: getConverterValue(converterOutputName) || "BRMedia Converted",
    audioCodec: getConverterValue(converterAudioCodec),
    videoCodec: getConverterValue(converterVideoCodec),
    audioBitrate: getConverterValue(converterAudioBitrate),
    sampleRate: getConverterValue(converterSampleRate),
    channels: getConverterValue(converterChannels),
    videoBitrate: getConverterValue(converterVideoBitrate),
    crf: getConverterValue(converterCrf),
    preset: getConverterValue(converterPreset),
    frameRate: getConverterValue(converterFrameRate),
    resolution: getConverterValue(converterResolution),
    trimStart: getConverterValue(converterTrimStart),
    trimDuration: getConverterValue(converterTrimDuration),
    volume: getConverterValue(converterVolume),
    normalizeAudio: !!converterNormalize?.checked,
    fastStart: !!converterFastStart?.checked,
    removeAudio: !!converterRemoveAudio?.checked,
    addToLibrary: !!converterAddToLibrary?.checked,
  };
}

function updateConverterPreview() {
  if (!converterPanel || window.location.pathname !== "/converter") return;

  const payload = buildConverterPayload();
  const hasSource = !!converterState.source || !!payload.source?.trackId || !!payload.source?.uploadId;
  const outputLabel = getConverterOutputLabel(payload);
  const extras = [];

  if (payload.audioCodec && payload.audioCodec !== "auto") extras.push(`audio: ${payload.audioCodec}`);
  if (payload.videoCodec && payload.videoCodec !== "auto" && payload.outputType === "video") extras.push(`video: ${payload.videoCodec}`);
  if (payload.audioBitrate) extras.push(`audio bitrate: ${payload.audioBitrate}`);
  if (payload.videoBitrate) extras.push(`video bitrate: ${payload.videoBitrate}`);
  if (payload.crf) extras.push(`CRF ${payload.crf}`);
  if (payload.resolution) extras.push(payload.resolution);
  if (payload.frameRate) extras.push(`${payload.frameRate}fps`);
  if (payload.trimStart) extras.push(`trim from ${payload.trimStart}s`);
  if (payload.trimDuration) extras.push(`duration ${payload.trimDuration}s`);
  if (payload.normalizeAudio) extras.push("loudness normalize");
  if (payload.volume) extras.push(`volume ${payload.volume}x`);
  if (payload.removeAudio) extras.push("remove audio");
  if (payload.fastStart && payload.outputType === "video") extras.push("fast start");

  if (converterSummaryText) {
    converterSummaryText.textContent = hasSource
      ? `Ready to create ${outputLabel}.`
      : "Choose a source file before starting conversion.";
  }

  if (converterCommandPreview) {
    converterCommandPreview.textContent = hasSource
      ? `Output: .${payload.outputFormat} • ${extras.join(" • ") || "auto settings"}`
      : "No source selected yet.";
  }

  syncConverterPolishState(payload);
}

function renderConverterJob(job = {}) {
  if (!job?.id) return;

  const status = String(job.status || "");
  const isWorking = ["queued", "running"].includes(status);

  setConverterRunning(isWorking);
  converterProgress?.classList.toggle("hidden", !isWorking);

  if (converterProgressStatus) {
    converterProgressStatus.textContent = job.message || status || "Working…";
  }

  if (converterProgressFill && isWorking) {
    converterProgressFill.style.width = status === "queued" ? "24%" : "62%";
  }

  if (status === "done") {
    converterProgress?.classList.add("hidden");
    converterResult?.classList.remove("hidden");

    const sizeLine = job.sizeBytes ? `Converted size: ${formatBytes(job.sizeBytes)}` : "Converted file is ready.";
    const playerLink = job.libraryItem?.id
      ? `<a href="/player?trackId=${encodeURIComponent(job.libraryItem.id)}">Open converted file in Player</a>`
      : "";

    if (converterResult) {
      converterResult.innerHTML = `
        <strong>${escapeHtml(job.fileName || "Conversion complete")}</strong>
        <span>${escapeHtml(job.message || sizeLine)}</span>
        <div class="converterResultActions">
          <a href="${escapeHtml(job.downloadUrl || "#")}">Download converted file</a>
          ${playerLink}
        </div>
      `;
    }

    if (btnConverterDownload) {
      btnConverterDownload.href = job.downloadUrl || "#";
      btnConverterDownload.classList.remove("hidden");
    }

    saveConverterHistoryItem(job);
    setConverterStatus("Conversion complete.", "success");
    return;
  }

  if (status === "cancelled") {
    converterProgress?.classList.add("hidden");
    converterResult?.classList.remove("hidden");

    if (converterResult) {
      converterResult.innerHTML = `
        <strong>Conversion cancelled</strong>
        <span>${escapeHtml(job.message || "The FFmpeg job was stopped before it finished.")}</span>
      `;
    }

    setConverterStatus("Conversion cancelled.", "");
    return;
  }

  if (status === "error") {
    converterProgress?.classList.add("hidden");
    converterResult?.classList.remove("hidden");

    if (converterResult) {
      converterResult.innerHTML = `
        <strong>Conversion failed</strong>
        <span>${escapeHtml(job.error || job.message || "FFmpeg could not convert this file.")}</span>
      `;
    }

    setConverterStatus(job.error || "Conversion failed.", "error");
  }
}

async function pollConverterJob(jobId) {
  if (!jobId) return;

  window.clearTimeout(converterState.pollTimer);

  try {
    const res = await fetch(`/brmedia/converter/jobs/${encodeURIComponent(jobId)}`, {
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || data?.ok === false) {
      throw new Error(data?.error || `Job request failed (${res.status})`);
    }

    renderConverterJob(data.job);

    if (["queued", "running"].includes(String(data.job?.status || ""))) {
      converterState.pollTimer = window.setTimeout(() => {
        pollConverterJob(jobId);
      }, 1200);
    }
  } catch (err) {
    console.warn("Converter poll failed", err);
    setConverterRunning(false);
    setConverterStatus(err?.message || "Could not check converter job", "error");
  }
}

async function startConverterJob() {
  const payload = buildConverterPayload();

  if (!payload.source?.trackId && !payload.source?.uploadId) {
    setConverterStatus("Open a source file before starting conversion.", "error");
    return;
  }

  converterResult?.classList.add("hidden");
  btnConverterDownload?.classList.add("hidden");
  converterProgress?.classList.remove("hidden");
  if (converterProgressFill) converterProgressFill.style.width = "12%";
  setConverterRunning(true);

  if (converterProgressStatus) {
    converterProgressStatus.textContent = "Starting FFmpeg…";
  }

  setConverterStatus("Starting conversion…", "");

  try {
    const res = await fetch("/brmedia/converter/jobs", {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || data?.ok === false) {
      throw new Error(data?.error || `Conversion request failed (${res.status})`);
    }

    converterState.currentJobId = data.job?.id || "";
    renderConverterJob(data.job);
    pollConverterJob(converterState.currentJobId);
  } catch (err) {
    console.warn("Converter start failed", err);
    converterProgress?.classList.add("hidden");
    setConverterRunning(false);
    setConverterStatus(err?.message || "Could not start conversion", "error");
  }
}

async function cancelConverterJob() {
  const jobId = converterState.currentJobId;
  if (!jobId || !converterState.isRunning) return;

  if (converterProgressStatus) converterProgressStatus.textContent = "Cancelling FFmpeg job…";
  setConverterStatus("Cancelling conversion…", "");

  try {
    const res = await fetch(`/brmedia/converter/jobs/${encodeURIComponent(jobId)}/cancel`, {
      method: "POST",
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data?.ok === false) {
      throw new Error(data?.error || "Could not cancel converter job");
    }

    renderConverterJob(data.job);
  } catch (err) {
    console.warn("Converter cancel failed", err);
    setConverterStatus(err?.message || "Could not cancel converter job", "error");
  }
}

function resetConverter() {
  window.clearTimeout(converterState.pollTimer);

  converterState.currentJobId = "";
  converterState.activePreset = "";
  setConverterRunning(false);
  converterProgress?.classList.add("hidden");
  converterResult?.classList.add("hidden");
  btnConverterDownload?.classList.add("hidden");

  setConverterKind("audio");
  setConverterValue(converterOutputFormat, "mp3");
  setConverterValue(converterOutputName, "BRMedia Converted");
  setConverterValue(converterAudioCodec, "auto");
  setConverterValue(converterVideoCodec, "auto");
  setConverterValue(converterAudioBitrate, "");
  setConverterValue(converterSampleRate, "");
  setConverterValue(converterChannels, "");
  setConverterValue(converterVideoBitrate, "");
  setConverterValue(converterCrf, "");
  setConverterValue(converterPreset, "");
  setConverterValue(converterFrameRate, "");
  setConverterValue(converterResolution, "");
  setConverterValue(converterTrimStart, "");
  setConverterValue(converterTrimDuration, "");
  setConverterValue(converterVolume, "");
  setConverterChecked(converterNormalize, false);
  setConverterChecked(converterFastStart, true);
  setConverterChecked(converterRemoveAudio, false);
  setConverterChecked(converterAddToLibrary, true);

  renderConverterSource(converterState.source);
  updateConverterPreview();
}

function showMasteringTab(tab = "source") {
  masteringState.activeTab = tab || "source";

  masteringTabs.forEach((btn) => {
    btn.classList.toggle("is-active", btn.getAttribute("data-mastering-tab") === masteringState.activeTab);
  });

  masteringTabPanels.forEach((panel) => {
    panel.classList.toggle("is-tab-hidden", panel.getAttribute("data-mastering-tab-panel") !== masteringState.activeTab);
  });
}

function getMasteringValue(el) {
  return String(el?.value || "").trim();
}

function setMasteringValue(el, value) {
  if (el) el.value = value ?? "";
}

function setMasteringChecked(el, checked) {
  if (el) el.checked = !!checked;
}

function setMasteringStatus(message, mode = "") {
  if (masteringSummaryText) masteringSummaryText.textContent = message || "Ready.";
  if (masteringChainPreview) masteringChainPreview.dataset.mode = mode || "";
}

function getMasteringSourceTitle(source = masteringState.source) {
  return source?.title || source?.name || source?.fileName || "No file loaded";
}

function renderMasteringSource(source = masteringState.source) {
  const hasSource = !!source;
  if (masteringHeroTitle) masteringHeroTitle.textContent = hasSource ? getMasteringSourceTitle(source) : "No file loaded";
  if (masteringHeroMeta) masteringHeroMeta.textContent = hasSource ? formatTrackMeta(source) : "Choose from your BRMedia library, open from Player/View Files, or upload audio from this device.";

  if (masteringHeroPills) {
    const pills = [];
    if (hasSource) {
      pills.push(`<span class="masteringPill isGold">${escapeHtml(source.sourceType || source.source || "local")}</span>`);
      if (source.sizeBytes) pills.push(`<span class="masteringPill isBlue">${escapeHtml(formatBytes(source.sizeBytes))}</span>`);
      if (source.mimeType) pills.push(`<span class="masteringPill">${escapeHtml(source.mimeType)}</span>`);
    } else {
      pills.push(`<span class="masteringPill isBlue">Non-destructive</span>`);
      pills.push(`<span class="masteringPill isGold">Mastered copy output</span>`);
    }
    masteringHeroPills.innerHTML = pills.join("");
  }

  updateMasteringPreview();
}

function setMasteringSource(source, message = "") {
  masteringState.source = source || null;
  masteringState.analysis = null;
  selectedTrackForModule = source || selectedTrackForModule;

  if (moduleTrackPanel && source) moduleTrackPanel.classList.remove("hidden");
  if (moduleTrackTitle && source) moduleTrackTitle.textContent = getMasteringSourceTitle(source);
  if (moduleTrackMeta && source) moduleTrackMeta.textContent = formatTrackMeta(source);

  if (moduleTrackOpenPlayer && source?.id && !String(source.id).startsWith("mastering_upload_")) {
    moduleTrackOpenPlayer.href = `/player?trackId=${encodeURIComponent(source.id)}`;
  }

  renderMasteringSource(source);
  if (message) setMasteringStatus(message, "success");
}

async function uploadMasteringDeviceFile(file) {
  const res = await fetch(`/brmedia/mastering/upload?name=${encodeURIComponent(file.name || "mastering-upload.bin")}`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) throw new Error(data?.error || "Could not upload audio for mastering");
  return data;
}

async function loadMasteringDeviceFile(file) {
  if (!file) return;

  const tempSource = {
    id: `mastering_upload_${Date.now()}`,
    title: stripFileExtension(file.name || "Mastering upload"),
    name: file.name || "Mastering upload",
    fileName: file.name || "mastering-upload",
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size || 0,
    source: "mastering_upload",
    sourceType: "device upload",
  };

  masteringState.pendingFile = file;
  setMasteringSource(tempSource, "Uploading audio to Mastering…");

  try {
    const uploaded = await uploadMasteringDeviceFile(file);
    masteringState.pendingFile = null;
    setMasteringSource(uploaded.source, "Audio loaded in Mastering.");
  } catch (err) {
    console.warn("Mastering upload failed", err);
    setMasteringStatus(err?.message || "Mastering upload failed", "error");
  }
}

function applyMasteringPreset(preset = "streaming-clean") {
  masteringState.activePreset = preset || "streaming-clean";

  if (preset === "streaming-clean") {
    setMasteringValue(masteringTargetLufs, "-14");
    setMasteringValue(masteringTruePeak, "-1.5");
    setMasteringValue(masteringCompression, "medium");
    setMasteringValue(masteringStereoWidth, "1.08");
    setMasteringValue(masteringBass, "1");
    setMasteringValue(masteringWarmth, "1");
    setMasteringValue(masteringBrightness, "1");
    setMasteringValue(masteringLimiterDrive, "1");
    setMasteringValue(masteringIntensity, "50");
    setMasteringValue(masteringLowCut, "20");
    setMasteringValue(masteringDeHarsh, "light");
    setMasteringValue(masteringAir, "1");
  }

  if (preset === "club-loud") {
    setMasteringValue(masteringTargetLufs, "-9");
    setMasteringValue(masteringTruePeak, "-0.6");
    setMasteringValue(masteringCompression, "hard");
    setMasteringValue(masteringStereoWidth, "1.18");
    setMasteringValue(masteringBass, "2");
    setMasteringValue(masteringWarmth, "1");
    setMasteringValue(masteringBrightness, "2");
    setMasteringValue(masteringLimiterDrive, "3");
    setMasteringValue(masteringIntensity, "100");
    setMasteringValue(masteringLowCut, "30");
    setMasteringValue(masteringDeHarsh, "medium");
    setMasteringValue(masteringAir, "2");
  }

  if (preset === "warm-depth") {
    setMasteringValue(masteringTargetLufs, "-14");
    setMasteringValue(masteringTruePeak, "-1.5");
    setMasteringValue(masteringCompression, "gentle");
    setMasteringValue(masteringStereoWidth, "1.08");
    setMasteringValue(masteringBass, "2");
    setMasteringValue(masteringWarmth, "2");
    setMasteringValue(masteringBrightness, "0");
    setMasteringValue(masteringLimiterDrive, "1");
    setMasteringValue(masteringIntensity, "50");
    setMasteringValue(masteringLowCut, "20");
    setMasteringValue(masteringDeHarsh, "medium");
    setMasteringValue(masteringAir, "0");
  }

  if (preset === "hardcore-punch") {
    setMasteringValue(masteringTargetLufs, "-10");
    setMasteringValue(masteringTruePeak, "-1");
    setMasteringValue(masteringCompression, "hard");
    setMasteringValue(masteringStereoWidth, "1.18");
    setMasteringValue(masteringBass, "2");
    setMasteringValue(masteringWarmth, "1");
    setMasteringValue(masteringBrightness, "3");
    setMasteringValue(masteringLimiterDrive, "2");
    setMasteringValue(masteringIntensity, "75");
    setMasteringValue(masteringLowCut, "30");
    setMasteringValue(masteringDeHarsh, "light");
    setMasteringValue(masteringAir, "2");
  }

  updateMasteringPreview();
  setMasteringStatus("Mastering preset applied.", "success");
}

function buildMasteringPayload() {
  const hasUpload = !!masteringState.source?.masteringUploadId;
  const trackId = !hasUpload && masteringState.source?.id ? masteringState.source.id : getTrackIdFromUrl();

  return {
    source: hasUpload ? { uploadId: masteringState.source.masteringUploadId } : { trackId },
    outputFormat: getMasteringValue(masteringOutputFormat) || "mp3",
    outputName: getMasteringValue(masteringOutputName) || "BRMedia Master",
    preset: masteringState.activePreset || "streaming-clean",
    targetLufs: getMasteringValue(masteringTargetLufs) || "-14",
    truePeak: getMasteringValue(masteringTruePeak) || "-1.5",
    compression: getMasteringValue(masteringCompression) || "medium",
    stereoWidth: getMasteringValue(masteringStereoWidth) || "1.08",
    bass: getMasteringValue(masteringBass) || "1",
    warmth: getMasteringValue(masteringWarmth) || "1",
    brightness: getMasteringValue(masteringBrightness) || "1",
    limiterDrive: getMasteringValue(masteringLimiterDrive) || "1",
    addToLibrary: !!masteringAddToLibrary?.checked,
    preserveMetadata: masteringPreserveMetadata?.checked !== false,
  };
}

function formatMasteringNumber(value, fallback = "—") {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return num.toFixed(1);
}

function formatMasteringHz(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return "—";
  if (num >= 1000) return `${(num / 1000).toFixed(num % 1000 === 0 ? 0 : 1)} kHz`;
  return `${num} Hz`;
}

function formatMasteringBitrate(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return "—";
  return `${Math.round(num / 1000)} kbps`;
}

function getMasteringAnalysisCards(analysis = masteringState.analysis) {
  const metrics = analysis?.metrics || {};
  const meta = analysis?.meta || {};

  return [
    {
      label: "Integrated loudness",
      value: `${formatMasteringNumber(metrics.integratedLufs)} LUFS`,
      sub: "Approx source loudness",
      mode: Number(metrics.integratedLufs) > -9 ? "warn" : "ok",
    },
    {
      label: "Peak level",
      value: `${formatMasteringNumber(metrics.maxVolume)} dB`,
      sub: metrics.truePeak != null ? `True peak ${formatMasteringNumber(metrics.truePeak)} dBFS` : "Max sample peak",
      mode: Number(metrics.maxVolume) >= -0.2 ? "warn" : "ok",
    },
    {
      label: "Loudness range",
      value: `${formatMasteringNumber(metrics.loudnessRange)} LU`,
      sub: "Dynamic movement",
      mode: Number(metrics.loudnessRange) > 14 ? "info" : "ok",
    },
    {
      label: "Source format",
      value: meta.sampleRate ? formatMasteringHz(meta.sampleRate) : "—",
      sub: `${meta.channels || "—"} ch • ${formatMasteringBitrate(meta.bitrate)}`,
      mode: "info",
    },
  ];
}

function renderMasteringAnalysisPanel() {
  if (!masteringAnalysisCards || !masteringAnalysisSummary || !masteringAnalysisBadge) return;

  const analysis = masteringState.analysis;

  if (!analysis) {
    masteringAnalysisBadge.textContent = masteringState.isAnalysing ? "Analysing…" : "Not analysed";
    masteringAnalysisSummary.textContent = masteringState.isAnalysing
      ? "FFmpeg is measuring loudness, peak level and source dynamics."
      : "Run analysis to measure loudness, peak level, dynamics and clipping risk.";
    masteringAnalysisCards.innerHTML = `
      <div class="masteringAnalysisEmpty">
        <i class="fa-solid fa-chart-line"></i>
        <strong>No source analysis yet</strong>
        <span>Load a file, then tap Analyse source before rendering the full master.</span>
      </div>
    `;
    hydrateBrIcons(masteringAnalysisCards);
    return;
  }

  const recommendation = analysis.recommendation || {};
  masteringAnalysisBadge.textContent = "Analysed";
  masteringAnalysisSummary.textContent = recommendation.title
    ? `${recommendation.title}. ${recommendation.body || ""}`
    : "Source analysis complete.";

  masteringAnalysisCards.innerHTML = `
    ${getMasteringAnalysisCards(analysis).map((card) => `
      <div class="masteringAnalysisCard" data-mode="${escapeHtml(card.mode || "info")}">
        <strong>${escapeHtml(card.value)}</strong>
        <span>${escapeHtml(card.label)}</span>
        <small>${escapeHtml(card.sub)}</small>
      </div>
    `).join("")}
    ${Array.isArray(analysis.warnings) && analysis.warnings.length ? `
      <div class="masteringAnalysisWarnings">
        ${analysis.warnings.map((warning) => `
          <div class="masteringAnalysisWarning" data-mode="${escapeHtml(warning.mode || "warn")}">
            <i class="fa-solid ${warning.mode === "info" ? "fa-circle-info" : "fa-triangle-exclamation"}"></i>
            <span><strong>${escapeHtml(warning.title)}</strong><small>${escapeHtml(warning.body)}</small></span>
          </div>
        `).join("")}
      </div>
    ` : ""}
  `;

  hydrateBrIcons(masteringAnalysisCards);
}

function setMasteringAnalysing(isAnalysing = false) {
  masteringState.isAnalysing = !!isAnalysing;
  btnMasteringAnalyze?.classList.toggle("is-busy", !!isAnalysing);
  if (btnMasteringAnalyze) btnMasteringAnalyze.disabled = !!isAnalysing || !!masteringState.isRunning;
  renderMasteringAnalysisPanel();
}

async function requestMasteringAnalysis() {
  const payload = buildMasteringPayload();

  if (!payload.source?.trackId && !payload.source?.uploadId) {
    setMasteringStatus("Open a source file before running analysis.", "error");
    return;
  }

  setMasteringStatus("Analysing source audio…", "");
  setMasteringAnalysing(true);

  try {
    const res = await fetch("/brmedia/mastering/analyse", {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || data?.ok === false) {
      throw new Error(data?.error || `Analysis request failed (${res.status})`);
    }

    masteringState.analysis = data.analysis || null;
    setMasteringStatus("Source analysis complete.", "success");
    showMasteringTab("analysis");
    updateMasteringPreview();
  } catch (err) {
    console.warn("Mastering analysis failed", err);
    setMasteringStatus(err?.message || "Could not analyse source", "error");
  } finally {
    setMasteringAnalysing(false);
  }
}

function getMasteringValidationItems(payload = buildMasteringPayload()) {
  const hasSource = !!masteringState.source || !!payload.source?.trackId || !!payload.source?.uploadId;
  const analysis = masteringState.analysis;
  const metrics = analysis?.metrics || {};
  const warnings = Array.isArray(analysis?.warnings) ? analysis.warnings : [];

  const items = [
    {
      mode: hasSource ? "ok" : "error",
      title: hasSource ? "Source loaded" : "No source selected",
      body: hasSource ? getMasteringSourceTitle() : "Choose from library or open audio from this device.",
    },
    {
      mode: analysis ? "ok" : "info",
      title: analysis ? "Source analysed" : "Analysis recommended",
      body: analysis
        ? `Measured ${formatMasteringNumber(metrics.integratedLufs)} LUFS, peak ${formatMasteringNumber(metrics.maxVolume)} dB.`
        : "Run Analyse source before rendering for loudness and clipping checks.",
    },
    {
      mode: "ok",
      title: `${String(payload.targetLufs).toUpperCase()} LUFS target`,
      body: `True peak ceiling ${payload.truePeak} dB with ${payload.compression} compression.`,
    },
    {
      mode: Number(payload.targetLufs) >= -10 ? "warn" : "ok",
      title: Number(payload.targetLufs) >= -10 ? "Very loud master" : "Streaming-safe loudness",
      body: Number(payload.targetLufs) >= -10 ? "Great for club/hardcore tests; check for distortion before release." : "Good starting point for online playback.",
    },
    {
      mode: payload.addToLibrary ? "ok" : "info",
      title: payload.addToLibrary ? "Will add to Player" : "Download only",
      body: payload.addToLibrary ? "Finished master will be added back into BRMedia library." : "Finished master will only be available as a download.",
    },
  ];

  warnings.slice(0, 3).forEach((warning) => {
    items.push({
      mode: warning.mode || "warn",
      title: warning.title || "Analysis warning",
      body: warning.body || "Check the source before rendering.",
    });
  });

  return items;
}

function renderMasteringReadiness(payload = buildMasteringPayload()) {
  if (!masteringReadinessPanel) return;
  masteringReadinessPanel.innerHTML = getMasteringValidationItems(payload).map((item) => `
    <div class="masteringReadyItem" data-mode="${escapeHtml(item.mode)}">
      <i class="fa-solid ${item.mode === "ok" ? "fa-circle-check" : item.mode === "error" ? "fa-triangle-exclamation" : "fa-circle-info"}"></i>
      <span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.body)}</small></span>
    </div>
  `).join("");
  hydrateBrIcons(masteringReadinessPanel);
}

function updateMasteringPreview() {
  if (!masteringPanel || window.location.pathname !== "/mastering") return;
  const payload = buildMasteringPayload();
  const hasSource = !!masteringState.source || !!payload.source?.trackId || !!payload.source?.uploadId;
  const analysis = masteringState.analysis;

  document.querySelectorAll("[data-mastering-preset]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.getAttribute("data-mastering-preset") === masteringState.activePreset);
  });

  if (masteringSummaryText) {
    masteringSummaryText.textContent = hasSource
      ? analysis
        ? `Analysed and ready: ${String(payload.outputFormat).toUpperCase()} master at ${payload.targetLufs} LUFS.`
        : `Ready to analyse or render ${String(payload.outputFormat).toUpperCase()} master at ${payload.targetLufs} LUFS.`
      : "Choose a source file before starting mastering.";
  }

  if (masteringChainPreview) {
    const measured = analysis?.metrics?.integratedLufs != null
      ? ` • source ${formatMasteringNumber(analysis.metrics.integratedLufs)} LUFS`
      : "";
    masteringChainPreview.textContent = hasSource
      ? `Preset: ${payload.preset} • intensity ${payload.intensity}% • target ${payload.targetLufs} LUFS${measured} • TP ${payload.truePeak} dB • ${payload.compression} compression • width ${payload.stereoWidth}x • low cut ${payload.lowCut}Hz • de-harsh ${payload.deHarsh} • bass +${payload.bass} • warmth ${payload.warmth} • brightness +${payload.brightness} • air +${payload.air}`
      : "No mastering chain queued yet.";
  }

  if (btnMasteringStart) {
    const label = btnMasteringStart.querySelector("span");
    if (label) label.textContent = masteringState.isRunning ? "Mastering…" : "Start mastering";
  }

  renderMasteringAnalysisPanel();
  renderMasteringReadiness(payload);
}

function setMasteringRunning(isRunning = false) {
  masteringState.isRunning = !!isRunning;

  [
    btnMasteringStart,
    btnMasteringAnalyze,
    btnMasteringPickDevice,
    btnMasteringChooseLibrary,
    masteringOutputFormat,
    masteringOutputName,
    masteringTargetLufs,
    masteringTruePeak,
    masteringCompression,
    masteringStereoWidth,
    masteringBass,
    masteringWarmth,
    masteringBrightness,
    masteringLimiterDrive,
    masteringAddToLibrary,
    masteringPreserveMetadata,
  ].forEach((el) => {
    if (el) el.disabled = !!isRunning;
  });

  document.querySelectorAll("[data-mastering-preset]").forEach((el) => {
    el.disabled = !!isRunning;
  });

  btnMasteringCancel?.classList.toggle("hidden", !isRunning);
  btnMasteringReset?.classList.toggle("hidden", !!isRunning);
  btnMasteringStart?.classList.toggle("is-busy", !!isRunning);
}

function renderMasteringJob(job = {}) {
  if (!job?.id) return;
  const status = String(job.status || "");
  const isWorking = ["queued", "running"].includes(status);

  setMasteringRunning(isWorking);
  masteringProgress?.classList.toggle("hidden", !isWorking);

  if (masteringProgressStatus) masteringProgressStatus.textContent = job.message || status || "Working…";
  if (masteringProgressFill && isWorking) masteringProgressFill.style.width = status === "queued" ? "22%" : "68%";

  if (status === "done") {
    masteringProgress?.classList.add("hidden");
    masteringResult?.classList.remove("hidden");
    const playerLink = job.libraryItem?.id ? `<a href="/player?trackId=${encodeURIComponent(job.libraryItem.id)}">Open master in Player</a>` : "";

    if (masteringResult) {
      masteringResult.innerHTML = `
        <strong>${escapeHtml(job.fileName || "Master complete")}</strong>
        <span>${escapeHtml(job.message || "Your mastered file is ready.")}</span>
        <div class="masteringResultActions">
          <a href="${escapeHtml(job.downloadUrl || "#")}">Download master</a>
          ${playerLink}
        </div>
      `;
    }

    if (btnMasteringDownload) {
      btnMasteringDownload.href = job.downloadUrl || "#";
      btnMasteringDownload.classList.remove("hidden");
    }

    setMasteringStatus("Mastering complete.", "success");
    return;
  }

  if (status === "cancelled") {
    masteringProgress?.classList.add("hidden");
    masteringResult?.classList.remove("hidden");
    if (masteringResult) masteringResult.innerHTML = `<strong>Mastering cancelled</strong><span>${escapeHtml(job.message || "The render was stopped before it finished.")}</span>`;
    setMasteringStatus("Mastering cancelled.", "");
    return;
  }

  if (status === "error") {
    masteringProgress?.classList.add("hidden");
    masteringResult?.classList.remove("hidden");
    if (masteringResult) masteringResult.innerHTML = `<strong>Mastering failed</strong><span>${escapeHtml(job.error || job.message || "FFmpeg could not master this file.")}</span>`;
    setMasteringStatus(job.error || "Mastering failed.", "error");
  }
}

async function pollMasteringJob(jobId) {
  if (!jobId) return;
  window.clearTimeout(masteringState.pollTimer);

  try {
    const res = await fetch(`/brmedia/mastering/jobs/${encodeURIComponent(jobId)}`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok === false) throw new Error(data?.error || `Mastering job request failed (${res.status})`);

    renderMasteringJob(data.job);
    if (["queued", "running"].includes(String(data.job?.status || ""))) {
      masteringState.pollTimer = window.setTimeout(() => pollMasteringJob(jobId), 1200);
    }
  } catch (err) {
    console.warn("Mastering poll failed", err);
    setMasteringRunning(false);
    setMasteringStatus(err?.message || "Could not check mastering job", "error");
  }
}

async function startMasteringJob() {
  showMasteringTab("render");
  const payload = buildMasteringPayload();
  if (!payload.source?.trackId && !payload.source?.uploadId) {
    setMasteringStatus("Open a source file before starting mastering.", "error");
    return;
  }

  masteringResult?.classList.add("hidden");
  btnMasteringDownload?.classList.add("hidden");
  masteringProgress?.classList.remove("hidden");
  if (masteringProgressFill) masteringProgressFill.style.width = "12%";
  if (masteringProgressStatus) masteringProgressStatus.textContent = "Starting FFmpeg mastering chain…";
  setMasteringRunning(true);
  setMasteringStatus("Starting mastering render…", "");

  try {
    const res = await fetch("/brmedia/mastering/jobs", {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok === false) throw new Error(data?.error || `Mastering request failed (${res.status})`);

    masteringState.currentJobId = data.job?.id || "";
    renderMasteringJob(data.job);
    pollMasteringJob(masteringState.currentJobId);
  } catch (err) {
    console.warn("Mastering start failed", err);
    masteringProgress?.classList.add("hidden");
    setMasteringRunning(false);
    setMasteringStatus(err?.message || "Could not start mastering", "error");
  }
}

async function cancelMasteringJob() {
  const jobId = masteringState.currentJobId;
  if (!jobId || !masteringState.isRunning) return;

  if (masteringProgressStatus) masteringProgressStatus.textContent = "Cancelling mastering render…";
  setMasteringStatus("Cancelling mastering render…", "");

  try {
    const res = await fetch(`/brmedia/mastering/jobs/${encodeURIComponent(jobId)}/cancel`, { method: "POST", cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok === false) throw new Error(data?.error || "Could not cancel mastering job");
    renderMasteringJob(data.job);
  } catch (err) {
    console.warn("Mastering cancel failed", err);
    setMasteringStatus(err?.message || "Could not cancel mastering job", "error");
  }
}

function resetMastering() {
  window.clearTimeout(masteringState.pollTimer);
  masteringState.currentJobId = "";
  masteringState.activePreset = "streaming-clean";
  setMasteringRunning(false);
  masteringProgress?.classList.add("hidden");
  showMasteringTab("render");
  masteringResult?.classList.add("hidden");
  btnMasteringDownload?.classList.add("hidden");

  setMasteringValue(masteringOutputFormat, "mp3");
  setMasteringValue(masteringOutputName, "BRMedia Master");
  setMasteringChecked(masteringAddToLibrary, true);
  setMasteringChecked(masteringPreserveMetadata, true);
  applyMasteringPreset("streaming-clean");
  showMasteringTab(masteringState.source ? "presets" : "source");
  renderMasteringSource(masteringState.source);
  updateMasteringPreview();
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Could not read image blob"));
    reader.readAsDataURL(blob);
  });
}

async function uploadTaggerDeviceFile(file) {
  const res = await fetch(`/library/upload-mobile-file?name=${encodeURIComponent(file.name || "tagger-upload.bin")}`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || "Could not upload this file to BRMedia");
  }

  return data;
}

function buildTemporaryDeviceTrack(file) {
  const title = stripFileExtension(file?.name || "Untitled file") || "Untitled file";
  return {
    id: `device_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    title,
    artist: "",
    album: "",
    genre: "",
    mimeType: file?.type || "",
    sizeBytes: file?.size || 0,
    locator: file?.name || "Device upload",
    source: "device_upload",
    sourceType: "deviceUpload",
    hasArtwork: false,
  };
}

function setTaggerLoadedTrack(track, message = "") {
  selectedTrackForModule = track || null;
  taggerLoadedFileKey = track?.id || "";

  if (moduleTrackPanel && track) {
    moduleTrackPanel.classList.remove("hidden");
  }

  if (moduleTrackTitle) {
    moduleTrackTitle.textContent = track?.title || track?.name || "Selected file";
  }

  if (moduleTrackMeta) {
    moduleTrackMeta.textContent = formatTrackMeta(track || {});
  }

  if (moduleTrackOpenPlayer && track?.id && !String(track.id).startsWith("device_")) {
    moduleTrackOpenPlayer.href = `/player?trackId=${encodeURIComponent(track.id)}`;
  }

  fillTaggerForm(track, getSavedBrMediaTags(track?.id || ""));
  setTaggerStatus(message || "File loaded in Tagger.", "success");
  void hydrateTaggerEmbeddedMetadata(track);
}

function hasTaggerMetadataValue(meta = {}) {
  return [
    "title",
    "artist",
    "albumArtist",
    "album",
    "genre",
    "year",
    "bpm",
    "label",
    "key",
    "country",
    "trackNumber",
    "discNumber",
    "comment",
  ].some((key) => String(meta?.[key] ?? "").trim());
}

function hasPlainObjectValues(value) {
  return !!value && typeof value === "object" && Object.keys(value).length > 0;
}

function mergeTaggerTrackWithEmbeddedMeta(track = {}, meta = {}) {
  const merged = { ...track };

  [
    "title",
    "artist",
    "albumArtist",
    "album",
    "genre",
    "year",
    "bpm",
    "label",
    "key",
    "country",
    "trackNumber",
    "discNumber",
    "comment",
    "duration",
    "bitrate",
    "sampleRate",
    "numberOfChannels",
    "codec",
  ].forEach((key) => {
    const value = meta?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      merged[key] = value;
    }
  });

  if (meta?.hasPicture) merged.hasArtwork = true;
  if (meta?.advancedTags && typeof meta.advancedTags === "object") merged.advancedTags = meta.advancedTags;
  if (meta?.rawMetadata) merged.rawMetadata = meta.rawMetadata;
  return merged;
}

function writeVideoStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getVideoFavouriteIds() {
  return Array.isArray(videoState.favourites) ? videoState.favourites : [];
}

function isVideoFavourite(id) {
  return getVideoFavouriteIds().includes(id);
}

function saveVideoFavourites(ids) {
  videoState.favourites = [...new Set((ids || []).filter(Boolean))];
  writeVideoStorage(VIDEO_FAVOURITES_KEY, videoState.favourites);
}

function getVideoRating(id) {
  return Number(videoState.ratings?.[id] || 0) || 0;
}

function saveVideoRating(id, rating) {
  if (!id) return;

  const ratings = videoState.ratings && typeof videoState.ratings === "object" ? videoState.ratings : {};
  const value = Math.max(0, Math.min(5, Number(rating) || 0));

  if (value) ratings[id] = value;
  else delete ratings[id];

  videoState.ratings = ratings;
  writeVideoStorage(VIDEO_RATINGS_KEY, ratings);
}

function getVideoBookmarks(id = "") {
  const store = videoState.bookmarks && typeof videoState.bookmarks === "object" ? videoState.bookmarks : {};
  return Array.isArray(store[id]) ? store[id] : [];
}

function saveVideoBookmarks(id, list) {
  if (!id) return;

  const store = videoState.bookmarks && typeof videoState.bookmarks === "object" ? videoState.bookmarks : {};
  store[id] = Array.isArray(list) ? list : [];
  videoState.bookmarks = store;
  writeVideoStorage(VIDEO_BOOKMARKS_KEY, store);
}

function showVideoTab(tab = "browse") {
  videoState.activeTab = tab || "browse";

  videoModeTabs.forEach((btn) => {
    btn.classList.toggle("is-active", btn.getAttribute("data-video-tab") === videoState.activeTab);
  });

  videoModePanels.forEach((panel) => {
    panel.classList.toggle("is-tab-hidden", panel.getAttribute("data-video-tab-panel") !== videoState.activeTab);
  });
}

function updateVideoFavouriteButton() {
  if (!btnVideoToggleFavourite) return;

  const selected = videoState.selected;
  const on = !!selected?.id && isVideoFavourite(selected.id);

  btnVideoToggleFavourite.classList.toggle("is-active", on);

  const label = btnVideoToggleFavourite.querySelector("span");
  if (label) label.textContent = on ? "Favourited" : "Favourite";
}

function updateVideoRatingUI() {
  if (!videoRatingStars) return;

  const rating = getVideoRating(videoState.selected?.id || "");

  videoRatingStars.querySelectorAll("[data-video-rating]").forEach((btn) => {
    const value = Number(btn.getAttribute("data-video-rating") || 0);
    btn.classList.toggle("is-active", value <= rating);
  });
}

function renderVideoCollections() {
  const items = Array.isArray(videoState.items) ? videoState.items : [];
  const favIds = getVideoFavouriteIds();
  const favouriteItems = favIds.map((id) => findVideoById(id)).filter(Boolean);

  if (videoFavouritesCountText) {
    videoFavouritesCountText.textContent = favouriteItems.length
      ? `${favouriteItems.length} favourite video${favouriteItems.length === 1 ? "" : "s"}`
      : "No favourite videos yet.";
  }

  if (videoFavouritesWall) {
    videoFavouritesWall.innerHTML = favouriteItems.length
      ? favouriteItems.map(renderVideoCard).join("")
      : `<div class="videoEmptyState"><i class="fa-solid fa-heart"></i><strong>No favourites yet</strong><span>Open a video and tap Favourite to pin it here.</span></div>`;
    hydrateBrIcons(videoFavouritesWall);
  }

  const bookmarkRows = [];
  const store = videoState.bookmarks && typeof videoState.bookmarks === "object" ? videoState.bookmarks : {};

  Object.entries(store).forEach(([id, list]) => {
    const item = items.find((candidate) => candidate.id === id);
    if (!item || !Array.isArray(list)) return;

    list.forEach((mark) => bookmarkRows.push({
      ...mark,
      videoId: id,
      videoTitle: item.title || item.fileName || "Video",
    }));
  });

  bookmarkRows.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));

  if (videoBookmarksCountText) {
    videoBookmarksCountText.textContent = bookmarkRows.length
      ? `${bookmarkRows.length} saved bookmark${bookmarkRows.length === 1 ? "" : "s"}`
      : "Save scenes and resume points from the watch page.";
  }

  if (videoBookmarksList) {
    videoBookmarksList.innerHTML = bookmarkRows.length
      ? bookmarkRows.map((mark) => `
        <button class="videoBookmarkRow" type="button" data-video-id="${escapeHtml(mark.videoId)}" data-video-time="${escapeHtml(mark.time)}">
          <i class="fa-solid fa-bookmark"></i>
          <span><strong>${escapeHtml(mark.videoTitle)}</strong><small>${escapeHtml(formatTimestampClock(mark.time || 0))} • ${escapeHtml(mark.label || "Saved scene")}</small></span>
        </button>
      `).join("")
      : `<div class="videoEmptyState"><i class="fa-solid fa-bookmark"></i><strong>No video bookmarks yet</strong><span>Tap Bookmark time while watching a film.</span></div>`;
    hydrateBrIcons(videoBookmarksList);
  }
}

function toggleVideoFavourite() {
  const id = videoState.selected?.id;
  if (!id) return;

  const ids = getVideoFavouriteIds();
  saveVideoFavourites(isVideoFavourite(id) ? ids.filter((value) => value !== id) : [...ids, id]);

  updateVideoFavouriteButton();
  renderVideoCollections();
}

function addVideoBookmark() {
  const item = videoState.selected;
  if (!item?.id || !brVideoElement) return;

  const time = Math.max(0, Math.floor(Number(brVideoElement.currentTime || 0)));
  const existing = getVideoBookmarks(item.id);
  const label = `Bookmark ${existing.length + 1}`;

  saveVideoBookmarks(item.id, [
    { id: `bm_${Date.now()}`, time, label, createdAt: Date.now() },
    ...existing,
  ].slice(0, 40));

  renderVideoCollections();
  setVideoStatus(`Bookmark saved at ${formatTimestampClock(time)}.`, "success");
}

function formatTimestampClock(seconds = 0) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function renderVideoTimerStatus() {
  if (!videoTimerStatus) return;

  if (videoState.timerMode === "end") {
    videoTimerStatus.textContent = "Timer set: stop at end of current video.";
    return;
  }

  const remaining = Math.max(0, Math.floor((Number(videoState.timerEndAt || 0) - Date.now()) / 1000));

  if (!remaining) {
    videoTimerStatus.textContent = "No video timer set.";
    return;
  }

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  videoTimerStatus.textContent = `Timer active: ${mins}:${String(secs).padStart(2, "0")} remaining.`;
}

function clearVideoTimer() {
  videoState.timerEndAt = 0;
  videoState.timerMode = "";
  localStorage.removeItem(VIDEO_TIMER_KEY);
  window.clearInterval(videoState.timerInterval);
  videoState.timerInterval = null;
  renderVideoTimerStatus();
}

function tickVideoTimer() {
  if (videoState.timerMode === "end") {
    renderVideoTimerStatus();
    return;
  }

  if (!videoState.timerEndAt) return;

  if (Date.now() >= Number(videoState.timerEndAt || 0)) {
    brVideoElement?.pause?.();
    clearVideoTimer();
    setVideoStatus("Video timer finished. Playback paused.", "success");
    return;
  }

  renderVideoTimerStatus();
}

function setVideoCastStatus(message = "") {
  if (videoCastStatus) videoCastStatus.textContent = message || "Uses browser support where available. Unsupported devices can use Send to Device later.";
}

async function openVideoCastPicker() {
  if (!brVideoElement) return;

  try {
    if (typeof brVideoElement.webkitShowPlaybackTargetPicker === "function") {
      brVideoElement.webkitShowPlaybackTargetPicker();
      setVideoCastStatus("AirPlay / output picker opened.");
      return;
    }

    if (brVideoElement.remote && typeof brVideoElement.remote.prompt === "function") {
      await brVideoElement.remote.prompt();
      setVideoCastStatus("Remote playback picker opened.");
      return;
    }

    setVideoCastStatus("Cast/AirPlay is not exposed by this browser. Use device screen mirroring or Send to Device later.");
  } catch (err) {
    console.warn("Video cast picker failed", err);
    setVideoCastStatus(err?.message || "Cast/AirPlay picker was not available.");
  }
}

async function toggleVideoPictureInPicture() {
  if (!brVideoElement) return;

  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      setVideoCastStatus("Picture in picture closed.");
      return;
    }

    if (document.pictureInPictureEnabled && typeof brVideoElement.requestPictureInPicture === "function") {
      await brVideoElement.requestPictureInPicture();
      setVideoCastStatus("Picture in picture opened.");
      return;
    }

    setVideoCastStatus("Picture in picture is not available in this browser.");
  } catch (err) {
    console.warn("Picture in picture failed", err);
    setVideoCastStatus(err?.message || "Picture in picture could not open.");
  }
}

function applyVideoTimer() {
  const value = videoTimerSelect?.value || "0";
  window.clearInterval(videoState.timerInterval);

  if (!value || value === "0") {
    clearVideoTimer();
    setVideoStatus("Video timer cleared.", "success");
    return;
  }

  if (value === "end") {
    videoState.timerMode = "end";
    videoState.timerEndAt = 0;
    writeVideoStorage(VIDEO_TIMER_KEY, 0);
    videoState.timerInterval = window.setInterval(tickVideoTimer, 1000);
    renderVideoTimerStatus();
    setVideoStatus("Video timer set to stop at the end.", "success");
    return;
  }

  videoState.timerMode = "countdown";
  videoState.timerEndAt = Date.now() + Number(value) * 1000;
  writeVideoStorage(VIDEO_TIMER_KEY, videoState.timerEndAt);
  videoState.timerInterval = window.setInterval(tickVideoTimer, 1000);
  tickVideoTimer();
  setVideoStatus("Video timer set.", "success");
}

function setVideoStatus(message, mode = "") {
  if (!videoStatus) return;
  videoStatus.textContent = message || "Ready.";
  videoStatus.dataset.mode = mode || "";
}

function getVideoResumeMap() {
  videoState.resume = readJsonStorage(VIDEO_RESUME_KEY, {});
  return videoState.resume && typeof videoState.resume === "object" ? videoState.resume : {};
}

function saveVideoResume(id, currentTime, duration) {
  if (!id || !Number.isFinite(currentTime) || currentTime < 1) return;
  const resume = getVideoResumeMap();
  resume[id] = {
    currentTime: Math.max(0, Number(currentTime) || 0),
    duration: Math.max(0, Number(duration) || 0),
    updatedAt: Date.now(),
  };
  videoState.resume = resume;
  localStorage.setItem(VIDEO_RESUME_KEY, JSON.stringify(resume));
}

function getVideoResumeFor(id) {
  return getVideoResumeMap()[id] || null;
}

function formatVideoDuration(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  if (!total) return "";
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function proxyVideoImageUrl(url = "") {
  return url ? `/video-online-image?url=${encodeURIComponent(url)}` : "";
}

function getVideoPosterUrl(item) {
  if (!item?.id) return "";
  if (item.posterUrl) return proxyVideoImageUrl(item.posterUrl);
  return `/video-poster/${encodeURIComponent(item.id)}?v=${encodeURIComponent(item.posterVersion || item.modifiedAt || "1")}`;
}

function getVideoStreamUrl(item) {
  return item?.id ? `/video-stream/${encodeURIComponent(item.id)}` : "";
}

function getVideoSearchBlob(item = {}) {
  return normaliseSearchText([
    item.title,
    item.originalTitle,
    item.year,
    item.rating,
    item.onlineRating,
    item.genre,
    videoState.genre,
    item.director,
    item.cast,
    item.folder,
    item.fileName,
    item.locator,
  ].filter(Boolean).join(" "));
}

function getFilteredVideoItems() {
  const query = normaliseSearchText(videoState.query || "");
  const resume = getVideoResumeMap();
  const filter = videoState.filter || "all";
  const selectedGenre = normaliseVideoGenre(videoState.genre || "");
  let items = Array.isArray(videoState.items) ? [...videoState.items] : [];

  if (query) items = items.filter((item) => getVideoSearchBlob(item).includes(query));
  if (selectedGenre) items = items.filter((item) => getVideoGenreParts(item.genre).some((genre) => normaliseVideoGenre(genre) === selectedGenre));

  if (filter === "continue") {
    items = items.filter((item) => Number(resume[item.id]?.currentTime || 0) > 10);
  }

  if (filter === "matched") {
    items = items.filter((item) => item.metadataSource || item.onlineRating || item.rating);
  }

  if (filter === "subtitles") {
    items = items.filter((item) => Array.isArray(item.subtitles) && item.subtitles.length);
  }

  if (filter === "needs-info") {
    items = items.filter((item) => !item.metadataSource && !item.onlineRating && !item.rating);
  }

  const sort = videoState.sort || "title";

  items.sort((a, b) => {
    if (sort === "recent") return Number(b.modifiedAt || 0) - Number(a.modifiedAt || 0);
    if (sort === "rating") return Number(b.onlineRating || b.rating || 0) - Number(a.onlineRating || a.rating || 0);
    if (sort === "resume") return Number(resume[b.id]?.updatedAt || 0) - Number(resume[a.id]?.updatedAt || 0);
    return String(a.title || a.fileName || "").localeCompare(String(b.title || b.fileName || ""));
  });

  return items;
}

function renderVideoPosterImage(item, className = "videoPosterImg") {
  const fallback = `
    <div class="${className} videoPosterFallback">
      <i class="fa-solid fa-film"></i>
      <strong>${escapeHtml(item.title || item.fileName || "Video")}</strong>
    </div>
  `;
  if (!item.hasPoster && !item.posterUrl) return fallback;
  return `<img class="${className}" src="${escapeHtml(getVideoPosterUrl(item))}" alt="${escapeHtml(item.title || "Video poster")}" onerror="this.outerHTML='${escapeHtml(fallback)}'" />`;
}

function getVideoBackdropUrl(item = {}) {
  if (item.backdropUrl) return proxyVideoImageUrl(item.backdropUrl);
  if (item.posterUrl) return proxyVideoImageUrl(item.posterUrl);
  if (item.hasPoster) return getVideoPosterUrl(item);
  return "";
}

function getVideoReadableRuntime(item = {}) {
  return item.runtime || (item.duration ? formatVideoDuration(item.duration) : "");
}

function getVideoProgressPercent(item = {}) {
  const resume = getVideoResumeFor(item.id);
  return resume?.duration ? Math.max(0, Math.min(100, (resume.currentTime / resume.duration) * 100)) : 0;
}

function updateVideoFilterChips() {
  document.querySelectorAll("[data-video-filter]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.getAttribute("data-video-filter") === (videoState.filter || "all"));
  });
}

function normaliseVideoGenre(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/science fiction/g, "sci fi")
    .replace(/sci-fi/g, "sci fi")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tidyVideoGenreLabel(value = "") {
  const text = String(value || "")
    .replace(/&/g, "and")
    .replace(/\s*\/\s*/g, ",")
    .replace(/\s*\|\s*/g, ",")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return "";
  if (/^sci[ -]?fi$/i.test(text) || /^science fiction$/i.test(text)) return "Sci-Fi";
  return text.split(" ").map((part) => part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : "").join(" ");
}

function getVideoGenreParts(genreValue = "") {
  const raw = Array.isArray(genreValue) ? genreValue.join(",") : String(genreValue || "");
  return raw
    .split(/[,|/]+/)
    .map((part) => tidyVideoGenreLabel(part))
    .filter((part) =>
      part &&
      !/^film$/i.test(part) &&
      !/^film\s*(and|&)\s*video$/i.test(part) &&
      !/^video$/i.test(part) &&
      !/^unsorted$/i.test(part)
    );
}

function getVideoGenreEntries() {
  const counts = new Map();

  (videoState.items || []).forEach((item) => {
    getVideoGenreParts(item.genre).forEach((label) => {
      const key = normaliseVideoGenre(label);
      if (!key) return;
      const current = counts.get(key) || { key, label, count: 0 };
      current.count += 1;
      counts.set(key, current);
    });
  });

  return [...counts.values()].sort((a, b) => a.label.localeCompare(b.label));
}

function renderVideoSidebarGenres() {
  if (!videoSidebarNav || !videoSidebarGenreList) return;

  const isVideoPage = window.location.pathname === "/video-player";
  videoSidebarNav.classList.toggle("hidden", !isVideoPage);
  if (!isVideoPage) return;

  const entries = getVideoGenreEntries();
  const selectedGenre = normaliseVideoGenre(videoState.genre || "");

  btnVideoSidebarHome?.classList.toggle("is-active", !selectedGenre);

  if (!entries.length) {
    videoSidebarGenreList.innerHTML = `<div class="videoSidebarEmpty">No genres found yet. Use Match missing info to pull film genres online.</div>`;
    return;
  }

  videoSidebarGenreList.innerHTML = entries.map((entry) => `
    <button class="videoSidebarGenreBtn ${entry.key === selectedGenre ? "is-active" : ""}" type="button" data-video-sidebar-genre="${escapeHtml(entry.label)}">
      <span class="videoSidebarGenreIcon"><i class="fa-solid fa-film"></i></span>
      <span class="videoSidebarGenreText">${escapeHtml(entry.label)}</span>
      <span class="videoSidebarGenreCount">${escapeHtml(entry.count)}</span>
    </button>
  `).join("");

  hydrateBrIcons(videoSidebarGenreList);
}

function setVideoSidebarGenre(genre = "") {
  videoState.genre = genre || "";
  videoState.filter = "all";
  renderVideoWall();
  closeModuleSidebar();
}

function renderVideoStats() {
  const items = Array.isArray(videoState.items) ? videoState.items : [];
  const resume = getVideoResumeMap();
  const matched = items.filter((item) => item.metadataSource || item.onlineRating || item.rating).length;
  const continuing = items.filter((item) => Number(resume[item.id]?.currentTime || 0) > 10).length;
  const subtitles = items.filter((item) => Array.isArray(item.subtitles) && item.subtitles.length).length;

  if (videoStatTotal) videoStatTotal.textContent = String(items.length);
  if (videoStatRated) videoStatRated.textContent = String(matched);
  if (videoStatContinue) videoStatContinue.textContent = String(continuing);
  if (videoStatSubtitle) videoStatSubtitle.textContent = String(subtitles);
}

function pickVideoSpotlightItem() {
  const items = Array.isArray(videoState.items) ? videoState.items : [];
  if (!items.length) return null;

  const resume = getVideoResumeMap();
  const continuing = items
    .filter((item) => Number(resume[item.id]?.currentTime || 0) > 10)
    .sort((a, b) => Number(resume[b.id]?.updatedAt || 0) - Number(resume[a.id]?.updatedAt || 0));

  if (continuing[0]) return continuing[0];

  const rated = [...items].sort((a, b) => Number(b.onlineRating || b.rating || 0) - Number(a.onlineRating || a.rating || 0));
  if (Number(rated[0]?.onlineRating || rated[0]?.rating || 0) > 0) return rated[0];

  return [...items].sort((a, b) => Number(b.modifiedAt || 0) - Number(a.modifiedAt || 0))[0] || items[0];
}

function renderVideoSpotlight() {
  if (!videoSpotlightSection) return;
  const item = pickVideoSpotlightItem();

  videoSpotlightSection.classList.toggle("hidden", !item);
  if (!item) return;

  videoState.spotlightId = item.id;
  const progress = getVideoProgressPercent(item);
  const rating = item.onlineRating || item.rating || "—";
  const runtime = getVideoReadableRuntime(item);
  const backdrop = getVideoBackdropUrl(item);

  if (videoSpotlightBackdrop) {
    videoSpotlightBackdrop.style.backgroundImage = backdrop ? `url("${backdrop}")` : "";
  }

  if (videoSpotlightKicker) videoSpotlightKicker.textContent = progress > 1 ? "Continue watching" : (item.metadataSource ? `Matched by ${item.metadataSource}` : "Spotlight pick");
  if (videoSpotlightTitle) videoSpotlightTitle.textContent = item.title || item.fileName || "Untitled video";
  if (videoSpotlightMeta) videoSpotlightMeta.textContent = [rating !== "—" ? `★ ${rating}` : "Rating pending", item.year, runtime, item.genre].filter(Boolean).join(" • ");

  if (videoSpotlightBadges) {
    videoSpotlightBadges.innerHTML = [
      item.subtitles?.length ? "Subtitles" : "No subtitles",
      item.audioTracks?.length ? "Audio tracks" : "Default audio",
      progress > 1 ? `${Math.round(progress)}% watched` : "Ready to start",
    ].map((text) => `<span>${escapeHtml(text)}</span>`).join("");
  }

  hydrateBrIcons(videoSpotlightSection);
}

function renderVideoCard(item) {
  const resume = getVideoResumeFor(item.id);
  const progress = resume?.duration ? Math.max(0, Math.min(100, (resume.currentTime / resume.duration) * 100)) : 0;
  const rating = item.onlineRating || item.rating || "—";
  const userRating = getVideoRating(item.id);
  const sourceBadge = item.metadataSource ? `<span class="videoSourceBadge">${escapeHtml(item.metadataSource)}</span>` : "";
  const favouriteBadge = isVideoFavourite(item.id) ? `<span class="videoFavouriteBadge"><i class="fa-solid fa-heart"></i></span>` : "";
  const userBadge = userRating ? `<span class="videoUserRatingBadge">You ${"★".repeat(userRating)}</span>` : "";
  const year = item.year ? ` • ${escapeHtml(item.year)}` : "";
  const duration = item.duration ? ` • ${escapeHtml(formatVideoDuration(item.duration))}` : "";

  return `
    <button class="videoPosterCard" type="button" data-video-id="${escapeHtml(item.id)}">
      <div class="videoPosterFrame">
        ${renderVideoPosterImage(item)}
        <span class="videoRatingBadge"><i class="fa-solid fa-star"></i>${escapeHtml(rating)}</span>
        ${sourceBadge}
        ${favouriteBadge}
        ${userBadge}
        ${progress > 1 ? `<span class="videoResumeBar"><span style="width:${progress.toFixed(1)}%"></span></span>` : ""}
      </div>
      <span class="videoCardTitle">${escapeHtml(item.title || item.fileName || "Untitled video")}</span>
      <span class="videoCardMeta">${escapeHtml(item.genre || "Video")}${year}${duration}</span>
    </button>
  `;
}

function renderVideoContinueRail() {
  if (!videoContinueSection || !videoContinueRail) return;
  const resume = getVideoResumeMap();
  const items = (videoState.items || [])
    .filter((item) => resume[item.id]?.currentTime > 10)
    .sort((a, b) => Number(resume[b.id]?.updatedAt || 0) - Number(resume[a.id]?.updatedAt || 0))
    .slice(0, 10);

  videoContinueSection.classList.toggle("hidden", !items.length);
  videoContinueRail.innerHTML = items.map(renderVideoCard).join("");
  hydrateBrIcons(videoContinueRail);
}

function renderVideoWall() {
  if (!videoPosterWall) return;
  const items = getFilteredVideoItems();

  renderVideoStats();
  renderVideoSpotlight();
  updateVideoFilterChips();
  renderVideoSidebarGenres();
  renderVideoCollections();

  const selectedGenre = videoState.genre ? ` • ${videoState.genre}` : "";
  if (videoCountText) videoCountText.textContent = `${items.length} video${items.length === 1 ? "" : "s"} shown from C:\\Videos${selectedGenre}`;

  if (!items.length) {
    videoPosterWall.innerHTML = `
      <div class="videoEmptyState">
        <i class="fa-solid fa-film"></i>
        <strong>No videos found</strong>
        <span>Put video files in C:\\Videos, then tap Scan C:\\Videos.</span>
      </div>
    `;
    hydrateBrIcons(videoPosterWall);
    renderVideoContinueRail();
    return;
  }

  videoPosterWall.innerHTML = items.map(renderVideoCard).join("");
  hydrateBrIcons(videoPosterWall);
  renderVideoContinueRail();
}

async function fetchVideoLibrary(force = false, matchMissing = false) {
  if (!force && !matchMissing) {
    const cached = readJsonStorage(VIDEO_LIBRARY_CACHE_KEY, null);
    if (cached?.items?.length) {
      videoState.items = cached.items;
      renderVideoWall();
    }
  }

  setVideoStatus(matchMissing ? "Scanning C:\\Videos and matching online info…" : "Scanning C:\\Videos…", "");

  const params = new URLSearchParams();
  if (force || matchMissing) params.set("refresh", "1");
  if (matchMissing) params.set("metadata", "missing");

  const res = await fetch(`/video-library${params.toString() ? `?${params.toString()}` : ""}`, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));

  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || `Video library request failed (${res.status})`);
  }

  videoState.items = Array.isArray(data.items) ? data.items : [];
  localStorage.setItem(VIDEO_LIBRARY_CACHE_KEY, JSON.stringify({ items: videoState.items, savedAt: Date.now() }));
  renderVideoWall();

  const providerNote = data.metadataEnabled ? " Online info matching is enabled." : " Add TMDB_API_KEY or OMDB_API_KEY in .env for automatic ratings/posters.";
  setVideoStatus(videoState.items.length ? `Loaded ${videoState.items.length} video${videoState.items.length === 1 ? "" : "s"} from C:\\Videos.${providerNote}` : `No videos found in C:\\Videos yet.${providerNote}`, videoState.items.length ? "success" : "");
}

function findVideoById(id = "") {
  return (videoState.items || []).find((item) => String(item.id) === String(id)) || null;
}

function updateVideoItem(updated = {}) {
  if (!updated?.id) return;

  videoState.items = (videoState.items || []).map((item) => String(item.id) === String(updated.id) ? { ...item, ...updated } : item);

  if (videoState.selected && String(videoState.selected.id) === String(updated.id)) {
    videoState.selected = { ...videoState.selected, ...updated };
  }

  localStorage.setItem(VIDEO_LIBRARY_CACHE_KEY, JSON.stringify({ items: videoState.items, savedAt: Date.now() }));
  renderVideoWall();
}

function getVideoPrefs(id = videoState.selected?.id || "") {
  const prefs = videoState.prefs && typeof videoState.prefs === "object" ? videoState.prefs : {};
  return prefs[id] || {};
}

function saveVideoPrefs(id = videoState.selected?.id || "", patch = {}) {
  if (!id) return;

  const prefs = videoState.prefs && typeof videoState.prefs === "object" ? videoState.prefs : {};
  prefs[id] = { ...(prefs[id] || {}), ...patch, updatedAt: Date.now() };
  videoState.prefs = prefs;
  localStorage.setItem(VIDEO_PREFS_KEY, JSON.stringify(prefs));
}

async function refreshSelectedVideoMetadata(force = true) {
  const id = videoState.selected?.id;
  if (!id) return;

  setVideoStatus("Refreshing online video info…", "");

  try {
    const res = await fetch(`/video-library/${encodeURIComponent(id)}/metadata?refresh=${force ? "1" : "0"}`, {
      method: "POST",
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || data?.ok === false) {
      throw new Error(data?.error || `Metadata request failed (${res.status})`);
    }

    updateVideoItem(data.item);
    renderVideoDetail(data.item);
    setVideoStatus(data.metadata?.matched ? "Online info refreshed." : "No online match found yet. Check filename/year or add a sidecar.", data.metadata?.matched ? "success" : "");
  } catch (err) {
    console.warn("Video metadata refresh failed", err);
    setVideoStatus(err?.message || "Could not refresh online info", "error");
  }
}

function clearVideoTextTracks() {
  if (!brVideoElement) return;
  Array.from(brVideoElement.querySelectorAll("track")).forEach((track) => track.remove());
}

function renderVideoAudioOptions(item = {}) {
  if (!videoAudioSelect) return;

  const prefs = getVideoPrefs(item.id);
  const nativeTracks = brVideoElement?.audioTracks ? Array.from(brVideoElement.audioTracks) : [];
  const sidecarTracks = Array.isArray(item.audioTracks) ? item.audioTracks : [];

  const detected = sidecarTracks.length
    ? sidecarTracks
    : nativeTracks.length
      ? nativeTracks.map((track, index) => ({ id: String(index), label: track.label || `Audio track ${index + 1}`, language: track.language || "" }))
      : [{ id: "default", label: "Browser default / English dub if available", language: "" }];

  const preferredIndex = detected.findIndex((track) => /en|eng|english|dub/i.test(`${track.language || ""} ${track.label || track.title || ""}`));

  videoAudioSelect.innerHTML = detected.map((track, index) => {
    const label = track.label || track.title || (track.language ? `${track.language.toUpperCase()} audio` : `Audio track ${index + 1}`);
    const id = String(track.id || index);
    const selected = prefs.audio === id || (!prefs.audio && preferredIndex === index);
    return `<option value="${escapeHtml(id)}" ${selected ? "selected" : ""}>${escapeHtml(preferredIndex === index ? `${label} • preferred` : label)}</option>`;
  }).join("");

  applyVideoAudioChoice();
}

function renderVideoSubtitleOptions(item = {}) {
  if (!videoSubtitleSelect || !brVideoElement) return;

  const subtitles = Array.isArray(item.subtitles) ? item.subtitles : [];
  clearVideoTextTracks();
  videoSubtitleSelect.innerHTML = `<option value="off">Off</option>`;

  subtitles.forEach((sub, index) => {
    const ext = String(sub.ext || "").toLowerCase();
    const label = sub.label || sub.language || `Subtitle ${index + 1}`;
    const value = String(sub.id || index);

    videoSubtitleSelect.insertAdjacentHTML("beforeend", `<option value="${escapeHtml(value)}">${escapeHtml(label)}${ext === ".srt" ? " (.srt)" : ""}</option>`);

    const track = document.createElement("track");
    track.kind = "subtitles";
    track.label = label;
    track.srclang = sub.language || "en";
    track.src = `/video-subtitle/${encodeURIComponent(item.id)}/${encodeURIComponent(value)}`;
    brVideoElement.appendChild(track);
  });

  const prefs = getVideoPrefs(item.id);
  if (prefs.subtitle) videoSubtitleSelect.value = prefs.subtitle;
  applyVideoSubtitleChoice();
}

function applyVideoAudioChoice() {
  if (!brVideoElement || !videoAudioSelect) return;

  const value = videoAudioSelect.value;
  const audioTracks = brVideoElement.audioTracks;

  if (audioTracks && audioTracks.length) {
    Array.from(audioTracks).forEach((track, index) => {
      try {
        track.enabled = String(index) === String(value) || String(track.id || "") === String(value);
      } catch {}
    });
  }

  if (videoState.selected?.id) {
    saveVideoPrefs(videoState.selected.id, { audio: value });
  }
}

function applyVideoSubtitleChoice() {
  if (!brVideoElement || !videoSubtitleSelect) return;

  const value = videoSubtitleSelect.value;

  Array.from(brVideoElement.textTracks || []).forEach((track, index) => {
    track.mode = value !== "off" && String(index) === String(value) ? "showing" : "disabled";
  });

  if (videoState.selected?.id) {
    saveVideoPrefs(videoState.selected.id, { subtitle: value });
  }
}

function renderVideoDetail(item) {
  if (!item) return;
  videoState.selected = item;
  showVideoTab("watch");
  videoDetailView?.classList.remove("hidden");
  videoDetailView?.scrollIntoView?.({ behavior: "smooth", block: "start" });

  const detailBackdrop = getVideoBackdropUrl(item);
  const progress = getVideoProgressPercent(item);

  if (videoDetailBackdrop) videoDetailBackdrop.style.backgroundImage = detailBackdrop ? `url("${detailBackdrop}")` : "";
  if (videoDetailPoster) videoDetailPoster.innerHTML = renderVideoPosterImage(item, "videoDetailPosterImg");
  if (videoDetailKicker) videoDetailKicker.textContent = item.year ? `BRMedia Video • ${item.year}` : "BRMedia Video";
  if (videoDetailTitle) videoDetailTitle.textContent = item.title || item.fileName || "Untitled video";
  if (videoDetailMeta) videoDetailMeta.textContent = [item.onlineRating ? `★ ${item.onlineRating}` : "Rating lookup ready", item.genre, item.runtime || (item.duration ? formatVideoDuration(item.duration) : ""), item.folder].filter(Boolean).join(" • ");

  if (videoDetailProgress) {
    videoDetailProgress.classList.toggle("hidden", !(progress > 1));
    const bar = videoDetailProgress.querySelector("span");
    if (bar) bar.style.width = `${progress.toFixed(1)}%`;
  }

  if (videoDetailOverview) videoDetailOverview.textContent = item.overview || "No online overview matched yet. Use Refresh online info, or add a .brmedia-video.json sidecar beside the file.";

  if (videoDetailBadges) {
    videoDetailBadges.innerHTML = [
      item.metadataSource ? `Info: ${item.metadataSource}` : "Local filename info",
      item.imdbId ? `IMDb: ${item.imdbId}` : "IMDb ID pending",
      item.hasPoster || item.posterUrl ? "Poster found" : "Poster placeholder",
      item.subtitles?.length ? `${item.subtitles.length} subtitle file${item.subtitles.length === 1 ? "" : "s"}` : "No subtitles detected",
      item.audioTracks?.length ? `${item.audioTracks.length} audio track${item.audioTracks.length === 1 ? "" : "s"}` : "Browser audio default",
    ].map((text) => `<span>${escapeHtml(text)}</span>`).join("");
  }

  if (videoDetailCredits) {
    const cast = Array.isArray(item.cast) ? item.cast.join(", ") : (item.cast || "");
    videoDetailCredits.innerHTML = [
      item.director ? `<div><strong>Director</strong><span>${escapeHtml(item.director)}</span></div>` : "",
      cast ? `<div><strong>Cast</strong><span>${escapeHtml(cast)}</span></div>` : "",
      item.certification ? `<div><strong>Rated</strong><span>${escapeHtml(item.certification)}</span></div>` : "",
    ].filter(Boolean).join("");
  }

  if (brVideoElement) {
    brVideoElement.pause?.();
    brVideoElement.playsInline = true;
    brVideoElement.src = getVideoStreamUrl(item);
    brVideoElement.poster = (item.hasPoster || item.posterUrl) ? getVideoPosterUrl(item) : "";
    brVideoElement.load?.();
    const resume = getVideoResumeFor(item.id);
    if (resume?.currentTime > 5) {
      brVideoElement.addEventListener("loadedmetadata", () => {
        try { brVideoElement.currentTime = Math.max(0, Number(resume.currentTime) || 0); } catch {}
      }, { once: true });
    }
  }

  brVideoElement?.addEventListener?.("loadedmetadata", () => renderVideoAudioOptions(item), { once: true });
  renderVideoAudioOptions(item);
  renderVideoSubtitleOptions(item);
  updateVideoFavouriteButton();
  updateVideoRatingUI();
  renderVideoTimerStatus();
  hydrateBrIcons(videoDetailView);
}

function openVideoById(id = "") {
  const item = findVideoById(id);
  if (!item) return;
  renderVideoDetail(item);
}

function closeVideoDetail() {
  if (brVideoElement) {
    brVideoElement.pause();
    brVideoElement.removeAttribute("src");
    brVideoElement.load?.();
  }

  videoState.selected = null;
  videoDetailView?.classList.add("hidden");
  showVideoTab("browse");
}

async function playSelectedVideo(fromStart = false) {
  if (!brVideoElement || !videoState.selected) return;

  if (!brVideoElement.currentSrc && videoState.selected) {
    brVideoElement.src = getVideoStreamUrl(videoState.selected);
    brVideoElement.load?.();
  }

  if (fromStart) brVideoElement.currentTime = 0;

  try {
    await brVideoElement.play();
  } catch (err) {
    console.warn("Video play blocked", err);
    setVideoStatus(err?.message || "This video could not start in the browser. VOB/MPEG files may need conversion/fallback.", "error");
  }
}

function normaliseModuleLibraryItems(data) {
  const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
  return items
    .filter((item) => item && item.id)
    .map((item) => ({ ...item }))
    .sort((a, b) => String(a.title || a.name || "").localeCompare(String(b.title || b.name || "")));
}

async function getModuleLibraryItems(force = false) {
  if (!force && moduleLibraryPickerState.items.length) return moduleLibraryPickerState.items;

  const res = await fetch("/library", { cache: "no-store" });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) throw new Error(data?.error || `Library request failed (${res.status})`);

  moduleLibraryPickerState.items = normaliseModuleLibraryItems(data);
  moduleMiniState.items = moduleLibraryPickerState.items;
  return moduleLibraryPickerState.items;
}

function getModuleLibraryPickerFilteredItems() {
  const query = normaliseSearchText(moduleLibraryPickerState.query || "");
  const items = moduleLibraryPickerState.items || [];
  if (!query) return items.slice(0, 250);

  return items
    .filter((item) => normaliseSearchText([
      item.title,
      item.artist,
      item.album,
      item.genre,
      item.mimeType,
      item.locator,
      item.fileName,
    ].filter(Boolean).join(" ")).includes(query))
    .slice(0, 250);
}

function renderModuleLibraryPicker() {
  if (!moduleLibraryPickerList) return;

  const items = getModuleLibraryPickerFilteredItems();

  if (!items.length) {
    moduleLibraryPickerList.innerHTML = `<div class="moduleLibraryPickerEmpty">No BRMedia library files matched that search.</div>`;
    return;
  }

  moduleLibraryPickerList.innerHTML = items.map((item) => {
    const isVideo = String(item.mimeType || item.type || item.locator || "").toLowerCase().includes("video");
    const title = item.title || item.name || item.fileName || item.id;
    const meta = formatTrackMeta(item);
    return `
      <button class="moduleLibraryPickerItem" type="button" data-library-id="${escapeHtml(item.id)}">
        <span class="moduleLibraryPickerItemIcon"><i class="fa-solid ${isVideo ? "fa-video" : "fa-file-audio"}"></i></span>
        <span>
          <strong>${escapeHtml(title)}</strong>
          <span>${escapeHtml(meta)}</span>
        </span>
        <span class="moduleLibraryPickerUse">Use file</span>
      </button>
    `;
  }).join("");

  hydrateBrIcons(moduleLibraryPickerList);
}

async function openModuleLibraryPicker(target = "tagger") {
  moduleLibraryPickerState.target = ["converter", "mastering"].includes(target) ? target : "tagger";
  moduleLibraryPickerState.query = "";

  if (moduleLibraryPickerTitle) {
    moduleLibraryPickerTitle.textContent = moduleLibraryPickerState.target === "converter"
      ? "Choose media for Converter"
      : moduleLibraryPickerState.target === "mastering"
        ? "Choose audio for Mastering"
        : "Choose media for Tagger";
  }

  if (moduleLibraryPickerSub) {
    moduleLibraryPickerSub.textContent = moduleLibraryPickerState.target === "converter"
      ? "Pick any BRMedia library file to convert. Cloud-linked files must be imported locally first."
      : moduleLibraryPickerState.target === "mastering"
        ? "Pick any local BRMedia audio file to render a mastered copy."
        : "Pick any BRMedia library file to edit tags, artwork and BRMedia routing.";
  }

  if (moduleLibraryPickerSearch) moduleLibraryPickerSearch.value = "";
  moduleLibraryPicker?.classList.remove("hidden");
  if (moduleLibraryPickerList) moduleLibraryPickerList.innerHTML = `<div class="moduleLibraryPickerEmpty">Loading BRMedia library…</div>`;

  try {
    await getModuleLibraryItems(true);
    renderModuleLibraryPicker();
    setTimeout(() => moduleLibraryPickerSearch?.focus?.(), 80);
  } catch (err) {
    console.warn("Could not load module library picker", err);
    if (moduleLibraryPickerList) {
      moduleLibraryPickerList.innerHTML = `<div class="moduleLibraryPickerEmpty">${escapeHtml(err?.message || "Could not load BRMedia library.")}</div>`;
    }
  }
}

function closeModuleLibraryPicker() {
  moduleLibraryPicker?.classList.add("hidden");
}

function selectModuleLibraryItem(id = "") {
  const track = (moduleLibraryPickerState.items || []).find((item) => String(item.id) === String(id));
  if (!track) return;

  closeModuleLibraryPicker();

  if (moduleLibraryPickerState.target === "converter") {
    setConverterSource(track, "Library file loaded in Converter.");
    return;
  }

  if (moduleLibraryPickerState.target === "mastering") {
    setMasteringSource(track, "Library file loaded in Mastering.");
    return;
  }

  setTaggerLoadedTrack(track, "Library file loaded in Tagger.");
}

function findModuleMiniTrackById(id = "") {
  const safeId = String(id || "").trim();
  if (!safeId) return null;
  return (moduleMiniState.items || moduleLibraryPickerState.items || []).find((item) => String(item.id) === safeId) || null;
}

function getRuntimeQueueTrackIds(runtimeState = {}) {
  const state = runtimeState?.state || runtimeState || {};
  const queue = Array.isArray(state.queue) ? state.queue : [];
  return queue.map((item) => String(item?.id || item || "").trim()).filter(Boolean);
}

async function refreshModuleMiniPlayer() {
  if (!moduleMiniPlayer || !moduleMiniAudio) return;

  try {
    const [runtimeRes] = await Promise.all([
      fetch("/player/runtime-state", { cache: "no-store" }),
      getModuleLibraryItems(false).catch(() => []),
    ]);
    const data = await runtimeRes.json().catch(() => ({}));
    const snapshot = data?.state || {};
    const playerState = snapshot.state || {};
    const position = snapshot.position || {};
    const queueIds = getRuntimeQueueTrackIds(snapshot);
    const wantedId = String(playerState.lastTrackId || position.id || queueIds[playerState.queueIndex || 0] || "").trim();
    const track = findModuleMiniTrackById(wantedId);

    moduleMiniState.queue = queueIds;
    moduleMiniState.queueIndex = Math.max(0, queueIds.indexOf(wantedId));
    moduleMiniState.track = track || null;
    moduleMiniState.stateLoadedAt = Date.now();

    if (!track) {
      moduleMiniPlayer.classList.add("hidden");
      document.body.classList.remove("hasModuleMiniPlayer");
      return;
    }

    moduleMiniPlayer.classList.remove("hidden");
    document.body.classList.add("hasModuleMiniPlayer");

    if (moduleMiniTitle) moduleMiniTitle.textContent = track.title || track.name || "BRMedia track";
    if (moduleMiniSub) moduleMiniSub.textContent = track.artist || track.album || "Tap play to continue in this module";
    if (moduleMiniArtLink) moduleMiniArtLink.href = `/player?trackId=${encodeURIComponent(track.id)}`;
    if (moduleMiniArt) moduleMiniArt.src = `/track/${encodeURIComponent(track.id)}/artwork?v=${Number(snapshot.savedAt || Date.now())}`;

    const streamSrc = `/stream/${encodeURIComponent(track.id)}`;
    if (!moduleMiniAudio.src || !moduleMiniAudio.src.includes(streamSrc)) {
      moduleMiniAudio.src = streamSrc;
      const savedTime = Number(position.time || position.currentTime || 0);
      if (Number.isFinite(savedTime) && savedTime > 0) {
        moduleMiniAudio.addEventListener("loadedmetadata", () => {
          try { moduleMiniAudio.currentTime = Math.max(0, savedTime); } catch {}
          updateModuleMiniProgress();
        }, { once: true });
      }
    }

    updateModuleMiniProgress();
  } catch (err) {
    console.warn("Could not refresh module mini player", err);
  }
}

function updateModuleMiniProgress() {
  if (!moduleMiniAudio || !moduleMiniProgressFill) return;
  const duration = Number(moduleMiniAudio.duration || 0);
  const current = Number(moduleMiniAudio.currentTime || 0);
  const pct = duration > 0 ? Math.max(0, Math.min(100, (current / duration) * 100)) : 0;
  moduleMiniProgressFill.style.width = `${pct}%`;

  if (btnModuleMiniPlay) {
    btnModuleMiniPlay.innerHTML = `<i class="fa-solid ${moduleMiniAudio.paused ? "fa-play" : "fa-pause"}"></i>`;
    hydrateBrIcons(btnModuleMiniPlay);
  }
}

async function toggleModuleMiniPlayback() {
  if (!moduleMiniAudio) return;
  if (!moduleMiniState.track) await refreshModuleMiniPlayer();
  if (!moduleMiniAudio.src) return;

  try {
    if (moduleMiniAudio.paused) {
      moduleMiniState.userTouched = true;
      await moduleMiniAudio.play();
    } else {
      moduleMiniAudio.pause();
    }
    updateModuleMiniProgress();
  } catch (err) {
    console.warn("Module mini player play failed", err);
    if (moduleMiniSub) moduleMiniSub.textContent = "Open Player if the browser blocks playback here.";
  }
}

function jumpModuleMiniQueue(direction = 1) {
  const ids = moduleMiniState.queue || [];
  if (!ids.length) return;
  const currentId = moduleMiniState.track?.id || "";
  const currentIndex = Math.max(0, ids.indexOf(currentId));
  const nextIndex = Math.max(0, Math.min(ids.length - 1, currentIndex + direction));
  const track = findModuleMiniTrackById(ids[nextIndex]);
  if (!track) return;

  moduleMiniState.track = track;
  moduleMiniState.queueIndex = nextIndex;
  if (moduleMiniAudio) {
    moduleMiniAudio.src = `/stream/${encodeURIComponent(track.id)}`;
    moduleMiniAudio.currentTime = 0;
  }
  if (moduleMiniTitle) moduleMiniTitle.textContent = track.title || track.name || "BRMedia track";
  if (moduleMiniSub) moduleMiniSub.textContent = track.artist || track.album || "Queue item";
  if (moduleMiniArt) moduleMiniArt.src = `/track/${encodeURIComponent(track.id)}/artwork?v=${Date.now()}`;
  if (moduleMiniArtLink) moduleMiniArtLink.href = `/player?trackId=${encodeURIComponent(track.id)}`;
  if (moduleMiniState.userTouched) void moduleMiniAudio?.play?.().catch(() => {});
  updateModuleMiniProgress();
}

async function hydrateTaggerArtworkFromTrack(trackId) {
  if (!trackId || String(trackId).startsWith("device_")) return false;

  try {
    const res = await fetch(`/track/${encodeURIComponent(trackId)}/artwork?v=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return false;

    const blob = await res.blob();
    if (!blob || !String(blob.type || "").startsWith("image/")) return false;

    taggerArtworkDataUrl = await blobToDataUrl(blob);
    renderTaggerArtworkPreview();
    syncTaggerHero(selectedTrackForModule || {}, buildTaggerPayloadFromForm());
    updateTaggerPreview();
    return true;
  } catch (err) {
    console.warn("Could not load embedded Tagger artwork", err);
    return false;
  }
}

async function hydrateTaggerEmbeddedMetadata(track = selectedTrackForModule) {
  if (window.location.pathname !== "/tagger") return;
  if (!track?.id || String(track.id).startsWith("device_")) return;

  const requestId = ++taggerMetadataRequestId;
  const trackId = String(track.id);

  try {
    setTaggerStatus("Reading embedded ID3 tags…", "");

    const res = await fetch(`/track/${encodeURIComponent(trackId)}/meta`, { cache: "no-store" });
    const meta = await res.json().catch(() => ({}));

    if (!res.ok || meta?.error) {
      throw new Error(meta?.detail || meta?.error || `Metadata request failed (${res.status})`);
    }

    if (requestId !== taggerMetadataRequestId || selectedTrackForModule?.id !== trackId) return;

    const enrichedTrack = mergeTaggerTrackWithEmbeddedMeta(selectedTrackForModule || track, meta);
    selectedTrackForModule = enrichedTrack;

    if (moduleTrackTitle) {
      moduleTrackTitle.textContent = enrichedTrack.title || enrichedTrack.id || "Selected file";
    }

    if (moduleTrackMeta) {
      moduleTrackMeta.textContent = formatTrackMeta(enrichedTrack);
    }

    const savedTags = getSavedBrMediaTags(enrichedTrack.id);
    const embeddedTags = hasPlainObjectValues(meta?.brmediaTags) ? meta.brmediaTags : {};
    const baseTags = hasPlainObjectValues(savedTags) ? savedTags : embeddedTags;

    fillTaggerForm(enrichedTrack, {
      ...baseTags,
      advancedTags: hasPlainObjectValues(baseTags?.advancedTags) ? baseTags.advancedTags : (meta?.advancedTags || {}),
      rawMetadata: baseTags?.rawMetadata || meta?.rawMetadata || "",
    });

    if (!taggerArtworkDataUrl && (meta?.hasPicture || enrichedTrack?.hasArtwork)) {
      await hydrateTaggerArtworkFromTrack(trackId);
    }

    if (hasTaggerMetadataValue(meta) || hasPlainObjectValues(embeddedTags) || hasPlainObjectValues(meta?.advancedTags)) {
      setTaggerStatus("Embedded ID3 tags loaded from the file.", "success");
    } else {
      setTaggerStatus("File loaded. No embedded ID3 tags were found in this file.", "");
    }
  } catch (err) {
    console.warn("Could not read embedded Tagger metadata", err);
    setTaggerStatus(err?.message || "Could not read embedded ID3 tags from this file.", "error");
  }
}

async function loadTaggerDeviceFile(file) {
  if (!file) return;

  taggerDeviceFile = file;
  const tempTrack = buildTemporaryDeviceTrack(file);
  setTaggerStatus(`Opening ${file.name}…`, "");

  try {
    const uploaded = await uploadTaggerDeviceFile(file);

    if (uploaded?.item?.id) {
      setTaggerLoadedTrack(uploaded.item, `Uploaded to BRMedia library: ${uploaded.item.title || file.name}`);
      taggerSourceText && (taggerSourceText.textContent = `Loaded from device: ${file.name} • ${formatBytes(file.size)}`);
      return;
    }

    setTaggerLoadedTrack(tempTrack, "File opened temporarily. Save sidecar tags or import it into BRMedia later.");
    taggerSourceText && (taggerSourceText.textContent = `Temporary file: ${file.name} • ${formatBytes(file.size)}`);
  } catch (err) {
    console.warn("Tagger upload failed", err);
    setTaggerLoadedTrack(tempTrack, "File opened temporarily. Server upload failed, so this is sidecar-only for now.");
    taggerSourceText && (taggerSourceText.textContent = `Temporary file: ${file.name} • ${formatBytes(file.size)}`);
  }
}

function renderTaggerArtworkPreview() {
  if (!taggerArtworkPreview) return;

  if (taggerArtworkDataUrl) {
    taggerArtworkPreview.innerHTML = `<img src="${taggerArtworkDataUrl}" alt="Selected artwork" />`;
    taggerArtworkPreview.classList.add("hasArtwork");
    return;
  }

  taggerArtworkPreview.classList.remove("hasArtwork");
  taggerArtworkPreview.innerHTML = `<i class="fa-solid fa-image"></i><span>No artwork selected</span>`;
}

async function loadTaggerArtworkFile(file) {
  if (!file) return;

  try {
    taggerArtworkDataUrl = await fileToDataUrl(file);
    renderTaggerArtworkPreview();
    updateTaggerPreview();
    setTaggerStatus("Artwork staged in sidecar tags. Real embedding comes with the file-writing pass.", "success");
  } catch (err) {
    setTaggerStatus(err?.message || "Could not load artwork", "error");
  }
}

function clearTaggerArtwork() {
  taggerArtworkDataUrl = "";
  if (taggerArtworkInput) taggerArtworkInput.value = "";
  renderTaggerArtworkPreview();
  updateTaggerPreview();
}

function exportTaggerSidecar() {
  const trackId = getSelectedTrackTagKey();

  if (!trackId) {
    setTaggerStatus("Open or upload a file before exporting sidecar tags.", "error");
    return;
  }

  const payload = {
    trackId,
    track: selectedTrackForModule,
    brmediaTags: buildTaggerPayloadFromForm(),
    exportedAt: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const safeName = stripFileExtension(selectedTrackForModule?.title || selectedTrackForModule?.name || "brmedia-tags")
    .replace(/[^a-z0-9_-]+/gi, "_")
    .slice(0, 80) || "brmedia-tags";

  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeName}.brmedia-tags.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 800);
  setTaggerStatus("Sidecar JSON exported.", "success");
}

function getTaggerField(id) {
  return document.getElementById(id);
}

function setTaggerStatus(message, mode = "") {
  if (!taggerStatus) return;
  taggerStatus.textContent = message;
  taggerStatus.dataset.mode = mode;
}

function formatTaggerDuration(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatTaggerAudioValue(value, suffix = "") {
  if (value === undefined || value === null || value === "") return "—";
  return `${value}${suffix}`;
}

function setTaggerAudioProperties(track = selectedTrackForModule || {}) {
  if (!taggerAudioProperties) return;

  const bitrate = track?.bitrate ? `${Math.round(Number(track.bitrate) / 1000)} kb/s` : "—";
  const sampleRate = track?.sampleRate ? `${track.sampleRate} Hz` : "—";

  taggerAudioProperties.innerHTML = `
    <div><span>Duration</span><strong>${escapeHtml(track?.duration ? formatTaggerDuration(track.duration) : "—")}</strong></div>
    <div><span>Bitrate</span><strong>${escapeHtml(bitrate)}</strong></div>
    <div><span>Sample rate</span><strong>${escapeHtml(sampleRate)}</strong></div>
    <div><span>Channels</span><strong>${escapeHtml(formatTaggerAudioValue(track?.numberOfChannels))}</strong></div>
    <div><span>Codec</span><strong>${escapeHtml(formatTaggerAudioValue(track?.codec || track?.container))}</strong></div>
  `;
}

function syncTaggerHero(track = selectedTrackForModule || {}, tags = buildTaggerPayloadFromForm()) {
  if (taggerHeroTitle) taggerHeroTitle.textContent = tags?.title || track?.title || track?.name || "No file loaded";
  if (taggerHeroMeta) taggerHeroMeta.textContent = formatTrackMeta(track || {});

  if (taggerHeroArtwork) {
    if (taggerArtworkDataUrl) {
      taggerHeroArtwork.innerHTML = `<img src="${taggerArtworkDataUrl}" alt="Artwork preview" />`;
    } else {
      taggerHeroArtwork.innerHTML = `<i class="fa-solid fa-file-music"></i>`;
      hydrateBrIcons(taggerHeroArtwork);
    }
  }

  if (taggerHeroPills) {
    const pills = [];
    if (tags?.primaryBrand) pills.push(`<span class="taggerProPill isGold">${escapeHtml(tags.primaryBrand)}</span>`);
    if (tags?.category) pills.push(`<span class="taggerProPill isBlue">${escapeHtml(getTaggerCategoryLabel(tags.category))}</span>`);
    if (tags?.releaseType) pills.push(`<span class="taggerProPill">${escapeHtml(tags.releaseType)}</span>`);
    if (track?.source || track?.sourceType) pills.push(`<span class="taggerProPill">${escapeHtml(track.source || track.sourceType)}</span>`);

    if (!pills.length) {
      pills.push(`<span class="taggerProPill isBlue">Safe / non-destructive first</span>`);
      pills.push(`<span class="taggerProPill isGold">FFmpeg write-ready</span>`);
    }

    taggerHeroPills.innerHTML = pills.join("");
  }
}

function parseTaggerRawMetadata() {
  const output = {};
  String(taggerRawMetadata?.value || "").split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const splitAt = trimmed.indexOf("=");
    if (splitAt <= 0) return;

    const key = trimmed.slice(0, splitAt).trim();
    const value = trimmed.slice(splitAt + 1).trim();
    if (key && value) output[key] = value;
  });
  return output;
}

function getTaggerAdvancedTagsFromForm() {
  const output = {};

  document.querySelectorAll("[data-tagger-advanced-key]").forEach((el) => {
    const key = el.getAttribute("data-tagger-advanced-key") || "";
    if (!key) return;

    if (el.type === "checkbox") {
      if (el.checked) output[key] = "true";
      return;
    }

    const value = String(el.value || "").trim();
    if (value) output[key] = value;
  });

  return { ...output, ...parseTaggerRawMetadata() };
}

function setTaggerAdvancedTags(tags = {}) {
  const safeTags = tags && typeof tags === "object" ? tags : {};

  document.querySelectorAll("[data-tagger-advanced-key]").forEach((el) => {
    const key = el.getAttribute("data-tagger-advanced-key") || "";
    const value = safeTags[key];

    if (el.type === "checkbox") {
      el.checked = value === true || String(value || "").toLowerCase() === "true";
      return;
    }

    el.value = value ?? "";
  });
}

function setTaggerRawMetadata(raw = "") {
  if (taggerRawMetadata) taggerRawMetadata.value = raw || "";
}

function renderTaggerAdvancedFields() {
  if (!taggerAdvancedFields || taggerAdvancedFields.dataset.rendered === "1") return;
  taggerAdvancedFields.dataset.rendered = "1";

  const groups = [
    {
      title: "Credits",
      sub: "People and production credits.",
      open: true,
      fields: [
        ["composer", "Composer"],
        ["conductor", "Conductor"],
        ["performer", "Performer"],
        ["producer", "Producer"],
        ["publisher", "Publisher"],
        ["author", "Author"],
        ["writer", "Writer"],
        ["lyricist", "Lyricist"],
        ["arranger", "Arranger"],
        ["remixer", "Remixed by"],
        ["mixer", "Mixer"],
        ["mix_dj", "Mix DJ"],
        ["musician_credits", "Musician credits", "textarea"],
      ],
    },
    {
      title: "Release / rights",
      sub: "Label, copyright, release and catalogue fields.",
      fields: [
        ["copyright", "Copyright"],
        ["license", "License"],
        ["encoded_by", "Encoded by"],
        ["encoder", "Encoder"],
        ["date", "Date"],
        ["originaldate", "Original release date"],
        ["release_date", "Release date"],
        ["release_country", "Release country"],
        ["release_status", "Release status"],
        ["release_type", "Release type"],
        ["media_type", "Media type"],
        ["catalog_number", "Catalogue number"],
        ["barcode", "Barcode"],
        ["isrc", "ISRC"],
        ["record_label", "Record label"],
      ],
    },
    {
      title: "WWW / links",
      sub: "URL fields used by extended ID3 taggers.",
      fields: [
        ["url", "WWW"],
        ["artist_url", "WWW: Artist"],
        ["audio_file_url", "WWW: Audio file"],
        ["audio_source_url", "WWW: Audio source"],
        ["commercial_url", "WWW: Commercial info"],
        ["copyright_url", "WWW: Copyright"],
        ["payment_url", "WWW: Payment"],
        ["publisher_url", "WWW: Publisher"],
        ["radio_page_url", "WWW: Radio page"],
      ],
    },
    {
      title: "Sorting / show fields",
      sub: "Sort order, show, movement and grouping metadata.",
      fields: [
        ["grouping", "Grouping"],
        ["subtitle", "Subtitle"],
        ["show_name", "Show name"],
        ["show_sort_order", "Show name sort order"],
        ["movement_name", "Movement name"],
        ["movement_number", "Movement number"],
        ["movement_total", "Movement total"],
        ["track_sort", "Track title sort order"],
        ["album_sort", "Album sort order"],
        ["artist_sort", "Artist sort order"],
        ["album_artist_sort", "Album artist sort order"],
        ["track_total", "Track total"],
        ["disc_total", "Disc total"],
        ["work", "Work title"],
        ["script", "Script"],
        ["show_movement", "Show movement"],
      ],
    },
    {
      title: "Podcast / lyrics / mood",
      sub: "Podcast, lyrics, content rating and descriptive tags.",
      fields: [
        ["podcast", "Podcast", "checkbox"],
        ["podcast_category", "Podcast category"],
        ["podcast_description", "Podcast description", "textarea"],
        ["podcast_id", "Podcast ID"],
        ["podcast_keywords", "Podcast keywords"],
        ["podcast_url", "Podcast URL"],
        ["lyrics_advisory_rating", "Lyrics advisory rating"],
        ["lyrics", "Lyrics unsynced", "textarea"],
        ["description", "Description", "textarea"],
        ["mood", "Mood"],
        ["language", "Language"],
        ["rating", "Rating"],
        ["narrator", "Narrator"],
        ["net_radio_owner", "Net radio owner"],
        ["net_radio_station", "Net radio station"],
      ],
    },
    {
      title: "ReplayGain / loudness",
      sub: "ReplayGain and loudness metadata.",
      fields: [
        ["replaygain_album_gain", "Replay Gain: Album gain"],
        ["replaygain_album_peak", "Replay Gain: Album peak"],
        ["replaygain_album_range", "Replay Gain: Album range"],
        ["replaygain_reference_loudness", "Replay Gain: Reference loudness"],
        ["replaygain_track_gain", "Replay Gain: Track gain"],
        ["replaygain_track_peak", "Replay Gain: Track peak"],
        ["replaygain_track_range", "Replay Gain: Track range"],
      ],
    },
    {
      title: "MusicBrainz / IDs",
      sub: "Fingerprint, MusicBrainz and original-file IDs.",
      fields: [
        ["MUSICBRAINZ_ALBUMARTISTID", "MusicBrainz: Album artist ID"],
        ["MUSICBRAINZ_ALBUMID", "MusicBrainz: Album ID"],
        ["MUSICBRAINZ_ALBUMRELEASECOUNTRY", "MusicBrainz: Album release country"],
        ["MUSICBRAINZ_ALBUMSTATUS", "MusicBrainz: Album status"],
        ["MUSICBRAINZ_ALBUMTYPE", "MusicBrainz: Album type"],
        ["MUSICBRAINZ_ARTISTID", "MusicBrainz: Artist ID"],
        ["MUSICBRAINZ_DISCID", "MusicBrainz: Disc ID"],
        ["MUSICBRAINZ_ORIGINALALBUMID", "MusicBrainz: Original album ID"],
        ["MUSICBRAINZ_ORIGINALARTISTID", "MusicBrainz: Original artist ID"],
        ["MUSICBRAINZ_RELEASEGROUPID", "MusicBrainz: Release group ID"],
        ["MUSICBRAINZ_RELEASETRACKID", "MusicBrainz: Release track ID"],
        ["MUSICBRAINZ_TRACKID", "MusicBrainz: Track ID"],
        ["MUSICBRAINZ_TRMID", "MusicBrainz: TRM ID"],
        ["MUSICBRAINZ_WORKID", "MusicBrainz: Work ID"],
        ["musicip_fingerprint", "MusicIP: Fingerprint"],
        ["musicip_puid", "MusicIP: PUID"],
        ["original_album", "Original album"],
        ["original_artist", "Original artist"],
        ["original_filename", "Original file name"],
        ["original_lyricist", "Original lyricist"],
      ],
    },
  ];

  taggerAdvancedFields.innerHTML = groups.map((group) => `
    <details class="taggerAdvancedGroup" ${group.open ? "open" : ""}>
      <summary>
        <span><strong>${escapeHtml(group.title)}</strong><small>${escapeHtml(group.sub)}</small></span>
        <i class="fa-solid fa-chevron-down"></i>
      </summary>
      <div class="taggerAdvancedGroupGrid">
        ${group.fields.map(([key, label, type]) => {
          const inputId = `taggerAdvanced_${String(key).replace(/[^a-z0-9_-]/gi, "_")}`;

          if (type === "checkbox") {
            return `<label class="taggerField taggerCheckField" for="${escapeHtml(inputId)}"><span>${escapeHtml(label)}</span><input id="${escapeHtml(inputId)}" data-tagger-advanced-key="${escapeHtml(key)}" type="checkbox" /></label>`;
          }

          if (type === "textarea") {
            return `<div class="taggerField taggerFieldFull"><label for="${escapeHtml(inputId)}">${escapeHtml(label)}</label><textarea id="${escapeHtml(inputId)}" data-tagger-advanced-key="${escapeHtml(key)}" rows="4"></textarea></div>`;
          }

          return `<div class="taggerField"><label for="${escapeHtml(inputId)}">${escapeHtml(label)}</label><input id="${escapeHtml(inputId)}" data-tagger-advanced-key="${escapeHtml(key)}" type="text" autocomplete="off" /></div>`;
        }).join("")}
      </div>
    </details>
  `).join("");

  hydrateBrIcons(taggerAdvancedFields);
}

function showTaggerStep(step = "overview") {
  const safeStep = step || "overview";

  document.querySelectorAll("[data-tagger-step]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.getAttribute("data-tagger-step") === safeStep);
  });

  document.querySelectorAll("[data-tagger-step-panel]").forEach((panel) => {
    panel.classList.toggle("is-active", panel.getAttribute("data-tagger-step-panel") === safeStep);
  });
}

function getSelectedTrackTagKey() {
  return selectedTrackForModule?.id || taggerLoadedFileKey || getTrackIdFromUrl();
}

function getSavedBrMediaTags(trackId = getSelectedTrackTagKey()) {
  const keys = getTaggerCustomTagKeys(selectedTrackForModule, trackId);
  const localStore = readJsonStorage(BRMEDIA_CUSTOM_TAGS_KEY, {});

  for (const key of keys) {
    if (localStore?.[key] && typeof localStore[key] === "object") return localStore[key];
    if (brMediaServerCustomTagStore?.[key] && typeof brMediaServerCustomTagStore[key] === "object") {
      return brMediaServerCustomTagStore[key];
    }
  }

  return {};
}

function collectExtraBrandsFromForm() {
  const extras = [];
  if (getTaggerField("taggerExtraBlackburn")?.checked) extras.push("Blackburn Ravers");
  if (getTaggerField("taggerExtraDjNj")?.checked) extras.push("DJ NJ");
  if (getTaggerField("taggerExtraUpalnite")?.checked) extras.push("Upalnite");
  return extras;
}

function buildTaggerPayloadFromForm() {
  return {
    title: getTaggerField("taggerTitle")?.value?.trim() || "",
    artist: getTaggerField("taggerArtist")?.value?.trim() || "",
    albumArtist: getTaggerField("taggerAlbumArtist")?.value?.trim() || "",
    album: getTaggerField("taggerAlbum")?.value?.trim() || "",
    genre: getTaggerField("taggerGenre")?.value?.trim() || "",
    label: getTaggerField("taggerLabel")?.value?.trim() || "",
    year: getTaggerField("taggerYear")?.value?.trim() || "",
    bpm: getTaggerField("taggerBpm")?.value?.trim() || "",
    key: getTaggerField("taggerKey")?.value?.trim() || "",
    country: getTaggerField("taggerCountry")?.value?.trim() || "",
    trackNumber: getTaggerField("taggerTrackNumber")?.value?.trim() || "",
    discNumber: getTaggerField("taggerDiscNumber")?.value?.trim() || "",
    comment: getTaggerField("taggerComment")?.value?.trim() || "",
    customNotes: getTaggerField("taggerCustomNotes")?.value?.trim() || "",
    artworkDataUrl: taggerArtworkDataUrl || "",
    primaryBrand: getTaggerField("taggerPrimaryBrand")?.value || "",
    extraBrands: collectExtraBrandsFromForm(),
    category: getTaggerField("taggerCategory")?.value || "",
    series: getTaggerField("taggerSeries")?.value?.trim() || "",
    episode: getTaggerField("taggerEpisode")?.value?.trim() || "",
    releaseType: getTaggerField("taggerReleaseType")?.value || "Mix",
    radioOnly: !!getTaggerField("taggerRadioOnly")?.checked,
    freeSong: !!getTaggerField("taggerFreeSong")?.checked,
    tracklistStatus: getTaggerField("taggerTracklistStatus")?.value || "None",
    advancedTags: getTaggerAdvancedTagsFromForm(),
    rawMetadata: taggerRawMetadata?.value || "",
    sourceType: selectedTrackForModule?.source || selectedTrackForModule?.sourceType || "",
    sourceLocator: selectedTrackForModule?.locator || "",
    savedAt: Date.now(),
    tagFormat: "BRMEDIA_CUSTOM_TAGS_V6",
  };
}

function setTaggerInputValue(id, value) {
  const el = getTaggerField(id);
  if (!el) return;
  if (el.type === "checkbox") el.checked = !!value;
  else el.value = value ?? "";
}

function fillTaggerForm(track = selectedTrackForModule, tags = getSavedBrMediaTags()) {
  if (!taggerPanel || window.location.pathname !== "/tagger") return;

  renderTaggerAdvancedFields();
  taggerPanel.classList.remove("hidden");
  setTaggerInputValue("taggerTitle", tags.title || track?.title || "");
  setTaggerInputValue("taggerArtist", tags.artist || track?.artist || "");
  setTaggerInputValue("taggerAlbumArtist", tags.albumArtist || track?.albumArtist || "");
  setTaggerInputValue("taggerAlbum", tags.album || track?.album || "");
  setTaggerInputValue("taggerGenre", tags.genre || track?.genre || "");
  setTaggerInputValue("taggerLabel", tags.label || track?.label || "");
  setTaggerInputValue("taggerYear", tags.year || track?.year || "");
  setTaggerInputValue("taggerBpm", tags.bpm || track?.bpm || "");
  setTaggerInputValue("taggerKey", tags.key || track?.key || "");
  setTaggerInputValue("taggerCountry", tags.country || track?.country || "");
  setTaggerInputValue("taggerTrackNumber", tags.trackNumber || track?.trackNumber || "");
  setTaggerInputValue("taggerDiscNumber", tags.discNumber || track?.discNumber || "");
  setTaggerInputValue("taggerComment", tags.comment || track?.comment || "");
  setTaggerInputValue("taggerCustomNotes", tags.customNotes || "");
  setTaggerInputValue("taggerPrimaryBrand", tags.primaryBrand || "");
  setTaggerInputValue("taggerCategory", tags.category || "");
  setTaggerInputValue("taggerSeries", tags.series || "");
  setTaggerInputValue("taggerEpisode", tags.episode || "");
  setTaggerInputValue("taggerReleaseType", tags.releaseType || "Mix");
  setTaggerInputValue("taggerTracklistStatus", tags.tracklistStatus || "None");
  setTaggerInputValue("taggerRadioOnly", tags.radioOnly === true);
  setTaggerInputValue("taggerFreeSong", tags.freeSong === true);

  const extras = Array.isArray(tags.extraBrands) ? tags.extraBrands : [];
  setTaggerInputValue("taggerExtraBlackburn", extras.includes("Blackburn Ravers"));
  setTaggerInputValue("taggerExtraDjNj", extras.includes("DJ NJ"));
  setTaggerInputValue("taggerExtraUpalnite", extras.includes("Upalnite"));

  taggerArtworkDataUrl = tags.artworkDataUrl || "";
  setTaggerAdvancedTags(tags.advancedTags || track?.advancedTags || {});
  setTaggerRawMetadata(tags.rawMetadata || track?.rawMetadata || "");
  setTaggerAudioProperties(track || {});
  renderTaggerArtworkPreview();
  syncTaggerHero(track || {}, buildTaggerPayloadFromForm());
  updateTaggerPreview();
}

function getTaggerCategoryLabel(slug) {
  const map = {
    "blackburn-ravers-mixes": "Blackburn Ravers Mixes",
    "dj-nj-mixes": "DJ NJ Mixes",
    "upalnite-mixes": "Upalnite Mixes",
    "hardcore-medley-series": "The Hardcore Medley Series",
    "ghsv-series": "Gettin High Smashin Vibes Series",
    "androidcore-ep": "The Androidcore Epic",
    "htid-mixes": "HTID Mixes",
    "makina-mayhem-series": "Makina Mayhem Series",
    "brutal-power-mixes": "Brutal Power Mixes",
    "house-music-series": "House Music Series",
    "hardhousecore-series": "Hardhousecore Series",
    "nasti-jam-mixes": "Nasti Jam Mixes",
    "radio-shows": "Radio Shows",
    "free-songs": "Blackburn Ravers Free Songs",
    "dj-mp3s-wavs": "DJ MP3s | WAVs",
  };
  return map[slug] || "Auto category";
}

function getTaggerBrandFolderLabel(brand = "") {
  const key = String(brand || "").toLowerCase();
  if (key.includes("blackburn")) return "Blackburn Ravers Mixes";
  if (key.includes("dj nj") || key === "nj") return "DJ NJ Mixes";
  if (key.includes("upalnite") || key === "up") return "Upalnite Mixes";
  return "";
}

function getTaggerBrandDestinationLabels(payload = {}) {
  const labels = [];
  const primary = String(payload.primaryBrand || "");

  if (primary === "DJ NJ & Upalnite") {
    labels.push("DJ NJ Mixes", "Upalnite Mixes");
  } else {
    const primaryLabel = getTaggerBrandFolderLabel(primary);
    if (primaryLabel) labels.push(primaryLabel);
  }

  (Array.isArray(payload.extraBrands) ? payload.extraBrands : []).forEach((brand) => {
    const label = getTaggerBrandFolderLabel(brand);
    if (label) labels.push(label);
  });

  return labels;
}

function isTaggerBrandedPayload(payload = {}) {
  return !!(
    payload.primaryBrand ||
    payload.category === "free-songs" ||
    (Array.isArray(payload.extraBrands) && payload.extraBrands.length)
  );
}

function isTaggerShortPayload(payload = {}) {
  const durationSec = Number(selectedTrackForModule?.duration || 0);
  return payload.freeSong === true || payload.releaseType === "Song" || (durationSec > 0 && durationSec < 600);
}

function renderTaggerPlacementChips(destinations = []) {
  if (!taggerPlacementChips) return;

  const unique = [...new Set(destinations)].filter(Boolean);
  taggerPlacementChips.innerHTML = unique
    .map((destination) => `<span>${escapeHtml(destination)}</span>`)
    .join("");
}

function updateTaggerPlacementRule(payload = {}, destinations = []) {
  if (!taggerPlacementRule) return;

  if (payload.radioOnly || payload.releaseType === "Radio Show") {
    taggerPlacementRule.textContent = "Radio-tagged files stay in Radio Shows only so they do not clutter the DJ/mix folders.";
    return;
  }

  if (isTaggerShortPayload(payload)) {
    taggerPlacementRule.textContent = isTaggerBrandedPayload(payload)
      ? "Under 10 minutes + BRMedia branding = Blackburn Ravers Free Songs."
      : "Under 10 minutes without BRMedia branding = DJ MP3s | WAVs.";
    return;
  }

  if (destinations.length > 1) {
    taggerPlacementRule.textContent = "Mixes can sit in a named series/category and still appear in the matching main artist folder.";
    return;
  }

  taggerPlacementRule.textContent = "Pick a brand/category to force Player placement, or leave it on Auto detect.";
}

function updateTaggerPreview() {
  if (!taggerPreviewList) return;

  const payload = buildTaggerPayloadFromForm();
  const destinations = [];

  if (payload.radioOnly || payload.releaseType === "Radio Show") {
    destinations.push("Radio Shows only");
  } else if (isTaggerShortPayload(payload)) {
    destinations.push(isTaggerBrandedPayload(payload) ? "Blackburn Ravers Free Songs" : "DJ MP3s | WAVs");
  } else {
    getTaggerBrandDestinationLabels(payload).forEach((label) => destinations.push(label));
    if (payload.category) destinations.push(getTaggerCategoryLabel(payload.category));
  }

  const unique = [...new Set(destinations)].filter(Boolean);
  taggerPreviewList.textContent = unique.join(" • ") || "Auto detect from existing metadata";
  renderTaggerPlacementChips(unique);
  updateTaggerPlacementRule(payload, unique);
  syncTaggerHero(selectedTrackForModule || {}, payload);
}

async function saveTaggerSidecarTags(options = {}) {
  const { quiet = false } = options;
  const trackId = getSelectedTrackTagKey();

  if (!trackId) {
    setTaggerStatus("Open or upload a file first.", "error");
    return { ok: false, error: "Open or upload a file first." };
  }

  const store = readJsonStorage(BRMEDIA_CUSTOM_TAGS_KEY, {});
  const payload = buildTaggerPayloadFromForm();
  const keys = getTaggerCustomTagKeys(selectedTrackForModule, trackId);

  keys.forEach((key) => {
    store[key] = payload;
  });

  writeJsonStorage(BRMEDIA_CUSTOM_TAGS_KEY, store);
  if (!quiet) setTaggerStatus("Saving BRMedia custom tags to server…", "");

  try {
    const res = await fetch("/brmedia/custom-tags", {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        trackId,
        keys,
        track: selectedTrackForModule || {},
        tags: payload,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data?.ok === false) {
      throw new Error(data?.error || `Server save failed (${res.status})`);
    }

    brMediaServerCustomTagStore = data?.store && typeof data.store === "object"
      ? data.store
      : {
          ...brMediaServerCustomTagStore,
          ...Object.fromEntries(keys.map((key) => [key, payload])),
        };

    if (!quiet) {
      setTaggerStatus(
        data?.sidecar?.written
          ? "BRMedia custom tags saved to server and sidecar file."
          : "BRMedia custom tags saved to server.",
        "success"
      );
    }

    return { ok: true, data, payload, keys, trackId };
  } catch (err) {
    console.warn("BRMedia server tag save failed", err);
    const message = `Saved on this device, but server save failed: ${err?.message || err}`;
    setTaggerStatus(message, "error");
    return { ok: false, error: message, payload, keys, trackId };
  }
}

function renderTaggerWriteResult(data = {}) {
  if (!btnTaggerWriteResult) return;

  if (!data?.ok) {
    btnTaggerWriteResult.classList.add("hidden");
    btnTaggerWriteResult.innerHTML = "";
    return;
  }

  const modeLabel = data.mode === "replace" ? "Original replaced safely" : "Tagged copy created";
  const backupLine = data.backupFileName
    ? `<br><span>Backup: ${escapeHtml(data.backupFileName)}</span>`
    : "";

  btnTaggerWriteResult.classList.remove("hidden");
  btnTaggerWriteResult.innerHTML = `
    <strong>${escapeHtml(data.item?.title || data.fileName || modeLabel)}</strong><br>
    <span>${escapeHtml(data.note || "Original file was not changed.")}</span>${backupLine}
    <div class="taggerWriteLinks">
      ${data.item?.id ? `<a href="/player?trackId=${encodeURIComponent(data.item.id)}">Open in Player</a>` : ""}
      ${data.downloadUrl ? `<a href="${data.downloadUrl}">Download</a>` : ""}
    </div>
  `;
}

function getTaggerSaveMode() {
  return document.querySelector('input[name="taggerSaveMode"]:checked')?.value || "copy";
}

function syncTaggerSaveModeUI() {
  const mode = getTaggerSaveMode();
  document.getElementById("taggerOverwriteWarning")?.classList.toggle("hidden", mode !== "replace");

  const label = btnTaggerWriteCopy?.querySelector("span");
  if (label) label.textContent = mode === "replace" ? "Replace original" : "Write tagged copy";
}

async function writeTaggerTaggedCopy(options = {}) {
  const { download = false } = options;
  const mode = download ? "copy" : getTaggerSaveMode();
  const trackId = getSelectedTrackTagKey();

  if (!trackId) {
    setTaggerStatus("Open or upload a file first.", "error");
    return;
  }

  if (mode === "replace") {
    const ok = window.confirm(
      "This will replace the original file. A backup will be created first. Continue?"
    );

    if (!ok) {
      setTaggerStatus("Replace original cancelled.", "");
      return;
    }
  }

  renderTaggerWriteResult({});

  const saved = await saveTaggerSidecarTags({ quiet: true });
  if (!saved.ok) return;

  setTaggerStatus(mode === "replace" ? "Writing replacement with automatic backup…" : "Writing tagged copy with FFmpeg…", "");

  try {
    const res = await fetch("/brmedia/tagger/write-copy", {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        trackId,
        keys: saved.keys,
        track: selectedTrackForModule || {},
        tags: buildTaggerPayloadFromForm(),
        mode,
        download,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data?.ok === false) {
      throw new Error(data?.error || `Tagged write failed (${res.status})`);
    }

    renderTaggerWriteResult(data);
    setTaggerStatus(
      data.mode === "replace"
        ? "Original replaced safely. Backup was created first."
        : "Tagged copy created. Original file was not changed.",
      "success"
    );

    if (download && data.downloadUrl) {
      window.location.assign(data.downloadUrl);
    }
  } catch (err) {
    console.warn("BRMedia tagged write failed", err);
    setTaggerStatus(err?.message || "Tagged write failed", "error");
  }
}

async function hydrateSelectedTrack() {
  const trackId = getTrackIdFromUrl();

  if (!trackId || !moduleTrackPanel) {
    if (window.location.pathname === "/tagger") {
      taggerPanel?.classList.remove("hidden");
      setTaggerStatus("Open Tagger from a Player file to load metadata.", "");
    }
    return;
  }

  moduleTrackPanel.classList.remove("hidden");

  if (moduleTrackTitle) {
    moduleTrackTitle.textContent = "Loading selected file…";
  }

  if (moduleTrackMeta) {
    moduleTrackMeta.textContent = trackId;
  }

  try {
    await refreshServerCustomTags();
    const items = await getLibraryItems();
    const track = items.find((item) => item.id === trackId);

    if (!track) {
      if (moduleTrackTitle) moduleTrackTitle.textContent = "Selected file not found";
      if (moduleTrackMeta) moduleTrackMeta.textContent = `Track id: ${trackId}`;
      return;
    }

    if (window.location.pathname === "/converter") {
      setConverterSource(track, "Selected file loaded in Converter.");
      return;
    }

    if (window.location.pathname === "/mastering") {
      setMasteringSource(track, "Selected file loaded in Mastering.");
      return;
    }

    setTaggerLoadedTrack(track, "Selected file loaded in Tagger.");
  } catch (err) {
    if (moduleTrackTitle) moduleTrackTitle.textContent = "Could not load selected file";
    if (moduleTrackMeta) moduleTrackMeta.textContent = String(err?.message || err);
  }
}

function handleModuleSidebarOpen(e) {
  e?.preventDefault?.();
  e?.stopPropagation?.();
  openModuleSidebar();
}

function handleModuleSidebarClose(e) {
  e?.preventDefault?.();
  e?.stopPropagation?.();
  closeModuleSidebar();
}

function addModuleTapHandler(el, handler) {
  if (!el || typeof handler !== "function") return;

  let startX = 0;
  let startY = 0;
  let moved = false;
  let movedAt = 0;

  const start = (e) => {
    const point = e.touches?.[0] || e;
    startX = Number(point.clientX || 0);
    startY = Number(point.clientY || 0);
    moved = false;
  };

  const move = (e) => {
    const point = e.touches?.[0] || e;
    const dx = Math.abs(Number(point.clientX || 0) - startX);
    const dy = Math.abs(Number(point.clientY || 0) - startY);

    if (dx > 10 || dy > 10) {
      moved = true;
      movedAt = Date.now();
    }
  };

  const reset = () => {
    window.setTimeout(() => {
      moved = false;
    }, 220);
  };

  el.addEventListener("pointerdown", start, { passive: true });
  el.addEventListener("pointermove", move, { passive: true });
  el.addEventListener("pointercancel", reset, { passive: true });
  el.addEventListener("pointerup", reset, { passive: true });
  el.addEventListener("click", (e) => {
    if (moved || Date.now() - movedAt < 260) {
      e.preventDefault?.();
      e.stopPropagation?.();
      return;
    }

    handler(e);
  });
}

addModuleTapHandler(btnModuleMenu, handleModuleSidebarOpen);
addModuleTapHandler(btnModuleSidebarClose, handleModuleSidebarClose);
addModuleTapHandler(document.getElementById("btnModuleSidebarCloseFloating"), handleModuleSidebarClose);
addModuleTapHandler(moduleSidebarBackdrop, handleModuleSidebarClose);

window.addEventListener("scroll", syncModuleMenuDockState, { passive: true });
window.addEventListener("resize", syncModuleMenuDockState);
requestAnimationFrame(syncModuleMenuDockState);

moduleSidebar?.addEventListener("pointerdown", (e) => {
  moduleSidebarScrollLock.startX = Number(e.clientX || 0);
  moduleSidebarScrollLock.startY = Number(e.clientY || 0);
  moduleSidebarScrollLock.dragging = false;
}, { passive: true });

moduleSidebar?.addEventListener("pointermove", (e) => {
  const dx = Math.abs(Number(e.clientX || 0) - moduleSidebarScrollLock.startX);
  const dy = Math.abs(Number(e.clientY || 0) - moduleSidebarScrollLock.startY);

  if (dx > 10 || dy > 10) {
    moduleSidebarScrollLock.dragging = true;
    moduleSidebarScrollLock.movedAt = Date.now();
  }
}, { passive: true });

["pointerup", "pointercancel", "touchend"].forEach((eventName) => {
  moduleSidebar?.addEventListener(eventName, () => {
    window.setTimeout(() => {
      moduleSidebarScrollLock.dragging = false;
    }, 260);
  }, { passive: true });
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModuleSidebar();
});

moduleTrackClear?.addEventListener("click", () => {
  const cleanUrl = `${window.location.origin}${window.location.pathname}`;
  window.history.replaceState({}, "", cleanUrl);

  moduleTrackPanel?.classList.add("hidden");
});

const config = MODULE_CONFIG[window.location.pathname] || MODULE_CONFIG["/converter"];

document.body.classList.toggle("moduleSearchAllowed", window.location.pathname === "/video-player");
document.body.classList.toggle("moduleVideoMode", window.location.pathname === "/video-player");
document.body.classList.toggle("moduleToolLive", ["/converter", "/tagger", "/mastering", "/video-player"].includes(window.location.pathname));

if (window.location.pathname === "/converter") {
  converterPanel?.classList.remove("hidden");
  resetConverter();
}

if (window.location.pathname === "/mastering") {
  masteringPanel?.classList.remove("hidden");
  resetMastering();
}

if (window.location.pathname === "/video-player") {
  videoPanel?.classList.remove("hidden");
  showVideoTab("browse");
  renderVideoTimerStatus();

  if (videoState.timerEndAt) {
    window.clearInterval(videoState.timerInterval);
    videoState.timerInterval = window.setInterval(tickVideoTimer, 1000);
  }

  void fetchVideoLibrary(false).catch((err) => {
    console.warn("Video library load failed", err);
    setVideoStatus(err?.message || "Could not load C:\\Videos", "error");
  });
}

if (window.location.pathname === "/tagger") {
  taggerPanel?.classList.remove("hidden");
}

if (moduleEyebrow) moduleEyebrow.textContent = config.eyebrow;
if (moduleTitle) moduleTitle.textContent = config.title;
if (moduleSubtitle) moduleSubtitle.textContent = config.subtitle;
if (moduleComingSoonBody) moduleComingSoonBody.textContent = config.body;
if (moduleStatusTitle) moduleStatusTitle.textContent = config.action;
if (moduleStatusIcon) {
  moduleStatusIcon.innerHTML = `<i class="${config.icon}"></i>`;
  hydrateBrIcons(moduleStatusIcon);
}
if (moduleFooterCopy) moduleFooterCopy.textContent = `© The Blackburn Ravers • DJ NJ & Upalnite ${new Date().getFullYear()}`;
if (moduleSearchBtn && window.location.pathname === "/video-player") {
  moduleSearchBtn.setAttribute("href", "#videoSearchInput");
  moduleSearchBtn.setAttribute("aria-label", "Search video library");
}

document.title = `${config.title} • BRMedia`;

let moduleNavLockUntil = 0;

function navigateModuleLink(e, link) {
  if (!link?.href) return;

  const now = Date.now();

  if (moduleSidebarScrollLock.dragging || now - moduleSidebarScrollLock.movedAt < 280) {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    return;
  }
  if (now < moduleNavLockUntil) return;
  moduleNavLockUntil = now + 650;

  e?.preventDefault?.();
  e?.stopPropagation?.();

  closeModuleSidebar();
  window.location.assign(link.href);
}

document.querySelectorAll(".moduleSidebarLink[data-path]").forEach((link) => {
  const path = link.getAttribute("data-path") || "";

  if (path === window.location.pathname) {
    link.classList.add("is-active");
  }

  addModuleTapHandler(link, (e) => navigateModuleLink(e, link));
});

converterPanel?.addEventListener("input", updateConverterPreview);
converterPanel?.addEventListener("change", updateConverterPreview);

moduleSearchBtn?.addEventListener("click", (e) => {
  if (window.location.pathname !== "/video-player") return;
  e.preventDefault();
  videoSearchInput?.focus?.();
});

btnVideoRefresh?.addEventListener("click", () => void fetchVideoLibrary(true).catch((err) => setVideoStatus(err?.message || "Could not scan C:\\Videos", "error")));
btnVideoMatchMissing?.addEventListener("click", () => void fetchVideoLibrary(true, true).catch((err) => setVideoStatus(err?.message || "Could not match video info", "error")));
btnVideoMatchSelected?.addEventListener("click", () => void refreshSelectedVideoMetadata(true));
videoSearchInput?.addEventListener("input", () => {
  videoState.query = videoSearchInput.value || "";
  renderVideoWall();
});
videoSortSelect?.addEventListener("change", () => {
  videoState.sort = videoSortSelect.value || "title";
  renderVideoWall();
});
document.querySelectorAll("[data-video-filter]").forEach((btn) => {
  btn.addEventListener("click", () => {
    videoState.filter = btn.getAttribute("data-video-filter") || "all";
    renderVideoWall();
  });
});
videoModeTabs.forEach((btn) => {
  btn.addEventListener("click", () => showVideoTab(btn.getAttribute("data-video-tab") || "browse"));
});

btnVideoOpenSpotlight?.addEventListener("click", () => openVideoById(videoState.spotlightId || ""));
btnVideoSidebarHome?.addEventListener("click", () => setVideoSidebarGenre(""));
videoSidebarGenreList?.addEventListener("click", (e) => {
  const btn = e.target?.closest?.("[data-video-sidebar-genre]");
  if (!btn) return;
  setVideoSidebarGenre(btn.getAttribute("data-video-sidebar-genre") || "");
});
videoPosterWall?.addEventListener("click", (e) => {
  const card = e.target?.closest?.("[data-video-id]");
  if (card) openVideoById(card.getAttribute("data-video-id") || "");
});
videoContinueRail?.addEventListener("click", (e) => {
  const card = e.target?.closest?.("[data-video-id]");
  if (card) openVideoById(card.getAttribute("data-video-id") || "");
});

videoFavouritesWall?.addEventListener("click", (e) => {
  const card = e.target?.closest?.("[data-video-id]");
  if (card) openVideoById(card.getAttribute("data-video-id") || "");
});

videoBookmarksList?.addEventListener("click", (e) => {
  const row = e.target?.closest?.("[data-video-id][data-video-time]");
  if (!row) return;

  openVideoById(row.getAttribute("data-video-id") || "");
  const targetTime = Number(row.getAttribute("data-video-time") || 0);

  brVideoElement?.addEventListener("loadedmetadata", () => {
    try { brVideoElement.currentTime = targetTime; } catch {}
  }, { once: true });
});

btnVideoBackToWall?.addEventListener("click", closeVideoDetail);
btnVideoResume?.addEventListener("click", () => void playSelectedVideo(false));
btnVideoRestart?.addEventListener("click", () => void playSelectedVideo(true));
btnVideoFullscreen?.addEventListener("click", () => {
  if (brVideoElement?.requestFullscreen) void brVideoElement.requestFullscreen();
  else if (brVideoElement?.webkitEnterFullscreen) brVideoElement.webkitEnterFullscreen();
});
btnVideoToggleFavourite?.addEventListener("click", toggleVideoFavourite);
btnVideoAddBookmark?.addEventListener("click", addVideoBookmark);

videoRatingStars?.addEventListener("click", (e) => {
  const btn = e.target?.closest?.("[data-video-rating]");
  if (!btn || !videoState.selected?.id) return;

  saveVideoRating(videoState.selected.id, btn.getAttribute("data-video-rating") || 0);
  updateVideoRatingUI();
  renderVideoCollections();
  renderVideoWall();
});

btnVideoTimerApply?.addEventListener("click", applyVideoTimer);
btnVideoCast?.addEventListener("click", () => void openVideoCastPicker());
btnVideoPiP?.addEventListener("click", () => void toggleVideoPictureInPicture());

videoAudioSelect?.addEventListener("change", applyVideoAudioChoice);
videoSubtitleSelect?.addEventListener("change", applyVideoSubtitleChoice);
brVideoElement?.addEventListener("timeupdate", () => {
  if (videoState.selected) saveVideoResume(videoState.selected.id, brVideoElement.currentTime, brVideoElement.duration);
});
brVideoElement?.addEventListener("error", () => {
  const err = brVideoElement?.error;
  const message = err?.message || "This video format/codec could not play in the browser. VOB/MPEG may need conversion or fallback.";
  setVideoStatus(message, "error");
});

brVideoElement?.addEventListener("ended", () => {
  if (videoState.selected) saveVideoResume(videoState.selected.id, 0, brVideoElement.duration);

  if (videoState.timerMode === "end") {
    brVideoElement.pause();
    clearVideoTimer();
    setVideoStatus("Video timer finished at the end of the film.", "success");
  }

  renderVideoWall();
});

btnConverterPickDevice?.addEventListener("click", () => converterDeviceFileInput?.click());

btnConverterUseSelected?.addEventListener("click", () => {
  void openModuleLibraryPicker("converter");
});

converterDeviceFileInput?.addEventListener("change", () => {
  const file = converterDeviceFileInput.files?.[0];
  if (file) loadConverterDeviceFile(file);
});

document.querySelectorAll("[data-converter-kind]").forEach((btn) => {
  btn.addEventListener("click", () => setConverterKind(btn.getAttribute("data-converter-kind") || "audio"));
});

document.querySelectorAll("[data-converter-preset]").forEach((btn) => {
  btn.addEventListener("click", () => applyConverterPreset(btn.getAttribute("data-converter-preset") || ""));
});

btnConverterStart?.addEventListener("click", () => {
  void startConverterJob();
});

btnConverterReset?.addEventListener("click", resetConverter);
btnConverterCancel?.addEventListener("click", () => void cancelConverterJob());

masteringPanel?.addEventListener("input", updateMasteringPreview);
masteringPanel?.addEventListener("change", updateMasteringPreview);
btnMasteringPickDevice?.addEventListener("click", () => masteringDeviceFileInput?.click());
btnMasteringChooseLibrary?.addEventListener("click", () => void openModuleLibraryPicker("mastering"));
masteringDeviceFileInput?.addEventListener("change", () => {
  const file = masteringDeviceFileInput.files?.[0];
  if (file) void loadMasteringDeviceFile(file);
});
document.querySelectorAll("[data-mastering-preset]").forEach((btn) => {
  btn.addEventListener("click", () => applyMasteringPreset(btn.getAttribute("data-mastering-preset") || "streaming-clean"));
});
masteringTabs.forEach((btn) => {
  btn.addEventListener("click", () => showMasteringTab(btn.getAttribute("data-mastering-tab") || "source"));
});
btnMasteringAnalyze?.addEventListener("click", () => void requestMasteringAnalysis());
btnMasteringStart?.addEventListener("click", () => void startMasteringJob());
btnMasteringCancel?.addEventListener("click", () => void cancelMasteringJob());
btnMasteringReset?.addEventListener("click", resetMastering);

taggerPanel?.addEventListener("input", updateTaggerPreview);
taggerPanel?.addEventListener("change", updateTaggerPreview);

btnModuleLibraryPickerClose?.addEventListener("click", closeModuleLibraryPicker);
moduleLibraryPicker?.addEventListener("click", (e) => {
  if (e.target === moduleLibraryPicker) closeModuleLibraryPicker();
});
moduleLibraryPickerSearch?.addEventListener("input", () => {
  moduleLibraryPickerState.query = moduleLibraryPickerSearch.value || "";
  renderModuleLibraryPicker();
});
moduleLibraryPickerList?.addEventListener("click", (e) => {
  const row = e.target?.closest?.("[data-library-id]");
  if (row) selectModuleLibraryItem(row.getAttribute("data-library-id") || "");
});

document.querySelectorAll("[data-tagger-step]").forEach((btn) => {
  btn.addEventListener("click", () => showTaggerStep(btn.getAttribute("data-tagger-step") || "overview"));
});

document.querySelectorAll("[data-tagger-jump]").forEach((btn) => {
  btn.addEventListener("click", () => showTaggerStep(btn.getAttribute("data-tagger-jump") || "overview"));
});

btnTaggerPickDevice?.addEventListener("click", () => taggerDeviceFileInput?.click());
btnTaggerChooseLibrary?.addEventListener("click", () => {
  void openModuleLibraryPicker("tagger");
});

taggerDeviceFileInput?.addEventListener("change", () => {
  const file = taggerDeviceFileInput.files?.[0];
  if (file) void loadTaggerDeviceFile(file);
});

btnTaggerPickArtwork?.addEventListener("click", () => taggerArtworkInput?.click());
btnTaggerClearArtwork?.addEventListener("click", clearTaggerArtwork);

taggerArtworkInput?.addEventListener("change", () => {
  const file = taggerArtworkInput.files?.[0];
  if (file) void loadTaggerArtworkFile(file);
});

btnTaggerSave?.addEventListener("click", () => {
  void saveTaggerSidecarTags();
});
btnTaggerWriteCopy?.addEventListener("click", () => {
  void writeTaggerTaggedCopy({ download: false });
});
btnTaggerWriteDownload?.addEventListener("click", () => {
  void writeTaggerTaggedCopy({ download: true });
});
btnTaggerExportSidecar?.addEventListener("click", exportTaggerSidecar);
btnTaggerReset?.addEventListener("click", () => fillTaggerForm(selectedTrackForModule, {}));

document.querySelectorAll('input[name="taggerSaveMode"]').forEach((el) => {
  el.addEventListener("change", syncTaggerSaveModeUI);
});
syncTaggerSaveModeUI();

btnModuleMiniPlay?.addEventListener("click", () => void toggleModuleMiniPlayback());
btnModuleMiniPrev?.addEventListener("click", () => jumpModuleMiniQueue(-1));
btnModuleMiniNext?.addEventListener("click", () => jumpModuleMiniQueue(1));
moduleMiniAudio?.addEventListener("timeupdate", updateModuleMiniProgress);
moduleMiniAudio?.addEventListener("play", updateModuleMiniProgress);
moduleMiniAudio?.addEventListener("pause", updateModuleMiniProgress);
moduleMiniAudio?.addEventListener("ended", () => jumpModuleMiniQueue(1));

renderTaggerAdvancedFields();
showTaggerStep("overview");
startBrIconHydrator();
void refreshServerCustomTags().finally(() => hydrateSelectedTrack());
void refreshModuleMiniPlayer();
window.setInterval(() => {
  if (!moduleMiniAudio || moduleMiniAudio.paused) void refreshModuleMiniPlayer();
}, 10000);