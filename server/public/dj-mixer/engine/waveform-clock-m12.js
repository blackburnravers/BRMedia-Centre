(function (root) {
  "use strict";

  const clamp = (value, minimum, maximum) =>
    Math.max(minimum, Math.min(maximum, Number(value) || 0));

  class WaveformClock {
    constructor(options = {}) {
      this.now = options.now || (() => performance.now());
      this.discontinuitySeconds = Number(options.discontinuitySeconds) || 0.35;
      this.maxAnchorAgeMs = Number(options.maxAnchorAgeMs) || 1250;
      this.authority = "native";
      this.anchorPosition = 0;
      this.anchorAt = this.now();
      this.duration = 0;
      this.rate = 1;
      this.playing = false;
      this.stale = false;
      this.connected = true;
      this.loaded = false;
      this.reconciliations = 0;
    }

    setAuthority(authority) {
      this.authority = authority === "mixxx" ? "mixxx" : "native";
      return this.snapshot();
    }

    ingestNative(state = {}, receivedAt = this.now()) {
      if (this.authority !== "native") return this.snapshot(receivedAt);
      this._anchor({
        position: state.currentTime,
        duration: state.duration,
        playing: state.isPlaying,
        loaded: state.isLoaded,
        stale: false,
        rate: state.playbackRate,
      }, receivedAt, false);
      return this.snapshot(receivedAt);
    }

    ingestMixxx(state = {}, receivedAt = this.now()) {
      if (this.authority !== "mixxx") return this.snapshot(receivedAt);
      const analysed = Number(state.analysedBpm);
      const live = Number(state.liveBpm);
      const rate = analysed > 0 && live > 0
        ? live / analysed
        : 1 + (Number(state.rate) || 0);
      this._anchor({
        position: state.positionSeconds,
        duration: state.durationSeconds,
        playing: state.playing,
        loaded: state.loaded,
        stale: state.stale,
        connected: state.connected !== false && state.disconnected !== true,
        rate,
      }, receivedAt, false);
      return this.snapshot(receivedAt);
    }

    _anchor(next, receivedAt, alwaysAnchor) {
      const current = this.position(receivedAt);
      const position = Math.max(0, Number(next.position) || 0);
      const discontinuity = Math.abs(position - current) > this.discontinuitySeconds;
      const mustFreeze = next.stale === true || next.connected === false;
      if (alwaysAnchor || discontinuity || !this.loaded || next.playing !== this.playing ||
          mustFreeze || receivedAt - this.anchorAt >= this.maxAnchorAgeMs) {
        this.anchorPosition = position;
        this.anchorAt = receivedAt;
        if (discontinuity && this.loaded) this.reconciliations += 1;
      } else {
        const error = position - current;
        this.anchorPosition = current + clamp(error, -0.08, 0.08);
        this.anchorAt = receivedAt;
      }
      this.duration = Math.max(0, Number(next.duration) || this.duration);
      this.rate = clamp(next.rate || 1, 0.25, 4);
      this.playing = next.playing === true;
      this.loaded = next.loaded !== false && (next.loaded === true || this.loaded);
      this.stale = next.stale === true;
      this.connected = next.connected !== false;
      if (!this.loaded) {
        this.anchorPosition = 0;
        this.playing = false;
      }
    }

    position(at = this.now()) {
      const anchorAge = Math.max(0, at - this.anchorAt);
      const timedOut = this.authority === "mixxx" && anchorAge > this.maxAnchorAgeMs;
      const moving = this.loaded && this.playing && !this.stale && this.connected;
      const elapsedMs = moving ? Math.min(anchorAge, this.authority === "mixxx" ? this.maxAnchorAgeMs : anchorAge) : 0;
      const elapsed = elapsedMs / 1000;
      return clamp(this.anchorPosition + elapsed * this.rate, 0, this.duration || Number.MAX_SAFE_INTEGER);
    }

    snapshot(at = this.now()) {
      const position = this.position(at);
      return {
        authority: this.authority,
        position,
        duration: this.duration,
        progress: this.duration > 0 ? position / this.duration : 0,
        playing: this.playing,
        loaded: this.loaded,
        stale: this.stale || (this.authority === "mixxx" && at - this.anchorAt > this.maxAnchorAgeMs),
        connected: this.connected,
        rate: this.rate,
        reconciliations: this.reconciliations,
      };
    }
  }

  const clocks = new Map();
  const get = (deckId) => {
    const id = deckId === "d2" ? "d2" : "d1";
    if (!clocks.has(id)) clocks.set(id, new WaveformClock());
    return clocks.get(id);
  };

  root.BRMediaM12WaveformClock = Object.freeze({ WaveformClock, get });
  if (typeof module !== "undefined" && module.exports) module.exports = { WaveformClock };
})(typeof window !== "undefined" ? window : globalThis);
