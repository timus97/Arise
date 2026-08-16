export const PROGRESS_TITLE = "Progress";
export const PROGRESS_LEDE = "XP, five stats, and rank history for the last 90 days.";
export const PROGRESS_WINDOW = "Last 90 days";

export const RANKS_HEADING = "Ranks";
export const RANK_HISTORY_HEADING = "Rank history";
export const RANK_HISTORY_EMPTY = "No rank changes in the last 90 days.";
export const XP_HEADING = "XP";
export const XP_LOG_EMPTY = "No XP events in the last 90 days.";

export const SIGN_IN_LEDE = "Sign in to see XP, stats, and rank history.";
export const SIGN_IN_CTA = "Sign in";

export const RANK_TITLES = {
  E: "Initiate",
  D: "Adept",
  C: "Operative",
  B: "Veteran",
  A: "Elite",
  S: "Sovereign",
} as const;

export const RANK_TOOLTIP =
  "B needs a 14-day completion rate of at least 50%. A needs a 30-day rate of at least 60%. S needs a 30-day rate of at least 70% and penaltyPoints30d under 8.";

export const RANK_REASON_LABELS = {
  level: "Level",
  gate: "Gate",
  destabilized: "Destabilized",
} as const;

export const XP_REASON_LABELS = {
  complete: "Complete",
  partial: "Partial",
  auto: "Auto",
  penalty_eval: "Penalty",
  rank_adjust: "Rank adjust",
} as const;

export const ONBOARDING_TITLE = "Onboarding required";
export const ONBOARDING_LEDE =
  "This account still needs onboarding before progress is available.";
export const ONBOARDING_CTA = "Continue to onboarding";

export const PREGNANCY_TITLE = "Not appropriate now";
export const PREGNANCY_ALERT =
  "Arise is not appropriate during pregnancy. See a clinician for prenatal exercise guidance.";
export const PREGNANCY_LEDE = "This is a dead-end. There is no retry and no plan.";
export const PREGNANCY_CTA = "Delete account";

export const PROGRESS_FORBIDDEN = [
  "calorie",
  "calories",
  "leaderboard",
  "leaderboards",
  "pvp",
  "social",
] as const;
