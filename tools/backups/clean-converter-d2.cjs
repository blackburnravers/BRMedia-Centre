const fs = require("fs");
const path = require("path");

const root = process.cwd();
const appPath = path.join(root, "server", "public", "converter", "app.js");
const indexPath = path.join(root, "server", "public", "converter", "index.html");
const backupPath = path.join(root, "tools", "backups", "converter-app.full-split-d1.js");

if (!fs.existsSync(appPath)) throw new Error(`Missing ${appPath}`);

const source = fs.readFileSync(appPath, "utf8");

if (!source.includes("function resetConverter") || !source.includes("function startConverterJob")) {
  throw new Error("This does not look like the split D1 Converter app.js. Aborting.");
}

function updateConverterIndexCacheBust() {
  if (!fs.existsSync(indexPath)) return;

  const html = fs.readFileSync(indexPath, "utf8");
  const updatedHtml = html.replace(
    /\/converter\/app\.js\?v=[^"]+/g,
    "/converter/app.js?v=20260510-split-d2"
  );

  if (updatedHtml !== html) fs.writeFileSync(indexPath, updatedHtml, "utf8");
}

if (!source.includes("const masteringPanel") && !source.includes("const taggerPanel") && !source.includes("const videoPanel")) {
  updateConverterIndexCacheBust();
  console.log("Converter app.js already looks cleaned for D2.");
  console.log("Updated converter app.js cache-bust to v=20260510-split-d2.");
  process.exit(0);
}

if (!fs.existsSync(backupPath) && source.includes("const masteringPanel")) {
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.writeFileSync(backupPath, source, "utf8");
}

function extract(startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  if (start < 0) throw new Error(`Missing start marker: ${startNeedle}`);

  const end = source.indexOf(endNeedle, start);
  if (end < 0) throw new Error(`Missing end marker after ${startNeedle}: ${endNeedle}`);

  return source.slice(start, end).trim();
}

function extractFn(name) {
  const startNeedle = `function ${name}`;
  const start = source.indexOf(startNeedle);
  if (start < 0) throw new Error(`Missing function ${name}`);

  let depth = 0;
  let seenBody = false;

  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];

    if (ch === "{") {
      depth += 1;
      seenBody = true;
    } else if (ch === "}") {
      depth -= 1;
      if (seenBody && depth === 0) return source.slice(start, i + 1).trim();
    }
  }

  throw new Error(`Could not extract function ${name}`);
}

function extractAsyncFn(name) {
  const startNeedle = `async function ${name}`;
  const start = source.indexOf(startNeedle);
  if (start < 0) throw new Error(`Missing async function ${name}`);

  let depth = 0;
  let seenBody = false;

  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];

    if (ch === "{") {
      depth += 1;
      seenBody = true;
    } else if (ch === "}") {
      depth -= 1;
      if (seenBody && depth === 0) return source.slice(start, i + 1).trim();
    }
  }

  throw new Error(`Could not extract async function ${name}`);
}

const iconFunctions = [
  extractFn("getBrIconNameFromElement"),
  extractAsyncFn("loadBrIconSvg"),
  extractFn("applyBrIconStateClasses"),
  extractAsyncFn("hydrateBrIcon"),
  extractFn("hydrateBrIcons"),
  extractFn("startBrIconHydrator"),
].join("\n\n");

const sharedFunctions = [
  extractFn("escapeHtml"),
  extractFn("normaliseSearchText"),
  extractFn("openModuleSidebar"),
  extractFn("closeModuleSidebar"),
  extractFn("syncModuleMenuDockState"),
  extractAsyncFn("getLibraryItems"),
  extractFn("getTrackIdFromUrl"),
  extractFn("formatTrackMeta"),
  extractFn("readJsonStorage"),
  extractFn("writeJsonStorage"),
  extractFn("stripFileExtension"),
  extractFn("formatBytes"),
].join("\n\n");

