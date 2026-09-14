import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { SkeletonBlock } from '../components/layout/AppShell';
import { DateField } from '../components/ui/DateField';
import {
  reportRangeForPreset,
  type ReportRangePreset,
} from '../lib/dates';

const ACCENT = '#3f5d44';
const PROTEIN = '#d36b4a';
const CARBS = '#c4a15a';
const FAT = '#5d7a94';
const INK = '#1c1b16';

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
  const navigate = useNavigate();
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
              <DateField id="report-start" label="Start" value={customStart} onChange={setCustomStart} />
              <DateField id="report-end" label="End" value={customEnd} onChange={setCustomEnd} />
            </>
          ) : null}
        </div>
      </header>

      {!rangeReady ? (
        <p className="muted">Choose a start and end date.</p>
      ) : loading ? (
        <SkeletonBlock label="Loading reports…" />
      ) : error ? (
        <p className="error-text">Unable to load reports. Please try again.</p>
      ) : (
        <div className="report-stack">
          <section className="panel-quiet">
            <h2>Tracked days</h2>
            {calorieData.length === 0 ? (
              <p className="muted">No nutrition data for this period.</p>
            ) : (
              <div className="day-calendar" role="list">
                {calorieData.map((row) => {
                  const tracked = row.calories > 0;
                  return (
                    <button
                      key={row.date}
                      type="button"
                      role="listitem"
                      className={`day-chip ${tracked ? 'is-tracked' : ''}`}
                      onClick={() => navigate(`/meals?date=${row.date}`)}
                    >
                      <span>{formatAxisDate(row.date)}</span>
                      <strong>{tracked ? `${Math.round(row.calories)}` : '—'}</strong>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="panel-quiet">
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
                      <CartesianGrid vertical={false} stroke="rgba(26, 25, 22, 0.08)" />
                      <XAxis dataKey="date" tickFormatter={formatAxisDate} tick={{ fill: INK, fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: INK, fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="calories" stroke={ACCENT} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
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

          <section className="panel-quiet">
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
                      <CartesianGrid vertical={false} stroke="rgba(26, 25, 22, 0.08)" />
                      <XAxis dataKey="date" tickFormatter={formatAxisDate} tick={{ fill: INK, fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: INK, fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="protein" fill={PROTEIN} name="Protein" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="carbs" fill={CARBS} name="Carbs" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="fat" fill={FAT} name="Fat" radius={[4, 4, 0, 0]} />
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

          <section className="panel-quiet">
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

          <section className="panel-quiet">
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
