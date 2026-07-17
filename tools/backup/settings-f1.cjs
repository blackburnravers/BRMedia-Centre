const fs = require("fs");
const path = require("path");

const root = process.cwd();
const backupDir = path.join(root, "tools", "backups", "settings-before-f1");

const files = {
  "server/public/shared/settings-schema.js": `(function () {
  const settingsTabs = [
    { id: "general", label: "General", icon: "⌁", summary: "Branding, app behaviour and shared UI.", section: "Core" },
    { id: "player", label: "Player", icon: "♫", summary: "Music player defaults, resume and mini player behaviour.", section: "Modules" },
    { id: "video", label: "Video Player", icon: "▻", summary: "Video library, subtitles, playback and watch page defaults.", section: "Modules" },
    { id: "converter", label: "Converter", icon: "↔", summary: "Default formats, quality, output names and queue behaviour.", section: "Modules" },
    { id: "tagger", label: "Tagger", icon: "#", summary: "Metadata, artwork and BRMedia custom tag defaults.", section: "Modules" },
    { id: "mastering", label: "Mastering", icon: "≋", summary: "Loudness targets, presets, render defaults and output handling.", section: "Modules" },
    { id: "devices", label: "Devices", icon: "◈", summary: "Phone names, Send to Device, handoff and local network helpers.", section: "Sharing" },
    { id: "backup", label: "Backup", icon: "▤", summary: "Export, restore and recovery planning.", section: "Safety" },
    { id: "google-drive", label: "Google Drive", icon: "G", summary: "Connected Drive accounts, imports and reconnect status.", section: "Cloud" },
    { id: "dropbox", label: "Dropbox", icon: "D", summary: "Connected Dropbox accounts, imports and reconnect status.", section: "Cloud" },
    { id: "import", label: "Import / Direct URL", icon: "↧", summary: "Direct links, lawful imports and saved source links.", section: "Cloud" },
    { id: "sources", label: "Source folders", icon: "▣", summary: "C:\\\\DJMixes, C:\\\\Videos and shared local source rules.", section: "Sources" },
    { id: "server", label: "Server", icon: "▦", summary: "Jump to deeper server/admin settings without mixing the two pages.", section: "Admin" },
  ];

  const moduleCards = [
    { id: "player", label: "Player", href: "/player", body: "Audio player, playlists, timestamps and library." },
    { id: "video", label: "Video Player", href: "/video-player", body: "Films, poster wall and watch page." },
    { id: "converter", label: "Converter", href: "/converter", body: "Audio/video conversion and outputs." },
    { id: "tagger", label: "Tagger", href: "/tagger", body: "Metadata, artwork and BRMedia tags." },
    { id: "mastering", label: "Mastering", href: "/mastering", body: "Loudness, polish and mastered copies." },
    { id: "stats", label: "Stats", href: "/stats", body: "History, reports and usage later." },
  ];

  window.BRMediaShared = window.BRMediaShared || {};
  window.BRMediaShared.settingsSchema = { settingsTabs, moduleCards };
})();
`,

  "server/public/shared/source-manager.js": `(function () {
  const STORAGE_KEY = "brmedia_shared_sources_v1";

  const defaultSources = [
    { id: "library", label: "BRMedia Library", kind: "library", detail: "Server library index", localRequiredForWrite: false, editable: false },
    { id: "device-upload", label: "Device Upload", kind: "upload", detail: "Phone/PC upload into module workflows", localRequiredForWrite: true, editable: false },
    { id: "google-drive", label: "Google Drive", kind: "cloud", detail: "Import local copy before editing/rendering", localRequiredForWrite: true, editable: false },
    { id: "dropbox", label: "Dropbox", kind: "cloud", detail: "Import local copy before editing/rendering", localRequiredForWrite: true, editable: false },
    { id: "direct-url", label: "Direct URL", kind: "import", detail: "Lawful direct media imports only", localRequiredForWrite: true, editable: false },
    { id: "local-audio", label: "Local Audio Folder", kind: "folder", path: "C:\\\\DJMixes", detail: "Music, mixes and audio outputs", localRequiredForWrite: false, editable: true },
    { id: "local-video", label: "Local Video Folder", kind: "folder", path: "C:\\\\Videos", detail: "Video library source", localRequiredForWrite: false, editable: true },
  ];

  function readOverrides() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function writeOverrides(overrides) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides || {}));
    } catch {}
  }

  function getSources() {
    const overrides = readOverrides();
    return defaultSources.map((source) => ({ ...source, ...(overrides[source.id] || {}) }));
  }

  function updateSource(id, patch) {
    const overrides = readOverrides();
    overrides[id] = { ...(overrides[id] || {}), ...(patch || {}) };
    writeOverrides(overrides);
    return getSources().find((source) => source.id === id);
  }

  function resetSources() {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    return getSources();
  }

  window.BRMediaShared = window.BRMediaShared || {};
  window.BRMediaShared.sources = { getSources, updateSource, resetSources, defaultSources };
})();
`,

  "server/public/settings/index.html": `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>BRMedia Settings</title>
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#182E5B" />
  <link rel="apple-touch-icon" sizes="180x180" href="/home/apple-touch-icon.png?v=20260505" />
  <link rel="icon" type="image/png" sizes="192x192" href="/home/icon-192.png?v=20260505" />
  <link rel="icon" type="image/png" sizes="512x512" href="/home/icon-512.png?v=20260505" />
  <link rel="manifest" href="/settings/site.webmanifest?v=20260510-f1" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="Settings" />
  <link rel="stylesheet" href="/shared/shell.css?v=20260509-split-a" />
  <link rel="stylesheet" href="/shared/module-theme.css?v=20260509-split-a" />
  <link rel="stylesheet" href="/settings/styles.css?v=20260510-f1" />
</head>
<body class="brSharedBody settingsBody">
  <div class="brSharedShell settingsShell">
    <header class="brSharedTopbar settingsTopbar">
      <div class="brSharedTopbarInner">
        <a class="brSharedIconBtn" href="/home" aria-label="Open BRMedia Home">⌂</a>
        <img class="brSharedLogo" src="/home/blackburn-ravers-header.png" alt="Blackburn Ravers" />
        <button class="brSharedIconBtn" type="button" aria-label="Open BRMedia menu" data-br-shared-menu>☰</button>
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

    <main class="brSharedMain settingsMain">
      <section class="settingsHero">
        <div class="settingsHeroText">
          <div class="brSharedEyebrow">Universal Settings</div>
          <h1>BRMedia Control Centre</h1>
          <p>One place for module settings, sources, cloud/imports, devices and backups. Server Settings stays separate for deeper admin setup.</p>
          <div class="settingsHeroActions">
            <a class="settingsHeroBtn primary" href="/player">Open Player</a>
            <a class="settingsHeroBtn" href="/server-settings">Server Settings</a>
          </div>
        </div>
        <div class="settingsHeroStack" aria-label="Settings status cards">
          <div class="settingsStatusCard"><span>Split</span><strong>Modules separated</strong><small>Mastering, Video, Converter and Tagger now have their own JS.</small></div>
          <div class="settingsStatusCard"><span>Sources</span><strong>Audio + Video paths</strong><small>C:\\DJMixes and C:\\Videos are tracked as shared sources.</small></div>
          <div class="settingsStatusCard"><span>Next</span><strong>Stats + Server polish</strong><small>Siri/device controls stay parked until the foundations are done.</small></div>
        </div>
      </section>

      <section class="settingsDashboard" aria-label="BRMedia Settings dashboard">
        <aside class="settingsRail">
          <div class="settingsRailSearchWrap">
            <label for="settingsSearch">Search settings</label>
            <input id="settingsSearch" type="search" placeholder="Player, Drive, sources…" autocomplete="off" />
          </div>
          <div id="settingsTabs" class="settingsRailTabs" aria-label="Settings sections"></div>
        </aside>

        <section class="settingsWorkspace">
          <div class="settingsWorkspaceHead">
            <div>
              <div class="settingsKicker" id="settingsActiveSection">Core</div>
              <h2 id="settingsActiveTitle">General</h2>
              <p id="settingsActiveSummary">Branding, app behaviour and shared UI.</p>
            </div>
            <a id="settingsActiveLink" class="settingsServerLink" href="/server-settings">Open section</a>
          </div>

          <div id="settingsSearchEmpty" class="settingsEmpty hidden">No settings sections matched that search.</div>
          <div id="settingsActivePanel" class="settingsActivePanel"></div>
        </section>
      </section>

      <section class="settingsQuickPanel">
        <div class="settingsPanelHead compact">
          <div>
            <div class="settingsKicker">Quick module links</div>
            <h2>Jump straight into a module</h2>
            <p>These stay handy while Universal Settings grows into the proper shared control centre.</p>
          </div>
        </div>
        <div id="settingsModuleGrid" class="settingsModuleGrid"></div>
      </section>
    </main>
  </div>

  <script src="/shared/nav.js?v=20260509-split-a"></script>
  <script src="/shared/icons.js?v=20260509-split-a"></script>
  <script src="/shared/source-manager.js?v=20260510-f1"></script>
  <script src="/shared/source-picker.js?v=20260509-split-a"></script>
  <script src="/shared/settings-schema.js?v=20260510-f1"></script>
  <script src="/shared/settings-ui.js?v=20260509-split-a"></script>
  <script src="/shared/shell.js?v=20260509-split-a"></script>
  <script src="/settings/app.js?v=20260510-f1"></script>
</body>
</html>
`,

  "server/public/settings/app.js": `(function () {
  const STORAGE_KEY = "brmedia_universal_settings_v1";

  const titleEl = document.getElementById("settingsActiveTitle");
  const sectionEl = document.getElementById("settingsActiveSection");
  const summaryEl = document.getElementById("settingsActiveSummary");
  const activeLink = document.getElementById("settingsActiveLink");
  const activePanel = document.getElementById("settingsActivePanel");
  const tabsEl = document.getElementById("settingsTabs");
  const moduleGrid = document.getElementById("settingsModuleGrid");
  const searchInput = document.getElementById("settingsSearch");
  const searchEmpty = document.getElementById("settingsSearchEmpty");

  const sectionLinks = {
    player: "/player",
    video: "/video-player",
    converter: "/converter",
    tagger: "/tagger",
    mastering: "/mastering",
    backup: "/player?settings=backup",
    "google-drive": "/player?settings=google-drive",
    dropbox: "/player?settings=dropbox",
    import: "/player?settings=import",
    sources: "/server-settings",
    server: "/server-settings",
  };

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }

  function readSettings() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
    catch { return {}; }
  }

  function writeSettings(next) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next || {})); } catch {}
  }

  function getValue(key, fallback = "") {
    const stored = readSettings();
    return stored[key] ?? fallback;
  }

  function setValue(key, value) {
    const stored = readSettings();
    stored[key] = value;
    writeSettings(stored);
  }

  function getTabs() {
    return window.BRMediaShared?.settingsSchema?.settingsTabs || [];
  }

  function getTab(tabId) {
    const tabs = getTabs();
    return tabs.find((tab) => tab.id === tabId) || tabs[0];
  }

  function getActiveTabId() {
    const params = new URLSearchParams(window.location.search || "");
    return params.get("tab") || "general";
  }

  function setActiveTabId(tabId) {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tabId);
    history.replaceState(null, "", url);
  }

  function renderTabs(filter = "") {
    if (!tabsEl) return;

    const query = filter.trim().toLowerCase();
    const active = getActiveTabId();
    const tabs = getTabs().filter((tab) => {
      if (!query) return true;
      return [tab.label, tab.summary, tab.section, tab.id].join(" ").toLowerCase().includes(query);
    });

    if (searchEmpty) searchEmpty.classList.toggle("hidden", tabs.length > 0);

    tabsEl.innerHTML = tabs.map((tab) => \`
      <button class="settingsRailTab\${tab.id === active ? " is-active" : ""}" type="button" data-settings-tab="\${escapeHtml(tab.id)}">
        <span class="settingsRailIcon">\${escapeHtml(tab.icon || "•")}</span>
        <span><strong>\${escapeHtml(tab.label)}</strong><small>\${escapeHtml(tab.section || "Settings")}</small></span>
      </button>
    \`).join("");

    tabsEl.querySelectorAll("[data-settings-tab]").forEach((button) => {
      button.addEventListener("click", () => updateTab(button.dataset.settingsTab || "general", true));
    });
  }

  function renderToggle(key, label, body, fallback = true) {
    const checked = Boolean(getValue(key, fallback));
    return \`
      <label class="settingsToggleCard">
        <span><strong>\${escapeHtml(label)}</strong><small>\${escapeHtml(body)}</small></span>
        <input type="checkbox" data-setting-key="\${escapeHtml(key)}" \${checked ? "checked" : ""} />
      </label>
    \`;
  }

  function renderInput(key, label, body, fallback = "") {
    return \`
      <label class="settingsInputCard">
        <span><strong>\${escapeHtml(label)}</strong><small>\${escapeHtml(body)}</small></span>
        <input type="text" data-setting-key="\${escapeHtml(key)}" value="\${escapeHtml(getValue(key, fallback))}" />
      </label>
    \`;
  }

  function renderSelect(key, label, body, options, fallback = "") {
    const current = String(getValue(key, fallback));
    return \`
      <label class="settingsInputCard">
        <span><strong>\${escapeHtml(label)}</strong><small>\${escapeHtml(body)}</small></span>
        <select data-setting-key="\${escapeHtml(key)}">
          \${options.map((option) => \`<option value="\${escapeHtml(option.value)}" \${String(option.value) === current ? "selected" : ""}>\${escapeHtml(option.label)}</option>\`).join("")}
        </select>
      </label>
    \`;
  }

  function renderActionGrid(actions) {
    return \`<div class="settingsActionGrid">\${actions.map((action) => \`
      <a class="settingsActionCard" href="\${escapeHtml(action.href)}">
        <span>\${escapeHtml(action.icon || "↗")}</span>
        <strong>\${escapeHtml(action.label)}</strong>
        <small>\${escapeHtml(action.body || "")}</small>
      </a>
    \`).join("")}</div>\`;
  }

  function renderSourceSettings() {
    const sources = window.BRMediaShared?.sources?.getSources?.() || [];
    return \`
      <div class="settingsSourceList">
        \${sources.map((source) => \`
          <div class="settingsSourceCard" data-source-id="\${escapeHtml(source.id)}">
            <div>
              <span class="settingsSourceKind">\${escapeHtml(source.kind)}</span>
              <strong>\${escapeHtml(source.label)}</strong>
              <small>\${escapeHtml(source.detail || source.path || "Shared source")}</small>
            </div>
            \${source.editable ? \`<input type="text" data-source-path="\${escapeHtml(source.id)}" value="\${escapeHtml(source.path || "")}" />\` : \`<span class="settingsSourceLock">\${source.localRequiredForWrite ? "Local copy needed" : "Ready"}</span>\`}
          </div>
        \`).join("")}
      </div>
      <div class="settingsButtonRow">
        <button class="settingsMiniBtn" type="button" data-reset-sources>Reset source paths</button>
        <a class="settingsMiniBtn" href="/server-settings">Open Server Settings</a>
      </div>
    \`;
  }

  function renderTabPanel(tabId) {
    if (tabId === "general") {
      return \`
        <div class="settingsCardGrid">
          \${renderSelect("theme", "Default look", "Shared visual preference for new module pages.", [
            { value: "brmedia-blue", label: "BRMedia blue/orange" },
            { value: "dark", label: "Dark" },
            { value: "system", label: "Follow device" },
          ], "brmedia-blue")}
          \${renderToggle("homeSplash", "Home splash intro", "Keep the Blackburn Ravers splash on the Home launcher.", true)}
          \${renderToggle("compactMobile", "Compact mobile cards", "Tighter cards on phones when pages get busy.", false)}
          \${renderInput("displayName", "Display name", "Shown in device/handoff screens later.", "Upalnite")}
        </div>
      \`;
    }

    if (tabId === "player") {
      return \`
        <div class="settingsCardGrid">
          \${renderToggle("playerResume", "Resume last mix", "Restore the last track and position when reopening Player.", true)}
          \${renderToggle("playerTimestampMeta", "Timestamp song metadata", "Use timestamp titles in mini player and future media controls.", true)}
          \${renderSelect("playerWaveform", "Waveform style", "Default player waveform display.", [
            { value: "bars", label: "Bars" },
            { value: "smooth", label: "Smooth" },
          ], "bars")}
        </div>
        \${renderActionGrid([{ href: "/player", label: "Open Player", body: "Music, mixes and tracklists", icon: "♫" }])}
      \`;
    }

    if (tabId === "video") {
      return \`
        <div class="settingsCardGrid">
          \${renderInput("videoFolder", "Video folder", "Default video source folder.", "C:\\\\Videos")}
          \${renderToggle("videoResume", "Resume watching", "Remember video positions across sessions.", true)}
          \${renderToggle("videoSubtitles", "Show subtitle controls", "Keep subtitle selector visible on supported videos.", true)}
        </div>
        \${renderActionGrid([{ href: "/video-player", label: "Open Video Player", body: "Poster wall and watch page", icon: "▻" }])}
      \`;
    }

    if (tabId === "converter") {
      return \`
        <div class="settingsCardGrid">
          \${renderSelect("converterAudioFormat", "Default audio format", "Preselect this format in Converter.", [
            { value: "mp3", label: "MP3" },
            { value: "wav", label: "WAV" },
            { value: "flac", label: "FLAC" },
          ], "mp3")}
          \${renderSelect("converterVideoFormat", "Default video format", "Preselect this format for video jobs.", [
            { value: "mp4", label: "MP4" },
            { value: "webm", label: "WebM" },
          ], "mp4")}
          \${renderToggle("converterAddLibrary", "Add completed files to library", "Default checked state for conversion jobs.", true)}
        </div>
        \${renderActionGrid([{ href: "/converter", label: "Open Converter", body: "Formats, trim and output jobs", icon: "↔" }])}
      \`;
    }

    if (tabId === "tagger") {
      return \`
        <div class="settingsCardGrid">
          \${renderSelect("taggerDefaultBrand", "Default brand", "Starting brand for new BRMedia custom tags.", [
            { value: "up", label: "Upalnite" },
            { value: "nj", label: "DJ NJ" },
            { value: "br", label: "Blackburn Ravers" },
            { value: "combo", label: "DJ NJ & Upalnite" },
          ], "up")}
          \${renderToggle("taggerSidecar", "Always save sidecar", "Keep BRMedia tag sidecars as source of truth.", true)}
          \${renderToggle("taggerBackup", "Backup before replace", "Require backup before overwrite modes.", true)}
        </div>
        \${renderActionGrid([{ href: "/tagger", label: "Open Tagger", body: "Metadata, artwork and categories", icon: "#" }])}
      \`;
    }

    if (tabId === "mastering") {
      return \`
        <div class="settingsCardGrid">
          \${renderSelect("masteringPreset", "Default preset", "Preset to start with in Mastering.", [
            { value: "streaming-clean", label: "Streaming Clean" },
            { value: "club-loud", label: "Club Loud" },
            { value: "warm-depth", label: "Warm Depth" },
            { value: "hardcore-punch", label: "Hardcore Punch" },
          ], "streaming-clean")}
          \${renderInput("masteringLufs", "Default LUFS target", "Default loudness target.", "-14")}
          \${renderToggle("masteringAddLibrary", "Add masters to library", "Default checked state after rendering.", true)}
        </div>
        \${renderActionGrid([{ href: "/mastering", label: "Open Mastering", body: "Render polished mastered copies", icon: "≋" }])}
      \`;
    }

    if (tabId === "devices") {
      return \`
        <div class="settingsCardGrid">
          \${renderInput("primaryPhoneName", "Primary phone name", "Used later for Send to Device.", "Upalnite iPhone")}
          \${renderInput("secondPhoneName", "Second phone name", "Useful for DJ NJ Android later.", "DJ NJ Android")}
          \${renderToggle("deviceHandoff", "Enable handoff buttons", "Keep Send to Device/Preview Share surfaces visible.", true)}
        </div>
      \`;
    }

    if (tabId === "backup") {
      return \`
        <div class="settingsCardGrid">
          \${renderToggle("backupPrompt", "Prompt before restore", "Always show preview before applying backup restores.", true)}
          \${renderToggle("backupBrowserData", "Include browser data", "Favourites, playlists, bookmarks and settings.", true)}
          \${renderToggle("backupServerData", "Include server data later", "For future full/server backup flow.", false)}
        </div>
        \${renderActionGrid([{ href: "/player?settings=backup", label: "Open Player Backup", body: "Use the current working backup tools", icon: "▤" }])}
      \`;
    }

    if (["google-drive", "dropbox", "import"].includes(tabId)) {
      const labels = {
        "google-drive": ["Google Drive", "Drive accounts and imports", "/player?settings=google-drive"],
        dropbox: ["Dropbox", "Dropbox accounts and imports", "/player?settings=dropbox"],
        import: ["Import / Direct URL", "Direct links and source links", "/player?settings=import"],
      }[tabId];

      return \`
        <div class="settingsCardGrid">
          \${renderToggle(\`\${tabId}Enabled\`, \`\${labels[0]} enabled\`, labels[1], true)}
          \${renderToggle(\`\${tabId}ImportLocal\`, "Import local copy before editing", "Required for Tagger, Converter and Mastering.", true)}
          \${renderToggle(\`\${tabId}ShowProgress\`, "Show import progress", "Keep per-account/job progress visible.", true)}
        </div>
        \${renderActionGrid([{ href: labels[2], label: \`Open \${labels[0]}\`, body: labels[1], icon: "↧" }])}
      \`;
    }

    if (tabId === "sources") return renderSourceSettings();

    if (tabId === "server") {
      return \`
        <div class="settingsCardGrid">
          \${renderInput("audioDirs", "Audio dirs", "Shared audio roots for Player/modules.", "C:\\\\DJMixes")}
          \${renderInput("videoDirs", "Video dirs", "Shared video roots for Video Player.", "C:\\\\Videos")}
          \${renderToggle("serverAdvancedSeparate", "Keep Server Settings separate", "Universal Settings links to admin; it does not replace it.", true)}
        </div>
        \${renderActionGrid([{ href: "/server-settings", label: "Open Server Settings", body: "Deeper admin, storage and networking", icon: "▦" }])}
      \`;
    }

    return \`<div class="settingsEmpty">This settings section is ready to wire in.</div>\`;
  }

  function bindPanelControls() {
    activePanel?.querySelectorAll("[data-setting-key]").forEach((input) => {
      input.addEventListener("change", () => {
        const value = input.type === "checkbox" ? input.checked : input.value;
        setValue(input.dataset.settingKey || "", value);
      });
      input.addEventListener("input", () => {
        if (input.type !== "checkbox") setValue(input.dataset.settingKey || "", input.value);
      });
    });

    activePanel?.querySelectorAll("[data-source-path]").forEach((input) => {
      input.addEventListener("input", () => {
        window.BRMediaShared?.sources?.updateSource?.(input.dataset.sourcePath || "", { path: input.value });
      });
    });

    activePanel?.querySelector("[data-reset-sources]")?.addEventListener("click", () => {
      window.BRMediaShared?.sources?.resetSources?.();
      updateTab("sources", false);
    });
  }

  function updateTab(tabId, pushUrl = false) {
    const tab = getTab(tabId);
    if (!tab) return;

    if (pushUrl) setActiveTabId(tab.id);
    if (titleEl) titleEl.textContent = tab.label;
    if (sectionEl) sectionEl.textContent = tab.section || "Settings";
    if (summaryEl) summaryEl.textContent = tab.summary;

    if (activeLink) {
      activeLink.href = sectionLinks[tab.id] || \`/settings?tab=\${encodeURIComponent(tab.id)}\`;
      activeLink.textContent = tab.id === "server" ? "Open Server Settings" : "Open related page";
    }

    renderTabs(searchInput?.value || "");

    if (activePanel) {
      activePanel.innerHTML = renderTabPanel(tab.id);
      bindPanelControls();
    }
  }

  function renderModules() {
    if (!moduleGrid) return;
    const cards = window.BRMediaShared?.settingsSchema?.moduleCards || [];
    moduleGrid.innerHTML = cards.map((card) => \`
      <a class="settingsModuleCard" href="\${escapeHtml(card.href)}">
        <span>\${escapeHtml(card.label.slice(0, 1))}</span>
        <strong>\${escapeHtml(card.label)}</strong>
        <small>\${escapeHtml(card.body)}</small>
      </a>
    \`).join("");
  }

  searchInput?.addEventListener("input", () => renderTabs(searchInput.value || ""));

  renderModules();
  renderTabs();
  updateTab(getActiveTabId(), false);
})();
`,

  "server/public/settings/styles.css": `/* BRMedia Universal Settings F1 */
.settingsMain {
  width: min(1180px, calc(100% - 24px));
}

.hidden { display: none !important; }

.settingsHero,
.settingsDashboard,
.settingsQuickPanel {
  border: 1px solid var(--br-border);
  border-radius: 30px;
  background:
    radial-gradient(circle at 10% 0%, rgba(255,159,28,0.14), transparent 32rem),
    rgba(11,24,50,0.78);
  box-shadow: 0 24px 70px rgba(0,0,0,0.32);
}

.settingsHero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 390px);
  gap: 18px;
  padding: clamp(20px, 4vw, 34px);
  margin-bottom: 16px;
}

.settingsHero h1 {
  margin: 8px 0 10px;
  font-size: clamp(34px, 8vw, 72px);
  line-height: 0.9;
  letter-spacing: -0.06em;
}

.settingsHero p {
  max-width: 680px;
  margin: 0;
  color: var(--br-muted);
  line-height: 1.5;
  font-size: 16px;
}

.settingsHeroActions,
.settingsButtonRow {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.settingsHeroBtn,
.settingsMiniBtn,
.settingsServerLink {
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 999px;
  padding: 12px 15px;
  color: var(--br-text);
  background: rgba(255,255,255,0.08);
  text-decoration: none;
  font-weight: 900;
  cursor: pointer;
}

.settingsHeroBtn.primary,
.settingsServerLink {
  color: #08152f;
  border-color: rgba(255,159,28,0.68);
  background: linear-gradient(180deg, #ffbd45, var(--br-orange));
}

.settingsHeroStack {
  display: grid;
  gap: 10px;
}

.settingsStatusCard {
  border: 1px solid rgba(255,255,255,0.13);
  border-radius: 22px;
  padding: 14px;
  background: rgba(255,255,255,0.07);
}

.settingsStatusCard span,
.settingsKicker,
.settingsSourceKind {
  color: var(--br-orange);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 11px;
  font-weight: 900;
}

.settingsStatusCard strong,
.settingsSourceCard strong {
  display: block;
  margin: 5px 0;
  font-size: 18px;
}

.settingsStatusCard small,
.settingsSourceCard small,
.settingsModuleCard small,
.settingsActionCard small,
.settingsToggleCard small,
.settingsInputCard small {
  display: block;
  color: var(--br-muted);
  line-height: 1.35;
}

.settingsDashboard {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 0;
  overflow: hidden;
  margin-bottom: 16px;
}

.settingsRail {
  border-right: 1px solid var(--br-border);
  padding: 16px;
  background: rgba(0,0,0,0.14);
}

.settingsRailSearchWrap {
  display: grid;
  gap: 7px;
  margin-bottom: 14px;
}

.settingsRailSearchWrap label {
  color: var(--br-muted);
  font-size: 12px;
  font-weight: 900;
}

.settingsRailSearchWrap input,
.settingsInputCard input,
.settingsInputCard select,
.settingsSourceCard input {
  width: 100%;
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 16px;
  padding: 12px 13px;
  color: var(--br-text);
  background: rgba(255,255,255,0.08);
  outline: none;
}

.settingsRailTabs {
  display: grid;
  gap: 9px;
}

.settingsRailTab {
  display: grid;
  grid-template-columns: 42px 1fr;
  gap: 10px;
  align-items: center;
  width: 100%;
  min-height: 58px;
  padding: 9px;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 18px;
  color: var(--br-text);
  background: rgba(255,255,255,0.06);
  text-align: left;
  font: inherit;
}

.settingsRailTab.is-active {
  border-color: rgba(255,159,28,0.72);
  background: rgba(255,159,28,0.14);
}

.settingsRailIcon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 15px;
  color: var(--br-orange);
  background: rgba(255,255,255,0.08);
  font-size: 21px;
  font-weight: 900;
}

.settingsRailTab strong {
  display: block;
  font-weight: 900;
}

.settingsRailTab small {
  display: block;
  margin-top: 2px;
  color: var(--br-muted);
  font-size: 11px;
}

.settingsWorkspace {
  padding: 18px;
}

.settingsWorkspaceHead,
.settingsPanelHead {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;
}

.settingsWorkspaceHead h2,
.settingsPanelHead h2 {
  margin: 4px 0 5px;
  font-size: clamp(28px, 5vw, 44px);
  line-height: 0.95;
  letter-spacing: -0.04em;
}

.settingsWorkspaceHead p,
.settingsPanelHead p {
  margin: 0;
  color: var(--br-muted);
  line-height: 1.45;
}

.settingsActivePanel {
  display: grid;
  gap: 14px;
}

.settingsCardGrid,
.settingsActionGrid,
.settingsModuleGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 12px;
}

.settingsToggleCard,
.settingsInputCard,
.settingsActionCard,
.settingsModuleCard,
.settingsSourceCard,
.settingsEmpty {
  border: 1px solid rgba(255,255,255,0.13);
  border-radius: 22px;
  padding: 15px;
  background: rgba(255,255,255,0.07);
  color: var(--br-text);
  text-decoration: none;
}

.settingsToggleCard {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.settingsToggleCard input {
  width: 48px;
  height: 28px;
  accent-color: var(--br-orange);
}

.settingsInputCard {
  display: grid;
  gap: 11px;
}

.settingsActionCard,
.settingsModuleCard {
  display: grid;
  gap: 7px;
}

.settingsActionCard > span,
.settingsModuleCard > span {
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  border-radius: 17px;
  color: var(--br-orange);
  background: rgba(255,255,255,0.09);
  font-weight: 1000;
}

.settingsSourceList {
  display: grid;
  gap: 12px;
}

.settingsSourceCard {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(190px, 320px);
  gap: 12px;
  align-items: center;
}

.settingsSourceLock {
  justify-self: end;
  border: 1px solid rgba(255,255,255,0.13);
  border-radius: 999px;
  padding: 8px 10px;
  color: var(--br-muted);
  background: rgba(0,0,0,0.14);
  font-size: 12px;
  font-weight: 900;
}

.settingsQuickPanel {
  padding: 18px;
}

.settingsPanelHead.compact {
  margin-bottom: 12px;
}

@media (max-width: 820px) {
  .settingsHero,
  .settingsDashboard,
  .settingsSourceCard {
    grid-template-columns: 1fr;
  }

  .settingsRail {
    border-right: 0;
    border-bottom: 1px solid var(--br-border);
  }

  .settingsRailTabs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .settingsWorkspaceHead,
  .settingsPanelHead {
    display: grid;
  }

  .settingsServerLink,
  .settingsSourceLock {
    justify-self: stretch;
    text-align: center;
  }
}

@media (max-width: 520px) {
  .settingsMain {
    width: min(100% - 18px, 1180px);
  }

  .settingsHero,
  .settingsWorkspace,
  .settingsRail,
  .settingsQuickPanel {
    padding: 14px;
  }

  .settingsRailTabs,
  .settingsCardGrid,
  .settingsActionGrid,
  .settingsModuleGrid {
    grid-template-columns: 1fr;
  }
}
`
};

for (const rel of Object.keys(files)) {
  const outPath = path.join(root, rel);
  if (fs.existsSync(outPath)) {
    const backupPath = path.join(backupDir, rel);
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(outPath, backupPath);
  }
}

for (const [rel, content] of Object.entries(files)) {
  const outPath = path.join(root, rel);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, content, "utf8");
}

console.log("BRMedia Patch F1 complete.");
console.log("Updated Universal Settings layout and shared source/settings schema.");
console.log("Backups saved to tools/backups/settings-before-f1 if existing files were present.");