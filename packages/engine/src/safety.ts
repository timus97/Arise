import type {
  EffectKind,
  GoalType,
  Intensity,
  OnboardingBody,
  QuestKind,
  QuestStatus,
  UserEffect,
} from "@arise/domain";

export type ParqAnswers = OnboardingBody["parq"];

export const PREGNANCY_HARD_STOP = "PREGNANCY_HARD_STOP";
export const PREGNANCY_HARD_STOP_MESSAGE =
  "Arise is not appropriate during pregnancy. See a clinician for prenatal exercise guidance.";

export const UNSAFE_LOSS_RATE = "UNSAFE_LOSS_RATE";

export const PENALTY_RPE_MAX = 4;
export const CAUTION_VOLUME_MUL = 0.7;
export const CAUTION_VOLUME_LOCAL_DAYS = 2;
export const PAIN_NO_HARD_MS = 24 * 60 * 60 * 1000;

export const PARQ_EASY_KINDS = ["recovery", "mobility", "yoga", "habit", "steps"] as const;
export const PARQ_EASY_INTENSITIES = ["rest", "easy"] as const;

const PARQ_EASY_KIND_SET: ReadonlySet<string> = new Set(PARQ_EASY_KINDS);
const PARQ_EASY_INTENSITY_SET: ReadonlySet<string> = new Set(PARQ_EASY_INTENSITIES);

export type ParqEvaluation =
  | {
      blocked: true;
      code: typeof PREGNANCY_HARD_STOP;
      message: string;
      actions: ["deleteAccount"];
      parqClear: false;
      easyOnly: true;
    }
  | {
      blocked: false;
      parqClear: true;
      easyOnly: false;
    }
  | {
      blocked: false;
      parqClear: false;
      easyOnly: true;
    };

export function evaluateParq(parq: ParqAnswers): ParqEvaluation {
  if (parq.pregnancy) {
    return {
      blocked: true,
      code: PREGNANCY_HARD_STOP,
      message: PREGNANCY_HARD_STOP_MESSAGE,
      actions: ["deleteAccount"],
      parqClear: false,
      easyOnly: true,
    };
  }
  const otherYes =
    parq.chestPain ||
    parq.dizziness ||
    parq.doctorAdvisedAgainst ||
    parq.uncontrolledCondition;
  if (otherYes) {
    return { blocked: false, parqClear: false, easyOnly: true };
  }
  return { blocked: false, parqClear: true, easyOnly: false };
}

/** Other PAR-Q yes → easy whitelist: kind ∈ recovery|mobility|habit|steps and intensity ∈ rest|easy. */
export function parqAllowsTemplate(
  parqClear: boolean,
  kind: QuestKind,
  intensity: Intensity,
): boolean {
  if (parqClear) return true;
  return PARQ_EASY_KIND_SET.has(kind) && PARQ_EASY_INTENSITY_SET.has(intensity);
}

export type ImpliedLossResult =
  | { unsafe: false }
  | {
      unsafe: true;
      code: typeof UNSAFE_LOSS_RATE;
      maxKgPerWeek: number;
      weeklyKg: number;
    };

export function evaluateImpliedLoss(args: {
  type: GoalType;
  weightKg: number;
  targetWeightKg: number | null;
  targetDate: string | null;
  now: Date;
  timeZone: string;
}): ImpliedLossResult {
  if (args.type !== "fat_loss") return { unsafe: false };
  if (args.targetWeightKg == null || args.targetDate == null) return { unsafe: false };
  const today = localDate(args.now, args.timeZone);
  const days = calendarDays(today, args.targetDate);
  const weeks = days / 7;
  if (weeks <= 0) return { unsafe: false };
  const weeklyKg = (args.weightKg - args.targetWeightKg) / weeks;
  const maxKgPerWeek = 0.01 * args.weightKg;
  if (weeklyKg > maxKgPerWeek) {
    return { unsafe: true, code: UNSAFE_LOSS_RATE, maxKgPerWeek, weeklyKg };
  }
  return { unsafe: false };
}

export function hardDayCap(experience: number): {
  maxHardDays: number;
  minRestEasyDays: number;
} {
  return {
    maxHardDays: experience <= 1 ? 4 : 5,
    minRestEasyDays: 1,
  };
}

export function allowsHardDay(args: {
  experience: number;
  hardDaysInRolling7: number;
}): boolean {
  return args.hardDaysInRolling7 < hardDayCap(args.experience).maxHardDays;
}

export function countHardDays(
  quests: Array<{
    localDate: string;
    intensity: Intensity;
    status: QuestStatus;
  }>,
): number {
  const dates = new Set<string>();
  for (const q of quests) {
    if (
      q.intensity === "hard" &&
      (q.status === "completed" || q.status === "partial" || q.status === "issued")
    ) {
      dates.add(q.localDate);
    }
  }
  return dates.size;
}

