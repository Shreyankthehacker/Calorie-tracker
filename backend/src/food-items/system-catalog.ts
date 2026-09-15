import type { FoodItemSource, MealType } from '@prisma/client';
import { prisma } from '../db/prisma.js';

function catalogPhoto(file: string): string {
  return `/foods/${file}`;
}

export type SystemFoodSeed = {
  name: string;
  category: string;
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageUrl: string;
  mealTypes: MealType[];
  nutrients?: Array<{ nutrientKey: string; amount: number; unit: string }>;
};

export const SYSTEM_FOODS: SystemFoodSeed[] = [
  {
    name: 'Oats',
    category: 'grain',
    servingSize: 100,
    servingUnit: 'g',
    calories: 389,
    protein: 16.9,
    carbs: 66,
    fat: 6.9,
    imageUrl: catalogPhoto('oats.jpg'),
    mealTypes: ['BREAKFAST'],
    nutrients: [{ nutrientKey: 'iron', amount: 4.7, unit: 'mg' }],
  },
  {
    name: 'Banana',
    category: 'fruit',
    servingSize: 1,
    servingUnit: 'piece',
    calories: 105,
    protein: 1.3,
    carbs: 27,
    fat: 0.4,
    imageUrl: catalogPhoto('banana.jpg'),
    mealTypes: ['BREAKFAST', 'SNACKS'],
    nutrients: [{ nutrientKey: 'potassium', amount: 422, unit: 'mg' }],
  },
  {
    name: 'Eggs',
    category: 'protein',
    servingSize: 1,
    servingUnit: 'egg',
    calories: 78,
    protein: 6.3,
    carbs: 0.6,
    fat: 5.3,
    imageUrl: catalogPhoto('eggs.jpg'),
    mealTypes: ['BREAKFAST', 'LUNCH', 'SNACKS'],
  },
  {
    name: 'Idli',
    category: 'grain',
    servingSize: 1,
    servingUnit: 'piece',
    calories: 58,
    protein: 2,
    carbs: 12,
    fat: 0.4,
    imageUrl: catalogPhoto('idli.jpg'),
    mealTypes: ['BREAKFAST'],
  },
  {
    name: 'Toast',
    category: 'grain',
    servingSize: 1,
    servingUnit: 'slice',
    calories: 75,
    protein: 2.5,
    carbs: 14,
    fat: 1,
    imageUrl: catalogPhoto('toast.jpg'),
    mealTypes: ['BREAKFAST'],
  },
  {
    name: 'Greek yogurt',
    category: 'dairy',
    servingSize: 150,
    servingUnit: 'g',
    calories: 97,
    protein: 17,
    carbs: 6,
    fat: 0.7,
    imageUrl: catalogPhoto('greek-yogurt.jpg'),
    mealTypes: ['BREAKFAST', 'SNACKS'],
    nutrients: [{ nutrientKey: 'calcium', amount: 165, unit: 'mg' }],
  },
  {
    name: 'Apple',
    category: 'fruit',
    servingSize: 1,
    servingUnit: 'piece',
    calories: 95,
    protein: 0.5,
    carbs: 25,
    fat: 0.3,
    imageUrl: catalogPhoto('apple.jpg'),
    mealTypes: ['BREAKFAST', 'SNACKS'],
    nutrients: [{ nutrientKey: 'fiber', amount: 4.4, unit: 'g' }],
  },
  {
    name: 'White rice',
    category: 'grain',
    servingSize: 1,
    servingUnit: 'cup cooked',
    calories: 205,
    protein: 4.3,
    carbs: 45,
    fat: 0.4,
    imageUrl: catalogPhoto('white-rice.jpg'),
    mealTypes: ['LUNCH', 'DINNER'],
  },
  {
    name: 'Chapati',
    category: 'grain',
    servingSize: 1,
    servingUnit: 'piece',
    calories: 120,
    protein: 3.1,
    carbs: 18,
    fat: 3.7,
    imageUrl: catalogPhoto('chapati.jpg'),
    mealTypes: ['BREAKFAST', 'LUNCH', 'DINNER'],
  },
  {
    name: 'Chicken breast',
    category: 'protein',
    servingSize: 100,
    servingUnit: 'g',
    calories: 165,
    protein: 31,
    carbs: 0,
    fat: 3.6,
    imageUrl: catalogPhoto('chicken-breast.jpg'),
    mealTypes: ['LUNCH', 'DINNER'],
  },
  {
    name: 'Paneer',
    category: 'protein',
    servingSize: 100,
    servingUnit: 'g',
    calories: 265,
    protein: 18,
    carbs: 3.4,
    fat: 20.8,
    imageUrl: catalogPhoto('paneer.jpg'),
    mealTypes: ['LUNCH', 'DINNER'],
    nutrients: [{ nutrientKey: 'calcium', amount: 480, unit: 'mg' }],
  },
  {
    name: 'Salmon',
    category: 'protein',
    servingSize: 100,
    servingUnit: 'g',
    calories: 208,
    protein: 20,
    carbs: 0,
    fat: 13,
    imageUrl: catalogPhoto('salmon.jpg'),
    mealTypes: ['LUNCH', 'DINNER'],
  },
  {
    name: 'Mixed salad',
    category: 'vegetable',
    servingSize: 1,
    servingUnit: 'bowl',
    calories: 35,
    protein: 2,
    carbs: 7,
    fat: 0.4,
    imageUrl: catalogPhoto('mixed-salad.jpg'),
    mealTypes: ['LUNCH', 'DINNER', 'SNACKS'],
  },
  {
    name: 'Almonds',
    category: 'nuts',
    servingSize: 28,
    servingUnit: 'g',
    calories: 164,
    protein: 6,
    carbs: 6,
    fat: 14,
    imageUrl: catalogPhoto('almonds.jpg'),
    mealTypes: ['SNACKS'],
  },
  {
    name: 'Milk',
    category: 'dairy',
    servingSize: 250,
    servingUnit: 'ml',
    calories: 122,
    protein: 8.1,
    carbs: 12,
    fat: 4.8,
    imageUrl: catalogPhoto('milk.jpg'),
    mealTypes: ['BREAKFAST', 'SNACKS'],
    nutrients: [{ nutrientKey: 'calcium', amount: 300, unit: 'mg' }],
  },
  {
    name: 'Mutton biryani',
    category: 'grain',
    servingSize: 1,
    servingUnit: 'plate',
    calories: 480,
    protein: 18,
    carbs: 56,
    fat: 19,
    imageUrl: catalogPhoto('mutton-biryani.jpg'),
    mealTypes: ['LUNCH', 'DINNER'],
    nutrients: [
      { nutrientKey: 'fiber', amount: 6, unit: 'g' },
      { nutrientKey: 'sodium', amount: 640, unit: 'mg' },
    ],
  },
];

