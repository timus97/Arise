# Peer review: Dev A → Dev B (ARISE-015 / PR 13.1)

Reviewed `origin/feat/ARISE-015-settings` at `cdb7ea8d9bd0ba56a648452756c9b1c73d50f365` (`feat(web): settings, units, logout, delete, export download`). GitHub PR https://github.com/timus97/Arise/pull/8 (base `origin/main` `7526c9f`, now `db49fa2`). Design contract: §7 (relative `/api/v1`, `credentials: 'include'`, SMTP CLI), §11 (stub copy + shared-phone sentence + `arise-export.json`), §12 / §18 (`PREGNANCY_HARD_STOP` Settings = Delete only), §20 PR 13.1, ARISE-015 AC, Sprint 4 assignment, team DoD PR 13.1 must-cover. Did not modify Dev B’s product source.

### Verdict: PASS

### Summary

PR 13.1 lands the contracted Settings slice and is independently reviewable. Required files exist: `apps/web/src/routes/settings.tsx` and `apps/web/src/lib/units.ts`. Supporting surface is justified: `settings-client.ts` (sign-out / export / delete / pregnancy gate), `settings-copy.ts` (exact AC strings), `settings-client.test.ts` + `units.test.ts` (DoD surface). Wiring is `app.tsx` route registration, Settings link in `__root.tsx` / home, and dark SYSTEM section styles. Scope is `apps/web/**` only. No Next.js, no VAPID / push settings, no `FEATURE_PUSH`, no `deploy.yml`, no Solo Leveling strings.

Units are a metric | imperial **display** toggle (`arise.displayUnits`); canonical helpers `storeMassKg` / `storeLengthCm` always emit kg / cm. Default is **metric**. Timezone is an IANA local preference (`arise.displayTimeZone`) with an honest hint that daily dates still use the onboarding profile tz because v1 has no settings PATCH. Logout is `POST /api/v1/auth/sign-out`. Delete is `POST /api/v1/account/delete`. Export is `GET /api/v1/me/export` saved as **`arise-export.json`**. All three go through `requestInit()` / `api()`, so `credentials: "include"` is forced and paths are relative `/api/v1/...` (never `:8787`).

SMTP-unset copy points at the operator. The `<pre>` is the exact design CLI `pnpm --filter api exec tsx src/cli/reset-password.ts --identifier USER --password -`, plus the `pnpm arise admin reset-password` alias. Stub copy is the exact §11 / ARISE-015 sentence about Apple Health / Health Connect / 200-row CSV. Shared-device copy is **exactly** “Do not install Arise on a shared phone if you care about other people reading queued health entries.” IndexedDB-unencrypted follow-up is also present.

`GET /api/v1/me/today` 409 `PREGNANCY_HARD_STOP` hides units / tz / export / logout and keeps **Delete account**. Other 409s (`ONBOARDING_REQUIRED`) do not strip settings. Chrome mark is **SYSTEM**; product name is Arise; `lang="en"`; dark-only (`color-scheme: dark`, no light tokens / toggle). English.

No blocking issues. Notes below are tightenings, not merge gates.

### Blocking

None.

### Non-blocking notes

### Issue 1 -- Severity: suggestion
- **File**: apps/web/src/lib/settings-copy.ts:15-16, apps/web/src/lib/settings-client.ts:129-140
- **Description**: Units and timezone persist only to `localStorage`. `TIMEZONE_HINT` is honest (“v1 has no settings PATCH”). That matches this PR’s file list (web only; no API PATCH in PR 12). Profile `units` / `time_zone` from onboarding stay the source of truth for stored values and daily dates. Display toggle + `storeMassKg` / `storeLengthCm` still satisfy **store metric**.
- **Suggestion**: When a later story adds `PATCH /me` (or onboarding writes `profiles.units`), seed the toggle from the profile and write the preference back. Do not invent that endpoint in 13.1.
- **Status**: open

### Issue 2 -- Severity: suggestion
- **File**: apps/web/src/lib/settings-client.ts:93-103, apps/web/src/routes/settings.tsx:110-114
- **Description**: Pregnancy gate sets `logout: false`. That is the literal AC (“Delete account only”). A blocked-pregnancy player cannot sign out without deleting.
- **Suggestion**: Product call only — if operators want a way out without erasure, allow logout (session end is not a settings write). Not required by ARISE-015.
- **Status**: open

