# Arise — Plan Addendum (completes the v1 plan)

| Field | Value |
| --- | --- |
| **Status** | Additive to revision 4. Does **not** amend locked decisions in [`docs/design.md`](../design.md) |
| **Date** | 2026-08-15 |
| **Audience** | Implementers of PRs 01–20 and friends-and-family operators |
| **Inputs** | [`COMPETITOR_ANALYSIS.md`](./COMPETITOR_ANALYSIS.md), [`FEATURE_DECISIONS.md`](./FEATURE_DECISIONS.md) |

This file finishes the product plan. If this addendum and `docs/design.md` appear to conflict, **design.md wins**. Do not implement v1.1 or v2 work from the competitor research.

---

## 1. Product goal (one paragraph)

Generic trackers log what already happened. Arise tells the user **what to do today** in an original holographic SYSTEM register they will actually open, then **rewrites today** when sleep, steps, or fatigue say the original prescription is wrong. v1 is an invite-only Progressive Web App on the operator’s machine (`docker compose up --build` → `http://localhost:8080`): sixteen rule-based templates, email+password, age 16+, manual and small-CSV health, safe easy penalties, pregnancy hard-stop, PAR-Q, and an implied fat-loss-rate gate. Success is friends and family completing real days — not a public hunter-system clone, not a social gym logger, and not a diet coach.

---

## 2. Locked v1 scope (do not reopen)

Owner-accepted 2026-08-14. Competitor research does **not** reopen these.

| Locked | Meaning |
| --- | --- |
| Host | Docker Compose on localhost / operator machine only. No Cloudflare, no custom domain, no Caddy TLS. |
| Identity | Invite-only (`REGISTER_INVITE_CODE` fail-closed). Age 16+ at register (zero rows if under). Email required + password. Better Auth scrypt. Username optional alias. |
| Planner | Rule-based. Exactly the **16** Appendix A templates. No LLM. No CMS. |
| Health | Manual + CSV ≤ 256 KB / 200 rows. Stubs throw `unavailable_web`. |
| Client | PWA. Offline **read** of last today + outbox. **No** Web Push, no Bluetooth, no native stores. |
| Social / money / ads | Off. No feed, parties, guilds, leaderboards, IAP, or ads. |
| Safety over lore | Pregnancy hard-stop, PAR-Q whitelist, implied loss > 1% BW/week rejected, easy penalty walk, persistable effect windows, rest-day enforcement. |
| Brand | Product name **Arise**. Chrome says **SYSTEM**. No licensed hunter IP, character names, or official art. |
| Effort grain | `full` \| `partial` only. No set-by-set log. |

PR 20 acceptance is unchanged: fresh volume, register at `http://localhost:8080/register`, onboarding deep-link refresh is the SPA.

---

## 3. Approved polish items (implementers — short, testable)

These are `adopt-v1-polish` from `FEATURE_DECISIONS.md`. They ship **inside** existing UI PRs (13.1, 14, 15, 16, 18a). No new backend surface.

| ID | Item | Test |
| --- | --- | --- |
| P1 | **Skip-consequence copy** | Complete-sheet skip: each reason states streak freeze vs fail *before* confirm. `busy` names the 3rd-in-week fail. `illness` names the 2-day → tomorrow rest effect. `pain` names 24 h no-hard. |
| P2 | **PWA install education** | On a mobile viewport, Settings and first System visit show Add-to-Home-Screen steps. Copy never mentions push, badges, or “we’ll remind you.” |
| P3 | **CSV template discoverability** | Settings → Health and the empty importer both offer the template download plus one sample row and a sentence that Apple / Samsung / Health Connect data arrives by **user export**, not live sync. |
| P4 | **Recovery-rewrite banner** | If yesterday’s sleep, today’s steps residual/auto, `caution_volume`, or recovery-gated intensity changed the issued day, System shows one factual banner naming the cause. Uses existing `recoveryParts` / `modifiersApplied` / effects. |
| P5 | **Empty / `needsEnsure` System** | When `needsEnsure: true` or `quests: []` before ensure, primary CTA is “Issue today’s quests.” The window must not look like a crash. |
| P6 | **Penalty-card honesty** | `penalty_easy_walk` card states it is an easy walk (RPE ≤ 4), not extra hard volume. Red flavor allowed; prescription stays easy. |
| P7 | **PAR-Q / pregnancy / loss-rate copy** | Pregnancy 403 is a dead-end with Delete account only. Unsafe loss rate shows `maxKgPerWeek` and “relax date or target,” **no calorie numbers**. Other PAR-Q yeses explain easy-only whitelist. |
| P8 | **Health-platform + shared-device honesty** | Settings states: no live Apple Health / Health Connect / Google Fit; large Apple zip is not v1; do not install on a shared phone if queued health in IndexedDB matters. |
| P9 | **Partial + rank-gate + auto-complete explainers** | Complete sheet: partial = ≥ half the work, 50% XP. Rank tooltip: B/A/S need completion rates (S also `penaltyPoints30d < 8`). Auto-complete toast names steps or sleep. |
| P10 | **Rest/habit quests are real work** | Sleep, breath, and rest cards read as issued SYSTEM work (SuperBetter power-up tone), not a consolation prize. `suggestRegenerate` is a visible button only when the flag is true. |

