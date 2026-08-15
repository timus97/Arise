# Sprint 1–2 quality audit (Dev B)

| Field | Value |
| --- | --- |
| **Auditor** | Dev B |
| **Date** | 2026-08-15 |
| **Tree** | `origin/main` @ `649c8e74dd7055e5d1c63fe2255cec1ff3a9d531` (`docs: close Sprint 2 locally; document GitHub Contents write requirement`) |
| **Contract** | [`docs/design.md`](../design.md) revision 4 |
| **Scope** | `packages/{domain,engine,health,db}` on current `main`. No PR 08/09/10 implementation. |
| **PR 08** | Not on GitHub (`gh` lists zero PRs; remotes are `origin/main` and `origin/docs/sprint-3-assignment` only). Audit finished without waiting. |

### Verdict: **PASS**

Sprint 1–2 is safe to build Sprint 3 on. Load-bearing contracts hold. **0 blocking bugs.** Dev A can start ARISE-009 (Hono + Better Auth) on this schema and domain façade without building auth on sand.

---

## Test results

Worktree `C:\Users\Timus97\.grok\worktrees\grokanalysis-arise\subagent-01a0049a-0e04-7f01-9559-9e3015d29b05`, PATH prepended with `C:\Users\Timus97\.nodejs\node-v22.23.2-win-x64` (Node v22.23.2, pnpm 9.15.0). `pnpm install` required in this worktree (`node_modules` was absent); lockfile reused, 111 packages linked.

| Command | Result | Files | Tests |
| --- | --- | --- | --- |
| `pnpm --filter @arise/domain test` | **PASS** (vitest 3.2.7) | 1 | **20** |
| `pnpm --filter @arise/engine test` | **PASS** | 9 | **78** |
| `pnpm --filter @arise/health test` | **PASS** | 2 | **17** |
| `pnpm --filter @arise/db test` | **PASS** | 1 | **4** |
| `pnpm --filter @arise/{domain,engine,health,db} typecheck` | **PASS** (`tsc -p tsconfig.json --noEmit`, exit 0) | — | — |
| `pnpm typecheck` (turbo, 7 packages) | **PASS** | — | — |

**Totals:** 13 test files, **119** tests, 0 failures. Engine breakdown: `xp` 9, `modifiers` 4, `rank` 10, `recovery` 12, `planner` 7, `safety` 13, `scorer` 8, `issuer` 6, `penalties` 9.

Engine tests include the Sprint 2 goldens: `xpToNextLevel(1/10/25/50) === 100/2239/7713/19661`; goblet `score === 80` (`toBe(80)`, not `toBeCloseTo`); 16 catalog ids; empty-day fallback; catch-up 3-day gap + last-3 `caution_volume` after the 06b fix. DB includes mocked `batch` reject ⇒ 0 `issuance_ledger` rows. Health includes 5-row §11 fixture, size > 262144, 200/201 rows, range drop.

---

## Contract checklist (design vs code)

| Check | Result | Where |
| --- | --- | --- |
| `intl` not `int` in JSON / SQL / TS | **PASS** | `packages/domain/src/player.ts:9-33` (`PlayerStats.strict()`); `GOAL_STAT_WEIGHTS` every row; `profiles.stats_json` default `{"str":10,"agi":10,"vit":10,"intl":10,"sta":10}` in `packages/db/drizzle/0001_init.sql:73` |
| 16 templates, no `habit_log_weight` | **PASS** | `packages/engine/src/templates/catalog.ts:17-34` — exact Appendix A id list; `requiredAll: []` on every row |
| Goblet `score === 80` | **PASS** | `statDelta = { str: 0.35, vit: 0.14 }`, `goalTags` includes `muscle_gain` not `mobility`. Recomputed: `goalAlignment = 55`; `0.40*55 + 0.20*100 + 0.15*100 + 0.15*100 + 0.10*80 = 80`. `scorer.test.ts:82-91` asserts `toBe(80)` |
| Atomic batch-fail ⇒ 0 ledger | **PASS** | `packages/db/src/tx.ts:9-22`; `packages/db/src/__tests__/atomic.test.ts:191-199` mock `batch` reject; Node rollback case too |
| CSV ≤ 256 KB / 200 rows | **PASS** | `CSV_MAX_BYTES = 262_144`, `CSV_MAX_ROWS = 200` in `packages/health/src/adapters/csv.ts:5-6`. Size rejected **before** `split`; 201st data row rejected before Zod loop |
| No `users` table / view | **PASS** | Better Auth table is `user` (`schema.ts:14-25`). Application FKs → `user.id`. Test asserts `tables`/`views` do not contain `users` |
| XP on `profiles` only | **PASS** | `profiles.xp` / `profiles.level` defaults 0 / 1. `user` has no `xp` column |
| No push tables | **PASS** | No `push_subscriptions`, no `push_log`. `auth_rl` is Better Auth rate-limit storage, not push |
| No Solo Leveling IP in product source | **PASS** | Zero matches under `packages/` or `apps/` (`*.ts,tsx,js,yml,json,css,html,sh`). Hits exist only in `FORBIDDEN.txt` (the grep list) and docs that name the ban. CI excludes `docs/**` and `FORBIDDEN.txt` (`.github/workflows/ci.yml:22`) |
| `FEATURE_LLM_PLANNER` absent | **PASS** | `issuer.test.ts:95-97` |
| Engine has no I/O | **PASS** | No `Date.now()`, `fetch`, `node:fs`, or `process.env` in `packages/engine` |
| Stubs throw `unavailable_web` | **PASS** | `packages/health/src/adapters/stubs.ts` — four adapters, `code: "UNAVAILABLE_WEB"` |
| `quest_templates` empty | **PASS** | Reserved `id`-only table; migrate test `COUNT(*) === 0`. v1 reads `catalog.ts` only |

