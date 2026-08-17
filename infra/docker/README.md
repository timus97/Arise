# Arise Compose runbook (v1 launch)

v1 launch is **Docker Compose on localhost / the operator’s machine**. There is **no Caddy**, **no TLS**, and **no custom domain**. Open `http://localhost:8080`.

`docker compose up --build` on a **fresh** `arise-data` volume is the v1 launch check. The image is `pnpm --filter api deploy --prod` plus `apps/web/dist` at `/app/web`. There is no stub `/health` app and no second web container.

## First run

From the repository root:

```bash
cp .env.example .env
# set BETTER_AUTH_SECRET and REGISTER_INVITE_CODE
# APP_ORIGIN=http://localhost:8080
# BETTER_AUTH_URL=http://localhost:8080
docker compose up --build
# open http://localhost:8080
```

Generate a secret with `openssl rand -base64 32`. `REGISTER_INVITE_CODE` is required in v1 (register is fail-closed if it is empty).

Set these in `.env` for the published port:

```bash
APP_ORIGIN=http://localhost:8080
BETTER_AUTH_URL=http://localhost:8080
```

Compose also injects `RUNTIME=node`, `SERVE_STATIC=true`, `WEB_DIST=/app/web`, and `DATABASE_PATH=/data/arise.sqlite`.

## What this is (and is not)

| In v1 | Not in v1 |
| --- | --- |
| One service `arise` | A `web` service, Caddy, or custom domain |
| Port `8080:8787` (HTTP) | TLS termination |
| Named volume `arise-data` → `/data` | Cloudflare Workers / Pages |
| Image `HEALTHCHECK` via `wget` `GET /health` | `wrangler.toml`, `deploy.yml`, `web.Dockerfile` |

Local/LAN uses the single container on **8080 (HTTP)**. `Secure` cookies stay off because `APP_ORIGIN` is `http://localhost:8080`.

## Backups

`backup-sqlite` (installed in the image) is spawned by Node cron at **`45 3 * * *` UTC**. It runs `sqlite3 .backup` into `/data/backups` and deletes copies older than 14 days. Copy `/data/backups` off-box (Syncthing, USB). D1 Time Travel is not a backup.

## Leaving D1 for Compose

```bash
npx wrangler d1 export arise-db --remote --output=/tmp/arise.sql
./infra/scripts/restore-d1-to-sqlite.sh /tmp/arise.sql /data/arise.sqlite
```

Password hashes transfer. Sessions may be invalid after the cookie host changes — users re-login. Do not share one live DB between topologies.

## Friends-and-family public overlay

Do **not** merge `docker-compose.yml` with `docker-compose.public.yml`. The localhost file pins `:8080` and publishes that port.

On the Oracle VM, after [`docs/dev/PUBLIC_ACCOUNTS.md`](../../docs/dev/PUBLIC_ACCOUNTS.md):

```bash
# .env must set ARISE_HOST, APP_ORIGIN=https://$ARISE_HOST, BETTER_AUTH_URL=same
docker compose -f docker-compose.public.yml up --build -d
# optional IP updater:
# docker compose -f docker-compose.public.yml --profile duckdns up -d
```

Caddy (`caddy:2-alpine`) listens on 80/443 and reverse-proxies `arise:8787`. Port 8787 stays off the public interface. Open 80 and 443 on the Oracle security list or Let’s Encrypt cannot issue.
