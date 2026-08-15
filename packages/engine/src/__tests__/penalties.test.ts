import { describe, expect, it } from "vitest";
import { catchUpMissedDays, resolveSkip } from "../penalties.js";
import { issueToday, type IssueTodayInput } from "../issuer.js";
import { requireTemplate } from "../templates/catalog.js";
import { addCalendarDays, penaltyRpeOk } from "../safety.js";
import type { PlanDay } from "@arise/domain";

const TZ = "Europe/Stockholm";
const TODAY = "2026-08-15";
const NOW = new Date("2026-08-15T10:00:00.000Z");

function planDay(over: Partial<PlanDay> = {}): PlanDay {
  return {
    id: "pd1",
    planId: "p1",
    localDate: TODAY,
    focus: "full_body",
    budgetMinutes: 40,
    hardAllowed: true,
    isGate: false,
    ...over,
  };
}

describe("catch-up 3-day gap", () => {
  it("unissued absences are not fails and catch-up inserts no quests", () => {
    const last = addCalendarDays(TODAY, -3);
    const result = catchUpMissedDays({
      lastEnsuredLocalDate: last,
      today: TODAY,
      existingQuests: [],
      now: NOW,
      timeZone: TZ,
    });
    expect(result.catchUpDates).toEqual([
      addCalendarDays(TODAY, -3),
      addCalendarDays(TODAY, -2),
      addCalendarDays(TODAY, -1),
    ]);
    expect(result.flippedDates).toEqual([]);
    expect(result.questsToInsert).toEqual([]);
    expect(result.streakReset).toBe(false);
    expect(result.penaltyOwed).toBe(false);
    expect(result.failFrom).toBe(last);
    expect(result.failUntil).toBe(TODAY);
  });

  it("fails only leftover issued rows and still inserts no quests", () => {
    const last = addCalendarDays(TODAY, -3);
    const issuedDate = addCalendarDays(TODAY, -1);
    const result = catchUpMissedDays({
      lastEnsuredLocalDate: last,
      today: TODAY,
      existingQuests: [
        { localDate: issuedDate, status: "issued", kind: "strength" },
        { localDate: addCalendarDays(TODAY, -2), status: "completed", kind: "habit" },
      ],
      now: NOW,
      timeZone: TZ,
    });
    expect(result.flippedDates).toEqual([issuedDate]);
    expect(result.questsToInsert).toEqual([]);
    expect(result.streakReset).toBe(true);
    expect(result.penaltyDates).toEqual([issuedDate]);
    expect(result.penaltyOwed).toBe(true);
  });

  it("already-failed last 3 days still insert caution_volume on next-day ensure", () => {
    const yesterday = addCalendarDays(TODAY, -1);
    const d2 = addCalendarDays(TODAY, -2);
    const d3 = addCalendarDays(TODAY, -3);
    const result = catchUpMissedDays({
      lastEnsuredLocalDate: yesterday,
      today: TODAY,
      existingQuests: [
        { localDate: yesterday, status: "issued", kind: "strength" },
        { localDate: d2, status: "failed", kind: "strength" },
        { localDate: d3, status: "failed", kind: "strength" },
      ],
      now: NOW,
      timeZone: TZ,
    });
    expect(result.catchUpDates).toEqual([yesterday]);
    expect(result.flippedDates).toEqual([yesterday]);
    expect(result.cautionVolume?.kind).toBe("caution_volume");
    expect(result.cautionVolume?.payload).toEqual({ volumeMul: 0.7 });
    expect(result.questsToInsert).toEqual([]);
  });

  it("already-failed last 3 days insert caution_volume even with no new flips", () => {
    const yesterday = addCalendarDays(TODAY, -1);
    const result = catchUpMissedDays({
      lastEnsuredLocalDate: yesterday,
      today: TODAY,
      existingQuests: [
        { localDate: yesterday, status: "failed", kind: "strength" },
        { localDate: addCalendarDays(TODAY, -2), status: "failed", kind: "cardio" },
        { localDate: addCalendarDays(TODAY, -3), status: "failed", kind: "habit" },
      ],
      now: NOW,
      timeZone: TZ,
    });
    expect(result.flippedDates).toEqual([]);
    expect(result.cautionVolume?.kind).toBe("caution_volume");
    expect(result.cautionVolume?.payload).toEqual({ volumeMul: 0.7 });
    expect(result.questsToInsert).toEqual([]);
  });

  it("three consecutive flipped dates insert caution_volume for 2 local days", () => {
    const d1 = addCalendarDays(TODAY, -1);
    const d2 = addCalendarDays(TODAY, -2);
    const d3 = addCalendarDays(TODAY, -3);
    const result = catchUpMissedDays({
      lastEnsuredLocalDate: d3,
      today: TODAY,
      existingQuests: [
        { localDate: d1, status: "issued", kind: "strength" },
        { localDate: d2, status: "issued", kind: "cardio" },
        { localDate: d3, status: "issued", kind: "habit" },
      ],
      now: NOW,
      timeZone: TZ,
    });
    expect(result.flippedDates).toEqual([d3, d2, d1]);
    expect(result.cautionVolume?.kind).toBe("caution_volume");
    expect(result.cautionVolume?.payload).toEqual({ volumeMul: 0.7 });
    expect(result.questsToInsert).toEqual([]);
  });

  it("open interval longer than 14 days keeps the 14 most recent dates", () => {
    const last = addCalendarDays(TODAY, -20);
    const result = catchUpMissedDays({
      lastEnsuredLocalDate: last,
      today: TODAY,
      existingQuests: [],
      now: NOW,
      timeZone: TZ,
    });
    expect(result.catchUpDates).toHaveLength(14);
    expect(result.catchUpDates[0]).toBe(addCalendarDays(TODAY, -14));
    expect(result.catchUpDates[13]).toBe(addCalendarDays(TODAY, -1));
    expect(result.failFrom).toBe(last);
    expect(result.questsToInsert).toEqual([]);
  });
});

