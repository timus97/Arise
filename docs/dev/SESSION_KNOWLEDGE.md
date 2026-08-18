# Arise — session knowledge

**Read this at the start of every session.**  
**Then read the gitignored host file:** `.grok/HOSTING.local.md` (IP, SSH, DNS, VM paths).  
**Update both before you stop if facts changed.**

Do not put server IPs, SSH keys, hostnames, invite codes, `BETTER_AUTH_SECRET`, DuckDNS tokens, or emails in *this* file. Those belong only in `.grok/HOSTING.local.md`.

| Field | Value |
| --- | --- |
| **Last updated** | 2026-08-18 (043 merged + public deploy) |
| **Phase** | v1 sprints **done**. Friends-and-family **public host is live**. |
| **GitHub** | https://github.com/timus97/Arise (`main` + overlay branch `feat/public-ff-host`) |
| **Local workspace** | `C:\Users\Timus97\Desktop\grokAnalysis\Arise` |
| **Host details** | `.grok/HOSTING.local.md` (**gitignored**) |

---

## How to maintain these files

1. Open `docs/dev/SESSION_KNOWLEDGE.md` (product/git/open work).
2. Open `.grok/HOSTING.local.md` (how to reach the server).
3. After deploy or log review: update **Current state**, **Open**, **Session log** here; update IPs/SSH/DNS only in the host file.
4. Never commit `.env`, invite files, SSH keys, or `HOSTING.local.md`.
5. Design contract is still `docs/design.md` rev 4. Public hosting is an **approved overlay**.

---

## What Arise is

Invite-only PWA: daily quests, XP/ranks E–S, SYSTEM chrome, manual + small CSV health. One Node 22 process (Hono + Better Auth scrypt + SQLite + static PWA). Age 16+. No App Store, no Play Store, no Web Push, no Workers Free, no open register.

Player surfaces: `/` SYSTEM, `/onboarding`, `/progress`, `/settings`.  
JSON dogfood (signed-in): `/api/v1/me/debug`.  
**No admin/user-list dashboard** exists. Oracle console = VM only.

---

## Current state (2026-08-18)

### Product / git

- Sprints 1–6 (ARISE-001–025) are **Done** on `origin/main`.
- **Merged:** PR #26 (`feat/ARISE-043-exercise-guides` → `main`) at `0064de2`. Includes yoga/gym catalog, text guides, and travel/sick status (026–030).
- Public overlay `feat/public-ff-host` is at `a0a7cf2` (043 merged in) and **deployed**.
- Local extras not on GitHub: `docs/ux/`, `data/`, `.grok/`, `.playwright-mcp/`.

### Public host (live)

Reachability, SSH, DNS, and VM paths: **`.grok/HOSTING.local.md`** (gitignored).

Topology in-repo: `docker-compose.public.yml` + Caddy. Overlay branch `feat/public-ff-host`. DuckDNS updater not running. Firewall: 22/80/443 only.

### Live product data (no PII)

Last log/DB check ~2026-08-17 14:48 UTC:

- 2 users, 2 sessions, 2 completed onboardings, 2 plans (14 plan days).
- First account: `last_ensured_local_date = 2026-08-17`, **4 quests issued**, **0 completed**, XP 0, rank E Initiate.
- Issued templates: `str_gym_full_body_l2`, `steps_8k`, `mob_tspine`, `habit_sleep_window`.
- Second account: onboarded, **not** ensured today.
- Owner iPhone: registered, Add to Home Screen, session cookie works in standalone.

### What “fine” looks like

HTTPS `/health` 200, `/register` 200, `/onboarding` SPA. Exact URL and SSH commands are in `.grok/HOSTING.local.md`.

---

## Decisions locked this effort

| Decision | Choice |
| --- | --- |
| Public host | Oracle Always Free VM + Caddy + DuckDNS (not Workers/Vercel/Render) |
| Phones | PWA Add to Home Screen only |
| Password reset | SSH CLI (no SMTP yet) |
| Open register | No. Invite-only |
| Admin dashboard | Out of scope for now |

Oracle signup failed once; operator later used a working Always Free VM (details in the host file).

---

## Open

