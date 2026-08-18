import { describe, expect, it } from "vitest";
import { applyStatTick } from "../stats.js";
import {
  allowsHardDay,
  cautionVolumeAfterThreeFails,
  clampPenaltyRpe,
  copyMentionsCalories,
  countHardDays,
  effectActive,
  evaluateImpliedLoss,
  evaluateParq,
  fatLossCopy,
  activityStatusFromEffects,
  activityStatusWindow,
  forceRestFromEffects,
  hardBlockedByEffects,
  travelActive,
  travelEquipment,
  hardDayCap,
  illnessRestAfterSecondDay,
  localDate,
  painNoHardWindow,
  parqAllowsTemplate,
  PENALTY_RPE_MAX,
  PREGNANCY_HARD_STOP,
  PREGNANCY_HARD_STOP_MESSAGE,
  UNSAFE_LOSS_RATE,
  zonedStartOfDayUtc,
} from "../safety.js";

const CLEAR_PARQ = {
  chestPain: false,
  dizziness: false,
  doctorAdvisedAgainst: false,
  pregnancy: false,
  uncontrolledCondition: false,
};

describe("pregnancy hard-stop and PAR-Q whitelist", () => {
  it("hard-stops on pregnancy", () => {
    const result = evaluateParq({ ...CLEAR_PARQ, pregnancy: true });
    expect(result).toEqual({
      blocked: true,
      code: PREGNANCY_HARD_STOP,
      message: PREGNANCY_HARD_STOP_MESSAGE,
      actions: ["deleteAccount"],
      parqClear: false,
      easyOnly: true,
    });
  });

  it("other PAR-Q yes → easy whitelist", () => {
    const result = evaluateParq({ ...CLEAR_PARQ, chestPain: true });
    expect(result).toEqual({ blocked: false, parqClear: false, easyOnly: true });
    expect(parqAllowsTemplate(false, "recovery", "easy")).toBe(true);
    expect(parqAllowsTemplate(false, "mobility", "rest")).toBe(true);
    expect(parqAllowsTemplate(false, "habit", "easy")).toBe(true);
    expect(parqAllowsTemplate(false, "steps", "easy")).toBe(true);
    expect(parqAllowsTemplate(false, "strength", "easy")).toBe(false);
    expect(parqAllowsTemplate(false, "recovery", "hard")).toBe(false);
    expect(parqAllowsTemplate(true, "strength", "hard")).toBe(true);
  });
});

describe("implied loss reject", () => {
  const tz = "Europe/Stockholm";
  const now = new Date("2026-08-15T10:00:00.000Z");

  it("rejects fat_loss faster than 1% bodyweight per week", () => {
    const result = evaluateImpliedLoss({
      type: "fat_loss",
      weightKg: 80,
      targetWeightKg: 70,
      targetDate: "2026-08-29",
      now,
      timeZone: tz,
    });
    expect(result.unsafe).toBe(true);
    if (result.unsafe) {
      expect(result.code).toBe(UNSAFE_LOSS_RATE);
      expect(result.maxKgPerWeek).toBe(0.8);
      expect(result.weeklyKg).toBe(5);
    }
  });

  it("allows the design onboarding example 72 → 66 by 2026-12-01", () => {
    const result = evaluateImpliedLoss({
      type: "fat_loss",
      weightKg: 72,
      targetWeightKg: 66,
      targetDate: "2026-12-01",
      now,
      timeZone: tz,
    });
    expect(result.unsafe).toBe(false);
  });

  it("does not apply when type is not fat_loss or targets are missing", () => {
    expect(
      evaluateImpliedLoss({
        type: "muscle_gain",
        weightKg: 80,
        targetWeightKg: 70,
        targetDate: "2026-08-22",
        now,
        timeZone: tz,
      }).unsafe,
    ).toBe(false);
    expect(
      evaluateImpliedLoss({
        type: "fat_loss",
        weightKg: 80,
        targetWeightKg: null,
        targetDate: "2026-08-22",
        now,
        timeZone: tz,
      }).unsafe,
    ).toBe(false);
  });
});

