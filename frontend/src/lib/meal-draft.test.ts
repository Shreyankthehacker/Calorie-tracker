import { describe, expect, it } from 'vitest';
import { nutritionToDraftEntry } from './meal-draft';

describe('nutritionToDraftEntry', () => {
  it('builds a draft food entry with lunch as the default meal type', () => {
    const draft = nutritionToDraftEntry({
      foodName: 'Salmon bowl',
      quantity: 1,
      quantityUnit: 'serving',
      calories: 620,
      protein: 44,
      carbs: 52,
      fat: 22,
    });

    expect(draft.id).toBe('draft');
    expect(draft.mealType).toBe('LUNCH');
    expect(draft.foodName).toBe('Salmon bowl');
    expect(draft.calories).toBe(620);
    expect(draft.micronutrients).toEqual([]);
  });

  it('keeps an explicit meal type and micronutrients', () => {
    const draft = nutritionToDraftEntry({
      foodName: 'Oats',
      quantity: 1,
      quantityUnit: 'bowl',
      calories: 320,
      protein: 12,
      carbs: 54,
      fat: 6,
      mealType: 'BREAKFAST',
      micronutrients: [{ nutrientKey: 'iron', amount: 2, unit: 'mg' }],
    });

    expect(draft.mealType).toBe('BREAKFAST');
    expect(draft.micronutrients).toEqual([{ nutrientKey: 'iron', amount: 2, unit: 'mg' }]);
  });
});
