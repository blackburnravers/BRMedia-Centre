window.addEventListener("error", (event) => {
  console.error("BRMedia Torrents error", event?.error || event?.message || event);
});

const $ = (id) => document.getElementById(id);

const torrentRoot = $("torrentRoot");
const sidebar = $("moduleSidebar");
const sidebarBackdrop = $("moduleSidebarBackdrop");
const sidebarClose = $("btnModuleSidebarCloseFloating");

const torrentSections = [
  {
    key: "overview",
    title: "Overview",
    icon: "circle-info",
    sub: "Dashboard",
    menuSub: "Torrent dashboard, status cards and quick actions.",
    pageTitle: "Torrent overview",
    pageIntro: "Check engine status, queue totals, download/upload activity and quick-start torrent actions.",
  },
  {
    key: "add",
    title: "Add",
    icon: "magnet",
    sub: "Magnet links",
    menuSub: "Add magnet links or .torrent references in bulk.",
    pageTitle: "Add torrents",
    pageIntro: "Paste one or more legal magnet links or .torrent references. BRMedia will queue them and run the first safety checks.",
  },
  {
    key: "queue",
    title: "Queue",
    icon: "download",
    sub: "Downloads",
    menuSub: "View, pause, resume, prioritise and remove queued torrents.",
    pageTitle: "Torrent queue",
    pageIntro: "Manage every queued torrent from one place, including status, progress, speed, priority and safety scan results.",
  },
  {
    key: "completed",
    title: "Done",
    icon: "circle-check",
    sub: "Completed",
    menuSub: "Open finished downloads, scan files, reveal folders and transfer selected media into BRMedia.",
    pageTitle: "Completed downloads",
    pageIntro: "Review finished torrents, open their download folders, scan downloaded content and choose files to send into Audio or Video.",
  },
  {
    key: "files",
    title: "Files",
    icon: "folder-open",
    sub: "Pick files",
    menuSub: "Choose torrent files, priorities, library handoff and downloads.",
    pageTitle: "Torrent files",
    pageIntro: "Open a torrent from the queue to choose which files download, prioritise parts, send completed files to Audio or Video, or download in the browser.",
  },
  {
    key: "pieces",
    title: "Pieces",
    icon: "grip",
    sub: "Map",
    menuSub: "View qBittorrent piece availability, downloaded blocks and active pieces.",
    pageTitle: "Torrent pieces",
    pageIntro: "See a uTorrent-style piece map: downloaded chunks, downloading chunks and missing chunks for the selected torrent.",
  },
  {
    key: "bandwidth",
    title: "Speed",
    icon: "gauge-high",
    sub: "Limits",
    menuSub: "Set download/upload limits so torrents do not lag the network.",
    pageTitle: "Bandwidth management",
    pageIntro: "Control download and upload limits, plus slow-mode speeds, so other devices and streaming stay smooth.",
  },
  {
    key: "speed-graph",
    title: "Graph",
    icon: "chart-line",
    sub: "Live speed",
    menuSub: "View recent download and upload speed history.",
    pageTitle: "Torrent speed graph",
    pageIntro: "Track recent qBittorrent download and upload speed samples without leaving BRMedia.",
  },
  {
    key: "scheduler",
    title: "Timer",
    icon: "calendar-clock",
    sub: "Schedule",
    menuSub: "Choose the times torrents can download or seed.",
    pageTitle: "Download scheduler",
    pageIntro: "Set calendar windows for when BRMedia is allowed to download, seed, slow down or pause torrent traffic.",
  },
  {
    key: "health",
    title: "Swarm",
    icon: "seedling",
    sub: "Seeds",
    menuSub: "Check seeds, leeches and dead torrent warnings.",
    pageTitle: "Swarm health",
    pageIntro: "Review seed and leech counts so slow or dead torrents are easy to spot before wasting time.",
  },
  {
    key: "trackers",
    title: "Trackers",
    icon: "satellite-dish",
    sub: "Sources",
    menuSub: "Inspect tracker status, seeds, leeches and messages for the selected torrent.",
    pageTitle: "Torrent trackers",
    pageIntro: "Open a torrent from Queue or Completed Downloads to inspect its tracker connections and swarm counts.",
  },
  {
    key: "peers",
    title: "Peers",
    icon: "users",
    sub: "Connections",
    menuSub: "Inspect connected peers, clients, progress and transfer speeds.",
    pageTitle: "Torrent peers",
    pageIntro: "Open a torrent from Queue or Completed Downloads to inspect live peer connections.",
  },
  {
    key: "cache",
    title: "Cache",
    icon: "hard-drive",
    sub: "Disk",
    menuSub: "Tune smart disk caching to reduce hard-drive wear.",
    pageTitle: "Smart disk cache",
    pageIntro: "Configure cache size and write behaviour to reduce unnecessary hard-drive wear during large downloads.",
  },
  {
    key: "security",
    title: "Scan",
    icon: "shield-virus",
    sub: "Malware",
    menuSub: "Scan .torrent files and block suspicious downloads.",
    pageTitle: "In-app malware protection",
    pageIntro: "Control scanning for torrent files and downloaded content, plus blocking and quarantine behaviour.",
  },
  {
    key: "scan-history",
    title: "History",
    icon: "shield-check",
    sub: "Scans",
    menuSub: "Review downloaded-file scan results and quarantine history.",
    pageTitle: "Malware scan history",
    pageIntro: "Review recent BRMedia torrent scans, suspicious filenames and quarantine results.",
  },
  {
    key: "notifications",
    title: "Alerts",
    icon: "bell",
    sub: "Updates",
    menuSub: "Review torrent alerts and optionally enable browser notifications.",
    pageTitle: "Torrent notifications",
    pageIntro: "See completed-download, scan, blocked-file and low-seed alerts in one place.",
  },
  {
    key: "protocols",
    title: "Network",
    icon: "network-wired",
    sub: "Protocols",
    menuSub: "Magnet links, UPnP, NAT-PMP, encryption and IPv6.",
    pageTitle: "Network protocols",
    pageIntro: "Enable or disable magnet links, UPnP, NAT-PMP, protocol encryption and IPv6 support for the torrent engine.",
  },
];

const TORRENT_MODULE_SETTINGS_TABS = new Set(["bandwidth", "scheduler", "cache", "security", "protocols"]);

const TORRENT_BROWSER_ALERTS_KEY =
  "brmedia_torrent_browser_alerts_v1";

const TORRENT_BROWSER_ALERTS_SEEN_KEY =
  "brmedia_torrent_browser_alerts_seen_v1";

const torrentLaunchPayload =
  readTorrentLaunchPayload();

const torrentState = {
  activeTab: torrentLaunchPayload.input
    ? "add"
    : torrentLaunchPayload.tab || "overview",
  tabsScrollLeft: 0,
  loading: true,
  message: torrentLaunchPayload.input ? "Magnet link received. Check it, then press Add." : "",
  launchInput: torrentLaunchPayload.input || "",
  launchSource: torrentLaunchPayload.source || "",
  protocolHandlerStatus: "",
  queueSearch: "",
  queueFilter: torrentLaunchPayload.filter || "all",
  selectedTorrentId: "",
  selectedTorrentName: "",
  torrentFilesLoading: false,
  torrentFilesPayload: null,
  torrentPiecesLoading: false,
  torrentPiecesPayload: null,
  selectedFileIds: [],
  torrentTrackersLoading: false,
  torrentTrackersPayload: null,
  torrentPeersLoading: false,
  torrentPeersPayload: null,
  transferJob: null,
  transferPollTimer: null,
  busyAction: "",
  lastRefreshAt: 0,
  data: {
    items: [],
    summary: {},
    settings: {},
    engine: {},
  },
};

function escapeHtml(value = "") {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function iconHtml(name) {
  return `<i class="fa-duotone fa-${escapeHtml(name)}" data-br-icon-key="${escapeHtml(name)}" aria-hidden="true"></i>`;
}

function hydrateIcons(root = document) {
  const iconApi = window.BRMediaIcons;

  if (!iconApi?.hydrateIcon) {
    iconApi?.hydrate?.(root);
    return;
  }

  const nodes = root?.matches?.("i[class*='fa-']")
    ? [root]
    : Array.from(root?.querySelectorAll?.("i[class*='fa-']") || []);

  nodes.forEach((node) => {
    void iconApi.hydrateIcon(node);
  });
}

function isTorrentUserTyping() {
  const active = document.activeElement;
  if (!active || !torrentRoot?.contains(active)) return false;

  const tag = String(active.tagName || "").toLowerCase();
  const type = String(active.getAttribute?.("type") || "").toLowerCase();

  return tag === "textarea" ||
    tag === "select" ||
    tag === "input" ||
    active.isContentEditable ||
    ["text", "search", "url", "file", "number", "password", "email"].includes(type);
}

function captureTorrentPanelSnapshot(scope = torrentRoot) {
  const active = document.activeElement;
  const snapshot = {
    activeId: active?.id || "",
    selectionStart: typeof active?.selectionStart === "number" ? active.selectionStart : null,
    selectionEnd: typeof active?.selectionEnd === "number" ? active.selectionEnd : null,
    values: {},
    scrollTop: Number(scope?.scrollTop || 0),
    windowScrollY: Number(window.scrollY || 0),
  };

  scope?.querySelectorAll?.("input[id], textarea[id], select[id]")?.forEach((node) => {
    snapshot.values[node.id] = {
      value: node.value,
      checked: !!node.checked,
      type: String(node.type || ""),
    };
  });

  return snapshot;
}

function restoreTorrentPanelSnapshot(snapshot = {}, scope = torrentRoot) {
  Object.entries(snapshot.values || {}).forEach(([id, item]) => {
    const node = document.getElementById(id);
    if (!node) return;
    if (String(item.type || "") !== "file" && "value" in node) node.value = item.value || "";
    if ("checked" in node) node.checked = !!item.checked;
  });

  if (scope) scope.scrollTop = Number(snapshot.scrollTop || 0);
  const windowScrollY = Number(snapshot.windowScrollY || 0);
  requestAnimationFrame(() => window.scrollTo({ top: windowScrollY, behavior: "auto" }));

  if (snapshot.activeId) {
    const active = document.getElementById(snapshot.activeId);
    if (active && torrentRoot?.contains(active)) {
      active.focus({ preventScroll: true });
      if (
        typeof snapshot.selectionStart === "number" &&
        typeof snapshot.selectionEnd === "number" &&
        typeof active.setSelectionRange === "function"
      ) {
        try {
          active.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd);
        } catch {}
      }
    }
  }
}

function renderTorrentActivePanelOnly() {
  if (!torrentRoot) return;

  const panel = torrentRoot.querySelector("#torrentActivePanel");
  if (!panel) {
    renderTorrents();
    return;
  }

  const snapshot = captureTorrentPanelSnapshot(panel);
  const previousTabsScroll = Number(torrentState.tabsScrollLeft || 0);

  panel.innerHTML = renderActivePanel();
  bindTorrentEvents();
  hydrateIcons(panel);
  restoreTorrentPanelSnapshot(snapshot, panel);

  const tabs = torrentRoot.querySelector(".torrentTabs");
  if (tabs) {
    tabs.scrollLeft = previousTabsScroll;
    requestAnimationFrame(() => {
      tabs.scrollLeft = previousTabsScroll;
    });
  }
}

function decodeTorrentParam(value = "") {
  let text = String(value || "").trim();

  for (let index = 0; index < 3; index += 1) {
    try {
      const decoded = decodeURIComponent(text);
      if (decoded === text) break;
      text = decoded;
    } catch {
      break;
    }
  }

  return text.replace(/^web\+brmedia-torrent:\/?/i, "").trim();
}

function readTorrentLaunchPayload() {
  const params =
    new URLSearchParams(window.location.search || "");

  const raw =
    params.get("magnet") ||
    params.get("url") ||
    params.get("add") ||
    params.get("torrent") ||
    "";

  const input =
    decodeTorrentParam(raw);

  const allowedTabs =
    new Set(
      torrentSections.map((item) => item.key)
    );

  const requestedTab =
    params.get("tab") || "";

  const tab =
    allowedTabs.has(requestedTab)
      ? requestedTab
      : "";

  const requestedFilter =
    params.get("filter") || "";

  const filter =
    [
      "all",
      "active",
      "paused",
      "complete",
      "blocked",
    ].includes(requestedFilter)
      ? requestedFilter
      : "";

  return {
    input,
    source:
      input
        ? params.get("source") || "url"
        : "",
    tab,
    filter,
  };
}

async function registerTorrentProtocolHandlers() {
  const template = `${window.location.origin}/torrents?source=protocol&magnet=%s`;
  const results = [];

  if (!("registerProtocolHandler" in navigator)) {
    torrentState.protocolHandlerStatus = "This browser does not expose protocol-handler registration here. Use the Add page or Share/Copy link fallback.";
    renderTorrents();
    return;
  }

  if (!window.isSecureContext) {
    torrentState.protocolHandlerStatus = "Protocol handlers need HTTPS or localhost. Your current BRMedia address is not secure, so the browser may block magnet registration.";
    renderTorrents();
    return;
  }

  try {
    navigator.registerProtocolHandler("magnet", template);
    results.push("magnet");
  } catch (err) {
    results.push(`magnet failed: ${err?.message || err}`);
  }

  try {
    navigator.registerProtocolHandler("web+brmedia-torrent", template);
    results.push("web+brmedia-torrent");
  } catch (err) {
    results.push(`web+brmedia-torrent failed: ${err?.message || err}`);
  }

  torrentState.protocolHandlerStatus = `Registration requested: ${results.join(" · ")}. Accept any browser prompt, then test a magnet link.`;
  renderTorrents();
}

function openTorrentAddWithClipboardFallback() {
  torrentState.activeTab = "add";
  torrentState.protocolHandlerStatus = "Paste a magnet link into the box, or open /torrents?magnet=PASTE_LINK_HERE from another page.";
  renderTorrents();
}

function formatSpeed(kb = 0) {
  const value = Number(kb || 0);
  if (!value) return "0 KB/s";
  if (value >= 1024) return `${(value / 1024).toFixed(value >= 10240 ? 0 : 1)} MB/s`;
  return `${Math.round(value)} KB/s`;
}

