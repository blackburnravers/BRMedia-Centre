const fs = require("fs");
const path = require("path");

const root = process.cwd();
const appPath = path.join(root, "server", "public", "mastering", "app.js");
const backupPath = path.join(root, "tools", "backups", "mastering-app.full-split-b1.js");

if (!fs.existsSync(appPath)) throw new Error(`Missing ${appPath}`);

const source = fs.readFileSync(appPath, "utf8");
if (!source.includes("function showMasteringTab") || !source.includes("function resetMastering")) {
  throw new Error("This does not look like the split B1 Mastering app.js. Aborting.");
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

  for (let i = start; i < source.length; i++) {
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

  for (let i = start; i < source.length; i++) {
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

const masteringFunctions = extract(
  "function showMasteringTab",
  "function fileToDataUrl"
)
  .replace(
    `    preserveMetadata: masteringPreserveMetadata?.checked !== false,\n  };`,
    `    preserveMetadata: masteringPreserveMetadata?.checked !== false,\n    intensity: getMasteringValue(masteringIntensity) || "50",\n    lowCut: getMasteringValue(masteringLowCut) || "20",\n    deHarsh: getMasteringValue(masteringDeHarsh) || "light",\n    air: getMasteringValue(masteringAir) || "1",\n  };`
  )
  .replace(
    `    masteringLimiterDrive,\n    masteringAddToLibrary,`,
    `    masteringLimiterDrive,\n    masteringIntensity,\n    masteringLowCut,\n    masteringDeHarsh,\n    masteringAir,\n    masteringAddToLibrary,`
  );

const libraryAndMiniFunctions = extract(
  "function normaliseModuleLibraryItems",
  "async function hydrateTaggerArtworkFromTrack"
)
  .replace(
    `moduleLibraryPickerState.target = ["converter", "mastering"].includes(target) ? target : "tagger";`,
    `moduleLibraryPickerState.target = "mastering";`
  )
  .replace(
    /moduleLibraryPickerTitle\.textContent = moduleLibraryPickerState\.target === "converter"[\s\S]*?: "Choose media for Tagger";/,
    `moduleLibraryPickerTitle.textContent = "Choose audio for Mastering";`
  )
  .replace(
    /moduleLibraryPickerSub\.textContent = moduleLibraryPickerState\.target === "converter"[\s\S]*?: "Pick any BRMedia library file to edit tags, artwork and BRMedia routing\.";/,
    `moduleLibraryPickerSub.textContent = "Pick any local BRMedia audio file to render a mastered copy.";`
  )
  .replace(
    /\n\s*if \(moduleLibraryPickerState\.target === "converter"\) \{[\s\S]*?\n\s*\}\n\s*\n\s*if \(moduleLibraryPickerState\.target === "mastering"\) \{[\s\S]*?\n\s*\}\n\s*\n\s*setTaggerLoadedTrack\(track, "Library file loaded in Tagger\."\);/,
    `\n  setMasteringSource(track, "Library file loaded in Mastering.");`
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

let selectedTrackForModule = null;
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
const moduleLibraryPickerState = { target: "mastering", items: [], query: "" };
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
  waveform: "waveform",
  download: "download",
  "gauge-high": "gauge-high",
  stars: "stars",
  sliders: "sliders",
  "sliders-up": "sliders-up",
  upload: "upload",
  "arrow-rotate-left": "arrow-rotate-left",
  folder: "folder",
  "folder-open": "folder-open",
  "magnifying-glass": "magnifying-glass",
  "circle-check": "circle-check",
  "circle-info": "circle-info",
  "circle-question": "circle-question",
  "triangle-exclamation": "triangle-exclamation",
  server: "server",
  gear: "gear-complex",
  film: "film",
  tags: "tags",
  "arrows-rotate": "arrow-rotate-right",
  "chart-column": "chart-column",
};

const brIconSvgCache = new Map();
let brIconObserver = null;
let brIconHydrationQueue = [];
let brIconHydrationTimer = null;

${iconFunctions}

${sharedFunctions}

${masteringFunctions}

${libraryAndMiniFunctions}

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

    setMasteringSource(track, "Selected file loaded in Mastering.");
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

document.body.classList.add("moduleToolLive", "moduleMasteringMode");

if (moduleEyebrow) moduleEyebrow.textContent = "BRMedia Mastering";
if (moduleTitle) moduleTitle.textContent = "Mastering";
if (moduleSubtitle) moduleSubtitle.textContent = "LANDR-style mastering, loudness targets, polish presets and final mastered copies.";
if (moduleComingSoonBody) moduleComingSoonBody.textContent = "Mastering can receive Player files, library files or uploads, then render a safe mastered copy with FFmpeg.";
if (moduleStatusTitle) moduleStatusTitle.textContent = "Master this file";
if (moduleStatusIcon) {
  moduleStatusIcon.innerHTML = '<i class="fa-solid fa-sliders"></i>';
  hydrateBrIcons(moduleStatusIcon);
}
if (moduleFooterCopy) moduleFooterCopy.textContent = "© The Blackburn Ravers • DJ NJ & Upalnite " + new Date().getFullYear();
document.title = "Mastering • BRMedia";
masteringPanel?.classList.remove("hidden");

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

resetMastering();
startBrIconHydrator();
void hydrateSelectedTrack();
void refreshModuleMiniPlayer();

window.setInterval(() => {
  if (!moduleMiniAudio || moduleMiniAudio.paused) void refreshModuleMiniPlayer();
}, 10000);
`;

fs.writeFileSync(appPath, clean, "utf8");
console.log("Cleaned server/public/mastering/app.js into a Mastering-only split file.");
console.log(`Backup kept at ${path.relative(root, backupPath)}`);