# Arise

System-window fantasy layer inspired by hunter-system fiction. Arise is an original product and is not affiliated with any publisher, studio, or licensed work.

**Docker Compose on localhost is the $0 v1 host.** That is the only supported v1 topology.

If the working folder still uses the previous trademark-risk name this repo replaced, rename it to `arise` before adding a remote.

## Setup

Requires Node.js 22.x and pnpm 9.15.0.

```bash
pnpm install
pnpm dev
```

Workspace scripts (via Turborepo): `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`. Playwright happy path: `pnpm --filter web test:e2e`.

## Launch (v1)

`docker compose up --build` on a **fresh** named volume is the only supported v1 host. No Caddy, no custom domain, no Workers Paid.

```bash
cp .env.example .env
# set BETTER_AUTH_SECRET, REGISTER_INVITE_CODE
# APP_ORIGIN=http://localhost:8080
# BETTER_AUTH_URL=http://localhost:8080
docker compose up --build
# open http://localhost:8080 → register (age ≥ 16) → onboarding → System window
```

Generate a secret with `openssl rand -base64 32`. Register is fail-closed if `REGISTER_INVITE_CODE` is empty.

One Node 22 container serves the Hono API and the static PWA on **8080** (`8080:8787`). Compose pins `APP_ORIGIN` / `BETTER_AUTH_URL` to `http://localhost:8080` so `Secure` cookies stay off. Refresh `/onboarding` must return the SPA, not 404.

Nightly UTC cron: retain + penalties at `15 3 * * *`; `sqlite3 .backup` at `45 3 * * *` into `/data/backups` (14-day retain). Copy `/data/backups` off-box (Syncthing, USB). **D1 Time Travel is not a backup.**

Friends on that origin (same machine, LAN, or Tailscale).

## Friends-and-family public (approved overlay)

Invite-only HTTPS for a few testers. Not open register. Not Workers / Vercel / app stores.

1. Create the two free accounts in [`docs/dev/PUBLIC_ACCOUNTS.md`](docs/dev/PUBLIC_ACCOUNTS.md) (Oracle Always Free VM + DuckDNS).
2. On that VM, clone this repo, fill `.env` with `https://yourname.duckdns.org` origins, then:

```bash
docker compose -f docker-compose.public.yml up --build -d
```

Caddy terminates TLS. Testers open the DuckDNS URL in Safari (iPhone) or Chrome (Android) and Add to Home Screen. Plan: [`docs/dev/PUBLIC_FF_HOSTING_PLAN.md`](docs/dev/PUBLIC_FF_HOSTING_PLAN.md).

## Medical notice

Arise is not a medical device and does not provide medical advice. Consult a qualified clinician before starting an exercise program.
