# Arise — Exercise inventory + form-guide review

| Field | Value |
| --- | --- |
| **Status** | **Owner review.** Do not implement graphics until you mark each movement OK / change / drop. |
| **Date** | 2026-08-17 |
| **Source of truth** | `packages/engine/src/templates/catalog.ts` (exactly **16** templates) |
| **Plan** | [`docs/dev/EXERCISE_GUIDE_PLAN.md`](../dev/EXERCISE_GUIDE_PLAN.md) |

These cues are **conservative coaching copy**, not physiotherapy. The existing medical disclaimer still applies. Stop if there is pain, chest pressure, or faintness.

**How to mark:** under each movement, reply `OK` / `CHANGE: …` / `DROP`.

---

## Catalog (16 quests)

| # | Template id | Title | Kind | Intensity | Equipment | Skip if | Prescription (as coded) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `str_sit_to_stand_l0` | Sit to Stand | strength | moderate | none | **knee** | 3×10, RPE ≤ 6, 60 s rest |
| 2 | `str_incline_push_l0` | Incline Push | strength | moderate | none | **shoulder, wrist** | 3×8 incline push-up, RPE ≤ 6, 60 s |
| 3 | `str_backpack_row_l0` | Backpack Row | strength | moderate | none | — | 3×10, RPE ≤ 6, 60 s |
| 4 | `str_hip_hinge_l0` | Hip Hinge | strength | moderate | none | **spine** | 3×8 unloaded, RPE ≤ 6, 60 s |
| 5 | `str_goblet_squat_l1` | Goblet Squat | strength | moderate | dumbbells **or** bands | **knee** | 3×8, RPE ≤ 7, 75 s |
| 6 | `str_band_row_l1` | Band Row | strength | moderate | bands **or** dumbbells | — | 3×10, RPE ≤ 7, 60 s |
| 7 | `str_gym_full_body_l2` | Gym Full Body | strength | **hard** | full_gym | — | Squat 3×5, hinge 3×5, press 3×6, row 3×8, RPE ≤ 7, 90 s |
| 8 | `cardio_zone2_walk` | Zone 2 Walk | cardio | easy | none | — | 20 min, RPE ≤ 4 |
| 9 | `steps_6k` | Six Thousand Steps | steps | easy | none | — | 6000 steps, RPE ≤ 3, auto-complete |
| 10 | `steps_8k` | Eight Thousand Steps | steps | easy | none | — | 8000 steps, RPE ≤ 3, auto-complete |
| 11 | `mob_hip_unload` | Hip Unload | mobility | easy | none | — | 2×30 s per side, RPE ≤ 3 |
| 12 | `mob_tspine` | Thoracic Open Book | mobility | easy | none | — | 2×6 per side, RPE ≤ 3 |
| 13 | `rec_nasal_breath` | Nasal Box Breath | recovery | rest | none | — | 5 min, RPE 1 |
| 14 | `rec_full_rest` | Full Rest | recovery | rest | none | — | No load |
| 15 | `habit_sleep_window` | Sleep Window | habit | rest | none | — | Protect the night window (auto) |
| 16 | `penalty_easy_walk` | Easy Walk | penalty | easy | none | — | 15 min, RPE ≤ 4 |

Unique **movements** to illustrate (11 drawings, reused across templates):

Sit-to-stand · Incline push-up · Backpack/band row · Hip hinge · Goblet squat · Gym squat · Gym hinge · Gym press · Easy walk · 90° hip opener · Thoracic open book · Box breath.

Rest and sleep have no movement graphic.

---

## Proposed guides (for your check)

Each movement: setup → action → breathing → stop-if → graphic (2 stills: start / mid).

### 1. Sit-to-stand — `str_sit_to_stand_l0`

**Setup.** Sturdy chair, feet flat, about hip-width. Sit toward the front edge. Arms crossed on the chest or reach forward for balance.

**Action.** Lean the chest slightly forward. Press the floor through the whole foot and stand until hips and knees are straight. Sit down slowly; do not drop.

**Breath.** Breathe out as you stand; in as you sit.

**Stop if.** Sharp knee, hip, or back pain. Chair slides. You cannot control the sit-down.

**Do not.** Bounce out of the chair. Let the knees cave in. Rise onto the toes.

**Graphic.** Side view: seated ready / standing tall. Caption: “Whole foot. Slow sit.”

