import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { AppBindings } from "../types.js";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  readonly actions?: readonly string[];
  readonly fields?: Record<string, unknown>;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
    extras?: { actions?: readonly string[]; fields?: Record<string, unknown> },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    if (details !== undefined) {
      this.details = details;
    }
    if (extras?.actions !== undefined) {
      this.actions = extras.actions;
    }
    if (extras?.fields !== undefined) {
      this.fields = extras.fields;
    }
  }
}

export type ErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export function errorBody(
  code: string,
  message: string,
  details?: unknown,
): ErrorBody {
  if (details === undefined) {
    return { error: { code, message } };
  }
  return { error: { code, message, details } };
}

export function handleError(err: unknown, c: Context<AppBindings>): Response {
  if (err instanceof ApiError) {
    const body: ErrorBody & Record<string, unknown> = errorBody(
      err.code,
      err.message,
      err.details,
    );
    if (err.actions !== undefined) {
      body.actions = err.actions;
    }
    if (err.fields !== undefined) {
      Object.assign(body, err.fields);
    }
    return c.json(body, err.status as ContentfulStatusCode);
  }
  const msg = err instanceof Error ? err.message : "Internal error";
  console.error(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: "error",
      requestId: c.get("requestId"),
      route: c.req.path,
      code: "INTERNAL",
      msg,
    }),
  );
  return c.json(errorBody("INTERNAL", "Internal error"), 500);
}
