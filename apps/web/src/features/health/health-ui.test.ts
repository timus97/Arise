import { CSV_HEADER, CSV_MAX_BYTES, CSV_MAX_ROWS, CSV_TEMPLATE } from "@arise/health";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError } from "../../lib/api.js";
import * as copy from "./copy.js";
import {
  CSV_DOWNLOAD_CTA,
  CSV_EMPTY_LEDE,
  CSV_EXPORT_HONESTY,
  CSV_HEADER_LINE,
  CSV_REJECT,
  CSV_SAMPLE_CAPTION,
  CSV_SAMPLE_ROW,
  HEALTH_CONSENT_CHECKBOX,
  HEALTH_CONSENT_CODE,
  HEALTH_CONSENT_EXPLAIN,
  HEALTH_PAGE_LEDE,
  PLATFORM_HONESTY,
} from "./copy.js";
import {
  HEALTH_MANUAL_PATH,
  HEALTH_SAMPLES_PATH,
  HEALTH_SUMMARY_PATH,
  consentRequiredCopy,
  csvTemplatePayload,
  getHealthSummary,
  healthSummaryPath,
  isHealthConsentRequired,
  postCsvSamples,
  postManualSample,
  prepareCsvFile,
  templateUsesDesignHeader,
} from "./health-client.js";

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

const ROW = "steps,100,count,2026-08-14T00:00:00.000Z,2026-08-14T01:00:00.000Z";

function csvWithRows(n: number): string {
  return [CSV_HEADER, ...Array.from({ length: n }, () => ROW)].join("\n");
}

