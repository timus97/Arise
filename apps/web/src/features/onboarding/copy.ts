export const STEP_COUNT = 6;

export const STEP_TITLES = {
  1: "Notice",
  2: "Readiness",
  3: "Body & goal",
  4: "Life",
  5: "Training",
  6: "7-day preview",
} as const;

export const STEP_LEDES = {
  1: "Step 1 of 6. Confirm the medical notice again before PAR-Q and a plan.",
  2: "Step 2 of 6. Answer honestly. Pregnancy stops the wizard.",
  3: "Step 3 of 6. Stored in metric. Fat-loss talks steps, sleep, and consistency — not calories.",
  4: "Step 4 of 6. Stored for later. The v1 issuer does not use commute or job activity yet.",
  5: "Step 5 of 6. Equipment and injuries filter the 16-template catalog.",
  6: "Step 6 of 6. This preview writes nothing. Confirm once to persist onboarding.",
} as const;

export const CONTINUE = "Continue";
export const BACK = "Back";
export const CONFIRM_PLAN = "Confirm 7-day plan";
export const PREVIEW_LOADING = "Building preview…";
export const PREVIEW_EMPTY = "Preview the 7-day plan before you persist it.";

export const PREGNANCY_TITLE = "Not appropriate now";
export const PREGNANCY_ALERT =
  "Arise is not appropriate during pregnancy. See a clinician for prenatal exercise guidance.";
export const PREGNANCY_LEDE = "This is a dead-end. There is no retry and no plan.";
export const PREGNANCY_CTA = "Delete account";

export const UNSAFE_TITLE = "Slow the target";
export const UNSAFE_LEDE = "No calorie numbers. Stay on this step until the rate is safe.";
export const UNSAFE_CTA = "Edit goal";

export const EASY_ONLY_TITLE = "Easy-only whitelist";
export const EASY_ONLY_BANNER =
  "A readiness answer was yes. v1 will only issue easy or rest work: walks, mobility, breath, sleep.";
export const EASY_ONLY_LEDE =
  "You can still continue. See a clinician if you are unsure. No hard prescriptions.";
export const EASY_ONLY_CTA = "Continue";

export const PARQ_LABELS = {
  chestPain: "Chest pain during activity",
  dizziness: "Dizziness or fainting",
  doctorAdvisedAgainst: "A clinician advised against exercise",
  pregnancy: "Pregnancy",
  uncontrolledCondition: "An uncontrolled medical condition",
} as const;

export const GOAL_LABELS = {
  fat_loss: "Fat loss",
  muscle_gain: "Muscle",
  recomposition: "Recomp",
  endurance: "Endurance",
  general_fitness: "General",
  mobility: "Mobility",
} as const;

export const EQUIPMENT_LABELS = {
  none: "None",
  bands: "Bands",
  dumbbells: "Dumbbells",
  full_gym: "Full gym",
} as const;

export const JOB_LABELS = {
  sedentary: "Sedentary",
  standing: "Standing",
  physical: "Physical",
} as const;

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const INJURY_PRESETS = ["knee", "shoulder", "spine", "wrist"] as const;

export const PUSH_FORBIDDEN = [
  "push",
  "badge",
  "badges",
  "we'll remind you",
  "we’ll remind you",
  "bluetooth",
] as const;

export function unsafeLossAlert(maxKgPerWeek: number): string {
  return `That implied loss is faster than 1% of body weight per week. Maximum allowed is ${formatMaxKgPerWeek(maxKgPerWeek)} kg / week. Relax the date or the target.`;
}

export function formatMaxKgPerWeek(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return String(rounded);
}
