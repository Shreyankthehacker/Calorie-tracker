import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listFoodEntries } from '../api/food-entries';
import { getGoal } from '../api/goals';
import { getTodayReport } from '../api/reports';
import { ApiError, type FoodEntry, type MealType } from '../api/types';
import { useAuth } from '../auth/AuthProvider';
import { SkeletonBlock } from '../components/layout/AppShell';
import { FoodThumb } from '../components/meals/FoodThumb';
import { useLogFood } from '../components/meals/LogFoodProvider';
import { calendarDateInTimeZone } from '../lib/dates';
import { isPlausibleDailyCalorieTarget } from '../lib/goal-sanity';
import { formatAmount, MEAL_SECTIONS } from '../lib/nutrition';

function formatTodayTitle(now: Date): string {
  return `Today, ${new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric' }).format(now)}`;
}

function formatLoggedAt(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}

function groupMeal(entries: FoodEntry[], type: MealType) {
  const items = entries.filter((entry) => entry.mealType === type);
  if (items.length === 0) return null;
  const calories = items.reduce((sum, entry) => sum + entry.calories, 0);
  const latest = items.reduce((a, b) => (a.consumedAt > b.consumedAt ? a : b));
  return {
    items,
    calories,
    desc: items.map((entry) => entry.foodName).join(', '),
    time: latest.consumedAt,
    photoName: items[0]?.foodName ?? type,
  };
}

