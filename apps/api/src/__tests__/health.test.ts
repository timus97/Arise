import { createNodeDb, migrate } from "@arise/db";
import { localDate } from "@arise/engine";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { createAuth } from "../auth.js";
import type { Env } from "../env.js";
import { lastHealthPersistStatements } from "../routes/health.js";

const ORIGIN = "http://localhost:5173";
const INVITE = "test-invite-code";
const TZ = "Europe/Stockholm";

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
    timeZone: TZ,
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

function makeHarness(envOverrides: Partial<Env> = {}) {
  const sqlite = new Database(":memory:");
  migrate(sqlite);
  const db = createNodeDb(sqlite);
  const env = testEnv(envOverrides);
  const auth = createAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    appOrigin: env.APP_ORIGIN,
    db: db.orm,
    disableRateLimit: true,
  });
  const app = createApp({ env, db, auth, version: "0.0.0" });
  return { app, sqlite, env, db };
}

function cookieHeader(res: Response): string {
  return res.headers
    .getSetCookie()
    .map((part) => part.split(";")[0]?.trim())
    .filter((part): part is string => Boolean(part))
    .join("; ");
}

function jsonHeaders(cookie: string): Record<string, string> {
  return {
    "content-type": "application/json",
    origin: ORIGIN,
    cookie,
  };
}

function countTable(sqlite: Database.Database, table: string): number {
  const row = sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number };
  return row.n;
}

const openDbs: Database.Database[] = [];

function openHarness(envOverrides: Partial<Env> = {}) {
  const harness = makeHarness(envOverrides);
  openDbs.push(harness.sqlite);
  return harness;
}

afterEach(() => {
  while (openDbs.length > 0) {
    openDbs.pop()?.close();
  }
});

