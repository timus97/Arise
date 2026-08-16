import { createNodeDb, migrate } from "@arise/db";
import { addCalendarDays, localDate } from "@arise/engine";
import Database from "better-sqlite3";
import { validate } from "node-cron";
import { afterEach, describe, expect, it } from "vitest";
import type { Env } from "../env.js";
import {
  BACKUP_CRON,
  NIGHTLY_CRON,
  runNightlyJobs,
  runSqliteBackup,
  startNodeCron,
} from "../jobs/node-cron.js";
import { deleteHealthSampleChunk, HEALTH_SAMPLE_DELETE_CHUNK, retain } from "../jobs/retain.js";

const ORIGIN = "http://localhost:5173";
const TZ = "Europe/Stockholm";

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
    REGISTER_INVITE_CODE: "x",
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

const openDbs: Database.Database[] = [];

function openDb() {
  const sqlite = new Database(":memory:");
  migrate(sqlite);
  const db = createNodeDb(sqlite);
  openDbs.push(sqlite);
  return { sqlite, db, env: testEnv() };
}

afterEach(() => {
  while (openDbs.length > 0) {
    openDbs.pop()?.close();
  }
});

function insertSample(
  sqlite: Database.Database,
  args: { id: string; userId: string; ingestedAt: string; startAt?: string },
): void {
  const start = args.startAt ?? args.ingestedAt;
  sqlite
    .prepare(
      `INSERT INTO health_samples (
          id, user_id, source, metric, value, unit, start_at, end_at, dedup_hash, ingested_at
        ) VALUES (?, ?, 'manual', 'steps', 1, 'count', ?, ?, ?, ?)`,
    )
    .run(args.id, args.userId, start, start, `h:${args.id}`, args.ingestedAt);
}

function insertUser(sqlite: Database.Database, userId: string): void {
  const nowMs = Date.now();
  sqlite
    .prepare(
      `INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
       VALUES (?, ?, ?, 0, ?, ?)`,
    )
    .run(userId, userId, `${userId}@ex.com`, nowMs, nowMs);
}

