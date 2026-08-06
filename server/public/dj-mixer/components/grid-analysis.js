(() => {
  "use strict";

  const clamp = (value, min = 0, max = 1) =>
    Math.max(min, Math.min(max, Number(value) || 0));

  const median = (values = []) => {
    const clean = values
      .map(Number)
      .filter(Number.isFinite)
      .sort((a, b) => a - b);

    if (!clean.length) return 0;

    const middle = Math.floor(clean.length / 2);
    return clean.length % 2
      ? clean[middle]
      : (clean[middle - 1] + clean[middle]) / 2;
  };

  const quantile = (values = [], target = 0.5) => {
    const clean = values
      .map(Number)
      .filter(Number.isFinite)
      .sort((a, b) => a - b);

    if (!clean.length) return 0;

    const position = clamp(target) * (clean.length - 1);
    const lower = Math.floor(position);
    const upper = Math.ceil(position);

    if (lower === upper) return clean[lower];

    const ratio = position - lower;
    return clean[lower] * (1 - ratio) + clean[upper] * ratio;
  };

  const normaliseMode = (value) => {
    const mode = String(value || "auto").trim().toLowerCase();
    return mode === "normal" || mode === "dynamic" ? mode : "auto";
  };

  const getCandidateStrength = (analysis = {}) =>
    Math.max(
      0,
      ...(Array.isArray(analysis.tempoCandidates)
        ? analysis.tempoCandidates.map((candidate) =>
            Number(candidate?.adjustedScore ?? candidate?.score) || 0
          )
        : [])
    );

  const alignBpmFamily = (value, reference) => {
    const bpm = Number(value) || 0;
    const anchor = Number(reference) || 0;
    if (!bpm || !anchor) return bpm;

    const candidates = [bpm / 4, bpm / 2, bpm, bpm * 2, bpm * 4]
      .filter((candidate) => candidate >= 120 && candidate <= 250);

    return candidates.reduce(
      (best, candidate) =>
        Math.abs(candidate - anchor) < Math.abs(best - anchor)
          ? candidate
          : best,
      candidates[0] || bpm
    );
  };

  const sliceValues = (values, startTime, endTime, duration) => {
    if (!Array.isArray(values) || !values.length || !duration) return [];

    const startIndex = Math.max(
      0,
      Math.min(
        values.length - 1,
        Math.floor((startTime / duration) * values.length)
      )
    );

    const endIndex = Math.max(
      startIndex + 1,
      Math.min(
        values.length,
        Math.ceil((endTime / duration) * values.length)
      )
    );

    return values.slice(startIndex, endIndex);
  };

  const sliceWaveform = (waveform, startTime, endTime, bpmHint) => {
    const duration = Math.max(0, Number(waveform?.duration) || 0);
    const bands = waveform?.bands && typeof waveform.bands === "object"
      ? waveform.bands
      : {};

    return {
      ...waveform,
      duration: Math.max(0, endTime - startTime),
      peaks: sliceValues(waveform?.peaks, startTime, endTime, duration),
      bands: Object.keys(bands).reduce((output, name) => {
        output[name] = sliceValues(
          bands[name],
          startTime,
          endTime,
          duration
        );
        return output;
      }, {}),
      item: {
        ...(waveform?.item || {}),
        bpm: bpmHint || waveform?.item?.bpm || null,
      },
    };
  };

  const getActivity = (waveform = {}) => {
    const peaks = Array.isArray(waveform.peaks) ? waveform.peaks : [];
    const bands = waveform?.bands && typeof waveform.bands === "object"
      ? waveform.bands
      : {};

    if (!peaks.length) return 0;

    const energy = peaks.map((peak, index) =>
      Math.max(
        Number(peak) || 0,
        (Number(bands.low?.[index]) || 0) * 0.94,
        (Number(bands.lowBody?.[index]) || 0) * 0.98,
        (Number(bands.transient?.[index]) || 0) * 1.04,
        (Number(bands.rms?.[index]) || 0) * 0.34,
        (Number(bands.mid?.[index]) || 0) * 0.42
      )
    );

    return quantile(energy.filter((value) => value > 0), 0.78);
  };

  const analyseNormal = (
    waveform,
    bpmHint = null,
    preferDigitalWhole = true
  ) => {
    const analyser = window.BRMediaSpectralWaveform;

    if (
      !analyser ||
      typeof analyser
        .analysePreparedWaveform !==
        "function"
    ) {
      return null;
    }

    const input = bpmHint
      ? {
          ...waveform,
          item: {
            ...(waveform?.item || {}),
            bpm: bpmHint,
          },
        }
      : waveform;

    return analyser.analysePreparedWaveform(
      input,
      {
        preferDigitalWhole,
      }
    );
  };

  const resolveDigitalNormalBpm = (
    normal = {},
    analysisMode = "auto"
  ) => {
    const measuredBpm =
      Number(
        normal.measuredBpm ||
        normal.rawBpm ||
        normal.bpm
      ) || 0;

    const analysedBpm =
      Number(normal.bpm) ||
      measuredBpm;

    const nearestWholeBpm =
      Math.round(
        measuredBpm ||
        analysedBpm
      );

    const wholeDistance =
      Math.abs(
        (
          measuredBpm ||
          analysedBpm
        ) -
        nearestWholeBpm
      );

    /*
      The spectral analyser has already compared the exact whole-BPM grid
      against the measured full-track grid. Do not round the result a second
      time here: that old override could reject the better timing map and
      create accumulating drift by the end of a constant digital track.

      The UI can still show the clean nominal whole BPM, but Grid Core must
      retain the full-track spacing chosen by the analyser.
    */
    const analyserLockedWhole =
      analysisMode !== "dynamic" &&
      Boolean(
        normal.digitalTempoLocked
      ) &&
      Number.isInteger(
        analysedBpm
      );

    return {
      bpm:
        analyserLockedWhole
          ? analysedBpm
          : measuredBpm ||
            analysedBpm,

      measuredBpm:
        measuredBpm ||
        analysedBpm,

      digitalTempoLocked:
        analyserLockedWhole,

      digitalTempoBasis:
        analyserLockedWhole
          ? normal.digitalTempoBasis ||
            "full-track-whole"
          : "full-track-precision",

      wholeDistance:
        Number(
          wholeDistance.toFixed(3)
        ),
    };
  };

  const makeNormalResult = (
    normal,
    analysisMode
  ) => {
    if (!normal?.bpm) {
      return null;
    }

    const digitalTempo =
      resolveDigitalNormalBpm(
        normal,
        analysisMode
      );

    const source =
      `grid-analysis-v4-${analysisMode}-normal-${
        digitalTempo.digitalTempoLocked
          ? "whole"
          : "precision"
      }`;

    const downbeat =
      Number(normal.downbeat) || 0;

    const candidateStrength =
      getCandidateStrength(normal);

    return {
      ...normal,

      analysisMode,

      resolvedMode:
        "normal",

      bpm:
        Number(
          digitalTempo.bpm
        ),

      measuredBpm:
        digitalTempo.measuredBpm,

      digitalTempoLocked:
        digitalTempo.digitalTempoLocked,

      digitalTempoBasis:
        digitalTempo.digitalTempoBasis,

      segments: [
        {
          id: "segment-1",

          startTime:
            downbeat,

          startBeat: 0,

          bpm:
            Number(
              digitalTempo.bpm
            ),

          source,
        },
      ],

      reviewRequired:
        Number(
          normal.tempoConfidence
        ) < 0.18 ||
        candidateStrength < 0.46,

      timingConsistency: {
        coverage: 0,

        spreadBpm: 0,

        runCount: 1,

        windowCount: 0,

        candidateStrength:
          Number(
            candidateStrength.toFixed(3)
          ),

        measuredBpm:
          digitalTempo.measuredBpm ||
          null,

        digitalTempoLocked:
          digitalTempo.digitalTempoLocked,

        digitalTempoBasis:
          digitalTempo.digitalTempoBasis,

        wholeBpmDistance:
          digitalTempo.wholeDistance,

        wholeBpmScoreRatio:
          Number(
            normal.wholeBpmScoreRatio
          ) || 0,
      },

      tempoSource:
        source,
    };
  };

  const analysePreparedWaveform = (waveform = {}, options = {}) => {
    const analysisMode = normaliseMode(
      options.analysisMode || waveform?.item?.djGridAnalysisMode
    );

    const duration = Math.max(0, Number(waveform?.duration) || 0);
    const normal = analyseNormal(
      waveform,
      null,
      analysisMode !== "dynamic"
    );
    const normalResult = makeNormalResult(normal, analysisMode);

    if (!normalResult) return null;
    if (analysisMode === "normal" || duration < 48) return normalResult;

    const windowSeconds = clamp(duration * 0.105, 24, 36);
    const windowCount = Math.max(
      8,
      Math.min(12, Math.round(duration / 32) + 4)
    );
    const latestStart = Math.max(0, duration - windowSeconds);
    const globalActivity = Math.max(0.0001, getActivity(waveform));
    const points = [];

    for (let index = 0; index < windowCount; index += 1) {
      const ratio = windowCount <= 1 ? 0 : index / (windowCount - 1);
      const startTime = latestStart * ratio;
      const endTime = Math.min(duration, startTime + windowSeconds);
      const localWaveform = sliceWaveform(
        waveform,
        startTime,
        endTime,
        normal.bpm
      );
      const activity = getActivity(localWaveform);

      if (!activity || activity < globalActivity * 0.30) continue;

      const local = analyseNormal(
        localWaveform,
        normal.bpm,
        analysisMode !== "dynamic"
      );
			
      if (!local?.bpm || Number(local.tempoConfidence) < 0.12) continue;

      const bpm = alignBpmFamily(local.bpm, normal.bpm);
      if (!Number.isFinite(bpm) || Math.abs(bpm - normal.bpm) > 16) continue;

      const centreTime = (startTime + endTime) / 2;
      const beatSeconds = 60 / bpm;
      const firstAnchor = startTime + (Number(local.downbeat) || 0);
      const anchorTime =
        firstAnchor +
        Math.round((centreTime - firstAnchor) / beatSeconds) * beatSeconds;

      points.push({
        time: centreTime,
        startTime,
        endTime,
        anchorTime,
        bpm: Number(bpm.toFixed(3)),
        confidence: clamp(local.tempoConfidence),
        candidateStrength: getCandidateStrength(local),
        activity: clamp(activity / globalActivity, 0, 2),
      });
    }

    points.sort((left, right) => left.time - right.time);

    for (let index = 1; index < points.length - 1; index += 1) {
      const previous = points[index - 1];
      const current = points[index];
      const next = points[index + 1];
      const neighbourBpm = median([previous.bpm, next.bpm]);

      if (
        Math.abs(previous.bpm - next.bpm) <= 0.28 &&
        Math.abs(current.bpm - neighbourBpm) >= 0.65
      ) {
        current.bpm = Number(neighbourBpm.toFixed(3));
        current.outlier = true;
      }
    }

    const localBpms = points.map((point) => point.bpm);
    const spreadBpm = Math.max(
      0,
      quantile(localBpms, 0.90) - quantile(localBpms, 0.10)
    );
    const changeThreshold = analysisMode === "dynamic" ? 0.30 : 0.45;
    const runs = [];

    points.forEach((point, index) => {
      if (!runs.length) {
        runs.push({ points: [point] });
        return;
      }

      const currentRun = runs[runs.length - 1];
      const currentBpm = median(currentRun.points.map((entry) => entry.bpm));
      const next = points[index + 1];
      const supportedChange =
        next &&
        Math.abs(next.bpm - point.bpm) <= 0.30 &&
        Math.abs(next.bpm - currentBpm) >= changeThreshold * 0.88;

      if (
        Math.abs(point.bpm - currentBpm) >= changeThreshold &&
        supportedChange
      ) {
        runs.push({ points: [point] });
        return;
      }

      currentRun.points.push(point);
    });

    for (let index = runs.length - 1; index >= 0; index -= 1) {
      const run = runs[index];
      if (run.points.length >= 3 || runs.length <= 1) continue;

      const previousRun = runs[index - 1];
      const nextRun = runs[index + 1];
      const runBpm = median(run.points.map((point) => point.bpm));
      const previousDistance = previousRun
        ? Math.abs(
            runBpm - median(previousRun.points.map((point) => point.bpm))
          )
        : Infinity;
      const nextDistance = nextRun
        ? Math.abs(
            runBpm - median(nextRun.points.map((point) => point.bpm))
          )
        : Infinity;
      const target =
        previousDistance <= nextDistance
          ? previousRun
          : nextRun;

      if (target) {
        target.points.push(...run.points);
        target.points.sort((left, right) => left.time - right.time);
      }

      runs.splice(index, 1);
    }

    const resolvedRuns = runs
      .filter((run) => run.points.length)
      .map((run) => {
        const bpm = Number(
          median(run.points.map((point) => point.bpm)).toFixed(3)
        );
        const beatSeconds = 60 / bpm;
        const phaseAnchor = Number(run.points[0]?.anchorTime) || 0;
        const phaseErrors = run.points.map((point) => {
          const beats =
            ((Number(point.anchorTime) || 0) - phaseAnchor) / beatSeconds;
          return Math.abs(beats - Math.round(beats));
        });

        return {
          ...run,
          bpm,
          confidence:
            run.points.reduce((sum, point) => sum + point.confidence, 0) /
            Math.max(1, run.points.length),
          spreadBpm: Math.max(
            0,
            quantile(run.points.map((point) => point.bpm), 0.90) -
            quantile(run.points.map((point) => point.bpm), 0.10)
          ),
          phaseError: median(phaseErrors),
        };
      });

    resolvedRuns.forEach((run, index) => {
      const previousRun = resolvedRuns[index - 1];
      const nextRun = resolvedRuns[index + 1];
      const firstPoint = run.points[0];
      const lastPoint = run.points[run.points.length - 1];
      const spanStart = previousRun
        ? (
            previousRun.points[previousRun.points.length - 1].time +
            firstPoint.time
          ) / 2
        : 0;
      const spanEnd = nextRun
        ? (lastPoint.time + nextRun.points[0].time) / 2
        : duration;
      const spanDuration = Math.max(0, spanEnd - spanStart);
      const trim = Math.min(4, spanDuration * 0.06);
      const refineStart = Math.max(0, spanStart + trim);
      const refineEnd = Math.min(duration, spanEnd - trim);

      run.spanStart = spanStart;
      run.spanEnd = spanEnd;

      if (refineEnd - refineStart < 24) return;

      const refined = analyseNormal(
        sliceWaveform(waveform, refineStart, refineEnd, run.bpm),
        run.bpm,
        analysisMode !== "dynamic"
      );
      const refinedBpm = alignBpmFamily(refined?.bpm, run.bpm);

      if (refinedBpm && Math.abs(refinedBpm - run.bpm) <= 2) {
        run.bpm = Number(refinedBpm.toFixed(3));
        run.refinedAnchorTime =
          refineStart + (Number(refined?.downbeat) || 0);
        run.confidence = Math.max(
          run.confidence,
          clamp(refined?.tempoConfidence)
        );
      }
    });

    const runBpms = resolvedRuns.map((run) => run.bpm);
    const runRange = runBpms.length
      ? Math.max(...runBpms) - Math.min(...runBpms)
      : 0;
    const coverage = points.length / Math.max(1, windowCount);
    const meanLocalConfidence = points.length
      ? points.reduce((sum, point) => sum + point.confidence, 0) /
        points.length
      : 0;
    const normalStrength = getCandidateStrength(normal);
    const meanLocalStrength = points.length
      ? points.reduce(
          (sum, point) => sum + point.candidateStrength,
          0
        ) / points.length
      : 0;
    const sustainedRuns = resolvedRuns.every(
      (run) =>
        run.points.length >= 3 &&
        run.spreadBpm <= 0.85 &&
        run.phaseError <= 0.22
    );
    const dynamicEvidence =
      resolvedRuns.length > 1 &&
      runRange >= changeThreshold &&
      points.length >= 6 &&
      coverage >= 0.50 &&
      meanLocalStrength >= 0.46 &&
      sustainedRuns;
    const resolvedMode = dynamicEvidence ? "dynamic" : "normal";

    const digitalTempo =
      resolveDigitalNormalBpm(
        normal,
        analysisMode
      );

    const source =
      resolvedMode === "dynamic"
        ? `grid-analysis-v4-${analysisMode}-dynamic-segments`
        : `grid-analysis-v4-${analysisMode}-normal-${
            digitalTempo.digitalTempoLocked
              ? "whole"
              : "precision"
          }`;
    const segments = [];

    if (dynamicEvidence) {
      resolvedRuns.forEach((run, index) => {
        if (!index) {
          const beatSeconds = 60 / run.bpm;
          const refinedAnchor = Number(run.refinedAnchorTime);
          const firstDownbeat = Number.isFinite(refinedAnchor)
            ? refinedAnchor - Math.floor(refinedAnchor / beatSeconds) * beatSeconds
            : Number(normal.downbeat) || 0;

          segments.push({
            id: "segment-1",
            startTime: Number(firstDownbeat.toFixed(6)),
            startBeat: 0,
            bpm: run.bpm,
            source,
          });
          return;
        }

        const previousRun = resolvedRuns[index - 1];
        const previousSegment = segments[segments.length - 1];
        const firstPoint = run.points[0];
        const lastPreviousPoint =
          previousRun.points[previousRun.points.length - 1];
        const boundaryTime = Number.isFinite(run.spanStart)
          ? run.spanStart
          : (firstPoint.time + lastPreviousPoint.time) / 2;
        const beatSeconds = 60 / run.bpm;
        const localAnchor = Number.isFinite(Number(run.refinedAnchorTime))
          ? Number(run.refinedAnchorTime)
          : firstPoint.anchorTime;
        let startTime =
          localAnchor +
          Math.round((boundaryTime - localAnchor) / beatSeconds) * beatSeconds;

        startTime = Math.max(
          previousSegment.startTime + 60 / previousSegment.bpm,
          Math.min(duration, startTime)
        );

        const startBeat =
          previousSegment.startBeat +
          ((startTime - previousSegment.startTime) * previousSegment.bpm) / 60;

        segments.push({
          id: `segment-${segments.length + 1}`,
          startTime: Number(startTime.toFixed(6)),
          startBeat: Number(startBeat.toFixed(6)),
          bpm: run.bpm,
          source,
        });
      });
    } else {
      segments.push({
        id: "segment-1",
        startTime: Number(normal.downbeat) || 0,
        startBeat: 0,
        bpm: Number(
          digitalTempo.bpm
        ),
        source,
      });
    }

    const ambiguousMovement = !dynamicEvidence && spreadBpm >= 0.38;
    const reviewRequired = Boolean(
      Number(normal.tempoConfidence) < 0.18 ||
      (!dynamicEvidence && normalStrength < 0.46) ||
      meanLocalStrength < 0.42 ||
      points.length < 3 ||
      coverage < 0.30 ||
      (analysisMode === "auto" && ambiguousMovement) ||
      (
        analysisMode === "dynamic" &&
        !dynamicEvidence
      )
    );
    const tempoConfidence = clamp(
      Number(normal.tempoConfidence) * 0.58 +
      meanLocalConfidence * 0.24 +
      Math.min(1, coverage) * 0.18
    );
    const runCandidates = resolvedRuns.map((run) => ({
      bpm: run.bpm,
      score: Number(run.confidence.toFixed(6)),
      adjustedScore: Number(
        (
          run.confidence *
          Math.max(0.25, run.points.length / Math.max(1, points.length))
        ).toFixed(6)
      ),
    }));
    const tempoCandidates = [
      ...(Array.isArray(normal.tempoCandidates) ? normal.tempoCandidates : []),
      ...runCandidates,
    ]
      .filter(
        (candidate, index, list) =>
          list.findIndex(
            (other) =>
              Math.abs(Number(other.bpm) - Number(candidate.bpm)) < 0.01
          ) === index
      )
      .slice(0, 12);

    return {
      ...normal,
      bpm: segments[0]?.bpm || normal.bpm,
      measuredBpm:
        digitalTempo.measuredBpm,
      digitalTempoLocked:
        !dynamicEvidence &&
        digitalTempo.digitalTempoLocked,
      digitalTempoBasis:
        dynamicEvidence
          ? "dynamic-segments"
          : digitalTempo.digitalTempoBasis,
      downbeat: segments[0]?.startTime ?? normal.downbeat,
      tempoConfidence: Number(tempoConfidence.toFixed(3)),
      tempoSource: source,
      tempoCandidates,
      analysisMode,
      resolvedMode,
      segments,
      reviewRequired,
      timingConsistency: {
        coverage: Number(coverage.toFixed(3)),
        spreadBpm: Number(spreadBpm.toFixed(3)),
        runCount: resolvedRuns.length || 1,
        windowCount: points.length,
        runSizes: resolvedRuns.map((run) => run.points.length),
        runSpreads: resolvedRuns.map((run) =>
          Number(run.spreadBpm.toFixed(3))
        ),
        phaseErrors: resolvedRuns.map((run) =>
          Number(run.phaseError.toFixed(3))
        ),
        candidateStrength: Number(normalStrength.toFixed(3)),
        localCandidateStrength: Number(meanLocalStrength.toFixed(3)),
        measuredBpm:
          digitalTempo.measuredBpm ||
          null,
        digitalTempoLocked:
          !dynamicEvidence &&
          digitalTempo.digitalTempoLocked,
        digitalTempoBasis:
          dynamicEvidence
            ? "dynamic-segments"
            : digitalTempo.digitalTempoBasis,
        wholeBpmDistance:
          digitalTempo.wholeDistance,
        wholeBpmScoreRatio:
          Number(
            normal.wholeBpmScoreRatio
          ) || 0,
      },
    };
  };

  window.BRMediaDjGridAnalysis = Object.freeze({
    analysePreparedWaveform,
  });
})();