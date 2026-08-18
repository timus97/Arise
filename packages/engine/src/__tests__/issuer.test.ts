import { describe, expect, it } from "vitest";
import type { DailyQuest, PlanDay } from "@arise/domain";
import { issueToday, type IssueTodayInput } from "../issuer.js";
import { CATALOG, requireTemplate } from "../templates/catalog.js";
import * as Engine from "../index.js";

const TZ = "Europe/Stockholm";
const NOW = new Date("2026-08-15T10:00:00.000Z");

function planDay(over: Partial<PlanDay> = {}): PlanDay {
  return {
    id: "pd1",
    planId: "p1",
    localDate: "2026-08-15",
    focus: "full_body",
    budgetMinutes: 40,
    hardAllowed: true,
    isGate: false,
    ...over,
  };
}

function args(over: Partial<IssueTodayInput> = {}): IssueTodayInput {
  const base: IssueTodayInput = {
    userId: "user_1",
    localDate: "2026-08-15",
    level: 1,
    planDay: planDay(),
    goalType: "muscle_gain",
    experience: 1,
    equipment: ["none", "dumbbells", "bands"],
    injuries: [],
    parqClear: true,
    recoveryScore: 80,
    last7Kinds: [],
    last7Patterns: [],
    last14TemplateIds: [],
    effects: [],
    now: NOW,
    timeZone: TZ,
  };
  return { ...base, ...over };
}

function ids(quests: DailyQuest[]): string[] {
  return quests.map((q) => q.templateId);
}

describe("issuer slots and filters", () => {
  it("empty-day fallback emits habit_sleep_window then cardio_zone2_walk @ 10 min, no others", () => {
    const { quests } = issueToday(args({ templates: [] }));
    expect(ids(quests)).toEqual(["habit_sleep_window", "cardio_zone2_walk"]);
    expect(quests).toHaveLength(2);
    expect(quests[0]?.prescription.estimatedMinutes).toBe(0);
    expect(quests[1]?.prescription.estimatedMinutes).toBe(10);
    expect(quests[1]?.prescription.blocks[0]?.seconds).toBe(600);
  });

  it("knee filter drops sit-to-stand and goblet but keeps hip unload", () => {
    const { quests } = issueToday(args({ injuries: ["knee"] }));
    expect(ids(quests)).not.toContain("str_sit_to_stand_l0");
    expect(ids(quests)).not.toContain("str_goblet_squat_l1");
    const hip = requireTemplate("mob_hip_unload");
    expect(hip.contraindicationKeys).not.toContain("knee");
    const mobility = issueToday(
      args({
        injuries: ["knee"],
        goalType: "mobility",
        planDay: planDay({ focus: "mobility", hardAllowed: false, budgetMinutes: 30 }),
      }),
    ).quests;
    expect(ids(mobility)).toContain("mob_hip_unload");
  });

  it("PAR-Q whitelist blocks strength and hard work", () => {
    const { quests } = issueToday(args({ parqClear: false, planDay: planDay({ focus: "full_body" }) }));
    expect(quests.every((q) => ["recovery", "mobility", "habit", "steps"].includes(q.kind))).toBe(true);
    expect(quests.every((q) => q.prescription.intensity === "rest" || q.prescription.intensity === "easy")).toBe(
      true,
    );
    expect(quests.some((q) => q.kind === "strength")).toBe(false);
    expect(ids(quests)).not.toContain("str_gym_full_body_l2");
  });

  it("does not persist an empty daily_quests set", () => {
    const { quests } = issueToday(
      args({
        templates: [],
        planDay: planDay({ focus: "rest", hardAllowed: false, budgetMinutes: 0 }),
      }),
    );
    expect(quests.length).toBeGreaterThan(0);
  });

  it("FEATURE_LLM_PLANNER does not exist", () => {
    expect("FEATURE_LLM_PLANNER" in Engine).toBe(false);
  });

  it("travel window does not issue gym-only templates", () => {
    const { activityStatusWindow } = Engine;
    const win = activityStatusWindow({
      now: NOW,
      timeZone: TZ,
      kind: "travel_window",
      days: 3,
    });
    const { quests } = issueToday(
      args({
        experience: 2,
        equipment: ["full_gym", "dumbbells"],
        effects: [win],
      }),
    );
    expect(ids(quests)).not.toContain("str_gym_full_body_l2");
  });

  it("sick window is rest/easy only and skips penalty", () => {
    const win = Engine.activityStatusWindow({
      now: NOW,
      timeZone: TZ,
      kind: "sick_window",
      days: 2,
    });
    const { quests } = issueToday(args({ effects: [win], penaltyOwed: true }));
    expect(quests.every((q) => q.prescription.intensity === "rest" || q.prescription.intensity === "easy")).toBe(
      true,
    );
    expect(quests.every((q) => (q.prescription.blocks[0]?.rpeMax ?? 0) <= 4)).toBe(true);
    expect(ids(quests)).not.toContain("penalty_easy_walk");
  });

  it("catalog is the only template source", () => {
    expect(CATALOG).toHaveLength(16);
    const issued = issueToday(args()).quests;
    for (const q of issued) {
      expect(CATALOG.some((t) => t.id === q.templateId)).toBe(true);
    }
  });
});
