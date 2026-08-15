# Peer review: Dev B → Dev A (PR 09 / ARISE-010)

Reviewed worktree `C:\Users\Timus97\.grok\worktrees\grokanalysis-arise\subagent-01a004a9-40c4-7723-927c-1474e57625c9` at `63ec8dc9e07ab11a04822ba2846de19c0c7dd1e6` (`feat(api): onboarding, plan preview/regenerate, pregnancy and loss-rate gates`) on `feat/ARISE-010-onboarding-plan` (tracks `origin/feat/ARISE-010-onboarding-plan`; parent `85471e7` on `main`). Checked against design onboarding API / §12 / §18, ARISE-010 acceptance criteria, Sprint 3 assignment, and DoD PR 09 must-cover. Did not modify Dev A’s API source. Did not push.

### Verdict: PASS

### Summary

PR 09 lands the contracted onboarding + plan-preview/regenerate + pregnancy/loss-rate gate slice and is independently reviewable. Required files exist: `apps/api/src/routes/onboarding.ts`, `apps/api/src/routes/plan.ts`. Supporting surface is justified: `routes/today.ts` (409 gates + 0-write stub; full issuer is PR 10), `sql.ts` / `ulid.ts`, `error.ts` extras (`actions`, top-level `fields`), `@arise/engine` on the api package + tsup `noExternal`. Scope is `apps/api/**` and the lockfile. No habit-learning column, no `shouldSuggestRegenerate` call, no `issueDay` / catalog issue path, no Web Push, no Solo Leveling strings.

`PUT /api/v1/onboarding` and `POST /api/v1/plan/preview` share `OnboardingBody` via `evaluateOnboardingRequest` → `parseOnboardingBody`. Preview is a sibling route (`persist: false`); it never calls `atomic`. Success PUT is `{ plan, days, profile }` with `profiles.onboarding_status = 'complete'` and 7 `plan_days` in one `atomic` (profile + goal + habit + plan + one multi-row day insert; 5 statements first time, 7 if a shell already exists — under the ~8 budget).

Named verify items hold:

- **Pregnancy** `parq.pregnancy === true` → **403** `{ error: { code: "PREGNANCY_HARD_STOP", message: "Arise is not appropriate during pregnancy. See a clinician for prenatal exercise guidance." }, actions: ["deleteAccount"] }`. Profile shell `onboarding_status='blocked_pregnancy'`, `parq_clear=0`, age/tz from the body. **No** `goals` / `habit_profiles` / `plans` / `plan_days`. Preview pregnancy is also 403 and writes **0** rows (including no shell).
- **Implied fat-loss** 80 → 70 in 14 days → **400** `UNSAFE_LOSS_RATE` with `error.details.maxKgPerWeek === 0.8`. Zero profile/goal/plan rows. Message includes the max kg/week and “relax the target date or target weight.” No calorie numbers.
- **Preview 0 writes.** Counts of `plans` / `goals` / `profiles` / `habit_profiles` / `plan_days` are unchanged; body is `{ plan, days }` with `version: 1` and 7 days.
- **PUT complete** → **200** `{ plan, days, profile }`, `onboardingStatus: "complete"`, 7 plan days persisted. `jobActivity` / `commuteWalkMinutes` / `sleepWindow` stored on `habit_profiles` only; not passed to `buildWeeklyPlan` or any issuer.
- **409** no-profile / pending → `ONBOARDING_REQUIRED` + top-level `needsOnboarding: true`. After a pregnancy shell, `GET /me/today` and `POST /me/today/ensure` → **409** `PREGNANCY_HARD_STOP` + `actions: ["deleteAccount"]`.
- **Today stub** after complete: **200**, `Cache-Control: private, no-store`, `{ needsEnsure: true, quests: [], disclaimer }`. GET and POST ensure write **0** `daily_quests` / `issuance_ledger` rows. No `issueDay`. Full System window is PR 10.
- **No v1.1 auto-regenerate.** `POST /plan/regenerate` body is `z.literal("schedule_change")`; `skip_pattern` is **400** `VALIDATION`. Cron stays a no-op. `shouldSuggestRegenerate` is not imported.
- **Existing auth tests still pass** (9/9): 401 `/me`, age 15 zero rows, invite fail-closed / mismatch, session cookie, worker 501, forget-password 404, health/ready, username-only `EMAIL_REQUIRED`.

Also covered (story AC, not just the must-cover trio): disclaimer/`week: []` → **400** `VALIDATION`; onboarding age 15 → **400** `AGE_RESTRICTED` (façade before Zod so it is not a generic `VALIDATION`); other PAR-Q yes → `parq_clear=0` and every day `hardAllowed=false` / `isGate=false`; `GET /plan` returns the active non-archived plan; regenerate increments `version`, archives the old plan, inserts 7 new days, leaves yesterday’s `completed` quest, and in one `atomic` deletes today’s all-`issued` quests **and** the ledger row.

