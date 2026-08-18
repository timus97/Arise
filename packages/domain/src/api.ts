import { z } from "zod";

export const RegisterBody = z.object({
  email: z.string().email(),
  password: z.string().min(10),
  name: z.string().min(1).max(80),
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/).optional(),
  age: z.number().int(),
  inviteCode: z.string().optional(),
  acceptedMedicalDisclaimer: z.literal(true),
});
export type RegisterBody = z.infer<typeof RegisterBody>;

export const OnboardingBody = z.object({
  acceptedMedicalDisclaimer: z.literal(true),
  parq: z.object({
    chestPain: z.boolean(),
    dizziness: z.boolean(),
    doctorAdvisedAgainst: z.boolean(),
    pregnancy: z.boolean(),
    uncontrolledCondition: z.boolean(),
  }),
  profile: z.object({
    age: z.number().int().min(16).max(100),
    sex: z.enum(["female", "male", "other", "unspecified"]).optional(),
    heightCm: z.number().positive(),
    weightKg: z.number().positive(),
    units: z.enum(["metric", "imperial"]),
    timeZone: z.string().min(1), // IANA
  }),
  goal: z.object({
    type: z.enum([
      "fat_loss", "muscle_gain", "recomposition",
      "endurance", "general_fitness", "mobility",
    ]),
    targetWeightKg: z.number().positive().nullable(),
    targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  }),
  habit: z.object({
    experience: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
    equipment: z.array(z.enum(["none", "bands", "dumbbells", "full_gym"])).min(1),
    injuries: z.array(z.string()),
    injuryNotes: z.string().max(500).optional(),
    jobActivity: z.enum(["sedentary", "standing", "physical"]),
    commuteWalkMinutes: z.number().int().min(0).max(300),
    sleepWindow: z.object({
      start: z.string().regex(/^\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{2}:\d{2}$/),
    }),
    dietPreference: z.enum(["omnivore", "vegetarian", "vegan", "unspecified"]),
    week: z.array(z.object({
      weekday: z.number().int().min(1).max(7), // ISO 1=Mon … 7=Sun
      minutes: z.number().int().min(0).max(180),
    })).min(1),
  }),
});
export type OnboardingBody = z.infer<typeof OnboardingBody>;

export const ActivityStatusPut = z
  .object({
    status: z.enum(["training", "travel", "sick"]),
    days: z.number().int().min(1).max(14).optional(),
  })
  .superRefine((body, ctx) => {
    if (body.status !== "training" && body.days === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["days"],
        message: "days is required for travel and sick (1–14)",
      });
    }
  });
export type ActivityStatusPut = z.infer<typeof ActivityStatusPut>;

export const ActivityStatusView = z.object({
  status: z.enum(["training", "travel", "sick"]),
  startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  days: z.number().int().min(1).max(14).nullable(),
});
export type ActivityStatusView = z.infer<typeof ActivityStatusView>;
