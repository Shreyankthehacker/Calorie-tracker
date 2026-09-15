import { describe, expect, it } from 'vitest';
import { sanitizeFoodName } from './food-name';

describe('sanitizeFoodName', () => {
  it('strips rupee prices from barcode names', () => {
    expect(sanitizeFoodName('Potato Chips (Plain Salted flavour) 20rs')).toBe(
      'Potato Chips (Plain Salted flavour)',
    );
  });

  it('keeps ordinary food names', () => {
    expect(sanitizeFoodName('Oatmeal')).toBe('Oatmeal');
  });

  it('strips currency symbols and trailing separators', () => {
    expect(sanitizeFoodName('Oatmeal $5.99 —')).toBe('Oatmeal');
  });
});
