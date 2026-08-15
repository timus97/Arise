# Peer review: Dev A → Dev B (ARISE-008 / PR 07)

Reviewed worktree `C:\Users\Timus97\.grok\worktrees\grokanalysis-arise\subagent-01a00466-63df-7d60-8cd6-80c85a4aa069` at `9323a11d5324405ef35a2b35d2931541e0ec0f20` (`feat/ARISE-008-health-csv`, commit title `feat(health): normalize, aggregates, manual + small CSV, stubs`). Design contract: §11 Health pipeline, §20 CSV adapter must-cover, PR 07, ARISE-008. Did not modify Dev B’s health source. Did not push (branch has no upstream; user said do not push if 403).

### Verdict: PASS

### Summary

PR 07 lands the contracted `@arise/health` surface and is independently reviewable. Required files exist: `packages/health/src/{index,normalize,aggregates,adapters/manual.ts,adapters/csv.ts,adapters/stubs.ts}` and `packages/health/src/__tests__/{normalize,csv}.test.ts`.

CSV parse is `split(/\r?\n/)` + Zod `CsvRow` (`HealthMetric`, coerced finite `value`, `z.string().datetime()` timestamps). There is no XML parser, no zip, no `export.zip` path, and no Bluetooth / HealthKit / Health Connect ingest — those four adapters only `throw Object.assign(new Error("unavailable_web"), { code: "UNAVAILABLE_WEB" })`. Limits are `CSV_MAX_BYTES = 262144` and `CSV_MAX_ROWS = 200`. `parseHealthCsv` rejects `size > 262144` before the line split, and rejects the 201st data row after the split but **before** the per-line Zod loop. `CSV_TEMPLATE` is the §11 header plus the five sample rows (steps 8421, sleep 410, weight 72.4, soreness 2, sleep_quality 4).

Range drops match §11: HR / resting_hr &lt; 30 or &gt; 230; weight &lt; 25 or &gt; 400 kg; steps &gt; 120000 / sample; sleep &gt; 960 min; soreness / sleep_quality not in 1–5 (integers). Dedup hash is `userId|source|metric|startAt|endAt|roundedValue`. Manual adapter Zod-parses one sample and stamps `source: "manual"`. `aggregateDailySummaries` always writes `hardBouts: 0` (and `recoveryScore: 0`); health never increments `hard_bouts`.

No blocking issues. Suggestions below are later-PR wiring / defense-in-depth, not merge gates.

### Test run

Worktree, PATH prepended with `C:\Users\Timus97\.nodejs\node-v22.23.2-win-x64` (Node v22.23.2):

- `pnpm --filter @arise/health test` — **PASS** (2 files, 17 tests, vitest 3.2.7)
  - `src/__tests__/csv.test.ts` — 5 tests (5-row fixture, ingest fixture, size &gt; 262144, accept 200 / reject 201st, range drop)
  - `src/__tests__/normalize.test.ts` — 12 tests (range drops, dedup hash, manual adapter, aggregates `hardBouts === 0`, stubs `UNAVAILABLE_WEB`)
- `pnpm --filter @arise/health typecheck` — **PASS** (`tsc -p tsconfig.json --noEmit`, exit 0)

### Checklist

- [x] CSV `split(/\r?\n/)` + Zod
- [x] Reject `size > 262144` before parse
- [x] Reject 201st row before Zod parse
- [x] 5-row §11 fixture
- [x] Range drops (HR, weight, steps, sleep, scores)
- [x] Stubs throw `unavailable_web` / `UNAVAILABLE_WEB`
- [x] No XML / zip
- [x] `hardBouts` not incremented from health

### Issues

### Issue 1 -- Severity: suggestion
- **File**: packages/health/src/aggregates.ts:50
- **Description**: `foldDay` always emits `hardBouts: 0` and `recoveryScore: 0`. That is correct for this package — health must not be the `hard_bouts` writer (design §9.4 / ARISE-011: only `applyCompletion` increments it). If PR 11 upserts this object as a full `daily_summaries` row, those zeros would wipe completion-written `hard_bouts` and engine recovery.
- **Suggestion**: In PR 11, upsert health-derived columns only (`steps`, `sleep_minutes`, last-of-day scores, etc.) and leave `hard_bouts` / `recovery_score` to their real writers. Do not `SET hard_bouts = 0` on ingest.
- **Status**: open

### Issue 2 -- Severity: suggestion
- **File**: packages/health/src/adapters/csv.ts:62
- **Description**: Size is `opts?.size ?? byteSize(text)`. If a caller passes a lying small `size` with a large `text`, the pre-split size gate is skipped and the string is still split (row-count still caps Zod). Default path (no `opts.size`) measures the string.
- **Suggestion**: Use `Math.max(opts.size ?? 0, byteSize(text))` so the library cannot be talked out of the 256 KB cap. Client (PR 16) should still call `assertCsvLimits` with `File.size` before `file.text()`.
- **Status**: open

### Issue 3 -- Severity: suggestion
- **File**: packages/health/src/aggregates.ts:8
- **Description**: `localDateUtc` is `iso.slice(0, 10)` (UTC calendar date). `daily_summaries.local_date` is user-local `YYYY-MM-DD`. Fine for a tz-less fold in PR 07.
- **Suggestion**: PR 11 should group by the user’s timezone, not the ISO prefix, when persisting summaries.
- **Status**: open

### Issue 4 -- Severity: nit
- **File**: (git) feat/ARISE-008-health-csv
- **Description**: Branch has no upstream. `git ls-remote --heads origin feat/ARISE-008-health-csv` is empty. Team DoD wants the feature branch on GitHub before review.
- **Suggestion**: Author (or SM) `git push -u origin HEAD` from this worktree when the remote accepts it. Reviewer did not push.
- **Status**: open

### Issue 5 -- Severity: nit
- **File**: packages/health/src/normalize.ts:74
- **Description**: Fallback ids are `crypto.randomUUID()` or `hs_<time>_<rand>`, not ULID. Domain `HealthSample.id` is `z.string().min(1)`; this PR does not persist. Acceptable.
- **Suggestion**: When ingest writes rows (PR 11), mint ULID text ids to match the data-model note.
- **Status**: open

### Blocking count
0 blocking (bug + must-fix suggestion)
