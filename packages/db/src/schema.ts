import { DEFAULT_STATS } from "@arise/domain";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const DEFAULT_STATS_JSON = JSON.stringify(DEFAULT_STATS);

/** Better Auth core `user` + username-plugin columns. Application FKs reference `user.id`. No `users` table. */
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  username: text("username").unique(),
  displayUsername: text("display_username"),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

/** XP lives only here (`level` default 1, `xp` default 0). `stats_json` key is `intl`. */
export const profiles = sqliteTable("profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  age: integer("age").notNull(),
  sex: text("sex"),
  heightCm: real("height_cm"),
  weightKg: real("weight_kg"),
  units: text("units").notNull().default("metric"),
  timeZone: text("time_zone").notNull(),
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  rank: text("rank").notNull().default("E"),
  title: text("title").notNull().default("Initiate"),
  statsJson: text("stats_json").notNull().default(DEFAULT_STATS_JSON),
  streakDays: integer("streak_days").notNull().default(0),
  bestStreakDays: integer("best_streak_days").notNull().default(0),
  penaltyPoints30d: integer("penalty_points_30d").notNull().default(0),
  parqClear: integer("parq_clear").notNull().default(0),
  acceptedDisclaimerAt: text("accepted_disclaimer_at"),
  healthConsentAt: text("health_consent_at"),
  onboardingStatus: text("onboarding_status").notNull().default("pending"),
  lastEnsuredLocalDate: text("last_ensured_local_date"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const goals = sqliteTable(
  "goals",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    targetDate: text("target_date"),
    targetWeightKg: real("target_weight_kg"),
    weeklyAvailableMinutes: integer("weekly_available_minutes").notNull(),
    priority: integer("priority").notNull(),
    active: integer("active").notNull().default(1),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("goals_user_id_active_idx").on(t.userId, t.active)],
);

/** v1: no `learned_rest_weekdays_json`. */
export const habitProfiles = sqliteTable("habit_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  experience: integer("experience").notNull(),
  equipmentJson: text("equipment_json").notNull(),
  injuriesJson: text("injuries_json").notNull(),
  injuryNotes: text("injury_notes"),
  jobActivity: text("job_activity").notNull(),
  commuteWalkMinutes: integer("commute_walk_minutes").notNull(),
  sleepStart: text("sleep_start").notNull(),
  sleepEnd: text("sleep_end").notNull(),
  dietPreference: text("diet_preference").notNull(),
  weekJson: text("week_json").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const plans = sqliteTable(
  "plans",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    goalId: text("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    rationaleJson: text("rationale_json").notNull(),
    archivedAt: text("archived_at"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("plans_user_id_archived_at_idx").on(t.userId, t.archivedAt)],
);

export const planDays = sqliteTable(
  "plan_days",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    localDate: text("local_date").notNull(),
    focus: text("focus").notNull(),
    budgetMinutes: integer("budget_minutes").notNull(),
    hardAllowed: integer("hard_allowed").notNull(),
    isGate: integer("is_gate").notNull().default(0),
  },
  (t) => [
    uniqueIndex("plan_days_plan_id_local_date_uidx").on(t.planId, t.localDate),
    index("plan_days_user_id_local_date_idx").on(t.userId, t.localDate),
  ],
);

/** Reserved empty table. v1 does not read it. */
export const questTemplates = sqliteTable("quest_templates", {
  id: text("id").primaryKey(),
});

export const dailyQuests = sqliteTable(
  "daily_quests",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    localDate: text("local_date").notNull(),
    templateId: text("template_id").notNull(),
    title: text("title").notNull(),
    flavor: text("flavor").notNull(),
    kind: text("kind").notNull(),
    status: text("status").notNull(),
    prescriptionJson: text("prescription_json").notNull(),
    xpReward: integer("xp_reward").notNull(),
    statDeltaJson: text("stat_delta_json").notNull(),
    autoCompletable: integer("auto_completable").notNull(),
    healthPredicateJson: text("health_predicate_json"),
    source: text("source").notNull(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    modifiersAppliedJson: text("modifiers_applied_json").notNull().default("[]"),
    skipReason: text("skip_reason"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("daily_quests_user_id_local_date_idx").on(t.userId, t.localDate),
    index("daily_quests_user_id_status_local_date_idx").on(t.userId, t.status, t.localDate),
  ],
);

export const questCompletions = sqliteTable("quest_completions", {
  id: text("id").primaryKey(),
  questId: text("quest_id")
    .notNull()
    .references(() => dailyQuests.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  perceivedRpe: integer("perceived_rpe"),
  notes: text("notes"),
  clientId: text("client_id").unique(),
  completedAt: text("completed_at").notNull(),
});

export const issuanceLedger = sqliteTable(
  "issuance_ledger",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    localDate: text("local_date").notNull(),
    planId: text("plan_id").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.localDate] })],
);

