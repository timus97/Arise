import { z } from "zod";

export const Rank = z.enum(["E", "D", "C", "B", "A", "S"]);
export type Rank = z.infer<typeof Rank>;

export const Units = z.enum(["metric", "imperial"]);
export type Units = z.infer<typeof Units>;

/** Keys are only these five. `intl` is never `int` in JSON, SQL, or TS. */
export const PlayerStats = z
  .object({
    str: z.number(),
    agi: z.number(),
    vit: z.number(),
    intl: z.number(),
    sta: z.number(),
  })
  .strict();

export type PlayerStats = z.infer<typeof PlayerStats>;

export const PartialPlayerStats = PlayerStats.partial();
export type PartialPlayerStats = z.infer<typeof PartialPlayerStats>;

export const DEFAULT_STATS: PlayerStats = {
  str: 10,
  agi: 10,
  vit: 10,
  intl: 10,
  sta: 10,
};

export const STAT_KEYS = ["str", "agi", "vit", "intl", "sta"] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export const PlayerProfile = z.object({
  userId: z.string().min(1),
  level: z.number(),
  xp: z.number(),
  xpIntoLevel: z.number(), // derived: xp - xpAtLevelStart(level); not a DB column
  rank: Rank,
  title: z.string(),
  stats: PlayerStats,
  streakDays: z.number(),
  bestStreakDays: z.number(),
  penaltyPoints30d: z.number(), // denormalized; source of truth = xp_events
  units: Units,
  timeZone: z.string().min(1),
});

export type PlayerProfile = z.infer<typeof PlayerProfile>;
