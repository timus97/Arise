import { useId, useState } from "react";

export type RankLetter = "E" | "D" | "C" | "B" | "A" | "S";

export type RankBadgeProps = {
  rank: RankLetter;
  title: string;
  tooltip: string;
};

export function RankBadge({ rank, title, tooltip }: RankBadgeProps) {
  const [open, setOpen] = useState(false);
  const tipId = useId();

  return (
    <div className="sys-rank-wrap">
      <button
        type="button"
        className="sys-rank"
        aria-label={`${rank} ${title}. ${tooltip}`}
        aria-expanded={open}
        aria-controls={tipId}
        onClick={() => setOpen((value) => !value)}
        onBlur={() => setOpen(false)}
      >
        {rank}
      </button>
      {open ? (
        <p className="sys-rank-tip" id={tipId} role="tooltip">
          {tooltip}
        </p>
      ) : null}
    </div>
  );
}
