import { createNodeDb, migrate, type NodeDb } from "@arise/db";
import { hashPassword } from "better-auth/crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "../env.js";
import { prepare } from "../sql.js";

const MIN_PASSWORD_LENGTH = 10;
const USAGE =
  "Usage: pnpm --filter api exec tsx src/cli/reset-password.ts --identifier USER --password -";

type UserMatch = {
  id: string;
  email: string;
  username: string | null;
};

export function parseResetArgs(argv: string[]): { identifier: string; password: string } {
  const identifier = readFlag(argv, "--identifier");
  const password = readFlag(argv, "--password");
  if (identifier === undefined || password === undefined) {
    throw new Error(USAGE);
  }
  if (identifier.trim() === "") {
    throw new Error("Identifier is required");
  }
  return { identifier: identifier.trim(), password };
}

export async function readStdinPassword(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8").replace(/\r?\n$/, "");
}

export async function resetPassword(args: {
  db: NodeDb;
  identifier: string;
  password: string;
}): Promise<{ userId: string; identifier: string }> {
  if (args.password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  const user = prepare(
    args.db,
    `SELECT id, email, username FROM user WHERE email = ? OR username = ? LIMIT 1`,
  ).get(args.identifier, args.identifier) as UserMatch | undefined;
  if (user === undefined) {
    throw new Error("No user matching identifier");
  }

  const hashed = await hashPassword(args.password);
  const now = Date.now();
  const result = prepare(
    args.db,
    `UPDATE account
        SET password = ?, updated_at = ?
      WHERE user_id = ? AND provider_id = 'credential'`,
  ).run(hashed, now, user.id);
  if (result.changes === 0) {
    throw new Error("No credential account for identifier");
  }
  return { userId: user.id, identifier: user.username ?? user.email };
}

function readFlag(argv: string[], name: string): string | undefined {
  const idx = argv.indexOf(name);
  if (idx === -1) return undefined;
  return argv[idx + 1];
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  if (entry === undefined) return false;
  return /(?:^|[\\/])reset-password\.ts$/.test(entry);
}

async function main(): Promise<void> {
  const parsed = parseResetArgs(process.argv.slice(2));
  const password = parsed.password === "-" ? await readStdinPassword() : parsed.password;
  const env = parseEnv();
  if (env.DATABASE_PATH !== ":memory:") {
    mkdirSync(path.dirname(env.DATABASE_PATH), { recursive: true });
  }
  const db = createNodeDb(env.DATABASE_PATH);
  migrate(db.sqlite as Parameters<typeof migrate>[0]);
  const result = await resetPassword({
    db,
    identifier: parsed.identifier,
    password,
  });
  console.log(`Password reset for ${result.identifier}`);
}

if (isMainModule()) {
  void main().catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : "reset-password failed";
    console.error(msg);
    process.exitCode = 1;
  });
}
