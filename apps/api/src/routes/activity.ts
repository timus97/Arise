import { atomic } from "@arise/db";
import { ActivityStatusPut, ActivityStatusView, type EffectKind } from "@arise/domain";
import { activityStatusFromEffects, activityStatusWindow } from "@arise/engine";
import type { Hono } from "hono";
import { requireSession } from "../middleware/auth.js";
import { ApiError } from "../middleware/error.js";
import { prepare, stmt } from "../sql.js";
import type { AppBindings, AppDeps } from "../types.js";
import { newUlid } from "../ulid.js";
import {
  assertPlayableProfile,
  loadProfile,
  readJsonBody,
  requireUserId,
} from "./onboarding.js";

type EffectRow = {
  kind: string;
  starts_at: string;
  ends_at: string;
  payload_json: string;
};

function parsePayload(raw: string): Record<string, number | string> {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, number | string>;
    }
  } catch {
    /* empty */
  }
  return {};
}

function loadActiveWindows(
  db: AppDeps["db"],
  userId: string,
  nowIso: string,
): Array<{
  kind: EffectKind;
  startsAt: string;
  endsAt: string;
  payload: Record<string, number | string>;
}> {
  const rows = prepare(
    db,
    `SELECT kind, starts_at, ends_at, payload_json
       FROM user_effects
      WHERE user_id = ? AND ends_at > ?`,
  ).all(userId, nowIso) as EffectRow[];
  return rows.map((row) => ({
    kind: row.kind as EffectKind,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    payload: parsePayload(row.payload_json),
  }));
}

export function registerActivityRoutes(app: Hono<AppBindings>, deps: AppDeps): void {
  const gate = requireSession(deps.auth);

  app.get("/api/v1/me/activity-status", gate, (c) => {
    const userId = requireUserId(c.get("userId"));
    const profile = loadProfile(deps.db, userId);
    assertPlayableProfile(profile);
    const now = new Date();
    const view = ActivityStatusView.parse(
      activityStatusFromEffects(loadActiveWindows(deps.db, userId, now.toISOString()), now),
    );
    c.header("Cache-Control", "private, no-store");
    return c.json(view);
  });

  app.put("/api/v1/me/activity-status", gate, async (c) => {
    const userId = requireUserId(c.get("userId"));
    const profile = loadProfile(deps.db, userId);
    assertPlayableProfile(profile);
    const parsed = ActivityStatusPut.safeParse(await readJsonBody(c.req.raw));
    if (!parsed.success) {
      throw new ApiError(400, "VALIDATION", "Invalid activity status", parsed.error.flatten());
    }
    const now = new Date();
    const nowIso = now.toISOString();
    const statements = [
      stmt(
        `UPDATE user_effects
            SET ends_at = ?
          WHERE user_id = ? AND kind IN ('travel_window', 'sick_window') AND ends_at > ?`,
        [nowIso, userId, nowIso],
      ),
    ];
    if (parsed.data.status !== "training") {
      const kind = parsed.data.status === "travel" ? "travel_window" : "sick_window";
      const win = activityStatusWindow({
        now,
        timeZone: profile.time_zone,
        kind,
        days: parsed.data.days ?? 1,
      });
      statements.push(
        stmt(
          `INSERT INTO user_effects (id, user_id, kind, starts_at, ends_at, payload_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            newUlid(),
            userId,
            win.kind,
            win.startsAt,
            win.endsAt,
            JSON.stringify(win.payload),
            nowIso,
          ],
        ),
      );
    }
    await atomic(deps.db, statements);
    const view = ActivityStatusView.parse(
      activityStatusFromEffects(loadActiveWindows(deps.db, userId, now.toISOString()), now),
    );
    return c.json(view);
  });
}
