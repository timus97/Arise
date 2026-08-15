import { describe, expect, it } from "vitest";
import type { DailySummary } from "@arise/domain";
import { baseline, computeRecovery, median } from "../recovery.js";

function summary(over: Partial<DailySummary> & Pick<DailySummary, "localDate">): DailySummary {
  return {
    userId: "u1",
    steps: null,
    activeMinutes: null,
    sleepMinutes: null,
    restingHr: null,
    hrv: null,
    weightKg: null,
    soreness: null,
    sleepQuality: null,
    hardBouts: 0,
    recoveryScore: 0,
    ...over,
  };
}

describe("median", () => {
  it("returns null for an empty list", () => {
    expect(median([])).toBeNull();
  });

  it("returns the middle value for an odd-length list", () => {
    expect(median([3, 1, 2])).toBe(2);
  });

  it("averages the two middle values for an even-length list", () => {
    expect(median([4, 1, 2, 3])).toBe(2.5);
  });
});

describe("baseline", () => {
  it("is null with fewer than 5 numeric samples", () => {
    expect(baseline([1, 2, 3, 4])).toBeNull();
    expect(baseline([1, 2, 3, 4, null, undefined])).toBeNull();
  });

  it("is the median once ≥ 5 samples exist", () => {
    expect(baseline([10, 20, 30, 40, 50])).toBe(30);
  });
});

describe("computeRecovery neutrals", () => {
  it("uses §9.4 cold-start neutrals on an empty newest-first window", () => {
    const { score, parts } = computeRecovery([]);
    expect(parts).toEqual({
      sleep: 40,
      restHr: 15,
      hrv: 15,
      load: 20,
      subjective: 10,
    });
    expect(score).toBe(100);
  });

  it("does not punish missing wearables when baseline has < 5 samples", () => {
    const days = [
      summary({ localDate: "2026-08-15", restingHr: 80, hrv: 40, sleepMinutes: 420 }),
      summary({ localDate: "2026-08-14", restingHr: 60, hrv: 50 }),
      summary({ localDate: "2026-08-13", restingHr: 60, hrv: 50 }),
      summary({ localDate: "2026-08-12", restingHr: 60, hrv: 50 }),
    ];
    const { parts } = computeRecovery(days);
    expect(parts.restHr).toBe(15);
    expect(parts.hrv).toBe(15);
    expect(parts.sleep).toBe(40);
    expect(parts.subjective).toBe(10);
  });

  it("zeroes restHr when today is more than 7 above a ≥5 baseline", () => {
    const days = [
      summary({ localDate: "2026-08-15", restingHr: 80 }),
      summary({ localDate: "2026-08-14", restingHr: 60 }),
      summary({ localDate: "2026-08-13", restingHr: 60 }),
      summary({ localDate: "2026-08-12", restingHr: 60 }),
      summary({ localDate: "2026-08-11", restingHr: 60 }),
    ];
    expect(computeRecovery(days).parts.restHr).toBe(0);
  });

  it("zeroes hrv when today is below 85% of a ≥5 baseline", () => {
    const days = [
      summary({ localDate: "2026-08-15", hrv: 40 }),
      summary({ localDate: "2026-08-14", hrv: 80 }),
      summary({ localDate: "2026-08-13", hrv: 80 }),
      summary({ localDate: "2026-08-12", hrv: 80 }),
      summary({ localDate: "2026-08-11", hrv: 80 }),
    ];
    expect(computeRecovery(days).parts.hrv).toBe(0);
  });

  it("drops load by 5 per hard bout in the newest two days", () => {
    const days = [
      summary({ localDate: "2026-08-15", hardBouts: 2 }),
      summary({ localDate: "2026-08-14", hardBouts: 1 }),
    ];
    expect(computeRecovery(days).parts.load).toBe(5);
  });

  it("computes subjective from newest soreness + sleep quality", () => {
    const days = [summary({ localDate: "2026-08-15", soreness: 2, sleepQuality: 4 })];
    expect(computeRecovery(days).parts.subjective).toBe(10);
  });

  it("scales sleep from the 7-day average against a 420-minute default", () => {
    const days = [summary({ localDate: "2026-08-15", sleepMinutes: 210 })];
    expect(computeRecovery(days).parts.sleep).toBe(20);
  });
});
