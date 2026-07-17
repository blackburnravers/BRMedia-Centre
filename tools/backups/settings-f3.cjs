const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const serverRoot = fs.existsSync(path.join(projectRoot, "server", "public"))
  ? path.join(projectRoot, "server")
  : projectRoot;
const publicDir = path.join(serverRoot, "public");
const outDir = path.join(publicDir, "server-settings");
const backupDir = path.join(projectRoot, "tools", "backups", "server-settings-before-f3");

if (!fs.existsSync(publicDir)) {
  throw new Error("Could not find server/public. Run this from BRMedia-Centre root.");
}

function writeServerSettingsFile(fileName, content) {
  const outPath = path.join(outDir, fileName);
  if (fs.existsSync(outPath)) {
    fs.mkdirSync(backupDir, { recursive: true });
    fs.copyFileSync(outPath, path.join(backupDir, fileName));
  }
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, content, "utf8");
}

writeServerSettingsFile("index.html", String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>BRMedia Server Settings</title>
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#182E5B" />
  <link rel="apple-touch-icon" sizes="180x180" href="/home/apple-touch-icon.png?v=20260505" />
  <link rel="icon" type="image/png" sizes="192x192" href="/home/icon-192.png?v=20260505" />
  <link rel="icon" type="image/png" sizes="512x512" href="/home/icon-512.png?v=20260505" />
  <link rel="manifest" href="/server-settings/site.webmanifest?v=20260510-f3" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="Server" />
  <link rel="stylesheet" href="/shared/shell.css?v=20260509-split-a" />
  <link rel="stylesheet" href="/shared/module-theme.css?v=20260509-split-a" />
  <link rel="stylesheet" href="/server-settings/styles.css?v=20260510-f3" />
</head>
<body class="brSharedBody serverSettingsBody">
  <div class="brSharedShell serverSettingsShell">
    <header class="brSharedTopbar">
      <div class="brSharedTopbarInner">
        <a class="brSharedIconBtn" href="/settings" aria-label="Open Universal Settings">?</a>
        <img class="brSharedLogo" src="/home/blackburn-ravers-header.png" alt="Blackburn Ravers" />
        <button class="brSharedIconBtn" type="button" aria-label="Open BRMedia menu" data-br-shared-menu>?</button>
      </div>
    </header>

    <div class="brSharedBackdrop" data-br-shared-backdrop></div>
    <aside class="brSharedSidebar" data-br-shared-sidebar>
      <div class="brSharedSidebarHead">
        <div class="brSharedSidebarTitle">BRMedia Centre</div>
        <button class="brSharedIconBtn" type="button" aria-label="Close menu" data-br-shared-close>×</button>
      </div>
      <nav class="brSharedNav" data-br-shared-nav aria-label="BRMedia modules"></nav>
    </aside>

    <main class="brSharedMain serverSettingsMain">
      <section class="serverHero">
        <div>
          <div class="brSharedEyebrow">Server Settings</div>
          <h1>Server Control Room</h1>
          <p>Admin setup for sources, storage, cloud keys, networking and safety. Universal Settings stays separate for module/user preferences.</p>
          <div class="serverHeroActions">
            <a class="serverBtn primary" href="/settings">Universal Settings</a>
            <a class="serverBtn" href="/player">Open Player</a>
          </div>
        </div>
        <div class="serverHealthGrid">
          <div class="serverHealthCard"><span>Server</span><strong id="serverHealthStatus">Checking…</strong><small id="serverHealthBody">Reading /health</small></div>
          <div class="serverHealthCard"><span>Audio</span><strong id="serverLibraryCount">—</strong><small>Items in /library</small></div>
          <div class="serverHealthCard"><span>Video</span><strong id="serverVideoCount">—</strong><small>Items in /video-library</small></div>
        </div>
      </section>

      <section class="serverDashboard">
        <aside class="serverRail" aria-label="Server settings tabs">
          <button class="serverTab is-active" type="button" data-server-tab="sources"><span>SRC</span><strong>Sources</strong><small>Audio/video folders</small></button>
          <button class="serverTab" type="button" data-server-tab="cloud"><span>CLD</span><strong>Cloud OAuth</strong><small>Drive + Dropbox</small></button>
          <button class="serverTab" type="button" data-server-tab="storage"><span>DAT</span><strong>Storage</strong><small>Data files + cache</small></button>
          <button class="serverTab" type="button" data-server-tab="network"><span>NET</span><strong>Network</strong><small>Local + Tailscale</small></button>
          <button class="serverTab" type="button" data-server-tab="maintenance"><span>CHK</span><strong>Maintenance</strong><small>Checks + safety</small></button>
        </aside>
        <section class="serverWorkspace">
          <div class="serverWorkspaceHead">
            <div>
              <div class="serverKicker" id="serverActiveKicker">Sources</div>
              <h2 id="serverActiveTitle">Source folders</h2>
              <p id="serverActiveSummary">C:\DJMixes and C:\Videos are the server-side roots used by BRMedia modules.</p>
            </div>
          </div>
          <div id="serverActivePanel" class="serverActivePanel"></div>
        </section>
      </section>
    </main>
  </div>

  <script src="/shared/nav.js?v=20260509-split-a"></script>
  <script src="/shared/source-manager.js?v=20260510-f3"></script>
  <script src="/shared/shell.js?v=20260509-split-a"></script>
  <script src="/server-settings/app.js?v=20260510-f3"></script>
</body>
</html>
`);

writeServerSettingsFile("app.js", String.raw`(function () {
  const activeKicker = document.getElementById("serverActiveKicker");
  const activeTitle = document.getElementById("serverActiveTitle");
  const activeSummary = document.getElementById("serverActiveSummary");
  const activePanel = document.getElementById("serverActivePanel");
  const serverHealthStatus = document.getElementById("serverHealthStatus");
  const serverHealthBody = document.getElementById("serverHealthBody");
  const serverLibraryCount = document.getElementById("serverLibraryCount");
  const serverVideoCount = document.getElementById("serverVideoCount");

  const tabs = {
    sources: { title: "Source folders", summary: "C:\\DJMixes and C:\\Videos are the server-side roots used by BRMedia modules." },
    cloud: { title: "Cloud OAuth", summary: "Google Drive and Dropbox keys live in .env and tokens stay private in server/data." },
    storage: { title: "Storage + data", summary: "Important BRMedia data files, caches and private token warnings." },
    network: { title: "Network", summary: "Localhost, Tailscale and phone access reminders." },
    maintenance: { title: "Maintenance", summary: "Useful checks before and after patches." }
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
    });
  }

  async function getJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(data && data.error ? data.error : url + " failed");
    return data;
  }

  function sourceCards() {
    const fallback = [
      { id: "local-audio", label: "Local Audio Folder", kind: "folder", path: "C:\\DJMixes", detail: "Music, mixes and audio outputs", env: "BRMEDIA_AUDIO_DIRS" },
      { id: "local-video", label: "Local Video Folder", kind: "folder", path: "C:\\Videos", detail: "Video library source", env: "BRMEDIA_VIDEO_DIRS" }
    ];
    const sources = (window.BRMediaShared && window.BRMediaShared.sources && window.BRMediaShared.sources.getSources)
      ? window.BRMediaShared.sources.getSources()
      : fallback;

    return sources.map(function (source) {
      return '<div class="serverInfoCard">' +
        '<span>' + escapeHtml(source.kind || "source") + '</span>' +
        '<strong>' + escapeHtml(source.label || source.id || "Source") + '</strong>' +
        '<small>' + escapeHtml(source.detail || source.path || "Shared source") + '</small>' +
        (source.path ? '<code>' + escapeHtml(source.path) + '</code>' : '') +
        (source.env ? '<em>Env: ' + escapeHtml(source.env) + '</em>' : '') +
      '</div>';
    }).join('');
  }

  function renderSources() {
    return '<div class="serverCardGrid">' + sourceCards() + '</div>' +
      '<div class="serverNoteCard">' +
        '<strong>Current intended .env source setup</strong>' +
        '<code>BRMEDIA_AUDIO_DIRS=C:\\DJMixes</code>' +
        '<code>BRMEDIA_VIDEO_DIRS=C:\\Videos</code>' +
        '<code>LOCAL_ALLOWED_BASES=C:\\DJMixes;C:\\Videos</code>' +
        '<small>Universal Settings can store local UI preferences. Server-side source changes still belong here / in .env until backend config writing is added.</small>' +
      '</div>';
  }

  function renderCloud() {
    return '<div class="serverCardGrid">' +
      '<div class="serverInfoCard"><span>GDR</span><strong>Google Drive</strong><small>Drive imports should request offline access and store refresh tokens safely.</small><code>GOOGLE_DRIVE_CLIENT_ID</code><code>GOOGLE_DRIVE_CLIENT_SECRET</code><code>GOOGLE_DRIVE_REDIRECT_URI</code></div>' +
      '<div class="serverInfoCard"><span>DBX</span><strong>Dropbox</strong><small>Dropbox imports use the same local-copy-before-editing rule.</small><code>DROPBOX_APP_KEY</code><code>DROPBOX_APP_SECRET</code><code>DROPBOX_REDIRECT_URI</code></div>' +
      '<div class="serverInfoCard"><span>URL</span><strong>Direct URL imports</strong><small>Lawful direct media only. No stream ripping or premium host bypass.</small><code>LINK_IMPORT_DIR=C:\\DJMixes\\Link Imports</code></div>' +
    '</div>' +
    '<div class="serverButtonRow"><a class="serverBtn" href="/settings?tab=google-drive">Drive settings</a><a class="serverBtn" href="/settings?tab=dropbox">Dropbox settings</a><a class="serverBtn" href="/settings?tab=import">Import settings</a></div>';
  }

  function renderStorage() {
    return '<div class="serverCardGrid">' +
      '<div class="serverInfoCard warn"><span>KEY</span><strong>Private files</strong><small>Do not share these publicly.</small><code>server/.env</code><code>server/data/cloud-accounts.json</code></div>' +
      '<div class="serverInfoCard"><span>TAG</span><strong>BRMedia custom tags</strong><small>Tagger/player category source of truth later.</small><code>server/data/brmedia-custom-tags.json</code></div>' +
      '<div class="serverInfoCard"><span>PLY</span><strong>Player runtime</strong><small>Resume state and current player state.</small><code>server/data/player-runtime-state.json</code></div>' +
      '<div class="serverInfoCard"><span>VID</span><strong>Video metadata cache</strong><small>TMDb/OMDb cached metadata and poster info.</small><code>server/data/video-metadata-cache.json</code></div>' +
    '</div>';
  }

  function renderNetwork() {
    return '<div class="serverCardGrid">' +
      '<div class="serverInfoCard"><span>LOC</span><strong>Local PC</strong><small>Main test URL on the server machine.</small><code>http://localhost:8787/</code><code>http://localhost:8787/player</code></div>' +
      '<div class="serverInfoCard"><span>TS</span><strong>Tailscale phone access</strong><small>Use your Tailscale IP from phone/tablet.</small><code>http://100.77.93.81:8787/player</code><code>http://100.77.93.81:8787/video-player</code></div>' +
      '<div class="serverInfoCard"><span>PORT</span><strong>Server port</strong><small>Current default BRMedia server port.</small><code>8787</code></div>' +
    '</div>';
  }

  function renderMaintenance() {
    return '<div class="serverNoteCard">' +
      '<strong>Patch checks</strong>' +
      '<code>node --check server\\public\\tagger\\app.js</code>' +
      '<code>node --check server\\public\\converter\\app.js</code>' +
      '<code>node --check server\\public\\mastering\\app.js</code>' +
      '<code>node --check server\\public\\video-player\\app.js</code>' +
      '<code>npm run server:dev</code>' +
    '</div>' +
    '<div class="serverNoteCard warn"><strong>Before sharing a zip</strong><small>Remove or protect private key/token files. The project code can be shared; .env and cloud-accounts.json should not be public.</small></div>';
  }

  function renderTab(tabId) {
    const id = tabId || "sources";
    const tab = tabs[id] || tabs.sources;
    if (activeKicker) activeKicker.textContent = id;
    if (activeTitle) activeTitle.textContent = tab.title;
    if (activeSummary) activeSummary.textContent = tab.summary;

    document.querySelectorAll("[data-server-tab]").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-server-tab") === id);
    });

    if (!activePanel) return;
    if (id === "cloud") activePanel.innerHTML = renderCloud();
    else if (id === "storage") activePanel.innerHTML = renderStorage();
    else if (id === "network") activePanel.innerHTML = renderNetwork();
    else if (id === "maintenance") activePanel.innerHTML = renderMaintenance();
    else activePanel.innerHTML = renderSources();
  }

  async function refreshHealth() {
    try {
      const health = await getJson("/health");
      if (serverHealthStatus) serverHealthStatus.textContent = health && health.ok === true ? "Online" : "Running";
      if (serverHealthBody) serverHealthBody.textContent = "Port " + ((health && health.port) || 8787);
    } catch (err) {
      if (serverHealthStatus) serverHealthStatus.textContent = "Check failed";
      if (serverHealthBody) serverHealthBody.textContent = err && err.message ? err.message : "Could not read /health";
    }

    try {
      const library = await getJson("/library");
      const items = Array.isArray(library && library.items) ? library.items : Array.isArray(library) ? library : [];
      if (serverLibraryCount) serverLibraryCount.textContent = String(items.length);
    } catch { if (serverLibraryCount) serverLibraryCount.textContent = "—"; }

    try {
      const video = await getJson("/video-library");
      const items = Array.isArray(video && video.items) ? video.items : Array.isArray(video) ? video : [];
      if (serverVideoCount) serverVideoCount.textContent = String(items.length);
    } catch { if (serverVideoCount) serverVideoCount.textContent = "—"; }
  }

  document.querySelectorAll("[data-server-tab]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const tab = btn.getAttribute("data-server-tab") || "sources";
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      history.replaceState(null, "", url);
      renderTab(tab);
    });
  });

  const initial = new URLSearchParams(window.location.search || "").get("tab") || "sources";
  renderTab(initial);
  void refreshHealth();
})();
`);

writeServerSettingsFile("styles.css", String.raw`/* BRMedia Server Settings F3 */
.serverSettingsMain { width: min(1180px, calc(100% - 24px)); }

