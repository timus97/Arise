# Peer review: Dev A → SRE (ARISE-023 / ARISE-024)

Reviewed worktree `C:\Users\Timus97\.grok\worktrees\grokanalysis-arise\subagent-01a004d7-941d-7ec3-9bae-57d37074ddaa` at `636cd3fe9c0f60173abf5d955a2b45255d4ceb2b` (`feat/ARISE-023-ci-merge-gates`). Contract: Sprint 4 assignment, `USER_STORIES.md` ARISE-023 / ARISE-024, design §16 / §19 (no `deploy.yml`). Did not modify SRE’s workflow. Review file is written only on the main workspace path.

### Verdict: PASS

### Summary

ARISE-023 hardens `.github/workflows/ci.yml` and ARISE-024 lands merge-gate docs + the PR template. The workflow directory contains **only** `ci.yml`. There is **no** `.github/workflows/deploy.yml`, no Cloudflare / Pages / Workers / Caddy / wrangler job, and no auto-deploy on merge.

023 load-bearing items are present and correct:

- `concurrency.group: ${{ github.ref }}` with `cancel-in-progress: true`
- Node 22 + pnpm 9; `actions/setup-node` `cache: pnpm`
- `pnpm install --frozen-lockfile` with no unfrozen fallback and no `package.json` skip
- Forbidden-string grep still **fail-closed**: rg 0 (hit) → job fail; rg 1 (clean) → pass; rg 2+ (error) → job fail
- `pnpm run typecheck` and `pnpm run test` are required steps with **no** `--if-present` and **no** `hashFiles('package.json')` skip

024 load-bearing items:

- `docs/dev/CI.md` names the required check exactly **`CI / ci`** (workflow `CI`, job id `ci`)
- `.github/pull_request_template.md` restates peer PASS, green CI (lint / typecheck / tests / forbidden-string grep), and no deploy.yml / Cloudflare / Pages / Workers / Caddy
- Protection PUT/GET commands are recorded; SRE_INTAKE claims protection was applied 2026-08-15 (required PR + `CI / ci` + `enforce_admins` + no force-push)

No Cloudflare deploy was added. The grep invert was not broken.

### Gate checklist

- [x] No `.github/workflows/deploy.yml`
- [x] `concurrency` + `cancel-in-progress: true`
- [x] `pnpm install --frozen-lockfile`
- [x] Forbidden grep fail-closed (match or rg error → red)
- [x] Typecheck / test not skipped (`--if-present` removed)
- [x] `docs/dev/CI.md` documents required check `CI / ci`
- [x] No Cloudflare / Pages / Workers / Caddy deploy job

### Issues

### Issue 1 -- Severity: suggestion
- **File**: .github/pull_request_template.md:25
- **Description**: ARISE-024 AC asks the template to tell authors the required check is **`CI / ci`**. The merge-gate checkbox says “CI on this PR is green: lint, typecheck, tests, forbidden-string grep” and points at `docs/dev/CI.md`, but it never writes the exact check name. Branch protection and `CI.md` already use `CI / ci`.
- **Suggestion**: Change that checkbox to name `CI / ci` (e.g. “Required check **`CI / ci`** is green: lint, typecheck, tests, forbidden-string grep”).
- **Status**: open

### Issue 2 -- Severity: suggestion
- **File**: docs/dev/GIT_WORKFLOW.md:51-59
- **Description**: “After peer PASS” still documents local `git merge --no-ff` + `git push origin main`. If `main` protection is applied (`enforce_admins`, required PR), that push is rejected — including for admins. `docs/dev/SRE_INTAKE.md` already flags this as a docs follow-up. Not a 023 fail; 024 AC is docs + template + protection-or-recorded-command, which they met.
- **Suggestion**: Rewrite that section to: merge the GitHub PR into `main` after `CI / ci` green + peer PASS. Do not push commits directly to `main`.
- **Status**: open

### Issue 3 -- Severity: nit
- **File**: (git) feat/ARISE-023-ci-merge-gates
- **Description**: Sprint 4 said one story per branch (`chore/ARISE-023-harden-ci` then `chore/ARISE-024-merge-gates`) and “never mix 023 and 024.” This commit lands both on `feat/ARISE-023-ci-merge-gates`. Independently reviewable; process only.
- **Suggestion**: Next SRE stories keep `chore/<STORY-ID>-<slug>` and do not mix stories.
- **Status**: open

### Issue 4 -- Severity: nit
- **File**: .github/workflows/ci.yml:29
- **Description**: Grep still excludes `--glob "!docs/**"` (plus `!FORBIDDEN.txt`). Same as PR 05. Fail-closed invert is intact. Excluding all of `docs/**` is wider than design §19 (`!grok-design*` + `!.git/**`) and would miss marks in review/product/backlog docs.
- **Suggestion**: Keep `!FORBIDDEN.txt`. Optionally replace `!docs/**` with `!docs/design.md` so review/product docs stay in the grep. Do not weaken the exit-code invert.
- **Status**: open

### Blocking count
0 blocking (bug + must-fix suggestion)
