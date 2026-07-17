(() => {
  "use strict";

  const GRID_VERSION = 2;

  const DEFAULT_MIN_BPM = 40;

  const DEFAULT_MAX_BPM = 260;

  const DEFAULT_PRE_ROLL_SECONDS = 8;

  const clone = (value) => {
    if (
      typeof structuredClone ===
      "function"
    ) {
      try {
        return structuredClone(
          value
        );
      } catch {}
    }

    return JSON.parse(
      JSON.stringify(value)
    );
  };

  const finiteNumber = (
    value,
    fallback = null
  ) => {
    const number =
      Number(value);

    return Number.isFinite(number)
      ? number
      : fallback;
  };

  const clamp = (
    value,
    minimum,
    maximum
  ) =>
    Math.max(
      minimum,
      Math.min(
        maximum,
        value
      )
    );

  const normaliseAnalysisMode = (
    value
  ) => {
    const mode =
      String(
        value || "auto"
      )
        .trim()
        .toLowerCase();

    return [
      "auto",
      "normal",
      "dynamic",
    ].includes(mode)
      ? mode
      : "auto";
  };

  const normaliseResolvedMode = (
    value,
    segmentCount = 0
  ) => {
    const mode =
      String(value || "")
        .trim()
        .toLowerCase();

    if (
      mode === "dynamic" ||
      segmentCount > 1
    ) {
      return "dynamic";
    }

    return "normal";
  };

  const normaliseEditRange = (
    value
  ) =>
    String(
      value || "whole"
    )
      .trim()
      .toLowerCase() ===
    "from-here"
      ? "from-here"
      : "whole";

  const normaliseAdjustmentMs = (
    value
  ) =>
    Number(value) === 3
      ? 3
      : 1;

  const clampBpm = (
    value,
    options = {}
  ) => {
    const minimum =
      finiteNumber(
        options.minBpm,
        DEFAULT_MIN_BPM
      );

    const maximum =
      finiteNumber(
        options.maxBpm,
        DEFAULT_MAX_BPM
      );

    const bpm =
      finiteNumber(value);

    return (
      bpm != null &&
      bpm >= minimum &&
      bpm <= maximum
    )
      ? bpm
      : null;
  };

  const normaliseSegment = (
    segment = {},
    index = 0,
    options = {}
  ) => {
    const bpm =
      clampBpm(
        segment.bpm,
        options
      );

    if (!bpm) return null;

    const startTime =
      finiteNumber(
        segment.startTime
      );

    const startBeat =
      finiteNumber(
        segment.startBeat
      );

    if (startTime == null) {
      return null;
    }

    return {
      id:
        String(
          segment.id ||
          `segment-${index + 1}`
        )
          .trim()
          .slice(0, 64) ||
        `segment-${index + 1}`,

      startTime,

      startBeat,

      bpm,

      source:
        String(
          segment.source ||
          ""
        )
          .trim()
          .slice(0, 80),
    };
  };

  const normaliseSegments = (
    input = {},
    options = {}
  ) => {
    const duration =
      Math.max(
        0,

        finiteNumber(
          options.duration,
          0
        )
      );

    const preRoll =
      Math.max(
        0,

        finiteNumber(
          options.preRollSeconds,
          DEFAULT_PRE_ROLL_SECONDS
        )
      );

    const bpm =
      clampBpm(
        input.bpm,
        options
      );

    const downbeat =
      clamp(
        finiteNumber(
          input.downbeat,
          0
        ),

        -preRoll,

        duration ||
          Number.POSITIVE_INFINITY
      );

    let segments =
      Array.isArray(
        input.segments
      )
        ? input.segments
            .map(
              (
                segment,
                index
              ) =>
                normaliseSegment(
                  segment,
                  index,
                  options
                )
            )
            .filter(Boolean)
        : [];

    segments.sort(
      (left, right) => {
        if (
          left.startTime !==
          right.startTime
        ) {
          return (
            left.startTime -
            right.startTime
          );
        }

        return (
          (
            left.startBeat ??
            0
          ) -
          (
            right.startBeat ??
            0
          )
        );
      }
    );

    if (
      !segments.length &&
      bpm
    ) {
      segments = [
        {
          id: "segment-1",

          startTime:
            downbeat,

          startBeat: 0,

          bpm,

          source:
            String(
              input.source ||
              ""
            )
              .trim()
              .slice(0, 80),
        },
      ];
    }

    if (!segments.length) {
      return [];
    }

    const first =
      segments[0];

    if (
      Math.abs(
        first.startTime -
        downbeat
      ) > 0.000001 ||
      Math.abs(
        finiteNumber(
          first.startBeat,
          0
        )
      ) > 0.000001
    ) {
      segments.unshift({
        id: "segment-1",

        startTime:
          downbeat,

        startBeat: 0,

        bpm:
          bpm ||
          first.bpm,

        source:
          String(
            input.source ||
            first.source ||
            ""
          )
            .trim()
            .slice(0, 80),
      });
    } else {
      first.startTime =
        downbeat;

      first.startBeat = 0;

      first.id =
        first.id ||
        "segment-1";
    }

    const resolved = [];

    segments.forEach(
      (
        segment,
        index
      ) => {
        const previous =
          resolved[
            resolved.length - 1
          ] || null;

        let startTime =
          segment.startTime;

        if (
          previous &&
          startTime <=
            previous.startTime +
              0.000001
        ) {
          if (index === 0) {
            return;
          }

          startTime =
            previous.startTime +
            0.000001;
        }

        const startBeat =
          previous
            ? finiteNumber(
                segment.startBeat,

                previous.startBeat +
                  (
                    (
                      startTime -
                      previous.startTime
                    ) *
                    previous.bpm
                  ) /
                    60
              )
            : 0;

        resolved.push({
          id:
            segment.id ||
            `segment-${
              resolved.length + 1
            }`,

          startTime,

          startBeat,

          bpm:
            segment.bpm,

          source:
            segment.source ||
            "",
        });
      }
    );

    return resolved;
  };

  const normalise = (
    input = {},
    options = {}
  ) => {
    const duration =
      Math.max(
        0,

        finiteNumber(
          options.duration,
          0
        )
      );

    const preRoll =
      Math.max(
        0,

        finiteNumber(
          options.preRollSeconds,
          DEFAULT_PRE_ROLL_SECONDS
        )
      );

    const bpm =
      clampBpm(
        input.bpm,
        options
      );

    const rawBpm =
      clampBpm(
        input.rawBpm,
        options
      ) || bpm;

    const downbeat =
      clamp(
        finiteNumber(
          input.downbeat,
          0
        ),

        -preRoll,

        duration ||
          Number.POSITIVE_INFINITY
      );

    const segments =
      normaliseSegments(
        {
          ...input,
          bpm,
          downbeat,
        },

        options
      );

    const resolvedMode =
      normaliseResolvedMode(
        input.resolvedMode,
        segments.length
      );

    return {
      ...input,

      version:
        GRID_VERSION,

      analysisMode:
        normaliseAnalysisMode(
          input.analysisMode
        ),

      resolvedMode,

      bpm:
        segments[0]?.bpm ||
        bpm,

      rawBpm,

      downbeat:
        segments[0]
          ?.startTime ??
        downbeat,

      segments,

      editRange:
        normaliseEditRange(
          input.editRange
        ),

      adjustmentMs:
        normaliseAdjustmentMs(
          input.adjustmentMs
        ),

      reviewRequired:
        Boolean(
          input.reviewRequired
        ),

      locked:
        Boolean(input.locked),

      baseSet:
        Boolean(
          input.baseSet &&
          (
            segments.length ||
            bpm
          )
        ),

      userBpm:
        Boolean(
          input.userBpm
        ),

      userDownbeat:
        Boolean(
          input.userDownbeat
        ),

      source:
        String(
          input.source ||
          ""
        )
          .trim()
          .slice(0, 80),

      candidates:
        Array.isArray(
          input.candidates
        )
          ? input.candidates
              .map(
                (candidate) => ({
                  ...candidate,
                })
              )
              .slice(0, 20)
          : [],

      history:
        Array.isArray(
          input.history
        )
          ? input.history
          : [],

      future:
        Array.isArray(
          input.future
        )
          ? input.future
          : [],

      tapIntervals:
        Array.isArray(
          input.tapIntervals
        )
          ? input.tapIntervals
              .slice(-12)
          : [],

      lastTapAt:
        finiteNumber(
          input.lastTapAt,
          0
        ),
    };
  };

  const getSegments = (
    grid = {},
    options = {}
  ) =>
    normalise(
      grid,
      options
    ).segments;

  const getSegmentAtTime = (
    grid = {},
    seconds = 0,
    options = {}
  ) => {
    const segments =
      getSegments(
        grid,
        options
      );

    if (!segments.length) {
      return null;
    }

    const time =
      finiteNumber(
        seconds,
        0
      );

    let selected =
      segments[0];

    for (
      const segment of segments
    ) {
      if (
        segment.startTime <=
        time + 0.0000001
      ) {
        selected = segment;
      } else {
        break;
      }
    }

    return selected;
  };

  const getSegmentAtBeat = (
    grid = {},
    beat = 0,
    options = {}
  ) => {
    const segments =
      getSegments(
        grid,
        options
      );

    if (!segments.length) {
      return null;
    }

    const beatNumber =
      finiteNumber(
        beat,
        0
      );

    let selected =
      segments[0];

    for (
      const segment of segments
    ) {
      if (
        segment.startBeat <=
        beatNumber + 0.0000001
      ) {
        selected = segment;
      } else {
        break;
      }
    }

    return selected;
  };

  const timeToBeat = (
    grid = {},
    seconds = 0,
    options = {}
  ) => {
    const segment =
      getSegmentAtTime(
        grid,
        seconds,
        options
      );

    if (!segment) {
      return null;
    }

    return (
      segment.startBeat +
      (
        (
          finiteNumber(
            seconds,
            0
          ) -
          segment.startTime
        ) *
        segment.bpm
      ) /
        60
    );
  };

  const beatToTime = (
    grid = {},
    beat = 0,
    options = {}
  ) => {
    const segment =
      getSegmentAtBeat(
        grid,
        beat,
        options
      );

    if (!segment) {
      return null;
    }

    return (
      segment.startTime +
      (
        (
          finiteNumber(
            beat,
            0
          ) -
          segment.startBeat
        ) *
        60
      ) /
        segment.bpm
    );
  };

  const bpmAtTime = (
    grid = {},
    seconds = 0,
    options = {}
  ) =>
    getSegmentAtTime(
      grid,
      seconds,
      options
    )?.bpm || null;

  const beatSecondsAtTime = (
    grid = {},
    seconds = 0,
    options = {}
  ) => {
    const bpm =
      bpmAtTime(
        grid,
        seconds,
        options
      );

    return bpm
      ? 60 / bpm
      : null;
  };

  const snapTime = (
    grid = {},
    seconds = 0,
    mode = "nearest",
    options = {}
  ) => {
    const duration =
      Math.max(
        0,

        finiteNumber(
          options.duration,
          0
        )
      );

    const preRoll =
      Math.max(
        0,

        finiteNumber(
          options.preRollSeconds,
          DEFAULT_PRE_ROLL_SECONDS
        )
      );

    const minimum =
      options.allowNegative
        ? -preRoll
        : 0;

    const maximum =
      duration ||
      Number.POSITIVE_INFINITY;

    const time =
      clamp(
        finiteNumber(
          seconds,
          0
        ),

        minimum,
        maximum
      );

    const beatFloat =
      timeToBeat(
        grid,
        time,
        options
      );

    if (beatFloat == null) {
      return time;
    }

    const beat =
      mode === "floor"
        ? Math.floor(
            beatFloat
          )
        : mode === "ceil"
          ? Math.ceil(
              beatFloat
            )
          : Math.round(
              beatFloat
            );

    const snapped =
      beatToTime(
        grid,
        beat,
        options
      );

    return snapped == null
      ? time
      : clamp(
          snapped,
          minimum,
          maximum
        );
  };

  const getBeatWindow = (
    grid = {},
    startTime = 0,
    endTime = 0,
    options = {}
  ) => {
    const firstFloat =
      timeToBeat(
        grid,
        startTime,
        options
      );

    const lastFloat =
      timeToBeat(
        grid,
        endTime,
        options
      );

    if (
      firstFloat == null ||
      lastFloat == null
    ) {
      return [];
    }

    const firstBeat =
      Math.floor(
        Math.min(
          firstFloat,
          lastFloat
        )
      ) - 2;

    const lastBeat =
      Math.ceil(
        Math.max(
          firstFloat,
          lastFloat
        )
      ) + 2;

    const maxBeats =
      Math.max(
        16,

        Math.floor(
          finiteNumber(
            options.maxBeats,
            4096
          )
        )
      );

    const output = [];

    for (
      let beat = firstBeat;

      beat <= lastBeat &&
      output.length < maxBeats;

      beat += 1
    ) {
      const time =
        beatToTime(
          grid,
          beat,
          options
        );

      if (time == null) {
        continue;
      }

      output.push({
        beat,

        time,

        bpm:
          bpmAtTime(
            grid,
            time,
            options
          ),

        isBar:
          (
            (
              beat % 4
            ) +
            4
          ) %
            4 ===
          0,

        isBase:
          beat === 0,
      });
    }

    return output;
  };

  const snapshot = (
    grid = {}
  ) => {
    const normalised =
      normalise(grid);

    return clone({
      version:
        normalised.version,

      analysisMode:
        normalised
          .analysisMode,

      resolvedMode:
        normalised
          .resolvedMode,

      bpm:
        normalised.bpm,

      rawBpm:
        normalised.rawBpm,

      downbeat:
        normalised.downbeat,

      segments:
        normalised.segments,

      editRange:
        normalised.editRange,

      adjustmentMs:
        normalised.adjustmentMs,

      reviewRequired:
        normalised
          .reviewRequired,

      locked:
        normalised.locked,

      baseSet:
        normalised.baseSet,

      userBpm:
        normalised.userBpm,

      userDownbeat:
        normalised
          .userDownbeat,

      source:
        normalised.source,

      candidates:
        normalised.candidates,
    });
  };

  const restore = (
    target = {},
    saved = {}
  ) => {
    const history =
      Array.isArray(
        target.history
      )
        ? target.history
        : [];

    const future =
      Array.isArray(
        target.future
      )
        ? target.future
        : [];

    const tapIntervals =
      Array.isArray(
        target.tapIntervals
      )
        ? target.tapIntervals
        : [];

    const lastTapAt =
      finiteNumber(
        target.lastTapAt,
        0
      );

    Object.keys(
      target
    ).forEach((key) => {
      if (
        ![
          "history",
          "future",
          "tapIntervals",
          "lastTapAt",
        ].includes(key)
      ) {
        delete target[key];
      }
    });

    Object.assign(
      target,
      normalise(saved)
    );

    target.history =
      history;

    target.future =
      future;

    target.tapIntervals =
      tapIntervals;

    target.lastTapAt =
      lastTapAt;

    return target;
  };

  const serialise = (
    grid = {},
    options = {}
  ) => {
    const normalised =
      normalise(
        grid,
        options
      );

    return {
      version:
        GRID_VERSION,

      analysisMode:
        normalised.analysisMode,

      resolvedMode:
        normalised.resolvedMode,

      bpm:
        normalised.bpm,

      rawBpm:
        normalised.rawBpm ||
        normalised.bpm,

      downbeat:
        normalised.downbeat,

      segments:
        normalised.segments.map(
          (segment) => ({
            id:
              segment.id,

            startTime:
              Number(
                segment.startTime
                  .toFixed(6)
              ),

            startBeat:
              Number(
                segment.startBeat
                  .toFixed(6)
              ),

            bpm:
              Number(
                segment.bpm
                  .toFixed(6)
              ),

            source:
              segment.source ||
              "",
          })
        ),

      editRange:
        normalised.editRange,

      adjustmentMs:
        normalised.adjustmentMs,

      reviewRequired:
        normalised
          .reviewRequired,

      baseSet:
        normalised.baseSet,

      locked:
        normalised.locked,

      source:
        normalised.source ||
        "manual",
    };
  };

  const rebuildContinuity = (
    grid = {},
    options = {}
  ) => {
    const normalised =
      normalise(
        grid,
        options
      );

    const segments =
      normalised.segments.map(
        (segment) => ({
          ...segment,
        })
      );

    for (
      let index = 1;

      index <
      segments.length;

      index += 1
    ) {
      const previous =
        segments[index - 1];

      const current =
        segments[index];

      current.startBeat =
        previous.startBeat +
        (
          (
            current.startTime -
            previous.startTime
          ) *
          previous.bpm
        ) /
          60;
    }

    normalised.segments =
      segments;

    normalised.bpm =
      segments[0]?.bpm ||
      normalised.bpm;

    normalised.downbeat =
      segments[0]
        ?.startTime ??
      normalised.downbeat;

    normalised.resolvedMode =
      normaliseResolvedMode(
        normalised.resolvedMode,
        segments.length
      );

    return normalised;
  };

  const getSegmentIndexAtTime = (
    grid = {},
    seconds = 0,
    options = {}
  ) => {
    const segments =
      getSegments(
        grid,
        options
      );

    if (!segments.length) {
      return -1;
    }

    const time =
      finiteNumber(
        seconds,
        0
      );

    let selectedIndex = 0;

    for (
      let index = 0;
      index < segments.length;
      index += 1
    ) {
      if (
        segments[index].startTime <=
        time + 0.0000001
      ) {
        selectedIndex = index;
      } else {
        break;
      }
    }

    return selectedIndex;
  };

  const shift = (
    grid = {},
    deltaSeconds = 0,
    anchorTime = 0,
    options = {}
  ) => {
    let normalised =
      normalise(
        grid,
        options
      );

    const delta =
      finiteNumber(
        deltaSeconds,
        0
      );

    if (!delta) {
      return normalised;
    }

    const range =
      normaliseEditRange(
        options.range ||
        normalised.editRange
      );

    const anchor =
      finiteNumber(
        anchorTime,
        normalised.downbeat
      );

    if (range === "whole") {
      normalised.segments =
        normalised.segments.map(
          (segment) => ({
            ...segment,

            startTime:
              segment.startTime +
              delta,
          })
        );

      normalised.downbeat +=
        delta;

      return normalise(
        normalised,
        options
      );
    }

    /*
      From Here creates a real segment at the
      current beat. Earlier grid points remain
      unchanged.
    */
    normalised = insertSegment(
      normalised,
      anchor,

      bpmAtTime(
        normalised,
        anchor,
        options
      ),

      {
        ...options,

        source:
          options.source ||
          "from-here-shift",
      }
    );

    const activeIndex =
      getSegmentIndexAtTime(
        normalised,
        anchor,
        options
      );

    normalised.segments =
      normalised.segments.map(
        (segment, index) => ({
          ...segment,

          startTime:
            index >= activeIndex
              ? segment.startTime +
                delta
              : segment.startTime,
        })
      );

    normalised.resolvedMode =
      normalised.segments.length > 1
        ? "dynamic"
        : "normal";

    return normalise(
      normalised,
      options
    );
  };

  const insertSegment = (
    grid = {},
    atTime = 0,
    bpmValue = null,
    options = {}
  ) => {
    const normalised =
      normalise(
        grid,
        options
      );

    const time =
      finiteNumber(
        atTime,
        0
      );

    const currentBpm =
      clampBpm(
        bpmValue ||
          bpmAtTime(
            normalised,
            time,
            options
          ),

        options
      );

    if (!currentBpm) {
      return normalised;
    }

    const startBeat =
      timeToBeat(
        normalised,
        time,
        options
      );

    if (startBeat == null) {
      return normalised;
    }

    const roundedBeat =
      Math.round(
        startBeat
      );

    const snappedTime =
      beatToTime(
        normalised,
        roundedBeat,
        options
      ) ?? time;

    normalised.segments =
      normalised.segments.filter(
        (segment) =>
          Math.abs(
            segment.startTime -
            snappedTime
          ) > 0.0005
      );

    normalised.segments.push({
      id:
        `segment-${Date.now()
          .toString(36)}`,

      startTime:
        snappedTime,

      startBeat:
        roundedBeat,

      bpm:
        currentBpm,

      source:
        String(
          options.source ||
          "manual-segment"
        ).slice(0, 80),
    });

    normalised.segments.sort(
      (left, right) =>
        left.startTime -
        right.startTime
    );

    normalised.resolvedMode =
      "dynamic";

    return rebuildContinuity(
      normalised,
      options
    );
  };

  const setBpm = (
    grid = {},
    bpmValue = null,
    anchorTime = 0,
    options = {}
  ) => {
    const normalised =
      normalise(
        grid,
        options
      );

    const bpm =
      clampBpm(
        bpmValue,
        options
      );

    if (!bpm) {
      return normalised;
    }

    const range =
      normaliseEditRange(
        options.range ||
        normalised.editRange
      );

    if (range === "whole") {
      normalised.segments =
        normalised.segments.map(
          (segment) => ({
            ...segment,
            bpm,
          })
        );

      normalised.bpm = bpm;

      normalised.resolvedMode =
        normalised.segments.length > 1
          ? "dynamic"
          : "normal";

      return rebuildContinuity(
        normalised,
        options
      );
    }

    const segmented =
      insertSegment(
        normalised,
        anchorTime,
        bpm,
        {
          ...options,

          source:
            options.source ||
            "from-here-bpm",
        }
      );

    const activeIndex =
      getSegmentIndexAtTime(
        segmented,
        anchorTime,
        options
      );

    if (activeIndex >= 0) {
      segmented.segments[
        activeIndex
      ].bpm = bpm;
    }

    segmented.resolvedMode =
      segmented.segments.length > 1
        ? "dynamic"
        : "normal";

    return normalise(
      segmented,
      options
    );
  };
	
  const removeSegmentAtTime = (
    grid = {},
    seconds = 0,
    options = {}
  ) => {
    const normalised =
      normalise(
        grid,
        options
      );

    if (
      normalised.segments.length <= 1
    ) {
      return normalised;
    }

    const activeIndex =
      getSegmentIndexAtTime(
        normalised,
        seconds,
        options
      );

    /*
      The first segment owns 1.1 and cannot
      be deleted. Move the playhead into a
      later segment before deleting it.
    */
    if (activeIndex <= 0) {
      return normalised;
    }

    normalised.segments.splice(
      activeIndex,
      1
    );

    normalised.resolvedMode =
      normalised.segments.length > 1
        ? "dynamic"
        : "normal";

    return normalise(
      normalised,
      options
    );
  };

  const adjustInterval = (
    grid = {},
    deltaMilliseconds = 0,
    anchorTime = 0,
    options = {}
  ) => {
    const normalised =
      normalise(
        grid,
        options
      );

    const currentBpm =
      bpmAtTime(
        normalised,
        anchorTime,
        options
      ) ||
      normalised.bpm;

    if (!currentBpm) {
      return normalised;
    }

    const intervalMs =
      60000 /
      currentBpm;

    const nextIntervalMs =
      Math.max(
        1,

        intervalMs +
          finiteNumber(
            deltaMilliseconds,
            0
          )
      );

    const nextBpm =
      60000 /
      nextIntervalMs;

    return setBpm(
      normalised,
      nextBpm,
      anchorTime,
      options
    );
  };

  window.BRMediaDjGrid =
    Object.freeze({
      version:
        GRID_VERSION,

      create:
        (
          input = {},
          options = {}
        ) =>
          normalise(
            input,
            options
          ),

      normalise,

      snapshot,

      restore,

      serialise,

      timeToBeat,

      beatToTime,

      bpmAtTime,

      beatSecondsAtTime,

      snapTime,

      getBeatWindow,

      getSegmentAtTime,

      getSegmentAtBeat,

      getSegmentIndexAtTime,

      shift,

      setBpm,

      adjustInterval,

      insertSegment,

      removeSegmentAtTime,
    });
})();