function formatSize(bytes = 0) {
  const value = Number(bytes || 0);
  if (!value) return "Size pending";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(index < 2 ? 0 : 1)} ${units[index]}`;
}

function getTorrentTransferTargetLabel(job = {}) {
  return String(job.target || "") === "audio" ? "Audio Player" : "Video Player";
}

function renderTorrentTransferBox() {
  const job = torrentState.transferJob;
  if (!job) return "";

  const status = String(job.status || "queued");
  const percent = Math.max(0, Math.min(100, Number(job.percent || 0)));
  const done = status === "done";
  const error = status === "error";
  const targetLabel = getTorrentTransferTargetLabel(job);
  const copied = Number(job.copiedBytes || 0);
  const total = Number(job.totalBytes || job.sizeBytes || 0);
  const copiedLabel = copied ? formatSize(copied) : "0 B";

  return `
    <section class="torrentTransferBox ${done ? "is-done" : ""} ${error ? "is-error" : ""}">
      <div class="torrentTransferTop">
        <span>${iconHtml(error ? "triangle-exclamation" : done ? "circle-check" : "arrows-rotate")}</span>
        <div>
          <strong>${escapeHtml(done ? `Added to ${targetLabel}` : error ? "Transfer failed" : `Transferring to ${targetLabel}`)}</strong>
          <em>${escapeHtml(job.fileName || "Torrent file")}</em>
        </div>
        <b>${escapeHtml(String(Math.round(percent)))}%</b>
      </div>
      <div class="torrentTransferProgress"><span style="width:${percent}%"></span></div>
      <p>${escapeHtml(job.message || "Preparing transfer…")}</p>
      ${total ? `<small>${escapeHtml(copiedLabel)} / ${escapeHtml(formatSize(total))}</small>` : ""}
      ${job.speed ? `<small>Speed: ${escapeHtml(job.speed)}</small>` : ""}
      ${job.elapsed ? `<small>Elapsed: ${escapeHtml(job.elapsed)}</small>` : ""}
      ${job.needsBrowserCopy ? `<small class="warn">MKV/non-browser file added. Open it in Video Player and create a browser-safe MP4 copy for iPhone/Safari playback.</small>` : ""}
      ${job.technicalLog || job.debugMessage ? `
        <details class="torrentTechnicalLog">
          <summary>Show technical log</summary>
          <pre>${escapeHtml(job.technicalLog || job.debugMessage || "")}</pre>
        </details>
      ` : ""}
      <div class="torrentTransferActions">
        ${job.openUrl ? `<a href="${escapeHtml(job.openUrl)}">${iconHtml(String(job.target || "") === "audio" ? "music" : "film")} Open ${escapeHtml(targetLabel)}</a>` : ""}
        <button data-torrent-transfer-clear type="button">${iconHtml("xmark")} Hide</button>
      </div>
    </section>
  `;
}

function isTorrentComplete(item = {}) {
  const status = String(item.status || "").toLowerCase();

  return ["complete", "completed", "seeding"].includes(status) ||
    Number(item.progress || 0) >= 100;
}

function isTorrentSeedActivity(item = {}) {
  const engineState = String(item.engineState || "").toLowerCase();

  return !!item.isSeeding ||
    engineState.includes("upload") ||
    engineState.includes("forcedup") ||
    engineState.includes("stalledup") ||
    engineState.includes("queuedup") ||
    engineState.includes("pausedup") ||
    engineState.includes("checkingup");
}

function isTorrentSeedPaused(item = {}) {
  return String(item.engineState || "").toLowerCase().includes("pausedup");
}

function isTorrentActive(item = {}) {
  const status = String(item.status || "").toLowerCase();

  return !isTorrentComplete(item) &&
    ["queued", "downloading", "checking"].includes(status);
}

function getTorrentStatusLabel(item = {}) {
  if (!isTorrentComplete(item)) return String(item.status || "queued");
  if (isTorrentSeedPaused(item)) return "complete · seeding paused";
  if (isTorrentSeedActivity(item)) return "complete · seeding";
  return "complete";
}

function statusClass(status = "", item = {}) {
  const key = String(status || "").toLowerCase();

  if (["blocked", "error"].includes(key)) return "danger";
  if (["paused", "queued"].includes(key) && !isTorrentComplete(item)) return "warn";
  if (isTorrentComplete(item)) return "good";

  return "info";
}

function isTorrentEngineConnected() {
  return String(torrentState.data?.engine?.status || "") === "connected";
}

function getTorrentFilterCounts() {
  const items = getItems();
  return {
    all: items.length,
    active: items.filter((item) => isTorrentActive(item)).length,
    paused: items.filter((item) => String(item.status || "") === "paused" && !isTorrentComplete(item)).length,
    complete: items.filter((item) => isTorrentComplete(item)).length,
    blocked: items.filter((item) => item?.malware?.status === "blocked" || item.status === "blocked" || item.status === "error").length,
  };
}

function getVisibleTorrentItems() {
  const search = String(torrentState.queueSearch || "").trim().toLowerCase();
  const filter = String(torrentState.queueFilter || "all");
  const items = getItems();

  return items.filter((item) => {
    const status = String(item.status || "").toLowerCase();
    const blocked = item?.malware?.status === "blocked" || status === "blocked" || status === "error";
    const complete = isTorrentComplete(item);
    const active = isTorrentActive(item);
    const paused = status === "paused" && !complete;

    if (filter === "active" && !active) return false;
    if (filter === "paused" && !paused) return false;
    if (filter === "complete" && !complete) return false;
    if (filter === "blocked" && !blocked) return false;

    if (!search) return true;

    return [
      item.name,
      item.kind,
      item.status,
      item.priority,
      item.hash,
      item.input,
    ].some((value) => String(value || "").toLowerCase().includes(search));
  });
}

function formatTorrentRefreshTime() {
  if (!torrentState.lastRefreshAt) return "Not refreshed yet";
  try {
    return new Date(torrentState.lastRefreshAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "Just refreshed";
  }
}

function getTorrentEngineState() {
  return torrentState.data?.engine || {};
}

function isTorrentEngineReady() {
  return String(getTorrentEngineState().status || "") === "connected";
}

function isLiveTorrentItem(item = {}) {
  return String(item.kind || "") === "qbittorrent" || !!item.hash;
}

function formatTorrentEta(seconds = 0) {
  const value = Number(seconds || 0);
  if (!Number.isFinite(value) || value <= 0 || value > 31536000) return "ETA pending";
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  if (hours) return `${hours}h ${minutes}m`;
  return `${Math.max(1, minutes)}m`;
}

function getTorrentRunAction(item = {}) {
  const status = String(item.status || "").toLowerCase();
  const downloading = ["downloading", "checking", "queued"].includes(status);

  if (isTorrentComplete(item)) {
    if (isTorrentSeedActivity(item) && !isTorrentSeedPaused(item)) {
      return {
        action: "pause",
        icon: "pause",
        label: "Pause seeding",
        className: "torrentRunToggle is-running",
      };
    }

    return {
      action: "resume",
      icon: "play",
      label: "Resume seeding",
      className: "torrentRunToggle",
    };
  }

  if (downloading) {
    return {
      action: "pause",
      icon: "pause",
      label: status === "downloading" ? "Pause download" : "Pause torrent",
      className: "torrentRunToggle is-running",
    };
  }

  return {
    action: "resume",
    icon: "play",
    label: status === "paused" ? "Resume download" : "Start download",
    className: "torrentRunToggle",
  };
}

function getPriorityLabel(priority = 0) {
  const value = Number(priority || 0);
  if (value <= 0) return "Skipped";
  if (value >= 7) return "Top";
  if (value >= 6) return "High";
  return "Normal";
}

function getFileTypeIcon(file = {}) {
  if (file.type === "audio") return "music";
  if (file.type === "video") return "film";
  return "file";
}

function renderEngineNotice(mode = "full") {
  const engine = getTorrentEngineState();
  const connected = isTorrentEngineReady();

  if (connected && mode !== "full") return "";

  const statusText = connected
    ? "qBittorrent connected. Downloads, queue controls and live swarm data are active."
    : "Downloads will not start yet. Connect qBittorrent Web UI in Network to turn this queue into real downloads.";

  return `
    <section class="torrentEngineNotice ${connected ? "is-connected" : "needs-engine"}">
      <span>${iconHtml(connected ? "plug-circle-check" : "plug-circle-exclamation")}</span>
      <div>
        <strong>${connected ? "Torrent engine connected" : "Torrent engine not connected"}</strong>
        <p>${escapeHtml(statusText)}</p>
        ${engine.note ? `<em>${escapeHtml(engine.note)}</em>` : ""}
      </div>
      <div class="torrentEngineNoticeActions">
        <button data-torrent-tab-go="protocols" type="button">${iconHtml("network-wired")}<span>Network setup</span></button>
        <button data-torrent-refresh type="button">${iconHtml("arrows-rotate")}<span>Refresh status</span></button>
      </div>
    </section>
  `;
}

function renderItemEngineNotice(item = {}) {
  if (isLiveTorrentItem(item)) return "";

  if (isTorrentEngineReady()) {
    return `
      <div class="torrentSafety info">
        ${iconHtml("paper-plane")}
        <span>This is still a BRMedia local queue item. Send it to qBittorrent to start the real download.</span>
      </div>
    `;
  }

  return `
    <div class="torrentSafety warn">
      ${iconHtml("plug-circle-exclamation")}
      <span>Waiting for qBittorrent connection. This item is queued safely, but it cannot download until the engine is connected.</span>
    </div>
  `;
}

function getActiveTorrentSection() {
  return torrentSections.find((section) => section.key === torrentState.activeTab) || torrentSections[0];
}

function renderSectionIntro() {
  const section = getActiveTorrentSection();
  if (!section || section.key === "overview") return "";

  return `
    <section class="torrentPageIntro">
      <span>${iconHtml(section.icon)}</span>
      <div>
        <strong>${escapeHtml(section.pageTitle || section.title)}</strong>
        <p>${escapeHtml(section.pageIntro || section.menuSub || section.sub || "")}</p>
      </div>
    </section>
  `;
}

function renderTorrentToast() {
  const message = String(torrentState.message || "").trim();
  if (!message || torrentState.loading) return "";

  const lower = message.toLowerCase();
  const kind = lower.includes("failed") || lower.includes("could not") || lower.includes("blocked")
    ? "danger"
    : lower.includes("added") || lower.includes("uploaded") || lower.includes("priority") || lower.includes("scan")
      ? "good"
      : "info";

  return `
    <section class="torrentStatusToast ${kind}" role="status" aria-live="polite">
      <span>${iconHtml(kind === "danger" ? "triangle-exclamation" : kind === "good" ? "circle-check" : "circle-info")}</span>
      <strong>${escapeHtml(message)}</strong>
    </section>
  `;
}

function getSettings() {
  return torrentState.data.settings || {};
}

function getItems() {
  return Array.isArray(torrentState.data.items)
    ? torrentState.data.items
    : [];
}

function getTorrentFiles() {
  return Array.isArray(torrentState.torrentFilesPayload?.files)
    ? torrentState.torrentFilesPayload.files
    : [];
}

function getSelectedTorrentFileIds() {
  return Array.from(
    new Set(
      (torrentState.selectedFileIds || [])
        .map((value) => String(value))
        .filter(Boolean)
    )
  );
}

function getSelectedTorrentFiles() {
  const ids = new Set(
    getSelectedTorrentFileIds()
  );

  return getTorrentFiles()
    .filter((file) =>
      ids.has(String(file.id)) ||
      ids.has(String(file.index))
    );
}

function pruneSelectedTorrentFiles() {
  const valid = new Set(
    getTorrentFiles()
      .map((file) =>
        String(file.id)
      )
  );

  torrentState.selectedFileIds =
    getSelectedTorrentFileIds()
      .filter((id) =>
        valid.has(id)
      );
}

function setTorrentFileSelected(
  fileId,
  selected = true
) {
  const ids =
    new Set(
      getSelectedTorrentFileIds()
    );

  const key =
    String(fileId || "");

  if (!key) return;

  if (selected) ids.add(key);
  else ids.delete(key);

  torrentState.selectedFileIds =
    Array.from(ids);
}

function selectTorrentFiles(mode = "all") {
  const files =
    getTorrentFiles();

  torrentState.selectedFileIds =
    mode === "none"
      ? []
      : files
          .filter((file) => {
            if (mode === "audio") {
              return file.type === "audio";
            }

            if (mode === "video") {
              return file.type === "video";
            }

            if (mode === "complete") {
              return file.completed;
            }

            return true;
          })
          .map((file) =>
            String(file.id)
          );

  renderTorrentActivePanelOnly();
}

function isTorrentBrowserAlertsEnabled() {
  return (
    localStorage.getItem(
      TORRENT_BROWSER_ALERTS_KEY
    ) === "1"
  );
}

function readTorrentBrowserAlertsSeen() {
  try {
    const parsed =
      JSON.parse(
        localStorage.getItem(
          TORRENT_BROWSER_ALERTS_SEEN_KEY
        ) ||
        "[]"
      );

    return Array.isArray(parsed)
      ? parsed.map((value) =>
          String(value)
        )
      : [];
  } catch {
    return [];
  }
}

function maybeShowTorrentBrowserNotifications() {
  if (
    !isTorrentBrowserAlertsEnabled() ||
    !("Notification" in window) ||
    Notification.permission !== "granted"
  ) {
    return;
  }

  const seen =
    new Set(
      readTorrentBrowserAlertsSeen()
    );

  const notices =
    Array.isArray(
      torrentState.data?.notifications
    )
      ? torrentState.data.notifications
      : [];

  notices
    .slice(0, 8)
    .reverse()
    .forEach((notice) => {
      const id =
        String(notice.id || "");

      if (!id || seen.has(id)) {
        return;
      }

      try {
        new Notification(
          notice.title ||
          "BRMedia Torrents",
          {
            body:
              notice.message ||
              "Torrent update",
          }
        );
      } catch {}

      seen.add(id);
    });

  localStorage.setItem(
    TORRENT_BROWSER_ALERTS_SEEN_KEY,
    JSON.stringify(
      Array
        .from(seen)
        .slice(-120)
    )
  );
}

async function enableTorrentBrowserAlerts() {
  if (!("Notification" in window)) {
    torrentState.message =
      "This browser does not support page notifications here.";

    renderTorrentActivePanelOnly();
    return;
  }

  try {
    const permission =
      await Notification.requestPermission();

    localStorage.setItem(
      TORRENT_BROWSER_ALERTS_KEY,
      permission === "granted"
        ? "1"
        : "0"
    );

    torrentState.message =
      permission === "granted"
        ? "Browser torrent alerts enabled."
        : "Browser torrent alerts were not enabled.";
  } catch (err) {
    torrentState.message =
      err?.message ||
      "Could not enable browser torrent alerts.";
  }

  renderTorrentActivePanelOnly();
}

function disableTorrentBrowserAlerts() {
  localStorage.setItem(
    TORRENT_BROWSER_ALERTS_KEY,
    "0"
  );

  torrentState.message =
    "Browser torrent alerts disabled.";

  renderTorrentActivePanelOnly();
}

async function apiJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

async function loadTorrentState(options = {}) {
  const panelOnly = options.panelOnly === true;
  const autoRefresh = options.autoRefresh === true;

  if (autoRefresh && isTorrentUserTyping()) return;

  if (!panelOnly) {
    torrentState.loading = true;
    renderTorrents();
  }

  try {
    const data = await apiJson("/torrent/state");
    torrentState.data = data;
    torrentState.lastRefreshAt = Date.now();
    maybeShowTorrentBrowserNotifications();

    if (!autoRefresh) {
      torrentState.message = torrentState.launchInput
        ? "Magnet link received. Check it, then press Add."
        : torrentState.message || "Torrent module ready.";
    }
  } catch (err) {
    torrentState.message = `Could not load torrent state: ${err?.message || err}`;
  } finally {
    torrentState.loading = false;
    if (panelOnly) renderTorrentActivePanelOnly();
    else renderTorrents();
  }
}

async function addTorrentFromForm() {
  const input = $("torrentInput")?.value || "";
  const label = $("torrentLabel")?.value || "";
  const lines = String(input || "").split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean);

  if (!lines.length) {
    torrentState.message = "Paste at least one magnet link, .torrent URL or saved .torrent path.";
    renderTorrents();
    return;
  }

  try {
    torrentState.busyAction = "add:torrent";
    torrentState.message = lines.length > 1 ? `Adding ${lines.length} torrents…` : "Adding torrent to BRMedia queue…";
    renderTorrents();

    const data = await apiJson("/torrent/add", {
      method: "POST",
      body: JSON.stringify({ input, inputs: lines, label }),
    });

    torrentState.data = data.state || torrentState.data;
    torrentState.activeTab = "queue";
    torrentState.queueFilter = "all";
    torrentState.tabsScrollLeft = 0;
    torrentState.message = data.item?.status === "blocked"
      ? "Torrent blocked by safety scan. Open Queue to review it."
      : `${lines.length || 1} torrent${(lines.length || 1) === 1 ? "" : "s"} added — moved to Queue.`;

    torrentState.launchInput = "";
    torrentState.launchSource = "";

    if ($("torrentInput")) $("torrentInput").value = "";
    if ($("torrentLabel")) $("torrentLabel").value = "";
  } catch (err) {
    torrentState.message = err?.message || "Could not add torrent.";
  } finally {
    torrentState.busyAction = "";
  }

  renderTorrents();
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",").pop() : result);
    };
    reader.onerror = () => reject(reader.error || new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

async function uploadTorrentFilesFromInput() {
  const input = $("torrentFileInput");
  const label = $("torrentLabel")?.value || "";
  const files = Array.from(input?.files || []);

  if (!files.length) {
    torrentState.message = "Choose one or more .torrent files first.";
    renderTorrents();
    return;
  }

  try {
    torrentState.busyAction = "upload:torrent";
    torrentState.message = `Uploading ${files.length} .torrent file${files.length === 1 ? "" : "s"}…`;
    renderTorrents();

    let latestState = torrentState.data;
    for (const file of files) {
      const dataBase64 = await readFileAsBase64(file);
      const data = await apiJson("/torrent/upload", {
        method: "POST",
        body: JSON.stringify({
          fileName: file.name,
          dataBase64,
          label,
        }),
      });
      latestState = data.state || latestState;
    }

    torrentState.data = latestState;
    torrentState.activeTab = "queue";
    torrentState.queueFilter = "all";
    torrentState.tabsScrollLeft = 0;
    torrentState.message = `${files.length} .torrent file${files.length === 1 ? "" : "s"} uploaded — moved to Queue.`;

    if (input) input.value = "";
    if ($("torrentLabel")) $("torrentLabel").value = "";
  } catch (err) {
    torrentState.message = err?.message || "Could not upload .torrent file.";
  } finally {
    torrentState.busyAction = "";
  }

  renderTorrents();
}

async function testTorrentEngine() {
  try {
    torrentState.message = "Testing qBittorrent connection…";
    renderTorrents();

    const data = await apiJson("/torrent/engine/test", { method: "POST", body: JSON.stringify({}) });
    torrentState.data = data.state || torrentState.data;
    torrentState.message = data.ok ? "qBittorrent connected." : (data.error || "qBittorrent is not connected yet.");
  } catch (err) {
    torrentState.message = err?.message || "Could not test torrent engine.";
  }

  renderTorrents();
}

async function updateTorrentAction(id, action, body = {}) {
  const busyKey = `${id}:${action}`;

  try {
    torrentState.busyAction = busyKey;
    torrentState.message =
      action === "priority" ? "Setting torrent to top priority…" :
      action === "scan" ? "Running BRMedia torrent safety scan…" :
      action === "pause" ? "Pausing torrent…" :
      action === "resume" ? "Resuming torrent…" :
      "Updating torrent…";
    renderTorrents();

    const data = await apiJson(`/torrent/items/${encodeURIComponent(id)}/${encodeURIComponent(action)}`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    torrentState.data = data.state || torrentState.data;
    torrentState.message = action === "remove" || action === "remove-keep"
      ? "Torrent removed. Downloaded files were kept."
      : action === "remove-delete"
        ? "Torrent and downloaded files deleted."
        : (action === "allow" || action === "unblock")
          ? "Torrent unblocked and moved back to queued."
          : action === "send-to-engine"
            ? "Torrent sent to qBittorrent engine."
            : action === "priority"
              ? "Top priority set."
              : action === "scan"
                ? "Safety scan complete."
                : action === "reannounce"
                  ? "Torrent tracker reannounce requested."
                  : action === "recheck"
                    ? "Torrent recheck requested."
                    : action === "force-start"
                      ? "Force start requested."
                      : "Torrent updated.";
  } catch (err) {
    torrentState.message = err?.message || "Torrent action failed.";
  } finally {
    torrentState.busyAction = "";
  }

  renderTorrents();
}

async function openTorrentFiles(item) {
  if (!item?.id) return;
  torrentState.selectedTorrentId = item.hash || item.id;
  torrentState.selectedTorrentName = item.name || "Torrent";
  torrentState.activeTab = "files";
  torrentState.torrentFilesPayload = null;
  torrentState.selectedFileIds = [];
  renderTorrents();
  await loadTorrentFiles(torrentState.selectedTorrentId);
}

async function openTorrentPieces(item) {
  if (!item?.id) return;
  torrentState.selectedTorrentId = item.hash || item.id;
  torrentState.selectedTorrentName = item.name || "Torrent";
  torrentState.activeTab = "pieces";
  torrentState.torrentPiecesPayload = null;
  renderTorrents();
  await loadTorrentPieces(torrentState.selectedTorrentId);
}

async function loadTorrentPieces(id = torrentState.selectedTorrentId) {
  if (!id) return;

  try {
    torrentState.torrentPiecesLoading = true;
    renderTorrentActivePanelOnly();
    const data = await apiJson(`/torrent/items/${encodeURIComponent(id)}/pieces`);
    torrentState.torrentPiecesPayload = data;
    torrentState.selectedTorrentId = data.hash || id;
    torrentState.selectedTorrentName = data.torrent?.name || torrentState.selectedTorrentName || "Torrent";
    torrentState.message = "Torrent piece map loaded.";
  } catch (err) {
    torrentState.message = err?.message || "Could not load torrent pieces.";
  } finally {
    torrentState.torrentPiecesLoading = false;
    renderTorrentActivePanelOnly();
  }
}

async function loadTorrentFiles(id = torrentState.selectedTorrentId) {
  if (!id) return;

  try {
    torrentState.torrentFilesLoading = true;
    renderTorrentActivePanelOnly();
    const data = await apiJson(`/torrent/items/${encodeURIComponent(id)}/files`);
    torrentState.torrentFilesPayload = data;
    torrentState.selectedTorrentId = data.hash || id;
    torrentState.selectedTorrentName = data.torrent?.name || torrentState.selectedTorrentName || "Torrent";
    pruneSelectedTorrentFiles();
    torrentState.message = "Torrent files loaded.";
  } catch (err) {
    torrentState.message = err?.message || "Could not load torrent files.";
  } finally {
    torrentState.torrentFilesLoading = false;
    renderTorrentActivePanelOnly();
  }
}

async function setTorrentFilePriority(fileId, priority) {
  if (!torrentState.selectedTorrentId) return;

  try {
    torrentState.message = "Updating torrent file priority…";
    renderTorrentActivePanelOnly();

    const data = await apiJson(
      `/torrent/items/${encodeURIComponent(torrentState.selectedTorrentId)}/files/priority`,
      {
        method: "POST",
        body: JSON.stringify({ fileId, priority }),
      }
    );

    torrentState.torrentFilesPayload = data;
    pruneSelectedTorrentFiles();

    torrentState.message =
      priority === "skip"
        ? "File skipped."
        : "File priority updated.";
  } catch (err) {
    torrentState.message =
      err?.message ||
      "Could not update file priority.";
  }

  renderTorrentActivePanelOnly();
}

async function setSelectedTorrentFilePriority(priority = "normal") {
  if (!torrentState.selectedTorrentId) return;

  const fileIds = getSelectedTorrentFileIds();

  if (!fileIds.length) {
    torrentState.message =
      "Select one or more torrent files first.";

    renderTorrentActivePanelOnly();
    return;
  }

  try {
    torrentState.busyAction = `files:${priority}`;

    torrentState.message =
      priority === "skip"
        ? `Skipping ${fileIds.length} selected file${fileIds.length === 1 ? "" : "s"}…`
        : `Updating ${fileIds.length} selected file priorit${fileIds.length === 1 ? "y" : "ies"}…`;

    renderTorrentActivePanelOnly();

    const data = await apiJson(
      `/torrent/items/${encodeURIComponent(torrentState.selectedTorrentId)}/files/priority`,
      {
        method: "POST",
        body: JSON.stringify({
          fileIds,
          priority,
        }),
      }
    );

    torrentState.torrentFilesPayload = data;
    pruneSelectedTorrentFiles();

    torrentState.message =
      priority === "skip"
        ? "Selected files skipped."
        : "Selected file priorities updated.";
  } catch (err) {
    torrentState.message =
      err?.message ||
      "Could not update selected file priorities.";
  } finally {
    torrentState.busyAction = "";
  }

  renderTorrentActivePanelOnly();
}

async function openCurrentTorrentFolder(
  id = torrentState.selectedTorrentId
) {
  if (!id) {
    torrentState.message = "Choose a torrent first.";
    renderTorrentActivePanelOnly();
    return;
  }

  try {
    torrentState.message = "Opening torrent download folder…";
    renderTorrentActivePanelOnly();

    const data = await apiJson(
      `/torrent/items/${encodeURIComponent(id)}/open-folder`,
      {
        method: "POST",
        body: "{}",
      }
    );

    torrentState.message =
      data.opened
        ? "Download folder opened on the BRMedia PC."
        : data.note ||
          `Download folder: ${data.folder || "Unavailable"}`;
  } catch (err) {
    torrentState.message =
      err?.message ||
      "Could not open torrent download folder.";
  }

  renderTorrentActivePanelOnly();
}

async function scanCurrentTorrentDownloads(
  id = torrentState.selectedTorrentId
) {
  if (!id) {
    torrentState.message = "Choose a torrent first.";
    renderTorrentActivePanelOnly();
    return;
  }

  try {
    torrentState.busyAction = `${id}:scan-downloads`;
    torrentState.message = "Scanning downloaded torrent files…";

    renderTorrentActivePanelOnly();

    const data = await apiJson(
      `/torrent/items/${encodeURIComponent(id)}/scan-downloads`,
      {
        method: "POST",
        body: "{}",
      }
    );

    if (data.state) {
      torrentState.data = data.state;
    }

    torrentState.message =
      data.scan?.message ||
      "Downloaded-file scan complete.";
  } catch (err) {
    torrentState.message =
      err?.message ||
      "Downloaded-file scan failed.";
  } finally {
    torrentState.busyAction = "";
  }

  renderTorrentActivePanelOnly();
}

async function quarantineSelectedTorrentFiles() {
  if (!torrentState.selectedTorrentId) return;

  const fileIds = getSelectedTorrentFileIds();

  if (!fileIds.length) {
    torrentState.message =
      "Select one or more torrent files to quarantine.";

    renderTorrentActivePanelOnly();
    return;
  }

  if (
    !window.confirm(
      `Move ${fileIds.length} selected torrent file${fileIds.length === 1 ? "" : "s"} into BRMedia quarantine?`
    )
  ) {
    return;
  }

  try {
    torrentState.busyAction = "files:quarantine";
    torrentState.message =
      "Moving selected files into quarantine…";

    renderTorrentActivePanelOnly();

    const data = await apiJson(
      `/torrent/items/${encodeURIComponent(torrentState.selectedTorrentId)}/quarantine`,
      {
        method: "POST",
        body: JSON.stringify({ fileIds }),
      }
    );

    if (data.state) {
      torrentState.data = data.state;
    }

    torrentState.message =
      data.scan?.message ||
      "Selected files moved into quarantine.";

    await loadTorrentFiles();
  } catch (err) {
    torrentState.message =
      err?.message ||
      "Could not move selected files into quarantine.";
  } finally {
    torrentState.busyAction = "";
  }

  renderTorrentActivePanelOnly();
}

async function handoffSelectedTorrentFiles(target = "") {
  if (!torrentState.selectedTorrentId) return;

  const files = getSelectedTorrentFiles()
    .filter((file) =>
      file.completed &&
      (
        target === "audio"
          ? file.canAddToAudio
          : file.canAddToVideo
      )
    );

  if (!files.length) {
    torrentState.message =
      target === "audio"
        ? "Select completed audio files first."
        : "Select completed video files first.";

    renderTorrentActivePanelOnly();
    return;
  }

  const targetLabel =
    target === "audio"
      ? "Audio Player"
      : "Video Player";

  try {
    torrentState.busyAction = `files:${target}`;

    torrentState.message =
      `Starting ${files.length} selected transfer${files.length === 1 ? "" : "s"} to ${targetLabel}…`;

    renderTorrentActivePanelOnly();

    let latestJob = null;

    for (const file of files) {
      const data = await apiJson(
        `/torrent/items/${encodeURIComponent(torrentState.selectedTorrentId)}/files/library`,
        {
          method: "POST",

          body: JSON.stringify({
            fileId: file.id,
            target,
          }),
        }
      );

      if (data.job) {
        latestJob = data.job;
      }
    }

    if (latestJob) {
      torrentState.transferJob = latestJob;
      scheduleTorrentTransferPoll(latestJob.id);
    }

    torrentState.message =
      `${files.length} selected file${files.length === 1 ? "" : "s"} queued for ${targetLabel}.`;
  } catch (err) {
    torrentState.message =
      err?.message ||
      `Could not transfer selected files to ${targetLabel}.`;
  } finally {
    torrentState.busyAction = "";
  }

  renderTorrentActivePanelOnly();
}

async function openTorrentTrackers(item = {}) {
  const id =
    item.hash ||
    item.id ||
    torrentState.selectedTorrentId;

  if (!id) return;

  torrentState.selectedTorrentId = id;

  torrentState.selectedTorrentName =
    item.name ||
    torrentState.selectedTorrentName ||
    "Torrent";

  torrentState.activeTab = "trackers";
  torrentState.torrentTrackersPayload = null;

  renderTorrents();

  await loadTorrentTrackers(id);
}

async function loadTorrentTrackers(
  id = torrentState.selectedTorrentId
) {
  if (!id) return;

  try {
    torrentState.torrentTrackersLoading = true;
    renderTorrentActivePanelOnly();

    torrentState.torrentTrackersPayload =
      await apiJson(
        `/torrent/items/${encodeURIComponent(id)}/trackers`
      );

    torrentState.message =
      "Torrent trackers loaded.";
  } catch (err) {
    torrentState.message =
      err?.message ||
      "Could not load torrent trackers.";
  } finally {
    torrentState.torrentTrackersLoading = false;
  }

  renderTorrentActivePanelOnly();
}

async function openTorrentPeers(item = {}) {
  const id =
    item.hash ||
    item.id ||
    torrentState.selectedTorrentId;

  if (!id) return;

  torrentState.selectedTorrentId = id;

  torrentState.selectedTorrentName =
    item.name ||
    torrentState.selectedTorrentName ||
    "Torrent";

  torrentState.activeTab = "peers";
  torrentState.torrentPeersPayload = null;

  renderTorrents();

  await loadTorrentPeers(id);
}

async function loadTorrentPeers(
  id = torrentState.selectedTorrentId
) {
  if (!id) return;

  try {
    torrentState.torrentPeersLoading = true;
    renderTorrentActivePanelOnly();

    torrentState.torrentPeersPayload =
      await apiJson(
        `/torrent/items/${encodeURIComponent(id)}/peers`
      );

    torrentState.message =
      "Torrent peers loaded.";
  } catch (err) {
    torrentState.message =
      err?.message ||
      "Could not load torrent peers.";
  } finally {
    torrentState.torrentPeersLoading = false;
  }

  renderTorrentActivePanelOnly();
}

function findSelectedTorrentFile(fileId) {
  const files = Array.isArray(torrentState.torrentFilesPayload?.files) ? torrentState.torrentFilesPayload.files : [];
  return files.find((file) => String(file.id) === String(fileId) || String(file.index) === String(fileId)) || null;
}

function scheduleTorrentTransferPoll(jobId) {
  if (!jobId) return;
  if (torrentState.transferPollTimer) window.clearTimeout(torrentState.transferPollTimer);
  torrentState.transferPollTimer = window.setTimeout(() => {
    void pollTorrentTransferJob(jobId);
  }, 900);
}

async function pollTorrentTransferJob(jobId) {
  if (!jobId) return;

  try {
    const data = await apiJson(`/torrent/transfer-jobs/${encodeURIComponent(jobId)}`);
    if (data.job) torrentState.transferJob = data.job;
  } catch (err) {
    torrentState.transferJob = {
      ...(torrentState.transferJob || {}),
      status: "error",
      percent: 100,
      message: err?.message || "Could not read transfer progress.",
    };
  }

  renderTorrentActivePanelOnly();

  const status = String(torrentState.transferJob?.status || "");
  if (["queued", "running"].includes(status)) scheduleTorrentTransferPoll(jobId);
}

async function handoffTorrentFile(fileId, target) {
  if (!torrentState.selectedTorrentId) return;
  const file = findSelectedTorrentFile(fileId);
  const targetLabel = target === "audio" ? "Audio Player" : "Video Player";

  try {
    torrentState.message = `Starting transfer to ${targetLabel}…`;
    torrentState.transferJob = {
      status: "queued",
      stage: "queued",
      percent: 1,
      target,
      fileName: file?.name || "Torrent file",
      totalBytes: file?.sizeBytes || 0,
      message: `Preparing ${targetLabel} transfer…`,
    };
    renderTorrentActivePanelOnly();

    const data = await apiJson(`/torrent/items/${encodeURIComponent(torrentState.selectedTorrentId)}/files/library`, {
      method: "POST",
      body: JSON.stringify({ fileId, target }),
    });

    if (data.job) {
      torrentState.transferJob = data.job;
      torrentState.message = `Transfer to ${targetLabel} started.`;
      scheduleTorrentTransferPoll(data.job.id);
    } else {
      torrentState.transferJob = {
        ...(torrentState.transferJob || {}),
        status: "done",
        percent: 100,
        target,
        openUrl: data.openUrl || "",
        message: target === "audio" ? "Added to Audio library." : "Added to Video library.",
      };
      torrentState.message = torrentState.transferJob.message;
    }
  } catch (err) {
    torrentState.transferJob = {
      ...(torrentState.transferJob || {}),
      status: "error",
      percent: 100,
      target,
      message: err?.message || "Could not add file to library.",
    };
    torrentState.message = torrentState.transferJob.message;
  }

  renderTorrentActivePanelOnly();
}

async function saveTorrentSettings(partial) {
  try {
    const data = await apiJson("/torrent/settings", {
      method: "POST",
      body: JSON.stringify(partial),
    });

    torrentState.data = data.state || torrentState.data;
    torrentState.message = data.engineApply?.ok
      ? (data.engineApply.message || "Torrent settings saved and applied to qBittorrent.")
      : data.engineApply?.error
        ? `Torrent settings saved, but qBittorrent apply failed: ${data.engineApply.error}`
        : "Torrent settings saved.";
  } catch (err) {
    torrentState.message = err?.message || "Could not save torrent settings.";
  }

  renderTorrents();
}

function renderHero() {
  const engine = torrentState.data.engine || {};

  return `
    <section class="torrentHero">
      <div class="torrentHeroIcon">${iconHtml("magnet")}</div>
      <div class="torrentHeroCopy">
        <span>BRMedia legal torrent control centre</span>
        <strong>Torrents</strong>
        <em>${escapeHtml(engine.note || "Skeleton ready. Torrent engine wiring comes next.")}</em>
      </div>
      <div class="torrentHeroStatus ${engine.installed ? "good" : "warn"}">
        <b>${escapeHtml(engine.status || "not-connected")}</b>
        <span>${engine.installed ? "Engine connected" : "Engine skeleton"}</span>
      </div>
    </section>
  `;
}

function renderOverviewPanel() {
  const summary = torrentState.data.summary || {};
  const runtime = torrentState.data.runtime || {};
  const diskSpace = runtime.diskSpace || {};
  const scheduler = runtime.scheduler || {};
  const connected = isTorrentEngineReady();

  return `
    <section class="torrentOverviewStack">
      ${renderHero()}
      ${renderEngineNotice("full")}
      ${torrentState.message ? `<div class="torrentStatus">${escapeHtml(torrentState.message)}</div>` : ""}

      <div class="torrentOverviewGrid">
        <article><span>${iconHtml("download")}</span><strong>${escapeHtml(String(summary.total || 0))}</strong><em>Total queued</em></article>
        <article><span>${iconHtml("bolt")}</span><strong>${escapeHtml(String(summary.active || 0))}</strong><em>Active now</em></article>
        <article><span>${iconHtml("down")}</span><strong>${escapeHtml(formatSpeed(summary.downloadSpeedKb || 0))}</strong><em>Download</em></article>
        <article><span>${iconHtml("up")}</span><strong>${escapeHtml(formatSpeed(summary.uploadSpeedKb || 0))}</strong><em>Upload</em></article>
        <article class="${summary.blocked ? "danger" : ""}"><span>${iconHtml("shield-virus")}</span><strong>${escapeHtml(String(summary.blocked || 0))}</strong><em>Blocked</em></article>
        <article class="${diskSpace.low ? "danger" : ""}"><span>${iconHtml("hard-drive")}</span><strong>${escapeHtml(diskSpace.available ? (diskSpace.freeBytes ? formatSize(diskSpace.freeBytes) : "0 B") : "Pending")}</strong><em>Disk free</em></article>
        <article class="${scheduler.lastError ? "danger" : ""}"><span>${iconHtml("calendar-clock")}</span><strong>${escapeHtml(scheduler.enabled ? (scheduler.insideWindow ? "Inside hours" : scheduler.desiredMode || "Outside hours") : "Off")}</strong><em>Scheduler</em></article>
      </div>

      <div class="torrentStartActions">
        <button data-torrent-tab-go="${connected ? "queue" : "protocols"}" type="button">${iconHtml(connected ? "download" : "plug")}<span><strong>${connected ? "Open queue" : "Connect engine"}</strong><em>${connected ? "Manage live downloads" : "Enable qBittorrent"}</em></span></button>
        <button data-torrent-tab-go="add" type="button">${iconHtml("magnet")}<span><strong>Add torrent</strong><em>Magnet or .torrent</em></span></button>
      </div>
    </section>
  `;
}

function renderTabs() {
  const active = getActiveTorrentSection();
  const counts = getTorrentFilterCounts();

  return `
    <section class="torrentCommandDock" aria-label="Torrent command navigation">
      <div class="torrentDockActive">
        <span>${iconHtml(active.icon)}</span>
        <div>
          <strong>${escapeHtml(active.title)}</strong>
          <em>${escapeHtml(active.menuSub || active.sub || "")}</em>
        </div>
        <b>${escapeHtml(String(counts.all || 0))} queued</b>
      </div>

      <nav class="torrentTabs torrentTabsFresh" aria-label="Torrent module tabs">
        ${torrentSections.filter((tab) => !TORRENT_MODULE_SETTINGS_TABS.has(tab.key)).map((tab) => `
          <button class="${torrentState.activeTab === tab.key ? "is-active" : ""}" data-torrent-tab="${escapeHtml(tab.key)}" type="button">
            ${iconHtml(tab.icon)}
            <span><strong>${escapeHtml(tab.title)}</strong><em>${escapeHtml(tab.sub)}</em></span>
          </button>
        `).join("")}
      </nav>
    </section>
  `;
}

function renderQueueToolbar() {
  const counts = getTorrentFilterCounts();
  const filters = [
    { key: "all", label: "All", count: counts.all },
    { key: "active", label: "Active", count: counts.active },
    { key: "paused", label: "Paused", count: counts.paused },
    { key: "complete", label: "Done", count: counts.complete },
    { key: "blocked", label: "Blocked", count: counts.blocked },
  ];

  return `
    <section class="torrentQueueToolbar">
      <div class="torrentQueueSearch">
        ${iconHtml("magnifying-glass")}
        <input id="torrentQueueSearch" type="search" value="${escapeHtml(torrentState.queueSearch || "")}" placeholder="Search queue…" />
      </div>

      <div class="torrentQueueFilters">
        ${filters.map((filter) => `
          <button class="${torrentState.queueFilter === filter.key ? "is-active" : ""}" data-torrent-filter="${escapeHtml(filter.key)}" type="button">
            <span>${escapeHtml(filter.label)}</span><b>${escapeHtml(String(filter.count || 0))}</b>
          </button>
        `).join("")}
      </div>

      <div class="torrentQueueBulkActions">
        <button data-torrent-refresh type="button">${iconHtml("arrows-rotate")}<span>Refresh</span></button>
        ${isTorrentEngineConnected() ? `
          <button data-torrent-action="resume" data-id="all" type="button">${iconHtml("play")}<span>Resume all</span></button>
          <button data-torrent-action="pause" data-id="all" type="button">${iconHtml("pause")}<span>Pause all</span></button>
          <button data-torrent-action="reannounce" data-id="all" type="button">${iconHtml("satellite-dish")}<span>Reannounce all</span></button>
        ` : ""}
      </div>

      <em>Last refresh: ${escapeHtml(formatTorrentRefreshTime())}</em>
    </section>
  `;
}

function renderQueue() {
  const allItems = getItems();
  const items = getVisibleTorrentItems();

  if (!allItems.length) {
    return `
      <section class="torrentPanel">
        <div class="torrentEmpty">
          ${iconHtml("magnet")}
          <strong>No torrents queued yet</strong>
          <p>Add a legal magnet link or .torrent reference to start building the BRMedia torrent queue.</p>
          <button class="torrentPrimaryBtn" data-torrent-tab-go="add" type="button">Add torrent</button>
        </div>
      </section>
    `;
  }

  return `
    ${renderEngineNotice("compact")}
    ${renderQueueToolbar()}
    <section class="torrentQueue">
      ${items.length ? items.map((item) => `
        <article class="torrentItem ${statusClass(item.status, item)}">
          <div class="torrentItemTop">
            <span class="torrentItemIcon">${iconHtml(item.kind === "magnet" ? "magnet" : "file-arrow-down")}</span>
            <div>
              <strong>${escapeHtml(item.name || "Torrent")}</strong>
              <em>${escapeHtml(item.kind || "torrent")} · ${escapeHtml(getTorrentStatusLabel(item))} · ${escapeHtml(item.priority || "normal")} priority</em>
            </div>
            <b>${escapeHtml(String(Math.round(Number(item.progress || 0))))}%</b>
          </div>

          <div class="torrentProgress"><span style="width:${Math.max(0, Math.min(100, Number(item.progress || 0)))}%"></span></div>

          <div class="torrentItemMeta">
            <span>${iconHtml("hard-drive")} ${escapeHtml(formatSize(item.sizeBytes || 0))}</span>
            <span>${iconHtml("down")} ${escapeHtml(formatSpeed(item.downloadSpeedKb || 0))}</span>
            <span>${iconHtml("up")} ${escapeHtml(formatSpeed(item.uploadSpeedKb || 0))}</span>
            <span>${iconHtml("seedling")} ${escapeHtml(String(item.seeds || 0))} seeds</span>
            <span>${iconHtml("users")} ${escapeHtml(String(item.leeches || 0))} leeches</span>
            ${item.eta ? `<span>${iconHtml("clock")} ${escapeHtml(formatTorrentEta(item.eta))}</span>` : ""}
            ${item.ratio ? `<span>${iconHtml("scale-balanced")} Ratio ${escapeHtml(Number(item.ratio || 0).toFixed(2))}</span>` : ""}
          </div>

          ${renderItemEngineNotice(item)}

          <div class="torrentSafety ${item.malware?.status === "blocked" ? "danger" : "good"}">
            ${iconHtml(item.malware?.status === "blocked" ? "shield-xmark" : "shield-check")}
            <span>${escapeHtml(item.malware?.message || "Safety scan pending.")}</span>
          </div>

          <div class="torrentActions torrentActionsA9">
            ${(() => {
              const run = getTorrentRunAction(item);
              const busy = torrentState.busyAction === `${item.id}:${run.action}`;
              return `<button class="${run.className} ${busy ? "is-busy" : ""}" data-torrent-action="${escapeHtml(run.action)}" data-id="${escapeHtml(item.id)}" type="button">${iconHtml(busy ? "spinner" : run.icon)} ${escapeHtml(busy ? "Working…" : run.label)}</button>`;
            })()}
            ${isLiveTorrentItem(item) ? `<button class="files" data-torrent-open-files="${escapeHtml(item.id)}" type="button">${iconHtml("folder-open")} Files / Transfer</button>` : ""}
            ${isLiveTorrentItem(item) ? `<button data-torrent-open-pieces="${escapeHtml(item.id)}" type="button">${iconHtml("grip")} Pieces</button>` : ""}
            ${isLiveTorrentItem(item) ? `<button data-torrent-open-folder="${escapeHtml(item.id)}" type="button">${iconHtml("folder-tree")} Open folder</button>` : ""}
            ${isLiveTorrentItem(item) ? `<button data-torrent-scan-downloads="${escapeHtml(item.id)}" type="button">${iconHtml("shield-virus")} Scan downloads</button>` : ""}
            ${isLiveTorrentItem(item) ? `<button data-torrent-open-trackers="${escapeHtml(item.id)}" type="button">${iconHtml("satellite-dish")} Trackers</button>` : ""}
            ${isLiveTorrentItem(item) ? `<button data-torrent-open-peers="${escapeHtml(item.id)}" type="button">${iconHtml("users")} Peers</button>` : ""}
            <button class="${item.priority === "top" ? "is-applied" : ""} ${torrentState.busyAction === `${item.id}:priority` ? "is-busy" : ""}" data-torrent-action="priority" data-priority="top" data-id="${escapeHtml(item.id)}" type="button">
              ${iconHtml(torrentState.busyAction === `${item.id}:priority` ? "spinner" : item.priority === "top" ? "circle-check" : "bolt")}
              ${escapeHtml(torrentState.busyAction === `${item.id}:priority` ? "Setting…" : item.priority === "top" ? "Top priority set" : "Top priority")}
            </button>
            ${(!isLiveTorrentItem(item) && isTorrentEngineReady()) ? `<button class="send" data-torrent-action="send-to-engine" data-id="${escapeHtml(item.id)}" type="button">${iconHtml("paper-plane")} Send to engine</button>` : ""}
            ${(item?.malware?.status === "blocked" || item.status === "blocked" || item.status === "error") ? `<button class="allow" data-torrent-action="allow" data-id="${escapeHtml(item.id)}" type="button">${iconHtml("lock-open")} Unblock</button>` : ""}
            <button class="${item.malware?.scannedAt ? "is-applied" : ""} ${torrentState.busyAction === `${item.id}:scan` ? "is-busy" : ""}" data-torrent-action="scan" data-id="${escapeHtml(item.id)}" type="button">
              ${iconHtml(torrentState.busyAction === `${item.id}:scan` ? "spinner" : item.malware?.scannedAt ? "shield-check" : "shield-virus")}
              ${escapeHtml(torrentState.busyAction === `${item.id}:scan` ? "Scanning…" : item.malware?.scannedAt ? "Scan passed" : "Scan")}
            </button>
            ${isLiveTorrentItem(item) ? `<button data-torrent-action="force-start" data-id="${escapeHtml(item.id)}" type="button">${iconHtml("rocket-launch")} Force start</button>` : ""}
            ${isLiveTorrentItem(item) ? `<button data-torrent-action="reannounce" data-id="${escapeHtml(item.id)}" type="button">${iconHtml("satellite-dish")} Reannounce</button>` : ""}
            ${isLiveTorrentItem(item) ? `<button data-torrent-action="recheck" data-id="${escapeHtml(item.id)}" type="button">${iconHtml("list-check")} Recheck</button>` : ""}
            <button class="danger" data-torrent-action="remove-keep" data-id="${escapeHtml(item.id)}" type="button">${iconHtml("trash-can-arrow-up")} Remove torrent only</button>
            ${isLiveTorrentItem(item) ? `<button class="danger hard-delete" data-torrent-action="remove-delete" data-id="${escapeHtml(item.id)}" type="button">${iconHtml("trash")} Delete files too</button>` : ""}
          </div>
        </article>
      `).join("") : `
        <section class="torrentPanel">
          <div class="torrentEmpty small">
            ${iconHtml("magnifying-glass")}
            <strong>No matching torrents</strong>
            <p>Try a different search or queue filter.</p>
          </div>
        </section>
      `}
    </section>
  `;
}

function getTorrentById(id = "") {
  return getItems().find(
    (item) =>
      String(item.hash || item.id) === String(id)
  ) || null;
}

function renderCompletedPanel() {
  const items = getItems()
    .filter((item) => isTorrentComplete(item));

  return `
    <section class="torrentPanel torrentCompletedPanel">
      <div class="torrentPanelHead">
        <span>${iconHtml("circle-check")}</span>

        <div>
          <strong>Completed downloads</strong>
          <em>
            Finished torrents stay here for scan, folder access,
            file selection and Audio / Video library transfer.
          </em>
        </div>
      </div>

      ${
        items.length
          ? `
            <div class="torrentCompletedList">
              ${items.map((item) => `
                <article class="torrentCompletedCard">
                  <div class="torrentCompletedTop">
                    <span>${iconHtml("circle-check")}</span>

                    <div>
                      <strong>${escapeHtml(item.name || "Torrent")}</strong>

                      <em>
                        ${escapeHtml(formatSize(item.sizeBytes || 0))}
                        ·
                        ${escapeHtml(getTorrentStatusLabel(item))}
                      </em>
                    </div>

                    <b>100%</b>
                  </div>

                  <div class="torrentItemMeta">
                    <span>${iconHtml("seedling")} ${escapeHtml(String(item.seeds || 0))} seeds</span>
                    <span>${iconHtml("users")} ${escapeHtml(String(item.leeches || 0))} leeches</span>
                    <span>${iconHtml("up")} ${escapeHtml(formatSpeed(item.uploadSpeedKb || 0))}</span>
                    ${item.ratio ? `<span>${iconHtml("scale-balanced")} Ratio ${escapeHtml(Number(item.ratio || 0).toFixed(2))}</span>` : ""}
                  </div>

                  <div class="torrentCompletedActions">
                    <button
                      data-torrent-open-files="${escapeHtml(item.id)}"
                      type="button"
                    >
                      ${iconHtml("folder-open")}
                      <span>Files / Transfer</span>
                    </button>

                    <button
                      data-torrent-open-folder="${escapeHtml(item.id)}"
                      type="button"
                    >
                      ${iconHtml("folder-tree")}
                      <span>Open folder</span>
                    </button>

                    <button
                      data-torrent-scan-downloads="${escapeHtml(item.id)}"
                      type="button"
                    >
                      ${iconHtml("shield-virus")}
                      <span>Scan downloads</span>
                    </button>

                    <button
                      data-torrent-open-trackers="${escapeHtml(item.id)}"
                      type="button"
                    >
                      ${iconHtml("satellite-dish")}
                      <span>Trackers</span>
                    </button>

                    <button
                      data-torrent-open-peers="${escapeHtml(item.id)}"
                      type="button"
                    >
                      ${iconHtml("users")}
                      <span>Peers</span>
                    </button>
                  </div>
                </article>
              `).join("")}
            </div>
          `
          : `
            <div class="torrentEmpty">
              ${iconHtml("circle-check")}
              <strong>No completed downloads yet</strong>

              <p>
                Finished torrents will move into this page automatically.
              </p>
            </div>
          `
      }
    </section>
  `;
}

function renderSpeedGraphPanel() {
  const ui = getSettings().ui || {};
  const enabled = ui.speedGraph !== false;
  const historyLength = Math.max(20, Math.min(600, Number(ui.speedGraphHistoryLength || 120)));
  const rows = Array.isArray(torrentState.data?.speedHistory) ? torrentState.data.speedHistory.slice(-historyLength) : [];
  const summary = torrentState.data?.summary || {};
  const max = Math.max(1, ...rows.map((row) => Math.max(Number(row.downloadSpeedKb || 0), Number(row.uploadSpeedKb || 0))));
  const latest = rows[rows.length - 1] || {};
  const averageDownload = rows.length ? rows.reduce((sum, row) => sum + Number(row.downloadSpeedKb || 0), 0) / rows.length : 0;
  const averageUpload = rows.length ? rows.reduce((sum, row) => sum + Number(row.uploadSpeedKb || 0), 0) / rows.length : 0;
  const peakDownload = rows.reduce((peak, row) => Math.max(peak, Number(row.downloadSpeedKb || 0)), 0);
  const peakUpload = rows.reduce((peak, row) => Math.max(peak, Number(row.uploadSpeedKb || 0)), 0);

  if (!enabled) return `<section class="torrentPanel torrentSpeedPanel"><div class="torrentEmpty">${iconHtml("chart-line")}<strong>Speed graph is switched off</strong><p>Enable it in Universal Settings when you want BRMedia to collect and display live speed samples.</p><a class="torrentPrimaryBtn" href="/settings?module=torrents&tab=graph">Open Speed Graph settings</a></div></section>`;

  return `
    <section class="torrentPanel torrentSpeedPanel">
      <div class="torrentPanelHead"><span>${iconHtml("chart-line")}</span><div><strong>Live speed graph</strong><em>Recent qBittorrent samples, collected server-side even while this page is closed.</em></div></div>
      <div class="torrentSpeedSummary">
        ${ui.speedGraphShowCurrent !== false ? `<span>${iconHtml("down")}<strong>${escapeHtml(formatSpeed(latest.downloadSpeedKb || 0))}</strong><em>Download now</em></span><span>${iconHtml("up")}<strong>${escapeHtml(formatSpeed(latest.uploadSpeedKb || 0))}</strong><em>Upload now</em></span>` : ""}
        ${ui.speedGraphShowAverage !== false ? `<span>${iconHtml("chart-line")}<strong>${escapeHtml(formatSpeed(averageDownload))}</strong><em>Average down</em></span><span>${iconHtml("chart-line")}<strong>${escapeHtml(formatSpeed(averageUpload))}</strong><em>Average up</em></span>` : ""}
        ${ui.speedGraphShowPeak !== false ? `<span>${iconHtml("bolt")}<strong>${escapeHtml(formatSpeed(peakDownload))}</strong><em>Peak down</em></span><span>${iconHtml("bolt")}<strong>${escapeHtml(formatSpeed(peakUpload))}</strong><em>Peak up</em></span>` : ""}
        ${ui.speedGraphShowTotals !== false ? `<span>${iconHtml("download")}<strong>${escapeHtml(summary.downloadedBytes ? formatSize(summary.downloadedBytes) : "0 B")}</strong><em>Downloaded</em></span><span>${iconHtml("upload")}<strong>${escapeHtml(summary.uploadedBytes ? formatSize(summary.uploadedBytes) : "0 B")}</strong><em>Uploaded</em></span>` : ""}
        <button data-torrent-refresh type="button">${iconHtml("arrows-rotate")}<span>Refresh graph</span></button>
      </div>
      ${rows.length ? `<div class="torrentSpeedChartWrap"><div class="torrentSpeedChart">${rows.map((row) => { const down = Math.max(3, Math.round((Number(row.downloadSpeedKb || 0) / max) * 100)); const up = Math.max(3, Math.round((Number(row.uploadSpeedKb || 0) / max) * 100)); return `<span class="torrentSpeedColumn"><i class="download" style="height:${down}%" title="Download ${escapeHtml(formatSpeed(row.downloadSpeedKb || 0))}"></i><i class="upload" style="height:${up}%" title="Upload ${escapeHtml(formatSpeed(row.uploadSpeedKb || 0))}"></i></span>`; }).join("")}</div><div class="torrentSpeedLegend"><span><i class="download"></i> Download</span><span><i class="upload"></i> Upload</span></div></div>` : `<div class="torrentEmpty small">${iconHtml("chart-line")}<strong>No speed samples yet</strong><p>BRMedia now records samples on the server. Leave qBittorrent connected and check again shortly.</p></div>`}
    </section>
  `;
}

function renderTrackersPanel() {
  const payload = torrentState.torrentTrackersPayload;

  const rows = Array.isArray(payload?.trackers)
    ? payload.trackers
    : [];

  if (!torrentState.selectedTorrentId) {
    return `
      <section class="torrentPanel">
        <div class="torrentEmpty">
          ${iconHtml("satellite-dish")}
          <strong>No torrent selected</strong>

          <p>
            Open Queue or Completed Downloads, then tap Trackers.
          </p>
        </div>
      </section>
    `;
  }

  return `
    <section class="torrentPanel">
      <div class="torrentPanelHead">
        <span>${iconHtml("satellite-dish")}</span>

        <div>
          <strong>${escapeHtml(torrentState.selectedTorrentName || "Torrent trackers")}</strong>
          <em>Tracker status, seeds, leeches and messages.</em>
        </div>
      </div>

      <div class="torrentFileToolbar">
        <button data-torrent-trackers-refresh type="button">
          ${iconHtml("arrows-rotate")}
          Refresh trackers
        </button>

        <button data-torrent-open-peers="${escapeHtml(torrentState.selectedTorrentId)}" type="button">
          ${iconHtml("users")}
          Peers
        </button>

        <button data-torrent-tab-go="queue" type="button">
          ${iconHtml("download")}
          Back to queue
        </button>
      </div>

      ${
        torrentState.torrentTrackersLoading
          ? `
            <div class="torrentEmpty small">
              ${iconHtml("spinner")}
              <strong>Loading trackers…</strong>
            </div>
          `
          : rows.length
            ? `
              <div class="torrentTrackerList">
                ${rows.map((tracker) => `
                  <article class="torrentTrackerCard">
                    <span>${iconHtml("satellite-dish")}</span>

                    <div>
                      <strong>${escapeHtml(tracker.url || "Tracker")}</strong>
                      <em>${escapeHtml(tracker.message || "No tracker message")}</em>
                    </div>

                    <b>Status ${escapeHtml(String(tracker.status || 0))}</b>

                    <small>
                      ${escapeHtml(String(tracker.seeds || 0))} seeds
                      ·
                      ${escapeHtml(String(tracker.leeches || 0))} leeches
                      ·
                      ${escapeHtml(String(tracker.peers || 0))} peers
                    </small>
                  </article>
                `).join("")}
              </div>
            `
            : `
              <div class="torrentEmpty small">
                ${iconHtml("satellite-dish")}
                <strong>No tracker rows returned</strong>

                <p>
                  qBittorrent may still be loading metadata.
                </p>
              </div>
            `
      }
    </section>
  `;
}

function renderPeersPanel() {
  const payload = torrentState.torrentPeersPayload;

  const rows = Array.isArray(payload?.peers)
    ? payload.peers
    : [];

  if (!torrentState.selectedTorrentId) {
    return `
      <section class="torrentPanel">
        <div class="torrentEmpty">
          ${iconHtml("users")}
          <strong>No torrent selected</strong>

          <p>
            Open Queue or Completed Downloads, then tap Peers.
          </p>
        </div>
      </section>
    `;
  }

  return `
    <section class="torrentPanel">
      <div class="torrentPanelHead">
        <span>${iconHtml("users")}</span>

        <div>
          <strong>${escapeHtml(torrentState.selectedTorrentName || "Torrent peers")}</strong>
          <em>Connected peer clients, progress and transfer activity.</em>
        </div>
      </div>

      <div class="torrentFileToolbar">
        <button data-torrent-peers-refresh type="button">
          ${iconHtml("arrows-rotate")}
          Refresh peers
        </button>

        <button data-torrent-open-trackers="${escapeHtml(torrentState.selectedTorrentId)}" type="button">
          ${iconHtml("satellite-dish")}
          Trackers
        </button>

        <button data-torrent-tab-go="queue" type="button">
          ${iconHtml("download")}
          Back to queue
        </button>
      </div>

      ${
        torrentState.torrentPeersLoading
          ? `
            <div class="torrentEmpty small">
              ${iconHtml("spinner")}
              <strong>Loading peers…</strong>
            </div>
          `
          : rows.length
            ? `
              <div class="torrentPeerList">
                ${rows.map((peer) => `
                  <article class="torrentPeerCard">
                    <span>${iconHtml("desktop")}</span>

                    <div>
                      <strong>${escapeHtml(peer.ip || "Peer")}</strong>

                      <em>
                        ${escapeHtml(peer.client || "Unknown client")}
                        ${peer.country ? ` · ${escapeHtml(peer.country)}` : ""}
                      </em>
                    </div>

                    <b>${escapeHtml(String(peer.progress || 0))}%</b>

                    <small>
                      ↓ ${escapeHtml(formatSpeed(peer.downloadSpeedKb || 0))}
                      ·
                      ↑ ${escapeHtml(formatSpeed(peer.uploadSpeedKb || 0))}
                    </small>
                  </article>
                `).join("")}
              </div>
            `
            : `
              <div class="torrentEmpty small">
                ${iconHtml("users")}
                <strong>No connected peers returned</strong>

                <p>
                  This can be normal for completed or paused torrents.
                </p>
              </div>
            `
      }
    </section>
  `;
}

function renderScanHistoryPanel() {
  const rows = Array.isArray(torrentState.data?.scanHistory)
    ? torrentState.data.scanHistory
    : [];

  return `
    <section class="torrentPanel">
      <div class="torrentPanelHead">
        <span>${iconHtml("shield-check")}</span>

        <div>
          <strong>Malware scan history</strong>
          <em>
            Downloaded-file filename scans and quarantine results.
          </em>
        </div>
      </div>

      ${
        rows.length
          ? `
            <div class="torrentHistoryList">
              ${rows.map((item) => `
                <article class="torrentHistoryCard ${escapeHtml(item.status || "clean")}">
                  <span>
                    ${iconHtml(
                      item.status === "blocked"
                        ? "shield-xmark"
                        : item.status === "quarantined"
                          ? "box-archive"
                          : "shield-check"
                    )}
                  </span>

                  <div>
                    <strong>${escapeHtml(item.torrentName || "Torrent scan")}</strong>
                    <em>${escapeHtml(item.message || "Scan complete")}</em>

                    <small>
                      ${escapeHtml(String(item.checkedFiles || 0))} checked
                      ·
                      ${escapeHtml(String(item.suspiciousFiles?.length || 0))} suspicious
                      ·
                      ${escapeHtml(String(item.quarantinedFiles?.length || 0))} quarantined
                    </small>
                  </div>

                  <b>${escapeHtml(item.status || "clean")}</b>
                </article>
              `).join("")}
            </div>
          `
          : `
            <div class="torrentEmpty">
              ${iconHtml("shield-check")}
              <strong>No downloaded-file scans yet</strong>

              <p>
                Open Queue, Completed Downloads or Files and run Scan downloads.
              </p>
            </div>
          `
      }
    </section>
  `;
}

function renderNotificationsPanel() {
  const rows = Array.isArray(torrentState.data?.notifications)
    ? torrentState.data.notifications
    : [];

  const enabled = isTorrentBrowserAlertsEnabled();

  return `
    <section class="torrentPanel">
      <div class="torrentPanelHead">
        <span>${iconHtml("bell")}</span>

        <div>
          <strong>Torrent notifications</strong>
          <em>
            Completed downloads, blocked files, scans and low-seed warnings.
          </em>
        </div>
      </div>

      <div class="torrentFileToolbar">
        ${
          enabled
            ? `
              <button data-torrent-disable-browser-alerts type="button">
                ${iconHtml("bell-slash")}
                Disable browser alerts
              </button>
            `
            : `
              <button data-torrent-enable-browser-alerts type="button">
                ${iconHtml("bell")}
                Enable browser alerts
              </button>
            `
        }

        <button data-torrent-refresh type="button">
          ${iconHtml("arrows-rotate")}
          Refresh alerts
        </button>
      </div>

      <p class="torrentNoticeHelp">
        Browser alerts work where the browser allows notifications.
        The in-app alert history below remains available either way.
      </p>

      ${
        rows.length
          ? `
            <div class="torrentNoticeList">
              ${rows.map((item) => `
                <article class="torrentNoticeCard ${escapeHtml(item.type || "info")}">
                  <span>
                    ${iconHtml(
                      item.type === "blocked"
                        ? "shield-xmark"
                        : item.type === "complete"
                          ? "circle-check"
                          : item.type === "warning"
                            ? "triangle-exclamation"
                            : "bell"
                    )}
                  </span>

                  <div>
                    <strong>${escapeHtml(item.title || "Torrent update")}</strong>
                    <em>${escapeHtml(item.message || "")}</em>

                    <small>
                      ${escapeHtml(
                        item.createdAt
                          ? new Date(item.createdAt).toLocaleString()
                          : "Recent"
                      )}
                    </small>
                  </div>

                  ${
                    item.actionUrl
                      ? `<a href="${escapeHtml(item.actionUrl)}">Open</a>`
                      : ""
                  }
                </article>
              `).join("")}
            </div>
          `
          : `
            <div class="torrentEmpty">
              ${iconHtml("bell")}
              <strong>No torrent alerts yet</strong>

              <p>
                BRMedia will keep completed-download, scan and low-seed notices here.
              </p>
            </div>
          `
      }
    </section>
  `;
}

function renderFilesPanel() {
  const payload = torrentState.torrentFilesPayload;
  const files = Array.isArray(payload?.files) ? payload.files : [];
  const torrent = payload?.torrent || {};
  const selectedIds = new Set(getSelectedTorrentFileIds());
  const selectedFiles = getSelectedTorrentFiles();

  if (!torrentState.selectedTorrentId) {
    return `
      <section class="torrentPanel">
        <div class="torrentEmpty">
          ${iconHtml("folder-open")}
          <strong>No torrent selected</strong>
          <p>Open the Queue tab, then tap Files / Transfer on a live qBittorrent item.</p>
          <button class="torrentPrimaryBtn" data-torrent-tab-go="queue" type="button">Open queue</button>
        </div>
      </section>
    `;
  }

  return `
    <section class="torrentPanel torrentFilesPanel">
      <div class="torrentPanelHead">
        <span>${iconHtml("folder-open")}</span>
        <div>
          <strong>${escapeHtml(torrent.name || torrentState.selectedTorrentName || "Torrent files")}</strong>
          <em>Choose files, change priority, skip extras, add completed audio/video to BRMedia or download in browser.</em>
        </div>
      </div>

      <div class="torrentFileToolbar">
        <button data-torrent-files-refresh type="button">${iconHtml("arrows-rotate")} Refresh files</button>
        <button data-torrent-pieces-refresh type="button">${iconHtml("grip")} View pieces</button>
        <button data-torrent-open-folder="${escapeHtml(torrentState.selectedTorrentId)}" type="button">${iconHtml("folder-tree")} Open folder</button>
        <button data-torrent-scan-downloads="${escapeHtml(torrentState.selectedTorrentId)}" type="button">${iconHtml("shield-virus")} Scan downloads</button>
        <button data-torrent-tab-go="queue" type="button">${iconHtml("download")} Back to queue</button>
      </div>

      <section class="torrentFileBulkBox">
        <div class="torrentFileBulkHead">
          <div>
            <strong>${escapeHtml(String(selectedFiles.length))} selected</strong>

            <em>
              Select only the files you want to prioritise, skip,
              quarantine or transfer into BRMedia.
            </em>
          </div>

          <div>
            <button data-torrent-file-select-all type="button">
              ${iconHtml("square-check")} Select all
            </button>

            <button data-torrent-file-select-complete type="button">
              ${iconHtml("circle-check")} Completed
            </button>

            <button data-torrent-file-select-none type="button">
              ${iconHtml("square")} Clear
            </button>
          </div>
        </div>

        <div class="torrentFileBulkActions">
          <button data-torrent-files-bulk-priority="skip" type="button">
            ${iconHtml("ban")} Skip selected
          </button>

          <button data-torrent-files-bulk-priority="normal" type="button">
            ${iconHtml("download")} Normal selected
          </button>

          <button data-torrent-files-bulk-priority="high" type="button">
            ${iconHtml("bolt")} High selected
          </button>

          <button data-torrent-files-bulk-priority="top" type="button">
            ${iconHtml("rocket-launch")} Top selected
          </button>

          <button data-torrent-files-bulk-library="audio" type="button">
            ${iconHtml("music")} Transfer selected audio
          </button>

          <button data-torrent-files-bulk-library="video" type="button">
            ${iconHtml("film")} Transfer selected video
          </button>

          <button class="danger" data-torrent-files-quarantine type="button">
            ${iconHtml("box-archive")} Quarantine selected
          </button>
        </div>
      </section>

      ${renderTorrentTransferBox()}

      ${torrentState.torrentFilesLoading ? `
        <div class="torrentEmpty small">${iconHtml("spinner")}<strong>Loading torrent files…</strong></div>
      ` : ""}

      ${files.length ? `
        <div class="torrentFileList">
          ${files.map((file) => `
            <article class="torrentFileCard ${file.active ? "is-active" : "is-skipped"} ${selectedIds.has(String(file.id)) ? "is-selected" : ""}">
              <div class="torrentFileCardTop">
                <label class="torrentFileSelect" aria-label="Select file for bulk actions">
                  <input
                    data-torrent-file-select="${escapeHtml(file.id)}"
                    type="checkbox"
                    ${selectedIds.has(String(file.id)) ? "checked" : ""}
                  />

                  <span>
                    ${iconHtml(selectedIds.has(String(file.id)) ? "square-check" : "square")}
                  </span>
                </label>

                <span>${iconHtml(getFileTypeIcon(file))}</span>

                <div>
                  <strong>${escapeHtml(file.name)}</strong>

                  <em>
                    ${escapeHtml(formatSize(file.sizeBytes || 0))}
                    ·
                    ${escapeHtml(String(Math.round(Number(file.progress || 0))))}%
                    ·
                    ${escapeHtml(getPriorityLabel(file.priority))}
                  </em>
                </div>

                <label class="torrentFileSwitch" aria-label="Enable or skip this file">
                  <input
                    data-torrent-file-toggle="${escapeHtml(file.id)}"
                    type="checkbox"
                    ${file.active ? "checked" : ""}
                  />

                  <span></span>
                </label>
              </div>

              <div class="torrentProgress"><span style="width:${Math.max(0, Math.min(100, Number(file.progress || 0)))}%"></span></div>

              <div class="torrentFilePriorityGrid">
                <button data-torrent-file-priority="${escapeHtml(file.id)}" data-priority="skip" type="button">${iconHtml("ban")} Skip</button>
                <button data-torrent-file-priority="${escapeHtml(file.id)}" data-priority="normal" type="button">${iconHtml("download")} Normal</button>
                <button data-torrent-file-priority="${escapeHtml(file.id)}" data-priority="high" type="button">${iconHtml("bolt")} High</button>
                <button data-torrent-file-priority="${escapeHtml(file.id)}" data-priority="top" type="button">${iconHtml("rocket-launch")} Top</button>
              </div>

              <div class="torrentFileHandoffGrid">
                ${file.canAddToAudio ? `<button ${file.completed ? "" : "disabled"} data-torrent-file-library="${escapeHtml(file.id)}" data-target="audio" type="button">${iconHtml("music")} Add to Audio</button>` : ""}
                ${file.canAddToVideo ? `<button ${file.completed ? "" : "disabled"} data-torrent-file-library="${escapeHtml(file.id)}" data-target="video" type="button">${iconHtml("film")} Add to Video</button>` : ""}
                <a class="torrentFileDownloadBtn ${file.completed ? "" : "is-disabled"}" href="${escapeHtml(file.downloadUrl || "#")}" ${file.completed ? "download" : "aria-disabled=\"true\""}>${iconHtml("download")} Browser download</a>
              </div>
            </article>
          `).join("")}
        </div>
      ` : `
        <div class="torrentEmpty small">
          ${iconHtml("folder-open")}
          <strong>No files found yet</strong>
          <p>qBittorrent may still be fetching metadata. Try Refresh files in a moment.</p>
        </div>
      `}
    </section>
  `;
}

function renderPiecesPanel() {
  const payload = torrentState.torrentPiecesPayload;
  const pieces = Array.isArray(payload?.pieces) ? payload.pieces : [];
  const torrent = payload?.torrent || {};
  const percent = Math.max(0, Math.min(100, Number(payload?.percent || 0)));

  if (!torrentState.selectedTorrentId) {
    return `
      <section class="torrentPanel">
        <div class="torrentEmpty">
          ${iconHtml("grip")}
          <strong>No torrent selected</strong>
          <p>Open Queue, then tap Pieces on a live qBittorrent item.</p>
          <button class="torrentPrimaryBtn" data-torrent-tab-go="queue" type="button">Open queue</button>
        </div>
      </section>
    `;
  }

  return `
    <section class="torrentPanel torrentPiecesPanel">
      <div class="torrentPanelHead">
        <span>${iconHtml("grip")}</span>
        <div>
          <strong>${escapeHtml(torrent.name || torrentState.selectedTorrentName || "Torrent pieces")}</strong>
          <em>${escapeHtml(String(payload?.completePieces || 0))} complete · ${escapeHtml(String(payload?.downloadingPieces || 0))} downloading · ${escapeHtml(String(payload?.missingPieces || 0))} missing</em>
        </div>
      </div>

      <div class="torrentPieceSummary">
        <strong>${Math.round(percent)}%</strong>
        <span>${escapeHtml(String(payload?.totalPieces || 0))} pieces total</span>
        <i><b style="width:${percent}%"></b></i>
      </div>

      <div class="torrentFileToolbar">
        <button data-torrent-pieces-refresh type="button">${iconHtml("arrows-rotate")} Refresh pieces</button>
        <button data-torrent-tab-go="files" type="button">${iconHtml("folder-open")} Files / Transfer</button>
        <button data-torrent-tab-go="queue" type="button">${iconHtml("download")} Back to queue</button>
      </div>

      ${torrentState.torrentPiecesLoading ? `<div class="torrentEmpty small">${iconHtml("spinner")}<strong>Loading piece map…</strong></div>` : ""}

      ${pieces.length ? `
        <div class="torrentPieceLegend">
          <span><i class="complete"></i> Downloaded</span>
          <span><i class="downloading"></i> Downloading</span>
          <span><i class="missing"></i> Missing</span>
        </div>
        <div class="torrentPieceMap" aria-label="Torrent pieces">
          ${pieces.map((piece) => `<span class="${escapeHtml(piece.status || "missing")}" title="Piece ${escapeHtml(String(piece.index + 1))}: ${escapeHtml(piece.status || "missing")}"></span>`).join("")}
        </div>
      ` : `<div class="torrentEmpty small">${iconHtml("grip")}<strong>No piece data yet</strong><p>qBittorrent may still be fetching metadata. Try Refresh pieces in a moment.</p></div>`}
    </section>
  `;
}

function renderAddPanel() {
  const incoming = torrentState.launchInput || "";

  return `
    <section class="torrentPanel">
      <div class="torrentPanelHead">
        <span>${iconHtml("magnet")}</span>
        <div><strong>Add torrents</strong><em>Bulk magnet links or .torrent references. One per line.</em></div>
      </div>

      ${incoming ? `
        <div class="torrentIncomingBox">
          <span>${iconHtml("magnet")}</span>
          <div>
            <strong>Magnet link received</strong>
            <p>BRMedia opened from a magnet/protocol link. Check the link below, then press Add links / URLs.</p>
          </div>
        </div>
      ` : ""}

      <label class="torrentField">
        <span>Optional label</span>
        <input id="torrentLabel" type="text" placeholder="Film pack, Linux ISO, authorised archive…" />
      </label>

      <label class="torrentField">
        <span>Magnet links / .torrent URLs / saved .torrent paths</span>
        <textarea id="torrentInput" rows="7" placeholder="magnet:?xt=urn:btih:...&#10;https://example.com/file.torrent&#10;C:\\Torrents\\example.torrent">${escapeHtml(incoming)}</textarea>
      </label>

      <label class="torrentFileDrop">
        <span>${iconHtml("file-arrow-up")}</span>
        <div class="torrentFileDropCopy">
          <strong>Upload .torrent files</strong>
          <em>Select one or more .torrent files from this phone / PC.</em>
        </div>
        <input id="torrentFileInput" type="file" accept=".torrent,application/x-bittorrent" multiple />
      </label>

      <div class="torrentNotice">
        ${iconHtml("shield-halved")}
        <span>BRMedia Torrents is for legal/authorised torrents. Suspicious executable patterns are blocked before download.</span>
      </div>

      <div class="torrentButtonGrid">
        <button class="torrentPrimaryBtn" id="btnAddTorrent" type="button">${iconHtml("plus")} Add links / URLs</button>
        <button class="torrentPrimaryBtn" id="btnUploadTorrentFile" type="button">${iconHtml("file-arrow-up")} Upload .torrent</button>
      </div>
    </section>
  `;
}

function renderBandwidthPanel() {
  const bandwidth = getSettings().bandwidth || {};

  return `
    <section class="torrentPanel">
      <div class="torrentPanelHead"><span>${iconHtml("gauge-high")}</span><div><strong>Bandwidth management</strong><em>Prevent network lag by setting speed limits.</em></div></div>

      <div class="torrentFormGrid">
        ${numberField("torrentDownloadLimit", "Download limit KB/s", bandwidth.downloadLimitKb || 0)}
        ${numberField("torrentUploadLimit", "Upload limit KB/s", bandwidth.uploadLimitKb || 0)}
        ${numberField("torrentSlowDownload", "Slow mode download KB/s", bandwidth.slowModeDownloadKb || 512)}
        ${numberField("torrentSlowUpload", "Slow mode upload KB/s", bandwidth.slowModeUploadKb || 64)}
      </div>

      <div class="torrentButtonGrid">
        <button class="torrentPrimaryBtn" id="btnSaveBandwidth" type="button">${iconHtml("floppy-disk")} Save bandwidth</button>
        <button class="torrentPrimaryBtn" id="btnApplyEngineBandwidth" type="button">${iconHtml("plug-circle-bolt")} Apply to engine</button>
      </div>
    </section>
  `;
}

function renderSchedulerPanel() {
  const scheduler = getSettings().scheduler || {};
  const windowOne = Array.isArray(scheduler.windows) ? scheduler.windows[0] || {} : {};

  return `
    <section class="torrentPanel">
      <div class="torrentPanelHead"><span>${iconHtml("calendar-clock")}</span><div><strong>Download scheduling</strong><em>Set when BRMedia may download or seed.</em></div></div>

      <label class="torrentToggle"><input id="torrentScheduleEnabled" type="checkbox" ${scheduler.enabled ? "checked" : ""} /><span>Enable calendar scheduler</span></label>

      <div class="torrentFormGrid">
        ${textField("torrentScheduleDay", "Days", windowOne.day || "Mon-Fri")}
        ${textField("torrentScheduleStart", "Start", windowOne.start || "00:00")}
        ${textField("torrentScheduleEnd", "End", windowOne.end || "07:00")}
      </div>

      <button class="torrentPrimaryBtn" id="btnSaveScheduler" type="button">${iconHtml("floppy-disk")} Save scheduler</button>
    </section>
  `;
}

function renderHealthPanel() {
  const items = getItems();

  return `
    <section class="torrentPanel">
      <div class="torrentPanelHead"><span>${iconHtml("seedling")}</span><div><strong>Swarm health</strong><em>Seeds, leeches and dead torrent warnings.</em></div></div>
      <div class="torrentHealthList">
        ${items.length ? items.map((item) => `
          <article>
            <strong>${escapeHtml(item.name || "Torrent")}</strong>
            <span>${iconHtml("seedling")} ${escapeHtml(String(item.seeds || 0))} seeds</span>
            <span>${iconHtml("users")} ${escapeHtml(String(item.leeches || 0))} leeches</span>
            <em>${Number(item.seeds || 0) ? "Healthy when engine is connected." : "Waiting for engine swarm data."}</em>
          </article>
        `).join("") : `<div class="torrentEmpty small">${iconHtml("seedling")}<strong>No swarm data yet</strong><p>Add torrents to monitor swarm health.</p></div>`}
      </div>
    </section>
  `;
}

function renderCachePanel() {
  const cache = getSettings().cache || {};

  return `
    <section class="torrentPanel">
      <div class="torrentPanelHead"><span>${iconHtml("hard-drive")}</span><div><strong>Smart disk caching</strong><em>Reduce hard-drive wear with controlled caching.</em></div></div>

      <label class="torrentToggle"><input id="torrentCacheEnabled" type="checkbox" ${cache.enabled ? "checked" : ""} /><span>Enable smart cache</span></label>
      <label class="torrentToggle"><input id="torrentCacheCoalesce" type="checkbox" ${cache.writeCoalesce ? "checked" : ""} /><span>Coalesce small writes</span></label>
      <label class="torrentToggle"><input id="torrentCacheWear" type="checkbox" ${cache.reduceDiskWear ? "checked" : ""} /><span>Reduce disk wear</span></label>

      ${numberField("torrentCacheSize", "Cache size MB", cache.sizeMb || 512)}

      <button class="torrentPrimaryBtn" id="btnSaveCache" type="button">${iconHtml("floppy-disk")} Save cache</button>
    </section>
  `;
}

function renderSecurityPanel() {
  const security = getSettings().security || {};

  return `
    <section class="torrentPanel">
      <div class="torrentPanelHead"><span>${iconHtml("shield-virus")}</span><div><strong>In-app malware protection</strong><em>Scan .torrent files and downloaded content where possible.</em></div></div>

      <label class="torrentToggle"><input id="torrentScanFiles" type="checkbox" ${security.scanTorrentFiles ? "checked" : ""} /><span>Scan .torrent files</span></label>
      <label class="torrentToggle"><input id="torrentScanDownloads" type="checkbox" ${security.scanDownloadedFiles ? "checked" : ""} /><span>Scan downloaded content</span></label>
      <label class="torrentToggle"><input id="torrentBlockSuspicious" type="checkbox" ${security.blockSuspiciousFiles ? "checked" : ""} /><span>Block suspicious files</span></label>
      ${textField("torrentQuarantine", "Quarantine folder", security.quarantineFolder || "C:\\BRMedia\\Quarantine")}

      <button class="torrentPrimaryBtn" id="btnSaveSecurity" type="button">${iconHtml("floppy-disk")} Save security</button>
    </section>
  `;
}

function renderProtocolsPanel() {
  const protocols = getSettings().protocols || {};
  const engine = torrentState.data.engine || {};

  return `
    <section class="torrentPanel">
      <div class="torrentPanelHead"><span>${iconHtml("network-wired")}</span><div><strong>Network protocols</strong><em>Magnet links, UPnP, NAT-PMP, PE, IPv6 and qBittorrent Web UI.</em></div></div>

      <div class="torrentEngineBox">
        <strong>${iconHtml("plug")} qBittorrent Web UI engine</strong>
        <p>Install qBittorrent on the PC, enable Web UI, then add the address and login here. BRMedia will use it for real torrent downloads.</p>
      </div>

      <div class="torrentProtocolRegisterBox">
        <span>${iconHtml("magnet")}</span>
        <div>
          <strong>Open magnet links in BRMedia</strong>
          <p>Registers this Torrents app as a magnet handler where the browser/OS allows it. If your current URL is not secure, use the manual Add page fallback.</p>
        </div>
        <div class="torrentProtocolRegisterActions">
          <button class="torrentPrimaryBtn" id="btnRegisterMagnetHandler" type="button">${iconHtml("link")} Register magnet links</button>
          <button class="torrentPrimaryBtn" id="btnOpenAddFallback" type="button">${iconHtml("clipboard")} Manual fallback</button>
        </div>
        ${torrentState.protocolHandlerStatus ? `<p class="torrentProtocolStatus">${escapeHtml(torrentState.protocolHandlerStatus)}</p>` : ""}
      </div>

      <label class="torrentToggle"><input id="torrentEngineEnabled" type="checkbox" ${engine.enabled ? "checked" : ""} /><span>Enable qBittorrent engine</span></label>

      <div class="torrentFormGrid">
        ${textField("torrentEngineUrl", "Web UI URL", engine.baseUrl || "http://127.0.0.1:8080")}
        ${textField("torrentEngineUser", "Username", engine.username || "")}
        ${passwordField("torrentEnginePass", "Password", engine.password === "••••••••" ? "" : (engine.password || ""))}
        ${textField("torrentEngineSavePath", "Save path", engine.savePath || "C:\\BRMedia\\Torrents\\Downloads")}
      </div>

      ${protocolToggle("torrentProtoMagnet", "Magnet links", protocols.magnetLinks)}
      ${protocolToggle("torrentProtoUpnp", "UPnP", protocols.upnp)}
      ${protocolToggle("torrentProtoNat", "NAT-PMP", protocols.natPmp)}
      ${protocolToggle("torrentProtoPe", "Protocol Encryption (PE)", protocols.protocolEncryption)}
      ${protocolToggle("torrentProtoIpv6", "IPv6 tunnelling", protocols.ipv6)}

      <div class="torrentButtonGrid">
        <button class="torrentPrimaryBtn" id="btnSaveProtocols" type="button">${iconHtml("floppy-disk")} Save engine / protocols</button>
        <button class="torrentPrimaryBtn" id="btnTestTorrentEngine" type="button">${iconHtml("plug-circle-check")} Test connection</button>
      </div>
    </section>
  `;
}

function numberField(id, label, value) {
  return `<label class="torrentField"><span>${escapeHtml(label)}</span><input id="${escapeHtml(id)}" type="number" min="0" value="${escapeHtml(String(value ?? 0))}" /></label>`;
}

function textField(id, label, value) {
  return `<label class="torrentField"><span>${escapeHtml(label)}</span><input id="${escapeHtml(id)}" type="text" value="${escapeHtml(value ?? "")}" /></label>`;
}

function passwordField(id, label, value) {
  return `<label class="torrentField"><span>${escapeHtml(label)}</span><input id="${escapeHtml(id)}" type="password" autocomplete="current-password" value="${escapeHtml(value ?? "")}" /></label>`;
}

function protocolToggle(id, label, checked) {
  return `<label class="torrentToggle"><input id="${escapeHtml(id)}" type="checkbox" ${checked !== false ? "checked" : ""} /><span>${escapeHtml(label)}</span></label>`;
}

function renderActivePanel() {
  if (torrentState.activeTab === "overview") return renderOverviewPanel();
  if (torrentState.activeTab === "completed") return renderCompletedPanel();
  if (torrentState.activeTab === "files") return renderFilesPanel();
  if (torrentState.activeTab === "pieces") return renderPiecesPanel();
  if (torrentState.activeTab === "speed-graph") return renderSpeedGraphPanel();
  if (torrentState.activeTab === "trackers") return renderTrackersPanel();
  if (torrentState.activeTab === "peers") return renderPeersPanel();
  if (torrentState.activeTab === "scan-history") return renderScanHistoryPanel();
  if (torrentState.activeTab === "notifications") return renderNotificationsPanel();

  if (TORRENT_MODULE_SETTINGS_TABS.has(torrentState.activeTab)) {
    window.location.href =
      `/settings?module=torrents&tab=${encodeURIComponent(torrentState.activeTab)}`;

    return "";
  }

  if (torrentState.activeTab === "add") return renderAddPanel();
  if (torrentState.activeTab === "bandwidth") return renderBandwidthPanel();
  if (torrentState.activeTab === "scheduler") return renderSchedulerPanel();
  if (torrentState.activeTab === "health") return renderHealthPanel();
  if (torrentState.activeTab === "cache") return renderCachePanel();
  if (torrentState.activeTab === "security") return renderSecurityPanel();
  if (torrentState.activeTab === "protocols") return renderProtocolsPanel();

  return renderQueue();
}

function renderTorrents() {
  if (!torrentRoot) return;

  const previousTabsScroll = Number(torrentState.tabsScrollLeft || 0);

  torrentRoot.innerHTML = `
    ${renderTabs()}
    ${torrentState.loading ? `<section class="torrentPanel"><div class="torrentEmpty">${iconHtml("spinner")}<strong>Loading torrents…</strong></div></section>` : `${renderSectionIntro()}${renderTorrentToast()}<div id="torrentActivePanel">${renderActivePanel()}</div>`}
  `;

  bindTorrentEvents();
  hydrateIcons(torrentRoot);

  const tabs = torrentRoot.querySelector(".torrentTabs");
  if (tabs) {
    tabs.scrollLeft = previousTabsScroll;
    requestAnimationFrame(() => {
      tabs.scrollLeft = previousTabsScroll;
    });
  }
}

function bindTorrentEvents() {
  const tabs = torrentRoot.querySelector(".torrentTabs");
  if (tabs) {
    tabs.onscroll = () => {
      torrentState.tabsScrollLeft = tabs.scrollLeft;
    };
  }

  torrentRoot.querySelectorAll("[data-torrent-tab]").forEach((button) => {
    button.onclick = () => {
      const tabStrip = button.closest(".torrentTabs");
      torrentState.tabsScrollLeft = tabStrip ? tabStrip.scrollLeft : torrentState.tabsScrollLeft;
      torrentState.activeTab = button.dataset.torrentTab || "overview";
      renderTorrents();
      scheduleTorrentUiRefresh();
    };
  });

  torrentRoot.querySelectorAll("[data-torrent-tab-go]").forEach((button) => {
    button.onclick = () => {
      torrentState.activeTab = button.dataset.torrentTabGo || "queue";
      renderTorrents();
      scheduleTorrentUiRefresh();
    };
  });

  const queueSearch = $("torrentQueueSearch");
  if (queueSearch) {
    queueSearch.oninput = (event) => {
      torrentState.queueSearch = event.target?.value || "";
      renderTorrentActivePanelOnly();
    };
  }

  torrentRoot.querySelectorAll("[data-torrent-filter]").forEach((button) => {
    button.onclick = () => {
      torrentState.queueFilter = button.dataset.torrentFilter || "all";
      renderTorrentActivePanelOnly();
    };
  });

  torrentRoot.querySelectorAll("[data-torrent-refresh]").forEach((button) => {
    button.onclick = () => {
      void loadTorrentState({ panelOnly: true });
    };
  });

  $("btnAddTorrent")?.addEventListener("click", addTorrentFromForm);
  $("btnUploadTorrentFile")?.addEventListener("click", uploadTorrentFilesFromInput);
  $("btnTestTorrentEngine")?.addEventListener("click", testTorrentEngine);
  $("btnRegisterMagnetHandler")?.addEventListener("click", registerTorrentProtocolHandlers);
  $("btnOpenAddFallback")?.addEventListener("click", openTorrentAddWithClipboardFallback);

  torrentRoot.querySelectorAll("[data-torrent-open-files]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.torrentOpenFiles || "";
      const item = getItems().find((entry) => String(entry.id) === String(id) || String(entry.hash) === String(id));
      void openTorrentFiles(item || { id });
    });
  });

  torrentRoot.querySelectorAll("[data-torrent-open-pieces]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.torrentOpenPieces || "";
      const item = getItems().find((entry) => String(entry.id) === String(id) || String(entry.hash) === String(id));
      void openTorrentPieces(item || { id });
    });
  });

  torrentRoot.querySelectorAll("[data-torrent-pieces-refresh]").forEach((button) => {
    button.addEventListener("click", () => {
      torrentState.activeTab = "pieces";
      void loadTorrentPieces();
    });
  });

  torrentRoot.querySelectorAll("[data-torrent-files-refresh]").forEach((button) => {
    button.addEventListener("click", () => {
      void loadTorrentFiles();
    });
  });

  torrentRoot.querySelectorAll("[data-torrent-file-select]").forEach((input) => {
    input.addEventListener("change", () => {
      setTorrentFileSelected(
        input.dataset.torrentFileSelect || "",
        !!input.checked
      );

      renderTorrentActivePanelOnly();
    });
  });

  torrentRoot.querySelectorAll("[data-torrent-file-select-all]").forEach((button) => {
    button.addEventListener("click", () => selectTorrentFiles("all"));
  });

  torrentRoot.querySelectorAll("[data-torrent-file-select-complete]").forEach((button) => {
    button.addEventListener("click", () => selectTorrentFiles("complete"));
  });

  torrentRoot.querySelectorAll("[data-torrent-file-select-none]").forEach((button) => {
    button.addEventListener("click", () => selectTorrentFiles("none"));
  });

  torrentRoot.querySelectorAll("[data-torrent-files-bulk-priority]").forEach((button) => {
    button.addEventListener("click", () => {
      void setSelectedTorrentFilePriority(
        button.dataset.torrentFilesBulkPriority || "normal"
      );
    });
  });

  torrentRoot.querySelectorAll("[data-torrent-files-bulk-library]").forEach((button) => {
    button.addEventListener("click", () => {
      void handoffSelectedTorrentFiles(
        button.dataset.torrentFilesBulkLibrary || ""
      );
    });
  });

  torrentRoot.querySelectorAll("[data-torrent-files-quarantine]").forEach((button) => {
    button.addEventListener("click", () => {
      void quarantineSelectedTorrentFiles();
    });
  });

  torrentRoot.querySelectorAll("[data-torrent-open-folder]").forEach((button) => {
    button.addEventListener("click", () => {
      void openCurrentTorrentFolder(
        button.dataset.torrentOpenFolder || ""
      );
    });
  });

  torrentRoot.querySelectorAll("[data-torrent-scan-downloads]").forEach((button) => {
    button.addEventListener("click", () => {
      void scanCurrentTorrentDownloads(
        button.dataset.torrentScanDownloads || ""
      );
    });
  });

  torrentRoot.querySelectorAll("[data-torrent-open-trackers]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.torrentOpenTrackers || "";

      const item = getTorrentById(id) || {
        id,
        hash: id,
        name: torrentState.selectedTorrentName,
      };

      void openTorrentTrackers(item);
    });
  });

  torrentRoot.querySelectorAll("[data-torrent-open-peers]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.torrentOpenPeers || "";

      const item = getTorrentById(id) || {
        id,
        hash: id,
        name: torrentState.selectedTorrentName,
      };

      void openTorrentPeers(item);
    });
  });

  torrentRoot.querySelectorAll("[data-torrent-trackers-refresh]").forEach((button) => {
    button.addEventListener("click", () => {
      void loadTorrentTrackers();
    });
  });

  torrentRoot.querySelectorAll("[data-torrent-peers-refresh]").forEach((button) => {
    button.addEventListener("click", () => {
      void loadTorrentPeers();
    });
  });

  torrentRoot.querySelectorAll("[data-torrent-enable-browser-alerts]").forEach((button) => {
    button.addEventListener("click", () => {
      void enableTorrentBrowserAlerts();
    });
  });

  torrentRoot.querySelectorAll("[data-torrent-disable-browser-alerts]").forEach((button) => {
    button.addEventListener("click", disableTorrentBrowserAlerts);
  });

  torrentRoot.querySelectorAll("[data-torrent-file-priority]").forEach((button) => {
    button.addEventListener("click", () => {
      void setTorrentFilePriority(button.dataset.torrentFilePriority || "", button.dataset.priority || "normal");
    });
  });

  torrentRoot.querySelectorAll("[data-torrent-file-toggle]").forEach((input) => {
    input.addEventListener("change", () => {
      void setTorrentFilePriority(input.dataset.torrentFileToggle || "", input.checked ? "normal" : "skip");
    });
  });

  torrentRoot.querySelectorAll("[data-torrent-file-library]").forEach((button) => {
    button.addEventListener("click", () => {
      void handoffTorrentFile(button.dataset.torrentFileLibrary || "", button.dataset.target || "");
    });
  });

  torrentRoot.querySelectorAll("[data-torrent-transfer-clear]").forEach((button) => {
    button.addEventListener("click", () => {
      if (torrentState.transferPollTimer) window.clearTimeout(torrentState.transferPollTimer);
      torrentState.transferPollTimer = null;
      torrentState.transferJob = null;
      renderTorrentActivePanelOnly();
    });
  });

  torrentRoot.querySelectorAll("[data-torrent-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.torrentAction || "";
      const id = button.dataset.id || "";
      const priority = button.dataset.priority || "normal";

      if (action === "remove-delete" && !window.confirm("Delete the torrent AND the downloaded files from disk?")) {
        return;
      }

      void updateTorrentAction(id, action, { priority });
    });
  });

  const saveBandwidth = (applyToEngine = false) => {
    void saveTorrentSettings({
      applyToEngine,
      bandwidth: {
        downloadLimitKb: Number($("torrentDownloadLimit")?.value || 0),
        uploadLimitKb: Number($("torrentUploadLimit")?.value || 0),
        slowModeDownloadKb: Number($("torrentSlowDownload")?.value || 0),
        slowModeUploadKb: Number($("torrentSlowUpload")?.value || 0),
      },
    });
  };

  $("btnSaveBandwidth")?.addEventListener("click", () => saveBandwidth(false));
  $("btnApplyEngineBandwidth")?.addEventListener("click", () => saveBandwidth(true));

  $("btnSaveScheduler")?.addEventListener("click", () => {
    void saveTorrentSettings({
      applyToEngine: true,
      scheduler: {
        enabled: !!$("torrentScheduleEnabled")?.checked,
        mode: "download-and-seed",
        windows: [{
          day: $("torrentScheduleDay")?.value || "Mon-Fri",
          start: $("torrentScheduleStart")?.value || "00:00",
          end: $("torrentScheduleEnd")?.value || "07:00",
        }],
      },
    });
  });

  $("btnSaveCache")?.addEventListener("click", () => {
    void saveTorrentSettings({
      applyToEngine: true,
      cache: {
        enabled: !!$("torrentCacheEnabled")?.checked,
        writeCoalesce: !!$("torrentCacheCoalesce")?.checked,
        reduceDiskWear: !!$("torrentCacheWear")?.checked,
        sizeMb: Number($("torrentCacheSize")?.value || 512),
      },
    });
  });

  $("btnSaveSecurity")?.addEventListener("click", () => {
    void saveTorrentSettings({
      security: {
        scanTorrentFiles: !!$("torrentScanFiles")?.checked,
        scanDownloadedFiles: !!$("torrentScanDownloads")?.checked,
        blockSuspiciousFiles: !!$("torrentBlockSuspicious")?.checked,
        quarantineFolder: $("torrentQuarantine")?.value || "C:\\BRMedia\\Quarantine",
      },
    });
  });

  $("btnSaveProtocols")?.addEventListener("click", () => {
    void saveTorrentSettings({
      applyToEngine: true,
      engine: {
        enabled: !!$("torrentEngineEnabled")?.checked,
        baseUrl: $("torrentEngineUrl")?.value || "http://127.0.0.1:8080",
        username: $("torrentEngineUser")?.value || "",
        password: $("torrentEnginePass")?.value || "",
        savePath: $("torrentEngineSavePath")?.value || "C:\\BRMedia\\Torrents\\Downloads",
      },
      protocols: {
        magnetLinks: !!$("torrentProtoMagnet")?.checked,
        upnp: !!$("torrentProtoUpnp")?.checked,
        natPmp: !!$("torrentProtoNat")?.checked,
        protocolEncryption: !!$("torrentProtoPe")?.checked,
        ipv6: !!$("torrentProtoIpv6")?.checked,
      },
    });
  });
}

function openSidebar() {
  document.body.classList.add("sidebarOpen");
  sidebar?.classList.remove("hidden");
  sidebarBackdrop?.classList.remove("hidden");
  sidebarClose?.classList.remove("hidden");
}

function closeSidebar() {
  document.body.classList.remove("sidebarOpen");
  sidebar?.classList.add("hidden");
  sidebarBackdrop?.classList.add("hidden");
  sidebarClose?.classList.add("hidden");
}

function bindShell() {
  $("btnModuleMenu")?.addEventListener("click", openSidebar);
  sidebarBackdrop?.addEventListener("click", closeSidebar);
  sidebarClose?.addEventListener("click", closeSidebar);

  document.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => {
      const route = button.dataset.route || "/";
      window.location.href = route;
    });
  });

  const nav = $("torrentSectionNav");
  if (nav) {
    nav.insertAdjacentHTML("beforeend", torrentSections.map((section) => `
      <button class="sidebarNavBtn" data-section="${escapeHtml(section.key)}" type="button">
        <span class="sidebarNavIconBadge">${iconHtml(section.icon)}</span>
        <span class="sidebarNavText">
          <span class="sidebarNavBtnTitle">${escapeHtml(section.title)}</span>
          <span class="sidebarNavBtnSub">${escapeHtml(section.menuSub || section.sub)}</span>
        </span>
      </button>
    `).join(""));

    nav.querySelectorAll("[data-section]").forEach((button) => {
      button.addEventListener("click", () => {
        torrentState.activeTab = button.dataset.section || "queue";
        closeSidebar();
        renderTorrents();
        scheduleTorrentUiRefresh();
      });
    });
  }

  hydrateIcons(document);
}

let torrentUiRefreshTimer = 0;

function scheduleTorrentUiRefresh() {
  window.clearTimeout(torrentUiRefreshTimer);
  const graphSeconds = Math.max(5, Math.min(60, Number(getSettings().ui?.speedGraphSampleIntervalSec || 5)));
  torrentUiRefreshTimer = window.setTimeout(async () => {
    if (document.visibilityState === "visible") await loadTorrentState({ panelOnly: true, autoRefresh: true });
    scheduleTorrentUiRefresh();
  }, torrentState.activeTab === "speed-graph" ? graphSeconds * 1000 : 30000);
}

bindShell();
void loadTorrentState().finally(() => scheduleTorrentUiRefresh());
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") scheduleTorrentUiRefresh(); });