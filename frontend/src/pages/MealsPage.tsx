/**
 * Time-range food-entry list. Filters by start date, end date, and meal type,
 * using the paginated GET /food-entries API.
 */
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  createFoodEntry,
  deleteFoodEntry,
  listFoodEntries,
  updateFoodEntry,
} from '../api/food-entries';
import { toUserMessage } from '../api/errors';
import type { FoodEntry, FoodEntryWritePayload, MealType } from '../api/types';
import { Alert } from '../components/ui/Alert';
import { MealForm } from '../components/meals/MealForm';
import { FoodThumb } from '../components/meals/FoodThumb';
import { useLogFood } from '../components/meals/LogFoodProvider';
import { DateField } from '../components/ui/DateField';
import { SelectField } from '../components/ui/SelectField';
import { useAuth } from '../auth/AuthProvider';
import { calendarDateInTimeZone, formatConsumedAt, formatDateLabel } from '../lib/dates';
import { MEAL_LABELS, MEAL_SECTIONS } from '../lib/nutrition';

const PAGE_SIZE = 10;

export function MealsPage() {
  const { user } = useAuth();
  const timeZone = user?.timezone ?? 'UTC';
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
      setFormError(toUserMessage(err, 'Could not add meal.'));
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
      setFormError(toUserMessage(err, 'Could not update meal.'));
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
      setFormError(toUserMessage(err, 'Could not delete meal.'));
    },
  });

  const entries = [...(mealsQuery.data?.data ?? [])].sort((a, b) =>
    b.consumedAt.localeCompare(a.consumedAt),
  );
  const pagination = mealsQuery.data?.pagination;
  const isFiltered = Boolean(startDate || endDate || mealType);
  const dateGroups = (() => {
    const dates: string[] = [];
    const byDate = new Map<string, FoodEntry[]>();
    for (const entry of entries) {
      const date = calendarDateInTimeZone(new Date(entry.consumedAt), timeZone);
      if (!byDate.has(date)) {
        dates.push(date);
        byDate.set(date, []);
      }
      byDate.get(date)?.push(entry);
    }
    return dates.map((date) => ({
      date,
      meals: MEAL_SECTIONS.map((section) => ({
        ...section,
        items: (byDate.get(date) ?? []).filter((entry) => entry.mealType === section.type),
      })).filter((section) => section.items.length > 0),
    }));
  })();

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
        <button type="button" className="btn-secondary" onClick={() => openLogFood()}>
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
        <SelectField<MealType | ''>
          id="meal-type-filter"
          label="Meal type"
          value={mealType}
          onChange={(next) => {
            setMealType(next);
            setPage(1);
          }}
          options={[
            { value: '', label: 'All' },
            ...MEAL_SECTIONS.map((section) => ({ value: section.type, label: section.label })),
          ]}
        />
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
        <div className="timeline">
            <h2>Timeline records</h2>
            {dateGroups.map((group) => (
              <div className="day-block" key={group.date}>
                <p className="day-head">
                  <strong>{formatDateLabel(group.date)}</strong>
                  {' '}
                  {Math.round(group.meals.reduce((sum, meal) => sum + meal.items.reduce((inner, entry) => inner + entry.calories, 0), 0))} kcal
                </p>
                {group.meals.map((section) => (
                  <div key={`${group.date}-${section.type}`}>
                    <div className="meal-subhead">
                      <span>{section.label}</span>
                      <span>{Math.round(section.items.reduce((sum, entry) => sum + entry.calories, 0))} kcal</span>
                    </div>
                    {section.items.map((entry) => (
                    <div className="entry-row" key={entry.id}>
                      <div className="thumb">
                        <FoodThumb name={entry.foodName} />
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
                ))}
              </div>
            ))}
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
            <div className="modal-head">
              <h2 id="meal-form-title">{editor === 'create' ? 'Add meal' : 'Edit meal'}</h2>
              <button
                type="button"
                className="modal-close"
                aria-label="Close"
                onClick={() => {
                  setEditor(null);
                  setFormError(null);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M2 2l10 10M12 2 2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
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
