import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { applyDotEnv, loadDotEnvFiles, parseDotEnv } from "../env.js";

describe("parseDotEnv", () => {
  it("reads keys, strips inline comments, and unquotes", () => {
    const parsed = parseDotEnv(`
# comment
APP_ORIGIN=http://localhost:5173
BETTER_AUTH_SECRET="super-secret-value"
DATABASE_PATH=./data/arise.sqlite   # local file
EMPTY=
`);
    expect(parsed.APP_ORIGIN).toBe("http://localhost:5173");
    expect(parsed.BETTER_AUTH_SECRET).toBe("super-secret-value");
    expect(parsed.DATABASE_PATH).toBe("./data/arise.sqlite");
    expect(parsed.EMPTY).toBe("");
    expect(parsed["# comment"]).toBeUndefined();
  });
});

describe("applyDotEnv", () => {
  it("does not override already-set process keys", () => {
    const env: Record<string, string | undefined> = {
      APP_ORIGIN: "http://already.set",
      BETTER_AUTH_SECRET: "",
    };
    const applied = applyDotEnv(
      {
        APP_ORIGIN: "http://from-file",
        BETTER_AUTH_SECRET: "from-file-secret-16",
        DATABASE_PATH: "./data/arise.sqlite",
      },
      env,
    );
    expect(env.APP_ORIGIN).toBe("http://already.set");
    expect(env.BETTER_AUTH_SECRET).toBe("from-file-secret-16");
    expect(env.DATABASE_PATH).toBe("./data/arise.sqlite");
    expect(applied).toEqual(["BETTER_AUTH_SECRET", "DATABASE_PATH"]);
  });
});

describe("loadDotEnvFiles", () => {
  it("loads an explicit file into an empty env bag", () => {
    const dir = mkdtempSync(join(tmpdir(), "arise-env-"));
    const path = join(dir, ".env");
    writeFileSync(
      path,
      "APP_ORIGIN=http://localhost:5173\nBETTER_AUTH_URL=http://localhost:5173\n",
    );
    const env: Record<string, string | undefined> = {};
    const loaded = loadDotEnvFiles(env, [path]);
    expect(loaded).toContain(path);
    expect(env.APP_ORIGIN).toBe("http://localhost:5173");
    expect(env.BETTER_AUTH_URL).toBe("http://localhost:5173");
  });
});
