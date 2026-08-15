import type { AriseDb } from "@arise/db";

export type SecondaryStorage = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, ttl?: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
};

type RlSqlite = {
  prepare: (sql: string) => {
    get: (...params: unknown[]) => { value: string; expires_at: number } | undefined;
    run: (...params: unknown[]) => unknown;
  };
};

/** Better Auth secondaryStorage → `auth_rl`. Required when RUNTIME=worker. */
export function createAuthRlStorage(db: AriseDb): SecondaryStorage {
  if (db.kind !== "node") {
    throw new Error("D1 auth_rl storage is a later Workers Paid option");
  }
  const sqlite = db.sqlite as unknown as RlSqlite;
  return {
    async get(key) {
      const row = sqlite
        .prepare("SELECT value, expires_at FROM auth_rl WHERE key = ?")
        .get(key);
      if (!row || row.expires_at < Date.now()) {
        return null;
      }
      return row.value;
    },
    async set(key, value, ttl) {
      const expiresAt = Date.now() + (ttl ?? 60) * 1000;
      sqlite
        .prepare(
          "INSERT OR REPLACE INTO auth_rl (key, value, expires_at) VALUES (?, ?, ?)",
        )
        .run(key, value, expiresAt);
    },
    async delete(key) {
      sqlite.prepare("DELETE FROM auth_rl WHERE key = ?").run(key);
    },
  };
}
