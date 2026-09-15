import type { FoodSearchHit, FoodSearchProvider } from './food-search-provider.js';

const CATALOG: FoodSearchHit[] = [
  {
    foodName: 'Banana',
    quantity: 1,
    quantityUnit: 'medium',
    calories: 105,
    protein: 1.3,
    carbs: 27,
    fat: 0.4,
    micronutrients: [{ nutrientKey: 'potassium', amount: 422, unit: 'mg' }],
    source: 'catalog_estimate',
    notes: 'Typical medium banana. Catalog estimate, not a lab measurement.',
  },
  {
    foodName: 'Large egg',
    quantity: 1,
    quantityUnit: 'egg',
    calories: 72,
    protein: 6.3,
    carbs: 0.4,
    fat: 4.8,
    micronutrients: [],
    source: 'catalog_estimate',
    notes: 'Typical large chicken egg. Catalog estimate, not a lab measurement.',
  },
  {
    foodName: 'Toast',
    quantity: 1,
    quantityUnit: 'slice',
    calories: 75,
    protein: 2.5,
    carbs: 14,
    fat: 1,
    micronutrients: [],
    source: 'catalog_estimate',
    notes: 'Typical slice of white toast. Catalog estimate, not a lab measurement.',
  },
  {
    foodName: 'Oatmeal',
    quantity: 1,
    quantityUnit: 'cup cooked',
    calories: 166,
    protein: 6,
    carbs: 28,
    fat: 3.6,
    micronutrients: [{ nutrientKey: 'iron', amount: 2, unit: 'mg' }],
    source: 'catalog_estimate',
    notes: 'Typical cooked oats, no toppings. Catalog estimate, not a lab measurement.',
  },
  {
    foodName: 'Chicken breast',
    quantity: 100,
    quantityUnit: 'g',
    calories: 165,
    protein: 31,
    carbs: 0,
    fat: 3.6,
    micronutrients: [],
    source: 'catalog_estimate',
    notes: 'Skinless roasted chicken breast. Catalog estimate, not a lab measurement.',
  },
  {
    foodName: 'Apple',
    quantity: 1,
    quantityUnit: 'medium',
    calories: 95,
    protein: 0.5,
    carbs: 25,
    fat: 0.3,
    micronutrients: [{ nutrientKey: 'fiber', amount: 4.4, unit: 'g' }],
    source: 'catalog_estimate',
    notes: 'Typical medium apple with skin. Catalog estimate, not a lab measurement.',
  },
  {
    foodName: 'White rice',
    quantity: 1,
    quantityUnit: 'cup cooked',
    calories: 205,
    protein: 4.3,
    carbs: 45,
    fat: 0.4,
    micronutrients: [],
    source: 'catalog_estimate',
    notes: 'Typical cooked white rice. Catalog estimate, not a lab measurement.',
  },
  {
    foodName: 'Greek yogurt',
    quantity: 170,
    quantityUnit: 'g',
    calories: 100,
    protein: 17,
    carbs: 6,
    fat: 0.7,
    micronutrients: [{ nutrientKey: 'calcium', amount: 180, unit: 'mg' }],
    source: 'catalog_estimate',
    notes: 'Typical nonfat Greek yogurt. Catalog estimate, not a lab measurement.',
  },
  {
    foodName: 'Almonds',
    quantity: 28,
    quantityUnit: 'g',
    calories: 164,
    protein: 6,
    carbs: 6,
    fat: 14,
    micronutrients: [],
    source: 'catalog_estimate',
    notes: 'About a 1 oz handful. Catalog estimate, not a lab measurement.',
  },
  {
    foodName: 'Salmon',
    quantity: 100,
    quantityUnit: 'g',
    calories: 208,
    protein: 20,
    carbs: 0,
    fat: 13,
    micronutrients: [],
    source: 'catalog_estimate',
    notes: 'Typical cooked Atlantic salmon. Catalog estimate, not a lab measurement.',
  },
  {
    foodName: 'Mutton biryani',
    quantity: 1,
    quantityUnit: 'plate',
    calories: 480,
    protein: 18,
    carbs: 56,
    fat: 19,
    micronutrients: [
      { nutrientKey: 'fiber', amount: 6, unit: 'g' },
      { nutrientKey: 'sodium', amount: 640, unit: 'mg' },
    ],
    source: 'catalog_estimate',
    notes: 'Typical restaurant plate (~250 g). Catalog estimate, not a lab measurement.',
  },
];

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ');
}

export class CatalogFoodSearchProvider implements FoodSearchProvider {
  search(query: string): Promise<FoodSearchHit[]> {
    const needle = normalize(query);
    if (!needle) {
      return Promise.resolve([]);
    }
    const tokens = needle.split(' ').filter(Boolean);
    const ranked = CATALOG.map((item) => {
      const haystack = normalize(`${item.foodName} ${item.notes}`);
      const score = tokens.reduce((sum, token) => (haystack.includes(token) ? sum + 1 : sum), 0);
      return { item, score };
    })
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((row) => row.item);

    return Promise.resolve(ranked);
  }
}
