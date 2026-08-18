# Arise — Next-cut stories (status + health sync)

Plan: [`docs/dev/STATUS_AND_HEALTH_SYNC_PLAN.md`](../dev/STATUS_AND_HEALTH_SYNC_PLAN.md).  
v1 stories stay in [`USER_STORIES.md`](./USER_STORIES.md). **Do not implement these on `main` without a feature branch.**

IDs continue from ARISE-025. Points Fibonacci 1–5 (no 8s in this cut).

---

## Index

| ID | Title | Wave | Pts | Deps | Priority |
| --- | --- | --- | --- | --- | --- |
| ARISE-026 | Domain kinds for travel/sick activity status | 1 | 2 | — | **P0 — first** |
| ARISE-027 | API to set and read activity status | 1 | 3 | 026 | P0 |
| ARISE-028 | Issuer and ensure honor travel/sick windows | 1 | 5 | 027 | P0 |
| ARISE-029 | SYSTEM + Settings UI for activity status | 1 | 3 | 027, 028 | P0 |
| ARISE-030 | Tests and e2e for activity status | 1 | 2 | 029 | P0 |
| ARISE-031 | Settings integrations panel (honest sources) | 2 | 2 | — | P1 |
| ARISE-032 | Manual health: steps, sleep, HR on one form | 2 | 2 | — | P1 |
| ARISE-033 | CSV how-to for Garmin / Fitbit / Samsung / Health Connect export | 2 | 2 | 031 | P1 |
| ARISE-034 | Health import: multiple files + last-import summary | 2 | 3 | 032, 033 | P1 |
| ARISE-035 | Parse Apple Health `export.zip` (30-day, size cap) | 3 | 5 | 031 | P2 |
| ARISE-036 | UI to upload Apple export + consent | 3 | 3 | 035 | P2 |
| ARISE-037 | Integration tokens + OAuth state (generic) | 4 | 5 | 031 | P3 |
| ARISE-038 | Fitbit adapter: steps, sleep, resting HR | 4 | 5 | 037 | P3 |
| ARISE-039 | Nightly pull job for connected vendors | 4 | 3 | 038 | P3 |
| ARISE-040 | Second vendor (Withings or Garmin) | 4 | 5 | 039 | P3 |
| ARISE-041 | Android Health Connect adapter in a wrapper | 5 | 5 | 031 | P4 |
| ARISE-042 | iOS HealthKit adapter (needs Apple distribution) | 5 | 5 | 041 | P4 |
| ARISE-043 | Exercise guide copy for 16 templates | form | 3 | review file | P1 |
| ARISE-044 | Quest-card Guide sheet (text) | form | 3 | 043 | P1 |
| ARISE-045 | Original still graphics per unique movement | form | 5 | owner OK | P1 |
| ARISE-046 | Wire stills into Guide sheet + tests | form | 2 | 044+045 | P1 |

**Do not schedule:** Google Fit REST client (retired / replaced by Health Connect). Web Bluetooth. Calorie metrics.

---

## Wave 1 — Activity status (P0)

### ARISE-026 — Domain kinds for travel/sick activity status

| Field | Value |
| --- | --- |
| **Persona** | Player |
| **Description** | As a Player, I want travel and sick to be first-class SYSTEM statuses, so the engine can treat a trip or a cold as a window — not a skip on every quest. |
| **Points** | 2 |
| **Deps** | None |

**Acceptance**

- [ ] Domain Zod: activity status `training` \| `travel` \| `sick`.
- [ ] Effect kinds `travel_window` and `sick_window` with `startsOn` / `endsOn` (local dates) and `days` 1–14.
- [ ] Distinct from skip-inferred `illness_rest` / `pain_no_hard`.
- [ ] Goldens: illegal `days` 0 or 15 rejected; `training` has no window.

### ARISE-027 — API to set and read activity status

| Field | Value |
| --- | --- |
| **Persona** | Player |
| **Description** | As a Player, I want to PUT my status for N days and GET it back, so the phone and Settings share one source of truth. |
| **Points** | 3 |
| **Deps** | ARISE-026 |

**Acceptance**

- [ ] `GET /api/v1/me/activity-status` auth’d. Default `{ "status": "training" }`.
- [ ] `PUT /api/v1/me/activity-status` `{ "status": "travel"\|"sick"\|"training", "days": 1–14 }`. `training` clears windows.
- [ ] Writes `user_effects`; one travel and one sick window max; last PUT wins.
- [ ] Pregnancy-blocked profiles: 403, no effect row.
- [ ] 0 PHI in logs. Tests for 401, validation, clear.