`createAuth` production path is unchanged (`node.ts` does not pass `disableRateLimit`). Tests opt out of the shared in-process BA limiter so the two files can sign up freely.

### Test run

Worktree, PATH prepended with `C:\Users\Timus97\.nodejs\node-v22.23.2-win-x64` (Node v22.23.2):

- `pnpm --filter api test` — **PASS** (2 files, **25** tests: 9 auth + 16 onboarding, vitest 3.2.7)
- `pnpm --filter api typecheck` — **PASS** (`tsc -p tsconfig.json --noEmit`, exit 0)

| Check | Result |
| --- | --- |
| Files `routes/onboarding.ts` + `routes/plan.ts`; shared `OnboardingBody` | PASS |
| Pregnancy 403 + shell; no goal/habit/plan | PASS |
| `UNSAFE_LOSS_RATE` + `details.maxKgPerWeek` (0.8) | PASS |
| `POST /plan/preview` 0 writes | PASS |
| PUT 200 `{ plan, days, profile }` + 7 `plan_days` + `complete` | PASS |
| Disclaimer / Zod → 400 `VALIDATION`; age 15 → 400 `AGE_RESTRICTED` | PASS |
| Other PAR-Q yes → `parq_clear=false`, no hard days | PASS |
| 409 `ONBOARDING_REQUIRED` / `PREGNANCY_HARD_STOP` | PASS |
| Today stub 0 writes; no full issuer | PASS |
| `GET /plan` active; regenerate version + archive + issued-today delete | PASS |
| No v1.1 skip-pattern auto-regenerate | PASS |
| Existing auth tests (9) | PASS |
| TypeScript quality / typecheck | PASS |

### Issues

### Issue 1 -- Severity: suggestion
- **File**: apps/api/src/routes/onboarding.ts:389-397
- **Description**: `blocked_pregnancy` is not sticky on a later `PUT /onboarding` with `pregnancy: false`. The handler only looks at the current body. A blocked player can submit a cleared PAR-Q and receive `onboarding_status='complete'` plus a full plan. Design §12 / the wizard AC put the dead-end + delete-account CTA on the client (PR 15); today/plan already 409. The API still allows a retry loop.
- **Suggestion**: If `loadProfile` is already `blocked_pregnancy`, throw `pregnancyHardStop(409)` before persist (unless the product decision is “the new PAR-Q wins”). Keeps the hard-stop server-side.
- **Status**: open

### Issue 2 -- Severity: suggestion
- **File**: apps/api/src/routes/onboarding.ts:271-279
- **Description**: `persistPregnancyShell` upserts the profile only. First-time onboarding (the AC path) correctly inserts no goal/habit/plan. A second `PUT` with `pregnancy: true` after a successful complete leaves the previous active plan/goal/habit in place. `assertPlayableProfile` 409s those routes, so they are not playable, but the rows remain.
- **Suggestion**: In the same `atomic` as the shell, `UPDATE goals SET active = 0` and `UPDATE plans SET archived_at = ?` for that `user_id` (same as the re-complete path). Do not insert replacements.
- **Status**: open

### Issue 3 -- Severity: suggestion
- **File**: apps/api/src/routes/onboarding.ts:373-382
- **Description**: `timeZone` is `z.string().min(1)` (design snippet). `localDate(now, timeZone)` uses `Intl.DateTimeFormat`. A garbage IANA id throws `RangeError` and becomes **500** `INTERNAL` instead of **400** `VALIDATION`.
- **Suggestion**: Try/catch around `localDate` (or a small IANA allow-list) and map failure to `VALIDATION`. Optional; not in the must-cover table.
- **Status**: open

### Issue 4 -- Severity: nit
- **File**: apps/api/src/__tests__/onboarding.test.ts
- **Description**: Preview unsafe-loss (400 + 0 writes) is not a dedicated case. It shares `evaluateOnboardingRequest` with PUT, so the production path is the same. Must-cover “implied loss reject” is asserted on PUT.
- **Suggestion**: One preview copy of the 80→70 / 14-day body next to the existing preview 0-write test.
- **Status**: open

### Issue 5 -- Severity: nit
- **File**: apps/api/src/routes/today.ts:11-34
- **Description**: After complete, GET/POST today return the contracted stub (`needsEnsure: true`, `quests: []`, disclaimer) without `date` / `player` / `planDay`. Matches this review’s “today stub, no full issuer” gate and ARISE-011’s file list. Do not grow this into `issueDay` here.
- **Suggestion**: Leave the stub. PR 10 replaces it with the §9.9 / System-window payload.
- **Status**: open

### Blocking count
0 blocking (bugs + must-fix)
