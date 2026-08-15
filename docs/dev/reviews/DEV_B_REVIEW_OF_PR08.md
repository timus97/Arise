# Peer review: Dev B → Dev A (PR 08 / ARISE-009)

Reviewed worktree `C:\Users\Timus97\.grok\worktrees\grokanalysis-arise\subagent-01a0049a-0e02-75c3-b1d9-9ad526f7c671` at `775da59073be681be395178a06fc998b3b3ceb95` (`feat(api): hono node entry, better-auth username+scrypt, vite-proxy origin`) on `feat/ARISE-009-hono-auth` (tracks `origin/feat/ARISE-009-hono-auth`; parent `649c8e7` on `main`). Checked against design §7, ARISE-009 acceptance criteria, and DoD PR 08 must-cover. Did not modify Dev A’s API source. Did not push.

### Verdict: PASS

### Summary

PR 08 lands the contracted Hono Node API + Better Auth username/scrypt slice and is independently reviewable. Required files exist: `apps/api/src/{node,app,auth,env}.ts`, `apps/api/src/middleware/{auth,ready,timing,error}.ts`, `apps/api/src/routes/auth.ts`, plus `auth-rl.ts`, `worker.ts`, `jobs/node-cron.ts`, and `apps/api/README.md`. Scope is `apps/api/**` and the lockfile only. `src/node.ts` is v1 production (`migrate()` → listen → `startNodeCron()` no-op). `src/worker.ts` is compile-only; its default `fetch` is a hard 501. No `routes/onboarding.ts`, `routes/today.ts`, or `routes/quests.ts`. No `wrangler.toml`, no live Free deploy.

`createAuth` matches design §7: `appName: "Arise"`, `basePath: "/api/v1/auth"`, `emailAndPassword.enabled` + `minPasswordLength: 10`, hasher **not** overridden (Better Auth default is Node `scrypt`), `session.expiresIn` 30d / `updateAge` 1d / `cookieCache` 5 min, `rateLimit` 10/60s, `cookiePrefix: "arise"`, session cookie name **`arise.session`**, `httpOnly` + `sameSite: "lax"` + `secure` iff `appOrigin.startsWith("https")`, `path: "/"`, plugins `[username()]`. `secondaryStorage` is omitted on Node and passed (`auth_rl`) when `RUNTIME=worker`.

Named verify items hold:

