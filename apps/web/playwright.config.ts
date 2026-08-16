import { defineConfig, devices } from "@playwright/test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");
const invite = process.env.E2E_INVITE ?? process.env.REGISTER_INVITE_CODE ?? "e2e-invite";

const apiEnv: Record<string, string> = {
  RUNTIME: "node",
  APP_ORIGIN: "http://127.0.0.1:5173",
  BETTER_AUTH_URL: "http://127.0.0.1:5173",
  BETTER_AUTH_SECRET: "e2e-secret-that-is-long-enough",
  DATABASE_PATH: resolve(repoRoot, "data/arise-e2e.sqlite"),
  REGISTER_INVITE_CODE: invite,
  LOG_LEVEL: "error",
  PORT: "8787",
  SERVE_STATIC: "false",
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 20_000 },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "pnpm exec tsx src/node.ts",
      cwd: resolve(here, "../api"),
      url: "http://127.0.0.1:8787/health",
      reuseExistingServer: false,
      timeout: 120_000,
      env: { ...process.env, ...apiEnv },
    },
    {
      command: "pnpm exec vite --host 127.0.0.1 --port 5173",
      cwd: here,
      url: "http://127.0.0.1:5173",
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
