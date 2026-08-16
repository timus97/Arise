import { describe, expect, it } from "vitest";
import { STAT_KEYS, STAT_LABELS } from "@arise/ui";
import * as copy from "./copy.js";
import {
  AUTO_SLEEP_TOAST,
  AUTO_STEPS_TOAST,
  DAY_CLOSED_TOAST,
  EMPTY_CTA,
  EMPTY_LEDE,
  EMPTY_TITLE,
  P4_CAUTION,
  P4_SLEEP,
  PENALTY_KIND_CHIP,
  PENALTY_PRESCRIPTION,
  PENALTY_TITLE,
  PUSH_FORBIDDEN,
  RANK_TITLES,
  RANK_TOOLTIP,
  REGEN_BUTTON,
  SKIP_BUSY_THIRD,
  SKIP_CONSEQUENCES,
  SKIP_LEDE,
  SYSTEM_DISCLAIMER,
} from "./copy.js";
import { presentQuest } from "./presentation.js";
import { recoveryRewriteBanner } from "./recovery.js";
import { skipConsequence, skipSheetModel } from "./skip.js";
import type { TodayPayload, TodayQuest } from "./types.js";

function quest(over: Partial<TodayQuest> = {}): TodayQuest {
  return {
    id: "q1",
    userId: "u1",
    localDate: "2026-08-16",
    templateId: "str_goblet_squat_l1",
    title: "Goblet squat",
    flavor: "Sit and stand with a pack.",
    kind: "strength",
    status: "issued",
    prescription: {
      blocks: [{ name: "Goblet squat", sets: 3, reps: 8, rpeMax: 7 }],
      estimatedMinutes: 12,
      intensity: "moderate",
    },
    xpReward: 55,
    statDelta: { str: 0.35 },
    autoCompletable: false,
    modifiersApplied: [],
    source: "issuer",
    ...over,
  };
}

function today(over: Partial<TodayPayload> = {}): TodayPayload {
  return {
    date: "2026-08-16",
    needsEnsure: false,
    player: {
      level: 7,
      xp: 980,
      xpToNext: 1120,
      rank: "E",
      title: "Initiate",
      stats: { str: 12, agi: 11, vit: 13, intl: 10.6, sta: 14 },
      streakDays: 4,
      penaltyPoints30d: 1,
    },
    recoveryScore: 72,
    recoveryParts: { sleep: 40, restHr: 15, hrv: 15, load: 20, subjective: 10 },
    planDay: { focus: "mixed", budgetMinutes: 40, hardAllowed: true, isGate: false },
    quests: [quest()],
    pendingModifiers: [],
    suggestRegenerate: false,
    disclaimer: SYSTEM_DISCLAIMER,
    ...over,
  };
}

describe("needsEnsure empty CTA", () => {
  it("uses P5 empty-state copy", () => {
    expect(EMPTY_TITLE).toBe("No work issued");
    expect(EMPTY_LEDE).toBe(
      "Today is open. Issue the day’s quests from your current plan and recovery.",
    );
    expect(EMPTY_CTA).toBe("Issue today’s quests");
    expect(today({ needsEnsure: true, quests: [] }).needsEnsure).toBe(true);
  });
});

describe("skip consequence copy before confirm", () => {
  it("puts the P1 consequence on the sheet model before confirm", () => {
    const empty = skipSheetModel(null, null);
    expect(empty.lede).toBe(SKIP_LEDE);
    expect(empty.consequence).toBeNull();
    expect(empty.confirmEnabled).toBe(false);

    for (const reason of ["rest_planned", "illness", "pain", "busy"] as const) {
      const model = skipSheetModel(reason, null);
      expect(model.consequence).toBe(SKIP_CONSEQUENCES[reason]);
      expect(model.confirmEnabled).toBe(true);
      expect(model.confirm).toBe("Confirm skip");
    }

    expect(skipConsequence("busy", null)).toContain("third busy skip");
    expect(skipConsequence("busy", 1)).toBe(SKIP_CONSEQUENCES.busy);
    expect(skipConsequence("busy", 2)).toBe(SKIP_BUSY_THIRD);
    expect(skipSheetModel("busy", 2).consequence).toBe(SKIP_BUSY_THIRD);
  });
});

