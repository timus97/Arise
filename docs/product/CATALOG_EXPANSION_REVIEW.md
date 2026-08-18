# Arise — Catalog expansion review (yoga + gym variations)


| Field          | Value                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------- |
| **Status**     | **Implemented.** Owner answers in §D. Yoga kind + 11 poses (no `yoga_box_hold`). Gym variations all OK. Full-body first, muscle-specific after level-up. Age > 45 skips knees-heavy work. |
| **Date**       | 2026-08-17                                                                                                    |
| **Shipped v1** | Still exactly **16** templates in `catalog.ts`. See `[EXERCISE_GUIDE_REVIEW.md](./EXERCISE_GUIDE_REVIEW.md)`. |
| **This file**  | **Proposed additions only.** No video. Stills + text later (ARISE-043–046).                                   |


v1 locked “16 templates.” This is a **next-cut catalog growth** you asked for: a yoga section, and muscle-specific gym work instead of one generic gym day.

**Issuer idea (after you approve):**  

- Yoga fills the mobility / recovery slot on rest, sick, travel, or mobility-goal days.  
- Gym variations replace the single `str_gym_full_body_l2` *block list* when `full_gym` + experience ≥ 2: issuer picks **one primary lift** from the day’s focus (push / pull / legs / hinge / full_body mix), not 40 lifts in one quest.  
- Injury keys still filter. Travel still strips `full_gym`. Sick still blocks hard.

Reply with marks on each id (or “all yoga OK except X”).

---

## A. Proposed yoga section (12)

New kind: `yoga` (or we keep `mobility` + tag `yoga` — your call in questions below). All `requiredAny: ["none"]`. Intensity easy or rest. RPE ≤ 3.


| Id                   | Title                    | Minutes | Intensity | Skip if                                   | Prescription                             | Your mark      |
| -------------------- | ------------------------ | ------- | --------- | ----------------------------------------- | ---------------------------------------- | -------------- |
| `yoga_cat_cow`       | Cat–Cow                  | 5       | easy      | spine (move gently or DROP for that user) | 2×8 slow cycles, RPE 2                   |                |
| `yoga_child`         | Child’s Pose             | 4       | rest      | knee                                      | 2×45 s, hips toward heels, RPE 1         |                |
| `yoga_down_dog`      | Downward Dog             | 5       | easy      | **wrist, shoulder**                       | 3×20–30 s, soft knees, RPE 3             |                |
| `yoga_mountain`      | Mountain                 | 3       | rest      | —                                         | 60–90 s stand, long breath, RPE 1        |                |
| `yoga_warrior2`      | Warrior II               | 6       | easy      | **knee**                                  | 2×30 s per side, RPE 3                   |                |
| `yoga_bridge`        | Glute Bridge             | 6       | easy      | **spine**                                 | 2×8, 2 s squeeze, RPE 3                  |                |
| `yoga_supine_twist`  | Supine Twist             | 5       | easy      | **spine**                                 | 2×30 s per side, RPE 2                   |                |
| `yoga_legs_wall`     | Legs Up Wall             | 6       | rest      | —                                         | 3–5 min, RPE 1                           |                |
| `yoga_seated_fold`   | Seated Fold              | 5       | easy      | **spine**                                 | 2×30 s, long spine, RPE 2                |                |
| `yoga_sphinx`        | Sphinx                   | 4       | easy      | **spine**                                 | 2×20–30 s, elbows under shoulders, RPE 2 |                |
| `yoga_thread_needle` | Thread the Needle        | 5       | easy      | **shoulder**                              | 2×4 per side, RPE 2                      |                |
| `yoga_box_hold`      | (reuse) Nasal Box Breath | —       | —         | —                                         | **Do not duplicate** `rec_nasal_breath`  | DROP as new id |


### Yoga form cues (proposed)

**Cat–Cow.** Hands under shoulders, knees under hips. Inhale: chest forward, tail up (cow). Exhale: round the back, chin in (cat). Slow. Stop if sharp spine pain.

**Child’s Pose.** Big toes together, knees wide or together. Hips toward heels, arms forward or by the sides. Blanket under knees if needed. Stop if knee pain.

**Downward Dog.** Hands and feet on the floor, hips high, soft knees. Push the floor, long spine. Heels do **not** have to touch. Stop if wrist or shoulder pinch.

**Mountain.** Stand, feet under hips, arms by sides or overhead. Quiet breath. Not a balance circus.

**Warrior II.** Front knee tracks the second toe, knee not past the toes. Back leg long. Gaze over the front hand. Stop if knee pain.

**Glute Bridge.** Lie on the back, feet flat, lift the hips, squeeze glutes, lower slowly. Do not crank the neck. Stop if spine pain.

**Supine Twist.** Knees to one side, opposite shoulder heavy. No forcing the knee to the floor. Stop if spine pain.

**Legs Up Wall.** Hips near the wall, legs vertical, arms easy. Get down slowly. Stop if tingling that does not ease.

**Seated Fold.** Sit tall, hinge from the hips, hands to shins or floor. Do not round hard to touch the toes. Stop if spine pain.

**Sphinx.** Forearms on the floor, elbows under shoulders, gentle chest lift. Pubic bone heavy. Stop if low-back pinch.

**Thread the Needle.** From all fours, slide one arm under the other, rest the shoulder. Slow. Stop if shoulder pinch.

**Graphics.** One still per pose (side or ¾). Dark SYSTEM. Clothes on. No Sanskrit-heavy branding required; English titles above are the chrome names. Sanskrit can be a small subtitle if you want.

---

## B. Proposed gym variations (replace one mega-day)

Keep `str_gym_full_body_l2` as a **fallback mix** or drop it after these exist. All require `full_gym` unless noted. Intensity moderate unless marked hard. Experience min 2 except where noted.

