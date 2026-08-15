# Sprint 3 assignment — API core

Sprint 3 is **In progress**. Assignment sheet only — do not treat this file as the contract. `docs/design.md` revision 4 wins. Full checklists: [`docs/backlog/USER_STORIES.md`](../backlog/USER_STORIES.md) ARISE-009 / 010 / 011.

## Sprint goal

Ship the API core: Node Hono + Better Auth username + scrypt (**08** / ARISE-009), onboarding + plan gates (**09** / ARISE-010), and ensure / complete / skip (**10** / ARISE-011). Invite fail-closed and age 16+ are load-bearing from PR 08. No SYSTEM UI, PWA, Playwright, third implementer, or PO this sprint.

## Team + git

| Role | Person | This sprint |
| --- | --- | --- |
| Implement | **Dev A** | ARISE-009 now → 010 only after 08 peer PASS + merge + push `main` → 011 only after 09 peer PASS + merge + push `main` |
| Quality + review | **Dev B** | (1) quality-audit Sprint 1–2 packages; (2) review PR 08 until Verdict **PASS**; then review 09 and 10 the same way |
| Peer review | **Other senior** | Reviews until Verdict **PASS** (0 blocking). Author does not self-merge. |
| Scrum Master | 0.1 | Board + this sheet. Not an implementer. |
| Product Owner | — | **Not required** this sprint |

Team size: **2 seniors** + SM 0.1. **Do not add a third.** 08 → 09 → 10 is serial on one API owner. Points: 21 (A 21 / B 0 implement — B reviews + Sprint 1–2 quality audit).

**Git (mandatory):** [`docs/dev/GIT_WORKFLOW.md`](./GIT_WORKFLOW.md)

```powershell
git fetch origin
git checkout main
git pull origin main
git checkout -b feat/<STORY-ID>-<short-slug>
# then implement only that story; commit; git push -u origin HEAD
```

- One story per feature branch. Never implement on `main`. Never mix 08 / 09 / 10 on one branch.
- After peer **PASS**: merge `--no-ff` to `main` and **`git push origin main`**.
- Commit titles from the PR plan (below). No Solo Leveling strings (`FORBIDDEN.txt`).

## First slice — start now

| Who | Story | PR | Branch | Commit title |
| --- | --- | --- | --- | --- |
| **Dev A** | **ARISE-009** (implement) | 08 | `feat/ARISE-009-hono-auth` | `feat(api): hono node entry, better-auth username+scrypt, vite-proxy origin` |
| **Dev B** | Quality-audit Sprint 1–2 packages (`@arise/domain`, `@arise/engine`, `@arise/health`, `@arise/db`). Then review PR 08 until PASS. | — | docs/review branch if writing notes | Review under `docs/dev/reviews/` |

Next on A (not this slice):

| When | Story | PR | Branch | Commit title |
| --- | --- | --- | --- | --- |
| **Only after 08 peer PASS + merge + push `main`** | ARISE-010 | 09 | `feat/ARISE-010-onboarding-plan` | `feat(api): onboarding, plan preview/regenerate, pregnancy and loss-rate gates` |
| **Only after 09 peer PASS + merge + push `main`** | ARISE-011 | 10 | `feat/ARISE-011-ensure-quests` | `feat(api): POST /me/today/ensure, complete/skip, lazy fail` |

010 and 011 stay **Planned** until those gates. Do not start 09 on the 08 branch. Do not start 10 on the 09 branch.

## Requirements gathered from design

Contract: `docs/design.md` revision 4. Stories add the AC checklists.

### ARISE-009 / PR 08 — Hono + Better Auth (Dev A, start now)

