const $ = (id) => document.getElementById(id);

const btnTopSearch = $("btnTopSearch");
const btnTopSettings = $("btnTopSettings");
const sidebarBackdrop = $("sidebarBackdrop");
const sidebarMenu = $("sidebarMenu");
const btnSidebarCloseFloating = $("btnSidebarCloseFloating");
const moduleContent = $("moduleContent");

const sidebarNavButtons = Array.from(document.querySelectorAll(".sidebarNavBtn[data-route]"));
const sidebarModuleButtons = Array.from(document.querySelectorAll(".sidebarModuleBtn[data-route]"));
const videoSidebarGenreList = $("videoSidebarGenreList");

const sidebarScrollLock = { y: 0 };

const BR_ICON_BASE_PATHS = ["/shared/icons/fa-duotone/", "/shared/icons/brands/", "/player/branding/icons/"];

const BR_ICON_CLASS_MAP = {
  bars: "list-music",
  "bars-staggered": "list-music",
  "magnifying-glass": "magnifying-glass",
  music: "music",
  film: "film",
  video: "video",
  "arrows-rotate": "arrow-rotate-right",
  tag: "tag",
  tags: "tags",
  sliders: "sliders",
  server: "server",
  gear: "gear-complex",
  xmark: "xmark",
  house: "house",
  home: "house",
  "chart-pie": "chart-column",
  "chart-column": "chart-column",
  "circle-play": "circle-play",
  "folder-open": "folder-open",
  "closed-captioning": "closed-captioning",
  "file-audio": "file-audio",
  "google-drive": "google-drive",
  dropbox: "dropbox",
  soundcloud: "soundcloud",
  mixcloud: "mixcloud",
  whatsapp: "whatsapp",
  imdb: "imdb",
  tmdb: "tmdb",
  rt: "rottentomatoes",
  "rotten-tomatoes": "rottentomatoes",
  rottentomatoes: "rottentomatoes",
  youtube: "youtube",
  facebook: "facebook",
  instagram: "instagram",
  twitter: "x-twitter",
  "x-twitter": "x-twitter",
  tiktok: "tiktok",
  play: "play",
  pause: "pause",
  rotate: "arrow-rotate-right",
  star: "star",
  heart: "heart",
  bookmark: "bookmark",
  "mobile-screen": "mobile-screen",
  tv: "tv",
  clapperboard: "clapperboard-play",
  "arrow-left": "arrow-left",
  "arrow-right": "arrow-right",
  "wand-magic-sparkles": "wand-magic-sparkles",
  "circle-check": "circle-check",
  "closed-captioning": "closed-captioning",
  "triangle-exclamation": "triangle-exclamation",
  image: "image",
  expand: "expand",
  minimize: "minimize",
  "mobile-screen": "mobile-screen",
  clock: "clock",
  clipboard: "clipboard",
  bolt: "bolt",
  user: "user",
  users: "users",
  wrench: "wrench",
  "circle-info": "circle-info",
  "window-restore": "window-restore",
  trash: "trash",
  "folder-minus": "folder-minus",
};

const BR_ICON_BRAND_CLASS_MAP = {
  imdb: "brIconBrandImdb",
  tmdb: "brIconBrandTmdb",
  rottentomatoes: "brIconBrandRottenTomatoes",
  youtube: "brIconBrandYouTube",
  facebook: "brIconBrandFacebook",
  instagram: "brIconBrandInstagram",
  "x-twitter": "brIconBrandXTwitter",
  tiktok: "brIconBrandTiktok",
  dropbox: "brIconBrandDropbox",
  "google-drive": "brIconBrandGoogleDrive",
  mixcloud: "brIconBrandMixcloud",
  soundcloud: "brIconBrandSoundcloud",
  whatsapp: "brIconBrandWhatsapp",
};

const brIconSvgCache = new Map();
const brIconSvgMarkupCache = new Map();
let brIconHydrationQueue = [];
let brIconHydrationTimer = null;

const VIDEO_RESUME_KEY = "brmedia_video_resume_v1";
const VIDEO_FAVOURITES_KEY = "brmedia_video_favourites_v1";
const VIDEO_BOOKMARKS_KEY = "brmedia_video_bookmarks_v1";
const VIDEO_TIMER_KEY =
  "brmedia_video_timer_v1";

const VIDEO_DEVICE_ID_KEY =
  "brmedia_video_device_id_v1";

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

function readVideoSettings() {
  try {
    const saved =
      JSON.parse(
        localStorage.getItem(VIDEO_SETTINGS_KEY) ||
        "{}"
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
  } catch {
    return {
      ...VIDEO_SETTINGS_DEFAULTS,
    };
  }
}

function writeVideoSettings() {
  localStorage.setItem(
    VIDEO_SETTINGS_KEY,
    JSON.stringify(
      videoState.settings ||
      VIDEO_SETTINGS_DEFAULTS
    )
  );
}

function getVideoAspectRatioCss(
  value =
    videoState.settings?.aspectRatio
) {
  return {
    auto: "auto",
    "16:9": "16 / 9",
    "4:3": "4 / 3",
    "21:9": "21 / 9",
    "1:1": "1 / 1",
    "9:16": "9 / 16",
  }[value] || "auto";
}
const videoState = {
  rawItems: [],
  items: [],
  selectedId: "",
  initialVideoId: readVideoQueryParam("videoId"),
  initialVideoApplied: false,
  search: "",
  genre: "all",
  sidebarFilter: "all",
  loading: false,
  status: "Ready.",
  popoutNotice: "",
  metadataEnabled: false,
  settings: readVideoSettings(),
  copyJobs: [],
  resume: readVideoResume(),
  favourites: readVideoSet(VIDEO_FAVOURITES_KEY),
  bookmarks: readVideoBookmarks(),
  sleepTimerEndAt: readVideoTimerEndAt(),
  deviceId: readVideoDeviceId(),
  cinemaMode: false,
  sendSheetOpen: false,
  sendBusy: false,
  sendError: "",
  devices: [],
  metadataQuery: "",
  metadataResults: [],
  metadataBusy: false,
  activeTab: readVideoQueryParam("tab") || "info",
  videoTabsScrollLeft: 0,
  activeVideoPartIndex: 0,
  pendingPartAutoplay: false,
  timerPopupOpen: false,
  videoTabsScrollLeft: 0,
  timerPopupOpen: false,
  timerPopupPage: "presets",
  timerCustomHours: 0,
  timerCustomMinutes: 15,
  timerCustomSeconds: 0,
  bookmarksPopupOpen: false,
  menuPopupOpen: false,
  metadataControlOpen: false,
  metadataControlMessage: "",
  actorPopupKey: "",
  actorPopupTab: "bio",
  actorPopupPerson: null,
  actorTapLockKey: "",
  actorTapLockAt: 0,
  autoMetadataBusy: false,
  autoMetadataDone: false,
  autoMetadataLastRunAt: 0,
  sleepTimerTotalMs: 0,
};

let videoCopyPollTimer = 0;
let videoEventQueue = [];
const reportedVideoCopyTerminalJobs = new Set();
let videoEventFlushTimer = 0;
let videoTimerInterval = 0;

function escapeHtml(value = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getCachedBrIconHtml(name = "", brand = false) {
  const iconName = String(name || "");
  const svgName = getBrIconSvgName(iconName);
  const svg = brIconSvgMarkupCache.get(svgName);
  if (!svg) return "";

  const brandClass = BR_ICON_BRAND_CLASS_MAP[iconName] || BR_ICON_BRAND_CLASS_MAP[svgName] || "";
  const classes = ["brSvgIconHost", "brVideoIconStable", brand ? "brVideoBrandIcon" : "", brandClass].filter(Boolean).join(" ");
  return `<span class="${escapeHtml(classes)}" data-br-icon-key="${escapeHtml(iconName)}" data-br-icon-name="${escapeHtml(iconName)}" data-br-icon-svg="${escapeHtml(svgName)}" data-br-icon-hydrated="1" aria-hidden="true">${svg}</span>`;
}

function iconHtml(name) {
  const safeName = escapeHtml(name);
  return getCachedBrIconHtml(name, false) || `<i class="fa-solid fa-${safeName} brVideoIconStable" data-br-icon-key="${safeName}" aria-hidden="true"></i>`;
}

function videoBrandIconHtml(name = "") {
  const safeName = escapeHtml(name);
  return getCachedBrIconHtml(name, true) || `<i class="fa-brands fa-${safeName} brVideoIconStable brVideoBrandIcon" data-br-icon-key="${safeName}" aria-hidden="true"></i>`;
}

function getVideoMetadataSourceIcon(value = "") {
  const text = String(value || "").toLowerCase();
  if (text.includes("imdb")) return "imdb";
  if (text.includes("tmdb")) return "tmdb";
  if (text.includes("rotten")) return "rottentomatoes";
  return "circle-info";
}

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
  return BR_ICON_CLASS_MAP[iconName] || iconName || "";
}

function applyBrIconStateClasses(el, iconName = "", svgName = "") {
  el.classList.add("brSvgIconHost");

  Object.values(BR_ICON_BRAND_CLASS_MAP).forEach((className) => el.classList.remove(className));

  const brandClass = BR_ICON_BRAND_CLASS_MAP[iconName] || BR_ICON_BRAND_CLASS_MAP[svgName];
  if (brandClass) el.classList.add(brandClass);
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

        const markup = svg.outerHTML;
        brIconSvgMarkupCache.set(svgName, markup);
        return markup;
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
  const nodes = root?.matches?.("i[class*='fa-']")
    ? [root]
    : Array.from(root?.querySelectorAll?.("i[class*='fa-']") || []);

  if (!nodes.length) return;

  nodes.forEach((node) => {
    if (!node || node.dataset.brIconQueued === "1") return;
    node.dataset.brIconQueued = "1";
    brIconHydrationQueue.push(node);
  });

  if (brIconHydrationTimer) return;

  const runBatch = () => {
    const fastVideoMode = document.body.classList.contains("videoWatchMode");
    const batch = brIconHydrationQueue.splice(0, fastVideoMode ? 96 : 12);
    batch.forEach((node) => {
      if (node?.dataset) delete node.dataset.brIconQueued;
      void hydrateBrIcon(node);
    });

    if (brIconHydrationQueue.length) {
      brIconHydrationTimer = window.setTimeout(runBatch, fastVideoMode ? 0 : 30);
      return;
    }

    brIconHydrationTimer = null;
  };

  brIconHydrationTimer = window.setTimeout(runBatch, document.body.classList.contains("videoWatchMode") ? 0 : 60);
}

function startBrIconHydrator() {
  const run = () => hydrateBrIcons(document);
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 1600 });
    return;
  }
  window.setTimeout(run, 900);
}

function readVideoQueryParam(name) {
  try {
    return new URLSearchParams(window.location.search).get(name) || "";
  } catch {
    return "";
  }
}

