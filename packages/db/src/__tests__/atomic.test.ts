import Database from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createD1Db, createNodeDb } from "../client.js";
import { migrate } from "../migrate.js";
import { atomic } from "../tx.js";
import type { D1Like, D1PreparedLike } from "../types.js";

const USER_ID = "01ARISETESTUSER00000000001";
const NOW = "2026-08-15T12:00:00.000Z";
const LOCAL_DATE = "2026-08-15";

function openMigrated(): Database.Database {
  const sqlite = new Database(":memory:");
  migrate(sqlite);
  sqlite
    .prepare(
      `INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
       VALUES (?, 'Tester', 'tester@example.com', 0, 0, 0)`,
    )
    .run(USER_ID);
  return sqlite;
}

function ledgerInsert(): { sql: string; params: readonly unknown[] } {
  return {
    sql: `INSERT INTO issuance_ledger (user_id, local_date, plan_id, created_at)
          VALUES (?, ?, ?, ?)`,
    params: [USER_ID, LOCAL_DATE, "plan_1", NOW],
  };
}

function questInsert(): { sql: string; params: readonly unknown[] } {
  return {
    sql: `INSERT INTO daily_quests (
            id, user_id, local_date, template_id, title, flavor, kind, status,
            prescription_json, xp_reward, stat_delta_json, auto_completable,
            source, idempotency_key, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    params: [
      "01ARISETESTQUEST0000000001",
      USER_ID,
      LOCAL_DATE,
      "habit_sleep_window",
      "Sleep window",
      "Keep the window.",
      "habit",
      "issued",
      '{"blocks":[],"estimatedMinutes":0,"intensity":"rest"}',
      20,
      "{}",
      1,
      "issuer",
      `${USER_ID}:${LOCAL_DATE}:habit_sleep_window`,
      NOW,
      NOW,
    ],
  };
}

function ledgerCount(sqlite: Database.Database): number {
  const row = sqlite.prepare("SELECT COUNT(*) AS n FROM issuance_ledger").get() as { n: number };
  return row.n;
}

function columnMap(sqlite: Database.Database, table: string): Map<string, { dflt: string | null; notnull: number }> {
  const rows = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{
    name: string;
    dflt_value: string | null;
    notnull: number;
  }>;
  return new Map(rows.map((r) => [r.name, { dflt: r.dflt_value, notnull: r.notnull }]));
}

function createWritingD1(sqlite: Database.Database, batchImpl: D1Like["batch"]): D1Like {
  return {
    prepare(sql: string): D1PreparedLike {
      const state: { sql: string; params: unknown[] } = { sql, params: [] };
      const prepared: D1PreparedLike = {
        bind(...values: unknown[]) {
          state.params = values;
          return prepared;
        },
      };
      Object.assign(prepared, {
        run() {
          sqlite.prepare(state.sql).run(...(state.params as never[]));
          return Promise.resolve({ success: true });
        },
      });
      return prepared;
    },
    batch: batchImpl,
  };
}

describe("schema contract", () => {
  let sqlite: Database.Database;

  afterEach(() => {
    sqlite?.close();
  });

  it("creates Data Model tables and omits users/push/v1.1 columns", () => {
    sqlite = openMigrated();
    const tables = (
      sqlite.prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`).all() as Array<{
        name: string;
      }>
    ).map((r) => r.name);
    const views = (
      sqlite.prepare(`SELECT name FROM sqlite_master WHERE type = 'view'`).all() as Array<{
        name: string;
      }>
    ).map((r) => r.name);

    expect(tables).toEqual(expect.arrayContaining([
      "user",
      "session",
      "account",
      "verification",
      "profiles",
      "goals",
      "habit_profiles",
      "plans",
      "plan_days",
      "quest_templates",
      "daily_quests",
      "quest_completions",
      "issuance_ledger",
      "health_samples",
      "daily_summaries",
      "stat_snapshots",
      "xp_events",
      "rank_events",
      "user_effects",
      "integrations",
      "audit_logs",
      "rate_limits",
      "auth_rl",
    ]));
    expect(tables).not.toContain("users");
    expect(tables).not.toContain("push_subscriptions");
    expect(tables).not.toContain("push_log");
    expect(views).not.toContain("users");

    const profileCols = columnMap(sqlite, "profiles");
    expect(profileCols.get("level")?.dflt).toBe("1");
    expect(profileCols.get("xp")?.dflt).toBe("0");
    expect(profileCols.has("xp")).toBe(true);

    const userCols = columnMap(sqlite, "user");
    expect(userCols.has("username")).toBe(true);
    expect(userCols.has("display_username")).toBe(true);
    expect(userCols.has("xp")).toBe(false);

    const habitCols = columnMap(sqlite, "habit_profiles");
    expect(habitCols.has("learned_rest_weekdays_json")).toBe(false);

    const planDayCols = columnMap(sqlite, "plan_days");
    expect(planDayCols.get("is_gate")?.dflt).toBe("0");

    const questCols = columnMap(sqlite, "daily_quests");
    expect(questCols.get("modifiers_applied_json")?.dflt).toBe("'[]'");
    expect(questCols.get("skip_reason")?.notnull).toBe(0);

    const summaryCols = columnMap(sqlite, "daily_summaries");
    expect(summaryCols.has("soreness")).toBe(true);
    expect(summaryCols.has("sleep_quality")).toBe(true);
    expect(summaryCols.has("hard_bouts")).toBe(true);
    expect(summaryCols.has("zone2_minutes")).toBe(false);

    const authRl = columnMap(sqlite, "auth_rl");
    expect(authRl.has("key")).toBe(true);
    expect(authRl.has("value")).toBe(true);
    expect(authRl.has("expires_at")).toBe(true);

    const templateCount = sqlite.prepare("SELECT COUNT(*) AS n FROM quest_templates").get() as {
      n: number;
    };
    expect(templateCount.n).toBe(0);
  });
});

describe("atomic() contract", () => {
  let sqlite: Database.Database;

  afterEach(() => {
    sqlite?.close();
  });

  it("mocked batch reject leaves 0 issuance_ledger rows", async () => {
    sqlite = openMigrated();
    const batch = vi.fn().mockRejectedValue(new Error("d1 batch rejected"));
    const db = createD1Db(createWritingD1(sqlite, batch));

    await expect(atomic(db, [ledgerInsert(), questInsert()])).rejects.toThrow("d1 batch rejected");
    expect(batch).toHaveBeenCalledOnce();
    expect(ledgerCount(sqlite)).toBe(0);
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM daily_quests").get()).toEqual({ n: 0 });
  });

  it("node transaction rollback leaves 0 issuance_ledger rows", async () => {
    sqlite = openMigrated();
    const db = createNodeDb(sqlite);

    await expect(
      atomic(db, [
        ledgerInsert(),
        { sql: "INSERT INTO issuance_ledger (user_id) VALUES (?)", params: [USER_ID] },
      ]),
    ).rejects.toThrow();
    expect(ledgerCount(sqlite)).toBe(0);
  });

  it("node transaction commits ledger and quests together", async () => {
    sqlite = openMigrated();
    const db = createNodeDb(sqlite);

    await atomic(db, [ledgerInsert(), questInsert()]);
    expect(ledgerCount(sqlite)).toBe(1);
    const quest = sqlite
      .prepare("SELECT modifiers_applied_json, skip_reason FROM daily_quests")
      .get() as { modifiers_applied_json: string; skip_reason: string | null };
    expect(quest.modifiers_applied_json).toBe("[]");
    expect(quest.skip_reason).toBeNull();
  });
});
