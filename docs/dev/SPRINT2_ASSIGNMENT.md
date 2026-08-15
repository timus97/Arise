# Sprint 2 assignment — Engine + DB

Sprint 2 is **In progress**. Assignment sheet only — do not treat this file as the contract. `docs/design.md` revision 4 wins. Full checklists: [`docs/backlog/USER_STORIES.md`](../backlog/USER_STORIES.md) ARISE-004 / 006 / 007 / 008.

## Sprint goal

Ship the engine + DB slice: closed-form XP/rank/recovery/safety (**06a**), 16-template catalog/scorer/issuer (**06b**), Drizzle schema + dual-runtime `atomic()` (**04**), and health normalize/CSV/stubs (**07**). No React, PWA, Hono routes, Better Auth, or PO this sprint.

## Team + git

| Role | Person | This sprint |
| --- | --- | --- |
| Implement | **Dev A** | ARISE-006 → then 004 (after 006 on `main`) → then 007 (after 006 peer PASS) |
| Implement | **Dev B** | ARISE-008 for the whole first slice; reviews A |
| Peer review | **Other senior** | Reviews until Verdict **PASS** (0 blocking). Author does not self-merge. |
| Scrum Master | 0.1 | Board + this sheet. Not an implementer. |
| Product Owner | — | **Not required** this sprint |

Team size: **2 seniors** + SM 0.1. Do not add a third. Points: 23 (A 18 / B 5).

**Git (mandatory):** [`docs/dev/GIT_WORKFLOW.md`](./GIT_WORKFLOW.md)

```powershell
git fetch origin
git checkout main
git pull origin main
git checkout -b feat/<STORY-ID>-<short-slug>
# then implement only that story; commit; git push -u origin HEAD
```

- One story per feature branch. Never implement on `main`. Never mix 004 and 006 on one branch.
- After peer **PASS**: merge `--no-ff` to `main` and **`git push origin main`**.
- Commit titles from the PR plan (below). No Solo Leveling strings (`FORBIDDEN.txt`).

## First slice — start now (parallel)

| Who | Story | PR | Branch | Commit title |
| --- | --- | --- | --- | --- |
| **Dev A** | **ARISE-006** first (critical path to 06b) | 06a | `feat/ARISE-006-engine-math` | `feat(engine): xp, rank, recovery baselines, safety, effect helpers` |
| **Dev B** | **ARISE-008** | 07 | `feat/ARISE-008-health-csv` | `feat(health): normalize, aggregates, manual + small CSV, stubs` |

Next on A (not this slice):

| When | Story | PR | Branch | Commit title |
| --- | --- | --- | --- | --- |
| After 006 is on `main` (or immediately after 006 is **pushed** if A has bandwidth) | ARISE-004 | 04 | `feat/ARISE-004-drizzle-atomic` | `feat(db): drizzle schema, migrate, atomic() wrapper` |
| **Only after 006 peer PASS** | ARISE-007 | 06b | `feat/ARISE-007-catalog-issuer` | `feat(engine): 16-template catalog, scorer, issuer, planner` |

004 is **Ready for A after 006**; stay **Planned** until then. 007 stays **Planned** until 006 PASS. Do not start 007 on the 006 branch.

## Requirements gathered from design

Contract: `docs/design.md` revision 4. Stories add the AC checklists.

### ARISE-006 / PR 06a — engine math (Dev A, start now)

- **Pure** engine (`packages/engine/src/{xp,rank,stats,recovery,safety}.ts` + matching `__tests__`). No I/O. Inject `now: Date` and `timeZone` when time is needed.
- `xpToNextLevel(level) = Math.round(100 * Math.pow(level, 1.35))`. Goldens **must** be exact:
  - `xpToNextLevel(1) === 100`
  - `xpToNextLevel(10) === 2239`
  - `xpToNextLevel(25) === 7713`
  - `xpToNextLevel(50) === 19661`
