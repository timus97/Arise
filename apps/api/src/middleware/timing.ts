import { createMiddleware } from "hono/factory";
import type { AppBindings, AppDeps } from "../types.js";

export function timingMiddleware(deps: AppDeps) {
  return createMiddleware<AppBindings>(async (c, next) => {
    const t0 = performance.now();
    try {
      await next();
    } finally {
      const ms = Math.round(performance.now() - t0);
      c.header("Server-Timing", `app;dur=${ms}`);
      if (deps.env.LOG_LEVEL !== "error") {
        const userId = c.get("userId");
        console.log(
          JSON.stringify({
            ts: new Date().toISOString(),
            level: "info",
            requestId: c.get("requestId"),
            ...(typeof userId === "string" ? { userId } : {}),
            route: c.req.path,
            ms,
            msg: "request",
          }),
        );
      }
    }
  });
}
