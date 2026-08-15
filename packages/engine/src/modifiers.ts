import type { DailyQuest, DailySummary } from "@arise/domain";

export interface PlannedModifier {
  questId: string;
  key: string;
  next: Partial<DailyQuest>;
}

export function planModifiers(
  quests: DailyQuest[],
  summary: DailySummary | null,
): PlannedModifier[] {
  const out: PlannedModifier[] = [];
  for (const q of quests) {
    const applied = new Set(q.modifiersApplied);
    if (!summary) continue;

    if (q.kind === "steps" && summary.steps != null && q.healthPredicate) {
      if (summary.steps >= q.healthPredicate.value && !applied.has("auto_steps")) {
        out.push({ questId: q.id, key: "auto_steps", next: { status: "auto_completed" } });
      } else if (
        summary.steps >= 0.6 * q.healthPredicate.value &&
        summary.steps < q.healthPredicate.value &&
        !applied.has("steps_residual")
      ) {
        const residual = q.healthPredicate.value - summary.steps;
        out.push({
          questId: q.id,
          key: "steps_residual",
          next: {
            healthPredicate: { ...q.healthPredicate, value: residual },
            prescription: {
              ...q.prescription,
              blocks: [{ name: "Remaining steps", steps: residual, rpeMax: 3 }],
            },
          },
        });
      }
    }

    if (
      q.templateId === "habit_sleep_window" &&
      summary.sleepMinutes != null &&
      summary.sleepMinutes >= 360 &&
      summary.sleepMinutes <= 540 &&
      !applied.has("auto_sleep")
    ) {
      out.push({ questId: q.id, key: "auto_sleep", next: { status: "auto_completed" } });
    }
  }
  return out;
}

/** Apply planned modifiers once; keys are appended so a second plan is a no-op. */
export function applyPlanModifiers(quests: DailyQuest[], updates: PlannedModifier[]): DailyQuest[] {
  if (updates.length === 0) return quests;
  return quests.map((q) => {
    const forQuest = updates.filter((u) => u.questId === q.id);
    if (forQuest.length === 0) return q;
    let next: DailyQuest = q;
    for (const u of forQuest) {
      if (next.modifiersApplied.includes(u.key)) continue;
      next = {
        ...next,
        ...u.next,
        prescription: u.next.prescription ?? next.prescription,
        modifiersApplied: [...next.modifiersApplied, u.key],
      };
    }
    return next;
  });
}
