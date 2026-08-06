(() => {
  "use strict";

  const clamp = (value, min = 0, max = 1) =>
    Math.max(
      min,
      Math.min(
        max,
        Number(value) || 0
      )
    );

  const safeDisconnect = (node) => {
    try {
      node?.disconnect?.();
    } catch {}
  };

  const stopNode = (node) => {
    try {
      node?.stop?.();
    } catch {}
  };

  const setParam = (
    param,
    value,
    context,
    smoothing = 0.012
  ) => {
    if (!param) return;

    const now =
      context?.currentTime || 0;

    try {
      param.cancelScheduledValues(now);

      param.setTargetAtTime(
        Number(value) || 0,
        now,
        Math.max(
          0.001,
          smoothing
        )
      );
    } catch {
      try {
        param.value =
          Number(value) || 0;
      } catch {}
    }
  };

  const createStereoPanner = (
    context
  ) =>
    typeof context.createStereoPanner ===
    "function"
      ? context.createStereoPanner()
      : context.createGain();

  const makeDriveCurve = (
    amount = 0.5,
    mode = "soft"
  ) => {
    const samples = 2048;

    const curve =
      new Float32Array(samples);

    const drive =
      1 + clamp(amount) * 48;

    for (
      let index = 0;
      index < samples;
      index += 1
    ) {
      const x =
        (index / (samples - 1)) *
          2 -
        1;

      if (mode === "hard") {
        curve[index] = Math.max(
          -1,
          Math.min(
            1,
            x * drive
          )
        );
      } else if (
        mode === "quantize"
      ) {
        const steps = Math.max(
          4,
          Math.round(
            48 -
              clamp(amount) * 42
          )
        );

        curve[index] =
          Math.round(x * steps) /
          steps;
      } else {
        curve[index] =
          Math.tanh(x * drive);
      }
    }

    return curve;
  };

  const makeImpulse = (
    context,
    seconds = 1.8,
    decay = 2.4,
    reverse = false
  ) => {
    const sampleRate =
      Math.max(
        8000,
        Number(context.sampleRate) ||
          44100
      );

    const length =
      Math.max(
        1,
        Math.floor(
          sampleRate * seconds
        )
      );

    const buffer =
      context.createBuffer(
        2,
        length,
        sampleRate
      );

    for (
      let channel = 0;
      channel < 2;
      channel += 1
    ) {
      const data =
        buffer.getChannelData(
          channel
        );

      for (
        let index = 0;
        index < length;
        index += 1
      ) {
        const ratio = reverse
          ? index / length
          : 1 - index / length;

        data[index] =
          (
            Math.random() *
              2 -
            1
          ) *
          Math.pow(
            Math.max(
              0,
              ratio
            ),
            decay
          );
      }
    }

    return buffer;
  };

  const makeNoiseBuffer = (
    context
  ) => {
    const sampleRate =
      Math.max(
        8000,
        Number(context.sampleRate) ||
          44100
      );

    const length =
      sampleRate * 2;

    const buffer =
      context.createBuffer(
        1,
        length,
        sampleRate
      );

    const data =
      buffer.getChannelData(0);

    for (
      let index = 0;
      index < length;
      index += 1
    ) {
      data[index] =
        Math.random() * 2 - 1;
    }

    return buffer;
  };

  const EFFECT_PROFILES =
    Object.freeze({
      lpf: {
        kind: "filter",
        type: "lowpass",
        frequency: 1200,
        q: 4.8,
        mix: 0.82,
      },

      hpf: {
        kind: "filter",
        type: "highpass",
        frequency: 850,
        q: 4.6,
        mix: 0.82,
      },

      bpf: {
        kind: "filter",
        type: "bandpass",
        frequency: 1450,
        q: 6.5,
        mix: 0.84,
      },

      delay: {
        kind: "delay",
        beats: 0.5,
        feedback: 0.22,
        mix: 0.5,
      },
			
      trans: {
        kind: "gate",
        rateBeats: 0.5,
        depth: 0.98,
        square: true,
        mix: 0.92,
      },

      filter: {
        kind: "sweep",
        type: "bandpass",
        minFrequency: 160,
        maxFrequency: 9800,
        q: 7.5,
        rateBeats: 2,
        mix: 0.82,
      },

      distortion: {
        kind: "drive",
        drive: 0.58,
        mode: "soft",
        mix: 0.65,
      },

      "auto-pan": {
        kind: "pan",
        rateBeats: 2,
        depth: 0.95,
        mix: 0.78,
      },

      gater: {
        kind: "gate",
        rateBeats: 0.5,
        depth: 0.98,
        square: true,
        mix: 0.9,
      },

      compressor: {
        kind: "compressor",
        threshold: -28,
        ratio: 12,
        attack: 0.004,
        release: 0.16,
        mix: 0.72,
      },

      eq3: {
        kind: "eq3",
        low: 5,
        mid: -7,
        high: 5,
        mix: 0.78,
      },

      echo: {
        kind: "delay",
        beats: 1,
        feedback: 0.58,
        mix: 0.68,
      },

      "dub-echo": {
        kind: "delay",
        beats: 1,
        feedback: 0.67,
        filterType: "lowpass",
        filterFrequency: 2300,
        mix: 0.72,
      },

      "low-cut-echo": {
        kind: "delay",
        beats: 1,
        feedback: 0.62,
        filterType: "highpass",
        filterFrequency: 900,
        mix: 0.7,
      },

      "ping-pong": {
        kind: "delay",
        beats: 0.5,
        feedback: 0.58,
        panRateBeats: 1,
        mix: 0.72,
      },

      phaser: {
        kind: "phaser",
        rateBeats: 4,
        depth: 950,
        mix: 0.7,
      },

      flanger: {
        kind: "mod-delay",
        delay: 0.004,
        depth: 0.0035,
        rateBeats: 2,
        feedback: 0.42,
        mix: 0.62,
      },

      chorus: {
        kind: "mod-delay",
        delay: 0.022,
        depth: 0.006,
        rateBeats: 4,
        feedback: 0.15,
        mix: 0.58,
      },

      reverb: {
        kind: "reverb",
        seconds: 2.4,
        decay: 2.5,
        mix: 0.58,
      },

      noise: {
        kind: "noise",
        filterType: "highpass",
        filterFrequency: 2500,
        mix: 0.32,
      },

      "ring-mod": {
        kind: "ring",
        frequency: 52,
        mix: 0.66,
      },
			
      robot: {
        kind: "ring",
        frequency: 74,
        sweep: 18,
        rateBeats: 2,
        mix: 0.76,
      },

      "pitch-shift": {
        kind: "pitch",
        rate: 0.72,
        depth: 0.035,
        mix: 0.72,
      },

      "vinyl-brake": {
        kind: "brake",
        beats: 2,
        mix: 0.78,
      },

      "beat-roll": {
        kind: "delay",
        beats: 0.25,
        feedback: 0.86,
        mix: 0.86,
      },
			
      "up-roll": {
        kind: "roll-shift",
        direction: 1,
        beats: 0.25,
        feedback: 0.9,
        mix: 0.88,
      },

      "down-roll": {
        kind: "roll-shift",
        direction: -1,
        beats: 0.25,
        feedback: 0.9,
        mix: 0.88,
      },

      stutter: {
        kind: "stutter",
        rateBeats: 0.125,
        mix: 0.92,
      },

      "key-lock": {
        kind: "pitch",
        rate: 0.14,
        depth: 0.012,
        mix: 0.54,
      },

      "freq-shift": {
        kind: "ring",
        frequency: 18,
        sweep: 64,
        rateBeats: 4,
        mix: 0.68,
      },

      mobius: {
        kind: "mobius",
        rateBeats: 4,
        mix: 0.72,
      },

      granular: {
        kind: "granular",
        rateBeats: 0.25,
        mix: 0.78,
      },

      saturator: {
        kind: "drive",
        drive: 0.32,
        mode: "soft",
        mix: 0.58,
      },

      shimmer: {
        kind: "shimmer",
        seconds: 2.8,
        decay: 2.1,
        mix: 0.68,
      },

      bitcrusher: {
        kind: "drive",
        drive: 0.72,
        mode: "quantize",
        lowpass: 7200,
        mix: 0.72,
      },

      "tape-delay": {
        kind: "delay",
        beats: 0.75,
        feedback: 0.62,
        wobble: 0.006,
        wobbleRateBeats: 5,
        filterType: "lowpass",
        filterFrequency: 4300,
        mix: 0.7,
      },

      spiral: {
        kind: "delay",
        beats: 0.5,
        feedback: 0.76,
        wobble: 0.018,
        wobbleRateBeats: 2,
        panRateBeats: 2,
        mix: 0.75,
      },

      helix: {
        kind: "freeze",
        beats: 0.0625,
        feedback: 0.94,
        panRateBeats: 2,
        mix: 0.86,
      },

      sweep: {
        kind: "sweep",
        type: "bandpass",
        minFrequency: 180,
        maxFrequency: 9200,
        q: 8,
        rateBeats: 4,
        mix: 0.82,
      },

      space: {
        kind: "delay",
        beats: 1.5,
        feedback: 0.72,
        filterType: "highpass",
        filterFrequency: 650,
        panRateBeats: 2,
        mix: 0.78,
      },

      crush: {
        kind: "crush",
        mix: 0.78,
      },

      megaphone: {
        kind: "megaphone",
        mix: 0.84,
      },

      "chorus-flanger": {
        kind: "dual-mod",
        mix: 0.7,
      },

      "brake-echo": {
        kind: "brake-echo",
        beats: 2,
        mix: 0.82,
      },

      "combo-filter": {
        kind: "combo-filter",
        rateBeats: 4,
        mix: 0.84,
      },

      "duck-delay": {
        kind: "duck-delay",
        beats: 0.75,
        feedback: 0.58,
        mix: 0.72,
      },

      overdrive: {
        kind: "drive",
        drive: 0.88,
        mode: "hard",
        mix: 0.75,
      },

      tremolo: {
        kind: "gate",
        rateBeats: 1,
        depth: 0.76,
        square: false,
        mix: 0.82,
      },

      "reverse-roll": {
        kind: "reverse",
        seconds: 0.7,
        decay: 1.35,
        beats: 0.5,
        mix: 0.86,
      },

      freeze: {
        kind: "freeze",
        beats: 0.03125,
        feedback: 0.97,
        mix: 0.9,
      },

      isolator: {
        kind: "eq3",
        low: 10,
        mid: -18,
        high: 10,
        mix: 0.9,
      },
    });

  const FX_IDS =
    Object.freeze(
      Object.keys(
        EFFECT_PROFILES
      )
    );

  class BRMediaDjFxRack {
    constructor(
      context,
      options = {}
    ) {
      if (!context) {
        throw new Error(
          "FX rack requires an AudioContext"
        );
      }

      this.context = context;

      this.deckId =
        options.deckId === "d2"
          ? "d2"
          : "d1";

      this.input =
        context.createGain();

      this.output =
        context.createGain();

      this.amount =
        clamp(
          options.amount ?? 0.58
        );

      this.beatSeconds =
        Math.max(
          0.04,
          Number(
            options.beatSeconds
          ) ||
            60 / 175
        );

      this.modules =
        new Map();

      this.transportCallback =
        typeof options
          .onTransportEffect ===
        "function"
          ? options
              .onTransportEffect
          : null;

      this.input.connect(
        this.output
      );
    }

    getState() {
      return {
        deckId: this.deckId,

        amount: this.amount,

        beatSeconds:
          this.beatSeconds,

        active:
          Array.from(
            this.modules.keys()
          ),
      };
    }

    has(effectId) {
      return this.modules.has(
        String(effectId || "")
      );
    }

    setAmount(
      value = this.amount
    ) {
      this.amount =
        clamp(value);

      this.modules.forEach(
        (module) => {
          module.setAmount?.(
            this.amount
          );
        }
      );

      return this.getState();
    }

    setBeatSeconds(
      value = this.beatSeconds
    ) {
      this.beatSeconds =
        Math.max(
          0.04,
          Math.min(
            4,
            Number(value) ||
              this.beatSeconds
          )
        );

      this.modules.forEach(
        (module) => {
          module
            .setBeatSeconds?.(
              this.beatSeconds
            );
        }
      );

      return this.getState();
    }

    toggle(
      effectId,
      enabled,
      options = {}
    ) {
      const id =
        String(
          effectId || ""
        ).trim();

      const profile =
        EFFECT_PROFILES[id];

      if (!profile) {
        throw new Error(
          `Unsupported FX: ${
            id || "unknown"
          }`
        );
      }

      if (
        options.amount != null
      ) {
        this.setAmount(
          options.amount
        );
      }

      if (
        options.beatSeconds !=
        null
      ) {
        this.setBeatSeconds(
          options.beatSeconds
        );
      }

      const nextEnabled =
        enabled == null
          ? !this.modules.has(id)
          : Boolean(enabled);

      if (!nextEnabled) {
        this.disable(id);

        return this.getState();
      }

      if (
        this.modules.has(id)
      ) {
        return this.getState();
      }

      const module =
        this.createModule(
          id,
          profile
        );

      this.modules.set(
        id,
        module
      );

      this.rebuild();

      if (
        [
          "vinyl-brake",
          "brake-echo",
        ].includes(id)
      ) {
        this.transportCallback?.(
          id,
          true,
          {
            amount:
              this.amount,

            beatSeconds:
              this.beatSeconds,
          }
        );
      }

      return this.getState();
    }

    disable(effectId) {
      const id =
        String(effectId || "");

      const module =
        this.modules.get(id);

      if (!module) {
        return this.getState();
      }

      this.modules.delete(id);

      module.destroy?.();

      if (
        [
          "vinyl-brake",
          "brake-echo",
        ].includes(id)
      ) {
        this.transportCallback?.(
          id,
          false,
          {
            amount:
              this.amount,

            beatSeconds:
              this.beatSeconds,
          }
        );
      }

      this.rebuild();

      return this.getState();
    }

    clear() {
      const activeModules = Array.from(
        this.modules.entries()
      );

      this.modules.clear();

      activeModules.forEach(
        ([id, module]) => {
          module.destroy?.();

          if (
            [
              "vinyl-brake",
              "brake-echo",
            ].includes(id)
          ) {
            this.transportCallback?.(
              id,
              false,
              {
                amount:
                  this.amount,

                beatSeconds:
                  this.beatSeconds,
              }
            );
          }
        }
      );

      /*
        Hard-bypass the rack in one operation. The previous clear path
        rebuilt the live chain once for every active effect, which could
        leave a phone processing an old tail while the button appeared idle.
      */
      safeDisconnect(
        this.input
      );

      this.input.connect(
        this.output
      );

      return this.getState();
    }

    destroy() {
      this.clear();

      safeDisconnect(
        this.input
      );

      safeDisconnect(
        this.output
      );
    }

    rebuild() {
      safeDisconnect(
        this.input
      );

      let previous =
        this.input;

      this.modules.forEach(
        (module) => {
          safeDisconnect(
            previous
          );

          previous.connect(
            module.input
          );

          previous =
            module.output;
        }
      );

      safeDisconnect(
        previous
      );

      previous.connect(
        this.output
      );
    }

    createBaseModule(
      id,
      profile
    ) {
      const input =
        this.context
          .createGain();

      const output =
        this.context
          .createGain();

      const dry =
        this.context
          .createGain();

      const wet =
        this.context
          .createGain();

      const nodes = [
        input,
        output,
        dry,
        wet,
      ];

      const sources = [];

      const updaters = [];

      input.connect(dry);

      dry.connect(output);

      wet.connect(output);

      const module = {
        id,
        profile,
        input,
        output,
        wet,
        dry,
        nodes,
        sources,
        updaters,

        connectWet: (
          lastNode
        ) =>
          lastNode.connect(wet),

        addNode: (node) => {
          if (node) {
            nodes.push(node);
          }

          return node;
        },

        addSource: (
          source
        ) => {
          if (source) {
            sources.push(source);
          }

          return source;
        },

        addUpdater: (
          updater
        ) => {
          if (
            typeof updater ===
            "function"
          ) {
            updaters.push(
              updater
            );
          }
        },

        setAmount: (
          amount
        ) => {
          const mix =
            clamp(
              (
                profile.mix ??
                0.65
              ) *
                (
                  0.3 +
                  clamp(amount) *
                    0.9
                )
            );

          setParam(
            dry.gain,
            Math.cos(
              mix *
                Math.PI *
                0.5
            ),
            this.context
          );

          setParam(
            wet.gain,
            Math.sin(
              mix *
                Math.PI *
                0.5
            ),
            this.context
          );

          updaters.forEach(
            (updater) => {
              updater(
                "amount",
                clamp(amount)
              );
            }
          );
        },

        setBeatSeconds: (
          beatSeconds
        ) => {
          updaters.forEach(
            (updater) => {
              updater(
                "beatSeconds",
                Math.max(
                  0.04,
                  Number(
                    beatSeconds
                  ) ||
                    this
                      .beatSeconds
                )
              );
            }
          );
        },

        destroy: () => {
          sources.forEach(
            stopNode
          );

          nodes.forEach(
            safeDisconnect
          );
        },
      };

      return module;
    }

    addLfo(
      module,
      target,
      options = {}
    ) {
      const oscillator =
        module.addSource(
          this.context
            .createOscillator()
        );

      const gain =
        module.addNode(
          this.context
            .createGain()
        );

      oscillator.type =
        options.type || "sine";

      oscillator.frequency.value =
        Math.max(
          0.01,
          Number(
            options.frequency
          ) || 1
        );

      gain.gain.value =
        Number(options.depth) ||
        1;

      oscillator.connect(
        gain
      );

      gain.connect(target);

      oscillator.start();

      return {
        oscillator,
        gain,
      };
    }

    createModule(
      id,
      profile
    ) {
      switch (profile.kind) {
        case "filter":
          return this
            .createFilterModule(
              id,
              profile
            );

        case "delay":
          return this
            .createDelayModule(
              id,
              profile
            );

        case "drive":
          return this
            .createDriveModule(
              id,
              profile
            );

        case "pan":
          return this
            .createPanModule(
              id,
              profile
            );

        case "gate":
          return this
            .createGateModule(
              id,
              profile
            );

        case "compressor":
          return this
            .createCompressorModule(
              id,
              profile
            );

        case "eq3":
          return this
            .createEqModule(
              id,
              profile
            );

        case "phaser":
          return this
            .createPhaserModule(
              id,
              profile
            );

        case "mod-delay":
          return this
            .createModDelayModule(
              id,
              profile
            );

        case "reverb":
          return this
            .createReverbModule(
              id,
              profile
            );

        case "noise":
          return this
            .createNoiseModule(
              id,
              profile
            );

        case "ring":
          return this
            .createRingModule(
              id,
              profile
            );

        case "pitch":
          return this
            .createPitchModule(
              id,
              profile
            );

        case "brake":
          return this
            .createBrakeModule(
              id,
              profile
            );

        case "stutter":
          return this
            .createStutterModule(
              id,
              profile
            );
						
        case "roll-shift":
          return this
            .createRollShiftModule(
              id,
              profile
            );

        case "mobius":
          return this
            .createMobiusModule(
              id,
              profile
            );

        case "granular":
          return this
            .createGranularModule(
              id,
              profile
            );

        case "shimmer":
          return this
            .createShimmerModule(
              id,
              profile
            );

        case "freeze":
          return this
            .createFreezeModule(
              id,
              profile
            );

        case "sweep":
          return this
            .createSweepModule(
              id,
              profile
            );

        case "crush":
          return this
            .createCrushModule(
              id,
              profile
            );

        case "megaphone":
          return this
            .createMegaphoneModule(
              id,
              profile
            );

        case "dual-mod":
          return this
            .createDualModModule(
              id,
              profile
            );

        case "brake-echo":
          return this
            .createBrakeEchoModule(
              id,
              profile
            );

        case "combo-filter":
          return this
            .createComboFilterModule(
              id,
              profile
            );

        case "duck-delay":
          return this
            .createDuckDelayModule(
              id,
              profile
            );

        case "reverse":
          return this
            .createReverseModule(
              id,
              profile
            );

        default:
          throw new Error(
            `FX recipe missing: ${id}`
          );
      }
    }

    createFilterModule(
      id,
      profile
    ) {
      const module =
        this.createBaseModule(
          id,
          profile
        );

      const filter =
        module.addNode(
          this.context
            .createBiquadFilter()
        );

      filter.type =
        profile.type ||
        "lowpass";

      filter.frequency.value =
        profile.frequency ||
        1200;

      filter.Q.value =
        profile.q || 1;

      module.input.connect(
        filter
      );

      module.connectWet(
        filter
      );

      module.setAmount(
        this.amount
      );

      return module;
    }

    createDelayModule(
      id,
      profile
    ) {
      const module =
        this.createBaseModule(
          id,
          profile
        );

      const delay =
        module.addNode(
          this.context
            .createDelay(6)
        );

      const feedback =
        module.addNode(
          this.context
            .createGain()
        );

      const filter =
        module.addNode(
          this.context
            .createBiquadFilter()
        );

      const panner =
        module.addNode(
          createStereoPanner(
            this.context
          )
        );

      filter.type =
        profile.filterType ||
        "allpass";

      filter.frequency.value =
        profile
          .filterFrequency ||
        1200;

      feedback.gain.value =
        clamp(
          profile.feedback ??
            0.45,
          0,
          0.94
        );

      module.input.connect(
        delay
      );

      delay.connect(filter);

      filter.connect(
        feedback
      );

      feedback.connect(
        delay
      );

      filter.connect(
        panner
      );

      module.connectWet(
        panner
      );

      let wobbleLfo = null;

      if (profile.wobble) {
        wobbleLfo =
          this.addLfo(
            module,
            delay.delayTime,
            {
              depth:
                profile.wobble,

              frequency: 0.3,
            }
          );
      }

      let panLfo = null;

      if (
        profile.panRateBeats &&
        panner.pan
      ) {
        panLfo =
          this.addLfo(
            module,
            panner.pan,
            {
              depth: 0.95,

              frequency: 0.5,
            }
          );
      }

      module.addUpdater(
        (type, value) => {
          if (
            type ===
            "beatSeconds"
          ) {
            setParam(
              delay.delayTime,
              Math.max(
                0.002,
                Math.min(
                  5.8,
                  value *
                    (
                      profile.beats ||
                      0.5
                    )
                )
              ),
              this.context
            );

            if (wobbleLfo) {
              setParam(
                wobbleLfo
                  .oscillator
                  .frequency,
                1 /
                  Math.max(
                    0.08,
                    value *
                      (
                        profile
                          .wobbleRateBeats ||
                        4
                      )
                  ),
                this.context
              );
            }

            if (panLfo) {
              setParam(
                panLfo
                  .oscillator
                  .frequency,
                1 /
                  Math.max(
                    0.08,
                    value *
                      profile
                        .panRateBeats
                  ),
                this.context
              );
            }
          }
        }
      );

      module.setBeatSeconds(
        this.beatSeconds
      );

      module.setAmount(
        this.amount
      );

      return module;
    }

    createDriveModule(
      id,
      profile
    ) {
      const module =
        this.createBaseModule(
          id,
          profile
        );

      const shaper =
        module.addNode(
          this.context
            .createWaveShaper()
        );

      const filter =
        module.addNode(
          this.context
            .createBiquadFilter()
        );

      shaper.oversample =
        "4x";

      filter.type =
        "lowpass";

      filter.frequency.value =
        profile.lowpass ||
        15000;

      module.input.connect(
        shaper
      );

      shaper.connect(
        filter
      );

      module.connectWet(
        filter
      );

      module.addUpdater(
        (type, value) => {
          if (
            type === "amount"
          ) {
            shaper.curve =
              makeDriveCurve(
                clamp(
                  (
                    profile.drive ||
                    0.5
                  ) *
                    (
                      0.6 +
                      value
                    )
                ),
                profile.mode ||
                  "soft"
              );
          }
        }
      );

      module.setAmount(
        this.amount
      );

      return module;
    }

    createPanModule(
      id,
      profile
    ) {
      const module =
        this.createBaseModule(
          id,
          profile
        );

      const panner =
        module.addNode(
          createStereoPanner(
            this.context
          )
        );

      module.input.connect(
        panner
      );

      module.connectWet(
        panner
      );

      if (panner.pan) {
        const lfo =
          this.addLfo(
            module,
            panner.pan,
            {
              depth:
                profile.depth ||
                0.9,

              frequency: 0.5,
            }
          );

        module.addUpdater(
          (type, value) => {
            if (
              type ===
              "beatSeconds"
            ) {
              setParam(
                lfo.oscillator
                  .frequency,
                1 /
                  Math.max(
                    0.08,
                    value *
                      (
                        profile
                          .rateBeats ||
                        2
                      )
                  ),
                this.context
              );
            }
          }
        );
      }

      module.setBeatSeconds(
        this.beatSeconds
      );

      module.setAmount(
        this.amount
      );

      return module;
    }

    createGateModule(
      id,
      profile
    ) {
      const module =
        this.createBaseModule(
          id,
          profile
        );

      const gate =
        module.addNode(
          this.context
            .createGain()
        );

      gate.gain.value =
        1 -
        (
          profile.depth ||
          0.8
        ) *
          0.5;

      module.input.connect(
        gate
      );

      module.connectWet(
        gate
      );

      const lfo =
        this.addLfo(
          module,
          gate.gain,
          {
            type:
              profile.square
                ? "square"
                : "sine",

            depth:
              (
                profile.depth ||
                0.8
              ) * 0.5,

            frequency: 2,
          }
        );

      module.addUpdater(
        (type, value) => {
          if (
            type ===
            "beatSeconds"
          ) {
            setParam(
              lfo.oscillator
                .frequency,
              1 /
                Math.max(
                  0.04,
                  value *
                    (
                      profile
                        .rateBeats ||
                      1
                    )
                ),
              this.context
            );
          }
        }
      );

      module.setBeatSeconds(
        this.beatSeconds
      );

      module.setAmount(
        this.amount
      );

      return module;
    }

    createCompressorModule(
      id,
      profile
    ) {
      const module =
        this.createBaseModule(
          id,
          profile
        );

      const compressor =
        module.addNode(
          this.context
            .createDynamicsCompressor()
        );

      compressor.threshold.value =
        profile.threshold ||
        -24;

      compressor.knee.value =
        12;

      compressor.ratio.value =
        profile.ratio || 8;

      compressor.attack.value =
        profile.attack ||
        0.005;

      compressor.release.value =
        profile.release ||
        0.18;

      module.input.connect(
        compressor
      );

      module.connectWet(
        compressor
      );

      module.setAmount(
        this.amount
      );

      return module;
    }

    createEqModule(
      id,
      profile
    ) {
      const module =
        this.createBaseModule(
          id,
          profile
        );

      const low =
        module.addNode(
          this.context
            .createBiquadFilter()
        );

      const mid =
        module.addNode(
          this.context
            .createBiquadFilter()
        );

      const high =
        module.addNode(
          this.context
            .createBiquadFilter()
        );

      low.type = "lowshelf";

      low.frequency.value =
        180;

      low.gain.value =
        profile.low || 0;

      mid.type = "peaking";

      mid.frequency.value =
        1200;

      mid.Q.value = 1.1;

      mid.gain.value =
        profile.mid || 0;

      high.type =
        "highshelf";

      high.frequency.value =
        4800;

      high.gain.value =
        profile.high || 0;

      module.input.connect(low);

      low.connect(mid);

      mid.connect(high);

      module.connectWet(
        high
      );

      module.setAmount(
        this.amount
      );

      return module;
    }

    createPhaserModule(
      id,
      profile
    ) {
      const module =
        this.createBaseModule(
          id,
          profile
        );

      const filters =
        Array.from(
          {
            length: 4,
          },
          (_, index) => {
            const filter =
              module.addNode(
                this.context
                  .createBiquadFilter()
              );

            filter.type =
              "allpass";

            filter.frequency.value =
              450 +
              index * 320;

            filter.Q.value =
              3.5;

            return filter;
          }
        );

      module.input.connect(
        filters[0]
      );

      filters.forEach(
        (filter, index) => {
          if (
            filters[
              index + 1
            ]
          ) {
            filter.connect(
              filters[
                index + 1
              ]
            );
          }
        }
      );

      module.connectWet(
        filters[
          filters.length - 1
        ]
      );

      const lfos =
        filters.map(
          (
            filter,
            index
          ) =>
            this.addLfo(
              module,
              filter.frequency,
              {
                depth:
                  (
                    profile.depth ||
                    900
                  ) *
                  (
                    0.7 +
                    index * 0.1
                  ),

                frequency:
                  0.2 +
                  index * 0.01,
              }
            )
        );

      module.addUpdater(
        (type, value) => {
          if (
            type ===
            "beatSeconds"
          ) {
            lfos.forEach(
              (
                lfo,
                index
              ) => {
                setParam(
                  lfo.oscillator
                    .frequency,
                  1 /
                    Math.max(
                      0.1,
                      value *
                        (
                          profile
                            .rateBeats ||
                          4
                        )
                    ) +
                    index *
                      0.01,
                  this.context
                );
              }
            );
          }
        }
      );

      module.setBeatSeconds(
        this.beatSeconds
      );

      module.setAmount(
        this.amount
      );

      return module;
    }

    createModDelayModule(
      id,
      profile
    ) {
      const module =
        this.createBaseModule(
          id,
          profile
        );

      const delay =
        module.addNode(
          this.context
            .createDelay(0.2)
        );

      const feedback =
        module.addNode(
          this.context
            .createGain()
        );

      delay.delayTime.value =
        profile.delay ||
        0.01;

      feedback.gain.value =
        clamp(
          profile.feedback || 0,
          0,
          0.8
        );

      module.input.connect(
        delay
      );

      delay.connect(
        feedback
      );

      feedback.connect(
        delay
      );

      module.connectWet(
        delay
      );

      const lfo =
        this.addLfo(
          module,
          delay.delayTime,
          {
            depth:
              profile.depth ||
              0.004,

            frequency: 0.3,
          }
        );

      module.addUpdater(
        (type, value) => {
          if (
            type ===
            "beatSeconds"
          ) {
            setParam(
              lfo.oscillator
                .frequency,
              1 /
                Math.max(
                  0.08,
                  value *
                    (
                      profile
                        .rateBeats ||
                      4
                    )
                ),
              this.context
            );
          }
        }
      );

      module.setBeatSeconds(
        this.beatSeconds
      );

      module.setAmount(
        this.amount
      );

      return module;
    }

    createReverbModule(
      id,
      profile
    ) {
      const module =
        this.createBaseModule(
          id,
          profile
        );

      const convolver =
        module.addNode(
          this.context
            .createConvolver()
        );

      const tone =
        module.addNode(
          this.context
            .createBiquadFilter()
        );

      convolver.buffer =
        makeImpulse(
          this.context,
          profile.seconds || 2,
          profile.decay || 2.4
        );

      tone.type =
        "lowpass";

      tone.frequency.value =
        9000;

      module.input.connect(
        convolver
      );

      convolver.connect(
        tone
      );

      module.connectWet(
        tone
      );

      module.setAmount(
        this.amount
      );

      return module;
    }

    createNoiseModule(
      id,
      profile
    ) {
      const module =
        this.createBaseModule(
          id,
          profile
        );

      const noise =
        module.addSource(
          this.context
            .createBufferSource()
        );

      const gain =
        module.addNode(
          this.context
            .createGain()
        );

      const filter =
        module.addNode(
          this.context
            .createBiquadFilter()
        );

      noise.buffer =
        makeNoiseBuffer(
          this.context
        );

      noise.loop = true;

      gain.gain.value = 0.2;

      filter.type =
        profile.filterType ||
        "highpass";

      filter.frequency.value =
        profile
          .filterFrequency ||
        2500;

      noise.connect(filter);

      filter.connect(gain);

      module.connectWet(gain);

      noise.start();

      module.setAmount(
        this.amount
      );

      return module;
    }

    createRingModule(
      id,
      profile
    ) {
      const module =
        this.createBaseModule(
          id,
          profile
        );

      const ring =
        module.addNode(
          this.context
            .createGain()
        );

      ring.gain.value = 0;

      module.input.connect(
        ring
      );

      module.connectWet(
        ring
      );

      const carrier =
        this.addLfo(
          module,
          ring.gain,
          {
            depth: 1,

            frequency:
              profile.frequency ||
              40,
          }
        );

      if (profile.sweep) {
        const sweep =
          this.addLfo(
            module,
            carrier.oscillator
              .frequency,
            {
              depth:
                profile.sweep,

              frequency: 0.1,
            }
          );

        module.addUpdater(
          (type, value) => {
            if (
              type ===
              "beatSeconds"
            ) {
              setParam(
                sweep.oscillator
                  .frequency,
                1 /
                  Math.max(
                    0.1,
                    value *
                      (
                        profile
                          .rateBeats ||
                        4
                      )
                  ),
                this.context
              );
            }
          }
        );
      }

      module.setBeatSeconds(
        this.beatSeconds
      );

      module.setAmount(
        this.amount
      );

      return module;
    }

    createPitchModule(
      id,
      profile
    ) {
      const module =
        this.createBaseModule(
          id,
          profile
        );

      const delayA =
        module.addNode(
          this.context
            .createDelay(0.12)
        );

      const delayB =
        module.addNode(
          this.context
            .createDelay(0.12)
        );

      const gainA =
        module.addNode(
          this.context
            .createGain()
        );

      const gainB =
        module.addNode(
          this.context
            .createGain()
        );

      const sum =
        module.addNode(
          this.context
            .createGain()
        );

      delayA.delayTime.value =
        profile.depth ||
        0.025;

      delayB.delayTime.value =
        (
          profile.depth ||
          0.025
        ) * 0.5;

      gainA.gain.value =
        0.65;

      gainB.gain.value =
        0.65;

      module.input.connect(
        delayA
      );

      module.input.connect(
        delayB
      );

      delayA.connect(gainA);

      delayB.connect(gainB);

      gainA.connect(sum);

      gainB.connect(sum);

      module.connectWet(sum);

      const lfoA =
        this.addLfo(
          module,
          delayA.delayTime,
          {
            type: "sawtooth",

            depth:
              profile.depth ||
              0.025,

            frequency:
              profile.rate ||
              0.6,
          }
        );

      const lfoB =
        this.addLfo(
          module,
          delayB.delayTime,
          {
            type: "sawtooth",

            depth:
              -(
                profile.depth ||
                0.025
              ),

            frequency:
              profile.rate ||
              0.6,
          }
        );

      module.addUpdater(
        (type, value) => {
          if (
            type === "amount"
          ) {
            const rate =
              Math.max(
                0.05,
                (
                  profile.rate ||
                  0.6
                ) *
                  (
                    0.55 +
                    value
                  )
              );

            setParam(
              lfoA.oscillator
                .frequency,
              rate,
              this.context
            );

            setParam(
              lfoB.oscillator
                .frequency,
              rate,
              this.context
            );
          }
        }
      );

      module.setAmount(
        this.amount
      );

      return module;
    }

    createBrakeModule(
      id,
      profile
    ) {
      return this
        .createDelayModule(
          id,
          {
            ...profile,

            kind: "delay",

            feedback: 0.72,

            filterType:
              "lowpass",

            filterFrequency:
              2600,
          }
        );
    }
		
    createRollShiftModule(
      id,
      profile
    ) {
      const module =
        this.createBaseModule(
          id,
          profile
        );

      const delay =
        module.addNode(
          this.context
            .createDelay(2)
        );

      const feedback =
        module.addNode(
          this.context
            .createGain()
        );

      const tone =
        module.addNode(
          this.context
            .createBiquadFilter()
        );

      feedback.gain.value =
        clamp(
          profile.feedback ||
            0.9,
          0,
          0.96
        );

      tone.type =
        profile.direction < 0
          ? "lowpass"
          : "highpass";

      tone.frequency.value =
        profile.direction < 0
          ? 4200
          : 520;

      module.input.connect(
        delay
      );

      delay.connect(tone);

      tone.connect(
        feedback
      );

      feedback.connect(
        delay
      );

      module.connectWet(
        tone
      );

      const lfo =
        this.addLfo(
          module,
          delay.delayTime,
          {
            type: "sawtooth",

            depth:
              0.018 *
              (
                profile.direction < 0
                  ? 1
                  : -1
              ),

            frequency: 0.8,
          }
        );

      module.addUpdater(
        (type, value) => {
          if (
            type ===
            "beatSeconds"
          ) {
            const slice =
              Math.max(
                0.012,
                Math.min(
                  0.34,
                  value *
                    (
                      profile.beats ||
                      0.25
                    )
                )
              );

            setParam(
              delay.delayTime,
              slice + 0.02,
              this.context
            );

            setParam(
              lfo.oscillator
                .frequency,
              1 /
                Math.max(
                  0.08,
                  value * 2
                ),
              this.context
            );
          }

          if (
            type ===
            "amount"
          ) {
            setParam(
              lfo.gain.gain,
              (
                0.006 +
                value * 0.022
              ) *
                (
                  profile.direction < 0
                    ? 1
                    : -1
                ),
              this.context
            );
          }
        }
      );

      module.setBeatSeconds(
        this.beatSeconds
      );

      module.setAmount(
        this.amount
      );

      return module;
    }

    createStutterModule(
      id,
      profile
    ) {
      const module =
        this.createBaseModule(
          id,
          profile
        );

      const gate =
        module.addNode(
          this.context
            .createGain()
        );

      const delay =
        module.addNode(
          this.context
            .createDelay(1)
        );

      gate.gain.value = 0.5;

      module.input.connect(
        delay
      );

      delay.connect(gate);

      module.connectWet(gate);

      const lfo =
        this.addLfo(
          module,
          gate.gain,
          {
            type: "square",

            depth: 0.5,

            frequency: 8,
          }
        );

      module.addUpdater(
        (type, value) => {
          if (
            type ===
            "beatSeconds"
          ) {
            const slice =
              Math.max(
                0.004,
                value *
                  (
                    profile
                      .rateBeats ||
                    0.125
                  )
              );

            setParam(
              delay.delayTime,
              slice,
              this.context
            );

            setParam(
              lfo.oscillator
                .frequency,
              1 / slice,
              this.context
            );
          }
        }
      );

      module.setBeatSeconds(
        this.beatSeconds
      );

      module.setAmount(
        this.amount
      );

      return module;
    }

    createMobiusModule(
      id,
      profile
    ) {
      const module =
        this.createBaseModule(
          id,
          profile
        );

      const filterA =
        module.addNode(
          this.context
            .createBiquadFilter()
        );

      const filterB =
        module.addNode(
          this.context
            .createBiquadFilter()
        );

      const panner =
        module.addNode(
          createStereoPanner(
            this.context
          )
        );

      filterA.type =
        "bandpass";

      filterA.frequency.value =
        420;

      filterA.Q.value = 8;

      filterB.type =
        "highpass";

      filterB.frequency.value =
        160;

      module.input.connect(
        filterA
      );

      filterA.connect(
        filterB
      );

      filterB.connect(
        panner
      );

      module.connectWet(
        panner
      );

      const lfo =
        this.addLfo(
          module,
          filterA.frequency,
          {
            type: "sawtooth",

            depth: 6500,

            frequency: 0.2,
          }
        );

      if (panner.pan) {
        this.addLfo(
          module,
          panner.pan,
          {
            depth: 0.9,

            frequency: 0.17,
          }
        );
      }

      module.addUpdater(
        (type, value) => {
          if (
            type ===
            "beatSeconds"
          ) {
            setParam(
              lfo.oscillator
                .frequency,
              1 /
                Math.max(
                  0.1,
                  value *
                    (
                      profile
                        .rateBeats ||
                      4
                    )
                ),
              this.context
            );
          }
        }
      );

      module.setBeatSeconds(
        this.beatSeconds
      );

      module.setAmount(
        this.amount
      );

      return module;
    }

    createGranularModule(
      id,
      profile
    ) {
      const module =
        this.createBaseModule(
          id,
          profile
        );

      const delays = [
        0.006,
        0.013,
        0.021,
      ].map(
        (
          time,
          index
        ) => {
          const delay =
            module.addNode(
              this.context
                .createDelay(0.1)
            );

          const gain =
            module.addNode(
              this.context
                .createGain()
            );

          delay.delayTime.value =
            time;

          gain.gain.value =
            0.42;

          module.input.connect(
            delay
          );

          delay.connect(gain);

          module.connectWet(
            gain
          );

          const lfo =
            this.addLfo(
              module,
              delay.delayTime,
              {
                type:
                  index % 2
                    ? "square"
                    : "sawtooth",

                depth:
                  time * 0.7,

                frequency:
                  4 +
                  index * 1.7,
              }
            );

          return {
            delay,
            lfo,
            index,
          };
        }
      );

      module.addUpdater(
        (type, value) => {
          if (
            type ===
            "beatSeconds"
          ) {
            delays.forEach(
              ({
                lfo,
                index,
              }) => {
                setParam(
                  lfo.oscillator
                    .frequency,
                  (
                    2 + index
                  ) /
                    Math.max(
                      0.04,
                      value *
                        (
                          profile
                            .rateBeats ||
                          0.25
                        )
                    ),
                  this.context
                );
              }
            );
          }
        }
      );

      module.setBeatSeconds(
        this.beatSeconds
      );

      module.setAmount(
        this.amount
      );

      return module;
    }

    createShimmerModule(
      id,
      profile
    ) {
      const module =
        this.createBaseModule(
          id,
          profile
        );

      const convolver =
        module.addNode(
          this.context
            .createConvolver()
        );

      const delay =
        module.addNode(
          this.context
            .createDelay(0.16)
        );

      const feedback =
        module.addNode(
          this.context
            .createGain()
        );

      const high =
        module.addNode(
          this.context
            .createBiquadFilter()
        );

      convolver.buffer =
        makeImpulse(
          this.context,
          profile.seconds ||
            2.8,
          profile.decay ||
            2.1
        );

      delay.delayTime.value =
        0.045;

      feedback.gain.value =
        0.52;

      high.type =
        "highpass";

      high.frequency.value =
        1600;

      module.input.connect(
        convolver
      );

      convolver.connect(
        delay
      );

      delay.connect(high);

      high.connect(
        feedback
      );

      feedback.connect(
        delay
      );

      module.connectWet(
        high
      );

      this.addLfo(
        module,
        delay.delayTime,
        {
          depth: 0.018,

          frequency: 0.58,
        }
      );

      module.setAmount(
        this.amount
      );

      return module;
    }

    createFreezeModule(
      id,
      profile
    ) {
      const module =
        this.createBaseModule(
          id,
          profile
        );

      const delay =
        module.addNode(
          this.context
            .createDelay(2)
        );

      const feedback =
        module.addNode(
          this.context
            .createGain()
        );

      const filter =
        module.addNode(
          this.context
            .createBiquadFilter()
        );

      const panner =
        module.addNode(
          createStereoPanner(
            this.context
          )
        );

      feedback.gain.value =
        clamp(
          profile.feedback ||
            0.95,
          0,
          0.985
        );

      filter.type =
        "lowpass";

      filter.frequency.value =
        5200;

      module.input.connect(
        delay
      );

      delay.connect(
        filter
      );

      filter.connect(
        feedback
      );

      feedback.connect(
        delay
      );

      filter.connect(
        panner
      );

      module.connectWet(
        panner
      );

      if (
        profile.panRateBeats &&
        panner.pan
      ) {
        const lfo =
          this.addLfo(
            module,
            panner.pan,
            {
              depth: 0.95,

              frequency: 0.5,
            }
          );

        module.addUpdater(
          (type, value) => {
            if (
              type ===
              "beatSeconds"
            ) {
              setParam(
                lfo.oscillator
                  .frequency,
                1 /
                  Math.max(
                    0.08,
                    value *
                      profile
                        .panRateBeats
                  ),
                this.context
              );
            }
          }
        );
      }

      module.addUpdater(
        (type, value) => {
          if (
            type ===
            "beatSeconds"
          ) {
            setParam(
              delay.delayTime,
              Math.max(
                0.002,
                value *
                  (
                    profile.beats ||
                    0.0625
                  )
              ),
              this.context
            );
          }
        }
      );

      module.setBeatSeconds(
        this.beatSeconds
      );

      module.setAmount(
        this.amount
      );

      return module;
    }

    createSweepModule(
      id,
      profile
    ) {
      const module =
        this.createBaseModule(
          id,
          profile
        );

      const filter =
        module.addNode(
          this.context
            .createBiquadFilter()
        );

      filter.type =
        profile.type ||
        "bandpass";

      filter.frequency.value =
        profile
          .minFrequency ||
        180;

      filter.Q.value =
        profile.q || 8;

      module.input.connect(
        filter
      );

      module.connectWet(
        filter
      );

      const centre =
        (
          (
            profile
              .maxFrequency ||
            9000
          ) +
          (
            profile
              .minFrequency ||
            180
          )
        ) / 2;

      const depth =
        (
          (
            profile
              .maxFrequency ||
            9000
          ) -
          (
            profile
              .minFrequency ||
            180
          )
        ) / 2;

      filter.frequency.value =
        centre;

      const lfo =
        this.addLfo(
          module,
          filter.frequency,
          {
            type: "sawtooth",

            depth,

            frequency: 0.2,
          }
        );

      module.addUpdater(
        (type, value) => {
          if (
            type ===
            "beatSeconds"
          ) {
            setParam(
              lfo.oscillator
                .frequency,
              1 /
                Math.max(
                  0.08,
                  value *
                    (
                      profile
                        .rateBeats ||
                      4
                    )
                ),
              this.context
            );
          }
        }
      );

      module.setBeatSeconds(
        this.beatSeconds
      );

      module.setAmount(
        this.amount
      );

      return module;
    }

    createCrushModule(
      id,
      profile
    ) {
      const module =
        this.createBaseModule(
          id,
          profile
        );

      const shaper =
        module.addNode(
          this.context
            .createWaveShaper()
        );

      const filter =
        module.addNode(
          this.context
            .createBiquadFilter()
        );

      shaper.curve =
        makeDriveCurve(
          0.8,
          "quantize"
        );

      filter.type =
        "bandpass";

      filter.frequency.value =
        2600;

      filter.Q.value = 3.5;

      module.input.connect(
        shaper
      );

      shaper.connect(
        filter
      );

      module.connectWet(
        filter
      );

      this.addLfo(
        module,
        filter.frequency,
        {
          depth: 1900,

          frequency: 0.31,
        }
      );

      module.setAmount(
        this.amount
      );

      return module;
    }

    createMegaphoneModule(
      id,
      profile
    ) {
      const module =
        this.createBaseModule(
          id,
          profile
        );

      const high =
        module.addNode(
          this.context
            .createBiquadFilter()
        );

      const low =
        module.addNode(
          this.context
            .createBiquadFilter()
        );

      const shaper =
        module.addNode(
          this.context
            .createWaveShaper()
        );

      high.type =
        "highpass";

      high.frequency.value =
        650;

      low.type = "lowpass";

      low.frequency.value =
        3200;

      shaper.curve =
        makeDriveCurve(
          0.56,
          "hard"
        );

      module.input.connect(
        high
      );

      high.connect(low);

      low.connect(shaper);

      module.connectWet(
        shaper
      );

      module.setAmount(
        this.amount
      );

      return module;
    }

    createDualModModule(
      id,
      profile
    ) {
      const module =
        this.createBaseModule(
          id,
          profile
        );

      const chorus =
        module.addNode(
          this.context
            .createDelay(0.1)
        );

      const flanger =
        module.addNode(
          this.context
            .createDelay(0.1)
        );

      const sum =
        module.addNode(
          this.context
            .createGain()
        );

      chorus.delayTime.value =
        0.023;

      flanger.delayTime.value =
        0.004;

      module.input.connect(
        chorus
      );

      module.input.connect(
        flanger
      );

      chorus.connect(sum);

      flanger.connect(sum);

      module.connectWet(sum);

      this.addLfo(
        module,
        chorus.delayTime,
        {
          depth: 0.006,

          frequency: 0.27,
        }
      );

      this.addLfo(
        module,
        flanger.delayTime,
        {
          depth: 0.003,

          frequency: 0.49,
        }
      );

      module.setAmount(
        this.amount
      );

      return module;
    }

    createBrakeEchoModule(
      id,
      profile
    ) {
      return this
        .createDelayModule(
          id,
          {
            ...profile,

            kind: "delay",

            feedback: 0.78,

            filterType:
              "lowpass",

            filterFrequency:
              2200,

            wobble: 0.012,

            wobbleRateBeats:
              2,
          }
        );
    }

    createComboFilterModule(
      id,
      profile
    ) {
      const module =
        this.createBaseModule(
          id,
          profile
        );

      const low =
        module.addNode(
          this.context
            .createBiquadFilter()
        );

      const band =
        module.addNode(
          this.context
            .createBiquadFilter()
        );

      const high =
        module.addNode(
          this.context
            .createBiquadFilter()
        );

      low.type = "lowpass";

      low.frequency.value =
        9000;

      low.Q.value = 3;

      band.type =
        "bandpass";

      band.frequency.value =
        1800;

      band.Q.value = 5;

      high.type =
        "highpass";

      high.frequency.value =
        120;

      module.input.connect(
        low
      );

      low.connect(band);

      band.connect(high);

      module.connectWet(
        high
      );

      const lfoA =
        this.addLfo(
          module,
          low.frequency,
          {
            depth: 6500,

            frequency: 0.2,
          }
        );

      const lfoB =
        this.addLfo(
          module,
          high.frequency,
          {
            depth: 1400,

            frequency: 0.17,
          }
        );

      module.addUpdater(
        (type, value) => {
          if (
            type ===
            "beatSeconds"
          ) {
            const rate =
              1 /
              Math.max(
                0.1,
                value *
                  (
                    profile
                      .rateBeats ||
                    4
                  )
              );

            setParam(
              lfoA.oscillator
                .frequency,
              rate,
              this.context
            );

            setParam(
              lfoB.oscillator
                .frequency,
              rate * 0.83,
              this.context
            );
          }
        }
      );

      module.setBeatSeconds(
        this.beatSeconds
      );

      module.setAmount(
        this.amount
      );

      return module;
    }

    createDuckDelayModule(
      id,
      profile
    ) {
      const module =
        this.createDelayModule(
          id,
          profile
        );

      const compressor =
        module.addNode(
          this.context
            .createDynamicsCompressor()
        );

      compressor.threshold.value =
        -34;

      compressor.ratio.value =
        18;

      compressor.attack.value =
        0.002;

      compressor.release.value =
        0.28;

      try {
        safeDisconnect(
          module.wet
        );

        module.wet.connect(
          compressor
        );

        compressor.connect(
          module.output
        );
      } catch {}

      module.setAmount(
        this.amount
      );

      return module;
    }

    createReverseModule(
      id,
      profile
    ) {
      const module =
        this.createBaseModule(
          id,
          profile
        );

      const convolver =
        module.addNode(
          this.context
            .createConvolver()
        );

      const delay =
        module.addNode(
          this.context
            .createDelay(6)
        );

      const feedback =
        module.addNode(
          this.context
            .createGain()
        );

      convolver.buffer =
        makeImpulse(
          this.context,
          profile.seconds ||
            0.7,
          profile.decay ||
            1.4,
          true
        );

      feedback.gain.value =
        0.58;

      module.input.connect(
        convolver
      );

      convolver.connect(
        delay
      );

      delay.connect(
        feedback
      );

      feedback.connect(
        delay
      );

      module.connectWet(
        delay
      );

      module.addUpdater(
        (type, value) => {
          if (
            type ===
            "beatSeconds"
          ) {
            setParam(
              delay.delayTime,
              Math.max(
                0.02,
                value *
                  (
                    profile.beats ||
                    0.5
                  )
              ),
              this.context
            );
          }
        }
      );

      module.setBeatSeconds(
        this.beatSeconds
      );

      module.setAmount(
        this.amount
      );

      return module;
    }
  }

  window.BRMediaDjFxRack =
    BRMediaDjFxRack;

  window.BRMediaDjFxProfiles =
    EFFECT_PROFILES;

  window.BRMediaDjFxIds =
    FX_IDS;
})();