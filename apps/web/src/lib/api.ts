export const FETCH_CREDENTIALS = "include" as const;

export type ApiErrorPayload = {
  code: string;
  message: string;
  details?: unknown;
};

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
    if (details !== undefined) {
      this.details = details;
    }
  }
}

export function isRelativeApiPath(path: string): boolean {
  return path.startsWith("/api/") && !/^https?:\/\//i.test(path);
}

export function assertRelativeApiPath(path: string): string {
  if (!isRelativeApiPath(path)) {
    throw new Error(`API path must be a relative /api/... URL, got: ${path}`);
  }
  return path;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseApiErrorPayload(data: unknown): ApiErrorPayload {
  if (!isRecord(data)) {
    return { code: "REQUEST_FAILED", message: "Request failed" };
  }

  const nested = data.error;
  if (isRecord(nested) && typeof nested.code === "string") {
    const payload: ApiErrorPayload = {
      code: nested.code,
      message: typeof nested.message === "string" ? nested.message : nested.code,
    };
    if (nested.details !== undefined) {
      payload.details = nested.details;
    }
    return payload;
  }

  if (typeof data.code === "string") {
    return {
      code: data.code,
      message: typeof data.message === "string" ? data.message : data.code,
    };
  }

  if (typeof data.message === "string") {
    return { code: "REQUEST_FAILED", message: data.message };
  }

  return { code: "REQUEST_FAILED", message: "Request failed" };
}

export function requestInit(init: RequestInit = {}): RequestInit {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  return {
    ...init,
    credentials: FETCH_CREDENTIALS,
    headers,
  };
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(assertRelativeApiPath(path), requestInit(init));

  if (!res.ok) {
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

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}
