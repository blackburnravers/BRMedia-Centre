(function () {
  function getActiveSettingsTab() {
    const params = new URLSearchParams(window.location.search);
    return params.get("tab") || "general";
  }

  function renderSettingsTabs(target, onSelect) {
    const host = typeof target === "string" ? document.querySelector(target) : target;
    if (!host) return;

    const tabs = window.BRMediaShared?.settingsSchema?.settingsTabs || [];
    const active = getActiveSettingsTab();

    host.innerHTML = tabs.map((tab) => `
      <button class="brSettingsTab${tab.id === active ? " is-active" : ""}" type="button" data-settings-tab="${tab.id}">
        <span>${tab.label}</span>
      </button>
    `).join("");

    host.querySelectorAll("[data-settings-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        const tab = button.dataset.settingsTab || "general";
        const url = new URL(window.location.href);
        url.searchParams.set("tab", tab);
        history.replaceState(null, "", url);
        if (typeof onSelect === "function") onSelect(tab);
      });
    });
  }

  window.BRMediaShared = window.BRMediaShared || {};
  window.BRMediaShared.settingsUi = { getActiveSettingsTab, renderSettingsTabs };
})();