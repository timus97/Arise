import { HealthSample, type HealthMetric, type HealthSource } from "@arise/domain";

export const RANGE = {
  hrMin: 30,
  hrMax: 230,
  weightMinKg: 25,
  weightMaxKg: 400,
  stepsMax: 120_000,
  sleepMaxMin: 960,
  scoreMin: 1,
  scoreMax: 5,
} as const;

export type NormalizeInput = {
  id?: string;
  userId: string;
  source: HealthSource;
  metric: HealthMetric;
  value: number;
  unit: string;
  startAt: string;
  endAt: string;
  ingestedAt?: string;
};

export type NormalizedSample = HealthSample & { dedupHash: string };

export function roundHealthValue(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Dedup key: `userId|source|metric|startAt|endAt|roundedValue`. */
export function sampleDedupHash(input: {
  userId: string;
  source: HealthSource;
  metric: HealthMetric;
  startAt: string;
  endAt: string;
  value: number;
}): string {
  const roundedValue = roundHealthValue(input.value);
  return `${input.userId}|${input.source}|${input.metric}|${input.startAt}|${input.endAt}|${roundedValue}`;
}

export function isInRange(metric: HealthMetric, value: number): boolean {
  if (!Number.isFinite(value)) return false;
  switch (metric) {
    case "heart_rate":
    case "resting_hr":
      return value >= RANGE.hrMin && value <= RANGE.hrMax;
    case "weight_kg":
      return value >= RANGE.weightMinKg && value <= RANGE.weightMaxKg;
    case "steps":
      return value >= 0 && value <= RANGE.stepsMax;
    case "sleep_minutes":
      return value >= 0 && value <= RANGE.sleepMaxMin;
    case "soreness":
    case "sleep_quality":
      return (
        Number.isInteger(value) &&
        value >= RANGE.scoreMin &&
        value <= RANGE.scoreMax
      );
    case "active_minutes":
    case "hrv":
      return value >= 0;
    default: {
      const _exhaustive: never = metric;
      return _exhaustive;
    }
  }
}

function newSampleId(): string {
  const c = globalThis as { crypto?: { randomUUID?: () => string } };
  if (typeof c.crypto?.randomUUID === "function") {
    return c.crypto.randomUUID();
  }
  return `hs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
}

export function normalizeSample(
  input: NormalizeInput,
  now: Date = new Date(),
): NormalizedSample | null {
  if (!isInRange(input.metric, input.value)) return null;

  const sample = HealthSample.parse({
    id: input.id ?? newSampleId(),
    userId: input.userId,
    source: input.source,
    metric: input.metric,
    value: input.value,
    unit: input.unit,
    startAt: input.startAt,
    endAt: input.endAt,
    ingestedAt: input.ingestedAt ?? now.toISOString(),
  });

  return {
    ...sample,
    dedupHash: sampleDedupHash({
      userId: sample.userId,
      source: sample.source,
      metric: sample.metric,
      startAt: sample.startAt,
      endAt: sample.endAt,
      value: sample.value,
    }),
  };
}

export function normalizeSamples(
  inputs: readonly NormalizeInput[],
  now: Date = new Date(),
): { kept: NormalizedSample[]; dropped: number } {
  const kept: NormalizedSample[] = [];
  let dropped = 0;
  for (const input of inputs) {
    const next = normalizeSample(input, now);
    if (next) kept.push(next);
    else dropped += 1;
  }
  return { kept, dropped };
}
