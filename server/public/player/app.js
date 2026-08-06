window.addEventListener("error", (e) => {
  console.error("BRMedia error", e?.error || e?.message || e);
});

const $ = (id) => document.getElementById(id);

function iconHtml(iconName = "circle") {
  const safeName = String(iconName || "circle")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "") || "circle";

  return `<i class="fa-solid fa-${safeName}" aria-hidden="true"></i>`;
}

const BR_ICON_BASE_PATHS = ["/shared/icons/fa-duotone/", "/player/branding/icons/"];
const BR_ICON_DEFAULT_PRIMARY = "#ffffff";
const BR_ICON_DEFAULT_SECONDARY = "#f2a007";

const BR_ICON_CLASS_MAP = {
  "align-left": "list-music",
  "angles-left": "angles-left",
  "angles-right": "angles-right",
  "arrow-left": "chevron-left",
  "arrow-up-wide-short": "filter-list",
  "arrows-rotate": "arrow-rotate-right",

  backward: "backward",
  "backward-fast": "backward-fast",
  "backward-step": "backward-step",

  ban: "ban",
  bars: "list-music",
  "bars-staggered": "list-music",
  bolt: "bolt",
  bookmark: "bookmark",
  "box-archive": "folder-open",

  "calendar-days": "calendar-days",
  "chart-column": "chart-column",
  check: "check",
  "chevron-down": "chevron-down",
  "chevron-left": "chevron-left",
  "chevron-right": "chevron-right",
  "chevron-up": "chevron-up",
  circle: "circle",
  "circle-check": "circle-check",
  "circle-info": "circle-info",
  "circle-play": "play",
  "circle-question": "circle-question",
  clock: "clock",
  "clock-rotate-left": "clock-rotate-left",	
  "cloud-arrow-down": "cloud-arrow-down",
  "cloud-arrow-up": "cloud-arrow-up",
  "compact-disc": "compact-disc",

  desktop: "desktop",
  download: "download",
  dropbox: "dropbox",

  ellipsis: "ellipsis",

  file: "file",
  "file-audio": "file-music",
  "file-circle-plus": "file-circle-plus",
  "file-export": "file-export",
  "file-image": "file-image",
  "file-import": "cloud-arrow-down",
  "file-lines": "file-lines",
  "file-arrow-up": "file-arrow-up",
  film: "video",
  filter: "filter",
  filters: "filters",
  fire: "fire",
  flag: "flag",
  "floppy-disk": "floppy-disk",
  folder: "folder",
  "folder-open": "folder-open",
  "folder-plus": "folder-plus",

  forward: "forward",
  "forward-fast": "forward-fast",
  "forward-step": "forward-step",

  "gauge-high": "gauge-high",
  gear: "gear-complex",
  "google-drive": "google-drive",
  "grip-vertical": "grip-vertical",

  hashtag: "hashtag",
  headphones: "headphones",
  heart: "heart",
  house: "house",

  laptop: "laptop",
  link: "music-magnifying-glass",
  list: "list-music",
  "list-check": "list-check",
  "list-ol": "list-ol",
  "list-ul": "list-music",
  "location-dot": "location-dot",

  "magnifying-glass": "magnifying-glass-music",
  "magnifying-glass-chart": "music-magnifying-glass",
  microphone: "microphone",
  mixcloud: "mixcloud",
  "mobile-screen": "mobile-screen",
  "mobile-screen-button": "mobile-screen-button",
  music: "music",

  paperclip: "paperclip",
  pause: "pause",
  pen: "tag",
  "pen-to-square": "tag",
  play: "play",
  plus: "plus",

  radio: "radio",
  "record-vinyl": "record-vinyl",
  repeat: "repeat",
  "repeat-1": "repeat-1",
  retweet: "retweet",
  "right-left": "right-left",
  "rotate-left": "arrow-rotate-left",
  "rotate-right": "arrow-rotate-right",

  "screwdriver-wrench": "gear-complex",
  server: "server",
  "share-from-square": "share-from-square",
  "share-nodes": "share-nodes",
  shuffle: "shuffle",
  sliders: "sliders",
  "sliders-up": "sliders-up",
  soundcloud: "soundcloud",
  spinner: "spinner",
  star: "star",
  stop: "stop",
  stopwatch: "stopwatch",
  "stopwatch-20": "stopwatch-20",

  "table-cells-large": "list-music",
  "tablet-screen-button": "tablet-screen-button",
  tag: "tag",
  tags: "tags",
  "tower-broadcast": "list-radio",
  trash: "trash",
  "triangle-exclamation": "triangle-exclamation",
  tv: "tv-music",

  "up-right-and-down-left-from-center": "up-down-left-right",
  upload: "upload",
  "up-right-from-square": "share-from-square",

  user: "user-music",
  "user-tie": "user-tie",
  users: "users",

  "volume-high": "volume-high",
  "volume-low": "volume-low",
  "volume-off": "volume-off",
  "volume-slash": "volume-slash",
  "volume-xmark": "volume-xmark",

  "wave-square": "waveform-lines",
  waveform: "waveform",
  "waveform-lines": "waveform-lines",
  whatsapp: "whatsapp",
  xmark: "xmark",
};

const BR_ICON_BRAND_CLASS_MAP = {
  "google-drive": "brIconBrandGoogleDrive",
  dropbox: "brIconBrandDropbox",
  soundcloud: "brIconBrandSoundcloud",
  mixcloud: "brIconBrandMixcloud",
  whatsapp: "brIconBrandWhatsapp",
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

function getBrIconSvgName(iconName = "") {
  if (window.BRMediaIcons?.resolveSvgName) {
    return BR_ICON_CLASS_MAP[iconName] || window.BRMediaIcons.resolveSvgName(iconName) || "";
  }

  return BR_ICON_CLASS_MAP[iconName] || iconName || "";
}

function applyBrIconStateClasses(el, iconName, svgName) {
  el.classList.add("brSvgIconHost");

  Object.values(BR_ICON_BRAND_CLASS_MAP).forEach((className) => el.classList.remove(className));

  const brandClass = BR_ICON_BRAND_CLASS_MAP[iconName] || BR_ICON_BRAND_CLASS_MAP[svgName];
  if (brandClass) el.classList.add(brandClass);

  el.classList.toggle("brSvgIconDanger", ["trash"].includes(svgName));
  el.classList.toggle("brSvgIconMuted", el.closest(".disabledLike, [disabled], .is-disabled") !== null);
}

async function loadBrIconSvg(svgName) {
  if (brIconSvgCache.has(svgName)) return brIconSvgCache.get(svgName);

  if (window.BRMediaIcons?.loadSvg) {
    const promise = window.BRMediaIcons.loadSvg(svgName);
    brIconSvgCache.set(svgName, promise);
    return promise;
  }

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

  applyBrIconStateClasses(el, iconName, svgName);

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

function setBrFaIconClass(el, className) {
  if (!el) return;

  el.className = className;

  const iconName = getBrIconNameFromElement(el);
  const svgName = getBrIconSvgName(iconName);

  if (!svgName) {
    el.innerHTML = "";
    return;
  }

  const changed = el.dataset.brIconName !== iconName || el.dataset.brIconSvg !== svgName;

  applyBrIconStateClasses(el, iconName, svgName);

  if (changed) {
    el.innerHTML = "";
    el.dataset.brIconHydrated = "0";
  }

  void hydrateBrIcon(el);
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

  // Important:
  // iPhone/Safari was crashing with the full-page MutationObserver + many SVG fetches.
  // For now, hydrate static icons once, slowly, and do not observe the whole app.
  brIconObserver = { safeMode: true };

  const run = () => hydrateBrIcons(document);

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 1600 });
    return;
  }

  window.setTimeout(run, 900);
}

function refreshDynamicIconArea(root) {
  if (!root) return;

  const run = () => hydrateBrIcons(root);

  if (typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(run);
    return;
  }

  window.setTimeout(run, 0);
}

const audio = $("audio");
const trackListEl = $("trackList");
const favouritesListEl = $("favouritesList");
const recentsListEl = $("recentsList");
const queueListEl = $("queueList");
const miniPlayer = $("miniPlayer");
const miniTitle = $("miniTitle");
const miniSub = $("miniSub");
const miniArt = $("miniArt");
const btnPrev = $("btnPrev");
const btnPlay = $("btnPlay");
const btnPlayIcon = $("btnPlayIcon");
const btnNext = $("btnNext");
const btnMiniEq = $("btnMiniEq");
const btnMiniCollapse = $("btnMiniCollapse");
const miniProgressFill = $("miniProgressFill");

const nowPlayingModal = $("nowPlayingModal");
const btnCloseNowPlaying = $("btnCloseNowPlaying");

const artworkEl = $("artwork");
const brandMixWrap = $("mixBadgeWrap");
const brandMixIcon = $("brandMixIcon");
const brandMixArtist = $("brandMixArtist");

const btnOpenStagePlayer = $("btnOpenStagePlayer");
const stagePlayerModal = $("stagePlayerModal");
const btnCloseStagePlayer = $("btnCloseStagePlayer");
const btnStageFlip = $("btnStageFlip");
const stageBackdrop = $("stageBackdrop");
const stageArtwork = $("stageArtwork");
const stageTitleTrack = $("stageTitleTrack");
const stageTitleTextA = $("stageTitleTextA");
const stageTitleTextB = $("stageTitleTextB");
const stageSubTrack = $("stageSubTrack");
const stageSubTextA = $("stageSubTextA");
const stageSubTextB = $("stageSubTextB");
const stageCurrentTrackBox = $("stageCurrentTrackBox");
const stageCurrentTrackTrack = $("stageCurrentTrackTrack");
const stageCurrentTrackTextA = $("stageCurrentTrackTextA");
const stageCurrentTrackTextB = $("stageCurrentTrackTextB");
const btnStageResume = $("btnStageResume");
const stagePauseMeta = $("stagePauseMeta");
const stagePauseTitle = $("stagePauseTitle");
const stagePauseSub = $("stagePauseSub");
const stageWaveformViewport = $("stageWaveformViewport");
const stageWaveformEl = $("stageWaveform");
const stageTimeCur = $("stageTimeCur");
const stageTimeTotal = $("stageTimeTotal");
const stageTracklistTitle = $("stageTracklistTitle");
const stageTracklistSub = $("stageTracklistSub");
const stageTracklistMeta = $("stageTracklistMeta");
const stageTracklistList = $("stageTracklistList");
const stageTracklistEmpty = $("stageTracklistEmpty");

const npTitleTrack = $("npTitleTrack");
const npTitleTextA = $("npTitleTextA");
const npTitleTextB = $("npTitleTextB");
const npSubTrack = $("npSubTrack");
const npSubTextA = $("npSubTextA");
const npSubTextB = $("npSubTextB");

const btnFavQuick = $("btnFavQuick");
const btnFavQuickIcon = $("btnFavQuickIcon");
const btnBookmarkQuick = $("btnBookmarkQuick");
const btnPlayerMoreQuick = $("btnPlayerMoreQuick");

const seek = $("seek");
const timeCur = $("timeCur");
const timeRem = $("timeRem");
const fileInfoLine = $("fileInfoLine");

const btnNPPrev = $("btnNPPrev");
const btnNPPlay = $("btnNPPlay");
const btnNPPlayIcon = $("btnNPPlayIcon");
const btnNPNext = $("btnNPNext");
const btnBackN = $("btnBackN");
const btnBackNText = $("btnBackNText");
const btnFwdN = $("btnFwdN");
const btnFwdNText = $("btnFwdNText");
const btnTimedPrev = $("btnTimedPrev");
const btnTimedNext = $("btnTimedNext");

const btnShuffleTransport = $("btnShuffleTransport");
const icoShuffleTransport = $("icoShuffleTransport");
const btnRepeatTransport = $("btnRepeatTransport");
const icoRepeatTransport = $("icoRepeatTransport");
const imgPlayState = $("imgPlayState");

const btnSleep = $("btnSleep");
const btnTopDownload = $("btnTopDownload");
const btnOpenBookmarksTop = $("btnOpenBookmarksTop");
const btnTopMenu = $("btnTopMenu");
const sleepStatus = $("sleepStatus");
const stageSleepTimerBox = $("stageSleepTimerBox");
const stageSleepTimerText = $("stageSleepTimerText");

const tracklistMeta = $("tracklistMeta");
const tracklistDescription = $("tracklistDescription");
const tracklistTracks = $("tracklistTracks");
const tracklistEmpty = $("tracklistEmpty");
const tracklistEditToolbar = $("tracklistEditToolbar");
const tracklistEditStatus = $("tracklistEditStatus");
const tracklistCardEl = document.querySelector(".tracklistCard");
const btnTracklistMarkNow = $("btnTracklistMarkNow");
const btnTracklistAddRow = $("btnTracklistAddRow");
const btnTracklistAddMeta = $("btnTracklistAddMeta");
const btnTracklistNewBlank = $("btnTracklistNewBlank");
const btnTracklistScanLocal = $("btnTracklistScanLocal");
const btnTracklistAttachFile = $("btnTracklistAttachFile");
const tracklistAttachFileInput = $("tracklistAttachFileInput");
const tracklistLibraryOverlay = $("tracklistLibraryOverlay");
const tracklistLibraryBody = $("tracklistLibraryBody");
const btnTracklistAutoScan = $("btnTracklistAutoScan");
const btnTracklistNameDetect = $("btnTracklistNameDetect");
const btnTracklistSave = $("btnTracklistSave");
const btnTracklistCancel = $("btnTracklistCancel");

const btnTopSettings = $("btnTopSettings");
const btnReload = $("btnReload");
const btnReloadIcon = $("btnReloadIcon");
const btnReloadText = $("btnReloadText");
const reloadLibraryCount = $("reloadLibraryCount");
const reloadAddedCount = $("reloadAddedCount");
const reloadAddedCard = $("reloadAddedCard");
const search = $("search");
const btnClearQueue = $("btnClearQueue");
const btnTopSearch = $("btnTopSearch");
const homeSearchPanel = $("homeSearchPanel");
const homeCategoryShowcase = $("homeCategoryShowcase");
const btnLibraryLoadMore = $("btnLibraryLoadMore");

const btnSidebarOpenLists = $("btnSidebarOpenLists");
const btnSidebarFilesPage = $("btnSidebarFilesPage");
const btnSidebarDrivePage = $("btnSidebarDrivePage");
const btnHomeOpenLists = $("btnHomeOpenLists");
const btnHomeOpenFiles = $("btnHomeOpenFiles");
const btnHomeOpenDrive = $("btnHomeOpenDrive");

const setDownloads = $("setDownloads");
const setShuffle = $("setShuffle");
const setSavePos = $("setSavePos");
const setSaveState = $("setSaveState");
const setAutoplay = $("setAutoplay");

const decBack = $("decBack");
const incBack = $("incBack");
const valBack = $("valBack");
const decFwd = $("decFwd");
const incFwd = $("incFwd");
const valFwd = $("valFwd");

const btnSettingsPlaybackPage = $("btnSettingsPlaybackPage");
const btnSettingsWaveformsPage = $("btnSettingsWaveformsPage");
const settingsPagePlayback = $("settingsPagePlayback");
const settingsPageWaveforms = $("settingsPageWaveforms");
const btnWaveGenCurrent = $("btnWaveGenCurrent");
const btnWaveRegenCurrent = $("btnWaveRegenCurrent");
const btnWaveGenAll = $("btnWaveGenAll");
const btnWaveRegenAll = $("btnWaveRegenAll");
const waveformGenStatus = $("waveformGenStatus");
const waveformJobSummary = $("waveformJobSummary");
const waveformJobList = $("waveformJobList");
const btnSettingsDevicesPage = $("btnSettingsDevicesPage");
const settingsPageDevices = $("settingsPageDevices");
const deviceNameInput = $("deviceNameInput");
const deviceTypeSelect = $("deviceTypeSelect");
const deviceReceiveTransfers = $("deviceReceiveTransfers");
const deviceAllowRemote = $("deviceAllowRemote");
const deviceIdValue = $("deviceIdValue");
const deviceLastSeenValue = $("deviceLastSeenValue");
const knownDevicesList = $("knownDevicesList");
const btnDeviceRegenerateId = $("btnDeviceRegenerateId");

const connectLocalDeviceName = $("connectLocalDeviceName");
const connectLocalDeviceMeta = $("connectLocalDeviceMeta");
const connectReceiveStatus = $("connectReceiveStatus");
const connectRemoteStatus = $("connectRemoteStatus");
const connectKnownDevicesList = $("connectKnownDevicesList");
const btnConnectOpenDevices = $("btnConnectOpenDevices");
const btnConnectOpenSend = $("btnConnectOpenSend");

const btnSettingsGeneralPage = $("btnSettingsGeneralPage");
const btnSettingsBackupPage = $("btnSettingsBackupPage");
const btnSettingsFilesPage = $("btnSettingsFilesPage");
const btnSettingsGoogleDrivePage = $("btnSettingsGoogleDrivePage");
const btnSettingsDropboxPage = $("btnSettingsDropboxPage");
const btnSettingsImportPage = $("btnSettingsImportPage");
const btnSettingsMenuOpen = $("btnSettingsMenuOpen");
const btnSettingsMenuClose = $("btnSettingsMenuClose");
const settingsSideMenu = $("settingsSideMenu");
const settingsSideMenuBackdrop = $("settingsSideMenuBackdrop");
const settingsCurrentSectionText = $("settingsCurrentSectionText");
const settingsPageGeneral = $("settingsPageGeneral");
const settingsPageBackup = $("settingsPageBackup");
const settingsPageFiles = $("settingsPageFiles");
const settingsPageGoogleDrive = $("settingsPageGoogleDrive");
const settingsPageDropbox = $("settingsPageDropbox");
const settingsPageImport = $("settingsPageImport");
const settingsFilesList = $("settingsFilesList");
const btnGoogleDriveConnect = $("btnGoogleDriveConnect");
const btnDropboxConnect = $("btnDropboxConnect");
const googleDriveAccountsList = $("googleDriveAccountsList");
const dropboxAccountsList = $("dropboxAccountsList");
const googleDriveAccountSelect = $("googleDriveAccountSelect");
const dropboxAccountSelect = $("dropboxAccountSelect");
const googleDriveFolderInput = $("googleDriveFolderInput");
const googleDriveSearchInput = $("googleDriveSearchInput");
const dropboxPathInput = $("dropboxPathInput");
const dropboxSearchInput = $("dropboxSearchInput");
const btnGoogleDriveBrowse = $("btnGoogleDriveBrowse");
const btnDropboxBrowse = $("btnDropboxBrowse");
const btnDropboxSearch = $("btnDropboxSearch");
const btnGoogleDriveBack = $("btnGoogleDriveBack");
const btnGoogleDriveRoot = $("btnGoogleDriveRoot");
const btnDropboxBack = $("btnDropboxBack");
const btnDropboxRoot = $("btnDropboxRoot");
const googleDriveFolderLabel = $("googleDriveFolderLabel");
const dropboxFolderLabel = $("dropboxFolderLabel");
const googleDriveResultsList = $("googleDriveResultsList");
const dropboxResultsList = $("dropboxResultsList");
const linkImportUrlInput = $("linkImportUrlInput");
const btnLinkImportStart = $("btnLinkImportStart");
const linkImportSummary = $("linkImportSummary");
const linkImportJobList = $("linkImportJobList");
const urlSourceProviderSelect = $("urlSourceProviderSelect");
const urlSourceTitleInput = $("urlSourceTitleInput");
const urlSourceUrlInput = $("urlSourceUrlInput");
const btnUrlSourceSave = $("btnUrlSourceSave");
const urlSourceLinksList = $("urlSourceLinksList");
const googleDriveImportSummary = $("googleDriveImportSummary");
const googleDriveImportJobList = $("googleDriveImportJobList");
const dropboxImportSummary = $("dropboxImportSummary");
const dropboxImportJobList = $("dropboxImportJobList");

// Old combined Import panel fallback, kept harmless if it does not exist.
const cloudImportSummary = $("cloudImportSummary");
const cloudImportJobList = $("cloudImportJobList");

const settingsStatLibrary = $("settingsStatLibrary");
const settingsStatWaveforms = $("settingsStatWaveforms");
const settingsStatDevices = $("settingsStatDevices");
const settingsStatBackups = $("settingsStatBackups");

const backupStatusText = $("backupStatusText");
const btnBackupExportAll = $("btnBackupExportAll");
const btnBackupExportBrowser = $("btnBackupExportBrowser");
const btnBackupExportServer = $("btnBackupExportServer");
const btnBackupExportSelected = $("btnBackupExportSelected");

const backupIncludeSettings = $("backupIncludeSettings");
const backupIncludeFavourites = $("backupIncludeFavourites");
const backupIncludeBookmarks = $("backupIncludeBookmarks");
const backupIncludePlaylists = $("backupIncludePlaylists");
const backupIncludePlaylistPrefs = $("backupIncludePlaylistPrefs");
const backupIncludeDevicePrefs = $("backupIncludeDevicePrefs");
const backupIncludeLibrary = $("backupIncludeLibrary");
const backupIncludeTracklists = $("backupIncludeTracklists");
const backupIncludeWaveforms = $("backupIncludeWaveforms");

const btnSettingsLibraryPage = $("btnSettingsLibraryPage");
const settingsPageLibrary = $("settingsPageLibrary");

const btnLibraryUploadChoose = $("btnLibraryUploadChoose");
const btnLibraryUploadStart = $("btnLibraryUploadStart");
const libraryUploadInput = $("libraryUploadInput");
const libraryUploadPickedText = $("libraryUploadPickedText");
const libraryUploadStatusText = $("libraryUploadStatusText");

const btnBackupRestoreChoose = $("btnBackupRestoreChoose");
const btnBackupRestoreRun = $("btnBackupRestoreRun");
const backupRestoreInput = $("backupRestoreInput");
const backupRestorePickedText = $("backupRestorePickedText");
const backupRestoreStatusText = $("backupRestoreStatusText");
const backupRestorePreview = $("backupRestorePreview");
const backupRestorePreviewGrid = $("backupRestorePreviewGrid");

const waveformViewport = $("waveformViewport");
const waveformEl = $("waveform");
const pageTitle = $("pageTitle");
const tabs = Array.from(document.querySelectorAll(".tab"));

const btnListsBack = $("btnListsBack");
const btnListsFilter = $("btnListsFilter");
const listsFilterPanel = $("listsFilterPanel");
const categoryFilterMode = $("categoryFilterMode");
const categorySortMode = $("categorySortMode");
const btnCategoryFilterApply = $("btnCategoryFilterApply");
const btnCategoryFilterClear = $("btnCategoryFilterClear");
const listsTitle = $("listsTitle");
const listsSub = $("listsSub");
const listsBrowser = $("listsBrowser");

const sidebarBackdrop = $("sidebarBackdrop");
const sidebarMenu = $("sidebarMenu");
const btnSidebarClose = $("btnSidebarClose");
const btnSidebarCloseFloating = $("btnSidebarCloseFloating");
const playerSidebarScrollLock = { y: 0 };
const sidebarNavButtons = Array.from(document.querySelectorAll(".sidebarNavBtn[data-tab]"));
const sidebarModuleButtons = Array.from(document.querySelectorAll(".sidebarModuleBtn"));
const sidebarRouteButtons = Array.from(document.querySelectorAll(".sidebarRouteBtn[data-route]"));
const sidebarCategoryList = $("sidebarCategoryList");

const playlistHomePane = $("playlistHomePane");
const playlistDetailPane = $("playlistDetailPane");
const playlistGridEl = $("playlistGrid");
const playlistListEl = $("playlistList");
const playlistEmptyStateEl = $("playlistEmptyState");
const playlistSummaryText = $("playlistSummaryText");
const playlistSearchPanel = $("playlistSearchPanel");
const playlistSearchInput = $("playlistSearchInput");
const playlistDetailSearchPanel = $("playlistDetailSearchPanel");
const playlistDetailSearchInput = $("playlistDetailSearchInput");
const btnPlaylistCreateMenu = $("btnPlaylistCreateMenu");
const btnPlaylistMoreMenu = $("btnPlaylistMoreMenu");
const btnPlaylistCreateNew = $("btnPlaylistCreateNew");
const btnPlaylistImport = $("btnPlaylistImport");
const btnPlaylistMenuNew = $("btnPlaylistMenuNew");
const btnPlaylistMenuImport = $("btnPlaylistMenuImport");
const btnPlaylistMenuSearch = $("btnPlaylistMenuSearch");
const btnPlaylistMenuSort = $("btnPlaylistMenuSort");
const btnPlaylistMenuToggleView = $("btnPlaylistMenuToggleView");
const playlistMenuToggleViewText = $("playlistMenuToggleViewText");
const btnPlaylistMenuHelp = $("btnPlaylistMenuHelp");
const btnPlaylistSelectMode = $("btnPlaylistSelectMode");
const btnPlaylistSearchToggle = $("btnPlaylistSearchToggle");
const btnPlaylistPlayAll = $("btnPlaylistPlayAll");
const btnPlaylistShuffleAll = $("btnPlaylistShuffleAll");
const playlistCreateMenu = $("playlistCreateMenu");
const playlistMoreMenu = $("playlistMoreMenu");
const btnPlaylistBack = $("btnPlaylistBack");
const playlistDetailTopTitle = $("playlistDetailTopTitle");
const btnPlaylistDetailMenuToggle = $("btnPlaylistDetailMenuToggle");
const playlistDetailMenu = $("playlistDetailMenu");
const btnPlaylistDetailRename = $("btnPlaylistDetailRename");
const btnPlaylistDetailDelete = $("btnPlaylistDetailDelete");
const btnPlaylistDetailSearchToggle = $("btnPlaylistDetailSearchToggle");
const btnPlaylistDetailSort = $("btnPlaylistDetailSort");
const playlistDetailCover = $("playlistDetailCover");
const playlistDetailName = $("playlistDetailName");
const playlistDetailStats = $("playlistDetailStats");
const btnPlaylistDetailSearch = $("btnPlaylistDetailSearch");
const btnPlaylistDetailPlay = $("btnPlaylistDetailPlay");
const btnPlaylistDetailShuffle = $("btnPlaylistDetailShuffle");
const playlistDetailTracks = $("playlistDetailTracks");

/* anchored popups */
const topPopupBackdrop = $("topPopupBackdrop");

const sleepPopup = $("sleepPopup");
const btnSleepFlip = $("btnSleepFlip");
const sleepPagePresets = $("sleepPagePresets");
const sleepPageCustom = $("sleepPageCustom");
const btnSleepCancelPopup = $("btnSleepCancelPopup");
const sleepPopupCountdown = $("sleepPopupCountdown");
const sleepActivePanel = $("sleepActivePanel");
const sleepActiveCountdown = $("sleepActiveCountdown");
const btnSleepStopActive = $("btnSleepStopActive");

const speedPopup = $("speedPopup");
const speedWheel = $("speedWheel");
const speedValue = $("speedValue");
const speedCurrentText = $("speedCurrentText");
const btnSpeedCloseTop = $("btnSpeedCloseTop");
const btnSpeedDone = $("btnSpeedDone");

const eqPopup = $("eqPopup");
const eqStatusText = $("eqStatusText");
const eqEnabled = $("eqEnabled");
const btnEqCloseTop = $("btnEqCloseTop");
const btnEqDone = $("btnEqDone");
const btnEqReset = $("btnEqReset");
const eqPreset = $("eqPreset");
const eqPreamp = $("eqPreamp");
const eqPreampValue = $("eqPreampValue");

const castPopup = $("castPopup");
const castStatusText = $("castStatusText");
const castCurrentRoute = $("castCurrentRoute");
const castHintText = $("castHintText");
const btnCastStart = $("btnCastStart");
const btnCastDone = $("btnCastDone");
const btnCastCloseTop = $("btnCastCloseTop");

const mirrorPopup = $("mirrorPopup");
const mirrorStatusText = $("mirrorStatusText");
const mirrorCurrentRoute = $("mirrorCurrentRoute");
const mirrorHintText = $("mirrorHintText");
const btnMirrorStart = $("btnMirrorStart");
const btnMirrorDone = $("btnMirrorDone");
const btnMirrorCloseTop = $("btnMirrorCloseTop");

const outputPopup = $("outputPopup");
const outputStatusText = $("outputStatusText");
const outputCurrentRoute = $("outputCurrentRoute");
const outputHintText = $("outputHintText");
const outputDeviceList = $("outputDeviceList");
const btnOutputChoose = $("btnOutputChoose");
const btnOutputDone = $("btnOutputDone");
const btnOutputCloseTop = $("btnOutputCloseTop");

const sendDevicePopup = $("sendDevicePopup");
const sendDeviceCurrentTrack = $("sendDeviceCurrentTrack");
const sendDeviceCurrentMeta = $("sendDeviceCurrentMeta");
const sendDeviceDeviceList = $("sendDeviceDeviceList");
const sendDeviceActionGrid = $("sendDeviceActionGrid");
const btnSendDeviceOpenDevices = $("btnSendDeviceOpenDevices");
const btnSendDeviceDone = $("btnSendDeviceDone");
const btnSendDeviceCloseTop = $("btnSendDeviceCloseTop");

const downloadPopup = $("downloadPopup");
const btnDownloadConfirm = $("btnDownloadConfirm");
const downloadStatusText = $("downloadStatusText");
const downloadInfoName = $("downloadInfoName");
const downloadInfoType = $("downloadInfoType");
const downloadInfoLength = $("downloadInfoLength");
const downloadInfoSize = $("downloadInfoSize");
const downloadProgressFill = $("downloadProgressFill");
const downloadProgressText = $("downloadProgressText");
const downloadProgressBytes = $("downloadProgressBytes");

const bookmarkPopup = $("bookmarkPopup");
const btnBookmarkPopupMenu = $("btnBookmarkPopupMenu");
const btnBookmarkTabCurrent = $("btnBookmarkTabCurrent");
const btnBookmarkTabAll = $("btnBookmarkTabAll");
const btnAddBookmark = $("btnAddBookmark");
const bookmarkList = $("bookmarkList");
const bookmarkSubHeader = $("bookmarkSubHeader");
const btnBookmarkBackToSongs = $("btnBookmarkBackToSongs");
const bookmarkSubTitle = $("bookmarkSubTitle");

const bookmarkToolsPopup = $("bookmarkToolsPopup");
const btnBookmarkToolsClose = $("btnBookmarkToolsClose");
const btnBookmarkSortNewest = $("btnBookmarkSortNewest");
const btnBookmarkSortOldest = $("btnBookmarkSortOldest");
const btnBookmarkManualSort = $("btnBookmarkManualSort");
const btnBookmarkDeleteSong = $("btnBookmarkDeleteSong");
const btnBookmarkDeleteAll = $("btnBookmarkDeleteAll");
const bookmarkEditOverlay = $("bookmarkEditOverlay");
const bookmarkEditTime = $("bookmarkEditTime");
const bookmarkEditName = $("bookmarkEditName");
const btnBookmarkEditCancel = $("btnBookmarkEditCancel");
const btnBookmarkEditSave = $("btnBookmarkEditSave");

const playerQuickMenuPopup = $("playerQuickMenuPopup");
const menuPopup = $("menuPopup");
const btnPlayerQuickEQ = $("btnPlayerQuickEQ");
const btnPlayerQuickSpeed = $("btnPlayerQuickSpeed");
const btnPlayerQuickMirror = $("btnPlayerQuickMirror");
const btnPlayerQuickCast = $("btnPlayerQuickCast");
const btnPlayerQuickOutput = $("btnPlayerQuickOutput");
const trackActionPrompt = $("trackActionPrompt");
const trackActionPromptTitle = $("trackActionPromptTitle");
const trackActionPromptSub = $("trackActionPromptSub");
const btnTrackActionPlayNow = $("btnTrackActionPlayNow");
const btnTrackActionAddQueue = $("btnTrackActionAddQueue");
const btnTrackActionPlaylist = $("btnTrackActionPlaylist");
const btnTrackActionCancel = $("btnTrackActionCancel");

const btnMenuClosePlayer = $("btnMenuClosePlayer");
const btnMenuContinuePlayback = $("btnMenuContinuePlayback");
const btnMenuSearch = $("btnMenuSearch");
const btnMenuRecents = $("btnMenuRecents");
const btnMenuFavorites = $("btnMenuFavorites");
const btnMenuQueue = $("btnMenuQueue");
const btnMenuBookmarks = $("btnMenuBookmarks");
const btnMenuEQ = $("btnMenuEQ");
const btnMenuSleep = $("btnMenuSleep");
const btnMenuShuffle = $("btnMenuShuffle");
const menuShuffleText = $("menuShuffleText");
const btnMenuRepeat = $("btnMenuRepeat");
const menuRepeatText = $("menuRepeatText");
const btnMenuSort = $("btnMenuSort");
const btnMenuSaveQueue = $("btnMenuSaveQueue");
const btnMenuDeleteQueue = $("btnMenuDeleteQueue");
const btnMenuSendToDevice = $("btnMenuSendToDevice");
const btnMenuPreviewShare = $("btnMenuPreviewShare");
const btnMenuEditTrack = $("btnMenuEditTrack");
const btnMenuEditTimestamps = $("btnMenuEditTimestamps");
const btnMenuSettings = $("btnMenuSettings");

const trackEditLauncherOverlay = $("trackEditLauncherOverlay");
const trackEditLauncherSub = $("trackEditLauncherSub");
const btnTrackEditLauncherClose = $("btnTrackEditLauncherClose");
const btnTrackEditQuickEdit = $("btnTrackEditQuickEdit");
const btnTrackEditTagger = $("btnTrackEditTagger");
const btnTrackEditConverter = $("btnTrackEditConverter");
const btnTrackEditMastering = $("btnTrackEditMastering");
let trackEditLauncherTrackId = "";

const previewShareOverlay = $("previewShareOverlay");
const btnPreviewShareClose = $("btnPreviewShareClose");
const btnPreviewShareStartNow = $("btnPreviewShareStartNow");
const btnPreviewShareStopNow = $("btnPreviewShareStopNow");
const previewShareStartInput = $("previewShareStartInput");
const previewShareEndInput = $("previewShareEndInput");
const previewShareDurationInput = $("previewShareDurationInput");
const previewShareSummary = $("previewShareSummary");
const previewShareAudio = $("previewShareAudio");
const btnPreviewShareBuild = $("btnPreviewShareBuild");
const btnPreviewShareSend = $("btnPreviewShareSend");
const previewSharePresetButtons = Array.from(
  document.querySelectorAll(".previewSharePresetBtn[data-preview-seconds]")
);

const themeDialogOverlay = $("themeDialogOverlay");
const themeDialogTitle = $("themeDialogTitle");
const themeDialogMessage = $("themeDialogMessage");
const themeDialogInput = $("themeDialogInput");
const btnThemeDialogCancel = $("btnThemeDialogCancel");
const btnThemeDialogOk = $("btnThemeDialogOk");

const eqBand32 = $("eqBand32");
const eqBand64 = $("eqBand64");
const eqBand125 = $("eqBand125");
const eqBand250 = $("eqBand250");
const eqBand500 = $("eqBand500");
const eqBand1k = $("eqBand1k");
const eqBand2k = $("eqBand2k");
const eqBand4k = $("eqBand4k");
const eqBand8k = $("eqBand8k");
const eqBand16k = $("eqBand16k");

const eqVal32 = $("eqVal32");
const eqVal64 = $("eqVal64");
const eqVal125 = $("eqVal125");
const eqVal250 = $("eqVal250");
const eqVal500 = $("eqVal500");
const eqVal1k = $("eqVal1k");
const eqVal2k = $("eqVal2k");
const eqVal4k = $("eqVal4k");
const eqVal8k = $("eqVal8k");
const eqVal16k = $("eqVal16k");

/* bookmark toast */
const bookmarkToast = $("bookmarkToast");
const bookmarkToastTitle = $("bookmarkToastTitle");
const bookmarkToastSub = $("bookmarkToastSub");
const btnBookmarkToastClose = $("btnBookmarkToastClose");

/* custom timer inputs */
const customHours = $("customHours");
const customMinutes = $("customMinutes");
const customSeconds = $("customSeconds");
const hoursWheel = $("hoursWheel");
const minutesWheel = $("minutesWheel");
const secondsWheel = $("secondsWheel");
const sleepHint = $("sleepHint");
const btnSleepStart = $("btnSleepStart");
const sleepFinalOverlay = $("sleepFinalOverlay");
const sleepFinalCountdownNumber = $("sleepFinalCountdownNumber");
const btnSleepFinalCancel = $("btnSleepFinalCancel");

const views = {
  Lists: $("viewLists"),
  Library: $("viewLibrary"),
  Favourites: $("viewFavourites"),
  Recents: $("viewRecents"),
  Queue: $("viewQueue"),
  Connect: $("viewConnect"),
  Playlists: $("viewPlaylists"),
  Settings: $("viewSettings"),
};

const DEFAULTS = {
  downloads: true,
  shuffle: false,
  savePos: true,
  saveState: true,
  autoplay: false,
  skipBackSec: 25,
  skipFwdSec: 25,
  repeatMode: "off", // off | all | one
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

const SETTINGS_KEY = "brmedia_settings_v2";
const FAVOURITES_KEY = "brmedia_favourites_v2";
const RECENTS_KEY = "brmedia_recents_v1";
const PLAYLISTS_KEY = "brmedia_playlists_v1";
const BRMEDIA_CUSTOM_TAGS_KEY = "brmedia_custom_tags_v1";
const PLAYLIST_PREFS_KEY = "brmedia_playlist_prefs_v1";
const DEVICE_PREFS_KEY = "brmedia_device_prefs_v1";
const MINI_PLAYER_COLLAPSED_KEY = "brmedia_mini_collapsed_v1";

let settings = loadSettings();
let miniPlayerCollapsed = readPersistedJson(MINI_PLAYER_COLLAPSED_KEY, false) === true;
let devicePrefs = loadDevicePrefs();
let library = [];
let brMediaServerCustomTagStore = {};
let queue = [];
let queueIndex = -1;
let playlistViewMode = "grid";
let playlistSortMode = "recent";
let playlistActiveId = "";
let playlistSearchTerm = "";
let playlistDetailSearchTerm = "";
let sleepTimeout = null;
let sleepInterval = null;
let sleepMode = null;
let sleepEndsAt = null;
let sleepTotalSeconds = 0;
let seeking = false;
let seekStartPosition = 0;
let nowPlayingRenderToken = 0;
let bookmarkTab = "current";
let bookmarkAllMode = "groups";
let bookmarkSelectedTrackKey = "";

let bookmarkSelectedGroupKey = "";
let bookmarkSortMode = "manual";
let editingBookmarkTrackKey = "";
let editingBookmarkId = "";
let sleepWheelState = { hours: 0, minutes: 15, seconds: 0 };
let wheelSnapTimers = new WeakMap();
let sleepPopupPage = "presets";
let openTopPopupName = null;
let bookmarkToastTimer = null;
let dragBookmarkId = "";
let dragBookmarkTrackKey = "";
let waveformPeaks = [];
let waveformDragActive = false;
let waveformDragPointerId = null;
let waveformSeekRaf = 0;
let waveformPendingClientX = null;
let waveformSuppressClickUntil = 0;
let waveformDragStartX = 0;
let waveformDragStartTime = 0;
let waveformDragMoved = false;
let waveformRenderToken = 0;
let waveformLastRenderHeight = 0;
let waveformResizeRenderTimer = 0;
const waveformAutoQueuedTrackIds = new Set();
let currentTracklistData = null;
let tracklistLoadToken = 0;
let tracklistEditMode = false;
let tracklistEditDirty = false;
let tracklistEditTrackId = "";
let currentTracklistSourceKind = "none";
let tracklistLibraryItems = [];
let tracklistLibraryTab = "txt";
let tracklistLibraryQuery = "";
let tracklistLibrarySelectedPath = "";
let tracklistLibraryLoading = false;
let tracklistLibraryError = "";

let listsArtist = "";
let listsFolder = "";
let listsCategory = "";
let listsFilterMode = "all";
let listsSortMode = "default";
let homeNavRevealSlug = "";
let reloadAddedTimer = null;
let reloadInFlight = false;
let waveformGenerationInFlight = false;
let waveformJobId = "";
let waveformJobPollTimer = 0;
let libraryUploadQueue = [];
let libraryUploadInFlight = false;
let settingsSubPage = "playback";
let cloudAccountsState = { google_drive: [], dropbox: [] };
const URL_SOURCE_LINKS_KEY = "brmedia_url_source_links_v1";
let linkImportJobs = [];
let linkImportJobPollTimer = 0;
let urlSourceLinks = [];
let googleDriveFolderStack = [];
let googleDriveCurrentFolder = { id: "root", label: "Root folder" };
let dropboxFolderStack = [];
let dropboxCurrentFolder = { path: "", label: "Root folder" };
let cloudImportJobs = [];
let cloudImportJobPollTimer = 0;
let libraryRenderLimit = 15;
let downloadInFlight = false;
let previewTrackId = "";
let pendingTrackAction = null;
let lastHeavyPlayerUiUpdateAt = 0;
let lastPlaybackPersistAt = 0;
let stagePlayerFlipped = false;
let stageWaveDragActive = false;
let stageWaveDragPointerId = null;
let stageWaveDragStartX = 0;
let stageWaveDragStartTime = 0;
let stageWaveDragMoved = false;
let stageWaveSeekRaf = 0;
let stageWavePendingClientX = null;
let stageWaveSuppressClickUntil = 0;
let mirrorStream = null;
let mirrorStreamLabel = "";
let outputSelectedSinkId = "";
let outputSelectedSinkLabel = "";
const downloadSizeCache = new Map();
const AUTO_SCAN_PATH = "H:\\Music";
let sleepFinalOverlayVisible = false;
let previewShareState = {
  trackId: "",
  startSec: 0,
  endSec: 30,
  durationSec: 30,
};

let previewShareBusy = false;
let backupRestoreLoadedPackage = null;
let backupRestoreLoadedFile = null;

let deviceRelayStarted = false;
let deviceHeartbeatTimer = 0;
let deviceCommandPollTimer = 0;

let incomingDeviceCommandQueue = [];
let incomingDeviceCommandActive = null;

let playlistSelectMode = false;
let selectedPlaylistIds = new Set();
let playlistImportInputEl = null;

let themeDialogResolve = null;
let themeDialogHasInput = false;

let eqAudioContext = null;
let eqSourceNode = null;
let eqPreampNode = null;
let eqFilterNodes = {};
let eqTemporarilyBypassed = false;
const isAppleMobile =
  /iPhone|iPad|iPod/i.test(navigator.userAgent)
  || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

function readCookie(name) {
  const prefix = `${name}=`;
  const found = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  return found ? decodeURIComponent(found.slice(prefix.length)) : "";
}

function writeCookie(name, value, days = 3650) {
  const maxAge = Math.max(1, Math.floor(days * 24 * 60 * 60));
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function readPersistedJson(key, fallback) {
  try {
    const rawLocal = localStorage.getItem(key);
    if (rawLocal) return JSON.parse(rawLocal);
  } catch {}

  try {
    const rawCookie = readCookie(key);
    if (rawCookie) return JSON.parse(rawCookie);
  } catch {}

  return fallback;
}

function writePersistedJson(key, value) {
  const raw = JSON.stringify(value);
  try {
    localStorage.setItem(key, raw);
  } catch {}
  try {
    writeCookie(key, raw);
  } catch {}
}

function applyMiniPlayerCollapsedState() {
  if (!miniPlayer) return;

  miniPlayer.classList.toggle("is-collapsed", !!miniPlayerCollapsed);

  if (btnMiniCollapse) {
    btnMiniCollapse.setAttribute(
      "aria-label",
      miniPlayerCollapsed ? "Expand mini player" : "Minimise mini player"
    );
    btnMiniCollapse.setAttribute("aria-pressed", miniPlayerCollapsed ? "true" : "false");
  }

  if (btnMiniEq) {
    btnMiniEq.setAttribute(
      "aria-label",
      miniPlayerCollapsed ? "Open mini player" : "Now playing"
    );
  }
}

function toggleMiniPlayerCollapsed(forceValue) {
  miniPlayerCollapsed = typeof forceValue === "boolean"
    ? forceValue
    : !miniPlayerCollapsed;

  writePersistedJson(MINI_PLAYER_COLLAPSED_KEY, !!miniPlayerCollapsed);
  applyMiniPlayerCollapsedState();
}

function clampPlayerSettingNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function normalisePlayerSettingsShape(next = {}) {
  const merged = {
    ...DEFAULTS,
    ...(next && typeof next === "object" ? next : {}),
    eqBands: {
      ...DEFAULTS.eqBands,
      ...((next && next.eqBands && typeof next.eqBands === "object") ? next.eqBands : {}),
    },
  };

  merged.skipBackSec = clampPlayerSettingNumber(merged.skipBackSec, 5, 120, DEFAULTS.skipBackSec);
  merged.skipFwdSec = clampPlayerSettingNumber(merged.skipFwdSec, 5, 120, DEFAULTS.skipFwdSec);
  merged.playbackRate = Number.isFinite(Number(merged.playbackRate)) ? Number(merged.playbackRate) : DEFAULTS.playbackRate;
  merged.waveformPeakCount = clampPlayerSettingNumber(merged.waveformPeakCount, 64, 4200, DEFAULTS.waveformPeakCount);
  merged.previewShareDefaultLength = clampPlayerSettingNumber(merged.previewShareDefaultLength, 5, 180, DEFAULTS.previewShareDefaultLength);
  merged.eqPreamp = Math.max(-12, Math.min(12, Number(merged.eqPreamp || 0)));

  if (!["bars", "smooth", "compact", "hidden"].includes(merged.waveformDisplayMode)) merged.waveformDisplayMode = DEFAULTS.waveformDisplayMode;
  if (!["compact", "normal", "large"].includes(merged.waveformHeightMode)) merged.waveformHeightMode = DEFAULTS.waveformHeightMode;
  if (!["low", "standard", "high", "ultra"].includes(merged.waveformDensityMode)) merged.waveformDensityMode = DEFAULTS.waveformDensityMode;
  if (!["light", "balanced", "deep"].includes(merged.autoTimestampScanDefault)) merged.autoTimestampScanDefault = DEFAULTS.autoTimestampScanDefault;

  return merged;
}

function loadSettings() {
  const saved = readPersistedJson(SETTINGS_KEY, null);
  return normalisePlayerSettingsShape(saved);
}

function saveSettings() {
  writePersistedJson(SETTINGS_KEY, settings);
}

function createDeviceId() {
  return `brdev-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

function guessDeviceType() {
  const ua = navigator.userAgent || "";
  if (/iPad/i.test(ua)) return "tablet";
  if (/iPhone|Android.+Mobile/i.test(ua)) return "phone";
  if (/Macintosh|Windows|Linux/i.test(ua)) return "desktop";
  return "other";
}

function guessDeviceName() {
  const type = guessDeviceType();
  if (type === "phone") return "My phone";
  if (type === "tablet") return "My tablet";
  if (type === "desktop") return "My computer";
  return "My device";
}

function getDefaultDevicePrefs() {
  return {
    deviceId: createDeviceId(),
    name: guessDeviceName(),
    type: guessDeviceType(),
    receiveTransfers: true,
    allowRemote: true,
    lastSeenText: "Online now",
    lastTargetId: "",
    knownDevices: [],
  };
}

function loadDevicePrefs() {
  const saved = readPersistedJson(DEVICE_PREFS_KEY, null);
  if (!saved || typeof saved !== "object") return getDefaultDevicePrefs();
  return { ...getDefaultDevicePrefs(), ...saved };
}

function persistDevicePrefs() {
  writePersistedJson(DEVICE_PREFS_KEY, devicePrefs);
}

function getDeviceTypeIcon(type) {
  if (type === "phone") return "fa-solid fa-mobile-screen-button";
  if (type === "tablet") return "fa-solid fa-tablet-screen-button";
  if (type === "desktop") return "fa-solid fa-desktop";
  return "fa-solid fa-laptop";
}

function getOnlineKnownDevices() {
  const raw = Array.isArray(devicePrefs.knownDevices) ? devicePrefs.knownDevices : [];
  return raw.filter((item) => item && item.online);
}

function getSelectedSendTarget() {
  const online = getOnlineKnownDevices();
  if (!online.length) return null;

  const remembered = online.find((item) => item.id === devicePrefs.lastTargetId);
  return remembered || online[0];
}

function saveDevicePrefs(options = {}) {
  const skipHeartbeat = !!options.skipHeartbeat;
  const skipRerender = !!options.skipRerender;

  const prevName = devicePrefs.name || "";
  const prevType = devicePrefs.type || "";
  const prevReceiveTransfers = !!devicePrefs.receiveTransfers;
  const prevAllowRemote = !!devicePrefs.allowRemote;

  if (deviceNameInput) {
    const nextName = (deviceNameInput.value || "").trim();
    devicePrefs.name = nextName || guessDeviceName();
    if (!skipRerender) deviceNameInput.value = devicePrefs.name;
  }

  if (deviceTypeSelect) {
    devicePrefs.type = deviceTypeSelect.value || guessDeviceType();
  }

  if (deviceReceiveTransfers) {
    devicePrefs.receiveTransfers = !!deviceReceiveTransfers.checked;
  }

  if (deviceAllowRemote) {
    devicePrefs.allowRemote = !!deviceAllowRemote.checked;
  }

  const changed =
    prevName !== (devicePrefs.name || "") ||
    prevType !== (devicePrefs.type || "") ||
    prevReceiveTransfers !== !!devicePrefs.receiveTransfers ||
    prevAllowRemote !== !!devicePrefs.allowRemote;

  devicePrefs.lastSeenText = "Online now";
  persistDevicePrefs();

  if (!skipRerender) {
    renderDeviceSettingsUI();
  }

  renderSendToDeviceUI();
  renderGeneralSettingsUI();

  if (changed && !skipHeartbeat) {
    void refreshDeviceDirectory("heartbeat");
  }
}

function forgetKnownDevice(deviceId) {
  const id = String(deviceId || "").trim();
  if (!id) return;

  const forgotten = new Set(Array.isArray(devicePrefs.forgottenDeviceIds) ? devicePrefs.forgottenDeviceIds : []);
  forgotten.add(id);

  devicePrefs.forgottenDeviceIds = Array.from(forgotten);
  devicePrefs.knownDevices = (devicePrefs.knownDevices || []).filter((item) => item.id !== id);

  if (devicePrefs.lastTargetId === id) devicePrefs.lastTargetId = "";

  persistDevicePrefs();
  renderDeviceSettingsUI();
  renderSendToDeviceUI();
  showBookmarkToast("Devices", "Device forgotten locally");
}

function renderDeviceSettingsUI() {
  if (deviceNameInput) deviceNameInput.value = devicePrefs.name || "";
  if (deviceTypeSelect) deviceTypeSelect.value = devicePrefs.type || "phone";
  if (deviceReceiveTransfers) deviceReceiveTransfers.checked = !!devicePrefs.receiveTransfers;
  if (deviceAllowRemote) deviceAllowRemote.checked = !!devicePrefs.allowRemote;
  if (deviceIdValue) deviceIdValue.textContent = devicePrefs.deviceId || "—";
  if (deviceLastSeenValue) deviceLastSeenValue.textContent = devicePrefs.lastSeenText || "Online now";

  if (connectLocalDeviceName) {
    connectLocalDeviceName.textContent = devicePrefs.name || "This device";
  }

  if (connectLocalDeviceMeta) {
    const typeLabel = (devicePrefs.type || "device").replace(/^\w/, (c) => c.toUpperCase());
    connectLocalDeviceMeta.textContent = `${typeLabel} • ${devicePrefs.deviceId || "—"}`;
  }

  if (connectReceiveStatus) {
    connectReceiveStatus.textContent = devicePrefs.receiveTransfers ? "Receiving enabled" : "Receiving off";
  }

  if (connectRemoteStatus) {
    connectRemoteStatus.textContent = devicePrefs.allowRemote ? "Remote control allowed" : "Remote control blocked";
  }

  const online = getOnlineKnownDevices();

  const renderKnownDevicesMarkup = (includeActions = false) => {
    if (!online.length) {
      return `<div class="deviceEmptyState">No other BRMedia devices are online yet. Open the player on another phone, tablet or PC and it will appear here.</div>`;
    }

    return online.map((item) => `
      <div class="knownDeviceRow deviceKnownRowRich">
        <div class="knownDeviceIcon"><i class="${escapeHtml(getDeviceTypeIcon(item.type || "other"))}"></i></div>
        <div class="knownDeviceMeta">
          <div class="knownDeviceName">${escapeHtml(item.name || "Unknown device")}</div>
          <div class="knownDeviceSub">${escapeHtml(item.lastSeenText || "Online")} • ${item.allowRemote === false ? "Remote blocked" : "Remote allowed"}</div>
        </div>
        ${includeActions ? `
          <div class="knownDeviceActions">
            <button class="knownDeviceActionBtn" type="button" data-device-use="${escapeHtml(item.id)}">Use</button>
            <button class="knownDeviceActionBtn danger" type="button" data-device-forget="${escapeHtml(item.id)}">Forget</button>
          </div>
        ` : ""}
      </div>
    `).join("");
  };

  if (knownDevicesList) {
    knownDevicesList.innerHTML = renderKnownDevicesMarkup(true);

    knownDevicesList.querySelectorAll("[data-device-use]").forEach((btn) => {
      btn.addEventListener("click", () => {
        devicePrefs.lastTargetId = btn.dataset.deviceUse || "";
        persistDevicePrefs();
        renderSendToDeviceUI();
        showBookmarkToast("Devices", "Default send target updated");
      });
    });

    knownDevicesList.querySelectorAll("[data-device-forget]").forEach((btn) => {
      btn.addEventListener("click", () => forgetKnownDevice(btn.dataset.deviceForget || ""));
    });
  }

  if (connectKnownDevicesList) {
    connectKnownDevicesList.innerHTML = renderKnownDevicesMarkup(false);
  }
}

function renderSendToDeviceUI() {
  const track = getPreviewTrack() || currentTrack();
  const online = getOnlineKnownDevices();
  const selected = getSelectedSendTarget();

  if (sendDeviceCurrentTrack) {
    sendDeviceCurrentTrack.textContent = track?.title || "No mix selected";
  }

  if (sendDeviceCurrentMeta) {
    sendDeviceCurrentMeta.textContent = track
      ? `${track.artist || "Unknown artist"} • Ready to hand off`
      : "Open or play a mix, then choose a device";
  }

  if (sendDeviceDeviceList) {
    if (!online.length) {
      sendDeviceDeviceList.innerHTML = `<div class="deviceEmptyState">No online target devices yet.</div>`;
    } else {
      sendDeviceDeviceList.innerHTML = online.map((item) => {
        const active = selected && item.id === selected.id;
        return `
          <button
            class="sendDeviceChip${active ? " active" : ""}"
            type="button"
            data-send-device-id="${escapeHtml(item.id || "")}"
          >
            <i class="${escapeHtml(getDeviceTypeIcon(item.type || "other"))}"></i>
            <span>${escapeHtml(item.name || "Unknown device")}</span>
          </button>
        `;
      }).join("");
    }
  }

  const shouldDisableActions = !track || !selected;
  if (sendDeviceActionGrid) {
    Array.from(sendDeviceActionGrid.querySelectorAll("[data-send-action]")).forEach((btn) => {
      btn.disabled = shouldDisableActions;
      btn.classList.toggle("disabledLike", shouldDisableActions);
    });
  }
}

function openSendToDevicePopup(anchorButton) {
  renderSendToDeviceUI();
  openTopPopup("sendDevice", anchorButton || btnPlayerMoreQuick || btnTopMenu || btnSleep);
}

const DEVICE_HEARTBEAT_MS = 15000;
const DEVICE_COMMAND_POLL_MS = 3000;

function buildDeviceRelayPayload() {
  if (!devicePrefs.deviceId) {
    devicePrefs.deviceId = createDeviceId();
  }

  return {
    deviceId: devicePrefs.deviceId,
    name: devicePrefs.name || guessDeviceName(),
    type: devicePrefs.type || guessDeviceType(),
    receiveTransfers: !!devicePrefs.receiveTransfers,
    allowRemote: !!devicePrefs.allowRemote,
  };
}

function setKnownDevicesFromServer(devices = []) {
  const safeDevices = Array.isArray(devices)
    ? devices.map((item) => ({
        id: String(item?.id || ""),
        name: String(item?.name || "Unknown device"),
        type: String(item?.type || "other"),
        online: !!item?.online,
        allowRemote: item?.allowRemote !== false,
        lastSeenText: String(item?.lastSeenText || "Online"),
      })).filter((item) => item.id)
    : [];

  devicePrefs.knownDevices = safeDevices;
  persistDevicePrefs();
  renderDeviceSettingsUI();
  renderSendToDeviceUI();
  renderGeneralSettingsUI();
}

async function postJsonNoStore(url, body) {
  const res = await fetch(url, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body || {}),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.detail
      ? `${data?.error || `Request failed (${res.status})`}\n\n${data.detail}`
      : (data?.error || `Request failed (${res.status})`);
    throw new Error(message);
  }

  return data;
}

async function deleteJsonNoStore(url) {
  const res = await fetch(url, {
    method: "DELETE",
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.detail
      ? `${data?.error || `Request failed (${res.status})`}\n\n${data.detail}`
      : (data?.error || `Request failed (${res.status})`);
    throw new Error(message);
  }

  return data;
}

async function getJsonNoStore(url) {
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.detail
      ? `${data?.error || `Request failed (${res.status})`}\n\n${data.detail}`
      : (data?.error || `Request failed (${res.status})`);
    throw new Error(message);
  }
  return data;
}

async function refreshDeviceDirectory(mode = "register") {
  const endpoint = mode === "heartbeat" ? "/devices/heartbeat" : "/devices/register";

  try {
    const data = await postJsonNoStore(endpoint, buildDeviceRelayPayload());

    if (data?.device?.deviceId) {
      devicePrefs.deviceId = String(data.device.deviceId);
    }

    devicePrefs.lastSeenText = String(data?.device?.statusText || "Online now");
    setKnownDevicesFromServer(data?.devices || []);
    return data;
  } catch (err) {
    console.warn("device relay sync failed", err);
    return null;
  }
}

async function fetchPendingDeviceCommands() {
  if (!devicePrefs.deviceId) return;

  try {
    const res = await fetch(`/devices/${encodeURIComponent(devicePrefs.deviceId)}/commands`, {
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) return;

    setKnownDevicesFromServer(data?.devices || []);

    const commands = Array.isArray(data?.commands) ? data.commands : [];
    for (const command of commands) {
      queueIncomingDeviceCommand(command);
    }
  } catch (err) {
    console.warn("device command poll failed", err);
  }
}

async function ensureLibraryTrackById(trackId) {
  if (!trackId) return null;

  let track = library.find((item) => item.id === trackId) || null;
  if (track) return track;

  await loadLibrary();
  track = library.find((item) => item.id === trackId) || null;
  return track;
}

function updateMiniProgressFill() {
  if (!miniProgressFill) return;

  if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) {
    miniProgressFill.style.width = "0%";
    return;
  }

  const ratio = Math.max(0, Math.min(1, (audio.currentTime || 0) / audio.duration));
  miniProgressFill.style.width = `${ratio * 100}%`;
}

function syncPlayerUiAfterRemoteSeek() {
  if (!audio) return;

  if (seek && audio.duration) {
    seek.value = String(Math.floor((audio.currentTime / audio.duration) * 1000));
  }

  if (timeCur) timeCur.textContent = fmtTime(audio.currentTime || 0);
  if (timeRem) timeRem.textContent = `-${fmtTime(Math.max(0, (audio.duration || 0) - (audio.currentTime || 0)))}`;

  updateWaveProgress();
  updateStageWaveProgress();
  updateSeekProgressFill();
  updateMiniProgressFill();
  updateTracklistProgress();
  updateCurrentTimedTrackUI();
  updateStageTimeRow();
}

async function playIncomingTrackById(trackId, options = {}) {
  const track = await ensureLibraryTrackById(trackId);
  if (!track) return null;

  const autoplay = !!options.autoplay;
  const openPlayer = options.openPlayer !== false;
  loadTrackIntoPlayer(track, { openPlayer, autoplay });

  const seekToSec = Number(options.seekToSec);
  if (Number.isFinite(seekToSec) && seekToSec >= 0 && audio) {
    const applySeek = () => {
      audio.currentTime = Math.max(0, Math.min(seekToSec, audio.duration || seekToSec));
      syncPlayerUiAfterRemoteSeek();
    };

    if (audio.readyState >= 1) {
      setTimeout(applySeek, 0);
    } else {
      audio.addEventListener("loadedmetadata", applySeek, { once: true });
    }
  }

  return track;
}



async function hydrateTracksFromIds(ids = []) {
  if (!Array.isArray(ids) || !ids.length) return [];

  if (!library.length) {
    await loadLibrary();
  }

  return ids
    .map((id) => library.find((item) => item.id === id))
    .filter(Boolean);
}

function replaceQueueWithTracks(items = []) {
  if (!items.length) return false;

  queue = items.slice();
  queueIndex = 0;
  previewTrackId = "";

  const current = currentTrack();
  if (current && audio) {
    setAudioSourceForCurrentTrack(current);
    void setNowPlayingUI(current);
  }

  renderQueue();
  renderLibrary();

  if (settings.saveState) persistPlayerState();
  return true;
}

function getIncomingDevicePrompt() {
  let prompt = document.getElementById("incomingDevicePrompt");
  if (prompt) return prompt;

  prompt = document.createElement("div");
  prompt.id = "incomingDevicePrompt";
  prompt.className = "incomingDevicePrompt hidden";
  prompt.innerHTML = `
    <div class="incomingDeviceCard">
      <div class="incomingDeviceKicker">Incoming BRMedia handoff</div>
      <div id="incomingDeviceTitle" class="incomingDeviceTitle">Incoming audio</div>
      <div id="incomingDeviceSub" class="incomingDeviceSub">Another device wants to send audio here.</div>
      <div class="incomingDeviceActions">
        <button id="btnIncomingDeviceDecline" class="popupActionBtn subtle" type="button">Decline</button>
        <button id="btnIncomingDeviceAccept" class="popupActionBtn primary" type="button">Accept</button>
      </div>
    </div>
  `;

  document.body.appendChild(prompt);
  return prompt;
}

function getIncomingDeviceActionLabel(action) {
  const labels = {
    play_now: "Play now",
    add_queue: "Add to queue",
    open_mix: "Open mix",
    open_current_time: "Open at current time",
    send_tracklist: "Send full tracklist",
    send_current_track: "Send current track number",
    sync_current_track: "Sync current track",
    full_queue_handoff: "Full queue handoff",
  };

  return labels[action] || "Send to this device";
}

function queueIncomingDeviceCommand(command) {
  if (!command?.action) return;

  if (!devicePrefs.receiveTransfers) {
    showBookmarkToast("Send to device", "Incoming handoff blocked — receiving is off");
    return;
  }

  const remoteActions = new Set(["play_now", "open_current_time", "sync_current_track", "full_queue_handoff"]);

  if (!devicePrefs.allowRemote && remoteActions.has(String(command.action || ""))) {
    showBookmarkToast("Send to device", "Incoming remote playback blocked");
    return;
  }

  incomingDeviceCommandQueue.push(command);
  showNextIncomingDeviceCommand();
}

function hideIncomingDevicePrompt() {
  const prompt = getIncomingDevicePrompt();
  prompt.classList.add("hidden");
}

function showNextIncomingDeviceCommand() {
  if (incomingDeviceCommandActive) return;

  const command = incomingDeviceCommandQueue.shift();
  if (!command) return;

  incomingDeviceCommandActive = command;

  const prompt = getIncomingDevicePrompt();
  const titleEl = prompt.querySelector("#incomingDeviceTitle");
  const subEl = prompt.querySelector("#incomingDeviceSub");
  const acceptBtn = prompt.querySelector("#btnIncomingDeviceAccept");
  const declineBtn = prompt.querySelector("#btnIncomingDeviceDecline");

  const action = String(command.action || "");
  const payload = command.payload || {};
  const fromName = payload.fromName || "another device";
  const trackTitle = payload.trackTitle || payload.currentTimedTitle || "this audio";
  const actionLabel = getIncomingDeviceActionLabel(action);

  if (titleEl) {
    titleEl.textContent = `${actionLabel}?`;
  }

  if (subEl) {
    subEl.textContent = `${fromName} wants to send “${trackTitle}” to this device.`;
  }

  if (acceptBtn) {
    acceptBtn.onclick = async () => {
      const acceptedCommand = incomingDeviceCommandActive;
      incomingDeviceCommandActive = null;
      hideIncomingDevicePrompt();

      if (acceptedCommand) {
        await handleIncomingDeviceCommand(acceptedCommand);
      }

      showNextIncomingDeviceCommand();
    };
  }

  if (declineBtn) {
    declineBtn.onclick = () => {
      incomingDeviceCommandActive = null;
      hideIncomingDevicePrompt();
      showBookmarkToast("Send to device", "Incoming handoff declined");
      showNextIncomingDeviceCommand();
    };
  }

  prompt.classList.remove("hidden");
}

async function handleIncomingDeviceCommand(command) {
  const action = String(command?.action || "");
  const payload = command?.payload || {};
  if (!action) return;

  if (action === "play_now") {
    const track = await playIncomingTrackById(payload.trackId, {
      autoplay: true,
      openPlayer: true,
    });
    if (track) showBookmarkToast("Send to device", `Now playing ${track.title || track.id}`);
    return;
  }

  if (action === "open_mix") {
    const track = await playIncomingTrackById(payload.trackId, {
      autoplay: false,
      openPlayer: true,
    });
    if (track) showBookmarkToast("Send to device", `Opened ${track.title || track.id}`);
    return;
  }

  if (action === "open_current_time" || action === "sync_current_track") {
    const track = await playIncomingTrackById(payload.trackId, {
      autoplay: true,
      openPlayer: true,
      seekToSec: Number(payload.currentTime || 0),
    });

    if (track) {
      const suffix = payload.currentTrackNumber
        ? ` • track ${payload.currentTrackNumber}`
        : "";
      showBookmarkToast("Send to device", `Synced ${track.title || track.id}${suffix}`);
    }
    return;
  }

  if (action === "add_queue") {
    const track = await ensureLibraryTrackById(payload.trackId);
    if (track) {
      addToQueue(track);
      showBookmarkToast("Send to device", `Added ${track.title || track.id} to queue`);
    }
    return;
  }

  if (action === "full_queue_handoff") {
    const items = await hydrateTracksFromIds(payload.queueIds || []);
    if (replaceQueueWithTracks(items)) {
      showBookmarkToast("Send to device", `Queue handoff received • ${items.length} tracks`);
    }
    return;
  }

  if (action === "send_tracklist") {
    const count = Number(payload.tracklistTrackCount || 0);
    showBookmarkToast("Send to device", `Tracklist received • ${count} tracks`);
    return;
  }

  if (action === "send_current_track") {
    const numberText = String(payload.currentTrackNumber || "").trim();
    const titleText = String(payload.currentTimedTitle || "Current track").trim();
    showBookmarkToast("Send to device", numberText ? `Track ${numberText} • ${titleText}` : titleText);
  }
}

function buildSendToDeviceCommand(action, selected, track) {
  const activeTimed = getCurrentTimedTrack();
  const queueIds = Array.isArray(queue)
    ? queue.map((item) => item?.id).filter(Boolean)
    : [];
  const tracklistTrackCount = Array.isArray(currentTracklistData?.tracks)
    ? currentTracklistData.tracks.length
    : 0;

  return {
    fromDeviceId: devicePrefs.deviceId,
    targetDeviceId: selected.id,
    action,
    payload: {
      trackId: track.id,
      trackTitle: track.title || track.id,
      currentTime: Number(audio?.currentTime || 0),
      queueIds,
      currentTrackNumber: activeTimed?.number || "",
      currentTimedTitle: activeTimed?.title || "",
      tracklistTrackCount,
      fromName: devicePrefs.name || "This device",
    },
  };
}

async function sendDeviceActionToServer(action, selected, track) {
  const actionLabels = {
    play_now: "Play now",
    add_queue: "Add to queue",
    open_mix: "Open mix",
    open_current_time: "Open at current time",
    send_tracklist: "Send full tracklist",
    send_current_track: "Send current track number",
    sync_current_track: "Sync current track",
    full_queue_handoff: "Full queue handoff",
  };

  try {
    const data = await postJsonNoStore(
      "/devices/send",
      buildSendToDeviceCommand(action, selected, track)
    );

    setKnownDevicesFromServer(data?.devices || []);

    queuePlayerEvent(
      "device_handoff",
      track,
      {
        route: selected.id || "device",
        status: action,
        flushNow: true,
      }
    );

    showBookmarkToast(
      "Send to device",
      `${actionLabels[action] || "Sent"} to ${selected.name}`
    );
  } catch (err) {
    console.warn("send device action failed", err);
    showBookmarkToast("Send to device", String(err?.message || "Could not send action"));
  }
}

function startDeviceRelay() {
  if (deviceRelayStarted) return;
  deviceRelayStarted = true;

  void refreshDeviceDirectory("register");
  void fetchPendingDeviceCommands();

  if (deviceHeartbeatTimer) clearInterval(deviceHeartbeatTimer);
  if (deviceCommandPollTimer) clearInterval(deviceCommandPollTimer);

  deviceHeartbeatTimer = window.setInterval(() => {
    void refreshDeviceDirectory("heartbeat");
  }, DEVICE_HEARTBEAT_MS);

  deviceCommandPollTimer = window.setInterval(() => {
    void fetchPendingDeviceCommands();
  }, DEVICE_COMMAND_POLL_MS);
}

function getBrowserBookmarksStore() {
  try {
    return JSON.parse(localStorage.getItem("brmedia_bookmarks") || "{}");
  } catch {
    return {};
  }
}

function getBrowserBookmarkPrefsStore() {
  try {
    return JSON.parse(localStorage.getItem("brmedia_bookmark_prefs") || "{}");
  } catch {
    return {};
  }
}

function setBackupStatus(text, tone = "") {
  if (!backupStatusText) return;
  backupStatusText.textContent = text;
  backupStatusText.classList.toggle("isLoading", tone === "loading");
  backupStatusText.classList.toggle("isSuccess", tone === "success");
  backupStatusText.classList.toggle("isError", tone === "error");
}

function renderGeneralSettingsUI() {
  if (settingsStatLibrary) {
    settingsStatLibrary.textContent = `${library.length} mixes loaded`;
  }

  if (settingsStatWaveforms) {
    settingsStatWaveforms.textContent = waveformGenerationInFlight
      ? "Waveform job running"
      : "Waveform export ready";
  }

  if (settingsStatDevices) {
    const onlineCount = getOnlineKnownDevices().length;
    settingsStatDevices.textContent = onlineCount
      ? `${onlineCount} online device${onlineCount === 1 ? "" : "s"}`
      : "No online devices yet";
  }

  if (settingsStatBackups) {
    settingsStatBackups.textContent = "Browser + server exports ready";
  }
}

function renderBackupSettingsUI() {
  setBackupStatus("Ready. Export browser data, server data, cloud/source settings, playlists, tracklists and server media data.");
}

function collectSelectedBackupSections() {
  const sections = [];
  if (backupIncludeSettings?.checked) sections.push("settings");
  if (backupIncludeFavourites?.checked) sections.push("favourites");
  if (backupIncludeBookmarks?.checked) sections.push("bookmarks");
  if (backupIncludePlaylists?.checked) sections.push("playlists");
  if (backupIncludePlaylistPrefs?.checked) sections.push("playlist_prefs");
  if (backupIncludeDevicePrefs?.checked) sections.push("device_prefs");
  if (backupIncludeLibrary?.checked) sections.push("library_manifest");
  if (backupIncludeTracklists?.checked) sections.push("tracklists");
  if (backupIncludeWaveforms?.checked) sections.push("waveforms");
  return sections;
}

function buildBrowserBackupSnapshot() {
  return {
    settings: { ...settings },
    favourites: readPersistedJson(FAVOURITES_KEY, {}),
    playlists: readPersistedJson(PLAYLISTS_KEY, []),
    playlistPrefs: readPersistedJson(PLAYLIST_PREFS_KEY, {}),
    devicePrefs: { ...devicePrefs },
    bookmarks: getBrowserBookmarksStore(),
    bookmarkPrefs: getBrowserBookmarkPrefsStore(),
  };
}

function buildBackupFilename(scope = "backup") {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `brmedia-${scope}-${stamp}.json`;
}

function isIosLikeDevice() {
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";

  return /iPad|iPhone|iPod/i.test(ua) || (platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandaloneWebAppMode() {
  return window.navigator?.standalone === true
    || window.matchMedia?.("(display-mode: standalone)")?.matches
    || window.matchMedia?.("(display-mode: fullscreen)")?.matches;
}

function shouldUseIosDownloadHandoff() {
  return isIosLikeDevice() && isStandaloneWebAppMode();
}

function toAbsoluteAppUrl(url) {
  try {
    return new URL(url, window.location.href).toString();
  } catch {
    return String(url || "");
  }
}

function openBrmediaUrl(url, options = {}) {
  const href = toAbsoluteAppUrl(url);
  const opened = window.open(href, "_blank", "noopener,noreferrer");

  if (!opened && options.fallbackToLocation) {
    window.location.href = href;
    return "location";
  }

  return opened ? "opened" : "blocked";
}

function startBrowserFileDownload(url, filename = "download", options = {}) {
  const href = toAbsoluteAppUrl(url);

  if (options.targetBlank || shouldUseIosDownloadHandoff()) {
    return openBrmediaUrl(href, { fallbackToLocation: options.fallbackToLocation !== false });
  }

  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();

  return "download";
}

async function saveBlobAsBrowserFile(blob, filename, options = {}) {
  const safeFilename = filename || "download";

  if (shouldUseIosDownloadHandoff() && typeof File === "function" && navigator.share) {
    const file = new File([blob], safeFilename, {
      type: blob.type || options.type || "application/octet-stream",
    });

    if (!navigator.canShare || navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: options.title || safeFilename,
          text: options.text || "",
          files: [file],
        });
        return "shared";
      } catch (err) {
        if (err?.name === "AbortError") return "cancelled";
        console.warn("iOS file share failed, falling back to browser download", err);
      }
    }
  }

  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = safeFilename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
  return "download";
}

async function downloadJsonFile(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  return saveBlobAsBrowserFile(blob, filename, {
    title: filename,
    text: "BRMedia JSON export",
  });
}

async function exportBackupPackage(scope = "selected") {
  const ALL_SECTIONS = [
    "settings",
    "favourites",
    "bookmarks",
    "playlists",
    "playlist_prefs",
    "device_prefs",
    "library_manifest",
    "tracklists",
    "waveforms",
  ];

  let sections = collectSelectedBackupSections();
  if (scope === "all") {
    sections = ALL_SECTIONS.slice();
  } else if (scope === "browser") {
    sections = ["settings", "favourites", "bookmarks", "playlists", "playlist_prefs", "device_prefs"];
  } else if (scope === "server") {
    sections = ["library_manifest", "tracklists", "waveforms"];
  }

  if (!sections.length) {
    setBackupStatus("Pick at least one backup section first.", "error");
    return;
  }

  setBackupStatus("Building backup package…", "loading");

  try {
    const data = await postJsonNoStore("/backup/export", {
      sections,
      browserData: buildBrowserBackupSnapshot(),
    });

    const backup = data?.backup || data;
    await downloadJsonFile(buildBackupFilename(scope), backup);
    setBackupStatus(`Backup ready • ${sections.length} section${sections.length === 1 ? "" : "s"} exported.`, "success");
    renderGeneralSettingsUI();
  } catch (err) {
    console.warn("backup export failed", err);
    setBackupStatus(String(err?.message || "Backup export failed"), "error");
  }
}

function countObjectKeys(value) {
  return value && typeof value === "object" ? Object.keys(value).length : 0;
}

function countArrayItems(value) {
  return Array.isArray(value) ? value.length : 0;
}

function getBackupPreviewStats(backup) {
  const browser = backup?.browser || {};
  const server = backup?.server || {};
  const stats = [];

  stats.push({
    label: "Settings",
    value: browser.settings ? "Included" : "Not found",
  });

  stats.push({
    label: "Favourites",
    value: `${countObjectKeys(browser.favourites)} items`,
  });

  stats.push({
    label: "Bookmarks",
    value: `${countObjectKeys(browser.bookmarks)} mixes`,
  });

  stats.push({
    label: "Playlists",
    value: `${countArrayItems(browser.playlists)} playlists`,
  });

  stats.push({
    label: "Devices",
    value: browser.devicePrefs ? "Included" : "Not found",
  });

  stats.push({
    label: "Library",
    value: `${countArrayItems(server.libraryManifest)} files`,
  });

  stats.push({
    label: "Tracklists",
    value: `${countObjectKeys(server.tracklists)} files`,
  });

  stats.push({
    label: "Waveforms",
    value: `${countObjectKeys(server.waveforms)} cached`,
  });

  return stats;
}

function renderBackupRestorePreview(backup, fileName = "") {
  if (!backupRestorePreview || !backupRestorePreviewGrid) return;

  if (!backup) {
    backupRestorePreview.classList.add("hidden");
    backupRestorePreviewGrid.innerHTML = "";
    return;
  }

  const stats = getBackupPreviewStats(backup);

  backupRestorePreviewGrid.innerHTML = stats.map((stat) => `
    <div class="backupPreviewStat">
      <div class="backupPreviewLabel">${escapeHtml(stat.label)}</div>
      <div class="backupPreviewValue">${escapeHtml(stat.value)}</div>
    </div>
  `).join("");

  backupRestorePreview.classList.remove("hidden");

  if (backupRestorePickedText) {
    backupRestorePickedText.textContent = fileName
      ? `Selected backup: ${fileName}`
      : "Backup loaded.";
  }
}

async function previewBackupRestoreFile(file) {
  backupRestoreLoadedPackage = null;
  backupRestoreLoadedFile = null;
  renderBackupRestorePreview(null);

  if (!file) {
    setBackupRestoreStatus("Ready. Pick a BRMedia backup JSON, then restore it.");
    if (backupRestorePickedText) backupRestorePickedText.textContent = "No backup file selected yet.";
    return;
  }

  setBackupRestoreStatus("Reading backup preview…", "loading");

  try {
    const backup = await readJsonFileFromUser(file);

    backupRestoreLoadedPackage = backup;
    backupRestoreLoadedFile = file;

    renderBackupRestorePreview(backup, file.name);
    setBackupRestoreStatus("Backup preview ready. Check the sections, then restore when ready.", "success");
  } catch (err) {
    backupRestoreLoadedPackage = null;
    backupRestoreLoadedFile = null;
    renderBackupRestorePreview(null);
    setBackupRestoreStatus(String(err?.message || "Could not preview backup file."), "error");

    if (backupRestorePickedText) {
      backupRestorePickedText.textContent = file
        ? `Could not read: ${file.name}`
        : "No backup file selected yet.";
    }
  }
}

function setBackupRestoreStatus(text, tone = "") {
  if (!backupRestoreStatusText) return;
  backupRestoreStatusText.textContent = text;
  backupRestoreStatusText.classList.toggle("isLoading", tone === "loading");
  backupRestoreStatusText.classList.toggle("isSuccess", tone === "success");
  backupRestoreStatusText.classList.toggle("isError", tone === "error");
}

function setLibraryUploadStatus(text, tone = "") {
  if (!libraryUploadStatusText) return;
  libraryUploadStatusText.textContent = text;
  libraryUploadStatusText.classList.toggle("isLoading", tone === "loading");
  libraryUploadStatusText.classList.toggle("isSuccess", tone === "success");
  libraryUploadStatusText.classList.toggle("isError", tone === "error");
}

async function readJsonFileFromUser(file) {
  const raw = await file.text();
  return JSON.parse(raw);
}

function applyBrowserBackupRestore(backup) {
  const browser = backup?.browser || {};

  if (browser.settings) {
    writePersistedJson(SETTINGS_KEY, browser.settings);
  }

  if (browser.favourites) {
    writePersistedJson(FAVOURITES_KEY, browser.favourites);
  }

  if (browser.playlists) {
    writePersistedJson(PLAYLISTS_KEY, browser.playlists);
  }

  if (browser.playlistPrefs) {
    writePersistedJson(PLAYLIST_PREFS_KEY, browser.playlistPrefs);
  }

  if (browser.devicePrefs) {
    writePersistedJson(DEVICE_PREFS_KEY, browser.devicePrefs);
  }

  if (browser.bookmarks) {
    localStorage.setItem("brmedia_bookmarks", JSON.stringify(browser.bookmarks));
  }

  if (browser.bookmarkPrefs) {
    localStorage.setItem("brmedia_bookmark_prefs", JSON.stringify(browser.bookmarkPrefs));
  }

  settings = loadSettings();
  devicePrefs = loadDevicePrefs();

  applySettingsToUI();
  renderFavourites();
  renderPlaylists();
  renderBookmarks();
  renderDeviceSettingsUI();
  renderSendToDeviceUI();
  renderGeneralSettingsUI();
}

async function restoreBackupPackageFromFile(file) {
  const backup = backupRestoreLoadedPackage || (file ? await readJsonFileFromUser(file) : null);

  if (!backup) {
    setBackupRestoreStatus("Pick a valid backup file first.", "error");
    return;
  }

  const ok = await confirmThemeAction(
    "Restore this BRMedia backup now? This can replace browser data such as settings, favourites, bookmarks, playlists and device preferences.",
    "Restore backup",
    "Restore"
  );

  if (!ok) {
    setBackupRestoreStatus("Restore cancelled. Backup preview is still loaded.");
    return;
  }

  setBackupRestoreStatus("Restoring backup…", "loading");

  try {
    const data = await postJsonNoStore("/backup/restore", { backup });

    applyBrowserBackupRestore(backup);
    await loadLibrary();

    const restored = data?.restored || {};
    const summary = [
      restored.libraryManifest ? `${restored.libraryManifest} library` : "",
      restored.tracklists ? `${restored.tracklists} tracklists` : "",
      restored.waveforms ? `${restored.waveforms} waveforms` : "",
    ].filter(Boolean).join(" • ");

    setBackupRestoreStatus(
      summary ? `Backup restored • ${summary}` : "Backup restored.",
      "success"
    );

    setBackupStatus("Restore completed. Export tools still ready.", "success");
    renderBackupRestorePreview(backup, backupRestoreLoadedFile?.name || file?.name || "");
    renderBackupSettingsUI();
  } catch (err) {
    console.warn("backup restore failed", err);
    setBackupRestoreStatus(String(err?.message || "Backup restore failed"), "error");
  }
}

async function fileToBase64(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function getLibraryUploadDisplayTitle(fileName = "") {
  const clean = String(fileName || "").split(/[\\/]/).pop() || "";
  const noExt = clean.replace(/\.[a-z0-9]{2,6}$/i, "");
  return noExt.replace(/[_]+/g, " ").trim() || clean || "Untitled media";
}

function getLibraryUploadSummaryText() {
  const total = libraryUploadQueue.length;
  if (!total) return "No media queued yet.";

  const selected = libraryUploadQueue.filter((item) => item.enabled).length;
  const uploaded = libraryUploadQueue.filter((item) => item.status === "uploaded").length;
  const failed = libraryUploadQueue.filter((item) => item.status === "failed").length;
  const processed = uploaded + failed;

  if (libraryUploadInFlight) {
    return `Uploading • ${processed}/${selected} processed • ${uploaded} uploaded • ${failed} failed`;
  }

  if (!selected) {
    return `0/${total} selected • Tick the files you want to upload`;
  }

  if (uploaded || failed) {
    return `Finished • ${uploaded}/${selected} uploaded • ${failed} failed`;
  }

  return `${selected}/${total} file${total === 1 ? "" : "s"} selected`;
}

function renderLibraryUploadQueue() {
  if (!libraryUploadPickedText || !libraryUploadStatusText) return;

  libraryUploadPickedText.textContent = getLibraryUploadSummaryText();

  if (!libraryUploadQueue.length) {
    libraryUploadStatusText.innerHTML = `<div class="waveformJobEmpty">Nothing queued yet.</div>`;
    return;
  }

  libraryUploadStatusText.innerHTML = libraryUploadQueue.map((item, index) => {
    const statusKey = String(item?.status || "queued");
    const statusLabel = {
      queued: "Queued",
      uploading: "Uploading Media",
      uploaded: "Media Uploaded",
      failed: "Failed",
      unticked: "Unticked",
    }[statusKey] || statusKey;

    const percent = Math.max(0, Math.min(100, Number(item?.progressPercent || 0)));
    const cardClass =
      statusKey === "uploaded"
        ? "isDone"
        : statusKey === "failed"
          ? "isFailed"
          : statusKey === "unticked"
            ? "isUnticked"
            : statusKey === "uploading"
              ? "isProcessing"
              : "";

    const detail = item?.detail || statusLabel;
    const fillWidth = statusKey === "queued" || statusKey === "unticked" ? 0 : percent;

    return `
      <div class="waveformJobCard ${cardClass}">
        <div class="waveformJobCardFillLayer" style="width:${fillWidth}%"></div>
        <div class="waveformJobCardInner">
          <div class="waveformJobRow">
            <div class="waveformJobMeta">
              <label class="uploadJobTitleRow">
                <input
                  class="uploadJobCheck"
                  type="checkbox"
                  data-upload-index="${index}"
                  ${item.enabled ? "checked" : ""}
                  ${libraryUploadInFlight ? "disabled" : ""}
                />
                <span class="waveformJobTitle">${escapeHtml(item.title || "Untitled media")}</span>
              </label>
              <div class="waveformJobDetail">${escapeHtml(detail)}</div>
            </div>
            <div class="waveformJobRight">
              <div class="waveformJobState">${escapeHtml(statusLabel)}</div>
              <div class="waveformJobPercent">${percent}%</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

async function uploadSingleMobileFile(file, onProgress) {
  const url = `/library/upload-mobile-file?name=${encodeURIComponent(file.name)}&mimeType=${encodeURIComponent(file.type || "application/octet-stream")}`;

  return await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || typeof onProgress !== "function") return;
      const percent = Math.max(1, Math.min(99, Math.round((event.loaded / event.total) * 100)));
      onProgress(percent);
    };

    xhr.onload = () => {
      let data = {};
      try {
        data = JSON.parse(xhr.responseText || "{}");
      } catch {}

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
      } else {
        reject(new Error(data?.error || `Upload failed (${xhr.status})`));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Upload failed"));
    };

    xhr.send(file);
  });
}

async function uploadMobileFilesFromPicker() {
  if (!libraryUploadQueue.length) {
    libraryUploadQueue = Array.from(libraryUploadInput?.files || []).map((file, index) => ({
      id: `upload-${Date.now()}-${index}`,
      file,
      enabled: true,
      status: "queued",
      progressPercent: 0,
      title: getLibraryUploadDisplayTitle(file.name),
      detail: "Queued",
    }));
  }

  const selectedItems = libraryUploadQueue.filter((item) => item.enabled);

  if (!selectedItems.length) {
    renderLibraryUploadQueue();
    return;
  }

  libraryUploadInFlight = true;

  for (const item of libraryUploadQueue) {
    if (!item.enabled) {
      item.status = "unticked";
      item.progressPercent = 0;
      item.detail = "Unticked • won't upload";
    } else if (item.status !== "uploaded") {
      item.status = "queued";
      item.progressPercent = 0;
      item.detail = "Queued";
    }
  }

  renderLibraryUploadQueue();

  for (const item of libraryUploadQueue) {
    if (!item.enabled) continue;

    try {
      item.status = "uploading";
      item.progressPercent = 1;
      item.detail = "Uploading media… 1%";
      renderLibraryUploadQueue();

      await uploadSingleMobileFile(item.file, (percent) => {
        item.status = "uploading";
        item.progressPercent = percent;
        item.detail = `Uploading media… ${percent}%`;
        renderLibraryUploadQueue();
      });

      item.status = "uploaded";
      item.progressPercent = 100;
      item.detail = "Media uploaded";
      renderLibraryUploadQueue();
    } catch (err) {
      item.status = "failed";
      item.progressPercent = 0;
      item.detail = String(err?.message || "Upload failed");
      console.warn("mobile upload failed", err);
      renderLibraryUploadQueue();
    }
  }

  libraryUploadInFlight = false;
  renderLibraryUploadQueue();

  await loadLibrary();
  renderGeneralSettingsUI();
}

const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

const EQ_PRESETS = {
  flat: { preamp: 0, bands: { "32": 0, "64": 0, "125": 0, "250": 0, "500": 0, "1000": 0, "2000": 0, "4000": 0, "8000": 0, "16000": 0 } },
  bass_boost: { preamp: -1.5, bands: { "32": 5.5, "64": 4.5, "125": 3, "250": 1, "500": 0, "1000": -0.5, "2000": -1, "4000": -1.5, "8000": -1.5, "16000": -1 } },
  treble_boost: { preamp: -1, bands: { "32": -1.5, "64": -1, "125": -0.5, "250": 0, "500": 0.5, "1000": 1.5, "2000": 2.5, "4000": 3.5, "8000": 4.5, "16000": 4 } },
  vocal: { preamp: -0.5, bands: { "32": -3, "64": -2, "125": -1, "250": 0, "500": 2, "1000": 3.5, "2000": 4, "4000": 3, "8000": 1.5, "16000": 0 } },
  loudness: { preamp: -2, bands: { "32": 4, "64": 3.5, "125": 2.5, "250": 1, "500": 0, "1000": 0, "2000": 1, "4000": 2, "8000": 3, "16000": 3 } },
  dance: { preamp: -1.5, bands: { "32": 3.5, "64": 5, "125": 4, "250": 0, "500": 1.5, "1000": 3, "2000": 4, "4000": 3.5, "8000": 2, "16000": 0 } },
  hardcore: { preamp: -2.5, bands: { "32": 4, "64": 6, "125": 5, "250": 1, "500": 1.5, "1000": 3.5, "2000": 5, "4000": 4.5, "8000": 3, "16000": 1 } },
  spoken_word: { preamp: 0, bands: { "32": -6, "64": -5, "125": -3.5, "250": -1, "500": 1.5, "1000": 3.5, "2000": 4.5, "4000": 3, "8000": 1, "16000": -1 } },
};

const EQ_SLIDERS = {
  "32": eqBand32,
  "64": eqBand64,
  "125": eqBand125,
  "250": eqBand250,
  "500": eqBand500,
  "1000": eqBand1k,
  "2000": eqBand2k,
  "4000": eqBand4k,
  "8000": eqBand8k,
  "16000": eqBand16k,
};

const EQ_VALUE_LABELS = {
  "32": eqVal32,
  "64": eqVal64,
  "125": eqVal125,
  "250": eqVal250,
  "500": eqVal500,
  "1000": eqVal1k,
  "2000": eqVal2k,
  "4000": eqVal4k,
  "8000": eqVal8k,
  "16000": eqVal16k,
};

function clampEqDb(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(-12, Math.min(12, Math.round(n * 10) / 10));
}

function isEqBlockedOnThisDevice() {
  return isAppleMobile;
}

function ensureEqSettingsShape() {
  settings.eqEnabled = !!settings.eqEnabled;
  settings.eqPreset = normaliseText(settings.eqPreset, "flat");
  settings.eqPreamp = clampEqDb(settings.eqPreamp);

  if (!settings.eqBands || typeof settings.eqBands !== "object") {
    settings.eqBands = { ...DEFAULTS.eqBands };
  }

  EQ_FREQUENCIES.forEach((freq) => {
    const key = String(freq);
    settings.eqBands[key] = clampEqDb(settings.eqBands[key]);
  });
}

async function ensureEqAudioGraph() {
  if (!audio) return false;

  if (!eqAudioContext) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;
    eqAudioContext = new Ctx();
  }

  if (!eqSourceNode) {
    eqSourceNode = eqAudioContext.createMediaElementSource(audio);
    eqPreampNode = eqAudioContext.createGain();

    let previousNode = eqSourceNode;

    EQ_FREQUENCIES.forEach((freq, idx) => {
      const filter = eqAudioContext.createBiquadFilter();
      filter.type = idx === 0 ? "lowshelf" : idx === EQ_FREQUENCIES.length - 1 ? "highshelf" : "peaking";
      filter.frequency.value = freq;
      if (filter.type === "peaking") filter.Q.value = 1.1;
      filter.gain.value = 0;
      previousNode.connect(filter);
      previousNode = filter;
      eqFilterNodes[String(freq)] = filter;
    });

    previousNode.connect(eqPreampNode);
    eqPreampNode.connect(eqAudioContext.destination);
  }

  if (eqAudioContext.state === "suspended") {
    try {
      await eqAudioContext.resume();
    } catch {}
  }

  return true;
}

function applyEqValuesToAudioGraph() {
  if (!eqPreampNode) return;

  const eqShouldBeActive = !!settings.eqEnabled && !eqTemporarilyBypassed;

  eqPreampNode.gain.value = eqShouldBeActive
    ? Math.pow(10, (clampEqDb(settings.eqPreamp) / 20))
    : 1;

  EQ_FREQUENCIES.forEach((freq) => {
    const key = String(freq);
    const filter = eqFilterNodes[key];
    if (!filter) return;
    filter.gain.value = eqShouldBeActive ? clampEqDb(settings.eqBands[key]) : 0;
  });
}

function updateEqValueLabels() {
  EQ_FREQUENCIES.forEach((freq) => {
    const key = String(freq);
    const label = EQ_VALUE_LABELS[key];
    if (label) {
      const value = clampEqDb(settings.eqBands[key]);
      label.textContent = value === 0 ? "0.0" : `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
    }
  });

  if (eqPreampValue) {
    const value = clampEqDb(settings.eqPreamp);
    eqPreampValue.textContent = `${value > 0 ? "+" : ""}${value.toFixed(1)} dB`;
  }

  if (eqStatusText) {
    if (isEqBlockedOnThisDevice()) {
      eqStatusText.textContent = "Foreground-only on iPhone";
    } else if (!settings.eqEnabled) {
      eqStatusText.textContent = "Off";
    } else if (eqTemporarilyBypassed) {
      eqStatusText.textContent = "Paused in background";
    } else {
      eqStatusText.textContent = `On • ${normaliseText(settings.eqPreset, "flat").replace(/_/g, " ")}`;
    }
  }
}

function syncEqPopupUI() {
  ensureEqSettingsShape();

  if (eqEnabled) {
    eqEnabled.checked = !!settings.eqEnabled;
    eqEnabled.disabled = isEqBlockedOnThisDevice();
  }

  if (eqPreset) eqPreset.value = settings.eqPreset || "flat";
  if (eqPreamp) eqPreamp.value = String(clampEqDb(settings.eqPreamp));

  EQ_FREQUENCIES.forEach((freq) => {
    const key = String(freq);
    const slider = EQ_SLIDERS[key];
    if (slider) slider.value = String(clampEqDb(settings.eqBands[key]));
  });

  updateEqValueLabels();
}

function applyEqPreset(presetName) {
  const preset = EQ_PRESETS[presetName] || EQ_PRESETS.flat;
  settings.eqPreset = presetName;
  settings.eqPreamp = clampEqDb(preset.preamp);

  EQ_FREQUENCIES.forEach((freq) => {
    const key = String(freq);
    settings.eqBands[key] = clampEqDb(preset.bands[key]);
  });

  saveSettings();
  syncEqPopupUI();

  if (isEqBlockedOnThisDevice()) return;

  applyEqValuesToAudioGraph();
}

async function setEqEnabledState(enabled) {
  if (enabled && isEqBlockedOnThisDevice()) {
    settings.eqEnabled = false;
    saveSettings();
    syncEqPopupUI();
    showBookmarkToast("Audio equalizer", "Live EQ on iPhone stops background playback");
    return;
  }

  settings.eqEnabled = !!enabled;
  saveSettings();
  syncEqPopupUI();

  if (settings.eqEnabled) {
    await ensureEqAudioGraph();
    applyEqValuesToAudioGraph();
  } else if (eqAudioContext && eqSourceNode) {
    applyEqValuesToAudioGraph();
  }
}

async function handleEqBandChange(freqKey, value) {
  settings.eqBands[freqKey] = clampEqDb(value);
  settings.eqPreset = "custom";
  saveSettings();
  syncEqPopupUI();

  if (isEqBlockedOnThisDevice()) return;

  await ensureEqAudioGraph();
  applyEqValuesToAudioGraph();
}

async function handleEqPreampChange(value) {
  settings.eqPreamp = clampEqDb(value);
  settings.eqPreset = "custom";
  saveSettings();
  syncEqPopupUI();

  if (isEqBlockedOnThisDevice()) return;

  await ensureEqAudioGraph();
  applyEqValuesToAudioGraph();
}

async function openEqPopup(anchorButton) {
  syncEqPopupUI();
  openTopPopup("eq", anchorButton);

  if (settings.eqEnabled) {
    await ensureEqAudioGraph();
    applyEqValuesToAudioGraph();
  }
}

function getCastSupportInfo() {
  const hasAudio = !!audio;
  const remote = hasAudio ? audio.remote : null;
  const hasRemotePrompt = !!remote && typeof remote.prompt === "function";
  const hasSafariPicker = hasAudio && typeof audio.webkitShowPlaybackTargetPicker === "function";

  if (hasRemotePrompt || hasSafariPicker) {
    let status = "Cast is available on this device";
    let hint = "Choose a cast / AirPlay / remote playback device if your browser finds one.";
    let buttonLabel = "Cast to device";

    const remoteState = audio?.remote?.state || "disconnected";

    if (remoteState === "connecting") {
      status = "Connecting to remote playback";
      hint = "Your browser is trying to hand playback to another device.";
      buttonLabel = "Connecting…";
    } else if (remoteState === "connected") {
      status = "Remote playback is active";
      hint = "Playback is currently routed to another device.";
      buttonLabel = "Change cast device";
    } else if (hasSafariPicker && !hasRemotePrompt) {
      status = "AirPlay / playback target picker is available";
      hint = "Safari can show its playback target picker from the player.";
      buttonLabel = "Choose playback device";
    }

    return {
      supported: true,
      status,
      hint,
      buttonLabel,
    };
  }

  return {
    supported: false,
    status: "Cast isn’t available here",
    hint: "This browser/device does not expose cast controls to the web player right now. Use BRMedia Send to Device as the fallback.",
    buttonLabel: "Send to Device",
  };
}

function updateCastPopupUI() {
  const info = getCastSupportInfo();

  if (castStatusText) castStatusText.textContent = info.status;
  if (castHintText) castHintText.textContent = info.hint;

  if (castCurrentRoute) {
    const remoteState = audio?.remote?.state || "disconnected";
    let routeText = "This device";

    if (remoteState === "connecting") routeText = "Connecting…";
    if (remoteState === "connected") routeText = "Remote device";

    castCurrentRoute.textContent = routeText;
  }

  if (btnCastStart) {
    btnCastStart.textContent = info.buttonLabel;
    btnCastStart.disabled = !info.supported || audio?.remote?.state === "connecting";
    btnCastStart.classList.toggle("disabledLike", btnCastStart.disabled);
  }
}

async function openCastPopup(anchorButton) {
  updateCastPopupUI();
  openTopPopup("cast", anchorButton);
}

async function startCastFlow() {
  const info = getCastSupportInfo();

  if (!info.supported || !audio) {
    updateCastPopupUI();
    openSendToDevicePopup(btnPlayerQuickCast || btnTopMenu || btnSleep);
    return;
  }

  try {
    if (audio.remote && typeof audio.remote.prompt === "function") {
      await audio.remote.prompt();
      updateCastPopupUI();
      return;
    }

    if (typeof audio.webkitShowPlaybackTargetPicker === "function") {
      audio.webkitShowPlaybackTargetPicker();
      updateCastPopupUI();
      return;
    }

    updateCastPopupUI();
  } catch (err) {
    console.warn("Cast prompt failed", err);
    updateCastPopupUI();
    showBookmarkToast("Cast", "No cast device selected");
  }
}

function bindCastStateListeners() {
  if (audio?.remote && typeof audio.remote.addEventListener === "function") {
    audio.remote.addEventListener("connecting", updateCastPopupUI);
    audio.remote.addEventListener("connect", updateCastPopupUI);
    audio.remote.addEventListener("disconnect", updateCastPopupUI);
  }
}

function getMirrorSupportInfo() {
  const hasDisplayMedia =
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getDisplayMedia === "function";

  if (mirrorStream) {
    return {
      supported: true,
      status: "Mirror / screen share is active",
      hint: mirrorStreamLabel
        ? `Shared surface: ${mirrorStreamLabel}`
        : "A shared screen or tab is currently active.",
      buttonLabel: "Stop mirror",
      active: true,
    };
  }

  if (hasDisplayMedia) {
    return {
      supported: true,
      status: "Screen share is available here",
      hint: "BRMedia can open your browser’s screen-share picker where this browser supports it.",
      buttonLabel: "Start mirror",
      active: false,
    };
  }

  return {
    supported: false,
    status: "Mirror isn’t available here",
    hint: "This browser/device does not expose page-level screen sharing here. Use your phone/TV mirror controls, or BRMedia Send to Device.",
    buttonLabel: "Send to Device",
    active: false,
  };
}

function updateMirrorPopupUI() {
  const info = getMirrorSupportInfo();

  if (mirrorStatusText) mirrorStatusText.textContent = info.status;
  if (mirrorHintText) mirrorHintText.textContent = info.hint;
  if (mirrorCurrentRoute) mirrorCurrentRoute.textContent = info.active ? "Active" : "Not active";

  if (btnMirrorStart) {
    btnMirrorStart.textContent = info.buttonLabel;
    btnMirrorStart.disabled = !info.supported;
    btnMirrorStart.classList.toggle("disabledLike", !info.supported);
  }
}

function handleMirrorStreamEnded() {
  if (mirrorStream) {
    mirrorStream.getTracks().forEach((track) => {
      track.onended = null;
    });
  }
  mirrorStream = null;
  mirrorStreamLabel = "";
  updateMirrorPopupUI();
}

async function openMirrorPopup(anchorButton) {
  updateMirrorPopupUI();
  openTopPopup("mirror", anchorButton);
}

function stopMirrorFlow() {
  if (!mirrorStream) {
    updateMirrorPopupUI();
    return;
  }

  mirrorStream.getTracks().forEach((track) => track.stop());
  handleMirrorStreamEnded();
  showBookmarkToast("Mirror", "Mirror stopped");
}

async function startMirrorFlow() {
  if (mirrorStream) {
    stopMirrorFlow();
    return;
  }

  const info = getMirrorSupportInfo();
  if (!info.supported) {
    updateMirrorPopupUI();
    openSendToDevicePopup(btnPlayerQuickMirror || btnTopMenu || btnSleep);
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });

    mirrorStream = stream;
    mirrorStreamLabel = stream.getVideoTracks?.()[0]?.label || "Shared display";

    stream.getTracks().forEach((track) => {
      track.onended = handleMirrorStreamEnded;
    });

    updateMirrorPopupUI();
    showBookmarkToast("Mirror", "Screen share started");
  } catch (err) {
    console.warn("Mirror prompt failed", err);
    updateMirrorPopupUI();
    showBookmarkToast("Mirror", "No screen selected");
  }
}

function getAudioOutputSupportInfo() {
  const hasAudioEl = !!audio;
  const hasSetSinkId = hasAudioEl && typeof audio.setSinkId === "function";
  const hasSelectAudioOutput =
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.selectAudioOutput === "function";
  const secure = !!window.isSecureContext;

  if (!secure) {
    return {
      supported: false,
      status: "Audio output needs HTTPS or localhost",
      hint: "Browser-controlled output switching needs HTTPS or localhost. Use Bluetooth/device controls, or send playback to another BRMedia device.",
      buttonLabel: "Send to Device",
    };
  }

  if (hasSetSinkId && hasSelectAudioOutput) {
    return {
      supported: true,
      status: "Choose an output device",
      hint: "BRMedia can ask the browser for a speaker, headset, Bluetooth route, or other output where supported.",
      buttonLabel: "Choose output",
    };
  }

  if (hasSetSinkId) {
    return {
      supported: true,
      status: "Output switching is partly available",
      hint: "This browser can set an audio sink, but may not expose a full picker.",
      buttonLabel: "Choose output",
    };
  }

  return {
    supported: false,
    status: "Audio output isn’t available here",
    hint: "This browser/device does not expose page-level audio route switching for BRMedia right now. Use device output controls or Send to Device.",
    buttonLabel: "Send to Device",
  };
}

async function enumerateAudioOutputs() {
  if (!navigator.mediaDevices?.enumerateDevices) return [];

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((device) => device.kind === "audiooutput");
  } catch (err) {
    console.warn("Enumerate audio outputs failed", err);
    return [];
  }
}

async function updateOutputPopupUI() {
  const info = getAudioOutputSupportInfo();

  if (outputStatusText) outputStatusText.textContent = info.status;
  if (outputHintText) outputHintText.textContent = info.hint;

  const routeLabel = outputSelectedSinkLabel || (audio?.sinkId ? "Selected device" : "This device");
  if (outputCurrentRoute) outputCurrentRoute.textContent = routeLabel;

  if (btnOutputChoose) {
    btnOutputChoose.textContent = info.buttonLabel;
    btnOutputChoose.disabled = !info.supported;
    btnOutputChoose.classList.toggle("disabledLike", !info.supported);
  }

  if (!outputDeviceList) return;

  const devices = await enumerateAudioOutputs();
  if (!devices.length) {
    outputDeviceList.classList.add("hidden");
    outputDeviceList.innerHTML = "";
    return;
  }

  outputDeviceList.classList.remove("hidden");
  outputDeviceList.innerHTML = devices.map((device) => {
    const label = device.label || "Audio output device";
    const active = !!outputSelectedSinkId && device.deviceId === outputSelectedSinkId;
    return `
      <button
        class="outputDeviceChip${active ? " active" : ""}"
        type="button"
        data-output-device-id="${escapeHtml(device.deviceId)}"
        data-output-device-label="${escapeHtml(label)}"
      >
        <span>${escapeHtml(label)}</span>
        <span>${active ? "Active" : "Available"}</span>
      </button>
    `;
  }).join("");
}

async function openOutputPopup(anchorButton) {
  await updateOutputPopupUI();
  openTopPopup("output", anchorButton);
}

async function startAudioOutputFlow() {
  const info = getAudioOutputSupportInfo();
  if (!info.supported || !audio) {
    await updateOutputPopupUI();
    openSendToDevicePopup(btnPlayerQuickOutput || btnTopMenu || btnSleep);
    return;
  }

  try {
    let selectedDevice = null;

    if (navigator.mediaDevices?.selectAudioOutput) {
      selectedDevice = await navigator.mediaDevices.selectAudioOutput();
    }

    if (selectedDevice && typeof audio.setSinkId === "function") {
      await audio.setSinkId(selectedDevice.deviceId);
      outputSelectedSinkId = selectedDevice.deviceId;
      outputSelectedSinkLabel = selectedDevice.label || "Selected device";
      await updateOutputPopupUI();
      showBookmarkToast("Audio output", outputSelectedSinkLabel || "Output updated");
      return;
    }

    await updateOutputPopupUI();
  } catch (err) {
    console.warn("Audio output selection failed", err);
    await updateOutputPopupUI();
    showBookmarkToast("Audio output", "No output device selected");
  }
}

function setEqTemporaryBypassState(shouldBypass) {
  const nextValue = !!shouldBypass;
  if (eqTemporarilyBypassed === nextValue) return;

  eqTemporarilyBypassed = nextValue;

  if (eqAudioContext && eqSourceNode) {
    applyEqValuesToAudioGraph();
  }

  syncEqPopupUI();
}

function syncEqWithPageVisibility() {
  const hidden = document.hidden || document.visibilityState === "hidden";
  setEqTemporaryBypassState(hidden);
}

function clampSkip(n) {
  const value = Number(n || 0);
  if (!Number.isFinite(value)) return 25;
  return Math.max(5, Math.min(120, Math.round(value)));
}

function commitSkipInputValue(kind) {
  const isBack = kind === "back";
  const input = isBack ? valBack : valFwd;
  if (!input) return;

  const nextValue = clampSkip(input.value);

  if (isBack) {
    settings.skipBackSec = nextValue;
  } else {
    settings.skipFwdSec = nextValue;
  }

  saveSettings();
  applySettingsToUI();
}

function fmtTime(sec) {
  const safe = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function fmtCountdown(sec) {
  const safe = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fmtCountdownCompact(sec) {
  const safe = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function hideSleepFinalOverlay() {
  sleepFinalOverlayVisible = false;
  if (sleepFinalOverlay) sleepFinalOverlay.classList.add("hidden");
}

function showSleepFinalOverlay(seconds) {
  sleepFinalOverlayVisible = true;
  if (sleepFinalCountdownNumber) {
    sleepFinalCountdownNumber.textContent = String(Math.max(1, Math.ceil(seconds || 0)));
  }
  if (sleepFinalOverlay) sleepFinalOverlay.classList.remove("hidden");
}

function normaliseText(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function parseClockInputToSeconds(raw) {
  const text = normaliseText(raw).trim();
  if (!text) return NaN;

  const parts = text.split(":").map((part) => part.trim());
  if (!parts.every((part) => /^\d+$/.test(part))) return NaN;

  if (parts.length === 1) return Number(parts[0]) || 0;
  if (parts.length === 2) return (Number(parts[0]) * 60) + Number(parts[1]);
  if (parts.length === 3) return (Number(parts[0]) * 3600) + (Number(parts[1]) * 60) + Number(parts[2]);

  return NaN;
}

function clampPreviewShareDuration(sec) {
  return Math.max(1, Math.min(120, Math.floor(Number(sec) || 0)));
}

function buildPreviewShareUrl(trackId, startSec, durationSec) {
  const params = new URLSearchParams({
    start: String(Math.max(0, Number(startSec) || 0)),
    duration: String(clampPreviewShareDuration(durationSec)),
  });

  return `/preview/${encodeURIComponent(trackId)}?${params.toString()}`;
}

function syncPreviewSharePresetButtons() {
  const activeDuration = clampPreviewShareDuration(previewShareState.durationSec);

  previewSharePresetButtons.forEach((btn) => {
    btn.classList.toggle(
      "active",
      Number(btn.dataset.previewSeconds || 0) === activeDuration
    );
  });
}

function refreshPreviewShareUi() {
  const track = currentTrack();
  if (!track || !previewShareState.trackId) return;

  const trackDuration = Math.max(1, Math.floor(Number(track.duration) || 0));

  previewShareState.startSec = Math.max(
    0,
    Math.min(trackDuration - 1, Math.floor(Number(previewShareState.startSec) || 0))
  );

  previewShareState.endSec = Math.max(
    previewShareState.startSec + 1,
    Math.min(trackDuration, Math.floor(Number(previewShareState.endSec) || 0))
  );

  previewShareState.durationSec = clampPreviewShareDuration(
    previewShareState.endSec - previewShareState.startSec
  );

  if (previewShareStartInput) previewShareStartInput.value = fmtCountdown(previewShareState.startSec);
  if (previewShareEndInput) previewShareEndInput.value = fmtCountdown(previewShareState.endSec);
  if (previewShareDurationInput) previewShareDurationInput.value = String(previewShareState.durationSec);

  if (previewShareSummary) {
    previewShareSummary.classList.remove("isBusy", "isSuccess", "isError");
    previewShareSummary.innerHTML = `
      <div class="previewShareSummaryTitle">${escapeHtml(track.title || track.id)}</div>
      <div class="previewShareSummaryMeta">${fmtCountdown(previewShareState.startSec)} to ${fmtCountdown(previewShareState.endSec)} • ${previewShareState.durationSec}s clip</div>
    `;
  }

  if (previewShareAudio) {
    previewShareAudio.src = buildPreviewShareUrl(
      track.id,
      previewShareState.startSec,
      previewShareState.durationSec
    );
  }

  syncPreviewSharePresetButtons();
}

function openPreviewShareOverlay() {
  const track = currentTrack();
  if (!track) return;

  const start = Math.max(0, Math.floor(Number(audio?.currentTime) || 0));

  const defaultDuration = clampPreviewShareDuration(settings.previewShareDefaultLength || 30);

  previewShareState = {
    trackId: track.id,
    startSec: start,
    endSec: Math.min(Math.max(1, Math.floor(Number(track.duration) || 0)), start + defaultDuration),
    durationSec: defaultDuration,
  };

  refreshPreviewShareUi();
  if (previewShareOverlay) previewShareOverlay.classList.remove("hidden");
}

function closePreviewShareOverlay() {
  if (previewShareOverlay) previewShareOverlay.classList.add("hidden");

  if (previewShareAudio) {
    previewShareAudio.pause();
    previewShareAudio.removeAttribute("src");
    previewShareAudio.load();
  }
}

function applyPreviewSharePreset(seconds) {
  const track = currentTrack();
  if (!track) return;

  const duration = clampPreviewShareDuration(seconds);
  previewShareState.durationSec = duration;
  previewShareState.endSec = Math.min(
    Math.max(1, Math.floor(Number(track.duration) || 0)),
    previewShareState.startSec + duration
  );

  previewShareState.durationSec = clampPreviewShareDuration(
    previewShareState.endSec - previewShareState.startSec
  );

  refreshPreviewShareUi();
}

function setPreviewShareStartFromCurrent() {
  const track = currentTrack();
  if (!track) return;

  previewShareState.startSec = Math.max(0, Math.floor(Number(audio?.currentTime) || 0));
  previewShareState.endSec = Math.min(
    Math.max(1, Math.floor(Number(track.duration) || 0)),
    previewShareState.startSec + clampPreviewShareDuration(previewShareState.durationSec || 30)
  );

  refreshPreviewShareUi();
}

function setPreviewShareStopFromCurrent() {
  const track = currentTrack();
  if (!track) return;

  const stop = Math.max(
    previewShareState.startSec + 1,
    Math.floor(Number(audio?.currentTime) || 0)
  );

  previewShareState.endSec = Math.min(
    Math.max(1, Math.floor(Number(track.duration) || 0)),
    stop
  );

  previewShareState.durationSec = clampPreviewShareDuration(
    previewShareState.endSec - previewShareState.startSec
  );

  refreshPreviewShareUi();
}

function commitPreviewShareInputs() {
  const track = currentTrack();
  if (!track) return false;

  const startSec = parseClockInputToSeconds(previewShareStartInput?.value || "");
  const endSec = parseClockInputToSeconds(previewShareEndInput?.value || "");
  const durationSec = clampPreviewShareDuration(previewShareDurationInput?.value || 0);
  const trackDuration = Math.max(1, Math.floor(Number(track.duration) || 0));

  if (Number.isFinite(startSec) && startSec >= 0) {
    previewShareState.startSec = Math.min(trackDuration - 1, Math.floor(startSec));
  }

  if (Number.isFinite(endSec) && endSec > previewShareState.startSec) {
    previewShareState.endSec = Math.min(trackDuration, Math.floor(endSec));
    previewShareState.durationSec = clampPreviewShareDuration(
      previewShareState.endSec - previewShareState.startSec
    );
  } else if (durationSec > 0) {
    previewShareState.durationSec = durationSec;
    previewShareState.endSec = Math.min(trackDuration, previewShareState.startSec + durationSec);
    previewShareState.durationSec = clampPreviewShareDuration(
      previewShareState.endSec - previewShareState.startSec
    );
  }

  refreshPreviewShareUi();
  return true;
}

async function sendPreviewShareClip() {
  const track = currentTrack();
  if (!track || previewShareBusy) return;

  commitPreviewShareInputs();

  const shareUrl = buildPreviewShareUrl(
    track.id,
    previewShareState.startSec,
    previewShareState.durationSec
  );

  const safeBase = normaliseText(track?.title, track?.id || "preview")
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "preview";

  previewShareBusy = true;

  if (btnPreviewShareSend) {
    btnPreviewShareSend.disabled = true;
    btnPreviewShareSend.textContent = "Building…";
  }

  if (previewShareSummary) {
    previewShareSummary.classList.remove("isSuccess", "isError");
    previewShareSummary.classList.add("isBusy");
    previewShareSummary.innerHTML = `
      <div class="previewShareSummaryTitle">Building preview clip…</div>
      <div class="previewShareSummaryMeta">${fmtCountdown(previewShareState.startSec)} • ${previewShareState.durationSec}s</div>
    `;
  }

  try {
    const res = await fetch(shareUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`Preview HTTP ${res.status}`);

    const blob = await res.blob();
    const file = new File(
      [blob],
      `${safeBase} preview ${fmtCountdown(previewShareState.startSec).replace(/:/g, "-")}.mp3`,
      { type: "audio/mpeg" }
    );

    const text =
      `${track.title || track.id} • `
      + `${fmtCountdown(previewShareState.startSec)} • `
      + `${previewShareState.durationSec}s preview`;

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: track.title || "BRMedia preview",
        text,
        files: [file],
      });

      showBookmarkToast("Preview shared", `${previewShareState.durationSec}s clip sent`);
} else {
  const result = await saveBlobAsBrowserFile(blob, file.name, {
    title: track.title || "BRMedia preview",
    text,
    type: "audio/mpeg",
  });

  if (result === "shared") {
    showBookmarkToast("Preview shared", `${previewShareState.durationSec}s clip sent`);
  } else if (result === "cancelled") {
    showBookmarkToast("Preview share", "Share cancelled");
  } else {
    showBookmarkToast(
      "Preview ready",
      shouldUseIosDownloadHandoff() ? "Opened with iOS file controls" : "Clip downloaded — share it from your phone"
    );
  }
}

    if (previewShareSummary) {
      previewShareSummary.classList.remove("isBusy", "isError");
      previewShareSummary.classList.add("isSuccess");
      previewShareSummary.innerHTML = `
        <div class="previewShareSummaryTitle">Preview ready</div>
        <div class="previewShareSummaryMeta">${escapeHtml(file.name)} • ${(blob.size / 1024 / 1024).toFixed(1)} MB</div>
      `;
    }
  } catch (err) {
    console.warn("Preview share failed", err);

    if (previewShareSummary) {
      previewShareSummary.classList.remove("isBusy", "isSuccess");
      previewShareSummary.classList.add("isError");
      previewShareSummary.textContent = "Could not build or share the preview clip.";
    }

    showBookmarkToast("Preview share", "Could not build or share the clip");
  } finally {
    previewShareBusy = false;

    if (btnPreviewShareSend) {
      btnPreviewShareSend.disabled = false;
      btnPreviewShareSend.textContent = "Share clip";
    }
  }
}

function joinMetaLine(...parts) {
  return parts
    .map((part) => normaliseText(part))
    .filter(Boolean)
    .join(" • ");
}

function isGoogleDriveLinkedTrack(track) {
  return !!track && (
    track.source === "google_drive" ||
    track.sourceType === "googleDrive" ||
    track.cloudProvider === "google_drive"
  );
}

function cloudLocalCopyIsRequired(track) {
  return isGoogleDriveLinkedTrack(track) && !track.importedLocalItemId;
}

function appendCloudLocalCopyNotice(meta, track) {
  if (!meta || !cloudLocalCopyIsRequired(track)) return;

  const notice = document.createElement("div");
  notice.className = "cloudLocalCopyNotice";
  notice.innerHTML = `<i class="fa-solid fa-circle-info"></i><span>Streams from Google Drive. Import a local copy before Tagger, Converter, Mastering or file edits.</span>`;
  meta.appendChild(notice);
}

function getTrackStreamUrl(track) {
  if (!track?.id) return "";
  if (track.streamUrl) return String(track.streamUrl);
  if (isGoogleDriveLinkedTrack(track)) {
    return `/cloud/google/stream/${encodeURIComponent(track.id)}`;
  }
  return `/stream/${encodeURIComponent(track.id)}`;
}

function getArtworkUrl(track) {
  if (isGoogleDriveLinkedTrack(track)) {
    return track?.hasArtwork ? `/cloud/google/artwork/${encodeURIComponent(track.id)}` : "";
  }

  return track?.id ? `/track/${encodeURIComponent(track.id)}/artwork` : "";
}

function getMixBadgeUrl(track) {
  const customTags = getBrMediaCustomTagsForTrack(track);
  const customBrand = String(customTags.brandImageKey || customTags.primaryBrand || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  if (customBrand) {
    const hasCustomNj = /dj\s*nj|\bnj\b/.test(customBrand);
    const hasCustomUp = /upalnite|\bup\b/.test(customBrand);

    if ((hasCustomNj && hasCustomUp) || /blackburn\s*ravers|blackburnravers|bb\s*ravers|brmedia|\bbr\b/.test(customBrand)) {
      return { key: "br", label: customTags.primaryBrand || "BB Ravers" };
    }

    if (hasCustomNj) return { key: "nj", label: "DJ NJ" };
    if (hasCustomUp) return { key: "up", label: "Upalnite" };
  }

  const primaryArtist = String(track?.artist || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  const fallbackArtist = String(track?.albumArtist || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  const brandSource = primaryArtist || fallbackArtist;

  const hasBr = /blackburn\s+ravers/.test(brandSource);
  const hasNj = /\bdj\s*nj\b/.test(brandSource);
  const hasUp = /\bupalnite\b/.test(brandSource);

  const hasNjUpCombo =
    (hasNj && hasUp)
    || /dj\s*nj\s*(?:&|and|\/|x|,|,|b2b)\s*(?:dj\s*)?upalnite/.test(brandSource)
    || /(?:dj\s*)?upalnite\s*(?:&|and|\/|x|,|,|b2b)\s*dj\s*nj/.test(brandSource);

  if (hasNjUpCombo) return { key: "br", label: "BB Ravers" };
  if (hasNj) return { key: "nj", label: "DJ NJ" };
  if (hasUp) return { key: "up", label: "Upalnite" };
  if (hasBr) return { key: "br", label: "BB Ravers" };

  return { key: "br", label: "BB Ravers" };
}

function renderMixBadge(track) {
  if (!brandMixWrap || !brandMixIcon || !brandMixArtist) return;

  const brand = getMixBadgeUrl(track);

  const brandIconMap = {
    br: "/shared/branding/global/br-logo-trans.png",
    nj: "/shared/branding/brands/nj-mixes-trans.png",
    up: "/shared/branding/brands/up-mixes-trans.png",
  };

  brandMixIcon.src = brandIconMap[brand.key] || "/player/br-logo-trans.png";
  brandMixArtist.textContent = brand.label;
  brandMixWrap.classList.remove("hidden");
}

const lazyArtworkObserver = typeof IntersectionObserver === "function"
  ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const el = entry.target;
        const url = el?.dataset?.artworkUrl || "";

        lazyArtworkObserver.unobserve(el);

        if (url) {
          setArtworkBackground(el, url);
          delete el.dataset.artworkUrl;
        }
      });
    }, {
      rootMargin: "380px 0px",
      threshold: 0.01,
    })
  : null;

function setArtworkBackground(el, url) {
  if (!el) return;

  if (url) {
    el.style.backgroundImage = `url("${url}")`;
    el.style.backgroundSize = "cover";
    el.style.backgroundPosition = "center";
    el.style.backgroundRepeat = "no-repeat";
    el.style.backgroundColor = "#182544";
  } else {
    el.style.backgroundImage = "";
    el.style.backgroundColor = "#182544";
  }
}

function applyArtwork(el, url) {
  if (!el) return;

  if (lazyArtworkObserver && url && el.classList.contains("thumb")) {
    setArtworkBackground(el, "");
    el.dataset.artworkUrl = url;
    lazyArtworkObserver.observe(el);
    return;
  }

  if (lazyArtworkObserver) {
    lazyArtworkObserver.unobserve(el);
  }

  delete el.dataset.artworkUrl;
  setArtworkBackground(el, url);
}

function renderArtwork(track, options = {}) {
  const { updateMain = true, updateMini = true, updateStage = true } = options;
  const url = track?.hasArtwork ? getArtworkUrl(track) : "";

  if (updateMain) applyArtwork(artworkEl, url);
  if (updateMini) applyArtwork(miniArt, url);

  if (updateStage) {
    applyArtwork(stageArtwork, url);
    applyArtwork(stageBackdrop, url);
  }
}

function currentTrack() {
  if (queueIndex < 0 || queueIndex >= queue.length) return null;
  return queue[queueIndex] || null;
}

function currentTrackId() {
  return currentTrack()?.id || "";
}

function findTrackById(trackId) {
  if (!trackId) return null;
  return library.find((item) => item.id === trackId)
    || queue.find((item) => item.id === trackId)
    || null;
}

function getPreviewTrack() {
  return findTrackById(previewTrackId);
}

function isShowingPreviewTrack() {
  if (!previewTrackId) return false;
  const currentId = currentTrackId();
  return !currentId || previewTrackId !== currentId;
}

function isAnotherTrackCurrentlyPlaying(track) {
  const current = currentTrack();
  if (!track?.id || !current?.id || !audio?.src || audio.paused) return false;
  return current.id !== track.id;
}

function closeTrackActionPrompt() {
  pendingTrackAction = null;
  if (trackActionPrompt) trackActionPrompt.classList.add("hidden");
}

function openTrackActionPrompt(track, options = {}) {
  if (!track || !trackActionPrompt) return;

  pendingTrackAction = {
    track,
    options: {
      ...options,
      openPlayer: options.openPlayer !== false,
      autoplay: options.autoplay !== false,
    },
  };

  if (trackActionPromptTitle) {
    trackActionPromptTitle.textContent = "What do you want to do with this mix?";
  }

  if (trackActionPromptSub) {
    trackActionPromptSub.textContent = track.title || track.id || "Choose an action for this track.";
  }

  trackActionPrompt.classList.remove("hidden");
}

function requestTrackPlay(track, options = {}) {
  if (!track) return;

  previewTrackId = track.id || "";

  if (isAnotherTrackCurrentlyPlaying(track)) {
    openTrackActionPrompt(track, options);
    return;
  }

  if (options.playMode === "queueIndex" && Number.isInteger(options.queueIndex)) {
    playAt(options.queueIndex);
    return;
  }

  loadTrackIntoPlayer(track, {
    openPlayer: options.openPlayer !== false,
    autoplay: options.autoplay !== false,
  });
}

function handleTrackCardPlayClick(e, track, options = {}) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  if (!track) return;

  const mergedOptions = {
    ...options,
    openPlayer: options.openPlayer !== false,
    autoplay: options.autoplay !== false,
  };

  if (isAnotherTrackCurrentlyPlaying(track)) {
    previewTrackId = track.id || "";
    openTrackActionPrompt(track, mergedOptions);
    return;
  }

  requestTrackPlay(track, mergedOptions);
}

function addTrackToQueueFromPrompt(track) {
  if (!track) return;

  const alreadyQueued = queue.some((item) => item.id === track.id);
  if (alreadyQueued) {
    showBookmarkToast("Queue", "This mix is already in your queue");
    return;
  }

  addToQueue(track);
  renderLibrary();
  renderLists();
  renderFavourites();
  showBookmarkToast("Added to queue", track.title || track.id || "Mix added");
}

function getFavouriteKey(track) {
  if (!track) return "";
  return getStableTrackKey(track) || String(track.id || "");
}

function isPreviewingDifferentTrack() {
  const currentId = currentTrackId();
  return !!previewTrackId && !!currentId && previewTrackId !== currentId;
}

function syncPreviewBackToCurrentTrack() {
  previewTrackId = currentTrackId();
}

function getStableTrackKey(track) {
  if (!track) return "";
  return (
    track.bookmarkKey ||
    track.file ||
    track.filename ||
    track.locator ||
    track.path ||
    track.id ||
    ""
  );
}

function hydrateTrack(baseItem, meta = {}) {
  const title = normaliseText(meta.title, normaliseText(baseItem.title, baseItem.id || "Unknown track"));
  const artist = normaliseText(meta.artist);
  const album = normaliseText(meta.album);
  const albumArtist = normaliseText(meta.albumArtist);
  const genre = normaliseText(meta.genre);
  const comment = normaliseText(meta.comment);
  const year = Number.isFinite(meta.year) ? meta.year : null;
  const bpm = Number.isFinite(meta.bpm) ? meta.bpm : null;
    const duration = Number.isFinite(meta.duration) ? meta.duration : null;
  const bitrate = Number.isFinite(meta.bitrate) ? meta.bitrate : null;
  const sampleRate = Number.isFinite(meta.sampleRate) ? meta.sampleRate : null;
  const numberOfChannels = Number.isFinite(meta.numberOfChannels) ? meta.numberOfChannels : null;
  const codec = normaliseText(meta.codec);
  const hasArtwork = meta.hasPicture === true || baseItem.hasArtwork === true;
  const mixBadge = normaliseText(meta.mixBadge, normaliseText(baseItem.mixBadge, "br")).toLowerCase();

  const track = {
    ...baseItem,
    ...meta,
    title,
    artist,
    album,
    albumArtist,
    genre,
    comment,
    year,
    bpm,
    duration,
    bitrate,
    sampleRate,
    numberOfChannels,
    codec,
    hasArtwork,
    mixBadge,
    subtitle: normaliseText(meta.subtitle, normaliseText(baseItem.subtitle)) || joinMetaLine(
      artist || (isGoogleDriveLinkedTrack(baseItem) ? "Google Drive" : "Local"),
      album || (isGoogleDriveLinkedTrack(baseItem) ? "Cloud Library" : "BRMedia")
    ),
    searchText: [title, artist, album, albumArtist, genre, comment, baseItem.id, baseItem.source, baseItem.cloudProvider]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  };

  track.bookmarkKey = getStableTrackKey(track);
  return track;
}

async function fetchTrackMeta(track) {
  if (!track?.id) return hydrateTrack(track || {});
  if (isGoogleDriveLinkedTrack(track)) return hydrateTrack(track || {});
  try {
    const res = await fetch(`/track/${encodeURIComponent(track.id)}/meta`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Metadata HTTP ${res.status}`);
    const meta = await res.json();
    return hydrateTrack(track, meta);
  } catch (err) {
    console.warn("Metadata fallback used for", track?.id, err);
    return hydrateTrack(track);
  }
}

function formatSampleRate(sampleRate) {
  const rate = Number(sampleRate || 0);
  if (!rate) return "";
  if (rate % 1000 === 0) return `${rate / 1000} kHz`;
  return `${(rate / 1000).toFixed(1)} kHz`;
}

function formatBitrate(bitrate) {
  const rate = Number(bitrate || 0);
  if (!rate) return "";
  return `${Math.round(rate / 1000)} kbps`;
}

function formatChannels(channels) {
  const c = Number(channels || 0);
  if (c === 1) return "Mono";
  if (c === 2) return "Stereo";
  if (c > 2) return `${c} ch`;
  return "";
}

function formatFileType(track) {
  const codec = normaliseText(track?.codec).toUpperCase();
  if (codec === "MPEG" || codec === "MPEG AUDIO") return "MP3";
  if (codec === "PCM") return "WAV";
  if (codec) return codec;

  const locator = String(track?.locator || "");
  const ext = locator.split(".").pop()?.toUpperCase() || "";
  return ext;
}

function updateFileInfoLine(track) {
  if (!fileInfoLine) return;

  if (!track) {
    fileInfoLine.textContent = "—";
    return;
  }

  const bitrate = formatBitrate(track.bitrate);
  const sampleRate = formatSampleRate(track.sampleRate);
  const channels = formatChannels(track.numberOfChannels || track.channels);
  const fileType = formatFileType(track);

  const parts = [bitrate, sampleRate, channels].filter(Boolean);
  if (!parts.length && fileType) parts.push(fileType);
  if (!parts.length) {
    fileInfoLine.textContent = "—";
    return;
  }

  fileInfoLine.textContent = parts.join(" • ");
}

function applySettingsToUI() {
  settings = normalisePlayerSettingsShape(settings);
  settings.skipBackSec = clampSkip(settings.skipBackSec);
  settings.skipFwdSec = clampSkip(settings.skipFwdSec);
  settings.playbackRate = clampPlaybackRate(settings.playbackRate);
  ensureEqSettingsShape();

if (setDownloads) setDownloads.checked = !!settings.downloads;
if (setShuffle) setShuffle.checked = !!settings.shuffle;
if (setSavePos) setSavePos.checked = !!settings.savePos;
if (setSaveState) setSaveState.checked = !!settings.saveState;
if (setAutoplay) setAutoplay.checked = !!settings.autoplay;

  if (valBack) valBack.value = String(settings.skipBackSec);
  if (valFwd) valFwd.value = String(settings.skipFwdSec);
  if (btnBackNText) btnBackNText.textContent = String(settings.skipBackSec);
  if (btnFwdNText) btnFwdNText.textContent = String(settings.skipFwdSec);

  if (btnTopDownload) btnTopDownload.style.display = settings.downloads ? "grid" : "none";

  if (audio) {
    audio.playbackRate = settings.playbackRate;
  }

  syncEqPopupUI();

  if (eqAudioContext && eqSourceNode) {
    applyEqValuesToAudioGraph();
  }

  updateSpeedPopupText();
  updateShuffleButton();
  updateRepeatButton();
  updatePlayIcons();
  applyWaveformSettingsToDom();
  renderWaveformPlaceholder();
}

function updateShuffleButton() {
  const active = !!settings.shuffle;

  if (btnShuffleTransport) {
    btnShuffleTransport.classList.toggle("active", active);
    btnShuffleTransport.setAttribute("aria-pressed", active ? "true" : "false");
  }

  setBrFaIconClass(icoShuffleTransport, "fa-solid fa-shuffle transportFa edgeFa");

  if (btnMenuShuffle) {
    btnMenuShuffle.setAttribute("aria-pressed", active ? "true" : "false");
  }

  if (menuShuffleText) {
    menuShuffleText.textContent = active ? "Shuffle on" : "Shuffle off";
  }
}

function updateRepeatButton() {
  const mode = settings.repeatMode || "off";
  const active = mode !== "off";

  if (btnRepeatTransport) {
    btnRepeatTransport.classList.remove("repeat-off", "repeat-all", "repeat-one");
    btnRepeatTransport.classList.add(
      mode === "one" ? "repeat-one" : mode === "all" ? "repeat-all" : "repeat-off"
    );
    btnRepeatTransport.classList.toggle("active", active);
    btnRepeatTransport.setAttribute("aria-pressed", active ? "true" : "false");
  }

  setBrFaIconClass(icoRepeatTransport, "fa-solid fa-repeat transportFa edgeFa"); 

  if (btnRepeatTransport) {
    btnRepeatTransport.dataset.repeatMode = mode;
    btnRepeatTransport.setAttribute(
      "aria-label",
      mode === "one" ? "Repeat one" : mode === "all" ? "Repeat all" : "Repeat off"
    );
  }

  if (btnMenuRepeat) {
    btnMenuRepeat.setAttribute("aria-pressed", active ? "true" : "false");
  }

  if (menuRepeatText) {
    menuRepeatText.textContent =
      mode === "one" ? "Repeat one" : mode === "all" ? "Repeat all" : "Repeat off";
  }
}

function cycleRepeatMode() {
  settings.repeatMode =
    settings.repeatMode === "off"
      ? "all"
      : settings.repeatMode === "all"
        ? "one"
        : "off";
  saveSettings();
  updateRepeatButton();
  showBookmarkToast(
    "Repeat updated",
    settings.repeatMode === "off"
      ? "Repeat off"
      : settings.repeatMode === "all"
        ? "Repeat all"
        : "Repeat one"
  );
}

function syncTabIcons() {
  tabs.forEach((tab) => {
    const icon = tab.querySelector("i");
    if (!icon) return;

    if (tab.dataset.tab === "Favourites") {
      icon.className = tab.classList.contains("active")
        ? "fa-solid fa-heart"
        : "fa-regular fa-heart";
      return;
    }

    if (tab.dataset.tab === "Playlists") {
      icon.className = tab.classList.contains("active")
        ? "fa-solid fa-bookmark"
        : "fa-regular fa-bookmark";
    }
  });

  refreshDynamicIconArea(document.querySelector(".sidebarSheet"));
  refreshDynamicIconArea(document.querySelector(".homeSidebarShortcutGrid"));
}

function syncSidebarNav(name) {
  sidebarNavButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === name);
  });
}

function syncTopMenuDockState() {
  if (!btnTopSettings) return;

  const topbar = document.querySelector(".topbar");
  if (!topbar) return;

  const rect = topbar.getBoundingClientRect();
  const shouldFloat = rect.top < 18;

  btnTopSettings.classList.toggle("isFloating", shouldFloat && !document.body.classList.contains("sidebarOpen"));

  if (btnSidebarClose) {
    btnSidebarClose.classList.toggle("isFloatingClose", document.body.classList.contains("sidebarOpen"));
  }

  if (btnSidebarCloseFloating) {
    btnSidebarCloseFloating.classList.toggle("hidden", !document.body.classList.contains("sidebarOpen"));
  }
}

function openSidebarMenu() {
  playerSidebarScrollLock.y = window.scrollY || window.pageYOffset || 0;
  document.documentElement.classList.add("sidebarLocked");
  document.body.classList.add("sidebarOpen");
  document.body.style.position = "fixed";
  document.body.style.top = `-${playerSidebarScrollLock.y}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
  if (sidebarBackdrop) sidebarBackdrop.classList.remove("hidden");
  if (sidebarMenu) sidebarMenu.classList.remove("hidden");
  syncTopMenuDockState();
}

function closeSidebarMenu() {
  const restoreY =
    Math.abs(parseInt(document.body.style.top || "0", 10)) ||
    playerSidebarScrollLock.y ||
    0;

  if (sidebarBackdrop) sidebarBackdrop.classList.add("hidden");
  if (sidebarMenu) sidebarMenu.classList.add("hidden");
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

function toggleSidebarMenu() {
  if (!sidebarMenu) return;
  if (sidebarMenu.classList.contains("hidden")) openSidebarMenu();
  else closeSidebarMenu();
}

function setTab(name) {
  Object.entries(views).forEach(([key, view]) => {
    if (!view) return;
    view.classList.toggle("hidden", key !== name);
  });

  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === name));
  syncTabIcons();
  syncSidebarNav(name);
  renderSidebarCategories();

  if (pageTitle) pageTitle.textContent = name === "Library" ? "Home" : name;

  if (name !== "Settings") {
    hideReloadAddedMessage();
  }

  if (name !== "Library") {
    toggleHomeSearchPanel(false);
    homeNavRevealSlug = "";
  }

  if (name === "Library") {
    renderLibrary();
  }

  if (name === "Lists") {
    renderLists();
  }

  if (name === "Favourites") {
    renderFavourites();
  }

  if (name === "Recents") {
    renderRecents();
  }

  if (name === "Playlists") {
    closePlaylistMenus();
    renderPlaylists();
  }

  closeSidebarMenu();
  renderQueue();
}

function openModal(el) {
  if (el) el.classList.remove("hidden");
}

function closeModal(el) {
  if (el) el.classList.add("hidden");
}

function openNowPlaying() {
  openModal(nowPlayingModal);
}

function closeNowPlaying() {
  closeAllTopPopups();
  closeTrackActionPrompt();
  hideBookmarkToast();
  closeStagePlayer();
  closeModal(nowPlayingModal);
}

function parseTracklistTimeToSeconds(raw) {
  const text = formatTracklistTimeInputForTyping(raw);
  if (!text) return null;

  const parts = text.split(":").map((part) => Number(part.trim()));
  if (parts.some((part) => !Number.isFinite(part))) return null;

  if (parts.length === 3) return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
  if (parts.length === 2) return (parts[0] * 60) + parts[1];

  return null;
}

function getTracklistMetaIcon(label) {
  const key = normaliseText(label).toLowerCase();

  if (key === "title") return "fa-solid fa-compact-disc";
  if (key === "artist") return "fa-solid fa-user";
  if (key === "episode") return "fa-solid fa-hashtag";
  if (key === "genre") return "fa-solid fa-music";
  if (key === "label") return "fa-solid fa-record-vinyl";
  if (key === "label owner") return "fa-solid fa-user-tie";
  if (key === "bpm") return "fa-solid fa-gauge-high";
  if (key === "type") return "fa-solid fa-file-audio";
  if (key === "length") return "fa-regular fa-clock";
  if (key === "tracklist") return "fa-solid fa-list";
  if (key === "tracks") return "fa-solid fa-list-ol";
  if (key === "country") return "fa-solid fa-flag";

  return "fa-solid fa-circle-info";
}

const TRACKLIST_META_LABEL_OPTIONS = [
  "Title",
  "Artist",
  "Episode",
  "Genre",
  "Label",
  "Label owner",
  "BPM",
  "Type",
  "Length",
  "Tracklist",
  "Tracks",
  "Country",
  "Info",
  "Mix style",
  "Recorded",
  "Location",
  "Source",
  "Event",
  "Year",
];

const TRACKLIST_META_ICON_OPTIONS = [
  { value: "fa-solid fa-compact-disc", label: "Disc" },
  { value: "fa-solid fa-user", label: "User" },
  { value: "fa-solid fa-hashtag", label: "Hashtag" },
  { value: "fa-solid fa-music", label: "Music" },
  { value: "fa-solid fa-record-vinyl", label: "Vinyl" },
  { value: "fa-solid fa-user-tie", label: "Owner" },
  { value: "fa-solid fa-gauge-high", label: "BPM" },
  { value: "fa-solid fa-file-audio", label: "Audio" },
  { value: "fa-regular fa-clock", label: "Clock" },
  { value: "fa-solid fa-list", label: "Tracklist" },
  { value: "fa-solid fa-list-ol", label: "Tracks" },
  { value: "fa-solid fa-circle-info", label: "Info" },
  { value: "fa-solid fa-music", label: "Music" },
  { value: "fa-solid fa-radio", label: "Radio" },
  { value: "fa-solid fa-location-dot", label: "Location" },
  { value: "fa-solid fa-calendar-days", label: "Calendar" },
  { value: "fa-solid fa-microphone", label: "Mic" },
  { value: "fa-solid fa-star", label: "Star" },
  { value: "fa-solid fa-fire", label: "Fire" },
  { value: "fa-solid fa-bolt", label: "Bolt" },
  { value: "fa-solid fa-headphones", label: "Headphones" },
  { value: "fa-solid fa-folder", label: "Folder" }
];

function normaliseTracklistMetaIcon(iconClass, label = "") {
  const safeIcon = normaliseText(iconClass);
  if (TRACKLIST_META_ICON_OPTIONS.some((item) => item.value === safeIcon)) return safeIcon;
  return getTracklistMetaIcon(label);
}

function resolveTracklistMetaIconClass(entry) {
  return normaliseTracklistMetaIcon(entry?.icon, entry?.label || "");
}

const COUNTRY_FLAG_CODES = new Set([
  "ad","ae","af","ag","ai","al","am","ao","aq","ar","as","at","au","aw","ax","az",
  "ba","bb","bd","be","bf","bg","bh","bi","bj","bl","bm","bn","bo","bq","br","bs","bt","bv","bw","by","bz",
  "ca","cc","cd","cf","cg","ch","ci","ck","cl","cm","cn","co","cr","cu","cv","cw","cx","cy","cz",
  "de","dj","dk","dm","do","dz",
  "ec","ee","eg","eh","er","es","et",
  "fi","fj","fk","fm","fo","fr",
  "ga","gb","gb-eng","gb-nir","gb-sct","gb-wls","gd","ge","gf","gg","gh","gi","gl","gm","gn","gp","gq","gr","gs","gt","gu","gw","gy",
  "hk","hm","hn","hr","ht","hu",
  "id","ie","il","im","in","io","iq","ir","is","it",
  "je","jm","jo","jp",
  "ke","kg","kh","ki","km","kn","kp","kr","kw","ky","kz",
  "la","lb","lc","li","lk","lr","ls","lt","lu","lv","ly",
  "ma","mc","md","me","mf","mg","mh","mk","ml","mm","mn","mo","mp","mq","mr","ms","mt","mu","mv","mw","mx","my","mz",
  "na","nc","ne","nf","ng","ni","nl","no","np","nr","nu","nz",
  "om",
  "pa","pe","pf","pg","ph","pk","pl","pm","pn","pr","ps","pt","pw","py",
  "qa",
  "re","ro","rs","ru","rw",
  "sa","sb","sc","sd","se","sg","sh","si","sj","sk","sl","sm","sn","so","sr","ss","st","sv","sx","sy","sz",
  "tc","td","tf","tg","th","tj","tk","tl","tm","tn","to","tr","tt","tv","tw","tz",
  "ua","ug","um","us","uy","uz",
  "va","vc","ve","vi","vn","vu",
  "wf","ws",
  "xk",
  "ye","yt",
  "za","zm","zw"
]);

const COUNTRY_FLAG_CODE_BY_NAME = {
  "afghanistan": "af",
  "albania": "al",
  "algeria": "dz",
  "america": "us",
  "american samoa": "as",
  "andorra": "ad",
  "angola": "ao",
  "anguilla": "ai",
  "antarctica": "aq",
  "antigua and barbuda": "ag",
  "argentina": "ar",
  "armenia": "am",
  "aruba": "aw",
  "australia": "au",
  "austria": "at",
  "azerbaijan": "az",
  "bahamas": "bs",
  "bahrain": "bh",
  "bangladesh": "bd",
  "barbados": "bb",
  "belarus": "by",
  "belgium": "be",
  "belize": "bz",
  "benin": "bj",
  "bermuda": "bm",
  "bhutan": "bt",
  "bolivia": "bo",
  "bolivia, plurinational state of": "bo",
  "bonaire, sint eustatius and saba": "bq",
  "bosnia and herzegovina": "ba",
  "botswana": "bw",
  "bouvet island": "bv",
  "brazil": "br",
  "britain": "gb",
  "british indian ocean territory": "io",
  "brunei": "bn",
  "brunei darussalam": "bn",
  "bulgaria": "bg",
  "burkina faso": "bf",
  "burma": "mm",
  "burundi": "bi",
  "cabo verde": "cv",
  "cambodia": "kh",
  "cameroon": "cm",
  "canada": "ca",
  "cape verde": "cv",
  "cayman islands": "ky",
  "central african republic": "cf",
  "chad": "td",
  "chile": "cl",
  "china": "cn",
  "christmas island": "cx",
  "cocos (keeling) islands": "cc",
  "colombia": "co",
  "comoros": "km",
  "congo": "cg",
  "congo, the democratic republic of the": "cd",
  "cook islands": "ck",
  "costa rica": "cr",
  "croatia": "hr",
  "cuba": "cu",
  "curacao": "cw",
  "curaçao": "cw",
  "cyprus": "cy",
  "czech republic": "cz",
  "czechia": "cz",
  "côte d'ivoire": "ci",
  "denmark": "dk",
  "djibouti": "dj",
  "dominica": "dm",
  "dominican republic": "do",
  "ecuador": "ec",
  "egypt": "eg",
  "el salvador": "sv",
  "england": "gb-eng",
  "equatorial guinea": "gq",
  "eritrea": "er",
  "estonia": "ee",
  "eswatini": "sz",
  "ethiopia": "et",
  "falkland islands (malvinas)": "fk",
  "faroe islands": "fo",
  "fiji": "fj",
  "finland": "fi",
  "france": "fr",
  "french guiana": "gf",
  "french polynesia": "pf",
  "french southern territories": "tf",
  "gabon": "ga",
  "gambia": "gm",
  "georgia": "ge",
  "germany": "de",
  "ghana": "gh",
  "gibraltar": "gi",
  "great britain": "gb",
  "greece": "gr",
  "greenland": "gl",
  "grenada": "gd",
  "guadeloupe": "gp",
  "guam": "gu",
  "guatemala": "gt",
  "guernsey": "gg",
  "guinea": "gn",
  "guinea-bissau": "gw",
  "guyana": "gy",
  "haiti": "ht",
  "heard island and mcdonald islands": "hm",
  "holy see (vatican city state)": "va",
  "honduras": "hn",
  "hong kong": "hk",
  "hungary": "hu",
  "iceland": "is",
  "india": "in",
  "indonesia": "id",
  "iran": "ir",
  "iran, islamic republic of": "ir",
  "iraq": "iq",
  "ireland": "ie",
  "isle of man": "im",
  "israel": "il",
  "italy": "it",
  "ivory coast": "ci",
  "jamaica": "jm",
  "japan": "jp",
  "jersey": "je",
  "jordan": "jo",
  "kazakhstan": "kz",
  "kenya": "ke",
  "kiribati": "ki",
  "korea, democratic people's republic of": "kp",
  "korea, republic of": "kr",
  "kosovo": "xk",
  "kuwait": "kw",
  "kyrgyzstan": "kg",
  "lao people's democratic republic": "la",
  "laos": "la",
  "latvia": "lv",
  "lebanon": "lb",
  "lesotho": "ls",
  "liberia": "lr",
  "libya": "ly",
  "liechtenstein": "li",
  "lithuania": "lt",
  "luxembourg": "lu",
  "macao": "mo",
  "macau": "mo",
  "madagascar": "mg",
  "malawi": "mw",
  "malaysia": "my",
  "maldives": "mv",
  "mali": "ml",
  "malta": "mt",
  "marshall islands": "mh",
  "martinique": "mq",
  "mauritania": "mr",
  "mauritius": "mu",
  "mayotte": "yt",
  "mexico": "mx",
  "micronesia": "fm",
  "micronesia, federated states of": "fm",
  "moldova": "md",
  "moldova, republic of": "md",
  "monaco": "mc",
  "mongolia": "mn",
  "montenegro": "me",
  "montserrat": "ms",
  "morocco": "ma",
  "mozambique": "mz",
  "myanmar": "mm",
  "namibia": "na",
  "nauru": "nr",
  "nepal": "np",
  "netherlands": "nl",
  "new caledonia": "nc",
  "new zealand": "nz",
  "nicaragua": "ni",
  "niger": "ne",
  "nigeria": "ng",
  "niue": "nu",
  "norfolk island": "nf",
  "north korea": "kp",
  "north macedonia": "mk",
  "northern ireland": "gb-nir",
  "northern mariana islands": "mp",
  "norway": "no",
  "oman": "om",
  "pakistan": "pk",
  "palau": "pw",
  "palestine": "ps",
  "palestine, state of": "ps",
  "panama": "pa",
  "papua new guinea": "pg",
  "paraguay": "py",
  "peru": "pe",
  "philippines": "ph",
  "pitcairn": "pn",
  "poland": "pl",
  "portugal": "pt",
  "puerto rico": "pr",
  "qatar": "qa",
  "republic of ireland": "ie",
  "reunion": "re",
  "romania": "ro",
  "russia": "ru",
  "russian federation": "ru",
  "rwanda": "rw",
  "réunion": "re",
  "saint barthélemy": "bl",
  "saint helena, ascension and tristan da cunha": "sh",
  "saint kitts and nevis": "kn",
  "saint lucia": "lc",
  "saint martin": "mf",
  "saint martin (french part)": "mf",
  "saint pierre and miquelon": "pm",
  "saint vincent and the grenadines": "vc",
  "samoa": "ws",
  "san marino": "sm",
  "sao tome and principe": "st",
  "saudi arabia": "sa",
  "scotland": "gb-sct",
  "senegal": "sn",
  "serbia": "rs",
  "seychelles": "sc",
  "sierra leone": "sl",
  "singapore": "sg",
  "sint maarten (dutch part)": "sx",
  "slovakia": "sk",
  "slovenia": "si",
  "solomon islands": "sb",
  "somalia": "so",
  "south africa": "za",
  "south georgia and the south sandwich islands": "gs",
  "south korea": "kr",
  "south sudan": "ss",
  "spain": "es",
  "sri lanka": "lk",
  "st martin": "mf",
  "sudan": "sd",
  "suriname": "sr",
  "svalbard and jan mayen": "sj",
  "sweden": "se",
  "switzerland": "ch",
  "syria": "sy",
  "syrian arab republic": "sy",
  "taiwan": "tw",
  "taiwan, province of china": "tw",
  "tajikistan": "tj",
  "tanzania": "tz",
  "tanzania, united republic of": "tz",
  "thailand": "th",
  "timor-leste": "tl",
  "togo": "tg",
  "tokelau": "tk",
  "tonga": "to",
  "trinidad and tobago": "tt",
  "tunisia": "tn",
  "turkmenistan": "tm",
  "turks and caicos islands": "tc",
  "tuvalu": "tv",
  "türkiye": "tr",
  "uganda": "ug",
  "uk": "gb",
  "ukraine": "ua",
  "united arab emirates": "ae",
  "united kingdom": "gb",
  "united states": "us",
  "united states minor outlying islands": "um",
  "uruguay": "uy",
  "us": "us",
  "usa": "us",
  "uzbekistan": "uz",
  "vanuatu": "vu",
  "vatican": "va",
  "venezuela": "ve",
  "venezuela, bolivarian republic of": "ve",
  "viet nam": "vn",
  "vietnam": "vn",
  "virgin islands, british": "vi",
  "virgin islands, u.s.": "vi",
  "wales": "gb-wls",
  "wallis and futuna": "wf",
  "western sahara": "eh",
  "yemen": "ye",
  "zambia": "zm",
  "zimbabwe": "zw",
  "åland islands": "ax",
};

function isTracklistCountryLabel(label) {
  return normaliseText(label).toLowerCase() === "country";
}

function resolveTracklistCountryFlagCode(value) {
  const raw = normaliseText(value).trim().toLowerCase();
  if (!raw) return "";

  if (COUNTRY_FLAG_CODES.has(raw)) {
    return raw;
  }

  return COUNTRY_FLAG_CODE_BY_NAME[raw] || "";
}

function getCountryFlagEmoji(flagCode) {
  const code = normaliseText(flagCode).trim().toLowerCase();
  if (!code) return "";

  const specialFlags = {
    "gb-eng": "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}",
    "gb-sct": "\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}",
    "gb-wls": "\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}",
    "gb-nir": "🇬🇧",
  };

  if (specialFlags[code]) return specialFlags[code];

  if (/^[a-z]{2}$/.test(code)) {
    return code
      .toUpperCase()
      .split("")
      .map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)))
      .join("");
  }

  if (code.startsWith("gb-")) return "🇬🇧";

  return "";
}

function buildTracklistMetaIconMarkup(entry) {
  if (isTracklistCountryLabel(entry?.label)) {
    const flagCode = normaliseText(entry?.icon || "").trim().toLowerCase()
      || resolveTracklistCountryFlagCode(entry?.value || "");
    const flagEmoji = getCountryFlagEmoji(flagCode);

    if (flagEmoji) {
      return `<span class="tracklistMetaFlagEmoji" aria-hidden="true">${escapeHtml(flagEmoji)}</span>`;
    }

    return `<i class="fa-solid fa-flag"></i>`;
  }

  return `<i class="${resolveTracklistMetaIconClass(entry)}"></i>`;
}

function resolveTracklistCountryDisplayName(code) {
  const cleanCode = normaliseText(code).trim().toLowerCase();
  if (!cleanCode) return "";

  const entries = Object.entries(COUNTRY_FLAG_CODE_BY_NAME);
  const match = entries.find(([, value]) => String(value || "").toLowerCase() === cleanCode);
  if (!match) return cleanCode.toUpperCase();

  const [name] = match;
  return name.replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildTracklistCountryOptions(selectedCode = "") {
  const selected = normaliseText(selectedCode).trim().toLowerCase();
  const codes = Array.from(COUNTRY_FLAG_CODES).sort((a, b) => {
    const nameA = resolveTracklistCountryDisplayName(a);
    const nameB = resolveTracklistCountryDisplayName(b);
    return nameA.localeCompare(nameB);
  });

  return codes.map((code) => {
    const isSelected = code === selected ? "selected" : "";
    const label = resolveTracklistCountryDisplayName(code);
    return `<option value="${escapeHtml(code)}" ${isSelected}>${escapeHtml(label)}</option>`;
  }).join("");
}

function syncRenderedCountryMetaSelects() {
  const rows = Array.isArray(currentTracklistData?.metaEntries) ? currentTracklistData.metaEntries : [];
  const selects = document.querySelectorAll("[data-meta-icon-index]");

  selects.forEach((selectEl) => {
    const index = Number(selectEl.getAttribute("data-meta-icon-index") || -1);
    if (index < 0) return;

    const entry = rows[index];
    if (!isTracklistCountryLabel(entry?.label)) return;

    const desired = normaliseText(entry?.icon || "").trim().toLowerCase()
      || resolveTracklistCountryFlagCode(entry?.value || "");

    if (desired && selectEl.value !== desired) {
      selectEl.value = desired;
    }
  });
}

function buildTracklistMetaIconOptions(selectedIcon = "") {
  const safeSelected = normaliseTracklistMetaIcon(selectedIcon);
  return TRACKLIST_META_ICON_OPTIONS.map((item) => `
    <option value="${escapeHtml(item.value)}"${item.value === safeSelected ? " selected" : ""}>
      ${escapeHtml(item.label)}
    </option>
  `).join("");
}

function buildTracklistMetaLabelOptions(selectedLabel = "") {
  const safeSelected = normaliseText(selectedLabel, "Info");
  const labels = TRACKLIST_META_LABEL_OPTIONS.includes(safeSelected)
    ? TRACKLIST_META_LABEL_OPTIONS
    : [...TRACKLIST_META_LABEL_OPTIONS, safeSelected];

  return labels.map((label) => `
    <option value="${escapeHtml(label)}"${label === safeSelected ? " selected" : ""}>
      ${escapeHtml(label)}
    </option>
  `).join("");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function splitTracklistArtistAndTitle(rawTitle) {
  const safe = String(rawTitle || "").trim();
  if (!safe) return { artistPart: "", titlePart: "" };

  const splitIndex = safe.lastIndexOf(" - ");
  if (splitIndex <= 0) {
    return { artistPart: "", titlePart: safe };
  }

  const artistPart = safe.slice(0, splitIndex).trim();
  const titlePart = safe.slice(splitIndex + 3).trim();

  if (!artistPart || !titlePart) {
    return { artistPart: "", titlePart: safe };
  }

  return { artistPart, titlePart };
}

function formatTracklistTitleHtml(rawTitle) {
  const safe = String(rawTitle || "").trim();
  if (!safe) return "";

  const remixMatch = safe.match(/^(.*?)(\s*(\([^()]*\)|\[[^\[\]]*\])\s*)$/);
  const mainPart = remixMatch ? (remixMatch[1] || "").trim() : safe;
  const remixPart = remixMatch ? (remixMatch[2] || "").trim() : "";

  const { artistPart, titlePart } = splitTracklistArtistAndTitle(mainPart);

  let html = "";

  if (artistPart) {
    html += `<b>${escapeHtml(artistPart)}</b>`;
    if (titlePart) {
      html += ` <span class="tracklistDash">-</span> ${escapeHtml(titlePart)}`;
    }
  } else {
    html += escapeHtml(titlePart || mainPart);
  }

  if (remixPart) {
    html += ` <i>${escapeHtml(remixPart)}</i>`;
  }

  return html;
}

function getTracklistTimedTitle(rawTitle) {
  const safe = String(rawTitle || "").trim();
  if (!safe) return "";

  const remixMatch = safe.match(/^(.*?)(\s*(\([^()]*\)|\[[^\[\]]*\])\s*)$/);
  const mainPart = remixMatch ? (remixMatch[1] || "").trim() : safe;
  const remixPart = remixMatch ? (remixMatch[2] || "").trim() : "";

  const { titlePart } = splitTracklistArtistAndTitle(mainPart);
  const baseTitle = titlePart || mainPart;

  return `${baseTitle}${remixPart ? ` ${remixPart}` : ""}`.trim();
}

function getTracklistTimedDisplay(rawTitle) {
  return normaliseText(
    String(rawTitle || "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function getTracklistEntrySeconds(track) {
  const rawSeconds = track?.seconds;

  if (typeof rawSeconds === "number" && Number.isFinite(rawSeconds)) {
    return rawSeconds;
  }

  if (typeof rawSeconds === "string" && rawSeconds.trim() !== "") {
    const parsed = Number(rawSeconds);
    if (Number.isFinite(parsed)) return parsed;
  }

  const timeText = normaliseTracklistTimeText(track?.timeText || "");
  if (!timeText) return null;

  const parsedFromTime = parseTracklistTimeToSeconds(timeText);
  return Number.isFinite(parsedFromTime) ? parsedFromTime : null;
}

function hasTracklistEntrySeconds(track) {
  return getTracklistEntrySeconds(track) !== null;
}

function renderTracklistEmpty(message = "No tracklist available.") {
  currentTracklistData = null;

  if (tracklistMeta) {
    tracklistMeta.classList.add("hidden");
    tracklistMeta.innerHTML = "";
  }

  if (tracklistTracks) {
    tracklistTracks.classList.add("hidden");
    tracklistTracks.innerHTML = "";
  }

  if (tracklistDescription) {
    tracklistDescription.classList.remove("hidden");
    tracklistDescription.innerHTML = `
      <div class="tracklistDescriptionCard emptyState">
        <div class="tracklistDescriptionIcon">
          <i class="fa-solid fa-file-lines"></i>
        </div>
        <div class="tracklistDescriptionBody">
          <div class="tracklistDescriptionTitle">No description / tracklist file yet</div>
          <div class="tracklistDescriptionText">${message}</div>
        </div>
      </div>
    `;
  }

  if (tracklistEmpty) tracklistEmpty.classList.add("hidden");
  updateTracklistEditUI();
  updateCurrentTimedTrackUI();
  renderStageTracklistCard(getStageDisplayTrack());
}

function parseTracklistText(rawText) {
  const text = String(rawText || "").replace(/\r/g, "").trim();
  if (!text) {
    return { metaEntries: [], description: "", tracks: [] };
  }

  const lines = text.split("\n");
  const metaEntries = [];
  const descriptionLines = [];
  const tracks = [];
  let inTrackSection = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      if (!inTrackSection) descriptionLines.push("");
      continue;
    }

    const trackMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (trackMatch) {
      inTrackSection = true;

      const fullTrackText = (trackMatch[2] || "").trim();
      const timeMatch = fullTrackText.match(/^(.*?)(?:\s+-\s+)?(\d{1,2}:\d{2}:\d{2}|\d{1,2}:\d{2})$/);

      const rawTitle = timeMatch
        ? (timeMatch[1] || "").trim()
        : fullTrackText;

      const timeText = timeMatch
        ? (timeMatch[2] || "").trim()
        : "";

      tracks.push({
        number: trackMatch[1],
        title: rawTitle.replace(/\s+/g, " ").trim(),
        timeText,
        seconds: timeText ? parseTracklistTimeToSeconds(timeText) : null,
      });
      continue;
    }

    const metaMatch = !inTrackSection ? line.match(/^([^:]+):\s*(.+)$/) : null;
    if (metaMatch) {
      metaEntries.push({
        label: metaMatch[1].trim(),
        value: metaMatch[2].trim(),
      });
      continue;
    }

    if (!inTrackSection) {
      descriptionLines.push(line);
    }
  }

  return {
    metaEntries,
    description: descriptionLines.join("\n").trim(),
    tracks,
  };
}

function createEmptyTracklistData() {
  return { metaEntries: [], description: "", tracks: [] };
}

function cloneTracklistData(data) {
  const safe = JSON.parse(JSON.stringify(data || createEmptyTracklistData()));

  if (Array.isArray(safe.metaEntries)) {
    safe.metaEntries = safe.metaEntries.map((entry) => {
      const label = normaliseText(entry?.label) || "Info";
      const value = normaliseText(entry?.value);
      return {
        label,
        value,
        icon: normaliseTracklistMetaIcon(entry?.icon, label),
      };
    });
  } else {
    safe.metaEntries = [];
  }

  if (Array.isArray(safe.tracks)) {
    safe.tracks = safe.tracks.map((track, index) => {
      const timeText = normaliseTracklistTimeText(track?.timeText || "");
      const derivedSeconds = timeText ? parseTracklistTimeToSeconds(timeText) : null;

const suggestionTitle = normaliseText(track?.nameSuggestion?.title);
const suggestionConfidence = Number(track?.nameSuggestion?.confidence || 0);

return {
  number: normaliseText(track?.number) || String(index + 1),
  title: normaliseText(track?.title) || `Track ${index + 1}`,
  timeText,
  seconds: Number.isFinite(track?.seconds) ? track.seconds : derivedSeconds,
  ...(suggestionTitle
    ? {
        nameSuggestion: {
          title: suggestionTitle,
          confidence: Number.isFinite(suggestionConfidence) ? suggestionConfidence : 0,
          source: normaliseText(track?.nameSuggestion?.source) || "local-library",
          candidateId: normaliseText(track?.nameSuggestion?.candidateId),
        },
      }
    : {}),
};
    });
  } else {
    safe.tracks = [];
  }

  return safe;
}

function formatTracklistTimeInputForTyping(raw) {
  const digits = normaliseText(raw).replace(/\D/g, "").slice(0, 6);
  if (!digits) return "";

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, -2)}:${digits.slice(-2)}`;

  return `${digits.slice(0, -4)}:${digits.slice(-4, -2)}:${digits.slice(-2)}`;
}

function normaliseTracklistTimeText(raw) {
  const text = formatTracklistTimeInputForTyping(raw);
  if (!text) return "";

  const seconds = parseTracklistTimeToSeconds(text);
  if (!Number.isFinite(seconds)) return text;

  return fmtTime(seconds);
}

function buildTracklistTextFromData(data) {
  const safe = data || createEmptyTracklistData();
  const lines = [];

  (safe.metaEntries || []).forEach((entry) => {
    const label = normaliseText(entry?.label);
    const value = normaliseText(entry?.value);
    if (!label || !value) return;
    lines.push(`${label}: ${value}`);
  });

  const description = String(safe.description || "").replace(/\r/g, "").trim();
  if (description) {
    if (lines.length) lines.push("");
    lines.push(...description.split("\n"));
  }

  const validTracks = (safe.tracks || []).filter((track) => normaliseText(track?.title));
  if (validTracks.length) {
    if (lines.length) lines.push("");
    validTracks.forEach((track, index) => {
      const number = normaliseText(track?.number) || String(index + 1);
      const title = normaliseText(track?.title) || `Track ${index + 1}`;
      const timeText = normaliseTracklistTimeText(track?.timeText || "");
      lines.push(`${number}. ${title}${timeText ? ` - ${timeText}` : ""}`);
    });
  }

  return lines.join("\n").trim();
}

function setTracklistEditStatus(message = "", { dirty = false } = {}) {
  if (!tracklistEditStatus) return;

  if (!message) {
    tracklistEditStatus.classList.add("hidden");
    tracklistEditStatus.classList.remove("is-dirty");
    tracklistEditStatus.textContent = "";
    return;
  }

  tracklistEditStatus.classList.remove("hidden");
  tracklistEditStatus.classList.toggle("is-dirty", !!dirty);
  tracklistEditStatus.textContent = message;
}

function findNextEmptyTracklistIndex() {
  if (!Array.isArray(currentTracklistData?.tracks)) return -1;
  return currentTracklistData.tracks.findIndex((track) => !normaliseText(track?.timeText));
}

function updateTracklistEditUI() {
  const activeForCurrentTrack = tracklistEditMode && !!currentTrackId() && currentTrackId() === tracklistEditTrackId;

  if (tracklistEditToolbar) {
    tracklistEditToolbar.classList.toggle("hidden", !activeForCurrentTrack);
  }

  if (!activeForCurrentTrack) {
    setTracklistEditStatus("");
    return;
  }

  const trackCount = Array.isArray(currentTracklistData?.tracks) ? currentTracklistData.tracks.length : 0;
  const nextEmpty = findNextEmptyTracklistIndex();
  const status = nextEmpty >= 0
    ? `Edit mode on. Next empty row: ${nextEmpty + 1} of ${trackCount || 0}.`
    : `Edit mode on. No empty timestamp rows left in this tracklist.`;

  setTracklistEditStatus(status, { dirty: tracklistEditDirty });
}

function setTracklistEditMode(next, options = {}) {
  const desired = !!next;
  const { silent = false } = options;

  if (desired && !currentTrackId()) return;

  tracklistEditMode = desired;
  tracklistEditTrackId = desired ? currentTrackId() : "";

  if (!desired) {
    tracklistEditDirty = false;
  }

  updateTracklistEditUI();

  if (!silent) closeAllTopPopups();
  if (currentTracklistData) renderTracklistData(currentTracklistData);
}

function markTracklistDirty() {
  tracklistEditDirty = true;
  updateTracklistEditUI();
}

function ensureTracklistEditableData() {
  if (!currentTracklistData) currentTracklistData = createEmptyTracklistData();
  if (!Array.isArray(currentTracklistData.tracks)) currentTracklistData.tracks = [];
  return currentTracklistData;
}

function setTracklistRowTimeDraft(index, rawTimeText) {
  const data = ensureTracklistEditableData();

  if (!data.tracks[index]) {
    data.tracks[index] = {
      number: String(index + 1),
      title: `Track ${index + 1}`,
      timeText: "",
      seconds: null,
    };
  }

  const track = data.tracks[index];
  const nextText = formatTracklistTimeInputForTyping(rawTimeText);

  track.number = normaliseText(track.number) || String(index + 1);
  track.title = normaliseText(track.title) || `Track ${index + 1}`;
  track.timeText = nextText;
  track.seconds = nextText ? parseTracklistTimeToSeconds(nextText) : null;

  markTracklistDirty();
}

function setTracklistRowTime(index, rawTimeText) {
  const data = ensureTracklistEditableData();

  if (!data.tracks[index]) {
    data.tracks[index] = {
      number: String(index + 1),
      title: `Track ${index + 1}`,
      timeText: "",
      seconds: null,
    };
  }

  const track = data.tracks[index];
  const nextText = normaliseTracklistTimeText(rawTimeText);
  track.number = normaliseText(track.number) || String(index + 1);
  track.title = normaliseText(track.title) || `Track ${index + 1}`;
  track.timeText = nextText;
  track.seconds = nextText ? parseTracklistTimeToSeconds(nextText) : null;

  markTracklistDirty();
  renderTracklistData(currentTracklistData);
}

let tracklistTimeAutoSaveTimer = 0;

function scheduleTracklistTimeAutoSave(index, rawTimeText) {
  if (tracklistTimeAutoSaveTimer) {
    clearTimeout(tracklistTimeAutoSaveTimer);
    tracklistTimeAutoSaveTimer = 0;
  }

  const draftText = formatTracklistTimeInputForTyping(rawTimeText);
  setTracklistEditStatus(
    `Editing row ${index + 1}${draftText ? ` • ${draftText}` : ""}…`,
    { dirty: true }
  );
}

function nudgeTracklistRow(index, deltaSeconds) {
  const data = ensureTracklistEditableData();
  const track = data.tracks?.[index];
  if (!track) return;

  const currentSeconds = Number.isFinite(track.seconds) ? track.seconds : 0;
  const nextSeconds = Math.max(0, currentSeconds + deltaSeconds);
  track.seconds = nextSeconds;
  track.timeText = fmtTime(nextSeconds);
  markTracklistDirty();
  renderTracklistData(currentTracklistData);
}

async function assignCurrentTimeToTrackRow(index) {
  if (!audio) return;
  const seconds = Math.max(0, Math.floor(audio.currentTime || 0));
  setTracklistRowTime(index, fmtTime(seconds));
  await saveTracklistEdits();
  setTracklistEditStatus(`Saved ${fmtTime(seconds)} in row ${index + 1}.`, { dirty: false });
}

async function markCurrentTracklistTime() {
  if (!tracklistEditMode) return;
  if (!audio || isPreviewingDifferentTrack()) return;

  const data = ensureTracklistEditableData();
  let nextIndex = findNextEmptyTracklistIndex();

  if (nextIndex < 0) {
    nextIndex = data.tracks.length;
    data.tracks.push({
      number: String(nextIndex + 1),
      title: `Track ${nextIndex + 1}`,
      timeText: "",
      seconds: null,
    });
  }

  const seconds = Math.max(0, Math.floor(audio.currentTime || 0));
  setTracklistRowTime(nextIndex, fmtTime(seconds));
  await saveTracklistEdits();
  setTracklistEditStatus(`Stored and saved ${fmtTime(seconds)} in row ${nextIndex + 1}.`, { dirty: false });
}

async function saveTracklistEdits() {
  if (!tracklistEditTrackId || !currentTracklistData) return;

  const payload = {
    metaEntries: currentTracklistData.metaEntries || [],
    description: currentTracklistData.description || "",
    tracks: (currentTracklistData.tracks || []).map((track, index) => ({
      number: normaliseText(track?.number) || String(index + 1),
      title: normaliseText(track?.title) || `Track ${index + 1}`,
      timeText: normaliseTracklistTimeText(track?.timeText || ""),
    })),
  };

  if (btnTracklistSave) btnTracklistSave.disabled = true;

  try {
    const res = await fetch(`/tracklist-data/${encodeURIComponent(tracklistEditTrackId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("Save failed");

    const saved = await res.json();
    currentTracklistData = cloneTracklistData(saved.data || payload);
    tracklistEditDirty = false;
    currentTracklistSourceKind = saved.sourceKind || "json";
    renderTracklistData(currentTracklistData);
    setTracklistEditStatus("Tracklist saved.", { dirty: false });
  } catch (err) {
    console.error("Failed to save tracklist", err);
    setTracklistEditStatus("Couldn’t save tracklist. Try again.", { dirty: true });
  } finally {
    if (btnTracklistSave) btnTracklistSave.disabled = false;
  }
}

function getTrackProgressState(track, index, tracks, currentSeconds, totalDurationSeconds) {
  if (!Number.isFinite(track?.seconds)) {
    return { progress: 0, isActive: false, isComplete: false };
  }

  const start = track.seconds;
  let end = totalDurationSeconds;

  for (let i = index + 1; i < tracks.length; i += 1) {
    if (Number.isFinite(tracks[i]?.seconds)) {
      end = tracks[i].seconds;
      break;
    }
  }

  if (!Number.isFinite(end) || end <= start) {
    end = Number.isFinite(totalDurationSeconds) && totalDurationSeconds > start
      ? totalDurationSeconds
      : start + 1;
  }

  if (currentSeconds <= start) {
    return { progress: 0, isActive: false, isComplete: false };
  }

  if (currentSeconds >= end) {
    return { progress: 1, isActive: false, isComplete: true };
  }

  const ratio = Math.max(0, Math.min(1, (currentSeconds - start) / Math.max(1, end - start)));
  return { progress: ratio, isActive: ratio > 0 && ratio < 1, isComplete: false };
}

function updateTracklistProgress() {
  if (!tracklistTracks) return;

  const rows = Array.from(tracklistTracks.querySelectorAll(".tracklistTrackRow[data-track-index]"));
  if (!rows.length || !currentTracklistData?.tracks?.length || !audio) {
    rows.forEach((row) => {
      row.style.setProperty("--track-progress", "0%");
      row.classList.remove("is-active", "is-complete");
      row.setAttribute("aria-pressed", "false");
    });
    return;
  }

  const currentSeconds = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
  const totalDurationSeconds = Number.isFinite(audio.duration) ? audio.duration : null;

  rows.forEach((row) => {
    const index = Number(row.dataset.trackIndex || -1);
    const track = currentTracklistData.tracks[index];
    if (!track) return;

    const state = getTrackProgressState(
      track,
      index,
      currentTracklistData.tracks,
      currentSeconds,
      totalDurationSeconds
    );

    row.style.setProperty("--track-progress", `${state.progress * 100}%`);
    row.classList.toggle("is-active", state.isActive);
    row.classList.toggle("is-complete", state.isComplete);
    row.setAttribute("aria-pressed", state.isActive ? "true" : "false");
  });
}

function renumberTracklistRows() {
  if (!currentTracklistData?.tracks) return;
  currentTracklistData.tracks.forEach((track, index) => {
    track.number = String(index + 1);
  });
}

function addBlankTracklistRow() {
  const data = ensureTracklistEditableData();
  data.tracks.push({
    number: String(data.tracks.length + 1),
    title: `Track ${data.tracks.length + 1}`,
    timeText: "",
    seconds: null,
  });
  renumberTracklistRows();
  markTracklistDirty();
  renderTracklistData(currentTracklistData);
}

function removeTracklistRow(index) {
  const data = ensureTracklistEditableData();
  if (!data.tracks?.[index]) return;
  data.tracks.splice(index, 1);
  renumberTracklistRows();
  markTracklistDirty();
  renderTracklistData(currentTracklistData);
}

function updateTracklistRowTitle(index, value) {
  const data = ensureTracklistEditableData();
  const track = data.tracks?.[index];
  if (!track) return;
  track.title = normaliseText(value) || `Track ${index + 1}`;
  markTracklistDirty();
}

function addBlankMetaRow() {
  const data = ensureTracklistEditableData();
  if (!Array.isArray(data.metaEntries)) data.metaEntries = [];
  data.metaEntries.push({
    label: "Info",
    value: "",
    icon: "fa-solid fa-circle-info",
  });
  markTracklistDirty();
  renderTracklistData(currentTracklistData);
}

function updateTracklistMetaRow(index, key, value) {
  const data = ensureTracklistEditableData();
  if (!Array.isArray(data.metaEntries)) data.metaEntries = [];
  const entry = data.metaEntries[index];
  if (!entry) return;
  entry[key] = value;
  markTracklistDirty();
  refreshNowPlayingTextFromTracklistMeta();
}

function getTracklistMetaValue(label) {
  const entries = Array.isArray(currentTracklistData?.metaEntries) ? currentTracklistData.metaEntries : [];
  const match = entries.find((entry) => normaliseText(entry?.label).toLowerCase() === normaliseText(label).toLowerCase());
  return normaliseText(match?.value || "");
}

function refreshNowPlayingTextFromTracklistMeta() {
  const current = currentTrack();
  if (!current) return;

  const titleOverride = getTracklistMetaValue("Title");
  const artistOverride = getTracklistMetaValue("Artist");

  const displayTitle = titleOverride || current.title || current.id || "Nothing playing";
  const displayArtist = artistOverride || current.artist || current.subtitle || "—";
  const miniLines = getMiniPlayerLines(current);

  setMiniMarquee(miniTitle, miniLines.top || displayTitle);
  setMiniSubLine(miniLines.bottom || displayArtist || "—", "");

  if (npTitleTextA) npTitleTextA.textContent = displayTitle;
  if (npTitleTextB) npTitleTextB.textContent = displayTitle;
  if (npSubTextA) npSubTextA.textContent = displayArtist || "—";
  if (npSubTextB) npSubTextB.textContent = displayArtist || "—";

  resetMarqueeAnimation(npTitleTrack);
  resetMarqueeAnimation(npSubTrack);
  requestAnimationFrame(() => configureAllMarquees());
}

function removeTracklistMetaRow(index) {
  const data = ensureTracklistEditableData();
  if (!Array.isArray(data.metaEntries)) return;
  data.metaEntries.splice(index, 1);
  markTracklistDirty();
  renderTracklistData(currentTracklistData);
}

function moveTracklistMetaRow(index, direction) {
  const data = ensureTracklistEditableData();
  if (!Array.isArray(data.metaEntries)) return;

  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || index >= data.metaEntries.length || nextIndex >= data.metaEntries.length) return;

  const moved = data.metaEntries[index];
  data.metaEntries[index] = data.metaEntries[nextIndex];
  data.metaEntries[nextIndex] = moved;

  markTracklistDirty();
  renderTracklistData(currentTracklistData);
}

function updateTracklistDescription(value) {
  const data = ensureTracklistEditableData();
  data.description = String(value || "");
  markTracklistDirty();
}

function createBlankTracklistForCurrent() {
  currentTracklistData = {
    metaEntries: [
      { label: "Title", value: currentTrack()?.title || "" },
      { label: "Artist", value: currentTrack()?.artist || "" },
    ],
    description: "",
    tracks: [],
  };
  tracklistEditDirty = true;
  renderTracklistData(currentTracklistData);
  setTracklistEditStatus("Blank tracklist created. Start adding details and tracks.", { dirty: true });
}

async function scanTracklistFromLocal() {
  const track = currentTrack();
  if (!track?.id) return;

  setTracklistEditStatus("Scanning local files…", { dirty: tracklistEditDirty });

  try {
    const res = await fetch(`/tracklist-scan/${encodeURIComponent(track.id)}`, {
      method: "POST",
      cache: "no-store",
    });

    const payload = await res.json();
    if (!res.ok) throw new Error(payload?.error || "Scan failed");

    currentTracklistData = cloneTracklistData(payload.data || createEmptyTracklistData());
    tracklistEditDirty = true;
    renderTracklistData(currentTracklistData);
    setTracklistEditStatus("Local scan loaded. Check it, then save.", { dirty: true });
  } catch (err) {
    console.error("Tracklist local scan failed", err);
    setTracklistEditStatus("Couldn’t scan local files for tracklist data.", { dirty: tracklistEditDirty });
  }
}

async function attachTracklistFileToCurrent(file) {
  const track = currentTrack();
  if (!track?.id || !file) return;

  const safeName = file.name || "tracklist.txt";
  const isTracklistFile = /\.(txt|cue|json)$/i.test(safeName);

  if (!isTracklistFile) {
    setTracklistEditStatus("Please choose a .txt, .cue or .json tracklist file.", { dirty: tracklistEditDirty });
    return;
  }

  setTracklistEditStatus(`Attaching ${safeName}…`, { dirty: tracklistEditDirty });

  try {
    const res = await fetch(`/tracklist-attach/${encodeURIComponent(track.id)}?name=${encodeURIComponent(safeName)}`, {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });

    const payload = await res.json();
    if (!res.ok) throw new Error(payload?.error || "Tracklist attach failed");

    currentTracklistData = cloneTracklistData(payload.data || createEmptyTracklistData());
    tracklistEditDirty = false;
    renderTracklistData(currentTracklistData);
    setTracklistEditStatus(`Attached ${safeName}. Tracklist saved to this media file.`, { dirty: false });
  } catch (err) {
    console.error("Tracklist attach failed", err);
    setTracklistEditStatus(`Couldn’t attach tracklist: ${err?.message || err}`, { dirty: tracklistEditDirty });
  }
}

function normaliseTracklistLibraryKey(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/\.tracklist(?=\.json$)/i, "")
    .replace(/\.(txt|cue|json|mp3|wav|flac|m4a|aac|ogg|opus)$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getTracklistLibraryFileKind(item = {}) {
  const kind =
    String(item.kind || item.extension || "txt")
      .toLowerCase();

  return kind === "json" ? "json" : "txt";
}

function getTracklistLibraryVisibleItems() {
  const query =
    normaliseTracklistLibraryKey(tracklistLibraryQuery);

  return tracklistLibraryItems.filter((item) => {
    if (
      getTracklistLibraryFileKind(item) !==
      tracklistLibraryTab
    ) {
      return false;
    }

    if (!query) return true;

    return normaliseTracklistLibraryKey(
      [
        item.name,
        item.folder,
        item.path,
        item.description,
      ]
        .filter(Boolean)
        .join(" ")
    ).includes(query);
  });
}

function scoreTracklistLibraryMatch(item = {}) {
  const track = currentTrack();

  const fileKey =
    normaliseTracklistLibraryKey(item.name);

  const titleKey =
    normaliseTracklistLibraryKey(track?.title || "");

  const locatorKey =
    normaliseTracklistLibraryKey(
      String(track?.locator || "")
        .split(/[\\/]/)
        .pop() || ""
    );

  if (!fileKey) return 0;

  if (locatorKey && fileKey === locatorKey) {
    return 100;
  }

  if (titleKey && fileKey === titleKey) {
    return 95;
  }

  if (
    locatorKey &&
    (
      fileKey.includes(locatorKey) ||
      locatorKey.includes(fileKey)
    )
  ) {
    return 70;
  }

  if (
    titleKey &&
    (
      fileKey.includes(titleKey) ||
      titleKey.includes(fileKey)
    )
  ) {
    return 65;
  }

  return 0;
}

function ensureTracklistLibrarySelection() {
  const visible =
    getTracklistLibraryVisibleItems();

  if (!visible.length) {
    tracklistLibrarySelectedPath = "";

    return null;
  }

  const existing =
    visible.find(
      (item) =>
        item.path === tracklistLibrarySelectedPath
    );

  if (existing) return existing;

  const ranked =
    [...visible].sort(
      (a, b) =>
        scoreTracklistLibraryMatch(b) -
        scoreTracklistLibraryMatch(a)
    );

  tracklistLibrarySelectedPath =
    ranked[0]?.path ||
    visible[0].path;

  return ranked[0] || visible[0];
}

function getSelectedTracklistLibraryItem() {
  return (
    tracklistLibraryItems.find(
      (item) =>
        item.path === tracklistLibrarySelectedPath
    ) ||
    null
  );
}

function formatTracklistLibraryDate(value = 0) {
  const stamp = Number(value || 0);

  if (!stamp) return "Unknown date";

  try {
    return new Date(stamp).toLocaleString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Unknown date";
  }
}

function renderTracklistLibraryFileCard(item = {}) {
  const selected =
    item.path === tracklistLibrarySelectedPath;

  const kind =
    getTracklistLibraryFileKind(item);

  const trackCount =
    Number(item.trackCount || 0);

  const timestampCount =
    Number(item.timestampCount || 0);

  const likely =
    scoreTracklistLibraryMatch(item) >= 65;

  return `
    <button
      class="tracklistLibraryFileCard ${selected ? "is-selected" : ""}"
      data-tracklist-library-select="${escapeHtml(item.path || "")}"
      type="button"
    >
      <span class="tracklistLibraryFileIcon">
        ${iconHtml(
          kind === "json"
            ? "clock-rotate-left"
            : "file-lines"
        )}
      </span>

      <span class="tracklistLibraryFileText">
        <strong>${escapeHtml(item.name || "Tracklist file")}</strong>
        <em>${escapeHtml(item.folder || "Tracklist library")}</em>
        <small>
          ${trackCount} track${trackCount === 1 ? "" : "s"}
          ·
          ${timestampCount} timestamp${timestampCount === 1 ? "" : "s"}
        </small>
      </span>

      <span class="tracklistLibraryBadges">
        <b class="${kind === "json" ? "is-json" : "is-txt"}">
          ${
            kind === "json"
              ? "JSON"
              : String(item.extension || "TXT").toUpperCase()
          }
        </b>

        ${likely ? `<b class="is-match">Likely match</b>` : ""}
        ${selected ? `<b class="is-selected-badge">Selected</b>` : ""}
      </span>
    </button>
  `;
}

function renderTracklistLibraryPreview(item = null) {
  if (!item) {
    return `
      <aside class="tracklistLibraryPreview">
        <div class="tracklistLibraryEmpty">
          Choose a tracklist to preview it.
        </div>
      </aside>
    `;
  }

  const preview =
    Array.isArray(item.preview)
      ? item.preview
      : [];

  const kind =
    getTracklistLibraryFileKind(item);

  return `
    <aside class="tracklistLibraryPreview">
      <div class="tracklistLibraryPreviewHead">
        <span>
          ${iconHtml(
            kind === "json"
              ? "clock-rotate-left"
              : "file-lines"
          )}
        </span>

        <div>
          <strong>${escapeHtml(item.name || "Tracklist")}</strong>
          <em>${escapeHtml(item.path || "")}</em>
        </div>
      </div>

      <div class="tracklistLibraryPreviewStats">
        <span>
          <strong>${Number(item.trackCount || 0)}</strong>
          <em>tracks</em>
        </span>

        <span>
          <strong>${Number(item.timestampCount || 0)}</strong>
          <em>timestamps</em>
        </span>

        <span>
          <strong>${escapeHtml(formatBytes(item.sizeBytes || 0))}</strong>
          <em>file size</em>
        </span>
      </div>

      <p class="tracklistLibraryPreviewDate">
        Updated ${escapeHtml(formatTracklistLibraryDate(item.modifiedAt))}
      </p>

      <div class="tracklistLibraryPreviewLines">
        ${
          preview.length
            ? preview
                .map(
                  (track) => `
                    <div>
                      <b>${escapeHtml(track.number || "")}</b>
                      <span>${escapeHtml(track.title || "Track")}</span>
                      <em>${escapeHtml(track.timeText || "—")}</em>
                    </div>
                  `
                )
                .join("")
            : `
              <div class="tracklistLibraryEmpty">
                No track rows were detected in this file.
              </div>
            `
        }
      </div>
    </aside>
  `;
}

function renderTracklistLibrary() {
  if (!tracklistLibraryBody) return;

  const selected =
    ensureTracklistLibrarySelection();

  const visible =
    getTracklistLibraryVisibleItems();

  const uploadTab =
    tracklistLibraryTab === "upload";

  tracklistLibraryBody.innerHTML = `
    <div class="tracklistLibraryHead">
      <div>
        <div class="popupTitle">Choose tracklist</div>

        <div class="popupBodyText">
          Attach a saved TXT tracklist, restore a timestamp JSON file,
          or upload a new file for this mix.
        </div>
      </div>

      <button
        class="popupIconBtn"
        data-tracklist-library-close
        type="button"
        aria-label="Close tracklist library"
      >
        ${iconHtml("xmark")}
      </button>
    </div>

    <nav
      class="tracklistLibraryTabs"
      aria-label="Tracklist library tabs"
    >
      <button
        class="${tracklistLibraryTab === "txt" ? "is-active" : ""}"
        data-tracklist-library-tab="txt"
        type="button"
      >
        ${iconHtml("file-lines")}
        <span>TXT Tracklists</span>
      </button>

      <button
        class="${tracklistLibraryTab === "json" ? "is-active" : ""}"
        data-tracklist-library-tab="json"
        type="button"
      >
        ${iconHtml("clock-rotate-left")}
        <span>Timestamp JSON</span>
      </button>

      <button
        class="${tracklistLibraryTab === "upload" ? "is-active" : ""}"
        data-tracklist-library-tab="upload"
        type="button"
      >
        ${iconHtml("upload")}
        <span>Upload New</span>
      </button>
    </nav>

    ${
      uploadTab
        ? `
          <section class="tracklistLibraryUploadPanel">
            <span>${iconHtml("cloud-arrow-up")}</span>

            <h3>Upload a new tracklist</h3>

            <p>
              Choose a TXT, CUE or JSON file from this phone or PC.
              TXT files load track names ready for manual timestamps.
              JSON files restore saved timestamps too.
            </p>

            <button
              class="trackActionPromptBtn primary"
              data-tracklist-library-upload
              type="button"
            >
              ${iconHtml("file-arrow-up")}
              <span>Choose tracklist file</span>
            </button>
          </section>
        `
        : `
          <div class="tracklistLibraryToolbar">
            <label>
              ${iconHtml("magnifying-glass")}

              <input
                id="tracklistLibrarySearch"
                type="search"
                value="${escapeHtml(tracklistLibraryQuery)}"
                placeholder="Search tracklists…"
              />
            </label>

            <button
              data-tracklist-library-refresh
              type="button"
            >
              ${iconHtml("arrows-rotate")}
              <span>Refresh</span>
            </button>
          </div>

          ${
            tracklistLibraryError
              ? `
                <div class="tracklistLibraryError">
                  ${escapeHtml(tracklistLibraryError)}
                </div>
              `
              : ""
          }

          <div class="tracklistLibraryWorkspace">
            <section class="tracklistLibraryFiles">
              ${
                tracklistLibraryLoading
                  ? `
                    <div class="tracklistLibraryEmpty">
                      Loading saved tracklists…
                    </div>
                  `
                  : visible.length
                    ? visible
                        .map(renderTracklistLibraryFileCard)
                        .join("")
                    : `
                      <div class="tracklistLibraryEmpty">
                        No ${
                          tracklistLibraryTab === "json"
                            ? "timestamp JSON"
                            : "TXT or CUE"
                        } tracklists found yet.
                      </div>
                    `
              }
            </section>

            ${renderTracklistLibraryPreview(selected)}
          </div>
        `
    }

    <div class="tracklistLibraryFooter">
      ${
        !uploadTab
          ? `
            <div class="tracklistLibrarySelectedNotice ${selected ? "has-selection" : ""}">
              ${iconHtml(selected ? "circle-check" : "circle-info")}

              <span>
                ${
                  selected
                    ? `Selected: <strong>${escapeHtml(selected.name || "Tracklist")}</strong>`
                    : "Choose a tracklist from the list above."
                }
              </span>
            </div>

            <div class="tracklistLibraryFooterActions">
              <button
                class="tracklistLibraryFooterBtn primary"
                data-tracklist-library-attach
                type="button"
                ${selected ? "" : "disabled"}
              >
                ${iconHtml("paperclip")}

                <span>
                  ${
                    getTracklistLibraryFileKind(selected || {}) === "json"
                      ? "Attach & restore timestamps"
                      : "Attach tracklist"
                  }
                </span>
              </button>

              <button
                class="tracklistLibraryFooterBtn"
                data-tracklist-library-close
                type="button"
              >
                ${iconHtml("xmark")}
                <span>Close</span>
              </button>
            </div>
          `
          : `
            <div class="tracklistLibraryFooterActions">
              <button
                class="tracklistLibraryFooterBtn"
                data-tracklist-library-close
                type="button"
              >
                ${iconHtml("xmark")}
                <span>Close</span>
              </button>
            </div>
          `
      }
    </div>
  `;

  hydrateBrIcons(tracklistLibraryBody);
}

async function loadTracklistLibraryFiles({ refresh = false } = {}) {
  tracklistLibraryLoading = true;
  tracklistLibraryError = "";

  renderTracklistLibrary();

  try {
    const res =
      await fetch(
        `/tracklist-files${refresh ? "?refresh=1" : ""}`,
        { cache: "no-store" }
      );

    const payload =
      await res.json();

    if (!res.ok) {
      throw new Error(
        payload?.error ||
        "Could not load tracklist files"
      );
    }

    tracklistLibraryItems =
      Array.isArray(payload?.items)
        ? payload.items
        : [];
  } catch (err) {
    tracklistLibraryError =
      err?.message ||
      String(err);
  }

  tracklistLibraryLoading = false;

  renderTracklistLibrary();
}

async function openTracklistLibrary() {
  if (!currentTrack()?.id) {
    setTracklistEditStatus(
      "Choose a media file first.",
      { dirty: tracklistEditDirty }
    );

    return;
  }

  tracklistLibraryTab = "txt";
  tracklistLibraryQuery = "";
  tracklistLibrarySelectedPath = "";
  tracklistLibraryError = "";

  tracklistLibraryOverlay?.classList.remove("hidden");

  try {
    renderTracklistLibrary();
    await loadTracklistLibraryFiles({ refresh: true });
  } catch (err) {
    console.error("Tracklist Library popup failed", err);

    if (tracklistLibraryBody) {
      tracklistLibraryBody.innerHTML = `
        <div class="tracklistLibraryError">
          Could not open Tracklist Library: ${escapeHtml(err?.message || String(err))}
        </div>
      `;
    }
  }
}

function closeTracklistLibrary() {
  tracklistLibraryOverlay?.classList.add("hidden");
}

async function attachSelectedTracklistLibraryFile() {
  const track = currentTrack();

  const selected =
    getSelectedTracklistLibraryItem();

  if (!track?.id || !selected?.path) return;

  setTracklistEditStatus(
    `Attaching ${selected.name || "tracklist"}…`,
    { dirty: tracklistEditDirty }
  );

  try {
    const res =
      await fetch(
        `/tracklist-attach-existing/${encodeURIComponent(track.id)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            path: selected.path,
          }),
        }
      );

    const payload =
      await res.json();

    if (!res.ok) {
      throw new Error(
        payload?.error ||
        "Tracklist attach failed"
      );
    }

    currentTracklistData =
      cloneTracklistData(
        payload.data ||
        createEmptyTracklistData()
      );

    currentTracklistSourceKind =
      payload.sourceKind ||
      getTracklistLibraryFileKind(selected);

    tracklistEditDirty = false;

    renderTracklistData(currentTracklistData);

    closeTracklistLibrary();

    const timestampCount =
      Array.isArray(currentTracklistData?.tracks)
        ? currentTracklistData.tracks.filter(
            (item) =>
              String(item?.timeText || "").trim()
          ).length
        : 0;

    setTracklistEditStatus(
      getTracklistLibraryFileKind(selected) === "json"
        ? `Attached ${selected.name}. Restored ${timestampCount} saved timestamp${timestampCount === 1 ? "" : "s"}.`
        : `Attached ${selected.name}. Tracklist loaded ready for manual timestamps.`,
      { dirty: false }
    );
  } catch (err) {
    console.error(
      "Existing tracklist attach failed",
      err
    );

    setTracklistEditStatus(
      `Couldn’t attach tracklist: ${err?.message || err}`,
      { dirty: tracklistEditDirty }
    );
  }
}

function waitForTracklistAutoScan(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getAutoScanTrackCount(job) {
  return Number(job?.result?.data?.tracks?.length || 0);
}

function getNameDetectSuggestionCount(job) {
  return Number(job?.result?.suggestions?.length || 0);
}

async function startTracklistNameDetect() {
  const track = currentTrack();
  if (!track?.id) return;

  const existingTrackCount = Array.isArray(currentTracklistData?.tracks) ? currentTracklistData.tracks.length : 0;

  if (!existingTrackCount) {
    setTracklistEditStatus("Run Auto scan first, or add timestamp rows before detecting names.", { dirty: tracklistEditDirty });
    return;
  }

  if (btnTracklistNameDetect) btnTracklistNameDetect.disabled = true;
  if (btnTracklistAutoScan) btnTracklistAutoScan.disabled = true;
  if (btnTracklistScanLocal) btnTracklistScanLocal.disabled = true;

  setTracklistEditStatus("Starting local name detection… This scans your local BRMedia song files.", { dirty: tracklistEditDirty });

  try {
    const startRes = await fetch(`/tracklist-name-detect/${encodeURIComponent(track.id)}/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tracklistData: currentTracklistData || createEmptyTracklistData() }),
    });

    const started = await startRes.json();
    if (!startRes.ok || !started?.id) throw new Error(started?.error || "Name detection failed to start");

    let job = started;

    for (let i = 0; i < 900; i += 1) {
      const percent = Number(job?.progressPercent || 0);
      const message = normaliseText(job?.message) || "Detecting names…";
      setTracklistEditStatus(`${message} ${percent ? `(${percent}%)` : ""}`.trim(), { dirty: tracklistEditDirty });

      if (job.status === "done") break;
      if (job.status === "failed") throw new Error(job.error || job.message || "Name detection failed");

      await waitForTracklistAutoScan(1200);

      const pollRes = await fetch(`/tracklist-name-detect/jobs/${encodeURIComponent(started.id)}`, { cache: "no-store" });
      job = await pollRes.json();
      if (!pollRes.ok) throw new Error(job?.error || "Name detection job could not be read");
    }

    if (job.status !== "done") throw new Error("Name detection did not finish yet. Try again in a moment.");

    const suggestions = Array.isArray(job.result?.suggestions) ? job.result.suggestions : [];
    const suggestionByIndex = new Map(suggestions.map((suggestion) => [Number(suggestion.rowIndex), suggestion]));

    currentTracklistData = cloneTracklistData({
      ...currentTracklistData,
      tracks: (currentTracklistData?.tracks || []).map((row, index) => {
        const suggestion = suggestionByIndex.get(index);
        if (!suggestion?.title) return row;

        return {
          ...row,
          nameSuggestion: {
            title: suggestion.title,
            confidence: suggestion.confidence,
            source: suggestion.source,
            candidateId: suggestion.candidateId,
          },
        };
      }),
    });

    tracklistEditDirty = true;
    renderTracklistData(currentTracklistData);

    const count = getNameDetectSuggestionCount(job);
    setTracklistEditStatus(
      count
        ? `Name detection found ${count} possible local match${count === 1 ? "" : "es"}. Use/ignore suggestions, then Save.`
        : "Name detection finished, but no confident local matches were found.",
      { dirty: true }
    );
  } catch (err) {
    console.error("Tracklist name detection failed", err);
    setTracklistEditStatus(err?.message || "Couldn’t detect names for this tracklist.", { dirty: tracklistEditDirty });
  } finally {
    if (btnTracklistNameDetect) btnTracklistNameDetect.disabled = false;
    if (btnTracklistAutoScan) btnTracklistAutoScan.disabled = false;
    if (btnTracklistScanLocal) btnTracklistScanLocal.disabled = false;
  }
}

function mergeAutoScanWithExistingTrackRows(existingRows = [], scannedRows = []) {
  const timedScans = scannedRows
    .map((row) => {
      const seconds = getTracklistEntrySeconds(row);
      return {
        ...row,
        seconds,
      };
    })
    .filter((row) => row.seconds !== null && Number.isFinite(row.seconds))
    .sort((a, b) => a.seconds - b.seconds);

  return existingRows.map((row, index) => {
    const scan = timedScans[index];
    const base = {
      ...row,
      number: normaliseText(row?.number) || String(index + 1),
    };

    if (!scan) return base;

    const seconds = getTracklistEntrySeconds(scan);
    const hasExistingTitle = !!normaliseText(base.title);

    return {
      ...base,
      title: hasExistingTitle ? base.title : (scan.title || `Track ${index + 1}`),
      timeText: normaliseTracklistTimeText(scan.timeText || fmtTime(seconds)),
      seconds,
      confidence: scan.confidence ?? base.confidence,
      source: scan.source || base.source || "auto-audio",
    };
  });
}

async function startTracklistAutoScan() {
  const track = currentTrack();
  if (!track?.id) return;

  const existingTrackCount = Array.isArray(currentTracklistData?.tracks) ? currentTracklistData.tracks.length : 0;

  if (existingTrackCount > 0) {
    const ok = await confirmThemeAction(
      `Auto scan will attach suggested timestamps to the ${existingTrackCount} track row${existingTrackCount === 1 ? "" : "s"} already on this page. Song names will be kept. It will not save until you press Save. Continue?`,
      "Auto scan timestamps",
      "Run scan"
    );

    if (!ok) return;
  } else {
    const ok = await confirmThemeAction(
      "Auto scan will create suggested timestamp rows for this mix. It will not save until you press Save. Continue?",
      "Auto scan timestamps",
      "Run scan"
    );

    if (!ok) return;
  }

  if (btnTracklistAutoScan) btnTracklistAutoScan.disabled = true;
  if (btnTracklistNameDetect) btnTracklistNameDetect.disabled = true;
  if (btnTracklistScanLocal) btnTracklistScanLocal.disabled = true;

  setTracklistEditStatus("Starting auto scan… This can take a bit on long mixes.", { dirty: tracklistEditDirty });

  try {
    const startRes = await fetch(`/tracklist-auto-scan/${encodeURIComponent(track.id)}/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: settings.autoTimestampScanDefault || "balanced" }),
    });

    const started = await startRes.json();
    if (!startRes.ok || !started?.id) throw new Error(started?.error || "Auto scan failed to start");

    let job = started;

    for (let i = 0; i < 900; i += 1) {
      const percent = Number(job?.progressPercent || 0);
      const message = normaliseText(job?.message) || "Scanning audio…";
      setTracklistEditStatus(`${message} ${percent ? `(${percent}%)` : ""}`.trim(), { dirty: tracklistEditDirty });

      if (job.status === "done") break;
      if (job.status === "failed") throw new Error(job.error || job.message || "Auto scan failed");

      await waitForTracklistAutoScan(1200);

      const pollRes = await fetch(`/tracklist-auto-scan/jobs/${encodeURIComponent(started.id)}`, { cache: "no-store" });
      job = await pollRes.json();
      if (!pollRes.ok) throw new Error(job?.error || "Auto scan job could not be read");
    }

    if (job.status !== "done") throw new Error("Auto scan did not finish yet. Try again in a moment.");

    const scannedData = cloneTracklistData(job.result?.data || createEmptyTracklistData());
    const existingData = cloneTracklistData(currentTracklistData || createEmptyTracklistData());
    const existingRows = Array.isArray(existingData.tracks) ? existingData.tracks : [];
    const scannedRows = Array.isArray(scannedData.tracks) ? scannedData.tracks : [];
    const mergedRows = existingRows.length
      ? mergeAutoScanWithExistingTrackRows(existingRows, scannedRows)
      : scannedRows;

    currentTracklistData = cloneTracklistData({
      metaEntries: existingData.metaEntries?.length ? existingData.metaEntries : scannedData.metaEntries,
      description: existingData.description || scannedData.description,
      tracks: mergedRows,
    });

    tracklistEditDirty = true;
    renderTracklistData(currentTracklistData);

    const foundCount = getAutoScanTrackCount(job);
    const usedCount = mergedRows.filter((row) => hasTracklistEntrySeconds(row)).length;

    setTracklistEditStatus(
      existingRows.length
        ? `Auto scan attached ${usedCount} timestamp${usedCount === 1 ? "" : "s"} to your existing ${existingRows.length} track row${existingRows.length === 1 ? "" : "s"}. ${foundCount > usedCount ? `${foundCount - usedCount} extra scan guess${foundCount - usedCount === 1 ? "" : "es"} ignored.` : ""} Review, then Save.`
        : `Auto scan loaded ${usedCount} suggested timestamp${usedCount === 1 ? "" : "s"}. Review, delete wrong guesses, rename, then Save.`,
      { dirty: true }
    );
  } catch (err) {
    console.error("Tracklist auto scan failed", err);
    setTracklistEditStatus(err?.message || "Couldn’t auto scan this mix.", { dirty: tracklistEditDirty });
  } finally {
    if (btnTracklistAutoScan) btnTracklistAutoScan.disabled = false;
    if (btnTracklistNameDetect) btnTracklistNameDetect.disabled = false;
    if (btnTracklistScanLocal) btnTracklistScanLocal.disabled = false;
  }
}

function applyTracklistNameSuggestion(index) {
  const data = ensureTracklistEditableData();
  const track = data.tracks?.[index];
  const suggestionTitle = normaliseText(track?.nameSuggestion?.title);

  if (!track || !suggestionTitle) return;

  track.title = suggestionTitle;
  delete track.nameSuggestion;

  tracklistEditDirty = true;
  renderTracklistData(currentTracklistData);
  setTracklistEditStatus("Name suggestion applied. Press Save when happy.", { dirty: true });
}

function ignoreTracklistNameSuggestion(index) {
  const data = ensureTracklistEditableData();
  const track = data.tracks?.[index];

  if (!track) return;

  delete track.nameSuggestion;

  tracklistEditDirty = true;
  renderTracklistData(currentTracklistData);
  setTracklistEditStatus("Name suggestion ignored. Press Save when happy.", { dirty: true });
}

function renderTracklistData(data) {
  currentTracklistData = cloneTracklistData(data);

  const metaEntries = Array.isArray(currentTracklistData.metaEntries) ? currentTracklistData.metaEntries : [];
  const tracks = Array.isArray(currentTracklistData.tracks) ? currentTracklistData.tracks : [];
  const shouldShowEmpty = !metaEntries.length && !normaliseText(currentTracklistData.description) && !tracks.length;
  const editable = tracklistEditMode && currentTrackId() === tracklistEditTrackId;

  updateTracklistEditUI();

  if (tracklistMeta) {
    if (metaEntries.length || editable) {
      tracklistMeta.classList.remove("hidden");
      tracklistMeta.innerHTML = `
        <div class="tracklistMetaCard">
          <div class="tracklistMetaRows">
            ${metaEntries.map((entry, index) => `
              <div class="tracklistMetaRow${editable ? " is-editing" : ""}">
                <div class="tracklistMetaIcon">
                  ${buildTracklistMetaIconMarkup(entry)}
                </div>
                <div class="tracklistMetaLabel${editable ? " is-hidden" : ""}">${editable ? "" : entry.label}</div>
                <div class="tracklistMetaValue">
                  ${
                    editable
                      ? `
<div class="tracklistMetaEditRow">
  <div class="tracklistMetaEditStack">
    <select
      class="tracklistMetaInput tracklistMetaSelect"
      data-meta-label-index="${index}"
    >
      ${buildTracklistMetaLabelOptions(entry.label || "")}
    </select>

    ${
      isTracklistCountryLabel(entry.label)
        ? `
<select
  class="tracklistMetaInput tracklistMetaSelect tracklistMetaIconSelect"
  data-meta-icon-index="${index}"
>
  ${buildTracklistCountryOptions(entry.icon || resolveTracklistCountryFlagCode(entry.value || ""))}
</select>

<input
  class="tracklistMetaInput"
  type="text"
  value="${escapeHtml(entry.value || resolveTracklistCountryDisplayName(entry.icon || ""))}"
  placeholder="Country"
  data-meta-value-index="${index}"
  readonly
/>
`
        : `
<select
  class="tracklistMetaInput tracklistMetaSelect tracklistMetaIconSelect"
  data-meta-icon-index="${index}"
>
  ${buildTracklistMetaIconOptions(entry.icon || getTracklistMetaIcon(entry.label || ""))}
</select>

<input
  class="tracklistMetaInput"
  type="text"
  value="${escapeHtml(entry.value || "")}"
  placeholder="Value"
  data-meta-value-index="${index}"
/>
`
    }
  </div>

  <div class="tracklistMetaRowTools">
    <button
      class="tracklistMiniBtn iconOnly"
      type="button"
      data-meta-move-up-index="${index}"
      aria-label="Move detail up"
      ${index === 0 ? "disabled" : ""}
    >
      <i class="fa-solid fa-chevron-up"></i>
    </button>

    <button
      class="tracklistMiniBtn iconOnly"
      type="button"
      data-meta-move-down-index="${index}"
      aria-label="Move detail down"
      ${index === metaEntries.length - 1 ? "disabled" : ""}
    >
      <i class="fa-solid fa-chevron-down"></i>
    </button>

    <button
      class="tracklistMiniBtn iconOnly danger"
      type="button"
      data-meta-remove-index="${index}"
      aria-label="Remove detail"
    >
      <i class="fa-solid fa-trash"></i>
    </button>
  </div>
</div>
                      `
                      : escapeHtml(entry.value || "")
                  }
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      `;
      syncRenderedCountryMetaSelects();
			refreshDynamicIconArea(tracklistMeta);
    } else {
      tracklistMeta.classList.add("hidden");
      tracklistMeta.innerHTML = "";
    }
  }

  if (tracklistDescription) {
    if (currentTracklistData.description || editable) {
      tracklistDescription.classList.remove("hidden");
      tracklistDescription.innerHTML = `
        <div class="tracklistDescriptionCard${!currentTracklistData.description ? " emptyState" : ""}">
          <div class="tracklistDescriptionIcon">
            <i class="fa-solid fa-file-lines"></i>
          </div>
          <div class="tracklistDescriptionBody">
            <div class="tracklistDescriptionTitle">Description</div>
            ${
              editable
                ? `
                  <div class="tracklistDescriptionEditWrap">
                    <textarea
                      class="tracklistDescriptionInput"
                      placeholder="Add mix description, notes, credits, set info..."
                      data-tracklist-description-input="1"
                    >${escapeHtml(currentTracklistData.description || "")}</textarea>
                  </div>
                `
                : `<div class="tracklistDescriptionText">${currentTracklistData.description}</div>`
            }
          </div>
        </div>
      `;
      refreshDynamicIconArea(tracklistDescription);
    } else {
      tracklistDescription.classList.add("hidden");
      tracklistDescription.innerHTML = "";
    }
  }

  if (tracklistTracks) {
    if (tracks.length || editable) {
      tracklistTracks.classList.remove("hidden");
      tracklistTracks.innerHTML = `
        <div class="tracklistTracksCard">
          ${tracks.map((track, index) => `
            <div
              class="tracklistTrackRow${Number.isFinite(track.seconds) ? " jumpable" : ""}${track.timeText ? "" : " noTime"}${editable ? " editable" : ""}"
              data-track-index="${index}"
              ${Number.isFinite(track.seconds) ? `data-seconds="${track.seconds}"` : ""}
            >
              <div class="tracklistTrackNumber">${track.number}</div>
              <div class="tracklistTrackMain">
                <div class="tracklistTrackTitle">
                  ${
                    editable
                      ? `
                        <div class="tracklistTrackTitleEditWrap">
                          <input
                            class="tracklistTrackTitleInput"
                            type="text"
                            value="${escapeHtml(track.title || "")}"
                            placeholder="Artist - Song Title"
                            data-edit-title-index="${index}"
                          />
                        </div>
                      `
                      : formatTracklistTitleHtml(track.title)
                  }
                </div>
                ${track.timeText || editable ? `
                  <div class="tracklistTrackMetaLine">
                    <span class="tracklistTrackTime">${track.timeText || "No time yet"}</span>
                    <span class="tracklistTrackJumpText">${Number.isFinite(track.seconds) ? "Tap to jump in the mix" : editable ? "Ready for live edit" : ""}</span>
                  </div>
                ` : ""}
${editable ? `
  ${
    track.nameSuggestion?.title
      ? `
        <div class="tracklistNameSuggestion">
          <div class="tracklistNameSuggestionText">
            <span>Possible local match • ${Number(track.nameSuggestion.confidence || 0)}%</span>
            <strong>${escapeHtml(track.nameSuggestion.title)}</strong>
          </div>
          <div class="tracklistNameSuggestionActions">
            <button class="tracklistEditBtn primary" type="button" data-apply-name-suggestion="${index}">Use name</button>
            <button class="tracklistEditBtn" type="button" data-ignore-name-suggestion="${index}">Ignore</button>
          </div>
        </div>
      `
      : ""
  }

  <div class="tracklistTrackEditRow">
<input
  class="tracklistTimeInput"
  type="text"
  inputmode="tel"
  maxlength="8"
  autocomplete="off"
  autocapitalize="off"
  spellcheck="false"
  value="${escapeHtml(track.timeText || "")}"
  placeholder="HH:MM:SS"
  data-edit-time-index="${index}"
/>
<button class="tracklistEditBtn primary" type="button" data-edit-use-current="${index}">Use current</button>
<button class="tracklistEditBtn" type="button" data-edit-nudge="${index}" data-edit-delta="-1">-1s</button>
<button class="tracklistEditBtn" type="button" data-edit-nudge="${index}" data-edit-delta="1">+1s</button>
<button class="tracklistEditBtn" type="button" data-edit-remove-row="${index}">Remove</button>
</div>
` : ""}
              </div>
            </div>
          `).join("")}
        </div>
      `;
			
tracklistTracks.querySelectorAll("[data-apply-name-suggestion]").forEach((button) => {
  button.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    const index = Number(button.dataset.applyNameSuggestion || -1);
    applyTracklistNameSuggestion(index);
  });
});

tracklistTracks.querySelectorAll("[data-ignore-name-suggestion]").forEach((button) => {
  button.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    const index = Number(button.dataset.ignoreNameSuggestion || -1);
    ignoreTracklistNameSuggestion(index);
  });
});
      tracklistTracks.querySelectorAll(".tracklistTrackRow.jumpable").forEach((row) => {
        row.addEventListener("click", (e) => {
          if (editable && e.target instanceof Element && e.target.closest(".tracklistTrackEditRow")) return;
          if (editable && e.target instanceof Element && e.target.closest(".tracklistTrackTitleEditWrap")) return;
          if (isPreviewingDifferentTrack()) return;
          if (!audio) return;

          const index = Number(row.dataset.trackIndex || -1);
          const track = currentTracklistData?.tracks?.[index];
          if (!track || !Number.isFinite(track.seconds)) return;

          audio.currentTime = track.seconds;
          updateWaveProgress();
          updateStageWaveProgress();
          updateSeekProgressFill();
          updateTracklistProgress();
          updateCurrentTimedTrackUI();
          updateStageTimeRow();
        });
      });
    } else {
      tracklistTracks.classList.add("hidden");
      tracklistTracks.innerHTML = "";
    }
  }

  if (tracklistEmpty) {
    tracklistEmpty.classList.toggle("hidden", !shouldShowEmpty);
    if (shouldShowEmpty) tracklistEmpty.textContent = "No tracklist loaded.";
  }

  updateTracklistProgress();
  updateCurrentTimedTrackUI();
  renderStageTracklistCard(getStageDisplayTrack());

  const parent = tracklistMeta?.parentElement;
  if (parent && tracklistMeta && tracklistDescription && tracklistTracks) {
    parent.appendChild(tracklistMeta);
    parent.appendChild(tracklistDescription);
    parent.appendChild(tracklistTracks);
  }
}

function isActiveTracklistLoad(trackId, token) {
  const safeTrackId = normaliseText(trackId);
  if (!safeTrackId || token !== tracklistLoadToken) return false;
  return safeTrackId === currentTrackId() || safeTrackId === previewTrackId;
}

async function loadTracklist(trackId) {
  const loadToken = ++tracklistLoadToken;
  renderTracklistEmpty("Loading…");

  try {
    const res = await fetch(`/tracklist-data/${encodeURIComponent(trackId)}`, { cache: "no-store" });
    if (!res.ok) throw new Error("No tracklist");

    const payload = await res.json();
    if (!isActiveTracklistLoad(trackId, loadToken)) return;

    const parsed = payload?.data || createEmptyTracklistData();
    currentTracklistSourceKind = payload?.sourceKind || "none";

    if (!parsed || (!parsed.metaEntries?.length && !parsed.description && !parsed.tracks?.length)) {
      renderTracklistEmpty("No tracklist available.");
      return;
    }

    renderTracklistData(parsed);
  } catch {
    if (!isActiveTracklistLoad(trackId, loadToken)) return;
    currentTracklistSourceKind = "none";
    renderTracklistEmpty("No tracklist available.");
  }
}

function isStagePlayerOpen() {
  return !!stagePlayerModal && !stagePlayerModal.classList.contains("hidden");
}

function getStageDisplayTrack() {
  return getPreviewTrack() || currentTrack() || null;
}

function setStagePlayerFlipped(next) {
  stagePlayerFlipped = !!next;

  if (stagePlayerModal) {
    stagePlayerModal.classList.toggle("is-flipped", stagePlayerFlipped);
  }

  if (btnStageFlip) {
    btnStageFlip.classList.toggle("active", stagePlayerFlipped);
    btnStageFlip.setAttribute("aria-label", stagePlayerFlipped ? "Show cover art" : "Show tracklist");
  }
}

function closeStagePlayer() {
  setStagePlayerFlipped(false);

  if (stagePlayerModal) {
    stagePlayerModal.classList.add("hidden");
  }

  document.body.classList.remove("stage-player-open");
}

async function openStagePlayer() {
  if (window.matchMedia("(min-width: 821px)").matches) return;

  const track = getStageDisplayTrack();
  if (!track || !stagePlayerModal) return;

  stagePlayerModal.classList.remove("hidden");
  document.body.classList.add("stage-player-open");

  await syncStagePlayerUI(track);
  updateSleepStatusLive();
  setStagePlayerPausedState();
}

function syncStageMetaText(track) {
  const titleText = track?.title || "—";
  const subText = track?.subtitle || "Local • BRMedia";

  if (stageTitleTextA) stageTitleTextA.textContent = titleText;
  if (stageTitleTextB) stageTitleTextB.textContent = "";
  if (stageSubTextA) stageSubTextA.textContent = subText;
  if (stageSubTextB) stageSubTextB.textContent = "";

  if (stagePauseTitle) stagePauseTitle.textContent = titleText;
  if (stagePauseSub) stagePauseSub.textContent = subText;

  if (stageTitleTrack) {
    stageTitleTrack.classList.remove("marqueeActive", "marqueeStatic");
    stageTitleTrack.style.removeProperty("--marquee-distance");
    stageTitleTrack.style.removeProperty("--marquee-duration");
    stageTitleTrack.style.transform = "translateX(0)";
  }

  if (stageSubTrack) {
    stageSubTrack.classList.remove("marqueeActive", "marqueeStatic");
    stageSubTrack.style.removeProperty("--marquee-distance");
    stageSubTrack.style.removeProperty("--marquee-duration");
    stageSubTrack.style.transform = "translateX(0)";
  }
}

function updateStageTimeRow(trackOverride = null) {
  const track = trackOverride || getStageDisplayTrack();
  const previewing = isShowingPreviewTrack();

  const currentSeconds = (!previewing && audio && Number.isFinite(audio.currentTime))
    ? audio.currentTime
    : 0;

  const totalSeconds = (!previewing && audio && Number.isFinite(audio.duration) && audio.duration > 0)
    ? audio.duration
    : Number(track?.duration || 0);

  if (stageTimeCur) stageTimeCur.textContent = fmtTime(Math.max(0, currentSeconds || 0));
  if (stageTimeTotal) stageTimeTotal.textContent = fmtTime(Math.max(0, totalSeconds || 0));
}

function updateStageCurrentTrackBoxText(rawTitle = "") {
  const safeTimedTitle = normaliseText(rawTitle);

  if (!stageCurrentTrackBox || !stageCurrentTrackTrack) return;

  const showBox =
    !!safeTimedTitle
    && !isShowingPreviewTrack()
    && !!audio
    && !!audio.src
    && !audio.paused
    && !audio.ended;

  if (!showBox) {
    stageCurrentTrackBox.classList.add("hidden");
    stageCurrentTrackTrack.dataset.timedTitle = "";
    if (stageCurrentTrackTextA) stageCurrentTrackTextA.textContent = "";
    if (stageCurrentTrackTextB) stageCurrentTrackTextB.textContent = "";
    stageCurrentTrackTrack.classList.remove("marqueeActive", "marqueeStatic");
    stageCurrentTrackTrack.style.removeProperty("--marquee-distance");
    stageCurrentTrackTrack.style.removeProperty("--marquee-duration");
    stageCurrentTrackTrack.style.transform = "translateX(0)";
    return;
  }

  stageCurrentTrackBox.classList.remove("hidden");
  stageCurrentTrackTrack.dataset.timedTitle = safeTimedTitle;

  if (stageCurrentTrackTextA) stageCurrentTrackTextA.textContent = safeTimedTitle;
  if (stageCurrentTrackTextB) stageCurrentTrackTextB.textContent = "";

  stageCurrentTrackTrack.classList.remove("marqueeActive", "marqueeStatic");
  stageCurrentTrackTrack.style.removeProperty("--marquee-distance");
  stageCurrentTrackTrack.style.removeProperty("--marquee-duration");
  stageCurrentTrackTrack.style.transform = "translateX(0)";
}

function updateStageTracklistHighlight() {
  if (!stageTracklistList) return;

  const rows = Array.from(stageTracklistList.querySelectorAll(".stageTrackRow[data-stage-track-index]"));
  if (!rows.length || !currentTracklistData?.tracks?.length || !audio) {
    rows.forEach((row) => {
      row.style.setProperty("--track-progress", "0%");
      row.classList.remove("is-active", "is-complete");
      row.setAttribute("aria-pressed", "false");
    });
    return;
  }

  const currentSeconds = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
  const totalDurationSeconds = Number.isFinite(audio.duration) ? audio.duration : null;

  rows.forEach((row) => {
    const index = Number(row.dataset.stageTrackIndex || -1);
    const track = currentTracklistData.tracks[index];
    if (!track) return;

    const state = getTrackProgressState(
      track,
      index,
      currentTracklistData.tracks,
      currentSeconds,
      totalDurationSeconds
    );

    row.style.setProperty("--track-progress", `${state.progress * 100}%`);
    row.classList.toggle("is-active", state.isActive);
    row.classList.toggle("is-complete", state.isComplete);
    row.setAttribute("aria-pressed", state.isActive ? "true" : "false");
  });
}

function renderStageTracklistCard(trackOverride = null) {
  const track = trackOverride || getStageDisplayTrack();
  const tracks = Array.isArray(currentTracklistData?.tracks) ? currentTracklistData.tracks : [];
  const totalDuration = Math.max(0, Number(track?.duration || audio?.duration || 0));
  const durationText = totalDuration > 0 ? fmtTime(totalDuration) : "—";

  if (stageTracklistTitle) {
    stageTracklistTitle.textContent = track?.title || "Tracklist";
  }

  if (stageTracklistSub) {
    stageTracklistSub.textContent = track?.subtitle || "BRMedia Stage Player";
  }

  if (stageTracklistMeta) {
    const metaBits = [
      `<span class="stageTracklistMetaPill"><i class="fa-regular fa-clock"></i><span>${durationText}</span></span>`,
      `<span class="stageTracklistMetaPill"><i class="fa-solid fa-list-ol"></i><span>${tracks.length || 0} tracks</span></span>`,
    ];

    stageTracklistMeta.innerHTML = metaBits.join("");
  }

  const hasTracklist = !!tracks.length;

  if (btnStageFlip) {
    btnStageFlip.disabled = !hasTracklist;
    btnStageFlip.style.opacity = hasTracklist ? "1" : "0.45";
  }

  if (!stageTracklistList || !stageTracklistEmpty) return;

  if (!hasTracklist) {
    stageTracklistList.innerHTML = "";
    stageTracklistEmpty.classList.remove("hidden");
    stageTracklistEmpty.textContent = "No timed tracklist loaded for this mix yet.";
    return;
  }

  stageTracklistEmpty.classList.add("hidden");

  stageTracklistList.innerHTML = tracks.map((entry, index) => `
    <button
      class="stageTrackRow${Number.isFinite(entry.seconds) ? " jumpable" : ""}"
      data-stage-track-index="${index}"
      ${Number.isFinite(entry.seconds) ? `data-seconds="${entry.seconds}"` : ""}
      type="button"
    >
      <div class="stageTrackRowTop">
        <div class="stageTrackNumber">${escapeHtml(entry.number || String(index + 1))}</div>

        <div class="stageTrackMain">
          <div class="stageTrackTitle">${formatTracklistTitleHtml(entry.title || `Track ${index + 1}`)}</div>

          <div class="stageTrackMetaLine">
            ${entry.timeText ? `<span class="stageTrackTime">${escapeHtml(entry.timeText)}</span>` : ""}
            ${Number.isFinite(entry.seconds) ? `<span class="stageTrackJump">Tap to jump in the mix</span>` : ""}
          </div>
        </div>
      </div>
    </button>
  `).join("");

  stageTracklistList.querySelectorAll(".stageTrackRow.jumpable").forEach((row) => {
    row.addEventListener("click", () => {
      if (isShowingPreviewTrack()) return;
      if (!audio) return;

      const index = Number(row.dataset.stageTrackIndex || -1);
      const entry = currentTracklistData?.tracks?.[index];
      if (!entry || !Number.isFinite(entry.seconds)) return;

      audio.currentTime = Math.max(0, entry.seconds);
      updateWaveProgress();
      updateStageWaveProgress();
      updateSeekProgressFill();
      updateTracklistProgress();
      updateCurrentTimedTrackUI();
      updateStageTimeRow();
    });
  });

  updateStageTracklistHighlight();
}

function syncStageWaveformPads() {
  if (!stageWaveformViewport || !stageWaveformEl) return;

  const lead = stageWaveformEl.querySelector(".wavePadLead");
  const tail = stageWaveformEl.querySelector(".wavePadTail");
  if (!lead || !tail) return;

  const firstBar = stageWaveformEl.querySelector(".bar");
  const barWidth = firstBar ? firstBar.offsetWidth : 3;
  const centerPad = Math.max(0, Math.floor((stageWaveformViewport.clientWidth / 2) - (barWidth / 2)));

  lead.style.width = `${centerPad}px`;
  lead.style.minWidth = `${centerPad}px`;
  tail.style.width = `${centerPad}px`;
  tail.style.minWidth = `${centerPad}px`;
}

function updateStageWaveProgress() {
  if (!stageWaveformEl) return;

  const bars = Array.from(stageWaveformEl.querySelectorAll(".bar"));

  if (isShowingPreviewTrack()) {
    bars.forEach((bar) => bar.classList.remove("active"));
    stageWaveformEl.style.transform = "translateX(0px)";
    if (stageArtwork) stageArtwork.style.setProperty("--stage-art-shift", "0px");
    return;
  }

  if (!bars.length || !audio || !audio.duration || !stageWaveformViewport) {
    bars.forEach((bar) => bar.classList.remove("active"));
    stageWaveformEl.style.transform = "translateX(0px)";
    if (stageArtwork) stageArtwork.style.setProperty("--stage-art-shift", "0px");
    return;
  }

  const ratio = Math.max(0, Math.min(1, audio.currentTime / audio.duration));
  const playedIndex = Math.floor(ratio * (bars.length - 1));

  bars.forEach((bar, idx) => {
    bar.classList.toggle("active", idx <= playedIndex);
  });

  const playedBar = bars[Math.max(0, Math.min(playedIndex, bars.length - 1))];
  if (!playedBar) return;

  const viewportWidth = stageWaveformViewport.clientWidth;
  const trackWidth = stageWaveformEl.scrollWidth;
  const centerX = viewportWidth / 2;
  const barCenter = playedBar.offsetLeft + (playedBar.offsetWidth / 2);

  let translateX = centerX - barCenter;
  const minTranslate = Math.min(0, viewportWidth - trackWidth);
  translateX = Math.max(minTranslate, Math.min(0, translateX));

  stageWaveformEl.style.transform = `translateX(${translateX}px)`;

  if (stageArtwork) {
    const artShift = ((0.5 - ratio) * 160).toFixed(2);
    stageArtwork.style.setProperty("--stage-art-shift", `${artShift}px`);
  }
}

function seekFromStageWaveClientX(clientX) {
  if (!settings.waveformAllowSeeking) return;
  if (isShowingPreviewTrack()) return;
  if (!audio || !audio.duration || !stageWaveformViewport || !stageWaveformEl) return;

  const rect = stageWaveformViewport.getBoundingClientRect();
  const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
  const currentTransform = stageWaveformEl.style.transform || "translateX(0px)";
  const match = currentTransform.match(/translateX\((-?\d+(?:\.\d+)?)px\)/);
  const translateX = match ? Number(match[1]) : 0;

  const contentX = x - translateX;
  const bars = Array.from(stageWaveformEl.querySelectorAll(".bar"));
  if (!bars.length) return;

  let bestIndex = 0;
  let bestDist = Infinity;

  bars.forEach((bar, idx) => {
    const center = bar.offsetLeft + (bar.offsetWidth / 2);
    const dist = Math.abs(center - contentX);
    if (dist < bestDist) {
      bestDist = dist;
      bestIndex = idx;
    }
  });

  const ratio = bestIndex / Math.max(1, bars.length - 1);
  const snappedRatio = Math.max(0, Math.min(1, ratio));
  audio.currentTime = snappedRatio * audio.duration;

  updateWaveProgress();
  updateStageWaveProgress();
  updateSeekProgressFill();
  updateTracklistProgress();
  updateCurrentTimedTrackUI();
  updateStageTimeRow();
}

function flushStageWaveformSeek() {
  stageWaveSeekRaf = 0;

  if (stageWavePendingClientX == null) return;
  const x = stageWavePendingClientX;
  stageWavePendingClientX = null;

  seekFromStageWaveClientX(x);
}

function queueStageWaveformSeek(clientX) {
  stageWavePendingClientX = clientX;

  if (stageWaveSeekRaf) return;
  stageWaveSeekRaf = requestAnimationFrame(flushStageWaveformSeek);
}

function bindStageWaveformSeeking() {
  if (!stageWaveformViewport) return;

  stageWaveformViewport.addEventListener("pointerdown", (e) => {
    if (!settings.waveformAllowSeeking) return;
    if (!audio || !audio.duration || !stageWaveformEl) return;

    stageWaveDragActive = true;
    stageWaveDragPointerId = e.pointerId;
    stageWaveDragStartX = e.clientX;
    stageWaveDragStartTime = audio.currentTime || 0;
    stageWaveDragMoved = false;

    stageWaveformViewport.setPointerCapture?.(e.pointerId);
  });

  stageWaveformViewport.addEventListener("pointermove", (e) => {
    if (!stageWaveDragActive) return;
    if (stageWaveDragPointerId !== null && e.pointerId !== stageWaveDragPointerId) return;
    if (!audio || !audio.duration || !stageWaveformViewport || !stageWaveformEl) return;

        const deltaX = e.clientX - stageWaveDragStartX;
    const scrollableWidth = Math.max(1, stageWaveformEl.scrollWidth - stageWaveformViewport.clientWidth);
    const dragDamping = 3.2;
    const secondsPerPixel = audio.duration / (scrollableWidth * dragDamping);
    const nextTime = Math.max(0, Math.min(audio.duration, stageWaveDragStartTime - (deltaX * secondsPerPixel)));

    if (Math.abs(deltaX) > 3) {
      stageWaveDragMoved = true;
    }

    audio.currentTime = nextTime;
    updateWaveProgress();
    updateStageWaveProgress();
    updateSeekProgressFill();
    updateTracklistProgress();
    updateCurrentTimedTrackUI();
    updateStageTimeRow();
  });

  const endDrag = (e) => {
    if (!stageWaveDragActive) return;
    if (stageWaveDragPointerId !== null && e.pointerId !== stageWaveDragPointerId) return;

    stageWaveDragActive = false;
    stageWaveDragPointerId = null;
    stageWaveSuppressClickUntil = Date.now() + 180;
  };

  stageWaveformViewport.addEventListener("pointerup", endDrag);
  stageWaveformViewport.addEventListener("pointercancel", endDrag);
  stageWaveformViewport.addEventListener("pointerleave", (e) => {
    if (!stageWaveDragActive) return;
    if (stageWaveDragPointerId !== null && e.pointerId !== stageWaveDragPointerId) return;
    endDrag(e);
  });
}

async function renderStageWaveform(trackOverride = null) {
  if (!stageWaveformEl) return;

  const track = trackOverride || getStageDisplayTrack();
  stageWaveformEl.innerHTML = "";
  stageWaveformEl.className = getWaveformClassName("waveform waveformScroller stageWaveform");

  if (getWaveformDisplayMode() === "hidden") {
    stageWaveformEl.innerHTML = `<div class="waveformUnavailable">Waveform hidden</div>`;
    return;
  }

  const lead = document.createElement("div");
  lead.className = "wavePad wavePadLead";
  stageWaveformEl.appendChild(lead);

  let peaks = await loadWaveformPeaks(track);
  if (!peaks.length && settings.waveformFallbackBars) {
    peaks = buildFallbackPeaks();
  }

  if (!peaks.length) {
    stageWaveformEl.innerHTML = `<div class="waveformUnavailable">Generate waveform peaks in Settings</div>`;
    return;
  }

  peaks.forEach((value, idx) => {
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.dataset.index = String(idx);

    const minHeight = 16;
    const maxHeight = stageWaveformViewport ? Math.max(32, stageWaveformViewport.clientHeight - 10) : 66;
    const displayValue = getWaveDisplayValue(value, stageWaveformViewport?.clientHeight || 0);
    const px = Math.round(minHeight + (displayValue * (maxHeight - minHeight)));

    bar.style.height = `${px}px`;
    stageWaveformEl.appendChild(bar);
  });

  const tail = document.createElement("div");
  tail.className = "wavePad wavePadTail";
  stageWaveformEl.appendChild(tail);

  requestAnimationFrame(() => {
    syncStageWaveformPads();
    updateStageWaveProgress();
  });
}

function setStagePlayerPausedState() {
  if (!stagePlayerModal) return;

  const hasLivePlayback = !!audio && !!audio.src && !audio.paused && !audio.ended;
  stagePlayerModal.classList.toggle("is-paused", !hasLivePlayback);

  if (stagePauseMeta) {
    stagePauseMeta.classList.toggle("hidden", true);
  }

  if (btnStageResume) {
    btnStageResume.classList.toggle("hidden", hasLivePlayback);
  }

  if (stageCurrentTrackBox) {
    stageCurrentTrackBox.classList.toggle("hidden", !hasLivePlayback);
  }

  if (!hasLivePlayback) {
    if (stageCurrentTrackTextA) stageCurrentTrackTextA.textContent = "";
    if (stageCurrentTrackTextB) stageCurrentTrackTextB.textContent = "";
    if (stageCurrentTrackTrack) {
      stageCurrentTrackTrack.dataset.timedTitle = "";
      stageCurrentTrackTrack.classList.remove("marqueeActive", "marqueeStatic");
      stageCurrentTrackTrack.style.removeProperty("--marquee-distance");
      stageCurrentTrackTrack.style.removeProperty("--marquee-duration");
      stageCurrentTrackTrack.style.transform = "translateX(0)";
    }
  } else {
    updateStageCurrentTrackBoxText(getTracklistTimedDisplay(getCurrentTimedTrack()?.title || ""));
  }
}

async function syncStagePlayerUI(trackOverride = null) {
  const track = trackOverride || getStageDisplayTrack();

  syncStageMetaText(track);
  renderArtwork(track, { updateMain: false, updateMini: false, updateStage: true });
  renderStageTracklistCard(track);
  updateStageTimeRow(track);
  updateStageCurrentTrackBoxText(getTracklistTimedDisplay(getCurrentTimedTrack()?.title || ""));
  await renderStageWaveform(track);
  updateStageWaveProgress();
  setStagePlayerPausedState();
}

/* sleep timer */
function stopSleepTicker() {
  if (sleepInterval) clearInterval(sleepInterval);
  sleepInterval = null;
  if (sleepTimeout) clearTimeout(sleepTimeout);
  sleepTimeout = null;
}

function getTimerStatusClass() {
  if (!sleepTotalSeconds || !sleepEndsAt || sleepMode === "songend") return "";
  const remaining = Math.max(0, Math.ceil((sleepEndsAt - Date.now()) / 1000));
  const ratio = remaining / sleepTotalSeconds;
  if (ratio > 0.5) return "timer-green";
  if (ratio > 0.1) return "timer-orange";
  return "timer-red";
}

function updateSleepIconState() {
  if (!btnSleep) return;

  btnSleep.classList.remove("timer-green", "timer-orange", "timer-red", "sleep-active");

  if (sleepMode === "songend") {
    btnSleep.classList.add("sleep-active", "timer-green");
    return;
  }

  if (!sleepEndsAt || !sleepTotalSeconds) return;

  const cls = getTimerStatusClass();
  if (cls) btnSleep.classList.add("sleep-active", cls);
}

function updateSleepStatusLive() {
  updateSleepIconState();

  const classes = ["timer-green", "timer-orange", "timer-red"];
  if (sleepStatus) sleepStatus.classList.remove(...classes);
  if (sleepPopupCountdown) sleepPopupCountdown.classList.remove(...classes);
  if (sleepActivePanel) sleepActivePanel.classList.remove(...classes);
  if (stageSleepTimerBox) stageSleepTimerBox.classList.remove("hidden", ...classes);

  if (sleepMode === "songend") {
    hideSleepFinalOverlay();

    if (sleepStatus) {
      sleepStatus.textContent = "TRACK END";
      sleepStatus.classList.add("timer-green");
    }

    if (sleepPopupCountdown) sleepPopupCountdown.textContent = "Timer active: ends after current track";
    if (sleepHint) sleepHint.textContent = "Timer active: will stop at the end of this track.";

    if (sleepActivePanel) {
      sleepActivePanel.classList.remove("hidden");
      sleepActivePanel.classList.add("timer-green");
    }
    if (sleepActiveCountdown) sleepActiveCountdown.textContent = "Track end";

    if (stageSleepTimerBox) {
      stageSleepTimerBox.classList.remove("hidden");
      stageSleepTimerBox.classList.add("timer-green");
    }
    if (stageSleepTimerText) stageSleepTimerText.textContent = "Track end";

    renderSleepPopupMode();
    return;
  }

  if (sleepEndsAt) {
    const remaining = Math.max(0, Math.ceil((sleepEndsAt - Date.now()) / 1000));
    const cls = getTimerStatusClass();
    const text = fmtCountdownCompact(remaining);

    if (sleepStatus) {
      sleepStatus.textContent = text;
      if (cls) sleepStatus.classList.add(cls);
    }

    if (sleepPopupCountdown) {
      sleepPopupCountdown.textContent = `Remaining: ${text}`;
      if (cls) sleepPopupCountdown.classList.add(cls);
    }

    if (sleepHint) sleepHint.textContent = `Countdown running: ${text}`;

    if (sleepActivePanel) {
      sleepActivePanel.classList.remove("hidden");
      if (cls) sleepActivePanel.classList.add(cls);
    }
    if (sleepActiveCountdown) sleepActiveCountdown.textContent = text;

    if (stageSleepTimerBox) {
      stageSleepTimerBox.classList.remove("hidden");
      if (cls) stageSleepTimerBox.classList.add(cls);
    }
    if (stageSleepTimerText) stageSleepTimerText.textContent = text;

    renderSleepPopupMode();

    if (remaining <= 5) {
      showSleepFinalOverlay(remaining);
    } else {
      hideSleepFinalOverlay();
    }

    return;
  }

  hideSleepFinalOverlay();

  if (sleepStatus) sleepStatus.textContent = "";
  if (sleepPopupCountdown) sleepPopupCountdown.textContent = "";
  if (sleepHint) sleepHint.textContent = "";
  if (sleepActiveCountdown) sleepActiveCountdown.textContent = "";
  if (sleepActivePanel) sleepActivePanel.classList.add("hidden");
  if (stageSleepTimerText) stageSleepTimerText.textContent = "";
  if (stageSleepTimerBox) stageSleepTimerBox.classList.add("hidden");

  renderSleepPopupMode();
}

function clearSleep() {
  stopSleepTicker();
  sleepMode = null;
  sleepEndsAt = null;
  sleepTotalSeconds = 0;
  hideSleepFinalOverlay();
  updateSleepStatusLive();
}

function startSleepSeconds(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    if (sleepHint) sleepHint.textContent = "Enter a valid hours / minutes / seconds time.";
    return;
  }

  clearSleep();
  sleepMode = "countdown";
  sleepTotalSeconds = totalSeconds;
  sleepEndsAt = Date.now() + totalSeconds * 1000;

  sleepTimeout = setTimeout(() => {
    if (audio) {
      persistPlaybackPosition();
      audio.pause();
      persistPlaybackPosition();
      sendPlayerRuntimeStateNow();
    }
    clearSleep();
    if (sleepStatus) sleepStatus.textContent = "Complete";
  }, totalSeconds * 1000);

  sleepInterval = setInterval(() => {
    updateSleepStatusLive();
    if (sleepEndsAt && Date.now() >= sleepEndsAt) clearSleep();
  }, 1000);

  updateSleepStatusLive();
}

function startSleepSongEnd() {
  clearSleep();
  sleepMode = "songend";
  sleepEndsAt = null;
  sleepTotalSeconds = 0;
  updateSleepStatusLive();
}

/* waveform */
function getWaveformPeakCount() {
  return clampPlayerSettingNumber(settings.waveformPeakCount, 64, 4200, 1200);
}

function getFallbackWaveformCount() {
  const mode = settings.waveformDensityMode || "standard";
  if (mode === "low") return 260;
  if (mode === "high") return Math.min(840, getWaveformPeakCount());
  if (mode === "ultra") return Math.min(1200, getWaveformPeakCount());
  return Math.min(420, getWaveformPeakCount());
}

function getWaveformDisplayMode() {
  return ["bars", "smooth", "compact", "hidden"].includes(settings.waveformDisplayMode)
    ? settings.waveformDisplayMode
    : "bars";
}

function getWaveformClassName(baseClass = "waveform waveformScroller") {
  return [
    baseClass,
    `waveformMode-${getWaveformDisplayMode()}`,
    `waveformHeight-${settings.waveformHeightMode || "normal"}`,
    `waveformDensity-${settings.waveformDensityMode || "standard"}`,
    settings.waveformAllowSeeking ? "waveformSeekingOn" : "waveformSeekingOff",
  ].join(" ");
}

function applyWaveformSettingsToDom() {
  document.body.classList.toggle("waveformSeekingDisabled", !settings.waveformAllowSeeking);
  document.body.dataset.waveformDisplayMode = getWaveformDisplayMode();
  document.body.dataset.waveformHeightMode = settings.waveformHeightMode || "normal";
  document.body.dataset.waveformDensityMode = settings.waveformDensityMode || "standard";
}

function maybeQueueWaveformGeneration(track, reason = "missing") {
  if (!track?.id) return;
  if (!settings.waveformGenerateOnFirstPlay && reason === "first-play") return;
  if (!settings.waveformAutoGenerateOnUpload && reason === "upload") return;
  if (waveformAutoQueuedTrackIds.has(track.id)) return;

  waveformAutoQueuedTrackIds.add(track.id);

  fetch("/waveforms/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scope: "single",
      id: track.id,
      force: false,
      count: getWaveformPeakCount(),
      reason,
    }),
  }).catch(() => {
    waveformAutoQueuedTrackIds.delete(track.id);
  });
}

function syncWaveformPads() {
  if (!waveformViewport || !waveformEl) return;

  const lead = waveformEl.querySelector(".wavePadLead");
  const tail = waveformEl.querySelector(".wavePadTail");
  if (!lead || !tail) return;

  const firstBar = waveformEl.querySelector(".bar");
  const barWidth = firstBar ? firstBar.offsetWidth : 3;
  const centerPad = Math.max(0, Math.floor((waveformViewport.clientWidth / 2) - (barWidth / 2)));

  lead.style.width = `${centerPad}px`;
  lead.style.minWidth = `${centerPad}px`;
  tail.style.width = `${centerPad}px`;
  tail.style.minWidth = `${centerPad}px`;
}

function seekFromWaveClientX(clientX) {
  if (!settings.waveformAllowSeeking) return;
  if (isPreviewingDifferentTrack()) return;
  if (!audio || !audio.duration || !waveformViewport || !waveformEl) return;

  const rect = waveformViewport.getBoundingClientRect();
  const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
  const currentTransform = waveformEl.style.transform || "translateX(0px)";
  const match = currentTransform.match(/translateX\((-?\d+(?:\.\d+)?)px\)/);
  const translateX = match ? Number(match[1]) : 0;

  const contentX = x - translateX;
  const bars = Array.from(waveformEl.querySelectorAll(".bar"));
  if (!bars.length) return;

  let bestIndex = 0;
  let bestDist = Infinity;

  bars.forEach((bar, idx) => {
    const center = bar.offsetLeft + (bar.offsetWidth / 2);
    const dist = Math.abs(center - contentX);
    if (dist < bestDist) {
      bestDist = dist;
      bestIndex = idx;
    }
  });

  const ratio = bestIndex / Math.max(1, bars.length - 1);
  const snappedRatio = Math.max(0, Math.min(1, ratio));
  audio.currentTime = snappedRatio * audio.duration;
  updateWaveProgress();
  updateSeekProgressFill();
}

function flushWaveformSeek() {
  waveformSeekRaf = 0;

  if (waveformPendingClientX == null) return;
  const x = waveformPendingClientX;
  waveformPendingClientX = null;

  seekFromWaveClientX(x);
}

function queueWaveformSeek(clientX) {
  waveformPendingClientX = clientX;

  if (waveformSeekRaf) return;
  waveformSeekRaf = requestAnimationFrame(flushWaveformSeek);
}

function bindWaveformSeeking() {
  if (!waveformViewport) return;

  waveformViewport.addEventListener("click", (e) => {
    if (Date.now() < waveformSuppressClickUntil) return;
    if (waveformDragActive) return;
    seekFromWaveClientX(e.clientX);
  });

  waveformViewport.addEventListener("pointerdown", (e) => {
    if (!settings.waveformAllowSeeking) return;
    if (!audio || !audio.duration || !waveformEl) return;

    waveformDragActive = true;
    waveformDragPointerId = e.pointerId;
    waveformDragStartX = e.clientX;
    waveformDragStartTime = audio.currentTime || 0;
    waveformDragMoved = false;

    waveformViewport.classList.add("dragging");
    waveformViewport.setPointerCapture?.(e.pointerId);
  });

  waveformViewport.addEventListener("pointermove", (e) => {
    if (!waveformDragActive) return;
    if (waveformDragPointerId !== null && e.pointerId !== waveformDragPointerId) return;
    if (!audio || !audio.duration || !waveformViewport || !waveformEl) return;

    const deltaX = e.clientX - waveformDragStartX;
    const scrollableWidth = Math.max(1, waveformEl.scrollWidth - waveformViewport.clientWidth);
    const dragDamping = 3.2;
    const secondsPerPixel = audio.duration / (scrollableWidth * dragDamping);
    const nextTime = Math.max(0, Math.min(audio.duration, waveformDragStartTime - (deltaX * secondsPerPixel)));

    if (Math.abs(deltaX) > 3) {
      waveformDragMoved = true;
    }

    audio.currentTime = nextTime;
    updateWaveProgress();
    updateStageWaveProgress();
    updateSeekProgressFill();
    updateTracklistProgress();
    updateCurrentTimedTrackUI();
    updateStageTimeRow();
  });

  const endDrag = (e) => {
    if (!waveformDragActive) return;
    if (waveformDragPointerId !== null && e.pointerId !== waveformDragPointerId) return;

    waveformDragActive = false;
    waveformDragPointerId = null;
    waveformViewport.classList.remove("dragging");
    waveformSuppressClickUntil = Date.now() + 180;
  };

  waveformViewport.addEventListener("pointerup", endDrag);
  waveformViewport.addEventListener("pointercancel", endDrag);
  waveformViewport.addEventListener("pointerleave", (e) => {
    if (!waveformDragActive) return;
    if (waveformDragPointerId !== null && e.pointerId !== waveformDragPointerId) return;
    endDrag(e);
  });
}

async function loadWaveformPeaks(track) {
  waveformPeaks = [];

  if (!track?.id) return [];
  if (!settings.useRealWaveformPeaks) return [];

  try {
    const res = await fetch(`/track/${encodeURIComponent(track.id)}/waveform?count=${encodeURIComponent(getWaveformPeakCount())}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      maybeQueueWaveformGeneration(track, "first-play");
      throw new Error(`Waveform HTTP ${res.status}`);
    }

    const payload = await res.json();
    const peaks = Array.isArray(payload?.peaks) ? payload.peaks : [];

    waveformPeaks = peaks
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value >= 0);

    if (!waveformPeaks.length) {
      maybeQueueWaveformGeneration(track, "first-play");
    }

    return waveformPeaks;
  } catch (err) {
    console.warn("Waveform fallback used for", track?.id, err);
    waveformPeaks = [];
    return [];
  }
}

function buildFallbackPeaks() {
  const count = getFallbackWaveformCount();
  const peaks = [];

  for (let i = 0; i < count; i += 1) {
    const waveA = Math.abs(Math.sin(i * 0.11));
    const waveB = Math.abs(Math.cos(i * 0.047));
    const waveC = Math.abs(Math.sin(i * 0.019));
    const height = Math.max(0.08, Math.min(1, (waveA * 0.5) + (waveB * 0.3) + (waveC * 0.2)));
    peaks.push(height);
  }

  return peaks;
}

function getWaveDisplayValue(value, viewportHeight = 0) {
  const safe = Math.max(0, Math.min(1, Number(value) || 0));
  const mode = getWaveformDisplayMode();
  const density = settings.waveformDensityMode || "standard";

  if (mode === "compact") return Math.max(0.08, safe * 0.72);
  if (mode === "smooth") return Math.pow(safe, viewportHeight >= 120 ? 0.5 : 0.62);
  if (density === "ultra" || density === "high") return Math.pow(safe, viewportHeight >= 120 ? 0.52 : 0.7);
  if (viewportHeight >= 120) return Math.pow(safe, 0.58);
  return safe;
}

function refreshWaveformAfterResize() {
  if (!waveformViewport || !waveformEl) return;

  const nextHeight = Math.round(waveformViewport.clientHeight || 0);
  if (!nextHeight || Math.abs(nextHeight - waveformLastRenderHeight) < 18) return;

  if (waveformResizeRenderTimer) clearTimeout(waveformResizeRenderTimer);
  waveformResizeRenderTimer = window.setTimeout(() => {
    waveformResizeRenderTimer = 0;
    void renderWaveformPlaceholder(getStageDisplayTrack() || currentTrack());
  }, 90);
}

function updateSeekProgressFill() {
  if (!seek) return;

  if (isPreviewingDifferentTrack()) {
    seek.style.setProperty("--seek-progress", "0%");
    return;
  }

  if (!audio || !audio.duration) {
    seek.style.setProperty("--seek-progress", "0%");
    return;
  }

  const ratio = Math.max(0, Math.min(1, audio.currentTime / audio.duration));
  seek.style.setProperty("--seek-progress", `${ratio * 100}%`);
}

function updateWaveProgress() {
  if (!waveformEl) return;

  const bars = Array.from(waveformEl.querySelectorAll(".bar"));

  if (isPreviewingDifferentTrack()) {
    bars.forEach((bar) => bar.classList.remove("active"));
    waveformEl.style.transform = "translateX(0px)";
    return;
  }

  if (!bars.length || !audio || !audio.duration || !waveformViewport) {
    bars.forEach((bar) => bar.classList.remove("active"));
    waveformEl.style.transform = "translateX(0px)";
    return;
  }

  const ratio = Math.max(0, Math.min(1, audio.currentTime / audio.duration));
  const playedIndex = Math.floor(ratio * (bars.length - 1));

  bars.forEach((bar, idx) => {
    bar.classList.toggle("active", idx <= playedIndex);
  });

  const playedBar = bars[Math.max(0, Math.min(playedIndex, bars.length - 1))];
  if (!playedBar) return;

  const viewportWidth = waveformViewport.clientWidth;
  const trackWidth = waveformEl.scrollWidth;
  const centerX = viewportWidth / 2;
  const barCenter = playedBar.offsetLeft + (playedBar.offsetWidth / 2);

  let translateX = centerX - barCenter;
  const minTranslate = Math.min(0, viewportWidth - trackWidth);
  translateX = Math.max(minTranslate, Math.min(0, translateX));

  waveformEl.style.transform = `translateX(${translateX}px)`;
}

function buildWheel(el, max, selected, hiddenInput, stateKey) {
  if (!el || !hiddenInput) return;

  const previousValue = Number(hiddenInput.value || selected || 0);
  el.innerHTML = "";

  const getWheelSpacerHeight = () => {
    const fallbackItemHeight = 54;
    const firstItem = el.querySelector(".wheelItem");
    const itemHeight = firstItem?.offsetHeight || fallbackItemHeight;
    return Math.max(0, Math.round((el.clientHeight - itemHeight) / 2));
  };

  const makeSpacer = () => {
    const spacer = document.createElement("div");
    spacer.className = "wheelSpacer";
    return spacer;
  };

  const topSpacer = makeSpacer();
  const bottomSpacer = makeSpacer();
  el.appendChild(topSpacer);

  for (let i = 0; i <= max; i += 1) {
    const item = document.createElement("div");
    item.className = "wheelItem";
    item.dataset.value = String(i);
    item.textContent = String(i);
    el.appendChild(item);
  }

  el.appendChild(bottomSpacer);

  const items = Array.from(el.querySelectorAll(".wheelItem"));

  const applySpacerHeights = () => {
    const spacerHeight = getWheelSpacerHeight();
    topSpacer.style.height = `${spacerHeight}px`;
    bottomSpacer.style.height = `${spacerHeight}px`;
  };

  const getScrollTopForValue = (value) => {
    const target = items.find((item) => Number(item.dataset.value) === Number(value)) || items[0];
    if (!target) return 0;
    return Math.max(0, target.offsetTop - ((el.clientHeight - target.offsetHeight) / 2));
  };

  const setActiveValue = (value, shouldSnap = false) => {
    const targetValue = Math.max(0, Math.min(max, Number(value) || 0));
    items.forEach((item) => item.classList.toggle("active", Number(item.dataset.value) === targetValue));
    hiddenInput.value = String(targetValue);
    if (stateKey) sleepWheelState[stateKey] = targetValue;
    if (shouldSnap) {
      const top = getScrollTopForValue(targetValue);
      el.scrollTo({ top, behavior: "smooth" });
    }
  };

  const pickClosestValue = () => {
    const center = el.scrollTop + (el.clientHeight / 2);
    let bestValue = previousValue;
    let bestDist = Infinity;

    items.forEach((item) => {
      const itemCenter = item.offsetTop + (item.offsetHeight / 2);
      const dist = Math.abs(center - itemCenter);
      if (dist < bestDist) {
        bestDist = dist;
        bestValue = Number(item.dataset.value);
      }
    });

    return bestValue;
  };

  el.onscroll = () => {
    const value = pickClosestValue();
    setActiveValue(value, false);

    const existing = wheelSnapTimers.get(el);
    if (existing) clearTimeout(existing);

    const nextTimer = setTimeout(() => {
      setActiveValue(pickClosestValue(), true);
    }, 120);

    wheelSnapTimers.set(el, nextTimer);
  };

  const syncToValue = (value) => {
    const targetValue = Math.max(0, Math.min(max, Number(value) || 0));
    applySpacerHeights();
    setActiveValue(targetValue, false);
    const top = getScrollTopForValue(targetValue);
    el.scrollTop = top;
  };

  requestAnimationFrame(() => {
    syncToValue(previousValue);
    setTimeout(() => syncToValue(previousValue), 60);
    setTimeout(() => syncToValue(previousValue), 180);
  });
}

function initSleepWheels() {
  sleepWheelState.hours = Number(customHours?.value || sleepWheelState.hours || 0);
  sleepWheelState.minutes = Number(customMinutes?.value || sleepWheelState.minutes || 15);
  sleepWheelState.seconds = Number(customSeconds?.value || sleepWheelState.seconds || 0);

  buildWheel(hoursWheel, 23, sleepWheelState.hours, customHours, "hours");
  buildWheel(minutesWheel, 59, sleepWheelState.minutes, customMinutes, "minutes");
  buildWheel(secondsWheel, 59, sleepWheelState.seconds, customSeconds, "seconds");
}

function refreshSleepWheelsIfOpen() {
  if (!sleepPopup || sleepPopup.classList.contains("hidden")) return;
  if (sleepPopupPage !== "custom") return;
  initSleepWheels();
}

const PLAYBACK_SPEED_OPTIONS = [0.5, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];

function clampPlaybackRate(value) {
  const n = Number(value || 1);
  if (!Number.isFinite(n)) return 1;
  const closest = PLAYBACK_SPEED_OPTIONS.reduce((best, option) => {
    return Math.abs(option - n) < Math.abs(best - n) ? option : best;
  }, PLAYBACK_SPEED_OPTIONS[0]);
  return closest;
}

function formatPlaybackRate(value) {
  const n = clampPlaybackRate(value);
  return `${n % 1 === 0 ? n.toFixed(1) : n}x`;
}

function updateSpeedPopupText() {
  if (speedCurrentText) {
    speedCurrentText.textContent = `Currently: ${formatPlaybackRate(settings.playbackRate)}`;
  }
  if (speedValue) {
    speedValue.value = String(settings.playbackRate);
  }
}

function buildValueWheel(el, values, selectedValue, hiddenInput, onChange) {
  if (!el || !hiddenInput || !Array.isArray(values) || !values.length) return;

  const safeValues = values.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  const previousValue = Number(hiddenInput.value || selectedValue || safeValues[0] || 1);
  el.innerHTML = "";

  const getWheelSpacerHeight = () => {
    const fallbackItemHeight = 54;
    const firstItem = el.querySelector(".wheelItem");
    const itemHeight = firstItem?.offsetHeight || fallbackItemHeight;
    return Math.max(0, Math.round((el.clientHeight - itemHeight) / 2));
  };

  const makeSpacer = () => {
    const spacer = document.createElement("div");
    spacer.className = "wheelSpacer";
    return spacer;
  };

  const topSpacer = makeSpacer();
  const bottomSpacer = makeSpacer();
  el.appendChild(topSpacer);

  safeValues.forEach((value) => {
    const item = document.createElement("div");
    item.className = "wheelItem";
    item.dataset.value = String(value);
    item.textContent = formatPlaybackRate(value);
    el.appendChild(item);
  });

  el.appendChild(bottomSpacer);

  const items = Array.from(el.querySelectorAll(".wheelItem"));

  const applySpacerHeights = () => {
    const spacerHeight = getWheelSpacerHeight();
    topSpacer.style.height = `${spacerHeight}px`;
    bottomSpacer.style.height = `${spacerHeight}px`;
  };

  const getScrollTopForValue = (value) => {
    const target =
      items.find((item) => Number(item.dataset.value) === Number(value))
      || items[0];
    if (!target) return 0;
    return Math.max(0, target.offsetTop - ((el.clientHeight - target.offsetHeight) / 2));
  };

  const setActiveValue = (value, shouldSnap = false, shouldApply = true) => {
    const targetValue = clampPlaybackRate(value);
    items.forEach((item) => item.classList.toggle("active", Number(item.dataset.value) === targetValue));
    hiddenInput.value = String(targetValue);

    if (shouldApply) {
      settings.playbackRate = targetValue;
      saveSettings();
      if (audio) audio.playbackRate = targetValue;
      updateSpeedPopupText();
    }

    if (shouldSnap) {
      const top = getScrollTopForValue(targetValue);
      el.scrollTo({ top, behavior: "smooth" });
    }
  };

  const pickClosestValue = () => {
    const center = el.scrollTop + (el.clientHeight / 2);
    let bestValue = previousValue;
    let bestDist = Infinity;

    items.forEach((item) => {
      const itemCenter = item.offsetTop + (item.offsetHeight / 2);
      const dist = Math.abs(center - itemCenter);
      if (dist < bestDist) {
        bestDist = dist;
        bestValue = Number(item.dataset.value);
      }
    });

    return bestValue;
  };

  el.onscroll = () => {
    const value = pickClosestValue();
    setActiveValue(value, false, true);

    const existing = wheelSnapTimers.get(el);
    if (existing) clearTimeout(existing);

    const nextTimer = setTimeout(() => {
      setActiveValue(pickClosestValue(), true, true);
    }, 120);

    wheelSnapTimers.set(el, nextTimer);
  };

  const syncToValue = (value) => {
    const targetValue = clampPlaybackRate(value);
    applySpacerHeights();
    setActiveValue(targetValue, false, false);
    const top = getScrollTopForValue(targetValue);
    el.scrollTop = top;
  };

  requestAnimationFrame(() => {
    syncToValue(previousValue);
    setTimeout(() => syncToValue(previousValue), 60);
  });
}

function getQueueButtonMarkup(active) {
  return active
    ? `<i class="fa-solid fa-check"></i>`
    : `<i class="fa-solid fa-plus"></i>`;
}

function getPlaylistButtonMarkup(active) {
  return active
    ? `<i class="fa-solid fa-bookmark"></i>`
    : `<i class="fa-regular fa-bookmark"></i>`;
}

function initSpeedWheel() {
  if (!speedWheel || !speedValue) return;
  buildValueWheel(
    speedWheel,
    PLAYBACK_SPEED_OPTIONS,
    settings.playbackRate,
    speedValue,
    (value) => {
      settings.playbackRate = clampPlaybackRate(value);
      saveSettings();
      if (audio) audio.playbackRate = settings.playbackRate;
      updateSpeedPopupText();
    }
  );
}

function openSpeedPopup(anchorButton) {
  updateSpeedPopupText();
  openTopPopup("speed", anchorButton);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      initSpeedWheel();
    });
  });
}

async function renderWaveformPlaceholder(trackOverride = null) {
  if (!waveformEl) return;

  const track = trackOverride || currentTrack();
  waveformEl.innerHTML = "";
  waveformEl.className = getWaveformClassName("waveform waveformScroller");

  if (getWaveformDisplayMode() === "hidden") {
    waveformEl.innerHTML = `<div class="waveformUnavailable">Waveform hidden in Settings</div>`;
    return;
  }

  const lead = document.createElement("div");
  lead.className = "wavePad wavePadLead";
  waveformEl.appendChild(lead);

  let peaks = await loadWaveformPeaks(track);
  if (!peaks.length && settings.waveformFallbackBars) {
    peaks = buildFallbackPeaks();
  }

  if (!peaks.length) {
    waveformEl.innerHTML = `<div class="waveformUnavailable">Generate waveform peaks in Settings</div>`;
    waveformPeaks = [];
    return;
  }

  waveformPeaks = peaks;
  waveformLastRenderHeight = waveformViewport ? Math.round(waveformViewport.clientHeight || 0) : 0;

  peaks.forEach((value, idx) => {
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.dataset.index = String(idx);

    const viewportHeight = waveformViewport ? Math.max(28, waveformViewport.clientHeight - 10) : 60;
    const minHeight = waveformViewport && waveformViewport.clientHeight >= 120 ? 20 : 14;
    const maxHeight = viewportHeight;
    const displayValue = getWaveDisplayValue(value, waveformViewport?.clientHeight || 0);
    const px = Math.round(minHeight + (displayValue * (maxHeight - minHeight)));

    bar.style.height = `${px}px`;
    waveformEl.appendChild(bar);
  });

  const tail = document.createElement("div");
  tail.className = "wavePad wavePadTail";
  waveformEl.appendChild(tail);

  requestAnimationFrame(() => {
    syncWaveformPads();
    updateWaveProgress();
  });
}

/* playlists */
function getPlaylistPrefs() {
  const saved = readPersistedJson(PLAYLIST_PREFS_KEY, {});
  return saved && typeof saved === "object" ? saved : {};
}

function savePlaylistPrefs() {
  writePersistedJson(PLAYLIST_PREFS_KEY, {
    viewMode: playlistViewMode,
    sortMode: playlistSortMode,
  });
}

(function initPlaylistPrefs() {
  const prefs = getPlaylistPrefs();
  playlistViewMode = prefs.viewMode === "list" ? "list" : "grid";
  playlistSortMode = ["recent", "name", "duration"].includes(prefs.sortMode) ? prefs.sortMode : "recent";
})();

function getPlaylistsStore() {
  const store = readPersistedJson(PLAYLISTS_KEY, []);
  return Array.isArray(store) ? store : [];
}

function savePlaylistsStore(store) {
  writePersistedJson(PLAYLISTS_KEY, Array.isArray(store) ? store : []);
}

function makePlaylistId() {
  return `pl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function fmtLongDuration(totalSeconds) {
  const secs = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const days = Math.floor(secs / 86400);
  const hours = Math.floor((secs % 86400) / 3600);
  const minutes = Math.floor((secs % 3600) / 60);

  const parts = [];
  if (days) parts.push(`${days} day${days === 1 ? "" : "s"}`);
  if (hours) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  if (minutes || !parts.length) parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);
  return parts.join(", ");
}

function normalisePlaylistSearch(value) {
  return normaliseText(value).toLowerCase().trim();
}

function buildPlaylistTrackSnapshot(track) {
  const snap = buildFavouriteSnapshot(track || {});
  return {
    ...snap,
    trackKey: getStableTrackKey(track || {}),
  };
}

function resolvePlaylistTrack(entry) {
  if (!entry) return null;
  const live = findLibraryTrackForFavourite(entry);
  return live ? { ...entry, ...live } : entry;
}

function getPlaylistItemsResolved(playlist) {
  return (playlist?.items || []).map((entry) => resolvePlaylistTrack(entry)).filter(Boolean);
}

function getPlaylistDuration(playlist) {
  return getPlaylistItemsResolved(playlist).reduce((sum, item) => sum + (Number(item?.duration) || 0), 0);
}

function getPlaylistCoverTrack(playlist) {
  return getPlaylistItemsResolved(playlist)[0] || null;
}

function isTrackAlreadyInPlaylist(playlist, track) {
  const trackKey = getStableTrackKey(track);
  return (playlist?.items || []).some((entry) => {
    const entryKey = getStableTrackKey(entry) || entry?.trackKey || entry?.favKey || entry?.id;
    return !!entryKey && !!trackKey && entryKey === trackKey;
  });
}

function isTrackInAnyPlaylist(track) {
  if (!track) return false;
  return getPlaylistsStore().some((playlist) => isTrackAlreadyInPlaylist(playlist, track));
}

function getFilteredSortedPlaylists() {
  const query = normalisePlaylistSearch(playlistSearchTerm);
  const items = getPlaylistsStore().filter((playlist) => {
    if (!query) return true;
    return [playlist?.name, ...(playlist?.items || []).map((item) => item?.title || item?.artist || "")]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  items.sort((a, b) => {
    if (playlistSortMode === "name") {
      return normaliseText(a?.name).localeCompare(normaliseText(b?.name));
    }
    if (playlistSortMode === "duration") {
      return getPlaylistDuration(b) - getPlaylistDuration(a);
    }
    return Number(b?.updatedAt || 0) - Number(a?.updatedAt || 0);
  });

  return items;
}

function updatePlaylistToggleLabel() {
  if (playlistMenuToggleViewText) {
    playlistMenuToggleViewText.textContent = playlistViewMode === "grid" ? "List view" : "Grid view";
  }
}

function closePlaylistMenus() {
  playlistCreateMenu?.classList.add("hidden");
  playlistMoreMenu?.classList.add("hidden");
  playlistDetailMenu?.classList.add("hidden");
}

function togglePlaylistMenu(menu) {
  if (!menu) return;
  const willShow = menu.classList.contains("hidden");
  closePlaylistMenus();
  menu.classList.toggle("hidden", !willShow);
}

function closeThemeDialog(result = null) {
  if (themeDialogOverlay) themeDialogOverlay.classList.add("hidden");

  const resolve = themeDialogResolve;
  themeDialogResolve = null;

  if (resolve) resolve(result);
}

function openThemeDialog({
  title = "BRMedia",
  message = "",
  showInput = false,
  inputValue = "",
  inputPlaceholder = "",
  okText = "OK",
  cancelText = "Cancel",
} = {}) {
  if (!themeDialogOverlay) return Promise.resolve(null);

  themeDialogHasInput = !!showInput;

  if (themeDialogTitle) themeDialogTitle.textContent = title;
  if (themeDialogMessage) themeDialogMessage.textContent = message;

  if (themeDialogInput) {
    themeDialogInput.classList.toggle("hidden", !showInput);
    themeDialogInput.value = showInput ? String(inputValue || "") : "";
    themeDialogInput.placeholder = inputPlaceholder || "";
  }

  if (btnThemeDialogCancel) btnThemeDialogCancel.textContent = cancelText;
  if (btnThemeDialogOk) btnThemeDialogOk.textContent = okText;

  themeDialogOverlay.classList.remove("hidden");

  return new Promise((resolve) => {
    themeDialogResolve = resolve;

    requestAnimationFrame(() => {
      if (showInput && themeDialogInput) {
        themeDialogInput.focus();
        themeDialogInput.select?.();
      } else {
        btnThemeDialogOk?.focus?.();
      }
    });
  });
}

async function confirmThemeAction(message, title = "Please confirm", okText = "OK") {
  const result = await openThemeDialog({
    title,
    message,
    showInput: false,
    okText,
    cancelText: "Cancel",
  });

  return result === true;
}

async function promptForPlaylistName(defaultValue = "") {
  const next = await openThemeDialog({
    title: "Playlist name",
    message: "Enter a name for this playlist.",
    showInput: true,
    inputValue: defaultValue || "New playlist",
    inputPlaceholder: "New playlist",
    okText: "Save",
    cancelText: "Cancel",
  });

  if (next == null) return "";
  return normaliseText(String(next)).trim();
}

function queuePlaylistEvent(
  type,
  playlist,
  extra = {}
) {
  if (
    !playlist ||
    !type
  ) {
    return;
  }

  queuePlayerEvent(
    type,
    {
      id:
        playlist.id ||
        "",
      title:
        playlist.name ||
        "Playlist",
      artist:
        "Playlist",
      source:
        "player",
    },
    {
      ...extra,
      entityType:
        "playlist",
      entityId:
        playlist.id ||
        "",
      playlistName:
        playlist.name ||
        "Playlist",
      trackCount:
        Number(
          playlist.items
            ?.length ||
          0
        ),
    }
  );
}

function createPlaylistRecord(
  name,
  tracks = []
) {
  const safeName =
    normaliseText(
      name,
      "New playlist"
    ) ||
    "New playlist";

  const now =
    Date.now();

  const items =
    tracks.map(
      (track) =>
        buildPlaylistTrackSnapshot(
          track
        )
    );

  const record = {
    id:
      makePlaylistId(),
    name:
      safeName,
    createdAt:
      now,
    updatedAt:
      now,
    items,
  };

  const store =
    getPlaylistsStore();

  store.unshift(
    record
  );

  savePlaylistsStore(
    store
  );

  queuePlaylistEvent(
    "playlist_create",
    record,
    {
      status:
        "created",
    }
  );

  return record;
}

function appendTracksToPlaylist(playlistId, tracks) {
  const store = getPlaylistsStore();
  const playlist = store.find((item) => item.id === playlistId);
  if (!playlist) return null;

  const existing = new Set(
    (playlist.items || [])
      .map((entry) => getStableTrackKey(entry) || entry?.trackKey || entry?.favKey || entry?.id)
      .filter(Boolean)
  );

  const additions = [];

  tracks.forEach((track) => {
    const key = getStableTrackKey(track) || track?.id;
    if (!key || existing.has(key)) return;
    existing.add(key);
    additions.push(buildPlaylistTrackSnapshot(track));
  });

  if (
    !Array.isArray(
      playlist.items
    )
  ) {
    playlist.items =
      [];
  }

  playlist.items.push(
    ...additions
  );

  playlist.updatedAt =
    Date.now();

  savePlaylistsStore(
    store
  );

  if (
    additions.length
  ) {
    queuePlaylistEvent(
      "playlist_track_add",
      playlist,
      {
        count:
          additions.length,
        status:
          "tracks_added",
      }
    );
  }

  return {
    playlist,
    addedCount:
      additions.length,
  };
}

async function openPlaylistPickerForTracks(tracks) {
  const sourceTracks = (tracks || []).filter(Boolean);
  if (!sourceTracks.length) return;

  const store = getPlaylistsStore();
  if (!store.length) {
    const name = await promptForPlaylistName(sourceTracks.length === 1 ? sourceTracks[0].title || "New playlist" : "New playlist");
    if (!name) return;
    const playlist = createPlaylistRecord(name, sourceTracks);
    showBookmarkToast("Playlist created", `${playlist.name} • ${playlist.items.length} tracks`);
    playlistActiveId = playlist.id;
    renderPlaylists();
    return;
  }

  const list = store.map((playlist, index) => `${index + 1}. ${playlist.name}`).join("\n");
  const input = await openThemeDialog({
    title: "Add to playlist",
    message: `Add ${sourceTracks.length === 1 ? `“${sourceTracks[0].title || "track"}”` : `${sourceTracks.length} tracks`} to which playlist?\n\nType a number, or type NEW.\n\n${list}`,
    showInput: true,
    inputValue: "1",
    inputPlaceholder: "1 or NEW",
    okText: "Continue",
    cancelText: "Cancel",
  });
  if (input == null) return;

  if (/^new$/i.test(String(input).trim())) {
    const name = await promptForPlaylistName(sourceTracks.length === 1 ? sourceTracks[0].title || "New playlist" : "New playlist");
    if (!name) return;
    const playlist = createPlaylistRecord(name, sourceTracks);
    showBookmarkToast("Playlist created", `${playlist.name} • ${playlist.items.length} tracks`);
    playlistActiveId = playlist.id;
    renderPlaylists();
    return;
  }

  const index = Number(String(input).trim()) - 1;
  const selected = store[index];
  if (!selected) {
    showBookmarkToast("Playlists", "That playlist number wasn’t found");
    return;
  }

  const result = appendTracksToPlaylist(selected.id, sourceTracks);
  if (!result) return;
  showBookmarkToast(result.addedCount ? "Added to playlist" : "Already in playlist", result.playlist.name);
  renderPlaylists();
}

async function saveQueueToPlaylistFlow() {
  const sourceTracks = queue.length
    ? queue
    : readPersistedJson("brmedia_saved_queue_manual", []).filter(Boolean);

  if (!sourceTracks.length) {
    showBookmarkToast("Playlists", "Your queue is empty right now");
    return;
  }

  await openPlaylistPickerForTracks(sourceTracks);
}

function getPlaylistHelpOverlay() {
  let overlay = document.getElementById("playlistHelpOverlay");
  if (overlay) return overlay;

  overlay = document.createElement("div");
  overlay.id = "playlistHelpOverlay";
  overlay.className = "playlistHelpOverlay hidden";
  overlay.innerHTML = `
    <div class="playlistHelpCard popupCard popupCardWide">
      <div class="playlistHelpHeader">
        <div>
          <div class="playlistHelpKicker">BRMedia playlists</div>
          <div class="popupTitle">Playlist help</div>
          <div class="popupHelpText">Quick guide for creating, importing, sorting and managing your playlists.</div>
        </div>
        <button id="btnPlaylistHelpClose" class="popupIconBtn" type="button" aria-label="Close playlist help">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="playlistHelpGrid">
        <div class="playlistHelpItem"><i class="fa-solid fa-plus"></i><div><strong>New playlist</strong><span>Create an empty playlist, then add mixes from Library, Lists or Favourites.</span></div></div>
        <div class="playlistHelpItem"><i class="fa-solid fa-file-import"></i><div><strong>Import</strong><span>Import your current queue, saved queue, or playlist files like M3U, M3U8, PLS and JSON.</span></div></div>
        <div class="playlistHelpItem"><i class="fa-solid fa-circle-check"></i><div><strong>Select mode</strong><span>Select multiple playlists for play, queue, export or delete.</span></div></div>
        <div class="playlistHelpItem"><i class="fa-solid fa-arrow-up-wide-short"></i><div><strong>Sort</strong><span>Cycle between recently updated, A-Z and longest first.</span></div></div>
        <div class="playlistHelpItem"><i class="fa-solid fa-table-cells-large"></i><div><strong>Grid/List</strong><span>Switch between big cover cards and compact rows.</span></div></div>
        <div class="playlistHelpItem"><i class="fa-solid fa-magnifying-glass"></i><div><strong>Search</strong><span>Search playlist names and the tracks inside them.</span></div></div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || e.target.closest("#btnPlaylistHelpClose")) {
      overlay.classList.add("hidden");
    }
  });

  return overlay;
}

function showPlaylistHelpOverlay() {
  getPlaylistHelpOverlay().classList.remove("hidden");
}

function getPlaylistSelectionBar() {
  let bar = document.getElementById("playlistSelectionBar");
  if (bar) return bar;

  bar = document.createElement("div");
  bar.id = "playlistSelectionBar";
  bar.className = "playlistSelectionBar hidden";
  bar.innerHTML = `
    <div id="playlistSelectionCount" class="playlistSelectionCount">0 selected</div>
    <button id="btnPlaylistBulkPlay" class="playlistBulkBtn primary" type="button"><i class="fa-solid fa-play"></i><span>Play</span></button>
    <button id="btnPlaylistBulkQueue" class="playlistBulkBtn" type="button"><i class="fa-solid fa-plus"></i><span>Queue</span></button>
    <button id="btnPlaylistBulkExport" class="playlistBulkBtn" type="button"><i class="fa-solid fa-file-export"></i><span>Export</span></button>
    <button id="btnPlaylistBulkDelete" class="playlistBulkBtn danger" type="button"><i class="fa-solid fa-trash"></i><span>Delete</span></button>
    <button id="btnPlaylistBulkDone" class="playlistBulkBtn" type="button"><i class="fa-solid fa-xmark"></i><span>Done</span></button>
  `;

  const host = playlistHomePane || views.Playlists || document.body;
  host.prepend(bar);

  bar.querySelector("#btnPlaylistBulkPlay")?.addEventListener("click", () => playSelectedPlaylists(false));
  bar.querySelector("#btnPlaylistBulkQueue")?.addEventListener("click", queueSelectedPlaylists);
  bar.querySelector("#btnPlaylistBulkExport")?.addEventListener("click", exportSelectedPlaylists);
  bar.querySelector("#btnPlaylistBulkDelete")?.addEventListener("click", () => void deleteSelectedPlaylists());
  bar.querySelector("#btnPlaylistBulkDone")?.addEventListener("click", () => setPlaylistSelectMode(false));

  return bar;
}

function updatePlaylistSelectionBar() {
  const bar = getPlaylistSelectionBar();
  const count = selectedPlaylistIds.size;

  bar.classList.toggle("hidden", !playlistSelectMode);

  const countEl = bar.querySelector("#playlistSelectionCount");
  if (countEl) countEl.textContent = `${count} selected`;

  bar.querySelectorAll("button:not(#btnPlaylistBulkDone)").forEach((btn) => {
    btn.disabled = count < 1;
    btn.classList.toggle("disabledLike", count < 1);
  });
}

function setPlaylistSelectMode(enabled) {
  playlistSelectMode = !!enabled;

  if (!playlistSelectMode) {
    selectedPlaylistIds.clear();
  }

  closePlaylistMenus();
  renderPlaylists();
  showBookmarkToast("Playlists", playlistSelectMode ? "Select mode on" : "Select mode off");
}

function togglePlaylistSelected(playlistId) {
  if (!playlistId) return;

  if (selectedPlaylistIds.has(playlistId)) {
    selectedPlaylistIds.delete(playlistId);
  } else {
    selectedPlaylistIds.add(playlistId);
  }

  renderPlaylists();
}

function getSelectedPlaylistRecords() {
  const selected = new Set(selectedPlaylistIds);
  return getPlaylistsStore().filter((playlist) => selected.has(playlist.id));
}

function getTracksFromSelectedPlaylists() {
  return getSelectedPlaylistRecords().flatMap((playlist) => getPlaylistItemsResolved(playlist));
}

function playSelectedPlaylists(shuffle = false) {
  queueTrackCollection(getTracksFromSelectedPlaylists(), { shuffle });
}

function queueSelectedPlaylists() {
  const tracks = getTracksFromSelectedPlaylists();
  tracks.forEach((track) => addToQueue(track));
  showBookmarkToast("Playlists", `${tracks.length} tracks added to queue`);
  renderQueue();
}

async function exportSelectedPlaylists() {
  const playlists = getSelectedPlaylistRecords();
  if (!playlists.length) return;

  const payload = {
    exportedAt: new Date().toISOString(),
    app: "BRMedia Centre",
    playlists,
  };

  const filename = `BRMedia selected playlists ${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const result = await saveBlobAsBrowserFile(blob, filename, {
    title: "BRMedia playlists",
    text: "BRMedia playlist export",
  });

  if (result !== "cancelled") {
    showBookmarkToast("Playlists", `${playlists.length} playlist${playlists.length === 1 ? "" : "s"} exported`);
  }
}

async function deleteSelectedPlaylists() {
  const count = selectedPlaylistIds.size;
  if (!count) return;

  const ok = await confirmThemeAction(
    `Delete ${count} selected playlist${count === 1 ? "" : "s"}?`,
    "Delete playlists",
    "Delete"
  );
  if (!ok) return;

  const selected =
    new Set(
      selectedPlaylistIds
    );

  const removed =
    getPlaylistsStore()
      .filter(
        (playlist) =>
          selected.has(
            playlist.id
          )
      );

  savePlaylistsStore(
    getPlaylistsStore()
      .filter(
        (playlist) =>
          !selected.has(
            playlist.id
          )
      )
  );

  queuePlayerEvent(
    "playlist_delete",
    {
      id:
        "playlist_bulk_delete",
      title:
        "Selected playlists",
      artist:
        "Playlist",
      source:
        "player",
    },
    {
      count:
        removed.length,
      status:
        "bulk_delete",
      entityType:
        "playlist",
      entityId:
        "playlist_bulk_delete",
      trackCount:
        removed
          .reduce(
            (
              total,
              playlist
            ) =>
              total +
              Number(
                playlist.items
                  ?.length ||
                0
              ),
            0
          ),
    }
  );

  selectedPlaylistIds.clear();
  playlistSelectMode = false;
  renderPlaylists();
}

function getPlaylistImportInput() {
  if (playlistImportInputEl) return playlistImportInputEl;

  playlistImportInputEl = document.createElement("input");
  playlistImportInputEl.type = "file";
  playlistImportInputEl.accept = ".m3u,.m3u8,.pls,.json,application/json,audio/x-mpegurl,audio/mpegurl";
  playlistImportInputEl.className = "uploadFileInputHidden";
  document.body.appendChild(playlistImportInputEl);

  return playlistImportInputEl;
}

function normalisePlaylistImportToken(value) {
  return normaliseText(value)
    .toLowerCase()
    .replace(/^file:\/\//, "")
    .replace(/%20/g, " ")
    .replace(/\\/g, "/")
    .trim();
}

function getLibraryMatchTokens(track) {
  const pieces = [
    track?.id,
    track?.title,
    track?.artist,
    track?.album,
    track?.subtitle,
    track?.file,
    track?.filename,
    track?.locator,
    track?.path,
  ].filter(Boolean);

  const tokens = new Set();

  pieces.forEach((piece) => {
    const token = normalisePlaylistImportToken(piece);
    if (!token) return;

    tokens.add(token);
    tokens.add(token.split("/").pop());
    tokens.add(token.replace(/\.[a-z0-9]+$/i, ""));
  });

  return Array.from(tokens).filter(Boolean);
}

function parseImportedPlaylistText(text, fileName = "") {
  const raw = String(text || "");
  const ext = String(fileName || "").toLowerCase().split(".").pop();

  if (ext === "json" || raw.trim().startsWith("{") || raw.trim().startsWith("[")) {
    const parsed = JSON.parse(raw);
    const source = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.playlists)
        ? parsed.playlists.flatMap((playlist) => playlist.items || [])
        : (parsed.items || parsed.tracks || []);

    return Array.isArray(source) ? source : [];
  }

  if (ext === "pls" || /\[playlist\]/i.test(raw)) {
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^File\d+=/i.test(line))
      .map((line) => line.replace(/^File\d+=/i, "").trim())
      .filter(Boolean);
  }

  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

function matchImportedPlaylistEntries(entries) {
  const matched = [];
  const used = new Set();
  const lookup = library.map((track) => ({ track, tokens: getLibraryMatchTokens(track) }));

  entries.forEach((entry) => {
    const wantedValues = typeof entry === "object"
      ? [entry.id, entry.trackKey, entry.favKey, entry.title, entry.file, entry.filename, entry.locator, entry.path]
      : [entry];

    const wantedTokens = wantedValues.map(normalisePlaylistImportToken).filter(Boolean);

    const hit = lookup.find(({ track, tokens }) => {
      if (used.has(track.id)) return false;
      return wantedTokens.some((wanted) => tokens.some((token) => (
        token === wanted ||
        token.endsWith(wanted) ||
        wanted.endsWith(token)
      )));
    });

    if (hit) {
      used.add(hit.track.id);
      matched.push(hit.track);
    }
  });

  return matched;
}

async function importPlaylistFileFlow() {
  const input = getPlaylistImportInput();
  input.value = "";

  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;

    try {
      if (!library.length) await loadLibrary();

      const text = await file.text();
      const entries = parseImportedPlaylistText(text, file.name);
      const tracks = matchImportedPlaylistEntries(entries);

      if (!tracks.length) {
        showBookmarkToast("Import playlist", "No matching BRMedia tracks found in that file");
        return;
      }

      const defaultName = file.name.replace(/\.[^.]+$/, "") || `Imported playlist ${getPlaylistsStore().length + 1}`;
      const name = await promptForPlaylistName(defaultName);
      if (!name) return;

      const playlist =
        createPlaylistRecord(
          name,
          tracks
        );

      queuePlaylistEvent(
        "playlist_import",
        playlist,
        {
          status:
            "file_import",
          matchedCount:
            tracks.length,
          skippedCount:
            Math.max(
              0,
              entries.length -
              tracks.length
            ),
        }
      );

      playlistActiveId =
        playlist.id;
      renderPlaylists();

      showBookmarkToast("Playlist imported", `${tracks.length} matched • ${Math.max(0, entries.length - tracks.length)} skipped`);
    } catch (err) {
      console.warn("Playlist file import failed", err);
      showBookmarkToast("Import playlist", "Could not read that playlist file");
    }
  };

  input.click();
}

async function importPlaylistFlow() {
  const sourceTracks = queue.length
    ? queue
    : readPersistedJson("brmedia_saved_queue_manual", []).filter(Boolean);

  if (!sourceTracks.length) {
    await importPlaylistFileFlow();
    return;
  }

  const choice = await openThemeDialog({
    title: "Import playlist",
    message: "Type QUEUE to save your current/saved queue as a playlist, or FILE to import .m3u, .m3u8, .pls or .json.",
    showInput: true,
    inputValue: "FILE",
    inputPlaceholder: "FILE or QUEUE",
    okText: "Continue",
    cancelText: "Cancel",
  });

  if (choice == null) return;

  if (/^queue$/i.test(String(choice).trim())) {
    const defaultName = `Imported playlist ${getPlaylistsStore().length + 1}`;
    const name = await promptForPlaylistName(defaultName);
    if (!name) return;

    const playlist =
      createPlaylistRecord(
        name,
        sourceTracks
      );

    queuePlaylistEvent(
      "playlist_import",
      playlist,
      {
        status:
          "queue_import",
        matchedCount:
          playlist.items
            .length,
      }
    );

    showBookmarkToast(
      "Playlist imported",
      `${playlist.name} • ${playlist.items.length} tracks`
    );
    playlistActiveId = playlist.id;
    renderPlaylists();
    return;
  }

  await importPlaylistFileFlow();
}

function queueTrackCollection(tracks, options = {}) {
  const items = (tracks || []).map((item) => resolvePlaylistTrack(item)).filter(Boolean);
  if (!items.length) {
    showBookmarkToast("Playlists", "Nothing to play here yet");
    return;
  }

  const nextQueue = [...items];
  if (options.shuffle) {
    for (let i = nextQueue.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [nextQueue[i], nextQueue[j]] = [nextQueue[j], nextQueue[i]];
    }
  }

  queue = nextQueue;
  queueIndex = 0;
  previewTrackId = "";

  const track = currentTrack();
  if (!track) return;

  setAudioSourceForCurrentTrack(track);
  void setNowPlayingUI(track);
  renderQueue();
  renderLibrary();
  renderFavourites();
  renderPlaylists();
  updatePlayIcons();

  if (settings.saveState) persistPlayerState();
  playCurrentAudio();
}

function openPlaylistDetail(playlistId) {
  playlistActiveId = playlistId || "";
  closePlaylistMenus();
  renderPlaylists();
}

function closePlaylistDetail() {
  playlistActiveId = "";
  playlistDetailSearchTerm = "";
  if (playlistDetailSearchInput) playlistDetailSearchInput.value = "";
  if (playlistDetailSearchPanel) playlistDetailSearchPanel.classList.add("hidden");
  closePlaylistMenus();
  renderPlaylists();
}

async function renameActivePlaylist() {
  const playlist = getPlaylistsStore().find((item) => item.id === playlistActiveId);
  if (!playlist) return;

  const nextName = await promptForPlaylistName(playlist.name || "Playlist");
  if (!nextName) return;

  const store = getPlaylistsStore();
  const target = store.find((item) => item.id === playlistActiveId);
  if (!target) return;

  const previousName =
    target.name ||
    "Playlist";

  target.name =
    nextName;

  target.updatedAt =
    Date.now();

  savePlaylistsStore(
    store
  );

  queuePlaylistEvent(
    "playlist_rename",
    target,
    {
      status:
        "renamed",
      previousName,
    }
  );
  renderPlaylists();
}

async function deleteActivePlaylist() {
  const playlist = getPlaylistsStore().find((item) => item.id === playlistActiveId);
  if (!playlist) return;

  const ok = await confirmThemeAction(
    `Delete “${playlist.name}”?`,
    "Delete playlist",
    "Delete"
  );
  if (!ok) return;

  const next =
    getPlaylistsStore()
      .filter(
        (item) =>
          item.id !==
          playlistActiveId
      );

  savePlaylistsStore(
    next
  );

  queuePlaylistEvent(
    "playlist_delete",
    playlist,
    {
      status:
        "deleted",
    }
  );

  playlistActiveId =
    "";
  renderPlaylists();
}

function cyclePlaylistSort() {
  playlistSortMode = playlistSortMode === "recent"
    ? "name"
    : playlistSortMode === "name"
      ? "duration"
      : "recent";
  savePlaylistPrefs();
  closePlaylistMenus();
  renderPlaylists();
  showBookmarkToast(
    "Playlist sort",
    playlistSortMode === "recent"
      ? "Recently updated"
      : playlistSortMode === "name"
        ? "Alphabetical"
        : "Longest first"
  );
}

function togglePlaylistViewMode() {
  playlistViewMode = playlistViewMode === "grid" ? "list" : "grid";
  savePlaylistPrefs();
  updatePlaylistToggleLabel();
  closePlaylistMenus();
  renderPlaylists();
}

function getPlaylistCardMarkup(playlist, mode = "grid") {
  const coverTrack = getPlaylistCoverTrack(playlist);
  const total = getPlaylistDuration(playlist);
  const items = getPlaylistItemsResolved(playlist);
  const isGrid = mode === "grid";
  const selected = selectedPlaylistIds.has(playlist.id);

  const wrapper = document.createElement("button");
  wrapper.className = `${isGrid ? "playlistCard" : "playlistListRow"}${playlistSelectMode ? " is-selectable" : ""}${selected ? " is-selected" : ""}`;
  wrapper.type = "button";

  if (playlistSelectMode) {
    const tick = document.createElement("span");
    tick.className = "playlistSelectTick";
    tick.innerHTML = selected ? '<i class="fa-solid fa-check"></i>' : '<i class="fa-regular fa-circle"></i>';
    wrapper.appendChild(tick);
  }

  const cover = document.createElement("div");
  cover.className = isGrid ? "playlistCardCover" : "playlistListCover";
  applyArtwork(cover, coverTrack?.hasArtwork ? getArtworkUrl(coverTrack) : "");

  const name = document.createElement("div");
  name.className = isGrid ? "playlistCardTitle" : "playlistListTitle";
  name.textContent = playlist.name || "Untitled playlist";

  const meta = document.createElement("div");
  meta.className = isGrid ? "playlistCardMeta" : "playlistListMeta";
  meta.textContent = `${fmtLongDuration(total)} • ${items.length} tracks`;

  if (isGrid) {
    wrapper.appendChild(cover);
    wrapper.appendChild(name);
    wrapper.appendChild(meta);
  } else {
    const metaWrap = document.createElement("div");
    metaWrap.className = "playlistListInfo";
    metaWrap.appendChild(name);
    metaWrap.appendChild(meta);

    const more = document.createElement("button");
    more.className = "playlistListMore";
    more.type = "button";
    more.innerHTML = playlistSelectMode
      ? (selected ? '<i class="fa-solid fa-check"></i>' : '<i class="fa-regular fa-circle"></i>')
      : '<i class="fa-solid fa-ellipsis"></i>';
    more.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (playlistSelectMode) {
        togglePlaylistSelected(playlist.id);
        return;
      }

      openPlaylistDetail(playlist.id);
    });

    wrapper.appendChild(cover);
    wrapper.appendChild(metaWrap);
    wrapper.appendChild(more);
  }

  wrapper.addEventListener("click", () => {
    if (playlistSelectMode) {
      togglePlaylistSelected(playlist.id);
      return;
    }

    openPlaylistDetail(playlist.id);
  });

  return wrapper;
}

function renderPlaylistHome() {
  if (!playlistGridEl || !playlistListEl) return;

  const playlists = getFilteredSortedPlaylists();
  const visibleIds = new Set(playlists.map((playlist) => playlist.id));

  selectedPlaylistIds = new Set(Array.from(selectedPlaylistIds).filter((id) => visibleIds.has(id)));

  if (!playlists.length && playlistSelectMode) {
    playlistSelectMode = false;
    selectedPlaylistIds.clear();
  }

  playlistGridEl.innerHTML = "";
  playlistListEl.innerHTML = "";

  const isGrid = playlistViewMode === "grid";
  playlistGridEl.classList.toggle("hidden", !isGrid);
  playlistListEl.classList.toggle("hidden", isGrid);

  if (playlistEmptyStateEl) {
    playlistEmptyStateEl.classList.toggle("hidden", playlists.length > 0);
  }

  if (playlistSummaryText) {
    playlistSummaryText.textContent = playlistSelectMode
      ? `Select playlists (${selectedPlaylistIds.size}/${playlists.length})`
      : `Playlists (${playlists.length})`;
  }

  updatePlaylistToggleLabel();
  updatePlaylistSelectionBar();

  playlists.forEach((playlist) => {
    playlistGridEl.appendChild(getPlaylistCardMarkup(playlist, "grid"));
    playlistListEl.appendChild(getPlaylistCardMarkup(playlist, "list"));
  });
}

function removeTrackFromActivePlaylist(
  index
) {
  const store =
    getPlaylistsStore();

  const playlist =
    store.find(
      (item) =>
        item.id ===
        playlistActiveId
    );

  if (!playlist) return;

  const removedTrack =
    (
      playlist.items ||
      []
    )[index] ||
    null;

  playlist.items =
    (
      playlist.items ||
      []
    )
      .filter(
        (
          _,
          itemIndex
        ) =>
          itemIndex !==
          index
      );

  playlist.updatedAt =
    Date.now();

  savePlaylistsStore(
    store
  );

  if (
    removedTrack
  ) {
    queuePlaylistEvent(
      "playlist_track_remove",
      playlist,
      {
        status:
          "track_removed",
        removedTrackId:
          removedTrack.id ||
          removedTrack.trackKey ||
          "",
      }
    );
  }

  renderPlaylists();
}

function renderPlaylistDetail() {
  if (!playlistDetailPane || !playlistHomePane) return;

  const store = getPlaylistsStore();
  const playlist = store.find((item) => item.id === playlistActiveId);

  playlistHomePane.classList.toggle("hidden", !!playlist);
  playlistDetailPane.classList.toggle("hidden", !playlist);

  if (!playlist) return;

  const items = getPlaylistItemsResolved(playlist).filter((item) => {
    if (!playlistDetailSearchTerm) return true;
    return [item?.title, item?.artist, item?.album, item?.subtitle]
      .join(" ")
      .toLowerCase()
      .includes(normalisePlaylistSearch(playlistDetailSearchTerm));
  });

  if (playlistDetailTopTitle) playlistDetailTopTitle.textContent = playlist.name || "Playlist";
  if (playlistDetailName) playlistDetailName.textContent = playlist.name || "Playlist";
  if (playlistDetailStats) {
    playlistDetailStats.textContent = `${fmtLongDuration(getPlaylistDuration(playlist))} • ${(playlist.items || []).length} tracks`;
  }

  const coverTrack = getPlaylistCoverTrack(playlist);
  applyArtwork(playlistDetailCover, coverTrack?.hasArtwork ? getArtworkUrl(coverTrack) : "");

  if (!playlistDetailTracks) return;
  playlistDetailTracks.innerHTML = "";

  if (!items.length) {
    playlistDetailTracks.innerHTML = `
      <div class="track trackEmptyState">
        <div class="meta">
          <div class="title">No tracks in this playlist</div>
          <div class="sub">Add tracks from the library or import your current queue.</div>
        </div>
      </div>
    `;
    return;
  }

  items.forEach((item, index) => {
    const row = document.createElement("button");
    row.className = "playlistTrackRow";
    row.type = "button";

    const thumb = document.createElement("div");
    thumb.className = "playlistTrackThumb";
    applyArtwork(thumb, item.hasArtwork ? getArtworkUrl(item) : "");

    const meta = document.createElement("div");
    meta.className = "playlistTrackMeta";

    const title = document.createElement("div");
    title.className = "playlistTrackTitle";
    title.textContent = item.title || item.id || `Track ${index + 1}`;

    const sub = document.createElement("div");
    sub.className = "playlistTrackSub";
    sub.textContent = item.subtitle || item.artist || "Playlist track";

    meta.appendChild(title);
    meta.appendChild(sub);

    const more = document.createElement("button");
    more.className = "playlistTrackMore";
    more.type = "button";
    more.innerHTML = '<i class="fa-solid fa-ellipsis"></i>';
    more.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const ok = await confirmThemeAction(
        `Remove “${item.title || "this track"}” from ${playlist.name}?`,
        "Remove track",
        "Remove"
      );

      if (ok) removeTrackFromActivePlaylist(index);
    });

    row.appendChild(thumb);
    row.appendChild(meta);
    row.appendChild(more);
    row.addEventListener("click", (e) => {
      if (e.target.closest(".playlistTrackMore")) return;
      handleTrackCardPlayClick(e, item, { openPlayer: true, autoplay: true });
    });

    playlistDetailTracks.appendChild(row);
  });
}

function renderPlaylists() {
  renderPlaylistHome();
  renderPlaylistDetail();
}

if (btnPlaylistCreateMenu) btnPlaylistCreateMenu.addEventListener("click", (e) => {
  e.stopPropagation();
  togglePlaylistMenu(playlistCreateMenu);
});

if (btnPlaylistMoreMenu) btnPlaylistMoreMenu.addEventListener("click", (e) => {
  e.stopPropagation();
  togglePlaylistMenu(playlistMoreMenu);
});

if (btnPlaylistCreateNew) btnPlaylistCreateNew.addEventListener("click", async () => {
  closePlaylistMenus();
  const name = await promptForPlaylistName("New playlist");
  if (!name) return;
  const playlist = createPlaylistRecord(name, []);
  playlistActiveId = playlist.id;
  renderPlaylists();
});

if (btnPlaylistImport) btnPlaylistImport.addEventListener("click", () => {
  closePlaylistMenus();
  void importPlaylistFlow();
});

if (btnPlaylistMenuNew) btnPlaylistMenuNew.addEventListener("click", async () => {
  closePlaylistMenus();
  const name = await promptForPlaylistName("New playlist");
  if (!name) return;
  const playlist = createPlaylistRecord(name, []);
  playlistActiveId = playlist.id;
  renderPlaylists();
});

if (btnPlaylistMenuImport) btnPlaylistMenuImport.addEventListener("click", () => {
  closePlaylistMenus();
  void importPlaylistFlow();
});

if (btnPlaylistMenuSearch) btnPlaylistMenuSearch.addEventListener("click", () => {
  closePlaylistMenus();
  playlistSearchPanel?.classList.toggle("hidden");
  if (!playlistSearchPanel?.classList.contains("hidden")) {
    playlistSearchInput?.focus();
  }
});

if (btnPlaylistMenuSort) btnPlaylistMenuSort.addEventListener("click", cyclePlaylistSort);

if (btnPlaylistMenuToggleView) btnPlaylistMenuToggleView.addEventListener("click", togglePlaylistViewMode);

if (btnPlaylistMenuHelp) btnPlaylistMenuHelp.addEventListener("click", () => {
  closePlaylistMenus();
  showPlaylistHelpOverlay();
});

if (btnPlaylistSelectMode) btnPlaylistSelectMode.addEventListener("click", () => {
  closePlaylistMenus();
  setPlaylistSelectMode(!playlistSelectMode);
});

if (btnPlaylistSearchToggle) btnPlaylistSearchToggle.addEventListener("click", () => {
  playlistSearchPanel?.classList.toggle("hidden");
  if (!playlistSearchPanel?.classList.contains("hidden")) {
    playlistSearchInput?.focus();
  }
});

if (playlistSearchInput) playlistSearchInput.addEventListener("input", () => {
  playlistSearchTerm = playlistSearchInput.value || "";
  renderPlaylists();
});

if (btnPlaylistPlayAll) btnPlaylistPlayAll.addEventListener("click", () => {
  const allTracks = getFilteredSortedPlaylists().flatMap((playlist) => getPlaylistItemsResolved(playlist));
  queueTrackCollection(allTracks, { shuffle: false });
});

if (btnPlaylistShuffleAll) btnPlaylistShuffleAll.addEventListener("click", () => {
  const allTracks = getFilteredSortedPlaylists().flatMap((playlist) => getPlaylistItemsResolved(playlist));
  queueTrackCollection(allTracks, { shuffle: true });
});

if (btnPlaylistBack) btnPlaylistBack.addEventListener("click", closePlaylistDetail);

if (btnPlaylistDetailMenuToggle) btnPlaylistDetailMenuToggle.addEventListener("click", (e) => {
  e.stopPropagation();
  togglePlaylistMenu(playlistDetailMenu);
});

if (btnPlaylistDetailRename) btnPlaylistDetailRename.addEventListener("click", () => {
  closePlaylistMenus();
  renameActivePlaylist();
});

if (btnPlaylistDetailDelete) btnPlaylistDetailDelete.addEventListener("click", () => {
  closePlaylistMenus();
  deleteActivePlaylist();
});

if (btnPlaylistDetailSearchToggle) btnPlaylistDetailSearchToggle.addEventListener("click", () => {
  closePlaylistMenus();
  playlistDetailSearchPanel?.classList.toggle("hidden");
  if (!playlistDetailSearchPanel?.classList.contains("hidden")) {
    playlistDetailSearchInput?.focus();
  }
});

if (btnPlaylistDetailSort) btnPlaylistDetailSort.addEventListener("click", () => {
  closePlaylistMenus();
  const store = getPlaylistsStore();
  const playlist = store.find((item) => item.id === playlistActiveId);
  if (!playlist) return;
  playlist.items = [...(playlist.items || [])].sort((a, b) => normaliseText(a?.title).localeCompare(normaliseText(b?.title)));
  playlist.updatedAt = Date.now();
  savePlaylistsStore(store);
  renderPlaylists();
});

if (btnPlaylistDetailSearch) btnPlaylistDetailSearch.addEventListener("click", () => {
  playlistDetailSearchPanel?.classList.toggle("hidden");
  if (!playlistDetailSearchPanel?.classList.contains("hidden")) {
    playlistDetailSearchInput?.focus();
  }
});

if (playlistDetailSearchInput) playlistDetailSearchInput.addEventListener("input", () => {
  playlistDetailSearchTerm = playlistDetailSearchInput.value || "";
  renderPlaylists();
});

if (btnPlaylistDetailPlay) btnPlaylistDetailPlay.addEventListener("click", () => {
  const playlist = getPlaylistsStore().find((item) => item.id === playlistActiveId);
  if (!playlist) return;
  queueTrackCollection(getPlaylistItemsResolved(playlist), { shuffle: false });
});

if (btnPlaylistDetailShuffle) btnPlaylistDetailShuffle.addEventListener("click", () => {
  const playlist = getPlaylistsStore().find((item) => item.id === playlistActiveId);
  if (!playlist) return;
  queueTrackCollection(getPlaylistItemsResolved(playlist), { shuffle: true });
});

if (views.Playlists) {
  views.Playlists.addEventListener("click", (e) => {
    if (e.target.closest(".playlistPopover") || e.target.closest(".playlistHeaderBtn")) return;
    closePlaylistMenus();
  });
}

/* favourites */
function getFavouritesStore() {
  const store = readPersistedJson(FAVOURITES_KEY, {});
  return store && typeof store === "object" ? store : {};
}

function saveFavouritesStore(store) {
  writePersistedJson(FAVOURITES_KEY, store || {});
}

function getFavouriteEntries() {
  const store = getFavouritesStore();

  return Object.entries(store)
    .map(([key, value]) => ({
      ...(value || {}),
      favKey: (value && typeof value === "object" && value.favKey) ? value.favKey : key,
    }))
    .filter(Boolean)
    .sort((a, b) => Number(b.addedAt || 0) - Number(a.addedAt || 0));
}

function isFavouriteTrack(trackOrId) {
  const store = getFavouritesStore();

  if (trackOrId && typeof trackOrId === "object") {
    const favKey = getFavouriteKey(trackOrId);
    if (favKey && store[favKey]) return true;
    if (trackOrId.id && store[trackOrId.id]) return true;
    return false;
  }

  const key = String(trackOrId || "");
  if (!key) return false;
  return !!store[key];
}

function getFavouriteButtonMarkup(active) {
  return active
    ? `<i class="fa-solid fa-heart"></i>`
    : `<i class="fa-regular fa-heart"></i>`;
}

function buildFavouriteSnapshot(track) {
  const favKey = getFavouriteKey(track);

  return {
    favKey,
    id: track.id || "",
    title: track.title || track.id || "Unknown track",
    artist: track.artist || "",
    album: track.album || "",
    albumArtist: track.albumArtist || "",
    subtitle: track.subtitle || "",
    locator: track.locator || "",
    file: track.file || "",
    filename: track.filename || "",
    path: track.path || "",
    hasArtwork: !!track.hasArtwork,
    duration: Number.isFinite(track.duration) ? track.duration : 0,
    mixBadge: track.mixBadge || "br",
    searchText: track.searchText || "",
    addedAt: Date.now(),
  };
}

function toggleFavouriteTrack(track, options = {}) {
  if (!track) return;

  const favKey = getFavouriteKey(track);
  if (!favKey) return;

  const store = getFavouritesStore();
  const wasFavourite = !!store[favKey] || (!!track.id && !!store[track.id]);

  delete store[favKey];
  if (track.id && track.id !== favKey) delete store[track.id];

  if (!wasFavourite) {
    store[favKey] = buildFavouriteSnapshot(track);
  }

  saveFavouritesStore(store);

  queuePlayerEvent(
    wasFavourite
      ? "favourite_remove"
      : "favourite_add",
    track,
    {
      flushNow: true,
    }
  );

  updateFavouriteQuickButton();
  renderLibrary();
  renderLists();
  renderFavourites();
  renderRecents();
  renderPlaylists();

  if (!wasFavourite && options.openTab) {
    setTab("Favourites");
  }
}

function updateFavouriteQuickButton() {
  if (!btnFavQuick || !btnFavQuickIcon) return;

  const track = currentTrack();
  const active = isFavouriteTrack(track);

  btnFavQuick.classList.toggle("active", active);
  setBrFaIconClass(btnFavQuickIcon, active ? "fa-solid fa-heart" : "fa-regular fa-heart");
}

function normaliseFavouriteMatchText(value) {
  return normaliseText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findLibraryTrackForFavourite(entry) {
  if (!entry || !library.length) return null;

  const favKey = String(entry.favKey || "");
  const entryId = String(entry.id || "");
  const entryLocator = String(entry.locator || "");
  const entryPath = String(entry.path || "");
  const entryFile = String(entry.file || "");
  const entryFilename = String(entry.filename || "");

  const entryTitleKey = normaliseFavouriteMatchText(entry.title || "");
  const entryArtistKey = normaliseFavouriteMatchText(entry.artist || "");
  const entryAlbumKey = normaliseFavouriteMatchText(entry.album || entry.albumArtist || "");

  return library.find((item) => {
    const itemFavKey = getFavouriteKey(item);
    const itemId = String(item.id || "");
    const itemLocator = String(item.locator || "");
    const itemPath = String(item.path || "");
    const itemFile = String(item.file || "");
    const itemFilename = String(item.filename || "");

    if (favKey && itemFavKey === favKey) return true;
    if (entryId && itemId === entryId) return true;
    if (entryLocator && itemLocator === entryLocator) return true;
    if (entryPath && itemPath === entryPath) return true;
    if (entryFile && itemFile === entryFile) return true;
    if (entryFilename && itemFilename === entryFilename) return true;

    const itemTitleKey = normaliseFavouriteMatchText(item.title || "");
    const itemArtistKey = normaliseFavouriteMatchText(item.artist || "");
    const itemAlbumKey = normaliseFavouriteMatchText(item.album || item.albumArtist || "");

    if (entryTitleKey && entryArtistKey && itemTitleKey === entryTitleKey && itemArtistKey === entryArtistKey) {
      return true;
    }

    if (entryTitleKey && entryAlbumKey && itemTitleKey === entryTitleKey && itemAlbumKey === entryAlbumKey) {
      return true;
    }

    return false;
  }) || null;
}

function reconcileFavouritesWithLibrary() {
  const store = getFavouritesStore();
  const entries = Object.values(store || {});
  if (!entries.length || !library.length) return;

  const nextStore = {};
  let changed = false;

  entries.forEach((entry, index) => {
    if (!entry || typeof entry !== "object") return;

    const matchedTrack = findLibraryTrackForFavourite(entry);
    const snapshot = matchedTrack ? buildFavouriteSnapshot(matchedTrack) : entry;

    const favKey =
      snapshot.favKey ||
      entry.favKey ||
      entry.id ||
      `fav-${index}`;

    const merged = {
      ...entry,
      ...snapshot,
      favKey,
      addedAt: entry.addedAt || snapshot.addedAt || Date.now(),
    };

    nextStore[favKey] = merged;

    if (JSON.stringify(store[favKey] || {}) !== JSON.stringify(merged)) {
      changed = true;
    }
  });

  if (changed || Object.keys(nextStore).length !== Object.keys(store).length) {
    saveFavouritesStore(nextStore);
  }
}

function renderFavourites() {
  if (!favouritesListEl) return;

  favouritesListEl.innerHTML = "";

  const entries = getFavouriteEntries();
  if (!entries.length) {
    favouritesListEl.innerHTML = `
      <div class="track trackEmptyState">
        <div class="meta">
          <div class="title">No favourites yet</div>
          <div class="sub">Tap “Add to favourites” on a mix and it will appear here.</div>
        </div>
      </div>
    `;
    return;
  }

  const current = currentTrack();
  const isActuallyPlaying = !!audio && !audio.paused;

  entries.forEach((entry) => {
const libraryTrack = findLibraryTrackForFavourite(entry);
    const item = libraryTrack || entry;
    const isCurrent = !!current && current.id === item.id;

    const row = document.createElement("div");
    row.className = `track${isCurrent ? " is-current" : ""}`;

    const thumb = document.createElement("div");
    thumb.className = "thumb";
    applyArtwork(thumb, item.hasArtwork ? getArtworkUrl(item) : "");

    const meta = document.createElement("div");
    meta.className = "meta";

    const title = document.createElement("div");
    title.className = "title";
    title.textContent = item.title || item.id;

    const sub = document.createElement("div");
    sub.className = "sub";
    sub.textContent = isCurrent && isActuallyPlaying
      ? "Now playing"
      : (item.subtitle || item.artist || "Favourite mix");

    meta.appendChild(title);
    meta.appendChild(sub);

    const actions = document.createElement("div");
    actions.className = "actions";

    const playBtn = document.createElement("button");
    if (isCurrent && isActuallyPlaying) {
      playBtn.className = "pill primary playing";
      playBtn.innerHTML = `<i class="fa-solid fa-pause"></i><span>Playing</span>`;
      playBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleCurrentPlayback();
      });
    } else {
      playBtn.className = "pill primary";
      playBtn.innerHTML = `<i class="fa-solid fa-play"></i><span>${isCurrent ? "Resume" : "Play"}</span>`;
            playBtn.addEventListener("click", (e) => {
        if (isCurrent) {
          e.preventDefault();
          e.stopPropagation();
          toggleCurrentPlayback();
          return;
        }

        handleTrackCardPlayClick(e, item, {
          openPlayer: true,
          autoplay: true,
        });
      });
    }

    const favBtn = document.createElement("button");
    const favActive = isFavouriteTrack(item);
    favBtn.className = `pill favPill${favActive ? " active" : ""}`;
    favBtn.innerHTML = getFavouriteButtonMarkup(favActive);
    favBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavouriteTrack(item, { openTab: true });
    });

    actions.appendChild(playBtn);
    actions.appendChild(favBtn);

    row.appendChild(thumb);
    row.appendChild(meta);
    row.appendChild(actions);

	row.addEventListener("click", (e) => {
  if (e.target.closest(".actions")) return;
  if (isCurrent) openNowPlaying();
  else previewTrack(item, { openPlayer: true });
});

favouritesListEl.appendChild(row);
  });

  refreshDynamicIconArea(favouritesListEl);
}

function getRecentsStore() {
  const items = readPersistedJson(RECENTS_KEY, []);
  return Array.isArray(items) ? items : [];
}

function saveRecentsStore(items) {
  writePersistedJson(RECENTS_KEY, Array.isArray(items) ? items : []);
}

function buildRecentSnapshot(track) {
  return {
    id: track.id || "",
    title: track.title || track.id || "Unknown track",
    artist: track.artist || "",
    album: track.album || "",
    albumArtist: track.albumArtist || "",
    subtitle: track.subtitle || "",
    locator: track.locator || "",
    file: track.file || "",
    filename: track.filename || "",
    path: track.path || "",
    hasArtwork: !!track.hasArtwork,
    duration: Number.isFinite(track.duration) ? track.duration : 0,
    mixBadge: track.mixBadge || "br",
    searchText: track.searchText || "",
    recentAt: Date.now(),
  };
}

function getRecentEntries() {
  return getRecentsStore()
    .filter(Boolean)
    .sort((a, b) => Number(b.recentAt || 0) - Number(a.recentAt || 0));
}

function markTrackAsRecent(track) {
  if (!track) return;

  const snapshot = buildRecentSnapshot(track);
  const recentKey = String(getStableTrackKey(track) || track.id || track.title || "").trim();
  if (!recentKey) return;

  const next = getRecentsStore().filter((entry) => {
    const entryKey = String(getStableTrackKey(entry) || entry.id || entry.title || "").trim();
    return entryKey && entryKey !== recentKey;
  });

  next.unshift(snapshot);
  saveRecentsStore(next.slice(0, 50));
  renderRecents();
}

function renderRecents() {
  if (!recentsListEl) return;

  recentsListEl.innerHTML = "";

  const entries = getRecentEntries();
  if (!entries.length) {
    recentsListEl.innerHTML = `
      <div class="track trackEmptyState">
        <div class="meta">
          <div class="title">No recent mixes yet</div>
          <div class="sub">Recently opened or played mixes will appear here.</div>
        </div>
      </div>
    `;
    return;
  }

  const current = currentTrack();
  const isActuallyPlaying = !!audio && !audio.paused;

  entries.forEach((entry) => {
    const libraryTrack = findLibraryTrackForFavourite(entry);
    const item = libraryTrack || entry;
    const isCurrent = !!current && current.id === item.id;

    const row = document.createElement("div");
    row.className = `track${isCurrent ? " is-current" : ""}`;

    const thumb = document.createElement("div");
    thumb.className = "thumb";
    applyArtwork(thumb, item.hasArtwork ? getArtworkUrl(item) : "");

    const meta = document.createElement("div");
    meta.className = "meta";

    const title = document.createElement("div");
    title.className = "title";
    title.textContent = item.title || item.id;

    const sub = document.createElement("div");
    sub.className = "sub";
    sub.textContent = isCurrent && isActuallyPlaying
      ? "Now playing"
      : (item.subtitle || item.artist || "Recent mix");

    meta.appendChild(title);
    meta.appendChild(sub);

    const actions = document.createElement("div");
    actions.className = "actions";

    const playBtn = document.createElement("button");
    if (isCurrent && isActuallyPlaying) {
      playBtn.className = "pill primary playing";
      playBtn.innerHTML = `<i class="fa-solid fa-pause"></i><span>Pause</span>`;
      playBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleCurrentPlayback();
      });
    } else {
      playBtn.className = "pill primary";
      playBtn.innerHTML = `<i class="fa-solid fa-play"></i><span>${isCurrent ? "Play" : "Play"}</span>`;
      playBtn.addEventListener("click", (e) => {
        if (isCurrent) {
          e.preventDefault();
          e.stopPropagation();
          toggleCurrentPlayback();
          return;
        }

        handleTrackCardPlayClick(e, item, {
          openPlayer: true,
          autoplay: true,
        });
      });
    }

    const favBtn = document.createElement("button");
    const favActive = isFavouriteTrack(item);
    favBtn.className = `pill favPill${favActive ? " active" : ""}`;
    favBtn.innerHTML = getFavouriteButtonMarkup(favActive);
    favBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavouriteTrack(item);
      renderRecents();
    });

    actions.appendChild(playBtn);
    actions.appendChild(favBtn);

    row.appendChild(thumb);
    row.appendChild(meta);
    row.appendChild(actions);

    row.addEventListener("click", (e) => {
      if (e.target.closest(".actions")) return;
      if (isCurrent) openNowPlaying();
      else previewTrack(item, { openPlayer: true });
    });

    recentsListEl.appendChild(row);
  });

  refreshDynamicIconArea(recentsListEl);
}

/* bookmarks */
function getBookmarksStore() {
  try {
    return JSON.parse(localStorage.getItem("brmedia_bookmarks") || "{}");
  } catch {
    return {};
  }
}

function saveBookmarksStore(store) {
  localStorage.setItem("brmedia_bookmarks", JSON.stringify(store));
}

function getBookmarkPrefsStore() {
  try {
    return JSON.parse(localStorage.getItem("brmedia_bookmark_prefs") || "{}");
  } catch {
    return {};
  }
}

function saveBookmarkPrefsStore(store) {
  localStorage.setItem("brmedia_bookmark_prefs", JSON.stringify(store));
}

function getBookmarkPrefs(trackKey) {
  const store = getBookmarkPrefsStore();
  return store[trackKey] || { order: [], sortMode: "manual" };
}

function setBookmarkPrefs(trackKey, prefs) {
  const store = getBookmarkPrefsStore();
  store[trackKey] = {
    order: Array.isArray(prefs.order) ? prefs.order : [],
    sortMode: prefs.sortMode || "manual",
  };
  saveBookmarkPrefsStore(store);
}

function getBookmarksForTrack(trackKey) {
  if (!trackKey) return [];
  const store = getBookmarksStore();
  const list = Array.isArray(store[trackKey]) ? store[trackKey] : [];
  return applyBookmarkSort(trackKey, list.slice());
}

function getAllBookmarkGroups() {
  const store = getBookmarksStore();
  const grouped = new Map();

  Object.entries(store).forEach(([trackKey, items]) => {
    const list = Array.isArray(items) ? items : [];
    list.forEach((item) => {
      const merged = { ...item, trackKey: item.trackKey || trackKey };
      const groupKey = getBookmarkGroupKeyFromItem(merged);
      const title = getBookmarkGroupTitleFromItem(merged);

      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, {
          groupKey,
          title,
          trackKeys: new Set(),
          items: [],
        });
      }

      const entry = grouped.get(groupKey);
      entry.items.push(merged);
      entry.trackKeys.add(merged.trackKey || trackKey);
    });
  });

  return Array.from(grouped.values())
    .map((entry) => ({
      groupKey: entry.groupKey,
      title: entry.title,
      trackKeys: Array.from(entry.trackKeys),
      items: entry.items.sort((a, b) => {
        if ((a.time || 0) !== (b.time || 0)) return (a.time || 0) - (b.time || 0);
        return (a.createdAt || 0) - (b.createdAt || 0);
      }),
    }))
    .filter((entry) => entry.items.length > 0)
    .sort((a, b) => {
      const aTime = Math.max(...a.items.map((item) => item.createdAt || 0));
      const bTime = Math.max(...b.items.map((item) => item.createdAt || 0));
      return bTime - aTime;
    });
}

function applyBookmarkSort(trackKey, items) {
  const prefs = getBookmarkPrefs(trackKey);
  const mode = prefs.sortMode || "manual";

  if (mode === "newest") {
    return items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  if (mode === "oldest") {
    return items.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  }

  const order = Array.isArray(prefs.order) ? prefs.order : [];
  const orderIndex = new Map(order.map((id, idx) => [id, idx]));

  const ordered = items.slice().sort((a, b) => {
    const ai = orderIndex.has(a.id) ? orderIndex.get(a.id) : Number.MAX_SAFE_INTEGER;
    const bi = orderIndex.has(b.id) ? orderIndex.get(b.id) : Number.MAX_SAFE_INTEGER;
    if (ai !== bi) return ai - bi;
    return (a.createdAt || 0) - (b.createdAt || 0);
  });

  const nextOrder = ordered.map((item) => item.id);
  if (JSON.stringify(order) !== JSON.stringify(nextOrder)) {
    setBookmarkPrefs(trackKey, { order: nextOrder, sortMode: "manual" });
  }

  return ordered;
}

function setBookmarkSortModeForTrack(trackKey, mode) {
  if (!trackKey) return;
  const store = getBookmarksStore();
  const current = Array.isArray(store[trackKey]) ? store[trackKey] : [];
  const order = current.map((item) => item.id);
  setBookmarkPrefs(trackKey, { order, sortMode: mode });
}

function currentTrackKey() {
  return getStableTrackKey(currentTrack());
}

function normaliseBookmarkGroupValue(value) {
  return normaliseText(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function getBookmarkGroupTitleFromItem(item) {
  return normaliseText(item?.title || item?.trackTitle || item?.label || item?.trackKey, "Unknown track");
}

function getBookmarkGroupKeyFromItem(item) {
  return normaliseBookmarkGroupValue(getBookmarkGroupTitleFromItem(item)) || normaliseBookmarkGroupValue(item?.trackKey || "unknown-track");
}

function parseTimeInputToSeconds(raw) {
  const input = normaliseText(raw);
  if (!input) return null;

  const cleaned = input.replace(/[^0-9:]/g, "");
  if (!cleaned) return null;

  const parts = cleaned.split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part) || part < 0)) return null;

  if (parts.length === 1) return Math.floor(parts[0]);
  if (parts.length === 2) return (Math.floor(parts[0]) * 60) + Math.floor(parts[1]);
  if (parts.length === 3) return (Math.floor(parts[0]) * 3600) + (Math.floor(parts[1]) * 60) + Math.floor(parts[2]);
  return null;
}

function getBookmarksForSelectedGroup() {
  const groupKey = bookmarkSelectedGroupKey;
  if (!groupKey) return [];

  const store = getBookmarksStore();
  const combined = [];

  Object.entries(store).forEach(([trackKey, items]) => {
    const list = Array.isArray(items) ? items : [];
    list.forEach((item) => {
      const merged = { ...item, trackKey: item.trackKey || trackKey };
      if (getBookmarkGroupKeyFromItem(merged) === groupKey) combined.push(merged);
    });
  });

  return combined.sort((a, b) => {
    if ((a.time || 0) !== (b.time || 0)) return (a.time || 0) - (b.time || 0);
    return (a.createdAt || 0) - (b.createdAt || 0);
  });
}

function addBookmarkForCurrentTrack() {
  const track = currentTrack();
  if (!track || !audio) return null;

  const trackKey = getStableTrackKey(track);
  if (!trackKey) return null;

  const store = getBookmarksStore();
  const list = Array.isArray(store[trackKey]) ? store[trackKey] : [];
  const time = Math.max(0, Math.floor(audio.currentTime || 0));

  const timedTrack = getCurrentTimedTrack();
  const baseTitle = settings.bookmarkAutoName && timedTrack?.title
    ? timedTrack.title
    : (track.title || track.id || trackKey);

  const bookmark = {
    id: `${trackKey}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    trackKey,
    trackId: track.id || trackKey,
    title: baseTitle,
    trackTitle: track.title || track.id || trackKey,
    label: `${fmtTime(time)} • ${baseTitle}`,
    time,
    note: settings.bookmarkSaveNotes ? "" : undefined,
    createdAt: Date.now(),
  };

  list.push(bookmark);
  store[trackKey] = list;
  saveBookmarksStore(store);

  const prefs = getBookmarkPrefs(trackKey);
  const nextOrder = Array.isArray(prefs.order) ? prefs.order.slice() : [];
  nextOrder.push(bookmark.id);
  setBookmarkPrefs(trackKey, {
    order: nextOrder,
    sortMode: prefs.sortMode || "manual",
  });

  renderBookmarks();

  queuePlayerEvent(
    "bookmark_add",
    track,
    {
      position:
        time,
      status:
        "added",
      bookmarkId:
        bookmark.id,
    }
  );

  showBookmarkToast(
    "Bookmark added",
    `Saved at ${fmtTime(time)}`
  );

  return bookmark;
}

function deleteBookmark(
  trackKey,
  bookmarkId
) {
  const store =
    getBookmarksStore();

  const list =
    Array.isArray(
      store[trackKey]
    )
      ? store[trackKey]
      : [];

  const removed =
    list.find(
      (item) =>
        item.id ===
        bookmarkId
    ) ||
    null;

  store[trackKey] =
    list.filter(
      (item) =>
        item.id !==
        bookmarkId
    );

  saveBookmarksStore(
    store
  );

  const prefs =
    getBookmarkPrefs(
      trackKey
    );

  setBookmarkPrefs(
    trackKey,
    {
      order:
        (
          prefs.order ||
          []
        )
          .filter(
            (id) =>
              id !==
              bookmarkId
          ),
      sortMode:
        prefs.sortMode ||
        "manual",
    }
  );

  renderBookmarks();

  if (
    removed
  ) {
    queuePlayerEvent(
      "bookmark_remove",
      {
        id:
          removed.trackId ||
          trackKey,
        title:
          removed.trackTitle ||
          removed.title ||
          trackKey,
        source:
          "player",
      },
      {
        position:
          removed.time ||
          0,
        status:
          "removed",
        bookmarkId,
      }
    );
  }
}

function closeBookmarkEditOverlay() {
  editingBookmarkTrackKey = "";
  editingBookmarkId = "";
  if (bookmarkEditOverlay) bookmarkEditOverlay.classList.add("hidden");
}

function openBookmarkEditOverlay(trackKey, bookmarkId) {
  const store = getBookmarksStore();
  const list = Array.isArray(store[trackKey]) ? store[trackKey] : [];
  const item = list.find((b) => b.id === bookmarkId);
  if (!item || !bookmarkEditOverlay || !bookmarkEditTime || !bookmarkEditName) return;

  editingBookmarkTrackKey = trackKey;
  editingBookmarkId = bookmarkId;

  bookmarkEditTime.value = fmtTime(item.time || 0);
  bookmarkEditName.value = item.label || `${fmtTime(item.time || 0)} • ${item.title || trackKey}`;

  bookmarkEditOverlay.classList.remove("hidden");
  setTimeout(() => bookmarkEditTime.focus(), 10);
}

function saveBookmarkEditOverlay() {
  if (!editingBookmarkTrackKey || !editingBookmarkId) return;

  const store = getBookmarksStore();
  const list = Array.isArray(store[editingBookmarkTrackKey]) ? store[editingBookmarkTrackKey] : [];
  const item = list.find((b) => b.id === editingBookmarkId);
  if (!item) return;

  const parsed = parseTimeInputToSeconds(bookmarkEditTime?.value || "");
  if (parsed === null) {
    window.alert("Enter a valid time like 1:23 or 01:02:03");
    return;
  }

  item.time = Math.max(0, parsed);
  item.label = (bookmarkEditName?.value || "").trim() || `${fmtTime(item.time || 0)} • ${item.title || editingBookmarkTrackKey}`;

  saveBookmarksStore(store);
  closeBookmarkEditOverlay();
  renderBookmarks();
}

function deleteAllBookmarksForTrack(trackKey) {
  if (!trackKey) return;

  const groups = getAllBookmarkGroups();
  const groupMatch = groups.find((entry) => entry.groupKey === trackKey);
  if (groupMatch) {
    groupMatch.trackKeys.forEach((key) => deleteAllBookmarksForTrack(key));
    return;
  }

  const store =
    getBookmarksStore();

  const removedCount =
    Array.isArray(
      store[trackKey]
    )
      ? store[trackKey]
          .length
      : 0;

  delete store[trackKey];

  saveBookmarksStore(
    store
  );

  if (
    removedCount
  ) {
    queuePlayerEvent(
      "bookmark_clear",
      {
        id:
          trackKey,
        title:
          trackKey,
        source:
          "player",
      },
      {
        count:
          removedCount,
        status:
          "track_clear",
      }
    );
  }

  const prefsStore = getBookmarkPrefsStore();
  delete prefsStore[trackKey];
  saveBookmarkPrefsStore(prefsStore);

  if (bookmarkSelectedTrackKey === trackKey) {
    bookmarkSelectedTrackKey = "";
    bookmarkAllMode = "groups";
  }

  renderBookmarks();
}

function deleteAllBookmarksEverywhere() {
  const removedCount =
    Object.values(
      getBookmarksStore()
    )
      .reduce(
        (
          total,
          items
        ) =>
          total +
          (
            Array.isArray(
              items
            )
              ? items.length
              : 0
          ),
        0
      );

  localStorage.removeItem(
    "brmedia_bookmarks"
  );

  localStorage.removeItem(
    "brmedia_bookmark_prefs"
  );

  if (
    removedCount
  ) {
    queuePlayerEvent(
      "bookmark_clear",
      {
        id:
          "all_bookmarks",
        title:
          "All bookmarks",
        source:
          "player",
      },
      {
        count:
          removedCount,
        status:
          "global_clear",
      }
    );
  }

  bookmarkSelectedTrackKey =
    "";

  bookmarkAllMode =
    "groups";

  renderBookmarks();
}

function jumpToBookmark(trackKey, time) {
  const current = currentTrack();

  if (current && getStableTrackKey(current) === trackKey && audio) {
    audio.currentTime = Math.max(0, Number(time || 0));
    audio.play().catch(() => {});
    closeAllTopPopups();
    updateWaveProgress();
    return;
  }

  const match = library.find((item) => getStableTrackKey(item) === trackKey) ||
    queue.find((item) => getStableTrackKey(item) === trackKey);

  if (!match || !audio) return;

  queue = [match];
  queueIndex = 0;
  playCurrent();

  const applyJump = () => {
    audio.currentTime = Math.max(0, Number(time || 0));
    audio.play().catch(() => {});
    audio.removeEventListener("loadedmetadata", applyJump);
  };

  audio.addEventListener("loadedmetadata", applyJump);
  closeAllTopPopups();
}

function saveManualBookmarkOrder(trackKey, orderedIds) {
  setBookmarkPrefs(trackKey, { order: orderedIds, sortMode: "manual" });
  bookmarkSortMode = "manual";
}

function moveBookmarkBefore(trackKey, dragId, targetId) {
  if (!trackKey || !dragId || !targetId || dragId === targetId) return;

  const store = getBookmarksStore();
  const list = Array.isArray(store[trackKey]) ? store[trackKey].slice() : [];
  const dragged = list.find((item) => item.id === dragId);
  const target = list.find((item) => item.id === targetId);
  if (!dragged || !target) return;

  const remaining = list.filter((item) => item.id !== dragId);
  const targetIndex = remaining.findIndex((item) => item.id === targetId);
  remaining.splice(targetIndex, 0, dragged);
  store[trackKey] = remaining;
  saveBookmarksStore(store);
  saveManualBookmarkOrder(trackKey, remaining.map((item) => item.id));
  renderBookmarks();
}

function showBookmarkToast(title, sub) {
  if (!bookmarkToast) return;

  if (bookmarkToastTitle) bookmarkToastTitle.textContent = title || "Updated";
  if (bookmarkToastSub) bookmarkToastSub.textContent = sub || "";

  bookmarkToast.classList.remove("hidden");

  if (bookmarkToastTimer) clearTimeout(bookmarkToastTimer);
  bookmarkToastTimer = setTimeout(() => {
    hideBookmarkToast();
  }, 3000);
}

function hideBookmarkToast() {
  if (!bookmarkToast) return;
  bookmarkToast.classList.add("hidden");
  if (bookmarkToastTimer) clearTimeout(bookmarkToastTimer);
  bookmarkToastTimer = null;
}

function renderBookmarks() {
  if (!bookmarkList) return;

  bookmarkList.innerHTML = "";

  if (bookmarkSubHeader) bookmarkSubHeader.classList.add("hidden");
  if (bookmarkSubTitle) bookmarkSubTitle.textContent = "";

  if (bookmarkTab === "all" && bookmarkAllMode === "groups") {
    const groups = getAllBookmarkGroups();

    if (!groups.length) {
      const empty = document.createElement("div");
      empty.className = "bookmarkItem";
      empty.innerHTML = `
        <div class="bookmarkMeta">
          <div class="bookmarkTime">No bookmarked songs yet</div>
          <div class="bookmarkLabel">Bookmarks from all songs will appear here.</div>
        </div>
      `;
      bookmarkList.appendChild(empty);
      return;
    }

    groups.forEach((entry) => {
      const songBtn = document.createElement("button");
      songBtn.className = "bookmarkSongGroup";

      const title = document.createElement("div");
      title.className = "bookmarkSongTitle";
      title.textContent = entry.title;

      const meta = document.createElement("div");
      meta.className = "bookmarkSongMeta";
      meta.textContent = `${entry.items.length} bookmark${entry.items.length === 1 ? "" : "s"}`;

      songBtn.appendChild(title);
      songBtn.appendChild(meta);

      songBtn.addEventListener("click", () => {
        bookmarkAllMode = "song";
        bookmarkSelectedTrackKey = entry.trackKeys[0] || "";
        bookmarkSelectedGroupKey = entry.groupKey;
        bookmarkSortMode = "oldest";
        renderBookmarks();
      });

      bookmarkList.appendChild(songBtn);
    });

    return;
  }

  let trackKey = "";
  let items = [];

  if (bookmarkTab === "current") {
    trackKey = currentTrackKey();
    items = getBookmarksForTrack(trackKey);
    bookmarkSortMode = getBookmarkPrefs(trackKey).sortMode || "manual";
  } else if (bookmarkTab === "all" && bookmarkAllMode === "song") {
    trackKey = bookmarkSelectedTrackKey;
    items = getBookmarksForSelectedGroup();
    bookmarkSortMode = "oldest";

    if (bookmarkSubHeader) bookmarkSubHeader.classList.remove("hidden");
    const first = items[0];
    if (bookmarkSubTitle) bookmarkSubTitle.textContent = first ? getBookmarkGroupTitleFromItem(first) : "";
  }

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "bookmarkItem";
    empty.innerHTML = `
      <div class="bookmarkMeta">
        <div class="bookmarkTime">No bookmarks yet</div>
        <div class="bookmarkLabel">Add a bookmark at the current playback position.</div>
      </div>
    `;
    bookmarkList.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    const itemTrackKey = item.trackKey || trackKey;
    const row = document.createElement("div");
    row.className = `bookmarkItem${bookmarkSortMode === "manual" && bookmarkTab === "current" ? " manualSort" : ""}`;
    row.dataset.bookmarkId = item.id;
    row.dataset.trackKey = itemTrackKey;

    if (bookmarkSortMode === "manual" && bookmarkTab === "current") {
      const dragHandle = document.createElement("button");
      dragHandle.className = "bookmarkDragHandle";
      dragHandle.setAttribute("aria-label", "Drag bookmark to reorder");
      dragHandle.innerHTML = `<i class="fa-solid fa-grip-vertical"></i>`;
      dragHandle.draggable = true;

      dragHandle.addEventListener("dragstart", () => {
        dragBookmarkId = item.id;
        dragBookmarkTrackKey = itemTrackKey;
        row.classList.add("dragging");
      });

      dragHandle.addEventListener("dragend", () => {
        dragBookmarkId = "";
        dragBookmarkTrackKey = "";
        row.classList.remove("dragging");
        bookmarkList.querySelectorAll(".bookmarkDropTarget").forEach((el) => el.classList.remove("bookmarkDropTarget"));
      });

      row.addEventListener("dragover", (e) => {
        if (!dragBookmarkId || dragBookmarkTrackKey !== itemTrackKey || dragBookmarkId === item.id) return;
        e.preventDefault();
        row.classList.add("bookmarkDropTarget");
      });

      row.addEventListener("dragleave", () => {
        row.classList.remove("bookmarkDropTarget");
      });

      row.addEventListener("drop", (e) => {
        e.preventDefault();
        row.classList.remove("bookmarkDropTarget");
        if (!dragBookmarkId || dragBookmarkTrackKey !== itemTrackKey || dragBookmarkId === item.id) return;
        moveBookmarkBefore(itemTrackKey, dragBookmarkId, item.id);
      });

      row.appendChild(dragHandle);
    }

    const meta = document.createElement("div");
    meta.className = "bookmarkMeta";

    const time = document.createElement("div");
    time.className = "bookmarkTime";
    time.textContent = fmtTime(item.time || 0);

    const label = document.createElement("div");
    label.className = "bookmarkLabel";
    label.textContent = item.label || item.title || item.trackKey;
    label.title = label.textContent;

    meta.appendChild(time);
    meta.appendChild(label);

    const buttons = document.createElement("div");
    buttons.className = "bookmarkButtons";

    const jumpBtn = document.createElement("button");
    jumpBtn.className = "bookmarkBtn";
    jumpBtn.setAttribute("aria-label", "Jump to bookmark");
    jumpBtn.innerHTML = `<i class="fa-solid fa-play"></i>`;
    jumpBtn.addEventListener("click", () => jumpToBookmark(itemTrackKey, item.time));

    const editBtn = document.createElement("button");
    editBtn.className = "bookmarkBtn rename";
    editBtn.setAttribute("aria-label", "Edit bookmark");
    editBtn.innerHTML = `<i class="fa-solid fa-pen"></i>`;
    editBtn.addEventListener("click", () => openBookmarkEditOverlay(itemTrackKey, item.id));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "bookmarkBtn";
    deleteBtn.setAttribute("aria-label", "Delete bookmark");
    deleteBtn.innerHTML = `<i class="fa-solid fa-trash"></i>`;
    deleteBtn.addEventListener("click", () => deleteBookmark(itemTrackKey, item.id));

    buttons.appendChild(jumpBtn);
    buttons.appendChild(editBtn);
    buttons.appendChild(deleteBtn);

    row.appendChild(meta);
    row.appendChild(buttons);
    bookmarkList.appendChild(row);
  });
}

function getRelativeLocatorParts(track) {
  const locator = String(track?.locator || "").replace(/\//g, "\\");
  const marker = "\\DJMixes\\";
  const idx = locator.toLowerCase().indexOf(marker.toLowerCase());

  let relative = locator;
  if (idx >= 0) {
    relative = locator.slice(idx + marker.length);
  }

  const parts = relative.split("\\").filter(Boolean);
  const filename = parts.length ? parts[parts.length - 1] : "";
  const folders = parts.slice(0, -1);

  return { parts, folders, filename };
}

function getTrackArtistAndFolder(track) {
  const { folders } = getRelativeLocatorParts(track);

  const artist = folders[0] || "Unsorted";
  const folder = folders[1] || "";

  return { artist, folder };
}

function getListEntryLeadTrack(items = []) {
  return items.find((track) => track?.hasArtwork) || items[0] || null;
}

const BR_NAV_CATEGORY_CONFIG = [
  {
    slug: "blackburn-ravers-mixes",
    title: "Blackburn Ravers Mixes",
    description: "UK Hardcore and Hard Dance mixes from The Blackburn Ravers.",
    banner: "/shared/branding/brands/br-mixes-banner-trans.png",
    icon: "/shared/branding/brands/br-mixes-trans.png",
  },
  {
    slug: "dj-nj-mixes",
    title: "DJ NJ Mixes",
    description: "UK Hardcore and Hard Dance mixes from DJ NJ.",
    banner: "/shared/branding/brands/nj-mixes-banner-trans.png",
    icon: "/shared/branding/brands/nj-mixes-trans.png",
  },
  {
    slug: "upalnite-mixes",
    title: "Upalnite Mixes",
    description: "UK Hardcore and Hard Dance mixes from Upalnite.",
    banner: "/shared/branding/brands/up-mixes-banner-trans.png",
    icon: "/shared/branding/brands/up-mixes-trans.png",
  },
  {
    slug: "nasti-jam-mixes",
    title: "Nasti Jam Mixes",
    description: "The harder side of hardcore and gabber mixes from Nasti Jam.",
    banner: "/shared/branding/brands/nasti-mixes-banner-trans.png",
    icon: "/shared/branding/brands/nasti-mixes-trans.png",
  },
  {
    slug: "ghsv-series",
    title: "Gettin High Smashin Vibes Series",
    description: "UK Hardcore and Hard Dance mixes from DJ NJ, Upalnite & MC Steal.",
    banner: "/shared/branding/categories/banners/ghsv-trans-banner.png",
    icon: "/shared/branding/categories/icons/ghsv-trans.png",
  },
  {
    slug: "hardcore-medley-series",
    title: "The Hardcore Medley Series",
    description: "A series of mixes celebrating UK Hardcore labels.",
    banner: "/shared/branding/categories/banners/hardcore-medley-trans-banner.png",
    icon: "/shared/branding/categories/icons/hardcore-medley-trans.png",
  },
  {
    slug: "androidcore-ep",
    title: "The Androidcore Epic",
    description: "A series of mixes celebrating all of UK Hardcore, here is the Androidcore Epic.",
    banner: "/shared/branding/categories/banners/androidcore-trans-banner.png",
    icon: "/shared/branding/categories/icons/androidcore-trans.png",
  },
  {
    slug: "htid-mixes",
    title: "HTID Mixes",
    description: "A collection of HTID mixes mixed by DJ NJ & Upalnite.",
    banner: "/shared/branding/categories/banners/htid-trans-banner.png",
    icon: "/shared/branding/categories/icons/htid-trans.png",
  },
  {
    slug: "makina-mayhem-series",
    title: "Makina Mayhem Series",
    description: "A series of Hardcore Makina mixes from The Blackburn Ravers.",
    banner: "/shared/branding/categories/banners/makina-mayhem-trans-banner.png",
    icon: "/shared/branding/categories/icons/makina-mayhem-trans.png",
  },
  {
    slug: "brutal-power-mixes",
    title: "Brutal Power Mixes",
    description: "A mega mix of multi genres from UK Hardcore to Frenchcore.",
    banner: "/shared/branding/categories/banners/brutal-power-mix-trans-banner.png",
    icon: "/shared/branding/categories/icons/brutal-power-mix-trans.png",
  },
  {
    slug: "house-music-series",
    title: "House Music Series",
    description: "A series of House music with some of the finest House labels.",
    banner: "/shared/branding/categories/banners/house-music-trans-banner.png",
    icon: "/shared/branding/categories/icons/house-music-trans.png",
  },
  {
    slug: "hardhousecore-series",
    title: "Hardhousecore Series",
    description: "A selection of classic Hard House songs with a UK Hardcore twist.",
    banner: "/shared/branding/categories/banners/hardhousecore-series-trans-banner.png",
    icon: "/shared/branding/categories/icons/hardhousecore-series-trans.png",
  },
  {
    slug: "radio-shows",
    title: "Blackburn Ravers Radio Mixes",
    description: "Classic radio shows from The Blackburn Ravers that were recorded years ago.",
    banner: "/shared/branding/categories/banners/radio-shows-trans-banner.png",
    icon: "/shared/branding/categories/icons/radio-shows-trans.png",
  },
  {
    slug: "free-songs",
    title: "Blackburn Ravers Free Songs",
    description: "Short Blackburn Ravers-tagged giveaways and free songs.",
    banner: "/shared/branding/categories/banners/free-songs-trans-banner.png",
    icon: "/shared/branding/categories/icons/free-songs-trans.png",
  },
  {
    slug: "dj-mp3s-wavs",
    title: "DJ MP3s | WAVs",
    description: "DJ MP3/WAV files and non-BRMedia tracks that do not belong in a named BRMedia section.",
    banner: "/shared/branding/categories/banners/dj-mp3-wav-trans-banner.png",
    icon: "/shared/branding/categories/icons/dj-mp3-wav-trans.png",
  },
  {
    slug: "source-links",
    title: "Source Links",
    description: "Saved SoundCloud, Mixcloud, Hearthis and other music source links.",
    banner: "/shared/branding/categories/banners/source-links-trans-banner.png",
    icon: "/shared/branding/categories/icons/source-links-trans.png",
    countType: "links",
  },
];

function getNavCategoryBySlug(slug = "") {
  return BR_NAV_CATEGORY_CONFIG.find((item) => item.slug === slug) || null;
}

function readBrMediaCustomTagStore() {
  const localStore = readPersistedJson(BRMEDIA_CUSTOM_TAGS_KEY, {});
  return {
    ...(brMediaServerCustomTagStore || {}),
    ...(localStore || {}),
  };
}

function getBrMediaCustomTagKeysForTrack(track) {
  if (!track) return [];

  return [
    track.id,
    track.bookmarkKey,
    getStableTrackKey(track),
    track.locator,
    track.file,
    track.filename,
    track.path,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value, index, arr) => arr.indexOf(value) === index);
}

function getBrMediaCustomTagsFromStoreForTrack(track, store = {}) {
  const keys = getBrMediaCustomTagKeysForTrack(track);

  for (const key of keys) {
    if (store?.[key] && typeof store[key] === "object") return store[key];
  }

  return {};
}

function getBrMediaCustomTagsForTrack(track) {
  if (!track) return {};

  if (track.brmediaTags && typeof track.brmediaTags === "object") {
    return track.brmediaTags;
  }

  return getBrMediaCustomTagsFromStoreForTrack(track, readBrMediaCustomTagStore());
}

function normaliseBrandSlug(value = "") {
  const key = normaliseText(value).toLowerCase();

  if (/blackburn\s*ravers|bb\s*ravers|brmedia|\bbr\b/.test(key)) return "blackburn-ravers-mixes";
  if (/dj\s*nj|\bnj\b/.test(key)) return "dj-nj-mixes";
  if (/upalnite|\bup\b/.test(key)) return "upalnite-mixes";

  return "";
}

function getCustomBrandSignals(primaryBrand = "", extraBrands = []) {
  const brandBlob = [
    normaliseText(primaryBrand),
    ...(Array.isArray(extraBrands) ? extraBrands.map(normaliseText) : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return {
    customHasBlackburn: /blackburn\s*ravers|blackburnravers|bb\s*ravers|\bbr\b/.test(brandBlob),
    customHasNj: /dj\s*nj|\bnj\b/.test(brandBlob),
    customHasUp: /upalnite|\bup\b/.test(brandBlob),
  };
}

function normaliseNavCategorySlug(value = "") {
  const key = normaliseText(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\|/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!key) return "";

  const direct = getNavCategoryBySlug(key);
  if (direct) return direct.slug;

  const match = BR_NAV_CATEGORY_CONFIG.find((category) => {
    const titleKey = normaliseText(category.title)
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/\|/g, " ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return titleKey === key;
  });

  return match?.slug || normaliseBrandSlug(value);
}

function getTrackNavCategoryContext(track) {
  const { folders, filename } = getRelativeLocatorParts(track);
  const customTags = getBrMediaCustomTagsForTrack(track);

  const customBrand = normaliseText(customTags.primaryBrand || customTags.brand || customTags.primary_brand);
  const customExtraBrands = Array.isArray(customTags.extraBrands) ? customTags.extraBrands : [];
  const customCategory = normaliseNavCategorySlug(customTags.category || customTags.navCategory || customTags.brmediaCategory);
  const customReleaseType = normaliseText(customTags.releaseType || customTags.release_type).toLowerCase();
  const customRadioOnly = customTags.radioOnly === true || String(customTags.radioOnly || "").toLowerCase() === "true";
  const { customHasBlackburn, customHasNj, customHasUp } = getCustomBrandSignals(customBrand, customExtraBrands);

  const artistBlob = [
    normaliseText(track?.artist),
    normaliseText(track?.albumArtist),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const fileNameBlob = [
    normaliseText(track?.filename),
    normaliseText(filename),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const brandBlob = [
    normaliseText(track?.title),
    artistBlob,
    normaliseText(track?.album),
    normaliseText(track?.genre),
    normaliseText(track?.comment),
    normaliseText(track?.subtitle),
    fileNameBlob,
    customBrand,
    customExtraBrands.join(" "),
    customTags.series,
    customTags.releaseType,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const blob = [
    brandBlob,
    ...folders.map((folder) => normaliseText(folder)),
    normaliseText(track?.tracklistPath),
    normaliseText(track?.tracklistFile),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const brandKey = normaliseText(track?.mixBadge).toLowerCase();
  const customBrandSlug = normaliseBrandSlug(customBrand);
  const customExtraBrandSlugs = customExtraBrands.map(normaliseBrandSlug).filter(Boolean);

  const artistHasNj = /\bdj\s*nj\b/.test(artistBlob);
  const artistHasUp = /\bupalnite\b/.test(artistBlob);
  const artistHasBlackburn = /blackburn\s*ravers|blackburnravers|bb\s*ravers/.test(artistBlob);

  const hasNj = /\bdj\s*nj\b/.test(brandBlob);
  const hasUp = /\bupalnite\b/.test(brandBlob);
  const hasBlackburn = /blackburn\s*ravers|blackburnravers|bb\s*ravers/.test(brandBlob);

  const isNjUpCombo = (artistHasNj && artistHasUp) || (hasNj && hasUp);
  const isRadioShow =
    customRadioOnly ||
    customReleaseType === "radio" ||
    customReleaseType === "radio show" ||
    /\b(?:blackburn\s*ravers|dj\s*nj|upalnite)?\s*radio\s*(?:tag|show|shows|mix|mixes)?\b/.test(blob) ||
    /\bradio\s*(?:tag|show|shows|mix|mixes)\b/.test(blob);

  const durationSec = Number(track?.duration || 0);
  const isShortTrack = durationSec > 0 && durationSec < 600;
  const isBrmediaTagged =
    hasBlackburn ||
    hasNj ||
    hasUp ||
    isNjUpCombo ||
    customHasBlackburn ||
    customHasNj ||
    customHasUp ||
    !!customBrandSlug ||
    !!customCategory;

  return {
    artistBlob,
    brandBlob,
    blob,
    brandKey,
    customTags,
    customCategory,
    customBrandSlug,
    customExtraBrandSlugs,
    customHasBlackburn,
    customHasNj,
    customHasUp,
    customReleaseType,
    artistHasNj,
    artistHasUp,
    artistHasBlackburn,
    hasNj,
    hasUp,
    hasBlackburn,
    isNjUpCombo,
    isRadioShow,
    isBrmediaTagged,
    isShortTrack,
  };
}

function getTrackPrimaryNavCategorySlug(track) {
  const ctx = getTrackNavCategoryContext(track);

  if (ctx.isRadioShow) return "radio-shows";
  if (ctx.customCategory) return ctx.customCategory;

  if (ctx.isShortTrack) {
    return ctx.isBrmediaTagged ? "free-songs" : "dj-mp3s-wavs";
  }

  if (/\bghsv\b|gettin high smashin vibes/.test(ctx.blob)) return "ghsv-series";
  if (/\bthm\b|hardcore medley/.test(ctx.blob)) return "hardcore-medley-series";
  if (/androidcore/.test(ctx.blob)) return "androidcore-ep";
  if (/\bhtid\b|hardcore till i die|weekender/.test(ctx.blob)) return "htid-mixes";
  if (/makina mayhem/.test(ctx.blob)) return "makina-mayhem-series";
  if (/brutal power/.test(ctx.blob)) return "brutal-power-mixes";
  if (/\bhouse music\b/.test(ctx.blob)) return "house-music-series";
  if (/hardhousecore/.test(ctx.blob)) return "hardhousecore-series";
  if (/nasti\s*jam/.test(ctx.blob)) return "nasti-jam-mixes";

  if (ctx.customBrandSlug) return ctx.customBrandSlug;

  if ((ctx.brandKey === "nj" || ctx.artistHasNj) && !ctx.artistHasUp) return "dj-nj-mixes";
  if ((ctx.brandKey === "up" || ctx.artistHasUp) && !ctx.artistHasNj) return "upalnite-mixes";
  if (ctx.artistHasBlackburn) return "blackburn-ravers-mixes";

  // Fix: Blackburn Ravers mixes often mention Upalnite in comments/footer text.
  // If the server badge is BR and Blackburn is present, don't let weak Upalnite text steal the category.
  if (ctx.brandKey === "br" && ctx.hasBlackburn && !ctx.artistHasUp && !ctx.artistHasNj && !ctx.hasNj) {
    return "blackburn-ravers-mixes";
  }

  if (ctx.hasNj && !ctx.hasUp) return "dj-nj-mixes";
  if (ctx.hasUp && !ctx.hasNj) return "upalnite-mixes";
  if (ctx.hasBlackburn || ctx.isNjUpCombo) return "blackburn-ravers-mixes";

  return "dj-mp3s-wavs";
}

function trackBelongsToArtistNavCategory(track, slug = "") {
  const ctx = getTrackNavCategoryContext(track);

  if (ctx.isRadioShow || ctx.isShortTrack) return false;

  if (slug === "dj-nj-mixes") {
    return (
      ctx.customBrandSlug === slug ||
      ctx.customExtraBrandSlugs.includes(slug) ||
      ctx.customHasNj ||
      ctx.brandKey === "nj" ||
      ctx.artistHasNj ||
      (ctx.hasNj && !ctx.hasUp && !ctx.artistHasUp)
    );
  }

  if (slug === "upalnite-mixes") {
    return (
      ctx.customBrandSlug === slug ||
      ctx.customExtraBrandSlugs.includes(slug) ||
      ctx.customHasUp ||
      ctx.brandKey === "up" ||
      ctx.artistHasUp ||
      (ctx.hasUp && !ctx.hasNj && !ctx.artistHasNj)
    );
  }

  if (slug === "blackburn-ravers-mixes") {
    return (
      ctx.customBrandSlug === slug ||
      ctx.customExtraBrandSlugs.includes(slug) ||
      ctx.customHasBlackburn ||
      ctx.artistHasBlackburn ||
      (ctx.brandKey === "br" && ctx.hasBlackburn && !ctx.artistHasNj && !ctx.artistHasUp && !ctx.hasNj) ||
      (ctx.hasBlackburn && !ctx.artistHasNj && !ctx.artistHasUp && !ctx.hasNj && !ctx.hasUp)
    );
  }

  return false;
}

function matchesTrackToNavCategory(track, slug = "") {
  if (slug === "source-links") return false;

  const ctx = getTrackNavCategoryContext(track);

  if (ctx.isRadioShow) return slug === "radio-shows";
  if (ctx.customCategory === slug) return true;

  if (slug === "dj-nj-mixes" || slug === "upalnite-mixes" || slug === "blackburn-ravers-mixes") {
    return trackBelongsToArtistNavCategory(track, slug);
  }

  return getTrackPrimaryNavCategorySlug(track) === slug;
}

function getTracksForNavCategory(slug = "") {
  return library.filter((track) => matchesTrackToNavCategory(track, slug));
}

function getCategoryItemCount(category = {}) {
  if (category.slug === "source-links") return urlSourceLinks.length;
  return getTracksForNavCategory(category.slug).length;
}

function getCategoryCountLabel(category = {}, count = 0) {
  if (category.countType === "links") return `${count} link${count === 1 ? "" : "s"}`;
  if (category.slug === "free-songs") return `${count} song${count === 1 ? "" : "s"}`;
  if (category.slug === "dj-mp3s-wavs") return `${count} file${count === 1 ? "" : "s"}`;
  return `${count} mix${count === 1 ? "" : "es"}`;
}

function trackMatchesCategoryFilter(track, mode = listsFilterMode) {
  if (!mode || mode === "all") return true;
  if (mode === "favourites") return isFavouriteTrack(track);
  if (mode === "hasArtwork") return !!track?.hasArtwork;
  if (mode === "under10") return Number(track?.duration || 0) > 0 && Number(track?.duration || 0) < 600;
  if (mode === "over10") return Number(track?.duration || 0) >= 600;
  if (mode === "branded") return getTrackNavCategoryContext(track).isBrmediaTagged;

  if (mode === "hasTracklist") {
    const blob = [
      track?.tracklistPath,
      track?.tracklistFile,
      track?.cuePath,
      track?.lyrics,
      track?.description,
      track?.comment,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return !!(track?.hasTracklist || track?.tracklist || /\.txt|\.cue|tracklist|timestamp/.test(blob));
  }

  return true;
}

function getEpisodeSortValue(track) {
  const blob = [
    track?.title,
    track?.album,
    track?.file,
    track?.filename,
    track?.locator,
  ]
    .filter(Boolean)
    .join(" ");

  const match = blob.match(/(?:episode|ep|#)\s*#?\s*(\d{1,4})/i);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function sortCategoryTracks(items = [], mode = listsSortMode) {
  const list = items.slice();

  if (mode === "az") return list.sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
  if (mode === "za") return list.sort((a, b) => String(b.title || "").localeCompare(String(a.title || "")));
  if (mode === "durationShort") return list.sort((a, b) => Number(a.duration || 0) - Number(b.duration || 0));
  if (mode === "durationLong") return list.sort((a, b) => Number(b.duration || 0) - Number(a.duration || 0));
  if (mode === "episode") return list.sort((a, b) => getEpisodeSortValue(a) - getEpisodeSortValue(b));

  if (mode === "newest") {
    return list.sort((a, b) =>
      Number(b.addedAt || b.createdAt || b.updatedAt || 0) -
      Number(a.addedAt || a.createdAt || a.updatedAt || 0)
    );
  }

  return list;
}

function getVisibleTracksForNavCategory(slug = "") {
  return sortCategoryTracks(
    getTracksForNavCategory(slug).filter((track) => trackMatchesCategoryFilter(track)),
    listsSortMode
  );
}

function openNavCategory(slug = "") {
  listsCategory = slug;
  listsArtist = "";
  listsFolder = "";
  setTab("Lists");
}

function openNavCategory(slug = "") {
  listsCategory = slug;
  listsArtist = "";
  listsFolder = "";
  setTab("Lists");
}

function buildSidebarCategoryButton(category, count) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "sidebarCategoryBtn";

  if (listsCategory === category.slug && views?.Lists && !views.Lists.classList.contains("hidden")) {
    btn.classList.add("active");
  }

  const art = document.createElement("div");
  art.className = "sidebarCategoryArt";
  applyArtwork(art, category.icon || category.banner || "");
  art.style.backgroundSize = "contain";
  art.style.backgroundRepeat = "no-repeat";
  art.style.backgroundPosition = "center";

  const body = document.createElement("div");
  body.className = "sidebarCategoryBody";

  const titleRow = document.createElement("div");
  titleRow.className = "sidebarCategoryTitleRow";

  const title = document.createElement("div");
  title.className = "sidebarCategoryTitle";
  title.textContent = category.title;

  const countEl = document.createElement("div");
  countEl.className = "sidebarCategoryCount";
  countEl.textContent = `(${count})`;

  const desc = document.createElement("div");
  desc.className = "sidebarCategoryDesc";
  desc.textContent = category.description;

  titleRow.appendChild(title);
  titleRow.appendChild(countEl);
  body.appendChild(titleRow);
  body.appendChild(desc);

  btn.appendChild(art);
  btn.appendChild(body);

  btn.addEventListener("click", () => {
    openNavCategory(category.slug);
  });

  return btn;
}

function renderSidebarCategories() {
  if (!sidebarCategoryList) return;

  sidebarCategoryList.innerHTML = "";

  BR_NAV_CATEGORY_CONFIG.forEach((category) => {
    const count = getCategoryItemCount(category);
    sidebarCategoryList.appendChild(buildSidebarCategoryButton(category, count));
  });
}

function toggleHomeSearchPanel(forceValue) {
  if (!homeSearchPanel) return;

  const shouldOpen = typeof forceValue === "boolean"
    ? forceValue
    : homeSearchPanel.classList.contains("hidden");

  homeSearchPanel.classList.toggle("hidden", !shouldOpen);

  if (btnTopSearch) {
    btnTopSearch.classList.toggle("active", shouldOpen);
    btnTopSearch.setAttribute("aria-pressed", shouldOpen ? "true" : "false");
  }

  if (shouldOpen) {
    setTimeout(() => search?.focus(), 40);
  }
}

function renderHomeCategoryShowcase() {
  if (!homeCategoryShowcase) return;

  homeCategoryShowcase.innerHTML = "";

  BR_NAV_CATEGORY_CONFIG.forEach((category) => {
    const tracks = getTracksForNavCategory(category.slug);
    const count = getCategoryItemCount(category);
    const countLabel = getCategoryCountLabel(category, count);
    const armed = homeNavRevealSlug === category.slug;

    const card = document.createElement("button");
    card.type = "button";
    card.className = `homeCategoryShowcaseCard${armed ? " is-armed" : ""}`;

    const visual = document.createElement("div");
    visual.className = "homeCategoryShowcaseVisual";
    applyArtwork(visual, category.banner || category.icon || "");
    visual.style.backgroundSize = "contain";
    visual.style.backgroundPosition = "center";
    visual.style.backgroundRepeat = "no-repeat";

    const footer = document.createElement("div");
    footer.className = "homeCategoryShowcaseFooter";
    footer.innerHTML = `
      <div class="homeCategoryShowcaseFooterTitle">${escapeHtml(category.title)}</div>
      <div class="homeCategoryShowcaseFooterMeta">${escapeHtml(countLabel)}</div>
    `;

    const reveal = document.createElement("div");
    reveal.className = "homeCategoryShowcaseReveal";
    reveal.innerHTML = `
      <div class="homeCategoryShowcaseRevealCount">${escapeHtml(countLabel)} available.</div>
      <div class="homeCategoryShowcaseRevealDesc">${escapeHtml(category.description || "")}</div>
      <div class="homeCategoryShowcaseRevealHint">Tap again to open this category</div>
    `;

    card.appendChild(visual);
    card.appendChild(footer);
    card.appendChild(reveal);

    card.addEventListener("click", () => {
      if (homeNavRevealSlug === category.slug) {
        homeNavRevealSlug = "";
        openNavCategory(category.slug);
        return;
      }

      homeNavRevealSlug = category.slug;
      renderHomeCategoryShowcase();
    });

    homeCategoryShowcase.appendChild(card);
  });
}

function playTrackCollection(items = []) {
  if (!items.length) return;

  queue = items.slice();
  queueIndex = 0;
  previewTrackId = "";
  playCurrent();
  renderLists();
}

function buildListBrowserCard({
  title,
  meta,
  items = [],
  onOpen,
  onPlay,
  imageUrl = "",
  badgeText = "",
  cardClass = "",
  artContain = false,
}) {
  const leadTrack = getListEntryLeadTrack(items);

  const row = document.createElement("div");
  row.className = `listBrowserCard${cardClass ? ` ${cardClass}` : ""}`;

  const art = document.createElement("div");
  art.className = "listBrowserArt";

  if (imageUrl) {
    applyArtwork(art, imageUrl);
    if (artContain) {
      art.style.backgroundSize = "contain";
      art.style.backgroundRepeat = "no-repeat";
      art.style.backgroundPosition = "center";
    }
  } else {
    applyArtwork(art, leadTrack?.hasArtwork ? getArtworkUrl(leadTrack) : "");
  }

  const body = document.createElement("div");
  body.className = "listBrowserBody";

  const titleRow = document.createElement("div");
  titleRow.className = "listBrowserTitleRow";

  const titleEl = document.createElement("div");
  titleEl.className = "listBrowserTitle";
  titleEl.textContent = title;

  titleRow.appendChild(titleEl);

  if (badgeText !== "" && badgeText !== null && badgeText !== undefined) {
    const badge = document.createElement("span");
    badge.className = "listBrowserCountBadge";
    badge.textContent = `(${badgeText})`;
    titleRow.appendChild(badge);
  }

  const metaEl = document.createElement("div");
  metaEl.className = "listBrowserMeta";
  metaEl.textContent = meta;

  body.appendChild(titleRow);
  body.appendChild(metaEl);

  const actions = document.createElement("div");
  actions.className = "listBrowserActions";

  if (onPlay) {
    const playBtn = document.createElement("button");
    playBtn.className = "pill primary";
    playBtn.innerHTML = `<i class="fa-solid fa-play"></i>`;
    playBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      onPlay();
    });
    actions.appendChild(playBtn);
  }

  const openBtn = document.createElement("button");
  openBtn.className = "pill";
  openBtn.innerHTML = `<i class="fa-solid fa-chevron-right"></i>`;
  openBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    onOpen?.();
  });
  actions.appendChild(openBtn);

  row.appendChild(art);
  row.appendChild(body);
  row.appendChild(actions);

  row.addEventListener("click", () => {
    onOpen?.();
  });

  return row;
}

function renderSourceLinksCategory() {
  if (!listsBrowser) return;

  if (btnListsBack) btnListsBack.classList.remove("hidden");
  if (btnListsFilter) btnListsFilter.classList.add("hidden");
  if (listsFilterPanel) listsFilterPanel.classList.add("hidden");

  if (listsTitle) listsTitle.textContent = "Source Links";
  if (listsSub) {
    listsSub.textContent = `${urlSourceLinks.length} saved SoundCloud, Mixcloud, Hearthis or other source link${urlSourceLinks.length === 1 ? "" : "s"}.`;
  }

  listsBrowser.innerHTML = "";

  if (!urlSourceLinks.length) {
    listsBrowser.innerHTML = `<div class="waveformJobEmpty">No source links saved yet. Add them in Settings → Import.</div>`;
    return;
  }

  urlSourceLinks
    .slice()
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
    .forEach((item) => {
      const row = document.createElement("div");
      row.className = "track trackMediaCard sourceLinkCategoryCard";

      const iconClass = getUrlSourceProviderIcon(item.provider);
      const label = getUrlSourceProviderLabel(item.provider);
      const title = escapeHtml(item.title || label);
      const url = escapeHtml(item.url || "");

      row.innerHTML = `
        <div class="thumb sourceLinkCategoryThumb">
          <i class="${iconClass}"></i>
        </div>

        <div class="meta">
          <div class="title">${title}</div>
          <div class="sub">${label} • ${url}</div>

          <div class="actions mediaCardActions">
            <button class="pill primary sourceLinkOpenBtn" type="button">
              <i class="fa-solid fa-up-right-from-square"></i>
              <span>Open</span>
            </button>

            <button class="pill danger sourceLinkRemoveBtn" type="button">
              <i class="fa-solid fa-trash"></i>
              <span>Remove</span>
            </button>
          </div>
        </div>
      `;

      row.querySelector(".sourceLinkOpenBtn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        openBrmediaUrl(item.url, { fallbackToLocation: true });
      });

      row.querySelector(".sourceLinkRemoveBtn")?.addEventListener("click", (e) => {
        e.stopPropagation();

        urlSourceLinks = urlSourceLinks.filter((entry) => entry.id !== item.id);
        saveUrlSourceLinks();
        renderUrlSourceLinks();
        renderHomeCategoryShowcase();
        renderSidebarCategories();
        renderSourceLinksCategory();

        showBookmarkToast("Source links", "Source removed");
      });

      row.addEventListener("click", () => openBrmediaUrl(item.url, { fallbackToLocation: true }));

      listsBrowser.appendChild(row);
    });
}

function renderLists() {
  if (!listsBrowser) return;

  listsBrowser.innerHTML = "";
  renderSidebarCategories();

  if (!listsCategory) {
    if (btnListsBack) btnListsBack.classList.add("hidden");
    if (btnListsFilter) btnListsFilter.classList.add("hidden");
    if (listsFilterPanel) listsFilterPanel.classList.add("hidden");
    if (listsTitle) listsTitle.textContent = "Mix navigation";
    if (listsSub) listsSub.textContent = "Browse mixes by brand and series.";

    BR_NAV_CATEGORY_CONFIG.forEach((category) => {
      const tracks = getTracksForNavCategory(category.slug);
      const count = getCategoryItemCount(category);

      const row = buildListBrowserCard({
        title: category.title,
        meta: category.description,
        items: tracks,
        imageUrl: category.banner || category.icon,
        badgeText: count,
        cardClass: "is-navCategory",
        artContain: true,
        onOpen: () => {
          listsCategory = category.slug;
          renderLists();
        },
        onPlay: tracks.length ? () => playTrackCollection(tracks) : null,
      });

      listsBrowser.appendChild(row);
    });

    refreshDynamicIconArea(listsBrowser);
    return;
  }

  if (listsCategory === "source-links") {
    renderSourceLinksCategory();
    return;
  }

  const category = getNavCategoryBySlug(listsCategory);
  if (!category) {
    listsCategory = "";
    renderLists();
    return;
  }

  const allTracks = getTracksForNavCategory(listsCategory);
  const tracks = getVisibleTracksForNavCategory(listsCategory);

  if (btnListsBack) btnListsBack.classList.remove("hidden");
  if (btnListsFilter) btnListsFilter.classList.remove("hidden");
  if (listsTitle) listsTitle.textContent = category.title;
  if (listsSub) {
    listsSub.textContent = tracks.length
      ? `${category.description} • ${tracks.length} shown of ${allTracks.length}`
      : `${category.description} • No mixes matched this filter.`;
  }

  if (!tracks.length) {
    listsBrowser.innerHTML = `<div class="waveformJobEmpty">No mixes matched this category yet.</div>`;
    refreshDynamicIconArea(listsBrowser);
    return;
  }

  const current = currentTrack();
  const isActuallyPlaying = !!audio && !audio.paused;

  tracks.forEach((item) => {
    const isCurrent = !!current && current.id === item.id;

    const row = document.createElement("div");
    row.className = `track trackMediaCard${isCurrent ? " is-current" : ""}`;
    decorateTrackCardProgress(row, item);

    const thumb = document.createElement("div");
    thumb.className = "thumb";
    applyArtwork(thumb, item.hasArtwork ? getArtworkUrl(item) : "");

    const playBtn = document.createElement("button");
    playBtn.className = `imagePlayBtn${isCurrent && isActuallyPlaying ? " is-playing" : ""}`;

    if (isCurrent && isActuallyPlaying) {
      playBtn.innerHTML = `<i class="fa-solid fa-pause"></i>`;
      playBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleCurrentPlayback();
      });
    } else {
      playBtn.innerHTML = `<i class="fa-solid fa-play"></i>`;
      playBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isCurrent) {
          toggleCurrentPlayback();
          return;
        }
        requestTrackPlay(item, { openPlayer: true, autoplay: true });
      });
    }

    thumb.appendChild(playBtn);

    const meta = document.createElement("div");
    meta.className = "meta";

    const title = document.createElement("div");
    title.className = "title";
    title.textContent = item.title || item.id;

    const sub = document.createElement("div");
    sub.className = "sub";
    sub.textContent = item.artist || item.subtitle || (isGoogleDriveLinkedTrack(item) ? "Google Drive • Cloud Library" : "Local • BRMedia");

    const actions = document.createElement("div");
    actions.className = "actions mediaCardActions";

    const alreadyQueued = queue.some((q) => q.id === item.id);

    const addBtn = document.createElement("button");
    addBtn.className = alreadyQueued ? "pill addedQueueBtn" : "pill";
    addBtn.innerHTML = getQueueButtonMarkup(alreadyQueued);
    addBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (queue.some((q) => q.id === item.id)) return;
      addToQueue(item);
      renderLibrary();
      renderLists();
    });

    const playlistBtn = document.createElement("button");
    const inPlaylist = isTrackInAnyPlaylist(item);
    playlistBtn.className = `pill playlistGhostBtn${inPlaylist ? " active" : ""}`;
    playlistBtn.innerHTML = getPlaylistButtonMarkup(inPlaylist);
    playlistBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      void openPlaylistPickerForTracks([item]);
    });

    const favBtn = document.createElement("button");
    const favActive = isFavouriteTrack(item);
    favBtn.className = `pill favPill${favActive ? " active" : ""}`;
    favBtn.innerHTML = getFavouriteButtonMarkup(favActive);
    favBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavouriteTrack(item, { openTab: true });
    });

    actions.appendChild(addBtn);
    actions.appendChild(playlistBtn);
    actions.appendChild(favBtn);

    meta.appendChild(title);
    meta.appendChild(sub);
    appendCloudLocalCopyNotice(meta, item);
    meta.appendChild(buildTrackCardProgressElement());
    meta.appendChild(actions);

    row.appendChild(thumb);
    row.appendChild(meta);

    row.addEventListener("click", (e) => {
      if (e.target.closest(".actions")) return;
      if (e.target.closest(".imagePlayBtn")) return;
      if (isCurrent) openNowPlaying();
      else previewTrack(item, { openPlayer: true });
    });

    listsBrowser.appendChild(row);
  });

  refreshDynamicIconArea(listsBrowser);
}

/* library */
function renderLibrary() {
  if (!trackListEl) return;

  renderHomeCategoryShowcase();

  const query = normaliseText(search?.value).toLowerCase();
  const items = query
    ? library.filter((item) => item.searchText?.includes(query))
    : library;

  if (!query) {
    trackListEl.innerHTML = "";
    if (btnLibraryLoadMore) btnLibraryLoadMore.classList.add("hidden");
    renderSettingsFilesPage();
    return;
  }

  const visibleItems = items.slice(0, libraryRenderLimit);
  const hasMore = items.length > visibleItems.length;

  const current = currentTrack();
  const isActuallyPlaying = !!audio && !audio.paused;

  trackListEl.innerHTML = "";

  for (const item of visibleItems) {
    const isCurrent = !!current && current.id === item.id;

    const row = document.createElement("div");
    row.className = `track trackMediaCard${isCurrent ? " is-current" : ""}`;
    decorateTrackCardProgress(row, item);

    const thumb = document.createElement("div");
    thumb.className = "thumb";
    applyArtwork(thumb, item.hasArtwork ? getArtworkUrl(item) : "");

    const playBtn = document.createElement("button");
    playBtn.className = `imagePlayBtn${isCurrent && isActuallyPlaying ? " is-playing" : ""}`;

    if (isCurrent && isActuallyPlaying) {
      playBtn.innerHTML = `<i class="fa-solid fa-pause"></i>`;
      playBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleCurrentPlayback();
      });
    } else {
      playBtn.innerHTML = `<i class="fa-solid fa-play"></i>`;
      playBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (isCurrent) {
          toggleCurrentPlayback();
          return;
        }

        handleTrackCardPlayClick(e, item, {
          openPlayer: true,
          autoplay: true,
        });
      });
    }

    thumb.appendChild(playBtn);

    const meta = document.createElement("div");
    meta.className = "meta";

    const title = document.createElement("div");
    title.className = "title";
    title.textContent = item.title || item.id;

    const sub = document.createElement("div");
    sub.className = "sub";
    sub.textContent = item.artist || item.subtitle || "Local • BRMedia";

    const actions = document.createElement("div");
    actions.className = "actions mediaCardActions";

    const alreadyQueued = queue.some((q) => q.id === item.id);

    const addBtn = document.createElement("button");
    addBtn.className = alreadyQueued ? "pill addedQueueBtn" : "pill";
    addBtn.innerHTML = getQueueButtonMarkup(alreadyQueued);
    addBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (queue.some((q) => q.id === item.id)) return;
      addToQueue(item);
      renderLibrary();
    });

    const playlistBtn = document.createElement("button");
    const inPlaylist = isTrackInAnyPlaylist(item);
    playlistBtn.className = `pill playlistGhostBtn${inPlaylist ? " active" : ""}`;
    playlistBtn.innerHTML = getPlaylistButtonMarkup(inPlaylist);
    playlistBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      void openPlaylistPickerForTracks([item]);
    });

    const favBtn = document.createElement("button");
    const favActive = isFavouriteTrack(item);
    favBtn.className = `pill favPill${favActive ? " active" : ""}`;
    favBtn.innerHTML = getFavouriteButtonMarkup(favActive);
    favBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavouriteTrack(item, { openTab: true });
    });

    actions.appendChild(addBtn);
    actions.appendChild(playlistBtn);
    actions.appendChild(favBtn);

    const torrentBtn = document.createElement("button");
    torrentBtn.className = "pill subtle mediaTorrentBtn";
    torrentBtn.type = "button";
    torrentBtn.innerHTML = `<i class="fa-solid fa-magnet"></i><span>Torrent</span>`;
    torrentBtn.title = "Create/add authorised torrent for this audio file";
    torrentBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openTrackTorrentHandoff(item);
    });
    actions.appendChild(torrentBtn);

    if (isGoogleDriveLinkedTrack(item) && !item.importedLocalItemId) {
      const importLocalBtn = document.createElement("button");
      importLocalBtn.className = "pill subtle cloudLocalCopyBtn";
      importLocalBtn.type = "button";
      importLocalBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-down"></i><span>Import local copy</span>`;
      importLocalBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        importLocalBtn.disabled = true;
        importLocalBtn.textContent = "Importing...";

        try {
          await importGoogleDriveLinkedTrack(item);
          showBookmarkToast("Google Drive", "Local copy imported for editing modules");
          await loadLibrary();
        } catch (err) {
          showBookmarkToast("Google Drive import failed", err?.message || "Could not import local copy");
          importLocalBtn.disabled = false;
          importLocalBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-down"></i><span>Import local copy</span>`;
        }
      });
      actions.appendChild(importLocalBtn);
    }

    meta.appendChild(title);
    meta.appendChild(sub);
    appendCloudLocalCopyNotice(meta, item);
    meta.appendChild(buildTrackCardProgressElement());
    meta.appendChild(actions);

    row.appendChild(thumb);
    row.appendChild(meta);

    row.addEventListener("click", (e) => {
      if (e.target.closest(".actions")) return;
      if (e.target.closest(".imagePlayBtn")) return;
      homeNavRevealSlug = "";
      if (isCurrent) openNowPlaying();
      else previewTrack(item, { openPlayer: true });
    });

    trackListEl.appendChild(row);
  }

  if (btnLibraryLoadMore) {
    btnLibraryLoadMore.classList.toggle("hidden", !hasMore);
    btnLibraryLoadMore.textContent = hasMore
      ? `Load 15 more mixes (${items.length - visibleItems.length} left)`
      : "All mixes loaded";
  }

  renderSettingsFilesPage();
  refreshDynamicIconArea(trackListEl);
}

function openTrackTorrentHandoff(track) {
  if (!track?.id) {
    showBookmarkToast("Torrent handoff", "Track id missing");
    return;
  }

  const params = new URLSearchParams({
    create: "audio",
    trackId: track.id,
    title: track.title || track.fileName || "Audio file",
  });

  showBookmarkToast("Torrent handoff", "Opening Torrents to create/add an authorised audio torrent");
  window.location.href = `/torrents?${params.toString()}`;
}

async function openTrackInModule(modulePath, track) {
  if (!track?.id) {
    showBookmarkToast("BRMedia modules", "Track id missing");
    return;
  }

  let routeTrackId = track.id;
  const moduleName = String(modulePath || "").replace(/^\//, "") || "module";

  if (isGoogleDriveLinkedTrack(track)) {
    if (track.importedLocalItemId) {
      routeTrackId = track.importedLocalItemId;
    } else {
      const ok = await confirmThemeAction(
        "This Google Drive file can stream in Player, but editing/render modules need a local copy first. Import a local copy now and then open it?",
        "Cloud file needs local copy",
        "Import local copy"
      );

      if (!ok) return;

      try {
        showBookmarkToast("Google Drive", "Importing local copy for editing modules…");
        const data = await importGoogleDriveLinkedTrack(track);
        routeTrackId = data?.item?.id || data?.linkedTrack?.importedLocalItemId || track.id;
        await loadLibrary();
        queuePlayerEvent("cloud_local_copy_imported", track, { flushNow: true });
      } catch (err) {
        showBookmarkToast("Google Drive import failed", err?.message || "Could not import local copy");
        return;
      }
    }
  }

  const params = new URLSearchParams({
    trackId: routeTrackId,
  });

  queuePlayerEvent("open_module", track, { route: moduleName, flushNow: true });
  window.location.href = `${modulePath}?${params.toString()}`;
}

function renderSettingsFilesPage() {
  if (!settingsFilesList) return;

  settingsFilesList.innerHTML = "";

  if (!library.length) {
    settingsFilesList.innerHTML = `<div class="waveformJobEmpty">No files in the player yet.</div>`;
    return;
  }

  const buildIconActionButton = ({
    className = "",
    icon = "fa-solid fa-circle",
    label = "Action",
    onClick,
  }) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `pill settingsFileActionBtn ${className}`.trim();
    btn.innerHTML = `<i class="${icon}"></i><span>${label}</span>`;
    btn.title = label;
    btn.setAttribute("aria-label", label);
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick?.(btn, e);
    });
    return btn;
  };

  library.forEach((item) => {
    const row = document.createElement("div");
    row.className = "track trackMediaCard settingsFileCard";

    const thumb = document.createElement("div");
    thumb.className = "thumb";
    applyArtwork(thumb, item.hasArtwork ? getArtworkUrl(item) : "");

    const meta = document.createElement("div");
    meta.className = "meta";

    const title = document.createElement("div");
    title.className = "title";
    title.textContent = item.title || item.id;

    const sub = document.createElement("div");
    sub.className = "sub settingsFileArtist";
    sub.textContent = item.artist || item.subtitle || item.file || "Local • BRMedia";

    const info = document.createElement("div");
    info.className = "sub settingsFileLocator";
    const fileText = item.file || item.filename || item.locator || item.id || "File";
    info.textContent = fileText;
    info.title = fileText;

    const actions = document.createElement("div");
    actions.className = "actions settingsFileActions";

    const openBtn = buildIconActionButton({
      className: "primary",
      icon: "fa-solid fa-play",
      label: "Play in player",
      onClick: () => {
        previewTrack(item, { openPlayer: true });
        setTab("Library");
      },
    });

    const deleteBtn = buildIconActionButton({
      className: "danger",
      icon: "fa-solid fa-trash",
      label: "Delete from library",
      onClick: async (btn) => {
        const ok = window.confirm(`Delete this file from BRMedia?\n\n${item.title || item.file || item.id}`);
        if (!ok) return;

        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i><span>Deleting</span>`;

        try {
          await deleteLibraryTrack(item);
        } catch (err) {
          console.error("Delete failed", err);
          window.alert(err?.message || "Delete failed.");
          btn.disabled = false;
          btn.innerHTML = `<i class="fa-solid fa-trash"></i><span>Delete from library</span>`;
        }
      },
    });

    const taggerBtn = buildIconActionButton({
      className: "moduleGhost",
      icon: "fa-solid fa-tags",
      label: "Open in Tagger",
      onClick: () => openTrackInModule("/tagger", item),
    });

    const masteringBtn = buildIconActionButton({
      className: "moduleGhost",
      icon: "fa-solid fa-sliders",
      label: "Open in Mastering",
      onClick: () => openTrackInModule("/mastering", item),
    });

    const converterBtn = buildIconActionButton({
      className: "moduleGhost",
      icon: "fa-solid fa-arrows-rotate",
      label: "Open in Converter",
      onClick: () => openTrackInModule("/converter", item),
    });

    meta.appendChild(title);
    meta.appendChild(sub);
    meta.appendChild(info);
    appendCloudLocalCopyNotice(meta, item);

    actions.appendChild(openBtn);
    actions.appendChild(deleteBtn);
    actions.appendChild(taggerBtn);
    actions.appendChild(masteringBtn);
    actions.appendChild(converterBtn);

    meta.appendChild(actions);

    row.appendChild(thumb);
    row.appendChild(meta);

    row.addEventListener("click", (e) => {
      if (e.target.closest(".actions")) return;
      previewTrack(item, { openPlayer: true });
      setTab("Library");
    });

    settingsFilesList.appendChild(row);
  });
}

/* queue */
function syncQueuePlaybackState(options = {}) {
  const { saveNow = false } = options;
  const current = currentTrack();

  renderQueue();
  updatePlayIcons();
  updateMiniProgressFill();
  updateSeekProgressFill();
  updateWaveProgress();

  if (current) {
    updateMediaSession(current);
  }

  if (settings.saveState) persistPlayerState();
  persistPlaybackPosition();

  if (saveNow) sendPlayerRuntimeStateNow();
}

function moveQueueItem(fromIndex, toIndex) {
  if (fromIndex < 0 || fromIndex >= queue.length) return;
  if (toIndex < 0 || toIndex >= queue.length) return;
  if (fromIndex === toIndex) return;

  const [item] = queue.splice(fromIndex, 1);
  queue.splice(toIndex, 0, item);

  if (queueIndex === fromIndex) {
    queueIndex = toIndex;
  } else if (fromIndex < queueIndex && toIndex >= queueIndex) {
    queueIndex -= 1;
  } else if (fromIndex > queueIndex && toIndex <= queueIndex) {
    queueIndex += 1;
  }

  syncQueuePlaybackState({ saveNow: true });
}

function removeQueueItem(index) {
  if (index < 0 || index >= queue.length) return;

  const wasCurrent = index === queueIndex;
  const removedTrack = queue[index];

  queue.splice(index, 1);

  queuePlayerEvent(
    "queue_remove",
    removedTrack,
    {
      flushNow: true,
    }
  );

  if (!queue.length) {
    queueIndex = -1;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    syncQueuePlaybackState({ saveNow: true });
    return;
  }

  if (index < queueIndex) {
    queueIndex -= 1;
  } else if (index === queueIndex) {
    queueIndex = Math.min(index, queue.length - 1);
  }

  syncQueuePlaybackState({ saveNow: true });

  if (wasCurrent) {
    playCurrent({ saveNow: true });
  }
}

function clearQueue() {
  const removedCount = queue.length;
  const previousTrack = currentTrack();

  queue = [];
  queueIndex = -1;

  if (removedCount) {
    queuePlayerEvent(
      "queue_clear",
      previousTrack,
      {
        count: removedCount,
        flushNow: true,
      }
    );
  }

  if (audio) {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }

  syncQueuePlaybackState({ saveNow: true });
}

function renderQueue() {
  if (!queueListEl) return;
  queueListEl.innerHTML = "";

  if (!queue.length) {
    queueListEl.innerHTML = `
      <div class="track trackEmptyState">
        <div class="meta">
          <div class="title">Queue is empty</div>
          <div class="sub">Add mixes from the Library, Playlists, Recents, or Favourites.</div>
        </div>
      </div>
    `;
    return;
  }

  const isActuallyPlaying = !!audio && !audio.paused;

  queue.forEach((track, idx) => {
    const row = document.createElement("div");
    row.className = `track queueTrack${idx === queueIndex ? " is-current" : ""}`;

    const thumb = document.createElement("div");
    thumb.className = "thumb";
    applyArtwork(thumb, track.hasArtwork ? getArtworkUrl(track) : "");

    const meta = document.createElement("div");
    meta.className = "meta";

    const title = document.createElement("div");
    title.className = "title";
    title.textContent = track.title || track.id;

    const sub = document.createElement("div");
    sub.className = "sub";
    sub.textContent = idx === queueIndex && isActuallyPlaying
      ? "Now playing"
      : `${idx + 1} of ${queue.length}${track.subtitle ? ` • ${track.subtitle}` : ""}`;

    meta.appendChild(title);
    meta.appendChild(sub);

    const actions = document.createElement("div");
    actions.className = "actions queueRowActions";

    const playBtn = document.createElement("button");
    if (idx === queueIndex && isActuallyPlaying) {
      playBtn.className = "pill primary playing";
      playBtn.innerHTML = `<i class="fa-solid fa-pause"></i><span>Pause</span>`;
      playBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleCurrentPlayback();
      });
    } else {
      playBtn.className = "pill primary";
      playBtn.innerHTML = `<i class="fa-solid fa-play"></i><span>${idx === queueIndex ? "Play" : "Play"}</span>`;
      playBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        playAt(idx, { openPlayer: true, saveNow: true });
      });
    }

    const upBtn = document.createElement("button");
    upBtn.className = "pill queueMoveBtn";
    upBtn.type = "button";
    upBtn.disabled = idx === 0;
    upBtn.innerHTML = `<i class="fa-solid fa-arrow-up"></i><span>Up</span>`;
    upBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      moveQueueItem(idx, idx - 1);
    });

    const downBtn = document.createElement("button");
    downBtn.className = "pill queueMoveBtn";
    downBtn.type = "button";
    downBtn.disabled = idx === queue.length - 1;
    downBtn.innerHTML = `<i class="fa-solid fa-arrow-down"></i><span>Down</span>`;
    downBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      moveQueueItem(idx, idx + 1);
    });

    const removeBtn = document.createElement("button");
    removeBtn.className = "pill danger queueRemoveBtn";
    removeBtn.type = "button";
    removeBtn.innerHTML = `<i class="fa-solid fa-trash"></i><span>Remove</span>`;
    removeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      removeQueueItem(idx);
    });

    actions.appendChild(playBtn);
    actions.appendChild(upBtn);
    actions.appendChild(downBtn);
    actions.appendChild(removeBtn);

    row.appendChild(thumb);
    row.appendChild(meta);
    row.appendChild(actions);

    row.addEventListener("click", () => {
      if (idx === queueIndex) {
        openNowPlaying();
        return;
      }

      playAt(idx, { openPlayer: true, saveNow: true });
    });

    queueListEl.appendChild(row);
  });
}

/* marquee */
function configureMarquee(trackEl) {
  if (!trackEl) return;
  const clip = trackEl.parentElement;
  if (!clip) return;

  const children = Array.from(trackEl.children);
  const first = children[0];
  const spacer = trackEl.querySelector(".marqueeSpacer");
  const second = children[2];
  if (!first || !spacer || !second) return;

  const baseText = (first.textContent || "").trim();
  second.textContent = "";

  trackEl.classList.remove("marqueeActive");
  trackEl.classList.add("marqueeStatic");
  trackEl.style.removeProperty("--marquee-distance");
  trackEl.style.removeProperty("--marquee-duration");
  trackEl.style.transform = "translateX(0)";
  spacer.style.display = "none";
  spacer.style.width = "0px";
  second.style.display = "none";

  const clipWidth = clip.clientWidth;
  const firstWidth = first.scrollWidth;
  if (!firstWidth || !clipWidth) return;
  if (firstWidth <= clipWidth + 6) return;

  spacer.style.display = "inline-block";
  spacer.style.width = "28px";
  second.style.display = "inline-block";
  second.textContent = baseText;

  const contentWidth = first.scrollWidth + 28;
  const distance = contentWidth;
  const duration = Math.max(10, Math.min(28, distance / 24));
  trackEl.style.setProperty("--marquee-distance", `${distance}px`);
  trackEl.style.setProperty("--marquee-duration", `${duration}s`);
  trackEl.classList.remove("marqueeStatic");

  void trackEl.offsetWidth;
  trackEl.classList.add("marqueeActive");
}

function resetMarqueeAnimation(el) {
  configureMarquee(el);
  requestAnimationFrame(() => configureMarquee(el));
  setTimeout(() => configureMarquee(el), 140);
}

/* now playing */
function setMiniMarquee(el, text) {
  if (!el) return;

  const safeText = normaliseText(text || "—") || "—";
  const safeHtml = escapeHtml(safeText);
  const currentText = normaliseText(el.dataset.marqueeText || "") || "";
  const currentTrack = el.querySelector(".miniMarqueeTrack");

  if (currentText === safeText && currentTrack) {
    if (!el.classList.contains("marqueeActive")) {
      requestAnimationFrame(() => {
        el.classList.add("marqueeActive");
      });
    }
    return;
  }

  el.dataset.marqueeText = safeText;
  el.classList.remove("marqueeActive");
  el.style.removeProperty("--mini-marquee-distance");
  el.style.removeProperty("--mini-marquee-duration");
  el.innerHTML = `
    <span class="miniMarqueeTrack">
      <span class="miniMarqueeText" data-mini-marquee-copy="1">${safeHtml}</span>
      <span class="miniMarqueeGap" aria-hidden="true"></span>
      <span class="miniMarqueeText" aria-hidden="true">${safeHtml}</span>
    </span>
  `;

  requestAnimationFrame(() => {
    const firstCopy = el.querySelector("[data-mini-marquee-copy='1']");
    const gap = el.querySelector(".miniMarqueeGap");
    const firstWidth = firstCopy?.getBoundingClientRect?.().width || 0;
    const gapWidth = gap?.getBoundingClientRect?.().width || 160;
    const distance = Math.max(1, Math.ceil(firstWidth + gapWidth));
    const duration = Math.max(12, Math.min(36, distance / 16));

    el.style.setProperty("--mini-marquee-distance", `${distance}px`);
    el.style.setProperty("--mini-marquee-duration", `${duration}s`);

    void el.offsetWidth;
    el.classList.add("marqueeActive");
  });
}

function ensureMiniSubTrackRefs() {
  if (!miniSub) return null;

  let base = miniSub.querySelector("#miniSubBase");
  let wrap = miniSub.querySelector("#miniSubTimedWrap");
  let track = miniSub.querySelector("#miniSubTimedTrack");
  let textA = miniSub.querySelector("#miniSubTimedTextA");
  let textB = miniSub.querySelector("#miniSubTimedTextB");

  if (!base || !wrap || !track || !textA || !textB) {
    miniSub.innerHTML = `
      <span id="miniSubBase" class="miniSubBase">—</span>
      <span id="miniSubTimedWrap" class="miniSubTimedWrap hidden">
        <span class="miniSubTimedSep">•</span>
        <span class="miniSubTimedClip">
          <span id="miniSubTimedTrack" class="miniSubTimedTrack marqueeTrack">
            <span id="miniSubTimedTextA">—</span>
            <span class="marqueeSpacer"></span>
            <span id="miniSubTimedTextB">—</span>
          </span>
        </span>
      </span>
    `;
    base = miniSub.querySelector("#miniSubBase");
    wrap = miniSub.querySelector("#miniSubTimedWrap");
    track = miniSub.querySelector("#miniSubTimedTrack");
    textA = miniSub.querySelector("#miniSubTimedTextA");
    textB = miniSub.querySelector("#miniSubTimedTextB");
  }

  return { base, wrap, track, textA, textB };
}

function setMiniSubLine(baseText, timedTitle = "") {
  if (!miniSub) return;
  setMiniMarquee(miniSub, baseText || timedTitle || "—");
}

function getMiniPlayerLines(track, timedTitle = "") {
  const clean = (value) => normaliseText(value || "").trim();

  if (!track) {
    return {
      top: "Nothing playing",
      bottom: "Select a mix to start",
    };
  }

  const mainTitle =
    clean(getTracklistMetaValue("Title")) ||
    clean(track.title) ||
    clean(track.id) ||
    "Nothing playing";

  const artist =
    clean(getTracklistMetaValue("Artist")) ||
    clean(track.artist) ||
    clean(track.albumArtist) ||
    "";

  const fallbackSub =
    clean(track.subtitle) ||
    clean(track.album) ||
    mainTitle;

  const timed = clean(timedTitle);

  if (timed) {
    return {
      top: timed,
      bottom: artist ? `${mainTitle} - ${artist}` : mainTitle,
    };
  }

  return {
    top: mainTitle,
    bottom: artist || fallbackSub,
  };
}

function ensureNowPlayingCurrentTrackRefs() {
  const host = npSubTrack?.closest(".npMeta");
  const subLine = npSubTrack?.closest(".marqueeLine");
  if (!host || !subLine) return null;

  let line = host.querySelector("#npCurrentTrackLine");
  if (!line) {
    line = document.createElement("div");
    line.id = "npCurrentTrackLine";
    line.className = "currentTrackLine hidden";
    line.innerHTML = `
      <span class="currentTrackLabel">Currently playing:</span>
      <div class="currentTrackClip">
        <div id="npCurrentTrackMarquee" class="marqueeTrack currentTrackMarquee">
          <span id="npCurrentTrackTextA">—</span>
          <span class="marqueeSpacer"></span>
          <span id="npCurrentTrackTextB">—</span>
        </div>
      </div>
    `;
    subLine.insertAdjacentElement("afterend", line);
  }

  return {
    line,
    track: line.querySelector("#npCurrentTrackMarquee"),
    textA: line.querySelector("#npCurrentTrackTextA"),
    textB: line.querySelector("#npCurrentTrackTextB"),
  };
}

function getTimedTrackEntries() {
  const tracks = Array.isArray(currentTracklistData?.tracks) ? currentTracklistData.tracks : [];

  return tracks
    .map((track) => {
      const seconds = getTracklistEntrySeconds(track);
      return {
        ...track,
        seconds,
      };
    })
    .filter((track) => track.seconds !== null && Number.isFinite(track.seconds))
    .sort((a, b) => a.seconds - b.seconds);
}

function getTimedTrackNavigationState() {
  if (!audio) {
    return { tracks: [], activeIndex: -1, prevTrack: null, nextTrack: null };
  }

  const tracks = getTimedTrackEntries();
  if (!tracks.length) {
    return { tracks: [], activeIndex: -1, prevTrack: null, nextTrack: null };
  }

  const currentSeconds = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
  let activeIndex = -1;

  for (let i = 0; i < tracks.length; i += 1) {
    if (tracks[i].seconds <= currentSeconds + 0.25) {
      activeIndex = i;
    }
  }

  const activeTrack = activeIndex >= 0 ? tracks[activeIndex] : null;

  const prevTrack = activeTrack
    ? (currentSeconds - activeTrack.seconds > 3 ? activeTrack : (tracks[activeIndex - 1] || null))
    : null;

  const nextTrack = tracks.find((track) => track.seconds > currentSeconds + 0.75) || null;

  return { tracks, activeIndex, prevTrack, nextTrack };
}

function getCurrentTimedTrack() {
  const { tracks, activeIndex } = getTimedTrackNavigationState();
  return activeIndex >= 0 ? tracks[activeIndex] : null;
}

function updateTimedSkipButtons() {
  const { prevTrack, nextTrack } = getTimedTrackNavigationState();

  if (btnTimedPrev) {
    const disabled = !prevTrack;
    btnTimedPrev.disabled = disabled;
    btnTimedPrev.classList.toggle("is-disabled", disabled);
    btnTimedPrev.classList.toggle("is-available", !disabled);
    btnTimedPrev.setAttribute("aria-disabled", disabled ? "true" : "false");
  }

  if (btnTimedNext) {
    const disabled = !nextTrack;
    btnTimedNext.disabled = disabled;
    btnTimedNext.classList.toggle("is-disabled", disabled);
    btnTimedNext.classList.toggle("is-available", !disabled);
    btnTimedNext.setAttribute("aria-disabled", disabled ? "true" : "false");
  }
}

function updateCurrentTimedTrackUI() {
  const actualTrack = currentTrack() || queue[queueIndex] || getPreviewTrack();
  const timedTrackTitle = getTracklistTimedDisplay(getCurrentTimedTrack()?.title || "");
  const safeTimedTitle = normaliseText(timedTrackTitle);
  const showTimedOnMini = !!safeTimedTitle && !isPreviewingDifferentTrack();
  const miniLines = getMiniPlayerLines(actualTrack, showTimedOnMini ? safeTimedTitle : "");

  updateTimedSkipButtons();

  if (nowPlayingModal) {
    nowPlayingModal.classList.toggle(
      "hasTimedTrackLine",
      !!safeTimedTitle && !isPreviewingDifferentTrack()
    );
  }

  setMiniMarquee(miniTitle, miniLines.top);
  setMiniSubLine(miniLines.bottom, "");

  const refs = ensureNowPlayingCurrentTrackRefs();

  if (refs) {
    const wasHidden = refs.line.classList.contains("hidden");
    const previousTimedTitle = refs.track.dataset.timedTitle || "";

    if (isPreviewingDifferentTrack() || !safeTimedTitle) {
      refs.line.classList.add("hidden");
      refs.track.dataset.timedTitle = "";
      refs.textA.textContent = "";
      refs.textB.textContent = "";
      refs.track.classList.remove("marqueeActive", "marqueeStatic");
      refs.track.style.removeProperty("--marquee-distance");
      refs.track.style.removeProperty("--marquee-duration");
      refs.track.style.transform = "translateX(0)";
    } else {
      refs.line.classList.remove("hidden");

      if (wasHidden || previousTimedTitle !== safeTimedTitle) {
        refs.track.dataset.timedTitle = safeTimedTitle;
        refs.textA.textContent = safeTimedTitle;
        refs.textB.textContent = safeTimedTitle;
        resetMarqueeAnimation(refs.track);
        requestAnimationFrame(() => configureMarquee(refs.track));
        setTimeout(() => configureMarquee(refs.track), 140);
      }
    }
  }

  if (actualTrack) {
    updateMediaSession(actualTrack, safeTimedTitle);
  }

  updateStageCurrentTrackBoxText(safeTimedTitle);
  updateStageTracklistHighlight();
}

function configureAllMarquees() {
  configureMarquee(npTitleTrack);
  configureMarquee(npSubTrack);

  const miniRefs = ensureMiniSubTrackRefs();
  if (miniRefs && !miniRefs.wrap.classList.contains("hidden")) {
    configureMarquee(miniRefs.track);
  }

  const timedRefs = ensureNowPlayingCurrentTrackRefs();
  if (timedRefs && !timedRefs.line.classList.contains("hidden")) {
    configureMarquee(timedRefs.track);
  }
}

async function setNowPlayingUI(track) {
  const token = ++nowPlayingRenderToken;

  if (!track) {
    tracklistLoadToken += 1;
    currentTracklistData = null;
    currentTracklistSourceKind = "none";
    previewTrackId = "";

    setMiniMarquee(miniTitle, "Nothing playing");
    setMiniSubLine("Pick a mix to start", "");

    if (npTitleTextA) npTitleTextA.textContent = "—";
    if (npTitleTextB) npTitleTextB.textContent = "—";
    if (npSubTextA) npSubTextA.textContent = "—";
    if (npSubTextB) npSubTextB.textContent = "—";

    resetMarqueeAnimation(npTitleTrack);
    resetMarqueeAnimation(npSubTrack);

    const timedRefs = ensureNowPlayingCurrentTrackRefs();
    if (timedRefs) timedRefs.line.classList.add("hidden");

    renderTracklistEmpty("No tracklist loaded.");
    renderArtwork(null);
    renderMixBadge(null);
    updateFileInfoLine(null);
    updateFavouriteQuickButton();
    await renderWaveformPlaceholder();
    renderBookmarks();
    updateCurrentTimedTrackUI();
    return;
  }

  const hydrated = await fetchTrackMeta(track);
  if (token !== nowPlayingRenderToken) return;

  queue = queue.map((item, index) => (index === queueIndex ? hydrated : item));
  previewTrackId = hydrated.id || "";

  const titleText = hydrated.title || hydrated.id;
  const subText = hydrated.subtitle || "Local • BRMedia";
  const miniLines = getMiniPlayerLines(hydrated);

  setMiniMarquee(miniTitle, miniLines.top || titleText);
  setMiniSubLine(miniLines.bottom || subText || "—", "");
  updateMiniProgressFill();

  if (npTitleTextA) npTitleTextA.textContent = titleText;
  if (npTitleTextB) npTitleTextB.textContent = titleText;
  if (npSubTextA) npSubTextA.textContent = subText;
  if (npSubTextB) npSubTextB.textContent = subText;

  resetMarqueeAnimation(npTitleTrack);
  resetMarqueeAnimation(npSubTrack);
  requestAnimationFrame(() => configureAllMarquees());
  setTimeout(() => configureAllMarquees(), 180);

  renderArtwork(hydrated, { updateMain: true, updateMini: true });
  renderMixBadge(hydrated);
  updateFileInfoLine(hydrated);
  updateFavouriteQuickButton();
  renderQueue();
  await renderWaveformPlaceholder(hydrated);
  updateMediaSession(hydrated);
  await loadTracklist(hydrated.id);
  updateTracklistProgress();
  updateCurrentTimedTrackUI();
  renderBookmarks();

  if (isStagePlayerOpen()) {
    await syncStagePlayerUI(hydrated);
  }
}

function playCurrentAudio() {
  if (!audio) return;

  const tryPlay = () => {
    audio.play().then(() => updatePlayIcons()).catch(() => updatePlayIcons());
  };

  tryPlay();

  const retry = () => {
    audio.removeEventListener("canplay", retry);
    audio.removeEventListener("loadedmetadata", retry);
    tryPlay();
  };

  audio.addEventListener("canplay", retry, { once: true });
  audio.addEventListener("loadedmetadata", retry, { once: true });
}

function setAudioSourceForCurrentTrack(track, opts = {}) {
  if (!track || !audio) return;

  const { resetTime = true } = opts;
  const streamUrl = getTrackStreamUrl(track);
  const currentSrc = audio.getAttribute("src") || "";
  const sameSource = currentSrc === streamUrl;

  if (!sameSource) {
    audio.src = streamUrl;
    audio.load();
    tracklistLoadToken += 1;
    currentTracklistData = null;
    currentTracklistSourceKind = "none";
    queuePlayerEvent("track_load", track);
  }

  if (resetTime) {
    try {
      audio.currentTime = 0;
    } catch {}
  }

  audio.pause();

  if (resetTime) {
    if (seek) seek.value = "0";
    if (timeCur) timeCur.textContent = "0:00";
    if (timeRem) timeRem.textContent = "-0:00";
  }

  updateSeekProgressFill();
  updateMiniProgressFill();
  updateWaveProgress();
  updateCurrentTimedTrackUI();
}

/* queue transport */
function addToQueue(track) {
  queue.push(track);
  queuePlayerEvent("queue_add", track);
  if (queueIndex === -1) queueIndex = 0;
  renderQueue();
  if (settings.saveState) persistPlayerState();
  queuePlayerRuntimeStateSave?.();
}

async function previewTrack(track, opts = {}) {
  const { openPlayer = true } = opts;
  if (!track) return;

  if (openPlayer) openNowPlaying();

  const hydrated = await fetchTrackMeta(track);
  previewTrackId = hydrated.id || "";

  const titleText = hydrated.title || hydrated.id;
  const subText = hydrated.subtitle || "Local • BRMedia";

  if (npTitleTextA) npTitleTextA.textContent = titleText;
  if (npTitleTextB) npTitleTextB.textContent = titleText;
  if (npSubTextA) npSubTextA.textContent = subText;
  if (npSubTextB) npSubTextB.textContent = subText;

  resetMarqueeAnimation(npTitleTrack);
  resetMarqueeAnimation(npSubTrack);
  requestAnimationFrame(() => configureAllMarquees());
  setTimeout(() => configureAllMarquees(), 180);

  renderArtwork(hydrated, { updateMain: true, updateMini: false });
  renderMixBadge(hydrated);
  updateFileInfoLine(hydrated);

  if (seek) seek.value = "0";
  if (timeCur) timeCur.textContent = "0:00";
  if (timeRem) timeRem.textContent = `-${fmtTime(Math.max(0, hydrated.duration || 0))}`;

  updateSeekProgressFill();
  updatePlayIcons();
  await renderWaveformPlaceholder(hydrated);
  await loadTracklist(hydrated.id);
  updateTracklistProgress();
  updateCurrentTimedTrackUI();

  if (isStagePlayerOpen()) {
    await syncStagePlayerUI(hydrated);
  }

}

function loadTrackIntoPlayer(track, opts = {}) {
  const { openPlayer = true, autoplay = false } = opts;

  queue = [track];
  queueIndex = 0;
  previewTrackId = "";

  const current = currentTrack();
  if (!current || !audio) return;

  markTrackAsRecent(current);
  setAudioSourceForCurrentTrack(current);
  updateMediaSession(current);

  void setNowPlayingUI(current).then(() => {
    syncQueuePlaybackState({ saveNow: true });
  });
  renderQueue();
  renderLibrary();
  updatePlayIcons();

  if (settings.saveState) persistPlayerState();

  if (openPlayer) openNowPlaying();

  if (autoplay) {
    playCurrentAudio();
  }
}

function playNow(track) {
  loadTrackIntoPlayer(track, { openPlayer: true, autoplay: true });
  setTab("Library");
}

function playAt(idx, options = {}) {
  const { openPlayer = true, saveNow = true } = options;
  if (idx < 0 || idx >= queue.length) return;
  queueIndex = idx;

  const current = currentTrack();
  if (!current || !audio) return;

  markTrackAsRecent(current);
  setAudioSourceForCurrentTrack(current);
  updateMediaSession(current);

  void setNowPlayingUI(current).then(() => {
    syncQueuePlaybackState({ saveNow });
  });

  renderQueue();
  renderLibrary();
  if (openPlayer) openNowPlaying();

  playCurrentAudio();
  if (settings.saveState) persistPlayerState();
  if (saveNow) sendPlayerRuntimeStateNow();
}

function shuffledOrder(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function applyShuffleIfNeeded() {
  if (!settings.shuffle) return;
  const current = currentTrack();
  if (!current) return;
  const rest = queue.filter((_, idx) => idx !== queueIndex);
  queue = [current, ...shuffledOrder(rest)];
  queueIndex = 0;
  renderQueue();
}

function playCurrent(options = {}) {
  const { saveNow = false } = options;
  const track = currentTrack();
  if (!track || !audio) return;

  applyShuffleIfNeeded();
  const current = currentTrack();
  if (!current) return;

  markTrackAsRecent(current);
  setAudioSourceForCurrentTrack(current);
  updateMediaSession(current);

  void setNowPlayingUI(current).then(() => {
    syncQueuePlaybackState({ saveNow });
  });

  renderQueue();
  renderLibrary();

  playCurrentAudio();
  lastPlaybackPersistAt = performance.now();
  persistPlaybackPosition();

  if (settings.saveState) persistPlayerState();
  if (saveNow) sendPlayerRuntimeStateNow();
}

function prev() {
  if (!audio) return;

  const skippedTrack =
    currentTrack();

  const skippedPosition =
    Number(
      audio.currentTime ||
      0
    );

  if (
    audio.currentTime >
    5
  ) {
    queuePlayerEvent(
      "skip_previous",
      skippedTrack,
      {
        position:
          skippedPosition,
        status:
          "restart_track",
        flushNow:
          true,
      }
    );

    audio.currentTime =
      0;

    syncQueuePlaybackState({
      saveNow:
        true,
    });

    return;
  }

  if (
    queueIndex >
    0
  ) {
    queuePlayerEvent(
      "skip_previous",
      skippedTrack,
      {
        position:
          skippedPosition,
        status:
          "previous_queue_item",
        flushNow:
          true,
      }
    );

    queueIndex -=
      1;

    playCurrent({
      saveNow:
        true,
    });
  } else {
    audio.currentTime =
      0;

    syncQueuePlaybackState({
      saveNow:
        true,
    });
  }
}

function next() {
  if (!audio) return;

  const skippedTrack =
    currentTrack();

  const skippedPosition =
    Number(
      audio.currentTime ||
      0
    );

  if (
    settings.repeatMode ===
    "one"
  ) {
    queuePlayerEvent(
      "skip_next",
      skippedTrack,
      {
        position:
          skippedPosition,
        status:
          "repeat_one",
        flushNow:
          true,
      }
    );

    audio.currentTime =
      0;

    audio
      .play()
      .catch(
        () => {}
      );

    syncQueuePlaybackState({
      saveNow:
        true,
    });

    return;
  }

  if (
    queueIndex +
    1 <
    queue.length
  ) {
    queuePlayerEvent(
      "skip_next",
      skippedTrack,
      {
        position:
          skippedPosition,
        status:
          "next_queue_item",
        flushNow:
          true,
      }
    );

    queueIndex +=
      1;

    playCurrent({
      saveNow:
        true,
    });

    return;
  }

  if (
    settings.repeatMode ===
      "all" &&
    queue.length >
      0
  ) {
    queuePlayerEvent(
      "skip_next",
      skippedTrack,
      {
        position:
          skippedPosition,
        status:
          "repeat_all",
        flushNow:
          true,
      }
    );

    queueIndex =
      0;

    playCurrent({
      saveNow:
        true,
    });
  }
}

function updatePlayIcons() {
  const current = currentTrack();
  const hasTrackLoaded = !!audio && !!audio.src && !!current;
  const paused = !audio || audio.paused;
  const showingPreviewTrack = isShowingPreviewTrack();
  const hasPreviewTrack = !!getPreviewTrack();

  const miniPlaying = hasTrackLoaded && !paused;
  const modalPlaying = hasTrackLoaded && !paused && !showingPreviewTrack;
  const modalHasTrack = modalPlaying || showingPreviewTrack || hasPreviewTrack || hasTrackLoaded;

  setBrFaIconClass(
    btnPlayIcon,
    miniPlaying
      ? "fa-solid fa-pause transportFa playFa"
      : "fa-solid fa-play transportFa playFa"
  );

  setBrFaIconClass(
    btnNPPlayIcon,
    modalPlaying
      ? "fa-solid fa-pause transportFa playFa"
      : "fa-solid fa-play transportFa playFa"
  );

  if (imgPlayState) {
    imgPlayState.src = miniPlaying ? "/player/icons/pause.svg" : "/player/icons/play.svg";
  }

  if (btnPlay) {
    btnPlay.setAttribute("aria-label", miniPlaying ? "Pause" : "Play");
    btnPlay.classList.toggle("is-playing", miniPlaying);
  }

  if (btnMiniEq) {
    btnMiniEq.classList.toggle("is-playing", miniPlaying);
  }

  if (miniPlayer) {
    miniPlayer.classList.toggle("is-playing", miniPlaying);
  }

  if (btnNPPlay) {
    btnNPPlay.setAttribute("aria-label", modalPlaying ? "Pause" : "Play");
    btnNPPlay.classList.toggle("active", modalPlaying);
    btnNPPlay.classList.toggle("loaded", !modalPlaying && modalHasTrack);
    btnNPPlay.classList.toggle("unplayed", !modalHasTrack);
    btnNPPlay.setAttribute("aria-pressed", modalPlaying ? "true" : "false");
  }

  setStagePlayerPausedState();
  updateShuffleButton();
  updateRepeatButton();
  renderLibrary();
  renderQueue();
  renderLists();
  renderFavourites();
  renderRecents();
  renderPlaylists();
}

function togglePlay() {
  if (!audio) return;

  const previewTrack = getPreviewTrack();

  if (isShowingPreviewTrack() && previewTrack) {
    requestTrackPlay(previewTrack, { openPlayer: true, autoplay: true });
    return;
  }

  if (!audio.src) {
    const track = currentTrack() || previewTrack || library[0];
    if (track) {
      if (queue.length === 0 || !currentTrack()) {
        queue = [track];
        queueIndex = 0;
      }
      playCurrent();
    }
    return;
  }

  if (audio.paused) {
    audio.play().then(() => updatePlayIcons()).catch(() => updatePlayIcons());
  } else {
    audio.pause();
    updatePlayIcons();
  }
}

function toggleCurrentPlayback() {
  if (!audio) return;

  if (isPreviewingDifferentTrack()) {
    syncPreviewBackToCurrentTrack();
    void setNowPlayingUI(currentTrack());
  }

  const track = currentTrack() || library[0] || null;

  if (!audio.src) {
    if (!track) return;

    if (queue.length === 0 || !currentTrack()) {
      queue = [track];
      queueIndex = 0;
    }

    playCurrent();
    return;
  }

  if (audio.paused) {
    audio.play().then(() => updatePlayIcons()).catch(() => updatePlayIcons());
  } else {
    audio.pause();
    updatePlayIcons();
  }
}

const PLAYER_STATE_KEY = "brmedia_state";
const PLAYER_POSITION_KEY = "brmedia_pos";
const TRACK_PROGRESS_KEY = "brmedia_track_progress_v1";

let trackProgressStore = loadTrackProgressStore();
let playerStateRestoredOnce = false;
let pendingRestoreSeek = null;

function loadTrackProgressStore() {
  try {
    const raw = localStorage.getItem(TRACK_PROGRESS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveTrackProgressStore() {
  try {
    const entries = Object.entries(trackProgressStore)
      .sort((a, b) => Number(b[1]?.savedAt || 0) - Number(a[1]?.savedAt || 0))
      .slice(0, 600);

    trackProgressStore = Object.fromEntries(entries);
    localStorage.setItem(TRACK_PROGRESS_KEY, JSON.stringify(trackProgressStore));
  } catch {}
}

function getTrackProgressSnapshot(limit = 300) {
  try {
    return Object.fromEntries(
      Object.entries(trackProgressStore || {})
        .sort((a, b) => Number(b[1]?.savedAt || 0) - Number(a[1]?.savedAt || 0))
        .slice(0, limit)
    );
  } catch {
    return {};
  }
}

function buildPlayerRuntimeSnapshot() {
  return {
    state: readPersistedJson(PLAYER_STATE_KEY, null),
    position: readPersistedJson(PLAYER_POSITION_KEY, null),
    trackProgress: getTrackProgressSnapshot(),
    savedAt: Date.now(),
  };
}

let playerRuntimeSaveTimer = 0;

async function savePlayerRuntimeStateToServer() {
  try {
    await fetch("/player/runtime-state", {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPlayerRuntimeSnapshot()),
    });
  } catch {}
}

function queuePlayerRuntimeStateSave(delayMs = 2200) {
  if (!settings.savePos && !settings.saveState) return;
  if (playerRuntimeSaveTimer) clearTimeout(playerRuntimeSaveTimer);
  playerRuntimeSaveTimer = window.setTimeout(() => {
    playerRuntimeSaveTimer = 0;
    void savePlayerRuntimeStateToServer();
  }, delayMs);
}

function sendPlayerRuntimeStateNow() {
  try {
    const body = JSON.stringify(buildPlayerRuntimeSnapshot());
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/player/runtime-state", new Blob([body], { type: "application/json" }));
      return;
    }

    void fetch("/player/runtime-state", {
      method: "POST",
      cache: "no-store",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body,
    });
  } catch {}
}

let playerEventQueue = [];
let playerEventFlushTimer = 0;

function buildPlayerEventExtra(extra = {}) {
  const reserved =
    new Set([
      "flushNow",
      "route",
      "status",
      "value",
      "count",
      "position",
      "duration",
    ]);

  return Object.fromEntries(
    Object.entries(extra)
      .filter(
        ([key, value]) =>
          !reserved.has(key) &&
          [
            "string",
            "number",
            "boolean",
          ]
            .includes(
              typeof value
            )
      )
      .slice(
        0,
        20
      )
  );
}

function buildPlayerEvent(type, track = currentTrack(), extra = {}) {
  const position = Number(extra.position ?? audio?.currentTime ?? 0);
  const duration = Number(extra.duration ?? audio?.duration ?? track?.duration ?? 0);

  return {
    type,
    trackId: track?.id || "",
    title: track?.title || track?.name || "",
    artist: track?.artist || track?.subtitle || "",
    source: isGoogleDriveLinkedTrack(track) ? "google_drive" : (track?.source || "local"),
    route: extra.route || "player",
    status: extra.status || "",
    value: Number.isFinite(Number(extra.value)) ? Number(extra.value) : 0,
    count: Math.max(1, Number(extra.count || 1)),
    position: Number.isFinite(position) ? position : 0,
    duration: Number.isFinite(duration) ? duration : 0,
    isCloud: isGoogleDriveLinkedTrack(track),
    extra: buildPlayerEventExtra(extra),
    at: Date.now(),
    at: Date.now(),
  };
}

function queuePlayerEvent(type, track = currentTrack(), extra = {}) {
  if (!type) return;

  playerEventQueue.push(buildPlayerEvent(type, track, extra));
  playerEventQueue = playerEventQueue.slice(-40);

  if (extra.flushNow) {
    flushPlayerEventsNow();
    return;
  }

  if (playerEventFlushTimer) clearTimeout(playerEventFlushTimer);
  playerEventFlushTimer = window.setTimeout(flushPlayerEventsNow, 1800);
}

function flushPlayerEventsNow() {
  if (playerEventFlushTimer) {
    clearTimeout(playerEventFlushTimer);
    playerEventFlushTimer = 0;
  }

  if (!playerEventQueue.length) return;

  const events = playerEventQueue.splice(0, playerEventQueue.length);
  const body = JSON.stringify({ events });

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/player/events", new Blob([body], { type: "application/json" }));
      return;
    }
  } catch {}

  fetch("/player/events", {
    method: "POST",
    cache: "no-store",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body,
  }).catch(() => {
    playerEventQueue = [...events, ...playerEventQueue].slice(-40);
  });
}

async function pullServerPlayerStateIfNewer() {
  try {
    const data = await getJsonNoStore("/player/runtime-state");
    const serverSnapshot = data?.state;
    if (!serverSnapshot || typeof serverSnapshot !== "object") return;

    const localState = readPersistedJson(PLAYER_STATE_KEY, null) || {};
    const localPosition = readPersistedJson(PLAYER_POSITION_KEY, null) || {};
    const localSavedAt = Math.max(Number(localState.savedAt || 0), Number(localPosition.savedAt || 0));

    const serverState = serverSnapshot.state || {};
    const serverPosition = serverSnapshot.position || {};
    const serverSavedAt = Math.max(
      Number(serverState.savedAt || 0),
      Number(serverPosition.savedAt || 0),
      Number(serverSnapshot.savedAt || 0)
    );

    if (serverSavedAt > localSavedAt) {
      if (serverSnapshot.state) writePersistedJson(PLAYER_STATE_KEY, serverSnapshot.state);
      if (serverSnapshot.position) writePersistedJson(PLAYER_POSITION_KEY, serverSnapshot.position);

      if (serverSnapshot.trackProgress && typeof serverSnapshot.trackProgress === "object") {
        trackProgressStore = {
          ...trackProgressStore,
          ...serverSnapshot.trackProgress,
        };
        saveTrackProgressStore();
      }
    }
  } catch {}
}

function persistTrackProgress(track = currentTrack()) {
  try {
    if (!track?.id || !audio) return;

    const time = Number(audio.currentTime || 0);
    const duration = Number(audio.duration || track.duration || 0);

    if (!Number.isFinite(duration) || duration <= 0) return;

    const percent = Math.max(0, Math.min(100, (time / duration) * 100));

    trackProgressStore[track.id] = {
      time,
      duration,
      percent,
      complete: percent >= 98 || !!audio.ended,
      savedAt: Date.now(),
    };

    saveTrackProgressStore();
  } catch {}
}

function getTrackProgressPercent(track) {
  if (!track?.id) return 0;

  const current = currentTrack();

  if (current?.id === track.id && audio && Number.isFinite(audio.duration) && audio.duration > 0) {
    return Math.max(0, Math.min(100, (Number(audio.currentTime || 0) / audio.duration) * 100));
  }

  const saved = trackProgressStore[track.id];
  const percent = Number(saved?.percent || 0);

  return Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0;
}

function buildTrackCardProgressElement() {
  const progress = document.createElement("div");
  progress.className = "trackCardProgress";
  progress.innerHTML = "<span></span>";
  return progress;
}

function decorateTrackCardProgress(row, track) {
  if (!row || !track?.id) return;

  const percent = getTrackProgressPercent(track);
  row.dataset.trackId = track.id;
  row.style.setProperty("--mix-progress", `${percent}%`);
  row.classList.toggle("has-mix-progress", percent > 0.5);
}

function updateTrackCardProgressBars() {
  try {
    document.querySelectorAll(".trackMediaCard[data-track-id]").forEach((row) => {
      const trackId = row.dataset.trackId;
      const track = findTrackById(trackId) || { id: trackId };
      decorateTrackCardProgress(row, track);
    });
  } catch {}
}

function persistPlayerState() {
  try {
    const track = currentTrack();

    const state = {
      queue,
      queueIndex,
      lastTrackId: track?.id || "",
      lastTime: audio?.src ? Number(audio.currentTime || 0) : 0,
      shuffle: settings.shuffle,
      repeatMode: settings.repeatMode,
      miniPlayerCollapsed,
      savedAt: Date.now(),
    };

    writePersistedJson(PLAYER_STATE_KEY, state);
    queuePlayerRuntimeStateSave();
  } catch {}
}

function persistPlaybackPosition() {
  try {
    const track = currentTrack();
    if (!track || !track.id || !audio || !audio.src) return;

    const payload = {
      id: track.id,
      title: track.title || "",
      artist: track.artist || "",
      time: Number(audio.currentTime || 0),
      duration: Number(audio.duration || track.duration || 0),
      savedAt: Date.now(),
    };

    writePersistedJson(PLAYER_POSITION_KEY, payload);
    persistTrackProgress(track);
    persistPlayerState();
    queuePlayerRuntimeStateSave();
  } catch {}
}

function getSavedPlaybackSnapshot(track = currentTrack()) {
  try {
    const trackId = String(track?.id || "").trim();
    if (!trackId) return null;

    const candidates = [];

    const position = readPersistedJson(PLAYER_POSITION_KEY, null);
    if (position?.id === trackId) {
      candidates.push({
        id: trackId,
        time: Number(position.time || 0),
        duration: Number(position.duration || 0),
        savedAt: Number(position.savedAt || 0),
      });
    }

    const progress = trackProgressStore?.[trackId];
    if (progress) {
      candidates.push({
        id: trackId,
        time: Number(progress.time || 0),
        duration: Number(progress.duration || 0),
        savedAt: Number(progress.savedAt || 0),
      });
    }

    const state = readPersistedJson(PLAYER_STATE_KEY, null);
    if (state?.lastTrackId === trackId) {
      candidates.push({
        id: trackId,
        time: Number(state.lastTime || 0),
        duration: Number(track.duration || 0),
        savedAt: Number(state.savedAt || 0),
      });
    }

    return candidates
      .filter((item) => Number.isFinite(item.time) && item.time > 1)
      .sort((a, b) => Number(b.savedAt || 0) - Number(a.savedAt || 0))[0] || null;
  } catch {
    return null;
  }
}

function applyRestoredPlaybackTime(snapshot) {
  try {
    if (!audio || !snapshot) return;

    const track = currentTrack();
    const trackId = String(track?.id || "").trim();

    if (!trackId || snapshot.id !== trackId) return;

    const savedTime = Number(snapshot.time || 0);
    if (!Number.isFinite(savedTime) || savedTime <= 1) return;

    pendingRestoreSeek = {
      id: trackId,
      time: savedTime,
      savedAt: Number(snapshot.savedAt || Date.now()),
    };

    const applySavedTime = () => {
      const current = currentTrack();
      if (!current || current.id !== pendingRestoreSeek?.id) return;

      const duration = Number(audio.duration || snapshot.duration || current.duration || 0);
      const maxTime = Number.isFinite(duration) && duration > 0
        ? Math.max(0, duration - 3)
        : savedTime;

      audio.currentTime = Math.max(0, Math.min(savedTime, maxTime));

      if (seek && audio.duration) {
        seek.value = String(Math.floor((audio.currentTime / audio.duration) * 1000));
      }

      if (timeCur) timeCur.textContent = fmtTime(audio.currentTime || 0);
      if (timeRem) timeRem.textContent = `-${fmtTime(Math.max(0, (audio.duration || duration || 0) - (audio.currentTime || 0)))}`;

      updateSeekProgressFill();
      updateMiniProgressFill();
      updateWaveProgress();
      updateStageWaveProgress();
      updateTracklistProgress();
      updateCurrentTimedTrackUI();
      updateStageTimeRow();

      pendingRestoreSeek = null;
    };

    if (audio.readyState >= 1) {
      window.setTimeout(applySavedTime, 0);
    } else {
      audio.addEventListener("loadedmetadata", applySavedTime, { once: true });
    }
  } catch {}
}

function restorePlaybackPosition(track = currentTrack()) {
  try {
    const snapshot = getSavedPlaybackSnapshot(track);
    applyRestoredPlaybackTime(snapshot);
  } catch {}
}

function restorePlayerState() {
  if (playerStateRestoredOnce) return;
  playerStateRestoredOnce = true;

  try {
    const state = readPersistedJson(PLAYER_STATE_KEY, null) || {};
    const position = readPersistedJson(PLAYER_POSITION_KEY, null) || {};

    const resumeTrackId = String(state.lastTrackId || position.id || "").trim();

    const savedQueue = Array.isArray(state.queue)
      ? state.queue.map((item) => findTrackById(item?.id) || hydrateTrack(item)).filter(Boolean)
      : [];

    if (savedQueue.length) {
      queue = savedQueue;

      const resumeIndex = resumeTrackId
        ? savedQueue.findIndex((item) => item?.id === resumeTrackId)
        : -1;

      queueIndex = resumeIndex >= 0
        ? resumeIndex
        : Number.isFinite(state.queueIndex)
          ? Math.max(0, Math.min(savedQueue.length - 1, Number(state.queueIndex)))
          : 0;
    } else if (resumeTrackId) {
      const savedTrack = findTrackById(resumeTrackId);
      if (savedTrack) {
        queue = [savedTrack];
        queueIndex = 0;
      }
    }

    if (typeof state.repeatMode === "string") settings.repeatMode = state.repeatMode;

    if (typeof state.miniPlayerCollapsed === "boolean") {
      miniPlayerCollapsed = state.miniPlayerCollapsed;
      applyMiniPlayerCollapsedState();
    }

    renderQueue();
    updateRepeatButton();

    const track = currentTrack();
    if (!track) return;

    setAudioSourceForCurrentTrack(track, { resetTime: false });
    renderArtwork(track, { updateMain: true, updateMini: true });
    updateMiniProgressFill();

    void setNowPlayingUI(track).then(() => {
      restorePlaybackPosition(track);
      updatePlayIcons();
      updateMiniProgressFill();
    });

    restorePlaybackPosition(track);
    updatePlayIcons();

    showBookmarkToast("Continue listening", `${track.title || "Last mix"} restored`);
  } catch {}
}

function updateMediaSession(track, timedTitle = "") {
  if (!("mediaSession" in navigator) || !track) return;
  if (!settings.mediaSessionControls || !settings.backgroundAudio) {
    try {
      navigator.mediaSession.metadata = null;
      ["previoustrack", "nexttrack", "play", "pause", "seekbackward", "seekforward", "seekto"].forEach((action) => {
        try { navigator.mediaSession.setActionHandler(action, null); } catch {}
      });
    } catch {}
    return;
  }

  try {
    const safeTimedTitle = normaliseText(timedTitle);
    const mixTitle = track.title || "BRMedia";
    const displayTitle = safeTimedTitle || mixTitle;
const displayArtist = [track.artist, mixTitle].filter(Boolean).join(" • ") || track.subtitle || "Unknown artist";
const displayAlbum = safeTimedTitle ? "BRMedia Player" : (track.album || "BRMedia");

    navigator.mediaSession.metadata = new MediaMetadata({
      title: displayTitle,
      artist: displayArtist,
      album: displayAlbum,
      artwork: track.hasArtwork
        ? [{ src: getArtworkUrl(track), sizes: "512x512", type: "image/jpeg" }]
        : [],
    });

    navigator.mediaSession.setActionHandler("previoustrack", prev);
    navigator.mediaSession.setActionHandler("nexttrack", next);
    navigator.mediaSession.setActionHandler("play", () => audio?.play());
    navigator.mediaSession.setActionHandler("pause", () => audio?.pause());
    navigator.mediaSession.setActionHandler("seekbackward", () => {
      if (!audio) return;
      audio.currentTime = Math.max(0, audio.currentTime - settings.skipBackSec);
    });
    navigator.mediaSession.setActionHandler("seekforward", () => {
      if (!audio) return;
      audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + settings.skipFwdSec);
    });
  } catch (err) {
    console.warn("Media Session update failed", err);
  }
}

/* popup logic */
function getTopButtons() {
  return [btnSleep, btnTopDownload, btnOpenBookmarksTop, btnTopMenu].filter(Boolean);
}

function clearTopButtonStates() {
  getTopButtons().forEach((btn) => btn.classList.remove("active"));
}

function closeAllTopPopups() {
  [sleepPopup, speedPopup, eqPopup, castPopup, mirrorPopup, outputPopup, sendDevicePopup, downloadPopup, bookmarkPopup, bookmarkToolsPopup, playerQuickMenuPopup, menuPopup].forEach((el) => {
    if (el) {
      el.classList.add("hidden");
      el.classList.remove("bookmark-tools-popup");
    }
  });
  if (topPopupBackdrop) topPopupBackdrop.classList.add("hidden");
  clearTopButtonStates();
  openTopPopupName = null;
}

function positionPopupUnderButton(button, popup, align = "right") {
  if (!button || !popup || !nowPlayingModal) return;

  const sheet = nowPlayingModal.querySelector(".sheet");
  if (!sheet) return;

  popup.classList.remove("hidden");
  popup.style.visibility = "hidden";
  popup.style.left = "0px";
  popup.style.right = "auto";
  popup.style.top = "120px";

  const sheetRect = sheet.getBoundingClientRect();
  const btnRect = button.getBoundingClientRect();
  const popupCard = popup.querySelector(".popupCard");
  const pointer = popup.querySelector(".popupPointer");

  const popupWidth = popupCard ? popupCard.getBoundingClientRect().width : popup.getBoundingClientRect().width;
  const popupHeight = popupCard ? popupCard.getBoundingClientRect().height : popup.getBoundingClientRect().height;
  const btnCenter = btnRect.left - sheetRect.left + (btnRect.width / 2);

  if (popup === playerQuickMenuPopup) {
    const left = Math.max(8, (sheet.clientWidth - popupWidth) / 2);
    const top = Math.max(20, (sheet.clientHeight - popupHeight) / 2);
    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
    popup.style.visibility = "";
    if (pointer) pointer.style.display = "none";
    popup.classList.remove("bookmark-tools-popup");
    popup.classList.add("player-quick-centered");
    return;
  }

  popup.classList.remove("player-quick-centered");

if (align === "center") {
  const topBar = sheet.querySelector(".skin1TopBar");
  const topBarHeight = topBar ? (topBar.offsetHeight + 20) : 0;

  const left = Math.max(8, (sheet.clientWidth - popupWidth) / 2);
  const top = topBarHeight + 54;

  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
  popup.style.visibility = "";

  if (pointer) pointer.style.display = "none";
  popup.classList.remove("bookmark-tools-popup");
  return;
}

  let left = btnCenter - popupWidth + 28;

  const minLeft = 8;
  const maxLeft = Math.max(minLeft, sheet.clientWidth - popupWidth - 8);
  left = Math.max(minLeft, Math.min(maxLeft, left));

  const popupTopBase = btnRect.bottom - sheetRect.top;

  let extraOffset;
  if (popup === bookmarkToolsPopup) {
    extraOffset = button.offsetHeight + 148;
  } else if (popup === menuPopup) {
    extraOffset = 12;
  } else if (popup === sleepPopup || popup === bookmarkPopup) {
    extraOffset = 18;
  } else {
    extraOffset = 14;
  }

  popup.style.left = `${left}px`;
  popup.style.top = `${popupTopBase + extraOffset}px`;
  popup.style.visibility = "";

  if (pointer) {
    if (popup === bookmarkToolsPopup) {
      pointer.style.display = "none";
    } else {
      const pointerSize = 18;
      pointer.style.display = "block";
      pointer.style.left = `${Math.max(14, Math.min(popupWidth - 14 - pointerSize, btnCenter - left - (pointerSize / 2)))}px`;
      pointer.style.top = "-8px";
    }
  }

  popup.classList.toggle("bookmark-tools-popup", popup === bookmarkToolsPopup);
}

function openTopPopup(name, button) {
  closeAllTopPopups();

  let popup = null;
  let align = "right";

  if (name === "sleep") {
    popup = sleepPopup;
    align = "right";
  }
  if (name === "speed") {
    popup = speedPopup;
    align = "center";
  }
  if (name === "eq") {
    popup = eqPopup;
    align = "center";
  }
  if (name === "cast") {
    popup = castPopup;
    align = "center";
  }
  if (name === "mirror") {
    popup = mirrorPopup;
    align = "center";
  }
  if (name === "output") {
    popup = outputPopup;
    align = "center";
  }
	if (name === "sendDevice") {
    popup = sendDevicePopup;
    align = "center";
  }
  if (name === "download") popup = downloadPopup;
  if (name === "bookmark") {
    popup = bookmarkPopup;
    align = "right";
  }
  if (name === "bookmarkTools") popup = bookmarkToolsPopup;
  if (name === "playerQuickMenu") popup = playerQuickMenuPopup;
  if (name === "menu") popup = menuPopup;

  if (!popup || !button) return;

  if (topPopupBackdrop) topPopupBackdrop.classList.remove("hidden");
  if (getTopButtons().includes(button)) button.classList.add("active");
  positionPopupUnderButton(button, popup, align);
  openTopPopupName = name;
}

function toggleTopPopup(name, button) {
  if (openTopPopupName === name) {
    closeAllTopPopups();
    return;
  }
  openTopPopup(name, button);
}

function openBookmarkToolsPopup() {
  if (!btnBookmarkPopupMenu) return;
  openTopPopup("bookmarkTools", btnBookmarkPopupMenu);
}

function isSleepTimerActive() {
  return sleepMode === "songend" || !!sleepEndsAt;
}

function renderSleepPopupMode() {
  const active = isSleepTimerActive();

  if (sleepActivePanel) sleepActivePanel.classList.toggle("hidden", !active);
  if (sleepPagePresets) sleepPagePresets.classList.toggle("hidden", active || sleepPopupPage !== "presets");
  if (sleepPageCustom) sleepPageCustom.classList.toggle("hidden", active || sleepPopupPage !== "custom");
  if (sleepPopupCountdown) sleepPopupCountdown.classList.toggle("hidden", active);
  if (btnSleepFlip) btnSleepFlip.classList.toggle("hidden", active);
}

function setSleepPopupPage(page) {
  sleepPopupPage = page;
  renderSleepPopupMode();

  if (!isSleepTimerActive() && page === "custom") {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        initSleepWheels();
      });
    });
  }
}

function openUniversalSettings(moduleKey = "player", tabKey = "overview") {
  closeNowPlaying();
  closeAllTopPopups();

  try {
    closeSidebarMenu();
  } catch {}

  const params = new URLSearchParams({
    module: moduleKey || "player",
    tab: tabKey || "overview",
  });

  window.location.href = `/settings?${params.toString()}`;
}

function openSettingsFromMenu() {
  openUniversalSettings("player", "overview");
}

function closeTrackEditLauncher() {
  trackEditLauncherTrackId = "";
  trackEditLauncherOverlay?.classList.add("hidden");
}

function openTrackEditLauncher() {
  const track = currentTrack();
  closeAllTopPopups();

  if (!track?.id) {
    showBookmarkToast("Edit track", "Choose a track first");
    return;
  }

  trackEditLauncherTrackId = String(track.id);

  if (trackEditLauncherSub) {
    trackEditLauncherSub.textContent =
      track.title ||
      track.artist ||
      "Choose where you want to edit this track.";
  }

  trackEditLauncherOverlay?.classList.remove("hidden");

  try {
    hydrateBrIcons(trackEditLauncherOverlay);
  } catch {}
}

function openTrackEditRoute(route = "") {
  const id = String(trackEditLauncherTrackId || currentTrack()?.id || "").trim();
  if (!id || !route) return;

  closeTrackEditLauncher();

  window.location.href =
    `${route}${route.includes("?") ? "&" : "?"}trackId=${encodeURIComponent(id)}`;
}

function openTrackQuickEditRoute() {
  const id = String(trackEditLauncherTrackId || currentTrack()?.id || "").trim();
  if (!id) return;

  closeTrackEditLauncher();

  window.location.href =
    `/settings?module=cloud&tab=files&trackId=${encodeURIComponent(id)}&quickEdit=1`;
}

function formatBytes(bytes) {
  const num = Number(bytes || 0);
  if (!num) return "—";
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  if (num < 1024 * 1024 * 1024) return `${(num / (1024 * 1024)).toFixed(1)} MB`;
  return `${(num / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getDownloadFilename(track) {
  const rawBase = normaliseText(track?.title, track?.id || "track");
  const safeBase = rawBase.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim() || "track";

  const locator = String(track?.locator || "");
  const locatorExt = locator.includes(".") ? locator.split(".").pop().trim().toLowerCase() : "";
  const safeExt = /^[a-z0-9]{1,6}$/i.test(locatorExt) ? locatorExt : "mp3";

  return `${safeBase}.${safeExt}`;
}

function getTotalBytesFromHeaders(headers) {
  const contentRange = headers.get("Content-Range") || headers.get("content-range") || "";
  const match = /\/(\d+)$/.exec(contentRange);
  if (match) return Number(match[1]) || 0;

  const contentLength = Number(headers.get("Content-Length") || headers.get("content-length") || 0);
  return Number.isFinite(contentLength) ? contentLength : 0;
}

function setDownloadStatus(text) {
  if (downloadStatusText) downloadStatusText.textContent = text || "";
}

function setDownloadButtonState(loading, finished = false) {
  if (!btnDownloadConfirm) return;

  btnDownloadConfirm.disabled = !!loading;

  if (loading) {
    btnDownloadConfirm.innerHTML = `
      <i class="fa-solid fa-spinner fa-spin"></i>
      <span>Downloading…</span>
    `;
    return;
  }

  if (finished) {
    btnDownloadConfirm.innerHTML = `
      <i class="fa-solid fa-check"></i>
      <span>Download again</span>
    `;
    return;
  }

  btnDownloadConfirm.innerHTML = `
    <i class="fa-solid fa-download"></i>
    <span>Download</span>
  `;
}

function setDownloadProgress(receivedBytes, totalBytes) {
  const received = Number(receivedBytes || 0);
  const total = Number(totalBytes || 0);
  const percent = total > 0 ? Math.max(0, Math.min(100, (received / total) * 100)) : 0;

  if (downloadProgressFill) {
    downloadProgressFill.style.width = `${percent}%`;
  }

  if (downloadProgressText) {
    downloadProgressText.textContent = total > 0 ? `${Math.round(percent)}%` : "Downloading…";
  }

  if (downloadProgressBytes) {
    if (total > 0) {
      downloadProgressBytes.textContent = `${formatBytes(received)} of ${formatBytes(total)}`;
    } else if (received > 0) {
      downloadProgressBytes.textContent = formatBytes(received);
    } else {
      downloadProgressBytes.textContent = "Waiting to start";
    }
  }
}

function finishDownloadBlob(blob, track) {
  void saveBlobAsBrowserFile(blob, getDownloadFilename(track), {
    title: track?.title || "BRMedia download",
    text: "BRMedia download",
  });
}

async function fetchDownloadSize(track) {
  if (!track?.id) return 0;
  if (downloadSizeCache.has(track.id)) return downloadSizeCache.get(track.id) || 0;

  const res = await fetch(`/download/${encodeURIComponent(track.id)}`, {
    method: "HEAD",
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Size HTTP ${res.status}`);

  const total = getTotalBytesFromHeaders(res.headers);
  if (total) downloadSizeCache.set(track.id, total);
  return total;
}

async function populateDownloadPopup() {
  const track = currentTrack();
  if (!track) return;

  setDownloadButtonState(false, false);
  setDownloadStatus("Ready to download");
  setDownloadProgress(0, 0);

  if (downloadInfoName) downloadInfoName.textContent = track.title || track.id || "—";
  if (downloadInfoType) downloadInfoType.textContent = formatFileType(track) || "—";
  if (downloadInfoLength) {
    downloadInfoLength.textContent = Number.isFinite(track.duration) ? fmtTime(track.duration) : "—";
  }
  if (downloadInfoSize) downloadInfoSize.textContent = "Checking…";

  try {
    const size = await fetchDownloadSize(track);
    if (downloadInfoSize) downloadInfoSize.textContent = size ? formatBytes(size) : "—";
  } catch (err) {
    console.warn("Could not fetch download size", err);
    if (downloadInfoSize) downloadInfoSize.textContent = "—";
  }
}

async function triggerDownload() {
  const track = currentTrack();
  if (!track || downloadInFlight) return;

  downloadInFlight = true;
  setDownloadButtonState(true);
  setDownloadStatus(shouldUseIosDownloadHandoff() ? "Preparing iOS file save…" : "Starting browser download…");
  setDownloadProgress(0, 0);

  try {
    const href = `/download/${encodeURIComponent(track.id)}?download=1`;

    if (shouldUseIosDownloadHandoff()) {
      const res = await fetch(href, { cache: "no-store" });
      if (!res.ok) throw new Error(`Download HTTP ${res.status}`);

      const blob = await res.blob();
      const result = await saveBlobAsBrowserFile(blob, getDownloadFilename(track), {
        title: track?.title || "BRMedia download",
        text: "BRMedia download",
        type: blob.type || track?.mimeType || "audio/mpeg",
      });

      setDownloadStatus(result === "shared" ? "Opened iOS save/share sheet" : "iOS file prepared");
      setDownloadButtonState(false, true);
      setDownloadProgress(blob.size || 0, blob.size || 0);
      if (downloadInfoSize && blob.size) downloadInfoSize.textContent = formatBytes(blob.size);
      if (downloadProgressBytes) {
        downloadProgressBytes.textContent = result === "cancelled"
          ? "iOS save/share cancelled"
          : `Ready in iOS file controls${blob.size ? ` • ${formatBytes(blob.size)}` : ""}`;
      }
      return;
    }

    startBrowserFileDownload(href, getDownloadFilename(track), {
      targetBlank: false,
      fallbackToLocation: true,
    });

    setDownloadStatus("Browser download started");
    setDownloadButtonState(false, true);

    const size = await fetchDownloadSize(track).catch(() => 0);
    if (size) {
      setDownloadProgress(size, size);
      if (downloadInfoSize) downloadInfoSize.textContent = formatBytes(size);
      if (downloadProgressBytes) downloadProgressBytes.textContent = `Handled by browser • ${formatBytes(size)}`;
    } else if (downloadProgressBytes) {
      downloadProgressBytes.textContent = "Handled by browser";
    }
  } catch (err) {
    console.error("Download failed", err);
    setDownloadStatus("Download failed");
    setDownloadButtonState(false, false);
    if (downloadProgressBytes) downloadProgressBytes.textContent = err?.message || "Could not start browser download";
  } finally {
    downloadInFlight = false;
  }
}

function updateReloadCountDisplay() {
  if (reloadLibraryCount) {
    reloadLibraryCount.textContent = `Files in player: ${library.length}`;
  }
}

function hideReloadAddedMessage() {
  if (reloadAddedCard) reloadAddedCard.classList.add("hidden");
  if (reloadAddedTimer) clearTimeout(reloadAddedTimer);
  reloadAddedTimer = null;
}

function showReloadAddedMessage(text) {
  if (!reloadAddedCount) return;
  reloadAddedCount.textContent = text;
  if (reloadAddedCard) reloadAddedCard.classList.remove("hidden");

  if (reloadAddedTimer) clearTimeout(reloadAddedTimer);
  reloadAddedTimer = setTimeout(() => {
    if (reloadAddedCard) reloadAddedCard.classList.add("hidden");
  }, 15000);
}

function setReloadButtonState(loading) {
  reloadInFlight = loading;

  if (btnReload) btnReload.disabled = loading;
  if (btnReloadText) btnReloadText.textContent = loading ? "Reloading..." : "Reload";
  if (btnReloadIcon) {
    btnReloadIcon.className = loading
      ? "fa-solid fa-arrows-rotate fa-spin"
      : "fa-solid fa-arrows-rotate";
  }
}

function setSettingsMenuOpen(open) {
  if (settingsSideMenu) {
    settingsSideMenu.classList.toggle("isOpen", !!open);
    settingsSideMenu.setAttribute("aria-hidden", open ? "false" : "true");
  }

  if (settingsSideMenuBackdrop) {
    settingsSideMenuBackdrop.classList.toggle("isOpen", !!open);
  }

  document.body.classList.toggle("settingsSideMenuOpen", !!open);
}

function setSettingsSubPage(name = "general") {
  const validPages = new Set([
    "general",
    "playback",
    "waveforms",
    "devices",
    "backup",
    "library",
    "googleDrive",
    "dropbox",
    "import",
    "files",
  ]);

  settingsSubPage = validPages.has(name) ? name : "general";

  if (settingsPageGeneral) {
    settingsPageGeneral.classList.toggle("hidden", settingsSubPage !== "general");
  }

  if (settingsPagePlayback) {
    settingsPagePlayback.classList.toggle("hidden", settingsSubPage !== "playback");
  }

  if (settingsPageWaveforms) {
    settingsPageWaveforms.classList.toggle("hidden", settingsSubPage !== "waveforms");
  }

  if (settingsPageDevices) {
    settingsPageDevices.classList.toggle("hidden", settingsSubPage !== "devices");
  }

  if (settingsPageBackup) {
    settingsPageBackup.classList.toggle("hidden", settingsSubPage !== "backup");
  }

  if (settingsPageLibrary) {
    settingsPageLibrary.classList.toggle("hidden", settingsSubPage !== "library");
  }

  if (settingsPageGoogleDrive) {
    settingsPageGoogleDrive.classList.toggle("hidden", settingsSubPage !== "googleDrive");
  }

  if (settingsPageDropbox) {
    settingsPageDropbox.classList.toggle("hidden", settingsSubPage !== "dropbox");
  }

  if (settingsPageImport) {
    settingsPageImport.classList.toggle("hidden", settingsSubPage !== "import");
  }

  if (settingsPageFiles) {
    settingsPageFiles.classList.toggle("hidden", settingsSubPage !== "files");
  }

  if (settingsSubPage === "googleDrive" || settingsSubPage === "dropbox") {
    void refreshCloudAccounts();
    void refreshCloudImportJobs();
  }

  if (settingsSubPage === "import") {
    void refreshLinkImportJobs();
    renderUrlSourceLinks();
  }

  if (btnSettingsGeneralPage) {
    btnSettingsGeneralPage.classList.toggle("active", settingsSubPage === "general");
  }

  if (btnSettingsPlaybackPage) {
    btnSettingsPlaybackPage.classList.toggle("active", settingsSubPage === "playback");
  }

  if (btnSettingsWaveformsPage) {
    btnSettingsWaveformsPage.classList.toggle("active", settingsSubPage === "waveforms");
  }

  if (btnSettingsDevicesPage) {
    btnSettingsDevicesPage.classList.toggle("active", settingsSubPage === "devices");
  }

  if (btnSettingsBackupPage) {
    btnSettingsBackupPage.classList.toggle("active", settingsSubPage === "backup");
  }

  if (btnSettingsLibraryPage) {
    btnSettingsLibraryPage.classList.toggle("active", settingsSubPage === "library");
  }

  if (btnSettingsGoogleDrivePage) {
    btnSettingsGoogleDrivePage.classList.toggle("active", settingsSubPage === "googleDrive");
  }

  if (btnSettingsDropboxPage) {
    btnSettingsDropboxPage.classList.toggle("active", settingsSubPage === "dropbox");
  }

  if (btnSettingsImportPage) {
    btnSettingsImportPage.classList.toggle("active", settingsSubPage === "import");
  }

  if (btnSettingsFilesPage) {
    btnSettingsFilesPage.classList.toggle("active", settingsSubPage === "files");
  }

  if (settingsCurrentSectionText) {
    const labels = {
      general: "General",
      playback: "Playback",
      waveforms: "Waveforms",
      devices: "Devices",
      backup: "Backup",
      library: "Add Files",
      googleDrive: "Google Drive",
      dropbox: "Dropbox",
      import: "Import",
      files: "View Files",
    };

    settingsCurrentSectionText.textContent = labels[settingsSubPage] || "General";
  }
}

function renderCloudAccountOptions(selectEl, accounts = [], placeholder = "Pick account") {
  if (!selectEl) return;
  const current = selectEl.value;
  selectEl.innerHTML = `<option value="">${placeholder}</option>`;
  accounts.forEach((account) => {
    const option = document.createElement("option");
    option.value = account.id;
    option.textContent = `${account.label || account.displayName || account.email} • ${account.email || account.displayName || account.id}`;
    selectEl.appendChild(option);
  });
  if (accounts.some((account) => account.id === current)) {
    selectEl.value = current;
  } else if (!selectEl.value && accounts[0]) {
    selectEl.value = accounts[0].id;
  }
}

function renderCloudAccountsList(host, accounts = [], provider = "google_drive") {
  if (!host) return;
  host.innerHTML = "";

  if (!accounts.length) {
    host.innerHTML = `<div class="waveformJobEmpty">No ${provider === "google_drive" ? "Google Drive" : "Dropbox"} accounts linked yet.</div>`;
    return;
  }

  accounts.forEach((account) => {
    const row = document.createElement("div");
    row.className = "cloudAccountRow";

    const meta = document.createElement("div");
    meta.className = "cloudAccountMeta";
    meta.innerHTML = `
      <div class="cloudAccountTitle">${account.label || account.displayName || account.email || account.id}</div>
      <div class="cloudAccountSub">${account.email || account.displayName || account.id}</div>
    `;

    const actions = document.createElement("div");
    actions.className = "cloudAccountActions";

    const useBtn = document.createElement("button");
    useBtn.className = "pill subtle";
    useBtn.type = "button";
    useBtn.textContent = "Use";
    useBtn.addEventListener("click", () => {
      if (provider === "google_drive" && googleDriveAccountSelect) {
        googleDriveAccountSelect.value = account.id;
      }
      if (provider === "dropbox" && dropboxAccountSelect) {
        dropboxAccountSelect.value = account.id;
      }
    });

    const removeBtn = document.createElement("button");
    removeBtn.className = "pill danger";
    removeBtn.type = "button";
    removeBtn.textContent = "Disconnect";
    removeBtn.addEventListener("click", async () => {
      const ok = window.confirm(`Disconnect this ${provider === "google_drive" ? "Google Drive" : "Dropbox"} account?`);
      if (!ok) return;
      try {
        await deleteJsonNoStore(`/cloud/accounts/${encodeURIComponent(account.id)}`);
        await refreshCloudAccounts();
      } catch (err) {
        window.alert(err?.message || "Disconnect failed.");
      }
    });

    actions.appendChild(useBtn);
    actions.appendChild(removeBtn);
    row.appendChild(meta);
    row.appendChild(actions);
    host.appendChild(row);
  });
}

function getCloudFileExtension(name = "") {
  const clean = String(name || "").toLowerCase().split("?")[0];
  const dot = clean.lastIndexOf(".");
  return dot >= 0 ? clean.slice(dot) : "";
}

function getCloudFileKind(item = {}) {
  if (item.kind === "folder") return "folder";

  const name = item.name || "";
  const mimeType = String(item.mimeType || "").toLowerCase();
  const ext = getCloudFileExtension(name);

  if (mimeType.startsWith("audio/") || [".mp3", ".wav", ".flac", ".m4a", ".aac", ".ogg", ".opus"].includes(ext)) {
    return "audio";
  }

  if (mimeType.startsWith("image/") || [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].includes(ext)) {
    return "image";
  }

  if (mimeType.startsWith("text/") || [".txt", ".cue", ".m3u", ".m3u8", ".json", ".xml", ".csv"].includes(ext)) {
    return "text";
  }

  return "file";
}

function getCloudFileIconClass(item = {}) {
  const kind = getCloudFileKind(item);

  if (kind === "folder") return "fa-solid fa-folder";
  if (kind === "audio") return "fa-solid fa-file-audio";
  if (kind === "image") return "fa-solid fa-file-image";
  if (kind === "text") return "fa-solid fa-file-lines";

  return "fa-solid fa-file";
}

function isSupportedCloudImport(item = {}) {
  return ["audio", "image", "text"].includes(getCloudFileKind(item));
}

function getCloudImportButtonText(item = {}) {
  const kind = getCloudFileKind(item);
  if (kind === "audio") return "Import audio";
  if (kind === "image") return "Import image";
  if (kind === "text") return "Import text";
  return "Not supported";
}

function getCloudImportHelpText(item = {}) {
  const kind = getCloudFileKind(item);
  if (kind === "audio") return "Audio imports into the BRMedia library.";
  if (kind === "image") return "Images download into BRMedia ready for artwork/banner use.";
  if (kind === "text") return "Text, cue and playlist files download ready for tracklists/playlists.";
  return "This file type is not supported for BRMedia imports yet.";
}

function formatCloudBytes(bytes = 0) {
  const value = Number(bytes || 0);

  if (!value) return "";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;

  return `${(value / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function updateCloudFolderControls() {
  if (googleDriveFolderLabel) {
    googleDriveFolderLabel.textContent = googleDriveCurrentFolder.label || "Root folder";
  }

  if (dropboxFolderLabel) {
    dropboxFolderLabel.textContent = dropboxCurrentFolder.label || "Root folder";
  }

  if (btnGoogleDriveBack) {
    btnGoogleDriveBack.disabled = googleDriveFolderStack.length < 1;
    btnGoogleDriveBack.classList.toggle("disabledLike", googleDriveFolderStack.length < 1);
  }

  if (btnDropboxBack) {
    btnDropboxBack.disabled = dropboxFolderStack.length < 1;
    btnDropboxBack.classList.toggle("disabledLike", dropboxFolderStack.length < 1);
  }
}

function openCloudFolder(provider = "google_drive", item = {}) {
  if (provider === "google_drive") {
    googleDriveFolderStack.push({ ...googleDriveCurrentFolder });
    googleDriveCurrentFolder = {
      id: item.id || "root",
      label: item.name || "Google Drive folder",
    };

    if (googleDriveFolderInput) googleDriveFolderInput.value = googleDriveCurrentFolder.id;
    updateCloudFolderControls();
    void browseGoogleDrive();
    return;
  }

  dropboxFolderStack.push({ ...dropboxCurrentFolder });
  dropboxCurrentFolder = {
    path: item.path || "",
    label: item.name || "Dropbox folder",
  };

  if (dropboxPathInput) dropboxPathInput.value = dropboxCurrentFolder.path;
  updateCloudFolderControls();
  void browseDropbox();
}

function goCloudFolderBack(provider = "google_drive") {
  if (provider === "google_drive") {
    const previous = googleDriveFolderStack.pop();
    if (!previous) return;

    googleDriveCurrentFolder = previous;
    if (googleDriveFolderInput) googleDriveFolderInput.value = previous.id || "root";
    updateCloudFolderControls();
    void browseGoogleDrive();
    return;
  }

  const previous = dropboxFolderStack.pop();
  if (!previous) return;

  dropboxCurrentFolder = previous;
  if (dropboxPathInput) dropboxPathInput.value = previous.path || "";
  updateCloudFolderControls();
  void browseDropbox();
}

function goCloudFolderRoot(provider = "google_drive") {
  if (provider === "google_drive") {
    googleDriveFolderStack = [];
    googleDriveCurrentFolder = { id: "root", label: "Root folder" };
    if (googleDriveFolderInput) googleDriveFolderInput.value = "root";
    updateCloudFolderControls();
    void browseGoogleDrive();
    return;
  }

  dropboxFolderStack = [];
  dropboxCurrentFolder = { path: "", label: "Root folder" };
  if (dropboxPathInput) dropboxPathInput.value = "";
  updateCloudFolderControls();
  void browseDropbox();
}

async function refreshCloudLinkedTracksInLibrary() {
  await loadLibrary();
}

async function addGoogleDriveFileToLibrary(item = {}) {
  const accountId = googleDriveAccountSelect?.value || "";
  if (!accountId) throw new Error("Pick a Google Drive account first.");
  if (!item?.id) throw new Error("Missing Google Drive file id.");

  const data = await postJsonNoStore("/cloud/google/link-track", {
    accountId,
    file: item,
  });

  await refreshCloudLinkedTracksInLibrary();
  return data?.track;
}

async function importGoogleDriveLinkedTrack(track = {}) {
  if (!track?.id) throw new Error("Missing linked track id.");
  return postJsonNoStore(`/cloud/google/import-linked/${encodeURIComponent(track.id)}`, {});
}

function renderCloudFileResults(host, items = [], provider = "google_drive") {
  if (!host) return;
  host.innerHTML = "";

  if (!items.length) {
    host.innerHTML = `<div class="waveformJobEmpty">No files found.</div>`;
    return;
  }

  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = `cloudResultRow cloudResultRow-${getCloudFileKind(item)}`;

    const iconClass = getCloudFileIconClass(item);
    const safeName = escapeHtml(item.name || "Untitled");
    const sizeText = item.size ? ` • ${formatCloudBytes(item.size)}` : "";
    const dateText = item.modifiedTime ? ` • ${new Date(item.modifiedTime).toLocaleString()}` : "";

    const meta = document.createElement("div");
    meta.className = "cloudResultMeta";
    meta.innerHTML = `
      <div class="cloudResultTitle" title="${safeName}">
        <i class="${iconClass}"></i>
        <span>${safeName}</span>
      </div>
      <div class="cloudResultSub">${item.kind === "folder" ? "Folder" : getCloudFileKind(item)}${sizeText}${dateText}</div>
    `;

    const actions = document.createElement("div");
    actions.className = "cloudResultActions";

    if (item.kind === "folder") {
      const openBtn = document.createElement("button");
      openBtn.className = "pill subtle cloudResultBtn";
      openBtn.type = "button";
      openBtn.textContent = "Open";
      openBtn.addEventListener("click", () => openCloudFolder(provider, item));
      actions.appendChild(openBtn);
    } else {
      if (provider === "google_drive" && isSupportedCloudImport(item) && getCloudFileKind(item) === "audio") {
        const linkBtn = document.createElement("button");
        linkBtn.className = "pill cloudResultBtn";
        linkBtn.type = "button";
        linkBtn.textContent = "Add to BRMedia Library";
        linkBtn.title = "Play from Google Drive without importing a local copy.";
        linkBtn.addEventListener("click", async () => {
          linkBtn.disabled = true;
          linkBtn.textContent = "Adding...";

          try {
            await addGoogleDriveFileToLibrary(item);
            linkBtn.textContent = "Added";
            showBookmarkToast("Google Drive Library", `${item.name || "File"} can now play from Drive`);
          } catch (err) {
            showBookmarkToast("Google Drive Library", err?.message || "Could not add Drive file");
            linkBtn.disabled = false;
            linkBtn.textContent = "Add to BRMedia Library";
          }
        });
        actions.appendChild(linkBtn);
      }

      const importBtn = document.createElement("button");
      importBtn.className = "pill primary cloudResultBtn";
      importBtn.type = "button";

      if (!isSupportedCloudImport(item)) {
        importBtn.disabled = true;
        importBtn.classList.add("disabledLike");
        importBtn.textContent = "Not supported";
        importBtn.title = getCloudImportHelpText(item);
      } else {
        importBtn.textContent = getCloudImportButtonText(item);
        importBtn.title = getCloudImportHelpText(item);
        importBtn.addEventListener("click", async () => {
          importBtn.disabled = true;
          importBtn.textContent = "Queued";

          try {
            await startCloudImportJob(provider, item);
            showBookmarkToast(
              "Cloud import",
              `${item.name || "File"} added to ${provider === "google_drive" ? "Google Drive" : "Dropbox"} process list`
            );
          } catch (err) {
            showBookmarkToast("Cloud import failed", err?.message || "Import failed");
            importBtn.disabled = false;
            importBtn.textContent = getCloudImportButtonText(item);
          }
        });
      }

      actions.appendChild(importBtn);
    }

    row.appendChild(meta);
    row.appendChild(actions);
    host.appendChild(row);
  });
}

function getCloudProviderLabel(provider = "google_drive") {
  return provider === "dropbox" ? "Dropbox" : "Google Drive";
}

function renderCloudImportJobPanel(summaryEl, listEl, provider = "google_drive") {
  if (!summaryEl || !listEl) return;

  const providerLabel = getCloudProviderLabel(provider);
  const jobs = (Array.isArray(cloudImportJobs) ? cloudImportJobs : [])
    .filter((job) => job.provider === provider);

  if (!jobs.length) {
    summaryEl.textContent = `No ${providerLabel} imports queued yet.`;
    listEl.innerHTML = `<div class="waveformJobEmpty">Nothing importing from ${providerLabel} yet.</div>`;
    return;
  }

  const complete = jobs.filter((job) => job.status === "complete").length;
  const failed = jobs.filter((job) => job.status === "failed").length;
  const active = jobs.filter((job) => ["queued", "downloading", "importing"].includes(job.status)).length;

  summaryEl.textContent = active
    ? `${providerLabel} • ${active} active • ${complete} complete • ${failed} failed`
    : `${providerLabel} finished • ${complete} complete • ${failed} failed`;

  listEl.innerHTML = "";

  jobs.slice(0, 12).forEach((job) => {
    const row = document.createElement("div");
    row.className = `cloudImportJobRow is-${job.status}`;

    const icon =
      job.status === "complete"
        ? "fa-solid fa-check"
        : job.status === "failed"
          ? "fa-solid fa-triangle-exclamation"
          : job.fileKind === "image"
            ? "fa-solid fa-file-image"
            : job.fileKind === "text"
              ? "fa-solid fa-file-lines"
              : "fa-solid fa-cloud-arrow-down";

    const title = escapeHtml(job.name || `${providerLabel} import`);
    const statusText = escapeHtml(job.error || job.message || job.status || "Queued");
    const percent = Math.max(0, Math.min(100, Math.round(Number(job.percent || 0))));
    const completeText = job.libraryItem ? "Media imported" : "File downloaded";

    row.innerHTML = `
      <div class="cloudImportJobIcon">
        <i class="${icon}"></i>
      </div>
      <div class="cloudImportJobMeta">
        <div class="cloudImportJobTitle" title="${title}">${title}</div>
        <div class="cloudImportJobSub">${statusText}</div>
      </div>
      <div class="cloudImportJobRight">
        <div class="cloudImportJobStatus">${job.status === "complete" ? completeText : statusText}</div>
        <div class="cloudImportJobPercent">${percent}%</div>
      </div>
      <div class="cloudImportJobBar">
        <span style="width:${percent}%"></span>
      </div>
    `;

    listEl.appendChild(row);
  });
}

function renderCloudImportJobs() {
  renderCloudImportJobPanel(googleDriveImportSummary, googleDriveImportJobList, "google_drive");
  renderCloudImportJobPanel(dropboxImportSummary, dropboxImportJobList, "dropbox");

  // Old combined Import panel fallback, kept safe in case an older HTML copy still has it.
  renderCloudImportJobPanel(cloudImportSummary, cloudImportJobList, "google_drive");
}

function cloudImportHasActiveJobs() {
  return cloudImportJobs.some((job) => ["queued", "downloading", "importing"].includes(job.status));
}

async function refreshCloudImportJobs() {
  try {
    const data = await getJsonNoStore("/cloud/import-jobs");
    cloudImportJobs = Array.isArray(data?.jobs) ? data.jobs : [];
    renderCloudImportJobs();

    if (cloudImportHasActiveJobs()) {
      startCloudImportJobPoll();
    }
  } catch (err) {
    const message = `<div class="waveformJobEmpty">${err?.message || "Cloud import jobs unavailable."}</div>`;
    if (googleDriveImportJobList) googleDriveImportJobList.innerHTML = message;
    if (dropboxImportJobList) dropboxImportJobList.innerHTML = message;
    if (cloudImportJobList) cloudImportJobList.innerHTML = message;
  }
}

function startCloudImportJobPoll() {
  if (cloudImportJobPollTimer) return;

  cloudImportJobPollTimer = window.setInterval(async () => {
    await refreshCloudImportJobs();

    if (!cloudImportHasActiveJobs()) {
      window.clearInterval(cloudImportJobPollTimer);
      cloudImportJobPollTimer = 0;
      await loadLibrary();
    }
  }, 1200);
}

async function startCloudImportJob(provider = "google_drive", item = {}) {
  const payload = provider === "google_drive"
    ? {
        accountId: googleDriveAccountSelect?.value || "",
        fileId: item.id || "",
        name: item.name || "",
      }
    : {
        accountId: dropboxAccountSelect?.value || "",
        path: item.path || "",
        name: item.name || "",
      };

  const endpoint = provider === "google_drive"
    ? "/cloud/google/import-job"
    : "/cloud/dropbox/import-job";

  const data = await postJsonNoStore(endpoint, payload);

  if (data?.job) {
    cloudImportJobs = [data.job, ...cloudImportJobs.filter((job) => job.id !== data.job.id)];
    renderCloudImportJobs();
    startCloudImportJobPoll();
  }

  return data;
}

async function refreshCloudAccounts() {
  try {
    const data = await getJsonNoStore("/cloud/accounts");
    const accounts = Array.isArray(data?.accounts) ? data.accounts : [];
    cloudAccountsState = {
      google_drive: accounts.filter((item) => item.provider === "google_drive"),
      dropbox: accounts.filter((item) => item.provider === "dropbox"),
    };

    renderCloudAccountsList(googleDriveAccountsList, cloudAccountsState.google_drive, "google_drive");
    renderCloudAccountsList(dropboxAccountsList, cloudAccountsState.dropbox, "dropbox");
    renderCloudAccountOptions(googleDriveAccountSelect, cloudAccountsState.google_drive, "Pick Google Drive account");
    renderCloudAccountOptions(dropboxAccountSelect, cloudAccountsState.dropbox, "Pick Dropbox account");
  } catch (err) {
    if (googleDriveAccountsList) googleDriveAccountsList.innerHTML = `<div class="waveformJobEmpty">${err?.message || "Google Drive unavailable."}</div>`;
    if (dropboxAccountsList) dropboxAccountsList.innerHTML = `<div class="waveformJobEmpty">${err?.message || "Dropbox unavailable."}</div>`;
  }
}

async function openCloudConnect(provider = "google") {
  const providerLabel = provider === "google" ? "Google Drive" : "Dropbox";
  const startPath = provider === "google" ? "/auth/google/start" : "/auth/dropbox/start";

  let authWindow = null;

  try {
    authWindow = window.open("", "brmediaCloudAuth", "width=640,height=760");

    if (authWindow) {
      authWindow.document.write(`
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Connecting ${providerLabel}</title>
            <style>
              body {
                margin: 0;
                min-height: 100vh;
                display: grid;
                place-items: center;
                font-family: Arial, sans-serif;
                background: #182E5B;
                color: white;
              }
              .box {
                width: min(86vw, 420px);
                padding: 28px;
                border-radius: 22px;
                background: rgba(255,255,255,0.08);
                border: 1px solid rgba(31,169,255,0.22);
                text-align: center;
              }
              h1 {
                margin: 0 0 10px;
                font-size: 24px;
              }
              p {
                margin: 0;
                color: rgba(255,255,255,0.76);
                line-height: 1.45;
              }
            </style>
          </head>
          <body>
            <div class="box">
              <h1>Connecting ${providerLabel}</h1>
              <p>Opening secure login...</p>
            </div>
          </body>
        </html>
      `);
      authWindow.document.close();
    }

    const data = await getJsonNoStore(startPath);
    if (!data?.authUrl) throw new Error("Missing auth URL");

    if (authWindow && !authWindow.closed) {
      authWindow.location.href = data.authUrl;
      return;
    }

    const openHere = window.confirm(
      `${providerLabel} login was blocked by the browser.\n\nOpen it in this tab instead?`
    );

    if (openHere) {
      window.location.href = data.authUrl;
    }
  } catch (err) {
    if (authWindow && !authWindow.closed) {
      authWindow.close();
    }

    window.alert(err?.message || `${providerLabel} auth failed.`);
  }
}

async function browseGoogleDrive() {
  if (!googleDriveAccountSelect?.value) {
    window.alert("Pick a Google Drive account first.");
    return;
  }

  const folderId = googleDriveFolderInput?.value || "root";
  googleDriveCurrentFolder = {
    ...googleDriveCurrentFolder,
    id: folderId,
  };

  updateCloudFolderControls();

  if (googleDriveResultsList) {
    googleDriveResultsList.innerHTML = `<div class="waveformJobEmpty">Loading Google Drive...</div>`;
  }

  try {
    const data = await postJsonNoStore("/cloud/google/list", {
      accountId: googleDriveAccountSelect.value,
      folderId,
      query: googleDriveSearchInput?.value || "",
    });
    renderCloudFileResults(googleDriveResultsList, data?.items || [], "google_drive");
  } catch (err) {
    if (googleDriveResultsList) {
      googleDriveResultsList.innerHTML = `<div class="waveformJobEmpty">${err?.message || "Google Drive browse failed."}</div>`;
    }
  }
}

async function browseDropbox() {
  if (!dropboxAccountSelect?.value) {
    window.alert("Pick a Dropbox account first.");
    return;
  }

  const folderPath = dropboxPathInput?.value || "";
  dropboxCurrentFolder = {
    ...dropboxCurrentFolder,
    path: folderPath,
  };

  updateCloudFolderControls();

  if (dropboxResultsList) {
    dropboxResultsList.innerHTML = `<div class="waveformJobEmpty">Loading Dropbox...</div>`;
  }

  try {
    const data = await postJsonNoStore("/cloud/dropbox/list", {
      accountId: dropboxAccountSelect.value,
      path: folderPath,
    });
    renderCloudFileResults(dropboxResultsList, data?.items || [], "dropbox");
  } catch (err) {
    if (dropboxResultsList) {
      dropboxResultsList.innerHTML = `<div class="waveformJobEmpty">${err?.message || "Dropbox browse failed."}</div>`;
    }
  }
}

async function searchDropbox() {
  if (!dropboxAccountSelect?.value) {
    window.alert("Pick a Dropbox account first.");
    return;
  }

  if (!(dropboxSearchInput?.value || "").trim()) {
    await browseDropbox();
    return;
  }

  if (dropboxResultsList) {
    dropboxResultsList.innerHTML = `<div class="waveformJobEmpty">Searching Dropbox...</div>`;
  }

  try {
    const data = await postJsonNoStore("/cloud/dropbox/search", {
      accountId: dropboxAccountSelect.value,
      query: dropboxSearchInput?.value || "",
    });
    renderCloudFileResults(dropboxResultsList, data?.items || [], "dropbox");
  } catch (err) {
    if (dropboxResultsList) {
      dropboxResultsList.innerHTML = `<div class="waveformJobEmpty">${err?.message || "Dropbox search failed."}</div>`;
    }
  }
}

function formatUrlImportBytes(bytes = 0) {
  const value = Number(bytes || 0);

  if (!value) return "";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;

  return `${(value / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function getUrlSourceProviderIcon(provider = "") {
  const key = String(provider || "").toLowerCase();

  if (key === "soundcloud") return "fa-brands fa-soundcloud";
  if (key === "mixcloud") return "fa-brands fa-mixcloud";
  if (key === "hearthis") return "fa-solid fa-headphones";

  return "fa-solid fa-link";
}

function getUrlSourceProviderLabel(provider = "") {
  const key = String(provider || "").toLowerCase();

  if (key === "soundcloud") return "SoundCloud";
  if (key === "mixcloud") return "Mixcloud";
  if (key === "hearthis") return "Hearthis";

  return "Source link";
}

function loadUrlSourceLinks() {
  urlSourceLinks = readPersistedJson(URL_SOURCE_LINKS_KEY, []);
  if (!Array.isArray(urlSourceLinks)) urlSourceLinks = [];
}

function saveUrlSourceLinks() {
  writePersistedJson(URL_SOURCE_LINKS_KEY, urlSourceLinks);
}

function renderUrlSourceLinks() {
  if (!urlSourceLinksList) return;

  if (!urlSourceLinks.length) {
    urlSourceLinksList.innerHTML = `<div class="waveformJobEmpty">No music source links saved yet.</div>`;
    return;
  }

  urlSourceLinksList.innerHTML = "";

  urlSourceLinks
    .slice()
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
    .forEach((item) => {
      const row = document.createElement("div");
      row.className = "urlSourceRow";

      const icon = getUrlSourceProviderIcon(item.provider);
      const label = getUrlSourceProviderLabel(item.provider);
      const title = escapeHtml(item.title || label);
      const url = escapeHtml(item.url || "");

      row.innerHTML = `
        <div class="urlSourceIcon">
          <i class="${icon}"></i>
        </div>
        <div class="urlSourceMeta">
          <div class="urlSourceTitle" title="${title}">${title}</div>
          <div class="urlSourceSub">${label} • <span>${url}</span></div>
        </div>
        <div class="urlSourceActions">
          <button class="pill subtle urlSourceOpenBtn" type="button">Open</button>
          <button class="pill danger urlSourceRemoveBtn" type="button">Remove</button>
        </div>
      `;

row.querySelector(".urlSourceOpenBtn")?.addEventListener("click", () => {
  openBrmediaUrl(item.url, { fallbackToLocation: true });
});

      row.querySelector(".urlSourceRemoveBtn")?.addEventListener("click", () => {
        urlSourceLinks = urlSourceLinks.filter((entry) => entry.id !== item.id);
        saveUrlSourceLinks();
        renderUrlSourceLinks();
        renderHomeCategoryShowcase();
        renderSidebarCategories();
        if (listsCategory === "source-links") renderSourceLinksCategory();
        showBookmarkToast("URL sources", "Source removed");
      });

      urlSourceLinksList.appendChild(row);
    });
}

function saveUrlSourceLink() {
  const provider = urlSourceProviderSelect?.value || "other";
  const url = String(urlSourceUrlInput?.value || "").trim();
  const title = String(urlSourceTitleInput?.value || "").trim();

  if (!url) {
    showBookmarkToast("URL sources", "Paste a source URL first");
    return;
  }

  let parsed;

  try {
    parsed = new URL(url);
  } catch {
    showBookmarkToast("URL sources", "That source URL is not valid");
    return;
  }

  const source = {
    id: `source_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    provider,
    title: title || parsed.hostname.replace(/^www\./, ""),
    url: parsed.toString(),
    createdAt: Date.now(),
  };

  urlSourceLinks = [source, ...urlSourceLinks];
  saveUrlSourceLinks();
  renderUrlSourceLinks();
  renderHomeCategoryShowcase();
  renderSidebarCategories();

  if (urlSourceTitleInput) urlSourceTitleInput.value = "";
  if (urlSourceUrlInput) urlSourceUrlInput.value = "";

  showBookmarkToast("URL sources", "Source saved");
}

function renderLinkImportJobs() {
  if (!linkImportSummary || !linkImportJobList) return;

  const jobs = Array.isArray(linkImportJobs) ? linkImportJobs : [];

  if (!jobs.length) {
    linkImportSummary.textContent = "No direct URL imports queued yet.";
    linkImportJobList.innerHTML = `<div class="waveformJobEmpty">Paste a direct audio link to start.</div>`;
    return;
  }

  const complete = jobs.filter((job) => job.status === "complete").length;
  const failed = jobs.filter((job) => job.status === "failed").length;
  const active = jobs.filter((job) => ["queued", "downloading", "importing"].includes(job.status)).length;

  linkImportSummary.textContent = active
    ? `Importing • ${active} active • ${complete} imported • ${failed} failed`
    : `Finished • ${complete} imported • ${failed} failed`;

  linkImportJobList.innerHTML = "";

  jobs.slice(0, 12).forEach((job) => {
    const row = document.createElement("div");
    row.className = `urlImportJobRow is-${job.status}`;

    const percent = Math.max(0, Math.min(100, Math.round(Number(job.percent || 0))));
    const title = escapeHtml(job.name || "Direct URL import");
    const detail = escapeHtml(job.error || job.message || job.status || "Queued");
    const sizeText = job.totalBytes ? ` • ${formatUrlImportBytes(job.downloadedBytes)} / ${formatUrlImportBytes(job.totalBytes)}` : "";

    const icon =
      job.status === "complete"
        ? "fa-solid fa-check"
        : job.status === "failed"
          ? "fa-solid fa-triangle-exclamation"
          : job.status === "cancelled"
            ? "fa-solid fa-ban"
            : "fa-solid fa-cloud-arrow-down";

    row.innerHTML = `
      <div class="urlImportJobIcon">
        <i class="${icon}"></i>
      </div>
      <div class="urlImportJobMeta">
        <div class="urlImportJobTitle" title="${title}">${title}</div>
        <div class="urlImportJobSub">${detail}${sizeText}</div>
      </div>
      <div class="urlImportJobRight">
        <div class="urlImportJobStatus">${job.status === "complete" ? "Media imported" : detail}</div>
        <div class="urlImportJobPercent">${percent}%</div>
      </div>
      <div class="urlImportJobBar">
        <span style="width:${percent}%"></span>
      </div>
    `;

    linkImportJobList.appendChild(row);
  });
}

function linkImportHasActiveJobs() {
  return linkImportJobs.some((job) => ["queued", "downloading", "importing"].includes(job.status));
}

async function refreshLinkImportJobs() {
  try {
    const data = await getJsonNoStore("/imports/link/jobs");
    linkImportJobs = Array.isArray(data?.jobs) ? data.jobs : [];
    renderLinkImportJobs();

    if (linkImportHasActiveJobs()) {
      startLinkImportJobPoll();
    }
  } catch (err) {
    if (linkImportJobList) {
      linkImportJobList.innerHTML = `<div class="waveformJobEmpty">${err?.message || "Direct URL import jobs unavailable."}</div>`;
    }
  }
}

function startLinkImportJobPoll() {
  if (linkImportJobPollTimer) return;

  linkImportJobPollTimer = window.setInterval(async () => {
    await refreshLinkImportJobs();

    if (!linkImportHasActiveJobs()) {
      window.clearInterval(linkImportJobPollTimer);
      linkImportJobPollTimer = 0;
      await loadLibrary();
    }
  }, 1200);
}

async function startDirectUrlImport() {
  const inputUrl = String(linkImportUrlInput?.value || "").trim();

  if (!inputUrl) {
    showBookmarkToast("Direct URL Import", "Paste a direct audio URL first");
    return;
  }

  if (btnLinkImportStart) {
    btnLinkImportStart.disabled = true;
    btnLinkImportStart.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i><span>Queueing</span>`;
  }

  try {
    const data = await postJsonNoStore("/imports/link/start", {
      url: inputUrl,
    });

    if (data?.job) {
      linkImportJobs = [data.job, ...linkImportJobs.filter((job) => job.id !== data.job.id)];
      renderLinkImportJobs();
      startLinkImportJobPoll();
    }

    if (linkImportUrlInput) linkImportUrlInput.value = "";
    showBookmarkToast("Direct URL Import", "Import queued");
  } catch (err) {
    showBookmarkToast("Direct URL Import", err?.message || "Could not queue import");
  } finally {
    if (btnLinkImportStart) {
      btnLinkImportStart.disabled = false;
      btnLinkImportStart.innerHTML = `<i class="fa-solid fa-cloud-arrow-down"></i><span>Import URL</span>`;
    }
  }
}

function getWaveformSettingsTargetTrack() {
  return getPreviewTrack() || currentTrack() || null;
}

function setWaveformGenerationButtonsDisabled(disabled) {
  [btnWaveGenCurrent, btnWaveRegenCurrent, btnWaveGenAll, btnWaveRegenAll].forEach((btn) => {
    if (!btn) return;
    btn.disabled = disabled;
    btn.classList.toggle("disabledLike", disabled);
  });
}

function setWaveformGenerationStatus(text, tone = "") {
  if (!waveformGenStatus) return;

  waveformGenStatus.textContent = text;
  waveformGenStatus.classList.toggle("isLoading", tone === "loading");
  waveformGenStatus.classList.toggle("isSuccess", tone === "success");
  waveformGenStatus.classList.toggle("isError", tone === "error");
}

function stopWaveformJobPolling() {
  if (waveformJobPollTimer) {
    clearTimeout(waveformJobPollTimer);
    waveformJobPollTimer = 0;
  }
}

function getWaveformJobDisplayTitle(item) {
  const match = Array.isArray(library)
    ? library.find((track) => track?.id === item?.id)
    : null;

  if (match?.title) return match.title;

  const raw = String(item?.title || item?.id || "Track");
  return raw.replace(/\.[a-z0-9]{2,5}$/i, "");
}

function renderWaveformJobSnapshot(snapshot) {
  if (!waveformJobSummary || !waveformJobList) return;

  if (!snapshot || !Array.isArray(snapshot.items) || !snapshot.items.length) {
    waveformJobSummary.textContent = "No waveform job running.";
    waveformJobList.innerHTML = '<div class="waveformJobEmpty">Nothing generating yet.</div>';
    return;
  }

  const running = snapshot.status === "running";
  waveformJobSummary.textContent = `${running ? "Running" : "Finished"} • ${Number(snapshot.processed || 0)}/${Number(snapshot.total || 0)} processed • ${Number(snapshot.generated || 0)} generated • ${Number(snapshot.skipped || 0)} skipped • ${Number(snapshot.failed || 0)} failed`;

  waveformJobList.innerHTML = snapshot.items.map((item) => {
    const statusKey = String(item?.status || "queued");
    const statusLabel = {
      queued: "Queued",
      processing: "Processing",
      generated: "Complete",
      skipped: "Already cached",
      failed: "Failed",
    }[statusKey] || statusKey;

    const percent = Math.max(0, Math.min(100, Number(item?.progressPercent || 0)));
    const cardClass =
      statusKey === "generated"
        ? "isDone"
        : statusKey === "skipped"
          ? "isSkipped"
          : statusKey === "failed"
            ? "isFailed"
            : statusKey === "processing"
              ? "isProcessing"
              : "";

    return `
      <div class="waveformJobCard ${cardClass}">
        <div class="waveformJobCardFillLayer" style="width:${percent}%"></div>
        <div class="waveformJobCardInner">
          <div class="waveformJobRow">
            <div class="waveformJobMeta">
              <div class="waveformJobTitle">${escapeHtml(getWaveformJobDisplayTitle(item))}</div>
              <div class="waveformJobDetail">${escapeHtml(item?.detail || statusLabel)}</div>
            </div>
            <div class="waveformJobRight">
              <div class="waveformJobState">${escapeHtml(statusLabel)}</div>
              <div class="waveformJobPercent">${percent}%</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

async function pollWaveformJobStatus(jobId) {
  if (!jobId) return;

  try {
    const res = await fetch(`/waveforms/jobs/${encodeURIComponent(jobId)}`);
    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(payload?.error || payload?.detail || `Waveform job HTTP ${res.status}`);
    }

    waveformJobId = payload?.id || jobId;
    renderWaveformJobSnapshot(payload);

    if (payload?.status === "running") {
      waveformJobPollTimer = window.setTimeout(() => {
        void pollWaveformJobStatus(jobId);
      }, 500);
      return;
    }

    waveformGenerationInFlight = false;
    setWaveformGenerationButtonsDisabled(false);
    setWaveformGenerationStatus(
      Number(payload?.failed || 0) > 0
        ? `Waveform job finished with ${Number(payload?.failed || 0)} failed file(s).`
        : "Waveform job complete.",
      Number(payload?.failed || 0) > 0 ? "error" : "success"
    );

    showBookmarkToast(
      Number(payload?.failed || 0) > 0 ? "Waveform job finished with errors" : "Waveform job complete",
      `${Number(payload?.generated || 0)} generated`
    );

    const activeWaveformTrack = getPreviewTrack() || currentTrack() || null;
    if (activeWaveformTrack?.id) {
      await renderWaveformPlaceholder(activeWaveformTrack);
    }
  } catch (err) {
    console.error("Waveform job polling failed", err);
    waveformGenerationInFlight = false;
    setWaveformGenerationButtonsDisabled(false);
    setWaveformGenerationStatus(`Waveform job failed: ${err?.message || String(err)}`, "error");
  }
}

async function runWaveformGenerationFromSettings(options = {}) {
  if (waveformGenerationInFlight) return;

  const scope = options.scope === "single" ? "single" : "all";
  const force = options.force === true;
  const peakCount = 420;
  const targetTrack = scope === "single" ? getWaveformSettingsTargetTrack() : null;

  if (scope === "single" && !targetTrack?.id) {
    setSettingsSubPage("waveforms");
    setWaveformGenerationStatus("Pick or open a mix first, then try again.", "error");
    return;
  }

  waveformGenerationInFlight = true;
  stopWaveformJobPolling();
  setSettingsSubPage("waveforms");
  setWaveformGenerationButtonsDisabled(true);

  const loadingText = scope === "single"
    ? `${force ? "Rebuilding" : "Generating"} waveform for ${targetTrack?.title || "selected mix"}...`
    : `${force ? "Rebuilding" : "Generating"} waveforms for the whole library...`;

  setWaveformGenerationStatus(loadingText, "loading");
  renderWaveformJobSnapshot(null);

  try {
    const body = scope === "single"
      ? { scope: "single", id: targetTrack.id, count: peakCount, force }
      : { scope: "all", count: peakCount, force };

    const res = await fetch("/waveforms/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(payload?.error || payload?.detail || `Waveform HTTP ${res.status}`);
    }

    waveformJobId = payload?.id || "";
    renderWaveformJobSnapshot(payload);
    setWaveformGenerationStatus(
      scope === "single"
        ? `Waveform job started for ${targetTrack?.title || "selected mix"}.`
        : `Waveform job started for ${Number(payload?.total || 0)} file(s).`,
      "loading"
    );

    if (waveformJobId) {
      void pollWaveformJobStatus(waveformJobId);
      return;
    }

    waveformGenerationInFlight = false;
    setWaveformGenerationButtonsDisabled(false);
  } catch (err) {
    console.error("Waveform generation failed", err);
    waveformGenerationInFlight = false;
    setWaveformGenerationButtonsDisabled(false);
    const message = err?.message || String(err);
    setWaveformGenerationStatus(`Waveform generation failed: ${message}`, "error");
  }
}

async function deleteLibraryTrack(item) {
  if (!item?.id) return;

  const deletingCurrent = currentTrack()?.id === item.id;
  const deletingPreview = previewTrackId === item.id;

  try {
    await deleteJsonNoStore(`/library/${encodeURIComponent(item.id)}`);
  } catch (err) {
    showBookmarkToast("Delete failed", err?.message || "Could not delete this file");
    throw err;
  }

  const favKey = getFavouriteKey(item);
  const favStore = getFavouritesStore();
  delete favStore[item.id];
  if (favKey) delete favStore[favKey];
  saveFavouritesStore(favStore);

  queue = queue.filter((track) => track?.id !== item.id);

  if (!queue.length) {
    queueIndex = -1;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
  } else if (queueIndex >= queue.length) {
    queueIndex = queue.length - 1;
  }

  if (deletingPreview || deletingCurrent) {
    previewTrackId = "";
  }

  await loadLibrary();
  renderQueue();
  renderFavourites();
  updateFavouriteQuickButton();
  showBookmarkToast("File deleted", item.title || "Removed from BRMedia");
}

/* load library */
async function loadLibrary() {
  const res = await fetch("/library", { cache: "no-store" });
  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : [];
  let cloudItems = [];
  let customTagStore = {};

  try {
    const cloudData = await getJsonNoStore("/cloud/linked-tracks");
    cloudItems = Array.isArray(cloudData?.items) ? cloudData.items : [];
  } catch (err) {
    console.warn("Google Drive linked tracks unavailable", err);
  }

  try {
    const customTagData = await getJsonNoStore("/brmedia/custom-tags");
    customTagStore = customTagData?.tags && typeof customTagData.tags === "object" ? customTagData.tags : {};
    brMediaServerCustomTagStore = customTagStore;
  } catch (err) {
    console.warn("BRMedia custom tags unavailable", err);
    customTagStore = {};
  }

  const mergedItems = [...items, ...cloudItems].map((item) => ({
    ...item,
    brmediaTags: getBrMediaCustomTagsFromStoreForTrack(item, customTagStore),
  }));
  library = await Promise.all(mergedItems.map((item) => fetchTrackMeta(item)));

  reconcileFavouritesWithLibrary();
  libraryRenderLimit = 15;

  renderLibrary();
  renderLists();
  renderFavourites();
  renderPlaylists();
  renderSettingsFilesPage();
  updateReloadCountDisplay();

  if (settings.saveState && !playerStateRestoredOnce) {
    await pullServerPlayerStateIfNewer();
    restorePlayerState();
  }
}

/* settings listeners */
if (setDownloads) setDownloads.addEventListener("change", () => {
  settings.downloads = setDownloads.checked;
  saveSettings();
  applySettingsToUI();
});

if (setShuffle) setShuffle.addEventListener("change", () => {
  settings.shuffle = setShuffle.checked;
  saveSettings();
  applySettingsToUI();
});

if (setSavePos) setSavePos.addEventListener("change", () => {
  settings.savePos = setSavePos.checked;
  saveSettings();
  applySettingsToUI();
});

if (setSaveState) setSaveState.addEventListener("change", () => {
  settings.saveState = setSaveState.checked;
  saveSettings();
  applySettingsToUI();
});

if (setAutoplay) setAutoplay.addEventListener("change", () => {
  settings.autoplay = setAutoplay.checked;
  saveSettings();
  applySettingsToUI();
});

if (decBack) decBack.addEventListener("click", () => {
  settings.skipBackSec = clampSkip(settings.skipBackSec - 5);
  saveSettings();
  applySettingsToUI();
});

if (incBack) incBack.addEventListener("click", () => {
  settings.skipBackSec = clampSkip(settings.skipBackSec + 5);
  saveSettings();
  applySettingsToUI();
});

if (decFwd) decFwd.addEventListener("click", () => {
  settings.skipFwdSec = clampSkip(settings.skipFwdSec - 5);
  saveSettings();
  applySettingsToUI();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeAllTopPopups();
  }
});

if (incFwd) incFwd.addEventListener("click", () => {
  settings.skipFwdSec = clampSkip(settings.skipFwdSec + 5);
  saveSettings();
  applySettingsToUI();
});

if (deviceNameInput) {
  let deviceNameDraftTimer = null;

  deviceNameInput.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    e.stopPropagation();
    saveDevicePrefs({ skipHeartbeat: true, skipRerender: true });
    deviceNameInput.blur();
  });

  deviceNameInput.addEventListener("input", () => {
    clearTimeout(deviceNameDraftTimer);
    deviceNameDraftTimer = setTimeout(() => {
      saveDevicePrefs({ skipHeartbeat: true, skipRerender: true });
    }, 140);
  });

  deviceNameInput.addEventListener("change", () => saveDevicePrefs({ skipHeartbeat: true }));
  deviceNameInput.addEventListener("blur", () => saveDevicePrefs({ skipHeartbeat: true }));
}

if (deviceTypeSelect) {
  deviceTypeSelect.addEventListener("change", saveDevicePrefs);
}

if (deviceReceiveTransfers) {
  deviceReceiveTransfers.addEventListener("change", saveDevicePrefs);
}

if (deviceAllowRemote) {
  deviceAllowRemote.addEventListener("change", saveDevicePrefs);
}

if (btnBackupExportAll) btnBackupExportAll.addEventListener("click", () => {
  void exportBackupPackage("all");
});

if (btnBackupExportBrowser) btnBackupExportBrowser.addEventListener("click", () => {
  void exportBackupPackage("browser");
});

if (btnBackupExportServer) btnBackupExportServer.addEventListener("click", () => {
  void exportBackupPackage("server");
});

if (btnBackupExportSelected) btnBackupExportSelected.addEventListener("click", () => {
  void exportBackupPackage("selected");
});

if (btnBackupRestoreChoose && backupRestoreInput) {
  btnBackupRestoreChoose.addEventListener("click", () => backupRestoreInput.click());
}

if (btnBackupRestoreRun) {
  btnBackupRestoreRun.addEventListener("click", () => {
    const file = backupRestoreLoadedFile || backupRestoreInput?.files?.[0];

    if (!backupRestoreLoadedPackage && !file) {
      setBackupRestoreStatus("Pick a backup file first.", "error");
      return;
    }

    void restoreBackupPackageFromFile(file);
  });
}

if (backupRestoreInput) {
  backupRestoreInput.addEventListener("change", () => {
    const file = backupRestoreInput.files?.[0] || null;
    void previewBackupRestoreFile(file);
  });
}

if (btnLibraryUploadChoose && libraryUploadInput) {
  btnLibraryUploadChoose.addEventListener("click", () => libraryUploadInput.click());
}

if (libraryUploadInput) {
  libraryUploadInput.addEventListener("change", () => {
    const files = Array.from(libraryUploadInput.files || []);

    libraryUploadQueue = files.map((file, index) => ({
      id: `upload-${Date.now()}-${index}`,
      file,
      enabled: true,
      status: "queued",
      progressPercent: 0,
      title: getLibraryUploadDisplayTitle(file.name),
      detail: "Queued",
    }));

    libraryUploadInFlight = false;
    renderLibraryUploadQueue();
  });
}

if (libraryUploadStatusText) {
  libraryUploadStatusText.addEventListener("change", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (!target.matches("[data-upload-index]")) return;
    if (libraryUploadInFlight) return;

    const index = Number(target.getAttribute("data-upload-index") || -1);
    if (index < 0) return;

    const item = libraryUploadQueue[index];
    if (!item) return;

    item.enabled = !!target.checked;

    if (item.enabled) {
      item.status = "queued";
      item.progressPercent = 0;
      item.detail = "Queued";
    } else {
      item.status = "unticked";
      item.progressPercent = 0;
      item.detail = "Unticked • won't upload";
    }

    renderLibraryUploadQueue();
  });
}

if (btnLibraryUploadStart) {
  btnLibraryUploadStart.addEventListener("click", () => {
    void uploadMobileFilesFromPicker();
  });
}

if (btnWaveGenCurrent) btnWaveGenCurrent.addEventListener("click", () => {
  void runWaveformGenerationFromSettings({ scope: "single", force: false });
});

if (btnWaveRegenCurrent) btnWaveRegenCurrent.addEventListener("click", () => {
  void runWaveformGenerationFromSettings({ scope: "single", force: true });
});

if (btnWaveGenAll) btnWaveGenAll.addEventListener("click", () => {
  void runWaveformGenerationFromSettings({ scope: "all", force: false });
});

if (btnWaveRegenAll) btnWaveRegenAll.addEventListener("click", () => {
  void runWaveformGenerationFromSettings({ scope: "all", force: true });
});

if (valBack) {
  const commitBackInput = () => commitSkipInputValue("back");
  valBack.addEventListener("change", commitBackInput);
  valBack.addEventListener("blur", commitBackInput);
  valBack.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    commitBackInput();
    valBack.blur();
  });
}

if (valFwd) {
  const commitFwdInput = () => commitSkipInputValue("forward");
  valFwd.addEventListener("change", commitFwdInput);
  valFwd.addEventListener("blur", commitFwdInput);
  valFwd.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    commitFwdInput();
    valFwd.blur();
  });
}

/* main listeners */
if (btnReload) btnReload.addEventListener("click", async () => {
  if (reloadInFlight) return;

  hideReloadAddedMessage();
  const before = library.length;
  setReloadButtonState(true);

  try {
    await loadLibrary();
    const after = library.length;
    const added = Math.max(0, after - before);

    updateReloadCountDisplay();

    if (added > 0) {
      showReloadAddedMessage(`+${added} new file${added === 1 ? "" : "s"} added`);
    } else {
      showReloadAddedMessage("No new files added");
    }
  } finally {
    setReloadButtonState(false);
  }
});

if (btnTopSettings) btnTopSettings.addEventListener("click", (e) => {
  e.stopPropagation();
  closeNowPlaying();
  toggleSidebarMenu();
});

if (btnSidebarClose) btnSidebarClose.addEventListener("click", closeSidebarMenu);
if (btnSidebarCloseFloating) btnSidebarCloseFloating.addEventListener("click", closeSidebarMenu);
if (sidebarBackdrop) sidebarBackdrop.addEventListener("click", closeSidebarMenu);

if (btnTopSearch) {
  btnTopSearch.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setTab("Library");
    toggleHomeSearchPanel();
  });
}

window.addEventListener("scroll", syncTopMenuDockState, { passive: true });
window.addEventListener("resize", syncTopMenuDockState);

sidebarNavButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.tab || "Library";

    if (btn.dataset.resetLists === "true") {
      listsCategory = "";
      listsArtist = "";
      listsFolder = "";
    }

    homeNavRevealSlug = "";
    setTab(target);
    closeSidebarMenu();
  });
});

sidebarModuleButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const explicitRoute = btn.dataset.route || "";
    if (explicitRoute) {
      closeSidebarMenu();
      window.location.href = explicitRoute;
      return;
    }

    const moduleName = btn.dataset.module || "Module";
    const moduleRoutes = {
      "Converter": "/converter",
      "Tagger": "/tagger",
      "Mastering": "/mastering",
      "Video Player": "/video-player",
      "Stats": "/stats",
      "Server Settings": "/server-settings",
      "Universal Settings": "/settings?module=player&tab=overview",
    };

    const href = moduleRoutes[moduleName] || "/player";
    closeSidebarMenu();
    window.location.href = href;
  });
});

sidebarRouteButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const href = btn.dataset.route || "/player";
    closeSidebarMenu();
    window.location.href = href;
  });
});

if (btnSidebarOpenLists) {
  btnSidebarOpenLists.addEventListener("click", () => {
    listsCategory = "";
    listsArtist = "";
    listsFolder = "";
    setTab("Lists");
    closeSidebarMenu();
  });
}

if (btnSidebarFilesPage) {
  btnSidebarFilesPage.addEventListener("click", () => {
    openUniversalSettings("cloud", "files");
  });
}

if (btnSidebarDrivePage) {
  btnSidebarDrivePage.addEventListener("click", () => {
    openUniversalSettings("cloud", "google");
  });
}

if (btnHomeOpenLists) {
  btnHomeOpenLists.addEventListener("click", () => {
    listsCategory = "";
    listsArtist = "";
    listsFolder = "";
    setTab("Lists");
  });
}

if (btnHomeOpenFiles) {
  btnHomeOpenFiles.addEventListener("click", () => {
    openUniversalSettings("cloud", "files");
  });
}

if (btnHomeOpenDrive) {
  btnHomeOpenDrive.addEventListener("click", () => {
    openUniversalSettings("cloud", "google");
  });
}

if (btnGoogleDriveConnect) btnGoogleDriveConnect.addEventListener("click", () => {
  void openCloudConnect("google");
});

if (btnDropboxConnect) btnDropboxConnect.addEventListener("click", () => {
  void openCloudConnect("dropbox");
});

if (btnGoogleDriveBrowse) btnGoogleDriveBrowse.addEventListener("click", () => {
  void browseGoogleDrive();
});

if (btnDropboxBrowse) btnDropboxBrowse.addEventListener("click", () => {
  void browseDropbox();
});

if (btnDropboxSearch) btnDropboxSearch.addEventListener("click", () => {
  void searchDropbox();
});

if (btnLinkImportStart) {
  btnLinkImportStart.addEventListener("click", () => {
    void startDirectUrlImport();
  });
}

if (btnUrlSourceSave) {
  btnUrlSourceSave.addEventListener("click", () => {
    saveUrlSourceLink();
  });
}

if (linkImportUrlInput) {
  linkImportUrlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void startDirectUrlImport();
    }
  });
}

if (btnGoogleDriveBack) btnGoogleDriveBack.addEventListener("click", () => {
  goCloudFolderBack("google_drive");
});

if (btnGoogleDriveRoot) btnGoogleDriveRoot.addEventListener("click", () => {
  goCloudFolderRoot("google_drive");
});

if (btnDropboxBack) btnDropboxBack.addEventListener("click", () => {
  goCloudFolderBack("dropbox");
});

if (btnDropboxRoot) btnDropboxRoot.addEventListener("click", () => {
  goCloudFolderRoot("dropbox");
});

if (search) {
  search.addEventListener("input", () => {
    libraryRenderLimit = 15;
    renderLibrary();
  });
}

if (btnLibraryLoadMore) {
  btnLibraryLoadMore.addEventListener("click", () => {
    libraryRenderLimit += 15;
    renderLibrary();
  });
}

if (btnListsFilter) {
  btnListsFilter.addEventListener("click", () => {
    if (!listsFilterPanel) return;
    listsFilterPanel.classList.toggle("hidden");
  });
}

if (btnCategoryFilterApply) {
  btnCategoryFilterApply.addEventListener("click", () => {
    listsFilterMode = categoryFilterMode?.value || "all";
    listsSortMode = categorySortMode?.value || "default";
    if (listsFilterPanel) listsFilterPanel.classList.add("hidden");
    renderLists();
  });
}

if (btnCategoryFilterClear) {
  btnCategoryFilterClear.addEventListener("click", () => {
    listsFilterMode = "all";
    listsSortMode = "default";

    if (categoryFilterMode) categoryFilterMode.value = "all";
    if (categorySortMode) categorySortMode.value = "default";
    if (listsFilterPanel) listsFilterPanel.classList.add("hidden");

    renderLists();
  });
}

if (btnListsBack) {
  btnListsBack.addEventListener("click", () => {
    listsCategory = "";
    listsArtist = "";
    listsFolder = "";
    listsFilterMode = "all";
    listsSortMode = "default";

    if (categoryFilterMode) categoryFilterMode.value = "all";
    if (categorySortMode) categorySortMode.value = "default";
    if (listsFilterPanel) listsFilterPanel.classList.add("hidden");

    setTab("Library");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

if (search) search.addEventListener("input", renderLibrary);

if (btnClearQueue) btnClearQueue.addEventListener("click", () => {
  clearQueue();
});

if (miniPlayer) {
  miniPlayer.addEventListener("click", (e) => {
    if (e.target.closest(".miniControls") || e.target.closest(".miniDockTools")) return;

    if (miniPlayerCollapsed) {
      toggleMiniPlayerCollapsed(false);
      return;
    }

    if (isPreviewingDifferentTrack()) {
      syncPreviewBackToCurrentTrack();
      void setNowPlayingUI(currentTrack());
    }

    openNowPlaying();
  });
}

if (btnMiniCollapse) {
  btnMiniCollapse.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleMiniPlayerCollapsed();
  });
}

if (btnMiniEq) {
  btnMiniEq.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (miniPlayerCollapsed) {
      toggleMiniPlayerCollapsed(false);
      return;
    }

    if (isPreviewingDifferentTrack()) {
      syncPreviewBackToCurrentTrack();
      void setNowPlayingUI(currentTrack());
    }

    openNowPlaying();
  });
}

if (btnOpenStagePlayer) btnOpenStagePlayer.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  void openStagePlayer();
});

if (btnCloseStagePlayer) btnCloseStagePlayer.addEventListener("click", closeStagePlayer);

if (btnStageFlip) btnStageFlip.addEventListener("click", () => {
  if (btnStageFlip.disabled) return;
  setStagePlayerFlipped(!stagePlayerFlipped);
});

if (btnStageResume) btnStageResume.addEventListener("click", () => {
  togglePlay();
});

if (stagePlayerModal) stagePlayerModal.addEventListener("click", (e) => {
  if (!isStagePlayerOpen()) return;
  if (!audio || !audio.src || audio.paused) return;

  const target = e.target;
  if (!(target instanceof Element)) return;

  if (target.closest(".stageCircleBtn")) return;
  if (target.closest(".stageResumeBtn")) return;
  if (target.closest(".stageWaveRegion")) return;
  if (target.closest(".stageTrackRow")) return;

  togglePlay();
});

tabs.forEach((tab) => tab.addEventListener("click", () => setTab(tab.dataset.tab)));

if (btnPrev) btnPrev.addEventListener("click", (e) => { e.stopPropagation(); prev(); });
if (btnNext) btnNext.addEventListener("click", (e) => { e.stopPropagation(); next(); });

if (btnNPPrev) btnNPPrev.addEventListener("click", prev);
if (btnNPNext) btnNPNext.addEventListener("click", next);
if (btnNPPlay) btnNPPlay.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();

  const preview = getPreviewTrack();

  if (isShowingPreviewTrack() && preview) {
    requestTrackPlay(preview, { openPlayer: true, autoplay: true });
    return;
  }

  togglePlay();
});

if (btnPlay) btnPlay.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  toggleCurrentPlayback();
});

if (btnBackN) btnBackN.addEventListener("click", () => {
  if (!audio) return;
  audio.currentTime = Math.max(0, audio.currentTime - settings.skipBackSec);
});

if (btnFwdN) btnFwdN.addEventListener("click", () => {
  if (!audio) return;
  audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + settings.skipFwdSec);
});

function jumpToTimedTrack(track) {
  if (!audio || !track || !Number.isFinite(track.seconds)) return;

  audio.currentTime = Math.max(0, track.seconds);
  updateTracklistProgress();
  updateCurrentTimedTrackUI();
  updateStageTimeRow();
  persistPlaybackPosition();
}

if (btnTimedPrev) btnTimedPrev.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();

  const { prevTrack } = getTimedTrackNavigationState();
  jumpToTimedTrack(prevTrack);
});

if (btnTimedNext) btnTimedNext.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();

  const { nextTrack } = getTimedTrackNavigationState();
  jumpToTimedTrack(nextTrack);
});

if (btnMenuShuffle) btnMenuShuffle.addEventListener("click", () => {
  settings.shuffle = !settings.shuffle;
  saveSettings();
  updateShuffleButton();
  if (setShuffle) setShuffle.checked = settings.shuffle;
  showBookmarkToast("Shuffle updated", settings.shuffle ? "Shuffle on" : "Shuffle off");
});

if (btnMenuRepeat) btnMenuRepeat.addEventListener("click", cycleRepeatMode);

if (btnFavQuick) btnFavQuick.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();

  const track = currentTrack();
  if (!track) return;
  toggleFavouriteTrack(track);
});

if (btnBookmarkQuick) btnBookmarkQuick.addEventListener("click", () => {
  addBookmarkForCurrentTrack();
});

if (btnPlayerMoreQuick) btnPlayerMoreQuick.addEventListener("click", () => {
  toggleTopPopup("playerQuickMenu", btnPlayerMoreQuick);
});

if (btnPlayerQuickEQ) btnPlayerQuickEQ.addEventListener("click", async () => {
  closeAllTopPopups();
  await openEqPopup(btnPlayerMoreQuick || btnTopMenu || btnSleep);
});

if (btnPlayerQuickSpeed) btnPlayerQuickSpeed.addEventListener("click", () => {
  closeAllTopPopups();
  openSpeedPopup(btnPlayerMoreQuick || btnTopMenu || btnSleep);
});

if (btnPlayerQuickMirror) btnPlayerQuickMirror.addEventListener("click", async () => {
  closeAllTopPopups();
  await openMirrorPopup(btnPlayerMoreQuick || btnTopMenu || btnSleep);
});

if (btnPlayerQuickCast) btnPlayerQuickCast.addEventListener("click", async () => {
  closeAllTopPopups();
  await openCastPopup(btnPlayerMoreQuick || btnTopMenu || btnSleep);
});

if (btnPlayerQuickOutput) btnPlayerQuickOutput.addEventListener("click", async () => {
  closeAllTopPopups();
  await openOutputPopup(btnPlayerMoreQuick || btnTopMenu || btnSleep);
});

if (trackActionPrompt) {
  trackActionPrompt.addEventListener("click", (e) => {
    if (e.target === trackActionPrompt) closeTrackActionPrompt();
  });
}

if (btnTrackActionPlayNow) btnTrackActionPlayNow.addEventListener("click", () => {
  const pending = pendingTrackAction;
  closeTrackActionPrompt();
  if (!pending?.track) return;

  if (pending.options?.playMode === "queueIndex" && Number.isInteger(pending.options?.queueIndex)) {
    playAt(pending.options.queueIndex);
    return;
  }

  loadTrackIntoPlayer(pending.track, {
    openPlayer: pending.options?.openPlayer !== false,
    autoplay: pending.options?.autoplay !== false,
  });
});

if (btnTrackActionAddQueue) btnTrackActionAddQueue.addEventListener("click", () => {
  const pending = pendingTrackAction;
  closeTrackActionPrompt();
  if (!pending?.track) return;
  addTrackToQueueFromPrompt(pending.track);
});

if (btnTrackActionPlaylist) btnTrackActionPlaylist.addEventListener("click", async () => {
  const pending = pendingTrackAction;
  closeTrackActionPrompt();
  if (!pending?.track) return;
  await openPlaylistPickerForTracks([pending.track]);
});

if (btnTrackActionCancel) btnTrackActionCancel.addEventListener("click", closeTrackActionPrompt);

/* top popup listeners */
if (btnSleep) btnSleep.addEventListener("click", () => {
  setSleepPopupPage("presets");
  toggleTopPopup("sleep", btnSleep);
  updateSleepStatusLive();
});


if (btnTopDownload) btnTopDownload.addEventListener("click", async () => {
  toggleTopPopup("download", btnTopDownload);
  if (openTopPopupName === "download") {
    await populateDownloadPopup();
  }
});

if (btnOpenBookmarksTop) btnOpenBookmarksTop.addEventListener("click", () => {
  toggleTopPopup("bookmark", btnOpenBookmarksTop);
  renderBookmarks();
});

if (btnTopMenu) btnTopMenu.addEventListener("click", () => {
  toggleTopPopup("menu", btnTopMenu);
});

if (topPopupBackdrop) {
  topPopupBackdrop.addEventListener("click", closeAllTopPopups);
}

if (btnSleepFlip) btnSleepFlip.addEventListener("click", () => {
  const nextPage = sleepPopupPage === "presets" ? "custom" : "presets";
  setSleepPopupPage(nextPage);
});

window.addEventListener("resize", () => {
  requestAnimationFrame(() => {
    refreshSleepWheelsIfOpen();
    syncWaveformPads();
    refreshWaveformAfterResize();
    updateWaveProgress();
    configureAllMarquees();
    updateTracklistProgress();
    updateCurrentTimedTrackUI();
    renderStageTracklistCard(getStageDisplayTrack());
    updateStageWaveProgress();
    updateStageTimeRow();
  });
});

document.addEventListener("visibilitychange", () => {
  syncEqWithPageVisibility();
});

window.addEventListener("pageshow", () => {
  syncEqWithPageVisibility();
});

window.addEventListener("focus", () => {
  syncEqWithPageVisibility();
});

window.addEventListener("blur", () => {
  syncEqWithPageVisibility();
});

if (btnSpeedCloseTop) btnSpeedCloseTop.addEventListener("click", closeAllTopPopups);
if (btnSpeedDone) btnSpeedDone.addEventListener("click", closeAllTopPopups);

if (btnEqCloseTop) btnEqCloseTop.addEventListener("click", closeAllTopPopups);
if (btnEqDone) btnEqDone.addEventListener("click", closeAllTopPopups);
if (btnCastCloseTop) btnCastCloseTop.addEventListener("click", closeAllTopPopups);
if (btnCastDone) btnCastDone.addEventListener("click", closeAllTopPopups);
if (btnCastStart) btnCastStart.addEventListener("click", startCastFlow);
if (btnMirrorCloseTop) btnMirrorCloseTop.addEventListener("click", closeAllTopPopups);
if (btnMirrorDone) btnMirrorDone.addEventListener("click", closeAllTopPopups);
if (btnMirrorStart) btnMirrorStart.addEventListener("click", startMirrorFlow);
if (btnOutputCloseTop) btnOutputCloseTop.addEventListener("click", closeAllTopPopups);
if (btnOutputDone) btnOutputDone.addEventListener("click", closeAllTopPopups);
if (btnOutputChoose) btnOutputChoose.addEventListener("click", () => { void startAudioOutputFlow(); });

if (outputDeviceList) {
  outputDeviceList.addEventListener("click", async (e) => {
    const target = e.target instanceof Element
      ? e.target.closest("[data-output-device-id]")
      : null;

    if (!target || !audio || typeof audio.setSinkId !== "function") return;

    const deviceId = target.getAttribute("data-output-device-id") || "";
    const label = target.getAttribute("data-output-device-label") || "Selected device";
    if (!deviceId) return;

    try {
      await audio.setSinkId(deviceId);
      outputSelectedSinkId = deviceId;
      outputSelectedSinkLabel = label;
      await updateOutputPopupUI();
      showBookmarkToast("Audio output", label);
    } catch (err) {
      console.warn("setSinkId failed", err);
      showBookmarkToast("Audio output", "Could not switch output");
    }
  });
}

if (eqEnabled) {
  eqEnabled.addEventListener("change", async () => {
    await setEqEnabledState(eqEnabled.checked);
  });
}

if (eqPreset) {
  eqPreset.addEventListener("change", () => {
    applyEqPreset(eqPreset.value || "flat");
  });
}

if (eqPreamp) {
  eqPreamp.addEventListener("input", async () => {
    await handleEqPreampChange(eqPreamp.value);
  });
}

if (btnEqReset) {
  btnEqReset.addEventListener("click", () => {
    applyEqPreset("flat");
  });
}

if (btnSendDeviceCloseTop) btnSendDeviceCloseTop.addEventListener("click", closeAllTopPopups);
if (btnSendDeviceDone) btnSendDeviceDone.addEventListener("click", closeAllTopPopups);

if (btnConnectOpenDevices) btnConnectOpenDevices.addEventListener("click", () => {
  openUniversalSettings("player", "devices");
});

if (btnConnectOpenSend) btnConnectOpenSend.addEventListener("click", () => {
  openSendToDevicePopup(btnConnectOpenSend);
});

if (btnSendDeviceOpenDevices) btnSendDeviceOpenDevices.addEventListener("click", () => {
  closeAllTopPopups();
  openUniversalSettings("player", "devices");
});

if (btnDeviceRegenerateId) btnDeviceRegenerateId.addEventListener("click", () => {
  devicePrefs.deviceId = createDeviceId();
  saveDevicePrefs();
  showBookmarkToast("Devices", "New device ID created");
});

if (sendDeviceDeviceList) {
  sendDeviceDeviceList.addEventListener("click", (e) => {
    const target = e.target instanceof Element
      ? e.target.closest("[data-send-device-id]")
      : null;
    if (!target) return;

    const nextId = target.getAttribute("data-send-device-id") || "";
    if (!nextId) return;

    devicePrefs.lastTargetId = nextId;
    persistDevicePrefs();
    renderSendToDeviceUI();
  });
}

if (sendDeviceActionGrid) {
  sendDeviceActionGrid.addEventListener("click", (e) => {
    const target = e.target instanceof Element
      ? e.target.closest("[data-send-action]")
      : null;
    if (!target) return;

    const action = target.getAttribute("data-send-action") || "";
    if (!action) return;

    const selected = getSelectedSendTarget();
    const track = getPreviewTrack() || currentTrack();

    if (!selected) {
      showBookmarkToast("Send to device", "No online device selected");
      return;
    }

    if (!track) {
      showBookmarkToast("Send to device", "No mix is open right now");
      return;
    }

    void sendDeviceActionToServer(action, selected, track);
  });
}

[
  ["32", eqBand32],
  ["64", eqBand64],
  ["125", eqBand125],
  ["250", eqBand250],
  ["500", eqBand500],
  ["1000", eqBand1k],
  ["2000", eqBand2k],
  ["4000", eqBand4k],
  ["8000", eqBand8k],
  ["16000", eqBand16k],
].forEach(([freq, slider]) => {
  if (!slider) return;
  slider.addEventListener("input", async () => {
    await handleEqBandChange(freq, slider.value);
  });
});

if (btnSleepCancelPopup) btnSleepCancelPopup.addEventListener("click", () => {
  clearSleep();
  closeAllTopPopups();
});

if (btnSleepStopActive) btnSleepStopActive.addEventListener("click", () => {
  clearSleep();
});

if (btnSleepFinalCancel) btnSleepFinalCancel.addEventListener("click", () => {
  clearSleep();
});

document.querySelectorAll(".sleepPresetBtn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const value = btn.dataset.seconds;
    if (value === "songend") {
      startSleepSongEnd();
      updateSleepStatusLive();
      return;
    }
    const seconds = Number(value);
    if (seconds > 0) {
      startSleepSeconds(seconds);
      updateSleepStatusLive();
    }
  });
});

if (btnSleepStart) btnSleepStart.addEventListener("click", () => {
  const h = Number(customHours?.value || 0);
  const m = Number(customMinutes?.value || 0);
  const s = Number(customSeconds?.value || 0);
  const total = (h * 3600) + (m * 60) + s;

  if (!total) {
    if (sleepHint) sleepHint.textContent = "Enter hours, minutes or seconds first.";
    return;
  }

  startSleepSeconds(total);
  updateSleepStatusLive();
});

if (btnDownloadConfirm) btnDownloadConfirm.addEventListener("click", triggerDownload);

/* bookmark listeners */
if (btnAddBookmark) btnAddBookmark.addEventListener("click", () => {
  addBookmarkForCurrentTrack();
});

if (btnBookmarkTabCurrent) btnBookmarkTabCurrent.addEventListener("click", () => {
  bookmarkTab = "current";
  bookmarkAllMode = "groups";
  bookmarkSelectedTrackKey = "";
  bookmarkSelectedGroupKey = "";
  btnBookmarkTabCurrent.classList.add("active");
  btnBookmarkTabAll.classList.remove("active");
  renderBookmarks();
});

if (btnBookmarkTabAll) btnBookmarkTabAll.addEventListener("click", () => {
  bookmarkTab = "all";
  bookmarkAllMode = "groups";
  bookmarkSelectedTrackKey = "";
  bookmarkSelectedGroupKey = "";
  btnBookmarkTabAll.classList.add("active");
  btnBookmarkTabCurrent.classList.remove("active");
  renderBookmarks();
});

if (btnBookmarkBackToSongs) btnBookmarkBackToSongs.addEventListener("click", () => {
  bookmarkAllMode = "groups";
  bookmarkSelectedTrackKey = "";
  bookmarkSelectedGroupKey = "";
  renderBookmarks();
});

if (btnBookmarkPopupMenu) btnBookmarkPopupMenu.addEventListener("click", openBookmarkToolsPopup);

if (btnBookmarkToolsClose) btnBookmarkToolsClose.addEventListener("click", () => {
  closeAllTopPopups();
  openTopPopup("bookmark", btnOpenBookmarksTop);
  renderBookmarks();
});

if (btnBookmarkSortNewest) btnBookmarkSortNewest.addEventListener("click", () => {
  const key = bookmarkTab === "current" ? currentTrackKey() : (bookmarkSelectedGroupKey || bookmarkSelectedTrackKey);
  if (!key) return;
  setBookmarkSortModeForTrack(key, "newest");
  bookmarkSortMode = "newest";
  closeAllTopPopups();
  openTopPopup("bookmark", btnOpenBookmarksTop);
  renderBookmarks();
});

if (btnBookmarkSortOldest) btnBookmarkSortOldest.addEventListener("click", () => {
  const key = bookmarkTab === "current" ? currentTrackKey() : (bookmarkSelectedGroupKey || bookmarkSelectedTrackKey);
  if (!key) return;
  setBookmarkSortModeForTrack(key, "oldest");
  bookmarkSortMode = "oldest";
  closeAllTopPopups();
  openTopPopup("bookmark", btnOpenBookmarksTop);
  renderBookmarks();
});

if (btnBookmarkManualSort) btnBookmarkManualSort.addEventListener("click", () => {
  const key = bookmarkTab === "current" ? currentTrackKey() : (bookmarkSelectedGroupKey || bookmarkSelectedTrackKey);
  if (!key) return;
  setBookmarkSortModeForTrack(key, "manual");
  bookmarkSortMode = "manual";
  closeAllTopPopups();
  openTopPopup("bookmark", btnOpenBookmarksTop);
  renderBookmarks();
});

if (btnBookmarkDeleteSong) btnBookmarkDeleteSong.addEventListener("click", () => {
  const key = bookmarkTab === "current" ? currentTrackKey() : (bookmarkSelectedGroupKey || bookmarkSelectedTrackKey);
  if (!key) return;
  deleteAllBookmarksForTrack(key);
  closeAllTopPopups();
  openTopPopup("bookmark", btnOpenBookmarksTop);
});

if (btnBookmarkDeleteAll) btnBookmarkDeleteAll.addEventListener("click", () => {
  deleteAllBookmarksEverywhere();
  closeAllTopPopups();
  openTopPopup("bookmark", btnOpenBookmarksTop);
});

if (btnBookmarkToastClose) btnBookmarkToastClose.addEventListener("click", hideBookmarkToast);

if (btnBookmarkEditCancel) {
  btnBookmarkEditCancel.addEventListener("click", closeBookmarkEditOverlay);
}

if (btnBookmarkEditSave) {
  btnBookmarkEditSave.addEventListener("click", saveBookmarkEditOverlay);
}

if (bookmarkEditOverlay) {
  bookmarkEditOverlay.addEventListener("click", (e) => {
    if (e.target === bookmarkEditOverlay) closeBookmarkEditOverlay();
  });
}

if (tracklistCardEl) {
  tracklistCardEl.addEventListener("change", async (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;

if (target.matches("[data-edit-time-index]")) {
  const index = Number(target.getAttribute("data-edit-time-index") || -1);
  if (tracklistTimeAutoSaveTimer) {
    clearTimeout(tracklistTimeAutoSaveTimer);
    tracklistTimeAutoSaveTimer = 0;
  }
  if (index >= 0) {
    const finalText = normaliseTracklistTimeText(target.value);
    target.value = finalText;
    setTracklistRowTime(index, finalText);
    await saveTracklistEdits();
    setTracklistEditStatus(`Saved ${finalText || "time"} in row ${index + 1}.`, { dirty: false });
  }
  return;
}

    if (target.matches("[data-meta-label-index]")) {
      const index = Number(target.getAttribute("data-meta-label-index") || -1);
      if (index >= 0) {
        updateTracklistMetaRow(index, "label", target.value);

        if (isTracklistCountryLabel(target.value)) {
          updateTracklistMetaRow(index, "icon", "gb-eng");
          updateTracklistMetaRow(index, "value", "England");
          renderTracklistData(currentTracklistData);
        }
      }
      return;
    }

    if (target.matches("[data-meta-icon-index]")) {
      const index = Number(target.getAttribute("data-meta-icon-index") || -1);
      if (index >= 0) {
        const entry = currentTracklistData?.metaEntries?.[index];
        updateTracklistMetaRow(index, "icon", target.value);

        if (isTracklistCountryLabel(entry?.label)) {
          updateTracklistMetaRow(index, "value", resolveTracklistCountryDisplayName(target.value));
          renderTracklistData(currentTracklistData);
          syncRenderedCountryMetaSelects();
        }
      }
      return;
    }

    if (target.matches("[data-meta-value-index]")) {
      const index = Number(target.getAttribute("data-meta-value-index") || -1);
      if (index >= 0) updateTracklistMetaRow(index, "value", target.value);
    }
  });

tracklistCardEl.addEventListener("input", (e) => {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;

  if (target.matches("[data-edit-title-index]")) {
    const index = Number(target.getAttribute("data-edit-title-index") || -1);
    if (index >= 0) updateTracklistRowTitle(index, target.value);
    return;
  }

  if (target.matches("[data-edit-time-index]")) {
    const index = Number(target.getAttribute("data-edit-time-index") || -1);
    const formatted = formatTracklistTimeInputForTyping(target.value);

    if (target.value !== formatted) {
      const hadSelectionApi = typeof target.setSelectionRange === "function";
      target.value = formatted;
      if (hadSelectionApi && document.activeElement === target) {
        try {
          target.setSelectionRange(formatted.length, formatted.length);
        } catch {}
      }
    }

    if (index >= 0) {
      setTracklistRowTimeDraft(index, formatted);
      scheduleTracklistTimeAutoSave(index, formatted);
    }
    return;
  }

  if (target.matches("[data-tracklist-description-input]")) {
    updateTracklistDescription(target.value);
    return;
  }

  if (target.matches("[data-meta-value-index]")) {
    const index = Number(target.getAttribute("data-meta-value-index") || -1);
    if (index >= 0) updateTracklistMetaRow(index, "value", target.value);
  }
});

tracklistCardEl.addEventListener("focusin", (e) => {
  const target = e.target;
  if (!(target instanceof HTMLInputElement)) return;
  if (!target.matches("[data-edit-time-index]")) return;

  requestAnimationFrame(() => {
    try {
      target.select();
    } catch {}
  });
});

  tracklistCardEl.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    const useCurrentBtn = target.closest("[data-edit-use-current]");
    if (useCurrentBtn) {
      const index = Number(useCurrentBtn.getAttribute("data-edit-use-current") || -1);
if (index >= 0) void assignCurrentTimeToTrackRow(index);
      return;
    }

    const nudgeBtn = target.closest("[data-edit-nudge]");
    if (nudgeBtn) {
      const index = Number(nudgeBtn.getAttribute("data-edit-nudge") || -1);
      const delta = Number(nudgeBtn.getAttribute("data-edit-delta") || 0);
      if (index >= 0 && delta) nudgeTracklistRow(index, delta);
      return;
    }

const moveMetaUpBtn = target.closest("[data-meta-move-up-index]");
if (moveMetaUpBtn) {
  const index = Number(moveMetaUpBtn.getAttribute("data-meta-move-up-index") || -1);
  if (index >= 0) moveTracklistMetaRow(index, -1);
  return;
}

const moveMetaDownBtn = target.closest("[data-meta-move-down-index]");
if (moveMetaDownBtn) {
  const index = Number(moveMetaDownBtn.getAttribute("data-meta-move-down-index") || -1);
  if (index >= 0) moveTracklistMetaRow(index, 1);
  return;
}

const removeMetaBtn = target.closest("[data-meta-remove-index]");
if (removeMetaBtn) {
  const index = Number(removeMetaBtn.getAttribute("data-meta-remove-index") || -1);
  if (index >= 0) removeTracklistMetaRow(index);
  return;
}

const removeRowBtn = target.closest("[data-edit-remove-row]");
if (removeRowBtn) {
  const index = Number(removeRowBtn.getAttribute("data-edit-remove-row") || -1);
  if (index >= 0) removeTracklistRow(index);
}
  });
}

if (btnTracklistMarkNow) btnTracklistMarkNow.addEventListener("click", () => {
  void markCurrentTracklistTime();
});

if (btnTracklistAddRow) btnTracklistAddRow.addEventListener("click", () => {
  addBlankTracklistRow();
});

if (btnTracklistAddMeta) btnTracklistAddMeta.addEventListener("click", () => {
  addBlankMetaRow();
});

if (btnTracklistNewBlank) btnTracklistNewBlank.addEventListener("click", () => {
  createBlankTracklistForCurrent();
});

if (btnTracklistScanLocal) btnTracklistScanLocal.addEventListener("click", () => {
  void scanTracklistFromLocal();
});

if (btnTracklistAttachFile) {
  btnTracklistAttachFile.addEventListener("click", () => {
    void openTracklistLibrary();
  });
}

if (tracklistLibraryOverlay) {
  tracklistLibraryOverlay.addEventListener("click", (event) => {
    if (
      event.target === tracklistLibraryOverlay ||
      event.target.closest?.("[data-tracklist-library-close]")
    ) {
      closeTracklistLibrary();
      return;
    }

    const tabButton =
      event.target.closest?.("[data-tracklist-library-tab]");

    if (tabButton) {
      tracklistLibraryTab =
        tabButton.dataset.tracklistLibraryTab || "txt";

      tracklistLibrarySelectedPath = "";

      renderTracklistLibrary();
      return;
    }

    const fileButton =
      event.target.closest?.("[data-tracklist-library-select]");

    if (fileButton) {
      const previousListScroll = Number(
        tracklistLibraryBody
          ?.querySelector(".tracklistLibraryFiles")
          ?.scrollTop || 0
      );

      tracklistLibrarySelectedPath =
        fileButton.dataset.tracklistLibrarySelect || "";

      renderTracklistLibrary();

      requestAnimationFrame(() => {
        const list =
          tracklistLibraryBody
            ?.querySelector(".tracklistLibraryFiles");

        if (list) list.scrollTop = previousListScroll;
      });

      return;
    }

    if (event.target.closest?.("[data-tracklist-library-refresh]")) {
      void loadTracklistLibraryFiles({ refresh: true });
      return;
    }

    if (event.target.closest?.("[data-tracklist-library-attach]")) {
      void attachSelectedTracklistLibraryFile();
      return;
    }

    if (event.target.closest?.("[data-tracklist-library-upload]")) {
      if (tracklistAttachFileInput) {
        tracklistAttachFileInput.value = "";
        tracklistAttachFileInput.click();
      }
    }
  });

  tracklistLibraryOverlay.addEventListener("input", (event) => {
    if (event.target?.id !== "tracklistLibrarySearch") return;

    tracklistLibraryQuery = event.target.value || "";

    renderTracklistLibrary();

    const input =
      document.getElementById("tracklistLibrarySearch");

    if (input) {
      input.focus();
      input.setSelectionRange(
        input.value.length,
        input.value.length
      );
    }
  });
}

if (tracklistAttachFileInput) {
  tracklistAttachFileInput.addEventListener("change", async () => {
    const file = tracklistAttachFileInput.files?.[0];

    if (!file) return;

    await attachTracklistFileToCurrent(file);

    tracklistLibraryItems = [];

    closeTracklistLibrary();
  });
}

if (btnTracklistAutoScan) btnTracklistAutoScan.addEventListener("click", () => {
  void startTracklistAutoScan();
});

if (btnTracklistNameDetect) btnTracklistNameDetect.addEventListener("click", () => {
  void startTracklistNameDetect();
});

if (btnTracklistSave) btnTracklistSave.addEventListener("click", () => {
  void saveTracklistEdits();
});

if (btnTracklistCancel) btnTracklistCancel.addEventListener("click", () => {
  setTracklistEditMode(false);
});

/* menu listeners */
if (btnMenuContinuePlayback) btnMenuContinuePlayback.addEventListener("click", () => {
  closeAllTopPopups();
  if (audio?.paused) audio.play().catch(() => {});
});

if (btnMenuSearch) btnMenuSearch.addEventListener("click", () => {
  closeAllTopPopups();
  setTab("Library");
  search?.focus();
});

if (btnMenuRecents) btnMenuRecents.addEventListener("click", () => {
  closeAllTopPopups();
  closeNowPlaying();
  setTab("Recents");
  renderRecents();
});

if (btnMenuFavorites) btnMenuFavorites.addEventListener("click", () => {
  closeNowPlaying();
  setTab("Favourites");
  renderFavourites();
});

if (btnMenuBookmarks) btnMenuBookmarks.addEventListener("click", () => {
  closeAllTopPopups();
  renderBookmarks();
  if (btnOpenBookmarksTop && !nowPlayingModal?.classList.contains("hidden")) {
    openTopPopup("bookmark", btnOpenBookmarksTop);
    return;
  }
  closeNowPlaying();
  setTab("Library");
});

if (btnMenuEQ) btnMenuEQ.addEventListener("click", async () => {
  closeAllTopPopups();
  await openEqPopup(btnTopMenu || btnPlayerMoreQuick || btnSleep);
});

if (btnMenuSleep) btnMenuSleep.addEventListener("click", () => {
  closeAllTopPopups();
  setSleepPopupPage("presets");
  openTopPopup("sleep", btnSleep);
  updateSleepStatusLive();
});

if (btnMenuQueue) btnMenuQueue.addEventListener("click", () => {
  closeAllTopPopups();
  closeNowPlaying();
  setTab("Queue");
  renderQueue();
});

if (btnMenuSaveQueue) btnMenuSaveQueue.addEventListener("click", () => {
  closeAllTopPopups();
  void saveQueueToPlaylistFlow();
});

if (btnMenuDeleteQueue) btnMenuDeleteQueue.addEventListener("click", () => {
  clearQueue();
  closeAllTopPopups();
});

if (btnMenuSendToDevice) btnMenuSendToDevice.addEventListener("click", () => {
  closeAllTopPopups();
  openSendToDevicePopup();
});

if (btnMenuPreviewShare) btnMenuPreviewShare.addEventListener("click", () => {
  closeAllTopPopups();
  openPreviewShareOverlay();
});

if (btnPreviewShareClose) btnPreviewShareClose.addEventListener("click", closePreviewShareOverlay);

if (previewShareOverlay) {
  previewShareOverlay.addEventListener("click", (e) => {
    if (e.target === previewShareOverlay) closePreviewShareOverlay();
  });
}

if (btnPreviewShareStartNow) btnPreviewShareStartNow.addEventListener("click", setPreviewShareStartFromCurrent);
if (btnPreviewShareStopNow) btnPreviewShareStopNow.addEventListener("click", setPreviewShareStopFromCurrent);
if (btnPreviewShareBuild) btnPreviewShareBuild.addEventListener("click", commitPreviewShareInputs);

if (btnPreviewShareSend) {
  btnPreviewShareSend.addEventListener("click", () => {
    void sendPreviewShareClip();
  });
}

if (previewShareStartInput) previewShareStartInput.addEventListener("change", commitPreviewShareInputs);
if (previewShareEndInput) previewShareEndInput.addEventListener("change", commitPreviewShareInputs);
if (previewShareDurationInput) previewShareDurationInput.addEventListener("change", commitPreviewShareInputs);

previewSharePresetButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    applyPreviewSharePreset(Number(btn.dataset.previewSeconds || 30));
  });
});

if (btnThemeDialogCancel) {
  btnThemeDialogCancel.addEventListener("click", () => closeThemeDialog(null));
}

if (btnThemeDialogOk) {
  btnThemeDialogOk.addEventListener("click", () => {
    if (themeDialogHasInput && themeDialogInput) {
      closeThemeDialog(themeDialogInput.value);
      return;
    }
    closeThemeDialog(true);
  });
}

if (themeDialogOverlay) {
  themeDialogOverlay.addEventListener("click", (e) => {
    if (e.target === themeDialogOverlay) closeThemeDialog(null);
  });
}

if (themeDialogInput) {
  themeDialogInput.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    closeThemeDialog(themeDialogInput.value);
  });
}

if (btnMenuEditTrack) btnMenuEditTrack.addEventListener("click", openTrackEditLauncher);

if (trackEditLauncherOverlay) {
  trackEditLauncherOverlay.addEventListener("click", (event) => {
    if (event.target === trackEditLauncherOverlay) closeTrackEditLauncher();
  });
}

if (btnTrackEditLauncherClose) btnTrackEditLauncherClose.addEventListener("click", closeTrackEditLauncher);
if (btnTrackEditQuickEdit) btnTrackEditQuickEdit.addEventListener("click", openTrackQuickEditRoute);
if (btnTrackEditTagger) btnTrackEditTagger.addEventListener("click", () => openTrackEditRoute("/tagger"));
if (btnTrackEditConverter) btnTrackEditConverter.addEventListener("click", () => openTrackEditRoute("/converter"));
if (btnTrackEditMastering) btnTrackEditMastering.addEventListener("click", () => openTrackEditRoute("/mastering"));

if (btnMenuEditTimestamps) btnMenuEditTimestamps.addEventListener("click", async () => {
  const track = currentTrack();
  closeAllTopPopups();
  if (!track) return;

  if (settings.tracklistEditLocked) {
    const ok = await confirmThemeAction(
      "Tracklist editing is locked in Universal Settings to stop accidental timestamp changes. Unlock editing for this mix now?",
      "Tracklist edit lock",
      "Unlock editing"
    );
    if (!ok) return;
  }

  tracklistEditDirty = false;
  tracklistEditTrackId = track.id;

  if (!currentTracklistData || currentTrackId() !== track.id) {
    await loadTracklist(track.id);
  }

  setTracklistEditMode(true, { silent: true });
});

if (btnMenuClosePlayer) btnMenuClosePlayer.addEventListener("click", closeNowPlaying);

if (btnMenuSettings) btnMenuSettings.addEventListener("click", openSettingsFromMenu);

/* seek listeners */
if (seek) {
  seek.addEventListener("input", () => {
    if (!audio) return;
    if (isPreviewingDifferentTrack()) return;

    if (!seeking) {
      seekStartPosition = Number(audio.currentTime || 0);
    }

    seeking = true;

    const ratio = Number(seek.value) / 1000;

    if (audio.duration) {
      audio.currentTime = audio.duration * ratio;
    }

    updateWaveProgress();
    updateStageWaveProgress();
    updateSeekProgressFill();
    updateTracklistProgress();
    updateCurrentTimedTrackUI();
    updateStageTimeRow();
  });

  seek.addEventListener("change", () => {
    if (!audio) return;

    const toPosition =
      Number(audio.currentTime || 0);

    const fromPosition =
      Number(seekStartPosition || 0);

    seeking = false;

    if (
      Math.abs(
        toPosition -
        fromPosition
      ) >= 1
    ) {
      queuePlayerEvent(
        "seek",
        currentTrack(),
        {
          position: toPosition,
          value:
            toPosition -
            fromPosition,
          status: "slider",
          fromPosition,
          toPosition,
        }
      );
    }
  });
}

/* audio listeners */
if (audio) {
  audio.addEventListener("loadedmetadata", () => {
    if (isPreviewingDifferentTrack()) return;

    if (timeCur) timeCur.textContent = fmtTime(audio.currentTime || 0);
    if (timeRem) timeRem.textContent = `-${fmtTime(Math.max(0, audio.duration || 0))}`;
    updateWaveProgress();
    updateStageWaveProgress();
    updateSeekProgressFill();
    updateMiniProgressFill();
    updateTracklistProgress();
    updateCurrentTimedTrackUI();
    updateStageTimeRow();

    if (pendingRestoreSeek) {
      applyRestoredPlaybackTime(pendingRestoreSeek);
    }
  });

  audio.addEventListener("timeupdate", () => {
    if (!audio.duration) return;

if (settings.savePos) {
  const now = performance.now();
  if (now - lastPlaybackPersistAt >= 4000) {
    lastPlaybackPersistAt = now;
    persistPlaybackPosition();
  }
}

    if (isPreviewingDifferentTrack()) return;

    if (!seeking && seek) {
      seek.value = String(Math.floor((audio.currentTime / audio.duration) * 1000));
    }

    if (timeCur) timeCur.textContent = fmtTime(audio.currentTime);
    if (timeRem) timeRem.textContent = `-${fmtTime(Math.max(0, audio.duration - audio.currentTime))}`;

    updateWaveProgress();
    updateStageWaveProgress();
    updateSeekProgressFill();
    updateMiniProgressFill();

    const now = performance.now();
if (now - lastHeavyPlayerUiUpdateAt >= 400) {
      lastHeavyPlayerUiUpdateAt = now;
      updateTracklistProgress();
      updateTrackCardProgressBars();
      updateCurrentTimedTrackUI();
      updateStageTimeRow();
    }
  });

audio.addEventListener("ended", () => {
  persistPlaybackPosition();
  queuePlayerEvent("ended", currentTrack(), { position: audio.duration || audio.currentTime || 0, flushNow: true });

  if (sleepMode === "songend") {
      persistPlaybackPosition();
      audio.pause();
      sendPlayerRuntimeStateNow();
      clearSleep();
      updateTracklistProgress();
      updateCurrentTimedTrackUI();
      updateStageTimeRow();
      if (sleepStatus) sleepStatus.textContent = "Complete";
      updatePlayIcons();
      return;
    }

    if (settings.repeatMode === "one") {
      audio.currentTime = 0;
      audio.play().catch(() => {});
      return;
    }

    if (!settings.autoplay) {
      updatePlayIcons();
      return;
    }

    if (queueIndex + 1 < queue.length) {
      queueIndex += 1;
      playCurrent({ saveNow: true });
      return;
    }

    if (settings.repeatMode === "all" && queue.length > 0) {
      queueIndex = 0;
      playCurrent({ saveNow: true });
      return;
    }

    updatePlayIcons();
  });

  audio.addEventListener("play", () => {
    updatePlayIcons();
    queuePlayerEvent("play");
  });

  audio.addEventListener("pause", () => {
    persistPlaybackPosition();
    updatePlayIcons();
    queuePlayerEvent("pause");
  });
}

window.addEventListener("pagehide", () => {
  persistPlaybackPosition();
  if (settings.saveState) persistPlayerState();
  saveSettings();
  sendPlayerRuntimeStateNow();
  flushPlayerEventsNow();
});

window.addEventListener("beforeunload", () => {
  persistPlaybackPosition();
  if (settings.saveState) persistPlayerState();
  saveSettings();
  sendPlayerRuntimeStateNow();
  flushPlayerEventsNow();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    persistPlaybackPosition();
    if (settings.saveState) persistPlayerState();
    saveSettings();
    sendPlayerRuntimeStateNow();
    flushPlayerEventsNow();
    return;
  }

  syncQueuePlaybackState({ saveNow: false });

  if (settingsSubPage === "googleDrive" || settingsSubPage === "dropbox") {
    void refreshCloudAccounts();
    void refreshCloudImportJobs();
  }

  if (settingsSubPage === "import") {
    void refreshLinkImportJobs();
  }
});

window.addEventListener("message", (event) => {
  if (event?.data?.type === "brmedia-cloud-connected") {
    void refreshCloudAccounts();
  }
});

function getInitialSettingsSubPageFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    const queryValue = params.get("settings") || params.get("settingsSubPage") || "";
    const hashValue = String(window.location.hash || "").replace(/^#/, "");

    const requested = queryValue || (hashValue.startsWith("settings") ? hashValue.replace(/^settings[:/-]?/, "") : "");
    const allowed = new Set([
      "general",
      "playback",
      "waveforms",
      "devices",
      "backup",
      "library",
      "googleDrive",
      "dropbox",
      "import",
      "files",
    ]);

    if (requested === "1" || requested === "true" || requested === "open") return "general";
    return allowed.has(requested) ? requested : "";
  } catch {
    return "";
  }
}

function getUniversalSettingsTargetFromLegacySubPage(name = "") {
  const legacyMap = {
    general: ["player", "overview"],
    playback: ["player", "playback"],
    waveforms: ["player", "waveforms"],
    devices: ["player", "devices"],
    backup: ["player", "backup"],
    library: ["cloud", "add-files"],
    googleDrive: ["cloud", "google"],
    dropbox: ["cloud", "dropbox"],
    import: ["cloud", "import"],
    files: ["cloud", "files"],
  };

  return legacyMap[name] || ["player", "overview"];
}

function redirectLegacyPlayerSettingsIfNeeded(name = "") {
  if (!name) return;

  const [moduleKey, tabKey] = getUniversalSettingsTargetFromLegacySubPage(name);
  const params = new URLSearchParams({
    module: moduleKey,
    tab: tabKey,
  });

  window.location.replace(`/settings?${params.toString()}`);
}

function getInitialPlayerTrackRequestFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    const trackId = String(params.get("trackId") || params.get("track") || params.get("id") || "").trim();
    const autoplayValue = String(params.get("autoplay") || params.get("play") || "").toLowerCase();
    const autoplay = ["1", "true", "yes", "play"].includes(autoplayValue);
    const seekRaw = params.get("t") || params.get("time") || params.get("seek") || "";
    const seekToSec = Number(seekRaw);

    if (!trackId) {
      return { trackId: "", autoplay: false, seekToSec: NaN };
    }

    return {
      trackId,
      title: params.get("title") || "",
      finalFormat: params.get("finalFormat") || "",
      autoplay,
      seekToSec: Number.isFinite(seekToSec) && seekToSec >= 0 ? seekToSec : NaN,
    };
  } catch {
    return { trackId: "", autoplay: false, seekToSec: NaN };
  }
}

async function handleInitialPlayerTrackHandoffFromUrl() {
  const request = getInitialPlayerTrackRequestFromUrl();
  if (!request.trackId) return;
  const track = await playIncomingTrackById(request.trackId, {
    autoplay: request.autoplay,
    openPlayer: true,
    seekToSec: request.seekToSec,
  });

  if (track) {
    showBookmarkToast("Player", `Loaded ${track.title || track.id}`);
    return;
  }

  showBookmarkToast("Player", "Could not find that file in the BRMedia library");
}

const initialSettingsSubPage = getInitialSettingsSubPageFromUrl();
redirectLegacyPlayerSettingsIfNeeded(initialSettingsSubPage);

/* init */
startBrIconHydrator();
applySettingsToUI();
renderSendToDeviceUI();
startDeviceRelay();
setTab("Library");
bindWaveformSeeking();
bindStageWaveformSeeking();
bindCastStateListeners();
void loadLibrary()
  .then(() => handleInitialPlayerTrackHandoffFromUrl())
  .catch((err) => console.warn("Initial library load failed", err));
updatePlayIcons();
applyMiniPlayerCollapsedState();
updateSleepStatusLive();
renderBookmarks();
setSleepPopupPage("presets");
syncEqWithPageVisibility();
syncTopMenuDockState();
