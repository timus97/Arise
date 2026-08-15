export {
  RANGE,
  isInRange,
  normalizeSample,
  normalizeSamples,
  roundHealthValue,
  sampleDedupHash,
  type NormalizeInput,
  type NormalizedSample,
} from "./normalize.js";

export {
  aggregateDailySummaries,
  type AggregateSample,
} from "./aggregates.js";

export {
  ingestManual,
  parseManual,
  ManualSampleInput,
} from "./adapters/manual.js";

export {
  CSV_HEADER,
  CSV_MAX_BYTES,
  CSV_MAX_ROWS,
  CSV_TEMPLATE,
  CsvRow,
  assertCsvLimits,
  ingestCsv,
  parseHealthCsv,
} from "./adapters/csv.js";

export {
  apple_export,
  health_connect,
  healthkit,
  web_bluetooth,
} from "./adapters/stubs.js";
