import {
  Panel,
  QuestCard,
  RankBadge,
  RankUpModal,
  StatBlock,
  SystemToast,
  XpBar,
  type RankLetter,
} from "@arise/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState } from "react";
import { formatAuthError } from "../../lib/auth-client.js";
import { completeQuestOrQueue, skipQuestOrQueue } from "../../lib/offline-queue.js";
import { useOutboxDrain } from "../../lib/use-outbox-drain.js";
import { ActivityStatusPanel } from "../status/ActivityStatusPanel.js";
import { formatStatusBanner } from "../../lib/activity-status.js";
import { InstallEducation } from "../pwa/InstallEducation.js";
import { CompleteSheet } from "./CompleteSheet.js";
import { SkipSheet } from "./SkipSheet.js";
import {
  DAY_CLOSED_TOAST,
  EMPTY_CTA,
  EMPTY_LEDE,
  EMPTY_TITLE,
  ONBOARDING_CTA,
  ONBOARDING_LEDE,
  ONBOARDING_TITLE,
  PREGNANCY_ALERT,
  PREGNANCY_CTA,
  PREGNANCY_LEDE,
  PREGNANCY_TITLE,
  RANK_TOOLTIP,
  REGEN_BANNER,
  REGEN_BUTTON,
  REGEN_HINT,
  SYSTEM_DISCLAIMER,
} from "./copy.js";
import { autoCompleteToasts, recoveryRewriteBanner, restDayBanner } from "./recovery.js";
import { busySkipsFromPayload } from "./skip.js";
import {
  isRank,
  isRankUp,
  planDayLine,
  presentQuest,
  titleForRank,
  xpIntoLevel,
} from "./presentation.js";
import {
  ensureToday,
  getToday,
  isDayClosedError,
  regenerateWeek,
  todayGateFromError,
  todayQueryKey,
} from "./today-client.js";
import type { QuestEffort, SkipReason, TodayPayload, TodayQuest } from "./types.js";

type Sheet =
  | { kind: "complete"; quest: TodayQuest }
  | { kind: "skip"; quest: TodayQuest };

type RankUpState = {
  fromRank: RankLetter;
  fromTitle: string;
  toRank: RankLetter;
  toTitle: string;
};

type ToastItem = { id: string; message: string };

