import type {
  DailyQuest,
  Equipment,
  GoalType,
  PatternTag,
  PlanDay,
  QuestKind,
  QuestTemplate,
  UserEffect,
} from "@arise/domain";
import {
  CATALOG,
  EMPTY_DAY_FALLBACK_IDS,
  requireTemplate,
} from "./templates/catalog.js";
import { isTemplateEligible, scoreTemplate } from "./scorer.js";
import {
  allowsHardDay,
  forceRestFromEffects,
  hardBlockedByEffects,
  volumeMulFromEffects,
} from "./safety.js";
import { scaleXp } from "./xp.js";

const MIN_REMAINING_AFTER_PRIMARY = 8;
const FALLBACK_WALK_MINUTES = 10;
const PENALTY_BUDGET_MINUTES = 15;

const LOCOMOTION_KINDS: QuestKind[] = ["steps", "cardio"];
const VITALITY_KINDS: QuestKind[] = ["mobility"];
const HABIT_KINDS: QuestKind[] = ["habit", "recovery"];
const GATE_KINDS: QuestKind[] = ["strength", "cardio"];
const REST_LOAD_IDS = ["rec_full_rest", "cardio_zone2_walk"] as const;

export interface IssueTodayInput {
  userId: string;
  localDate: string;
  level: number;
  planDay: PlanDay;
  goalType: GoalType;
  experience: number;
  equipment: Equipment[];
  injuries: readonly string[];
  parqClear: boolean;
  recoveryScore: number;
  last7Kinds: QuestKind[];
  last7Patterns: PatternTag[];
  last14TemplateIds: string[];
  effects: Array<Pick<UserEffect, "kind" | "startsAt" | "endsAt" | "payload">>;
  now: Date;
  timeZone: string;
  penaltyOwed?: boolean;
  hardDaysInRolling7?: number;
  templates?: readonly QuestTemplate[];
  idFactory?: () => string;
}

export interface IssueTodayResult {
  quests: DailyQuest[];
}

function isRestComposition(input: IssueTodayInput): boolean {
  return (
    input.planDay.focus === "rest" ||
    input.recoveryScore < 35 ||
    forceRestFromEffects(input.effects, input.now) ||
    !input.parqClear
  );
}