describe("skip / fail helpers", () => {
  it("busy 3rd in the ISO week is fail not skip", () => {
    const week = "2026-08-12"; // Wednesday; ISO week Mon 10–Sun 16
    const first = resolveSkip({
      reason: "busy",
      now: NOW,
      timeZone: TZ,
      localDate: week,
      busySkipDatesThisIsoWeek: [],
      hadIllnessSkipYesterday: false,
    });
    expect(first.status).toBe("skipped");
    const second = resolveSkip({
      reason: "busy",
      now: NOW,
      timeZone: TZ,
      localDate: "2026-08-13",
      busySkipDatesThisIsoWeek: [week],
      hadIllnessSkipYesterday: false,
    });
    expect(second.status).toBe("skipped");
    const third = resolveSkip({
      reason: "busy",
      now: NOW,
      timeZone: TZ,
      localDate: "2026-08-14",
      busySkipDatesThisIsoWeek: [week, "2026-08-13"],
      hadIllnessSkipYesterday: false,
    });
    expect(third.status).toBe("failed");
    expect(third.skipReason).toBe("busy");
    expect(third.effect).toBeNull();
  });

  it("busy skips in the previous ISO week do not count", () => {
    const third = resolveSkip({
      reason: "busy",
      now: NOW,
      timeZone: TZ,
      localDate: "2026-08-10",
      busySkipDatesThisIsoWeek: ["2026-08-07", "2026-08-08"],
      hadIllnessSkipYesterday: false,
    });
    expect(third.status).toBe("skipped");
  });
});

describe("penalty RPE", () => {
  it("penalty_easy_walk has rpeMax <= 4, estimatedMinutes <= 20, source penalty", () => {
    const t = requireTemplate("penalty_easy_walk");
    const rx = t.build({ experience: 3, recoveryScore: 80, budgetMinutes: 20, volumeMul: 1 });
    expect(rx.estimatedMinutes).toBeLessThanOrEqual(20);
    expect(rx.blocks.every((b) => penaltyRpeOk(b.rpeMax))).toBe(true);
    expect(rx.blocks.every((b) => b.rpeMax <= 4)).toBe(true);

    const beginner = t.build({ experience: 0, recoveryScore: 40, budgetMinutes: 20, volumeMul: 1 });
    expect(beginner.blocks.every((b) => b.rpeMax <= 4)).toBe(true);

    const input: IssueTodayInput = {
      userId: "user_1",
      localDate: TODAY,
      level: 1,
      planDay: planDay(),
      goalType: "muscle_gain",
      experience: 1,
      equipment: ["none", "dumbbells"],
      injuries: [],
      parqClear: true,
      recoveryScore: 80,
      last7Kinds: [],
      last7Patterns: [],
      last14TemplateIds: [],
      effects: [],
      now: NOW,
      timeZone: TZ,
      penaltyOwed: true,
    };
    const { quests } = issueToday(input);
    const penalty = quests.find((q) => q.templateId === "penalty_easy_walk");
    expect(penalty).toBeDefined();
    expect(penalty?.source).toBe("penalty");
    expect(penalty?.prescription.estimatedMinutes).toBeLessThanOrEqual(20);
    expect(penalty?.prescription.blocks.every((b) => b.rpeMax <= 4)).toBe(true);
    expect(penalty?.xpReward).toBe(10);
  });
});
