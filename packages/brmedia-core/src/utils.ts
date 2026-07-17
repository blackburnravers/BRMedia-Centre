export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function isoNow(): string {
  return new Date().toISOString();
}

/** Lightweight random id (fine for UI + local queues; server can replace later) */
export function uid(prefix = "id"): string {
  const rnd = Math.random().toString(16).slice(2);
  return `${prefix}_${Date.now().toString(16)}_${rnd}`;
}