import { atomic } from "@arise/db";
import type { NodeDb } from "@arise/db";
import { catchUpMissedDays } from "@arise/engine";
import { QuestKind, QuestStatus, type QuestKind as QuestKindT, type QuestStatus as QuestStatusT } from "@arise/domain";
import { prepare, stmt } from "../sql.js";
import { addCalendarDaysIso, requireLocalToday } from "../today-service.js";
import { newUlid } from "../ulid.js";

export const EVALUATE_PENALTIES_BATCH = 25;

type Candidate = {
  user_id: string;
  time_zone: string;
  last_ensured_local_date: string;
};

type QuestRow = {
  local_date: string;
  status: string;
  kind: string;
};

/**
 * Backstop for lazy fail. Calls only `catchUpMissedDays` for users whose
 * `last_ensured_local_date` is before their local today. Does **not** issue today.
 */
export async function evaluatePenalties(
  db: NodeDb,
  now = new Date(),
  limit = EVALUATE_PENALTIES_BATCH,
): Promise<{ processed: number }> {
  const candidates = prepare(
    db,
    `SELECT p.user_id, p.time_zone, p.last_ensured_local_date
       FROM profiles p
      WHERE p.onboarding_status = 'complete'
        AND p.last_ensured_local_date IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM daily_quests q
           WHERE q.user_id = p.user_id AND q.status = 'issued'
        )
      ORDER BY p.last_ensured_local_date ASC
      LIMIT 200`,
  ).all() as Candidate[];

  let processed = 0;
  for (const row of candidates) {
    if (processed >= limit) break;
    let today: string;
    try {
      today = requireLocalToday(row.time_zone, now);
    } catch {
      continue;
    }
    if (row.last_ensured_local_date >= today) continue;

    const from = addCalendarDaysIso(today, -30);
    const existing = prepare(
      db,
      `SELECT local_date, status, kind
         FROM daily_quests
        WHERE user_id = ? AND local_date >= ? AND local_date < ?`,
    ).all(row.user_id, from, today) as QuestRow[];

    const catchUp = catchUpMissedDays({
      lastEnsuredLocalDate: row.last_ensured_local_date,
      today,
      existingQuests: existing.map((q) => ({
        localDate: q.local_date,
        status: (QuestStatus.safeParse(q.status).success ? q.status : "issued") as QuestStatusT,
        kind: (QuestKind.safeParse(q.kind).success ? q.kind : "habit") as QuestKindT,
      })),
      now,
      timeZone: row.time_zone,
    });

    const nowIso = now.toISOString();
    const failFrom = catchUp.failFrom ?? today;
    const update = prepare(
      db,
      `UPDATE daily_quests
          SET status = 'failed', updated_at = ?
        WHERE user_id = ? AND local_date >= ? AND local_date < ? AND status = 'issued'`,
    ).run(nowIso, row.user_id, failFrom, today);

    if (update.changes > 0) {
      const statements = [];
      for (const _date of catchUp.penaltyDates) {
        statements.push(
          stmt(
            `INSERT INTO xp_events (id, user_id, quest_id, delta, reason, created_at)
             VALUES (?, ?, NULL, 0, 'penalty_eval', ?)`,
            [newUlid(), row.user_id, nowIso],
          ),
        );
      }
      const since30 = new Date(now.getTime() - 30 * 86_400_000).toISOString();
      const countRow = prepare(
        db,
        `SELECT COUNT(*) AS n FROM xp_events
          WHERE user_id = ? AND reason = 'penalty_eval' AND created_at >= ?`,
      ).get(row.user_id, since30) as { n: number };
      statements.push(
        stmt(
          `UPDATE profiles
              SET streak_days = 0,
                  penalty_points_30d = ?,
                  updated_at = ?
            WHERE user_id = ?`,
          [countRow.n + catchUp.penaltyDates.length, nowIso, row.user_id],
        ),
      );
      if (catchUp.cautionVolume) {
        statements.push(
          stmt(
            `INSERT INTO user_effects (id, user_id, kind, starts_at, ends_at, payload_json, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              newUlid(),
              row.user_id,
              catchUp.cautionVolume.kind,
              catchUp.cautionVolume.startsAt,
              catchUp.cautionVolume.endsAt,
              JSON.stringify(catchUp.cautionVolume.payload),
              nowIso,
            ],
          ),
        );
      }
      if (statements.length > 0) {
        await atomic(db, statements);
      }
    }

    processed += 1;
  }

  return { processed };
}
