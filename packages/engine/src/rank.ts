import type { QuestKind, QuestStatus, Rank } from "@arise/domain";

export const RANK_TITLES = {
  E: "Initiate",
  D: "Adept",
  C: "Operative",
  B: "Veteran",
  A: "Elite",
  S: "Sovereign",
} as const satisfies Record<Rank, string>;

export type RankTitle = (typeof RANK_TITLES)[Rank];

export function titleForRank(rank: Rank): RankTitle {
  return RANK_TITLES[rank];
}

export const RANK_GATES = {
  E: { minLevel: 1, maxLevel: 9 },
  D: { minLevel: 10, maxLevel: 19 },
  C: { minLevel: 20, maxLevel: 34 },
  B: { minLevel: 35, maxLevel: 49, minCompletionRate14: 0.5 },
  A: { minLevel: 50, maxLevel: 74, minCompletionRate30: 0.6 },
  S: { minLevel: 75, minCompletionRate30: 0.7, maxPenaltyPoints30d: 7 },
} as const;

const DONE: ReadonlySet<QuestStatus> = new Set([
  "completed",
  "partial",
  "auto_completed",
]);

export function isRequiredQuest(kind: QuestKind): boolean {
  return kind !== "penalty";
}

export function isCompletionStatus(status: QuestStatus): boolean {
  return DONE.has(status);
}

export interface RankDayQuest {
  kind: QuestKind;
  status: QuestStatus;
  skipReason?: string | null;
}

export interface RankDay {
  quests: RankDayQuest[];
}

/**
 * Completion rate = (days with all required quests completed|partial|auto)
 * / (days that had at least one required quest).
 * Days with only `rest_planned` skips are excluded from the denominator.
 */
export function completionRate(days: RankDay[]): number {
  let num = 0;
  let den = 0;
  for (const day of days) {
    const required = day.quests.filter((q) => isRequiredQuest(q.kind));
    if (required.length === 0) continue;
    const onlyRestPlanned = required.every(
      (q) => q.status === "skipped" && q.skipReason === "rest_planned",
    );
    if (onlyRestPlanned) continue;
    den += 1;
    if (required.every((q) => isCompletionStatus(q.status))) num += 1;
  }
  if (den === 0) return 0;
  return num / den;
}

export interface ComputeRankInput {
  level: number;
  completionRate14: number;
  completionRate30: number;
  penaltyPoints30d: number;
  previousRank?: Rank;
}

export interface RankComputation {
  rank: Rank;
  title: RankTitle;
  reason?: "destabilized";
}

/** Highest rank the current gates allow (no S-destabilized override). */
export function qualifyRank(input: {
  level: number;
  completionRate14: number;
  completionRate30: number;
  penaltyPoints30d: number;
}): Rank {
  const { level, completionRate14, completionRate30, penaltyPoints30d } = input;
  if (level >= 75 && completionRate30 >= 0.7 && penaltyPoints30d < 8) return "S";
  if (level >= 50 && completionRate30 >= 0.6) return "A";
  if (level >= 35 && completionRate14 >= 0.5) return "B";
  if (level >= 20) return "C";
  if (level >= 10) return "D";
  return "E";
}

/**
 * If rank was S and S-gates fail, write A and `reason=destabilized`
 * (API persists `rank_events` in PR 10).
 */
export function computeRank(input: ComputeRankInput): RankComputation {
  const qualified = qualifyRank(input);
  if (input.previousRank === "S" && qualified !== "S") {
    return { rank: "A", title: RANK_TITLES.A, reason: "destabilized" };
  }
  return { rank: qualified, title: RANK_TITLES[qualified] };
}

export interface DestabilizedRankEvent {
  previousRank: "S";
  rank: "A";
  title: (typeof RANK_TITLES)["A"];
  reason: "destabilized";
}

export function rankEventIfDestabilized(
  result: RankComputation,
): DestabilizedRankEvent | null {
  if (result.reason !== "destabilized") return null;
  return {
    previousRank: "S",
    rank: "A",
    title: RANK_TITLES.A,
    reason: "destabilized",
  };
}
