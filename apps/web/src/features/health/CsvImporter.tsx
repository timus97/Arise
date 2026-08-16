import { useMutation } from "@tanstack/react-query";
import { useState, type ChangeEvent } from "react";
import type { CsvRow } from "@arise/health";
import { formatAuthError } from "../../lib/auth-client.js";
import {
  CSV_DOWNLOAD_CTA,
  CSV_EMPTY_LEDE,
  CSV_EXPORT_HONESTY,
  CSV_HEADER_LINE,
  CSV_IMPORT,
  CSV_SAMPLE_CAPTION,
  CSV_SAMPLE_ROW,
  CSV_TITLE,
} from "./copy.js";
import {
  consentRequiredCopy,
  downloadCsvTemplate,
  isHealthConsentRequired,
  postCsvSamples,
  prepareCsvFile,
} from "./health-client.js";

export type CsvImporterProps = {
  consent: boolean;
  onIngested?: () => void;
};

export function CsvImporter({ consent, onIngested }: CsvImporterProps) {
  const [reject, setReject] = useState<string | null>(null);
  const [rows, setRows] = useState<CsvRow[] | null>(null);
  const [okLine, setOkLine] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: postCsvSamples,
    onSuccess: (result) => {
      setOkLine(`Ingested ${result.ingested}. Dropped ${result.dropped}.`);
      setRows(null);
      onIngested?.();
    },
  });

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    setReject(null);
    setOkLine(null);
    setRows(null);
    mutation.reset();
    const file = event.target.files?.[0];
    if (!file) return;
    const prepared = await prepareCsvFile(file);
    if (!prepared.ok) {
      setReject(prepared.message);
      return;
    }
    setRows(prepared.rows);
  }

  function onImport() {
    if (!rows) return;
    setReject(null);
    setOkLine(null);
    mutation.mutate({
      samples: rows,
      ...(consent ? { consent: true as const } : {}),
    });
  }

  const error =
    reject ??
    (mutation.isError
      ? isHealthConsentRequired(mutation.error)
        ? consentRequiredCopy(mutation.error)
        : formatAuthError(mutation.error)
      : null);

  return (
    <div className="section">
      <h2>{CSV_TITLE}</h2>
      <p className="lede">{CSV_EMPTY_LEDE}</p>
      <p className="hint">{CSV_HEADER_LINE}</p>
      <p className="hint">{CSV_SAMPLE_CAPTION}</p>
      <pre className="pre">{CSV_SAMPLE_ROW}</pre>
      <p className="hint">{CSV_EXPORT_HONESTY}</p>
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
      {rows ? (
        <p className="hint">{rows.length} rows ready. Server never sees the file.</p>
      ) : null}
      <div className="actions">
        <button type="button" className="btn" onClick={downloadCsvTemplate}>
          {CSV_DOWNLOAD_CTA}
        </button>
        <label className="btn">
          Choose CSV
          <input
            className="sr-only"
            type="file"
            accept=".csv,text/csv,text/plain"
            onChange={(event) => {
              void onFile(event);
            }}
          />
        </label>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onImport}
          disabled={!rows || mutation.isPending}
        >
          {mutation.isPending ? "Importing…" : CSV_IMPORT}
        </button>
      </div>
    </div>
  );
}
