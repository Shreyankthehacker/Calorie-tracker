import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createFoodEntry,
  deleteFoodEntry,
  listFoodEntries,
  updateFoodEntry,
} from '../api/food-entries';
import { ApiError, type FoodEntry, type FoodEntryWritePayload, type MealType } from '../api/types';
import { Alert } from '../components/layout/AppShell';
import { MealForm } from '../components/meals/MealForm';
import { formatConsumedAt } from '../lib/dates';

const mealSections: Array<{ type: MealType; label: string }> = [
  { type: 'BREAKFAST', label: 'Breakfast' },
  { type: 'LUNCH', label: 'Lunch' },
  { type: 'DINNER', label: 'Dinner' },
  { type: 'SNACKS', label: 'Snacks' },
];

const PAGE_SIZE = 10;

export function MealsPage() {
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [mealType, setMealType] = useState<MealType | ''>('');
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<'create' | FoodEntry | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const filters = useMemo(() => {
    const params: Parameters<typeof listFoodEntries>[0] = {
      page,
      pageSize: PAGE_SIZE,
    };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (mealType) params.mealType = mealType;
    return params;
  }, [startDate, endDate, mealType, page]);

  const mealsQuery = useQuery({
    queryKey: ['food-entries', filters],
    queryFn: () => listFoodEntries(filters),
  });

  function invalidateMeals() {
    return queryClient.invalidateQueries({ queryKey: ['food-entries'] });
  }

  const createMutation = useMutation({
    mutationFn: createFoodEntry,
    onSuccess: async () => {
      setSuccess('Meal added.');
      setFormError(null);
      setEditor(null);
      await invalidateMeals();
    },
    onError: (err: unknown) => {
      setFormError(err instanceof ApiError ? err.message : 'Could not add meal.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: FoodEntryWritePayload }) =>
      updateFoodEntry(id, payload),
    onSuccess: async () => {
      setSuccess('Meal updated.');
      setFormError(null);
      setEditor(null);
      await invalidateMeals();
    },
    onError: (err: unknown) => {
      setFormError(err instanceof ApiError ? err.message : 'Could not update meal.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFoodEntry,
    onSuccess: async () => {
      setSuccess('Meal deleted.');
      const totalAfter = (mealsQuery.data?.pagination.total ?? 1) - 1;
      const lastPage = Math.max(1, Math.ceil(totalAfter / PAGE_SIZE));
      if (page > lastPage) {
        setPage(lastPage);
      }
      await invalidateMeals();
    },
    onError: (err: unknown) => {
      setSuccess(null);
      setFormError(err instanceof ApiError ? err.message : 'Could not delete meal.');
    },
  });

  const entries = mealsQuery.data?.data ?? [];
  const pagination = mealsQuery.data?.pagination;
  const isFiltered = Boolean(startDate || endDate || mealType);

  return (
    <section className="page">
      <header className="page-header page-header-row">
        <div>
          <h1>Meals</h1>
          <p className="muted">Log what you ate and when you ate it.</p>
        </div>
        <button
          type="button"
          className="button button-primary"
          onClick={() => {
            setEditor('create');
            setFormError(null);
            setSuccess(null);
          }}
        >
          Add Meal
        </button>
      </header>

      <form className="panel filter-bar" onSubmit={(event) => event.preventDefault()}>
        <label className="field">
          <span className="field-label">Start date</span>
          <input
            type="date"
            value={startDate}
            onChange={(event) => {
              setStartDate(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <label className="field">
          <span className="field-label">End date</span>
          <input
            type="date"
            value={endDate}
            onChange={(event) => {
              setEndDate(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <label className="field">
          <span className="field-label">Meal type</span>
          <select
            value={mealType}
            onChange={(event) => {
              setMealType(event.target.value as MealType | '');
              setPage(1);
            }}
          >
            <option value="">All</option>
            {mealSections.map((section) => (
              <option key={section.type} value={section.type}>
                {section.label}
              </option>
            ))}
          </select>
        </label>
      </form>

      {success ? <Alert tone="success">{success}</Alert> : null}

      {mealsQuery.isPending ? <p className="muted">Loading meals…</p> : null}
      {mealsQuery.isError ? (
        <Alert tone="error">Unable to load meals. Please try again.</Alert>
      ) : null}

      {!mealsQuery.isPending && !mealsQuery.isError && entries.length === 0 ? (
        <div className="empty-panel">
          <p>
            {isFiltered
              ? startDate && endDate && startDate === endDate && !mealType
                ? 'No meals recorded for this day.'
                : 'No meals match these filters.'
              : 'No meals recorded yet.'}
          </p>
          {!isFiltered ? (
            <button
              type="button"
              className="button button-primary"
              onClick={() => {
                setEditor('create');
                setFormError(null);
              }}
            >
              Add your first meal
            </button>
          ) : null}
        </div>
      ) : null}

      {entries.length > 0
        ? mealSections.map((section) => {
            const items = entries.filter((entry) => entry.mealType === section.type);
            if (items.length === 0) {
              return null;
            }
            return (
              <section className="panel" key={section.type}>
                <h2>{section.label}</h2>
                <ul className="meal-list">
                  {items.map((entry) => (
                    <li key={entry.id} className="meal-item">
                      <div>
                        <p className="meal-name">{entry.foodName}</p>
                        <p className="muted small">
                          {entry.quantity} {entry.quantityUnit} ·{' '}
                          {formatConsumedAt(entry.consumedAt)}
                        </p>
                        <p className="muted small">
                          {entry.calories} kcal · P {entry.protein}g · C {entry.carbs}g · F{' '}
                          {entry.fat}g
                        </p>
                        {entry.micronutrients.length > 0 ? (
                          <p className="muted small">
                            {entry.micronutrients
                              .map(
                                (nutrient) =>
                                  `${nutrient.nutrientKey} ${nutrient.amount}${nutrient.unit}`,
                              )
                              .join(' · ')}
                          </p>
                        ) : null}
                      </div>
                      <div className="action-row">
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => {
                            setEditor(entry);
                            setFormError(null);
                            setSuccess(null);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="button button-danger"
                          onClick={() => {
                            if (window.confirm(`Delete ${entry.foodName}?`)) {
                              deleteMutation.mutate(entry.id);
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })
        : null}

      {pagination && pagination.totalPages > 1 ? (
        <div className="pagination-bar">
          <button
            type="button"
            className="button button-secondary"
            disabled={pagination.page <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            Previous
          </button>
          <p className="muted">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} meals
          </p>
          <button
            type="button"
            className="button button-secondary"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </button>
        </div>
      ) : null}

      {editor ? (
        <div className="modal-backdrop">
          <div
            className="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="meal-form-title"
          >
            <h2 id="meal-form-title">{editor === 'create' ? 'Add meal' : 'Edit meal'}</h2>
            <MealForm
              {...(editor === 'create' ? {} : { initial: editor })}
              submitting={createMutation.isPending || updateMutation.isPending}
              error={formError}
              onCancel={() => {
                setEditor(null);
                setFormError(null);
              }}
              onSubmit={(payload) => {
                if (editor === 'create') {
                  createMutation.mutate(payload);
                } else {
                  updateMutation.mutate({ id: editor.id, payload });
                }
              }}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
