import type { MealType } from '../api/types';

export const MEAL_SECTIONS: Array<{ type: MealType; label: string }> = [
  { type: 'BREAKFAST', label: 'Breakfast' },
  { type: 'LUNCH', label: 'Lunch' },
  { type: 'DINNER', label: 'Dinner' },
  { type: 'SNACKS', label: 'Snacks' },
];

export const MEAL_LABELS: Record<MealType, string> = {
  BREAKFAST: 'Breakfast',
  LUNCH: 'Lunch',
  DINNER: 'Dinner',
  SNACKS: 'Snacks',
};

export function isMealType(value: unknown): value is MealType {
  return value === 'BREAKFAST' || value === 'LUNCH' || value === 'DINNER' || value === 'SNACKS';
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function scaleNutrition(value: number, quantity: number, baseQuantity: number): number {
  if (baseQuantity <= 0) return 0;
  return round1((value * quantity) / baseQuantity);
}

export type NutritionBase = {
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export function scaleMacrosFromBase(base: NutritionBase, quantity: number): NutritionBase {
  return {
    quantity,
    calories: scaleNutrition(base.calories, quantity, base.quantity),
    protein: scaleNutrition(base.protein, quantity, base.quantity),
    carbs: scaleNutrition(base.carbs, quantity, base.quantity),
    fat: scaleNutrition(base.fat, quantity, base.quantity),
  };
}

export function formatAmount(value: number): string {
  if (Number.isInteger(value) || Math.abs(value - Math.round(value)) < 1e-6) {
    return String(Math.round(value));
  }
  return value.toFixed(1);
}

export function remainingCalories(consumed: number, target: number | null | undefined): number | null {
  if (target == null) return null;
  return round1(target - consumed);
}