export function issueToday(input: IssueTodayInput): IssueTodayResult {
  const catalog = input.templates ?? CATALOG;
  const volumeMul = volumeMulFromEffects(input.effects, input.now);
  const hardBlocked = hardBlockedByEffects(input.effects, input.now);
  const illnessRest = forceRestFromEffects(input.effects, input.now);
  const hardAllowed =
    input.planDay.hardAllowed &&
    allowsHardDay({
      experience: input.experience,
      hardDaysInRolling7: input.hardDaysInRolling7 ?? 0,
    });
  const restDay = isRestComposition(input);

  const used = new Set<string>();
  const quests: DailyQuest[] = [];
  let remaining = input.planDay.budgetMinutes;
  let seq = 0;
  const nextId = (): string => (input.idFactory ? input.idFactory() : `${input.userId}:${input.localDate}:${++seq}`);

  const eligible = (t: QuestTemplate, remainingMinutes: number): boolean =>
    isTemplateEligible({
      t,
      equipment: input.equipment,
      injuries: input.injuries,
      experience: input.experience,
      remainingMinutes,
      recoveryScore: input.recoveryScore,
      hardAllowed,
      parqClear: input.parqClear,
      hardBlocked,
    });

  const scoreOf = (t: QuestTemplate, remainingMinutes: number): number =>
    scoreTemplate({
      t,
      goalType: input.goalType,
      last7Kinds: input.last7Kinds,
      last7Patterns: input.last7Patterns,
      last14TemplateIds: input.last14TemplateIds,
      remainingMinutes,
      recoveryScore: input.recoveryScore,
    });

  const pickBest = (
    candidates: readonly QuestTemplate[],
    remainingMinutes: number,
  ): QuestTemplate | null => {
    let best: QuestTemplate | null = null;
    let bestScore = -Infinity;
    for (const t of candidates) {
      if (used.has(t.id)) continue;
      if (!eligible(t, remainingMinutes)) continue;
      const s = scoreOf(t, remainingMinutes);
      if (s > bestScore || (s === bestScore && best !== null && t.id < best.id)) {
        best = t;
        bestScore = s;
      }
    }
    return best;
  };

  const emit = (t: QuestTemplate, budgetMinutes: number, source: DailyQuest["source"]): DailyQuest => {
    used.add(t.id);
    const prescription = t.build({
      experience: input.experience,
      recoveryScore: input.recoveryScore,
      budgetMinutes,
      volumeMul,
    });
    remaining = Math.max(0, remaining - prescription.estimatedMinutes);
    const quest: DailyQuest = {
      id: nextId(),
      userId: input.userId,
      localDate: input.localDate,
      templateId: t.id,
      title: t.title,
      flavor: t.flavor,
      kind: t.kind,
      status: "issued",
      prescription,
      xpReward: t.kind === "penalty" ? t.baseXp : scaleXp(t.baseXp, input.level),
      statDelta: { ...t.statDelta },
      autoCompletable: t.autoCompletable,
      modifiersApplied: [],
      source,
      idempotencyKey: `${input.userId}:${input.localDate}:${t.id}`,
    };
    if (t.healthPredicate) quest.healthPredicate = t.healthPredicate;
    quests.push(quest);
    return quest;
  };

  const emitIfPicked = (t: QuestTemplate | null): void => {
    if (!t) return;
    emit(t, remaining, "issuer");
  };

  if (restDay) {
    const loadPool = REST_LOAD_IDS.map((id) => catalog.find((t) => t.id === id)).filter(
      (t): t is QuestTemplate => t !== undefined,
    );
    emitIfPicked(pickBest(loadPool, remaining));
    emitIfPicked(pickBest(catalog.filter((t) => VITALITY_KINDS.includes(t.kind)), remaining));
    const sleep = catalog.find((t) => t.id === "habit_sleep_window");
    if (sleep && eligible(sleep, remaining)) emit(sleep, remaining, "issuer");
  } else {
    let afterPrimary = remaining;
    if (hardAllowed && !illnessRest) {
      emitIfPicked(pickBest(catalog.filter((t) => t.kind === "strength"), remaining));
      afterPrimary = remaining;
    }
    const dropRest = afterPrimary < MIN_REMAINING_AFTER_PRIMARY && afterPrimary !== input.planDay.budgetMinutes;
    if (!dropRest) {
      emitIfPicked(pickBest(catalog.filter((t) => LOCOMOTION_KINDS.includes(t.kind)), remaining));
      emitIfPicked(pickBest(catalog.filter((t) => VITALITY_KINDS.includes(t.kind)), remaining));
      emitIfPicked(pickBest(catalog.filter((t) => HABIT_KINDS.includes(t.kind)), remaining));
      if (input.planDay.isGate && input.recoveryScore >= 60 && remaining >= 20) {
        const gatePool = catalog.filter(
          (t) => GATE_KINDS.includes(t.kind) && (t.kind === "strength" || t.id === "cardio_zone2_walk"),
        );
        emitIfPicked(pickBest(gatePool, remaining));
      }
    }
  }

  if (quests.length === 0) {
    for (const id of EMPTY_DAY_FALLBACK_IDS) {
      const t = catalog.find((c) => c.id === id) ?? requireTemplate(id);
      const budget = id === "cardio_zone2_walk" ? FALLBACK_WALK_MINUTES : 0;
      emit(t, budget, "issuer");
    }
  }

  if (input.penaltyOwed === true && !restDay && !illnessRest) {
    const penalty = catalog.find((t) => t.id === "penalty_easy_walk") ?? requireTemplate("penalty_easy_walk");
    if (!used.has(penalty.id)) {
      emit(penalty, Math.min(PENALTY_BUDGET_MINUTES, 20), "penalty");
    }
  }

  return { quests };
}
