(() => {
  class DeckEngine {
    constructor(engine, deckId) {
      this.engine = engine;
      this.context = engine.context;
      this.deckId = deckId;
      this.trimGainNode = this.context.createGain();
      this.trimGainNode.gain.value = 1;
      this.lowEqNode = this.context.createBiquadFilter();
      this.lowEqNode.type = "lowshelf";
      this.lowEqNode.frequency.value = 180;
      this.lowEqNode.gain.value = 0;
      this.midEqNode = this.context.createBiquadFilter();
      this.midEqNode.type = "peaking";
      this.midEqNode.frequency.value = 1100;
      this.midEqNode.Q.value = 0.9;
      this.midEqNode.gain.value = 0;
      this.highEqNode = this.context.createBiquadFilter();
      this.highEqNode.type = "highshelf";
      this.highEqNode.frequency.value = 4200;
      this.highEqNode.gain.value = 0;
      this.filterNode = this.context.createBiquadFilter();
      this.filterNode.type = "allpass";
      this.filterNode.frequency.value = 1000;
      this.filterNode.Q.value = 0.707;
      this.gainNode = this.context.createGain();
      this.gainNode.gain.value = 1;
      this.analyserNode = this.context.createAnalyser();
      this.analyserNode.fftSize = 1024;
      this.meterData = new Uint8Array(this.analyserNode.fftSize);
      this.trimGainNode.connect(this.lowEqNode);
      this.lowEqNode.connect(this.midEqNode);
      this.midEqNode.connect(this.highEqNode);
      this.highEqNode.connect(this.filterNode);
      this.filterNode.connect(this.gainNode);
      this.gainNode.connect(this.analyserNode);
      this.analyserNode.connect(engine.masterGain);
      this.channelVolume = 1;
      this.crossfadeGain = 1;
      this.trimGain = 1;
      this.filterValue = 50;
      this.eqValues = { high: 100, mid: 100, low: 100 };
      this.killStates = { high: false, mid: false, low: false };

      this.file = null;
      this.fileName = "";
      this.trackTitle = "";
      this.trackArtist = "";
      this.artworkUrl = "";
      this.artworkObjectUrl = "";
      this.buffer = null;
      this.source = null;
      this.startedAt = 0;
      this.startedOffset = 0;
      this.pausedAt = 0;
      this.playbackRate = 1;
      this.duration = 0;
      this.cuePoint = 0;
      this.analysedBpm = null;
      this.rawAnalysedBpm = null;
      this.metadataBpm = null;
      this.tempoSource = "";
      this.tempoCandidates = [];
      this.analysedDownbeat = 0;
      this.analysedKey = "";
      this.analysedKeyName = "";
      this.analysisConfidence = { tempo: 0, key: 0 };
      this.loopActive = false;
      this.loopStart = 0;
      this.loopEnd = 0;
      this.manualLoopStart = null;
      this.waveformPeaks = [];
      this.waveformBands = null;
      this.waveformVersion = "";
      this.libraryItemId = "";
      this.loadTimings = null;
      this.nativeAudio = null;
      this.nativeObjectUrl = "";
      this.nativeBackgroundActive = false;
      this.nativeBackgroundPrimed = false;
      this.nativeShadowActive = false;
      this.isLoaded = false;
      this.isPlaying = false;
      this.isLoading = false;
      this.error = "";
      this.lastAction = "Ready";
    }

    emit() {
      this.engine.emitDeckState(this);
      this.engine.syncTransportTicker();
    }

    clampTime(seconds = 0, leaveStartRoom = false, allowNegative = false) {
      const rawSeconds = Number(seconds);
      const safeSeconds = Number.isFinite(rawSeconds) ? rawSeconds : 0;
      const maxTime = leaveStartRoom && this.duration > 0.02
        ? this.duration - 0.02
        : this.duration || 0;
      const minTime = allowNegative ? -8 : 0;

      return Math.max(minTime, Math.min(safeSeconds, maxTime));
    }

    resolveLoopedTime(seconds = 0) {
      const safeSeconds = this.clampTime(seconds, false, true);
      if (!this.loopActive || this.loopEnd <= this.loopStart || safeSeconds < 0) return safeSeconds;

      const loopLength = Math.max(0.015, this.loopEnd - this.loopStart);
      if (safeSeconds < this.loopEnd) return safeSeconds;
      return this.loopStart + ((safeSeconds - this.loopStart) % loopLength);
    }

    resolveLoopStartOffset(seconds = 0) {
      const safeSeconds = this.clampTime(seconds, true, true);
      if (!this.loopActive || this.loopEnd <= this.loopStart) return safeSeconds;
      if (safeSeconds < this.loopStart) return safeSeconds;
      if (safeSeconds < this.loopEnd) return safeSeconds;
      return this.resolveLoopedTime(safeSeconds);
    }

    getCurrentTimeAtClockTime(
      clockTime = this.context.currentTime
    ) {
      if (!this.isLoaded || !this.buffer) {
        return 0;
      }

      if (
        this.nativeBackgroundActive &&
        this.nativeAudio
      ) {
        return this.resolveLoopedTime(
          this.nativeAudio.currentTime ||
            this.pausedAt
        );
      }

      if (this.isPlaying) {
        const targetClockTime =
          Number.isFinite(Number(clockTime))
            ? Number(clockTime)
            : this.context.currentTime;

        const elapsed =
          Math.max(
            0,
            targetClockTime - this.startedAt
          ) * this.playbackRate;

        return this.resolveLoopedTime(
          this.startedOffset + elapsed
        );
      }

      return this.clampTime(
        this.pausedAt || 0,
        false,
        true
      );
    }

    getCurrentTime() {
      return this.getCurrentTimeAtClockTime(
        this.context.currentTime
      );
    }

    getState() {
      const currentTime = this.getCurrentTime();
      const duration = this.duration || 0;
      const clockTime = this.context.currentTime;

      return {
        deckId: this.deckId,
        clockTime,
        startClockTime: this.startedAt,
        fileName: this.fileName,
        trackTitle: this.trackTitle,
        trackArtist: this.trackArtist,
        artworkUrl: this.artworkUrl,
        duration,
        currentTime,
        cuePoint: this.cuePoint,
        playbackRate: this.playbackRate,
        loop: {
          active: this.loopActive,
          start: this.loopStart,
          end: this.loopEnd,
          duration: Math.max(0, this.loopEnd - this.loopStart),
          manualStart: this.manualLoopStart,
        },
        progress: duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0,
        waveformPeaks: this.waveformPeaks,
        waveformBands: this.waveformBands,
        waveformVersion: this.waveformVersion,
        libraryItemId: this.libraryItemId,
        loadTimings: this.loadTimings
          ? { ...this.loadTimings }
          : null,
        analysis: {
          bpm: this.analysedBpm,
          rawBpm: this.rawAnalysedBpm,
          metadataBpm: this.metadataBpm,
          tempoSource: this.tempoSource,
          tempoCandidates: this.tempoCandidates,
          downbeat: this.analysedDownbeat,
          key: this.analysedKey,
          keyName: this.analysedKeyName,
          confidence: { ...this.analysisConfidence },
        },
        isLoaded: this.isLoaded,
        isPlaying: this.isPlaying,
        isLoading: this.isLoading,
        error: this.error,
        lastAction: this.lastAction,
        gain: this.gainNode.gain.value,
        channelVolume: this.channelVolume,
        crossfadeGain: this.crossfadeGain,
        trimGain: this.trimGain,
        filterValue: this.filterValue,
        eqValues: { ...this.eqValues },
        killStates: { ...this.killStates },
        contextState: this.context.state,
      };
    }
		
    revokeArtworkObjectUrl() {
      if (!this.artworkObjectUrl) return;
      try {
        URL.revokeObjectURL(this.artworkObjectUrl);
      } catch {}
      this.artworkObjectUrl = "";
    }
		
    normaliseBpmValue(value) {
      const raw = Array.isArray(value) ? value[0] : value;
      const bpm = Number.parseFloat(String(raw ?? "").replace(/[^0-9.]/g, ""));
      return bpm >= 40 && bpm <= 260 ? Number(bpm.toFixed(2)) : null;
    }
		
    ensureNativeAudioElement() {
      if (this.nativeAudio) return this.nativeAudio;

      const audio = document.createElement("audio");
      audio.preload = "auto";
      audio.controls = false;
      audio.playsInline = true;
      audio.setAttribute("playsinline", "");
      audio.setAttribute("webkit-playsinline", "");
      audio.dataset.brDjBackgroundDeck = this.deckId;
      audio.dataset.brDjBackgroundReady = "false";
      audio.style.position = "fixed";
      audio.style.width = "1px";
      audio.style.height = "1px";
      audio.style.opacity = "0";
      audio.style.pointerEvents = "none";
      audio.style.left = "-10px";
      audio.style.bottom = "0";
      audio.addEventListener("ended", () => {
        if (!this.nativeBackgroundActive) return;
        this.nativeBackgroundActive = false;
        this.isPlaying = false;
        this.pausedAt = 0;
        this.lastAction = "Ended";
        this.emit();
      });
      document.body?.appendChild(audio);
      this.nativeAudio = audio;
      return audio;
    }

    revokeNativeObjectUrl() {
      if (!this.nativeObjectUrl) return;
      try {
        URL.revokeObjectURL(this.nativeObjectUrl);
      } catch {}
      this.nativeObjectUrl = "";
    }

    prepareNativeBackgroundAudio(file) {
      if (!file) return;
      const audio = this.ensureNativeAudioElement();
      this.revokeNativeObjectUrl();
      this.nativeObjectUrl = URL.createObjectURL(file);
      audio.src = this.nativeObjectUrl;
      audio.currentTime = 0;
      audio.volume = this.getNativeOutputVolume();
      this.nativeBackgroundPrimed = false;
      try { audio.load(); } catch {}
    }

    getNativeOutputVolume() {
      return Math.max(0, Math.min(1, this.channelVolume * this.crossfadeGain * this.engine.masterVolume));
    }

    syncNativeAudioVolume() {
      if (!this.nativeAudio) return;
      this.nativeAudio.volume = this.nativeBackgroundActive ? this.getNativeOutputVolume() : 0;
    }

    stopNativeAudioOnly() {
      if (!this.nativeAudio) return;
      try { this.nativeAudio.pause(); } catch {}
      this.nativeBackgroundActive = false;
      this.nativeShadowActive = false;
    }

    async startNativeAudioAt(seconds = this.pausedAt) {
      if (!this.isLoaded || !this.nativeAudio) return false;
      const audio = this.nativeAudio;
      const safeSeconds = this.clampTime(seconds, true);
      audio.muted = false;
      try {
        audio.currentTime = safeSeconds;
        try { audio.playbackRate = this.playbackRate; } catch {}
        this.nativeBackgroundActive = true;
        this.syncNativeAudioVolume();
        await audio.play();
        this.pausedAt = safeSeconds;
        this.nativeBackgroundPrimed = true;
        this.syncNativeAudioVolume();
        return true;
      } catch (error) {
        this.nativeBackgroundActive = false;
        this.syncNativeAudioVolume();
        return false;
      }
    }

    primeNativeBackgroundAudio(seconds = this.pausedAt) {
      if (!this.nativeAudio || this.nativeBackgroundPrimed || this.nativeBackgroundActive) return;
      try { this.nativeAudio.currentTime = this.clampTime(seconds, true); } catch {}
      this.syncNativeAudioVolume();
      this.nativeBackgroundPrimed = true;
    }

    async startNativeShadowPlayback(seconds = this.pausedAt) {
      if (!this.nativeAudio || !this.isLoaded || this.nativeBackgroundActive) return false;
      const audio = this.nativeAudio;
      const safeSeconds = this.clampTime(seconds, true);
      try { audio.currentTime = safeSeconds; } catch {}
      try { audio.playbackRate = this.playbackRate; } catch {}
      audio.dataset.brDjBackgroundReady = "true";
      audio.muted = true;
      audio.volume = 0;
      try {
        await audio.play();
        this.nativeShadowActive = true;
        this.nativeBackgroundPrimed = true;
        return true;
      } catch {
        this.nativeShadowActive = false;
        return false;
      }
    }

    async enterNativeBackgroundAudio() {
      if (!this.isPlaying || !this.isLoaded || !this.nativeAudio) return false;
      const currentTime = this.getCurrentTime();
      let started = false;

      if (this.nativeShadowActive) {
        try { this.nativeAudio.currentTime = currentTime; } catch {}
        try { this.nativeAudio.playbackRate = this.playbackRate; } catch {}
        this.nativeBackgroundActive = true;
        this.nativeShadowActive = false;
        this.nativeAudio.muted = false;
        this.syncNativeAudioVolume();
        started = true;
      } else {
        started = await this.startNativeAudioAt(currentTime);
      }

      if (!started) {
        this.nativeBackgroundActive = false;
        this.isPlaying = true;
        this.pausedAt = currentTime;
        return false;
      }

      this.nativeBackgroundActive = true;
      this.stopSourceOnly();
      this.isPlaying = true;
      this.pausedAt = currentTime;
      this.lastAction = "Background audio";
      this.emit();
      return true;
    }

    async leaveNativeBackgroundAudio() {
      if (!this.nativeBackgroundActive) return this.getState();
      const currentTime = this.clampTime(this.nativeAudio?.currentTime || this.pausedAt, true);
      if (this.nativeAudio) {
        this.nativeAudio.muted = true;
        this.nativeAudio.volume = 0;
      }
      this.nativeBackgroundActive = false;
      this.nativeShadowActive = Boolean(this.nativeAudio && !this.nativeAudio.paused);
      this.pausedAt = currentTime;
      this.isPlaying = false;
      this.lastAction = "Resume foreground";
      return this.play(currentTime);
    }

    getFallbackMetadata(fileName = "") {
      const cleanedName = String(fileName || "")
        .replace(/\.[^/.]+$/, "")
        .replace(/^\s*\d+\s*[.)_-]?\s*/, "")
        .trim();
      const parts = cleanedName.split(/\s+-\s+/).map((value) => value.trim()).filter(Boolean);

      if (parts.length >= 2) {
        return {
          title: parts.slice(1).join(" - ") || cleanedName || "Loaded audio",
          artist: parts[0] || "Local audio file",
        };
      }

      return {
        title: cleanedName || "Loaded audio",
        artist: "Local audio file",
      };
    }

    async readFileMetadata(file) {
      const fallback = this.getFallbackMetadata(file?.name || "");
      const tagReader = typeof window !== "undefined" ? window.jsmediatags : null;
      if (!file || !tagReader || typeof tagReader.read !== "function") {
        return { ...fallback, artworkUrl: "" };
      }

      return new Promise((resolve) => {
        try {
          tagReader.read(file, {
            onSuccess: ({ tags }) => {
              const nextTitle = String(tags?.title || fallback.title || "Loaded audio").trim() || fallback.title || "Loaded audio";
              const nextArtist = String(tags?.artist || tags?.albumArtist || fallback.artist || "Local audio file").trim() || fallback.artist || "Local audio file";
              const nextBpm = this.normaliseBpmValue(tags?.TBPM || tags?.bpm || tags?.BPM || tags?.tempo);
              let artworkUrl = "";
              const picture = tags?.picture;

              if (picture?.data?.length) {
                try {
                  const bytes = new Uint8Array(picture.data);
                  const blob = new Blob([bytes], { type: picture.format || "image/jpeg" });
                  artworkUrl = URL.createObjectURL(blob);
                } catch {}
              }

              resolve({ title: nextTitle, artist: nextArtist, artworkUrl, bpm: nextBpm });
            },
            onError: () => resolve({ ...fallback, artworkUrl: "" }),
          });
        } catch {
          resolve({ ...fallback, artworkUrl: "" });
        }
      });
    }
		
    buildSpectralWaveform(buffer) {
      const spectral = typeof window !== "undefined" ? window.BRMediaSpectralWaveform : null;

      if (spectral && typeof spectral.analyseAudioBuffer === "function") {
        try {
          const result = spectral.analyseAudioBuffer(buffer, { columns: buffer?.duration > 600 ? 24576 : 16384 });
          if (Array.isArray(result?.peaks) && result.peaks.length) {
            return {
              peaks: result.peaks,
              bands: result.bands || null,
              analysis: result.analysis || null,
              version: result.version || "spectral-v1",
            };
          }
        } catch (error) {
          console.warn("BRMedia spectral waveform fallback", error);
        }
      }

      return {
        peaks: this.buildWaveformPeaks(buffer),
        bands: this.buildWaveformBands(buffer),
        analysis: null,
        version: "fallback-v3d",
      };
    }

    buildWaveformPeaks(buffer, bucketCount = 8192) {
      if (!buffer || !buffer.length || !buffer.numberOfChannels) return [];

      const safeBucketCount = Math.max(256, Math.min(8192, Number(bucketCount) || 8192));
      const channelCount = Math.max(1, buffer.numberOfChannels || 1);
      const sampleCount = buffer.length || 0;
      const samplesPerBucket = Math.max(1, Math.floor(sampleCount / safeBucketCount));
      const peaks = [];

      for (let bucket = 0; bucket < safeBucketCount; bucket += 1) {
        const start = bucket * samplesPerBucket;
        const end = bucket === safeBucketCount - 1
          ? sampleCount
          : Math.min(sampleCount, start + samplesPerBucket);
        let peak = 0;
        let rms = 0;
        let reads = 0;

        for (let channel = 0; channel < channelCount; channel += 1) {
          const data = buffer.getChannelData(channel);
          for (let index = start; index < end; index += 1) {
            const value = Math.abs(data[index] || 0);
            if (value > peak) peak = value;
            rms += value * value;
            reads += 1;
          }
        }

        const rmsValue = Math.sqrt(rms / Math.max(1, reads));
        peaks.push(Number(Math.min(1, (peak * 0.76) + (rmsValue * 0.58)).toFixed(4)));
      }

      return this.smoothWaveformSeries(peaks, 1, 0.72);
    }

    smoothWaveformSeries(values = [], passes = 1, preserve = 0.25) {
      let series = Array.isArray(values) ? values.slice() : [];

      for (let pass = 0; pass < passes; pass += 1) {
        series = series.map((value, index) => {
          const previous = series[Math.max(0, index - 1)] || 0;
          const current = Number(value) || 0;
          const next = series[Math.min(series.length - 1, index + 1)] || 0;
          const smooth = (previous * 0.18) + (current * 0.64) + (next * 0.18);
          return Number(Math.max(current * preserve, smooth).toFixed(4));
        });
      }

      return series;
    }

    buildWaveformBands(buffer, bucketCount = 8192) {
      if (!buffer || !buffer.length || !buffer.numberOfChannels) return null;

      const safeBucketCount = Math.max(256, Math.min(8192, Number(bucketCount) || 8192));
      const channelCount = Math.max(1, buffer.numberOfChannels || 1);
      const sampleRate = Math.max(8000, buffer.sampleRate || 44100);
      const sampleCount = buffer.length || 0;
      const samplesPerBucket = Math.max(1, Math.floor(sampleCount / safeBucketCount));
      const low = [];
      const mid = [];
      const high = [];
      const transient = [];
      const lowCoeff = 1 - Math.exp((-2 * Math.PI * 155) / sampleRate);
      const midCoeff = 1 - Math.exp((-2 * Math.PI * 1450) / sampleRate);
      const highCoeff = 1 - Math.exp((-2 * Math.PI * 5200) / sampleRate);
      const states = Array.from({ length: channelCount }, () => ({ low: 0, mid: 0, high: 0, previousHigh: 0 }));

      for (let bucket = 0; bucket < safeBucketCount; bucket += 1) {
        const start = bucket * samplesPerBucket;
        const end = bucket === safeBucketCount - 1
          ? sampleCount
          : Math.min(sampleCount, start + samplesPerBucket);
        const step = Math.max(1, Math.floor((end - start) / 220));
        let lowEnergy = 0;
        let midEnergy = 0;
        let highEnergy = 0;
        let transientEnergy = 0;
        let reads = 0;

        for (let channel = 0; channel < channelCount; channel += 1) {
          const data = buffer.getChannelData(channel);
          const state = states[channel];

          for (let index = start; index < end; index += step) {
            const value = data[index] || 0;
            state.low += lowCoeff * (value - state.low);
            state.mid += midCoeff * (value - state.mid);
            state.high += highCoeff * (value - state.high);

            const lowSample = state.low;
            const midSample = state.mid - state.low;
            const highSample = value - state.high;
            const transientSample = highSample - state.previousHigh;

            lowEnergy += lowSample * lowSample;
            midEnergy += midSample * midSample;
            highEnergy += highSample * highSample;
            transientEnergy += Math.abs(transientSample);
            state.previousHigh = highSample;
            reads += 1;
          }
        }

        const divisor = Math.max(1, reads);
        low.push(Number(Math.min(1, Math.sqrt(lowEnergy / divisor) * 6.2).toFixed(4)));
        mid.push(Number(Math.min(1, Math.sqrt(midEnergy / divisor) * 8.8).toFixed(4)));
        high.push(Number(Math.min(1, Math.sqrt(highEnergy / divisor) * 12.4).toFixed(4)));
        transient.push(Number(Math.min(1, (transientEnergy / divisor) * 22).toFixed(4)));
      }

      return {
        low: this.smoothWaveformSeries(low, 2, 0.74),
        mid: this.smoothWaveformSeries(mid, 1, 0.76),
        high: this.smoothWaveformSeries(high, 1, 0.78),
        transient: this.smoothWaveformSeries(transient, 1, 0.90),
      };
    }
		
    hasValidLoop() {
      return Boolean(this.loopActive && this.loopEnd > this.loopStart && this.loopEnd - this.loopStart >= 0.015);
    }

    applyLoopToSource(source = this.source) {
      if (!source) return;
      if (!this.hasValidLoop()) {
        source.loop = false;
        return;
      }

      source.loop = true;
      source.loopStart = this.loopStart;
      source.loopEnd = this.loopEnd;
    }

    normaliseLoopRange(startSeconds = 0, endSeconds = 0) {
      const first = this.clampTime(startSeconds, true);
      const second = this.clampTime(endSeconds, true);
      const start = Math.min(first, second);
      const end = Math.max(first, second);
      const safeEnd = Math.min(this.duration || end, Math.max(end, start + 0.015));
      return { start, end: safeEnd };
    }

    async setLoop(startSeconds = 0, endSeconds = 0, label = "Loop") {
      if (!this.isLoaded || !this.buffer) return this.getState();

      const wasPlaying = this.isPlaying;
      const currentTime = this.getCurrentTime();
      const range = this.normaliseLoopRange(startSeconds, endSeconds);
      if (range.end <= range.start) return this.getState();

      this.loopStart = range.start;
      this.loopEnd = range.end;
      this.loopActive = true;
      this.manualLoopStart = null;
      this.lastAction = `${label} ${this.loopStart.toFixed(2)}-${this.loopEnd.toFixed(2)}s`;

      if (wasPlaying) {
        const restartAt = currentTime >= this.loopStart && currentTime < this.loopEnd ? currentTime : this.loopStart;
        this.stopSourceOnly();
        this.stopNativeAudioOnly();
        this.isPlaying = false;
        this.pausedAt = restartAt;
        await this.play(restartAt);
      } else {
        this.pausedAt = this.loopStart;
        this.applyLoopToSource();
        this.emit();
      }

      return this.getState();
    }

    async setAutoLoopBeats(beats = 4, bpm = this.analysedBpm, startSeconds = this.getCurrentTime()) {
      const safeBpm = Math.max(40, Math.min(260, Number(bpm) || Number(this.analysedBpm) || 0));
      if (!safeBpm) {
        this.lastAction = "Analyse BPM before looping";
        this.emit();
        return this.getState();
      }
      const safeBeats = Math.max(1 / 512, Math.min(512, Number(beats) || 4));
      const length = Math.max(0.015, (60 / safeBpm) * safeBeats);
      const safeStart = this.clampTime(startSeconds, true);
      const end = Math.min(this.duration || safeStart + length, safeStart + length);
      const start = end - safeStart < 0.015 ? Math.max(0, end - length) : safeStart;
      return this.setLoop(start, Math.max(start + 0.015, end), "Auto loop");
    }

    async setManualLoopPoint(seconds = this.getCurrentTime()) {
      if (!this.isLoaded || !this.buffer) return this.getState();

      const current = this.clampTime(seconds, true);
      if (this.manualLoopStart == null) {
        this.manualLoopStart = current;
        this.lastAction = `Loop In ${current.toFixed(2)}s`;
        this.emit();
        return this.getState();
      }

      const start = this.manualLoopStart;
      this.manualLoopStart = null;
      return this.setLoop(start, current, "Manual loop");
    }

    clearLoop() {
      this.loopActive = false;
      this.loopStart = 0;
      this.loopEnd = 0;
      this.manualLoopStart = null;
      if (this.source) this.source.loop = false;
      this.lastAction = "Loop cleared";
      this.emit();
      return this.getState();
    }

    stopSourceOnly() {
      if (!this.source) return;

      const oldSource = this.source;
      this.source = null;
      oldSource.onended = null;

      try {
        oldSource.stop(0);
      } catch {}
    }

    async loadFile(file, options = {}) {
      if (!file) {
        return this.getState();
      }

      const loadStartedAt =
        performance.now();

      const onStage =
        typeof options.onStage ===
        "function"
          ? options.onStage
          : () => {};

      const notifyStage = (
        stage,
        detail = {}
      ) => {
        try {
          onStage(stage, {
            ...detail,
            elapsedMs:
              performance.now() -
              loadStartedAt,
          });
        } catch {}
      };

      this.isLoading = true;
      this.error = "";
      this.lastAction = "Loading file";

      this.libraryItemId =
        String(
          options.libraryItemId ||
          ""
        );

      this.loadTimings = null;
      this.emit();

      try {
        await this.engine.unlock();

        this.stopSourceOnly();
        this.stopNativeAudioOnly();
        this.revokeArtworkObjectUrl();
        this.revokeNativeObjectUrl();

        this.isPlaying = false;
        this.pausedAt = 0;
        this.startedOffset = 0;
        this.playbackRate = 1;
        this.cuePoint = 0;
        this.analysedBpm = null;
        this.rawAnalysedBpm = null;
        this.metadataBpm = null;
        this.tempoSource = "";
        this.tempoCandidates = [];
        this.analysedDownbeat = 0;
        this.analysedKey = "";
        this.analysedKeyName = "";

        this.analysisConfidence = {
          tempo: 0,
          key: 0,
        };

        this.loopActive = false;
        this.loopStart = 0;
        this.loopEnd = 0;
        this.manualLoopStart = null;
        this.waveformPeaks = [];
        this.waveformBands = null;
        this.waveformVersion = "";

        notifyStage("metadata");

        const metadataStartedAt =
          performance.now();

        const suppliedMetadata =
          options.metadata &&
          typeof options.metadata ===
            "object"
            ? options.metadata
            : null;

        const metadata =
          suppliedMetadata
            ? {
                title: String(
                  suppliedMetadata.title ||
                  file.name ||
                  "Loaded audio"
                ),
                artist: String(
                  suppliedMetadata.artist ||
                  suppliedMetadata.albumArtist ||
                  "Library audio"
                ),
                artworkUrl: String(
                  suppliedMetadata.artworkUrl ||
                  ""
                ),
                bpm:
                  this.normaliseBpmValue(
                    suppliedMetadata.bpm
                  ),
                key: String(
                  suppliedMetadata.key ||
                  ""
                ),
              }
            : await this.readFileMetadata(
                file
              );

        const metadataMs =
          performance.now() -
          metadataStartedAt;

        notifyStage("read");

        const readStartedAt =
          performance.now();

        const arrayBuffer =
          await file.arrayBuffer();

        const readMs =
          performance.now() -
          readStartedAt;

        notifyStage("decode", {
          bytes:
            arrayBuffer.byteLength,
        });

        const decodeStartedAt =
          performance.now();

        const decoded =
          await this.engine
            .decodeAudioData(
              arrayBuffer
            );

        const decodeMs =
          performance.now() -
          decodeStartedAt;

        this.file = file;

        this.prepareNativeBackgroundAudio(
          file
        );

        this.fileName =
          file.name ||
          "Loaded audio";

        this.trackTitle =
          metadata.title ||
          this.fileName;

        this.trackArtist =
          metadata.artist ||
          "Local audio file";

        this.artworkUrl =
          metadata.artworkUrl ||
          "";

        this.artworkObjectUrl =
          metadata.artworkUrl ||
          "";

        this.buffer = decoded;

        this.duration =
          decoded.duration ||
          0;

        this.cuePoint = 0;

        notifyStage("waveform");

        const waveformStartedAt =
          performance.now();

        const preparedWaveform =
          options.preparedWaveform &&
          typeof options
            .preparedWaveform ===
            "object"
            ? options.preparedWaveform
            : null;

        let waveformSource =
          "browser-analysis";

        let spectralWaveform;

        if (
          Array.isArray(
            preparedWaveform?.peaks
          ) &&
          preparedWaveform.peaks.length
        ) {
          /*
            Use server-prepared waveform data directly.
          */
          spectralWaveform = {
            peaks:
              preparedWaveform.peaks.map(
                (value) =>
                  Number(value || 0)
              ),
            bands:
              preparedWaveform.bands ||
              null,
            analysis:
              preparedWaveform.analysis ||
              null,
            version:
              preparedWaveform.version ||
              "server-prepared-v1",
          };

          waveformSource =
            preparedWaveform.cached ===
            false
              ? "server-generated"
              : "server-cache";
        } else if (
          options.skipBrowserAnalysis
        ) {
          /*
            An unprepared library track is still allowed to load quickly.
            Build only display peaks rather than the expensive full BPM and
            spectral analysis pass.
          */
          spectralWaveform = {
            peaks:
              this.buildWaveformPeaks(
                decoded,
                4096
              ),
            bands:
              this.buildWaveformBands(
                decoded,
                4096
              ),
            analysis:
              options.preparedAnalysis ||
              null,
            version:
              "fast-browser-fallback-v1",
          };

          waveformSource =
            "fast-fallback";
        } else {
          /*
            Direct local File loads retain the existing full analyser.
          */
          spectralWaveform =
            this.buildSpectralWaveform(
              decoded
            );
        }

        const waveformMs =
          performance.now() -
          waveformStartedAt;

        const preparedAnalysis =
          preparedWaveform?.analysis ||
          options.preparedAnalysis ||
          spectralWaveform.analysis ||
          null;

        this.waveformPeaks =
          spectralWaveform.peaks;

        this.waveformBands =
          spectralWaveform.bands;

        this.waveformVersion =
          spectralWaveform.version;

        this.metadataBpm =
          this.normaliseBpmValue(
            metadata.bpm
          );

        this.rawAnalysedBpm =
          preparedAnalysis?.rawBpm ||
          preparedAnalysis?.bpm ||
          null;

        this.analysedBpm =
          this.metadataBpm ||
          preparedAnalysis?.bpm ||
          null;

        this.tempoSource =
          this.metadataBpm
            ? "tag"
            : (
                preparedAnalysis?.tempoSource ||
                preparedAnalysis?.source ||
                "prepared"
              );

        this.tempoCandidates =
          Array.isArray(
            preparedAnalysis
              ?.tempoCandidates
          )
            ? preparedAnalysis
                .tempoCandidates
            : Array.isArray(
                preparedAnalysis
                  ?.candidates
              )
              ? preparedAnalysis
                  .candidates
              : [];

        this.analysedDownbeat =
          Math.max(
            -8,
            Number(
              preparedAnalysis?.downbeat
            ) || 0
          );

        this.analysedKey =
          preparedAnalysis?.key ||
          metadata.key ||
          "";

        this.analysedKeyName =
          preparedAnalysis?.keyName ||
          "";

        this.analysisConfidence = {
          tempo:
            this.metadataBpm
              ? 1
              : Math.max(
                  0,
                  Math.min(
                    1,
                    Number(
                      preparedAnalysis
                        ?.tempoConfidence ??
                      preparedAnalysis
                        ?.confidence
                    ) || 0
                  )
                ),
          key:
            metadata.key
              ? 1
              : Math.max(
                  0,
                  Math.min(
                    1,
                    Number(
                      preparedAnalysis
                        ?.keyConfidence
                    ) || 0
                  )
                ),
        };

        const totalMs =
          performance.now() -
          loadStartedAt;

        this.loadTimings = {
          metadataMs,
          readMs,
          decodeMs,
          waveformMs,
          totalMs,
          bytes:
            arrayBuffer.byteLength,
          waveformSource,
        };

        this.isLoaded = true;
        this.isLoading = false;
        this.lastAction = "Loaded";

        notifyStage(
          "ready",
          this.loadTimings
        );

        this.emit();
        return this.getState();
      } catch (error) {
        this.stopSourceOnly();
        this.stopNativeAudioOnly();
        this.revokeArtworkObjectUrl();
        this.revokeNativeObjectUrl();

        const fallbackMetadata =
          this.getFallbackMetadata(
            file?.name ||
            "Audio load failed"
          );

        this.file = file;

        this.fileName =
          file.name ||
          "Audio load failed";

        this.trackTitle =
          fallbackMetadata.title ||
          this.fileName;

        this.trackArtist =
          fallbackMetadata.artist ||
          "Local audio file";

        this.artworkUrl = "";
        this.buffer = null;
        this.duration = 0;
        this.pausedAt = 0;
        this.startedOffset = 0;
        this.playbackRate = 1;
        this.cuePoint = 0;
        this.analysedBpm = null;
        this.rawAnalysedBpm = null;
        this.metadataBpm = null;
        this.tempoSource = "";
        this.tempoCandidates = [];
        this.analysedDownbeat = 0;
        this.analysedKey = "";
        this.analysedKeyName = "";

        this.analysisConfidence = {
          tempo: 0,
          key: 0,
        };

        this.loopActive = false;
        this.loopStart = 0;
        this.loopEnd = 0;
        this.manualLoopStart = null;
        this.waveformPeaks = [];
        this.waveformBands = null;
        this.waveformVersion = "";

        this.loadTimings = {
          totalMs:
            performance.now() -
            loadStartedAt,
          failed: true,
        };

        this.isLoaded = false;
        this.isPlaying = false;
        this.isLoading = false;

        this.error =
          error?.message ||
          "Could not decode audio file";

        this.lastAction =
          "Load failed";

        notifyStage("error", {
          ...this.loadTimings,
          error: this.error,
        });

        this.emit();
        return this.getState();
      }
    }

    async play(offset = this.pausedAt, options = {}) {
      if (!this.buffer || !this.isLoaded) {
        this.error = "Load an audio file first";
        this.lastAction = "Play blocked";
        this.emit();
        return this.getState();
      }

      await this.engine.unlock();

      if (this.isPlaying) return this.getState();

      const safeOffset =
        this.resolveLoopStartOffset(offset);

      const requestedDelay =
        Number(options?.delaySeconds);

      const requestedStartClockTime =
        Number(options?.startClockTime);

      const contextTime =
        this.context.currentTime;

      /*
        Linked DUO transport supplies one absolute AudioContext start time
        to both decks. Ordinary Quantized Play continues using a delay.
      */
      const scheduledStartAt =
        Number.isFinite(
          requestedStartClockTime
        )
          ? Math.max(
              contextTime,
              requestedStartClockTime
            )
          : contextTime + (
              Number.isFinite(requestedDelay)
                ? Math.max(
                    0,
                    Math.min(2, requestedDelay)
                  )
                : 0
            );

      const delaySeconds = Math.max(
        0,
        scheduledStartAt - contextTime
      );

      /*
        Native background playback cannot be accurately scheduled against
        the Web Audio Master clock, so scheduled starts stay in Web Audio.
      */
      if (
        delaySeconds <= 0 &&
        this.engine.shouldUseNativeBackgroundAudio()
      ) {
        const started = await this.startNativeAudioAt(
          Math.max(0, safeOffset)
        );

        if (started) {
          this.source = null;
          this.startedAt = this.context.currentTime;
          this.startedOffset = safeOffset;
          this.pausedAt = this.startedOffset;
          this.isPlaying = true;
          this.error = "";
          this.lastAction =
            safeOffset > 0
              ? "Background resume"
              : "Background play";

          this.emit();
          return this.getState();
        }
      }

      const source =
        this.context.createBufferSource();

      source.buffer = this.buffer;

      try {
        source.playbackRate.value =
          this.playbackRate;
      } catch {}

      this.applyLoopToSource(source);
      source.connect(this.trimGainNode);

      this.source = source;

      this.startedAt = scheduledStartAt;
      this.startedOffset = safeOffset;
      this.pausedAt = safeOffset;
      this.isPlaying = true;
      this.error = "";

      this.lastAction =
        delaySeconds > 0
          ? `Quantized play in ${delaySeconds.toFixed(3)}s`
          : safeOffset > 0
            ? "Resume"
            : "Play";

      source.onended = () => {
        if (this.source !== source) return;

        this.source = null;
        this.isPlaying = false;
        this.pausedAt = 0;
        this.lastAction = "Ended";
        this.emit();
      };

      try {
        /*
          Negative pre-roll still counts down towards zero, but it now starts
          from the scheduled Master-clock launch time.
        */
        const preRollDelay = Math.max(
          0,
          -safeOffset /
            Math.max(0.01, this.playbackRate)
        );

        source.start(
          scheduledStartAt + preRollDelay,
          Math.max(0, safeOffset)
        );

        if (delaySeconds > 0) {
          window.setTimeout(() => {
            if (
              this.source === source &&
              this.isPlaying
            ) {
              void this.startNativeShadowPlayback(
                Math.max(0, safeOffset)
              );
            }
          }, Math.ceil(delaySeconds * 1000));
        } else {
          void this.startNativeShadowPlayback(
            Math.max(0, safeOffset)
          );
        }
      } catch (error) {
        this.source = null;
        this.isPlaying = false;
        this.error =
          error?.message ||
          "Could not start audio";
        this.lastAction = "Play failed";
      }

      this.emit();
      return this.getState();
    }

    pause() {
      if (!this.isPlaying) return this.getState();

      this.pausedAt = this.getCurrentTime();
      this.stopSourceOnly();
      this.stopNativeAudioOnly();
      this.isPlaying = false;
      this.lastAction = "Paused";
      this.emit();
      return this.getState();
    }
		
    pauseAtClockTime(
      clockTime = this.context.currentTime
    ) {
      if (!this.isPlaying) {
        return this.getState();
      }

      const stopClockTime = Math.max(
        this.context.currentTime,
        Number.isFinite(Number(clockTime))
          ? Number(clockTime)
          : this.context.currentTime
      );

      /*
        Capture the transport position both decks will have at the exact
        shared stop time.
      */
      this.pausedAt =
        this.getCurrentTimeAtClockTime(
          stopClockTime
        );

      this.startedOffset = this.pausedAt;
      this.startedAt = stopClockTime;

      if (this.source) {
        const oldSource = this.source;

        this.source = null;
        oldSource.onended = null;

        try {
          oldSource.stop(stopClockTime);
        } catch {}
      }

      this.stopNativeAudioOnly();
      this.isPlaying = false;
      this.lastAction = "Linked pause";

      this.emit();
      return this.getState();
    }

    stop() {
      this.stopSourceOnly();
      this.stopNativeAudioOnly();
      this.isPlaying = false;
      this.pausedAt = 0;
      this.lastAction = "Stopped";
      this.emit();
      return this.getState();
    }

    async seek(seconds) {
      if (!this.isLoaded || !this.buffer) return this.getState();

      const safeSeconds = this.clampTime(seconds, false, true);
      const wasPlaying = this.isPlaying;

      this.stopSourceOnly();
      this.stopNativeAudioOnly();
      this.isPlaying = false;
      this.pausedAt = safeSeconds;
      this.lastAction = `Seek ${safeSeconds.toFixed(2)}s`;

      if (wasPlaying) {
        await this.play(safeSeconds);
      } else {
        this.emit();
      }

      return this.getState();
    }

    setCuePoint(seconds = this.getCurrentTime()) {
      if (!this.isLoaded || !this.buffer) return this.getState();

      const rawSeconds = Number(seconds);
      const safeSeconds = Number.isFinite(rawSeconds) ? rawSeconds : 0;
      this.cuePoint = Math.max(-8, Math.min(this.duration || 0, safeSeconds));
      this.lastAction = `Cue ${(this.cuePoint).toFixed(2)}s`;
      this.emit();
      return this.getState();
    }

    setPlaybackRate(rate = 1) {
      const rawRate = Number(rate);

      const safeRate = Number.isFinite(rawRate)
        ? Math.max(0.5, Math.min(2, rawRate))
        : 1;

      const contextTime = this.context.currentTime;

      /*
        Preserve a future Quantized Play start while Sync sets or adjusts
        the target playback rate.
      */
      const scheduledStartAt =
        this.isPlaying && this.startedAt > contextTime
          ? this.startedAt
          : null;

      const currentTime = this.getCurrentTime();

      this.playbackRate = safeRate;
      this.startedAt = scheduledStartAt ?? contextTime;
      this.startedOffset = currentTime;
      this.pausedAt = currentTime;

      if (this.source?.playbackRate) {
        try {
          this.source.playbackRate.setTargetAtTime(
            safeRate,
            this.context.currentTime,
            0.018
          );
        } catch {
          this.source.playbackRate.value = safeRate;
        }
      }

      if (this.nativeAudio) {
        try {
          this.nativeAudio.playbackRate = safeRate;
        } catch {}
      }

      this.lastAction =
        `Tempo ${(safeRate * 100).toFixed(1)}%`;

      this.emit();
      return this.getState();
    }

    updateOutputGain() {
      const outputGain = Math.max(0, Math.min(1.4, this.channelVolume * this.crossfadeGain));
      this.gainNode.gain.setTargetAtTime(outputGain, this.context.currentTime, 0.012);
      this.syncNativeAudioVolume();
      return outputGain;
    }

    setChannelVolume(value) {
      this.channelVolume = Math.max(0, Math.min(1, Number(value)));
      this.updateOutputGain();
      this.lastAction = `Volume ${(this.channelVolume * 100).toFixed(0)}%`;
      this.emit();
      return this.getState();
    }

    setCrossfadeGain(value) {
      this.crossfadeGain = Math.max(0, Math.min(1, Number(value)));
      this.updateOutputGain();
      this.emit();
      return this.getState();
    }

    setGain(value) {
      return this.setChannelVolume(value);
    }

    setTrimGain(value = 1) {
      const rawValue = Number(value);
      const safeValue = Number.isFinite(rawValue) ? Math.max(0, Math.min(1.5, rawValue)) : 1;
      this.trimGain = safeValue;
      this.trimGainNode.gain.setTargetAtTime(safeValue, this.context.currentTime, 0.012);
      this.lastAction = `Trim ${(safeValue * 100).toFixed(0)}%`;
      this.emit();
      return this.getState();
    }

    mapEqPercentToDb(value = 100) {
      const rawValue = Number(value);
      const safeValue = Number.isFinite(rawValue) ? Math.max(0, Math.min(150, rawValue)) : 100;
      if (safeValue >= 100) return ((safeValue - 100) / 50) * 6;
      return -((100 - safeValue) / 100) * 24;
    }

    updateEqBand(band = "mid") {
      const safeBand = ["high", "mid", "low"].includes(band) ? band : "mid";
      const nodeMap = {
        high: this.highEqNode,
        mid: this.midEqNode,
        low: this.lowEqNode,
      };
      const node = nodeMap[safeBand];
      const dbValue = this.killStates[safeBand] ? -48 : this.mapEqPercentToDb(this.eqValues[safeBand]);
      node.gain.setTargetAtTime(dbValue, this.context.currentTime, 0.018);
      return dbValue;
    }

    setEq(band = "mid", value = 100) {
      const safeBand = ["high", "mid", "low"].includes(band) ? band : "mid";
      const rawValue = Number(value);
      const safeValue = Number.isFinite(rawValue) ? Math.max(0, Math.min(150, rawValue)) : 100;
      this.eqValues[safeBand] = safeValue;
      this.updateEqBand(safeBand);
      this.lastAction = `${safeBand.toUpperCase()} EQ ${safeValue.toFixed(0)}%`;
      this.emit();
      return this.getState();
    }

    setKill(band = "mid", enabled = false) {
      const safeBand = ["high", "mid", "low"].includes(band) ? band : "mid";
      this.killStates[safeBand] = Boolean(enabled);
      this.updateEqBand(safeBand);
      this.lastAction = `${safeBand.toUpperCase()} kill ${this.killStates[safeBand] ? "on" : "off"}`;
      this.emit();
      return this.getState();
    }

    setFilter(value = 50) {
      const rawValue = Number(value);
      const safeValue = Number.isFinite(rawValue) ? Math.max(0, Math.min(100, rawValue)) : 50;
      this.filterValue = safeValue;

      if (safeValue > 45 && safeValue < 55) {
        this.filterNode.type = "allpass";
        this.filterNode.frequency.setTargetAtTime(1000, this.context.currentTime, 0.018);
        this.filterNode.Q.setTargetAtTime(0.707, this.context.currentTime, 0.018);
      } else if (safeValue <= 45) {
        const amount = (45 - safeValue) / 45;
        const frequency = 22000 * Math.pow(120 / 22000, amount);
        this.filterNode.type = "lowpass";
        this.filterNode.frequency.setTargetAtTime(Math.max(80, frequency), this.context.currentTime, 0.018);
        this.filterNode.Q.setTargetAtTime(0.72 + amount * 8, this.context.currentTime, 0.018);
      } else {
        const amount = (safeValue - 55) / 45;
        const frequency = 20 * Math.pow(12000 / 20, amount);
        this.filterNode.type = "highpass";
        this.filterNode.frequency.setTargetAtTime(Math.min(14000, frequency), this.context.currentTime, 0.018);
        this.filterNode.Q.setTargetAtTime(0.72 + amount * 8, this.context.currentTime, 0.018);
      }

      this.lastAction = `Filter ${safeValue.toFixed(0)}%`;
      this.emit();
      return this.getState();
    }

    getLevel() {
      if (!this.analyserNode || !this.meterData) return 0;
      this.analyserNode.getByteTimeDomainData(this.meterData);

      let sum = 0;
      for (let index = 0; index < this.meterData.length; index += 1) {
        const sample = (this.meterData[index] - 128) / 128;
        sum += sample * sample;
      }

      return Math.max(0, Math.min(1, Math.sqrt(sum / this.meterData.length) * 2.8));
    }
  }

  class BRMediaDjAudioEngineCore {
    constructor() {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) throw new Error("Web Audio API is not supported in this browser");

      this.context = new AudioContextCtor();
      this.masterVolume = 0.95;
      this.crossfaderValue = 50;
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = this.masterVolume;
      this.masterAnalyser = this.context.createAnalyser();
      this.masterAnalyser.fftSize = 1024;
      this.masterMeterData = new Uint8Array(this.masterAnalyser.fftSize);
      this.transportTimer = null;
      this.transportIntervalMs = 250;
      this.backgroundAudioEnabled = true;
      this.nativeBackgroundMode = false;
      this.backgroundRestoreTimer = null;
      this.masterGain.connect(this.masterAnalyser);
      this.masterAnalyser.connect(this.context.destination);
      this.decks = new Map();
      this.bindBackgroundAudioHandlers();
    }

    bindBackgroundAudioHandlers() {
      const sync = () => this.syncBackgroundAudioMode();
      document.addEventListener("visibilitychange", sync);
      window.addEventListener("pagehide", () => this.enableNativeBackgroundAudio("pagehide"));
      window.addEventListener("pageshow", sync);
      window.addEventListener("focus", sync);
      window.addEventListener("blur", sync);
    }

    shouldUseNativeBackgroundAudio() {
      return Boolean(this.backgroundAudioEnabled && document.visibilityState === "hidden");
    }

    shouldUseNativePrimaryAudio() {
      return false;
    }

    getPlayingDecks() {
      return Array.from(this.decks.values()).filter((deck) => deck.isPlaying && deck.isLoaded);
    }

    async enableNativeBackgroundAudio(reason = "hidden") {
      if (!this.backgroundAudioEnabled) return;
      const playingDecks = this.getPlayingDecks();
      if (!playingDecks.length) return;

      const switchedDecks = [];
      for (const deck of playingDecks) {
        const switched = await deck.enterNativeBackgroundAudio();
        if (switched) switchedDecks.push(deck);
      }

      this.nativeBackgroundMode = switchedDecks.length > 0;
      this.updateMediaSession();
      window.dispatchEvent(new CustomEvent("brmedia:dj-background-audio", {
        detail: { active: this.nativeBackgroundMode, reason, decks: switchedDecks.map((deck) => deck.deckId) },
      }));
    }

    async restoreWebAudioFromBackground(reason = "visible") {
      if (!this.nativeBackgroundMode) return;
      this.nativeBackgroundMode = false;
      try { await this.unlock(); } catch {}
      const nativeDecks = Array.from(this.decks.values()).filter((deck) => deck.nativeBackgroundActive);
      await Promise.all(nativeDecks.map((deck) => deck.leaveNativeBackgroundAudio()));
      this.updateMediaSession();
      window.dispatchEvent(new CustomEvent("brmedia:dj-background-audio", {
        detail: { active: false, reason, decks: nativeDecks.map((deck) => deck.deckId) },
      }));
    }

    syncBackgroundAudioMode() {
      window.clearTimeout(this.backgroundRestoreTimer);
      if (this.shouldUseNativeBackgroundAudio()) {
        void this.enableNativeBackgroundAudio("hidden");
        return;
      }
      this.backgroundRestoreTimer = window.setTimeout(() => {
        void this.restoreWebAudioFromBackground("visible");
      }, 120);
    }

    updateMediaSession() {
      if (!("mediaSession" in navigator)) return;
      const playingDeck = this.getPlayingDecks()[0] || Array.from(this.decks.values()).find((deck) => deck.isLoaded);

      try {
        if (!playingDeck) {
          navigator.mediaSession.metadata = null;
          return;
        }

        navigator.mediaSession.metadata = new MediaMetadata({
          title: playingDeck.trackTitle || playingDeck.fileName || "BRMedia DJ Mixer",
          artist: playingDeck.trackArtist || (playingDeck.deckId === "d2" ? "Deck 2" : "Deck 1"),
          album: "BRMedia DJ Mixer",
          artwork: playingDeck.artworkUrl ? [{ src: playingDeck.artworkUrl, sizes: "512x512", type: "image/jpeg" }] : [],
        });
        navigator.mediaSession.playbackState = this.getPlayingDecks().length ? "playing" : "paused";

        navigator.mediaSession.setActionHandler("play", () => {
          const deck = playingDeck || this.getDeck("d1");
          void deck.play(deck.pausedAt || deck.cuePoint || 0);
        });
        navigator.mediaSession.setActionHandler("pause", () => {
          this.getPlayingDecks().forEach((deck) => deck.pause());
        });
        navigator.mediaSession.setActionHandler("seekbackward", () => {
          this.getPlayingDecks().forEach((deck) => void deck.seek(deck.getCurrentTime() - 10));
        });
        navigator.mediaSession.setActionHandler("seekforward", () => {
          this.getPlayingDecks().forEach((deck) => void deck.seek(deck.getCurrentTime() + 10));
        });
      } catch {}
    }

    syncNativeDeckVolumes() {
      this.decks.forEach((deck) => deck.syncNativeAudioVolume());
    }

    async unlock() {
      if (this.context.state === "suspended") {
        await this.context.resume();
      }
      return this.context.state;
    }
		
    decodeAudioData(arrayBuffer) {
      const decodeBuffer = arrayBuffer.slice(0);

      try {
        const promise = this.context.decodeAudioData(decodeBuffer);
        if (promise && typeof promise.then === "function") return promise;
      } catch {}

      return new Promise((resolve, reject) => {
        try {
          this.context.decodeAudioData(
            decodeBuffer,
            (decoded) => resolve(decoded),
            (error) => reject(error || new Error("Could not decode audio file"))
          );
        } catch (error) {
          reject(error);
        }
      });
    }
		
    readAnalyserLevel(analyser, meterData) {
      if (!analyser || !meterData) return 0;
      analyser.getByteTimeDomainData(meterData);

      let sum = 0;
      for (let index = 0; index < meterData.length; index += 1) {
        const sample = (meterData[index] - 128) / 128;
        sum += sample * sample;
      }

      return Math.max(0, Math.min(1, Math.sqrt(sum / meterData.length) * 2.8));
    }
		
    async playDecksTogether(offsets = {}) {
      await this.unlock();

      const deck1 = this.getDeck("d1");
      const deck2 = this.getDeck("d2");

      /*
        Leave a short scheduling window, then give both source nodes the
        same absolute AudioContext time.
      */
      const startClockTime =
        this.context.currentTime + 0.06;

      const [d1, d2] = await Promise.all([
        deck1.play(
          Number.isFinite(Number(offsets.d1))
            ? Number(offsets.d1)
            : deck1.pausedAt,
          { startClockTime }
        ),

        deck2.play(
          Number.isFinite(Number(offsets.d2))
            ? Number(offsets.d2)
            : deck2.pausedAt,
          { startClockTime }
        ),
      ]);

      return {
        d1,
        d2,
        startClockTime,
      };
    }

    pauseDecksTogether() {
      /*
        Both sources are scheduled to stop at exactly this clock time.
      */
      const stopClockTime =
        this.context.currentTime + 0.025;

      return {
        d1: this
          .getDeck("d1")
          .pauseAtClockTime(stopClockTime),

        d2: this
          .getDeck("d2")
          .pauseAtClockTime(stopClockTime),

        stopClockTime,
      };
    }

    setCrossfader(value = 50) {
      const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
      this.crossfaderValue = safeValue;

      const deck1Gain = safeValue <= 50 ? 1 : (100 - safeValue) / 50;
      const deck2Gain = safeValue >= 50 ? 1 : safeValue / 50;

      this.getDeck("d1").setCrossfadeGain(deck1Gain);
      this.getDeck("d2").setCrossfadeGain(deck2Gain);

      this.emitMixerState();
      return this.getMixerState();
    }

    setDeckVolume(deckId, value = 1) {
      const safeDeckId = deckId === "d2" ? "d2" : "d1";
      const safeValue = Math.max(0, Math.min(1, Number(value)));
      const state = this.getDeck(safeDeckId).setChannelVolume(safeValue);
      this.emitMixerState();
      return state;
    }

    setDeckPlaybackRate(deckId, rate = 1) {
      const safeDeckId = deckId === "d2" ? "d2" : "d1";
      return this.getDeck(safeDeckId).setPlaybackRate(rate);
    }

    setMasterVolume(value = 0.95) {
      const rawValue = Number(value);
      this.masterVolume = Number.isFinite(rawValue) ? Math.max(0, Math.min(1.5, rawValue)) : 0.95;
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.context.currentTime, 0.012);
      this.syncNativeDeckVolumes();
      this.emitMixerState();
      return this.getMixerState();
    }

    setDeckTrim(deckId, value = 1) {
      const safeDeckId = deckId === "d2" ? "d2" : "d1";
      const state = this.getDeck(safeDeckId).setTrimGain(value);
      this.emitMixerState();
      return state;
    }

    setDeckFilter(deckId, value = 50) {
      const safeDeckId = deckId === "d2" ? "d2" : "d1";
      const state = this.getDeck(safeDeckId).setFilter(value);
      this.emitMixerState();
      return state;
    }

    setDeckEq(deckId, band = "mid", value = 100) {
      const safeDeckId = deckId === "d2" ? "d2" : "d1";
      const state = this.getDeck(safeDeckId).setEq(band, value);
      this.emitMixerState();
      return state;
    }

    setDeckKill(deckId, band = "mid", enabled = false) {
      const safeDeckId = deckId === "d2" ? "d2" : "d1";
      const state = this.getDeck(safeDeckId).setKill(band, enabled);
      this.emitMixerState();
      return state;
    }

    getMixerLevels() {
      return {
        d1: this.getDeck("d1").getLevel(),
        d2: this.getDeck("d2").getLevel(),
        master: this.readAnalyserLevel(this.masterAnalyser, this.masterMeterData),
      };
    }

    getMixerState() {
      return {
        crossfader: this.crossfaderValue,
        masterVolume: this.masterVolume,
        levels: this.getMixerLevels(),
      };
    }

    emitMixerState() {
      window.dispatchEvent(new CustomEvent("brmedia:dj-mixer-state", {
        detail: this.getMixerState(),
      }));
    }

    getDeck(deckId = "d1") {
      const safeDeckId = deckId === "d2" ? "d2" : "d1";
      if (!this.decks.has(safeDeckId)) {
        this.decks.set(safeDeckId, new DeckEngine(this, safeDeckId));
      }
      return this.decks.get(safeDeckId);
    }

    emitDeckState(deck) {
      this.updateMediaSession();
      window.dispatchEvent(new CustomEvent("brmedia:dj-audio-state", {
        detail: {
          deckId: deck.deckId,
          state: deck.getState(),
        },
      }));
    }

    emitTransportState() {
      Array.from(this.decks.values()).forEach((deck) => {
        if (deck.isPlaying) this.emitDeckState(deck);
      });

      window.dispatchEvent(new CustomEvent("brmedia:dj-transport-state", {
        detail: this.getState(),
      }));

      this.syncTransportTicker();
    }

    syncTransportTicker() {
      const hasPlayingDeck = Array.from(this.decks.values()).some((deck) => deck.isPlaying);

      if (hasPlayingDeck && !this.transportTimer) {
        this.transportTimer = window.setInterval(() => this.emitTransportState(), this.transportIntervalMs);
      }

      if (!hasPlayingDeck && this.transportTimer) {
        window.clearInterval(this.transportTimer);
        this.transportTimer = null;
      }
    }

    getState() {
      return {
        contextState: this.context.state,
        decks: Array.from(this.decks.values()).map((deck) => deck.getState()),
      };
    }
  }

  let engineInstance = null;

  function getEngine() {
    if (!engineInstance) engineInstance = new BRMediaDjAudioEngineCore();
    return engineInstance;
  }

  window.BRMediaDjAudioEngine = {
    getEngine,
    getDeck(deckId) {
      return getEngine().getDeck(deckId);
    },
    playDecksTogether(offsets) {
      return getEngine().playDecksTogether(offsets);
    },

    pauseDecksTogether() {
      return getEngine().pauseDecksTogether();
    },

    setCrossfader(value) {
      return getEngine().setCrossfader(value);
    },
    setDeckVolume(deckId, value) {
      return getEngine().setDeckVolume(deckId, value);
    },
    setDeckPlaybackRate(deckId, rate) {
      return getEngine().setDeckPlaybackRate(deckId, rate);
    },
    setCuePoint(deckId, seconds) {
      return getEngine().getDeck(deckId).setCuePoint(seconds);
    },
    setMasterVolume(value) {
      return getEngine().setMasterVolume(value);
    },
    setDeckTrim(deckId, value) {
      return getEngine().setDeckTrim(deckId, value);
    },
    setDeckFilter(deckId, value) {
      return getEngine().setDeckFilter(deckId, value);
    },
    setDeckEq(deckId, band, value) {
      return getEngine().setDeckEq(deckId, band, value);
    },
    setDeckKill(deckId, band, enabled) {
      return getEngine().setDeckKill(deckId, band, enabled);
    },
    setDeckAutoLoop(deckId, beats, bpm, startSeconds) {
      return getEngine().getDeck(deckId).setAutoLoopBeats(beats, bpm, startSeconds);
    },
    setDeckManualLoop(deckId, seconds) {
      return getEngine().getDeck(deckId).setManualLoopPoint(seconds);
    },
    clearDeckLoop(deckId) {
      return getEngine().getDeck(deckId).clearLoop();
    },
    getMixerLevels() {
      return getEngine().getMixerLevels();
    },
    getState() {
      return getEngine().getState();
    },
    enableBackgroundAudio() {
      return getEngine().enableNativeBackgroundAudio("manual");
    },
  };
})();