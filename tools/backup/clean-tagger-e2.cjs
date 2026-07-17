const fs = require("fs");
const path = require("path");

const root = process.cwd();
const appPath = path.join(root, "server", "public", "tagger", "app.js");
const indexPath = path.join(root, "server", "public", "tagger", "index.html");
const backupPath = path.join(root, "tools", "backups", "tagger-app.full-split-e1.js");

if (!fs.existsSync(appPath)) throw new Error(`Missing ${appPath}`);

const source = fs.readFileSync(appPath, "utf8");

if (!source.includes("function setTaggerLoadedTrack") || !source.includes("function writeTaggerTaggedCopy")) {
  throw new Error("This does not look like the split E1 Tagger app.js. Aborting.");
}

function updateTaggerIndexCacheBust() {
  if (!fs.existsSync(indexPath)) return;

  const html = fs.readFileSync(indexPath, "utf8");
  const updatedHtml = html.replace(
    /\/tagger\/app\.js\?v=[^"]+/g,
    "/tagger/app.js?v=20260510-split-e2"
  );

  if (updatedHtml !== html) fs.writeFileSync(indexPath, updatedHtml, "utf8");
}

if (!source.includes("const converterPanel") && !source.includes("const masteringPanel") && !source.includes("const videoPanel")) {
  updateTaggerIndexCacheBust();
  console.log("Tagger app.js already looks cleaned for E2.");
  console.log("Updated tagger app.js cache-bust to v=20260510-split-e2.");
  process.exit(0);
}

if (!fs.existsSync(backupPath) && source.includes("const converterPanel")) {
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
  extractAsyncFn("refreshServerCustomTags"),
  extractFn("getTaggerCustomTagKeys"),
  extractFn("stripFileExtension"),
  extractFn("formatBytes"),
].join("\n\n");

const taggerFileFunctions = extract("function fileToDataUrl", "function writeVideoStorage")
  .replace(
    "moduleTrackOpenPlayer.href = `/player?trackId=${encodeURIComponent(track.id)}`;",
    "moduleTrackOpenPlayer.href = `/player?trackId=${encodeURIComponent(track.id)}&autoplay=1`;"
  );

let libraryAndMiniFunctions = extract("function normaliseModuleLibraryItems", "async function hydrateTaggerArtworkFromTrack");
libraryAndMiniFunctions = libraryAndMiniFunctions
  .replace(
    'moduleLibraryPickerState.target = ["converter", "mastering"].includes(target) ? target : "tagger";',
    'moduleLibraryPickerState.target = "tagger";'
  )
  .replace(
    /moduleLibraryPickerTitle\.textContent = moduleLibraryPickerState\.target === "converter"[\s\S]*?: "Choose media for Tagger";/,
    'moduleLibraryPickerTitle.textContent = "Choose media for Tagger";'
  )
  .replace(
    /moduleLibraryPickerSub\.textContent = moduleLibraryPickerState\.target === "converter"[\s\S]*?: "Pick any BRMedia library file to edit tags, artwork and BRMedia routing\.";/,
    'moduleLibraryPickerSub.textContent = "Pick any BRMedia library file to edit tags, artwork and BRMedia routing.";'
  )
  .replace(
    /\n\s*if \(moduleLibraryPickerState\.target === "converter"\) \{[\s\S]*?\n\s*\}\n\s*\n\s*if \(moduleLibraryPickerState\.target === "mastering"\) \{[\s\S]*?\n\s*\}\n\s*\n\s*setTaggerLoadedTrack\(track, "Library file loaded in Tagger\."\);/,
    '\n  setTaggerLoadedTrack(track, "Library file loaded in Tagger.");'
  );

const taggerMainFunctions = extract("async function hydrateTaggerArtworkFromTrack", "async function hydrateSelectedTrack")
  .replace(
    '${data.item?.id ? `<a href="/player?trackId=${encodeURIComponent(data.item.id)}">Open in Player</a>` : ""}',
    '${data.item?.id ? `<a href="/player?trackId=${encodeURIComponent(data.item.id)}&autoplay=1">Open in Player</a>` : ""}'
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
};

const brIconSvgCache = new Map();
let brIconObserver = null;
let brIconHydrationQueue = [];
let brIconHydrationTimer = null;

${iconFunctions}

${sharedFunctions}

${taggerFileFunctions}

${libraryAndMiniFunctions}

${taggerMainFunctions}

async function hydrateSelectedTrack() {
  const trackId = getTrackIdFromUrl();

  taggerPanel?.classList.remove("hidden");

  if (!trackId || !moduleTrackPanel) {
    setTaggerStatus("Open Tagger from a Player/View Files item, choose from the library, or upload a file.", "");
    return;
  }

  moduleTrackPanel.classList.remove("hidden");
  if (moduleTrackTitle) moduleTrackTitle.textContent = "Loading selected file…";
  if (moduleTrackMeta) moduleTrackMeta.textContent = trackId;

  try {
    await refreshServerCustomTags();
    const items = await getLibraryItems();
    const track = items.find((item) => String(item.id) === String(trackId));

    if (!track) {
      if (moduleTrackTitle) moduleTrackTitle.textContent = "Selected file not found";
      if (moduleTrackMeta) moduleTrackMeta.textContent = \`Track id: \${trackId}\`;
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
  const cleanUrl = \`\${window.location.origin}\${window.location.pathname}\`;
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
if (moduleFooterCopy) moduleFooterCopy.textContent = \`© The Blackburn Ravers • DJ NJ & Upalnite \${new Date().getFullYear()}\`;
document.title = "Tagger • BRMedia";
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
`;

fs.writeFileSync(appPath, clean, "utf8");
updateTaggerIndexCacheBust();

console.log("Cleaned server/public/tagger/app.js into a Tagger-only split file.");
console.log(`Backup kept at ${path.relative(root, backupPath)}`);
console.log("Updated tagger app.js cache-bust to v=20260510-split-e2.");