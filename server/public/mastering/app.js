const $ = (id) => document.getElementById(id);

const moduleSearchBtn = document.querySelector(".moduleSearchBtn");
const btnModuleMenu = $("btnModuleMenu");
const moduleSidebar = $("moduleSidebar");
const moduleSidebarBackdrop = $("moduleSidebarBackdrop");
const btnModuleSidebarCloseFloating = $("btnModuleSidebarCloseFloating");
const masteringRoot = $("masteringRoot");

const moduleSidebarScrollLock = { y: 0 };
const BR_ICON_BASE_PATHS = ["/shared/icons/fa-duotone/", "/shared/icons/brands/", "/player/branding/icons/"];
const BR_ICON_CLASS_MAP = {
  bars: "list-music",
  xmark: "xmark",
  music: "music",
  tag: "tag",
  video: "video",
  server: "server",
  gear: "gear-complex",
  sliders: "sliders",
  "chart-pie": "chart-column",
  "chart-column": "chart-column",
  "magnifying-glass": "magnifying-glass",
  "wand-magic-sparkles": "wand-magic-sparkles",
  waveform: "waveform",
  "folder-open": "folder-open",
  "folder-plus": "folder-plus",
  rocket: "rocket",
  download: "download",
  play: "play",
  pause: "pause",
  "circle-check": "circle-check",
  "triangle-exclamation": "triangle-exclamation",
  "gauge-high": "gauge-high",
  "chart-line": "chart-line",
  "sliders-simple": "sliders",
  headphones: "headphones",
  metronome: "metronome",
  piano: "piano-keyboard",
};

const MASTERING_TABS = [
  { key: "source", title: "Source", desc: "Choose a file from BRMedia or browse this phone / PC.", icon: "folder-open" },
  { key: "analyse", title: "Analyse", desc: "Read loudness, peak, dynamics and warnings before touching the file.", icon: "chart-line" },
  { key: "presets", title: "Presets", desc: "Newbie-friendly mastering chains with pro defaults.", icon: "wand-magic-sparkles" },
  { key: "chain", title: "Chain", desc: "Advanced controls for loudness, EQ, stereo, de-harsh and limiter.", icon: "sliders" },
  { key: "keybpm", title: "Key/BPM", desc: "Change key, BPM and plugin-style colour before previewing.", icon: "gauge-high" },
  { key: "compare", title: "Compare", desc: "Before/after waveform wall and target-level preview.", icon: "waveform" },
  { key: "render", title: "Render", desc: "Create the non-destructive mastered copy.", icon: "rocket" },
  { key: "results", title: "Results", desc: "Download or send the master to Player, Tagger or Converter.", icon: "circle-check" },
];

const MASTERING_PRESETS = [
  {
    key: "streaming-clean",
    title: "Streaming Clean",
    sub: "Balanced, clean, safe first master for online playback.",
    icon: "headphones",
    tone: "Clean",
    options: { preset: "streaming-clean", targetLufs: "-14", truePeak: "-1.5", compression: "medium", stereoWidth: "1.08", bass: "1", warmth: "1", brightness: "1", limiterDrive: "1", intensity: "50", lowCut: "20", deHarsh: "light", air: "1" },
  },
  {
    key: "club-loud",
    title: "Club Loud",
    sub: "Louder, punchier and upfront for rave/club testing.",
    icon: "gauge-high",
    tone: "Loud",
    options: { preset: "club-loud", targetLufs: "-10", truePeak: "-1", compression: "hard", stereoWidth: "1.18", bass: "2", warmth: "1", brightness: "2", limiterDrive: "2", intensity: "75", lowCut: "30", deHarsh: "medium", air: "1" },
  },
  {
    key: "warm-depth",
    title: "Warm Depth",
    sub: "Smoother low-mid polish with more body and less bite.",
    icon: "compact-disc",
    tone: "Warm",
    options: { preset: "warm-depth", targetLufs: "-14", truePeak: "-1.5", compression: "gentle", stereoWidth: "1.08", bass: "2", warmth: "2", brightness: "1", limiterDrive: "1", intensity: "50", lowCut: "20", deHarsh: "light", air: "1" },
  },
  {
    key: "hardcore-punch",
    title: "Hardcore Punch",
    sub: "Tighter kick, stronger limiter and brighter edge for hardcore mixes.",
    icon: "bolt",
    tone: "Punch",
    options: { preset: "hardcore-punch", targetLufs: "-9", truePeak: "-0.6", compression: "hard", stereoWidth: "1.18", bass: "3", warmth: "1", brightness: "3", limiterDrive: "3", intensity: "100", lowCut: "30", deHarsh: "medium", air: "2" },
  },
];

const state = {
  library: [],
  selectedTrackId: "",
  uploadedSource: null,
  activeTab: "source",
  analysis: null,
  job: null,
  busy: false,
  analysisProgress: null,
  search: "",
  selectedPresetKey: "streaming-clean",
  options: {
    outputFormat: "mp3",
    outputName: "BRMedia Master",
    preset: "streaming-clean",
    targetLufs: "-14",
    truePeak: "-1.5",
    compression: "medium",
    stereoWidth: "1.08",
    bass: "1",
    warmth: "1",
    brightness: "1",
    limiterDrive: "1",
    intensity: "50",
    lowCut: "20",
    deHarsh: "light",
    air: "1",
    outputBitrate: "320k",
    sampleRate: "",
    channels: "",
    wavBitDepth: "24",
    flacCompression: "8",
    addToLibrary: true,
    preserveMetadata: true,
    keyShiftSemitones: "0",
    bpmChangePercent: "0",
    bpmControlMode: "percent",
    sourceBpm: "",
    targetBpm: "",
    bpmMode: "keep-pitch",
    keyTempoEngine: "safe",
    clubPunch: "0",
    driveSaturation: "0",
    presenceBite: "0",
    subWarmth: "0",
    stereoGlue: "0",
  },
};

let masteringPollTimer = 0;
let masteringAnalysisProgressTimer = 0;
const brIconSvgCache = new Map();
let brIconHydrationQueue = [];
let brIconHydrationTimer = null;

function escapeHtml(value = "") {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function iconHtml(name = "circle") {
  return `<i class="fa-solid fa-${escapeHtml(name)}"></i>`;
}

function getBrIconNameFromElement(el) {
  if (!el || !el.classList) return "";
  const ignored = ["fa-solid", "fa-regular", "fa-brands", "fa-duotone", "fa-light", "fa-thin", "fa-sharp", "fa-spin", "fa-pulse", "fa-fw", "fa-lg", "fa-xl", "fa-2x"];
  const iconClass = Array.from(el.classList).find((className) => className.startsWith("fa-") && !ignored.includes(className));
  return iconClass ? iconClass.replace(/^fa-/, "") : "";
}

function getBrIconSvgName(iconName = "") {
  return BR_ICON_CLASS_MAP[iconName] || iconName || "";
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
  el.classList.add("brSvgIconHost");
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
    const batch = brIconHydrationQueue.splice(0, 10);
    batch.forEach((node) => void hydrateBrIcon(node));
    if (brIconHydrationQueue.length) {
      brIconHydrationTimer = window.setTimeout(runBatch, 35);
      return;
    }
    brIconHydrationTimer = null;
  };
  brIconHydrationTimer = window.setTimeout(runBatch, 90);
}

