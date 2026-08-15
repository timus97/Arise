import { atomic } from "@arise/db";
import type { NodeDb, SqlStatement } from "@arise/db";
import {
  CATALOG,
  buildWeeklyPlan,
  catchUpMissedDays,
  computeRank,
  computeRecovery,
  countHardDays,
  isoWeekStart,
  issueToday,
  planModifiers,
  rankEventIfDestabilized,
  shouldSuggestRegenerate,
  xpToNextLevel,
  type CatchUpResult,
  type PlannedModifier,
  type RecoveryParts,
} from "@arise/engine";
import {
  DailyQuest,
  DayFocus,
  Equipment,
  GoalType,
  PlayerStats,
  QuestKind,
  QuestStatus,
  Rank,
  type DailySummary,
  type Intensity,
  type PatternTag,
  type PlanDay,
  type PlayerStats as PlayerStatsType,
  type QuestStatus as QuestStatusType,
} from "@arise/domain";
import { ApiError } from "./middleware/error.js";
import { MEDICAL_DISCLAIMER, assertPlayableProfile, type ProfileRow } from "./routes/onboarding.js";
import { prepare, stmt } from "./sql.js";
import { newUlid } from "./ulid.js";

export type QueryBudget = { statements: number };

export let lastQueryBudget: QueryBudget = { statements: 0 };

export function resetQueryBudget(): QueryBudget {
  lastQueryBudget = { statements: 0 };
  return lastQueryBudget;
}

function track(budget: QueryBudget | undefined, n = 1): void {
  if (budget) budget.statements += n;
}

const LOCAL_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DISCLAIMER = MEDICAL_DISCLAIMER;

export type TodayPlayer = {
  level: number;
  xp: number;
  xpToNext: number;
  rank: string;
  title: string;
  stats: PlayerStatsType;
  streakDays: number;
  penaltyPoints30d: number;
};

export type TodayQuest = DailyQuest & { skipReason: string | null };

export type TodayPayload = {
  date: string;
  needsEnsure: boolean;
  player: TodayPlayer;
  recoveryScore: number;
  recoveryParts: RecoveryParts;
  planDay: {
    focus: string;
    budgetMinutes: number;
    hardAllowed: boolean;
    isGate: boolean;
  } | null;
  quests: TodayQuest[];
  pendingModifiers: PlannedModifier[];
  suggestRegenerate: boolean;
  disclaimer: string;
};

export type HabitBundle = {
  experience: number;
  equipment: string[];
  injuries: string[];
  week: Array<{ weekday: number; minutes: number }>;
};

export type RecentQuest = {
  id?: string;
  localDate: string;
  templateId?: string;
  kind: string;
  status: string;
  skipReason: string | null;
  intensity: string | null;
};

export type TodayBundle = {
  habit: HabitBundle | null;
  goal: { id: string; type: string } | null;
  plan: { id: string; version: number } | null;
  planDay: {
    id: string;
    planId: string;
    localDate: string;
    focus: string;
    budgetMinutes: number;
    hardAllowed: number | boolean;
    isGate: number | boolean;
  } | null;
  ledger: { localDate: string; planId: string } | null;
  quests: TodayQuest[];
  summaries14: DailySummary[];
  recentQuests: RecentQuest[];
  effects: Array<{
    id: string;
    kind: "pain_no_hard" | "illness_rest" | "caution_volume";
    startsAt: string;
    endsAt: string;
    payload: Record<string, number | string>;
  }>;
  busySkipsWeek: number;
  penaltyEval30d: number;
};

/**
 * Date-scoped System-window read. One `json_object` statement (§10).
 * Profile is loaded separately so default `date` / future-400 can use the user IANA tz
 * (SQLite has no IANA conversion). GET remains 0 writes.
 */
