import { api, ApiRequestError } from "../../lib/api.js";
import type { QuestEffort, QuestMutationResult, SkipReason, TodayPayload } from "./types.js";

export const TODAY_PATH = "/api/v1/me/today";
export const ENSURE_PATH = "/api/v1/me/today/ensure";
export const REGENERATE_PATH = "/api/v1/plan/regenerate";
export const todayQueryKey = ["me", "today"] as const;

export function completePath(questId: string): string {
  return `/api/v1/quests/${questId}/complete`;
}

export function skipPath(questId: string): string {
  return `/api/v1/quests/${questId}/skip`;
}

export function shouldEnsure(payload: Pick<TodayPayload, "needsEnsure">): boolean {
  return payload.needsEnsure === true;
}

export function newClientId(): string {
  return globalThis.crypto.randomUUID();
}

export function getToday(): Promise<TodayPayload> {
  return api<TodayPayload>(TODAY_PATH);
}

export function ensureToday(): Promise<TodayPayload> {
  return api<TodayPayload>(ENSURE_PATH, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/** GET first. POST ensure only when the payload says needsEnsure. Never auto-regenerate. */
export async function issueTodayIfNeeded(payload: TodayPayload): Promise<TodayPayload> {
  if (!shouldEnsure(payload)) return payload;
  return ensureToday();
}

export type TodayGate = "ok" | "onboarding" | "pregnancy";

export function todayGateFromError(err: unknown): TodayGate | null {
  if (!(err instanceof ApiRequestError) || err.status !== 409) return null;
  if (err.code === "ONBOARDING_REQUIRED") return "onboarding";
  if (err.code === "PREGNANCY_HARD_STOP") return "pregnancy";
  return null;
}

export async function loadTodayWindow(): Promise<
  | { kind: "ok"; today: TodayPayload }
  | { kind: "onboarding" }
  | { kind: "pregnancy" }
> {
  try {
    const today = await getToday();
    return { kind: "ok", today };
  } catch (err) {
    const gate = todayGateFromError(err);
    if (gate === "onboarding") return { kind: "onboarding" };
    if (gate === "pregnancy") return { kind: "pregnancy" };
    throw err;
  }
}

export function completeQuest(
  questId: string,
  effort: QuestEffort,
  clientId: string = newClientId(),
): Promise<QuestMutationResult> {
  return api<QuestMutationResult>(completePath(questId), {
    method: "POST",
    body: JSON.stringify({ clientId, effort }),
  });
}

export function skipQuest(questId: string, reason: SkipReason): Promise<QuestMutationResult> {
  return api<QuestMutationResult>(skipPath(questId), {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export function regenerateWeek(): Promise<unknown> {
  return api(REGENERATE_PATH, {
    method: "POST",
    body: JSON.stringify({ reason: "schedule_change" }),
  });
}

export function isDayClosedError(err: unknown): boolean {
  return err instanceof ApiRequestError && err.status === 409 && err.code === "DAY_CLOSED";
}
