# Peer review: Dev B → Dev A (PR 04 / ARISE-004)

Reviewed worktree `C:\Users\Timus97\.grok\worktrees\grokanalysis-arise\subagent-01a00486-33db-7962-9094-32645d4c8124` at claimed commit `a3462e2bfa1b1daba73a2d83058f37b9dace6b90` (`feat(db): drizzle schema, migrate, atomic() wrapper`) on `feat/ARISE-004-drizzle-atomic` (parent `27a1cbb`, current `main`). Checked against design Data Model, §9.9, ARISE-004, and Sprint 2 assignment. Did not modify Dev A’s db source. Did not push.

### Verdict: PASS

### Summary

PR 04 lands the contracted `@arise/db` schema + dual-runtime `atomic()` slice and is independently reviewable. Required files exist: `packages/db/{drizzle.config.ts,src/schema.ts,src/client.ts,src/tx.ts,src/migrate.ts,drizzle/0001_init.sql}` plus `src/types.ts` and `__tests__/atomic.test.ts`. Scope is `packages/db/**` and the lockfile only.

Load-bearing contract holds:

- Better Auth tables are library names `user` / `session` / `account` / `verification`. Username-plugin columns `username` (unique) and `display_username` sit on `user`. Every application FK references **`user.id`**. **No `users` table and no `users` view.**
- XP lives only on **`profiles`** (`level` DEFAULT 1, `xp` DEFAULT 0). `user` has no `xp` column. `stats_json` default is `{"str":10,"agi":10,"vit":10,"intl":10,"sta":10}` (key **`intl`**, never `int`).
- `habit_profiles` has **no** `learned_rest_weekdays_json`. `plan_days` has **`is_gate` INTEGER DEFAULT 0 NOT NULL**, unique `(plan_id, local_date)`, index `(user_id, local_date)`. `quest_templates` exists empty (id only); v1 does not seed it.
- `daily_quests.modifiers_applied_json` DEFAULT `'[]'`. **`skip_reason` is scalar TEXT NULL** (not JSON; comparable with `= 'busy'`). `idempotency_key` UNIQUE. `issuance_ledger` PK `(user_id, local_date)`.
- `daily_summaries` has `soreness`, `sleep_quality`, `hard_bouts`. **No `zone2_minutes`.**
- **`auth_rl(key TEXT PRIMARY KEY, value TEXT NOT NULL, expires_at INTEGER NOT NULL)`** is created so Node and Worker migrations match.
- **Not created:** `push_subscriptions`, `push_log`.
- `atomic()` in `packages/db/src/tx.ts` matches §9.9: `db.kind === "d1"` → `d1.batch(prepare.bind…)`; Node → `better-sqlite3` `transaction()`. **No `BEGIN` / `COMMIT` emitted in the worker path.**
- Contract test: mock `batch` reject ⇒ `SELECT COUNT(*) FROM issuance_ledger` is **0** (and `daily_quests` is 0). Extra Node commit + rollback cases are present.
- ULID-shaped text ids, ISO text timestamps on application tables, `local_date` as `YYYY-MM-DD` text, booleans 0/1 on application columns. Forward-only `0001_init.sql`; `is_gate` added with `DEFAULT 0`; no `DROP COLUMN`.

### Test run

Worktree, PATH prepended with `C:\Users\Timus97\.nodejs\node-v22.23.2-win-x64` (Node v22.23.2):

- `pnpm --filter @arise/db test` — **PASS** (1 file, 4 tests, vitest 3.2.7)
- `pnpm --filter @arise/db typecheck` — **PASS** (`tsc -p tsconfig.json --noEmit`, exit 0)

| Check | Result |
| --- | --- |
| No `users` table / view | PASS |
| XP on `profiles` only (`level` 1 / `xp` 0) | PASS |
| `atomic()` mocked `batch` reject ⇒ 0 ledger rows | PASS |
| No `push_subscriptions` / `push_log` | PASS |
| `auth_rl` key / value / expires_at | PASS |
| `skip_reason` scalar TEXT NULL | PASS |
| `is_gate` DEFAULT 0 | PASS |
| `stats_json` key `intl` | PASS |
| No `learned_rest_weekdays_json` / no `zone2_minutes` | PASS |
| Typecheck | PASS |

### Issues

### Issue 1 -- Severity: suggestion
- **File**: (git) `feat/ARISE-004-drizzle-atomic`
- **Description**: Working tree is clean at `a3462e2`, but the branch has **no upstream**. `git ls-remote --heads origin feat/ARISE-004-drizzle-atomic` is empty. Team DoD / `GIT_WORKFLOW.md` require the feature branch on GitHub before review/merge. This is process, not a schema/`atomic()` miss.
- **Suggestion**: `git push -u origin HEAD` from this worktree before merge. Reviewer read the local worktree SHA named in the assignment.
- **Status**: open

### Issue 2 -- Severity: suggestion
- **File**: packages/db/drizzle/
- **Description**: `0001_init.sql` is present and matches `schema.ts`, but there is no `drizzle/meta/_journal.json` (or snapshot). `migrate()` treats the filename as the applied hash. That is enough for Node boot and for wrangler applying numbered SQL. A later `pnpm --filter @arise/db generate` with no journal can emit a second full-schema file and drift from this migrator.
- **Suggestion**: Check in the drizzle-kit journal + snapshot after generate, or document that `0001_init.sql` is hand-canonical and generate is not used until the next additive migration.
- **Status**: open

### Issue 3 -- Severity: nit
- **File**: packages/db/src/__tests__/atomic.test.ts
- **Description**: Schema contract asserts table presence, no `users`/`push_*`, profile xp defaults, `is_gate` default 0, `skip_reason` nullable, and `auth_rl` column *names*. It does not pin `auth_rl.value`/`expires_at` NOT NULL, `issuance_ledger` composite PK, `idempotency_key` uniqueness, or that `profiles.stats_json` default contains `intl`.
- **Suggestion**: Add those `PRAGMA table_info` / index assertions so a later edit cannot silently widen nullability or drop the unique key.
- **Status**: open

### Blocking count
0 blocking (bug + must-fix)
