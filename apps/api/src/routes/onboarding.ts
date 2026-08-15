import { atomic } from "@arise/db";
import type { NodeDb } from "@arise/db";
import {
  OnboardingBody,
  PlayerProfile,
  PlayerStats,
  Rank,
  Units,
  type Plan,
  type PlanDay,
} from "@arise/domain";
import {
  buildWeeklyPlan,
  evaluateImpliedLoss,
  evaluateParq,
  localDate,
  PREGNANCY_HARD_STOP,
  PREGNANCY_HARD_STOP_MESSAGE,
  UNSAFE_LOSS_RATE,
  xpIntoLevel,
  type ParqEvaluation,
} from "@arise/engine";
import type { Hono } from "hono";
import { requireSession } from "../middleware/auth.js";
import { ApiError } from "../middleware/error.js";
import { prepare, stmt } from "../sql.js";
import type { AppBindings, AppDeps } from "../types.js";
import { newUlid } from "../ulid.js";

export const MEDICAL_DISCLAIMER =
  "Arise is not a medical device. Stop if you feel pain, chest pressure, or faintness.";

export type ProfileRow = {
  user_id: string;
  age: number;
  sex: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  units: string;
  time_zone: string;
  level: number;
  xp: number;
  rank: string;
  title: string;
  stats_json: string;
  streak_days: number;
  best_streak_days: number;
  penalty_points_30d: number;
  parq_clear: number;
  accepted_disclaimer_at: string | null;
  onboarding_status: string;
  last_ensured_local_date: string | null;
  created_at: string;
  updated_at: string;
};

export type SessionUserId = string;

export function requireUserId(userId: string | undefined): SessionUserId {
  if (userId === undefined) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
  }
  return userId;
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "VALIDATION", "Invalid JSON body");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseOnboardingBody(body: unknown): OnboardingBody {
  if (isRecord(body) && isRecord(body.profile)) {
    const age = body.profile.age;
    if (typeof age === "number" && Number.isFinite(age) && age < 16) {
      throw new ApiError(400, "AGE_RESTRICTED", "You must be 16 or older");
    }
  }
  const parsed = OnboardingBody.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, "VALIDATION", "Invalid onboarding body", parsed.error.flatten());
  }
  return parsed.data;
}

export function assertSafeOnboarding(data: OnboardingBody, now: Date): void {
  const loss = evaluateImpliedLoss({
    type: data.goal.type,
    weightKg: data.profile.weightKg,
    targetWeightKg: data.goal.targetWeightKg,
    targetDate: data.goal.targetDate,
    now,
    timeZone: data.profile.timeZone,
  });
  if (loss.unsafe) {
    throw new ApiError(
      400,
      UNSAFE_LOSS_RATE,
      `Implied fat-loss rate exceeds 1% of body weight per week. Maximum allowed is ${loss.maxKgPerWeek} kg/week. Relax the target date or target weight.`,
      { maxKgPerWeek: loss.maxKgPerWeek },
    );
  }
}

export function pregnancyHardStop(status: 403 | 409): ApiError {
  return new ApiError(status, PREGNANCY_HARD_STOP, PREGNANCY_HARD_STOP_MESSAGE, undefined, {
    actions: ["deleteAccount"],
  });
}

export function onboardingRequired(): ApiError {
  return new ApiError(409, "ONBOARDING_REQUIRED", "Onboarding is required", undefined, {
    fields: { needsOnboarding: true },
  });
}

export function loadProfile(db: NodeDb, userId: string): ProfileRow | undefined {
  const row = prepare(
    db,
    `SELECT user_id, age, sex, height_cm, weight_kg, units, time_zone,
            level, xp, rank, title, stats_json, streak_days, best_streak_days,
            penalty_points_30d, parq_clear, accepted_disclaimer_at,
            onboarding_status, last_ensured_local_date, created_at, updated_at
       FROM profiles WHERE user_id = ?`,
  ).get(userId);
  return row as ProfileRow | undefined;
}

export function assertPlayableProfile(
  profile: ProfileRow | undefined,
): asserts profile is ProfileRow {
  if (profile === undefined) {
    throw onboardingRequired();
  }
  if (profile.onboarding_status === "blocked_pregnancy") {
    throw pregnancyHardStop(409);
  }
  if (profile.onboarding_status !== "complete") {
    throw onboardingRequired();
  }
}

