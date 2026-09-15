/**
 * Review-and-save meal logger. Catalog items scale from a per-serving base;
 * edited macros are saved as a custom FoodEntry snapshot.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Minus, Plus, Search, X } from 'lucide-react';
import { createFoodEntry, listRecentFoods } from '../../api/food-entries';
import { listFoodItems, logFoodItem } from '../../api/food-items';
import { toUserMessage } from '../../api/errors';
import type { FoodItem, MealType, RecentFood } from '../../api/types';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '../../lib/dates';
import {
  formatAmount,
  isMealType,
  MEAL_LABELS,
  MEAL_SECTIONS,
  scaleMacrosFromBase,
  scaleNutrition,
  type NutritionBase,
} from '../../lib/nutrition';
import { unusualQuantityWarning } from '../../lib/quantity-warning';
import { FoodThumb } from './FoodThumb';
import { SelectField } from '../ui/SelectField';

type Selected =
  | { kind: 'catalog'; item: FoodItem }
  | { kind: 'recent'; item: RecentFood };

type MacroKey = 'calories' | 'protein' | 'carbs' | 'fat';

type MacroDraft = Record<MacroKey, string>;

function defaultMealType(selected: Selected, fallback: MealType): MealType {
  if (selected.kind === 'catalog') {
    return selected.item.mealTypes[0] ?? fallback;
  }
  return selected.item.mealType;
}

function parseOptionalNumber(value: string): number | null {
  if (value.trim() === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function nutritionFromSelected(selected: Selected, quantity: number): NutritionBase {
  if (selected.kind === 'catalog') {
    return {
      quantity,
      calories: scaleNutrition(selected.item.calories, quantity, selected.item.servingSize),
      protein: scaleNutrition(selected.item.protein, quantity, selected.item.servingSize),
      carbs: scaleNutrition(selected.item.carbs, quantity, selected.item.servingSize),
      fat: scaleNutrition(selected.item.fat, quantity, selected.item.servingSize),
    };
  }
  return {
    quantity,
    calories: scaleNutrition(selected.item.calories, quantity, selected.item.quantity),
    protein: scaleNutrition(selected.item.protein, quantity, selected.item.quantity),
    carbs: scaleNutrition(selected.item.carbs, quantity, selected.item.quantity),
    fat: scaleNutrition(selected.item.fat, quantity, selected.item.quantity),
  };
}

function draftFromNutrition(nutrition: NutritionBase): MacroDraft {
  return {
    calories: formatAmount(nutrition.calories),
    protein: formatAmount(nutrition.protein),
    carbs: formatAmount(nutrition.carbs),
    fat: formatAmount(nutrition.fat),
  };
}

function snapshotFromDraft(quantity: number, draft: MacroDraft): NutritionBase | null {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return null;
  }
  const calories = parseOptionalNumber(draft.calories);
  const protein = parseOptionalNumber(draft.protein);
  const carbs = parseOptionalNumber(draft.carbs);
  const fat = parseOptionalNumber(draft.fat);
  if ([calories, protein, carbs, fat].some((value) => value == null || value < 0)) {
    return null;
  }
  return {
    quantity,
    calories: calories as number,
    protein: protein as number,
    carbs: carbs as number,
    fat: fat as number,
  };
}

export function FoodLogger({
  initialMealType,
  onClose,
  onLogged,
}: {
  initialMealType?: MealType | undefined;
  onClose: () => void;
  onLogged: () => Promise<void> | void;
}) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [selected, setSelected] = useState<Selected | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [macros, setMacros] = useState<MacroDraft>({ calories: '', protein: '', carbs: '', fat: '' });
  const [macrosTouched, setMacrosTouched] = useState(false);
  const [mealType, setMealType] = useState<MealType>(isMealType(initialMealType) ? initialMealType : 'BREAKFAST');
  const [consumedAt, setConsumedAt] = useState(() => toDateTimeLocalValue(new Date().toISOString()));
  const [error, setError] = useState<string | null>(null);
  const baseRef = useRef<NutritionBase | null>(null);

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
      const calories = parseOptionalNumber(macros.calories);
      const protein = parseOptionalNumber(macros.protein);
      const carbs = parseOptionalNumber(macros.carbs);
      const fat = parseOptionalNumber(macros.fat);
      if ([calories, protein, carbs, fat].some((value) => value == null || value < 0)) {
        throw new Error('Calories and macros must be 0 or greater.');
      }

      const useCatalogScale = selected.kind === 'catalog' && !macrosTouched;
      if (useCatalogScale) {
        return logFoodItem(selected.item.id, {
          quantity: quantityValue,
          mealType,
          consumedAt: eatenAt,
        });
      }

      const foodName = selected.kind === 'catalog' ? selected.item.name : selected.item.foodName;
      const quantityUnit = selected.kind === 'catalog' ? selected.item.servingUnit : selected.item.quantityUnit;
      const micronutrients =
        selected.kind === 'catalog'
          ? selected.item.micronutrients.map((nutrient) => ({
              ...nutrient,
              amount: scaleNutrition(nutrient.amount, quantityValue, selected.item.servingSize),
            }))
          : selected.item.micronutrients.map((nutrient) => ({
              ...nutrient,
              amount: scaleNutrition(nutrient.amount, quantityValue, selected.item.quantity),
            }));

      return createFoodEntry({
        mealType,
        foodName,
        quantity: quantityValue,
        quantityUnit,
        calories: calories as number,
        protein: protein as number,
        carbs: carbs as number,
        fat: fat as number,
        consumedAt: eatenAt,
        micronutrients,
      });
    },
    onSuccess: async () => {
      setError(null);
      await onLogged();
    },
    onError: (err: unknown) => {
      setError(toUserMessage(err, 'Could not add food.'));
    },
  });

  const catalogItems = catalogQuery.data?.data ?? [];
  const recents = recentsQuery.data?.data ?? [];
  const quantityValue = Number(quantity);
  const previewQuantity = Number.isFinite(quantityValue) && quantityValue > 0 ? quantityValue : 0;

  const foodName = useMemo(() => {
    if (!selected) {
      return null;
    }
    return selected.kind === 'catalog' ? selected.item.name : selected.item.foodName;
  }, [selected]);

  const unit = selected
    ? selected.kind === 'catalog'
      ? selected.item.servingUnit
      : selected.item.quantityUnit
    : '';

  function applySelection(next: Selected, nextQuantity: number) {
    const nutrition = nutritionFromSelected(next, nextQuantity);
    baseRef.current = nutrition;
    setSelected(next);
    setQuantity(String(nextQuantity));
    setMacros(draftFromNutrition(nutrition));
    setMacrosTouched(false);
    setError(null);
  }

  function chooseCatalog(item: FoodItem) {
    applySelection({ kind: 'catalog', item }, item.servingSize);
    if (!isMealType(initialMealType)) {
      setMealType(defaultMealType({ kind: 'catalog', item }, mealType));
    }
  }

  function chooseRecent(item: RecentFood) {
    applySelection({ kind: 'recent', item }, item.quantity);
    if (!isMealType(initialMealType)) {
      setMealType(item.mealType);
    }
  }

  function bumpQuantity(delta: number) {
    const next = (Number.isFinite(quantityValue) ? quantityValue : 0) + delta;
    handleQuantityChange(String(Math.max(0.1, roundToStep(next))));
  }

  function handleQuantityChange(value: string) {
    setQuantity(value);
    const nextQuantity = Number(value);
    const base = baseRef.current;
    if (!base || !Number.isFinite(nextQuantity) || nextQuantity <= 0) {
      return;
    }
    setMacros(draftFromNutrition(scaleMacrosFromBase(base, nextQuantity)));
  }

  function handleMacroChange(key: MacroKey, value: string) {
    setMacrosTouched(true);
    setMacros((prev) => {
      const next = { ...prev, [key]: value };
      const snapshot = snapshotFromDraft(Number(quantity), next);
      if (snapshot) {
        baseRef.current = snapshot;
      }
      return next;
    });
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-panel food-logger" role="dialog" aria-modal="true" aria-labelledby="food-logger-title">
        <header className="food-logger-head">
          <div>
            <h2 id="food-logger-title">Log food</h2>
            <p className="muted small">Search the catalog or repeat something you already logged. Numbers can be edited before you save.</p>
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

        {selected && foodName ? (
          <section className="food-logger-editor">
            <h3>{foodName}</h3>
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
                onChange={(event) => handleQuantityChange(event.target.value)}
              />
              <button type="button" className="icon-button" aria-label="Increase quantity" onClick={() => bumpQuantity(1)}>
                <Plus size={16} />
              </button>
              <span className="unit-suffix">{unit}</span>
            </div>
            {unusualQuantityWarning(quantityValue, unit) ? (
              <p className="field-hint warn" role="status">
                {unusualQuantityWarning(quantityValue, unit)}
              </p>
            ) : null}

            <div className="field-row four">
              <label className="field">
                <span className="field-label">Calories</span>
                <input
                  aria-label="Calories"
                  type="number"
                  min="0"
                  step="any"
                  value={macros.calories}
                  onChange={(event) => handleMacroChange('calories', event.target.value)}
                />
              </label>
              <label className="field">
                <span className="field-label">Protein (g)</span>
                <input
                  aria-label="Protein"
                  type="number"
                  min="0"
                  step="any"
                  value={macros.protein}
                  onChange={(event) => handleMacroChange('protein', event.target.value)}
                />
              </label>
              <label className="field">
                <span className="field-label">Carbs (g)</span>
                <input
                  aria-label="Carbs"
                  type="number"
                  min="0"
                  step="any"
                  value={macros.carbs}
                  onChange={(event) => handleMacroChange('carbs', event.target.value)}
                />
              </label>
              <label className="field">
                <span className="field-label">Fat (g)</span>
                <input
                  aria-label="Fat"
                  type="number"
                  min="0"
                  step="any"
                  value={macros.fat}
                  onChange={(event) => handleMacroChange('fat', event.target.value)}
                />
              </label>
            </div>

            <SelectField
              id="logger-meal-type"
              label="Meal"
              value={mealType}
              onChange={setMealType}
              options={MEAL_SECTIONS.map((section) => ({ value: section.type, label: section.label }))}
            />
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
              <p className="catalog-total">Total: {macros.calories || 0} kcal</p>
              <div className="meal-live-grid">
                <span>P {macros.protein || 0}g</span>
                <span>C {macros.carbs || 0}g</span>
                <span>F {macros.fat || 0}g</span>
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
            disabled={!selected || previewQuantity <= 0 || logMutation.isPending}
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
