import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { confirmFoodDiary, isPdfOversized, isSupportedPdf, previewFoodDiary } from '../api/pdf-import';
import { ApiError, type FoodEntryWritePayload, type MealType, type PdfPreviewRecord } from '../api/types';
import { Alert } from '../components/layout/AppShell';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '../lib/dates';

type DraftRow = PdfPreviewRecord & { include: boolean };

const mealTypes: Array<{ value: MealType; label: string }> = [
  { value: 'BREAKFAST', label: 'Breakfast' },
  { value: 'LUNCH', label: 'Lunch' },
  { value: 'DINNER', label: 'Dinner' },
  { value: 'SNACKS', label: 'Snacks' },
];

function toDraft(record: PdfPreviewRecord): DraftRow {
  return {
    ...record,
    include: record.status !== 'unparsed' && !record.duplicate,
  };
}

function parseOptionalNumber(value: string): number | null {
  if (value.trim() === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isComplete(row: DraftRow): boolean {
  return Boolean(
    row.include &&
      row.foodName?.trim() &&
      row.mealType &&
      row.quantity !== null &&
      row.quantity > 0 &&
      row.quantityUnit?.trim() &&
      row.consumedAt &&
      row.calories !== null &&
      row.calories >= 0 &&
      row.protein !== null &&
      row.protein >= 0 &&
      row.carbs !== null &&
      row.carbs >= 0 &&
      row.fat !== null &&
      row.fat >= 0,
  );
}

function toPayload(row: DraftRow): FoodEntryWritePayload {
  return {
    mealType: row.mealType ?? 'SNACKS',
    foodName: row.foodName?.trim() ?? '',
    quantity: row.quantity ?? 1,
    quantityUnit: row.quantityUnit?.trim() ?? 'serving',
    calories: row.calories ?? 0,
    protein: row.protein ?? 0,
    carbs: row.carbs ?? 0,
    fat: row.fat ?? 0,
    consumedAt: row.consumedAt ?? new Date().toISOString(),
    micronutrients: row.micronutrients,
  };
}

function statusLabel(row: DraftRow): string {
  if (row.status === 'unparsed') {
    return 'Needs review';
  }
  if (row.duplicate || row.status === 'warning') {
    return 'Needs review';
  }
  return 'Parsed confidently';
}

export function ImportPdfPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [rows, setRows] = useState<DraftRow[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [importedCount, setImportedCount] = useState<number | null>(null);

  const previewMutation = useMutation({
    mutationFn: previewFoodDiary,
    onSuccess: (result) => {
      setRows(result.records.map(toDraft));
      setWarnings(result.warnings.map((item) => item.message));
      setImportedCount(null);
      setLocalError(null);
    },
    onError: (err: unknown) => {
      setRows(null);
      setWarnings([]);
      setImportedCount(null);
      setLocalError(err instanceof ApiError ? err.message : 'Could not parse this PDF.');
    },
  });

  const confirmMutation = useMutation({
    mutationFn: confirmFoodDiary,
    onSuccess: async (result) => {
      setImportedCount(result.importedCount);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['food-entries'] }),
        queryClient.invalidateQueries({ queryKey: ['reports'] }),
      ]);
    },
    onError: (err: unknown) => {
      setLocalError(err instanceof ApiError ? err.message : 'Could not import meals.');
    },
  });

  const [dragOver, setDragOver] = useState(false);

  function acceptFile(next: File | null) {
    setFile(next);
    setRows(null);
    setWarnings([]);
    setImportedCount(null);
    setLocalError(null);
    if (!next) {
      return;
    }
    if (!isSupportedPdf(next)) {
      setLocalError('Unsupported file type. Upload a PDF food diary.');
      return;
    }
    if (isPdfOversized(next)) {
      setLocalError('PDF exceeds the maximum upload size of 5MB.');
    }
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    acceptFile(event.target.files?.[0] ?? null);
  }

  function handlePreview(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setLocalError('Choose a PDF file first.');
      return;
    }
    if (!isSupportedPdf(file) || isPdfOversized(file)) {
      return;
    }
    previewMutation.mutate(file);
  }

  function updateRow(id: string, patch: Partial<DraftRow>) {
    setRows((current) => current?.map((row) => (row.id === id ? { ...row, ...patch } : row)) ?? null);
  }

  function removeRow(id: string) {
    setRows((current) => current?.filter((row) => row.id !== id) ?? null);
  }

  const readyRows = rows?.filter(isComplete) ?? [];
  const parsing = previewMutation.isPending;
  const step = importedCount !== null ? 3 : rows ? 2 : 1;

  if (importedCount !== null) {
    return (
      <section className="page-reports">
        <div className="main-inner">
        <div className="top-row">
          <div className="kicker">Account</div>
          <h1 className="page-title">Import PDF</h1>
        </div>
        <Alert tone="success">
          {importedCount} meal{importedCount === 1 ? '' : 's'} imported successfully.
        </Alert>
        <div className="action-row">
          <button type="button" className="button button-primary" onClick={() => navigate('/meals')}>
            View meals
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              setFile(null);
              setRows(null);
              setImportedCount(null);
              setWarnings([]);
            }}
          >
            Import another PDF
          </button>
        </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-reports">
      <div className="main-inner">
      <div className="top-row">
        <div className="kicker">Account</div>
        <h1 className="page-title">Import PDF</h1>
        <p className="muted">Upload a text-based food diary. Review every meal before anything is saved.</p>
      </div>

      <ol className="step-track" aria-label="Import steps">
        <li className={step === 1 ? 'is-current' : 'is-done'}>
          <span className="step-index">01</span>
          Choose file
        </li>
        <li className={step === 2 ? 'is-current' : step > 2 ? 'is-done' : ''}>
          <span className="step-index">02</span>
          Review
        </li>
        <li className={step === 3 ? 'is-current' : ''}>
          <span className="step-index">03</span>
          Import
        </li>
      </ol>

      <form className="panel-quiet" onSubmit={handlePreview}>
        <div
          className={`dropzone ${dragOver ? 'is-hover' : ''} ${parsing ? 'is-busy' : ''}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            acceptFile(event.dataTransfer.files[0] ?? null);
          }}
        >
          <label className="field">
            <span className="field-label">PDF file</span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFile}
              disabled={parsing || confirmMutation.isPending}
            />
          </label>
          {file ? (
            <p className="muted">
              {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </p>
          ) : (
            <p className="muted">No file selected. Drop a PDF here or choose one to parse.</p>
          )}
          <button className="button button-primary" type="submit" disabled={!file || parsing || confirmMutation.isPending}>
            {parsing ? 'Parsing PDF…' : 'Parse PDF'}
          </button>
        </div>
      </form>

      {parsing ? (
        <p className="muted" role="status">
          Parsing PDF…
        </p>
      ) : null}
      {localError ? <Alert tone="error">{localError}</Alert> : null}
      {warnings.map((warning) => (
        <Alert key={warning} tone="info">
          {warning}
        </Alert>
      ))}

      {rows && rows.length === 0 && !parsing ? (
        <div className="empty-panel">
          <p>No meals found in this PDF.</p>
        </div>
      ) : null}

      {rows && rows.length > 0 ? (
        <>
          <div className="panel import-table-wrap">
            <table className="import-table">
              <thead>
                <tr>
                  <th>Import</th>
                  <th>Status</th>
                  <th>Date/time</th>
                  <th>Meal</th>
                  <th>Food</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Cal</th>
                  <th>P</th>
                  <th>C</th>
                  <th>F</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Include ${row.foodName ?? row.id}`}
                        checked={row.include}
                        onChange={(event) => updateRow(row.id, { include: event.target.checked })}
                      />
                    </td>
                    <td>
                      <span className={`status-pill ${row.status === 'valid' && !row.duplicate ? 'status-valid' : row.status === 'unparsed' ? 'status-unparsed' : 'status-warning'}`}>
                        {statusLabel(row)}
                      </span>
                      {row.issues[0] ? <p className="muted small">{row.issues[0]}</p> : null}
                    </td>
                    <td>
                      <input
                        type="datetime-local"
                        aria-label={`Time for ${row.foodName ?? row.id}`}
                        value={row.consumedAt ? toDateTimeLocalValue(row.consumedAt) : ''}
                        onChange={(event) =>
                          updateRow(row.id, {
                            consumedAt: event.target.value ? fromDateTimeLocalValue(event.target.value) : null,
                          })
                        }
                      />
                    </td>
                    <td>
                      <select
                        aria-label={`Meal for ${row.foodName ?? row.id}`}
                        value={row.mealType ?? ''}
                        onChange={(event) =>
                          updateRow(row.id, {
                            mealType: (event.target.value || null) as MealType | null,
                          })
                        }
                      >
                        <option value="">Select</option>
                        {mealTypes.map((meal) => (
                          <option key={meal.value} value={meal.value}>
                            {meal.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        aria-label={`Food for ${row.id}`}
                        value={row.foodName ?? ''}
                        onChange={(event) => updateRow(row.id, { foodName: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`Quantity for ${row.foodName ?? row.id}`}
                        inputMode="decimal"
                        value={row.quantity ?? ''}
                        onChange={(event) => updateRow(row.id, { quantity: parseOptionalNumber(event.target.value) })}
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`Unit for ${row.foodName ?? row.id}`}
                        value={row.quantityUnit ?? ''}
                        onChange={(event) => updateRow(row.id, { quantityUnit: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`Calories for ${row.foodName ?? row.id}`}
                        inputMode="decimal"
                        value={row.calories ?? ''}
                        onChange={(event) => updateRow(row.id, { calories: parseOptionalNumber(event.target.value) })}
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`Protein for ${row.foodName ?? row.id}`}
                        inputMode="decimal"
                        value={row.protein ?? ''}
                        onChange={(event) => updateRow(row.id, { protein: parseOptionalNumber(event.target.value) })}
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`Carbs for ${row.foodName ?? row.id}`}
                        inputMode="decimal"
                        value={row.carbs ?? ''}
                        onChange={(event) => updateRow(row.id, { carbs: parseOptionalNumber(event.target.value) })}
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`Fat for ${row.foodName ?? row.id}`}
                        inputMode="decimal"
                        value={row.fat ?? ''}
                        onChange={(event) => updateRow(row.id, { fat: parseOptionalNumber(event.target.value) })}
                      />
                    </td>
                    <td>
                      <button type="button" className="button button-ghost" onClick={() => removeRow(row.id)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            {readyRows.length} meal{readyRows.length === 1 ? '' : 's'} will be imported.
          </p>
          <div className="action-row">
            <button
              type="button"
              className="button button-primary"
              disabled={readyRows.length === 0 || confirmMutation.isPending}
              onClick={() => confirmMutation.mutate(readyRows.map(toPayload))}
            >
              {confirmMutation.isPending ? 'Importing…' : 'Import meals'}
            </button>
            <Link className="button button-secondary" to="/meals">
              Cancel
            </Link>
          </div>
        </>
      ) : null}
      </div>
    </section>
  );
}
