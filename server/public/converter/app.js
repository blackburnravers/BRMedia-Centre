const $ = (id) => document.getElementById(id);

const moduleSearchBtn = document.querySelector(".moduleSearchBtn");
const btnModuleMenu = $("btnModuleMenu");
const moduleSidebar = $("moduleSidebar");
const moduleSidebarBackdrop = $("moduleSidebarBackdrop");
const btnModuleSidebarCloseFloating = $("btnModuleSidebarCloseFloating");
const converterRoot = $("converterRoot");

const moduleSidebarScrollLock = { y: 0 };
let converterPollTimer = 0;

const CONVERTER_SETTINGS_KEY = "brmedia_converter_settings_v1";

const CONVERTER_SETTINGS_DEFAULTS = {
  defaultPresetKey: "mp3-320",
  defaultOutputName: "BRMedia Converted",
  defaultAudioFormat: "mp3",
  defaultAudioBitrate: "320k",
  defaultChannels: "2",
  defaultSampleRate: "",
  defaultVideoFormat: "mp4",
  defaultCrf: "23",
  defaultPreset: "fast",
  normalizeAudio: false,
  fastStart: true,
  addToLibrary: true,
  removeAudio: false,
  batchSequential: true,
  keepBatchAfterDone: true,
  compactProgress: true,
  openAfterDone: "stay",
  historyLimit: 30,
};

function readPersistedJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function loadConverterSettings() {
  const saved = readPersistedJson(CONVERTER_SETTINGS_KEY, null);
  return saved && typeof saved === "object"
    ? { ...CONVERTER_SETTINGS_DEFAULTS, ...saved }
    : { ...CONVERTER_SETTINGS_DEFAULTS };
}

const converterSettings = loadConverterSettings();

const state = {
  library: [],
  selectedTrackId: "",
  uploadedSource: null,
  activeTab: "source",
  job: null,
  batchSources: [],
  batchJobs: [],
  currentBatchIndex: -1,
  batchRunning: false,
  selectedPresetKey: converterSettings.defaultPresetKey || "",
  busy: false,
  search: "",
  options: {
    outputType: "audio",
    outputFormat: converterSettings.defaultAudioFormat || "mp3",
    outputName: converterSettings.defaultOutputName || "BRMedia Converted",
    audioCodec: "auto",
    videoCodec: "auto",
    audioBitrate: converterSettings.defaultAudioBitrate || "320k",
    sampleRate: converterSettings.defaultSampleRate || "",
    channels: converterSettings.defaultChannels || "",
    videoBitrate: "",
    crf: converterSettings.defaultCrf || "23",
    preset: converterSettings.defaultPreset || "fast",
    frameRate: "",
    resolution: "",
    trimStart: "",
    trimDuration: "",
    volume: "",
    normalizeAudio: !!converterSettings.normalizeAudio,
    fastStart: converterSettings.fastStart !== false,
    removeAudio: !!converterSettings.removeAudio,
    addToLibrary: converterSettings.addToLibrary !== false,
  },
};

const CONVERTER_TABS = [
  { key: "source", title: "Source", icon: "folder-open", desc: "Choose from library or browse this phone / PC." },
  { key: "format", title: "Format", icon: "arrows-rotate", desc: "Audio, video or extract-audio output." },
  { key: "options", title: "Options", icon: "sliders", desc: "Bitrate, trim, loudness and video options." },
  { key: "job", title: "Render", icon: "wand-magic-sparkles", desc: "Start, monitor, download and open results." },
];

const PRESETS = [
  {
    key: "mp3-320",
    title: "MP3 320",
    sub: "Best phone/player compatibility.",
    icon: "music",
    options: { outputType: "audio", outputFormat: "mp3", audioCodec: "auto", audioBitrate: "320k", sampleRate: "", channels: "2" },
  },
  {
    key: "wav",
    title: "WAV",
    sub: "Uncompressed audio copy/master.",
    icon: "waveform",
    options: { outputType: "audio", outputFormat: "wav", audioCodec: "auto", audioBitrate: "", sampleRate: "44100", channels: "2" },
  },
  {
    key: "flac",
    title: "FLAC",
    sub: "Lossless but smaller than WAV.",
    icon: "compact-disc",
    options: { outputType: "audio", outputFormat: "flac", audioCodec: "auto", audioBitrate: "", sampleRate: "", channels: "" },
  },
  {
    key: "mp4-fast",
    title: "MP4 Fast Start",
    sub: "Web/mobile friendly video.",
    icon: "film",
    options: { outputType: "video", outputFormat: "mp4", videoCodec: "auto", audioCodec: "auto", crf: "23", preset: "fast", fastStart: true },
  },
  {
    key: "extract-audio",
    title: "Extract Audio",
    sub: "Pull audio from a video file.",
    icon: "file-audio",
    options: { outputType: "audio", outputFormat: "mp3", audioCodec: "auto", audioBitrate: "320k", channels: "2" },
  },
  {
    key: "video-muted",
    title: "Muted MP4",
    sub: "Video output with audio removed.",
    icon: "volume-xmark",
    options: { outputType: "video", outputFormat: "mp4", videoCodec: "auto", removeAudio: true, crf: "23", preset: "fast", fastStart: true },
  },
];

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

function hydrateIcons(root = document) {
  if (window.BRMediaIcons?.hydrate) window.BRMediaIcons.hydrate(root);
}

