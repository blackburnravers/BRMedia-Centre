(() => {
  "use strict";

  const RECORD_SETUP_KEY =
    "brmedia.djMixerRestart.recordSetup.v1";
  const MIX_SETUP_KEY =
    "brmedia.djMixerRestart.mixSetup.v1";

  const SET_PLAN_KEY =
    "brmedia.djMixerRestart.setPlan.v1";

  const CHUNK_INTERVAL_MS = 2000;
  const MAX_UPLOAD_ATTEMPTS = 3;

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    Array.from(root.querySelectorAll(selector));

  const state = {
    mode: "ready",
    recorder: null,
    engine: null,
    destination: null,
    session: null,
    mimeType: "",
    uploadChain: Promise.resolve(),
    uploadError: null,
    countdownTimer: 0,
    countdownRemaining: 0,
    startedAt: 0,
    pausedAt: 0,
    pausedTotalMs: 0,
    elapsedMs: 0,
    meterFrame: 0,
    meterLevel: 0,
    stopRequested: false,
    finaliseToken: 0,
    shareBusy: false,
  };

  function readJson(key, fallback = {}) {
    try {
      const parsed = JSON.parse(
        localStorage.getItem(key) || "null"
      );

      return parsed && typeof parsed === "object"
        ? parsed
        : fallback;
    } catch {
      return fallback;
    }
  }
	
  function readMixSetup() {
    const stored =
      readJson(
        MIX_SETUP_KEY,
        {}
      );

    return stored &&
      typeof stored ===
        "object"
      ? stored
      : {};
  }

  function readSetPlan() {
    const stored =
      readJson(
        SET_PLAN_KEY,
        {}
      );

    const tracks =
      Array.isArray(
        stored.tracks
      )
        ? stored.tracks
        : [];

    return {
      ...stored,

      mode:
        stored.mode ===
          "timestamps"
          ? "timestamps"
          : "normal",

      tracks:
        tracks.map(
          (
            track,
            index
          ) => {
            const expectedTimestampMs =
              Number(
                track.expectedTimestampMs ??
                track.timestampMs ??
                track.startMs ??
                0
              ) ||
              0;

            const actualTimestampMs =
              Number(
                track.actualTimestampMs ??
                track.playedAtMs ??
                0
              ) ||
              0;

            return {
              ...track,

              order:
                index + 1,

              libraryTrackId:
                track.libraryTrackId ||
                track.libraryItemId ||
                track.trackId ||
                track.id ||
                "",

              title:
                String(
                  track.title ||
                  "Untitled track"
                ),

              artist:
                String(
                  track.artist ||
                  "Unknown artist"
                ),

              bpm:
                Number(
                  track.bpm ||
                  track.gridBpm ||
                  0
                ) ||
                0,

              gridBpm:
                Number(
                  track.gridBpm ||
                  track.bpm ||
                  0
                ) ||
                0,

              key:
                String(
                  track.key ||
                  ""
                ),

              expectedTimestampMs,

              actualTimestampMs,
            };
          }
        ),
    };
  }

  function recordingHandoffPreferences(
    fields = {}
  ) {
    return {
      showSavedPage:
        fieldEnabled(
          fields,
          "showSavedPage",
          true
        ),

      openPlayer:
        fieldEnabled(
          fields,
          "openPlayer",
          true
        ),

      sendMastering:
        fieldEnabled(
          fields,
          "sendMastering",
          true
        ),

      sendConverter:
        fieldEnabled(
          fields,
          "sendConverter",
          true
        ),

      sendTagger:
        fieldEnabled(
          fields,
          "sendTagger",
          true
        ),

      openViewFiles:
        fieldEnabled(
          fields,
          "openViewFiles",
          false
        ),
    };
  }

  function recordingArchiveDestination(
    fields = {}
  ) {
    return String(
      fields.destination ||
      "BRMedia DJ Recordings"
    ).trim();
  }

  function readRecordSetup() {
    const stored = readJson(
      RECORD_SETUP_KEY,
      {}
    );

    const fields =
      stored.fields &&
      typeof stored.fields === "object"
        ? stored.fields
        : {};

    return {
      preset:
        stored.preset ||
        "club-mp3",

      recordingType:
        stored.recordingType ||
        "full-mix",

      format:
        stored.format ||
        "mp3",

      channels:
        stored.channels ||
        "stereo",

      source:
        stored.source ||
        "master-post",

      countdown:
        stored.countdown ||
        "5",

      fields,
    };
  }

  function fieldEnabled(
    fields,
    key,
    fallback = false
  ) {
    if (
      !Object.prototype.hasOwnProperty.call(
        fields,
        key
      )
    ) {
      return fallback;
    }

    const value =
      fields[key];

    if (
      typeof value ===
      "string"
    ) {
      return ![
        "",
        "0",
        "false",
        "off",
        "no",
      ].includes(
        value
          .trim()
          .toLowerCase()
      );
    }

    return Boolean(value);
  }

  function getCountdownSeconds(
    setup = readRecordSetup()
  ) {
    if (
      setup.countdown ===
      "0"
    ) {
      return 0;
    }

    if (
      setup.countdown ===
      "custom"
    ) {
      return Math.max(
        1,

        Math.min(
          120,

          Math.round(
            Number(
              setup.fields
                .customCountdown
            ) || 7
          )
        )
      );
    }

    return Math.max(
      0,

      Math.min(
        120,

        Math.round(
          Number(
            setup.countdown
          ) || 0
        )
      )
    );
  }

  function sanitiseTitle(
    value
  ) {
    return (
      String(
        value ||
        "BRMedia DJ Recording"
      )
        .replace(
          /\.[a-z0-9]{2,5}$/i,
          ""
        )
        .replace(
          /[<>:"/\\|?*\x00-\x1f]/g,
          " "
        )
        .replace(
          /\s+/g,
          " "
        )
        .trim()
        .slice(
          0,
          120
        ) ||
      "BRMedia DJ Recording"
    );
  }

  function getRecordingTitle(
    setup = readRecordSetup()
  ) {
    return sanitiseTitle(
      setup.fields
        .filenamePreview ||

      setup.fields
        .title ||

      "BRMedia DJ Recording"
    );
  }

  function formatTime(
    milliseconds = 0
  ) {
    const totalSeconds =
      Math.max(
        0,

        Math.floor(
          (
            Number(
              milliseconds
            ) ||
            0
          ) /
          1000
        )
      );

    const hours =
      Math.floor(
        totalSeconds /
        3600
      );

    const minutes =
      Math.floor(
        (
          totalSeconds %
          3600
        ) /
        60
      );

    const seconds =
      totalSeconds %
      60;

    if (
      hours >
      0
    ) {
      return [
        hours,
        minutes,
        seconds,
      ]
        .map(
          (
            value,
            index
          ) =>
            index ===
            0
              ? String(
                  value
                )

              : String(
                  value
                ).padStart(
                  2,
                  "0"
                )
        )
        .join(":");
    }

    return `${String(
      minutes
    ).padStart(
      2,
      "0"
    )}:${String(
      seconds
    ).padStart(
      2,
      "0"
    )}`;
  }

  function formatBytes(
    bytes = 0
  ) {
    const value =
      Math.max(
        0,

        Number(
          bytes
        ) ||
        0
      );

    if (
      value >=
      1024 ** 3
    ) {
      return `${(
        value /
        1024 ** 3
      ).toFixed(
        2
      )} GB`;
    }

    if (
      value >=
      1024 ** 2
    ) {
      return `${(
        value /
        1024 ** 2
      ).toFixed(
        1
      )} MB`;
    }

    if (
      value >=
      1024
    ) {
      return `${Math.round(
        value /
        1024
      )} KB`;
    }

    return `${value} B`;
  }

  function readableMimeType(
    mimeType =
      state.mimeType
  ) {
    const value =
      String(
        mimeType ||
        ""
      ).toLowerCase();

    if (
      value.includes(
        "mp4"
      )
    ) {
      return "Raw M4A/AAC";
    }

    if (
      value.includes(
        "ogg"
      )
    ) {
      return "Raw OGG/Opus";
    }

    if (
      value.includes(
        "webm"
      )
    ) {
      return "Raw WebM/Opus";
    }

    return "Browser-native audio";
  }
	
  function readableOutputFormat(
    setup = readRecordSetup(),
    session = state.session
  ) {
    const format =
      String(
        session?.outputFormat ||
        setup.format ||
        "raw"
      ).toLowerCase();

    const fields =
      setup.fields ||
      {};

    if (format === "wav") {
      return `WAV • ${fields.wavBitDepth || "24-bit"} • ${fields.sampleRate || "Source/default"}`;
    }

    if (format === "flac") {
      return `FLAC • ${fields.flacCompression || "5 balanced"} • ${fields.sampleRate || "Source/default"}`;
    }

    if (format === "mp3") {
      const mode =
        String(
          fields.mp3Mode ||
          "CBR"
        );

      const quality =
        mode.toLowerCase().includes(
          "vbr"
        )
          ? mode
          : `${fields.mp3Bitrate || "320"} kbps ${mode}`;

      return `MP3 • ${quality} • ${fields.sampleRate || "Source/default"}`;
    }

    return readableMimeType(
      session?.finalMimeType ||
      state.mimeType
    );
  }

  async function fetchJson(
    url,
    options = {}
  ) {
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
  }

  function chooseMimeType() {
    if (
      typeof MediaRecorder ===
      "undefined"
    ) {
      return "";
    }

    const candidates = [
      "audio/mp4;codecs=mp4a.40.2",
      "audio/mp4",
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/ogg",
    ];

    for (
      const candidate
      of candidates
    ) {
      try {
        if (
          typeof MediaRecorder
            .isTypeSupported !==
            "function" ||

          MediaRecorder
            .isTypeSupported(
              candidate
            )
        ) {
          return candidate;
        }
      } catch {}
    }

    return "";
  }

  function getAudioEngine() {
    return (
      window
        .BRMediaDjAudioEngine
        ?.getEngine?.() ||
      null
    );
  }

  async function ensureCaptureDestination() {
    const engine =
      getAudioEngine();

    if (!engine) {
      throw new Error(
        "The DJ audio engine is not available"
      );
    }

    await engine
      .unlock?.();

    if (
      engine
        .brRecordingDestination
    ) {
      state.engine =
        engine;

      state.destination =
        engine
          .brRecordingDestination;

      return engine
        .brRecordingDestination;
    }

    if (
      !engine.context ||

      typeof engine.context
        .createMediaStreamDestination !==
        "function"
    ) {
      throw new Error(
        "This browser cannot capture the Web Audio master output"
      );
    }

    const destination =
      engine.context
        .createMediaStreamDestination();

    const postMasterNode =
      engine.masterAnalyser ||
      engine.masterGain;

    if (
      !postMasterNode
        ?.connect
    ) {
      throw new Error(
        "The post-master audio node is unavailable"
      );
    }

    postMasterNode.connect(
      destination
    );

    engine
      .brRecordingDestination =
      destination;

    state.engine =
      engine;

    state.destination =
      destination;

    return destination;
  }

  function elapsedNow() {
    if (
      !state.startedAt
    ) {
      return state
        .elapsedMs;
    }

    const now =
      performance.now();

    const activePauseMs =
      state.pausedAt
        ? now -
          state.pausedAt
        : 0;

    return Math.max(
      0,

      now -
      state.startedAt -
      state.pausedTotalMs -
      activePauseMs
    );
  }

  function setMode(
    mode,
    message = ""
  ) {
    state.mode =
      mode;

    document.body
      .dataset
      .djRecordState =
      mode;

    const panel =
      $(
        "[data-dj-recording-panel]"
      );

    if (panel) {
      panel.dataset
        .recordingState =
        mode;

      if (message) {
        panel.dataset
          .recordingMessage =
          message;
      }
    }

    render(message);
  }

  function updateRecordBeacon() {
    const button =
      $(
        "[data-duo-tab='record']"
      );

    if (!button) {
      return;
    }

    const label =
      button.querySelector(
        "span"
      );

    const live =
      state.mode ===
      "live";

    const paused =
      state.mode ===
      "paused";

    const countdown =
      state.mode ===
      "countdown";

    const finalising =
      state.mode ===
      "finalising";

    const saved =
      state.mode ===
      "saved";

    button.classList
      .toggle(
        "is-recording",
        live
      );

    button.classList
      .toggle(
        "is-paused",
        paused
      );

    button.classList
      .toggle(
        "is-counting-down",
        countdown
      );

    button.classList
      .toggle(
        "is-saving",
        finalising
      );

    button.setAttribute(
      "aria-pressed",

      live ||
      paused ||
      countdown
        ? "true"
        : "false"
    );

    if (!label) {
      return;
    }

    label.textContent =
      countdown
        ? `REC ${state.countdownRemaining}`

        : live
          ? "REC Live"

          : paused
            ? "REC Paused"

            : finalising
              ? "REC Saving"

              : saved
                ? "REC Saved"

                : state.mode ===
                    "error"
                  ? "REC Error"

                  : "REC Ready";
  }

  function render(
    message = ""
  ) {
    const setup =
      readRecordSetup();

    const panel =
      $(
        "[data-dj-recording-panel]"
      );

    updateRecordBeacon();

    if (!panel) {
      return;
    }

    const status =
      $(
        "[data-dj-recording-status]",
        panel
      );

    const timer =
      $(
        "[data-dj-recording-timer]",
        panel
      );

    const format =
      $(
        "[data-dj-recording-format]",
        panel
      );

    const bytes =
      $(
        "[data-dj-recording-bytes]",
        panel
      );

    const start =
      $(
        "[data-dj-recording-start]",
        panel
      );

    const pause =
      $(
        "[data-dj-recording-pause]",
        panel
      );

    const stop =
      $(
        "[data-dj-recording-stop]",
        panel
      );

    const cancelCountdown =
      $(
        "[data-dj-recording-cancel-countdown]",
        panel
      );

    const download =
      $(
        "[data-dj-recording-download]",
        panel
      );

    const countdownOverlay =
      $(
        "[data-dj-recording-countdown]",
        panel
      );

    const countdownValue =
      $(
        "[data-dj-recording-countdown-value]",
        panel
      );

    const active =
      [
        "live",
        "paused",
      ].includes(
        state.mode
      );

    const busy =
      [
        "countdown",
        "finalising",
      ].includes(
        state.mode
      );

    const progress =
      Math.max(
        0,
        Math.min(
          100,
          Math.round(
            (
              Number(
                state.session
                  ?.progress
              ) ||
              0
            ) *
            100
          )
        )
      );

    if (timer) {
      timer.textContent =
        formatTime(
          active
            ? elapsedNow()
            : state
                .elapsedMs
        );
    }

    if (format) {
      format.textContent =
        readableOutputFormat(
          setup,
          state.session
        );
    }

    if (bytes) {
      bytes.textContent =
        formatBytes(
          state.session
            ?.bytes ||
          state.session
            ?.uploadedBytes ||
          0
        );
    }

    if (status) {
      status.textContent =
        message ||

        (
          state.mode ===
          "countdown"
            ? `Recording begins in ${state.countdownRemaining}…`

            : state.mode ===
                "live"
              ? "Recording the exact post-master mix"

              : state.mode ===
                  "paused"
                ? "Recording paused • the timer excludes paused time"

                : state.mode ===
                    "finalising"
                  ? state.session
                      ?.stage ===
                      "queued"
                    ? `Final ${String(
                        state.session
                          ?.outputFormat ||
                        setup.format ||
                        "audio"
                      ).toUpperCase()} queued…`

                    : `Creating final ${String(
                        state.session
                          ?.outputFormat ||
                        setup.format ||
                        "audio"
                      ).toUpperCase()} • ${progress}%`

                  : state.mode ===
                      "saved"
                    ? `Recording saved • ${
                        state.session
                          ?.fileName ||
                        "audio ready"
                      }`

                    : state.mode ===
                        "error"
                      ? state.session
                          ?.error ||
                        "Recording stopped because an error occurred"

                      : "Ready to capture the exact post-master mix"
        );
    }

    if (start) {
      start.disabled =
        active ||
        busy;

      start.hidden =
        active ||
        busy;
    }

    if (pause) {
      pause.disabled =
        !active;

      pause.hidden =
        !active;

      const pauseLabel =
        $(
          "span",
          pause
        );

      if (pauseLabel) {
        pauseLabel.textContent =
          state.mode ===
          "paused"
            ? "Resume"
            : "Pause";
      }
    }

    if (stop) {
      stop.disabled =
        !active;

      stop.hidden =
        !active;
    }

    if (
      cancelCountdown
    ) {
      const allowCancel =
        fieldEnabled(
          setup.fields,
          "allowCountdownCancel",
          true
        );

      cancelCountdown.hidden =
        state.mode !==
          "countdown" ||
        !allowCancel;

      cancelCountdown.disabled =
        state.mode !==
          "countdown" ||
        !allowCancel;
    }

    if (download) {
      const ready =
        state.mode ===
          "saved" &&

        Boolean(
          state.session
            ?.downloadUrl
        );

      download.hidden =
        !ready;

      download.disabled =
        !ready ||
        state.shareBusy;

      const downloadLabel =
        $(
          "span",
          download
        );

      if (downloadLabel) {
        downloadLabel.textContent =
          state.shareBusy
            ? "Preparing File…"
            : `Save / Share ${String(
                state.session
                  ?.outputFormat ||
                setup.format ||
                "Audio"
              ).toUpperCase()}`;
      }
    }

    if (
      countdownOverlay
    ) {
      const showOverlay =
        fieldEnabled(
          setup.fields,
          "showCountdown",
          true
        );

      countdownOverlay.hidden =
        state.mode !==
          "countdown" ||
        !showOverlay;

      countdownOverlay
        .setAttribute(
          "aria-hidden",

          countdownOverlay
            .hidden
            ? "true"
            : "false"
        );
    }

    if (
      countdownValue
    ) {
      countdownValue.textContent =
        String(
          state
            .countdownRemaining ||
          ""
        );
    }
  }

  function updateMeter() {
    const panel =
      $(
        "[data-dj-recording-panel]"
      );

    const fill =
      panel
        ? $(
            "[data-dj-recording-meter-fill]",
            panel
          )
        : null;

    const value =
      panel
        ? $(
            "[data-dj-recording-meter-value]",
            panel
          )
        : null;

    let target = 0;

    try {
      target =
        Math.max(
          0,

          Math.min(
            1,

            Number(
              state.engine
                ?.getMixerLevels?.()
                .master ||

              window
                .BRMediaDjAudioEngine
                ?.getMixerLevels?.()
                ?.master ||

              0
            )
          )
        );
    } catch {
      target = 0;
    }

    state.meterLevel =
      Math.max(
        target,

        state.meterLevel *
        0.88
      );

    if (fill) {
      fill.style
        .transform =
        `scaleX(${state.meterLevel.toFixed(
          4
        )})`;
    }

    if (value) {
      value.textContent =
        `${Math.round(
          state.meterLevel *
          100
        )}%`;
    }

    if (
      [
        "live",
        "paused",
      ].includes(
        state.mode
      )
    ) {
      const timer =
        panel
          ? $(
              "[data-dj-recording-timer]",
              panel
            )
          : null;

      if (timer) {
        timer.textContent =
          formatTime(
            elapsedNow()
          );
      }
    }

    state.meterFrame =
      requestAnimationFrame(
        updateMeter
      );
  }

  function activateRecordPanel() {
    document.body
      .dataset
      .djPerfView =
      "duo";

    document.body
      .dataset
      .djDuoTab =
      "record";

    $$(
      "[data-perf-view]"
    ).forEach(
      (
        button
      ) => {
        const active =
          button.dataset
            .perfView ===
          "duo";

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
      }
    );

    $$(
      "[data-dj-perf-panel]"
    ).forEach(
      (
        panel
      ) => {
        const active =
          panel.dataset
            .djPerfPanel ===
          "duo";

        panel.classList
          .toggle(
            "is-active",
            active
          );

        panel.toggleAttribute(
          "hidden",
          !active
        );

        panel.setAttribute(
          "aria-hidden",
          active
            ? "false"
            : "true"
        );

        if (
          "inert" in
          panel
        ) {
          panel.inert =
            !active;
        }
      }
    );

    $$(
      "[data-duo-tab]"
    ).forEach(
      (
        button
      ) => {
        const active =
          button.dataset
            .duoTab ===
          "record";

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
      }
    );

    $$(
      "[data-dj-duo-panel]"
    ).forEach(
      (
        panel
      ) => {
        const active =
          panel.dataset
            .djDuoPanel ===
          "record";

        panel.classList
          .toggle(
            "is-active",
            active
          );

        panel.toggleAttribute(
          "hidden",
          !active
        );

        panel.setAttribute(
          "aria-hidden",
          active
            ? "false"
            : "true"
        );

        if (
          "inert" in
          panel
        ) {
          panel.inert =
            !active;
        }
      }
    );

    render();
  }

  async function createServerSession(
    setup,
    mimeType
  ) {
    const fields =
      setup.fields ||
      {};

    const mixSetup =
      readMixSetup();

    const setPlan =
      readSetPlan();

    const handoffs =
      recordingHandoffPreferences(
        fields
      );

    const title =
      sanitiseTitle(
        mixSetup.title ||
        getRecordingTitle(
          setup
        )
      );

    const recordSetup = {
      ...setup,

      fields: {
        ...fields,
      },

      finalFormat:
        setup.format ||
        "mp3",

      channels:
        setup.channels ||
        "stereo",

      sampleRate:
        fields.sampleRate ||
        "Source/default",

      mp3Bitrate:
        fields.mp3Bitrate ||
        "320",

      mp3Mode:
        fields.mp3Mode ||
        "CBR",

      wavBitDepth:
        fields.wavBitDepth ||
        "24-bit",

      flacCompression:
        fields.flacCompression ||
        "5 balanced",

      archiveDestination:
        recordingArchiveDestination(
          fields
        ),

      createSessionFolder:
        fieldEnabled(
          fields,
          "createSessionFolder",
          true
        ),

      autoNumberDuplicates:
        fieldEnabled(
          fields,
          "autoNumberDuplicates",
          true
        ),

      saveArtwork:
        fieldEnabled(
          fields,
          "saveArtwork",
          true
        ),

      txtTracklist:
        fieldEnabled(
          fields,
          "txtTracklist",
          true
        ),

      timestampJson:
        fieldEnabled(
          fields,
          "timestampJson",
          true
        ),

      metadataJson:
        fieldEnabled(
          fields,
          "metadataJson",
          true
        ),

      sessionJson:
        fieldEnabled(
          fields,
          "sessionJson",
          true
        ),

      browserSafetyCapture:
        fieldEnabled(
          fields,
          "browserSafetyCapture",
          true
        ),

      serverFinalise:
        fieldEnabled(
          fields,
          "serverFinalise",
          true
        ),

      handoffs,
    };

    return fetchJson(
      "/dj-recordings/session",

      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            {
              title,

              mimeType,

              outputFormat:
                setup.format ||
                "mp3",

              channels:
                setup.channels ||
                "stereo",

              sampleRate:
                fields.sampleRate ||
                "Source/default",

              mp3Bitrate:
                fields.mp3Bitrate ||
                "320",

              mp3Mode:
                fields.mp3Mode ||
                "CBR",

              wavBitDepth:
                fields.wavBitDepth ||
                "24-bit",

              flacCompression:
                fields.flacCompression ||
                "5 balanced",

              serverFinalise:
                fieldEnabled(
                  fields,
                  "serverFinalise",
                  true
                ),

              browserSafetyCapture:
                fieldEnabled(
                  fields,
                  "browserSafetyCapture",
                  true
                ),

              archiveDestination:
                recordingArchiveDestination(
                  fields
                ),

              createSessionFolder:
                fieldEnabled(
                  fields,
                  "createSessionFolder",
                  true
                ),

              autoNumberDuplicates:
                fieldEnabled(
                  fields,
                  "autoNumberDuplicates",
                  true
                ),

              txtTracklist:
                fieldEnabled(
                  fields,
                  "txtTracklist",
                  true
                ),

              timestampJson:
                fieldEnabled(
                  fields,
                  "timestampJson",
                  true
                ),

              sessionJson:
                fieldEnabled(
                  fields,
                  "sessionJson",
                  true
                ),

              metadataJson:
                fieldEnabled(
                  fields,
                  "metadataJson",
                  true
                ),

              saveArtwork:
                fieldEnabled(
                  fields,
                  "saveArtwork",
                  true
                ),

              artworkDataUrl:
                fieldEnabled(
                  fields,
                  "saveArtwork",
                  true
                )
                  ? String(
                      mixSetup.coverDataUrl ||
                      ""
                    )
                  : "",

              mixSetup: {
                ...mixSetup,

                title,

                artworkName:
                  mixSetup.coverName ||
                  "",

                artworkIncluded:
                  Boolean(
                    mixSetup.coverDataUrl
                  ),
              },

              setPlan: {
                ...setPlan,

                linkedMixTitle:
                  title,

                linkedMixSetupSavedAt:
                  mixSetup.savedAt ||
                  "",

                trackCount:
                  setPlan.tracks.length,
              },

              recordSetup,

              handoffs,
            }
          ),
      }
    );
  }

  async function uploadChunkOnce(
    blob
  ) {
    if (
      !state.session
        ?.id ||

      !blob?.size
    ) {
      return;
    }

    const response =
      await fetch(
        `/dj-recordings/${encodeURIComponent(
          state.session.id
        )}/chunk`,

        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/octet-stream",
          },

          body:
            blob,
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

        `Recording chunk upload failed (${response.status})`
      );
    }

    state.session = {
      ...state.session,
      ...payload,
    };

    render();
  }

  async function uploadChunkWithRetry(
    blob
  ) {
    let lastError =
      null;

    for (
      let attempt = 1;
      attempt <=
      MAX_UPLOAD_ATTEMPTS;
      attempt += 1
    ) {
      try {
        await uploadChunkOnce(
          blob
        );

        return;
      } catch (
        error
      ) {
        lastError =
          error;

        if (
          attempt <
          MAX_UPLOAD_ATTEMPTS
        ) {
          await new Promise(
            (
              resolve
            ) =>
              window.setTimeout(
                resolve,
                attempt *
                500
              )
          );
        }
      }
    }

    throw (
      lastError ||
      new Error(
        "Could not upload recording audio"
      )
    );
  }

  function queueChunk(
    blob
  ) {
    if (
      !blob?.size ||
      state.uploadError
    ) {
      return;
    }

    state.uploadChain =
      state.uploadChain
        .then(
          () =>
            uploadChunkWithRetry(
              blob
            )
        )
        .catch(
          (
            error
          ) => {
            state.uploadError =
              error;

            if (
              state.recorder &&

              state.recorder
                .state !==
                "inactive"
            ) {
              try {
                state.recorder
                  .stop();
              } catch {}
            }

            throw error;
          }
        );
  }

  async function waitForServerFinalise(
    sessionId,
    token
  ) {
    while (
      state.finaliseToken ===
      token
    ) {
      const session =
        await fetchJson(
          `/dj-recordings/${encodeURIComponent(
            sessionId
          )}`
        );

      state.session =
        session;

      render();

      if (
        session.status ===
        "saved"
      ) {
        return session;
      }

      if (
        session.status ===
        "error"
      ) {
        throw new Error(
          session.error ||
          "Recording conversion failed"
        );
      }

      await new Promise(
        (resolve) =>
          window.setTimeout(
            resolve,
            750
          )
      );
    }

    throw new Error(
      "Recording finalisation was cancelled"
    );
  }

  async function finaliseRecording() {
    if (
      !state.session
        ?.id
    ) {
      throw new Error(
        "The recording session is missing"
      );
    }

    state.elapsedMs =
      elapsedNow();

    state.finaliseToken +=
      1;

    const token =
      state.finaliseToken;

    setMode(
      "finalising"
    );

    try {
      await state
        .uploadChain;

      if (
        state.uploadError
      ) {
        throw state
          .uploadError;
      }

      let session =
        await fetchJson(
          `/dj-recordings/${encodeURIComponent(
            state.session.id
          )}/finalise`,

          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                {
                  durationMs:
                    Math.round(
                      state.elapsedMs
                    ),
                }
              ),
          }
        );

      state.session =
        session;

      if (
        session.status ===
        "processing"
      ) {
        render();

        session =
          await waitForServerFinalise(
            session.id,
            token
          );

        state.session =
          session;
      }

      if (
        session.status ===
        "error"
      ) {
        throw new Error(
          session.error ||
          "Recording conversion failed"
        );
      }

      state.stopRequested =
        false;

      setMode(
        "saved"
      );
      window.dispatchEvent(new CustomEvent("brmedia:dj-recording-state", { detail: { status: "saved", recordingId: state.session?.id || null, session: state.session } }));
    } catch (
      error
    ) {
      state.stopRequested =
        false;

      setMode(
        "error",

        error?.message ||
        "Could not save the recording"
      );
    }
  }

  function buildRecorder(
    destination,
    mimeType
  ) {
    const options =
      mimeType
        ? {
            mimeType,
          }
        : undefined;

    const recorder =
      new MediaRecorder(
        destination.stream,
        options
      );

    recorder
      .addEventListener(
        "dataavailable",

        (
          event
        ) => {
          if (
            event.data
              ?.size
          ) {
            queueChunk(
              event.data
            );
          }
        }
      );

    recorder
      .addEventListener(
        "error",

        (
          event
        ) => {
          state.uploadError =
            event.error ||

            new Error(
              "MediaRecorder failed"
            );

          setMode(
            "error",

            state.uploadError
              .message ||

            "MediaRecorder failed"
          );
        }
      );

    recorder
      .addEventListener(
        "stop",

        () => {
          state.elapsedMs =
            elapsedNow();

          void finaliseRecording();
        }
      );

    return recorder;
  }

  async function beginLiveRecording() {
    const setup =
      readRecordSetup();

    try {
      const destination =
        await ensureCaptureDestination();

      const mimeType =
        chooseMimeType();

      if (
        typeof MediaRecorder ===
        "undefined"
      ) {
        throw new Error(
          "MediaRecorder is not supported by this browser"
        );
      }

      state.mimeType =
        mimeType;

      state.session =
        await createServerSession(
          setup,

          mimeType ||
          "audio/webm"
        );

      window.dispatchEvent(new CustomEvent("brmedia:dj-recording-state", { detail: { status: "recording", recordingId: state.session?.id || null, session: state.session } }));

      state.uploadChain =
        Promise.resolve();

      state.uploadError =
        null;

      state.elapsedMs =
        0;

      state.startedAt =
        performance.now();

      state.pausedAt =
        0;

      state.pausedTotalMs =
        0;

      state.stopRequested =
        false;

      state.recorder =
        buildRecorder(
          destination,
          mimeType
        );

      state.recorder
        .start(
          CHUNK_INTERVAL_MS
        );

      setMode(
        "live"
      );
    } catch (
      error
    ) {
      state.recorder =
        null;

      state.startedAt =
        0;

      setMode(
        "error",

        error?.message ||
        "Could not start recording"
      );
    }
  }

  function clearCountdown() {
    if (
      state.countdownTimer
    ) {
      window.clearTimeout(
        state.countdownTimer
      );

      state.countdownTimer =
        0;
    }
  }

  function runCountdownStep() {
    render();

    if (
      state
        .countdownRemaining <=
      0
    ) {
      clearCountdown();

      void beginLiveRecording();

      return;
    }

    state.countdownTimer =
      window.setTimeout(
        () => {
          state
            .countdownRemaining -=
            1;

          runCountdownStep();
        },

        1000
      );
  }

  async function startRecording() {
    if (
      ![
        "ready",
        "saved",
        "error",
      ].includes(
        state.mode
      )
    ) {
      return;
    }

    activateRecordPanel();

    const setup =
      readRecordSetup();

    const countdownSeconds =
      getCountdownSeconds(
        setup
      );

    state.session =
      null;

    state.mimeType =
      "";

    state.elapsedMs =
      0;

    state.uploadError =
      null;

    state.countdownRemaining =
      countdownSeconds;

    if (
      countdownSeconds <=
      0
    ) {
      await beginLiveRecording();

      return;
    }

    setMode(
      "countdown"
    );

    runCountdownStep();
  }

  function cancelCountdown() {
    if (
      state.mode !==
      "countdown"
    ) {
      return;
    }

    const setup =
      readRecordSetup();

    if (
      !fieldEnabled(
        setup.fields,
        "allowCountdownCancel",
        true
      )
    ) {
      return;
    }

    clearCountdown();

    state.countdownRemaining =
      0;

    setMode(
      "ready",
      "Countdown cancelled"
    );
  }

  function togglePause() {
    const recorder =
      state.recorder;

    if (!recorder) {
      return;
    }

    if (
      state.mode ===
        "live" &&

      recorder.state ===
        "recording"
    ) {
      recorder.pause();

      state.pausedAt =
        performance.now();

      state.elapsedMs =
        elapsedNow();

      setMode(
        "paused"
      );

      return;
    }

    if (
      state.mode ===
        "paused" &&

      recorder.state ===
        "paused"
    ) {
      const now =
        performance.now();

      if (
        state.pausedAt
      ) {
        state.pausedTotalMs +=
          now -
          state.pausedAt;
      }

      state.pausedAt =
        0;

      recorder.resume();

      setMode(
        "live"
      );
    }
  }

  function shouldConfirmStop() {
    const setup =
      readRecordSetup();

    return fieldEnabled(
      setup.fields,
      "confirmBeforeStop",
      false
    );
  }

  function confirmRecordingStop() {
    return new Promise((resolve) => {
      const dialog = document.createElement("dialog");
      dialog.className = "brM22Modal brDjRecordingConfirm";
      dialog.innerHTML = `<form method="dialog"><h2>Stop and save recording?</h2><p>The current DJ recording will be finalised and stored using the selected archive settings.</p><div><button value="cancel">Keep recording</button><button value="confirm" class="primary">Stop and save</button></div></form>`;
      document.body.append(dialog);
      const finish = () => { const accepted = dialog.returnValue === "confirm"; dialog.remove(); resolve(accepted); };
      dialog.addEventListener("close", finish, { once: true });
      dialog.addEventListener("cancel", () => { dialog.returnValue = "cancel"; });
      dialog.showModal();
      dialog.querySelector("button")?.focus();
    });
  }

  async function stopRecording({
    skipConfirm = false,
  } = {}) {
    if (
      ![
        "live",
        "paused",
      ].includes(
        state.mode
      )
    ) {
      return;
    }

    if (
      !skipConfirm &&

      shouldConfirmStop() &&

      !(await confirmRecordingStop())
    ) {
      return;
    }

    const recorder =
      state.recorder;

    if (
      !recorder ||

      recorder.state ===
      "inactive"
    ) {
      return;
    }

    state.stopRequested =
      true;

    state.elapsedMs =
      elapsedNow();

    setMode(
      "finalising"
    );

    try {
      if (
        recorder.state ===
        "paused"
      ) {
        recorder.resume();
      }

      recorder
        .requestData?.();

      recorder.stop();
    } catch (
      error
    ) {
      state.stopRequested =
        false;

      setMode(
        "error",

        error?.message ||
        "Could not stop recording"
      );
    }
  }

  async function downloadRecording() {
    const url =
      state.session
        ?.downloadUrl;

    if (
      !url ||
      state.shareBusy
    ) {
      return;
    }

    state.shareBusy =
      true;

    render(
      "Preparing the finished recording…"
    );

    try {
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
        throw new Error(
          `Could not fetch the recording (${response.status})`
        );
      }

      const blob =
        await response
          .blob();

      const fileName =
        state.session
          ?.fileName ||
        "BRMedia DJ Recording";

      const file =
        new File(
          [blob],
          fileName,
          {
            type:
              state.session
                ?.finalMimeType ||
              blob.type ||
              "application/octet-stream",
          }
        );

      const sharePayload = {
        title:
          state.session
            ?.title ||
          "BRMedia DJ Recording",

        files: [
          file,
        ],
      };

      if (
        typeof navigator.share ===
          "function" &&

        (
          typeof navigator.canShare !==
            "function" ||

          navigator.canShare(
            sharePayload
          )
        )
      ) {
        await navigator.share(
          sharePayload
        );

        render(
          "Save / Share sheet opened"
        );

        return;
      }

      const objectUrl =
        URL.createObjectURL(
          file
        );

      const anchor =
        document.createElement(
          "a"
        );

      anchor.href =
        objectUrl;

      anchor.download =
        fileName;

      anchor.rel =
        "noopener";

      document.body
        .append(
          anchor
        );

      anchor.click();
      anchor.remove();

      window.setTimeout(
        () =>
          URL.revokeObjectURL(
            objectUrl
          ),
        60000
      );

      render(
        "Recording download started"
      );
    } catch (
      error
    ) {
      if (
        error?.name !==
        "AbortError"
      ) {
        setMode(
          "saved",

          error?.message ||
          "Could not save or share the recording"
        );
      } else {
        render(
          "Save / Share cancelled"
        );
      }
    } finally {
      state.shareBusy =
        false;

      render();
    }
  }

  function bindPanel() {
    const panel =
      $(
        "[data-dj-recording-panel]"
      );

    if (
      !panel ||

      panel.dataset
        .recordingBound ===
        "true"
    ) {
      return;
    }

    panel.dataset
      .recordingBound =
      "true";

    $(
      "[data-dj-recording-start]",
      panel
    )?.addEventListener(
      "click",

      () =>
        void startRecording()
    );

    $(
      "[data-dj-recording-pause]",
      panel
    )?.addEventListener(
      "click",
      togglePause
    );

    $(
      "[data-dj-recording-stop]",
      panel
    )?.addEventListener(
      "click",

      () =>
        stopRecording()
    );

    $(
      "[data-dj-recording-cancel-countdown]",
      panel
    )?.addEventListener(
      "click",
      cancelCountdown
    );

    $(
      "[data-dj-recording-download]",
      panel
    )?.addEventListener(
      "click",

      () =>
        void downloadRecording()
    );
  }

  function handleRecordBeaconClick(
    event
  ) {
    const button =
      event.target
        ?.closest?.(
          "[data-duo-tab='record']"
        );

    if (!button) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const wasRecordPanel =
      document.body
        .dataset
        .djDuoTab ===
      "record";

    activateRecordPanel();

    if (
      !wasRecordPanel
    ) {
      return;
    }

    const setup =
      readRecordSetup();

    const beaconControlsRecording =
      fieldEnabled(
        setup.fields,
        "recBeaconControl",
        true
      );

    if (
      !beaconControlsRecording
    ) {
      return;
    }

    if (
      [
        "ready",
        "saved",
        "error",
      ].includes(
        state.mode
      )
    ) {
      void startRecording();

      return;
    }

    if (
      state.mode ===
      "countdown"
    ) {
      cancelCountdown();

      return;
    }

    if (
      [
        "live",
        "paused",
      ].includes(
        state.mode
      )
    ) {
      stopRecording();
    }
  }

  function handleBeforeUnload(
    event
  ) {
    const setup =
      readRecordSetup();

    const shouldWarn =
      fieldEnabled(
        setup.fields,
        "warnBeforeClose",
        true
      );

    if (
      !shouldWarn ||

      ![
        "countdown",
        "live",
        "paused",
        "finalising",
      ].includes(
        state.mode
      )
    ) {
      return;
    }

    event.preventDefault();
    event.returnValue =
      "";
  }

  function bind() {
    if (
      !document.body
        .classList
        .contains(
          "brDjPerformanceBody"
        )
    ) {
      return;
    }

    bindPanel();
    render();

    document.addEventListener(
      "click",
      handleRecordBeaconClick,
      true
    );

    window.addEventListener(
      "beforeunload",
      handleBeforeUnload
    );

    if (
      !state.meterFrame
    ) {
      state.meterFrame =
        requestAnimationFrame(
          updateMeter
        );
    }
  }

  window.BRMediaDjRecording = {
    getState() {
      return {
        mode:
          state.mode,

        elapsedMs:
          [
            "live",
            "paused",
          ].includes(
            state.mode
          )
            ? elapsedNow()
            : state
                .elapsedMs,

        mimeType:
          state.mimeType,

        session:
          state.session
            ? {
                ...state.session,
              }
            : null,
      };
    },

    start:
      startRecording,

    pause:
      togglePause,

    stop:
      stopRecording,

    cancelCountdown,

    download:
      downloadRecording,

    open:
      activateRecordPanel,
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
