import type { FoodEntry, MealType, Micronutrient } from '../api/types';

export function nutritionToDraftEntry(input: {
  foodName: string;
  quantity: number;
  quantityUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  micronutrients?: Micronutrient[];
  mealType?: MealType | null;
}): FoodEntry {
  const now = new Date().toISOString();
  return {
    id: 'draft',
    mealType: input.mealType ?? 'LUNCH',
    foodName: input.foodName,
    quantity: input.quantity,
    quantityUnit: input.quantityUnit,
    calories: input.calories,
    protein: input.protein,
    carbs: input.carbs,
    fat: input.fat,
    consumedAt: now,
    createdAt: now,
    updatedAt: now,
    micronutrients: input.micronutrients ?? [],
  };
}
