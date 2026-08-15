import { describe, expect, it } from "vitest";
import { aggregateDailySummaries } from "../aggregates.js";
import {
  apple_export,
  health_connect,
  healthkit,
  web_bluetooth,
} from "../adapters/stubs.js";
import { ingestManual, parseManual } from "../adapters/manual.js";
import {
  isInRange,
  normalizeSample,
  normalizeSamples,
  sampleDedupHash,
} from "../normalize.js";

const NOW = new Date("2026-08-14T12:00:00.000Z");

const base = {
  id: "sample-1",
  userId: "user-1",
  source: "manual" as const,
  unit: "count",
  startAt: "2026-08-14T00:00:00.000Z",
  endAt: "2026-08-14T01:00:00.000Z",
  ingestedAt: "2026-08-14T12:00:00.000Z",
};

describe("range drops", () => {
  it("drops HR < 30 or > 230, including resting_hr", () => {
    expect(isInRange("heart_rate", 29)).toBe(false);
    expect(isInRange("heart_rate", 30)).toBe(true);
    expect(isInRange("heart_rate", 230)).toBe(true);
    expect(isInRange("heart_rate", 231)).toBe(false);
    expect(isInRange("resting_hr", 20)).toBe(false);
    expect(
      normalizeSample({ ...base, metric: "heart_rate", unit: "bpm", value: 29 }, NOW),
    ).toBeNull();
    expect(
      normalizeSample({ ...base, metric: "resting_hr", unit: "bpm", value: 231 }, NOW),
    ).toBeNull();
  });

  it("drops weight < 25 or > 400 kg", () => {
    expect(isInRange("weight_kg", 24.9)).toBe(false);
    expect(isInRange("weight_kg", 25)).toBe(true);
    expect(isInRange("weight_kg", 400)).toBe(true);
    expect(isInRange("weight_kg", 400.1)).toBe(false);
    expect(
      normalizeSample({ ...base, metric: "weight_kg", unit: "kg", value: 24 }, NOW),
    ).toBeNull();
  });

  it("drops steps > 120000 / sample", () => {
    expect(isInRange("steps", 120_000)).toBe(true);
    expect(isInRange("steps", 120_001)).toBe(false);
    expect(isInRange("steps", -1)).toBe(false);
    expect(
      normalizeSample({ ...base, metric: "steps", unit: "count", value: 120_001 }, NOW),
    ).toBeNull();
  });

  it("drops sleep > 960 min", () => {
    expect(isInRange("sleep_minutes", 960)).toBe(true);
    expect(isInRange("sleep_minutes", 961)).toBe(false);
    expect(
      normalizeSample(
        { ...base, metric: "sleep_minutes", unit: "min", value: 961 },
        NOW,
      ),
    ).toBeNull();
  });

  it("drops soreness / sleep_quality not in 1–5", () => {
    expect(isInRange("soreness", 1)).toBe(true);
    expect(isInRange("soreness", 5)).toBe(true);
    expect(isInRange("soreness", 0)).toBe(false);
    expect(isInRange("soreness", 6)).toBe(false);
    expect(isInRange("soreness", 3.5)).toBe(false);
    expect(isInRange("sleep_quality", 9)).toBe(false);
    expect(
      normalizeSample({ ...base, metric: "soreness", unit: "score", value: 0 }, NOW),
    ).toBeNull();
    expect(
      normalizeSample(
        { ...base, metric: "sleep_quality", unit: "score", value: 6 },
        NOW,
      ),
    ).toBeNull();
  });

  it("keeps in-range samples and reports dropped count", () => {
    const { kept, dropped } = normalizeSamples(
      [
        { ...base, id: "a", metric: "steps", value: 8421 },
        { ...base, id: "b", metric: "heart_rate", unit: "bpm", value: 12 },
        { ...base, id: "c", metric: "soreness", unit: "score", value: 2 },
      ],
      NOW,
    );
    expect(dropped).toBe(1);
    expect(kept.map((s) => s.metric)).toEqual(["steps", "soreness"]);
  });
});

