export const SKIP_TITLE = "Skip this quest";
export const SKIP_LEDE = "Read the consequence before you confirm.";
export const SKIP_CONFIRM = "Confirm skip";
export const SKIP_CANCEL = "Cancel";

export const SKIP_LABELS = {
  rest_planned: "Rest planned",
  illness: "Illness",
  pain: "Pain",
  busy: "Busy",
} as const;

export const SKIP_CONSEQUENCES = {
  rest_planned: "Streak freezes. This is not a fail.",
  illness: "Streak freezes. This is not a fail. Two illness days in a row rest tomorrow.",
  pain: "Streak freezes. This is not a fail. No hard work for 24 hours.",
  busy: "Streak freezes — unless this is the third busy skip this ISO week, which is a fail, not a freeze.",
} as const;

export const SKIP_BUSY_THIRD =
  "This is the third busy skip this ISO week. Confirming fails the quest. The streak resets.";

export const P4_CAUTION =
  "Today was rewritten. Three failed days triggered a caution window. Volume is reduced for two local days.";
export const P4_SLEEP =
  "Today was rewritten. Last night’s sleep dropped recovery, so intensity is easy and volume is reduced.";
export const P4_RECOVERY_GATE =
  "Today was rewritten. Recovery gated intensity. Hard work is off the board.";
export const P4_STEPS_RESIDUAL =
  "Today was rewritten. Logged steps already cover part of the walk. Remaining steps: {remainingSteps}. Do not redo the full target.";
export const P4_AUTO_STEPS = "Today was rewritten. Logged steps completed the walk.";

export const EMPTY_TITLE = "No work issued";
export const EMPTY_LEDE =
  "Today is open. Issue the day’s quests from your current plan and recovery.";
export const EMPTY_CTA = "Issue today’s quests";

export const PENALTY_KIND_CHIP = "Penalty · easy";
export const PENALTY_TITLE = "Easy Walk";
export const PENALTY_PRESCRIPTION =
  "This is an easy walk, RPE ≤ 4, at most 20 minutes. It is not extra hard volume.";
export const PENALTY_XP_LINE = "Completing it is 10 XP. It does not farm rank.";

export const PREGNANCY_TITLE = "Not appropriate now";
export const PREGNANCY_ALERT =
  "Arise is not appropriate during pregnancy. See a clinician for prenatal exercise guidance.";
export const PREGNANCY_LEDE = "This is a dead-end. There is no retry and no plan.";
export const PREGNANCY_CTA = "Delete account";

export const COMPLETE_TITLE = "Log the work";
export const COMPLETE_LEDE =
  "Full = all blocks. Partial = you did at least half the work. Partial is 50% XP. No set-by-set log.";
export const COMPLETE_FULL = "Full";
export const COMPLETE_PARTIAL = "Partial";
export const COMPLETE_CONFIRM_FULL = "Confirm full";
export const COMPLETE_CONFIRM_PARTIAL = "Confirm partial";
export const COMPLETE_CANCEL = "Cancel";

export const RANK_TOOLTIP =
  "B needs a 14-day completion rate of at least 50%. A needs a 30-day rate of at least 60%. S needs a 30-day rate of at least 70% and penaltyPoints30d under 8.";

export const AUTO_STEPS_TOAST = "SYSTEM auto-completed the steps quest from logged steps.";
export const AUTO_SLEEP_TOAST = "SYSTEM auto-completed the sleep window from logged sleep.";

export const HABIT_KIND_CHIP = "Habit · issued work";
export const RECOVERY_KIND_CHIP = "Recovery · issued work";
export const SLEEP_WINDOW_RX =
  "Protect the night window. This is issued SYSTEM work, not a consolation prize.";
export const NASAL_BREATH_RX =
  "Five minutes of quiet nasal breathing. This is issued SYSTEM work — a power-up, not a skipped day.";
export const FULL_REST_RX =
  "No training load today. Full rest is issued SYSTEM work. The streak is held, not broken.";
export const REST_DAY_BANNER = "Rest day. The streak is held, not broken.";

export const REGEN_BANNER =
  "Completion over the last 7 days is under 30%. You can rewrite the week. History stays.";
export const REGEN_BUTTON = "Rewrite this week";
export const REGEN_HINT = "The week is never auto-regenerated in v1.";

export const SYSTEM_DISCLAIMER =
  "Arise is not a medical device. Stop if you feel pain, chest pressure, or faintness.";
export const DAY_CLOSED_TOAST = "The day closed.";

export const ONBOARDING_TITLE = "Onboarding required";
export const ONBOARDING_LEDE =
  "This account still needs onboarding before the SYSTEM window can issue work.";
export const ONBOARDING_CTA = "Continue to onboarding";

export const RANK_TITLES = {
  E: "Initiate",
  D: "Adept",
  C: "Operative",
  B: "Veteran",
  A: "Elite",
  S: "Sovereign",
} as const;

export const PUSH_FORBIDDEN = [
  "push",
  "badge",
  "badges",
  "we'll remind you",
  "we’ll remind you",
  "bluetooth",
  "calorie",
  "calories",
] as const;