function fmtBytes(bytes = 0) {
  const n = Number(bytes) || 0;
  if (!n) return "";
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDuration(seconds = 0) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  if (h) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function parseConverterTimecode(value = "") {
  const match = String(value || "").match(/(\d{1,2}):(\d{2}):(\d{2}(?:\.\d+)?)/);
  if (!match) return 0;

  return (Number(match[1]) || 0) * 3600 + (Number(match[2]) || 0) * 60 + (Number(match[3]) || 0);
}

function parseFfmpegConverterMessage(message = "") {
  const text = String(message || "");
  const get = (pattern) => text.match(pattern)?.[1]?.trim() || "";

  return {
    raw: text,
    frame: get(/(?:^|\s)frame=\s*([^\s]+)/i),
    fps: get(/(?:^|\s)fps=\s*([^\s]+)/i),
    q: get(/(?:^|\s)q=\s*([^\s]+)/i),
    size: get(/(?:^|\s)size=\s*([^\s]+)/i),
    time: get(/(?:^|\s)time=\s*([^\s]+)/i),
    bitrate: get(/(?:^|\s)bitrate=\s*([^\s]+)/i),
    speed: get(/(?:^|\s)speed=\s*([^\s]+)/i),
    elapsed: get(/(?:^|\s)elapsed=\s*([^\s]+)/i),
    progressSeconds: parseConverterTimecode(get(/(?:^|\s)time=\s*([^\s]+)/i)),
  };
}

function getConverterSourceDurationSeconds() {
  const trimDuration = Number(state.options.trimDuration || 0) || 0;
  if (trimDuration > 0) return trimDuration;

  const track = getSelectedTrack();
  const duration = Number(track?.duration || track?.durationSeconds || 0) || 0;

  return duration > 0 ? duration : 0;
}

function getConverterProgressInfo(job = {}) {
  const status = String(job?.status || "not-started");
  const serverProgress = job?.ffmpegProgress && typeof job.ffmpegProgress === "object" ? job.ffmpegProgress : null;
  const details = serverProgress
    ? {
        raw: job.technicalLog || serverProgress.raw || "",
        frame: serverProgress.frame || "",
        fps: serverProgress.fps || "",
        q: serverProgress.q || "",
        size: serverProgress.size || "",
        time: serverProgress.time || "",
        bitrate: serverProgress.bitrate || "",
        speed: serverProgress.speed || "",
        elapsed: serverProgress.elapsed || "",
        progressSeconds: parseConverterTimecode(serverProgress.time || ""),
      }
    : parseFfmpegConverterMessage(job?.message || "");
  const totalSeconds = getConverterSourceDurationSeconds();
  const progressSeconds = Number(details.progressSeconds || 0) || 0;

  let percent = null;

  if (status === "done") {
    percent = 100;
  } else if (status === "cancelled" || status === "error") {
    percent = 0;
  } else if (progressSeconds > 0 && totalSeconds > 0) {
    percent = Math.max(1, Math.min(99, Math.round((progressSeconds / totalSeconds) * 100)));
  }

  return {
    status,
    details,
    totalSeconds,
    progressSeconds,
    percent,
  };
}

function converterMetricPill(label, value, tone = "") {
  if (!value) return "";

  return `
    <span class="converterMetricPill ${tone ? `is-${escapeHtml(tone)}` : ""}">
      <b>${escapeHtml(label)}</b>
      <em>${escapeHtml(value)}</em>
    </span>
  `;
}

function renderConverterProgress(job = {}) {
  const info = getConverterProgressInfo(job);
  const isRunning = ["queued", "running"].includes(info.status);
  const progressLabel = info.percent !== null ? `${info.percent}%` : (isRunning ? "Working" : "0%");
  const d = info.details;

  const metrics = [
    converterMetricPill("Progress", progressLabel, isRunning ? "live" : info.status === "done" ? "success" : ""),
    converterMetricPill("Time", d.time ? (info.totalSeconds ? `${formatDuration(info.progressSeconds)} / ${formatDuration(info.totalSeconds)}` : d.time) : ""),
    converterMetricPill("Size", d.size),
    converterMetricPill("Bitrate", d.bitrate),
    converterMetricPill("Speed", d.speed),
    converterMetricPill("Elapsed", d.elapsed),
  ].filter(Boolean).join("");

  return `
    <div class="converterMetricGrid compact">
      ${metrics || converterMetricPill("Status", info.status)}
    </div>
    ${job.technicalLog || job.debugMessage ? `
      <details class="converterTechnicalLog">
        <summary>Show technical log</summary>
        <pre>${escapeHtml(job.technicalLog || job.debugMessage || "")}</pre>
      </details>
    ` : ""}
  `;
}

function readQueryParam(key) {
  return new URLSearchParams(window.location.search || "").get(key) || "";
}

function setBusy(next) {
  state.busy = !!next;
  document.body.classList.toggle("converterBusy", state.busy);
}

function setStatus(message, type = "") {
  const el = $("converterStatus");
  if (!el) return;
  el.className = `converterStatus ${type ? `is-${type}` : ""}`;
  el.textContent = message || "Ready.";
}

function maybeOpenConverterResult(job = {}) {
  const id = job?.libraryItem?.id || "";
  if (!id || state.batchRunning) return;

  if (converterSettings.openAfterDone === "player") {
    window.location.href = `/player?trackId=${encodeURIComponent(id)}`;
  }

  if (converterSettings.openAfterDone === "tagger") {
    window.location.href = `/tagger?trackId=${encodeURIComponent(id)}`;
  }

  if (converterSettings.openAfterDone === "mastering") {
    window.location.href = `/mastering?trackId=${encodeURIComponent(id)}`;
  }
}

async function apiJson(url, options = {}) {
  const res = await fetch(url, {
    cache: "no-store",
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData) && !(options.body instanceof Blob) && !(options.body instanceof File)
        ? { "Content-Type": "application/json" }
        : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.detail || `HTTP ${res.status}`);
  return data;
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

function getActiveSourceLabel() {
  if (state.uploadedSource?.id) return state.uploadedSource.fileName || state.uploadedSource.title || "Uploaded file";
  const track = getSelectedTrack();
  if (track) return getTrackTitle(track);
  return "No source selected";
}

function makeBatchKey(source = {}) {
  return `${source.kind || "source"}:${source.uploadId || source.videoId || source.trackId || source.id || source.label || ""}`;
}

function makeLibraryBatchSource(track = {}) {
  return {
    kind: "library",
    trackId: track.id,
    label: getTrackTitle(track),
    sourceType: "Library",
  };
}

function makeVideoBatchSource(video = {}) {
  return {
    kind: "video",
    videoId: video.id,
    label: video.title || video.fileName || "Video source",
    sourceType: "Video Library",
  };
}

function makeUploadBatchSource(upload = {}) {
  return {
    kind: "upload",
    uploadId: upload.id,
    label: upload.fileName || upload.title || "Uploaded file",
    sourceType: "Upload",
  };
}

function addBatchSource(source = {}) {
  const key = makeBatchKey(source);
  if (!key || state.batchSources.some((item) => makeBatchKey(item) === key)) return;
  state.batchSources.push(source);
}

function removeBatchSource(index) {
  if (state.batchRunning) return;
  state.batchSources.splice(index, 1);
  renderConverter();
  setStatus("Removed file from batch queue.", "");
}

function moveBatchSource(index, direction) {
  if (state.batchRunning) return;
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= state.batchSources.length) return;
  const [item] = state.batchSources.splice(index, 1);
  state.batchSources.splice(nextIndex, 0, item);
  renderConverter();
  setStatus("Batch queue order updated.", "success");
}

function getFilteredConverterLibrary() {
  const query = state.search.toLowerCase();
  if (!query) return state.library;
  return state.library.filter((item) => [getTrackTitle(item), item.artist, item.album, item.id].join(" ").toLowerCase().includes(query));
}

function addVisibleLibraryToBatch() {
  const visible = getFilteredConverterLibrary();
  const before = state.batchSources.length;
  visible.forEach((track) => addBatchSource(makeLibraryBatchSource(track)));
  renderConverter();
  setStatus(`Added ${state.batchSources.length - before} visible file${state.batchSources.length - before === 1 ? "" : "s"} to batch queue.`, "success");
}

function getCurrentSingleSource() {
  if (state.uploadedSource?.id) return makeUploadBatchSource(state.uploadedSource);
  const track = getSelectedTrack();
  if (track) return makeLibraryBatchSource(track);
  return null;
}

function getConverterQueueSources() {
  if (state.batchSources.length) return state.batchSources;
  const single = getCurrentSingleSource();
  return single ? [single] : [];
}

function updateOption(key, value) {
  state.options[key] = value;

  if (key === "outputFormat") {
    const audioFormats = ["mp3", "wav", "flac", "m4a", "aac", "ogg", "opus", "aiff"];
    state.options.outputType = audioFormats.includes(value) ? "audio" : "video";
  }

  renderConverter();
}

function applyPreset(preset) {
  state.selectedPresetKey = preset.key;
  state.options = { ...state.options, ...preset.options };

  if (!state.options.outputName || state.options.outputName === "BRMedia Converted") {
    state.options.outputName = `${preset.title} Converted`;
  }

  renderConverter();
  setStatus(`${preset.title} preset applied.`, "success");
}

function isPresetActive(preset = {}) {
  if (state.selectedPresetKey && state.selectedPresetKey === preset.key) return true;

  return Object.entries(preset.options || {}).every(([key, value]) => {
    return String(state.options[key] ?? "") === String(value ?? "");
  });
}

async function loadVideoSourceForConverter(videoId) {
  if (!videoId) return false;

  try {
    const data = await apiJson(`/video-library/${encodeURIComponent(videoId)}`);
    const video = data?.item;
    if (!video?.id) return false;

    state.selectedTrackId = "";
    state.uploadedSource = null;
    state.batchSources = [makeVideoBatchSource(video)];
    state.options.outputType = "video";
    state.options.outputFormat = "mp4";
    state.options.videoCodec = "auto";
    state.options.audioCodec = "auto";
    state.options.fastStart = true;
    state.activeTab = "format";
    setStatus(`Loaded video: ${video.title || video.fileName || "Video source"}.`, "success");
    return true;
  } catch (err) {
    setStatus(`Could not load video source: ${err?.message || err}`, "error");
    return false;
  }
}

async function loadLibrary() {
  const data = await apiJson("/library").catch(() => []);
  const items = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : Array.isArray(data.tracks) ? data.tracks : [];
  state.library = items.filter((item) => isLocalTrack(item));
  return state.library;
}

async function uploadConverterFile(file) {
  if (!file) return null;

  const result = await apiJson(`/brmedia/converter/upload?name=${encodeURIComponent(file.name || "converter-upload")}`, {
    method: "POST",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });

  return result.source || null;
}

async function uploadConverterFiles(fileList) {
  const files = Array.from(fileList || []).filter(Boolean);
  if (!files.length) return;

  setBusy(true);
  setStatus(`Uploading ${files.length} converter source file${files.length === 1 ? "" : "s"}…`, "loading");

  try {
    for (const file of files) {
      const source = await uploadConverterFile(file);
      if (!source?.id) continue;

      state.uploadedSource = source;
      state.selectedTrackId = "";
      addBatchSource(makeUploadBatchSource(source));
    }

    state.activeTab = "format";
    renderConverter();
    setStatus(`${files.length} source file${files.length === 1 ? "" : "s"} ready. Choose output format.`, "success");
  } catch (err) {
    setStatus(`Upload failed: ${err.message || err}`, "error");
  } finally {
    setBusy(false);
    const input = $("converterUploadInput");
    if (input) input.value = "";
  }
}

function buildJobPayloadForSource(source = getCurrentSingleSource()) {
  const options = { ...state.options };
  const trimStart = Number(options.trimStart || 0) || 0;
  const trimDuration = Number(options.trimDuration || 0) || 0;

  const body = {
    ...options,
    trimStart,
    trimDuration,
    normalizeAudio: !!options.normalizeAudio,
    fastStart: !!options.fastStart,
    removeAudio: !!options.removeAudio,
    addToLibrary: !!options.addToLibrary,
  };

  if (source?.kind === "upload") {
    body.uploadId = source.uploadId;
  } else if (source?.kind === "video") {
    body.videoId = source.videoId;
  } else {
    body.trackId = source?.trackId || state.selectedTrackId;
  }

  return body;
}

function buildJobPayload() {
  return buildJobPayloadForSource(getCurrentSingleSource());
}

async function startConversion() {
  const queue = getConverterQueueSources();

  if (!queue.length) {
    setStatus("Choose a library file or browse/upload a file first.", "error");
    state.activeTab = "source";
    renderConverter();
    return;
  }

  if (queue.length > 1) {
    await startBatchConversion(queue);
    return;
  }

  setBusy(true);
  state.activeTab = "job";
  renderConverter();
  setStatus("Starting conversion…", "loading");

  try {
    const result = await apiJson("/brmedia/converter/jobs", {
      method: "POST",
      body: JSON.stringify(buildJobPayloadForSource(queue[0])),
    });

    state.job = result.job;
    state.batchJobs = [{ source: queue[0], job: state.job }];
    renderConverter();
    setStatus("Conversion queued.", "loading");
    pollConverterJob();
  } catch (err) {
    setStatus(`Could not start conversion: ${err.message || err}`, "error");
  } finally {
    setBusy(false);
  }
}

async function startBatchConversion(queue = getConverterQueueSources()) {
  if (!queue.length || state.batchRunning) return;

  state.batchRunning = true;
  state.batchJobs = queue.map((source) => ({ source, job: null, status: "waiting" }));
  state.activeTab = "job";
  renderConverter();
  setStatus(`Batch conversion started: ${queue.length} file${queue.length === 1 ? "" : "s"}.`, "loading");

  for (let index = 0; index < queue.length; index += 1) {
    state.currentBatchIndex = index;

    try {
      state.batchJobs[index].status = "queued";
      renderConverter();

      const result = await apiJson("/brmedia/converter/jobs", {
        method: "POST",
        body: JSON.stringify(buildJobPayloadForSource(queue[index])),
      });

      state.batchJobs[index].job = result.job;
      state.job = result.job;
      renderConverter();
      await waitForBatchJob(index);
    } catch (err) {
      state.batchJobs[index].status = "error";
      state.batchJobs[index].error = err.message || String(err);
      renderConverter();
    }
  }

  state.batchRunning = false;
  state.currentBatchIndex = -1;
  if (!converterSettings.keepBatchAfterDone) state.batchSources = [];
  renderConverter();
  setStatus("Batch conversion finished.", "success");
}

async function waitForBatchJob(index) {
  const entry = state.batchJobs[index];
  if (!entry?.job?.id) return;

  while (true) {
    const result = await apiJson(`/brmedia/converter/jobs/${encodeURIComponent(entry.job.id)}`);
    entry.job = result.job || entry.job;
    state.job = entry.job;
    renderConverter();

    if (!["queued", "running"].includes(String(entry.job.status || ""))) break;
    await new Promise((resolve) => window.setTimeout(resolve, 1100));
  }
}

async function pollConverterJob() {
  window.clearTimeout(converterPollTimer);
  if (!state.job?.id) return;

  try {
    const result = await apiJson(`/brmedia/converter/jobs/${encodeURIComponent(state.job.id)}`);
    state.job = result.job || state.job;
    if (state.batchJobs.length) {
      const entry = state.batchJobs.find((item) => item.job?.id === state.job.id);
      if (entry) entry.job = state.job;
    }
    renderConverter();

    if (["queued", "running"].includes(String(state.job.status || ""))) {
      converterPollTimer = window.setTimeout(pollConverterJob, 1200);
    } else if (state.job.status === "done") {
      setStatus(state.job.message || "Conversion complete.", "success");
      maybeOpenConverterResult(state.job);
    } else if (state.job.status === "cancelled") {
      setStatus("Conversion cancelled.", "");
    } else {
      setStatus(state.job.error || state.job.message || "Conversion failed.", "error");
    }
  } catch (err) {
    setStatus(`Could not read job: ${err.message || err}`, "error");
  }
}

async function cancelConversion() {
  if (!state.job?.id) return;

  setBusy(true);

  try {
    const result = await apiJson(`/brmedia/converter/jobs/${encodeURIComponent(state.job.id)}/cancel`, {
      method: "POST",
      body: JSON.stringify({}),
    });

    state.job = result.job || state.job;
    const entry = state.batchJobs.find((item) => item.job?.id === state.job.id);
    if (entry) entry.job = state.job;
    renderConverter();
    setStatus("Cancelling conversion…", "loading");
  } catch (err) {
    setStatus(`Cancel failed: ${err.message || err}`, "error");
  } finally {
    setBusy(false);
  }
}

function addSelectedLibraryToBatch() {
  const track = getSelectedTrack();
  if (!track) {
    setStatus("Choose a local library file first.", "error");
    return;
  }

  addBatchSource(makeLibraryBatchSource(track));
  renderConverter();
  setStatus(`${getTrackTitle(track)} added to batch queue.`, "success");
}

function clearConverterBatch() {
  if (state.batchRunning) return;
  state.batchSources = [];
  state.batchJobs = [];
  state.currentBatchIndex = -1;
  renderConverter();
  setStatus("Batch queue cleared.", "");
}

function fieldSelect(key, label, options) {
  return `
    <label class="converterField">
      <span>${escapeHtml(label)}</span>
      <select data-converter-option="${escapeHtml(key)}">
        ${options.map(([value, text]) => `<option value="${escapeHtml(value)}" ${String(state.options[key]) === String(value) ? "selected" : ""}>${escapeHtml(text)}</option>`).join("")}
      </select>
    </label>
  `;
}

function fieldInput(key, label, placeholder = "", type = "text") {
  return `
    <label class="converterField">
      <span>${escapeHtml(label)}</span>
      <input data-converter-option="${escapeHtml(key)}" type="${escapeHtml(type)}" value="${escapeHtml(state.options[key] || "")}" placeholder="${escapeHtml(placeholder)}" />
    </label>
  `;
}

function fieldToggle(key, title, desc) {
  return `
    <label class="converterToggle">
      <span><strong>${escapeHtml(title)}</strong><em>${escapeHtml(desc)}</em></span>
      <input data-converter-toggle="${escapeHtml(key)}" type="checkbox" ${state.options[key] ? "checked" : ""} />
    </label>
  `;
}

function renderHero() {
  const job = state.job;

  return `
    <section class="converterHeroCard">
      <div class="converterHeroIcon">${iconHtml("arrows-rotate")}</div>
      <div class="converterHeroText">
        <span>BRMedia Converter</span>
        <h2>${escapeHtml(getActiveSourceLabel())}</h2>
        <p>Convert audio, extract audio from video, prepare mobile-friendly MP4s, trim clips and add finished audio back to the Player library.</p>
        <div class="converterHeroChips">
          <b>${escapeHtml(state.options.outputFormat.toUpperCase())}</b>
          <b>${state.options.outputType === "video" ? "Video output" : "Audio output"}</b>
          <b>${job ? escapeHtml(job.status || "job") : "Ready"}</b>
        </div>
      </div>
    </section>
  `;
}

function renderConverterBatchQueue() {
  if (!state.batchSources.length) return "";

  const libraryCount = state.batchSources.filter((source) => source.kind === "library").length;
  const uploadCount = state.batchSources.filter((source) => source.kind === "upload").length;

  return `
    <div class="converterBatchQueue">
      <div class="converterBatchQueueHead">
        <strong>${state.batchSources.length} file${state.batchSources.length === 1 ? "" : "s"} in batch queue</strong>
        <div class="converterBatchHeadActions">
          <button class="converterMiniBtn" data-action="start-conversion" type="button" ${state.batchRunning ? "disabled" : ""}>${iconHtml("play")}<span>Start</span></button>
          <button class="converterMiniBtn" data-action="clear-batch" type="button" ${state.batchRunning ? "disabled" : ""}>${iconHtml("trash")}<span>Clear</span></button>
        </div>
      </div>
      <div class="converterBatchStats">
        <span>${libraryCount} library</span>
        <span>${uploadCount} upload</span>
        <span>${state.options.outputFormat.toUpperCase()} output</span>
      </div>
      <div class="converterBatchList">
        ${state.batchSources.map((source, index) => `
          <div class="converterBatchSource">
            <b>${index + 1}</b>
            <span>${escapeHtml(source.label || "Converter source")}</span>
            <em>${escapeHtml(source.sourceType || source.kind || "source")}</em>
            <div class="converterBatchSourceActions">
              <button class="converterMiniIconBtn" data-batch-move="${index}" data-batch-direction="-1" type="button" ${index === 0 || state.batchRunning ? "disabled" : ""} aria-label="Move up">${iconHtml("arrow-up")}</button>
              <button class="converterMiniIconBtn" data-batch-move="${index}" data-batch-direction="1" type="button" ${index === state.batchSources.length - 1 || state.batchRunning ? "disabled" : ""} aria-label="Move down">${iconHtml("arrow-down")}</button>
              <button class="converterMiniIconBtn danger" data-batch-remove="${index}" type="button" ${state.batchRunning ? "disabled" : ""} aria-label="Remove">${iconHtml("xmark")}</button>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderSourcePanel() {
  const filtered = getFilteredConverterLibrary();

  return `
    <section class="converterPanel">
      <div class="converterPanelHead">
        <span>${iconHtml("folder-open")}</span>
        <div><h3>Source file</h3><p>Pick from the BRMedia library or browse a file from this phone / PC.</p></div>
      </div>

      <input id="converterUploadInput" type="file" accept="audio/*,video/*,.mp3,.wav,.flac,.m4a,.aac,.ogg,.opus,.aiff,.aif,.mp4,.mov,.mkv,.webm,.avi" multiple hidden />
      <button class="converterBtn converterWideBtn" data-action="browse-file" type="button">${iconHtml("folder-plus")}<span>Browse phone / PC files</span></button>

      ${state.uploadedSource ? `
        <div class="converterSourceNotice">
          ${iconHtml("circle-check")}
          <span>Uploaded source ready: <strong>${escapeHtml(state.uploadedSource.fileName || state.uploadedSource.title || "uploaded file")}</strong></span>
        </div>
      ` : ""}

      <input id="converterLibrarySearch" class="converterSearch" placeholder="Search local library…" value="${escapeHtml(state.search)}" />

      <div class="converterPickerRow">
        <select id="converterTrackSelect">
          <option value="">Choose local library file…</option>
          ${filtered.map((item) => `<option value="${escapeHtml(item.id)}" ${String(item.id) === String(state.selectedTrackId) ? "selected" : ""}>${escapeHtml(getTrackTitle(item))}</option>`).join("")}
        </select>
        <button class="converterBtn primary" data-action="use-library" type="button">${iconHtml("folder-open")}<span>Use library file</span></button>
        <button class="converterBtn" data-action="add-library-batch" type="button">${iconHtml("list-check")}<span>Add selected to batch</span></button>
        <button class="converterBtn" data-action="add-visible-batch" type="button" ${filtered.length ? "" : "disabled"}>${iconHtml("rectangle-list")}<span>Add visible</span></button>
      </div>

      ${renderConverterBatchQueue()}
    </section>
  `;
}

function renderFormatPanel() {
  return `
    <section class="converterPanel">
      <div class="converterPanelHead">
        <span>${iconHtml("wand-magic-sparkles")}</span>
        <div><h3>Quick presets</h3><p>Choose a safe starting point, then fine-tune below.</p></div>
      </div>
      <div class="converterPresetGrid">
        ${PRESETS.map((preset) => `
          <button class="converterPresetCard ${isPresetActive(preset) ? "active" : ""}" data-preset="${escapeHtml(preset.key)}" type="button">
            <span class="converterPresetIcon">${iconHtml(preset.icon)}</span>
            <span class="converterPresetText">
              <strong>${escapeHtml(preset.title)}</strong>
              <em>${escapeHtml(preset.sub)}</em>
            </span>
            <span class="converterPresetTick">${isPresetActive(preset) ? iconHtml("circle-check") : ""}</span>
          </button>
        `).join("")}
      </div>
    </section>

    <section class="converterPanel">
      <div class="converterPanelHead">
        <span>${iconHtml("file-export")}</span>
        <div><h3>Output format</h3><p>Audio formats are best for Player; MP4/WebM/MOV are for video output.</p></div>
      </div>
      <div class="converterFieldGrid">
        ${fieldInput("outputName", "Output suffix/name", "BRMedia Converted")}
        ${fieldSelect("outputFormat", "Output format", [
          ["mp3", "MP3"], ["wav", "WAV"], ["flac", "FLAC"], ["m4a", "M4A"], ["aac", "AAC"], ["ogg", "OGG"], ["opus", "OPUS"], ["aiff", "AIFF"],
          ["mp4", "MP4"], ["mov", "MOV"], ["mkv", "MKV"], ["webm", "WEBM"], ["avi", "AVI"],
        ])}
      </div>
    </section>
  `;
}

function renderOptionsPanel() {
  const isVideo = state.options.outputType === "video";

  return `
    <section class="converterPanel">
      <div class="converterPanelHead">
        <span>${iconHtml("sliders")}</span>
        <div><h3>Conversion options</h3><p>Leave fields on Auto/blank unless you need a specific output.</p></div>
      </div>

      <div class="converterFieldGrid">
        ${fieldSelect("audioCodec", "Audio codec", [["auto", "Auto"], ["copy", "Copy"], ["libmp3lame", "MP3 LAME"], ["aac", "AAC"], ["pcm_s16le", "PCM 16 WAV"], ["pcm_s24le", "PCM 24 WAV"], ["flac", "FLAC"], ["libvorbis", "Vorbis"], ["libopus", "Opus"]])}
        ${fieldSelect("audioBitrate", "Audio bitrate", [["", "Auto"], ["128k", "128k"], ["192k", "192k"], ["256k", "256k"], ["320k", "320k"], ["512k", "512k"]])}
        ${fieldSelect("sampleRate", "Sample rate", [["", "Keep source"], ["44100", "44.1 kHz"], ["48000", "48 kHz"], ["88200", "88.2 kHz"], ["96000", "96 kHz"]])}
        ${fieldSelect("channels", "Channels", [["", "Keep source"], ["1", "Mono"], ["2", "Stereo"], ["6", "5.1"]])}

        ${isVideo ? fieldSelect("videoCodec", "Video codec", [["auto", "Auto"], ["copy", "Copy"], ["libx264", "H.264"], ["libx265", "H.265"], ["libvpx-vp9", "VP9"], ["libaom-av1", "AV1"], ["prores_ks", "ProRes"], ["mpeg4", "MPEG4"]]) : ""}
        ${isVideo ? fieldSelect("videoBitrate", "Video bitrate", [["", "Auto"], ["1500k", "1500k"], ["3000k", "3000k"], ["6000k", "6000k"], ["10000k", "10000k"], ["20000k", "20000k"]]) : ""}
        ${isVideo ? fieldSelect("crf", "CRF quality", [["", "Auto"], ["16", "16 high"], ["18", "18 excellent"], ["20", "20 good"], ["23", "23 standard"], ["28", "28 smaller"]]) : ""}
        ${isVideo ? fieldSelect("preset", "Encoder preset", [["", "Auto"], ["ultrafast", "Ultra fast"], ["veryfast", "Very fast"], ["fast", "Fast"], ["medium", "Medium"], ["slow", "Slow"]]) : ""}
        ${isVideo ? fieldSelect("frameRate", "Frame rate", [["", "Keep source"], ["24", "24"], ["25", "25"], ["30", "30"], ["50", "50"], ["60", "60"]]) : ""}
        ${isVideo ? fieldSelect("resolution", "Resolution", [["", "Keep source"], ["720p", "720p"], ["1080p", "1080p"], ["1440p", "1440p"], ["2160p", "2160p"]]) : ""}

        ${fieldInput("trimStart", "Trim start seconds", "0", "number")}
        ${fieldInput("trimDuration", "Trim duration seconds", "leave blank for full file", "number")}
        ${fieldSelect("volume", "Volume", [["", "Keep source"], ["0.5", "50%"], ["0.75", "75%"], ["1", "100%"], ["1.25", "125%"], ["1.5", "150%"]])}
      </div>

      <div class="converterToggleGrid">
        ${fieldToggle("normalizeAudio", "Normalize audio", "Use FFmpeg loudnorm for more even output.")}
        ${fieldToggle("addToLibrary", "Add audio output to Player", "Audio results get added back into BRMedia automatically.")}
        ${isVideo ? fieldToggle("fastStart", "MP4 fast start", "Move metadata for better web/mobile playback.") : ""}
        ${isVideo ? fieldToggle("removeAudio", "Remove audio", "Create muted video output.") : ""}
      </div>
    </section>
  `;
}

function renderConverterBatchRunSummary(queue = []) {
  if (!queue.length || queue.length < 2) return "";
  const done = queue.filter((entry) => entry.job?.status === "done").length;
  const failed = queue.filter((entry) => entry.job?.status === "error" || entry.status === "error").length;
  const active = state.currentBatchIndex >= 0 ? state.currentBatchIndex + 1 : done + failed;
  const percent = Math.max(0, Math.min(100, Math.round(((done + failed) / queue.length) * 100)));

  return `
    <div class="converterBatchRunSummary" style="--converter-batch-progress:${percent}%">
      <span></span>
      <div>
        <strong>Batch progress</strong>
        <em>${done} done · ${failed} failed · ${Math.min(queue.length, active)} / ${queue.length}</em>
      </div>
      <b>${percent}%</b>
    </div>
  `;
}

function renderJobPanel() {
  const job = state.job;
  const status = String(job?.status || "not-started");
  const queue = state.batchJobs.length
    ? state.batchJobs
    : (job ? [{ source: getCurrentSingleSource(), job }] : []);
  const isRunning = ["queued", "running"].includes(status) || state.batchRunning;
  const canDownload = job?.status === "done" && job?.downloadUrl;

  return `
    <section class="converterPanel">
      <div class="converterPanelHead">
        <span>${iconHtml("rocket")}</span>
        <div><h3>Render job</h3><p>One result per process box. Batch conversion runs each file safely in order.</p></div>
      </div>

      ${renderConverterBatchRunSummary(queue)}

      <div class="converterJobList">
        ${queue.length ? queue.map((entry, index) => renderConverterJobCard(entry, index)).join("") : renderConverterJobCard({ source: null, job: null }, 0)}
      </div>

      <div class="converterActionGrid">
        <button class="converterBtn primary" data-action="start-conversion" type="button">${iconHtml("play")}<span>${getConverterQueueSources().length > 1 ? "Start batch conversion" : "Start conversion"}</span></button>
        <button class="converterBtn" data-action="cancel-conversion" type="button" ${isRunning ? "" : "disabled"}>${iconHtml("xmark")}<span>Cancel current</span></button>
        <button class="converterBtn" data-action="download-result" type="button" ${canDownload ? "" : "disabled"}>${iconHtml("download")}<span>Download current</span></button>
        <button class="converterBtn" data-action="open-player-result" type="button" ${job?.libraryItem?.id ? "" : "disabled"}>${iconHtml("music")}<span>Open in Player</span></button>
        <button class="converterBtn" data-action="open-tagger-result" type="button" ${job?.libraryItem?.id ? "" : "disabled"}>${iconHtml("tag")}<span>Open in Tagger</span></button>
        <button class="converterBtn" data-action="open-mastering-result" type="button" ${job?.libraryItem?.id ? "" : "disabled"}>${iconHtml("sliders")}<span>Open in Mastering</span></button>
      </div>
    </section>
  `;
}

function renderConverterJobCard(entry = {}, index = 0) {
  const job = entry.job || null;
  const status = String(job?.status || entry.status || "waiting");
  const info = getConverterProgressInfo(job || { status, message: "" });
  const percent = info.percent ?? (status === "running" ? 38 : 0);
  const sourceLabel = entry.source?.label || job?.sourceTitle || "No conversion job yet";
  const title = job?.fileName || sourceLabel;
  const resultId = job?.libraryItem?.id || "";

  return `
    <div class="converterJobCard ${escapeHtml(status)} ${state.currentBatchIndex === index ? "active" : ""}" style="--converter-progress:${percent}%">
      <div class="converterJobFill" aria-hidden="true"></div>
      <div class="converterJobBody">
        <div class="converterJobTop">
          <strong>${escapeHtml(title)}</strong>
          <span>${escapeHtml(status)}</span>
        </div>
        ${job ? renderConverterProgress(job) : `<em>${escapeHtml(sourceLabel || "Choose a source and start a conversion when ready.")}</em>`}
        ${job?.status === "done" ? `
          <div class="converterResultMiniActions">
            <button class="converterMiniBtn" data-job-download="${escapeHtml(job.id)}" type="button">${iconHtml("download")}<span>Download</span></button>
            <button class="converterMiniBtn" data-result-route="/player?trackId=${encodeURIComponent(resultId)}" type="button" ${resultId ? "" : "disabled"}>${iconHtml("music")}<span>Player</span></button>
            <button class="converterMiniBtn" data-result-route="/tagger?trackId=${encodeURIComponent(resultId)}" type="button" ${resultId ? "" : "disabled"}>${iconHtml("tag")}<span>Tagger</span></button>
            <button class="converterMiniBtn" data-result-route="/mastering?trackId=${encodeURIComponent(resultId)}" type="button" ${resultId ? "" : "disabled"}>${iconHtml("sliders")}<span>Mastering</span></button>
          </div>
        ` : ""}
      </div>
    </div>
  `;
}

function renderTabs() {
  return `
    <div class="converterTabs">
      ${CONVERTER_TABS.map((tab) => `
        <button class="converterTab ${state.activeTab === tab.key ? "active" : ""}" data-tab="${escapeHtml(tab.key)}" type="button">
          ${iconHtml(tab.icon)}
          <span>${escapeHtml(tab.title)}</span>
        </button>
      `).join("")}
    </div>
  `;
}

function renderActivePanel() {
  if (state.activeTab === "format") return renderFormatPanel();
  if (state.activeTab === "options") return renderOptionsPanel();
  if (state.activeTab === "job") return renderJobPanel();
  return renderSourcePanel();
}

function renderSidebarConverterNavigation() {
  const nav = document.getElementById("sidebarConverterNav");
  if (!nav) return;

  nav.innerHTML = `
    <div class="sidebarSectionTitle">Converter sections</div>
${CONVERTER_TABS.map((tab) => `
  <button class="sidebarNavBtn sidebarConverterTabBtn ${state.activeTab === tab.key ? "active" : ""}" data-sidebar-converter-tab="${escapeHtml(tab.key)}" type="button">
    ${iconHtml(tab.icon)}
    <span class="sidebarNavText">
      <span class="sidebarNavBtnTitle">${escapeHtml(tab.title)}</span>
      <span class="sidebarNavBtnSub">${escapeHtml(tab.desc || "Open this converter section.")}</span>
    </span>
  </button>
`).join("")}
  `;

  hydrateIcons(nav);

  nav.querySelectorAll("[data-sidebar-converter-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeTab = button.dataset.sidebarConverterTab || "source";
      closeModuleSidebar();
      renderConverter();
    });
  });
}

