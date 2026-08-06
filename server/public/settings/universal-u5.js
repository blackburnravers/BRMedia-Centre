(() => {
  "use strict";

  const MODULE_BY_PAGE = Object.freeze({
    player: "audioPlayer",
    video: "videoPlayer",
    converter: "converter",
    tagger: "tagger",
    mastering: "mastering",
    torrents: "torrents",
  });

  let inventory = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function loadInventory() {
    if (inventory) return inventory;
    const response = await fetch("/api/settings/u5/compatibility", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.ok !== true || !Array.isArray(body.data)) {
      throw new Error(body?.error?.message || "Media settings compatibility status is unavailable.");
    }
    inventory = body.data;
    return inventory;
  }

  function plannedList(items) {
    if (!items.length) return "";
    return `
      <div class="u3-planned-card" role="note">
        <strong>Planned or unavailable</strong>
        <p>These controls are not presented as editable because the current module does not support them through shared settings yet.</p>
        <ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </div>`;
  }

  async function enhance(page) {
    const module = MODULE_BY_PAGE[page];
    if (!module) return;
    const cards = document.getElementById("u3Fields");
    if (!cards) return;

    try {
      const modules = await loadInventory();
      const item = modules.find((entry) => entry.module === module);
      if (!item || cards.querySelector("[data-u5-compatibility]")) return;
      const panel = document.createElement("section");
      panel.className = "u3-section-card";
      panel.dataset.u5Compatibility = module;
      panel.innerHTML = `
        <div class="u3-section-heading">
          <div>
            <h4>Compatibility and active sources</h4>
            <p>Shared defaults are saved only after you press Save. The existing module remains the runtime source during U5.</p>
          </div>
          <span class="settingsBadge">Legacy fallback</span>
        </div>
        <div class="u3-health-detail">
          ${item.sources.map((source) => `
            <div class="u3-health-row">
              <strong>${escapeHtml(source.kind)}</strong>
              <span>${escapeHtml(source.key)}</span>
              <small>${escapeHtml(source.description)}${source.sensitive ? " Sensitive details are redacted." : ""}</small>
            </div>`).join("")}
        </div>
        ${plannedList(item.plannedSettings || [])}
        ${(item.notes || []).map((note) => `<p class="u3-field-help">${escapeHtml(note)}</p>`).join("")}`;
      cards.append(panel);
    } catch (error) {
      const panel = document.createElement("section");
      panel.className = "u3-section-card";
      panel.dataset.u5Compatibility = module;
      panel.innerHTML = `<p class="u3-error-text" role="alert">${escapeHtml(error.message)}</p>`;
      cards.append(panel);
    }
  }

  document.addEventListener("brmedia:settings-page-rendered", (event) => {
    enhance(event.detail?.page || "");
  });

  const observe = new MutationObserver(() => {
    const selected = document.querySelector(".u3-nav-item.active");
    enhance(selected?.dataset.page || "");
  });
  observe.observe(document.documentElement, { childList: true, subtree: true });
})();
