import { describe, expect, it } from 'vitest';
import {
  formatAmount,
  isMealType,
  remainingCalories,
  scaleMacrosFromBase,
  scaleNutrition,
} from './nutrition';

describe('nutrition helpers', () => {
  it('recognizes meal types', () => {
    expect(isMealType('BREAKFAST')).toBe(true);
    expect(isMealType('dessert')).toBe(false);
  });

  it('scales macros from a base serving', () => {
    expect(scaleNutrition(200, 150, 100)).toBe(300);
    expect(scaleMacrosFromBase({ quantity: 100, calories: 200, protein: 10, carbs: 20, fat: 8 }, 50)).toEqual({
      quantity: 50,
      calories: 100,
      protein: 5,
      carbs: 10,
      fat: 4,
    });
  });

  it('returns zero when the base quantity is not positive', () => {
    expect(scaleNutrition(200, 50, 0)).toBe(0);
  });

  it('formats amounts without trailing zeros', () => {
    expect(formatAmount(12)).toBe('12');
    expect(formatAmount(12.4)).toBe('12.4');
  });

  it('computes remaining calories only when a target exists', () => {
    expect(remainingCalories(1800, 2200)).toBe(400);
    expect(remainingCalories(1800, null)).toBeNull();
  });
});
