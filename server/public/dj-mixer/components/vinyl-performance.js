(() => {
  "use strict";

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

  /*
    One visual record revolution represents a 33⅓ RPM record revolution.
    This gives the touch movement a predictable physical relationship to
    the real track position.
  */
  const REVOLUTION_SECONDS =
    60 / 33.333333;

  const scratchEnabled = {
    d1: true,
    d2: true,
  };

  const pointerState =
    new Map();

  const getAudioApi = () =>
    window
      .BRMediaDjAudioEngine ||
    null;

  const getDeck = (
    deckId
  ) =>
    getAudioApi()
      ?.getDeck?.(
        deckId
      ) ||
    null;

  const normaliseDeckId = (
    value
  ) =>
    value === "d2"
      ? "d2"
      : "d1";

  const getPointerAngle = (
    event,
    element
  ) => {
    const rect =
      element
        .getBoundingClientRect();

    const centreX =
      rect.left +
      rect.width / 2;

    const centreY =
      rect.top +
      rect.height / 2;

    return (
      Math.atan2(
        event.clientY -
          centreY,
        event.clientX -
          centreX
      ) *
      180 /
      Math.PI
    );
  };

  const normaliseAngleDelta = (
    value
  ) => {
    let delta =
      Number(value) || 0;

    while (delta > 180) {
      delta -= 360;
    }

    while (delta < -180) {
      delta += 360;
    }

    return delta;
  };

  const syncScratchButton = (
    deckId
  ) => {
    const enabled =
      Boolean(
        scratchEnabled[
          deckId
        ]
      );

    $$(
      `[data-dj-vinyl-action="scratch"][data-dj-vinyl-deck-id="${deckId}"]`
    ).forEach(
      (button) => {
        button.classList.toggle(
          "is-active",
          enabled
        );

        button.setAttribute(
          "aria-pressed",
          enabled
            ? "true"
            : "false"
        );
      }
    );
  };

  const setVinylStatus = (
    deckId,
    message = ""
  ) => {
    const panel =
      $(
        `.brDjVinylDeckView[data-dj-vinyl-engine-deck="${deckId}"]`
      );

    const status =
      panel?.querySelector(
        "[data-dj-vinyl-status]"
      );

    if (status) {
      status.textContent =
        message ||
        "Touch the record to scratch";
    }
  };

  const beginScratch = (
    event,
    disc
  ) => {
    const deckId =
      normaliseDeckId(
        disc.dataset
          .djVinylPlatter
      );

    const deck =
      getDeck(deckId);

    const state =
      deck?.getState?.();

    if (
      !scratchEnabled[
        deckId
      ] ||
      !deck ||
      !state?.isLoaded
    ) {
      return;
    }

    event.preventDefault();

    try {
      disc.setPointerCapture?.(
        event.pointerId
      );
    } catch {}

    const angle =
      getPointerAngle(
        event,
        disc
      );

    deck.beginVinylScratch?.();

    const nextState =
      deck.getState();

    pointerState.set(
      event.pointerId,
      {
        deckId,
        disc,

        lastAngle:
          angle,

        lastTime:
          performance.now(),

        position:
          Number(
            nextState?.currentTime
          ) || 0,

        visualAngle: 0,
      }
    );

    disc.classList.add(
      "is-scratching"
    );

    disc.style.setProperty(
      "--br-dj-scratch-angle",
      "0deg"
    );

    document.body.dataset
      .djVinylScratchDeck =
      deckId;

    setVinylStatus(
      deckId,
      "Scratching"
    );
  };

  const moveScratch = (
    event
  ) => {
    const current =
      pointerState.get(
        event.pointerId
      );

    if (!current) return;

    event.preventDefault();

    const now =
      performance.now();

    const angle =
      getPointerAngle(
        event,
        current.disc
      );

    const deltaAngle =
      normaliseAngleDelta(
        angle -
          current.lastAngle
      );

    const elapsedSeconds =
      Math.max(
        0.008,
        (
          now -
          current.lastTime
        ) / 1000
      );

    const trackDelta =
      (
        deltaAngle / 360
      ) *
      REVOLUTION_SECONDS;

    const velocity =
      trackDelta /
      elapsedSeconds;

    current.position +=
      trackDelta;

    current.visualAngle +=
      deltaAngle;

    current.lastAngle =
      angle;

    current.lastTime =
      now;

    current.disc.style
      .setProperty(
        "--br-dj-scratch-angle",
        `${current.visualAngle.toFixed(
          2
        )}deg`
      );

    getDeck(
      current.deckId
    )?.scratchVinylTo?.(
      current.position,
      velocity
    );
  };

  const endScratch =
    async (event) => {
      const current =
        pointerState.get(
          event.pointerId
        );

      if (!current) return;

      pointerState.delete(
        event.pointerId
      );

      current.disc
        .classList.remove(
          "is-scratching"
        );

      current.disc.style
        .removeProperty(
          "--br-dj-scratch-angle"
        );

      delete document.body
        .dataset
        .djVinylScratchDeck;

      try {
        current.disc
          .releasePointerCapture?.(
            event.pointerId
          );
      } catch {}

      await getDeck(
        current.deckId
      )?.endVinylScratch?.();

      setVinylStatus(
        current.deckId,
        "Touch the record to scratch"
      );
    };

  const bindPlatter = (
    disc
  ) => {
    disc.addEventListener(
      "pointerdown",
      (event) =>
        beginScratch(
          event,
          disc
        )
    );

    disc.addEventListener(
      "pointermove",
      moveScratch
    );

    disc.addEventListener(
      "pointerup",
      endScratch
    );

    disc.addEventListener(
      "pointercancel",
      endScratch
    );

    disc.addEventListener(
      "lostpointercapture",
      endScratch
    );
  };

  const bindNudgeButton = (
    button
  ) => {
    const deckId =
      normaliseDeckId(
        button.dataset
          .djVinylDeckId
      );

    const direction =
      button.dataset
        .djVinylAction ===
      "nudge-down"
        ? -1
        : 1;

    const stop = (
      event
    ) => {
      if (
        event?.pointerId !=
          null &&
        button.hasPointerCapture?.(
          event.pointerId
        )
      ) {
        try {
          button.releasePointerCapture(
            event.pointerId
          );
        } catch {}
      }

      button.classList.remove(
        "is-active"
      );

      getDeck(
        deckId
      )?.endVinylNudge?.();

      setVinylStatus(
        deckId,
        "Touch the record to scratch"
      );
    };

    button.addEventListener(
      "pointerdown",
      (event) => {
        const deck =
          getDeck(deckId);

        const state =
          deck?.getState?.();

        /*
          Nudge is a momentary pitch bend, so it only acts while the deck
          is genuinely playing.
        */
        if (
          !state?.isLoaded ||
          !state.isPlaying
        ) {
          return;
        }

        event.preventDefault();

        try {
          button
            .setPointerCapture?.(
              event.pointerId
            );
        } catch {}

        button.classList.add(
          "is-active"
        );

        deck.startVinylNudge?.(
          direction,
          0.045
        );

        setVinylStatus(
          deckId,
          direction < 0
            ? "Nudge −"
            : "Nudge +"
        );
      }
    );

    button.addEventListener(
      "pointerup",
      stop
    );

    button.addEventListener(
      "pointercancel",
      stop
    );

    button.addEventListener(
      "lostpointercapture",
      stop
    );

    button.addEventListener(
      "click",
      (event) =>
        event.preventDefault()
    );
  };

  const bindScratchToggle = (
    button
  ) => {
    const deckId =
      normaliseDeckId(
        button.dataset
          .djVinylDeckId
      );

    button.addEventListener(
      "click",
      () => {
        scratchEnabled[
          deckId
        ] =
          !scratchEnabled[
            deckId
          ];

        syncScratchButton(
          deckId
        );

        setVinylStatus(
          deckId,
          scratchEnabled[
            deckId
          ]
            ? "Scratch touch enabled"
            : "Scratch touch disabled"
        );
      }
    );

    syncScratchButton(
      deckId
    );
  };

  const bindBrakeButton = (
    button
  ) => {
    const deckId =
      normaliseDeckId(
        button.dataset
          .djVinylDeckId
      );

    button.addEventListener(
      "click",
      async () => {
        const deck =
          getDeck(deckId);

        const state =
          deck?.getState?.();

        if (
          !deck ||
          !state?.isLoaded
        ) {
          return;
        }

        button.classList.add(
          "is-active"
        );

        setVinylStatus(
          deckId,
          state.isPlaying
            ? "Vinyl brake"
            : "Deck is stopped"
        );

        try {
          await deck.brakeVinyl?.(
            1.15
          );
        } finally {
          window.setTimeout(
            () => {
              button.classList.remove(
                "is-active"
              );

              setVinylStatus(
                deckId,
                "Touch the record to scratch"
              );
            },
            180
          );
        }
      }
    );
  };

  const syncDeckVinylState = (
    deckId,
    state = {}
  ) => {
    const panel =
      $(
        `.brDjVinylDeckView[data-dj-vinyl-engine-deck="${deckId}"]`
      );

    if (!panel) return;

    const vinyl =
      state.vinyl || {};

    panel.classList.toggle(
      "is-scratching",
      Boolean(
        vinyl.scratching
      )
    );

    panel.classList.toggle(
      "is-braking",
      Boolean(
        vinyl.braking
      )
    );

    panel.classList.toggle(
      "is-nudging",
      Boolean(
        vinyl.nudging
      )
    );

    panel
      .querySelectorAll(
        "[data-dj-vinyl-action]"
      )
      .forEach(
        (button) => {
          button.disabled =
            !state.isLoaded ||
            state.isLoading;
        }
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
        .brDjVinylPerformanceBound ===
      "true"
    ) {
      return;
    }

    document.body.dataset
      .brDjVinylPerformanceBound =
      "true";

    $$(
      "[data-dj-vinyl-platter]"
    ).forEach(
      bindPlatter
    );

    $$(
      '[data-dj-vinyl-action="nudge-down"], [data-dj-vinyl-action="nudge-up"]'
    ).forEach(
      bindNudgeButton
    );

    $$(
      '[data-dj-vinyl-action="scratch"]'
    ).forEach(
      bindScratchToggle
    );

    $$(
      '[data-dj-vinyl-action="brake"]'
    ).forEach(
      bindBrakeButton
    );

    window.addEventListener(
      "brmedia:dj-audio-state",
      (event) => {
        const deckId =
          normaliseDeckId(
            event.detail
              ?.deckId
          );

        syncDeckVinylState(
          deckId,
          event.detail?.state ||
            {}
        );
      }
    );

    ["d1", "d2"].forEach(
      (deckId) => {
        syncScratchButton(
          deckId
        );

        syncDeckVinylState(
          deckId,
          getDeck(
            deckId
          )?.getState?.() ||
            {}
        );

        setVinylStatus(
          deckId
        );
      }
    );
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