import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { listFoodItems, logFoodItem } from '../../api/food-items';
import { toUserMessage } from '../../api/errors';
import type { FoodItem, MealType } from '../../api/types';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '../../lib/dates';
import { Alert } from '../ui/Alert';
import { FormField } from '../ui/FormField';
import { SelectField } from '../ui/SelectField';
import { FoodThumb } from './FoodThumb';
import { unusualQuantityWarning } from '../../lib/quantity-warning';

const mealTabs: Array<{ value: MealType | ''; label: string }> = [
  { value: '', label: 'All' },
  { value: 'BREAKFAST', label: 'Breakfast' },
  { value: 'LUNCH', label: 'Lunch' },
  { value: 'DINNER', label: 'Dinner' },
  { value: 'SNACKS', label: 'Snacks' },
];

const mealLabels: Record<MealType, string> = {
  BREAKFAST: 'breakfast',
  LUNCH: 'lunch',
  DINNER: 'dinner',
  SNACKS: 'snacks',
};

const CATALOG_PAGE_SIZE = 8;

function scaleFromServing(
  perServing: number,
  quantity: number,
  servingSize: number,
): number {
  if (servingSize <= 0) return 0;
  return Math.round(((perServing * quantity) / servingSize) * 10) / 10;
}

function defaultMealType(item: FoodItem, selectedTab: MealType | ''): MealType {
  if (selectedTab) return selectedTab;
  return item.mealTypes[0] ?? 'BREAKFAST';
}

