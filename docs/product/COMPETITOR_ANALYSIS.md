# Arise — Competitor Analysis

| Field | Value |
| --- | --- |
| **Status** | Owner decision input for friends-and-family v1 |
| **Date** | 2026-08-15 |
| **Design contract** | [`docs/design.md`](../design.md) revision 4 (2026-08-14) — **do not reopen** |
| **Companion** | [`FEATURE_DECISIONS.md`](./FEATURE_DECISIONS.md), [`PLAN_ADDENDUM.md`](./PLAN_ADDENDUM.md) |

This document records what real competitors and adjacent products do well, what Arise already covers, and what we must not copy. It is **not** a backlog. Verdicts live in `FEATURE_DECISIONS.md`.

**Locked v1 frame (read before any “we should add…” impulse):** Compose on localhost only; invite-only; age 16+; email+password; Better Auth scrypt; rule-based planner; exactly 16 in-code templates; manual + small CSV health; PWA; no Web Push; no Bluetooth; no native stores; no LLM; no social; no ads; safety over lore; product name Arise; chrome says SYSTEM; no licensed hunter IP.

**How this was researched:** official marketing and help pages, store listings, and public mechanics write-ups (Habitica wiki, Fitbod/Hevy/Strong/Future/Caliber/Freeletics/MacroFactor sites, Zombies Run App Store, Google Health Connect migration notes, Play listings for hunter-system apps). Store ratings and download counts are directional, not a launch target.

**Name collision (fact, not a rename ticket):** a commercial Android/iOS product titled **“Arise: Level Up In Real Life”** (Golden Gate Media; Play package `llc.sololeveling.Arise`; support `tryarise.app`) already sells an anime-inspired workout RPG. Our product name is **locked** as Arise; in-app chrome is SYSTEM. We do not copy their art, copy, paywall, or any licensed marks. Differentiate on honesty, safety, rewrite-today, and $0 Compose.

---

## 1. Habitica — RPG habits / productivity

**What they do well**

- Split **Habits** (unbounded +/−) vs **Dailies** (scheduled) vs **To-Dos**. Players always know whether missing something hurts.
- Missed Dailies deal **HP damage** at Cron (custom day-start). Completing them grants XP, gold, mana, streak ticks, and occasional drops.
- **Pause Damage / Rest in the Inn**: illness or vacation freezes damage and streaks without deleting the list. This is the most humane mechanic in a punishment-heavy RPG.
- Checklists give **partial credit** on a Daily instead of all-or-nothing.
- Parties and boss quests turn missed Dailies into **shared damage** — strong accountability, also social pressure.

**What Arise already covers**

- Issued daily quests, XP, ranks, five stats, streaks.
- Midnight fail via `POST /me/today/ensure` catch-up (Habitica Cron analog) — unissued absences are **not** fails.
- Skip reasons: `rest_planned` / `illness` / `pain` freeze the streak; `busy` freezes until the 3rd in an ISO week, then fail.
- Partial completion (`effort: "partial"` → 50% XP) is the honest analog of a half-done checklist.
- Easy `penalty_easy_walk` instead of HP death.

**What we must not copy**

- Habitica pixel-art, character classes, pets, mounts, or gold shop.
- Party / boss **shared damage** (social is out of v1; also a harassment and dropout vector).
- User-authored unlimited task lists as the product. Arise **prescribes** a training day; it is not a todo RPG.
- HP death and “punishment workouts” framed as atonement.

**Takeaway:** Steal the *clarity* of “this miss freezes you, that miss fails you” — we already encode it; surface it. Do not become Habitica-with-squats.

---

## 2. SuperBetter — gameful resilience

**What they do well**

- Evidence-backed **Live Gamefully** loop: quests, power-ups, “bad guys,” allies, secret identity, epic win. RCTs (Penn, Harvard-affiliated, concussion, depression/anxiety meta-analyses) are their moat.
- **Power-ups** are tiny, repeatable state shifts (breath, walk, gratitude) — legitimate play, not a consolation prize.
- Daily load is small (historically ~3 quests). Behavioral activation, not a 90-minute program.
- “Bad guys” externalize obstacles so the player is not the defect.