describe("CSV limits before parse", () => {
  it("rejects size > 262144 before reading or parsing", async () => {
    const text = vi.fn(async () => {
      throw new Error("must not read oversized file");
    });
    const result = await prepareCsvFile({ size: CSV_MAX_BYTES + 1, text });
    expect(CSV_MAX_BYTES).toBe(262144);
    expect(result).toEqual({ ok: false, code: "CSV_TOO_LARGE", message: CSV_REJECT });
    expect(text).not.toHaveBeenCalled();
    expect(CSV_REJECT).toBe(
      "File is too large. Maximum is 256 KB or 200 rows. Rejected before parse.",
    );
  });

  it("rejects rows > 200 before parseHealthCsv", async () => {
    const parse = await import("@arise/health");
    const spy = vi.spyOn(parse, "parseHealthCsv");
    const text = csvWithRows(CSV_MAX_ROWS + 1);
    const result = await prepareCsvFile({
      size: text.length,
      text: async () => text,
    });
    expect(CSV_MAX_ROWS).toBe(200);
    expect(result).toEqual({
      ok: false,
      code: "CSV_TOO_MANY_ROWS",
      message: CSV_REJECT,
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it("parses the design template after the size and row gates", async () => {
    const result = await prepareCsvFile({
      size: CSV_TEMPLATE.length,
      text: async () => CSV_TEMPLATE,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(5);
    expect(result.rows[0]?.metric).toBe("steps");
  });
});

describe("CSV template download", () => {
  it("uses design header plus the P3 sample row", () => {
    const payload = csvTemplatePayload();
    expect(payload.filename).toBe("arise-health-template.csv");
    expect(payload.body.startsWith(`${CSV_HEADER}\n`)).toBe(true);
    expect(CSV_HEADER).toBe("metric,value,unit,startAt,endAt");
    expect(payload.body).toContain(CSV_SAMPLE_ROW);
    expect(templateUsesDesignHeader()).toBe(true);
    expect(CSV_HEADER_LINE).toBe("Header: metric,value,unit,startAt,endAt");
    expect(CSV_SAMPLE_CAPTION).toBe("One sample row:");
    expect(CSV_DOWNLOAD_CTA).toBe("Download CSV template");
    expect(CSV_EMPTY_LEDE).toContain("200 rows");
    expect(CSV_EXPORT_HONESTY).toContain("not live sync");
  });
});

describe("health ingest client", () => {
  it("POSTs first ingest with consent:true on relative /api/v1 paths", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("/api/v1/health/manual");
      expect(String(input)).toBe(HEALTH_MANUAL_PATH);
      expect(String(input)).not.toMatch(/8787/);
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      const body = JSON.parse(String(init?.body)) as { consent?: boolean };
      expect(body.consent).toBe(true);
      return jsonResponse({ ingested: 1, dropped: 0, summaries: [] });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      postManualSample({
        metric: "steps",
        value: 8421,
        unit: "count",
        startAt: "2026-08-14T00:00:00.000Z",
        endAt: "2026-08-14T20:00:00.000Z",
        consent: true,
      }),
    ).resolves.toEqual({ ingested: 1, dropped: 0, summaries: [] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("POSTs CSV samples to /api/v1/health/samples with credentials include", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(HEALTH_SAMPLES_PATH);
      expect(String(input)).toBe("/api/v1/health/samples");
      expect(init?.credentials).toBe("include");
      const body = JSON.parse(String(init?.body)) as {
        consent?: boolean;
        samples: Array<{ source: string }>;
      };
      expect(body.consent).toBe(true);
      expect(body.samples).toHaveLength(1);
      expect(body.samples[0]?.source).toBe("csv");
      return jsonResponse({ ingested: 1, dropped: 0, summaries: [] });
    });
    vi.stubGlobal("fetch", fetchMock);

    await postCsvSamples({
      consent: true,
      samples: [
        {
          metric: "steps",
          value: 100,
          unit: "count",
          startAt: "2026-08-14T00:00:00.000Z",
          endAt: "2026-08-14T01:00:00.000Z",
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("GETs /api/v1/health/summary?from&to as a bare array", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("/api/v1/health/summary?from=2026-08-01&to=2026-08-14");
      expect(String(input).startsWith(HEALTH_SUMMARY_PATH)).toBe(true);
      expect(String(input)).not.toMatch(/8787/);
      expect(init?.credentials).toBe("include");
      expect(init?.method ?? "GET").toBe("GET");
      return jsonResponse([
        {
          userId: "u1",
          localDate: "2026-08-14",
          steps: 8421,
          activeMinutes: null,
          sleepMinutes: 410,
          restingHr: null,
          hrv: null,
          weightKg: 72.4,
          soreness: 2,
          sleepQuality: 4,
          hardBouts: 0,
          recoveryScore: 0,
        },
      ]);
    });
    vi.stubGlobal("fetch", fetchMock);

    const rows = await getHealthSummary("2026-08-01", "2026-08-14");
    expect(Array.isArray(rows)).toBe(true);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.steps).toBe(8421);
    expect(healthSummaryPath("2026-08-01", "2026-08-14")).toBe(
      "/api/v1/health/summary?from=2026-08-01&to=2026-08-14",
    );
  });
});

describe("consent 403 copy", () => {
  it("explains HEALTH_CONSENT_REQUIRED", () => {
    const err = new ApiRequestError(
      403,
      HEALTH_CONSENT_CODE,
      "Health ingest requires consent:true on the first successful call",
    );
    expect(isHealthConsentRequired(err)).toBe(true);
    expect(isHealthConsentRequired(new ApiRequestError(401, "UNAUTHORIZED", "no"))).toBe(false);
    const explained = consentRequiredCopy(err);
    expect(explained).toContain("HEALTH_CONSENT_REQUIRED");
    expect(explained).toContain(HEALTH_CONSENT_EXPLAIN);
    expect(HEALTH_CONSENT_CHECKBOX).toBe(
      "I consent to store health samples on this operator machine so quests can auto-complete or shrink.",
    );
    expect(HEALTH_CONSENT_EXPLAIN).toBe(
      "First ingest requires consent:true. Without it the API returns 403 HEALTH_CONSENT_REQUIRED.",
    );
  });
});

describe("honesty copy", () => {
  it("has no bluetooth strings and does not claim live fitness sync", () => {
    const blob = Object.values(copy).join("\n");
    expect(blob).not.toMatch(/bluetooth/i);
    expect(blob).not.toMatch(/FEATURE_WEB_BLUETOOTH/);
    expect(blob).not.toMatch(/Web Bluetooth/);
    expect(HEALTH_PAGE_LEDE).toBe(
      "Manual entry or a small CSV. No live Apple Health, Health Connect, or Google Fit. Large Apple zip is not v1.",
    );
    expect(PLATFORM_HONESTY).toBe(
      "No live Apple Health, Health Connect, or Google Fit. Large Apple zip is not v1. Use the CSV template (200 rows).",
    );
  });
});
