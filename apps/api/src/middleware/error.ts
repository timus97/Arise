import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { AppBindings } from "../types.js";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    if (details !== undefined) {
      this.details = details;
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
    return c.json(
      errorBody(err.code, err.message, err.details),
      err.status as ContentfulStatusCode,
    );
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
