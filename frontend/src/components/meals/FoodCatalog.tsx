import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { listFoodItems, logFoodItem } from '../../api/food-items';
import { ApiError, type FoodItem, type MealType } from '../../api/types';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '../../lib/dates';
import { Alert, FormField } from '../layout/AppShell';

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

const nameEmoji: Record<string, string> = {
  oats: '🥣',
  banana: '🍌',
  eggs: '🥚',
  idli: '⚪',
  toast: '🍞',
  'greek yogurt': '🥛',
  apple: '🍎',
  'white rice': '🍚',
  chapati: '🫓',
  'chicken breast': '🍗',
  paneer: '🧀',
  salmon: '🐟',
  'mixed salad': '🥗',
  almonds: '🥜',
  milk: '🥛',
};

const categoryEmoji: Record<string, string> = {
  grain: '🥣',
  fruit: '🍌',
  protein: '🥚',
  dairy: '🥛',
  vegetable: '🥗',
  nuts: '🥜',
};

function catalogEmoji(item: FoodItem): string {
  return nameEmoji[item.name.toLowerCase()] ?? categoryEmoji[item.category ?? ''] ?? '🍽️';
}

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
  const [mealType, setMealType] = useState<MealType | ''>('BREAKFAST');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [logMealType, setLogMealType] = useState<MealType>('BREAKFAST');
  const [consumedAt, setConsumedAt] = useState(() => toDateTimeLocalValue(new Date().toISOString()));
  const [error, setError] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      page: 1,
      pageSize: 50,
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
      setError(err instanceof ApiError ? err.message : 'Could not add food.');
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
    <section className="panel catalog-panel">
      <h2>Add from catalog</h2>
      <p className="muted small">Choose a food, enter how much you ate, and nutrition is calculated for you.</p>

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

      <label className="field catalog-search">
        <span className="field-label">Search food</span>
        <input
          type="search"
          value={search}
          placeholder="Search food..."
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
        <div className="catalog-grid">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="catalog-card"
              onClick={() => openItem(item)}
            >
              <span className="catalog-emoji" aria-hidden="true">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt="" className="catalog-thumb" />
                ) : (
                  catalogEmoji(item)
                )}
              </span>
              <span className="catalog-card-name">{item.name}</span>
              <span className="muted small">
                {item.calories} kcal / {item.servingSize} {item.servingUnit}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {selected ? (
        <div className="modal-backdrop">
          <div
            className="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="catalog-food-title"
          >
            <h2 id="catalog-food-title">{selected.name}</h2>
            <p className="muted small">
              Per {selected.servingSize} {selected.servingUnit}
            </p>
            <ul className="catalog-macros">
              <li>{selected.calories} kcal</li>
              <li>Protein {selected.protein}g</li>
              <li>Carbs {selected.carbs}g</li>
              <li>Fat {selected.fat}g</li>
            </ul>

            <FormField label="Quantity" htmlFor="catalog-quantity">
              <input
                id="catalog-quantity"
                type="number"
                min="0.1"
                step="any"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </FormField>
            <p className="muted small">Unit: {selected.servingUnit}</p>

            <FormField label="Add to meal" htmlFor="catalog-meal-type">
              <select
                id="catalog-meal-type"
                value={logMealType}
                onChange={(event) => setLogMealType(event.target.value as MealType)}
              >
                {mealTabs
                  .filter((tab) => tab.value)
                  .map((tab) => (
                    <option key={tab.value} value={tab.value}>
                      {tab.label}
                    </option>
                  ))}
              </select>
            </FormField>

            <FormField label="When you ate this" htmlFor="catalog-consumed-at">
              <input
                id="catalog-consumed-at"
                type="datetime-local"
                value={consumedAt}
                onChange={(event) => setConsumedAt(event.target.value)}
              />
            </FormField>

            {preview ? (
              <p className="catalog-total">
                Total: {preview.calories} kcal · P {preview.protein}g · C {preview.carbs}g · F{' '}
                {preview.fat}g
              </p>
            ) : (
              <p className="muted small">Enter a quantity greater than 0 to see totals.</p>
            )}

            {error ? <Alert tone="error">{error}</Alert> : null}

            <div className="action-row">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => {
                  setSelected(null);
                  setError(null);
                }}
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
