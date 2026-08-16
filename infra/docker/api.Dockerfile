# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /src
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
RUN pnpm install --frozen-lockfile
RUN pnpm --filter api build && pnpm --filter web build
# Isolated prod tree — do NOT COPY the workspace node_modules (.pnpm symlinks break)
RUN pnpm --filter api deploy --prod /out/api
RUN mkdir -p /out/web && cp -a apps/web/dist/. /out/web/

FROM node:22-bookworm-slim AS api
RUN apt-get update && apt-get install -y --no-install-recommends wget sqlite3 ca-certificates gosu \
  && rm -rf /var/lib/apt/lists/* \
  && useradd -r -u 10001 arise \
  && mkdir -p /data /app
WORKDIR /app
ENV NODE_ENV=production RUNTIME=node PORT=8787 SERVE_STATIC=true WEB_DIST=/app/web
COPY --from=build /out/api /app
COPY --from=build /out/web /app/web
COPY packages/db/drizzle /app/drizzle
COPY infra/scripts/backup-sqlite.sh /usr/local/bin/backup-sqlite
COPY infra/docker/entrypoint.sh /usr/local/bin/entrypoint
RUN sed -i 's/\r$//' /usr/local/bin/backup-sqlite /usr/local/bin/entrypoint \
  && chmod +x /usr/local/bin/backup-sqlite /usr/local/bin/entrypoint \
  && chown -R arise:arise /app
# entrypoint starts as root, chowns /data, then gosu 10001
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s --retries=5 \
  CMD wget -qO- http://127.0.0.1:8787/health || exit 1
ENTRYPOINT ["/usr/local/bin/entrypoint"]
CMD ["node", "dist/node.js"]
