import { describe, expect, it } from 'vitest';
import { sanitizeFoodName } from '../src/lib/food-name.js';
import { goalBodySchema } from '../src/schemas/goals.js';
import { barcodeProductSchema } from '../src/schemas/barcode.js';

describe('food name sanitization', () => {
  it('strips rupee prices', () => {
    expect(sanitizeFoodName('Potato Chips (Plain Salted flavour) 20rs')).toBe(
      'Potato Chips (Plain Salted flavour)',
    );
  });
});

describe('goal body schema', () => {
  it('rejects a 23 kcal target', () => {
    const parsed = goalBodySchema.safeParse({
      dailyCalorieTarget: 23,
      proteinTarget: 150,
      carbTarget: 200,
      fatTarget: 60,
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects 2434g protein', () => {
    const parsed = goalBodySchema.safeParse({
      dailyCalorieTarget: 2200,
      proteinTarget: 2434,
      carbTarget: 200,
      fatTarget: 60,
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts a typical goal', () => {
    const parsed = goalBodySchema.safeParse({
      dailyCalorieTarget: 2200,
      proteinTarget: 140,
      carbTarget: 220,
      fatTarget: 70,
    });
    expect(parsed.success).toBe(true);
  });
});

describe('barcode product schema', () => {
  it('strips price tokens from product names', () => {
    const parsed = barcodeProductSchema.parse({
      barcode: '8901234567890',
      name: 'Potato Chips (Plain Salted flavour) 20rs',
      brand: null,
      quantity: 100,
      quantityUnit: 'g',
      calories: 539,
      protein: 6,
      carbs: 50,
      fat: 30,
      micronutrients: [],
      source: 'open_food_facts',
    });
    expect(parsed.name).toBe('Potato Chips (Plain Salted flavour)');
  });
});
