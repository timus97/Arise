import { atomic } from "@arise/db";
import {
  applyStatTick,
  applyXp,
  computeRank,
  isoWeekStart,
  rankEventIfDestabilized,
  resolveSkip,
  xpToNextLevel,
} from "@arise/engine";
import { PlayerStats, Rank, type PlayerStats as PlayerStatsType } from "@arise/domain";
import type { Hono } from "hono";
import { z } from "zod";
import { requireSession } from "../middleware/auth.js";
import { ApiError } from "../middleware/error.js";
import { prepare, stmt } from "../sql.js";
import { addCalendarDaysIso, lastQueryBudget, resetQueryBudget } from "../today-service.js";
import type { AppBindings, AppDeps } from "../types.js";
import { newUlid } from "../ulid.js";
import { assertPlayableProfile, loadProfile, readJsonBody, requireUserId } from "./onboarding.js";

const CompleteBody = z.object({
  clientId: z.string().uuid(),
  effort: z.enum(["full", "partial"]),
  perceivedRpe: z.number().int().min(1).max(10).optional(),
  notes: z.string().max(2000).optional(),
});

const SkipBody = z.object({
  reason: z.enum(["rest_planned", "illness", "pain", "busy"]),
  notes: z.string().max(2000).optional(),
});

type MutationRow = {
  id: string;
  user_id: string;
  local_date: string;
  template_id: string;
  title: string;
  flavor: string;
  kind: string;
  status: string;
  prescription_json: string;
  xp_reward: number;
  stat_delta_json: string;
  skip_reason: string | null;
  level: number;
  xp: number;
  rank: string;
  profile_title: string;
  stats_json: string;
  streak_days: number;
  best_streak_days: number;
  penalty_points_30d: number;
  time_zone: string;
  midnight_stats_json: string | null;
  day_quests_json: string | null;
  rank_quests_json: string | null;
  busy_skips_week: number;
  illness_yesterday: number;
  penalty_eval_30d: number;
  existing_completion_id: string | null;
  existing_completion_quest_id: string | null;
};

function track(n = 1): void {
  lastQueryBudget.statements += n;
}

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (raw === null || raw === undefined || raw === "") return fallback;
  return JSON.parse(raw) as T;
}

function loadMutationRow(
  db: AppDeps["db"],
  questId: string,
  userId: string,
  clientId: string | null,
): MutationRow | undefined {
  const now = new Date();
  track();
  const profile = loadProfile(db, userId);
  assertPlayableProfile(profile);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: profile.time_zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const d30 = addCalendarDaysIso(today, -29);
  const mon = isoWeekStart(today);
  const yday = addCalendarDaysIso(today, -1);
  const since30 = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  track();
  const row = prepare(
    db,
    `SELECT q.id, q.user_id, q.local_date, q.template_id, q.title, q.flavor, q.kind, q.status,
            q.prescription_json, q.xp_reward, q.stat_delta_json, q.skip_reason,
            p.level, p.xp, p.rank, p.title AS profile_title, p.stats_json,
            p.streak_days, p.best_streak_days, p.penalty_points_30d, p.time_zone,
            (SELECT stats_json FROM stat_snapshots s
              WHERE s.user_id = p.user_id AND s.local_date = q.local_date) AS midnight_stats_json,
            (SELECT json_group_array(json_object(
                'id', id, 'kind', kind, 'status', status,
                'skipReason', skip_reason, 'localDate', local_date
              )) FROM daily_quests WHERE user_id = q.user_id AND local_date = q.local_date
            ) AS day_quests_json,
            (SELECT json_group_array(json_object(
                'localDate', local_date, 'kind', kind, 'status', status, 'skipReason', skip_reason
              )) FROM daily_quests
              WHERE user_id = q.user_id AND local_date >= ? AND local_date <= q.local_date
            ) AS rank_quests_json,
            (SELECT COUNT(*) FROM daily_quests
              WHERE user_id = q.user_id AND skip_reason = 'busy' AND status = 'skipped'
                AND local_date BETWEEN ? AND ?) AS busy_skips_week,
            (SELECT COUNT(*) FROM daily_quests
              WHERE user_id = q.user_id AND skip_reason = 'illness' AND status = 'skipped'
                AND local_date = ?) AS illness_yesterday,
            (SELECT COUNT(*) FROM xp_events
              WHERE user_id = q.user_id AND reason = 'penalty_eval' AND created_at >= ?) AS penalty_eval_30d,
            (SELECT id FROM quest_completions WHERE client_id = ? AND user_id = q.user_id) AS existing_completion_id,
            (SELECT quest_id FROM quest_completions WHERE client_id = ? AND user_id = q.user_id) AS existing_completion_quest_id
       FROM daily_quests q
       JOIN profiles p ON p.user_id = q.user_id
      WHERE q.id = ? AND q.user_id = ?`,
  ).get(d30, mon, today, yday, since30, clientId, clientId, questId, userId);
  return row as MutationRow | undefined;
}

