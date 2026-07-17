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
    moduleTrackOpenPlayer.href = `/player?trackId=${encodeURIComponent(source.id)}&autoplay=1`;
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
      ? `<a href="/player?trackId=${encodeURIComponent(job.libraryItem.id)}&autoplay=1">Open converted file in Player</a>`
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

async function openModuleLibraryPicker() {
  moduleLibraryPickerState.target = "converter";
  moduleLibraryPickerState.query = "";

  if (moduleLibraryPickerTitle) moduleLibraryPickerTitle.textContent = "Choose media for Converter";
  if (moduleLibraryPickerSub) moduleLibraryPickerSub.textContent = "Pick any BRMedia library file to convert. Cloud-linked files must be imported locally first.";
  if (moduleLibraryPickerSearch) moduleLibraryPickerSearch.value = "";
  moduleLibraryPicker?.classList.remove("hidden");
  if (moduleLibraryPickerList) moduleLibraryPickerList.innerHTML = `<div class="moduleLibraryPickerEmpty">Loading BRMedia library…</div>`;

  try {
    await getModuleLibraryItems(true);
    renderModuleLibraryPicker();
    setTimeout(() => moduleLibraryPickerSearch?.focus?.(), 80);
  } catch (err) {
    console.warn("Could not load converter library picker", err);
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
  setConverterSource(track, "Library file loaded in Converter.");
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
