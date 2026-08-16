import type { RankLetter } from "./RankBadge.js";

export type RankUpModalProps = {
  fromRank: RankLetter;
  fromTitle: string;
  toRank: RankLetter;
  toTitle: string;
  onClose: () => void;
};

export function RankUpModal({
  fromRank,
  fromTitle,
  toRank,
  toTitle,
  onClose,
}: RankUpModalProps) {
  return (
    <div className="sys-modal-backdrop" role="presentation">
      <section className="panel sys-panel sys-rankup" role="dialog" aria-modal="true" aria-labelledby="sys-rankup-title">
        <div className="sys-rank" aria-hidden="true">
          {toRank}
        </div>
        <h2 id="sys-rankup-title">Rank up</h2>
        <p className="lede">
          {fromRank} {fromTitle} → {toRank} {toTitle}.
        </p>
        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Continue
          </button>
        </div>
      </section>
    </div>
  );
}