function playerBody(args: {
  level: number;
  xp: number;
  rank: string;
  title: string;
  stats: PlayerStatsType;
  streakDays: number;
  penaltyPoints30d: number;
}) {
  return {
    level: args.level,
    xp: args.xp,
    xpToNext: xpToNextLevel(args.level),
    rank: args.rank,
    title: args.title,
    stats: args.stats,
    streakDays: args.streakDays,
    penaltyPoints30d: args.penaltyPoints30d,
  };
}

function questPublic(row: MutationRow, status: string, skipReason: string | null) {
  return {
    id: row.id,
    userId: row.user_id,
    localDate: row.local_date,
    templateId: row.template_id,
    title: row.title,
    flavor: row.flavor,
    kind: row.kind,
    status,
    skipReason,
    xpReward: row.xp_reward,
  };
}

function dayClosed(): ApiError {
  return new ApiError(409, "DAY_CLOSED", "This quest is no longer open");
}

function notFound(): ApiError {
  return new ApiError(404, "NOT_FOUND", "Quest not found");
}

type DayQuest = {
  id?: string;
  kind: string;
  status: string;
  skipReason?: string | null;
  localDate?: string;
};

function parseDayQuests(raw: string | null): DayQuest[] {
  if (!raw) return [];
  const parsed = JSON.parse(raw) as unknown;
  return Array.isArray(parsed) ? (parsed as DayQuest[]) : [];
}

function isDone(status: string): boolean {
  return status === "completed" || status === "partial" || status === "auto_completed";
}

function completionRate(
  days: Array<{ quests: Array<{ kind: string; status: string; skipReason?: string | null }> }>,
): number {
  let num = 0;
  let den = 0;
  for (const day of days) {
    const required = day.quests.filter((q) => q.kind !== "penalty");
    if (required.length === 0) continue;
    if (required.every((q) => q.status === "skipped" && q.skipReason === "rest_planned")) continue;
    den += 1;
    if (required.every((q) => isDone(q.status))) num += 1;
  }
  return den === 0 ? 0 : num / den;
}

function recomputeRank(args: {
  level: number;
  previousRank: string;
  penaltyPoints30d: number;
  date: string;
  rankQuestsJson: string | null;
  updated: Array<{ localDate: string; kind: string; status: string; skipReason?: string | null }>;
}): { rank: string; title: string; destab: boolean } {
  const raw = parseDayQuests(args.rankQuestsJson);
  const byDate = new Map<string, DayQuest[]>();
  for (const q of raw) {
    const d = q.localDate ?? args.date;
    const list = byDate.get(d) ?? [];
    list.push(q);
    byDate.set(d, list);
  }
  for (const u of args.updated) {
    const list = (byDate.get(u.localDate) ?? []).filter((q) => q.kind !== u.kind || q.status !== u.status);
    const existing = byDate.get(u.localDate) ?? [];
    const replaced = existing.map((q) =>
      u.kind === q.kind && (q as { id?: string }).id === undefined ? q : q,
    );
    // Replace matching id if present; otherwise append.
    void replaced;
    const next = existing.slice();
    const idx = next.findIndex((q) => q.id && args.updated.some((x) => x === u) && q.kind === u.kind);
    if (idx >= 0) next[idx] = { ...next[idx], ...u };
    else {
      const byKindStatus = next.findIndex((q) => q.kind === u.kind && q.status !== u.status);
      if (byKindStatus >= 0) next[byKindStatus] = { ...next[byKindStatus], ...u };
      else next.push(u);
    }
    byDate.set(u.localDate, next);
  }
  const d14 = addCalendarDaysIso(args.date, -13);
  const d30 = addCalendarDaysIso(args.date, -29);
  const days = [...byDate.entries()].map(([localDate, quests]) => ({ localDate, quests }));
  const prev = Rank.safeParse(args.previousRank);
  const result = computeRank({
    level: args.level,
    completionRate14: completionRate(days.filter((d) => d.localDate >= d14)),
    completionRate30: completionRate(days.filter((d) => d.localDate >= d30)),
    penaltyPoints30d: args.penaltyPoints30d,
    ...(prev.success ? { previousRank: prev.data } : {}),
  });
  return {
    rank: result.rank,
    title: result.title,
    destab: rankEventIfDestabilized(result) !== null,
  };
}