export function clampPenaltyRpe(rpeMax: number): number {
  return Math.min(rpeMax, PENALTY_RPE_MAX);
}

export function penaltyRpeOk(rpeMax: number): boolean {
  return rpeMax <= PENALTY_RPE_MAX;
}

export function clampPenaltyBlocks<T extends { rpeMax: number }>(blocks: readonly T[]): T[] {
  return blocks.map((b) => ({ ...b, rpeMax: clampPenaltyRpe(b.rpeMax) }));
}

/** Fat-loss copy talks steps / sleep / consistency. Never emit calorie numbers. */
export const FAT_LOSS_COPY =
  "Focus on daily steps, sleep, and consistency. Small habits compound.";

export function fatLossCopy(): string {
  return FAT_LOSS_COPY;
}

export function copyMentionsCalories(text: string): boolean {
  return /calori/i.test(text) || /\bkcal\b/i.test(text);
}

export interface EffectWindow {
  kind: EffectKind;
  startsAt: string;
  endsAt: string;
  payload: UserEffect["payload"];
}

export function effectActive(
  effect: { startsAt: string; endsAt: string },
  now: Date,
): boolean {
  const t = now.getTime();
  return t >= Date.parse(effect.startsAt) && t < Date.parse(effect.endsAt);
}

export function painNoHardWindow(now: Date): EffectWindow {
  return {
    kind: "pain_no_hard",
    startsAt: now.toISOString(),
    endsAt: new Date(now.getTime() + PAIN_NO_HARD_MS).toISOString(),
    payload: {},
  };
}

/** Covers tomorrow 00:00–24:00 in `timeZone` (exclusive end at the following midnight). */
export function illnessRestWindow(now: Date, timeZone: string): EffectWindow {
  const today = localDate(now, timeZone);
  const tomorrow = addCalendarDays(today, 1);
  const dayAfter = addCalendarDays(today, 2);
  return {
    kind: "illness_rest",
    startsAt: zonedStartOfDayUtc(tomorrow, timeZone).toISOString(),
    endsAt: zonedStartOfDayUtc(dayAfter, timeZone).toISOString(),
    payload: {},
  };
}

/** Covers 2 local calendar days starting at today's local midnight. */
export function cautionVolumeWindow(now: Date, timeZone: string): EffectWindow {
  const today = localDate(now, timeZone);
  const end = addCalendarDays(today, CAUTION_VOLUME_LOCAL_DAYS);
  return {
    kind: "caution_volume",
    startsAt: zonedStartOfDayUtc(today, timeZone).toISOString(),
    endsAt: zonedStartOfDayUtc(end, timeZone).toISOString(),
    payload: { volumeMul: CAUTION_VOLUME_MUL },
  };
}

export function illnessRestAfterSecondDay(args: {
  now: Date;
  timeZone: string;
  hadIllnessSkipYesterday: boolean;
}): EffectWindow | null {
  if (!args.hadIllnessSkipYesterday) return null;
  return illnessRestWindow(args.now, args.timeZone);
}

export function consecutiveRequiredFailDays(
  daysNewestFirst: Array<{
    quests: Array<{ kind: QuestKind; status: QuestStatus }>;
  }>,
): number {
  let n = 0;
  for (const day of daysNewestFirst) {
    const hasFail = day.quests.some((q) => q.kind !== "penalty" && q.status === "failed");
    if (!hasFail) break;
    n += 1;
  }
  return n;
}

export function cautionVolumeAfterThreeFails(args: {
  now: Date;
  timeZone: string;
  last3DaysNewestFirst: Array<{
    quests: Array<{ kind: QuestKind; status: QuestStatus }>;
  }>;
}): EffectWindow | null {
  if (consecutiveRequiredFailDays(args.last3DaysNewestFirst) < 3) return null;
  return cautionVolumeWindow(args.now, args.timeZone);
}

export function volumeMulFromEffects(
  effects: Array<{ kind: EffectKind; startsAt: string; endsAt: string; payload: UserEffect["payload"] }>,
  now: Date,
): number {
  for (const e of effects) {
    if (e.kind === "caution_volume" && effectActive(e, now)) {
      const v = e.payload.volumeMul;
      if (typeof v === "number") return v;
    }
  }
  return 1;
}

export function hardBlockedByEffects(
  effects: Array<{ kind: EffectKind; startsAt: string; endsAt: string }>,
  now: Date,
): boolean {
  return effects.some(
    (e) =>
      (e.kind === "pain_no_hard" || e.kind === "illness_rest" || e.kind === "sick_window") &&
      effectActive(e, now),
  );
}