- Files: `apps/api/src/{node,app,auth,env,middleware,routes/auth}.ts`, middleware `{auth,ready,timing,error}.ts`, `apps/api/README.md` (Free Worker spike results).
- `src/node.ts` is v1 production. `src/worker.ts` may exist so the same routes can be deployed to Workers Paid **later**; it is **not** the launch host.
- On boot (`src/node.ts`): `migrate()` then listen, then start `node-cron` (cron jobs land later; boot hook may be a no-op until then).
- Better Auth `createAuth` **exactly** as design §7: `appName: "Arise"`, `basePath: "/api/v1/auth"`, `emailAndPassword.enabled: true`, `minPasswordLength: 10`, **default hasher = scrypt** (do not override on Node), `session.expiresIn: 60 * 60 * 24 * 30`, `updateAge: 60 * 60 * 24`, `cookieCache: { enabled: true, maxAge: 60 * 5 }`, `rateLimit: { enabled: true, window: 60, max: 10 }`, `cookiePrefix: "arise"`, session cookie name **`arise.session`**, `httpOnly: true`, `sameSite: "lax"`, `secure` iff `appOrigin.startsWith("https")`, `path: "/"`, plugins `[username()]`.
- `user.email` remains required+unique. Username-only (no email) → **`400 EMAIL_REQUIRED`**. Sign-in identifier may be email **or** username.
- **`age` is required before insert.** `age < 16` → **`400 AGE_RESTRICTED`** and **write zero rows**.
- **`REGISTER_INVITE_CODE` required.** Missing/empty env → **`503 INVITE_UNCONFIGURED`** (fail-closed). Mismatch → **`403 INVITE_REQUIRED`**.
- `acceptedMedicalDisclaimer` must be `true` or validation fails.
- On `RUNTIME=worker` without `ALLOW_WORKER_PASSWORD_AUTH=true`, sign-up/sign-in → **`501 AUTH_RUNTIME_UNSUPPORTED`**.
- `GET /health` → `{ ok: true, runtime, version }` **no DB**. Rate limit **30/min/IP** in-process. `GET /ready` → `{ ok: true, db: "ok" }` or 503. **1 `SELECT 1`**.
- CORS: production has no cross-origin. Do **not** set `SameSite=None`. Dev origin is Vite `:5173`.
- `Server-Timing: app;dur=<ms>` on all API routes. JSON log `{ ts, level, requestId, userId?, route, ms, cpuMs?, d1?, code?, msg }`. No PHI.
- Errors `{ "error": { "code", "message", "details?" } }`. JSON camelCase. Base `/api/v1`.
- Password reset: `POST /api/v1/auth/forget-password` only if `SMTP_URL` is set; else **404**.
- Node rate limit is process memory. Do not also upsert `rate_limits` on login. `secondaryStorage` required when `RUNTIME=worker` (D1 `auth_rl`); **omit on Node**.
- Must-cover tests (`app.request`): 401 on protected routes; age **15** no row; invite fail-closed / mismatch.

#### Workers Free scrypt spike (required for PR 08)

- Deploy sign-up/sign-in to a **Free** Worker, record the CPU abort, keep the note in `apps/api/README.md`.
- **Do not leave that deploy as production.** Tear it down after the abort is captured.
- A weaker custom `password.hash` (PBKDF2-SHA-256, iteration count measured &lt; 8 ms) is **not** the default and is not scheduled. Do not roll our own to paper over Free.
- If a Cloudflare account is **unavailable**, cite **better-auth#8860** class honestly as the expected abort (design References + KD 16). Do not invent a successful Free run. Do not leave a live Free deploy.

### ARISE-010 / PR 09 — onboarding + plan (Dev A, after 08 on `main`)

- Files: `apps/api/src/routes/onboarding.ts`, `apps/api/src/routes/plan.ts`.
- `PUT /onboarding` and `POST /plan/preview` share `OnboardingBody`. Preview writes **0** rows (`persist: false`).
- `PUT /onboarding` success **200** `{ plan, days, profile }` and `profiles.onboarding_status = 'complete'`. Query budget: ~8 inserts in one `atomic`.
- Disclaimer not true / Zod fail → **400** `VALIDATION`.
- Implied fat-loss &gt; 1% BW/week → **400 `UNSAFE_LOSS_RATE`** + `details.maxKgPerWeek`.
- `parq.pregnancy === true` → **403 `PREGNANCY_HARD_STOP`** with message from design + `"actions": ["deleteAccount"]`. Profile shell `onboarding_status='blocked_pregnancy'`; **no** goal/habit/plan.
- Age &lt; 16 (already blocked at register) → **400** `AGE_RESTRICTED`.
- Other PAR-Q yeses → `parq_clear=false`, easy-only whitelist (no plan of hard work).
- `jobActivity` / `commuteWalkMinutes` / `sleepWindow` are **stored only, unused in v1 issuer**.
- `GET /plan` returns the active (non-archived) plan.
- `POST /plan/regenerate` `{ "reason": "schedule_change" }` increments version, archives old plan, inserts new days. Does **not** rewrite historical `daily_quests`. If today’s quests are all still `issued`, delete them **and** the ledger row in one `tx`/`batch`.
- Session present: no `profiles` / pending → 409 `ONBOARDING_REQUIRED`; `blocked_pregnancy` → 409 `PREGNANCY_HARD_STOP`.
- No v1 habit learning. Skip-pattern auto-regenerate is v1.1 (`suggestRegenerate` flag only).
- Must-cover tests: pregnancy hard-stop (no plan rows); implied loss reject; preview **0** writes.

### ARISE-011 / PR 10 — ensure + quests (Dev A, after 09 on `main`)