const converterFunctions = extract(
  "function isConverterAudioFormat",
  "function showMasteringTab"
)
  .replace(
    "moduleTrackOpenPlayer.href = `/player?trackId=${encodeURIComponent(source.id)}`;",
    "moduleTrackOpenPlayer.href = `/player?trackId=${encodeURIComponent(source.id)}&autoplay=1`;"
  )
  .replace(
    "? `<a href=\"/player?trackId=${encodeURIComponent(job.libraryItem.id)}\">Open converted file in Player</a>`",
    "? `<a href=\"/player?trackId=${encodeURIComponent(job.libraryItem.id)}&autoplay=1\">Open converted file in Player</a>`"
  );

const miniPlayerFunctions = extract(
  "function findModuleMiniTrackById",
  "async function hydrateTaggerArtworkFromTrack"
);

const tapHandler = extractFn("addModuleTapHandler");

const clean = `const moduleSearchBtn = document.querySelector(".moduleSearchBtn");
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

const CONVERTER_HISTORY_KEY = "brmedia_converter_history_v1";
let selectedTrackForModule = null;
const converterState = {
  kind: "audio",
  source: null,
  pendingFile: null,
  currentJobId: "",
  pollTimer: null,
  isRunning: false,
  activePreset: "",
};
const moduleLibraryPickerState = { target: "converter", items: [], query: "" };
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
  upload: "upload",
  "arrow-rotate-left": "arrow-rotate-left",
  folder: "folder",
  "folder-open": "folder-open",
  "folder-plus": "folder-plus",
  "magnifying-glass": "magnifying-glass",
  "circle-check": "circle-check",
  "circle-info": "circle-info",
  "circle-question": "circle-question",
  "triangle-exclamation": "triangle-exclamation",
  server: "server",
  gear: "gear-complex",
  film: "film",
  tags: "tags",
  sliders: "sliders",
  "chart-column": "chart-column",
};

const brIconSvgCache = new Map();
let brIconObserver = null;
let brIconHydrationQueue = [];
let brIconHydrationTimer = null;

${iconFunctions}

${sharedFunctions}

${converterFunctions}

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

  if (!res.ok) throw new Error(data?.error || \`Library request failed (\${res.status})\`);

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
    moduleLibraryPickerList.innerHTML = \`<div class="moduleLibraryPickerEmpty">No BRMedia library files matched that search.</div>\`;
    return;
  }

  moduleLibraryPickerList.innerHTML = items.map((item) => {
    const isVideo = String(item.mimeType || item.type || item.locator || "").toLowerCase().includes("video");
    const title = item.title || item.name || item.fileName || item.id;
    const meta = formatTrackMeta(item);
    return \`
      <button class="moduleLibraryPickerItem" type="button" data-library-id="\${escapeHtml(item.id)}">
        <span class="moduleLibraryPickerItemIcon"><i class="fa-solid \${isVideo ? "fa-video" : "fa-file-audio"}"></i></span>
        <span>
          <strong>\${escapeHtml(title)}</strong>
          <span>\${escapeHtml(meta)}</span>
        </span>
        <span class="moduleLibraryPickerUse">Use file</span>
      </button>
    \`;
  }).join("");

  hydrateBrIcons(moduleLibraryPickerList);
}

async function openModuleLibraryPicker() {
  moduleLibraryPickerState.target = "converter";
  moduleLibraryPickerState.query = "";

  if (moduleLibraryPickerTitle) moduleLibraryPickerTitle.textContent = "Choose media for Converter";
  if (moduleLibraryPickerSub) moduleLibraryPickerSub.textContent = "Pick any BRMedia library file to convert. Cloud-linked files must be imported locally first.";
  if (moduleLibraryPickerSearch) moduleLibraryPickerSearch.value = "";
  moduleLibraryPicker?.classList.remove("hidden");
  if (moduleLibraryPickerList) moduleLibraryPickerList.innerHTML = \`<div class="moduleLibraryPickerEmpty">Loading BRMedia library…</div>\`;

  try {
    await getModuleLibraryItems(true);
    renderModuleLibraryPicker();
    setTimeout(() => moduleLibraryPickerSearch?.focus?.(), 80);
  } catch (err) {
    console.warn("Could not load converter library picker", err);
    if (moduleLibraryPickerList) {
      moduleLibraryPickerList.innerHTML = \`<div class="moduleLibraryPickerEmpty">\${escapeHtml(err?.message || "Could not load BRMedia library.")}</div>\`;
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
  setConverterSource(track, "Library file loaded in Converter.");
}

${miniPlayerFunctions}

async function hydrateSelectedTrack() {
  const trackId = getTrackIdFromUrl();
  if (!trackId || !moduleTrackPanel) return;

  moduleTrackPanel.classList.remove("hidden");
  if (moduleTrackTitle) moduleTrackTitle.textContent = "Loading selected file…";
  if (moduleTrackMeta) moduleTrackMeta.textContent = trackId;

  try {
    const items = await getLibraryItems();
    const track = items.find((item) => String(item.id) === String(trackId));

    if (!track) {
      if (moduleTrackTitle) moduleTrackTitle.textContent = "Selected file not found";
      if (moduleTrackMeta) moduleTrackMeta.textContent = "Track id: " + trackId;
      return;
    }

    setConverterSource(track, "Selected file loaded in Converter.");
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

${tapHandler}

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
  const cleanUrl = window.location.origin + window.location.pathname;
  window.history.replaceState({}, "", cleanUrl);
  moduleTrackPanel?.classList.add("hidden");
});

document.body.classList.add("moduleToolLive", "moduleConverterMode");

if (moduleEyebrow) moduleEyebrow.textContent = "BRMedia Converter";
if (moduleTitle) moduleTitle.textContent = "Converter";
if (moduleSubtitle) moduleSubtitle.textContent = "Audio and video conversion, queues, presets, and output rules.";
if (moduleComingSoonBody) moduleComingSoonBody.textContent = "Converter can receive Player files, library files or uploads, then render a safe converted copy with FFmpeg.";
if (moduleStatusTitle) moduleStatusTitle.textContent = "Convert this file";
if (moduleStatusIcon) {
  moduleStatusIcon.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i>';
  hydrateBrIcons(moduleStatusIcon);
}
if (moduleFooterCopy) moduleFooterCopy.textContent = "© The Blackburn Ravers • DJ NJ & Upalnite " + new Date().getFullYear();
document.title = "Converter • BRMedia";
converterPanel?.classList.remove("hidden");

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

btnConverterPickDevice?.addEventListener("click", () => converterDeviceFileInput?.click());
btnConverterUseSelected?.addEventListener("click", () => void openModuleLibraryPicker());

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

btnConverterStart?.addEventListener("click", () => void startConverterJob());
btnConverterReset?.addEventListener("click", resetConverter);
btnConverterCancel?.addEventListener("click", () => void cancelConverterJob());

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

btnModuleMiniPlay?.addEventListener("click", () => void toggleModuleMiniPlayback());
btnModuleMiniPrev?.addEventListener("click", () => jumpModuleMiniQueue(-1));
btnModuleMiniNext?.addEventListener("click", () => jumpModuleMiniQueue(1));
moduleMiniAudio?.addEventListener("timeupdate", updateModuleMiniProgress);
moduleMiniAudio?.addEventListener("play", updateModuleMiniProgress);
moduleMiniAudio?.addEventListener("pause", updateModuleMiniProgress);
moduleMiniAudio?.addEventListener("ended", () => jumpModuleMiniQueue(1));

converterPanel?.addEventListener("input", updateConverterPreview);
converterPanel?.addEventListener("change", updateConverterPreview);

resetConverter();
startBrIconHydrator();
void hydrateSelectedTrack();
void refreshModuleMiniPlayer();

window.setInterval(() => {
  if (!moduleMiniAudio || moduleMiniAudio.paused) void refreshModuleMiniPlayer();
}, 10000);
`;

fs.writeFileSync(appPath, clean, "utf8");
updateConverterIndexCacheBust();

console.log("Cleaned server/public/converter/app.js into a Converter-only split file.");
console.log(`Backup kept at ${path.relative(root, backupPath)}`);
console.log("Updated converter app.js cache-bust to v=20260510-split-d2.");