describe("dedup hash", () => {
  it("is userId|source|metric|startAt|endAt|roundedValue", () => {
    const hash = sampleDedupHash({
      userId: "user-1",
      source: "csv",
      metric: "weight_kg",
      startAt: "2026-08-14T07:00:00.000Z",
      endAt: "2026-08-14T07:00:00.000Z",
      value: 72.4,
    });
    expect(hash).toBe(
      "user-1|csv|weight_kg|2026-08-14T07:00:00.000Z|2026-08-14T07:00:00.000Z|72.4",
    );
  });

  it("attaches the same hash on a kept sample", () => {
    const sample = normalizeSample(
      { ...base, source: "csv", metric: "steps", value: 8421 },
      NOW,
    );
    expect(sample?.dedupHash).toBe(
      "user-1|csv|steps|2026-08-14T00:00:00.000Z|2026-08-14T01:00:00.000Z|8421",
    );
  });
});

describe("manual adapter", () => {
  const one = {
    metric: "steps" as const,
    value: 8421,
    unit: "count",
    startAt: "2026-08-14T00:00:00.000Z",
    endAt: "2026-08-14T20:00:00.000Z",
  };

  it("parses one sample with Zod", () => {
    expect(parseManual(one)).toEqual(one);
    expect(() => parseManual({ ...one, value: "8421" })).toThrow();
    expect(() => parseManual({ ...one, metric: "calories" })).toThrow();
  });

  it("normalizes a manual sample with source manual", () => {
    const sample = ingestManual({
      input: one,
      userId: "user-1",
      now: NOW,
      id: "manual-1",
    });
    expect(sample?.source).toBe("manual");
    expect(sample?.metric).toBe("steps");
    expect(sample?.value).toBe(8421);
    expect(sample?.dedupHash).toContain("user-1|manual|steps|");
  });
});

describe("aggregates", () => {
  it("sums steps and takes last soreness / sleep_quality; never increments hardBouts", () => {
    const summaries = aggregateDailySummaries([
      {
        userId: "user-1",
        metric: "steps",
        value: 4000,
        startAt: "2026-08-14T00:00:00.000Z",
        endAt: "2026-08-14T12:00:00.000Z",
      },
      {
        userId: "user-1",
        metric: "steps",
        value: 4421,
        startAt: "2026-08-14T12:00:00.000Z",
        endAt: "2026-08-14T20:00:00.000Z",
      },
      {
        userId: "user-1",
        metric: "soreness",
        value: 2,
        startAt: "2026-08-14T07:00:00.000Z",
        endAt: "2026-08-14T07:00:00.000Z",
      },
      {
        userId: "user-1",
        metric: "soreness",
        value: 4,
        startAt: "2026-08-14T21:00:00.000Z",
        endAt: "2026-08-14T21:00:00.000Z",
      },
      {
        userId: "user-1",
        metric: "sleep_quality",
        value: 4,
        startAt: "2026-08-14T07:00:00.000Z",
        endAt: "2026-08-14T07:00:00.000Z",
      },
      {
        userId: "user-1",
        metric: "weight_kg",
        value: 72.4,
        startAt: "2026-08-14T07:00:00.000Z",
        endAt: "2026-08-14T07:00:00.000Z",
      },
    ]);

    expect(summaries).toHaveLength(1);
    const day = summaries[0];
    expect(day?.steps).toBe(8421);
    expect(day?.soreness).toBe(4);
    expect(day?.sleepQuality).toBe(4);
    expect(day?.weightKg).toBe(72.4);
    expect(day?.hardBouts).toBe(0);
    expect(day?.recoveryScore).toBe(0);
  });
});

describe("unavailable stubs", () => {
  it("throws unavailable_web with UNAVAILABLE_WEB for every native adapter", () => {
    for (const stub of [apple_export, web_bluetooth, health_connect, healthkit]) {
      try {
        stub();
        expect.unreachable("stub must throw");
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toBe("unavailable_web");
        expect((err as { code: string }).code).toBe("UNAVAILABLE_WEB");
      }
    }
  });
});