- [ ] Merge `feat/public-ff-host` to `main` (PR + `ci` check) so the VM clone can track `main`.
- [ ] Optional: DuckDNS sidecar so an Oracle IP change does not break the name.
- [ ] Optional: UptimeRobot on `/health`.
- [ ] Optional: delete the spare second account if the owner does not want it.
- [ ] Owner has not completed a quest yet (XP still 0).
- [ ] Off-box copy of `/data/backups` still not set up.
- [ ] `docs/ux/` still local-only.
- [ ] Sprint board header still says Sprint 6 “In progress” in one place (body says Done).
- [ ] Playwright onboard fixture date `2026-12-01` will fail the loss-rate gate around late Oct 2026.
- [ ] Phone “app” without stores: **PWA is the app.** Plan in `docs/dev/PWA_OTA_PHONE_PLAN.md`. Harden OTA (`skipWaiting` + Reload banner) when owner says go. No Capacitor / stores / iOS sideload.
- [ ] PO/BA scan: `docs/product/COMPETITIVE_FEATURE_SCAN.md`. Not a backlog. Owner has not picked any next-cut features yet.
- [x] Wave 1 activity status (026–030) merged to `main` in PR #26 and deployed on the public host.
- [ ] **Next cut remaining:** health sync waves 2–5 in `docs/backlog/NEXT_CUT_STORIES.md`. Live HealthKit/Fit from the PWA is **not** possible; waves 3–5 are zip / OAuth / native.
- [x] Catalog + text guides (043–044, 047–048) merged to `main` (PR #26) and deployed. No `yoga_box_hold`. Full-body gym first; muscle-specific at exp ≥ 3 or player level ≥ 10. Age > 45 skips knees-heavy work. Sanskrit on yoga cards. Already-issued days keep their old templates until the next Issue / next local date.
- [ ] Guide stills (ARISE-045/046) not started. No video.

---

## Do not do

- Deploy to Cloudflare Workers Free / Pages / Vercel / Netlify / sleeping PaaS.
- Weaken scrypt. Add Web Push. Open register. App Store / Play.
- Commit `.env` or invite/secret material.
- Hard-pin public compose to `http://localhost:8080`.
- Treat Oracle graphs as an app dashboard.

---

## Key local / remote docs

| Doc | Role |
| --- | --- |
| `docs/design.md` | Locked v1 contract |
| `docs/backlog/SPRINT_BOARD.md` | Story status |
| `docs/dev/PUBLIC_FF_HOSTING_PLAN.md` | Approved public hosting plan |
| `docs/dev/PUBLIC_ACCOUNTS.md` | Operator account setup (Oracle was optional after it failed) |
| `docker-compose.public.yml` | Live topology |
| `infra/caddy/Caddyfile` | TLS vhost `{$ARISE_HOST}` |
| `infra/scripts/public-first-boot.sh` | VM bootstrap |
| `.grok/HOSTING.local.md` | **Gitignored** server IP, SSH, DNS |

---

## Session log

Newest first. One line per meaningful turn.

| When | What happened |
| --- | --- |
| 2026-08-17 | Catalog expansion review: 11 yoga + 16 muscle-specific gym ids (`CATALOG_EXPANSION_REVIEW.md`). Stories 047–049. Waiting on owner marks. |
| 2026-08-17 | Exercise guide plan + full 16-template review for owner check (`EXERCISE_GUIDE_PLAN.md`, `EXERCISE_GUIDE_REVIEW.md`, stories 043–046). |
| 2026-08-17 | Implemented Wave 1 activity status (026–030) on `feat/ARISE-026-activity-status`: GET/PUT `/me/activity-status`, issuer travel/sick, Settings + SYSTEM UI. |
| 2026-08-17 | Planned activity status + health sync: `STATUS_AND_HEALTH_SYNC_PLAN.md` + stories 026–042. Wave 1 (travel/sick) first. Automatic Apple/Google live sync is not a PWA feature. |
| 2026-08-17 | Spawned PO/BA agent. Wrote `docs/product/COMPETITIVE_FEATURE_SCAN.md` (research, not a backlog). Top soon-polish: OTA Refresh toast, any-pace copy, commitment contract, complete reflection. |
| 2026-08-17 | Wrote `docs/dev/PWA_OTA_PHONE_PLAN.md`: Home Screen PWA is the no-store iPhone/Android app; OTA = SW + redeploy; native wrappers rejected. |
| 2026-08-17 | Moved server/SSH/DNS facts into gitignored `.grok/HOSTING.local.md`. |
| 2026-08-17 | Created this session knowledge file. |
| 2026-08-17 | Rechecked host: both users onboarded; first account issued 4 quests; no completions. Explained there is no admin dashboard; use in-app Progress + SSH + `/api/v1/me/debug`. |
| 2026-08-17 | Owner registered on iPhone, added to Home Screen. Logs: signup + session + onboarding OK; scanner hits on `/.env`; one failed login; second signup created extra account. |
| 2026-08-17 | Operator said DNS + ports done. Caddy restarted. Let’s Encrypt issued. HTTPS `/health` 200. |
| 2026-08-17 | SSH to the Oracle VM worked. Installed Docker, cloned overlay branch, wrote `.env`, `compose up --build`. Cert failed until DuckDNS left the home IP and OCI allowed 80/443. |
| 2026-08-17 | Operator provided Oracle SSH + DuckDNS name (now only in the host file). |
| 2026-08-17 | Oracle signup “not working” → documented fallbacks (home PC, Tailscale, GCP e2-micro, Hetzner). Operator later used Oracle anyway. |
| 2026-08-17 | Plan approved: public F&F host, free tools, PWA for phones. Wrote hosting plan + `PUBLIC_ACCOUNTS.md` + public Compose overlay. |
| 2026-08-17 | Audit: all v1 sprints done on `origin/main`. Public prod was out of v1; owner reopened it for friends/family. |

---

## Next session — start here

1. Read this file and `.grok/HOSTING.local.md`.
2. If they want host work: SSH using the host file, then `docker compose ps` and `/health`.
3. If they completed a quest: confirm `xp_events` and quest `status` in SQLite.
4. If they want a PR: open PR for `feat/public-ff-host` into `main`.
5. Update this log (and the host file if IP/DNS/SSH changed) before ending.