describe("effect windows", () => {
  const tz = "Europe/Stockholm";
  const now = new Date("2026-08-15T10:00:00.000Z");

  it("pain_no_hard lasts 24 hours from now", () => {
    const win = painNoHardWindow(now);
    expect(win.kind).toBe("pain_no_hard");
    expect(win.startsAt).toBe(now.toISOString());
    expect(win.endsAt).toBe(new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString());
    expect(effectActive(win, now)).toBe(true);
    expect(effectActive(win, new Date(now.getTime() + 24 * 60 * 60 * 1000))).toBe(false);
    expect(hardBlockedByEffects([win], now)).toBe(true);
  });

  it("2 consecutive illness days → illness_rest covering the next local day", () => {
    const win = illnessRestAfterSecondDay({
      now,
      timeZone: tz,
      hadIllnessSkipYesterday: true,
    });
    expect(win).not.toBeNull();
    if (!win) return;
    expect(win.kind).toBe("illness_rest");
    expect(localDate(now, tz)).toBe("2026-08-15");
    expect(win.startsAt).toBe(zonedStartOfDayUtc("2026-08-16", tz).toISOString());
    expect(win.endsAt).toBe(zonedStartOfDayUtc("2026-08-17", tz).toISOString());
    expect(illnessRestAfterSecondDay({ now, timeZone: tz, hadIllnessSkipYesterday: false })).toBeNull();
  });

  it("3 consecutive fail days → caution_volume for 2 local days at volumeMul 0.7", () => {
    const fails = [
      { quests: [{ kind: "strength" as const, status: "failed" as const }] },
      { quests: [{ kind: "cardio" as const, status: "failed" as const }] },
      { quests: [{ kind: "habit" as const, status: "failed" as const }] },
    ];
    const win = cautionVolumeAfterThreeFails({
      now,
      timeZone: tz,
      last3DaysNewestFirst: fails,
    });
    expect(win).not.toBeNull();
    if (!win) return;
    expect(win.kind).toBe("caution_volume");
    expect(win.payload).toEqual({ volumeMul: 0.7 });
    expect(win.startsAt).toBe(zonedStartOfDayUtc("2026-08-15", tz).toISOString());
    expect(win.endsAt).toBe(zonedStartOfDayUtc("2026-08-17", tz).toISOString());
    expect(
      cautionVolumeAfterThreeFails({
        now,
        timeZone: tz,
        last3DaysNewestFirst: [
          { quests: [{ kind: "strength", status: "completed" }] },
          ...fails.slice(1),
        ],
      }),
    ).toBeNull();
  });
});

describe("activity status windows", () => {
  const tz = "Europe/Stockholm";
  const now = new Date("2026-08-15T10:00:00.000Z");

  it("rejects days 0 and 15; 1–14 cover inclusive local dates", () => {
    expect(() =>
      activityStatusWindow({ now, timeZone: tz, kind: "travel_window", days: 0 }),
    ).toThrow("ACTIVITY_DAYS_INVALID");
    expect(() =>
      activityStatusWindow({ now, timeZone: tz, kind: "sick_window", days: 15 }),
    ).toThrow("ACTIVITY_DAYS_INVALID");
    const one = activityStatusWindow({ now, timeZone: tz, kind: "travel_window", days: 1 });
    expect(one.payload).toEqual({ startsOn: "2026-08-15", endsOn: "2026-08-15", days: 1 });
    expect(one.startsAt).toBe(zonedStartOfDayUtc("2026-08-15", tz).toISOString());
    expect(one.endsAt).toBe(zonedStartOfDayUtc("2026-08-16", tz).toISOString());
    const two = activityStatusWindow({ now, timeZone: tz, kind: "sick_window", days: 2 });
    expect(two.payload.endsOn).toBe("2026-08-16");
  });

  it("sick_window forces rest and blocks hard; travel is living-room kit", () => {
    const sick = activityStatusWindow({ now, timeZone: tz, kind: "sick_window", days: 1 });
    expect(forceRestFromEffects([sick], now)).toBe(true);
    expect(hardBlockedByEffects([sick], now)).toBe(true);
    const travel = activityStatusWindow({ now, timeZone: tz, kind: "travel_window", days: 1 });
    expect(travelActive([travel], now)).toBe(true);
    expect(travelEquipment(["full_gym", "dumbbells"])).toEqual(["none"]);
    expect(travelEquipment(["bands", "full_gym"])).toEqual(["bands"]);
    expect(activityStatusFromEffects([sick], now).status).toBe("sick");
    expect(activityStatusFromEffects([travel], now).status).toBe("travel");
    expect(activityStatusFromEffects([], now).status).toBe("training");
  });
});

