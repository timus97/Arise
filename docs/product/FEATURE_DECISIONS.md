# Arise — Feature Decisions

| Field | Value |
| --- | --- |
| **Status** | Owner-accepted for v1 implementers |
| **Date** | 2026-08-15 |
| **Design contract** | [`docs/design.md`](../design.md) revision 4 — **locked** |
| **Evidence** | [`COMPETITOR_ANALYSIS.md`](./COMPETITOR_ANALYSIS.md) |
| **Plan completion** | [`PLAN_ADDENDUM.md`](./PLAN_ADDENDUM.md) |

Verdicts below do **not** reopen Compose-on-localhost, invite-only, age 16+, 16 templates, manual+CSV, PWA-without-push, or the no-LLM / no-social / no-native-health cut.

## Verdict legend

| Verdict | Meaning | Implement now? |
| --- | --- | --- |
| `already-in-v1` | Specified in `docs/design.md`. Build it as written. | Yes (it is the v1 cut) |
| `adopt-v1-polish` | UX / copy / empty-state only. **No** new tables, APIs, templates, push, LLM, social, or native health. | Yes, inside existing PRs (especially 14–18a, 13.1, 15, 16) |
| `v1.1` | Designed later. Do not implement, sneak, or “just add the table.” | **No** |
| `v2` | Native, LLM, or a second product. | **No** |
| `reject` | Will not ship. Do not file as a nice-to-have in a v1 PR. | **No** |

`adopt-v1-polish` is allowed only when a QA person can test it on the existing `/me/today`, onboarding, settings, or health screens without a migration.

---

## Decision table

