# Arise — Activity status + health sync (next cut)

| Field | Value |
| --- | --- |
| **Status** | Plan + stories. **Not started.** |
| **Date** | 2026-08-17 |
| **Stories** | [`docs/backlog/NEXT_CUT_STORIES.md`](../backlog/NEXT_CUT_STORIES.md) |
| **Does not amend** | `docs/design.md` rev 4 locked v1. This is a **next cut**. |

Two owner requests:

1. Mark **travel** or **sick** so the SYSTEM rewrites the week honestly.
2. Pull workouts, steps, sleep, heart rate from **Apple Health, Google Fit, and other phone-synced devices** automatically.

Do them **in waves**. Wave 1 is the only slice that is fully possible on today’s PWA. Automatic live Health app sync is **not** a Safari/Chrome feature; the later waves are the honest path.

---

## 1. What we already have

| Already shipped | Meaning |
| --- | --- |
| Skip `illness` / `pain` / `rest_planned` | Per-quest. Two illness days → `illness_rest` tomorrow. Not a “I’m sick for a week” switch. |
| Recovery rewrite | Uses `daily_summaries` (steps, sleep, HR, HRV if present). |
| Manual + CSV ingest | `POST /health/manual`, `POST /health/samples`, consent, 256 KB / 200 rows. |
| Normalize | Already accepts `steps`, `sleep_minutes`, `heart_rate`, `resting_hr`, `hrv`, weight, soreness, sleep_quality. |
| Stubs | `healthkit`, `health_connect`, `apple_export`, `web_bluetooth` throw `UNAVAILABLE_WEB`. |
| `integrations` table | Exists (`active \| unavailable_web \| revoked`). Unused by a live adapter. |

The gap is **not** “we cannot store HR.” It is **how samples get in**, and **a first-class status** instead of skipping each quest.

---

## 2. Honesty: phone Health apps vs a PWA

A Home Screen PWA **cannot** read Apple Health or Health Connect the way a store app can. Those APIs are native-only.

| Source | Automatic from this PWA? | Realistic path |
| --- | --- | --- |
| **Apple Health / HealthKit** | No | User export `export.zip` (Wave 3) or a later iOS wrapper (Wave 5) |
| **Google Fit** | No (API retired; Android moved to Health Connect) | Do **not** build a Fit client. Use Health Connect export or a vendor cloud (Fitbit, etc.) |
| **Health Connect** (Android) | No from Chrome | CSV/export (Wave 2) or Android wrapper (Wave 5) |
| **Watch / band that syncs to a vendor cloud** (Fitbit, Withings, Garmin, Oura) | **Yes, via OAuth** — data never comes from the Health app; it comes from the vendor’s servers | Wave 4 |
| **Manual / CSV** | Already yes | Wave 2 makes it less painful |

So “track like Google Fit / Apple Health automatically” splits into:

- **Now:** travel/sick status + better import UX.
- **Soon:** Apple zip + vendor OAuth (true background-ish pull, no store).
- **Later:** native HealthKit / Health Connect if we ever wrap the PWA.

Do not fake a live Apple/Google toggle in Settings.

---

## 3. Waves (priority)

```text
Wave 1  Activity status          ← start here
Wave 2  Honest ingest UX         ← same PWA, no vendors
Wave 3  Apple Health export.zip  ← iPhone path without App Store
Wave 4  Vendor cloud OAuth       ← automatic steps/sleep/HR
Wave 5  Native Health adapters   ← only if we accept a wrapper
```

| Wave | Outcome | Store? | Stories |
| --- | --- | --- | --- |
| **1** | One switch: Travel / Sick / Training. SYSTEM banner. Issuer uses rest or living-room kit. | No | 026–030 |
| **2** | Settings lists sources honestly. CSV + manual cover HR/steps/sleep. How-to for Samsung / Garmin / Health Connect **export**. | No | 031–034 |
| **3** | Upload Apple `export.zip` (last 30 days, size cap). Fills the same `health_samples`. | No | 035–036 |
| **4** | Connect Fitbit (first). Nightly pull steps/sleep/HR. Same consent + normalize. Garmin/Withings after. | No | 037–040 |
| **5** | Health Connect / HealthKit adapters stop throwing. Requires Android TWA or Capacitor; iOS still needs Apple distribution. | Android sideload possible; iOS not | 041–042 |

Safety (all waves): pregnancy / PAR-Q / injury / `rpeMax` still win. Travel does **not** unlock gym templates the user did not onboard. Sick does **not** issue hard days. No calorie metrics. No Web Bluetooth. No PHI in logs.

---

## 4. Wave 1 mechanics (lock these)

**Statuses** (exactly one active mode, or none = training):

| Status | Window | Issuer / ensure | Streak |
| --- | --- | --- | --- |
| `training` (default) | — | Unchanged | Unchanged |
| `travel` | 1–14 local days | Equipment whitelist = bodyweight / bands / none (living-room). Hard gym templates out. | Completing issued travel days ticks streak. Unissued days are not fails (already true). |
| `sick` | 1–14 local days | Same as `illness_rest`: rest / easy habit only. No hard. No penalty walk required while sick. | Freeze (same as illness skip). |

API sketch (implement in 027):

- `GET /api/v1/me/activity-status` → `{ status, startsOn, endsOn, source }`
- `PUT /api/v1/me/activity-status` body `{ status: "travel"|"sick"|"training", days: 1–14 }`
- Persist as `user_effects` kinds `travel_window` / `sick_window` (do not overload skip-inferred `illness_rest` so we can tell “user declared” vs “two illness skips”).

SYSTEM: one banner `STATUS: TRAVEL` / `STATUS: SICK` + **Clear** (sets training). Settings Health: same control.

If both a declared sick window and an illness skip exist, **union** the rest constraint. Pregnancy hard-stop still blocks plans.

---

## 5. How we will work

One story at a time, `feat/ARISE-0xx-…`, peer PASS, `ci` green. Do **not** start Wave 3+ until Wave 1 is on the host and you have used travel/sick on the phone.

Suggested first slice when you say go: **ARISE-026** (types + effect kinds) then **027** (API).

---

## 6. Out of this plan

- Live Google Fit REST client.
- Web Bluetooth HR theater.
- Food / calories / TDEE.
- Background iOS HealthKit without a native wrapper.
- Changing invite-only or age 16+.
