# Peer review: Dev A → Dev B (ARISE-021 / PR 19)

Reviewed `origin/feat/ARISE-021-playwright-e2e` at `1e1d30210fc3a0cc37ee971ef9c5e37ec297c257` (`test(e2e): register, onboard, ensure, complete quest`). Parent `b81a3a0` on `origin/main`. GitHub: https://github.com/timus97/Arise/pull/22 (design PR **19**, GitHub `#22`). Design contract: `docs/design.md` revision 4 §20 PR 19, ARISE-021 AC, DoD PR 19 must-cover (Playwright: register **age 20** → onboard → ensure → complete one → XP up), `docs/dev/CI.md` e2e note. Team DoD: `docs/backlog/DEFINITION_OF_DONE.md`. Did not modify the author’s product source. Author does not self-merge.

GitHub: branch is on `origin`. PR is open into `main`. Required check context is **`ci`**. Do not self-merge.

### Verdict: PASS

### Summary

PR 19 lands the contracted Playwright happy path and is independently reviewable. Required file exists: `apps/web/e2e/happy-path.spec.ts`. Supporting surface is justified: `apps/web/playwright.config.ts` (isolated Node API + Vite `:5173`, invite `e2e-invite`, `data/arise-e2e.sqlite`), `apps/web/package.json` `test:e2e` + `@playwright/test` `^1.55.0` (lockfile `1.62.1`), `.github/workflows/ci.yml` job **`e2e`**, `docs/dev/CI.md` (e2e is not a required merge context), `docs/dev/SPRINT6_ASSIGNMENT.md`, `docs/backlog/SPRINT_BOARD.md` Sprint 6 **In progress**. Scope is those eight files only (+264 / −6). No Compose launch, no `45 3 * * *` backup cron, no `docker-compose.yml` / Dockerfile / entrypoint edits, no Caddy, no Workers, no VAPID / `push` / Bluetooth / Apple XML. Chrome mark is **SYSTEM**; product name Arise. No `dangerouslySetInnerHTML`. One story only — ARISE-022 stays Planned.

The spec is the design loop: register age **20** with matching `REGISTER_INVITE_CODE` (`E2E_INVITE` / config default `e2e-invite`) and the Medical notice checkbox (`acceptedMedicalDisclaimer: true` via `RegisterBody`), six-step onboard (PAR-Q all No; design-adjacent fixture: 168 cm / 72 kg / fat_loss 72→66 by 2026-12-01 / Europe/Stockholm / experience 1 / bands / knee / Mon Wed Fri Sat), then SYSTEM. `GET /api/v1/me/today` is the System window `useQuery`; when `needsEnsure` the **Issue today’s quests** CTA POSTs `/api/v1/me/today/ensure` and the spec `waitForResponse`s that POST. Completing the first issued quest (Confirm full) waits for status `completed` and asserts the `XpBar` line (`Lv N · X / Y XP`) rose. Servers are `127.0.0.1:5173` / `:8787` only.

No blocking issues. Notes below are tightenings, not merge gates.

### Blocking

None.

### Critical contract checks

| Check | Result |
| --- | --- |
| File `apps/web/e2e/happy-path.spec.ts` | **PASS** |
| Register age 20 → onboard → ensure → complete one → XP up | **PASS** — spec title + flow; CI e2e **1 passed (9.4s)** |
| Matching `REGISTER_INVITE_CODE` + `acceptedMedicalDisclaimer` | **PASS** — config/`E2E_INVITE` `e2e-invite`; Medical notice checkbox; `RegisterBody` requires `true` |
| GET `/me/today` then POST `/me/today/ensure` when `needsEnsure` | **PASS** — window GETs first; Issue CTA POSTs ensure; spec waits for POST 2xx |
| Completing a quest increases player XP | **PASS** — `readXp` after `completed`; into-level XP at L1 equals `player.xp` |
| No Web Push, Bluetooth, Apple XML, or cloud URL | **PASS** — localhost Vite + `tsx src/node.ts` only |
| Playwright job wired in CI (or documented) | **PASS** — both: job `e2e` + `docs/dev/CI.md` |
| No Solo Leveling IP / forbidden strings | **PASS** — none in the eight files; commit title clean |
| ARISE-022 / PR 20 not sneaked | **PASS** — `node-cron.ts` still `15 3 * * *` only; no compose/backup/Caddy/Workers |

### Non-blocking notes

### Issue 1 -- Severity: suggestion
- **File**: apps/web/e2e/happy-path.spec.ts:76-85
- **Description**: POST `/api/v1/me/today/ensure` is locked with `waitForResponse`. GET `/api/v1/me/today` is implicit (System window `getToday` + “Issue today’s quests” only after `needsEnsure`). That is the shipped ARISE-016 client contract. The spec would not catch a future change that POSTed ensure without a GET first, as long as the CTA still appeared.
- **Suggestion**: Optional: also `waitForResponse` a GET `/api/v1/me/today` after confirm-plan, before clicking Issue. Do not auto-ensure in the spec.
- **Status**: open

