import {
  CSV_HEADER,
  CSV_TEMPLATE,
  assertCsvLimits,
  parseHealthCsv,
  type CsvRow,
} from "@arise/health";
import type { DailySummary, HealthMetric } from "@arise/domain";
import { api, ApiRequestError } from "../../lib/api.js";
import { saveBlob } from "../../lib/settings-client.js";
import {
  CSV_BAD_HEADER,
  CSV_PARSE_FAILED,
  CSV_REJECT,
  CSV_SAMPLE_ROW,
  HEALTH_CONSENT_CODE,
  HEALTH_CONSENT_EXPLAIN,
} from "./copy.js";

export const HEALTH_MANUAL_PATH = "/api/v1/health/manual";
export const HEALTH_SAMPLES_PATH = "/api/v1/health/samples";
export const HEALTH_SUMMARY_PATH = "/api/v1/health/summary";
export const CSV_TEMPLATE_FILENAME = "arise-health-template.csv";
export const healthSummaryQueryKey = ["health", "summary"] as const;

export const METRIC_UNITS: Record<HealthMetric, string> = {
  steps: "count",
  heart_rate: "bpm",
  resting_hr: "bpm",
  hrv: "ms",
  sleep_minutes: "min",
  weight_kg: "kg",
  active_minutes: "min",
  soreness: "score",
  sleep_quality: "score",
};

export type CsvFileLike = {
  size: number;
  name?: string;
  text: () => Promise<string>;
};

export type CsvPrepareOk = { ok: true; rows: CsvRow[] };
export type CsvPrepareErr = {
  ok: false;
  code: "CSV_TOO_LARGE" | "CSV_TOO_MANY_ROWS" | "CSV_BAD_HEADER" | "CSV_PARSE";
  message: string;
};
export type CsvPrepareResult = CsvPrepareOk | CsvPrepareErr;

export type HealthIngestResult = {
  ingested: number;
  dropped: number;
  summaries: DailySummary[];
};

export type ManualIngestInput = {
  metric: HealthMetric;
  value: number;
  unit: string;
  startAt: string;
  endAt: string;
  clientId?: string;
  consent?: true;
};

export function healthSummaryPath(from: string, to: string): string {
  const params = new URLSearchParams({ from, to });
  return `${HEALTH_SUMMARY_PATH}?${params.toString()}`;
}

export function newClientId(): string {
  return globalThis.crypto.randomUUID();
}

export function csvDataRowCount(text: string): number {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  return lines.length === 0 ? 0 : lines.length - 1;
}

/** Reject `size > 262144` before reading or parsing the file. */
export function gateCsvFileSize(size: number): void {
  assertCsvLimits({ size, rowCount: 0 });
}

/** Count rows via `split(/\\r?\\n/)`. Reject `rows > 200` before Zod. */
export function gateCsvRowCount(text: string, size: number): number {
  const rowCount = csvDataRowCount(text);
  assertCsvLimits({ size, rowCount });
  return rowCount;
}

function csvErrorCode(err: unknown): string | undefined {
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

export async function prepareCsvFile(file: CsvFileLike): Promise<CsvPrepareResult> {
  try {
    gateCsvFileSize(file.size);
  } catch {
    return { ok: false, code: "CSV_TOO_LARGE", message: CSV_REJECT };
  }

  const text = await file.text();

  try {
    gateCsvRowCount(text, file.size);
  } catch {
    return { ok: false, code: "CSV_TOO_MANY_ROWS", message: CSV_REJECT };
  }

  try {
    const rows = parseHealthCsv(text, { size: file.size });
    return { ok: true, rows };
  } catch (err) {
    const code = csvErrorCode(err);
    if (code === "CSV_TOO_LARGE" || code === "CSV_TOO_MANY_ROWS") {
      return { ok: false, code, message: CSV_REJECT };
    }
    if (code === "CSV_BAD_HEADER") {
      return { ok: false, code: "CSV_BAD_HEADER", message: CSV_BAD_HEADER };
    }
    return { ok: false, code: "CSV_PARSE", message: CSV_PARSE_FAILED };
  }
}

export function csvTemplatePayload(): { filename: string; body: string; type: string } {
  return {
    filename: CSV_TEMPLATE_FILENAME,
    body: CSV_TEMPLATE,
    type: "text/csv;charset=utf-8",
  };
}

export function downloadCsvTemplate(): void {
  const { filename, body, type } = csvTemplatePayload();
  saveBlob(new Blob([body], { type }), filename);
}

export function postManualSample(input: ManualIngestInput): Promise<HealthIngestResult> {
  const body: Record<string, unknown> = {
    metric: input.metric,
    value: input.value,
    unit: input.unit,
    startAt: input.startAt,
    endAt: input.endAt,
  };
  if (input.clientId !== undefined) {
    body.clientId = input.clientId;
  }
  if (input.consent === true) {
    body.consent = true;
  }
  return api<HealthIngestResult>(HEALTH_MANUAL_PATH, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function postCsvSamples(args: {
  samples: readonly CsvRow[];
  consent?: true;
}): Promise<HealthIngestResult> {
  const body: Record<string, unknown> = {
    samples: args.samples.map((row) => ({
      source: "csv" as const,
      metric: row.metric,
      value: row.value,
      unit: row.unit,
      startAt: row.startAt,
      endAt: row.endAt,
    })),
  };
  if (args.consent === true) {
    body.consent = true;
  }
  return api<HealthIngestResult>(HEALTH_SAMPLES_PATH, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getHealthSummary(from: string, to: string): Promise<DailySummary[]> {
  return api<DailySummary[]>(healthSummaryPath(from, to));
}

export function isHealthConsentRequired(err: unknown): boolean {
  return (
    err instanceof ApiRequestError &&
    err.status === 403 &&
    err.code === HEALTH_CONSENT_CODE
  );
}

export function consentRequiredCopy(err: unknown): string {
  if (!isHealthConsentRequired(err)) {
    return HEALTH_CONSENT_EXPLAIN;
  }
  const message = err instanceof ApiRequestError ? err.message : HEALTH_CONSENT_EXPLAIN;
  return `${message} (${HEALTH_CONSENT_CODE}). ${HEALTH_CONSENT_EXPLAIN}`;
}

export function localDateIso(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addLocalDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y ?? 0, (m ?? 1) - 1, (d ?? 1) + days);
  return localDateIso(dt);
}

export function defaultSummaryRange(now = new Date()): { from: string; to: string } {
  const to = localDateIso(now);
  return { from: addLocalDays(to, -13), to };
}

export function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function datetimeLocalToIso(value: string): string | null {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function templateUsesDesignHeader(): boolean {
  return CSV_TEMPLATE.startsWith(`${CSV_HEADER}\n`) && CSV_TEMPLATE.includes(CSV_SAMPLE_ROW);
}
