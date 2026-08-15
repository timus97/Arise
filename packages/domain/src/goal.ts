import { z } from "zod";
import { PlayerStats } from "./player.js";

export const GoalType = z.enum([
  "fat_loss",
  "muscle_gain",
  "recomposition",
  "endurance",
  "general_fitness",
  "mobility",
]);

export type GoalType = z.infer<typeof GoalType>;

export const Goal = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  type: GoalType,
  targetDate: z.string().nullable(),
  targetWeightKg: z.number().nullable(),
  weeklyAvailableMinutes: z.number(),
  priority: z.number(),
  active: z.boolean(),
  createdAt: z.string(),
});

export type Goal = z.infer<typeof Goal>;

export const GOAL_STAT_WEIGHTS: Record<GoalType, PlayerStats> = {
  fat_loss: { str: 0.8, agi: 1.0, vit: 0.8, intl: 0.6, sta: 1.4 },
  muscle_gain: { str: 1.6, agi: 0.6, vit: 0.8, intl: 0.5, sta: 0.7 },
  recomposition: { str: 1.3, agi: 0.8, vit: 0.8, intl: 0.6, sta: 1.0 },
  endurance: { str: 0.6, agi: 1.1, vit: 0.7, intl: 0.5, sta: 1.7 },
  general_fitness: { str: 1.0, agi: 1.0, vit: 1.0, intl: 0.8, sta: 1.0 },
  mobility: { str: 0.5, agi: 0.7, vit: 1.8, intl: 0.8, sta: 0.6 },
};

export const GoalStatWeights = z.record(GoalType, PlayerStats);
export type GoalStatWeights = z.infer<typeof GoalStatWeights>;
