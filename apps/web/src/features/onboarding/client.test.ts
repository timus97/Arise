import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError } from "../../lib/api.js";
import {
  ONBOARDING_PATH,
  PLAN_PATH,
  PLAN_PREVIEW_PATH,
  getPlan,
  isPregnancyHardStop,
  isUnsafeLossRate,
  previewPlan,
  submitAfterPreview,
  submitOnboarding,
} from "./client.js";
import { FIXTURE_BODY } from "./fixture.js";
import type { OnboardingSuccess, PlanPreview } from "./types.js";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json", ...init.headers },
  });
}

const preview: PlanPreview = {
  plan: {
    id: "plan1",
    userId: "u1",
    goalId: "g1",
    version: 1,
    startDate: "2026-08-17",
    endDate: "2026-08-23",
    rationale: ["bands", "knee"],
  },
  days: [
    {
      id: "d1",
      planId: "plan1",
      localDate: "2026-08-17",
      focus: "mixed",
      budgetMinutes: 40,
      hardAllowed: true,
      isGate: true,
    },
  ],
};

const success: OnboardingSuccess = {
  ...preview,
  profile: {
    userId: "u1",
    level: 1,
    xp: 0,
    xpIntoLevel: 0,
    rank: "E",
    title: "Initiate",
    stats: { str: 10, agi: 10, vit: 10, intl: 10, sta: 10 },
    streakDays: 0,
    bestStreakDays: 0,
    penaltyPoints30d: 0,
    units: "metric",
    timeZone: "Europe/Stockholm",
    onboardingStatus: "complete",
    parqClear: true,
    age: 29,
  },
};

describe("onboarding client paths", () => {
  it("previews with POST /api/v1/plan/preview and credentials include", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("/api/v1/plan/preview");
      expect(String(input)).toBe(PLAN_PREVIEW_PATH);
      expect(String(input)).not.toMatch(/8787/);
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(JSON.parse(String(init?.body))).toEqual(FIXTURE_BODY);
      return jsonResponse(preview);
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(previewPlan(FIXTURE_BODY)).resolves.toEqual(preview);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("persists with PUT /api/v1/onboarding", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("/api/v1/onboarding");
      expect(String(input)).toBe(ONBOARDING_PATH);
      expect(init?.method).toBe("PUT");
      expect(init?.credentials).toBe("include");
      return jsonResponse(success);
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await submitOnboarding(FIXTURE_BODY);
    expect(result.profile.stats.intl).toBe(10);
    expect(result.profile.stats).not.toHaveProperty("int");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("calls preview before persist", async () => {
    const calls: Array<{ path: string; method: string }> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      const method = (init?.method ?? "GET").toUpperCase();
      calls.push({ path, method });
      expect(path.startsWith("/api/v1/")).toBe(true);
      expect(path).not.toMatch(/8787/);
      expect(init?.credentials).toBe("include");
      if (path === PLAN_PREVIEW_PATH && method === "POST") {
        return jsonResponse(preview);
      }
      if (path === ONBOARDING_PATH && method === "PUT") {
        return jsonResponse(success);
      }
      throw new Error(`unexpected ${method} ${path}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await submitAfterPreview(FIXTURE_BODY);
    expect(result.profile.onboardingStatus).toBe("complete");
    expect(calls).toEqual([
      { path: PLAN_PREVIEW_PATH, method: "POST" },
      { path: ONBOARDING_PATH, method: "PUT" },
    ]);
    expect(calls[0]?.path).toBe("/api/v1/plan/preview");
    expect(calls[1]?.path).toBe("/api/v1/onboarding");
  });

  it("does not persist when preview fails", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe(PLAN_PREVIEW_PATH);
      return jsonResponse(
        {
          error: {
            code: "UNSAFE_LOSS_RATE",
            message: "too fast",
            details: { maxKgPerWeek: 0.72 },
          },
        },
        { status: 400 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(submitAfterPreview(FIXTURE_BODY)).rejects.toBeInstanceOf(ApiRequestError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("maps pregnancy 403 and GET /api/v1/plan", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === ONBOARDING_PATH) {
        return jsonResponse(
          {
            error: {
              code: "PREGNANCY_HARD_STOP",
              message:
                "Arise is not appropriate during pregnancy. See a clinician for prenatal exercise guidance.",
            },
            actions: ["deleteAccount"],
          },
          { status: 403 },
        );
      }
      expect(String(input)).toBe("/api/v1/plan");
      expect(String(input)).toBe(PLAN_PATH);
      expect(init?.method ?? "GET").toBe("GET");
      expect(init?.credentials).toBe("include");
      return jsonResponse(preview);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(submitOnboarding(FIXTURE_BODY)).rejects.toSatisfy((err) => {
      expect(err).toBeInstanceOf(ApiRequestError);
      if (err instanceof ApiRequestError) {
        expect(isPregnancyHardStop(err)).toBe(true);
        expect(err.status).toBe(403);
      }
      return true;
    });

    await expect(getPlan()).resolves.toEqual(preview);
    expect(isUnsafeLossRate(new ApiRequestError(400, "UNSAFE_LOSS_RATE", "too fast", { maxKgPerWeek: 0.72 }))).toBe(
      true,
    );
  });
});
