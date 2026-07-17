(function () {
  "use strict";

  const AudioContextClass = () => window.AudioContext || window.webkitAudioContext || null;
  const deckNames = ["d1", "d2"];
  const hotCueSlots = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"];
  const deckLabel = (deck) => deck === "d2" ? "Deck 2" : "Deck 1";
  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
  const stemNames = ["drums", "bass", "harmonic", "vocals"];

  function createDefaultStemLevels() {
    return { drums: 100, bass: 100, harmonic: 100, vocals: 100 };
  }

  function createDefaultStemMutes() {
    return { drums: false, bass: false, harmonic: false, vocals: false };
  }

  function normaliseStemName(stem = "drums") {
    const key = String(stem || "drums").trim().toLowerCase();
    return stemNames.includes(key) ? key : "drums";
  }

  function normaliseStemLevels(raw = {}) {
    const next = createDefaultStemLevels();
    stemNames.forEach((stem) => {
      if (raw?.[stem] !== undefined) next[stem] = clamp(raw[stem], 0, 100);
    });
    return next;
  }

  function normaliseStemMutes(raw = {}) {
    const next = createDefaultStemMutes();
    stemNames.forEach((stem) => {
      next[stem] = Boolean(raw?.[stem]);
    });
    return next;
  }

  function getStemOutputGain(deck) {
    const stems = normaliseStemLevels(deck?.stems);
    const mutes = normaliseStemMutes(deck?.stemMutes);
    const total = stemNames.reduce((sum, stem) => sum + (mutes[stem] ? 0 : clamp(stems[stem], 0, 100) / 100), 0);
    const average = clamp(total / stemNames.length, 0, 1);
    return Number(Math.pow(average, 1.15).toFixed(5));
  }

  function getStemBaseGain(stem) {
    return ({ drums: 0.82, bass: 0.98, harmonic: 0.74, vocals: 0.68 })[stem] || 0.75;
  }

  function configureStemFilter(filter, stem) {
    if (!filter) return;

    if (stem === "bass") {
      filter.type = "lowpass";
      filter.frequency.value = 230;
      filter.Q.value = 0.78;
      return;
    }

    if (stem === "drums") {
      filter.type = "highpass";
      filter.frequency.value = 150;
      filter.Q.value = 0.92;
      return;
    }

    if (stem === "vocals") {
      filter.type = "bandpass";
      filter.frequency.value = 2100;
      filter.Q.value = 0.82;
      return;
    }

    filter.type = "bandpass";
    filter.frequency.value = 720;
    filter.Q.value = 0.58;
  }

  function createEmptyHotCues() {
    return hotCueSlots.reduce((map, slot) => {
      map[slot] = { slot, time: null, set: false };
      return map;
    }, {});
  }

  function normaliseHotCueSlot(slot = "A") {
    const key = String(slot || "A").trim().toUpperCase().slice(0, 1);
    return hotCueSlots.includes(key) ? key : "A";
  }

  function normaliseHotCues(raw = {}) {
    const next = createEmptyHotCues();
    hotCueSlots.forEach((slot) => {
      const cue = raw?.[slot] || raw?.[slot.toLowerCase()] || null;
      const time = Number(cue?.time);
      if (cue?.set && Number.isFinite(time)) next[slot] = { slot, time, set: true };
    });
    return next;
  }

  function getHotCueSnapshot(raw = {}) {
    const hotCues = normaliseHotCues(raw);
    return hotCueSlots.reduce((map, slot) => {
      map[slot] = { ...hotCues[slot] };
      return map;
    }, {});
  }

  const createEmptyMemoryCues = createEmptyHotCues;
  const normaliseMemoryCueSlot = normaliseHotCueSlot;

  function normaliseMemoryCues(raw = {}) {
    return normaliseHotCues(raw);
  }

  function getMemoryCueSnapshot(raw = {}) {
    return getHotCueSnapshot(raw);
  }

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
          try { handler(detail); } catch (err) { console.warn("DJ V1B event handler failed", name, err); }
        });
      },
    };
  }

  const emitter = makeEmitter();

  const state = {
    ctx: null,
    masterGain: null,
    masterAnalyser: null,
    raf: 0,
    crossfader: 0.5,
    masterVolume: 1,
    masterDeckMode: "auto",
    decks: {
      d1: makeDeck("d1"),
      d2: makeDeck("d2"),
    },
  };

  function makeDeck(deck) {
    return {
      deck,
      fileName: "",
      libraryItem: null,
      buffer: null,
      source: null,
      mediaElement: null,
      mediaSource: null,
      activeSources: new Set(),
      mediaUrl: "",
      sourceGain: null,
      inputGain: null,
      transportGain: null,
      outputGain: null,
      stemInput: null,
      stemSumGain: null,
      stemNodes: null,
      filterNode: null,
      lowEq: null,
      midEq: null,
      highEq: null,
      deckGain: null,
      crossGain: null,
      analyser: null,
      volume: 0.88,
      gain: 100,
      filter: 0,
      eq: { low: 100, mid: 100, high: 100 },
      stems: createDefaultStemLevels(),
      stemMutes: createDefaultStemMutes(),
      sourceBpm: 0,
      detectedBpm: 0,
      targetBpm: 0,
      playbackRate: 1,
      syncEnabled: false,
      quantize: true,
      masterTempo: true,
      keySync: false,
      syncMode: "beat",
      downbeat: 0,
      beatInterval: 0,
      gridOffset: 0,
      gridConfidence: 0,
      gridLocked: false,
      analysisKey: "",
      analysisCached: false,
      analysisVersion: 7,
      analysisStatus: "empty",
      cuePoint: null,
      cueSet: false,
      hotCues: createEmptyHotCues(),
      memoryCues: createEmptyMemoryCues(),
      loop: { active: false, mode: "auto", in: null, out: null, sizeBeats: 8 },
      peaks: [],
      duration: 0,
      offset: 0,
      startedAt: 0,
      playing: false,
      loading: false,
      status: "Empty",
      error: "",
    };
  }
	
  function normaliseDeckLibraryItem(meta = {}, file = null) {
    const item = meta?.item && typeof meta.item === "object" ? meta.item : meta;
    const id = String(item?.id || item?.libraryId || item?.trackId || "").trim();
    const title = String(item?.title || item?.name || "").trim();
    const artist = String(item?.artist || item?.albumArtist || "").trim();
    const artwork = String(item?.artwork || item?.artworkUrl || item?.cover || item?.coverUrl || item?.image || "").trim();
    const locator = String(item?.locator || item?.path || "").trim();
    const duration = Number(item?.duration || 0);
    const analysis = item?.analysis && typeof item.analysis === "object" ? item.analysis : meta?.analysis && typeof meta.analysis === "object" ? meta.analysis : {};
    const grid = item?.grid && typeof item.grid === "object" ? item.grid : meta?.grid && typeof meta.grid === "object" ? meta.grid : {};

    if (!id && !title && !artist && !artwork && !locator && !duration) return null;

    return {
      id,
      title: title || String(file?.name || "").replace(/\.[a-z0-9]{2,5}$/i, "") || "Unknown title",
      artist: artist || "Unknown artist",
      artwork,
      locator,
      duration: Number.isFinite(duration) && duration > 0 ? duration : Number(file?.duration || 0),
      analysisReady: Boolean(analysis?.status === "ready" || analysis?.beatInterval || analysis?.bpm || analysis?.detectedBpm),
      gridReady: Boolean(grid?.ready || analysis?.beatInterval || analysis?.bpm || analysis?.detectedBpm),
      analysis: { ...analysis },
      grid: { ...grid },
      loadedAt: Date.now(),
    };
  }

  function ensureContext() {
    if (state.ctx) return state.ctx;
    const Ctor = AudioContextClass();
    if (!Ctor) throw new Error("AudioContext is not available in this browser");

    const ctx = new Ctor();
    state.ctx = ctx;
    state.masterGain = ctx.createGain();
    state.masterAnalyser = ctx.createAnalyser();
    state.masterGain.gain.value = state.masterVolume;
    state.masterAnalyser.fftSize = 1024;
    state.masterAnalyser.smoothingTimeConstant = 0.78;
    state.masterGain.connect(state.masterAnalyser);
    state.masterAnalyser.connect(ctx.destination);

    deckNames.forEach(createDeckGraph);
    emitState("AudioContext ready");
    return ctx;
  }

  async function resumeContext() {
    const ctx = ensureContext();
    if (ctx.state === "suspended") await ctx.resume();
    return ctx;
  }
	
  function ensureDeckSourceGain(deckName) {
    const deck = state.decks[deckName];
    if (!deck || !state.ctx || !deck.inputGain) return null;
    if (deck.sourceGain) return deck.sourceGain;
    deck.sourceGain = state.ctx.createGain();
    deck.sourceGain.gain.value = 1;
    deck.sourceGain.connect(deck.inputGain);
    return deck.sourceGain;
  }

  function resetDeckSourceGain(deckName) {
    const deck = state.decks[deckName];
    if (!deck || !state.ctx || !deck.inputGain) return null;
    if (deck.sourceGain) {
      try { deck.sourceGain.disconnect(); } catch {}
    }
    deck.sourceGain = state.ctx.createGain();
    deck.sourceGain.gain.value = 1;
    deck.sourceGain.connect(deck.inputGain);
    return deck.sourceGain;
  }

  function ensureDeckTransportGate(deckName) {
    const deck = state.decks[deckName];
    if (!deck || !state.ctx || !deck.inputGain) return null;
    if (deck.transportGain) return deck.transportGain;
    deck.transportGain = state.ctx.createGain();
    deck.transportGain.gain.value = 1;
    return deck.transportGain;
  }

  function ensureDeckOutputGate(deckName) {
    const deck = state.decks[deckName];
    if (!deck || !state.ctx || !state.masterGain || !deck.crossGain) return null;

    if (!deck.outputGain) {
      deck.outputGain = state.ctx.createGain();
      deck.outputGain.gain.value = deck.playing ? 1 : 0;
    }

    try { deck.crossGain.disconnect(state.masterGain); } catch {}
    try { deck.crossGain.disconnect(deck.outputGain); } catch {}
    try { deck.outputGain.disconnect(state.masterGain); } catch {}

    deck.crossGain.connect(deck.outputGain);
    deck.outputGain.connect(state.masterGain);

    return deck.outputGain;
  }

  function silenceDeckOutput(deckName) {
    const deck = state.decks[deckName];
    if (!deck || !state.ctx) return;
    const now = state.ctx.currentTime;
    ensureDeckOutputGate(deckName);

    if (deck.outputGain?.gain) {
      try { deck.outputGain.gain.cancelScheduledValues(now); } catch {}
      try { deck.outputGain.gain.setValueAtTime(0, now); } catch { deck.outputGain.gain.value = 0; }
    }
  }

  function restoreDeckOutput(deckName) {
    const deck = state.decks[deckName];
    if (!deck || !state.ctx) return;
    const now = state.ctx.currentTime;
    ensureDeckOutputGate(deckName);

    if (deck.outputGain?.gain) {
      try { deck.outputGain.gain.cancelScheduledValues(now); } catch {}
      try { deck.outputGain.gain.setValueAtTime(1, now); } catch { deck.outputGain.gain.value = 1; }
    }
  }

  function suspendContextIfNoDecksPlaying() {
    const ctx = state.ctx;
    if (!ctx) return;

    const anyPlaying = deckNames.some((deckName) => state.decks[deckName]?.playing);
    if (anyPlaying) return;

    deckNames.forEach((deckName) => {
      const deck = state.decks[deckName];
      if (!deck) return;
      try { silenceDeckInput(deckName); } catch {}
      try { silenceDeckOutput(deckName); } catch {}
      try { stopAllDeckSources(deck); } catch {}
    });

    try { state.masterGain?.disconnect?.(); } catch {}
    try { state.masterAnalyser?.disconnect?.(); } catch {}

    if (state.raf && window.cancelAnimationFrame) {
      try { window.cancelAnimationFrame(state.raf); } catch {}
    }
    state.raf = 0;

    deckNames.forEach((deckName) => {
      const deck = state.decks[deckName];
      if (!deck) return;

      deck.source = null;
      deck.activeSources = new Set();
      deck.sourceGain = null;
      deck.inputGain = null;
      deck.transportGain = null;
      deck.outputGain = null;
      deck.stemInput = null;
      deck.stemSumGain = null;
      deck.stemNodes = null;
      deck.filterNode = null;
      deck.lowEq = null;
      deck.midEq = null;
      deck.highEq = null;
      deck.deckGain = null;
      deck.crossGain = null;
      deck.analyser = null;
      deck.mediaSource = null;
    });

    state.ctx = null;
    state.masterGain = null;
    state.masterAnalyser = null;

    if (ctx.state !== "closed") {
      try { ctx.close().catch(() => {}); } catch {}
    }
  }
			
  function silenceDeckInput(deckName) {
    const deck = state.decks[deckName];
    if (!deck || !state.ctx) return;
    const now = state.ctx.currentTime;
    ensureDeckTransportGate(deckName);

    if (deck.transportGain?.gain) {
      try { deck.transportGain.gain.cancelScheduledValues(now); } catch {}
      try { deck.transportGain.gain.setValueAtTime(0, now); } catch { deck.transportGain.gain.value = 0; }
    }
  }

  function restoreDeckInput(deckName) {
    const deck = state.decks[deckName];
    if (!deck || !state.ctx) return;
    const now = state.ctx.currentTime;
    ensureDeckSourceGain(deckName);
    ensureDeckTransportGate(deckName);

    if (deck.sourceGain?.gain) {
      try { deck.sourceGain.gain.cancelScheduledValues(now); } catch {}
      try { deck.sourceGain.gain.setValueAtTime(1, now); } catch { deck.sourceGain.gain.value = 1; }
    }

    if (deck.inputGain?.gain) {
      const target = clamp(deck.gain, 0, 150) / 100;
      try { deck.inputGain.gain.cancelScheduledValues(now); } catch {}
      try { deck.inputGain.gain.setValueAtTime(target, now); } catch { deck.inputGain.gain.value = target; }
    }

    if (deck.transportGain?.gain) {
      try { deck.transportGain.gain.cancelScheduledValues(now); } catch {}
      try { deck.transportGain.gain.setValueAtTime(1, now); } catch { deck.transportGain.gain.value = 1; }
    }
  }

  function createDeckGraph(deckName) {
    const deck = state.decks[deckName];
    if (!deck || !state.ctx || !state.masterGain) return deck;
    if (deck.inputGain) {
      ensureDeckSourceGain(deckName);
      ensureDeckTransportGate(deckName);
      ensureDeckOutputGate(deckName);
      createDeckStemBus(deckName);
      return deck;
    }

    const ctx = state.ctx;
    deck.sourceGain = ctx.createGain();
    deck.inputGain = ctx.createGain();
    deck.transportGain = ctx.createGain();
    deck.outputGain = ctx.createGain();
    deck.filterNode = ctx.createBiquadFilter();
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
    deck.midEq.Q.value = 0.9;

    deck.highEq.type = "highshelf";
    deck.highEq.frequency.value = 4200;

    deck.filterNode.type = "allpass";
    deck.filterNode.frequency.value = 20000;
    deck.sourceGain.gain.value = 1;
    deck.inputGain.gain.value = deck.gain / 100;
    deck.transportGain.gain.value = 1;
    deck.outputGain.gain.value = 0;
    deck.sourceGain.connect(deck.inputGain);
    deck.deckGain.gain.value = deck.volume;
    deck.crossGain.gain.value = getCrossfaderDeckGains()[deckName];
    deck.analyser.fftSize = 1024;
    deck.analyser.smoothingTimeConstant = 0.78;

    createDeckStemBus(deckName);
    deck.filterNode
      .connect(deck.lowEq)
      .connect(deck.midEq)
      .connect(deck.highEq)
      .connect(deck.deckGain);
    deck.deckGain.connect(deck.analyser);
    deck.deckGain.connect(deck.crossGain);
    deck.crossGain.connect(deck.outputGain);
    deck.outputGain.connect(state.masterGain);

    applyDeckTone(deckName);
    applyDeckEq(deckName);
    return deck;
  }
	
  function createDeckStemBus(deckName) {
    const deck = state.decks[deckName];
    if (!deck || !state.ctx || !deck.inputGain || !deck.filterNode || deck.stemInput) return;

    const ctx = state.ctx;
    deck.stemInput = ctx.createGain();
    deck.stemSumGain = ctx.createGain();
    deck.stemNodes = {};

    ensureDeckTransportGate(deckName);
    try { deck.inputGain.disconnect(deck.stemInput); } catch {}
    try { deck.inputGain.disconnect(deck.transportGain); } catch {}
    deck.inputGain.connect(deck.transportGain);
    deck.transportGain.connect(deck.stemInput);

    stemNames.forEach((stem) => {
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      configureStemFilter(filter, stem);
      filter.connect(gain);
      gain.connect(deck.stemSumGain);
      deck.stemInput.connect(filter);
      deck.stemNodes[stem] = { filter, gain };
    });

    deck.stemSumGain.connect(deck.filterNode);
    applyDeckStems(deckName, true);
  }

  function applyDeckStems(deckName, instant = false) {
    const deck = state.decks[deckName];
    if (!deck || !state.ctx || !deck.stemNodes) return;

    const now = state.ctx.currentTime;
    const levels = normaliseStemLevels(deck.stems);
    const mutes = normaliseStemMutes(deck.stemMutes);

    stemNames.forEach((stem) => {
      const node = deck.stemNodes?.[stem];
      if (!node?.gain) return;
      const target = mutes[stem] ? 0 : getStemBaseGain(stem) * (clamp(levels[stem], 0, 100) / 100);
      node.gain.gain.setTargetAtTime(target, now, instant ? 0.001 : 0.01);
    });
  }

  function attachDeckMediaElement(deckName) {
    const deck = state.decks[deckName];
    if (!deck?.mediaElement || !state.ctx || !deck.inputGain || deck.mediaSource) return;

    try {
      deck.mediaSource = state.ctx.createMediaElementSource(deck.mediaElement);
      deck.mediaSource.connect(deck.inputGain);
    } catch (err) {
      console.warn("DJ media element source failed", deckName, err);
    }
  }

  function releaseDeckMedia(deck) {
    if (!deck) return;

    if (deck.mediaElement) {
      try { deck.mediaElement.pause(); } catch {}
      try { deck.mediaElement.removeAttribute("src"); deck.mediaElement.load(); } catch {}
    }

    if (deck.mediaSource) {
      try { deck.mediaSource.disconnect(); } catch {}
    }

    if (deck.mediaUrl) {
      try { URL.revokeObjectURL(deck.mediaUrl); } catch {}
    }

    deck.mediaElement = null;
    deck.mediaSource = null;
    deck.mediaUrl = "";
  }
	
  function disconnectDeckNode(node) {
    if (!node) return;
    try { node.disconnect(); } catch {}
  }

  function resetDeckAudioGraph(deckName, outputOpen = false) {
    const deck = state.decks[deckName];
    if (!deck || !state.ctx || !state.masterGain) return deck;

    disconnectDeckNode(deck.sourceGain);
    disconnectDeckNode(deck.inputGain);
    disconnectDeckNode(deck.transportGain);
    disconnectDeckNode(deck.stemInput);
    disconnectDeckNode(deck.stemSumGain);

    if (deck.stemNodes && typeof deck.stemNodes === "object") {
      Object.values(deck.stemNodes).forEach((node) => {
        disconnectDeckNode(node?.filter);
        disconnectDeckNode(node?.gain);
      });
    }

    disconnectDeckNode(deck.filterNode);
    disconnectDeckNode(deck.lowEq);
    disconnectDeckNode(deck.midEq);
    disconnectDeckNode(deck.highEq);
    disconnectDeckNode(deck.deckGain);
    disconnectDeckNode(deck.crossGain);
    disconnectDeckNode(deck.outputGain);
    disconnectDeckNode(deck.analyser);

    deck.sourceGain = null;
    deck.inputGain = null;
    deck.transportGain = null;
    deck.outputGain = null;
    deck.stemInput = null;
    deck.stemSumGain = null;
    deck.stemNodes = null;
    deck.filterNode = null;
    deck.lowEq = null;
    deck.midEq = null;
    deck.highEq = null;
    deck.deckGain = null;
    deck.crossGain = null;
    deck.analyser = null;

    createDeckGraph(deckName);
    if (deck.outputGain?.gain) deck.outputGain.gain.value = outputOpen ? 1 : 0;
    return deck;
  }

  function applyDeckTone(deckName) {
    const deck = state.decks[deckName];
    if (!deck || !state.ctx) return;

    const now = state.ctx.currentTime;

    if (deck.inputGain) {
      deck.inputGain.gain.setTargetAtTime(clamp(deck.gain, 0, 150) / 100, now, 0.01);
    }

    if (deck.filterNode) {
      const filter = clamp(deck.filter, -100, 100);
      const amount = Math.abs(filter) / 100;

      if (amount < 0.01) {
        deck.filterNode.type = "allpass";
        deck.filterNode.frequency.setTargetAtTime(20000, now, 0.012);
        deck.filterNode.Q.setTargetAtTime(0.707, now, 0.012);
        return;
      }

      if (filter < 0) {
        deck.filterNode.type = "lowpass";
        deck.filterNode.frequency.setTargetAtTime(18000 - (amount * 17680), now, 0.012);
      } else {
        deck.filterNode.type = "highpass";
        deck.filterNode.frequency.setTargetAtTime(24 + (amount * 4200), now, 0.012);
      }

      deck.filterNode.Q.setTargetAtTime(0.78 + (amount * 4.2), now, 0.012);
    }
  }

  function eqPercentToDb(value) {
    const percent = clamp(value, 0, 150);
    if (percent <= 0) return -36;
    return clamp((percent - 100) / 4.2, -24, 12);
  }

  function applyDeckEq(deckName) {
    const deck = state.decks[deckName];
    if (!deck || !state.ctx || !deck.lowEq || !deck.midEq || !deck.highEq) return;

    const now = state.ctx.currentTime;
    deck.lowEq.gain.setTargetAtTime(eqPercentToDb(deck.eq.low), now, 0.012);
    deck.midEq.gain.setTargetAtTime(eqPercentToDb(deck.eq.mid), now, 0.012);
    deck.highEq.gain.setTargetAtTime(eqPercentToDb(deck.eq.high), now, 0.012);
  }

  function getCrossfaderDeckGains(value = state.crossfader) {
    const fade = clamp(value, 0, 1);
    return {
      d1: fade <= 0.5 ? 1 : clamp(1 - ((fade - 0.5) * 2), 0, 1),
      d2: fade >= 0.5 ? 1 : clamp(fade * 2, 0, 1),
    };
  }
	
  function normaliseBpm(bpm) {
    let value = Number(bpm || 0);
    if (!Number.isFinite(value) || value <= 0) return 0;

    while (value < 125) value *= 2;
    while (value > 220) value /= 2;

    return Number(value.toFixed(2));
  }
	
  function preferHardcoreBpmCandidate(candidates = [], best = null) {
    if (!best) return null;

    const fast = candidates
      .filter((candidate) => candidate.bpm >= 150 && candidate.bpm <= 220)
      .sort((a, b) => b.score - a.score)[0];

    if (!fast) return best;
    if (best.bpm >= 150 && best.bpm <= 220) return best;

    // Hardcore/dance material often gets misread around 128–140.
    // If a strong 150–220 candidate exists, prefer it for BRMedia DJ use.
    if (best.bpm >= 125 && best.bpm < 145 && fast.score >= best.score * 0.48) return fast;
    if (fast.score >= best.score * 0.58) return fast;

    return best;
  }

  function normaliseGridBpm(bpm) {
    const value = Number(bpm || 0);
    if (!Number.isFinite(value) || value <= 0) return 0;
    return Number(clamp(value, 40, 260).toFixed(2));
  }

  function beatIntervalFromBpm(bpm) {
    const value = Number(bpm || 0);
    return value > 0 ? Number((60 / value).toFixed(9)) : 0;
  }

  function makeAnalysisKey(file = null) {
    if (!file) return "";
    return [
      "v2l",
      String(file.name || "unknown").toLowerCase(),
      Number(file.size || 0),
      Number(file.lastModified || 0),
    ].join("|");
  }

  const analysisBuild = "v2v-bpm-stems";

  function readAnalysisCache(key) {
    if (!key || typeof window === "undefined" || !window.localStorage) return null;

    try {
      const raw = window.localStorage.getItem(`brmedia:dj-analysis:${key}`);
      if (!raw) return null;
      const cached = JSON.parse(raw);
      if (cached?.version !== 7) return null;
      return cached;
    } catch {
      return null;
    }
  }

  function writeAnalysisCache(key, analysis) {
    if (!key || !analysis || typeof window === "undefined" || !window.localStorage) return;

    try {
      window.localStorage.setItem(`brmedia:dj-analysis:${key}`, JSON.stringify({
        ...analysis,
        analysisBuild,
        version: 7,
        savedAt: Date.now(),
      }));
    } catch {
      // Cache failure must never block deck loading.
    }
  }

  function estimateDownbeatFromBuffer(buffer, bpm) {
    if (!buffer || !bpm || !buffer.numberOfChannels) return 0;

    const sampleRate = buffer.sampleRate || 44100;
    const channel = buffer.getChannelData(0);
    const beatSamples = Math.max(1, Math.round((60 / bpm) * sampleRate));
    const searchSamples = Math.min(channel.length, beatSamples * 8);
    let bestSample = 0;
    let bestEnergy = 0;

    for (let pos = 0; pos < searchSamples; pos += Math.max(64, Math.floor(beatSamples / 24))) {
      let energy = 0;
      const end = Math.min(channel.length, pos + Math.floor(beatSamples / 8));
      for (let i = pos; i < end; i += 1) energy += Math.abs(channel[i] || 0);
      if (energy > bestEnergy) {
        bestEnergy = energy;
        bestSample = pos;
      }
    }

    return Number((bestSample / sampleRate).toFixed(4));
  }

  function buildDeckAnalysis(buffer, file, cached = null) {
    const duration = Number(buffer?.duration || 0);
    const cachedDuration = Number(cached?.duration || 0);

    if (cached && cached.analysisBuild === analysisBuild && Math.abs(cachedDuration - duration) < 0.25 && Array.isArray(cached.peaks)) {
      return { ...cached, cached: true, status: "cached" };
    }

    const detectedBpm = estimateBpmFromBuffer(buffer);
    const bpm = normaliseBpm(detectedBpm);
    const beatInterval = beatIntervalFromBpm(bpm);
    const downbeat = bpm ? estimateDownbeatFromBuffer(buffer, bpm) : 0;
    const confidence = bpm ? 0.58 : 0;
    const peaks = buildWaveformPeaks(buffer);

    return {
      version: 6,
      cached: false,
      status: bpm ? "ready" : "needs-grid",
      fileName: file?.name || "",
      fileSize: Number(file?.size || 0),
      duration,
      detectedBpm,
      bpm,
      sourceBpm: bpm,
      beatInterval,
      downbeat: Number.isFinite(Number(cached?.downbeat)) ? Number(cached.downbeat) : downbeat,
      suggestedDownbeat: downbeat,
      gridOffset: Number.isFinite(Number(cached?.gridOffset)) ? Number(cached.gridOffset) : downbeat,
      gridConfidence: Number.isFinite(Number(cached?.gridConfidence)) ? Number(cached.gridConfidence) : confidence,
      gridLocked: Boolean(cached?.gridLocked),
      cuePoint: cached?.cueSet ? Number(cached.cuePoint || 0) : null,
      cueSet: Boolean(cached?.cueSet),
      hotCues: normaliseHotCues(cached?.hotCues),
      memoryCues: normaliseMemoryCues(cached?.memoryCues),
      peaks,
    };
  }

  function applyDeckAnalysis(deckName, analysis) {
    const deck = state.decks[deckName];
    if (!deck || !analysis) return;

    deck.peaks = Array.isArray(analysis.peaks) ? analysis.peaks : [];
    deck.detectedBpm = normaliseBpm(analysis.detectedBpm || analysis.bpm || 0);
    if (!deck.sourceBpm && analysis.sourceBpm) deck.sourceBpm = normaliseBpm(analysis.sourceBpm);
    if (!deck.sourceBpm && analysis.bpm) deck.sourceBpm = normaliseBpm(analysis.bpm);
    deck.downbeat = Number(analysis.downbeat || 0);
    deck.suggestedDownbeat = Number(analysis.suggestedDownbeat ?? analysis.downbeat ?? 0);
    deck.beatInterval = Number(analysis.beatInterval || (deck.sourceBpm ? 60 / deck.sourceBpm : 0));
    deck.gridOffset = Number(analysis.gridOffset ?? deck.downbeat ?? 0);
    deck.gridConfidence = Number(analysis.gridConfidence || 0);
    deck.gridLocked = Boolean(analysis.gridLocked);
    deck.cueSet = Boolean(analysis.cueSet);
    deck.cuePoint = deck.cueSet ? Number(analysis.cuePoint || 0) : null;
    deck.hotCues = normaliseHotCues(analysis.hotCues);
    deck.memoryCues = normaliseMemoryCues(analysis.memoryCues);
    deck.analysisCached = Boolean(analysis.cached);
    deck.analysisStatus = analysis.status || "ready";
  }

  function setDeckOffset(deckName, value) {
    const deck = state.decks[deckName];
    if (!deck) return;

    const duration = Math.max(0, Number(deck.duration || deck.buffer?.duration || 0));
    deck.offset = clamp(value, 0, duration || Number.MAX_SAFE_INTEGER);
  }
	
  function getDeckBeatSeconds(deck) {
    const bpm = getDeckBpm(deck) || deck?.sourceBpm || deck?.detectedBpm || 0;
    return bpm > 0 ? 60 / bpm : 0;
  }

  function normaliseLoopBounds(deck, start, end) {
    const duration = Math.max(0, Number(deck?.duration || deck?.buffer?.duration || 0));
    const safeStart = clamp(Number(start || 0), 0, Math.max(0, duration - 0.02));
    const safeEnd = clamp(Number(end || 0), safeStart + 0.02, duration || Number.MAX_SAFE_INTEGER);
    return { start: safeStart, end: safeEnd };
  }

  function applyLoopToSource(deck, sourceNode = null) {
    const source = sourceNode || deck?.source;
    if (!source) return;
    const loop = deck.loop || {};
    if (!loop.active || !Number.isFinite(Number(loop.in)) || !Number.isFinite(Number(loop.out)) || Number(loop.out) <= Number(loop.in)) {
      source.loop = false;
      return;
    }
    source.loop = true;
    source.loopStart = Number(loop.in);
    source.loopEnd = Number(loop.out);
  }

  function buildAutoLoopBounds(deckName, start = null) {
    const deck = state.decks[deckName];
    if (!deck) return null;

    const beatSeconds = getDeckBeatSeconds(deck);
    if (!beatSeconds) return null;

    const beats = clamp(Number(deck.loop?.sizeBeats || 8), 1 / 512, 512);
    const loopStart = start === null ? getCurrentTime(deckName) : Number(start || 0);

    return normaliseLoopBounds(deck, loopStart, loopStart + (beats * beatSeconds));
  }

  function setDeckLoopSizeBeats(deckName, beats = 8, start = null) {
    const deck = state.decks[deckName];
    if (!deck) return false;

    const safeBeats = clamp(Number(beats || 8), 1 / 512, 512);
    const requestedStart = Number.isFinite(Number(start)) ? Number(start) : null;
    deck.loop = { ...(deck.loop || {}), mode: "auto", sizeBeats: safeBeats };

    const bounds = buildAutoLoopBounds(deckName, requestedStart);
    if (!bounds) {
      emitState(`${deckLabel(deckName)} loop size ready`);
      return true;
    }

    deck.loop.in = bounds.start;
    deck.loop.out = bounds.end;

    if (deck.playing) {
      deck.loop.active = true;
      deck.offset = bounds.start;
      startDeckBufferSource(deckName, bounds.start);
      emitState(`${deckLabel(deckName)} auto loop ${safeBeats} beat${safeBeats === 1 ? "" : "s"}`);
    } else {
      deck.loop.active = false;
      applyLoopToSource(deck);
      emitState(`${deckLabel(deckName)} auto loop ${safeBeats} beat${safeBeats === 1 ? "" : "s"} ready`);
    }

    return true;
  }

  function setDeckLoopMode(deckName, mode = "auto") {
    const deck = state.decks[deckName];
    if (!deck) return false;
    const nextMode = mode === "manual" ? "manual" : "auto";
    deck.loop = { ...(deck.loop || {}), mode: nextMode };
    deck.loop.active = false;
    deck.loop.in = null;
    deck.loop.out = null;
    applyLoopToSource(deck);
    emitState(`${deckLabel(deckName)} loop mode ${nextMode}`);
    return true;
  }

  function setDeckLoopPoint(deckName, point = "in") {
    const deck = state.decks[deckName];
    if (!deck) return false;
    const current = getCurrentTime(deckName);
    deck.loop = { ...(deck.loop || {}), mode: "manual" };
    if (point === "out") {
      const inPoint = Number.isFinite(Number(deck.loop.in)) ? Number(deck.loop.in) : Math.max(0, current - 0.5);
      const bounds = normaliseLoopBounds(deck, inPoint, current);
      deck.loop.in = bounds.start;
      deck.loop.out = bounds.end;
      deck.loop.active = true;
      applyLoopToSource(deck);
      emitState(`${deckLabel(deckName)} loop out`);
      return true;
    }
    deck.loop.in = current;
    deck.loop.out = null;
    deck.loop.active = false;
    applyLoopToSource(deck);
    emitState(`${deckLabel(deckName)} loop in`);
    return true;
  }

  function clearDeckLoop(deckName) {
    const deck = state.decks[deckName];
    if (!deck) return false;
    deck.loop = { ...(deck.loop || {}), active: false, in: null, out: null };
    applyLoopToSource(deck);
    emitState(`${deckLabel(deckName)} loop cleared`);
    return true;
  }

  function writeDeckAnalysisCache(deck) {
    if (!deck?.analysisKey) return;

    writeAnalysisCache(deck.analysisKey, {
      version: 6,
      cached: false,
      status: deck.analysisStatus || "ready",
      fileName: deck.fileName || "",
      duration: Number(deck.duration || 0),
      detectedBpm: Number(deck.detectedBpm || 0),
      bpm: getDeckBpm(deck),
      sourceBpm: getDeckBpm(deck),
      beatInterval: Number(deck.beatInterval || beatIntervalFromBpm(getDeckBpm(deck))),
      downbeat: Number(deck.downbeat || 0),
      suggestedDownbeat: Number(deck.suggestedDownbeat ?? deck.downbeat ?? 0),
      gridOffset: Number(deck.gridOffset ?? deck.downbeat ?? 0),
      gridConfidence: Number(deck.gridConfidence || 0),
      gridLocked: Boolean(deck.gridLocked),
      cuePoint: deck.cueSet ? Number(deck.cuePoint || 0) : null,
      cueSet: Boolean(deck.cueSet),
      hotCues: getHotCueSnapshot(deck.hotCues),
      memoryCues: getMemoryCueSnapshot(deck.memoryCues),
      peaks: Array.isArray(deck.peaks) ? deck.peaks : [],
    });
  }

  function getDeckBpm(deck) {
    return normaliseBpm(deck?.sourceBpm || deck?.detectedBpm || 0);
  }

  function getDeckTargetBpm(deck) {
    return normaliseBpm(deck?.targetBpm || 0);
  }

  function getMasterDeckName(requestedTarget = "") {
    if (state.masterDeckMode === "d1" || state.masterDeckMode === "d2") return state.masterDeckMode;

    const d1 = state.decks.d1;
    const d2 = state.decks.d2;
    const other = requestedTarget === "d1" ? "d2" : "d1";
    if (state.decks[other]?.playing) return other;
    if (d1.playing && !d2.playing) return "d1";
    if (d2.playing && !d1.playing) return "d2";
    return state.crossfader <= 0.5 ? "d1" : "d2";
  }

  function getEffectiveMasterBpm(targetDeck = "") {
    const masterName = getMasterDeckName(targetDeck);
    const master = state.decks[masterName];
    return { masterName, bpm: getDeckTargetBpm(master) || getDeckBpm(master) };
  }

  function applyDeckTempo(deckName) {
    const deck = state.decks[deckName];
    if (!deck) return;

    const sourceBpm = getDeckBpm(deck);
    const targetBpm = deck.syncEnabled ? getDeckTargetBpm(deck) : 0;
    const rate = sourceBpm > 0 && targetBpm > 0 ? clamp(targetBpm / sourceBpm, 0.5, 2) : 1;
    deck.playbackRate = Number(rate.toFixed(5));

    if (deck.source?.playbackRate && state.ctx) {
      deck.source.playbackRate.setTargetAtTime(deck.playbackRate, state.ctx.currentTime, 0.012);
    }
  }

  function alignDeckToMasterBeat(deckName) {
    const deck = state.decks[deckName];
    if (!deck?.buffer) return;

    const { masterName, bpm } = getEffectiveMasterBpm(deckName);
    const master = state.decks[masterName];
    const sourceBpm = getDeckBpm(deck);
    if (!master?.buffer || !bpm || !sourceBpm || masterName === deckName) return;

    const masterBeat = Number(master.beatInterval || (60 / bpm));
    const targetSourceBeat = Number(deck.beatInterval || (60 / sourceBpm));
    const masterDownbeat = Number(master.gridOffset ?? master.downbeat ?? 0);
    const deckDownbeat = Number(deck.gridOffset ?? deck.downbeat ?? 0);
    const masterPhase = ((getCurrentTime(masterName) - masterDownbeat) % masterBeat + masterBeat) % masterBeat;
    const phaseRatio = masterBeat ? masterPhase / masterBeat : 0;
    const wantedPhase = phaseRatio * targetSourceBeat;
    const current = getCurrentTime(deckName);
    const beatIndex = Math.max(0, Math.round((current - deckDownbeat - wantedPhase) / targetSourceBeat));
    const nextOffset = (beatIndex * targetSourceBeat) + wantedPhase + deckDownbeat;

    setDeckOffset(deckName, nextOffset);
  }

  function applyMixerControls() {
    if (state.masterGain && state.ctx) {
      state.masterGain.gain.setTargetAtTime(state.masterVolume, state.ctx.currentTime, 0.012);
    }

    const crossGains = getCrossfaderDeckGains();

    deckNames.forEach((deckName) => {
      const deck = state.decks[deckName];
      if (!deck) return;

      if (deck.deckGain && state.ctx) {
        deck.deckGain.gain.setTargetAtTime(deck.volume, state.ctx.currentTime, 0.01);
      }

      applyDeckStems(deckName);

      if (deck.crossGain && state.ctx) {
        deck.crossGain.gain.setTargetAtTime(crossGains[deckName], state.ctx.currentTime, 0.01);
      }
			
      if (deck.outputGain && state.ctx) {
        deck.outputGain.gain.setTargetAtTime(deck.playing ? 1 : 0, state.ctx.currentTime, 0.004);
      }

      applyDeckTone(deckName);
      applyDeckEq(deckName);
      applyDeckTempo(deckName);
    });

    emitState("Mixer controls updated");
  }

  function setDeckVolume(deckName, value) {
    const deck = state.decks[deckName];
    if (!deck) return;
    deck.volume = clamp(value, 0, 1.25);
    createDeckGraph(deckName);
    applyMixerControls();
  }
	
  function setDeckGainTrim(deckName, value) {
    const deck = state.decks[deckName];
    if (!deck) return;
    deck.gain = clamp(value, 0, 1.5) * 100;
    createDeckGraph(deckName);
    applyDeckTone(deckName);
    emitState(`${deckLabel(deckName)} gain updated`);
  }

  function setDeckFilter(deckName, value) {
    const deck = state.decks[deckName];
    if (!deck) return;
    deck.filter = clamp(value, -100, 100);
    createDeckGraph(deckName);
    applyDeckTone(deckName);
    emitState(`${deckLabel(deckName)} filter updated`);
  }

  function setMasterVolume(value) {
    state.masterVolume = clamp(value, 0, 1.5);
    applyMixerControls();
  }

  function setCrossfader(value) {
    state.crossfader = clamp(value, 0, 1);
    applyMixerControls();
	}

  function setDeckStemLevel(deckName, stemName, value) {
    const deck = state.decks[deckName];
    if (!deck) return;

    const stem = normaliseStemName(stemName);
    deck.stems = normaliseStemLevels(deck.stems);
    deck.stems[stem] = clamp(value, 0, 100);
    createDeckGraph(deckName);
    applyDeckStems(deckName);
    emitState(`${deckLabel(deckName)} ${stem} stem set`);
  }

  function setDeckStemMute(deckName, stemName, muted = true) {
    const deck = state.decks[deckName];
    if (!deck) return;

    const stem = normaliseStemName(stemName);
    deck.stemMutes = normaliseStemMutes(deck.stemMutes);
    deck.stemMutes[stem] = Boolean(muted);
    createDeckGraph(deckName);
    applyDeckStems(deckName);
    emitState(`${deckLabel(deckName)} ${stem} stem ${muted ? "muted" : "unmuted"}`);
  }
	
  function setDeckBpm(deckName, bpm) {
    const deck = state.decks[deckName];
    if (!deck) return;

    const nextBpm = normaliseBpm(bpm);
    if (!nextBpm) return;

    if (deck.syncEnabled) {
      deck.targetBpm = nextBpm;
    } else {
      deck.sourceBpm = nextBpm;
    }

    applyDeckTempo(deckName);
    emitState(`${deckLabel(deckName)} BPM set`);
  }

  function applyDeckBpmFromPopup(deckName, bpm) {
    const deck = state.decks[deckName];
    if (!deck) return;

    const nextBpm = normaliseBpm(bpm);
    if (!nextBpm) return;

    const isActuallyPlaying = Boolean(deck.playing);

    if (isActuallyPlaying || deck.syncEnabled) {
      deck.targetBpm = nextBpm;
      deck.syncEnabled = true;
    } else {
      deck.sourceBpm = nextBpm;
      deck.targetBpm = 0;
      deck.syncEnabled = false;
    }

    applyDeckTempo(deckName);

    emitState(`${deckLabel(deckName)} BPM applied`);
  }

  function setDeckTargetBpm(deckName, bpm, enabled = true) {
    const deck = state.decks[deckName];
    if (!deck) return;
    deck.targetBpm = normaliseBpm(bpm);
    deck.syncEnabled = Boolean(enabled && deck.targetBpm);
    applyDeckTempo(deckName);
    emitState(`${deckLabel(deckName)} target BPM set`);
  }
	
  function getGridEditMin(deck) {
    const beat = Number(deck?.beatInterval || 0);
    return -Math.max(30, beat ? beat * 32 : 30);
  }

  function getGridEditMax(deck) {
    const duration = Number(deck?.duration || 0);
    const beat = Number(deck?.beatInterval || 0);
    return duration + Math.max(30, beat ? beat * 32 : 30);
  }

  function setDeckGrid(deckName, options = {}) {
    const deck = state.decks[deckName];
    if (!deck) return false;

    if (typeof options.locked === "boolean") {
      deck.gridLocked = options.locked;
      deck.analysisStatus = "ready";
      writeDeckAnalysisCache(deck);
      emitState(`${deckLabel(deckName)} grid ${deck.gridLocked ? "locked" : "unlocked"}`);
      return true;
    }

    if (deck.gridLocked) {
      emitState(`${deckLabel(deckName)} grid locked`);
      return false;
    }

    const sourceBpm = options.bpm !== undefined
      ? normaliseGridBpm(options.bpm)
      : normaliseGridBpm(deck.sourceBpm || deck.detectedBpm || 0);

    if (sourceBpm) {
      deck.sourceBpm = sourceBpm;
      deck.beatInterval = beatIntervalFromBpm(sourceBpm);
    }

    const min = getGridEditMin(deck);
    const max = getGridEditMax(deck);

    if (Number.isFinite(Number(options.downbeat))) deck.downbeat = clamp(Number(options.downbeat), min, max);
    if (Number.isFinite(Number(options.gridOffset))) deck.gridOffset = clamp(Number(options.gridOffset), min, max);
    if (Number.isFinite(Number(options.confidence))) deck.gridConfidence = clamp(Number(options.confidence), 0, 1);

    if (!deck.beatInterval && deck.sourceBpm) deck.beatInterval = beatIntervalFromBpm(deck.sourceBpm);
    if (!Number.isFinite(deck.gridOffset)) deck.gridOffset = Number(deck.downbeat || 0);
    deck.analysisStatus = "ready";
    writeDeckAnalysisCache(deck);
    applyDeckTempo(deckName);
    emitState(`${deckLabel(deckName)} beat grid updated`);
    return true;
  }

  function nudgeDeckGrid(deckName, seconds = 0) {
    const deck = state.decks[deckName];
    if (!deck) return false;

    if (deck.gridLocked) {
      emitState(`${deckLabel(deckName)} grid locked`);
      return false;
    }

    const shift = Number(seconds || 0);
    const current = Number(deck.gridOffset ?? deck.downbeat ?? 0);
    const next = clamp(current + shift, getGridEditMin(deck), getGridEditMax(deck));
    deck.gridOffset = next;
    deck.downbeat = next;
    deck.gridConfidence = Math.max(Number(deck.gridConfidence || 0), 0.9);
    deck.analysisStatus = "ready";
    writeDeckAnalysisCache(deck);
    emitState(`${deckLabel(deckName)} grid nudged`);
    return true;
  }

  function snapTimeToNearestGrid(deck, value = 0) {
    const raw = Number(value || 0);
    const beat = Number(deck?.beatInterval || 0);
    const grid = Number(deck?.gridOffset ?? deck?.downbeat ?? 0);
    if (!beat || !Number.isFinite(beat) || !Number.isFinite(grid)) return raw;

    const index = Math.round((raw - grid) / beat);
    return grid + (index * beat);
  }

  function getQuantizedPlayOffset(deck) {
    const raw = Number(deck?.offset || 0);
    if (!deck?.quantize || !deck.beatInterval) return raw;
    return snapTimeToNearestGrid(deck, raw);
  }

  function setDeckCuePoint(deckName, value = null, options = {}) {
    const deck = state.decks[deckName];
    if (!deck) return false;

    const cueRaw = value === null ? getCurrentTime(deckName) : Number(value || 0);
    const cueTime = options.snap === false ? cueRaw : snapTimeToNearestGrid(deck, cueRaw);
    deck.cuePoint = clamp(cueTime, getGridEditMin(deck), deck.duration || Number.MAX_SAFE_INTEGER);
    deck.cueSet = true;
    writeDeckAnalysisCache(deck);
    emitState(`${deckLabel(deckName)} cue set`);
    return true;
  }
	
  function setDeckHotCue(deckName, slot = "A", value = null, options = {}) {
    const deck = state.decks[deckName];
    if (!deck) return false;

    const cueSlot = normaliseHotCueSlot(slot);
    const cueRaw = value === null ? getCurrentTime(deckName) : Number(value || 0);
    const cueTime = options.snap === false ? cueRaw : snapTimeToNearestGrid(deck, cueRaw);
    deck.hotCues = normaliseHotCues(deck.hotCues);
    deck.hotCues[cueSlot] = {
      slot: cueSlot,
      time: clamp(cueTime, getGridEditMin(deck), deck.duration || Number.MAX_SAFE_INTEGER),
      set: true,
    };
    writeDeckAnalysisCache(deck);
    emitState(`${deckLabel(deckName)} Hot Cue ${cueSlot} set`);
    return true;
  }

  function clearDeckHotCue(deckName, slot = "A") {
    const deck = state.decks[deckName];
    if (!deck) return false;

    const cueSlot = normaliseHotCueSlot(slot);
    deck.hotCues = normaliseHotCues(deck.hotCues);
    deck.hotCues[cueSlot] = { slot: cueSlot, time: null, set: false };
    writeDeckAnalysisCache(deck);
    emitState(`${deckLabel(deckName)} Hot Cue ${cueSlot} cleared`);
    return true;
  }

  async function triggerDeckHotCue(deckName, slot = "A", options = {}) {
    const deck = state.decks[deckName];
    if (!deck) return false;

    const cueSlot = normaliseHotCueSlot(slot);
    const cue = normaliseHotCues(deck.hotCues)[cueSlot];
    if (!cue?.set || !Number.isFinite(Number(cue.time))) return false;

    setDeckOffset(deckName, Number(cue.time || 0));
    deck.startedAt = state.ctx?.currentTime || deck.startedAt || 0;

    if (options.play !== false) {
      await play(deckName);
    } else {
      deck.status = deck.buffer ? `Hot Cue ${cueSlot}` : "Empty";
      emitState(`${deckLabel(deckName)} Hot Cue ${cueSlot}`);
    }

    return true;
  }
	
  function setDeckMemoryCue(deckName, slot = "A", value = null, options = {}) {
    const deck = state.decks[deckName];
    if (!deck) return false;

    const cueSlot = normaliseMemoryCueSlot(slot);
    const cueRaw = value === null ? getCurrentTime(deckName) : Number(value || 0);
    const cueTime = options.snap === false ? cueRaw : snapTimeToNearestGrid(deck, cueRaw);
    deck.memoryCues = normaliseMemoryCues(deck.memoryCues);
    deck.memoryCues[cueSlot] = {
      slot: cueSlot,
      time: clamp(cueTime, getGridEditMin(deck), deck.duration || Number.MAX_SAFE_INTEGER),
      set: true,
    };
    writeDeckAnalysisCache(deck);
    emitState(`${deckLabel(deckName)} Memory Cue ${cueSlot} set`);
    return true;
  }

  function clearDeckMemoryCue(deckName, slot = "A") {
    const deck = state.decks[deckName];
    if (!deck) return false;

    const cueSlot = normaliseMemoryCueSlot(slot);
    deck.memoryCues = normaliseMemoryCues(deck.memoryCues);
    deck.memoryCues[cueSlot] = { slot: cueSlot, time: null, set: false };
    writeDeckAnalysisCache(deck);
    emitState(`${deckLabel(deckName)} Memory Cue ${cueSlot} cleared`);
    return true;
  }

  function triggerDeckMemoryCue(deckName, slot = "A") {
    const deck = state.decks[deckName];
    if (!deck) return false;

    const cueSlot = normaliseMemoryCueSlot(slot);
    const cue = normaliseMemoryCues(deck.memoryCues)[cueSlot];
    if (!cue?.set || !Number.isFinite(Number(cue.time))) return false;

    setDeckOffset(deckName, Number(cue.time || 0));
    deck.status = deck.buffer ? `Memory Cue ${cueSlot}` : "Empty";
    emitState(`${deckLabel(deckName)} Memory Cue ${cueSlot}`);
    return true;
  }

  function triggerDeckCue(deckName) {
    const deck = state.decks[deckName];
    if (!deck) return false;

    if (deck.playing) {
      stopSource(deck, true);
      silenceDeckInput(deckName);
      const target = deck.cueSet && Number.isFinite(Number(deck.cuePoint)) ? Number(deck.cuePoint) : 0;
      setDeckOffset(deckName, target);
      deck.status = deck.buffer ? "Cued" : "Empty";
      emitState(`${deckLabel(deckName)} returned to cue`);
      return true;
    }

    setDeckCuePoint(deckName, getCurrentTime(deckName), { snap: true });
    if (deck.cueSet) setDeckOffset(deckName, Number(deck.cuePoint || 0));
    deck.status = deck.buffer ? "Cued" : "Empty";
    emitState(`${deckLabel(deckName)} cue set`);
    return true;
  }

  function detectDeckFirstBeat(deckName) {
    const deck = state.decks[deckName];
    if (!deck?.buffer) return false;
    if (deck.gridLocked) {
      emitState(`${deckLabel(deckName)} grid locked`);
      return false;
    }

    const bpm = getDeckBpm(deck);
    if (!bpm) return false;

    const detected = estimateDownbeatFromBuffer(deck.buffer, bpm);
    if (!Number.isFinite(Number(detected))) return false;

    deck.suggestedDownbeat = Number(detected || 0);
    deck.downbeat = deck.suggestedDownbeat;
    deck.gridOffset = deck.suggestedDownbeat;
    deck.gridConfidence = Math.max(Number(deck.gridConfidence || 0), 0.86);
    deck.analysisStatus = "ready";
    writeDeckAnalysisCache(deck);
    emitState(`${deckLabel(deckName)} first beat detected`);
    return true;
  }

  function seekDeck(deckName, value = 0) {
    const deck = state.decks[deckName];
    if (!deck) return false;

    const wasPlaying = Boolean(deck.playing);
    setDeckOffset(deckName, Number(value || 0));
    deck.startedAt = state.ctx?.currentTime || deck.startedAt || 0;
    if (wasPlaying) restartDeckSource(deckName);
    emitState(`${deckLabel(deckName)} seek`);
    return true;
  }

  function nudgeDeckPlayhead(deckName, seconds = 0) {
    const deck = state.decks[deckName];
    if (!deck) return false;

    const wasPlaying = Boolean(deck.playing);
    const current = getCurrentTime(deckName);
    setDeckOffset(deckName, current + Number(seconds || 0));
    deck.startedAt = state.ctx?.currentTime || deck.startedAt || 0;
    if (wasPlaying) restartDeckSource(deckName);
    emitState(`${deckLabel(deckName)} playhead nudged`);
    return true;
  }

  function setDeckSyncOptions(deckName, options = {}) {
    const deck = state.decks[deckName];
    if (!deck) return;
    if (typeof options.syncEnabled === "boolean") deck.syncEnabled = options.syncEnabled;
    if (typeof options.quantize === "boolean") deck.quantize = options.quantize;
    if (typeof options.masterTempo === "boolean") deck.masterTempo = options.masterTempo;
    if (typeof options.keySync === "boolean") deck.keySync = options.keySync;
    if (["bpm", "beat"].includes(options.syncMode)) deck.syncMode = options.syncMode;
    applyDeckTempo(deckName);
    emitState(`${deckLabel(deckName)} sync options updated`);
  }

  function setMasterDeck(mode = "auto") {
    state.masterDeckMode = ["auto", "d1", "d2"].includes(mode) ? mode : "auto";
    emitState("Master deck mode updated");
  }

  function resetDeckTempo(deckName) {
    const deck = state.decks[deckName];
    if (!deck) return;
    deck.syncEnabled = false;
    deck.targetBpm = 0;
    applyDeckTempo(deckName);
    emitState(`${deckLabel(deckName)} tempo reset`);
  }

  function syncDeckToMaster(deckName) {
    const deck = state.decks[deckName];
    if (!deck) return false;

    if (deck.syncEnabled) {
      resetDeckTempo(deckName);
      emitState(`${deckLabel(deckName)} sync off`);
      return true;
    }

    const { masterName, bpm } = getEffectiveMasterBpm(deckName);

    if (masterName === deckName) {
      const ownTarget = getDeckTargetBpm(deck) || getDeckBpm(deck);
      if (!ownTarget) {
        emitState(`${deckLabel(deckName)} has no BPM to sync`);
        return false;
      }

      deck.targetBpm = ownTarget;
      deck.syncEnabled = true;
      applyDeckTempo(deckName);
      emitState(`${deckLabel(deckName)} sync on`);
      return true;
    }

    if (!bpm) {
      emitState(`${deckLabel(deckName)} could not find master BPM`);
      return false;
    }

    deck.targetBpm = bpm;
    deck.syncEnabled = true;
    if (deck.syncMode === "beat" || deck.quantize) alignDeckToMasterBeat(deckName);
    applyDeckTempo(deckName);
    emitState(`${deckLabel(deckName)} synced to ${deckLabel(masterName)}`);
    return true;
  }

  function setDeckEq(deckName, band, value) {
    const deck = state.decks[deckName];
    const key = String(band || "").toLowerCase();
    if (!deck || !["low", "mid", "high"].includes(key)) return;
    deck.eq[key] = clamp(value, 0, 150);
    createDeckGraph(deckName);
    applyDeckEq(deckName);
    emitState(`${deckLabel(deckName)} ${key.toUpperCase()} EQ updated`);
  }

  function resetDeckEq(deckName) {
    const deck = state.decks[deckName];
    if (!deck) return;
    deck.eq = { low: 100, mid: 100, high: 100 };
    createDeckGraph(deckName);
    applyDeckEq(deckName);
    emitState(`${deckLabel(deckName)} EQ reset`);
  }

  function stopBufferSource(source) {
    if (!source) return;
    try { source.onended = null; } catch {}
    try { source.stop(0); } catch {}
    try { source.disconnect(); } catch {}
  }

  function stopAllDeckSources(deck) {
    if (!deck) return;
    try { deck.mediaElement?.pause?.(); } catch {}
    const sources = new Set();
    if (deck.source) sources.add(deck.source);
    if (deck.activeSources && typeof deck.activeSources.forEach === "function") {
      deck.activeSources.forEach((source) => sources.add(source));
    }
    sources.forEach(stopBufferSource);
    deck.activeSources = new Set();
    deck.source = null;
  }

  function stopSource(deck, keepOffset = true) {
    if (!deck) return;
    if (keepOffset && deck.playing) deck.offset = getCurrentTime(deck.deck);
    deck.playing = false;
    stopAllDeckSources(deck);
  }
			
  function silenceDeckSource(deck) {
    if (!deck) return;
    const pausedDeckName = deck.deck;

    silenceDeckInput(pausedDeckName);
    silenceDeckOutput(pausedDeckName);

    deck.playing = false;
    stopAllDeckSources(deck);

    silenceDeckInput(pausedDeckName);
    silenceDeckOutput(pausedDeckName);
  }

  function getCurrentTime(deckName) {
    const deck = state.decks[deckName];
    if (!deck) return 0;
    const duration = Math.max(0, Number(deck.duration || deck.buffer?.duration || 0));
    if (!deck.playing || !state.ctx) return clamp(deck.offset, 0, duration || Number.MAX_SAFE_INTEGER);
    const elapsed = Math.max(0, state.ctx.currentTime - Number(deck.startedAt || 0)) * Number(deck.playbackRate || 1);
    return clamp(Number(deck.offset || 0) + elapsed, 0, duration || Number.MAX_SAFE_INTEGER);
  }

  async function loadFile(deckName, file, libraryMeta = {}) {
    const deck = state.decks[deckName];
    if (!deck) throw new Error(`Unknown deck: ${deckName}`);
    if (!file) throw new Error("Choose an audio file first");

    stopSource(deck, false);
    releaseDeckMedia(deck);
    deck.loading = true;
    deck.status = "Reading file";
    deck.error = "";
    deck.fileName = file.name || "Local audio file";
    deck.libraryItem = normaliseDeckLibraryItem(libraryMeta, file);
    deck.mediaUrl = "";
    deck.mediaElement = null;
    deck.mediaSource = null;
    deck.buffer = null;
    deck.duration = 0;
    deck.offset = 0;
    deck.peaks = [];
    emitState(`${deckLabel(deckName)} reading file`);

    try {
      const ctx = await resumeContext();
      const data = await file.arrayBuffer();
      deck.status = "Decoding audio";
      emitState(`${deckLabel(deckName)} decoding audio`);
      const buffer = await ctx.decodeAudioData(data.slice ? data.slice(0) : data);

      createDeckGraph(deckName);
      deck.buffer = buffer;
      deck.duration = Number(buffer.duration || 0);
      if (deck.libraryItem && !deck.libraryItem.duration) deck.libraryItem.duration = deck.duration;
      deck.offset = 0;
      deck.analysisKey = makeAnalysisKey(file);
      const cachedAnalysis = readAnalysisCache(deck.analysisKey);
      const analysis = buildDeckAnalysis(buffer, file, cachedAnalysis);
      applyDeckAnalysis(deckName, analysis);
      if (!analysis.cached) writeAnalysisCache(deck.analysisKey, analysis);
      applyDeckTempo(deckName);
      deck.loading = false;
      deck.status = "Ready";
      emitState(`${deckLabel(deckName)} ready`);
      return getSnapshot(deckName);
    } catch (err) {
      deck.loading = false;
      deck.status = "Failed";
      deck.error = String(err?.message || err || "Decode failed");
      emitState(`${deckLabel(deckName)} failed`);
      throw err;
    }
  }
	
  function startDeckBufferSource(deckName, startOffset = 0) {
    const deck = state.decks[deckName];
    if (!deck?.buffer || !state.ctx || !deck.inputGain) return false;

    const ctx = state.ctx;
    const duration = Number(deck.duration || deck.buffer?.duration || 0);
    const maxOffset = duration > 0 ? Math.max(0, duration - 0.001) : 0;
    const safeOffset = clamp(startOffset, 0, maxOffset);

    stopSource(deck, false);
    restoreDeckInput(deckName);
    restoreDeckOutput(deckName);

    const source = ctx.createBufferSource();
    source.buffer = deck.buffer;
    source.playbackRate.value = Number(deck.playbackRate || 1);
    ensureDeckSourceGain(deckName);
    source.connect(deck.sourceGain || deck.inputGain);
    applyLoopToSource(deck, source);

    deck.source = source;
    deck.activeSources = deck.activeSources instanceof Set ? deck.activeSources : new Set();
    deck.activeSources.add(source);
    deck.startedAt = ctx.currentTime;
    deck.offset = safeOffset;
    deck.playing = true;
    deck.status = "Playing";

    source.onended = () => {
      if (deck.activeSources && typeof deck.activeSources.delete === "function") deck.activeSources.delete(source);
      if (deck.source !== source) return;
      deck.source = null;
      deck.playing = false;
      deck.offset = 0;
      deck.status = "Ended";
      emitState(`${deckLabel(deckName)} ended`);
    };

    source.start(0, safeOffset);
    startTicker();
    return true;
  }

  function restartDeckSource(deckName) {
    const deck = state.decks[deckName];
    if (!deck?.playing) return false;
    return startDeckBufferSource(deckName, deck.offset);
  }

  async function play(deckName) {
    const deck = state.decks[deckName];
    if (!deck?.buffer) throw new Error(`${deckLabel(deckName)} has no decoded file yet`);
    await resumeContext();
    createDeckGraph(deckName);
    stopSource(deck, true);
    restoreDeckInput(deckName);
    restoreDeckOutput(deckName);

    if (deck.syncEnabled && deck.quantize) alignDeckToMasterBeat(deckName);

    const startOffset = clamp(getQuantizedPlayOffset(deck), 0, deck.duration || 0);

    if (!startDeckBufferSource(deckName, startOffset)) {
      throw new Error(`${deckLabel(deckName)} could not start buffer source`);
    }

    emitState(`${deckLabel(deckName)} playing`);
    return true;
  }

  function pause(deckName) {
    const deck = state.decks[deckName];
    if (!deck) return false;

    const pausedAt = getCurrentTime(deckName);
    deck.offset = pausedAt;
    deck.playing = false;

    stopAllDeckSources(deck);
    resetDeckAudioGraph(deckName, false);

    deck.status = deck.buffer ? "Paused" : "Empty";
    emitState(`${deckLabel(deckName)} paused`);
    suspendContextIfNoDecksPlaying();
    return true;
  }
	
  async function toggleDeckPlayback(deckName, startOffset = null) {
    const deck = state.decks[deckName];
    if (!deck) return false;
    if (deck.playing) return pause(deckName);
    if (Number.isFinite(Number(startOffset))) setDeckOffset(deckName, Number(startOffset));
    return play(deckName);
  }

  function stop(deckName) {
    const deck = state.decks[deckName];
    if (!deck) return false;

    deck.playing = false;
    stopAllDeckSources(deck);
    resetDeckAudioGraph(deckName, false);

    deck.offset = 0;
    deck.status = deck.buffer ? "Stopped" : "Empty";
    emitState(`${deckLabel(deckName)} stopped`);
    suspendContextIfNoDecksPlaying();
    return true;
  }

  function getAnalyserLevel(analyser) {
    if (!analyser) return 0;

    const size = analyser.fftSize || 1024;
    const data = new Uint8Array(size);
    analyser.getByteTimeDomainData(data);

    let peak = 0;
    let sumSquares = 0;

    data.forEach((value) => {
      const centred = (Number(value) - 128) / 128;
      const abs = Math.abs(centred);
      if (abs > peak) peak = abs;
      sumSquares += centred * centred;
    });

    const rms = Math.sqrt(sumSquares / Math.max(1, data.length));
    return clamp((peak * 0.78) + (rms * 1.35), 0, 1);
  }
	
  function estimateBpmFromBuffer(buffer) {
    if (!buffer || !buffer.length || !buffer.numberOfChannels) return 0;

    const sampleRate = buffer.sampleRate || 44100;
    const channelCount = Math.min(2, buffer.numberOfChannels || 1);
    const startSample = Math.floor(sampleRate * 6);
    const maxSamples = Math.min(buffer.length - startSample, Math.floor(sampleRate * 64));
    if (maxSamples <= sampleRate * 8) return 0;

    const frameSize = 1024;
    const energies = [];
    for (let pos = startSample; pos < startSample + maxSamples; pos += frameSize) {
      let total = 0;
      const end = Math.min(buffer.length, pos + frameSize);

      for (let channelIndex = 0; channelIndex < channelCount; channelIndex += 1) {
        const data = buffer.getChannelData(channelIndex);
        for (let i = pos; i < end; i += 1) {
          const sample = Number(data[i] || 0);
          total += sample * sample;
        }
      }

      energies.push(Math.sqrt(total / Math.max(1, (end - pos) * channelCount)));
    }

    if (energies.length < 64) return 0;

    const diffs = [];
    for (let i = 1; i < energies.length; i += 1) diffs.push(Math.max(0, energies[i] - energies[i - 1]));

    const framesPerSecond = sampleRate / frameSize;
    const candidates = [];

    for (let bpm = 80; bpm <= 220; bpm += 0.5) {
      const lag = Math.round((60 / bpm) * framesPerSecond);
      if (lag < 2 || lag >= diffs.length) continue;

      let score = 0;
      let hits = 0;
      for (let i = lag; i < diffs.length; i += 1) {
        score += diffs[i] * diffs[i - lag];
        hits += 1;
      }

      if (score > 0 && hits > 0) candidates.push({ bpm, score: score / hits });
    }

    if (!candidates.length) return 0;

    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    const danceRange = candidates
      .filter((candidate) => candidate.bpm >= 145 && candidate.bpm <= 190)
      .sort((a, b) => b.score - a.score)[0];

    const selected = danceRange && danceRange.score >= best.score * 0.64 ? danceRange : best;
    return normaliseBpm(selected.bpm);
  }
	
  function buildWaveformPeaks(buffer, points = 48000) {
    if (!buffer || !buffer.length || !buffer.numberOfChannels) return [];
    const channelCount = Math.min(2, buffer.numberOfChannels || 1);
    const samples = buffer.length;
    const blockSize = Math.max(1, Math.floor(samples / points));
    const peaks = [];

    for (let i = 0; i < points; i += 1) {
      const start = i * blockSize;
      const end = Math.min(samples, start + blockSize);
      let peak = 0;

      for (let channel = 0; channel < channelCount; channel += 1) {
        const data = buffer.getChannelData(channel);
        for (let sample = start; sample < end; sample += 1) {
          const value = Math.abs(data[sample] || 0);
          if (value > peak) peak = value;
        }
      }

      peaks.push(Number(clamp(peak, 0, 1).toFixed(4)));
    }

    return peaks;
  }

  function getSnapshot(deckName) {
    const deck = state.decks[deckName];
    if (!deck) return null;
    return {
      deck: deckName,
      label: deckLabel(deckName),
      fileName: deck.fileName,
      library: deck.libraryItem ? {
        id: deck.libraryItem.id || "",
        title: deck.libraryItem.title || "",
        artist: deck.libraryItem.artist || "",
        artwork: deck.libraryItem.artwork || "",
        locator: deck.libraryItem.locator || "",
        duration: Number(deck.libraryItem.duration || deck.duration || 0),
        analysisReady: Boolean(deck.libraryItem.analysisReady || deck.analysisStatus === "ready"),
        gridReady: Boolean(deck.libraryItem.gridReady || (deck.beatInterval && getDeckBpm(deck))),
        loadedAt: Number(deck.libraryItem.loadedAt || 0),
      } : null,
      status: deck.status,
      error: deck.error,
      loading: Boolean(deck.loading),
      ready: Boolean(deck.buffer),
      playing: Boolean(deck.playing),
      currentTime: getCurrentTime(deckName),
      duration: Number(deck.duration || 0),
      volume: Number(deck.volume || 0),
      gain: Number(deck.gain ?? 100),
      filter: Number(deck.filter ?? 0),
      eq: { ...deck.eq },
      stems: normaliseStemLevels(deck.stems),
      stemMutes: normaliseStemMutes(deck.stemMutes),
      loop: { ...(deck.loop || {}) },
      sourceBpm: Number(deck.sourceBpm || 0),
      sourceBpm: Number(deck.sourceBpm || 0),
      detectedBpm: Number(deck.detectedBpm || 0),
      targetBpm: Number(deck.targetBpm || 0),
      playbackRate: Number(deck.playbackRate || 1),
      backgroundPlayback: false,
      engineMode: "buffer-source",
      syncEnabled: Boolean(deck.syncEnabled),
      quantize: Boolean(deck.quantize),
      masterTempo: Boolean(deck.masterTempo),
      keySync: Boolean(deck.keySync),
      cuePoint: deck.cueSet ? Number(deck.cuePoint || 0) : null,
      cueSet: Boolean(deck.cueSet),
      hotCues: getHotCueSnapshot(deck.hotCues),
      memoryCues: getMemoryCueSnapshot(deck.memoryCues),
      syncMode: deck.syncMode || "beat",
      masterDeck: getMasterDeckName(deckName),
      analysis: {
        status: deck.analysisStatus || "empty",
        cached: Boolean(deck.analysisCached),
        confidence: Number(deck.gridConfidence || 0),
      },
      beatGrid: {
        ready: Boolean(deck.beatInterval && getDeckBpm(deck)),
        bpm: getDeckBpm(deck),
        beatInterval: Number(deck.beatInterval || 0),
        downbeat: Number(deck.downbeat || 0),
        suggestedDownbeat: Number(deck.suggestedDownbeat ?? deck.downbeat ?? 0),
        gridOffset: Number(deck.gridOffset || 0),
        confidence: Number(deck.gridConfidence || 0),
        locked: Boolean(deck.gridLocked),
      },
      peaks: deck.peaks || [],
      level: getAnalyserLevel(deck.analyser),
    };
  }

  function getState() {
    return {
      audioContextState: state.ctx?.state || "not-started",
      decks: {
        d1: getSnapshot("d1"),
        d2: getSnapshot("d2"),
      },
      masterLevel: getAnalyserLevel(state.masterAnalyser),
      masterVolume: state.masterVolume,
      masterDeckMode: state.masterDeckMode,
      crossfader: state.crossfader,
    };
  }

  function emitState(message = "") {
    emitter.emit("state", { message, state: getState() });
  }

  function startTicker() {
    if (state.raf || !window.requestAnimationFrame) return;
    const tick = () => {
      emitState("tick");
      const anyPlaying = deckNames.some((deckName) => state.decks[deckName].playing);
      state.raf = anyPlaying ? window.requestAnimationFrame(tick) : 0;
    };
    state.raf = window.requestAnimationFrame(tick);
  }

  async function analyzeFile(file) {
    if (!file) throw new Error("No file provided for analysis");
    const ctx = await resumeContext();
    const data = await file.arrayBuffer();
    const buffer = await ctx.decodeAudioData(data.slice ? data.slice(0) : data);
    const key = makeAnalysisKey(file);
    const cachedAnalysis = readAnalysisCache(key);
    const analysis = buildDeckAnalysis(buffer, file, cachedAnalysis);
    if (!analysis.cached) writeAnalysisCache(key, analysis);
    return { ...analysis, analysisKey: key };
  }

  window.BRMediaDjAudioEngine = {
    version: "V3G-O-pause-close-context",
    on: emitter.on,
    init: ensureContext,
    resume: resumeContext,
    loadFile,
    analyzeFile,
    play,
    pause,
    toggleDeckPlayback,
    stop,
    setDeckVolume,
    setDeckGainTrim,
    setDeckFilter,
    setMasterVolume,
    setCrossfader,
    setDeckStemLevel,
    setDeckStemMute,
    setDeckLoopSizeBeats,
    setDeckLoopMode,
    setDeckLoopPoint,
    clearDeckLoop,
    setDeckBpm,
    applyDeckBpmFromPopup,
    setDeckTargetBpm,
    setDeckGrid,
    nudgeDeckGrid,
    setDeckCuePoint,
    setDeckHotCue,
    clearDeckHotCue,
    triggerDeckHotCue,
    setDeckMemoryCue,
    clearDeckMemoryCue,
    triggerDeckMemoryCue,
    triggerDeckCue,
    detectDeckFirstBeat,
    seekDeck,
    nudgeDeckPlayhead,
    setDeckSyncOptions,
    setMasterDeck,
    resetDeckTempo,
    syncDeckToMaster,
    setDeckEq,
    resetDeckEq,
    getState,
    getCurrentTime,
  };

  window.BRMediaDjEngine = window.BRMediaDjAudioEngine;
}());