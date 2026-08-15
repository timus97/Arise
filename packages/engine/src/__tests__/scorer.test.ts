import { describe, expect, it } from "vitest";
import {
  CATALOG,
  TEMPLATE_IDS,
  goalAlignment,
  isTemplateEligible,
  freshness,
  recoveryFit,
  requireTemplate,
  scoreBreakdown,
  scoreTemplate,
  timeFit,
} from "../index.js";

const GOBLET = "str_goblet_squat_l1";

const SCORE_BASE = {
  last7Kinds: [] as import("@arise/domain").QuestKind[],
  last7Patterns: [] as import("@arise/domain").PatternTag[],
  last14TemplateIds: [] as string[],
  remainingMinutes: 40,
  recoveryScore: 80,
};

describe("v1 catalog", () => {
  it("is exactly the 16 Appendix A ids and has no habit_log_weight", () => {
    expect(TEMPLATE_IDS).toHaveLength(16);
    expect(CATALOG).toHaveLength(16);
    expect(CATALOG.map((t) => t.id)).toEqual([...TEMPLATE_IDS]);
    expect(TEMPLATE_IDS).not.toContain("habit_log_weight");
    expect(CATALOG.some((t) => t.id === "habit_log_weight")).toBe(false);
    expect(CATALOG.every((t) => t.requiredAll.length === 0)).toBe(true);
  });

  it("encodes goblet vectors and contraindications from Appendix A", () => {
    const goblet = requireTemplate(GOBLET);
    expect(goblet.statDelta).toEqual({ str: 0.35, vit: 0.14 });
    expect(goblet.goalTags).toContain("muscle_gain");
    expect(goblet.goalTags).not.toContain("mobility");
    expect(goblet.contraindicationKeys).toEqual(["knee"]);
    expect(requireTemplate("str_sit_to_stand_l0").contraindicationKeys).toEqual(["knee"]);
    expect(requireTemplate("str_incline_push_l0").contraindicationKeys).toEqual(["shoulder", "wrist"]);
    expect(requireTemplate("str_hip_hinge_l0").contraindicationKeys).toEqual(["spine"]);
    expect(requireTemplate("mob_hip_unload").contraindicationKeys).toEqual([]);
    expect(requireTemplate("cardio_zone2_walk").requiredAny).toEqual(["none"]);
    expect(requireTemplate("mob_hip_unload").requiredAny).toEqual(["none"]);
    expect(requireTemplate("mob_tspine").requiredAny).toEqual(["none"]);
  });

  it("build() scales sets, clamps beginner RPE, and shortens the walk fallback", () => {
    const goblet = requireTemplate(GOBLET);
    const full = goblet.build({ experience: 2, recoveryScore: 80, budgetMinutes: 40, volumeMul: 1 });
    expect(full.blocks[0]?.sets).toBe(3);
    expect(full.blocks[0]?.rpeMax).toBe(7);

    const lowRec = goblet.build({ experience: 2, recoveryScore: 54, budgetMinutes: 40, volumeMul: 1 });
    expect(lowRec.blocks[0]?.sets).toBe(2);

    const caution = goblet.build({ experience: 2, recoveryScore: 80, budgetMinutes: 40, volumeMul: 0.7 });
    expect(caution.blocks[0]?.sets).toBe(2);

    const beginner = requireTemplate("str_sit_to_stand_l0").build({
      experience: 1,
      recoveryScore: 80,
      budgetMinutes: 40,
      volumeMul: 1,
    });
    expect(beginner.blocks.every((b) => b.rpeMax <= 7)).toBe(true);

    const walk = requireTemplate("cardio_zone2_walk").build({
      experience: 1,
      recoveryScore: 80,
      budgetMinutes: 10,
      volumeMul: 1,
    });
    expect(walk.estimatedMinutes).toBe(10);
    expect(walk.blocks[0]?.seconds).toBe(600);
  });
});

describe("scorer goldens", () => {
  it("str_goblet_squat_l1 vs muscle_gain empty history remaining 40 recovery 80 → score === 80", () => {
    const t = requireTemplate(GOBLET);
    const parts = scoreBreakdown({ t, goalType: "muscle_gain", ...SCORE_BASE });
    expect(parts.goalAlignment).toBe(55);
    expect(parts.weekBalance).toBe(100);
    expect(parts.freshness).toBe(100);
    expect(parts.timeFit).toBe(100);
    expect(parts.recoveryFit).toBe(80);
    expect(parts.score).toBe(80);
    expect(scoreTemplate({ t, goalType: "muscle_gain", ...SCORE_BASE })).toBe(80);
    expect(
      isTemplateEligible({
        t,
        equipment: ["dumbbells"],
        injuries: [],
        experience: 1,
        remainingMinutes: 40,
        recoveryScore: 80,
        hardAllowed: true,
        parqClear: true,
        hardBlocked: false,
      }),
    ).toBe(true);
  });

  it("same vs mobility: goalAlignment === 100 * (0.35*0.5 + 0.14*1.8) / 1.76 ≈ 24.261", () => {
    const t = requireTemplate(GOBLET);
    const expected = (100 * (0.35 * 0.5 + 0.14 * 1.8)) / 1.76;
    const ga = goalAlignment(t, "mobility");
    expect(ga).toBeCloseTo(24.261, 3);
    expect(ga).toBeCloseTo(expected, 10);
    expect(55 - ga).toBeGreaterThanOrEqual(10);
  });

  it("freshness idx 0 → 30; absent → 100", () => {
    const t = requireTemplate(GOBLET);
    expect(freshness(t, [GOBLET, "cardio_zone2_walk"])).toBe(30);
    expect(freshness(t, ["cardio_zone2_walk"])).toBe(100);
    expect(freshness(t, [])).toBe(100);
  });

  it("timeFit(25, 20) === 0; timeFit(25, 22) === 60", () => {
    expect(timeFit(25, 20)).toBe(0);
    expect(timeFit(25, 22)).toBe(60);
  });

  it('recoveryFit("hard", 69) === 0; recoveryFit("hard", 70) === 70', () => {
    expect(recoveryFit("hard", 69)).toBe(0);
    expect(recoveryFit("hard", 70)).toBe(70);
  });
});