async function signUp(
  app: ReturnType<typeof createApp>,
  body: unknown = validRegister,
): Promise<Response> {
  return app.request(`${ORIGIN}/api/v1/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN },
    body: JSON.stringify(body),
  });
}

async function onboardedSession(
  app: ReturnType<typeof createApp>,
  register: Partial<typeof validRegister> = {},
): Promise<{ cookie: string; userId: string }> {
  const res = await signUp(app, {
    ...validRegister,
    ...register,
    email: register.email ?? `p${Math.random().toString(16).slice(2)}@example.com`,
    username: register.username ?? `u_${Math.random().toString(16).slice(2, 10)}`,
  });
  expect(res.status).toBe(200);
  const cookie = cookieHeader(res);
  const me = await app.request(`${ORIGIN}/api/v1/me`, {
    headers: { cookie, origin: ORIGIN },
  });
  expect(me.status).toBe(200);
  const userId = ((await me.json()) as { userId: string }).userId;
  const put = await app.request(`${ORIGIN}/api/v1/onboarding`, {
    method: "PUT",
    headers: jsonHeaders(cookie),
    body: JSON.stringify(validOnboarding),
  });
  expect(put.status).toBe(200);
  return { cookie, userId };
}

function stepSample(over: { startAt: string; endAt: string; value: number; source?: "csv" | "manual" }) {
  return {
    source: over.source ?? ("csv" as const),
    metric: "steps" as const,
    value: over.value,
    unit: "count",
    startAt: over.startAt,
    endAt: over.endAt,
  };
}

function insertStepsQuest(
  sqlite: Database.Database,
  args: { id: string; userId: string; localDate: string; predicate?: number },
): void {
  const nowIso = new Date().toISOString();
  const target = args.predicate ?? 6000;
  sqlite
    .prepare(
      `INSERT INTO daily_quests (
          id, user_id, local_date, template_id, title, flavor, kind, status,
          prescription_json, xp_reward, stat_delta_json, auto_completable,
          health_predicate_json, source, idempotency_key, modifiers_applied_json,
          created_at, updated_at
        ) VALUES (?, ?, ?, 'steps_6k', 'Six Thousand Steps', 'f', 'steps', 'issued',
          ?, 30, '{"sta":0.2}', 1, ?, 'issuer', ?, '[]', ?, ?)`,
    )
    .run(
      args.id,
      args.userId,
      args.localDate,
      JSON.stringify({
        blocks: [{ name: "Steps", steps: target, rpeMax: 3 }],
        estimatedMinutes: 0,
        intensity: "easy",
      }),
      JSON.stringify({ metric: "steps", op: "gte", value: target }),
      `${args.userId}:${args.localDate}:steps_6k`,
      nowIso,
      nowIso,
    );
}

describe("health ingest consent summaries", () => {
  it("returns 401 on POST /api/v1/health/samples without a session", async () => {
    const { app } = openHarness();
    const res = await app.request(`${ORIGIN}/api/v1/health/samples`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: ORIGIN },
      body: JSON.stringify({ consent: true, samples: [] }),
    });
    expect(res.status).toBe(401);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("UNAUTHORIZED");
  });

  it("first ingest without consent is 403 HEALTH_CONSENT_REQUIRED and writes 0 samples", async () => {
    const { app, sqlite } = openHarness();
    const { cookie } = await onboardedSession(app);
    const day = "2026-08-14";
    const res = await app.request(`${ORIGIN}/api/v1/health/samples`, {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({
        samples: [stepSample({ startAt: `${day}T00:00:00.000Z`, endAt: `${day}T20:00:00.000Z`, value: 100 })],
      }),
    });
    expect(res.status).toBe(403);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      "HEALTH_CONSENT_REQUIRED",
    );
    expect(countTable(sqlite, "health_samples")).toBe(0);
    const consent = sqlite.prepare("SELECT health_consent_at FROM profiles").get() as {
      health_consent_at: string | null;
    };
    expect(consent.health_consent_at).toBeNull();
  });

  it("consent:true on the first call persists; later calls omit consent", async () => {
    const { app, sqlite } = openHarness();
    const { cookie } = await onboardedSession(app);
    const day = "2026-08-14";
    const first = await app.request(`${ORIGIN}/api/v1/health/samples`, {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({
        consent: true,
        samples: [stepSample({ startAt: `${day}T00:00:00.000Z`, endAt: `${day}T08:00:00.000Z`, value: 100 })],
      }),
    });
    expect(first.status).toBe(200);
    const consent = sqlite.prepare("SELECT health_consent_at FROM profiles").get() as {
      health_consent_at: string | null;
    };
    expect(consent.health_consent_at).toBeTruthy();

    const second = await app.request(`${ORIGIN}/api/v1/health/samples`, {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({
        samples: [stepSample({ startAt: `${day}T09:00:00.000Z`, endAt: `${day}T12:00:00.000Z`, value: 50 })],
      }),
    });
    expect(second.status).toBe(200);
    expect(countTable(sqlite, "health_samples")).toBe(2);
  });

  it("ingests 200 rows as 201 written (samples + one summary) and stays within persist budget", async () => {
    const { app, sqlite } = openHarness();
    const { cookie, userId } = await onboardedSession(app);
    const day = "2026-08-14";
    sqlite
      .prepare(
        `INSERT INTO daily_summaries (user_id, local_date, steps, hard_bouts, recovery_score, updated_at)
         VALUES (?, ?, 0, 4, 72, ?)`,
      )
      .run(userId, day, new Date().toISOString());

    const samples = Array.from({ length: 200 }, (_, i) => {
      const hour = String(Math.floor(i / 10)).padStart(2, "0");
      const min = String((i % 10) * 6).padStart(2, "0");
      return stepSample({
        startAt: `${day}T${hour}:${min}:00.000Z`,
        endAt: `${day}T${hour}:${min}:30.000Z`,
        value: 10,
      });
    });
    const res = await app.request(`${ORIGIN}/api/v1/health/samples`, {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ consent: true, samples }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ingested: number; dropped: number };
    expect(body.ingested).toBe(200);
    expect(body.dropped).toBe(0);
    expect(countTable(sqlite, "health_samples")).toBe(200);
    expect(countTable(sqlite, "daily_summaries")).toBe(1);
    expect(countTable(sqlite, "health_samples") + countTable(sqlite, "daily_summaries")).toBe(201);
    expect(lastHealthPersistStatements).toBeLessThanOrEqual(6);

    const summary = sqlite
      .prepare(`SELECT steps, hard_bouts, recovery_score FROM daily_summaries WHERE user_id = ?`)
      .get(userId) as { steps: number; hard_bouts: number; recovery_score: number };
    expect(summary.steps).toBe(2000);
    expect(summary.hard_bouts).toBe(4);
    expect(summary.recovery_score).toBe(72);
  });

  it("rejects the 201st sample with VALIDATION", async () => {
    const { app, sqlite } = openHarness();
    const { cookie } = await onboardedSession(app);
    const day = "2026-08-14";
    const samples = Array.from({ length: 201 }, (_, i) =>
      stepSample({
        startAt: `${day}T00:00:${String(i).padStart(2, "0")}.000Z`,
        endAt: `${day}T00:00:${String(i).padStart(2, "0")}.500Z`,
        value: 1,
      }),
    );
    const res = await app.request(`${ORIGIN}/api/v1/health/samples`, {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ consent: true, samples }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("VALIDATION");
    expect(countTable(sqlite, "health_samples")).toBe(0);
  });

  it("persists new modifiers only and does not shrink twice", async () => {
    const { app, sqlite } = openHarness();
    const { cookie, userId } = await onboardedSession(app);
    const today = localDate(new Date(), TZ);
    insertStepsQuest(sqlite, { id: "01STEPQUEST00000000000001", userId, localDate: today });

    const payload = {
      consent: true,
      samples: [
        stepSample({
          startAt: `${today}T12:00:00.000Z`,
          endAt: `${today}T18:00:00.000Z`,
          value: 4000,
        }),
      ],
    };
    const first = await app.request(`${ORIGIN}/api/v1/health/samples`, {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: JSON.stringify(payload),
    });
    expect(first.status).toBe(200);

    const afterFirst = sqlite
      .prepare(`SELECT modifiers_applied_json, health_predicate_json, prescription_json FROM daily_quests WHERE id = ?`)
      .get("01STEPQUEST00000000000001") as {
      modifiers_applied_json: string;
      health_predicate_json: string;
      prescription_json: string;
    };
    expect(JSON.parse(afterFirst.modifiers_applied_json)).toEqual(["steps_residual"]);
    expect(JSON.parse(afterFirst.health_predicate_json)).toEqual({
      metric: "steps",
      op: "gte",
      value: 2000,
    });
    expect(JSON.parse(afterFirst.prescription_json).blocks).toEqual([
      { name: "Remaining steps", steps: 2000, rpeMax: 3 },
    ]);

    const second = await app.request(`${ORIGIN}/api/v1/health/samples`, {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ samples: payload.samples }),
    });
    expect(second.status).toBe(200);
    expect(((await second.json()) as { ingested: number }).ingested).toBe(0);

    const afterSecond = sqlite
      .prepare(`SELECT modifiers_applied_json, health_predicate_json FROM daily_quests WHERE id = ?`)
      .get("01STEPQUEST00000000000001") as {
      modifiers_applied_json: string;
      health_predicate_json: string;
    };
    expect(JSON.parse(afterSecond.modifiers_applied_json)).toEqual(["steps_residual"]);
    expect(JSON.parse(afterSecond.health_predicate_json)).toEqual({
      metric: "steps",
      op: "gte",
      value: 2000,
    });
    expect(countTable(sqlite, "health_samples")).toBe(1);
  });

  it("POST /health/manual is sugar for one sample", async () => {
    const { app, sqlite } = openHarness();
    const { cookie } = await onboardedSession(app);
    const res = await app.request(`${ORIGIN}/api/v1/health/manual`, {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({
        consent: true,
        metric: "sleep_minutes",
        value: 410,
        unit: "min",
        startAt: "2026-08-13T22:00:00.000Z",
        endAt: "2026-08-14T06:50:00.000Z",
      }),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ingested: number; summaries: Array<{ sleepMinutes: number | null }> };
    expect(json.ingested).toBe(1);
    expect(json.summaries[0]?.sleepMinutes).toBe(410);
    const row = sqlite.prepare("SELECT source, metric FROM health_samples").get() as {
      source: string;
      metric: string;
    };
    expect(row).toEqual({ source: "manual", metric: "sleep_minutes" });
  });

  it("GET /health/summary?from&to returns DailySummary[]", async () => {
    const { app } = openHarness();
    const { cookie } = await onboardedSession(app);
    const ingest = await app.request(`${ORIGIN}/api/v1/health/samples`, {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({
        consent: true,
        samples: [
          stepSample({
            startAt: "2026-08-14T00:00:00.000Z",
            endAt: "2026-08-14T20:00:00.000Z",
            value: 8421,
          }),
        ],
      }),
    });
    expect(ingest.status).toBe(200);

    const res = await app.request(
      `${ORIGIN}/api/v1/health/summary?from=2026-08-13&to=2026-08-15`,
      { headers: { cookie, origin: ORIGIN } },
    );
    expect(res.status).toBe(200);
    const list = (await res.json()) as Array<{
      localDate: string;
      steps: number | null;
      hardBouts: number;
      userId: string;
    }>;
    expect(Array.isArray(list)).toBe(true);
    expect(list).toHaveLength(1);
    expect(list[0]?.localDate).toBe("2026-08-14");
    expect(list[0]?.steps).toBe(8421);
    expect(list[0]?.hardBouts).toBe(0);
    expect(list[0]?.userId).toBeTruthy();
  });

  it("GET /health ops stays no-DB 30/min and does not touch rate_limits", async () => {
    const { app, sqlite } = openHarness();
    const before = countTable(sqlite, "rate_limits");
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, runtime: "node", version: "0.0.0" });
    expect(countTable(sqlite, "rate_limits")).toBe(before);
  });

  it("health ingest uses rate_limits (not Better Auth memory)", async () => {
    const { app, sqlite } = openHarness({ MAX_IMPORT_SAMPLES_PER_DAY: 2 });
    const { cookie } = await onboardedSession(app);
    const day = "2026-08-14";
    const ok = await app.request(`${ORIGIN}/api/v1/health/samples`, {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({
        consent: true,
        samples: [stepSample({ startAt: `${day}T00:00:00.000Z`, endAt: `${day}T01:00:00.000Z`, value: 10 })],
      }),
    });
    expect(ok.status).toBe(200);
    expect(countTable(sqlite, "rate_limits")).toBe(1);

    const blocked = await app.request(`${ORIGIN}/api/v1/health/samples`, {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({
        samples: [
          stepSample({ startAt: `${day}T02:00:00.000Z`, endAt: `${day}T03:00:00.000Z`, value: 10 }),
          stepSample({ startAt: `${day}T04:00:00.000Z`, endAt: `${day}T05:00:00.000Z`, value: 10 }),
        ],
      }),
    });
    expect(blocked.status).toBe(429);
    expect(((await blocked.json()) as { error: { code: string } }).error.code).toBe("RATE_LIMITED");
    expect(countTable(sqlite, "health_samples")).toBe(1);
  });
});
