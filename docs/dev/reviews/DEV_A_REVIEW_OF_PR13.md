# Peer review: Dev A → Dev B (ARISE-014 / PR 13)

Reviewed worktree `C:\Users\Timus97\.grok\worktrees\grokanalysis-arise\subagent-01a004d7-9424-7902-a6a8-76c6b0c50aa3` at `619291a17f9eb5a68b6dafc4fd14b6af29391ca2` (`feat/ARISE-014-web-shell`, commit title `feat(web): vite, proxy, login/register (age+invite), credentials include`). Tracks `origin/feat/ARISE-014-web-shell`; parent `bdbe1a0` on `main`. Design contract: §7 Auth, §16.1 Vite proxy, §20 PR 13 must-cover, ARISE-014 acceptance criteria, Sprint 4 assignment. Did not modify Dev B’s web source. Did not push.

### Verdict: PASS

### Summary

PR 13 lands the contracted Vite web shell and is independently reviewable. Required files exist: `apps/web/vite.config.ts`, `apps/web/src/lib/api.ts`, `apps/web/src/lib/auth-client.ts`, `apps/web/src/main.tsx`, `apps/web/src/app.tsx`, `apps/web/src/routes/__root.tsx`, `apps/web/src/routes/index.tsx`, `apps/web/src/routes/login.tsx`, `apps/web/src/routes/register.tsx`, `apps/web/src/components/disclaimer/MedicalDisclaimer.tsx`, `apps/web/src/styles/system.css`. Supporting surface is justified: `api.test.ts` (DoD credentials / relative `/api/v1`), `index.html` (dark `color-scheme`, product title Arise). Scope is `apps/web/**` plus the lockfile. No Next.js, no settings/onboarding/PWA, no Web Push, no Solo Leveling strings.

Vite 6 + React 19 + TanStack Router + Query. `vite.config.ts` is the §16.1 block: port **5173**, `strictPort: true`, `"/api"` → `http://127.0.0.1:8787`, **`changeOrigin: false`**. `api.ts` hard-sets `credentials: "include"` (caller cannot override) and rejects non-relative paths (`http://127.0.0.1:8787/...` throws). Auth client posts only `/api/v1/auth/sign-up/email`, `/api/v1/auth/sign-in/email`, `/api/v1/auth/sign-in/username`, and `GET /api/v1/me`. Session probe matches the API `{ userId }` body.

Register collects age + invite + medical disclaimer. Email required, username optional, password min 10. Client Zod is domain `RegisterBody` (`acceptedMedicalDisclaimer: true`); under-16 is not blocked in the form so the server can return **`400 AGE_RESTRICTED`**. Invite field is required in the form; empty/mismatch still fail on the server (`503 INVITE_UNCONFIGURED` / `403 INVITE_REQUIRED`). Chrome mark is **SYSTEM**; product name is Arise; theme is dark-only (`color-scheme: dark`, no light tokens / toggle). English. No units picker (metric wait is PR 13.1).

No blocking issues. Suggestions below are tightenings / later-PR hygiene, not merge gates.

### Test run

Worktree, PATH prepended with `C:\Users\Timus97\.nodejs\node-v22.23.2-win-x64` (Node v22.23.2, pnpm 9.15.0):

- `pnpm --filter web typecheck` — **PASS** (`tsc -p tsconfig.json --noEmit`, exit 0)
- `pnpm --filter web test` — **PASS** (1 file, **3** tests, vitest 3.2.7)
  - `src/lib/api.test.ts` — credentials `include`; relative `/api/v1`; reject `:8787` absolute URLs; parse `AGE_RESTRICTED` / `INVITE_REQUIRED` / `INVITE_UNCONFIGURED`; email vs username sign-in paths stay relative
- `pnpm --filter web build` — **PASS** (`tsc --noEmit && vite build`, Vite 6.4.3, exit 0)

### Checklist

- [x] Vite proxy port **5173**, `"/api"` → `http://127.0.0.1:8787`, `changeOrigin: false`
- [x] `credentials: 'include'`
- [x] Relative `/api/v1/...` only; browser never targets `:8787`
- [x] Register collects age + invite + medical disclaimer
- [x] Email required; username optional; password min 10
- [x] Dark SYSTEM chrome; product name Arise; English
- [x] Not Next.js
- [x] No Web Push copy / handlers
- [x] No Solo Leveling IP strings in `apps/web` or the commit message
- [x] Typecheck / test / build green

### Issues

### Issue 1 -- Severity: suggestion
- **File**: apps/web/src/components/disclaimer/MedicalDisclaimer.tsx:1-2
- **Description**: Copy is the SYSTEM-window sentence plus the README consult line: `"Arise is not a medical device. Stop if you feel pain, chest pressure, or faintness. Consult a qualified clinician before starting an exercise program."` Register/footer may be longer. PR 14 / `GET /me/today` must keep the **exact** payload string without the extra sentence.
- **Suggestion**: Export the exact §10 sentence as `SYSTEM_DISCLAIMER` and append the consult line only on the register checkbox. Do not send the longer string as `today.disclaimer`.
- **Status**: open

### Issue 2 -- Severity: suggestion
- **File**: apps/web/src/routes/__root.tsx:29, apps/web/src/routes/register.tsx:155
- **Description**: Root always renders `<MedicalDisclaimer />` (footer note). Register also renders the checkbox variant, so `/register` shows the notice twice.
- **Suggestion**: Skip the footer note when `pathname === "/register"`, or keep the footer and let the form checkbox be a short “I accept the medical notice above.”
- **Status**: open

### Issue 3 -- Severity: suggestion
- **File**: apps/web/vite.config.ts:1-17, apps/web/tsconfig.json:10
- **Description**: DoD must-cover is register/login via the Vite proxy + `credentials: 'include'`. Tests lock the fetch helper and reject `:8787` URLs. The proxy object itself is not imported in a test, and `tsconfig.json` `include` is only `src/` so `vite.config.ts` is outside `pnpm --filter web typecheck`.
- **Suggestion**: Add one assertion that `defineConfig`’s `server.proxy["/api"]` is `{ target: "http://127.0.0.1:8787", changeOrigin: false }` (or include `vite.config.ts` in a small node test). Optional.
- **Status**: open

### Issue 4 -- Severity: nit
- **File**: apps/web/src/routes/__root.tsx:13-25
- **Description**: Primary nav always offers Sign in / Register, including after `GET /api/v1/me` succeeds. Acceptable for this shell; logout/settings are PR 13.1.
- **Suggestion**: In 13.1, swap those links for Settings / Sign out when a session exists.
- **Status**: open

### Issue 5 -- Severity: nit
- **File**: apps/web/src/routes/index.tsx:42-45
- **Description**: Signed-in home is engineer-facing (“Cookies stay on this host — the browser never calls :8787.”). Fine as a placeholder until PR 14’s SYSTEM window. The `:8787` mention is copy, not a fetch target (bundle has no API origin).
- **Suggestion**: Replace with player copy when the daily window lands.
- **Status**: open

### Blocking count
0 blocking (bug + must-fix suggestion)
