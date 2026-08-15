import { HealthMetric } from "@arise/domain";
import { z } from "zod";
import { normalizeSamples, type NormalizedSample } from "../normalize.js";

export const CSV_MAX_BYTES = 262_144;
export const CSV_MAX_ROWS = 200;
export const CSV_HEADER = "metric,value,unit,startAt,endAt";

/** Design §11 template: header + 5 sample rows. */
export const CSV_TEMPLATE = `${CSV_HEADER}
steps,8421,count,2026-08-14T00:00:00.000Z,2026-08-14T20:00:00.000Z
sleep_minutes,410,min,2026-08-13T22:00:00.000Z,2026-08-14T06:50:00.000Z
weight_kg,72.4,kg,2026-08-14T07:00:00.000Z,2026-08-14T07:00:00.000Z
soreness,2,score,2026-08-14T07:00:00.000Z,2026-08-14T07:00:00.000Z
sleep_quality,4,score,2026-08-14T07:00:00.000Z,2026-08-14T07:00:00.000Z
`;

export const CsvRow = z.object({
  metric: HealthMetric,
  value: z.coerce.number().finite(),
  unit: z.string().min(1),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
});
export type CsvRow = z.infer<typeof CsvRow>;

export function assertCsvLimits(opts: { size: number; rowCount: number }): void {
  if (opts.size > CSV_MAX_BYTES) {
    throw Object.assign(new Error("csv_too_large"), { code: "CSV_TOO_LARGE" });
  }
  if (opts.rowCount > CSV_MAX_ROWS) {
    throw Object.assign(new Error("csv_too_many_rows"), { code: "CSV_TOO_MANY_ROWS" });
  }
}

function byteSize(text: string): number {
  const G = globalThis as typeof globalThis & {
    TextEncoder?: new () => { encode: (s: string) => { byteLength: number } };
  };
  if (typeof G.TextEncoder === "function") {
    return new G.TextEncoder().encode(text).byteLength;
  }
  return text.length;
}

function parseCsvLine(line: string): CsvRow {
  const cols = line.split(",").map((c) => c.trim());
  return CsvRow.parse({
    metric: cols[0],
    value: cols[1],
    unit: cols[2],
    startAt: cols[3],
    endAt: cols[4],
  });
}

/** Reject size/row limits before Zod. Parse is `split(/\\r?\\n/)` + Zod only. */
export function parseHealthCsv(
  text: string,
  opts?: { size?: number },
): CsvRow[] {
  const size = opts?.size ?? byteSize(text);
  if (size > CSV_MAX_BYTES) {
    assertCsvLimits({ size, rowCount: 0 });
  }

  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  const rowCount = lines.length === 0 ? 0 : lines.length - 1;
  assertCsvLimits({ size, rowCount });

  const header = lines[0];
  if (header === undefined || header.trim() !== CSV_HEADER) {
    throw Object.assign(new Error("csv_bad_header"), { code: "CSV_BAD_HEADER" });
  }

  const rows: CsvRow[] = [];
  for (const line of lines.slice(1)) {
    rows.push(parseCsvLine(line));
  }
  return rows;
}

export function ingestCsv(args: {
  text: string;
  userId: string;
  size?: number;
  now?: Date;
}): { kept: NormalizedSample[]; dropped: number; rows: CsvRow[] } {
  const parseOpts = args.size === undefined ? {} : { size: args.size };
  const rows = parseHealthCsv(args.text, parseOpts);
  const { kept, dropped } = normalizeSamples(
    rows.map((row) => ({
      userId: args.userId,
      source: "csv" as const,
      metric: row.metric,
      value: row.value,
      unit: row.unit,
      startAt: row.startAt,
      endAt: row.endAt,
    })),
    args.now ?? new Date(),
  );
  return { kept, dropped, rows };
}