**What Arise already covers**

- Issued quests with flavor; recovery/habit slots (`rec_nasal_breath`, `rec_full_rest`, `habit_sleep_window`).
- Recovery score already **blocks hard/moderate** when sleep/load say so.
- Skip-for-illness/pain without XP shame.
- SYSTEM identity is our chrome, not a SuperBetter “secret identity.”

**What we must not copy**

- SuperBetter / Live Gamefully® marks, quest catalogs, or “secret identity” packaging.
- Any claim that Arise **treats** depression, anxiety, concussion, or chronic pain.
- Allies / social recruitment.
- Marketing ourselves as a mental-health device.

**Takeaway:** Rest and breath quests must *read* as SYSTEM work, the way SuperBetter power-ups read as play. Do not add a therapy product.

---

## 3. Zombies, Run! — narrative cardio

**What they do well**

- Audio fiction (Naomi Alderman; 500+ missions, 11 seasons) makes a walk or jog feel like a **mission**. 10M+ runners; works at any pace, treadmill, or wheelchair.
- Optional **zombie chases** (GPS speed-up) are opt-in intensity, not the default.
- Couch-to-5K plus base-building (Abel Township) as a long meta.
- Story weaves through the user’s own music.

**What Arise already covers**

- Flavor strings on every template; SYSTEM chrome.
- Easy walk (`cardio_zone2_walk`, `penalty_easy_walk`) as first-class cardio.
- Intensity caps (beginner RPE ≤ 7; penalty RPE ≤ 4).

**What we must not copy**

- Runner 5, Abel Township, or any Six to Start story IP.
- Background GPS, chase sprints, or “outrun or drop supplies” intensity (liability; no native location stack).
- Produced audio seasons (not a v1 studio).
- Subscription-gated narrative as the product.

**Takeaway:** Flavor is already in the catalog. Do not add GPS, audio drama, or chase intensity.

---

## 4. Fitbod — adaptive strength planner

**What they do well**

- Builds **today’s session** from goal, equipment, and estimated muscle fatigue — users do not write the program.
- Equipment toggles (home / gym / bands / none); users switch setups often.
- Rest timers, supersets, RiR/RPE, progressive overload from logged sets.
- Mobility/warm-up can be baked into the session, not a separate forgotten app.
- Recovery heatmap makes “why not chest again” visible.

**What Arise already covers**

- Rule-based `buildWeeklyPlan` + issuer scoring (goal, freshness, week-balance, time-fit, recovery-fit).
- Equipment gates (`none` / `bands` / `dumbbells` / `full_gym`) and injury contraindications.
- Recovery score + `caution_volume` + hard-day cap already **rewrite today**.
- `rpeMax` on every block; beginner clamp; volumeMul 0.7 under caution.
- Mobility slot on non-rest days.

**What we must not copy**

- Set-by-set logging, rest-timer session UI, or Apple Watch haptics (design KD 22: no set log in v1).
- ML “calibrate for 3 weeks” as a black box.
- Hundreds of exercises / custom-exercise CMS (catalog is 16 ids).
- Muscle-group heatmap as a new data model.

**Takeaway:** Fitbod proves “tell me what to lift today” is the category. We already do the planner half; we will not become the logger half in v1.

---

## 5. Strong — minimal gym notebook

**What they do well**

- Fastest mid-set logger in the category. No social, no AI, no feed.
- CSV export, Apple Health, RPE, custom timers, plate calculator.
- Privacy posture: accounts free, export anytime, you own the notebook.

**What Arise already covers**

- No social. Dark SYSTEM only.
- `GET /me/export` JSON + account delete.
- Partial/full complete is our *only* effort grain.
- Units toggle; metric stored.

**What we must not copy**

- Set/reps/weight as the core object.
- Live Apple Health.
- Native Watch / Siri.

