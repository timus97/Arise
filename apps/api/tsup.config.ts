import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/node.ts"],
  format: ["esm"],
  platform: "node",
  target: "node22",
  outDir: "dist",
  sourcemap: true,
  clean: true,
  dts: false,
  splitting: false,
  external: ["better-sqlite3"],
  noExternal: ["@arise/db", "@arise/domain", "@arise/engine", "@arise/health"],
});
