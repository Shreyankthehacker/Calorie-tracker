import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createGoal, deleteGoal, getGoal, upsertGoal } from '../api/goals';
import { getInsightsReport } from '../api/reports';
import { ApiError, type GoalWritePayload } from '../api/types';
import { Alert, FormField, SkeletonBlock } from '../components/layout/AppShell';
import { useAuth } from '../auth/AuthProvider';
import { addCalendarDays, calendarDateInTimeZone } from '../lib/dates';
import { assessGoal, macroCaloriePool, validateGoalForSave } from '../lib/goal-sanity';

type GoalFormState = {
  dailyCalorieTarget: string;
  proteinTarget: string;
  carbTarget: string;
  fatTarget: string;
};

const emptyForm: GoalFormState = {
  dailyCalorieTarget: '',
  proteinTarget: '',
  carbTarget: '',
  fatTarget: '',
};

function toPayload(form: GoalFormState): GoalWritePayload {
  return {
    dailyCalorieTarget: Number(form.dailyCalorieTarget),
    proteinTarget: Number(form.proteinTarget),
    carbTarget: Number(form.carbTarget),
    fatTarget: Number(form.fatTarget),
    weightGoal: null,
  };
}

function streakCopy(streak: number | undefined): { title: string; body: string } {
  if (streak == null) {
    return { title: 'Streak', body: 'Loading logged-day history…' };
  }
  if (streak <= 0) {
    return {
      title: 'No streak yet',
      body: 'Log a meal today to start a streak. This count only includes days with at least one food entry.',
    };
  }
  if (streak === 1) {
    return { title: '1-day streak', body: 'You logged food yesterday or today. Keep going tomorrow to make it two.' };
  }
  return {
    title: `${streak}-day streak`,
    body: `You've logged food on ${streak} consecutive days, counting back from the latest tracked day.`,
  };
}

