import type { DayFocus, GoalType, Plan, PlanDay } from "@arise/domain";
import { addCalendarDays } from "./safety.js";

export const FOCUS_SKELETONS: Record<GoalType, readonly DayFocus[]> = {
  muscle_gain: ["full_body", "full_body", "full_body"],
  fat_loss: ["mixed", "cardio", "mixed", "cardio", "mixed"],
  recomposition: ["full_body", "cardio", "full_body", "cardio", "full_body"],
  endurance: ["cardio", "cardio", "mixed", "cardio"],
  general_fitness: ["full_body", "cardio", "mobility", "full_body", "cardio"],
  mobility: ["mobility", "cardio", "mobility", "mobility"],
};

const CARDIO_ONLY: ReadonlySet<DayFocus> = new Set(["rest", "mobility", "cardio"]);

export function isoWeekday(isoDate: string): number {
  const y = Number(isoDate.slice(0, 4));
  const m = Number(isoDate.slice(5, 7));
  const d = Number(isoDate.slice(8, 10));
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return dow === 0 ? 7 : dow;
}

export function focusSkeleton(goalType: GoalType, experience: number, availableDays: number): DayFocus[] {
  if (goalType === "muscle_gain" && experience >= 2 && availableDays >= 4) {
    return ["push", "pull", "legs", "full_body"];
  }
  return [...FOCUS_SKELETONS[goalType]];
}

export function hardAllowedFor(args: {
  focus: DayFocus;
  budgetMinutes: number;
  availableCount: number;
}): boolean {
  if (CARDIO_ONLY.has(args.focus)) return false;
  if (args.availableCount < 2) return args.budgetMinutes >= 30;
  return args.budgetMinutes >= 25;
}

export interface BuildWeeklyPlanInput {
  planId: string;
  userId: string;
  goalId: string;
  goalType: GoalType;
  experience: number;
  week: Array<{ weekday: number; minutes: number }>;
  startDate: string;
  version?: number;
  idFactory?: () => string;
}

export interface WeeklyPlanResult {
  plan: Plan;
  days: PlanDay[];
}

export function buildWeeklyPlan(input: BuildWeeklyPlanInput): WeeklyPlanResult {
  const minutesByWeekday = new Map<number, number>();
  for (const row of input.week) {
    minutesByWeekday.set(row.weekday, row.minutes);
  }

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) dates.push(addCalendarDays(input.startDate, i));

  const availableIdx: number[] = [];
  const budgets = dates.map((localDate) => minutesByWeekday.get(isoWeekday(localDate)) ?? 0);
  for (let i = 0; i < dates.length; i++) {
    if ((budgets[i] ?? 0) > 0) availableIdx.push(i);
  }

  const availableCount = availableIdx.length;
  const skeleton =
    availableCount < 2
      ? availableIdx.map((): DayFocus => "full_body")
      : focusSkeleton(input.goalType, input.experience, availableCount);

  const focuses: DayFocus[] = dates.map(() => "rest");
  for (let n = 0; n < availableIdx.length; n++) {
    const dayIndex = availableIdx[n];
    if (dayIndex === undefined) continue;
    if (availableCount < 2) {
      focuses[dayIndex] = "full_body";
      continue;
    }
    const focus = skeleton[n % skeleton.length];
    focuses[dayIndex] = focus ?? "full_body";
  }

  const nextId = input.idFactory;
  const days: PlanDay[] = dates.map((localDate, i) => {
    const focus = focuses[i] ?? "rest";
    const budgetMinutes = budgets[i] ?? 0;
    return {
      id: nextId ? nextId() : `${input.planId}:${localDate}`,
      planId: input.planId,
      localDate,
      focus,
      budgetMinutes,
      hardAllowed: hardAllowedFor({ focus, budgetMinutes, availableCount }),
      isGate: false,
    };
  });

  let gate: PlanDay | undefined;
  for (const day of days) {
    if (day.budgetMinutes >= 40 && day.hardAllowed && day.focus !== "rest") {
      if (!gate || day.localDate > gate.localDate) gate = day;
    }
  }
  if (gate) gate.isGate = true;

  const plan: Plan = {
    id: input.planId,
    userId: input.userId,
    goalId: input.goalId,
    version: input.version ?? 1,
    startDate: input.startDate,
    endDate: addCalendarDays(input.startDate, 6),
    rationale: [`${input.goalType} focus week`, `${availableCount} available days`],
  };

  return { plan, days };
}
