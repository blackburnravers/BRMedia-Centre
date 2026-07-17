/* BRMedia DJ Analysis Worker V3A/B
   Browser-safe prep engine: waveform energy, BPM candidates, downbeat confidence,
   grid quality and phrase hints. Ready for an Essentia.js/WASM upgrade later. */

const BPM_MIN = 80;
const BPM_MAX = 220;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function energyOfPeak(peak) {
  if (!peak) return 0;
  const low = Number(peak.low || 0);
  const mid = Number(peak.mid || 0);
  const high = Number(peak.high || 0);
  const peakValue = Number(peak.peak || Math.max(low, mid, high));
  return Math.max(0, Math.min(1, (peakValue * 0.62) + (low * 0.26) + (mid * 0.09) + (high * 0.03)));
}

function smoothEnergy(peaks) {
  const energy = peaks.map(energyOfPeak);
  const smoothed = new Array(energy.length).fill(0);

  for (let i = 0; i < energy.length; i += 1) {
    const a = energy[Math.max(0, i - 2)] || 0;
    const b = energy[Math.max(0, i - 1)] || 0;
    const c = energy[i] || 0;
    const d = energy[Math.min(energy.length - 1, i + 1)] || 0;
    const e = energy[Math.min(energy.length - 1, i + 2)] || 0;
    smoothed[i] = (a + (b * 2) + (c * 3) + (d * 2) + e) / 9;
  }

  return smoothed;
}

function detectOnsets(peaks, duration) {
  if (!peaks?.length || !duration) return [];

  const energy = smoothEnergy(peaks);
  const flux = [];
  let maxFlux = 0;

  for (let i = 1; i < energy.length; i += 1) {
    const value = Math.max(0, energy[i] - energy[i - 1]);
    flux.push(value);
    maxFlux = Math.max(maxFlux, value);
  }

  const threshold = Math.max(0.012, maxFlux * 0.32);
  const minGapSeconds = 0.115;
  const onsets = [];
  let lastTime = -999;

  for (let i = 2; i < flux.length - 2; i += 1) {
    const value = flux[i];
    if (value < threshold) continue;
    if (value < flux[i - 1] || value < flux[i + 1]) continue;

    const time = ((i + 1) / Math.max(1, peaks.length - 1)) * duration;
    if (time - lastTime < minGapSeconds) {
      if (onsets.length && value > onsets[onsets.length - 1].strength) {
        onsets[onsets.length - 1] = { time, strength: value };
        lastTime = time;
      }
      continue;
    }

    onsets.push({ time, strength: value });
    lastTime = time;
  }

  return onsets;
}

function normaliseBpm(bpm) {
  let value = Number(bpm || 0);
  if (!value) return 0;

  while (value < BPM_MIN) value *= 2;
  while (value > BPM_MAX) value /= 2;
  return clamp(value, 40, 240);
}

function estimateBpm(onsets, bpmHint = 170) {
  if (!onsets.length) return { bpm: normaliseBpm(bpmHint) || 170, confidence: 0.05 };

  const bins = new Map();
  const minInterval = 60 / BPM_MAX;
  const maxInterval = 60 / BPM_MIN;

  for (let i = 0; i < onsets.length; i += 1) {
    for (let j = i + 1; j < Math.min(onsets.length, i + 10); j += 1) {
      const interval = onsets[j].time - onsets[i].time;
      if (interval < minInterval || interval > maxInterval * 4) continue;

      [1, 2, 3, 4].forEach((division) => {
        const beatInterval = interval / division;
        if (beatInterval < minInterval || beatInterval > maxInterval) return;
        const bpm = normaliseBpm(60 / beatInterval);
        const key = String(Math.round(bpm * 2) / 2);
        const weight = (onsets[i].strength + onsets[j].strength) / Math.sqrt(division);
        bins.set(key, (bins.get(key) || 0) + weight);
      });
    }
  }

  let bestBpm = normaliseBpm(bpmHint) || 170;
  let bestScore = 0;
  let totalScore = 0;

  bins.forEach((score, key) => {
    const bpm = Number(key);
    totalScore += score;
    const hint = normaliseBpm(bpmHint) || bpm;
    const hintBonus = Math.max(0.75, 1 - Math.abs(bpm - hint) / 60);
    const adjusted = score * hintBonus;
    if (adjusted > bestScore) {
      bestScore = adjusted;
      bestBpm = bpm;
    }
  });

  const confidence = totalScore > 0 ? clamp(bestScore / totalScore, 0.05, 0.96) : 0.08;
  return { bpm: bestBpm, confidence };
}

