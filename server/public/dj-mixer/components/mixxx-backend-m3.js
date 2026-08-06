(() => {
  const states = new Map();
  let lastReported = null;
  let reportTimer = 0;
  let pollTimer = 0;
  let monitorTimer = 0;
  let reconnectTimer = 0;
  let reconnectGeneration = 0;
  let reconnectAttempt = 0;
  let connectionState = "native";
  let effectiveBackend = "brmedia-native";
  let liveDecks = { 1: null, 2: null };
  let feedbackDiagnostics = { renderCount: 0, lastReceivedAt: null, deck1: null, deck2: null };
  const mixerQueue = new Map();
  const recentCommands = new Map();
  const manualLoopPending = new Map();
  const unloadPending = new Map();
  let mixerFlushTimer = 0;

  async function request(url, options = {}) {
    const response = await fetch(url, { headers: { Accept: "application/json", "Content-Type": "application/json" }, ...options });
    if (!response.ok) throw new Error(`Mixxx state request failed (${response.status})`);
    return response.json();
  }

  async function report(active, unload = false) {
    const body = JSON.stringify({ active });
    if (unload && navigator.sendBeacon) {
      navigator.sendBeacon("/api/dj/mixxx/native-playback", new Blob([body], { type: "application/json" }));
      return;
    }
    await fetch("/api/dj/mixxx/native-playback", {
      method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true,
    }).catch(() => {});
  }
  function telemetry(event, backoffMs = null) {
    fetch("/api/dj/mixxx/telemetry", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, backoffMs }), keepalive: true,
    }).catch(() => {});
  }

  const formatTime = (value) => {
    if (!Number.isFinite(value)) return "--:--";
    const seconds = Math.max(0, value);
    return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
  };
  const bpm = (value) => Number.isFinite(value) ? value.toFixed(1) : "--.--";

  function ensureEjectControls() {
    for (const deck of [1, 2]) {
      document.querySelectorAll(`[data-mixxx-header-action-deck="${deck}"]`).forEach((button) => {
        button.dataset.mixxxEjectDeck = String(deck);
        if (button.dataset.mixxxEjectBound === "true") return;
        button.dataset.mixxxEjectBound = "true";
        button.addEventListener("click", async () => {
          const state = liveDecks[deck];
          if (effectiveBackend !== "mixxx" || state?.loaded !== true || unloadPending.has(deck)) return;
          const confirmPlaying = state.playing === true;
          if (confirmPlaying && !window.confirm(`Deck ${deck} is playing. Eject this track?`)) return;
          const requestId = `unload_${crypto.randomUUID().replaceAll("-", "")}`;
          unloadPending.set(deck, requestId); renderDeck(deck, state);
          try {
            await request(`/api/dj/mixxx/deck/${deck}/unload`, { method: "POST", body: JSON.stringify({ requestId, confirmPlaying }) });
          } catch (error) {
            unloadPending.delete(deck); renderDeck(deck, liveDecks[deck]);
          }
        });
      });
    }
  }

  function renderDeck(deckNumber, deck) {
    ensureEjectControls();
    const side = `.is-deck-${deckNumber}`;
    const unavailable = deck?.stale || deck?.loaded == null;
    const loaded = deck?.loaded === true;
    const title = unavailable ? "Mixxx state unavailable" : loaded ? (deck.title || "Loaded in Mixxx") : "No track loaded";
    const artist = unavailable ? "Feedback stale" : loaded ? (deck.artist || "Metadata unavailable via controller") : "Mixxx deck empty";
    document.querySelectorAll(`.brDjSingleDeckPage${side} .brDjSingleTrackText h1, .brDjDuoDeckCard${side} > strong`).forEach((node) => { node.textContent = title; });
    document.querySelectorAll(`.brDjSingleDeckPage${side} .brDjSingleTrackText > span, .brDjDuoDeckCard${side} .brDjDuoDeckCardMeta`).forEach((node) => { node.textContent = artist; });
    const artworkUrl = loaded && deck?.artworkUrl ? deck.artworkUrl : "";
    document.querySelectorAll(`.brDjSingleDeckPage${side} .brDjSingleArtwork`).forEach((node) => { node.style.backgroundImage = artworkUrl ? `url("${artworkUrl.replaceAll('"', '%22')}")` : ""; node.style.backgroundSize = artworkUrl ? "cover" : ""; });
    document.querySelectorAll(`.brDjVinylDeckView[data-vinyl-deck="${deckNumber === 1 ? "a" : "b"}"] .brDjVinylArtwork`).forEach((image) => { if (artworkUrl) image.src = artworkUrl; image.alt = loaded ? `${title} artwork` : "Deck artwork"; });
    document.querySelectorAll(`.brDjDuoDeckCard${side} > em`).forEach((node) => {
      node.textContent = unavailable ? "Stale" : deck.playing ? "Playing" : "Paused";
    });
    document.querySelectorAll(`.brDjDuoSyncDeck${side} .brDjDuoBpmPopup > strong`).forEach((node) => {
      node.textContent = unavailable ? "--.--" : bpm(deck.liveBpm);
      node.title = `Analysed ${bpm(deck.analysedBpm)} BPM · Rate ${Number.isFinite(deck.rate) ? (deck.rate * 100).toFixed(2) + "%" : "unavailable"}`;
    });
    document.querySelectorAll(`.brDjDuoHorizontalWave${side} > header > span`).forEach((node) => {
      node.textContent = unavailable ? "--:--" : formatTime(deck.positionSeconds);
    });
    document.querySelectorAll(`.brDjDuoHorizontalWave${side} > header > em`).forEach((node) => {
      node.textContent = unavailable ? "--:--" : `-${formatTime(deck.remainingSeconds)}`;
    });
    document.querySelectorAll(`.brDjSingleDeckPage${side} .brDjSingleWavePills`).forEach((pills) => {
      const labels = pills.querySelectorAll(":scope > span");
      if (labels[0]) labels[0].textContent = unavailable ? "--:--" : `-${formatTime(deck.remainingSeconds)}`;
      if (labels[labels.length - 1]) labels[labels.length - 1].textContent = unavailable ? "--:--" : formatTime(deck.positionSeconds);
    });
    document.querySelectorAll(`.brDjSingleDeckPage${side} .brDjSingleTrackText > p`).forEach((node) => {
      const panel = node.closest(".brDjPerfPanel");
      const gridState = panel?.dataset?.m25GridState || "";
      const gridLabel = {
        "grid-not-prepared": "Grid not prepared", "grid-queued": "Grid queued", "grid-preparing": "Grid preparing",
        "grid-needs-review": "Needs review", "grid-locked": "Locked", "grid-failed": "Grid failed",
        "grid-cache-mismatch": "Grid cache mismatch", "grid-corrupt": "Grid cache corrupt",
      }[gridState] || "";
      node.textContent = unavailable ? "Mixxx state stale" : !loaded ? "Deck empty" : [deck.playing ? "Playing" : "Paused", gridLabel].filter(Boolean).join(" · ");
    });
    document.querySelectorAll(side).forEach((node) => {
      node.classList.toggle("is-mixxx-stale", Boolean(unavailable));
      node.dataset.mixxxLoaded = loaded ? "true" : "false";
      node.dataset.mixxxRate = Number.isFinite(deck?.rate) ? String(deck.rate) : "";
    });
    if (!loaded) unloadPending.delete(deckNumber);
    document.querySelectorAll(`[data-mixxx-eject-deck="${deckNumber}"]`).forEach((button) => {
      button.disabled = effectiveBackend !== "mixxx" || !loaded || unavailable || unloadPending.has(deckNumber);
      button.classList.toggle("is-pending", unloadPending.has(deckNumber));
      button.setAttribute("aria-label", unloadPending.has(deckNumber) ? `Ejecting Deck ${deckNumber}` : `Eject Deck ${deckNumber}`);
      button.title = !loaded ? `Mixxx Deck ${deckNumber} is empty` : deck.playing ? "Confirmation required while playing" : `Eject Mixxx Deck ${deckNumber}`;
    });
    document.querySelectorAll([
      `.brDjPerfPanel[data-dj-perf-panel="deck-${deckNumber}"] .brDjSinglePlayBtn`,
      `.brDjDuoDeckTransportPanel${side} .brDjDuoPadPlay`,
      `.brDjVinylDeckView[data-vinyl-deck="${deckNumber === 1 ? "a" : "b"}"] .brDjVinylTransport .is-play`,
    ].join(", ")).forEach((button) => {
      button.disabled = unavailable || !loaded;
      button.classList.toggle("is-playing", loaded && deck?.playing === true);
      button.setAttribute("aria-label", `${deck?.playing ? "Pause" : "Play"} Deck ${deckNumber}`);
    });
    document.querySelectorAll(`.brDjCueMemoryPage.is-hot-cue${side} .brDjCueMemoryPadGrid button:not(.is-delete)`).forEach((button, index) => {
      const supported = index < 8;
      const state = supported ? deck?.performance?.hotCueStates?.[index] : null;
      button.disabled = !supported;
      button.classList.toggle("is-mixxx-unsupported", !supported);
      button.classList.toggle("is-filled", supported && Number(state) > 0);
      button.title = supported ? `Mixxx Hot Cue ${index + 1}` : "Mixxx supports Hot Cues A–H in this BRMedia mapping";
    });
  }

  function renderLive(payload) {
    if (effectiveBackend !== "mixxx") return;
    liveDecks = { 1: payload.deck1 || null, 2: payload.deck2 || null };
    feedbackDiagnostics = {
      renderCount: feedbackDiagnostics.renderCount + 1,
      lastReceivedAt: new Date().toISOString(),
      deck1: payload.deck1 ? { loaded: payload.deck1.loaded, playing: payload.deck1.playing, positionSeconds: payload.deck1.positionSeconds, durationSeconds: payload.deck1.durationSeconds, stale: payload.deck1.stale } : null,
      deck2: payload.deck2 ? { loaded: payload.deck2.loaded, playing: payload.deck2.playing, positionSeconds: payload.deck2.positionSeconds, durationSeconds: payload.deck2.durationSeconds, stale: payload.deck2.stale } : null,
    };
    document.documentElement.dataset.mixxxFeedbackRenderedAt = feedbackDiagnostics.lastReceivedAt;
    document.documentElement.dataset.mixxxFeedbackRenderCount = String(feedbackDiagnostics.renderCount);
    renderDeck(1, payload.deck1);
    renderDeck(2, payload.deck2);
    document.querySelectorAll("[data-dj-library-load]").forEach((button) => {
      button.dataset.mixxxLoadUnavailable = "true";
      button.disabled = true;
      button.title = "Load this track in Mixxx. Controller MIDI cannot safely load an arbitrary BRMedia file path.";
    });
    document.documentElement.dataset.mixxxFeedback = payload.stale ? "stale" : "live";
    window.dispatchEvent(new CustomEvent("brmedia:mixxx-live-state", { detail: payload }));
  }

  async function poll() {
    if (document.hidden || effectiveBackend !== "mixxx") return;
    try {
      renderLive(await request("/api/dj/mixxx/decks"));
      connectionState = "connected";
      reconnectAttempt = 0;
    } catch {
      renderLive({ stale: true, deck1: { stale: true }, deck2: { stale: true } });
      beginReconnect();
    }
  }

  function cancelReconnect() {
    if (reconnectTimer || reconnectAttempt) telemetry("cancelled");
    reconnectGeneration += 1;
    reconnectAttempt = 0;
    clearTimeout(reconnectTimer);
    reconnectTimer = 0;
  }
  function cancelMonitoring() {
    clearTimeout(monitorTimer);
    monitorTimer = 0;
  }
  function scheduleMonitoring() {
    cancelMonitoring();
    if (effectiveBackend !== "mixxx") return;
    const monitor = async () => {
      if (effectiveBackend !== "mixxx") return;
      try {
        const payload = await request("/api/dj/mixxx/status");
        if (payload?.bridge?.connected !== true
          || payload?.bridge?.protocolCompatible !== true
          || payload?.bridge?.heartbeatHealthy !== true
          || payload?.bridge?.effectiveBackend !== "mixxx") {
          beginReconnect();
        }
      } catch {
        beginReconnect();
      }
      if (effectiveBackend === "mixxx") {
        monitorTimer = window.setTimeout(monitor, 2000);
      }
    };
    monitorTimer = window.setTimeout(monitor, 2000);
  }
  function nativePlaybackActive() {
    return Array.from(states.values()).some(Boolean);
  }
  function beginReconnect() {
    if (reconnectTimer || effectiveBackend !== "mixxx") return;
    const generation = ++reconnectGeneration;
    reconnectTimer = -1;
    const run = async () => {
      if (generation !== reconnectGeneration || effectiveBackend !== "mixxx") return;
      if (nativePlaybackActive()) {
        connectionState = "native-active-reconnect-blocked";
        effectiveBackend = "brmedia-native";
        window.BRMediaDjAudioEngine?.setExternalAuthority?.(false);
        document.documentElement.dataset.djBackend = effectiveBackend;
        document.documentElement.dataset.mixxxConnection = connectionState;
        schedulePolling();
        reconnectTimer = 0;
        telemetry("native-fallback");
        return;
      }
      reconnectAttempt += 1;
      telemetry("attempt", reconnectAttempt === 1 ? 0 : Math.min(8000, 500 * (2 ** (reconnectAttempt - 2))));
      connectionState = "reconnecting";
      document.documentElement.dataset.mixxxConnection = connectionState;
      try {
        const payload = await request("/api/dj/mixxx/reconnect", {
          method: "POST",
          body: JSON.stringify({ nativePlaybackActive: false }),
        });
        if (generation !== reconnectGeneration) return;
        if (payload?.bridge?.effectiveBackend === "mixxx"
          && payload?.bridge?.connected === true
          && payload?.bridge?.protocolCompatible === true
          && payload?.bridge?.heartbeatHealthy === true) {
          connectionState = "connected";
          reconnectAttempt = 0;
          document.documentElement.dataset.mixxxConnection = connectionState;
          reconnectTimer = 0;
          telemetry("success");
          window.dispatchEvent(new CustomEvent("brmedia:dj-backend-state", { detail: payload.bridge }));
          return;
        }
      } catch {}
      if (generation !== reconnectGeneration) return;
      if (reconnectAttempt >= 6) {
        connectionState = "native-fallback";
        effectiveBackend = "brmedia-native";
        window.BRMediaDjAudioEngine?.setExternalAuthority?.(false);
        document.documentElement.dataset.djBackend = effectiveBackend;
        document.documentElement.dataset.mixxxConnection = connectionState;
        schedulePolling();
        reconnectTimer = 0;
        telemetry("exhausted");
        telemetry("native-fallback");
        return;
      }
      const delay = Math.min(8000, 500 * (2 ** (reconnectAttempt - 1)));
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = 0;
        void run();
      }, delay);
    };
    void run();
  }

  function schedulePolling() {
    clearInterval(pollTimer);
    if (effectiveBackend === "mixxx") {
      void poll();
      pollTimer = window.setInterval(() => void poll(), 250);
    }
  }

  function flushMixerQueue() {
    mixerFlushTimer = 0;
    if (effectiveBackend !== "mixxx") { mixerQueue.clear(); return; }
    const entries = Array.from(mixerQueue.entries());
    mixerQueue.clear();
    entries.forEach(([path, value]) => {
      request(path, { method: "POST", body: JSON.stringify({ value }) }).catch(() => {});
    });
  }
  function routeMixerControl(path, value) {
    if (effectiveBackend !== "mixxx") return false;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return true;
    mixerQueue.set(path, Math.max(0, Math.min(1, numeric)));
    if (!mixerFlushTimer) mixerFlushTimer = window.setTimeout(flushMixerQueue, 50);
    return true;
  }
  function postDiscrete(path, body = {}, key = path) {
    if (effectiveBackend !== "mixxx") return false;
    const now = performance.now();
    if (now - (recentCommands.get(key) || -Infinity) < 120) return true;
    recentCommands.set(key, now);
    request(path, { method: "POST", body: JSON.stringify(body) }).catch(() => {});
    return true;
  }
  window.BRMediaMixxxBackend = Object.freeze({
    isActive: () => effectiveBackend === "mixxx",
    getDiagnostics: () => ({ ...feedbackDiagnostics }),
    getDeckState(deck) {
      const safeDeck = deck === 2 || deck === "d2" ? 2 : deck === 1 || deck === "d1" ? 1 : 0;
      return safeDeck ? liveDecks[safeDeck] : null;
    },
    deckMixer(deck, control, value) {
      const safeDeck = deck === 2 || deck === "d2" ? 2 : deck === 1 || deck === "d1" ? 1 : 0;
      if (!safeDeck || !["gain", "eq-high", "eq-mid", "eq-low", "filter", "volume", "pfl", "mute"].includes(control)) return false;
      return routeMixerControl(`/api/dj/mixxx/deck/${safeDeck}/mixer/${control}`, value);
    },
    transport(deck, action, data = {}) {
      const safeDeck = deck === 2 || deck === "d2" ? 2 : deck === 1 || deck === "d1" ? 1 : 0;
      if (!safeDeck || effectiveBackend !== "mixxx") return false;
      const allowed = ["play", "pause", "stop", "cue", "cue-return", "cue-set", "sync", "quantize", "loop-in", "loop-out", "reloop", "auto-loop", "loop-size", "loop-halve", "loop-double", "beat-jump-back", "beat-jump-forward"];
      if (!allowed.includes(action)) return false;
      const transportAction = action === "play" && liveDecks[safeDeck]?.playing === true ? "pause" : action;
      const path = ["play", "pause", "stop", "cue"].includes(transportAction) ? `/api/dj/mixxx/deck/${safeDeck}/${transportAction}` : `/api/dj/mixxx/deck/${safeDeck}/performance/${action}`;
      const payload = action === "sync" && typeof data.enabled !== "boolean"
        ? { ...data, enabled: liveDecks[safeDeck]?.performance?.syncEnabled !== true } : data;
      return postDiscrete(path, payload, `${safeDeck}:${transportAction}`);
    },
    cueHold(deck, pressed) {
      const safeDeck = deck === 2 || deck === "d2" ? 2 : deck === 1 || deck === "d1" ? 1 : 0;
      if (!safeDeck || effectiveBackend !== "mixxx" || typeof pressed !== "boolean") return false;
      request(`/api/dj/mixxx/deck/${safeDeck}/cue-${pressed ? "down" : "up"}`, { method: "POST", body: "{}" }).catch(() => {});
      return true;
    },
    linkedTransport(action) {
      if (effectiveBackend !== "mixxx" || !["play", "pause", "cue-return", "cue-set"].includes(action)) return false;
      [1, 2].forEach((deck) => this.transport(deck, action));
      return true;
    },
    linkedCueHold(pressed) {
      if (effectiveBackend !== "mixxx" || typeof pressed !== "boolean") return false;
      [1, 2].forEach((deck) => this.cueHold(deck, pressed));
      return true;
    },
    manualLoop(deck) {
      const safeDeck = deck === 2 || deck === "d2" ? 2 : deck === 1 || deck === "d1" ? 1 : 0;
      if (!safeDeck || effectiveBackend !== "mixxx") return false;
      const performanceState = liveDecks[safeDeck]?.performance || {};
      let action;
      if (performanceState.loopActive === true) {
        action = "reloop";
        manualLoopPending.delete(safeDeck);
      } else if (manualLoopPending.get(safeDeck) === true) {
        action = "loop-out";
        manualLoopPending.delete(safeDeck);
      } else {
        action = "loop-in";
        manualLoopPending.set(safeDeck, true);
      }
      return this.transport(safeDeck, action);
    },
    seek(deck, position) {
      const safeDeck = deck === 2 || deck === "d2" ? 2 : deck === 1 || deck === "d1" ? 1 : 0;
      const safePosition = Number(position);
      if (!safeDeck || effectiveBackend !== "mixxx" || !Number.isFinite(safePosition) || safePosition < 0 || safePosition > 1) return false;
      request(`/api/dj/mixxx/deck/${safeDeck}/seek`, { method: "POST", body: JSON.stringify({ position: safePosition }) }).catch(() => {});
      return true;
    },
    hotcue(deck, cue) {
      const safeDeck = deck === 2 || deck === "d2" ? 2 : deck === 1 || deck === "d1" ? 1 : 0;
      if (!safeDeck || effectiveBackend !== "mixxx" || !Number.isInteger(cue) || cue < 1 || cue > 8) return false;
      request(`/api/dj/mixxx/deck/${safeDeck}/hotcue/${cue}`, { method: "POST", body: "{}" }).catch(() => {});
      return true;
    },
    hotcueAction(deck, cue, action = "trigger") {
      const safeDeck = deck === 2 || deck === "d2" ? 2 : deck === 1 || deck === "d1" ? 1 : 0;
      if (!safeDeck || effectiveBackend !== "mixxx" || !Number.isInteger(cue) || cue < 1 || cue > 8
        || !["set", "trigger", "clear"].includes(action)) return false;
      return postDiscrete(`/api/dj/mixxx/deck/${safeDeck}/hotcue/${cue}/${action}`, {}, `${safeDeck}:hotcue:${cue}:${action}`);
    },
    tempo(deck, control, value) {
      const safeDeck = deck === 2 || deck === "d2" ? 2 : deck === 1 || deck === "d1" ? 1 : 0;
      const numeric = Number(value);
      if (!safeDeck || effectiveBackend !== "mixxx" || !["rate", "range"].includes(control)
        || !Number.isFinite(numeric)) return false;
      request(`/api/dj/mixxx/deck/${safeDeck}/tempo/${control}`, {
        method: "POST", body: JSON.stringify({ value: numeric }),
      }).catch(() => {});
      return true;
    },
    effect(deck, control, value) {
      const safeDeck = deck === 2 || deck === "d2" ? 2 : deck === 1 || deck === "d1" ? 1 : 0;
      if (!safeDeck || effectiveBackend !== "mixxx" || !["enabled", "mix", "parameter-1"].includes(control)) return false;
      const body = control === "enabled" ? { enabled: value === true } : { value: Number(value) };
      request(`/api/dj/mixxx/deck/${safeDeck}/effect/${control}`, {
        method: "POST", body: JSON.stringify(body),
      }).catch(() => {});
      return true;
    },
    sharedMixer(control, value) {
      if (!["crossfader", "master-volume"].includes(control)) return false;
      return routeMixerControl(`/api/dj/mixxx/mixer/${control}`, value);
    },
  });

  window.addEventListener("brmedia:dj-deck-state", (event) => {
    const detail = event.detail || {};
    if (!detail.deckId || effectiveBackend === "mixxx") return;
    states.set(detail.deckId, detail.isPlaying === true);
    const active = Array.from(states.values()).some(Boolean);
    if (active === lastReported) return;
    lastReported = active;
    clearTimeout(reportTimer);
    reportTimer = window.setTimeout(() => void report(active), 120);
  });
  window.addEventListener("brmedia:dj-fx-state", (event) => {
    if (effectiveBackend !== "mixxx") return;
    [1, 2].forEach((deck) => {
      const state = event.detail?.[deck === 1 ? "d1" : "d2"];
      if (!state) return;
      window.BRMediaMixxxBackend.effect(deck, "enabled",
        state.bypassed !== true && Array.isArray(state.active) && state.active.length > 0);
      if (Number.isFinite(state.amount))
        window.BRMediaMixxxBackend.effect(deck, "mix", Math.max(0, Math.min(1, state.amount)));
    });
  });
  window.addEventListener("brmedia:dj-backend-state", (event) => {
    const nextBackend = event.detail?.effectiveBackend || "brmedia-native";
    if (nextBackend !== effectiveBackend) cancelReconnect();
    effectiveBackend = nextBackend;
    if (effectiveBackend !== "mixxx") {
      recentCommands.clear();
      manualLoopPending.clear();
      document.querySelectorAll('[data-dj-library-load][data-mixxx-load-unavailable="true"]').forEach((button) => {
        delete button.dataset.mixxxLoadUnavailable;
        button.disabled = false;
        button.removeAttribute("title");
      });
    }
    connectionState = effectiveBackend === "mixxx" ? "connected" : "native";
    document.documentElement.dataset.djBackend = effectiveBackend;
    document.documentElement.dataset.mixxxConnection = connectionState;
    window.BRMediaDjAudioEngine?.setExternalAuthority?.(effectiveBackend === "mixxx");
    schedulePolling();
    scheduleMonitoring();
  });
  window.addEventListener("visibilitychange", () => { if (!document.hidden) void poll(); });
  window.addEventListener("pagehide", () => {
    clearInterval(pollTimer);
    cancelMonitoring();
    cancelReconnect();
    if (effectiveBackend !== "mixxx") void report(false, true);
  });

  void report(false);
  ensureEjectControls();
  request("/api/dj/mixxx/status").then((payload) => {
    effectiveBackend = payload?.bridge?.effectiveBackend || "brmedia-native";
    document.documentElement.dataset.djBackend = effectiveBackend;
    window.dispatchEvent(new CustomEvent("brmedia:dj-backend-state", { detail: payload.bridge }));
    schedulePolling();
    scheduleMonitoring();
  }).catch(() => {
    cancelReconnect();
    effectiveBackend = "brmedia-native";
    connectionState = "native-status-unavailable";
    window.BRMediaDjAudioEngine?.setExternalAuthority?.(false);
    document.documentElement.dataset.djBackend = effectiveBackend;
    document.documentElement.dataset.mixxxConnection = connectionState;
  });
})();