| Feature | Source | Verdict | Why |
| --- | --- | --- | --- |
| Issued daily quests (“what to do today”) | Fitbod session; Freeletics coach; SuperBetter quests; hunter-system dailies | already-in-v1 | Core product. Issuer + 16 templates. |
| XP, level curve, ranks E→S, titles | Habitica leveling; hunter-system ranks | already-in-v1 | Closed-form XP/rank in §9.7. Titles are Initiate…Sovereign — **not** licensed epithets. |
| Five stats (`str agi vit intl sta`) | Habitica stats; Solo Hunter 5 attributes | already-in-v1 | Ours are training stats, not gold/XP multipliers. Key is `intl`, never `int`. |
| Streak + best streak | Habitica Daily streaks; Solo Hunter streak | already-in-v1 | Completing required quests ticks; skip freeze vs midnight fail already specified. |
| Midnight fail of leftover `issued` quests | Habitica Cron; hunter “penalty system” | already-in-v1 | `ensure` catch-up. Unissued days are not fails. |
| Easy penalty walk (RPE ≤ 4, ≤ 20 min) | Habitica damage; Solo Hunter Penalty Zone (as **anti-pattern**) | already-in-v1 | Safety over lore. Completing it is 10 XP, not rank farming. |
| Skip `illness` / `pain` / `rest_planned` freezes streak | Habitica Inn / Pause Damage; Future “move without penalty” | already-in-v1 | Plus persistable `illness_rest` / `pain_no_hard`. |
| Skip `busy` → 3rd in ISO week becomes fail | Habitica missed Daily; Future flexibility (we are stricter) | already-in-v1 | Honesty: chronic “busy” is a fail, not a freeze farm. |
| Partial complete = 50% XP if user attests ≥ half | Habitica Daily checklists | already-in-v1 | Client-declared `effort`. No set log. |
| Recovery score rewrites intensity / volume | Fitbod fatigue; Freeletics adapt; Arise differentiator | already-in-v1 | `computeRecovery` + `recoveryFit` + `volumeMul`. Neutral if wearables missing. |
| Step auto-complete + residual shrink | Health platforms as ingest; Fitbod “don’t redo work” | already-in-v1 | `planModifiers` `auto_steps` / `steps_residual`. |
| Sleep window auto-complete (360–540 min) | SuperBetter power-up legitimacy; health ingest | already-in-v1 | `habit_sleep_window` + `auto_sleep`. |
| Equipment-aware catalog | Fitbod toggles; Caliber home/DB/gym; Freeletics bodyweight | already-in-v1 | Four equipment values. No benches. |
| Injury contraindication filters | Future injury record; Caliber assessment | already-in-v1 | Knee/shoulder/spine/wrist keys on templates. |
| PAR-Q + pregnancy hard-stop | Caliber intake; medical liability (ours) | already-in-v1 | `PREGNANCY_HARD_STOP` dead-end + delete. Other yeses → easy whitelist. |
| Implied fat-loss rate > 1% BW/week rejected | MacroFactor rate-of-loss control; Caliber nutrition (we take the **gate only**) | already-in-v1 | `UNSAFE_LOSS_RATE`. No calorie UI. |
| Manual health + CSV ≤ 256 KB / 200 rows | Strong CSV; Health Connect export reality | already-in-v1 | Only live adapters. |
| Native adapter stubs + honest Settings | Apple Fitness+ / HealthKit; Health Connect; Samsung | already-in-v1 | Throw `unavailable_web`. Do not fake sync. |
| PWA install, offline read, completion outbox | vs native stores (all of the above) | already-in-v1 | No `push` handler. |
| JSON export + account delete | Strong/MacroFactor export; GDPR | already-in-v1 | `GET /me/export`, `POST /account/delete`. |
| Manual plan regenerate | Freeletics “swap today”; Future reschedule | already-in-v1 | `POST /plan/regenerate`. No habit-learning auto-regen. |
| `suggestRegenerate` flag when 7-day completion < 30% | Habitica “you overcommitted”; Future coach check-in | already-in-v1 | Flag + **button** only. Auto-regen is v1.1. |
| Disclaimer on every System payload | All medical-adjacent apps; our safety table | already-in-v1 | Not a medical device. |
| Invite-only register, age 16+, email+password | Category is 16+ fiction-adjacent; Habitica is all-ages todo | already-in-v1 | Fail-closed invite. Zero rows if age < 16. |
| Skip-reason consequence copy **before confirm** | Habitica Inn explainer; Future no-shame skip | adopt-v1-polish | Modal lists: rest/illness/pain → streak freeze; illness 2-day → tomorrow rest; pain → 24 h no-hard; busy 3rd → fail + penalty path. No new fields. |
| Streak-freeze / “Inn” empty-state on rest or illness days | Habitica Rest in the Inn | adopt-v1-polish | Rest/`illness_rest` System window says the streak is held, not broken. Uses existing `user_effects` + planDay. |
| Penalty card honesty | Solo Hunter timed punishment (**reject their mechanic**); our easy walk | adopt-v1-polish | Card subtitle: easy walk, RPE ≤ 4, not extra hard volume. Flavor may be red; prescription stays easy. |
| Recovery-rewrite banner | Fitbod heatmap “why not chest”; Freeletics adapt | adopt-v1-polish | If `recoveryParts` or `modifiersApplied` changed the day, one banner: sleep / steps / fatigue / caution. Read-only from today payload. |
| Auto-complete toast (steps / sleep) | Health ingest; SuperBetter “quest complete” | adopt-v1-polish | When status is `auto_completed`, toast names the metric. No new endpoint. |
| Residual-steps prescription copy | Fitbod “don’t redo”; our `steps_residual` | adopt-v1-polish | Block name already “Remaining steps” — show counts and that the walk shrank. |
| Rest / breath / sleep quests framed as required SYSTEM work | SuperBetter power-ups | adopt-v1-polish | Flavor + empty-state: these are issued work, not a consolation prize. Still required for streak except existing penalty exception. |
| Partial-effort explainer on complete sheet | Habitica checklists | adopt-v1-polish | “Full = all blocks. Partial = you did at least half. Partial is 50% XP.” |
| Rank-gate tooltip | Hunter apps that rank by XP only (anti-pattern) | adopt-v1-polish | B/A/S copy states completion-rate (and S penalty) gates from §9.7. No new math. |
| Unsafe-loss-rate onboarding copy | MacroFactor rate picker; our hard-stop | adopt-v1-polish | Show `details.maxKgPerWeek` and “relax date or target.” No calorie numbers. |
| PAR-Q + pregnancy dead-end copy | Caliber/Future intake; our 403 | adopt-v1-polish | Clinician language already in API message. UI: no retry loop; Delete account CTA; Settings only for delete. |
| PWA install education (no push) | vs App Store / Play on every competitor | adopt-v1-polish | Settings + first mobile System visit: iOS Add to Home Screen / Android install. Explicitly **no** notification promise. |
| CSV template discoverability | Strong export; Samsung/Health Connect CSV reality | adopt-v1-polish | Settings Health: download template, one sample row, “export from your phone then map columns.” Link next to empty importer. |
| Health-platform honesty blurb | Apple / Google Fit sunset / Samsung / Health Connect | adopt-v1-polish | Settings: live Apple Health / Health Connect need a future native wrapper; large Apple zip not in v1; Google Fit APIs are dying; use CSV. Already specified — **must be visible**, not a comment. |
| Shared-device IndexedDB warning | Strong/MacroFactor privacy; our threat table | adopt-v1-polish | Settings sentence as specified in design §11. |
| `needsEnsure` empty System | Fitbod “start workout”; hunter “accept quest” | adopt-v1-polish | Primary CTA issues today. Do not look broken when `quests: []`. |
| `suggestRegenerate` button copy | Habitica overcommit; our flag | adopt-v1-polish | Visible iff flag true. Copy: manual rewrite of the week; history stays. Calls existing `POST /plan/regenerate`. |
| Invite-field helper | Category paywalls (commercial Arise) vs our invite | adopt-v1-polish | Register: code required; wrong code 403; missing env is operator fail-closed — user sees a clear invite error, not a blank 500. |
| First-week SYSTEM legend | SuperBetter onboarding; hunter apps that dump lore | adopt-v1-polish | One dismissible panel: quest, XP, rank, streak freeze vs fail. No new mechanics. |
| Offline / day-closed copy | PWA outbox; 409 `DAY_CLOSED` | adopt-v1-polish | “The day closed” as specified. Do not retry forever. |
| Set-by-set / reps-weight log | Strong, Hevy, Fitbod | reject | KD 22. New tables/API. Not polish. |
| In-workout rest timer / Watch haptics | Fitbod, Strong, Hevy, commercial Arise | reject | Needs a live session surface + native. |
| Exercise video library | Hevy, Future, Fitbod, Freeletics | reject | Asset pipeline, CDN, not localhost-$0. |
| Custom user-authored quests as the product | Habitica Habits/Dailies/To-Dos; Solo Hunter custom goals | reject | We prescribe. A notes field on complete/skip already exists. |
| Gold, shop, pets, gear, drops | Habitica; Solo Hunter inventory | reject | Economy + CMS. Lore bloat. |
| HP, death, permadeath | Habitica | reject | Shame loop; we fail the day and issue an easy walk. |
| Party, boss raid, shared damage | Habitica parties | reject | Social + harassment + extra backend. |
| Follow feed, likes, comments, public PRs | Hevy | reject | Social non-goal. |
| Guilds, leaderboards, global rank | Solo Hunter; Habitica | reject | Multi-tenant social. Design §15: no leaderboards. |
| Timed “penalty zone” / punishment workout | Solo Hunter Penalty Zone | reject | Liability. Conflicts with safety-over-lore. |
| GPS missions / zombie chases / audio drama | Zombies, Run! | reject | Native location, studio audio, their IP. |
| Live HealthKit / Health Connect / Google Fit API | Apple Fitness+, Samsung, Google | reject | Impossible in a v1 PWA. Fit APIs sunset end-2026. Stubs only. |
| Web Bluetooth / live HR theater | Wearables; some hunter apps | reject | Locked non-goal. Flag stays false. |
| Apple Health `export.zip` / XML parse | Apple Health | v1.1 | Design: web worker, zip WASM, 25 MB uncompressed, last-30-days. Not now. |
| Web Push / VAPID / iOS push education | Every native habit app | v1.1 | Node cron only, cap 10/tick. No Workers Free. Do not merge into PR 18a. |
| Habit-learning auto-regenerate | Fitbod learn; Freeletics feedback | v1.1 | v1 uses onboarding week + manual regenerate. |
| Catalog beyond 16 templates | Fitbod/Freeletics libraries | v1.1 | `quest_templates` table reserved empty. |
| Encrypted backup / off-box copy UX | Strong/MacroFactor data ownership | v1.1 | sqlite `.backup` already operator-side; extra UX later. |
| LLM / generative coach | Freeletics Coach+; Fitbod “AI” | v2 | Nondeterminism + cost. Optional draft → `safety.ts` only in v2. |
| Capacitor + HealthKit / Health Connect live | Apple / Samsung / Google as real ingest | v2 | Store fees. Typed stubs stay until then. |
| Magic-link email auth | Future/Caliber polish | v2 | Only if SMTP exists. Password+CLI remains v1. |
| Human 1:1 or group coaching | Future, Caliber | reject | Different company. Monetization: none. |
| Food log, macros, TDEE, barcode, photo-AI meals | MacroFactor; Caliber nutrition | reject | Second product. Eating-disorder surface. `dietPreference` stays unused. |
| Wearable calorie burn as training truth | Fitness+ / watch rings (implicit) | reject | MacroFactor is right: it is a bad signal. We do not show calories. |
| Fitness+ style classes / rings / competitions | Apple Fitness+ | reject | Studio + social + native. |
| Ads, IAP, subscription paywall | Commercial Arise; Freeletics Coach; Habitica gems | reject | v1 monetization is none. Invite-only localhost. |
| Custom domain, Caddy TLS, Cloudflare, Workers Paid | Hosting reality of every public app | reject | Locked: Compose on localhost. §16.3 is a later option, not a v1 deliverable. |
| Solo Leveling marks, character names, official art, OST | Commercial Arise package id; Solo Hunter “Monarch” | reject | `FORBIDDEN.txt` + CI. Chrome says SYSTEM. |
| Claiming Arise treats depression / anxiety / concussion | SuperBetter science positioning | reject | We are not a medical or mental-health device. |
| Light theme / i18n | Mass-market apps | reject | v1 English, dark SYSTEM only. |

---

## Polish acceptance bar (for implementers)

A change is `adopt-v1-polish` only if **all** of these are true:

1. It renders from fields already on `GET /me/today`, onboarding errors, settings, or health forms.
2. It adds no route, table, template id, push permission, Bluetooth prompt, or LLM call.
3. QA can write a Playwright or visual check: “given X payload, the user sees Y sentence before they confirm.”

If a ticket needs a migration, it is not polish.

---

## Explicit non-decisions (do not reopen)

- Product name Arise; chrome SYSTEM.
- 16 catalog ids in Appendix A.
- Compose `http://localhost:8080` as the only v1 production path.
- Friends-and-family via invite code on that origin (LAN/Tailscale is an operator choice, not a cloud project).
