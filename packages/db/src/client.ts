import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";
import type { D1AriseDb, D1Like, NodeAriseDb } from "./types.js";

export type { AriseDb, D1AriseDb, D1Like, NodeAriseDb, SqlStatement } from "./types.js";

export type NodeDb = NodeAriseDb & {
  orm: ReturnType<typeof drizzle<typeof schema>>;
};

export function createNodeDb(pathOrDb: string | Database.Database): NodeDb {
  const sqlite = typeof pathOrDb === "string" ? new Database(pathOrDb) : pathOrDb;
  sqlite.pragma("foreign_keys = ON");
  return {
    kind: "node",
    sqlite,
    orm: drizzle(sqlite, { schema }),
  };
}

export function createD1Db(d1: D1Like): D1AriseDb {
  return { kind: "d1", d1 };
}
