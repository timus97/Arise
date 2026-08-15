import { describe, expect, it } from "vitest";
import {
  CSV_HEADER,
  CSV_MAX_BYTES,
  CSV_MAX_ROWS,
  CSV_TEMPLATE,
  assertCsvLimits,
  ingestCsv,
  parseHealthCsv,
} from "../adapters/csv.js";
import { normalizeSamples } from "../normalize.js";

const ROW =
  "steps,100,count,2026-08-14T00:00:00.000Z,2026-08-14T01:00:00.000Z";

function csvWithRows(n: number): string {
  return [CSV_HEADER, ...Array.from({ length: n }, () => ROW)].join("\n");
}

describe("CSV fixture (design §11)", () => {
  it("parses the 5 template rows", () => {
    const rows = parseHealthCsv(CSV_TEMPLATE);
    expect(rows).toHaveLength(5);
    expect(rows.map((r) => r.metric)).toEqual([
      "steps",
      "sleep_minutes",
      "weight_kg",
      "soreness",
      "sleep_quality",
    ]);
    expect(rows[0]).toEqual({
      metric: "steps",
      value: 8421,
      unit: "count",
      startAt: "2026-08-14T00:00:00.000Z",
      endAt: "2026-08-14T20:00:00.000Z",
    });
    expect(rows[1]?.value).toBe(410);
    expect(rows[2]?.value).toBe(72.4);
    expect(rows[3]?.value).toBe(2);
    expect(rows[4]?.value).toBe(4);
  });

  it("ingests the fixture into normalized csv samples", () => {
    const { kept, dropped, rows } = ingestCsv({
      text: CSV_TEMPLATE,
      userId: "user-1",
      now: new Date("2026-08-14T12:00:00.000Z"),
    });
    expect(rows).toHaveLength(5);
    expect(dropped).toBe(0);
    expect(kept).toHaveLength(5);
    expect(kept.every((s) => s.source === "csv")).toBe(true);
    expect(kept[0]?.dedupHash).toBe(
      "user-1|csv|steps|2026-08-14T00:00:00.000Z|2026-08-14T20:00:00.000Z|8421",
    );
  });
});

describe("CSV limits before parse", () => {
  it("rejects size > 262144 before parse", () => {
    expect(() => assertCsvLimits({ size: CSV_MAX_BYTES + 1, rowCount: 0 })).toThrow(
      /csv_too_large/,
    );
    try {
      parseHealthCsv(CSV_TEMPLATE, { size: CSV_MAX_BYTES + 1 });
      expect.unreachable("must reject oversized file");
    } catch (err) {
      expect((err as Error).message).toBe("csv_too_large");
      expect((err as { code: string }).code).toBe("CSV_TOO_LARGE");
    }
  });

  it("accepts 200 rows and rejects the 201st", () => {
    expect(() => assertCsvLimits({ size: 100, rowCount: CSV_MAX_ROWS })).not.toThrow();
    expect(() => assertCsvLimits({ size: 100, rowCount: CSV_MAX_ROWS + 1 })).toThrow(
      /csv_too_many_rows/,
    );

    expect(parseHealthCsv(csvWithRows(200))).toHaveLength(200);

    try {
      parseHealthCsv(csvWithRows(201));
      expect.unreachable("must reject 201st row");
    } catch (err) {
      expect((err as Error).message).toBe("csv_too_many_rows");
      expect((err as { code: string }).code).toBe("CSV_TOO_MANY_ROWS");
    }
  });
});

describe("CSV range drop", () => {
  it("parses out-of-range rows then drops them in normalize", () => {
    const text = `${CSV_HEADER}
heart_rate,20,bpm,2026-08-14T00:00:00.000Z,2026-08-14T00:00:01.000Z
heart_rate,240,bpm,2026-08-14T00:00:00.000Z,2026-08-14T00:00:01.000Z
weight_kg,20,kg,2026-08-14T00:00:00.000Z,2026-08-14T00:00:00.000Z
steps,120001,count,2026-08-14T00:00:00.000Z,2026-08-14T00:00:01.000Z
sleep_minutes,961,min,2026-08-14T00:00:00.000Z,2026-08-14T08:00:00.000Z
soreness,0,score,2026-08-14T00:00:00.000Z,2026-08-14T00:00:00.000Z
sleep_quality,6,score,2026-08-14T00:00:00.000Z,2026-08-14T00:00:00.000Z
steps,100,count,2026-08-14T00:00:00.000Z,2026-08-14T01:00:00.000Z
`;
    const rows = parseHealthCsv(text);
    expect(rows).toHaveLength(8);
    const { kept, dropped } = normalizeSamples(
      rows.map((row) => ({
        userId: "user-1",
        source: "csv" as const,
        metric: row.metric,
        value: row.value,
        unit: row.unit,
        startAt: row.startAt,
        endAt: row.endAt,
      })),
    );
    expect(dropped).toBe(7);
    expect(kept).toHaveLength(1);
    expect(kept[0]?.metric).toBe("steps");
    expect(kept[0]?.value).toBe(100);
  });
});
