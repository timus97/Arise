# Peer review: Dev B → Dev A (PR 06a / ARISE-006)

Reviewed worktree `C:\Users\Timus97\.grok\worktrees\grokanalysis-arise\subagent-01a00466-63dd-7e31-9bb5-435b62fba655` at claimed commit `b6681e246db744954a5d7dd0d34518e161de0dee` (`feat(engine): xp, rank, recovery baselines, safety, effect helpers`) on `feat/ARISE-006-engine-math`. Checked against design §9.4–9.7, ARISE-006, and Sprint 2 assignment. Did not modify Dev A’s engine source. Did not push.

### Verdict: PASS

### Summary

PR 06a lands a pure `@arise/engine` math slice and is independently reviewable. Required files exist: `packages/engine/src/{xp,rank,stats,recovery,safety}.ts` plus `__tests__/{xp,rank,safety,recovery}.test.ts`. No `scorer` / `issuer` / `planner` / `templates` (those are 06b). No `fs` / `fetch` / `process.env` / `Date.now()` — time is injected as `now: Date` and `timeZone: string`.

Load-bearing contract holds:

- **XP goldens** (Node `Math.round(100 * Math.pow(level, 1.35))`): `xpToNextLevel(1) === 100`, `(10) === 2239`, `(25) === 7713`, `(50) === 19661`. Independently recomputed; tests assert the exact integers.
- `applyXp` / `xpAtLevelStart` / `scaleXp` match §9.7 byte-for-byte, including the `level > 200` break and `Math.min(1.6, 1 + 0.02 * (level - 1))`. Penalty reward is a flat **10** and does not scale.
- Base XP: habit/recovery **20**, mobility **30**, steps **30**, cardio **45**, strength **55**, gate **90**, penalty **10**.
- Rank gates E–S (B 14-day ≥ 0.50, A 30-day ≥ 0.60, S 30-day ≥ 0.70 **and** `penaltyPoints30d < 8`). Titles Initiate / Adept / Operative / Veteran / Elite / **Sovereign**. Completion rate excludes penalty-only days and days that are only `rest_planned` skips. `computeRank` + `rankEventIfDestabilized` write `A` / `reason=destabilized` when previous rank was S and S-gates fail (API persists `rank_events` in PR 10).
- Recovery §9.4: `median` / `baseline` (≥ **5** samples else `null`) / `computeRecovery` newest-first. Cold start neutrals: sleep `420` → 40, restHr/hrv **15**, load **20**, subjective **10**, score **100**. Missing wearables are not punished.
- Safety: pregnancy hard-stop (`PREGNANCY_HARD_STOP` + clinician message + `deleteAccount`); other PAR-Q yes → easy whitelist (`recovery|mobility|habit|steps` × `rest|easy`); `pain_no_hard` 24 h from `now`; second illness skip → `illness_rest` tomorrow 00:00–24:00 local; 3 consecutive required-fail days → `caution_volume` 2 local days, `volumeMul=0.7`; penalty `rpeMax <= 4`.
- Implied fat-loss: `type==fat_loss` and both targets set and `weeks > 0` and `(weightKg - targetWeightKg) / weeks > 0.01 * weightKg` → `UNSAFE_LOSS_RATE`. Tests reject 80→70 in 14 days (5 kg/week vs max 0.8) and allow the onboarding example 72→66 by 2026-12-01.
- Stat tick uses `STAT_KEYS` (`intl`, never `int`): `newStat = min(old + tick, midnight + 1.0)`; partial effort × 0.5. Fat-loss copy talks steps / sleep / consistency; no calorie numbers.

### Test run

Worktree, PATH prepended with `C:\Users\Timus97\.nodejs\node-v22.23.2-win-x64` (Node v22.23.2):

- `pnpm --filter @arise/engine test` — **PASS** (4 files, 44 tests, vitest 3.2.7)
- `pnpm --filter @arise/engine typecheck` — **PASS** (`tsc -p tsconfig.json --noEmit`, exit 0)

| Check | Result |
| --- | --- |
| Goldens 100 / 2239 / 7713 / 19661 | PASS |
| `intl` not `int` | PASS |
| Pregnancy hard-stop | PASS |
| Implied loss reject | PASS |
| Penalty `rpeMax <= 4` | PASS |
| Recovery neutrals | PASS |
| No I/O | PASS |
| No catalog / issuer (06b) | PASS |

### Issues

### Issue 1 -- Severity: suggestion
- **File**: (git) `feat/ARISE-006-engine-math`
- **Description**: Working tree is clean at `b6681e2`, but the branch has **no upstream**. `git ls-remote --heads origin feat/ARISE-006-engine-math` is empty. Team DoD / `GIT_WORKFLOW.md` require the feature branch on GitHub before review/merge. This is process, not an engine-math miss.
- **Suggestion**: `git push -u origin HEAD` from this worktree before merge. Reviewer read the local worktree SHA named in the assignment.
- **Status**: open

### Issue 2 -- Severity: suggestion
- **File**: packages/engine/src/rank.ts:18-25, 94-100
- **Description**: `RANK_GATES` encodes S as `maxPenaltyPoints30d: 7` (and the other level/rate bounds) but `qualifyRank` re-implements the table with literals (`penaltyPoints30d < 8`, `level >= 75`, …). Today they agree; a later edit can drift.
- **Suggestion**: Drive `qualifyRank` off `RANK_GATES` (or drop the unused table if the literals stay the source of truth).
- **Status**: open

### Issue 3 -- Severity: nit
- **File**: packages/engine/src/__tests__/safety.test.ts:131-163
- **Description**: Illness-rest and caution-volume tests assert `startsAt` / `endsAt` against `zonedStartOfDayUtc(...)` from the same module. A broken offset helper would still pass. Stockholm 2026-08-16 local midnight is `2026-08-15T22:00:00.000Z`.
- **Suggestion**: Pin the ISO instants (and optionally one DST spring-forward date) so the zoned midnight helper is independently golden.
- **Status**: open

### Issue 4 -- Severity: nit
- **File**: packages/engine/src/__tests__/recovery.test.ts
- **Description**: Neutrals, `< 5` baseline, restHr `> base+7`, and HRV `< 0.85×` are covered. The inclusive boundaries from §9.4 (`restHr === base + 7` stays 15; `hrv === 0.85 * base` stays 15) are not asserted.
- **Suggestion**: Add those two cases so a `>=` / `>` flip cannot land silently.
- **Status**: open

### Blocking count
0 blocking (bug + must-fix)
