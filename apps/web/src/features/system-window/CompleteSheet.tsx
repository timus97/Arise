import { useState } from "react";
import {
  COMPLETE_CANCEL,
  COMPLETE_CONFIRM_FULL,
  COMPLETE_CONFIRM_PARTIAL,
  COMPLETE_FULL,
  COMPLETE_LEDE,
  COMPLETE_PARTIAL,
  COMPLETE_TITLE,
} from "./copy.js";
import type { QuestEffort, TodayQuest } from "./types.js";

type CompleteSheetProps = {
  quest: TodayQuest;
  pending: boolean;
  onConfirm: (effort: QuestEffort) => void;
  onCancel: () => void;
};

export function CompleteSheet({ quest, pending, onConfirm, onCancel }: CompleteSheetProps) {
  const [effort, setEffort] = useState<QuestEffort>("full");
  const confirmLabel = effort === "partial" ? COMPLETE_CONFIRM_PARTIAL : COMPLETE_CONFIRM_FULL;

  return (
    <div className="sys-sheet-backdrop" role="presentation">
      <div className="sys-sheet" role="dialog" aria-modal="true" aria-labelledby="sys-complete-title">
        <h2 id="sys-complete-title">{COMPLETE_TITLE}</h2>
        <p className="lede">{COMPLETE_LEDE}</p>
        <p className="hint">{quest.title}</p>
        <div className="seg" role="group" aria-label="Effort">
          <button
            type="button"
            className="btn"
            aria-pressed={effort === "full"}
            onClick={() => setEffort("full")}
            disabled={pending}
          >
            {COMPLETE_FULL}
          </button>
          <button
            type="button"
            className="btn"
            aria-pressed={effort === "partial"}
            onClick={() => setEffort("partial")}
            disabled={pending}
          >
            {COMPLETE_PARTIAL}
          </button>
        </div>
        <div className="actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onConfirm(effort)}
            disabled={pending}
          >
            {pending ? "Saving…" : confirmLabel}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={pending}>
            {COMPLETE_CANCEL}
          </button>
        </div>
      </div>
    </div>
  );
}
