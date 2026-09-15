import { describe, expect, it } from 'vitest';
import { unusualQuantityWarning } from './quantity-warning';

describe('unusualQuantityWarning', () => {
  it('warns on a large countable serving', () => {
    expect(unusualQuantityWarning(20, 'eggs')).toMatch(/lot of eggs/i);
  });

  it('warns on an unusually large gram amount', () => {
    expect(unusualQuantityWarning(2000, 'g')).toMatch(/unusually high/i);
  });

  it('warns on a high generic quantity', () => {
    expect(unusualQuantityWarning(80, 'portion')).toMatch(/looks high/i);
  });

  it('does not warn on typical amounts', () => {
    expect(unusualQuantityWarning(2, 'serving')).toBeNull();
    expect(unusualQuantityWarning(150, 'g')).toBeNull();
    expect(unusualQuantityWarning(0, 'g')).toBeNull();
  });
});
