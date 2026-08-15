import type { NodeDb, SqlStatement } from "@arise/db";

export type SqliteQuery = {
  get: (...params: unknown[]) => Record<string, unknown> | undefined;
  all: (...params: unknown[]) => Record<string, unknown>[];
  run: (...params: unknown[]) => { changes: number };
};

export function prepare(db: NodeDb, sql: string): SqliteQuery {
  return db.sqlite.prepare(sql) as unknown as SqliteQuery;
}

export function stmt(sql: string, params: readonly unknown[]): SqlStatement {
  return { sql, params };
}