.serverHero,
.serverDashboard {
  border: 1px solid var(--br-border);
  border-radius: 30px;
  background:
    radial-gradient(circle at 10% 0%, rgba(255,159,28,0.14), transparent 32rem),
    rgba(11,24,50,0.78);
  box-shadow: 0 24px 70px rgba(0,0,0,0.32);
}

.serverHero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 420px);
  gap: 18px;
  padding: clamp(20px, 4vw, 34px);
  margin-bottom: 16px;
}

.serverHero h1 {
  margin: 8px 0 10px;
  font-size: clamp(34px, 8vw, 72px);
  line-height: 0.9;
  letter-spacing: -0.06em;
}

.serverHero p { max-width: 680px; margin: 0; color: var(--br-muted); line-height: 1.5; font-size: 16px; }
.serverHeroActions,
.serverButtonRow { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
.serverBtn { border: 1px solid rgba(255,255,255,0.14); border-radius: 999px; padding: 12px 15px; color: var(--br-text); background: rgba(255,255,255,0.08); text-decoration: none; font-weight: 900; cursor: pointer; }
.serverBtn.primary { color: #08152f; border-color: rgba(255,159,28,0.68); background: linear-gradient(180deg, #ffbd45, var(--br-orange)); }

.serverHealthGrid,
.serverCardGrid,
.serverActivePanel { display: grid; gap: 12px; }
.serverHealthCard,
.serverInfoCard,
.serverNoteCard {
  border: 1px solid rgba(255,255,255,0.13);
  border-radius: 22px;
  padding: 15px;
  background: rgba(255,255,255,0.07);
  color: var(--br-text);
}
.serverHealthCard span,
.serverInfoCard span,
.serverKicker { color: var(--br-orange); text-transform: uppercase; letter-spacing: 0.12em; font-size: 11px; font-weight: 900; }
.serverHealthCard strong,
.serverInfoCard strong,
.serverNoteCard strong { display: block; margin: 5px 0; font-size: 18px; }
.serverHealthCard small,
.serverInfoCard small,
.serverNoteCard small,
.serverInfoCard em { display: block; color: var(--br-muted); line-height: 1.35; font-style: normal; }
.serverInfoCard.warn,
.serverNoteCard.warn { border-color: rgba(255,88,88,0.32); background: rgba(255,88,88,0.07); }

.serverDashboard { display: grid; grid-template-columns: 300px minmax(0, 1fr); overflow: hidden; }
.serverRail { display: grid; align-content: start; gap: 9px; border-right: 1px solid var(--br-border); padding: 16px; background: rgba(0,0,0,0.14); }
.serverTab { display: grid; grid-template-columns: 42px 1fr; gap: 10px; align-items: center; min-height: 58px; padding: 9px; border: 1px solid rgba(255,255,255,0.12); border-radius: 18px; color: var(--br-text); background: rgba(255,255,255,0.06); text-align: left; font: inherit; }
.serverTab.is-active { border-color: rgba(255,159,28,0.72); background: rgba(255,159,28,0.14); }
.serverTab span { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 15px; color: var(--br-orange); background: rgba(255,255,255,0.08); font-size: 11px; font-weight: 1000; letter-spacing: 0.08em; }
.serverTab strong { display: block; font-weight: 900; }
.serverTab small { display: block; margin-top: 2px; color: var(--br-muted); font-size: 11px; }

.serverWorkspace { padding: 18px; }
.serverWorkspaceHead { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; margin-bottom: 16px; }
.serverWorkspaceHead h2 { margin: 4px 0 5px; font-size: clamp(28px, 5vw, 44px); line-height: 0.95; letter-spacing: -0.04em; }
.serverWorkspaceHead p { margin: 0; color: var(--br-muted); line-height: 1.45; }
.serverCardGrid { grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); }
.serverInfoCard code,
.serverNoteCard code { display: block; margin-top: 8px; border: 1px solid rgba(255,255,255,0.11); border-radius: 12px; padding: 8px 9px; color: #d9e8ff; background: rgba(0,0,0,0.18); white-space: normal; word-break: break-word; }

@media (max-width: 820px) {
  .serverHero,
  .serverDashboard { grid-template-columns: 1fr; }
  .serverRail { border-right: 0; border-bottom: 1px solid var(--br-border); grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 520px) {
  .serverSettingsMain { width: min(100% - 18px, 1180px); }
  .serverHero,
  .serverWorkspace,
  .serverRail { padding: 14px; }
  .serverRail,
  .serverCardGrid { grid-template-columns: 1fr; }
}
`);

console.log("BRMedia Patch F3 complete.");
console.log("Created dedicated server/public/server-settings page.");
console.log(`Backups saved to ${path.relative(projectRoot, backupDir)}`);