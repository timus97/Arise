import { createNodeDb, migrate } from "@arise/db";
import { addCalendarDays, localDate } from "@arise/engine";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { createAuth } from "../auth.js";
import type { Env } from "../env.js";

const ORIGIN = "http://localhost:5173";
const INVITE = "test-invite-code";

const validRegister = {
  email: "player@example.com",
  password: "correct-horse",
  name: "Player One",
  username: "player_one",
  age: 18,
  inviteCode: INVITE,
  acceptedMedicalDisclaimer: true as const,
};

function utcDateOffset(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const validOnboarding = {
  acceptedMedicalDisclaimer: true as const,
  parq: {
    chestPain: false,
    dizziness: false,
    doctorAdvisedAgainst: false,
    pregnancy: false,
    uncontrolledCondition: false,
  },
  profile: {
    age: 29,
    sex: "female" as const,
    heightCm: 168,
    weightKg: 72,
    units: "metric" as const,
    timeZone: "Europe/Stockholm",
  },
  goal: {
    type: "fat_loss" as const,
    targetWeightKg: 66,
    targetDate: utcDateOffset(180),
  },
  habit: {
    experience: 1 as const,
    equipment: ["bands"] as Array<"none" | "bands" | "dumbbells" | "full_gym">,
    injuries: ["knee"],
    injuryNotes: "old ACL, no pain now",
    jobActivity: "sedentary" as const,
    commuteWalkMinutes: 15,
    sleepWindow: { start: "23:00", end: "07:00" },
    dietPreference: "unspecified" as const,
    week: [
      { weekday: 1, minutes: 40 },
      { weekday: 3, minutes: 40 },
      { weekday: 5, minutes: 30 },
      { weekday: 6, minutes: 50 },
    ],
  },
};

function testEnv(overrides: Partial<Env> = {}): Env {
  return {
    RUNTIME: "node",
    SERVE_STATIC: "false",
    WEB_DIST: "",
    APP_ORIGIN: ORIGIN,
    BETTER_AUTH_URL: ORIGIN,
    BETTER_AUTH_SECRET: "test-secret-that-is-long-enough",
    DATABASE_PATH: ":memory:",
    LOG_LEVEL: "error",
    PORT: 8787,
    REGISTER_INVITE_CODE: INVITE,
    ALLOW_WORKER_PASSWORD_AUTH: "false",
    SMTP_URL: "",
    SMTP_FROM: "",
    HEALTH_SAMPLE_RETENTION_DAYS: 30,
    AUDIT_RETENTION_DAYS: 90,
    MAX_IMPORT_SAMPLES_PER_DAY: 5000,
    FEATURE_WEB_BLUETOOTH: "false",
    FEATURE_PUSH: "false",
    ...overrides,
  };
}

function countTable(sqlite: Database.Database, table: string): number {
  const row = sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number };
  return row.n;
}

function makeHarness() {
  const sqlite = new Database(":memory:");
  migrate(sqlite);
  const db = createNodeDb(sqlite);
  const env = testEnv();
  const auth = createAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    appOrigin: env.APP_ORIGIN,
    db: db.orm,
    disableRateLimit: true,
  });
  const app = createApp({ env, db, auth, version: "0.0.0" });
  return { app, sqlite, env };
}

function cookieHeader(res: Response): string {
  return res.headers
    .getSetCookie()
    .map((part) => part.split(";")[0]?.trim())
    .filter((part): part is string => Boolean(part))
    .join("; ");
}

async function signUp(
  app: ReturnType<typeof createApp>,
  body: unknown = validRegister,
): Promise<Response> {
  return app.request(`${ORIGIN}/api/v1/auth/sign-up/email`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: ORIGIN,
    },
    body: JSON.stringify(body),
  });
}

