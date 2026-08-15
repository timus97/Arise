import { z } from "zod";
import { GoalType } from "./goal.js";
import { PartialPlayerStats } from "./player.js";

export const QuestKind = z.enum([
  "strength",
  "cardio",
  "steps",
  "mobility",
  "skill",
  "recovery",
  "habit",
  "penalty",
]);
export type QuestKind = z.infer<typeof QuestKind>;

export const QuestStatus = z.enum([
  "issued",
  "completed",
  "partial",
  "skipped",
  "failed",
  "auto_completed",
]);
export type QuestStatus = z.infer<typeof QuestStatus>;

/** Location is not a gate — there is no `outdoor` value. */
export const Equipment = z.enum(["none", "bands", "dumbbells", "full_gym"]);
export type Equipment = z.infer<typeof Equipment>;

export const PatternTag = z.enum([
  "squat",
  "hinge",
  "push",
  "pull",
  "carry",
  "core",
  "gait",
  "interval",
  "isometric",
  "mobility_hip",
  "mobility_tspine",
  "mobility_ankle",
  "breath",
]);
export type PatternTag = z.infer<typeof PatternTag>;

export const Intensity = z.enum(["rest", "easy", "moderate", "hard"]);
export type Intensity = z.infer<typeof Intensity>;

export const ExperienceTag = z.enum(["beginner", "intermediate", "advanced"]);
export type ExperienceTag = z.infer<typeof ExperienceTag>;

export const ExperienceLevel = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);
export type ExperienceLevel = z.infer<typeof ExperienceLevel>;

export const QuestBlock = z.object({
  name: z.string(),
  sets: z.number().optional(),
  reps: z.number().optional(),
  seconds: z.number().optional(),
  distanceM: z.number().optional(),
  steps: z.number().optional(),
  rpeMax: z.number(),
  restSec: z.number().optional(),
  notes: z.string().optional(),
});
export type QuestBlock = z.infer<typeof QuestBlock>;

export const QuestPrescription = z.object({
  blocks: z.array(QuestBlock),
  estimatedMinutes: z.number(),
  intensity: Intensity,
});
export type QuestPrescription = z.infer<typeof QuestPrescription>;

export const HealthPredicate = z.object({
  metric: z.enum(["steps", "sleep_minutes", "active_minutes"]),
  op: z.literal("gte"),
  value: z.number(),
});
export type HealthPredicate = z.infer<typeof HealthPredicate>;

export const QuestSource = z.enum(["issuer", "penalty", "manual"]);
export type QuestSource = z.infer<typeof QuestSource>;

export const DailyQuest = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  localDate: z.string(),
  templateId: z.string().min(1),
  title: z.string(),
  flavor: z.string(),
  kind: QuestKind,
  status: QuestStatus,
  prescription: QuestPrescription,
  xpReward: z.number(),
  statDelta: PartialPlayerStats,
  autoCompletable: z.boolean(),
  healthPredicate: HealthPredicate.optional(),
  modifiersApplied: z.array(z.string()),
  source: QuestSource,
  /** `${userId}:${localDate}:${templateId}` */
  idempotencyKey: z.string().min(1),
});
export type DailyQuest = z.infer<typeof DailyQuest>;

export interface QuestTemplate {
  id: string;
  kind: QuestKind;
  title: string;
  flavor: string;
  goalTags: GoalType[];
  experienceTags: Array<"beginner" | "intermediate" | "advanced">;
  patternTags: PatternTag[];
  requiredAny: Equipment[];
  requiredAll: Equipment[];
  contraindicationKeys: string[];
  minExperience: 0 | 1 | 2 | 3;
  baseMinutes: number;
  intensity: "rest" | "easy" | "moderate" | "hard";
  statDelta: PartialPlayerStats;
  baseXp: number;
  autoCompletable: boolean;
  healthPredicate?: DailyQuest["healthPredicate"];
  build(args: {
    experience: number;
    recoveryScore: number;
    budgetMinutes: number;
    volumeMul: number;
  }): QuestPrescription;
}
