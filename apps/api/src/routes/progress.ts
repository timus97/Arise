import { PlayerStats } from "@arise/domain";
import type { Hono } from "hono";
import { requireSession } from "../middleware/auth.js";
import { prepare } from "../sql.js";
import { addCalendarDaysIso, requireLocalToday } from "../today-service.js";
import type { AppBindings, AppDeps } from "../types.js";
import { assertPlayableProfile, loadProfile, requireUserId } from "./onboarding.js";

const PROGRESS_DAYS = 90;

type SnapshotRow = {
  local_date: string;
  level: number;
  xp: number;
  rank: string;
  stats_json: string;
};

type RankEventRow = {
  id: string;
  from_rank: string;
  to_rank: string;
  reason: string;
  created_at: string;
};

type XpEventRow = {
  id: string;
  quest_id: string | null;
  delta: number;
  reason: string;
  created_at: string;
};

export function registerProgressRoutes(app: Hono<AppBindings>, deps: AppDeps): void {
  const gate = requireSession(deps.auth);

  app.get("/api/v1/progress", gate, (c) => {
    const userId = requireUserId(c.get("userId"));
    const profile = loadProfile(deps.db, userId);
    assertPlayableProfile(profile);
    const now = new Date();
    const to = requireLocalToday(profile.time_zone, now);
    const from = addCalendarDaysIso(to, -(PROGRESS_DAYS - 1));
    const sinceIso = new Date(now.getTime() - PROGRESS_DAYS * 86_400_000).toISOString();

    const snapshots = (
      prepare(
        deps.db,
        `SELECT local_date, level, xp, rank, stats_json
           FROM stat_snapshots
          WHERE user_id = ? AND local_date >= ? AND local_date <= ?
          ORDER BY local_date ASC`,
      ).all(userId, from, to) as SnapshotRow[]
    ).map((row) => ({
      localDate: row.local_date,
      level: row.level,
      xp: row.xp,
      rank: row.rank,
      stats: PlayerStats.parse(JSON.parse(row.stats_json) as unknown),
    }));

    const rankEvents = (
      prepare(
        deps.db,
        `SELECT id, from_rank, to_rank, reason, created_at
           FROM rank_events
          WHERE user_id = ? AND created_at >= ?
          ORDER BY created_at ASC`,
      ).all(userId, sinceIso) as RankEventRow[]
    ).map((row) => ({
      id: row.id,
      fromRank: row.from_rank,
      toRank: row.to_rank,
      reason: row.reason,
      createdAt: row.created_at,
    }));

    const xpEvents = (
      prepare(
        deps.db,
        `SELECT id, quest_id, delta, reason, created_at
           FROM xp_events
          WHERE user_id = ? AND created_at >= ?
          ORDER BY created_at ASC`,
      ).all(userId, sinceIso) as XpEventRow[]
    ).map((row) => ({
      id: row.id,
      questId: row.quest_id,
      delta: row.delta,
      reason: row.reason,
      createdAt: row.created_at,
    }));

    c.header("Cache-Control", "private, no-store");
    return c.json({
      from,
      to,
      days: PROGRESS_DAYS,
      player: {
        level: profile.level,
        xp: profile.xp,
        rank: profile.rank,
        title: profile.title,
        stats: PlayerStats.parse(JSON.parse(profile.stats_json) as unknown),
        streakDays: profile.streak_days,
      },
      snapshots,
      rankEvents,
      xpEvents,
    });
  });
}
