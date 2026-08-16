import { useState } from "react";
import { SKIP_LABELS } from "./copy.js";
import { SKIP_REASONS, skipSheetModel } from "./skip.js";
import type { SkipReason, TodayQuest } from "./types.js";

type SkipSheetProps = {
  quest: TodayQuest;
  busySkipsWeek: number | null;
  pending: boolean;
  onConfirm: (reason: SkipReason) => void;
  onCancel: () => void;
};

export function SkipSheet({
  quest,
  busySkipsWeek,
  pending,
  onConfirm,
  onCancel,
}: SkipSheetProps) {
  const [reason, setReason] = useState<SkipReason | null>(null);
  const model = skipSheetModel(reason, busySkipsWeek);

  return (
    <div className="sys-sheet-backdrop" role="presentation">
      <div className="sys-sheet" role="dialog" aria-modal="true" aria-labelledby="sys-skip-title">
        <h2 id="sys-skip-title">{model.title}</h2>
        <p className="lede">{model.lede}</p>
        <p className="hint">{quest.title}</p>
        <fieldset className="sys-skip-reasons">
          <legend className="sr-only">Skip reason</legend>
          {SKIP_REASONS.map((value) => (
            <label className="check" key={value}>
              <input
                type="radio"
                name="skip-reason"
                value={value}
                checked={reason === value}
                disabled={pending}
                onChange={() => setReason(value)}
              />
              <span>
                <strong>{SKIP_LABELS[value]}</strong>
              </span>
            </label>
          ))}
        </fieldset>
        {model.consequence ? (
          <p className="banner banner-warn" role="status" data-testid="skip-consequence">
            {model.consequence}
          </p>
        ) : (
          <p className="hint">Select a reason to read the consequence.</p>
        )}
        <div className="actions">
          <button
            type="button"
            className="btn btn-danger"
            disabled={!model.confirmEnabled || pending}
            onClick={() => {
              if (reason) onConfirm(reason);
            }}
          >
            {pending ? "Saving…" : model.confirm}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={pending}>
            {model.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
