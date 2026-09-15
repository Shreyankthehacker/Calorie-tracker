import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Minus, Plus, Search, X } from 'lucide-react';
import { createFoodEntry, listRecentFoods } from '../../api/food-entries';
import { listFoodItems, logFoodItem } from '../../api/food-items';
import { ApiError, type FoodItem, type MealType, type RecentFood } from '../../api/types';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '../../lib/dates';
import { MEAL_LABELS, MEAL_SECTIONS, scaleNutrition } from '../../lib/nutrition';
import { unusualQuantityWarning } from '../../lib/quantity-warning';
import { FoodThumb } from './FoodThumb';

type Selected =
  | { kind: 'catalog'; item: FoodItem }
  | { kind: 'recent'; item: RecentFood };

function defaultMealType(selected: Selected, fallback: MealType): MealType {
  if (selected.kind === 'catalog') {
    return selected.item.mealTypes[0] ?? fallback;
  }
  return selected.item.mealType;
}

export function FoodLogger({
  onClose,
  onLogged,
}: {
  onClose: () => void;
  onLogged: () => Promise<void> | void;
}) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [selected, setSelected] = useState<Selected | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [mealType, setMealType] = useState<MealType>('BREAKFAST');
  const [consumedAt, setConsumedAt] = useState(() => toDateTimeLocalValue(new Date().toISOString()));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 200);
    return () => window.clearTimeout(timer);
  }, [search]);

  const recentsQuery = useQuery({
    queryKey: ['food-entries', 'recents'],
    queryFn: () => listRecentFoods(12),
  });

  const catalogQuery = useQuery({
    queryKey: ['food-items', 'logger', debounced],
    queryFn: () =>
      listFoodItems({
        page: 1,
        pageSize: 20,
        ...(debounced ? { q: debounced } : {}),
      }),
  });

  const logMutation = useMutation({
    mutationFn: async () => {
      if (!selected) {
        throw new Error('Choose a food first.');
      }
      const quantityValue = Number(quantity);
      if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
        throw new Error('Quantity must be greater than 0.');
      }
      const eatenAt = fromDateTimeLocalValue(consumedAt);
      if (!consumedAt || Number.isNaN(new Date(eatenAt).getTime())) {
        throw new Error('When you ate this is required.');
      }
      if (selected.kind === 'catalog') {
        return logFoodItem(selected.item.id, {
          quantity: quantityValue,
          mealType,
          consumedAt: eatenAt,
        });
      }
      const base = selected.item;
      return createFoodEntry({
        mealType,
        foodName: base.foodName,
        quantity: quantityValue,
        quantityUnit: base.quantityUnit,
        calories: scaleNutrition(base.calories, quantityValue, base.quantity),
        protein: scaleNutrition(base.protein, quantityValue, base.quantity),
        carbs: scaleNutrition(base.carbs, quantityValue, base.quantity),
        fat: scaleNutrition(base.fat, quantityValue, base.quantity),
        consumedAt: eatenAt,
        micronutrients: base.micronutrients.map((nutrient) => ({
          ...nutrient,
          amount: scaleNutrition(nutrient.amount, quantityValue, base.quantity),
        })),
      });
    },
    onSuccess: async () => {
      setError(null);
      await onLogged();
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Could not add food.');
    },
  });

  const catalogItems = catalogQuery.data?.data ?? [];
  const recents = recentsQuery.data?.data ?? [];
  const quantityValue = Number(quantity);
  const preview = useMemo(() => {
    if (!selected || !Number.isFinite(quantityValue) || quantityValue <= 0) {
      return null;
    }
    if (selected.kind === 'catalog') {
      return {
        name: selected.item.name,
        unit: selected.item.servingUnit,
        calories: scaleNutrition(selected.item.calories, quantityValue, selected.item.servingSize),
        protein: scaleNutrition(selected.item.protein, quantityValue, selected.item.servingSize),
        carbs: scaleNutrition(selected.item.carbs, quantityValue, selected.item.servingSize),
        fat: scaleNutrition(selected.item.fat, quantityValue, selected.item.servingSize),
      };
    }
    return {
      name: selected.item.foodName,
      unit: selected.item.quantityUnit,
      calories: scaleNutrition(selected.item.calories, quantityValue, selected.item.quantity),
      protein: scaleNutrition(selected.item.protein, quantityValue, selected.item.quantity),
      carbs: scaleNutrition(selected.item.carbs, quantityValue, selected.item.quantity),
      fat: scaleNutrition(selected.item.fat, quantityValue, selected.item.quantity),
    };
  }, [quantityValue, selected]);

  function chooseCatalog(item: FoodItem) {
    setSelected({ kind: 'catalog', item });
    setQuantity(String(item.servingSize));
    setMealType(defaultMealType({ kind: 'catalog', item }, mealType));
    setError(null);
  }

  function chooseRecent(item: RecentFood) {
    setSelected({ kind: 'recent', item });
    setQuantity(String(item.quantity));
    setMealType(item.mealType);
    setError(null);
  }

  function bumpQuantity(delta: number) {
    const next = (Number.isFinite(quantityValue) ? quantityValue : 0) + delta;
    setQuantity(String(Math.max(0.1, roundToStep(next))));
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-panel food-logger" role="dialog" aria-modal="true" aria-labelledby="food-logger-title">
        <header className="food-logger-head">
          <div>
            <h2 id="food-logger-title">Log food</h2>
            <p className="muted small">Search the catalog or repeat something you already logged.</p>
          </div>
          <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <label className="field food-logger-search">
          <span className="field-label">Search</span>
          <span className="input-with-icon">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={search}
              placeholder="Search food"
              onChange={(event) => setSearch(event.target.value)}
              autoFocus
            />
          </span>
        </label>

        {catalogQuery.isError ? (
          <p className="error-text" role="alert">
            Unable to load the food catalog. Please try again.
          </p>
        ) : null}

        {debounced ? (
          <section>
            <h3 className="food-logger-section">Catalog</h3>
            {catalogQuery.isPending ? <p className="muted">Loading foods…</p> : null}
            {!catalogQuery.isPending && catalogItems.length === 0 ? (
              <p className="muted">No matching foods.</p>
            ) : (
              <ul className="food-logger-list">
                {catalogItems.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`food-logger-row ${selected?.kind === 'catalog' && selected.item.id === item.id ? 'is-selected' : ''}`}
                      onClick={() => chooseCatalog(item)}
                    >
                      <FoodThumb name={item.name} imageUrl={item.imageUrl} />
                      <span>
                        <strong>{item.name}</strong>
                        <span className="muted small">
                          {item.calories} kcal / {item.servingSize} {item.servingUnit}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <section>
            <h3 className="food-logger-section">Recent</h3>
            {recentsQuery.isPending ? <p className="muted">Loading meals…</p> : null}
            {recentsQuery.isError ? (
              <p className="error-text">Unable to load recent foods.</p>
            ) : null}
            {!recentsQuery.isPending && !recentsQuery.isError && recents.length === 0 ? (
              <p className="muted">No foods logged yet. Search the catalog to add your first meal.</p>
            ) : (
              <ul className="food-logger-list">
                {recents.map((item) => (
                  <li key={`${item.foodName}-${item.lastConsumedAt}`}>
                    <button
                      type="button"
                      className={`food-logger-row ${selected?.kind === 'recent' && selected.item.foodName === item.foodName ? 'is-selected' : ''}`}
                      onClick={() => chooseRecent(item)}
                    >
                      <FoodThumb name={item.foodName} />
                      <span>
                        <strong>{item.foodName}</strong>
                        <span className="muted small">
                          Last {item.quantity} {item.quantityUnit}, {item.calories} kcal
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {selected && preview ? (
          <section className="food-logger-editor">
            <h3>{preview.name}</h3>
            <div className="quantity-stepper">
              <button type="button" className="icon-button" aria-label="Decrease quantity" onClick={() => bumpQuantity(-1)}>
                <Minus size={16} />
              </button>
              <input
                aria-label="Quantity"
                type="number"
                min="0.1"
                step="any"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
              <button type="button" className="icon-button" aria-label="Increase quantity" onClick={() => bumpQuantity(1)}>
                <Plus size={16} />
              </button>
              <span className="unit-suffix">{preview.unit}</span>
            </div>
            {unusualQuantityWarning(quantityValue, preview.unit) ? (
              <p className="field-hint warn" role="status">
                {unusualQuantityWarning(quantityValue, preview.unit)}
              </p>
            ) : null}

            <label className="field">
              <span className="field-label">Meal</span>
              <select
                id="logger-meal-type"
                value={mealType}
                onChange={(event) => setMealType(event.target.value as MealType)}
              >
                {MEAL_SECTIONS.map((section) => (
                  <option key={section.type} value={section.type}>
                    {section.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">When you ate this</span>
              <input
                id="logger-consumed-at"
                type="datetime-local"
                value={consumedAt}
                onChange={(event) => setConsumedAt(event.target.value)}
              />
            </label>
            <div className="meal-live">
              <p className="catalog-total">Total: {preview.calories} kcal</p>
              <div className="meal-live-grid">
                <span>P {preview.protein}g</span>
                <span>C {preview.carbs}g</span>
                <span>F {preview.fat}g</span>
              </div>
            </div>
          </section>
        ) : null}

        {error ? (
          <p className="error-text" role="alert">
            {error}
          </p>
        ) : null}

        <div className="action-row">
          <button type="button" className="button button-ghost" onClick={onClose} disabled={logMutation.isPending}>
            Cancel
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={() => logMutation.mutate()}
            disabled={!selected || logMutation.isPending}
          >
            {logMutation.isPending ? 'Adding…' : `Add to ${MEAL_LABELS[mealType].toLowerCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function roundToStep(value: number): number {
  return Math.round(value * 10) / 10;
}
