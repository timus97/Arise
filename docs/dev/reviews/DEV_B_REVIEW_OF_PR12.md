# Peer review: Dev B → Dev A (PR 12 / ARISE-013)

Reviewed worktree `C:\Users\Timus97\.grok\worktrees\grokanalysis-arise\subagent-01a004e1-7eb5-7542-8b71-40752f9c7a98` at `ae326d4400cc584cb2e2a19ed5e7d93c1a11287f` (`feat(api): progress, JSON export, account delete, reset-password CLI`) on `feat/ARISE-013-progress-export` (tracks `origin/feat/ARISE-013-progress-export`; parent `bdbe1a0` on `main`). Checked against design §7 / §11 GDPR / §18 progress+debug / PR 12 file list, ARISE-013 acceptance criteria, and DoD PR 12 must-cover. Did not modify Dev A’s API source. Did not push.

### Verdict: PASS

### Summary

PR 12 lands the contracted progress + JSON export + account delete + reset-password CLI slice and is independently reviewable. Required files exist: `apps/api/src/routes/progress.ts`, `routes/export.ts`, `cli/reset-password.ts`, `routes/me.ts` (debug). Supporting surface is justified: `export.test.ts`, `GET /me` moved from `app.ts` into `me.ts`, `ensureDogfood` + `recordEnsureDogfood` in `today-service.ts` (wired from `POST /me/today/ensure`). Scope is `apps/api/**` only. Stacked on `main` after PR 10 (story depends on ARISE-011, not 012). No health ingest, no Web Push / VAPID, no Apple XML / `export.zip`, no habit-learning auto-regenerate, no Solo Leveling strings. No transactional email.

`GET /api/v1/progress` is session-gated and playable-profile gated. Window is last **90** local dates (`from = today-89`, `to = today`, `days: 90`) plus rank/xp events with `created_at >= now - 90d`. Body is camelCase: `player` (level/xp/rank/title/stats.`intl`/streakDays), `snapshots`, `rankEvents`, `xpEvents`. `Cache-Control: private, no-store`.

`GET /api/v1/me/export` is session-gated, `application/json`, `Content-Disposition: attachment; filename="arise-export.json"`. Account `SELECT` lists columns **without** `password`; `exportRow` / `omitPassword` drop any leftover `password` key. Other users’ emails/ids do not appear.

`POST /api/v1/account/delete` runs one `atomic` of 20 `DELETE`s (completions → quests → ledger → health/summaries/snapshots/events/effects/integrations → plan graph → profile → session/account → audit → verification by email/username → `user`) and expires `arise.session` / `arise.session_data` (`Max-Age=0`). Other users’ rows stay.

`GET /api/v1/me/debug` is session-gated and returns `{ lastEnsureMs, lastQueryCount, lastD1Meta, effects, recoveryParts }`. `POST /api/v1/auth/forget-password` is still **404** `NOT_FOUND` when `SMTP_URL` is empty. CLI matches the contracted argv (`--identifier USER --password -`), hashes with `better-auth/crypto` `hashPassword` (scrypt; sign-in accepts the new hash).

Named verify items hold:

- **Export omits password.** `loadAccountsWithoutPassword` does not select `account.password`. Response text does not contain the stored hash, does not match `"password"\s*:`, and `body.account[0]` has no `password` key. Other user’s email/id are absent.
- **Delete cascades.** After `POST /account/delete` the deleted user has 0 rows in session/account/profiles/goals/habit_profiles/plans/plan_days/stat_snapshots/xp_events/rank_events/user_effects/health_samples/daily_summaries; `user` and `verification` rows are gone; the other onboarded user still has rows. Cookies are expired.
- **Forget-password 404 without SMTP.** `SMTP_URL === ""` → **404** `NOT_FOUND` on `POST /api/v1/auth/forget-password` (auth suite + export suite).
- **GET /progress 90 days.** `days === 90`, `to` is local today, `from` is today−89. Snapshot/rank/xp at −10 days included; rows at −100 days excluded. `stats.intl` present, no `int`.
- **GET /me/debug auth’d.** Route uses `requireSession`. Cookie session after ensure → **200** with numeric `lastEnsureMs` ≥ 0, `lastQueryCount > 0`, `lastD1Meta.queries === lastQueryCount`, `effects` array, `recoveryParts` `{ sleep, restHr, hrv, load, subjective }`.

