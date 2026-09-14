import type {
  FoodItem,
  FoodItemMealType,
  FoodItemNutrient,
  FoodItemSource,
  MealType,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma.js';

export type FoodItemWithRelations = FoodItem & {
  nutrients: FoodItemNutrient[];
  mealTypes: FoodItemMealType[];
};

export type PublicFoodItemNutrient = {
  nutrientKey: string;
  amount: number;
  unit: string;
};

export type PublicFoodItem = {
  id: string;
  name: string;
  category: string | null;
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageUrl: string | null;
  sourceType: FoodItemSource;
  sourceReference: string | null;
  verified: boolean;
  mealTypes: MealType[];
  micronutrients: PublicFoodItemNutrient[];
  createdAt: Date;
  updatedAt: Date;
};

export type FoodItemListFilter = {
  mealType?: MealType;
  q?: string;
  skip: number;
  take: number;
};

const withRelations = {
  nutrients: { orderBy: { nutrientKey: 'asc' as const } },
  mealTypes: true,
};

export function toPublicFoodItem(item: FoodItemWithRelations): PublicFoodItem {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    servingSize: item.servingSize,
    servingUnit: item.servingUnit,
    calories: item.calories,
    protein: item.protein,
    carbs: item.carbs,
    fat: item.fat,
    imageUrl: item.imageUrl,
    sourceType: item.sourceType,
    sourceReference: item.sourceReference,
    verified: item.verified,
    mealTypes: item.mealTypes.map((row) => row.mealType).sort(),
    micronutrients: item.nutrients.map((nutrient) => ({
      nutrientKey: nutrient.nutrientKey,
      amount: nutrient.amount,
      unit: nutrient.unit,
    })),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function listWhere(filter: FoodItemListFilter): Prisma.FoodItemWhereInput {
  return {
    ...(filter.mealType ? { mealTypes: { some: { mealType: filter.mealType } } } : {}),
    ...(filter.q ? { name: { contains: filter.q, mode: 'insensitive' } } : {}),
  };
}

export class FoodItemRepository {
  async findById(id: string): Promise<FoodItemWithRelations | null> {
    return prisma.foodItem.findUnique({
      where: { id },
      include: withRelations,
    });
  }

  async list(filter: FoodItemListFilter): Promise<{ total: number; items: FoodItemWithRelations[] }> {
    const where = listWhere(filter);
    const [total, items] = await prisma.$transaction([
      prisma.foodItem.count({ where }),
      prisma.foodItem.findMany({
        where,
        include: withRelations,
        orderBy: { name: 'asc' },
        skip: filter.skip,
        take: filter.take,
      }),
    ]);
    return { total, items };
  }
}

export const foodItemRepository = new FoodItemRepository();