function fmtBytes(bytes = 0) {
  const n = Number(bytes) || 0;
  if (!n) return "—";
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function fmtDuration(seconds = 0) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function masteringProgressPill(label, value) {
  if (!value) return "";
  return `<span><b>${escapeHtml(label)}</b><em>${escapeHtml(value)}</em></span>`;
}

function renderMasteringProgress(job = {}) {
  const progress = job?.ffmpegProgress || {};
  const pills = [
    masteringProgressPill("Status", job?.status || "ready"),
    masteringProgressPill("Processed", progress.time || ""),
    masteringProgressPill("Size", progress.size || ""),
    masteringProgressPill("Bitrate", progress.bitrate || ""),
    masteringProgressPill("Speed", progress.speed || ""),
    masteringProgressPill("Elapsed", progress.elapsed || ""),
  ].filter(Boolean).join("");

  if (!pills && !(job?.technicalLog || job?.debugMessage)) return "";

  return `
    <div class="masteringProgressGrid">${pills}</div>
    ${job?.technicalLog || job?.debugMessage ? `
      <details class="masteringTechnicalLog">
        <summary>Show technical log</summary>
        <pre>${escapeHtml(job.technicalLog || job.debugMessage || "")}</pre>
      </details>
    ` : ""}
  `;
}

function readQueryParam(key) {
  return new URLSearchParams(window.location.search || "").get(key) || "";
}

async function apiJson(url, options = {}) {
  const res = await fetch(url, {
    cache: "no-store",
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData) && !(options.body instanceof Blob) && !(options.body instanceof File) ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.detail || `HTTP ${res.status}`);
  return data;
}

function setBusy(next) {
  state.busy = !!next;
  document.body.classList.toggle("masteringBusy", state.busy);
}

function setStatus(message, type = "") {
  const el = $("masteringStatus");
  if (!el) return;
  el.className = `masteringStatus ${type ? `is-${type}` : ""}`;
  el.textContent = message || "Ready.";
}

function getTrackTitle(track = {}) {
  return track.title || track.name || track.filename || track.id || "Untitled";
}

function isLocalTrack(track = {}) {
  return String(track.source || "").toLowerCase() === "local" && !!track.locator;
}

function getSelectedTrack() {
  return state.library.find((item) => String(item.id) === String(state.selectedTrackId)) || null;
}

function getMasteringSourceBody() {
  if (state.uploadedSource?.id) return { uploadId: state.uploadedSource.id };
  return { trackId: state.selectedTrackId };
}

function hasMasteringSource() {
  return !!state.uploadedSource?.id || !!state.selectedTrackId;
}

function getActiveSourceLabel() {
  if (state.uploadedSource?.id) return state.uploadedSource.fileName || state.uploadedSource.title || "Uploaded source";
  const track = getSelectedTrack();
  if (track) return getTrackTitle(track);
  return "Choose a source";
}

function getMetricValue(key) {
  return state.analysis?.metrics?.[key];
}

function metricText(value, suffix = "") {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${value.toFixed(value % 1 ? 1 : 0)}${suffix}`;
}

async function loadLibrary() {
  const data = await apiJson("/library").catch(() => []);
  const items = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : Array.isArray(data.tracks) ? data.tracks : [];
  state.library = items.filter((item) => isLocalTrack(item));
  return state.library;
}

async function uploadMasteringFile(file) {
  if (!file) return;
  setBusy(true);
  setStatus(`Uploading ${file.name || "selected file"}…`, "loading");
  try {
    const result = await apiJson(`/brmedia/mastering/upload?name=${encodeURIComponent(file.name || "mastering-upload")}`, {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    state.uploadedSource = result.source || null;
    state.selectedTrackId = "";
    state.analysis = null;
    state.job = null;
    state.activeTab = "analyse";
    renderMastering();
    setStatus(`Uploaded ${state.uploadedSource?.fileName || file.name}. Run analysis next.`, "success");
  } catch (err) {
    setStatus(`Upload failed: ${err.message || err}`, "error");
  } finally {
    setBusy(false);
    const input = $("masteringUploadInput");
    if (input) input.value = "";
  }
}

function formatConfidence(value) {
  const score = Number(value || 0);
  if (!Number.isFinite(score) || score <= 0) return "unknown";
  if (score >= 0.85) return "high";
  if (score >= 0.5) return "medium";
  return "rough";
}

function getTempoKeyAnalysis() {
  return state.analysis?.tempoKey || {};
}

function clearAnalysisProgressTimer() {
  if (masteringAnalysisProgressTimer) window.clearInterval(masteringAnalysisProgressTimer);
  masteringAnalysisProgressTimer = 0;
}

function startAnalysisProgress() {
  clearAnalysisProgressTimer();
  const startedAt = Date.now();
  const stages = [
    { at: 8, title: "Preparing source", body: "Checking the selected file and reading basic metadata." },
    { at: 24, title: "Reading loudness", body: "Running LUFS, true peak, loudness range and max volume checks." },
    { at: 48, title: "Estimating BPM", body: "Sampling the audio and looking for tempo patterns." },
    { at: 68, title: "Estimating key", body: "Checking harmonic content and embedded key tags." },
    { at: 86, title: "Building recommendation", body: "Creating warnings and choosing a safe first mastering preset." },
  ];

  const tick = () => {
    const elapsed = (Date.now() - startedAt) / 1000;
    const percent = Math.min(92, Math.round(8 + elapsed * 7));
    const stage = [...stages].reverse().find((item) => percent >= item.at) || stages[0];
    state.analysisProgress = { ...stage, percent, mode: "running" };
    renderMastering();
  };

  state.analysisProgress = { ...stages[0], percent: 8, mode: "running" };
  tick();
  masteringAnalysisProgressTimer = window.setInterval(tick, 1200);
}

function finishAnalysisProgress(mode, title, body) {
  clearAnalysisProgressTimer();
  state.analysisProgress = { mode, title, body, percent: 100 };
}

function renderAnalysisProgressBox() {
  const progress = state.analysisProgress;
  if (!progress) return "";
  const percent = Math.max(0, Math.min(100, Number(progress.percent || 0)));
  return `
    <div class="masteringAnalysisProgress ${escapeHtml(progress.mode || "running")}">
      <div class="masteringAnalysisProgressHead">
        <span>${iconHtml(progress.mode === "success" ? "circle-check" : progress.mode === "error" ? "triangle-exclamation" : "chart-line")}</span>
        <div><strong>${escapeHtml(progress.title || "Analysing source")}</strong><p>${escapeHtml(progress.body || "Please keep this page open while BRMedia checks the file.")}</p></div>
        <b>${Math.round(percent)}%</b>
      </div>
      <div class="masteringAnalysisProgressTrack"><i style="width:${percent}%"></i></div>
    </div>
  `;
}

function normaliseBpmText(value) {
  const raw = Number(value);
  if (!Number.isFinite(raw) || raw <= 0) return "";
  return String(Number(Math.max(1, Math.min(300, raw)).toFixed(2)));
}

function getCalculatedBpmPercent(sourceBpm = state.options.sourceBpm, targetBpm = state.options.targetBpm) {
  const source = Number(sourceBpm);
  const target = Number(targetBpm);
  if (!Number.isFinite(source) || !Number.isFinite(target) || source <= 0 || target <= 0) return "0";
  return String(Number((((target / source) - 1) * 100).toFixed(4)));
}

function getTargetBpmFromPercent(sourceBpm = state.options.sourceBpm, percent = state.options.bpmChangePercent) {
  const source = Number(sourceBpm);
  const change = Number(percent);
  if (!Number.isFinite(source) || !Number.isFinite(change) || source <= 0) return "";
  return String(Number((source * (1 + change / 100)).toFixed(2)));
}

function applyAnalysisTempoKeyToOptions() {
  const tempoKey = getTempoKeyAnalysis();
  if (tempoKey?.bpm) {
    state.options.sourceBpm = normaliseBpmText(tempoKey.bpm);
    if (!state.options.targetBpm) state.options.targetBpm = state.options.sourceBpm;
    if (state.options.bpmControlMode === "target") state.options.bpmChangePercent = getCalculatedBpmPercent();
  }
  state.options.detectedKey = tempoKey?.key || "";
}

function updateBpmTargetMode(sourceValue, targetValue) {
  state.options.bpmControlMode = "target";
  state.options.sourceBpm = normaliseBpmText(sourceValue);
  state.options.targetBpm = normaliseBpmText(targetValue);
  state.options.bpmChangePercent = getCalculatedBpmPercent(state.options.sourceBpm, state.options.targetBpm);
}

function updateBpmPercentMode(percentValue) {
  state.options.bpmControlMode = "percent";
  state.options.bpmChangePercent = String(percentValue || "0");
  state.options.targetBpm = getTargetBpmFromPercent();
}

async function runAnalysis() {
  if (!hasMasteringSource()) {
    state.activeTab = "source";
    renderMastering();
    setStatus("Choose a source file first.", "error");
    return;
  }
  setBusy(true);
  state.activeTab = "analyse";
  startAnalysisProgress();
  setStatus("Analysing source with FFmpeg loudness, BPM and key tools…", "loading");
  try {
    const result = await apiJson("/brmedia/mastering/analyse", {
      method: "POST",
      body: JSON.stringify(getMasteringSourceBody()),
    });
    state.analysis = result.analysis || null;
    applyAnalysisTempoKeyToOptions();
    const recommended = state.analysis?.recommendation?.preset;
    if (recommended) applyPreset(recommended, { silent: true });
    finishAnalysisProgress("success", "Analysis complete", "LUFS, true peak, BPM, key and recommendation are ready.");
    setStatus("Analysis complete. Recommendation loaded.", "success");
  } catch (err) {
    finishAnalysisProgress("error", "Analysis failed", err.message || String(err || "Unknown error"));
    setStatus(`Analysis failed: ${err.message || err}`, "error");
  } finally {
    setBusy(false);
    renderMastering();
  }
}

function applyPreset(key, opts = {}) {
  const preset = MASTERING_PRESETS.find((item) => item.key === key) || MASTERING_PRESETS[0];
  state.selectedPresetKey = preset.key;
  state.options = { ...state.options, ...preset.options };
  if (!opts.silent) setStatus(`${preset.title} preset loaded.`, "success");
  renderMastering();
}

function updateOption(key, value) {
  if (key === "bpmControlMode" && value === "target") updateBpmTargetMode(state.options.sourceBpm, state.options.targetBpm);
  else if (key === "bpmControlMode" && value === "percent") updateBpmPercentMode(state.options.bpmChangePercent);
  else state.options[key] = value;
  const matchedPreset = MASTERING_PRESETS.find((preset) => Object.entries(preset.options || {}).every(([k, v]) => String(state.options[k] ?? "") === String(v ?? "")));
  state.selectedPresetKey = matchedPreset?.key || "custom";
  renderMastering();
}

function buildJobPayload(extra = {}) {
  return {
    ...getMasteringSourceBody(),
    ...state.options,
    ...extra,
    addToLibrary: extra.addToLibrary ?? !!state.options.addToLibrary,
    preserveMetadata: !!state.options.preserveMetadata,
  };
}

async function startMasteringPreview(previewLengthSeconds = 30) {
  if (!hasMasteringSource()) {
    state.activeTab = "source";
    renderMastering();
    setStatus("Choose a source file first.", "error");
    return;
  }
  const previewLength = Math.max(20, Math.min(45, Number(previewLengthSeconds) || 30));
  setBusy(true);
  state.activeTab = "compare";
  renderMastering();
  setStatus(`Starting ${previewLength}s preview render…`, "loading");
  try {
    const result = await apiJson("/brmedia/mastering/jobs", {
      method: "POST",
      body: JSON.stringify(buildJobPayload({
        previewLengthSeconds: previewLength,
        addToLibrary: false,
        outputName: `BRMedia Preview ${previewLength}s`,
      })),
    });
    state.job = result.job || null;
    renderMastering();
    pollMasteringJob();
  } catch (err) {
    setStatus(`Could not start preview: ${err.message || err}`, "error");
  } finally {
    setBusy(false);
  }
}

async function startMasteringJob() {
  if (!hasMasteringSource()) {
    state.activeTab = "source";
    renderMastering();
    setStatus("Choose a source file first.", "error");
    return;
  }
  setBusy(true);
  state.activeTab = "render";
  renderMastering();
  setStatus("Starting mastering render…", "loading");
  try {
    const result = await apiJson("/brmedia/mastering/jobs", {
      method: "POST",
      body: JSON.stringify(buildJobPayload()),
    });
    state.job = result.job || null;
    renderMastering();
    pollMasteringJob();
  } catch (err) {
    setStatus(`Could not start mastering: ${err.message || err}`, "error");
  } finally {
    setBusy(false);
  }
}

async function pollMasteringJob() {
  window.clearTimeout(masteringPollTimer);
  if (!state.job?.id) return;
  try {
    const result = await apiJson(`/brmedia/mastering/jobs/${encodeURIComponent(state.job.id)}`);
    state.job = result.job || state.job;
    renderMastering();
    if (["queued", "running"].includes(String(state.job.status || ""))) {
      setStatus(state.job.message || "Mastering running…", "loading");
      masteringPollTimer = window.setTimeout(pollMasteringJob, 1200);
      return;
    }
    if (state.job.status === "done") {
      state.activeTab = state.job.previewLengthSeconds ? "compare" : "results";
      renderMastering();
      setStatus(state.job.message || (state.job.previewLengthSeconds ? "Preview render complete." : "Mastering complete."), "success");
      return;
    }
    if (state.job.status === "cancelled") setStatus("Mastering cancelled.", "");
    else setStatus(state.job.error || state.job.message || "Mastering failed.", "error");
  } catch (err) {
    setStatus(`Could not read mastering job: ${err.message || err}`, "error");
  }
}

async function cancelMasteringJob() {
  if (!state.job?.id) return;
  setBusy(true);
  try {
    const result = await apiJson(`/brmedia/mastering/jobs/${encodeURIComponent(state.job.id)}/cancel`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    state.job = result.job || state.job;
    renderMastering();
    setStatus("Cancelling mastering render…", "loading");
  } catch (err) {
    setStatus(`Cancel failed: ${err.message || err}`, "error");
  } finally {
    setBusy(false);
  }
}

function fieldSelect(key, label, options, hint = "") {
  return `
    <label class="masteringField">
      <span>${escapeHtml(label)}</span>
      <select data-mastering-option="${escapeHtml(key)}">
        ${options.map(([value, text]) => `<option value="${escapeHtml(value)}" ${String(state.options[key]) === String(value) ? "selected" : ""}>${escapeHtml(text)}</option>`).join("")}
      </select>
      ${hint ? `<em>${escapeHtml(hint)}</em>` : ""}
    </label>
  `;
}

function fieldRange(key, label, min, max, step, unit = "", hint = "") {
  const value = String(state.options[key] ?? "0");
  const liveKey = key === "bpmChangePercent" ? "bpmChangePercent" : key;
  return `
    <label class="masteringField masteringRangeField">
      <span>${escapeHtml(label)}</span>
      <div class="masteringRangeRow">
        <input class="masteringRange" data-mastering-option="${escapeHtml(key)}" data-mastering-live-option="${escapeHtml(liveKey)}" type="range" min="${escapeHtml(min)}" max="${escapeHtml(max)}" step="${escapeHtml(step)}" value="${escapeHtml(value)}" />
        <input class="masteringNumber" data-mastering-option="${escapeHtml(key)}" data-mastering-live-option="${escapeHtml(liveKey)}" type="number" min="${escapeHtml(min)}" max="${escapeHtml(max)}" step="${escapeHtml(step)}" value="${escapeHtml(value)}" />
        ${unit ? `<b>${escapeHtml(unit)}</b>` : ""}
      </div>
      ${hint ? `<em>${escapeHtml(hint)}</em>` : ""}
    </label>
  `;
}

function fieldNumber(key, label, min, max, step, unit = "", hint = "", extraAttrs = "") {
  const value = String(state.options[key] ?? "");
  return `
    <label class="masteringField masteringNumberField">
      <span>${escapeHtml(label)}</span>
      <div class="masteringRangeRow masteringNumberOnlyRow">
        <input id="${key === "sourceBpm" ? "masteringSourceBpmInput" : key === "targetBpm" ? "masteringTargetBpmInput" : ""}" class="masteringNumber" data-mastering-option="${escapeHtml(key)}" ${extraAttrs} type="number" min="${escapeHtml(min)}" max="${escapeHtml(max)}" step="${escapeHtml(step)}" value="${escapeHtml(value)}" />
        ${unit ? `<b>${escapeHtml(unit)}</b>` : ""}
      </div>
      ${hint ? `<em>${escapeHtml(hint)}</em>` : ""}
    </label>
  `;
}

function fieldToggle(key, title, desc) {
  return `
    <label class="masteringToggle">
      <span><strong>${escapeHtml(title)}</strong><em>${escapeHtml(desc)}</em></span>
      <input data-mastering-toggle="${escapeHtml(key)}" type="checkbox" ${state.options[key] ? "checked" : ""} />
    </label>
  `;
}

function renderHero() {
  const analysisReady = !!state.analysis;
  const jobStatus = state.job?.status || "ready";
  return `
    <section class="masteringHeroCard">
      <div class="masteringHeroIcon">${iconHtml("sliders")}</div>
      <div class="masteringHeroText">
        <span>BRMedia Mastering Studio</span>
        <h2>${escapeHtml(getActiveSourceLabel())}</h2>
        <p>Professional non-destructive mastering with analysis, guided presets, advanced chain controls, live render status and before/after compare visuals.</p>
        <div class="masteringHeroChips">
          <b>${analysisReady ? "Analysis ready" : "Needs analysis"}</b>
          <b>${escapeHtml(state.options.preset || "custom")}</b>
          <b>${escapeHtml(jobStatus)}</b>
        </div>
      </div>
    </section>
  `;
}

function renderTabs() {
  return `
    <div class="masteringTabs">
      ${MASTERING_TABS.map((tab) => `
        <button class="masteringTab ${state.activeTab === tab.key ? "active" : ""}" data-tab="${escapeHtml(tab.key)}" type="button">
          ${iconHtml(tab.icon)}<span>${escapeHtml(tab.title)}</span>
        </button>
      `).join("")}
    </div>
  `;
}

function renderSourcePanel() {
  const filtered = state.search ? state.library.filter((item) => [getTrackTitle(item), item.artist, item.album, item.id].join(" ").toLowerCase().includes(state.search.toLowerCase())) : state.library;
  return `
    <section class="masteringPanel">
      <div class="masteringPanelHead">
        <span>${iconHtml("folder-open")}</span>
        <div><h3>Source file</h3><p>Start from a local BRMedia file or browse an audio file from this phone / PC.</p></div>
      </div>

      <input id="masteringUploadInput" type="file" accept="audio/*,.mp3,.wav,.flac,.m4a,.aac,.ogg,.opus,.aiff,.aif" hidden />
      <button class="masteringBtn masteringWideBtn" data-action="browse-file" type="button">${iconHtml("folder-plus")}<span>Browse phone / PC file</span></button>

      ${state.uploadedSource ? `<div class="masteringSourceNotice">${iconHtml("circle-check")}<span>Uploaded source ready: <strong>${escapeHtml(state.uploadedSource.fileName || state.uploadedSource.title || "uploaded file")}</strong></span></div>` : ""}

      <input id="masteringLibrarySearch" class="masteringSearch" placeholder="Search local library…" value="${escapeHtml(state.search)}" />
      <div class="masteringPickerRow">
        <select id="masteringTrackSelect">
          <option value="">Choose local library file…</option>
          ${filtered.map((item) => `<option value="${escapeHtml(item.id)}" ${String(item.id) === String(state.selectedTrackId) ? "selected" : ""}>${escapeHtml(getTrackTitle(item))}</option>`).join("")}
        </select>
        <button class="masteringBtn primary" data-action="use-library" type="button">${iconHtml("folder-open")}<span>Use library file</span></button>
      </div>
    </section>
  `;
}

function renderMetricCard(title, value, sub, icon = "chart-line") {
  return `
    <div class="masteringMetricCard">
      ${iconHtml(icon)}
      <strong>${escapeHtml(value)}</strong>
      <span>${escapeHtml(title)}</span>
      <em>${escapeHtml(sub)}</em>
    </div>
  `;
}

function renderAnalysePanel() {
  const metrics = state.analysis?.metrics || {};
  const meta = state.analysis?.meta || {};
  const warnings = state.analysis?.warnings || [];
  const rec = state.analysis?.recommendation;
  return `
    <section class="masteringPanel">
      <div class="masteringPanelHead">
        <span>${iconHtml("chart-line")}</span>
        <div><h3>Analyse source</h3><p>Reads loudness, true peak, max volume, dynamics and file quality before rendering.</p></div>
      </div>

      <button class="masteringBtn primary masteringWideBtn" data-action="analyse" type="button" ${state.busy ? "disabled" : ""}>${iconHtml("chart-line")}<span>${state.busy ? "Analysing source…" : state.analysis ? "Re-analyse source" : "Run professional analysis"}</span></button>
      ${renderAnalysisProgressBox()}

      <div class="masteringMetricGrid">
        ${renderMetricCard("Integrated loudness", metricText(metrics.integratedLufs, " LUFS"), "Overall programme loudness", "gauge-high")}
        ${renderMetricCard("True peak", metricText(metrics.truePeak, " dBFS"), "Peak estimate from ebur128", "triangle-exclamation")}
        ${renderMetricCard("Loudness range", metricText(metrics.loudnessRange, " LU"), "How dynamic the source is", "waveform")}
        ${renderMetricCard("Max volume", metricText(metrics.maxVolume, " dB"), "Volumedetect max sample", "chart-line")}
        ${renderMetricCard("Duration", meta.duration ? fmtDuration(meta.duration) : "—", "Source file length", "clock")}
        ${renderMetricCard("Format", [meta.codec, meta.sampleRate ? `${meta.sampleRate} Hz` : ""].filter(Boolean).join(" · ") || "—", "Codec / sample rate", "compact-disc")}
      </div>

      ${rec ? `<div class="masteringRecommendation">${iconHtml("wand-magic-sparkles")}<div><strong>${escapeHtml(rec.title)}</strong><p>${escapeHtml(rec.body)}</p></div><button class="masteringMiniBtn" data-preset="${escapeHtml(rec.preset)}" type="button">Use</button></div>` : ""}

      <div class="masteringWarnings">
        ${warnings.length ? warnings.map((warning) => `<div class="masteringWarning ${escapeHtml(warning.mode || "info")}">${iconHtml(warning.mode === "warn" ? "triangle-exclamation" : "circle-info")}<div><strong>${escapeHtml(warning.title)}</strong><p>${escapeHtml(warning.body)}</p></div></div>`).join("") : `<div class="masteringWarning good">${iconHtml("circle-check")}<div><strong>No major warnings yet</strong><p>Run analysis or continue with a safe preset if you know the source.</p></div></div>`}
      </div>
    </section>
  `;
}

function renderPresetsPanel() {
  return `
    <section class="masteringPanel">
      <div class="masteringPanelHead">
        <span>${iconHtml("wand-magic-sparkles")}</span>
        <div><h3>Mastering presets</h3><p>Simple choices for newbies, pro settings underneath for fine tuning.</p></div>
      </div>
      <div class="masteringPresetGrid">
        ${MASTERING_PRESETS.map((preset) => `
          <button class="masteringPresetCard ${state.selectedPresetKey === preset.key ? "active" : ""}" data-preset="${escapeHtml(preset.key)}" type="button">
            <span class="masteringPresetIcon">${iconHtml(preset.icon)}</span>
            <span class="masteringPresetText"><strong>${escapeHtml(preset.title)}</strong><em>${escapeHtml(preset.sub)}</em></span>
            <span class="masteringPresetBadge">${escapeHtml(preset.tone)}</span>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function renderChainPanel() {
  return `
    <section class="masteringPanel">
      <div class="masteringPanelHead">
        <span>${iconHtml("sliders")}</span>
        <div><h3>Mastering chain</h3><p>Advanced controls, still safe. Every render creates a new mastered copy.</p></div>
      </div>

      <div class="masteringChainGrid">
        ${fieldSelect("targetLufs", "Target loudness", [["-16", "-16 LUFS podcast/clean"], ["-14", "-14 LUFS streaming"], ["-12", "-12 LUFS loud stream"], ["-10", "-10 LUFS club"], ["-9", "-9 LUFS hardcore loud"]], "Lower number = louder output")}
        ${fieldSelect("truePeak", "True peak ceiling", [["-2", "-2 dB safe"], ["-1.5", "-1.5 dB standard"], ["-1", "-1 dB loud"], ["-0.6", "-0.6 dB aggressive"]], "Prevents clipping after conversion")}
        ${fieldSelect("compression", "Compression", [["gentle", "Gentle"], ["medium", "Medium"], ["hard", "Hard"]], "Controls punch and density")}
        ${fieldSelect("stereoWidth", "Stereo width", [["1", "Natural"], ["1.08", "Wide safe"], ["1.18", "Wide"], ["1.28", "Very wide"]], "Use carefully on club masters")}
        ${fieldSelect("bass", "Bass lift", [["0", "Off"], ["1", "Light"], ["2", "Warm"], ["3", "Heavy"]])}
        ${fieldSelect("warmth", "Warmth", [["0", "Off"], ["1", "Light"], ["2", "Warm"]])}
        ${fieldSelect("brightness", "Brightness", [["0", "Off"], ["1", "Light"], ["2", "Bright"], ["3", "Very bright"]])}
        ${fieldSelect("air", "Air / sparkle", [["0", "Off"], ["1", "Light"], ["2", "Sparkle"]])}
        ${fieldSelect("deHarsh", "De-harsh", [["off", "Off"], ["light", "Light"], ["medium", "Medium"], ["strong", "Strong"]], "Reduces 3.2 kHz bite")}
        ${fieldSelect("limiterDrive", "Limiter drive", [["0", "Off"], ["1", "Light"], ["2", "Loud"], ["3", "Hard"]])}
        ${fieldSelect("intensity", "Overall intensity", [["25", "25% gentle"], ["50", "50% balanced"], ["75", "75% strong"], ["100", "100% full send"]])}
        ${fieldSelect("lowCut", "Low cut safety", [["20", "20 Hz"], ["30", "30 Hz"], ["40", "40 Hz"]])}
      </div>
    </section>
  `;
}

function renderKeyBpmPanel() {
  const tempoKey = getTempoKeyAnalysis();
  const analysedBpm = tempoKey?.bpm ? `${Number(tempoKey.bpm).toFixed(tempoKey.bpm % 1 ? 1 : 0)} BPM` : "Not analysed";
  const analysedKey = tempoKey?.key || "Not analysed";
  const keyShift = Number(state.options.keyShiftSemitones || 0);
  const bpmShift = Number(state.options.bpmChangePercent || 0);
  const bpmLabel = bpmShift > 0 ? `+${Number(bpmShift.toFixed(2))}%` : `${Number(bpmShift.toFixed(2))}%`;
  const keyLabel = keyShift > 0 ? `+${keyShift}` : `${keyShift}`;
  return `
    <section class="masteringPanel masteringKeyBpmPanel">
      <div class="masteringPanelHead">
        <span>${iconHtml("gauge-high")}</span>
        <div><h3>Key / BPM / plugins</h3><p>DJ-safe tempo changes, target BPM input, Rubber Band mode and extra colour before preview/render.</p></div>
      </div>

      <div class="masteringKeyBpmSummary masteringV4Summary">
        <div><strong>${escapeHtml(analysedBpm)}</strong><span>BPM analysis · ${escapeHtml(tempoKey?.bpmSource || "unknown")} · ${escapeHtml(formatConfidence(tempoKey?.bpmConfidence))}</span></div>
        <div><strong>${escapeHtml(analysedKey)}</strong><span>Key analysis · ${escapeHtml(tempoKey?.keySource || "unknown")} · ${escapeHtml(formatConfidence(tempoKey?.keyConfidence))}</span></div>
        <div><strong>${escapeHtml(keyLabel)} st</strong><span>Key shift</span></div>
        <div><strong>${escapeHtml(bpmLabel)}</strong><span>BPM change</span></div>
        <div><strong>${escapeHtml(state.options.targetBpm || "—")} BPM</strong><span>Target BPM</span></div>
        <div><strong>${state.options.bpmMode === "vinyl" ? "Vinyl" : "Keep pitch"}</strong><span>BPM mode</span></div>
      </div>

      <div class="masteringPluginGrid masteringBpmGrid">
        ${fieldSelect("bpmControlMode", "BPM input mode", [["percent", "Percent change"], ["target", "Manual target BPM"]], "Use target BPM when you want 160 BPM to become exactly 170 BPM.")}
        ${fieldNumber("sourceBpm", "Source BPM", "1", "300", "0.01", "BPM", "Auto-filled by analysis when detected. You can correct it manually.", "data-mastering-bpm-source=\"true\"")}
        ${fieldNumber("targetBpm", "Target BPM", "1", "300", "0.01", "BPM", "Example: source 160, target 170 = +6.25% tempo change.", "data-mastering-bpm-target=\"true\"")}
        ${fieldRange("bpmChangePercent", "BPM change", "-50", "50", "0.01", "%", "Still available for quick percentage changes.")}
        ${fieldRange("keyShiftSemitones", "Key change", "-12", "12", "1", "st", "Semitones. Negative goes lower, positive goes higher.")}
        ${fieldSelect("bpmMode", "BPM mode", [["keep-pitch", "Keep pitch same"], ["vinyl", "Vinyl mode — BPM + pitch together"]], "Vinyl mode behaves like speeding or slowing a deck.")}
        ${fieldSelect("keyTempoEngine", "Key/BPM engine", [["safe", "Safe FFmpeg built-in"], ["rubberband", "Rubber Band if installed"]], "Rubber Band gives better pitch/tempo quality when your FFmpeg build supports it.")}
        ${fieldRange("clubPunch", "Club Punch", "0", "100", "5", "%", "Kick/body push before the main limiter.")}
        ${fieldRange("driveSaturation", "Drive / Saturation", "0", "100", "5", "%", "Adds density using safe drive and compression.")}
        ${fieldRange("presenceBite", "Presence Bite", "0", "100", "5", "%", "Brings vocals, riffs and leads forward.")}
        ${fieldRange("subWarmth", "Sub Warmth", "0", "100", "5", "%", "Adds controlled sub and low-mid warmth.")}
        ${fieldRange("stereoGlue", "Stereo Glue", "0", "100", "5", "%", "Subtle stereo density after the main width setting.")}
      </div>
    </section>
  `;
}

function renderComparePanel() {
  const job = state.job;
  const isPreview = !!job?.previewLengthSeconds;
  const previewDone = isPreview && job?.status === "done" && !!job?.downloadUrl;
  return `
    <section class="masteringPanel masteringComparePanel">
      <div class="masteringPanelHead">
        <span>${iconHtml("waveform")}</span>
        <div><h3>Compare wall + preview render</h3><p>Before and after overlay, plus short test renders before committing the full master.</p></div>
      </div>

      <div class="masteringCompareWall">
        <canvas id="masteringCompareCanvas" width="900" height="320" aria-label="Before and after waveform compare"></canvas>
        <div class="masteringCompareLegend">
          <span><b class="before"></b>Before/source</span>
          <span><b class="after"></b>After/target master</span>
          <span><b class="ceiling"></b>Peak ceiling</span>
        </div>
      </div>

      <div class="masteringCompareStats">
        <div><strong>${metricText(getMetricValue("integratedLufs"), " LUFS")}</strong><span>Source loudness</span></div>
        <div><strong>${escapeHtml(state.options.targetLufs)} LUFS</strong><span>Target master</span></div>
        <div><strong>${escapeHtml(state.options.keyShiftSemitones || "0")} st</strong><span>Key change</span></div>
        <div><strong>${escapeHtml(state.options.bpmChangePercent || "0")}%</strong><span>BPM change</span></div>
        <div><strong>${escapeHtml(state.options.targetBpm || "—")} BPM</strong><span>Target BPM</span></div>
        <div><strong>${escapeHtml(state.options.keyTempoEngine || "safe")}</strong><span>Engine</span></div>
      </div>

      <div class="masteringPreviewCard ${escapeHtml(job?.status || "")}">
        <div>
          <strong>${isPreview ? escapeHtml(job?.fileName || "Preview render") : "Preview render"}</strong>
          <p>${isPreview ? escapeHtml(job?.message || "Preview status ready.") : "Render a quick 20s, 30s or 45s test before the full master."}</p>
        </div>
        <span>${isPreview ? `${escapeHtml(job?.previewLengthSeconds)}s` : "test"}</span>
      </div>

      <div class="masteringActionGrid masteringPreviewActions">
        <button class="masteringBtn" data-action="preview-render" data-preview-length="20" type="button">${iconHtml("play")}<span>Preview 20s</span></button>
        <button class="masteringBtn" data-action="preview-render" data-preview-length="30" type="button">${iconHtml("play")}<span>Preview 30s</span></button>
        <button class="masteringBtn" data-action="preview-render" data-preview-length="45" type="button">${iconHtml("play")}<span>Preview 45s</span></button>
        <button class="masteringBtn primary" data-action="download-result" type="button" ${previewDone ? "" : "disabled"}>${iconHtml("download")}<span>Download preview</span></button>
      </div>
    </section>
  `;
}

function renderRenderPanel() {
  const job = state.job;
  const status = String(job?.status || "not-started");
  const running = ["queued", "running"].includes(status);
  return `
    <section class="masteringPanel">
      <div class="masteringPanelHead">
        <span>${iconHtml("rocket")}</span>
        <div><h3>Render master</h3><p>Create a new mastered copy with FFmpeg. Original file stays untouched.</p></div>
      </div>

      <div class="masteringOutputGrid">
        ${fieldSelect("outputFormat", "Output format", [["wav", "WAV"], ["flac", "FLAC"], ["mp3", "MP3"], ["m4a", "M4A/AAC"]])}
        ${fieldSelect("outputBitrate", "MP3 / AAC bitrate", [["64k", "64 kbps"], ["96k", "96 kbps"], ["128k", "128 kbps"], ["160k", "160 kbps"], ["192k", "192 kbps"], ["256k", "256 kbps"], ["320k", "320 kbps"]], "Used by MP3 and M4A/AAC outputs.")}
        ${fieldSelect("sampleRate", "Sample rate", [["", "Keep source"], ["44100", "44.1 kHz"], ["48000", "48 kHz"], ["88200", "88.2 kHz"], ["96000", "96 kHz"]])}
        ${fieldSelect("channels", "Channels", [["", "Keep source"], ["1", "Mono"], ["2", "Stereo"]])}
        ${fieldSelect("wavBitDepth", "WAV bit depth", [["16", "16-bit"], ["24", "24-bit"], ["32", "32-bit float"]])}
        ${fieldSelect("flacCompression", "FLAC compression", [["0", "0 fastest"], ["5", "5 balanced"], ["8", "8 smallest"]])}
        <label class="masteringField"><span>Output suffix/name</span><input data-mastering-option="outputName" value="${escapeHtml(state.options.outputName)}" placeholder="BRMedia Master" /></label>
        ${fieldToggle("addToLibrary", "Add result to Player", "Finished audio gets indexed and available for Player/Tagger.")}
        ${fieldToggle("preserveMetadata", "Preserve metadata", "Keep source metadata where possible.")}
      </div>

      <div class="masteringJobCard ${escapeHtml(status)}">
        <strong>${escapeHtml(job?.fileName || "No mastering render yet")}</strong>
        <em>${escapeHtml(job?.message || "Run a master when the chain is ready.")}</em>
        <span>${escapeHtml(status)}</span>
        ${renderMasteringProgress(job)}
      </div>

      <div class="masteringActionGrid">
        <button class="masteringBtn primary" data-action="start-render" type="button">${iconHtml("play")}<span>Render master</span></button>
        <button class="masteringBtn" data-action="cancel-render" type="button" ${running ? "" : "disabled"}>${iconHtml("xmark")}<span>Cancel</span></button>
      </div>
    </section>
  `;
}

function renderResultsPanel() {
  const job = state.job;
  const resultId = job?.libraryItem?.id || "";
  return `
    <section class="masteringPanel">
      <div class="masteringPanelHead">
        <span>${iconHtml("circle-check")}</span>
        <div><h3>Master result</h3><p>Download the master or hand it straight to another BRMedia module.</p></div>
      </div>

      <div class="masteringResultCard ${job?.status === "done" ? "done" : ""}">
        ${iconHtml(job?.status === "done" ? "circle-check" : "rocket")}
        <div><strong>${escapeHtml(job?.fileName || "No finished master yet")}</strong><p>${escapeHtml(job?.message || "Render a master first.")}</p><em>${fmtBytes(job?.sizeBytes || 0)}</em>${renderMasteringProgress(job)}</div>
      </div>

      <div class="masteringActionGrid">
        <button class="masteringBtn primary" data-action="download-result" type="button" ${job?.downloadUrl ? "" : "disabled"}>${iconHtml("download")}<span>Download</span></button>
        <button class="masteringBtn" data-action="open-player" type="button" ${resultId ? "" : "disabled"}>${iconHtml("music")}<span>Open Player</span></button>
        <button class="masteringBtn" data-action="open-tagger" type="button" ${resultId ? "" : "disabled"}>${iconHtml("tag")}<span>Open Tagger</span></button>
        <button class="masteringBtn" data-action="open-converter" type="button" ${resultId ? "" : "disabled"}>${iconHtml("arrows-rotate")}<span>Open Converter</span></button>
      </div>
    </section>
  `;
}

function renderActivePanel() {
  if (state.activeTab === "analyse") return renderAnalysePanel();
  if (state.activeTab === "presets") return renderPresetsPanel();
  if (state.activeTab === "chain") return renderChainPanel();
  if (state.activeTab === "keybpm") return renderKeyBpmPanel();
  if (state.activeTab === "compare") return renderComparePanel();
  if (state.activeTab === "render") return renderRenderPanel();
  if (state.activeTab === "results") return renderResultsPanel();
  return renderSourcePanel();
}

function renderMastering() {
  if (!masteringRoot) return;
  masteringRoot.innerHTML = `
    <div class="masteringShell">
      ${renderHero()}
      ${renderTabs()}
      ${renderActivePanel()}
      <div id="masteringStatus" class="masteringStatus">Ready.</div>
    </div>
  `;
  bindMasteringEvents();
  hydrateBrIcons(masteringRoot);
  renderSidebarMasteringNavigation();
  updateSidebarMasteringTabState();
  drawCompareWallSoon();
  keepActiveTabInView();
  if (state.job) setStatus(state.job.message || "Ready.", state.job.status === "done" ? "success" : ["queued", "running"].includes(state.job.status) ? "loading" : state.job.status === "error" ? "error" : "");
}

function bindMasteringEvents() {
  $("masteringLibrarySearch")?.addEventListener("input", (event) => {
    state.search = event.target.value || "";
    renderMastering();
  });
  $("masteringTrackSelect")?.addEventListener("change", (event) => {
    state.selectedTrackId = event.target.value || "";
    if (state.selectedTrackId) state.uploadedSource = null;
  });
  $("masteringUploadInput")?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (file) void uploadMasteringFile(file);
  });
  masteringRoot.querySelectorAll("[data-tab]").forEach((button) => button.addEventListener("click", () => setMasteringTab(button.dataset.tab || "source")));
  masteringRoot.querySelectorAll("[data-preset]").forEach((button) => button.addEventListener("click", () => applyPreset(button.dataset.preset || "streaming-clean")));
  masteringRoot.querySelectorAll("[data-mastering-option]").forEach((field) => field.addEventListener("change", () => {
    if (field.dataset.masteringBpmSource || field.dataset.masteringBpmTarget) {
      updateBpmTargetMode($("masteringSourceBpmInput")?.value || state.options.sourceBpm, $("masteringTargetBpmInput")?.value || state.options.targetBpm);
      renderMastering();
      return;
    }
    updateOption(field.dataset.masteringOption, field.value);
  }));
  masteringRoot.querySelectorAll("[data-mastering-live-option]").forEach((field) => field.addEventListener("input", () => {
    const key = field.dataset.masteringLiveOption || field.dataset.masteringOption || "";
    if (key === "bpmChangePercent") updateBpmPercentMode(field.value);
    else state.options[key] = field.value;
    masteringRoot.querySelectorAll("[data-mastering-option]").forEach((other) => {
      if (other !== field && other.dataset.masteringOption === key) other.value = field.value;
      if (key === "bpmChangePercent" && other.dataset.masteringOption === "targetBpm") other.value = state.options.targetBpm;
    });
    drawCompareWallSoon();
  }));
  masteringRoot.querySelectorAll("[data-mastering-toggle]").forEach((field) => field.addEventListener("change", () => updateOption(field.dataset.masteringToggle, !!field.checked)));
  masteringRoot.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action || "";
      if (action === "browse-file") $("masteringUploadInput")?.click();
      if (action === "use-library") {
        const selected = $("masteringTrackSelect")?.value || state.selectedTrackId;
        if (!selected) {
          setStatus("Choose a local library file first.", "error");
          return;
        }
        state.selectedTrackId = selected;
        state.uploadedSource = null;
        state.analysis = null;
        state.job = null;
        state.activeTab = "analyse";
        renderMastering();
        setStatus(`Selected ${getActiveSourceLabel()}. Run analysis next.`, "success");
      }
      if (action === "analyse") void runAnalysis();
      if (action === "preview-render") void startMasteringPreview(button.dataset.previewLength || 30);
      if (action === "start-render") void startMasteringJob();
      if (action === "cancel-render") void cancelMasteringJob();
      if (action === "download-result" && state.job?.downloadUrl) window.location.href = state.job.downloadUrl;
      if (action === "open-player" && state.job?.libraryItem?.id) window.location.href = `/player?trackId=${encodeURIComponent(state.job.libraryItem.id)}`;
      if (action === "open-tagger" && state.job?.libraryItem?.id) window.location.href = `/tagger?trackId=${encodeURIComponent(state.job.libraryItem.id)}`;
      if (action === "open-converter" && state.job?.libraryItem?.id) window.location.href = `/converter?trackId=${encodeURIComponent(state.job.libraryItem.id)}`;
    });
  });
}

function renderSidebarMasteringNavigation() {
  const nav = document.getElementById("sidebarMasteringNav");
  if (!nav) return;
  nav.innerHTML = `
    <div class="sidebarSectionTitle">Mastering stages</div>
    ${MASTERING_TABS.map((tab) => `
      <button class="sidebarNavBtn sidebarMasteringTabBtn ${state.activeTab === tab.key ? "active" : ""}" data-sidebar-mastering-tab="${escapeHtml(tab.key)}" type="button">
        ${iconHtml(tab.icon)}
        <span class="sidebarNavText"><span class="sidebarNavBtnTitle">${escapeHtml(tab.title)}</span><span class="sidebarNavBtnSub">${escapeHtml(tab.desc)}</span></span>
      </button>
    `).join("")}
  `;
  hydrateBrIcons(nav);
  nav.querySelectorAll("[data-sidebar-mastering-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      setMasteringTab(button.dataset.sidebarMasteringTab || "source");
      closeModuleSidebar();
    });
  });
}

function updateSidebarMasteringTabState() {
  document.querySelectorAll("[data-sidebar-mastering-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.sidebarMasteringTab === state.activeTab);
  });
}

function keepActiveTabInView(selector = ".masteringTabs", activeSelector = ".masteringTab.active") {
  window.requestAnimationFrame(() => {
    const wrap = document.querySelector(selector);
    const active = document.querySelector(activeSelector);
    if (!wrap || !active) return;

    const left = active.offsetLeft - (wrap.clientWidth / 2) + (active.clientWidth / 2);
    wrap.scrollTo({ left: Math.max(0, left), behavior: "instant" });
  });
}

function setMasteringTab(tab = "source") {
  state.activeTab = tab;
  renderMastering();
  updateSidebarMasteringTabState();
  keepActiveTabInView();
}

function seededNoise(seedText = "") {
  let seed = 2166136261;
  for (let i = 0; i < seedText.length; i += 1) seed = Math.imul(seed ^ seedText.charCodeAt(i), 16777619);
  return () => {
    seed += 0x6D2B79F5;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildVisualPeaks(type = "before", count = 180) {
  const rand = seededNoise(`${getActiveSourceLabel()}-${type}`);
  const lufs = Number(getMetricValue("integratedLufs"));
  const base = Number.isFinite(lufs) ? Math.max(0.25, Math.min(0.9, (Math.abs(lufs) - 6) / 24)) : 0.55;
  const intensity = Number(state.options.intensity || 50) / 100;
  const limiter = Number(state.options.limiterDrive || 1) / 3;
  const punch = Number(state.options.clubPunch || 0) / 100;
  const drive = Number(state.options.driveSaturation || 0) / 100;
  const bpm = Math.abs(Number(state.options.bpmChangePercent || 0)) / 100;
  const afterGain = type === "after" ? 1 + intensity * 0.28 + limiter * 0.16 + punch * 0.10 + drive * 0.08 + bpm * 0.05 : 1;
  const smoothing = type === "after" ? 0.22 + limiter * 0.12 : 0.08;
  const peaks = [];
  let prev = base;
  for (let i = 0; i < count; i += 1) {
    const wave = Math.abs(Math.sin(i / 5.5) * 0.45 + Math.sin(i / 13.7) * 0.35);
    const transient = rand() > (type === "after" ? 0.92 : 0.86) ? rand() * 0.48 : 0;
    let value = (base * 0.45 + wave * 0.48 + rand() * 0.20 + transient) * afterGain;
    value = prev * smoothing + value * (1 - smoothing);
    value = Math.max(0.06, Math.min(type === "after" ? 0.92 : 0.98, value));
    prev = value;
    peaks.push(value);
  }
  return peaks;
}

function drawCompareWallSoon() {
  window.requestAnimationFrame(() => drawCompareWall());
}

function drawCompareWall() {
  const canvas = $("masteringCompareCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const mid = height / 2;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#071631";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 5; i += 1) {
    const y = (height / 5) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  const before = buildVisualPeaks("before");
  const after = buildVisualPeaks("after");
  drawPeaks(ctx, before, width, height, "rgba(123,208,255,0.72)", 2.1);
  drawPeaks(ctx, after, width, height, "rgba(242,160,7,0.72)", 2.1);

  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(0, mid - height * 0.42);
  ctx.lineTo(width, mid - height * 0.42);
  ctx.moveTo(0, mid + height * 0.42);
  ctx.lineTo(width, mid + height * 0.42);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawPeaks(ctx, peaks, width, height, stroke, lineWidth) {
  const mid = height / 2;
  const step = width / Math.max(1, peaks.length - 1);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  peaks.forEach((amp, index) => {
    const x = index * step;
    const y = mid - amp * (height * 0.42);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.beginPath();
  peaks.forEach((amp, index) => {
    const x = index * step;
    const y = mid + amp * (height * 0.42);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
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
  moduleSidebar.classList.contains("hidden") ? openModuleSidebar() : closeModuleSidebar();
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
moduleSearchBtn?.addEventListener("click", () => window.location.href = "/player");
document.querySelectorAll("[data-route]").forEach((button) => button.addEventListener("click", () => goToRoute(button.dataset.route || "/")));
window.addEventListener("scroll", syncTopMenuDockState, { passive: true });
window.addEventListener("resize", syncTopMenuDockState);
document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeModuleSidebar(); });

window.addEventListener("DOMContentLoaded", async () => {
  closeModuleSidebar();
  syncTopMenuDockState();
  hydrateBrIcons(document);
  renderMastering();
  setStatus("Loading local audio library…", "loading");
  await loadLibrary().catch((err) => setStatus(`Could not load library: ${err.message || err}`, "error"));
  const initialId = readQueryParam("trackId") || readQueryParam("id");
  if (initialId && state.library.some((item) => String(item.id) === String(initialId))) {
    state.selectedTrackId = initialId;
    state.activeTab = "analyse";
    setStatus(`Loaded ${getActiveSourceLabel()}. Run analysis next.`, "success");
  } else {
    setStatus("Choose a source file to begin.", "");
  }
  renderMastering();
});