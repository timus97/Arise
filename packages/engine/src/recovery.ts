import type { DailySummary } from "@arise/domain";

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function isNum(v: unknown): v is number {
  return typeof v === "number";
}

export function average(xs: number[]): number | null {
  if (xs.length === 0) return null;
  let sum = 0;
  for (const x of xs) sum += x;
  return sum / xs.length;
}

export function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  if (s.length % 2) {
    return s[m] ?? null;
  }
  const lo = s[m - 1];
  const hi = s[m];
  if (lo === undefined || hi === undefined) return null;
  return (lo + hi) / 2;
}

/** Need ≥ 5 samples; else component is neutral (does not punish missing wearables). */
export function baseline(values: Array<number | null | undefined>): number | null {
  const xs = values.filter((v): v is number => typeof v === "number");
  if (xs.length < 5) return null;
  return median(xs);
}

export interface RecoveryParts {
  sleep: number;
  restHr: number;
  hrv: number;
  load: number;
  subjective: number;
}

export interface RecoveryScore {
  score: number;
  parts: RecoveryParts;
}

/**
 * Input is newest-first, length 0–14. Missing days are omitted (not zero-filled).
 * Cold start uses the §9.4 neutrals (`sleepAvg ?? 420`, restHr/hrv 15, subjective 10).
 */
export function computeRecovery(last14NewestFirst: DailySummary[]): RecoveryScore {
  const last7 = last14NewestFirst.slice(0, 7);
  const sleepAvg = average(last7.map((d) => d.sleepMinutes).filter(isNum)) ?? 420;
  const sleep = clamp((sleepAvg / 420) * 40, 0, 40);

  const rhrBase = baseline(last14NewestFirst.map((d) => d.restingHr));
  const rhrToday = last14NewestFirst[0]?.restingHr ?? null;
  const restHr = rhrBase == null || rhrToday == null ? 15 : rhrToday > rhrBase + 7 ? 0 : 15;

  const hrvBase = baseline(last14NewestFirst.map((d) => d.hrv));
  const hrvToday = last14NewestFirst[0]?.hrv ?? null;
  const hrv = hrvBase == null || hrvToday == null ? 15 : hrvToday < 0.85 * hrvBase ? 0 : 15;

  const hardLast2 = (last7[0]?.hardBouts ?? 0) + (last7[1]?.hardBouts ?? 0);
  const load = clamp(20 - 5 * hardLast2, 0, 20);

  const soreness = last7[0]?.soreness;
  const sq = last7[0]?.sleepQuality;
  const subjective =
    soreness == null || sq == null ? 10 : clamp((5 - soreness) * 2 + sq, 0, 15);

  const score = clamp(sleep + restHr + hrv + load + subjective, 0, 100);
  return { score, parts: { sleep, restHr, hrv, load, subjective } };
}