**Your mark:** ________

---

### 2. Incline push-up — `str_incline_push_l0`

**Setup.** Hands on a stable counter or wall, slightly wider than shoulders. Body in one line from head to heels. No sagging hips.

**Action.** Bend the elbows and lower the chest toward the surface. Press back to straight arms. Keep the neck long.

**Breath.** In on the way down; out on the press.

**Stop if.** Shoulder pinch, wrist pain, chest pressure.

**Do not.** Flaring elbows to 90°. Shrugging ears. Doing these on a wobbly table.

**Graphic.** Side view at a counter: plank line / elbows bent.

**Your mark:** ________

---

### 3. Backpack row — `str_backpack_row_l0`

**Setup.** Soft bend in the knees. Hinge the hips so the back is long and almost parallel to the floor. Hold a loaded backpack (or bag) in one hand, arm hanging.

**Action.** Pull the bag toward the lower ribs. Pause. Lower without twisting the torso. Switch sides across sets if one-arm.

**Breath.** Out on the pull; in on the lower.

**Stop if.** Low-back pinch, neck strain.

**Do not.** Yank with the neck. Round the upper back into a C-shape.

**Graphic.** Side hinge: arm hanging / bag at the ribs.

**Your mark:** ________

---

### 4. Hip hinge (unloaded) — `str_hip_hinge_l0`

**Setup.** Feet hip-width. Soft knees. Hands on the hips or a broomstick along the spine (head, mid-back, tailbone).

**Action.** Push the hips **back** as if closing a car door with the hips. Shin angle stays quiet. Return by squeezing the hips forward, not by arching the low back.

**Breath.** In as you hinge; out as you stand.

**Stop if.** Sharp spine pain (this template is **contraindicated** for a spine injury flag).

**Do not.** Squat down (knees traveling far forward). Look at the ceiling.

**Graphic.** Side: tall / hips back, long spine.

**Your mark:** ________

---

### 5. Goblet squat — `str_goblet_squat_l1`

**Setup.** Hold a dumbbell or kettlebell at the chest (or a band under the feet, handles at the chest). Feet about shoulder-width, toes slightly out.

**Action.** Sit the hips down and back. Knees track over the mid-foot. Stand by pressing the floor. Depth: as low as you keep heels down and a long spine.

**Breath.** In on the way down; out on the stand.

**Stop if.** Knee pain (template is **knee-contraindicated**). Heels lift and you cannot fix it.

**Do not.** Collapse the chest. Let the knees dive inward.

**Graphic.** Front + side: goblet hold / bottom of squat.

**Your mark:** ________

---

### 6. Band / dumbbell row — `str_band_row_l1`

**Setup.** Band anchored at chest height, or one dumbbell, hinge as in the backpack row.

**Action.** Pull the handle or bell to the hip/low ribs. Shoulder blade slides toward the spine. Slow return.

**Breath.** Out on the pull.

**Stop if.** Neck or low-back pinch.

**Do not.** Shrugging. Using only the wrist.

**Graphic.** Same hinge family as backpack row; show band line or DB.

**Your mark:** ________

---

### 7. Gym full body — `str_gym_full_body_l2` (four movements)

Only issued with **full_gym** and experience ≥ 2. RPE ≤ 7. This is the hard day.

#### 7a. Squat (barbell or equivalent gym squat)

**Setup.** Bar on the upper back, not the neck. Feet about shoulder-width. Brace the trunk.

**Action.** Sit down and back. Knees track toes. Stand tall.

**Stop if.** Knee or back pain you cannot ease by reducing load.

**Graphic.** Side: bar position / parallel-ish squat.

#### 7b. Hinge (Romanian deadlift or hip hinge with bar/DB)

**Setup.** Soft knees, long spine, weight in the hands.

**Action.** Hips back; feel the hamstrings; stand by driving the hips.

**Stop if.** Spine rounding you cannot fix, or sharp back pain.

**Graphic.** Side: long spine, hips back.

#### 7c. Press (standing or seated overhead, or gym press machine)

**Setup.** Ribs stacked over the pelvis. Bar or DBs at the shoulders.

**Action.** Press overhead until the arms are long. Lower with control.

**Stop if.** Shoulder pinch, dizziness.

**Do not.** Over-arching the low back to get the arms up.