- `applyXp` / `xpAtLevelStart` / `scaleXp` per §9.7. `scaleXp` = `Math.round(baseXp * Math.min(1.6, 1 + 0.02 * (level - 1)))`. Level loop breaks at 200.
- Base XP: habit/recovery **20**, mobility **30**, steps **30**, cardio **45**, strength **55**, gate **90**, penalty complete **10**.
- Ranks **E–S**. Titles: Initiate / Adept / Operative / Veteran / Elite / **Sovereign** (no licensed epithet).
- Rank gates: E 1–9, D 10–19, C 20–34, B 35–49 + 14-day rate ≥ 0.50, A 50–74 + 30-day ≥ 0.60, S ≥ 75 + 30-day ≥ 0.70 **and** `penaltyPoints30d < 8`. Destabilized S → write `A` + `rank_events` `reason=destabilized` (helper now; API wires in PR 10).
- Recovery §9.4: baseline needs **≥ 5** samples else **neutral**. Input newest-first, length 0–14. Missing days omitted (not zero-filled).
- Hard-day cap: exp 0–1 → max 4 hard / 7 days, min 1 rest/easy; exp 2–3 → max 5 / min 1.
- Implied fat-loss: `type==fat_loss` and both targets set and weeks > 0 and `(weightKg - targetWeightKg) / weeks > 0.01 * weightKg` → `UNSAFE_LOSS_RATE`.
- Safety: pregnancy hard-stop; other PAR-Q yes → easy whitelist; pain → `pain_no_hard` 24 h; 2 consecutive illness days → `illness_rest` next local day; 3 consecutive fail days → `caution_volume` 2 local days, `volumeMul=0.7`; penalty `rpeMax <= 4`.
- Copy helper: no calorie numbers. Stat tick: `newStat = min(old + tick, old_at_local_midnight + 1.0)` per key.
- Must-cover tests: XP integers, rank gates, implied loss reject, penalty `rpeMax <= 4`.

### ARISE-008 / PR 07 — health CSV + stubs (Dev B, start now)

- Files: `packages/health/src/{index,normalize,aggregates,adapters/manual.ts,adapters/csv.ts,adapters/stubs.ts}` + `__tests__/{normalize,csv}.test.ts`.
- CSV ≤ **256 KB** (`size > 262144` rejected) / ≤ **200** rows. Reject **before** parse. `split(/\r?\n/)` + Zod. **No XML, no zip.**
- Header: `metric,value,unit,startAt,endAt`.
- Vitest: fixture **5** rows; reject **201st**; range drop.
- Dedup: `userId|source|metric|startAt|endAt|roundedValue`.
- Range drops: HR < **30** or > **230**; weight < **25** or > **400** kg; steps > **120000** / sample; sleep > **960** min; soreness/sleep_quality not in **1–5**.
- Stubs (`apple_export`, `web_bluetooth`, `health_connect`, `healthkit`): `throw Object.assign(new Error("unavailable_web"), { code: "UNAVAILABLE_WEB" })`.
- No Apple `export.zip` / XML. No live HealthKit / Health Connect / Web Bluetooth ingest.

### ARISE-004 / PR 04 — schema + `atomic()` (Dev A, after 006 on `main`)

- Files: `packages/db/{drizzle.config.ts,src/schema.ts,src/client.ts,src/tx.ts,src/migrate.ts,drizzle/0001_init.sql}`.
- Better Auth library tables: `user`, `session`, `account`, `verification` + username-plugin columns on `user`. FKs → **`user.id`**. **No `users` table** and no `users` view. XP on **`profiles` only** (`level` default 1, `xp` default 0).
- `stats_json` key **`intl`**. `habit_profiles` has **no** `learned_rest_weekdays_json`. `plan_days` includes **`is_gate`**. `quest_templates` may exist **empty** — **v1 does not read it**.
- `daily_quests`: `modifiers_applied_json` default `[]`, `skip_reason` text NULL (scalar), `idempotency_key UNIQUE`.
- `issuance_ledger` PK `(user_id, local_date)`.
- `daily_summaries`: `soreness`, `sleep_quality`, `hard_bouts`. **No `zone2_minutes`.**
- `auth_rl(key TEXT PRIMARY KEY, value TEXT NOT NULL, expires_at INTEGER NOT NULL)` so Node and Worker migrations match.
- **Not created:** `push_subscriptions`, `push_log`.
- `atomic()` in `packages/db/src/tx.ts`: D1 `batch()` when `db.kind === "d1"`; better-sqlite3 `transaction()` on Node. **Never** copy `BEGIN; INSERT ledger; INSERT quests; COMMIT;` into Worker code.
- **Contract test (batch-fail):** mock `batch` reject; `SELECT COUNT(*) FROM issuance_ledger` is **0**.
- ULID text ids. ISO timestamps UTC. `local_date` `YYYY-MM-DD`. Booleans 0/1. Forward-only Drizzle SQL; add columns with `DEFAULT`; never `DROP COLUMN` in the same release.

