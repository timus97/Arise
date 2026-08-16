# Peer review: Dev A → Dev B (ARISE-022 / PR 20)

Reviewed `origin/feat/ARISE-022-compose-launch` at `f8902e944f37302d04d3fd5bc05e7f435937f23c` (`chore: compose up --build runbook and sqlite backup cron`). Parent `5ba4697` on `origin/main`. GitHub: https://github.com/timus97/Arise/pull/24 (design PR **20**, GitHub `#24`). Design contract: `docs/design.md` revision 4 §16 / §16.5 / §20 PR 20, ARISE-022 AC, DoD PR 20 must-cover (fresh-volume `docker compose up --build`; `/onboarding` SPA not 404; `/app/web/index.html` + `node dist/node.js`). Team DoD: `docs/backlog/DEFINITION_OF_DONE.md`. Did not modify the author’s product source. Author does not self-merge.

GitHub: branch is on `origin`. PR is open into `main`. Required check context is **`ci`**. Do not self-merge.

### Verdict: PASS

### Summary

PR 20 lands the contracted Compose launch path and is independently reviewable. Required files exist: `docker-compose.yml` (final, one service `arise`), `infra/docker/api.Dockerfile` (§16.2 Node 22 recipe, unchanged this commit and already matching), `infra/docker/entrypoint.sh` (`mkdir -p /data/backups`; `chown -R 10001:10001 /data`; `exec gosu arise "$@"`), `infra/scripts/backup-sqlite.sh` (`sqlite3 .backup`, 14-day retain), README **Launch (v1)** section. Supporting surface is justified: second cron in `apps/api/src/jobs/node-cron.ts`, same-origin CSP in `apps/api/src/app.ts`, retain/auth tests, `infra/docker/README.md` (no longer “may fail until PR 08”), Sprint 6 board 022 **In progress**. Scope is those launch files only (+135 / −13 on eight paths). No `wrangler.toml`, no `deploy.yml`, no `Caddyfile` / `Caddyfile.http`, no `web.Dockerfile`, no custom domain, no Workers Paid. No Web Push / VAPID / `push` job. Chrome mark is **SYSTEM**; product name Arise. No `dangerouslySetInnerHTML`. One story only.

One Node 22 container (Hono + SQLite + static PWA). Ports **`8080:8787`**. `SERVE_STATIC=true`, `WEB_DIST=/app/web`. Compose **pins** `APP_ORIGIN` / `BETTER_AUTH_URL` to `http://localhost:8080` (overrides a Vite `.env` `:5173`), so `useSecureCookies` stays off. SPA fallback in `apps/api/src/node.ts` is registered after `createApp` (`/health`, `/ready`, `/api/*`): `serveStatic` + `GET *` → `index.html` so `GET /onboarding` must not 404. Second cron line is **`45 3 * * *` UTC** and `child_process.spawn`s `backup-sqlite` with `DATABASE_PATH`. Nightly retain + penalties remain `15 3 * * *`. No push job. Image recipe is `pnpm --filter api deploy --prod /out/api` plus `apps/web/dist` at `/app/web`; CMD is `node dist/node.js`.

No blocking issues. Notes below are tightenings, not merge gates. Fresh-volume Compose acceptance is the PO/tester check and may still be running; this review is the code contract.

### Blocking

None.

### Critical contract checks

| Check | Result |
| --- | --- |
| Files: compose, Dockerfile, entrypoint, backup-sqlite, README launch | **PASS** — all present; compose/README/runbook updated this SHA; Dockerfile/entrypoint/backup already matched §16.2 / §16.5 |
| One Node 22 container; `8080:8787`; `SERVE_STATIC=true`; `WEB_DIST=/app/web` | **PASS** — single service `arise`; image `node:22-bookworm-slim`; env set in Dockerfile + compose |
| SPA fallback in `node.ts` after `/api` `/health` `/ready` | **PASS** — `createApp` first, then `serveStatic` + `GET *` → `index.html`; `/api` still 404s |
| `entrypoint.sh` `mkdir -p /data/backups`; chown 10001; `gosu arise` | **PASS** — exact §16.2 block |
| Second cron `45 3 * * *` `spawn`s `backup-sqlite` | **PASS** — `BACKUP_CRON`; `runSqliteBackup` + `startNodeCron`; tests lock schedule + spawn |
| CSP same-origin including `connect-src 'self'` | **PASS** — design Security list on every response; auth `/health` asserts `default-src` + `connect-src` |
| No `wrangler.toml`, `deploy.yml`, `Caddyfile`, custom domains, Workers Paid | **PASS** — none of those files; worker `fetch` stays 501; workflows = `ci.yml` only |
| No Web Push | **PASS** — no `push` cron; `FEATURE_PUSH` unused; `sw.ts` still has no `push` handler |
| No Solo Leveling IP | **PASS** — none in the eight PR files; commit title clean; hunter-system sentence still once in README |
| One story only (ARISE-022 / design PR 20) | **PASS** — launch + backup cron + CSP + runbook; board 021 Done is status only |

### Non-blocking notes

### Issue 1 -- Severity: suggestion
- **File**: docker-compose.yml:14-15 vs design §16.2
- **Description**: Design shows `APP_ORIGIN: ${APP_ORIGIN:-http://localhost:8080}`. This PR hard-pins both origin vars to `http://localhost:8080` so a leftover Vite `.env` cannot leak `:5173` cookies. That is stricter than the interpolation default and matches the AC (`Secure` off because origin is `http://localhost:8080`). `infra/docker/README.md` still tells the operator to set the same values in `.env`; compose `environment:` already wins over `env_file`.
- **Suggestion**: Keep the pin. Optionally say in the runbook that compose overrides `.env` origins. Do not re-introduce interpolation that can point cookies at `:5173`.
- **Status**: open

