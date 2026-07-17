const $ = (id) => document.getElementById(id);

const moduleSearchBtn = document.querySelector(".moduleSearchBtn");
const btnModuleMenu = $("btnModuleMenu");
const moduleSidebar = $("moduleSidebar");
const moduleSidebarBackdrop = $("moduleSidebarBackdrop");
const btnModuleSidebarCloseFloating = $("btnModuleSidebarCloseFloating");
const serverSettingsRoot = document.querySelector(".settingsHeroShell");

let serverSecretStatus = [];
let serverSettingsNotice = "Loading server settings…";
let serverAdminHealth = null;
let serverAdminActionLog = [];
let serverAdminLastResult = null;
let serverAdminBusyAction = "";
let serverAdminWaveformJob = null;
let serverAdminWaveformPollTimer = 0;
let serverTorrentState = null;
let serverTorrentBusyAction = "";
let serverLibrarySources = [];
let serverLibrarySourceDefaults = { audio: "", video: "" };
let serverLibrarySourceAllowedBases = [];
let serverLibrarySourceBusyAction = "";
let serverLibrarySourceEditor = null;
let serverLibraryBrowser = {
  open: false,
  loading: false,
  currentPath: "",
  parentPath: "",
  drives: [],
  folders: [],
  error: "",
};

const moduleSidebarScrollLock = {
  y: 0,
};

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
  key: "key",
  cloud: "cloud",
  "folder-open": "folder-open",
  folder: "folder",
  wrench: "wrench",
  database: "database",
  shield: "shield-check",
  "circle-check": "circle-check",
  "triangle-exclamation": "triangle-exclamation",
  "floppy-disk": "floppy-disk",
  trash: "trash",
  broom: "broom",
  clipboard: "clipboard",
  "circle-info": "circle-info",
  gauge: "gauge-high",
  "hard-drive": "hard-drive",
  bolt: "bolt",
  waveform: "waveform",
  "chart-pie": "chart-column",
  "chart-column": "chart-column",
  magnet: "magnet",
  plug: "plug",
  download: "download",
  "network-wired": "network-wired",
  "calendar-clock": "calendar-clock",
  "gauge-high": "gauge-high",
  "folder-plus": "folder-plus",
  "folder-tree": "folder-tree",
  "pen-to-square": "pen-to-square",
  "circle-xmark": "circle-xmark",
  "arrow-left": "arrow-left",
  plus: "plus",
  wifi: "wifi",
  "wifi-slash": "wifi-slash",
};

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

const SERVER_RESTART_COMMAND = 'powershell -ExecutionPolicy Bypass -File "C:\\BRMedia\\restart-brmedia.ps1"';

const SERVER_SETTINGS_SECTIONS = [
  { key: "overview", title: "Overview", icon: "server", desc: "Server status, key coverage and quick links." },
  { key: "sources", title: "Library Sources", icon: "hard-drive", desc: "Browse server drives and save watched audio/video folders." },
  { key: "secrets", title: "API Keys", icon: "key", desc: "TMDb, OMDb and private metadata keys." },
  { key: "cloud", title: "Cloud OAuth", icon: "cloud", desc: "Google Drive and Dropbox app credentials." },
  { key: "folders", title: "Folders + Imports", icon: "folder-open", desc: "Audio/video roots, cloud imports and direct-link folders." },
  { key: "tools", title: "FFmpeg + Tools", icon: "wrench", desc: "FFmpeg path and server-side processing tools." },
  { key: "torrents", title: "Torrents Engine", icon: "magnet", desc: "qBittorrent Web UI, bandwidth, scheduler, cache, safety and handoff." },
{ key: "dj", title: "DJ Mixer Server", icon: "record-vinyl", desc: "DJ library roots, analysis cache, recordings and FFmpeg finalise foundations." },
  { key: "maintenance", title: "Maintenance", icon: "shield", desc: "Restart command, safety notes, cache and scan planning." },
];

function readServerSettingsSection() {
  try {
    const querySection = new URLSearchParams(window.location.search).get("section") || "";
    const savedSection = querySection || localStorage.getItem("brmedia_server_settings_section_v1") || "overview";
    return SERVER_SETTINGS_SECTIONS.some((section) => section.key === savedSection) ? savedSection : "overview";
  } catch {
    return "overview";
  }
}

let serverSettingsActiveSection = readServerSettingsSection();

const brIconSvgCache = new Map();
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

  const iconClass = Array.from(el.classList).find(
    (className) => className.startsWith("fa-") && !ignoredFaClasses.includes(className)
  );

  return iconClass ? iconClass.replace(/^fa-/, "") : "";
}

function getBrIconSvgName(iconName = "") {
  return BR_ICON_CLASS_MAP[iconName] || iconName || "";
}

function applyBrIconStateClasses(el) {
  el.classList.add("brSvgIconHost");
}

async function loadBrIconSvg(svgName) {
  const cached = brIconSvgCache.get(svgName);
  if (cached) return cached;

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

  promise
    .then((svgText) => {
      if (brIconSvgCache.get(svgName) === promise) brIconSvgCache.set(svgName, svgText);
    })
    .catch(() => {});

  return promise;
}

async function hydrateBrIcon(el) {
  if (!el || el.nodeType !== 1 || !el.matches?.("i[class*='fa-']")) return;

  const iconName = getBrIconNameFromElement(el);
  const svgName = getBrIconSvgName(iconName);
  if (!svgName) return;

  applyBrIconStateClasses(el);

  const cachedSvg = brIconSvgCache.get(svgName);
  if (typeof cachedSvg === "string") {
    if (el.dataset.brIconName === iconName && el.dataset.brIconSvg === svgName && el.dataset.brIconHydrated === "1") return;
    el.dataset.brIconName = iconName;
    el.dataset.brIconSvg = svgName;
    el.innerHTML = cachedSvg;
    el.dataset.brIconHydrated = "1";
    return;
  }

  if (
    el.dataset.brIconName === iconName &&
    el.dataset.brIconSvg === svgName &&
    el.dataset.brIconHydrated === "1"
  ) {
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
    const batch = brIconHydrationQueue.splice(0, 48);

    batch.forEach((node) => {
      void hydrateBrIcon(node);
    });

    if (brIconHydrationQueue.length) {
      brIconHydrationTimer = window.setTimeout(runBatch, 0);
      return;
    }

    brIconHydrationTimer = null;
  };

  brIconHydrationTimer = window.setTimeout(runBatch, 0);
}

function startBrIconHydrator() {
  const run = () => hydrateBrIcons(document);

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 1600 });
    return;
  }

  window.setTimeout(run, 900);
}

async function serverSettingsApiJson(path, options = {}) {
  const res = await fetch(path, {
    cache: "no-store",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

function groupServerSecretFields(filterGroups = []) {
  const allowedGroups = Array.isArray(filterGroups) ? filterGroups : [];

  return serverSecretStatus.reduce((groups, field) => {
    const group = field.group || "Other";
    if (allowedGroups.length && !allowedGroups.includes(group)) return groups;

    groups[group] = groups[group] || [];
    groups[group].push(field);
    return groups;
  }, {});
}

function serverSecretInputType(field = {}) {
  return field.kind === "secret" ? "password" : "text";
}

function renderServerSecretField(field = {}) {
  const statusClass = field.isSet ? "isSet" : "isMissing";
  const placeholder = field.isSet
    ? `${field.source}: ${field.preview || "set"}`
    : "Paste value here, then save";

  return `
    <div class="serverSecretField ${statusClass}">
      <label>
        <span>${escapeHtml(field.label || field.key)}</span>
        <input
          id="serverSecret_${escapeHtml(field.key)}"
          type="${serverSecretInputType(field)}"
          placeholder="${escapeHtml(placeholder)}"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
        />
      </label>

      <div class="serverSecretMeta">
        <span>${field.isSet ? "Set" : "Missing"}</span>
        <em>${escapeHtml(field.source || "Not set")}</em>
        <label class="serverSecretClear">
          <input type="checkbox" data-server-secret-clear="${escapeHtml(field.key)}" />
          <b>Clear</b>
        </label>
      </div>
    </div>
  `;
}

function serverSettingsSectionInfo(key = serverSettingsActiveSection) {
  return SERVER_SETTINGS_SECTIONS.find((section) => section.key === key) || SERVER_SETTINGS_SECTIONS[0];
}

function updateServerSettingsSidebarActive() {
  document.querySelectorAll("[data-server-section]").forEach((button) => {
    button.classList.toggle("active", button.dataset.serverSection === serverSettingsActiveSection);
  });
}

function setServerSettingsSection(sectionKey = "overview", options = {}) {
  if (!SERVER_SETTINGS_SECTIONS.some((section) => section.key === sectionKey)) return;

  serverSettingsActiveSection = sectionKey;
  try { localStorage.setItem("brmedia_server_settings_section_v1", sectionKey); } catch {}

  if (options.closeSidebar) closeModuleSidebar();
  renderServerSettings();
  serverSettingsRoot?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function serverSettingsStatusRows() {
  const setCount = serverSecretStatus.filter((field) => field.isSet).length;
  const total = serverSecretStatus.length;
  const missingCount = Math.max(0, total - setCount);
  const groups = groupServerSecretFields();

  return `
    <div class="serverSettingsMetricGrid">
      ${serverMetricCardHtml(String(setCount), "Values set", setCount ? "isOk" : "isWarn")}
      ${serverMetricCardHtml(String(missingCount), "Missing", missingCount ? "isWarn" : "isOk")}
      ${serverMetricCardHtml(String(Object.keys(groups).length), "Groups", "isOk")}
      ${serverMetricCardHtml("Safe", "Values hidden after save", "isOk")}
    </div>
  `;
}

function restartCommandBoxHtml() {
  return `
    <div class="serverCommandBox">
      <code>${escapeHtml(SERVER_RESTART_COMMAND)}</code>
      <button class="serverCommandCopyBtn" data-server-copy-restart type="button">
        ${iconHtml("clipboard")}
        <span>Copy</span>
      </button>
    </div>
  `;
}

function copyTextFallback(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "readonly");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    document.execCommand("copy");
  } catch {}

  textarea.remove();
}

async function copyServerText(text = "", label = "Text") {
  const value = String(text || "");

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
    } else {
      copyTextFallback(value);
    }

    serverSettingsNotice = `${label} copied.`;
    addServerAdminLog(`${label} copied`, value, true, { type: "copy" });
  } catch {
    copyTextFallback(value);
    serverSettingsNotice = `${label} copied using fallback.`;
    addServerAdminLog(`${label} copied`, value, true, { type: "copy" });
  }

  renderServerSettings();
}

