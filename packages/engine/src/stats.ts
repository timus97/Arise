import {
  STAT_KEYS,
  type PartialPlayerStats,
  type PlayerStats,
} from "@arise/domain";

/** Per-stat ceiling relative to the local-midnight snapshot. */
export const STAT_TICK_CAP = 1.0;

export function scaleStatDelta(
  delta: PartialPlayerStats,
  multiplier: number,
): PartialPlayerStats {
  const out: PartialPlayerStats = {};
  for (const key of STAT_KEYS) {
    const value = delta[key];
    if (value !== undefined) {
      out[key] = value * multiplier;
    }
  }
  return out;
}

/**
 * `newStat = min(old + tick, old_at_local_midnight + 1.0)` per key.
 * Partial effort applies a 0.5 multiplier to the template delta first.
 */
export function applyStatTick(args: {
  current: PlayerStats;
  midnight: PlayerStats;
  delta: PartialPlayerStats;
  effort?: "full" | "partial";
}): PlayerStats {
  const mul = args.effort === "partial" ? 0.5 : 1;
  const next: PlayerStats = { ...args.current };
  for (const key of STAT_KEYS) {
    const tick = (args.delta[key] ?? 0) * mul;
    next[key] = Math.min(args.current[key] + tick, args.midnight[key] + STAT_TICK_CAP);
  }
  return next;
}
