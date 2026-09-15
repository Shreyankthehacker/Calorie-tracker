import { describe, expect, it } from 'vitest';
import { FALLBACK_FOOD_PHOTO, foodPhoto } from './food-photos';

describe('foodPhoto', () => {
  it('maps catalog names to distinct real photos', () => {
    expect(foodPhoto('Mutton biryani')).toBe('/foods/mutton-biryani.jpg');
    expect(foodPhoto('Banana')).toBe('/foods/banana.jpg');
    expect(foodPhoto('Oats')).toBe('/foods/oats.jpg');
    expect(foodPhoto('Greek yogurt')).toBe('/foods/greek-yogurt.jpg');
  });

  it('does not treat biryani as plain rice', () => {
    expect(foodPhoto('chicken biryani')).toBe('/foods/mutton-biryani.jpg');
    expect(foodPhoto('White rice')).toBe('/foods/white-rice.jpg');
  });

  it('falls back to a real food photo instead of a cartoon', () => {
    expect(foodPhoto('mystery stew')).toBe(FALLBACK_FOOD_PHOTO);
  });
});
