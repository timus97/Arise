import { Panel, RankBadge, StatBlock, XpBar } from "@arise/ui";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { formatAuthError, getSession, sessionQueryKey } from "../../lib/auth-client.js";
import {
  ONBOARDING_CTA,
  ONBOARDING_LEDE,
  ONBOARDING_TITLE,
  PREGNANCY_ALERT,
  PREGNANCY_CTA,
  PREGNANCY_LEDE,
  PREGNANCY_TITLE,
  PROGRESS_LEDE,
  PROGRESS_TITLE,
  RANK_HISTORY_EMPTY,
  RANK_HISTORY_HEADING,
  RANK_TOOLTIP,
  RANKS_HEADING,
  SIGN_IN_CTA,
  SIGN_IN_LEDE,
  XP_HEADING,
  XP_LOG_EMPTY,
} from "./copy.js";
import {
  isRank,
  presentRankEvent,
  presentXpEvent,
  progressWindowLabel,
  rankLadder,
  titleForRank,
  xpIntoLevel,
  xpToNextLevel,
} from "./presentation.js";
import { getProgress, progressGateFromError, progressQueryKey } from "./progress-client.js";
import type { ProgressPayload } from "./types.js";

export function ProgressView() {
  const session = useQuery({
    queryKey: sessionQueryKey,
    queryFn: getSession,
  });

  const progressQuery = useQuery({
    queryKey: progressQueryKey,
    queryFn: getProgress,
    enabled: Boolean(session.data),
  });

  if (session.isPending) {
    return (
      <Panel>
        <h1>{PROGRESS_TITLE}</h1>
        <p className="lede">Checking session…</p>
      </Panel>
    );
  }

  if (session.isError) {
    return (
      <Panel>
        <h1>{PROGRESS_TITLE}</h1>
        <p className="banner banner-error" role="alert">
          {session.error instanceof Error
            ? session.error.message
            : "Could not reach the API."}
        </p>
      </Panel>
    );
  }

  if (!session.data) {
    return (
      <Panel>
        <h1>{PROGRESS_TITLE}</h1>
        <p className="lede">{SIGN_IN_LEDE}</p>
        <div className="actions">
          <Link to="/login" className="btn">
            {SIGN_IN_CTA}
          </Link>
        </div>
      </Panel>
    );
  }

  if (progressQuery.isPending) {
    return (
      <Panel>
        <h1>{PROGRESS_TITLE}</h1>
        <p className="lede">Loading the last 90 days…</p>
      </Panel>
    );
  }

  const gate = progressGateFromError(progressQuery.error);
  if (gate === "onboarding") {
    return (
      <Panel>
        <h1>{ONBOARDING_TITLE}</h1>
        <p className="lede">{ONBOARDING_LEDE}</p>
        <div className="actions">
          <a className="btn btn-primary" href="/onboarding">
            {ONBOARDING_CTA}
          </a>
        </div>
      </Panel>
    );
  }

  if (gate === "pregnancy") {
    return (
      <Panel>
        <h1>{PREGNANCY_TITLE}</h1>
        <p className="banner banner-error" role="alert">
          {PREGNANCY_ALERT}
        </p>
        <p className="lede">{PREGNANCY_LEDE}</p>
        <div className="actions">
          <Link to="/settings" className="btn btn-danger">
            {PREGNANCY_CTA}
          </Link>
        </div>
      </Panel>
    );
  }

  if (progressQuery.isError) {
    return (
      <Panel>
        <h1>{PROGRESS_TITLE}</h1>
        <p className="banner banner-error" role="alert">
          {formatAuthError(progressQuery.error)}
        </p>
      </Panel>
    );
  }

  const progress = progressQuery.data;
  if (!progress) return null;

  return <ProgressBody progress={progress} />;
}

function ProgressBody({ progress }: { progress: ProgressPayload }) {
  const rank = isRank(progress.player.rank) ? progress.player.rank : "E";
  const title = titleForRank(rank, progress.player.title);
  const into = xpIntoLevel(progress.player.xp, progress.player.level);
  const toNext = xpToNextLevel(progress.player.level);
  const rankEvents = progress.rankEvents.map(presentRankEvent);
  const xpEvents = progress.xpEvents.map(presentXpEvent);

  return (
    <Panel>
      <h1>{PROGRESS_TITLE}</h1>
      <p className="lede">{PROGRESS_LEDE}</p>
      <p className="hint">{progressWindowLabel(progress)}</p>

      <header className="sys-player-block">
        <div className="sys-player">
          <RankBadge rank={rank} title={title} tooltip={RANK_TOOLTIP} />
          <div>
            <p className="sys-player-title">{title}</p>
            <p className="sys-player-meta">
              {rank} · Lv {progress.player.level}
            </p>
          </div>
          <div className="sys-streak">streak {progress.player.streakDays}</div>
        </div>
        <XpBar level={progress.player.level} xp={into} xpToNext={toNext} />
        <StatBlock stats={progress.player.stats} />
      </header>

      <div className="section">
        <h2>{RANKS_HEADING}</h2>
        <ul className="seg">
          {rankLadder().map((item) => (
            <li key={item.rank} className="hint">
              <span className="mono">{item.rank}</span> {item.title}
            </li>
          ))}
        </ul>
      </div>

      <div className="section">
        <h2>{RANK_HISTORY_HEADING}</h2>
        {rankEvents.length === 0 ? (
          <p className="hint">{RANK_HISTORY_EMPTY}</p>
        ) : (
          <ol>
            {rankEvents.map((event) => (
              <li key={event.id}>
                <p className="hint">
                  {event.line} · {event.reasonLabel}
                </p>
                <p className="hint mono">{event.createdAt}</p>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="section">
        <h2>{XP_HEADING}</h2>
        {xpEvents.length === 0 ? (
          <p className="hint">{XP_LOG_EMPTY}</p>
        ) : (
          <ol>
            {xpEvents.map((event) => (
              <li key={event.id}>
                <p className="hint">{event.line}</p>
                <p className="hint mono">{event.createdAt}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Panel>
  );
}
