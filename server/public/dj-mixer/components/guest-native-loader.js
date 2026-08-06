(() => {
  "use strict";
  const INTENT_KEY = "brmedia.guest.deck.intent.v1";
  const clientKey = "brmedia.guest.deck.client.v1";
  const controllers = new Map();
  const generations = new Map([["d1", 0], ["d2", 0]]);
  const leases = new Map();

  const clientId = (() => {
    try {
      const existing = localStorage.getItem(clientKey);
      if (/^[A-Za-z0-9_-]{16,96}$/.test(existing || "")) return existing;
      const bytes = crypto.getRandomValues(new Uint8Array(18));
      const created = btoa(String.fromCharCode(...bytes))
        .replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
      localStorage.setItem(clientKey, created);
      return created;
    } catch {
      return `browser_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    }
  })();

  const leaseHeaders = (lease) => ({
    Authorization: `Bearer ${lease.leaseToken}`,
    "X-Guest-Reservation": lease.id,
  });

  const request = async (url, options = {}) => {
    const response = await fetch(url, {
      credentials: "same-origin",
      cache: "no-store",
      ...options,
    });
    const type = String(response.headers.get("content-type") || "");
    const body = type.includes("application/json")
      ? await response.json().catch(() => ({}))
      : null;
    if (!response.ok) throw new Error(body?.error || `Guest request failed (${response.status})`);
    return { response, body };
  };

  const codecSupport = (intent) => {
    const type = String(intent.reservation.mediaType || "");
    const codec = String(intent.reservation.codecProbe || "");
    if (!type) return { supported: null, detail: "Browser capability unknown" };
    const probe = codec ? `${type}; codecs="${codec}"` : type;
    const audio = document.createElement("audio");
    const answer = audio.canPlayType(probe);
    return {
      supported: answer === "" ? false : true,
      detail: answer === "probably" ? "probably" : answer === "maybe" ? "maybe" : "unsupported",
    };
  };

  const release = async (lease, reason = "release") => {
    if (!lease?.guestId || !lease?.id || !lease?.leaseToken) return;
    try {
      await request(
        `/api/v1/guest-tracks/${encodeURIComponent(lease.guestId)}/reservations/${encodeURIComponent(lease.id)}`,
        { method: "DELETE", headers: leaseHeaders(lease), keepalive: reason === "pagehide" }
      );
    } catch {}
  };

  const commit = async (lease) => {
    const { body } = await request(
      `/api/v1/guest-tracks/${encodeURIComponent(lease.guestId)}/reservations/${encodeURIComponent(lease.id)}/commit`,
      { method: "POST", headers: leaseHeaders(lease) }
    );
    return { ...lease, ...body.reservation, guestId: lease.guestId };
  };

  const updateEjectControls = () => {
    let toolbar = document.querySelector("[data-guest-eject-toolbar]");
    if (!toolbar) {
      toolbar = document.createElement("aside");
      toolbar.dataset.guestEjectToolbar = "";
      toolbar.className = "brDjGuestEjectToolbar";
      toolbar.innerHTML = `
        <strong>Temporary guest</strong>
        <span data-guest-load-status role="status" aria-live="polite"></span>
        <button type="button" data-guest-eject="d1">Eject D1 guest</button>
        <button type="button" data-guest-eject="d2">Eject D2 guest</button>
      `;
      document.body.append(toolbar);
      toolbar.addEventListener("click", (event) => {
        const button = event.target.closest("[data-guest-eject]");
        if (button) void eject(button.dataset.guestEject);
      });
    }
    for (const deckId of ["d1", "d2"]) {
      const button = toolbar.querySelector(`[data-guest-eject="${deckId}"]`);
      if (button) button.hidden = !leases.has(deckId);
    }
    toolbar.hidden = !leases.size;
  };

  const setStatus = (message) => {
    updateEjectControls();
    const status = document.querySelector("[data-guest-load-status]");
    if (status) status.textContent = String(message || "");
    const toolbar = document.querySelector("[data-guest-eject-toolbar]");
    if (toolbar && message) toolbar.hidden = false;
  };

  const eject = async (deckId) => {
    const safeDeck = deckId === "d2" ? "d2" : "d1";
    const controller = controllers.get(safeDeck);
    controller?.abort();
    controllers.delete(safeDeck);
    generations.set(safeDeck, (generations.get(safeDeck) || 0) + 1);
    const lease = leases.get(safeDeck);
    window.BRMediaDjAudioEngine?.unloadDeck?.(safeDeck);
    leases.delete(safeDeck);
    updateEjectControls();
    await release(lease, "eject");
    setStatus(`${safeDeck === "d2" ? "Deck 2" : "Deck 1"} guest ejected`);
    window.dispatchEvent(new CustomEvent("brmedia:dj-deck-eject", {
      detail: { deckId: safeDeck, sourceKind: "guest" },
    }));
  };

  const releaseReplaced = async (deckId) => {
    const safeDeck = deckId === "d2" ? "d2" : "d1";
    const lease = leases.get(safeDeck);
    if (!lease) return;
    leases.delete(safeDeck);
    updateEjectControls();
    await release(lease, "permanent-source-replacement");
  };

  const loadIntent = async (intent) => {
    const deckId = intent?.reservation?.deckId === "d2" ? "d2" : "d1";
    const deck = window.BRMediaDjAudioEngine?.getDeck?.(deckId);
    if (!deck) throw new Error("Native deck engine is unavailable");
    const generation = Math.max(
      Number(intent.reservation.generation) || 1,
      (generations.get(deckId) || 0) + 1
    );
    generations.set(deckId, generation);
    controllers.get(deckId)?.abort();
    const controller = new AbortController();
    controllers.set(deckId, controller);
    const current = () =>
      generations.get(deckId) === generation && !controller.signal.aborted;
    const before = deck.getState();
    if (before.isPlaying) {
      const replace = window.confirm(
        `${deckId === "d2" ? "Deck 2" : "Deck 1"} is playing ${before.trackTitle || before.fileName || "audio"}. Stop and replace it with this guest track?`
      );
      if (!replace) {
        await release({ ...intent.reservation, guestId: intent.guest.id }, "cancelled-replacement");
        return;
      }
    }
    const capability = codecSupport(intent);
    if (capability.supported === false) {
      await release({ ...intent.reservation, guestId: intent.guest.id }, "unsupported");
      throw new Error(`This browser reports ${intent.reservation.mediaType} as unsupported`);
    }
    const lease = { ...intent.reservation, guestId: intent.guest.id };
    try {
      setStatus(`Loading guest to ${deckId === "d2" ? "Deck 2" : "Deck 1"}`);
      const { response } = await request(intent.reservation.mediaUrl, {
        signal: controller.signal,
        headers: leaseHeaders(lease),
      });
      const blob = await response.blob();
      if (!current()) throw new DOMException("Guest load superseded", "AbortError");
      const arrayBuffer = await blob.arrayBuffer();
      if (!current()) throw new DOMException("Guest load superseded", "AbortError");
      let decodedBuffer;
      try {
        decodedBuffer = await window.BRMediaDjAudioEngine
          .getEngine()
          .decodeAudioData(arrayBuffer);
      } catch {
        throw new Error("This browser could not decode the validated guest audio");
      }
      if (!current()) throw new DOMException("Guest load superseded", "AbortError");
      const metadata = intent.guest.metadata || {};
      const filename = intent.guest.displayFilename || `${metadata.title || "Guest track"}.audio`;
      let file;
      try {
        file = new File([blob], filename, { type: intent.reservation.mediaType });
      } catch {
        file = blob;
        Object.defineProperty(file, "name", { value: filename });
      }
      const next = await deck.loadFile(file, {
        confirmedReplace: before.isPlaying,
        sourceKind: "guest",
        guestTrackId: intent.guest.id,
        guestReservation: lease,
        metadata: {
          title: metadata.title || filename,
          artist: metadata.artist || "Temporary guest track",
        },
        skipBrowserAnalysis: true,
        skipWaveform: true,
        decodedBuffer,
        decodedBytes: arrayBuffer.byteLength,
      });
      if (!current() || !next.isLoaded || next.error ||
          next.sourceKind !== "guest" ||
          next.guestTrackId !== intent.guest.id) {
        throw new Error(next.error || "Guest deck load was superseded");
      }
      const committed = await commit(lease);
      if (!current()) {
        await release(committed, "stale-commit");
        return;
      }
      const old = leases.get(deckId);
      leases.set(deckId, committed);
      updateEjectControls();
      setStatus(`Guest loaded on ${deckId === "d2" ? "Deck 2" : "Deck 1"} — press Play when ready`);
      if (old && old.id !== committed.id) await release(old, "replacement");
    } catch (error) {
      const failedState = deck.getState();
      if (failedState?.sourceKind === "guest" &&
          failedState.guestTrackId === intent.guest.id &&
          !leases.has(deckId)) {
        window.BRMediaDjAudioEngine?.unloadDeck?.(deckId);
      }
      await release(lease, "failed-load");
      if (error?.name !== "AbortError") {
        setStatus(error?.message || "Guest track could not be loaded");
        window.alert(error?.message || "Guest track could not be loaded");
      }
      throw error;
    } finally {
      if (controllers.get(deckId) === controller) controllers.delete(deckId);
    }
  };

  const consumeIntent = () => {
    let intent = null;
    try {
      intent = JSON.parse(sessionStorage.getItem(INTENT_KEY) || "null");
      sessionStorage.removeItem(INTENT_KEY);
    } catch {}
    if (intent) void loadIntent(intent).catch(() => {});
  };

  window.BRMediaGuestNativeDeck = Object.freeze({
    clientId,
    loadIntent,
    eject,
    releaseReplaced,
    codecSupport,
  });

  window.setInterval(() => {
    for (const [deckId, lease] of leases) {
      const state = window.BRMediaDjAudioEngine?.getDeck?.(deckId)?.getState?.();
      if (state?.sourceKind !== "guest" || state.guestTrackId !== lease.guestId) {
        leases.delete(deckId);
        void release(lease, "source-replaced");
        updateEjectControls();
        continue;
      }
      void request(
        `/api/v1/guest-tracks/${encodeURIComponent(lease.guestId)}/reservations/${encodeURIComponent(lease.id)}`,
        { method: "POST", headers: leaseHeaders(lease) }
      ).catch(() => {});
    }
  }, 60_000);

  window.addEventListener("pagehide", () => {
    for (const controller of controllers.values()) controller.abort();
    controllers.clear();
    // Loaded leases deliberately expire server-side after the bounded lease.
  });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", consumeIntent, { once: true });
  } else {
    window.setTimeout(consumeIntent, 0);
  }
})();
