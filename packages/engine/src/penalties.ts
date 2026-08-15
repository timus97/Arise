import type { QuestKind, QuestStatus } from "@arise/domain";
import { isoWeekday } from "./planner.js";
import {
  addCalendarDays,
  cautionVolumeAfterThreeFails,
  type EffectWindow,
  illnessRestAfterSecondDay,
  painNoHardWindow,
} from "./safety.js";

export type SkipReason = "rest_planned" | "illness" | "pain" | "busy";

export function isoWeekStart(isoDate: string): string {
  return addCalendarDays(isoDate, 1 - isoWeekday(isoDate));
}

export function localDatesInRange(fromInclusive: string, toExclusive: string): string[] {
  const out: string[] = [];
  let d = fromInclusive;
  while (d < toExclusive) {
    out.push(d);
    d = addCalendarDays(d, 1);
  }
  return out;
}

export function countBusySkipsInIsoWeek(args: {
  localDate: string;
  skips: Array<{ localDate: string; reason: string }>;
}): number {
  const start = isoWeekStart(args.localDate);
  const end = addCalendarDays(start, 7);
  return args.skips.filter((s) => s.reason === "busy" && s.localDate >= start && s.localDate < end).length;
}

export interface ResolveSkipInput {
  reason: SkipReason;
  now: Date;
  timeZone: string;
  localDate: string;
  busySkipDatesThisIsoWeek: string[];
  hadIllnessSkipYesterday: boolean;
}

export interface ResolveSkipResult {
  status: "skipped" | "failed";
  skipReason: SkipReason;
  effect: EffectWindow | null;
}

export function resolveSkip(input: ResolveSkipInput): ResolveSkipResult {
  if (input.reason === "busy") {
    const existing = countBusySkipsInIsoWeek({
      localDate: input.localDate,
      skips: input.busySkipDatesThisIsoWeek.map((localDate) => ({ localDate, reason: "busy" })),
    });
    if (existing >= 2) {
      return { status: "failed", skipReason: "busy", effect: null };
    }
    return { status: "skipped", skipReason: "busy", effect: null };
  }
  if (input.reason === "pain") {
    return { status: "skipped", skipReason: "pain", effect: painNoHardWindow(input.now) };
  }
  if (input.reason === "illness") {
    return {
      status: "skipped",
      skipReason: "illness",
      effect: illnessRestAfterSecondDay({
        now: input.now,
        timeZone: input.timeZone,
        hadIllnessSkipYesterday: input.hadIllnessSkipYesterday,
      }),
    };
  }
  return { status: "skipped", skipReason: "rest_planned", effect: null };
}

export interface CatchUpQuest {
  localDate: string;
  status: QuestStatus;
  kind: QuestKind;
}

export interface CatchUpInput {
  lastEnsuredLocalDate: string | null;
  today: string;
  existingQuests: CatchUpQuest[];
  now: Date;
  timeZone: string;
}

export interface CatchUpResult {
  failFrom: string | null;
  failUntil: string;
  catchUpDates: string[];
  flippedDates: string[];
  /** Catch-up never inserts quests for missed dates. */
  questsToInsert: [];
  streakReset: boolean;
  penaltyDates: string[];
  cautionVolume: EffectWindow | null;
  penaltyOwed: boolean;
}

const CATCH_UP_CAP = 14;

export function catchUpMissedDays(input: CatchUpInput): CatchUpResult {
  const empty: CatchUpResult = {
    failFrom: null,
    failUntil: input.today,
    catchUpDates: [],
    flippedDates: [],
    questsToInsert: [],
    streakReset: false,
    penaltyDates: [],
    cautionVolume: null,
    penaltyOwed: false,
  };
  const last = input.lastEnsuredLocalDate;
  if (last == null || last >= input.today) return empty;

  const all = localDatesInRange(last, input.today);
  const catchUpDates = all.length > CATCH_UP_CAP ? all.slice(-CATCH_UP_CAP) : all;
  const catchUpSet = new Set(catchUpDates);

  const flipped = new Set<string>();
  for (const q of input.existingQuests) {
    if (q.status === "issued" && q.localDate >= last && q.localDate < input.today) {
      flipped.add(q.localDate);
    }
  }
  const flippedDates = [...flipped].sort();
  const windowFlipped = flippedDates.filter((d) => catchUpSet.has(d));

  const afterFail = input.existingQuests.map((q) =>
    q.status === "issued" && q.localDate >= last && q.localDate < input.today
      ? { ...q, status: "failed" as const }
      : q,
  );

  const last3 = [addCalendarDays(input.today, -1), addCalendarDays(input.today, -2), addCalendarDays(input.today, -3)];
  const last3DaysNewestFirst = last3.map((localDate) => ({
    quests: afterFail.filter((q) => q.localDate === localDate && catchUpSet.has(localDate)),
  }));

  const cautionVolume = cautionVolumeAfterThreeFails({
    now: input.now,
    timeZone: input.timeZone,
    last3DaysNewestFirst,
  });

  const yesterday = addCalendarDays(input.today, -1);
  const yesterdayFailed = afterFail.some(
    (q) => q.localDate === yesterday && q.kind !== "penalty" && q.status === "failed",
  );

  return {
    failFrom: last,
    failUntil: input.today,
    catchUpDates,
    flippedDates,
    questsToInsert: [],
    streakReset: windowFlipped.length > 0,
    penaltyDates: flippedDates,
    cautionVolume,
    penaltyOwed: flippedDates.length > 0 || yesterdayFailed,
  };
}

export function shouldSuggestRegenerate(
  days: Array<{ localDate: string; quests: Array<{ status: QuestStatus }> }>,
): boolean {
  const dated = days.filter((d) => d.quests.length > 0);
  if (dated.length < 7) return false;
  let done = 0;
  let den = 0;
  for (const day of dated) {
    for (const q of day.quests) {
      if (q.status === "skipped") continue;
      if (q.status === "completed" || q.status === "partial" || q.status === "auto_completed") {
        done += 1;
        den += 1;
      } else if (q.status === "issued" || q.status === "failed") {
        den += 1;
      }
    }
  }
  if (den === 0) return false;
  return done / den < 0.3;
}
