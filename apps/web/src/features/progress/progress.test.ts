import { STAT_KEYS, STAT_LABELS } from "@arise/ui";
import { describe, expect, it } from "vitest";
import * as copy from "./copy.js";
import {
  PROGRESS_FORBIDDEN,
  PROGRESS_LEDE,
  RANK_TITLES,
  RANK_TOOLTIP,
} from "./copy.js";
import {
  PROGRESS_DAYS,
  labeledStats,
  presentRankEvent,
  presentXpEvent,
  progressWindowLabel,
  rankLadder,
  titleForRank,
} from "./presentation.js";
import type { ProgressPayload } from "./types.js";

function progress(over: Partial<ProgressPayload> = {}): ProgressPayload {
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
    snapshots: [
      {
        localDate: "2026-08-10",
        level: 7,
        xp: 900,
        rank: "E",
        stats: { str: 12, agi: 11, vit: 13, intl: 10.4, sta: 14 },
      },
    ],
    rankEvents: [
      {
        id: "rk1",
        fromRank: "E",
        toRank: "D",
        reason: "level",
        createdAt: "2026-08-01T12:00:00.000Z",
      },
    ],
    xpEvents: [
      {
        id: "xp1",
        questId: "q1",
        delta: 40,
        reason: "complete",
        createdAt: "2026-08-02T12:00:00.000Z",
      },
    ],
    ...over,
  };
}

describe("intl not int in rendered labels", () => {
  it("labels stats str agi vit intl sta and never int", () => {
    expect(STAT_KEYS).toEqual(["str", "agi", "vit", "intl", "sta"]);
    expect(STAT_LABELS.intl).toBe("INTL");
    expect(STAT_LABELS).not.toHaveProperty("int");
    expect(Object.values(STAT_LABELS).join(" ")).toMatch(/INTL/);
    expect(Object.values(STAT_LABELS).join(" ")).not.toMatch(/\bINT\b/);
    expect(JSON.stringify(STAT_LABELS)).not.toContain('"int"');

    const rows = labeledStats(progress().player.stats);
    expect(rows.map((row) => row.key)).toEqual(["str", "agi", "vit", "intl", "sta"]);
    expect(rows.map((row) => row.label)).toEqual(["STR", "AGI", "VIT", "INTL", "STA"]);
    expect(rows.some((row) => row.key === "intl" && row.label === "INTL")).toBe(true);
    expect(rows.some((row) => row.label === "INT" || row.label === "int")).toBe(false);
    expect(JSON.stringify(rows)).not.toContain('"int"');
    expect(progress().player.stats).toHaveProperty("intl");
    expect(progress().player.stats).not.toHaveProperty("int");
  });
});

describe("rank history titles E–S", () => {
  it("maps ranks to Initiate through Sovereign when events have no title", () => {
    expect(RANK_TITLES).toEqual({
      E: "Initiate",
      D: "Adept",
      C: "Operative",
      B: "Veteran",
      A: "Elite",
      S: "Sovereign",
    });
    expect(rankLadder()).toEqual([
      { rank: "E", title: "Initiate" },
      { rank: "D", title: "Adept" },
      { rank: "C", title: "Operative" },
      { rank: "B", title: "Veteran" },
      { rank: "A", title: "Elite" },
      { rank: "S", title: "Sovereign" },
    ]);
    expect(titleForRank("E")).toBe("Initiate");
    expect(titleForRank("S")).toBe("Sovereign");
    expect(titleForRank("D", "")).toBe("Adept");
    expect(titleForRank("C", "Operative")).toBe("Operative");
    expect(RANK_TOOLTIP).toContain("14-day");

    const view = presentRankEvent(progress().rankEvents[0]!);
    expect(view.line).toBe("E Initiate → D Adept");
    expect(view.reasonLabel).toBe("Level");
    expect(view.createdAt).toBe("2026-08-01");
  });
});

describe("90-day window and XP", () => {
  it("uses the last 90 days and presents XP events", () => {
    expect(PROGRESS_DAYS).toBe(90);
    const payload = progress();
    expect(payload.days).toBe(90);
    expect(progressWindowLabel(payload)).toBe("2026-05-19 – 2026-08-16 · 90 days");
    expect(presentXpEvent(payload.xpEvents[0]!)).toEqual({
      id: "xp1",
      line: "+40 XP · Complete",
      createdAt: "2026-08-02",
    });
  });
});

describe("no calorie or leaderboard strings", () => {
  it("keeps progress copy free of calories, leaderboards, social, and PvP", () => {
    const { PROGRESS_FORBIDDEN: _banned, ...shipped } = copy;
    void _banned;
    const blob = JSON.stringify(shipped).toLowerCase();
    for (const banned of PROGRESS_FORBIDDEN) {
      expect(blob).not.toContain(banned);
    }
    expect(blob).not.toContain("calorie");
    expect(blob).not.toContain("leaderboard");
    expect(PROGRESS_LEDE).toContain("90 days");
    expect(PROGRESS_LEDE).toContain("XP");
  });
});