**Takeaway:** Strong is what users open **during** a lift. Arise is what they open **before** the day. Export/privacy we already match; logging we reject.

---

## 6. Hevy — social gym logger

**What they do well**

- Same logging core as Strong, plus a **follow/like/comment feed**, copy-a-friend’s routine, PRs in public.
- Generous free tier; web + iOS + Android + Watch.
- Exercise videos and routine planner.

**What Arise already covers**

- PWA so a laptop can show today (Hevy’s “also on desktop”).
- Progress page (90 days) without a social graph.

**What we must not copy**

- Social feed, follows, comments, public PRs, leaderboards (design non-goal; no `FEATURE_SOCIAL`).
- Copy-friend-routine (implies a public catalog of user programs).
- Native Watch.

**Takeaway:** Hevy’s hook is being watched. Ours is a private SYSTEM window. Do not “just add a feed later” without a product call — it is rejected for v1 and not scheduled.

---

## 7. Freeletics — bodyweight / HIIT AI coach

**What they do well**

- Bodyweight-first, travel-proof. “Short on time? Swap the session now.”
- Coach learns from session feedback; Coach+ adds generative chat (2024+).
- Huge combination space (they claim trillions of in-app combinations).
- Instant adapt is the retention story for busy people.

**What Arise already covers**

- Living-room catalog (`requiredAny: ["none"]` walks, mobility, sit-to-stand, incline push, backpack row, hinge).
- `budgetMinutes` from the user’s week; `timeFit` drops a slot; empty-day fallback is sleep + 10-min walk.
- Recovery and illness windows already shrink or rest the day.
- Manual `POST /plan/regenerate` for schedule change.

**What we must not copy**

- LLM / generative coach (`FEATURE_LLM_PLANNER` is v2).
- HIIT-as-default punishment culture; our hard days are capped and gated.
- Mid-set “swap this exercise” CMS.
- Catalog beyond 16 templates.

**Takeaway:** Freeletics’ *product sentence* is ours — adapt today to real life — executed with rules, not a chatbot.

---

## 8. Future — 1:1 remote coaching (~$199/mo)

**What they do well**

- A human checks in. Claim: 98% more consistent within 4 weeks.
- **Move or skip a session without penalty** is explicit marketing.
- Intake captures schedule, travel, equipment, injury, goal — then a coach writes the week.
- Video demos + form cues so the user is not guessing.

**What Arise already covers**

- Same intake *shape* (schedule, equipment, injuries, goal, PAR-Q).
- Skip `busy` / `illness` / `pain` / `rest_planned` with streak freeze (not Future’s “no penalty ever” — we still midnight-fail issued work).
- Plan regenerate for schedule change.
- Easy penalty, not extra hard volume.

**What we must not copy**

- Human chat, video review, or a coaching marketplace.
- $199/mo positioning or subscriptions in v1 (monetization: none).
- A promise that skipping never has a consequence (we have honest fail + easy walk).

**Takeaway:** Future sells a person. We sell a deterministic SYSTEM. Copy their *life-flexible* tone, not the coach.

---

## 9. Caliber — science-branded coaching + nutrition

**What they do well**

- Assessment → coach-written plan covering strength, cardio, **nutrition**, and habits.
- Free / ~$19 group / ~$200 1:1 tiers. Lessons teach *why*.
- Strength-balance scores give the coach something to point at.
- Equipment modes: none / dumbbells / full gym.

**What Arise already covers**

- Six-step onboarding + `POST /plan/preview` (0 writes) + persist.
- Goal types include fat_loss / muscle_gain / recomposition / endurance / general / mobility.
- `dietPreference` is **stored and unused** by the issuer (ruthless cut).
- Implied loss > 1% BW/week rejected (`UNSAFE_LOSS_RATE`).

**What we must not copy**

- Nutrition programming, food logs, or body-composition guarantees (“20% in 3 months”).
- Human video coaching.
- Educational CMS / lessons as a v1 surface.