const SYSTEM_SOURCE: FoodItemSource = 'SYSTEM';

export async function upsertSystemCatalog(): Promise<number> {
  for (const item of SYSTEM_FOODS) {
    const existing = await prisma.foodItem.findUnique({
      where: { sourceType_name: { sourceType: SYSTEM_SOURCE, name: item.name } },
    });

    const fields = {
      category: item.category,
      servingSize: item.servingSize,
      servingUnit: item.servingUnit,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      imageUrl: item.imageUrl,
      sourceReference: 'system_seed',
      verified: true,
    };

    const nutrients = (item.nutrients ?? []).map((nutrient) => ({
      nutrientKey: nutrient.nutrientKey,
      amount: nutrient.amount,
      unit: nutrient.unit,
    }));
    const mealTypes = item.mealTypes.map((mealType) => ({ mealType }));

    if (existing) {
      await prisma.foodItem.update({
        where: { id: existing.id },
        data: {
          ...fields,
          nutrients: { deleteMany: {}, create: nutrients },
          mealTypes: { deleteMany: {}, create: mealTypes },
        },
      });
    } else {
      await prisma.foodItem.create({
        data: {
          name: item.name,
          sourceType: SYSTEM_SOURCE,
          ...fields,
          nutrients: { create: nutrients },
          mealTypes: { create: mealTypes },
        },
      });
    }
  }

  return SYSTEM_FOODS.length;
}
