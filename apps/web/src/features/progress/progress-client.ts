import { api, ApiRequestError } from "../../lib/api.js";
import type { ProgressPayload } from "./types.js";

export const PROGRESS_PATH = "/api/v1/progress";
export const progressQueryKey = ["progress"] as const;

export function getProgress(): Promise<ProgressPayload> {
  return api<ProgressPayload>(PROGRESS_PATH);
}

export type ProgressGate = "ok" | "onboarding" | "pregnancy";

export function progressGateFromError(err: unknown): ProgressGate | null {
  if (!(err instanceof ApiRequestError) || err.status !== 409) return null;
  if (err.code === "ONBOARDING_REQUIRED") return "onboarding";
  if (err.code === "PREGNANCY_HARD_STOP") return "pregnancy";
  return null;
}

export async function loadProgress(): Promise<
  | { kind: "ok"; progress: ProgressPayload }
  | { kind: "onboarding" }
  | { kind: "pregnancy" }
> {
  try {
    const progress = await getProgress();
    return { kind: "ok", progress };
  } catch (err) {
    const gate = progressGateFromError(err);
    if (gate === "onboarding") return { kind: "onboarding" };
    if (gate === "pregnancy") return { kind: "pregnancy" };
    throw err;
  }
}
