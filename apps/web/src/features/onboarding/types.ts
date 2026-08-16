import type { GoalType, OnboardingBody, Plan, PlanDay, PlayerStats, Units } from "@arise/domain";

export const PARQ_KEYS = [
  "chestPain",
  "dizziness",
  "doctorAdvisedAgainst",
  "pregnancy",
  "uncontrolledCondition",
] as const;

export type ParqKey = (typeof PARQ_KEYS)[number];
export type EquipmentId = OnboardingBody["habit"]["equipment"][number];
export type JobActivity = OnboardingBody["habit"]["jobActivity"];
export type DietPreference = OnboardingBody["habit"]["dietPreference"];
export type Experience = OnboardingBody["habit"]["experience"];
export type Sex = NonNullable<OnboardingBody["profile"]["sex"]>;

export type DraftParq = Record<ParqKey, boolean | null>;

export type WeekSlot = { weekday: number; minutes: number };

export type OnboardingDraft = {
  acceptedMedicalDisclaimer: boolean;
  parq: DraftParq;
  age: string;
  sex: Sex | "";
  height: string;
  weight: string;
  units: Units;
  timeZone: string;
  goalType: GoalType | null;
  targetWeight: string;
  targetDate: string;
  sleepStart: string;
  sleepEnd: string;
  jobActivity: JobActivity | null;
  commuteWalkMinutes: string;
  dietPreference: DietPreference;
  experience: Experience | null;
  equipment: EquipmentId[];
  injuries: string[];
  injuryNotes: string;
  week: WeekSlot[];
};

export type StepId = 1 | 2 | 3 | 4 | 5 | 6;

export type WizardPhase =
  | { kind: "step"; step: StepId }
  | { kind: "easyOnly" }
  | { kind: "pregnancy" };

export type PlanPreview = {
  plan: Plan;
  days: PlanDay[];
};

export type OnboardingProfile = {
  userId: string;
  level: number;
  xp: number;
  xpIntoLevel: number;
  rank: string;
  title: string;
  stats: PlayerStats;
  streakDays: number;
  bestStreakDays: number;
  penaltyPoints30d: number;
  units: Units;
  timeZone: string;
  onboardingStatus: string;
  parqClear: boolean;
  age: number;
};

export type OnboardingSuccess = PlanPreview & {
  profile: OnboardingProfile;
};

export type WizardIntent = "none" | "putPregnancy" | "loadPreview" | "persist";
