import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError } from "../../lib/api.js";
import {
  ENSURE_PATH,
  TODAY_PATH,
  completePath,
  ensureToday,
  getToday,
  issueTodayIfNeeded,
  loadTodayWindow,
  shouldEnsure,
  skipPath,
} from "./today-client.js";
import type { TodayPayload } from "./types.js";

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

function payload(over: Partial<TodayPayload> = {}): TodayPayload {
  return {
    date: "2026-08-16",
    needsEnsure: false,
    player: {
      level: 7,
      xp: 980,
      xpToNext: 1120,
      rank: "E",
      title: "Initiate",
      stats: { str: 12.4, agi: 11, vit: 13.1, intl: 10.6, sta: 14.2 },
      streakDays: 4,
      penaltyPoints30d: 1,
    },
    recoveryScore: 72,
    recoveryParts: { sleep: 40, restHr: 15, hrv: 15, load: 20, subjective: 10 },
    planDay: { focus: "mixed", budgetMinutes: 40, hardAllowed: true, isGate: false },
    quests: [],
    pendingModifiers: [],
    suggestRegenerate: false,
    disclaimer: "Arise is not a medical device. Stop if you feel pain, chest pressure, or faintness.",
    ...over,
  };
}

describe("GET-then-ensure client", () => {
  it("uses relative /api/v1/me/today with credentials include", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("/api/v1/me/today");
      expect(String(input)).toBe(TODAY_PATH);
      expect(String(input)).not.toMatch(/8787/);
      expect(init?.credentials).toBe("include");
      expect(init?.method ?? "GET").toBe("GET");
      return jsonResponse(payload({ needsEnsure: true }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const today = await getToday();
    expect(today.needsEnsure).toBe(true);
    expect(today.player.stats.intl).toBe(10.6);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("GETs today first and POSTs ensure only when needsEnsure is true", async () => {
    const calls: Array<{ path: string; method: string }> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      const method = (init?.method ?? "GET").toUpperCase();
      calls.push({ path, method });
      expect(path.startsWith("/api/v1/")).toBe(true);
      expect(path).not.toMatch(/8787/);
      expect(init?.credentials).toBe("include");
      if (path === TODAY_PATH && method === "GET") {
        return jsonResponse(payload({ needsEnsure: true, quests: [] }));
      }
      if (path === ENSURE_PATH && method === "POST") {
        return jsonResponse(payload({ needsEnsure: false }));
      }
      throw new Error(`unexpected ${method} ${path}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const loaded = await loadTodayWindow();
    expect(loaded.kind).toBe("ok");
    if (loaded.kind !== "ok") return;
    expect(shouldEnsure(loaded.today)).toBe(true);
    expect(calls).toEqual([{ path: TODAY_PATH, method: "GET" }]);

    const issued = await issueTodayIfNeeded(loaded.today);
    expect(issued.needsEnsure).toBe(false);
    expect(calls).toEqual([
      { path: TODAY_PATH, method: "GET" },
      { path: ENSURE_PATH, method: "POST" },
    ]);
  });

  it("does not POST ensure when today is already issued", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(TODAY_PATH);
      expect(init?.method ?? "GET").toBe("GET");
      return jsonResponse(payload({ needsEnsure: false }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const today = await getToday();
    const next = await issueTodayIfNeeded(today);
    expect(next.needsEnsure).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("maps 409 ONBOARDING_REQUIRED and PREGNANCY_HARD_STOP without posting ensure", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(
        { error: { code: "ONBOARDING_REQUIRED", message: "Onboarding is required" }, needsOnboarding: true },
        { status: 409 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(loadTodayWindow()).resolves.toEqual({ kind: "onboarding" });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockImplementation(async () =>
      jsonResponse(
        {
          error: {
            code: "PREGNANCY_HARD_STOP",
            message: "Arise is not appropriate during pregnancy. See a clinician for prenatal exercise guidance.",
          },
          actions: ["deleteAccount"],
        },
        { status: 409 },
      ),
    );
    await expect(loadTodayWindow()).resolves.toEqual({ kind: "pregnancy" });
  });

  it("POSTs ensure to the relative path", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("/api/v1/me/today/ensure");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      return jsonResponse(payload({ needsEnsure: false }));
    });
    vi.stubGlobal("fetch", fetchMock);
    await ensureToday();
    expect(completePath("q1")).toBe("/api/v1/quests/q1/complete");
    expect(skipPath("q1")).toBe("/api/v1/quests/q1/skip");
    expect(completePath("q1")).not.toMatch(/8787/);
  });

  it("surfaces DAY_CLOSED as ApiRequestError", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(
        { error: { code: "DAY_CLOSED", message: "This quest is no longer open" } },
        { status: 409 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(getToday()).rejects.toBeInstanceOf(ApiRequestError);
    try {
      await getToday();
    } catch (err) {
      expect(err).toBeInstanceOf(ApiRequestError);
      if (err instanceof ApiRequestError) {
        expect(err.code).toBe("DAY_CLOSED");
        expect(err.status).toBe(409);
      }
    }
  });
});
