import {
  api,
  ApiRequestError,
  assertRelativeApiPath,
  parseApiErrorPayload,
  requestInit,
  type ApiErrorPayload,
} from "./api.js";

export const SIGN_OUT_PATH = "/api/v1/auth/sign-out";
export const ME_EXPORT_PATH = "/api/v1/me/export";
export const ACCOUNT_DELETE_PATH = "/api/v1/account/delete";
export const PLAYABLE_PROBE_PATH = "/api/v1/me/today";
export const EXPORT_FILENAME = "arise-export.json";
export const PREGNANCY_HARD_STOP = "PREGNANCY_HARD_STOP";
export const TIMEZONE_STORAGE_KEY = "arise.displayTimeZone";

export const playableProbeQueryKey = ["playable-probe"] as const;

export type SettingsActionId =
  | "units"
  | "timezone"
  | "export"
  | "logout"
  | "deleteAccount";

export type SettingsAvailability = Record<SettingsActionId, boolean>;

export type PlayableProbeResult =
  | { kind: "ok" }
  | { kind: "error"; error: ApiRequestError };

export function signOut(): Promise<unknown> {
  return api(SIGN_OUT_PATH, { method: "POST" });
}

export function deleteAccount(): Promise<{ ok: true }> {
  return api<{ ok: true }>(ACCOUNT_DELETE_PATH, { method: "POST" });
}

export function exportRequest(): { path: string; init: RequestInit } {
  return {
    path: assertRelativeApiPath(ME_EXPORT_PATH),
    init: requestInit(),
  };
}

export async function fetchAccountExport(): Promise<Blob> {
  const { path, init } = exportRequest();
  const res = await fetch(path, init);
  await throwIfNotOk(res);
  return res.blob();
}

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = "noopener";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function downloadAccountExport(): Promise<void> {
  const blob = await fetchAccountExport();
  saveBlob(blob, EXPORT_FILENAME);
}

export async function probePlayableRoute(): Promise<PlayableProbeResult> {
  try {
    await api(PLAYABLE_PROBE_PATH);
    return { kind: "ok" };
  } catch (err) {
    if (err instanceof ApiRequestError) {
      return { kind: "error", error: err };
    }
    throw err;
  }
}

export function isPregnancyHardStopError(err: unknown): boolean {
  return (
    err instanceof ApiRequestError &&
    err.status === 409 &&
    err.code === PREGNANCY_HARD_STOP
  );
}

export function settingsAvailability(err: unknown): SettingsAvailability {
  const blocked = isPregnancyHardStopError(err);
  return {
    units: !blocked,
    timezone: !blocked,
    export: !blocked,
    logout: !blocked,
    deleteAccount: true,
  };
}

export function pregnancyBlockedMessage(): string {
  return `This action is not available (${PREGNANCY_HARD_STOP}). Delete account remains available.`;
}

export function defaultTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function isIanaTimeZone(value: string): boolean {
  const tz = value.trim();
  if (tz.length === 0) return false;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: tz }).format();
    return true;
  } catch {
    return false;
  }
}

export function readDisplayTimeZone(
  storage: Pick<Storage, "getItem"> | null = browserStorage(),
): string {
  const stored = storage?.getItem(TIMEZONE_STORAGE_KEY)?.trim() ?? "";
  if (stored !== "" && isIanaTimeZone(stored)) {
    return stored;
  }
  return defaultTimeZone();
}

export function writeDisplayTimeZone(
  timeZone: string,
  storage: Pick<Storage, "setItem"> | null = browserStorage(),
): void {
  storage?.setItem(TIMEZONE_STORAGE_KEY, timeZone.trim());
}

async function throwIfNotOk(res: Response): Promise<void> {
  if (res.ok) return;
  let payload: ApiErrorPayload = {
    code: "REQUEST_FAILED",
    message: res.statusText || "Request failed",
  };
  try {
    payload = parseApiErrorPayload(await res.json());
  } catch {
    // non-JSON error body
  }
  throw new ApiRequestError(res.status, payload.code, payload.message, payload.details);
}

function browserStorage(): Storage | null {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}
