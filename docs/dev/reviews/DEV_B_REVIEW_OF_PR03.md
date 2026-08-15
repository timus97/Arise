# Peer review: Dev B → Dev A (PR 03)

Reviewed worktree `C:\Users\Timus97\.grok\worktrees\grokanalysis-arise\subagent-01a00455-ead0-7d81-8972-6588860086c7` at claimed commit `3275526c3fc5468a496cae66711f6f6bdd4cbd7e` (`feat(domain): Zod types for player, goal, quest, health, plan, effects`). Checked against design §9.1, RegisterBody, OnboardingBody, ARISE-003, and Sprint 1 assignment. Did not modify Dev A’s tree. Did not push.

### Verdict: PASS

### Summary

PR 03 lands the contracted `@arise/domain` surface and is independently reviewable. Required files exist: `packages/domain/src/{index,ids,player,goal,quest,plan,health,api,effects}.ts`. `Rank` is `E|D|C|B|A|S`. `PlayerStats` keys are `str`, `agi`, `vit`, **`intl`**, `sta` (`.strict()` so a sibling `int` key fails parse). `STAT_KEYS` and `DEFAULT_STATS` (all 10) match §9.1. `GOAL_STAT_WEIGHTS` is byte-exact, including `muscle_gain.str === 1.6`, `mobility.vit === 1.8`, `fat_loss.sta === 1.4`. `Equipment` is `none|bands|dumbbells|full_gym` with no `outdoor`. `QuestPrescription` requires `rpeMax` on every block, `estimatedMinutes`, and `intensity ∈ rest|easy|moderate|hard`. `RegisterBody` is the design façade (email required, password min 10, username optional `^[a-zA-Z0-9_]+$`, disclaimer `z.literal(true)`). `OnboardingBody` matches the API section (PAR-Q booleans, `profile.age` 16–100, habit experience 0–3, equipment min 1, week ISO 1–7, minutes 0–180). `HealthSource` / `HealthMetric` unions are complete; `EffectKind` is the three safety windows. `DailyQuest.idempotencyKey` is documented as `` `${userId}:${localDate}:${templateId}` ``. No `FEATURE_LLM_PLANNER`, social, or push-subscription types (`push` appears only as the strength pattern / day-focus tag).

### Test run

Worktree, PATH prepended with `C:\Users\Timus97\.nodejs\node-v22.23.2-win-x64` (Node v22.23.2):

- `pnpm --filter @arise/domain test` — **PASS** (1 file, 20 tests, vitest 3.2.7)
- `pnpm --filter @arise/domain typecheck` — **PASS** (`tsc -p tsconfig.json --noEmit`, exit 0)

### Issues

### Issue 1 -- Severity: suggestion
- **File**: packages/domain/src/__tests__/domain.test.ts
- **Description**: Onboarding/register goldens cover the design example, age 15 vs 16, password length 9, missing email, and disclaimer `false`. They do not assert the other load-bearing bounds the story names: `profile.age` 101, `habit.experience` 4, weekday 0/8, minutes 181, empty `equipment` / `week`, or username characters outside `^[a-zA-Z0-9_]+$`. The Zod schemas themselves are correct; this is coverage, not a contract miss.
- **Suggestion**: Add `safeParse` rejects for those cases so a later edit cannot silently widen the unions.
- **Status**: open

### Issue 2 -- Severity: nit
- **File**: packages/domain/src/ids.ts
- **Description**: `Ulid` / `TextId` exist as required by the repo tree, but entity schemas use `z.string().min(1)` and never compose `Ulid`. Fine for PR 03 (design §9.1 ids are plain strings).
- **Suggestion**: Wire `TextId`/`Ulid` into `DailyQuest.id` et al. in a later PR, or leave a one-line comment that Better Auth user ids are not ULIDs so entities stay `min(1)`.
- **Status**: open

### Blocking count
0
