# Arise v1 — Team Definition of Done

Contract: [`docs/design.md`](../design.md) revision 4 (accepted 2026-08-14).  
Stories: [`USER_STORIES.md`](./USER_STORIES.md). Board: [`SPRINT_BOARD.md`](./SPRINT_BOARD.md).

A story is **not done** until every item below is true. Story-specific acceptance criteria in `USER_STORIES.md` are additional, not a substitute.

---

## Git (mandatory)

Full procedure: [`docs/dev/GIT_WORKFLOW.md`](../dev/GIT_WORKFLOW.md).

- [ ] Started from a **pull of `origin/main`**, then a **new feature branch** (`feat/<STORY-ID>-<slug>`). Never implement on `main`.
- [ ] Work is **committed** with the PR-plan title.
- [ ] Branch is **pushed to GitHub** (`origin`) before the author stops and before review is requested.
- [ ] After peer PASS, merge to `main` is **pushed to GitHub**. No story is Done if it exists only locally.

## Merge gate

1. **Peer review must PASS before merge.** One approving review from the other senior (Dev A ↔ Dev B). The author does not self-merge on a failing or pending review.
2. CI on the PR is green: lint, typecheck, tests for that PR, forbidden-string grep.
3. The PR is independently reviewable and mapped to its backlog ID / PR number.
4. No “fix in a follow-up” for load-bearing contract items (goldens, status codes, invite fail-closed, age 16+, query budgets, 16 template ids).
5. Feature branch and (after PASS) `main` are on **GitHub**, not only a local worktree.

---

## Engineering

- [ ] **Typecheck** passes (TypeScript 5.x strict via the repo turbo/CI typecheck task).
- [ ] **Tests for that PR** pass and cover the design’s required surface for that PR (see table).
- [ ] New public types/routes match `packages/domain` (camelCase JSON, `intl` not `int`).
- [ ] No `dangerouslySetInnerHTML`. CSP remains same-origin (`connect-src 'self'`).
- [ ] No secrets in the web bundle. No PHI in logs (`Server-Timing` / JSON logs only).
- [ ] Cookie sessions stay host-only, `SameSite=lax`, name `arise.session` once auth exists. Do **not** set `SameSite=None`.

### Required test surface by PR

| PR | Must-cover (from design §20 and the PR plan) |
| --- | --- |
| 01 | `pnpm -r` works; package name `arise` |
| 02 | CI job exists; `rg -i -f FORBIDDEN.txt --glob '!grok-design*' --glob '!.git/**'` fails the build on a hit |
| 03 | Domain types compile; illegal prescriptions rejected; `intl` not `int` |
| 04 | Mocked `batch` throw ⇒ **0** `issuance_ledger` rows |
| 05 | Files present; no stub `/health` app; Compose-may-fail-until-08 documented |
| 06a | `xpToNextLevel(1) === 100`, `(10) === 2239`, `(25) === 7713`, `(50) === 19661`; rank gates; implied loss reject; penalty `rpeMax <= 4` |
| 06b | **`score === 80`** goblet vs `muscle_gain`; empty-day fallback `habit_sleep_window` + `cardio_zone2_walk`; catch-up 3-day gap; modifier idempotency; knee filter; PAR-Q whitelist; busy-3rd=fail |
| 07 | CSV fixture **5** rows; reject **201st**; range drop; stubs `unavailable_web` |
| 08 | 401; age **15** no row; invite fail-closed; Free Worker spike note in `apps/api/README.md` |
| 09 | `PREGNANCY_HARD_STOP`; `UNSAFE_LOSS_RATE`; preview **0** writes |
| 10 | Ensure idempotent; cannot complete another user; `GET /me/today` writes **0**; budgets ≤ **12** / ≤ **8** |
| 11 | Consent `403 HEALTH_CONSENT_REQUIRED`; ≤200 samples; retain job |
| 12 | Export omits `accounts.password`; delete cascade; forget-password 404 without SMTP |
| 13 | Register/login via Vite proxy; `credentials: 'include'` |
| 13.1 | Units/tz/logout/delete/export; shared-phone copy |
| 14 | SYSTEM chrome; disclaimer; complete/partial/skip |
| 15 | Six steps; pregnancy dead-end |
| 16 | Client reject `size > 262144` or `rows > 200` before parse |
| 17 | XP / stats / rank history (90 days) |
| 18a | No `push` handlers; outbox + `409 DAY_CLOSED` |
| 19 | Playwright: register (**age 20**) → onboard → ensure → complete one → XP up |
| 20 | Fresh-volume `docker compose up --build`; `/onboarding` SPA not 404; `/app/web/index.html` + `node dist/node.js` |

