import { HealthMetric } from "@arise/domain";
import { z } from "zod";
import { normalizeSample, type NormalizedSample } from "../normalize.js";

export const ManualSampleInput = z.object({
  metric: HealthMetric,
  value: z.number().finite(),
  unit: z.string().min(1),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
});
export type ManualSampleInput = z.infer<typeof ManualSampleInput>;

export function parseManual(input: unknown): ManualSampleInput {
  return ManualSampleInput.parse(input);
}

export function ingestManual(args: {
  input: unknown;
  userId: string;
  now?: Date;
  id?: string;
}): NormalizedSample | null {
  const parsed = parseManual(args.input);
  const base = {
    userId: args.userId,
    source: "manual" as const,
    metric: parsed.metric,
    value: parsed.value,
    unit: parsed.unit,
    startAt: parsed.startAt,
    endAt: parsed.endAt,
  };
  return normalizeSample(
    args.id === undefined ? base : { ...base, id: args.id },
    args.now ?? new Date(),
  );
}
