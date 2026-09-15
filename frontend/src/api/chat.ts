import { apiRequest } from './client';
import type { ChatHistoryItem, ChatResponse, ConfirmMealResponse, PendingMeal } from './types';

export function toConfirmMealPayload(meal: PendingMeal): PendingMeal {
  const consumed = new Date(meal.consumedAt);
  return {
    mealType: meal.mealType,
    foodName: meal.foodName.trim(),
    quantity: Number(meal.quantity),
    quantityUnit: meal.quantityUnit.trim(),
    calories: Number(meal.calories),
    protein: Number(meal.protein),
    carbs: Number(meal.carbs),
    fat: Number(meal.fat),
    consumedAt: Number.isNaN(consumed.getTime()) ? new Date().toISOString() : consumed.toISOString(),
    micronutrients: (meal.micronutrients ?? []).map((nutrient) => ({
      nutrientKey: nutrient.nutrientKey,
      amount: Number(nutrient.amount),
      unit: nutrient.unit,
    })),
  };
}

export async function sendChat(input: {
  message: string;
  history?: ChatHistoryItem[];
}): Promise<ChatResponse> {
  return apiRequest<ChatResponse>('/api/v1/ai/chat', {
    method: 'POST',
    body: input,
  });
}

export async function confirmChatMeal(meal: PendingMeal): Promise<ConfirmMealResponse> {
  return apiRequest<ConfirmMealResponse>('/api/v1/ai/chat/confirm-meal', {
    method: 'POST',
    body: toConfirmMealPayload(meal),
  });
}