**Out of polish:** any new template, table, route, push permission, Bluetooth prompt, Apple zip parser, diet field usage, or social flag.

---

## 4. Explicitly deferred (do not implement now)

### v1.1 (later design; not this launch)

- Apple Health `export.zip` / XML in a web worker (25 MB uncompressed cap, last 30 days).
- Web Push on **Node cron only** (cap 10 sends/tick). Not Workers Free. Not PR 18a.
- Habit-learning auto-regenerate (skip-pattern).
- Catalog growth beyond 16; reading `quest_templates`.
- Encrypted-backup / off-box copy UX beyond the existing sqlite `.backup` cron.

### v2

- Capacitor + live HealthKit / Health Connect (store fees).
- Optional LLM draft validated by `safety.ts`.
- Magic link if SMTP exists.

### Rejected (not a backlog)

- Social feed, parties, guilds, leaderboards (Hevy, Habitica, Solo Hunter).
- Set-by-set logging, rest timers, Watch apps (Strong, Hevy, Fitbod).
- Nutrition / macros / TDEE / food log (MacroFactor, Caliber).
- Human coaching marketplace (Future, Caliber).
- GPS, audio drama, zombie chases (Zombies, Run!).
- Punishment workouts / timed penalty zones (Solo Hunter).
- Web Bluetooth / live HR theater.
- LLM coach in v1 (Freeletics Coach+).
- Ads, IAP, subscriptions.
- Custom domain / Cloudflare / Caddy TLS.
- Licensed hunter IP, character names, official art.
- Medical or mental-health treatment claims (SuperBetter-as-therapy).
- Wearable calorie burn as truth; any calorie numbers in chrome.

---

## 5. Competitive positioning

**One line:** Arise tells you what to do today, rewrites today from sleep/steps/fatigue, wears SYSTEM chrome, and costs $0 to Compose.

| We are | We are not |
| --- | --- |
| A private daily prescription that changes when the body data says so | Habitica (a todo RPG with pets and party damage) |
| Rule-based, 16 honest templates | Freeletics / Fitbod “AI” with a thousand exercises |
| Easy-walk penalties and skip-freeze | Solo Hunter penalty zones or Habitica HP death |
| CSV-honest about Apple / Google / Samsung | A fake HealthKit integration |
| Safety-first (pregnancy, PAR-Q, loss rate) | A diet app (MacroFactor) or a $199 coach (Future) |
| Original SYSTEM chrome on localhost | A *Solo Leveling* client or the commercial store app also named Arise |

**How we talk about the name collision:** a store app titled “Arise: Level Up In Real Life” already exists. We do not match their art, copy, paywall, or package id. Our chrome says SYSTEM. CI `FORBIDDEN.txt` stays the mitigation. We do not discuss their product in-app.

---

## 6. Success metrics — friends-and-family launch

Launch population: **1–10** invited people on the operator’s Compose origin (same machine, LAN, or Tailscale). Not a public URL. Not a store.

### Qualitative (operator journal after day 7)

- A non-engineer can register with the invite, finish all six onboarding steps, and **see today’s quests** without a Slack call.
- After a poor-sleep or high-step day (manual or CSV), the user can **point at the banner or the shrunken walk** and say why today changed.
- Skip for illness or pain feels like a freeze, not a scolding. The penalty card is understood as an easy walk.
- Nobody believes push, Apple Watch sync, or a food log exists.
- SYSTEM chrome never needs a licensed-fiction explanation.

### Quantitative (count from `GET /progress` + operator notes; no analytics vendor)

| Metric | Target (friends-and-family, first 14 days) |
| --- | --- |
| **7-day completion** | ≥ **50%** of dated days with at least one required quest have all required quests `completed` \| `partial` \| `auto_completed`. (Same definition as rank completion rate.) |
| **Install** | ≥ **half** of active testers add the PWA to the home screen (self-report or `display-mode: standalone` dogfood). Desktop-only testers count as installed if they bookmark `http://localhost:8080` / the LAN origin and use it as the daily surface. |
| **Invite conversion** | ≥ **70%** of issued invite codes that are *attempted* produce an age-16+ account that **finishes onboarding** (`onboarding_status = complete`). Failed under-16 attempts must leave **zero** user rows (safety check, not a conversion fail). |
| **Health path used** | ≥ **1** tester successfully imports the CSV template (or equivalent manual steps + sleep) and sees an auto-complete or residual-steps change. |
| **Safety path unused-but-ready** | Pregnancy and unsafe-loss-rate screens are reachable in a staging account and do **not** create a plan. |

**Do not** optimize for DAU charts, viral invites, XP inflation, or store ratings. If 7-day completion is &lt; 30% for a tester with ≥ 7 dated days, the existing `suggestRegenerate` button is the intervention — not a new feature.

---

## 7. Implementer rules

1. Do not open tickets for the deferred or rejected lists during PRs 01–20.
2. Polish copy stays English, dark SYSTEM, no calorie numbers, no licensed marks.
3. If a polish idea needs a migration, it is not polish — park it.
4. Safety copy can be blunt. Lore cannot override `safety.ts`.

---

*End of plan addendum. Together with `docs/design.md` rev 4 this is the v1 contract.*
