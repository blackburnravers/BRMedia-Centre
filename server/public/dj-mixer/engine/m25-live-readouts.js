(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.BRMediaM25LiveReadouts = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  function render(root, panel, values = {}) {
    if (!root?.querySelectorAll || !panel) return 0;
    const selector = `.brDjPerfPanel[data-dj-perf-panel="${panel}"] .brDjSingleWavePills, .brDjPerfPanel[data-dj-perf-panel="${panel}"] .brDjCueMemoryPills`;
    const nodes = Array.from(root.querySelectorAll(selector));
    nodes.forEach((pills) => {
      const spans = pills.querySelectorAll("span");
      if (spans[0]) spans[0].textContent = String(values.remaining || "-0:00.0");
      if (spans[1]) spans[1].textContent = String(values.elapsed || "0:00.0");
      const bars = pills.querySelector("strong");
      if (bars) bars.textContent = String(values.counter || "— Bars");
    });
    return nodes.length;
  }
  return Object.freeze({ render });
});
