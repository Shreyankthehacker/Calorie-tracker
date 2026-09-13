import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  getCalorieReport,
  getGoalVsActualReport,
  getMacroReport,
  getMicronutrientReport,
} from '../api/reports';
import { useAuth } from '../auth/AuthProvider';
import {
  reportRangeForPreset,
  type ReportRangePreset,
} from '../lib/dates';

function formatAmount(value: number): string {
  if (Number.isInteger(value) || Math.abs(value - Math.round(value)) < 1e-6) {
    return String(Math.round(value));
  }
  return value.toFixed(1);
}

function formatNutrientKey(key: string): string {
  return key
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatAxisDate(value: string): string {
  const parts = value.split('-');
  const month = parts[1];
  const day = parts[2];
  if (!month || !day) return value;
  return `${month}/${day}`;
}

export function ReportsPage() {
  const { user } = useAuth();
  const timeZone = user?.timezone ?? 'UTC';
  const [preset, setPreset] = useState<ReportRangePreset>('this_week');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const range = useMemo(
    () =>
      reportRangeForPreset(preset, timeZone, new Date(), {
        startDate: customStart,
        endDate: customEnd,
      }),
    [preset, timeZone, customStart, customEnd],
  );

  const rangeReady = preset !== 'custom' || (Boolean(customStart) && Boolean(customEnd));

  const calorieQuery = useQuery({
    queryKey: ['reports', 'calories', range.startDate, range.endDate],
    queryFn: () => getCalorieReport(range),
    enabled: rangeReady,
  });
  const macroQuery = useQuery({
    queryKey: ['reports', 'macros', range.startDate, range.endDate],
    queryFn: () => getMacroReport(range),
    enabled: rangeReady,
  });
  const goalQuery = useQuery({
    queryKey: ['reports', 'goals', range.startDate, range.endDate],
    queryFn: () => getGoalVsActualReport(range),
    enabled: rangeReady,
  });
  const microQuery = useQuery({
    queryKey: ['reports', 'micronutrients', range.startDate, range.endDate],
    queryFn: () => getMicronutrientReport(range),
    enabled: rangeReady,
  });

  const loading =
    rangeReady &&
    (calorieQuery.isPending || macroQuery.isPending || goalQuery.isPending || microQuery.isPending);
  const error =
    calorieQuery.isError || macroQuery.isError || goalQuery.isError || microQuery.isError;

  const calorieData = calorieQuery.data?.data ?? [];
  const macroData = macroQuery.data?.data ?? [];
  const hasCalorieData = (calorieQuery.data?.totals.calories ?? 0) > 0;
  const hasMacroData =
    (macroQuery.data?.totals.protein ?? 0) +
      (macroQuery.data?.totals.carbs ?? 0) +
      (macroQuery.data?.totals.fat ?? 0) >
    0;
  const micros = microQuery.data?.data ?? [];
  const goalReport = goalQuery.data;

  return (
    <section className="page">
      <header className="page-header-row">
        <div className="page-header">
          <h1>Reports</h1>
          <p className="muted">Nutrition trends in your timezone ({timeZone}).</p>
        </div>
        <div className="range-controls">
          <label className="field">
            <span className="field-label">Period</span>
            <select
              value={preset}
              onChange={(event) => setPreset(event.target.value as ReportRangePreset)}
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This week</option>
              <option value="last_week">Last week</option>
              <option value="custom">Custom range</option>
            </select>
          </label>
          {preset === 'custom' ? (
            <>
              <label className="field">
                <span className="field-label">Start</span>
                <input
                  type="date"
                  value={customStart}
                  onChange={(event) => setCustomStart(event.target.value)}
                />
              </label>
              <label className="field">
                <span className="field-label">End</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(event) => setCustomEnd(event.target.value)}
                />
              </label>
            </>
          ) : null}
        </div>
      </header>

      {!rangeReady ? (
        <p className="muted">Choose a start and end date.</p>
      ) : loading ? (
        <p className="muted">Loading reports…</p>
      ) : error ? (
        <p className="error-text">Could not load reports.</p>
      ) : (
        <div className="report-stack">
          <section className="panel">
            <h2>Calories</h2>
            {hasCalorieData ? (
              <>
                <div
                  className="chart-frame"
                  role="img"
                  aria-label={`Calories: ${calorieData
                    .map((row) => `${row.date} ${row.calories} kcal`)
                    .join(', ')}`}
                >
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={calorieData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={formatAxisDate} />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="calories" stroke="#1f6b4a" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="muted small">
                  Period total: {formatAmount(calorieQuery.data?.totals.calories ?? 0)} kcal
                </p>
              </>
            ) : (
              <p className="muted">No nutrition data for this period.</p>
            )}
          </section>

          <section className="panel">
            <h2>Macro intake</h2>
            {hasMacroData ? (
              <>
                <div
                  className="chart-frame"
                  role="img"
                  aria-label={`Macros: ${macroData
                    .map(
                      (row) =>
                        `${row.date} protein ${row.protein}g carbs ${row.carbs}g fat ${row.fat}g`,
                    )
                    .join(', ')}`}
                >
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={macroData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={formatAxisDate} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="protein" fill="#1f6b4a" name="Protein" />
                      <Bar dataKey="carbs" fill="#2f8a5f" name="Carbs" />
                      <Bar dataKey="fat" fill="#9bbf73" name="Fat" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <dl className="stat-grid">
                  <div>
                    <dt>Protein</dt>
                    <dd>
                      {formatAmount(macroQuery.data?.totals.protein ?? 0)}{' '}
                      <span className="unit">g</span>
                    </dd>
                  </div>
                  <div>
                    <dt>Carbs</dt>
                    <dd>
                      {formatAmount(macroQuery.data?.totals.carbs ?? 0)}{' '}
                      <span className="unit">g</span>
                    </dd>
                  </div>
                  <div>
                    <dt>Fat</dt>
                    <dd>
                      {formatAmount(macroQuery.data?.totals.fat ?? 0)}{' '}
                      <span className="unit">g</span>
                    </dd>
                  </div>
                </dl>
              </>
            ) : (
              <p className="muted">No nutrition data for this period.</p>
            )}
          </section>

          <section className="panel">
            <h2>Goal vs actual</h2>
            {!goalReport || goalReport.goal === null ? (
              <div className="empty-panel compact">
                <p>No goal set yet.</p>
                <Link className="button button-primary" to="/goals">
                  Set your goal
                </Link>
              </div>
            ) : (
              <dl className="comparison-list">
                <div>
                  <dt>Calories</dt>
                  <dd>
                    {formatAmount(goalReport.actual.calories)} / {formatAmount(goalReport.goal.calories)}{' '}
                    <span className="unit">kcal</span>
                  </dd>
                </div>
                <div>
                  <dt>Protein</dt>
                  <dd>
                    {formatAmount(goalReport.actual.protein)} / {formatAmount(goalReport.goal.protein)}
                    g
                  </dd>
                </div>
                <div>
                  <dt>Carbs</dt>
                  <dd>
                    {formatAmount(goalReport.actual.carbs)} / {formatAmount(goalReport.goal.carbs)}g
                  </dd>
                </div>
                <div>
                  <dt>Fat</dt>
                  <dd>
                    {formatAmount(goalReport.actual.fat)} / {formatAmount(goalReport.goal.fat)}g
                  </dd>
                </div>
              </dl>
            )}
          </section>

          <section className="panel">
            <h2>Micronutrients</h2>
            {micros.length === 0 ? (
              <p className="muted">No micronutrient data for this period.</p>
            ) : (
              <ul className="micro-summary">
                {micros.map((row) => (
                  <li key={`${row.nutrientKey}-${row.unit}`}>
                    <span>{formatNutrientKey(row.nutrientKey)}</span>
                    <span>
                      {formatAmount(row.amount)} {row.unit}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
