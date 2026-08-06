(() => {
  "use strict";

  const SECTION_BY_PAGE = Object.freeze({
    "dj-studio": "studio",
    "dj-engine": "engine",
    "dj-decks": "decks",
    "dj-mixer": "mixer",
    "dj-waveforms": "waveform",
    "dj-grid": "grid",
    "dj-analysis": "analysis",
    "dj-sync": "sync",
    "dj-quantize": "quantize",
    "dj-hot-cues": "hotCues",
    "dj-memory-cues": "memoryCues",
    "dj-loops": "loops",
    "dj-beat-jump": "beatJump",
    "dj-fx": "fx",
    "dj-stems": "stems",
    "dj-recording": "recording",
    "dj-recording-archive": "recordingArchive",
    "dj-audio-routing": "audioRouting",
    "dj-performance": "performanceUi",
    "dj-library": "library",
    "dj-set-plan": "setPlan",
    "dj-controllers": "controllers",
    "dj-mixxx": "mixxx",
  });

  const LOCKED_PAGES = new Set([
    "dj-audio-routing",
    "dj-set-plan",
    "dj-controllers",
    "dj-mixxx",
  ]);

  let inventoryPromise;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function loadInventory() {
    if (!inventoryPromise) {
      inventoryPromise = fetch("/api/settings/u6/compatibility", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      }).then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok || body.ok !== true || !Array.isArray(body.data)) {
          throw new Error(body?.error?.message || "DJ settings compatibility status is unavailable.");
        }
        return body.data;
      });
    }
    return inventoryPromise;
  }

  function modeLabel(mode) {
    return String(mode || "next-session").replaceAll("-", " ");
  }

  function lockPlannedControls(page, cards) {
    if (page === "dj-engine") {
      const backend = cards.querySelector('[data-path="engine.backend"]');
      if (backend) {
        backend.disabled = true;
        backend.setAttribute("aria-describedby", "u6-engine-planned");
      }
      return;
    }
    if (!LOCKED_PAGES.has(page)) return;
    cards.querySelectorAll("input, select, textarea").forEach((control) => {
      control.disabled = true;
      control.setAttribute("aria-disabled", "true");
    });
  }

  async function enhance(page) {
    const section = SECTION_BY_PAGE[page];
    if (!section) return;
    const cards = document.getElementById("u3Fields");
    if (!cards) return;
    lockPlannedControls(page, cards);
    if (cards.querySelector(`[data-u6-section="${section}"]`)) return;

    try {
      const inventory = await loadInventory();
      const item = inventory.find((entry) => entry.section === section);
      if (!item || cards.querySelector(`[data-u6-section="${section}"]`)) return;
      const panel = document.createElement("section");
      panel.className = "u3-section-card";
      panel.dataset.u6Section = section;
      panel.innerHTML = `
        <div class="u3-section-heading">
          <div>
            <h4>Compatibility and runtime application</h4>
            <p>${escapeHtml(item.safety)}</p>
          </div>
          <span class="settingsBadge">${escapeHtml(modeLabel(item.applyMode))}</span>
        </div>
        <p class="u3-field-help"><strong>Compatibility:</strong> ${escapeHtml(item.mode)}</p>
        ${item.sources.length ? `
          <div class="u3-health-detail">
            ${item.sources.map((entry) => `
              <div class="u3-health-row">
                <strong>${escapeHtml(entry.kind)}</strong>
                <span>${escapeHtml(entry.key)}</span>
                <small>${escapeHtml(entry.description)}</small>
              </div>`).join("")}
          </div>` : ""}
        ${item.planned.length ? `
          <div class="u3-planned-card" role="note">
            <strong>Planned / unavailable</strong>
            <ul>${item.planned.map((entry) => `<li>${escapeHtml(entry)}</li>`).join("")}</ul>
          </div>` : ""}
        ${page === "dj-engine" ? `
          <p id="u6-engine-planned" class="u3-field-help">
            BRMedia Native remains selected. Mixxx is schema-valid for future migration, but U6 rejects activation.
          </p>` : ""}`;
      cards.append(panel);
      lockPlannedControls(page, cards);
    } catch (error) {
      const panel = document.createElement("section");
      panel.className = "u3-section-card";
      panel.dataset.u6Section = section;
      panel.innerHTML = `<p class="u3-error-text" role="alert">${escapeHtml(error.message)}</p>`;
      cards.append(panel);
    }
  }

  const observer = new MutationObserver(() => {
    const selected = document.querySelector(".u3-nav-item.active");
    enhance(selected?.dataset.page || "");
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
