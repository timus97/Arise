export const STAT_KEYS = ["str", "agi", "vit", "intl", "sta"] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export const STAT_LABELS = {
  str: "STR",
  agi: "AGI",
  vit: "VIT",
  intl: "INTL",
  sta: "STA",
} as const satisfies Record<StatKey, string>;

export type StatBlockStats = Record<StatKey, number>;

export type StatBlockProps = {
  stats: StatBlockStats;
};

export function formatStatValue(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function StatBlock({ stats }: StatBlockProps) {
  return (
    <div className="sys-stats" role="group" aria-label="Stats">
      {STAT_KEYS.map((key) => (
        <div className="sys-stat" key={key}>
          <b>{formatStatValue(stats[key])}</b>
          <small>{STAT_LABELS[key]}</small>
        </div>
      ))}
    </div>
  );
}
