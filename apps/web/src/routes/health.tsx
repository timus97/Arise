import type { DailySummary } from "@arise/domain";
import { useQuery } from "@tanstack/react-query";
import { Link, createRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CsvImporter } from "../features/health/CsvImporter.js";
import { ManualEntryForm } from "../features/health/ManualEntryForm.js";
import {
  HEALTH_CONSENT_CHECKBOX,
  HEALTH_PAGE_LEDE,
  HEALTH_SIGNED_OUT,
  HEALTH_TITLE,
  PLATFORM_HONESTY,
  SUMMARY_TITLE,
} from "../features/health/copy.js";
import {
  defaultSummaryRange,
  getHealthSummary,
  healthSummaryQueryKey,
} from "../features/health/health-client.js";
import { formatAuthError, getSession, sessionQueryKey } from "../lib/auth-client.js";
import { rootRoute } from "./__root.js";

function HealthPage() {
  const range0 = useMemo(() => defaultSummaryRange(), []);
  const [consent, setConsent] = useState(false);
  const [from, setFrom] = useState(range0.from);
  const [to, setTo] = useState(range0.to);
  const [applied, setApplied] = useState(range0);

  const session = useQuery({
    queryKey: sessionQueryKey,
    queryFn: getSession,
  });

  const summary = useQuery({
    queryKey: [...healthSummaryQueryKey, applied.from, applied.to],
    queryFn: () => getHealthSummary(applied.from, applied.to),
    enabled: Boolean(session.data),
  });

  if (session.isPending) {
    return (
      <section className="panel">
        <h1>{HEALTH_TITLE}</h1>
        <p className="lede">Checking session…</p>
      </section>
    );
  }

  if (session.isError) {
    return (
      <section className="panel">
        <h1>{HEALTH_TITLE}</h1>
        <p className="banner banner-error" role="alert">
          {session.error instanceof Error
            ? session.error.message
            : "Could not reach the API."}
        </p>
      </section>
    );
  }

  if (!session.data) {
    return (
      <section className="panel">
        <h1>{HEALTH_TITLE}</h1>
        <p className="lede">{HEALTH_SIGNED_OUT}</p>
        <div className="actions">
          <Link to="/login" className="btn">
            Sign in
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="panel">
      <h1>{HEALTH_TITLE}</h1>
      <p className="lede">{HEALTH_PAGE_LEDE}</p>
      <p className="hint">{PLATFORM_HONESTY}</p>

      <label className="check">
        <input
          type="checkbox"
          name="consent"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
        />
        <span>{HEALTH_CONSENT_CHECKBOX}</span>
      </label>

      <ManualEntryForm
        consent={consent}
        onIngested={() => {
          void summary.refetch();
        }}
      />
      <CsvImporter
        consent={consent}
        onIngested={() => {
          void summary.refetch();
        }}
      />

      <div className="section">
        <h2>{SUMMARY_TITLE}</h2>
        <form
          className="form"
          onSubmit={(event) => {
            event.preventDefault();
            setApplied({ from, to });
          }}
        >
          <label className="field">
            <span>from</span>
            <input
              name="from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>to</span>
            <input
              name="to"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              required
            />
          </label>
          <div className="actions">
            <button className="btn" type="submit">
              Load summary
            </button>
          </div>
        </form>
        {summary.isError ? (
          <p className="banner banner-error" role="alert">
            {formatAuthError(summary.error)}
          </p>
        ) : null}
        {summary.isPending ? <p className="hint">Loading summary…</p> : null}
        {summary.data ? <SummaryList summaries={summary.data} /> : null}
      </div>
    </section>
  );
}

function SummaryList({ summaries }: { summaries: DailySummary[] }) {
  if (summaries.length === 0) {
    return <p className="hint">No daily summaries in this range.</p>;
  }
  return (
    <ul className="health-summary">
      {summaries.map((row) => (
        <li key={row.localDate}>
          <span className="mono">{row.localDate}</span>
          {row.steps != null ? ` · steps ${row.steps}` : ""}
          {row.sleepMinutes != null ? ` · sleep ${row.sleepMinutes} min` : ""}
          {row.weightKg != null ? ` · ${row.weightKg} kg` : ""}
          {row.soreness != null ? ` · soreness ${row.soreness}` : ""}
          {row.sleepQuality != null ? ` · sleep quality ${row.sleepQuality}` : ""}
        </li>
      ))}
    </ul>
  );
}

export const healthRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/health",
  component: HealthPage,
});
