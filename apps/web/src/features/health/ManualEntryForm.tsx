import { HealthMetric } from "@arise/domain";
import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { formatAuthError } from "../../lib/auth-client.js";
import { MANUAL_SAVE, MANUAL_TITLE } from "./copy.js";
import {
  METRIC_UNITS,
  consentRequiredCopy,
  datetimeLocalToIso,
  isHealthConsentRequired,
  newClientId,
  postManualSample,
  toDatetimeLocalValue,
} from "./health-client.js";

const METRICS = HealthMetric.options;

export type ManualEntryFormProps = {
  consent: boolean;
  onIngested?: () => void;
};

export function ManualEntryForm({ consent, onIngested }: ManualEntryFormProps) {
  const now = toDatetimeLocalValue(new Date());
  const [metric, setMetric] = useState<HealthMetric>("steps");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState(METRIC_UNITS.steps);
  const [startAt, setStartAt] = useState(now);
  const [endAt, setEndAt] = useState(now);
  const [formError, setFormError] = useState<string | null>(null);
  const [okLine, setOkLine] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: postManualSample,
    onSuccess: (result) => {
      setOkLine(`Ingested ${result.ingested}. Dropped ${result.dropped}.`);
      onIngested?.();
    },
  });

  function onMetric(next: HealthMetric) {
    setMetric(next);
    setUnit(METRIC_UNITS[next]);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setOkLine(null);

    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      setFormError("Value must be a number.");
      return;
    }
    const startIso = datetimeLocalToIso(startAt);
    const endIso = datetimeLocalToIso(endAt);
    if (startIso === null || endIso === null) {
      setFormError("startAt and endAt must be valid datetimes.");
      return;
    }

    mutation.mutate({
      metric,
      value: parsed,
      unit: unit.trim() || METRIC_UNITS[metric],
      startAt: startIso,
      endAt: endIso,
      clientId: newClientId(),
      ...(consent ? { consent: true as const } : {}),
    });
  }

  const error =
    formError ??
    (mutation.isError
      ? isHealthConsentRequired(mutation.error)
        ? consentRequiredCopy(mutation.error)
        : formatAuthError(mutation.error)
      : null);

  return (
    <form className="section form" onSubmit={onSubmit}>
      <h2>{MANUAL_TITLE}</h2>
      {error ? (
        <p className="banner banner-error" role="alert">
          {error}
        </p>
      ) : null}
      {okLine ? (
        <p className="banner banner-ok" role="status">
          {okLine}
        </p>
      ) : null}
      <label className="field">
        <span>Metric</span>
        <select
          name="metric"
          value={metric}
          onChange={(event) => onMetric(event.target.value as HealthMetric)}
        >
          {METRICS.map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Value</span>
        <input
          name="value"
          inputMode="decimal"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          required
        />
      </label>
      <label className="field">
        <span>Unit</span>
        <input
          name="unit"
          value={unit}
          onChange={(event) => setUnit(event.target.value)}
          required
        />
      </label>
      <label className="field">
        <span>startAt</span>
        <input
          name="startAt"
          type="datetime-local"
          value={startAt}
          onChange={(event) => setStartAt(event.target.value)}
          required
        />
      </label>
      <label className="field">
        <span>endAt</span>
        <input
          name="endAt"
          type="datetime-local"
          value={endAt}
          onChange={(event) => setEndAt(event.target.value)}
          required
        />
      </label>
      <div className="actions">
        <button className="btn btn-primary" type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : MANUAL_SAVE}
        </button>
      </div>
    </form>
  );
}
