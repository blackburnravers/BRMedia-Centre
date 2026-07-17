(() => {
  const clampUnit = (value = 0) => Math.max(0, Math.min(1, Number(value) || 0));
  const clampNumber = (value = 0, min = -Infinity, max = Infinity) => Math.max(min, Math.min(max, Number(value) || 0));

  const smoothSeries = (values = [], passes = 1, preserve = 0.72) => {
    let series = Array.isArray(values) ? values.slice() : [];

    for (let pass = 0; pass < passes; pass += 1) {
      const previousPass = series;
      series = previousPass.map((value, index) => {
        const previous = previousPass[Math.max(0, index - 1)] || 0;
        const current = Number(value) || 0;
        const next = previousPass[Math.min(previousPass.length - 1, index + 1)] || 0;
        const smooth = (previous * 0.16) + (current * 0.68) + (next * 0.16);
        return Number(Math.max(current * preserve, smooth).toFixed(5));
      });
    }

    return series;
  };

  const percentile = (values = [], target = 0.94) => {
    const clean = values.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
    if (!clean.length) return 1;
    const index = Math.max(0, Math.min(clean.length - 1, Math.floor(clean.length * target)));
    return clean[index] || clean[clean.length - 1] || 1;
  };

  const normaliseSeries = (values = [], options = {}) => {
    const floor = Number(options.floor) || 0;
    const power = Number(options.power) || 0.78;
    const scale = Math.max(0.0001, percentile(values, options.percentile ?? 0.94) * (options.trim || 1));

    return values.map((value) => {
      const normalised = clampUnit((Number(value) || 0) / scale);
      return Number(Math.max(floor, Math.pow(normalised, power)).toFixed(5));
    });
  };
	
  const estimateTempoAndDownbeat = (
    bands = {},
    duration = 0,
    options = {}
  ) => {
    const transient = Array.isArray(bands.transient) ? bands.transient : [];
    if (!duration || transient.length < 96) return null;

    const BPM_MIN = 120;
    const BPM_MAX = 250;
    const source = transient.map((value, index) => Math.max(
      Number(value) || 0,
      (Number(bands.lowBody?.[index]) || 0) * 0.92,
      (Number(bands.low?.[index]) || 0) * 0.76,
      (Number(bands.rms?.[index]) || 0) * 0.30,
      (Number(bands.highBody?.[index]) || 0) * 0.18
    ));
    const frameCount = Math.max(4096, Math.min(30000, Math.floor(duration * 86)));
    const envelope = Array.from({ length: frameCount }, (_, frame) => {
      const start = Math.floor((frame / frameCount) * source.length);
      const end = Math.max(start + 1, Math.floor(((frame + 1) / frameCount) * source.length));
      let peak = 0;
      let sum = 0;
      for (let index = start; index < end; index += 1) {
        const sample = source[index] || 0;
        peak = Math.max(peak, sample);
        sum += sample;
      }
      return (peak * 0.72) + ((sum / Math.max(1, end - start)) * 0.28);
    });

    const floor = percentile(envelope, 0.42) * 0.58;
    const ceiling = percentile(envelope, 0.94) || 1;
    const weighted = envelope.map((value, index) => {
      const previous = envelope[Math.max(0, index - 1)] || 0;
      const next = envelope[Math.min(envelope.length - 1, index + 1)] || 0;
      const smoothed = (value * 0.74) + (previous * 0.13) + (next * 0.13);
      const flux = Math.max(0, value - previous * 0.92);
      return Math.max(0, ((smoothed - floor) * 0.80) + (flux * 0.70));
    });

    const fps = frameCount / duration;
    const analyseStart = Math.max(0, Math.floor(Math.min(duration * 0.12, 18) * fps));
    const analyseEnd = Math.min(weighted.length - 1, Math.floor(Math.max(duration * 0.82, duration - 24) * fps));
    const activeFloor = percentile(weighted.slice(analyseStart, analyseEnd), 0.62) || 0;
    const activeMask = weighted.map((value, index) => (
      index >= analyseStart &&
      index <= analyseEnd &&
      value >= activeFloor * 0.72
    ));

    const normaliseMusicalBpm = (value) => {
      let bpm = Number(value) || 0;
      while (bpm > 0 && bpm < BPM_MIN) bpm *= 2;
      while (bpm > BPM_MAX) bpm /= 2;
      return bpm >= BPM_MIN && bpm <= BPM_MAX ? bpm : null;
    };

    const sampleWeighted = (position) => {
      if (position < 0 || position >= weighted.length - 1) return 0;
      const index = Math.floor(position);
      const ratio = position - index;
      return ((weighted[index] || 0) * (1 - ratio)) + ((weighted[index + 1] || 0) * ratio);
    };

    const scoreFixedBpm = (bpm) => {
      const lag = (60 * fps) / Math.max(1, bpm);
      if (!Number.isFinite(lag) || lag < 2) return null;

      const phaseSteps = Math.max(8, Math.min(96, Math.round(lag * 2)));
      let best = { bpm, lag, phase: 0, score: -Infinity, hitScore: 0, missPenalty: 0 };

      for (let phaseIndex = 0; phaseIndex < phaseSteps; phaseIndex += 1) {
        const phase = (phaseIndex / phaseSteps) * lag;
        let hitScore = 0;
        let missPenalty = 0;
        let count = 0;

        let firstBeat = Math.floor((analyseStart - phase) / lag) - 2;
        let lastBeat = Math.ceil((analyseEnd - phase) / lag) + 2;
        firstBeat = Math.max(-8, firstBeat);
        lastBeat = Math.min(lastBeat, firstBeat + 384);

        for (let beat = firstBeat; beat <= lastBeat; beat += 1) {
          const position = phase + (beat * lag);
          if (position < analyseStart || position > analyseEnd) continue;
          const index = Math.max(0, Math.min(activeMask.length - 1, Math.round(position)));
          const activeWeight = activeMask[index] ? 1 : 0.34;
          const barWeight = beat % 4 === 0 ? 1.20 : 1;
          const centre = sampleWeighted(position);
          const left = sampleWeighted(position - lag * 0.12) * 0.22;
          const right = sampleWeighted(position + lag * 0.12) * 0.22;
          const offBeat = sampleWeighted(position + lag * 0.5) * 0.34;
          hitScore += (centre + left + right) * barWeight * activeWeight;
          missPenalty += offBeat * activeWeight;
          count += barWeight * activeWeight;
        }

        const score = (hitScore - missPenalty) / Math.max(1, count);
        if (score > best.score) best = { bpm, lag, phase, score, hitScore, missPenalty };
      }

      const integerDistance = Math.abs(bpm - Math.round(bpm));
      const fiveDistance = Math.abs((bpm / 5) - Math.round(bpm / 5)) * 5;
      const integerBoost = integerDistance <= 0.01 ? 1.045 : integerDistance <= 0.10 ? 1.018 : 1;
      const fiveBoost = fiveDistance <= 0.01 ? 1.026 : 1;
      return {
        ...best,
        adjustedScore: best.score * integerBoost * fiveBoost,
      };
    };

    const minLag = Math.max(2, Math.round((60 / BPM_MAX) * fps));
    const maxLag = Math.min(weighted.length - 2, Math.round((60 / BPM_MIN) * fps));
    const rawCandidates = [];
    for (let lag = minLag; lag <= maxLag; lag += 1) {
      let score = 0;
      let count = 0;
      for (let index = analyseStart; index + lag < analyseEnd; index += 1) {
        const activeWeight = activeMask[index] ? 1 : 0.30;
        const current = weighted[index] || 0;
        score += current * (weighted[index + lag] || 0) * activeWeight;
        if (index + lag * 2 < analyseEnd) score += current * (weighted[index + lag * 2] || 0) * 0.48 * activeWeight;
        if (index + lag * 4 < analyseEnd) score += current * (weighted[index + lag * 4] || 0) * 0.20 * activeWeight;
        if (index + Math.round(lag / 2) < analyseEnd) score -= current * (weighted[index + Math.round(lag / 2)] || 0) * 0.18 * activeWeight;
        count += activeWeight;
      }
      score /= Math.max(1, count);
      const bpm = normaliseMusicalBpm((60 * fps) / lag);
      if (bpm) rawCandidates.push({ bpm, score, lag });
    }

    if (!rawCandidates.length) return null;

    const byRawScore = rawCandidates.slice().sort((a, b) => b.score - a.score);
    const rawBest = byRawScore[0];
    const candidateValues = new Set();
    byRawScore.slice(0, 18).forEach((candidate) => {
      const normalised = normaliseMusicalBpm(candidate.bpm);
      if (!normalised) return;
      const rounded = Math.round(normalised);
      const roundedFive = Math.round(normalised / 5) * 5;
      [normalised, rounded, roundedFive, rounded - 1, rounded + 1, roundedFive - 5, roundedFive + 5].forEach((value) => {
        if (value >= BPM_MIN && value <= BPM_MAX) candidateValues.add(Number(value.toFixed(2)));
      });
    });

    const rawAnchor = rawBest?.bpm || 0;
    const hintedBpm =
      normaliseMusicalBpm(
        options.bpmHint
      );

    if (hintedBpm) {
      candidateValues.add(
        Number(
          hintedBpm.toFixed(2)
        )
      );
    }
    for (let bpm = Math.max(BPM_MIN, Math.round(rawAnchor) - 12); bpm <= Math.min(BPM_MAX, Math.round(rawAnchor) + 12); bpm += 1) {
      candidateValues.add(bpm);
    }

    const scored = Array.from(candidateValues)
      .map((bpm) => {
        const scoredCandidate = scoreFixedBpm(bpm);
        if (!scoredCandidate) return null;
        const nearestRaw = byRawScore.slice(0, 12).reduce((best, raw) => Math.min(best, Math.abs(raw.bpm - bpm)), Infinity);
        const rawCloseness = nearestRaw <= 2 ? 1.050 : nearestRaw <= 6 ? 1.028 : nearestRaw <= 12 ? 1.008 : 0.90;
        return {
          ...scoredCandidate,
          adjustedScore: scoredCandidate.adjustedScore * rawCloseness,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.adjustedScore - a.adjustedScore);

    if (!scored.length) return null;

    const best = scored[0];
    const roundedRaw = Math.round(rawAnchor);
    const rawFallback = scored.find((candidate) => Math.abs(candidate.bpm - roundedRaw) <= 1);
    const selected = rawFallback && rawFallback.adjustedScore >= best.adjustedScore * 0.90 ? rawFallback : best;
    /*
      The first pass identifies the musical BPM family. This second pass
      measures the complete track at sub-hundredth precision. A constant
      170.06 BPM track must not be forced onto a 170.00 BPM grid, because
      that tiny difference becomes visibly late near the end of the song.
    */
    const scorePreciseBpm = (
      bpm,
      seedPhase = selected.phase
    ) => {
      const lag =
        (60 * fps) /
        Math.max(1, bpm);

      if (
        !Number.isFinite(lag) ||
        lag < 2
      ) {
        return null;
      }

      const phaseRadius =
        lag * 0.22;

      const phaseSteps = 7;
      let preciseBest = null;

      for (
        let phaseIndex = 0;
        phaseIndex < phaseSteps;
        phaseIndex += 1
      ) {
        const phaseOffset =
          phaseSteps <= 1
            ? 0
            : -phaseRadius +
              (
                (
                  phaseIndex /
                  (phaseSteps - 1)
                ) *
                phaseRadius *
                2
              );

        let phase =
          (
            Number(seedPhase) ||
            0
          ) +
          phaseOffset;

        phase =
          (
            (
              phase % lag
            ) +
            lag
          ) %
          lag;

        const segmentScores = [
          {
            hit: 0,
            miss: 0,
            weight: 0,
          },
          {
            hit: 0,
            miss: 0,
            weight: 0,
          },
          {
            hit: 0,
            miss: 0,
            weight: 0,
          },
          {
            hit: 0,
            miss: 0,
            weight: 0,
          },
        ];

        const firstBeat =
          Math.floor(
            (
              analyseStart -
              phase
            ) /
            lag
          ) - 2;

        const lastBeat =
          Math.ceil(
            (
              analyseEnd -
              phase
            ) /
            lag
          ) + 2;

        for (
          let beat = firstBeat;
          beat <= lastBeat;
          beat += 1
        ) {
          const position =
            phase +
            beat * lag;

          if (
            position <
              analyseStart ||
            position >
              analyseEnd
          ) {
            continue;
          }

          const index = Math.max(
            0,
            Math.min(
              activeMask.length - 1,
              Math.round(position)
            )
          );

          const activeWeight =
            activeMask[index]
              ? 1
              : 0.28;

          const barWeight =
            beat % 4 === 0
              ? 1.12
              : 1;

          const centre =
            sampleWeighted(
              position
            );

          const shoulders =
            (
              sampleWeighted(
                position -
                  lag * 0.10
              ) +
              sampleWeighted(
                position +
                  lag * 0.10
              )
            ) *
            0.16;

          const offBeat =
            sampleWeighted(
              position +
                lag * 0.5
            ) *
            0.34;

          const progress =
            (
              position -
              analyseStart
            ) /
            Math.max(
              1,
              analyseEnd -
                analyseStart
            );

          const segmentIndex =
            Math.max(
              0,
              Math.min(
                3,
                Math.floor(
                  progress * 4
                )
              )
            );

          const segment =
            segmentScores[
              segmentIndex
            ];

          const weight =
            activeWeight *
            barWeight;

          segment.hit +=
            (
              centre +
              shoulders
            ) *
            weight;

          segment.miss +=
            offBeat *
            activeWeight;

          segment.weight +=
            weight;
        }

        const usable =
          segmentScores
            .filter(
              (segment) =>
                segment.weight > 2
            )
            .map(
              (segment) =>
                (
                  segment.hit -
                  segment.miss
                ) /
                Math.max(
                  1,
                  segment.weight
                )
            );

        if (!usable.length) {
          continue;
        }

        const mean =
          usable.reduce(
            (sum, value) =>
              sum + value,
            0
          ) /
          usable.length;

        const ordered =
          usable
            .slice()
            .sort(
              (a, b) => a - b
            );

        const median =
          ordered[
            Math.floor(
              ordered.length / 2
            )
          ] || mean;

        const weakest =
          ordered[0] || mean;

        const variance =
          usable.reduce(
            (sum, value) =>
              sum +
              (
                (
                  value -
                  mean
                ) ** 2
              ),
            0
          ) /
          usable.length;

        const consistencyPenalty =
          Math.sqrt(
            Math.max(
              0,
              variance
            )
          ) *
          0.16;

        const score =
          mean * 0.68 +
          median * 0.22 +
          weakest * 0.10 -
          consistencyPenalty;

        if (
          !preciseBest ||
          score >
            preciseBest.score
        ) {
          preciseBest = {
            bpm,
            lag,
            phase,
            score,
          };
        }
      }

      return preciseBest;
    };

    const precisionAnchor =
      Number(
        selected.bpm.toFixed(3)
      );

    let preciseCandidates = [];

    for (
      let offset = -0.35;
      offset <= 0.3501;
      offset += 0.01
    ) {
      const bpm = Number(
        (
          precisionAnchor +
          offset
        ).toFixed(3)
      );

      if (
        bpm < BPM_MIN ||
        bpm > BPM_MAX
      ) {
        continue;
      }

      const candidate =
        scorePreciseBpm(bpm);

      if (candidate) {
        preciseCandidates.push(
          candidate
        );
      }
    }

    preciseCandidates.sort(
      (a, b) =>
        b.score - a.score
    );

    const coarsePrecise =
      preciseCandidates[0] ||
      scorePreciseBpm(
        selected.bpm
      );

    if (coarsePrecise) {
      const fineCandidates = [];

      for (
        let offset = -0.02;
        offset <= 0.0201;
        offset += 0.001
      ) {
        const bpm = Number(
          (
            coarsePrecise.bpm +
            offset
          ).toFixed(3)
        );

        if (
          bpm < BPM_MIN ||
          bpm > BPM_MAX
        ) {
          continue;
        }

        const candidate =
          scorePreciseBpm(
            bpm,
            coarsePrecise.phase
          );

        if (candidate) {
          fineCandidates.push(
            candidate
          );
        }
      }

      if (
        fineCandidates.length
      ) {
        fineCandidates.sort(
          (a, b) =>
            b.score - a.score
        );

        preciseCandidates =
          fineCandidates.concat(
            preciseCandidates
          );
      }
    }

    const preciseSelected =
      preciseCandidates[0] ||
      {
        bpm: selected.bpm,
        phase: selected.phase,
        score: selected.score,
      };

    const nearestWholeBpm =
      Math.round(
        preciseSelected.bpm
      );

    const finalBpm =
      Math.abs(
        preciseSelected.bpm -
        nearestWholeBpm
      ) <= 0.008
        ? nearestWholeBpm
        : preciseSelected.bpm;

    const energyScale =
      Math.max(
        0.0001,
        ceiling * 0.70
      );

    const confidence =
      clampUnit(
        preciseSelected.score /
        energyScale
      );

    const topCandidates =
      preciseCandidates
        .slice(0, 10)
        .map((candidate) => ({
          bpm: Number(
            candidate.bpm.toFixed(3)
          ),

          score: Number(
            candidate.score.toFixed(6)
          ),

          adjustedScore: Number(
            candidate.score.toFixed(6)
          ),
        }));

    return {
      bpm: Number(
        finalBpm.toFixed(3)
      ),

      rawBpm: Number(
        rawAnchor.toFixed(3)
      ),

      downbeat: Number(
        Math.max(
          0,
          preciseSelected.phase /
          fps
        ).toFixed(6)
      ),

      confidence: Number(
        confidence.toFixed(3)
      ),

      candidates:
        topCandidates,

      source:
        "precise-grid-v1",
    };
  };

  const KEY_PROFILES = {
    major: [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88],
    minor: [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17],
  };
  const KEY_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const CAMELOT_MAJOR = ["8B", "3B", "10B", "5B", "12B", "7B", "2B", "9B", "4B", "11B", "6B", "1B"];
  const CAMELOT_MINOR = ["5A", "12A", "7A", "2A", "9A", "4A", "11A", "6A", "1A", "8A", "3A", "10A"];

  const goertzelPower = (samples, start, size, sampleRate, frequency) => {
    const omega = (2 * Math.PI * frequency) / sampleRate;
    const coeff = 2 * Math.cos(omega);
    let s0 = 0;
    let s1 = 0;
    let s2 = 0;
    for (let offset = 0; offset < size; offset += 1) {
      const window = 0.5 - (0.5 * Math.cos((2 * Math.PI * offset) / Math.max(1, size - 1)));
      s0 = ((samples[start + offset] || 0) * window) + coeff * s1 - s2;
      s2 = s1;
      s1 = s0;
    }
    return Math.max(0, (s1 * s1) + (s2 * s2) - coeff * s1 * s2);
  };

  const estimateKey = (buffer) => {
    if (!buffer || !buffer.length || !buffer.numberOfChannels) return null;
    const sampleRate = Math.max(8000, buffer.sampleRate || 44100);
    const length = buffer.length || 0;
    const data = buffer.getChannelData(0);
    const windowSize = Math.min(4096, Math.max(1024, 2 ** Math.floor(Math.log2(sampleRate * 0.08))));
    const windows = Math.max(12, Math.min(48, Math.floor((buffer.duration || 0) * 0.10)));
    const chroma = Array(12).fill(0);

    for (let win = 0; win < windows; win += 1) {
      const start = Math.max(0, Math.min(length - windowSize, Math.floor(((win + 0.5) / windows) * Math.max(1, length - windowSize))));
      for (let midi = 36; midi <= 84; midi += 1) {
        const frequency = 440 * (2 ** ((midi - 69) / 12));
        if (frequency >= sampleRate / 2) continue;
        const power = goertzelPower(data, start, windowSize, sampleRate, frequency);
        chroma[((midi % 12) + 12) % 12] += Math.log1p(power) * (midi < 48 ? 0.55 : midi > 76 ? 0.72 : 1);
      }
    }

    const mean = chroma.reduce((sum, value) => sum + value, 0) / 12;
    const centred = chroma.map((value) => value - mean);
    const scoreProfile = (profile, root) => {
      const profileMean = profile.reduce((sum, value) => sum + value, 0) / 12;
      let score = 0;
      for (let index = 0; index < 12; index += 1) {
        score += centred[index] * (profile[(index - root + 12) % 12] - profileMean);
      }
      return score;
    };

    let best = { root: 0, mode: "major", score: -Infinity };
    let second = -Infinity;
    for (let root = 0; root < 12; root += 1) {
      ["major", "minor"].forEach((mode) => {
        const score = scoreProfile(KEY_PROFILES[mode], root);
        if (score > best.score) {
          second = best.score;
          best = { root, mode, score };
        } else if (score > second) {
          second = score;
        }
      });
    }

    const confidence = clampUnit((best.score - second) / Math.max(1, Math.abs(best.score)) * 3.2);
    const camelot = best.mode === "major" ? CAMELOT_MAJOR[best.root] : CAMELOT_MINOR[best.root];
    return {
      name: `${KEY_NAMES[best.root]} ${best.mode}`,
      camelot,
      confidence: Number(confidence.toFixed(3)),
    };
  };

  const analyseAudioBuffer = (buffer, options = {}) => {
    if (!buffer || !buffer.length || !buffer.numberOfChannels) {
      return { peaks: [], bands: null, version: "spectral-empty" };
    }

    const duration = Math.max(0, buffer.duration || 0);
    const requestedColumns = Number(options.columns) || (duration > 600 ? 49152 : 32768);
    const columnCount = Math.max(2048, Math.min(49152, Math.round(requestedColumns)));
    const channelCount = Math.max(1, buffer.numberOfChannels || 1);
    const sampleRate = Math.max(8000, buffer.sampleRate || 44100);
    const sampleCount = buffer.length || 0;
    const samplesPerColumn = Math.max(1, Math.floor(sampleCount / columnCount));
    const readCap = Math.max(220, Math.min(520, Number(options.readCap) || 360));
    const channels = Array.from({ length: channelCount }, (_, channel) => buffer.getChannelData(channel));
    const states = Array.from({ length: channelCount }, () => ({
      sub: 0,
      low: 0,
      lowMid: 0,
      mid: 0,
      highMid: 0,
      high: 0,
      previousHigh: 0,
      previousValue: 0,
    }));

    const coeff = (hz) => 1 - Math.exp((-2 * Math.PI * hz) / sampleRate);
    const subCoeff = coeff(90);
    const lowCoeff = coeff(230);
    const lowMidCoeff = coeff(620);
    const midCoeff = coeff(1800);
    const highMidCoeff = coeff(4200);
    const highCoeff = coeff(7600);

    const peak = [];
    const rms = [];
    const sub = [];
    const low = [];
    const lowMid = [];
    const mid = [];
    const highMid = [];
    const high = [];
    const air = [];
    const transient = [];

    for (let column = 0; column < columnCount; column += 1) {
      const start = column * samplesPerColumn;
      const end = column === columnCount - 1 ? sampleCount : Math.min(sampleCount, start + samplesPerColumn);
      const step = Math.max(1, Math.floor((end - start) / readCap));
      let peakValue = 0;
      let rmsEnergy = 0;
      let subEnergy = 0;
      let lowEnergy = 0;
      let lowMidEnergy = 0;
      let midEnergy = 0;
      let highMidEnergy = 0;
      let highEnergy = 0;
      let airEnergy = 0;
      let transientEnergy = 0;
      let reads = 0;

      for (let index = start; index < end; index += step) {
        for (let channel = 0; channel < channelCount; channel += 1) {
          const state = states[channel];
          const value = channels[channel][index] || 0;
          const absValue = Math.abs(value);
          if (absValue > peakValue) peakValue = absValue;

          state.sub += subCoeff * (value - state.sub);
          state.low += lowCoeff * (value - state.low);
          state.lowMid += lowMidCoeff * (value - state.lowMid);
          state.mid += midCoeff * (value - state.mid);
          state.highMid += highMidCoeff * (value - state.highMid);
          state.high += highCoeff * (value - state.high);

          const subSample = state.sub;
          const lowSample = state.low - state.sub;
          const lowMidSample = state.lowMid - state.low;
          const midSample = state.mid - state.lowMid;
          const highMidSample = state.highMid - state.mid;
          const highSample = state.high - state.highMid;
          const airSample = value - state.high;
          const transientSample = Math.abs((value - state.previousValue) * 0.56) + Math.abs(airSample - state.previousHigh);

          rmsEnergy += value * value;
          subEnergy += subSample * subSample;
          lowEnergy += lowSample * lowSample;
          lowMidEnergy += lowMidSample * lowMidSample;
          midEnergy += midSample * midSample;
          highMidEnergy += highMidSample * highMidSample;
          highEnergy += highSample * highSample;
          airEnergy += airSample * airSample;
          transientEnergy += transientSample;

          state.previousHigh = airSample;
          state.previousValue = value;
          reads += 1;
        }
      }

      const divisor = Math.max(1, reads);
      const rmsValue = Math.sqrt(rmsEnergy / divisor);
      peak.push(Math.min(1, (peakValue * 0.88) + (rmsValue * 0.42)));
      rms.push(rmsValue);
      sub.push(Math.sqrt(subEnergy / divisor));
      low.push(Math.sqrt(lowEnergy / divisor));
      lowMid.push(Math.sqrt(lowMidEnergy / divisor));
      mid.push(Math.sqrt(midEnergy / divisor));
      highMid.push(Math.sqrt(highMidEnergy / divisor));
      high.push(Math.sqrt(highEnergy / divisor));
      air.push(Math.sqrt(airEnergy / divisor));
      transient.push(transientEnergy / divisor);
    }

    const peaks = normaliseSeries(smoothSeries(peak, 1, 0.90), { percentile: 0.965, power: 0.78, trim: 1.08 });
    const bands = {
      rms: normaliseSeries(smoothSeries(rms, 1, 0.88), { percentile: 0.955, power: 0.82, trim: 1.04 }),
      sub: normaliseSeries(smoothSeries(sub, 1, 0.90), { percentile: 0.955, power: 0.82, trim: 1.10 }),
      low: normaliseSeries(smoothSeries(low, 1, 0.90), { percentile: 0.955, power: 0.82, trim: 1.10 }),
      lowMid: normaliseSeries(smoothSeries(lowMid, 1, 0.88), { percentile: 0.945, power: 0.84, trim: 1.08 }),
      mid: normaliseSeries(smoothSeries(mid, 1, 0.88), { percentile: 0.945, power: 0.86, trim: 1.06 }),
      highMid: normaliseSeries(smoothSeries(highMid, 1, 0.90), { percentile: 0.94, power: 0.78, trim: 1.04 }),
      high: normaliseSeries(smoothSeries(high, 1, 0.92), { percentile: 0.935, power: 0.72, trim: 1.03 }),
      air: normaliseSeries(smoothSeries(air, 1, 0.94), { percentile: 0.93, power: 0.68, trim: 1.02 }),
      transient: normaliseSeries(smoothSeries(transient, 1, 0.96), { percentile: 0.945, power: 0.52, trim: 1.12 }),
    };

    bands.lowBody = bands.low.map((value, index) => Math.max(value, (bands.sub[index] || 0) * 0.82, (bands.rms[index] || 0) * 0.40));
    bands.midBody = bands.mid.map((value, index) => Math.max(value, (bands.lowMid[index] || 0) * 0.78, (bands.highMid[index] || 0) * 0.42));
    bands.highBody = bands.high.map((value, index) => Math.max(value, (bands.air[index] || 0) * 0.82, (bands.highMid[index] || 0) * 0.38));

    const tempo = estimateTempoAndDownbeat(bands, duration);
    const key = estimateKey(buffer);
    return {
      peaks,
      bands,
      analysis: {
        bpm: tempo?.bpm || null,
        rawBpm: tempo?.rawBpm || tempo?.bpm || null,
        downbeat: tempo?.downbeat || 0,
        tempoConfidence: tempo?.confidence || 0,
        tempoSource: tempo?.source || "analysis",
        tempoCandidates: tempo?.candidates || [],
        key: key?.camelot || "",
        keyName: key?.name || "",
        keyConfidence: key?.confidence || 0,
      },
      version: `spectral-v4-grid-${columnCount}`,
    };
  };
	
  const analysePreparedWaveform = (waveform = {}) => {
    const peaks = Array.isArray(waveform?.peaks)
      ? waveform.peaks.map((value) => clampUnit(value))
      : [];

    const duration = Math.max(
      0,
      Number(waveform?.duration) || 0
    );

    if (!duration || peaks.length < 96) {
      return null;
    }

    const inputBands =
      waveform?.bands &&
      typeof waveform.bands === "object"
        ? waveform.bands
        : {};

    const readBand = (
      name,
      fallbackFactor = 1
    ) => {
      const values = Array.isArray(
        inputBands?.[name]
      )
        ? inputBands[name]
        : [];

      return peaks.map((peak, index) =>
        clampUnit(
          values.length
            ? values[
                Math.min(
                  values.length - 1,
                  index
                )
              ]
            : peak * fallbackFactor
        )
      );
    };

    const low = readBand("low", 0.88);
    const mid = readBand("mid", 0.52);
    const high = readBand("high", 0.28);

    const energy = peaks.map(
      (peak, index) =>
        Math.max(
          peak * 0.52,
          (low[index] || 0) * 1,
          (mid[index] || 0) * 0.56,
          (high[index] || 0) * 0.24
        )
    );

    const transientRaw = energy.map(
      (value, index) => {
        const previous =
          energy[
            Math.max(0, index - 1)
          ] || 0;

        const previousTwo =
          energy[
            Math.max(0, index - 2)
          ] || 0;

        const flux = Math.max(
          0,
          value - previous * 0.9
        );

        const longerFlux = Math.max(
          0,
          value - previousTwo * 0.82
        );

        return (
          flux * 0.78 +
          longerFlux * 0.22 +
          value * 0.08
        );
      }
    );

    const bands = {
      rms: peaks,
      low,
      mid,
      high,

      lowBody: low.map(
        (value, index) =>
          Math.max(
            value,
            (peaks[index] || 0) * 0.42
          )
      ),

      highBody: high.map(
        (value, index) =>
          Math.max(
            value,
            (mid[index] || 0) * 0.28
          )
      ),

      transient: normaliseSeries(
        smoothSeries(
          transientRaw,
          1,
          0.96
        ),
        {
          percentile: 0.945,
          power: 0.52,
          trim: 1.12,
        }
      ),
    };

    const tempo =
      estimateTempoAndDownbeat(
        bands,
        duration,
        {
          bpmHint:
            waveform?.item?.bpm ||
            waveform?.item?.djGridRawBpm ||
            waveform?.item?.djGridBpm ||
            null,
        }
      );

    if (!tempo?.bpm) {
      return null;
    }

    return {
      bpm: tempo.bpm,

      rawBpm:
        tempo.rawBpm ||
        tempo.bpm,

      downbeat:
        tempo.downbeat || 0,

      tempoConfidence:
        tempo.confidence || 0,

      tempoSource:
        tempo.source ||
        "precise-grid-v1",

      tempoCandidates:
        Array.isArray(
          tempo.candidates
        )
          ? tempo.candidates
          : [],
    };
  };

  const palettes = {
    blue: {
      mode: "blue",
      background: "#01040b",
      low: "rgba(6,31,92,0.98)",
      lowGlow: "rgba(9,64,151,0.76)",
      mid: "rgba(69,171,245,0.72)",
      high: "rgba(226,250,255,0.90)",
      edge: "rgba(255,255,255,0.46)",
      base: "rgba(123,216,255,0.07)",
      played: "rgba(0,0,0,0.34)",
      grid: "rgba(107,195,255,0.14)",
      gridBar: "rgba(74,178,255,0.92)",
      gridOne: "rgba(255,64,88,0.96)",
      cue: "rgba(242,160,7,0.92)",
      playhead: "rgba(255,48,68,0.96)",
    },
    rgb: {
      mode: "rgb",
      background: "#01040b",
      low: "rgba(236,35,58,0.95)",
      lowGlow: "rgba(170,22,42,0.56)",
      mid: "rgba(242,160,7,0.82)",
      midAlt: "rgba(65,218,110,0.58)",
      high: "rgba(78,166,255,0.84)",
      edge: "rgba(240,252,255,0.54)",
      base: "rgba(255,255,255,0.06)",
      played: "rgba(0,0,0,0.34)",
      grid: "rgba(108,196,255,0.14)",
      gridBar: "rgba(74,178,255,0.92)",
      gridOne: "rgba(255,64,88,0.96)",
      cue: "rgba(242,160,7,0.94)",
      playhead: "rgba(255,48,68,0.96)",
    },
    threeband: {
      mode: "threeband",
      background: "#01040b",
      low: "rgba(43,104,242,0.96)",
      lowGlow: "rgba(10,52,142,0.62)",
      mid: "rgba(242,160,7,0.88)",
      high: "rgba(255,255,255,0.88)",
      edge: "rgba(255,255,255,0.44)",
      base: "rgba(255,255,255,0.06)",
      played: "rgba(0,0,0,0.34)",
      grid: "rgba(108,196,255,0.14)",
      gridBar: "rgba(74,178,255,0.92)",
      gridOne: "rgba(255,64,88,0.96)",
      cue: "rgba(242,160,7,0.94)",
      playhead: "rgba(255,48,68,0.96)",
    },
    brmedia: {
      mode: "brmedia",
      background: "#01040b",
      low: "rgba(4,28,82,0.98)",
      lowGlow: "rgba(9,60,146,0.68)",
      mid: "rgba(242,160,7,0.90)",
      high: "rgba(123,216,255,0.90)",
      edge: "rgba(246,254,255,0.48)",
      base: "rgba(123,216,255,0.065)",
      played: "rgba(0,0,0,0.34)",
      grid: "rgba(108,196,255,0.14)",
      gridBar: "rgba(74,178,255,0.92)",
      gridOne: "rgba(255,64,88,0.96)",
      cue: "rgba(242,160,7,0.94)",
      playhead: "rgba(255,48,68,0.96)",
    },
  };

  const getPalette = (mode = "blue") => palettes[mode] || palettes.blue;

  const getCanvas = (target) => {
    if (!target) return null;
    let canvas = target.querySelector(":scope > canvas.brDjRealWaveCanvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.className = "brDjRealWaveCanvas";
      canvas.setAttribute("aria-hidden", "true");
      target.appendChild(canvas);
    }
    return canvas;
  };

  const bandAt = (bands, name, index, fallback = 0) => {
    const values = bands?.[name];
    if (!Array.isArray(values) || !values.length) return fallback;
    return clampUnit(values[Math.max(0, Math.min(values.length - 1, index))] ?? fallback);
  };

  const collectVisiblePoints = (peaks, bands, options = {}) => {
    const total = Math.max(
      1,
      peaks.length - 1
    );

    const startIndex = Math.max(
      0,
      Math.floor(
        options.startIndex || 0
      )
    );

    const endIndex = Math.min(
      peaks.length - 1,
      Math.ceil(
        options.endIndex ??
        peaks.length - 1
      )
    );

    const maxPoints = Math.max(
      120,
      Math.floor(
        options.maxPoints || 1200
      )
    );

    const bucketSpan = Math.max(
      1,
      Math.ceil(
        (
          endIndex -
          startIndex +
          1
        ) /
        maxPoints
      )
    );

    const xForIndex =
      typeof options.xForIndex ===
      "function"
        ? options.xForIndex
        : () => 0;

    const compact =
      Boolean(options.compact);

    const rawPoints = [];

    const bandWithFallback = (
      primaryName,
      secondaryName,
      sampleIndex,
      fallback
    ) => {
      const primary =
        bands?.[primaryName];

      if (
        Array.isArray(primary) &&
        primary.length
      ) {
        return bandAt(
          bands,
          primaryName,
          sampleIndex,
          fallback
        );
      }

      return bandAt(
        bands,
        secondaryName,
        sampleIndex,
        fallback
      );
    };

    for (
      let index = startIndex;
      index <= endIndex;
      index += bucketSpan
    ) {
      const bucketEnd = Math.min(
        endIndex,
        index + bucketSpan - 1
      );

      const centreIndex = Math.round(
        (index + bucketEnd) / 2
      );

      let peakMax = 0;
      let peakSum = 0;

      let lowMax = 0;
      let lowSum = 0;

      let midMax = 0;
      let midSum = 0;

      let highMax = 0;
      let highSum = 0;

      let transientMax = 0;

      let rmsMax = 0;
      let rmsSum = 0;

      let reads = 0;

      for (
        let sampleIndex = index;
        sampleIndex <= bucketEnd;
        sampleIndex += 1
      ) {
        const nextPeak = clampUnit(
          peaks[sampleIndex]
        );

        /*
          Server-prepared waveforms provide low,
          mid and high. Browser analysis may also
          provide the richer *Body versions.
        */
        const nextLow =
          bandWithFallback(
            "lowBody",
            "low",
            sampleIndex,
            nextPeak * 0.58
          );

        const nextMid =
          bandWithFallback(
            "midBody",
            "mid",
            sampleIndex,
            nextPeak * 0.34
          );

        const nextHigh =
          bandWithFallback(
            "highBody",
            "high",
            sampleIndex,
            nextPeak * 0.16
          );

        const nextRms = bandAt(
          bands,
          "rms",
          sampleIndex,

          (
            nextPeak * 0.34
          ) +
          (
            nextLow * 0.24
          )
        );

        const previousIndex =
          Math.max(
            0,
            sampleIndex - 1
          );

        const previousPeak =
          clampUnit(
            peaks[previousIndex]
          );

        const previousLow =
          bandWithFallback(
            "lowBody",
            "low",
            previousIndex,
            previousPeak * 0.58
          );

        const derivedTransient =
          Math.max(
            0,

            nextPeak -
              previousPeak * 0.9,

            nextLow -
              previousLow * 0.88
          );

        const nextTransient =
          Math.max(
            bandAt(
              bands,
              "transient",
              sampleIndex,
              0
            ),

            derivedTransient
          );

        peakMax = Math.max(
          peakMax,
          nextPeak
        );

        peakSum += nextPeak;

        lowMax = Math.max(
          lowMax,
          nextLow
        );

        lowSum += nextLow;

        midMax = Math.max(
          midMax,
          nextMid
        );

        midSum += nextMid;

        highMax = Math.max(
          highMax,
          nextHigh
        );

        highSum += nextHigh;

        transientMax = Math.max(
          transientMax,
          nextTransient
        );

        rmsMax = Math.max(
          rmsMax,
          nextRms
        );

        rmsSum += nextRms;
        reads += 1;
      }

      const divisor =
        Math.max(1, reads);

      /*
        Blend maximum and average energy. Pure
        maximum-only rendering is what turned loud
        mastered sections into solid blocks.
      */
      rawPoints.push({
        x: xForIndex(centreIndex),

        ratio:
          centreIndex / total,

        peak:
          (
            peakMax * 0.64
          ) +
          (
            (
              peakSum /
              divisor
            ) * 0.36
          ),

        low:
          (
            lowMax * 0.6
          ) +
          (
            (
              lowSum /
              divisor
            ) * 0.4
          ),

        mid:
          (
            midMax * 0.54
          ) +
          (
            (
              midSum /
              divisor
            ) * 0.46
          ),

        high:
          (
            highMax * 0.5
          ) +
          (
            (
              highSum /
              divisor
            ) * 0.5
          ),

        rms:
          (
            rmsMax * 0.38
          ) +
          (
            (
              rmsSum /
              divisor
            ) * 0.62
          ),

        transient:
          transientMax,
      });
    }

    if (!rawPoints.length) {
      return rawPoints;
    }

    const buildStats = (
      name,
      floorPercentile = 0.12,
      ceilingPercentile = 0.97
    ) => {
      const values =
        rawPoints.map(
          (point) =>
            Number(point[name]) || 0
        );

      const floor =
        percentile(
          values,
          floorPercentile
        ) * 0.48;

      const ceiling = Math.max(
        floor + 0.0001,

        percentile(
          values,
          ceilingPercentile
        )
      );

      return {
        floor,
        ceiling,
      };
    };

    const shapeValue = (
      value,
      stats,
      power
    ) => {
      const normalised =
        clampUnit(
          (
            (
              Number(value) || 0
            ) -
            stats.floor
          ) /
          Math.max(
            0.0001,

            stats.ceiling -
              stats.floor
          )
        );

      /*
        Powers above one reduce middle-level
        saturation while preserving strong peaks.
      */
      return clampUnit(
        Math.pow(
          normalised,
          power
        )
      );
    };

    const peakStats =
      buildStats(
        "peak",
        0.1,
        0.975
      );

    const lowStats =
      buildStats(
        "low",
        0.1,
        0.97
      );

    const midStats =
      buildStats(
        "mid",
        0.12,
        0.965
      );

    const highStats =
      buildStats(
        "high",
        0.14,
        0.96
      );

    const rmsStats =
      buildStats(
        "rms",
        0.1,
        0.97
      );

    const transientStats =
      buildStats(
        "transient",
        0.2,
        0.94
      );

    const rawAttacks =
      rawPoints.map(
        (point, index) => {
          let previousPeak = 0;
          let previousLow = 0;
          let count = 0;

          for (
            let offset = 1;
            offset <= 4;
            offset += 1
          ) {
            const previous =
              rawPoints[
                Math.max(
                  0,
                  index - offset
                )
              ];

            if (!previous) continue;

            previousPeak +=
              Number(
                previous.peak
              ) || 0;

            previousLow +=
              Number(
                previous.low
              ) || 0;

            count += 1;
          }

          const divisor =
            Math.max(1, count);

          previousPeak /=
            divisor;

          previousLow /=
            divisor;

          return Math.max(
            Number(
              point.transient
            ) || 0,

            (
              Number(
                point.peak
              ) || 0
            ) -
              previousPeak * 0.92,

            (
              Number(
                point.low
              ) || 0
            ) -
              previousLow * 0.9,

            0
          );
        }
      );

    const attackCeiling =
      Math.max(
        0.0001,

        percentile(
          rawAttacks,
          0.92
        )
      );

    let decayingAttack = 0;

    return rawPoints.map(
      (point, index) => {
        const peak = shapeValue(
          point.peak,
          peakStats,
          compact ? 1.06 : 1.34
        );

        const low = shapeValue(
          point.low,
          lowStats,
          compact ? 1.04 : 1.3
        );

        const mid = shapeValue(
          point.mid,
          midStats,
          compact ? 1.08 : 1.38
        );

        const high = shapeValue(
          point.high,
          highStats,
          compact ? 1.04 : 1.32
        );

        const body = shapeValue(
          Math.max(
            point.rms,
            point.low * 0.54,
            point.peak * 0.38
          ),

          rmsStats,

          compact ? 1.02 : 1.42
        );

        const sourceTransient =
          shapeValue(
            point.transient,
            transientStats,
            compact ? 0.82 : 0.68
          );

        const rawAttack =
          clampUnit(
            rawAttacks[index] /
            attackCeiling
          );

        /*
          Fast attack plus controlled decay gives
          kicks their recognisable wedge/tail.
        */
        decayingAttack = Math.max(
          Math.pow(
            rawAttack,
            compact ? 0.82 : 0.62
          ),

          decayingAttack *
            (
              compact
                ? 0.58
                : 0.72
            )
        );

        const attack =
          clampUnit(
            decayingAttack
          );

        const transient =
          clampUnit(
            Math.max(
              sourceTransient *
                (
                  compact
                    ? 0.72
                    : 0.82
                ),

              attack
            )
          );

        const visibleLow = compact
          ? clampUnit(
              (
                low * 0.7
              ) +
              (
                body * 0.18
              ) +
              (
                attack * 0.18
              )
            )
          : clampUnit(
              (
                low * 0.54
              ) +
              (
                body * 0.16
              ) +
              (
                attack * 0.4
              )
            );

        const visibleMid = compact
          ? clampUnit(
              (
                mid * 0.52
              ) +
              (
                body * 0.15
              ) +
              (
                attack * 0.08
              )
            )
          : clampUnit(
              (
                mid * 0.36
              ) +
              (
                body * 0.13
              ) +
              (
                attack * 0.1
              )
            );

        const visibleHigh = compact
          ? clampUnit(
              (
                high * 0.36
              ) +
              (
                transient * 0.18
              )
            )
          : clampUnit(
              (
                high * 0.22
              ) +
              (
                transient * 0.2
              )
            );

        return {
          x: point.x,
          ratio: point.ratio,

          peak: clampUnit(
            Math.max(
              visibleLow,

              peak *
                (
                  compact
                    ? 0.78
                    : 0.56
                ),

              transient *
                (
                  compact
                    ? 0.82
                    : 0.96
                )
            )
          ),

          low: visibleLow,
          mid: visibleMid,
          high: visibleHigh,
          transient,
        };
      }
    );
  };

  const makeGradient = (ctx, midY, amount, colour, fadeColour) => {
    const gradient = ctx.createLinearGradient(0, midY - amount, 0, midY + amount);
    gradient.addColorStop(0, colour);
    gradient.addColorStop(0.46, fadeColour || colour);
    gradient.addColorStop(0.5, colour);
    gradient.addColorStop(0.54, fadeColour || colour);
    gradient.addColorStop(1, colour);
    return gradient;
  };

  const drawLine = (ctx, x, midY, amount, options = {}) => {
    const side = options.side || "full";
    const top = side === "bottom" ? midY : midY - amount;
    const bottom = side === "top" ? midY : midY + amount;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
  };

  const drawSpectralStrokeLayer = (ctx, points, options = {}) => {
    if (!points.length) return;

    const pixelRatio = options.pixelRatio || 1;
    const midY = options.midY || 0;
    const scale = options.scale || 1;
    const channel = options.channel || "peak";
    const minAmount = options.minAmount || 1;
    const lineWidth = options.lineWidth || 1;
    const side = options.side || "full";

    ctx.save();
    ctx.globalCompositeOperation = options.blend || "source-over";
    ctx.globalAlpha *= options.alpha ?? 1;
    ctx.strokeStyle = options.colour || "rgba(255,255,255,0.7)";
    ctx.lineWidth = Math.max(pixelRatio * 0.55, lineWidth);
    ctx.lineCap = "round";

    points.forEach((point) => {
      const amount = Math.max(minAmount, (point[channel] || point.peak || 0) * scale);
      drawLine(ctx, point.x, midY, amount, { side });
    });

    ctx.restore();
  };

  const drawFilledSpectralLayer = (
    ctx,
    points,
    options = {}
  ) => {
    if (!points.length) return;

    const midY = options.midY || 0;
    const scale = options.scale || 1;

    const side =
      options.side || "full";

    const channel =
      options.channel || "peak";

    const minAmount =
      options.minAmount || 1;

    const amountAt = (point) =>
      Math.max(
        minAmount,
        (
          point[channel] ||
          point.peak ||
          0
        ) *
          scale
      );

    ctx.save();

    ctx.globalCompositeOperation =
      options.blend ||
      "source-over";

    ctx.globalAlpha *=
      options.alpha ?? 1;

    ctx.fillStyle =
      options.colour ||
      "rgba(255,255,255,0.7)";

    ctx.beginPath();

    if (side === "top") {
      ctx.moveTo(
        points[0].x,
        midY
      );

      points.forEach((point) => {
        ctx.lineTo(
          point.x,
          midY - amountAt(point)
        );
      });

      ctx.lineTo(
        points[
          points.length - 1
        ].x,
        midY
      );
    } else if (side === "bottom") {
      ctx.moveTo(
        points[0].x,
        midY
      );

      points.forEach((point) => {
        ctx.lineTo(
          point.x,
          midY + amountAt(point)
        );
      });

      ctx.lineTo(
        points[
          points.length - 1
        ].x,
        midY
      );
    } else {
      ctx.moveTo(
        points[0].x,
        midY - amountAt(points[0])
      );

      points.forEach((point) => {
        ctx.lineTo(
          point.x,
          midY - amountAt(point)
        );
      });

      for (
        let index =
          points.length - 1;
        index >= 0;
        index -= 1
      ) {
        const point = points[index];

        ctx.lineTo(
          point.x,
          midY + amountAt(point)
        );
      }
    }

    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  const drawSpectralBody = (
    ctx,
    points,
    options = {}
  ) => {
    if (!points.length) return;

    const pixelRatio =
      options.pixelRatio || 1;

    const midY = options.midY || 0;
    const scale = options.scale || 1;

    const side =
      options.side || "full";

    const compact =
      Boolean(options.compact);

    const palette =
      options.palette ||
      palettes.blue;

    /*
      The outer low-frequency body carries the
      kick and bass shape. Its reduced floor leaves
      real valleys rather than one solid slab.
    */
    drawFilledSpectralLayer(
      ctx,
      points,
      {
        midY,

        scale:
          scale *
          (compact ? 0.96 : 1),

        channel: "low",

        colour: makeGradient(
          ctx,
          midY,
          scale,
          palette.low,
          palette.lowGlow
        ),

        alpha: compact ? 0.96 : 1,

        minAmount:
          pixelRatio *
          (compact ? 0.55 : 0.24),

        side,
      }
    );

    drawFilledSpectralLayer(
      ctx,
      points,
      {
        midY,

        scale:
          scale *
          (compact ? 0.68 : 0.62),

        channel: "mid",

        colour:
          palette.mode === "rgb"
            ? (
                palette.midAlt ||
                palette.mid
              )
            : palette.mid,

        alpha:
          compact ? 0.58 : 0.7,

        minAmount:
          pixelRatio *
          (compact ? 0.42 : 0.2),

        side,

        blend:
          palette.mode ===
          "threeband"
            ? "source-over"
            : "screen",
      }
    );

    drawFilledSpectralLayer(
      ctx,
      points,
      {
        midY,

        scale:
          scale *
          (compact ? 0.44 : 0.38),

        channel: "high",
        colour: palette.high,

        alpha:
          compact ? 0.5 : 0.68,

        minAmount:
          pixelRatio *
          (compact ? 0.34 : 0.16),

        side,

        blend:
          palette.mode ===
          "threeband"
            ? "source-over"
            : "screen",
      }
    );

    /*
      The bright onset edge exposes kicks, snares
      and drop entrances while retaining one
      continuous filled waveform.
    */
    drawSpectralStrokeLayer(
      ctx,
      points,
      {
        midY,

        scale:
          scale *
          (compact ? 0.96 : 1.04),

        channel: "transient",
        colour: palette.edge,

        alpha:
          compact ? 0.28 : 0.58,

        lineWidth:
          pixelRatio *
          (compact ? 0.58 : 0.76),

        minAmount:
          pixelRatio *
          (compact ? 0.5 : 0.22),

        pixelRatio,
        side,
        blend: "screen",
      }
    );
  };

  const drawBeatGrid = (
    ctx,
    options = {}
  ) => {
    if (!options.showBeatGrid) {
      return;
    }

    const duration = Math.max(
      0,
      Number(options.duration) || 0
    );

    const beatGrid =
      options.beatGrid || {};

    const rawBpm =
      Number(beatGrid.bpm);

    const bpm =
      rawBpm >= 40 &&
      rawBpm <= 260
        ? rawBpm
        : null;

    if (!duration || !bpm) {
      return;
    }

    const width = Math.max(
      1,
      Number(options.width) || 1
    );

    const height = Math.max(
      1,
      Number(options.height) || 1
    );

    const centreX =
      Number(options.centreX) ||
      width / 2;

    const virtualWidth =
      Number(options.virtualWidth) ||
      width;

    const progress =
      Number(options.progress) || 0;

    const fixedCentre =
      Boolean(options.fixedCentre);

    const zoom = Math.max(
      1,
      Number(options.zoom) || 32
    );

    const pixelRatio =
      options.pixelRatio || 1;

    const palette =
      options.palette ||
      palettes.blue;

    const currentTime =
      progress * duration;

    const requestedVisibleSeconds =
      Number(options.visibleSeconds);

    const visibleSeconds =
      fixedCentre &&
      Number.isFinite(
        requestedVisibleSeconds
      ) &&
      requestedVisibleSeconds > 0
        ? requestedVisibleSeconds
        : fixedCentre
          ? duration / zoom
          : duration;

    const windowStart =
      fixedCentre
        ? currentTime -
          visibleSeconds * 0.56
        : 0;

    const windowEnd =
      fixedCentre
        ? currentTime +
          visibleSeconds * 0.56
        : duration;

    const gridApi =
      window.BRMediaDjGrid;

    let markers = [];

    if (
      gridApi &&
      typeof gridApi
        .getBeatWindow ===
        "function"
    ) {
      markers =
        gridApi.getBeatWindow(
          beatGrid,
          windowStart,
          windowEnd,
          {
            duration,

            minBpm: 40,

            maxBpm: 260,

            preRollSeconds: 8,

            maxBeats: 8192,
          }
        );
    }

    /*
      Legacy fallback for a grid that has not
      yet migrated to Grid Core v2.
    */
    if (!markers.length) {
      const interval =
        60 / bpm;

      const downbeat =
        Number.isFinite(
          Number(
            beatGrid.downbeat
          )
        )
          ? Number(
              beatGrid.downbeat
            )
          : 0;

      const firstBeat =
        Math.floor(
          (
            windowStart -
            downbeat
          ) /
          interval
        ) - 2;

      const lastBeat =
        Math.ceil(
          (
            windowEnd -
            downbeat
          ) /
          interval
        ) + 2;

      for (
        let beat = firstBeat;
        beat <= lastBeat;
        beat += 1
      ) {
        const time =
          downbeat +
          beat * interval;

        markers.push({
          beat,
          time,
          bpm,

          isBar:
            (
              (
                beat % 4
              ) + 4
            ) % 4 === 0,

          isBase:
            beat === 0,
        });
      }
    }

    ctx.save();

    ctx.globalCompositeOperation =
      "source-over";

    markers.forEach((marker) => {
      const beatTime =
        Number(marker.time);

      if (
        !Number.isFinite(
          beatTime
        ) ||
        beatTime > duration
      ) {
        return;
      }

      const beatProgress =
        beatTime / duration;

      const x = fixedCentre
        ? Math.round(
            centreX +
            (
              beatProgress -
              progress
            ) *
              virtualWidth
          )
        : Math.round(
            beatProgress * width
          );

      if (
        x < -2 ||
        x > width + 2
      ) {
        return;
      }

      const isBar =
        Boolean(marker.isBar);

      const isBase =
        Boolean(marker.isBase);

      const isBeforeStart =
        beatTime < 0;

      const gridStyle =
        options.gridStyle ===
        "blue"
          ? "blue"
          : "grey";

      const beatColour =
        gridStyle === "blue"
          ? "rgba(74,178,255,0.96)"
          : "rgba(208,216,226,0.80)";

      const barColour =
        palette.gridOne ||
        "rgba(255,64,88,0.98)";

      const alpha =
        isBeforeStart
          ? 0.18
          : isBar || isBase
            ? 0.94
            : gridStyle === "blue"
              ? 0.78
              : 0.62;

      ctx.fillStyle =
        isBeforeStart
          ? "rgba(118,134,158,0.42)"
          : isBar || isBase
            ? barColour
            : beatColour;

      ctx.globalAlpha = alpha;

      const lineWidth = Math.max(
        1,

        Math.round(
          (
            isBase
              ? 3
              : isBar
                ? 2.35
                : 1.35
          ) *
            pixelRatio
        )
      );

      ctx.fillRect(
        x -
          Math.floor(
            lineWidth / 2
          ),
        0,
        lineWidth,
        height
      );

      if (!isBeforeStart) {
        ctx.globalAlpha =
          isBar || isBase
            ? 0.2
            : 0.1;

        ctx.fillStyle =
          "rgba(255,255,255,0.55)";

        ctx.fillRect(
          x -
            Math.floor(
              Math.max(
                1,
                pixelRatio
              ) / 2
            ),
          0,
          Math.max(
            1,

            Math.round(
              pixelRatio
            )
          ),
          height
        );
      }
    });

    ctx.restore();
  };
	
  const drawMinuteMarkers = (ctx, options = {}) => {
    if (!options.showMinuteMarkers) return;
    const duration = Math.max(0, Number(options.duration) || 0);
    if (!duration) return;

    const width = Math.max(1, Number(options.width) || 1);
    const height = Math.max(1, Number(options.height) || 1);
    const centreX = Number(options.centreX) || width / 2;
    const virtualWidth = Number(options.virtualWidth) || width;
    const progress = Number(options.progress) || 0;
    const fixedCentre = Boolean(options.fixedCentre);
    const pixelRatio = options.pixelRatio || 1;
    const currentTime = progress * duration;
    const zoom = Math.max(1, Number(options.zoom) || 32);
    const visibleSeconds = fixedCentre ? duration / zoom : duration;
    const windowStart = fixedCentre ? currentTime - (visibleSeconds * 0.58) : 0;
    const windowEnd = fixedCentre ? currentTime + (visibleSeconds * 0.58) : duration;
    const firstMinute = Math.max(1, Math.floor(windowStart / 60));
    const lastMinute = Math.min(Math.floor(duration / 60), Math.ceil(windowEnd / 60));
    if (lastMinute < firstMinute) return;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.font = `${Math.max(8, Math.round(8 * pixelRatio))}px system-ui, sans-serif`;

    for (let minute = firstMinute; minute <= lastMinute; minute += 1) {
      const time = minute * 60;
      const x = fixedCentre ? centreX + (((time / duration) - progress) * virtualWidth) : (time / duration) * width;
      if (x < -8 * pixelRatio || x > width + 8 * pixelRatio) continue;

      ctx.globalAlpha = 0.30;
      ctx.fillStyle = "rgba(255,255,255,0.78)";
      const lineWidth = Math.max(1, Math.round(pixelRatio * 0.75));
      ctx.fillRect(Math.round(x) - Math.floor(lineWidth / 2), 0, lineWidth, height);

      ctx.globalAlpha = 0.58;
      ctx.fillText(`${minute}m`, Math.max(14 * pixelRatio, Math.min(width - 14 * pixelRatio, x)), height - Math.max(2, 3 * pixelRatio));
    }

    ctx.restore();
  };
	
  const drawCueMemoryMarkers = (ctx, options = {}) => {
    const markers = Array.isArray(options.memoryPoints) ? options.memoryPoints : [];
    const duration = Math.max(0, Number(options.duration) || 0);
    if (!duration || !markers.length) return;

    const width = Math.max(1, Number(options.width) || 1);
    const height = Math.max(1, Number(options.height) || 1);
    const centreX = Number(options.centreX) || width / 2;
    const virtualWidth = Number(options.virtualWidth) || width;
    const progress = Number(options.progress) || 0;
    const fixedCentre = Boolean(options.fixedCentre);
    const pixelRatio = options.pixelRatio || 1;
    const labelY = fixedCentre ? Math.max(2 * pixelRatio, 8 * pixelRatio) : Math.max(2 * pixelRatio, 6 * pixelRatio);

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = `${Math.max(9, Math.round(9 * pixelRatio))}px system-ui, sans-serif`;

    markers.forEach((marker) => {
      const time = Math.max(0, Math.min(duration, Number(marker.time) || 0));
      const x = fixedCentre
        ? centreX + (((time / duration) - progress) * virtualWidth)
        : (time / duration) * width;
      if (x < -18 * pixelRatio || x > width + 18 * pixelRatio) return;

      ctx.globalAlpha = fixedCentre ? 0.92 : 0.82;
      ctx.fillStyle = "rgba(244,185,67,0.96)";
      const lineWidth = Math.max(1, Math.round(pixelRatio * 1.3));
      ctx.fillRect(Math.round(x) - Math.floor(lineWidth / 2), 0, lineWidth, height);

      const label = String(marker.label || "M").slice(0, 2);
      const boxWidth = Math.max(12 * pixelRatio, ctx.measureText(label).width + 8 * pixelRatio);
      const boxHeight = Math.max(11 * pixelRatio, 12 * pixelRatio);
      const boxX = Math.max(0, Math.min(width - boxWidth, x - (boxWidth / 2)));

      ctx.fillStyle = "rgba(244,185,67,0.96)";
      ctx.fillRect(boxX, labelY, boxWidth, boxHeight);
      ctx.fillStyle = "rgba(18,21,27,0.94)";
      ctx.fillText(label, boxX + (boxWidth / 2), labelY + Math.max(1, 1.5 * pixelRatio));
    });

    ctx.restore();
  };
	
  const drawLoopRegion = (ctx, options = {}) => {
    const loop = options.loop || {};
    const duration = Math.max(0, Number(options.duration) || 0);
    if (!duration || !loop.active) return;

    const start = Math.max(0, Math.min(duration, Number(loop.start) || 0));
    const end = Math.max(start, Math.min(duration, Number(loop.end) || 0));
    if (end - start < 0.015) return;

    const width = Math.max(1, Number(options.width) || 1);
    const height = Math.max(1, Number(options.height) || 1);
    const centreX = Number(options.centreX) || width / 2;
    const virtualWidth = Number(options.virtualWidth) || width;
    const progress = Number(options.progress) || 0;
    const fixedCentre = Boolean(options.fixedCentre);
    const pixelRatio = options.pixelRatio || 1;
    const palette = options.palette || palettes.blue;
    const startProgress = start / duration;
    const endProgress = end / duration;
    const rawStartX = fixedCentre ? centreX + ((startProgress - progress) * virtualWidth) : startProgress * width;
    const rawEndX = fixedCentre ? centreX + ((endProgress - progress) * virtualWidth) : endProgress * width;
    const left = Math.max(0, Math.min(rawStartX, rawEndX));
    const right = Math.min(width, Math.max(rawStartX, rawEndX));
    if (right <= 0 || left >= width || right - left < 1) return;

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(242,160,7,0.145)";
    ctx.fillRect(left, 0, Math.max(1, right - left), height);
    ctx.fillStyle = "rgba(242,160,7,0.92)";
    const lineWidth = Math.max(1, Math.round(pixelRatio * 1.4));
    if (rawStartX >= 0 && rawStartX <= width) ctx.fillRect(Math.round(rawStartX) - Math.floor(lineWidth / 2), 0, lineWidth, height);
    if (rawEndX >= 0 && rawEndX <= width) ctx.fillRect(Math.round(rawEndX) - Math.floor(lineWidth / 2), 0, lineWidth, height);
    ctx.fillStyle = palette.gridBar || "rgba(242,160,7,0.40)";
    ctx.globalAlpha = 0.32;
    ctx.fillRect(left, Math.max(0, height - Math.round(pixelRatio * 3)), Math.max(1, right - left), Math.max(1, Math.round(pixelRatio * 3)));
    ctx.restore();
  };

  const drawMarker = (ctx, x, height, colour, pixelRatio, widthScale = 2.4) => {
    ctx.save();
    ctx.fillStyle = colour;
    const lineWidth = Math.max(2, Math.round(pixelRatio * widthScale));
    ctx.fillRect(Math.round(x) - Math.floor(lineWidth / 2), 0, lineWidth, height);
    ctx.restore();
  };

  const drawWaveform = (target, state = {}, options = {}) => {
    const canvas = getCanvas(target);
    if (!canvas) return { hasWaveform: false };

    const rect = target.getBoundingClientRect();
    const rawCssWidth = Math.round(rect.width || target.clientWidth || 0);
    const rawCssHeight = Math.round(rect.height || target.clientHeight || 0);

    if (rawCssWidth < 24 || rawCssHeight < 12 || !target.offsetParent) {
      target.classList.add("is-waveform-layout-pending");
      return { hasWaveform: false, pendingLayout: true };
    }

    target.classList.remove("is-waveform-layout-pending");

    const cssWidth = Math.max(1, rawCssWidth);
    const cssHeight = Math.max(1, rawCssHeight);
    const pixelRatio = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    const width = Math.max(1, Math.round(cssWidth * pixelRatio));
    const height = Math.max(1, Math.round(cssHeight * pixelRatio));

    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return { hasWaveform: false };

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, width, height);

    const peaks = Array.isArray(state.waveformPeaks) ? state.waveformPeaks : [];
    const hasWaveform = peaks.length > 0 && state.isLoaded && !state.error;
    const fixedCentre = Boolean(options.fixedCentre && !options.compact);
    const waveformSide = options.waveformSide || "full";

    target.classList.toggle("has-real-waveform", hasWaveform);
    target.classList.toggle("is-fixed-centre-waveform", hasWaveform && fixedCentre);
    target.classList.toggle("is-detail-waveform-ready", hasWaveform && fixedCentre);
    target.classList.toggle("is-spectral-waveform", hasWaveform);
    target.classList.toggle("is-uhd-waveform", hasWaveform);
    target.classList.toggle("is-duo-half-waveform", hasWaveform && (waveformSide === "top" || waveformSide === "bottom"));
    target.dataset.waveformSide = waveformSide;

    if (!hasWaveform) return { hasWaveform: false };

    const palette = getPalette(options.paletteMode || "blue");
    const bands = state.waveformBands || null;
    const duration = Math.max(0, Number(state.duration) || 0);
    const currentTime = Number(state.currentTime) || 0;
    const progress = fixedCentre && duration > 0 ? currentTime / duration : clampUnit(state.progress);
    const detailZoom = fixedCentre
      ? Math.max(
          1,
          Number(options.zoom) || 32
        )
      : 1;

    const requestedVisibleSeconds =
      Number(options.visibleSeconds);

    const visibleSeconds =
      fixedCentre &&
      Number.isFinite(
        requestedVisibleSeconds
      ) &&
      requestedVisibleSeconds > 0
        ? requestedVisibleSeconds
        : duration / detailZoom;

    const centreX = width / 2;

    const virtualWidth =
      fixedCentre &&
      duration > 0 &&
      visibleSeconds > 0
        ? width *
          (
            duration /
            visibleSeconds
          )
        : fixedCentre
          ? width * detailZoom
          : width;
    const total = Math.max(1, peaks.length - 1);
    const visiblePad =
      fixedCentre && duration > 0
        ? (visibleSeconds / duration) * 0.55
        : 0;
    const visibleStart = fixedCentre ? Math.max(0, Math.floor((progress - visiblePad) * total)) : 0;
    const visibleEnd = fixedCentre ? Math.min(total, Math.ceil((progress + visiblePad) * total)) : total;
    const targetPointCount = options.compact
      ? Math.min(1800, Math.ceil(width / (0.52 * pixelRatio)))
      : Math.min(4200, Math.ceil(width / (0.22 * pixelRatio)));
    const xForIndex = (index) => {
      const ratio = index / total;
      return fixedCentre ? centreX + ((ratio - progress) * virtualWidth) : ratio * width;
    };
    const points = collectVisiblePoints(peaks, bands, {
      startIndex: visibleStart,
      endIndex: visibleEnd,
      maxPoints: targetPointCount,
      xForIndex,
      compact: Boolean(options.compact),
    }).filter((point) => point.x >= -width * 0.08 && point.x <= width * 1.08);

    const basePad = options.compact ? 2 * pixelRatio : 5 * pixelRatio;
    const midY = waveformSide === "top"
      ? height - Math.max(2, 1.5 * pixelRatio)
      : waveformSide === "bottom"
        ? Math.max(2, 1.5 * pixelRatio)
        : height / 2;
    const availableHeight = waveformSide === "full" ? Math.max(2, height - basePad * 2) : Math.max(2, height - basePad);
    const sideScale = waveformSide === "full" ? 0.46 : 0.90;

    target.dataset.brDjWaveformZoom = detailZoom.toFixed(2);
    target.dataset.waveformPalette = palette.mode;
    target.dataset.waveformVersion = state.waveformVersion || "spectral";

    ctx.save();
    ctx.fillStyle = palette.background;
    ctx.globalAlpha = 0.18;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;

    if (!fixedCentre && progress > 0 && (
      target.classList.contains("brDjDuoDeckCardWave") ||
      target.classList.contains("brDjSingleOverviewWave") ||
      target.classList.contains("brDjCueMemoryOverview")
    )) {
      ctx.fillStyle = palette.played;
      ctx.fillRect(0, 0, Math.round(progress * width), height);
    }

    if (fixedCentre) {
      ctx.fillStyle = "rgba(210,216,226,0.045)";
      ctx.fillRect(0, 0, Math.round(centreX), height);
    }

    const baselineY = waveformSide === "top"
      ? height - Math.max(1, pixelRatio)
      : waveformSide === "bottom"
        ? 0
        : Math.round(midY - 0.5 * pixelRatio);
    ctx.fillStyle = palette.base;
    ctx.fillRect(0, baselineY, width, Math.max(1, Math.round(pixelRatio)));

    drawLoopRegion(ctx, {
      width,
      height,
      centreX,
      virtualWidth,
      fixedCentre,
      progress,
      duration,
      pixelRatio,
      palette,
      loop: state.loop,
    });

    drawSpectralBody(ctx, points, {
      midY,
      scale: availableHeight * sideScale,
      palette,
      pixelRatio,
      compact: Boolean(options.compact),
      side: waveformSide,
    });

    drawBeatGrid(ctx, {
      showBeatGrid: Boolean(
        options.showBeatGrid
      ),
      width,
      height,
      centreX,
      virtualWidth,
      fixedCentre,
      zoom: detailZoom,
      visibleSeconds,
      progress,
      duration,
      pixelRatio,
      palette,
      beatGrid: options.beatGrid,
      gridStyle: options.gridStyle,
    });

    drawMinuteMarkers(ctx, {
      width,
      height,
      centreX,
      virtualWidth,
      fixedCentre,
      progress,
      duration,
      zoom: detailZoom,
      pixelRatio,
      showMinuteMarkers: options.showMinuteMarkers,
    });

    drawCueMemoryMarkers(ctx, {
      width,
      height,
      centreX,
      virtualWidth,
      fixedCentre,
      progress,
      duration,
      pixelRatio,
      memoryPoints: options.memoryPoints,
    });

    const cueProgress = duration > 0 ? ((Number(state.cuePoint) || 0) / duration) : 0;
    const cueX = fixedCentre ? centreX + ((cueProgress - progress) * virtualWidth) : cueProgress * width;
    if (duration > 0 && cueX >= 0 && cueX <= width) drawMarker(ctx, cueX, height, palette.cue, pixelRatio, 1.7);

    const playheadX = fixedCentre ? centreX : progress * width;
    drawMarker(ctx, playheadX, height, palette.playhead, pixelRatio, 2.2);
    ctx.restore();

    return { hasWaveform: true, zoom: detailZoom, palette: palette.mode };
  };

  window.BRMediaSpectralWaveform = {
    analyseAudioBuffer,
    analysePreparedWaveform,
    smoothSeries,
    normaliseSeries,
  };

  window.BRMediaDjWaveformRenderer = {
    draw: drawWaveform,
    palettes,
  };
})();