import { describe, expect, it } from "vitest";
import type { DailyQuest, DailySummary } from "@arise/domain";
import { applyPlanModifiers, planModifiers } from "../modifiers.js";

function quest(over: {
  id: string;
  templateId: string;
  kind: DailyQuest["kind"];
  healthPredicate?: DailyQuest["healthPredicate"];
  modifiersApplied?: string[];
  autoCompletable?: boolean;
}): DailyQuest {
  const q: DailyQuest = {
    id: over.id,
    userId: "user_1",
    localDate: "2026-08-15",
    templateId: over.templateId,
    title: over.templateId,
    flavor: "",
    kind: over.kind,
    status: "issued",
    prescription: {
      blocks: over.healthPredicate ? [{ name: "Steps", steps: over.healthPredicate.value, rpeMax: 3 }] : [],
      estimatedMinutes: 0,
      intensity: "easy",
    },
    xpReward: 30,
    statDelta: {},
    autoCompletable: over.autoCompletable ?? false,
    modifiersApplied: over.modifiersApplied ?? [],
    source: "issuer",
    idempotencyKey: `user_1:2026-08-15:${over.templateId}`,
  };
  if (over.healthPredicate) q.healthPredicate = over.healthPredicate;
  return q;
}

function summary(over: Partial<DailySummary> = {}): DailySummary {
  return {
    userId: "user_1",
    localDate: "2026-08-15",
    steps: null,
    activeMinutes: null,
    sleepMinutes: null,
    restingHr: null,
    hrv: null,
    weightKg: null,
    soreness: null,
    sleepQuality: null,
    hardBouts: 0,
    recoveryScore: 80,
    ...over,
  };
}

const STEPS = quest({
  id: "q_steps",
  templateId: "steps_6k",
  kind: "steps",
  autoCompletable: true,
  healthPredicate: { metric: "steps", op: "gte", value: 6000 },
});

const SLEEP = quest({
  id: "q_sleep",
  templateId: "habit_sleep_window",
  kind: "habit",
  autoCompletable: true,
});

describe("planModifiers", () => {
  it("auto-completes steps at the predicate and sleep in 360–540", () => {
    const out = planModifiers(
      [STEPS, SLEEP],
      summary({ steps: 6000, sleepMinutes: 420 }),
    );
    expect(out).toEqual([
      { questId: "q_steps", key: "auto_steps", next: { status: "auto_completed" } },
      { questId: "q_sleep", key: "auto_sleep", next: { status: "auto_completed" } },
    ]);
  });

  it("writes steps_residual once with rpeMax 3 and does not shrink twice", () => {
    const first = planModifiers([STEPS], summary({ steps: 4000 }));
    expect(first).toHaveLength(1);
    expect(first[0]?.key).toBe("steps_residual");
    expect(first[0]?.next.healthPredicate).toEqual({ metric: "steps", op: "gte", value: 2000 });
    expect(first[0]?.next.prescription?.blocks).toEqual([
      { name: "Remaining steps", steps: 2000, rpeMax: 3 },
    ]);

    const applied = applyPlanModifiers([STEPS], first);
    expect(applied[0]?.modifiersApplied).toEqual(["steps_residual"]);
    expect(applied[0]?.healthPredicate?.value).toBe(2000);

    const second = planModifiers(applied, summary({ steps: 4000 }));
    expect(second.map((m) => m.key)).not.toContain("steps_residual");
    const again = applyPlanModifiers(applied, second.filter((m) => m.key === "steps_residual"));
    expect(again[0]?.healthPredicate?.value).toBe(2000);
    expect(again[0]?.modifiersApplied).toEqual(["steps_residual"]);
  });

  it("auto_sleep is idempotent", () => {
    const first = planModifiers([SLEEP], summary({ sleepMinutes: 360 }));
    expect(first).toEqual([{ questId: "q_sleep", key: "auto_sleep", next: { status: "auto_completed" } }]);
    const applied = applyPlanModifiers([SLEEP], first);
    expect(applied[0]?.status).toBe("auto_completed");
    expect(planModifiers(applied, summary({ sleepMinutes: 360 }))).toEqual([]);
  });

  it("low sleep (< 300) does not invent a new modifier key", () => {
    const out = planModifiers([SLEEP, STEPS], summary({ sleepMinutes: 299, steps: 100 }));
    expect(out.map((m) => m.key)).not.toContain("auto_sleep");
    expect(out.every((m) => m.key === "auto_steps" || m.key === "steps_residual" || m.key === "auto_sleep")).toBe(
      true,
    );
    expect(out).toEqual([]);
  });
});
