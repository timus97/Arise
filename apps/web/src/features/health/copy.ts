/** Exact PO_COPY P3 + P8 strings. Do not paraphrase. */

export const HEALTH_TITLE = "Health";

export const HEALTH_PAGE_LEDE =
  "Manual entry or a small CSV. No live Apple Health, Health Connect, or Google Fit. Large Apple zip is not v1.";

export const PLATFORM_HONESTY =
  "No live Apple Health, Health Connect, or Google Fit. Large Apple zip is not v1. Use the CSV template (200 rows).";

export const HEALTH_CONSENT_CHECKBOX =
  "I consent to store health samples on this operator machine so quests can auto-complete or shrink.";

export const HEALTH_CONSENT_CODE = "HEALTH_CONSENT_REQUIRED";

export const HEALTH_CONSENT_EXPLAIN =
  "First ingest requires consent:true. Without it the API returns 403 HEALTH_CONSENT_REQUIRED.";

export const CSV_DOWNLOAD_CTA = "Download CSV template";

export const CSV_HEADER_LINE = "Header: metric,value,unit,startAt,endAt";

export const CSV_SAMPLE_CAPTION = "One sample row:";

export const CSV_SAMPLE_ROW =
  "steps,8421,count,2026-08-14T00:00:00.000Z,2026-08-14T20:00:00.000Z";

export const CSV_EXPORT_HONESTY =
  "Apple, Samsung, and Health Connect data arrives by user export, not live sync. Export from your phone, then map columns to this template.";

export const CSV_EMPTY_LEDE =
  "No file yet. Download the template, add rows, then import. Maximum 256 KB or 200 rows.";

export const CSV_REJECT =
  "File is too large. Maximum is 256 KB or 200 rows. Rejected before parse.";

export const CSV_BAD_HEADER =
  "CSV header must be metric,value,unit,startAt,endAt.";

export const CSV_PARSE_FAILED = "Could not parse CSV rows. Use the template.";

export const MANUAL_TITLE = "Manual entry";
export const MANUAL_SAVE = "Save sample";
export const CSV_TITLE = "CSV import";
export const CSV_IMPORT = "Import CSV";
export const SUMMARY_TITLE = "Summary";
export const HEALTH_SIGNED_OUT = "Sign in to log samples or import a CSV.";
