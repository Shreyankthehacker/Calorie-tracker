import { randomUUID } from 'node:crypto';
import { Prisma, type FoodEntry, type FoodEntryNutrient, type MealType } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { AppError } from '../errors/app-error.js';
import type { NormalizedNutrient } from '../schemas/food-entries.js';

const WRITE_TRANSACTION = { maxWait: 10_000, timeout: 60_000 } as const;

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

function rethrowWriteFailure(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2028') {
    throw new AppError(
      503,
      'INTERNAL_SERVER_ERROR',
      'Import timed out and no meals were saved. Please try again.',
    );
  }
  throw error;
}

export class FoodEntryRepository {
  async create(
    userId: string,
    input: FoodEntryWriteInput,
  ): Promise<FoodEntryWithNutrients> {
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

  async createMany(userId: string, inputs: FoodEntryWriteInput[]): Promise<FoodEntryWithNutrients[]> {
    if (inputs.length === 0) {
      return [];
    }
    if (inputs.length === 1 && inputs[0]) {
      return [await this.create(userId, inputs[0])];
    }

    const prepared = inputs.map((input) => ({
      id: randomUUID(),
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
      micronutrients: input.micronutrients,
    }));
    const nutrientRows = prepared.flatMap((row) =>
      row.micronutrients.map((nutrient) => ({
        foodEntryId: row.id,
        nutrientKey: nutrient.nutrientKey,
        amount: nutrient.amount,
        unit: nutrient.unit,
      })),
    );

    try {
      await prisma.$transaction(async (tx) => {
        await tx.foodEntry.createMany({
          data: prepared.map((row) => ({
            id: row.id,
            userId: row.userId,
            mealType: row.mealType,
            foodName: row.foodName,
            quantity: row.quantity,
            quantityUnit: row.quantityUnit,
            calories: row.calories,
            protein: row.protein,
            carbs: row.carbs,
            fat: row.fat,
            consumedAt: row.consumedAt,
          })),
        });
        if (nutrientRows.length > 0) {
          await tx.foodEntryNutrient.createMany({ data: nutrientRows });
        }
      }, WRITE_TRANSACTION);
    } catch (error) {
      rethrowWriteFailure(error);
    }

    const created = await prisma.foodEntry.findMany({
      where: { userId, id: { in: prepared.map((row) => row.id) } },
      include: withNutrients,
    });
    const byId = new Map(created.map((row) => [row.id, row]));
    return prepared.map((row) => {
      const entry = byId.get(row.id);
      if (!entry) {
        throw new AppError(500, 'INTERNAL_SERVER_ERROR', 'Imported meals could not be loaded after save.');
      }
      return entry;
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

  async findOwnedBetween(
    userId: string,
    consumedAtGte: Date,
    consumedAtLte: Date,
    take = 500,
  ): Promise<FoodEntryWithNutrients[]> {
    return prisma.foodEntry.findMany({
      where: {
        userId,
        consumedAt: { gte: consumedAtGte, lte: consumedAtLte },
      },
      include: withNutrients,
      orderBy: { consumedAt: 'desc' },
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
    }, WRITE_TRANSACTION);
  }

  async deleteOwned(userId: string, id: string): Promise<boolean> {
    const result = await prisma.foodEntry.deleteMany({
      where: ownershipWhere(userId, id),
    });
    return result.count > 0;
  }
}

export const foodEntryRepository = new FoodEntryRepository();
