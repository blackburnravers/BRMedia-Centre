const $ = (id) => document.getElementById(id);

const moduleSearchBtn = document.querySelector(".moduleSearchBtn");
const btnModuleMenu = $("btnModuleMenu");
const moduleSidebar = $("moduleSidebar");
const moduleSidebarBackdrop = $("moduleSidebarBackdrop");
const btnModuleSidebarCloseFloating = $("btnModuleSidebarCloseFloating");
const statsRoot = document.querySelector(".settingsHeroShell");

const moduleSidebarScrollLock = { y: 0 };

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
  "chart-pie": "chart-pie",
  "chart-column": "chart-column",
  "chart-line": "chart-line",
  "chart-simple": "chart-simple",
  database: "database",
  folder: "folder",
  "folder-open": "folder-open",
  cloud: "cloud",
  "cloud-arrow-down": "cloud-arrow-down",
  headphones: "headphones",
  clock: "clock",
  "clock-rotate-left": "clock-rotate-left",
  trophy: "trophy",
  waveform: "waveform",
  star: "star",
  list: "list",
  "list-check": "list-check",
  "circle-play": "circle-play",
  "circle-check": "circle-check",
  "triangle-exclamation": "triangle-exclamation",
  flag: "flag",
  compactdisc: "compact-disc",
  gauge: "gauge-high",
  harddrive: "hard-drive",
  image: "image",
  subtitles: "closed-captioning",
  bolt: "bolt",
  fire: "fire",
  broom: "broom",
  "file-arrow-down": "file-arrow-down",
  clipboard: "clipboard",
magnet: "magnet",
plug: "plug",
"record-vinyl": "record-vinyl",
  "shield-check": "shield-check",
  "folder-open": "folder-open",
};

const STATS_VIEWS = [
  { key: "overview", title: "Overview", icon: "chart-pie", desc: "Headline cards, key charts and quick health checks." },
  { key: "activity", title: "Activity Log", icon: "clock-rotate-left", desc: "Permanent server-side event history across Player, Video, profiles, uploads, torrents and BRMedia jobs." },
  { key: "audio", title: "Audio Stats", icon: "music", desc: "Brands, categories, artists, albums, formats and mix lengths." },
  { key: "video", title: "Video Stats", icon: "film", desc: "Formats, posters, metadata, subtitles, ratings and MP4 readiness." },
{ key: "torrents", title: "Torrents", icon: "magnet", desc: "qBittorrent queue, speeds, seeds, seeding, completed files and BRMedia handoff state." },
{ key: "dj", title: "DJ Mixer", icon: "record-vinyl", desc: "Deck loading, recordings, cue/grid prep, FX and browser-mixer activity." },
{ key: "library", title: "Library + Storage", icon: "database", desc: "Storage, sources, cloud/import split, largest files and duplicate clues." },
  { key: "modules", title: "Module Stats", icon: "sliders", desc: "Player, Video, Converter, Mastering, Tagger, Settings and server activity." },
  { key: "playback", title: "Playback", icon: "headphones", desc: "Resume memory, completed items, queue, favourites and playlists." },
  { key: "technical", title: "Technical", icon: "waveform", desc: "Bitrates, sample rates, BPM, years and duration buckets." },
  { key: "flags", title: "Flags / Countries", icon: "flag", desc: "Country stats using BRMedia tags and flag icons." },
  { key: "health", title: "Library Health", icon: "circle-check", desc: "Missing metadata, artwork, posters, subtitles, browser copies and tags." },
  { key: "reports", title: "Reports / Export", icon: "file-arrow-down", desc: "Save snapshots, compare library changes and export Stats as JSON/CSV." },
];

const STATS_SNAPSHOT_KEY = "brmedia_stats_snapshots_v1";

const brIconSvgCache = new Map();
let brIconHydrationQueue = [];
let brIconHydrationTimer = null;

const statsState = {
  loading: true,
  error: "",
  lastUpdated: 0,
  activeView: readStatsSavedView(),
  data: {
    library: [],
    videos: [],
    customTags: {},
    runtime: {},
    cloudLinked: [],
    copyJobs: [],
    converterJobs: [],
    masteringJobs: [],
    torrentState: {},
    eventSummary: {},
    eventStatus: {},
    events: [],
    local: {},
  },
};

