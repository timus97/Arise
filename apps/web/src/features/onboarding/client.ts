import type { OnboardingBody } from "@arise/domain";
import { api, ApiRequestError } from "../../lib/api.js";
import { deleteAccount } from "../../lib/settings-client.js";
import type { OnboardingSuccess, PlanPreview } from "./types.js";

export const ONBOARDING_PATH = "/api/v1/onboarding";
export const PLAN_PREVIEW_PATH = "/api/v1/plan/preview";
export const PLAN_PATH = "/api/v1/plan";

export const onboardingQueryKey = ["onboarding"] as const;
export const planQueryKey = ["plan"] as const;

export function previewPlan(body: OnboardingBody): Promise<PlanPreview> {
  return api<PlanPreview>(PLAN_PREVIEW_PATH, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function submitOnboarding(body: OnboardingBody): Promise<OnboardingSuccess> {
  return api<OnboardingSuccess>(ONBOARDING_PATH, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

/** Preview first (0 writes), then a single persist PUT. */
export async function submitAfterPreview(body: OnboardingBody): Promise<OnboardingSuccess> {
  await previewPlan(body);
  return submitOnboarding(body);
}

export function getPlan(): Promise<PlanPreview> {
  return api<PlanPreview>(PLAN_PATH);
}

export function deleteOnboardingAccount(): Promise<{ ok: true }> {
  return deleteAccount();
}

export function isPregnancyHardStop(err: unknown): boolean {
  return (
    err instanceof ApiRequestError &&
    err.code === "PREGNANCY_HARD_STOP" &&
    (err.status === 403 || err.status === 409)
  );
}

export function isUnsafeLossRate(err: unknown): err is ApiRequestError {
  return err instanceof ApiRequestError && err.code === "UNSAFE_LOSS_RATE" && err.status === 400;
}

export function isOnboardingRequired(err: unknown): boolean {
  return err instanceof ApiRequestError && err.code === "ONBOARDING_REQUIRED" && err.status === 409;
}