### Issue 2 -- Severity: suggestion
- **File**: apps/web/e2e/happy-path.spec.ts:88-102, packages/ui/src/XpBar.tsx:15
- **Description**: AC says player XP in the subsequent today payload. `readXp` parses the `XpBar` meta (`xpIntoLevel` / `xpToNext`), not `player.xp` on the JSON. At level 1 (`xpAtLevelStart === 0`) those are the same integer, and a first completion cannot level. A later level-up mid-test would reset the displayed numerator.
- **Suggestion**: Keep the UI assert (it is the player-visible loop). Optional extra: read `player.xp` off the complete or following GET today body. Do not invent a calorie axis.
- **Status**: open

### Issue 3 -- Severity: suggestion
- **File**: apps/web/e2e/happy-path.spec.ts:46
- **Description**: Target date is hardcoded `2026-12-01` with 72→66 kg. On 2026-08-16 that is ~15 weeks and under the 1% BW/week gate. The same fixture run after ~late October 2026 will 400 `UNSAFE_LOSS_RATE` and fail the spec.
- **Suggestion**: Compute a target date ~16 weeks ahead of `Date.now()`, or drop the optional target (still a valid onboard). Do not weaken the server gate.
- **Status**: open

### Issue 4 -- Severity: nit
- **File**: apps/web/playwright.config.ts:14
- **Description**: API uses a stable `data/arise-e2e.sqlite` (`data/*.sqlite` is gitignored; `data/` is tracked). Unique `e2e.${stamp}@example.com` avoids collisions. The file grows across local/CI runs.
- **Suggestion**: Optional: point `DATABASE_PATH` at a temp file per run. Not a merge gate; CI already passed against this path.
- **Status**: open

### Issue 5 -- Severity: nit
- **File**: (git) origin/feat/ARISE-021-playwright-e2e — GitHub PR #22
- **Description**: Combined commit-status API is empty (this repo reports **check runs**, not `statuses`). Check run **`ci`** is green on this SHA. Job **`e2e`** is also green and is correctly **not** a required protection context (`docs/dev/CI.md`). Team process: peer PASS, then **someone other than the author** merges.
- **Suggestion**: Merge after this PASS. Do not add `e2e` to `required_status_checks.contexts`. Do not self-merge.
- **Status**: open

### Test run results

Workspace `C:\Users\Timus97\Desktop\grokAnalysis\Arise` on `feat/ARISE-021-playwright-e2e` at `1e1d302` (same as `origin/feat/ARISE-021-playwright-e2e`). Did not edit product source. Did not re-run Playwright locally; used the GitHub Actions run on this SHA plus static contract review.

- GitHub Actions `CI` on `1e1d302` (pull_request) — **PASS** (https://github.com/timus97/Arise/actions/runs/31945609740)
  - check **`ci`** — **success** (lint, typecheck, test, forbidden-string grep)
  - check **`e2e`** — **success** — Playwright annotation **1 passed (9.4s)**
- Author PR body: local `pnpm --filter web test:e2e` — 1 passed (8.3s)
- Forbidden-string search on the eight PR files — **PASS** (no `FORBIDDEN.txt` hits). Product-source grep of Solo Leveling marks is docs-only (excluded by CI).
- `git grep` / file read on this SHA: no VAPID, no `FEATURE_PUSH`, no Bluetooth, no Apple XML / `export.zip`, no `deploy.yml`, no `45 3 * * *` backup cron. `apps/api/src/jobs/node-cron.ts` untouched (`15 3 * * *` retain + penalties; “No push job”).

### Checklist

- [x] File `apps/web/e2e/happy-path.spec.ts` (+ `playwright.config.ts` as needed)
- [x] Playwright: register (**age 20**) → onboard → ensure → complete one → XP up
- [x] Matching `REGISTER_INVITE_CODE`; `acceptedMedicalDisclaimer: true`
- [x] GET `/me/today` then POST `/me/today/ensure` when `needsEnsure`
- [x] Completing a quest increases displayed / player XP
- [x] No Web Push, Bluetooth, Apple XML, or cloud URL
- [x] Playwright job wired in CI **and** documented; required context stays **`ci`**
- [x] Sprint 6 board In progress; ARISE-021 In progress; ARISE-022 Planned
- [x] PR 20 / compose / backup cron / Caddy / Workers not sneaked
- [x] Chrome SYSTEM; product Arise; English
- [x] No `dangerouslySetInnerHTML`
- [x] GitHub `ci` green; GitHub `e2e` green
- [x] Forbidden-string grep green
- [x] Peer review PASS
- [ ] After PASS, merge by the other senior; author does not self-merge

### Blocking count

0 blocking (bug + must-fix suggestion)
