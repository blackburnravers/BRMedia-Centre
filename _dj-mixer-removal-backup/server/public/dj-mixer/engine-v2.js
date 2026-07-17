/* BRMedia DJ Engine V2A
   Clean browser-native deck engine.
   Live path: AudioContext + AudioBufferSourceNode + GainNode + BiquadFilterNode + AnalyserNode.
   Optional hooks: MediaRecorder, Web MIDI, File/Blob loading, WaveSurfer detection, FFmpeg.wasm detection.
*/
(function () {
  "use strict";

  const DECKS = ["d1", "d2"];
  const deckLabel = (deck) => deck === "d2" ? "Deck 2" : "Deck 1";
  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
  const nowMs = () => Date.now();

  function makeEmitter() {
    const events = new Map();
    return {
      on(name, handler) {
        if (!events.has(name)) events.set(name, new Set());
        events.get(name).add(handler);
        return () => events.get(name)?.delete(handler);
      },
      emit(name, detail = {}) {
        events.get(name)?.forEach((handler) => {
          try { handler(detail); } catch (err) { console.warn("BRMediaDjEngine event handler failed", name, err); }
        });
        try { window.dispatchEvent(new CustomEvent(`brmedia-dj-engine:${name}`, { detail })); } catch {}
      },
    };
  }

  const emitter = makeEmitter();

  const state = {
    ctx: null,
    masterGain: null,
    masterAnalyser: null,
    recordDestination: null,
    recorder: null,
    recorderChunks: [],
    crossfader: 0.5,
    masterVolume: 1,
    rafId: 0,
    lastTickAt: 0,
    midiAccess: null,
    services: {
      audioContext: false,
      audioBufferSourceNode: false,
      gainNode: false,
      biquadFilterNode: false,
      analyserNode: false,
      mediaRecorder: false,
      webMidi: false,
      fileBlob: false,
      waveSurfer: false,
      canvas2d: false,
      requestAnimationFrame: false,
      ffmpegWasm: false,
    },
    decks: {
      d1: makeDeck("d1"),
      d2: makeDeck("d2"),
    },
  };

  function makeDeck(deck) {
    return {
      deck,
      item: null,
      url: "",
      blobUrl: "",
      buffer: null,
      source: null,
      inputGain: null,
      lowEq: null,
      midEq: null,
      highEq: null,
      deckGain: null,
      crossGain: null,
      analyser: null,
      playing: false,
      loading: false,
      status: "empty",
      error: "",
      duration: 0,
      offset: 0,
      startedAt: 0,
      playbackRate: 1,
      volume: 1,
      eq: { low: 100, mid: 100, high: 100 },
      cue: 0,
      loadStamp: 0,
    };
  }

  function detectServices() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext || null;
    state.services.audioContext = Boolean(AudioContextClass);
    state.services.audioBufferSourceNode = Boolean(AudioContextClass);
    state.services.gainNode = Boolean(AudioContextClass);
    state.services.biquadFilterNode = Boolean(AudioContextClass);
    state.services.analyserNode = Boolean(AudioContextClass);
    state.services.mediaRecorder = Boolean(window.MediaRecorder);
    state.services.webMidi = Boolean(navigator.requestMIDIAccess);
    state.services.fileBlob = Boolean(window.File && window.Blob && window.FileReader);
    state.services.waveSurfer = Boolean(window.WaveSurfer);
    state.services.canvas2d = Boolean(window.CanvasRenderingContext2D);
    state.services.requestAnimationFrame = Boolean(window.requestAnimationFrame);
    state.services.ffmpegWasm = Boolean(window.createFFmpeg || window.FFmpeg?.createFFmpeg || window.FFmpegWASM);
    return { ...state.services };
  }

  function getAudioContextClass() {
    return window.AudioContext || window.webkitAudioContext || null;
  }

  function ensureContext() {
    if (state.ctx) return state.ctx;
    const AudioContextClass = getAudioContextClass();
    if (!AudioContextClass) throw new Error("AudioContext is not available in this browser");

    const ctx = new AudioContextClass();
    state.ctx = ctx;
    state.masterGain = ctx.createGain();
    state.masterAnalyser = ctx.createAnalyser();
    state.recordDestination = ctx.createMediaStreamDestination ? ctx.createMediaStreamDestination() : null;

    state.masterGain.gain.value = state.masterVolume;
    state.masterAnalyser.fftSize = 1024;
    state.masterAnalyser.smoothingTimeConstant = 0.82;

    state.masterGain.connect(state.masterAnalyser);
    state.masterAnalyser.connect(ctx.destination);
    if (state.recordDestination) state.masterGain.connect(state.recordDestination);

    DECKS.forEach(createDeckGraph);
    applyCrossfader();
    detectServices();
    emitter.emit("ready", { services: { ...state.services } });
    return ctx;
  }

  async function resumeContext() {
    const ctx = ensureContext();
    if (ctx.state === "suspended") await ctx.resume();
    return ctx;
  }

  function createDeckGraph(deckName) {
    const ctx = ensureContext();
    const deck = state.decks[deckName];
    if (!deck || deck.inputGain) return deck;

    deck.inputGain = ctx.createGain();
    deck.lowEq = ctx.createBiquadFilter();
    deck.midEq = ctx.createBiquadFilter();
    deck.highEq = ctx.createBiquadFilter();
    deck.deckGain = ctx.createGain();
    deck.crossGain = ctx.createGain();
    deck.analyser = ctx.createAnalyser();

    deck.lowEq.type = "lowshelf";
    deck.lowEq.frequency.value = 250;

    deck.midEq.type = "peaking";
    deck.midEq.frequency.value = 1200;
    deck.midEq.Q.value = 0.8;

    deck.highEq.type = "highshelf";
    deck.highEq.frequency.value = 4200;

    deck.deckGain.gain.value = deck.volume;
    deck.crossGain.gain.value = 1;
    deck.analyser.fftSize = 1024;
    deck.analyser.smoothingTimeConstant = 0.78;

    deck.inputGain
      .connect(deck.lowEq)
      .connect(deck.midEq)
      .connect(deck.highEq)
      .connect(deck.deckGain)
      .connect(deck.crossGain)
      .connect(state.masterGain);

    deck.deckGain.connect(deck.analyser);
    applyDeckEq(deckName);
    return deck;
  }

  function setDeckStatus(deckName, status, extra = {}) {
    const deck = state.decks[deckName];
    if (!deck) return;
    deck.status = status;
    deck.error = extra.error || "";
    emitter.emit("status", { deck: deckName, label: deckLabel(deckName), status, ...extra });
  }

  function stopSource(deck, { keepOffset = true, ended = false } = {}) {
    if (!deck) return;
    if (keepOffset && deck.playing) deck.offset = getCurrentTime(deck.deck);
    deck.playing = false;

    if (deck.source) {
      const source = deck.source;
      deck.source = null;
      try { source.onended = null; } catch {}
      try { source.stop(0); } catch {}
      try { source.disconnect(); } catch {}
    }

    if (ended) {
      deck.offset = 0;
      emitter.emit("ended", { deck: deck.deck, item: deck.item });
    }
  }

  function getCurrentTime(deckName) {
    const deck = state.decks[deckName];
    if (!deck) return 0;

    const duration = Math.max(0, Number(deck.duration || deck.buffer?.duration || 0));
    if (!deck.playing || !state.ctx) return clamp(deck.offset, 0, duration || Number.MAX_SAFE_INTEGER);

    const elapsed = Math.max(0, state.ctx.currentTime - Number(deck.startedAt || 0)) * Number(deck.playbackRate || 1);
    return clamp(Number(deck.offset || 0) + elapsed, 0, duration || Number.MAX_SAFE_INTEGER);
  }

  function getDuration(deckName) {
    const deck = state.decks[deckName];
    return Math.max(0, Number(deck?.duration || deck?.buffer?.duration || deck?.item?.duration || 0));
  }

  async function decodeArrayBuffer(arrayBuffer) {
    const ctx = await resumeContext();
    const copy = arrayBuffer.slice ? arrayBuffer.slice(0) : arrayBuffer;
    return await ctx.decodeAudioData(copy);
  }

  async function fetchTrackArrayBuffer(url) {
    const response = await fetch(url, { credentials: "same-origin", cache: "default" });
    if (!response.ok) throw new Error(`HTTP ${response.status} while loading audio`);
    return await response.arrayBuffer();
  }

  async function loadDeck(deckName, options = {}) {
    const deck = state.decks[deckName];
    if (!deck) throw new Error(`Unknown deck: ${deckName}`);

    const item = options.item || null;
    const url = String(options.url || item?.streamUrl || item?.audioUrl || "").trim();
    const file = options.file || null;
    const stamp = nowMs();

    deck.loadStamp = stamp;
    stopSource(deck, { keepOffset: false });

    deck.item = item;
    deck.url = url;
    deck.buffer = null;
    deck.duration = Number(item?.duration || 0) || 0;
    deck.offset = 0;
    deck.cue = 0;
    deck.loading = true;

    setDeckStatus(deckName, file ? "file reading" : "fetching audio", { item });

    try {
      await resumeContext();

      let arrayBuffer;
      if (file) {
        arrayBuffer = await file.arrayBuffer();
        deck.blobUrl = URL.createObjectURL(file);
      } else {
        if (!url) throw new Error("No deck stream URL");
        arrayBuffer = await fetchTrackArrayBuffer(url);
      }

      if (deck.loadStamp !== stamp) return deck;

      setDeckStatus(deckName, "decoding audio", { item });

      const buffer = await decodeArrayBuffer(arrayBuffer);

      if (deck.loadStamp !== stamp) return deck;

      createDeckGraph(deckName);

      deck.buffer = buffer;
      deck.duration = Number(buffer.duration || item?.duration || 0) || 0;
      deck.offset = 0;
      deck.loading = false;

      setDeckStatus(deckName, "ready", { item, duration: deck.duration });
      emitter.emit("loaded", { deck: deckName, item, duration: deck.duration });
      startClock();

      return deck;
    } catch (err) {
      deck.loading = false;
      deck.error = String(err?.message || err || "load failed");
      setDeckStatus(deckName, "failed", { item, error: deck.error });
      throw err;
    }
  }

  async function loadFileToDeck(deckName, file, item = {}) {
    if (!file) throw new Error("No file supplied");
    return loadDeck(deckName, {
      file,
      item: {
        ...item,
        id: item.id || `file:${file.name}:${file.size}`,
        title: item.title || file.name,
      },
    });
  }

  async function play(deckName, options = {}) {
    const deck = state.decks[deckName];
    if (!deck?.buffer) throw new Error(`${deckLabel(deckName)} has not decoded a track yet`);

    const ctx = await resumeContext();

    createDeckGraph(deckName);
    stopSource(deck, { keepOffset: true });

    const duration = getDuration(deckName);
    const startOffset = clamp(options.offset ?? deck.offset ?? 0, 0, duration || 0);
    const source = ctx.createBufferSource();

    source.buffer = deck.buffer;
    source.playbackRate.value = Number(deck.playbackRate || 1);
    source.connect(deck.inputGain);

    deck.source = source;
    deck.offset = startOffset;
    deck.startedAt = ctx.currentTime;
    deck.playing = true;

    source.onended = () => {
      if (deck.source !== source) return;

      deck.source = null;
      const current = getCurrentTime(deckName);

      if (duration && current >= duration - 0.05) {
        deck.offset = 0;
        deck.playing = false;
        setDeckStatus(deckName, "ended", { item: deck.item });
        emitter.emit("ended", { deck: deckName, item: deck.item });
      }
    };

    source.start(0, startOffset);

    setDeckStatus(deckName, "playing", { item: deck.item });
    emitter.emit("play", { deck: deckName, item: deck.item, position: startOffset });
    startClock();

    return true;
  }

  function pause(deckName) {
    const deck = state.decks[deckName];
    if (!deck) return false;

    const position = getCurrentTime(deckName);

    stopSource(deck, { keepOffset: false });

    deck.offset = position;
    setDeckStatus(deckName, "paused", { item: deck.item, position });
    emitter.emit("pause", { deck: deckName, item: deck.item, position });

    return true;
  }

  function stop(deckName) {
    const deck = state.decks[deckName];
    if (!deck) return false;

    stopSource(deck, { keepOffset: false });
    deck.offset = 0;

    setDeckStatus(deckName, "stopped", { item: deck.item });
    emitter.emit("stop", { deck: deckName, item: deck.item });

    return true;
  }

  function seek(deckName, seconds) {
    const deck = state.decks[deckName];
    if (!deck) return 0;

    const position = clamp(seconds, 0, getDuration(deckName) || Number.MAX_SAFE_INTEGER);
    const wasPlaying = deck.playing;

    if (wasPlaying) {
      deck.offset = position;
      void play(deckName, { offset: position });
    } else {
      deck.offset = position;
    }

    emitter.emit("seek", { deck: deckName, item: deck.item, position });
    startClock();

    return position;
  }

  function cue(deckName, options = {}) {
    const deck = state.decks[deckName];
    if (!deck) return 0;

    const current = getCurrentTime(deckName);

    if (deck.playing) {
      pause(deckName);
      return seek(deckName, Number(deck.cue || 0));
    }

    if (options.set || current > 0.15) deck.cue = current;
    return seek(deckName, Number(deck.cue || 0));
  }

  function setPlaybackRate(deckName, rate) {
    const deck = state.decks[deckName];
    if (!deck) return;

    const nextRate = clamp(rate, 0.25, 4);
    const wasPlaying = deck.playing;
    const position = getCurrentTime(deckName);

    deck.playbackRate = nextRate;
    if (deck.source) deck.source.playbackRate.value = nextRate;

    if (wasPlaying) {
      deck.offset = position;
      deck.startedAt = state.ctx?.currentTime || 0;
    }

    emitter.emit("rate", { deck: deckName, rate: nextRate });
  }

  function eqPercentToDb(percent) {
    const value = clamp(percent, 0, 150);
    if (value <= 0) return -40;
    return clamp((value - 100) / 4.2, -24, 12);
  }

  function applyDeckEq(deckName) {
    const deck = state.decks[deckName];
    if (!deck?.lowEq || !state.ctx) return;

    const now = state.ctx.currentTime;

    deck.lowEq.gain.setTargetAtTime(eqPercentToDb(deck.eq.low), now, 0.012);
    deck.midEq.gain.setTargetAtTime(eqPercentToDb(deck.eq.mid), now, 0.012);
    deck.highEq.gain.setTargetAtTime(eqPercentToDb(deck.eq.high), now, 0.012);
  }

  function setEq(deckName, band, percent) {
    const deck = state.decks[deckName];
    if (!deck) return;

    const key = String(band || "").toLowerCase();
    if (!["low", "mid", "high"].includes(key)) return;

    deck.eq[key] = clamp(percent, 0, 150);
    applyDeckEq(deckName);

    emitter.emit("eq", { deck: deckName, band: key, value: deck.eq[key] });
  }

  function setVolume(deckName, value) {
    const deck = state.decks[deckName];
    if (!deck) return;

    deck.volume = clamp(value, 0, 2);

    if (deck.deckGain && state.ctx) {
      deck.deckGain.gain.setTargetAtTime(deck.volume, state.ctx.currentTime, 0.01);
    }
  }

  function setMasterGain(value) {
    state.masterVolume = clamp(value, 0, 2);

    if (state.masterGain && state.ctx) {
      state.masterGain.gain.setTargetAtTime(state.masterVolume, state.ctx.currentTime, 0.012);
    }
  }

  function getCrossfaderDeckGains(value = state.crossfader) {
    const fade = clamp(value, 0, 1);
    return {
      d1: Math.cos(fade * Math.PI / 2),
      d2: Math.sin(fade * Math.PI / 2),
    };
  }

  function applyCrossfader() {
    const gains = getCrossfaderDeckGains(state.crossfader);

    DECKS.forEach((deckName) => {
      const deck = state.decks[deckName];
      if (deck?.crossGain && state.ctx) {
        deck.crossGain.gain.setTargetAtTime(gains[deckName], state.ctx.currentTime, 0.01);
      }
    });
  }

  function setCrossfader(value) {
    state.crossfader = clamp(value, 0, 1);

    ensureContext();
    applyCrossfader();

    emitter.emit("crossfader", {
      value: state.crossfader,
      gains: getCrossfaderDeckGains(state.crossfader),
    });
  }

  function getAnalyserLevel(analyser) {
    if (!analyser) return 0;

    const data = new Uint8Array(analyser.frequencyBinCount || 512);
    analyser.getByteFrequencyData(data);

    let total = 0;
    for (let i = 0; i < data.length; i += 1) total += data[i];

    return clamp((total / Math.max(1, data.length)) / 255, 0, 1);
  }

  function getMeterLevel(target = "master") {
    if (target === "d1" || target === "d2") return getAnalyserLevel(state.decks[target]?.analyser);
    return getAnalyserLevel(state.masterAnalyser);
  }

  function startClock() {
    if (state.rafId || !window.requestAnimationFrame) return;

    const tick = (time) => {
      state.lastTickAt = time;

      const decks = Object.fromEntries(DECKS.map((deckName) => [deckName, getSnapshot(deckName)]));

      emitter.emit("tick", {
        decks,
        meters: {
          d1: getMeterLevel("d1"),
          d2: getMeterLevel("d2"),
          master: getMeterLevel("master"),
        },
      });

      const anyPlaying = DECKS.some((deckName) => state.decks[deckName].playing);
      state.rafId = anyPlaying ? window.requestAnimationFrame(tick) : 0;
    };

    state.rafId = window.requestAnimationFrame(tick);
  }

  function getSnapshot(deckName) {
    const deck = state.decks[deckName];
    if (!deck) return null;

    return {
      deck: deckName,
      label: deckLabel(deckName),
      item: deck.item,
      url: deck.url,
      playing: Boolean(deck.playing),
      loading: Boolean(deck.loading),
      status: deck.status,
      error: deck.error,
      currentTime: getCurrentTime(deckName),
      duration: getDuration(deckName),
      volume: deck.volume,
      cue: deck.cue,
      services: { ...state.services },
    };
  }

  function isPlaying(deckName) {
    return Boolean(state.decks[deckName]?.playing);
  }

  function getBestRecordingMimeType() {
    if (!window.MediaRecorder) return "";

    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
    ];

    return candidates.find((type) => MediaRecorder.isTypeSupported?.(type)) || "";
  }

  function startRecording(options = {}) {
    ensureContext();

    if (!state.recordDestination || !window.MediaRecorder) {
      throw new Error("MediaRecorder is not available here");
    }

    if (state.recorder?.state === "recording") return state.recorder;

    state.recorderChunks = [];

    const mimeType = options.mimeType || getBestRecordingMimeType();
    const recorder = new MediaRecorder(state.recordDestination.stream, mimeType ? { mimeType } : undefined);

    recorder.ondataavailable = (event) => {
      if (event.data?.size) state.recorderChunks.push(event.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(state.recorderChunks, { type: recorder.mimeType || mimeType || "audio/webm" });
      emitter.emit("recording", { state: "stopped", blob, mimeType: blob.type });
    };

    state.recorder = recorder;
    recorder.start(options.timeslice || 1000);

    emitter.emit("recording", { state: "recording", mimeType: recorder.mimeType || mimeType });

    return recorder;
  }

  function stopRecording() {
    if (state.recorder && state.recorder.state !== "inactive") state.recorder.stop();
  }

  async function initMIDI(options = {}) {
    detectServices();

    if (!navigator.requestMIDIAccess) {
      emitter.emit("midi", { available: false, reason: "Web MIDI not supported" });
      return null;
    }

    state.midiAccess = await navigator.requestMIDIAccess({ sysex: Boolean(options.sysex) });

    state.midiAccess.inputs.forEach((input) => {
      input.onmidimessage = (message) => emitter.emit("midi", { available: true, input, message });
    });

    emitter.emit("midi", {
      available: true,
      inputs: state.midiAccess.inputs.size,
      outputs: state.midiAccess.outputs.size,
    });

    return state.midiAccess;
  }

  function getServices() {
    return detectServices();
  }

  detectServices();

  window.BRMediaDjEngine = {
    version: "2A-web-audio-buffer-engine",
    on: emitter.on,
    init: ensureContext,
    resume: resumeContext,
    getServices,
    getState: () => ({
      services: getServices(),
      decks: {
        d1: getSnapshot("d1"),
        d2: getSnapshot("d2"),
      },
    }),
    loadDeck,
    loadFileToDeck,
    play,
    pause,
    stop,
    cue,
    seek,
    isPlaying,
    getCurrentTime,
    getDuration,
    getSnapshot,
    setVolume,
    setMasterGain,
    setCrossfader,
    setEq,
    setPlaybackRate,
    getMeterLevel,
    startRecording,
    stopRecording,
    initMIDI,
  };
}());