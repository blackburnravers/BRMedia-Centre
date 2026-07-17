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

const BRMEDIA_CUSTOM_TAGS_KEY = "brmedia_custom_tags_v1";
let selectedTrackForModule = null;
let taggerLoadedFileKey = "";
let taggerDeviceFile = null;
let taggerArtworkDataUrl = "";
let brMediaServerCustomTagStore = {};
let taggerMetadataRequestId = 0;
const moduleLibraryPickerState = { target: "tagger", items: [], query: "" };
const moduleMiniState = { items: [], queue: [], queueIndex: 0, track: null, stateLoadedAt: 0, userTouched: false };
const moduleSidebarScrollLock = { y: 0, startX: 0, startY: 0, dragging: false, movedAt: 0 };

const BR_ICON_BASE_PATH = "/player/branding/icons/";
const BR_ICON_CLASS_MAP = {
  bars: "list-music",
  "bars-staggered": "list-music",
  xmark: "xmark",
  headphones: "headphones",
  play: "play",
  pause: "pause",
  "backward-step": "backward-step",
  "forward-step": "forward-step",
  "file-audio": "file-audio",
  "mobile-screen-button": "mobile-screen-button",
  waveform: "waveform",
  download: "download",
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
  folder: "folder",
  "folder-open": "folder-open",
  "folder-plus": "folder-plus",
  "magnifying-glass": "magnifying-glass",
  "circle-check": "circle-check",
  "circle-info": "circle-info",
  "circle-question": "circle-question",
  "triangle-exclamation": "triangle-exclamation",
  gear: "gear-complex",
  server: "server",
  film: "film",
  sliders: "sliders",
  "arrows-rotate": "arrow-rotate-right",
  "chart-column": "chart-column",

  // BRMedia I1 shared icon aliases
  "right-left": "right-left",
  "backward-fast": "backward-fast",
  "file-export": "file-export",
  "file-video": "file-video",
  "wave-pulse": "wave-pulse",
  "gauge-high": "gauge-high",
  "chart-line": "chart-column",
  stars: "stars",
  star: "star",
  bolt: "bolt",
  "sliders-up": "sliders-up",
  "screwdriver-wrench": "gear-complex",
  video: "video",
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
  tv: "tv",
  "share-nodes": "share-nodes",
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
    moduleTrackOpenPlayer.href = `/player?trackId=${encodeURIComponent(track.id)}&autoplay=1`;
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
  moduleLibraryPickerState.target = "tagger";
  moduleLibraryPickerState.query = "";

  if (moduleLibraryPickerTitle) {
    moduleLibraryPickerTitle.textContent = "Choose media for Tagger";
  }

  if (moduleLibraryPickerSub) {
    moduleLibraryPickerSub.textContent = "Pick any BRMedia library file to edit tags, artwork and BRMedia routing.";
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
      ${data.item?.id ? `<a href="/player?trackId=${encodeURIComponent(data.item.id)}&autoplay=1">Open in Player</a>` : ""}
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

  taggerPanel?.classList.remove("hidden");

  if (!trackId || !moduleTrackPanel) {
    setTaggerStatus("Open Tagger from a Player/View Files item, choose from the library, or upload a file.", "");
    return;
  }

  moduleTrackPanel.classList.remove("hidden");
  if (moduleTrackTitle) moduleTrackTitle.textContent = "Loading selected file�";
  if (moduleTrackMeta) moduleTrackMeta.textContent = trackId;

  try {
    await refreshServerCustomTags();
    const items = await getLibraryItems();
    const track = items.find((item) => String(item.id) === String(trackId));

    if (!track) {
      if (moduleTrackTitle) moduleTrackTitle.textContent = "Selected file not found";
      if (moduleTrackMeta) moduleTrackMeta.textContent = `Track id: ${trackId}`;
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
    window.setTimeout(() => { moduleSidebarScrollLock.dragging = false; }, 260);
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

document.body.classList.add("moduleToolLive", "moduleTaggerMode");
if (moduleEyebrow) moduleEyebrow.textContent = "BRMedia Tagger";
if (moduleTitle) moduleTitle.textContent = "Tagger";
if (moduleSubtitle) moduleSubtitle.textContent = "Metadata, artwork, BRMedia custom tags and safe save modes.";
if (moduleComingSoonBody) moduleComingSoonBody.textContent = "Tagger can receive Player files, library files or uploads, then save BRMedia metadata and write safe tagged copies.";
if (moduleStatusTitle) moduleStatusTitle.textContent = "Tag this file";
if (moduleStatusIcon) {
  moduleStatusIcon.innerHTML = '<i class="fa-solid fa-tags"></i>';
  hydrateBrIcons(moduleStatusIcon);
}
if (moduleFooterCopy) moduleFooterCopy.textContent = `� The Blackburn Ravers � DJ NJ & Upalnite ${new Date().getFullYear()}`;
document.title = "Tagger � BRMedia";
taggerPanel?.classList.remove("hidden");

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
  if (path === window.location.pathname) link.classList.add("is-active");
  addModuleTapHandler(link, (e) => navigateModuleLink(e, link));
});

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
btnTaggerChooseLibrary?.addEventListener("click", () => { void openModuleLibraryPicker("tagger"); });
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
btnTaggerSave?.addEventListener("click", () => { void saveTaggerSidecarTags(); });
btnTaggerWriteCopy?.addEventListener("click", () => { void writeTaggerTaggedCopy({ download: false }); });
btnTaggerWriteDownload?.addEventListener("click", () => { void writeTaggerTaggedCopy({ download: true }); });
btnTaggerExportSidecar?.addEventListener("click", exportTaggerSidecar);
btnTaggerReset?.addEventListener("click", () => fillTaggerForm(selectedTrackForModule, {}));

document.querySelectorAll('input[name="taggerSaveMode"]').forEach((el) => {
  el.addEventListener("change", syncTaggerSaveModeUI);
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
syncTaggerSaveModeUI();
startBrIconHydrator();
void refreshServerCustomTags().finally(() => hydrateSelectedTrack());
void refreshModuleMiniPlayer();
window.setInterval(() => {
  if (!moduleMiniAudio || moduleMiniAudio.paused) void refreshModuleMiniPlayer();
}, 10000);
