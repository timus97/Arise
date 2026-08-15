import type { Hono } from "hono";
import { z } from "zod";
import { requireSession } from "../middleware/auth.js";
import { ApiError } from "../middleware/error.js";
import {
  ensureToday,
  parseLocalDateParam,
  readTodayWindow,
  recordEnsureDogfood,
  resetQueryBudget,
} from "../today-service.js";
import type { AppBindings, AppDeps } from "../types.js";
import { assertPlayableProfile, loadProfile, requireUserId } from "./onboarding.js";

const EnsureBody = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

function noStore(c: { header: (name: string, value: string) => void }): void {
  c.header("Cache-Control", "private, no-store");
}

export function registerTodayRoutes(app: Hono<AppBindings>, deps: AppDeps): void {
  const gate = requireSession(deps.auth);

  app.get("/api/v1/me/today", gate, (c) => {
    const budget = resetQueryBudget();
    const userId = requireUserId(c.get("userId"));
    const profile = loadProfile(deps.db, userId);
    assertPlayableProfile(profile);
    const date = parseLocalDateParam(c.req.query("date"), "date");
    const payload = readTodayWindow({
      db: deps.db,
      profile,
      date,
      now: new Date(),
      budget,
    });
    noStore(c);
    return c.json(payload);
  });

  app.post("/api/v1/me/today/ensure", gate, async (c) => {
    const budget = resetQueryBudget();
    const userId = requireUserId(c.get("userId"));
    const profile = loadProfile(deps.db, userId);
    assertPlayableProfile(profile);
    const raw = await readEnsureBody(c.req.raw);
    const parsed = EnsureBody.safeParse(raw);
    if (!parsed.success) {
      throw new ApiError(400, "VALIDATION", "Invalid ensure body", parsed.error.flatten());
    }
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: profile.time_zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    if (parsed.data.date !== undefined && parsed.data.date !== today) {
      throw new ApiError(400, "ENSURE_DATE_NOT_TODAY", "Ensure can only issue the local today");
    }
    const t0 = performance.now();
    const payload = await ensureToday({
      db: deps.db,
      profile,
      now: new Date(),
      budget,
    });
    recordEnsureDogfood(Math.round(performance.now() - t0), budget.statements);
    noStore(c);
    return c.json(payload);
  });
}

async function readEnsureBody(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.trim() === "") return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError(400, "VALIDATION", "Invalid JSON body");
  }
}

