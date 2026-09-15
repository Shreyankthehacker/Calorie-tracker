import { describe, expect, it } from 'vitest';
import { logMealInputSchema } from '../src/schemas/chat.js';

const base = {
  mealType: 'LUNCH',
  foodName: 'chole bhature',
  quantity: 1,
  quantityUnit: 'plate',
  calories: 620,
  protein: 18,
  carbs: 78,
  fat: 24,
  consumedAt: '2026-09-15T08:30:00.000Z',
};

describe('logMealInputSchema', () => {
  it('accepts Gemini-style extra keys, lowercase meal type, and string numbers', () => {
    const parsed = logMealInputSchema.parse({
      ...base,
      mealType: 'lunch',
      quantity: '1',
      calories: '620',
      protein: '18',
      carbs: '78',
      fat: '24',
      notes: 'estimate',
      source: 'model',
      userId: 'someone-else',
      micronutrients: [{ nutrientKey: 'fiber', amount: '9', unit: 'g', extra: true }],
    });
    expect(parsed).toMatchObject({
      mealType: 'LUNCH',
      foodName: 'chole bhature',
      quantity: 1,
      calories: 620,
      protein: 18,
    });
    expect(parsed.micronutrients).toEqual([{ nutrientKey: 'fiber', amount: 9, unit: 'g' }]);
    expect('userId' in parsed).toBe(false);
    expect('notes' in parsed).toBe(false);
  });

  it('uses now when consumedAt is missing or invalid', () => {
    const before = Date.now();
    const parsed = logMealInputSchema.parse({ ...base, consumedAt: 'not-a-date' });
    expect(parsed.consumedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(parsed.consumedAt.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
  });
});
