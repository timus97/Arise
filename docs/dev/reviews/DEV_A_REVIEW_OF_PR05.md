# Peer review: Dev A → Dev B (PR 02 / 05)

Reviewed worktree `C:\Users\Timus97\.grok\worktrees\grokanalysis-arise\subagent-01a0043f-9d60-7111-ad6f-a5e64d886728` at `e10e3e7e7b4ebfdbce1496280884e7764626fc7b` (`chore/env-dockerfiles-ci`). Design contract: §16.2, §16.4, §17, PR 02, PR 05, ARISE-002 / ARISE-005.

### Verdict: PASS

### Summary

PR 02 + PR 05 match the load-bearing Compose/CI contract. `.env.example` is the §17 block (invite required, no VAPID, no `FEATURE_SOCIAL`). `docker-compose.yml` is one service `arise`, `8080:8787`, `arise-data`, wget `/health`, no Caddy, no `web` service. `api.Dockerfile` is the §16.2 recipe (`node:22-bookworm-slim`, pnpm 9.15.0, `pnpm --filter api deploy --prod /out/api`, `SERVE_STATIC`, uid 10001 + gosu in entrypoint, `HEALTHCHECK`). Entrypoint and `backup-sqlite.sh` use `set -eu`, `sqlite3 .backup`, 14-day retain. Restore script exists and is honest (refuse overwrite, apply dump, `PRAGMA integrity_check`). CI is Node 22 + pnpm 9 with a required forbidden-string job that **inverts rg exit codes correctly** (rg 0 = hit = fail). No stub Hono `/health` app. No `wrangler.toml`, `Caddyfile`, `web.Dockerfile`, or `deploy.yml`. `infra/docker/README.md` is explicit: localhost only, `up` may fail until PR 08.

No blocking issues. Suggestions below are tightenings, not merge gates.

### Issues

### Issue 1 -- Severity: suggestion
- **File**: .github/workflows/ci.yml:22
- **Description**: Forbidden grep is required and fails the build, but the globs are wider than design §19 / DoD PR 02 (`rg -i -f FORBIDDEN.txt --glob '!grok-design*' --glob '!.git/**'`). The step adds `--glob "!docs/**"` and `--glob "!FORBIDDEN.txt"`. Excluding `FORBIDDEN.txt` is necessary (the list file would always be a hit). Excluding all of `docs/**` is broader than `!grok-design*` and would miss marks in `docs/dev/**`, `docs/product/**`, or `docs/backlog/**`. Note: the design glob `!grok-design*` does **not** match `docs/design.md`, so a literal design command would stay red if that file is tracked.
- **Suggestion**: Keep `!FORBIDDEN.txt`. Replace `!docs/**` with `!docs/design.md` (or `!**/design.md`) so review/product docs stay in the grep. Leave `!grok-design*` as specified.
- **Status**: open

### Issue 2 -- Severity: suggestion
- **File**: .github/workflows/ci.yml:51
- **Description**: Install skips when `package.json` is missing; lint/typecheck/test use `--if-present`. Understandable on a PR 01-less worktree, but after stack/merge those guards make a deleted turbo script a green job.
- **Suggestion**: Once this sits on PR 01, require `pnpm install --frozen-lockfile` and drop `--if-present` so missing `lint` / `typecheck` / `test` scripts fail CI.
- **Status**: open

### Issue 3 -- Severity: suggestion
- **File**: infra/scripts/restore-d1-to-sqlite.sh:19
- **Description**: `: > "$OUT"` creates the destination before `sqlite3` applies the dump. Combined with the refuse-overwrite check, a failed import leaves a 0-byte (or partial) file and blocks retry until the operator deletes it. Behavior is still honest; retry UX is sharp-edged.
- **Suggestion**: Import into a temp path, run `PRAGMA integrity_check`, then `mv` into `$OUT`. Delete the temp on failure.
- **Status**: open

### Issue 4 -- Severity: nit
- **File**: .github/workflows/ci.yml:43
- **Description**: `actions/setup-node@v4` does not set `cache: pnpm`. Correctness is fine; cold CI is slower than it needs to be.
- **Suggestion**: Add `cache: pnpm` (and keep pnpm/action-setup before setup-node).
- **Status**: open

### Issue 5 -- Severity: nit
- **File**: (repo root, file missing)
- **Description**: No `.dockerignore`. Compose context is `.`. Dockerfile only `COPY`s named paths, so this is not a correctness bug, but local `node_modules` / `.git` / `data/` will bloat the build context later.
- **Suggestion**: Add `.dockerignore` with `node_modules`, `.git`, `.turbo`, `data`, `**/*.sqlite`. Not required by PR 05.
- **Status**: open

### Blocking count
0 blocking (bug + must-fix suggestion)
