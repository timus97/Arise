export type XpBarProps = {
  level: number;
  xp: number;
  xpToNext: number;
  label?: string;
};

export function xpProgress(xp: number, xpToNext: number): number {
  if (xpToNext <= 0) return 0;
  return Math.min(100, Math.max(0, (xp / xpToNext) * 100));
}

export function XpBar({ level, xp, xpToNext, label }: XpBarProps) {
  const width = xpProgress(xp, xpToNext);
  const meta = label ?? `Lv ${level} · ${xp} / ${xpToNext} XP`;
  return (
    <div className="sys-xp-wrap">
      <p className="sys-xp-meta">{meta}</p>
      <div
        className="sys-xp"
        role="progressbar"
        aria-valuenow={Math.round(width)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Experience"
      >
        <i style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
