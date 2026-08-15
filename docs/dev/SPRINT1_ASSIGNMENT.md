# Sprint 1 assignment — ARISE-003 / PR 03

Sprint 1 is **Done**. Assignment sheet only — do not treat this file as the contract. `docs/design.md` revision 4 wins.

## Sprint goal

Ship the remaining Sprint 1 foundation piece: **domain Zod types** (`packages/domain`) so engine, db, health, and API cannot drift on `intl`, ranks, or illegal prescriptions. Monorepo (ARISE-001), CI + IP grep (ARISE-002), and env/Dockerfiles (ARISE-005) are already **Done** on `main` with peer PASS.

## Who does what

| Role | Person | This assignment |
| --- | --- | --- |
| Implement | **Dev A** | ARISE-003 / PR 03 — Domain Zod types |
| Peer review | **Dev B** | Reviews Dev A until Verdict **PASS** (0 blocking) |
| Scrum Master | 0.1 | Board + this sheet. Not an implementer. |
| Product Owner | — | **Not required** this sprint |

Team size: **2 seniors** + SM 0.1. Do not add a third.

## ARISE-003 acceptance criteria

Full checklist: [`docs/backlog/USER_STORIES.md`](../backlog/USER_STORIES.md) — **ARISE-003**.

Implement from the design, do not invent types:

- Domain types: [`docs/design.md`](../design.md) **§9.1** (`Rank` E–S, `PlayerStats` **`intl` not `int`**, `STAT_KEYS`, `DEFAULT_STATS`, `GoalType`, `GOAL_STAT_WEIGHTS`, `QuestKind` / `QuestStatus`, `Equipment` with **no** `outdoor`).
- `RegisterBody`: design API / Better Auth façade (`packages/domain/src/api.ts` block next to sign-up).
- `OnboardingBody`: design onboarding API section (`PUT /onboarding` and `POST /plan/preview` share the body).

Sprint 1 exit still open until 003 lands: domain types use **`intl` not `int`**; ranks **E–S**; `RegisterBody` / `OnboardingBody` exist.

## Review rule

Dev B reviews Dev A until **Verdict PASS**. Author does not self-merge on a failing or pending review. Team DoD: [`docs/backlog/DEFINITION_OF_DONE.md`](../backlog/DEFINITION_OF_DONE.md). PR 03 must-cover: domain types compile; illegal prescriptions rejected; `intl` not `int`.

## Sprint 1 is not closed

**Closed 2026-08-15.** ARISE-003 landed on `main` (`3275526` / merge `5caefaa`) with Dev B **PASS**. Sprint 2 is now unblocked (still Planned until kicked off).
