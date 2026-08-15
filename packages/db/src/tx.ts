import type { AriseDb, SqlStatement } from "./types.js";

export type { SqlStatement } from "./types.js";

/**
 * Dual-runtime atomic write. D1 uses `batch()` (no BEGIN/COMMIT).
 * Node uses better-sqlite3 `transaction()`. Never emit BEGIN/COMMIT in worker code.
 */
export async function atomic(db: AriseDb, statements: SqlStatement[]): Promise<void> {
  if (db.kind === "d1") {
    await db.d1.batch(statements.map((s) => db.d1.prepare(s.sql).bind(...s.params)));
    return;
  }

  const sqlite = db.sqlite;
  const trx = sqlite.transaction(() => {
    for (const s of statements) {
      sqlite.prepare(s.sql).run(...(s.params as never[]));
    }
  });
  trx();
}
