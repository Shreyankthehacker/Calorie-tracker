import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  createFoodEntry,
  deleteFoodEntry,
  listFoodEntries,
  updateFoodEntry,
} from '../api/food-entries';
import { ApiError, type FoodEntry, type FoodEntryWritePayload, type MealType } from '../api/types';
import { Alert } from '../components/layout/AppShell';
import { MealForm } from '../components/meals/MealForm';
import { useLogFood } from '../components/meals/LogFoodProvider';
import { DateField } from '../components/ui/DateField';
import { foodPhoto } from '../lib/food-photos';
import { formatConsumedAt } from '../lib/dates';
import { MEAL_LABELS, MEAL_SECTIONS } from '../lib/nutrition';

const PAGE_SIZE = 10;

export function MealsPage() {
  const queryClient = useQueryClient();
  const { openLogFood } = useLogFood();
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [mealType, setMealType] = useState<MealType | ''>('');
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<'create' | FoodEntry | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      setStartDate(dateParam);
      setEndDate(dateParam);
      setPage(1);
    }
  }, [dateParam]);

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
    <div className="page-entries">
      <div className="main-inner">
      <div className="kicker">
        Chronological list view
      </div>
      <h1 className="sr-only">Meals</h1>
      <h1 className="page-title">Intake records &amp; logs</h1>

      <div className="hero">
        <img
          className="slide"
          src="https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=1000&q=80&auto=format&fit=crop"
          alt=""
        />
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
        <div className="hero-content">
          <div className="k">This week</div>
          <div className="t">{pagination?.total ?? 0} meals logged</div>
        </div>
      </div>

      <div className="action-row">
        <button type="button" className="btn-secondary" onClick={openLogFood}>
          Log food
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setEditor('create');
            setFormError(null);
            setSuccess(null);
          }}
        >
          Add custom meal
        </button>
      </div>

      <form className="toolbar" onSubmit={(event) => event.preventDefault()}>
        <DateField
          id="start-date"
          label="Start date"
          value={startDate}
          onChange={(next) => {
            setStartDate(next);
            setPage(1);
          }}
        />
        <DateField
          id="end-date"
          label="End date"
          value={endDate}
          onChange={(next) => {
            setEndDate(next);
            setPage(1);
          }}
        />
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
            {MEAL_SECTIONS.map((section) => (
              <option key={section.type} value={section.type}>
                {section.label}
              </option>
            ))}
          </select>
        </label>
      </form>

      {success ? <Alert tone="success">{success}</Alert> : null}

      {mealsQuery.isPending ? (
        <div className="skeleton-stack" aria-busy="true">
          <p className="muted">Loading meals…</p>
          <div className="skeleton skeleton-lg" />
        </div>
      ) : null}
      {mealsQuery.isError ? (
        <Alert tone="error">Unable to load meals. Please try again.</Alert>
      ) : null}

      {!mealsQuery.isPending && !mealsQuery.isError && entries.length === 0 ? (
        <div className="results">
          <div className="icon">🔎</div>
          <div className="t">
            {isFiltered
              ? startDate && endDate && startDate === endDate && !mealType
                ? 'No meals recorded for this day.'
                : 'No meals match these filters.'
              : 'No meals recorded yet.'}
          </div>
          <div className="s">There are no logged entries matching this view.</div>
          {!isFiltered ? (
            <button
              type="button"
              className="btn-outline"
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

      {entries.length > 0 ? (
        <div className="grid">
          <div>
            <h2>Timeline records</h2>
            {MEAL_SECTIONS.map((section) => {
              const items = entries.filter((entry) => entry.mealType === section.type);
              if (items.length === 0) return null;
              const total = items.reduce((sum, entry) => sum + entry.calories, 0);
              return (
                <div className="day-block" key={section.type}>
                  <div className="day-head">
                    <span>{section.label}</span>
                    <span>{Math.round(total)} kcal total</span>
                  </div>
                  {items.map((entry) => (
                    <div className="entry-row" key={entry.id}>
                      <div className="thumb">
                        <img src={foodPhoto(entry.foodName)} alt="" />
                      </div>
                      <div className="desc">
                        {entry.foodName}
                        <div className="meal-tag">
                          {MEAL_LABELS[entry.mealType]} · {entry.quantity} {entry.quantityUnit} ·{' '}
                          {formatConsumedAt(entry.consumedAt)}
                          {entry.micronutrients.length > 0
                            ? ` · ${entry.micronutrients
                                .map((nutrient) => `${nutrient.nutrientKey} ${nutrient.amount}${nutrient.unit}`)
                                .join(', ')}`
                            : ''}
                        </div>
                      </div>
                      <div className="kcal">{entry.calories} kcal</div>
                      <button
                        type="button"
                        className="btn-secondary"
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
                        className="btn-link"
                        onClick={() => {
                          if (window.confirm(`Delete ${entry.foodName}?`)) {
                            deleteMutation.mutate(entry.id);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

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
            Page {pagination.page} of {pagination.totalPages} / {pagination.total} meals
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
      </div>
    </div>
  );
}
