import { createNodeDb, migrate } from "@arise/db";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { createAuth } from "../auth.js";
import { parseResetArgs, resetPassword } from "../cli/reset-password.js";
import type { Env } from "../env.js";
import { addCalendarDaysIso, resetEnsureDogfood } from "../today-service.js";

const ORIGIN = "http://localhost:5173";
const INVITE = "test-invite-code";
const TZ = "Europe/Stockholm";
const STATS = '{"str":10,"agi":10,"vit":10,"intl":10,"sta":10}';

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

function countForUser(sqlite: Database.Database, table: string, userId: string): number {
  const row = sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE user_id = ?`).get(userId) as {
    n: number;
  };
  return row.n;
}

const openDbs: Database.Database[] = [];

function openHarness(envOverrides: Partial<Env> = {}) {
  const harness = makeHarness(envOverrides);
  openDbs.push(harness.sqlite);
  return harness;
}

afterEach(() => {
  resetEnsureDogfood();
  while (openDbs.length > 0) {
    openDbs.pop()?.close();
  }
});

async function signUp(
  app: ReturnType<typeof createApp>,
  body: unknown,
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

async function sessionFor(
  app: ReturnType<typeof createApp>,
  register: Partial<typeof validRegister> = {},
): Promise<{ cookie: string; userId: string; email: string; username: string }> {
  const email = register.email ?? `p${Math.random().toString(16).slice(2)}@example.com`;
  const username = register.username ?? `u_${Math.random().toString(16).slice(2, 10)}`;
  const res = await signUp(app, {
    ...validRegister,
    ...register,
    email,
    username,
  });
  expect(res.status).toBe(200);
  const cookie = cookieHeader(res);
  const me = await app.request(`${ORIGIN}/api/v1/me`, {
    headers: { cookie, origin: ORIGIN },
  });
  expect(me.status).toBe(200);
  const userId = ((await me.json()) as { userId: string }).userId;
  return { cookie, userId, email, username };
}

async function onboardedSession(
  app: ReturnType<typeof createApp>,
  register: Partial<typeof validRegister> = {},
): Promise<{ cookie: string; userId: string; email: string; username: string }> {
  const session = await sessionFor(app, register);
  const put = await app.request(`${ORIGIN}/api/v1/onboarding`, {
    method: "PUT",
    headers: jsonHeaders(session.cookie),
    body: JSON.stringify(validOnboarding),
  });
  expect(put.status).toBe(200);
  return session;
}

function seedUserScopedRows(
  sqlite: Database.Database,
  userId: string,
  localDate: string,
): void {
  const nowIso = new Date().toISOString();
  sqlite
    .prepare(
      `INSERT INTO stat_snapshots (id, user_id, local_date, level, xp, rank, stats_json, created_at)
       VALUES (?, ?, ?, 2, 150, 'E', ?, ?)`,
    )
    .run(`snap_${userId}_${localDate}`, userId, localDate, STATS, nowIso);
  sqlite
    .prepare(
      `INSERT INTO xp_events (id, user_id, quest_id, delta, reason, created_at)
       VALUES (?, ?, NULL, 40, 'complete', ?)`,
    )
    .run(`xp_${userId}`, userId, nowIso);
  sqlite
    .prepare(
      `INSERT INTO rank_events (id, user_id, from_rank, to_rank, reason, created_at)
       VALUES (?, ?, 'E', 'D', 'level', ?)`,
    )
    .run(`rk_${userId}`, userId, nowIso);
  sqlite
    .prepare(
      `INSERT INTO user_effects (id, user_id, kind, starts_at, ends_at, payload_json, created_at)
       VALUES (?, ?, 'pain_no_hard', ?, ?, '{}', ?)`,
    )
    .run(
      `fx_${userId}`,
      userId,
      nowIso,
      new Date(Date.now() + 86_400_000).toISOString(),
      nowIso,
    );
  sqlite
    .prepare(
      `INSERT INTO health_samples (
          id, user_id, source, metric, value, unit, start_at, end_at, dedup_hash, ingested_at
        ) VALUES (?, ?, 'manual', 'steps', 1000, 'count', ?, ?, ?, ?)`,
    )
    .run(`hs_${userId}`, userId, nowIso, nowIso, `dedup_${userId}`, nowIso);
  sqlite
    .prepare(
      `INSERT INTO daily_summaries (
          user_id, local_date, steps, hard_bouts, updated_at
        ) VALUES (?, ?, 1000, 0, ?)`,
    )
    .run(userId, localDate, nowIso);
}

describe("progress export delete CLI", () => {
  it("returns 404 for forget-password when SMTP_URL is unset", async () => {
    const { app } = openHarness();
    const res = await app.request(`${ORIGIN}/api/v1/auth/forget-password`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: ORIGIN },
      body: JSON.stringify({ email: "player@example.com" }),
    });
    expect(res.status).toBe(404);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe("NOT_FOUND");
  });

  it("exports arise-export.json without account.password or other users", async () => {
    const { app, sqlite } = openHarness();
    const a = await onboardedSession(app);
    const b = await sessionFor(app, {
      email: "other@example.com",
      username: "other_user",
      name: "Other Player",
    });
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    seedUserScopedRows(sqlite, a.userId, today);
    seedUserScopedRows(sqlite, b.userId, today);

    const hashRow = sqlite
      .prepare(`SELECT password FROM account WHERE user_id = ?`)
      .get(a.userId) as { password: string };
    expect(hashRow.password.length).toBeGreaterThan(8);

    const res = await app.request(`${ORIGIN}/api/v1/me/export`, {
      headers: { cookie: a.cookie, origin: ORIGIN },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type") ?? "").toMatch(/application\/json/);
    expect(res.headers.get("content-disposition")).toBe(
      'attachment; filename="arise-export.json"',
    );

    const text = await res.text();
    expect(text).not.toContain(hashRow.password);
    expect(text).not.toMatch(/"password"\s*:/);
    expect(text).not.toContain("accounts.password");
    expect(text).not.toContain(b.email);
    expect(text).not.toContain(b.userId);
    expect(text).toContain(a.email);

    const body = JSON.parse(text) as {
      user: { id: string; email: string };
      account: Array<Record<string, unknown>>;
      profiles: Array<Record<string, unknown>>;
      statSnapshots: Array<Record<string, unknown>>;
    };
    expect(body.user.id).toBe(a.userId);
    expect(body.account).toHaveLength(1);
    expect(body.account[0]).not.toHaveProperty("password");
    expect(body.profiles).toHaveLength(1);
    expect(body.statSnapshots).toHaveLength(1);
  });

  it("cascades account delete across user-scoped rows and leaves other users", async () => {
    const { app, sqlite } = openHarness();
    const a = await onboardedSession(app);
    const b = await onboardedSession(app);
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    seedUserScopedRows(sqlite, a.userId, today);
    seedUserScopedRows(sqlite, b.userId, today);

    sqlite
      .prepare(
        `INSERT INTO verification (id, identifier, value, expires_at, created_at, updated_at)
         VALUES ('ver_a', ?, 'tok', ?, ?, ?)`,
      )
      .run(a.email, Date.now() + 60_000, Date.now(), Date.now());

    const del = await app.request(`${ORIGIN}/api/v1/account/delete`, {
      method: "POST",
      headers: jsonHeaders(a.cookie),
    });
    expect(del.status).toBe(200);
    expect(await del.json()).toEqual({ ok: true });

    const userTables = [
      "session",
      "account",
      "profiles",
      "goals",
      "habit_profiles",
      "plans",
      "plan_days",
      "stat_snapshots",
      "xp_events",
      "rank_events",
      "user_effects",
      "health_samples",
      "daily_summaries",
    ];
    for (const table of userTables) {
      expect(countForUser(sqlite, table, a.userId)).toBe(0);
      expect(countForUser(sqlite, table, b.userId)).toBeGreaterThan(0);
    }
    const leftoverUser = sqlite.prepare(`SELECT id FROM user WHERE id = ?`).get(a.userId);
    expect(leftoverUser).toBeUndefined();
    expect(sqlite.prepare(`SELECT id FROM user WHERE id = ?`).get(b.userId)).toBeDefined();
    expect(
      sqlite.prepare(`SELECT id FROM verification WHERE identifier = ?`).get(a.email),
    ).toBeUndefined();

    const setCookie = del.headers.getSetCookie().join("\n").toLowerCase();
    expect(setCookie).toMatch(/arise\.session=/);
    expect(setCookie).toMatch(/max-age=0/);
  });

  it("GET /progress returns last 90 days of snapshots and rank/xp events", async () => {
    const { app, sqlite } = openHarness();
    const { cookie, userId } = await onboardedSession(app);
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const inside = addCalendarDaysIso(today, -10);
    const outside = addCalendarDaysIso(today, -100);
    const nowIso = new Date().toISOString();
    const oldIso = new Date(Date.now() - 100 * 86_400_000).toISOString();

    sqlite
      .prepare(
        `INSERT INTO stat_snapshots (id, user_id, local_date, level, xp, rank, stats_json, created_at)
         VALUES ('in', ?, ?, 3, 200, 'D', ?, ?), ('out', ?, ?, 1, 10, 'E', ?, ?)`,
      )
      .run(userId, inside, STATS, nowIso, userId, outside, STATS, oldIso);
    sqlite
      .prepare(
        `INSERT INTO rank_events (id, user_id, from_rank, to_rank, reason, created_at)
         VALUES ('rk_in', ?, 'E', 'D', 'level', ?), ('rk_out', ?, 'E', 'E', 'level', ?)`,
      )
      .run(userId, nowIso, userId, oldIso);
    sqlite
      .prepare(
        `INSERT INTO xp_events (id, user_id, quest_id, delta, reason, created_at)
         VALUES ('xp_in', ?, NULL, 40, 'complete', ?), ('xp_out', ?, NULL, 10, 'complete', ?)`,
      )
      .run(userId, nowIso, userId, oldIso);

    const res = await app.request(`${ORIGIN}/api/v1/progress`, {
      headers: { cookie, origin: ORIGIN },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      from: string;
      to: string;
      days: number;
      player: { stats: { intl: number }; rank: string };
      snapshots: Array<{ localDate: string }>;
      rankEvents: Array<{ id: string }>;
      xpEvents: Array<{ id: string }>;
    };
    expect(body.days).toBe(90);
    expect(body.to).toBe(today);
    expect(body.from).toBe(addCalendarDaysIso(today, -89));
    expect(body.player.stats.intl).toBe(10);
    expect(body.player).not.toHaveProperty("int");
    expect(body.snapshots.map((s) => s.localDate)).toEqual([inside]);
    expect(body.rankEvents.map((e) => e.id)).toEqual(["rk_in"]);
    expect(body.xpEvents.map((e) => e.id)).toEqual(["xp_in"]);
  });

  it("GET /me/debug returns auth'd dogfood fields after ensure", async () => {
    const { app } = openHarness();
    const { cookie } = await onboardedSession(app);
    const ensure = await app.request(`${ORIGIN}/api/v1/me/today/ensure`, {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: "{}",
    });
    expect(ensure.status).toBe(200);

    const res = await app.request(`${ORIGIN}/api/v1/me/debug`, {
      headers: { cookie, origin: ORIGIN },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      lastEnsureMs: number;
      lastQueryCount: number;
      lastD1Meta: { rowsRead: number; rowsWritten: number; queries: number };
      effects: unknown[];
      recoveryParts: {
        sleep: number;
        restHr: number;
        hrv: number;
        load: number;
        subjective: number;
      };
    };
    expect(typeof body.lastEnsureMs).toBe("number");
    expect(body.lastEnsureMs).toBeGreaterThanOrEqual(0);
    expect(body.lastQueryCount).toBeGreaterThan(0);
    expect(body.lastD1Meta.queries).toBe(body.lastQueryCount);
    expect(body.recoveryParts).toEqual(
      expect.objectContaining({
        sleep: expect.any(Number),
        restHr: expect.any(Number),
        hrv: expect.any(Number),
        load: expect.any(Number),
        subjective: expect.any(Number),
      }),
    );
    expect(Array.isArray(body.effects)).toBe(true);
  });

  it("reset-password CLI hashes a new password that signs in", async () => {
    const { app, db } = openHarness();
    const { email } = await sessionFor(app, {
      email: "cli@example.com",
      username: "cli_user",
      password: "old-password-1",
    });

    const parsed = parseResetArgs(["--identifier", email, "--password", "new-password-9"]);
    expect(parsed).toEqual({ identifier: email, password: "new-password-9" });

    const result = await resetPassword({
      db,
      identifier: "cli_user",
      password: "new-password-9",
    });
    expect(result.identifier).toBe("cli_user");

    const oldSignIn = await app.request(`${ORIGIN}/api/v1/auth/sign-in/email`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: ORIGIN },
      body: JSON.stringify({ email, password: "old-password-1" }),
    });
    expect(oldSignIn.status).not.toBe(200);

    const newSignIn = await app.request(`${ORIGIN}/api/v1/auth/sign-in/email`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: ORIGIN },
      body: JSON.stringify({ email, password: "new-password-9" }),
    });
    expect(newSignIn.status).toBe(200);
    expect(cookieHeader(newSignIn)).toMatch(/arise\.session/);
  });
});
