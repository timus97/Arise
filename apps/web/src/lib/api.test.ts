import { describe, expect, it } from "vitest";
import {
  FETCH_CREDENTIALS,
  assertRelativeApiPath,
  isRelativeApiPath,
  parseApiErrorPayload,
  requestInit,
} from "./api.js";
import { looksLikeEmail, signInPath } from "./auth-client.js";

describe("api helper", () => {
  it("uses credentials include and relative /api/v1 paths", () => {
    expect(FETCH_CREDENTIALS).toBe("include");
    expect(requestInit().credentials).toBe("include");
    expect(isRelativeApiPath("/api/v1/auth/sign-up/email")).toBe(true);
    expect(isRelativeApiPath("/api/v1/me")).toBe(true);
    expect(assertRelativeApiPath("/api/v1/me")).toBe("/api/v1/me");
    expect(isRelativeApiPath("http://127.0.0.1:8787/api/v1/me")).toBe(false);
    expect(isRelativeApiPath("http://localhost:8787/api/v1/me")).toBe(false);
    expect(() => assertRelativeApiPath("http://127.0.0.1:8787/api/v1/me")).toThrow(
      /relative \/api\//,
    );
  });

  it("parses AGE_RESTRICTED, INVITE_REQUIRED, and INVITE_UNCONFIGURED", () => {
    expect(
      parseApiErrorPayload({
        error: { code: "AGE_RESTRICTED", message: "You must be 16 or older to register" },
      }),
    ).toEqual({
      code: "AGE_RESTRICTED",
      message: "You must be 16 or older to register",
    });
    expect(
      parseApiErrorPayload({
        error: { code: "INVITE_REQUIRED", message: "A valid invite code is required" },
      }),
    ).toMatchObject({ code: "INVITE_REQUIRED" });
    expect(
      parseApiErrorPayload({
        error: { code: "INVITE_UNCONFIGURED", message: "Registration is not configured" },
      }),
    ).toMatchObject({ code: "INVITE_UNCONFIGURED" });
  });
});

describe("auth-client sign-in routing", () => {
  it("sends email identifiers to /api/v1/auth/sign-in/email", () => {
    expect(looksLikeEmail("player@example.com")).toBe(true);
    expect(signInPath("player@example.com")).toBe("/api/v1/auth/sign-in/email");
    expect(signInPath("player_one")).toBe("/api/v1/auth/sign-in/username");
    expect(signInPath("player_one")).not.toMatch(/8787/);
  });
});
