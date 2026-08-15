# Peer review: Dev B → Dev A (PR 11 / ARISE-012)

Reviewed worktree `C:\Users\Timus97\.grok\worktrees\grokanalysis-arise\subagent-01a004d7-9421-7272-918d-c267438e34ab` at `9fbb322b20da63747cbadd4c1c5cbc4e32b0fc6e` (`feat(api): health ingest, consent, daily summaries, retain job`) on `feat/ARISE-012-health-ingest` (tracks `origin/feat/ARISE-012-health-ingest`; parent `bdbe1a0` on `main`). Checked against design §9.10 / §11 / §16 Node cron / Health API, ARISE-012 acceptance criteria, Sprint 4 assignment, and DoD PR 11 must-cover. Did not modify Dev A’s API source. Did not push.

### Verdict: PASS

### Summary

PR 11 lands the contracted health ingest + consent + daily summaries + retain/penalty cron slice and is independently reviewable. Required files exist: `apps/api/src/routes/health.ts`, `apps/api/src/jobs/retain.ts`, `apps/api/src/jobs/node-cron.ts`. Supporting surface is justified: `health.test.ts`, `retain.test.ts`, `questModifierUpdateStmt` exported from `today-service.ts` (`json_insert` + `json_each` so ensure and ingest share one persist path), tsup `noExternal` for `@arise/health`, `node-cron` + types. Scope is `apps/api/**` and the lockfile. No progress/export/delete, no Web Push / VAPID, no Apple XML / `export.zip`, no habit-learning auto-regenerate, no Solo Leveling strings. `src/worker.ts` stays compile-only 501; cron is Node-only.

`POST /api/v1/health/samples` accepts `{ consent?: true, samples: [...] }` with `source` ∈ `csv|manual` and **max 200**. `POST /api/v1/health/manual` is sugar for one sample + optional `consent`. `GET /api/v1/health/summary?from&to` returns `DailySummary[]`. First successful ingest requires `{ "consent": true }` and stamps `profiles.health_consent_at`; thereafter consent is optional. Persist path is 1 multi-value `INSERT OR IGNORE` + 1 summary upsert (does **not** update `hard_bouts` on conflict) + optional per-quest modifier `UPDATE`s in one `atomic`. Ingest uses `rate_limits` (`health_ingest:<userId>`, UTC day window, `MAX_IMPORT_SAMPLES_PER_DAY` default 5000). `GET /health` stays isolate-local, 30/min/IP, no DB.

Named verify items hold:

- **Consent 403.** No `health_consent_at` and no `consent: true` → **403** `HEALTH_CONSENT_REQUIRED`. Zero `health_samples` rows; consent column stays NULL. `consent: true` on the first call persists the stamp; later calls omit it.
- **Max 200.** `SamplesBody` is `z.array(SampleIn).max(200)`. 201st sample → **400** `VALIDATION`, 0 rows. 200-row CSV-shaped ingest writes **201** rows (200 samples + 1 summary) and stays within the persist budget (≤ **6**).
- **`hard_bouts` not from health.** `aggregateDailySummaries` sets `hardBouts: 0`. `protectHardBouts` copies the existing column (or 0 on first insert). Upsert `ON CONFLICT` updates steps/sleep/etc. and **not** `hard_bouts`. 200-row test leaves a pre-seeded `hard_bouts = 4` / `recovery_score = 72` untouched. The only writer remains `applyCompletion` in `routes/quests.ts`.
- **Cron `15 3 * * *` UTC: retain then penalties; no push.** `NIGHTLY_CRON = "15 3 * * *"`, `timezone: "UTC"`. `startNodeCron({ db, env })` is wired from `node.ts`. Tick is `retain` (health samples in chunks of **500**, audit by `AUDIT_RETENTION_DAYS` default 90, `rate_limits` windows older than 2 days per Data Model, `DELETE FROM auth_rl WHERE expires_at < :now`) then `evaluatePenalties` (**25** users/tick). No second schedule. No push job. Nightly test: leftover yesterday `issued` → `failed`; **0** today quests; `last_ensured_local_date` stays yesterday; old samples deleted.
- **Modifier persist idempotent.** New keys only: `json_insert(..., '$[#]', key)` plus `next` fields, gated by `json_each` `NOT EXISTS` and in-memory `modifiersApplied`. Duplicate sample replay (`ingested: 0`) does not re-plan (`fresh.length === 0`) and leaves `steps_residual` / residual 2000 as the first write. Re-running ensure uses the same `questModifierUpdateStmt`, so it cannot shrink twice.
- **Existing tests still pass** (9 auth + 16 onboarding + 14 today): 401 `/me`, age 15 zero rows, invite fail-closed / mismatch, session cookie, worker 501, forget-password 404, health/ready, username-only `EMAIL_REQUIRED`, pregnancy hard-stop, `UNSAFE_LOSS_RATE`, preview 0 writes, regenerate + no skip-pattern, GET today 0 writes, ensure idempotent, IDOR complete, partial 50% XP, 3rd busy → fail, `evaluate-penalties` does not issue today.

Also covered: `POST /health/manual` writes `source='manual'`; summary GET is user-scoped camelCase `DailySummary`; ingest 429 `RATE_LIMITED` via `rate_limits` (not Better Auth memory); env defaults `HEALTH_SAMPLE_RETENTION_DAYS=30`, `AUDIT_RETENTION_DAYS=90`, `MAX_IMPORT_SAMPLES_PER_DAY=5000`.

