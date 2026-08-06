(() => {
  "use strict";

  const API = "/api/settings";
  const DJ_PAGES = [
    ["dj-studio", "DJ Studio", ["studio"]],
    ["dj-engine", "Audio Engine", ["engine"]],
    ["dj-decks", "Decks", ["decks"]],
    ["dj-mixer", "Mixer", ["mixer"]],
    ["dj-waveforms", "Waveforms", ["waveform"]],
    ["dj-grid", "Beat Grid", ["grid"]],
    ["dj-analysis", "Analysis", ["analysis"]],
    ["dj-sync", "Sync", ["sync"]],
    ["dj-quantize", "Quantize", ["quantize"]],
    ["dj-hot-cues", "Hot Cues", ["decks", "quantize", "waveform"]],
    ["dj-memory-cues", "Memory Cues", ["quantize", "waveform"]],
    ["dj-loops", "Loops", ["loops"]],
    ["dj-beat-jump", "Beat Jump", ["beatJump"]],
    ["dj-fx", "FX", ["fx"]],
    ["dj-stems", "Stems", ["stems"]],
    ["dj-recording", "Recording", ["recording"]],
    ["dj-recording-archive", "Recording Archive", ["recordingArchive"]],
    ["dj-audio-routing", "Audio Routing", ["audioRouting"]],
    ["dj-performance", "Performance", ["performanceUi"]],
    ["dj-library", "DJ Library", ["performanceUi"]],
    ["dj-set-plan", "Set Plan", [], true],
    ["dj-controllers", "Controllers", [], true],
    ["dj-mixxx", "Mixxx Integration", ["engine"], true],
  ];

  const GROUPS = [
    {
      title: "Settings Home",
      pages: [["home", "Settings Home", "universal"]],
    },
    {
      title: "Modules",
      pages: [
        ["general", "General", "universal"],
        ["server", "Server", "server"],
        ["library", "Library", "library"],
        ["library-sources", "Library Sources", "library"],
        ["player", "Player", "audioPlayer"],
        ["video", "Video", "videoPlayer"],
        ["converter", "Converter", "converter"],
        ["tagger", "Tagger", "tagger"],
        ["mastering", "Mastering", "mastering"],
        ["torrents", "Torrents", "torrents"],
        ["profiles", "Profiles", "profiles"],
        ["notifications", "Notifications", "notifications"],
        ["statistics", "Statistics", "diagnostics"],
      ],
    },
    {
      title: "DJ",
      pages: DJ_PAGES.map(([id, label, sections, placeholder]) => [
        id, label, "dj", sections, placeholder,
      ]),
    },
    {
      title: "System",
      pages: [
        ["health-summary", "Health Summary", "diagnostics", [], true],
        ["server-health", "Server Health", "diagnostics", [], true],
        ["tools", "Tools and Dependencies", "diagnostics", [], true],
        ["storage-health", "Storage Health", "diagnostics", [], true],
        ["library-health", "Library Health", "diagnostics", [], true],
        ["media-health", "Media Modules", "diagnostics", [], true],
        ["dj-health", "DJ Health", "diagnostics", [], true],
        ["jobs-health", "Jobs and Queues", "diagnostics", [], true],
        ["logs-health", "Logs and Errors", "diagnostics", [], true],
        ["settings-store-health", "Settings Store Health", "diagnostics", [], true],
        ["export-settings", "Export Settings", "backup", [], true],
        ["import-settings", "Import and Preview", "backup", [], true],
        ["settings-backups", "Settings Backups", "backup", [], true],
        ["reset-settings", "Reset Settings", "backup", [], true],
        ["recovery-status", "Corruption Recovery", "backup", [], true],
        ["paths-storage", "Paths and Storage", "storage"],
        ["cloud", "Cloud", "storage", [], true],
        ["advanced", "Advanced", "backup"],
        ["developer", "Developer", "diagnostics"],
      ],
    },
  ];

  const DESCRIPTIONS = {
    home: "Shared appearance and behaviour defaults for BRMedia Centre.",
    server: "Server defaults. Changing marked values may require a server restart.",
    statistics: "Diagnostics and statistics display preferences.",
    cloud: "Cloud-specific settings are planned; shared storage values are shown where available.",
    advanced: "Backup and preservation defaults for the shared settings system.",
    developer: "Diagnostics defaults intended for troubleshooting and development.",
    "dj-set-plan": "The future Set Plan project is planned. Existing lightweight Set Plan data remains untouched.",
    "dj-controllers": "Controller mappings are planned. No controller settings exist in the U1 schema yet.",
    "dj-mixxx": "Mixxx is a future optional backend. This page does not install or start Mixxx.",
  };

  const ENUMS = {
    "theme": ["system", "dark"],
    "density": ["comfortable", "compact"],
    "defaultLandingModule": ["home", "audio-player", "video-player", "dj-studio"],
    "httpsMode": ["existing", "disabled"],
    "tailscaleStatus": ["detect", "disabled"],
    "duplicatePolicy": ["keep-both", "skip", "replace"],
    "repeatMode": ["off", "all", "one"],
    "waveformDisplayMode": ["bars", "smooth"],
    "preloadMode": ["none", "metadata", "auto"],
    "aspectRatio": ["auto", "16:9", "4:3"],
    "objectFit": ["contain", "cover", "fill"],
    "defaultDeleteMode": ["library", "physical"],
    "backend": ["brmedia-native", "mixxx"],
    "liveBpmMode": ["whole-bpm", "precision"],
    "defaultPage": ["main", "hot-cue", "memory-cue", "grid", "stems"],
    "channelFaderCurve": ["linear"],
    "crossfaderCurve": ["linear-plateau"],
    "palette": ["blue", "rgb", "threeband", "brmedia"],
    "renderQuality": ["auto", "high", "balanced", "mobile"],
    "preference": ["auto", "normal", "dynamic"],
    "metronomeLevel": ["off", "low", "medium", "high"],
    "metronomeDeck": ["d1", "d2"],
    "reviewPolicy": ["flag-low-confidence", "always", "never"],
    "mode": ["beat", "bpm"],
    "masterSelection": ["automatic-first-active", "manual"],
    "defaultTarget": ["d1", "d2", "both"],
    "devicePreference": ["auto", "cpu", "cuda"],
    "format": ["wav", "flac", "mp3"],
    "sampleRate": ["engine", "source", "44100", "48000", "88200", "96000"],
    "channels": ["source", "1", "2"],
    "wavBitDepth": ["16", "24", "32-float"],
    "flacBitDepth": ["16", "24"],
    "flacCompression": ["fast", "balanced", "maximum"],
    "mp3Bitrate": ["128", "192", "256", "320"],
    "reconnectPolicy": ["manual", "automatic"],
    "openBehavior": ["always-main", "remember-last-page"],
    "librarySort": ["title-asc", "title-desc", "bpm-asc", "bpm-desc"],
    "preparationFilter": ["all", "prepared", "review-required"],
    "bpmFilter": ["all", "known", "unknown"],
    "fullscreenPreference": ["manual", "request-on-open"],
    "orientationPreference": ["auto", "portrait", "landscape"],
  };

  const PAGE_BY_ID = new Map();
  GROUPS.forEach((group) => group.pages.forEach((page) => {
    PAGE_BY_ID.set(page[0], {
      id: page[0],
      label: page[1],
      module: page[2],
      sections: page[3] || null,
      placeholder: Boolean(page[4]),
      category: group.title,
    });
  }));

  document.body.className = "";
  document.body.innerHTML = `
    <div class="u3-app">
      <header class="u3-topbar">
        <a class="u3-brand" href="/" aria-label="BRMedia Centre home">
          <img src="/shared/branding/global/blackburn-ravers-header.png" alt="Blackburn Ravers">
          <span><small>BRMedia Centre</small>Universal Settings</span>
        </a>
        <button id="u3NavToggle" class="u3-icon-button u3-nav-toggle" type="button" aria-controls="u3Nav" aria-expanded="false">
          <span aria-hidden="true">☰</span><span class="sr-only">Open settings navigation</span>
        </button>
      </header>
      <div id="u3Health" class="u3-health" role="status" aria-live="polite">
        <span class="u3-dot"></span><span id="u3HealthText">Checking settings-store health…</span>
        <button id="u3HealthReload" type="button">Retry</button>
      </div>
      <div class="u3-layout">
        <aside id="u3Nav" class="u3-nav" aria-label="Settings categories">
          <div class="u3-search">
            <label for="u3Search">Search settings</label>
            <input id="u3Search" type="search" placeholder="Search modules and fields" autocomplete="off">
          </div>
          <nav id="u3CategoryNav"></nav>
        </aside>
        <button id="u3Backdrop" class="u3-backdrop" type="button" aria-label="Close navigation"></button>
        <main id="u3Main" class="u3-main" tabindex="-1">
          <section class="u3-heading">
            <div><p id="u3Category" class="u3-eyebrow"></p><h1 id="u3Title"></h1><p id="u3Description" class="u3-description"></p></div>
            <div class="u3-page-status"><span id="u3ModuleBadge" class="u3-badge"></span><span id="u3DirtyBadge" class="u3-badge warning" hidden>Unsaved</span></div>
          </section>
          <section id="u3Notices" class="u3-notices" aria-live="polite"></section>
          <section id="u3Loading" class="u3-state"><span class="u3-spinner" aria-hidden="true"></span><h2>Loading settings</h2><p>Reading the shared settings service…</p></section>
          <section id="u3Error" class="u3-state" hidden><h2>Settings could not be loaded</h2><p id="u3ErrorMessage"></p><button id="u3ErrorRetry" class="u3-button primary" type="button">Try again</button></section>
          <form id="u3Form" novalidate hidden>
            <div id="u3Fields" class="u3-fields"></div>
            <footer id="u3ActionBar" class="u3-actions">
              <span id="u3SaveState" class="u3-save-state">No unsaved changes</span>
              <div class="u3-buttons">
                <button id="u3Cancel" class="u3-button" type="button" disabled>Cancel</button>
                <button id="u3Reload" class="u3-button" type="button">Reload</button>
                <button id="u3Save" class="u3-button primary" type="submit" disabled>Save module</button>
              </div>
            </footer>
          </form>
        </main>
      </div>
    </div>`;

  const $ = (id) => document.getElementById(id);
  const els = {
    nav: $("u3Nav"), backdrop: $("u3Backdrop"), navToggle: $("u3NavToggle"),
    navRoot: $("u3CategoryNav"), search: $("u3Search"), main: $("u3Main"),
    health: $("u3Health"), healthText: $("u3HealthText"), healthReload: $("u3HealthReload"),
    category: $("u3Category"), title: $("u3Title"), description: $("u3Description"),
    moduleBadge: $("u3ModuleBadge"), dirtyBadge: $("u3DirtyBadge"), notices: $("u3Notices"),
    loading: $("u3Loading"), error: $("u3Error"), errorMessage: $("u3ErrorMessage"),
    errorRetry: $("u3ErrorRetry"), form: $("u3Form"), fields: $("u3Fields"),
    saveState: $("u3SaveState"), cancel: $("u3Cancel"), reload: $("u3Reload"), save: $("u3Save"), actionBar: $("u3ActionBar"),
  };

  const state = {
    page: null,
    original: null,
    draft: null,
    dirty: false,
    loading: false,
    validationErrors: [],
    requestToken: 0,
  };

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function equal(left, right) { return JSON.stringify(left) === JSON.stringify(right); }
  function humanise(value) {
    return String(value).replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[-_]+/g, " ").replace(/^./, (c) => c.toUpperCase());
  }
  function installRegistry(registry) {
    if (!Array.isArray(registry)) return;
    const registered = new Set(GROUPS.flatMap((group) => group.pages.map((page) => page[2])));
    const modules = GROUPS.find((group) => group.title === "Modules");
    registry.forEach((module) => {
      if (typeof module !== "string" || registered.has(module)) return;
      const page = [module, humanise(module), module];
      modules.pages.push(page);
      PAGE_BY_ID.set(module, {
        id: module, label: humanise(module), module, sections: null,
        placeholder: false, category: modules.title,
      });
      registered.add(module);
    });
  }
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function apiMessage(payload, fallback) {
    return payload?.error?.message || payload?.message || fallback;
  }
  async function request(path, options) {
    const response = await fetch(`${API}${path}`, {
      headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
      ...options,
    });
    let payload;
    try { payload = await response.json(); } catch { payload = null; }
    if (!response.ok) {
      const error = new Error(apiMessage(payload, `Request failed (${response.status}).`));
      error.payload = payload;
      error.status = response.status;
      throw error;
    }
    return payload;
  }
  function openNav(open) {
    els.nav.classList.toggle("open", open);
    els.backdrop.classList.toggle("open", open);
    els.navToggle.setAttribute("aria-expanded", String(open));
  }
  function setDirty(dirty) {
    state.dirty = dirty;
    els.dirtyBadge.hidden = !dirty;
    els.cancel.disabled = !dirty || state.loading;
    els.save.disabled = !dirty || state.loading;
    els.saveState.textContent = dirty ? "Unsaved changes in this module" : "No unsaved changes";
  }
  function addNotice(message, kind = "") {
    const notice = document.createElement("div");
    notice.className = `u3-notice ${kind}`.trim();
    notice.textContent = message;
    els.notices.append(notice);
  }
  function clearNotices() { els.notices.replaceChildren(); }
  function confirmDiscard() {
    return !state.dirty || window.confirm("Discard unsaved changes in this settings module?");
  }
  function pageIdFromLocation() {
    const params = new URLSearchParams(location.search);
    const requested = params.get("page") || params.get("module") || location.hash.replace(/^#/, "");
    const aliases = { universal: "general", audio: "player", audioPlayer: "player", videoPlayer: "video", dj: "dj-studio" };
    const id = aliases[requested] || requested;
    if (PAGE_BY_ID.has(id)) return id;
    const registeredPage = [...PAGE_BY_ID.values()].find((page) => page.id !== "home" && page.module === requested);
    return registeredPage?.id || "home";
  }
  function updateLocation(id) {
    const url = new URL(location.href);
    url.searchParams.set("page", id);
    url.hash = "";
    history.replaceState(null, "", url);
  }
  function renderNavigation(filter = "") {
    const query = filter.trim().toLowerCase();
    els.navRoot.replaceChildren();
    GROUPS.forEach((group) => {
      const matches = group.pages.filter((page) =>
        `${group.title} ${page[1]} ${page[2]}`.toLowerCase().includes(query)
      );
      if (!matches.length) return;
      const section = document.createElement("section");
      section.className = "u3-nav-group";
      section.innerHTML = `<h2>${escapeHtml(group.title)}</h2><div class="u3-nav-items"></div>`;
      const items = section.querySelector(".u3-nav-items");
      matches.forEach((page) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `u3-nav-item${state.page?.id === page[0] ? " active" : ""}`;
        button.textContent = page[1];
        button.dataset.page = page[0];
        items.append(button);
      });
      els.navRoot.append(section);
    });
  }
  function valueAt(root, path) {
    return path.reduce((value, key) => value?.[key], root);
  }
  function setAt(root, path, value) {
    let target = root;
    path.slice(0, -1).forEach((key) => { target = target[key]; });
    target[path[path.length - 1]] = value;
  }
  function renderControl(path, value) {
    const key = path[path.length - 1];
    const pathString = path.join(".");
    const id = `setting-${pathString.replace(/[^a-z0-9]/gi, "-")}`;
    const error = state.validationErrors.find((item) => item.path === `${state.page.module}.${pathString}`);
    let control;
    if (typeof value === "boolean") {
      control = `<label class="u3-switch"><input id="${id}" data-path="${escapeHtml(pathString)}" data-kind="boolean" type="checkbox"${value ? " checked" : ""}><span>${value ? "Enabled" : "Disabled"}</span></label>`;
    } else if (Array.isArray(value)) {
      control = `<textarea id="${id}" data-path="${escapeHtml(pathString)}" data-kind="array" spellcheck="false">${escapeHtml(JSON.stringify(value, null, 2))}</textarea>`;
    } else if (ENUMS[key]?.includes(value)) {
      control = `<select id="${id}" data-path="${escapeHtml(pathString)}" data-kind="string">${ENUMS[key].map((option) => `<option value="${escapeHtml(option)}"${option === value ? " selected" : ""}>${escapeHtml(humanise(option))}</option>`).join("")}</select>`;
    } else {
      const type = typeof value === "number" ? "number" : "text";
      const step = typeof value === "number" && !Number.isInteger(value) ? "any" : "1";
      control = `<input id="${id}" data-path="${escapeHtml(pathString)}" data-kind="${type}" type="${type}" step="${step}" value="${escapeHtml(value)}">`;
    }
    return `
      <div class="u3-row" data-search="${escapeHtml(`${humanise(key)} ${pathString}`.toLowerCase())}">
        <div class="u3-copy"><label for="${id}">${escapeHtml(humanise(key))}</label><p>${escapeHtml(pathString)}</p></div>
        <div class="u3-control">${control}${error ? `<div class="u3-field-error">${escapeHtml(error.message)}</div>` : ""}</div>
      </div>`;
  }
  function renderObjectSection(sectionName, object) {
    const entries = Object.entries(object || {});
    return `
      <section class="u3-section" data-search="${escapeHtml(humanise(sectionName).toLowerCase())}">
        <header class="u3-section-heading"><h2>${escapeHtml(humanise(sectionName))}</h2><p>Persistent ${escapeHtml(state.page.module)} settings.</p></header>
        <div class="u3-section-fields">${entries.map(([key, value]) => renderControl(state.page.module === "dj" ? [sectionName, key] : [key], value)).join("")}</div>
      </section>`;
  }
  function renderFields() {
    const page = state.page;
    const data = state.draft || {};
    let html = "";
    if (page.placeholder) {
      html += `<section class="u3-placeholder"><h2>Planned settings area</h2><p>${escapeHtml(DESCRIPTIONS[page.id] || "This page will become editable when its settings are added to the shared schema.")}</p></section>`;
    }
    if (page.module === "dj") {
      const sections = page.sections || Object.keys(data);
      html += sections.filter((key) => data[key] && typeof data[key] === "object")
        .map((key) => renderObjectSection(key, data[key])).join("");
    } else if (!page.placeholder || Object.keys(data).length) {
      html += renderObjectSection(page.module, data);
    }
    els.fields.innerHTML = html || `<section class="u3-placeholder"><h2>No schema fields yet</h2><p>This page is connected to the shared API and will display controls when U1 defines them.</p></section>`;
    applyFieldSearch(els.search.value);
  }
  function applyFieldSearch(filter) {
    const query = filter.trim().toLowerCase();
    els.fields.querySelectorAll("[data-search]").forEach((node) => {
      node.hidden = Boolean(query) && !node.dataset.search.includes(query);
    });
  }
  function readInput(input) {
    if (input.dataset.kind === "boolean") return input.checked;
    if (input.dataset.kind === "number") return input.value === "" ? null : Number(input.value);
    if (input.dataset.kind === "array") return JSON.parse(input.value);
    return input.value;
  }
  function updateDraftFromInput(input) {
    try {
      setAt(state.draft, input.dataset.path.split("."), readInput(input));
      input.setAttribute("aria-invalid", "false");
      input.parentElement.querySelector(".u3-field-error")?.remove();
    } catch {
      input.setAttribute("aria-invalid", "true");
      if (!input.parentElement.querySelector(".u3-field-error")) {
        input.insertAdjacentHTML("afterend", `<div class="u3-field-error">Enter a valid JSON array.</div>`);
      }
    }
    if (input.dataset.kind === "boolean") input.nextElementSibling.textContent = input.checked ? "Enabled" : "Disabled";
    setDirty(!equal(state.original, state.draft));
  }
  function buildUpdate() {
    const update = {};
    Object.keys(state.draft || {}).forEach((key) => {
      if (!equal(state.original?.[key], state.draft[key])) update[key] = clone(state.draft[key]);
    });
    return update;
  }
  function showRequirements(requirements) {
    if (!requirements) return;
    if (requirements.serverRestartRequired) addNotice("A server restart is required before all saved changes take effect.", "warning");
    if (requirements.pageReloadRequired) addNotice("A page reload is required before all saved changes take effect.", "warning");
    if (requirements.mixerRestartRequired) addNotice("A DJ Mixer restart is required before all saved changes take effect.", "warning");
  }
  async function loadHealth() {
    try {
      const payload = await request("/health");
      const health = payload.data;
      els.health.className = `u3-health${health.state === "healthy" || health.state === "defaults" ? "" : health.state === "invalid" ? " error" : " warning"}`;
      els.healthText.textContent = health.message;
    } catch (error) {
      els.health.className = "u3-health error";
      els.healthText.textContent = `Settings health unavailable: ${error.message}`;
    }
  }
  async function loadPage(id, force = false) {
    if (!force && !confirmDiscard()) return;
    const page = PAGE_BY_ID.get(id) || PAGE_BY_ID.get("home");
    const token = ++state.requestToken;
    state.page = page;
    state.loading = true;
    state.validationErrors = [];
    setDirty(false);
    clearNotices();
    renderNavigation(els.search.value);
    updateLocation(page.id);
    els.category.textContent = page.category;
    els.title.textContent = page.label;
    els.description.textContent = DESCRIPTIONS[page.id] || `Persistent ${page.label} defaults from the shared BRMedia settings service.`;
    els.moduleBadge.textContent = page.module;
    els.loading.hidden = false;
    els.error.hidden = true;
    els.form.hidden = true;
    els.actionBar.hidden = false;
    delete els.fields.dataset.u7Page;
    delete els.fields.dataset.u8Page;
    openNav(false);
    try {
      const payload = await request(`/${encodeURIComponent(page.module)}`);
      if (token !== state.requestToken) return;
      state.original = clone(payload.data);
      state.draft = clone(payload.data);
      renderFields();
      els.loading.hidden = true;
      els.form.hidden = false;
      document.dispatchEvent(new CustomEvent("brmedia:settings-page-rendered", { detail: { page: page.id, module: page.module } }));
      showRequirements(payload.requirements);
      els.main.focus({ preventScroll: true });
    } catch (error) {
      if (token !== state.requestToken) return;
      els.loading.hidden = true;
      els.error.hidden = false;
      els.errorMessage.textContent = error.message;
    } finally {
      if (token === state.requestToken) state.loading = false;
    }
  }
  async function validateAndSave() {
    if (!state.dirty || state.loading) return;
    const invalidArray = els.fields.querySelector('[aria-invalid="true"]');
    if (invalidArray) {
      invalidArray.focus();
      addNotice("Correct invalid field values before saving.", "error");
      return;
    }
    state.loading = true;
    els.save.disabled = true;
    els.cancel.disabled = true;
    clearNotices();
    const update = buildUpdate();
    try {
      const previewPayload = await request(`/${encodeURIComponent(state.page.module)}/validate`, {
        method: "POST",
        body: JSON.stringify(update),
      });
      state.validationErrors = previewPayload.data.errors || [];
      if (!previewPayload.data.valid) {
        renderFields();
        addNotice("Validation failed. Review the marked settings.", "error");
        return;
      }
      showRequirements(previewPayload.data.requirements);
      const saved = await request(`/${encodeURIComponent(state.page.module)}`, {
        method: "PATCH",
        body: JSON.stringify(update),
      });
      state.original = clone(saved.data);
      state.draft = clone(saved.data);
      state.validationErrors = [];
      renderFields();
      setDirty(false);
      addNotice(`${state.page.label} settings saved.`, "success");
      showRequirements(saved.requirements);
      await loadHealth();
    } catch (error) {
      const details = error.payload?.error?.details || error.payload?.data?.errors;
      state.validationErrors = Array.isArray(details) ? details : [];
      renderFields();
      addNotice(error.message, "error");
    } finally {
      state.loading = false;
      setDirty(!equal(state.original, state.draft));
    }
  }

  els.navToggle.addEventListener("click", () => openNav(!els.nav.classList.contains("open")));
  els.backdrop.addEventListener("click", () => openNav(false));
  els.navRoot.addEventListener("click", (event) => {
    const button = event.target.closest("[data-page]");
    if (button) loadPage(button.dataset.page);
  });
  els.search.addEventListener("input", () => {
    renderNavigation(els.search.value);
    applyFieldSearch(els.search.value);
  });
  els.fields.addEventListener("input", (event) => {
    if (event.target.matches("[data-path]")) updateDraftFromInput(event.target);
  });
  els.fields.addEventListener("change", (event) => {
    if (event.target.matches("[data-path]")) updateDraftFromInput(event.target);
  });
  els.form.addEventListener("submit", (event) => { event.preventDefault(); validateAndSave(); });
  els.cancel.addEventListener("click", () => {
    state.draft = clone(state.original);
    state.validationErrors = [];
    clearNotices();
    renderFields();
    setDirty(false);
  });
  els.reload.addEventListener("click", () => loadPage(state.page.id));
  els.errorRetry.addEventListener("click", () => loadPage(state.page.id, true));
  els.healthReload.addEventListener("click", loadHealth);
  window.addEventListener("beforeunload", (event) => {
    if (!state.dirty) return;
    event.preventDefault();
    event.returnValue = "";
  });
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      validateAndSave();
    } else if (event.key === "Escape") {
      if (els.nav.classList.contains("open")) openNav(false);
      else if (state.dirty && window.confirm("Cancel unsaved changes in this module?")) els.cancel.click();
    } else if (event.key === "/" && !/input|textarea|select/i.test(document.activeElement?.tagName || "")) {
      event.preventDefault();
      els.search.focus();
    }
  });

  async function bootstrap() {
    const root = await request("").catch(() => null);
    installRegistry(root?.registry);
    renderNavigation();
    await Promise.all([loadHealth(), loadPage(pageIdFromLocation(), true)]);
  }
  bootstrap();
})();