export function forceRestFromEffects(
  effects: Array<{ kind: EffectKind; startsAt: string; endsAt: string }>,
  now: Date,
): boolean {
  return effects.some(
    (e) => (e.kind === "illness_rest" || e.kind === "sick_window") && effectActive(e, now),
  );
}

export const ACTIVITY_STATUS_MIN_DAYS = 1;
export const ACTIVITY_STATUS_MAX_DAYS = 14;
export const TRAVEL_EQUIPMENT = ["none", "bands"] as const;

/** Owner: age > 45 → no knees-heavy yoga or lifts. */
export const AGE_KNEE_HEAVY_LIMIT = 45;
export const KNEE_HEAVY_TEMPLATE_IDS: readonly string[] = [
  "str_sit_to_stand_l0",
  "str_goblet_squat_l1",
  "yoga_warrior2",
  "yoga_child",
  "gym_back_squat",
  "gym_leg_press",
  "gym_lunge",
];

export function kneeHeavyBlocked(age: number | undefined, templateId: string): boolean {
  if (age === undefined || age <= AGE_KNEE_HEAVY_LIMIT) return false;
  return KNEE_HEAVY_TEMPLATE_IDS.includes(templateId);
}

export function parseActivityDays(days: number): number {
  if (
    !Number.isInteger(days) ||
    days < ACTIVITY_STATUS_MIN_DAYS ||
    days > ACTIVITY_STATUS_MAX_DAYS
  ) {
    throw new Error("ACTIVITY_DAYS_INVALID");
  }
  return days;
}

export function travelEquipment(have: readonly string[]): Array<"none" | "bands"> {
  const allowed = have.filter((e): e is "none" | "bands" => e === "none" || e === "bands");
  return allowed.length > 0 ? allowed : ["none"];
}

export function travelActive(
  effects: Array<{ kind: EffectKind; startsAt: string; endsAt: string }>,
  now: Date,
): boolean {
  return effects.some((e) => e.kind === "travel_window" && effectActive(e, now));
}

/** Inclusive local dates: today through today+days-1. */
export function activityStatusWindow(args: {
  now: Date;
  timeZone: string;
  kind: "travel_window" | "sick_window";
  days: number;
}): EffectWindow {
  const days = parseActivityDays(args.days);
  const today = localDate(args.now, args.timeZone);
  const endExclusive = addCalendarDays(today, days);
  const endsOn = addCalendarDays(today, days - 1);
  return {
    kind: args.kind,
    startsAt: zonedStartOfDayUtc(today, args.timeZone).toISOString(),
    endsAt: zonedStartOfDayUtc(endExclusive, args.timeZone).toISOString(),
    payload: { startsOn: today, endsOn, days },
  };
}

export function activityStatusFromEffects(
  effects: Array<{
    kind: EffectKind;
    startsAt: string;
    endsAt: string;
    payload?: UserEffect["payload"];
  }>,
  now: Date,
): {
  status: "training" | "travel" | "sick";
  startsOn: string | null;
  endsOn: string | null;
  days: number | null;
} {
  const sick = effects.find((e) => e.kind === "sick_window" && effectActive(e, now));
  const travel = effects.find((e) => e.kind === "travel_window" && effectActive(e, now));
  const active = sick ?? travel;
  if (!active) {
    return { status: "training", startsOn: null, endsOn: null, days: null };
  }
  const payload = active.payload ?? {};
  const startsOn = typeof payload.startsOn === "string" ? payload.startsOn : null;
  const endsOn = typeof payload.endsOn === "string" ? payload.endsOn : null;
  const days = typeof payload.days === "number" ? payload.days : null;
  return {
    status: active.kind === "sick_window" ? "sick" : "travel",
    startsOn,
    endsOn,
    days,
  };
}

export function localDate(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addCalendarDays(isoDate: string, days: number): string {
  const year = Number(isoDate.slice(0, 4));
  const month = Number(isoDate.slice(5, 7));
  const day = Number(isoDate.slice(8, 10));
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  const y = utc.getUTCFullYear();
  const m = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const d = String(utc.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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

function tzOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes): number => {
    const v = parts.find((p) => p.type === type)?.value;
    return Number(v);
  };
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return asUtc - date.getTime();
}

/** UTC instant of local midnight for `YYYY-MM-DD` in `timeZone`. */
export function zonedStartOfDayUtc(isoDate: string, timeZone: string): Date {
  const year = Number(isoDate.slice(0, 4));
  const month = Number(isoDate.slice(5, 7));
  const day = Number(isoDate.slice(8, 10));
  const utcGuess = Date.UTC(year, month - 1, day, 0, 0, 0);
  const guess = new Date(utcGuess);
  const offset = tzOffsetMs(guess, timeZone);
  const instant = new Date(utcGuess - offset);
  const offset2 = tzOffsetMs(instant, timeZone);
  if (offset2 !== offset) return new Date(utcGuess - offset2);
  return instant;
}
