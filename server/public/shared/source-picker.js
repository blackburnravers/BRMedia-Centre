(function () {
  function renderSourcePicker(target, onPick) {
    const host = typeof target === "string" ? document.querySelector(target) : target;
    if (!host) return;

    const sources = window.BRMediaShared?.sources?.getSources?.() || [];
    host.innerHTML = sources.map((source) => `
      <button class="brSourceCard" type="button" data-source-id="${source.id}">
        <span class="brSourceTitle">${source.label}</span>
        <span class="brSourceSub">${source.path || source.kind}</span>
      </button>
    `).join("");

    host.querySelectorAll("[data-source-id]").forEach((button) => {
      button.addEventListener("click", () => {
        const source = sources.find((item) => item.id === button.dataset.sourceId);
        if (source && typeof onPick === "function") onPick(source);
      });
    });
  }

  window.BRMediaShared = window.BRMediaShared || {};
  window.BRMediaShared.renderSourcePicker = renderSourcePicker;
})();