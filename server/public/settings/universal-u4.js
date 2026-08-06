(() => {
  "use strict";

  const API = "/api/settings";
  const U4_PAGES = new Set(["server", "library-sources", "paths-storage", "tools", "health-summary"]);
  const fields = document.getElementById("u3Fields");
  const notices = document.getElementById("u3Notices");
  const actionBar = document.querySelector(".u3-actions");
  let healthCache = null;
  let enhancing = false;

  if (!fields) return;

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[character]));
  }

  function formatBytes(value) {
    if (!Number.isFinite(value)) return "Unavailable";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let amount = Math.max(0, Number(value));
    let unit = 0;
    while (amount >= 1024 && unit < units.length - 1) {
      amount /= 1024;
      unit += 1;
    }
    return `${amount.toFixed(unit ? 1 : 0)} ${units[unit]}`;
  }

  function currentPage() {
    return new URLSearchParams(location.search).get("page") || "home";
  }

  async function api(path, options) {
    const response = await fetch(`${API}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(payload?.error?.message || payload?.message || `Request failed (${response.status}).`);
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  function notice(message, kind = "") {
    const node = document.createElement("div");
    node.className = `u3-notice ${kind}`.trim();
    node.textContent = message;
    notices?.replaceChildren(node);
  }

  async function loadHealth(force = false) {
    if (!healthCache || force) {
      healthCache = api(`/u4/health${force ? "?refresh=1" : ""}`).then((payload) => payload.data);
    }
    try {
      return await healthCache;
    } catch (error) {
      healthCache = null;
      throw error;
    }
  }

  function statusBadge(available, positive = "Available", negative = "Unavailable") {
    return `<span class="u3-badge${available ? "" : " warning"}">${escapeHtml(available ? positive : negative)}</span>`;
  }

  function toolPanel(health) {
    return `
      <section class="u3-section u4-panel">
        <header class="u3-section-heading">
          <h2>Tools and dependencies</h2>
          <p>Read-only checks with short timeouts. Nothing is installed or launched.</p>
        </header>
        <div class="u3-section-fields">
          ${health.tools.map((tool) => `
            <div class="u3-row">
              <div class="u3-copy">
                <label>${escapeHtml(tool.name)}</label>
                <p>${escapeHtml(tool.message)} Checked ${escapeHtml(tool.checkedAt)}.</p>
              </div>
              <div class="u3-control">
                ${statusBadge(tool.available)}
                <p>${escapeHtml(tool.executable)}${tool.version ? ` · ${escapeHtml(tool.version)}` : ""}</p>
              </div>
            </div>`).join("")}
        </div>
      </section>`;
  }

  function storagePanel(health) {
    return `
      <section class="u3-section u4-panel">
        <header class="u3-section-heading">
          <h2>Storage health</h2>
          <p>Read-only disk totals and bounded, non-recursive usage measurements.</p>
        </header>
        <div class="u3-section-fields">
          ${health.storage.map((storage) => `
            <div class="u3-row">
              <div class="u3-copy">
                <label>${escapeHtml(storage.label)}</label>
                <p>${escapeHtml(storage.message)}</p>
              </div>
              <div class="u3-control">
                ${statusBadge(storage.available, "Online", storage.configured ? "Unavailable" : "Not configured")}
                <p>Total ${formatBytes(storage.totalBytes)} · Free ${formatBytes(storage.freeBytes)} · Used ${formatBytes(storage.usedBytes)}</p>
                <p>Measured content ${formatBytes(storage.measuredBytes)}${storage.estimated ? " (bounded estimate)" : ""}</p>
              </div>
            </div>`).join("")}
        </div>
      </section>`;
  }

  function serverPanel(health) {
    return `
      <section class="u3-section u4-panel">
        <header class="u3-section-heading">
          <h2>Current server status</h2>
          <p>Read-only runtime status. Saving settings never restarts the server.</p>
        </header>
        <div class="u3-section-fields">
          <div class="u3-row"><div class="u3-copy"><label>HTTPS</label><p>Current request transport</p></div><div class="u3-control">${statusBadge(health.server.https === "active", "Active", "Not active")}</div></div>
          <div class="u3-row"><div class="u3-copy"><label>Tailscale</label><p>Detection only; configuration is not changed.</p></div><div class="u3-control"><span class="u3-badge">${escapeHtml(health.server.tailscale)}</span></div></div>
          <div class="u3-row"><div class="u3-copy"><label>Node runtime</label><p>${escapeHtml(health.server.platform)} · PID ${escapeHtml(health.server.pid)}</p></div><div class="u3-control"><span class="u3-badge">${escapeHtml(health.server.nodeVersion)}</span></div></div>
        </div>
      </section>`;
  }

  function refreshButton() {
    return `<button class="u3-button" type="button" data-u4-refresh>Refresh health</button>`;
  }

  async function renderHealthPage(page) {
    actionBar.hidden = true;
    fields.innerHTML = `<section class="u3-state u4-panel"><span class="u3-spinner"></span><h2>Checking health</h2><p>Checks run in parallel with timeouts.</p></section>`;
    try {
      const health = await loadHealth();
      if (currentPage() !== page) return;
      fields.innerHTML = page === "tools"
        ? `${toolPanel(health)}${refreshButton()}`
        : `${serverPanel(health)}${toolPanel(health)}${storagePanel(health)}${refreshButton()}`;
    } catch (error) {
      fields.innerHTML = `<section class="u3-state u4-panel"><h2>Health unavailable</h2><p>${escapeHtml(error.message)}</p>${refreshButton()}</section>`;
    }
  }

  async function appendPageHealth(page) {
    actionBar.hidden = false;
    try {
      const health = await loadHealth();
      if (currentPage() !== page || fields.querySelector(".u4-panel")) return;
      fields.insertAdjacentHTML("beforeend", page === "server" ? serverPanel(health) : storagePanel(health));
      fields.insertAdjacentHTML("beforeend", refreshButton());
    } catch (error) {
      fields.insertAdjacentHTML("beforeend", `<div class="u3-notice error u4-panel">Health unavailable: ${escapeHtml(error.message)}</div>`);
    }
  }

  function sourceKey(value) {
    return String(value || "").trim().replace(/[\\/]+$/, "").toLowerCase();
  }

  async function renderLibrarySources() {
    actionBar.hidden = true;
    fields.innerHTML = `<section class="u3-state u4-panel"><span class="u3-spinner"></span><h2>Loading library sources</h2></section>`;
    try {
      const [libraryPayload, health] = await Promise.all([api("/library"), loadHealth()]);
      if (currentPage() !== "library-sources") return;
      const persisted = Array.isArray(libraryPayload.data.sources) ? libraryPayload.data.sources : [];
      const runtime = Array.isArray(health.librarySources) ? health.librarySources : [];
      let original = structuredClone(persisted.length ? persisted : runtime.map((source) => ({
        id: source.id,
        label: source.label,
        path: source.path,
        type: source.type,
        enabled: source.enabled,
        includeSubfolders: source.includeSubfolders,
      })));
      let draft = structuredClone(original);

      const draw = () => {
        const runtimeByPath = new Map(runtime.map((source) => [sourceKey(source.path), source]));
        fields.innerHTML = `
          <section class="u3-section u4-panel">
            <header class="u3-section-heading">
              <h2>Library Sources</h2>
              <p>Changes write only to shared settings. No rescan runs automatically.</p>
            </header>
            <div class="u3-section-fields">
              ${draft.map((source, index) => {
                const status = runtimeByPath.get(sourceKey(source.path));
                return `
                  <div class="u3-row" data-source-index="${index}">
                    <div class="u3-copy">
                      <label for="u4-source-path-${index}">${escapeHtml(source.label || `Source ${index + 1}`)}</label>
                      <p>${status ? `${status.status}; readable ${status.readable ? "yes" : "no"}; exists ${status.exists ? "yes" : "no"}` : "New shared source; validate before saving."}</p>
                    </div>
                    <div class="u3-control">
                      <input id="u4-source-path-${index}" data-source-field="path" value="${escapeHtml(source.path)}" aria-label="Source path">
                      <select data-source-field="type" aria-label="Source type">
                        ${["audio", "video", "both"].map((type) => `<option value="${type}"${source.type === type ? " selected" : ""}>${type}</option>`).join("")}
                      </select>
                      <label class="u3-switch"><input data-source-field="enabled" type="checkbox"${source.enabled ? " checked" : ""}><span>Enabled</span></label>
                      <label class="u3-switch"><input data-source-field="includeSubfolders" type="checkbox"${source.includeSubfolders ? " checked" : ""}><span>Include subfolders</span></label>
                      <button class="u3-button" data-remove-source="${index}" type="button">Remove</button>
                    </div>
                  </div>`;
              }).join("") || `<div class="u3-row"><div class="u3-copy"><label>No sources</label><p>Add an approved audio or video folder below.</p></div></div>`}
            </div>
          </section>
          <section class="u3-section u4-panel">
            <header class="u3-section-heading"><h2>Add source</h2><p>The server validates the folder without creating or scanning it.</p></header>
            <div class="u3-row">
              <div class="u3-copy"><label for="u4-new-path">Folder path</label><p>Absolute Windows path; network and system roots are rejected.</p></div>
              <div class="u3-control">
                <input id="u4-new-path" autocomplete="off" placeholder="D:\\Media\\Audio">
                <select id="u4-new-type" aria-label="New source type"><option value="audio">Audio</option><option value="video">Video</option><option value="both">Audio and video</option></select>
                <button id="u4-add-source" class="u3-button" type="button">Validate and add</button>
              </div>
            </div>
          </section>
          <div class="u3-placeholder u4-panel"><p id="u4-source-state">No unsaved Library Sources changes.</p></div>
          <div class="u3-buttons u4-panel">
            <button id="u4-source-cancel" class="u3-button" type="button">Cancel</button>
            <button id="u4-source-reload" class="u3-button" type="button">Reload</button>
            <button id="u4-source-save" class="u3-button primary" type="button">Save Library Sources</button>
          </div>`;
        const dirty = JSON.stringify(original) !== JSON.stringify(draft);
        document.getElementById("u4-source-state").textContent = dirty
          ? "Unsaved Library Sources changes. A rescan may be required after later migration."
          : "No unsaved Library Sources changes.";
        document.getElementById("u4-source-save").disabled = !dirty;
        document.getElementById("u4-source-cancel").disabled = !dirty;
      };

      const updateDraft = (target) => {
        const row = target.closest("[data-source-index]");
        if (!row) return;
        const source = draft[Number(row.dataset.sourceIndex)];
        const field = target.dataset.sourceField;
        source[field] = target.type === "checkbox" ? target.checked : target.value;
        document.getElementById("u4-source-state").textContent = "Unsaved Library Sources changes.";
        document.getElementById("u4-source-save").disabled = false;
        document.getElementById("u4-source-cancel").disabled = false;
      };

      draw();
      fields.oninput = (event) => {
        if (event.target.matches("[data-source-field]")) updateDraft(event.target);
      };
      fields.onchange = fields.oninput;
      fields.onclick = async (event) => {
        const remove = event.target.closest("[data-remove-source]");
        if (remove) {
          draft.splice(Number(remove.dataset.removeSource), 1);
          draw();
          return;
        }
        if (event.target.id === "u4-add-source") {
          const pathInput = document.getElementById("u4-new-path");
          const typeInput = document.getElementById("u4-new-type");
          const requestedPath = pathInput.value.trim();
          if (draft.some((source) => sourceKey(source.path) === sourceKey(requestedPath))) {
            notice("That source path is already listed.", "error");
            return;
          }
          try {
            const validation = await api("/u4/validate-path", {
              method: "POST",
              body: JSON.stringify({ path: requestedPath, access: "read", requireExisting: true }),
            });
            draft.push({
              id: `source-${Date.now().toString(36)}`,
              label: requestedPath.split(/[\\/]/).filter(Boolean).pop() || "Library source",
              path: validation.data.normalizedPath,
              type: typeInput.value,
              enabled: true,
              includeSubfolders: true,
            });
            draw();
          } catch (error) {
            notice(error.payload?.data?.message || error.message, "error");
          }
          return;
        }
        if (event.target.id === "u4-source-cancel") {
          draft = structuredClone(original);
          draw();
          return;
        }
        if (event.target.id === "u4-source-reload") {
          enhance(true);
          return;
        }
        if (event.target.id === "u4-source-save") {
          const enabled = draft.filter((source) => source.enabled);
          const update = {
            sources: draft,
            audioRoots: enabled.filter((source) => source.type === "audio" || source.type === "both").map((source) => source.path),
            videoRoots: enabled.filter((source) => source.type === "video" || source.type === "both").map((source) => source.path),
          };
          try {
            await api("/library/validate", { method: "POST", body: JSON.stringify(update) });
            const saved = await api("/library", { method: "PATCH", body: JSON.stringify(update) });
            original = structuredClone(saved.data.sources);
            draft = structuredClone(saved.data.sources);
            draw();
            notice("Library Sources saved. No rescan or restart was triggered.", "success");
          } catch (error) {
            const details = error.payload?.data?.errors || error.payload?.error?.details || [];
            notice(details[0]?.message || error.message, "error");
          }
        }
      };
    } catch (error) {
      fields.innerHTML = `<section class="u3-state u4-panel"><h2>Library Sources unavailable</h2><p>${escapeHtml(error.message)}</p></section>`;
    }
  }

  async function enhance(force = false) {
    const page = currentPage();
    if (!U4_PAGES.has(page)) {
      actionBar.hidden = false;
      return;
    }
    if (enhancing) return;
    if (!force && fields.querySelector(".u4-panel")) return;
    enhancing = true;
    try {
      if (force) healthCache = null;
      if (page === "library-sources") await renderLibrarySources();
      else if (page === "tools" || page === "health-summary") await renderHealthPage(page);
      else await appendPageHealth(page);
    } finally {
      enhancing = false;
    }
  }

  fields.addEventListener("click", (event) => {
    if (!event.target.closest("[data-u4-refresh]")) return;
    healthCache = null;
    fields.querySelectorAll(".u4-panel").forEach((node) => node.remove());
    enhance(true);
  });

  new MutationObserver(() => {
    if (!fields.querySelector(".u4-panel")) queueMicrotask(() => enhance());
  }).observe(fields, { childList: true });

  window.addEventListener("popstate", () => enhance(true));
  enhance();
})();
