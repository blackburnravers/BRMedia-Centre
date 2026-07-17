(function () {
  const titleEl = document.getElementById("settingsActiveTitle");
  const summaryEl = document.getElementById("settingsActiveSummary");
  const placeholderTitle = document.getElementById("settingsPlaceholderTitle");
  const placeholderBody = document.getElementById("settingsPlaceholderBody");
  const sourceGrid = document.getElementById("settingsSourceGrid");

  function getTab(tabId) {
    const tabs = window.BRMediaShared?.settingsSchema?.settingsTabs || [];
    return tabs.find((tab) => tab.id === tabId) || tabs[0];
  }

  function updateTab(tabId) {
    const tab = getTab(tabId);
    if (!tab) return;

    if (titleEl) titleEl.textContent = tab.label;
    if (summaryEl) summaryEl.textContent = tab.summary;
    if (placeholderTitle) placeholderTitle.textContent = `${tab.label} settings will go here.`;

    if (placeholderBody) {
      placeholderBody.textContent = tab.id === "server"
        ? "Use the Server Settings button for deeper server/admin configuration. Universal Settings stays separate."
        : "Patch A creates the safe settings home first. The actual controls can now be added tab-by-tab without touching every module at once.";
    }
  }

  window.BRMediaShared?.settingsUi?.renderSettingsTabs?.("#settingsTabs", updateTab);
  updateTab(window.BRMediaShared?.settingsUi?.getActiveSettingsTab?.() || "general");
  window.BRMediaShared?.renderSourcePicker?.(sourceGrid);
})();