async function copyRestartCommand() {
  await copyServerText(SERVER_RESTART_COMMAND, "Restart command");
}

async function clearBrmediaPageCacheAndReload() {
  serverSettingsNotice = "Deleting page cache and reloading…";
  renderServerSettings();

  try {
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
    }
  } catch {}

  const url = new URL(window.location.href);
  url.searchParams.set("cacheBust", String(Date.now()));
  window.location.href = url.toString();
}

function formatServerBytes(bytes = 0) {
  const size = Number(bytes || 0);
  if (!size) return "0 MB";
  if (size >= 1024 ** 4) return `${(size / 1024 ** 4).toFixed(2)} TB`;
  if (size >= 1024 ** 3) return `${(size / 1024 ** 3).toFixed(2)} GB`;
  if (size >= 1024 ** 2) return `${(size / 1024 ** 2).toFixed(1)} MB`;
  return `${(size / 1024).toFixed(1)} KB`;
}

function formatServerDuration(seconds = 0) {
  const value = Number(seconds || 0);
  if (value >= 86400) return `${Math.floor(value / 86400)}d ${Math.floor((value % 86400) / 3600)}h`;
  if (value >= 3600) return `${Math.floor(value / 3600)}h ${Math.floor((value % 3600) / 60)}m`;
  if (value >= 60) return `${Math.floor(value / 60)}m ${Math.floor(value % 60)}s`;
  return `${Math.floor(value)}s`;
}