---

## Bugs vs design

**Blocking: none.**

The items below are **not** blockers. They must not stop PR 08. They *are* traps for PR 10 / 11 if ignored.

### N1 — PAR-Q treated as a rest day (known, still open)

- **File:** `packages/engine/src/issuer.ts:62-68`
- **Severity:** suggestion (carried from PR 06b Issue 3)
- **What:** `isRestComposition` is `focus === "rest" || recoveryScore < 35 || illness_rest || !parqClear`. A PAR-Q “other yes” user therefore gets rest slots (`rec_full_rest` / walk / mobility / sleep), not a training day filtered by the §9.3 whitelist.
- **Design tension:** §9.5 lists “forceRest from PAR-Q” as a rest trigger; `evaluateParq` (`safety.ts:50-70`) has no `forceRest` — other-yes is `easyOnly`. The whitelist would still allow `steps`.
- **Why not blocking:** §9.5 can be read either way. Issued kinds stay inside `{recovery, mobility, habit, steps}` × `{rest, easy}`. No sand for auth. **Do not “fix” this inside PR 08.** If Dev A wants steps on a PAR-Q training day, change issuer in a dedicated follow-up before or with PR 10 and add a test that `parqClear: false` + `focus: "full_body"` still emits `steps_*`.

### N2 — `steps_residual` then `auto_steps` on a second ensure (known)

- **File:** `packages/engine/src/modifiers.ts:18-38`
- **Severity:** suggestion (PR 06b Issue 4)
- **What:** Residual rewrites `healthPredicate.value` to the leftover. A later `planModifiers` call against the **same** `summary.steps` can then take the `auto_steps` branch (`steps >= residual`) and auto-complete a quest the user has not finished. Tests only assert residual does not shrink twice.
- **Why not blocking:** Matches literal §9.10. **PR 10 / `POST /me/today/ensure` must not blindly persist `pendingModifiers` on the already-issued path** without an extra guard (skip `auto_steps` when `steps_residual` is already applied unless `summary.steps` increased). GET today may still return them in memory as `pendingModifiers`.

### N3 — Health fold zeros `hardBouts` / `recoveryScore`

- **File:** `packages/health/src/aggregates.ts:49-52`
- **Severity:** suggestion (PR 07 Issue 1)
- **What:** `aggregateDailySummaries` always emits `hardBouts: 0` and `recoveryScore: 0`. Correct for this package (health is not the `hard_bouts` writer).
- **Why not blocking:** No persist yet. **PR 11 must upsert health columns only** and leave `hard_bouts` / `recovery_score` to `applyCompletion` / engine. A full-row replace would wipe completions.

### N4 — Summary date is UTC prefix

- **File:** `packages/health/src/aggregates.ts:7-9`
- **Severity:** suggestion (PR 07 Issue 3)
- **What:** `localDateUtc` is `iso.slice(0, 10)`.
- **Why not blocking:** Fine for a tz-less fold. **PR 11 must group by `profiles.time_zone`**, not the ISO prefix.

---

## Quality notes

Not style. These hide future bugs if Sprint 3 copies them blindly.

1. **Auth tables are `user`, not `users`.** Better Auth drizzle adapter in PR 08 must bind to the existing `user` / `session` / `account` / `verification` plus `username` / `display_username`. Do not let the adapter emit a second `users` table. XP stays off `user`.

2. **`RegisterBody.age` is `z.number().int()` with no min.** That matches the design snippet (`packages/domain/src/api.ts:8`). Age 15 is a **façade** check in PR 08 (`400 AGE_RESTRICTED`, **zero rows**), not a Zod fail. Do not “fix” the domain schema to `.min(16)` unless design is revised — onboarding already has `.min(16)`.

