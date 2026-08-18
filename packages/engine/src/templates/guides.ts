import type { ExerciseGuide } from "@arise/domain";

const DISCLAIMER_STOP =
  "Sharp pain, chest pressure, or faintness. Stop. Arise is not a medical device.";

function g(
  templateId: string,
  title: string,
  parts: Omit<ExerciseGuide, "templateId" | "title">,
): ExerciseGuide {
  return { templateId, title, ...parts };
}

const GUIDES: ExerciseGuide[] = [
  g("str_sit_to_stand_l0", "Sit to Stand", {
    setup: "Sturdy chair. Feet flat, hip-width. Sit toward the front edge.",
    action: "Lean slightly forward. Stand through the whole foot. Sit down slowly.",
    breath: "Out as you stand; in as you sit.",
    stopIf: DISCLAIMER_STOP,
    doNot: "Bounce. Let the knees cave in. Rise onto the toes.",
    graphicHint: "Side: seated ready / standing tall.",
  }),
  g("str_incline_push_l0", "Incline Push", {
    setup: "Hands on a stable counter or wall. Body in one line. No sagging hips.",
    action: "Bend the elbows and lower the chest. Press to straight arms. Neck long.",
    breath: "In down; out on the press.",
    stopIf: `${DISCLAIMER_STOP} Shoulder pinch or wrist pain.`,
    doNot: "Elbows flared to 90°. Shrug. Use a wobbly table.",
    graphicHint: "Side at a counter: plank line / elbows bent.",
  }),
  g("str_backpack_row_l0", "Backpack Row", {
    setup: "Soft knees. Hinge so the back is long. Bag hanging in one hand.",
    action: "Pull the bag to the lower ribs. Pause. Lower without twisting. Switch sides.",
    breath: "Out on the pull; in on the lower.",
    stopIf: `${DISCLAIMER_STOP} Low-back pinch.`,
    doNot: "Yank with the neck. Round into a C-shape.",
    graphicHint: "Side hinge: arm hanging / bag at the ribs.",
  }),
  g("str_hip_hinge_l0", "Hip Hinge", {
    setup: "Feet hip-width. Soft knees. Hands on hips or a stick along the spine.",
    action: "Push the hips back. Shins quiet. Stand by squeezing the hips forward.",
    breath: "In as you hinge; out as you stand.",
    stopIf: `${DISCLAIMER_STOP} Sharp spine pain.`,
    doNot: "Squat the knees forward. Look at the ceiling.",
    graphicHint: "Side: tall / hips back, long spine.",
  }),
  g("str_goblet_squat_l1", "Goblet Squat", {
    setup: "Weight at the chest. Feet about shoulder-width, toes slightly out.",
    action: "Sit hips down and back. Knees over mid-foot. Heels stay down.",
    breath: "In down; out on the stand.",
    stopIf: `${DISCLAIMER_STOP} Knee pain.`,
    doNot: "Collapse the chest. Let the knees dive inward.",
    graphicHint: "Front + side: goblet hold / bottom of squat.",
  }),
  g("str_band_row_l1", "Band Row", {
    setup: "Band at chest height, or one dumbbell, hinged like the backpack row.",
    action: "Pull to the hip or low ribs. Shoulder blade toward the spine. Slow return.",
    breath: "Out on the pull.",
    stopIf: `${DISCLAIMER_STOP} Neck or low-back pinch.`,
    doNot: "Shrug. Row with only the wrist.",
    graphicHint: "Hinge family; show band or DB.",
  }),
  g("str_gym_full_body_l2", "Gym Full Body", {
    setup: "Four patterns: squat, hinge, press, row. Bar on the upper back for the squat, not the neck.",
    action: "Squat 3×5, hinge 3×5, press 3×6, row 3×8. RPE ≤ 7. Control every lower.",
    breath: "Brace before each set. Out on the hard part.",
    stopIf: `${DISCLAIMER_STOP} Pain you cannot ease by reducing load.`,
    doNot: "Over-arch the low back on the press. Round the spine on the hinge.",
    graphicHint: "Four stills: squat, hinge, press, row.",
  }),
  g("cardio_zone2_walk", "Zone 2 Walk", {
    setup: "Flat path, treadmill, indoor loop, or any-pace / wheelchair. Safe shoes.",
    action: "20 minutes continuous at talk pace. Not a jog.",
    breath: "You can speak a sentence.",
    stopIf: DISCLAIMER_STOP,
    doNot: "Race. Ignore chest pressure.",
    graphicHint: "Easy stride. Caption: Talk pace.",
  }),
  g("steps_6k", "Six Thousand Steps", {
    setup: "Normal daily walking. No special form.",
    action: "Accumulate 6000 steps across the day.",
    stopIf: DISCLAIMER_STOP,
    graphicHint: "Step-count icon. All-day total.",
  }),
  g("steps_8k", "Eight Thousand Steps", {
    setup: "Normal daily walking. No special form.",
    action: "Accumulate 8000 steps across the day.",
    stopIf: DISCLAIMER_STOP,
    graphicHint: "Step-count icon. All-day total.",
  }),
  g("mob_hip_unload", "Hip Unload", {
    setup: "Sit on the floor or a cushion. One shin in front, the other to the side (90/90).",
    action: "Tall chest. Breathe. 30 s, then switch. Do not force the knee.",
    stopIf: `${DISCLAIMER_STOP} Knee or sharp hip pinch.`,
    doNot: "Yank the back knee. Collapse onto the hands.",
    graphicHint: "Top-down 90/90. Switch sides.",
  }),
  g("mob_tspine", "Thoracic Open Book", {
    setup: "Lie on one side, knees bent and stacked. Arms straight, palms together.",
    action: "Open the top arm in a wide arc. Eyes follow the hand. 6 reps, then switch.",
    stopIf: `${DISCLAIMER_STOP} Sharp shoulder or spine pain.`,
    doNot: "Let the knees roll open to fake the rotation.",
    graphicHint: "Side-lying: arms stacked / open book.",
  }),
  g("rec_nasal_breath", "Nasal Box Breath", {
    setup: "Sit or lie. Jaw soft. Nose if you can.",
    action: "In 4 · hold 4 · out 4 · hold 4 (shorter if 4 is too long). Five minutes.",
    stopIf: "Dizziness, panic, or you cannot catch your breath. Then breathe normally.",
    doNot: "Strain the neck. Force a hold that makes you gasp.",
    graphicHint: "Four-box: in / hold / out / hold.",
  }),
  g("rec_full_rest", "Full Rest", {
    setup: "No training load today.",
    action: "Sleep, food, and easy walking around the house are enough. This is issued SYSTEM work.",
    stopIf: DISCLAIMER_STOP,
    graphicHint: "No athlete still.",
  }),
  g("habit_sleep_window", "Sleep Window", {
    setup: "Protect the planned night window.",
    action: "Dim lights. Same window most nights. This is issued work, not a consolation prize.",
    stopIf: DISCLAIMER_STOP,
    graphicHint: "No athlete still.",
  }),
  g("penalty_easy_walk", "Easy Walk", {
    setup: "Same as the zone-2 walk, shorter.",
    action: "15 minutes. RPE ≤ 4. Not extra hard volume.",
    breath: "You can speak a sentence.",
    stopIf: DISCLAIMER_STOP,
    doNot: "Treat this as a punishment workout.",
    graphicHint: "Reuse walk stills. RPE ≤ 4.",
  }),
  g("yoga_cat_cow", "Cat–Cow", {
    subtitle: "Marjaryasana–Bitilasana",
    setup: "Hands under shoulders, knees under hips.",
    action: "Inhale: chest forward, tail up (cow). Exhale: round the back, chin in (cat). Slow.",
    breath: "Move with the breath.",
    stopIf: `${DISCLAIMER_STOP} Sharp spine pain.`,
    graphicHint: "All fours: cow / cat.",
  }),
  g("yoga_child", "Child’s Pose", {
    subtitle: "Balasana",
    setup: "Big toes together. Knees wide or together. Blanket under knees if needed.",
    action: "Hips toward the heels. Arms forward or by the sides. Breathe.",
    stopIf: `${DISCLAIMER_STOP} Knee pain.`,
    graphicHint: "Folded sit. Hips back.",
  }),
  g("yoga_down_dog", "Downward Dog", {
    subtitle: "Adho Mukha Svanasana",
    setup: "Hands and feet on the floor. Hips high. Soft knees.",
    action: "Push the floor. Long spine. Heels do not have to touch.",
    stopIf: `${DISCLAIMER_STOP} Wrist or shoulder pinch.`,
    graphicHint: "Inverted V. Soft knees.",
  }),
  g("yoga_mountain", "Mountain", {
    subtitle: "Tadasana",
    setup: "Stand. Feet under hips. Arms by the sides or overhead.",
    action: "Quiet breath. Not a balance circus.",
    stopIf: DISCLAIMER_STOP,
    graphicHint: "Quiet stand.",
  }),
  g("yoga_warrior2", "Warrior II", {
    subtitle: "Virabhadrasana II",
    setup: "Long stance. Front knee tracks the second toe, not past the toes.",
    action: "Back leg long. Gaze over the front hand. 30 s each side.",
    stopIf: `${DISCLAIMER_STOP} Knee pain.`,
    graphicHint: "Side lunge-stand. Arms wide.",
  }),
  g("yoga_bridge", "Glute Bridge", {
    subtitle: "Setu Bandha Sarvangasana",
    setup: "Lie on the back. Feet flat.",
    action: "Lift the hips. Squeeze glutes. Lower slowly. Soft neck.",
    stopIf: `${DISCLAIMER_STOP} Spine pain.`,
    doNot: "Crank the neck to look forward.",
    graphicHint: "Supine: hips down / hips up.",
  }),
  g("yoga_supine_twist", "Supine Twist", {
    subtitle: "Supta Matsyendrasana",
    setup: "Lie on the back. Knees bent.",
    action: "Knees to one side. Opposite shoulder heavy. Do not force the knee to the floor.",
    stopIf: `${DISCLAIMER_STOP} Spine pain.`,
    graphicHint: "Supine twist. Shoulder down.",
  }),
  g("yoga_legs_wall", "Legs Up Wall", {
    subtitle: "Viparita Karani",
    setup: "Hips near the wall. Legs vertical. Arms easy.",
    action: "Stay 3–5 minutes. Get down slowly.",
    stopIf: `${DISCLAIMER_STOP} Tingling that does not ease.`,
    graphicHint: "Wall + vertical legs.",
  }),
  g("yoga_seated_fold", "Seated Fold", {
    subtitle: "Paschimottanasana",
    setup: "Sit tall. Legs forward.",
    action: "Hinge from the hips. Hands to shins or floor. Long spine.",
    stopIf: `${DISCLAIMER_STOP} Spine pain.`,
    doNot: "Round hard just to touch the toes.",
    graphicHint: "Seated hinge. Long back.",
  }),
  g("yoga_sphinx", "Sphinx", {
    subtitle: "Salamba Bhujangasana",
    setup: "Forearms on the floor. Elbows under the shoulders.",
    action: "Gentle chest lift. Pubic bone heavy.",
    stopIf: `${DISCLAIMER_STOP} Low-back pinch.`,
    graphicHint: "Prone. Forearms. Soft lift.",
  }),
  g("yoga_thread_needle", "Thread the Needle", {
    subtitle: "Parsva Balasana",
    setup: "All fours.",
    action: "Slide one arm under the other. Rest the shoulder. Slow. Switch sides.",
    stopIf: `${DISCLAIMER_STOP} Shoulder pinch.`,
    graphicHint: "All fours. Arm threaded.",
  }),
  g("gym_bench_press", "Bench Press", {
    setup: "Eyes under the bar. Feet down. Spotter or pins if you might fail.",
    action: "Lower to mid-chest. Wrists stacked. Press.",
    stopIf: `${DISCLAIMER_STOP} Shoulder pinch.`,
    graphicHint: "Bench. Bar over mid-chest.",
  }),
  g("gym_incline_db_press", "Incline DB Press", {
    setup: "30–45° bench. DBs over the chest.",
    action: "Lower with a slight elbow bend at the top. Press.",
    stopIf: `${DISCLAIMER_STOP} Shoulder pinch.`,
    graphicHint: "Incline bench. DBs.",
  }),
  g("gym_chest_supported", "Machine Chest Press", {
    setup: "Seat so handles are at mid-chest.",
    action: "Press. Control the return.",
    stopIf: `${DISCLAIMER_STOP} Shoulder pinch.`,
    graphicHint: "Machine press.",
  }),
  g("gym_lat_pulldown", "Lat Pulldown", {
    setup: "Thighs under the pad. Hands wide.",
    action: "Bar to the upper chest, not behind the neck. Ribs down.",
    stopIf: `${DISCLAIMER_STOP} Shoulder pinch.`,
    graphicHint: "Pulldown to upper chest.",
  }),
  g("gym_seated_row", "Seated Cable Row", {
    setup: "Long spine. Soft knees.",
    action: "Pull to the low ribs. No shrug. Slow return.",
    stopIf: DISCLAIMER_STOP,
    graphicHint: "Seated row. Long spine.",
  }),
  g("gym_chest_row", "Chest-supported Row", {
    setup: "Chest on the pad. Arms hanging.",
    action: "Pull to the ribs. Slow lower.",
    stopIf: DISCLAIMER_STOP,
    graphicHint: "Supported row.",
  }),
  g("gym_ohp", "Overhead Press", {
    setup: "Ribs stacked over the pelvis. Bar or DBs at the shoulders.",
    action: "Press until the arms are long. Lower with control.",
    stopIf: `${DISCLAIMER_STOP} Shoulder pinch or dizziness.`,
    doNot: "Over-arch the low back to finish.",
    graphicHint: "Front: shoulders / lockout.",
  }),
  g("gym_lateral_raise", "Lateral Raise", {
    setup: "Soft elbows. Light bells.",
    action: "Raise to about shoulder height. No swing.",
    stopIf: `${DISCLAIMER_STOP} Shoulder pinch.`,
    graphicHint: "Arms to shoulder height.",
  }),
  g("gym_back_squat", "Back Squat", {
    setup: "Bar on the upper back, not the neck. Feet about shoulder-width.",
    action: "Sit down and back. Knees track toes. Heels down.",
    stopIf: `${DISCLAIMER_STOP} Knee or back pain you cannot ease by reducing load.`,
    graphicHint: "Side: bar position / squat.",
  }),
  g("gym_leg_press", "Leg Press", {
    setup: "Low back stays on the pad.",
    action: "Press. Do not lock the knees hard.",
    stopIf: `${DISCLAIMER_STOP} Knee pain.`,
    graphicHint: "Leg press. Back on pad.",
  }),
  g("gym_lunge", "Walking Lunge", {
    setup: "Short steps if the knee is cranky.",
    action: "Front knee tracks the mid-foot. Alternate legs.",
    stopIf: `${DISCLAIMER_STOP} Knee pain.`,
    graphicHint: "Lunge. Front shin vertical.",
  }),
  g("gym_rdl", "Romanian Deadlift", {
    setup: "Soft knees. Weight in the hands.",
    action: "Hips back. Bar close to the legs. Long spine. Stand by driving the hips.",
    stopIf: `${DISCLAIMER_STOP} Spine rounding you cannot fix.`,
    graphicHint: "Side: long spine, hips back.",
  }),
  g("gym_hip_thrust", "Hip Thrust", {
    setup: "Upper back on a bench. Chin tucked.",
    action: "Drive the hips up. Squeeze. Lower slowly.",
    stopIf: `${DISCLAIMER_STOP} Spine pain.`,
    graphicHint: "Bench + hip lift.",
  }),
  g("gym_curl", "DB Curl", {
    setup: "Elbows by the ribs.",
    action: "Curl. No body swing. Lower slowly.",
    stopIf: DISCLAIMER_STOP,
    graphicHint: "Standing curl.",
  }),
  g("gym_tricep_pushdown", "Tricep Pushdown", {
    setup: "Elbows by the ribs.",
    action: "Push down. Control the return.",
    stopIf: `${DISCLAIMER_STOP} Shoulder or wrist pain.`,
    graphicHint: "Cable pushdown.",
  }),
  g("gym_dead_bug", "Dead Bug", {
    setup: "Lie on the back. Low back heavy.",
    action: "Opposite arm and leg reach. Exhale. Switch.",
    stopIf: `${DISCLAIMER_STOP} Spine pain.`,
    graphicHint: "Supine. Opposite limbs.",
  }),
  g("gym_side_plank", "Side Plank", {
    setup: "Elbow under the shoulder. Knees down is allowed.",
    action: "Hips lifted. Breathe. Switch sides.",
    stopIf: `${DISCLAIMER_STOP} Shoulder or spine pain.`,
    graphicHint: "Side plank. Hips up.",
  }),
];

const BY_ID = new Map(GUIDES.map((guide) => [guide.templateId, guide]));

export function guideFor(templateId: string): ExerciseGuide | undefined {
  return BY_ID.get(templateId);
}

export function allGuides(): readonly ExerciseGuide[] {
  return GUIDES;
}