function readVideoResume() {
  try {
    const parsed = JSON.parse(localStorage.getItem(VIDEO_RESUME_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeVideoResume() {
  localStorage.setItem(VIDEO_RESUME_KEY, JSON.stringify(videoState.resume || {}));
}

function readVideoSet(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeVideoSet(key, values = []) {
  localStorage.setItem(key, JSON.stringify(Array.from(new Set(values.filter(Boolean)))));
}

function readVideoBookmarks() {
  try {
    const parsed = JSON.parse(localStorage.getItem(VIDEO_BOOKMARKS_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeVideoBookmarks() {
  localStorage.setItem(VIDEO_BOOKMARKS_KEY, JSON.stringify(videoState.bookmarks || {}));
}

function readVideoTimerEndAt() {
  const value = Number(localStorage.getItem(VIDEO_TIMER_KEY) || 0);
  return Number.isFinite(value) ? value : 0;
}

function writeVideoTimerEndAt(value = 0) {
  videoState.sleepTimerEndAt = Number(value || 0);
  if (videoState.sleepTimerEndAt) localStorage.setItem(VIDEO_TIMER_KEY, String(videoState.sleepTimerEndAt));
  else localStorage.removeItem(VIDEO_TIMER_KEY);
}

function readVideoDeviceId() {
  let id = localStorage.getItem(VIDEO_DEVICE_ID_KEY) || "";
  if (!id) {
    id = `video_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(VIDEO_DEVICE_ID_KEY, id);
  }
  return id;
}

function getVideoTitle(item = {}) {
  return item.title || item.fileName || "Untitled video";
}

function normaliseVideoGroupText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\b(19\d{2}|20\d{2})\b/g, " ")
    .replace(/\b(part|pt|cd|disc|disk)\s*(one|two|three|four|five|six|seven|eight|nine|ten|\d{1,2})\b/gi, " ")
    .replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|\d{1,2})\s*(?:of|\/)\s*\d{1,2}\b/gi, " ")
    .replace(/\b(2160p|1080p|720p|480p|4k|uhd|hdr|bluray|blu ray|brrip|dvdrip|web[- ]?dl|webrip|x264|x265|h264|h265|hevc|aac|dts|ac3|multi|eng|rus|subs?)\b/gi, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function simpleVideoHash(value = "") {
  let hash = 0;
  const text = String(value || "");
  for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  return Math.abs(hash).toString(36);
}

function getVideoPartNumberText(value = "") {
  const text = String(value || "").toLowerCase();
  const wordMap = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  const match = text.match(/\b(?:part|pt|cd|disc|disk)\s*(one|two|three|four|five|six|seven|eight|nine|ten|\d{1,2})\b/i)
    || text.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|\d{1,2})\s*(?:of|\/)\s*\d{1,2}\b/i);
  if (!match) return 0;
  const valueText = String(match[1] || "").toLowerCase();
  return Number(wordMap[valueText] || valueText || 0) || 0;
}

function getVideoPartNumber(item = {}) {
  return getVideoPartNumberText(`${item.title || ""} ${item.fileName || ""} ${item.locator || ""}`);
}

function getVideoGroupKey(item = {}) {
  if (item.tmdbId) return `tmdb:${item.tmdbId}`;
  if (item.imdbId) return `imdb:${item.imdbId}`;

  const base = normaliseVideoGroupText(item.title || item.fileName || item.locator || "");
  const year = String(item.year || "").trim();
  return base ? `title:${base}:${year}` : "";
}

function getVideoGroupTitle(item = {}) {
  const title = String(item.title || item.fileName || "")
    .replace(/\b(part|pt|cd|disc|disk)\s*(one|two|three|four|five|six|seven|eight|nine|ten|\d{1,2})\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return title || getVideoTitle(item);
}

function getVideoCustomLinkPartNumber(item = {}) {
  if (!item.linkupEnabled) return 0;
  if (item.linkupMode === "series") return Number(item.linkupEpisode || 0) || 0;
  if (item.linkupMode === "parts") return Number(item.linkupPartNumber || 0) || 0;
  return 0;
}

function getVideoCustomLinkKey(item = {}) {
  if (!item.linkupEnabled) return "";
  const title = normaliseVideoGroupText(item.linkupTitle || item.title || item.fileName || "");
  if (!title) return "";
  if (item.linkupMode === "series") return `series:${title}:s${Number(item.linkupSeason || 1) || 1}`;
  if (item.linkupMode === "parts") return `parts:${title}`;
  return "";
}

function buildVideoDisplayItems(rawItems = []) {
  const preferBrowserCopy =
    videoState.settings?.preferBrowserCopy !== false;

  const sourceIdsWithBrowserCopies =
    new Set(
      preferBrowserCopy
        ? rawItems
            .filter(
              (item) =>
                item.browserCopyOf &&
                isBrowserFriendlyVideo(item)
            )
            .map(
              (item) =>
                String(item.browserCopyOf)
            )
        : []
    );

  const preferredItems =
    rawItems
      .filter(
        (item) =>
          !sourceIdsWithBrowserCopies.has(
            String(item.id)
          )
      )
      .map((item) => {
        if (
          !preferBrowserCopy ||
          !item.browserCopyOf
        ) {
          return item;
        }
      const source = rawItems.find((entry) => String(entry.id) === String(item.browserCopyOf));
      if (!source) return item;
      return {
        ...source,
        ...item,
        title: source.title || item.title,
        year: source.year || item.year,
        genre: source.genre || item.genre,
        overview: source.overview || item.overview,
        posterUrl: source.posterUrl || item.posterUrl,
        posterPath: source.posterPath || item.posterPath,
        customPosterUrl: source.customPosterUrl || item.customPosterUrl,
        metadataSource: source.metadataSource || item.metadataSource,
        originalVideoId: source.id,
        originalLocator: source.locator,
        originalMimeType: source.mimeType,
        isBrowserCopyPreferred: true,
      };
    });

  const buckets = new Map();
  const singles = [];

  preferredItems.forEach((item) => {
    const customPartNumber = getVideoCustomLinkPartNumber(item);
    const customKey = getVideoCustomLinkKey(item);
    const partNumber = customPartNumber || getVideoPartNumber(item);
    const key = customKey || getVideoGroupKey(item);

    if (!partNumber || !key) {
      singles.push(item);
      return;
    }

    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push({ ...item, partNumber });
  });

  const grouped = [];

  buckets.forEach((parts, key) => {
    if (parts.length < 2) {
      singles.push(parts[0]);
      return;
    }

    const sorted = parts.slice().sort((a, b) =>
      (Number(a.partNumber || 999) - Number(b.partNumber || 999)) ||
      String(a.fileName || "").localeCompare(String(b.fileName || ""))
    );

    const lead = sorted.find((item) => item.posterUrl || item.posterPath || item.customPosterUrl || item.backdropUrl) || sorted[0];
    const groupTitle = getVideoGroupTitle(lead);
    const groupId = `vgrp_${simpleVideoHash(key)}`;

    grouped.push({
      ...lead,
      id: groupId,
      title: groupTitle,
      fileName: groupTitle,
      isVideoGroup: true,
      groupKey: key,
      partCount: sorted.length,
      sizeBytes: sorted.reduce((sum, item) => sum + Number(item.sizeBytes || 0), 0),
      parts: sorted.map((item, index) => ({ ...item, groupIndex: index, groupId })),
    });
  });

  return [...singles, ...grouped].sort((a, b) => String(getVideoTitle(a)).localeCompare(String(getVideoTitle(b))));
}

function isVideoGroup(item = {}) {
  return !!item?.isVideoGroup && Array.isArray(item.parts) && item.parts.length > 1;
}

function getVideoParts(item = {}) {
  return isVideoGroup(item) ? item.parts : [item];
}

function getActiveVideoPlaybackItem(item = getSelectedVideo()) {
  const parts = getVideoParts(item || {});
  const index = Math.max(0, Math.min(parts.length - 1, Number(videoState.activeVideoPartIndex || 0)));
  return parts[index] || item || {};
}

function getVideoMetadataActionItem(item = getSelectedVideo()) {
  const parts = getVideoParts(item || {});
  return parts[0] || item || {};
}

function getVideoMetadataActionId(item = getSelectedVideo()) {
  return getVideoMetadataActionItem(item)?.id || item?.id || "";
}

function findVideoDisplayItemByAnyId(id = "") {
  const key = String(id || "");
  if (!key) return null;
  return videoState.items.find((item) =>
    String(item.id) === key ||
    getVideoParts(item).some((part) => String(part.id) === key)
  ) || null;
}

function getVideoPartIndexByAnyId(item = {}, id = "") {
  const key = String(id || "");
  const index = getVideoParts(item).findIndex((part) => String(part.id) === key);
  return index >= 0 ? index : 0;
}

function getPosterUrl(item = {}) {
  if (item.customPosterUrl) return item.customPosterUrl;
  if (item.posterPath) return `/video-poster/${encodeURIComponent(item.id)}`;
  if (item.posterUrl) return `/video-online-image?url=${encodeURIComponent(item.posterUrl)}`;
  return "";
}

function getBackdropUrl(item = {}) {
  if (item.backdropUrl) return `/video-online-image?url=${encodeURIComponent(item.backdropUrl)}`;
  return getPosterUrl(item);
}

function getSelectedVideo() {
  if (!videoState.selectedId) return null;
  return findVideoDisplayItemByAnyId(videoState.selectedId);
}

function getFirstVideoFallback() {
  return videoState.items[0] || null;
}

function getVideoDetailTabs() {
  return [
    { key: "poster", title: "Poster", icon: "image", desc: "Artwork" },
    { key: "cast", title: "Cast", icon: "users", desc: "Actors" },
    { key: "info", title: "Film info", icon: "circle-info", desc: "Story" },
    { key: "related", title: "Related", icon: "film", desc: "More" },
    { key: "parts", title: "Parts / Episodes", icon: "list", desc: "Linked" },
    { key: "edit", title: "Edit", icon: "tag", desc: "Metadata", menuOnly: true },
    { key: "tools", title: "Tools", icon: "wrench", desc: "Convert", menuOnly: true },
  ];
}

function getVisibleVideoDetailTabs(item = getSelectedVideo()) {
  return getVideoDetailTabs()
    .filter((entry) => !entry.menuOnly)
    .filter(
      (entry) =>
        entry.key !== "parts" ||
        isVideoGroup(item)
    );
}

function normaliseVideoTab(tab = "info") {
  const key = String(tab || "info");
  if (key === "overview" || key === "watch") return "info";
  return getVideoDetailTabs().some((entry) => entry.key === key) ? key : "info";
}

function setVideoUrlState(videoId = "", tab = videoState.activeTab || "info", replace = false) {
  try {
    const url = new URL(window.location.href);
    if (videoId) {
      url.searchParams.set("videoId", videoId);
      url.searchParams.set("tab", normaliseVideoTab(tab));
    } else {
      url.searchParams.delete("videoId");
      url.searchParams.delete("tab");
    }

    const method = replace ? "replaceState" : "pushState";
    window.history[method]({}, "", url.toString());
  } catch {}
}

function scrollVideoWatchToTop() {
  try {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    document.querySelector(".moduleTemplateMain")?.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
  } catch {}
}

function openVideoDetail(id = "", tab = "info", replace = false) {
  const key = String(id || "");
  if (!key) return;

  const displayItem = findVideoDisplayItemByAnyId(key);
  if (!displayItem) return;

  videoState.selectedId = displayItem.id;
  videoState.activeVideoPartIndex = getVideoPartIndexByAnyId(displayItem, key);
  videoState.activeTab = normaliseVideoTab(tab);
  videoState.videoTabsScrollLeft = 0;
  videoState.timerPopupOpen = false;
  videoState.bookmarksPopupOpen = false;
  videoState.menuPopupOpen = false;
  videoState.metadataResults = [];
  videoState.metadataQuery = getVideoTitle(getSelectedVideo() || {});
  setVideoUrlState(displayItem.id, videoState.activeTab, replace);
  queueVideoEvent("open_detail", getSelectedVideo(), { route: videoState.activeTab });
  renderVideoApp();

  scrollVideoWatchToTop();
  window.requestAnimationFrame(scrollVideoWatchToTop);
  window.setTimeout(scrollVideoWatchToTop, 80);
}

function closeVideoDetail(replace = false) {
  videoState.selectedId = "";
  videoState.activeTab = "info";
  videoState.videoTabsScrollLeft = 0;
  videoState.timerPopupOpen = false;
  videoState.bookmarksPopupOpen = false;
  videoState.menuPopupOpen = false;
  videoState.metadataControlOpen = false;
  videoState.actorPopupKey = "";
  videoState.actorPopupPerson = null;
  closeVideoActorPortal(false);
  videoState.metadataResults = [];
  videoState.sendSheetOpen = false;
  videoState.cinemaMode = false;
  setVideoUrlState("", "info", replace);
  renderVideoApp();
}

function setVideoDetailTab(tab = "info", replace = false) {
  if (!videoState.selectedId) return;
  const scroller = moduleContent?.querySelector?.(".brVideoTabsScroller");
  videoState.videoTabsScrollLeft = Number(scroller?.scrollLeft || videoState.videoTabsScrollLeft || 0);
  videoState.activeTab = normaliseVideoTab(tab);
  videoState.menuPopupOpen = false;
  setVideoUrlState(videoState.selectedId, videoState.activeTab, replace);
  renderVideoApp();
}

function getVideoExtension(item = {}) {
  return String(item.ext || item.fileName || item.locator || "").split(".").pop()?.toLowerCase() || "";
}

function isBrowserFriendlyVideo(item = {}) {
  if (isVideoGroup(item)) return getVideoParts(item).every((part) => isBrowserFriendlyVideo(part));

  const mime = String(item.mimeType || "").toLowerCase();
  const ext = getVideoExtension(item);
  return mime.includes("video/mp4") || mime.includes("video/webm") || ext === "mp4" || ext === "m4v" || ext === "webm";
}

function getVideoSidebarCategories() {
  const items = videoState.items || [];
  const genres = getVideoGenres().filter((genre) => genre !== "all").slice(0, 12);
  const categoryItems = [
    { kind: "filter", value: "all", title: "All Videos", desc: `${items.length} in library`, icon: "film" },
    { kind: "filter", value: "continue", title: "Continue Watching", desc: `${items.filter((item) => getResumePercent(item) > 1).length} with progress`, icon: "circle-play" },
    { kind: "filter", value: "favourites", title: "Favourites", desc: `${videoState.favourites.length} saved`, icon: "heart" },
    { kind: "filter", value: "bookmarks", title: "Bookmarks", desc: `${Object.values(videoState.bookmarks || {}).reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0)} saved points`, icon: "bookmark" },
    { kind: "filter", value: "subtitles", title: "With Subtitles", desc: `${items.filter((item) => Array.isArray(item.subtitles) && item.subtitles.length).length} videos`, icon: "closed-captioning" },
    { kind: "filter", value: "unsupported", title: "Needs Convert", desc: `${items.filter((item) => !isBrowserFriendlyVideo(item)).length} videos`, icon: "triangle-exclamation" },
    { kind: "filter", value: "linked", title: "Series / Linked Parts", desc: `${items.filter((item) => isVideoGroup(item)).length} grouped`, icon: "link" },
    { kind: "filter", value: "metadata-missing", title: "Missing Metadata", desc: `${items.filter((item) => !item.metadataSource).length} videos`, icon: "wand-magic-sparkles" },
  ];

  genres.forEach((genre) => {
    const count = items.filter((item) => String(item.genre || "").toLowerCase().includes(genre.toLowerCase())).length;
    categoryItems.push({ kind: "genre", value: genre, title: genre, desc: `${count} video${count === 1 ? "" : "s"}`, icon: "folder-open" });
  });

  return categoryItems;
}

function renderVideoSidebarFilters() {
  if (!videoSidebarGenreList) return;

  const rows = getVideoSidebarCategories();
  videoSidebarGenreList.innerHTML = rows.map((row) => {
    const active = row.kind === "genre"
      ? videoState.genre === row.value && videoState.sidebarFilter === "all"
      : videoState.sidebarFilter === row.value && (row.value !== "all" || videoState.genre === "all");

    return `
      <button class="sidebarModuleBtn videoSidebarCategory ${active ? "is-active" : ""}" data-video-sidebar-${row.kind}="${escapeHtml(row.value)}" type="button">
        ${iconHtml(row.icon)}
        <span class="sidebarModuleText">
          <span class="sidebarModuleTitle">${escapeHtml(row.title)}</span>
          <span class="sidebarModuleSub">${escapeHtml(row.desc)}</span>
        </span>
      </button>
    `;
  }).join("");

  videoSidebarGenreList.querySelectorAll("[data-video-sidebar-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      videoState.sidebarFilter = button.dataset.videoSidebarFilter || "all";
      if (videoState.sidebarFilter === "all") videoState.genre = "all";
      closeSidebarMenu();
      renderVideoApp();
    });
  });

  videoSidebarGenreList.querySelectorAll("[data-video-sidebar-genre]").forEach((button) => {
    button.addEventListener("click", () => {
      videoState.sidebarFilter = "all";
      videoState.genre = button.dataset.videoSidebarGenre || "all";
      closeSidebarMenu();
      renderVideoApp();
    });
  });

  hydrateBrIcons(videoSidebarGenreList);
}

function getVideoGenres() {
  const genres = new Set();
  videoState.items.forEach((item) => {
    String(item.genre || "Unsorted")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .forEach((entry) => genres.add(entry));
  });
  return ["all", ...Array.from(genres).sort((a, b) => a.localeCompare(b))];
}

function getFilteredVideos() {
  const query = videoState.search.toLowerCase().trim();
  return videoState.items.filter((item) => {
    const genreOk = videoState.genre === "all" || String(item.genre || "").toLowerCase().includes(videoState.genre.toLowerCase());
    if (!genreOk) return false;

    if (videoState.sidebarFilter === "continue" && getResumePercent(item) <= 1) return false;
    if (videoState.sidebarFilter === "favourites" && !isVideoFavourite(item.id)) return false;
    if (videoState.sidebarFilter === "bookmarks" && !getVideoBookmarks(item.id).length) return false;
    if (videoState.sidebarFilter === "subtitles" && !(Array.isArray(item.subtitles) && item.subtitles.length)) return false;
    if (videoState.sidebarFilter === "unsupported" && isBrowserFriendlyVideo(item)) return false;
    if (videoState.sidebarFilter === "linked" && !isVideoGroup(item)) return false;
    if (videoState.sidebarFilter === "metadata-missing" && item.metadataSource) return false;

    if (!query) return true;
    return [item.title, item.fileName, item.genre, item.year, item.folder, item.cast?.join(" ")]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
}

function formatBytes(bytes = 0) {
  const size = Number(bytes || 0);
  if (!size) return "Unknown size";
  if (size > 1024 ** 3) return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function formatVideoTime(seconds = 0) {
  const total = Math.max(0, Math.floor(Number(seconds || 0)));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function getResumePercent(item = {}) {
  const saved = videoState.resume[item.id] || {};
  const duration = Number(saved.duration || item.duration || 0);
  const time = Number(saved.time || 0);

  if (isVideoGroup(item)) {
    const parts = getVideoParts(item);
    const partIndex = Number(saved.partIndex || 0);
    const withinPart = duration && time ? Math.max(0, Math.min(1, time / duration)) : 0;
    return Math.max(0, Math.min(100, ((partIndex + withinPart) / Math.max(1, parts.length)) * 100));
  }

  if (!duration || !time) return 0;
  return Math.max(0, Math.min(100, (time / duration) * 100));
}

function isVideoFavourite(id = "") {
  return videoState.favourites.includes(String(id || ""));
}

function buildVideoEventExtra(
  extra = {}
) {
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
    Object.entries(
      extra
    )
      .filter(
        ([key, value]) =>
          !reserved.has(
            key
          ) &&
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

function buildVideoEvent(type, item = getSelectedVideo(), extra = {}) {
  const video = $("brVideoElement");
  const position = Number(extra.position ?? video?.currentTime ?? videoState.resume?.[item?.id]?.time ?? 0);
  const duration = Number(extra.duration ?? video?.duration ?? item?.duration ?? videoState.resume?.[item?.id]?.duration ?? 0);

  return {
    type: String(type || "event").slice(0, 48),
    videoId: item?.id || "",
    title: getVideoTitle(item || {}),
    genre: item?.genre || "",
    year: item?.year || "",
    source: item?.source || item?.sourceType || "local",
    position: Number.isFinite(position) ? Math.max(0, position) : 0,
    duration: Number.isFinite(duration) ? Math.max(0, duration) : 0,
    route: extra.route || "video-player",
    status: extra.status || "",
    value: Number.isFinite(Number(extra.value)) ? Number(extra.value) : 0,
    count: Math.max(1, Number(extra.count || 1)),
    extra: buildVideoEventExtra(extra),
    at: Date.now(),
  };
}

function queueVideoEvent(type, item = getSelectedVideo(), extra = {}) {
  if (!type) return;

  videoEventQueue.push(buildVideoEvent(type, item, extra));
  videoEventQueue = videoEventQueue.slice(-40);

  if (extra.flushNow) {
    flushVideoEventsNow();
    return;
  }

  if (videoEventFlushTimer) clearTimeout(videoEventFlushTimer);
  videoEventFlushTimer = window.setTimeout(flushVideoEventsNow, 1800);
}

function flushVideoEventsNow() {
  if (videoEventFlushTimer) {
    clearTimeout(videoEventFlushTimer);
    videoEventFlushTimer = 0;
  }

  if (!videoEventQueue.length) return;

  const events = videoEventQueue.splice(0, videoEventQueue.length);
  const body = JSON.stringify({ events });

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/video/events", new Blob([body], { type: "application/json" }));
      return;
    }
  } catch {}

  fetch("/video/events", {
    method: "POST",
    cache: "no-store",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body,
  }).catch(() => {
    videoEventQueue = [...events, ...videoEventQueue].slice(-40);
  });
}

function setVideoCinemaMode(enabled = false) {
  videoState.cinemaMode = !!enabled;
  document.body.classList.toggle("videoCinemaMode", videoState.cinemaMode);
  renderVideoApp();

  if (enabled) {
    setTimeout(() => {
      const video = $("brVideoElement");
      if (video) void video.play().catch(() => {});
    }, 120);
  }
}

function renderVideoCinemaOverlay(item) {
  if (!videoState.cinemaMode || !item) return "";

  return `
    <div class="brVideoCinemaOverlay">
      <div class="brVideoCinemaTop">
        <button class="brVideoCinemaClose" data-video-cinema-close type="button">${iconHtml("xmark")}<span>Exit cinema</span></button>
        <strong>${escapeHtml(getVideoTitle(item))}</strong>
      </div>
      <div class="brVideoCinemaStage">
        ${renderPlayer(item)}
      </div>
    </div>
  `;
}

function openVideoSendSheet(id = videoState.selectedId) {
  videoState.selectedId = id || videoState.selectedId;
  videoState.sendSheetOpen = true;
  videoState.sendError = "";
  renderVideoApp();
  void refreshVideoDevices(false);
}

function closeVideoSendSheet() {
  videoState.sendSheetOpen = false;
  videoState.sendBusy = false;
  videoState.sendError = "";
  renderVideoApp();
}

async function refreshVideoDevices(reRender = true) {
  try {
    const devicesRes = await fetch(`/devices?deviceId=${encodeURIComponent(videoState.deviceId)}`, { cache: "no-store" });
    const devicesData = await devicesRes.json();
    videoState.devices = Array.isArray(devicesData.devices) ? devicesData.devices.filter((device) => device.online) : [];
  } catch (err) {
    videoState.devices = [];
    videoState.sendError = err?.message || "Could not read devices.";
  }

  if (reRender || videoState.sendSheetOpen) renderVideoApp();
}

function renderVideoSendSheet(item) {
  if (!videoState.sendSheetOpen || !item) return "";
  const devices = videoState.devices || [];

  return `
    <div class="brVideoSheetBackdrop" data-video-send-close></div>
    <section class="brVideoSendSheet" role="dialog" aria-modal="true" aria-label="Send video to device">
      <div class="brVideoSheetHead">
        <span>${iconHtml("mobile-screen")}</span>
        <div><strong>Send to device</strong><em>${escapeHtml(getVideoTitle(item))}</em></div>
        <button data-video-send-close type="button">${iconHtml("xmark")}</button>
      </div>

      ${videoState.sendError ? `<div class="brVideoSendError">${escapeHtml(videoState.sendError)}</div>` : ""}

      <div class="brVideoDeviceList">
        ${devices.length ? devices.map((device) => `
          <button class="brVideoDeviceCard" data-video-send-target="${escapeHtml(device.deviceId)}" type="button" ${videoState.sendBusy ? "disabled" : ""}>
            <span>${iconHtml("mobile-screen")}</span>
            <div>
              <strong>${escapeHtml(device.deviceName || device.name || "BRMedia device")}</strong>
              <em>${escapeHtml(device.statusText || "Online now")}</em>
            </div>
          </button>
        `).join("") : `<div class="brVideoNoDevices">No online devices found. Open BRMedia Player on another phone/tablet first, then press refresh.</div>`}
      </div>

      <div class="brVideoSheetActions">
        <button class="brVideoBtn" data-video-send-refresh type="button">${iconHtml("arrows-rotate")}<span>Refresh devices</span></button>
        <button class="brVideoBtn" data-video-send-close type="button">${iconHtml("xmark")}<span>Close</span></button>
      </div>
    </section>
  `;
}

function toggleVideoFavourite(id = "") {
  const key = String(id || "");
  if (!key) return;

  const wasFavourite = isVideoFavourite(key);

  videoState.favourites = wasFavourite
    ? videoState.favourites.filter((item) => item !== key)
    : [key, ...videoState.favourites];

  writeVideoSet(
    VIDEO_FAVOURITES_KEY,
    videoState.favourites
  );

  queueVideoEvent(
    wasFavourite
      ? "favourite_remove"
      : "favourite_add",
    videoState.items.find(
      (item) => String(item.id) === key
    ) || getSelectedVideo(),
    {
      flushNow: true,
    }
  );

  videoState.status = isVideoFavourite(key)
    ? "Added to Video favourites."
    : "Removed from Video favourites.";
}

function getVideoBookmarks(id = "") {
  const list = videoState.bookmarks[String(id || "")] || [];
  return Array.isArray(list) ? list : [];
}

function addVideoBookmark(id = "") {
  const key = String(id || videoState.selectedId || "");
  const video = $("brVideoElement");
  const selected = getSelectedVideo();
  if (!key || !selected) return;

  const time = Number(video?.currentTime || videoState.resume[key]?.time || 0);
  const bookmark = {
    id: `bm_${Date.now()}`,
    time,
    label: `${getVideoTitle(selected)} · ${formatVideoTime(time)}`,
    createdAt: Date.now(),
  };

  videoState.bookmarks[key] = [
    bookmark,
    ...getVideoBookmarks(
      key
    ),
  ]
    .slice(
      0,
      30
    );

  writeVideoBookmarks();

  queueVideoEvent(
    "bookmark_add",
    selected,
    {
      position:
        time,
      status:
        "added",
      bookmarkId:
        bookmark.id,
    }
  );

  videoState.status =
    `Bookmark saved at ${formatVideoTime(time)}.`;
}

function removeVideoBookmark(
  videoId = "",
  bookmarkId = ""
) {
  const key =
    String(
      videoId ||
      ""
    );

  const removed =
    getVideoBookmarks(
      key
    )
      .find(
        (bookmark) =>
          bookmark.id ===
          bookmarkId
      ) ||
    null;

  videoState
    .bookmarks[key] =
      getVideoBookmarks(
        key
      )
        .filter(
          (bookmark) =>
            bookmark.id !==
            bookmarkId
        );

  writeVideoBookmarks();

  if (
    removed
  ) {
    queueVideoEvent(
      "bookmark_remove",
      videoState.items
        .find(
          (item) =>
            String(
              item.id
            ) ===
            key
        ),
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

  videoState.status =
    "Bookmark removed.";
}

function jumpToVideoBookmark(videoId = "", bookmarkId = "") {
  const bookmark = getVideoBookmarks(videoId).find((item) => item.id === bookmarkId);
  if (!bookmark) return;

  videoState.selectedId = videoId;
  renderVideoApp();

  setTimeout(() => {
    const video = $("brVideoElement");
    if (!video) return;
    video.currentTime = Math.max(0, Number(bookmark.time || 0));
    void video.play().catch(() => {});
  }, 160);
}

function getVideoMediaSessionArtwork(item = {}) {
  const poster = getPosterUrl(item);
  const fallback = "/shared/branding/global/br-logo-trans.png";
  const src = poster || fallback;
  const type = src.includes(".webp") ? "image/webp" : src.includes(".png") ? "image/png" : "image/jpeg";

  return [
    { src, sizes: "512x512", type },
    { src, sizes: "256x256", type },
    { src, sizes: "96x96", type },
  ];
}

function recordVideoSeek(
  video,
  fromPosition,
  status = "seek"
) {
  if (!video) return;

  const toPosition =
    Number(
      video.currentTime ||
      0
    );

  const from =
    Number(
      fromPosition ||
      0
    );

  if (
    Math.abs(
      toPosition -
      from
    ) <
    1
  ) {
    return;
  }

  queueVideoEvent(
    "seek",
    getSelectedVideo(),
    {
      position:
        toPosition,
      value:
        toPosition -
        from,
      status,
      fromPosition:
        from,
      toPosition,
    }
  );
}

function updateVideoMediaSession(item = getSelectedVideo(), video = $("brVideoElement")) {
  if (!item || !("mediaSession" in navigator)) return;

  try {
    const parts = getVideoParts(item || {});
    const activePart = getActiveVideoPlaybackItem(item);
    const partSuffix = parts.length > 1 ? ` · Part ${Number(videoState.activeVideoPartIndex || 0) + 1}/${parts.length}` : "";
    const title = `${getVideoTitle(item)}${partSuffix}`;
    const album = [item.year, item.genre, activePart?.fileName || item.runtime].filter(Boolean).join(" • ") || "BRMedia Video Player";

    if ("MediaMetadata" in window) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist: "Blackburn Ravers Videos",
        album,
        artwork: getVideoMediaSessionArtwork(item),
      });
    }

    navigator.mediaSession.playbackState = video && !video.paused ? "playing" : "paused";

    const getVideo = () => $("brVideoElement");
    const seekBy =
      (
        seconds
      ) => {
        const activeVideo =
          getVideo();

        if (
          !activeVideo
        ) {
          return;
        }

        const fromPosition =
          Number(
            activeVideo
              .currentTime ||
            0
          );

        activeVideo
          .currentTime =
            Math.max(
              0,
              Math.min(
                Number(
                  activeVideo
                    .duration ||
                  Infinity
                ),
                fromPosition +
                seconds
              )
            );

        recordVideoSeek(
          activeVideo,
          fromPosition,
          "media_session_step"
        );

        saveVideoPosition(
          activeVideo
        );

        updateVideoPlayerUi(
          activeVideo
        );

        updateVideoMediaSessionPosition(
          activeVideo
        );
      };

    try { navigator.mediaSession.setActionHandler("play", () => { const activeVideo = getVideo(); if (activeVideo) void activeVideo.play().catch(() => {}); }); } catch {}
    try { navigator.mediaSession.setActionHandler("pause", () => { const activeVideo = getVideo(); if (activeVideo) activeVideo.pause(); }); } catch {}
    try { navigator.mediaSession.setActionHandler("seekbackward", (details) => seekBy(-Number(details?.seekOffset || 10))); } catch {}
    try { navigator.mediaSession.setActionHandler("seekforward", (details) => seekBy(Number(details?.seekOffset || 10))); } catch {}
    try {
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        const activeVideo = getVideo();
        if (!activeVideo || typeof details?.seekTime !== "number") return;
        activeVideo.currentTime = Math.max(0, Math.min(Number(activeVideo.duration || Infinity), details.seekTime));
        saveVideoPosition(activeVideo);
        updateVideoPlayerUi(activeVideo);
        updateVideoMediaSessionPosition(activeVideo);
      });
    } catch {}
    try {
      navigator.mediaSession.setActionHandler("stop", () => {
        const activeVideo = getVideo();
        if (!activeVideo) return;
        activeVideo.pause();
        activeVideo.currentTime = 0;
        saveVideoPosition(activeVideo);
        updateVideoPlayerUi(activeVideo);
        updateVideoMediaSessionPosition(activeVideo);
      });
    } catch {}

    updateVideoMediaSessionPosition(video);
  } catch (err) {
    console.warn("Video Media Session update failed", err);
  }
}

function updateVideoMediaSessionPosition(video = $("brVideoElement")) {
  if (!video || !("mediaSession" in navigator) || typeof navigator.mediaSession.setPositionState !== "function") return;

  const duration = Number(video.duration || 0);
  if (!duration || !Number.isFinite(duration)) return;

  try {
    navigator.mediaSession.setPositionState({
      duration,
      playbackRate: Number(video.playbackRate || 1),
      position: Math.max(0, Math.min(duration, Number(video.currentTime || 0))),
    });
  } catch {}
}

function clearVideoMediaSession() {
  if (!("mediaSession" in navigator)) return;

  try {
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = "none";
    ["play", "pause", "seekbackward", "seekforward", "seekto", "stop"].forEach((action) => {
      try { navigator.mediaSession.setActionHandler(action, null); } catch {}
    });
  } catch {}
}

function getContinueWatchingVideos() {
  return videoState.items
    .filter((item) => getResumePercent(item) > 1 && getResumePercent(item) < 98)
    .sort((a, b) => Number(videoState.resume[b.id]?.updatedAt || 0) - Number(videoState.resume[a.id]?.updatedAt || 0))
    .slice(0, 10);
}

function getVideoTimerRemainingMs() {
  return Math.max(0, Number(videoState.sleepTimerEndAt || 0) - Date.now());
}

function getSleepTimerRemainingText() {
  const remainingMs = getVideoTimerRemainingMs();
  if (remainingMs <= 0) return "Off";

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs ? `${secs}s` : ""}`.trim();
  return `${secs}s`;
}

function getVideoTimerStatusClass() {
  const remainingMs = getVideoTimerRemainingMs();
  if (remainingMs <= 0) return "";

  const totalMs = Number(videoState.sleepTimerTotalMs || 0);
  if (totalMs > 0) {
    const ratio = remainingMs / totalMs;
    if (ratio > 0.5) return "timer-green";
    if (ratio > 0.1) return "timer-orange";
    return "timer-red";
  }

  if (remainingMs <= 5 * 60000) return "timer-red";
  if (remainingMs <= 15 * 60000) return "timer-orange";
  return "timer-green";
}

function renderVideoTimerTrafficPill() {
  if (!videoState.sleepTimerEndAt || getVideoTimerRemainingMs() <= 0) return "";
  const cls = getVideoTimerStatusClass();
  return `
    <div class="brVideoTrafficTimer ${cls}" data-video-traffic-timer>
      <span>Timer</span>
      <strong data-video-timer-label>${escapeHtml(getSleepTimerRemainingText())}</strong>
    </div>
  `;
}

function updateVideoTimerDisplays() {
  const text = getSleepTimerRemainingText();
  const cls = getVideoTimerStatusClass();

  document.querySelectorAll("[data-video-timer-label]").forEach((el) => {
    el.textContent = text;
  });

  document.querySelectorAll("[data-video-traffic-timer]").forEach((el) => {
    el.classList.remove("timer-green", "timer-orange", "timer-red");
    if (cls) el.classList.add(cls);
  });
}

function formatVideoTimerTotal(totalSeconds = 0) {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds || 0)));
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours) return `${hours}h ${mins}m ${secs ? `${secs}s` : ""}`.trim();
  if (mins) return `${mins}m ${secs ? `${secs}s` : ""}`.trim();
  return `${secs}s`;
}

function setVideoSleepTimerSeconds(totalSeconds = 0) {
  const value = Math.max(0, Math.floor(Number(totalSeconds || 0)));
  const totalMs = value > 0 ? value * 1000 : 0;

  videoState.sleepTimerTotalMs = totalMs;
  writeVideoTimerEndAt(totalMs ? Date.now() + totalMs : 0);
  videoState.status = value > 0
    ? `Video sleep timer set for ${formatVideoTimerTotal(value)}.`
    : "Video sleep timer turned off.";

  startVideoSleepTimerTicker();
  renderVideoApp();
}

function setVideoSleepTimer(minutes = 0) {
  const value = Number(minutes || 0);
  setVideoSleepTimerSeconds(value > 0 ? value * 60 : 0);
}

function setVideoSleepTimerToFilmEnd() {
  const video = $("brVideoElement");
  const saved = videoState.resume[videoState.selectedId] || {};
  const duration = Number(video?.duration || saved.duration || 0);
  const current = Number(video?.currentTime || saved.time || 0);
  const remainingMs = Math.max(0, (duration - current) * 1000);

  if (!duration || remainingMs < 5000) {
    videoState.status = "Start the film first so BRMedia can read the film length.";
    renderVideoApp();
    return;
  }

  videoState.sleepTimerTotalMs = remainingMs;
  writeVideoTimerEndAt(Date.now() + remainingMs);
  videoState.status = "Video sleep timer set to Film End.";
  startVideoSleepTimerTicker();
  renderVideoApp();
}

function startVideoSleepTimerTicker() {
  window.clearInterval(videoTimerInterval);
  videoTimerInterval = window.setInterval(() => {
    if (!videoState.sleepTimerEndAt) return;

    const remaining = videoState.sleepTimerEndAt - Date.now();
    if (remaining <= 0) {
      videoState.sleepTimerTotalMs = 0;
      writeVideoTimerEndAt(0);
      const video = $("brVideoElement");
      if (video) video.pause();
      videoState.status = "Video sleep timer finished — playback paused.";
      renderVideoApp();
      return;
    }

    updateVideoTimerDisplays();
  }, 1000);
}

function videoDetailValue(item = {}, key = "") {
  return escapeHtml(item?.[key] || "");
}

function detachVideoElementForSeamlessRender(nextSelected = null) {
  const video = $("brVideoElement");
  if (!video || !nextSelected) return null;

  const nextPlaybackItem = getActiveVideoPlaybackItem(nextSelected);
  const currentPartId = String(video.dataset.videoPartId || "");
  const nextPartId = String(nextPlaybackItem?.id || "");

  if (!currentPartId || !nextPartId || currentPartId !== nextPartId) return null;

  const holder = document.createElement("div");
  holder.hidden = true;
  holder.setAttribute("data-br-video-preserve-holder", "1");
  document.body.appendChild(holder);
  holder.appendChild(video);

  return {
    holder,
    video,
    wasPlaying: !video.paused && !video.ended,
    currentTime: Number(video.currentTime || 0),
  };
}

function restoreSeamlessVideoElement(snapshot = null) {
  if (!snapshot?.video) return false;

  const freshVideo = $("brVideoElement");
  if (freshVideo && freshVideo !== snapshot.video) {
    freshVideo.replaceWith(snapshot.video);
  }

  try { snapshot.holder?.remove?.(); } catch {}

  if (Number.isFinite(snapshot.currentTime) && Math.abs(Number(snapshot.video.currentTime || 0) - snapshot.currentTime) > 1.5) {
    try { snapshot.video.currentTime = snapshot.currentTime; } catch {}
  }

  updateVideoPlayerUi(snapshot.video);
  updateVideoMediaSession(getSelectedVideo(), snapshot.video);

  if (snapshot.wasPlaying && snapshot.video.paused) {
    void snapshot.video.play().catch(() => {});
  }

  return true;
}

function renderVideoApp() {
  if (!moduleContent) return;
  const selected = getSelectedVideo();
  const preservedVideo = detachVideoElementForSeamlessRender(selected);
  const filtered = getFilteredVideos();
  const continueItems = getContinueWatchingVideos();
  const favouriteItems =
    videoState.items
      .filter((item) => isVideoFavourite(item.id))
      .slice(0, 10);

  const linkedItems =
    videoState.items
      .filter((item) => isVideoGroup(item))
      .slice(0, 12);
  const popupOpen = !!(
    videoState.timerPopupOpen ||
    videoState.bookmarksPopupOpen ||
    videoState.menuPopupOpen ||
    videoState.metadataControlOpen ||
    videoState.sendSheetOpen ||
    videoState.cinemaMode
  );

  if (!videoState.actorPopupKey) {
    closeVideoActorPortal(false);
  }

  const isStandaloneVideoMode = window.navigator?.standalone === true || window.matchMedia?.("(display-mode: standalone)")?.matches === true;
  document.body.classList.toggle("videoStandaloneMode", !!isStandaloneVideoMode);
  document.body.classList.toggle("videoCinemaMode", !!videoState.cinemaMode);
  document.body.classList.toggle("videoWatchMode", !!selected);
  document.body.classList.toggle("videoPopupOpen", !!selected && popupOpen);

  moduleContent.innerHTML = selected
    ? renderVideoFilmDetailPage(selected)
    : renderVideoLibraryHome(
        filtered,
        continueItems,
        favouriteItems,
        linkedItems
      );

  const seamlessVideoRestored = restoreSeamlessVideoElement(preservedVideo);

  bindVideoEvents();
  hydrateBrIcons(moduleContent);

  const scroller = moduleContent.querySelector(".brVideoTabsScroller");
  if (scroller) {
    scroller.scrollLeft = videoState.videoTabsScrollLeft || 0;
  }

  if (selected) {
    if (!seamlessVideoRestored) restoreSelectedVideoPosition(false);
    updateVideoMediaSession(selected, $("brVideoElement"));
    window.requestAnimationFrame(() => updateVideoMediaSession(selected, $("brVideoElement")));
  } else {
    clearVideoMediaSession();
  }
}

function renderVideoLibraryHome(
  filtered = [],
  continueItems = [],
  favouriteItems = [],
  linkedItems = []
) {
  return `
    <section class="brVideoHero brVideoLibraryHero">
      <div class="brVideoHeroContent">
        <div class="brVideoHeroText">
          <span class="brVideoEyebrow">BRMedia Video</span>
          <h2>Video Library</h2>
          <p>Pick a poster to open the full film page. Playback, cast, editing, bookmarks, MP4 tools and Send to Device now live inside each film.</p>
          <div class="brVideoMetaPills">
            ${videoPill(`${videoState.items.length} film${videoState.items.length === 1 ? "" : "s"}`)}
            ${videoPill(`${continueItems.length} continue`)}
            ${videoPill(`${favouriteItems.length} favourites`)}
            ${videoPill(videoState.metadataEnabled ? "Metadata ready" : "Metadata keys needed")}
          </div>
        </div>
      </div>
    </section>

    <section class="brVideoControlsPanel brVideoLibraryControls">
      <div class="brVideoSearchBox">
        ${iconHtml("magnifying-glass")}
        <input id="videoSearchInput" type="search" value="${escapeHtml(videoState.search)}" placeholder="Search films, shows, folders…" />
      </div>
      <select id="videoGenreSelect" class="brVideoSelect">
        ${getVideoGenres().map((genre) => `<option value="${escapeHtml(genre)}" ${genre === videoState.genre ? "selected" : ""}>${escapeHtml(genre === "all" ? "All genres" : genre)}</option>`).join("")}
      </select>
    </section>

    ${continueItems.length ? renderContinueWatchingSection(continueItems) : ""}
    ${favouriteItems.length ? renderVideoPosterShelf("Favourites", "Saved videos for quick access.", favouriteItems) : ""}
    ${linkedItems.length ? renderVideoPosterShelf("Series + linked parts", "Linked shows and multi-part films grouped into one watch page.", linkedItems) : ""}

    <section class="brVideoLibrarySection brVideoPosterLibraryOnly">
      <div class="brVideoSectionHead">
        <div><strong>Posters</strong><span>${filtered.length} of ${videoState.items.length} film${videoState.items.length === 1 ? "" : "s"} · multi-part films show as one poster.</span></div>
        <b>${escapeHtml(videoState.status)}</b>
      </div>
      <div class="brVideoGrid brVideoPosterGrid">
        ${filtered.length ? filtered.map(renderVideoCard).join("") : `<div class="brVideoEmpty">No videos match that search.</div>`}
      </div>
    </section>
  `;
}

function renderVideoPosterShelf(title, desc, items = []) {
  return `
    <section class="brVideoShelfSection">
      <div class="brVideoSectionHead">
        <div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(desc)}</span></div>
      </div>
      <div class="brVideoShelf">
        ${items.map((item) => `
          <article class="brVideoShelfCard">
            <button class="brVideoShelfOpen" data-video-select="${escapeHtml(item.id)}" type="button" aria-label="Open ${escapeHtml(getVideoTitle(item))}">
              <div class="brVideoShelfPoster">${renderPoster(item)}</div>
              <strong>${escapeHtml(getVideoTitle(item))}</strong>
              <span>${escapeHtml([item.year, item.genre].filter(Boolean).join(" · ") || "Video")}</span>
            </button>
            ${renderVideoFavouriteAction(item)}
            <i class="brVideoResumeBar"><b style="width:${getResumePercent(item)}%"></b></i>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderVideoFilmDetailPage(item) {
  const favourite = isVideoFavourite(item.id);
  const bookmarkCount = getVideoBookmarks(item.id).length;
  const resumeTime = Number(videoState.resume[item.id]?.time || 0);

  return `
    <section class="brVideoWatchShell" ${getBackdropUrl(item) ? `style="--video-backdrop:url('${escapeHtml(getBackdropUrl(item))}')"` : ""}>
      <div class="brVideoWatchGlow"></div>

      <div class="brVideoWatchTopbar">
        <button class="brVideoBrandPill" data-video-back-library type="button" aria-label="Back to video library">
          <img src="/shared/branding/global/br-logo-trans.png" alt="BR" />
          <span><strong>Blackburn Ravers</strong><em>Videos</em></span>
        </button>

        <div class="brVideoTopIconBar">
          <button class="brVideoTopIconBtn ${videoState.timerPopupOpen ? "is-active" : ""}" data-video-timer-open="${escapeHtml(item.id)}" type="button" aria-label="Sleep timer">${iconHtml("stopwatch")}</button>
          <button class="brVideoTopIconBtn ${videoState.bookmarksPopupOpen ? "is-active" : ""}" data-video-bookmarks-open="${escapeHtml(item.id)}" type="button" aria-label="Bookmarks">${iconHtml("bookmark")}${bookmarkCount ? `<b>${bookmarkCount}</b>` : ""}</button>
          <button class="brVideoTopIconBtn brVideoFavouriteTopBtn ${favourite ? "is-active" : ""}" data-video-favourite="${escapeHtml(item.id)}" type="button" aria-label="Favourite"><span class="brVideoFavouriteHeartGlyph" aria-hidden="true">♥</span></button>
          <button class="brVideoTopIconBtn ${videoState.menuPopupOpen ? "is-active" : ""}" data-video-menu-open="${escapeHtml(item.id)}" type="button" aria-label="Video menu">${iconHtml("ellipsis")}</button>
        </div>
      </div>

      <div class="brVideoWatchTitleRow">
        <h2 class="brVideoWatchTitle">${escapeHtml(getVideoTitle(item))}</h2>
        ${renderVideoTimerTrafficPill()}
      </div>

      <div class="brVideoStageCard">
        ${renderPlayer(item)}
      </div>

      <div class="brVideoWatchMetaPills">
        ${videoPill(isVideoGroup(item) ? `One film · ${getVideoParts(item).length} parts` : (resumeTime ? `Resume ${formatVideoTime(resumeTime)}` : "Ready"))}
        ${videoPill(item.onlineRating ? `IMDb ${item.onlineRating}` : "IMDb —")}
        ${videoPill(item.rottenTomatoesRating ? `RT ${item.rottenTomatoesRating}` : "RT —")}
        ${videoPill(item.certification || "Age rating —")}
        ${videoPill(item.runtime || formatBytes(item.sizeBytes))}
        ${videoPill(item.year || "Year —")}
        ${isVideoGroup(item) ? videoPill(`${getVideoParts(item).length} parts · playing part ${Number(videoState.activeVideoPartIndex || 0) + 1}`) : ""}
        ${videoPill(isBrowserFriendlyVideo(item) ? "Browser ready" : "Needs MP4")}
      </div>
    </section>

    ${renderVideoDetailTabs(item)}
    ${renderVideoDetailTabContent(item)}
    ${renderVideoUtilityPopups(item)}
    ${renderVideoSendSheet(item)}
    ${renderVideoCinemaOverlay(item)}
  `;
}

function renderVideoDetailTabs(item) {
  const activeTab = normaliseVideoTab(videoState.activeTab);
  return `
    <section class="brVideoTabsShell brVideoTabsShellC1">
      <div class="brVideoTabsScroller">
        ${getVisibleVideoDetailTabs(item).map((tab) => `
          <button class="brVideoTabBtn ${activeTab === tab.key ? "is-active" : ""}" data-video-detail-tab="${escapeHtml(tab.key)}" type="button">
            ${iconHtml(tab.icon)}
            <span><strong>${escapeHtml(tab.title)}</strong><em>${escapeHtml(tab.desc)}</em></span>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function renderVideoDetailTabContent(item) {
  switch (normaliseVideoTab(videoState.activeTab)) {
    case "poster":
      return renderVideoPosterPanel(item);
    case "cast":
      return renderVideoCastPanel(item);
    case "related":
      return renderVideoRelatedPanel(item);

    case "parts":
      return renderVideoLinkedPartsPanel(item);

    case "edit":
      return renderVideoDetailPanel(item);
    case "tools":
      return renderVideoToolPanel(item);
    case "info":
    default:
      return renderVideoOverviewPanel(item);
  }
}

function renderVideoPosterPanel(item) {
  return `
    <section class="brVideoInfoPanel brVideoPosterInfoPanel">
      <div class="brVideoSectionHead">
        <div><strong>Poster</strong><span>Current artwork for this film. Edit and upload options are in the 3-dot menu.</span></div>
      </div>
      <div class="brVideoPosterFocus">
        <div class="brVideoPosterFocusArt">${renderPoster(item, "large")}</div>
        <div class="brVideoPosterFocusInfo">
          <strong>${escapeHtml(getVideoTitle(item))}</strong>
          <span>${escapeHtml([item.genre, item.year, item.certification].filter(Boolean).join(" · ") || "No extra poster info saved yet.")}</span>
        </div>
      </div>
    </section>
  `;
}

function videoInfoCard(icon, label, value, extraClass = "") {
  return `
    <article class="brVideoInfoRow ${extraClass}">
      <div class="brVideoInfoRowIcon">${iconHtml(icon)}</div>
      <div class="brVideoInfoRowText">
        <strong>${escapeHtml(label)}</strong>
        <span>${escapeHtml(value || "Not set")}</span>
      </div>
    </article>
  `;
}

function renderVideoOverviewPanel(item) {
  return `
    <section class="brVideoInfoPanel">
      <div class="brVideoSectionHead">
        <div><strong>Film info</strong><span>Story, ratings and useful file summary.</span></div>
      </div>
      <div class="brVideoOverviewGrid brVideoOverviewGridC2">
        ${videoInfoCard("file-lines", "Write-up", item.overview || "No plot/write-up saved yet. Use the 3-dot menu to edit metadata or search online.", "brVideoInfoRowWide")}
        ${videoInfoCard("masks-theater", "Genre", item.genre || "Unsorted")}
        ${videoInfoCard("calendar-days", "Year", item.year || "Unknown")}
        ${videoInfoCard("clock", "Runtime", item.runtime || formatBytes(item.sizeBytes))}
        ${videoInfoCard("imdb", "IMDb", item.onlineRating || "Not set")}
        ${videoInfoCard("rottentomatoes", "Rotten Tomatoes", item.rottenTomatoesRating || "Not set")}
        ${videoInfoCard("shield-halved", "Age rating", item.certification || "Not set")}
        ${videoInfoCard("file-video", "Format", item.mimeType || getVideoExtension(item) || "Unknown")}
        ${videoInfoCard("folder-open", "File", item.locator || item.path || item.fileName || "Local video", "brVideoInfoRowWide")}
      </div>
    </section>
  `;
}

function videoOnlineImageUrl(url = "") {
  const value = String(url || "").trim();
  if (!value) return "";
  if (value.startsWith("/video-online-image")) return value;
  return `/video-online-image?url=${encodeURIComponent(value)}`;
}

function getVideoCastCards(item = {}) {
  const detailed = Array.isArray(item.castDetails) ? item.castDetails.filter(Boolean) : [];
  if (detailed.length) return detailed;

  const cast = Array.isArray(item.cast) ? item.cast.filter(Boolean) : [];
  return cast.map((entry) => typeof entry === "string"
    ? { name: entry, character: "Cast", profileUrl: "", biography: "", knownFor: [] }
    : entry
  );
}

function getVideoPersonKey(person = {}, index = 0, type = "cast") {
  const id = String(person.tmdbPersonId || person.id || "").trim();
  const name = String(person.name || "person").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${type}:${id || `${name}-${index}`}`;
}

function getVideoPeopleForPopup(item = {}) {
  const directors = (Array.isArray(item.directorDetails) && item.directorDetails.length
    ? item.directorDetails
    : (item.director ? [{ name: item.director, job: "Director", profileUrl: "" }] : [])
  ).map((person, index) => ({ ...person, character: person.job || "Director", _personType: "director", _personKey: getVideoPersonKey(person, index, "director") }));

  const cast = getVideoCastCards(item).map((person, index) => ({ ...person, _personType: "cast", _personKey: getVideoPersonKey(person, index, "cast") }));
  return [...directors, ...cast];
}

function getSelectedVideoActor(item = {}) {
  const stored = videoState.actorPopupPerson;
  if (stored && typeof stored === "object") return stored;

  const key = String(videoState.actorPopupKey || "");
  if (!key) return null;
  return getVideoPeopleForPopup(item).find((person) => String(person._personKey) === key) || null;
}

function videoActorDebug(message, data = null) {
  if (window.BRMEDIA_VIDEO_DEBUG_ACTORS) {
    console.debug("[BRMedia Video Actor]", message, data || "");
  }
}

function renderVideoActorDebugPanel() {
  document.getElementById("brVideoActorDebugPanel")?.remove();
}

function closeVideoActorPortal(resetState = true) {
  document.getElementById("brVideoActorPortal")?.remove();

  if (resetState) {
    videoState.actorPopupKey = "";
    videoState.actorPopupPerson = null;
    videoState.actorPopupTab = "bio";
  }

  if (
    !videoState.timerPopupOpen &&
    !videoState.bookmarksPopupOpen &&
    !videoState.menuPopupOpen &&
    !videoState.metadataControlOpen &&
    !videoState.cinemaMode
  ) {
    document.body.classList.remove("videoPopupOpen");
  }
}

function getActorPopupTabs() {
  return [
    { key: "bio", title: "Bio", icon: "file-lines" },
    { key: "films", title: "Films", icon: "film" },
    { key: "social", title: "Social", icon: "share-nodes" },
    { key: "other", title: "Other", icon: "circle-info" },
  ];
}

function renderVideoActorPortal(person = {}, activeTab = "bio") {
  const name = String(person.name || "Cast member");
  const role = String(person.character || person.role || person.job || "Cast");
  const profile =
    videoState.settings?.showCastImages === false
      ? ""
      : videoOnlineImageUrl(
          person.profileUrl ||
          person.profile ||
          ""
        );
  const safeTab = ["bio", "films", "social", "other"].includes(activeTab) ? activeTab : "bio";

  let portal = document.getElementById("brVideoActorPortal");
  if (!portal) {
    portal = document.createElement("div");
    portal.id = "brVideoActorPortal";
    document.body.appendChild(portal);
  }

  portal.innerHTML = `
    <section class="brVideoPlayerPopupBackdrop brVideoActorBackdrop" data-video-actor-portal-close>
      <div class="brVideoPlayerPopupCard brVideoActorPopup brVideoActorPopupPro" role="dialog" aria-label="Actor details">
        <div class="brVideoActorHeroPro">
          <div class="brVideoActorPhotoLarge ${profile ? "" : "noPhoto"}">
            ${profile ? `<img src="${escapeHtml(profile)}" alt="${escapeHtml(name)}" loading="lazy" />` : iconHtml("user")}
          </div>
          <div class="brVideoActorHeroText">
            <span>${escapeHtml(person._personType === "director" ? "Director profile" : "Cast profile")}</span>
            <strong>${escapeHtml(name)}</strong>
            <em>${escapeHtml(role)}</em>
          </div>
          <button class="brVideoActorClose" data-video-actor-portal-close type="button" aria-label="Close actor popup">${iconHtml("xmark")}</button>
        </div>

        <div class="brVideoActorTabs brVideoActorTabsPro">
          ${getActorPopupTabs().map((tab) => `
            <button class="${safeTab === tab.key ? "is-active" : ""}" data-video-actor-portal-tab="${escapeHtml(tab.key)}" type="button">
              ${iconHtml(tab.icon)}<span>${escapeHtml(tab.title)}</span>
            </button>
          `).join("")}
        </div>

        <div class="brVideoActorTabBody brVideoActorTabBodyPro">
          ${renderVideoActorTabContent(person, safeTab)}
        </div>
      </div>
    </section>
  `;

  document.body.classList.add("videoPopupOpen");
  hydrateBrIcons(portal);
  videoActorDebug("portal rendered", { name, tab: safeTab });

  portal.querySelectorAll("[data-video-actor-portal-close]").forEach((button) => {
    button.addEventListener("click", (event) => {
      if (button.classList.contains("brVideoActorBackdrop") && event.target !== button) return;
      videoActorDebug("portal close tapped");
      closeVideoActorPortal(true);
    });
  });

  portal.querySelectorAll("[data-video-actor-portal-tab]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      videoState.actorPopupTab = button.dataset.videoActorPortalTab || "bio";
      videoActorDebug("portal tab tapped", { tab: videoState.actorPopupTab });
      renderVideoActorPortal(person, videoState.actorPopupTab);
    });
  });
}

function openVideoActorProfile(actorKey = "", fallbackPerson = null) {
  const key = String(actorKey || "");
  const selected = getSelectedVideo();
  videoActorDebug("openVideoActorProfile called", { key, selectedId: selected?.id || "" });

  if (!key || !selected) {
    videoActorDebug("open stopped: missing key or selected film");
    return;
  }

  const people = getVideoPeopleForPopup(selected);
  const person =
    people.find((entry) => String(entry._personKey) === key) ||
    (fallbackPerson && fallbackPerson.name ? { ...fallbackPerson, _personKey: key } : null);

  if (!person) {
    videoState.actorPopupKey = "";
    videoState.actorPopupPerson = null;
    videoState.status = "Could not open actor profile. Refresh metadata and try again.";
    videoActorDebug("open failed: no person matched", { people: people.length, key });
    renderVideoApp();
    return;
  }

  videoState.actorPopupKey = key;
  videoState.actorPopupPerson = person;
  videoState.actorPopupTab = "bio";
  videoState.timerPopupOpen = false;
  videoState.bookmarksPopupOpen = false;
  videoState.menuPopupOpen = false;
  videoState.metadataControlOpen = false;

  try {
    renderVideoActorPortal(person, "bio");
  } catch (err) {
    videoActorDebug("portal render error", { message: err?.message || String(err) });
    console.error("Video actor portal render error", err);
  }
}

function openVideoActorProfileFromElement(element, event = null) {
  if (!element) {
    videoActorDebug("element open stopped: no element");
    return;
  }

  if (event?.type === "keydown" && event.key !== "Enter" && event.key !== " ") return;
  if (event?.cancelable) event.preventDefault();
  event?.stopPropagation?.();
  event?.stopImmediatePropagation?.();

  const key = element.dataset.videoActorOpen || "";
  videoActorDebug("actor card event", { type: event?.type || "direct", key });

  if (!key) {
    videoActorDebug("actor card missing data-video-actor-open");
    return;
  }

  const now = Date.now();
  if (videoState.actorTapLockKey === key && now - Number(videoState.actorTapLockAt || 0) < 650) {
    videoActorDebug("actor tap ignored by tap lock", { key });
    return;
  }

  videoState.actorTapLockKey = key;
  videoState.actorTapLockAt = now;
  element.classList.add("is-opening");

  openVideoActorProfile(key, {
    name: element.dataset.videoActorName || "",
    character: element.dataset.videoActorRole || "",
    profileUrl: element.dataset.videoActorProfile || "",
    _personType: element.dataset.videoActorType || "cast",
  });
}

function installVideoActorGlobalFallback() {
  if (window.__brVideoActorFallbackInstalled) return;
  window.__brVideoActorFallbackInstalled = true;

  const handler = (event) => {
    const card = event.target?.closest?.("[data-video-actor-open]");
    if (!card) return;
    openVideoActorProfileFromElement(card, event);
  };

  document.addEventListener("click", handler, true);

  videoActorDebug("global actor fallback installed");
}

window.openVideoActorProfile = openVideoActorProfile;
window.openVideoActorProfileFromElement = openVideoActorProfileFromElement;
window.installVideoActorGlobalFallback = installVideoActorGlobalFallback;

function renderVideoCastCard(person = {}, index = 0, type = "cast") {
  const name = String(person.name || "Cast member");
  const character = String(person.character || person.role || person.job || (type === "director" ? "Director" : "Cast"));
  const profile =
    videoState.settings?.showCastImages === false
      ? ""
      : videoOnlineImageUrl(
          person.profileUrl ||
          person.profile ||
          ""
        );
  const knownFor = Array.isArray(person.knownFor) ? person.knownFor.filter(Boolean).slice(0, 2) : [];
  const key = getVideoPersonKey(person, index, type);
  const label = type === "director" ? "Director" : `Cast #${index + 1}`;
  const fallbackIcon = type === "director" ? "clapperboard" : "user";

  const actorData = `data-video-actor-open="${escapeHtml(key)}" data-video-actor-name="${escapeHtml(name)}" data-video-actor-role="${escapeHtml(character)}" data-video-actor-profile="${escapeHtml(profile)}" data-video-actor-type="${escapeHtml(type)}"`;

  return `
    <article class="brVideoCastCard brVideoCastCardRich brVideoCastCardPro brVideoCastCardClean">
      <button class="brVideoCastPhoto ${profile ? "" : "noPhoto"}" ${actorData} type="button" aria-label="Open ${escapeHtml(name)} profile">
        ${profile ? `<img src="${escapeHtml(profile)}" alt="${escapeHtml(name)}" loading="lazy" />` : iconHtml(fallbackIcon)}
      </button>

      <button class="brVideoCastCopy" ${actorData} type="button" aria-label="Open ${escapeHtml(name)} profile">
        <span class="brVideoCastLabel">${escapeHtml(label)}</span>
        <strong class="brVideoCastName">${escapeHtml(name)}</strong>
        <em class="brVideoCastRole">${escapeHtml(character)}</em>
        ${knownFor.length ? `<div class="brVideoKnownFor">${knownFor.map((film) => `<b>${escapeHtml(film.title || film.name || film)}</b>`).join("")}</div>` : ""}
      </button>

      <button class="brVideoCastOpenHint" ${actorData} type="button" aria-label="Open ${escapeHtml(name)} profile">${iconHtml("chevron-right")}</button>
    </article>
  `;
}

function renderVideoDirectorCards(item = {}) {
  const directors = Array.isArray(item.directorDetails) && item.directorDetails.length
    ? item.directorDetails
    : (item.director ? [{ name: item.director, job: "Director", profileUrl: "" }] : []);

  if (!directors.length) return "";

  return `
    <section class="brVideoMiniSection">
      <div class="brVideoSectionHead">
        <div><strong>Director</strong><span>Main director / crew details. Tap a card for the full profile.</span></div>
      </div>
      <div class="brVideoCastGrid brVideoDirectorGrid">
        ${directors.slice(0, 4).map((person, index) => renderVideoCastCard({
          ...person,
          character: person.job || "Director",
        }, index, "director")).join("")}
      </div>
    </section>
  `;
}

function renderVideoCastPanel(item) {
  const cast = getVideoCastCards(item);

  return `
    <section class="brVideoInfoPanel brVideoCastPanelRich">
      <div class="brVideoSectionHead">
        <div><strong>Cast</strong><span>Actor images, character names, write-ups and known films from TMDb. Tap an actor for more.</span></div>
        <button class="brVideoTinyAction" data-video-metadata="${escapeHtml(getVideoMetadataActionId(item))}" type="button">${iconHtml("wand-magic-sparkles")}<span>Refresh</span></button>
      </div>

      ${renderVideoDirectorCards(item)}

      <div class="brVideoMiniSection">
        <div class="brVideoSectionHead">
          <div><strong>Main cast</strong><span>Tap a card for bio, films, social links and extra details.</span></div>
        </div>
        <div class="brVideoCastGrid brVideoCastGridPro">
          ${cast.length ? cast.slice(0, 18).map((person, index) => renderVideoCastCard(person, index, "cast")).join("") : `<div class="brVideoEmpty">No cast saved yet. Use the 3-dot menu or Refresh to pull film metadata.</div>`}
        </div>
      </div>
    </section>
  `;
}

function renderVideoActorTabContent(person = {}, activeTab = "bio") {
  const name = String(person.name || "Cast member");
  const role = String(person.character || person.role || person.job || "Cast");
  const bio = String(person.biography || "").trim();
  const knownFor = Array.isArray(person.knownFor) ? person.knownFor.filter(Boolean).slice(0, 18) : [];

  if (activeTab === "films") {
    return `
      <div class="brVideoActorFilmGrid">
        ${knownFor.length ? knownFor.map(renderVideoRelatedTile).join("") : `<div class="brVideoEmpty">No known films saved yet. Refresh online metadata to pull more TMDb credits.</div>`}
      </div>
    `;
  }

  if (activeTab === "social") {
    const links = [
      person.tmdbPersonId ? { icon: "tmdb", label: "TMDb", url: `https://www.themoviedb.org/person/${encodeURIComponent(person.tmdbPersonId)}` } : null,
      person.imdbId ? { icon: "imdb", label: "IMDb", url: `https://www.imdb.com/name/${encodeURIComponent(person.imdbId)}/` } : null,
      person.instagramId ? { icon: "camera", label: "Instagram", url: `https://www.instagram.com/${encodeURIComponent(person.instagramId)}/` } : null,
      person.twitterId ? { icon: "x-twitter", label: "X / Twitter", url: `https://x.com/${encodeURIComponent(person.twitterId)}` } : null,
      person.facebookId ? { icon: "facebook", label: "Facebook", url: `https://www.facebook.com/${encodeURIComponent(person.facebookId)}` } : null,
      person.homepage ? { icon: "globe", label: "Website", url: person.homepage } : null,
    ].filter(Boolean);

    return `
      <div class="brVideoActorSocialBox">
        <strong>Links</strong>
        <p>${links.length ? "Open actor profile links and social pages." : "No social links saved yet. Refresh metadata may add TMDb / IMDb / social links where available."}</p>
        <div class="brVideoActorLinkRow">
          ${links.length ? links.map((link) => `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener">${iconHtml(link.icon)}<span>${escapeHtml(link.label)}</span></a>`).join("") : `<a class="isDisabled" href="#" aria-disabled="true">${iconHtml("link-slash")}<span>No links yet</span></a>`}
        </div>
      </div>
    `;
  }

  if (activeTab === "other") {
    return `
      <div class="brVideoActorFacts">
        <article>${iconHtml("user")}<span><strong>Name</strong><span>${escapeHtml(name)}</span></span></article>
        <article>${iconHtml("clapperboard")}<span><strong>Role</strong><span>${escapeHtml(role)}</span></span></article>
        <article>${iconHtml("tag")}<span><strong>Type</strong><span>${escapeHtml(person._personType || "cast")}</span></span></article>
        <article>${iconHtml("cake-candles")}<span><strong>Birthday</strong><span>${escapeHtml(person.birthday || "Not saved")}</span></span></article>
        <article>${iconHtml("location-dot")}<span><strong>Place of birth</strong><span>${escapeHtml(person.placeOfBirth || "Not saved")}</span></span></article>
        <article>${iconHtml("briefcase")}<span><strong>Department</strong><span>${escapeHtml(person.knownForDepartment || "Not saved")}</span></span></article>
        <article>${iconHtml("id-card")}<span><strong>TMDb ID</strong><span>${escapeHtml(person.tmdbPersonId || "Not saved")}</span></span></article>
        <article>${iconHtml("film")}<span><strong>Known films saved</strong><span>${escapeHtml(String(knownFor.length))}</span></span></article>
      </div>
    `;
  }

  return `
    <div class="brVideoActorBioBox">
      <i>${iconHtml("file-lines")}</i>
      <div>
        <strong>${escapeHtml(name)}</strong>
        <p>${escapeHtml(bio || "No actor biography saved yet. Use Refresh metadata to pull the full TMDb profile where available.")}</p>
      </div>
    </div>
  `;
}

function renderVideoActorPopup(item) {
  const person = getSelectedVideoActor(item);
  if (!person) return "";

  const name = String(person.name || "Cast member");
  const role = String(person.character || person.role || person.job || "Cast");
  const profile = videoOnlineImageUrl(person.profileUrl || person.profile || "");
  const activeTab = ["bio", "films", "social", "other"].includes(videoState.actorPopupTab) ? videoState.actorPopupTab : "bio";

  return `
    <section class="brVideoPlayerPopupBackdrop brVideoActorBackdrop" data-video-actor-close>
      <div class="brVideoPlayerPopupCard brVideoActorPopup brVideoActorPopupPro" role="dialog" aria-label="Actor details">
        <div class="brVideoActorHeroPro">
          <div class="brVideoActorPhotoLarge ${profile ? "" : "noPhoto"}">
            ${profile ? `<img src="${escapeHtml(profile)}" alt="${escapeHtml(name)}" loading="lazy" />` : iconHtml("user")}
          </div>
          <div class="brVideoActorHeroText">
            <span>${escapeHtml(person._personType === "director" ? "Director profile" : "Cast profile")}</span>
            <strong>${escapeHtml(name)}</strong>
            <em>${escapeHtml(role)}</em>
          </div>
          <button class="brVideoActorClose" data-video-actor-close type="button" aria-label="Close actor popup">${iconHtml("xmark")}</button>
        </div>

        <div class="brVideoActorTabs brVideoActorTabsPro">
          ${getActorPopupTabs().map((tab) => `
            <button class="${activeTab === tab.key ? "is-active" : ""}" data-video-actor-tab="${escapeHtml(tab.key)}" type="button">
              ${iconHtml(tab.icon)}<span>${escapeHtml(tab.title)}</span>
            </button>
          `).join("")}
        </div>

        <div class="brVideoActorTabBody brVideoActorTabBodyPro">
          ${renderVideoActorTabContent(person, activeTab)}
        </div>
      </div>
    </section>
  `;
}

function renderVideoMetadataControlPopup(item) {
  const statusText = videoState.metadataControlMessage || videoState.status || "Ready.";
  const enabled = !!videoState.metadataEnabled;
  const actionId = getVideoMetadataActionId(item);

  return `
    <section class="brVideoPlayerPopupBackdrop" data-video-popup-close>
      <div class="brVideoPlayerPopupCard brVideoMetaControlPopup" role="dialog" aria-label="Video metadata control">
        <div class="brVideoMetaControlHero">
          <span>${iconHtml("sliders")}</span>
          <div>
            <strong>Metadata control</strong>
            <em>${enabled ? "Auto refresh is available. Update missing cast, trailers, ratings and related films." : "TMDb / OMDb keys are needed for online metadata."}</em>
          </div>
        </div>

        <div class="brVideoMetaControlStatus ${enabled ? "" : "warn"}">
          ${escapeHtml(statusText)}
        </div>

        <div class="brVideoMetaControlGrid">
          ${
            videoState.settings?.richMetadataRefresh === false
              ? ""
              : `
                <button
                  class="brVideoMetaControlBtn"
                  data-video-metadata-rich="${escapeHtml(actionId)}"
                  type="button"
                >
                  <span>${iconHtml("bolt")}</span>

                  <span>
                    <strong>Force rich refresh</strong>
                    <em>
                      Clear stale cast and related-film arrays,
                      then rebuild full TMDb / OMDb data.
                    </em>
                  </span>
                </button>
              `
          }

          <button class="brVideoMetaControlBtn" data-video-auto-meta-run="3" type="button">
            <span>${iconHtml("rotate")}</span>
            <span><strong>Refresh missing metadata</strong><em>Quietly update the next few films that are missing rich metadata.</em></span>
          </button>

          <button class="brVideoMetaControlBtn" data-video-auto-meta-run="8" type="button">
            <span>${iconHtml("bolt")}</span>
            <span><strong>Power refresh batch</strong><em>Refresh a bigger batch now. Useful after adding new films.</em></span>
          </button>
        </div>

        <button class="brVideoMetaControlClose" data-video-popup-close type="button">Close</button>
      </div>
    </section>
  `;
}

function normaliseVideoMatchText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getLocalVideoMatchForFilm(film = {}) {
  const tmdbId = String(film.tmdbId || film.id || "").trim();
  const imdbId = String(film.imdbId || film.imdbID || "").trim();
  const title = normaliseVideoMatchText(film.title || film.name || "");
  const year = String(film.year || "").trim();

  if (!tmdbId && !imdbId && !title) return null;

  return videoState.items.find((item) => {
    if (tmdbId && String(item.tmdbId || "").trim() === tmdbId) return true;
    if (imdbId && String(item.imdbId || "").trim() === imdbId) return true;

    const itemTitle = normaliseVideoMatchText(getVideoTitle(item));
    const itemYear = String(item.year || "").trim();

    return title && itemTitle === title && (!year || !itemYear || itemYear === year);
  }) || null;
}

function getVideoRelatedUrl(film = {}) {
  const imdbId = String(film.imdbId || film.imdbID || "").trim();
  if (imdbId) return `https://www.imdb.com/title/${encodeURIComponent(imdbId)}/`;

  const tmdbId = String(film.tmdbId || film.id || "").trim();
  if (tmdbId) return `https://www.themoviedb.org/movie/${encodeURIComponent(tmdbId)}`;

  return "";
}

function renderVideoRelatedTile(film = {}) {
  const title = String(film.title || film.name || "Related film");
  const poster =
    videoState.settings?.showRelatedImages === false
      ? ""
      : videoOnlineImageUrl(
          film.posterUrl ||
          film.poster ||
          film.backdropUrl ||
          ""
        );
  const localMatch = getLocalVideoMatchForFilm(film);
  const link = localMatch ? "" : getVideoRelatedUrl(film);
  const tag = localMatch ? "button" : link ? "a" : "article";
  const linkAttrs = localMatch
    ? ` type="button" data-video-related-local="${escapeHtml(localMatch.id)}"`
    : link ? ` href="${escapeHtml(link)}" target="_blank" rel="noopener"` : "";
  const sourceLabel = localMatch ? "Open in BRMedia" : film.imdbId || film.imdbID ? "IMDb" : film.tmdbId || film.id ? "TMDb" : "Film";

  return `
    <${tag} class="brVideoRelatedTile ${localMatch ? "isLocal" : ""} ${link ? "isLinked" : ""}"${linkAttrs}>
      <div class="brVideoRelatedPoster ${poster ? "" : "noPoster"}">
        ${poster ? `<img src="${escapeHtml(poster)}" alt="${escapeHtml(title)}" loading="lazy" />` : iconHtml("film")}
      </div>
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml([film.year, film.rating ? `Rating ${film.rating}` : ""].filter(Boolean).join(" · ") || "Film")}</span>
      ${film.overview ? `<p>${escapeHtml(film.overview)}</p>` : ""}
      ${(link || localMatch) ? `<b class="brVideoRelatedLinkBadge">${escapeHtml(sourceLabel)}</b>` : ""}
    </${tag}>
  `;
}

function renderVideoRelatedRow(title, desc, items = []) {
  const list = Array.isArray(items) ? items.filter(Boolean).slice(0, 12) : [];
  if (!list.length) return "";

  return `
    <section class="brVideoRelatedRow">
      <div class="brVideoSectionHead">
        <div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(desc)}</span></div>
      </div>
      <div class="brVideoRelatedScroller">
        ${list.map(renderVideoRelatedTile).join("")}
      </div>
    </section>
  `;
}

function renderVideoTrailerRow(item = {}) {
  const trailers = Array.isArray(item.trailers) ? item.trailers.filter(Boolean).slice(0, 10) : [];
  if (!trailers.length) return "";

  return `
    <section class="brVideoRelatedRow">
      <div class="brVideoSectionHead">
        <div><strong>Trailers + extras</strong><span>Official trailers, teasers and clips from TMDb/YouTube.</span></div>
      </div>
      <div class="brVideoTrailerScroller">
        ${trailers.map((trailer) => {
          const title = trailer.name || trailer.title || "Trailer";
          const site = trailer.site || "YouTube";
          const url = trailer.url || (trailer.key ? `https://www.youtube.com/watch?v=${encodeURIComponent(trailer.key)}` : "");
          const type = trailer.type || "Video";

          return url ? `
            <a class="brVideoTrailerTile" href="${escapeHtml(url)}" target="_blank" rel="noopener">
              <span>${iconHtml("circle-play")}</span>
              <div><strong>${escapeHtml(title)}</strong><em>${escapeHtml([type, site].filter(Boolean).join(" · "))}</em><b>Open trailer</b></div>
            </a>
          ` : `
            <article class="brVideoTrailerTile">
              <span>${iconHtml("circle-play")}</span>
              <div><strong>${escapeHtml(title)}</strong><em>${escapeHtml(type)}</em><b>Trailer</b></div>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderVideoRelatedPanel(item) {
  const collection =
    item.collection &&
    typeof item.collection === "object"
      ? item.collection
      : null;

  const collectionFilms =
    Array.isArray(item.collectionFilms)
      ? item.collectionFilms
      : [];

  const similar =
    Array.isArray(item.similarFilms)
      ? item.similarFilms
      : [];

  const recommended =
    Array.isArray(item.recommendedFilms)
      ? item.recommendedFilms
      : [];

  const trailers =
    Array.isArray(item.trailers)
      ? item.trailers
      : [];

  const castFilms =
    getVideoCastCards(item)
      .flatMap((person) =>
        Array.isArray(person.knownFor)
          ? person.knownFor
          : []
      )
      .slice(0, 12);

  const showCollections =
    videoState.settings?.showCollections !== false;

  const showTrailers =
    videoState.settings?.showTrailers !== false;

  return `
    <section class="brVideoInfoPanel brVideoRelatedPanelRich">
      <div class="brVideoSectionHead">
        <div>
          <strong>Related films</strong>
          <span>
            Trailers, collections, recommendations,
            similar films and cast history.
          </span>
        </div>

        ${
          videoState.settings?.richMetadataRefresh === false
            ? `
              <button
                class="brVideoTinyAction"
                data-video-metadata="${escapeHtml(getVideoMetadataActionId(item))}"
                type="button"
              >
                ${iconHtml("wand-magic-sparkles")}
                <span>Refresh</span>
              </button>
            `
            : `
              <button
                class="brVideoTinyAction"
                data-video-metadata-rich="${escapeHtml(getVideoMetadataActionId(item))}"
                type="button"
              >
                ${iconHtml("bolt")}
                <span>Force refresh</span>
              </button>
            `
        }
      </div>

      ${
        showTrailers
          ? renderVideoTrailerRow(item)
          : ""
      }

      ${
        showCollections && collection
          ? `
            <article class="brVideoCollectionHero">
              <div>
                ${
                  collection.posterUrl
                    ? `
                      <img
                        src="${escapeHtml(videoOnlineImageUrl(collection.posterUrl))}"
                        alt="${escapeHtml(collection.name || "Collection")}"
                        loading="lazy"
                      />
                    `
                    : iconHtml("clapperboard")
                }
              </div>

              <span>
                <strong>
                  ${escapeHtml(collection.name || "Collection / Series")}
                </strong>

                <em>
                  ${escapeHtml(collection.overview || "Collection details from TMDb.")}
                </em>
              </span>
            </article>
          `
          : ""
      }

      ${
        showCollections
          ? renderVideoRelatedRow(
              "Collection / series",
              "Other films in this collection. Local copies open inside BRMedia.",
              collectionFilms
            )
          : ""
      }

      ${renderVideoRelatedRow(
        "Recommended",
        "TMDb recommendations for this film.",
        recommended
      )}

      ${renderVideoRelatedRow(
        "Similar films",
        "Similar titles from TMDb.",
        similar
      )}

      ${renderVideoRelatedRow(
        "Cast past / future credits",
        "Known films from the main cast.",
        castFilms
      )}

      ${
        (
          !showCollections ||
          (
            !collection &&
            !collectionFilms.length
          )
        ) &&
        !recommended.length &&
        !similar.length &&
        !castFilms.length &&
        (
          !showTrailers ||
          !trailers.length
        )
          ? `
            <div class="brVideoRelatedPlaceholder">
              <span>${iconHtml("film")}</span>
              <strong>No related film data yet</strong>

              <p>
                Use Force refresh. TMDb keys are needed
                for cast images, recommendations, similar
                films and collection data.
              </p>
            </div>
          `
          : ""
      }
    </section>
  `;
}

function isVideoCopyRunning(job = null) {
  return !!job && ["queued", "running"].includes(String(job.status || ""));
}

function getVideoCopyJobForItem(item = {}) {
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

  return videoState.copyJobs.find((job) => {
    const sourceId =
      String(job.videoId || job.sourceId || "");

    const copyId =
      String(job.playableCopyId || job.item?.id || "");

    return ids.has(sourceId) || ids.has(copyId);
  }) || null;
}

function getCleanVideoCopyMessage(job = {}) {
  const status = String(job.status || "");
  const message = String(job.message || "");

  if (status === "queued") return "Waiting to start FFmpeg.";
  if (status === "paused") return "Paused — press Resume to continue the MP4 copy.";
  if (status === "cancelled") return "Stopped — partial MP4 file was removed.";
  if (status === "done") return "Finished — browser-safe MP4 copy is ready.";
  if (status === "error") return message || "MP4 copy failed. Open Tools / Convert and try again.";
  return message && !message.includes("frame=") ? message : "Creating browser-safe MP4 copy…";
}

function renderVideoCopyMetric(label, value) {
  if (!value) return "";
  return `<span><b>${escapeHtml(label)}</b><em>${escapeHtml(value)}</em></span>`;
}

function renderVideoCopyProgressDetails(job = {}) {
  const progress = job?.ffmpegProgress || {};
  const metrics = [
    renderVideoCopyMetric("Processed", progress.time || ""),
    renderVideoCopyMetric("Converted", progress.size || ""),
    renderVideoCopyMetric("Bitrate", progress.bitrate || ""),
    renderVideoCopyMetric("Speed", progress.speed || ""),
    renderVideoCopyMetric("Elapsed", progress.elapsed || ""),
  ].filter(Boolean).join("");

  if (!metrics && !(job.technicalLog || job.debugMessage)) return "";

  return `
    ${metrics ? `<div class="brVideoCopyMetrics">${metrics}</div>` : ""}
    ${job.technicalLog || job.debugMessage ? `
      <details class="brVideoCopyTechnicalLog">
        <summary>Show technical log</summary>
        <pre>${escapeHtml(job.technicalLog || job.debugMessage || "")}</pre>
      </details>
    ` : ""}
  `;
}

function renderVideoCopyStatus(job = {}) {
  const percent = Math.max(0, Math.min(100, Number(job.percent || 0)));
  const status = String(job.status || "queued");
  const cardClass = status === "done" ? "isDone" : status === "error" ? "isError" : status === "paused" ? "isPaused" : status === "cancelled" ? "isCancelled" : "isRunning";
  const isRunning = status === "running" || status === "queued";
  const isPaused = status === "paused";
  const canStop = isRunning || isPaused;
  const canPause = status === "running";
  const canResume = isPaused;

  return `
    <div class="brVideoCopyStatus ${cardClass}" style="--copy-progress:${percent}%">
      <i></i>
      <span>${iconHtml(status === "done" ? "circle-check" : status === "error" ? "triangle-exclamation" : status === "paused" ? "pause" : "film")}</span>
      <div>
        <strong>${escapeHtml(job.sourceTitle || "Creating MP4 browser copy")}</strong>
        <em>${escapeHtml(getCleanVideoCopyMessage(job))}</em>
        ${job.fileName ? `<small>${escapeHtml(job.fileName)}</small>` : ""}
        ${renderVideoCopyProgressDetails(job)}
      </div>
      <b>${Math.round(percent)}%</b>
      ${(canStop || canPause || canResume || status === "done") ? `
        <div class="brVideoCopyActions">
          ${canPause ? `<button data-video-copy-action="pause" data-job-id="${escapeHtml(job.id || "")}" type="button">${iconHtml("pause")} Pause</button>` : ""}
          ${canResume ? `<button data-video-copy-action="resume" data-job-id="${escapeHtml(job.id || "")}" type="button">${iconHtml("play")} Resume</button>` : ""}
          ${canStop ? `<button class="danger" data-video-copy-action="cancel" data-job-id="${escapeHtml(job.id || "")}" type="button">${iconHtml("xmark")} Stop</button>` : ""}
          ${status === "done" && job.openUrl ? `<a href="${escapeHtml(job.openUrl)}">${iconHtml("circle-play")} Open MP4 copy</a>` : ""}
          ${status === "done" ? `<button data-video-refresh-library type="button">${iconHtml("arrows-rotate")} Refresh library</button>` : ""}
        </div>
      ` : ""}
    </div>
  `;
}

function videoPill(value) {
  return `<span>${escapeHtml(value || "—")}</span>`;
}

function renderPoster(item, size = "") {
  if (!item) return `<div class="brVideoPosterFallback">${iconHtml("film")}</div>`;
  const poster = getPosterUrl(item);
  if (poster) return `<img src="${escapeHtml(poster)}" alt="${escapeHtml(getVideoTitle(item))}" loading="lazy" />`;
  return `<div class="brVideoPosterFallback ${escapeHtml(size)}">${iconHtml("film")}<span>${escapeHtml(getVideoTitle(item))}</span></div>`;
}

function renderContinueWatchingSection(items = []) {
  return `
    <section class="brVideoShelfSection">
      <div class="brVideoSectionHead">
        <div><strong>Continue Watching</strong><span>Resume from where you left off.</span></div>
      </div>
      <div class="brVideoShelf">
        ${items.map((item) => `
          <button class="brVideoShelfCard" data-video-select="${escapeHtml(item.id)}" type="button">
            <div class="brVideoShelfPoster">${renderPoster(item)}</div>
            <strong>${escapeHtml(getVideoTitle(item))}</strong>
            <span>${Math.round(getResumePercent(item))}% watched · ${formatVideoTime(videoState.resume[item.id]?.time || 0)}</span>
            <i class="brVideoResumeBar"><b style="width:${getResumePercent(item)}%"></b></i>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function renderVideoSourceMapping(item = {}) {
  const originalId = String(
    item.originalVideoId ||
    item.browserCopyOf ||
    ""
  );

  const copyId = String(
    item.preferredBrowserCopyId ||
    (
      item.isBrowserCopyPreferred
        ? item.id
        : ""
    ) ||
    ""
  );

  if (!originalId && !copyId) return "";

  return `
    <article class="brVideoSourceMap">
      <div>
        <strong>Original ↔ browser copy linked</strong>

        <em>
          BRMedia keeps the original file and uses the
          browser-safe MP4 for playback where available.
        </em>
      </div>

      <div class="brVideoSourceMapActions">
        ${
          originalId
            ? `<a href="/video-player?videoId=${encodeURIComponent(originalId)}&tab=tools">Original file</a>`
            : ""
        }

        ${
          copyId
            ? `<a href="/video-player?videoId=${encodeURIComponent(copyId)}&tab=tools">Playable MP4</a>`
            : ""
        }
      </div>
    </article>
  `;
}

function renderVideoToolPanel(item) {
  const playbackItem = getActiveVideoPlaybackItem(item);
  const actionId = getVideoMetadataActionId(item);
  const browserFriendly = isBrowserFriendlyVideo(playbackItem);
  const copyJob = getVideoCopyJobForItem(playbackItem);
  const copyRunning = isVideoCopyRunning(copyJob);

  return `
    <section class="brVideoToolPanel">
      <button class="brVideoToolBtn" data-video-metadata="${escapeHtml(actionId)}" type="button">${iconHtml("wand-magic-sparkles")}<span><strong>Metadata</strong><em>Search/apply poster, ratings and info.</em></span></button>
      <button class="brVideoToolBtn ${!browserFriendly ? "warn" : ""}" data-video-browser-copy="${escapeHtml(playbackItem.id)}" type="button" ${copyRunning ? "disabled" : ""}>${iconHtml(browserFriendly ? "circle-check" : "triangle-exclamation")}<span><strong>${browserFriendly ? "MP4 ready" : "Create MP4"}</strong><em>${browserFriendly ? "Browser-friendly playback." : "Make browser-safe MP4 copy for this part."}</em></span></button>
      <button class="brVideoToolBtn" data-route="/converter?videoId=${encodeURIComponent(playbackItem.id)}" type="button">${iconHtml("arrows-rotate")}<span><strong>Converter</strong><em>Open the current part in Converter module.</em></span></button>
      <button class="brVideoToolBtn" data-video-send-open="${escapeHtml(item.id)}" type="button">${iconHtml("mobile-screen")}<span><strong>Send</strong><em>Send/open on another device.</em></span></button>
      ${copyJob ? `<div class="brVideoToolWide">${renderVideoCopyStatus(copyJob)}</div>` : ""}
      ${renderVideoSourceMapping(playbackItem)}
    </section>
  `;
}

function renderVideoSelectOptions(count, selected = 0, start = 1) {
  const max = Math.max(start, Number(count || 1));
  const current = Number(selected || 0);
  return Array.from({ length: max - start + 1 }, (_, index) => {
    const value = start + index;
    return `<option value="${value}" ${value === current ? "selected" : ""}>${value}</option>`;
  }).join("");
}

function renderVideoLinkupEditor(item = {}) {
  const enabled = !!item.linkupEnabled;
  const mode = item.linkupMode === "series" ? "series" : "parts";
  const titleValue = videoDetailValue(item, "linkupTitle") || videoDetailValue(item, "title");
  const season = Math.max(1, Number(item.linkupSeason || 1));
  const episodeCount = Math.max(1, Number(item.linkupEpisodeCount || 1));
  const episode = Math.max(1, Number(item.linkupEpisode || 1));
  const partTotal = Math.max(2, Number(item.linkupPartTotal || 2));
  const partNumber = Math.max(1, Number(item.linkupPartNumber || 1));

  return `
    <div class="brVideoLinkupEditor wide">
      <label class="brVideoToggleLine">
        <input id="videoLinkupEnabled" type="checkbox" ${enabled ? "checked" : ""} />
        <span><strong>Series/Part Link Ups</strong><em>Link episodes or film parts into one clean watch page.</em></span>
      </label>
      <div class="brVideoLinkupFields ${enabled ? "" : "is-hidden"}">
        <label><span>Link title</span><input id="videoLinkupTitle" value="${titleValue}" placeholder="Film/show group name" /></label>
        <label><span>Type</span><select id="videoLinkupMode">
          <option value="parts" ${mode === "parts" ? "selected" : ""}>Part Link Ups</option>
          <option value="series" ${mode === "series" ? "selected" : ""}>Series</option>
        </select></label>
        <div class="brVideoLinkupMode brVideoLinkupSeries ${mode === "series" ? "" : "is-hidden"}">
          <label><span>Season</span><select id="videoLinkupSeason">${renderVideoSelectOptions(50, season)}</select></label>
          <label><span>Episodes in this season</span><select id="videoLinkupEpisodeCount">${renderVideoSelectOptions(250, episodeCount)}</select></label>
          <label><span>This episode number</span><select id="videoLinkupEpisode">${renderVideoSelectOptions(250, episode)}</select></label>
        </div>
        <div class="brVideoLinkupMode brVideoLinkupParts ${mode === "parts" ? "" : "is-hidden"}">
          <label><span>How many parts?</span><select id="videoLinkupPartTotal">${renderVideoSelectOptions(50, partTotal, 2)}</select></label>
          <label><span>This is part</span><select id="videoLinkupPartNumber">${renderVideoSelectOptions(50, partNumber)}</select></label>
        </div>
      </div>
    </div>
  `;
}

function renderVideoDetailPanel(item) {
  const query = videoState.metadataQuery || getVideoTitle(item);
  const actionId = getVideoMetadataActionId(item);

  return `
    <section class="brVideoDetailPanel">
      <div class="brVideoSectionHead">
        <div><strong>Poster + details</strong><span>Edit quick metadata, search online, upload poster, or paste poster URL.</span></div>
      </div>

      <div class="brVideoDetailGrid">
        <label><span>Title</span><input id="videoMetaTitle" value="${videoDetailValue(item, "title")}" /></label>
        <label><span>Year</span><input id="videoMetaYear" value="${videoDetailValue(item, "year")}" /></label>
        <label><span>Genre</span><input id="videoMetaGenre" value="${videoDetailValue(item, "genre")}" /></label>
        <label><span>Rating / cert</span><input id="videoMetaCertification" value="${videoDetailValue(item, "certification")}" /></label>
        <label class="wide"><span>Overview</span><textarea id="videoMetaOverview">${videoDetailValue(item, "overview")}</textarea></label>
        ${renderVideoLinkupEditor(item)}
        <label class="wide"><span>Poster URL</span><input id="videoPosterUrl" value="${videoDetailValue(item, "customPosterUrl")}" placeholder="https://…jpg / png / webp" /></label>
        <label class="wide"><span>Upload poster</span><input id="videoPosterUpload" type="file" accept="image/jpeg,image/png,image/webp" /></label>
      </div>

      <div class="brVideoDetailActions">
        <button class="brVideoBtn primary" data-video-apply-meta="${escapeHtml(actionId)}" type="button">${iconHtml("circle-check")}<span>Save details</span></button>
        <button class="brVideoBtn" data-video-save-poster-url="${escapeHtml(actionId)}" type="button">${iconHtml("image")}<span>Save poster URL</span></button>
        <button class="brVideoBtn" data-video-upload-poster="${escapeHtml(actionId)}" type="button">${iconHtml("image")}<span>Upload poster</span></button>
      </div>

      <div class="brVideoMetadataSearch">
        <div class="brVideoSearchBox">${iconHtml("magnifying-glass")}<input id="videoMetadataQuery" value="${escapeHtml(query)}" placeholder="Search IMDb/TMDb title…" /></div>
        <button class="brVideoBtn" data-video-search-meta="${escapeHtml(actionId)}" type="button" ${videoState.metadataBusy ? "disabled" : ""}>${iconHtml("wand-magic-sparkles")}<span>${videoState.metadataBusy ? "Searching…" : "Search metadata"}</span></button>
      </div>

      ${renderVideoMetadataResults(item)}
    </section>
  `;
}

function renderVideoMetadataResults(item) {
  if (!videoState.metadataResults.length) return "";

  return `
    <div class="brVideoMetadataResults">
      ${videoState.metadataResults.slice(0, 5).map((result, index) => `
        <button class="brVideoMetadataResult" data-video-apply-result="${escapeHtml(getVideoMetadataActionId(item))}" data-result-index="${index}" type="button">
          <span class="brVideoMetadataResultIcon">${iconHtml(getVideoMetadataSourceIcon(result.metadataSource || result.source || "tmdb"))}</span>
          <span class="brVideoMetadataResultCopy">
            <strong>${escapeHtml(result.title || result.originalTitle || "Metadata result")}</strong>
            <span>${escapeHtml([result.year, result.metadataSource || result.source, result.onlineRating ? `IMDb ${result.onlineRating}` : ""].filter(Boolean).join(" · "))}</span>
            <em>${escapeHtml(result.overview || "Tap to apply this result and refresh cast/related metadata.")}</em>
          </span>
        </button>
      `).join("")}
    </div>
  `;
}

function renderVideoUtilityPopups(item) {
  return `
    ${videoState.timerPopupOpen ? renderVideoTimerPopup(item) : ""}
    ${videoState.bookmarksPopupOpen ? renderVideoBookmarksPopup(item) : ""}
    ${videoState.menuPopupOpen ? renderVideoMenuPopup(item) : ""}
    ${videoState.metadataControlOpen ? renderVideoMetadataControlPopup(item) : ""}
  `;
}

function renderVideoTimerPopup(item) {
  const page = videoState.timerPopupPage === "custom" ? "custom" : "presets";
  const active = !!videoState.sleepTimerEndAt && getVideoTimerRemainingMs() > 0;
  const activeClass = getVideoTimerStatusClass();
  const hourOptions = [0, 1, 2, 3, 4];
  const minuteOptions = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const secondOptions = [0, 15, 30, 45];

  const wheelButton = (part, value, label = value) => `
    <button class="${Number(videoState[`timerCustom${part[0].toUpperCase()}${part.slice(1)}`] || 0) === Number(value) ? "is-selected" : ""}" data-video-timer-custom="${part}" data-value="${value}" type="button">${label}</button>
  `;

  return `
    <section class="brVideoPlayerPopupBackdrop" data-video-popup-close>
      <div class="brVideoPlayerPopupCard brVideoAudioTimerPopup" role="dialog" aria-label="Video sleep timer">
        <div class="brVideoPlayerPopupHead">
          <div>
            <strong>Sleep timer</strong>
            <em>${active ? "Timer is running." : page === "custom" ? "Choose hours, minutes and seconds." : "Choose a preset timer or Film End."}</em>
          </div>
          <button class="brVideoTimerFlipBtn ${active ? "hidden" : ""}" data-video-timer-page="${page === "custom" ? "presets" : "custom"}" type="button" aria-label="Switch timer mode">${iconHtml(page === "custom" ? "list" : "sliders")}</button>
        </div>

        <div class="brVideoAudioTimerCountdownTop ${active ? "hidden" : ""}" data-video-timer-label>${escapeHtml(getSleepTimerRemainingText())}</div>

        <div class="brVideoAudioTimerActivePanel ${active ? activeClass : "hidden"}">
          <div class="brVideoAudioTimerCountdown" data-video-timer-label>${escapeHtml(getSleepTimerRemainingText())}</div>
          <button class="brVideoAudioTimerStop" data-video-timer="0" type="button">Stop</button>
        </div>

        <div class="brVideoTimerPresetPage ${!active && page === "presets" ? "" : "hidden"}">
          <div class="brVideoAudioTimerPresetList">
            <button class="brVideoAudioTimerItem" data-video-timer="15" type="button">${iconHtml("clock")}<span><strong>15 minutes</strong><em>Short watch timer.</em></span></button>
            <button class="brVideoAudioTimerItem" data-video-timer="30" type="button">${iconHtml("clock")}<span><strong>30 minutes</strong><em>Medium watch timer.</em></span></button>
            <button class="brVideoAudioTimerItem" data-video-timer="45" type="button">${iconHtml("clock")}<span><strong>45 minutes</strong><em>Long watch timer.</em></span></button>
            <button class="brVideoAudioTimerItem" data-video-timer="60" type="button">${iconHtml("clock")}<span><strong>1 hour</strong><em>Full hour timer.</em></span></button>
            <button class="brVideoAudioTimerItem" data-video-timer-film-end type="button">${iconHtml("circle-check")}<span><strong>Film End</strong><em>Stop when this film finishes.</em></span></button>
          </div>

          <div class="brVideoAudioTimerActionRow">
            <button class="brVideoAudioTimerActionBtn" data-video-timer="0" type="button">Cancel</button>
          </div>
        </div>

        <div class="brVideoTimerCustomPage ${!active && page === "custom" ? "" : "hidden"}">
          <div class="brVideoAudioTimerPickerRow" aria-label="Choose custom timer">
            <div class="brVideoAudioTimerPickerCol">
              <label>Hours</label>
              <div class="brVideoAudioTimerWheel" data-video-wheel>
                ${hourOptions.map((hour) => wheelButton("hours", hour)).join("")}
              </div>
            </div>

            <div class="brVideoAudioTimerPickerCol">
              <label>Minutes</label>
              <div class="brVideoAudioTimerWheel" data-video-wheel>
                ${minuteOptions.map((minute) => wheelButton("minutes", minute)).join("")}
              </div>
            </div>

            <div class="brVideoAudioTimerPickerCol">
              <label>Seconds</label>
              <div class="brVideoAudioTimerWheel" data-video-wheel>
                ${secondOptions.map((second) => wheelButton("seconds", second)).join("")}
              </div>
            </div>
          </div>

          <div class="brVideoAudioTimerActionRow">
            <button class="brVideoAudioTimerActionBtn" data-video-timer-page="presets" type="button">Cancel</button>
            <button class="brVideoAudioTimerActionBtn primary" data-video-timer-start-custom type="button">Start</button>
          </div>
        </div>
      </div>
    </section>
  `;
} 

function renderVideoBookmarksPopup(item) {
  const bookmarks = getVideoBookmarks(item.id);

  return `
    <section class="brVideoPlayerPopupBackdrop" data-video-popup-close>
      <div class="brVideoPlayerPopupCard brVideoBookmarksPopup" role="dialog" aria-label="Video bookmarks">
        <div class="brVideoPopupTabs">
          <button class="brVideoPopupTab is-active" type="button">Current film</button>
          <button class="brVideoPopupTab" type="button">All films</button>
          <button class="brVideoPopupTab" type="button">${iconHtml("ellipsis")}</button>
        </div>

        <button class="brVideoPopupMainBtn" data-video-bookmark-add="${escapeHtml(item.id)}" type="button">
          ${iconHtml("plus")}
          <span>Add bookmark at current time</span>
        </button>

        <div class="brVideoPopupBookmarkList">
          ${bookmarks.length ? bookmarks.map((bookmark) => `
            <div class="brVideoBookmarkRow">
              <button data-video-bookmark-jump="${escapeHtml(item.id)}" data-bookmark-id="${escapeHtml(bookmark.id)}" type="button">
                <strong>${escapeHtml(formatVideoTime(bookmark.time))}</strong>
                <span>${escapeHtml(bookmark.label || "Video bookmark")}</span>
              </button>
              <button data-video-bookmark-remove="${escapeHtml(item.id)}" data-bookmark-id="${escapeHtml(bookmark.id)}" type="button">${iconHtml("xmark")}</button>
            </div>
          `).join("") : `<div class="brVideoEmpty"><strong>No bookmarks yet</strong><span>Add a bookmark at the current playback position.</span></div>`}
        </div>
      </div>
    </section>
  `;
}

function renderVideoMenuPopup(item) {
  const actionId = getVideoMetadataActionId(item);

  return `
    <section class="brVideoPlayerPopupBackdrop" data-video-popup-close>
      <div class="brVideoPlayerPopupCard brVideoMenuPopup" role="dialog" aria-label="Video menu">
        <button class="brVideoMenuRow" data-video-menu-action="close" type="button">${iconHtml("xmark")}<span>Close video</span></button>
        <button class="brVideoMenuRow" data-video-menu-action="continue" type="button">${iconHtml("play")}<span>Continue playback</span></button>
        <button class="brVideoMenuRow" data-video-menu-action="search" type="button">${iconHtml("magnifying-glass")}<span>Search</span></button>
        <button class="brVideoMenuRow" data-video-menu-action="favourites" type="button">${iconHtml("heart")}<span>Favourites</span></button>
        <button class="brVideoMenuRow" data-video-menu-action="bookmarks" type="button">${iconHtml("bookmark")}<span>Bookmarks</span></button>
        <button class="brVideoMenuRow" data-video-metadata="${escapeHtml(actionId)}" type="button">${iconHtml("wand-magic-sparkles")}<span>Refresh this film</span></button>
        <button class="brVideoMenuRow" data-video-menu-action="metadata-control" type="button">${iconHtml("sliders")}<span>Metadata control</span></button>
        <button class="brVideoMenuRow" data-video-menu-action="edit" type="button">${iconHtml("tag")}<span>Edit metadata</span></button>
        <button class="brVideoMenuRow" data-video-menu-action="tools" type="button">${iconHtml("wrench")}<span>Tools / Convert</span></button>
        <button class="brVideoMenuRow" data-video-menu-action="settings" type="button">${iconHtml("gear")}<span>Video settings</span></button>
        <button class="brVideoMenuRow" data-video-menu-action="delete-library" type="button">
          ${iconHtml("folder-minus")}
          <span>Remove from Video library only</span>
        </button>

        <button class="brVideoMenuRow danger" data-video-menu-action="delete-physical" type="button">
          ${iconHtml("trash")}
          <span>Delete physical video file</span>
        </button>
      </div>
    </section>
  `;
}

function renderVideoBookmarksPanel(item) {
  const bookmarks = getVideoBookmarks(item.id);

  return `
    <section class="brVideoBookmarksPanel">
      <div class="brVideoSectionHead">
        <div><strong>Bookmarks + timer</strong><span>Saved video points, sleep timer and quick watch tools.</span></div>
        <b data-video-timer-label>${escapeHtml(getSleepTimerRemainingText())}</b>
      </div>

      <div class="brVideoTimerBtns">
        <button class="brVideoSmallBtn" data-video-timer="15" type="button">15 min</button>
        <button class="brVideoSmallBtn" data-video-timer="30" type="button">30 min</button>
        <button class="brVideoSmallBtn" data-video-timer="60" type="button">60 min</button>
        <button class="brVideoSmallBtn" data-video-timer="0" type="button">Off</button>
      </div>

      <div class="brVideoBookmarkList">
        ${bookmarks.length ? bookmarks.map((bookmark) => `
          <div class="brVideoBookmarkRow">
            <button data-video-bookmark-jump="${escapeHtml(item.id)}" data-bookmark-id="${escapeHtml(bookmark.id)}" type="button"><strong>${escapeHtml(formatVideoTime(bookmark.time))}</strong><span>${escapeHtml(bookmark.label || "Video bookmark")}</span></button>
            <button data-video-bookmark-remove="${escapeHtml(item.id)}" data-bookmark-id="${escapeHtml(bookmark.id)}" type="button">${iconHtml("xmark")}</button>
          </div>
        `).join("") : `<div class="brVideoEmpty">No video bookmarks yet. Press Bookmark while watching.</div>`}
      </div>
    </section>
  `;
}

function getVideoTimeLabel(item = {}) {
  const saved = videoState.resume[item.id] || {};
  const time = Number(saved.time || 0);
  const duration = Number(saved.duration || item.duration || 0);
  return `${formatVideoTime(time)} / ${duration ? formatVideoTime(duration) : "--:--"}`;
}

function getVideoLinkedPartLabel(item = {}, part = {}, index = 0) {
  if (
    part.linkupMode === "series" ||
    item.linkupMode === "series"
  ) {
    const season =
      Number(
        part.linkupSeason ||
        item.linkupSeason ||
        1
      );

    const episode =
      Number(
        part.linkupEpisode ||
        index + 1
      );

    return `Season ${season} · Episode ${episode}`;
  }

  return `Part ${Number(part.linkupPartNumber || index + 1)}`;
}

function renderVideoLinkedPartsPanel(item = {}) {
  const parts = getVideoParts(item);

  if (parts.length < 2) {
    return `
      <section class="brVideoInfoPanel">
        <div class="brVideoEmpty">
          No linked parts or episodes saved for this video yet.
        </div>
      </section>
    `;
  }

  const activeIndex = Math.max(
    0,
    Math.min(
      parts.length - 1,
      Number(videoState.activeVideoPartIndex || 0)
    )
  );

  return `
    <section class="brVideoInfoPanel brVideoLinkedPanel">
      <div class="brVideoSectionHead">
        <div>
          <strong>Parts / episodes</strong>

          <span>
            ${escapeHtml(parts.length)} linked file${parts.length === 1 ? "" : "s"}
            grouped into one watch page.
          </span>
        </div>
      </div>

      <div class="brVideoLinkedGrid">
        ${parts.map((part, index) => `
          <button
            class="brVideoLinkedCard ${index === activeIndex ? "is-active" : ""}"
            data-video-part-index="${index}"
            type="button"
          >
            <span class="brVideoLinkedPoster">
              ${renderPoster(part)}
            </span>

            <span class="brVideoLinkedText">
              <b>${escapeHtml(getVideoLinkedPartLabel(item, part, index))}</b>
              <strong>${escapeHtml(getVideoTitle(part))}</strong>
              <em>${escapeHtml(part.fileName || part.locator || "Video file")}</em>
            </span>

            <small>
              ${
                isBrowserFriendlyVideo(part)
                  ? "Browser ready"
                  : "Needs MP4 copy"
              }
            </small>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function renderVideoPartSwitcher(item = {}) {
  const parts = getVideoParts(item);

  if (parts.length < 2) return "";

  const activeIndex = Math.max(
    0,
    Math.min(
      parts.length - 1,
      Number(videoState.activeVideoPartIndex || 0)
    )
  );

  return `
    <div class="brVideoPartSwitcher" aria-label="Film parts">
      <strong>${escapeHtml(parts.length)} linked files · one watch page</strong>

      <div class="brVideoPartSwitcherGrid">
        ${parts.map((part, index) => `
          <button
            class="${activeIndex === index ? "is-active" : ""}"
            data-video-part-index="${index}"
            type="button"
          >
            <span>${escapeHtml(getVideoLinkedPartLabel(item, part, index))}</span>
            <em>${escapeHtml(part.fileName || getVideoTitle(part))}</em>
          </button>
        `).join("")}
      </div>

      <div class="brVideoPartNav">
        <button
          data-video-part-step="-1"
          type="button"
          ${activeIndex <= 0 ? "disabled" : ""}
        >
          ${iconHtml("arrow-left")}
          <span>Previous</span>
        </button>

        <b>
          ${escapeHtml(getVideoLinkedPartLabel(item, parts[activeIndex], activeIndex))}
          · ${activeIndex + 1} of ${parts.length}
        </b>

        <button
          data-video-part-step="1"
          type="button"
          ${activeIndex >= parts.length - 1 ? "disabled" : ""}
        >
          <span>Next</span>
          ${iconHtml("arrow-right")}
        </button>
      </div>
    </div>
  `;
}

function renderPlayer(item) {
  const playbackItem = getActiveVideoPlaybackItem(item);
  const subtitles = Array.isArray(playbackItem.subtitles) ? playbackItem.subtitles : [];
  const browserFriendly = isBrowserFriendlyVideo(playbackItem);
  const copyJob = getVideoCopyJobForItem(playbackItem);
  const copyRunning = isVideoCopyRunning(copyJob);

  if (!browserFriendly) {
    return `
      <div class="brVideoUnsupported brVideoUnsupportedC1">
        <span>${iconHtml("triangle-exclamation")}</span>
        <div>
          <strong>MKV/non-browser video added — MP4 copy needed for playback</strong>
          <p>${escapeHtml(getVideoTitle(playbackItem))} is saved in BRMedia as ${escapeHtml(playbackItem.mimeType || getVideoExtension(playbackItem) || "video")}. Keep the original file, then create a browser-safe MP4 copy for iPhone/Safari/Chrome playback.</p>
          <div class="brVideoNowButtons">
            <button class="brVideoSmallBtn" data-video-browser-copy="${escapeHtml(playbackItem.id)}" type="button" ${copyRunning ? "disabled" : ""}>${copyRunning ? "Copy running…" : "Create MP4 copy"}</button>
            <button class="brVideoSmallBtn" data-video-menu-action="tools" type="button">Open tools</button>
          </div>
        </div>
      </div>
      ${copyJob ? renderVideoCopyStatus(copyJob) : ""}
    `;
  }

  return `
    <div class="brVideoPlayerLikeAudio">
      ${
        videoState.settings?.showPartSwitcher === false
          ? ""
          : renderVideoPartSwitcher(item)
      }

      <div
        class="brVideoScreenFrame ${videoState.pendingPartAutoplay ? "is-switching" : ""}"
        style="aspect-ratio:${escapeHtml(getVideoAspectRatioCss())}"
      >
        <video
          id="brVideoElement"
          class="brVideoElement brVideoElementC1"
          playsinline
          preload="${escapeHtml(videoState.settings?.preloadMode || "metadata")}"
          ${videoState.settings?.nativeControls ? "controls" : ""}
          poster="${escapeHtml(getPosterUrl(item))}"
          data-video-part-id="${escapeHtml(playbackItem.id)}"
          style="object-fit:${escapeHtml(videoState.settings?.objectFit || "contain")}"
        >
          <source
            src="/video-stream/${encodeURIComponent(playbackItem.id)}"
            type="${escapeHtml(playbackItem.mimeType || "video/mp4")}"
          />

          ${
            videoState.settings?.subtitlesEnabled === false
              ? ""
              : subtitles
                  .map(
                    (sub) => `
                      <track
                        kind="subtitles"
                        label="${escapeHtml(sub.label || sub.fileName || "Subtitle")}"
                        srclang="${escapeHtml(sub.language || "en")}"
                        src="/video-subtitle/${encodeURIComponent(playbackItem.id)}/${encodeURIComponent(sub.id)}"
                      />
                    `
                  )
                  .join("")
          }
        </video>
      </div>

      <div class="brVideoProgressStrip">
        <span data-video-current-time>${escapeHtml(formatVideoTime(videoState.resume[item.id]?.time || 0))}</span>
        <input class="brVideoSeekRange" data-video-seek type="range" min="0" max="1000" value="0" aria-label="Video position" />
        <span data-video-duration>${escapeHtml(videoState.resume[item.id]?.duration ? formatVideoTime(videoState.resume[item.id].duration) : "--:--")}</span>
      </div>

      <div class="brVideoControlDeck" aria-label="Video controls">
        <button
          data-video-step="-${escapeHtml(videoState.settings?.skipSeconds || 10)}"
          type="button"
          aria-label="Rewind ${escapeHtml(videoState.settings?.skipSeconds || 10)} seconds"
        >
          ${iconHtml("rotate-left")}
        </button>

        <button data-video-toggle-play type="button" aria-label="Play or pause">
          ${iconHtml("play")}
        </button>

        <button data-video-stop type="button" aria-label="Stop video">
          ${iconHtml("stop")}
        </button>

        <button
          data-video-step="${escapeHtml(videoState.settings?.skipSeconds || 10)}"
          type="button"
          aria-label="Forward ${escapeHtml(videoState.settings?.skipSeconds || 10)} seconds"
        >
          ${iconHtml("rotate-right")}
        </button>

        <button data-video-fullscreen type="button" aria-label="Fullscreen">
          ${iconHtml("expand")}
        </button>

        ${
          videoState.settings?.pipEnabled === false
            ? ""
            : `
              <button data-video-popout type="button" aria-label="Pop out video player">
                ${iconHtml("window-restore")}
              </button>
            `
        }

        <button data-video-volume-toggle type="button" aria-label="Mute or unmute">
          ${iconHtml("volume-high")}
        </button>
      </div>

      <div class="brVideoScreenOptions">
        <label>
          <span>Ratio</span>

          <select data-video-ratio>
            ${[
              ["auto", "Auto"],
              ["16:9", "16:9"],
              ["4:3", "4:3"],
              ["21:9", "21:9"],
              ["1:1", "1:1"],
              ["9:16", "9:16"],
            ]
              .map(
                ([value, label]) => `
                  <option
                    value="${value}"
                    ${
                      String(videoState.settings?.aspectRatio || "auto") === value
                        ? "selected"
                        : ""
                    }
                  >
                    ${label}
                  </option>
                `
              )
              .join("")}
          </select>
        </label>

        <label>
          <span>Fit</span>

          <select data-video-fit>
            ${[
              ["contain", "Fit"],
              ["cover", "Fill / crop"],
              ["fill", "Stretch"],
              ["scale-down", "Scale down"],
            ]
              .map(
                ([value, label]) => `
                  <option
                    value="${value}"
                    ${
                      String(videoState.settings?.objectFit || "contain") === value
                        ? "selected"
                        : ""
                    }
                  >
                    ${label}
                  </option>
                `
              )
              .join("")}
          </select>
        </label>
      </div>
      <div class="brVideoPopoutNotice ${videoState.popoutNotice ? "" : "hidden"}" data-video-popout-notice>${escapeHtml(videoState.popoutNotice || "")}</div>
    </div>
  `;
}

function updateVideoPlayerUi(video = $("brVideoElement")) {
  if (!video) return;

  const current = Number(video.currentTime || 0);
  const duration = Number(video.duration || 0);
  const percent = duration ? Math.max(0, Math.min(1000, (current / duration) * 1000)) : 0;
  const currentEl = moduleContent?.querySelector?.("[data-video-current-time]");
  const durationEl = moduleContent?.querySelector?.("[data-video-duration]");
  const rangeEl = moduleContent?.querySelector?.("[data-video-seek]");
  const playBtn = moduleContent?.querySelector?.("[data-video-toggle-play]");
  const volumeBtn = moduleContent?.querySelector?.("[data-video-volume-toggle]");

  if (currentEl) currentEl.textContent = formatVideoTime(current);
  if (durationEl) durationEl.textContent = duration ? formatVideoTime(duration) : "--:--";
  if (rangeEl && document.activeElement !== rangeEl) rangeEl.value = String(percent);

  if (playBtn) {
    const nextIcon = video.paused ? "play" : "pause";
    if (playBtn.dataset.videoIcon !== nextIcon) {
      playBtn.dataset.videoIcon = nextIcon;
      playBtn.innerHTML = iconHtml(nextIcon);
      hydrateBrIcons(playBtn);
    }
  }

  if (volumeBtn) {
    const nextIcon = video.muted || video.volume === 0 ? "volume-xmark" : "volume-high";
    if (volumeBtn.dataset.videoIcon !== nextIcon) {
      volumeBtn.dataset.videoIcon = nextIcon;
      volumeBtn.innerHTML = iconHtml(nextIcon);
      hydrateBrIcons(volumeBtn);
    }
  }

  updateVideoMediaSessionPosition(video);
}

function showVideoPopoutNotice(message = "") {
  const text = String(message || "").trim();
  videoState.popoutNotice = text;
  videoState.status = text || videoState.status;
  const notice = moduleContent?.querySelector?.("[data-video-popout-notice]");
  if (notice) {
    notice.textContent = text;
    notice.classList.toggle("hidden", !text);
  }
}

async function popoutVideoPlayer() {
  const video = $("brVideoElement");
  if (!video) return;

  const prepareNativeVideo = () => {
    try { video.disablePictureInPicture = false; } catch {}
    try { video.setAttribute("controls", "controls"); } catch {}
    try { video.setAttribute("x-webkit-airplay", "allow"); } catch {}
    try {
      video.addEventListener("webkitendfullscreen", () => {
        try { video.removeAttribute("controls"); } catch {}
      }, { once: true });
    } catch {}
  };

  const startPlaybackWithoutWaiting = () => {
    if (!video.paused) return;
    const playPromise = video.play?.();
    if (playPromise?.catch) playPromise.catch(() => {});
  };

  showVideoPopoutNotice("Opening pop-out video…");
  prepareNativeVideo();
  startPlaybackWithoutWaiting();

  try {
    const supportsWebkitPip = typeof video.webkitSupportsPresentationMode === "function"
      ? video.webkitSupportsPresentationMode("picture-in-picture")
      : false;

    if (supportsWebkitPip && typeof video.webkitSetPresentationMode === "function") {
      const currentMode = String(video.webkitPresentationMode || "inline");
      const nextMode = currentMode === "picture-in-picture" ? "inline" : "picture-in-picture";
      video.webkitSetPresentationMode(nextMode);
      showVideoPopoutNotice(nextMode === "picture-in-picture" ? "Pop-out video opened." : "Pop-out video closed.");
      return;
    }

    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      showVideoPopoutNotice("Pop-out video closed.");
      return;
    }

    if (document.pictureInPictureEnabled && typeof video.requestPictureInPicture === "function") {
      try {
        await video.requestPictureInPicture();
        showVideoPopoutNotice("Pop-out video opened.");
        return;
      } catch {}
    }

    if (video.webkitEnterFullscreen) {
      const isStandaloneVideoMode = window.navigator?.standalone === true || window.matchMedia?.("(display-mode: standalone)")?.matches === true;
      video.webkitEnterFullscreen();
      showVideoPopoutNotice(isStandaloneVideoMode
        ? "Saved app mode can only open native fullscreen on this iPhone. Use Safari browser for Picture-in-Picture, or later we can add a tiny native helper app."
        : "Opened iPhone video controls. If Safari shows the PiP icon, tap it there."
      );
      return;
    }

    const target = video.closest?.(".brVideoScreenFrame") || video;
    if (target?.requestFullscreen) {
      await target.requestFullscreen();
      showVideoPopoutNotice("Opened fullscreen. Picture-in-Picture is not available in this browser.");
      return;
    }

    showVideoPopoutNotice("Pop-out is not available in this browser/app mode.");
  } catch (err) {
    showVideoPopoutNotice(`Pop-out failed: ${err?.message || err}`);
  }
}

function renderVideoFavouriteAction(item = {}) {
  const id = item.id || "";
  const favourite = isVideoFavourite(id);
  return `
    <button class="brVideoFavouriteAction ${favourite ? "is-active" : ""}" data-video-favourite="${escapeHtml(id)}" type="button" aria-label="${favourite ? "Remove from favourites" : "Add to favourites"}">
      <span aria-hidden="true">♥</span><strong>${favourite ? "Favourite" : "Add favourite"}</strong>
    </button>
  `;
}

function renderVideoTorrentAction(item = {}) {
  const id = item.id || "";
  return `
    <button class="brVideoTorrentAction" data-video-torrent="${escapeHtml(id)}" type="button" aria-label="Create/add authorised torrent">
      ${iconHtml("magnet")}<strong>Torrent</strong>
    </button>
  `;
}

function openVideoTorrentHandoff(id = "") {
  const item = videoState.items.find((entry) => String(entry.id) === String(id));
  if (!item) return;

  const params = new URLSearchParams({
    create: "video",
    videoId: item.id,
    title: getVideoTitle(item),
  });

  videoState.status = "Opening Torrents to create/add an authorised video torrent…";
  window.location.href = `/torrents?${params.toString()}`;
}

function renderVideoCard(item) {
  const percent = getResumePercent(item);
  const bookmarkCount = getVideoBookmarks(item.id).length;

  return `
    <article class="brVideoCard brVideoPosterCard">
      <button class="brVideoCardOpen" data-video-select="${escapeHtml(item.id)}" type="button" aria-label="Open ${escapeHtml(getVideoTitle(item))}">
        <div class="brVideoCardPoster">${renderPoster(item)}</div>
        <div class="brVideoCardBody">
          <strong>${escapeHtml(getVideoTitle(item))}</strong>
          <span>${escapeHtml([item.year, item.genre].filter(Boolean).join(" · ") || item.fileName || "Video")}</span>
          <div class="brVideoCardBadges">
            ${isVideoGroup(item) ? `<b>${iconHtml("film")} ${item.partCount || getVideoParts(item).length} linked</b>` : ""}
            ${item.isBrowserCopyPreferred ? `<b>${iconHtml("circle-check")} MP4 linked</b>` : ""}
            ${bookmarkCount ? `<b>${iconHtml("bookmark")} ${bookmarkCount}</b>` : ""}
            ${!isBrowserFriendlyVideo(item) ? `<b class="warn">${iconHtml("triangle-exclamation")} MP4</b>` : ""}
          </div>
        </div>
      </button>
      <div class="brVideoCardActions">
        ${renderVideoFavouriteAction(item)}
        ${renderVideoTorrentAction(item)}
      </div>
      <i class="brVideoResumeBar"><b style="width:${percent}%"></b></i>
    </article>
  `;
}

function bindVideoEvents() {
  $("videoSearchInput")?.addEventListener("input", (event) => {
    videoState.search = event.target.value || "";
    renderVideoApp();
  });

  $("videoGenreSelect")?.addEventListener("change", (event) => {
    videoState.genre = event.target.value || "all";
    videoState.sidebarFilter = "all";
    renderVideoApp();
  });

  $("videoMetadataQuery")?.addEventListener("input", (event) => {
    videoState.metadataQuery = event.target.value || "";
  });

  moduleContent.querySelectorAll("[data-video-select]").forEach((button) => {
    button.addEventListener("click", () => {
      openVideoDetail(button.dataset.videoSelect || "", "overview");
    });
  });

  moduleContent.querySelectorAll("[data-video-back-library]").forEach((button) => {
    button.addEventListener("click", () => closeVideoDetail());
  });

  moduleContent.querySelectorAll("[data-video-detail-tab]").forEach((button) => {
    button.addEventListener("click", () => setVideoDetailTab(button.dataset.videoDetailTab || "overview"));
  });

  moduleContent.querySelectorAll("[data-video-play]").forEach((button) => {
    button.addEventListener("click", () => {
      videoState.selectedId = button.dataset.videoPlay || videoState.selectedId;
      queueVideoEvent("play_button", getSelectedVideo());
      renderVideoApp();
      const video = $("brVideoElement");
      if (video) {
        restoreSelectedVideoPosition(false);
        void video.play().catch(() => {
          videoState.status = "Tap the video controls to start playback.";
          renderVideoApp();
        });
      }
    });
  });

  moduleContent.querySelectorAll("[data-video-favourite]").forEach((button) => {
    button.addEventListener("click", () => {
      toggleVideoFavourite(button.dataset.videoFavourite || videoState.selectedId);
      videoState.menuPopupOpen = false;
      renderVideoApp();
      renderVideoSidebarFilters();
    });
  });
	
  moduleContent.querySelectorAll("[data-video-torrent]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openVideoTorrentHandoff(button.dataset.videoTorrent || "");
    });
  });
	
  moduleContent
    .querySelectorAll(
      "[data-video-part-index]"
    )
    .forEach(
      (button) => {
        button.addEventListener(
          "click",
          () => {
            const previousIndex =
              Number(
                videoState
                  .activeVideoPartIndex ||
                0
              );

            const nextIndex =
              Math.max(
                0,
                Number(
                  button.dataset
                    .videoPartIndex ||
                  0
                )
              );

            if (
              nextIndex ===
              previousIndex
            ) {
              return;
            }

            videoState
              .activeVideoPartIndex =
                nextIndex;

            videoState
              .pendingPartAutoplay =
                false;

            queueVideoEvent(
              "part_switch",
              getSelectedVideo(),
              {
                status:
                  "direct_select",
                fromPartIndex:
                  previousIndex,
                toPartIndex:
                  nextIndex,
              }
            );

            videoState.status =
              `Switched to part ${videoState.activeVideoPartIndex + 1}.`;

            renderVideoApp();
          }
        );
      }
    );

  moduleContent.querySelectorAll("[data-video-part-step]").forEach((button) => {
    button.addEventListener("click", () => {
      const selected = getSelectedVideo();
      const parts = getVideoParts(selected || {});
      const nextIndex = Math.max(0, Math.min(parts.length - 1, Number(videoState.activeVideoPartIndex || 0) + Number(button.dataset.videoPartStep || 0)));

      if (nextIndex === Number(videoState.activeVideoPartIndex || 0)) return;

      const previousIndex =
        Number(
          videoState
            .activeVideoPartIndex ||
          0
        );

      videoState
        .activeVideoPartIndex =
          nextIndex;

      videoState
        .pendingPartAutoplay =
          true;

      queueVideoEvent(
        "part_switch",
        selected,
        {
          status:
            "step_button",
          fromPartIndex:
            previousIndex,
          toPartIndex:
            nextIndex,
        }
      );
      videoState.resume[videoState.selectedId] = {
        time: 0,
        duration: 0,
        partIndex: nextIndex,
        partId: parts[nextIndex]?.id || "",
        updatedAt: Date.now(),
      };
      writeVideoResume();
      videoState.status = `Switched to part ${nextIndex + 1} of ${parts.length}.`;
      renderVideoApp();
    });
  });

  moduleContent.querySelectorAll("[data-video-timer-open]").forEach((button) => {
    button.addEventListener("click", () => {
      videoState.selectedId = button.dataset.videoTimerOpen || videoState.selectedId;
      videoState.timerPopupOpen = true;
      videoState.timerPopupPage = "presets";
      videoState.bookmarksPopupOpen = false;
      videoState.menuPopupOpen = false;
      videoState.actorPopupKey = "";
      renderVideoApp();
    });
  });

  moduleContent.querySelectorAll("[data-video-timer-page]").forEach((button) => {
    button.addEventListener("click", () => {
      videoState.timerPopupPage = button.dataset.videoTimerPage || "presets";
      renderVideoApp();
    });
  });

  moduleContent.querySelectorAll("[data-video-timer-custom]").forEach((button) => {
    button.addEventListener("click", () => {
      const part = button.dataset.videoTimerCustom || "";
      const value = Number(button.dataset.value || 0);

      if (part === "hours") videoState.timerCustomHours = value;
      if (part === "minutes") videoState.timerCustomMinutes = value;
      if (part === "seconds") videoState.timerCustomSeconds = value;

      renderVideoApp();
    });
  });

  moduleContent.querySelectorAll("[data-video-timer-start-custom]").forEach((button) => {
    button.addEventListener("click", () => {
      const totalSeconds =
        Number(videoState.timerCustomHours || 0) * 3600 +
        Number(videoState.timerCustomMinutes || 0) * 60 +
        Number(videoState.timerCustomSeconds || 0);

      videoState.timerPopupOpen = false;
      setVideoSleepTimerSeconds(totalSeconds);
    });
  });

  moduleContent.querySelectorAll("[data-video-wheel]").forEach((wheel) => {
    wheel.addEventListener("touchstart", (event) => event.stopPropagation(), { passive: true });
    wheel.addEventListener("touchmove", (event) => event.stopPropagation(), { passive: true });
    wheel.addEventListener("scroll", (event) => event.stopPropagation(), { passive: true });
    wheel.addEventListener("wheel", (event) => event.stopPropagation(), { passive: true });
  });

  moduleContent.querySelectorAll("[data-video-bookmarks-open]").forEach((button) => {
    button.addEventListener("click", () => {
      videoState.selectedId = button.dataset.videoBookmarksOpen || videoState.selectedId;
      videoState.bookmarksPopupOpen = true;
      videoState.timerPopupOpen = false;
      videoState.menuPopupOpen = false;
      videoState.actorPopupKey = "";
      renderVideoApp();
    });
  });

  moduleContent.querySelectorAll("[data-video-menu-open]").forEach((button) => {
    button.addEventListener("click", () => {
      videoState.selectedId = button.dataset.videoMenuOpen || videoState.selectedId;
      videoState.menuPopupOpen = true;
      videoState.timerPopupOpen = false;
      videoState.bookmarksPopupOpen = false;
      videoState.actorPopupKey = "";
      renderVideoApp();
    });
  });

  moduleContent.querySelectorAll("[data-video-popup-close]").forEach((button) => {
    button.addEventListener("click", (event) => {
      if (button.classList.contains("brVideoPlayerPopupBackdrop") && event.target !== button) return;
      videoState.timerPopupOpen = false;
      videoState.bookmarksPopupOpen = false;
      videoState.menuPopupOpen = false;
      videoState.metadataControlOpen = false;
      videoState.actorPopupKey = "";
      videoState.actorPopupPerson = null;
      renderVideoApp();
    });
  });

  moduleContent.querySelectorAll("[data-video-menu-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.videoMenuAction || "";
      videoState.menuPopupOpen = false;

      if (action === "close") return closeVideoDetail();
      if (action === "continue") {
        setVideoDetailTab("info", true);
        setTimeout(() => {
          restoreSelectedVideoPosition(true);
          const video = $("brVideoElement");
          if (video) void video.play().catch(() => {});
        }, 90);
        return;
      }
      if (action === "search") {
        closeVideoDetail();
        setTimeout(() => $("videoSearchInput")?.focus?.(), 80);
        return;
      }
      if (action === "favourites") {
        closeVideoDetail();
        videoState.sidebarFilter = "favourites";
        setTimeout(renderVideoApp, 0);
        return;
      }
      if (action === "bookmarks") {
        videoState.bookmarksPopupOpen = true;
        renderVideoApp();
        return;
      }
      if (action === "edit") return setVideoDetailTab("edit", true);
      if (action === "tools") return setVideoDetailTab("tools", true);
      if (action === "metadata-control") {
        const selected = getSelectedVideo();
        window.location.href = `/settings?module=video&tab=metadata${selected?.id ? `&videoId=${encodeURIComponent(selected.id)}` : ""}`;
        return;
      }
      if (action === "settings") {
        window.location.href = "/settings?module=video&tab=overview";
      }
      if (action === "delete-library") {
        void deleteSelectedVideoFile("library");
      }

      if (action === "delete-physical") {
        void deleteSelectedVideoFile("physical");
      }
    });
  });

  moduleContent.querySelector("#videoLinkupEnabled")?.addEventListener("change", renderVideoLinkupDraftState);
  moduleContent.querySelector("#videoLinkupMode")?.addEventListener("change", renderVideoLinkupDraftState);
		
  installVideoActorGlobalFallback();

  moduleContent.querySelectorAll("[data-video-actor-open]").forEach((actorButton) => {
    actorButton.addEventListener("keydown", (event) => {
      openVideoActorProfileFromElement(actorButton, event);
    });
  });

  moduleContent.querySelectorAll("[data-video-actor-close]").forEach((button) => {
    button.addEventListener("click", (event) => {
      if (button.classList.contains("brVideoActorBackdrop") && event.target !== button) return;
      videoState.actorPopupKey = "";
      videoState.actorPopupPerson = null;
      renderVideoApp();
    });
  });

  moduleContent.querySelectorAll("[data-video-actor-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      videoState.actorPopupTab = button.dataset.videoActorTab || "bio";
      renderVideoApp();
    });
  });

  moduleContent.querySelectorAll("[data-video-bookmark-add]").forEach((button) => {
    button.addEventListener("click", () => {
      addVideoBookmark(button.dataset.videoBookmarkAdd || videoState.selectedId);
      renderVideoApp();
      renderVideoSidebarFilters();
    });
  });

  moduleContent.querySelectorAll("[data-video-bookmark-jump]").forEach((button) => {
    button.addEventListener("click", () => jumpToVideoBookmark(button.dataset.videoBookmarkJump || "", button.dataset.bookmarkId || ""));
  });

  moduleContent.querySelectorAll("[data-video-bookmark-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      removeVideoBookmark(button.dataset.videoBookmarkRemove || "", button.dataset.bookmarkId || "");
      renderVideoApp();
      renderVideoSidebarFilters();
    });
  });

  moduleContent.querySelectorAll("[data-video-timer-film-end]").forEach((button) => {
    button.addEventListener("click", () => {
      videoState.timerPopupOpen = false;
      setVideoSleepTimerToFilmEnd();
    });
  });

  moduleContent.querySelectorAll("[data-video-timer]").forEach((button) => {
    button.addEventListener("click", () => {
      videoState.timerPopupOpen = false;
      setVideoSleepTimer(Number(button.dataset.videoTimer || 0));
    });
  });

  moduleContent.querySelectorAll("[data-video-toggle-play]").forEach((button) => {
    button.addEventListener("click", () => {
      const video = $("brVideoElement");
      if (!video) return;
      if (video.paused) void video.play().catch(() => {});
      else video.pause();
      updateVideoPlayerUi(video);
    });
  });

  moduleContent.querySelectorAll("[data-video-stop]").forEach((button) => {
    button.addEventListener("click", () => {
      const video = $("brVideoElement");
      if (!video) return;
      video.pause();
      video.currentTime = 0;
      saveVideoPosition(video);
      updateVideoPlayerUi(video);
    });
  });

  moduleContent
    .querySelectorAll(
      "[data-video-step]"
    )
    .forEach(
      (button) => {
        button.addEventListener(
          "click",
          () => {
            const video =
              $(
                "brVideoElement"
              );

            if (!video) return;

            const amount =
              Number(
                button.dataset
                  .videoStep ||
                0
              );

            const fromPosition =
              Number(
                video.currentTime ||
                0
              );

            video.currentTime =
              Math.max(
                0,
                Math.min(
                  Number(
                    video.duration ||
                    Infinity
                  ),
                  fromPosition +
                  amount
                )
              );

            recordVideoSeek(
              video,
              fromPosition,
              "step_button"
            );

            saveVideoPosition(
              video
            );

            updateVideoPlayerUi(
              video
            );
          }
        );
      }
    );

  moduleContent.querySelectorAll("[data-video-fullscreen]").forEach((button) => {
    button.addEventListener("click", () => {
      const video = $("brVideoElement");
      const target = video?.closest?.(".brVideoScreenFrame") || video;
      if (!video || !target) return;
      if (video.webkitEnterFullscreen) {
        try { video.webkitEnterFullscreen(); return; } catch {}
      }
      if (target.requestFullscreen) void target.requestFullscreen().catch(() => {});
    });
  });

  moduleContent.querySelectorAll("[data-video-popout]").forEach((button) => {
    button.addEventListener("click", () => {
      void popoutVideoPlayer();
    });
  });

  moduleContent.querySelectorAll("[data-video-volume-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const video = $("brVideoElement");
      if (!video) return;
      video.muted = !video.muted;
      updateVideoPlayerUi(video);
    });
  });

  moduleContent
    .querySelectorAll(
      "[data-video-seek]"
    )
    .forEach(
      (range) => {
        range.addEventListener(
          "pointerdown",
          () => {
            const video =
              $(
                "brVideoElement"
              );

            range.dataset
              .videoSeekStart =
                String(
                  Number(
                    video
                      ?.currentTime ||
                    0
                  )
                );
          }
        );

        range.addEventListener(
          "input",
          () => {
            const video =
              $(
                "brVideoElement"
              );

            if (
              !video ||
              !Number.isFinite(
                video.duration
              ) ||
              !video.duration
            ) {
              return;
            }

            video.currentTime =
              (
                Number(
                  range.value ||
                  0
                ) /
                1000
              ) *
              video.duration;

            saveVideoPosition(
              video
            );

            updateVideoPlayerUi(
              video
            );
          }
        );

        range.addEventListener(
          "change",
          () => {
            const video =
              $(
                "brVideoElement"
              );

            if (!video) return;

            recordVideoSeek(
              video,
              Number(
                range.dataset
                  .videoSeekStart ||
                0
              ),
              "slider"
            );
          }
        );
      }
    );

  moduleContent.querySelectorAll("[data-video-send]").forEach((button) => {
    button.addEventListener("click", () => { void sendVideoToDevice(button.dataset.videoSend || videoState.selectedId); });
  });

  moduleContent.querySelectorAll("[data-video-send-open]").forEach((button) => {
    button.addEventListener("click", () => openVideoSendSheet(button.dataset.videoSendOpen || videoState.selectedId));
  });

  moduleContent.querySelectorAll("[data-video-send-target]").forEach((button) => {
    button.addEventListener("click", () => { void sendVideoToDevice(videoState.selectedId, button.dataset.videoSendTarget || ""); });
  });

  moduleContent.querySelectorAll("[data-video-send-close]").forEach((button) => {
    button.addEventListener("click", closeVideoSendSheet);
  });

  moduleContent.querySelectorAll("[data-video-send-refresh]").forEach((button) => {
    button.addEventListener("click", () => { void refreshVideoDevices(true); });
  });

  moduleContent.querySelectorAll("[data-video-cinema]").forEach((button) => {
    button.addEventListener("click", () => {
      videoState.selectedId = button.dataset.videoCinema || videoState.selectedId;
      queueVideoEvent("cinema_open", getSelectedVideo());
      setVideoCinemaMode(true);
    });
  });

  moduleContent.querySelectorAll("[data-video-cinema-close]").forEach((button) => {
    button.addEventListener("click", () => {
      queueVideoEvent("cinema_close", getSelectedVideo());
      setVideoCinemaMode(false);
    });
  });

  moduleContent.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => goToRoute(button.dataset.route || "/"));
  });

  moduleContent.querySelectorAll("[data-video-browser-copy]").forEach((button) => {
    button.addEventListener("click", () => {
      void startVideoBrowserCopy(button.dataset.videoBrowserCopy || "");
    });
  });

  moduleContent
    .querySelectorAll("[data-video-refresh-library]")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => loadVideoLibrary(true)
      );
    });
  moduleContent.querySelectorAll("[data-video-copy-action]").forEach((button) => {
    button.addEventListener("click", () => {
      void controlVideoCopyJob(button.dataset.jobId || "", button.dataset.videoCopyAction || "");
    });
  });
		
  moduleContent.querySelectorAll("[data-video-related-local]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.videoRelatedLocal || "";
      if (!id) return;
      openVideoDetail(id, "info");
    });
  });

  moduleContent.querySelector("[data-video-refresh]")?.addEventListener("click", () => loadVideoLibrary(true));

  moduleContent.querySelectorAll("[data-video-auto-meta-run]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const limit = Number(button.dataset.videoAutoMetaRun || 3);
      button.classList.add("isBusy");
      void runVideoAutoMetadataRefreshBatch(limit, true);
    });
  });
  moduleContent
    .querySelectorAll("[data-video-metadata]")
    .forEach((button) => {
      button.addEventListener("click", () =>
        refreshVideoMetadata(
          button.dataset.videoMetadata ||
          videoState.selectedId,
          false
        )
      );
    });

  moduleContent
    .querySelectorAll("[data-video-metadata-rich]")
    .forEach((button) => {
      button.addEventListener("click", () =>
        refreshVideoMetadata(
          button.dataset.videoMetadataRich ||
          videoState.selectedId,
          true
        )
      );
    });

  moduleContent.querySelectorAll("[data-video-search-meta]").forEach((button) => {
    button.addEventListener("click", () => searchVideoMetadata(button.dataset.videoSearchMeta || videoState.selectedId));
  });

  moduleContent.querySelectorAll("[data-video-apply-result]").forEach((button) => {
    button.addEventListener("click", () => applyVideoMetadataResult(button.dataset.videoApplyResult || videoState.selectedId, Number(button.dataset.resultIndex || 0)));
  });

  moduleContent.querySelectorAll("[data-video-apply-meta]").forEach((button) => {
    button.addEventListener("click", () => saveVideoManualMetadata(button.dataset.videoApplyMeta || videoState.selectedId));
  });

  moduleContent.querySelectorAll("[data-video-save-poster-url]").forEach((button) => {
    button.addEventListener("click", () => saveVideoPosterUrlFromInput(button.dataset.videoSavePosterUrl || videoState.selectedId));
  });

  moduleContent.querySelectorAll("[data-video-upload-poster]").forEach((button) => {
    button.addEventListener("click", () => uploadVideoPosterFromInput(button.dataset.videoUploadPoster || videoState.selectedId));
  });

  moduleContent.querySelectorAll("[data-video-resume]").forEach((button) => {
    button.addEventListener("click", () => restoreSelectedVideoPosition(true));
  });

  moduleContent.querySelectorAll("[data-video-clear-resume]").forEach((button) => {
    button.addEventListener("click", () => {
      delete videoState.resume[button.dataset.videoClearResume || ""];
      writeVideoResume();
      renderVideoApp();
      renderVideoSidebarFilters();
    });
  });
	
  moduleContent
    .querySelectorAll("[data-video-ratio]")
    .forEach((select) => {
      select.addEventListener("change", () => {
        videoState.settings.aspectRatio =
          select.value ||
          "auto";

        writeVideoSettings();
        renderVideoApp();
      });
    });

  moduleContent
    .querySelectorAll("[data-video-fit]")
    .forEach((select) => {
      select.addEventListener("change", () => {
        videoState.settings.objectFit =
          select.value ||
          "contain";

        writeVideoSettings();
        renderVideoApp();
      });
    });

  const video = $("brVideoElement");
  if (video && video.dataset.brVideoCoreEventsBound !== "1") {
    video.dataset.brVideoCoreEventsBound = "1";
    video.addEventListener("timeupdate", () => {
      saveVideoPosition(video);
      updateVideoPlayerUi(video);
      updateVideoMediaSessionPosition(video);
    });
    video.addEventListener("loadedmetadata", () => {
      applyVideoPlaybackSettings(video);
      restoreSelectedVideoPosition(false);
      updateVideoPlayerUi(video);
      updateVideoMediaSession(getSelectedVideo(), video);

      if (videoState.pendingPartAutoplay) {
        videoState.pendingPartAutoplay = false;
        void video.play().catch(() => {});
      }
    });
    video.addEventListener("play", () => {
      queueVideoEvent("play", getSelectedVideo());
      updateVideoPlayerUi(video);
      updateVideoMediaSession(getSelectedVideo(), video);
    });
    video.addEventListener("pause", () => {
      saveVideoPosition(video);
      queueVideoEvent("pause", getSelectedVideo());
      updateVideoPlayerUi(video);
      updateVideoMediaSession(getSelectedVideo(), video);
    });
    video.addEventListener("volumechange", () => {
      updateVideoPlayerUi(video);
      updateVideoMediaSession(getSelectedVideo(), video);
    });
    video.addEventListener("ended", () => {
      const selected = getSelectedVideo();
      queueVideoEvent("ended", selected, { position: video.duration || video.currentTime || 0, flushNow: true, partIndex: videoState.activeVideoPartIndex });

      const parts = getVideoParts(selected || {});
      if (
        videoState.settings?.autoplayNextPart !== false &&
        parts.length > 1 &&
        Number(
          videoState.activeVideoPartIndex ||
          0
        ) < parts.length - 1
      ) {
        const previousIndex =
          Number(
            videoState
              .activeVideoPartIndex ||
            0
          );

        videoState
          .activeVideoPartIndex +=
            1;

        videoState
          .pendingPartAutoplay =
            true;

        queueVideoEvent(
          "part_autoplay",
          selected,
          {
            status:
              "ended_autoplay",
            fromPartIndex:
              previousIndex,
            toPartIndex:
              videoState
                .activeVideoPartIndex,
          }
        );
        videoState.resume[videoState.selectedId] = {
          time: 0,
          duration: 0,
          partIndex: videoState.activeVideoPartIndex,
          partId: parts[videoState.activeVideoPartIndex]?.id || "",
          updatedAt: Date.now(),
        };
        writeVideoResume();
        videoState.status = `Moving to part ${videoState.activeVideoPartIndex + 1} of ${parts.length}…`;
        renderVideoApp();
        renderVideoSidebarFilters();
        return;
      }

      delete videoState.resume[videoState.selectedId];
      writeVideoResume();
      updateVideoMediaSession(selected, video);
      renderVideoApp();
      renderVideoSidebarFilters();
    });
    updateVideoPlayerUi(video);
    updateVideoMediaSession(getSelectedVideo(), video);
  }
}

function applyVideoPlaybackSettings(
  video = $("brVideoElement")
) {
  if (!video) return;

  video.playbackRate =
    Number(
      videoState.settings?.playbackRate ||
      1
    ) || 1;

  video.controls =
    !!videoState.settings?.nativeControls;

  if (
    videoState.settings?.startMuted === true &&
    video.dataset.brMutedDefaultApplied !== "1"
  ) {
    video.muted = true;
    video.dataset.brMutedDefaultApplied = "1";
  }

  if (
    videoState.settings?.subtitlesDefaultOn === true
  ) {
    const tracks =
      Array.from(video.textTracks || []);

    let selected = false;

    tracks.forEach((track) => {
      const wantedLanguage =
        !videoState.settings?.subtitleLanguage ||
        track.language ===
          videoState.settings.subtitleLanguage;

      const shouldShow =
        !selected &&
        wantedLanguage;

      track.mode =
        shouldShow
          ? "showing"
          : "disabled";

      if (shouldShow) {
        selected = true;
      }
    });

    if (!selected && tracks[0]) {
      tracks[0].mode = "showing";
    }
  }
}
	
function saveVideoPosition(video) {
  if (videoState.settings?.saveProgress === false) {
    return;
  }

  if (!videoState.selectedId || !video || !Number.isFinite(video.currentTime)) return;

  const selected = getSelectedVideo();
  const activePart = getActiveVideoPlaybackItem(selected);

  videoState.resume[videoState.selectedId] = {
    time: Math.max(0, video.currentTime || 0),
    duration: Math.max(video.duration || 0, 0),
    partIndex: Number(videoState.activeVideoPartIndex || 0),
    partId: activePart?.id || "",
    updatedAt: Date.now(),
  };

  writeVideoResume();
}

function restoreSelectedVideoPosition(playAfter = false) {
  if (videoState.settings?.resumeEnabled === false) {
    return;
  }

  const video = $("brVideoElement");
  const saved = videoState.resume[videoState.selectedId];
  if (!video || !saved?.time || video.dataset.resumeApplied === "1") return;

  const selected = getSelectedVideo();
  if (isVideoGroup(selected) && Number(saved.partIndex || 0) !== Number(videoState.activeVideoPartIndex || 0)) return;

  const apply = () => {
    try {
      video.currentTime = Math.max(0, Math.min(Number(saved.time || 0), Math.max(0, Number(video.duration || saved.duration || 0) - 2)));
      video.dataset.resumeApplied = "1";
      if (playAfter) void video.play().catch(() => {});
    } catch {}
  };

  if (video.readyState >= 1) apply();
  else video.addEventListener("loadedmetadata", apply, { once: true });
}

function renderVideoLinkupDraftState() {
  const enabled = !!$("videoLinkupEnabled")?.checked;
  const mode = $("videoLinkupMode")?.value || "parts";
  document.querySelector(".brVideoLinkupFields")?.classList.toggle("is-hidden", !enabled);
  document.querySelector(".brVideoLinkupSeries")?.classList.toggle("is-hidden", mode !== "series");
  document.querySelector(".brVideoLinkupParts")?.classList.toggle("is-hidden", mode !== "parts");
}

async function deleteSelectedVideoFile(
  mode =
    videoState.settings?.defaultDeleteMode ||
    "library"
) {
  const playbackItem =
    getActiveVideoPlaybackItem(
      getSelectedVideo()
    );

  if (!playbackItem?.id) return;

  const label =
    playbackItem.fileName ||
    getVideoTitle(playbackItem);

  const physical =
    mode === "physical";

  const confirmed =
    physical &&
    videoState.settings?.confirmPhysicalDelete === false
      ? true
      : window.confirm(
          physical
            ? `Delete this physical video file from disk?\n\n${label}\n\nThis cannot be undone. Other linked parts and copies stay in the library.`
            : `Remove this video from the BRMedia library only?\n\n${label}\n\nThe physical file stays safely on disk.`
        );

  if (!confirmed) return;

  videoState.status =
    physical
      ? "Deleting physical video file…"
      : "Removing video from library…";

  closeVideoPopup();
  renderVideoApp();

  try {
    const res = await fetch(
      `/video-library/${encodeURIComponent(playbackItem.id)}?mode=${encodeURIComponent(
        physical
          ? "physical"
          : "library"
      )}`,
      {
        method: "DELETE",
      }
    );

    const data =
      await res.json();

    if (!res.ok) {
      throw new Error(
        data?.error ||
        "Could not remove video"
      );
    }

    delete videoState.resume[videoState.selectedId];

    writeVideoResume(videoState.resume);

    videoState.favourites =
      videoState.favourites.filter(
        (id) =>
          id !== videoState.selectedId
      );

    writeVideoSet(
      VIDEO_FAVOURITES_KEY,
      videoState.favourites
    );

    videoState.selectedId = "";
    videoState.activeTab = "overview";

    videoState.status =
      physical
        ? "Physical video file deleted."
        : "Video removed from BRMedia library. Physical file kept.";

    await loadVideoLibrary(true);
  } catch (err) {
    videoState.status =
      `Delete failed: ${err?.message || err}`;
  }

  renderVideoApp();
}

async function saveVideoManualMetadata(id) {
  if (!id) return;

  const current = videoState.items.find((entry) => String(entry.id) === String(id)) || {};
  const nextTitle = $("videoMetaTitle")?.value || "";
  const nextYear = $("videoMetaYear")?.value || "";
  const identityChanged =
    String(current.title || "").trim() !== String(nextTitle || "").trim() ||
    String(current.year || "").trim() !== String(nextYear || "").trim();

  const patch = {
    title: nextTitle,
    year: nextYear,
    genre: $("videoMetaGenre")?.value || "",
    certification: $("videoMetaCertification")?.value || "",
    overview: $("videoMetaOverview")?.value || "",
    linkupEnabled: !!$("videoLinkupEnabled")?.checked,
    linkupMode: $("videoLinkupMode")?.value || "parts",
    linkupTitle: $("videoLinkupTitle")?.value || nextTitle,
    linkupSeason: Number($("videoLinkupSeason")?.value || 1),
    linkupEpisodeCount: Number($("videoLinkupEpisodeCount")?.value || 1),
    linkupEpisode: Number($("videoLinkupEpisode")?.value || 1),
    linkupPartTotal: Number($("videoLinkupPartTotal")?.value || 1),
    linkupPartNumber: Number($("videoLinkupPartNumber")?.value || 1),
    clearRichMetadata: identityChanged,
  };

  videoState.status = "Saving video details…";
  renderVideoApp();

  try {
    const res = await fetch(`/video-library/${encodeURIComponent(id)}/metadata/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Could not save details");
    updateVideoItem(data.item);
    videoState.status = "Video details saved.";
  } catch (err) {
    videoState.status = `Video details failed: ${err?.message || err}`;
  }

  renderVideoApp();
  renderVideoSidebarFilters();
}

function updateVideoItem(item) {
  if (!item?.id) return;

  const rawIndex = videoState.rawItems.findIndex((entry) => String(entry.id) === String(item.id));
  if (rawIndex >= 0) videoState.rawItems[rawIndex] = item;
  else videoState.rawItems = [item, ...videoState.rawItems];

  const previousSelectedId = videoState.selectedId;
  videoState.items = buildVideoDisplayItems(videoState.rawItems);
  const selected = findVideoDisplayItemByAnyId(previousSelectedId || item.id);
  if (selected) videoState.selectedId = selected.id;
}

async function saveVideoPosterUrlFromInput(id) {
  const posterUrl = $("videoPosterUrl")?.value?.trim() || "";
  if (!id || !posterUrl) {
    videoState.status = "Paste a poster URL first.";
    renderVideoApp();
    return;
  }

  videoState.status = "Saving poster URL…";
  renderVideoApp();

  try {
    const res = await fetch(`/video-library/${encodeURIComponent(id)}/poster-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ posterUrl }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Poster URL failed");
    updateVideoItem(data.item);
    videoState.status = "Poster URL saved.";
  } catch (err) {
    videoState.status = `Poster URL failed: ${err?.message || err}`;
  }

  renderVideoApp();
}

async function uploadVideoPosterFromInput(id) {
  const file = $("videoPosterUpload")?.files?.[0];
  if (!id || !file) {
    videoState.status = "Choose a poster image first.";
    renderVideoApp();
    return;
  }

  videoState.status = "Uploading poster…";
  renderVideoApp();

  try {
    const res = await fetch(`/video-library/${encodeURIComponent(id)}/poster-upload?name=${encodeURIComponent(file.name)}`, {
      method: "POST",
      body: file,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Poster upload failed");
    updateVideoItem(data.item);
    videoState.status = "Poster uploaded.";
  } catch (err) {
    videoState.status = `Poster upload failed: ${err?.message || err}`;
  }

  renderVideoApp();
}

async function searchVideoMetadata(id) {
  const item = videoState.items.find((entry) => String(entry.id) === String(id));
  const query = $("videoMetadataQuery")?.value?.trim() || getVideoTitle(item || {});
  if (!query) return;

  videoState.metadataBusy = true;
  videoState.metadataQuery = query;
  videoState.status = "Searching video metadata…";
  renderVideoApp();

  try {
    const res = await fetch("/video-metadata/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, year: item?.year || "" }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Metadata search failed");
    videoState.metadataResults = Array.isArray(data.results) ? data.results : [];
    videoState.status = `${videoState.metadataResults.length} metadata result${videoState.metadataResults.length === 1 ? "" : "s"} found.`;
  } catch (err) {
    videoState.status = `Metadata search failed: ${err?.message || err}`;
  } finally {
    videoState.metadataBusy = false;
    renderVideoApp();
  }
}

async function applyVideoMetadataResult(id, index = 0) {
  const result = videoState.metadataResults[index];
  if (!id || !result) return;

  videoState.status = "Applying metadata result and replacing old cast data…";
  renderVideoApp();

  try {
    const res = await fetch(`/video-library/${encodeURIComponent(id)}/metadata/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...result,
        replaceRichMetadata: true,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Could not apply metadata");
    updateVideoItem(data.item);
    videoState.metadataResults = [];
    videoState.status = "Metadata applied with refreshed cast, ratings and related data.";
  } catch (err) {
    videoState.status = `Apply metadata failed: ${err?.message || err}`;
  }

  renderVideoApp();
  renderVideoSidebarFilters();
}

async function  sendVideoToDevice(id, targetDeviceId = "") {
  const item = videoState.items.find((entry) => String(entry.id) === String(id));
  if (!item) return;

  try {
    if (!targetDeviceId) {
      openVideoSendSheet(id);
      return;
    }

    videoState.sendBusy = true;
    videoState.sendError = "";
    renderVideoApp();

    const target = (videoState.devices || []).find((device) => String(device.deviceId) === String(targetDeviceId));

    const res = await fetch("/devices/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromDeviceId: videoState.deviceId,
        targetDeviceId,
        action: "open_video",
        payload: {
          videoId: item.id,
          title: getVideoTitle(item),
          route: `/video-player?videoId=${encodeURIComponent(item.id)}`,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Send failed");

    videoState.status = `Sent video to ${target?.deviceName || target?.name || "device"}.`;
    videoState.sendSheetOpen = false;
    queueVideoEvent("send_to_device", item, { route: targetDeviceId, flushNow: true });
  } catch (err) {
    videoState.sendError = err?.message || String(err);
    videoState.status = `Send to device failed: ${videoState.sendError}`;
  } finally {
    videoState.sendBusy = false;
  }

  renderVideoApp();
}

function shouldRunVideoAutoMetadataRefresh() {
  if (videoState.settings?.autoMetadataRefresh === false) {
    return false;
  }

  if (!videoState.metadataEnabled || videoState.autoMetadataBusy || videoState.autoMetadataDone) return false;
  if (!Array.isArray(videoState.items) || !videoState.items.length) return false;

  const now = Date.now();
  if (now - Number(videoState.autoMetadataLastRunAt || 0) < 60000) return false;

  return videoState.items.some((item) => {
    const hasCore = !!(item.metadataSource || item.onlineRating || item.tmdbId || item.imdbId);
    const hasRichCast = Array.isArray(item.castDetails) && item.castDetails.some((person) => person?.profileUrl || person?.biography);
    const hasRichRelated =
      (Array.isArray(item.trailers) && item.trailers.length) ||
      (Array.isArray(item.recommendedFilms) && item.recommendedFilms.length) ||
      (Array.isArray(item.similarFilms) && item.similarFilms.length);

    return !hasCore || !hasRichCast || !hasRichRelated;
  });
}

function scheduleVideoAutoMetadataRefresh() {
  if (!shouldRunVideoAutoMetadataRefresh()) return;

  window.setTimeout(() => {
    void runVideoAutoMetadataRefresh();
  }, 1200);
}

async function runVideoAutoMetadataRefreshBatch(limit = 3, manual = true) {
  if (!videoState.metadataEnabled) {
    videoState.metadataControlMessage = "Online metadata keys are not set yet.";
    videoState.status = "TMDb / OMDb keys are needed for metadata refresh.";
    renderVideoApp();
    return null;
  }

  if (videoState.autoMetadataBusy) return null;

  videoState.autoMetadataBusy = true;
  videoState.autoMetadataLastRunAt = Date.now();

  if (manual) {
    videoState.metadataControlOpen = true;
    videoState.metadataControlMessage = `Refreshing next ${limit} film${Number(limit) === 1 ? "" : "s"}…`;
    videoState.status = "Refreshing video metadata…";
    renderVideoApp();
  }

  try {
    const res = await fetch("/video-library/metadata/auto-refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Auto metadata refresh failed");

    if (Array.isArray(data.items) && data.items.length) {
      data.items.forEach(updateVideoItem);
    }

    videoState.autoMetadataDone = !data.hasMore;

    const message = data.attempted
      ? `Updated ${data.updated || 0} of ${data.attempted}. ${data.remaining || 0} still missing/stale.`
      : "No missing metadata found right now.";

    videoState.metadataControlMessage = message;
    videoState.status = `Auto metadata: ${message}`;

    renderVideoApp();
    renderVideoSidebarFilters();

    return data;
  } catch (err) {
    videoState.metadataControlMessage = `Metadata refresh failed: ${err?.message || err}`;
    videoState.status = videoState.metadataControlMessage;
    console.warn("Video auto metadata refresh failed", err);
    renderVideoApp();
    return null;
  } finally {
    videoState.autoMetadataBusy = false;
  }
}

async function runVideoAutoMetadataRefresh() {
  if (!shouldRunVideoAutoMetadataRefresh()) return;

  const data = await runVideoAutoMetadataRefreshBatch(
    Number(
      videoState.settings?.metadataBatchSize ||
      3
    ),
    false
  );

  if (data?.hasMore) {
    window.setTimeout(() => {
      void runVideoAutoMetadataRefresh();
    }, 20000);
  }
}

async function loadVideoLibrary(refresh = false) {
  videoState.loading = true;
  videoState.status = refresh ? "Rescanning videos…" : "Loading videos…";
  renderVideoApp();

  try {
    const query = new URLSearchParams();
    if (refresh) query.set("refresh", "1");
    const res = await fetch(`/video-library?${query.toString()}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Could not load video library");
    videoState.rawItems = Array.isArray(data.items) ? data.items : [];
    videoState.items = buildVideoDisplayItems(videoState.rawItems);
    videoState.metadataEnabled = !!data.metadataEnabled;
    const queryVideoId = readVideoQueryParam("videoId") || videoState.initialVideoId;
    const queryTab = readVideoQueryParam("tab") || videoState.activeTab;

    if (!videoState.initialVideoApplied) {
      videoState.initialVideoApplied = true;
      const queryDisplayItem = findVideoDisplayItemByAnyId(queryVideoId);
      if (queryDisplayItem) {
        videoState.selectedId = queryDisplayItem.id;
        videoState.activeVideoPartIndex = getVideoPartIndexByAnyId(queryDisplayItem, queryVideoId);
        videoState.activeTab = normaliseVideoTab(queryTab);
        setVideoUrlState(videoState.selectedId, videoState.activeTab, true);
      } else {
        videoState.selectedId = "";
        videoState.activeTab = "overview";
        setVideoUrlState("", "overview", true);
      }
    } else if (videoState.selectedId && !findVideoDisplayItemByAnyId(videoState.selectedId)) {
      videoState.selectedId = "";
      videoState.activeTab = "overview";
      setVideoUrlState("", "overview", true);
    }

    const groupedParts = videoState.items.reduce((sum, item) => sum + (isVideoGroup(item) ? getVideoParts(item).length - 1 : 0), 0);
    videoState.status = `${videoState.items.length} film${videoState.items.length === 1 ? "" : "s"} ready${groupedParts ? ` · ${groupedParts} extra parts grouped` : ""}.`;
    scheduleVideoAutoMetadataRefresh();
  } catch (err) {
    videoState.status = `Video load failed: ${err.message || err}`;
  } finally {
    videoState.loading = false;
    renderVideoApp();
    renderVideoSidebarFilters();
  }
}

function findVideoCopyEventItem(
  job = {}
) {
  const possibleIds = [
    job.videoId,
    job.sourceId,
    job.originalVideoId,
    job.itemId,
    job.playableCopyId,
  ]
    .map(
      (value) =>
        String(
          value ||
          ""
        )
    )
    .filter(
      Boolean
    );

  return (
    videoState.items
      .find(
        (item) =>
          possibleIds
            .includes(
              String(
                item.id ||
                ""
              )
            )
      ) ||
    getSelectedVideo()
  );
}

function queueVideoCopyTerminalEvent(
  job = {}
) {
  const jobId =
    String(
      job.id ||
      ""
    );

  const status =
    String(
      job.status ||
      ""
    );

  if (
    !jobId ||
    ![
      "done",
      "error",
      "cancelled",
    ]
      .includes(
        status
      )
  ) {
    return;
  }

  if (
    reportedVideoCopyTerminalJobs
      .has(
        jobId
      )
  ) {
    return;
  }

  reportedVideoCopyTerminalJobs
    .add(
      jobId
    );

  queueVideoEvent(
    `mp4_copy_${status}`,
    findVideoCopyEventItem(
      job
    ),
    {
      flushNow:
        true,
      status,
      jobId,
      entityType:
        "video_copy_job",
      entityId:
        jobId,
      error:
        job.error ||
        "",
    }
  );
}

async function loadVideoCopyJobs(reRender = false) {
  try {
    const res = await fetch("/video-browser-copy-jobs", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Could not load copy jobs");
    videoState.copyJobs = Array.isArray(data.jobs) ? data.jobs : [];
  } catch {
    videoState.copyJobs = [];
  }

  if (reRender) renderVideoApp();
  return videoState.copyJobs;
}

async function startVideoBrowserCopy(id) {
  if (!id) return;

  videoState.status = "Starting MP4 browser copy…";
  renderVideoApp();

  try {
    const res = await fetch(
      `/video-library/${encodeURIComponent(id)}/browser-copy`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          preset:
            videoState.settings?.browserCopyPreset ||
            "fast",
          crf:
            Number(
              videoState.settings?.browserCopyCrf ||
              23
            ),
          audioBitrate:
            videoState.settings?.browserCopyAudioBitrate ||
            "192k",
        }),
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Could not start MP4 copy");

    if (data?.job) {
      videoState.copyJobs = [data.job, ...videoState.copyJobs.filter((job) => job.id !== data.job.id)];
      queueVideoEvent("mp4_copy_start", videoState.items.find((item) => String(item.id) === String(id)), { flushNow: true });
      startVideoCopyPolling(data.job.id);
    }

    videoState.status = "MP4 browser copy started.";
    renderVideoApp();
  } catch (err) {
    queueVideoEvent(
      "mp4_copy_error",
      videoState.items
        .find(
          (item) =>
            String(
              item.id
            ) ===
            String(
              id
            )
        ),
      {
        flushNow:
          true,
        status:
          "start_failed",
        error:
          String(
            err?.message ||
            err ||
            "MP4 copy failed"
          ),
      }
    );

    videoState.status =
      `MP4 copy failed: ${err?.message || err}`;

    renderVideoApp();
  }
}

async function controlVideoCopyJob(jobId, action) {
  if (!jobId || !action) return;

  try {
    const res = await fetch(`/video-browser-copy-jobs/${encodeURIComponent(jobId)}/control`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!res.ok || data?.ok === false) throw new Error(data?.error || "Could not control MP4 copy job");

    if (
      data.job
    ) {
      videoState.copyJobs = [
        data.job,
        ...videoState.copyJobs
          .filter(
            (job) =>
              job.id !==
              data.job.id
          ),
      ];

      queueVideoCopyTerminalEvent(
        data.job
      );

      if (
        [
          "pause",
          "resume",
        ]
          .includes(
            action
          )
      ) {
        startVideoCopyPolling(
          jobId
        );
      }
    }

    videoState.status = action === "cancel" ? "MP4 copy stopped." : action === "pause" ? "MP4 copy paused." : "MP4 copy resumed.";
  } catch (err) {
    videoState.status = `MP4 control failed: ${err?.message || err}`;
  }

  renderVideoApp();
}

function startVideoCopyPolling(jobId) {
  window.clearInterval(videoCopyPollTimer);
  videoCopyPollTimer = window.setInterval(async () => {
    try {
      const res = await fetch(`/video-browser-copy-jobs/${encodeURIComponent(jobId)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Copy job not found");

      if (data?.job) {
        videoState.copyJobs = [data.job, ...videoState.copyJobs.filter((job) => job.id !== data.job.id)];

        if (
          [
            "done",
            "error",
            "cancelled",
          ]
            .includes(
              data.job.status
            )
        ) {
          queueVideoCopyTerminalEvent(
            data.job
          );

          window.clearInterval(
            videoCopyPollTimer
          );

          await loadVideoLibrary(true);

          if (
            data.job.status === "done" &&
            videoState.settings?.autoOpenBrowserCopy === true &&
            data.job.openUrl
          ) {
            window.location.href = data.job.openUrl;
          }

          return;
        }

        renderVideoApp();
      }
    } catch {
      window.clearInterval(videoCopyPollTimer);
    }
  }, 1800);
}

async function refreshVideoMetadata(id, rich = false) {
  if (!id) return;

  videoState.status = rich
    ? "Force-refreshing cast, related images and rich metadata…"
    : "Refreshing poster, ratings and metadata…";

  renderVideoApp();

  try {
    const res = await fetch(
      `/video-library/${encodeURIComponent(id)}/metadata?refresh=1${rich ? "&rich=1" : ""}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rich }),
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Metadata refresh failed");
    const index = videoState.items.findIndex((item) => String(item.id) === String(id));
    if (index >= 0 && data.item) videoState.items[index] = data.item;
    videoState.status = data?.metadata?.matched ? `Metadata matched via ${data.metadata.source}.` : "Metadata scan finished — no online match yet.";
  } catch (err) {
    videoState.status = `Metadata failed: ${err.message || err}`;
  } finally {
    renderVideoApp();
  }
}

function syncTopMenuDockState() {
  if (!btnTopSettings) return;
  const topbar = document.querySelector(".topbar");
  if (!topbar) return;
  const rect = topbar.getBoundingClientRect();
  const shouldFloat = rect.top < 18;
  btnTopSettings.classList.toggle("isFloating", shouldFloat && !document.body.classList.contains("sidebarOpen"));
  if (btnSidebarCloseFloating) btnSidebarCloseFloating.classList.toggle("hidden", !document.body.classList.contains("sidebarOpen"));
}

function openSidebarMenu() {
  sidebarScrollLock.y = window.scrollY || window.pageYOffset || 0;
  document.documentElement.classList.add("sidebarLocked");
  document.body.classList.add("sidebarOpen");
  document.body.style.position = "fixed";
  document.body.style.top = `-${sidebarScrollLock.y}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
  sidebarBackdrop?.classList.remove("hidden");
  sidebarMenu?.classList.remove("hidden");
  syncTopMenuDockState();
}

function closeSidebarMenu() {
  const restoreY = Math.abs(parseInt(document.body.style.top || "0", 10)) || sidebarScrollLock.y || 0;
  sidebarBackdrop?.classList.add("hidden");
  sidebarMenu?.classList.add("hidden");
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

function moduleAwareSettingsRoute(route) {
  if (route !== "/settings") return route;
  return "/settings?module=video";
}

function goToRoute(route) {
  const targetRoute = moduleAwareSettingsRoute(route);
  if (!targetRoute) return;
  closeSidebarMenu();
  window.location.href = targetRoute;
}

btnTopSettings?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  toggleSidebarMenu();
});

btnSidebarCloseFloating?.addEventListener("click", closeSidebarMenu);
sidebarBackdrop?.addEventListener("click", closeSidebarMenu);

btnTopSearch?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  closeSidebarMenu();
  window.scrollTo({ top: 0, behavior: "smooth" });
  setTimeout(() => $("videoSearchInput")?.focus(), 120);
});

sidebarNavButtons.forEach((button) => {
  button.addEventListener("click", () => goToRoute(button.dataset.route || "/"));
});

sidebarModuleButtons.forEach((button) => {
  button.addEventListener("click", () => goToRoute(button.dataset.route || "/player"));
});

window.addEventListener("scroll", syncTopMenuDockState, { passive: true });
window.addEventListener("resize", syncTopMenuDockState);
window.addEventListener("pagehide", flushVideoEventsNow);
window.addEventListener("beforeunload", flushVideoEventsNow);
window.addEventListener("popstate", () => {
  const videoId = readVideoQueryParam("videoId");
  const startItem = findVideoDisplayItemByAnyId(videoId);
  videoState.selectedId = startItem ? startItem.id : "";
  videoState.activeVideoPartIndex = startItem ? getVideoPartIndexByAnyId(startItem, videoId) : 0;
  videoState.activeTab = normaliseVideoTab(readVideoQueryParam("tab") || "overview");
  renderVideoApp();
});

window.addEventListener("DOMContentLoaded", () => {
  closeSidebarMenu();
  syncTopMenuDockState();
  startBrIconHydrator();
  startVideoSleepTimerTicker();
  renderVideoApp();
  renderVideoSidebarFilters();
  void loadVideoLibrary(false);
});