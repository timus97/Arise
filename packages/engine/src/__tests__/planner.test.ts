import { describe, expect, it } from "vitest";
import { buildWeeklyPlan, focusSkeleton } from "../planner.js";

const BASE = {
  planId: "plan_1",
  userId: "user_1",
  goalId: "goal_1",
  startDate: "2026-08-10", // Monday
};

describe("weekly planner skeletons", () => {
  it("applies focus skeletons to available days only; unused weekdays are rest", () => {
    const { days } = buildWeeklyPlan({
      ...BASE,
      goalType: "fat_loss",
      experience: 1,
      week: [
        { weekday: 1, minutes: 40 },
        { weekday: 3, minutes: 40 },
        { weekday: 5, minutes: 30 },
        { weekday: 6, minutes: 50 },
      ],
    });
    expect(days.map((d) => d.focus)).toEqual([
      "mixed",
      "rest",
      "cardio",
      "rest",
      "mixed",
      "cardio",
      "rest",
    ]);
    expect(days.filter((d) => d.focus === "rest").every((d) => d.hardAllowed === false)).toBe(true);
  });

  it("muscle_gain exp>=2 and >=4 days uses push/pull/legs/full_body", () => {
    expect(focusSkeleton("muscle_gain", 2, 4)).toEqual(["push", "pull", "legs", "full_body"]);
    const { days } = buildWeeklyPlan({
      ...BASE,
      goalType: "muscle_gain",
      experience: 2,
      week: [
        { weekday: 1, minutes: 45 },
        { weekday: 2, minutes: 45 },
        { weekday: 4, minutes: 45 },
        { weekday: 6, minutes: 45 },
      ],
    });
    expect(days.filter((d) => d.focus !== "rest").map((d) => d.focus)).toEqual([
      "push",
      "pull",
      "legs",
      "full_body",
    ]);
  });

  it("muscle_gain otherwise is full_body × 3", () => {
    expect(focusSkeleton("muscle_gain", 1, 5)).toEqual(["full_body", "full_body", "full_body"]);
  });

  it("uses the remaining published skeletons", () => {
    expect(focusSkeleton("recomposition", 1, 5)).toEqual([
      "full_body",
      "cardio",
      "full_body",
      "cardio",
      "full_body",
    ]);
    expect(focusSkeleton("endurance", 1, 4)).toEqual(["cardio", "cardio", "mixed", "cardio"]);
    expect(focusSkeleton("general_fitness", 1, 5)).toEqual([
      "full_body",
      "cardio",
      "mobility",
      "full_body",
      "cardio",
    ]);
    expect(focusSkeleton("mobility", 1, 4)).toEqual(["mobility", "cardio", "mobility", "mobility"]);
  });

  it("fewer than 2 available days: full_body, hardAllowed false if budget < 30", () => {
    const low = buildWeeklyPlan({
      ...BASE,
      goalType: "muscle_gain",
      experience: 2,
      week: [{ weekday: 1, minutes: 20 }],
    });
    const trained = low.days.filter((d) => d.focus !== "rest");
    expect(trained).toHaveLength(1);
    expect(trained[0]?.focus).toBe("full_body");
    expect(trained[0]?.hardAllowed).toBe(false);

    const ok = buildWeeklyPlan({
      ...BASE,
      goalType: "fat_loss",
      experience: 1,
      week: [{ weekday: 3, minutes: 40 }],
    });
    const one = ok.days.find((d) => d.focus !== "rest");
    expect(one?.focus).toBe("full_body");
    expect(one?.hardAllowed).toBe(true);
  });

  it("hardAllowed is false for cardio-only / mobility / rest days", () => {
    const { days } = buildWeeklyPlan({
      ...BASE,
      goalType: "endurance",
      experience: 2,
      week: [
        { weekday: 1, minutes: 40 },
        { weekday: 2, minutes: 40 },
        { weekday: 3, minutes: 40 },
        { weekday: 4, minutes: 40 },
      ],
    });
    expect(days.filter((d) => d.focus === "cardio").every((d) => d.hardAllowed === false)).toBe(true);
    expect(days.find((d) => d.focus === "mixed")?.hardAllowed).toBe(true);
  });

  it("sets isGate on the latest qualifying day, or none", () => {
    const { days } = buildWeeklyPlan({
      ...BASE,
      goalType: "muscle_gain",
      experience: 1,
      week: [
        { weekday: 1, minutes: 40 },
        { weekday: 3, minutes: 40 },
        { weekday: 5, minutes: 30 },
        { weekday: 6, minutes: 50 },
      ],
    });
    const gates = days.filter((d) => d.isGate);
    expect(gates).toHaveLength(1);
    expect(gates[0]?.localDate).toBe("2026-08-15");
    expect(gates[0]?.budgetMinutes).toBe(50);

    const noGate = buildWeeklyPlan({
      ...BASE,
      goalType: "endurance",
      experience: 1,
      week: [
        { weekday: 1, minutes: 40 },
        { weekday: 2, minutes: 40 },
      ],
    });
    expect(noGate.days.every((d) => d.isGate === false)).toBe(true);
  });
});
