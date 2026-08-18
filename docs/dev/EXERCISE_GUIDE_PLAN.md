# Arise — In-app exercise guides (text + still graphics)

| Field | Value |
| --- | --- |
| **Status** | Plan. **Owner reviews** [`docs/product/EXERCISE_GUIDE_REVIEW.md`](../product/EXERCISE_GUIDE_REVIEW.md) before art or UI land. |
| **Date** | 2026-08-17 |
| **Stories** | ARISE-043–046 in [`NEXT_CUT_STORIES.md`](../backlog/NEXT_CUT_STORIES.md) |

v1 quest cards have a title, flavor line, and blocks (sets/reps/RPE). They do **not** teach the movement. This cut adds a **Guide** sheet: steps, stop-if, and 1–2 original stills per unique movement.

Not in this cut: video library, CDN, licensed art, Web Push, live HealthKit.

---

## Why stills, not video

`FEATURE_DECISIONS.md` **rejects** an exercise video library (asset pipeline, CDN). Stills + short cues fit the PWA, Compose host, and medical honesty. Competitive scan called this “form-cue text”; graphics are the same story with pictures.

---

## Product shape

On each issued quest card that has a movement: **Guide** control.

Sheet (SYSTEM chrome):

1. Movement name + equipment.  
2. 1–2 stills (setup / mid-rep).  
3. Setup → action → breath → stop-if → do-not.  
4. Existing medical disclaimer.  
5. Close. Completing the quest is unchanged.

`rec_full_rest` and `habit_sleep_window`: text only, no athlete still.

Walk + penalty walk **share** one walk graphic.

Gym full body: four short sections, four stills (squat, hinge, press, row).

Copy lives in `packages/engine` or `packages/domain` next to template ids so API and web share one source. Images in `apps/web/public/guides/<id>-{setup,mid}.png` (or SVG).

---

## Waves

| Wave | Story | What |
| --- | --- | --- |
| A | **043** | Guide copy + types for all 16 ids. No UI art yet. Owner-approved text from the review file. |
| B | **044** | Quest card **Guide** sheet (text only). |
| C | **045** | Original stills for the unique movements. Dark SYSTEM style. |
| D | **046** | Wire stills into the sheet + tests (no `push`, no forbidden IP). |

Do **not** start 045 until you have marked the review file.

---

## Graphics spec (when 045 starts)

- Dark background `#050816`, teal/cyan line art or muted 3D, clothes on.  
- No faces that look like licensed characters. No calories.  
- Square or 16:9 stills, compressed, precached by the existing SW glob (`png`).  
- One adult body, reused, so the set stays consistent.

Generation can use Imagine later; or a designer. Either way the **review file** is the brief.

---

## Safety

- Guides never override injury filters, PAR-Q, pregnancy, travel/sick, or `rpeMax`.  
- “Stop if pain / chest pressure / faintness” on every sheet.  
- We do not claim this replaces a clinician.
