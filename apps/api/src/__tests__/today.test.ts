import { createNodeDb, migrate } from "@arise/db";
import { addCalendarDays, isoWeekStart, localDate } from "@arise/engine";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { createAuth } from "../auth.js";
import type { Env } from "../env.js";
import { evaluatePenalties } from "../jobs/evaluate-penalties.js";
import { lastQueryBudget } from "../today-service.js";

const ORIGIN = "http://localhost:5173";
const INVITE = "test-invite-code";
const TZ = "Europe/Stockholm";
const DISCLAIMER =
  "Arise is not a medical device. Stop if you feel pain, chest pressure, or faintness.";

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

function testEnv(): Env {
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
  };
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

function totalChanges(sqlite: Database.Database): number {
  return (sqlite.prepare("SELECT total_changes() AS n").get() as { n: number }).n;
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

type TodayBody = {
  date: string;
  needsEnsure: boolean;
  player: {
    level: number;
    xp: number;
    xpToNext: number;
    rank: string;
    title: string;
    stats: { str: number; agi: number; vit: number; intl: number; sta: number };
    streakDays: number;
    penaltyPoints30d: number;
  };
  recoveryScore: number;
  recoveryParts: { sleep: number; restHr: number; hrv: number; load: number; subjective: number };
  planDay: { focus: string; budgetMinutes: number; hardAllowed: boolean; isGate: boolean } | null;
  quests: Array<{ id: string; templateId: string; status: string; xpReward: number; kind: string }>;
  pendingModifiers: unknown[];
  suggestRegenerate: boolean;
  disclaimer: string;
};

function insertQuest(
  sqlite: Database.Database,
  args: {
    id: string;
    userId: string;
    localDate: string;
    status?: string;
    kind?: string;
    templateId?: string;
    xp?: number;
    intensity?: string;
    skipReason?: string | null;
  },
): void {
  const nowIso = new Date().toISOString();
  sqlite
    .prepare(
      `INSERT INTO daily_quests (
          id, user_id, local_date, template_id, title, flavor, kind, status,
          prescription_json, xp_reward, stat_delta_json, auto_completable,
          source, idempotency_key, skip_reason, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'Q', 'f', ?, ?, ?, ?, '{"str":0.2}', 0, 'issuer', ?, ?, ?, ?)`,
    )
    .run(
      args.id,
      args.userId,
      args.localDate,
      args.templateId ?? "habit_sleep_window",
      args.kind ?? "habit",
      args.status ?? "issued",
      JSON.stringify({
        blocks: [{ name: "x", rpeMax: args.intensity === "hard" ? 8 : 4 }],
        estimatedMinutes: 10,
        intensity: args.intensity ?? "easy",
      }),
      args.xp ?? 40,
      `${args.userId}:${args.localDate}:${args.id}`,
      args.skipReason ?? null,
      nowIso,
      nowIso,
    );
}

describe("today ensure complete skip", () => {
  it("GET /me/today is 401 without a session", async () => {
    const { app } = openHarness();
    const res = await app.request(`${ORIGIN}/api/v1/me/today`);
    expect(res.status).toBe(401);
  });

  it("GET today writes 0 and returns the System window with intl", async () => {
    const { app, sqlite } = openHarness();
    const { cookie } = await onboardedSession(app);
    const before = totalChanges(sqlite);
    const res = await app.request(`${ORIGIN}/api/v1/me/today`, {
      headers: { cookie, origin: ORIGIN },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(totalChanges(sqlite)).toBe(before);
    const json = (await res.json()) as TodayBody;
    expect(json.needsEnsure).toBe(true);
    expect(json.quests).toEqual([]);
    expect(json.disclaimer).toBe(DISCLAIMER);
    expect(json.player.stats.intl).toBe(10);
    expect(json.player.stats).not.toHaveProperty("int");
    expect(json.player.level).toBe(1);
    expect(json.player.xpToNext).toBe(100);
    expect(json.player.rank).toBe("E");
    expect(json.player.title).toBe("Initiate");
    expect(json.recoveryParts).toMatchObject({
      sleep: expect.any(Number),
      restHr: expect.any(Number),
      hrv: expect.any(Number),
      load: expect.any(Number),
      subjective: expect.any(Number),
    });
    expect(json.suggestRegenerate).toBe(false);
    expect(json.pendingModifiers).toEqual([]);
    // Profile (tz + 409) + 1 todayBundle.json_object. 0 writes.
    expect(lastQueryBudget.statements).toBeLessThanOrEqual(2);
  });

  it("GET future date is 400", async () => {
    const { app } = openHarness();
    const { cookie } = await onboardedSession(app);
    const future = addCalendarDays(localDate(new Date(), TZ), 1);
    const res = await app.request(`${ORIGIN}/api/v1/me/today?date=${future}`, {
      headers: { cookie, origin: ORIGIN },
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("DATE_IN_FUTURE");
  });

  it("POST ensure other date is ENSURE_DATE_NOT_TODAY", async () => {
    const { app } = openHarness();
    const { cookie } = await onboardedSession(app);
    const res = await app.request(`${ORIGIN}/api/v1/me/today/ensure`, {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ date: "2020-01-01" }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe(
      "ENSURE_DATE_NOT_TODAY",
    );
  });

  it("ensure is idempotent, issues quests, and stays within the query budget", async () => {
    const { app, sqlite } = openHarness();
    const { cookie } = await onboardedSession(app);
    const first = await app.request(`${ORIGIN}/api/v1/me/today/ensure`, {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({}),
    });
    expect(first.status).toBe(200);
    expect(first.headers.get("cache-control")).toBe("private, no-store");
    const a = (await first.json()) as TodayBody;
    expect(a.needsEnsure).toBe(false);
    expect(a.quests.length).toBeGreaterThan(0);
    expect(a.disclaimer).toBe(DISCLAIMER);
    expect(a.player.stats.intl).toBe(10);
    expect(a.suggestRegenerate).toBe(false);
    // 1 bundle + 1 catch-up UPDATE + 1 atomic (ledger + quests + profile [+ optional]) ≤ 12
    expect(lastQueryBudget.statements).toBeLessThanOrEqual(12);

    const ids = a.quests.map((q) => q.id).sort();
    const second = await app.request(`${ORIGIN}/api/v1/me/today/ensure`, {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({}),
    });
    expect(second.status).toBe(200);
    const b = (await second.json()) as TodayBody;
    expect(b.quests.map((q) => q.id).sort()).toEqual(ids);
    expect(b.needsEnsure).toBe(false);

    const ledger = sqlite.prepare("SELECT COUNT(*) AS n FROM issuance_ledger").get() as { n: number };
    expect(ledger.n).toBe(1);
    const quests = sqlite.prepare("SELECT COUNT(*) AS n FROM daily_quests").get() as { n: number };
    expect(quests.n).toBe(a.quests.length);
  });

  it("GET after ensure still writes 0 and does not persist pendingModifiers", async () => {
    const { app, sqlite } = openHarness();
    const { cookie, userId } = await onboardedSession(app);

    const ensure = await app.request(`${ORIGIN}/api/v1/me/today/ensure`, {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({}),
    });
    expect(ensure.status).toBe(200);
    const issued = (await ensure.json()) as TodayBody;
    const today = issued.date;
    const stepsQuest = issued.quests.find((q) => q.kind === "steps");
    if (stepsQuest) {
      sqlite
        .prepare(
          `INSERT INTO daily_summaries (user_id, local_date, steps, hard_bouts, updated_at)
           VALUES (?, ?, 99999, 0, ?)`,
        )
        .run(userId, today, new Date().toISOString());
    }

    const before = totalChanges(sqlite);
    const res = await app.request(`${ORIGIN}/api/v1/me/today`, {
      headers: { cookie, origin: ORIGIN },
    });
    expect(res.status).toBe(200);
    expect(totalChanges(sqlite)).toBe(before);
    const json = (await res.json()) as TodayBody;
    expect(json.needsEnsure).toBe(false);
    expect(json.quests.map((q) => q.id).sort()).toEqual(issued.quests.map((q) => q.id).sort());
    if (stepsQuest) {
      expect(json.pendingModifiers.length).toBeGreaterThan(0);
      const applied = sqlite
        .prepare(`SELECT modifiers_applied_json FROM daily_quests WHERE id = ?`)
        .get(stepsQuest.id) as { modifiers_applied_json: string };
      expect(JSON.parse(applied.modifiers_applied_json)).toEqual([]);
    }
  });

  it("cannot complete another user's quest", async () => {
    const { app } = openHarness();
    const a = await onboardedSession(app, { username: "alice_x", email: "alice@example.com" });
    const b = await onboardedSession(app, { username: "bob_xx", email: "bob@example.com" });
    const ensure = await app.request(`${ORIGIN}/api/v1/me/today/ensure`, {
      method: "POST",
      headers: jsonHeaders(a.cookie),
      body: JSON.stringify({}),
    });
    const body = (await ensure.json()) as TodayBody;
    const questId = body.quests[0]?.id;
    expect(questId).toBeTruthy();
    const res = await app.request(`${ORIGIN}/api/v1/quests/${questId}/complete`, {
      method: "POST",
      headers: jsonHeaders(b.cookie),
      body: JSON.stringify({ clientId: crypto.randomUUID(), effort: "full" }),
    });
    expect([401, 403, 404]).toContain(res.status);
    expect(((await res.json()) as { error: { code: string } }).error.code).not.toBe("INTERNAL");
  });

  it("partial complete grants 50% XP on profiles", async () => {
    const { app, sqlite } = openHarness();
    const { cookie, userId } = await onboardedSession(app);
    const today = localDate(new Date(), TZ);
    insertQuest(sqlite, {
      id: "01PARTIALQUEST000000000001",
      userId,
      localDate: today,
      xp: 40,
      kind: "habit",
    });
    sqlite
      .prepare(`INSERT INTO issuance_ledger (user_id, local_date, plan_id, created_at) VALUES (?, ?, 'plan', ?)`)
      .run(userId, today, new Date().toISOString());

    const res = await app.request(`${ORIGIN}/api/v1/quests/01PARTIALQUEST000000000001/complete`, {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ clientId: crypto.randomUUID(), effort: "partial" }),
    });
    expect(res.status).toBe(200);
    expect(lastQueryBudget.statements).toBeLessThanOrEqual(8);
    const json = (await res.json()) as { player: { xp: number }; quest: { status: string } };
    expect(json.quest.status).toBe("partial");
    expect(json.player.xp).toBe(20);
    const row = sqlite.prepare("SELECT xp, level FROM profiles WHERE user_id = ?").get(userId) as {
      xp: number;
      level: number;
    };
    expect(row.xp).toBe(20);
    expect(row.level).toBe(1);
  });

  it("full complete writes XP to profiles and increments hard_bouts only for hard work", async () => {
    const { app, sqlite } = openHarness();
    const { cookie, userId } = await onboardedSession(app);
    const today = localDate(new Date(), TZ);
    insertQuest(sqlite, {
      id: "01HARDQUEST00000000000001",
      userId,
      localDate: today,
      xp: 55,
      kind: "strength",
      intensity: "hard",
    });
    insertQuest(sqlite, {
      id: "01EASYQUEST00000000000001",
      userId,
      localDate: today,
      xp: 20,
      kind: "habit",
      intensity: "easy",
    });
    sqlite
      .prepare(`INSERT INTO issuance_ledger (user_id, local_date, plan_id, created_at) VALUES (?, ?, 'plan', ?)`)
      .run(userId, today, new Date().toISOString());

    const hard = await app.request(`${ORIGIN}/api/v1/quests/01HARDQUEST00000000000001/complete`, {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ clientId: crypto.randomUUID(), effort: "full" }),
    });
    expect(hard.status).toBe(200);
    const easy = await app.request(`${ORIGIN}/api/v1/quests/01EASYQUEST00000000000001/complete`, {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ clientId: crypto.randomUUID(), effort: "full" }),
    });
    expect(easy.status).toBe(200);
    const profile = sqlite.prepare("SELECT xp FROM profiles WHERE user_id = ?").get(userId) as {
      xp: number;
    };
    expect(profile.xp).toBe(75);
    const summary = sqlite
      .prepare(`SELECT hard_bouts FROM daily_summaries WHERE user_id = ? AND local_date = ?`)
      .get(userId, today) as { hard_bouts: number };
    expect(summary.hard_bouts).toBe(1);
  });

  it("3rd busy skip in the ISO week is stored as failed", async () => {
    const { app, sqlite } = openHarness();
    const { cookie, userId } = await onboardedSession(app);
    const today = localDate(new Date(), TZ);
    const monday = isoWeekStart(today);
    insertQuest(sqlite, {
      id: "01BUSY1QUEST0000000000001",
      userId,
      localDate: monday,
      status: "skipped",
      skipReason: "busy",
    });
    insertQuest(sqlite, {
      id: "01BUSY2QUEST0000000000001",
      userId,
      localDate: monday,
      status: "skipped",
      skipReason: "busy",
    });
    insertQuest(sqlite, {
      id: "01BUSY3QUEST0000000000001",
      userId,
      localDate: today,
      status: "issued",
    });
    sqlite
      .prepare(`INSERT INTO issuance_ledger (user_id, local_date, plan_id, created_at) VALUES (?, ?, 'plan', ?)`)
      .run(userId, today, new Date().toISOString());

    const res = await app.request(`${ORIGIN}/api/v1/quests/01BUSY3QUEST0000000000001/skip`, {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ reason: "busy" }),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { quest: { status: string; skipReason: string } };
    expect(json.quest.status).toBe("failed");
    expect(json.quest.skipReason).toBe("busy");
    const row = sqlite
      .prepare(`SELECT status, skip_reason FROM daily_quests WHERE id = '01BUSY3QUEST0000000000001'`)
      .get() as { status: string; skip_reason: string };
    expect(row.status).toBe("failed");
    expect(row.skip_reason).toBe("busy");
  });

  it("second consecutive illness skip writes illness_rest for tomorrow", async () => {
    const { app, sqlite } = openHarness();
    const { cookie, userId } = await onboardedSession(app);
    const today = localDate(new Date(), TZ);
    const yesterday = addCalendarDays(today, -1);
    insertQuest(sqlite, {
      id: "01ILLYDAYQUEST00000000001",
      userId,
      localDate: yesterday,
      status: "skipped",
      skipReason: "illness",
    });
    insertQuest(sqlite, { id: "01ILLTODAYQUEST0000000001", userId, localDate: today });
    sqlite
      .prepare(`INSERT INTO issuance_ledger (user_id, local_date, plan_id, created_at) VALUES (?, ?, 'plan', ?)`)
      .run(userId, today, new Date().toISOString());

    const res = await app.request(`${ORIGIN}/api/v1/quests/01ILLTODAYQUEST0000000001/skip`, {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ reason: "illness" }),
    });
    expect(res.status).toBe(200);
    const kinds = sqlite
      .prepare(`SELECT kind FROM user_effects WHERE user_id = ?`)
      .all(userId) as Array<{ kind: string }>;
    expect(kinds.map((e) => e.kind)).toEqual(["illness_rest"]);
  });

  it("skip pain writes pain_no_hard and skip rest_planned does not", async () => {
    const { app, sqlite } = openHarness();
    const { cookie, userId } = await onboardedSession(app);
    const today = localDate(new Date(), TZ);
    insertQuest(sqlite, { id: "01PAINQUEST00000000000001", userId, localDate: today });
    insertQuest(sqlite, { id: "01RESTQUEST00000000000001", userId, localDate: today });
    sqlite
      .prepare(`INSERT INTO issuance_ledger (user_id, local_date, plan_id, created_at) VALUES (?, ?, 'plan', ?)`)
      .run(userId, today, new Date().toISOString());

    const pain = await app.request(`${ORIGIN}/api/v1/quests/01PAINQUEST00000000000001/skip`, {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ reason: "pain" }),
    });
    expect(pain.status).toBe(200);
    const rest = await app.request(`${ORIGIN}/api/v1/quests/01RESTQUEST00000000000001/skip`, {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ reason: "rest_planned" }),
    });
    expect(rest.status).toBe(200);
    const effects = sqlite
      .prepare(`SELECT kind FROM user_effects WHERE user_id = ?`)
      .all(userId) as Array<{ kind: string }>;
    expect(effects.map((e) => e.kind)).toEqual(["pain_no_hard"]);
  });

  it("catch-up fails still-issued days only and does not insert quests for those dates", async () => {
    const { app, sqlite } = openHarness();
    const { cookie, userId } = await onboardedSession(app);
    const today = localDate(new Date(), TZ);
    const yesterday = addCalendarDays(today, -1);
    const twoAgo = addCalendarDays(today, -2);
    sqlite
      .prepare(`UPDATE profiles SET last_ensured_local_date = ? WHERE user_id = ?`)
      .run(twoAgo, userId);
    insertQuest(sqlite, {
      id: "01YDAYISSUED0000000000001",
      userId,
      localDate: yesterday,
      status: "issued",
      kind: "strength",
    });

    const res = await app.request(`${ORIGIN}/api/v1/me/today/ensure`, {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as TodayBody;
    expect(json.date).toBe(today);
    expect(json.quests.every((q) => q.id !== "01YDAYISSUED0000000000001")).toBe(true);
    const yday = sqlite
      .prepare(`SELECT status FROM daily_quests WHERE id = '01YDAYISSUED0000000000001'`)
      .get() as { status: string };
    expect(yday.status).toBe("failed");
    const insertedForGap = sqlite
      .prepare(`SELECT COUNT(*) AS n FROM daily_quests WHERE user_id = ? AND local_date = ?`)
      .get(userId, twoAgo) as { n: number };
    expect(insertedForGap.n).toBe(0);
    const penalties = sqlite
      .prepare(`SELECT COUNT(*) AS n FROM xp_events WHERE user_id = ? AND reason = 'penalty_eval'`)
      .get(userId) as { n: number };
    expect(penalties.n).toBe(1);
    expect(
      json.quests.some((q) => q.templateId === "penalty_easy_walk") ||
        json.planDay?.focus === "rest",
    ).toBe(true);
  });

  it("evaluate-penalties catch-up does not issue today and caps at 25 users", async () => {
    const { sqlite, db } = openHarness();
    const today = localDate(new Date(), TZ);
    const yesterday = addCalendarDays(today, -1);
    const nowMs = Date.now();

    for (let i = 0; i < 26; i++) {
      const userId = `user_${String(i).padStart(2, "0")}`;
      sqlite
        .prepare(
          `INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
           VALUES (?, ?, ?, 0, ?, ?)`,
        )
        .run(userId, `U${i}`, `u${i}@ex.com`, nowMs, nowMs);
      sqlite
        .prepare(
          `INSERT INTO profiles (user_id, age, time_zone, onboarding_status, last_ensured_local_date, created_at, updated_at)
           VALUES (?, 29, ?, 'complete', ?, ?, ?)`,
        )
        .run(userId, TZ, yesterday, new Date().toISOString(), new Date().toISOString());
      insertQuest(sqlite, {
        id: `01PEN${String(i).padStart(22, "0")}`,
        userId,
        localDate: yesterday,
        status: "issued",
      });
    }

    const result = await evaluatePenalties(db, new Date(), 25);
    expect(result.processed).toBe(25);
    const failed = sqlite
      .prepare(`SELECT COUNT(*) AS n FROM daily_quests WHERE status = 'failed'`)
      .get() as { n: number };
    expect(failed.n).toBe(25);
    const stillIssued = sqlite
      .prepare(`SELECT COUNT(*) AS n FROM daily_quests WHERE status = 'issued'`)
      .get() as { n: number };
    expect(stillIssued.n).toBe(1);
    const todayQuests = sqlite
      .prepare(`SELECT COUNT(*) AS n FROM daily_quests WHERE local_date = ?`)
      .get(today) as { n: number };
    expect(todayQuests.n).toBe(0);
    const last = sqlite
      .prepare(`SELECT COUNT(*) AS n FROM profiles WHERE last_ensured_local_date = ?`)
      .get(today) as { n: number };
    expect(last.n).toBe(0);
  });
});
