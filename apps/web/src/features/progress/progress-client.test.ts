import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError } from "../../lib/api.js";
import { PROGRESS_PATH, getProgress, loadProgress } from "./progress-client.js";
import type { ProgressPayload } from "./types.js";

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

function payload(over: Partial<ProgressPayload> = {}): ProgressPayload {
  return {
    from: "2026-05-19",
    to: "2026-08-16",
    days: 90,
    player: {
      level: 7,
      xp: 980,
      rank: "E",
      title: "Initiate",
      stats: { str: 12.4, agi: 11, vit: 13.1, intl: 10.6, sta: 14.2 },
      streakDays: 4,
    },
    snapshots: [],
    rankEvents: [],
    xpEvents: [],
    ...over,
  };
}

describe("GET /api/v1/progress client", () => {
  it("uses relative /api/v1/progress with credentials include", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("/api/v1/progress");
      expect(String(input)).toBe(PROGRESS_PATH);
      expect(String(input)).not.toMatch(/8787/);
      expect(init?.credentials).toBe("include");
      expect(init?.method ?? "GET").toBe("GET");
      return jsonResponse(payload());
    });
    vi.stubGlobal("fetch", fetchMock);

    const body = await getProgress();
    expect(body.days).toBe(90);
    expect(body.player.stats.intl).toBe(10.6);
    expect(body.player.stats).not.toHaveProperty("int");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("maps 409 ONBOARDING_REQUIRED and PREGNANCY_HARD_STOP", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(
        { error: { code: "ONBOARDING_REQUIRED", message: "Onboarding is required" } },
        { status: 409 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(loadProgress()).resolves.toEqual({ kind: "onboarding" });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockImplementation(async () =>
      jsonResponse(
        {
          error: {
            code: "PREGNANCY_HARD_STOP",
            message:
              "Arise is not appropriate during pregnancy. See a clinician for prenatal exercise guidance.",
          },
          actions: ["deleteAccount"],
        },
        { status: 409 },
      ),
    );
    await expect(loadProgress()).resolves.toEqual({ kind: "pregnancy" });
  });

  it("surfaces other failures as ApiRequestError", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ error: { code: "UNAUTHORIZED", message: "Sign in" } }, { status: 401 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(getProgress()).rejects.toBeInstanceOf(ApiRequestError);
    try {
      await getProgress();
    } catch (err) {
      expect(err).toBeInstanceOf(ApiRequestError);
      if (err instanceof ApiRequestError) {
        expect(err.status).toBe(401);
        expect(err.code).toBe("UNAUTHORIZED");
      }
    }
  });
});