describe("retain job", () => {
  it("deletes health_samples older than retention in chunks of 500", () => {
    const { sqlite, db, env } = openDb();
    insertUser(sqlite, "u1");
    const now = new Date("2026-08-15T03:15:00.000Z");
    const oldIso = "2026-07-01T00:00:00.000Z";
    const recentIso = "2026-08-14T00:00:00.000Z";
    for (let i = 0; i < 501; i++) {
      insertSample(sqlite, {
        id: `old_${String(i).padStart(4, "0")}`,
        userId: "u1",
        ingestedAt: oldIso,
      });
    }
    insertSample(sqlite, { id: "recent_1", userId: "u1", ingestedAt: recentIso });

    const first = deleteHealthSampleChunk(db, "2026-07-16T03:15:00.000Z");
    expect(first).toBe(HEALTH_SAMPLE_DELETE_CHUNK);
    expect(
      (sqlite.prepare("SELECT COUNT(*) AS n FROM health_samples").get() as { n: number }).n,
    ).toBe(2);

    const result = retain(db, {
      healthSampleRetentionDays: env.HEALTH_SAMPLE_RETENTION_DAYS,
      auditRetentionDays: env.AUDIT_RETENTION_DAYS,
      now,
    });
    expect(result.healthSamples).toBe(1);
    const left = sqlite.prepare("SELECT id FROM health_samples").all() as Array<{ id: string }>;
    expect(left.map((r) => r.id)).toEqual(["recent_1"]);
  });

  it("deletes old audit_logs and expired rate_limits + auth_rl", () => {
    const { sqlite, db, env } = openDb();
    const now = new Date("2026-08-15T03:15:00.000Z");
    sqlite
      .prepare(
        `INSERT INTO audit_logs (id, actor, action, created_at) VALUES
         ('a_old', 'system', 'x', '2026-01-01T00:00:00.000Z'),
         ('a_new', 'system', 'x', '2026-08-01T00:00:00.000Z')`,
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO rate_limits (key, window_start, count) VALUES
         ('health_ingest:u1', ?, 3),
         ('health_ingest:u1', ?, 1)`,
      )
      .run(now.getTime() - 3 * 86_400_000, now.getTime() - 60_000);
    sqlite
      .prepare(
        `INSERT INTO auth_rl (key, value, expires_at) VALUES
         ('old', 'v', ?),
         ('live', 'v', ?)`,
      )
      .run(now.getTime() - 1000, now.getTime() + 60_000);

    const result = retain(db, {
      healthSampleRetentionDays: env.HEALTH_SAMPLE_RETENTION_DAYS,
      auditRetentionDays: env.AUDIT_RETENTION_DAYS,
      now,
    });
    expect(result.auditLogs).toBe(1);
    expect(result.rateLimits).toBe(1);
    expect(result.authRl).toBe(1);
    const audits = sqlite.prepare("SELECT id FROM audit_logs").all() as Array<{ id: string }>;
    expect(audits.map((a) => a.id)).toEqual(["a_new"]);
    const rl = sqlite.prepare("SELECT count FROM rate_limits").all() as Array<{ count: number }>;
    expect(rl).toEqual([{ count: 1 }]);
    const ar = sqlite.prepare("SELECT key FROM auth_rl").all() as Array<{ key: string }>;
    expect(ar.map((r) => r.key)).toEqual(["live"]);
  });
});

describe("node-cron wiring", () => {
  it("schedules 15 3 * * * UTC and does not register a push job", () => {
    expect(NIGHTLY_CRON).toBe("15 3 * * *");
    expect(validate(NIGHTLY_CRON)).toBe(true);
    const { db, env } = openDb();
    const handle = startNodeCron({ db, env });
    handle.stop();
    expect(NIGHTLY_CRON.includes("push")).toBe(false);
  });

  it("schedules 45 3 * * * sqlite backup and does not register a push job", () => {
    expect(BACKUP_CRON).toBe("45 3 * * *");
    expect(validate(BACKUP_CRON)).toBe(true);
    expect(BACKUP_CRON.includes("push")).toBe(false);
  });

  it("spawns backup-sqlite with DATABASE_PATH", async () => {
    const { env } = openDb();
    const calls: Array<{ cmd: string; path: string | undefined }> = [];
    await runSqliteBackup(env, (command, _args, options) => {
      calls.push({
        cmd: String(command),
        path: options.env?.DATABASE_PATH,
      });
      const child = {
        on(event: string, listener: (...args: unknown[]) => void) {
          if (event === "close") queueMicrotask(() => listener(0));
          return child;
        },
      };
      return child as ReturnType<typeof import("node:child_process").spawn>;
    });
    expect(calls).toEqual([{ cmd: "backup-sqlite", path: env.DATABASE_PATH }]);
  });

  it("nightly tick retains then evaluate-penalties without issuing today", async () => {
    const { sqlite, db, env } = openDb();
    const now = new Date();
    const today = localDate(now, TZ);
    const yesterday = addCalendarDays(today, -1);
    const nowMs = Date.now();
    const oldIso = new Date(now.getTime() - 40 * 86_400_000).toISOString();

    insertUser(sqlite, "u_pen");
    sqlite
      .prepare(
        `INSERT INTO profiles (user_id, age, time_zone, onboarding_status, last_ensured_local_date, created_at, updated_at)
         VALUES ('u_pen', 29, ?, 'complete', ?, ?, ?)`,
      )
      .run(TZ, yesterday, new Date().toISOString(), new Date().toISOString());
    sqlite
      .prepare(
        `INSERT INTO daily_quests (
            id, user_id, local_date, template_id, title, flavor, kind, status,
            prescription_json, xp_reward, stat_delta_json, auto_completable,
            source, idempotency_key, created_at, updated_at
          ) VALUES ('01YDAYQ000000000000000001', 'u_pen', ?, 'habit_sleep_window', 'Q', 'f', 'habit', 'issued',
            '{"blocks":[],"estimatedMinutes":0,"intensity":"rest"}', 20, '{}', 0, 'issuer', 'u_pen:yday:habit', ?, ?)`,
      )
      .run(yesterday, new Date().toISOString(), new Date().toISOString());
    sqlite
      .prepare(
        `INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
         VALUES ('u_samp', 's', 's@ex.com', 0, ?, ?)`,
      )
      .run(nowMs, nowMs);
    insertSample(sqlite, { id: "old_s", userId: "u_samp", ingestedAt: oldIso });

    await runNightlyJobs({ db, env }, now);

    const status = sqlite
      .prepare(`SELECT status FROM daily_quests WHERE id = '01YDAYQ000000000000000001'`)
      .get() as { status: string };
    expect(status.status).toBe("failed");
    const todayQuests = sqlite
      .prepare(`SELECT COUNT(*) AS n FROM daily_quests WHERE local_date = ?`)
      .get(today) as { n: number };
    expect(todayQuests.n).toBe(0);
    const last = sqlite
      .prepare(`SELECT last_ensured_local_date FROM profiles WHERE user_id = 'u_pen'`)
      .get() as { last_ensured_local_date: string };
    expect(last.last_ensured_local_date).toBe(yesterday);
    const samples = sqlite.prepare("SELECT COUNT(*) AS n FROM health_samples").get() as { n: number };
    expect(samples.n).toBe(0);
  });
});
