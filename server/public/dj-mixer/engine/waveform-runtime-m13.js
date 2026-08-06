(function (root) {
  "use strict";
  const FORMAT_VERSION = "multiscale-spectral-m12-v1";
  const FIELDS = ["combined", "low", "mid", "high", "transients"];
  const clamp = (value, minimum, maximum) =>
    Math.max(minimum, Math.min(maximum, Number.isFinite(Number(value)) ? Number(value) : minimum));

  const canvasSize = (cssWidth, cssHeight, dpr = 1) => {
    const width = Math.max(0, Number(cssWidth) || 0);
    const height = Math.max(0, Number(cssHeight) || 0);
    const pixelRatio = clamp(dpr, 1, 3);
    return {
      cssWidth: width, cssHeight: height, pixelRatio,
      width: width > 0 ? Math.max(1, Math.round(width * pixelRatio)) : 0,
      height: height > 0 ? Math.max(1, Math.round(height * pixelRatio)) : 0,
    };
  };

  const validateLevel = (level) => {
    if (!level || typeof level !== "object") return false;
    const count = Math.floor(Number(level.count));
    if (!Number.isFinite(count) || count < 2 || count > 131072) return false;
    return FIELDS.every((field) =>
      Array.isArray(level[field]) && level[field].length === count &&
      level[field].every((value) => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 1)
    );
  };

  const validatePyramid = (pyramid) => {
    if (!pyramid || typeof pyramid !== "object") return { valid: false, reason: "not-prepared", levels: [] };
    if (pyramid.formatVersion !== FORMAT_VERSION) return { valid: false, reason: "unsupported-version", levels: [] };
    if (pyramid.complete !== true) return { valid: false, reason: "incomplete", levels: [] };
    if (!Array.isArray(pyramid.levels) || !pyramid.levels.length) return { valid: false, reason: "levels-missing", levels: [] };
    if (!pyramid.levels.every(validateLevel)) return { valid: false, reason: "invalid-data", levels: [] };
    const levels = [...pyramid.levels].sort((left, right) => left.count - right.count);
    if (levels.some((level, index) => index > 0 && level.count === levels[index - 1].count)) {
      return { valid: false, reason: "duplicate-level", levels: [] };
    }
    return { valid: true, reason: "ready", levels };
  };

  const chooseLevel = (levels, wantedPoints, previousCount = 0, hysteresis = 0.18) => {
    if (!Array.isArray(levels) || !levels.length) return null;
    const wanted = Math.max(2, Number(wantedPoints) || 2);
    const previous = levels.find((level) => level.count === Number(previousCount));
    const selected = levels.find((level) => level.count >= wanted) || levels[levels.length - 1];
    if (!previous || previous === selected) return selected;
    const lower = Math.min(previous.count, selected.count);
    const upper = Math.max(previous.count, selected.count);
    const boundary = Math.sqrt(lower * upper);
    const margin = clamp(hysteresis, 0, 0.45);
    if (selected.count > previous.count && wanted < boundary * (1 + margin)) return previous;
    if (selected.count < previous.count && wanted > boundary * (1 - margin)) return previous;
    return selected;
  };

  const safeFallback = (peaks, bands) => {
    if (!Array.isArray(peaks) || peaks.length < 2) return { valid: false, peaks: [], bands: null };
    const safePeaks = peaks.map((value) => clamp(value, 0, 1));
    const safeBands = {};
    for (const field of ["low", "mid", "high", "transient"]) {
      const values = bands?.[field];
      if (Array.isArray(values) && values.length === safePeaks.length) {
        safeBands[field] = values.map((value) => clamp(value, 0, 1));
      }
    }
    return { valid: true, peaks: safePeaks, bands: safeBands };
  };

  const visibleRange = (count, progress, visibleFraction, padding = 0.06) => {
    const last = Math.max(0, Math.floor(Number(count) || 0) - 1);
    if (!last) return { start: 0, end: 0 };
    const centre = clamp(progress, 0, 1);
    const half = Math.max(0, Number(visibleFraction) || 0) / 2 + Math.max(0, Number(padding) || 0);
    return {
      start: clamp(Math.floor((centre - half) * last), 0, last),
      end: clamp(Math.ceil((centre + half) * last), 0, last),
    };
  };

  const seekTime = (startTime, deltaX, cssWidth, visibleSeconds, duration, preRoll = 0) => {
    const width = Math.max(1, Number(cssWidth) || 1);
    const target = (Number(startTime) || 0) - ((Number(deltaX) || 0) / width) * Math.max(0, Number(visibleSeconds) || 0);
    return clamp(target, -Math.max(0, Number(preRoll) || 0), Math.max(0, Number(duration) || 0));
  };

  const isAbortError = (error) =>
    error?.name === "AbortError" ||
    error?.code === "ABORT_ERR" ||
    String(error?.message || "").toLowerCase().includes("aborted");

  const safeFallbackReason = (reason) => {
    const value = String(reason || "").trim().toLowerCase();
    if (!value) return "";
    const known = [
      "not-prepared", "unsupported-version", "incomplete", "levels-missing",
      "invalid-data", "duplicate-level", "runtime-unavailable", "legacy-fallback",
      "unavailable", "prepared-waveform-cache-error",
    ];
    if (known.includes(value)) return value;
    const httpStatus = value.match(/\bhttp(?: status)?\s*[:=-]?\s*(\d{3})\b/);
    if (httpStatus) return `http-${httpStatus[1]}`;
    if (value.includes("abort")) return "aborted";
    if (value.includes("network") || value.includes("fetch")) return "network-error";
    if (value.includes("json") || value.includes("parse")) return "invalid-json";
    return "waveform-error";
  };

  const IPHONE_VALIDATION_CHECKLIST = Object.freeze([
    "Open with ?brWaveformValidate=1; confirm diagnostics are enabled and contain no track names, paths, URLs, or media identifiers.",
    "Load and replace tracks on Deck 1 and Deck 2; confirm each deck keeps independent waveform, transport, abort, and stale-result counters.",
    "On a Retina iPhone, compare DPR with CSS and backing canvas dimensions; backing dimensions should equal CSS dimensions multiplied by the bounded DPR.",
    "Rotate portrait to landscape and back, then show and hide browser chrome; confirm canvases resize without stretching or clipping.",
    "Play, pause, seek, cue, and eject both decks; confirm the fixed playhead stays centred and the waveform position follows the audible transport.",
    "Touch-drag a fixed-centre waveform, then finish and cancel separate drags; confirm seeking stops and the page does not remain capture-locked.",
    "Background and restore the page; confirm animation reports hidden while backgrounded and resumes without a large position jump.",
    "Navigate rapidly away and back during track replacement; confirm aborted work is silent and stale results never replace the newest track.",
    "Capture BRMediaDebug.waveform.snapshot() and history(); note orientation, browser, iPhone model, observed slow frames, fallbacks, and any defects.",
  ]);

  const createDiagnostics = (options = {}) => {
    let enabled = options.enabled === true;
    let validationEnabled = options.validationEnabled === true;
    const historyLimit = Math.floor(clamp(options.historyLimit ?? 120, 10, 600));
    const sampleIntervalMs = clamp(options.sampleIntervalMs ?? 250, 50, 5000);
    const slowFrameThresholdMs = clamp(options.slowFrameThresholdMs ?? 24, 8, 250);
    const now = typeof options.now === "function" ? options.now : () => Date.now();
    const decks = new Map();
    const histories = new Map();
    const lastSampleAt = new Map();
    const deckState = (deckId) => {
      const safeId = deckId === "d2" ? "d2" : "d1";
      if (!decks.has(safeId)) {
        decks.set(safeId, {
          dpr: 1, cssSize: { width: 0, height: 0 }, backingSize: { width: 0, height: 0 },
          selectedCacheLevel: null, visibleSampleRange: { start: 0, end: 0 },
          animationState: "idle", frameTimingMs: 0, slowFrameCount: 0, snapCount: 0,
          abortCount: 0, staleRejectionCount: 0, lastFallbackReason: "",
          validationChecks: { dpr: 0, resize: 0, orientation: 0, seek: 0, playbackClock: 0 },
        });
      }
      return decks.get(safeId);
    };
    const sample = (deckId, state, timestamp) => {
      const id = deckId === "d2" ? "d2" : "d1";
      if (timestamp - (lastSampleAt.get(id) ?? -Infinity) < sampleIntervalMs) return;
      lastSampleAt.set(id, timestamp);
      const history = histories.get(id) || [];
      history.push(Object.freeze({
        atMs: Math.round(timestamp),
        dpr: Number(state.dpr) || 1,
        cssWidth: Number(state.cssSize?.width) || 0,
        cssHeight: Number(state.cssSize?.height) || 0,
        backingWidth: Number(state.backingSize?.width) || 0,
        backingHeight: Number(state.backingSize?.height) || 0,
        selectedCacheLevel: Number(state.selectedCacheLevel) || null,
        frameTimingMs: Number((Number(state.frameTimingMs) || 0).toFixed(3)),
        slowFrameCount: Number(state.slowFrameCount) || 0,
        abortCount: Number(state.abortCount) || 0,
        staleRejectionCount: Number(state.staleRejectionCount) || 0,
        reconciliationSnaps: Number(state.snapCount) || 0,
        fallbackReason: String(state.lastFallbackReason || "").slice(0, 80),
        animationState: ["idle", "playing", "hidden"].includes(state.animationState)
          ? state.animationState
          : "idle",
      }));
      if (history.length > historyLimit) history.splice(0, history.length - historyLimit);
      histories.set(id, history);
    };
    const record = (deckId, patch = {}) => {
      if (!enabled) return;
      const state = deckState(deckId);
      for (const [key, value] of Object.entries(patch)) {
        if (Object.prototype.hasOwnProperty.call(state, key)) {
          state[key] = key === "lastFallbackReason" ? safeFallbackReason(value) : value;
        }
      }
      if (Object.prototype.hasOwnProperty.call(patch, "frameTimingMs")) {
        if (Number(patch.frameTimingMs) > slowFrameThresholdMs) state.slowFrameCount += 1;
        sample(deckId, state, Number(now()) || 0);
      }
    };
    const increment = (deckId, field) => {
      if (!enabled) return;
      const state = deckState(deckId);
      if (Object.prototype.hasOwnProperty.call(state, field)) state[field] += 1;
    };
    const snapshot = () => ({
      enabled,
      validationEnabled,
      historyLimit,
      sampleIntervalMs,
      slowFrameThresholdMs,
      decks: Object.fromEntries(["d1", "d2"].map((id) => [id, { ...deckState(id) }])),
    });
    const history = () => ({
      enabled,
      limit: historyLimit,
      sampleIntervalMs,
      decks: Object.fromEntries(["d1", "d2"].map((id) => [
        id,
        (histories.get(id) || []).map((entry) => ({ ...entry })),
      ])),
    });
    const clearHistory = () => {
      histories.clear();
      lastSampleAt.clear();
      return history();
    };
    return Object.freeze({
      get enabled() { return enabled; },
      get validationEnabled() { return validationEnabled; },
      enable(value = true) { enabled = value === true; return snapshot(); },
      enableValidation(value = true) { validationEnabled = value === true; return snapshot(); },
      record, increment, snapshot, history, clearHistory,
      checklist: () => [...IPHONE_VALIDATION_CHECKLIST],
    });
  };

  const createRequestPipelines = (options = {}) => {
    const controllers = new Map();
    const generations = new Map();
    const diagnostics = options.diagnostics || null;
    const begin = (deckId) => {
      const id = deckId === "d2" ? "d2" : "d1";
      const previous = controllers.get(id);
      if (previous && !previous.signal.aborted) {
        previous.abort();
        diagnostics?.increment?.(id, "abortCount");
      }
      const controller = new AbortController();
      const generation = (generations.get(id) || 0) + 1;
      generations.set(id, generation);
      controllers.set(id, controller);
      return Object.freeze({
        deckId: id,
        generation,
        signal: controller.signal,
        isCurrent: () =>
          generations.get(id) === generation &&
          controllers.get(id) === controller &&
          !controller.signal.aborted,
      });
    };
    const abort = (deckId) => {
      const id = deckId === "d2" ? "d2" : "d1";
      const controller = controllers.get(id);
      generations.set(id, (generations.get(id) || 0) + 1);
      controllers.delete(id);
      if (controller && !controller.signal.aborted) {
        controller.abort();
        diagnostics?.increment?.(id, "abortCount");
        return true;
      }
      return false;
    };
    const abortAll = () => {
      ["d1", "d2"].forEach(abort);
    };
    const finish = (request) => {
      if (!request?.isCurrent?.()) return false;
      controllers.delete(request.deckId);
      return true;
    };
    return Object.freeze({ begin, abort, abortAll, finish });
  };

  const installDebugInterface = (diagnostics) => {
    if (!root || !diagnostics) return null;
    const namespace = root.BRMediaDebug = root.BRMediaDebug || {};
    namespace.waveform = Object.freeze({
      enable: diagnostics.enable,
      enableValidation: diagnostics.enableValidation,
      snapshot: diagnostics.snapshot,
      history: diagnostics.history,
      clearHistory: diagnostics.clearHistory,
      iPhoneChecklist: diagnostics.checklist,
    });
    return namespace.waveform;
  };

  const api = Object.freeze({
    FORMAT_VERSION, canvasSize, validatePyramid, chooseLevel, safeFallback, visibleRange, seekTime,
    isAbortError, safeFallbackReason, createDiagnostics, createRequestPipelines, installDebugInterface,
    IPHONE_VALIDATION_CHECKLIST,
  });
  root.BRMediaM13WaveformRuntime = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
