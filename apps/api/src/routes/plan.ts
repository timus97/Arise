import { atomic } from "@arise/db";
import type { NodeDb } from "@arise/db";
import { DayFocus, GoalType, type Plan, type PlanDay } from "@arise/domain";
import { buildWeeklyPlan, localDate } from "@arise/engine";
import type { Hono } from "hono";
import { z } from "zod";
import { requireSession } from "../middleware/auth.js";
import { ApiError } from "../middleware/error.js";
import { prepare, stmt } from "../sql.js";
import type { AppBindings, AppDeps } from "../types.js";
import { newUlid } from "../ulid.js";
import {
  applyParqToDays,
  assertPlayableProfile,
  evaluateOnboardingRequest,
  insertPlanDaysStmt,
  loadProfile,
  pregnancyHardStop,
  readJsonBody,
  requireUserId,
} from "./onboarding.js";

const RegenerateBody = z.object({
  reason: z.literal("schedule_change"),
});

const HabitWeek = z.array(
  z.object({
    weekday: z.number().int().min(1).max(7),
    minutes: z.number().int().min(0).max(180),
  }),
);

type PlanRow = {
  id: string;
  user_id: string;
  goal_id: string;
  version: number;
  start_date: string;
  end_date: string;
  rationale_json: string;
};

type PlanDayRow = {
  id: string;
  plan_id: string;
  local_date: string;
  focus: string;
  budget_minutes: number;
  hard_allowed: number;
  is_gate: number;
};

type HabitRow = {
  experience: number;
  week_json: string;
};

type GoalRow = {
  id: string;
  type: string;
};

type QuestStatusRow = {
  status: string;
};

export function loadActivePlan(db: NodeDb, userId: string): PlanRow | undefined {
  const row = prepare(
    db,
    `SELECT id, user_id, goal_id, version, start_date, end_date, rationale_json
       FROM plans
      WHERE user_id = ? AND archived_at IS NULL
      ORDER BY version DESC
      LIMIT 1`,
  ).get(userId);
  return row as PlanRow | undefined;
}

function loadPlanDays(db: NodeDb, planId: string): PlanDayRow[] {
  return prepare(
    db,
    `SELECT id, plan_id, local_date, focus, budget_minutes, hard_allowed, is_gate
       FROM plan_days
      WHERE plan_id = ?
      ORDER BY local_date ASC`,
  ).all(planId) as PlanDayRow[];
}

function toPlan(row: PlanRow): Plan {
  return {
    id: row.id,
    userId: row.user_id,
    goalId: row.goal_id,
    version: row.version,
    startDate: row.start_date,
    endDate: row.end_date,
    rationale: z.array(z.string()).parse(JSON.parse(row.rationale_json) as unknown),
  };
}

function toPlanDays(rows: PlanDayRow[]): PlanDay[] {
  return rows.map((row) => ({
    id: row.id,
    planId: row.plan_id,
    localDate: row.local_date,
    focus: DayFocus.parse(row.focus),
    budgetMinutes: row.budget_minutes,
    hardAllowed: row.hard_allowed === 1,
    isGate: row.is_gate === 1,
  }));
}

function loadHabit(db: NodeDb, userId: string): HabitRow | undefined {
  const row = prepare(
    db,
    `SELECT experience, week_json FROM habit_profiles WHERE user_id = ?`,
  ).get(userId);
  return row as HabitRow | undefined;
}

function loadActiveGoal(db: NodeDb, userId: string): GoalRow | undefined {
  const row = prepare(
    db,
    `SELECT id, type FROM goals WHERE user_id = ? AND active = 1
      ORDER BY priority ASC, created_at DESC LIMIT 1`,
  ).get(userId);
  return row as GoalRow | undefined;
}

function todayQuestStatuses(db: NodeDb, userId: string, localDay: string): string[] {
  return (
    prepare(db, `SELECT status FROM daily_quests WHERE user_id = ? AND local_date = ?`).all(
      userId,
      localDay,
    ) as QuestStatusRow[]
  ).map((row) => row.status);
}

