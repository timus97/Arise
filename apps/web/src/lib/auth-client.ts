import { api, ApiRequestError } from "./api.js";

export const sessionQueryKey = ["session"] as const;

export type RegisterInput = {
  email: string;
  password: string;
  name: string;
  age: number;
  inviteCode: string;
  acceptedMedicalDisclaimer: true;
  username?: string;
};

export type LoginInput = {
  identifier: string;
  password: string;
};

export type SessionUser = {
  userId: string;
};

const EMAIL_LIKE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function looksLikeEmail(identifier: string): boolean {
  return EMAIL_LIKE.test(identifier.trim());
}

export function signInPath(
  identifier: string,
): "/api/v1/auth/sign-in/email" | "/api/v1/auth/sign-in/username" {
  return looksLikeEmail(identifier)
    ? "/api/v1/auth/sign-in/email"
    : "/api/v1/auth/sign-in/username";
}

export function register(input: RegisterInput): Promise<unknown> {
  const body: Record<string, unknown> = {
    email: input.email,
    password: input.password,
    name: input.name,
    age: input.age,
    inviteCode: input.inviteCode,
    acceptedMedicalDisclaimer: true,
  };
  if (input.username !== undefined) {
    body.username = input.username;
  }
  return api("/api/v1/auth/sign-up/email", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function login(input: LoginInput): Promise<unknown> {
  const identifier = input.identifier.trim();
  const path = signInPath(identifier);
  const payload =
    path === "/api/v1/auth/sign-in/email"
      ? { email: identifier, password: input.password }
      : { username: identifier, password: input.password };
  return api(path, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getMe(): Promise<SessionUser> {
  return api<SessionUser>("/api/v1/me");
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    return await getMe();
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 401) {
      return null;
    }
    throw err;
  }
}

export function formatAuthError(err: unknown): string {
  if (err instanceof ApiRequestError) {
    const message = err.message || "Request failed";
    return `${message} (${err.code})`;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "Something went wrong.";
}