- Files: `apps/api/src/routes/today.ts`, `apps/api/src/routes/quests.ts`, `apps/api/src/jobs/evaluate-penalties.ts`.
- `GET /me/today?date=YYYY-MM-DD` is **read only**. Default today in user tz. Future → 400. **0 writes.**
- Disclaimer on every System window payload: `"Arise is not a medical device. Stop if you feel pain, chest pressure, or faintness."`
- No ledger for today → `needsEnsure: true`, `quests: []`. GET may compute `pendingModifiers` in memory **without writing**.
- `POST /me/today/ensure` catch-up + issue **today only**. If `date` is present and ≠ local today → **`400 ENSURE_DATE_NOT_TODAY`**.
- `Cache-Control: private, no-store` on GET today and POST ensure.
- Ensure implements design §9.9 steps 1–7. Unique conflict of ledger → SELECT existing, still set `last_ensured_local_date = today`.
- Query budgets (Node habit ≤ 20; hard cap 50 if the same code ever runs on D1 Free):
  - `GET /me/today` — 1 bundle. **0 writes.**
  - `POST /me/today/ensure` (issue + catch-up) ≤ **12** statements.
  - `POST /quests/:id/complete` ≤ **8** statements.
- Bundle read is **1 statement** `todayBundle.sql` (§10).
- Complete: `effort: "full" | "partial"`. Partial = **50%** XP. Skip reasons `rest_planned` | `illness` | `pain` | `busy`. 3rd `busy` skip in ISO week → store `failed`, not skipped.
- XP writes to **`profiles.xp` / `profiles.level`**. `hard_bouts` writer is **only** `applyCompletion`.
- Rank recompute at the end of every successful complete/skip/ensure. Destabilized S → `A` + `rank_events.reason=destabilized`.
- IDOR: cannot complete another user’s quest (`user_id = session.userId`).
- Cron `evaluate-penalties.ts` calls **only** `catchUpMissedDays` for users with `last_ensured_local_date < their local today`, **25 users/tick**. Cron does **not** issue today.
- `suggestRegenerate: true` flag only — **do not auto-regenerate**.
- Must-cover tests: ensure idempotent; GET today writes **0**; cannot complete another user; budgets ≤ **12** / ≤ **8**.

## Quality bar

- TypeScript 5 **strict** via the repo turbo/CI typecheck task. Typecheck must stay green.
- Tests **must cover story AC** (DoD table): PR 08 → 401, age 15 no row, invite fail-closed, spike note; PR 09 → `PREGNANCY_HARD_STOP`, `UNSAFE_LOSS_RATE`, preview 0 writes; PR 10 → ensure idempotent, IDOR, GET today 0 writes, budgets ≤ 12 / ≤ 8.
- **No v1.1 scope:** no Web Push / VAPID, no Apple XML / `export.zip`, no habit-learning auto-regenerate, no catalog beyond 16 ids, no weaker Free-Worker hash, no `wrangler.toml` / `deploy.yml` / Caddy / custom domain as a v1 deliverable.
- Package name **`arise`**. Chrome **SYSTEM**. Stats key **`intl`**. No Solo Leveling strings.
- Team DoD: [`docs/backlog/DEFINITION_OF_DONE.md`](../backlog/DEFINITION_OF_DONE.md).

## Dev B — quality audit (start now, while A implements 08)

Audit Sprint 1–2 packages against design revision 4 + story AC. Do **not** implement API code.

| Package | Tests (last green) | Audit for |
| --- | --- | --- |
| `@arise/domain` | 20 | `intl` not `int`; ranks E–S; `RegisterBody` / `OnboardingBody`; illegal prescriptions rejected |
| `@arise/engine` | 78 | XP goldens; rank gates; goblet `score === 80`; 16 ids; empty-day fallback; catch-up; busy-3rd=fail; penalty `rpeMax <= 4` |
| `@arise/health` | 17 | CSV 256 KB / 200 rows; stubs `unavailable_web`; no XML/zip |
| `@arise/db` | 4 | no `users` table; XP on `profiles`; `atomic()` batch-fail ⇒ 0 ledger rows; no `push_*` |

Write findings under `docs/dev/reviews/`. Blocking contract gaps stay open; nits do not block A starting 08.

## Review

- The **other senior** reviews until Verdict **PASS** (0 blocking). Team DoD: [`docs/backlog/DEFINITION_OF_DONE.md`](../backlog/DEFINITION_OF_DONE.md).
- Review the **remote** feature branch (`origin/feat/...`). Write the review under `docs/dev/reviews/`.
- After PASS: merge to `main` and **push `main`**.
- **ARISE-010 starts only after 08 is on `origin/main`.** **ARISE-011 starts only after 09 is on `origin/main`.**
- Do not implement TypeScript from this sheet — implement from the design + user-story AC.