export function GoalsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = calendarDateInTimeZone(new Date(), user?.timezone ?? 'UTC');
  const goalQuery = useQuery({
    queryKey: ['goals', 'current'],
    queryFn: getGoal,
    retry: false,
  });
  const insightsQuery = useQuery({
    queryKey: ['reports', 'insights', 'streak', today],
    queryFn: () =>
      getInsightsReport({
        startDate: addCalendarDays(today, -89),
        endDate: today,
      }),
  });

  const missingGoal =
    goalQuery.isError && goalQuery.error instanceof ApiError && goalQuery.error.status === 404;

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<GoalFormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (goalQuery.data) {
      setForm({
        dailyCalorieTarget: String(goalQuery.data.dailyCalorieTarget),
        proteinTarget: String(goalQuery.data.proteinTarget),
        carbTarget: String(goalQuery.data.carbTarget),
        fatTarget: String(goalQuery.data.fatTarget),
      });
    }
  }, [goalQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: GoalWritePayload) => {
      if (missingGoal) {
        return createGoal(payload);
      }
      return upsertGoal(payload);
    },
    onSuccess: async () => {
      setSuccess(missingGoal ? 'Goal created.' : 'Goal updated.');
      setFormError(null);
      setEditing(false);
      await queryClient.invalidateQueries({ queryKey: ['goals', 'current'] });
    },
    onError: (err: unknown) => {
      setSuccess(null);
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('Could not save goal.');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteGoal,
    onSuccess: async () => {
      setSuccess('Goal deleted.');
      setEditing(false);
      setForm(emptyForm);
      await queryClient.invalidateQueries({ queryKey: ['goals', 'current'] });
    },
    onError: (err: unknown) => {
      setSuccess(null);
      setFormError(err instanceof ApiError ? err.message : 'Could not delete goal.');
    },
  });

  function updateField(key: keyof GoalFormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setSuccess(null);
    const payload = toPayload(form);
    const invalid = validateGoalForSave(payload);
    if (invalid) {
      setFormError(invalid);
      return;
    }
    saveMutation.mutate(payload);
  }

  const showForm = editing;
  const calories = goalQuery.data?.dailyCalorieTarget ?? (Number(form.dailyCalorieTarget) || 0);
  const protein = goalQuery.data?.proteinTarget ?? (Number(form.proteinTarget) || 0);
  const carbs = goalQuery.data?.carbTarget ?? (Number(form.carbTarget) || 0);
  const fat = goalQuery.data?.fatTarget ?? (Number(form.fatTarget) || 0);
  const proteinKcal = protein * 4;
  const carbKcal = carbs * 4;
  const fatKcal = fat * 9;
  const pool = macroCaloriePool(protein, carbs, fat);
  const percentBase = pool > 0 ? pool : calories;
  const assessment = useMemo(
    () => assessGoal({ dailyCalorieTarget: calories, proteinTarget: protein, carbTarget: carbs, fatTarget: fat }),
    [calories, protein, carbs, fat],
  );
  const streak = streakCopy(insightsQuery.isPending ? undefined : insightsQuery.data?.currentStreak ?? 0);

  return (
    <div className="page-goals">
      <div className="main-inner">
      <div className="top-row">
        <div>
          <div className="kicker">Goal configuration</div>
          <h1 className="page-title">Targets &amp; macro calculator</h1>
        </div>
        {goalQuery.data ? (
          <button
            type="button"
            className="btn-link"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (window.confirm('Delete your current nutrition goal?')) {
                deleteMutation.mutate();
              }
            }}
          >
            {deleteMutation.isPending ? 'Deleting…' : 'Clear goal / run no-goal mode'}
          </button>
        ) : null}
      </div>

      {goalQuery.isPending ? <SkeletonBlock label="Loading goals…" /> : null}

      {goalQuery.isError && !missingGoal ? (
        <Alert tone="error">Unable to load your goal. Please try again.</Alert>
      ) : null}

      {success ? <Alert tone="success">{success}</Alert> : null}
      {formError ? <Alert tone="error">{formError}</Alert> : null}

      {missingGoal && !editing ? (
        <div className="results">
          <p>No nutrition goal set yet.</p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setEditing(true);
              setSuccess(null);
              setFormError(null);
            }}
          >
            Set your goal
          </button>
        </div>
      ) : null}

      {goalQuery.data && !editing ? (
        <>
          <h2>The 4/4/9 calorie model</h2>
          <p className="sub">
            Protein and carbohydrates contain 4 kcal/g. Fats contain 9 kcal/g. The daily calorie target is the number
            you set. Macro grams are checked against that target — they are not divided into it.
          </p>
          <div className="hero-num">
            <img
              className="slide"
              src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1000&q=80&auto=format&fit=crop"
              alt=""
            />
            <img
              className="slide"
              src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1000&q=80&auto=format&fit=crop"
              alt=""
            />
            <img
              className="slide"
              src="https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=1000&q=80&auto=format&fit=crop"
              alt=""
            />
            <div className="content">
              <div className="l">Daily calorie target</div>
              <div className="n">
                {calories}
                <span>kcal / day</span>
              </div>
              <div className="l pool-note">Macros add up to {Math.round(pool)} kcal via 4/4/9</div>
            </div>
            <svg className="steam" viewBox="0 0 70 70" aria-hidden="true">
              <path d="M20 55 C 14 45, 26 40, 20 30 C 14 20, 26 15, 22 5" />
              <path d="M35 55 C 29 45, 41 40, 35 30 C 29 20, 41 15, 37 5" />
              <path d="M50 55 C 44 45, 56 40, 50 30 C 44 20, 56 15, 52 5" />
            </svg>
          </div>
          <div className="grid">
            <div className="panel">
              <h2 className="panel-sub">Macro allotment inputs</h2>
              <div className="macro-row">
                <div className="macro-head">
                  <span>Protein target</span>
                  <b>
                    {protein}
                    <span>g ({proteinKcal} kcal)</span>
                  </b>
                </div>
                <div className="bar-bg">
                  <div className="bar-fill" style={{ width: percentBase ? `${Math.min(100, (proteinKcal / percentBase) * 100)}%` : '0%' }} />
                </div>
              </div>
              <div className="macro-row">
                <div className="macro-head">
                  <span>Carbohydrates target</span>
                  <b>
                    {carbs}g ({carbKcal} kcal)
                  </b>
                </div>
                <div className="bar-bg">
                  <div className="bar-fill" style={{ width: percentBase ? `${Math.min(100, (carbKcal / percentBase) * 100)}%` : '0%' }} />
                </div>
              </div>
              <div className="macro-row">
                <div className="macro-head">
                  <span>Fats target</span>
                  <b>
                    {fat}g ({fatKcal} kcal)
                  </b>
                </div>
                <div className="bar-bg">
                  <div className="bar-fill" style={{ width: percentBase ? `${Math.min(100, (fatKcal / percentBase) * 100)}%` : '0%' }} />
                </div>
              </div>
              <div className="actions">
                <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>
                  Edit goals
                </button>
              </div>
            </div>
            <div>
              <div className="side-card streak-card">
                <div className="flame-wrap">
                  <svg className="flame" viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <defs>
                      <linearGradient id="flameGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#D6415A" />
                        <stop offset="55%" stopColor="#A8112A" />
                        <stop offset="100%" stopColor="#7A0C1F" />
                      </linearGradient>
                    </defs>
                    <path
                      fill="url(#flameGrad)"
                      d="M30 4 C 14 24, 18 38, 24 46 C 16 42, 12 54, 22 64 C 18 52, 30 52, 30 66 C 44 54, 48 42, 38 34 C 46 26, 38 14, 30 4 Z"
                    />
                  </svg>
                  <div className="spark s1" />
                  <div className="spark s2" />
                  <div className="spark s3" />
                </div>
                <div className="streak-text">
                  <div className="n">{streak.title}</div>
                  <div className="s">{streak.body}</div>
                </div>
              </div>
              <div className="side-card pct-card">
                <h2 className="panel-sub-sm">Percentage allocation</h2>
                <p className="note">Share of macro calories ({Math.round(pool)} kcal), not the calorie target.</p>
                <div className="pct-row">
                  <span>Protein</span>
                  <b>{percentBase ? Math.round((proteinKcal / percentBase) * 100) : 0}%</b>
                </div>
                <div className="pct-row">
                  <span>Carbohydrates</span>
                  <b>{percentBase ? Math.round((carbKcal / percentBase) * 100) : 0}%</b>
                </div>
                <div className="pct-row">
                  <span>Fats</span>
                  <b>{percentBase ? Math.round((fatKcal / percentBase) * 100) : 0}%</b>
                </div>
              </div>
              {assessment.warnings.length > 0 ? (
                <div className="side-card warn-card">
                  <div className="t">Validation warning</div>
                  {assessment.warnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </div>
              ) : (
                <div className="side-card">
                  <div className="t">Looks coherent</div>
                  <p>Calorie and macro targets are within typical daily ranges.</p>
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}

      {showForm ? (
        <form className="panel stack-form" onSubmit={onSubmit} noValidate>
          <h2>{missingGoal ? 'Set your goal' : 'Update goals'}</h2>
          <FormField label="Daily calories (kcal)" htmlFor="goal-calories">
            <input
              id="goal-calories"
              type="number"
              min={800}
              max={6000}
              step="any"
              value={form.dailyCalorieTarget}
              onChange={(e) => updateField('dailyCalorieTarget', e.target.value)}
              required
            />
          </FormField>
          <FormField label="Daily protein (g)" htmlFor="goal-protein">
            <input
              id="goal-protein"
              type="number"
              min={0}
              max={300}
              step="any"
              value={form.proteinTarget}
              onChange={(e) => updateField('proteinTarget', e.target.value)}
              required
            />
          </FormField>
          <FormField label="Daily carbohydrates (g)" htmlFor="goal-carbs">
            <input
              id="goal-carbs"
              type="number"
              min={0}
              max={800}
              step="any"
              value={form.carbTarget}
              onChange={(e) => updateField('carbTarget', e.target.value)}
              required
            />
          </FormField>
          <FormField label="Daily fat (g)" htmlFor="goal-fat">
            <input
              id="goal-fat"
              type="number"
              min={0}
              max={250}
              step="any"
              value={form.fatTarget}
              onChange={(e) => updateField('fatTarget', e.target.value)}
              required
            />
          </FormField>
          <div className="actions">
            <button className="btn-primary" type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving…' : 'Save goals'}
            </button>
            {!missingGoal ? (
              <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      ) : null}
      </div>
    </div>
  );
}