function updateSidebarConverterTabState() {
  document.querySelectorAll("[data-sidebar-converter-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.sidebarConverterTab === state.activeTab);
  });
}

function keepActiveTabInView(selector = ".converterTabs", activeSelector = ".converterTab.active") {
  window.requestAnimationFrame(() => {
    const wrap = document.querySelector(selector);
    const active = document.querySelector(activeSelector);
    if (!wrap || !active) return;

    const left = active.offsetLeft - (wrap.clientWidth / 2) + (active.clientWidth / 2);
    wrap.scrollTo({ left: Math.max(0, left), behavior: "instant" });
  });
}

function setConverterTab(tab = "source") {
  state.activeTab = tab;
  renderConverter();
  updateSidebarConverterTabState();
  keepActiveTabInView();
}

function renderConverter() {
  if (!converterRoot) return;

  converterRoot.innerHTML = `
    <div class="converterShell">
      ${renderHero()}
      ${renderTabs()}
      ${renderActivePanel()}
      <div id="converterStatus" class="converterStatus">Ready.</div>
    </div>
  `;

  bindConverterEvents();
  hydrateIcons(converterRoot);
  renderSidebarConverterNavigation();
  updateSidebarConverterTabState();
  keepActiveTabInView();

  if (state.job) {
    setStatus(
      state.job.message || "Ready.",
      state.job.status === "done" ? "success" : state.job.status === "error" ? "error" : "loading"
    );
  }
}

