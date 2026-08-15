import type { NodeDb } from "@arise/db";
import { createApp } from "./app.js";
import { createAuth } from "./auth.js";
import { createAuthRlStorage } from "./auth-rl.js";
import type { Env } from "./env.js";

/**
 * Compile-only later option (Workers Paid). Not the v1 launch host.
 * Do not deploy to Workers Free — default scrypt will CPU-abort
 * (better-auth#8860 class). Password routes return 501 unless
 * ALLOW_WORKER_PASSWORD_AUTH=true (enforced in the auth façade).
 */
export function createWorkerApp(env: Env, db: NodeDb) {
  const auth = createAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    appOrigin: env.APP_ORIGIN,
    db: db.orm,
    secondaryStorage: createAuthRlStorage(db),
  });
  return createApp({ env, db, auth, version: "0.0.0" });
}

export default {
  fetch(): Response {
    return Response.json(
      {
        error: {
          code: "AUTH_RUNTIME_UNSUPPORTED",
          message: "Worker host is not the v1 launch path",
        },
      },
      { status: 501 },
    );
  },
};
