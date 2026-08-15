# Peer review: Dev B → Dev A (PR 06b / ARISE-007)

Reviewed worktree `C:\Users\Timus97\.grok\worktrees\grokanalysis-arise\subagent-01a00472-5117-7933-9269-691a450a2cd8` at `4c57775d51e878141c5dc897abc71bf19930ef51` (`fix(engine): caution_volume uses last 3 failed days not only catch-up set`) on `feat/ARISE-007-catalog-issuer`, on top of `2871673` (`feat(engine): 16-template catalog, scorer, issuer, planner`). Re-review of the Issue 1 fix. Checked against design Appendix A, §9.2–9.6, §9.8, ARISE-007, and Sprint 2 assignment. Did not modify Dev A’s engine source. Did not push.

### Verdict: PASS

### Summary

PR 06b lands the contracted `@arise/engine` catalog / scorer / issuer / planner slice and is independently reviewable. Required files exist: `packages/engine/src/{scorer,issuer,planner,penalties,modifiers}.ts`, `packages/engine/src/templates/{catalog,types}.ts`, plus `__tests__/{issuer,scorer,penalties,planner,modifiers}.test.ts`. Catalog lives only in `templates/catalog.ts` (v1 does not read `quest_templates`). `FEATURE_LLM_PLANNER` is not exported. No `fs` / `fetch` / `process.env` / `Date.now()` — time is injected as `now: Date` and `timeZone: string`.

Named verify items hold:

- **16 ids only**, exactly the Appendix A list, **no `habit_log_weight`**. `TEMPLATE_IDS` / `CATALOG` length 16; `requiredAll` is `[]` on every row; walks and mobility use `requiredAny: ["none"]`.
- **Goblet**: `statDelta = { str: 0.35, vit: 0.14 }`, `goalTags` includes `muscle_gain` not `mobility`, contra `knee`. Independently recomputed: `max = 0.40 * 4.2 = 1.68`, `raw = 0.35*1.6 + 0.14*0.8 = 0.672`, `goalAlignment = 40 + 15 = 55`, `scoreTemplate` empty history / remaining 40 / recovery 80 = `0.40*55 + 0.20*100 + 0.15*100 + 0.15*100 + 0.10*80` = **80**. Tests assert `toBe(80)` (not `toBeCloseTo`). `neat()` is float hygiene so the IEEE `54.999…` path still yields exact 55 / 80.
- **Empty-day fallback** emits `habit_sleep_window` then `cardio_zone2_walk` (`budgetMinutes = 10` → walk `estimatedMinutes` 10 / `seconds` 600; sleep stays 0). No other ids. Issuer never returns an empty `quests` array.
- **Scorer goldens** all appear in `scorer.test.ts`: mobility `goalAlignment ≈ 24.261` (lower than 55 by ≥ 10); `freshness` idx 0 → 30 / absent → 100; `timeFit(25, 20) === 0`; `timeFit(25, 22) === 60`; `recoveryFit("hard", 69) === 0`; `recoveryFit("hard", 70) === 70`.
- **Appendix A `build()` defaults**, set scaling `max(1, round(sets * volumeMul * (recovery < 55 ? 0.75 : 1)))`, beginner `rpeMax <= 7`, penalty `rpeMax <= 4` / `estimatedMinutes <= 20` / `source: "penalty"` / flat 10 XP. Contras: sit-to-stand + goblet → `knee`; incline push → `shoulder`,`wrist`; hip hinge → `spine`; others `[]`; `mob_hip_unload` OK with `knee`.
- Planner skeletons, `< 2` available days → `full_body` / `hardAllowed` iff budget ≥ 30, cardio-only `hardAllowed=false`, gate = latest `budgetMinutes >= 40 && hardAllowed && !rest`. Catch-up 3-day gap: unissued absences are not fails; `questsToInsert` is always `[]`; open interval > 14 keeps the 14 most recent. Modifier idempotency and low-sleep (`< 300`) invents no new key. Busy 3rd in the ISO week → `failed`. Knee + PAR-Q whitelist tests exist.

Issue 1 is fixed at `4c57775`: `last3DaysNewestFirst` no longer intersects with `catchUpSet`. Next-day leftover issued + already-failed `today-2` / `today-3` inserts `caution_volume` (`volumeMul = 0.7`). Matches §9.6 / §9.9. No remaining blockers.

### Test run

Worktree, PATH prepended with `C:\Users\Timus97\.nodejs\node-v22.23.2-win-x64` (Node v22.23.2):

- `pnpm --filter @arise/engine test` — **PASS** (9 files, **78** tests, vitest 3.2.7; +2 caution cases in `penalties.test.ts`)
- `pnpm --filter @arise/engine typecheck` — **PASS** (`tsc -p tsconfig.json --noEmit`, exit 0)

| Check | Result |
| --- | --- |
| Exactly 16 Appendix A ids | PASS |
| No `habit_log_weight` | PASS |
| Goblet `score === 80` vs `muscle_gain` | PASS (independently recomputed) |
| Empty-day fallback order + 10 min walk | PASS |
| Scorer goldens (freshness / timeFit / recoveryFit / mobility GA) | PASS |
| No I/O | PASS |
| Knee filter / PAR-Q whitelist / busy-3rd=fail / penalty RPE | PASS |
| Catch-up 3-day gap + 14-day cap + no inserts | PASS |
| Modifier idempotency / no low-sleep key | PASS |
| Last-3-day `caution_volume` including already-failed | **PASS** (Issue 1 fixed at `4c57775`) |

### Issues

