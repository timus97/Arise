import { RegisterBody } from "@arise/domain";
import type { Hono } from "hono";
import { ApiError } from "../middleware/error.js";
import type { AppBindings, AppDeps } from "../types.js";

const PASSWORD_PATHS = new Set([
  "/api/v1/auth/sign-up/email",
  "/api/v1/auth/sign-in/email",
  "/api/v1/auth/sign-in/username",
]);

export function registerAuthRoutes(
  app: Hono<AppBindings>,
  deps: AppDeps,
): void {
  app.all("/api/v1/auth/*", async (c) => {
    const path = c.req.path;
    const method = c.req.method;

    if (method === "POST" && path === "/api/v1/auth/forget-password") {
      if (!deps.env.SMTP_URL) {
        throw new ApiError(404, "NOT_FOUND", "Password reset is not configured");
      }
    }

    if (
      method === "POST" &&
      PASSWORD_PATHS.has(path) &&
      deps.env.RUNTIME === "worker" &&
      deps.env.ALLOW_WORKER_PASSWORD_AUTH !== "true"
    ) {
      throw new ApiError(
        501,
        "AUTH_RUNTIME_UNSUPPORTED",
        "Password auth is not supported on this runtime",
      );
    }

    if (method === "POST" && path === "/api/v1/auth/sign-up/email") {
      const raw = c.req.raw;
      const body: unknown = await raw.json();
      assertRegisterAllowed(body, deps.env.REGISTER_INVITE_CODE);
      return deps.auth.handler(toBetterAuthSignUp(raw, body));
    }

    return deps.auth.handler(c.req.raw);
  });
}

function assertRegisterAllowed(body: unknown, inviteConfigured: string): void {
  if (!isRecord(body) || missingEmail(body.email)) {
    throw new ApiError(400, "EMAIL_REQUIRED", "Email is required");
  }

  const parsed = RegisterBody.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, "VALIDATION", "Invalid registration body", parsed.error.flatten());
  }

  if (parsed.data.age < 16) {
    throw new ApiError(400, "AGE_RESTRICTED", "You must be 16 or older to register");
  }

  if (inviteConfigured === "") {
    throw new ApiError(503, "INVITE_UNCONFIGURED", "Registration is not configured");
  }

  if (parsed.data.inviteCode !== inviteConfigured) {
    throw new ApiError(403, "INVITE_REQUIRED", "A valid invite code is required");
  }
}

function toBetterAuthSignUp(raw: Request, body: unknown): Request {
  const rec = isRecord(body) ? body : {};
  const forwarded: Record<string, unknown> = {
    email: rec.email,
    password: rec.password,
    name: rec.name,
  };
  if (typeof rec.username === "string") {
    forwarded.username = rec.username;
  }
  const headers = new Headers(raw.headers);
  headers.set("content-type", "application/json");
  return new Request(raw.url, {
    method: raw.method,
    headers,
    body: JSON.stringify(forwarded),
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function missingEmail(email: unknown): boolean {
  return email === undefined || email === null || email === "";
}