export function toPublicProfile(row: ProfileRow): PlayerProfile & {
  onboardingStatus: string;
  parqClear: boolean;
  age: number;
} {
  const core = PlayerProfile.parse({
    userId: row.user_id,
    level: row.level,
    xp: row.xp,
    xpIntoLevel: xpIntoLevel(row.xp, row.level),
    rank: Rank.parse(row.rank),
    title: row.title,
    stats: PlayerStats.parse(JSON.parse(row.stats_json) as unknown),
    streakDays: row.streak_days,
    bestStreakDays: row.best_streak_days,
    penaltyPoints30d: row.penalty_points_30d,
    units: Units.parse(row.units),
    timeZone: row.time_zone,
  });
  return {
    ...core,
    onboardingStatus: row.onboarding_status,
    parqClear: row.parq_clear === 1,
    age: row.age,
  };
}

export function applyParqToDays(days: PlanDay[], easyOnly: boolean): PlanDay[] {
  if (!easyOnly) return days;
  return days.map((day) => ({ ...day, hardAllowed: false, isGate: false }));
}

export function buildOnboardingPlan(args: {
  data: OnboardingBody;
  userId: string;
  goalId: string;
  planId: string;
  startDate: string;
  version: number;
  easyOnly: boolean;
}): { plan: Plan; days: PlanDay[] } {
  const built = buildWeeklyPlan({
    planId: args.planId,
    userId: args.userId,
    goalId: args.goalId,
    goalType: args.data.goal.type,
    experience: args.data.habit.experience,
    week: args.data.habit.week,
    startDate: args.startDate,
    version: args.version,
    idFactory: () => newUlid(),
  });
  return { plan: built.plan, days: applyParqToDays(built.days, args.easyOnly) };
}

function weeklyMinutes(week: OnboardingBody["habit"]["week"]): number {
  return week.reduce((sum, day) => sum + day.minutes, 0);
}

function upsertProfileStmt(
  userId: string,
  data: OnboardingBody,
  parq: ParqEvaluation,
  nowIso: string,
  onboardingStatus: "complete" | "blocked_pregnancy",
) {
  return stmt(
    `INSERT INTO profiles (
        user_id, age, sex, height_cm, weight_kg, units, time_zone,
        parq_clear, accepted_disclaimer_at, onboarding_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        age = excluded.age,
        sex = excluded.sex,
        height_cm = excluded.height_cm,
        weight_kg = excluded.weight_kg,
        units = excluded.units,
        time_zone = excluded.time_zone,
        parq_clear = excluded.parq_clear,
        accepted_disclaimer_at = excluded.accepted_disclaimer_at,
        onboarding_status = excluded.onboarding_status,
        updated_at = excluded.updated_at`,
    [
      userId,
      data.profile.age,
      data.profile.sex ?? null,
      data.profile.heightCm,
      data.profile.weightKg,
      data.profile.units,
      data.profile.timeZone,
      parq.parqClear ? 1 : 0,
      nowIso,
      onboardingStatus,
      nowIso,
      nowIso,
    ],
  );
}

