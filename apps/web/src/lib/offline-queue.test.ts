import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError } from "./api.js";
import {
  completeQuestOrQueue,
  drainOutbox,
  enqueueComplete,
  enqueueManualSample,
  enqueueSkip,
  memoryOutboxStore,
  outboxActionForError,
  skipQuestOrQueue,
} from "./offline-queue.js";
import { DAY_CLOSED_TOAST } from "../features/system-window/copy.js";

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

describe("outbox DAY_CLOSED", () => {
  it("drops 409 DAY_CLOSED items and reports The day closed.", async () => {
    const store = memoryOutboxStore();
    await enqueueComplete("q1", "full", "11111111-1111-4111-8111-111111111111", store);
    await enqueueSkip("q2", "busy", store);
    await enqueueManualSample(
      {
        metric: "steps",
        value: 8421,
        unit: "count",
        startAt: "2026-08-14T00:00:00.000Z",
        endAt: "2026-08-14T20:00:00.000Z",
      },
      store,
    );

    const closed: string[] = [];
    const posted: string[] = [];
    const result = await drainOutbox({
      store,
      post: async (item) => {
        posted.push(item.kind);
        if (item.kind === "complete") {
          throw new ApiRequestError(409, "DAY_CLOSED", "This quest is no longer open");
        }
        return {};
      },
      onDayClosed: () => closed.push(DAY_CLOSED_TOAST),
    });

    expect(outboxActionForError(new ApiRequestError(409, "DAY_CLOSED", "closed"))).toBe("drop");
    expect(result.dropped).toBe(1);
    expect(result.sent).toBe(2);
    expect(result.remaining).toBe(0);
    expect(closed).toEqual(["The day closed."]);
    expect(DAY_CLOSED_TOAST).toBe("The day closed.");
    expect(posted).toEqual(["complete", "skip", "manual_sample"]);
    expect(await store.list()).toEqual([]);
  });

  it("keeps the item when the post is a network error", async () => {
    const store = memoryOutboxStore();
    await enqueueSkip("q9", "pain", store);
    const result = await drainOutbox({
      store,
      post: async () => {
        throw new TypeError("Failed to fetch");
      },
    });
    expect(result.sent).toBe(0);
    expect(result.dropped).toBe(0);
    expect(result.remaining).toBe(1);
    expect((await store.list())[0]?.kind).toBe("skip");
  });
});

describe("complete/skip queue when offline", () => {
  it("queues complete and skip without breaking the online POST path", async () => {
    const store = memoryOutboxStore();
    const queued = await completeQuestOrQueue("q1", "partial", "22222222-2222-4222-8222-222222222222", {
      store,
      online: false,
    });
    expect(queued).toEqual({ kind: "queued" });
    expect((await store.list())[0]).toMatchObject({
      kind: "complete",
      questId: "q1",
      effort: "partial",
    });

    const skipQueued = await skipQuestOrQueue("q1", "rest_planned", { store, online: false });
    expect(skipQueued).toEqual({ kind: "queued" });
    expect((await store.list()).map((item) => item.kind)).toEqual(["complete", "skip"]);

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("/api/v1/quests/q3/complete");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      const body = JSON.parse(String(init?.body)) as { effort: string; clientId: string };
      expect(body.effort).toBe("full");
      expect(body.clientId).toMatch(/^[0-9a-f-]{36}$/i);
      return jsonResponse({
        quest: {
          id: "q3",
          userId: "u1",
          localDate: "2026-08-16",
          templateId: "str_goblet_squat_l1",
          title: "Goblet squat",
          flavor: "Sit and stand with a pack.",
          kind: "strength",
          status: "completed",
          skipReason: null,
          xpReward: 55,
        },
        player: {
          level: 7,
          xp: 1035,
          xpToNext: 1120,
          rank: "E",
          title: "Initiate",
          stats: { str: 12, agi: 11, vit: 13, intl: 10.6, sta: 14 },
          streakDays: 4,
          penaltyPoints30d: 1,
        },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const online = await completeQuestOrQueue("q3", "full", "33333333-3333-4333-8333-333333333333", {
      store,
      online: true,
    });
    expect(online.kind).toBe("ok");
    if (online.kind === "ok") {
      expect(online.result.quest.status).toBe("completed");
      expect(online.result.player.stats.intl).toBe(10.6);
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((await store.list()).map((item) => item.kind)).toEqual(["complete", "skip"]);
  });
});
