import { z } from "zod";

export const Plan = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  goalId: z.string().min(1),
  version: z.number(),
  startDate: z.string(),
  endDate: z.string(),
  rationale: z.array(z.string()),
});
export type Plan = z.infer<typeof Plan>;

export const DayFocus = z.enum([
  "push",
  "pull",
  "legs",
  "full_body",
  "cardio",
  "mixed",
  "mobility",
  "rest",
]);
export type DayFocus = z.infer<typeof DayFocus>;

export const PlanDay = z.object({
  id: z.string().min(1),
  planId: z.string().min(1),
  localDate: z.string(),
  focus: DayFocus,
  budgetMinutes: z.number(),
  hardAllowed: z.boolean(),
  isGate: z.boolean(), // exactly one true per plan version, or none if no day qualifies
});
export type PlanDay = z.infer<typeof PlanDay>;
