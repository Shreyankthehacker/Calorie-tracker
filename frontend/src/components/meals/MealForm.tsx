import { useState, type FormEvent } from 'react';
import type { FoodEntry, FoodEntryWritePayload, MealType, Micronutrient } from '../../api/types';
import { FormField } from '../layout/AppShell';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '../../lib/dates';

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

export function MealForm({
  initial,
  submitting,
  error,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: FoodEntry;
  submitting: boolean;
  error: string | null;
  submitLabel?: string;
  onSubmit: (payload: FoodEntryWritePayload) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => emptyForm(initial));
  const [showMicros, setShowMicros] = useState((initial?.micronutrients.length ?? 0) > 0);
  const [localError, setLocalError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateNutrient(index: number, patch: Partial<NutrientRow>) {
    setForm((prev) => ({
      ...prev,
      nutrients: prev.nutrients.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
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

      <FormField label="Food" htmlFor="meal-food">
        <input
          id="meal-food"
          value={form.foodName}
          onChange={(event) => update('foodName', event.target.value)}
          required
        />
      </FormField>

      <div className="field-row">
        <FormField label="Quantity" htmlFor="meal-quantity">
          <input
            id="meal-quantity"
            type="number"
            min={0.01}
            step="any"
            value={form.quantity}
            onChange={(event) => update('quantity', event.target.value)}
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

      <div className="field-row">
        <FormField label="Calories (kcal)" htmlFor="meal-calories">
          <input
            id="meal-calories"
            type="number"
            min={0}
            step="any"
            value={form.calories}
            onChange={(event) => update('calories', event.target.value)}
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
            onChange={(event) => update('protein', event.target.value)}
            required
          />
        </FormField>
      </div>

      <div className="field-row">
        <FormField label="Carbs (g)" htmlFor="meal-carbs">
          <input
            id="meal-carbs"
            type="number"
            min={0}
            step="any"
            value={form.carbs}
            onChange={(event) => update('carbs', event.target.value)}
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
            onChange={(event) => update('fat', event.target.value)}
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
            <div className="field-row" key={index}>
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
