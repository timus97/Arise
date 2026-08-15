import type { DailySummary } from "@arise/domain";
import { computeRecovery, type RecoveryParts } from "@arise/engine";
import type { Hono } from "hono";
import { requireSession } from "../middleware/auth.js";
import { prepare } from "../sql.js";
import {
  addCalendarDaysIso,
  ensureDogfood,
  requireLocalToday,
} from "../today-service.js";
import type { AppBindings, AppDeps } from "../types.js";
import { loadProfile, requireUserId } from "./onboarding.js";

type EffectRow = {
  id: string;
  kind: string;
  starts_at: string;
  ends_at: string;
  payload_json: string;
};

type SummaryRow = {
  local_date: string;
  steps: number | null;
  active_minutes: number | null;
  sleep_minutes: number | null;
  resting_hr: number | null;
  hrv: number | null;
  weight_kg: number | null;
  soreness: number | null;
  sleep_quality: number | null;
  hard_bouts: number;
  recovery_score: number | null;
};

export function registerMeRoutes(app: Hono<AppBindings>, deps: AppDeps): void {
  const gate = requireSession(deps.auth);

  app.get("/api/v1/me", gate, (c) => {
    return c.json({ userId: c.get("userId") });
  });

  app.get("/api/v1/me/debug", gate, (c) => {
    const userId = requireUserId(c.get("userId"));
    const now = new Date();
    const profile = loadProfile(deps.db, userId);
    const today = profile ? requireLocalToday(profile.time_zone, now) : now.toISOString().slice(0, 10);
    const from = addCalendarDaysIso(today, -13);

    const effects = (
      prepare(
        deps.db,
        `SELECT id, kind, starts_at, ends_at, payload_json
           FROM user_effects
          WHERE user_id = ? AND ends_at > ?
          ORDER BY starts_at ASC`,
      ).all(userId, now.toISOString()) as EffectRow[]
    ).map((row) => ({
      id: row.id,
      kind: row.kind,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      payload: parsePayload(row.payload_json),
    }));

    const summaries = (
      prepare(
        deps.db,
        `SELECT local_date, steps, active_minutes, sleep_minutes, resting_hr, hrv,
                weight_kg, soreness, sleep_quality, hard_bouts, recovery_score
           FROM daily_summaries
          WHERE user_id = ? AND local_date >= ? AND local_date <= ?
          ORDER BY local_date DESC`,
      ).all(userId, from, today) as SummaryRow[]
    ).map((row): DailySummary => ({
      userId,
      localDate: row.local_date,
      steps: row.steps,
      activeMinutes: row.active_minutes,
      sleepMinutes: row.sleep_minutes,
      restingHr: row.resting_hr,
      hrv: row.hrv,
      weightKg: row.weight_kg,
      soreness: row.soreness,
      sleepQuality: row.sleep_quality,
      hardBouts: row.hard_bouts,
      recoveryScore: row.recovery_score ?? 0,
    }));

    const recoveryParts: RecoveryParts = computeRecovery(summaries).parts;

    c.header("Cache-Control", "private, no-store");
    return c.json({
      lastEnsureMs: ensureDogfood.lastEnsureMs,
      lastQueryCount: ensureDogfood.lastQueryCount,
      lastD1Meta: ensureDogfood.lastD1Meta,
      effects,
      recoveryParts,
    });
  });
}

function parsePayload(raw: string): Record<string, number | string> {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, number | string>;
    }
  } catch {
    /* keep empty */
  }
  return {};
}
