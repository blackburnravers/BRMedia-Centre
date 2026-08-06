(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.BRMediaM25GridAuthority = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const READY = new Set(["grid-ready", "grid-needs-review", "grid-locked"]);
  function create(options = {}) {
    const states = new Map(), warm = new Map();
    const maxWarm = Math.max(2, Number(options.maxWarm) || 8);
    const generation = (deck) => (Number(states.get(deck)?.generation) || 0) + 1;
    const empty = (deck, status = "deck-empty") => ({ deck, stableIdentity: "", generation: generation(deck), status,
      cacheVersion: "", revision: 0, realGridPresence: false, lastSuccessfulResolution: null, error: null, grid: null,
      staleRejected: Number(states.get(deck)?.staleRejected) || 0, driftCorrections: 0, maximumDrift: 0, currentSegment: -1 });
    const clear = (deck, status) => { const value = empty(deck, status); states.set(deck, value); return value; };
    const begin = (deck, stableIdentity) => {
      const current = states.get(deck); if (current?.stableIdentity === stableIdentity) return current;
      const cached = warm.get(stableIdentity);
      const value = cached ? { ...cached, deck, generation: generation(deck) } : { ...empty(deck, "grid-loading"), stableIdentity };
      states.set(deck, value); return value;
    };
    const accept = (deck, stableIdentity, acceptedGeneration, payload) => {
      const current = states.get(deck), grid = payload?.grid;
      if (!current || current.stableIdentity !== stableIdentity || current.generation !== acceptedGeneration ||
          !READY.has(payload?.state) || !grid || !Array.isArray(grid.segments) || !grid.segments.length) {
        if (current) current.staleRejected += 1; return false;
      }
      const next = { ...current, status: payload.state, cacheVersion: String(grid.cacheVersion || ""), revision: Number(grid.revision) || 1,
        gridType: grid.resolvedMode === "dynamic" ? "dynamic" : "static", baseBpm: Number(grid.bpm) || null,
        tempoSegments: grid.segments, beatPayloadPresence: true, barPayloadPresence: Number(grid.barLength) > 0,
        downbeatPayloadPresence: Number.isFinite(Number(grid.downbeat)), locked: grid.locked === true,
        reviewRequired: grid.reviewRequired === true, realGridPresence: true, lastSuccessfulResolution: Date.now(), error: null, grid };
      states.set(deck, next); warm.delete(stableIdentity); warm.set(stableIdentity, { ...next });
      while (warm.size > maxWarm) warm.delete(warm.keys().next().value);
      return true;
    };
    const transition = (deck, stableIdentity, acceptedGeneration, status, error = null) => {
      const current = states.get(deck);
      if (!current || current.stableIdentity !== stableIdentity || current.generation !== acceptedGeneration) {
        if (current) current.staleRejected += 1; return false;
      }
      if (READY.has(current.status) && current.realGridPresence && !READY.has(status)) {
        if (typeof console !== "undefined" && typeof console.warn === "function") console.warn("BRMedia M25 blocked grid downgrade", {
          deck, identity: stableIdentity, generation: acceptedGeneration, from: current.status, to: status,
        });
        return false;
      }
      states.set(deck, { ...current, status, error }); return true;
    };
    const gridForRender = (deck) => { const value = states.get(deck); return value && READY.has(value.status) && value.realGridPresence ? value.grid : null; };
    const segmentAt = (grid, seconds) => {
      if (!grid?.segments?.length) return { index: -1, segment: null };
      let index = 0; for (let cursor = 1; cursor < grid.segments.length; cursor += 1) { if (grid.segments[cursor].startTime <= seconds) index = cursor; else break; }
      return { index, segment: grid.segments[index] };
    };
    const readout = (deck, seconds, effectiveBpm = null) => {
      const value = states.get(deck), grid = gridForRender(deck); if (!grid) return null;
      const located = segmentAt(grid, Number(seconds) || 0), segment = located.segment;
      const beatFloat = segment.startBeat + (((Number(seconds) || 0) - segment.startTime) * segment.bpm) / 60;
      const beat = Math.floor(beatFloat + 1e-7), beatInBar = ((beat % (grid.barLength || 4)) + (grid.barLength || 4)) % (grid.barLength || 4) + 1;
      return { beatInBar, bar: Math.floor(beat / (grid.barLength || 4)) + 1, phrase: grid.phraseLength ? Math.floor(beat / grid.phraseLength) + 1 : null,
        gridBpm: segment.bpm, effectiveBpm: Number.isFinite(Number(effectiveBpm)) ? Number(effectiveBpm) : null,
        mode: grid.resolvedMode, locked: grid.locked, reviewRequired: grid.reviewRequired, segment: located.index + 1, revision: value.revision };
    };
    const reconcilePhase = (deck, savedPhase, livePhase, soft = 0.04, hard = 0.18) => {
      const value = states.get(deck); if (!value || !Number.isFinite(savedPhase) || !Number.isFinite(livePhase)) return { correction: 0, snap: false };
      let drift = livePhase - savedPhase; if (drift > 0.5) drift -= 1; if (drift < -0.5) drift += 1;
      value.maximumDrift = Math.max(value.maximumDrift, Math.abs(drift));
      if (Math.abs(drift) < soft) return { correction: 0, snap: false };
      value.driftCorrections += 1; return { correction: Math.abs(drift) >= hard ? drift : drift * 0.12, snap: Math.abs(drift) >= hard };
    };
    return { states, warm, generation, begin, accept, transition, clear, gridForRender, readout, reconcilePhase, segmentAt };
  }
  return Object.freeze({ create, READY });
});
