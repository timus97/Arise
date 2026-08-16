import { STAT_KEYS, STAT_LABELS, formatStatValue, type RankLetter, type StatKey } from "@arise/ui";
import {
  RANK_REASON_LABELS,
  RANK_TITLES,
  XP_REASON_LABELS,
} from "./copy.js";
import type { ProgressPayload, ProgressPlayer, ProgressRankEvent, ProgressXpEvent } from "./types.js";

export const PROGRESS_DAYS = 90;
export const RANK_ORDER: readonly RankLetter[] = ["E", "D", "C", "B", "A", "S"];

export function isRank(value: string): value is RankLetter {
  return (RANK_ORDER as readonly string[]).includes(value);
}

/** Events have no title; map E–S locally. Player.title wins when present. */
export function titleForRank(rank: string, fallback?: string): string {
  if (fallback && fallback.length > 0) return fallback;
  if (isRank(rank)) return RANK_TITLES[rank];
  return rank;
}

export function rankLadder(): Array<{ rank: RankLetter; title: string }> {
  return RANK_ORDER.map((rank) => ({ rank, title: RANK_TITLES[rank] }));
}

export type RankEventView = {
  id: string;
  line: string;
  reasonLabel: string;
  createdAt: string;
};

export function formatProgressDate(iso: string): string {
  return iso.length >= 10 ? iso.slice(0, 10) : iso;
}

export function presentRankEvent(event: ProgressRankEvent): RankEventView {
  const fromTitle = titleForRank(event.fromRank);
  const toTitle = titleForRank(event.toRank);
  const reasonLabel =
    event.reason in RANK_REASON_LABELS
      ? RANK_REASON_LABELS[event.reason as keyof typeof RANK_REASON_LABELS]
      : event.reason;
  return {
    id: event.id,
    line: `${event.fromRank} ${fromTitle} → ${event.toRank} ${toTitle}`,
    reasonLabel,
    createdAt: formatProgressDate(event.createdAt),
  };
}

export type XpEventView = {
  id: string;
  line: string;
  createdAt: string;
};

export function presentXpEvent(event: ProgressXpEvent): XpEventView {
  const sign = event.delta > 0 ? "+" : "";
  const reason =
    event.reason in XP_REASON_LABELS
      ? XP_REASON_LABELS[event.reason as keyof typeof XP_REASON_LABELS]
      : event.reason;
  return {
    id: event.id,
    line: `${sign}${event.delta} XP · ${reason}`,
    createdAt: formatProgressDate(event.createdAt),
  };
}

export type LabeledStat = {
  key: StatKey;
  label: string;
  value: string;
};

export function labeledStats(stats: ProgressPlayer["stats"]): LabeledStat[] {
  return STAT_KEYS.map((key) => ({
    key,
    label: STAT_LABELS[key],
    value: formatStatValue(stats[key]),
  }));
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

export function progressWindowLabel(
  payload: Pick<ProgressPayload, "from" | "to" | "days">,
): string {
  return `${payload.from} – ${payload.to} · ${payload.days} days`;
}
