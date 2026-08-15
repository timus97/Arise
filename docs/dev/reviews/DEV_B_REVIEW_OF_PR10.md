# Peer review: Dev B → Dev A (PR 10 / ARISE-011)

Reviewed worktree `C:\Users\Timus97\.grok\worktrees\grokanalysis-arise\subagent-01a004b8-f26f-72c2-ad0a-e112214db34b` at `a61eb8134971e8e3527e3c2818824a84de5adc1d` (`feat(api): POST /me/today/ensure, complete/skip, lazy fail`) on `feat/ARISE-011-ensure-quests` (tracks `origin/feat/ARISE-011-ensure-quests`; parent `d04a7da` on `main`). Checked against design §9.9–10 / Today+Quests API, ARISE-011 acceptance criteria, Sprint 3 assignment, and DoD PR 10 must-cover. Did not modify Dev A’s API source. Did not push.

### Verdict: PASS

### Summary

PR 10 lands the contracted ensure + complete/skip + lazy-fail slice and is independently reviewable. Required files exist: `apps/api/src/routes/today.ts`, `apps/api/src/routes/quests.ts`, `apps/api/src/jobs/evaluate-penalties.ts`. Supporting surface is justified: `today-service.ts` (bundle read + §9.9 steps 1–7), `today.test.ts`. Scope is `apps/api/**` only. No health ingest, no Web Push, no habit-learning auto-regenerate, no Solo Leveling strings. Stats key is `intl`.

`GET /api/v1/me/today` is a read-only System window. Default date is local today in `profiles.time_zone`. Future → `400 DATE_IN_FUTURE`. No profile / pending → `409 ONBOARDING_REQUIRED`. Pregnancy shell → `409 PREGNANCY_HARD_STOP`. Success body has `date`, `needsEnsure`, `player` (level/xp/`xpToNext`/rank/title/stats.`intl`/streakDays/penaltyPoints30d), `recoveryScore`, `recoveryParts`, `planDay`, `quests`, `pendingModifiers`, `suggestRegenerate`, exact disclaimer. `planModifiers` is computed in memory only. `Cache-Control: private, no-store`.

`POST /api/v1/me/today/ensure` issues **today only**. Present `date` ≠ local today → `400 ENSURE_DATE_NOT_TODAY`. Algorithm matches §9.9: playable-profile 409s; 1 `todayBundle` `json_object`; catch-up `[last, today)` with `failFrom = last` so older leftovers still fail in one range `UPDATE` while caution/streak use the 14 most recent; fail still-`issued` only; unissued absences are not fails; no inserts for caught-up dates; already-issued persists **new** modifiers then touches `last_ensured_local_date`; else `issueToday` in-process and appends `penalty_easy_walk` unless rest/`illness_rest`; `atomic([ INSERT issuance_ledger, INSERT daily_quests, UPDATE profiles, optional xp_events/effects ])`; unique conflict of ledger → `SELECT` existing, still set `last_ensured_local_date = today`.

Named verify items hold:

- **GET today 0 writes.** Handler is `loadProfile` (SELECT) + `readTodayWindow` → one bundle `SELECT`. No `INSERT`/`UPDATE`/`DELETE`/`atomic`. `total_changes()` is unchanged in both `today.test.ts` and the updated onboarding GET case. After ensure, GET still writes 0 and does not persist `pendingModifiers`.
- **Ensure today-only / `ENSURE_DATE_NOT_TODAY`.** Route rejects any body `date` that is not the user-tz today. Service always issues `requireLocalToday`. Catch-up `UPDATE` is `local_date < :today`.
- **Ensure idempotent.** Second POST returns the same quest ids. `issuance_ledger` stays 1 row. Already-issued path does not insert quests. Ledger unique conflict still touches `last_ensured_local_date` and returns existing rows.
- **Cannot complete another user.** `loadMutationRow` is `WHERE q.id = ? AND q.user_id = ?` with the session id. Mutations repeat `AND user_id = ?`. Other user → **404** `NOT_FOUND` (tested; not `INTERNAL`).
- **Partial = 50% XP** on `profiles.xp` / `profiles.level` (`Math.round(reward * 0.5)`; 40 → 20). `applyStatTick(..., effort: "partial")` is the 0.5 stat path. Full complete writes XP to `profiles` and increments `hard_bouts` only when `prescription.intensity === "hard"`.
- **3rd `busy` in the ISO week** → store `failed` + `skip_reason='busy'`, not `skipped`. Uses `resolveSkip` with `busy_skips_week` (`skip_reason = 'busy'` scalar).
- **Disclaimer exact** on every System window payload: `"Arise is not a medical device. Stop if you feel pain, chest pressure, or faintness."`
- **`intl` not `int`.** Player stats come from domain `PlayerStats`. Tests assert `stats.intl` and `not.toHaveProperty("int")`.
- **No auto-regenerate.** `shouldSuggestRegenerate` is a payload flag only. `POST /plan/regenerate` is still `z.literal("schedule_change")`; `skip_pattern` is **400** `VALIDATION`. Cron stays a no-op.
- **Auth + onboarding tests still pass** (9 + 16): 401 `/me`, age 15 zero rows, invite fail-closed / mismatch, session cookie, worker 501, forget-password 404, health/ready, username-only `EMAIL_REQUIRED`, pregnancy hard-stop, `UNSAFE_LOSS_RATE`, preview 0 writes, regenerate + no skip-pattern.
- **`evaluate-penalties` does not issue today.** Calls only `catchUpMissedDays` for `last_ensured_local_date <` local today, 25 users/tick. No `INSERT` into `daily_quests` / `issuance_ledger`. Does not set `last_ensured_local_date = today`. Test: 26 leftover users → 25 failed, 0 today quests, 0 profiles advanced to today.