### Test run

Worktree, PATH prepended with `C:\Users\Timus97\.nodejs\node-v22.23.2-win-x64` (Node v22.23.2):

- `pnpm --filter api test` — **PASS** (5 files, **53** tests: 9 auth + 16 onboarding + 14 today + 10 health + 4 retain, vitest 3.2.7)
- `pnpm --filter api typecheck` — **PASS** (`tsc -p tsconfig.json --noEmit`, exit 0)

| Check | Result |
| --- | --- |
| Files `routes/health.ts` + `jobs/retain.ts` + `jobs/node-cron.ts` | PASS |
| First ingest without consent → **403** `HEALTH_CONSENT_REQUIRED`; 0 samples | PASS |
| `consent: true` once; later omit | PASS |
| ≤200 samples; 201st → 400 `VALIDATION` | PASS |
| 200-row ingest → 201 rows written; persist ≤ **6** | PASS |
| Health samples never increment `hard_bouts` | PASS |
| Modifier persist new keys only; replay does not shrink twice | PASS |
| `json_insert` + `json_each` on ensure and ingest | PASS |
| Cron `15 3 * * *` UTC; retain then penalties; **no push** | PASS |
| Retain chunks of 500; audit / `rate_limits` / `auth_rl` | PASS |
| Penalties 25/tick; does **not** issue today | PASS |
| Ingest uses `rate_limits`; `GET /health` no DB | PASS |
| Existing auth (9) + onboarding (16) + today (14) | PASS |
| TypeScript quality / typecheck | PASS |

### Issues

### Issue 1 -- Severity: suggestion
- **File**: apps/api/src/routes/health.ts:438-441
- **Description**: Modifier statements run only when `fresh.length > 0`. A CSV stored *before* today’s quests exist, then replayed after `POST /me/today/ensure` (first-issue path still does not persist modifiers; it only hides `pendingModifiers`), will no-op on ingest. Shrink waits for a second ensure. Duplicate-replay idempotency is already guaranteed by `json_insert` + `NOT EXISTS`.
- **Suggestion**: Plan modifiers whenever quests exist for the folded dates, even if every sample is a dedup hit. Keep the `fresh` gate on the sample `INSERT` only.
- **Status**: open

### Issue 2 -- Severity: suggestion
- **File**: apps/api/src/routes/health.ts:443-461
- **Description**: Design persist path is 1 multi-value `INSERT` + 1 summary upsert + 1 optional modifier **batch** ≤ **6**. `lastHealthPersistStatements` counts those three kinds and omits the consent `UPDATE` and `rate_limits` upsert that share the same `atomic`. Modifier writes are one `UPDATE` per key, not one batch. First-consent 200-row path is 4 writes (still ≤ 6). A day with steps residual + sleep auto + a third key plus consent/rate would go to 7.
- **Suggestion**: Fold modifier updates into one multi-row statement (or keep them and document consent/rate as +2). Count every statement that enters `atomic` in the test probe.
- **Status**: open

### Issue 3 -- Severity: suggestion
- **File**: apps/api/src/routes/health.ts:130-140, 482-483, 524-525, 553
- **Description**: `onboarding_status` is selected and unused. Missing profile → 409 `ONBOARDING_REQUIRED`. `blocked_pregnancy` / `pending` can still ingest. Today/plan already 409 those shells; this slice does not have to, but health rows then sit on an unplayable account.
- **Suggestion**: Reuse `assertPlayableProfile` (or the same 409s) on POST ingest. GET summary can stay a read of whatever rows exist.
- **Status**: open

### Issue 4 -- Severity: suggestion
- **File**: apps/api/src/jobs/retain.ts:43-70
- **Description**: Design §9.4 / line 990 also recomputes `profiles.penalty_points_30d` in the daily retain job (30-day window decay). Story AC lists only the four deletes; this PR matches that list. Points then decay on the next `penalty_eval` / ensure, not at 03:15.
- **Suggestion**: After the deletes, `UPDATE profiles SET penalty_points_30d = (SELECT COUNT(*) FROM xp_events … created_at >= :since30)` per user, or one grouped write. Out of this story’s must-cover if product wants it later.
- **Status**: open

### Issue 5 -- Severity: nit
- **File**: apps/api/src/routes/health.ts:39-60
- **Description**: API body accepts `clientId` and then drops it. Dedup is the health-package hash `userId|source|metric|startAt|endAt|roundedValue`, which is the design key. Fine for v1; a client retry with a new timestamp is a new sample.
- **Suggestion**: Ignore `clientId` on purpose (comment), or persist it in `dedup_hash` if the UI outbox starts sending stable ids.
- **Status**: open

### Issue 6 -- Severity: nit
- **File**: apps/api/src/routes/health.ts:35, 458
- **Description**: `lastHealthPersistStatements` is module-global mutable, same pattern as PR 10’s query budget probe. Parallel `app.request` in one file would race. Current tests are sequential.
- **Suggestion**: Hang the counter on `AppDeps` / the request context when the next slice touches this.
- **Status**: open

### Blocking count
0 blocking (bugs + must-fix)
