import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { FoodEntry, FoodEntryWritePayload, MealType, Micronutrient } from '../../api/types';
import { FormField } from '../layout/AppShell';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '../../lib/dates';
import { formatAmount, scaleMacrosFromBase, scaleNutrition, type NutritionBase } from '../../lib/nutrition';

const mealTypes: Array<{ value: MealType; label: string }> = [
  { value: 'BREAKFAST', label: 'Breakfast' },
  { value: 'LUNCH', label: 'Lunch' },
  { value: 'DINNER', label: 'Dinner' },
  { value: 'SNACKS', label: 'Snacks' },
];

type NutrientRow = { nutrientKey: string; amount: string; unit: string };

type FormState = {
  mealType: MealType;
  foodName: string;
  quantity: string;
  quantityUnit: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  consumedAt: string;
  nutrients: NutrientRow[];
};

type MacroKey = 'calories' | 'protein' | 'carbs' | 'fat';

function emptyForm(entry?: FoodEntry): FormState {
  return {
    mealType: entry?.mealType ?? 'LUNCH',
    foodName: entry?.foodName ?? '',
    quantity: entry ? String(entry.quantity) : '1',
    quantityUnit: entry?.quantityUnit ?? 'serving',
    calories: entry ? String(entry.calories) : '',
    protein: entry ? String(entry.protein) : '',
    carbs: entry ? String(entry.carbs) : '',
    fat: entry ? String(entry.fat) : '',
    consumedAt: entry
      ? toDateTimeLocalValue(entry.consumedAt)
      : toDateTimeLocalValue(new Date().toISOString()),
    nutrients:
      entry?.micronutrients.map((nutrient) => ({
        nutrientKey: nutrient.nutrientKey,
        amount: String(nutrient.amount),
        unit: nutrient.unit,
      })) ?? [],
  };
}

function parseNumber(value: string): number {
  return Number(value);
}