function addServerAdminLog(title, detail = "", ok = true, extra = {}) {
  const entry = {
    id: `log_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    title,
    detail,
    ok,
    at: new Date().toLocaleTimeString(),
    ...extra,
  };

  serverAdminLastResult = entry;
  serverAdminActionLog = [entry, ...serverAdminActionLog].slice(0, 12);
}

function getServerAdminLogById(id = "") {
  return serverAdminActionLog.find((entry) => entry.id === id) || null;
}

function serverStatusClass(ok, warn = false) {
  if (ok) return "isOk";
  if (warn) return "isWarn";
  return "isBad";
}

function serverMetricCardHtml(value, label, tone = "") {
  return `<div class="serverSettingsMetric ${tone}"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`;
}

function serverHealthCardHtml(icon, value, label, tone = "") {
  return `<div class="serverAdminHealthCard ${tone}"><span>${iconHtml(icon)}</span><strong>${escapeHtml(value)}</strong><em>${escapeHtml(label)}</em></div>`;
}

function serverHealthValue(path, fallback = 0) {
  return path.split(".").reduce((value, key) => (value && value[key] !== undefined ? value[key] : undefined), serverAdminHealth) ?? fallback;
}

function renderServerHealthCards() {
  const audioCount = Number(serverHealthValue("library.audio", 0));
  const videoCount = Number(serverHealthValue("library.video", 0));
  const waveformCached = Number(serverHealthValue("waveforms.cached", 0));
  const waveformTotal = Number(serverHealthValue("waveforms.total", 0));
  const foldersOk = Number(serverHealthValue("folders.ok", 0));
  const foldersTotal = Number(serverHealthValue("folders.total", 0));
  const heapUsed = Number(serverHealthValue("memory.heapUsed", 0));
  const uptime = Number(serverHealthValue("uptimeSeconds", 0));
  const waveformTone = waveformTotal && waveformCached >= waveformTotal ? "isOk" : waveformCached ? "isWarn" : "isBad";
  const folderTone = foldersTotal && foldersOk >= foldersTotal ? "isOk" : foldersOk ? "isWarn" : "isBad";

  return `
    <div class="serverAdminHealthGrid">
      ${serverHealthCardHtml("music", audioCount, "Audio files", audioCount ? "isOk" : "isWarn")}
      ${serverHealthCardHtml("film", videoCount, "Video files", videoCount ? "isOk" : "isWarn")}
      ${serverHealthCardHtml("waveform", `${waveformCached}/${waveformTotal}`, "Waveforms ready", waveformTone)}
      ${serverHealthCardHtml("folder-open", `${foldersOk}/${foldersTotal}`, "Folders OK", folderTone)}
      ${serverHealthCardHtml("hard-drive", formatServerBytes(heapUsed), "Heap used", heapUsed ? "isOk" : "isWarn")}
      ${serverHealthCardHtml("gauge", formatServerDuration(uptime), "Server uptime", uptime ? "isOk" : "isWarn")}
    </div>
  `;
}

function renderServerAdminLog() {
  if (!serverAdminActionLog.length) {
    return `<div class="serverAdminLogEmpty">No admin actions run yet in this session.</div>`;
  }

  return `
    <div class="serverAdminLogList">
      ${serverAdminActionLog.map((entry) => `
        <div class="serverAdminLogItem ${entry.ok ? "isOk" : "isBad"}">
          <div>
            <strong>${escapeHtml(entry.title)}</strong>
            <span>${escapeHtml(entry.detail || "Done")}</span>
            <em>${escapeHtml(entry.at || "")}</em>
          </div>
          <button class="serverMiniCopyBtn" data-server-copy-log="${escapeHtml(entry.id)}" type="button">
            ${iconHtml("clipboard")}
            <span>Copy</span>
          </button>
        </div>
      `).join("")}
    </div>
  `;
}

function renderServerAdminStatusPanel() {
  const last = serverAdminLastResult;
  const checkedAt = serverAdminHealth?.checkedAt ? new Date(serverAdminHealth.checkedAt).toLocaleString() : "Not checked yet";
  const statusTitle = serverAdminBusyAction ? "Action running…" : last ? last.title : "Ready";
  const statusDetail = serverAdminBusyAction
    ? "Please leave this page open while the server action completes."
    : last?.detail || "Run a Server Settings admin tool and the latest result will appear here.";
  const tone = serverAdminBusyAction ? "isWarn" : last ? (last.ok ? "isOk" : "isBad") : "isOk";

  return `
    <article class="serverAdminStatusPanel ${tone}">
      <span>${iconHtml(serverAdminBusyAction ? "bolt" : last?.ok === false ? "triangle-exclamation" : "circle-check")}</span>
      <div>
        <strong>${escapeHtml(statusTitle)}</strong>
        <p>${escapeHtml(statusDetail)}</p>
        <em>Last health check: ${escapeHtml(checkedAt)}</em>
      </div>
      ${last ? `<button class="serverMiniCopyBtn" data-server-copy-log="${escapeHtml(last.id)}" type="button">${iconHtml("clipboard")}<span>Copy result</span></button>` : ""}
    </article>
  `;
}

function renderServerFolderCheckResults() {
  const folders = Array.isArray(serverAdminHealth?.folders?.items) ? serverAdminHealth.folders.items : [];
  if (!folders.length) return `<div class="serverAdminLogEmpty">Run folder access check to see detailed folder status.</div>`;

  return `
    <div class="serverFolderCheckList">
      ${folders.map((folder) => `
        <div class="serverFolderCheckItem ${folder.ok ? "isOk" : "isBad"}">
          <div>
            <strong>${escapeHtml(folder.label || folder.group || "Folder")}</strong>
            <span>${escapeHtml(folder.path || "")}</span>
            <em>${escapeHtml(folder.detail || (folder.ok ? "OK" : "Needs checking"))}</em>
          </div>
          <button class="serverMiniCopyBtn" data-server-copy-text="${encodeURIComponent(folder.path || "")}" data-server-copy-label="Folder path" type="button">
            ${iconHtml("clipboard")}
            <span>Copy path</span>
          </button>
        </div>
      `).join("")}
    </div>
  `;
}

function renderServerWaveformJob() {
  if (!serverAdminWaveformJob) return `<div class="serverAdminLogEmpty">No Server Settings waveform job running.</div>`;

  const job = serverAdminWaveformJob;
  const total = Number(job.total || 0);
  const processed = Number(job.processed || 0);
  const percent = total ? Math.round((processed / total) * 100) : 0;
  const failed = Number(job.failed || 0);
  const status = String(job.status || "running");

  return `
    <div class="serverAdminWaveformJob ${failed ? "isBad" : status.includes("done") ? "isOk" : "isRunning"}">
      <div class="serverAdminWaveformJobTop">
        <strong>${status.includes("done") ? "Waveform job complete" : "Waveform job running"}</strong>
        <em>${percent}%</em>
      </div>
      <div class="serverAdminProgress"><span style="width:${Math.max(0, Math.min(100, percent))}%"></span></div>
      <p>${processed}/${total || "?"} processed · ${Number(job.generated || 0)} generated · ${Number(job.skipped || 0)} cached · ${failed} failed</p>
    </div>
  `;
}

function serverAdminActionButton(action, icon, title, desc, tone = "") {
  const busy = serverAdminBusyAction === action;

  return `
    <button class="serverAdminActionBtn ${tone} ${busy ? "isBusy" : ""}" data-server-admin-action="${escapeHtml(action)}" type="button" ${serverAdminBusyAction && !busy ? "disabled" : ""}>
      <span>${iconHtml(busy ? "bolt" : icon)}</span>
      <strong>${escapeHtml(busy ? "Working…" : title)}</strong>
      <em>${escapeHtml(busy ? "Server action running now." : desc)}</em>
    </button>
  `;
}

async function loadServerAdminHealth(options = {}) {
  try {
    const data = await serverSettingsApiJson("/server-settings/admin/health");
    serverAdminHealth = data || null;
    if (!options.quiet) addServerAdminLog("Server health refreshed", "Health cards updated.", true);
  } catch (err) {
    addServerAdminLog("Server health failed", err?.message || String(err), false);
  }

  if (options.render !== false) renderServerSettings();
}

async function runServerAdminAction(action) {
  if (!action || serverAdminBusyAction) return;

  serverAdminBusyAction = action;
  renderServerSettings();

  try {
    if (action === "clear-page-cache") {
      await clearBrmediaPageCacheAndReload();
      return;
    }

    if (action === "ffmpeg-check") {
      const data = await serverSettingsApiJson("/server-settings/admin/ffmpeg-check", { method: "POST", body: "{}" });
      addServerAdminLog("FFmpeg check", data.ok ? (data.version || "FFmpeg OK") : (data.detail || "FFmpeg failed"), !!data.ok);
      serverAdminBusyAction = "";
      return renderServerSettings();
    }

    if (action === "folder-check") {
      const data = await serverSettingsApiJson("/server-settings/admin/folder-check", { method: "POST", body: "{}" });
      serverAdminHealth = { ...(serverAdminHealth || {}), folders: { total: data.items?.length || 0, ok: (data.items || []).filter((item) => item.ok).length, items: data.items || [] } };
      addServerAdminLog("Folder access check", `${serverAdminHealth.folders.ok}/${serverAdminHealth.folders.total} folders OK.`, true);
      serverAdminBusyAction = "";
      return renderServerSettings();
    }

    if (action === "clear-waveform-cache") {
      const data = await serverSettingsApiJson("/waveforms/cache", { method: "DELETE" });
      addServerAdminLog("Waveform cache cleared", `${data.deleted || 0} cache file(s) deleted.`, true);
      await loadServerAdminHealth({ quiet: true, render: false });
      serverAdminBusyAction = "";
      return renderServerSettings();
    }

    if (action === "clear-waveform-failed") {
      const data = await serverSettingsApiJson("/waveforms/failed", { method: "DELETE" });
      addServerAdminLog("Failed waveform list cleared", `${data.cleared || 0} failed row(s) cleared.`, true);
      await loadServerAdminHealth({ quiet: true, render: false });
      serverAdminBusyAction = "";
      return renderServerSettings();
    }

    if (action === "rebuild-missing-waveforms") {
      const job = await serverSettingsApiJson("/waveforms/jobs", { method: "POST", body: JSON.stringify({ scope: "all", force: false, count: 1200 }) });
      serverAdminWaveformJob = job;
      addServerAdminLog("Waveform rebuild started", `${job.total || 0} file(s) queued.`, true);
      startServerAdminWaveformPolling(job.id);
      serverAdminBusyAction = "";
      return renderServerSettings();
    }

    if (action === "rescan-audio") {
      const data = await serverSettingsApiJson("/server-settings/admin/rescan-audio", { method: "POST", body: "{}" });
      addServerAdminLog("Audio rescan complete", `${data.added || 0} added · ${data.skipped || 0} skipped · ${data.scanned || 0} scanned.`, true);
      await loadServerAdminHealth({ quiet: true, render: false });
      serverAdminBusyAction = "";
      return renderServerSettings();
    }

    if (action === "rescan-video") {
      const data = await serverSettingsApiJson("/server-settings/admin/rescan-video", { method: "POST", body: "{}" });
      addServerAdminLog("Video rescan complete", `${data.count || 0} video file(s) found.`, true);
      await loadServerAdminHealth({ quiet: true, render: false });
      serverAdminBusyAction = "";
      return renderServerSettings();
    }

    if (action === "rebuild-video-metadata") {
      const data = await serverSettingsApiJson("/server-settings/admin/rebuild-video-metadata", { method: "POST", body: "{}" });
      addServerAdminLog("Video metadata rebuild", `${data.improved || 0} new match(es). ${data.afterMatched || 0}/${data.scanned || 0} matched.`, !!data.metadataEnabled);
      await loadServerAdminHealth({ quiet: true, render: false });
      serverAdminBusyAction = "";
      return renderServerSettings();
    }
  } catch (err) {
    addServerAdminLog("Admin action failed", err?.message || String(err), false);
    serverAdminBusyAction = "";
    renderServerSettings();
  }
}

function startServerAdminWaveformPolling(jobId) {
  window.clearInterval(serverAdminWaveformPollTimer);
  serverAdminWaveformPollTimer = window.setInterval(async () => {
    try {
      const job = await serverSettingsApiJson(`/waveforms/jobs/${encodeURIComponent(jobId)}`);
      serverAdminWaveformJob = job;

      if (String(job.status || "").includes("done")) {
        window.clearInterval(serverAdminWaveformPollTimer);
        addServerAdminLog("Waveform rebuild finished", `${job.generated || 0} generated · ${job.failed || 0} failed.`, !Number(job.failed || 0));
        await loadServerAdminHealth({ quiet: true, render: false });
      }

      renderServerSettings();
    } catch (err) {
      window.clearInterval(serverAdminWaveformPollTimer);
      addServerAdminLog("Waveform polling failed", err?.message || String(err), false);
      renderServerSettings();
    }
  }, 1000);
}

function renderServerSectionCards() {
  return `
    <div class="serverSettingsSectionGrid">
      ${SERVER_SETTINGS_SECTIONS.filter((section) => section.key !== "overview").map((section) => `
        <button class="serverSettingsSectionCard ${serverSettingsActiveSection === section.key ? "active" : ""}" data-server-settings-section="${escapeHtml(section.key)}" type="button">
          <span>${iconHtml(section.icon)}</span>
          <div>
            <strong>${escapeHtml(section.title)}</strong>
            <em>${escapeHtml(section.desc)}</em>
          </div>
        </button>
      `).join("")}
    </div>
  `;
}

function renderServerSecretManagerCard(title, desc, groupFilter = []) {
  const groups = groupServerSecretFields(groupFilter);
  const groupEntries = Object.entries(groups);

  return `
    <article class="serverSettingsCard">
      <div class="serverSettingsCardHead">
        <span>${iconHtml("key")}</span>
        <div>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(desc)}</p>
        </div>
      </div>

      <div class="serverSettingsNotice">${escapeHtml(serverSettingsNotice)}</div>

      ${groupEntries.length ? `
        <div class="serverSecretGroups">
          ${groupEntries.map(([group, fields]) => `
            <section class="serverSecretGroup">
              <h4>${escapeHtml(group)}</h4>
              <div class="serverSecretGrid">
                ${fields.map(renderServerSecretField).join("")}
              </div>
            </section>
          `).join("")}
        </div>
      ` : `<div class="serverSettingsNotice">No editable fields are registered for this section yet.</div>`}

      <div class="serverSettingsActions">
        <button class="serverSettingsBtn primary" data-server-settings-save type="button">
          ${iconHtml("floppy-disk")}
          <span>Save entered values</span>
        </button>

        <button class="serverSettingsBtn danger" data-server-settings-clear type="button">
          ${iconHtml("trash")}
          <span>Clear ticked values</span>
        </button>

        <button class="serverSettingsBtn" data-server-settings-refresh type="button">
          ${iconHtml("arrows-rotate")}
          <span>Refresh status</span>
        </button>
      </div>
    </article>
  `;
}

function applyServerLibrarySourcesPayload(data = {}) {
  serverLibrarySources = Array.isArray(data?.sources) ? data.sources : serverLibrarySources;
  serverLibrarySourceDefaults = data?.defaults && typeof data.defaults === "object"
    ? data.defaults
    : serverLibrarySourceDefaults;
  serverLibrarySourceAllowedBases = Array.isArray(data?.allowedBases) ? data.allowedBases : serverLibrarySourceAllowedBases;
}

function serverLibrarySourceTypeLabel(type = "audio") {
  if (type === "video") return "Video";
  if (type === "both") return "Audio + video";
  return "Audio";
}

function serverLibrarySourceStatusClass(source = {}) {
  if (!source.enabled) return "isDisabled";
  if (!source.online) return "isOffline";
  if (!source.readable) return "isWarn";
  return "isOnline";
}

function serverLibrarySourceStatusLabel(source = {}) {
  if (!source.enabled) return "Disabled";
  if (!source.online) return "Offline — saved entries preserved";
  if (!source.readable) return "Online — access problem";
  return source.writable ? "Online · read/write" : "Online · read only";
}

function serverLibrarySourceStorageText(source = {}) {
  const free = Number(source.freeBytes || 0);
  const total = Number(source.totalBytes || 0);
  if (!free && !total) return source.online ? "Storage details unavailable" : "Drive currently offline";
  return `${formatServerBytes(free)} free of ${formatServerBytes(total)}`;
}

function resetServerLibrarySourceEditor(source = null) {
  serverLibrarySourceEditor = source
    ? {
        id: source.id || "",
        label: source.label || "",
        path: source.path || "",
        type: source.type || "audio",
        enabled: source.enabled !== false,
        watch: source.watch !== false,
        defaultAudioTarget: !!source.defaultAudioTarget,
        defaultVideoTarget: !!source.defaultVideoTarget,
      }
    : {
        id: "",
        label: "",
        path: "",
        type: "audio",
        enabled: true,
        watch: true,
        defaultAudioTarget: false,
        defaultVideoTarget: false,
      };
}

function captureServerLibrarySourceEditor() {
  if (!serverLibrarySourceEditor) return null;

  return {
    id: serverLibrarySourceEditor.id || "",
    label: document.getElementById("serverLibrarySourceLabel")?.value?.trim?.() || "",
    path: document.getElementById("serverLibrarySourcePath")?.value?.trim?.() || "",
    type: document.getElementById("serverLibrarySourceType")?.value || "audio",
    enabled: !!document.getElementById("serverLibrarySourceEnabled")?.checked,
    watch: !!document.getElementById("serverLibrarySourceWatch")?.checked,
    defaultAudioTarget: !!document.getElementById("serverLibrarySourceDefaultAudio")?.checked,
    defaultVideoTarget: !!document.getElementById("serverLibrarySourceDefaultVideo")?.checked,
  };
}

function renderServerLibrarySourceToggle(id, label, checked = false, desc = "") {
  return `
    <label class="serverLibrarySourceToggle">
      <input id="${escapeHtml(id)}" type="checkbox" ${checked ? "checked" : ""} />
      <span><strong>${escapeHtml(label)}</strong>${desc ? `<em>${escapeHtml(desc)}</em>` : ""}</span>
    </label>
  `;
}

function renderServerLibrarySourceCard(source = {}) {
  const defaultTags = [
    source.defaultAudioTarget ? `<span class="serverLibrarySourceTag isDefault">Default audio target</span>` : "",
    source.defaultVideoTarget ? `<span class="serverLibrarySourceTag isDefault">Default video target</span>` : "",
    source.watch ? `<span class="serverLibrarySourceTag">Watching folder</span>` : `<span class="serverLibrarySourceTag isMuted">Watch disabled</span>`,
  ].filter(Boolean).join("");

  return `
    <article class="serverLibrarySourceCard ${serverLibrarySourceStatusClass(source)}">
      <div class="serverLibrarySourceCardTop">
        <span class="serverLibrarySourceCardIcon">${iconHtml(source.online ? "hard-drive" : "wifi-slash")}</span>
        <div>
          <strong>${escapeHtml(source.label || "Library source")}</strong>
          <em>${escapeHtml(source.path || "")}</em>
        </div>
        <b>${escapeHtml(serverLibrarySourceStatusLabel(source))}</b>
      </div>

      <div class="serverLibrarySourceTags">
        <span class="serverLibrarySourceTag isType">${escapeHtml(serverLibrarySourceTypeLabel(source.type))}</span>
        ${defaultTags}
      </div>

      <div class="serverLibrarySourceMetrics">
        <span><strong>${escapeHtml(String(source.indexedAudio || 0))}</strong><em>audio files</em></span>
        <span><strong>${escapeHtml(String(source.indexedVideo || 0))}</strong><em>video files</em></span>
        <span><strong>${escapeHtml(serverLibrarySourceStorageText(source))}</strong><em>storage</em></span>
      </div>

      ${!source.online ? `<p class="serverLibrarySourceOfflineNote">${iconHtml("circle-info")} This folder is offline. BRMedia keeps its saved manifest entries and will resume watching when it returns.</p>` : ""}

      <div class="serverLibrarySourceActions">
        <a class="serverLibrarySourceBtn" href="/settings?module=cloud&amp;tab=files&amp;kind=${encodeURIComponent(source.type === "video" ? "video" : "audio")}&amp;sourceRoot=${encodeURIComponent(source.path || "")}">${iconHtml("folder-open")}<span>View files</span></a>
        <button class="serverLibrarySourceBtn" data-server-library-source-edit="${escapeHtml(source.id)}" type="button">${iconHtml("pen-to-square")}<span>Edit</span></button>
        <button class="serverLibrarySourceBtn" data-server-library-source-sync="${escapeHtml(source.id)}" type="button">${iconHtml("arrows-rotate")}<span>Sync now</span></button>
        <button class="serverLibrarySourceBtn danger" data-server-library-source-remove="${escapeHtml(source.id)}" type="button">${iconHtml("trash")}<span>Remove</span></button>
      </div>
    </article>
  `;
}

function renderServerLibrarySourceEditor() {
  const draft = serverLibrarySourceEditor;
  if (!draft) return "";

  const supportsAudio = draft.type === "audio" || draft.type === "both";
  const supportsVideo = draft.type === "video" || draft.type === "both";

  return `
    <article class="serverSettingsCard serverLibrarySourceEditorCard">
      <div class="serverSettingsCardHead">
        <span>${iconHtml(draft.id ? "pen-to-square" : "folder-plus")}</span>
        <div>
          <h3>${draft.id ? "Edit library source" : "Add library source"}</h3>
          <p>Choose a folder visible to the BRMedia server PC, then save it as an audio source, video source, or both.</p>
        </div>
      </div>

      <div class="serverLibrarySourceEditorGrid">
        <label><span>Friendly name</span><input id="serverLibrarySourceLabel" type="text" value="${escapeHtml(draft.label || "")}" placeholder="Example: E Drive Music" /></label>

        <label>
          <span>Folder path</span>
          <div class="serverLibrarySourcePathRow">
            <input id="serverLibrarySourcePath" type="text" value="${escapeHtml(draft.path || "")}" placeholder="Example: E:\\DJMixes" />
            <button class="serverLibrarySourceBrowseBtn" data-server-library-browser-open type="button">${iconHtml("folder-open")}<span>Browse</span></button>
          </div>
        </label>

        <label>
          <span>Library type</span>
          <select id="serverLibrarySourceType">
            <option value="audio" ${draft.type === "audio" ? "selected" : ""}>Audio</option>
            <option value="video" ${draft.type === "video" ? "selected" : ""}>Video</option>
            <option value="both" ${draft.type === "both" ? "selected" : ""}>Audio + video</option>
          </select>
        </label>
      </div>

      <div class="serverLibrarySourceToggleGrid">
        ${renderServerLibrarySourceToggle("serverLibrarySourceEnabled", "Enable this source", draft.enabled !== false, "Disabled sources remain saved but are not synced.")}
        ${renderServerLibrarySourceToggle("serverLibrarySourceWatch", "Watch for changes", draft.watch !== false, "Automatically detects newly added or removed media.")}
        ${supportsAudio ? renderServerLibrarySourceToggle("serverLibrarySourceDefaultAudio", "Default audio target", !!draft.defaultAudioTarget, "Use this folder for audio handoffs and imports.") : ""}
        ${supportsVideo ? renderServerLibrarySourceToggle("serverLibrarySourceDefaultVideo", "Default video target", !!draft.defaultVideoTarget, "Use this folder for video handoffs and imports.") : ""}
      </div>

      <div class="serverSettingsActions">
        <button class="serverSettingsBtn primary ${serverLibrarySourceBusyAction === "save" ? "isBusy" : ""}" data-server-library-source-save type="button">${iconHtml("floppy-disk")}<span>${serverLibrarySourceBusyAction === "save" ? "Saving…" : "Save source"}</span></button>
        <button class="serverSettingsBtn" data-server-library-source-cancel type="button">${iconHtml("circle-xmark")}<span>Cancel</span></button>
      </div>
    </article>
  `;
}

function renderServerLibraryBrowser() {
  if (!serverLibraryBrowser.open) return "";

  const current = serverLibraryBrowser.currentPath || "Server drives";

  return `
    <div class="serverLibraryBrowserOverlay" role="dialog" aria-modal="true" aria-label="Browse server folders">
      <div class="serverLibraryBrowserBackdrop" data-server-library-browser-close></div>

      <section class="serverLibraryBrowserPanel">
        <div class="serverLibraryBrowserHead">
          <div>
            <strong>Browse server folders</strong>
            <em>Choose a folder on the BRMedia PC, attached drive or mapped network share.</em>
          </div>

          <button data-server-library-browser-close type="button" aria-label="Close folder browser">${iconHtml("xmark")}</button>
        </div>

        <div class="serverLibraryBrowserPath">${iconHtml("folder-open")}<code>${escapeHtml(current)}</code></div>

        <div class="serverLibraryBrowserActions">
          <button ${serverLibraryBrowser.parentPath ? "" : "disabled"} data-server-library-browser-path="${escapeHtml(serverLibraryBrowser.parentPath || "")}" type="button">${iconHtml("arrow-left")}<span>Up one folder</span></button>
          <button data-server-library-browser-path="" type="button">${iconHtml("hard-drive")}<span>Drive list</span></button>
          ${serverLibraryBrowser.currentPath ? `<button class="primary" data-server-library-browser-select type="button">${iconHtml("circle-check")}<span>Use this folder</span></button>` : ""}
        </div>

        ${serverLibraryBrowser.error ? `<div class="serverLibraryBrowserError">${escapeHtml(serverLibraryBrowser.error)}</div>` : ""}

        ${serverLibraryBrowser.loading ? `<div class="serverLibraryBrowserEmpty">Loading folders…</div>` : `
          <div class="serverLibraryBrowserList">
            ${(serverLibraryBrowser.currentPath ? [] : serverLibraryBrowser.drives).map((item) => `<button data-server-library-browser-path="${escapeHtml(item.path)}" type="button">${iconHtml("hard-drive")}<span><strong>${escapeHtml(item.name)}</strong><em>Open drive</em></span></button>`).join("")}
            ${(serverLibraryBrowser.folders || []).map((item) => `<button data-server-library-browser-path="${escapeHtml(item.path)}" type="button">${iconHtml("folder")}<span><strong>${escapeHtml(item.name)}</strong><em>Open folder</em></span></button>`).join("")}
            ${!serverLibraryBrowser.currentPath && !serverLibraryBrowser.drives.length ? `<div class="serverLibraryBrowserEmpty">No server drives were returned.</div>` : ""}
            ${serverLibraryBrowser.currentPath && !serverLibraryBrowser.folders.length ? `<div class="serverLibraryBrowserEmpty">No subfolders here. You can still choose this folder.</div>` : ""}
          </div>
        `}
      </section>
    </div>
  `;
}

function renderServerLibrarySourcesSection() {
  const sources = Array.isArray(serverLibrarySources) ? serverLibrarySources : [];
  const online = sources.filter((source) => source.enabled && source.online).length;
  const offline = sources.filter((source) => source.enabled && !source.online).length;
  const indexedAudio = sources.reduce((sum, source) => sum + Number(source.indexedAudio || 0), 0);
  const indexedVideo = sources.reduce((sum, source) => sum + Number(source.indexedVideo || 0), 0);

  return `
    <div class="serverSettingsMetricGrid">
      ${serverMetricCardHtml(String(sources.length), "Saved sources", sources.length ? "isOk" : "isWarn")}
      ${serverMetricCardHtml(String(online), "Online", online ? "isOk" : "isWarn")}
      ${serverMetricCardHtml(String(offline), "Offline", offline ? "isWarn" : "isOk")}
      ${serverMetricCardHtml(`${indexedAudio} / ${indexedVideo}`, "Audio / video files", "isOk")}
    </div>

    <article class="serverSettingsCard">
      <div class="serverSettingsCardHead">
        <span>${iconHtml("hard-drive")}</span>
        <div>
          <h3>Drives + library sources</h3>
          <p>Add folders from this PC, attached drives, mapped drives or network shares. You can browse and save them from any phone, tablet or PC connected to BRMedia.</p>
        </div>
      </div>

      <div class="serverSettingsNotice">${escapeHtml(serverSettingsNotice)}</div>

      <div class="serverSettingsActions">
        <button class="serverSettingsBtn primary" data-server-library-source-add type="button">${iconHtml("folder-plus")}<span>Add library source</span></button>
        <button class="serverSettingsBtn ${serverLibrarySourceBusyAction === "sync-all" ? "isBusy" : ""}" data-server-library-sync-all type="button">${iconHtml("arrows-rotate")}<span>${serverLibrarySourceBusyAction === "sync-all" ? "Syncing…" : "Sync all sources"}</span></button>
        <a class="serverSettingsBtn" href="/settings?module=cloud&amp;tab=files">${iconHtml("folder-open")}<span>Open View Files</span></a>
        <a class="serverSettingsBtn" href="/settings?module=cloud&amp;tab=add-files">${iconHtml("upload")}<span>Upload media</span></a>
      </div>

      <div class="serverLibrarySourcesHelp">
        <p>${iconHtml("circle-info")} Your phone browses folders visible to the BRMedia server PC. To send files stored on the phone itself, use Upload Media instead.</p>
        <p><strong>Default audio:</strong> ${escapeHtml(serverLibrarySourceDefaults.audio || "Not selected")}<br /><strong>Default video:</strong> ${escapeHtml(serverLibrarySourceDefaults.video || "Not selected")}</p>
      </div>
    </article>

    ${serverLibrarySourceEditor ? renderServerLibrarySourceEditor() : ""}

    <section class="serverLibrarySourceList">
      ${sources.length ? sources.map(renderServerLibrarySourceCard).join("") : `<article class="serverSettingsCard"><div class="serverLibraryBrowserEmpty">No library sources are saved yet. Add your first audio or video folder.</div></article>`}
    </section>

    ${renderServerLibraryBrowser()}
  `;
}

async function loadServerLibraryBrowser(folderPath = "") {
  serverLibraryBrowser.loading = true;
  serverLibraryBrowser.error = "";
  renderServerSettings();

  try {
    const query = folderPath ? `?path=${encodeURIComponent(folderPath)}` : "";
    const data = await serverSettingsApiJson(`/server-settings/library-sources/browse${query}`);

    serverLibraryBrowser = {
      open: true,
      loading: false,
      currentPath: data.currentPath || "",
      parentPath: data.parentPath || "",
      drives: Array.isArray(data.drives) ? data.drives : [],
      folders: Array.isArray(data.folders) ? data.folders : [],
      error: "",
    };
  } catch (err) {
    serverLibraryBrowser.loading = false;
    serverLibraryBrowser.error = err?.message || String(err);
  }

  renderServerSettings();
}

async function openServerLibraryBrowser() {
  const draft = captureServerLibrarySourceEditor();
  if (draft) serverLibrarySourceEditor = draft;

  serverLibraryBrowser.open = true;
  await loadServerLibraryBrowser(serverLibrarySourceEditor?.path || "");
}

function closeServerLibraryBrowser() {
  serverLibraryBrowser.open = false;
  renderServerSettings();
}

function selectCurrentServerLibraryBrowserFolder() {
  if (!serverLibrarySourceEditor || !serverLibraryBrowser.currentPath) return;

  serverLibrarySourceEditor.path = serverLibraryBrowser.currentPath;
  serverLibraryBrowser.open = false;
  renderServerSettings();
}

async function saveServerLibrarySource() {
  const draft = captureServerLibrarySourceEditor();
  if (!draft) return;

  if (!draft.path) {
    serverSettingsNotice = "Choose or type a server folder path first.";
    renderServerSettings();
    return;
  }

  serverLibrarySourceBusyAction = "save";
  serverSettingsNotice = draft.id ? "Updating library source…" : "Saving library source…";
  renderServerSettings();

  try {
    const data = await serverSettingsApiJson("/server-settings/library-sources", {
      method: "POST",
      body: JSON.stringify(draft),
    });

    applyServerLibrarySourcesPayload(data);
    serverLibrarySourceEditor = null;
    serverSettingsNotice = "Library source saved and synced.";
  } catch (err) {
    serverSettingsNotice = `Library source save failed: ${err?.message || String(err)}`;
  }

  serverLibrarySourceBusyAction = "";
  renderServerSettings();
}

async function syncAllServerLibrarySources() {
  serverLibrarySourceBusyAction = "sync-all";
  serverSettingsNotice = "Syncing all saved library sources…";
  renderServerSettings();

  try {
    const data = await serverSettingsApiJson("/server-settings/library-sources/sync-all", {
      method: "POST",
      body: "{}",
    });

    applyServerLibrarySourcesPayload(data);
    serverSettingsNotice = "All library sources synced.";
  } catch (err) {
    serverSettingsNotice = `Library source sync failed: ${err?.message || String(err)}`;
  }

  serverLibrarySourceBusyAction = "";
  renderServerSettings();
}

async function syncOneServerLibrarySource(id = "") {
  if (!id) return;

  serverLibrarySourceBusyAction = `sync:${id}`;
  serverSettingsNotice = "Syncing selected library source…";
  renderServerSettings();

  try {
    const data = await serverSettingsApiJson(`/server-settings/library-sources/${encodeURIComponent(id)}/sync`, {
      method: "POST",
      body: "{}",
    });

    applyServerLibrarySourcesPayload(data);
    serverSettingsNotice = "Library source synced.";
  } catch (err) {
    serverSettingsNotice = `Library source sync failed: ${err?.message || String(err)}`;
  }

  serverLibrarySourceBusyAction = "";
  renderServerSettings();
}

async function removeServerLibrarySource(id = "") {
  const source = serverLibrarySources.find((item) => item.id === id);
  if (!source) return;

  if (!window.confirm(`Remove ${source.label || source.path} from BRMedia? The physical files will not be deleted.`)) return;

  serverLibrarySourceBusyAction = `remove:${id}`;
  serverSettingsNotice = "Removing library source…";
  renderServerSettings();

  try {
    const data = await serverSettingsApiJson(`/server-settings/library-sources/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    applyServerLibrarySourcesPayload(data);
    serverSettingsNotice = "Library source removed. Physical media files were left untouched.";
  } catch (err) {
    serverSettingsNotice = `Library source removal failed: ${err?.message || String(err)}`;
  }

  serverLibrarySourceBusyAction = "";
  renderServerSettings();
}

