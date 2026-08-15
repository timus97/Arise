import type { NodeDb } from "@arise/db";

type Selectable = {
  prepare: (sql: string) => { get: (...params: unknown[]) => unknown };
};

export function pingReady(db: NodeDb): void {
  const sqlite = db.sqlite as unknown as Selectable;
  const row = sqlite.prepare("SELECT 1 AS ok").get();
  if (!row) {
    throw new Error("SELECT 1 returned no row");
  }
}
