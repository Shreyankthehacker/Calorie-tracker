import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { deleteFoodEntry, listFoodEntries, updateFoodEntry } from '../api/food-entries';
import { getGoal } from '../api/goals';
import { getInsightsReport, getTodayReport } from '../api/reports';
import { ApiError, type FoodEntry, type FoodEntryWritePayload, type Goal } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { SkeletonBlock } from '../components/layout/AppShell';
import { useLogFood } from '../components/meals/LogFoodProvider';
import { MealForm } from '../components/meals/MealForm';
import { MealTimeline } from '../components/meals/MealTimeline';
import { CalorieRing } from '../components/nutrition/CalorieRing';
import { MacroBars } from '../components/nutrition/MacroBars';
import { calendarDateInTimeZone, isoWeekRange } from '../lib/dates';
import { formatAmount } from '../lib/nutrition';
import { EmptyState } from '../components/ui/EmptyState';
import { TimeOfDayMark } from '../components/ui/TimeOfDayMark';
import { useState } from 'react';

function greetingName(email: string | undefined): string {
  if (!email) return 'there';
  const local = email.split('@')[0] ?? 'there';
  return local;
}

function timeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardPage() {
  const { user } = useAuth();
  const { openLogFood } = useLogFood();
  const queryClient = useQueryClient();
  const today = calendarDateInTimeZone(new Date(), user?.timezone ?? 'UTC');
  const week = isoWeekRange(today);
  const [editor, setEditor] = useState<FoodEntry | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const goalQuery = useQuery({
    queryKey: ['goals', 'current'],
    queryFn: getGoal,
    retry: false,
  });

  const todayReportQuery = useQuery({
    queryKey: ['reports', 'today'],
    queryFn: getTodayReport,
  });

  const insightsQuery = useQuery({
    queryKey: ['reports', 'insights', week.startDate, week.endDate],
    queryFn: () => getInsightsReport(week),
  });

  const mealsQuery = useQuery({
    queryKey: ['food-entries', 'today', today],
    queryFn: () =>
      listFoodEntries({
        startDate: today,
        endDate: today,
        page: 1,
        pageSize: 50,
      }),
  });

  function invalidateDay() {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ['food-entries'] }),
      queryClient.invalidateQueries({ queryKey: ['reports'] }),
    ]);
  }

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: FoodEntryWritePayload }) =>
      updateFoodEntry(id, payload),
    onSuccess: async () => {
      setEditor(null);
      setFormError(null);
      await invalidateDay();
    },
    onError: (err: unknown) => {
      setFormError(err instanceof ApiError ? err.message : 'Could not update meal.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFoodEntry,
    onSuccess: async () => {
      await invalidateDay();
    },
  });

  const missingGoal =
    goalQuery.isError && goalQuery.error instanceof ApiError && goalQuery.error.status === 404;
  const goal = goalQuery.data;
  const totals = todayReportQuery.data ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const entries = mealsQuery.data?.data ?? [];
  const nutritionLoading = goalQuery.isPending || todayReportQuery.isPending;
  const insights = insightsQuery.data;

  return (
    <section className="page overview-page">
      <header className="page-header-row">
        <div className="page-header greeting-row">
          <TimeOfDayMark />
          <div>
            <h1>
              {timeGreeting()}, {greetingName(user?.email)}
            </h1>
            <p className="muted">
              {new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(
                new Date(),
              )}
            </p>
          </div>
        </div>
        <button type="button" className="button button-primary" onClick={openLogFood}>
          <Plus size={16} aria-hidden="true" />
          Log food
        </button>
      </header>

      {nutritionLoading ? (
        <SkeletonBlock label="Loading today's nutrition…" />
      ) : todayReportQuery.isError ? (
        <p className="error-text">Unable to load today&apos;s nutrition. Please try again.</p>
      ) : goalQuery.isError && !missingGoal ? (
        <p className="error-text">Unable to load goals. Please try again.</p>
      ) : (
        <section className="overview-hero">
          <CalorieRing consumed={totals.calories} target={goal?.dailyCalorieTarget ?? null} />
          <div className="overview-macros">
            <h2>Macros</h2>
            {missingGoal ? (
              <EmptyState
                illustration="target"
                title="No nutrition goal set yet."
                action={
                  <Link className="button button-primary" to="/goals">
                    Set your goal
                  </Link>
                }
              />
            ) : (
              <MacroBars
                protein={totals.protein}
                carbs={totals.carbs}
                fat={totals.fat}
                {...(goal
                  ? {
                      proteinTarget: goal.proteinTarget,
                      carbTarget: goal.carbTarget,
                      fatTarget: goal.fatTarget,
                    }
                  : {})}
              />
            )}
          </div>
        </section>
      )}

      <section className="panel-quiet">
        <header className="section-head">
          <h2>Today</h2>
          <p className="muted small">
            {entries.length === 0 ? 'Nothing logged yet' : `${entries.length} logged`}
          </p>
        </header>
        {mealsQuery.isPending ? (
          <SkeletonBlock label="Loading meals…" />
        ) : mealsQuery.isError ? (
          <p className="error-text">Unable to load meals. Please try again.</p>
        ) : entries.length === 0 ? (
          <EmptyState
            title="No meals logged today."
            action={
              <button type="button" className="button button-secondary" onClick={openLogFood}>
                Add a meal
              </button>
            }
          />
        ) : (
          <MealTimeline
            entries={entries}
            onAdd={openLogFood}
            onEdit={(entry) => {
              setEditor(entry);
              setFormError(null);
            }}
            onDelete={(entry) => {
              if (window.confirm(`Delete ${entry.foodName}?`)) {
                deleteMutation.mutate(entry.id);
              }
            }}
          />
        )}
      </section>

      <section className="insight-grid">
        <article className="insight-card">
          <h2>This week</h2>
          {insightsQuery.isPending ? (
            <p className="muted">Loading reports…</p>
          ) : insightsQuery.isError ? (
            <p className="error-text">Unable to load weekly insights.</p>
          ) : (
            <dl className="insight-stats">
              <div>
                <dt>Avg calories</dt>
                <dd>
                  {formatAmount(insights?.averageCalories ?? 0)} <span className="unit">kcal</span>
                </dd>
              </div>
              <div>
                <dt>Avg protein</dt>
                <dd>
                  {formatAmount(insights?.averageProtein ?? 0)} <span className="unit">g</span>
                </dd>
              </div>
              <div>
                <dt>Days tracked</dt>
                <dd>{insights?.daysTracked ?? 0}</dd>
              </div>
              <div>
                <dt>On target</dt>
                <dd>{insights?.daysOnTarget ?? 0}</dd>
              </div>
              <div className={insights?.currentStreak ? 'streak-stat' : undefined}>
                <dt>Streak</dt>
                <dd>
                  <motion.span
                    key={insights?.currentStreak ?? 0}
                    initial={{ scale: 0.92, opacity: 0.6 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.22 }}
                  >
                    {insights?.currentStreak ?? 0}
                  </motion.span>
                </dd>
              </div>
            </dl>
          )}
        </article>
        <nav className="insight-card insight-actions" aria-label="Shortcuts">
          <h2>More ways to log</h2>
          <Link className="button button-secondary" to="/scan">
            Scan a photo
          </Link>
          <Link className="button button-secondary" to="/chat">
            Ask the assistant
          </Link>
          <Link className="button button-secondary" to="/import">
            Import a PDF
          </Link>
        </nav>
      </section>

      {editor ? (
        <div className="modal-backdrop">
          <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="edit-meal-title">
            <h2 id="edit-meal-title">Edit meal</h2>
            <MealForm
              initial={editor}
              submitting={updateMutation.isPending}
              error={formError}
              onCancel={() => {
                setEditor(null);
                setFormError(null);
              }}
              onSubmit={(payload) => updateMutation.mutate({ id: editor.id, payload })}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function MacroSummary({
  totals,
  goal,
}: {
  totals: { calories: number; protein: number; carbs: number; fat: number };
  goal?: Goal;
}) {
  return (
    <dl className="stat-grid">
      <div>
        <dt>Calories</dt>
        <dd>
          {totals.calories}
          {goal ? ` / ${goal.dailyCalorieTarget}` : ''} <span className="unit">kcal</span>
        </dd>
      </div>
      <div>
        <dt>Protein</dt>
        <dd>
          {totals.protein}
          {goal ? ` / ${goal.proteinTarget}` : ''} <span className="unit">g</span>
        </dd>
      </div>
      <div>
        <dt>Carbs</dt>
        <dd>
          {totals.carbs}
          {goal ? ` / ${goal.carbTarget}` : ''} <span className="unit">g</span>
        </dd>
      </div>
      <div>
        <dt>Fat</dt>
        <dd>
          {totals.fat}
          {goal ? ` / ${goal.fatTarget}` : ''} <span className="unit">g</span>
        </dd>
      </div>
    </dl>
  );
}
