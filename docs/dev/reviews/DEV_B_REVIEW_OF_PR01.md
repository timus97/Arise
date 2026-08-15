# Peer review: Dev B → Dev A (PR 01)

Reviewed worktree `subagent-01a0043f-9d5d-7211-80c9-5c5d213a9579` at claimed commit `2bba816f2ca1b5b4a85a496182946db716011b97` (`chore: scaffold arise monorepo (pnpm, turbo, FORBIDDEN.txt)`). Checked against design §6 / §19 / PR 01 and ARISE-001. Did not modify Dev A’s tree.

### Verdict: PASS

### Summary

PR 01 is a clean, independently reviewable scaffold. Root `package.json` is `"name": "arise"`, `"private": true`, `"packageManager": "pnpm@9.15.0"`, `engines.node` `>=22 <23`. Workspaces are `apps/*` and `packages/*`. Turbo 2 `tasks` cover build / lint / typecheck / test / dev. `tsconfig.base.json` is strict (plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`). `FORBIDDEN.txt` has the nine §19 phrases, one per line. MIT `LICENSE`, `.npmrc`, and `.gitignore` are present. Placeholders exist for `@arise/domain`, `@arise/engine`, `@arise/db`, `@arise/health`, `@arise/ui`, `apps/web`, `apps/api`, plus `@arise/config` (`eslint.config.js`, `tsconfig.react.json`, `tsconfig.lib.json`). App/package sources are `export {}` only — no Hono, engine math, or UI. `pnpm-lock.yaml` and a populated workspace `node_modules` show `pnpm install` / `pnpm -r` resolve. No `wrangler.toml`, `deploy.yml`, `push/`, or Bluetooth/Apple-export files.

README states Compose on localhost is the **$0 v1 host**, uses the allowed hunter-system sentence once, disclaims affiliation, includes a medical disclaimer, and tells the operator to rename the working folder to `arise` without repeating a forbidden mark (correct: `Sololeveling` would trip CI). No IP strings outside `FORBIDDEN.txt` in committed scaffold files (`docs/design.md` in the worktree is the parent design copy, not product source).

Non-blocking notes only. Ready to merge from a PR 01 contract standpoint.

### Issues

### Issue 1 -- Severity: suggestion
- **File**: packages/domain/package.json:10
- **Description**: Every placeholder that typechecks (`apps/api`, `apps/web`, `packages/{domain,engine,db,health,ui}`) runs `tsc` but does not declare `typescript`. That only works because root has `typescript` and `.npmrc` sets `shamefully-hoist=true`. A later hoist/isolation change, or `pnpm --filter @arise/domain typecheck` in a stricter layout, will fail with `tsc: not found`. Same pattern on `apps/api/package.json:7` and the other workspace `package.json` scripts.
- **Suggestion**: Add `typescript` as a `devDependency` on each package that invokes `tsc`, or document that the compiler is a root-only tool and invoke it via `pnpm exec` from the root. Keep `@arise/config` script-free if it stays types-only.
- **Status**: open

### Issue 2 -- Severity: suggestion
- **File**: packages/domain/tsconfig.json:2
- **Description**: `packages/config/tsconfig.lib.json` is exported from `@arise/config` but unused. `domain`, `engine`, `db`, and `health` extend `../../tsconfig.base.json` directly. `apps/web` and `packages/ui` do use the react config (good), so the lib preset is the one that is not wired up.
- **Suggestion**: Point library packages at `../../packages/config/tsconfig.lib.json` (or `@arise/config/tsconfig.lib.json`) so the shared contract is exercised before PR 03/04/06.
- **Status**: open

### Issue 3 -- Severity: nit
- **File**: README.md:5
- **Description**: ARISE-001 asks the README to name Compose as the $0 host / v1 launch path (`docker compose up --build` on localhost). The $0 / localhost claim is present and load-bearing. The exact compose command and port `8080` are not. Design PR 01 itself only requires “README states Compose is the $0 host,” which this meets.
- **Suggestion**: Add one line such as `docker compose up --build` then open `http://localhost:8080`, without turning this README into the PR 20 runbook.
- **Status**: open

### Issue 4 -- Severity: nit
- **File**: README.md:15
- **Description**: Setup tells engineers to run `pnpm dev`, and root `package.json:14` is `turbo run dev`, but no workspace package defines a `dev` script yet. Turbo will no-op or warn until PR 08/13 add real `dev` entries. Acceptable for a placeholder tree; slightly misleading as written.
- **Suggestion**: Keep `pnpm install` as the verified command; note that `pnpm dev` lands with the API/web apps, or add a one-line placeholder `dev` script that prints the same.
- **Status**: open

### Blocking count
0 blocking (bug + must-fix suggestion)
