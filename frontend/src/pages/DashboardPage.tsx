import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listFoodEntries } from '../api/food-entries';
import { getGoal } from '../api/goals';
import { getTodayReport } from '../api/reports';
import { ApiError, type Goal } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { ProgressBar } from '../components/layout/AppShell';
import { calendarDateInTimeZone, formatConsumedAt } from '../lib/dates';

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
  const today = calendarDateInTimeZone(new Date(), user?.timezone ?? 'UTC');

  const goalQuery = useQuery({
    queryKey: ['goals', 'current'],
    queryFn: getGoal,
    retry: false,
  });

  const todayReportQuery = useQuery({
    queryKey: ['reports', 'today'],
    queryFn: getTodayReport,
  });

  const recentMealsQuery = useQuery({
    queryKey: ['food-entries', 'today-recent', today],
    queryFn: () =>
      listFoodEntries({
        startDate: today,
        endDate: today,
        page: 1,
        pageSize: 4,
      }),
  });

  const missingGoal =
    goalQuery.isError && goalQuery.error instanceof ApiError && goalQuery.error.status === 404;
  const goal = goalQuery.data;
  const totals = todayReportQuery.data ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const recentMeals = recentMealsQuery.data?.data ?? [];
  const nutritionLoading = goalQuery.isPending || todayReportQuery.isPending;

  return (
    <section className="page">
      <header className="page-header">
        <h1>
          {timeGreeting()}, {greetingName(user?.email)}
        </h1>
        <p className="muted">Here is your nutrition overview for today.</p>
      </header>

      <div className="dashboard-grid">
        <section className="panel">
          <h2>Today&apos;s Nutrition</h2>
          {nutritionLoading ? (
            <p className="muted">Loading today&apos;s nutrition…</p>
          ) : todayReportQuery.isError ? (
            <p className="error-text">Unable to load today&apos;s nutrition. Please try again.</p>
          ) : missingGoal ? (
            <div className="empty-panel compact">
              <MacroSummary totals={totals} />
              <p>No nutrition goal set yet.</p>
              <Link className="button button-primary" to="/goals">
                Set your goal
              </Link>
            </div>
          ) : goalQuery.isError ? (
            <p className="error-text">Unable to load goals. Please try again.</p>
          ) : (
            <MacroSummary totals={totals} {...(goal ? { goal } : {})} />
          )}
        </section>

        <section className="panel">
          <h2>Today&apos;s progress</h2>
          {todayReportQuery.isPending ? (
            <p className="muted">Loading today&apos;s nutrition…</p>
          ) : todayReportQuery.isError ? (
            <p className="error-text">Unable to load today&apos;s nutrition. Please try again.</p>
          ) : goal ? (
            <div className="progress-stack">
              <ProgressBar
                label="Calories"
                current={totals.calories}
                target={goal.dailyCalorieTarget}
                unit="kcal"
              />
              <ProgressBar
                label="Protein"
                current={totals.protein}
                target={goal.proteinTarget}
                unit="g"
              />
              <ProgressBar label="Carbs" current={totals.carbs} target={goal.carbTarget} unit="g" />
              <ProgressBar label="Fat" current={totals.fat} target={goal.fatTarget} unit="g" />
            </div>
          ) : (
            <p className="muted">Set a goal to track daily progress against targets.</p>
          )}
        </section>

        <section className="panel">
          <h2>Quick Actions</h2>
          <div className="action-row">
            <Link className="button button-secondary" to="/meals">
              Add Meal
            </Link>
            <Link className="button button-secondary" to="/goals">
              Set Goals
            </Link>
            <Link className="button button-secondary" to="/scan">
              Scan Food
            </Link>
            <Link className="button button-secondary" to="/chat">
              Ask the assistant
            </Link>
          </div>
        </section>

        <section className="panel">
          <h2>Recent Activity</h2>
          {recentMealsQuery.isPending ? (
            <p className="muted">Loading meals…</p>
          ) : recentMealsQuery.isError ? (
            <p className="error-text">Unable to load meals. Please try again.</p>
          ) : recentMeals.length === 0 ? (
            <div className="empty-panel compact">
              <p>No meals logged today.</p>
              <Link className="button button-secondary" to="/meals">
                Add a meal
              </Link>
            </div>
          ) : (
            <ul className="meal-list compact-list">
              {recentMeals.map((entry) => (
                <li key={entry.id}>
                  <p className="meal-name">{entry.foodName}</p>
                  <p className="muted small">
                    {entry.calories} kcal · {formatConsumedAt(entry.consumedAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}

function MacroSummary({
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
