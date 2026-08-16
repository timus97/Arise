import type { NodeDb } from "@arise/db";
import { spawn, type SpawnOptions } from "node:child_process";
import { schedule } from "node-cron";
import type { Env } from "../env.js";
import { evaluatePenalties } from "./evaluate-penalties.js";
import { retain } from "./retain.js";

/** Retain + penalties. No push job. */
export const NIGHTLY_CRON = "15 3 * * *";
/** sqlite3 .backup into /data/backups. D1 Time Travel is not a backup. */
export const BACKUP_CRON = "45 3 * * *";

export type CronDeps = {
  db: NodeDb;
  env: Env;
};

export type SpawnImpl = (
  command: string,
  args: readonly string[],
  options: SpawnOptions,
) => ReturnType<typeof spawn>;

export function backupSqliteBin(): string {
  return process.env.BACKUP_SQLITE_BIN ?? "backup-sqlite";
}

function logJobError(job: string, err: unknown): void {
  const msg = err instanceof Error ? err.message : "job failed";
  console.error(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: "error",
      code: "CRON_JOB",
      job,
      msg,
    }),
  );
}

/** `child_process.spawn`s the image `backup-sqlite` script. Failures are isolated. */
export function runSqliteBackup(
  env: Env,
  spawnImpl: SpawnImpl = spawn,
): Promise<void> {
  return new Promise((resolve) => {
    let child: ReturnType<typeof spawn>;
    try {
      child = spawnImpl(backupSqliteBin(), [], {
        env: { ...process.env, DATABASE_PATH: env.DATABASE_PATH },
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (err) {
      logJobError("backup-sqlite", err);
      resolve();
      return;
    }
    child.on("error", (err) => {
      logJobError("backup-sqlite", err);
      resolve();
    });
    child.on("close", (code) => {
      if (code !== 0) {
        logJobError("backup-sqlite", new Error(`backup-sqlite exited ${code ?? "null"}`));
      }
      resolve();
    });
  });
}

/** retain, then evaluate-penalties (25 users/tick). Failures are isolated. */
export async function runNightlyJobs(deps: CronDeps, now = new Date()): Promise<void> {
  try {
    retain(deps.db, {
      healthSampleRetentionDays: deps.env.HEALTH_SAMPLE_RETENTION_DAYS,
      auditRetentionDays: deps.env.AUDIT_RETENTION_DAYS,
      now,
    });
  } catch (err) {
    logJobError("retain", err);
  }
  try {
    await evaluatePenalties(deps.db, now);
  } catch (err) {
    logJobError("evaluate-penalties", err);
  }
}

export function startNodeCron(deps: CronDeps): { stop: () => void } {
  const nightly = schedule(
    NIGHTLY_CRON,
    () => {
      void runNightlyJobs(deps);
    },
    { timezone: "UTC" },
  );
  const backup = schedule(
    BACKUP_CRON,
    () => {
      void runSqliteBackup(deps.env);
    },
    { timezone: "UTC" },
  );
  return {
    stop: () => {
      nightly.stop();
      backup.stop();
    },
  };
}
