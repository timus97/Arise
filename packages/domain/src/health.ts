import { z } from "zod";

export const HealthSource = z.enum([
  "manual",
  "csv",
  "apple_export",
  "web_bluetooth",
  "health_connect",
  "healthkit",
]);
export type HealthSource = z.infer<typeof HealthSource>;

export const HealthMetric = z.enum([
  "steps",
  "heart_rate",
  "resting_hr",
  "hrv",
  "sleep_minutes",
  "weight_kg",
  "active_minutes",
  "soreness",
  "sleep_quality",
]);
export type HealthMetric = z.infer<typeof HealthMetric>;

export const HealthSample = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  source: HealthSource,
  metric: HealthMetric,
  value: z.number(),
  unit: z.string(),
  startAt: z.string(),
  endAt: z.string(),
  ingestedAt: z.string(),
});
export type HealthSample = z.infer<typeof HealthSample>;

export const DailySummary = z.object({
  userId: z.string().min(1),
  localDate: z.string(),
  steps: z.number().nullable(),
  activeMinutes: z.number().nullable(),
  sleepMinutes: z.number().nullable(),
  restingHr: z.number().nullable(),
  hrv: z.number().nullable(),
  weightKg: z.number().nullable(),
  soreness: z.number().nullable(), // 1–5, last that day
  sleepQuality: z.number().nullable(), // 1–5, last that day
  hardBouts: z.number(), // writer: completion of intensity===hard
  recoveryScore: z.number(),
});
export type DailySummary = z.infer<typeof DailySummary>;
