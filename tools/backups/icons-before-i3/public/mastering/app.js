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
  "download": "download",
  "gauge-high": "gauge-high",
  "chart-line": "chart-column",
  stars: "stars",
  sliders: "sliders",
  "sliders-up": "sliders-up",
  "wand-magic-sparkles": "wand-magic-sparkles",
  "wave-pulse": "wave-pulse",
  bolt: "bolt",
  video: "video",
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

  // BRMedia I1 shared icon aliases
  "right-left": "right-left",
  "backward-fast": "backward-fast",
  "file-export": "file-export",
  "file-music": "file-music",
  "file-pen": "file-pen",
  "file-video": "file-video",
  "mobile-screen-button": "mobile-screen-button",
  star: "star",
  tag: "tag",
  image: "image",
  "cloud-arrow-down": "cloud-arrow-down",
  "floppy-disk": "floppy-disk",
  album: "album",
  "music-note": "music-note",
  "list-music": "list-music",
  "list-ul": "list-ul",
  "id-card": "id-card",
  "chevron-down": "chevron-down",
  "compact-disc": "compact-disc",
  palette: "palette",
  "screwdriver-wrench": "gear-complex",
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
  "folder-plus": "folder-plus",
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
    moduleTrackOpenPlayer.href = `/player?trackId=${encodeURIComponent(source.id)}&autoplay=1`;
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
    intensity: getMasteringValue(masteringIntensity) || "50",
    lowCut: getMasteringValue(masteringLowCut) || "20",
    deHarsh: getMasteringValue(masteringDeHarsh) || "light",
    air: getMasteringValue(masteringAir) || "1",
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

function getMasteringReadyIconClass(mode = "") {
  if (mode === "ok") return "fa-circle-check";
  if (mode === "error" || mode === "warn") return "fa-triangle-exclamation";
  return "fa-circle-info";
}

function renderMasteringReadiness(payload = buildMasteringPayload()) {
  if (!masteringReadinessPanel) return;

  masteringReadinessPanel.innerHTML = getMasteringValidationItems(payload).map((item) => {
    const mode = item.mode || "info";

    return `
      <div class="masteringReadyItem" data-mode="${escapeHtml(mode)}">
        <i class="fa-solid ${getMasteringReadyIconClass(mode)}"></i>
        <span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.body)}</small></span>
      </div>
    `;
  }).join("");

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
    masteringIntensity,
    masteringLowCut,
    masteringDeHarsh,
    masteringAir,
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

    const masterPlayerUrl = job.libraryItem?.id ? `/player?trackId=${encodeURIComponent(job.libraryItem.id)}&autoplay=1` : "";
    const playerLink = masterPlayerUrl
      ? `<a class="moduleActionBtn primary" href="${masterPlayerUrl}"><i class="fa-solid fa-play"></i><span>Open master in Player</span></a>`
      : "";

    if (masteringResult) {
      masteringResult.innerHTML = `
        <strong>${escapeHtml(job.fileName || "Master complete")}</strong>
        <span>${escapeHtml(job.message || "Your mastered file is ready.")}</span>
        <div class="masteringResultActions">
          <a class="moduleActionBtn subtle" href="${escapeHtml(job.downloadUrl || "#")}"><i class="fa-solid fa-download"></i><span>Download master</span></a>
          ${playerLink}
        </div>
      `;
      hydrateBrIcons(masteringResult);
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
  moduleLibraryPickerState.target = "mastering";
  moduleLibraryPickerState.query = "";

  if (moduleLibraryPickerTitle) {
    moduleLibraryPickerTitle.textContent = "Choose audio for Mastering";
  }

  if (moduleLibraryPickerSub) {
    moduleLibraryPickerSub.textContent = "Pick any local BRMedia audio file to render a mastered copy.";
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
  setMasteringSource(track, "Library file loaded in Mastering.");
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
  moduleStatusIcon.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i>';
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
