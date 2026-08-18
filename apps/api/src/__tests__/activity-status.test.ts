import { createNodeDb, migrate } from "@arise/db";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { createAuth } from "../auth.js";
import type { Env } from "../env.js";

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
    experience: 2 as const,
    equipment: ["full_gym"] as Array<"none" | "bands" | "dumbbells" | "full_gym">,
    injuries: [] as string[],
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

const openDbs: Database.Database[] = [];

function openHarness() {
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
  openDbs.push(sqlite);
  return { app, sqlite };
}

afterEach(() => {
  while (openDbs.length > 0) {
    openDbs.pop()?.close();
  }
});

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

async function onboardedSession(app: ReturnType<typeof createApp>) {
  const res = await app.request(`${ORIGIN}/api/v1/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN },
    body: JSON.stringify({
      ...validRegister,
      email: `p${Math.random().toString(16).slice(2)}@example.com`,
      username: `u_${Math.random().toString(16).slice(2, 10)}`,
    }),
  });
  expect(res.status).toBe(200);
  const cookie = cookieHeader(res);
  const put = await app.request(`${ORIGIN}/api/v1/onboarding`, {
    method: "PUT",
    headers: jsonHeaders(cookie),
    body: JSON.stringify(validOnboarding),
  });
  expect(put.status).toBe(200);
  return { cookie };
}

describe("activity status API", () => {
  it("401 without a session", async () => {
    const { app } = openHarness();
    const res = await app.request(`${ORIGIN}/api/v1/me/activity-status`);
    expect(res.status).toBe(401);
  });

  it("defaults to training; travel 3 days then training clears", async () => {
    const { app } = openHarness();
    const { cookie } = await onboardedSession(app);
    const get0 = await app.request(`${ORIGIN}/api/v1/me/activity-status`, {
      headers: jsonHeaders(cookie),
    });
    expect(get0.status).toBe(200);
    expect(await get0.json()).toEqual({
      status: "training",
      startsOn: null,
      endsOn: null,
      days: null,
    });

    const bad = await app.request(`${ORIGIN}/api/v1/me/activity-status`, {
      method: "PUT",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ status: "travel" }),
    });
    expect(bad.status).toBe(400);

    const put = await app.request(`${ORIGIN}/api/v1/me/activity-status`, {
      method: "PUT",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ status: "travel", days: 3 }),
    });
    expect(put.status).toBe(200);
    const travel = (await put.json()) as { status: string; days: number };
    expect(travel.status).toBe("travel");
    expect(travel.days).toBe(3);

    const today = await app.request(`${ORIGIN}/api/v1/me/today`, {
      headers: jsonHeaders(cookie),
    });
    const todayBody = (await today.json()) as {
      activityStatus: { status: string };
      needsEnsure: boolean;
    };
    expect(todayBody.activityStatus.status).toBe("travel");

    const ensure = await app.request(`${ORIGIN}/api/v1/me/today/ensure`, {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({}),
    });
    expect(ensure.status).toBe(200);
    const issued = (await ensure.json()) as { quests: Array<{ templateId: string }> };
    expect(issued.quests.map((q) => q.templateId)).not.toContain("str_gym_full_body_l2");

    const clear = await app.request(`${ORIGIN}/api/v1/me/activity-status`, {
      method: "PUT",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ status: "training" }),
    });
    expect(clear.status).toBe(200);
    expect(((await clear.json()) as { status: string }).status).toBe("training");
  });

  it("sick window is rest/easy and skips gym hard", async () => {
    const { app } = openHarness();
    const { cookie } = await onboardedSession(app);
    const put = await app.request(`${ORIGIN}/api/v1/me/activity-status`, {
      method: "PUT",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ status: "sick", days: 2 }),
    });
    expect(put.status).toBe(200);
    const ensure = await app.request(`${ORIGIN}/api/v1/me/today/ensure`, {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({}),
    });
    expect(ensure.status).toBe(200);
    const body = (await ensure.json()) as {
      activityStatus: { status: string };
      quests: Array<{ templateId: string; prescription: { intensity: string; blocks: Array<{ rpeMax: number }> } }>;
    };
    expect(body.activityStatus.status).toBe("sick");
    expect(body.quests.every((q) => q.prescription.intensity === "rest" || q.prescription.intensity === "easy")).toBe(
      true,
    );
    expect(body.quests.map((q) => q.templateId)).not.toContain("str_gym_full_body_l2");
  });
});
