import {
  GOAL_STAT_WEIGHTS,
  STAT_KEYS,
  type Equipment,
  type GoalType,
  type PatternTag,
  type QuestKind,
  type QuestTemplate,
} from "@arise/domain";
import { clamp } from "./recovery.js";
import { parqAllowsTemplate } from "./safety.js";
import { equipmentOk } from "./templates/types.js";

export const MAX_STAT_DELTA = 0.4;

function neat(n: number): number {
  return Math.round(n * 1e12) / 1e12;
}

export function goalAlignment(t: QuestTemplate, goalType: GoalType): number {
  const w = GOAL_STAT_WEIGHTS[goalType];
  let raw = 0;
  let max = 0;
  for (const k of STAT_KEYS) {
    raw += (t.statDelta[k] ?? 0) * w[k];
    max += MAX_STAT_DELTA * w[k];
  }
  let s = max <= 0 ? 0 : (100 * raw) / max;
  if (t.goalTags.includes(goalType)) s += 15;
  return clamp(neat(s), 0, 100);
}

export function weekBalance(
  t: QuestTemplate,
  last7Kinds: QuestKind[],
  last7Patterns: PatternTag[],
): number {
  const kindHits = last7Kinds.filter((k) => k === t.kind).length;
  const kindPenalty = (25 * kindHits) / 7;
  const patHits = t.patternTags.filter((p) => last7Patterns.includes(p)).length;
  const patDen = Math.max(1, t.patternTags.length);
  const patPenalty = (20 * patHits) / patDen;
  return clamp(100 - kindPenalty - patPenalty, 0, 100);
}

/** last14[0] = most recently used template id (yesterday-ward). */
export function freshness(t: QuestTemplate, last14TemplateIds: string[]): number {
  const idx = last14TemplateIds.indexOf(t.id);
  if (idx < 0) return 100;
  return clamp(30 + 5 * idx, 0, 100);
}

export function timeFit(baseMinutes: number, remaining: number): number {
  if (baseMinutes <= remaining) return 100;
  // Golden: timeFit(25, 20) === 0. A full +5 overrun is ineligible; slack is (0, 5).
  if (baseMinutes < remaining + 5) return 60;
  return 0;
}

export function recoveryFit(
  intensity: QuestTemplate["intensity"],
  recoveryScore: number,
): number {
  switch (intensity) {
    case "rest":
      return recoveryScore < 40 ? 100 : 40;
    case "easy":
      return clamp(80 + (55 - recoveryScore) * 0.4, 50, 100);
    case "moderate":
      return recoveryScore >= 55 ? recoveryScore : 0;
    case "hard":
      return recoveryScore >= 70 ? recoveryScore : 0;
  }
}

export interface ScoreTemplateArgs {
  t: QuestTemplate;
  goalType: GoalType;
  last7Kinds: QuestKind[];
  last7Patterns: PatternTag[];
  last14TemplateIds: string[];
  remainingMinutes: number;
  recoveryScore: number;
}

export interface ScoreBreakdown {
  score: number;
  goalAlignment: number;
  weekBalance: number;
  freshness: number;
  timeFit: number;
  recoveryFit: number;
}

export function scoreBreakdown(args: ScoreTemplateArgs): ScoreBreakdown {
  const ga = goalAlignment(args.t, args.goalType);
  const wb = weekBalance(args.t, args.last7Kinds, args.last7Patterns);
  const fr = freshness(args.t, args.last14TemplateIds);
  const tf = timeFit(args.t.baseMinutes, args.remainingMinutes);
  const rf = recoveryFit(args.t.intensity, args.recoveryScore);
  return {
    score: neat(0.4 * ga + 0.2 * wb + 0.15 * fr + 0.15 * tf + 0.1 * rf),
    goalAlignment: ga,
    weekBalance: wb,
    freshness: fr,
    timeFit: tf,
    recoveryFit: rf,
  };
}

export function scoreTemplate(args: ScoreTemplateArgs): number {
  return scoreBreakdown(args).score;
}

export interface EligibilityArgs {
  t: QuestTemplate;
  equipment: Equipment[];
  injuries: readonly string[];
  experience: number;
  remainingMinutes: number;
  recoveryScore: number;
  hardAllowed: boolean;
  parqClear: boolean;
  hardBlocked: boolean;
}

export function isTemplateEligible(args: EligibilityArgs): boolean {
  const { t } = args;
  if (!equipmentOk(t, args.equipment)) return false;
  if (t.contraindicationKeys.some((k) => args.injuries.includes(k))) return false;
  if (t.minExperience > args.experience) return false;
  if (timeFit(t.baseMinutes, args.remainingMinutes) === 0) return false;
  if (recoveryFit(t.intensity, args.recoveryScore) === 0) return false;
  if (t.intensity === "hard" && (!args.hardAllowed || args.hardBlocked)) return false;
  if (!parqAllowsTemplate(args.parqClear, t.kind, t.intensity)) return false;
  return true;
}