function renderServerDjSection() {
  return `
    <div class="serverSettingsMetricGrid">
      ${serverMetricCardHtml("Browser", "DJ engine", "isOk")}
      ${serverMetricCardHtml("Cached", "Waveforms / grids", "isOk")}
      ${serverMetricCardHtml("Planned", "FFmpeg finalise", "isWarn")}
      ${serverMetricCardHtml("Multi-root", "DJ sources", "")}
    </div>

    <article class="serverSettingsCard serverDjCard">
      <div class="serverSettingsCardHead">
        <span>${iconHtml("record-vinyl")}</span>
        <div>
          <h3>DJ Mixer server foundation</h3>
          <p>Server Settings now tracks the browser DJ Studio pieces: Collection roots, cached waveform/grid prep, recordings and the upcoming FFmpeg final-format pipeline.</p>
        </div>
      </div>

      <div class="serverDjPathGrid">
        <span>
          <strong>DJ tracks</strong>
          <code>Managed from Universal Settings → DJ Mixing → Collection.</code>
        </span>
        <span>
          <strong>Samples / short tracks</strong>
          <code>Short mixable files stay default; long mixes remain opt-in.</code>
        </span>
        <span>
          <strong>Recording output</strong>
          <code>DJ recordings folder + Player/Mastering/Converter/Tagger handoff.</code>
        </span>
        <span>
          <strong>Analysis cache</strong>
          <code>Waveforms, BPM, beat-grid, downbeat and prepared badges.</code>
        </span>
      </div>

      <div class="serverDjFlagRow">
        <span>Browser-first</span>
        <span>No native-only DJ path</span>
        <span>iPhone + Android</span>
        <span>HTTPS recommended</span>
      </div>

      <p class="serverDjDriverNote">
        ${iconHtml("circle-info")}
        The DJ Mixer page remains Web Audio / browser-based. Server work here is for sources, cache health, waveform rebuilds, recording storage and final WAV/FLAC/MP3 conversion.
      </p>

      <div class="serverSettingsActions serverDjActions">
        <a class="serverSettingsBtn primary" href="/dj-mixer">
          ${iconHtml("record-vinyl")}
          <span>Open DJ Mixer</span>
        </a>
        <a class="serverSettingsBtn" href="/dj-mixer?view=library">
          ${iconHtml("folder-open")}
          <span>Open DJ Collection</span>
        </a>
        <a class="serverSettingsBtn" href="/settings?module=dj&amp;tab=library">
          ${iconHtml("sliders")}
          <span>DJ source settings</span>
        </a>
        <a class="serverSettingsBtn" href="/server-settings?section=tools">
          ${iconHtml("wrench")}
          <span>FFmpeg tools</span>
        </a>
      </div>
    </article>
  `;
}

