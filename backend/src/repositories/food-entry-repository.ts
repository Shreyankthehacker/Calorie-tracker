import type { FoodEntry, FoodEntryNutrient, MealType, Prisma } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import type { NormalizedNutrient } from '../schemas/food-entries.js';

export type FoodEntryWithNutrients = FoodEntry & {
  nutrients: FoodEntryNutrient[];
};

export type PublicNutrient = {
  nutrientKey: string;
  amount: number;
  unit: string;
};

export type PublicFoodEntry = {
  id: string;
  mealType: MealType;
  foodName: string;
  quantity: number;
  quantityUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  consumedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  micronutrients: PublicNutrient[];
};

export type FoodEntryWriteInput = {
  mealType: MealType;
  foodName: string;
  quantity: number;
  quantityUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  consumedAt: Date;
  micronutrients: NormalizedNutrient[];
};

export type FoodEntryListFilter = {
  userId: string;
  mealType?: MealType;
  consumedAtGte?: Date;
  consumedAtLte?: Date;
};

export function toPublicFoodEntry(entry: FoodEntryWithNutrients): PublicFoodEntry {
  return {
    id: entry.id,
    mealType: entry.mealType,
    foodName: entry.foodName,
    quantity: entry.quantity,
    quantityUnit: entry.quantityUnit,
    calories: entry.calories,
    protein: entry.protein,
    carbs: entry.carbs,
    fat: entry.fat,
    consumedAt: entry.consumedAt,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    micronutrients: entry.nutrients.map((nutrient) => ({
      nutrientKey: nutrient.nutrientKey,
      amount: nutrient.amount,
      unit: nutrient.unit,
    })),
  };
}

const withNutrients = {
  nutrients: { orderBy: { nutrientKey: 'asc' as const } },
};

function ownershipWhere(userId: string, id?: string): Prisma.FoodEntryWhereInput {
  return id ? { id, userId } : { userId };
}

function listWhere(filter: FoodEntryListFilter): Prisma.FoodEntryWhereInput {
  return {
    userId: filter.userId,
    ...(filter.mealType ? { mealType: filter.mealType } : {}),
    ...(filter.consumedAtGte || filter.consumedAtLte
      ? {
          consumedAt: {
            ...(filter.consumedAtGte ? { gte: filter.consumedAtGte } : {}),
            ...(filter.consumedAtLte ? { lte: filter.consumedAtLte } : {}),
          },
        }
      : {}),
  };
}

export class FoodEntryRepository {
  async create(userId: string, input: FoodEntryWriteInput): Promise<FoodEntryWithNutrients> {
    return prisma.foodEntry.create({
      data: {
        userId,
        mealType: input.mealType,
        foodName: input.foodName,
        quantity: input.quantity,
        quantityUnit: input.quantityUnit,
        calories: input.calories,
        protein: input.protein,
        carbs: input.carbs,
        fat: input.fat,
        consumedAt: input.consumedAt,
        nutrients: {
          create: input.micronutrients.map((nutrient) => ({
            nutrientKey: nutrient.nutrientKey,
            amount: nutrient.amount,
            unit: nutrient.unit,
          })),
        },
      },
      include: withNutrients,
    });
  }

  async findOwnedById(userId: string, id: string): Promise<FoodEntryWithNutrients | null> {
    return prisma.foodEntry.findFirst({
      where: ownershipWhere(userId, id),
      include: withNutrients,
    });
  }

  async listOwned(
    filter: FoodEntryListFilter,
    skip: number,
    take: number,
  ): Promise<FoodEntryWithNutrients[]> {
    return prisma.foodEntry.findMany({
      where: listWhere(filter),
      include: withNutrients,
      orderBy: { consumedAt: 'desc' },
      skip,
      take,
    });
  }

  async countOwned(filter: FoodEntryListFilter): Promise<number> {
    return prisma.foodEntry.count({
      where: listWhere(filter),
    });
  }

  async updateOwned(
    userId: string,
    id: string,
    input: Partial<Omit<FoodEntryWriteInput, 'micronutrients'>> & {
      micronutrients?: NormalizedNutrient[];
    },
  ): Promise<FoodEntryWithNutrients | null> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.foodEntry.findFirst({
        where: ownershipWhere(userId, id),
        select: { id: true },
      });
      if (!existing) {
        return null;
      }

      const { micronutrients, ...fields } = input;

      await tx.foodEntry.update({
        where: { id },
        data: fields,
      });

      if (micronutrients) {
        await tx.foodEntryNutrient.deleteMany({ where: { foodEntryId: id } });
        if (micronutrients.length > 0) {
          await tx.foodEntryNutrient.createMany({
            data: micronutrients.map((nutrient) => ({
              foodEntryId: id,
              nutrientKey: nutrient.nutrientKey,
              amount: nutrient.amount,
              unit: nutrient.unit,
            })),
          });
        }
      }

      return tx.foodEntry.findFirst({
        where: ownershipWhere(userId, id),
        include: withNutrients,
      });
    });
  }

  async deleteOwned(userId: string, id: string): Promise<boolean> {
    const result = await prisma.foodEntry.deleteMany({
      where: ownershipWhere(userId, id),
    });
    return result.count > 0;
  }
}

export const foodEntryRepository = new FoodEntryRepository();
