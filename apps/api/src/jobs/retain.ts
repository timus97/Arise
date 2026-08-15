import type { NodeDb } from "@arise/db";
import { prepare } from "../sql.js";

export const HEALTH_SAMPLE_DELETE_CHUNK = 500;
/** `rate_limits` has no expires_at; drop windows older than 2 days (§ Data Model). */
export const RATE_LIMIT_RETAIN_MS = 2 * 86_400_000;

export type RetainOptions = {
  healthSampleRetentionDays: number;
  auditRetentionDays: number;
  now?: Date;
};

export type RetainResult = {
  healthSamples: number;
  auditLogs: number;
  rateLimits: number;
  authRl: number;
};

export function deleteHealthSampleChunk(
  db: NodeDb,
  ingestedBeforeIso: string,
  limit = HEALTH_SAMPLE_DELETE_CHUNK,
): number {
  const result = prepare(
    db,
    `DELETE FROM health_samples
      WHERE rowid IN (
        SELECT rowid FROM health_samples
         WHERE ingested_at < ?
         LIMIT ?
      )`,
  ).run(ingestedBeforeIso, limit);
  return result.changes;
}

/**
 * Nightly retain. Health samples in chunks of 500; audit by age;
 * `rate_limits` windows past 2 days; `auth_rl` where expires_at < now.
 * Does not issue quests and does not send push.
 */
export function retain(db: NodeDb, opts: RetainOptions): RetainResult {
  const now = opts.now ?? new Date();
  const healthCutoff = new Date(
    now.getTime() - opts.healthSampleRetentionDays * 86_400_000,
  ).toISOString();
  const auditCutoff = new Date(
    now.getTime() - opts.auditRetentionDays * 86_400_000,
  ).toISOString();

  let healthSamples = 0;
  for (;;) {
    const deleted = deleteHealthSampleChunk(db, healthCutoff);
    healthSamples += deleted;
    if (deleted < HEALTH_SAMPLE_DELETE_CHUNK) break;
  }

  const auditLogs = prepare(db, `DELETE FROM audit_logs WHERE created_at < ?`).run(
    auditCutoff,
  ).changes;
  const rateLimits = prepare(
    db,
    `DELETE FROM rate_limits WHERE window_start < ?`,
  ).run(now.getTime() - RATE_LIMIT_RETAIN_MS).changes;
  const authRl = prepare(db, `DELETE FROM auth_rl WHERE expires_at < ?`).run(
    now.getTime(),
  ).changes;

  return { healthSamples, auditLogs, rateLimits, authRl };
}
