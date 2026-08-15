import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError } from "./api.js";
import {
  ACCOUNT_DELETE_PATH,
  EXPORT_FILENAME,
  ME_EXPORT_PATH,
  PLAYABLE_PROBE_PATH,
  PREGNANCY_HARD_STOP,
  SIGN_OUT_PATH,
  deleteAccount,
  exportRequest,
  fetchAccountExport,
  isPregnancyHardStopError,
  pregnancyBlockedMessage,
  settingsAvailability,
  signOut,
} from "./settings-client.js";
import { SHARED_DEVICE_COPY } from "./settings-copy.js";

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

describe("settings copy", () => {
  it("exports the required shared-phone sentence", () => {
    expect(SHARED_DEVICE_COPY).toBe(
      "Do not install Arise on a shared phone if you care about other people reading queued health entries.",
    );
  });
});

describe("export helper", () => {
  it("uses relative /api/v1/me/export and filename arise-export.json", async () => {
    const { path, init } = exportRequest();
    expect(path).toBe("/api/v1/me/export");
    expect(path).toBe(ME_EXPORT_PATH);
    expect(path).not.toMatch(/8787/);
    expect(EXPORT_FILENAME).toBe("arise-export.json");
    expect(init.credentials).toBe("include");

    const fetchMock = vi.fn(async (input: RequestInfo | URL, requestInit?: RequestInit) => {
      expect(String(input)).toBe("/api/v1/me/export");
      expect(requestInit?.credentials).toBe("include");
      return new Response("{}", {
        status: 200,
        headers: {
          "content-type": "application/json",
          "content-disposition": 'attachment; filename="arise-export.json"',
        },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const blob = await fetchAccountExport();
    expect(await blob.text()).toBe("{}");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("delete helper", () => {
  it("uses POST /api/v1/account/delete", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("/api/v1/account/delete");
      expect(String(input)).toBe(ACCOUNT_DELETE_PATH);
      expect(String(input)).not.toMatch(/8787/);
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      return jsonResponse({ ok: true });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(deleteAccount()).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("logout helper", () => {
  it("posts relative /api/v1/auth/sign-out with credentials include", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("/api/v1/auth/sign-out");
      expect(String(input)).toBe(SIGN_OUT_PATH);
      expect(String(input)).not.toMatch(/8787/);
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      return jsonResponse({ success: true });
    });
    vi.stubGlobal("fetch", fetchMock);

    await signOut();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("pregnancy gate", () => {
  it("keeps only delete available on 409 PREGNANCY_HARD_STOP", () => {
    const err = new ApiRequestError(
      409,
      PREGNANCY_HARD_STOP,
      "Arise is not appropriate during pregnancy. See a clinician for prenatal exercise guidance.",
    );
    expect(PLAYABLE_PROBE_PATH).toBe("/api/v1/me/today");
    expect(isPregnancyHardStopError(err)).toBe(true);
    expect(settingsAvailability(err)).toEqual({
      units: false,
      timezone: false,
      export: false,
      logout: false,
      deleteAccount: true,
    });
    expect(pregnancyBlockedMessage()).toContain(PREGNANCY_HARD_STOP);

    expect(settingsAvailability(null)).toEqual({
      units: true,
      timezone: true,
      export: true,
      logout: true,
      deleteAccount: true,
    });
    expect(
      settingsAvailability(new ApiRequestError(409, "ONBOARDING_REQUIRED", "Onboarding is required")),
    ).toMatchObject({
      units: true,
      export: true,
      deleteAccount: true,
    });
  });
});