### Chest (push)


| Id                     | Title                          | Prescription         | Skip if         | Your mark |
| ---------------------- | ------------------------------ | -------------------- | --------------- | --------- |
| `gym_bench_press`      | Bench Press                    | 3×5–6, RPE ≤ 7, 90 s | shoulder, wrist | OK        |
| `gym_incline_db_press` | Incline DB Press               | 3×8, RPE ≤ 7, 75 s   | shoulder        | OK        |
| `gym_chest_supported`  | (optional) Machine chest press | 3×8, RPE ≤ 7         | shoulder        | OK        |


### Back (pull)


| Id                 | Title               | Prescription          | Skip if  | Your mark |
| ------------------ | ------------------- | --------------------- | -------- | --------- |
| `gym_lat_pulldown` | Lat Pulldown        | 3×8, RPE ≤ 7, 75 s    | shoulder | OK        |
| `gym_seated_row`   | Seated Cable Row    | 3×8–10, RPE ≤ 7, 75 s | —        | OK        |
| `gym_chest_row`    | Chest-supported Row | 3×8, RPE ≤ 7          | —        | OK        |


### Shoulders


| Id                  | Title          | Prescription         | Skip if  | Your mark |
| ------------------- | -------------- | -------------------- | -------- | --------- |
| `gym_ohp`           | Overhead Press | 3×5–6, RPE ≤ 7, 90 s | shoulder | OK        |
| `gym_lateral_raise` | Lateral Raise  | 2×10, RPE ≤ 6, 45 s  | shoulder | OK        |


### Legs — squat / quad


| Id               | Title         | Prescription            | Skip if         | Your mark |
| ---------------- | ------------- | ----------------------- | --------------- | --------- |
| `gym_back_squat` | Back Squat    | 3×5, RPE ≤ 7, 120 s     | **knee**, spine | OK        |
| `gym_leg_press`  | Leg Press     | 3×8, RPE ≤ 7, 90 s      | **knee**        | OK        |
| `gym_lunge`      | Walking Lunge | 2×8/side, RPE ≤ 6, 75 s | **knee**        | OK        |


### Legs — hinge / posterior


| Id               | Title             | Prescription         | Skip if   | Your mark |
| ---------------- | ----------------- | -------------------- | --------- | --------- |
| `gym_rdl`        | Romanian Deadlift | 3×5–6, RPE ≤ 7, 90 s | **spine** | OK        |
| `gym_hip_thrust` | Hip Thrust        | 3×6–8, RPE ≤ 7, 75 s | spine     | OK        |


### Arms (accessories, easy–moderate, not a hard day by themselves)


| Id                    | Title           | Prescription        | Skip if         | Your mark |
| --------------------- | --------------- | ------------------- | --------------- | --------- |
| `gym_curl`            | DB Curl         | 2×10, RPE ≤ 6, 45 s | —               | OK        |
| `gym_tricep_pushdown` | Tricep Pushdown | 2×10, RPE ≤ 6, 45 s | shoulder, wrist | OK        |


### Core (easy, can pair with yoga/rest)


| Id               | Title      | Prescription         | Skip if         | Your mark |
| ---------------- | ---------- | -------------------- | --------------- | --------- |
| `gym_dead_bug`   | Dead Bug   | 2×6/side, RPE ≤ 3    | spine           | OK        |
| `gym_side_plank` | Side Plank | 2×20 s/side, RPE ≤ 3 | shoulder, spine | OK        |


### Gym form (short)

**Bench.** Eyes under the bar. Feet down. Lower to mid-chest, wrists stacked, press. Spotter or pins if you might fail.

**Incline DB.** 30–45° bench. DBs over the chest, slight elbow bend at the top.

**Lat pulldown.** Bar to the upper chest, not behind the neck. Ribs down.

**Seated row.** Long spine, pull to the low ribs, no shrug.

**OHP.** Brace. Press up; do not lean the ribs forward to finish.

**Lateral raise.** Soft elbows, raise to about shoulder height, no swing.

**Back squat.** Bar on the upper back (not the neck). Knees track toes. Depth you can stand with heels down.

**Leg press.** Do not lock the knees hard. Low back stays on the pad.

**Lunge.** Front knee tracks the mid-foot. Short steps if the knee hurts.

**RDL.** Soft knees, hips back, bar close to the legs, long spine.

**Hip thrust.** Upper back on a bench, chin tucked, squeeze at the top.

**Curl / pushdown.** Elbows quiet. No body swing.

**Dead bug.** Low back heavy on the floor. Opposite arm/leg. Exhale.

**Side plank.** Elbow under shoulder, hips lifted. Knees down is allowed.

---

## C. Counts if you accept everything


| Bucket              | New ids | Notes                                             |
| ------------------- | ------- | ------------------------------------------------- |
| Yoga                | **11**  | 12th is reuse of box breath                       |
| Gym muscle-specific | **16**  | plus optional machine chest                       |
| **Total new**       | **27**  | v1 16 stay unless you DROP `str_gym_full_body_l2` |


Issuer does **not** dump 27 into one day. A typical day stays ~3–4 quests. Yoga or one gym primary + accessories over the week.

---

## D. Questions (answer with the marks)

1. New quest kind `yoga`, or keep `mobility`?  
new quest yoga
2. Keep `str_gym_full_body_l2` as a mixed fallback, or retire it once B is in?  
no start with the full body first and on level up move to B 
3. Sanskrit subtitles on yoga cards? (Default: **English only**.)  
yes sanskrit will be fine with English also.
4. Any DROP for knees-heavy yoga (Warrior II) if family testers are older?  
decide it on the basis of the age if age >45 do not suggest knees heavy yoga or workout.