function renderServerOverviewSection() {
  return `
    ${serverSettingsStatusRows()}
    ${renderServerHealthCards()}
    ${renderServerAdminStatusPanel()}

    <article class="serverSettingsCard">
      <div class="serverSettingsCardHead">
        <span>${iconHtml("server")}</span>
        <div>
          <h3>Server control centre</h3>
          <p>Jump into API keys, cloud OAuth, folder paths, FFmpeg/tools and maintenance from clean section cards.</p>
        </div>
      </div>
      ${renderServerSectionCards()}
    </article>

    <article class="serverSettingsCard">
      <div class="serverSettingsCardHead">
        <span>${iconHtml("triangle-exclamation")}</span>
        <div>
          <h3>Restart + page refresh tools</h3>
          <p>Use these from your phone/SSH/CMD whenever BRMedia needs a restart or a stubborn page needs fresh CSS/JS.</p>
        </div>
      </div>

      <div class="serverSettingsActions serverMaintenanceActions">
        <button class="serverSettingsBtn primary" data-server-clear-page-cache type="button">
          ${iconHtml("broom")}
          <span>Delete page cache + reload</span>
        </button>

        <button class="serverSettingsBtn" data-server-copy-restart type="button">
          ${iconHtml("clipboard")}
          <span>Copy restart command</span>
        </button>
      </div>

      ${restartCommandBoxHtml()}

      <div class="serverSettingsHelp">
        <p>Current API key save file: <code>server/data/brmedia-server-secrets.json</code></p>
      </div>
    </article>
  `;
}