function parseOptionalNumber(value: string): number | null {
  if (value.trim() === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function snapshotFromForm(form: FormState): NutritionBase | null {
  const quantity = parseOptionalNumber(form.quantity);
  const calories = parseOptionalNumber(form.calories);
  const protein = parseOptionalNumber(form.protein);
  const carbs = parseOptionalNumber(form.carbs);
  const fat = parseOptionalNumber(form.fat);
  if (quantity == null || quantity <= 0) {
    return null;
  }
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

function draftFromForm(form: FormState): FoodEntryWritePayload {
  return {
    mealType: form.mealType,
    foodName: form.foodName.trim(),
    quantity: parseOptionalNumber(form.quantity) ?? 0,
    quantityUnit: form.quantityUnit.trim(),
    calories: parseOptionalNumber(form.calories) ?? 0,
    protein: parseOptionalNumber(form.protein) ?? 0,
    carbs: parseOptionalNumber(form.carbs) ?? 0,
    fat: parseOptionalNumber(form.fat) ?? 0,
    consumedAt: form.consumedAt ? fromDateTimeLocalValue(form.consumedAt) : new Date().toISOString(),
    micronutrients: form.nutrients
      .filter((row) => row.nutrientKey.trim())
      .map((row) => ({
        nutrientKey: row.nutrientKey.trim(),
        amount: parseOptionalNumber(row.amount) ?? 0,
        unit: row.unit.trim() || 'mg',
      })),
  };
}

function scaleNutrientRows(rows: NutrientRow[], quantity: number, baseQuantity: number): NutrientRow[] {
  return rows.map((row) => {
    const amount = parseOptionalNumber(row.amount);
    if (amount == null) {
      return row;
    }
    return { ...row, amount: formatAmount(scaleNutrition(amount, quantity, baseQuantity)) };
  });
}

export function MealForm({
  initial,
  submitting,
  error,
  submitLabel,
  onSubmit,
  onCancel,
  onDraftChange,
}: {
  initial?: FoodEntry;
  submitting: boolean;
  error: string | null;
  submitLabel?: string;
  onSubmit: (payload: FoodEntryWritePayload) => void;
  onCancel: () => void;
  onDraftChange?: (payload: FoodEntryWritePayload) => void;
}) {
  const [form, setForm] = useState<FormState>(() => emptyForm(initial));
  const [showMicros, setShowMicros] = useState((initial?.micronutrients.length ?? 0) > 0);
  const [localError, setLocalError] = useState<string | null>(null);
  const baseRef = useRef<NutritionBase | null>(snapshotFromForm(emptyForm(initial)));
  const nutrientBaseRef = useRef<NutrientRow[]>(emptyForm(initial).nutrients);

  useEffect(() => {
    onDraftChange?.(draftFromForm(form));
  }, [form, onDraftChange]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleQuantityChange(value: string) {
    setForm((prev) => {
      const next = { ...prev, quantity: value };
      const quantity = Number(value);
      const base = baseRef.current;
      if (!base || !Number.isFinite(quantity) || quantity <= 0) {
        return next;
      }
      const scaled = scaleMacrosFromBase(base, quantity);
      next.calories = formatAmount(scaled.calories);
      next.protein = formatAmount(scaled.protein);
      next.carbs = formatAmount(scaled.carbs);
      next.fat = formatAmount(scaled.fat);
      next.nutrients = scaleNutrientRows(nutrientBaseRef.current, quantity, base.quantity);
      return next;
    });
  }

  function handleMacroChange(key: MacroKey, value: string) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      const snapshot = snapshotFromForm(next);
      if (snapshot) {
        baseRef.current = snapshot;
        nutrientBaseRef.current = next.nutrients;
      }
      return next;
    });
  }

  function updateNutrient(index: number, patch: Partial<NutrientRow>) {
    setForm((prev) => {
      const next = {
        ...prev,
        nutrients: prev.nutrients.map((row, i) => (i === index ? { ...row, ...patch } : row)),
      };
      const snapshot = snapshotFromForm(next);
      if (snapshot) {
        baseRef.current = snapshot;
        nutrientBaseRef.current = next.nutrients;
      }
      return next;
    });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);

    const quantity = parseNumber(form.quantity);
    const calories = parseNumber(form.calories);
    const protein = parseNumber(form.protein);
    const carbs = parseNumber(form.carbs);
    const fat = parseNumber(form.fat);

    if (!form.foodName.trim()) {
      setLocalError('Food name is required.');
      return;
    }
    if (!(quantity > 0) || !form.quantityUnit.trim()) {
      setLocalError('Quantity must be greater than 0 and include a unit.');
      return;
    }
    if ([calories, protein, carbs, fat].some((value) => Number.isNaN(value) || value < 0)) {
      setLocalError('Calories and macros must be valid numbers that are 0 or greater.');
      return;
    }
    if (!form.consumedAt) {
      setLocalError('Consumed at is required.');
      return;
    }

    const micronutrients: Micronutrient[] = [];
    for (const row of form.nutrients) {
      if (!row.nutrientKey.trim()) {
        continue;
      }
      const amount = parseNumber(row.amount);
      if (Number.isNaN(amount) || amount < 0 || !row.unit.trim()) {
        setLocalError('Micronutrients need a name, non-negative amount, and unit.');
        return;
      }
      micronutrients.push({
        nutrientKey: row.nutrientKey.trim(),
        amount,
        unit: row.unit.trim(),
      });
    }

    onSubmit({
      mealType: form.mealType,
      foodName: form.foodName.trim(),
      quantity,
      quantityUnit: form.quantityUnit.trim(),
      calories,
      protein,
      carbs,
      fat,
      consumedAt: fromDateTimeLocalValue(form.consumedAt),
      micronutrients,
    });
  }

  const liveCalories = Number(form.calories);
  const liveProtein = Number(form.protein);
  const liveCarbs = Number(form.carbs);
  const liveFat = Number(form.fat);

  return (
    <form className="stack-form meal-form-layout" onSubmit={handleSubmit} noValidate>
      <aside className="meal-live" aria-live="polite">
        <p className="eyebrow">This meal</p>
        <p className="hero-stat">
          {Number.isFinite(liveCalories) && liveCalories >= 0 ? liveCalories : 0}
          <span className="unit">kcal</span>
        </p>
        <div className="meal-live-grid">
          <span>Protein {Number.isFinite(liveProtein) ? liveProtein : 0}g</span>
          <span>Carbs {Number.isFinite(liveCarbs) ? liveCarbs : 0}g</span>
          <span>Fat {Number.isFinite(liveFat) ? liveFat : 0}g</span>
        </div>
      </aside>

      {(localError || error) && (
        <p className="error-text" role="alert">
          {localError ?? error}
        </p>
      )}

      <FormField label="Meal" htmlFor="meal-type">
        <select
          id="meal-type"
          value={form.mealType}
          onChange={(event) => update('mealType', event.target.value as MealType)}
        >
          {mealTypes.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FormField>

      <div className="field-row">
        <FormField label="Food" htmlFor="meal-food">
          <input
            id="meal-food"
            value={form.foodName}
            onChange={(event) => update('foodName', event.target.value)}
            required
          />
        </FormField>
        <div className="qty-unit">
          <FormField label="Quantity" htmlFor="meal-quantity">
            <input
              id="meal-quantity"
              type="number"
              min={0.01}
              step="any"
              value={form.quantity}
              onChange={(event) => handleQuantityChange(event.target.value)}
              required
            />
          </FormField>
          <FormField label="Unit" htmlFor="meal-unit">
            <input
              id="meal-unit"
              value={form.quantityUnit}
              onChange={(event) => update('quantityUnit', event.target.value)}
              required
            />
          </FormField>
        </div>
      </div>

      <div className="field-row four">
        <FormField label="Calories (kcal)" htmlFor="meal-calories">
          <input
            id="meal-calories"
            type="number"
            min={0}
            step="any"
            value={form.calories}
            onChange={(event) => handleMacroChange('calories', event.target.value)}
            required
          />
        </FormField>
        <FormField label="Protein (g)" htmlFor="meal-protein">
          <input
            id="meal-protein"
            type="number"
            min={0}
            step="any"
            value={form.protein}
            onChange={(event) => handleMacroChange('protein', event.target.value)}
            required
          />
        </FormField>
        <FormField label="Carbs (g)" htmlFor="meal-carbs">
          <input
            id="meal-carbs"
            type="number"
            min={0}
            step="any"
            value={form.carbs}
            onChange={(event) => handleMacroChange('carbs', event.target.value)}
            required
          />
        </FormField>
        <FormField label="Fat (g)" htmlFor="meal-fat">
          <input
            id="meal-fat"
            type="number"
            min={0}
            step="any"
            value={form.fat}
            onChange={(event) => handleMacroChange('fat', event.target.value)}
            required
          />
        </FormField>
      </div>

      <FormField label="Consumed at" htmlFor="meal-consumed-at">
        <input
          id="meal-consumed-at"
          type="datetime-local"
          value={form.consumedAt}
          onChange={(event) => update('consumedAt', event.target.value)}
          required
        />
      </FormField>

      <button
        type="button"
        className="button button-ghost"
        onClick={() => setShowMicros((open) => !open)}
      >
        {showMicros ? 'Hide micronutrients' : 'Add micronutrients'}
      </button>

      {showMicros ? (
        <div className="micro-editor">
          {form.nutrients.map((row, index) => (
            <div className="field-row three" key={index}>
              <FormField label="Nutrient" htmlFor={`micro-key-${index}`}>
                <input
                  id={`micro-key-${index}`}
                  value={row.nutrientKey}
                  placeholder="iron"
                  onChange={(event) => updateNutrient(index, { nutrientKey: event.target.value })}
                />
              </FormField>
              <FormField label="Amount" htmlFor={`micro-amount-${index}`}>
                <input
                  id={`micro-amount-${index}`}
                  type="number"
                  min={0}
                  step="any"
                  value={row.amount}
                  onChange={(event) => updateNutrient(index, { amount: event.target.value })}
                />
              </FormField>
              <FormField label="Unit" htmlFor={`micro-unit-${index}`}>
                <input
                  id={`micro-unit-${index}`}
                  value={row.unit}
                  placeholder="mg"
                  onChange={(event) => updateNutrient(index, { unit: event.target.value })}
                />
              </FormField>
            </div>
          ))}
          <button
            type="button"
            className="button button-secondary"
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                nutrients: [...prev.nutrients, { nutrientKey: '', amount: '', unit: 'mg' }],
              }))
            }
          >
            Add nutrient
          </button>
        </div>
      ) : null}

      <div className="action-row">
        <button className="button button-primary" type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : (submitLabel ?? (initial ? 'Save changes' : 'Save meal'))}
        </button>
        <button type="button" className="button button-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