**Graphic.** Front: start at shoulders / lockout.

#### 7d. Row (cable, chest-supported, or barbell row)

**Setup.** Stable hinge or supported chest.

**Action.** Pull to the lower ribs. Slow lower.

**Graphic.** Same row family.

**Your mark (whole gym day):** ________

---

### 8. Zone 2 walk — `cardio_zone2_walk`

**Setup.** Flat, safe path, treadmill, or indoor loop. Shoes you can walk in. Wheelchair / any-pace still counts as this card (inclusive copy).

**Action.** 20 minutes continuous. You can speak a sentence (RPE ≤ 4). Not a jog.

**Stop if.** Chest pressure, faintness, unusual breathlessness.

**Graphic.** Side walk: relaxed arms, easy stride. Caption: “Talk pace.”

**Your mark:** ________

---

### 9–10. Step targets — `steps_6k` / `steps_8k`

**Setup.** Normal daily walking. No special form.

**Action.** Accumulate 6000 or 8000 steps across the day. Auto-completes if logged/imported steps meet the number.

**Stop if.** Same as any walk: pain, chest pressure, faintness.

**Graphic.** Simple step-count icon + “all-day total,” not a march drill.

**Your mark:** ________

---

### 11. 90° hip openers — `mob_hip_unload`

**Setup.** Sit on the floor. One shin in front (~90° at hip and knee), the other shin to the side (~90°). If the floor is too much, sit on a cushion.

**Action.** Tall chest. Gently rotate the trunk toward the front shin, or stay still and breathe. 30 s, then switch. No forcing the knee.

**Stop if.** Knee pinch (this is the *unload* option when squats are filtered). Sharp hip pinch.

**Do not.** Yank the back knee. Collapse onto the hands.

**Graphic.** Top-down 90/90 sit + “switch sides.”

**Your mark:** ________

---

### 12. Thoracic open book — `mob_tspine`

**Setup.** Lie on one side, knees bent ~90°, stacked. Arms straight in front, palms together.

**Action.** Keep the knees stacked. Open the top arm in a wide arc toward the floor behind you. Eyes follow the hand. Return. 6 reps, then the other side.

**Stop if.** Sharp shoulder or spine pain.

**Do not.** Let the knees roll open to fake the rotation.

**Graphic.** Side-lying: arms stacked / open book.

**Your mark:** ________

---

### 13. Nasal box breath — `rec_nasal_breath`

**Setup.** Sit or lie. Jaw soft. Breathe through the nose if you can.

**Action.** In 4 · hold 4 · out 4 · hold 4 (or shorter if 4 is too long). Five minutes. Quiet.

**Stop if.** Dizziness, panic, or you cannot catch your breath. Then stop and breathe normally.

**Do not.** Strain the neck. Force a breath-hold that makes you gasp.

**Graphic.** Four-box diagram (in / hold / out / hold). No yoga branding.

**Your mark:** ________

---

### 14. Full rest — `rec_full_rest`

No exercise. Issued rest is **required SYSTEM work** (streak rules as designed). No graphic of a workout.

**Copy.** “No training load today. Sleep, food, and easy walking around the house are enough.”

**Your mark:** ________

---

### 15. Sleep window — `habit_sleep_window`

No exercise. Protect the planned night window. Auto-completes from sleep minutes when ingest exists.

**Copy.** “Dim lights, same window most nights. This is issued work, not a consolation prize.”

**Your mark:** ________

---

### 16. Penalty easy walk — `penalty_easy_walk`

Same as Zone 2 walk, **shorter** (15 min), RPE ≤ 4. Not extra hard volume. Not a punishment workout.

**Graphic.** Reuse the walk stills. Caption: “Easy walk. RPE ≤ 4.”

**Your mark:** ________

---

## Safety rules for every graphic

- Dark SYSTEM chrome (`#050816`). No licensed hunter art, no calorie labels, no “no pain no gain.”
- Adult, clothes on, neutral body. Not medical photography.
- Caption in English, one line.
- Always show the existing disclaimer on the guide sheet.

## What I need from you

1. Mark each movement above.  
2. Confirm gym day: keep four generic patterns (squat / hinge / press / row) vs name specific lifts (back squat, RDL, OHP, barbell row).  
3. Confirm we **do not** add video. Stills + text only.