**Takeaway:** Assessment-to-week is our onboarding. Diet stays out. Do not make body-comp promises.

---

## 10. Apple Fitness+ / Google Fit / Samsung Health — distribution and ingest reality

These are **not** product peers. They are the phone’s health graph and (Fitness+) a class studio. Arise will not out-distribute them and must not pretend to plug into them on the web.

**What they do well**

- **Apple Fitness+:** studio classes, trainers, Time to Walk/Run, rings on Apple Watch. HealthKit is the on-device bus. Users can dump **Apple Health export.zip / XML** from Settings — huge, messy, native-gated.
- **Google Fit:** consumer dashboard historically; **Fit APIs (including REST) are deprecated and only supported through end of 2026**. New work targets **Health Connect** (on-device) or Google Health / Fitbit cloud APIs. A PWA cannot read Health Connect.
- **Samsung Health:** enormous watch/phone install base; first-party export is hostile. The realistic bridge is **Health Connect → CSV** via a third-party exporter, not a live Arise adapter.

**What Arise already covers**

- Provider-agnostic `HealthSample` model.
- v1 adapters: **manual + CSV ≤ 256 KB / 200 rows**.
- Typed stubs (`apple_export`, `web_bluetooth`, `health_connect`, `healthkit`) throw `unavailable_web`.
- Settings copy already required to be honest about native and large Apple exports.
- Step/sleep auto-complete and residual-steps shrink from whatever *did* get in.

**What we must not copy**

- Rings, Activity competitions, Fitness+ class UI, or “we sync Apple Watch live.”
- Shipping a HealthKit / Health Connect adapter in the PWA (it cannot work).
- Parsing `export.zip` in v1 (capped, deferred to v1.1 web worker).
- Using wearable **calorie burn** as training truth (see MacroFactor).

**Takeaway:** Platforms own ingest. v1 is an honest CSV on-ramp. Teach the export path; do not fake a live integration.

---

## 11. MacroFactor — adaptive nutrition (likely reject)

**What they do well**

- Expenditure algorithm: logged intake + **trended weight** → weekly TDEE, then new macros. Adherence-neutral (missed logs do not punish).
- User-chosen rate of loss/gain; no ads; export; privacy-first.
- Explicitly **does not trust wearable calorie estimates** — weight and intake are enough.
- Fast logging (barcode, label scan, photo AI) is the whole product.

**What Arise already covers**

- Weight as a health metric (manual/CSV).
- Fat-loss **safety**: implied loss > 1% bodyweight/week → `400 UNSAFE_LOSS_RATE` with `maxKgPerWeek`.
- Copy rule: **no calorie numbers**; fat-loss talks steps, sleep, consistency.
- `dietPreference` unused in v1 issuer.

**What we must not copy**

- Food database, barcode, photo-AI logging, macros, micros, fasting modes.
- TDEE charts or calorie targets in SYSTEM chrome.
- Any “just hit your macros” loop (new tables, new APIs, liability, eating-disorder surface).

**Takeaway:** Reject nutrition as a product line for v1 (and do not sneak it into v1.1). Keep the loss-rate hard-stop and the no-calorie copy rule. Their wearable-calorie skepticism matches our honesty.

---

## 12. Hunter-system / gamified fitness apps

Evaluated as a *category*, not as art references. **Do not copy names, ranks-as-IP, character titles, or official art.**

### 12a. Commercial “Arise: Level Up In Real Life” (Golden Gate Media)

- Store product: personalized plan from lifestyle questions, daily quests, XP, achievements, anime-inspired solo training. Custom plan is **subscription-gated**. Reviews complain about paywall-before-preview, XP-only skip penalty, and rest-timer bugs.
- Package id contains a licensed-fiction string; listing leans on “anime / RPG progression.”

**What we already cover:** plan-from-intake, daily quests, XP, SYSTEM chrome — without a store paywall.