### Issue 3 -- Severity: suggestion
- **File**: apps/web/src/lib/settings-client.test.ts
- **Description**: DoD must-cover is units / tz / logout / delete / export + shared-phone copy. Tests lock units conversion + default metric, the three relative POSTs/GET, `credentials: "include"`, `arise-export.json`, 409 `PREGNANCY_HARD_STOP` availability, and the exact shared-phone sentence. There is no assertion for IANA tz read/write, `HEALTH_STUB_COPY`, or `RESET_PASSWORD_CLI` (those strings are in source and rendered).
- **Suggestion**: One extra test that `RESET_PASSWORD_CLI` / `HEALTH_STUB_COPY` match design and that `writeDisplayTimeZone` round-trips a valid IANA id. Optional.
- **Status**: open

### Issue 4 -- Severity: nit
- **File**: apps/web/src/routes/__root.tsx:22-40
- **Description**: Signed-in nav now shows Home + Settings and hides Sign in / Register (addresses PR 13 Issue 4). Log out stays on `/settings` only.
- **Suggestion**: A header Sign out that reuses `signOut()` is fine later. Do not add VAPID / push chrome.
- **Status**: open

### Issue 5 -- Severity: nit
- **File**: apps/web/src/routes/settings.tsx:343-351
- **Description**: Settings shows the CSV header as copy (`metric,value,unit,startAt,endAt`). It does not download a 5-row template file. ARISE-015 AC is stub **copy**; the file download is Health UI (PR 16).
- **Suggestion**: PR 16 can attach `CSV_TEMPLATE` from `@arise/health` to a download control on this page.
- **Status**: open

### Test run results

Worktree `C:\Users\Timus97\.grok\worktrees\grokanalysis-arise\subagent-01a004f8-5432-7a21-8c12-caffc4f8cc30` at `cdb7ea8` (same as `origin/feat/ARISE-015-settings`). PATH prepended with `C:\Users\Timus97\.nodejs\node-v22.23.2-win-x64` (Node v22.23.2, pnpm 9.15.0). Did not edit that worktree.

- `pnpm --filter web typecheck` — **PASS** (`tsc -p tsconfig.json --noEmit`, exit 0)
- `pnpm --filter web test` — **PASS** (3 files, **10** tests, vitest 3.2.7)
  - `src/lib/api.test.ts` — 3 tests (credentials `include`; relative `/api/v1`; reject `:8787`)
  - `src/lib/units.test.ts` — 2 tests (store metric / imperial display factors; default metric toggle)
  - `src/lib/settings-client.test.ts` — 5 tests (exact shared-phone sentence; `GET /api/v1/me/export` + `arise-export.json` + `credentials: include`; `POST /api/v1/account/delete`; `POST /api/v1/auth/sign-out`; 409 `PREGNANCY_HARD_STOP` leaves only delete)

`git grep` on `apps/web` for this SHA: no VAPID / `FEATURE_PUSH` / Solo Leveling / `deploy.yml`. `:8787` appears only in the existing Vite proxy, `api.test.ts` rejects, and home copy (not a fetch target).

### Checklist

- [x] Files `apps/web/src/routes/settings.tsx` + `src/lib/units.ts`
- [x] Units metric | imperial toggle; **store metric**
- [x] Timezone control present (IANA; local display until a PATCH exists)
- [x] Logout `POST /api/v1/auth/sign-out`
- [x] Delete `POST /api/v1/account/delete`
- [x] Export download **`arise-export.json`** from `GET /api/v1/me/export`
- [x] `credentials: "include"`; relative `/api/v1/...` only; browser never targets `:8787`
- [x] SMTP unset copy points at `pnpm --filter api exec tsx src/cli/reset-password.ts --identifier USER --password -`
- [x] Stub copy: Apple Health / Health Connect / 200-row CSV
- [x] Shared-phone sentence exact
- [x] `PREGNANCY_HARD_STOP`: Settings reachable for Delete only; other settings 409 that code
- [x] No VAPID / push settings
- [x] Chrome SYSTEM; product Arise; English; dark
- [x] Typecheck / tests green
- [x] No `deploy.yml`; no Solo Leveling strings

### Blocking count

0 blocking (bug + must-fix suggestion)
