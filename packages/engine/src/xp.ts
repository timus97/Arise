import type { QuestKind } from "@arise/domain";

/** Closed-form XP to go from `level` to `level + 1`. */
export function xpToNextLevel(level: number): number {
  return Math.round(100 * Math.pow(level, 1.35));
}

/** Cumulative XP required to *reach* `level` (level 1 starts at 0). */
export function xpAtLevelStart(level: number): number {
  let n = 0;
  for (let l = 1; l < level; l++) n += xpToNextLevel(l);
  return n;
}

export function xpIntoLevel(xp: number, level: number): number {
  return xp - xpAtLevelStart(level);
}

/** Level loop breaks once `level > 200` (design §9.7). */
export function applyXp(currentXp: number, delta: number): { xp: number; level: number } {
  const xp = Math.max(0, currentXp + delta);
  let level = 1;
  let acc = 0;
  while (acc + xpToNextLevel(level) <= xp) {
    acc += xpToNextLevel(level);
    level += 1;
    if (level > 200) break;
  }
  return { xp, level };
}

export function scaleXp(baseXp: number, level: number): number {
  return Math.round(baseXp * Math.min(1.6, 1 + 0.02 * (level - 1)));
}

export const BASE_XP = {
  habit: 20,
  recovery: 20,
  mobility: 30,
  steps: 30,
  cardio: 45,
  strength: 55,
  gate: 90,
  penalty: 10,
} as const;

export type BaseXpKind = keyof typeof BASE_XP;

export function isBaseXpKind(kind: QuestKind | "gate"): kind is BaseXpKind {
  return kind in BASE_XP;
}

export function baseXpFor(kind: BaseXpKind): number {
  return BASE_XP[kind];
}

/** Penalty completion is a flat 10 XP and does not scale with level. */
export function rewardXp(kind: BaseXpKind, level: number): number {
  if (kind === "penalty") return BASE_XP.penalty;
  return scaleXp(BASE_XP[kind], level);
}
