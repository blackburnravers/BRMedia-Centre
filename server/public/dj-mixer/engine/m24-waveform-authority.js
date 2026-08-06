(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.BRMediaM24WaveformAuthority = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  function create() {
    const states = new Map();
    const fetches = new Map();

    const generation = (deck) => (Number(states.get(deck)?.generation) || 0) + 1;
    const begin = (deck, stableIdentity) => {
      const current = states.get(deck);
      if (current?.stableIdentity === stableIdentity) return current;
      const next = {
        deck, stableIdentity, generation: generation(deck), status: "loading",
        cacheVersion: "", realPayloadPresence: false,
        lastSuccessfulResolution: current?.lastSuccessfulResolution || null,
        error: null, payload: null, jobId: null, submitPending: false,
      };
      states.set(deck, next);
      fetches.set(deck, (fetches.get(deck) || 0) + 1);
      return next;
    };
    const transition = (deck, updates = {}, reason = "unspecified") => {
      const current = states.get(deck) || begin(deck, updates.stableIdentity || "");
      const next = { ...current, ...updates, deck };
      if (current.status === "ready" && current.realPayloadPresence &&
          next.stableIdentity === current.stableIdentity &&
          (next.status !== "ready" || !next.realPayloadPresence)) {
        console.warn("BRMedia M24 blocked waveform downgrade", {
          deck, identity: current.stableIdentity, generation: current.generation,
          from: current.status, to: next.status, reason,
        });
        return current;
      }
      states.set(deck, next);
      return next;
    };
    const accept = (deck, stableIdentity, acceptedGeneration, payload, cacheVersion = "") => {
      const current = states.get(deck);
      if (!current || current.stableIdentity !== stableIdentity || current.generation !== acceptedGeneration ||
          !Array.isArray(payload?.waveform?.peaks) || !payload.waveform.peaks.length) return false;
      states.set(deck, {
        ...current, status: "ready", cacheVersion: cacheVersion || payload.waveform.formatVersion || "prepared",
        realPayloadPresence: true, lastSuccessfulResolution: Date.now(), error: null, payload,
      });
      return true;
    };
    const clear = (deck, status = "deck-empty") => {
      const current = states.get(deck);
      const next = {
        deck, stableIdentity: "", generation: generation(deck), status,
        cacheVersion: "", realPayloadPresence: false,
        lastSuccessfulResolution: current?.lastSuccessfulResolution || null,
        error: null, payload: null, jobId: null, submitPending: false,
      };
      states.set(deck, next);
      return next;
    };
    const resolve = (deck, visual = {}) => {
      const current = states.get(deck);
      const waveform = current?.payload?.waveform;
      if (current?.status !== "ready" || !current.realPayloadPresence || !waveform?.peaks?.length) return visual;
      return {
        ...visual, isLoaded: true, waveformPeaks: waveform.peaks,
        waveformBands: waveform.bands || null, waveformMultiscale: waveform.multiscale || null,
        waveformVersion: `${current.stableIdentity}:${current.cacheVersion || "prepared"}`,
      };
    };
    return { states, fetches, generation, begin, transition, accept, clear, resolve };
  }
  return Object.freeze({ create });
});