function escapeHtml(value = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function iconHtml(name) {
  return `<i class="fa-solid fa-${escapeHtml(name)}"></i>`;
}

function readStatsSavedView() {
  try {
    const queryView = new URLSearchParams(window.location.search).get("view") || "";
    const savedView = queryView || localStorage.getItem("brmedia_stats_active_view_v1") || "overview";
    return STATS_VIEWS.some((view) => view.key === savedView) ? savedView : "overview";
  } catch {
    return "overview";
  }
}

function readJsonLocalStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

async function fetchJson(path, fallback) {
  try {
    const res = await fetch(path, { cache: "no-store" });
    const data = await res.json().catch(() => fallback);
    if (!res.ok) return fallback;
    return data;
  } catch {
    return fallback;
  }
}

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
  const nodes = root?.matches?.("i[class*='fa-']") ? [root] : Array.from(root?.querySelectorAll?.("i[class*='fa-']") || []);
  if (!nodes.length) return;
  brIconHydrationQueue.push(...nodes);
  if (brIconHydrationTimer) return;
  const runBatch = () => {
    const batch = brIconHydrationQueue.splice(0, 8);
    batch.forEach((node) => { void hydrateBrIcon(node); });
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

function normaliseText(value = "") {
  return String(value || "").trim();
}

function titleOf(item = {}) {
  return normaliseText(item.title || item.name || item.fileName || item.filename || item.locator || "Untitled").split(/[\\/]/).pop();
}

function fileNameOf(item = {}) {
  return normaliseText(item.fileName || item.filename || item.locator || item.path || item.title || "").split(/[\\/]/).pop();
}

function getItemTags(item = {}) {
  const direct = item.brmediaTags || item.brmedia || {};
  const store = statsState.data.customTags || {};
  const idTags = store[item.id] || store[item.trackId] || {};
  const locatorTags = store[item.locator] || {};
  return { ...direct, ...locatorTags, ...idTags };
}

function sourceKey(item = {}) {
  const raw = [item.source, item.sourceType, item.cloudProvider, item.importedFrom, item.locator].join(" ").toLowerCase();
  if (raw.includes("dropbox")) return "Dropbox";
  if (raw.includes("google") || raw.includes("gdrive")) return "Google Drive";
  if (raw.includes("upload")) return "Upload";
  if (raw.includes("link")) return "Direct URL";
  if (raw.includes("local")) return "Local";
  return "Other";
}

function extensionOf(item = {}) {
  const raw = String(fileNameOf(item) || item.locator || item.title || "").toLowerCase();
  const ext = raw.split("?")[0].split("#")[0].split(".").pop();
  return ext && ext.length <= 6 ? ext : "unknown";
}

function brandOf(item = {}) {
  const tags = getItemTags(item);
  const text = [tags.primaryBrand, item.primaryBrand, tags.artist, item.artist, tags.albumArtist, item.albumArtist, item.title].join(" ").toLowerCase();
  if (text.includes("blackburn ravers") || text.includes("brmedia")) return "Blackburn Ravers";
  if (text.includes("dj nj") && text.includes("upalnite")) return "DJ NJ & Upalnite";
  if (text.includes("dj nj")) return "DJ NJ";
  if (text.includes("upalnite")) return "Upalnite";
  return "Other";
}

function categoryOf(item = {}) {
  const tags = getItemTags(item);
  return normaliseText(tags.category || item.brmediaCategory || item.category || item.album || "Unsorted");
}

function genreOf(item = {}) {
  return normaliseText(item.genre || getItemTags(item).genre || "Unsorted");
}

function countryOf(item = {}) {
  const tags = getItemTags(item);
  return normaliseText(tags.country || item.country || "Unknown");
}

function countryCode(value = "") {
  const text = String(value || "").trim().toLowerCase();
  const map = {
    uk: "gb", gb: "gb", britain: "gb", british: "gb", england: "gb-eng", scotland: "gb-sct", wales: "gb-wls", "united kingdom": "gb",
    usa: "us", us: "us", america: "us", "united states": "us",
    ireland: "ie", eire: "ie", germany: "de", france: "fr", italy: "it", spain: "es", netherlands: "nl", holland: "nl",
    australia: "au", canada: "ca", japan: "jp", sweden: "se", norway: "no", finland: "fi", denmark: "dk",
  };
  return map[text] || (/^[a-z]{2}$/.test(text) ? text : "");
}

function numberFormat(value = 0) {
  return new Intl.NumberFormat("en-GB").format(Number(value || 0));
}

function formatBytes(bytes = 0) {
  const size = Number(bytes || 0);
  if (!size) return "0 MB";
  if (size >= 1024 ** 4) return `${(size / 1024 ** 4).toFixed(2)} TB`;
  if (size >= 1024 ** 3) return `${(size / 1024 ** 3).toFixed(2)} GB`;
  if (size >= 1024 ** 2) return `${(size / 1024 ** 2).toFixed(1)} MB`;
  return `${(size / 1024).toFixed(1)} KB`;
}

function getTorrentItems() {
  const payload = statsState.data.torrentState || {};
  const items = payload?.items || payload?.queue || payload?.state?.items || [];
  return Array.isArray(items) ? items : [];
}

function getTorrentStatsSummary(items = getTorrentItems()) {
  const normalisedItems = items.map((item) => {
    const statusText = String(item.status || item.state || "").toLowerCase();
    const progress = Number(item.progress || 0);
    const sizeBytes = Number(item.sizeBytes || item.size || item.totalSize || 0);
    const completedBytes = Number(item.completedBytes || item.completed || Math.round(sizeBytes * (progress / 100)) || 0);
    const ratio = Number(item.ratio || item.shareRatio || 0);
    const eta = Number(item.etaSeconds || item.eta || 0);
    return { ...item, statusText, progress, sizeBytes, completedBytes, ratio, eta };
  });

  const downloading = normalisedItems.filter((item) => item.statusText.includes("download"));
  const seeding = normalisedItems.filter((item) => item.statusText.includes("seed"));
  const paused = normalisedItems.filter((item) => item.statusText.includes("paused") || item.statusText.includes("stopped"));
  const stalled = normalisedItems.filter((item) => item.statusText.includes("stalled"));
  const errored = normalisedItems.filter((item) => item.statusText.includes("error") || item.statusText.includes("missing"));
  const complete = normalisedItems.filter((item) => item.progress >= 100);
  const active = normalisedItems.filter((item) => item.statusText.includes("download") || item.statusText.includes("seed"));
  const totalBytes = sumBy(normalisedItems, (item) => item.sizeBytes);
  const completedBytes = sumBy(normalisedItems, (item) => item.completedBytes);
  const uploadedBytes = sumBy(normalisedItems, (item) => item.uploadedBytes || item.uploaded || 0);
  const downloadSpeedKb = sumBy(normalisedItems, (item) => item.downloadSpeedKb || item.dlspeedKb || 0);
  const uploadSpeedKb = sumBy(normalisedItems, (item) => item.uploadSpeedKb || item.upspeedKb || 0);
  const averageRatio = normalisedItems.length ? sumBy(normalisedItems, (item) => item.ratio) / normalisedItems.length : 0;

  return {
    items: normalisedItems,
    active,
    downloading,
    seeding,
    paused,
    stalled,
    errored,
    complete,
    totalBytes,
    completedBytes,
    uploadedBytes,
    remainingBytes: Math.max(0, totalBytes - completedBytes),
    downloadSpeedKb,
    uploadSpeedKb,
    averageRatio,
    seeds: sumBy(normalisedItems, (item) => item.seeds || item.numSeeds || 0),
    leeches: sumBy(normalisedItems, (item) => item.leeches || item.numLeeches || 0),
  };
}

function formatSpeedKb(kb = 0) {
  const value = Number(kb || 0);
  if (value >= 1024) return `${(value / 1024).toFixed(1)} MB/s`;
  return `${Math.round(value)} KB/s`;
}

function formatHours(seconds = 0) {
  const hours = Number(seconds || 0) / 3600;
  if (hours >= 100) return `${Math.round(hours)} hrs`;
  if (hours >= 10) return `${hours.toFixed(1)} hrs`;
  return `${hours.toFixed(2)} hrs`;
}

function formatDate(value) {
  const time = Number(value || 0);
  if (!time) return "Never";
  try { return new Date(time).toLocaleString(); } catch { return "Recently"; }
}

function groupCount(items, getter) {
  const map = new Map();
  items.forEach((item) => {
    const key = normaliseText(getter(item)) || "Unknown";
    map.set(key, (map.get(key) || 0) + 1);
  });
  return Array.from(map.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

function sumBy(items, getter) {
  return items.reduce((sum, item) => sum + Number(getter(item) || 0), 0);
}

function percent(value, total) {
  const t = Number(total || 0);
  if (!t) return 0;
  return Math.max(0, Math.min(100, (Number(value || 0) / t) * 100));
}

function flagForLabel(label = "") {
  const code = countryCode(label);
  return code ? `<span class="fi fi-${escapeHtml(code)} statsFlag"></span>` : "";
}

function getRuntimeProgress() {
  const runtime = statsState.data.runtime || {};
  const progress = runtime.trackProgress && typeof runtime.trackProgress === "object" ? runtime.trackProgress : {};
  return Object.entries(progress).map(([id, item]) => ({ id, ...(item || {}) }));
}

function readLocalStats() {
  const favourites = readJsonLocalStorage("brmedia_favourites_v2", []);
  const playlists = readJsonLocalStorage("brmedia_playlists_v1", []);
  const bookmarks = readJsonLocalStorage("brmedia_bookmarks", {});
  const recents = readJsonLocalStorage("brmedia_recents_v1", []);
  const sourceLinks = readJsonLocalStorage("brmedia_url_source_links_v1", []);
  const savedQueue = readJsonLocalStorage("brmedia_saved_queue_manual", []);
  const djRecordings = readJsonLocalStorage("brmedia.djMixer.recordings.v1", []);
  const djTrackPrep = readJsonLocalStorage("brmedia.djMixer.trackPrep.v1", {});
  const djTrackGrids = readJsonLocalStorage("brmedia.djMixer.trackGrids.v1", {});
  const djTrackCues = readJsonLocalStorage("brmedia.djMixer.trackCues.v1", {});
  const djTrackAnalysis = readJsonLocalStorage("brmedia.djMixer.trackAnalysis.v1", {});
  const djRecordingsList = Array.isArray(djRecordings) ? djRecordings : [];
  const djCueEntries = Object.values(djTrackCues || {});
  const djRecordingSeconds = djRecordingsList.reduce((sum, item) => sum + Number(item?.durationSeconds || 0), 0);
  const djHotCueTracks = djCueEntries.filter((entry) => Object.keys(entry?.hot || {}).length > 0).length;
  const djMemoryCueTracks = djCueEntries.filter((entry) => Array.isArray(entry?.memory) && entry.memory.length > 0).length;

  return {
    favouritesCount: Array.isArray(favourites) ? favourites.length : Object.keys(favourites || {}).length,
    playlistsCount: Array.isArray(playlists) ? playlists.length : Object.keys(playlists || {}).length,
    bookmarksCount: Object.values(bookmarks || {}).reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0),
    recentsCount: Array.isArray(recents) ? recents.length : Object.keys(recents || {}).length,
    sourceLinksCount: Array.isArray(sourceLinks) ? sourceLinks.length : Object.keys(sourceLinks || {}).length,
    savedQueueCount: Array.isArray(savedQueue) ? savedQueue.length : 0,
    djRecordingsCount: djRecordingsList.length,
    djRecordingSeconds,
    djPreparedTracks: Object.keys(djTrackPrep || {}).length,
    djGridTracks: Object.keys(djTrackGrids || {}).length,
    djAnalysedTracks: Object.keys(djTrackAnalysis || {}).length,
    djHotCueTracks,
    djMemoryCueTracks,
  };
}

function isVideoBrowserFriendly(item = {}) {
  const mime = String(item.mimeType || "").toLowerCase();
  const ext = extensionOf(item);
  return mime.includes("video/mp4") || mime.includes("video/webm") || ["mp4", "m4v", "webm"].includes(ext);
}

function durationSecondsOf(item = {}) {
  const durationSeconds = Number(item.durationSeconds || 0);
  if (Number.isFinite(durationSeconds) && durationSeconds > 0) return durationSeconds;

  const durationMs = Number(item.durationMs || 0);
  if (Number.isFinite(durationMs) && durationMs > 0) return durationMs / 1000;

  const duration = Number(item.duration || 0);
  if (!Number.isFinite(duration) || duration <= 0) return 0;

  return duration > 172800 ? duration / 1000 : duration;
}

function getDurationBucket(item = {}) {
  const duration = durationSecondsOf(item);
  if (!duration) return "Unknown";
  if (duration < 180) return "Under 3 mins";
  if (duration < 600) return "3–10 mins";
  if (duration < 1800) return "10–30 mins";
  if (duration < 3600) return "30–60 mins";
  if (duration < 7200) return "1–2 hours";
  return "2+ hours";
}

function getSizeBucket(item = {}) {
  const size = Number(item.sizeBytes || item.size || 0);
  if (!size) return "Unknown";
  const mb = size / 1024 / 1024;
  if (mb < 10) return "Under 10 MB";
  if (mb < 50) return "10–50 MB";
  if (mb < 150) return "50–150 MB";
  if (mb < 500) return "150–500 MB";
  if (mb < 1024) return "500 MB–1 GB";
  return "1 GB+";
}

function getDateBucket(item = {}) {
  const raw = Number(item.addedAt || item.createdAt || item.modifiedAt || item.updatedAt || 0);
  if (!raw) return "Unknown";
  const ageDays = (Date.now() - raw) / 86400000;
  if (ageDays <= 1) return "Today";
  if (ageDays <= 7) return "This week";
  if (ageDays <= 30) return "This month";
  if (ageDays <= 90) return "Last 3 months";
  if (ageDays <= 365) return "This year";
  return "Older";
}

function getDuplicateCandidates(items = []) {
  const buckets = new Map();
  items.forEach((item) => {
    const title = String(titleOf(item)).toLowerCase().replace(/\.[a-z0-9]{2,5}$/i, "").replace(/[^a-z0-9]+/g, " ").trim();
    const duration = Math.round(durationSecondsOf(item));
    const key = `${title}:${duration || "no-duration"}`;
    if (!title) return;
    const list = buckets.get(key) || [];
    list.push(item);
    buckets.set(key, list);
  });
  return Array.from(buckets.values()).filter((list) => list.length > 1);
}

function buildModuleStatsRows(data = {}) {
  const torrentSummary = data.torrentSummary || getTorrentStatsSummary([]);
  const converterDone = data.converterJobs.filter((job) => job.status === "done").length;
  const masteringDone = data.masteringJobs.filter((job) => job.status === "done").length;
  const videoCopiesDone = data.copyJobs.filter((job) => job.status === "done").length;

  return [
    { label: "Player", value: data.audio.length, desc: `${numberFormat(data.localStats.favouritesCount)} favourites · ${numberFormat(data.localStats.playlistsCount)} playlists`, icon: "music" },
    { label: "Video", value: data.videos.length, desc: `${numberFormat(data.needsMp4.length)} need MP4 · ${numberFormat(data.videosWithMetadata.length)} matched`, icon: "film" },
{ label: "Torrents", value: torrentSummary.items.length, desc: `${numberFormat(torrentSummary.downloading.length)} downloading · ${numberFormat(torrentSummary.complete.length)} complete`, icon: "magnet" },
{ label: "DJ Mixer", value: data.localStats.djPreparedTracks + data.localStats.djRecordingsCount, desc: `${numberFormat(data.localStats.djPreparedTracks)} prepared · ${numberFormat(data.localStats.djRecordingsCount)} recordings`, icon: "record-vinyl" },
{ label: "Mastering", value: data.masteringJobs.length, desc: `${numberFormat(masteringDone)} done · ${numberFormat(data.masteringJobs.filter((job) => job.status === "error").length)} errors`, icon: "sliders" },
    { label: "Tagger", value: data.customTagCount || data.tagged.length, desc: `${numberFormat(data.tagged.length)} audio items tagged`, icon: "tags" },
    { label: "Converter", value: data.converterJobs.length, desc: `${numberFormat(converterDone)} done · ${numberFormat(data.converterJobs.filter((job) => job.status === "error").length)} errors`, icon: "arrows-rotate" },
    { label: "Stats", value: STATS_VIEWS.length, desc: "Stats sections currently available", icon: "chart-pie" },
    { label: "Server Settings", value: data.duplicates.length, desc: "Possible duplicate groups to review", icon: "server" },
    { label: "Settings", value: data.copyJobs.length, desc: `${numberFormat(videoCopiesDone)} video browser copies done`, icon: "gear" },
  ];
}

function buildStatsModel() {
  const audio = Array.isArray(statsState.data.library) ? statsState.data.library : [];
  const videos = Array.isArray(statsState.data.videos) ? statsState.data.videos : [];
  const runtime = statsState.data.runtime || {};
  const progress = getRuntimeProgress();
  const completed = progress.filter((item) => item.complete || Number(item.percent || 0) >= 95);
  const inProgress = progress.filter((item) => Number(item.percent || 0) > 0 && Number(item.percent || 0) < 95);
  const audioBytes = sumBy(audio, (item) => item.sizeBytes || item.size || 0);
  const videoBytes = sumBy(videos, (item) => item.sizeBytes || item.size || 0);
  const audioSeconds = sumBy(audio, durationSecondsOf);
  const videoSeconds = sumBy(videos, durationSecondsOf);
  const longMixes = audio.filter((item) => durationSecondsOf(item) >= 600);
  const shortAudio = audio.filter((item) => durationSecondsOf(item) > 0 && durationSecondsOf(item) < 600);
  const artwork = audio.filter((item) => item.hasArtwork || item.hasPicture || getItemTags(item).artworkDataUrl);
  const tagged = audio.filter((item) => Object.keys(getItemTags(item)).length > 0);
  const videosWithMetadata = videos.filter((item) => item.metadataSource || item.imdbId || item.tmdbId);
  const videosWithPoster = videos.filter((item) => item.hasPoster || item.posterUrl || item.posterPath || item.customPosterUrl);
  const videosWithSubtitles = videos.filter((item) => Array.isArray(item.subtitles) && item.subtitles.length);
  const videosWithRatings = videos.filter((item) => item.imdbRating || item.rottenTomatoesRating || item.metacriticRating || item.onlineRating);
  const needsMp4 = videos.filter((item) => !isVideoBrowserFriendly(item));
  const bpmValues = audio.map((item) => Number(item.bpm || getItemTags(item).bpm || 0)).filter((value) => Number.isFinite(value) && value > 0);
  const avgBpm = bpmValues.length ? Math.round(bpmValues.reduce((sum, value) => sum + value, 0) / bpmValues.length) : 0;
  const localStats = readLocalStats();
  const duplicates = getDuplicateCandidates(audio);
  const copyJobs = Array.isArray(statsState.data.copyJobs) ? statsState.data.copyJobs : [];
  const converterJobs = Array.isArray(statsState.data.converterJobs) ? statsState.data.converterJobs : [];
  const masteringJobs = Array.isArray(statsState.data.masteringJobs) ? statsState.data.masteringJobs : [];
  const torrentSummary = getTorrentStatsSummary();
  const customTagCount = Object.keys(statsState.data.customTags || {}).length;

  const moduleRows = buildModuleStatsRows({
    audio,
    videos,
    copyJobs,
    converterJobs,
    masteringJobs,
    customTagCount,
    localStats,
    torrentSummary,
    tagged,
    needsMp4,
    videosWithMetadata,
    duplicates,
  });

  return {
    audio, videos, runtime, progress, completed, inProgress, audioBytes, videoBytes,
    totalBytes: audioBytes + videoBytes,
    audioSeconds, videoSeconds, totalSeconds: audioSeconds + videoSeconds,
    longMixes, shortAudio, artwork, tagged, videosWithMetadata, videosWithPoster,
    videosWithSubtitles, videosWithRatings, needsMp4, avgBpm, localStats, duplicates,
    copyJobs, converterJobs, masteringJobs, torrentSummary, customTagCount, moduleRows,
    groups: {
      source: groupCount(audio, sourceKey),
      videoSource: groupCount(videos, sourceKey),
      audioFormat: groupCount(audio, extensionOf),
      videoFormat: groupCount(videos, extensionOf),
      brand: groupCount(audio, brandOf),
      category: groupCount(audio, categoryOf),
      genre: groupCount(audio, genreOf),
      country: groupCount(audio, countryOf),
      videoGenre: groupCount(videos, (item) => item.genre || "Unsorted"),
      sampleRate: groupCount(audio, (item) => item.sampleRate ? `${Math.round(Number(item.sampleRate) / 1000)} kHz` : "Unknown"),
      bitrate: groupCount(audio, (item) => item.bitrate ? `${Math.round(Number(item.bitrate) / 1000)} kbps` : "Unknown"),
      year: groupCount([...audio, ...videos], (item) => item.year || "Unknown"),
      duration: groupCount([...audio, ...videos], getDurationBucket),
      audioDuration: groupCount(audio, getDurationBucket),
      videoDuration: groupCount(videos, getDurationBucket),
      size: groupCount([...audio, ...videos], getSizeBucket),
      added: groupCount([...audio, ...videos], getDateBucket),
      copyStatus: groupCount(copyJobs, (job) => job.status || "Unknown"),
      converterJobStatus: groupCount(converterJobs, (job) => job.status || "Unknown"),
      masteringJobStatus: groupCount(masteringJobs, (job) => job.status || "Unknown"),
      converterFormats: groupCount(converterJobs, (job) => job.outputFormat || job.outputType || "Unknown"),
      masteringPresets: groupCount(masteringJobs, (job) => job.preset || job.jobKind || "Unknown"),
      torrentStatus: groupCount(torrentSummary.items, (item) => item.status || "Unknown"),
      torrentPriority: groupCount(torrentSummary.items, (item) => item.priority || "normal"),
      moduleActivity: moduleRows.map((row) => ({ label: row.label, value: row.value })),
    },
  };
}

function statCard(icon, label, value, sub = "") {
  return `
    <div class="statsMetricCard">
      <span>${iconHtml(icon)}</span>
      <div><strong>${escapeHtml(value)}</strong><em>${escapeHtml(label)}</em>${sub ? `<small>${escapeHtml(sub)}</small>` : ""}</div>
    </div>
  `;
}

function barList(title, items = [], options = {}) {
  const rows = items.slice(0, options.limit || 8);
  const max = Math.max(1, ...rows.map((item) => Number(item.value || 0)));
  return `
    <article class="statsPanel">
      <div class="statsPanelHead"><span>${iconHtml(options.icon || "chart-column")}</span><div><strong>${escapeHtml(title)}</strong><em>${escapeHtml(options.desc || "Top breakdown")}</em></div></div>
      <div class="statsBarList">
        ${rows.length ? rows.map((item) => `
          <div class="statsBarRow">
            <div><strong>${flagForLabel(item.label)}${escapeHtml(item.label)}</strong><em>${escapeHtml(options.suffix || "items")}</em></div>
            <span><i style="width:${percent(item.value, max)}%"></i></span>
            <b>${numberFormat(item.value)}</b>
          </div>
        `).join("") : `<div class="statsEmpty">No data yet.</div>`}
      </div>
    </article>
  `;
}

function pieChart(title, items = [], options = {}) {
  const rows = items.slice(0, options.limit || 6);
  const total = rows.reduce((sum, item) => sum + Number(item.value || 0), 0);
  let offset = 0;
  const segments = rows.map((item, index) => {
    const amount = total ? (Number(item.value || 0) / total) * 100 : 0;
    const start = offset;
    offset += amount;
    return `var(--stats-c${index}) ${start}% ${offset}%`;
  }).join(", ");
  return `
    <article class="statsPanel statsPiePanel">
      <div class="statsPanelHead"><span>${iconHtml(options.icon || "chart-pie")}</span><div><strong>${escapeHtml(title)}</strong><em>${escapeHtml(options.desc || `${numberFormat(total)} total`)}</em></div></div>
      <div class="statsPieWrap">
        <div class="statsPie" style="background:conic-gradient(${segments || "rgba(255,255,255,.12) 0 100%"})"><b>${numberFormat(total)}</b><em>total</em></div>
        <div class="statsLegend">
          ${rows.length ? rows.map((item, index) => `<span><i style="background:var(--stats-c${index})"></i>${escapeHtml(item.label)} <b>${numberFormat(item.value)}</b></span>`).join("") : `<span>No data yet</span>`}
        </div>
      </div>
    </article>
  `;
}

function lineGraph(title, points = [], options = {}) {
  const rows = points.slice(-12);
  const max = Math.max(1, ...rows.map((item) => Number(item.value || 0)));
  return `
    <article class="statsPanel statsLinePanel">
      <div class="statsPanelHead"><span>${iconHtml(options.icon || "chart-line")}</span><div><strong>${escapeHtml(title)}</strong><em>${escapeHtml(options.desc || "Timeline")}</em></div></div>
      <div class="statsLineGraph">
        ${rows.length ? rows.map((item) => `<span style="height:${Math.max(8, percent(item.value, max))}%"><b>${escapeHtml(item.label)}</b><em>${numberFormat(item.value)}</em></span>`).join("") : `<div class="statsEmpty">No timeline data yet.</div>`}
      </div>
    </article>
  `;
}

function topTable(title, rows = [], options = {}) {
  const filtered = rows.slice(0, options.limit || 12);
  return `
    <article class="statsPanel statsTablePanel">
      <div class="statsPanelHead"><span>${iconHtml(options.icon || "list")}</span><div><strong>${escapeHtml(title)}</strong><em>${escapeHtml(options.desc || "Ranked list")}</em></div></div>
      <div class="statsTable">
        ${filtered.length ? filtered.map((row, index) => `
          <div class="statsTableRow">
            <b>${index + 1}</b>
            <span>${flagForLabel(row.label)}${escapeHtml(row.label)}</span>
            <strong>${options.valueFormatter ? escapeHtml(options.valueFormatter(row.value, row)) : numberFormat(row.value)}</strong>
          </div>
        `).join("") : `<div class="statsEmpty">No data yet.</div>`}
      </div>
    </article>
  `;
}

function sectionHeaderHtml(title, desc, icon = "chart-pie") {
  return `
    <div class="statsSectionIntro">
      <span>${iconHtml(icon)}</span>
      <div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(desc)}</p></div>
    </div>
  `;
}

function buildYearPoints(model) {
  return model.groups.year
    .filter((item) => /^\d{4}$/.test(String(item.label)))
    .sort((a, b) => Number(a.label) - Number(b.label))
    .map((item) => ({ label: item.label, value: item.value }));
}

function buildLargestRows(items = []) {
  return [...items]
    .sort((a, b) => Number(b.sizeBytes || b.size || 0) - Number(a.sizeBytes || a.size || 0))
    .slice(0, 12)
    .map((item) => ({ label: titleOf(item), value: Number(item.sizeBytes || item.size || 0) }));
}

function buildLongestRows(items = []) {
  return [...items]
    .map((item) => ({ item, duration: durationSecondsOf(item) }))
    .filter((entry) => entry.duration > 0)
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 12)
    .map(({ item, duration }) => ({ label: titleOf(item), value: duration }));
}

function progressCards(model) {
  const runtime = model.runtime || {};
  const position = runtime.position || {};
  const lastTitle = position.title || model.audio.find((item) => item.id === position.id)?.title || "Nothing saved yet";
  return `
    <article class="statsPanel statsWidePanel">
      <div class="statsPanelHead"><span>${iconHtml("headphones")}</span><div><strong>Playback memory</strong><em>Resume, completed listens and current queue stats.</em></div></div>
      <div class="statsProgressGrid">
        ${statCard("circle-play", "Last played", lastTitle, position.time ? `${formatHours(position.time)} into track` : "No resume position")}
        ${statCard("circle-check", "Completed items", numberFormat(model.completed.length), `${numberFormat(model.inProgress.length)} in progress`)}
        ${statCard("list-check", "Saved queue", numberFormat(runtime.state?.queue?.length || model.localStats.savedQueueCount), "Current/manual queue size")}
        ${statCard("star", "Favourites", numberFormat(model.localStats.favouritesCount), `${numberFormat(model.localStats.playlistsCount)} playlists`)}
      </div>
    </article>
  `;
}

function renderStatsOverview(model) {
  const storageRows = [
    { label: "Audio", value: model.audioBytes },
    { label: "Video", value: model.videoBytes },
  ].map((item) => ({ ...item, display: formatBytes(item.value) }));
  return `
    ${sectionHeaderHtml("Overview", "Main BRMedia totals. Deeper charts live in the Stats menu, so this page stays tidy.", "chart-pie")}
    <div class="statsMetricGrid">
      ${statCard("music", "Audio files", numberFormat(model.audio.length), `${numberFormat(model.longMixes.length)} long mixes · ${numberFormat(model.shortAudio.length)} short audio`)}
      ${statCard("film", "Video files", numberFormat(model.videos.length), `${numberFormat(model.needsMp4.length)} need MP4 copy`)}
      ${statCard("database", "Storage tracked", formatBytes(model.totalBytes), `${formatBytes(model.audioBytes)} audio · ${formatBytes(model.videoBytes)} video`)}
      ${statCard("clock", "Runtime indexed", formatHours(model.totalSeconds), `${formatHours(model.audioSeconds)} audio · ${formatHours(model.videoSeconds)} video`)}
      ${statCard("tags", "BRMedia tagged", numberFormat(model.tagged.length), `${Math.round(percent(model.tagged.length, model.audio.length))}% of audio library`)}
      ${statCard("compactdisc", "Artwork coverage", `${Math.round(percent(model.artwork.length, model.audio.length))}%`, `${numberFormat(model.artwork.length)} audio items with artwork`)}
      ${statCard("video", "Video metadata", `${Math.round(percent(model.videosWithMetadata.length, model.videos.length))}%`, `${numberFormat(model.videosWithPoster.length)} posters · ${numberFormat(model.videosWithSubtitles.length)} subtitles`)}
      ${statCard("waveform", "Average BPM", model.avgBpm ? `${model.avgBpm} BPM` : "—", `${numberFormat(model.groups.bitrate.length)} bitrate groups`)}
    </div>
    <div class="statsChartGrid">
      ${pieChart("Storage split", storageRows.map((row) => ({ label: `${row.label} (${row.display})`, value: row.value })), { icon: "database", desc: formatBytes(model.totalBytes) })}
      ${pieChart("Audio sources", model.groups.source, { icon: "cloud", desc: "Local, cloud and upload split" })}
      ${lineGraph("Years in library", buildYearPoints(model), { icon: "chart-line", desc: "Audio + video release years" })}
      ${barList("Library health quick view", [
        { label: "Audio tagged", value: model.tagged.length },
        { label: "Audio artwork", value: model.artwork.length },
        { label: "Video metadata", value: model.videosWithMetadata.length },
        { label: "Video posters", value: model.videosWithPoster.length },
        { label: "Video subtitles", value: model.videosWithSubtitles.length },
        { label: "Needs MP4", value: model.needsMp4.length },
      ], { icon: "circle-check", desc: "Coverage counts", suffix: "items" })}
    </div>
  `;
}

function renderStatsAudio(model) {
  return `
    ${sectionHeaderHtml("Audio Stats", "Mixes, songs, BRMedia brands, categories, artists, albums and format spread.", "music")}
    <div class="statsMetricGrid">
      ${statCard("music", "Audio files", numberFormat(model.audio.length), `${numberFormat(model.longMixes.length)} long mixes`)}
      ${statCard("clock", "Audio runtime", formatHours(model.audioSeconds), `${numberFormat(model.shortAudio.length)} short audio files`)}
      ${statCard("trophy", "Top brand", model.groups.brand[0]?.label || "—", `${numberFormat(model.groups.brand[0]?.value || 0)} items`)}
      ${statCard("headphones", "Top artist", groupCount(model.audio, (item) => item.artist || getItemTags(item).artist || "Unknown")[0]?.label || "—", "Most represented artist")}
    </div>
    <div class="statsChartGrid">
      ${barList("BRMedia brands", model.groups.brand, { icon: "trophy", desc: "Brand coverage", suffix: "tracks" })}
      ${barList("Player categories", model.groups.category, { icon: "folder-open", desc: "Category organisation", suffix: "items" })}
      ${pieChart("Audio formats", model.groups.audioFormat, { icon: "music", desc: "MP3, WAV, FLAC, M4A…" })}
      ${barList("Genres", model.groups.genre, { icon: "chart-column", desc: "Audio genre spread", suffix: "tracks" })}
      ${barList("Audio duration buckets", model.groups.audioDuration, { icon: "clock", desc: "Short songs through long mixes", suffix: "files" })}
      ${topTable("Longest audio", buildLongestRows(model.audio), { icon: "clock", desc: "Longest mixes/songs", valueFormatter: (value) => formatHours(value) })}
      ${topTable("Top artists", groupCount(model.audio, (item) => item.artist || getItemTags(item).artist || "Unknown"), { icon: "headphones", desc: "Most represented artists" })}
      ${topTable("Top albums / collections", groupCount(model.audio, (item) => item.album || getItemTags(item).album || "Unknown"), { icon: "compactdisc", desc: "Album and collection spread" })}
    </div>
  `;
}

function renderStatsVideo(model) {
  return `
    ${sectionHeaderHtml("Video Stats", "Video library, formats, genres, metadata coverage, posters, subtitles and MP4 readiness.", "film")}
    <div class="statsMetricGrid">
      ${statCard("film", "Video files", numberFormat(model.videos.length), formatBytes(model.videoBytes))}
      ${statCard("circle-check", "Browser ready", numberFormat(model.videos.length - model.needsMp4.length), `${numberFormat(model.needsMp4.length)} need MP4`)}
      ${statCard("tags", "Metadata coverage", `${Math.round(percent(model.videosWithMetadata.length, model.videos.length))}%`, `${numberFormat(model.videosWithMetadata.length)} matched`)}
      ${statCard("video", "Posters/subtitles", `${numberFormat(model.videosWithPoster.length)} / ${numberFormat(model.videosWithSubtitles.length)}`, "poster / subtitle counts")}
      ${statCard("star", "Rating coverage", `${Math.round(percent(model.videosWithRatings.length, model.videos.length))}%`, "IMDb / Rotten Tomatoes / Metacritic")}
      ${statCard("clock", "Video runtime", formatHours(model.videoSeconds), "Indexed duration")}
    </div>
    <div class="statsChartGrid">
      ${pieChart("Video formats", model.groups.videoFormat, { icon: "film", desc: "MP4, VOB, MKV, AVI…" })}
      ${barList("Video genres", model.groups.videoGenre, { icon: "video", desc: "Video category spread", suffix: "videos" })}
      ${barList("Video readiness", [
        { label: "Browser ready", value: model.videos.length - model.needsMp4.length },
        { label: "Needs MP4 copy", value: model.needsMp4.length },
        { label: "Has metadata", value: model.videosWithMetadata.length },
        { label: "Has poster", value: model.videosWithPoster.length },
        { label: "Has subtitles", value: model.videosWithSubtitles.length },
        { label: "Has ratings", value: model.videosWithRatings.length },
      ], { icon: "circle-check", desc: "Playback and metadata health", suffix: "videos" })}
      ${barList("Video duration buckets", model.groups.videoDuration, { icon: "clock", desc: "Film/show length spread", suffix: "videos" })}
      ${topTable("Largest videos", buildLargestRows(model.videos), { icon: "harddrive", desc: "Biggest video files", valueFormatter: (value) => formatBytes(value) })}
    </div>
  `;
}

function statsEventTypeLabel(type = "event") {
  return String(type || "event")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function statsEventModuleLabel(module = "server") {
  const labels = {
    player: "Player",
    video: "Video Player",
    profile: "Profile",
    imports: "Uploads / Imports",
    torrents: "Torrents",
    converter: "Converter",
    mastering: "Mastering",
    tagger: "Tagger",
    browser: "Browser",
    server: "Server",
  };

  return labels[module] || statsEventTypeLabel(module);
}

function renderStatsActivity(model) {
  const summary = statsState.data.eventSummary || {};
  const metrics = summary.metrics || {};
  const eventStatus = statsState.data.eventStatus || {};
  const lastStoredEvent = eventStatus.lastEvent || null;

  const events = Array.isArray(statsState.data.events)
    ? statsState.data.events
    : [];

  const moduleRows = (
    Array.isArray(summary.modules)
      ? summary.modules
      : []
  ).map((row) => ({
    label: statsEventModuleLabel(row.label),
    value: Number(row.value || 0),
  }));

  const typeRows = (
    Array.isArray(summary.types)
      ? summary.types
      : []
  ).map((row) => ({
    label: statsEventTypeLabel(row.label),
    value: Number(row.value || 0),
  }));

  const timelineRows = Array.isArray(summary.timeline)
    ? summary.timeline
    : [];

  const topAudioRows = Array.isArray(summary.topAudio)
    ? summary.topAudio
    : [];

  const topVideoRows = Array.isArray(summary.topVideo)
    ? summary.topVideo
    : [];

  return `
    ${sectionHeaderHtml(
      "Activity Log",
      "Permanent server-side BRMedia activity that survives restarts. Player, Video, Profiles, favourites, queues, uploads, Torrents, Converter, Tagger and Mastering all feed this dashboard.",
      "clock-rotate-left"
    )}

    <div class="statsMetricGrid">
      ${statCard("clock-rotate-left", "Saved events", numberFormat(summary.total || 0), `${numberFormat(summary.today || 0)} today · ${numberFormat(summary.last7Days || 0)} in 7 days`)}

      ${statCard("music", "Audio playback", numberFormat(metrics.audioPlays || 0), `${numberFormat(metrics.audioCompleted || 0)} completed listens`)}

      ${statCard("film", "Video playback", numberFormat(metrics.videoPlays || 0), `${numberFormat(metrics.videoCompleted || 0)} completed watches`)}

      ${statCard("forward-step", "Skips + seeks", numberFormat(metrics.audioSkips || 0), `${numberFormat(metrics.audioSeeks || 0)} audio seeks · ${numberFormat(metrics.videoSeeks || 0)} video seeks`)}

      ${statCard("bookmark", "Bookmarks", numberFormat(metrics.bookmarkAdds || 0), `${numberFormat(metrics.bookmarkRemoves || 0)} removals or clears`)}

      ${statCard("rectangle-list", "Playlists", numberFormat(metrics.playlistCreates || 0), `${numberFormat(metrics.playlistImports || 0)} imports · ${numberFormat(metrics.playlistTrackAdds || 0)} tracks added`)}

      ${statCard("film", "Video parts + MP4", numberFormat(metrics.videoPartSwitches || 0), `${numberFormat(metrics.videoCopyCompleted || 0)} MP4 copies · ${numberFormat(metrics.videoCopyErrors || 0)} errors`)}

      ${statCard("heart", "Favourites", numberFormat(metrics.favouriteAdds || 0), `${numberFormat(metrics.favouriteRemoves || 0)} removals`)}

      ${statCard("list-check", "Queue activity", numberFormat(metrics.queueAdds || 0), `${numberFormat(metrics.queueRemoves || 0)} removals · ${numberFormat(metrics.queueClears || 0)} clears`)}

      ${statCard("mobile-screen", "Device handoffs", numberFormat(metrics.deviceHandoffs || 0), "Player and Video sends")}

      ${statCard("cloud-arrow-down", "Imports", numberFormat(metrics.importCompleted || 0), `${numberFormat(metrics.uploads || 0)} direct uploads`)}

      ${statCard("magnet", "Torrents", numberFormat(metrics.torrentCompleted || 0), `${numberFormat(metrics.torrentTransfers || 0)} library transfers · ${numberFormat(metrics.torrentAdds || 0)} adds`)}

      ${statCard("shield-virus", "Security scans", numberFormat((metrics.torrentScans || 0) + (metrics.defenderScans || 0)), `${numberFormat((metrics.torrentScanWarnings || 0) + (metrics.defenderWarnings || 0))} warnings · ${numberFormat(metrics.torrentNotifications || 0)} alerts`)}

      ${statCard("box-archive", "Quarantine", numberFormat(metrics.quarantineAdds || 0), `${numberFormat(metrics.quarantineRestores || 0)} restored · ${numberFormat(metrics.quarantineDeletes || 0)} deleted`)}

      ${statCard("floppy-disk", "Backup + restore", numberFormat(metrics.backupExports || 0), `${numberFormat(metrics.backupRestores || 0)} restores`)}

      ${statCard("waveform", "Admin rebuilds", numberFormat(metrics.waveformCompleted || 0), `${numberFormat(metrics.waveformGenerated || 0)} waveforms · ${numberFormat((metrics.audioRescans || 0) + (metrics.videoRescans || 0))} rescans · ${numberFormat(metrics.videoMetadataRebuilds || 0)} metadata rebuilds`)}

      ${statCard("server", "Server recovery", numberFormat(metrics.watchdogRecoveries || 0), `${numberFormat(metrics.serverStarts || 0)} starts · ${numberFormat(metrics.watchdogHealthRecoveries || 0)} health recoveries`)}

      ${statCard("arrows-rotate", "Converter", numberFormat(metrics.converterCompleted || 0), `${numberFormat(metrics.converterJobs || 0)} jobs started`)}

      ${statCard("sliders", "Mastering", numberFormat(metrics.masteringCompleted || 0), `${numberFormat(metrics.masteringJobs || 0)} jobs started`)}

      ${statCard("tag", "Tagger saves", numberFormat(metrics.taggerSaves || 0), "Tags and written copies")}

      ${statCard("triangle-exclamation", "Recorded failures", numberFormat(metrics.recordedFailures || 0), `${numberFormat(metrics.recordedCancellations || 0)} cancellations`)}

      ${statCard("user", "Profile sync", numberFormat(metrics.profileSyncs || 0), `${numberFormat(metrics.profileLogins || 0)} logins`)}
    </div>

    <article class="statsPanel statsWidePanel statsEventStorePanel">
      <div class="statsPanelHead">
        <span>
          ${iconHtml(
            eventStatus.ok === false
              ? "triangle-exclamation"
              : "database"
          )}
        </span>

        <div>
          <strong>Permanent event-store health</strong>
          <em>
            ${escapeHtml(
              eventStatus.path ||
              "server/data/stats-events.jsonl"
            )}
          </em>
        </div>
      </div>

      <div class="statsEventStoreGrid">
        <div class="statsEventStoreCard ${eventStatus.exists ? "is-ok" : "is-waiting"}">
          <strong>
            ${eventStatus.exists ? "READY" : "WAITING"}
          </strong>

          <span>Event log</span>

          <small>
            ${
              eventStatus.exists
                ? "Persistent JSONL file exists"
                : "Created automatically after the first event"
            }
          </small>
        </div>

        <div class="statsEventStoreCard ${Number(eventStatus.malformedLines || 0) ? "is-warning" : "is-ok"}">
          <strong>
            ${numberFormat(eventStatus.validLines || 0)}
          </strong>

          <span>Valid entries</span>

          <small>
            ${numberFormat(eventStatus.malformedLines || 0)}
            malformed lines
          </small>
        </div>

        <div class="statsEventStoreCard">
          <strong>
            ${formatBytes(eventStatus.sizeBytes || 0)}
          </strong>

          <span>Event-log size</span>

          <small>
            ${numberFormat(eventStatus.totalLines || 0)}
            physical lines
          </small>
        </div>

        <div class="statsEventStoreCard">
          <strong>
            ${
              lastStoredEvent
                ? escapeHtml(
                    statsEventTypeLabel(
                      lastStoredEvent.type ||
                      "event"
                    )
                  )
                : "No events yet"
            }
          </strong>

          <span>Latest recorded action</span>

          <small>
            ${
              lastStoredEvent
                ? `${
                    escapeHtml(
                      statsEventModuleLabel(
                        lastStoredEvent.module ||
                        "server"
                      )
                    )
                  } · ${
                    escapeHtml(
                      formatDate(
                        lastStoredEvent.at
                      )
                    )
                  }`
                : "Waiting for BRMedia activity"
            }
          </small>
        </div>
      </div>
    </article>

    <div class="statsChartGrid">
      ${lineGraph(
        "Activity over 14 days",
        timelineRows,
        {
          icon: "chart-line",
          desc: "Permanent events per day",
        }
      )}

      ${barList(
        "Events by module",
        moduleRows,
        {
          icon: "chart-column",
          desc: "Permanent event split",
          suffix: "events",
        }
      )}

      ${barList(
        "Most common actions",
        typeRows,
        {
          icon: "list-check",
          desc: "Top recorded event types",
          suffix: "events",
        }
      )}

      ${topTable(
        "Top audio activity",
        topAudioRows,
        {
          icon: "music",
          desc: "Most played, completed or favourited audio",
        }
      )}

      ${topTable(
        "Top video activity",
        topVideoRows,
        {
          icon: "film",
          desc: "Most watched, completed or favourited videos",
        }
      )}
    </div>

    <article class="statsPanel statsWidePanel">
      <div class="statsPanelHead">
        <span>${iconHtml("clock-rotate-left")}</span>

        <div>
          <strong>Recent BRMedia activity</strong>
          <em>Newest persistent events first.</em>
        </div>
      </div>

      <div class="statsActivityList">
        ${
          events.length
            ? events
                .slice(0, 120)
                .map((event) => `
                  <div class="statsActivityRow">
                    <span class="statsActivityIcon">
                      ${iconHtml(
                        event.module === "player"
                          ? "music"
                          : event.module === "video"
                            ? "film"
                            : event.module === "torrents"
                              ? "magnet"
                              : event.module === "profile"
                                ? "user"
                                : event.module === "imports"
                                  ? "cloud-arrow-down"
                                  : event.module === "tagger"
                                    ? "tag"
                                    : event.module === "converter"
                                      ? "arrows-rotate"
                                      : event.module === "mastering"
                                        ? "sliders"
                                        : "clock"
                      )}
                    </span>

                    <div>
                      <strong>
                        ${escapeHtml(
                          statsEventTypeLabel(
                            event.type || "event"
                          )
                        )}
                      </strong>

                      <em>
                        ${escapeHtml(
                          event.title ||
                          statsEventModuleLabel(
                            event.module || "server"
                          )
                        )}
                      </em>
                    </div>

                    <b>
                      ${escapeHtml(
                        statsEventModuleLabel(
                          event.module || "server"
                        )
                      )}
                    </b>

                    <small>
                      ${escapeHtml(
                        formatDate(event.at)
                      )}
                    </small>
                  </div>
                `)
                .join("")
            : `
              <div class="statsEmpty">
                No permanent events recorded yet. Play audio,
                open a video, save Profile memory or start a
                BRMedia job and activity will appear here.
              </div>
            `
        }
      </div>
    </article>
  `;
}

function renderStatsTorrents(model) {
  const t = model.torrentSummary || getTorrentStatsSummary([]);
  const recentRows = t.items.slice(0, 12).map((item) => ({
    label: item.name || item.title || item.hash || "Torrent",
    value: Number(item.progress || 0),
    sub: `${formatBytes(item.completedBytes || 0)} / ${formatBytes(item.sizeBytes || item.size || 0)} · ${item.status || item.state || "Unknown"}`,
  }));
  const largestRows = [...t.items]
    .sort((a, b) => Number(b.sizeBytes || b.size || 0) - Number(a.sizeBytes || a.size || 0))
    .slice(0, 8)
    .map((item) => ({
      label: item.name || item.title || item.hash || "Torrent",
      value: Number(item.sizeBytes || item.size || 0),
      sub: `${Math.round(Number(item.progress || 0))}% · ${item.status || item.state || "Unknown"}`,
    }));
  const speedRows = t.items
    .filter((item) => Number(item.downloadSpeedKb || 0) || Number(item.uploadSpeedKb || 0))
    .sort((a, b) => Number(b.downloadSpeedKb || 0) - Number(a.downloadSpeedKb || 0))
    .slice(0, 8)
    .map((item) => ({
      label: item.name || item.title || item.hash || "Torrent",
      value: Number(item.downloadSpeedKb || 0),
      sub: `Up ${formatSpeedKb(item.uploadSpeedKb || 0)} · ${Math.round(Number(item.progress || 0))}%`,
    }));

  return `
    ${sectionHeaderHtml("Torrents", "qBittorrent queue, speeds, seeds, pieces, storage pressure and BRMedia handoff signals.", "magnet")}
    <div class="statsMetricGrid">
      ${statCard("magnet", "Queue items", numberFormat(t.items.length), `${numberFormat(t.downloading.length)} downloading · ${numberFormat(t.seeding.length)} seeding`)}
      ${statCard("circle-check", "Completed", numberFormat(t.complete.length), `${Math.round(percent(t.complete.length, t.items.length))}% complete`)}
      ${statCard("chart-line", "Download speed", formatSpeedKb(t.downloadSpeedKb), `Upload ${formatSpeedKb(t.uploadSpeedKb)}`)}
      ${statCard("database", "Downloaded", formatBytes(t.completedBytes), `${formatBytes(t.remainingBytes)} remaining`)}
      ${statCard("plug", "Swarm", `${numberFormat(t.seeds)} / ${numberFormat(t.leeches)}`, "seeds / leeches visible")}
      ${statCard("shield-check", "Health", `${numberFormat(t.stalled.length)} stalled`, `${numberFormat(t.errored.length)} errors · ratio ${t.averageRatio.toFixed(2)}`)}
    </div>
    <div class="statsChartGrid">
      ${barList("Torrent status", model.groups.torrentStatus, { icon: "chart-column", desc: "qBittorrent state split", suffix: "items" })}
      ${barList("Torrent priorities", model.groups.torrentPriority, { icon: "bolt", desc: "Normal/high/top priority split", suffix: "items" })}
      ${topTable("Current torrent progress", recentRows, { icon: "magnet", desc: "Latest queue progress", valueFormatter: (value) => `${Math.round(value)}%` })}
      ${topTable("Largest torrent payloads", largestRows, { icon: "database", desc: "Biggest downloads in the queue", valueFormatter: (value) => formatBytes(value) })}
      ${topTable("Fastest active torrents", speedRows, { icon: "gauge-high", desc: "Current download throughput", valueFormatter: (value) => formatSpeedKb(value) })}
    </div>
    <div class="statsHeroActions statsTorrentActions">
      <button class="statsBtn primary" data-route="/torrents" type="button">${iconHtml("magnet")}<span>Open Torrents</span></button>
      <button class="statsBtn" data-route="/settings?module=torrents&tab=engine" type="button">${iconHtml("gear")}<span>Torrent Settings</span></button>
    </div>
  `;
}

function renderStatsDj(model) {
  const local = model.localStats || {};
  const djRows = [
    { label: "Prepared tracks", value: local.djPreparedTracks || 0 },
    { label: "Beat grids saved", value: local.djGridTracks || 0 },
    { label: "Wave/beat scans", value: local.djAnalysedTracks || 0 },
    { label: "Hot Cue tracks", value: local.djHotCueTracks || 0 },
    { label: "Memory Cue tracks", value: local.djMemoryCueTracks || 0 },
    { label: "Recordings", value: local.djRecordingsCount || 0 },
  ];

  return `
    ${sectionHeaderHtml("DJ Mixer", "Browser DJ Studio signals from this device: prepared tracks, beat grids, cue banks, recordings and the new Collection workflow.", "record-vinyl")}

    <div class="statsMetricGrid">
      ${statCard("folder-open", "Prepared tracks", numberFormat(local.djPreparedTracks || 0), "Saved Collection prep badges")}
      ${statCard("waveform", "Beat grids", numberFormat(local.djGridTracks || 0), "Grid/downbeat cache entries")}
      ${statCard("magnifying-glass", "Analysed tracks", numberFormat(local.djAnalysedTracks || 0), "Browser worker BPM/wave scans")}
      ${statCard("circle-play", "Recordings", numberFormat(local.djRecordingsCount || 0), `${formatDuration(local.djRecordingSeconds || 0)} total captured`)}
    </div>

    <div class="statsChartGrid">
      ${barList("DJ Studio prep", djRows, { icon: "record-vinyl", desc: "Local DJ Mixer browser cache", suffix: "items", limit: 8 })}
      ${topTable("DJ recordings summary", [
        { label: "Recording count", value: local.djRecordingsCount || 0 },
        { label: "Recording minutes", value: Math.round(Number(local.djRecordingSeconds || 0) / 60) },
        { label: "Prepared tracks", value: local.djPreparedTracks || 0 },
        { label: "Cue-ready tracks", value: (local.djHotCueTracks || 0) + (local.djMemoryCueTracks || 0) },
      ], { icon: "circle-dot", desc: "Until server-side event logging lands, this reads the browser DJ cache." })}
    </div>
  `;
}

function renderStatsLibrary(model) {
  const storageRows = [
    { label: "Audio", value: model.audioBytes },
    { label: "Video", value: model.videoBytes },
  ].map((item) => ({ ...item, display: formatBytes(item.value) }));
  return `
    ${sectionHeaderHtml("Library + Storage", "Storage split, imports, cloud sources, formats, size buckets and duplicate clues.", "database")}
    <div class="statsMetricGrid">
      ${statCard("database", "Total tracked", formatBytes(model.totalBytes), `${numberFormat(model.audio.length + model.videos.length)} total media files`)}
      ${statCard("music", "Audio storage", formatBytes(model.audioBytes), `${numberFormat(model.audio.length)} files`)}
      ${statCard("film", "Video storage", formatBytes(model.videoBytes), `${numberFormat(model.videos.length)} files`)}
      ${statCard("cloud", "Cloud linked", numberFormat(statsState.data.cloudLinked.length), "Google Drive / cloud-linked items")}
      ${statCard("broom", "Possible duplicate groups", numberFormat(model.duplicates.length), "Fast filename/duration check")}
      ${statCard("harddrive", "Largest file", buildLargestRows([...model.audio, ...model.videos])[0]?.label || "—", formatBytes(buildLargestRows([...model.audio, ...model.videos])[0]?.value || 0))}
    </div>
    <div class="statsChartGrid">
      ${pieChart("Storage split", storageRows.map((row) => ({ label: `${row.label} (${row.display})`, value: row.value })), { icon: "database", desc: formatBytes(model.totalBytes) })}
      ${barList("Audio sources", model.groups.source, { icon: "cloud", desc: "Local, cloud and upload split", suffix: "files" })}
      ${barList("Video sources", model.groups.videoSource, { icon: "cloud", desc: "Video source split", suffix: "files" })}
      ${barList("Size buckets", model.groups.size, { icon: "harddrive", desc: "Small files through huge videos", suffix: "files" })}
      ${barList("Added / modified buckets", model.groups.added, { icon: "clock", desc: "When files appear to have been added/changed", suffix: "files" })}
      ${topTable("Largest media files", buildLargestRows([...model.audio, ...model.videos]), { icon: "harddrive", desc: "Biggest files across audio + video", valueFormatter: (value) => formatBytes(value) })}
    </div>
  `;
}

function renderStatsModules(model) {
  return `
    ${sectionHeaderHtml("Module Stats", "A module-by-module control view: which parts of BRMedia are busy, healthy, tagged, converted, mastered or waiting for cleanup.", "sliders")}

    <div class="statsMetricGrid">
      ${statCard("music", "Player library", numberFormat(model.audio.length), `${numberFormat(model.localStats.favouritesCount)} favourites · ${numberFormat(model.localStats.playlistsCount)} playlists`)}
${statCard("film", "Video module", numberFormat(model.videos.length), `${numberFormat(model.needsMp4.length)} need MP4 · ${numberFormat(model.videosWithMetadata.length)} matched`)}
${statCard("record-vinyl", "DJ Mixer", numberFormat(model.localStats.djPreparedTracks + model.localStats.djRecordingsCount), `${numberFormat(model.localStats.djGridTracks)} grids · ${numberFormat(model.localStats.djRecordingsCount)} recordings`)}
${statCard("arrows-rotate", "Converter jobs", numberFormat(model.converterJobs.length), `${numberFormat(model.converterJobs.filter((job) => job.status === "done").length)} done`)}
      ${statCard("sliders", "Mastering jobs", numberFormat(model.masteringJobs.length), `${numberFormat(model.masteringJobs.filter((job) => job.status === "done").length)} done`)}
      ${statCard("tags", "Tagger sidecars", numberFormat(model.customTagCount), `${numberFormat(model.tagged.length)} audio items tagged`)}
      ${statCard("gear", "Settings tools", numberFormat(model.copyJobs.length), "Video browser-copy jobs tracked")}
      ${statCard("server", "Server cleanup", numberFormat(model.duplicates.length), "Possible duplicate groups")}
      ${statCard("chart-pie", "Stats sections", numberFormat(STATS_VIEWS.length), "Dashboard views available")}
    </div>

    <div class="statsChartGrid">
      ${barList("Module activity", model.groups.moduleActivity, { icon: "chart-column", desc: "Current measurable activity per module", suffix: "signals", limit: 10 })}
      ${pieChart("Module workload split", model.groups.moduleActivity, { icon: "chart-pie", desc: "Relative module signal counts", limit: 8 })}
      ${barList("Converter job status", model.groups.converterJobStatus, { icon: "arrows-rotate", desc: "Current in-memory converter jobs", suffix: "jobs" })}
      ${barList("Mastering job status", model.groups.masteringJobStatus, { icon: "sliders", desc: "Current in-memory mastering jobs", suffix: "jobs" })}
      ${barList("Converter output formats", model.groups.converterFormats, { icon: "chart-simple", desc: "Output format split", suffix: "jobs" })}
      ${barList("Mastering presets / job types", model.groups.masteringPresets, { icon: "trophy", desc: "Preset and render type split", suffix: "jobs" })}
    </div>
  `;
}

function renderStatsPlayback(model) {
  return `
    ${sectionHeaderHtml("Playback", "Resume memory, completed tracks, queue/favourites/playlists and browser-stored listening data.", "headphones")}
    ${progressCards(model)}
    <div class="statsMetricGrid">
      ${statCard("circle-check", "Completed", numberFormat(model.completed.length), "Items over 95% or marked complete")}
      ${statCard("circle-play", "In progress", numberFormat(model.inProgress.length), "Part-played media")}
      ${statCard("star", "Favourites", numberFormat(model.localStats.favouritesCount), "Saved on this browser")}
      ${statCard("list-check", "Playlists", numberFormat(model.localStats.playlistsCount), `${numberFormat(model.localStats.bookmarksCount)} bookmarks`)}
    </div>
    <div class="statsChartGrid">
      ${topTable("Most progressed items", model.progress.sort((a, b) => Number(b.percent || 0) - Number(a.percent || 0)).map((item) => ({ label: item.title || item.id || "Media item", value: Math.round(Number(item.percent || 0)) })), { icon: "circle-play", desc: "Saved playback progress %", limit: 12 })}
      ${barList("Local player data", [
        { label: "Favourites", value: model.localStats.favouritesCount },
        { label: "Playlists", value: model.localStats.playlistsCount },
        { label: "Bookmarks", value: model.localStats.bookmarksCount },
        { label: "Recents", value: model.localStats.recentsCount },
        { label: "Source links", value: model.localStats.sourceLinksCount },
        { label: "Saved queue", value: model.localStats.savedQueueCount },
      ], { icon: "list-check", desc: "Browser/local stored player counts", suffix: "items" })}
      ${pieChart("Playback status", [
        { label: "Completed", value: model.completed.length },
        { label: "In progress", value: model.inProgress.length },
        { label: "Untouched/unknown", value: Math.max(0, model.audio.length - model.completed.length - model.inProgress.length) },
      ], { icon: "headphones", desc: "Based on saved progress" })}
    </div>
  `;
}

function renderStatsTechnical(model) {
  return `
    ${sectionHeaderHtml("Technical", "Bitrates, sample rates, BPM, years, runtime and output/copy job stats.", "waveform")}
    <div class="statsMetricGrid">
      ${statCard("waveform", "Average BPM", model.avgBpm ? `${model.avgBpm} BPM` : "—", "From metadata/BRMedia tags")}
      ${statCard("chart-simple", "Bitrate groups", numberFormat(model.groups.bitrate.length), "Audio technical spread")}
      ${statCard("waveform", "Sample-rate groups", numberFormat(model.groups.sampleRate.length), "Audio technical spread")}
      ${statCard("clock", "Total runtime", formatHours(model.totalSeconds), "Audio + video duration")}
      ${statCard("film", "MP4 copy jobs", numberFormat(model.copyJobs.length), `${numberFormat(model.copyJobs.filter((job) => job.status === "done").length)} done`)}
    </div>
    <div class="statsChartGrid">
      ${barList("Sample rates", model.groups.sampleRate, { icon: "waveform", desc: "Audio technical stats", suffix: "files" })}
      ${barList("Bitrates", model.groups.bitrate, { icon: "chart-simple", desc: "Audio quality overview", suffix: "files" })}
      ${lineGraph("Years in library", buildYearPoints(model), { icon: "chart-line", desc: "Audio + video release years" })}
      ${barList("Runtime buckets", model.groups.duration, { icon: "clock", desc: "Length spread across audio + video", suffix: "items" })}
      ${barList("MP4 browser-copy jobs", model.groups.copyStatus, { icon: "film", desc: "Video browser-copy job status", suffix: "jobs" })}
    </div>
  `;
}

function renderStatsFlags(model) {
  return `
    ${sectionHeaderHtml("Flags / Countries", "Country stats from BRMedia tags, shown with flag-icons where the country code can be detected.", "flag")}
    <div class="statsChartGrid">
      ${barList("Countries / flags", model.groups.country, { icon: "flag", desc: "From BRMedia tags where present", suffix: "items", limit: 16 })}
      ${topTable("Country table", model.groups.country, { icon: "flag", desc: "Full ranked country list", limit: 20 })}
      ${pieChart("Country split", model.groups.country, { icon: "flag", desc: "Top country split", limit: 6 })}
    </div>
  `;
}

function renderStatsHealth(model) {
  const missingArtwork = Math.max(0, model.audio.length - model.artwork.length);
  const missingTags = Math.max(0, model.audio.length - model.tagged.length);
  const missingVideoMeta = Math.max(0, model.videos.length - model.videosWithMetadata.length);
  const missingPosters = Math.max(0, model.videos.length - model.videosWithPoster.length);
  const missingRatings = Math.max(0, model.videos.length - model.videosWithRatings.length);
  return `
    ${sectionHeaderHtml("Library Health", "What needs tidying: metadata, artwork, browser copies, posters, ratings, subtitles and BRMedia tags.", "circle-check")}
    <div class="statsMetricGrid">
      ${statCard("tags", "Missing audio tags", numberFormat(missingTags), `${Math.round(percent(model.tagged.length, model.audio.length))}% tagged`)}
      ${statCard("compactdisc", "Missing artwork", numberFormat(missingArtwork), `${Math.round(percent(model.artwork.length, model.audio.length))}% artwork`)}
      ${statCard("film", "Missing video metadata", numberFormat(missingVideoMeta), `${Math.round(percent(model.videosWithMetadata.length, model.videos.length))}% matched`)}
      ${statCard("star", "Missing video ratings", numberFormat(missingRatings), `${Math.round(percent(model.videosWithRatings.length, model.videos.length))}% rated`)}
      ${statCard("video", "Needs MP4/poster", `${numberFormat(model.needsMp4.length)} / ${numberFormat(missingPosters)}`, "MP4 copy / poster gaps")}
      ${statCard("broom", "Duplicate groups", numberFormat(model.duplicates.length), "Fast filename/duration scan")}
    </div>
    <div class="statsChartGrid">
      ${barList("Fix queue", [
        { label: "Audio missing BRMedia tags", value: missingTags },
        { label: "Audio missing artwork", value: missingArtwork },
        { label: "Videos needing MP4", value: model.needsMp4.length },
        { label: "Videos missing metadata", value: missingVideoMeta },
        { label: "Videos missing posters", value: missingPosters },
        { label: "Videos missing ratings", value: missingRatings },
        { label: "Videos without subtitles", value: Math.max(0, model.videos.length - model.videosWithSubtitles.length) },
        { label: "Possible duplicate groups", value: model.duplicates.length },
      ], { icon: "triangle-exclamation", desc: "Largest cleanup targets", suffix: "items" })}
      ${pieChart("Healthy coverage", [
        { label: "Audio tagged", value: model.tagged.length },
        { label: "Audio artwork", value: model.artwork.length },
        { label: "Video metadata", value: model.videosWithMetadata.length },
        { label: "Video posters", value: model.videosWithPoster.length },
        { label: "Video subtitles", value: model.videosWithSubtitles.length },
        { label: "Video ratings", value: model.videosWithRatings.length },
      ], { icon: "circle-check", desc: "Coverage counts" })}
    </div>
  `;
}

function readStatsSnapshots() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STATS_SNAPSHOT_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStatsSnapshots(snapshots = []) {
  try {
    localStorage.setItem(STATS_SNAPSHOT_KEY, JSON.stringify(snapshots.slice(0, 40)));
  } catch {}
}

function buildStatsSnapshot(model) {
  return {
    capturedAt: Date.now(),
    audioCount: model.audio.length,
    videoCount: model.videos.length,
    totalFiles: model.audio.length + model.videos.length,
    totalBytes: model.totalBytes,
    audioBytes: model.audioBytes,
    videoBytes: model.videoBytes,
    totalSeconds: model.totalSeconds,
    audioSeconds: model.audioSeconds,
    videoSeconds: model.videoSeconds,
    taggedCount: model.tagged.length,
    artworkCount: model.artwork.length,
    videoMetadataCount: model.videosWithMetadata.length,
    videoPosterCount: model.videosWithPoster.length,
    videoSubtitleCount: model.videosWithSubtitles.length,
    videoRatingCount: model.videosWithRatings.length,
    needsMp4Count: model.needsMp4.length,
    duplicateGroups: model.duplicates.length,
    converterJobs: model.converterJobs.length,
    masteringJobs: model.masteringJobs.length,
    videoCopyJobs: model.copyJobs.length,
    favourites: model.localStats.favouritesCount,
    playlists: model.localStats.playlistsCount,
    bookmarks: model.localStats.bookmarksCount,
    topBrand: model.groups.brand[0]?.label || "",
    topCategory: model.groups.category[0]?.label || "",
    topAudioFormat: model.groups.audioFormat[0]?.label || "",
    topVideoFormat: model.groups.videoFormat[0]?.label || "",
  };
}

function signedNumber(value = 0) {
  const number = Number(value || 0);
  if (number > 0) return `+${numberFormat(number)}`;
  if (number < 0) return `-${numberFormat(Math.abs(number))}`;
  return "0";
}

function signedBytes(value = 0) {
  const number = Number(value || 0);
  if (number > 0) return `+${formatBytes(number)}`;
  if (number < 0) return `-${formatBytes(Math.abs(number))}`;
  return "0 MB";
}

function signedHours(value = 0) {
  const number = Number(value || 0);
  if (number > 0) return `+${formatHours(number)}`;
  if (number < 0) return `-${formatHours(Math.abs(number))}`;
  return "0 hrs";
}

function statsSnapshotDeltaRows(current, previous) {
  if (!previous) {
    return [
      { label: "No earlier snapshot yet", value: "Save a snapshot today, then this panel will compare the next one." },
    ];
  }

  return [
    { label: "Audio files", value: signedNumber(current.audioCount - previous.audioCount) },
    { label: "Video files", value: signedNumber(current.videoCount - previous.videoCount) },
    { label: "Storage", value: signedBytes(current.totalBytes - previous.totalBytes) },
    { label: "Runtime", value: signedHours(current.totalSeconds - previous.totalSeconds) },
    { label: "Tagged audio", value: signedNumber(current.taggedCount - previous.taggedCount) },
    { label: "Audio artwork", value: signedNumber(current.artworkCount - previous.artworkCount) },
    { label: "Video metadata", value: signedNumber(current.videoMetadataCount - previous.videoMetadataCount) },
    { label: "Needs MP4", value: signedNumber(current.needsMp4Count - previous.needsMp4Count) },
  ];
}

function statsSnapshotDeltaHtml(current, previous) {
  const rows = statsSnapshotDeltaRows(current, previous);

  return `
    <article class="statsPanel statsWidePanel">
      <div class="statsPanelHead"><span>${iconHtml("chart-line")}</span><div><strong>Change since last snapshot</strong><em>${previous ? `Compared with ${formatDate(previous.capturedAt)}` : "Save two snapshots to unlock real change tracking."}</em></div></div>
      <div class="statsDeltaGrid">
        ${rows.map((row) => `
          <div class="statsDeltaCard">
            <strong>${escapeHtml(row.value)}</strong>
            <span>${escapeHtml(row.label)}</span>
          </div>
        `).join("")}
      </div>
    </article>
  `;
}

function statsSnapshotSummaryText(model) {
  const current = buildStatsSnapshot(model);

  return [
    "BRMedia Stats Summary",
    `Generated: ${formatDate(current.capturedAt)}`,
    "",
    `Audio files: ${numberFormat(current.audioCount)}`,
    `Video files: ${numberFormat(current.videoCount)}`,
    `Total storage: ${formatBytes(current.totalBytes)}`,
    `Total runtime: ${formatHours(current.totalSeconds)}`,
    `Audio tagged: ${numberFormat(current.taggedCount)}`,
    `Audio artwork: ${numberFormat(current.artworkCount)}`,
    `Video metadata: ${numberFormat(current.videoMetadataCount)}`,
    `Video posters: ${numberFormat(current.videoPosterCount)}`,
    `Video subtitles: ${numberFormat(current.videoSubtitleCount)}`,
    `Video ratings: ${numberFormat(current.videoRatingCount)}`,
    `Needs MP4: ${numberFormat(current.needsMp4Count)}`,
    `Possible duplicate groups: ${numberFormat(current.duplicateGroups)}`,
    `Converter jobs: ${numberFormat(current.converterJobs)}`,
    `Mastering jobs: ${numberFormat(current.masteringJobs)}`,
    `Favourites: ${numberFormat(current.favourites)}`,
    `Playlists: ${numberFormat(current.playlists)}`,
  ].join("\n");
}

function csvEscape(value = "") {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function snapshotToCsv(snapshot = {}) {
  return Object.entries(snapshot)
    .map(([key, value]) => `${csvEscape(key)},${csvEscape(value)}`)
    .join("\n");
}

function downloadStatsText(fileName, text, mime = "text/plain") {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

function saveStatsSnapshot() {
  const model = buildStatsModel();
  const snapshot = buildStatsSnapshot(model);
  const snapshots = [snapshot, ...readStatsSnapshots()].slice(0, 40);
  writeStatsSnapshots(snapshots);
  renderStatsDashboard();
}

function exportStatsJson() {
  const model = buildStatsModel();
  const payload = {
    exportedAt: Date.now(),
    snapshot: buildStatsSnapshot(model),
    snapshots: readStatsSnapshots(),
    groups: model.groups,
  };

  downloadStatsText(`brmedia-stats-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2), "application/json");
}

function exportStatsCsv() {
  const model = buildStatsModel();
  downloadStatsText(`brmedia-stats-${new Date().toISOString().slice(0, 10)}.csv`, snapshotToCsv(buildStatsSnapshot(model)), "text/csv");
}

async function copyStatsSummary() {
  const text = statsSnapshotSummaryText(buildStatsModel());

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    downloadStatsText("brmedia-stats-summary.txt", text, "text/plain");
  }
}

function renderStatsReports(model) {
  const snapshots = readStatsSnapshots();
  const current = buildStatsSnapshot(model);
  const previous = snapshots[0] || null;
  const recentSnapshotRows = snapshots.slice(0, 10).map((snapshot) => ({
    label: formatDate(snapshot.capturedAt),
    value: snapshot.totalFiles,
    sub: `${formatBytes(snapshot.totalBytes)} · ${formatHours(snapshot.totalSeconds)}`,
  }));

  return `
    ${sectionHeaderHtml("Reports / Export", "Save snapshots, compare BRMedia growth over time, copy a quick text summary, or export JSON/CSV for backups and deeper checking.", "file-arrow-down")}

    <div class="statsMetricGrid">
      ${statCard("file-arrow-down", "Saved snapshots", numberFormat(snapshots.length), snapshots[0] ? `Latest: ${formatDate(snapshots[0].capturedAt)}` : "No snapshots saved yet")}
      ${statCard("database", "Current storage", formatBytes(current.totalBytes), `${numberFormat(current.totalFiles)} media files`)}
      ${statCard("clock", "Current runtime", formatHours(current.totalSeconds), "Audio + video")}
      ${statCard("broom", "Cleanup signals", numberFormat(current.needsMp4Count + current.duplicateGroups), "Needs MP4 + duplicate groups")}
    </div>

    <article class="statsPanel statsWidePanel">
      <div class="statsPanelHead"><span>${iconHtml("clipboard")}</span><div><strong>Report actions</strong><em>Useful before big patches, before moving PCs, or before a library cleanup.</em></div></div>
      <div class="statsReportActions">
        <button class="statsBtn primary" data-stats-save-snapshot type="button">${iconHtml("circle-check")}<span>Save snapshot</span></button>
        <button class="statsBtn" data-stats-export-json type="button">${iconHtml("file-arrow-down")}<span>Export JSON</span></button>
        <button class="statsBtn" data-stats-export-csv type="button">${iconHtml("chart-column")}<span>Export CSV</span></button>
        <button class="statsBtn" data-stats-copy-summary type="button">${iconHtml("clipboard")}<span>Copy summary</span></button>
      </div>
      <pre class="statsCodeBox">${escapeHtml(statsSnapshotSummaryText(model))}</pre>
    </article>

    ${statsSnapshotDeltaHtml(current, previous)}

    <div class="statsChartGrid">
      ${topTable("Recent snapshots", recentSnapshotRows, { icon: "clock", desc: "Saved local Stats snapshots", valueFormatter: (value) => `${numberFormat(value)} files` })}
      ${barList("Current report summary", [
        { label: "Audio files", value: current.audioCount },
        { label: "Video files", value: current.videoCount },
        { label: "Audio tagged", value: current.taggedCount },
        { label: "Audio artwork", value: current.artworkCount },
        { label: "Video metadata", value: current.videoMetadataCount },
        { label: "Video ratings", value: current.videoRatingCount },
        { label: "Needs MP4", value: current.needsMp4Count },
        { label: "Duplicates", value: current.duplicateGroups },
      ], { icon: "chart-column", desc: "Current snapshot counts", suffix: "items" })}
    </div>
  `;
}

function renderStatsSection(model) {
  switch (statsState.activeView) {
    case "activity": return renderStatsActivity(model);
    case "audio": return renderStatsAudio(model);
    case "video": return renderStatsVideo(model);
case "torrents": return renderStatsTorrents(model);
case "dj": return renderStatsDj(model);
case "library": return renderStatsLibrary(model);
    case "modules": return renderStatsModules(model);
    case "playback": return renderStatsPlayback(model);
    case "technical": return renderStatsTechnical(model);
    case "flags": return renderStatsFlags(model);
    case "health": return renderStatsHealth(model);
    case "reports": return renderStatsReports(model);
    default: return renderStatsOverview(model);
  }
}

function statsViewInfo(key = statsState.activeView) {
  return STATS_VIEWS.find((view) => view.key === key) || STATS_VIEWS[0];
}

function updateStatsSidebarActive() {
  document.querySelectorAll("[data-sidebar-stats-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.sidebarStatsView === statsState.activeView);
  });
}

function setStatsView(viewKey) {
  if (!STATS_VIEWS.some((view) => view.key === viewKey)) return;
  statsState.activeView = viewKey;
  try { localStorage.setItem("brmedia_stats_active_view_v1", viewKey); } catch {}
  renderStatsDashboard();
  statsRoot?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderStatsDashboard() {
  if (!statsRoot) return;
  if (statsState.loading) {
    statsRoot.innerHTML = `<div class="statsLoading"><span>${iconHtml("chart-line")}</span><strong>Building BRMedia stats…</strong><em>Reading audio, video, metadata, playback memory and browser stats.</em></div>`;
    hydrateBrIcons(statsRoot);
    return;
  }
  if (statsState.error) {
    statsRoot.innerHTML = `<div class="statsLoading isError"><span>${iconHtml("triangle-exclamation")}</span><strong>Stats failed</strong><em>${escapeHtml(statsState.error)}</em><button class="statsBtn" data-stats-refresh type="button">Try again</button></div>`;
    bindStatsEvents();
    hydrateBrIcons(statsRoot);
    updateStatsSidebarActive();
    return;
  }
  const model = buildStatsModel();
  const view = statsViewInfo();
  statsRoot.innerHTML = `
    <section class="statsDashboard">
      <div class="statsHeroPanel">
        <div>
          <span class="statsEyebrow">BRMedia analytics</span>
          <h2>${escapeHtml(view.title)}</h2>
          <p>${escapeHtml(view.desc)} Use the Stats menu to jump between sections instead of one massive dashboard page.</p>
        </div>
        <div class="statsHeroActions">
          <button class="statsBtn primary" data-stats-refresh type="button">${iconHtml("arrows-rotate")}<span>Refresh stats</span></button>
          <span class="statsUpdated">Updated ${escapeHtml(formatDate(statsState.lastUpdated))}</span>
        </div>
      </div>
      <div class="statsViewContent">${renderStatsSection(model)}</div>
    </section>
  `;
  bindStatsEvents();
  hydrateBrIcons(statsRoot);
  updateStatsSidebarActive();
}

function bindStatsEvents() {
  statsRoot?.querySelectorAll("[data-stats-refresh]").forEach((button) => {
    button.addEventListener("click", () => loadStatsData(true));
  });

  statsRoot?.querySelector("[data-stats-save-snapshot]")?.addEventListener("click", saveStatsSnapshot);
  statsRoot?.querySelector("[data-stats-export-json]")?.addEventListener("click", exportStatsJson);
  statsRoot?.querySelector("[data-stats-export-csv]")?.addEventListener("click", exportStatsCsv);
  statsRoot?.querySelector("[data-stats-copy-summary]")?.addEventListener("click", () => { void copyStatsSummary(); });

  document.querySelectorAll("[data-sidebar-stats-view]").forEach((button) => {
    button.onclick = () => {
      closeModuleSidebar();
      setStatsView(button.dataset.sidebarStatsView || "overview");
    };
  });
}

async function loadStatsData(force = false) {
  statsState.loading = true;
  statsState.error = "";
  renderStatsDashboard();

  try {
    const [
      library,
      videos,
      runtime,
      customTags,
      cloudLinked,
      copyJobs,
      converterJobs,
      masteringJobs,
      torrentState,
      eventSummary,
      eventStatus,
      events,
    ] = await Promise.all([
      fetchJson("/library?metadata=missing", { items: [] }),
      fetchJson(`/video-library${force ? "?refresh=1" : ""}`, { items: [] }),
      fetchJson("/player/runtime-state", { state: null, trackProgress: {} }),
      fetchJson("/brmedia/custom-tags", { tags: {} }),
      fetchJson("/cloud/linked-tracks", { items: [] }),
      fetchJson("/video-browser-copy-jobs", { jobs: [] }),
      fetchJson("/brmedia/converter/jobs", { jobs: [] }),
      fetchJson("/brmedia/mastering/jobs", { jobs: [] }),
      fetchJson("/torrent/state", { items: [] }),
      fetchJson("/stats/events/summary?limit=5000", {
        total: 0,
        today: 0,
        last7Days: 0,
        metrics: {},
        modules: [],
        types: [],
      }),
      fetchJson("/stats/events/status", {
        ok: true,
        exists: false,
        path: "server/data/stats-events.jsonl",
        sizeBytes: 0,
        totalLines: 0,
        validLines: 0,
        malformedLines: 0,
        lastEvent: null,
      }),
      fetchJson("/stats/events?limit=160", {
        events: [],
      }),
    ]);

    statsState.data.library = Array.isArray(library) ? library : Array.isArray(library?.items) ? library.items : [];
    statsState.data.videos = Array.isArray(videos) ? videos : Array.isArray(videos?.items) ? videos.items : [];
    statsState.data.runtime = runtime || {};
    statsState.data.customTags = customTags?.tags || {};
    statsState.data.cloudLinked = Array.isArray(cloudLinked?.items) ? cloudLinked.items : [];
    statsState.data.copyJobs = Array.isArray(copyJobs?.jobs) ? copyJobs.jobs : [];
    statsState.data.converterJobs = Array.isArray(converterJobs?.jobs) ? converterJobs.jobs : [];
    statsState.data.masteringJobs = Array.isArray(masteringJobs?.jobs) ? masteringJobs.jobs : [];
    statsState.data.torrentState = torrentState || {};
    statsState.data.eventSummary = eventSummary || {};
    statsState.data.eventStatus = eventStatus || {};
    statsState.data.events = Array.isArray(events?.events) ? events.events : [];
    statsState.data.local = readLocalStats();
    statsState.lastUpdated = Date.now();
  } catch (err) {
    statsState.error = err?.message || String(err);
  } finally {
    statsState.loading = false;
    renderStatsDashboard();
  }
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
moduleSearchBtn?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  closeModuleSidebar();
  statsRoot?.scrollIntoView({ behavior: "smooth", block: "start" });
});
document.querySelectorAll("[data-route]").forEach((button) => {
  button.addEventListener("click", () => goToRoute(button.dataset.route || "/"));
});
window.addEventListener("scroll", syncTopMenuDockState, { passive: true });
window.addEventListener("resize", syncTopMenuDockState);
window.addEventListener("DOMContentLoaded", () => {
  closeModuleSidebar();
  syncTopMenuDockState();
  startBrIconHydrator();
  bindStatsEvents();
  void loadStatsData(false);
});