const TODAY_BUNDLE_SQL = `
SELECT json_object(
  'habit', COALESCE((SELECT json(json_object(
      'experience', experience,
      'equipment', json(equipment_json),
      'injuries', json(injuries_json),
      'week', json(week_json)
    )) FROM habit_profiles WHERE user_id = :u), json('null')),
  'goal', COALESCE((SELECT json(json_object(
      'id', g.id,
      'type', g.type
    )) FROM goals g WHERE g.user_id = :u AND g.active = 1
      ORDER BY g.priority ASC, g.created_at DESC LIMIT 1), json('null')),
  'plan', COALESCE((SELECT json(json_object(
      'id', id,
      'version', version
    )) FROM plans WHERE user_id = :u AND archived_at IS NULL
      ORDER BY version DESC LIMIT 1), json('null')),
  'planDay', COALESCE((SELECT json(json_object(
      'id', id,
      'planId', plan_id,
      'localDate', local_date,
      'focus', focus,
      'budgetMinutes', budget_minutes,
      'hardAllowed', hard_allowed,
      'isGate', is_gate
    )) FROM plan_days WHERE user_id = :u AND local_date = :d LIMIT 1), json('null')),
  'ledger', COALESCE((SELECT json(json_object(
      'localDate', local_date,
      'planId', plan_id
    )) FROM issuance_ledger WHERE user_id = :u AND local_date = :d), json('null')),
  'quests', COALESCE((SELECT json(json_group_array(json_object(
      'id', id,
      'userId', user_id,
      'localDate', local_date,
      'templateId', template_id,
      'title', title,
      'flavor', flavor,
      'kind', kind,
      'status', status,
      'prescription', json(prescription_json),
      'xpReward', xp_reward,
      'statDelta', json(stat_delta_json),
      'autoCompletable', auto_completable,
      'healthPredicate', json(health_predicate_json),
      'modifiersApplied', json(COALESCE(modifiers_applied_json, '[]')),
      'source', source,
      'idempotencyKey', idempotency_key,
      'skipReason', skip_reason
    ))) FROM daily_quests WHERE user_id = :u AND local_date = :d
      ORDER BY created_at ASC, id ASC), json('[]')),
  'summaries14', COALESCE((SELECT json(json_group_array(json_object(
      'localDate', local_date,
      'steps', steps,
      'activeMinutes', active_minutes,
      'sleepMinutes', sleep_minutes,
      'restingHr', resting_hr,
      'hrv', hrv,
      'weightKg', weight_kg,
      'soreness', soreness,
      'sleepQuality', sleep_quality,
      'hardBouts', hard_bouts,
      'recoveryScore', recovery_score
    ))) FROM daily_summaries
      WHERE user_id = :u AND local_date BETWEEN :d13 AND :d
      ORDER BY local_date DESC), json('[]')),
  'recentQuests', COALESCE((SELECT json(json_group_array(json_object(
      'id', id,
      'localDate', local_date,
      'templateId', template_id,
      'kind', kind,
      'status', status,
      'skipReason', skip_reason,
      'intensity', json_extract(prescription_json, '$.intensity')
    ))) FROM daily_quests
      WHERE user_id = :u AND local_date BETWEEN :d30 AND :d
      ORDER BY local_date DESC, created_at ASC), json('[]')),
  'effects', COALESCE((SELECT json(json_group_array(json_object(
      'id', id,
      'kind', kind,
      'startsAt', starts_at,
      'endsAt', ends_at,
      'payload', json(payload_json)
    ))) FROM user_effects
      WHERE user_id = :u AND ends_at > :now), json('[]')),
  'busySkipsWeek', COALESCE((SELECT COUNT(*) FROM daily_quests
      WHERE user_id = :u AND local_date BETWEEN :mon AND :d
        AND status = 'skipped' AND skip_reason = 'busy'), 0),
  'penaltyEval30d', COALESCE((SELECT COUNT(*) FROM xp_events
      WHERE user_id = :u AND reason = 'penalty_eval' AND created_at >= :since30), 0)
) AS bundle
`;

export function addCalendarDaysIso(isoDate: string, days: number): string {
  const year = Number(isoDate.slice(0, 4));
  const month = Number(isoDate.slice(5, 7));
  const day = Number(isoDate.slice(8, 10));
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  const y = utc.getUTCFullYear();
  const m = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const d = String(utc.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseLocalDateParam(value: string | undefined, field: string): string | undefined {
  if (value === undefined || value === "") return undefined;
  if (!LOCAL_DATE_RE.test(value)) {
    throw new ApiError(400, "VALIDATION", `Invalid ${field}; expected YYYY-MM-DD`);
  }
  return value;
}

function asJson<T>(value: unknown): T {
  if (typeof value === "string") return JSON.parse(value) as T;
  return value as T;
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  }
  return [];
}

function asObject<T extends object>(value: unknown): T | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    if (value === "" || value === "null") return null;
    const parsed: unknown = JSON.parse(value);
    return asObject<T>(parsed);
  }
  if (typeof value === "object") return value as T;
  return null;
}