### ARISE-007 / PR 06b — 16-template catalog (Dev A, after 006 peer PASS)

- Catalog is **only** `packages/engine/src/templates/catalog.ts`. v1 does **not** read `quest_templates`.
- Exactly these **16** ids. **No `habit_log_weight`:**
  1. `str_sit_to_stand_l0`
  2. `str_incline_push_l0`
  3. `str_backpack_row_l0`
  4. `str_hip_hinge_l0`
  5. `str_goblet_squat_l1`
  6. `str_band_row_l1`
  7. `str_gym_full_body_l2`
  8. `cardio_zone2_walk`
  9. `steps_6k`
  10. `steps_8k`
  11. `mob_hip_unload`
  12. `mob_tspine`
  13. `rec_nasal_breath`
  14. `rec_full_rest`
  15. `habit_sleep_window`
  16. `penalty_easy_walk`
- Appendix A: `statDelta` / `goalTags` / `build()` defaults. Goblet: `statDelta = { str: 0.35, vit: 0.14 }`, `goalTags` includes `muscle_gain` **not** `mobility`.
- Goblet golden: `goalAlignment === 55`; `scoreTemplate` (empty history, remaining 40, recovery 80) **`score === 80`**.
- Empty-day fallback: if zero quests, emit **`habit_sleep_window` then `cardio_zone2_walk`** built with `budgetMinutes = 10` (walk minutes 10; sleep stays 0). Never persist an empty `daily_quests` set after a successful ensure.
- `build()`: `sets' = max(1, round(sets * volumeMul * (recoveryScore < 55 ? 0.75 : 1)))`. Beginner (`experience <= 1`) clamps `rpeMax <= 7`. Penalty clamps `rpeMax <= 4`.
- `requiredAll` is `[]` for every v1 row. Walks and mobility use `requiredAny: ["none"]`.
- Contraindications: sit-to-stand + goblet → `knee`; incline push → `shoulder`,`wrist`; hip hinge → `spine`; others `[]`. `mob_hip_unload` is OK with `knee`.
- Catch-up: 3-day gap unit tests. Unissued absences are not fails. Do **not** insert quests for caught-up dates. Open interval > **14** days keeps the **14 most recent**.
- Penalty quest: always `penalty_easy_walk`, `rpeMax <= 4`, `estimatedMinutes <= 20`, `source: "penalty"`.
- 3rd `busy` skip in ISO week → store `failed`, not skipped. Modifier idempotency (do not shrink twice). `FEATURE_LLM_PLANNER` does not exist. Do not auto-regenerate (`suggestRegenerate` only).
- Must-cover tests: `score === 80`; empty-day fallback; catch-up 3-day gap; modifier idempotency; knee/PAR-Q; penalty RPE; busy-3rd=fail.

## Review

- The **other senior** reviews until Verdict **PASS** (0 blocking). Team DoD: [`docs/backlog/DEFINITION_OF_DONE.md`](../backlog/DEFINITION_OF_DONE.md).
- Review the **remote** feature branch (`origin/feat/...`). Write the review under `docs/dev/reviews/`.
- After PASS: merge to `main` and **push `main`**. Chrome (PR 14) cannot merge before 06b + PR 10.
- Do not implement TypeScript from this sheet — implement from the design + user-story AC.