- **Age 15** → `400 AGE_RESTRICTED`, zero `user` / `account` / `profiles` rows (façade runs before Better Auth).
- **Invite** unset/empty → `503 INVITE_UNCONFIGURED`; mismatch → `403 INVITE_REQUIRED`; both write zero rows.
- **401** on `GET /api/v1/me` without a session (`UNAUTHORIZED`).
- **501 `AUTH_RUNTIME_UNSUPPORTED`** on worker without `ALLOW_WORKER_PASSWORD_AUTH=true` (sign-up and sign-in).
- **`GET /health`** → `{ ok, runtime, version }`, no DB (still 200 with the handle closed), 30/min/IP in process memory. **`GET /ready`** is one `SELECT 1`.
- **`POST /api/v1/auth/forget-password`** → `404 NOT_FOUND` when `SMTP_URL` is unset.
- Session `Set-Cookie` is `arise.session=…; Max-Age=2592000; Path=/; HttpOnly; SameSite=Lax`. No `SameSite=None`. No `Secure` on `http://localhost:5173`.
- Username-only register → `400 EMAIL_REQUIRED`. `acceptedMedicalDisclaimer` must be `true` or Zod `VALIDATION`. Successful register does **not** insert `profiles`.
- README spike is honest: cites [better-auth#8860](https://github.com/better-auth/better-auth/issues/8860), records the expected Free 10 ms CPU abort, states there is no wrangler log to invent, and does not schedule PBKDF2.
- Façade errors are `{ error: { code, message, details? } }`. TypeScript is strict (`exactOptionalPropertyTypes`); `tsc --noEmit` is clean.

Independent probe (not committed): sign-in via `/sign-in/email` and `/sign-in/username` both 200; stored `account.password` is scrypt `salt:key` hex, not PBKDF2; `/health` after `sqlite.close()` is still 200.

### Test run

Worktree, PATH prepended with `C:\Users\Timus97\.nodejs\node-v22.23.2-win-x64` (Node v22.23.2):

- `pnpm --filter api test` — **PASS** (1 file, **9** tests, vitest 3.2.7)
- `pnpm --filter api typecheck` — **PASS** (`tsc -p tsconfig.json --noEmit`, exit 0)

| Check | Result |
| --- | --- |
| `createAuth` scrypt default, `arise.session`, 30d, username plugin | PASS |
| Age 15 → `AGE_RESTRICTED`, zero rows | PASS |
| Invite fail-closed / mismatch | PASS |
| 401 on protected `GET /api/v1/me` | PASS |
| 501 worker without `ALLOW_WORKER_PASSWORD_AUTH` | PASS |
| `GET /health` no DB; `GET /ready` `SELECT 1` | PASS |
| `forget-password` 404 without SMTP | PASS |
| No `SameSite=None`, no PBKDF2, no onboarding/today/quests | PASS |
| README spike honest (`better-auth#8860`), no live Free deploy | PASS |
| Error shape `{ error: { code, message } }` on façade | PASS |
| TypeScript quality / typecheck | PASS |

### Issues

### Issue 1 -- Severity: suggestion
- **File**: apps/api/src/routes/auth.ts:46
- **Description**: Façade errors use `{ error: { code, message, details? } }`. Responses that fall through to `deps.auth.handler` keep Better Auth’s native body. Duplicate email is `422 {"message":"…","code":"USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"}`. `POST /api/v1/auth/request-password-reset` (BA’s current reset path, not the contracted `/forget-password`) is `400 {"message":"Reset password isn't enabled","code":"RESET_PASSWORD_DISABLED"}` when `SMTP_URL` is empty — the 404 guard only matches `/forget-password`.
- **Suggestion**: Map BA JSON `{ message, code }` to `{ error: { code, message } }` on the way out. Also 404 `/request-password-reset` (and `/reset-password`) when `SMTP_URL` is unset. Contracted AC path `/forget-password` already 404s.
- **Status**: open

### Issue 2 -- Severity: suggestion
- **File**: apps/api/src/auth.ts:61
- **Description**: `plugins: [username()]` is what §7 / ARISE-009 write. Plugin defaults are `maxUsernameLength: 30` and validator `^[a-zA-Z0-9_.]+$`. Domain `RegisterBody` is `.max(32)` and `^[a-zA-Z0-9_]+$`. A 31–32 character username passes the façade and then fails inside Better Auth. Dots are already rejected by Zod. Sign-in by username works (`/sign-in/username` → 200) but is not in the suite.
- **Suggestion**: `username({ maxUsernameLength: 32 })` so the plugin matches `RegisterBody`. Add one `app.request` sign-in-by-username case next to the existing session cookie test.
- **Status**: open

### Issue 3 -- Severity: suggestion
- **File**: (missing) apps/api/src/cli/reset-password.ts
- **Description**: §7 documents `pnpm --filter api exec tsx src/cli/reset-password.ts --identifier USER --password -` as the no-SMTP recovery path. ARISE-009’s file list and AC only require forget-password **404** without SMTP, which is implemented. Operators still have no committed CLI.
- **Suggestion**: Land the Node-only CLI in this PR or the next settings/export slice (DoD PR 12 also cites forget-password 404). Not required to PASS 08.
- **Status**: open

### Issue 4 -- Severity: nit
- **File**: apps/api/src/auth.ts:49-57
- **Description**: Design snippet (and this implementation) put cookie flags under `cookies.session_token.options`. Better Auth 1.3 reads `attributes`, not `options`. Effective cookie is still correct because BA defaults are `HttpOnly` + `SameSite=Lax` + `Path=/` and `useSecureCookies` already follows `appOrigin.startsWith("https")`. Probed `Set-Cookie`: `arise.session=…; Max-Age=2592000; Path=/; HttpOnly; SameSite=Lax`.
- **Suggestion**: Also set `attributes` (keep `options` if you want the design snippet to stay recognizable). No behavior change.
- **Status**: open

### Issue 5 -- Severity: nit
- **File**: apps/api/src/env.ts:11
- **Description**: `BETTER_AUTH_SECRET` is `z.string().min(16)`. Better Auth 1.3 warns below 32 characters and calls the test secret low-entropy. `.env.example` already says `openssl rand -base64 32`.
- **Suggestion**: Raise the Zod floor to 32 so boot fails closed on a short secret. Tests can use a 32-char dummy.
- **Status**: open

### Issue 6 -- Severity: nit
- **File**: apps/api/src/__tests__/auth.test.ts
- **Description**: Required surface is covered (401, age 15, invite fail-closed/mismatch, 501, forget-password 404, health/ready). Not asserted: disclaimer `false` → `VALIDATION` (works), health 31st hit → 429, `/ready` when `SELECT 1` throws → 503, age **16** allowed.
- **Suggestion**: Optional extras only. Do not block on them.
- **Status**: open

### Blocking count
0 blocking (bugs + must-fix)
