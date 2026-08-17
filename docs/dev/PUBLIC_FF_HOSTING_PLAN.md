# Arise — Friends-and-family public hosting plan

| Field | Value |
| --- | --- |
| **Status** | **Approved** 2026-08-17. Overlay files exist (`docker-compose.public.yml`). Waiting on Oracle + DuckDNS accounts. |
| **Audience** | Operator + Dev A/B before any public URL |
| **Contract** | `docs/design.md` rev 4 still wins until this plan is accepted |
| **Population** | 1–10 invited friends/family. Invite-only. Age 16+. |
| **Budget** | $0 recurring. One-time cheap domain optional (~$10/yr) if you want a stable name. |
| **Phones** | Installable PWA. **Not** App Store / Play Store. |

This is a **pre-deploy plan**, not a ticket to start coding. Accept the platform choice and the “must-do before DNS goes live” list first.

---

## 1. What we are actually shipping

Arise is already a **single Node 22 container**: Hono API + static PWA + SQLite file + two nightly crons (retain at `15 3 * * *` UTC, sqlite `.backup` at `45 3 * * *`). Sessions are host-only cookies (`arise.session`, `SameSite=Lax`, `Secure` only when `APP_ORIGIN` is `https://…`).

That stack **cannot** run on typical “free static/serverless” hosts. It needs:

| Need | Why |
| --- | --- |
| A long-lived **Node process** | scrypt password hash; Better Auth; in-memory rate limit |
| A **persistent disk** | SQLite at `/data/arise.sqlite`. Ephemeral disk = wiped users |
| **One HTTPS origin** | Cookies + PWA + CSP `connect-src 'self'` |
| Process stays **up at 03:15 UTC** | Nightly retain + backup. Sleeping PaaS skips cron |
| **Invite code** stays required | Fail-closed if `REGISTER_INVITE_CODE` empty |

Mobile in this plan means: friends open the HTTPS URL in Safari (iPhone) or Chrome (Android) and **Add to Home Screen**. The PWA already exists (`manifest.webmanifest`, service worker, outbox, apple-mobile-web-app meta). Native stores are v2: Apple $99/yr, Google Play $25, Capacitor, review, HealthKit — not free, not needed for 10 people.

---

## 2. Platforms — what is forbidden vs what works

### Hard no (will not work, even for a demo)

| Platform | Why it fails this repo |
| --- | --- |
| **Cloudflare Workers Free** | 10 ms CPU. scrypt sign-in aborts. Already spiked in `apps/api/README.md`. `worker.ts` returns 501 on purpose. |
| **Cloudflare Pages + a Worker** | Two origins. `SameSite=Lax` cookies will not attach. Design rejected this. |
| **Vercel / Netlify / GitHub Pages** | No persistent SQLite, no Node cron, no long-lived process. |
| **Render / Koyeb free web services** | Sleep after ~15 min. Cold start up to ~30 s. Disk is ephemeral unless you pay. Cron and first-open PWA both break. |
| **Fly.io (new accounts)** | Permanent free tier removed (2024). New orgs are pay-as-you-go. |
| **Railway “free”** | Trial credit, then billed. Not Always Free. |
| **Workers Paid ($5)** | Documented later option (§16.3) but **not free**, and it is a **D1 rewrite**, not “push the Compose image.” Skip unless you later choose to spend $5. |

Do **not** weaken scrypt to “make Workers Free work.” Dual-hash migrations for a 10-person URL are not worth it.

### Recommended (free, fits the app)

**Primary: Oracle Cloud Always Free VM + this repo’s Docker Compose + Caddy + Let’s Encrypt.**

| Item | Always Free (as of 2026-08) |
| --- | --- |
| Compute | Ampere A1 Flex: **2 OCPU / 12 GB RAM** (cut from 4/24; still enough) **or** 2× AMD micro (1 GB — too small to *build* the image) |
| Disk | ~200 GB block volume pool; one 50 GB boot volume is enough |
| Network | Public IPv4, security-list firewall |
| Cost | $0 if you stay inside Always Free shapes. Card often required at signup, then not charged. |

Why this wins:

- You run the **same** `docker compose up --build` that Sprint 6 already accepted.
- Persistent named volume → SQLite survives reboots.
- Process never sleeps → crons fire.
- Caddy (free) terminates TLS with Let’s Encrypt. One origin: `https://arise.example`.
- `better-sqlite3` is a **native** addon. Build **on the VM** so the image matches ARM. Do not export an amd64 image from the Windows laptop.

