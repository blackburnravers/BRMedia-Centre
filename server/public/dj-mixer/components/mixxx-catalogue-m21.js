(() => {
  "use strict";

  const PAGE_SIZE = 48;
  const CACHE_TTL_MS = 30_000;
  const STORAGE_KEY = "brmedia.dj.mixxx.catalogue.m21.v2";
  function opaqueId() {
    if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
    const bytes = new Uint8Array(16);
    if (typeof globalThis.crypto?.getRandomValues === "function") globalThis.crypto.getRandomValues(bytes);
    else for (let index=0;index<bytes.length;index++) bytes[index]=Math.floor(Math.random()*256);
    return [...bytes].map(value=>value.toString(16).padStart(2,"0")).join("");
  }
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch {}
  const state = { folder: saved.folder || "", offset: Number(saved.offset || 0), search: saved.search || "", sort: saved.sort || "title-asc", scope: saved.scope || "folder", view: saved.view || "folder", source: saved.source || "mixxx", generation: 0, controller: null, loadCapabilities: null };
  const cache = new Map();
  const pending = new Map();
  const tracksById = new Map();
  const sourceSession = sessionStorage.getItem("brmedia.mixxx.load.session") || `brmedia-${opaqueId()}`;
  sessionStorage.setItem("brmedia.mixxx.load.session", sourceSession);
  let loadSequence = 0;

  async function preserveLoadIntent(panel, identity, deck) {
    const generation = Number(localStorage.getItem(`brmedia.mixxx.load.generation.${deck}`) || 0) + 1;
    localStorage.setItem(`brmedia.mixxx.load.generation.${deck}`, String(generation));
    const requestId = `load_${opaqueId().replace(/-/g, "")}`;
    const intent = { protocolVersion: 5, sourceSession, requestId, commandSequence: ++loadSequence, deck,
      catalogueIdentity: identity, catalogueRevision: Number(panel.dataset.catalogueRevision || 0),
      autoplay: false, replacePlayingDeck: false, clientGeneration: generation };
    localStorage.setItem(`brmedia.mixxx.pendingLoad.${deck}`, JSON.stringify(intent));
    const status = panel.querySelector("[data-mixxx-status]");
    status.textContent = `Deck ${deck} intent saved; checking runtime compatibility…`;
    try {
      const response = await fetch("/api/dj/mixxx/load", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(intent) });
      const result = await response.json().catch(() => ({}));
      const acknowledgement = result.acknowledgement;
      status.textContent = acknowledgement?.message || result.error || "Mixxx load request rejected.";
      panel.dataset.loadState = acknowledgement?.state || "rejected";
      if (acknowledgement?.accepted) await followLoad(panel, acknowledgement.requestId, deck);
    } catch { status.textContent = "Load intent saved, but BRMedia could not reach the compatibility provider."; }
  }

  async function followLoad(panel, requestId, deck) {
    for (let attempt = 0; attempt < 20; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 750));
      const response = await fetch("/api/dj/mixxx/load/capabilities", { headers: { Accept: "application/json" } });
      if (!response.ok) return;
      const payload = await response.json(), acknowledgement = payload.pending?.[deck];
      if (!acknowledgement || acknowledgement.requestId !== requestId) return;
      panel.querySelector("[data-mixxx-status]").textContent = acknowledgement.message;
      panel.dataset.loadState = acknowledgement.state;
      const button = panel.querySelector(`[data-mixxx-load-deck="${deck}"][data-mixxx-load-identity="${CSS.escape(acknowledgement.stableIdentity || "")}"]`);
      if (button) button.textContent = acknowledgement.state === "loaded" ? "Loaded" : acknowledgement.state === "failed" || acknowledgement.state === "timed-out" ? "Failed" : "Loading";
      if (["loaded", "failed", "timed-out", "rejected", "superseded"].includes(acknowledgement.state)) return;
    }
  }

  async function refreshLoadCapabilities(panel) {
    try {
      const response = await fetch("/api/dj/mixxx/load/capabilities", { headers: { Accept: "application/json" } });
      const payload = response.ok ? await response.json() : null;
      state.loadCapabilities = payload?.capabilities || null;
    } catch { state.loadCapabilities = null; }
    const notice = panel.querySelector("[data-mixxx-load-notice]");
    if (notice) notice.textContent = state.loadCapabilities?.supported
      ? "Compatible Mixxx loading is ready. Tracks load without autoplay."
      : state.loadCapabilities?.reason || "Mixxx loading is unavailable because the bridge is disconnected.";
  }

  async function loadNativeFallback(panel, identity, deck) {
    if (document.documentElement.dataset.djBackend === "mixxx") throw new Error("Select BRMedia Native before using the Native fallback.");
    const track = tracksById.get(identity), loader = window.BRMediaDjLibraryLoader?.loadItemIntoDeck;
    if (!track || typeof loader !== "function") throw new Error("The BRMedia Native loader is unavailable.");
    panel.querySelector("[data-mixxx-status]").textContent = `Loading ${track.title || track.filename || "track"} into Native Deck ${deck}…`;
    await loader(deck === 2 ? "d2" : "d1", {
      id: track.id,
      source: "mixxx-catalogue-native",
      streamUrl: `/api/dj/mixxx/catalogue/${encodeURIComponent(track.id)}/download`,
      filename: track.filename,
      title: track.title,
      artist: track.artist,
      bpm: track.bpm,
      key: track.key,
      artworkUrl: track.artworkAvailable ? `/api/dj/mixxx/catalogue/${encodeURIComponent(track.id)}/artwork` : "",
      _brDjWaveformPrepared: track.waveformAssociation?.waveformAvailable === true,
      waveformLibraryItemId: track.waveformAssociation?.brmediaTrackId || "",
      djGridBpm: track.waveformAssociation?.gridAvailable ? track.bpm : null,
      djGridLocked: true,
      disableWaveformGeneration: track.waveformAssociation?.waveformAvailable !== true,
    });
    panel.querySelector("[data-mixxx-status]").textContent = `Loaded Native Deck ${deck} — press Play when ready.`;
  }

  function formatDuration(value) {
    if (!Number.isFinite(Number(value))) return "Duration unknown";
    const seconds = Math.max(0, Math.round(Number(value)));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  }

  function cacheGet(key) {
    const entry = cache.get(key);
    if (!entry || Date.now() - entry.time > CACHE_TTL_MS) { cache.delete(key); return null; }
    return entry.value;
  }

  function cacheSet(key, value) {
    cache.set(key, { time: Date.now(), value });
    while (cache.size > 16) cache.delete(cache.keys().next().value);
  }

  function saveState(extra = {}) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ folder: state.folder, offset: state.offset, search: state.search, sort: state.sort, scope: state.scope, view: state.view, source: state.source, ...extra })); } catch {}
  }

  function highlighted(value, query) {
    const text = String(value || ""), needle = String(query || "").trim();
    if (!needle) return document.createTextNode(text);
    const fragment = document.createDocumentFragment(), lower = text.toLocaleLowerCase(), target = needle.toLocaleLowerCase();
    let cursor = 0;
    while (cursor < text.length) {
      const index = lower.indexOf(target, cursor);
      if (index < 0) { fragment.append(document.createTextNode(text.slice(cursor))); break; }
      fragment.append(document.createTextNode(text.slice(cursor, index)));
      const mark = document.createElement("mark"); mark.textContent = text.slice(index, index + needle.length); fragment.append(mark);
      cursor = index + needle.length;
    }
    return fragment;
  }

  function endpoint() {
    const params = new URLSearchParams({ folder: state.folder, offset: String(state.offset), limit: String(PAGE_SIZE), search: state.search, sort: state.sort, scope: state.scope, view: state.view });
    return `/api/dj/mixxx/catalogue?${params}`;
  }

  function render(panel, data) {
    panel.querySelector("[data-mixxx-path]").textContent = data.folder ? `Music / ${data.folder}` : "Music";
    panel.querySelector("[data-mixxx-up]").disabled = data.parentFolder === null;
    panel.querySelector("[data-mixxx-status]").textContent = `${data.total.toLocaleString()} tracks in this view · read-only`;
    const list = panel.querySelector("[data-mixxx-results]");
    list.replaceChildren();
    for (const folder of data.folders) {
      const button = document.createElement("button");
      button.type = "button"; button.className = "brMixxxCatalogueFolder"; button.dataset.mixxxFolder = folder.folder;
      button.innerHTML = '<i class="fa-solid fa-folder" aria-hidden="true"></i><span></span><i class="fa-solid fa-chevron-right" aria-hidden="true"></i>';
      button.querySelector("span").textContent = folder.name;
      list.appendChild(button);
    }
    for (const track of data.items) {
      tracksById.set(track.id, track);
      const row = document.createElement("article"); row.className = "brMixxxCatalogueTrack"; row.dataset.mixxxIdentity = track.id;
      const artwork = document.createElement("div"); artwork.className = "brMixxxCatalogueArtwork";
      if (track.artworkAvailable) { const image = document.createElement("img"); image.loading = "lazy"; image.alt = ""; image.src = `/api/dj/mixxx/catalogue/${encodeURIComponent(track.id)}/artwork`; image.addEventListener("error", () => artwork.classList.add("is-placeholder"), { once: true }); artwork.append(image); }
      else artwork.classList.add("is-placeholder");
      const heading = document.createElement("strong"); heading.append(highlighted(track.title || track.filename || "Untitled track", state.search));
      const artist = document.createElement("span"); artist.append(highlighted(track.artist || "Artist unknown", state.search));
      const facts = document.createElement("small");
      facts.textContent = [track.album, track.bpm == null ? null : `${track.bpm} BPM`, track.key, formatDuration(track.duration)].filter(Boolean).join(" · ");
      const file = document.createElement("small"); file.append(highlighted(track.relativePath || track.filename || "", state.search)); file.title = track.relativePath || track.filename || "";
      const flags = document.createElement("small");
      flags.textContent = [track.analysed ? "Analysed" : "Analysis unknown", track.artworkAvailable ? "Artwork" : null, track.waveformAssociation?.waveformAvailable ? "BRMedia waveform linked" : "No BRMedia waveform link", `ID ${track.id}`].filter(Boolean).join(" · ");
      const actions = document.createElement("div"); actions.className = "brMixxxCatalogueActions";
      const download = document.createElement("a"); download.href = `/api/dj/mixxx/catalogue/${encodeURIComponent(track.id)}/download`; download.textContent = "Download Original"; download.setAttribute("download", track.filename || "");
      const d1 = document.createElement("button"); d1.type = "button"; d1.dataset.mixxxLoadDeck = "1"; d1.dataset.mixxxLoadIdentity = track.id; d1.textContent = "Load D1";
      const d2 = document.createElement("button"); d2.type = "button"; d2.dataset.mixxxLoadDeck = "2"; d2.dataset.mixxxLoadIdentity = track.id; d2.textContent = "Load D2";
      for (const button of [d1, d2]) { button.disabled = state.loadCapabilities?.supported !== true; button.setAttribute("aria-disabled", String(button.disabled)); button.title = button.disabled ? state.loadCapabilities?.reason || "Bridge disconnected or runtime unsupported." : "Load into Mixxx without autoplay"; }
      const native1 = document.createElement("button"); native1.type = "button"; native1.dataset.nativeLoadDeck = "1"; native1.dataset.nativeLoadIdentity = track.id; native1.textContent = "Native D1 fallback";
      const native2 = document.createElement("button"); native2.type = "button"; native2.dataset.nativeLoadDeck = "2"; native2.dataset.nativeLoadIdentity = track.id; native2.textContent = "Native D2 fallback";
      for (const button of [native1, native2]) { button.disabled = document.documentElement.dataset.djBackend === "mixxx"; button.title = button.disabled ? "Select BRMedia Native to use this explicit fallback." : "Load through BRMedia Native without autoplay"; }
      actions.append(download, d1, d2, native1, native2);
      row.append(artwork, heading, artist, facts, file, flags, actions); list.appendChild(row);
    }
    if (!data.folders.length && !data.items.length) {
      const empty = document.createElement("p"); empty.className = "brMixxxCatalogueEmpty"; empty.textContent = "No matching folders or tracks."; list.appendChild(empty);
    }
    panel.querySelector("[data-mixxx-previous]").disabled = data.offset === 0;
    panel.querySelector("[data-mixxx-next]").disabled = data.nextOffset === null;
    panel.querySelector("[data-mixxx-page]").textContent = `Page ${Math.floor(data.offset / data.limit) + 1}`;
    panel.dataset.parentFolder = data.parentFolder ?? "";
    panel.dataset.catalogueRevision = String(Math.floor(Number(data.databaseMtime || 0)));
    saveState({ scrollTop: list.scrollTop });
    requestAnimationFrame(() => { list.scrollTop = Number(saved.scrollTop || 0); saved.scrollTop = 0; });
  }

  async function load(panel, force = false) {
    const url = endpoint();
    if (!force && pending.has(url)) return;
    state.controller?.abort();
    state.controller = new AbortController();
    const generation = ++state.generation;
    panel.querySelector("[data-mixxx-status]").textContent = "Loading Mixxx Library…";
    panel.setAttribute("aria-busy", "true");
    try {
      await refreshLoadCapabilities(panel);
      let data = force ? null : cacheGet(url);
      if (!data) {
        let task = force ? null : pending.get(url);
        if (!task) {
          task = fetch(url, { signal: state.controller.signal, headers: { Accept: "application/json" } }).then(async response => {
            if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || `Catalogue request failed (${response.status})`);
            const value = await response.json(); cacheSet(url, value); return value;
          }).finally(() => pending.delete(url));
          pending.set(url, task);
        }
        data = await task;
      }
      if (generation !== state.generation) return;
      render(panel, data);
    } catch (error) {
      if (error?.name === "AbortError" || generation !== state.generation) return;
      panel.querySelector("[data-mixxx-status]").textContent = `${error?.message || "Mixxx Library unavailable"}. Use Refresh to try again.`;
    } finally {
      if (generation === state.generation) panel.removeAttribute("aria-busy");
    }
  }

  function attach(sheet) {
    if (sheet.dataset.mixxxCatalogueAttached) return;
    sheet.dataset.mixxxCatalogueAttached = "true";
    const header = sheet.querySelector(".brDjPerformanceLibraryPageHeader");
    const tabs = document.createElement("div"); tabs.className = "brLibrarySourceTabs";
    tabs.innerHTML = '<button type="button" data-library-source="mixxx">Mixxx Library — H:\\Music</button><button type="button" data-library-source="brmedia">BRMedia Library</button><button type="button" data-library-workflow="set-plan">Collections / Set Plans</button>';
    header?.after(tabs);
    const panel = document.createElement("section"); panel.className = "brMixxxCatalogue"; panel.hidden = state.source !== "mixxx";
    panel.innerHTML = `
      <div class="brMixxxCatalogueNav"><button type="button" data-mixxx-up>Up</button><strong data-mixxx-path>Music</strong><button type="button" data-mixxx-refresh aria-label="Refresh Mixxx Library">Refresh</button></div>
      <div class="brMixxxCatalogueControls"><input type="search" data-mixxx-search placeholder="Search title, artist, filename, album, folder or comments"><select data-mixxx-scope aria-label="Search scope"><option value="folder">Current folder</option><option value="library">Whole library</option></select><select data-mixxx-view aria-label="Library view"><option value="folder">Folder View</option><option value="flat">Flat View</option><option value="recently-added">Recently Added</option></select><select data-mixxx-sort aria-label="Sort Mixxx Library"><option value="title-asc">Title</option><option value="artist-asc">Artist</option><option value="folder-asc">Folder</option><option value="duration-asc">Duration</option><option value="date-added-desc">Date Added</option><option value="bpm-asc">BPM</option><option value="key-asc">Key</option><option value="filename-asc">Filename</option></select></div>
      <p class="brMixxxCatalogueNotice" data-mixxx-load-notice>Checking Mixxx loading capability…</p>
      <div data-mixxx-status role="status">Select Mixxx Library to browse.</div><div data-mixxx-results class="brMixxxCatalogueResults"></div>
      <nav class="brMixxxCataloguePager"><button type="button" data-mixxx-previous>Previous</button><span data-mixxx-page>Page 1</span><button type="button" data-mixxx-next>Next</button></nav>`;
    sheet.querySelector(".brDjPerformanceLibraryPanel")?.append(panel);
    tabs.addEventListener("click", (event) => {
      const workflow = event.target.closest("[data-library-workflow]");
      if (workflow) { const local=document.querySelector('[data-dj-view-link="set-plan"]'); if(local){sheet.setAttribute("aria-hidden","true");local.click();}else window.location.href="/dj-mixer/?view=set-plan"; return; }
      const button = event.target.closest("[data-library-source]"); if (!button) return;
      const mixxx = button.dataset.librarySource === "mixxx";
      state.source = mixxx ? "mixxx" : "brmedia";
      sheet.classList.toggle("is-mixxx-library-source", mixxx); panel.hidden = !mixxx;
      tabs.querySelectorAll("button").forEach((item) => item.classList.toggle("is-active", item === button));
      saveState();
      if (mixxx) load(panel);
    });
    panel.addEventListener("click", (event) => {
      const nativeButton = event.target.closest("[data-native-load-deck]");
      if (nativeButton) { if (!nativeButton.disabled) loadNativeFallback(panel, nativeButton.dataset.nativeLoadIdentity, Number(nativeButton.dataset.nativeLoadDeck)).catch((error) => { panel.querySelector("[data-mixxx-status]").textContent = error?.message || "Native fallback load failed."; }); return; }
      const loadButton = event.target.closest("[data-mixxx-load-deck]");
      if (loadButton) { if (!loadButton.disabled) preserveLoadIntent(panel, loadButton.dataset.mixxxLoadIdentity, Number(loadButton.dataset.mixxxLoadDeck)); return; }
      const folder = event.target.closest("[data-mixxx-folder]");
      if (folder) { state.folder = folder.dataset.mixxxFolder; state.offset = 0; load(panel); return; }
      if (event.target.closest("[data-mixxx-up]")) { state.folder = panel.dataset.parentFolder || ""; state.offset = 0; load(panel); }
      if (event.target.closest("[data-mixxx-refresh]")) load(panel, true);
      if (event.target.closest("[data-mixxx-previous]")) { state.offset = Math.max(0, state.offset - PAGE_SIZE); load(panel); }
      if (event.target.closest("[data-mixxx-next]")) { state.offset += PAGE_SIZE; load(panel); }
    });
    let searchTimer;
    panel.querySelector("[data-mixxx-search]").value = state.search;
    panel.querySelector("[data-mixxx-search]").addEventListener("input", (event) => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { state.search = event.target.value.trim(); state.offset = 0; saveState(); load(panel); }, 220); });
    panel.querySelector("[data-mixxx-sort]").addEventListener("change", (event) => { state.sort = event.target.value; state.offset = 0; load(panel); });
    panel.querySelector("[data-mixxx-scope]").value = state.scope;
    panel.querySelector("[data-mixxx-view]").value = state.view;
    panel.querySelector("[data-mixxx-sort]").value = state.sort;
    panel.querySelector("[data-mixxx-scope]").addEventListener("change", (event) => { state.scope = event.target.value; state.offset = 0; load(panel); });
    panel.querySelector("[data-mixxx-view]").addEventListener("change", (event) => { state.view = event.target.value; state.offset = 0; load(panel); });
    let scrollFrame = 0;
    panel.querySelector("[data-mixxx-results]").addEventListener("scroll", () => {
      if (scrollFrame) return;
      scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; saveState({ scrollTop: panel.querySelector("[data-mixxx-results]").scrollTop }); });
    }, { passive: true });
    const initial=tabs.querySelector(`[data-library-source="${state.source}"]`)||tabs.querySelector('[data-library-source="mixxx"]');initial.classList.add("is-active");sheet.classList.toggle("is-mixxx-library-source",state.source==="mixxx");if(state.source==="mixxx")load(panel);
  }

  const observe = () => document.querySelectorAll("[data-dj-performance-library]").forEach(attach);
  const observer = new MutationObserver(observe);
  observe(); observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("pagehide", () => { state.controller?.abort(); observer.disconnect(); }, { once: true });
})();
