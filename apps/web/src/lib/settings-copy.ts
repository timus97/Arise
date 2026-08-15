export const SHARED_DEVICE_COPY =
  "Do not install Arise on a shared phone if you care about other people reading queued health entries.";

export const HEALTH_STUB_COPY =
  "Live Apple Health / Health Connect need a future native wrapper. Large Apple exports are not supported in v1. Use the CSV template (200 rows).";

export const RESET_PASSWORD_CLI =
  "pnpm --filter api exec tsx src/cli/reset-password.ts --identifier USER --password -";

export const RESET_PASSWORD_ALIAS = "pnpm arise admin reset-password";

export const SMTP_UNSET_COPY =
  "v1 SMTP is unset. Password reset is an operator CLI, not in-app email.";

export const TIMEZONE_HINT =
  "Daily dates use the profile timezone from onboarding. This IANA value is a local display preference; v1 has no settings PATCH.";

export const CSV_TEMPLATE_HEADER = "metric,value,unit,startAt,endAt";

export const INDEXEDDB_UNENCRYPTED_COPY =
  "v1 does not encrypt IndexedDB. Completions and pending health entries in the outbox are readable on this device.";
