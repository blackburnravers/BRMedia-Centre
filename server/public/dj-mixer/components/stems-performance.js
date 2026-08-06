(() => {
  "use strict";

  const STEMS = [
    "drums",
    "bass",
    "other",
    "vocals",
  ];

  const STEM_LABELS = {
    drums: "Drums",
    bass: "Bass",
    other: "Other",
    vocals: "Vocals",
  };

  const POLL_INTERVAL_MS =
    1500;

  const $ = (
    selector,
    root = document
  ) =>
    root.querySelector(
      selector
    );

  const $$ = (
    selector,
    root = document
  ) =>
    Array.from(
      root.querySelectorAll(
        selector
      )
    );

  const normaliseDeckId = (
    value
  ) =>
    value === "d2"
      ? "d2"
      : "d1";

  const getAudioApi = () =>
    window
      .BRMediaDjAudioEngine ||
    null;

  const getDeck = (
    deckId
  ) =>
    getAudioApi()
      ?.getDeck?.(
        normaliseDeckId(
          deckId
        )
      ) ||
    null;

  const getPanel = (
    deckId
  ) =>
    $(
      `[data-dj-stems-deck="${normaliseDeckId(
        deckId
      )}"]`
    );

  const formatBytes = (
    bytes = 0
  ) => {
    const value =
      Math.max(
        0,
        Number(bytes) ||
          0
      );

    if (
      value >=
      1024 ** 3
    ) {
      return `${(
        value /
        1024 ** 3
      ).toFixed(1)} GB`;
    }

    if (
      value >=
      1024 ** 2
    ) {
      return `${(
        value /
        1024 ** 2
      ).toFixed(1)} MB`;
    }

    if (
      value >=
      1024
    ) {
      return `${Math.round(
        value / 1024
      )} KB`;
    }

    return `${value} B`;
  };

  const fetchJson =
    async (
      url,
      options = {}
    ) => {
      const response =
        await fetch(
          url,
          {
            cache:
              "no-store",

            ...options,
          }
        );

      const payload =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (
        !response.ok
      ) {
        throw new Error(
          payload?.error ||
          `Request failed (${response.status})`
        );
      }

      return payload;
    };

  const emitStemState = (
    deck
  ) => {
    window.dispatchEvent(
      new CustomEvent(
        "brmedia:dj-stems-state",
        {
          detail: {
            deckId:
              deck.deckId,

            state:
              deck
                .getStemState(),
          },
        }
      )
    );
  };

  const stopStemSources = (
    deck,
    stopClockTime = 0
  ) => {
    const sources =
      Array.from(
        deck
          .brStems
          .sources
          .values()
      );

    deck
      .brStems
      .sources
      .clear();

    sources.forEach(
      ({
        source,
        gain,
      }) => {
        try {
          source.onended =
            null;

          source.stop(
            stopClockTime ||
            0
          );
        } catch {}

        const delayMs =
          stopClockTime >
          deck.context
            .currentTime
            ? Math.ceil(
                (
                  stopClockTime -
                  deck.context
                    .currentTime
                ) *
                1000
              ) +
              30

            : 0;

        window.setTimeout(
          () => {
            try {
              source
                .disconnect();
            } catch {}

            try {
              gain
                .disconnect();
            } catch {}
          },

          delayMs
        );
      }
    );

    if (
      sources.some(
        ({
          source,
        }) =>
          deck.source ===
          source
      )
    ) {
      deck.source =
        null;
    }
  };

  const applyStemLevels = (
    deck
  ) => {
    STEMS.forEach(
      (
        stem
      ) => {
        const active =
          deck
            .brStems
            .sources
            .get(stem);

        if (!active) {
          return;
        }

        const level =
          deck
            .brStems
            .muted[
              stem
            ]
            ? 0
            : deck
                .brStems
                .levels[
                  stem
                ];

        try {
          active
            .gain
            .gain
            .setTargetAtTime(
              level,

              deck.context
                .currentTime,

              0.01
            );
        } catch {
          active
            .gain
            .gain
            .value =
            level;
        }
      }
    );
  };

  const startStemPlayback =
    async (
      deck,

      offset =
        deck.pausedAt,

      options = {}
    ) => {
      if (
        !deck
          .brStems
          .ready ||

        STEMS.some(
          (
            stem
          ) =>
            !deck
              .brStems
              .buffers
              .has(stem)
        )
      ) {
        deck.error =
          "Prepare and load all four stems first";

        deck.lastAction =
          "Stem play blocked";

        deck.emit();

        return deck
          .getState();
      }

      await deck
        .engine
        .unlock();

      deck
        .cancelVinylBrake?.();

      deck
        .stopVinylScratchGrain?.();

      deck.vinylScratchActive =
        false;

      deck.vinylScratchWasPlaying =
        false;

      deck
        .brStems
        .original
        .stopSourceOnly();

      stopStemSources(
        deck
      );

      deck
        .stopNativeAudioOnly();

      const safeOffset =
        deck
          .resolveLoopStartOffset(
            offset
          );

      const requestedStartClockTime =
        Number(
          options
            ?.startClockTime
        );

      const requestedDelay =
        Number(
          options
            ?.delaySeconds
        );

      const contextTime =
        deck.context
          .currentTime;

      const scheduledStartAt =
        Number.isFinite(
          requestedStartClockTime
        )
          ? Math.max(
              contextTime,
              requestedStartClockTime
            )

          : contextTime +
            (
              Number.isFinite(
                requestedDelay
              )
                ? Math.max(
                    0,

                    Math.min(
                      2,
                      requestedDelay
                    )
                  )

                : 0
            );

      const preRollDelay =
        Math.max(
          0,

          -safeOffset /
          Math.max(
            0.01,
            deck
              .playbackRate
          )
        );

      let primarySource =
        null;

      STEMS.forEach(
        (
          stem
        ) => {
          const buffer =
            deck
              .brStems
              .buffers
              .get(stem);

          const source =
            deck.context
              .createBufferSource();

          const gain =
            deck.context
              .createGain();

          source.buffer =
            buffer;

          source
            .playbackRate
            .value =
            deck
              .playbackRate;

          deck
            .applyLoopToSource(
              source
            );

          gain.gain.value =
            deck
              .brStems
              .muted[
                stem
              ]
              ? 0
              : deck
                  .brStems
                  .levels[
                    stem
                  ];

          source.connect(
            gain
          );

          gain.connect(
            deck
              .trimGainNode
          );

          deck
            .brStems
            .sources
            .set(
              stem,
              {
                source,
                gain,
              }
            );

          if (
            !primarySource
          ) {
            primarySource =
              source;
          }

          source.start(
            scheduledStartAt +
            preRollDelay,

            Math.max(
              0,
              safeOffset
            )
          );
        }
      );

      deck.source =
        primarySource;

      deck.startedAt =
        scheduledStartAt;

      deck.startedOffset =
        safeOffset;

      deck.pausedAt =
        safeOffset;

      deck.isPlaying =
        true;

      deck.error = "";

      deck.lastAction =
        "Stem Mix play";

      if (
        primarySource
      ) {
        primarySource
          .onended =
          () => {
            if (
              deck.source !==
                primarySource ||

              !deck
                .isPlaying
            ) {
              return;
            }

            stopStemSources(
              deck
            );

            deck.isPlaying =
              false;

            deck.pausedAt =
              0;

            deck.lastAction =
              "Stem Mix ended";

            deck.emit();

            emitStemState(
              deck
            );
          };
      }

      deck.emit();

      emitStemState(
        deck
      );

      return deck
        .getState();
    };

  const augmentDeck = (
    deck
  ) => {
    if (
      !deck ||
      deck
        .__brStemsAugmented
    ) {
      return deck;
    }

    deck.__brStemsAugmented =
      true;

    const original = {
      loadFile:
        deck
          .loadFile
          .bind(deck),

      play:
        deck
          .play
          .bind(deck),

      pause:
        deck
          .pause
          .bind(deck),

      pauseAtClockTime:
        deck
          .pauseAtClockTime
          .bind(deck),

      stop:
        deck
          .stop
          .bind(deck),

      seek:
        deck
          .seek
          .bind(deck),

      setPlaybackRate:
        deck
          .setPlaybackRate
          .bind(deck),

      stopSourceOnly:
        deck
          .stopSourceOnly
          .bind(deck),

      clearLoop:
        deck
          .clearLoop
          .bind(deck),

      enterNativeBackgroundAudio:
        deck
          .enterNativeBackgroundAudio
          .bind(deck),
    };

    deck.brStems = {
      original,

      trackId: "",

      buffers:
        new Map(),

      sources:
        new Map(),

      levels: {
        drums: 1,
        bass: 1,
        other: 1,
        vocals: 1,
      },

      muted: {
        drums: false,
        bass: false,
        other: false,
        vocals: false,
      },

      mode:
        "original",

      ready:
        false,

      loading:
        false,

      error: "",

      serverStatus:
        "missing",

      pollToken:
        0,
    };

    deck.getStemState =
      () => ({
        deckId:
          deck.deckId,

        trackId:
          deck
            .brStems
            .trackId,

        ready:
          deck
            .brStems
            .ready,

        loading:
          deck
            .brStems
            .loading,

        error:
          deck
            .brStems
            .error,

        serverStatus:
          deck
            .brStems
            .serverStatus,

        mode:
          deck
            .brStems
            .mode,

        levels: {
          ...deck
            .brStems
            .levels,
        },

        muted: {
          ...deck
            .brStems
            .muted,
        },

        active:
          deck
            .brStems
            .sources
            .size > 0,
      });

    deck.clearPreparedStems =
      () => {
        deck
          .brStems
          .pollToken +=
          1;

        stopStemSources(
          deck
        );

        deck
          .brStems
          .buffers
          .clear();

        deck
          .brStems
          .trackId =
          "";

        deck
          .brStems
          .ready =
          false;

        deck
          .brStems
          .loading =
          false;

        deck
          .brStems
          .error =
          "";

        deck
          .brStems
          .serverStatus =
          "missing";

        deck
          .brStems
          .mode =
          "original";

        emitStemState(
          deck
        );

        return deck
          .getStemState();
      };

    deck.loadPreparedStems =
      async (
        status = {}
      ) => {
        const trackId =
          String(
            status
              .trackId ||

            deck
              .libraryItemId ||

            ""
          );

        if (!trackId) {
          throw new Error(
            "Load a Performance Library track first"
          );
        }

        deck
          .brStems
          .loading =
          true;

        deck
          .brStems
          .error =
          "";

        deck
          .brStems
          .serverStatus =
          "loading";

        emitStemState(
          deck
        );

        try {
          const decoded =
            await Promise.all(
              STEMS.map(
                async (
                  stem
                ) => {
                  const url =
                    status
                      ?.stems
                      ?.[stem] ||

                    `/library/${encodeURIComponent(
                      trackId
                    )}/stems/${stem}`;

                  const response =
                    await fetch(
                      url,
                      {
                        cache:
                          "no-store",
                      }
                    );

                  if (
                    !response.ok
                  ) {
                    const payload =
                      await response
                        .json()
                        .catch(
                          () =>
                            ({})
                        );

                    throw new Error(
                      payload
                        ?.error ||

                      `Could not load ${STEM_LABELS[stem]}`
                    );
                  }

                  const bytes =
                    await response
                      .arrayBuffer();

                  const buffer =
                    await deck
                      .engine
                      .decodeAudioData(
                        bytes
                      );

                  return [
                    stem,
                    buffer,
                  ];
                }
              )
            );

          if (
            String(
              deck
                .libraryItemId ||
              ""
            ) !==
            trackId
          ) {
            throw new Error(
              "The deck track changed while stems were loading"
            );
          }

          stopStemSources(
            deck
          );

          deck
            .brStems
            .buffers =
            new Map(
              decoded
            );

          deck
            .brStems
            .trackId =
            trackId;

          deck
            .brStems
            .ready =
            STEMS.every(
              (
                stem
              ) =>
                deck
                  .brStems
                  .buffers
                  .has(stem)
            );

          deck
            .brStems
            .loading =
            false;

          deck
            .brStems
            .error =
            "";

          deck
            .brStems
            .serverStatus =
            "ready";

          emitStemState(
            deck
          );

          return deck
            .getStemState();
        } catch (
          error
        ) {
          deck
            .brStems
            .loading =
            false;

          deck
            .brStems
            .ready =
            false;

          deck
            .brStems
            .error =
            error?.message ||
            "Could not load prepared stems";

          deck
            .brStems
            .serverStatus =
            "error";

          emitStemState(
            deck
          );

          throw error;
        }
      };

    deck.setStemMode =
      async (
        mode =
          "original"
      ) => {
        const nextMode =
          mode === "stems"
            ? "stems"
            : "original";

        if (
          nextMode ===
            "stems" &&

          !deck
            .brStems
            .ready
        ) {
          throw new Error(
            "Prepare and load stems first"
          );
        }

        if (
          deck
            .brStems
            .mode ===
          nextMode
        ) {
          return deck
            .getStemState();
        }

        const wasPlaying =
          deck
            .isPlaying;

        const position =
          deck
            .getCurrentTime();

        if (
          deck
            .brStems
            .mode ===
          "stems"
        ) {
          stopStemSources(
            deck
          );
        } else {
          original
            .stopSourceOnly();

          deck
            .stopNativeAudioOnly();
        }

        deck.isPlaying =
          false;

        deck.pausedAt =
          position;

        deck.startedOffset =
          position;

        deck
          .brStems
          .mode =
          nextMode;

        if (
          wasPlaying
        ) {
          if (
            nextMode ===
            "stems"
          ) {
            await startStemPlayback(
              deck,
              position
            );
          } else {
            await original
              .play(
                position
              );
          }
        } else {
          deck.emit();
        }

        emitStemState(
          deck
        );

        return deck
          .getStemState();
      };

    deck.setStemLevel =
      (
        stem,
        value
      ) => {
        if (
          !STEMS.includes(
            stem
          )
        ) {
          return deck
            .getStemState();
        }

        deck
          .brStems
          .levels[
            stem
          ] =
          Math.max(
            0,

            Math.min(
              1.25,

              Number(value) ||
              0
            )
          );

        applyStemLevels(
          deck
        );

        emitStemState(
          deck
        );

        return deck
          .getStemState();
      };

    deck.setStemMuted =
      (
        stem,
        muted
      ) => {
        if (
          !STEMS.includes(
            stem
          )
        ) {
          return deck
            .getStemState();
        }

        deck
          .brStems
          .muted[
            stem
          ] =
          Boolean(
            muted
          );

        applyStemLevels(
          deck
        );

        emitStemState(
          deck
        );

        return deck
          .getStemState();
      };

    deck.resetStemMix =
      () => {
        STEMS.forEach(
          (
            stem
          ) => {
            deck
              .brStems
              .levels[
                stem
              ] =
              1;

            deck
              .brStems
              .muted[
                stem
              ] =
              false;
          }
        );

        applyStemLevels(
          deck
        );

        emitStemState(
          deck
        );

        return deck
          .getStemState();
      };

    deck.stopSourceOnly =
      () => {
        stopStemSources(
          deck
        );

        return original
          .stopSourceOnly();
      };

    deck.loadFile =
      async (
        file,
        options = {}
      ) => {
        deck
          .clearPreparedStems();

        const state =
          await original
            .loadFile(
              file,
              options
            );

        emitStemState(
          deck
        );

        return state;
      };

    deck.play =
      (
        offset =
          deck.pausedAt,

        options = {}
      ) =>
        deck
          .brStems
          .mode ===
          "stems"
          ? startStemPlayback(
              deck,
              offset,
              options
            )

          : original
              .play(
                offset,
                options
              );

    deck.pause =
      () => {
        if (
          deck
            .brStems
            .mode !==
          "stems"
        ) {
          return original
            .pause();
        }

        if (
          !deck
            .isPlaying
        ) {
          return deck
            .getState();
        }

        deck.pausedAt =
          deck
            .getCurrentTime();

        deck.startedOffset =
          deck.pausedAt;

        stopStemSources(
          deck
        );

        deck.isPlaying =
          false;

        deck.lastAction =
          "Stem Mix paused";

        deck.emit();

        emitStemState(
          deck
        );

        return deck
          .getState();
      };

    deck.pauseAtClockTime =
      (
        clockTime =
          deck.context
            .currentTime
      ) => {
        if (
          deck
            .brStems
            .mode !==
          "stems"
        ) {
          return original
            .pauseAtClockTime(
              clockTime
            );
        }

        if (
          !deck
            .isPlaying
        ) {
          return deck
            .getState();
        }

        const stopClockTime =
          Math.max(
            deck.context
              .currentTime,

            Number.isFinite(
              Number(
                clockTime
              )
            )
              ? Number(
                  clockTime
                )

              : deck.context
                  .currentTime
          );

        deck.pausedAt =
          deck
            .getCurrentTimeAtClockTime(
              stopClockTime
            );

        deck.startedOffset =
          deck.pausedAt;

        deck.startedAt =
          stopClockTime;

        stopStemSources(
          deck,
          stopClockTime
        );

        deck.isPlaying =
          false;

        deck.lastAction =
          "Linked Stem Mix pause";

        deck.emit();

        emitStemState(
          deck
        );

        return deck
          .getState();
      };

    deck.stop =
      () => {
        if (
          deck
            .brStems
            .mode !==
          "stems"
        ) {
          return original
            .stop();
        }

        stopStemSources(
          deck
        );

        deck
          .stopNativeAudioOnly();

        deck.isPlaying =
          false;

        deck.pausedAt =
          0;

        deck.startedOffset =
          0;

        deck.startedAt =
          deck.context
            .currentTime;

        deck.lastAction =
          "Stem Mix stopped";

        deck.emit();

        emitStemState(
          deck
        );

        return deck
          .getState();
      };

    deck.seek =
      async (
        seconds
      ) => {
        if (
          deck
            .brStems
            .mode !==
          "stems"
        ) {
          return original
            .seek(
              seconds
            );
        }

        if (
          !deck
            .isLoaded ||

          !deck
            .buffer
        ) {
          return deck
            .getState();
        }

        const target =
          deck.clampTime(
            seconds,
            false,
            true
          );

        const wasPlaying =
          deck
            .isPlaying;

        stopStemSources(
          deck
        );

        deck.isPlaying =
          false;

        deck.pausedAt =
          target;

        deck.startedOffset =
          target;

        deck.startedAt =
          deck.context
            .currentTime;

        if (
          wasPlaying
        ) {
          return startStemPlayback(
            deck,
            target
          );
        }

        deck.lastAction =
          `Stem Mix seek ${target.toFixed(
            2
          )}s`;

        deck.emit();

        return deck
          .getState();
      };

    deck.setPlaybackRate =
      (
        rate,
        options = {}
      ) => {
        const state =
          original
            .setPlaybackRate(
              rate,
              options
            );

        deck
          .brStems
          .sources
          .forEach(
            ({
              source,
            }) => {
              try {
                source
                  .playbackRate
                  .value =
                  deck
                    .playbackRate;
              } catch {}
            }
          );

        return state;
      };

    deck.clearLoop =
      () => {
        const state =
          original
            .clearLoop();

        deck
          .brStems
          .sources
          .forEach(
            ({
              source,
            }) => {
              try {
                source.loop =
                  false;
              } catch {}
            }
          );

        return state;
      };

    deck.enterNativeBackgroundAudio =
      async () => {
        if (
          deck
            .brStems
            .mode ===
          "stems"
        ) {
          return false;
        }

        return original
          .enterNativeBackgroundAudio();
      };

    return deck;
  };

  const renderPanel = (
    deckId
  ) => {
    const deck =
      augmentDeck(
        getDeck(
          deckId
        )
      );

    const panel =
      getPanel(
        deckId
      );

    if (
      !deck ||
      !panel
    ) {
      return;
    }

    const deckState =
      deck
        .getState();

    const state =
      deck
        .getStemState();

    const hasLibraryTrack =
      Boolean(
        deckState
          .isLoaded &&

        deckState
          .libraryItemId
      );

    panel.dataset
      .stemMode =
      state.mode;

    panel.classList
      .toggle(
        "is-stems-ready",
        state.ready
      );

    panel.classList
      .toggle(
        "is-stems-loading",
        state.loading
      );

    $$(
      "[data-dj-stem-mode]",
      panel
    ).forEach(
      (
        button
      ) => {
        const active =
          button.dataset
            .djStemMode ===
          state.mode;

        button.classList
          .toggle(
            "is-active",
            active
          );

        button.setAttribute(
          "aria-pressed",

          active
            ? "true"
            : "false"
        );

        button.disabled =
          button.dataset
            .djStemMode ===
            "stems" &&

          !state.ready;
      }
    );

    const prepareButton =
      $(
        "[data-dj-stems-prepare]",
        panel
      );

    const deleteButton =
      $(
        "[data-dj-stems-delete]",
        panel
      );

    const resetButton =
      $(
        "[data-dj-stems-reset]",
        panel
      );

    if (
      prepareButton
    ) {
      prepareButton.disabled =
        !hasLibraryTrack ||
        state.loading;

      const prepareLabel =
        $(
          "span",
          prepareButton
        );

      if (
        prepareLabel
      ) {
        prepareLabel.textContent =
          state.loading
            ? "Preparing…"

            : state.ready
              ? "Reload Stems"

              : "Prepare Stems";
      }
    }

    if (
      deleteButton
    ) {
      deleteButton.disabled =
        !state.ready &&
        state.serverStatus !==
          "ready";
    }

    if (
      resetButton
    ) {
      resetButton.disabled =
        false;
    }

    STEMS.forEach(
      (
        stem
      ) => {
        const lane =
          $(
            `[data-dj-stem-lane="${stem}"]`,
            panel
          );

        if (!lane) {
          return;
        }

        const range =
          $(
            "[data-dj-stem-level]",
            lane
          );

        const mute =
          $(
            "[data-dj-stem-mute]",
            lane
          );

        const value =
          $(
            "[data-dj-stem-value]",
            lane
          );

        const percent =
          Math.round(
            state
              .levels[
                stem
              ] *
            100
          );

        lane.classList
          .toggle(
            "is-muted",

            state
              .muted[
                stem
              ]
          );

        lane.style
          .setProperty(
            "--br-dj-stem-position",

            `${100 -
              Math.min(
                100,
                (
                  percent /
                  125
                ) *
                100
              )}%`
          );

        if (
          range
        ) {
          range.value =
            String(
              percent
            );

          range.disabled =
            false;
        }

        if (
          mute
        ) {
          mute.disabled =
            false;

          mute.setAttribute(
            "aria-pressed",

            state
              .muted[
                stem
              ]
              ? "true"
              : "false"
          );
        }

        if (
          value
        ) {
          value.textContent =
            state
              .muted[
                stem
              ]
              ? "Muted"

              : `${percent}%`;
        }
      }
    );

    const status =
      $(
        "[data-dj-stems-status]",
        panel
      );

    if (!status) {
      return;
    }

    status.textContent =
      state.error ||

      (
        !deckState
          .isLoaded
          ? "Load a Performance Library track into this deck"

          : !deckState
              .libraryItemId
            ? "Stems require a track loaded from the Performance Library"

            : state.loading
              ? "Loading four lossless stems into the deck…"

              : state.ready
                ? `${
                    state.mode ===
                    "stems"
                      ? "Stem Mix active"
                      : "Stems ready"
                  } • ${
                    deckState
                      .trackTitle ||
                    deckState
                      .fileName
                  }`

                : "On-demand only • press Prepare Stems for this track"
      );
  };

  const pollUntilReady =
    async (
      deckId,
      trackId,
      pollToken
    ) => {
      const deck =
        augmentDeck(
          getDeck(
            deckId
          )
        );

      const panel =
        getPanel(
          deckId
        );

      if (
        !deck ||
        !panel
      ) {
        return;
      }

      while (
        deck
          .brStems
          .pollToken ===
        pollToken
      ) {
        try {
          const status =
            await fetchJson(
              `/library/${encodeURIComponent(
                trackId
              )}/stems`
            );

          deck
            .brStems
            .serverStatus =
            status.status ||
            "missing";

          const statusNode =
            $(
              "[data-dj-stems-status]",
              panel
            );

          if (
            statusNode
          ) {
            const percent =
              Math.round(
                (
                  Number(
                    status
                      .progress
                  ) ||
                  0
                ) *
                100
              );

            statusNode.textContent =
              status.status ===
                "queued"
                ? "Stem job queued • jobs run one at a time"

                : status.status ===
                    "running"
                  ? `${String(
                      status.stage ||
                      "Preparing"
                    ).replace(
                      /-/g,
                      " "
                    )} • ${percent}%`

                  : status.status ===
                      "ready"
                    ? `Four lossless stems ready • ${formatBytes(
                        status.bytes
                      )}`

                    : status.error ||
                      "Stem preparation failed";
          }

          if (
            status.status ===
            "ready"
          ) {
            await deck
              .loadPreparedStems(
                status
              );

            renderPanel(
              deckId
            );

            return;
          }

          if (
            status.status ===
            "error"
          ) {
            deck
              .brStems
              .loading =
              false;

            deck
              .brStems
              .error =
              status.error ||
              "Stem preparation failed";

            emitStemState(
              deck
            );

            renderPanel(
              deckId
            );

            return;
          }
        } catch (
          error
        ) {
          deck
            .brStems
            .loading =
            false;

          deck
            .brStems
            .error =
            error?.message ||
            "Could not check stem preparation";

          emitStemState(
            deck
          );

          renderPanel(
            deckId
          );

          return;
        }

        await new Promise(
          (
            resolve
          ) =>
            window.setTimeout(
              resolve,
              POLL_INTERVAL_MS
            )
        );
      }
    };

  const refreshStemStatus =
    async (
      deckId
    ) => {
      const deck =
        augmentDeck(
          getDeck(
            deckId
          )
        );

      if (!deck) {
        return;
      }

      const trackId =
        String(
          deck
            .libraryItemId ||
          ""
        );

      if (!trackId) {
        renderPanel(
          deckId
        );

        return;
      }

      try {
        const status =
          await fetchJson(
            `/library/${encodeURIComponent(
              trackId
            )}/stems`
          );

        deck
          .brStems
          .serverStatus =
          status.status ||
          "missing";

        if (
          status.status ===
            "ready" &&

          deck
            .brStems
            .trackId !==
            trackId
        ) {
          await deck
            .loadPreparedStems(
              status
            );
        } else if (
          [
            "queued",
            "running",
          ].includes(
            status.status
          )
        ) {
          deck
            .brStems
            .loading =
            true;

          deck
            .brStems
            .pollToken +=
            1;

          void pollUntilReady(
            deckId,
            trackId,

            deck
              .brStems
              .pollToken
          );
        }
      } catch (
        error
      ) {
        deck
          .brStems
          .error =
          error?.message ||
          "Could not check stems";
      }

      renderPanel(
        deckId
      );
    };
		
  const setStemFaderFromPointer = (
    deckId,
    stem,
    faderBox,
    event
  ) => {
    const rect =
      faderBox
        .getBoundingClientRect();

    if (
      !rect.height
    ) {
      return;
    }

    const ratio =
      Math.max(
        0,

        Math.min(
          1,

          (
            rect.bottom -
            event.clientY
          ) /
          rect.height
        )
      );

    const percent =
      Math.round(
        ratio *
        125
      );

    augmentDeck(
      getDeck(
        deckId
      )
    )?.setStemLevel(
      stem,
      percent / 100
    );

    renderPanel(
      deckId
    );
  };

  const bindStemFaderPointer = (
    deckId,
    stem,
    faderBox
  ) => {
    if (
      !faderBox ||
      faderBox.dataset
        .djStemPointerBound ===
        "true"
    ) {
      return;
    }

    faderBox.dataset
      .djStemPointerBound =
      "true";

    let activePointerId =
      null;

    faderBox.addEventListener(
      "pointerdown",

      (
        event
      ) => {
        if (
          event.button !==
            undefined &&
          event.button !== 0
        ) {
          return;
        }

        activePointerId =
          event.pointerId;

        try {
          faderBox
            .setPointerCapture(
              event.pointerId
            );
        } catch {}

        event.preventDefault();

        setStemFaderFromPointer(
          deckId,
          stem,
          faderBox,
          event
        );
      },

      {
        passive: false,
      }
    );

    faderBox.addEventListener(
      "pointermove",

      (
        event
      ) => {
        if (
          activePointerId !==
          event.pointerId
        ) {
          return;
        }

        event.preventDefault();

        setStemFaderFromPointer(
          deckId,
          stem,
          faderBox,
          event
        );
      },

      {
        passive: false,
      }
    );

    const releasePointer = (
      event
    ) => {
      if (
        activePointerId !==
        event.pointerId
      ) {
        return;
      }

      activePointerId =
        null;

      try {
        faderBox
          .releasePointerCapture(
            event.pointerId
          );
      } catch {}
    };

    faderBox.addEventListener(
      "pointerup",
      releasePointer
    );

    faderBox.addEventListener(
      "pointercancel",
      releasePointer
    );
  };

  const bindPanel = (
    panel
  ) => {
    const deckId =
      normaliseDeckId(
        panel.dataset
          .djStemsDeck
      );

    $(
      "[data-dj-stems-prepare]",
      panel
    )?.addEventListener(
      "click",

      async () => {
        const deck =
          augmentDeck(
            getDeck(
              deckId
            )
          );

        const trackId =
          String(
            deck
              ?.libraryItemId ||
            ""
          );

        if (!trackId) {
          if (deck) {
            deck
              .brStems
              .error =
              "Load a Performance Library track first";
          }

          renderPanel(
            deckId
          );

          return;
        }

        deck
          .brStems
          .loading =
          true;

        deck
          .brStems
          .error =
          "";

        deck
          .brStems
          .serverStatus =
          "queued";

        deck
          .brStems
          .pollToken +=
          1;

        const token =
          deck
            .brStems
            .pollToken;

        renderPanel(
          deckId
        );

        try {
          const status =
            await fetchJson(
              `/library/${encodeURIComponent(
                trackId
              )}/stems`,

              {
                method:
                  "POST",
              }
            );

          if (
            status.status ===
            "ready"
          ) {
            await deck
              .loadPreparedStems(
                status
              );

            renderPanel(
              deckId
            );

            return;
          }

          void pollUntilReady(
            deckId,
            trackId,
            token
          );
        } catch (
          error
        ) {
          deck
            .brStems
            .loading =
            false;

          deck
            .brStems
            .error =
            error?.message ||
            "Could not prepare stems";

          emitStemState(
            deck
          );

          renderPanel(
            deckId
          );
        }
      }
    );

    $(
      "[data-dj-stems-delete]",
      panel
    )?.addEventListener(
      "click",

      async () => {
        const deck =
          augmentDeck(
            getDeck(
              deckId
            )
          );

        const trackId =
          String(
            deck
              ?.libraryItemId ||

            deck
              ?.brStems
              .trackId ||

            ""
          );

        if (!trackId) {
          return;
        }

        if (
          !window.confirm(
            "Delete the four generated stems for this track? The original music file will not be touched."
          )
        ) {
          return;
        }

        try {
          await deck
            .setStemMode(
              "original"
            )
            .catch(
              () => {}
            );

          await fetchJson(
            `/library/${encodeURIComponent(
              trackId
            )}/stems`,

            {
              method:
                "DELETE",
            }
          );

          deck
            .clearPreparedStems();
        } catch (
          error
        ) {
          deck
            .brStems
            .error =
            error?.message ||
            "Could not delete stems";
        }

        renderPanel(
          deckId
        );
      }
    );

    $(
      "[data-dj-stems-reset]",
      panel
    )?.addEventListener(
      "click",
      () => {
        augmentDeck(
          getDeck(
            deckId
          )
        )?.resetStemMix();

        renderPanel(
          deckId
        );
      }
    );

    $$(
      "[data-dj-stem-mode]",
      panel
    ).forEach(
      (
        button
      ) => {
        button.addEventListener(
          "click",

          async () => {
            const deck =
              augmentDeck(
                getDeck(
                  deckId
                )
              );

            try {
              await deck
                .setStemMode(
                  button.dataset
                    .djStemMode
                );
            } catch (
              error
            ) {
              deck
                .brStems
                .error =
                error?.message ||
                "Could not change stem mode";
            }

            renderPanel(
              deckId
            );
          }
        );
      }
    );

    $$(
      "[data-dj-stem-lane]",
      panel
    ).forEach(
      (
        lane
      ) => {
        const stem =
          lane.dataset
            .djStemLane;

        const faderBox =
          $(
            ".brDjStemFaderBox",
            lane
          );

        bindStemFaderPointer(
          deckId,
          stem,
          faderBox
        );

        $(
          "[data-dj-stem-level]",
          lane
        )?.addEventListener(
          "input",

          (
            event
          ) => {
            augmentDeck(
              getDeck(
                deckId
              )
            )?.setStemLevel(
              stem,

              Number(
                event
                  .currentTarget
                  .value
              ) /
              100
            );

            renderPanel(
              deckId
            );
          }
        );

        $(
          "[data-dj-stem-mute]",
          lane
        )?.addEventListener(
          "click",

          () => {
            const deck =
              augmentDeck(
                getDeck(
                  deckId
                )
              );

            const state =
              deck
                .getStemState();

            deck.setStemMuted(
              stem,

              !state
                .muted[
                  stem
                ]
            );

            renderPanel(
              deckId
            );
          }
        );
      }
    );
  };

  const bind = () => {
    if (
      !document.body
        .classList
        .contains(
          "brDjPerformanceBody"
        )
    ) {
      return;
    }

    [
      "d1",
      "d2",
    ].forEach(
      (
        deckId
      ) =>
        augmentDeck(
          getDeck(
            deckId
          )
        )
    );

    $$(
      "[data-dj-stems-deck]"
    ).forEach(
      bindPanel
    );

    window.addEventListener(
      "brmedia:dj-audio-state",

      (
        event
      ) => {
        const deckId =
          normaliseDeckId(
            event.detail
              ?.deckId
          );

        const deck =
          augmentDeck(
            getDeck(
              deckId
            )
          );

        const state =
          event.detail
            ?.state ||
          {};

        if (
          deck
            ?.brStems
            .trackId &&

          state
            .libraryItemId &&

          deck
            .brStems
            .trackId !==
            state
              .libraryItemId
        ) {
          deck
            .clearPreparedStems();
        }

        renderPanel(
          deckId
        );
      }
    );

    window.addEventListener(
      "brmedia:dj-stems-state",

      (
        event
      ) => {
        renderPanel(
          normaliseDeckId(
            event.detail
              ?.deckId
          )
        );
      }
    );

    document.addEventListener(
      "click",

      (
        event
      ) => {
        const button =
          event.target
            ?.closest?.(
              '[data-deck-tab="stems"]'
            );

        if (!button) {
          return;
        }

        const deckId =
          document.body
            .dataset
            .djPerfView ===
          "deck-2"
            ? "d2"
            : "d1";

        window.setTimeout(
          () =>
            void refreshStemStatus(
              deckId
            ),

          0
        );
      }
    );

    [
      "d1",
      "d2",
    ].forEach(
      renderPanel
    );
  };

  if (
    document
      .readyState ===
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