---

## Branding and IP

- [ ] **No Solo Leveling IP strings** in source, copy, commit messages, or `public/`.
- [ ] Forbidden (from design §19 / `FORBIDDEN.txt`): `Solo Leveling`, `SoloLeveling`, `Sololeveling`, `Sung Jin`, `Jin-Woo`, `Jinwoo`, `Igris`, `Shadow Monarch`, `Hunter Association` as a proper mark, official screenshots, OST rips.
- [ ] CI grep is the mitigation. Manual review is **not** sufficient by itself.
- [ ] Package / repo / npm name is **`arise`**, never `SololevelingApp`.
- [ ] In-app chrome says **SYSTEM**. Product name is Arise. Titles use **Sovereign**, not any licensed epithet.
- [ ] README may say **once**: “System-window fantasy layer inspired by hunter-system fiction.” No affiliation claim.

---

## Scope — v1 only

- [ ] **No scope creep into v1.1 or v2.** If it is listed below, it does not ship in a v1 PR.

**v1.1 — do not implement now**

- Web Push / VAPID / iOS push education / `push` event in `sw.ts` / `push_subscriptions` / `push_log` / hourly notify (PR **18b**)
- Apple Health `export.zip` / XML parse
- Habit-learning auto-regenerate (v1 may only set `suggestRegenerate: true` and show a button)
- Catalog beyond the **16** template ids in Appendix A
- Encrypted IndexedDB / encrypted backup product work

**v2 / non-goals — do not implement now**

- Native stores, Capacitor, HealthKit live, Health Connect live
- Web Bluetooth (not even as “live HR theater”)
- LLM planner (`FEATURE_LLM_PLANNER` does not exist until v2)
- Social / PvP, diet macros, i18n, light theme, ads, subscriptions
- Magic link
- Cloudflare Free as an API host; Pages + Worker dual origin
- **Workers Paid / public cloud URL / custom domain / Caddy TLS** — later option (§16.3) only; **not** a v1 deliverable; must not block PR 20

**v1 constants that must not be “simplified”**

- Invite-only: `REGISTER_INVITE_CODE` **required**, fail-closed (`503 INVITE_UNCONFIGURED`)
- Age **16+** at register, **zero rows** if under 16 (`400 AGE_RESTRICTED`)
- CSV **≤ 256 KB** (`size > 262144` rejected), **≤ 200** rows
- Ranks **E–S**; stats key **`intl`**
- Partial completion `effort: "full" | "partial"`; partial = **50%** XP
- No Web Push
- `GET /me/today` never writes; issuance is `POST /me/today/ensure`

---

## Product honesty

- [ ] v1 launch path remains **`docker compose up --build`** on localhost / the operator’s machine (`http://localhost:8080`).
- [ ] `pnpm dev` + Vite `/api` proxy is the engineer path, not a second production topology.
- [ ] No claiming Cloudflare Free or `*.pages.dev` is a working auth host.
- [ ] No calorie numbers. Fat-loss copy talks steps / sleep / consistency.
- [ ] Pregnancy is a hard stop. Penalty quests stay easy (`penalty_easy_walk`, `rpeMax <= 4`, `estimatedMinutes <= 20`).

---

## Reviewer checklist (paste into the PR)

```text
- [ ] Started from pull of origin/main + feature branch (not main)
- [ ] Committed and pushed to GitHub before review
- [ ] Typecheck green
- [ ] Tests for this PR green (goldens / status codes / file paths cited in the story)
- [ ] Forbidden-string grep green (no Solo Leveling IP)
- [ ] No v1.1/v2 scope (push, Bluetooth, Apple XML, LLM, social, Workers Paid, Caddy, custom domain)
- [ ] Peer review PASS
- [ ] After PASS, merge pushed to origin/main
- [ ] Package name arise; chrome SYSTEM; intl not int
```