### ARISE-028 — Issuer and ensure honor travel/sick windows

| Field | Value |
| --- | --- |
| **Persona** | Player |
| **Description** | As a Player on travel or sick, I want today’s issued quests to match that status, so I am not failed for missing the gym or a hard day. |
| **Points** | 5 |
| **Deps** | ARISE-027 |

**Acceptance**

- [ ] Active `travel_window` covering local today: equipment whitelist bodyweight / bands / none. No gym-bench templates. Hard gym ids out.
- [ ] Active `sick_window`: rest / easy habit only (same spirit as `illness_rest`). No `penalty_easy_walk` required while sick.
- [ ] Unissued days in the window are still not fails (existing ensure rule).
- [ ] Completing issued travel days ticks streak. Sick days freeze streak (illness analog).
- [ ] Today payload includes `activityStatus` + `effects` so the UI can banner.
- [ ] Goldens: travel day does not issue a gym-only template; sick day `rpeMax <= 4` and no hard.

### ARISE-029 — SYSTEM + Settings UI for activity status

| Field | Value |
| --- | --- |
| **Persona** | Player |
| **Description** | As a Player, I want a Travel / Sick / Training control and a SYSTEM banner, so I can set status from my phone in two taps. |
| **Points** | 3 |
| **Deps** | ARISE-027, ARISE-028 |

**Acceptance**

- [ ] Settings Health (and a SYSTEM control): Travel, Sick, Training. Travel/Sick ask `days` 1–14 before confirm.
- [ ] Banner when not training: `STATUS: TRAVEL` or `STATUS: SICK` + end date + **Clear**.
- [ ] Copy: travel = living-room work; sick = rest, streak held. No calorie language. No push.
- [ ] Works in standalone PWA. Outbox not required (status is online PUT).

### ARISE-030 — Tests and e2e for activity status

| Field | Value |
| --- | --- |
| **Persona** | Engineer |
| **Description** | As an Engineer, I want API + Playwright coverage, so status cannot regress. |
| **Points** | 2 |
| **Deps** | ARISE-029 |

**Acceptance**

- [ ] API tests: PUT travel 3 days → GET; ensure issues no gym-only template; PUT training clears.
- [ ] Playwright: sign in → Settings → Sick 2 days → SYSTEM shows banner; Clear → banner gone.
- [ ] Forbidden-string grep still green.

---

## Wave 2 — Honest ingest (P1)

### ARISE-031 — Settings integrations panel (honest sources)

| Field | Value |
| --- | --- |
| **Persona** | Player |
| **Description** | As a Player, I want Settings to list Apple Health, Health Connect, Fitbit, and CSV with true status, so I never think live Apple/Google sync is on. |
| **Points** | 2 |
| **Deps** | None |

**Acceptance**

- [ ] Panel rows: Manual, CSV, Apple Health, Health Connect, Fitbit (coming). Status `connected` / `unavailable_on_web` / `not_connected`.
- [ ] Apple Health + Health Connect: `unavailable_on_web` + “export a file, or a future native wrapper.”
- [ ] Google Fit is **not** listed as a connectable source (retired). One line: Android data lives in Health Connect / vendor apps.
- [ ] Shared-phone IndexedDB sentence remains.

### ARISE-032 — Manual health: steps, sleep, HR on one form

| Field | Value |
| --- | --- |
| **Persona** | Player |
| **Description** | As a Player, I want to log today’s steps, sleep minutes, and resting HR in one form, so recovery can rewrite tomorrow without a file. |
| **Points** | 2 |
| **Deps** | None |

**Acceptance**

- [ ] Manual form fields for `steps`, `sleep_minutes`, `resting_hr` (optional each). Consent unchanged.
- [ ] Existing normalize ranges apply. Invalid values dropped with a count, not a 500.
- [ ] After save, `GET /health/summary` shows the day.

### ARISE-033 — CSV how-to for vendor exports

| Field | Value |
| --- | --- |
| **Persona** | Player |
| **Description** | As a Player, I want short steps to export from Garmin / Fitbit / Samsung / Health Connect into our CSV template, so my watch data can land without OAuth yet. |
| **Points** | 2 |
| **Deps** | ARISE-031 |

**Acceptance**