function truthyFlag(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

function toTodayQuest(raw: Record<string, unknown>): TodayQuest {
  const auto = raw.autoCompletable;
  const parsed = DailyQuest.parse({
    id: raw.id,
    userId: raw.userId,
    localDate: raw.localDate,
    templateId: raw.templateId,
    title: raw.title,
    flavor: raw.flavor,
    kind: raw.kind,
    status: raw.status,
    prescription: raw.prescription,
    xpReward: raw.xpReward,
    statDelta: raw.statDelta,
    autoCompletable: auto === true || auto === 1,
    ...(raw.healthPredicate ? { healthPredicate: raw.healthPredicate } : {}),
    modifiersApplied: Array.isArray(raw.modifiersApplied) ? raw.modifiersApplied : [],
    source: raw.source,
    idempotencyKey: raw.idempotencyKey,
  });
  const skip = raw.skipReason;
  return {
    ...parsed,
    skipReason: typeof skip === "string" ? skip : null,
  };
}

function toSummaries(userId: string, rows: unknown): DailySummary[] {
  const list = Array.isArray(rows) ? rows : [];
  const out: DailySummary[] = [];
  for (const row of list) {
    if (typeof row !== "object" || row === null) continue;
    const r = row as Record<string, unknown>;
    const localDate = String(r.localDate ?? "");
    if (!LOCAL_DATE_RE.test(localDate)) continue;
    out.push({
      userId,
      localDate,
      steps: typeof r.steps === "number" ? r.steps : null,
      activeMinutes: typeof r.activeMinutes === "number" ? r.activeMinutes : null,
      sleepMinutes: typeof r.sleepMinutes === "number" ? r.sleepMinutes : null,
      restingHr: typeof r.restingHr === "number" ? r.restingHr : null,
      hrv: typeof r.hrv === "number" ? r.hrv : null,
      weightKg: typeof r.weightKg === "number" ? r.weightKg : null,
      soreness: typeof r.soreness === "number" ? r.soreness : null,
      sleepQuality: typeof r.sleepQuality === "number" ? r.sleepQuality : null,
      hardBouts: typeof r.hardBouts === "number" ? r.hardBouts : 0,
      recoveryScore: typeof r.recoveryScore === "number" ? r.recoveryScore : 0,
    });
  }
  out.sort((a, b) => (a.localDate < b.localDate ? 1 : a.localDate > b.localDate ? -1 : 0));
  return out;
}

function toRecent(rows: unknown): RecentQuest[] {
  const list = Array.isArray(rows) ? rows : [];
  const out: RecentQuest[] = [];
  for (const row of list) {
    if (typeof row !== "object" || row === null) continue;
    const r = row as Record<string, unknown>;
    const rec: RecentQuest = {
      localDate: String(r.localDate ?? ""),
      kind: String(r.kind ?? ""),
      status: String(r.status ?? ""),
      skipReason: typeof r.skipReason === "string" ? r.skipReason : null,
      intensity: typeof r.intensity === "string" ? r.intensity : null,
    };
    if (typeof r.id === "string") rec.id = r.id;
    if (typeof r.templateId === "string") rec.templateId = r.templateId;
    out.push(rec);
  }
  return out;
}

export function loadTodayBundle(
  db: NodeDb,
  args: {
    userId: string;
    date: string;
    now: Date;
    lastEnsuredLocalDate: string | null;
    budget?: QueryBudget;
  },
): TodayBundle {
  const d13 = addCalendarDaysIso(args.date, -13);
  const d30 = addCalendarDaysIso(args.date, -29);
  const mon = isoWeekStart(args.date);
  const since30 = new Date(args.now.getTime() - 30 * 86_400_000).toISOString();
  track(args.budget);
  const row = prepare(db, TODAY_BUNDLE_SQL).get({
    u: args.userId,
    d: args.date,
    d13,
    d30,
    mon,
    now: args.now.toISOString(),
    since30,
  } as unknown as Record<string, unknown>);
  if (row === undefined) {
    throw new ApiError(500, "INTERNAL", "Today bundle read failed");
  }
  const raw = asJson<Record<string, unknown>>(row.bundle);
  const questsRaw = asArray(raw.quests);
  const effectsRaw = asArray(raw.effects);
  return {
    habit: asObject<HabitBundle>(raw.habit),
    goal: asObject<NonNullable<TodayBundle["goal"]>>(raw.goal),
    plan: asObject<NonNullable<TodayBundle["plan"]>>(raw.plan),
    planDay: asObject<NonNullable<TodayBundle["planDay"]>>(raw.planDay),
    ledger: asObject<NonNullable<TodayBundle["ledger"]>>(raw.ledger),
    quests: questsRaw
      .filter((q): q is Record<string, unknown> => typeof q === "object" && q !== null)
      .map((q) => toTodayQuest(q)),
    summaries14: toSummaries(args.userId, asArray(raw.summaries14)),
    recentQuests: toRecent(asArray(raw.recentQuests)),
    effects: effectsRaw
      .filter((e): e is Record<string, unknown> => typeof e === "object" && e !== null)
      .map((e) => ({
        id: String(e.id),
        kind: e.kind as TodayBundle["effects"][number]["kind"],
        startsAt: String(e.startsAt),
        endsAt: String(e.endsAt),
        payload:
          e.payload && typeof e.payload === "object"
            ? (e.payload as Record<string, number | string>)
            : {},
      })),
    busySkipsWeek: typeof raw.busySkipsWeek === "number" ? raw.busySkipsWeek : 0,
    penaltyEval30d: typeof raw.penaltyEval30d === "number" ? raw.penaltyEval30d : 0,
  };
}

function parseStats(json: string): PlayerStatsType {
  return PlayerStats.parse(JSON.parse(json) as unknown);
}

export function toTodayPlayer(profile: ProfileRow): TodayPlayer {
  const stats = parseStats(profile.stats_json);
  return {
    level: profile.level,
    xp: profile.xp,
    xpToNext: xpToNextLevel(profile.level),
    rank: profile.rank,
    title: profile.title,
    stats,
    streakDays: profile.streak_days,
    penaltyPoints30d: profile.penalty_points_30d,
  };
}

function storedPlanDay(row: NonNullable<TodayBundle["planDay"]>): PlanDay {
  return {
    id: row.id,
    planId: row.planId,
    localDate: row.localDate,
    focus: DayFocus.parse(row.focus),
    budgetMinutes: row.budgetMinutes,
    hardAllowed: truthyFlag(row.hardAllowed),
    isGate: truthyFlag(row.isGate),
  };
}

export function resolvePlanDay(args: {
  userId: string;
  date: string;
  bundle: TodayBundle;
  parqClear: boolean;
}): PlanDay | null {
  if (args.bundle.planDay) {
    const day = storedPlanDay(args.bundle.planDay);
    if (!args.parqClear) return { ...day, hardAllowed: false, isGate: false };
    return day;
  }
  const habit = args.bundle.habit;
  const goal = args.bundle.goal;
  const plan = args.bundle.plan;
  if (!habit || !goal || !plan) return null;
  const weekStart = isoWeekStart(args.date);
  const built = buildWeeklyPlan({
    planId: plan.id,
    userId: args.userId,
    goalId: goal.id,
    goalType: GoalType.parse(goal.type),
    experience: habit.experience,
    week: habit.week,
    startDate: weekStart,
    version: plan.version,
    idFactory: () => newUlid(),
  });
  const found = built.days.find((d) => d.localDate === args.date);
  const day =
    found ??
    ({
      id: newUlid(),
      planId: plan.id,
      localDate: args.date,
      focus: "rest" as const,
      budgetMinutes: 0,
      hardAllowed: false,
      isGate: false,
    } satisfies PlanDay);
  if (!args.parqClear) return { ...day, hardAllowed: false, isGate: false };
  return day;
}

function catalogPatterns(templateId: string | undefined): PatternTag[] {
  if (!templateId) return [];
  return (CATALOG.find((t) => t.id === templateId)?.patternTags ?? []) as PatternTag[];
}

function groupRankDays(
  quests: Array<{ localDate: string; kind: string; status: string; skipReason: string | null }>,
): Array<{
  localDate: string;
  quests: Array<{ kind: QuestKind; status: QuestStatusType; skipReason?: string | null }>;
}> {
  const map = new Map<
    string,
    { kind: QuestKind; status: QuestStatusType; skipReason?: string | null }[]
  >();
  for (const q of quests) {
    const kind = QuestKind.safeParse(q.kind);
    const status = QuestStatus.safeParse(q.status);
    if (!kind.success || !status.success) continue;
    const list = map.get(q.localDate) ?? [];
    list.push({ kind: kind.data, status: status.data, skipReason: q.skipReason });
    map.set(q.localDate, list);
  }
  return [...map.entries()].map(([localDate, qs]) => ({ localDate, quests: qs }));
}

export function computeRankUpdate(args: {
  level: number;
  previousRank: string;
  penaltyPoints30d: number;
  date: string;
  quests: Array<{ localDate: string; kind: string; status: string; skipReason: string | null }>;
}): { rank: string; title: string; destab: boolean } {
  const days = groupRankDays(args.quests);
  const d14 = addCalendarDaysIso(args.date, -13);
  const d30 = addCalendarDaysIso(args.date, -29);
  const rate14 = days.filter((d) => d.localDate >= d14);
  const rate30 = days.filter((d) => d.localDate >= d30);
  const prev = Rank.safeParse(args.previousRank);
  const result = computeRank({
    level: args.level,
    completionRate14: completionRateFromDays(rate14),
    completionRate30: completionRateFromDays(rate30),
    penaltyPoints30d: args.penaltyPoints30d,
    ...(prev.success ? { previousRank: prev.data } : {}),
  });
  return {
    rank: result.rank,
    title: result.title,
    destab: rankEventIfDestabilized(result) !== null,
  };
}

function completionRateFromDays(
  days: Array<{
    quests: Array<{ kind: QuestKind; status: QuestStatusType; skipReason?: string | null }>;
  }>,
): number {
  let num = 0;
  let den = 0;
  for (const day of days) {
    const required = day.quests.filter((q) => q.kind !== "penalty");
    if (required.length === 0) continue;
    const onlyRest = required.every((q) => q.status === "skipped" && q.skipReason === "rest_planned");
    if (onlyRest) continue;
    den += 1;
    if (
      required.every(
        (q) => q.status === "completed" || q.status === "partial" || q.status === "auto_completed",
      )
    ) {
      num += 1;
    }
  }
  return den === 0 ? 0 : num / den;
}

export function buildTodayPayload(args: {
  date: string;
  today: string;
  profile: ProfileRow;
  bundle: TodayBundle;
  playerOverride?: TodayPlayer;
  persistModifiers?: boolean;
}): TodayPayload {
  const player = args.playerOverride ?? toTodayPlayer(args.profile);
  const recovery = computeRecovery(args.bundle.summaries14);
  const planDay = resolvePlanDay({
    userId: args.profile.user_id,
    date: args.date,
    bundle: args.bundle,
    parqClear: args.profile.parq_clear === 1,
  });
  const hasLedger = args.bundle.ledger !== null;
  const needsEnsure = !hasLedger && args.date === args.today;
  const quests = needsEnsure ? [] : args.bundle.quests;
  const summaryToday =
    args.bundle.summaries14.find((s) => s.localDate === args.date) ?? null;
  const pendingModifiers =
    !needsEnsure && quests.length > 0 ? planModifiers(quests, summaryToday) : [];
  const dated = groupRankDays(
    [...args.bundle.recentQuests, ...quests.map((q) => ({
      localDate: q.localDate,
      kind: q.kind,
      status: q.status,
      skipReason: q.skipReason,
    }))].filter((q, i, all) => all.findIndex((x) => x.localDate === q.localDate && x.kind === q.kind && x.status === q.status && (x as RecentQuest).id === (q as RecentQuest).id) === i),
  ).map((d) => ({ localDate: d.localDate, quests: d.quests }));
  const suggest = shouldSuggestRegenerate(dated);
  return {
    date: args.date,
    needsEnsure,
    player,
    recoveryScore: recovery.score,
    recoveryParts: recovery.parts,
    planDay: planDay
      ? {
          focus: planDay.focus,
          budgetMinutes: planDay.budgetMinutes,
          hardAllowed: planDay.hardAllowed,
          isGate: planDay.isGate,
        }
      : null,
    quests,
    pendingModifiers: args.persistModifiers === true ? [] : pendingModifiers,
    suggestRegenerate: suggest,
    disclaimer: DISCLAIMER,
  };
}

export function runCatchUpUpdate(
  db: NodeDb,
  args: {
    userId: string;
    from: string;
    today: string;
    nowIso: string;
    budget?: QueryBudget;
  },
): number {
  track(args.budget);
  const result = prepare(
    db,
    `UPDATE daily_quests
        SET status = 'failed', updated_at = ?
      WHERE user_id = ? AND local_date >= ? AND local_date < ? AND status = 'issued'`,
  ).run(args.nowIso, args.userId, args.from, args.today);
  return result.changes;
}

function penaltyEventStmts(
  userId: string,
  dates: string[],
  nowIso: string,
): SqlStatement[] {
  if (dates.length === 0) return [];
  const placeholders = dates.map(() => "(?, ?, NULL, 0, 'penalty_eval', ?)").join(", ");
  const params: unknown[] = [];
  for (const _date of dates) {
    params.push(newUlid(), userId, nowIso);
  }
  return [
    stmt(
      `INSERT INTO xp_events (id, user_id, quest_id, delta, reason, created_at)
       VALUES ${placeholders}`,
      params,
    ),
  ];
}

function effectStmt(
  userId: string,
  effect: { kind: string; startsAt: string; endsAt: string; payload: Record<string, number | string> },
  nowIso: string,
): SqlStatement {
  return stmt(
    `INSERT INTO user_effects (id, user_id, kind, starts_at, ends_at, payload_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      newUlid(),
      userId,
      effect.kind,
      effect.startsAt,
      effect.endsAt,
      JSON.stringify(effect.payload),
      nowIso,
    ],
  );
}

function insertQuestsStmt(quests: DailyQuest[], nowIso: string): SqlStatement {
  const placeholders = quests
    .map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)")
    .join(", ");
  const params: unknown[] = [];
  for (const q of quests) {
    params.push(
      q.id,
      q.userId,
      q.localDate,
      q.templateId,
      q.title,
      q.flavor,
      q.kind,
      q.status,
      JSON.stringify(q.prescription),
      q.xpReward,
      JSON.stringify(q.statDelta),
      q.autoCompletable ? 1 : 0,
      q.healthPredicate ? JSON.stringify(q.healthPredicate) : null,
      q.source,
      q.idempotencyKey,
      JSON.stringify(q.modifiersApplied),
      nowIso,
      nowIso,
    );
  }
  return stmt(
    `INSERT INTO daily_quests (
        id, user_id, local_date, template_id, title, flavor, kind, status,
        prescription_json, xp_reward, stat_delta_json, auto_completable,
        health_predicate_json, source, idempotency_key, modifiers_applied_json,
        skip_reason, created_at, updated_at
      ) VALUES ${placeholders}`,
    params,
  );
}

function isLedgerConflict(err: unknown): boolean {
  const code = err && typeof err === "object" && "code" in err ? String(err.code) : "";
  if (code.includes("CONSTRAINT")) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return /UNIQUE constraint failed: issuance_ledger/i.test(msg);
}

async function countedAtomic(
  db: NodeDb,
  statements: SqlStatement[],
  budget?: QueryBudget,
): Promise<void> {
  track(budget, statements.length);
  await atomic(db, statements);
}

function issueInputFromBundle(args: {
  profile: ProfileRow;
  bundle: TodayBundle;
  date: string;
  now: Date;
  planDay: PlanDay;
  penaltyOwed: boolean;
}): ReturnType<typeof issueToday> {
  const habit = args.bundle.habit;
  const goal = args.bundle.goal;
  if (!habit || !goal) {
    throw new ApiError(500, "INTERNAL", "Complete profile is missing habit or goal");
  }
  const d6 = addCalendarDaysIso(args.date, -6);
  const d13 = addCalendarDaysIso(args.date, -13);
  const prior = args.bundle.recentQuests.filter((q) => q.localDate < args.date);
  const last7 = prior.filter((q) => q.localDate >= d6);
  const last14TemplateIds = prior
    .filter((q) => q.localDate >= d13)
    .map((q) => q.templateId)
    .filter((id): id is string => Boolean(id));
  const hardWindow = args.bundle.recentQuests.filter((q) => q.localDate >= d6);
  return issueToday({
    userId: args.profile.user_id,
    localDate: args.date,
    level: args.profile.level,
    planDay: args.planDay,
    goalType: GoalType.parse(goal.type),
    experience: habit.experience,
    equipment: habit.equipment.map((e) => Equipment.parse(e)),
    injuries: habit.injuries,
    parqClear: args.profile.parq_clear === 1,
    recoveryScore: computeRecovery(args.bundle.summaries14).score,
    last7Kinds: last7
      .map((q) => QuestKind.safeParse(q.kind))
      .filter((r): r is { success: true; data: QuestKind } => r.success)
      .map((r) => r.data),
    last7Patterns: last7.flatMap((q) => catalogPatterns(q.templateId)),
    last14TemplateIds,
    effects: args.bundle.effects,
    now: args.now,
    timeZone: args.profile.time_zone,
    penaltyOwed: args.penaltyOwed,
    hardDaysInRolling7: countHardDays(
      hardWindow.map((q) => ({
        localDate: q.localDate,
        intensity: (q.intensity ?? "easy") as Intensity,
        status: (QuestStatus.safeParse(q.status).success
          ? q.status
          : "issued") as QuestStatusType,
      })),
    ),
    idFactory: () => newUlid(),
  });
}

function modifierUpdateStmt(
  quest: DailyQuest,
  mod: PlannedModifier,
  nowIso: string,
): SqlStatement {
  const applied = [...quest.modifiersApplied, mod.key];
  const nextStatus = mod.next.status ?? quest.status;
  const nextPrescription = mod.next.prescription ?? quest.prescription;
  const nextPredicate = mod.next.healthPredicate ?? quest.healthPredicate;
  return stmt(
    `UPDATE daily_quests
        SET modifiers_applied_json = ?,
            status = ?,
            prescription_json = ?,
            health_predicate_json = ?,
            updated_at = ?
      WHERE id = ? AND user_id = ?`,
    [
      JSON.stringify(applied),
      nextStatus,
      JSON.stringify(nextPrescription),
      nextPredicate ? JSON.stringify(nextPredicate) : null,
      nowIso,
      quest.id,
      quest.userId,
    ],
  );
}

function profileEnsureStmt(args: {
  userId: string;
  today: string;
  nowIso: string;
  streakDays: number;
  penaltyPoints30d: number;
  rank: string;
  title: string;
}): SqlStatement {
  return stmt(
    `UPDATE profiles
        SET last_ensured_local_date = ?,
            streak_days = ?,
            penalty_points_30d = ?,
            rank = ?,
            title = ?,
            updated_at = ?
      WHERE user_id = ?`,
    [
      args.today,
      args.streakDays,
      args.penaltyPoints30d,
      args.rank,
      args.title,
      args.nowIso,
      args.userId,
    ],
  );
}

function destabStmt(userId: string, fromRank: string, nowIso: string): SqlStatement {
  return stmt(
    `INSERT INTO rank_events (id, user_id, from_rank, to_rank, reason, created_at)
     VALUES (?, ?, ?, 'A', 'destabilized', ?)`,
    [newUlid(), userId, fromRank, nowIso],
  );
}

function rankFromState(args: {
  profile: ProfileRow;
  date: string;
  penaltyPoints30d: number;
  quests: Array<{ localDate: string; kind: string; status: string; skipReason: string | null }>;
  extra?: Array<{ localDate: string; kind: string; status: string; skipReason: string | null }>;
}): { rank: string; title: string; destab: boolean } {
  return computeRankUpdate({
    level: args.profile.level,
    previousRank: args.profile.rank,
    penaltyPoints30d: args.penaltyPoints30d,
    date: args.date,
    quests: [...args.quests, ...(args.extra ?? [])],
  });
}

export async function persistNewModifiers(
  db: NodeDb,
  args: {
    quests: TodayQuest[];
    summary: DailySummary | null;
    nowIso: string;
    budget?: QueryBudget;
  },
): Promise<TodayQuest[]> {
  const planned = planModifiers(args.quests, args.summary);
  if (planned.length === 0) return args.quests;
  const byId = new Map(args.quests.map((q) => [q.id, q]));
  const statements: SqlStatement[] = [];
  const nextQuests = args.quests.map((q) => ({ ...q }));
  for (const mod of planned) {
    const q = byId.get(mod.questId);
    if (!q || q.modifiersApplied.includes(mod.key)) continue;
    statements.push(modifierUpdateStmt(q, mod, args.nowIso));
    const idx = nextQuests.findIndex((x) => x.id === q.id);
    if (idx >= 0) {
      const cur = nextQuests[idx];
      if (!cur) continue;
      nextQuests[idx] = {
        ...cur,
        ...mod.next,
        prescription: mod.next.prescription ?? cur.prescription,
        modifiersApplied: [...cur.modifiersApplied, mod.key],
        skipReason: cur.skipReason,
      };
    }
  }
  if (statements.length > 0) {
    await countedAtomic(db, statements, args.budget);
  }
  return nextQuests;
}

export async function ensureToday(args: {
  db: NodeDb;
  profile: ProfileRow;
  now: Date;
  budget?: QueryBudget;
}): Promise<TodayPayload> {
  const profile = args.profile;
  assertPlayableProfile(profile);
  const today = requireLocalToday(profile.time_zone, args.now);
  const nowIso = args.now.toISOString();
  const bundle = loadTodayBundle(args.db, {
    userId: profile.user_id,
    date: today,
    now: args.now,
    lastEnsuredLocalDate: profile.last_ensured_local_date,
    ...(args.budget ? { budget: args.budget } : {}),
  });

  const catchUp = catchUpMissedDays({
    lastEnsuredLocalDate: profile.last_ensured_local_date,
    today,
    existingQuests: bundle.recentQuests.map((q) => ({
      localDate: q.localDate,
      status: (QuestStatus.safeParse(q.status).success ? q.status : "issued") as QuestStatusType,
      kind: (QuestKind.safeParse(q.kind).success ? q.kind : "habit") as QuestKind,
    })),
    now: args.now,
    timeZone: profile.time_zone,
  });

  const failFrom = catchUp.failFrom ?? today;
  const flippedRows = runCatchUpUpdate(args.db, {
    userId: profile.user_id,
    from: failFrom,
    today,
    nowIso,
    ...(args.budget ? { budget: args.budget } : {}),
  });
  const applyFailSideEffects = flippedRows > 0;
  const penaltyDates = applyFailSideEffects ? catchUp.penaltyDates : [];
  const streakDays = applyFailSideEffects && catchUp.streakReset ? 0 : profile.streak_days;
  const penaltyPoints30d = bundle.penaltyEval30d + penaltyDates.length;

  const recentAfterFail = bundle.recentQuests.map((q) =>
    q.status === "issued" && q.localDate >= failFrom && q.localDate < today
      ? { ...q, status: "failed" }
      : q,
  );

  if (bundle.ledger !== null || bundle.quests.length > 0) {
    const summaryToday = bundle.summaries14.find((s) => s.localDate === today) ?? null;
    const quests = await persistNewModifiers(args.db, {
      quests: bundle.quests,
      summary: summaryToday,
      nowIso,
      ...(args.budget ? { budget: args.budget } : {}),
    });
    const rank = rankFromState({
      profile,
      date: today,
      penaltyPoints30d,
      quests: [...recentAfterFail, ...quests],
    });
    const alreadyStmts: SqlStatement[] = [
      ...penaltyEventStmts(profile.user_id, penaltyDates, nowIso),
      profileEnsureStmt({
        userId: profile.user_id,
        today,
        nowIso,
        streakDays,
        penaltyPoints30d,
        rank: rank.rank,
        title: rank.title,
      }),
    ];
    if (applyFailSideEffects && catchUp.cautionVolume) {
      alreadyStmts.push(effectStmt(profile.user_id, catchUp.cautionVolume, nowIso));
    }
    if (rank.destab) {
      alreadyStmts.push(destabStmt(profile.user_id, profile.rank, nowIso));
    }
    await countedAtomic(args.db, alreadyStmts, args.budget);
    const nextProfile = { ...profile, ...rankFields(rank, streakDays, penaltyPoints30d, today) };
    return buildTodayPayload({
      date: today,
      today,
      profile: nextProfile,
      bundle: { ...bundle, quests, ledger: bundle.ledger ?? { localDate: today, planId: bundle.plan?.id ?? "" } },
      persistModifiers: true,
    });
  }

  const planDay = resolvePlanDay({
    userId: profile.user_id,
    date: today,
    bundle,
    parqClear: profile.parq_clear === 1,
  });
  if (!planDay || !bundle.plan) {
    throw new ApiError(500, "INTERNAL", "Cannot issue today without an active plan");
  }

  const issued = issueInputFromBundle({
    profile,
    bundle,
    date: today,
    now: args.now,
    planDay,
    penaltyOwed: catchUp.penaltyOwed,
  });
  if (issued.quests.length === 0) {
    throw new ApiError(500, "INTERNAL", "Issuer produced no quests");
  }

  const rank = rankFromState({
    profile,
    date: today,
    penaltyPoints30d,
    quests: recentAfterFail,
    extra: issued.quests.map((q) => ({
      localDate: q.localDate,
      kind: q.kind,
      status: q.status,
      skipReason: null,
    })),
  });

  const issueStmts: SqlStatement[] = [
    stmt(
      `INSERT INTO issuance_ledger (user_id, local_date, plan_id, created_at) VALUES (?, ?, ?, ?)`,
      [profile.user_id, today, bundle.plan.id, nowIso],
    ),
    insertQuestsStmt(issued.quests, nowIso),
    ...penaltyEventStmts(profile.user_id, penaltyDates, nowIso),
    profileEnsureStmt({
      userId: profile.user_id,
      today,
      nowIso,
      streakDays,
      penaltyPoints30d,
      rank: rank.rank,
      title: rank.title,
    }),
  ];
  if (applyFailSideEffects && catchUp.cautionVolume) {
    issueStmts.push(effectStmt(profile.user_id, catchUp.cautionVolume, nowIso));
  }
  if (rank.destab) {
    issueStmts.push(destabStmt(profile.user_id, profile.rank, nowIso));
  }

  try {
    await countedAtomic(args.db, issueStmts, args.budget);
  } catch (err) {
    if (!isLedgerConflict(err)) throw err;
    return loadExistingAfterConflict(args.db, {
      profile,
      today,
      now: args.now,
      nowIso,
      ...(args.budget ? { budget: args.budget } : {}),
    });
  }

  const nextProfile = { ...profile, ...rankFields(rank, streakDays, penaltyPoints30d, today) };
  const todayQuests: TodayQuest[] = issued.quests.map((q) => ({ ...q, skipReason: null }));
  return buildTodayPayload({
    date: today,
    today,
    profile: nextProfile,
    bundle: {
      ...bundle,
      ledger: { localDate: today, planId: bundle.plan.id },
      quests: todayQuests,
    },
    persistModifiers: true,
  });
}

function rankFields(
  rank: { rank: string; title: string },
  streakDays: number,
  penaltyPoints30d: number,
  today: string,
): Pick<
  ProfileRow,
  "rank" | "title" | "streak_days" | "penalty_points_30d" | "last_ensured_local_date"
> {
  return {
    rank: rank.rank,
    title: rank.title,
    streak_days: streakDays,
    penalty_points_30d: penaltyPoints30d,
    last_ensured_local_date: today,
  };
}

async function loadExistingAfterConflict(
  db: NodeDb,
  args: {
    profile: ProfileRow;
    today: string;
    now: Date;
    nowIso: string;
    budget?: QueryBudget;
  },
): Promise<TodayPayload> {
  track(args.budget);
  prepare(db, `UPDATE profiles SET last_ensured_local_date = ?, updated_at = ? WHERE user_id = ?`).run(
    args.today,
    args.nowIso,
    args.profile.user_id,
  );
  const bundle = loadTodayBundle(db, {
    userId: args.profile.user_id,
    date: args.today,
    now: args.now,
    lastEnsuredLocalDate: args.today,
    ...(args.budget ? { budget: args.budget } : {}),
  });
  return buildTodayPayload({
    date: args.today,
    today: args.today,
    profile: { ...args.profile, last_ensured_local_date: args.today },
    bundle,
    persistModifiers: true,
  });
}

export function requireLocalToday(timeZone: string, now: Date): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  } catch {
    throw new ApiError(400, "VALIDATION", "Invalid time zone");
  }
}

export function readTodayWindow(args: {
  db: NodeDb;
  profile: ProfileRow;
  date: string | undefined;
  now: Date;
  budget?: QueryBudget;
}): TodayPayload {
  assertPlayableProfile(args.profile);
  const today = requireLocalToday(args.profile.time_zone, args.now);
  const date = args.date ?? today;
  if (date > today) {
    throw new ApiError(400, "DATE_IN_FUTURE", "Cannot read a future local date");
  }
  const bundle = loadTodayBundle(args.db, {
    userId: args.profile.user_id,
    date,
    now: args.now,
    lastEnsuredLocalDate: args.profile.last_ensured_local_date,
    ...(args.budget ? { budget: args.budget } : {}),
  });
  return buildTodayPayload({ date, today, profile: args.profile, bundle });
}

export function catchUpPlanForUser(args: {
  lastEnsuredLocalDate: string | null;
  today: string;
  existingQuests: Array<{ localDate: string; status: QuestStatusType; kind: QuestKind }>;
  now: Date;
  timeZone: string;
}): CatchUpResult {
  return catchUpMissedDays(args);
}

export type { CatchUpResult };
