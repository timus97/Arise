/** Dual-runtime DB handle. Worker code must import this + `atomic` only — never `BEGIN`/`COMMIT`. */

export type SqlStatement = {
  sql: string;
  params: readonly unknown[];
};

export type D1PreparedLike = {
  bind: (...values: unknown[]) => D1PreparedLike;
};

export type D1Like = {
  prepare: (query: string) => D1PreparedLike;
  batch: (statements: D1PreparedLike[]) => Promise<unknown>;
};

export type SqliteStatementLike = {
  run: (...params: never[]) => unknown;
};

export type SqliteLike = {
  prepare: (sql: string) => SqliteStatementLike;
  transaction: <T>(fn: () => T) => () => T;
};

export type D1AriseDb = {
  kind: "d1";
  d1: D1Like;
};

export type NodeAriseDb = {
  kind: "node";
  sqlite: SqliteLike;
};

export type AriseDb = D1AriseDb | NodeAriseDb;
