(() => {
  "use strict";

  const getController = () =>
    window.BRMediaDjDeckController;

  const getGridApi = () =>
    window.BRMediaDjGrid;

  const getSheet = () =>
    document.querySelector(
      "[data-dj-grid-options-sheet]"
    );

  const gridOptions = (
    state = {}
  ) => {
    const limits =
      getController()?.gridLimits || {};

    return {
      duration:
        Math.max(
          0,
          Number(state.duration) || 0
        ),

      minBpm:
        Number(limits.minBpm) || 40,

      maxBpm:
        Number(limits.maxBpm) || 260,

      preRollSeconds:
        Number(
          limits.preRollSeconds
        ) || 8,
    };
  };

  const formatTime = (
    seconds = 0
  ) => {
    const safe =
      Number(seconds) || 0;

    const sign =
      safe < 0 ? "-" : "";

    const absolute =
      Math.abs(safe);

    const minutes =
      Math.floor(
        absolute / 60
      );

    const remainder =
      absolute -
      minutes * 60;

    return `${sign}${minutes}:${remainder
      .toFixed(1)
      .padStart(4, "0")}`;
  };

  const getConfigFromNode = (
    node
  ) => {
    const panel =
      node?.closest?.(
        ".brDjPerfPanel[data-dj-perf-panel]"
      );

    const name =
      panel?.dataset
        .djPerfPanel || "";

    const deckId =
      name === "deck-2"
        ? "d2"
        : name === "deck-1"
          ? "d1"
          : "";

    return deckId
      ? getController()
          ?.getConfigById?.(
            deckId
          ) || null
      : null;
  };

  const getActiveConfig = () =>
    getController()
      ?.getConfigById?.(
        getSheet()?.dataset
          .djGridOptionsDeck || ""
      ) || null;

  const setActiveButtons = (
    selector,
    value,
    dataKey
  ) => {
    getSheet()
      ?.querySelectorAll(selector)
      .forEach((button) => {
        const active =
          String(
            button.dataset[dataKey]
          ) === String(value);

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
  };

  const syncSheet = (
    config,
    suppliedState = null
  ) => {
    const sheet =
      getSheet();

    const controller =
      getController();

    const gridApi =
      getGridApi();

    if (
      !sheet ||
      !controller ||
      !gridApi ||
      !config ||
      sheet.dataset
        .djGridOptionsDeck !==
        config.deckId
    ) {
      return;
    }

    const state =
      suppliedState ||
      controller
        .getStateForConfig(
          config
        );

    const grid =
      controller
        .normaliseDeckBeatGrid(
          config,
          state
        );

    const currentTime =
      Number(
        state.currentTime
      ) || 0;

    const segmentIndex =
      gridApi.getSegmentIndexAtTime(
        grid,
        currentTime,
        gridOptions(state)
      );

    const segment =
      segmentIndex >= 0
        ? grid.segments[
            segmentIndex
          ]
        : null;

    const title =
      sheet.querySelector(
        "[data-dj-grid-options-title]"
      );

    if (title) {
      title.textContent =
        `${
          config.deckId === "d2"
            ? "Deck 2"
            : "Deck 1"
        } Grid Options`;
    }

    const summary =
      sheet.querySelector(
        "[data-dj-grid-options-summary]"
      );

    if (summary) {
      summary.textContent =
        `${
          grid.resolvedMode ===
          "dynamic"
            ? `Dynamic • ${grid.segments.length} segments`
            : "Normal • 1 grid"
        } • ${
          grid.editRange ===
          "from-here"
            ? "From here"
            : "Whole track"
        } • ${grid.adjustmentMs} ms`;
    }

    const segmentSummary =
      sheet.querySelector(
        "[data-dj-grid-segment-summary]"
      );

    if (segmentSummary) {
      segmentSummary.textContent =
        segment
          ? `Segment ${segmentIndex + 1} of ${grid.segments.length} • ${segment.bpm.toFixed(3)} BPM • starts ${formatTime(segment.startTime)}`
          : "No active grid segment";
    }

    setActiveButtons(
      "[data-dj-grid-analysis-mode]",
      grid.analysisMode,
      "djGridAnalysisMode"
    );

    setActiveButtons(
      "[data-dj-grid-edit-range]",
      grid.editRange,
      "djGridEditRange"
    );

    setActiveButtons(
      "[data-dj-grid-adjustment-ms]",
      grid.adjustmentMs,
      "djGridAdjustmentMs"
    );

    setActiveButtons(
      "[data-dj-grid-palette]",
      config.waveformPalette,
      "djGridPalette"
    );

    sheet
      .querySelectorAll(
        "[data-dj-grid-edit-control]"
      )
      .forEach((control) => {
        control.disabled =
          Boolean(grid.locked);
      });

    const deleteButton =
      sheet.querySelector(
        "[data-dj-grid-delete-segment]"
      );

    if (deleteButton) {
      deleteButton.disabled =
        Boolean(
          grid.locked ||
          grid.segments.length <= 1 ||
          segmentIndex <= 0
        );
    }

    sheet.classList.toggle(
      "is-grid-locked",
      Boolean(grid.locked)
    );
  };

  const openSheet = (
    config
  ) => {
    const sheet =
      getSheet();

    if (!sheet || !config) {
      return;
    }

    sheet.dataset
      .djGridOptionsDeck =
      config.deckId;

    sheet.classList.add(
      "is-open"
    );

    sheet.setAttribute(
      "aria-hidden",
      "false"
    );

    document.body.classList.add(
      "brDjGridOptionsOpen"
    );

    syncSheet(config);
  };

  const closeSheet = () => {
    const sheet =
      getSheet();

    if (!sheet) return;

    sheet.classList.remove(
      "is-open"
    );

    sheet.setAttribute(
      "aria-hidden",
      "true"
    );

    document.body.classList.remove(
      "brDjGridOptionsOpen"
    );
  };

  const applySheetAction = (
    event
  ) => {
    if (
      event.target.closest(
        "[data-dj-grid-options-close]"
      )
    ) {
      closeSheet();
      return;
    }

    const controller =
      getController();

    const gridApi =
      getGridApi();

    const config =
      getActiveConfig();

    if (
      !controller ||
      !gridApi ||
      !config
    ) {
      return;
    }

    const state =
      controller
        .getStateForConfig(
          config
        );

    const grid =
      controller
        .normaliseDeckBeatGrid(
          config,
          state
        );

    const simpleActions = [
      {
        selector:
          "[data-dj-grid-analysis-mode]",

        field:
          "analysisMode",

        dataKey:
          "djGridAnalysisMode",

        source:
          "analysis-mode",
      },
      {
        selector:
          "[data-dj-grid-edit-range]",

        field:
          "editRange",

        dataKey:
          "djGridEditRange",

        source:
          "edit-range",
      },
      {
        selector:
          "[data-dj-grid-adjustment-ms]",

        field:
          "adjustmentMs",

        dataKey:
          "djGridAdjustmentMs",

        source:
          "adjustment-step",
      },
    ];

    for (
      const action
      of simpleActions
    ) {
      const button =
        event.target.closest(
          action.selector
        );

      if (!button) continue;

      if (grid.locked) return;

      let value =
        button.dataset[
          action.dataKey
        ];

      if (
        action.field ===
        "adjustmentMs"
      ) {
        value =
          Number(value) === 3
            ? 3
            : 1;
      }

      controller
        .applyDeckBeatGridUpdate(
          config,
          {
            [action.field]:
              value,

            source:
              action.source,
          },
          state
        );

      syncSheet(config);
      return;
    }

    const paletteButton =
      event.target.closest(
        "[data-dj-grid-palette]"
      );

    if (paletteButton) {
      config.waveformPalette =
        paletteButton.dataset
          .djGridPalette ||
        "blue";

      controller
        .syncDeckPaletteButtons(
          config
        );

      controller
        .renderDjRealWaveforms(
          config,
          state
        );

      syncSheet(config);
      return;
    }

    const addSegment =
      event.target.closest(
        "[data-dj-grid-add-segment]"
      );

    if (
      addSegment &&
      !grid.locked
    ) {
      controller
        .applyDeckGridTransform(
          config,

          (currentGrid) =>
            gridApi.insertSegment(
              currentGrid,

              Number(
                state.currentTime
              ) || 0,

              gridApi.bpmAtTime(
                currentGrid,

                Number(
                  state.currentTime
                ) || 0,

                gridOptions(state)
              ) ||
                currentGrid.bpm,

              {
                ...gridOptions(
                  state
                ),

                source:
                  "manual-segment",
              }
            ),

          state,

          "manual-segment"
        );

      syncSheet(config);
      return;
    }

    const deleteSegment =
      event.target.closest(
        "[data-dj-grid-delete-segment]"
      );

    if (
      deleteSegment &&
      !grid.locked
    ) {
      controller
        .applyDeckGridTransform(
          config,

          (currentGrid) =>
            gridApi
              .removeSegmentAtTime(
                currentGrid,

                Number(
                  state.currentTime
                ) || 0,

                gridOptions(state)
              ),

          state,

          "delete-segment"
        );

      syncSheet(config);
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
        .brDjGridEditorBound ===
        "true"
    ) {
      return;
    }

    sheet.dataset
      .brDjGridEditorBound =
      "true";

    document.addEventListener(
      "click",
      (event) => {
        const status =
          event.target.closest(
            ".brDjGridStatus"
          );

        if (!status) return;

        const config =
          getConfigFromNode(
            status
          );

        if (config) {
          openSheet(config);
        }
      }
    );

    sheet.addEventListener(
      "click",
      applySheetAction
    );

    sheet.addEventListener(
      "pointerdown",
      (event) => {
        if (
          event.target === sheet ||
          event.target.classList
            .contains(
              "brDjGridOptionsScrim"
            )
        ) {
          closeSheet();
        }
      }
    );

    window.addEventListener(
      "brmedia:dj-grid-state",
      (event) => {
        const config =
          getController()
            ?.getConfigById?.(
              event.detail?.deckId
            );

        if (config) {
          syncSheet(
            config,
            event.detail?.state
          );
        }
      }
    );
  };

  window.addEventListener(
    "brmedia:dj-controller-ready",
    bind
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