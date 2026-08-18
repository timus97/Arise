import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  STATUS_CLEAR,
  STATUS_DAYS_LABEL,
  STATUS_LEDE,
  STATUS_SICK_HINT,
  STATUS_TITLE,
  STATUS_TRAVEL_HINT,
  activityStatusQueryKey,
  formatStatusBanner,
  getActivityStatus,
  putActivityStatus,
  type ActivityStatus,
} from "../../lib/activity-status.js";
import { formatAuthError } from "../../lib/auth-client.js";
import { todayQueryKey } from "../system-window/today-client.js";

export function ActivityStatusPanel({ compact = false }: { compact?: boolean }) {
  const queryClient = useQueryClient();
  const [days, setDays] = useState(3);
  const statusQuery = useQuery({
    queryKey: activityStatusQueryKey,
    queryFn: getActivityStatus,
  });

  const mutation = useMutation({
    mutationFn: (next: { status: ActivityStatus; days?: number }) =>
      putActivityStatus(next.status, next.days),
    onSuccess: async (view) => {
      queryClient.setQueryData(activityStatusQueryKey, view);
      await queryClient.invalidateQueries({ queryKey: todayQueryKey });
    },
  });

  const view = statusQuery.data;
  const banner = view ? formatStatusBanner(view) : null;
  const error =
    statusQuery.isError
      ? formatAuthError(statusQuery.error)
      : mutation.isError
        ? formatAuthError(mutation.error)
        : null;

  async function setStatus(status: ActivityStatus) {
    if (status === "training") {
      await mutation.mutateAsync({ status: "training" });
      return;
    }
    const n = Math.min(14, Math.max(1, Math.round(days)));
    await mutation.mutateAsync({ status, days: n });
  }

  return (
    <div className="section">
      {compact ? null : <h2>{STATUS_TITLE}</h2>}
      {compact ? null : <p className="lede">{STATUS_LEDE}</p>}
      {banner ? (
        <p className="banner banner-warn" role="status">
          {banner}
        </p>
      ) : null}
      {error ? (
        <p className="banner banner-error" role="alert">
          {error}
        </p>
      ) : null}
      <label className="field">
        {STATUS_DAYS_LABEL}
        <input
          type="number"
          min={1}
          max={14}
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        />
      </label>
      <div className="seg" role="group" aria-label={STATUS_TITLE}>
        <button
          type="button"
          className="btn"
          aria-pressed={view?.status === "training"}
          disabled={mutation.isPending}
          onClick={() => void setStatus("training")}
        >
          Training
        </button>
        <button
          type="button"
          className="btn"
          aria-pressed={view?.status === "travel"}
          disabled={mutation.isPending}
          onClick={() => void setStatus("travel")}
        >
          Travel
        </button>
        <button
          type="button"
          className="btn"
          aria-pressed={view?.status === "sick"}
          disabled={mutation.isPending}
          onClick={() => void setStatus("sick")}
        >
          Sick
        </button>
      </div>
      {view && view.status !== "training" ? (
        <div className="actions">
          <button
            type="button"
            className="btn"
            disabled={mutation.isPending}
            onClick={() => void setStatus("training")}
          >
            {STATUS_CLEAR}
          </button>
        </div>
      ) : null}
      {compact ? null : (
        <>
          <p className="hint">{STATUS_TRAVEL_HINT}</p>
          <p className="hint">{STATUS_SICK_HINT}</p>
        </>
      )}
    </div>
  );
}