export function FoodCatalog({ onLogged }: { onLogged: () => Promise<void> | void }) {
  const [mealType, setMealType] = useState<MealType | ''>('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [logMealType, setLogMealType] = useState<MealType>('BREAKFAST');
  const [consumedAt, setConsumedAt] = useState(() => toDateTimeLocalValue(new Date().toISOString()));
  const [error, setError] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      page: 1,
      pageSize: CATALOG_PAGE_SIZE,
      ...(mealType ? { mealType } : {}),
      ...(search.trim() ? { q: search.trim() } : {}),
    }),
    [mealType, search],
  );

  const catalogQuery = useQuery({
    queryKey: ['food-items', filters],
    queryFn: () => listFoodItems(filters),
  });

  const logMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof logFoodItem>[1] }) =>
      logFoodItem(id, payload),
    onSuccess: async () => {
      setSelected(null);
      setError(null);
      await onLogged();
    },
    onError: (err: unknown) => {
      setError(toUserMessage(err, 'Could not add food.'));
    },
  });

  const items = catalogQuery.data?.data ?? [];
  const quantityValue = Number(quantity);
  const preview =
    selected && Number.isFinite(quantityValue) && quantityValue > 0
      ? {
          calories: scaleFromServing(selected.calories, quantityValue, selected.servingSize),
          protein: scaleFromServing(selected.protein, quantityValue, selected.servingSize),
          carbs: scaleFromServing(selected.carbs, quantityValue, selected.servingSize),
          fat: scaleFromServing(selected.fat, quantityValue, selected.servingSize),
        }
      : null;

  function openItem(item: FoodItem) {
    setSelected(item);
    setQuantity(String(item.servingSize));
    setLogMealType(defaultMealType(item, mealType));
    setConsumedAt(toDateTimeLocalValue(new Date().toISOString()));
    setError(null);
  }

  function closeSelected() {
    setSelected(null);
    setError(null);
  }

  useEffect(() => {
    if (!selected) return undefined;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !logMutation.isPending) {
        closeSelected();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selected, logMutation.isPending]);

  function submitSelected() {
    if (!selected) return;
    if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
      setError('Quantity must be greater than 0.');
      return;
    }
    const eatenAt = fromDateTimeLocalValue(consumedAt);
    if (!consumedAt || Number.isNaN(new Date(eatenAt).getTime())) {
      setError('When you ate this is required.');
      return;
    }
    logMutation.mutate({
      id: selected.id,
      payload: {
        quantity: quantityValue,
        mealType: logMealType,
        consumedAt: eatenAt,
      },
    });
  }

  return (
    <section className="catalog-panel">
      <h2>Quick add common foods</h2>

      <div className="catalog-tabs" role="tablist" aria-label="Catalog meal">
        {mealTabs.map((tab) => (
          <button
            key={tab.label}
            type="button"
            role="tab"
            aria-selected={mealType === tab.value}
            className={`catalog-tab ${mealType === tab.value ? 'is-active' : ''}`}
            onClick={() => setMealType(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <label>
        <span className="sr-only">Search food</span>
        <input
          className="search"
          type="text"
          value={search}
          placeholder="Search foods, e.g. mutton biryani"
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>

      {catalogQuery.isPending ? <p className="muted">Loading foods…</p> : null}
      {catalogQuery.isError ? (
        <Alert tone="error">Unable to load the food catalog. Please try again.</Alert>
      ) : null}

      {!catalogQuery.isPending && !catalogQuery.isError && items.length === 0 ? (
        <p className="muted">No matching foods.</p>
      ) : null}

      {items.length > 0 ? (
        <>
          <div className="food-grid">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="food-card"
                onClick={() => openItem(item)}
              >
                <FoodThumb name={item.name} imageUrl={item.imageUrl} />
                <div className="body">
                  <div className="title">{item.name}</div>
                  <div className="meta">
                    {item.servingSize} {item.servingUnit} · <b>{item.calories} kcal</b>
                  </div>
                </div>
              </button>
            ))}
          </div>
          {!search.trim() ? (
            <p className="muted small catalog-hint">
              Showing {items.length} foods. Search to find dishes like mutton biryani.
            </p>
          ) : null}
        </>
      ) : null}

      {selected ? (
        <div className="modal-backdrop">
          <div
            className="modal-panel catalog-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="catalog-food-title"
          >
            <div className="modal-head">
              <div>
                <h2 id="catalog-food-title">{selected.name}</h2>
                <p className="muted small">
                  Per {selected.servingSize} {selected.servingUnit}
                </p>
              </div>
              <button
                type="button"
                className="modal-close"
                aria-label="Close"
                onClick={closeSelected}
                disabled={logMutation.isPending}
              >
                <X size={16} />
              </button>
            </div>
            <ul className="catalog-macros">
              <li>{selected.calories} kcal</li>
              <li>Protein {selected.protein}g</li>
              <li>Carbs {selected.carbs}g</li>
              <li>Fat {selected.fat}g</li>
            </ul>

            <FormField label="Quantity" htmlFor="catalog-quantity">
              <div className="qty-unit">
                <input
                  id="catalog-quantity"
                  aria-label="Quantity"
                  type="number"
                  min="0.1"
                  step="any"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                />
                <span className="unit-suffix">{selected.servingUnit}</span>
              </div>
              {unusualQuantityWarning(quantityValue, selected.servingUnit) ? (
                <p className="field-hint warn" role="status">
                  {unusualQuantityWarning(quantityValue, selected.servingUnit)}
                </p>
              ) : null}
            </FormField>

            <SelectField
              id="catalog-meal-type"
              label="Add to meal"
              value={logMealType}
              onChange={setLogMealType}
              options={mealTabs
                .filter((tab): tab is { value: MealType; label: string } => Boolean(tab.value))
                .map((tab) => ({ value: tab.value, label: tab.label }))}
            />

            <FormField label="When you ate this" htmlFor="catalog-consumed-at">
              <input
                id="catalog-consumed-at"
                type="datetime-local"
                value={consumedAt}
                onChange={(event) => setConsumedAt(event.target.value)}
              />
            </FormField>

            {preview ? (
              <div className="meal-live">
                <p className="catalog-total">Total: {preview.calories} kcal</p>
                <div className="meal-live-grid">
                  <span>P {preview.protein}g</span>
                  <span>C {preview.carbs}g</span>
                  <span>F {preview.fat}g</span>
                </div>
              </div>
            ) : (
              <p className="muted small">Enter a quantity greater than 0 to see totals.</p>
            )}

            {error ? <Alert tone="error">{error}</Alert> : null}

            <div className="action-row">
              <button
                type="button"
                className="button button-secondary"
                onClick={closeSelected}
                disabled={logMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={submitSelected}
                disabled={logMutation.isPending}
              >
                {logMutation.isPending ? 'Adding…' : `Add to ${mealLabels[logMealType]}`}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