function getServerTorrentSetting(path, fallback = "") {
  const root = serverTorrentState || {};
  return String(path || "").split(".").reduce((value, key) => (value && value[key] !== undefined ? value[key] : undefined), root) ?? fallback;
}

function getServerTorrentInputValue(id = "") {
  return document.getElementById(id)?.value?.trim?.() || "";
}

function getServerTorrentCheckboxValue(id = "") {
  return !!document.getElementById(id)?.checked;
}

function renderServerTorrentField(id, label, value = "", desc = "", type = "text", attrs = "") {
  return `
    <label class="serverTorrentField">
      <span>${escapeHtml(label)}</span>
      <input id="${escapeHtml(id)}" type="${escapeHtml(type)}" value="${escapeHtml(value)}" ${attrs} autocomplete="off" autocapitalize="off" spellcheck="false" />
      ${desc ? `<em>${escapeHtml(desc)}</em>` : ""}
    </label>
  `;
}

function renderServerTorrentToggle(id, label, checked = false, desc = "") {
  return `
    <label class="serverTorrentToggle">
      <input id="${escapeHtml(id)}" type="checkbox" ${checked ? "checked" : ""} />
      <span><strong>${escapeHtml(label)}</strong>${desc ? `<em>${escapeHtml(desc)}</em>` : ""}</span>
    </label>
  `;
}

function renderServerTorrentSection() {
  const engine = serverTorrentState?.engine || {};
  const summary = serverTorrentState?.summary || {};
  const settings = serverTorrentState?.settings || {};
  const bandwidth = settings.bandwidth || {};
  const scheduler = settings.scheduler || {};
  const cache = settings.cache || {};
  const protocols = settings.protocols || {};
  const security = settings.security || {};
  const firstWindow = Array.isArray(scheduler.windows) ? scheduler.windows[0] || {} : {};
  const status = String(engine.status || (engine.enabled ? "enabled" : "disabled"));
  const connected = status === "connected";

  return `
    ${serverSettingsStatusRows()}
    ${renderServerHealthCards()}
    ${renderServerAdminStatusPanel()}

    <article class="serverSettingsCard serverTorrentCard">
      <div class="serverSettingsCardHead">
        <span>${iconHtml("magnet")}</span>
        <div>
          <h3>Torrents server settings</h3>
          <p>Deep qBittorrent/server controls live here. Universal Settings can stay user-friendly; this page is the admin engine room.</p>
        </div>
      </div>

      <div class="serverSettingsMetricGrid">
        ${serverMetricCardHtml(engine.enabled ? "On" : "Off", "Engine", engine.enabled ? "isOk" : "isWarn")}
        ${serverMetricCardHtml(connected ? "Connected" : status, "qBittorrent", connected ? "isOk" : "isWarn")}
        ${serverMetricCardHtml(String(summary.total || 0), "Queue items", "isOk")}
        ${serverMetricCardHtml(`${summary.downloadSpeedKb || 0} KB/s`, "Download speed", Number(summary.downloadSpeedKb || 0) ? "isOk" : "")}
      </div>

      <div class="serverSettingsNotice">${escapeHtml(serverSettingsNotice)} ${engine.note ? escapeHtml(engine.note) : ""}</div>

      <div class="serverTorrentGrid">
        <section class="serverTorrentPanel">
          <h4>${iconHtml("plug")} qBittorrent Web UI</h4>
          ${renderServerTorrentToggle("serverTorrent_enabled", "Enable qBittorrent engine", !!engine.enabled, "BRMedia uses the local qBittorrent Web API on this PC.")}
          ${renderServerTorrentField("serverTorrent_baseUrl", "Web UI URL", engine.baseUrl || "http://127.0.0.1:8080", "Usually http://127.0.0.1:8080.")}
          ${renderServerTorrentField("serverTorrent_username", "Username", engine.username || "", "qBittorrent Web UI username.")}
          ${renderServerTorrentField("serverTorrent_password", "Password", "", engine.password ? "Leave blank to keep the saved password." : "Enter Web UI password.", "password")}
          ${renderServerTorrentField("serverTorrent_savePath", "Default save path", engine.savePath || "C:\\BRMedia\\Torrents\\Downloads", "qBittorrent download folder before BRMedia handoff.")}
        </section>

        <section class="serverTorrentPanel">
          <h4>${iconHtml("gauge-high")} Bandwidth + scheduler</h4>
          <div class="serverTorrentMiniGrid">
            ${renderServerTorrentField("serverTorrent_dl", "Download limit KB/s", bandwidth.downloadLimitKb ?? 0, "0 = unlimited", "number", 'min="0" step="10"')}
            ${renderServerTorrentField("serverTorrent_ul", "Upload limit KB/s", bandwidth.uploadLimitKb ?? 0, "0 = unlimited", "number", 'min="0" step="10"')}
            ${renderServerTorrentField("serverTorrent_slowDl", "Slow mode download", bandwidth.slowModeDownloadKb ?? 512, "KB/s", "number", 'min="0" step="10"')}
            ${renderServerTorrentField("serverTorrent_slowUl", "Slow mode upload", bandwidth.slowModeUploadKb ?? 64, "KB/s", "number", 'min="0" step="10"')}
          </div>
          ${renderServerTorrentToggle("serverTorrent_scheduler", "Enable qBittorrent scheduler", !!scheduler.enabled, "Use a download/seeding time window.")}
          <div class="serverTorrentMiniGrid">
            ${renderServerTorrentField("serverTorrent_day", "Days", firstWindow.day || "Mon-Fri", "Example: Mon-Fri or Sat-Sun")}
            ${renderServerTorrentField("serverTorrent_start", "Start", firstWindow.start || "00:00", "24-hour time")}
            ${renderServerTorrentField("serverTorrent_end", "End", firstWindow.end || "07:00", "24-hour time")}
          </div>
        </section>

        <section class="serverTorrentPanel">
          <h4>${iconHtml("hard-drive")} Cache + protocols</h4>
          ${renderServerTorrentToggle("serverTorrent_cacheEnabled", "Enable disk cache", cache.enabled !== false, "Reduce heavy disk churn during large downloads.")}
          ${renderServerTorrentField("serverTorrent_cacheSize", "Cache size MB", cache.sizeMb ?? 512, "Set 0 to let qBittorrent decide.", "number", 'min="0" step="64"')}
          ${renderServerTorrentToggle("serverTorrent_writeCoalesce", "Coalesce small writes", cache.writeCoalesce !== false, "Group smaller writes where possible.")}
          ${renderServerTorrentToggle("serverTorrent_reduceWear", "Reduce disk wear", cache.reduceDiskWear !== false, "Use safer cache TTL defaults.")}
          <div class="serverTorrentToggleGrid">
            ${renderServerTorrentToggle("serverTorrent_upnp", "UPnP", protocols.upnp !== false)}
            ${renderServerTorrentToggle("serverTorrent_nat", "NAT-PMP", protocols.natPmp !== false)}
            ${renderServerTorrentToggle("serverTorrent_pe", "Protocol encryption", protocols.protocolEncryption !== false)}
            ${renderServerTorrentToggle("serverTorrent_ipv6", "IPv6", protocols.ipv6 !== false)}
          </div>
        </section>

        <section class="serverTorrentPanel">
          <h4>${iconHtml("shield")} Safety + quarantine</h4>
          ${renderServerTorrentToggle("serverTorrent_scanTorrent", "Scan .torrent names before adding", security.scanTorrentFiles !== false, "Blocks obvious risky payload names.")}
          ${renderServerTorrentToggle("serverTorrent_scanDownloaded", "Scan downloaded content", security.scanDownloadedFiles !== false, "Prepared for downloaded-content scanning.")}
          ${renderServerTorrentToggle("serverTorrent_blockSuspicious", "Block suspicious files", security.blockSuspiciousFiles !== false, "Require manual unblock before queue/use.")}
          ${renderServerTorrentField("serverTorrent_quarantine", "Quarantine folder", security.quarantineFolder || "C:\\BRMedia\\Quarantine", "Future suspicious-file holding folder.")}
        </section>
      </div>

      <div class="serverSettingsActions serverMaintenanceActions">
        <button class="serverSettingsBtn primary ${serverTorrentBusyAction === "save" ? "isBusy" : ""}" data-server-torrent-save type="button">
          ${iconHtml("floppy-disk")}
          <span>${serverTorrentBusyAction === "save" ? "Saving…" : "Save torrent settings"}</span>
        </button>
        <button class="serverSettingsBtn ${serverTorrentBusyAction === "apply" ? "isBusy" : ""}" data-server-torrent-apply type="button">
          ${iconHtml("bolt")}
          <span>${serverTorrentBusyAction === "apply" ? "Applying…" : "Save + apply to qBittorrent"}</span>
        </button>
        <button class="serverSettingsBtn ${serverTorrentBusyAction === "test" ? "isBusy" : ""}" data-server-torrent-test type="button">
          ${iconHtml("plug")}
          <span>${serverTorrentBusyAction === "test" ? "Testing…" : "Test connection"}</span>
        </button>
      </div>
    </article>
  `;
}

