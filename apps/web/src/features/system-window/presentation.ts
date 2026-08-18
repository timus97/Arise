import type { QuestCardVariant, RankLetter } from "@arise/ui";
import {
  FULL_REST_RX,
  HABIT_KIND_CHIP,
  NASAL_BREATH_RX,
  PENALTY_KIND_CHIP,
  PENALTY_PRESCRIPTION,
  PENALTY_TITLE,
  PENALTY_XP_LINE,
  RANK_TITLES,
  RECOVERY_KIND_CHIP,
  SLEEP_WINDOW_RX,
} from "./copy.js";
import type { Rank, TodayQuest } from "./types.js";

export const RANK_ORDER: readonly RankLetter[] = ["E", "D", "C", "B", "A", "S"];

export function isRank(value: string): value is Rank {
  return (RANK_ORDER as readonly string[]).includes(value);
}

export function titleForRank(rank: Rank, fallback?: string): string {
  if (fallback && fallback.length > 0) return fallback;
  return RANK_TITLES[rank];
}

export function isRankUp(previous: string, next: string): boolean {
  if (!isRank(previous) || !isRank(next)) return false;
  return RANK_ORDER.indexOf(next) > RANK_ORDER.indexOf(previous);
}

export function xpToNextLevel(level: number): number {
  return Math.round(100 * Math.pow(level, 1.35));
}

export function xpAtLevelStart(level: number): number {
  let total = 0;
  for (let current = 1; current < level; current += 1) {
    total += xpToNextLevel(current);
  }
  return total;
}

export function xpIntoLevel(xp: number, level: number): number {
  return Math.max(0, xp - xpAtLevelStart(level));
}

export type QuestPresentation = {
  variant: QuestCardVariant;
  kindChip: string;
  title: string;
  subtitle?: string;
  prescription: string;
  xpLine: string;
  done: boolean;
};

function kindLabel(kind: string): string {
  if (kind.length === 0) return "Quest";
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

function formatBlock(block: TodayQuest["prescription"]["blocks"][number]): string {
  const bits = [block.name];
  if (typeof block.sets === "number" && typeof block.reps === "number") {
    bits.push(`${block.sets}×${block.reps}`);
  } else if (typeof block.sets === "number") {
    bits.push(`${block.sets} sets`);
  } else if (typeof block.reps === "number") {
    bits.push(`${block.reps} reps`);
  }
  if (typeof block.steps === "number") {
    bits.push(`${block.steps.toLocaleString("en-US")} steps`);
  }
  if (typeof block.seconds === "number") bits.push(`${block.seconds}s`);
  if (typeof block.distanceM === "number") bits.push(`${block.distanceM} m`);
  return bits.join(" ");
}

function formatTrainingRx(quest: TodayQuest): string {
  const parts: string[] = [];
  if (quest.prescription.blocks.length > 0) {
    parts.push(quest.prescription.blocks.map(formatBlock).join(" · "));
  }
  if (quest.prescription.estimatedMinutes > 0) {
    parts.push(`${quest.prescription.estimatedMinutes} min`);
  }
  if (quest.prescription.intensity) parts.push(quest.prescription.intensity);
  const rpes = quest.prescription.blocks.map((block) => block.rpeMax);
  if (rpes.length > 0) {
    parts.push(`RPE ≤ ${Math.max(...rpes)}`);
  }
  if (quest.flavor) parts.push(quest.flavor);
  return parts.join(" · ");
}

export function presentQuest(quest: TodayQuest): QuestPresentation {
  const done = quest.status !== "issued";
  if (quest.kind === "penalty" || quest.source === "penalty" || quest.templateId === "penalty_easy_walk") {
    return {
      variant: "penalty",
      kindChip: PENALTY_KIND_CHIP,
      title: PENALTY_TITLE,
      prescription: PENALTY_PRESCRIPTION,
      xpLine: PENALTY_XP_LINE,
      done,
    };
  }
  if (quest.templateId === "habit_sleep_window") {
    return {
      variant: "habit",
      kindChip: HABIT_KIND_CHIP,
      title: quest.title,
      prescription: SLEEP_WINDOW_RX,
      xpLine: `${quest.xpReward} XP`,
      done,
    };
  }
  if (quest.templateId === "rec_nasal_breath") {
    return {
      variant: "habit",
      kindChip: RECOVERY_KIND_CHIP,
      title: quest.title,
      prescription: NASAL_BREATH_RX,
      xpLine: `${quest.xpReward} XP`,
      done,
    };
  }
  if (quest.templateId === "rec_full_rest") {
    return {
      variant: "habit",
      kindChip: RECOVERY_KIND_CHIP,
      title: quest.title,
      prescription: FULL_REST_RX,
      xpLine: `${quest.xpReward} XP`,
      done,
    };
  }
  if (quest.kind === "habit") {
    return {
      variant: "habit",
      kindChip: HABIT_KIND_CHIP,
      title: quest.title,
      prescription: quest.flavor || formatTrainingRx(quest),
      xpLine: `${quest.xpReward} XP`,
      done,
    };
  }
  if (quest.kind === "recovery") {
    return {
      variant: "habit",
      kindChip: RECOVERY_KIND_CHIP,
      title: quest.title,
      prescription: quest.flavor || formatTrainingRx(quest),
      xpLine: `${quest.xpReward} XP`,
      done,
    };
  }
  return {
    variant: "training",
    kindChip: kindLabel(quest.kind),
    title: quest.title,
    ...(quest.guide?.subtitle ? { subtitle: quest.guide.subtitle } : {}),
    prescription: formatTrainingRx(quest),
    xpLine: `${quest.xpReward} XP`,
    done,
  };
}

export function planDayLine(payload: {
  planDay: { focus: string; budgetMinutes: number; hardAllowed: boolean; isGate: boolean } | null;
  recoveryScore: number;
}): string | null {
  if (!payload.planDay) return null;
  const hard = payload.planDay.hardAllowed ? "hard allowed" : "hard off";
  const gate = payload.planDay.isGate ? " · gate" : "";
  return `${payload.planDay.focus} focus · ${payload.planDay.budgetMinutes} min budget · ${hard}${gate} · recovery ${Math.round(payload.recoveryScore)}`;
}
