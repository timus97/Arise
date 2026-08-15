import { createMiddleware } from "hono/factory";
import type { Auth } from "../auth.js";
import type { AppBindings } from "../types.js";
import { ApiError } from "./error.js";

export function requireSession(auth: Auth) {
  return createMiddleware<AppBindings>(async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
    }
    c.set("userId", session.user.id);
    await next();
  });
}
