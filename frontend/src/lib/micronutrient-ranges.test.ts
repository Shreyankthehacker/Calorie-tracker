import { describe, expect, it } from 'vitest';
import { dailyReferenceRange } from './micronutrient-ranges';

describe('dailyReferenceRange', () => {
  it('returns the daily reference for known nutrients', () => {
    expect(dailyReferenceRange('iron')).toEqual({
      amount: 18,
      unit: 'mg',
      label: 'recommended daily',
    });
    expect(dailyReferenceRange('sodium')?.amount).toBe(2300);
  });

  it('returns null for unknown nutrients', () => {
    expect(dailyReferenceRange('lycopene')).toBeNull();
  });
});
