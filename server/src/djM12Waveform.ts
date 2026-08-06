export const DJ_M12_WAVEFORM_VERSION = "multiscale-spectral-m12-v1";
export const DJ_M12_CACHE_SUFFIX = ".m12wave.json";
export const DJ_M12_LEVEL_COUNTS = [512, 2048, 8192, 32768] as const;

export type M12SpectralPointSet = {
  count: number;
  combined: number[];
  low: number[];
  mid: number[];
  high: number[];
  transients: number[];
};

export type M12WaveformPyramid = {
  formatVersion: typeof DJ_M12_WAVEFORM_VERSION;
  complete: true;
  levels: M12SpectralPointSet[];
};

const finiteUnit = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 0;
};

export function resampleM12Band(values: readonly number[], count: number): number[] {
  const safeCount = Math.max(1, Math.floor(count));
  if (!values.length) return new Array(safeCount).fill(0);
  const result = new Array<number>(safeCount).fill(0);
  for (let target = 0; target < safeCount; target += 1) {
    const start = Math.floor((target * values.length) / safeCount);
    const end = Math.max(start + 1, Math.ceil(((target + 1) * values.length) / safeCount));
    let maximum = 0;
    let sum = 0;
    let samples = 0;
    for (let source = start; source < Math.min(values.length, end); source += 1) {
      const value = finiteUnit(values[source]);
      maximum = Math.max(maximum, value);
      sum += value;
      samples += 1;
    }
    result[target] = Number((maximum * 0.72 + (samples ? sum / samples : 0) * 0.28).toFixed(6));
  }
  return result;
}

export function buildM12WaveformPyramid(input: {
  combined: readonly number[];
  low: readonly number[];
  mid: readonly number[];
  high: readonly number[];
  transients: readonly number[];
}): M12WaveformPyramid {
  const sourceCount = Math.max(
    input.combined.length, input.low.length, input.mid.length, input.high.length, input.transients.length,
  );
  if (!sourceCount) throw new Error("M12 waveform source is empty");
  const source = {
    combined: resampleM12Band(input.combined, sourceCount),
    low: resampleM12Band(input.low, sourceCount),
    mid: resampleM12Band(input.mid, sourceCount),
    high: resampleM12Band(input.high, sourceCount),
    transients: resampleM12Band(input.transients, sourceCount),
  };
  return {
    formatVersion: DJ_M12_WAVEFORM_VERSION,
    complete: true,
    levels: DJ_M12_LEVEL_COUNTS.map((count) => ({
      count,
      combined: resampleM12Band(source.combined, count),
      low: resampleM12Band(source.low, count),
      mid: resampleM12Band(source.mid, count),
      high: resampleM12Band(source.high, count),
      transients: resampleM12Band(source.transients, count),
    })),
  };
}

export function validateM12WaveformPyramid(value: unknown): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const record = value as Partial<M12WaveformPyramid> | null;
  if (!record || typeof record !== "object") return { valid: false, reasons: ["m12-pyramid-missing"] };
  if (record.formatVersion !== DJ_M12_WAVEFORM_VERSION) reasons.push("m12-version-mismatch");
  if (record.complete !== true) reasons.push("m12-output-incomplete");
  if (!Array.isArray(record.levels) || record.levels.length !== DJ_M12_LEVEL_COUNTS.length) {
    reasons.push("m12-levels-missing");
  } else {
    record.levels.forEach((level, index) => {
      const expected = DJ_M12_LEVEL_COUNTS[index];
      if (!level || level.count !== expected) reasons.push(`m12-level-${expected}-count`);
      for (const field of ["combined", "low", "mid", "high", "transients"] as const) {
        const values = level?.[field];
        if (!Array.isArray(values) || values.length !== expected ||
          values.some((entry) => !Number.isFinite(Number(entry)) || Number(entry) < 0 || Number(entry) > 1)) {
          reasons.push(`m12-level-${expected}-${field}`);
        }
      }
    });
  }
  return { valid: reasons.length === 0, reasons };
}
