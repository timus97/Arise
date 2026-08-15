import { createNodeDb, migrate } from "@arise/db";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { mkdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createApp } from "./app.js";
import { createAuth } from "./auth.js";
import { parseEnv } from "./env.js";
import { startNodeCron } from "./jobs/node-cron.js";

const VERSION = "0.0.0";

const env = parseEnv();
if (env.DATABASE_PATH !== ":memory:") {
  mkdirSync(dirname(env.DATABASE_PATH), { recursive: true });
}

const db = createNodeDb(env.DATABASE_PATH);
migrate(db.sqlite as Parameters<typeof migrate>[0]);

const auth = createAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  appOrigin: env.APP_ORIGIN,
  db: db.orm,
});

const app = createApp({ env, db, auth, version: VERSION });

if (env.SERVE_STATIC === "true") {
  const root = env.WEB_DIST;
  app.use("/*", serveStatic({ root }));
  app.get("*", async (c) => {
    if (c.req.path.startsWith("/api")) return c.notFound();
    const html = await readFile(join(root, "index.html"), "utf8");
    return c.html(html);
  });
}

serve({
  fetch: app.fetch,
  port: env.PORT,
  hostname: "0.0.0.0",
});

startNodeCron();
