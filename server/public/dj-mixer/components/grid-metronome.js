(() => {
  "use strict";

  const STORAGE_KEY =
    "brmedia.dj.grid.metronome.v1";

  const LEVELS = Object.freeze({
    off: 0,
    low: 0.032,
    mid: 0.062,
    high: 0.105,
  });

  const LEVEL_LABELS = Object.freeze({
    off: "Metronome off",
    low: "Low grid click",
    mid: "Medium grid click",
    high: "High grid click",
  });

  const LOOKAHEAD_SECONDS = 0.16;
  const SCHEDULER_INTERVAL_MS = 25;

  let activeDeckId = "d1";
  let level = "off";
  let timer = 0;
  let lastTrackTime = null;
  let lastLibraryItemId = "";

  const scheduledBeats = new Map();

  const getController = () =>
    window.BRMediaDjDeckController;

  const getGridApi = () =>
    window.BRMediaDjGrid;

  const getAudioApi = () =>
    window.BRMediaDjAudioEngine;

  const getSheet = () =>
    document.querySelector(
      "[data-dj-grid-options-sheet]"
    );

  const normaliseLevel = (value) => {
    const safe = String(
      value || "off"
    )
      .trim()
      .toLowerCase();

    return Object.prototype
      .hasOwnProperty.call(
        LEVELS,
        safe
      )
        ? safe
        : "off";
  };

  const readSettings = () => {
    try {
      const saved = JSON.parse(
        window.localStorage.getItem(
          STORAGE_KEY
        ) || "{}"
      );

      level = normaliseLevel(
        saved.level
      );

      activeDeckId =
        saved.deckId === "d2"
          ? "d2"
          : "d1";
    } catch {
      level = "off";
      activeDeckId = "d1";
    }
  };

  const writeSettings = () => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,

        JSON.stringify({
          level,
          deckId: activeDeckId,
        })
      );
    } catch {}
  };

  const getGridOptions = (
    state = {}
  ) => {
    const limits =
      getController()?.gridLimits ||
      {};

    return {
      duration: Math.max(
        0,
        Number(
          state.duration
        ) || 0
      ),

      minBpm:
        Number(
          limits.minBpm
        ) || 40,

      maxBpm:
        Number(
          limits.maxBpm
        ) || 260,

      preRollSeconds:
        Number(
          limits.preRollSeconds
        ) || 8,

      maxBeats: 128,
    };
  };

  const isActiveGridPage = () => {
    const expectedView =
      activeDeckId === "d2"
        ? "deck-2"
        : "deck-1";

    return Boolean(
      document.visibilityState !==
        "hidden" &&

      document.body.dataset
        .djPerfView ===
        expectedView &&

      document.body.dataset
        .djDeckTab ===
        "grid"
    );
  };

  const clearSchedule = () => {
    scheduledBeats.clear();

    lastTrackTime = null;
    lastLibraryItemId = "";
  };

  const cleanScheduledBeats = (
    contextTime
  ) => {
    scheduledBeats.forEach(
      (scheduledAt, key) => {
        if (
          scheduledAt <
          contextTime - 0.5
        ) {
          scheduledBeats.delete(
            key
          );
        }
      }
    );
  };

  const scheduleClick = (
    engine,
    when,
    isBar = false,
    preview = false
  ) => {
    const context =
      engine?.context;

    if (!context) return;

    const amount =
      LEVELS[level] || 0;

    if (!amount) return;

    const startAt = Math.max(
      context.currentTime + 0.004,

      Number(when) ||
        context.currentTime +
          0.004
    );

    const oscillator =
      context.createOscillator();

    const clickGain =
      context.createGain();

    oscillator.type =
      "triangle";

    oscillator.frequency
      .setValueAtTime(
        preview
          ? 1350
          : isBar
            ? 1760
            : 1120,

        startAt
      );

    const accent =
      isBar ? 1.26 : 1;

    clickGain.gain
      .setValueAtTime(
        0.0001,
        startAt
      );

    clickGain.gain
      .exponentialRampToValueAtTime(
        Math.max(
          0.0002,
          amount * accent
        ),

        startAt + 0.002
      );

    clickGain.gain
      .exponentialRampToValueAtTime(
        0.0001,

        startAt +
          (
            isBar
              ? 0.055
              : 0.042
          )
      );

    oscillator.connect(
      clickGain
    );

    clickGain.connect(
      engine.masterGain ||
      context.destination
    );

    oscillator.start(
      startAt
    );

    oscillator.stop(
      startAt +
        (
          isBar
            ? 0.062
            : 0.05
        )
    );
  };

  const previewLevel =
    async () => {
      if (level === "off") {
        return;
      }

      const engine =
        getAudioApi()
          ?.getEngine?.();

      if (!engine) return;

      try {
        await engine.unlock?.();
      } catch {}

      scheduleClick(
        engine,

        engine.context
          .currentTime +
          0.025,

        true,
        true
      );
    };

  const scheduleGridClicks =
    () => {
      if (
        level === "off" ||
        !isActiveGridPage()
      ) {
        clearSchedule();
        return;
      }

      const controller =
        getController();

      const gridApi =
        getGridApi();

      const audioApi =
        getAudioApi();

      if (
        !controller ||
        !gridApi ||
        !audioApi
      ) {
        return;
      }

      const config =
        controller
          .getConfigById?.(
            activeDeckId
          );

      const deck =
        audioApi.getDeck?.(
          activeDeckId
        );

      const engine =
        audioApi.getEngine?.();

      if (
        !config ||
        !deck ||
        !engine
      ) {
        return;
      }

      const nativeState = deck.getState();
      const mixxxActive = window.BRMediaMixxxBackend?.isActive?.() === true;
      const mixxxState = mixxxActive ? window.BRMediaMixxxBackend.getDeckState(activeDeckId) : null;
      const clockState = mixxxActive ? window.BRMediaM12WaveformClock?.get?.(activeDeckId)?.snapshot?.() : null;
      const state = mixxxActive ? {
        ...nativeState,
        isLoaded: clockState?.loaded === true,
        isPlaying: clockState?.playing === true,
        isLoading: false,
        error: clockState?.stale ? "Mixxx state stale" : "",
        currentTime: Number(clockState?.position) || 0,
        duration: Number(clockState?.duration) || 0,
        playbackRate: Number(clockState?.rate) || 1,
        libraryItemId: String(mixxxState?.stableIdentity || mixxxState?.catalogueIdentity || ""),
      } : nativeState;

      if (
        !state.isLoaded ||
        !state.isPlaying ||
        state.isLoading ||
        state.error ||
        engine.context.state !==
          "running"
      ) {
        clearSchedule();
        return;
      }

      const trackTime =
        Number(
          state.currentTime
        ) || 0;

      const libraryItemId =
        String(
          state.libraryItemId ||
          ""
        );

      if (
        libraryItemId !==
        lastLibraryItemId
      ) {
        clearSchedule();

        lastLibraryItemId =
          libraryItemId;
      }

      if (
        lastTrackTime != null &&
        (
          trackTime <
            lastTrackTime -
              0.08 ||

          Math.abs(
            trackTime -
            lastTrackTime
          ) > 0.75
        )
      ) {
        scheduledBeats.clear();
      }

      lastTrackTime =
        trackTime;

      const playbackRate =
        Math.max(
          0.5,

          Math.min(
            2,

            Number(
              state.playbackRate
            ) || 1
          )
        );

      const sourceLookahead =
        LOOKAHEAD_SECONDS *
        playbackRate;

      const grid = mixxxActive
        ? window.BRMediaM25GridAuthorityInstance?.gridForRender?.(activeDeckId)
        : controller.normaliseDeckBeatGrid(config, state);

      if (!grid) { clearSchedule(); return; }

      const markers =
        gridApi.getBeatWindow(
          grid,

          trackTime - 0.015,

          trackTime +
            sourceLookahead +
            0.025,

          getGridOptions(
            state
          )
        );

      const contextTime =
        engine.context
          .currentTime;

      cleanScheduledBeats(
        contextTime
      );

      markers.forEach(
        (marker) => {
          const beatTime =
            Number(
              marker.time
            );

          if (
            !Number.isFinite(
              beatTime
            )
          ) {
            return;
          }

          const deltaSource =
            beatTime -
            trackTime;

          const deltaWall =
            deltaSource /
            playbackRate;

          if (
            deltaWall < -0.02 ||
            deltaWall >
              LOOKAHEAD_SECONDS +
                0.04
          ) {
            return;
          }

          const key =
            `${libraryItemId}:` +
            `${Number(
              marker.beat
            ).toFixed(6)}`;

          if (
            scheduledBeats.has(
              key
            )
          ) {
            return;
          }

          const scheduledAt =
            Math.max(
              contextTime +
                0.004,

              contextTime +
                deltaWall
            );

          scheduledBeats.set(
            key,
            scheduledAt
          );

          scheduleClick(
            engine,
            scheduledAt,
            Boolean(
              marker.isBar
            )
          );
        }
      );
    };

  const syncUi = () => {
    const sheet =
      getSheet();

    if (!sheet) return;

    sheet
      .querySelectorAll(
        "[data-dj-grid-metronome-level]"
      )
      .forEach((button) => {
        const active =
          button.dataset
            .djGridMetronomeLevel ===
          level;

        button.classList.toggle(
          "is-active",
          active
        );

        button.setAttribute(
          "aria-pressed",

          active
            ? "true"
            : "false"
        );
      });

    const status =
      sheet.querySelector(
        "[data-dj-grid-metronome-status]"
      );

    if (status) {
      status.textContent =
        level === "off"
          ? "Off • turn on to verify the saved grid against the track."
          : `${LEVEL_LABELS[level]} • follows ${
              activeDeckId === "d2"
                ? "Deck 2"
                : "Deck 1"
            } while its Grid page is open and playing.`;
    }
  };

  const setDeck = (
    deckId
  ) => {
    activeDeckId =
      deckId === "d2"
        ? "d2"
        : "d1";

    clearSchedule();
    writeSettings();
    syncUi();
  };

  const setLevel = async (
    nextLevel,
    options = {}
  ) => {
    level = normaliseLevel(
      nextLevel
    );

    clearSchedule();
    writeSettings();
    syncUi();

    if (
      level !== "off" &&
      options.preview !== false
    ) {
      await previewLevel();
    }
  };

  const bind = () => {
    if (
      !document.body.classList
        .contains(
          "brDjPerformanceBody"
        )
    ) {
      return;
    }

    const sheet =
      getSheet();

    if (
      !sheet ||
      sheet.dataset
        .brDjMetronomeBound ===
        "true"
    ) {
      return;
    }

    sheet.dataset
      .brDjMetronomeBound =
      "true";

    readSettings();
    syncUi();

    document.addEventListener(
      "click",
      (event) => {
        const gridStatus =
          event.target.closest(
            ".brDjGridStatus"
          );

        if (gridStatus) {
          window.queueMicrotask(
            () => {
              const deckId =
                getSheet()?.dataset
                  .djGridOptionsDeck;

              if (deckId) {
                setDeck(
                  deckId
                );
              }
            }
          );

          return;
        }

        const button =
          event.target.closest(
            "[data-dj-grid-metronome-level]"
          );

        if (!button) return;

        const deckId =
          getSheet()?.dataset
            .djGridOptionsDeck;

        if (deckId) {
          setDeck(
            deckId
          );
        }

        void setLevel(
          button.dataset
            .djGridMetronomeLevel
        );
      }
    );

    window.addEventListener(
      "brmedia:dj-grid-state",
      (event) => {
        if (
          event.detail
            ?.deckId ===
          activeDeckId
        ) {
          syncUi();
        }
      }
    );

    timer =
      window.setInterval(
        scheduleGridClicks,
        SCHEDULER_INTERVAL_MS
      );
  };

  const stop = () => {
    if (timer) {
      window.clearInterval(
        timer
      );

      timer = 0;
    }

    clearSchedule();
  };

  window.BRMediaDjGridMetronome =
    Object.freeze({
      getLevel: () => level,

      getDeck: () =>
        activeDeckId,

      setLevel,

      setDeck,

      syncUi,

      stop,

      tick:
        scheduleGridClicks,
    });

  window.addEventListener(
    "brmedia:dj-controller-ready",
    bind
  );

  window.addEventListener(
    "pagehide",
    stop,
    {
      once: true,
    }
  );

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      bind,
      {
        once: true,
      }
    );
  } else {
    bind();
  }
})();