- [ ] Settings: download template (existing header) + one sample row per metric including `resting_hr`.
- [ ] English how-to: Health Connect / Samsung / Garmin / Fitbit **export**, then map columns. No claim of live sync.
- [ ] Client still rejects `size > 262144` or `rows > 200` before parse.

### ARISE-034 — Health import: multiple files + last-import summary

| Field | Value |
| --- | --- |
| **Persona** | Player |
| **Description** | As a Player, I want to import another 200-row file and see how many samples were kept, so a week of watch data can arrive in two uploads. |
| **Points** | 3 |
| **Deps** | ARISE-032, ARISE-033 |

**Acceptance**

- [ ] After each import: kept / dropped-range / duplicate counts (no sample values in the banner).
- [ ] Second file does not wipe the first (dedup hash unchanged).
- [ ] `GET /health/summary` reflects merged days.

---

## Wave 3 — Apple export.zip (P2)

### ARISE-035 — Parse Apple Health `export.zip`

| Field | Value |
| --- | --- |
| **Persona** | Player |
| **Description** | As an iPhone Player, I want to upload the Apple Health export zip so last-30-day steps, sleep, and HR become samples — without HealthKit. |
| **Points** | 5 |
| **Deps** | ARISE-031 |

**Acceptance**

- [ ] Adapter `apple_export` no longer throws for a well-formed zip under the cap (design: last 30 days; reject huge uncompressed payloads — document the exact byte/row cap in the PR).
- [ ] Maps Apple step / sleep / heart-rate records onto existing metrics. Drops out-of-range. No XML on the request hot path without a worker/stream — do not freeze the Node event loop.
- [ ] Consent required. No PHI in logs.

### ARISE-036 — UI to upload Apple export + consent

| Field | Value |
| --- | --- |
| **Persona** | Player |
| **Description** | As an iPhone Player, I want a Settings control “Upload Apple Health export” with the official export steps, so I can do this on the PWA. |
| **Points** | 3 |
| **Deps** | ARISE-035 |

**Acceptance**

- [ ] File picker for `.zip`. Client-side size reject before upload.
- [ ] Copy: Settings → Health → Export All Health Data. Not live sync.
- [ ] Success uses the same last-import summary as 034.

---

## Wave 4 — Vendor cloud OAuth (P3)

### ARISE-037 — Integration tokens + OAuth state

| Field | Value |
| --- | --- |
| **Persona** | Engineer |
| **Description** | As an Engineer, I want a generic OAuth + token store on `integrations`, so Fitbit (then others) do not each invent a table. |
| **Points** | 5 |
| **Deps** | ARISE-031 |

**Acceptance**

- [ ] Encrypted refresh-token at rest (or documented equivalent). `integrations.status` `active` / `revoked`.
- [ ] OAuth start/callback routes. `state` CSRF. Tokens never in the web bundle.
- [ ] Revoke endpoint clears tokens. Export JSON does not include refresh tokens.

### ARISE-038 — Fitbit adapter: steps, sleep, resting HR

| Field | Value |
| --- | --- |
| **Persona** | Player |
| **Description** | As a Player with a Fitbit (or Fitbit-synced phone), I want to Connect Fitbit once so steps, sleep, and resting HR fill automatically. |
| **Points** | 5 |
| **Deps** | ARISE-037 |

**Acceptance**

- [ ] Settings: Connect / Disconnect Fitbit. After consent + OAuth, `integrations.provider=fitbit` is `active`.
- [ ] Pull last 7 days into `health_samples` via existing normalize. Dedup holds.
- [ ] Failures → `unavailable_web` or `revoked` with a Settings sentence. No fake “synced” toast.

### ARISE-039 — Nightly pull job for connected vendors

| Field | Value |
| --- | --- |
| **Persona** | Player |
| **Description** | As a Player, I want yesterday’s vendor samples in before morning ensure, so recovery can rewrite today without me opening Settings. |
| **Points** | 3 |
| **Deps** | ARISE-038 |

**Acceptance**

- [ ] Node cron (alongside retain) pulls connected users in small batches. No push notifications.
- [ ] Query budget / per-tick cap documented. One user failure does not abort the tick.
- [ ] Tests lock the schedule and the batch size.

### ARISE-040 — Second vendor (Withings or Garmin)

| Field | Value |
| --- | --- |
| **Persona** | Player |
| **Description** | As a Player on Withings or Garmin, I want the same Connect flow as Fitbit. |
| **Points** | 5 |
| **Deps** | ARISE-039 |

