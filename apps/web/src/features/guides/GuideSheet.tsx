import { SYSTEM_DISCLAIMER } from "../system-window/copy.js";
import type { TodayQuest } from "../system-window/types.js";

export const GUIDE_TITLE = "Guide";
export const GUIDE_CLOSE = "Close";

export function GuideSheet({
  quest,
  onClose,
}: {
  quest: TodayQuest;
  onClose: () => void;
}) {
  const guide = quest.guide;
  return (
    <div className="sys-sheet-backdrop" role="presentation">
      <div className="sys-sheet" role="dialog" aria-modal="true" aria-labelledby="guide-title">
        <h2 id="guide-title">{GUIDE_TITLE}</h2>
        <h3>{guide?.title ?? quest.title}</h3>
        {guide?.subtitle ? <p className="hint">{guide.subtitle}</p> : null}
        {guide ? (
          <>
            <p>
              <strong>Setup.</strong> {guide.setup}
            </p>
            <p>
              <strong>Action.</strong> {guide.action}
            </p>
            {guide.breath ? (
              <p>
                <strong>Breath.</strong> {guide.breath}
              </p>
            ) : null}
            <p>
              <strong>Stop if.</strong> {guide.stopIf}
            </p>
            {guide.doNot ? (
              <p>
                <strong>Do not.</strong> {guide.doNot}
              </p>
            ) : null}
          </>
        ) : (
          <p className="lede">{quest.flavor}</p>
        )}
        <p className="footer-note" role="note">
          {SYSTEM_DISCLAIMER}
        </p>
        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>
            {GUIDE_CLOSE}
          </button>
        </div>
      </div>
    </div>
  );
}