Also covered: CLI `--identifier` email or username; old password rejected after reset; new password signs in and sets `arise.session`. Existing tests still pass (9 auth + 16 onboarding + 14 today): 401 `/me`, age 15 zero rows, invite fail-closed / mismatch, session cookie, worker 501, forget-password 404, health/ready, username-only `EMAIL_REQUIRED`, pregnancy hard-stop, `UNSAFE_LOSS_RATE`, preview 0 writes, regenerate + no skip-pattern, GET today 0 writes, ensure idempotent, IDOR complete, partial 50% XP, 3rd busy → fail, `evaluate-penalties` does not issue today.

### Test run

Worktree, PATH prepended with `C:\Users\Timus97\.nodejs\node-v22.23.2-win-x64` (Node v22.23.2):

- `pnpm --filter api test` — **PASS** (4 files, **45** tests: 9 auth + 16 onboarding + 14 today + 6 export, vitest 3.2.7)
- `pnpm --filter api typecheck` — **PASS** (`tsc -p tsconfig.json --noEmit`, exit 0)

| Check | Result |
| --- | --- |
| Files `routes/progress.ts` + `routes/export.ts` + `cli/reset-password.ts` + `routes/me.ts` | PASS |
| Export `arise-export.json`; no `account.password`; no other users | PASS |
| Delete cascade; other users remain; session cookies expired | PASS |
| `POST /auth/forget-password` **404** when `SMTP_URL` unset | PASS |
| `GET /progress` last **90** days; `intl` not `int` | PASS |
| `GET /me/debug` auth’d dogfood shape after ensure | PASS |
| CLI reset hashes a password that signs in | PASS |
| Existing auth (9) + onboarding (16) + today (14) | PASS |
| TypeScript quality / typecheck | PASS |

### Issues

### Issue 1 -- Severity: suggestion
- **File**: apps/api/src/today-service.ts:51-76, apps/api/src/routes/me.ts:93-96
- **Description**: `ensureDogfood` is process-global. `GET /me/debug` is session-gated but `lastEnsureMs` / `lastQueryCount` / `lastD1Meta` are the last ensure on this Node process, not this user. Fine for single-operator dogfood; two concurrent players (or parallel `app.request` files) cross-talk.
- **Suggestion**: Key the counters by `userId` on `AppDeps`, or reset them per request and only fill after this user’s ensure.
- **Status**: open

### Issue 2 -- Severity: suggestion
- **File**: apps/api/src/today-service.ts:68-75
- **Description**: `lastD1Meta` is `{ rowsRead: 0, rowsWritten: 0, queries: queryCount }`. The field exists (AC) but `rowsRead` / `rowsWritten` are never taken from statement `meta`.
- **Suggestion**: Sum `meta` from the bundle / `atomic` statements the same way design §18 logs `d1: { rowsRead, rowsWritten, queries }`, or document the stub.
- **Status**: open

### Issue 3 -- Severity: suggestion
- **File**: apps/api/src/routes/export.ts:21-23, 91-102, 119-125
- **Description**: Export includes `session` (`SELECT *`, so live `token`) and `verification.value`. Design only forbids `accounts.password` and other users. A downloaded `arise-export.json` is then a session-hijack file until those rows expire.
- **Suggestion**: Omit `session.token` (and verification secrets) the same way password is omitted, or export session metadata without the bearer.
- **Status**: open

### Issue 4 -- Severity: suggestion
- **File**: apps/api/src/cli/reset-password.ts:55-65
- **Description**: CLI updates `account.password` only. Existing `session` rows stay valid, so a stolen cookie still works after the operator reset.
- **Suggestion**: `DELETE FROM session WHERE user_id = ?` in the same write, matching delete’s cookie expire.
- **Status**: open

### Issue 5 -- Severity: nit
- **File**: apps/api/src/routes/export.ts:128-158, apps/api/src/__tests__/export.test.ts:343-357
- **Description**: Cascade SQL also deletes `daily_quests`, `quest_completions`, `issuance_ledger`, `integrations`, `audit_logs`. The test does not seed or assert those five (onboarding + `seedUserScopedRows` never insert them). `rate_limits` / `auth_rl` are key-based and left behind (`health_ingest:<userId>` after PR 11).
- **Suggestion**: Ensure once (or insert a ledger row) and assert 0 leftovers. Optionally `DELETE FROM rate_limits WHERE key LIKE 'health_ingest:' || ?`.
- **Status**: open

### Issue 6 -- Severity: nit
- **File**: apps/api/src/routes/progress.ts:44-45
- **Description**: Snapshots use 90 inclusive local dates; rank/xp events use `now - 90 * 86400000` ms UTC. A late-evening event on local day `from` can fall outside the rolling instant window.
- **Suggestion**: Filter events with the same local-day bounds, or document the rolling 90×24h cut.
- **Status**: open

### Blocking count
0 blocking (bugs + must-fix)