**Fallback if Oracle has no ARM capacity in your region (common):**

1. Keep trying another home region, or use the AMD micro **only as a runtime** after you build elsewhere (1 GB is tight for `pnpm install` + compile).
2. **Always-on home PC / mini PC + Cloudflare Tunnel** (`cloudflared`, Zero Trust free). No open ports. TLS from Cloudflare. Needs a **domain you control** for a stable hostname (`trycloudflare.com` URLs change every restart — not for testers).
3. Last resort: spend ~$5/mo on a tiny Hetzner/Netcup VPS. Still cheaper and more honest than fighting serverless.

### Domain (the one thing that is rarely $0)

| Option | Cost | Use |
| --- | --- | --- |
| **DuckDNS** (`something.duckdns.org`) | $0 | Good enough for friends. Let’s Encrypt works. |
| **sslip.io / nip.io** (`1-2-3-4.sslip.io`) | $0 | Tied to the public IP. Breaks if Oracle reassigns the IP. |
| Cheap `.dev` / `.app` / leftover domain on Cloudflare DNS | ~$10/yr | Best UX. Required if you pick Cloudflare Tunnel as primary. |
| Freenom | Dead | Do not use. |

Recommendation: **DuckDNS** to stay $0. Buy a domain later if the URL is annoying.

---

## 3. Target topology (accepted shape)

```text
iPhone Safari / Android Chrome / desktop
        │  HTTPS
        ▼
   Caddy :443  (Let's Encrypt)
        │  reverse_proxy 127.0.0.1:8787
        ▼
   arise container  (existing image)
        • Hono + static PWA
        • /data/arise.sqlite   (named volume)
        • cron retain + .backup
```

One public hostname. No second API subdomain. No Caddy serving a different origin than the Node app. Firewall: **22 (SSH, your IP only), 80, 443**. Never publish `:8787`.

Compose today **hard-pins** `APP_ORIGIN` / `BETTER_AUTH_URL` to `http://localhost:8080`. That pin is correct for LAN launch and **wrong** for public HTTPS. Public deploy must set both to `https://<your-host>` or cookies stay `Secure=false` and browsers will reject them on HTTPS (or the reverse: mixed origin, login appears to work then bounce).

---

## 4. Phones — PWA, not an “app store app”

### Why not native

| Path | Cost / work | Verdict |
| --- | --- | --- |
| **PWA Add to Home Screen** | $0. Already in the product (ARISE-020 + P2 copy) | **Do this** |
| Capacitor + Play Store | $25 + review + signing + wrappers | v2. Not for 10 people |
| Capacitor + App Store | $99/yr + review + IPv6/privacy nutrition | v2 |
| TWA / Play “bubblewrap” | Still a Play developer account | Skip |

HTTPS is **required** for installable PWA. Localhost was the exception. Public HTTP will not install.

### What already works in the repo

- Manifest name **Arise**, `display: standalone`, theme `#050816`
- Icons 192 / 512 / maskable 512
- `apple-mobile-web-app-capable`, title, status bar, `apple-touch-icon`
- Service worker + IndexedDB outbox (no `push` event — keep it that way)
- Settings install copy (P2): Add to Home Screen only. Never mention notifications.

### What testers actually do

**iPhone / iPad**

1. Open the HTTPS URL in **Safari** (Chrome on iOS is not WebKit-installable the same way).
2. Share → **Add to Home Screen**.
3. Launch from the icon (standalone). Opening the bookmark in Safari is a tab, not the “app.”
4. Limits to tell testers now: no push, no HealthKit, iOS may evict SW cache under storage pressure, first load needs network.

**Android**

1. Open in **Chrome**.
2. Menu → **Install app** / Add to Home screen, or the in-app install toast if you ship P2.
3. Works as a standalone TWA-like window. Back button and install UX are better than iOS.

### Small PWA hardenings before invite (optional but cheap)

- Serve a **180×180** `apple-touch-icon.png` (iOS prefers 180; 192 usually works).
- Confirm `start_url` / `scope` stay `/` on the public origin (they do).
- After HTTPS is live, test: install, kill the browser, reopen from icon, complete a quest, airplane-mode read of last today, outbox flush.
- Do **not** add Web Push / VAPID to “make it feel like an app.” That is PR 18b / v1.1.