3. **`atomic()` is the only write wrapper.** `packages/db/src/tx.ts` never emits `BEGIN`/`COMMIT` on the D1 path. PR 08–10 must not copy raw transactions into `apps/api/src/worker.ts`. Node `better-sqlite3` `transaction()` is correct for Compose.

4. **No drizzle-kit journal.** `packages/db/drizzle/` has `0001_init.sql` only. `migrate()` hashes the filename. A later `drizzle-kit generate` without a journal can emit a second full schema. Treat `0001_init.sql` as hand-canonical until the next additive migration (PR 04 Issue 2, still open).

5. **Catalog is the only template source.** `quest_templates` is empty and unused. PR 09/10 must `import { CATALOG, issueToday, buildWeeklyPlan }` from `@arise/engine`, not SELECT templates.

6. **`applyCompletion` is not in S1/S2.** Hard-bout increment, XP apply, stat tick, rank recompute, and persist live in PR 10. Engine already exports `applyXp`, `applyStatTick`, `computeRank`, `resolveSkip`, `catchUpMissedDays`, `planModifiers`. Do not reimplement those in the route.

7. **Issuer never returns `quests: []`.** Empty catalog / rest / 0 budget still emits `habit_sleep_window` + `cardio_zone2_walk` @ 10 min (`issuer.ts:196-202`). Ensure can persist that pair; do not add a “no quests today” short-circuit that writes an empty day.

8. **Catch-up inserts no quests.** `catchUpMissedDays` always returns `questsToInsert: []`. Cron / ensure catch-up is fail-only. The 06b last-3-day `caution_volume` fix is on `main` (`penalties.ts:143-152` does **not** intersect with `catchUpSet`).

9. **CSV `opts.size` can lie.** `parseHealthCsv` uses `opts?.size ?? byteSize(text)`. A caller that passes a small `size` with a large `text` skips the pre-split gate (row cap still applies). Default path is safe. PR 16 should call `assertCsvLimits({ size: file.size, ... })` before `file.text()`.

10. **Sample ids are not ULIDs.** Health fallback ids are `crypto.randomUUID()` or `hs_<time>_<rand>`. Domain allows any non-empty string. Persist path (PR 11) should mint ULID text ids.

11. **RANK_GATES vs `qualifyRank` literals.** `rank.ts:18-25` encodes S as `maxPenaltyPoints30d: 7`; `qualifyRank` uses `penaltyPoints30d < 8`. They agree today. Drive one from the other before rank-event wiring in PR 10 (PR 06a Issue 2).

12. **Apps are still stubs.** `apps/api/src/index.ts` is `export {}`. Compose `up` is documented to fail until PR 08. Expected.

---

## Sprint 3 readiness (for Dev A)

Safe to implement **PR 08** on this `main`:

| PR 08 need | S1/S2 status |
| --- | --- |
| Better Auth `user` + username columns | Present |
| `session` / `account` / `verification` | Present |
| `auth_rl(key, value, expires_at)` | Present (Node unused; Worker Paid later) |
| `RegisterBody` (email required, password min 10, disclaimer `true`) | Present |
| Age / invite / `AGE_RESTRICTED` zero-row | **Not implemented** — that is PR 08 |
| `profiles` for later onboarding shell | Present (`onboarding_status` default `pending`) |
| Cookie name `arise.session` / scrypt default | **Not implemented** — PR 08 |

Do **not** start PR 09/10 on the same branch as 08.

### PR 08 review checklist (when it lands)

- Cookie name **`arise.session`**. scrypt **not** overridden. `minPasswordLength: 10`. Session 30 d, `updateAge` 1 d. Username plugin on. `user.email` required.
- `age < 16` → `400 AGE_RESTRICTED`, **zero** `user` / `account` / `profiles` rows.
- Missing/empty `REGISTER_INVITE_CODE` → `503 INVITE_UNCONFIGURED`. Mismatch → `403 INVITE_REQUIRED`.
- `RUNTIME=worker` without `ALLOW_WORKER_PASSWORD_AUTH=true` → `501 AUTH_RUNTIME_UNSUPPORTED`.
- `GET /health` **0 SQL**, 30/min/IP. `GET /ready` is `SELECT 1`.
- Node `secondaryStorage` omitted. Do not upsert `rate_limits` on login.
- Free Worker spike note in `apps/api/README.md`; deploy not left as production.
- No `users` table, no push tables, no Solo Leveling strings, no routes for today/quests/onboarding (those are 09/10).

---

## Verdict

**PASS.** 119/119 tests green. Contracts (`intl`, 16 templates, goblet `score === 80`, atomic 0-ledger, CSV 256 KB/200, no `users`, no push, no IP in source) hold. No blocker that would make Better Auth or later ensure/complete rest on a broken domain/engine/db.

Carry N1–N4 into PR 10/11. Do not block PR 08 on them.