Query budgets (Node habit ≤ 20; asserted on the AC paths):

| Route | This PR | Cap |
| --- | --- | --- |
| `GET /me/today` | profile SELECT + 1 bundle. **0 writes.** | 1 bundle / 0 writes |
| `POST /me/today/ensure` (issue + catch-up) | 1 bundle + 1 catch-up `UPDATE` + 1 `atomic` (ledger + ≤5 quests + optional penalty/profile/effect) | ≤ **12** |
| `POST /quests/:id/complete` | 1 profile SELECT + 1 quest+profile select + 1 `atomic` (quest, completion, xp_event, snapshot, profiles, optional `hard_bouts`) | ≤ **8** |

Bundle is **1 statement**. `summaries14` is 14 days `BETWEEN :d13 AND :d`. `busySkipsWeek` compares `skip_reason = 'busy'` as a scalar. `recentQuests` (30d) replaces design `recentTemplates` + `openIssued` inside the same `json_object` — still one statement.

Also covered: skip `pain` → `pain_no_hard` 24h; second consecutive `illness` → `illness_rest` tomorrow 00:00–24:00 local; `rest_planned` writes no effect; catch-up fails leftover `issued` only and does not insert quests for the gap; penalty walk on the next issue when a fail is owed and today is not rest; `409 DAY_CLOSED` when the quest is not today’s `issued`; complete `clientId` replay returns the existing row.

### Test run

Worktree, PATH prepended with `C:\Users\Timus97\.nodejs\node-v22.23.2-win-x64` (Node v22.23.2):

- `pnpm --filter api test` — **PASS** (3 files, **39** tests: 9 auth + 16 onboarding + 14 today, vitest 3.2.7)
- `pnpm --filter api typecheck` — **PASS** (`tsc -p tsconfig.json --noEmit`, exit 0)

| Check | Result |
| --- | --- |
| Files `routes/today.ts` + `routes/quests.ts` + `jobs/evaluate-penalties.ts` | PASS |
| GET today **0 writes**; `needsEnsure` + empty quests when no ledger | PASS |
| Disclaimer exact; `intl` not `int`; `Cache-Control: private, no-store` | PASS |
| Future GET → 400; ensure other date → `ENSURE_DATE_NOT_TODAY` | PASS |
| Ensure idempotent; issue + catch-up ≤ **12** | PASS |
| Cannot complete another user (IDOR) | PASS |
| Partial 50% XP on `profiles`; complete ≤ **8** | PASS |
| 3rd busy → `failed`; pain / illness / rest effects | PASS |
| Catch-up fails leftover `issued` only; no gap inserts | PASS |
| `evaluate-penalties` 25/tick, does **not** issue today | PASS |
| `suggestRegenerate` flag only; no skip-pattern auto-regenerate | PASS |
| Existing auth (9) + onboarding (16) tests | PASS |
| TypeScript quality / typecheck | PASS |

### Issues