### Issue 1 -- Severity: must-fix
- **File**: packages/engine/src/penalties.ts:143-146 (was 142-145)
- **Description**: First-pass `catchUpMissedDays` built `last3DaysNewestFirst` as last 3 local dates **intersected with `catchUpSet`**. `catchUpSet` is the open interval `[lastEnsured, today)` (capped to 14). On a normal next-day ensure, that set is only yesterday. Already-failed required quests on `today-2` / `today-3` were dropped, so `cautionVolumeAfterThreeFails` never saw three consecutive fail days.

  Design §9.6 / ARISE-007: last 3 local dates each containing ≥ 1 failed required quest → `caution_volume` for 2 local days (`volumeMul = 0.7`). §9.9: “3 consecutive dated days in the failed set **(or already-failed required quests)**”. The parenthetical exists for daily midnight-fail: Mon leftover failed on Tue, Tue leftover failed on Wed, Wed leftover failed on Thu — last_ensured is always yesterday, catch-up is one date, caution must still fire.

  The must-cover 3-day-gap test (three leftover `issued` rows flipped in one call) still passes because those three dates are all in `catchUpSet`. The common path does not.

  Repro (not in the suite):

  ```
  today=2026-08-15, lastEnsured=2026-08-14
  existing: 08-14 issued strength, 08-13 failed strength, 08-12 failed strength
  expected: cautionVolume.kind === "caution_volume" && payload.volumeMul === 0.7
  actual:   cautionVolume === null
  ```

- **Suggestion**: Pass last-3 (within the 14 most-recent catch-up window, which last-3 always is) **without** the `catchUpSet.has(localDate)` filter:

  ```ts
  quests: afterFail.filter((q) => q.localDate === localDate)
  ```

  Document that `existingQuests` must include at least the last 3 local dates (already-failed included), not only `[last, today)`. Add the repro above next to the existing 3-day-gap case.
- **Status**: fixed (`4c57775`)
- **Response**: Removed `catchUpSet.has(localDate)` on last-3 (`quests: afterFail.filter((q) => q.localDate === localDate)`). `CatchUpInput.existingQuests` is documented to include last 3 local dates (already-failed too), not only `[last, today)`. Tests added: next-day leftover issued + two already-failed days, and three already-failed days with no new flips — both insert `caution_volume` / `volumeMul = 0.7`. Unissued absences still do not count as fails. Re-review confirms the first-pass repro now passes.

### Issue 2 -- Severity: suggestion
- **File**: (git) `feat/ARISE-007-catalog-issuer`
- **Description**: Working tree is clean at `4c57775`, but the branch has **no upstream**. `git ls-remote --heads origin feat/ARISE-007-catalog-issuer` is empty. Team DoD / `GIT_WORKFLOW.md` require the feature branch on GitHub before review/merge. Process, not an engine miss.
- **Suggestion**: `git push -u origin HEAD` from this worktree before merge. Reviewer read the local worktree SHA named in the assignment.
- **Status**: open

### Issue 3 -- Severity: suggestion
- **File**: packages/engine/src/issuer.ts:62-68
- **Description**: `isRestComposition` treats `!parqClear` as a full rest day (rec_full_rest-or-walk / one mobility / `habit_sleep_window`). §9.3 only makes PAR-Q a whitelist (`recovery|mobility|habit|steps` × `rest|easy`); §9.5’s “forceRest from PAR-Q” is not a field on `evaluateParq` (other-yes is `easyOnly`, not rest). Rest composition drops **steps**, which the whitelist would allow on a training day.
- **Suggestion**: Drive rest composition from `planDay.focus === "rest" || recoveryScore < 35 || illness_rest` only. Keep `parqClear` as eligibility (`parqAllowsTemplate`) so a PAR-Q user still gets steps + mobility + habit.
- **Status**: open

### Issue 4 -- Severity: suggestion
- **File**: packages/engine/src/modifiers.ts:18-38
- **Description**: `planModifiers` matches §9.10 byte-for-byte, including writing `healthPredicate.value = residual`. Re-running against the same `summary.steps` after residual is applied will take the `auto_steps` branch (`4000 >= 2000`) and auto-complete a 6k steps quest the user has not finished. The idempotency test only asserts residual does not shrink twice. `POST /me/today/ensure` persists **new** modifiers on the already-issued path, so a second ensure the same day would fire this.
- **Suggestion**: Skip `auto_steps` when `steps_residual` is already applied unless `summary.steps` has increased since the residual was written (or keep the original target next to the residual). Add that case next to the existing idempotency test. Fine to land with PR 10 if 06b stays literal §9.10.
- **Status**: open

### Issue 5 -- Severity: nit
- **File**: packages/engine/src/scorer.ts:53-57
- **Description**: Design snippet is `if (baseMinutes <= remaining + 5) return 60`, which would make `timeFit(25, 20) === 60`. The golden table / ARISE-007 AC say `timeFit(25, 20) === 0`. Implementation uses `<` and matches the golden. Correct choice; the snippet and the table disagree.
- **Suggestion**: Leave the `<` (golden wins). One-line comment already records this; no change required.
- **Status**: open

### Issue 6 -- Severity: nit
- **File**: packages/engine/src/__tests__/penalties.test.ts
- **Description**: `resolveSkip` wires illness → tomorrow-local `illness_rest` and pain → 24 h `pain_no_hard`, but this PR’s tests only cover busy-3rd. Those windows are covered in 06a `safety.test.ts`. `shouldSuggestRegenerate` is implemented and not auto-called (correct for v1) but has no unit test.
- **Suggestion**: One illness / one pain assertion through `resolveSkip`, plus `shouldSuggestRegenerate` below / at / above 0.30 with ≥ 7 dated days.
- **Status**: open

### Blocking count
0 blocking (bug + must-fix)
