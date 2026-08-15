import { describe, expect, it } from "vitest";
import {
  completionRate,
  computeRank,
  qualifyRank,
  RANK_TITLES,
  rankEventIfDestabilized,
  titleForRank,
  type RankDay,
} from "../rank.js";

function doneDay(): RankDay {
  return {
    quests: [
      { kind: "strength", status: "completed" },
      { kind: "habit", status: "auto_completed" },
    ],
  };
}

function failDay(): RankDay {
  return { quests: [{ kind: "strength", status: "failed" }] };
}

function restOnlyDay(): RankDay {
  return {
    quests: [{ kind: "recovery", status: "skipped", skipReason: "rest_planned" }],
  };
}

describe("titles", () => {
  it("uses Initiate/Adept/Operative/Veteran/Elite/Sovereign", () => {
    expect(RANK_TITLES).toEqual({
      E: "Initiate",
      D: "Adept",
      C: "Operative",
      B: "Veteran",
      A: "Elite",
      S: "Sovereign",
    });
    expect(titleForRank("S")).toBe("Sovereign");
  });
});

describe("rank gates", () => {
  it("maps E/D/C by level only", () => {
    expect(qualifyRank({ level: 1, completionRate14: 1, completionRate30: 1, penaltyPoints30d: 0 })).toBe("E");
    expect(qualifyRank({ level: 9, completionRate14: 1, completionRate30: 1, penaltyPoints30d: 0 })).toBe("E");
    expect(qualifyRank({ level: 10, completionRate14: 1, completionRate30: 1, penaltyPoints30d: 0 })).toBe("D");
    expect(qualifyRank({ level: 19, completionRate14: 1, completionRate30: 1, penaltyPoints30d: 0 })).toBe("D");
    expect(qualifyRank({ level: 20, completionRate14: 1, completionRate30: 1, penaltyPoints30d: 0 })).toBe("C");
    expect(qualifyRank({ level: 34, completionRate14: 1, completionRate30: 1, penaltyPoints30d: 0 })).toBe("C");
  });

  it("requires 14-day rate ≥ 0.50 for B", () => {
    expect(
      qualifyRank({ level: 35, completionRate14: 0.5, completionRate30: 1, penaltyPoints30d: 0 }),
    ).toBe("B");
    expect(
      qualifyRank({ level: 49, completionRate14: 0.49, completionRate30: 1, penaltyPoints30d: 0 }),
    ).toBe("C");
  });

  it("requires 30-day rate ≥ 0.60 for A", () => {
    expect(
      qualifyRank({ level: 50, completionRate14: 1, completionRate30: 0.6, penaltyPoints30d: 0 }),
    ).toBe("A");
    expect(
      qualifyRank({ level: 74, completionRate14: 1, completionRate30: 0.59, penaltyPoints30d: 0 }),
    ).toBe("B");
  });

  it("requires 30-day rate ≥ 0.70 and penaltyPoints30d < 8 for S", () => {
    expect(
      qualifyRank({ level: 75, completionRate14: 1, completionRate30: 0.7, penaltyPoints30d: 7 }),
    ).toBe("S");
    expect(
      qualifyRank({ level: 80, completionRate14: 1, completionRate30: 0.69, penaltyPoints30d: 0 }),
    ).toBe("A");
    expect(
      qualifyRank({ level: 80, completionRate14: 1, completionRate30: 0.9, penaltyPoints30d: 8 }),
    ).toBe("A");
  });
});

describe("computeRank destabilized", () => {
  it("writes A + reason=destabilized when previous rank was S and gates fail", () => {
    const result = computeRank({
      level: 80,
      completionRate14: 1,
      completionRate30: 0.5,
      penaltyPoints30d: 8,
      previousRank: "S",
    });
    expect(result).toEqual({ rank: "A", title: "Elite", reason: "destabilized" });
    expect(rankEventIfDestabilized(result)).toEqual({
      previousRank: "S",
      rank: "A",
      title: "Elite",
      reason: "destabilized",
    });
  });

  it("stays S when gates still hold", () => {
    const result = computeRank({
      level: 75,
      completionRate14: 1,
      completionRate30: 0.7,
      penaltyPoints30d: 0,
      previousRank: "S",
    });
    expect(result.rank).toBe("S");
    expect(result.reason).toBeUndefined();
    expect(rankEventIfDestabilized(result)).toBeNull();
  });
});

describe("completionRate", () => {
  it("counts completed/partial/auto days over days that had a required quest", () => {
    const days: RankDay[] = [
      doneDay(),
      { quests: [{ kind: "cardio", status: "partial" }] },
      failDay(),
    ];
    expect(completionRate(days)).toBeCloseTo(2 / 3);
  });

  it("excludes days with only rest_planned skips from the denominator", () => {
    const days: RankDay[] = [doneDay(), restOnlyDay(), failDay()];
    expect(completionRate(days)).toBe(0.5);
  });

  it("ignores penalty-only days and empty days", () => {
    const days: RankDay[] = [
      { quests: [{ kind: "penalty", status: "completed" }] },
      { quests: [] },
      doneDay(),
    ];
    expect(completionRate(days)).toBe(1);
  });
});
