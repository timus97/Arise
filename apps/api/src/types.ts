import type { NodeDb } from "@arise/db";
import type { Auth } from "./auth.js";
import type { Env } from "./env.js";

export type AppVariables = {
  requestId: string;
  userId?: string;
};

export type AppBindings = {
  Variables: AppVariables;
};

export type AppDeps = {
  env: Env;
  db: NodeDb;
  auth: Auth;
  version: string;
};
