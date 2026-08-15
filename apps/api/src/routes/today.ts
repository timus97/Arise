import type { Hono } from "hono";
import { requireSession } from "../middleware/auth.js";
import type { AppBindings, AppDeps } from "../types.js";
import {
  MEDICAL_DISCLAIMER,
  assertPlayableProfile,
  loadProfile,
  requireUserId,
} from "./onboarding.js";

const TODAY_STUB = {
  needsEnsure: true,
  quests: [] as const,
  disclaimer: MEDICAL_DISCLAIMER,
};

export function registerTodayRoutes(app: Hono<AppBindings>, deps: AppDeps): void {
  const gate = requireSession(deps.auth);

  app.get("/api/v1/me/today", gate, (c) => {
    const userId = requireUserId(c.get("userId"));
    const profile = loadProfile(deps.db, userId);
    assertPlayableProfile(profile);
    c.header("Cache-Control", "private, no-store");
    return c.json(TODAY_STUB);
  });

  app.post("/api/v1/me/today/ensure", gate, (c) => {
    const userId = requireUserId(c.get("userId"));
    const profile = loadProfile(deps.db, userId);
    assertPlayableProfile(profile);
    c.header("Cache-Control", "private, no-store");
    return c.json(TODAY_STUB);
  });
}
