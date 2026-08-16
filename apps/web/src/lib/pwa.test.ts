/// <reference types="node" />
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(here, "../..");
const swSource = readFileSync(resolve(here, "../sw.ts"), "utf8");
const manifest = JSON.parse(
  readFileSync(resolve(webRoot, "public/manifest.webmanifest"), "utf8"),
) as {
  name: string;
  display: string;
  theme_color: string;
  background_color: string;
};

const PNG_SIG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("manifest", () => {
  it("is Arise standalone with theme #050816", () => {
    expect(manifest.name).toBe("Arise");
    expect(manifest.display).toBe("standalone");
    expect(manifest.theme_color).toBe("#050816");
    expect(manifest.background_color).toBe("#050816");
  });
});

describe("service worker", () => {
  it("has no push handler, VAPID, or subscriptions", () => {
    expect(swSource).not.toMatch(/addEventListener\s*\(\s*['"`]push['"`]/);
    expect(swSource).not.toMatch(/onpush\s*=/);
    expect(swSource).not.toMatch(/showNotification\s*\(/);
    expect(swSource).not.toMatch(/pushManager/i);
    expect(swSource).not.toMatch(/push_subscriptions/);
    expect(swSource).not.toMatch(/vapid/i);
    expect(swSource).not.toMatch(/setAppBadge|clearAppBadge/);
    expect(swSource).toMatch(/networkFirstToday/);
    expect(swSource).toMatch(/\/api\/v1\/me\/today/);
    expect(swSource).toMatch(/TODAY_MAX_AGE_SECONDS\s*=\s*60\s*\*\s*60/);
  });
});

describe("icons", () => {
  it("ships original SYSTEM mark PNGs", () => {
    for (const name of ["icon-192.png", "icon-512.png", "maskable-512.png"]) {
      const path = resolve(webRoot, "public/icons", name);
      expect(existsSync(path), path).toBe(true);
      const bytes = readFileSync(path);
      expect(Array.from(bytes.subarray(0, 8))).toEqual(Array.from(PNG_SIG));
      expect(bytes.byteLength).toBeGreaterThan(64);
    }
  });
});
