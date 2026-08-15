import type { NodeDb } from "@arise/db";
import { schedule } from "node-cron";
import type { Env } from "../env.js";
import { evaluatePenalties } from "./evaluate-penalties.js";
import { retain } from "./retain.js";

/** One UTC schedule. No push job. */
export const NIGHTLY_CRON = "15 3 * * *";

export type CronDeps = {
  db: NodeDb;
  env: Env;
};

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
  const task = schedule(
    NIGHTLY_CRON,
    () => {
      void runNightlyJobs(deps);
    },
    { timezone: "UTC" },
  );
  return {
    stop: () => {
      task.stop();
    },
  };
}
