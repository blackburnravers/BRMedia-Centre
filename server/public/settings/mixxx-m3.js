(() => {
  const API = "/api/dj/mixxx";
  const SETTINGS_API = "/api/settings/dj";
  let settings = null;
  let bridge = null;
  let busy = false;

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;");

  async function request(url, options = {}) {
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      ...options,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) {
      throw new Error(payload.error?.message || payload.error || `Request failed (${response.status})`);
    }
    return payload;
  }

  const tone = (value, unknown = false) => unknown ? "amber" : value ? "green" : "red";
  const stateRow = (label, value, colour) =>
    `<div class="mixxxM3State"><span class="mixxxM3Dot ${colour}"></span><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;

  function html() {
    const engine = settings?.engine || {};
    const enabled = engine.mixxxEnabled === true;
    const selected = bridge?.effectiveBackend === "mixxx" ? "mixxx" : "native";
    const mappingUnknown = bridge?.controllerMappingSelected == null;
    return `<section class="settingsCard settingsLiveCard mixxxM3Card" data-mixxx-m3>
      <div class="settingsCardHead"><span class="settingsCardIcon"><i class="fa-duotone fa-waveform-lines"></i></span>
        <div><h4>Mixxx Backend</h4><p>Optional MIDI bridge health and guarded backend selection. No playback is transferred automatically.</p></div>
      </div>
      <div class="settingsLiveControls">
        <label class="settingsLiveControl settingsLiveToggle"><span><strong>Enable Mixxx Integration</strong><em>Remain off unless explicitly enabled.</em></span>
          <input type="checkbox" data-mixxx-enable ${enabled ? "checked" : ""} ${busy ? "disabled" : ""}></label>
        <label class="settingsLiveControl settingsLiveSelect"><span><strong>Backend Selection</strong><em>Switching to Mixxx requires confirmation and stopped Native decks.</em></span>
          <select data-mixxx-backend ${!enabled || busy ? "disabled" : ""}>
            <option value="native" ${selected === "native" ? "selected" : ""}>BRMedia Native</option>
            <option value="mixxx" ${selected === "mixxx" ? "selected" : ""}>Mixxx Backend</option>
          </select></label>
        <label class="settingsLiveControl settingsLiveText"><span><strong>MIDI Port</strong><em>The guarded M3 bridge uses the fixed M2 loopMIDI port.</em></span>
          <input value="${escapeHtml(engine.mixxxMidiPort || bridge?.portName || "BRMedia Mixxx Remote")}" readonly></label>
      </div>
      <div class="mixxxM3Health">
        ${stateRow("Mixxx Running", bridge?.mixxxRunningDetected == null ? "Unknown" : bridge.mixxxRunningDetected ? "Running" : "Not detected", tone(bridge?.mixxxRunningDetected, bridge?.mixxxRunningDetected == null))}
        ${stateRow("Bridge Connected", bridge?.connected ? "Connected" : "Disconnected", tone(bridge?.connected))}
        ${stateRow("loopMIDI Input", bridge?.inputAvailable ? "Available" : "Unavailable", tone(bridge?.inputAvailable))}
        ${stateRow("loopMIDI Output", bridge?.outputAvailable ? "Available" : "Unavailable", tone(bridge?.outputAvailable))}
        ${stateRow("Controller Mapping", mappingUnknown ? "Not verifiable" : bridge.controllerMappingSelected ? "Active · protocol verified" : "Not selected", tone(bridge?.controllerMappingSelected, mappingUnknown))}
        ${stateRow("Backend Mode", bridge?.mode === "mixxx" ? "Mixxx Backend" : "BRMedia Native", bridge?.mode === "mixxx" ? "green" : "amber")}
        ${stateRow("Saved / Runtime", bridge?.reconciled ? "Reconciled" : "Mismatch", bridge?.reconciled ? "green" : "red")}
        ${stateRow("Reconciliation", bridge?.reconciliationReason || "Pending", bridge?.reconciliationState === "fallback-native" ? "amber" : "green")}
        ${stateRow("Last Connection", bridge?.lastConnectedAt || "Never", bridge?.lastConnectedAt ? "green" : "amber")}
        ${stateRow("Last Error", bridge?.lastError || "None", bridge?.lastError ? "red" : "green")}
      </div>
      <div class="mixxxM3Actions"><button type="button" class="settingsActionBtn secondary" data-mixxx-refresh ${busy ? "disabled" : ""}>Refresh Status</button>
        <span data-mixxx-message role="status"></span></div>
    </section>`;
  }

  async function load() {
    const [settingsPayload, bridgePayload] = await Promise.all([
      request(SETTINGS_API),
      request(`${API}/status`),
    ]);
    settings = settingsPayload.data;
    bridge = bridgePayload.bridge;
  }

  async function saveEngine(engine) {
    const payload = await request(SETTINGS_API, {
      method: "PATCH",
      body: JSON.stringify({ engine }),
    });
    settings = payload.data;
  }

  async function selectNative(message = "BRMedia Native selected.") {
    bridge = (await request(`${API}/backend`, { method: "POST", body: JSON.stringify({ backend: "brmedia-native", enabled: settings?.engine?.mixxxEnabled === true, nativePlaybackActive: false }) })).bridge;
    settings = (await request(SETTINGS_API)).data;
    render(message);
  }

  async function enableIntegration(enable) {
    if (enable && !window.confirm("Enable the optional Mixxx integration? This does not start playback or transfer deck state.")) return render();
    busy = true; render();
    try {
      if (!enable) {
        bridge = (await request(`${API}/backend`, { method: "POST", body: JSON.stringify({ backend: "brmedia-native", enabled: false, nativePlaybackActive: false }) })).bridge;
      } else {
        bridge = (await request(`${API}/backend`, {
          method: "POST",
          body: JSON.stringify({ backend: "brmedia-native", enabled: true, nativePlaybackActive: false }),
        })).bridge;
      }
      await load();
      render(enable ? "Mixxx integration enabled; Native remains selected." : "Mixxx integration disabled.");
    } catch (error) {
      await request(`${API}/backend`, { method: "POST", body: JSON.stringify({ backend: "brmedia-native", enabled: false, nativePlaybackActive: false }) }).catch(() => {});
      await load().catch(() => {});
      render(`Mixxx unavailable; safely returned to Native. ${error.message}`);
    } finally { busy = false; render(); }
  }

  async function selectBackend(value) {
    if (value === "native") return selectNative();
    if (!window.confirm("Switch to Mixxx Backend? Confirm all BRMedia Native decks are stopped. No playback will be transferred.")) return render();
    busy = true; render();
    try {
      const result = await request(`${API}/backend`, { method: "POST", body: JSON.stringify({ backend: "mixxx", enabled: true, nativePlaybackActive: bridge?.nativePlaybackActive === true }) });
      bridge = result.bridge;
      settings = (await request(SETTINGS_API)).data;
      render("Mixxx Backend selected. No transport command was sent.");
    } catch (error) {
      await selectNative(`Switch blocked; Native remains active. ${error.message}`);
    } finally { busy = false; render(); }
  }

  function bind(root) {
    root.querySelector("[data-mixxx-enable]")?.addEventListener("change", (event) => void enableIntegration(event.target.checked));
    root.querySelector("[data-mixxx-backend]")?.addEventListener("change", (event) => void selectBackend(event.target.value));
    root.querySelector("[data-mixxx-refresh]")?.addEventListener("click", async () => {
      busy = true; render();
      try {
        bridge = (await request(`${API}/refresh`, { method: "POST", body: "{}" })).bridge;
        render("Status refreshed.");
      } catch (error) { render(`Refresh failed: ${error.message}`); }
      finally { busy = false; render(); }
    });
  }

  function isDjSettings() {
    const params = new URLSearchParams(location.search);
    return params.get("module") === "dj-mixer" || document.querySelector("#settingsActiveTitle")?.textContent?.startsWith("DJ ");
  }

  function render(message = "") {
    if (!isDjSettings()) return;
    const host = document.querySelector("#settingsCards");
    if (!host) return;
    host.querySelector("[data-mixxx-m3]")?.remove();
    host.insertAdjacentHTML("beforeend", html());
    const card = host.querySelector("[data-mixxx-m3]");
    if (message) card.querySelector("[data-mixxx-message]").textContent = message;
    bind(card);
    window.BRMediaIcons?.safeHydrateIcons?.(card);
  }

  let scheduled = false;
  new MutationObserver(() => {
    if (scheduled || document.querySelector("[data-mixxx-m3]")) return;
    scheduled = true;
    setTimeout(() => { scheduled = false; render(); }, 0);
  }).observe(document.documentElement, { childList: true, subtree: true });

  load().then(() => render()).catch((error) => {
    bridge = { lastError: error.message, mode: "native" };
    settings = { engine: { backend: "brmedia-native", mixxxEnabled: false, mixxxMidiPort: "BRMedia Mixxx Remote" } };
    render();
  });
})();
