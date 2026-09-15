import { describe, expect, it } from 'vitest';
import { toConfirmMealPayload } from './chat';
import type { PendingMeal } from './types';

const meal: PendingMeal = {
  mealType: 'DINNER',
  foodName: '  chole bhature  ',
  quantity: 1,
  quantityUnit: 'plate',
  calories: 600,
  protein: 20,
  carbs: 70,
  fat: 30,
  consumedAt: '2026-09-15T14:30:00.000Z',
  micronutrients: [{ nutrientKey: 'fiber', amount: 8, unit: 'g' }],
};

describe('toConfirmMealPayload', () => {
  it('sends only the fields the confirm-meal API accepts', () => {
    expect(toConfirmMealPayload(meal)).toEqual({
      mealType: 'DINNER',
      foodName: 'chole bhature',
      quantity: 1,
      quantityUnit: 'plate',
      calories: 600,
      protein: 20,
      carbs: 70,
      fat: 30,
      consumedAt: '2026-09-15T14:30:00.000Z',
      micronutrients: [{ nutrientKey: 'fiber', amount: 8, unit: 'g' }],
    });
  });

  it('replaces an invalid eaten-at time with now so the meal still logs', () => {
    const payload = toConfirmMealPayload({ ...meal, consumedAt: 'not-a-date' });
    expect(Number.isNaN(new Date(payload.consumedAt).getTime())).toBe(false);
    expect(payload.consumedAt).not.toBe('not-a-date');
  });
});
