import { describe, expect, it } from 'vitest';
import {
  matchHeader,
  matchHeaderKey,
  normalizeHeaderForMatch,
} from '../src/pdf/header-aliases.js';
import type { CanonicalField } from '../src/pdf/types.js';

function expectField(header: string, field: CanonicalField) {
  const match = matchHeader(header);
  expect(match.originalHeader).toBe(header);
  expect(match.canonicalField).toBe(field);
  expect(match.matchType).not.toBe('unknown');
  expect(match.confidence).toBeGreaterThan(0);
}

describe('header normalization for matching', () => {
  it('normalizes Protein (g) without deciding the field', () => {
    expect(normalizeHeaderForMatch('Protein (g)')).toBe('protein g');
    expect(matchHeader('Protein (g)').originalHeader).toBe('Protein (g)');
  });

  it('normalizes PROTEIN', () => {
    expect(normalizeHeaderForMatch('PROTEIN')).toBe('protein');
  });

  it('trims Protein whitespace', () => {
    expect(normalizeHeaderForMatch('  Protein  ')).toBe('protein');
  });

  it('normalizes Energy (kcal)', () => {
    expect(normalizeHeaderForMatch('Energy (kcal)')).toBe('energy kcal');
    expect(matchHeader('Energy (kcal)').originalHeader).toBe('Energy (kcal)');
  });

  it('normalizes Total Fat (g)', () => {
    expect(normalizeHeaderForMatch('Total Fat (g)')).toBe('total fat g');
  });
});

describe('calorie header aliases', () => {
  it.each([
    'Calories',
    'Calorie',
    'Cal',
    'Cals',
    'Energy',
    'Energy (kcal)',
    'kcal',
    'kcals',
    'Calories (kcal)',
  ])('maps %s to calories', (header) => {
    expectField(header, 'calories');
  });
});

describe('protein header aliases', () => {
  it.each([
    'Protein',
    'Protein (g)',
    'Protein g',
    'Prot.',
    'Prot',
    'Prot. (g)',
    'Protein grams',
  ])('maps %s to protein', (header) => {
    expectField(header, 'protein');
  });
});

describe('carb header aliases', () => {
  it.each([
    'Carbs',
    'Carbohydrates',
    'Carbohydrate',
    'CHO',
    'Carbs (g)',
    'Carbohydrates (g)',
    'Total Carbohydrates',
  ])('maps %s to carbs', (header) => {
    expectField(header, 'carbs');
  });
});

describe('fat header aliases', () => {
  it.each([
    'Fat',
    'Fat (g)',
    'Total Fat',
    'Total Fat (g)',
    'Fat g',
    'Lipids',
  ])('maps %s to fat', (header) => {
    expectField(header, 'fat');
  });
});

describe('food header aliases', () => {
  it.each([
    'Food',
    'Food Name',
    'Item',
    'Item Name',
    'Food Item',
    'Description',
  ])('maps %s to foodName', (header) => {
    expectField(header, 'foodName');
  });
});

describe('quantity header aliases', () => {
  it.each([
    'Quantity',
    'Qty',
    'Amount',
    'Serving',
    'Servings',
    'Count',
  ])('maps %s to quantity', (header) => {
    expectField(header, 'quantity');
  });
});

describe('meal header aliases', () => {
  it.each([
    'Meal',
    'Meal Type',
    'Meal Name',
    'Occasion',
  ])('maps %s to mealType', (header) => {
    expectField(header, 'mealType');
  });
});

describe('date/time header aliases', () => {
  it.each([
    'Date',
    'Time',
    'Date Time',
    'Date/Time',
    'Datetime',
    'Consumed At',
    'Consumption Time',
  ])('maps %s to consumedAt', (header) => {
    expectField(header, 'consumedAt');
  });
});

describe('unknown headers', () => {
  it.each([
    'Fiber',
    'Sodium',
    'Sugar',
    'Vitamin C',
    'Glycemic Index',
    'Brand',
    'Price',
    'Recipe',
    'Notes',
    'Random Metric',
  ])('does not map %s to a nutrition macro', (header) => {
    const match = matchHeader(header);
    expect(match.originalHeader).toBe(header);
    expect(match.canonicalField).toBeNull();
    expect(match.matchType).toBe('unknown');
    expect(match.confidence).toBe(0);
    expect(['calories', 'protein', 'carbs', 'fat']).not.toContain(matchHeaderKey(header));
  });
});
