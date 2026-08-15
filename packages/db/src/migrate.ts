import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type Database from "better-sqlite3";

const DEFAULT_MIGRATIONS_FOLDER = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "drizzle",
);

export function migrationsFolder(): string {
  return DEFAULT_MIGRATIONS_FOLDER;
}

/** Forward-only numbered SQL. Node boot calls this; D1 uses wrangler apply. */
export function migrate(
  sqlite: Database.Database,
  folder: string = DEFAULT_MIGRATIONS_FOLDER,
): void {
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL,
      created_at INTEGER
    )
  `);

  const applied = new Set(
    (
      sqlite.prepare("SELECT hash FROM __drizzle_migrations").all() as Array<{ hash: string }>
    ).map((row) => row.hash),
  );

  const files = readdirSync(folder)
    .filter((name) => /^\d+_.*\.sql$/u.test(name))
    .sort((a, b) => a.localeCompare(b));

  const insert = sqlite.prepare(
    "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)",
  );

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(path.join(folder, file), "utf8");
    sqlite.exec(sql);
    insert.run(file, Date.now());
  }
}
