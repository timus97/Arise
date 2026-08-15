# Sprint 4 assignment — Remaining API + web shell + CI gates

Sprint 4 is **Done** on `origin/main`. next: Sprint 5 Planned. Assignment sheet only — do not treat this file as the contract. `docs/design.md` revision 4 wins. Full checklists: [`docs/backlog/USER_STORIES.md`](../backlog/USER_STORIES.md) ARISE-012 / 013 / 014 / 015 / 023 / 024 / 025.

## Sprint goal

Ship the remaining API + first web slice: health ingest + consent + retain cron (**11** / ARISE-012), progress / JSON export / account delete / reset-password CLI (**12** / ARISE-013), Vite login/register (**13** / ARISE-014), settings (**13.1** / ARISE-015). **012** is **Done** (merged PR #3). **013** is **Done** (merged PR #6). **014** is **Done** (merged PR #2). **015** is **Done** (merged PR #8; Dev A peer PASS). SRE CI harden (**ARISE-023**) and merge gates (**ARISE-024**) are **Done** on `origin/main` (PR #1). **ARISE-025** is **Done** (merged PR #5 — docs + template + `gh api` snippet use context `ci`).

**Explicit non-goals:** no SYSTEM chrome, no PWA, no Playwright, no Compose launch image, no PO. **No `.github/workflows/deploy.yml`.** **No** Cloudflare Workers / wrangler / Caddy / custom domain (v1 non-goal).

## Team + git

| Role | Person | This sprint |
| --- | --- | --- |
| Implement | **Dev A** | ARISE-012 **Done** (merged PR #3) · ARISE-013 **Done** (merged PR #6) |
| Implement | **Dev B** | ARISE-014 **Done** (merged PR #2) · ARISE-015 **Done** (merged PR #8; Dev A peer PASS) |
| Implement | **SRE** | ARISE-023 **Done** (merged PR #1) · ARISE-024 **Done** (protection live) · ARISE-025 **Done** (merged PR #5; required context is `ci`) |
| Peer review | **Other senior** (A ↔ B) | Reviews product PRs until Verdict **PASS** (0 blocking). Author does not self-merge |
| Scrum Master | 0.1 | Board + this sheet. Not an implementer |
| Product Owner | — | **Not required** this sprint |

Team size: **2 seniors** + SM 0.1 + **SRE**. Do not add a third product implementer. Points: **24** (A 10 / B 8 / SRE 6).

**Git (mandatory):** [`docs/dev/GIT_WORKFLOW.md`](./GIT_WORKFLOW.md)

```powershell
git fetch origin
git checkout main
git pull origin main
git checkout -b feat/<STORY-ID>-<short-slug>
# then implement only that story; commit; git push -u origin HEAD
```

SRE uses `chore/<STORY-ID>-<slug>` (same pull-then-branch rule).

- One story per feature branch. Never implement on `main`. **Never mix 11 and 12 on one branch. Never mix 023 and 024 on one branch.**
- After peer **PASS**: merge `--no-ff` to `main` and **`git push origin main`**.
- Commit titles from the PR plan (below). No Solo Leveling strings (`FORBIDDEN.txt`).

## First slice — start now (parallel)

| Who | Story | PR | Branch | Commit title |
| --- | --- | --- | --- | --- |
| **Dev A** | **ARISE-012** | 11 | `feat/ARISE-012-health-ingest` | `feat(api): health ingest, consent, daily summaries, retain job` |
| **Dev B** | **ARISE-014** | 13 | `feat/ARISE-014-web-shell` | `feat(web): vite, proxy, login/register (age+invite), credentials include` |
| **SRE** | **ARISE-023** | — | `chore/ARISE-023-harden-ci` | `ci: harden Actions for PRs and main` |
| **SRE** | **ARISE-024** | — | `chore/ARISE-024-merge-gates` | `chore: merge gates for main` |

Next (not this first-slice implement mix):

| When | Story | PR | Branch | Commit title |
| --- | --- | --- | --- | --- |
| **After 012 is pushed** (new branch; do not mix 11 and 12) | ARISE-013 | 12 | `feat/ARISE-013-progress-export` | `feat(api): progress, JSON export, account delete, reset-password CLI` |
| **After 12 + 13 are on `main`** | ARISE-015 | 13.1 | `feat/ARISE-015-settings` | `feat(web): settings, units, logout, delete, export download` |

012 **Done** (PR #3). 013 **Done** (PR #6). 014 **Done** (PR #2). 015 **Done** (PR #8; Dev A peer PASS). 023/024/025 **Done**.

If SRE finds more deps, they file them. SM appends under **SRE intake** on [`SPRINT_BOARD.md`](../backlog/SPRINT_BOARD.md).

## Requirements gathered from design

Contract: `docs/design.md` revision 4. Stories add the AC checklists.

### ARISE-012 / PR 11 — health ingest + retain (Dev A, start now)

- Files: `apps/api/src/routes/health.ts`, `apps/api/src/jobs/retain.ts`, `apps/api/src/jobs/node-cron.ts`.
- `POST /health/samples` max **200**. First successful POST requires `{ "consent": true }`; thereafter optional. Without consent → **`403 HEALTH_CONSENT_REQUIRED`**.
- `POST /health/manual` sugar for one sample + optional `consent`.
- `GET /health/summary?from&to` → `DailySummary[]`.
- Persist path: 1 multi-value `INSERT` + 1 summary upsert + 1 optional modifier batch ≤ **6** statements.
- Persist **new** modifiers only (`json_insert`). Re-running ensure must not shrink twice.
- Health ingest uses `rate_limits` (not Better Auth memory). `GET /health` stays isolate-local, 30/min/IP, no DB.
- Node cron **one schedule** `15 3 * * *` UTC: `retain.ts` (chunks of **500**) then `evaluate-penalties.ts` (**25 users/tick**, does not issue today). **No push job.**
- Defaults: `HEALTH_SAMPLE_RETENTION_DAYS=30`, `AUDIT_RETENTION_DAYS=90`, `MAX_IMPORT_SAMPLES_PER_DAY=5000`.
- Health samples never increment `hard_bouts` in v1.
- Must-cover tests: consent 403; 200-row ingest; modifier persist idempotent.

### ARISE-014 / PR 13 — Vite login/register (Dev B, start now)

- Files: `apps/web` Vite + auth routes + `src/lib/api.ts`, `src/lib/auth-client.ts`, `src/main.tsx`, `src/app.tsx`, `src/routes/__root.tsx`, `src/routes/index.tsx`, `src/routes/login.tsx`, `src/routes/register.tsx`, `src/components/disclaimer/MedicalDisclaimer.tsx`, `src/styles/system.css` shell.
- Vite 6 + React 19 + TanStack Router + Query. **Not Next.js.**
- Vite proxy: port **5173**, `"/api"` → `http://127.0.0.1:8787`, `changeOrigin: false`.
- `credentials: 'include'` and relative URLs (`/api/v1/...`). Never call `:8787` from the browser.
- Register collects age + invite + medical disclaimer. Under-16 → server **`400 AGE_RESTRICTED`**, zero rows.
- Invite required; empty `REGISTER_INVITE_CODE` is fail-closed (`503 INVITE_UNCONFIGURED`).
- Email required; username optional alias. Password min 10.
- Theme: **Dark System only**. Chrome says **SYSTEM**. Product name Arise. English. Store metric.
- No Web Push copy. No Solo Leveling IP strings.
- Manual/dev: register + login against `http://localhost:5173` sets `arise.session`.

### ARISE-013 / PR 12 — progress / export / delete / CLI (Dev A, after 012 is pushed)

- Files: `apps/api/src/routes/progress.ts`, `routes/export.ts`, `cli/reset-password.ts`, `routes/me.ts` (debug).
- `GET /progress` last **90** days.
- `GET /api/v1/me/export` → `application/json` attachment **`arise-export.json`**. **No** `accounts.password`, no other users.
- `POST /api/v1/account/delete` cascade (all user-scoped rows).
- `GET /me/debug` auth’d dogfood payload.
- `POST /api/v1/auth/forget-password` only if `SMTP_URL` is set; else **404**.
- CLI (Node/Docker only): `pnpm --filter api exec tsx src/cli/reset-password.ts --identifier USER --password -`.
- Must-cover tests: export omits password hashes; delete cascades; forget-password 404 without SMTP.

### ARISE-015 / PR 13.1 — settings (Dev B, after 12 + 13)

- File: `apps/web/src/routes/settings.tsx` (plus `src/lib/units.ts` as needed).
- Settings: units (metric + imperial toggle; **store metric**), tz, logout, delete, export download `arise-export.json`.
- Delete calls `POST /api/v1/account/delete`.
- If SMTP unset, Settings copy points at the operator CLI.
- Stub copy + shared-device IndexedDB warning (must say do not install on a shared phone).
- `PREGNANCY_HARD_STOP`: Settings reachable for **Delete account** only.
- No VAPID / push settings.

### ARISE-023 — Harden GitHub Actions CI (SRE, start now)

- Workflow: `.github/workflows/ci.yml` only.
- **`concurrency` + `cancel-in-progress: true`** for the same ref.
- **Node 22** + **pnpm 9** with **pnpm store cache**.
- Install: **`pnpm install --frozen-lockfile`**.
- Forbidden-string grep still **fail-closed** (match or rg error → red job).
- Typecheck and test **must fail the job**. Do **not** `--if-present` skip when those scripts exist.
- **No `deploy.yml`.** No Workers / Caddy jobs.

### ARISE-024 — Merge gates for main (SRE, start now on its own branch)

- Document the required check name exactly: **`CI / ci`**.
- Add a PR template that names `CI / ci` and restates peer PASS before merge.
- Try to set branch protection on `main` via `gh` (require PR + required status check `CI / ci`) if the token has Administration.
- If **403**, record the **exact** `gh api` command for the operator. **Do not block the rest of Sprint 4.**
- **No `deploy.yml`.** No Workers / Caddy / custom-domain rules.

## Quality bar

- TypeScript 5 **strict** via the repo turbo/CI typecheck task. Typecheck must stay green.
- Tests **must cover story AC** (DoD table): PR 11 → consent 403, 200-row ingest, retain; PR 12 → export omits password, delete cascade, forget-password 404; PR 13 → register/login via Vite proxy + `credentials: 'include'`; PR 13.1 → units/tz/logout/delete/export + shared-phone copy; 023 → cancel-in-progress, frozen-lockfile, fail-closed grep/typecheck/test; 024 → `CI / ci` documented, PR template, protection or recorded `gh api`.
- **No `deploy.yml`.** No Workers / Caddy / wrangler as a v1 deliverable.
- **No v1.1 scope:** no Web Push / VAPID, no Apple XML / `export.zip`, no habit-learning auto-regenerate, no catalog beyond 16 ids.
- Package name **`arise`**. Chrome **SYSTEM**. Stats key **`intl`**. No Solo Leveling strings.
- Team DoD: [`docs/backlog/DEFINITION_OF_DONE.md`](../backlog/DEFINITION_OF_DONE.md).

## Review

- The **other senior** reviews product PRs until Verdict **PASS** (0 blocking). Team DoD: [`docs/backlog/DEFINITION_OF_DONE.md`](../backlog/DEFINITION_OF_DONE.md).
- Review the **remote** feature branch (`origin/feat/...` or `origin/chore/...`). Write the review under `docs/dev/reviews/`.
- After PASS: merge to `main` and **push `main`**.
- **ARISE-012 / 013 / 014 / 015 / 023 / 024 / 025 are Done on `origin/main`.** Dev A PASS of PR 13.1 is in [`docs/dev/reviews/DEV_A_REVIEW_OF_PR131.md`](./reviews/DEV_A_REVIEW_OF_PR131.md).
- Do not implement TypeScript from this sheet — implement from the design + user-story AC.
