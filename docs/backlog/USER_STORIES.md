# Arise v1 — User Stories

Implementation contract: [`docs/design.md`](../design.md) revision 4 (accepted 2026-08-14).  
Package / repo name: **`arise`**. In-app chrome: **SYSTEM**. Language: English.

This backlog maps **every v1 PR** (01–20, including 13.1) plus Sprint 4 SRE CI / merge-gate stories (**ARISE-023**, **ARISE-024**, **ARISE-025**). **PR 18b is not a v1 story.** v1.1 / v2 / Workers Paid / Caddy TLS live in [Later](#later-not-v1).

Assignees:

- **Dev A** (domain / engine / API): PR 03, 04, 06a, 06b, 08, 09, 10, 11, 12
- **Dev B** (scaffold / CI / docker / health adapters / web / PWA / e2e / launch): PR 01, 02, 05, 07, 13, 13.1, 14, 15, 16, 17, 18a, 19, 20
- **SRE** (git CI + merge gates; **not** Cloudflare `deploy.yml` / Workers / Caddy): ARISE-023, ARISE-024, ARISE-025

Story points are Fibonacci **1–8**. **8 is used only for PR 06b, 08, 10, and 14.**

Team Definition of Done: [`DEFINITION_OF_DONE.md`](./DEFINITION_OF_DONE.md). Sprint board: [`SPRINT_BOARD.md`](./SPRINT_BOARD.md). Git: [`docs/dev/GIT_WORKFLOW.md`](../dev/GIT_WORKFLOW.md) — pull `main`, feature branch, commit, **push to GitHub** on every story.

---

## Index

| ID | Title | PR | Sprint | Assignee | Pts |
| --- | --- | --- | --- | --- | --- |
| [ARISE-001](#arise-001--scaffold-the-arise-monorepo) | Scaffold the arise monorepo | 01 | 1 | Dev B | 3 |
| [ARISE-002](#arise-002--ci-lint-typecheck-test-and-forbidden-string-grep) | CI lint, typecheck, test, and forbidden-string grep | 02 | 1 | Dev B | 2 |
| [ARISE-003](#arise-003--domain-zod-types-for-player-goal-quest-health-plan-effects) | Domain Zod types for player, goal, quest, health, plan, effects | 03 | 1 | Dev A | 3 |
| [ARISE-004](#arise-004--drizzle-schema-migrate-and-atomic-wrapper) | Drizzle schema, migrate, and atomic() wrapper | 04 | 2 | Dev A | 5 |
| [ARISE-005](#arise-005--env-example-and-dockerfiles-no-fake-health-app) | .env.example and Dockerfiles (no fake /health app) | 05 | 1 | Dev B | 2 |
| [ARISE-006](#arise-006--engine-xp-rank-recovery-baselines-safety-and-effect-helpers) | Engine XP, rank, recovery, safety, and effect helpers | 06a | 2 | Dev A | 5 |
| [ARISE-007](#arise-007--16-template-catalog-scorer-issuer-and-planner) | 16-template catalog, scorer, issuer, and planner | 06b | 2 | Dev A | 8 |
| [ARISE-008](#arise-008--normalize-health-samples-manual--small-csv-and-unavailable-stubs) | Normalize health samples, manual + small CSV, and unavailable stubs | 07 | 2 | Dev B | 5 |
| [ARISE-009](#arise-009--hono-node-api-better-auth-username--scrypt-and-workers-free-spike) | Hono Node API, Better Auth username + scrypt, and Workers Free spike | 08 | 3 | Dev A | 8 |
| [ARISE-010](#arise-010--onboarding-plan-previewregenerate-pregnancy-and-loss-rate-gates) | Onboarding, plan preview/regenerate, pregnancy and loss-rate gates | 09 | 3 | Dev A | 5 |
| [ARISE-011](#arise-011--issue-todays-quests-complete-skip-and-lazy-fail) | Issue today’s quests, complete, skip, and lazy fail | 10 | 3 | Dev A | 8 |
| [ARISE-012](#arise-012--health-ingest-consent-daily-summaries-and-retain-job) | Health ingest, consent, daily summaries, and retain job | 11 | 4 | Dev A | 5 |
| [ARISE-013](#arise-013--progress-json-export-account-delete-and-reset-password-cli) | Progress, JSON export, account delete, and reset-password CLI | 12 | 4 | Dev A | 5 |
| [ARISE-014](#arise-014--vite-web-shell-with-proxy-login-and-register) | Vite web shell with proxy, login, and register | 13 | 4 | Dev B | 5 |
| [ARISE-015](#arise-015--settings-units-logout-delete-and-export-download) | Settings: units, logout, delete, and export download | 13.1 | 4 | Dev B | 3 |
| [ARISE-016](#arise-016--system-window-panels-quest-cards-rank-up-and-disclaimer) | SYSTEM window: panels, quest cards, rank-up, and disclaimer | 14 | 5 | Dev B | 8 |
| [ARISE-017](#arise-017--six-step-onboarding-wizard-and-plan-preview) | Six-step onboarding wizard and plan preview | 15 | 5 | Dev B | 5 |
| [ARISE-018](#arise-018--manual-health-entry-and-csv-importer-ui) | Manual health entry and CSV importer UI | 16 | 5 | Dev B | 3 |
| [ARISE-019](#arise-019--progress-ui-for-xp-stats-and-rank-history) | Progress UI for XP, stats, and rank history | 17 | 5 | Dev B | 3 |
| [ARISE-020](#arise-020--pwa-install-service-worker-and-indexeddb-outbox-no-web-push) | PWA install, service worker, and IndexedDB outbox (no Web Push) | 18a | 5 | Dev B | 5 |
| [ARISE-021](#arise-021--playwright-happy-path-register-onboard-ensure-complete) | Playwright happy path: register, onboard, ensure, complete | 19 | 6 | Dev B | 5 |
| [ARISE-022](#arise-022--docker-compose-up---build-is-the-v1-launch-path) | docker compose up --build is the v1 launch path | 20 | 6 | Dev B | 5 |
| [ARISE-023](#arise-023--harden-github-actions-ci-for-prs-and-main) | Harden GitHub Actions CI for PRs and main | — | 4 | SRE | 3 |
| [ARISE-024](#arise-024--merge-gates-for-main) | Merge gates for main | — | 4 | SRE | 2 |
| [ARISE-025](#arise-025--document-required-github-check-context-as-ci) | Document required GitHub check context as `ci` | — | 4 | SRE | 1 |

**v1 product (PRs 01–20): 22 stories, 106 points.** **SRE ops (Sprint 4): 3 stories, 6 points.** **Board total: 25 stories, 112 points.**

---

## ARISE-001 — Scaffold the arise monorepo

| Field | Value |
| --- | --- |
| **ID** | ARISE-001 |
| **Title** | Scaffold the arise monorepo |
| **Persona** | Engineer |
| **Description** | As an Engineer, I want the git root and npm package initialized as `arise` with pnpm 9 + Turborepo workspaces, so that every later PR lands in the contracted tree and we never publish `SololevelingApp`. |
| **Mapped PR** | **01** — `chore: scaffold arise monorepo (pnpm, turbo, FORBIDDEN.txt)` |
| **Sprint** | Sprint 1 (Ready) |
| **Assignee** | **Dev B** |
| **Story points** | 3 |
| **Dependencies** | None |

### Acceptance criteria

- [ ] Git root and npm `package.json` `"name": "arise"`, `"private": true`, `"packageManager": "pnpm@9"` (design: pnpm 9 + Turborepo; do not publish or push a GitHub repo named `SololevelingApp`).
- [ ] These files exist at the repo root: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `.npmrc`, `.gitignore`, `LICENSE` (MIT), `README.md`, `FORBIDDEN.txt`.
- [ ] `packages/config/` exists with `eslint.config.js`, `tsconfig.react.json`, `tsconfig.lib.json`.
- [ ] `pnpm -r` works (workspaces resolve).
- [ ] README states Compose is the **$0 host** / v1 launch path (`docker compose up --build` on localhost).
- [ ] README includes the folder-rename note: rename the working folder if it is still `SololevelingApp`.
- [ ] README may say **once**: “System-window fantasy layer inspired by hunter-system fiction.” No affiliation claim.
- [ ] `FORBIDDEN.txt` is the grep list for CI (PR 02). Forbidden strings include: `Solo Leveling`, `SoloLeveling`, `Sololeveling`, `Sung Jin`, `Jin-Woo`, `Jinwoo`, `Igris`, `Shadow Monarch`, `Hunter Association` as a proper mark.
- [ ] No `infra/cloudflare/wrangler.toml`. No Bluetooth / Apple export files. No `push/` directory. No `deploy.yml` as a v1 deliverable.
- [ ] In-app chrome name is not introduced here as Solo Leveling; product name is Arise.

### Definition of Done

- [ ] Team DoD in [`DEFINITION_OF_DONE.md`](./DEFINITION_OF_DONE.md) is met.
- [ ] Peer review **PASS** before merge.
- [ ] Independently reviewable; no engine/API/UI scope.

---

## ARISE-002 — CI lint, typecheck, test, and forbidden-string grep

| Field | Value |
| --- | --- |
| **ID** | ARISE-002 |
| **Title** | CI lint, typecheck, test, and forbidden-string grep |
| **Persona** | Engineer |
| **Description** | As an Engineer, I want GitHub Actions to lint, typecheck, test, and fail the build on forbidden IP strings, so that Solo Leveling marks cannot land in the repo. |
| **Mapped PR** | **02** — `ci: lint, typecheck, test, forbidden-string grep` |
| **Sprint** | Sprint 1 (Ready) |
| **Assignee** | **Dev B** |
| **Story points** | 2 |
| **Dependencies** | ARISE-001 |

### Acceptance criteria

- [ ] File exists: `.github/workflows/ci.yml`.
- [ ] CI runs lint, typecheck, and test.
- [ ] CI forbidden-string grep is **required** and fails the build: `rg -i -f FORBIDDEN.txt --glob '!grok-design*' --glob '!.git/**'`.
- [ ] Manual review is **not** the IP mitigation.
- [ ] `.github/workflows/deploy.yml` is **not** added as a v1 deliverable (later option only).
- [ ] Forbidden in repo, copy, commit messages, and `public/`: `Solo Leveling`, `SoloLeveling`, `Sololeveling`, `Sung Jin`, `Jin-Woo`, `Jinwoo`, `Igris`, `Shadow Monarch`, `Hunter Association` as a proper mark, official screenshots, OST rips.

### Definition of Done

- [ ] Team DoD met; CI workflow itself is the test surface.
- [ ] Peer review **PASS** before merge.

---

## ARISE-003 — Domain Zod types for player, goal, quest, health, plan, effects

| Field | Value |
| --- | --- |
| **ID** | ARISE-003 |
| **Title** | Domain Zod types for player, goal, quest, health, plan, effects |
| **Persona** | Engineer |
| **Description** | As an Engineer, I want shared Zod/TS types from design §9.1 and the API bodies, so that engine, db, health, and API cannot drift on `intl`, ranks, or illegal prescriptions. |
| **Mapped PR** | **03** — `feat(domain): Zod types for player, goal, quest, health, plan, effects` |
| **Sprint** | Sprint 1 (Ready) |
| **Assignee** | **Dev A** |
| **Story points** | 3 |
| **Dependencies** | ARISE-001 |

### Acceptance criteria

- [ ] Files: `packages/domain/src/{index,ids,player,goal,quest,plan,health,api,effects}.ts`.
- [ ] `Rank = "E" | "D" | "C" | "B" | "A" | "S"`.
- [ ] `PlayerStats` keys are `str`, `agi`, `vit`, **`intl`**, `sta`. **`intl` not `int`** in JSON, SQL-facing types, and TS. `STAT_KEYS = ["str", "agi", "vit", "intl", "sta"]`.
- [ ] `DEFAULT_STATS = { str: 10, agi: 10, vit: 10, intl: 10, sta: 10 }`.
- [ ] `GoalType` = `"fat_loss" | "muscle_gain" | "recomposition" | "endurance" | "general_fitness" | "mobility"`.
- [ ] `GOAL_STAT_WEIGHTS` matches design §9.1 exactly (fat_loss sta 1.4; muscle_gain str 1.6; mobility vit 1.8; etc.).
- [ ] `QuestKind` = `"strength" | "cardio" | "steps" | "mobility" | "skill" | "recovery" | "habit" | "penalty"`.
- [ ] `QuestStatus` = `"issued" | "completed" | "partial" | "skipped" | "failed" | "auto_completed"`.
- [ ] `Equipment` = `"none" | "bands" | "dumbbells" | "full_gym"`. There is **no** `outdoor` equipment value.
- [ ] Illegal prescriptions are rejected by Zod (blocks require `rpeMax`; `estimatedMinutes`; `intensity` ∈ `"rest" | "easy" | "moderate" | "hard"`).
- [ ] `RegisterBody` is exactly:

  ```ts
  export const RegisterBody = z.object({
    email: z.string().email(),          // required
    password: z.string().min(10),
    name: z.string().min(1).max(80),
    username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/).optional(),
    age: z.number().int(),
    inviteCode: z.string().optional(),
    acceptedMedicalDisclaimer: z.literal(true),
  });
  ```

- [ ] `OnboardingBody` matches design API section (PAR-Q booleans, `profile.age` `.int().min(16).max(100)`, goal types, `habit.experience` 0\|1\|2\|3, equipment enum min 1, week ISO weekday 1–7, minutes 0–180).
- [ ] `HealthSource` includes `"manual" | "csv" | "apple_export" | "web_bluetooth" | "health_connect" | "healthkit"`.
- [ ] `HealthMetric` includes `"steps" | "heart_rate" | "resting_hr" | "hrv" | "sleep_minutes" | "weight_kg" | "active_minutes" | "soreness" | "sleep_quality"`.
- [ ] `EffectKind` = `"pain_no_hard" | "illness_rest" | "caution_volume"`.
- [ ] `DailyQuest.idempotencyKey` documented as `` `${userId}:${localDate}:${templateId}` ``.
- [ ] No `FEATURE_LLM_PLANNER`. No social types. No push subscription types.

### Definition of Done

- [ ] Team DoD met.
- [ ] Domain package typechecks under TypeScript 5.x strict.
- [ ] Peer review **PASS** before merge.

---

## ARISE-004 — Drizzle schema, migrate, and atomic() wrapper

| Field | Value |
| --- | --- |
| **ID** | ARISE-004 |
| **Title** | Drizzle schema, migrate, and atomic() wrapper |
| **Persona** | Engineer |
| **Description** | As an Engineer, I want the SQLite/Drizzle schema and a dual-runtime `atomic()` wrapper, so that issuance can batch on D1 and transaction on Node without orphan ledger rows. |
| **Mapped PR** | **04** — `feat(db): drizzle schema, migrate, atomic() wrapper` |
| **Sprint** | Sprint 2 (Planned) |
| **Assignee** | **Dev A** |
| **Story points** | 5 |
| **Dependencies** | ARISE-003 |

### Acceptance criteria

- [ ] Files: `packages/db/{drizzle.config.ts,src/schema.ts,src/client.ts,src/tx.ts,src/migrate.ts,drizzle/0001_init.sql}`.
- [ ] Better Auth tables use library defaults: `user`, `session`, `account`, `verification`, plus username-plugin columns on `user`. Application FKs reference **`user.id`**. There is **no** `users` table and no `users` view.
- [ ] XP lives only on `profiles` (`level` default 1, `xp` default 0). Never `users.xp`.
- [ ] `profiles` columns match Data Model: `user_id`, `age`, `sex`, `height_cm`, `weight_kg`, `units`, `time_zone`, `level`, `xp`, `rank`, `title`, `stats_json` (key `intl`), `streak_days`, `best_streak_days`, `penalty_points_30d`, `parq_clear`, `accepted_disclaimer_at`, `health_consent_at`, `onboarding_status` (`pending` \| `complete` \| `blocked_pregnancy`), `last_ensured_local_date`, `created_at`, `updated_at`.
- [ ] `habit_profiles` has **no** `learned_rest_weekdays_json` in v1.
- [ ] `plan_days` includes **`is_gate`**. Unique `(plan_id, local_date)`. Index `(user_id, local_date)`.
- [ ] `quest_templates` table may exist **empty**. **v1 does not read it.**
- [ ] `daily_quests` includes `modifiers_applied_json` default `[]`, **`skip_reason` text NULL** (scalar; compare with `= 'busy'`; do not `json_extract` it), `idempotency_key UNIQUE`.
- [ ] `issuance_ledger` PK `(user_id, local_date)`.
- [ ] `daily_summaries` includes `soreness`, `sleep_quality`, `hard_bouts`. **No `zone2_minutes` in v1.**
- [ ] `auth_rl(key TEXT PRIMARY KEY, value TEXT NOT NULL, expires_at INTEGER NOT NULL)` is created so migrations match Node and Worker.
- [ ] **Not created in v1:** `push_subscriptions`, `push_log`.
- [ ] `atomic()` in `packages/db/src/tx.ts` uses D1 `batch()` when `db.kind === "d1"` and better-sqlite3 `transaction()` on Node. **Never** copy `BEGIN; INSERT ledger; INSERT quests; COMMIT;` into Worker code.
- [ ] **Contract test:** mock `batch` reject; assert `SELECT COUNT(*) FROM issuance_ledger` is **0**.
- [ ] ULID text ids. ISO timestamps UTC. `local_date` `YYYY-MM-DD`. Booleans 0/1.
- [ ] Forward-only Drizzle SQL. Adding columns uses `DEFAULT` (example: `is_gate` DEFAULT 0). Never `DROP COLUMN` in the same release.

### Definition of Done

- [ ] Team DoD met.
- [ ] `packages/db` contract test for mocked batch throw ⇒ 0 ledger rows is green.
- [ ] Peer review **PASS** before merge.

---

## ARISE-005 — .env.example and Dockerfiles (no fake /health app)

| Field | Value |
| --- | --- |
| **ID** | ARISE-005 |
| **Title** | .env.example and Dockerfiles (no fake /health app) |
| **Persona** | Operator |
| **Description** | As an Operator, I want the Compose files, Dockerfile, backup scripts, and `.env.example` checked in now, so that the $0 localhost launch path is documented even before the API can boot. |
| **Mapped PR** | **05** — `chore: .env.example and Dockerfiles (no fake /health app)` |
| **Sprint** | Sprint 1 (Ready) |
| **Assignee** | **Dev B** |
| **Story points** | 2 |
| **Dependencies** | ARISE-001 |

### Acceptance criteria

- [ ] Files: `.env.example`, `infra/docker/api.Dockerfile`, `infra/docker/entrypoint.sh`, `infra/scripts/backup-sqlite.sh`, `infra/scripts/restore-d1-to-sqlite.sh`, `docker-compose.yml`, `infra/docker/README.md`.
- [ ] **No stub API.** Compose `up` **may fail until PR 08** — that is documented in `infra/docker/README.md`.
- [ ] **One file, one service.** There is no `web` service, no `webdist` volume, no Caddy in `docker-compose.yml`.
- [ ] There is **no** `infra/docker/web.Dockerfile`, **no** `Caddyfile`, and **no** `Caddyfile.http` in v1.
- [ ] `.env.example` contains exactly the contracted keys (design §17):

  ```bash
  RUNTIME=node                          # node | worker
  SERVE_STATIC=false                    # true in compose image
  APP_ORIGIN=http://localhost:5173
  BETTER_AUTH_URL=http://localhost:5173
  BETTER_AUTH_SECRET=                   # openssl rand -base64 32
  DATABASE_PATH=./data/arise.sqlite
  LOG_LEVEL=info
  PORT=8787

  REGISTER_INVITE_CODE=                 # REQUIRED in v1; empty = register fail-closed
  ALLOW_WORKER_PASSWORD_AUTH=false      # later option only (Workers Paid); leave false

  SMTP_URL=
  SMTP_FROM=

  # retention
  HEALTH_SAMPLE_RETENTION_DAYS=30
  AUDIT_RETENTION_DAYS=90
  MAX_IMPORT_SAMPLES_PER_DAY=5000

  FEATURE_WEB_BLUETOOTH=false           # unused in v1; do not set true
  FEATURE_PUSH=false                    # unused in v1
  ```

- [ ] No `FEATURE_SOCIAL`. No VAPID keys in v1.
- [ ] `docker-compose.yml` maps `"8080:8787"`, volume `arise-data:/data`, `DATABASE_PATH: /data/arise.sqlite`, `SERVE_STATIC: "true"`, `RUNTIME: node`, healthcheck `wget -qO- http://127.0.0.1:8787/health`.
- [ ] `infra/docker/api.Dockerfile` matches design §16.2 (Node 22, `pnpm@9.15.0`, `pnpm --filter api deploy --prod /out/api`, copy web dist to `/out/web`, user `arise` uid 10001, `HEALTHCHECK` on `/health`).
- [ ] `backup-sqlite.sh` uses `sqlite3 "$DB" ".timeout 5000" ".backup '$OUT'"` and deletes backups `-mtime +14`.
- [ ] No `wrangler.toml` / `deploy.yml` / custom domain / Caddy TLS work in this PR.

### Definition of Done

- [ ] Team DoD met.
- [ ] Runbook states Compose may fail `up` until PR 08.
- [ ] Peer review **PASS** before merge.

---

## ARISE-006 — Engine XP, rank, recovery baselines, safety, and effect helpers

| Field | Value |
| --- | --- |
| **ID** | ARISE-006 |
| **Title** | Engine XP, rank, recovery baselines, safety, and effect helpers |
| **Persona** | Player |
| **Description** | As a Player, I want closed-form XP, ranks E→S, recovery scoring, and safety helpers, so that growth and penalties stay deterministic and medically conservative. |
| **Mapped PR** | **06a** — `feat(engine): xp, rank, recovery baselines, safety, effect helpers` |
| **Sprint** | Sprint 2 (Planned) |
| **Assignee** | **Dev A** |
| **Story points** | 5 |
| **Dependencies** | ARISE-003 |

### Acceptance criteria

- [ ] Files: `packages/engine/src/{xp,rank,stats,recovery,safety}.ts` plus tests `packages/engine/src/__tests__/{xp,rank,safety,recovery}.test.ts` (as named in the repo tree / PR plan).
- [ ] Engine is **pure** (no I/O). Inject `now: Date` and `timeZone: string` where time is needed.
- [ ] `xpToNextLevel(level)` = `Math.round(100 * Math.pow(level, 1.35))`. Goldens **must** assert these exact integers:
  - `xpToNextLevel(1) === 100`
  - `xpToNextLevel(10) === 2239`
  - `xpToNextLevel(25) === 7713`
  - `xpToNextLevel(50) === 19661`
- [ ] `applyXp` / `xpAtLevelStart` / `scaleXp` match §9.7 (`scaleXp` = `Math.round(baseXp * Math.min(1.6, 1 + 0.02 * (level - 1)))`; level loop breaks at 200).
- [ ] Base XP constants: habit/recovery **20**, mobility **30**, steps **30**, cardio **45**, strength **55**, gate **90**, penalty complete **10**.
- [ ] Rank gates:

  | Rank | Level | Extra |
  | --- | --- | --- |
  | E | 1–9 | — |
  | D | 10–19 | — |
  | C | 20–34 | — |
  | B | 35–49 | 14-day completion rate ≥ 0.50 |
  | A | 50–74 | 30-day completion rate ≥ 0.60 |
  | S | ≥ 75 | 30-day rate ≥ 0.70 **and** `penaltyPoints30d < 8` |

- [ ] Titles: E Initiate, D Adept, C Operative, B Veteran, A Elite, S Sovereign. Titles use Sovereign, not any licensed epithet.
- [ ] Completion rate = (days with all required quests completed|partial|auto) / (days that had at least one required quest). Days with only `rest_planned` skips are excluded from the denominator.
- [ ] If rank was `S` and gates fail → write `A` and `rank_events` row `reason=destabilized` (helper exists; API paths wire it in PR 10).
- [ ] `median` / `baseline` / `computeRecovery` match §9.4. Baseline needs **≥ 5** samples; else component is **neutral**. Input newest-first, length 0–14. Missing days omitted (not zero-filled). Cold start uses neutral components (`sleep` defaults via `sleepAvg ?? 420`, restHr/hrv 15 if missing, subjective 10 if missing).
- [ ] Hard-day cap table:

  | `experience` | max hard days in any rolling 7 local dates | min rest/easy days |
  | --- | --- | --- |
  | 0–1 | 4 | 1 |
  | 2–3 | 5 | 1 |

- [ ] Implied fat-loss helper: if `type==fat_loss` and both targets set and `weeks = days(targetDate-today)/7 > 0` and `(weightKg - targetWeightKg) / weeks > 0.01 * weightKg` → unsafe (`UNSAFE_LOSS_RATE`). Tests: implied loss reject.
- [ ] Safety module (`packages/engine/src/safety.ts`) encodes: pregnancy hard-stop; other PAR-Q yes → easy whitelist; pain → `pain_no_hard` 24 h; 2 consecutive illness days → `illness_rest` next local day; 3 consecutive fail days → `caution_volume` 2 local days, `volumeMul=0.7`; penalty `rpeMax <= 4`.
- [ ] Copy helper: no calorie numbers; fat-loss talks steps/sleep/consistency.
- [ ] Stat tick helper: `newStat = min(old + tick, old_at_local_midnight + 1.0)` per key.

### Definition of Done

- [ ] Team DoD met.
- [ ] Vitest goldens for XP integers, rank gates, recovery neutrals, implied loss reject, penalty RPE clamp.
- [ ] Peer review **PASS** before merge.

---

## ARISE-007 — 16-template catalog, scorer, issuer, and planner

| Field | Value |
| --- | --- |
| **ID** | ARISE-007 |
| **Title** | 16-template catalog, scorer, issuer, and planner |
| **Persona** | Player |
| **Description** | As a Player, I want a rule-based weekly plan and daily quests from exactly 16 in-code templates, so that today is prescribed without an LLM or CMS. |
| **Mapped PR** | **06b** — `feat(engine): 16-template catalog, scorer, issuer, planner` |
| **Sprint** | Sprint 2 (Planned) |
| **Assignee** | **Dev A** |
| **Story points** | 8 |
| **Dependencies** | ARISE-006 |

### Acceptance criteria

- [ ] Files: `packages/engine/src/{scorer,issuer,planner,penalties,modifiers,templates}/**` + tests `{issuer,scorer,penalties,planner,modifiers}.test.ts`.
- [ ] Catalog is **only** `packages/engine/src/templates/catalog.ts`. v1 does **not** read `quest_templates`.
- [ ] These **16** ids are the only templates. There is **no** `habit_log_weight`:
  1. `str_sit_to_stand_l0`
  2. `str_incline_push_l0`
  3. `str_backpack_row_l0`
  4. `str_hip_hinge_l0`
  5. `str_goblet_squat_l1`
  6. `str_band_row_l1`
  7. `str_gym_full_body_l2`
  8. `cardio_zone2_walk`
  9. `steps_6k`
  10. `steps_8k`
  11. `mob_hip_unload`
  12. `mob_tspine`
  13. `rec_nasal_breath`
  14. `rec_full_rest`
  15. `habit_sleep_window`
  16. `penalty_easy_walk`
- [ ] Appendix A fields are implemented including `statDelta` / `goalTags` / `build()` defaults. Goblet: `statDelta = { str: 0.35, vit: 0.14 }`, `goalTags` includes `muscle_gain` **not** `mobility`.
- [ ] Contraindications: sit-to-stand + goblet → `knee`; incline push → `shoulder`,`wrist`; hip hinge → `spine`; others `[]`. `mob_hip_unload` is OK with `knee`.
- [ ] `requiredAll` is `[]` for every v1 row. Walks and mobility use `requiredAny: ["none"]`.
- [ ] `build()`: `sets' = max(1, round(sets * volumeMul * (recoveryScore < 55 ? 0.75 : 1)))`. Beginner (`experience <= 1`) clamps every block `rpeMax <= 7`. Penalty clamps `rpeMax <= 4`.
- [ ] Scorer goldens in `scorer.test.ts` (must appear):

  | Case | Expected |
  | --- | --- |
  | `str_goblet_squat_l1` vs `muscle_gain`, empty history, remaining 40, recovery 80 | **`score === 80`** and eligible (`goalAlignment === 55`, others 100/100/100/80) |
  | same vs `mobility` goal | `goalAlignment === 100 * (0.35*0.5 + 0.14*1.8) / 1.76` ≈ **24.261** (lower than 55 by ≥ 10) |
  | `freshness` idx 0 | 30 |
  | `freshness` absent | 100 |
  | `timeFit(25, 20)` | 0 (ineligible) |
  | `timeFit(25, 22)` | 60 |
  | `recoveryFit("hard", 69)` | 0 |
  | `recoveryFit("hard", 70)` | 70 |

- [ ] Goblet golden (exact): `goalAlignment(str_goblet_squat_l1, muscle_gain)` = `100 * (0.35*1.6 + 0.14*0.8) / 1.68 + 15` = `40 + 15` = **55**. `scoreTemplate` with empty history, remaining 40, recovery 80 = `0.40*55 + 0.20*100 + 0.15*100 + 0.15*100 + 0.10*80` = **80**.
- [ ] Ineligible before scoring if: `equipmentOk` false; any `contraindicationKeys` ∈ user injuries; `minExperience > habit.experience`; `timeFit` 0; `recoveryFit` 0; `intensity === "hard"` and (`!planDay.hardAllowed` or active `pain_no_hard` or `illness_rest`); `parqClear === false` and `kind` ∉ `{recovery, mobility, habit, steps}`; `parqClear === false` and `intensity` ∉ `{rest, easy}`.
- [ ] Tests: knee filter, PAR-Q whitelist.
- [ ] Non-rest slots in order: Primary strength (if `hardAllowed` and not `illness_rest`); Locomotion `steps` or `cardio`; Vitality `mobility`; Habit `habit` or `recovery`; Gate if `planDay.isGate` and recovery ≥ 60 and remaining ≥ 20.
- [ ] Rest / `illness_rest` / `recoveryScore < 35` / `forceRest` from PAR-Q: `rec_full_rest` or `cardio_zone2_walk` (easy); one mobility; `habit_sleep_window`; no strength, no hard, no gate.
- [ ] Empty-day fallback: if the day would have **zero** quests, emit exactly two templates: `habit_sleep_window` and `cardio_zone2_walk` built with `budgetMinutes = 10` (walk `estimatedMinutes` becomes 10; sleep stays 0). Unit test: a 0-eligible pool still inserts those two `template_id`s, **in that order**, and no others. Never persist an empty `daily_quests` set after a successful ensure.
- [ ] Gate day (`buildWeeklyPlan`): among `plan_days` with `budgetMinutes >= 40` and `hardAllowed` and not rest, set `isGate = true` on the **latest localDate**. If none qualify, no gate that week.
- [ ] Focus skeletons applied in order to available days only; unused weekdays are `rest`:

  | Goal | Skeleton |
  | --- | --- |
  | muscle_gain | full_body, full_body, full_body (exp≥2 and ≥4 days: push, pull, legs, full_body) |
  | fat_loss | mixed, cardio, mixed, cardio, mixed |
  | recomposition | full_body, cardio, full_body, cardio, full_body |
  | endurance | cardio, cardio, mixed, cardio |
  | general_fitness | full_body, cardio, mobility, full_body, cardio |
  | mobility | mobility, cardio, mobility, mobility |

- [ ] If fewer than 2 available days: both `full_body`, `hardAllowed=false` if budget &lt; 30.
- [ ] `hardAllowed` = budget ≥ 25 and focus ∉ {rest, mobility, cardio} unless endurance moderate day (planner sets `hardAllowed=false` for cardio-only days).
- [ ] Catch-up unit tests for a **3-day gap**. Unissued absences are not fails. Catch-up does **not** insert quests for caught-up dates. Open interval longer than **14** days keeps only the **14 most recent** dates.
- [ ] Penalty quest: always `penalty_easy_walk`, `rpeMax <= 4`, `estimatedMinutes <= 20`, `source: "penalty"`. Completing it grants 10 XP and does not farm rank. Test: penalty RPE.
- [ ] Skip/fail helpers: skip `illness` with an illness skip already yesterday → `illness_rest` covering **tomorrow 00:00–24:00 local**; skip `pain` → `pain_no_hard` for 24 h from `now`; 3rd `busy` skip in the ISO week (Mon–Sun, user tz) → **do not store skipped**; store `failed` instead. Test: busy-3rd=fail.
- [ ] Last 3 local dates each contain ≥ 1 `failed` required quest → insert `caution_volume` for **2 local days** (`volumeMul = 0.7`).
- [ ] `planModifiers`: steps ≥ predicate → `auto_steps` / `auto_completed`; steps ≥ 0.6× and &lt; full → `steps_residual` residual steps, `rpeMax: 3`; `habit_sleep_window` + sleepMinutes 360–540 → `auto_sleep`. Re-running must not shrink twice (modifier idempotency tests).
- [ ] Low sleep (`sleepMinutes < 300` yesterday) does **not** invent a new modifier key.
- [ ] 7-day completion &lt; 30%: if ≥ 7 dated days and completed-or-partial / issued-or-failed &lt; 0.30, set `suggestRegenerate: true`. **Do not auto-regenerate in v1.**
- [ ] `FEATURE_LLM_PLANNER` does not exist.

### Definition of Done

- [ ] Team DoD met.
- [ ] Vitest covers scoring goldens including **`score === 80`**, empty-day fallback, catch-up 3-day gap, modifier idempotency, knee/PAR-Q, penalty RPE, busy-3rd=fail.
- [ ] Peer review **PASS** before merge. Chrome (PR 14) cannot merge before this engine.

---

## ARISE-008 — Normalize health samples, manual + small CSV, and unavailable stubs

| Field | Value |
| --- | --- |
| **ID** | ARISE-008 |
| **Title** | Normalize health samples, manual + small CSV, and unavailable stubs |
| **Persona** | Player |
| **Description** | As a Player, I want manual entry and a small CSV template normalized into health samples, so that step/sleep quests can auto-complete without native HealthKit or Apple XML. |
| **Mapped PR** | **07** — `feat(health): normalize, aggregates, manual + small CSV, stubs` |
| **Sprint** | Sprint 2 (Planned) |
| **Assignee** | **Dev B** |
| **Story points** | 5 |
| **Dependencies** | ARISE-003 |

### Acceptance criteria

- [ ] Files: `packages/health/src/{index,normalize,aggregates,adapters/manual.ts,adapters/csv.ts,adapters/stubs.ts}` and `packages/health/src/__tests__/{normalize,csv}.test.ts`.
- [ ] CSV ≤ **256 KB**, ≤ **200** rows. Client-side contract: reject file `size > 262144` or `rows > 200` **before** parse.
- [ ] Parse is `split(/\r?\n/)` + Zod; **no XML, no zip**.
- [ ] CSV header:

  ```
  metric,value,unit,startAt,endAt
  steps,8421,count,2026-08-14T00:00:00.000Z,2026-08-14T20:00:00.000Z
  sleep_minutes,410,min,2026-08-13T22:00:00.000Z,2026-08-14T06:50:00.000Z
  weight_kg,72.4,kg,2026-08-14T07:00:00.000Z,2026-08-14T07:00:00.000Z
  soreness,2,score,2026-08-14T07:00:00.000Z,2026-08-14T07:00:00.000Z
  sleep_quality,4,score,2026-08-14T07:00:00.000Z,2026-08-14T07:00:00.000Z
  ```

- [ ] Vitest: fixture **5** rows; reject **201st**; range drop.
- [ ] Dedup hash: `userId|source|metric|startAt|endAt|roundedValue`.
- [ ] Range drops: HR &lt; **30** or &gt; **230**; weight &lt; **25** or &gt; **400** kg; steps &gt; **120000** / sample; sleep &gt; **960** min; soreness/sleep_quality not in **1–5**.
- [ ] Stubs (`packages/health/src/adapters/stubs.ts`): `apple_export`, `web_bluetooth`, `health_connect`, `healthkit` all `throw Object.assign(new Error("unavailable_web"), { code: "UNAVAILABLE_WEB" })`.
- [ ] No large-file parse on client or server in v1. No Apple `export.zip` / XML. No Web Bluetooth ingest.

### Definition of Done

- [ ] Team DoD met.
- [ ] CSV adapter Vitest: fixture 5 rows; reject 201st; range drop.
- [ ] Peer review **PASS** before merge.

---

## ARISE-009 — Hono Node API, Better Auth username + scrypt, and Workers Free spike

| Field | Value |
| --- | --- |
| **ID** | ARISE-009 |
| **Title** | Hono Node API, Better Auth username + scrypt, and Workers Free spike |
| **Persona** | Player |
| **Description** | As a Player, I want invite-only email+password registration (age 16+) with a same-origin session cookie, so that I can sign in on Node/Compose without a Workers Free host. |
| **Mapped PR** | **08** — `feat(api): hono node entry, better-auth username+scrypt, vite-proxy origin` |
| **Sprint** | Sprint 3 (Planned) |
| **Assignee** | **Dev A** |
| **Story points** | 8 |
| **Dependencies** | ARISE-004, ARISE-005 |

### Acceptance criteria

- [ ] Files: `apps/api/src/{node,app,auth,env,middleware,routes/auth}.ts`, middleware `{auth,ready,timing,error}.ts`, `apps/api/README.md` (Free Worker spike results).
- [ ] `src/node.ts` is v1 production. `src/worker.ts` may exist so the same routes can be deployed to Workers Paid **later**; it is **not** the launch host.
- [ ] On boot (`src/node.ts`): `migrate()` then listen, then start `node-cron` (cron jobs themselves land in later PRs; boot hook may be a no-op until then).
- [ ] Better Auth `createAuth` implemented **exactly** as design §7: `appName: "Arise"`, `basePath: "/api/v1/auth"`, `emailAndPassword.enabled: true`, `minPasswordLength: 10`, **default hasher = scrypt** (do not override on Node), `session.expiresIn: 60 * 60 * 24 * 30`, `updateAge: 60 * 60 * 24`, `cookieCache: { enabled: true, maxAge: 60 * 5 }`, `rateLimit: { enabled: true, window: 60, max: 10 }`, `cookiePrefix: "arise"`, session cookie name **`arise.session`**, `httpOnly: true`, `sameSite: "lax"`, `secure` iff `appOrigin.startsWith("https")`, `path: "/"`, plugins `[username()]`.
- [ ] `user.email` remains required+unique. Do not set email optional. Username-only (no email) is **rejected** (`400 EMAIL_REQUIRED`).
- [ ] Sign-in identifier may be email **or** username.
- [ ] **`age` is required before insert.** If `age < 16`, return **`400 AGE_RESTRICTED`** and **write zero rows**.
- [ ] **`REGISTER_INVITE_CODE` is required in v1.** If the env var is missing or empty, register is **fail-closed** (`503 INVITE_UNCONFIGURED`). If set, sign-up must send a matching `inviteCode` or **`403 INVITE_REQUIRED`**.
- [ ] `acceptedMedicalDisclaimer` must be `true` or validation fails.
- [ ] On `RUNTIME=worker` without `ALLOW_WORKER_PASSWORD_AUTH=true`, sign-up/sign-in return **`501 AUTH_RUNTIME_UNSUPPORTED`**.
- [ ] **Required spike:** deploy sign-up/sign-in to a Free Worker, record the CPU abort, keep a note in `apps/api/README.md`. Do **not** leave that deploy as production. A weaker custom `password.hash` (PBKDF2-SHA-256) is **not** the default and is not scheduled.
- [ ] `GET /health` → `{ ok: true, runtime, version }` **no DB**. Rate limit **30/min/IP** in-process. Isolate-local; Compose uses `/health`.
- [ ] `GET /ready` → `{ ok: true, db: "ok" }` or 503. **1 `SELECT 1`**.
- [ ] CORS: in production there is no cross-origin. Do **not** set `SameSite=None`. Dev origin is Vite `:5173`.
- [ ] Response header on all API routes: `Server-Timing: app;dur=<ms>`. JSON log `{ ts, level, requestId, userId?, route, ms, cpuMs?, d1?, code?, msg }`. No PHI.
- [ ] Errors `{ "error": { "code", "message", "details?" } }`. JSON camelCase. Base `/api/v1`.
- [ ] Auth tests (`app.request`): 401 on protected routes; age 15 no row; invite fail-closed / mismatch.
- [ ] Password reset: `POST /api/v1/auth/forget-password` only if `SMTP_URL` is set; else **404**.
- [ ] Node rate limit is process memory. Do not also upsert `rate_limits` on login. `rate_limits` is for health ingest only.
- [ ] `secondaryStorage` required when `RUNTIME=worker` (D1 `auth_rl`); **omit on Node**.

### Definition of Done

- [ ] Team DoD met.
- [ ] Hono `app.request` tests: 401; age 15 no row; invite.
- [ ] Spike note committed in `apps/api/README.md`.
- [ ] Peer review **PASS** before merge.

---

## ARISE-010 — Onboarding, plan preview/regenerate, pregnancy and loss-rate gates

| Field | Value |
| --- | --- |
| **ID** | ARISE-010 |
| **Title** | Onboarding, plan preview/regenerate, pregnancy and loss-rate gates |
| **Persona** | Player |
| **Description** | As a Player, I want to submit PAR-Q, goal, schedule, and equipment and receive a 7-day plan, so that unsafe goals and pregnancy are blocked before any quest is issued. |
| **Mapped PR** | **09** — `feat(api): onboarding, plan preview/regenerate, pregnancy and loss-rate gates` |
| **Sprint** | Sprint 3 (Planned) |
| **Assignee** | **Dev A** |
| **Story points** | 5 |
| **Dependencies** | ARISE-007, ARISE-009 |

### Acceptance criteria

- [ ] Files: `apps/api/src/routes/onboarding.ts`, `apps/api/src/routes/plan.ts`.
- [ ] `PUT /onboarding` and `POST /plan/preview` share `OnboardingBody`. Preview writes **0** rows (`persist: false`).
- [ ] `PUT /onboarding` success **200** `{ plan, days, profile }` and `profiles.onboarding_status = 'complete'`. Query budget: ~8 inserts in one `atomic`.
- [ ] Disclaimer not true / Zod fail → **400** `VALIDATION`.
- [ ] Implied fat-loss &gt; 1% BW/week → **400** `UNSAFE_LOSS_RATE` + `details.maxKgPerWeek`.
- [ ] `parq.pregnancy === true` → **403** `{ "error": { "code": "PREGNANCY_HARD_STOP", "message": "Arise is not appropriate during pregnancy. See a clinician for prenatal exercise guidance." }, "actions": ["deleteAccount"] }`. Create/update `profiles` shell (`onboarding_status='blocked_pregnancy'`, age/tz from body or register), **no** goal/habit/plan.
- [ ] Age &lt; 16 (should already have been blocked at register) → **400** `AGE_RESTRICTED`.
- [ ] Other PAR-Q yeses → `parq_clear=false`, easy-only whitelist (no plan of hard work).
- [ ] `jobActivity` / `commuteWalkMinutes` / `sleepWindow` are **stored only, unused in v1 issuer**.
- [ ] `GET /plan` returns the active (non-archived) plan.
- [ ] `POST /plan/regenerate` `{ "reason": "schedule_change" }` increments version, archives old plan (`archived_at`), inserts new days. Does **not** rewrite historical `daily_quests`. If today’s quests are all still `issued`, delete them **and** the ledger row in one `tx`/`batch` so the next ensure re-issues.
- [ ] `GET /me/today` and `POST /me/today/ensure` when session exists (status table; today routes may 409 even if full today payload lands in PR 10):

  | Profile state | Status | Code |
  | --- | --- | --- |
  | no `profiles` row | 409 | `ONBOARDING_REQUIRED` `{ "needsOnboarding": true }` |
  | `onboarding_status = 'blocked_pregnancy'` | 409 | `PREGNANCY_HARD_STOP` (same actions) |
  | `onboarding_status` missing/`pending` | 409 | `ONBOARDING_REQUIRED` |
  | `complete` | 200 | System window |

- [ ] No v1 habit learning. Skip-pattern auto-regenerate is v1.1.

### Definition of Done

- [ ] Team DoD met.
- [ ] Tests: pregnancy hard-stop (no plan rows); implied loss reject; preview 0 writes.
- [ ] Peer review **PASS** before merge.

---

## ARISE-011 — Issue today’s quests, complete, skip, and lazy fail

| Field | Value |
| --- | --- |
| **ID** | ARISE-011 |
| **Title** | Issue today’s quests, complete, skip, and lazy fail |
| **Persona** | Player |
| **Description** | As a Player, I want `POST /me/today/ensure` to issue today’s quests and complete/partial/skip them, so that XP, ranks, streaks, and safe penalties update on the server at local midnight without a mutating GET. |
| **Mapped PR** | **10** — `feat(api): POST /me/today/ensure, complete/skip, lazy fail` |
| **Sprint** | Sprint 3 (Planned) |
| **Assignee** | **Dev A** |
| **Story points** | 8 |
| **Dependencies** | ARISE-007, ARISE-010 |

### Acceptance criteria

- [ ] Files: `apps/api/src/routes/today.ts`, `apps/api/src/routes/quests.ts`, `apps/api/src/jobs/evaluate-penalties.ts`.
- [ ] `GET /me/today?date=YYYY-MM-DD` is **read only**. Default today in user tz. Future → 400. **0 writes.** Success body shape matches design (player.level/xp/`xpToNext`/rank/title/stats with **`intl`**/streakDays/penaltyPoints30d, recoveryScore, recoveryParts, planDay, quests, pendingModifiers, suggestRegenerate, disclaimer).
- [ ] Disclaimer on every System window payload: `"Arise is not a medical device. Stop if you feel pain, chest pressure, or faintness."`
- [ ] If no ledger row for that date and date is today → `needsEnsure: true`, `quests: []`.
- [ ] `GET /me/today` may compute `planModifiers` in memory as `pendingModifiers` **without writing**.
- [ ] `POST /me/today/ensure` `{ "date"?: "YYYY-MM-DD" }` catch-up + issue **today only**. If `date` is present and ≠ local today → **`400 ENSURE_DATE_NOT_TODAY`**. Past/future issuance is not a client feature.
- [ ] Returns the today payload with `needsEnsure: false`.
- [ ] `Cache-Control: private, no-store` on both GET today and POST ensure. Disable HTTP prefetch.
- [ ] Ensure algorithm implements design §9.9 steps 1–7 (onboarding 409s; 1 bundle read; catch-up `[last, today)` capped to 14 most recent; fail still-`issued` only; unissued absences are not fails; do not insert quests for caught-up dates; already-issued path persists **new** health modifiers only then touches `last_ensured_local_date`; else engine in-process; append `penalty_easy_walk` if a penalty is owed unless today is rest/`illness_rest`; `atomic([ INSERT issuance_ledger, ...INSERT daily_quests, UPDATE profiles ... ])`; unique conflict of ledger → SELECT existing, still set `last_ensured_local_date = today`).
- [ ] Query budgets (Node habit ≤ 20; hard cap 50 if the same code ever runs on D1 Free):

  | Route | Statements |
  | --- | --- |
  | `GET /me/today` | 1 bundle. **0 writes.** |
  | `POST /me/today/ensure` (already issued, no new modifiers) | 1 bundle + 1 catch-up UPDATE (often 0 rows) + 1 last_ensured touch |
  | `POST /me/today/ensure` (issue + catch-up) | 1 bundle + 1 catch-up UPDATE + 1 `atomic` (ledger + ≤5 quests + ≤1 xp_events + ≤1 profiles + ≤1 effects) ≤ **12** |
  | `POST /quests/:id/complete` | 1 select quest+profile by id+user **or** use bundle; 1 `atomic` (quest, completion, xp_event, profiles, snapshot, hard_bouts upsert) ≤ **8** |

- [ ] Bundle read is **1 statement** `todayBundle.sql` as specified in §10 (`summaries14` is **14** days `BETWEEN :d13 AND :d`; `skip_reason = 'busy'` scalar).
- [ ] `POST /quests/:id/complete` `{ "clientId": "uuid", "effort": "full" | "partial", "perceivedRpe"?: 1-10, "notes"?: "" }`. Partial = **50%** XP if the user attests they did at least half the work. No set-by-set log in v1. No client fail.
- [ ] `POST /quests/:id/skip` `{ "reason": "rest_planned" | "illness" | "pain" | "busy", "notes"?: "" }`.
- [ ] Completion table:

  | Event | XP | Streak | Stats | Effects written |
  | --- | --- | --- | --- | --- |
  | `completed` / `auto_completed` | 100% | +1 if every **required** quest that day is done (`kind` ≠ only-flavor). Required = all issued except `penalty` | full delta, max +1.0 per stat per day | none |
  | `partial` (`effort: "partial"`) | 50% | counts as done | 50% delta, same cap | none |
  | skip `rest_planned` | 0 | freeze | 0 | none |
  | skip `illness` | 0 | freeze | 0 | if an illness skip already exists for yesterday → `illness_rest` covering **tomorrow 00:00–24:00 local** |
  | skip `pain` | 0 | freeze | 0 | `pain_no_hard` for 24 h from `now` |
  | skip `busy` | 0 | freeze | 0 | if this is the **3rd** `busy` skip in the ISO week (Mon–Sun, user tz) → **do not store skipped**; store `failed` instead (same as midnight fail) |
  | midnight fail (still `issued` when catch-up walks `[last_ensured, today)`) | 0 | streak = 0 | 0 | +1 penalty event **per failed date**; next **today** issue includes `penalty_easy_walk` if not already rest |

- [ ] `hard_bouts` writer (**only writer in v1**): in `applyCompletion`, if `prescription.intensity === "hard"` and status is `completed` or `partial`, `UPDATE daily_summaries SET hard_bouts = hard_bouts + 1` for that `user_id, local_date` (create the row if needed). Health samples never increment it in v1.
- [ ] XP writes to **`profiles.xp` / `profiles.level`**.
- [ ] `penaltyPoints30d`: `SELECT COUNT(*) FROM xp_events WHERE user_id=? AND reason='penalty_eval' AND created_at >= ?`. Recompute and store on `profiles.penalty_points_30d` at each penalty_eval.
- [ ] Rank recompute at the end of every successful complete/skip/ensure. If rank was `S` and gates fail → `A` and `rank_events.reason=destabilized`. Trigger is those three API paths, once per mutation.
- [ ] Cannot complete another user’s quest (IDOR: `user_id = session.userId`).
- [ ] Tests: ensure idempotent; GET today writes 0; cannot complete another user.
- [ ] Cron `evaluate-penalties.ts` calls **only** `catchUpMissedDays` for users with `last_ensured_local_date < their local today`, **25 users/tick**. Cron does **not** issue today.
- [ ] After this loop exists, a user who next opens the app still gets correct fails/streak/caution **even if cron never ran**.
- [ ] Day-closed: later outbox (PR 18a) treats `409 DAY_CLOSED`.
- [ ] `suggestRegenerate: true` flag only — **do not auto-regenerate**.

### Definition of Done

- [ ] Team DoD met.
- [ ] API tests: 401; ensure idempotent; cannot complete another user; GET today writes 0.
- [ ] Query budgets documented/asserted for ensure ≤ **12** and complete ≤ **8**.
- [ ] Peer review **PASS** before merge.

---

## ARISE-012 — Health ingest, consent, daily summaries, and retain job

| Field | Value |
| --- | --- |
| **ID** | ARISE-012 |
| **Title** | Health ingest, consent, daily summaries, and retain job |
| **Persona** | Player |
| **Description** | As a Player, I want consented manual/CSV samples to upsert daily summaries and persist new step/sleep modifiers, so that today’s quests shrink or auto-complete from real data. |
| **Mapped PR** | **11** — `feat(api): health ingest, consent, daily summaries, retain job` |
| **Sprint** | Sprint 4 (Done) |
| **Assignee** | **Dev A** |
| **Story points** | 5 |
| **Dependencies** | ARISE-008, ARISE-011 |

### Acceptance criteria

- [ ] Files: `apps/api/src/routes/health.ts`, `apps/api/src/jobs/retain.ts`, `apps/api/src/jobs/node-cron.ts`.
- [ ] `POST /health/samples` `{ "consent"?: true, "samples": [ { "source": "csv"|"manual", "metric": "...", "value": 0, "unit": "...", "startAt": "...", "endAt": "...", "clientId": "..." } ] }` **max 200**.
- [ ] `POST /health/manual` sugar for one sample + optional `consent`.
- [ ] `GET /health/summary?from&to` → `DailySummary[]`.
- [ ] `profiles.health_consent_at` must be set. First successful `POST /health/samples` or `/health/manual` requires `{ "consent": true }` once; thereafter optional. Without consent → **`403 HEALTH_CONSENT_REQUIRED`**.
- [ ] Persist path: 1 multi-value `INSERT` + 1 summary upsert + 1 optional modifier batch ≤ **6** statements. CSV import 200 rows → 201 rows written (+ indexes).
- [ ] `POST /health/samples` persists new modifiers only (`modifiers_applied_json = json_insert(..., key)` plus `next` fields). Re-running ensure does not shrink twice.
- [ ] Health ingest uses `rate_limits` (not Better Auth memory). `GET /health` stays isolate-local, 30/min/IP, no DB.
- [ ] Node cron **one schedule** `15 3 * * *` UTC:
  1. `retain.ts`: delete `health_samples` older than `HEALTH_SAMPLE_RETENTION_DAYS` in chunks of **500**; delete `audit_logs` older than `AUDIT_RETENTION_DAYS`; delete `rate_limits` and `auth_rl` rows past expiry (`DELETE FROM auth_rl WHERE expires_at < :now`).
  2. `evaluate-penalties.ts`: `catchUpMissedDays` for users with `last_ensured_local_date < local today`, **25 users/tick**. Does not issue today’s quests.
- [ ] **No push job.**
- [ ] Defaults: `HEALTH_SAMPLE_RETENTION_DAYS=30`, `AUDIT_RETENTION_DAYS=90`, `MAX_IMPORT_SAMPLES_PER_DAY=5000`.
- [ ] Health samples never increment `hard_bouts` in v1.

### Definition of Done

- [ ] Team DoD met.
- [ ] Tests: consent 403; 200-row ingest; modifier persist idempotent.
- [ ] Peer review **PASS** before merge.

---

## ARISE-013 — Progress, JSON export, account delete, and reset-password CLI

| Field | Value |
| --- | --- |
| **ID** | ARISE-013 |
| **Title** | Progress, JSON export, account delete, and reset-password CLI |
| **Persona** | Player |
| **Description** | As a Player, I want 90-day progress, a JSON export of my rows, and account deletion, so that I can review growth and exercise GDPR access/erasure. As an Operator, I want a reset-password CLI when SMTP is unset. |
| **Mapped PR** | **12** — `feat(api): progress, JSON export, account delete, reset-password CLI` |
| **Sprint** | Sprint 4 (Done) |
| **Assignee** | **Dev A** |
| **Story points** | 5 |
| **Dependencies** | ARISE-011 |

### Acceptance criteria

- [ ] Files: `apps/api/src/routes/progress.ts`, `routes/export.ts`, `cli/reset-password.ts`, `routes/me.ts` (debug).
- [ ] `GET /progress` last **90** days.
- [ ] `GET /api/v1/me/export` (auth) returns `application/json` attachment **`arise-export.json`** of user-scoped rows (**no** `accounts.password`, no other users).
- [ ] `POST /api/v1/account/delete` cascade (all user-scoped rows).
- [ ] `GET /me/debug` auth’d: `{ lastEnsureMs, lastQueryCount, lastD1Meta, effects, recoveryParts }` for dogfood.
- [ ] `POST /api/v1/auth/forget-password` only if `SMTP_URL` is set; else **404** and Settings copy points at the operator.
- [ ] CLI (Node/Docker only):

  ```bash
  pnpm --filter api exec tsx src/cli/reset-password.ts --identifier USER --password -
  ```

- [ ] No transactional email required. Optional SMTP.

### Definition of Done

- [ ] Team DoD met.
- [ ] Tests: export omits password hashes; delete cascades; forget-password 404 without SMTP.
- [ ] Peer review **PASS** before merge.

---

## ARISE-014 — Vite web shell with proxy, login, and register

| Field | Value |
| --- | --- |
| **ID** | ARISE-014 |
| **Title** | Vite web shell with proxy, login, and register |
| **Persona** | Player |
| **Description** | As a Player, I want a dark SYSTEM web app on Vite that registers (age + invite + disclaimer) and logs in against the same origin, so that cookies attach and I never call `:8787` from the browser. |
| **Mapped PR** | **13** — `feat(web): vite, proxy, login/register (age+invite), credentials include` |
| **Sprint** | Sprint 4 (Done) |
| **Assignee** | **Dev B** |
| **Story points** | 5 |
| **Dependencies** | ARISE-009 |

### Acceptance criteria

- [ ] Files: `apps/web` Vite + auth routes + `src/lib/api.ts`, `src/lib/auth-client.ts`, `src/main.tsx`, `src/app.tsx`, `src/routes/__root.tsx`, `src/routes/index.tsx`, `src/routes/login.tsx`, `src/routes/register.tsx`, `src/components/disclaimer/MedicalDisclaimer.tsx`, `src/styles/system.css` shell.
- [ ] Vite 6 + React 19 + TanStack Router + Query. **Not Next.js.**
- [ ] `apps/web/vite.config.ts` proxy:

  ```ts
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://127.0.0.1:8787", changeOrigin: false },
    },
  },
  ```

- [ ] `apps/web/src/lib/api.ts` uses `credentials: 'include'` and relative URLs (`/api/v1/...`).
- [ ] Register collects age + invite + medical disclaimer. Under-16 cannot create an account (server `400 AGE_RESTRICTED`, zero rows).
- [ ] Invite required; empty `REGISTER_INVITE_CODE` is fail-closed on the server (`503 INVITE_UNCONFIGURED`).
- [ ] Email required; username optional alias. Password min 10.
- [ ] Theme: **Dark System only**. In-app chrome says **SYSTEM**. Product name Arise.
- [ ] Language: English. Units toggle may wait for settings (PR 13.1); store metric.
- [ ] No Web Push copy. No Solo Leveling IP strings.
- [ ] CSP later applied at serve time (PR 20 / node static): `connect-src 'self'` is correct.

### Definition of Done

- [ ] Team DoD met.
- [ ] Manual/dev: register + login against `http://localhost:5173` sets `arise.session`.
- [ ] Peer review **PASS** before merge.

---

## ARISE-015 — Settings: units, logout, delete, and export download

| Field | Value |
| --- | --- |
| **ID** | ARISE-015 |
| **Title** | Settings: units, logout, delete, and export download |
| **Persona** | Player |
| **Description** | As a Player, I want settings for units, timezone, logout, account delete, and export download, so that I can operate my account without SMTP or a native store. |
| **Mapped PR** | **13.1** — `feat(web): settings, units, logout, delete, export download` |
| **Sprint** | Sprint 4 (Done) |
| **Assignee** | **Dev B** |
| **Story points** | 3 |
| **Dependencies** | ARISE-013, ARISE-014 |

### Acceptance criteria

- [ ] File: `apps/web/src/routes/settings.tsx` (plus `src/lib/units.ts` as needed).
- [ ] Settings: units (metric + imperial toggle; **store metric**), tz, logout, delete, export.
- [ ] Export downloads `arise-export.json`.
- [ ] Delete calls `POST /api/v1/account/delete`.
- [ ] If SMTP unset, Settings copy points at the operator / `pnpm arise admin reset-password` CLI (design: `pnpm --filter api exec tsx src/cli/reset-password.ts --identifier USER --password -`).
- [ ] Settings copy for stubs: “Live Apple Health / Health Connect need a future native wrapper. Large Apple exports are not supported in v1. Use the CSV template (200 rows).”
- [ ] Shared-device copy **must** say: “Do not install Arise on a shared phone if you care about other people reading queued health entries.” v1 does not encrypt IndexedDB.
- [ ] Wizard/`PREGNANCY_HARD_STOP`: Settings is reachable for **Delete account** only; other settings 409 the same code.
- [ ] No VAPID / push settings. `FEATURE_PUSH=false` unused.

### Definition of Done

- [ ] Team DoD met.
- [ ] Peer review **PASS** before merge.

---

## ARISE-016 — SYSTEM window: panels, quest cards, rank-up, and disclaimer

| Field | Value |
| --- | --- |
| **ID** | ARISE-016 |
| **Title** | SYSTEM window: panels, quest cards, rank-up, and disclaimer |
| **Persona** | Player |
| **Description** | As a Player, I want the holographic SYSTEM window to show today’s quests, stats, rank, and streak, so that I can complete, partial, or skip work and see XP and rank-up. |
| **Mapped PR** | **14** — `feat(ui): System panels, quest cards, rank-up, disclaimer` |
| **Sprint** | Sprint 5 (Planned) |
| **Assignee** | **Dev B** |
| **Story points** | 8 |
| **Dependencies** | ARISE-011, ARISE-014 (ARISE-011 depends on ARISE-007 — chrome cannot merge before engine) |

### Acceptance criteria

- [ ] Files: `packages/ui/src/{index,Panel,QuestCard,StatBlock,RankBadge,XpBar,SystemToast,RankUpModal,tokens.css}`, `apps/web/src/features/system-window/*`, `apps/web/src/styles/system.css`.
- [ ] In-app chrome says **SYSTEM**. Product name Arise. Allowed: original holographic panels, rank letters, invented copy, Lucide + custom SVG.
- [ ] System window: today’s quests, stats (`str` `agi` `vit` **`intl`** `sta`), rank E–S, titles (Initiate / Adept / Operative / Veteran / Elite / Sovereign), streak.
- [ ] Actions: complete / partial / skip (reasons `rest_planned` | `illness` | `pain` | `busy`). Client: GET `/me/today`; if `needsEnsure`, POST `/me/today/ensure`; then render.
- [ ] In-app toast on rank-up (`RankUpModal` / `SystemToast`). PWA badging is **out of scope**.
- [ ] Disclaimer on every System window payload / view.
- [ ] Copy: no calorie numbers; fat-loss talks steps/sleep/consistency.
- [ ] `suggestRegenerate: true` shows a **button**. Does **not** auto-regenerate (v1.1).
- [ ] Dark System only. No light theme.
- [ ] No Web Push. No social / PvP. No Solo Leveling marks, character names, or screenshots.
- [ ] Chrome cannot merge before engine (PR 06b / ARISE-007) and today API (PR 10 / ARISE-011).

### Definition of Done

- [ ] Team DoD met.
- [ ] UI package + system-window typecheck. No `dangerouslySetInnerHTML`.
- [ ] Peer review **PASS** before merge.

---

## ARISE-017 — Six-step onboarding wizard and plan preview

| Field | Value |
| --- | --- |
| **ID** | ARISE-017 |
| **Title** | Six-step onboarding wizard and plan preview |
| **Persona** | Player |
| **Description** | As a Player, I want a six-step onboarding wizard with a client-side plan preview, so that I can confirm a 7-day plan and be hard-stopped on pregnancy or unsafe fat-loss. |
| **Mapped PR** | **15** — `feat(web): six-step onboarding and plan preview` |
| **Sprint** | Sprint 5 (Planned) |
| **Assignee** | **Dev B** |
| **Story points** | 5 |
| **Dependencies** | ARISE-010, ARISE-016 |

### Acceptance criteria

- [ ] Files: `apps/web/src/features/onboarding/*`, `apps/web/src/routes/onboarding.tsx`, `apps/web/src/routes/plan.tsx`.
- [ ] Wizard, **6 steps**, none skippable except optional target weight:
  1. Disclaimer checkbox (must be true; already collected at register too).
  2. PAR-Q. **`pregnancy === true` → 403 `PREGNANCY_HARD_STOP`**.
  3. Body & goal. Implied fat-loss rate surfaces `400 UNSAFE_LOSS_RATE` with the max allowed weekly kg.
  4. Life: sleep window, job activity, commute minutes (stored, unused by issuer in v1).
  5. Training: experience, equipment, injuries.
  6. Review preview: **single submit** on step 6; preview is client-side `POST /plan/preview` that runs `buildWeeklyPlan` without persist (0 writes besides session).
- [ ] Wizard maps `PREGNANCY_HARD_STOP` to a **dead-end** screen (no retry loop) with **Delete account** → `POST /account/delete`.
- [ ] After success, player can open the System window (onboarding_status complete).
- [ ] Example body in design (age 29, Europe/Stockholm, fat_loss 72→66 by 2026-12-01, experience 1, equipment bands, injuries knee, weekdays 1/3/5/6) is a valid fixture.

### Definition of Done

- [ ] Team DoD met.
- [ ] Peer review **PASS** before merge.

---

## ARISE-018 — Manual health entry and CSV importer UI

| Field | Value |
| --- | --- |
| **ID** | ARISE-018 |
| **Title** | Manual health entry and CSV importer UI |
| **Persona** | Player |
| **Description** | As a Player, I want a manual form and a CSV importer that reject oversized files before parse, so that I can feed steps/sleep without Apple XML or Bluetooth. |
| **Mapped PR** | **16** — `feat(web): manual entry and CSV importer` |
| **Sprint** | Sprint 5 (Planned) |
| **Assignee** | **Dev B** |
| **Story points** | 3 |
| **Dependencies** | ARISE-012, ARISE-016 |

### Acceptance criteria

- [ ] Files: `apps/web/src/features/health/ManualEntryForm.tsx`, `CsvImporter.tsx`, `apps/web/src/routes/health.tsx`.
- [ ] Client rejects file `size > 262144` or `rows > 200` **before** parse.
- [ ] Parse is `split(/\r?\n/)` + Zod; no XML, no zip.
- [ ] CSV template download from `/settings` uses the design header (`metric,value,unit,startAt,endAt`).
- [ ] First ingest requires consent `{ "consent": true }`. Without consent the API returns `403 HEALTH_CONSENT_REQUIRED` and the UI explains it.
- [ ] Settings/health copy: “Live Apple Health / Health Connect need a future native wrapper. Large Apple exports are not supported in v1. Use the CSV template (200 rows).”
- [ ] No Web Bluetooth UI (not even as “live HR theater”). `FEATURE_WEB_BLUETOOTH=false`; do not set true.

### Definition of Done

- [ ] Team DoD met.
- [ ] Peer review **PASS** before merge.

---

## ARISE-019 — Progress UI for XP, stats, and rank history

| Field | Value |
| --- | --- |
| **ID** | ARISE-019 |
| **Title** | Progress UI for XP, stats, and rank history |
| **Persona** | Player |
| **Description** | As a Player, I want a progress view of XP, five stats, and rank history, so that I can see E→S growth over the last 90 days. |
| **Mapped PR** | **17** — `feat(web): XP, stats, rank history` |
| **Sprint** | Sprint 5 (Planned) |
| **Assignee** | **Dev B** |
| **Story points** | 3 |
| **Dependencies** | ARISE-013, ARISE-016 |

### Acceptance criteria

- [ ] Files: `apps/web/src/features/progress/*`, `apps/web/src/routes/progress.tsx`.
- [ ] Shows XP, stats (`intl` not `int`), rank history from `GET /progress` (last **90** days).
- [ ] Ranks displayed E–S with titles Initiate, Adept, Operative, Veteran, Elite, Sovereign.
- [ ] No leaderboards. No social / PvP. No calorie numbers.

### Definition of Done

- [ ] Team DoD met.
- [ ] Peer review **PASS** before merge.

---

## ARISE-020 — PWA install, service worker, and IndexedDB outbox (no Web Push)

| Field | Value |
| --- | --- |
| **ID** | ARISE-020 |
| **Title** | PWA install, service worker, and IndexedDB outbox (no Web Push) |
| **Persona** | Player |
| **Description** | As a Player, I want to install Arise as a PWA with offline read of the last today payload and an outbox for completions, so that I can keep playing on flaky networks without Web Push. |
| **Mapped PR** | **18a** — `feat(pwa): manifest, service worker, IndexedDB outbox` |
| **Sprint** | Sprint 5 (Planned) |
| **Assignee** | **Dev B** |
| **Story points** | 5 |
| **Dependencies** | ARISE-016, ARISE-011 |

### Acceptance criteria

- [ ] Files: `apps/web/src/sw.ts`, `apps/web/public/manifest.webmanifest`, `apps/web/src/lib/offline-queue.ts`, `apps/web/public/icons/icon-192.png`, `icon-512.png`, `maskable-512.png`.
- [ ] `display: standalone`, name **“Arise”**, theme **`#050816`**.
- [ ] Precache shell (`vite-plugin-pwa`).
- [ ] `GET /api/v1/me/today` network-first, cache last payload **1 h**.
- [ ] Completions / skips / manual samples → IndexedDB outbox, drain on `online`.
- [ ] If server says `409 DAY_CLOSED`, drop the outbox item and show “the day closed.”
- [ ] **No** `push` event in `sw.ts`. No VAPID. No `push_subscriptions` usage. No hourly cron.
- [ ] iOS: Add to Home Screen works; **no push claims** in the UI.
- [ ] IndexedDB outbox (completions + pending samples) is **unencrypted**. Settings already discloses shared-phone risk (ARISE-015).
- [ ] PWA badging is out of scope.
- [ ] **PR 18b must not be sneaked into this PR.**

### Definition of Done

- [ ] Team DoD met.
- [ ] Grep/`sw.ts` review confirms no push handlers.
- [ ] Peer review **PASS** before merge.

---

## ARISE-021 — Playwright happy path: register, onboard, ensure, complete

| Field | Value |
| --- | --- |
| **ID** | ARISE-021 |
| **Title** | Playwright happy path: register, onboard, ensure, complete |
| **Persona** | Engineer |
| **Description** | As an Engineer, I want a Playwright e2e that registers (age 20), onboards, ensures today, and completes one quest with XP up, so that the v1 loop is proven before Compose launch. |
| **Mapped PR** | **19** — `test(e2e): register, onboard, ensure, complete quest` |
| **Sprint** | Sprint 6 (Planned) |
| **Assignee** | **Dev B** |
| **Story points** | 5 |
| **Dependencies** | ARISE-017, ARISE-016 |

### Acceptance criteria

- [ ] Files: `apps/web/e2e/happy-path.spec.ts` (and `apps/web/e2e/**` as needed).
- [ ] Playwright covers: **register (age 20)** → onboard → ensure → complete one → **XP up**.
- [ ] Register uses a matching `REGISTER_INVITE_CODE` and `acceptedMedicalDisclaimer: true`.
- [ ] Flow exercises GET `/me/today` then POST `/me/today/ensure` when `needsEnsure` is true.
- [ ] Completing a quest increases `profiles.xp` / player.xp in the subsequent today payload.
- [ ] Test does **not** require Web Push, Bluetooth, Apple XML, or a cloud URL.

### Definition of Done

- [ ] Team DoD met.
- [ ] Playwright job is wired in CI (or documented as the PR 19 CI step).
- [ ] Peer review **PASS** before merge.

---

## ARISE-022 — docker compose up --build is the v1 launch path

| Field | Value |
| --- | --- |
| **ID** | ARISE-022 |
| **Title** | docker compose up --build is the v1 launch path |
| **Persona** | Operator |
| **Description** | As an Operator, I want `docker compose up --build` on a fresh volume to serve the PWA and API at `http://localhost:8080`, so that v1 launches on my machine with no custom domain, no Caddy TLS, and no Workers Paid. |
| **Mapped PR** | **20** — `chore: compose up --build runbook and sqlite backup cron` |
| **Sprint** | Sprint 6 (Planned) |
| **Assignee** | **Dev B** |
| **Story points** | 5 |
| **Dependencies** | ARISE-021, ARISE-020, ARISE-009 |

### Acceptance criteria

- [ ] Files: `docker-compose.yml` final, `infra/docker/api.Dockerfile`, `infra/docker/entrypoint.sh`, `infra/scripts/backup-sqlite.sh`, README launch section.
- [ ] **Acceptance (only this):** `docker compose up --build` on a **fresh** named volume; register from `http://localhost:8080/register` with the invite code; deep-link refresh of `/onboarding` returns the SPA (**not** 404). Image must contain `/app/web/index.html` and a working `node dist/node.js` (`pnpm deploy`, **not** workspace `node_modules`).
- [ ] Happy path:

  ```bash
  cp .env.example .env
  # set BETTER_AUTH_SECRET, REGISTER_INVITE_CODE
  # APP_ORIGIN=http://localhost:8080
  # BETTER_AUTH_URL=http://localhost:8080
  docker compose up --build
  # open http://localhost:8080 → register (age ≥ 16) → onboarding → System window
  ```

- [ ] One Node 22 container (Hono + SQLite + static PWA). Ports `"8080:8787"`. `SERVE_STATIC=true`, `WEB_DIST=/app/web`.
- [ ] Static + SPA fallback in `apps/api/src/node.ts` after all `/api/*`, `/health`, `/ready`: `serveStatic` + `GET *` reads `index.html` so `GET /onboarding` must not 404. Do **not** use `try_files` from a second container.
- [ ] `entrypoint.sh`: `mkdir -p /data/backups`; `chown -R 10001:10001 /data`; `exec gosu arise "$@"`.
- [ ] Second cron line in `node-cron.ts` at **`45 3 * * *`** `child_process.spawn`s `backup-sqlite.sh`. Operator should copy `/data/backups` off-box. **D1 Time Travel (7 days) is not a backup.**
- [ ] Local/LAN uses the single container on **8080 (HTTP)**. `Secure` cookies stay off because `APP_ORIGIN` is `http://localhost:8080`.
- [ ] **Not in this PR:** `wrangler.toml`, `deploy.yml`, `Caddyfile`, custom domains, Workers Paid. Those stay a later option (§16.3) and must **not** block merge.
- [ ] CSP (same origin) as design Security section, including `connect-src 'self'`.
- [ ] No public cloud URL. Friends on that origin (same machine, LAN, or Tailscale). **Stop.** Public cloud, Workers Paid, and open register are **after v1**.

### Definition of Done

- [ ] Team DoD met.
- [ ] Fresh-volume Compose acceptance executed (or recorded in the PR as the launch check).
- [ ] Peer review **PASS** before merge.

---

## ARISE-023 — Harden GitHub Actions CI for PRs and main

| Field | Value |
| --- | --- |
| **ID** | ARISE-023 |
| **Title** | Harden GitHub Actions CI for PRs and main |
| **Persona** | Engineer |
| **Description** | As an Engineer, I want GitHub Actions CI on PRs and `main` to cancel stale runs, cache pnpm, install frozen, and fail closed on typecheck/test/forbidden-string grep, so that merges cannot skip the quality bar. |
| **Mapped PR** | — (ops; not in 01–20) — `ci: harden Actions for PRs and main` |
| **Sprint** | Sprint 4 (Done) |
| **Assignee** | **SRE** |
| **Story points** | 3 |
| **Dependencies** | ARISE-002 |

### Acceptance criteria

- [ ] Workflow remains `.github/workflows/ci.yml` only. **No** `.github/workflows/deploy.yml`. **No** Workers / Caddy / wrangler jobs.
- [ ] `concurrency` is set so in-progress runs for the same ref are **cancelled** (`cancel-in-progress: true`).
- [ ] Job uses **Node 22** + **pnpm 9** with the **pnpm store cache** (setup-node `cache: "pnpm"` or equivalent store-path cache).
- [ ] Install is `pnpm install --frozen-lockfile`. Do not fall back to an unfrozen install when `pnpm-lock.yaml` exists.
- [ ] Forbidden-string grep is still **required** and **fail-closed**: a match fails the job; a ripgrep error fails the job. Manual review is not the IP mitigation.
- [ ] Typecheck and test **must fail the job** when those scripts exist. Do **not** use `pnpm run typecheck --if-present` / `pnpm run test --if-present` in a way that skips a missing-or-present script and still greens the job. If the root scripts exist, a failing typecheck or test is a red job.
- [ ] No Cloudflare `deploy.yml`. No Workers Paid / Free deploy step. No Caddy.

### Definition of Done

- [ ] Team DoD met.
- [ ] CI on a PR is green only when grep, typecheck, and test all pass.
- [ ] Peer review **PASS** before merge.

---

## ARISE-024 — Merge gates for main

| Field | Value |
| --- | --- |
| **ID** | ARISE-024 |
| **Title** | Merge gates for main |
| **Persona** | Operator |
| **Description** | As an Operator, I want `main` protected by a required PR and the `CI / ci` status check, plus a PR template that names that check, so that unreviewed or red work cannot land on `main`. |
| **Mapped PR** | — (ops; not in 01–20) — `chore: merge gates for main` |
| **Sprint** | Sprint 4 (Done) |
| **Assignee** | **SRE** |
| **Story points** | 2 |
| **Dependencies** | ARISE-023 |

### Acceptance criteria

- [ ] Document the required check name exactly: **`CI / ci`** (workflow name `CI`, job id `ci`).
- [ ] Add a pull-request template that tells authors the required check is `CI / ci` and that peer PASS is still required before merge.
- [ ] Attempt to set GitHub branch protection on `main` via `gh` (require a pull request before merge + required status check `CI / ci`) **if** the token has Administration.
- [ ] If the API returns **403**, record the **exact** `gh api` command for the operator in the story notes / assignment / PR description. **Do not block the rest of Sprint 4.**
- [ ] No `deploy.yml`. No Workers / Caddy / custom-domain protection rules.

### Definition of Done

- [ ] Team DoD met (docs + template always; protection either applied or the 403 command recorded).
- [ ] Peer review **PASS** before merge.

---

## ARISE-025 — Document required GitHub check context as `ci`

| Field | Value |
| --- | --- |
| **ID** | ARISE-025 |
| **Title** | Document required GitHub check context as `ci` |
| **Persona** | Operator |
| **Description** | As an Operator, I want docs, the PR template, and the operator `gh api` snippet to name the required GitHub check context **`ci`** (not `CI / ci`), so that branch protection matches the live check and merges are not blocked. |
| **Mapped PR** | — (ops; not in 01–20) — `docs: required check context is ci` |
| **Sprint** | Sprint 4 (Done) |
| **Assignee** | **SRE** |
| **Story points** | 1 |
| **Dependencies** | ARISE-024 |

### Acceptance criteria

- [ ] Why: live `main` protection uses required check context **`ci`**. Docs that say `CI / ci` previously blocked merges because the required check never matched.
- [ ] Scope: docs (`docs/dev/CI.md`, `docs/dev/GIT_WORKFLOW.md`) + PR template + operator `gh api` snippet (`contexts: ["ci"]`).
- [ ] **Not** a new workflow. **No** `.github/workflows/deploy.yml`.
- [ ] No Cloudflare / Caddy / custom-domain work.

### Definition of Done

- [ ] Team DoD met (docs + template + operator snippet).
- [ ] Peer review **PASS** before merge.

---

## Later (not v1)

These are **not** scheduled into Sprint 1–6. Do not open v1 stories for them. Do not sneak them into 18a or 20.

### PR 18b — Web Push (v1.1; do not merge in v1)

- Title: `feat(pwa): VAPID web push (deferred)`.
- Depends on: 18a + product call.
- Listed so it is not sneaked into 18a.
- v1.1 may add Web Push on **Node cron only** (not Workers Free). Cap 10 sends/tick. Design then; do not implement now.
- No VAPID, no `push_subscriptions` / `push_log` tables, no `push` event in `sw.ts`, no hourly notify in v1.

### v1.1 (explicitly not these sprints)

- Apple Health `export.zip` / XML parse in a **web worker** with zip WASM, uncompressed size cap 25 MB, last-30-days filter.
- Habit-learning auto-regenerate (v1 only sets `suggestRegenerate: true`).
- Catalog beyond the **16** templates.
- Optional encrypted backup copy instructions.
- More templates; `quest_templates` CMS may be read later (table may exist empty).

### v2

- Capacitor + HealthKit / Health Connect (store fees).
- Optional LLM draft → `safety.ts`. `FEATURE_LLM_PLANNER` does not exist until v2.
- Magic link if SMTP exists.

### Hosting later option only (§16.3) — not a v1 deliverable

- Workers Paid + Static Assets + D1. `apps/api/wrangler.toml`. `cpu_ms = 50` requires Paid.
- `.github/workflows/deploy.yml`.
- Custom domain / Caddy TLS. No `Caddyfile` in v1.
- Pages + separate Worker on `*.pages.dev` / `*.workers.dev` remains **rejected**.
- Cloudflare Free is **not** a supported API host.

### Other v1 non-goals (do not story)

- Native stores, HealthKit live, Health Connect live, Web Bluetooth (not even as “live HR theater”).
- Social / PvP, diet macros, i18n, light theme, ads, subscriptions.
- Open register (invite-only until a later product call).
- PWA badging.
- Encrypting IndexedDB.
- Hourly notification cron.
- Weaker PBKDF2 on Workers Free.