**Must not copy:** their UI, copy, achievement tree, photo-logging, or any *Solo Leveling* marks. Do not treat their store listing as a spec. Our friends-and-family Compose build is not a Play Store competitor and must not use their assets.

### 12b. Solo Hunter: Level Up

- Daily quests, gold, five stats (STR/INT/AGI/VIT/SEN), E-rank → “S-Rank Monarch,” dungeons cleared by push-ups/squats/runs, **Penalty Zone** timed survival workouts, guilds, shop, leaderboard, job classes (“Undead Commander,” “Monarch”).

**What we already cover:** five stats (ours are `str/agi/vit/intl/sta`), ranks E→S with **completion-rate gates**, easy walk penalty, private profile.

**Must not copy:** Monarch / hunter-association / dungeon-raid lore; timed punishment workouts; gold shop; guilds; leaderboards; “penalty immune at level 100.” Safety over lore is load-bearing.

### 12c. Category lesson

The hunter-system aisle sells **lore density**. Users bounce when lore is a skin on a generic list, or when missed days become hard extra volume. Arise wins only if today is a real, safe prescription that **changes when the body data says so**.

**Takeaway:** Compete on rewrite-today + safety + $0 Compose. Never compete on who owns the shinier System window.

---

## Cross-cutting lessons (for decisions, not for extra scope)

| Lesson | Source mechanic | Arise implication |
| --- | --- | --- |
| Users need **today**, not a 12-week PDF | Fitbod session, Freeletics coach, Future daily | Already the product. Keep the System window as the only notification surface. |
| Life must be able to **pause without shame** | Habitica Inn; Future “move without penalty”; SuperBetter power-ups | Skip-reason copy must explain freeze vs fail **before** confirm. |
| Punishment volume is a **liability** | Habitica HP; Solo Hunter Penalty Zone; some HIIT cultures | Penalties stay `penalty_easy_walk`, RPE ≤ 4, ≤ 20 min. Theatrical red copy, easy prescription. |
| Health platforms **will not** feed a PWA | HealthKit, Health Connect, Fit API sunset | Honest CSV + stubs. Apple zip is v1.1. Native is v2. |
| Nutrition is a **second product** | MacroFactor, Caliber | Reject. Keep loss-rate gate and no-calorie copy. |
| Social is a **different company** | Hevy feed; Habitica parties; Solo Hunter guilds | Reject. Invite-only friends-and-family is not a social graph. |
| Lore without safety is how this aisle gets people hurt | Hunter-system apps; punishment workouts | Pregnancy hard-stop, PAR-Q whitelist, implied loss, rest enforcement stay above flavor. |

---

## Sources (accessed 2026-08-15)

- Habitica: [habitica.com](https://habitica.com/), [Dailies wiki](https://habitica.fandom.com/wiki/Dailies), [Rest in the Inn / Pause Damage](https://habitica.fandom.com/wiki/Rest_in_the_Inn)
- SuperBetter: [superbetter.com](https://superbetter.com/), [the-science](https://superbetter.com/the-science/)
- Zombies, Run!: [App Store listing](https://apps.apple.com/us/app/zombies-run/id503519713)
- Fitbod: [product blog on overlooked features](https://fitbod.me/blog/5-fitbod-features-most-reviews-overlook-but-real-users-love/), help (rest timer / RiR)
- Strong: [strong.app](https://www.strong.app/)
- Hevy: [hevyapp.com](https://www.hevyapp.com/)
- Freeletics: [freeletics.com/en](https://www.freeletics.com/en/)
- Future: [future.co](https://future.co/)
- Caliber: [caliberstrong.com](https://caliberstrong.com/)
- MacroFactor: [macrofactor.com/macrofactor](https://macrofactor.com/macrofactor/)
- Google Fit → Health Connect: [Android Fit migration](https://developer.android.com/health-and-fitness/health-connect/migration/fit)
- Hunter-system store listings: Play “Arise: Level Up In Real Life” (`llc.sololeveling.Arise`); Play “Solo Hunter: Level Up”