export function SystemWindow() {
  const queryClient = useQueryClient();
  const toastSeq = useRef(0);
  const seenAuto = useRef(new Set<string>());
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [rankUp, setRankUp] = useState<RankUpState | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

  const todayQuery = useQuery({
    queryKey: todayQueryKey,
    queryFn: getToday,
  });

  function pushToast(message: string) {
    toastSeq.current += 1;
    const id = `toast-${toastSeq.current}`;
    setToasts((current) => [...current, { id, message }]);
  }

  useOutboxDrain({
    onDayClosed: () => pushToast(DAY_CLOSED_TOAST),
    onDrained: () => {
      void queryClient.invalidateQueries({ queryKey: todayQueryKey });
    },
  });

  function dismissToast(id: string) {
    setToasts((current) => current.filter((item) => item.id !== id));
  }

  useEffect(() => {
    const payload = todayQuery.data;
    if (!payload) return;
    for (const message of autoCompleteToasts(payload)) {
      const key = `${payload.date}:${message}`;
      if (seenAuto.current.has(key)) continue;
      seenAuto.current.add(key);
      try {
        const storedKey = `arise.autoToast:${key}`;
        if (sessionStorage.getItem(storedKey)) continue;
        sessionStorage.setItem(storedKey, "1");
      } catch {
        // sessionStorage may be unavailable
      }
      pushToast(message);
    }
  }, [todayQuery.data]);

  const ensureMutation = useMutation({
    mutationFn: ensureToday,
    onSuccess: (data) => {
      queryClient.setQueryData(todayQueryKey, data);
      setActionError(null);
    },
  });

  const completeMutation = useMutation({
    mutationFn: ({ quest, effort }: { quest: TodayQuest; effort: QuestEffort }) =>
      completeQuestOrQueue(quest.id, effort),
    onSuccess: async (outcome) => {
      if (outcome.kind === "queued") {
        setSheet(null);
        setActionError(null);
        return;
      }
      const result = outcome.result;
      const previous = queryClient.getQueryData<TodayPayload>(todayQueryKey);
      if (
        previous &&
        isRank(previous.player.rank) &&
        isRank(result.player.rank) &&
        isRankUp(previous.player.rank, result.player.rank)
      ) {
        setRankUp({
          fromRank: previous.player.rank,
          fromTitle: titleForRank(previous.player.rank, previous.player.title),
          toRank: result.player.rank,
          toTitle: titleForRank(result.player.rank, result.player.title),
        });
        pushToast(`Rank ${previous.player.rank} → ${result.player.rank}.`);
      }
      setSheet(null);
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: todayQueryKey });
    },
    onError: (err) => {
      if (isDayClosedError(err)) {
        pushToast(DAY_CLOSED_TOAST);
        setSheet(null);
        return;
      }
      setActionError(formatAuthError(err));
    },
  });

  const skipMutation = useMutation({
    mutationFn: ({ quest, reason }: { quest: TodayQuest; reason: SkipReason }) =>
      skipQuestOrQueue(quest.id, reason),
    onSuccess: async (outcome) => {
      setSheet(null);
      setActionError(null);
      if (outcome.kind === "queued") return;
      await queryClient.invalidateQueries({ queryKey: todayQueryKey });
    },
    onError: (err) => {
      if (isDayClosedError(err)) {
        pushToast(DAY_CLOSED_TOAST);
        setSheet(null);
        return;
      }
      setActionError(formatAuthError(err));
    },
  });

  const regenMutation = useMutation({
    mutationFn: regenerateWeek,
    onSuccess: async () => {
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: todayQueryKey });
    },
    onError: (err) => {
      setActionError(formatAuthError(err));
    },
  });

  const gate = todayGateFromError(todayQuery.error);
  const mutationError =
    ensureMutation.error && !todayGateFromError(ensureMutation.error)
      ? formatAuthError(ensureMutation.error)
      : null;
  const error = actionError ?? mutationError;

  if (todayQuery.isPending) {
    return (
      <Panel>
        <h1>Today</h1>
        <p className="lede">Checking today’s window…</p>
      </Panel>
    );
  }

  if (gate === "onboarding" || todayGateFromError(ensureMutation.error) === "onboarding") {
    return (
      <Panel>
        <h1>{ONBOARDING_TITLE}</h1>
        <p className="lede">{ONBOARDING_LEDE}</p>
        <div className="actions">
          <a className="btn btn-primary" href="/onboarding">
            {ONBOARDING_CTA}
          </a>
        </div>
        <WindowDisclaimer text={SYSTEM_DISCLAIMER} />
      </Panel>
    );
  }

  if (gate === "pregnancy" || todayGateFromError(ensureMutation.error) === "pregnancy") {
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
        <WindowDisclaimer text={SYSTEM_DISCLAIMER} />
      </Panel>
    );
  }

  if (todayQuery.isError) {
    return (
      <Panel>
        <h1>Today</h1>
        <p className="banner banner-error" role="alert">
          {todayQuery.error instanceof Error
            ? todayQuery.error.message
            : "Could not reach the API."}
        </p>
      </Panel>
    );
  }

  const today = todayQuery.data;
  if (!today) return null;

  return (
    <div className="sys-window">
      <InstallEducation mode="first-visit" />
      <PlayerHeader today={today} />
      {today.activityStatus && today.activityStatus.status !== "training" ? (
        <p className="banner banner-warn" role="status">
          {formatStatusBanner(today.activityStatus)}
        </p>
      ) : null}
      <ActivityStatusPanel compact />
      {today.needsEnsure ? (
        <EmptyEnsure
          pending={ensureMutation.isPending}
          error={error}
          disclaimer={today.disclaimer}
          onIssue={() => ensureMutation.mutate()}
        />
      ) : (
        <IssuedDay
          today={today}
          error={error}
          regenPending={regenMutation.isPending}
          onComplete={(quest) => {
            setActionError(null);
            setSheet({ kind: "complete", quest });
          }}
          onSkip={(quest) => {
            setActionError(null);
            setSheet({ kind: "skip", quest });
          }}
          onRegenerate={() => regenMutation.mutate()}
        />
      )}
      {sheet?.kind === "complete" ? (
        <CompleteSheet
          quest={sheet.quest}
          pending={completeMutation.isPending}
          onConfirm={(effort) => completeMutation.mutate({ quest: sheet.quest, effort })}
          onCancel={() => setSheet(null)}
        />
      ) : null}
      {sheet?.kind === "skip" ? (
        <SkipSheet
          quest={sheet.quest}
          busySkipsWeek={busySkipsFromPayload(today)}
          pending={skipMutation.isPending}
          onConfirm={(reason) => skipMutation.mutate({ quest: sheet.quest, reason })}
          onCancel={() => setSheet(null)}
        />
      ) : null}
      {rankUp ? (
        <RankUpModal
          fromRank={rankUp.fromRank}
          fromTitle={rankUp.fromTitle}
          toRank={rankUp.toRank}
          toTitle={rankUp.toTitle}
          onClose={() => setRankUp(null)}
        />
      ) : null}
      {toasts.length > 0 ? (
        <div className="sys-toast-stack">
          {toasts.map((item) => (
            <SystemToast
              key={item.id}
              message={item.message}
              onDismiss={() => dismissToast(item.id)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PlayerHeader({ today }: { today: TodayPayload }) {
  const rank = isRank(today.player.rank) ? today.player.rank : "E";
  const title = titleForRank(rank, today.player.title);
  const into = xpIntoLevel(today.player.xp, today.player.level);
  return (
    <header className="sys-player-block">
      <div className="sys-player">
        <RankBadge rank={rank} title={title} tooltip={RANK_TOOLTIP} />
        <div>
          <p className="sys-player-title">{title}</p>
          <p className="sys-player-meta">{today.date}</p>
        </div>
        <div className="sys-streak">streak {today.player.streakDays}</div>
      </div>
      <XpBar level={today.player.level} xp={into} xpToNext={today.player.xpToNext} />
      <StatBlock stats={today.player.stats} />
    </header>
  );
}

function EmptyEnsure({
  pending,
  error,
  disclaimer,
  onIssue,
}: {
  pending: boolean;
  error: string | null;
  disclaimer: string;
  onIssue: () => void;
}) {
  return (
    <Panel>
      <h1>{EMPTY_TITLE}</h1>
      <p className="lede">{EMPTY_LEDE}</p>
      {error ? (
        <p className="banner banner-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="actions">
        <button type="button" className="btn btn-primary" onClick={onIssue} disabled={pending}>
          {pending ? "Issuing…" : EMPTY_CTA}
        </button>
      </div>
      <WindowDisclaimer text={disclaimer} />
    </Panel>
  );
}

function IssuedDay({
  today,
  error,
  regenPending,
  onComplete,
  onSkip,
  onRegenerate,
}: {
  today: TodayPayload;
  error: string | null;
  regenPending: boolean;
  onComplete: (quest: TodayQuest) => void;
  onSkip: (quest: TodayQuest) => void;
  onRegenerate: () => void;
}) {
  const rewrite = recoveryRewriteBanner(today);
  const rest = restDayBanner(today);
  const dayLine = planDayLine(today);
  return (
    <div className="sys-issued">
      {error ? (
        <p className="banner banner-error" role="alert">
          {error}
        </p>
      ) : null}
      {rewrite ? (
        <p className="banner banner-warn" role="status">
          {rewrite}
        </p>
      ) : rest ? (
        <p className="banner banner-ok" role="status">
          {rest}
        </p>
      ) : null}
      {dayLine ? <p className="banner banner-info">{dayLine}</p> : null}
      {today.suggestRegenerate ? (
        <Panel className="sys-regen">
          <p className="banner banner-warn" role="status">
            {REGEN_BANNER}
          </p>
          <div className="actions">
            <button
              type="button"
              className="btn"
              onClick={onRegenerate}
              disabled={regenPending}
            >
              {regenPending ? "Rewriting…" : REGEN_BUTTON}
            </button>
          </div>
          <p className="hint">{REGEN_HINT}</p>
        </Panel>
      ) : null}
      {today.quests.length === 0 ? (
        <Panel>
          <h1>{EMPTY_TITLE}</h1>
          <p className="lede">{EMPTY_LEDE}</p>
        </Panel>
      ) : (
        today.quests.map((quest) => {
          const view = presentQuest(quest);
          return (
            <QuestCard
              key={quest.id}
              title={view.title}
              kindChip={view.kindChip}
              prescription={view.prescription}
              xpLine={view.xpLine}
              status={quest.status}
              variant={view.variant}
              done={view.done}
            >
              {quest.status === "issued" ? (
                <>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => onComplete(quest)}
                  >
                    Complete
                  </button>
                  <button type="button" className="btn" onClick={() => onSkip(quest)}>
                    Skip
                  </button>
                </>
              ) : null}
            </QuestCard>
          );
        })
      )}
      <WindowDisclaimer text={today.disclaimer || SYSTEM_DISCLAIMER} />
    </div>
  );
}

function WindowDisclaimer({ text }: { text: string }) {
  const id = useId();
  return (
    <p className="footer-note" role="note" id={id}>
      {text}
    </p>
  );
}
