import { atomic } from "@arise/db";
import type { NodeDb, SqlStatement } from "@arise/db";
import {
  DailyQuest,
  DailySummary,
  HealthMetric,
  type DailyQuest as DailyQuestT,
} from "@arise/domain";
import { guideFor, planModifiers } from "@arise/engine";
import {
  aggregateDailySummaries,
  ingestManual,
  normalizeSamples,
  type AggregateSample,
  type NormalizedSample,
} from "@arise/health";
import type { Hono } from "hono";
import { z } from "zod";
import { requireSession } from "../middleware/auth.js";
import { ApiError } from "../middleware/error.js";
import { prepare, stmt } from "../sql.js";
import {
  addCalendarDaysIso,
  parseLocalDateParam,
  questModifierUpdateStmt,
  type TodayQuest,
} from "../today-service.js";
import type { AppBindings, AppDeps } from "../types.js";
import { newUlid } from "../ulid.js";
import { onboardingRequired, readJsonBody, requireUserId } from "./onboarding.js";

export const HEALTH_INGEST_MAX_SAMPLES = 200;
export const HEALTH_RATE_KEY_PREFIX = "health_ingest:";

export let lastHealthPersistStatements = 0;

const IngestSource = z.enum(["csv", "manual"]);

const SampleIn = z.object({
  source: IngestSource,
  metric: HealthMetric,
  value: z.number().finite(),
  unit: z.string().min(1),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  clientId: z.string().min(1).optional(),
});

const SamplesBody = z.object({
  samples: z.array(SampleIn).max(HEALTH_INGEST_MAX_SAMPLES),
});

const ManualBody = z.object({
  metric: HealthMetric,
  value: z.number().finite(),
  unit: z.string().min(1),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  clientId: z.string().min(1).optional(),
});

type HealthProfile = {
  health_consent_at: string | null;
  time_zone: string;
  onboarding_status: string;
};

type SampleRow = {
  user_id: string;
  metric: string;
  value: number;
  start_at: string;
  end_at: string;
  dedup_hash: string;
};

type SummaryProtectRow = {
  local_date: string;
  hard_bouts: number;
  recovery_score: number | null;
};

type QuestRow = {
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
  auto_completable: number;
  health_predicate_json: string | null;
  source: string;
  idempotency_key: string;
  modifiers_applied_json: string;
  skip_reason: string | null;
};

