import type { Units } from "@arise/domain";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ActivityStatusPanel } from "../features/status/ActivityStatusPanel.js";
import { InstallEducation } from "../features/pwa/InstallEducation.js";
import { DAY_CLOSED_TOAST } from "../features/system-window/copy.js";
import { formatAuthError, getSession, sessionQueryKey } from "../lib/auth-client.js";
import { useOutboxDrain } from "../lib/use-outbox-drain.js";
import {
  EXPORT_FILENAME,
  PREGNANCY_HARD_STOP,
  deleteAccount,
  downloadAccountExport,
  isIanaTimeZone,
  isPregnancyHardStopError,
  playableProbeQueryKey,
  pregnancyBlockedMessage,
  probePlayableRoute,
  readDisplayTimeZone,
  settingsAvailability,
  signOut,
  writeDisplayTimeZone,
} from "../lib/settings-client.js";
import {
  CSV_TEMPLATE_HEADER,
  HEALTH_STUB_COPY,
  INDEXEDDB_UNENCRYPTED_COPY,
  RESET_PASSWORD_ALIAS,
  RESET_PASSWORD_CLI,
  SHARED_DEVICE_COPY,
  SMTP_UNSET_COPY,
  TIMEZONE_HINT,
} from "../lib/settings-copy.js";
import { CSV_DOWNLOAD_CTA } from "../features/health/copy.js";
import { downloadCsvTemplate } from "../features/health/health-client.js";
import {
  formatLength,
  formatMass,
  readDisplayUnits,
  writeDisplayUnits,
} from "../lib/units.js";
import { rootRoute } from "./__root.js";

const EXAMPLE_KG = 72.4;
const EXAMPLE_CM = 178;

function SettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [units, setUnits] = useState<Units>(() => readDisplayUnits());
  const [timeZone, setTimeZone] = useState(() => readDisplayTimeZone());
  const [tzError, setTzError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [outboxNotice, setOutboxNotice] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useOutboxDrain({
    onDayClosed: () => setOutboxNotice(DAY_CLOSED_TOAST),
  });

  const session = useQuery({
    queryKey: sessionQueryKey,
    queryFn: getSession,
  });

  const probe = useQuery({
    queryKey: playableProbeQueryKey,
    queryFn: probePlayableRoute,
    enabled: Boolean(session.data),
  });

  const pregnancyHardStop =
    probe.data?.kind === "error" && isPregnancyHardStopError(probe.data.error);
  const availability = settingsAvailability(
    probe.data?.kind === "error" ? probe.data.error : null,
  );

  async function leaveSignedOut() {
    queryClient.setQueryData(sessionQueryKey, null);
    await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
    queryClient.removeQueries({ queryKey: playableProbeQueryKey });
    await navigate({ to: "/login" });
  }

  const logoutMutation = useMutation({
    mutationFn: signOut,
    onSuccess: () => leaveSignedOut(),
  });

  const exportMutation = useMutation({
    mutationFn: downloadAccountExport,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => leaveSignedOut(),
  });

  function refuseIfBlocked(): boolean {
    if (!pregnancyHardStop) return false;
    setActionError(pregnancyBlockedMessage());
    return true;
  }

  function onUnits(next: Units) {
    setActionError(null);
    if (refuseIfBlocked()) return;
    setUnits(next);
    writeDisplayUnits(next);
  }

  function onSaveTimeZone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionError(null);
    setTzError(null);
    if (refuseIfBlocked()) return;
    const next = timeZone.trim();
    if (!isIanaTimeZone(next)) {
      setTzError("Enter a valid IANA timezone such as Europe/Stockholm.");
      return;
    }
    setTimeZone(next);
    writeDisplayTimeZone(next);
  }

  function onExport() {
    setActionError(null);
    if (refuseIfBlocked()) return;
    exportMutation.mutate();
  }

  function onLogout() {
    setActionError(null);
    if (refuseIfBlocked()) return;
    logoutMutation.mutate();
  }

  if (session.isPending) {
    return (
      <section className="panel">
        <h1>Settings</h1>
        <p className="lede">Checking session…</p>
      </section>
    );
  }

  if (session.isError) {
    return (
      <section className="panel">
        <h1>Settings</h1>
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
        <h1>Settings</h1>
        <p className="lede">
          Sign in to change units, export your data, or delete your account.
        </p>
        <div className="actions">
          <Link to="/login" className="btn">
            Sign in
          </Link>
        </div>
      </section>
    );
  }

  if (probe.isPending) {
    return (
      <section className="panel">
        <h1>Settings</h1>
        <p className="lede">Checking account…</p>
      </section>
    );
  }

  if (probe.isError) {
    return (
      <section className="panel">
        <h1>Settings</h1>
        <p className="banner banner-error" role="alert">
          {probe.error instanceof Error
            ? probe.error.message
            : "Could not reach the API."}
        </p>
      </section>
    );
  }

  const probeError =
    probe.data?.kind === "error" && !isPregnancyHardStopError(probe.data.error)
      ? formatAuthError(probe.data.error)
      : null;
  const mutationError = formatMaybeError(
    logoutMutation.error ?? exportMutation.error ?? deleteMutation.error,
  );
  const error = actionError ?? mutationError;

  return (
    <section className="panel">
      <h1>Settings</h1>
      <p className="lede">Account, units, and export. Chrome is SYSTEM.</p>

      {pregnancyHardStop ? (
        <p className="banner banner-error" role="alert">
          {PREGNANCY_HARD_STOP}. Arise is not appropriate during pregnancy. See a
          clinician for prenatal exercise guidance. Delete account remains
          available.
        </p>
      ) : null}

      {probeError ? (
        <p className="banner banner-error" role="alert">
          {probeError}
        </p>
      ) : null}

      {error ? (
        <p className="banner banner-error" role="alert">
          {error}
        </p>
      ) : null}

      {outboxNotice ? (
        <p className="banner banner-warn" role="status">
          {outboxNotice}
        </p>
      ) : null}

      <InstallEducation mode="settings" />

      {pregnancyHardStop ? null : <ActivityStatusPanel />}

      {availability.units ? (
        <div className="section">
          <h2>Units</h2>
          <p className="hint">
            Stored values stay metric (kg, cm). This toggle is a local display
            preference.
          </p>
          <div className="seg" role="group" aria-label="Display units">
            <button
              type="button"
              className="btn"
              aria-pressed={units === "metric"}
              onClick={() => onUnits("metric")}
            >
              Metric
            </button>
            <button
              type="button"
              className="btn"
              aria-pressed={units === "imperial"}
              onClick={() => onUnits("imperial")}
            >
              Imperial
            </button>
          </div>
          <p className="hint">
            Stored: {formatMass(EXAMPLE_KG, "metric")} ·{" "}
            {formatLength(EXAMPLE_CM, "metric")}. Display:{" "}
            {formatMass(EXAMPLE_KG, units)} · {formatLength(EXAMPLE_CM, units)}.
          </p>
        </div>
      ) : null}

      {availability.timezone ? (
        <form className="section form" onSubmit={onSaveTimeZone}>
          <h2>Timezone</h2>
          <p className="hint">{TIMEZONE_HINT}</p>
          <label className="field">
            <span>IANA timezone</span>
            <input
              name="timeZone"
              autoComplete="off"
              value={timeZone}
              onChange={(event) => setTimeZone(event.target.value)}
              placeholder="Europe/Stockholm"
            />
          </label>
          {tzError ? (
            <p className="banner banner-error" role="alert">
              {tzError}
            </p>
          ) : null}
          <div className="actions">
            <button className="btn" type="submit">
              Save timezone
            </button>
          </div>
        </form>
      ) : null}

      {availability.export ? (
        <div className="section">
          <h2>Export</h2>
          <p className="hint">
            Downloads your rows as <span className="mono">{EXPORT_FILENAME}</span>.
          </p>
          <div className="actions">
            <button
              type="button"
              className="btn"
              onClick={onExport}
              disabled={exportMutation.isPending}
            >
              {exportMutation.isPending ? "Preparing export…" : "Download export"}
            </button>
          </div>
        </div>
      ) : null}

      {availability.logout ? (
        <div className="section">
          <h2>Session</h2>
          <div className="actions">
            <button
              type="button"
              className="btn"
              onClick={onLogout}
              disabled={logoutMutation.isPending}
            >
              {logoutMutation.isPending ? "Signing out…" : "Log out"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="section">
        <h2>Delete account</h2>
        <p className="hint">
          Permanently deletes this Arise account and its data. The API expires
          cookies.
        </p>
        {confirmingDelete ? (
          <div className="actions">
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Confirm delete"}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setConfirmingDelete(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="actions">
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => setConfirmingDelete(true)}
            >
              Delete account
            </button>
          </div>
        )}
      </div>

      <div className="section">
        <h2>Password reset</h2>
        <p className="hint">{SMTP_UNSET_COPY}</p>
        <pre className="pre">{RESET_PASSWORD_CLI}</pre>
        <p className="hint">
          Same operator path as <span className="mono">{RESET_PASSWORD_ALIAS}</span>.
        </p>
      </div>

      <div className="section">
        <h2>Health ingest</h2>
        <p className="hint">{HEALTH_STUB_COPY}</p>
        <p className="hint">
          CSV template header (Sprint 5):{" "}
          <span className="mono">{CSV_TEMPLATE_HEADER}</span>
        </p>
        <div className="actions">
          <button type="button" className="btn" onClick={downloadCsvTemplate}>
            {CSV_DOWNLOAD_CTA}
          </button>
        </div>
      </div>

      <div className="section">
        <h2>Shared device</h2>
        <p className="hint">{SHARED_DEVICE_COPY}</p>
        <p className="hint">{INDEXEDDB_UNENCRYPTED_COPY}</p>
      </div>
    </section>
  );
}

function formatMaybeError(err: unknown): string | null {
  if (!err) return null;
  return formatAuthError(err);
}

export const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});
