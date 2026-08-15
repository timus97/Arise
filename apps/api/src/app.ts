import { Hono } from "hono";
import { errorBody, handleError } from "./middleware/error.js";
import { pingReady } from "./middleware/ready.js";
import { timingMiddleware } from "./middleware/timing.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerExportRoutes } from "./routes/export.js";
import { registerMeRoutes } from "./routes/me.js";
import { registerOnboardingRoutes } from "./routes/onboarding.js";
import { registerPlanRoutes } from "./routes/plan.js";
import { registerProgressRoutes } from "./routes/progress.js";
import { registerQuestRoutes } from "./routes/quests.js";
import { registerTodayRoutes } from "./routes/today.js";
import type { AppBindings, AppDeps } from "./types.js";

const HEALTH_WINDOW_MS = 60_000;
const HEALTH_MAX_PER_WINDOW = 30;

export function createApp(deps: AppDeps): Hono<AppBindings> {
  const app = new Hono<AppBindings>();
  const healthHits = new Map<string, number[]>();

  app.use("*", async (c, next) => {
    c.set("requestId", crypto.randomUUID());
    await next();
  });
  app.use("*", timingMiddleware(deps));
  app.onError(handleError);

  app.get("/health", (c) => {
    const ip = clientIp(c.req.header("x-forwarded-for"), c.req.header("cf-connecting-ip"));
    if (!allowHealth(healthHits, ip)) {
      return c.json(errorBody("RATE_LIMITED", "Too many health checks"), 429);
    }
    return c.json({
      ok: true,
      runtime: deps.env.RUNTIME,
      version: deps.version,
    });
  });

  app.get("/ready", (c) => {
    try {
      pingReady(deps.db);
      return c.json({ ok: true, db: "ok" });
    } catch {
      return c.json(errorBody("DB_UNAVAILABLE", "Database not ready"), 503);
    }
  });

  registerAuthRoutes(app, deps);
  registerOnboardingRoutes(app, deps);
  registerPlanRoutes(app, deps);
  registerTodayRoutes(app, deps);
  registerQuestRoutes(app, deps);
  registerProgressRoutes(app, deps);
  registerExportRoutes(app, deps);
  registerMeRoutes(app, deps);

  return app;
}

function clientIp(
  forwarded: string | undefined,
  cfConnecting: string | undefined,
): string {
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first;
  return cfConnecting ?? "127.0.0.1";
}

function allowHealth(store: Map<string, number[]>, ip: string): boolean {
  const now = Date.now();
  const prior = store.get(ip) ?? [];
  const recent = prior.filter((ts) => now - ts < HEALTH_WINDOW_MS);
  if (recent.length >= HEALTH_MAX_PER_WINDOW) {
    store.set(ip, recent);
    return false;
  }
  recent.push(now);
  store.set(ip, recent);
  return true;
}
