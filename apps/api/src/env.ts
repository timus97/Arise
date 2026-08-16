import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const boolFlag = z.enum(["true", "false"]).default("false");

export const EnvSchema = z.object({
  RUNTIME: z.enum(["node", "worker"]).default("node"),
  SERVE_STATIC: boolFlag,
  WEB_DIST: z.string().default(""),
  APP_ORIGIN: z.string().url(),
  BETTER_AUTH_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(16),
  DATABASE_PATH: z.string().min(1),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  PORT: z.coerce.number().int().positive().default(8787),
  REGISTER_INVITE_CODE: z.string().default(""),
  ALLOW_WORKER_PASSWORD_AUTH: boolFlag,
  SMTP_URL: z.string().default(""),
  SMTP_FROM: z.string().default(""),
  HEALTH_SAMPLE_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
  AUDIT_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
  MAX_IMPORT_SAMPLES_PER_DAY: z.coerce.number().int().positive().default(5000),
  FEATURE_WEB_BLUETOOTH: boolFlag,
  FEATURE_PUSH: boolFlag,
});

export type Env = z.infer<typeof EnvSchema>;

/** Parse KEY=VALUE lines. Existing process env is not changed by this helper. */
export function parseDotEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = stripInlineComment(rawLine.trim());
    if (line === "" || line.startsWith("#")) continue;
    const cut = line.indexOf("=");
    if (cut < 1) continue;
    const key = line.slice(0, cut).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    out[key] = unquote(line.slice(cut + 1).trim());
  }
  return out;
}

/** Fill only missing/empty keys. Already-exported vars win. */
export function applyDotEnv(
  parsed: Record<string, string>,
  env: Record<string, string | undefined> = process.env,
): string[] {
  const applied: string[] = [];
  for (const [key, value] of Object.entries(parsed)) {
    if (env[key] !== undefined && env[key] !== "") continue;
    env[key] = value;
    applied.push(key);
  }
  return applied;
}

/**
 * Load repo-root / cwd `.env` so `cp .env.example .env` + `pnpm --filter api dev`
 * works without exporting vars. Compose is unchanged (`env_file`).
 */
export function loadDotEnvFiles(
  env: Record<string, string | undefined> = process.env,
  extraPaths: string[] = [],
): string[] {
  const loaded: string[] = [];
  const candidates = extraPaths.length > 0 ? extraPaths : defaultEnvPaths();
  for (const path of uniqueExisting(candidates)) {
    applyDotEnv(parseDotEnv(readFileSync(path, "utf8")), env);
    loaded.push(path);
  }
  return loaded;
}

function defaultEnvPaths(): string[] {
  const here = dirname(fileURLToPath(import.meta.url));
  return [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "..", "..", ".env"),
    resolve(here, "..", "..", "..", ".env"),
  ];
}

function uniqueExisting(paths: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const path of paths) {
    const abs = resolve(path);
    if (seen.has(abs) || !existsSync(abs)) continue;
    seen.add(abs);
    out.push(abs);
  }
  return out;
}

function stripInlineComment(line: string): string {
  if (line.startsWith("#")) return line;
  const hash = line.indexOf(" #");
  if (hash === -1) return line;
  const before = line.slice(0, hash);
  if ((before.match(/"/g) ?? []).length % 2 === 1) return line;
  if ((before.match(/'/g) ?? []).length % 2 === 1) return line;
  return before.trimEnd();
}

function unquote(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

export function parseEnv(
  raw: Record<string, string | undefined> = process.env,
): Env {
  return EnvSchema.parse({
    RUNTIME: emptyToUndef(raw.RUNTIME),
    SERVE_STATIC: emptyToUndef(raw.SERVE_STATIC),
    WEB_DIST: raw.WEB_DIST,
    APP_ORIGIN: raw.APP_ORIGIN,
    BETTER_AUTH_URL: raw.BETTER_AUTH_URL,
    BETTER_AUTH_SECRET: raw.BETTER_AUTH_SECRET,
    DATABASE_PATH: raw.DATABASE_PATH,
    LOG_LEVEL: emptyToUndef(raw.LOG_LEVEL),
    PORT: emptyToUndef(raw.PORT),
    REGISTER_INVITE_CODE: raw.REGISTER_INVITE_CODE,
    ALLOW_WORKER_PASSWORD_AUTH: emptyToUndef(raw.ALLOW_WORKER_PASSWORD_AUTH),
    SMTP_URL: raw.SMTP_URL,
    SMTP_FROM: raw.SMTP_FROM,
    HEALTH_SAMPLE_RETENTION_DAYS: emptyToUndef(raw.HEALTH_SAMPLE_RETENTION_DAYS),
    AUDIT_RETENTION_DAYS: emptyToUndef(raw.AUDIT_RETENTION_DAYS),
    MAX_IMPORT_SAMPLES_PER_DAY: emptyToUndef(raw.MAX_IMPORT_SAMPLES_PER_DAY),
    FEATURE_WEB_BLUETOOTH: emptyToUndef(raw.FEATURE_WEB_BLUETOOTH),
    FEATURE_PUSH: emptyToUndef(raw.FEATURE_PUSH),
  });
}

function emptyToUndef(value: string | undefined): string | undefined {
  return value === undefined || value === "" ? undefined : value;
}