function bindConverterEvents() {
  $("converterLibrarySearch")?.addEventListener("input", (event) => {
    state.search = event.target.value || "";
    renderConverter();
  });

  $("converterTrackSelect")?.addEventListener("change", (event) => {
    state.selectedTrackId = event.target.value || "";
    if (state.selectedTrackId) state.uploadedSource = null;
  });

  $("converterUploadInput")?.addEventListener("change", (event) => {
    if (event.target.files?.length) void uploadConverterFiles(event.target.files);
  });

  converterRoot.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      setConverterTab(button.dataset.tab || "source");
    });
  });

  converterRoot.querySelectorAll("[data-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      const preset = PRESETS.find((item) => item.key === button.dataset.preset);
      if (preset) applyPreset(preset);
    });
  });

  converterRoot.querySelectorAll("[data-converter-option]").forEach((field) => {
    field.addEventListener("change", () => updateOption(field.dataset.converterOption, field.value));
  });

  converterRoot.querySelectorAll("[data-converter-toggle]").forEach((field) => {
    field.addEventListener("change", () => {
      state.options[field.dataset.converterToggle] = !!field.checked;
      renderConverter();
    });
  });

  converterRoot.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action || "";

      if (action === "browse-file") $("converterUploadInput")?.click();
      if (action === "add-library-batch") addSelectedLibraryToBatch();
      if (action === "add-visible-batch") addVisibleLibraryToBatch();
      if (action === "clear-batch") clearConverterBatch();

      if (action === "use-library") {
        const selected = $("converterTrackSelect")?.value || state.selectedTrackId;

        if (!selected) {
          setStatus("Choose a local library file first.", "error");
          return;
        }

        state.selectedTrackId = selected;
        state.uploadedSource = null;
        if (!state.batchRunning && state.batchSources.length <= 1) state.batchSources = [];
        state.activeTab = "format";
        renderConverter();
        setStatus(`Selected ${getActiveSourceLabel()}.`, "success");
      }

      if (action === "start-conversion") void startConversion();
      if (action === "cancel-conversion") void cancelConversion();
      if (action === "download-result" && state.job?.downloadUrl) window.location.href = state.job.downloadUrl;
      if (action === "open-player-result" && state.job?.libraryItem?.id) window.location.href = `/player?trackId=${encodeURIComponent(state.job.libraryItem.id)}`;
      if (action === "open-tagger-result" && state.job?.libraryItem?.id) window.location.href = `/tagger?trackId=${encodeURIComponent(state.job.libraryItem.id)}`;
      if (action === "open-mastering-result" && state.job?.libraryItem?.id) window.location.href = `/mastering?trackId=${encodeURIComponent(state.job.libraryItem.id)}`;
    });
  });
  converterRoot.querySelectorAll("[data-batch-remove]").forEach((button) => {
    button.addEventListener("click", () => removeBatchSource(Number(button.dataset.batchRemove || 0)));
  });
  converterRoot.querySelectorAll("[data-batch-move]").forEach((button) => {
    button.addEventListener("click", () => moveBatchSource(Number(button.dataset.batchMove || 0), Number(button.dataset.batchDirection || 0)));
  });
  converterRoot.querySelectorAll("[data-job-download]").forEach((button) => {
    button.addEventListener("click", () => {
      const jobId = button.dataset.jobDownload || "";
      if (jobId) window.location.href = `/brmedia/converter/jobs/${encodeURIComponent(jobId)}/download`;
    });
  });

  converterRoot.querySelectorAll("[data-result-route]").forEach((button) => {
    button.addEventListener("click", () => {
      const route = button.dataset.resultRoute || "";
      if (route && !button.disabled) window.location.href = route;
    });
  });
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
  hydrateIcons(moduleSidebar);
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

document.querySelectorAll("[data-route]").forEach((button) => {
  button.addEventListener("click", () => goToRoute(button.dataset.route || "/"));
});

window.addEventListener("scroll", syncTopMenuDockState, { passive: true });
window.addEventListener("resize", syncTopMenuDockState);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModuleSidebar();
});

window.addEventListener("DOMContentLoaded", async () => {
  closeModuleSidebar();
  syncTopMenuDockState();
  hydrateIcons(document);
  renderConverter();

  setStatus("Loading library…", "loading");
  await loadLibrary().catch((err) => setStatus(`Could not load library: ${err.message || err}`, "error"));

  const initialVideoId = readQueryParam("videoId");

  if (initialVideoId && await loadVideoSourceForConverter(initialVideoId)) {
    renderConverter();
    return;
  }

  const initialId = readQueryParam("trackId") || readQueryParam("id");

  if (initialId && state.library.some((item) => String(item.id) === String(initialId))) {
    state.selectedTrackId = initialId;
    state.activeTab = "format";
    setStatus(`Loaded ${getActiveSourceLabel()}.`, "success");
  } else {
    setStatus("Choose a source file to begin.", "");
  }

  renderConverter();
});