describe("penalty RPE clamp", () => {
  it("clamps rpeMax to <= 4", () => {
    expect(PENALTY_RPE_MAX).toBe(4);
    expect(clampPenaltyRpe(7)).toBe(4);
    expect(clampPenaltyRpe(4)).toBe(4);
    expect(clampPenaltyRpe(3)).toBe(3);
  });
});

describe("hard-day cap", () => {
  it("exp 0–1 → max 4 hard / 7d min 1 rest; exp 2–3 → max 5", () => {
    expect(hardDayCap(0)).toEqual({ maxHardDays: 4, minRestEasyDays: 1 });
    expect(hardDayCap(1)).toEqual({ maxHardDays: 4, minRestEasyDays: 1 });
    expect(hardDayCap(2)).toEqual({ maxHardDays: 5, minRestEasyDays: 1 });
    expect(hardDayCap(3)).toEqual({ maxHardDays: 5, minRestEasyDays: 1 });
    expect(allowsHardDay({ experience: 1, hardDaysInRolling7: 3 })).toBe(true);
    expect(allowsHardDay({ experience: 1, hardDaysInRolling7: 4 })).toBe(false);
    expect(allowsHardDay({ experience: 3, hardDaysInRolling7: 4 })).toBe(true);
    expect(allowsHardDay({ experience: 3, hardDaysInRolling7: 5 })).toBe(false);
  });

  it("counts distinct local dates with hard completed/partial/issued quests", () => {
    expect(
      countHardDays([
        { localDate: "2026-08-15", intensity: "hard", status: "issued" },
        { localDate: "2026-08-15", intensity: "hard", status: "completed" },
        { localDate: "2026-08-14", intensity: "hard", status: "partial" },
        { localDate: "2026-08-13", intensity: "hard", status: "failed" },
        { localDate: "2026-08-12", intensity: "easy", status: "completed" },
      ]),
    ).toBe(2);
  });
});

describe("copy helper", () => {
  it("talks steps/sleep/consistency and never mentions calories", () => {
    const copy = fatLossCopy();
    expect(copy.toLowerCase()).toMatch(/steps/);
    expect(copy.toLowerCase()).toMatch(/sleep/);
    expect(copy.toLowerCase()).toMatch(/consistenc/);
    expect(copyMentionsCalories(copy)).toBe(false);
    expect(copy).not.toMatch(/\d+\s*kcal/i);
  });
});

describe("stat tick", () => {
  it("caps each key at midnight + 1.0 and never writes int", () => {
    const midnight = { str: 10, agi: 10, vit: 10, intl: 10, sta: 10 };
    const current = { ...midnight, intl: 10.6 };
    const next = applyStatTick({
      current,
      midnight,
      delta: { intl: 0.8, str: 0.4 },
    });
    expect(next.intl).toBe(11);
    expect(next.str).toBe(10.4);
    expect(next).not.toHaveProperty("int");
    const partial = applyStatTick({
      current: midnight,
      midnight,
      delta: { sta: 0.8 },
      effort: "partial",
    });
    expect(partial.sta).toBe(10.4);
  });
});