function snapshotStmt(
  userId: string,
  localDate: string,
  level: number,
  xp: number,
  rank: string,
  statsJson: string,
  nowIso: string,
) {
  return stmt(
    `INSERT OR IGNORE INTO stat_snapshots
        (id, user_id, local_date, level, xp, rank, stats_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [newUlid(), userId, localDate, level, xp, rank, statsJson, nowIso],
  );
}

function hardBoutsStmt(userId: string, localDate: string, nowIso: string) {
  return stmt(
    `INSERT INTO daily_summaries (user_id, local_date, hard_bouts, updated_at)
     VALUES (?, ?, 1, ?)
     ON CONFLICT(user_id, local_date) DO UPDATE SET
       hard_bouts = hard_bouts + 1,
       updated_at = excluded.updated_at`,
    [userId, localDate, nowIso],
  );
}

export function registerQuestRoutes(app: Hono<AppBindings>, deps: AppDeps): void {
  const gate = requireSession(deps.auth);

  app.post("/api/v1/quests/:id/complete", gate, async (c) => {
    resetQueryBudget();
    const userId = requireUserId(c.get("userId"));
    const questId = c.req.param("id");
    const parsed = CompleteBody.safeParse(await readJsonBody(c.req.raw));
    if (!parsed.success) {
      throw new ApiError(400, "VALIDATION", "Invalid complete body", parsed.error.flatten());
    }
    const row = loadMutationRow(deps.db, questId, userId, parsed.data.clientId);
    if (row === undefined) throw notFound();

    if (row.existing_completion_id) {
      if (row.existing_completion_quest_id !== row.id) {
        throw new ApiError(400, "VALIDATION", "clientId already used");
      }
      return c.json({
        quest: questPublic(row, row.status, row.skip_reason),
        player: playerBody({
          level: row.level,
          xp: row.xp,
          rank: row.rank,
          title: row.profile_title,
          stats: PlayerStats.parse(JSON.parse(row.stats_json) as unknown),
          streakDays: row.streak_days,
          penaltyPoints30d: row.penalty_points_30d,
        }),
      });
    }

    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: row.time_zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    if (row.local_date !== today || row.status !== "issued") {
      throw dayClosed();
    }

    const effort = parsed.data.effort;
    const status = effort === "partial" ? "partial" : "completed";
    const xpDelta =
      effort === "partial" ? Math.round(row.xp_reward * 0.5) : row.xp_reward;
    const currentStats = PlayerStats.parse(JSON.parse(row.stats_json) as unknown);
    const midnight = row.midnight_stats_json
      ? PlayerStats.parse(JSON.parse(row.midnight_stats_json) as unknown)
      : currentStats;
    const delta = JSON.parse(row.stat_delta_json) as Partial<PlayerStatsType>;
    const nextStats = applyStatTick({
      current: currentStats,
      midnight,
      delta,
      effort,
    });
    const progressed = applyXp(row.xp, xpDelta);
    const dayQuests = parseDayQuests(row.day_quests_json).map((q) =>
      q.id === row.id ? { ...q, status } : q,
    );
    const required = dayQuests.filter((q) => q.kind !== "penalty");
    const othersDone = required
      .filter((q) => q.id !== row.id)
      .every((q) => isDone(q.status));
    const allDone = required.length > 0 && othersDone;
    const streakDays = allDone ? row.streak_days + 1 : row.streak_days;
    const bestStreak = Math.max(row.best_streak_days, streakDays);
    const rank = recomputeRank({
      level: progressed.level,
      previousRank: row.rank,
      penaltyPoints30d: row.penalty_points_30d,
      date: row.local_date,
      rankQuestsJson: row.rank_quests_json,
      updated: [
        {
          localDate: row.local_date,
          kind: row.kind,
          status,
          skipReason: null,
        },
      ],
    });
    const prescription = JSON.parse(row.prescription_json) as { intensity?: string };
    const nowIso = new Date().toISOString();
    const statements = [
      stmt(
        `UPDATE daily_quests SET status = ?, skip_reason = NULL, updated_at = ? WHERE id = ? AND user_id = ?`,
        [status, nowIso, row.id, userId],
      ),
      stmt(
        `INSERT INTO quest_completions
            (id, quest_id, user_id, status, perceived_rpe, notes, client_id, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newUlid(),
          row.id,
          userId,
          status,
          parsed.data.perceivedRpe ?? null,
          parsed.data.notes ?? null,
          parsed.data.clientId,
          nowIso,
        ],
      ),
      stmt(
        `INSERT INTO xp_events (id, user_id, quest_id, delta, reason, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [newUlid(), userId, row.id, xpDelta, effort === "partial" ? "partial" : "complete", nowIso],
      ),
      snapshotStmt(userId, row.local_date, row.level, row.xp, row.rank, row.stats_json, nowIso),
      stmt(
        `UPDATE profiles
            SET xp = ?, level = ?, stats_json = ?, streak_days = ?, best_streak_days = ?,
                rank = ?, title = ?, updated_at = ?
          WHERE user_id = ?`,
        [
          progressed.xp,
          progressed.level,
          JSON.stringify(nextStats),
          streakDays,
          bestStreak,
          rank.rank,
          rank.title,
          nowIso,
          userId,
        ],
      ),
    ];
    if (prescription.intensity === "hard") {
      statements.push(hardBoutsStmt(userId, row.local_date, nowIso));
    }
    if (rank.destab) {
      statements.push(
        stmt(
          `INSERT INTO rank_events (id, user_id, from_rank, to_rank, reason, created_at)
           VALUES (?, ?, ?, 'A', 'destabilized', ?)`,
          [newUlid(), userId, row.rank, nowIso],
        ),
      );
    }
    lastQueryBudget.statements += statements.length;
    await atomic(deps.db, statements);
    return c.json({
      quest: questPublic(row, status, null),
      player: playerBody({
        level: progressed.level,
        xp: progressed.xp,
        rank: rank.rank,
        title: rank.title,
        stats: nextStats,
        streakDays,
        penaltyPoints30d: row.penalty_points_30d,
      }),
    });
  });

  app.post("/api/v1/quests/:id/skip", gate, async (c) => {
    resetQueryBudget();
    const userId = requireUserId(c.get("userId"));
    const questId = c.req.param("id");
    const parsed = SkipBody.safeParse(await readJsonBody(c.req.raw));
    if (!parsed.success) {
      throw new ApiError(400, "VALIDATION", "Invalid skip body", parsed.error.flatten());
    }
    const row = loadMutationRow(deps.db, questId, userId, null);
    if (row === undefined) throw notFound();
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: row.time_zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    if (row.local_date !== today || row.status !== "issued") {
      throw dayClosed();
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const resolved = resolveSkip({
      reason: parsed.data.reason,
      now,
      timeZone: row.time_zone,
      localDate: row.local_date,
      busySkipDatesThisIsoWeek: Array.from({ length: row.busy_skips_week }, () =>
        isoWeekStart(row.local_date),
      ),
      hadIllnessSkipYesterday: row.illness_yesterday > 0,
    });

    const failedBusy = resolved.status === "failed";
    const streakDays = failedBusy ? 0 : row.streak_days;
    const penaltyPoints30d = failedBusy ? row.penalty_eval_30d + 1 : row.penalty_eval_30d;
    const rank = recomputeRank({
      level: row.level,
      previousRank: row.rank,
      penaltyPoints30d,
      date: row.local_date,
      rankQuestsJson: row.rank_quests_json,
      updated: [
        {
          localDate: row.local_date,
          kind: row.kind,
          status: resolved.status,
          skipReason: resolved.skipReason,
        },
      ],
    });

    const statements = [
      stmt(
        `UPDATE daily_quests SET status = ?, skip_reason = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
        [resolved.status, resolved.skipReason, nowIso, row.id, userId],
      ),
      stmt(
        `UPDATE profiles
            SET streak_days = ?, penalty_points_30d = ?, rank = ?, title = ?, updated_at = ?
          WHERE user_id = ?`,
        [streakDays, penaltyPoints30d, rank.rank, rank.title, nowIso, userId],
      ),
    ];
    if (failedBusy) {
      statements.push(
        stmt(
          `INSERT INTO xp_events (id, user_id, quest_id, delta, reason, created_at)
           VALUES (?, ?, ?, 0, 'penalty_eval', ?)`,
          [newUlid(), userId, row.id, nowIso],
        ),
      );
    }
    if (resolved.effect) {
      statements.push(
        stmt(
          `INSERT INTO user_effects (id, user_id, kind, starts_at, ends_at, payload_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            newUlid(),
            userId,
            resolved.effect.kind,
            resolved.effect.startsAt,
            resolved.effect.endsAt,
            JSON.stringify(resolved.effect.payload),
            nowIso,
          ],
        ),
      );
    }
    if (rank.destab) {
      statements.push(
        stmt(
          `INSERT INTO rank_events (id, user_id, from_rank, to_rank, reason, created_at)
           VALUES (?, ?, ?, 'A', 'destabilized', ?)`,
          [newUlid(), userId, row.rank, nowIso],
        ),
      );
    }
    lastQueryBudget.statements += statements.length;
    await atomic(deps.db, statements);
    return c.json({
      quest: questPublic(row, resolved.status, resolved.skipReason),
      player: playerBody({
        level: row.level,
        xp: row.xp,
        rank: rank.rank,
        title: rank.title,
        stats: PlayerStats.parse(JSON.parse(row.stats_json) as unknown),
        streakDays,
        penaltyPoints30d,
      }),
    });
  });
}