### Issue 1 -- Severity: suggestion
- **File**: apps/api/src/routes/today.ts:25-37, apps/api/src/today-service.ts:1159-1166
- **Description**: Design §10 / ARISE-011 budget for `GET /me/today` is **1 bundle**. The handler also `SELECT`s `profiles` (needed for IANA tz + 409 gates before the bundle). 0 writes. Test allows `lastQueryBudget.statements <= 2` because the profile read is untracked.
- **Suggestion**: Fold the profile object into `todayBundle.sql` as specified and derive tz/onboarding from that one statement, or document the extra SELECT as the +0/+1 session-adjacent read. Do not add writes.
- **Status**: open

### Issue 2 -- Severity: suggestion
- **File**: apps/api/src/routes/quests.ts:81-128, 373-430
- **Description**: Complete is 2 reads (`loadProfile` + the joined quest select) plus `atomic` of 5 statements, or 6 with `hard_bouts`. Happy path is 7–8 (cap). A destab `rank_events` insert on a hard complete is 9. Design table lists quest/completion/xp_event/profiles/snapshot/hard_bouts and not destab.
- **Suggestion**: Drop the extra `loadProfile` (the join already has the profile) so destab + hard stays ≤ 8. Keep `user_id = session.userId` on every write.
- **Status**: open

### Issue 3 -- Severity: suggestion
- **File**: apps/api/src/jobs/node-cron.ts:1-3, apps/api/src/jobs/evaluate-penalties.ts
- **Description**: `evaluatePenalties` is correct (catch-up only, 25/tick, no today issue) and unit-tested, but `startNodeCron` is still a no-op. ARISE-012 / PR 11 is the scheduled `15 3 * * *` UTC wire-up. Lazy fail on the next `POST /me/today/ensure` still works if cron never ran.
- **Suggestion**: Keep it unwired here. PR 11 must call this function and must not call `ensureToday` / `issueToday`.
- **Status**: open

### Issue 4 -- Severity: suggestion
- **File**: apps/api/src/routes/quests.ts:346-354
- **Description**: Streak +1 uses `othersDone` (every *other* required quest is done). Completing the last required quest is correct. Completing a `kind === "penalty"` quest after every required quest is already done increments `streak_days` a second time. Design: +1 only when every **required** quest that day is done; required excludes `penalty`.
- **Suggestion**: Increment only when the mutated quest is required (`kind !== "penalty"`) **and** every required quest (including this one) is done.
- **Status**: open

### Issue 5 -- Severity: suggestion
- **File**: apps/api/src/routes/quests.ts:122-123, packages/db/src/schema.ts:232
- **Description**: `quest_completions.client_id` is globally unique. User B reusing user A’s `clientId` on B’s own quest misses the per-user replay SELECT and then hits the unique index inside `atomic` → unmapped **500** `INTERNAL`. Not IDOR (A’s quest is still 404).
- **Suggestion**: Catch the unique conflict and return **400** `VALIDATION` `"clientId already used"`, or treat `(user_id, client_id)` as the idempotency key.
- **Status**: open

### Issue 6 -- Severity: nit
- **File**: apps/api/src/today-service.ts:953-993
- **Description**: Already-issued is `ledger !== null || quests.length > 0`. Orphan today-quests without a ledger row take that path and do not insert the missing ledger. POST fakes a ledger in the payload (`needsEnsure: false`); the next GET sees no ledger → `needsEnsure: true` and hides the quests. Production issue is atomic (ledger + quests), so this is only a regenerate/repair edge.
- **Suggestion**: If quests exist and ledger does not, `INSERT OR IGNORE` the ledger row in the same `atomic` as the `last_ensured` touch.
- **Status**: open

### Issue 7 -- Severity: nit
- **File**: apps/api/src/today-service.ts:712-717
- **Description**: `isLedgerConflict` treats any `code` containing `"CONSTRAINT"` as a ledger unique miss. A quest `idempotency_key` unique failure (orphans) would roll back the batch, then still `UPDATE last_ensured` and return whatever exists.
- **Suggestion**: Match only `issuance_ledger` unique / PK. Re-throw other constraints.
- **Status**: open

### Issue 8 -- Severity: nit
- **File**: apps/api/src/routes/quests.ts:208-241
- **Description**: `recomputeRank` patches the 30-day quest list by kind/status heuristics instead of quest `id`. Rank is still recomputed on complete/skip/ensure and destab writes `to_rank='A'` / `reason=destabilized`. Fine for v1 volumes; the merge can be wrong if two same-kind quests share a day.
- **Suggestion**: Key the replacement by `id` (the day-quests JSON already has it).
- **Status**: open

### Blocking count
0 blocking (bugs + must-fix)