describe("intl not int in rendered labels", () => {
  it("labels stats str agi vit intl sta and never int", () => {
    expect(STAT_KEYS).toEqual(["str", "agi", "vit", "intl", "sta"]);
    expect(STAT_LABELS.intl).toBe("INTL");
    expect(STAT_LABELS).not.toHaveProperty("int");
    expect(Object.values(STAT_LABELS).join(" ")).toMatch(/INTL/);
    expect(Object.values(STAT_LABELS).join(" ")).not.toMatch(/\bINT\b/);
    expect(JSON.stringify(STAT_LABELS)).not.toContain('"int"');
    expect(today().player.stats).toHaveProperty("intl");
    expect(today().player.stats).not.toHaveProperty("int");
  });

  it("maps ranks to Initiate through Sovereign", () => {
    expect(RANK_TITLES).toEqual({
      E: "Initiate",
      D: "Adept",
      C: "Operative",
      B: "Veteran",
      A: "Elite",
      S: "Sovereign",
    });
    expect(RANK_TOOLTIP).toContain("14-day");
    expect(RANK_TOOLTIP).toContain("penaltyPoints30d under 8");
  });
});

describe("no push strings", () => {
  it("keeps SYSTEM copy free of push, badges, and remind-you language", () => {
    const { PUSH_FORBIDDEN: _banned, ...shipped } = copy;
    void _banned;
    const blob = JSON.stringify(shipped).toLowerCase();
    for (const banned of PUSH_FORBIDDEN) {
      expect(blob).not.toContain(banned);
    }
    expect(blob).not.toContain("solo leveling");
    expect(blob).not.toContain("calorie");
    expect(DAY_CLOSED_TOAST).toBe("The day closed.");
    expect(REGEN_BUTTON).toBe("Rewrite this week");
    expect(AUTO_STEPS_TOAST).toContain("logged steps");
    expect(AUTO_SLEEP_TOAST).toContain("logged sleep");
  });
});

describe("quest presentation", () => {
  it("uses P6 penalty honesty and P10 rest/habit issued-work chips", () => {
    const penalty = presentQuest(
      quest({
        kind: "penalty",
        source: "penalty",
        templateId: "penalty_easy_walk",
        title: "Easy Walk",
      }),
    );
    expect(penalty.variant).toBe("penalty");
    expect(penalty.kindChip).toBe(PENALTY_KIND_CHIP);
    expect(penalty.title).toBe(PENALTY_TITLE);
    expect(penalty.prescription).toBe(PENALTY_PRESCRIPTION);
    expect(penalty.prescription).toMatch(/RPE ≤ 4/);
    expect(penalty.prescription).toMatch(/20 minutes/);

    const sleep = presentQuest(quest({ kind: "habit", templateId: "habit_sleep_window" }));
    expect(sleep.kindChip).toBe("Habit · issued work");
    expect(sleep.prescription).toContain("issued SYSTEM work");
  });
});

describe("recovery rewrite banner", () => {
  it("follows P4 precedence and ignores effects", () => {
    expect(
      recoveryRewriteBanner(
        today({
          pendingModifiers: [{ questId: "q1", key: "caution_volume", next: {} }],
          recoveryParts: { sleep: 20, restHr: 15, hrv: 15, load: 20, subjective: 10 },
        }),
      ),
    ).toBe(P4_CAUTION);

    expect(
      recoveryRewriteBanner(
        today({
          recoveryScore: 48,
          recoveryParts: { sleep: 20, restHr: 15, hrv: 15, load: 20, subjective: 10 },
          planDay: { focus: "mixed", budgetMinutes: 40, hardAllowed: false, isGate: false },
        }),
      ),
    ).toBe(P4_SLEEP);

    expect(
      recoveryRewriteBanner(
        today({
          planDay: { focus: "rest", budgetMinutes: 0, hardAllowed: false, isGate: false },
        }),
      ),
    ).toBeNull();
  });
});
