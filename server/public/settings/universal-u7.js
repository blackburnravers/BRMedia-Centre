(() => {
  "use strict";

  const SECTION_BY_PAGE = Object.freeze({
    "health-summary": "summary",
    "server-health": "server",
    "tools": "tools",
    "storage-health": "storage",
    "library-health": "library",
    "media-health": "mediaModules",
    "dj-health": "dj",
    "jobs-health": "jobs",
    "logs-health": "logs",
    "settings-store-health": "settingsStore",
  });

  const cards = document.getElementById("u3Fields");
  const actionBar = document.getElementById("u3ActionBar");
  let rendering = false;
  let activePage = "";

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function humanBytes(value) {
    const bytes = Number(value);
    if (!Number.isFinite(bytes)) return "Unavailable";
    if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
    if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${Math.round(bytes)} B`;
  }

  function detailValue(key, value) {
    if (/bytes$/i.test(key) && typeof value === "number") return humanBytes(value);
    if (value === null || value === undefined || value === "") return "Unavailable";
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    return String(value);
  }

  function renderCheck(check) {
    const details = Object.entries(check.details || {});
    return `
      <article class="u3-section-card u7-check is-${escapeHtml(check.state)}">
        <div class="u3-section-heading">
          <div>
            <h4>${escapeHtml(check.label)}</h4>
            <p>${escapeHtml(check.message)}</p>
          </div>
          <span class="settingsBadge">${escapeHtml(check.state)}</span>
        </div>
        <p class="u3-field-help">
          Checked ${escapeHtml(new Date(check.checkedAt).toLocaleString())}
          · ${escapeHtml(check.durationMs)} ms
          ${check.actionRequired ? " · Action recommended" : ""}
        </p>
        ${(check.recommendations || []).length
          ? `<ul>${check.recommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
          : ""}
        ${details.length ? `
          <details>
            <summary>Safe technical details</summary>
            <dl class="u7-details">
              ${details.map(([key, value]) => `
                <div>
                  <dt>${escapeHtml(key)}</dt>
                  <dd><pre>${escapeHtml(detailValue(key, value))}</pre></dd>
                </div>`).join("")}
            </dl>
          </details>` : ""}
      </article>`;
  }

  async function request(section, refresh = false) {
    const path = refresh
      ? "/api/settings/health/diagnostics/refresh"
      : `/api/settings/health/diagnostics/${encodeURIComponent(section)}`;
    const response = await fetch(path, {
      method: refresh ? "POST" : "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.ok !== true) {
      throw new Error(body?.error?.message || "Health diagnostics are unavailable.");
    }
    if (refresh) return body.data.sections.find((item) => item.name === section);
    return body.data;
  }

  async function render(page, refresh = false) {
    const sectionName = SECTION_BY_PAGE[page];
    if (!sectionName || !cards || rendering) return;
    rendering = true;
    activePage = page;
    if (actionBar) actionBar.hidden = true;
    cards.dataset.u7Page = page;
    cards.innerHTML = `
      <section class="u3-section-card">
        <div class="u3-section-heading">
          <div><h4>Loading health checks</h4><p>Running bounded read-only checks…</p></div>
          <span class="settingsBadge">Loading</span>
        </div>
      </section>`;
    try {
      const section = await request(sectionName, refresh);
      if (activePage !== page) return;
      const checks = section?.checks || [];
      cards.innerHTML = `
        <section class="u3-section-card">
          <div class="u3-section-heading">
            <div>
              <h4>${escapeHtml(section?.label || "Health Diagnostics")}</h4>
              <p>Read-only status. Refresh never starts, retries, deletes or cleans anything.</p>
            </div>
            <span class="settingsBadge">${escapeHtml(section?.state || "unknown")}</span>
          </div>
          <button id="u7RefreshHealth" class="u3-primary-button" type="button">Refresh Health</button>
        </section>
        ${checks.length ? checks.map(renderCheck).join("") : `
          <section class="u3-section-card">
            <p>This diagnostics section returned no checks.</p>
          </section>`}`;
      document.getElementById("u7RefreshHealth")?.addEventListener("click", () => render(page, true));
    } catch (error) {
      cards.innerHTML = `
        <section class="u3-section-card">
          <div class="u3-section-heading">
            <div><h4>Partial diagnostics failure</h4><p>${escapeHtml(error.message)}</p></div>
            <span class="settingsBadge">Unavailable</span>
          </div>
          <button id="u7RefreshHealth" class="u3-primary-button" type="button">Retry</button>
        </section>`;
      document.getElementById("u7RefreshHealth")?.addEventListener("click", () => render(page, true));
    } finally {
      rendering = false;
    }
  }

  const observer = new MutationObserver(() => {
    const selected = document.querySelector(".u3-nav-item.active");
    const page = selected?.dataset.page || "";
    if (!SECTION_BY_PAGE[page]) return;
    if (cards?.dataset.u7Page === page) return;
    render(page);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