function buildServerTorrentSettingsBody(applyToEngine = false) {
  const engine = {
    enabled: getServerTorrentCheckboxValue("serverTorrent_enabled"),
    baseUrl: getServerTorrentInputValue("serverTorrent_baseUrl") || "http://127.0.0.1:8080",
    username: getServerTorrentInputValue("serverTorrent_username"),
    savePath: getServerTorrentInputValue("serverTorrent_savePath") || "C:\\BRMedia\\Torrents\\Downloads",
  };
  const password = getServerTorrentInputValue("serverTorrent_password");
  if (password) engine.password = password;

  return {
    applyToEngine: !!applyToEngine,
    engine,
    bandwidth: {
      downloadLimitKb: Number(getServerTorrentInputValue("serverTorrent_dl") || 0),
      uploadLimitKb: Number(getServerTorrentInputValue("serverTorrent_ul") || 0),
      slowModeDownloadKb: Number(getServerTorrentInputValue("serverTorrent_slowDl") || 512),
      slowModeUploadKb: Number(getServerTorrentInputValue("serverTorrent_slowUl") || 64),
    },
    scheduler: {
      enabled: getServerTorrentCheckboxValue("serverTorrent_scheduler"),
      windows: [{
        day: getServerTorrentInputValue("serverTorrent_day") || "Mon-Fri",
        start: getServerTorrentInputValue("serverTorrent_start") || "00:00",
        end: getServerTorrentInputValue("serverTorrent_end") || "07:00",
      }],
    },
    cache: {
      enabled: getServerTorrentCheckboxValue("serverTorrent_cacheEnabled"),
      sizeMb: Number(getServerTorrentInputValue("serverTorrent_cacheSize") || 512),
      writeCoalesce: getServerTorrentCheckboxValue("serverTorrent_writeCoalesce"),
      reduceDiskWear: getServerTorrentCheckboxValue("serverTorrent_reduceWear"),
    },
    protocols: {
      magnetLinks: true,
      upnp: getServerTorrentCheckboxValue("serverTorrent_upnp"),
      natPmp: getServerTorrentCheckboxValue("serverTorrent_nat"),
      protocolEncryption: getServerTorrentCheckboxValue("serverTorrent_pe"),
      ipv6: getServerTorrentCheckboxValue("serverTorrent_ipv6"),
    },
    security: {
      scanTorrentFiles: getServerTorrentCheckboxValue("serverTorrent_scanTorrent"),
      scanDownloadedFiles: getServerTorrentCheckboxValue("serverTorrent_scanDownloaded"),
      blockSuspiciousFiles: getServerTorrentCheckboxValue("serverTorrent_blockSuspicious"),
      quarantineFolder: getServerTorrentInputValue("serverTorrent_quarantine") || "C:\\BRMedia\\Quarantine",
    },
  };
}

async function saveServerTorrentSettings(applyToEngine = false) {
  serverTorrentBusyAction = applyToEngine ? "apply" : "save";
  serverSettingsNotice = applyToEngine ? "Saving and applying torrent settings…" : "Saving torrent settings…";
  renderServerSettings();

  try {
    const data = await serverSettingsApiJson("/torrent/settings", {
      method: "POST",
      body: JSON.stringify(buildServerTorrentSettingsBody(applyToEngine)),
    });

    serverTorrentState = data?.state || data?.state?.state || serverTorrentState;
    const engineApply = data?.engineApply;
    serverSettingsNotice = engineApply?.error
      ? `Torrent settings saved, but apply failed: ${engineApply.error}`
      : applyToEngine
        ? "Torrent settings saved and applied to qBittorrent."
        : "Torrent settings saved.";
    addServerAdminLog("Torrent settings saved", serverSettingsNotice, !engineApply?.error, { type: "torrent" });
  } catch (err) {
    serverSettingsNotice = `Torrent settings save failed: ${err?.message || String(err)}`;
    addServerAdminLog("Torrent settings failed", serverSettingsNotice, false, { type: "torrent" });
  }

  serverTorrentBusyAction = "";
  renderServerSettings();
}

async function testServerTorrentConnection() {
  serverTorrentBusyAction = "test";
  serverSettingsNotice = "Testing qBittorrent connection…";
  renderServerSettings();

  try {
    const data = await serverSettingsApiJson("/torrent/engine/test", { method: "POST", body: "{}" });
    serverTorrentState = data?.state || serverTorrentState;
    serverSettingsNotice = data.ok ? "qBittorrent connected." : (data.error || "qBittorrent is not connected yet.");
    addServerAdminLog("Torrent engine test", serverSettingsNotice, !!data.ok, { type: "torrent" });
  } catch (err) {
    serverSettingsNotice = `Torrent engine test failed: ${err?.message || String(err)}`;
    addServerAdminLog("Torrent engine test failed", serverSettingsNotice, false, { type: "torrent" });
  }

  serverTorrentBusyAction = "";
  renderServerSettings();
}

async function loadServerTorrentSettings(options = {}) {
  try {
    serverTorrentState = await serverSettingsApiJson("/torrent/state");
  } catch (err) {
    if (!options.quiet) serverSettingsNotice = `Could not load torrent server settings: ${err?.message || String(err)}`;
  }

  if (options.render !== false) renderServerSettings();
}

function renderServerMaintenanceSection() {
  return `
    ${serverSettingsStatusRows()}
    ${renderServerHealthCards()}
    ${renderServerAdminStatusPanel()}

    <article class="serverSettingsCard">
      <div class="serverSettingsCardHead">
        <span>${iconHtml("shield")}</span>
        <div>
          <h3>Maintenance + admin tools</h3>
          <p>Run diagnostics, clear waveform cache, rebuild missing peaks, rescan libraries and refresh video metadata from one admin panel.</p>
        </div>
      </div>

      <div class="serverAdminActionGrid">
        ${serverAdminActionButton("ffmpeg-check", "wrench", "FFmpeg check", "Confirms FFmpeg starts and reports its version.")}
        ${serverAdminActionButton("folder-check", "folder-open", "Folder access check", "Checks audio, video, import and allowed-base folders.")}
        ${serverAdminActionButton("clear-page-cache", "broom", "Clear page cache", "Clears browser page cache and reloads with cacheBust.", "primary")}
        ${serverAdminActionButton("clear-waveform-cache", "trash", "Clear waveform cache", "Deletes cached waveform peak files so they can rebuild.", "danger")}
        ${serverAdminActionButton("clear-waveform-failed", "circle-check", "Clear failed waveform jobs", "Clears the failed waveform retry list.")}
        ${serverAdminActionButton("rebuild-missing-waveforms", "waveform", "Rebuild missing waveforms", "Starts a server job for missing waveform peaks.", "primary")}
        ${serverAdminActionButton("rescan-audio", "music", "Rescan audio", "Scans allowed audio folders and adds missing files.")}
        ${serverAdminActionButton("rescan-video", "film", "Rescan video", "Refreshes the video library from video roots.")}
        ${serverAdminActionButton("rebuild-video-metadata", "tags", "Rebuild missing video metadata", "Searches missing video metadata for up to 25 unmatched videos.")}
      </div>
    </article>

    <article class="serverSettingsCard">
      <div class="serverSettingsCardHead">
        <span>${iconHtml("waveform")}</span>
        <div>
          <h3>Waveform rebuild progress</h3>
          <p>Progress appears here when a Server Settings waveform rebuild is running.</p>
        </div>
      </div>
      ${renderServerWaveformJob()}
    </article>

    <article class="serverSettingsCard">
      <div class="serverSettingsCardHead">
        <span>${iconHtml("folder-open")}</span>
        <div>
          <h3>Folder access results</h3>
          <p>Shows the latest folder check from the server.</p>
        </div>
      </div>
      ${renderServerFolderCheckResults()}
    </article>

    <article class="serverSettingsCard">
      <div class="serverSettingsCardHead">
        <span>${iconHtml("clipboard")}</span>
        <div>
          <h3>Admin action log</h3>
          <p>Latest Server Settings tool results from this browser session.</p>
        </div>
      </div>
      ${renderServerAdminLog()}
      ${restartCommandBoxHtml()}
    </article>
  `;
}

function renderServerSettingsSection() {
  switch (serverSettingsActiveSection) {
    case "sources":
      return renderServerLibrarySourcesSection();
    case "secrets":
      return renderServerSecretManagerCard("API keys", "Metadata and ratings keys used by Video Player, Settings and metadata search.", ["Video metadata"]);
    case "cloud":
      return renderServerSecretManagerCard("Cloud OAuth", "Google Drive and Dropbox app credentials. Save here, then restart before fresh OAuth linking.", ["Google Drive", "Dropbox"]);
    case "folders":
      return renderServerSecretManagerCard("Folders + imports", "Library roots and import destinations used by audio, video, cloud sync and direct URL imports.", ["Folders"]);
    case "tools":
      return renderServerSecretManagerCard("FFmpeg + tools", "Server-side tool paths used by converter, mastering, previews, waveforms and video browser copies.", ["Tools"]);
    case "torrents":
      return renderServerTorrentSection();
case "dj":
  return renderServerDjSection();
    case "maintenance":
      return renderServerMaintenanceSection();
    default:
      return renderServerOverviewSection();
  }
}

