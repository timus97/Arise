import type { PlanDay } from "@arise/domain";
import { WEEKDAY_LABELS } from "./copy.js";
import type { PlanPreview } from "./types.js";
import "./onboarding.css";

function weekdayLabel(localDate: string): string {
  const [year, month, day] = localDate.split("-").map(Number);
  if (!year || !month || !day) return localDate;
  const utc = new Date(Date.UTC(year, month - 1, day));
  const iso = utc.getUTCDay() === 0 ? 7 : utc.getUTCDay();
  return WEEKDAY_LABELS[iso - 1] ?? localDate;
}

function dayMeta(day: PlanDay): string {
  if (day.focus === "rest") return "rest";
  return day.hardAllowed ? "hard ok" : "easy / rest";
}

export function PlanView({ preview }: { preview: PlanPreview }) {
  return (
    <div>
      {preview.plan.rationale.length > 0 ? (
        <ul className="hint" style={{ paddingLeft: "1.1rem" }}>
          {preview.plan.rationale.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      <div>
        {preview.days.map((day) => (
          <div className="plan-day" key={day.id}>
            <strong>
              {weekdayLabel(day.localDate)} {day.localDate}
            </strong>
            <span>
              {day.focus} · {day.budgetMinutes} min
            </span>
            <span className="meta">{dayMeta(day)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
