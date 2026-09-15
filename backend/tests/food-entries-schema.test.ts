import { describe, expect, it } from 'vitest';
import {
  canonicalizeNutrientKey,
  dateOnlySchema,
  foodEntryCreateBodySchema,
  foodEntryListQuerySchema,
  foodEntryUpdateBodySchema,
  tryNormalizeNutrients,
} from '../src/schemas/food-entries.js';

describe('food entry schemas', () => {
  it('canonicalizes nutrient keys', () => {
    expect(canonicalizeNutrientKey('Vitamin C')).toBe('vitamin_c');
    expect(canonicalizeNutrientKey('  Iron-2  ')).toBe('iron_2');
  });

  it('rejects duplicate nutrient keys after canonicalization', () => {
    const result = tryNormalizeNutrients([
      { nutrientKey: 'Vitamin C', amount: 10, unit: 'mg' },
      { nutrientKey: 'vitamin-c', amount: 12, unit: 'mg' },
    ]);
    expect(result.ok).toBe(false);
  });

  it('sanitizes food names on create', () => {
    const parsed = foodEntryCreateBodySchema.parse({
      mealType: 'LUNCH',
      foodName: 'Potato Chips 20rs',
      quantity: 1,
      quantityUnit: 'pack',
      calories: 200,
      protein: 2,
      carbs: 20,
      fat: 10,
      consumedAt: '2026-09-15T12:00:00.000Z',
    });
    expect(parsed.foodName).toBe('Potato Chips');
  });

  it('rejects an empty update body', () => {
    expect(foodEntryUpdateBodySchema.safeParse({}).success).toBe(false);
  });

  it('rejects impossible calendar dates and inverted ranges', () => {
    expect(dateOnlySchema.safeParse('2026-02-31').success).toBe(false);
    expect(
      foodEntryListQuerySchema.safeParse({
        startDate: '2026-09-15',
        endDate: '2026-09-14',
      }).success,
    ).toBe(false);
  });
});
