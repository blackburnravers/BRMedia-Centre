(function () {
  const STORAGE_KEY = "brmedia_universal_settings_v1";
  const EXPORT_VERSION = 2;

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

  const sectionLinkText = {
    general: "Stay here",
    player: "Open Player",
    video: "Open Video Player",
    converter: "Open Converter",
    tagger: "Open Tagger",
    mastering: "Open Mastering",
    devices: "Device settings",
    backup: "Open Backup tools",
    "google-drive": "Open Drive tools",
    dropbox: "Open Dropbox tools",
    import: "Open Import tools",
    sources: "Open Server Settings",
    server: "Open Server Settings",
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
    stored.__updatedAt = new Date().toISOString();
    writeSettings(stored);
    showSettingsToast("Saved", "Universal Settings updated.");
    renderSettingsHealth();
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

  function safeBadge(value, fallback = "SET") {
    const cleaned = String(value || fallback).trim().replace(/[^A-Za-z0-9#]/g, "").slice(0, 4);
    return cleaned || fallback;
  }

  function showSettingsToast(title = "Saved", body = "") {
    let toast = document.querySelector("[data-settings-toast]");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "settingsToast";
      toast.setAttribute("data-settings-toast", "");
      document.body.appendChild(toast);
    }

    toast.innerHTML = "<strong>" + escapeHtml(title) + "</strong>" + (body ? "<span>" + escapeHtml(body) + "</span>" : "");
    toast.classList.add("is-visible");
    window.clearTimeout(showSettingsToast.timer);
    showSettingsToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 1900);
  }

  function renderSettingsHealth() {
    const stored = readSettings();
    const sourceCount = window.BRMediaShared?.sources?.getSources?.().length || 0;
    document.querySelectorAll("[data-settings-health]").forEach((el) => {
      const type = el.getAttribute("data-settings-health");
      if (type === "saved") el.textContent = stored.__updatedAt ? "Saved locally" : "Ready";
      if (type === "sources") el.textContent = sourceCount + " sources";
      if (type === "version") el.textContent = "Settings v" + EXPORT_VERSION;
    });
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

    tabsEl.innerHTML = tabs.map((tab) => `
      <button class="settingsRailTab${tab.id === active ? " is-active" : ""}" type="button" data-settings-tab="${escapeHtml(tab.id)}">
        <span class="settingsRailIcon">${escapeHtml(tab.icon || "�")}</span>
        <span><strong>${escapeHtml(tab.label)}</strong><small>${escapeHtml(tab.section || "Settings")}</small></span>
      </button>
    `).join("");

    tabsEl.querySelectorAll("[data-settings-tab]").forEach((button) => {
      button.addEventListener("click", () => updateTab(button.dataset.settingsTab || "general", true));
    });
  }

  function renderToggle(key, label, body, fallback = true) {
    const checked = Boolean(getValue(key, fallback));
    return `
      <label class="settingsToggleCard">
        <span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(body)}</small></span>
        <input type="checkbox" data-setting-key="${escapeHtml(key)}" ${checked ? "checked" : ""} />
      </label>
    `;
  }

  function renderInput(key, label, body, fallback = "") {
    return `
      <label class="settingsInputCard">
        <span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(body)}</small></span>
        <input type="text" data-setting-key="${escapeHtml(key)}" value="${escapeHtml(getValue(key, fallback))}" />
      </label>
    `;
  }

  function renderSelect(key, label, body, options, fallback = "") {
    const current = String(getValue(key, fallback));
    return `
      <label class="settingsInputCard">
        <span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(body)}</small></span>
        <select data-setting-key="${escapeHtml(key)}">
          ${options.map((option) => `<option value="${escapeHtml(option.value)}" ${String(option.value) === current ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
        </select>
      </label>
    `;
  }

  function renderActionGrid(actions) {
    return `<div class="settingsActionGrid">${actions.map((action) => `
      <a class="settingsActionCard" href="${escapeHtml(action.href)}">
        <span>${escapeHtml(safeBadge(action.icon, action.label?.slice(0, 3)))}</span>
        <strong>${escapeHtml(action.label)}</strong>
        <small>${escapeHtml(action.body || "")}</small>
      </a>
    `).join("")}</div>`;
  }

  function renderSettingsUtilityPanel() {
    return `
      <div class="settingsUtilityPanel">
        <div class="settingsUtilityCard"><span>State</span><strong data-settings-health="saved">Ready</strong><small>These F2 controls save locally until backend config wiring is added.</small></div>
        <div class="settingsUtilityCard"><span>Sources</span><strong data-settings-health="sources">Sources</strong><small>Shared source manager is available to Settings.</small></div>
        <div class="settingsUtilityCard"><span>Build</span><strong data-settings-health="version">Settings</strong><small>F2 adds local export/import and safer badges.</small></div>
      </div>
    `;
  }

  function renderSourceSettings() {
    const sources = window.BRMediaShared?.sources?.getSources?.() || [];
    return `
      <div class="settingsSourceList">
        ${sources.map((source) => `
          <div class="settingsSourceCard" data-source-id="${escapeHtml(source.id)}">
            <div>
              <span class="settingsSourceKind">${escapeHtml(source.kind)}</span>
              <strong>${escapeHtml(source.label)}</strong>
              <small>${escapeHtml(source.detail || source.path || "Shared source")}</small>
            </div>
            ${source.editable ? `<input type="text" data-source-path="${escapeHtml(source.id)}" value="${escapeHtml(source.path || "")}" />` : `<span class="settingsSourceLock">${source.localRequiredForWrite ? "Local copy needed" : "Ready"}</span>`}
          </div>
        `).join("")}
      </div>
      <div class="settingsButtonRow">
        <button class="settingsMiniBtn" type="button" data-reset-sources>Reset source paths</button>
        <a class="settingsMiniBtn" href="/server-settings">Open Server Settings</a>
      </div>
    `;
  }

  function renderBackupTools() {
    return `
      <div class="settingsBackupTools">
        <button class="settingsBackupBtn" type="button" data-export-settings><span>EXP</span><strong>Export Universal Settings</strong><small>Downloads current Universal Settings and source overrides as JSON.</small></button>
        <button class="settingsBackupBtn" type="button" data-import-settings><span>IMP</span><strong>Import Universal Settings</strong><small>Restore a previously exported Settings JSON file.</small></button>
        <button class="settingsBackupBtn danger" type="button" data-reset-settings><span>RST</span><strong>Reset Universal Settings</strong><small>Clears only this Universal Settings local store.</small></button>
        <input class="hidden" type="file" accept="application/json,.json" data-import-settings-file />
      </div>
    `;
  }

  function renderTabPanel(tabId) {
    const utility = renderSettingsUtilityPanel();
    if (tabId === "general") {
      return `
        ${utility}
        <div class="settingsCardGrid">
          ${renderSelect("theme", "Default look", "Shared visual preference for new module pages.", [
            { value: "brmedia-blue", label: "BRMedia blue/orange" },
            { value: "dark", label: "Dark" },
            { value: "system", label: "Follow device" },
          ], "brmedia-blue")}
          ${renderToggle("homeSplash", "Home splash intro", "Keep the Blackburn Ravers splash on the Home launcher.", true)}
          ${renderToggle("compactMobile", "Compact mobile cards", "Tighter cards on phones when pages get busy.", false)}
          ${renderInput("displayName", "Display name", "Shown in device/handoff screens later.", "Upalnite")}
        </div>
      `;
    }

    if (tabId === "player") {
      return `
        ${utility}
        <div class="settingsCardGrid">
          ${renderToggle("playerResume", "Resume last mix", "Restore the last track and position when reopening Player.", true)}
          ${renderToggle("playerTimestampMeta", "Timestamp song metadata", "Use timestamp titles in mini player and future media controls.", true)}
          ${renderSelect("playerWaveform", "Waveform style", "Default player waveform display.", [
            { value: "bars", label: "Bars" },
            { value: "smooth", label: "Smooth" },
          ], "bars")}
        </div>
        ${renderActionGrid([{ href: "/player", label: "Open Player", body: "Music, mixes and tracklists", icon: "SET" }])}
      `;
    }

    if (tabId === "video") {
      return `
        ${utility}
        <div class="settingsCardGrid">
          ${renderInput("videoFolder", "Video folder", "Default video source folder.", "C:\\Videos")}
          ${renderToggle("videoResume", "Resume watching", "Remember video positions across sessions.", true)}
          ${renderToggle("videoSubtitles", "Show subtitle controls", "Keep subtitle selector visible on supported videos.", true)}
        </div>
        ${renderActionGrid([{ href: "/video-player", label: "Open Video Player", body: "Poster wall and watch page", icon: "SET" }])}
      `;
    }

    if (tabId === "converter") {
      return `
        ${utility}
        <div class="settingsCardGrid">
          ${renderSelect("converterAudioFormat", "Default audio format", "Preselect this format in Converter.", [
            { value: "mp3", label: "MP3" },
            { value: "wav", label: "WAV" },
            { value: "flac", label: "FLAC" },
          ], "mp3")}
          ${renderSelect("converterVideoFormat", "Default video format", "Preselect this format for video jobs.", [
            { value: "mp4", label: "MP4" },
            { value: "webm", label: "WebM" },
          ], "mp4")}
          ${renderToggle("converterAddLibrary", "Add completed files to library", "Default checked state for conversion jobs.", true)}
        </div>
        ${renderActionGrid([{ href: "/converter", label: "Open Converter", body: "Formats, trim and output jobs", icon: "SET" }])}
      `;
    }

    if (tabId === "tagger") {
      return `
        ${utility}
        <div class="settingsCardGrid">
          ${renderSelect("taggerDefaultBrand", "Default brand", "Starting brand for new BRMedia custom tags.", [
            { value: "up", label: "Upalnite" },
            { value: "nj", label: "DJ NJ" },
            { value: "br", label: "Blackburn Ravers" },
            { value: "combo", label: "DJ NJ & Upalnite" },
          ], "up")}
          ${renderToggle("taggerSidecar", "Always save sidecar", "Keep BRMedia tag sidecars as source of truth.", true)}
          ${renderToggle("taggerBackup", "Backup before replace", "Require backup before overwrite modes.", true)}
        </div>
        ${renderActionGrid([{ href: "/tagger", label: "Open Tagger", body: "Metadata, artwork and categories", icon: "#" }])}
      `;
    }

    if (tabId === "mastering") {
      return `
        ${utility}
        <div class="settingsCardGrid">
          ${renderSelect("masteringPreset", "Default preset", "Preset to start with in Mastering.", [
            { value: "streaming-clean", label: "Streaming Clean" },
            { value: "club-loud", label: "Club Loud" },
            { value: "warm-depth", label: "Warm Depth" },
            { value: "hardcore-punch", label: "Hardcore Punch" },
          ], "streaming-clean")}
          ${renderInput("masteringLufs", "Default LUFS target", "Default loudness target.", "-14")}
          ${renderToggle("masteringAddLibrary", "Add masters to library", "Default checked state after rendering.", true)}
        </div>
        ${renderActionGrid([{ href: "/mastering", label: "Open Mastering", body: "Render polished mastered copies", icon: "SET" }])}
      `;
    }

    if (tabId === "devices") {
      return `
        ${utility}
        <div class="settingsCardGrid">
          ${renderInput("primaryPhoneName", "Primary phone name", "Used later for Send to Device.", "Upalnite iPhone")}
          ${renderInput("secondPhoneName", "Second phone name", "Useful for DJ NJ Android later.", "DJ NJ Android")}
          ${renderToggle("deviceHandoff", "Enable handoff buttons", "Keep Send to Device/Preview Share surfaces visible.", true)}
        </div>
      `;
    }

    if (tabId === "backup") {
      return `
        ${utility}
        <div class="settingsCardGrid">
          ${renderToggle("backupPrompt", "Prompt before restore", "Always show preview before applying backup restores.", true)}
          ${renderToggle("backupBrowserData", "Include browser data", "Favourites, playlists, bookmarks and settings.", true)}
          ${renderToggle("backupServerData", "Include server data later", "For future full/server backup flow.", false)}
        </div>
        ${renderBackupTools()}
        ${renderActionGrid([{ href: "/player?settings=backup", label: "Open Player Backup", body: "Use the current working backup tools", icon: "BAK" }])}
      `;
    }

    if (["google-drive", "dropbox", "import"].includes(tabId)) {
      const labels = {
        "google-drive": ["Google Drive", "Drive accounts and imports", "/player?settings=google-drive"],
        dropbox: ["Dropbox", "Dropbox accounts and imports", "/player?settings=dropbox"],
        import: ["Import / Direct URL", "Direct links and source links", "/player?settings=import"],
      }[tabId];

      return `
        ${utility}
        <div class="settingsCardGrid">
          ${renderToggle(`${tabId}Enabled`, `${labels[0]} enabled`, labels[1], true)}
          ${renderToggle(`${tabId}ImportLocal`, "Import local copy before editing", "Required for Tagger, Converter and Mastering.", true)}
          ${renderToggle(`${tabId}ShowProgress`, "Show import progress", "Keep per-account/job progress visible.", true)}
        </div>
        ${renderActionGrid([{ href: labels[2], label: `Open ${labels[0]}`, body: labels[1], icon: "SET" }])}
      `;
    }

    if (tabId === "sources") return `${utility}${renderSourceSettings()}`;

    if (tabId === "server") {
      return `
        ${utility}
        <div class="settingsCardGrid">
          ${renderInput("audioDirs", "Audio dirs", "Shared audio roots for Player/modules.", "C:\\DJMixes")}
          ${renderInput("videoDirs", "Video dirs", "Shared video roots for Video Player.", "C:\\Videos")}
          ${renderToggle("serverAdvancedSeparate", "Keep Server Settings separate", "Universal Settings links to admin; it does not replace it.", true)}
        </div>
        ${renderActionGrid([{ href: "/server-settings", label: "Open Server Settings", body: "Deeper admin, storage and networking", icon: "SET" }])}
      `;
    }

    return `<div class="settingsEmpty">This settings section is ready to wire in.</div>`;
  }

  function exportSettings() {
    const payload = {
      app: "BRMedia Centre",
      type: "universal-settings",
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      settings: readSettings(),
      sourceOverrides: {},
    };

    try { payload.sourceOverrides = JSON.parse(localStorage.getItem("brmedia_shared_sources_v1") || "{}"); } catch {}

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "brmedia-universal-settings-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 700);
    showSettingsToast("Export ready", "Universal Settings JSON downloaded.");
  }

  async function importSettingsFile(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data?.type !== "universal-settings" || !data.settings) throw new Error("That is not a BRMedia Universal Settings export.");
      writeSettings({ ...data.settings, __updatedAt: new Date().toISOString() });
      if (data.sourceOverrides) localStorage.setItem("brmedia_shared_sources_v1", JSON.stringify(data.sourceOverrides));
      showSettingsToast("Imported", "Universal Settings restored.");
      updateTab(getActiveTabId(), false);
    } catch (err) {
      showSettingsToast("Import failed", err?.message || "Could not import settings.");
    }
  }

  function bindPanelControls() {
    activePanel?.querySelectorAll("[data-setting-key]").forEach((input) => {
      input.addEventListener("change", () => {
        const value = input.type === "checkbox" ? input.checked : input.value;
        setValue(input.dataset.settingKey || "", value);
      });
      input.addEventListener("input", () => {
        if (input.type !== "checkbox") {
          const stored = readSettings();
          stored[input.dataset.settingKey || ""] = input.value;
          stored.__updatedAt = new Date().toISOString();
          writeSettings(stored);
          renderSettingsHealth();
        }
      });
      input.addEventListener("blur", () => {
        if (input.type !== "checkbox") showSettingsToast("Saved", "Universal Settings updated.");
      });
    });

    activePanel?.querySelectorAll("[data-source-path]").forEach((input) => {
      input.addEventListener("input", () => {
        window.BRMediaShared?.sources?.updateSource?.(input.dataset.sourcePath || "", { path: input.value });
        renderSettingsHealth();
      });
    });

    activePanel?.querySelector("[data-reset-sources]")?.addEventListener("click", () => {
      window.BRMediaShared?.sources?.resetSources?.();
      showSettingsToast("Sources reset", "Default source paths restored.");
      updateTab("sources", false);
    });

    activePanel?.querySelector("[data-export-settings]")?.addEventListener("click", exportSettings);
    const importInput = activePanel?.querySelector("[data-import-settings-file]");
    activePanel?.querySelector("[data-import-settings]")?.addEventListener("click", () => importInput?.click());
    importInput?.addEventListener("change", () => void importSettingsFile(importInput.files?.[0]));

    activePanel?.querySelector("[data-reset-settings]")?.addEventListener("click", () => {
      if (!window.confirm("Reset only the Universal Settings local store? This will not delete your music, videos, modules or server data.")) return;
      localStorage.removeItem(STORAGE_KEY);
      showSettingsToast("Settings reset", "Universal Settings local values cleared.");
      updateTab(getActiveTabId(), false);
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
      activeLink.href = sectionLinks[tab.id] || `/settings?tab=${encodeURIComponent(tab.id)}`;
      activeLink.textContent = sectionLinkText[tab.id] || "Open related page";
    }

    renderTabs(searchInput?.value || "");

    if (activePanel) {
      activePanel.innerHTML = renderTabPanel(tab.id);
      bindPanelControls();
      renderSettingsHealth();
    }
  }

  function renderModules() {
    if (!moduleGrid) return;
    const cards = window.BRMediaShared?.settingsSchema?.moduleCards || [];
    moduleGrid.innerHTML = cards.map((card) => `
      <a class="settingsModuleCard" href="${escapeHtml(card.href)}">
        <span>${escapeHtml(safeBadge(card.icon, card.label.slice(0, 3)))}</span>
        <strong>${escapeHtml(card.label)}</strong>
        <small>${escapeHtml(card.body)}</small>
      </a>
    `).join("");
  }

  searchInput?.addEventListener("input", () => renderTabs(searchInput.value || ""));

  renderModules();
  renderTabs();
  updateTab(getActiveTabId(), false);
})();