### Issue 2 -- Severity: suggestion
- **File**: (GitHub PR #24 body) — fresh-volume acceptance
- **Description**: DoD / ARISE-022 acceptance is `docker compose up --build` on a **fresh** named volume, register at `http://localhost:8080/register`, deep-link refresh of `/onboarding` is the SPA, image contains `/app/web/index.html` and a working `node dist/node.js`. Author notes that check is running locally and will be recorded on the PR. Code review does not substitute for that PO/tester loop.
- **Suggestion**: Record the fresh-volume result (or a short `docker compose exec` listing of `/app/web/index.html` + `node dist/node.js`) on #24 before the other senior merges. Do not treat “container starts” as enough.
- **Status**: open

### Issue 3 -- Severity: suggestion
- **File**: apps/api/src/jobs/node-cron.ts:49-51
- **Description**: `spawn` uses `stdio: ["ignore", "pipe", "pipe"]` and never reads stdout/stderr. `backup-sqlite.sh` is quiet (`sqlite3 .backup` + `find`), so a filled pipe is unlikely. A chatty sqlite3 build could stall the child.
- **Suggestion**: Optional: `stdio: "ignore"` or drain the pipes. Failures already log on non-zero `close`.
- **Status**: open

### Issue 4 -- Severity: nit
- **File**: apps/api/src/__tests__/retain.test.ts:167-171
- **Description**: The new test locks `BACKUP_CRON === "45 3 * * *"` and the spawn helper. `startNodeCron` is only exercised (start/stop) on the nightly test. The second `schedule(...)` is visible in source and is the load-bearing wiring.
- **Suggestion**: Optional: assert `startNodeCron` can start/stop with both tasks registered. Do not add a push job to make the string test interesting.
- **Status**: open

### Issue 5 -- Severity: nit
- **File**: (git) origin/feat/ARISE-022-compose-launch — GitHub PR #24
- **Description**: Combined commit-status API is empty (this repo reports **check runs**, not `statuses`). Check run **`ci`** is green on this SHA. Job **`e2e`** is also green and is correctly **not** a required protection context (`docs/dev/CI.md`). Team process: peer PASS, then **someone other than the author** merges. PO still accepts the launch checklist.
- **Suggestion**: Merge after this PASS + recorded fresh-volume check. Do not add `e2e` (or a compose job) to `required_status_checks.contexts`. Do not self-merge. Do not add `wrangler.toml` / `deploy.yml` / Caddy to “finish” launch.
- **Status**: open

### Test run results

Workspace `C:\Users\Timus97\Desktop\grokAnalysis\Arise` on `feat/ARISE-022-compose-launch` at `f8902e9` (same as `origin/feat/ARISE-022-compose-launch`). Did not edit product source. Did not re-run Compose locally; used the GitHub Actions run on this SHA plus static contract review.

- GitHub Actions `CI` on `f8902e9` (pull_request) — **PASS** (https://github.com/timus97/Arise/actions/runs/31945965720)
  - check **`ci`** — **success** (lint, typecheck, test, forbidden-string grep)
  - check **`e2e`** — **success** (not a required merge context)
- Forbidden-string search on the eight PR files — **PASS** (no `FORBIDDEN.txt` hits). Product-source Solo Leveling marks are docs-only (excluded by CI).
- File read on this SHA: no `wrangler.toml`, no `.github/workflows/deploy.yml`, no `Caddyfile` / `Caddyfile.http`, no `infra/docker/web.Dockerfile`. `apps/api/src/worker.ts` default `fetch` remains 501. `sw.ts` has no `push` listener. `FEATURE_PUSH` stays unused in `.env.example`.

### Checklist

- [x] Files `docker-compose.yml`, `infra/docker/api.Dockerfile`, `infra/docker/entrypoint.sh`, `infra/scripts/backup-sqlite.sh`, README launch section
- [x] One Node 22 container; ports `8080:8787`; `SERVE_STATIC=true`; `WEB_DIST=/app/web`
- [x] SPA fallback after `/api` `/health` `/ready`; `GET /onboarding` is `index.html`, not a second-container `try_files`
- [x] `entrypoint.sh`: `mkdir -p /data/backups`; `chown -R 10001:10001 /data`; `exec gosu arise "$@"`
- [x] Second cron `45 3 * * *` `spawn`s `backup-sqlite` (14-day retain); D1 Time Travel is not a backup
- [x] Local/LAN HTTP 8080; `Secure` cookies off (`APP_ORIGIN=http://localhost:8080`)
- [x] CSP same-origin including `connect-src 'self'`
- [x] No `wrangler.toml`, `deploy.yml`, `Caddyfile`, custom domains, Workers Paid
- [x] No Web Push / VAPID / `push` job
- [x] No Solo Leveling IP strings; commit title clean
- [x] One story only (ARISE-022)
- [x] GitHub `ci` green; GitHub `e2e` green (not required)
- [x] Peer review PASS
- [ ] After PASS, merge by the other senior; author does not self-merge
- [ ] PO/tester: record fresh-volume Compose acceptance on the PR

### Blocking count

0 blocking (bug + must-fix suggestion)
