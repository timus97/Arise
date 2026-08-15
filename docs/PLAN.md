# Arise v1 — Complete plan (team working set)

| Field | Value |
| --- | --- |
| **Status** | Complete for implementation |
| **Contract** | [`design.md`](./design.md) revision 4 (locked 2026-08-14) |
| **Team** | Scrum Master, Product Owner, Dev A, Dev B |
| **Date** | 2026-08-15 |

This file is the index. **`design.md` wins** if anything here disagrees.

---

## How to read the plan

| Document | Role |
| --- | --- |
| [`design.md`](./design.md) | Implementation contract: stack, API, engine math, 16 templates, data model, PR DAG |
| [`product/PLAN_ADDENDUM.md`](./product/PLAN_ADDENDUM.md) | Product completion: locked scope, approved polish P1–P10, deferred/rejected |
| [`product/COMPETITOR_ANALYSIS.md`](./product/COMPETITOR_ANALYSIS.md) | Habitica, Strong/Hevy/Fitbod, Freeletics, SuperBetter, health platforms, name collision |
| [`product/FEATURE_DECISIONS.md`](./product/FEATURE_DECISIONS.md) | Feature verdicts: already-in-v1 / polish / v1.1 / v2 / reject |
| [`backlog/USER_STORIES.md`](./backlog/USER_STORIES.md) | ARISE-001–022 mapped to PRs 01–20 |
| [`backlog/SPRINT_BOARD.md`](./backlog/SPRINT_BOARD.md) | Six sprints, merge graph, Sprint 1 Ready |
| [`backlog/DEFINITION_OF_DONE.md`](./backlog/DEFINITION_OF_DONE.md) | Typecheck, tests, no IP, no v1.1 creep, peer PASS |
| [`dev/reviews/`](./dev/reviews/) | Peer reviews for landed work |

---

Per-sprint **team size and skill requirements** live on [`backlog/SPRINT_BOARD.md`](./backlog/SPRINT_BOARD.md) (summary table + a block under each sprint). Default staff is **2 seniors**; a third is optional only in Sprint 2 and after PR 14 in Sprint 5.

## Team split

| Person | Owns |
| --- | --- |
| **Dev A** | PR 03, 04, 06a, 06b, 08, 09, 10, 11, 12 (domain, engine, API) |
| **Dev B** | PR 01, 02, 05, 07, 13, 13.1, 14–17, 18a, 19, 20 (scaffold, CI, Docker, health adapters, web, PWA, e2e, launch) |
| **Both** | Implement, then review each other until **PASS** (0 blocking) before merge |
| **PO polish** | P1–P10 from the addendum land **inside** UI PRs 13.1 / 14 / 15 / 16 / 18a — no new APIs |

---

## Sprints

1. **Foundation** — PR 01, 02, 03, 05  
2. **Engine + DB** — PR 04, 06a, 06b, 07  
3. **API core** — PR 08, 09, 10  
4. **API remainder + web shell** — PR 11, 12, 13, 13.1  
5. **System UI + web** — PR 14, 15, 16, 17, 18a  
6. **E2E + Compose launch** — PR 19, 20  

PR **18b** (Web Push) is not a v1 sprint.

---

## Sprint 1 progress (this session)

| PR | Story | Owner | Peer review | Landed on `main` |
| --- | --- | --- | --- | --- |
| 01 Monorepo | ARISE-001 | Dev A | **PASS** (Dev B) | Yes |
| 02 CI + IP grep | ARISE-002 | Dev B | **PASS** (Dev A, with 05) | Yes |
| 05 Env + Dockerfiles | ARISE-005 | Dev B | **PASS** (Dev A) | Yes |
| 03 Domain types | ARISE-003 | Dev A | **PASS** (Dev B) | Yes |

Sprint 1 is **complete**. Next: Sprint 2 — ARISE-004 / PR 04 (Dev A) and ARISE-008 / PR 07 (Dev B) after 03.

---

## Launch definition (unchanged)

`docker compose up --build` on a fresh volume → register at `http://localhost:8080/register` with invite code → refresh `/onboarding` is the SPA, not 404.
