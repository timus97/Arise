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
