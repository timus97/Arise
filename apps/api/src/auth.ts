import { account, session, user, verification } from "@arise/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";

export function createAuth(opts: {
  secret: string;
  baseURL: string; // same origin the browser sees, e.g. http://localhost:5173
  appOrigin: string; // identical to APP_ORIGIN
  db: unknown; // drizzle / better-auth adapter
  /** Required when RUNTIME=worker. Omit on Node (in-memory is sticky). */
  secondaryStorage?: {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string, ttl?: number) => Promise<void>;
    delete: (key: string) => Promise<void>;
  };
  /** Test suites share one in-process limiter; disable so files can sign up freely. */
  disableRateLimit?: boolean;
}) {
  const secure = opts.appOrigin.startsWith("https");
  return betterAuth({
    appName: "Arise",
    secret: opts.secret,
    baseURL: opts.baseURL,
    basePath: "/api/v1/auth",
    trustedOrigins: [opts.appOrigin],
    database: drizzleAdapter(opts.db as Parameters<typeof drizzleAdapter>[0], {
      provider: "sqlite",
      schema: { user, session, account, verification },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      // default hasher = scrypt. Do not override on Node.
    },
    // user.email remains required+unique (Better Auth default). Do not set email optional.
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: true, maxAge: 60 * 5 },
    },
    secondaryStorage: opts.secondaryStorage, // Worker: D1 table auth_rl; Node: undefined
    rateLimit: {
      enabled: opts.disableRateLimit !== true,
      window: 60,
      max: 10,
    },
    advanced: {
      cookiePrefix: "arise",
      useSecureCookies: secure,
      cookies: {
        session_token: {
          name: "arise.session",
          options: {
            httpOnly: true,
            sameSite: "lax",
            secure,
            path: "/",
          },
        },
      },
    },
    plugins: [username()],
  });
}

export type Auth = ReturnType<typeof createAuth>;