---

## 5. Must-do before the hostname is public

Work is grouped. Do not skip the security block.

### A. Product / legal (same day, no code)

- [ ] Owner accepts: public URL is **invite-only friends-and-family**, not open register.
- [ ] Keep `REGISTER_INVITE_CODE` required and unguessable (random 20+ chars, not `arise` / `family`).
- [ ] One code for the group is fine; rotate if someone leaks it.
- [ ] Testers are **16+**. You are collecting email + optional health samples. Say that in the invite message. Export/delete already exist — tell them.
- [ ] Medical disclaimer is already on register. Do not claim the app treats anything.
- [ ] Write a 10-line privacy note in the invite: who operates it, data lives on your VM, backups, how to delete (Settings → delete).
- [ ] Pick a **support channel** (group chat). Password reset without SMTP is the CLI on the VM.

### B. Code / config (small, required)

- [ ] Stop hard-pinning `APP_ORIGIN` / `BETTER_AUTH_URL` to `http://localhost:8080` **or** add a compose overlay (`docker-compose.public.yml`) that sets `https://<host>`.
- [ ] Add a **Caddy** (or Caddy container) in front. HTTP→HTTPS. `reverse_proxy arise:8787`. Do not add a second web Dockerfile.
- [ ] `.env.example` documents public keys: `APP_ORIGIN`, `BETTER_AUTH_URL`, `REGISTER_INVITE_CODE`, `BETTER_AUTH_SECRET` (32+ bytes).
- [ ] Confirm `trustedOrigins` is only that HTTPS origin (already derived from `APP_ORIGIN`).
- [ ] Do **not** set `SameSite=None`. Do **not** enable CORS for a second frontend origin.
- [ ] Do **not** add `.github/workflows/deploy.yml`, `wrangler.toml`, or Workers auth.
- [ ] Optional: 180px Apple touch icon.
- [ ] Optional: SMTP (`SMTP_URL` / `SMTP_FROM`) via Resend/Brevo free tier so testers can reset passwords without you. Otherwise document the CLI.

Suggested compose overlay (do not implement until this plan is accepted):

```yaml
# docker-compose.public.yml — idea only
services:
  caddy:
    image: caddy:2-alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./infra/caddy/Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy-data:/data
    depends_on: [arise]
  arise:
    environment:
      APP_ORIGIN: https://YOUR_HOST
      BETTER_AUTH_URL: https://YOUR_HOST
    # no host port 8080 published
```

Caddyfile idea: `YOUR_HOST { reverse_proxy arise:8787 }`

### C. Oracle VM (operator)

- [ ] Create Always Free tenancy. Prefer **Ampere A1** one VM: 2 OCPU / 12 GB / 50 GB boot. Ubuntu 22.04 or 24.04.
- [ ] SSH **keys only**. Disable password auth. Restrict security list: SSH from your IP; 80/443 from `0.0.0.0/0`; **deny 8787**.
- [ ] `unattended-upgrades`, `fail2ban` on SSH, non-root sudo user.
- [ ] Install Docker Engine + Compose plugin.
- [ ] Clone `https://github.com/timus97/Arise.git` **on the VM**. `cp .env.example .env` and fill secrets **on the VM**. Never commit `.env`.
- [ ] `docker compose -f docker-compose.yml -f docker-compose.public.yml up --build -d` **on the VM** (ARM native build). First build needs the 12 GB box; do not try this on the 1 GB AMD micro.
- [ ] Point DuckDNS (or the domain) at the VM public IP. Enable Caddy auto-HTTPS.
- [ ] Confirm: `GET https://HOST/health` → 200; `GET https://HOST/onboarding` → SPA HTML; register with invite; refresh `/onboarding` still SPA.

### D. Data / backups (non-negotiable on a public box)

- [ ] Named volume stays. Nightly `.backup` already writes `/data/backups` (14-day retain).
- [ ] **Copy backups off the VM** daily. Free options: `rclone` to Oracle Object Storage Always Free, Backblaze B2 free 10 GB, or Syncthing/USB to your laptop. A VM wipe is not a backup.
- [ ] Practice restore once: new volume, copy snapshot, boot, sign in.
- [ ] Snapshot the boot volume in OCI before the first invite.
- [ ] No PHI in logs (already: JSON / Server-Timing only). Do not turn on debug logging in public.

