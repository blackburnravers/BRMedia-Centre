(function () {
  "use strict";

  const ASSET_BASE = "/shared/slider-assets/mixer-controls";

  function createSliderCard({ label, value = 50, min = 0, max = 100, orientation = "horizontal" }) {
    const card = document.createElement("div");
    card.className = `djSliderCard is-${orientation}`;

    const title = document.createElement("span");
    title.className = "djSliderLabel";
    title.textContent = label;

    const output = document.createElement("strong");
    output.className = "djSliderValue";
    output.textContent = `${value}%`;

    const input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.value = String(value);
    input.className = `djSavedSlider is-${orientation}`;
    input.setAttribute("aria-label", label);

    input.addEventListener("input", () => {
      output.textContent = `${input.value}%`;
    });

    card.append(title, input, output);
    return card;
  }

  function renderSliderPreview(host) {
    if (!host) return;
    host.innerHTML = "";

    host.style.setProperty("--dj-crossfader-track", `url('${ASSET_BASE}/crossfader-track-horizontal.png')`);
    host.style.setProperty("--dj-crossfader-thumb", `url('${ASSET_BASE}/crossfader-thumb-horizontal.png')`);
    host.style.setProperty("--dj-small-track", `url('${ASSET_BASE}/small-slider-track-horizontal.png')`);
    host.style.setProperty("--dj-small-thumb", `url('${ASSET_BASE}/small-slider-thumb-horizontal.png')`);
    host.style.setProperty("--dj-channel-track", `url('${ASSET_BASE}/channel-fader-track-vertical.png')`);
    host.style.setProperty("--dj-channel-thumb", `url('${ASSET_BASE}/channel-fader-thumb-vertical.png')`);

    host.append(
      createSliderCard({ label: "Deck 1", value: 82, orientation: "vertical" }),
      createSliderCard({ label: "Crossfader", value: 50, orientation: "horizontal" }),
      createSliderCard({ label: "Deck 2", value: 82, orientation: "vertical" }),
      createSliderCard({ label: "Master", value: 90, orientation: "horizontal" })
    );
  }

  window.BRMediaDjSliderControls = {
    renderPreview: renderSliderPreview,
  };
}());