function sageTodayCopy(entries: FoodEntry[], totals: { protein: number; calories: number }): string {
  if (entries.length === 0) {
    return 'No meals logged yet today, so there is not enough data for a recommendation.';
  }
  const names = entries.slice(0, 3).map((entry) => entry.foodName).join(', ');
  if (totals.protein < 20 && totals.calories > 0) {
    return `Logged so far: ${names}. Protein is ${formatAmount(totals.protein)}g on ${formatAmount(totals.calories)} kcal — add a protein source if that is the plan.`;
  }
  return `Logged so far: ${names}. These numbers come from today's food entries, not a generic diet script.`;
}

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openLogFood } = useLogFood();
  const today = calendarDateInTimeZone(new Date(), user?.timezone ?? 'UTC');

  const goalQuery = useQuery({ queryKey: ['goals', 'current'], queryFn: getGoal, retry: false });
  const todayReportQuery = useQuery({ queryKey: ['reports', 'today'], queryFn: getTodayReport });
  const mealsQuery = useQuery({
    queryKey: ['food-entries', 'today', today],
    queryFn: () => listFoodEntries({ startDate: today, endDate: today, page: 1, pageSize: 50 }),
  });

  const missingGoal =
    goalQuery.isError && goalQuery.error instanceof ApiError && goalQuery.error.status === 404;
  const goal = goalQuery.data;
  const goalUsable = Boolean(goal && isPlausibleDailyCalorieTarget(goal.dailyCalorieTarget));
  const totals = todayReportQuery.data ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const entries = mealsQuery.data?.data ?? [];
  const nutritionLoading = goalQuery.isPending || todayReportQuery.isPending;
  const macroSum = totals.protein + totals.carbs + totals.fat;
  const showMacroRing = macroSum > 0;
  const proteinPct = macroSum > 0 ? Math.round((totals.protein / macroSum) * 100) : 0;
  const circumference = 2 * Math.PI * 55;
  const dashOffset = circumference - (circumference * proteinPct) / 100;

  return (
    <div className="page-today">
      <div className="main-inner">
        <div className="top-row">
          <div>
            <div className="kicker">Daily ledger</div>
            <h1 className="page-title">{formatTodayTitle(new Date())}</h1>
          </div>
          <button type="button" className="btn-primary" onClick={openLogFood}>
            + Log new item
          </button>
        </div>

        {nutritionLoading ? (
          <SkeletonBlock label="Loading today's nutrition…" />
        ) : todayReportQuery.isError ? (
          <p className="error-text">Unable to load today&apos;s nutrition. Please try again.</p>
        ) : goalQuery.isError && !missingGoal ? (
          <p className="error-text">Unable to load goals. Please try again.</p>
        ) : (
          <div className="hero-split">
            <div className="right">
              <img
                src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1000&q=80&auto=format&fit=crop"
                alt="Fresh bowl of vegetables and greens"
              />
            </div>
            <div className="seam" />
            <div className="left">
              <div className="eyebrow">Daily ledger</div>
              <div className="stat">
                {formatAmount(totals.calories)}
                <span>kcal logged today</span>
              </div>
              {goal && !goalUsable ? (
                <p>
                  Your saved target is {formatAmount(goal.dailyCalorieTarget)} kcal/day, which is too low to use as a
                  daily budget. Update it in Goals.
                </p>
              ) : goalUsable && goal ? (
                <p>
                  {totals.calories <= goal.dailyCalorieTarget
                    ? `${formatAmount(goal.dailyCalorieTarget - totals.calories)} kcal remaining of your ${formatAmount(goal.dailyCalorieTarget)} kcal target.`
                    : `${formatAmount(totals.calories - goal.dailyCalorieTarget)} kcal over your ${formatAmount(goal.dailyCalorieTarget)} kcal target.`}
                </p>
              ) : (
                <p>
                  No daily target set. CalorieTracker won&apos;t push a generic limit on you — set one in Goals, or
                  keep tracking freely.
                </p>
              )}
              <button type="button" onClick={() => navigate('/goals')}>
                Set target
              </button>
            </div>
          </div>
        )}

        <div className="grid">
          <div>
            <h2>Meals &amp; spacing</h2>
            {mealsQuery.isPending ? (
              <SkeletonBlock label="Loading meals…" />
            ) : mealsQuery.isError ? (
              <p className="error-text">Unable to load meals. Please try again.</p>
            ) : (
              <>
                {entries.length === 0 ? <p>No meals logged today.</p> : null}
                {MEAL_SECTIONS.map((section) => {
                  const grouped = groupMeal(entries, section.type);
                  if (!grouped) {
                    return (
                      <button
                        type="button"
                        className="empty-slot"
                        key={section.type}
                        onClick={openLogFood}
                      >
                        <span>{section.label}</span>
                        <span className="plus">
                          {section.type === 'SNACKS' ? '+ Add snack' : '+ Add meal'}
                        </span>
                      </button>
                    );
                  }
                  return (
                    <div className="meal-card" key={section.type}>
                      <FoodThumb name={grouped.photoName} />
                      <div className="meal-info">
                        <div className="title">{section.label}</div>
                        <div className="time">Logged at {formatLoggedAt(grouped.time)}</div>
                        <div className="desc">{grouped.desc}</div>
                      </div>
                      <div className="meal-kcal">{Math.round(grouped.calories)} kcal</div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
          <div>
            <h2>Context &amp; wisdom</h2>
            <div className="side-card">
              <div className="who">🐾 Sage assistant</div>
              <p>&quot;{sageTodayCopy(entries, totals)}&quot;</p>
              <Link className="ask-sage" to="/chat">
                Ask Sage about today
              </Link>
            </div>
            {showMacroRing ? (
              <div className="ring-card">
                <div className="cap">Macro balance</div>
                <div className="ring-wrap">
                  <svg width="132" height="132" viewBox="0 0 132 132">
                    <circle className="ring-bg" cx="66" cy="66" r="55" />
                    <circle
                      className="ring-fg"
                      cx="66"
                      cy="66"
                      r="55"
                      strokeDasharray={circumference}
                      strokeDashoffset={dashOffset}
                    />
                  </svg>
                  <div className="ring-center">
                    <div className="n">{proteinPct}%</div>
                    <div className="l">protein</div>
                  </div>
                </div>
                <div className="ring-note">
                  From today&apos;s logged meals: {formatAmount(totals.protein)}g protein · {formatAmount(totals.carbs)}g
                  carbs · {formatAmount(totals.fat)}g fat
                </div>
                <div className="ring-note">
                  {goalUsable && goal
                    ? `Goal ${formatAmount(goal.dailyCalorieTarget)} kcal`
                    : "No usable daily goal — showing today's raw split"}
                </div>
              </div>
            ) : (
              <div className="ring-card">
                <div className="cap">Macro balance</div>
                <div className="ring-note">No macro grams logged yet today, so this ring stays hidden.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