function insertPlanDaysStmt(userId: string, days: PlanDay[]) {
  const placeholders = days.map(() => "(?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
  const params: unknown[] = [];
  for (const day of days) {
    params.push(
      day.id,
      day.planId,
      userId,
      day.localDate,
      day.focus,
      day.budgetMinutes,
      day.hardAllowed ? 1 : 0,
      day.isGate ? 1 : 0,
    );
  }
  return stmt(
    `INSERT INTO plan_days (
        id, plan_id, user_id, local_date, focus, budget_minutes, hard_allowed, is_gate
      ) VALUES ${placeholders}`,
    params,
  );
}

export async function persistPregnancyShell(
  db: NodeDb,
  userId: string,
  data: OnboardingBody,
  now: Date,
): Promise<void> {
  const parq = evaluateParq(data.parq);
  await atomic(db, [upsertProfileStmt(userId, data, parq, now.toISOString(), "blocked_pregnancy")]);
}

export async function persistCompleteOnboarding(args: {
  db: NodeDb;
  userId: string;
  data: OnboardingBody;
  parq: ParqEvaluation;
  plan: Plan;
  days: PlanDay[];
  now: Date;
}): Promise<void> {
  const nowIso = args.now.toISOString();
  const existing = loadProfile(args.db, args.userId);
  const statements = [
    upsertProfileStmt(args.userId, args.data, args.parq, nowIso, "complete"),
  ];
  if (existing !== undefined) {
    statements.push(
      stmt(`UPDATE goals SET active = 0 WHERE user_id = ? AND active = 1`, [args.userId]),
      stmt(`UPDATE plans SET archived_at = ? WHERE user_id = ? AND archived_at IS NULL`, [
        nowIso,
        args.userId,
      ]),
    );
  }
  statements.push(
    stmt(
      `INSERT INTO goals (
          id, user_id, type, target_date, target_weight_kg,
          weekly_available_minutes, priority, active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?)`,
      [
        args.plan.goalId,
        args.userId,
        args.data.goal.type,
        args.data.goal.targetDate,
        args.data.goal.targetWeightKg,
        weeklyMinutes(args.data.habit.week),
        nowIso,
      ],
    ),
    stmt(
      `INSERT INTO habit_profiles (
          user_id, experience, equipment_json, injuries_json, injury_notes,
          job_activity, commute_walk_minutes, sleep_start, sleep_end,
          diet_preference, week_json, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          experience = excluded.experience,
          equipment_json = excluded.equipment_json,
          injuries_json = excluded.injuries_json,
          injury_notes = excluded.injury_notes,
          job_activity = excluded.job_activity,
          commute_walk_minutes = excluded.commute_walk_minutes,
          sleep_start = excluded.sleep_start,
          sleep_end = excluded.sleep_end,
          diet_preference = excluded.diet_preference,
          week_json = excluded.week_json,
          updated_at = excluded.updated_at`,
      [
        args.userId,
        args.data.habit.experience,
        JSON.stringify(args.data.habit.equipment),
        JSON.stringify(args.data.habit.injuries),
        args.data.habit.injuryNotes ?? null,
        args.data.habit.jobActivity,
        args.data.habit.commuteWalkMinutes,
        args.data.habit.sleepWindow.start,
        args.data.habit.sleepWindow.end,
        args.data.habit.dietPreference,
        JSON.stringify(args.data.habit.week),
        nowIso,
      ],
    ),
    stmt(
      `INSERT INTO plans (
          id, user_id, goal_id, version, start_date, end_date, rationale_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        args.plan.id,
        args.userId,
        args.plan.goalId,
        args.plan.version,
        args.plan.startDate,
        args.plan.endDate,
        JSON.stringify(args.plan.rationale),
        nowIso,
      ],
    ),
    insertPlanDaysStmt(args.userId, args.days),
  );
  await atomic(args.db, statements);
}

export function evaluateOnboardingRequest(
  body: unknown,
  now: Date,
): { data: OnboardingBody; parq: ParqEvaluation; startDate: string } {
  const data = parseOnboardingBody(body);
  const parq = evaluateParq(data.parq);
  if (!parq.blocked) {
    assertSafeOnboarding(data, now);
  }
  return { data, parq, startDate: localDate(now, data.profile.timeZone) };
}

export function registerOnboardingRoutes(
  app: Hono<AppBindings>,
  deps: AppDeps,
): void {
  app.put("/api/v1/onboarding", requireSession(deps.auth), async (c) => {
    const userId = requireUserId(c.get("userId"));
    const now = new Date();
    const { data, parq, startDate } = evaluateOnboardingRequest(await readJsonBody(c.req.raw), now);

    if (parq.blocked) {
      await persistPregnancyShell(deps.db, userId, data, now);
      throw pregnancyHardStop(403);
    }

    const built = buildOnboardingPlan({
      data,
      userId,
      goalId: newUlid(),
      planId: newUlid(),
      startDate,
      version: 1,
      easyOnly: parq.easyOnly,
    });
    await persistCompleteOnboarding({
      db: deps.db,
      userId,
      data,
      parq,
      plan: built.plan,
      days: built.days,
      now,
    });
    const profile = loadProfile(deps.db, userId);
    if (profile === undefined) {
      throw new ApiError(500, "INTERNAL", "Profile was not persisted");
    }
    return c.json({
      plan: built.plan,
      days: built.days,
      profile: toPublicProfile(profile),
    });
  });
}

export { insertPlanDaysStmt };
