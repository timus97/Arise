import { DailySummary, type HealthMetric, type HealthSample } from "@arise/domain";

export type AggregateSample = Pick<
  HealthSample,
  "userId" | "metric" | "value" | "startAt" | "endAt"
>;

function localDateUtc(iso: string): string {
  return iso.slice(0, 10);
}

function lastByTime(samples: readonly AggregateSample[]): number | null {
  if (samples.length === 0) return null;
  const ordered = [...samples].sort((a, b) => {
    const byStart = a.startAt.localeCompare(b.startAt);
    return byStart !== 0 ? byStart : a.endAt.localeCompare(b.endAt);
  });
  return ordered[ordered.length - 1]?.value ?? null;
}

function sumBy(samples: readonly AggregateSample[]): number | null {
  if (samples.length === 0) return null;
  return samples.reduce((acc, s) => acc + s.value, 0);
}

function ofMetric(
  samples: readonly AggregateSample[],
  metric: HealthMetric,
): AggregateSample[] {
  return samples.filter((s) => s.metric === metric);
}

function foldDay(
  userId: string,
  localDate: string,
  samples: readonly AggregateSample[],
): DailySummary {
  return DailySummary.parse({
    userId,
    localDate,
    steps: sumBy(ofMetric(samples, "steps")),
    activeMinutes: sumBy(ofMetric(samples, "active_minutes")),
    sleepMinutes: sumBy(ofMetric(samples, "sleep_minutes")),
    restingHr: lastByTime(ofMetric(samples, "resting_hr")),
    hrv: lastByTime(ofMetric(samples, "hrv")),
    weightKg: lastByTime(ofMetric(samples, "weight_kg")),
    soreness: lastByTime(ofMetric(samples, "soreness")),
    sleepQuality: lastByTime(ofMetric(samples, "sleep_quality")),
    // Health never increments hard bouts — engine/API completions only.
    hardBouts: 0,
    recoveryScore: 0,
  });
}

/** Fold samples into DailySummary-shaped numbers. `hardBouts` stays 0. */
export function aggregateDailySummaries(
  samples: readonly AggregateSample[],
): DailySummary[] {
  const groups = new Map<string, { userId: string; localDate: string; rows: AggregateSample[] }>();

  for (const sample of samples) {
    const localDate = localDateUtc(sample.startAt);
    const key = `${sample.userId}|${localDate}`;
    const existing = groups.get(key);
    if (existing) {
      existing.rows.push(sample);
    } else {
      groups.set(key, { userId: sample.userId, localDate, rows: [sample] });
    }
  }

  return [...groups.values()]
    .map((g) => foldDay(g.userId, g.localDate, g.rows))
    .sort((a, b) => {
      const byUser = a.userId.localeCompare(b.userId);
      return byUser !== 0 ? byUser : a.localDate.localeCompare(b.localDate);
    });
}