### E. Auth / abuse

- [ ] `BETTER_AUTH_SECRET` is unique and ≥ 32 bytes. Not the laptop secret.
- [ ] Invite code not in the GitHub README, issues, or screenshots.
- [ ] Auth rate limit is **in-process** (10 / 60 s). Fine for 10 users, one container. Do not scale to two replicas — SQLite + memory limiter are single-process.
- [ ] `/health` is public (no DB). That is OK. Do not expose `/ready` as a marketing URL if you do not want uptime probes to hit SQLite; UptimeRobot should hit `/health`.
- [ ] Forget-password is **404** until SMTP is set. Tell testers to message you.

### F. Mobile QA (do this yourself before inviting)

On a **real** iPhone and a **real** Android, not only desktop DevTools:

- [ ] Register, six-step onboard, Issue today’s quests, complete one, XP up.
- [ ] Install to home screen; relaunch; session still valid.
- [ ] Settings → units, export download, log out, log in.
- [ ] Airplane mode: last today still readable; complete queues; reconnect flushes. `409 DAY_CLOSED` shows “the day closed.”
- [ ] Pregnancy dead-end on a throwaway account (delete only).
- [ ] CSV reject over 256 KB / 200 rows.
- [ ] Confirm no install copy mentions push / badges.

### G. Invite runbook

1. Operator account first (yours). Dogfood 1–2 days.
2. Send each person: HTTPS URL, invite code, age 16+, Safari/Chrome install steps, “no App Store,” “message me if locked out.”
3. Cap ~10 accounts. Compose + SQLite is the laptop-scale product; 10 is the design population.
4. After 14 days, use the addendum metrics (completion, install, one CSV path). Do not add features from that data.

---

## 6. What we will not do in this cut

- Open registration
- Custom Worker / Pages / `deploy.yml`
- Web Push, Bluetooth, Apple zip, HealthKit, Health Connect
- App Store / Play Store binaries
- Multi-region, load balancer, Postgres migration
- Weakening password hash
- Sharing one SQLite file between laptop Compose and the public VM

---

## 7. Risks (accept these)

| Risk | Mitigation |
| --- | --- |
| Oracle ARM capacity “Out of host capacity” | Retry other regions; fallback home+Tunnel or $5 VPS |
| Oracle reclaims / changes Always Free (they cut 4/24 → 2/12 in Aug 2026) | Off-box backups; you can restore to any Docker host |
| Public IP changes | DuckDNS updater cron; or reserve if still Always Free |
| Credit-card signup scare | Always Free is unlimited time if you stay in free shapes; watch the bill email anyway |
| iOS PWA cache eviction | Testers re-open on Wi‑Fi; outbox is best-effort |
| Shared family iPad | Existing IndexedDB warning in Settings |
| You become the on-call | CLI reset-password; keep SSH working; UptimeRobot on `/health` (free 50 monitors) |

---

## 8. Suggested implementation order (after this plan is accepted)

Do **not** start these until you say go. Each is a small PR.

| Step | Change | Deps |
| --- | --- | --- |
| 1 | `docker-compose.public.yml` + Caddyfile + README public-runbook. Keep localhost compose untouched. | — |
| 2 | `.env.example` public comments; origin no longer forced to `:8080` when overlay is used | 1 |
| 3 | Optional 180px Apple icon + one-page tester install card (Safari / Chrome) | — |
| 4 | Operator: provision Oracle, DuckDNS, first `up --build`, backup rclone | 1–2 |
| 5 | Operator: live phone QA on the public URL | 4 |
| 6 | Invite 1–10 people | 5 |

No Sprint 7 on the product board. This is an **ops overlay** on the finished v1.

---

## 9. Decisions (locked 2026-08-17)

| Decision | Choice |
| --- | --- |
| Platform | Oracle Always Free **or** home PC / GCP e2-micro / Hetzner if Oracle fails |
| Hostname | DuckDNS ($0) |
| Password reset | CLI on the VM (no SMTP vendor yet) |
| Phones | PWA only. No store apps |

Operator account steps: [`PUBLIC_ACCOUNTS.md`](./PUBLIC_ACCOUNTS.md).
