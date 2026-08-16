import type { GoalType } from "@arise/domain";
import { storeMassKg } from "../../lib/units.js";
import type { OnboardingDraft } from "./types.js";

export type ImpliedLossResult =
  | { unsafe: false }
  | { unsafe: true; maxKgPerWeek: number; weeklyKg: number };

export function localDate(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function calendarDays(from: string, to: string): number {
  const a = Date.UTC(
    Number(from.slice(0, 4)),
    Number(from.slice(5, 7)) - 1,
    Number(from.slice(8, 10)),
  );
  const b = Date.UTC(
    Number(to.slice(0, 4)),
    Number(to.slice(5, 7)) - 1,
    Number(to.slice(8, 10)),
  );
  return (b - a) / 86_400_000;
}

/** Same rule as the API: fat_loss + both targets + weeks > 0 + weekly kg > 1% BW. */
export function evaluateImpliedLoss(args: {
  type: GoalType | null;
  weightKg: number;
  targetWeightKg: number | null;
  targetDate: string | null;
  now?: Date;
  timeZone: string;
}): ImpliedLossResult {
  if (args.type !== "fat_loss") return { unsafe: false };
  if (args.targetWeightKg == null || args.targetDate == null) return { unsafe: false };
  const today = localDate(args.now ?? new Date(), args.timeZone);
  const weeks = calendarDays(today, args.targetDate) / 7;
  if (weeks <= 0) return { unsafe: false };
  const weeklyKg = (args.weightKg - args.targetWeightKg) / weeks;
  const maxKgPerWeek = 0.01 * args.weightKg;
  if (weeklyKg > maxKgPerWeek) {
    return { unsafe: true, maxKgPerWeek, weeklyKg };
  }
  return { unsafe: false };
}

export function evaluateDraftLoss(
  draft: OnboardingDraft,
  now: Date = new Date(),
): ImpliedLossResult {
  const weight = Number(draft.weight);
  if (!Number.isFinite(weight) || weight <= 0 || draft.goalType == null) {
    return { unsafe: false };
  }
  const weightKg = storeMassKg(weight, draft.units);
  const rawTarget = draft.targetWeight.trim();
  const targetWeightKg =
    rawTarget === "" ? null : storeMassKg(Number(rawTarget), draft.units);
  const targetDate = draft.targetDate.trim() === "" ? null : draft.targetDate.trim();
  if (targetWeightKg != null && !Number.isFinite(targetWeightKg)) {
    return { unsafe: false };
  }
  return evaluateImpliedLoss({
    type: draft.goalType,
    weightKg,
    targetWeightKg,
    targetDate,
    now,
    timeZone: draft.timeZone.trim() || "UTC",
  });
}

export function maxKgPerWeekFromDetails(details: unknown): number | null {
  if (typeof details !== "object" || details === null) return null;
  const value = (details as { maxKgPerWeek?: unknown }).maxKgPerWeek;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
