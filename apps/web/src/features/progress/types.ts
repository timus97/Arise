import type { PlayerStats, Rank } from "@arise/domain";

export type ProgressPlayer = {
  level: number;
  xp: number;
  rank: Rank;
  title: string;
  stats: PlayerStats;
  streakDays: number;
};

export type ProgressSnapshot = {
  localDate: string;
  level: number;
  xp: number;
  rank: Rank;
  stats: PlayerStats;
};

/** Rank events have no title; map E–S locally. */
export type ProgressRankEvent = {
  id: string;
  fromRank: string;
  toRank: string;
  reason: string;
  createdAt: string;
};

export type ProgressXpEvent = {
  id: string;
  questId: string | null;
  delta: number;
  reason: string;
  createdAt: string;
};

export type ProgressPayload = {
  from: string;
  to: string;
  days: number;
  player: ProgressPlayer;
  snapshots: ProgressSnapshot[];
  rankEvents: ProgressRankEvent[];
  xpEvents: ProgressXpEvent[];
};
