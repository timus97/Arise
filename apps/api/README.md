# Arise API

Hono + Better Auth on **Node**. v1 production entry is `src/node.ts` (`migrate()` → listen → `startNodeCron()` no-op). Browser traffic is same-origin via the Vite `/api` proxy (`APP_ORIGIN` / `BETTER_AUTH_URL` = `http://localhost:5173` in dev).

```bash
# from repo root
cp .env.example .env
# BETTER_AUTH_SECRET=$(openssl rand -base64 32)
# REGISTER_INVITE_CODE=...
pnpm --filter api dev
# http://127.0.0.1:8787  — browser never calls this; use Vite :5173
```

- `GET /health` — `{ ok, runtime, version }`, no DB, 30/min/IP in process memory
- `GET /ready` — `SELECT 1`, 503 if DB fails
- `POST /api/v1/auth/sign-up/email` — façade checks age ≥ 16, invite, disclaimer, then Better Auth (scrypt, username plugin)
- Session cookie name: `arise.session` (`HttpOnly`, `SameSite=Lax`, `Secure` only on https). Do not set `SameSite=None`.
- `POST /api/v1/auth/forget-password` is **404** unless `SMTP_URL` is set
- `RUNTIME=worker` without `ALLOW_WORKER_PASSWORD_AUTH=true` → `501 AUTH_RUNTIME_UNSUPPORTED`
- Do not create a `profiles` row at register (onboarding is a later PR)

## Workers Free spike (required)

Arise does **not** deploy password auth to Cloudflare Workers Free, and this PR does **not** leave a Free Worker running.

Better Auth’s default hasher is scrypt (`@noble/hashes`). Workers Free isolates have a **10 ms** CPU budget. Hashing or verifying a password with default scrypt is expected to abort with `Worker exceeded CPU time limit` — the [better-auth#8860](https://github.com/better-auth/better-auth/issues/8860) class of failure.

This worktree has no Cloudflare account/token wired for a live Free Worker deploy, so there is **no wrangler abort log to attach**. Inventing a log file would be dishonest. The expected abort, if someone did deploy `POST /api/v1/auth/sign-up/email` or `/sign-in/email` to a Free plan, is:

| Item | Value |
| --- | --- |
| Hasher | Better Auth default scrypt (not overridden) |
| Plan | Workers Free (10 ms CPU) |
| Expected | isolate CPU abort / `Worker exceeded CPU time limit` |
| Action | tear down the deploy immediately; do **not** switch to PBKDF2 |

v1 host is Node (Compose / `tsx`). Workers Paid (`ALLOW_WORKER_PASSWORD_AUTH=true`, `cpu_ms = 50`, D1 `auth_rl` as `secondaryStorage`) is a later option only. `src/worker.ts` exists so those routes can be compiled later; it is not the launch host.
