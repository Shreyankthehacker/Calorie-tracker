import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createGoal, deleteGoal, getGoal, upsertGoal } from '../api/goals';
import { ApiError, type GoalWritePayload } from '../api/types';
import { Alert, FormField, SkeletonBlock } from '../components/layout/AppShell';
import { EmptyState } from '../components/ui/EmptyState';

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

export function GoalsPage() {
  const queryClient = useQueryClient();
  const goalQuery = useQuery({
    queryKey: ['goals', 'current'],
    queryFn: getGoal,
    retry: false,
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
    if (
      [payload.dailyCalorieTarget, payload.proteinTarget, payload.carbTarget, payload.fatTarget].some(
        (n) => Number.isNaN(n),
      )
    ) {
      setFormError('Enter valid numbers for all required fields.');
      return;
    }
    saveMutation.mutate(payload);
  }

  const showForm = editing;

  return (
    <section className="page">
      <header className="page-header">
        <h1>Nutrition goals</h1>
        <p className="muted">Set daily calorie and macro targets used for progress and reports.</p>
      </header>

      {goalQuery.isPending ? <SkeletonBlock label="Loading goals…" /> : null}

      {goalQuery.isError && !missingGoal ? (
        <Alert tone="error">Unable to load your goal. Please try again.</Alert>
      ) : null}

      {success ? <Alert tone="success">{success}</Alert> : null}
      {formError ? <Alert tone="error">{formError}</Alert> : null}

      {missingGoal && !editing ? (
        <EmptyState
          illustration="target"
          title="No nutrition goal set yet."
          action={
            <button
              type="button"
              className="button button-primary"
              onClick={() => {
                setEditing(true);
                setSuccess(null);
                setFormError(null);
              }}
            >
              Set your goal
            </button>
          }
        />
      ) : null}

      {goalQuery.data && !editing ? (
        <div className="panel">
          <dl className="stat-grid">
            <div>
              <dt>Daily calories</dt>
              <dd>
                {goalQuery.data.dailyCalorieTarget} <span className="unit">kcal</span>
              </dd>
            </div>
            <div>
              <dt>Protein</dt>
              <dd>
                {goalQuery.data.proteinTarget} <span className="unit">g</span>
              </dd>
            </div>
            <div>
              <dt>Carbohydrates</dt>
              <dd>
                {goalQuery.data.carbTarget} <span className="unit">g</span>
              </dd>
            </div>
            <div>
              <dt>Fat</dt>
              <dd>
                {goalQuery.data.fatTarget} <span className="unit">g</span>
              </dd>
            </div>
          </dl>
          <div className="action-row">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => {
                setEditing(true);
                setSuccess(null);
              }}
            >
              Edit goals
            </button>
            <button
              type="button"
              className="button button-danger"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (window.confirm('Delete your current nutrition goal?')) {
                  deleteMutation.mutate();
                }
              }}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete goal'}
            </button>
          </div>
        </div>
      ) : null}

      {showForm ? (
        <form className="panel stack-form" onSubmit={onSubmit} noValidate>
          <h2>{missingGoal ? 'Set your goal' : 'Update goals'}</h2>
          <FormField label="Daily calories (kcal)" htmlFor="goal-calories">
            <input
              id="goal-calories"
              type="number"
              min={0}
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
              step="any"
              value={form.fatTarget}
              onChange={(e) => updateField('fatTarget', e.target.value)}
              required
            />
          </FormField>
          <div className="action-row">
            <button className="button button-primary" type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving…' : 'Save goals'}
            </button>
            {!missingGoal ? (
              <button type="button" className="button button-ghost" onClick={() => setEditing(false)}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      ) : null}
    </section>
  );
}
