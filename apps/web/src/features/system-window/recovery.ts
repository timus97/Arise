import {
  AUTO_SLEEP_TOAST,
  AUTO_STEPS_TOAST,
  P4_AUTO_STEPS,
  P4_CAUTION,
  P4_RECOVERY_GATE,
  P4_SLEEP,
  P4_STEPS_RESIDUAL,
  REST_DAY_BANNER,
} from "./copy.js";
import type { PendingModifier, TodayPayload, TodayQuest } from "./types.js";

const POTENTIALLY_HARD = new Set(["full_body", "mixed", "push", "pull", "legs"]);
/** recoveryParts.sleep max is 40 (engine). Below 80% counts as down. */
const SLEEP_DOWN = 32;

function modifierKeys(payload: TodayPayload): Set<string> {
  const keys = new Set<string>();
  for (const item of payload.pendingModifiers) keys.add(item.key);
  for (const quest of payload.quests) {
    for (const key of quest.modifiersApplied) keys.add(key);
  }
  return keys;
}

function residualFromModifier(item: PendingModifier): number | null {
  const fromPredicate = item.next.healthPredicate?.value;
  if (typeof fromPredicate === "number") return fromPredicate;
  const block = item.next.prescription?.blocks.find((entry) => typeof entry.steps === "number");
  return typeof block?.steps === "number" ? block.steps : null;
}

function residualFromQuest(quest: TodayQuest): number | null {
  if (typeof quest.healthPredicate?.value === "number") return quest.healthPredicate.value;
  const block = quest.prescription.blocks.find((entry) => typeof entry.steps === "number");
  return typeof block?.steps === "number" ? block.steps : null;
}

export function remainingSteps(payload: TodayPayload): number | null {
  for (const item of payload.pendingModifiers) {
    if (item.key !== "steps_residual") continue;
    const value = residualFromModifier(item);
    if (value !== null) return value;
  }
  for (const quest of payload.quests) {
    if (!quest.modifiersApplied.includes("steps_residual")) continue;
    const value = residualFromQuest(quest);
    if (value !== null) return value;
  }
  return null;
}

export function formatRemainingSteps(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

export function isRestDay(payload: TodayPayload): boolean {
  return payload.planDay?.focus === "rest";
}

export function recoveryRewriteBanner(payload: TodayPayload): string | null {
  const keys = modifierKeys(payload);
  if (keys.has("caution_volume")) return P4_CAUTION;
  if (isRestDay(payload)) return null;

  const sleepDown = payload.recoveryParts.sleep < SLEEP_DOWN;
  const focus = payload.planDay?.focus ?? "";
  const hardOff = payload.planDay !== null && payload.planDay.hardAllowed === false;
  const couldBeHard = POTENTIALLY_HARD.has(focus);

  if (sleepDown && (payload.recoveryScore < 55 || (hardOff && couldBeHard))) {
    return P4_SLEEP;
  }
  if (hardOff && couldBeHard && !sleepDown) {
    return P4_RECOVERY_GATE;
  }
  if (keys.has("steps_residual")) {
    const left = remainingSteps(payload);
    return P4_STEPS_RESIDUAL.replace(
      "{remainingSteps}",
      formatRemainingSteps(left ?? 0),
    );
  }
  if (keys.has("auto_steps")) return P4_AUTO_STEPS;
  return null;
}

export function restDayBanner(payload: TodayPayload): string | null {
  return isRestDay(payload) ? REST_DAY_BANNER : null;
}

export function autoCompleteToasts(payload: TodayPayload): string[] {
  const keys = modifierKeys(payload);
  for (const quest of payload.quests) {
    if (quest.status !== "auto_completed") continue;
    if (quest.kind === "steps" || quest.templateId.startsWith("steps_")) {
      keys.add("auto_steps");
    }
    if (quest.templateId === "habit_sleep_window" || quest.kind === "habit") {
      keys.add("auto_sleep");
    }
  }
  const messages: string[] = [];
  if (keys.has("auto_steps")) messages.push(AUTO_STEPS_TOAST);
  if (keys.has("auto_sleep")) messages.push(AUTO_SLEEP_TOAST);
  return messages;
}