function renderServerSettings() {
  if (!serverSettingsRoot) return;

  const section = serverSettingsSectionInfo();

  serverSettingsRoot.innerHTML = `
    <section class="serverSettingsDashboard">
      <article class="serverSettingsHero">
        <span>${iconHtml(section.icon || "server")}</span>
        <div>
          <div class="serverSettingsEyebrow">BRMedia Server</div>
          <h2>${escapeHtml(section.title)}</h2>
          <p>${escapeHtml(section.desc)} Server Settings is now split into tidy sections, controlled from the main menu.</p>
        </div>
      </article>

      ${renderServerSettingsSection()}
    </section>
  `;

  bindServerSettingsEvents();
  hydrateBrIcons(serverSettingsRoot);
  updateServerSettingsSidebarActive();
}

async function loadServerSettings() {
  try {
    serverSettingsNotice = "Reading server settings…";
    renderServerSettings();

const [data, health, torrent, librarySources] = await Promise.all([
  serverSettingsApiJson("/server-settings/secrets"),
  serverSettingsApiJson("/server-settings/admin/health").catch(() => null),
  serverSettingsApiJson("/torrent/state").catch(() => null),
  serverSettingsApiJson("/server-settings/library-sources").catch(() => null),
]);

    serverSecretStatus = Array.isArray(data?.status) ? data.status : [];
    serverAdminHealth = health || serverAdminHealth;
    serverTorrentState = torrent || serverTorrentState;

    if (librarySources) {
      applyServerLibrarySourcesPayload(librarySources);
    }
    serverSettingsNotice = "Ready. Paste any new values, then save.";
  } catch (err) {
    serverSettingsNotice = `Could not load server settings: ${err?.message || String(err)}`;
  }

  renderServerSettings();
}

function getEnteredServerSecretValues() {
  const values = {};

  serverSecretStatus.forEach((field) => {
    const input = document.getElementById(`serverSecret_${field.key}`);
    const value = input?.value?.trim() || "";
    if (value) values[field.key] = value;
  });

  return values;
}

function getServerSecretClearKeys() {
  return Array.from(document.querySelectorAll("[data-server-secret-clear]:checked"))
    .map((input) => input.dataset.serverSecretClear)
    .filter(Boolean);
}

async function saveEnteredServerSecrets() {
  const values = getEnteredServerSecretValues();

  if (!Object.keys(values).length) {
    serverSettingsNotice = "Nothing entered. Paste at least one value first.";
    renderServerSettings();
    return;
  }

  try {
    serverSettingsNotice = "Saving server settings…";
    renderServerSettings();

    const data = await serverSettingsApiJson("/server-settings/secrets", {
      method: "POST",
      body: JSON.stringify({ values }),
    });

    serverSecretStatus = Array.isArray(data?.status) ? data.status : serverSecretStatus;
    serverSettingsNotice = `${data?.changed || 0} value(s) saved. Restart BRMedia if you changed OAuth or folder/tool paths.`;
  } catch (err) {
    serverSettingsNotice = `Save failed: ${err?.message || String(err)}`;
  }

  renderServerSettings();
}

async function clearTickedServerSecrets() {
  const keys = getServerSecretClearKeys();

  if (!keys.length) {
    serverSettingsNotice = "Tick one or more Clear boxes first.";
    renderServerSettings();
    return;
  }

  try {
    serverSettingsNotice = "Clearing selected values…";
    renderServerSettings();

    const data = await serverSettingsApiJson("/server-settings/secrets/clear", {
      method: "POST",
      body: JSON.stringify({ keys }),
    });

    serverSecretStatus = Array.isArray(data?.status) ? data.status : serverSecretStatus;
    serverSettingsNotice = `${data?.changed || 0} saved value(s) cleared.`;
  } catch (err) {
    serverSettingsNotice = `Clear failed: ${err?.message || String(err)}`;
  }

  renderServerSettings();
}

function bindServerSettingsEvents() {
  serverSettingsRoot?.querySelectorAll("[data-server-settings-section]").forEach((button) => {
    button.addEventListener("click", () => setServerSettingsSection(button.dataset.serverSettingsSection || "overview"));
  });
	
  serverSettingsRoot?.querySelector("[data-server-library-source-add]")?.addEventListener("click", () => {
    resetServerLibrarySourceEditor();
    renderServerSettings();
  });

  serverSettingsRoot?.querySelector("[data-server-library-source-cancel]")?.addEventListener("click", () => {
    serverLibrarySourceEditor = null;
    renderServerSettings();
  });

  serverSettingsRoot?.querySelector("[data-server-library-source-save]")?.addEventListener("click", () => {
    void saveServerLibrarySource();
  });

  serverSettingsRoot?.querySelector("#serverLibrarySourceType")?.addEventListener("change", () => {
    serverLibrarySourceEditor = captureServerLibrarySourceEditor();
    renderServerSettings();
  });

  serverSettingsRoot?.querySelector("[data-server-library-sync-all]")?.addEventListener("click", () => {
    void syncAllServerLibrarySources();
  });

  serverSettingsRoot?.querySelectorAll("[data-server-library-source-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      const source = serverLibrarySources.find((item) => item.id === button.dataset.serverLibrarySourceEdit);
      resetServerLibrarySourceEditor(source || null);
      renderServerSettings();
    });
  });

  serverSettingsRoot?.querySelectorAll("[data-server-library-source-sync]").forEach((button) => {
    button.addEventListener("click", () => {
      void syncOneServerLibrarySource(button.dataset.serverLibrarySourceSync || "");
    });
  });

  serverSettingsRoot?.querySelectorAll("[data-server-library-source-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      void removeServerLibrarySource(button.dataset.serverLibrarySourceRemove || "");
    });
  });

  serverSettingsRoot?.querySelector("[data-server-library-browser-open]")?.addEventListener("click", () => {
    void openServerLibraryBrowser();
  });

  serverSettingsRoot?.querySelectorAll("[data-server-library-browser-close]").forEach((button) => {
    button.addEventListener("click", closeServerLibraryBrowser);
  });

  serverSettingsRoot?.querySelectorAll("[data-server-library-browser-path]").forEach((button) => {
    button.addEventListener("click", () => {
      void loadServerLibraryBrowser(button.dataset.serverLibraryBrowserPath || "");
    });
  });

  serverSettingsRoot?.querySelector("[data-server-library-browser-select]")?.addEventListener("click", selectCurrentServerLibraryBrowserFolder);

  document.querySelectorAll("[data-server-section]").forEach((button) => {
    button.onclick = () => setServerSettingsSection(button.dataset.serverSection || "overview", { closeSidebar: true });
  });

  serverSettingsRoot?.querySelector("[data-server-settings-save]")?.addEventListener("click", () => {
    void saveEnteredServerSecrets();
  });

  serverSettingsRoot?.querySelector("[data-server-settings-clear]")?.addEventListener("click", () => {
    void clearTickedServerSecrets();
  });

  serverSettingsRoot?.querySelector("[data-server-settings-refresh]")?.addEventListener("click", () => {
    void loadServerSettings();
  });

  serverSettingsRoot?.querySelectorAll("[data-server-copy-restart]").forEach((button) => {
    button.addEventListener("click", () => { void copyRestartCommand(); });
  });

  serverSettingsRoot?.querySelectorAll("[data-server-clear-page-cache]").forEach((button) => {
    button.addEventListener("click", () => { void clearBrmediaPageCacheAndReload(); });
  });

  serverSettingsRoot?.querySelectorAll("[data-server-admin-action]").forEach((button) => {
    button.addEventListener("click", () => { void runServerAdminAction(button.dataset.serverAdminAction || ""); });
  });

  serverSettingsRoot?.querySelector("[data-server-torrent-save]")?.addEventListener("click", () => {
    void saveServerTorrentSettings(false);
  });

  serverSettingsRoot?.querySelector("[data-server-torrent-apply]")?.addEventListener("click", () => {
    void saveServerTorrentSettings(true);
  });

  serverSettingsRoot?.querySelector("[data-server-torrent-test]")?.addEventListener("click", () => {
    void testServerTorrentConnection();
  });

  serverSettingsRoot?.querySelectorAll("[data-server-copy-text]").forEach((button) => {
    button.addEventListener("click", () => {
      const text = decodeURIComponent(button.dataset.serverCopyText || "");
      void copyServerText(text, button.dataset.serverCopyLabel || "Text");
    });
  });

  serverSettingsRoot?.querySelectorAll("[data-server-copy-log]").forEach((button) => {
    button.addEventListener("click", () => {
      const entry = getServerAdminLogById(button.dataset.serverCopyLog || "");
      if (!entry) return;
      void copyServerText(`${entry.title}\n${entry.detail || "Done"}\n${entry.at || ""}`, "Admin result");
    });
  });

  updateServerSettingsSidebarActive();
}

function syncTopMenuDockState() {
  const topbar = document.querySelector(".topbar");
  if (!btnModuleMenu || !topbar) return;

  const rect = topbar.getBoundingClientRect();
  const shouldFloat = rect.top < 18;

  btnModuleMenu.classList.toggle(
    "isFloating",
    shouldFloat && !document.body.classList.contains("sidebarOpen")
  );

  btnModuleSidebarCloseFloating?.classList.toggle(
    "hidden",
    !document.body.classList.contains("sidebarOpen")
  );
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
  const restoreY =
    Math.abs(parseInt(document.body.style.top || "0", 10)) ||
    moduleSidebarScrollLock.y ||
    0;

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

  if (moduleSidebar.classList.contains("hidden")) {
    openModuleSidebar();
    return;
  }

  closeModuleSidebar();
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
});

document.querySelectorAll("[data-route]").forEach((button) => {
  button.addEventListener("click", () => {
    goToRoute(button.dataset.route || "/");
  });
});

window.addEventListener("scroll", syncTopMenuDockState, { passive: true });
window.addEventListener("resize", syncTopMenuDockState);

window.addEventListener("DOMContentLoaded", () => {
  closeModuleSidebar();
  syncTopMenuDockState();
  startBrIconHydrator();
  void loadServerSettings();
});