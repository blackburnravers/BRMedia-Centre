(() => {
  "use strict";

  const $ = (
    selector,
    root = document
  ) =>
    root.querySelector(selector);

  const $$ = (
    selector,
    root = document
  ) =>
    Array.from(
      root.querySelectorAll(
        selector
      )
    );

  const STORAGE = {
    target:
      "brmedia.dj.fx.target",

    amount:
      "brmedia.dj.fx.amount",

    beatIndex:
      "brmedia.dj.fx.beat-index",
  };

  const timingSizes = [
    {
      label: "1/8 beat",
      shortLabel: "1/8",
      value: 0.125,
    },

    {
      label: "1/4 beat",
      shortLabel: "1/4",
      value: 0.25,
    },

    {
      label: "1/2 beat",
      shortLabel: "1/2",
      value: 0.5,
    },

    {
      label: "1 beat",
      shortLabel: "1",
      value: 1,
    },

    {
      label: "2 beats",
      shortLabel: "2",
      value: 2,
    },

    {
      label: "1 bar",
      shortLabel: "1 bar",
      value: 4,
    },

    {
      label: "1½ bars",
      shortLabel: "1½ bars",
      value: 6,
    },

    {
      label: "2 bars",
      shortLabel: "2 bars",
      value: 8,
    },
  ];

  const readNumber = (
    key,
    fallback
  ) => {
    const stored =
      localStorage.getItem(key);

    const value =
      stored == null
        ? fallback
        : Number(stored);

    return Number.isFinite(value)
      ? value
      : fallback;
  };

  const runtime = {
    target:
      localStorage.getItem(
        STORAGE.target
      ) || "d1",

    amount: Math.max(
      0,
      Math.min(
        1,
        readNumber(
          STORAGE.amount,
          0.58
        )
      )
    ),

    beatIndex: Math.max(
      0,
      Math.min(
        timingSizes.length - 1,
        Math.round(
          readNumber(
            STORAGE.beatIndex,
            2
          )
        )
      )
    ),
  };

  const normaliseTarget = (
    value
  ) =>
    [
      "d1",
      "both",
      "d2",
    ].includes(value)
      ? value
      : "d1";

  runtime.target =
    normaliseTarget(
      runtime.target
    );

  const getAudioApi = () =>
    window.BRMediaDjAudioEngine ||
    null;

  const getController = () =>
    window
      .BRMediaDjDeckController ||
    null;

  const getTargetDeckIds = () =>
    runtime.target === "both"
      ? ["d1", "d2"]
      : [
          runtime.target === "d2"
            ? "d2"
            : "d1",
        ];

  const getFxState = () => {
    try {
      return (
        getAudioApi()
          ?.getFxState?.() || {
          d1: {
            active: [],
          },

          d2: {
            active: [],
          },
        }
      );
    } catch {
      return {
        d1: {
          active: [],
        },

        d2: {
          active: [],
        },
      };
    }
  };

  const getDeckBeatSeconds = (
    deckId
  ) => {
    const controller =
      getController();

    const config =
      controller
        ?.getConfigById?.(
          deckId
        );

    const state = config
      ? controller
          ?.getStateForConfig?.(
            config
          )
      : null;

    const liveBpm = config
      ? controller
          ?.getDeckEffectiveBpm?.(
            config,
            state
          )
      : null;

    const fallbackBpm =
      Number(
        state?.analysis?.bpm
      ) || 175;

    const bpm = Math.max(
      40,
      Math.min(
        260,
        Number(liveBpm) ||
          fallbackBpm
      )
    );

    const beatSize =
      timingSizes[
        runtime.beatIndex
      ]?.value || 0.5;

    return (
      60 / bpm
    ) * beatSize;
  };

  const getTargetLabel = () =>
    runtime.target === "both"
      ? "Both decks"
      : runtime.target === "d2"
        ? "Deck 2"
        : "Deck 1";

  const syncPadState = () => {
    const targetDeckIds =
      getTargetDeckIds();

    const state =
      getFxState();

    $$(
      "[data-dj-perf-fx-pad]"
    ).forEach((pad) => {
      const effectId =
        pad.dataset
          .djPerfFxPad;

      const activeCount =
        targetDeckIds.filter(
          (deckId) =>
            state?.[
              deckId
            ]?.active?.includes?.(
              effectId
            )
        ).length;

      const active =
        activeCount ===
        targetDeckIds.length;

      const partial =
        activeCount > 0 &&
        !active;

      pad.classList.toggle(
        "is-active",
        active
      );

      pad.classList.toggle(
        "is-partial",
        partial
      );

      pad.setAttribute(
        "aria-pressed",
        active
          ? "true"
          : "false"
      );
    });
  };

  const syncControls = (
    message = ""
  ) => {
    document.body.dataset
      .djFxTarget =
      runtime.target;

    $$(
      "[data-dj-fx-target]"
    ).forEach((button) => {
      const active =
        button.dataset
          .djFxTarget ===
        runtime.target;

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

    const amount =
      $("[data-dj-fx-amount]");

    if (amount) {
      amount.value = String(
        Math.round(
          runtime.amount * 100
        )
      );
    }

    const amountValue =
      $(
        "[data-dj-fx-amount-value]"
      );

    if (amountValue) {
      amountValue.textContent =
        `${Math.round(
          runtime.amount * 100
        )}%`;
    }

    const timing =
      $(
        "[data-dj-fx-timing]"
      );

    if (timing) {
      timing.value = String(
        runtime.beatIndex
      );
    }

    const timingValue =
      $(
        "[data-dj-fx-timing-value]"
      );

    if (timingValue) {
      timingValue.textContent =
        timingSizes[
          runtime.beatIndex
        ]?.label || "1/2 beat";
    }

    const fxState =
      getFxState();

    const d1Count =
      fxState?.d1?.active?.length ||
      0;

    const d2Count =
      fxState?.d2?.active?.length ||
      0;

    const summary =
      $(
        "[data-dj-fx-active-summary]"
      );

    if (summary) {
      summary.textContent =
        `D1 ${d1Count} ON • D2 ${d2Count} ON`;

      summary.classList.toggle(
        "has-active-fx",
        d1Count + d2Count > 0
      );
    }

    const status =
      $(
        "[data-dj-performance-fx-status]"
      );

    if (status) {
      status.textContent =
        message ||
        `${getTargetLabel()} • ${
          timingSizes[
            runtime.beatIndex
          ]?.label || "1/2 beat"
        } • ${Math.round(
          runtime.amount * 100
        )}%`;
    }

    syncPadState();
  };

  const refreshTiming = () => {
    const audioApi =
      getAudioApi();

    if (!audioApi) return;

    const state =
      getFxState();

    ["d1", "d2"].forEach(
      (deckId) => {
        if (
          !state?.[
            deckId
          ]?.active?.length
        ) {
          return;
        }

        audioApi
          .setDeckFxBeatSeconds?.(
            deckId,
            getDeckBeatSeconds(
              deckId
            )
          );
      }
    );
  };

  const readPadName = (
    effectId
  ) => {
    const pad =
      $$(
        "[data-dj-perf-fx-pad]"
      ).find(
        (button) =>
          button.dataset
            .djPerfFxPad ===
          effectId
      );

    return (
      pad
        ?.querySelector(
          "strong"
        )
        ?.textContent
        ?.trim() ||
      effectId
    );
  };

  const toggleEffect = (
    effectId
  ) => {
    const audioApi =
      getAudioApi();

    if (
      !audioApi?.toggleDeckFx
    ) {
      syncControls(
        "FX engine is not loaded"
      );

      return;
    }

    const targetDeckIds =
      getTargetDeckIds();

    const state =
      getFxState();

    const allActive =
      targetDeckIds.every(
        (deckId) =>
          state?.[
            deckId
          ]?.active?.includes?.(
            effectId
          )
      );

    try {
      targetDeckIds.forEach(
        (deckId) => {
          audioApi
            .toggleDeckFx(
              deckId,
              effectId,
              !allActive,
              {
                amount:
                  runtime.amount,

                beatSeconds:
                  getDeckBeatSeconds(
                    deckId
                  ),
              }
            );
        }
      );

      syncControls(
        `${readPadName(
          effectId
        )} ${
          allActive
            ? "off"
            : "on"
        } • ${getTargetLabel()}`
      );
    } catch (error) {
      syncControls(
        error?.message ||
          "Could not activate FX"
      );
    }
  };

  const clearFx = () => {
    const audioApi =
      getAudioApi();

    if (
      typeof audioApi?.clearAllFx ===
      "function"
    ) {
      audioApi.clearAllFx();
    } else {
      ["d1", "d2"].forEach(
        (deckId) => {
          audioApi
            ?.clearDeckFx?.(
              deckId
            );
        }
      );
    }

    /*
      Immediately clear the visible pad states as well as waiting for
      the engine state event.
    */
    $$(
      "[data-dj-perf-fx-pad]"
    ).forEach((pad) => {
      pad.classList.remove(
        "is-active",
        "is-partial"
      );

      pad.setAttribute(
        "aria-pressed",
        "false"
      );
    });

    const summary =
      $(
        "[data-dj-fx-active-summary]"
      );

    if (summary) {
      summary.textContent =
        "D1 0 ON • D2 0 ON";

      summary.classList.remove(
        "has-active-fx"
      );
    }

    syncControls(
      "ALL FX OFF"
    );
  };

  const bind = () => {
    if (
      !document.body
        .classList.contains(
          "brDjPerformanceBody"
        )
    ) {
      return;
    }

    if (
      document.body.dataset
        .brDjPerformanceFxBound ===
      "true"
    ) {
      return;
    }

    document.body.dataset
      .brDjPerformanceFxBound =
      "true";

    document.addEventListener(
      "click",
      (event) => {
        const pad =
          event.target
            ?.closest?.(
              "[data-dj-perf-fx-pad]"
            );

        if (
          pad &&
          !pad.disabled
        ) {
          toggleEffect(
            pad.dataset
              .djPerfFxPad
          );

          return;
        }

        const target =
          event.target
            ?.closest?.(
              "[data-dj-fx-target]"
            );

        if (target) {
          runtime.target =
            normaliseTarget(
              target.dataset
                .djFxTarget
            );

          localStorage.setItem(
            STORAGE.target,
            runtime.target
          );

          syncControls();

          return;
        }
      }
    );

    const clearButton =
      $(
        "[data-dj-fx-clear]"
      );

    let lastKillAt = 0;

    const triggerKill = (
      event
    ) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();

      const now =
        performance.now();

      /*
        pointerdown acts immediately on phones. The later synthetic click
        is ignored so the racks are not rebuilt twice.
      */
      if (
        now - lastKillAt <
        750
      ) {
        return;
      }

      lastKillAt = now;

      clearButton?.classList.add(
        "is-killing"
      );

      clearFx();

      window.setTimeout(() => {
        clearButton?.classList.remove(
          "is-killing"
        );
      }, 220);
    };

    clearButton?.addEventListener(
      "pointerdown",
      triggerKill
    );

    clearButton?.addEventListener(
      "click",
      triggerKill
    );
		
    const timingControl =
      $(
        "[data-dj-fx-timing]"
      );

    const updateTiming = (
      event
    ) => {
      runtime.beatIndex =
        Math.max(
          0,
          Math.min(
            timingSizes.length - 1,
            Math.round(
              Number(
                event.currentTarget.value
              ) || 0
            )
          )
        );

      localStorage.setItem(
        STORAGE.beatIndex,
        String(runtime.beatIndex)
      );

      refreshTiming();
      syncControls();
    };

    timingControl?.addEventListener(
      "input",
      updateTiming
    );

    timingControl?.addEventListener(
      "change",
      updateTiming
    );

    $(
      "[data-dj-fx-amount]"
    )?.addEventListener(
      "input",
      (event) => {
        runtime.amount =
          Math.max(
            0,
            Math.min(
              1,
              Number(
                event
                  .currentTarget
                  .value
              ) / 100
            )
          );

        localStorage.setItem(
          STORAGE.amount,
          String(
            runtime.amount
          )
        );

        ["d1", "d2"].forEach(
          (deckId) => {
            getAudioApi()
              ?.setDeckFxAmount?.(
                deckId,
                runtime.amount
              );
          }
        );

        syncControls();
      }
    );

    window.addEventListener(
      "brmedia:dj-fx-state",
      () => syncControls()
    );

    window.addEventListener(
      "brmedia:dj-transport-state",
      refreshTiming
    );

    window.addEventListener(
      "brmedia:dj-controller-ready",
      refreshTiming
    );

    const grid =
      $(
        "[data-dj-performance-fx-pads]"
      );

    if (
      grid &&
      typeof MutationObserver ===
        "function"
    ) {
      new MutationObserver(
        syncPadState
      ).observe(
        grid,
        {
          childList: true,

          subtree: true,
        }
      );
    }

    syncControls();
  };

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