export function registerPlanRoutes(app: Hono<AppBindings>, deps: AppDeps): void {
  app.post("/api/v1/plan/preview", requireSession(deps.auth), async (c) => {
    const userId = requireUserId(c.get("userId"));
    const now = new Date();
    const { data, parq, startDate } = evaluateOnboardingRequest(await readJsonBody(c.req.raw), now);
    if (parq.blocked) {
      throw pregnancyHardStop(403);
    }
    const built = buildWeeklyPlan({
      planId: newUlid(),
      userId,
      goalId: newUlid(),
      goalType: data.goal.type,
      experience: data.habit.experience,
      week: data.habit.week,
      startDate,
      version: 1,
      idFactory: () => newUlid(),
    });
    return c.json({
      plan: built.plan,
      days: applyParqToDays(built.days, parq.easyOnly),
    });
  });

  app.get("/api/v1/plan", requireSession(deps.auth), (c) => {
    const userId = requireUserId(c.get("userId"));
    const profile = loadProfile(deps.db, userId);
    assertPlayableProfile(profile);
    const planRow = loadActivePlan(deps.db, userId);
    if (planRow === undefined) {
      throw new ApiError(404, "NOT_FOUND", "No active plan");
    }
    return c.json({
      plan: toPlan(planRow),
      days: toPlanDays(loadPlanDays(deps.db, planRow.id)),
    });
  });

  app.post("/api/v1/plan/regenerate", requireSession(deps.auth), async (c) => {
    const userId = requireUserId(c.get("userId"));
    const parsed = RegenerateBody.safeParse(await readJsonBody(c.req.raw));
    if (!parsed.success) {
      throw new ApiError(400, "VALIDATION", "Invalid regenerate body", parsed.error.flatten());
    }

    const profile = loadProfile(deps.db, userId);
    assertPlayableProfile(profile);
    const planRow = loadActivePlan(deps.db, userId);
    const habit = loadHabit(deps.db, userId);
    const goal = loadActiveGoal(deps.db, userId);
    if (planRow === undefined || habit === undefined || goal === undefined) {
      throw new ApiError(404, "NOT_FOUND", "No active plan");
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const startDate = localDate(now, profile.time_zone);
    const week = HabitWeek.parse(JSON.parse(habit.week_json) as unknown);
    const nextVersion = planRow.version + 1;
    const planId = newUlid();
    const built = buildWeeklyPlan({
      planId,
      userId,
      goalId: goal.id,
      goalType: GoalType.parse(goal.type),
      experience: habit.experience,
      week,
      startDate,
      version: nextVersion,
      idFactory: () => newUlid(),
    });
    const days = applyParqToDays(built.days, profile.parq_clear !== 1);

    const statements = [
      stmt(`UPDATE plans SET archived_at = ? WHERE id = ? AND user_id = ?`, [
        nowIso,
        planRow.id,
        userId,
      ]),
      stmt(
        `INSERT INTO plans (
            id, user_id, goal_id, version, start_date, end_date, rationale_json, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          built.plan.id,
          userId,
          built.plan.goalId,
          built.plan.version,
          built.plan.startDate,
          built.plan.endDate,
          JSON.stringify(built.plan.rationale),
          nowIso,
        ],
      ),
      insertPlanDaysStmt(userId, days),
    ];

    const statuses = todayQuestStatuses(deps.db, userId, startDate);
    if (statuses.length > 0 && statuses.every((status) => status === "issued")) {
      statements.push(
        stmt(`DELETE FROM daily_quests WHERE user_id = ? AND local_date = ?`, [userId, startDate]),
        stmt(`DELETE FROM issuance_ledger WHERE user_id = ? AND local_date = ?`, [userId, startDate]),
      );
    }

    await atomic(deps.db, statements);
    return c.json({ plan: built.plan, days });
  });
}