export const healthSamples = sqliteTable(
  "health_samples",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    metric: text("metric").notNull(),
    value: real("value").notNull(),
    unit: text("unit").notNull(),
    startAt: text("start_at").notNull(),
    endAt: text("end_at").notNull(),
    dedupHash: text("dedup_hash").notNull().unique(),
    ingestedAt: text("ingested_at").notNull(),
  },
  (t) => [
    index("health_samples_user_id_metric_start_at_idx").on(t.userId, t.metric, t.startAt),
    index("health_samples_ingested_at_idx").on(t.ingestedAt),
  ],
);

/** v1: no `zone2_minutes`. */
export const dailySummaries = sqliteTable(
  "daily_summaries",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    localDate: text("local_date").notNull(),
    steps: integer("steps"),
    activeMinutes: integer("active_minutes"),
    sleepMinutes: integer("sleep_minutes"),
    restingHr: real("resting_hr"),
    hrv: real("hrv"),
    weightKg: real("weight_kg"),
    soreness: integer("soreness"),
    sleepQuality: integer("sleep_quality"),
    hardBouts: integer("hard_bouts").notNull().default(0),
    recoveryScore: real("recovery_score"),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.localDate] })],
);

export const statSnapshots = sqliteTable(
  "stat_snapshots",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    localDate: text("local_date").notNull(),
    level: integer("level").notNull(),
    xp: integer("xp").notNull(),
    rank: text("rank").notNull(),
    statsJson: text("stats_json").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("stat_snapshots_user_id_local_date_uidx").on(t.userId, t.localDate)],
);

export const xpEvents = sqliteTable(
  "xp_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    questId: text("quest_id"),
    delta: integer("delta").notNull(),
    reason: text("reason").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("xp_events_user_id_created_at_idx").on(t.userId, t.createdAt)],
);

export const rankEvents = sqliteTable("rank_events", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  fromRank: text("from_rank").notNull(),
  toRank: text("to_rank").notNull(),
  reason: text("reason").notNull(),
  createdAt: text("created_at").notNull(),
});

export const userEffects = sqliteTable(
  "user_effects",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    startsAt: text("starts_at").notNull(),
    endsAt: text("ends_at").notNull(),
    payloadJson: text("payload_json").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("user_effects_user_id_ends_at_idx").on(t.userId, t.endsAt)],
);

export const integrations = sqliteTable(
  "integrations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    status: text("status").notNull(),
    metaJson: text("meta_json"),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [uniqueIndex("integrations_user_id_provider_uidx").on(t.userId, t.provider)],
);

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    actor: text("actor").notNull(),
    action: text("action").notNull(),
    metaJson: text("meta_json"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("audit_logs_created_at_idx").on(t.createdAt)],
);

/** Health ingest only. Node auth rate-limit is in-process memory. */
export const rateLimits = sqliteTable(
  "rate_limits",
  {
    key: text("key").notNull(),
    windowStart: integer("window_start").notNull(),
    count: integer("count").notNull(),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })],
);

/** Better Auth `secondaryStorage` on Workers Paid; created on Node so migrations match. */
export const authRl = sqliteTable("auth_rl", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at").notNull(),
});
