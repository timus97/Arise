import { z } from "zod";

export const EffectKind = z.enum([
  "pain_no_hard",
  "illness_rest",
  "caution_volume",
]);
export type EffectKind = z.infer<typeof EffectKind>;

export const UserEffect = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  kind: EffectKind,
  startsAt: z.string(), // ISO UTC
  endsAt: z.string(),
  payload: z.record(z.union([z.number(), z.string()])),
});
export type UserEffect = z.infer<typeof UserEffect>;
