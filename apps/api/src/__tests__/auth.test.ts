import { createNodeDb, migrate } from "@arise/db";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { createAuth } from "../auth.js";
import { createAuthRlStorage } from "../auth-rl.js";
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
    ...(env.RUNTIME === "worker"
      ? { secondaryStorage: createAuthRlStorage(db) }
      : {}),
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

describe("auth façade", () => {
  it("returns JSON NOT_FOUND for unknown /api/v1 paths", async () => {
    const { app } = openHarness();
    const res = await app.request(`${ORIGIN}/api/v1/does-not-exist`);
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type") ?? "").toMatch(/application\/json/);
    const json = (await res.json()) as { error: { code: string; message: string } };
    expect(json.error.code).toBe("NOT_FOUND");
    expect(json.error.message).toBe("Not found");
  });

  it("returns 401 on GET /api/v1/me without a session", async () => {
    const { app } = openHarness();
    const res = await app.request(`${ORIGIN}/api/v1/me`);
    expect(res.status).toBe(401);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects age 15 with AGE_RESTRICTED and writes zero user/account/profile rows", async () => {
    const { app, sqlite } = openHarness();
    const res = await signUp(app, { ...validRegister, age: 15 });
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe("AGE_RESTRICTED");
    expect(countTable(sqlite, "user")).toBe(0);
    expect(countTable(sqlite, "account")).toBe(0);
    expect(countTable(sqlite, "profiles")).toBe(0);
  });

  it("fail-closes register when REGISTER_INVITE_CODE is unset", async () => {
    const { app, sqlite } = openHarness({ REGISTER_INVITE_CODE: "" });
    const res = await signUp(app, validRegister);
    expect(res.status).toBe(503);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe("INVITE_UNCONFIGURED");
    expect(countTable(sqlite, "user")).toBe(0);
  });

  it("rejects invite mismatch with INVITE_REQUIRED", async () => {
    const { app, sqlite } = openHarness();
    const res = await signUp(app, { ...validRegister, inviteCode: "nope" });
    expect(res.status).toBe(403);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe("INVITE_REQUIRED");
    expect(countTable(sqlite, "user")).toBe(0);
  });

  it("registers a user, sets arise.session, and does not create a profiles row", async () => {
    const { app, sqlite } = openHarness();
    const res = await signUp(app, validRegister);
    expect(res.status).toBe(200);
    const setCookie = res.headers.getSetCookie().join("\n");
    expect(setCookie).toMatch(/arise\.session/);
    expect(setCookie.toLowerCase()).not.toMatch(/samesite=none/);
    expect(countTable(sqlite, "user")).toBe(1);
    expect(countTable(sqlite, "account")).toBe(1);
    expect(countTable(sqlite, "profiles")).toBe(0);

    const me = await app.request(`${ORIGIN}/api/v1/me`, {
      headers: { cookie: cookieHeader(res), origin: ORIGIN },
    });
    expect(me.status).toBe(200);
    const body = (await me.json()) as { userId: string };
    expect(body.userId.length).toBeGreaterThan(0);
  });

  it("returns 501 AUTH_RUNTIME_UNSUPPORTED on worker without ALLOW_WORKER_PASSWORD_AUTH", async () => {
    const { app, sqlite } = openHarness({ RUNTIME: "worker" });
    const res = await signUp(app, validRegister);
    expect(res.status).toBe(501);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe("AUTH_RUNTIME_UNSUPPORTED");
    expect(countTable(sqlite, "user")).toBe(0);

    const signIn = await app.request(`${ORIGIN}/api/v1/auth/sign-in/email`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: ORIGIN },
      body: JSON.stringify({
        email: validRegister.email,
        password: validRegister.password,
      }),
    });
    expect(signIn.status).toBe(501);
    const signInJson = (await signIn.json()) as { error: { code: string } };
    expect(signInJson.error.code).toBe("AUTH_RUNTIME_UNSUPPORTED");
  });

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

  it("serves /health without touching the DB and /ready with SELECT 1", async () => {
    const { app } = openHarness();
    const health = await app.request("/health");
    expect(health.status).toBe(200);
    expect(health.headers.get("server-timing")).toMatch(/app;dur=/);
    const healthBody = (await health.json()) as {
      ok: boolean;
      runtime: string;
      version: string;
    };
    expect(healthBody).toEqual({ ok: true, runtime: "node", version: "0.0.0" });

    const ready = await app.request("/ready");
    expect(ready.status).toBe(200);
    expect(await ready.json()).toEqual({ ok: true, db: "ok" });
  });

  it("rejects username-only register with EMAIL_REQUIRED", async () => {
    const { app, sqlite } = openHarness();
    const { email: _email, ...noEmail } = validRegister;
    const res = await signUp(app, noEmail);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe("EMAIL_REQUIRED");
    expect(countTable(sqlite, "user")).toBe(0);
  });
});