async function authedSession(app: ReturnType<typeof createApp>): Promise<{
  cookie: string;
  userId: string;
}> {
  const res = await signUp(app);
  expect(res.status).toBe(200);
  const cookie = cookieHeader(res);
  const me = await app.request(`${ORIGIN}/api/v1/me`, {
    headers: { cookie, origin: ORIGIN },
  });
  expect(me.status).toBe(200);
  const body = (await me.json()) as { userId: string };
  return { cookie, userId: body.userId };
}

function jsonHeaders(cookie: string): Record<string, string> {
  return {
    "content-type": "application/json",
    origin: ORIGIN,
    cookie,
  };
}

const openDbs: Database.Database[] = [];

function openHarness() {
  const harness = makeHarness();
  openDbs.push(harness.sqlite);
  return harness;
}

afterEach(() => {
  while (openDbs.length > 0) {
    openDbs.pop()?.close();
  }
});

describe("onboarding and plan gates", () => {
  it("rejects pregnancy with 403, writes profile shell, and inserts no goal/habit/plan rows", async () => {
    const { app, sqlite } = openHarness();
    const { cookie } = await authedSession(app);
    const res = await app.request(`${ORIGIN}/api/v1/onboarding`, {
      method: "PUT",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({
        ...validOnboarding,
        parq: { ...validOnboarding.parq, pregnancy: true },
      }),
    });
    expect(res.status).toBe(403);
    const json = (await res.json()) as {
      error: { code: string; message: string };
      actions: string[];
    };
    expect(json.error.code).toBe("PREGNANCY_HARD_STOP");
    expect(json.error.message).toBe(
      "Arise is not appropriate during pregnancy. See a clinician for prenatal exercise guidance.",
    );
    expect(json.actions).toEqual(["deleteAccount"]);
    expect(countTable(sqlite, "profiles")).toBe(1);
    expect(countTable(sqlite, "goals")).toBe(0);
    expect(countTable(sqlite, "habit_profiles")).toBe(0);
    expect(countTable(sqlite, "plans")).toBe(0);
    expect(countTable(sqlite, "plan_days")).toBe(0);
    const profile = sqlite
      .prepare("SELECT onboarding_status, parq_clear, age, time_zone FROM profiles")
      .get() as {
      onboarding_status: string;
      parq_clear: number;
      age: number;
      time_zone: string;
    };
    expect(profile).toEqual({
      onboarding_status: "blocked_pregnancy",
      parq_clear: 0,
      age: 29,
      time_zone: "Europe/Stockholm",
    });
  });

  it("rejects implied fat-loss above 1% BW/week with UNSAFE_LOSS_RATE and maxKgPerWeek", async () => {
    const { app, sqlite } = openHarness();
    const { cookie } = await authedSession(app);
    const res = await app.request(`${ORIGIN}/api/v1/onboarding`, {
      method: "PUT",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({
        ...validOnboarding,
        profile: { ...validOnboarding.profile, weightKg: 80 },
        goal: {
          type: "fat_loss",
          targetWeightKg: 70,
          targetDate: utcDateOffset(14),
        },
      }),
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as {
      error: { code: string; details: { maxKgPerWeek: number } };
    };
    expect(json.error.code).toBe("UNSAFE_LOSS_RATE");
    expect(json.error.details.maxKgPerWeek).toBe(0.8);
    expect(countTable(sqlite, "profiles")).toBe(0);
    expect(countTable(sqlite, "goals")).toBe(0);
    expect(countTable(sqlite, "plans")).toBe(0);
  });

  it("preview writes 0 rows (plans and goals unchanged)", async () => {
    const { app, sqlite } = openHarness();
    const { cookie } = await authedSession(app);
    const before = {
      plans: countTable(sqlite, "plans"),
      goals: countTable(sqlite, "goals"),
      profiles: countTable(sqlite, "profiles"),
      habits: countTable(sqlite, "habit_profiles"),
      days: countTable(sqlite, "plan_days"),
    };
    const res = await app.request(`${ORIGIN}/api/v1/plan/preview`, {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: JSON.stringify(validOnboarding),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { plan: { version: number }; days: unknown[] };
    expect(json.plan.version).toBe(1);
    expect(json.days).toHaveLength(7);
    expect(countTable(sqlite, "plans")).toBe(before.plans);
    expect(countTable(sqlite, "goals")).toBe(before.goals);
    expect(countTable(sqlite, "profiles")).toBe(before.profiles);
    expect(countTable(sqlite, "habit_profiles")).toBe(before.habits);
    expect(countTable(sqlite, "plan_days")).toBe(before.days);
  });

  it("PUT success returns plan, days, and profile and persists 7 plan days", async () => {
    const { app, sqlite } = openHarness();
    const { cookie, userId } = await authedSession(app);
    const res = await app.request(`${ORIGIN}/api/v1/onboarding`, {
      method: "PUT",
      headers: jsonHeaders(cookie),
      body: JSON.stringify(validOnboarding),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      plan: { id: string; userId: string; version: number };
      days: Array<{ localDate: string; hardAllowed: boolean }>;
      profile: { userId: string; onboardingStatus: string; parqClear: boolean };
    };
    expect(json.plan.userId).toBe(userId);
    expect(json.plan.version).toBe(1);
    expect(json.days).toHaveLength(7);
    expect(json.profile).toMatchObject({
      userId,
      onboardingStatus: "complete",
      parqClear: true,
    });
    expect(countTable(sqlite, "profiles")).toBe(1);
    expect(countTable(sqlite, "goals")).toBe(1);
    expect(countTable(sqlite, "habit_profiles")).toBe(1);
    expect(countTable(sqlite, "plans")).toBe(1);
    expect(countTable(sqlite, "plan_days")).toBe(7);
    const stored = sqlite
      .prepare(
        `SELECT onboarding_status, job_activity, commute_walk_minutes, sleep_start, sleep_end
           FROM profiles p
           JOIN habit_profiles h ON h.user_id = p.user_id`,
      )
      .get() as {
      onboarding_status: string;
      job_activity: string;
      commute_walk_minutes: number;
      sleep_start: string;
      sleep_end: string;
    };
    expect(stored).toEqual({
      onboarding_status: "complete",
      job_activity: "sedentary",
      commute_walk_minutes: 15,
      sleep_start: "23:00",
      sleep_end: "07:00",
    });
    expect(json.days.some((d) => d.hardAllowed)).toBe(true);
  });

  it("returns 409 ONBOARDING_REQUIRED on GET /me/today before onboarding", async () => {
    const { app } = openHarness();
    const { cookie } = await authedSession(app);
    const res = await app.request(`${ORIGIN}/api/v1/me/today`, {
      headers: { cookie, origin: ORIGIN },
    });
    expect(res.status).toBe(409);
    const json = (await res.json()) as {
      error: { code: string };
      needsOnboarding: boolean;
    };
    expect(json.error.code).toBe("ONBOARDING_REQUIRED");
    expect(json.needsOnboarding).toBe(true);
  });

  it("returns 400 VALIDATION when disclaimer is not true or Zod fails", async () => {
    const { app } = openHarness();
    const { cookie } = await authedSession(app);
    const disclaimer = await app.request(`${ORIGIN}/api/v1/onboarding`, {
      method: "PUT",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ ...validOnboarding, acceptedMedicalDisclaimer: false }),
    });
    expect(disclaimer.status).toBe(400);
    expect(((await disclaimer.json()) as { error: { code: string } }).error.code).toBe(
      "VALIDATION",
    );

    const zodFail = await app.request(`${ORIGIN}/api/v1/onboarding`, {
      method: "PUT",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({
        ...validOnboarding,
        habit: { ...validOnboarding.habit, week: [] },
      }),
    });
    expect(zodFail.status).toBe(400);
    expect(((await zodFail.json()) as { error: { code: string } }).error.code).toBe("VALIDATION");
  });

  it("returns 400 AGE_RESTRICTED when onboarding age is under 16", async () => {
    const { app, sqlite } = openHarness();
    const { cookie } = await authedSession(app);
    const res = await app.request(`${ORIGIN}/api/v1/onboarding`, {
      method: "PUT",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({
        ...validOnboarding,
        profile: { ...validOnboarding.profile, age: 15 },
      }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("AGE_RESTRICTED");
    expect(countTable(sqlite, "profiles")).toBe(0);
  });

  it("other PAR-Q yes still creates a plan with parq_clear=false and no hard days", async () => {
    const { app, sqlite } = openHarness();
    const { cookie } = await authedSession(app);
    const res = await app.request(`${ORIGIN}/api/v1/onboarding`, {
      method: "PUT",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({
        ...validOnboarding,
        parq: { ...validOnboarding.parq, chestPain: true },
      }),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      days: Array<{ hardAllowed: boolean; isGate: boolean }>;
      profile: { parqClear: boolean };
    };
    expect(json.profile.parqClear).toBe(false);
    expect(json.days.every((d) => d.hardAllowed === false && d.isGate === false)).toBe(true);
    const row = sqlite.prepare("SELECT parq_clear FROM profiles").get() as { parq_clear: number };
    expect(row.parq_clear).toBe(0);
    const hard = sqlite.prepare("SELECT COUNT(*) AS n FROM plan_days WHERE hard_allowed = 1").get() as {
      n: number;
    };
    expect(hard.n).toBe(0);
  });

  it("GET /plan returns the active plan after onboarding", async () => {
    const { app } = openHarness();
    const { cookie } = await authedSession(app);
    const put = await app.request(`${ORIGIN}/api/v1/onboarding`, {
      method: "PUT",
      headers: jsonHeaders(cookie),
      body: JSON.stringify(validOnboarding),
    });
    expect(put.status).toBe(200);
    const created = (await put.json()) as { plan: { id: string } };
    const res = await app.request(`${ORIGIN}/api/v1/plan`, {
      headers: { cookie, origin: ORIGIN },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { plan: { id: string; version: number }; days: unknown[] };
    expect(json.plan.id).toBe(created.plan.id);
    expect(json.plan.version).toBe(1);
    expect(json.days).toHaveLength(7);
  });

  it("regenerate increments version, archives the old plan, and reissues only all-issued today", async () => {
    const { app, sqlite } = openHarness();
    const { cookie, userId } = await authedSession(app);
    const put = await app.request(`${ORIGIN}/api/v1/onboarding`, {
      method: "PUT",
      headers: jsonHeaders(cookie),
      body: JSON.stringify(validOnboarding),
    });
    expect(put.status).toBe(200);
    const created = (await put.json()) as { plan: { id: string; version: number } };

    const regen = await app.request(`${ORIGIN}/api/v1/plan/regenerate`, {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ reason: "schedule_change" }),
    });
    expect(regen.status).toBe(200);
    const regenerated = (await regen.json()) as { plan: { id: string; version: number }; days: unknown[] };
    expect(regenerated.plan.id).not.toBe(created.plan.id);
    expect(regenerated.plan.version).toBe(2);
    expect(regenerated.days).toHaveLength(7);

    const plans = sqlite
      .prepare("SELECT id, version, archived_at FROM plans ORDER BY version")
      .all() as Array<{ id: string; version: number; archived_at: string | null }>;
    expect(plans).toHaveLength(2);
    expect(plans[0]?.id).toBe(created.plan.id);
    expect(plans[0]?.archived_at).not.toBeNull();
    expect(plans[1]?.archived_at).toBeNull();
    expect(countTable(sqlite, "plan_days")).toBe(14);

    const today = localDate(new Date(), validOnboarding.profile.timeZone);
    const yesterday = addCalendarDays(today, -1);
    const nowIso = new Date().toISOString();
    sqlite
      .prepare(
        `INSERT INTO daily_quests (
            id, user_id, local_date, template_id, title, flavor, kind, status,
            prescription_json, xp_reward, stat_delta_json, auto_completable,
            source, idempotency_key, created_at, updated_at
          ) VALUES (?, ?, ?, 'habit_sleep_window', 'Sleep', 'Rest', 'habit', 'completed',
            '{"blocks":[],"estimatedMinutes":0,"intensity":"rest"}', 20, '{}', 1,
            'issuer', ?, ?, ?)`,
      )
      .run("01HISTORICALQUEST000000001", userId, yesterday, `${userId}:${yesterday}:hist`, nowIso, nowIso);
    sqlite
      .prepare(
        `INSERT INTO daily_quests (
            id, user_id, local_date, template_id, title, flavor, kind, status,
            prescription_json, xp_reward, stat_delta_json, auto_completable,
            source, idempotency_key, created_at, updated_at
          ) VALUES (?, ?, ?, 'habit_sleep_window', 'Sleep', 'Rest', 'habit', 'issued',
            '{"blocks":[],"estimatedMinutes":0,"intensity":"rest"}', 20, '{}', 1,
            'issuer', ?, ?, ?)`,
      )
      .run("01TODAYISSUEDQUEST00000001", userId, today, `${userId}:${today}:issued`, nowIso, nowIso);
    sqlite
      .prepare(
        `INSERT INTO issuance_ledger (user_id, local_date, plan_id, created_at) VALUES (?, ?, ?, ?)`,
      )
      .run(userId, today, regenerated.plan.id, nowIso);

    const regenIssued = await app.request(`${ORIGIN}/api/v1/plan/regenerate`, {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ reason: "schedule_change" }),
    });
    expect(regenIssued.status).toBe(200);
    expect(
      sqlite.prepare("SELECT COUNT(*) AS n FROM daily_quests WHERE local_date = ?").get(today),
    ).toEqual({ n: 0 });
    expect(
      sqlite.prepare("SELECT COUNT(*) AS n FROM issuance_ledger WHERE local_date = ?").get(today),
    ).toEqual({ n: 0 });
    expect(
      sqlite.prepare("SELECT COUNT(*) AS n FROM daily_quests WHERE local_date = ?").get(yesterday),
    ).toEqual({ n: 1 });
  });

  it("GET /me/today is 409 PREGNANCY_HARD_STOP after a pregnancy shell", async () => {
    const { app } = openHarness();
    const { cookie } = await authedSession(app);
    const put = await app.request(`${ORIGIN}/api/v1/onboarding`, {
      method: "PUT",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({
        ...validOnboarding,
        parq: { ...validOnboarding.parq, pregnancy: true },
      }),
    });
    expect(put.status).toBe(403);

    const today = await app.request(`${ORIGIN}/api/v1/me/today`, {
      headers: { cookie, origin: ORIGIN },
    });
    expect(today.status).toBe(409);
    const json = (await today.json()) as { error: { code: string }; actions: string[] };
    expect(json.error.code).toBe("PREGNANCY_HARD_STOP");
    expect(json.actions).toEqual(["deleteAccount"]);

    const ensure = await app.request(`${ORIGIN}/api/v1/me/today/ensure`, {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({}),
    });
    expect(ensure.status).toBe(409);
    expect(((await ensure.json()) as { error: { code: string } }).error.code).toBe(
      "PREGNANCY_HARD_STOP",
    );
  });

  it("GET /me/today after complete onboarding is read-only with needsEnsure", async () => {
    const { app, sqlite } = openHarness();
    const { cookie } = await authedSession(app);
    const put = await app.request(`${ORIGIN}/api/v1/onboarding`, {
      method: "PUT",
      headers: jsonHeaders(cookie),
      body: JSON.stringify(validOnboarding),
    });
    expect(put.status).toBe(200);
    const before = {
      quests: countTable(sqlite, "daily_quests"),
      ledger: countTable(sqlite, "issuance_ledger"),
      plans: countTable(sqlite, "plans"),
      changes: (sqlite.prepare("SELECT total_changes() AS n").get() as { n: number }).n,
    };
    const res = await app.request(`${ORIGIN}/api/v1/me/today`, {
      headers: { cookie, origin: ORIGIN },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    const json = (await res.json()) as {
      needsEnsure: boolean;
      quests: unknown[];
      disclaimer: string;
      player: { stats: { intl: number }; level: number };
      pendingModifiers: unknown[];
      suggestRegenerate: boolean;
    };
    expect(json.needsEnsure).toBe(true);
    expect(json.quests).toEqual([]);
    expect(json.disclaimer).toBe(
      "Arise is not a medical device. Stop if you feel pain, chest pressure, or faintness.",
    );
    expect(json.player.stats.intl).toBe(10);
    expect(json.player.stats).not.toHaveProperty("int");
    expect(json.player.level).toBe(1);
    expect(json.pendingModifiers).toEqual([]);
    expect(json.suggestRegenerate).toBe(false);
    expect(countTable(sqlite, "daily_quests")).toBe(before.quests);
    expect(countTable(sqlite, "issuance_ledger")).toBe(before.ledger);
    expect(countTable(sqlite, "plans")).toBe(before.plans);
    expect((sqlite.prepare("SELECT total_changes() AS n").get() as { n: number }).n).toBe(
      before.changes,
    );
  });

  it("returns 409 ONBOARDING_REQUIRED for a pending profile shell", async () => {
    const { app, sqlite } = openHarness();
    const { cookie, userId } = await authedSession(app);
    sqlite
      .prepare(
        `INSERT INTO profiles (user_id, age, time_zone, created_at, updated_at)
         VALUES (?, 29, 'Europe/Stockholm', ?, ?)`,
      )
      .run(userId, new Date().toISOString(), new Date().toISOString());
    const res = await app.request(`${ORIGIN}/api/v1/me/today`, {
      headers: { cookie, origin: ORIGIN },
    });
    expect(res.status).toBe(409);
    const json = (await res.json()) as { error: { code: string }; needsOnboarding: boolean };
    expect(json.error.code).toBe("ONBOARDING_REQUIRED");
    expect(json.needsOnboarding).toBe(true);
  });

  it("preview pregnancy is 403 with 0 writes", async () => {
    const { app, sqlite } = openHarness();
    const { cookie } = await authedSession(app);
    const res = await app.request(`${ORIGIN}/api/v1/plan/preview`, {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({
        ...validOnboarding,
        parq: { ...validOnboarding.parq, pregnancy: true },
      }),
    });
    expect(res.status).toBe(403);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      "PREGNANCY_HARD_STOP",
    );
    expect(countTable(sqlite, "profiles")).toBe(0);
    expect(countTable(sqlite, "plans")).toBe(0);
    expect(countTable(sqlite, "goals")).toBe(0);
  });

  it("requires a session for onboarding and plan routes", async () => {
    const { app } = openHarness();
    const put = await app.request(`${ORIGIN}/api/v1/onboarding`, {
      method: "PUT",
      headers: { "content-type": "application/json", origin: ORIGIN },
      body: JSON.stringify(validOnboarding),
    });
    expect(put.status).toBe(401);
    const preview = await app.request(`${ORIGIN}/api/v1/plan/preview`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: ORIGIN },
      body: JSON.stringify(validOnboarding),
    });
    expect(preview.status).toBe(401);
    const plan = await app.request(`${ORIGIN}/api/v1/plan`, {
      headers: { origin: ORIGIN },
    });
    expect(plan.status).toBe(401);
  });

  it("rejects v1.1 auto-regenerate reasons", async () => {
    const { app } = openHarness();
    const { cookie } = await authedSession(app);
    const put = await app.request(`${ORIGIN}/api/v1/onboarding`, {
      method: "PUT",
      headers: jsonHeaders(cookie),
      body: JSON.stringify(validOnboarding),
    });
    expect(put.status).toBe(200);
    const res = await app.request(`${ORIGIN}/api/v1/plan/regenerate`, {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ reason: "skip_pattern" }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("VALIDATION");
  });
});