type SummaryRow = {
  user_id: string;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasConsentFlag(body: unknown): boolean {
  return isRecord(body) && body.consent === true;
}

function utcWindowStartMs(now: Date): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function loadHealthProfile(db: NodeDb, userId: string): HealthProfile {
  const row = prepare(
    db,
    `SELECT health_consent_at, time_zone, onboarding_status
       FROM profiles WHERE user_id = ?`,
  ).get(userId) as HealthProfile | undefined;
  if (row === undefined) {
    throw onboardingRequired();
  }
  return row;
}

function requireConsent(profile: HealthProfile, consented: boolean): void {
  if (profile.health_consent_at == null && !consented) {
    throw new ApiError(
      403,
      "HEALTH_CONSENT_REQUIRED",
      "Health ingest requires consent:true on the first successful call",
    );
  }
}

function assertImportAllowance(
  db: NodeDb,
  userId: string,
  add: number,
  maxPerDay: number,
  now: Date,
): void {
  if (add <= 0) return;
  const row = prepare(
    db,
    `SELECT count FROM rate_limits WHERE key = ? AND window_start = ?`,
  ).get(`${HEALTH_RATE_KEY_PREFIX}${userId}`, utcWindowStartMs(now)) as
    | { count: number }
    | undefined;
  const current = row?.count ?? 0;
  if (current + add > maxPerDay) {
    throw new ApiError(429, "RATE_LIMITED", "Daily health import limit reached");
  }
}

function rateLimitIncrementStmt(userId: string, add: number, now: Date): SqlStatement {
  return stmt(
    `INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, ?)
     ON CONFLICT(key, window_start) DO UPDATE SET count = count + excluded.count`,
    [`${HEALTH_RATE_KEY_PREFIX}${userId}`, utcWindowStartMs(now), add],
  );
}

function consentStmt(userId: string, nowIso: string): SqlStatement {
  return stmt(
    `UPDATE profiles
        SET health_consent_at = ?, updated_at = ?
      WHERE user_id = ? AND health_consent_at IS NULL`,
    [nowIso, nowIso, userId],
  );
}

function samplesInsertStmt(rows: readonly NormalizedSample[]): SqlStatement {
  const placeholders = rows.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
  const params = rows.flatMap((s) => [
    s.id,
    s.userId,
    s.source,
    s.metric,
    s.value,
    s.unit,
    s.startAt,
    s.endAt,
    s.dedupHash,
    s.ingestedAt,
  ]);
  return stmt(
    `INSERT OR IGNORE INTO health_samples (
        id, user_id, source, metric, value, unit, start_at, end_at, dedup_hash, ingested_at
      ) VALUES ${placeholders}`,
    params,
  );
}

function summariesUpsertStmt(summaries: readonly DailySummary[], nowIso: string): SqlStatement {
  const placeholders = summaries.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
  const params = summaries.flatMap((s) => [
    s.userId,
    s.localDate,
    s.steps,
    s.activeMinutes,
    s.sleepMinutes,
    s.restingHr,
    s.hrv,
    s.weightKg,
    s.soreness,
    s.sleepQuality,
    s.hardBouts,
    s.recoveryScore,
    nowIso,
  ]);
  return stmt(
    `INSERT INTO daily_summaries (
        user_id, local_date, steps, active_minutes, sleep_minutes,
        resting_hr, hrv, weight_kg, soreness, sleep_quality,
        hard_bouts, recovery_score, updated_at
      ) VALUES ${placeholders}
      ON CONFLICT(user_id, local_date) DO UPDATE SET
        steps = excluded.steps,
        active_minutes = excluded.active_minutes,
        sleep_minutes = excluded.sleep_minutes,
        resting_hr = excluded.resting_hr,
        hrv = excluded.hrv,
        weight_kg = excluded.weight_kg,
        soreness = excluded.soreness,
        sleep_quality = excluded.sleep_quality,
        updated_at = excluded.updated_at`,
    params,
  );
}

function localDateOf(iso: string): string {
  return iso.slice(0, 10);
}

function loadExistingSamples(
  db: NodeDb,
  userId: string,
  minDate: string,
  maxDate: string,
): SampleRow[] {
  const until = addCalendarDaysIso(maxDate, 1);
  return prepare(
    db,
    `SELECT user_id, metric, value, start_at, end_at, dedup_hash
       FROM health_samples
      WHERE user_id = ? AND start_at >= ? AND start_at < ?`,
  ).all(userId, `${minDate}T00:00:00.000Z`, `${until}T00:00:00.000Z`) as SampleRow[];
}

function loadSummaryProtect(
  db: NodeDb,
  userId: string,
  minDate: string,
  maxDate: string,
): Map<string, SummaryProtectRow> {
  const rows = prepare(
    db,
    `SELECT local_date, hard_bouts, recovery_score
       FROM daily_summaries
      WHERE user_id = ? AND local_date >= ? AND local_date <= ?`,
  ).all(userId, minDate, maxDate) as SummaryProtectRow[];
  return new Map(rows.map((r) => [r.local_date, r]));
}

function mergeAndFold(
  existing: readonly SampleRow[],
  kept: readonly NormalizedSample[],
): DailySummary[] {
  const byHash = new Map<string, AggregateSample>();
  for (const row of existing) {
    byHash.set(row.dedup_hash, {
      userId: row.user_id,
      metric: row.metric as AggregateSample["metric"],
      value: row.value,
      startAt: row.start_at,
      endAt: row.end_at,
    });
  }
  for (const s of kept) {
    byHash.set(s.dedupHash, {
      userId: s.userId,
      metric: s.metric,
      value: s.value,
      startAt: s.startAt,
      endAt: s.endAt,
    });
  }
  return aggregateDailySummaries([...byHash.values()]);
}

function protectHardBouts(
  folded: DailySummary[],
  existing: Map<string, SummaryProtectRow>,
): DailySummary[] {
  return folded.map((s) => {
    const prev = existing.get(s.localDate);
    if (!prev) return { ...s, hardBouts: 0 };
    return {
      ...s,
      hardBouts: prev.hard_bouts,
      recoveryScore: prev.recovery_score ?? 0,
    };
  });
}

function toTodayQuest(row: QuestRow): TodayQuest {
  const parsed = DailyQuest.parse({
    id: row.id,
    userId: row.user_id,
    localDate: row.local_date,
    templateId: row.template_id,
    title: row.title,
    flavor: row.flavor,
    kind: row.kind,
    status: row.status,
    prescription: JSON.parse(row.prescription_json) as DailyQuestT["prescription"],
    xpReward: row.xp_reward,
    statDelta: JSON.parse(row.stat_delta_json) as DailyQuestT["statDelta"],
    autoCompletable: row.auto_completable === 1,
    ...(row.health_predicate_json
      ? { healthPredicate: JSON.parse(row.health_predicate_json) as DailyQuestT["healthPredicate"] }
      : {}),
    modifiersApplied: JSON.parse(row.modifiers_applied_json || "[]") as string[],
    source: row.source,
    idempotencyKey: row.idempotency_key,
  });
  return { ...parsed, skipReason: row.skip_reason, guide: guideFor(parsed.templateId) };
}

function loadQuestsForDates(db: NodeDb, userId: string, dates: readonly string[]): TodayQuest[] {
  if (dates.length === 0) return [];
  const placeholders = dates.map(() => "?").join(", ");
  const rows = prepare(
    db,
    `SELECT id, user_id, local_date, template_id, title, flavor, kind, status,
            prescription_json, xp_reward, stat_delta_json, auto_completable,
            health_predicate_json, source, idempotency_key, modifiers_applied_json,
            skip_reason
       FROM daily_quests
      WHERE user_id = ? AND local_date IN (${placeholders})`,
  ).all(userId, ...dates) as QuestRow[];
  return rows.map(toTodayQuest);
}

function modifierStatements(
  quests: readonly TodayQuest[],
  summaries: readonly DailySummary[],
  nowIso: string,
): SqlStatement[] {
  const byDate = new Map<string, TodayQuest[]>();
  for (const q of quests) {
    const list = byDate.get(q.localDate) ?? [];
    list.push(q);
    byDate.set(q.localDate, list);
  }
  const out: SqlStatement[] = [];
  for (const summary of summaries) {
    const dayQuests = byDate.get(summary.localDate) ?? [];
    if (dayQuests.length === 0) continue;
    const planned = planModifiers(dayQuests, summary);
    const seen = new Map(dayQuests.map((q) => [q.id, q]));
    for (const mod of planned) {
      const q = seen.get(mod.questId);
      if (!q || q.modifiersApplied.includes(mod.key)) continue;
      out.push(questModifierUpdateStmt(q, mod, nowIso));
      seen.set(q.id, {
        ...q,
        ...mod.next,
        prescription: mod.next.prescription ?? q.prescription,
        modifiersApplied: [...q.modifiersApplied, mod.key],
      });
    }
  }
  return out;
}

function toPublicSummary(row: SummaryRow): DailySummary {
  return DailySummary.parse({
    userId: row.user_id,
    localDate: row.local_date,
    steps: row.steps,
    activeMinutes: row.active_minutes,
    sleepMinutes: row.sleep_minutes,
    restingHr: row.resting_hr,
    hrv: row.hrv,
    weightKg: row.weight_kg,
    soreness: row.soreness,
    sleepQuality: row.sleep_quality,
    hardBouts: row.hard_bouts ?? 0,
    recoveryScore: row.recovery_score ?? 0,
  });
}

async function persistIngest(args: {
  db: NodeDb;
  userId: string;
  profile: HealthProfile;
  consented: boolean;
  kept: NormalizedSample[];
  submitted: number;
  now: Date;
  maxPerDay: number;
}): Promise<{ ingested: number; summaries: DailySummary[] }> {
  const { db, userId, profile, consented, kept, submitted, now } = args;
  assertImportAllowance(db, userId, submitted, args.maxPerDay, now);
  const nowIso = now.toISOString();

  const dates = [...new Set(kept.map((s) => localDateOf(s.startAt)))].sort();
  const existingSamples =
    dates.length > 0
      ? loadExistingSamples(db, userId, dates[0] ?? nowIso.slice(0, 10), dates[dates.length - 1] ?? nowIso.slice(0, 10))
      : [];
  const existingHashes = new Set(existingSamples.map((r) => r.dedup_hash));
  const fresh = kept.filter((s) => !existingHashes.has(s.dedupHash));
  const protect =
    dates.length > 0
      ? loadSummaryProtect(db, userId, dates[0] ?? "", dates[dates.length - 1] ?? "")
      : new Map<string, SummaryProtectRow>();
  const summaries =
    kept.length > 0 ? protectHardBouts(mergeAndFold(existingSamples, kept), protect) : [];
  const quests = loadQuestsForDates(db, userId, dates);
  // Duplicate samples must not re-plan (residual + same steps would fire auto_steps).
  const modifierStmts =
    fresh.length > 0 ? modifierStatements(quests, summaries, nowIso) : [];

  const statements: SqlStatement[] = [];
  if (profile.health_consent_at == null && consented) {
    statements.push(consentStmt(userId, nowIso));
  }
  if (submitted > 0) {
    statements.push(rateLimitIncrementStmt(userId, submitted, now));
  }
  if (fresh.length > 0) {
    statements.push(samplesInsertStmt(fresh));
  }
  if (fresh.length > 0 && summaries.length > 0) {
    statements.push(summariesUpsertStmt(summaries, nowIso));
  }
  statements.push(...modifierStmts);

  lastHealthPersistStatements =
    (fresh.length > 0 ? 1 : 0) +
    (fresh.length > 0 && summaries.length > 0 ? 1 : 0) +
    modifierStmts.length;

  if (statements.length > 0) {
    await atomic(db, statements);
  }

  return { ingested: fresh.length, summaries };
}

export function registerHealthRoutes(app: Hono<AppBindings>, deps: AppDeps): void {
  const gate = requireSession(deps.auth);

  app.post("/api/v1/health/samples", gate, async (c) => {
    lastHealthPersistStatements = 0;
    const userId = requireUserId(c.get("userId"));
    const raw = await readJsonBody(c.req.raw);
    const consented = hasConsentFlag(raw);
    const parsed = SamplesBody.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError(400, "VALIDATION", "Invalid health samples body", parsed.error.flatten());
    }
    const profile = loadHealthProfile(deps.db, userId);
    requireConsent(profile, consented);
    const now = new Date();
    const { kept, dropped } = normalizeSamples(
      parsed.data.samples.map((s) => ({
        id: newUlid(),
        userId,
        source: s.source,
        metric: s.metric,
        value: s.value,
        unit: s.unit,
        startAt: s.startAt,
        endAt: s.endAt,
      })),
      now,
    );
    const result = await persistIngest({
      db: deps.db,
      userId,
      profile,
      consented,
      kept,
      submitted: parsed.data.samples.length,
      now,
      maxPerDay: deps.env.MAX_IMPORT_SAMPLES_PER_DAY,
    });
    return c.json({
      ingested: result.ingested,
      dropped,
      summaries: result.summaries,
    });
  });

  app.post("/api/v1/health/manual", gate, async (c) => {
    lastHealthPersistStatements = 0;
    const userId = requireUserId(c.get("userId"));
    const raw = await readJsonBody(c.req.raw);
    const consented = hasConsentFlag(raw);
    const parsed = ManualBody.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError(400, "VALIDATION", "Invalid manual health body", parsed.error.flatten());
    }
    const profile = loadHealthProfile(deps.db, userId);
    requireConsent(profile, consented);
    const now = new Date();
    const keptOne = ingestManual({
      input: parsed.data,
      userId,
      now,
      id: newUlid(),
    });
    const kept = keptOne ? [keptOne] : [];
    const result = await persistIngest({
      db: deps.db,
      userId,
      profile,
      consented,
      kept,
      submitted: 1,
      now,
      maxPerDay: deps.env.MAX_IMPORT_SAMPLES_PER_DAY,
    });
    return c.json({
      ingested: result.ingested,
      dropped: keptOne ? 0 : 1,
      summaries: result.summaries,
    });
  });

  app.get("/api/v1/health/summary", gate, (c) => {
    const userId = requireUserId(c.get("userId"));
    loadHealthProfile(deps.db, userId);
    const from = parseLocalDateParam(c.req.query("from"), "from");
    const to = parseLocalDateParam(c.req.query("to"), "to");
    if (from === undefined || to === undefined) {
      throw new ApiError(400, "VALIDATION", "from and to query params are required (YYYY-MM-DD)");
    }
    if (from > to) {
      throw new ApiError(400, "VALIDATION", "from must be on or before to");
    }
    const rows = prepare(
      deps.db,
      `SELECT user_id, local_date, steps, active_minutes, sleep_minutes,
              resting_hr, hrv, weight_kg, soreness, sleep_quality,
              hard_bouts, recovery_score
         FROM daily_summaries
        WHERE user_id = ? AND local_date >= ? AND local_date <= ?
        ORDER BY local_date ASC`,
    ).all(userId, from, to) as SummaryRow[];
    return c.json(rows.map(toPublicSummary));
  });
}
