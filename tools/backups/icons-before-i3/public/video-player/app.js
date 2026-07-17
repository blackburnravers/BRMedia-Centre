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

const moduleLibraryPickerState = {
  target: "video-player",
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

  "circle-info": "circle-info",
  "circle-question": "circle-question",
  "triangle-exclamation": "triangle-exclamation",

  // BRMedia I1 shared icon aliases
  "file-export": "file-export",
  "chart-line": "chart-column",
  "circle-check": "circle-check",
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

function getInitialVideoIdFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    return String(params.get("videoId") || params.get("id") || "").trim();
  } catch {
    return "";
  }
}

function hydrateInitialVideoFromUrl() {
  const id = getInitialVideoIdFromUrl();
  if (id && findVideoById(id)) openVideoById(id);
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

moduleTrackPanel?.classList.add("hidden");
document.body.classList.add("moduleSearchAllowed", "moduleVideoMode", "moduleToolLive");

if (moduleEyebrow) moduleEyebrow.textContent = "BRMedia Video Player";
if (moduleTitle) moduleTitle.textContent = "Video Player";
if (moduleSubtitle) moduleSubtitle.textContent = "Poster-wall streaming from C:\\Videos with resume, subtitles and audio/dub controls.";
if (moduleComingSoonBody) moduleComingSoonBody.textContent = "Video Player scans your C:\\Videos folder and opens videos in a BRMedia theatre view.";
if (moduleStatusTitle) moduleStatusTitle.textContent = "Open video";
if (moduleStatusIcon) {
  moduleStatusIcon.innerHTML = '<i class="fa-solid fa-film"></i>';
  hydrateBrIcons(moduleStatusIcon);
}
if (moduleFooterCopy) moduleFooterCopy.textContent = "© The Blackburn Ravers • DJ NJ & Upalnite " + new Date().getFullYear();

document.title = "Video Player • BRMedia";
videoPanel?.classList.remove("hidden");
videoSidebarNav?.classList.remove("hidden");

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

showVideoTab("browse");
renderVideoTimerStatus();

if (videoState.timerEndAt) {
  window.clearInterval(videoState.timerInterval);
  videoState.timerInterval = window.setInterval(tickVideoTimer, 1000);
}

void fetchVideoLibrary(false)
  .then(() => hydrateInitialVideoFromUrl())
  .catch((err) => {
    console.warn("Video library load failed", err);
    setVideoStatus(err?.message || "Could not load C:\\Videos", "error");
  });

btnVideoRefresh?.addEventListener("click", () => void fetchVideoLibrary(true));
btnVideoMatchMissing?.addEventListener("click", () => void fetchVideoLibrary(true, true));
btnVideoMatchSelected?.addEventListener("click", () => void refreshSelectedVideoMetadata(true));

btnVideoOpenSpotlight?.addEventListener("click", () => {
  const id = videoState.spotlightId || videoState.items[0]?.id || "";
  if (id) openVideoById(id);
});

videoSearchInput?.addEventListener("input", () => {
  videoState.query = videoSearchInput.value || "";
  renderVideoWall();
});

videoSortSelect?.addEventListener("change", () => {
  videoState.sort = videoSortSelect.value || "title";
  renderVideoWall();
});

videoModeTabs.forEach((btn) => {
  btn.addEventListener("click", () => showVideoTab(btn.getAttribute("data-video-tab") || "browse"));
});

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
  if (videoState.selected) {
    saveVideoResume(videoState.selected.id, brVideoElement.currentTime, brVideoElement.duration);
  }
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