# Sprint 6 assignment — E2E + Compose launch

Sprint 6 is **In progress**. Assignment sheet only. `docs/design.md` revision 4 wins. Stories: ARISE-021 / 022.

## Sprint goal

Prove the v1 loop with Playwright (register age 20 → onboard → ensure → complete → XP up) and launch via `docker compose up --build` on a **fresh** volume at `http://localhost:8080`. **No Web Push. No Caddy. No Workers.**

## Team

| Role | This sprint |
| --- | --- |
| **Dev B** | ARISE-021 then ARISE-022 (serial) |
| **Dev A** | On-call for ensure/auth defects; peer review |
| **Senior tester** | Re-run happy path + Compose after each PR |
| **PO** | Accept PR 20 against the launch checklist |
| **SM** | Board + this sheet |

## First slice

| Who | Story | Branch | Commit |
| --- | --- | --- | --- |
| Dev B | ARISE-021 | `feat/ARISE-021-playwright-e2e` | `test(e2e): register, onboard, ensure, complete quest` |

Then: `feat/ARISE-022-compose-launch` — `chore: compose up --build runbook and sqlite backup cron`

## Tools

Node 22, pnpm 9.15.0, Playwright Chromium, Docker engine (Rancher Desktop), sqlite3.
