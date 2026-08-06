(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.BRMediaM26MasterReceiver = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const STATES = new Set(["unavailable", "waiting-for-user-gesture", "connecting", "buffering", "live", "recovering", "stale", "failed", "stopped"]);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function resampleInterleaved(pcm, channels, sourceRate, targetRate) {
    if (sourceRate === targetRate) return pcm;
    const sourceFrames = Math.floor(pcm.length / channels);
    const targetFrames = Math.max(1, Math.round(sourceFrames * targetRate / sourceRate));
    const output = new Float32Array(targetFrames * channels);
    for (let frame = 0; frame < targetFrames; frame += 1) {
      const sourcePosition = Math.min(sourceFrames - 1, frame * sourceRate / targetRate);
      const left = Math.floor(sourcePosition);
      const right = Math.min(sourceFrames - 1, left + 1);
      const mix = sourcePosition - left;
      for (let channel = 0; channel < channels; channel += 1) {
        const a = pcm[(left * channels) + channel] || 0;
        const b = pcm[(right * channels) + channel] || 0;
        output[(frame * channels) + channel] = a + ((b - a) * mix);
      }
    }
    return output;
  }

  function createBoundedLegacyNode(context, capacityFrames, onMetrics) {
    if (typeof context.createScriptProcessor !== "function") return null;
    const processor = context.createScriptProcessor(1024, 0, 2);
    let channels = 2;
    let buffer = new Float32Array(capacityFrames * channels);
    let readFrame = 0, writeFrame = 0, availableFrames = 0, underruns = 0, droppedFrames = 0;
    const reset = (nextChannels = channels) => {
      channels = nextChannels === 1 ? 1 : 2;
      buffer = new Float32Array(capacityFrames * channels);
      readFrame = 0; writeFrame = 0; availableFrames = 0;
    };
    const push = (pcm, nextChannels) => {
      if (!(pcm instanceof Float32Array)) return;
      if ((nextChannels === 1 ? 1 : 2) !== channels) reset(nextChannels);
      const incoming = Math.floor(pcm.length / channels);
      const skip = Math.max(0, incoming - capacityFrames);
      const accepted = incoming - skip;
      const overflow = Math.max(0, availableFrames + accepted - capacityFrames);
      if (overflow) { readFrame = (readFrame + overflow) % capacityFrames; availableFrames -= overflow; droppedFrames += overflow; }
      droppedFrames += skip;
      for (let frame = skip; frame < incoming; frame += 1) {
        for (let channel = 0; channel < channels; channel += 1) buffer[(writeFrame * channels) + channel] = pcm[(frame * channels) + channel] || 0;
        writeFrame = (writeFrame + 1) % capacityFrames; availableFrames += 1;
      }
    };
    processor.port = {
      onmessage: null,
      postMessage(message) {
        if (message?.type === "reset") reset(message.channels);
        else if (message?.type === "push") push(message.pcm, message.channels);
      },
    };
    processor.onaudioprocess = (event) => {
      const output = event.outputBuffer;
      for (let frame = 0; frame < output.length; frame += 1) {
        if (!availableFrames) {
          for (let channel = 0; channel < output.numberOfChannels; channel += 1) output.getChannelData(channel)[frame] = 0;
          underruns += 1; continue;
        }
        for (let channel = 0; channel < output.numberOfChannels; channel += 1) {
          output.getChannelData(channel)[frame] = buffer[(readFrame * channels) + Math.min(channel, channels - 1)] || 0;
        }
        readFrame = (readFrame + 1) % capacityFrames; availableFrames -= 1;
      }
      onMetrics({ bufferedFrames: availableFrames, capacityFrames, underruns, droppedFrames });
    };
    return processor;
  }

  class MasterReceiver {
    constructor(options = {}) {
      if (!options.audioContext) throw new Error("An existing AudioContext is required");
      if (typeof options.createTransport !== "function") throw new Error("A transport factory is required");
      this.context = options.audioContext;
      this.createTransport = options.createTransport;
      this.workletUrl = String(options.workletUrl || "/dj-mixer/engine/m26-pcm-player-worklet.js");
      this.now = typeof options.now === "function" ? options.now : () => Date.now();
      this.setTimer = options.setTimer || ((fn, ms) => setTimeout(fn, ms));
      this.clearTimer = options.clearTimer || ((id) => clearTimeout(id));
      this.maxBufferedMs = clamp(Number(options.maxBufferedMs) || 250, 80, 500);
      this.maxFrameAgeMs = clamp(Number(options.maxFrameAgeMs) || 750, 200, 2000);
      this.retryDelays = Array.isArray(options.retryDelays) && options.retryDelays.length
        ? options.retryDelays.slice(0, 8).map((value) => clamp(Number(value) || 0, 100, 15000))
        : [500, 1000, 2000, 4000, 8000];
      this.state = "stopped";
      this.generation = 0;
      this.unlocked = false;
      this.backendActive = false;
      this.session = null;
      this.transport = null;
      this.node = null;
      this.workletReady = null;
      this.retryTimer = 0;
      this.retryAttempt = 0;
      this.lastSequence = -1;
      this.captureClockOffsetFloorMs = null;
      this.metrics = {
        framesReceived: 0, framesDropped: 0, staleFramesDropped: 0, duplicateFramesDropped: 0,
        nonSilentFramesReceived: 0, sourcePeak: 0,
        underruns: 0, bufferedFrames: 0, capacityFrames: 0, reconnects: 0,
        lastFrameAt: null, lastError: null, sampleRate: null, channels: null, captureToReceiveMs: null,
        captureClockOffsetMs: null,
      };
      this.listeners = new Set();
    }

    emit() {
      const value = this.snapshot();
      this.listeners.forEach((listener) => { try { listener(value); } catch {} });
      return value;
    }

    transition(state, error = null) {
      if (!STATES.has(state)) throw new Error(`Invalid receiver state: ${state}`);
      this.state = state;
      if (error) this.metrics.lastError = String(error?.message || error).slice(0, 240);
      return this.emit();
    }

    subscribe(listener) {
      if (typeof listener !== "function") return () => {};
      this.listeners.add(listener);
      listener(this.snapshot());
      return () => this.listeners.delete(listener);
    }

    snapshot() {
      return Object.freeze({
        state: this.state, generation: this.generation, unlocked: this.unlocked,
        backendActive: this.backendActive, connected: Boolean(this.transport),
        outputAttached: Boolean(this.node),
        audioContextState: this.context.state, retryAttempt: this.retryAttempt,
        sessionId: this.session?.id ? String(this.session.id).slice(-8) : null,
        ...this.metrics,
      });
    }

    async ensureNode() {
      if (this.node) return this.node;
      const capacityFrames = Math.ceil(this.context.sampleRate * this.maxBufferedMs / 1000);
      const applyMetrics = (value) => {
        this.metrics.bufferedFrames = Number(value.bufferedFrames) || 0;
        this.metrics.capacityFrames = Number(value.capacityFrames) || 0;
        this.metrics.underruns = Number(value.underruns) || 0;
        this.metrics.framesDropped = Math.max(this.metrics.framesDropped, Number(value.droppedFrames) || 0);
      };
      if (this.context.audioWorklet && typeof AudioWorkletNode === "function") {
        if (!this.workletReady) this.workletReady = this.context.audioWorklet.addModule(this.workletUrl);
        await this.workletReady;
        if (this.node) return this.node;
        this.node = new AudioWorkletNode(this.context, "brmedia-m26-pcm-player", {
          numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2],
          processorOptions: { capacityFrames },
        });
        this.node.port.onmessage = (event) => { if (event.data?.type === "metrics") applyMetrics(event.data); };
      } else {
        this.node = createBoundedLegacyNode(this.context, capacityFrames, applyMetrics);
        if (!this.node) throw new Error("Browser PCM playback is unavailable");
      }
      this.node.connect(this.context.destination);
      return this.node;
    }

    async unlockFromGesture() {
      if (this.context.state === "suspended") await this.context.resume();
      this.unlocked = this.context.state === "running";
      if (!this.unlocked) return this.transition("waiting-for-user-gesture");
      if (this.backendActive && this.session && ["waiting-for-user-gesture", "stopped", "failed"].includes(this.state)) {
        await this.connect();
      }
      return this.emit();
    }

    async start(session) {
      this.session = session && typeof session === "object" ? { ...session } : null;
      if (!this.backendActive || !this.session) return this.transition("stopped");
      if (!this.unlocked) return this.transition("waiting-for-user-gesture");
      return this.connect();
    }

    async connect() {
      if (!this.backendActive || !this.session || !this.unlocked) return this.snapshot();
      const generation = ++this.generation;
      this.cancelRetry();
      this.closeTransport();
      this.lastSequence = -1;
      this.captureClockOffsetFloorMs = null;
      this.transition(this.retryAttempt ? "recovering" : "connecting");
      try {
        await this.ensureNode();
        if (generation !== this.generation) return this.snapshot();
        const handlers = {
          frame: (frame) => this.acceptFrame(generation, frame),
          open: () => generation === this.generation && this.transition("buffering"),
          stale: () => generation === this.generation && this.transition("stale"),
          close: (reason) => this.onTransportFailure(generation, reason || "Stream closed"),
          error: (error) => this.onTransportFailure(generation, error),
        };
        const transport = await this.createTransport({ ...this.session }, handlers);
        if (generation !== this.generation) { try { transport?.close?.(); } catch {} return this.snapshot(); }
        this.transport = transport || null;
        await this.transport?.connect?.();
        return this.snapshot();
      } catch (error) {
        this.onTransportFailure(generation, error);
        return this.snapshot();
      }
    }

    acceptFrame(generation, frame = {}) {
      if (generation !== this.generation || !this.backendActive || !this.node) return false;
      let pcm = frame.pcm;
      const channels = frame.channels === 1 ? 1 : 2;
      const sequence = Number(frame.sequence);
      const capturedAt = Number(frame.captureTimestampMs);
      if (!(pcm instanceof Float32Array) || !pcm.length || !Number.isFinite(sequence)) return false;
      if (sequence <= this.lastSequence) {
        this.metrics.duplicateFramesDropped += Math.floor(pcm.length / channels);
        return false;
      }
      const receivedAt = this.now();
      let relativeAgeMs = null;
      if (Number.isFinite(capturedAt)) {
        const observedOffset = receivedAt - capturedAt;
        if (!Number.isFinite(this.captureClockOffsetFloorMs) || observedOffset < this.captureClockOffsetFloorMs) {
          this.captureClockOffsetFloorMs = observedOffset;
        }
        relativeAgeMs = Math.max(0, observedOffset - this.captureClockOffsetFloorMs);
        this.metrics.captureClockOffsetMs = this.captureClockOffsetFloorMs;
        if (relativeAgeMs > this.maxFrameAgeMs) {
          this.lastSequence = sequence;
          this.metrics.staleFramesDropped += Math.floor(pcm.length / channels);
          return false;
        }
      }
      this.lastSequence = sequence;
      this.metrics.framesReceived += Math.floor(pcm.length / channels);
      this.metrics.lastFrameAt = receivedAt;
      this.metrics.sampleRate = Number(frame.sampleRate) || this.context.sampleRate;
      this.metrics.channels = channels;
      this.metrics.captureToReceiveMs = relativeAgeMs;
      let peak = 0;
      for (let index = 0; index < pcm.length; index += 1) peak = Math.max(peak, Math.abs(pcm[index]));
      this.metrics.sourcePeak = peak;
      if (peak > 0.0005) this.metrics.nonSilentFramesReceived += Math.floor(pcm.length / channels);
      pcm = resampleInterleaved(
        pcm,
        channels,
        Number(frame.sampleRate) || this.context.sampleRate,
        this.context.sampleRate
      );
      this.node.port.postMessage({ type: "push", channels, pcm }, [pcm.buffer]);
      this.retryAttempt = 0;
      if (peak > 0.0005) {
        if (this.state !== "live") this.transition("live");
      } else if (this.metrics.nonSilentFramesReceived === 0 && this.state !== "buffering") {
        this.transition("buffering");
      }
      return true;
    }

    onTransportFailure(generation, error) {
      if (generation !== this.generation || !this.backendActive) return;
      this.closeTransport();
      this.metrics.lastError = String(error?.message || error || "Stream unavailable").slice(0, 240);
      if (this.retryAttempt >= this.retryDelays.length) return void this.transition("failed", error);
      const delay = this.retryDelays[this.retryAttempt++];
      this.metrics.reconnects += 1;
      this.transition("recovering", error);
      this.retryTimer = this.setTimer(() => {
        this.retryTimer = 0;
        if (generation === this.generation && this.backendActive) void this.connect();
      }, delay);
    }

    backendChanged(active) {
      this.backendActive = active === true;
      if (!this.backendActive) return this.stop({ preserveSession: false });
      if (this.session) return this.unlocked ? this.connect() : this.transition("waiting-for-user-gesture");
      return this.transition("stopped");
    }

    visibilityChanged(visible) {
      if (!visible) return this.emit();
      if (this.backendActive && this.session && this.unlocked && ["stale", "recovering", "failed"].includes(this.state)) return this.connect();
      return this.emit();
    }

    cancelRetry() {
      if (this.retryTimer) this.clearTimer(this.retryTimer);
      this.retryTimer = 0;
    }

    closeTransport() {
      const transport = this.transport;
      this.transport = null;
      try { transport?.close?.(); } catch {}
    }

    stop(options = {}) {
      ++this.generation;
      this.cancelRetry();
      this.closeTransport();
      this.retryAttempt = 0;
      this.lastSequence = -1;
      this.captureClockOffsetFloorMs = null;
      this.node?.port?.postMessage?.({ type: "reset", channels: 2 });
      if (options.preserveSession !== true) this.session = null;
      return this.transition("stopped");
    }

    destroy() {
      this.stop();
      try { this.node?.disconnect?.(); } catch {}
      this.node = null;
      this.listeners.clear();
    }
  }

  return Object.freeze({ MasterReceiver, STATES: Object.freeze(Array.from(STATES)), resampleInterleaved, createBoundedLegacyNode });
});
