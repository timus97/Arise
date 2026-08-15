import { atomic } from "@arise/db";
import type { Hono } from "hono";
import { requireSession } from "../middleware/auth.js";
import { ApiError } from "../middleware/error.js";
import { prepare, stmt } from "../sql.js";
import type { AppBindings, AppDeps } from "../types.js";
import { requireUserId } from "./onboarding.js";

type UserRow = {
  id: string;
  name: string;
  email: string;
  email_verified: number;
  image: string | null;
  created_at: number;
  updated_at: number;
  username: string | null;
  display_username: string | null;
};

const USER_SCOPED_TABLES: ReadonlyArray<{ key: string; table: string }> = [
  { key: "session", table: "session" },
  { key: "profiles", table: "profiles" },
  { key: "goals", table: "goals" },
  { key: "habitProfiles", table: "habit_profiles" },
  { key: "plans", table: "plans" },
  { key: "planDays", table: "plan_days" },
  { key: "dailyQuests", table: "daily_quests" },
  { key: "questCompletions", table: "quest_completions" },
  { key: "issuanceLedger", table: "issuance_ledger" },
  { key: "healthSamples", table: "health_samples" },
  { key: "dailySummaries", table: "daily_summaries" },
  { key: "statSnapshots", table: "stat_snapshots" },
  { key: "xpEvents", table: "xp_events" },
  { key: "rankEvents", table: "rank_events" },
  { key: "userEffects", table: "user_effects" },
  { key: "integrations", table: "integrations" },
  { key: "auditLogs", table: "audit_logs" },
];

export function registerExportRoutes(app: Hono<AppBindings>, deps: AppDeps): void {
  const gate = requireSession(deps.auth);

  app.get("/api/v1/me/export", gate, (c) => {
    const userId = requireUserId(c.get("userId"));
    const user = loadUser(deps.db, userId);
    if (user === undefined) {
      throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
    }

    const payload = omitPassword({
      exportedAt: new Date().toISOString(),
      user: exportRow(user),
      account: loadAccountsWithoutPassword(deps.db, userId),
      verification: loadVerification(deps.db, user.email, user.username),
      ...Object.fromEntries(
        USER_SCOPED_TABLES.map(({ key, table }) => [
          key,
          loadUserScoped(deps.db, table, userId),
        ]),
      ),
    });

    c.header("Cache-Control", "private, no-store");
    c.header("Content-Disposition", 'attachment; filename="arise-export.json"');
    return c.json(payload);
  });

  app.post("/api/v1/account/delete", gate, async (c) => {
    const userId = requireUserId(c.get("userId"));
    const user = loadUser(deps.db, userId);
    if (user === undefined) {
      throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
    }
    await atomic(deps.db, cascadeDeleteStatements(userId, user.email, user.username));
    expireAuthCookies(c, deps.env.APP_ORIGIN.startsWith("https"));
    return c.json({ ok: true });
  });
}

function loadUser(db: AppDeps["db"], userId: string): UserRow | undefined {
  const row = prepare(
    db,
    `SELECT id, name, email, email_verified, image, created_at, updated_at,
            username, display_username
       FROM user WHERE id = ?`,
  ).get(userId);
  return row as UserRow | undefined;
}

function loadAccountsWithoutPassword(
  db: AppDeps["db"],
  userId: string,
): Record<string, unknown>[] {
  const rows = prepare(
    db,
    `SELECT id, account_id, provider_id, user_id, access_token, refresh_token,
            id_token, access_token_expires_at, refresh_token_expires_at, scope,
            created_at, updated_at
       FROM account WHERE user_id = ?`,
  ).all(userId);
  return rows.map((row) => exportRow(row));
}

function loadVerification(
  db: AppDeps["db"],
  email: string,
  username: string | null,
): Record<string, unknown>[] {
  const rows = prepare(
    db,
    `SELECT id, identifier, value, expires_at, created_at, updated_at
       FROM verification
      WHERE identifier = ? OR (? IS NOT NULL AND identifier = ?)`,
  ).all(email, username, username);
  return rows.map((row) => exportRow(row));
}

function loadUserScoped(
  db: AppDeps["db"],
  table: string,
  userId: string,
): Record<string, unknown>[] {
  const rows = prepare(db, `SELECT * FROM ${table} WHERE user_id = ?`).all(userId);
  return rows.map((row) => exportRow(row));
}

export function cascadeDeleteStatements(
  userId: string,
  email: string,
  username: string | null,
) {
  return [
    stmt(`DELETE FROM quest_completions WHERE user_id = ?`, [userId]),
    stmt(`DELETE FROM daily_quests WHERE user_id = ?`, [userId]),
    stmt(`DELETE FROM issuance_ledger WHERE user_id = ?`, [userId]),
    stmt(`DELETE FROM health_samples WHERE user_id = ?`, [userId]),
    stmt(`DELETE FROM daily_summaries WHERE user_id = ?`, [userId]),
    stmt(`DELETE FROM stat_snapshots WHERE user_id = ?`, [userId]),
    stmt(`DELETE FROM xp_events WHERE user_id = ?`, [userId]),
    stmt(`DELETE FROM rank_events WHERE user_id = ?`, [userId]),
    stmt(`DELETE FROM user_effects WHERE user_id = ?`, [userId]),
    stmt(`DELETE FROM integrations WHERE user_id = ?`, [userId]),
    stmt(`DELETE FROM plan_days WHERE user_id = ?`, [userId]),
    stmt(`DELETE FROM plans WHERE user_id = ?`, [userId]),
    stmt(`DELETE FROM goals WHERE user_id = ?`, [userId]),
    stmt(`DELETE FROM habit_profiles WHERE user_id = ?`, [userId]),
    stmt(`DELETE FROM profiles WHERE user_id = ?`, [userId]),
    stmt(`DELETE FROM session WHERE user_id = ?`, [userId]),
    stmt(`DELETE FROM account WHERE user_id = ?`, [userId]),
    stmt(`DELETE FROM audit_logs WHERE user_id = ?`, [userId]),
    stmt(`DELETE FROM verification WHERE identifier = ? OR (? IS NOT NULL AND identifier = ?)`, [
      email,
      username,
      username,
    ]),
    stmt(`DELETE FROM user WHERE id = ?`, [userId]),
  ];
}

function expireAuthCookies(
  c: { header: (name: string, value: string, options?: { append: boolean }) => void },
  secure: boolean,
): void {
  const attrs = `Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
  c.header("Set-Cookie", `arise.session=; ${attrs}`, { append: true });
  c.header("Set-Cookie", `arise.session_data=; ${attrs}`, { append: true });
}

function toCamel(key: string): string {
  return key.replace(/_([a-z])/g, (_, ch: string) => ch.toUpperCase());
}

function exportRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (key === "password") continue;
    const camel = toCamel(key);
    if (camel.endsWith("Json") && typeof value === "string") {
      try {
        out[camel] = JSON.parse(value) as unknown;
        continue;
      } catch {
        out[camel] = value;
        continue;
      }
    }
    out[camel] = value;
  }
  return out;
}

function omitPassword(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(omitPassword);
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (key === "password") continue;
      out[key] = omitPassword(nested);
    }
    return out;
  }
  return value;
}