**Acceptance**

- [ ] One additional provider using 037. Same metrics. Same Settings row.
- [ ] Pick the vendor we can actually get API access for; document the choice in the PR. Do not add both in one story.

---

## Wave 5 — Native adapters (P4)

### ARISE-041 — Android Health Connect adapter in a wrapper

| Field | Value |
| --- | --- |
| **Persona** | Player |
| **Description** | As an Android Player, I want Health Connect read (steps, sleep, HR) after I install a wrapper, so phone-synced watches land without CSV. |
| **Points** | 5 |
| **Deps** | ARISE-031 |

**Acceptance**

- [ ] `health_connect` adapter reads with OS permission when `RUNTIME` is the wrapper. PWA/Safari still `UNAVAILABLE_WEB`.
- [ ] Samples go through the same normalize + consent.
- [ ] Distribution: sideload TWA/APK is enough; **not** a Play listing unless the owner reopens stores.

### ARISE-042 — iOS HealthKit adapter

| Field | Value |
| --- | --- |
| **Persona** | Player |
| **Description** | As an iPhone Player, I want HealthKit read if we ever ship an iOS wrapper. |
| **Points** | 5 |
| **Deps** | ARISE-041 |

**Acceptance**

- [ ] `healthkit` adapter live only inside a native shell. PWA remains `UNAVAILABLE_WEB`.
- [ ] Blocked on Apple distribution (TestFlight / store). **Do not start** until the owner accepts that.
- [ ] Until then, Wave 3 zip is the iPhone path.

---

## Suggested order when we start

1. **026 → 027 → 028 → 029 → 030** (status usable on the live PWA).  
2. Pause. Use travel/sick on the phone.  
3. **031 → 032 → 033 → 034**.  
4. **035 → 036** if iPhone testers want Apple data.  
5. **037 → 038 → 039** if we want automatic pull without a store.  
6. **040–042** only with an explicit owner go.

---

## Form guides (after owner marks the review file)

Plan: [`docs/dev/EXERCISE_GUIDE_PLAN.md`](../dev/EXERCISE_GUIDE_PLAN.md). Review: [`docs/product/EXERCISE_GUIDE_REVIEW.md`](../product/EXERCISE_GUIDE_REVIEW.md).

### ARISE-043 — Exercise guide copy for 16 templates

| Field | Value |
| --- | --- |
| **Persona** | Player |
| **Description** | As a Player, I want written setup / action / stop-if cues for every issued template, so I can move safely without a video. |
| **Points** | 3 |
| **Deps** | Owner OK on `EXERCISE_GUIDE_REVIEW.md` |

**Acceptance**

- [ ] One guide object per template id (and per gym-day block). Fields: setup, action, breath, stopIf, doNot.
- [ ] Rest and sleep are text-only (no fake lift).
- [ ] No calorie language. No licensed IP. Tests lock the 16 ids.

### ARISE-044 — Quest-card Guide sheet (text)

| Field | Value |
| --- | --- |
| **Persona** | Player |
| **Description** | As a Player, I want a Guide control on the quest card that opens the cues without completing the quest. |
| **Points** | 3 |
| **Deps** | ARISE-043 |

**Acceptance**

- [ ] Guide on movement cards. Disclaimer on the sheet.
- [ ] Close returns to the SYSTEM window. Complete / skip unchanged.
- [ ] Works in standalone PWA.

### ARISE-045 — Original still graphics

| Field | Value |
| --- | --- |
| **Persona** | Player |
| **Description** | As a Player, I want 1–2 stills per unique movement so I can see start and mid positions. |
| **Points** | 5 |
| **Deps** | Owner OK on review + 043 |

**Acceptance**

- [ ] Stills for the unique movements listed in the review file. Walk shared. No video.
- [ ] Dark SYSTEM style. No forbidden IP. Compressed `public/guides/`.

### ARISE-046 — Wire stills + tests

| Field | Value |
| --- | --- |
| **Persona** | Engineer |
| **Description** | As an Engineer, I want the sheet to show the stills and tests to lock no-push / 16 ids. |
| **Points** | 2 |
| **Deps** | ARISE-044, ARISE-045 |

**Acceptance**

- [ ] Sheet renders setup/mid images when present.
- [ ] `sw.ts` still has no `push` handler. Forbidden-string grep green.