function chooseDownbeat(onsets, bpm, duration) {
  if (!onsets.length) return 0;

  const interval = 60 / Math.max(40, bpm || 170);
  const searchLimit = Math.min(duration || 30, 32);
  const strong = onsets
    .filter((onset) => onset.time <= searchLimit)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 16)
    .sort((a, b) => a.time - b.time);

  if (!strong.length) return onsets[0].time || 0;

  let best = strong[0];
  let bestScore = -Infinity;

  strong.forEach((candidate) => {
    let score = candidate.strength * 2;
    for (let beat = 1; beat <= 16; beat += 1) {
      const expected = candidate.time + (beat * interval);
      const match = onsets.find((onset) => Math.abs(onset.time - expected) < interval * 0.18);
      if (match) score += match.strength * (beat % 4 === 0 ? 1.4 : 0.75);
    }
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  });

  return Math.max(0, best.time || 0);
}

function buildTempoCandidates(onsets, bpmHint = 170) {
  if (!onsets.length) return [{ bpm: normaliseBpm(bpmHint) || 170, score: 0.01 }];

  const bins = new Map();
  const minInterval = 60 / BPM_MAX;
  const maxInterval = 60 / BPM_MIN;

  for (let i = 0; i < onsets.length; i += 1) {
    for (let j = i + 1; j < Math.min(onsets.length, i + 14); j += 1) {
      const interval = onsets[j].time - onsets[i].time;
      if (interval < minInterval || interval > maxInterval * 8) continue;

      [1, 2, 3, 4, 8].forEach((division) => {
        const beatInterval = interval / division;
        if (beatInterval < minInterval || beatInterval > maxInterval) return;
        const bpm = normaliseBpm(60 / beatInterval);
        const key = String(Math.round(bpm * 2) / 2);
        const distanceFromHint = Math.abs((normaliseBpm(bpmHint) || bpm) - bpm);
        const hintWeight = Math.max(0.72, 1 - distanceFromHint / 80);
        const strength = (onsets[i].strength + onsets[j].strength) / Math.sqrt(division);
        bins.set(key, (bins.get(key) || 0) + (strength * hintWeight));
      });
    }
  }

  return Array.from(bins.entries())
    .map(([bpm, score]) => ({ bpm: Number(bpm), score: Number(score || 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

function scoreGrid(onsets, bpm, downbeat, duration) {
  if (!onsets.length || !bpm) return { score: 0, matched: 0, expected: 0, phraseOffset: 0 };

  const interval = 60 / Math.max(40, bpm || 170);
  const expected = Math.min(96, Math.max(8, Math.floor(((duration || 60) - downbeat) / interval)));
  let matched = 0;
  let weighted = 0;

  for (let beat = 0; beat < expected; beat += 1) {
    const target = downbeat + (beat * interval);
    const tolerance = interval * (beat % 4 === 0 ? 0.16 : 0.11);
    let best = 0;
    for (let i = 0; i < onsets.length; i += 1) {
      const distance = Math.abs(onsets[i].time - target);
      if (distance <= tolerance) best = Math.max(best, onsets[i].strength * (1 - distance / tolerance));
    }
    if (best > 0) {
      matched += 1;
      weighted += best * (beat % 4 === 0 ? 1.35 : 1);
    }
  }

  const score = clamp((matched / Math.max(1, expected) * 0.62) + (weighted / Math.max(1, expected) * 0.38), 0, 1);
  return { score, matched, expected, phraseOffset: Math.max(0, downbeat % (interval * 4)) };
}

function classifyConfidence(confidence, gridScore, onsetCount) {
  const combined = (Number(confidence || 0) * 0.58) + (Number(gridScore || 0) * 0.42);
  if (onsetCount < 8 || combined < 0.22) return "low";
  if (combined < 0.46) return "medium";
  if (combined < 0.72) return "good";
  return "strong";
}

function detectEnergyProfile(peaks) {
  if (!peaks?.length) return { low: 0, mid: 0, high: 0 };
  const totals = peaks.reduce((acc, peak) => {
    acc.low += Number(peak.low || 0);
    acc.mid += Number(peak.mid || 0);
    acc.high += Number(peak.high || 0);
    return acc;
  }, { low: 0, mid: 0, high: 0 });
  const total = Math.max(0.0001, totals.low + totals.mid + totals.high);
  return {
    low: Number((totals.low / total).toFixed(4)),
    mid: Number((totals.mid / total).toFixed(4)),
    high: Number((totals.high / total).toFixed(4)),
  };
}

function analysePeaks(message) {
  const peaksPayload = message.peaks || {};
  const peaks = Array.isArray(peaksPayload.peaks) ? peaksPayload.peaks : [];
  const duration = Number(peaksPayload.duration || 0);
  const bpmHint = Number(message.item?.bpmHint || 170);
  const onsets = detectOnsets(peaks, duration);
  const estimated = estimateBpm(onsets, bpmHint);
  const candidates = buildTempoCandidates(onsets, bpmHint);
  const primaryBpm = Number((estimated.bpm || candidates[0]?.bpm || bpmHint || 170).toFixed(3));
  const downbeat = chooseDownbeat(onsets, primaryBpm, duration);
  const beatInterval = 60 / Math.max(40, primaryBpm || 170);
  const grid = scoreGrid(onsets, primaryBpm, downbeat, duration);
  const confidence = Number(estimated.confidence || 0);
  const confidenceLabel = classifyConfidence(confidence, grid.score, onsets.length);
  const beatCount = duration && beatInterval ? Math.max(0, Math.floor((duration - downbeat) / beatInterval)) : 0;

  return {
    bpm: primaryBpm,
    downbeat: Number(downbeat.toFixed(4)),
    firstBeat: Number(downbeat.toFixed(4)),
    beatInterval: Number(beatInterval.toFixed(6)),
    confidence: Number(confidence.toFixed(4)),
    confidenceLabel,
    gridConfidence: Number(grid.score.toFixed(4)),
    downbeatConfidence: Number(grid.score.toFixed(4)),
    gridMatchedBeats: grid.matched,
    gridExpectedBeats: grid.expected,
    phraseOffset: Number(grid.phraseOffset.toFixed(4)),
    tempoCandidates: candidates.map((candidate) => ({ bpm: Number(candidate.bpm.toFixed(2)), score: Number(candidate.score.toFixed(4)) })),
    beatCount,
    barsEstimate: Math.max(0, Math.floor(beatCount / 4)),
    onsetCount: onsets.length,
    onsetDensity: Number((onsets.length / Math.max(1, duration || 1)).toFixed(4)),
    energyProfile: detectEnergyProfile(peaks),
    needsGridCheck: confidenceLabel === "low" || grid.score < 0.28,
    analysisMode: "v3-browser-prep",
    analysisReady: true,
  };
}

self.addEventListener("message", (event) => {
  const message = event?.data || {};

  if (message.type !== "analyse-peaks") return;

  try {
    const result = analysePeaks(message);
    self.postMessage({
      type: "analysis-result",
      id: message.id,
      deck: message.deck,
      engine: "brmedia-worker",
      result,
    });
  } catch (err) {
    self.postMessage({
      type: "analysis-result",
      id: message.id,
      deck: message.deck,
      engine: "brmedia-worker",
      result: {
        bpm: Number(message.item?.bpmHint || 170),
        downbeat: 0,
        confidence: 0.01,
        analysisReady: false,
        error: err?.message || "analysis failed",
      },
    });
  }
});