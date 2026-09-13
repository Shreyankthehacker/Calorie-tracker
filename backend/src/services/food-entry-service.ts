import { AppError } from '../errors/app-error.js';
import { calendarDayEndUtc, calendarDayStartUtc, resolveTimeZone } from '../lib/calendar-date.js';
import { resolveOwnerId } from '../ownership/ownership.js';
import {
  foodEntryRepository,
  toPublicFoodEntry,
  type FoodEntryListFilter,
  type FoodEntryRepository,
  type PublicFoodEntry,
} from '../repositories/food-entry-repository.js';
import { userRepository, type UserRepository } from '../repositories/user-repository.js';
import type {
  FoodEntryCreateBody,
  FoodEntryListQuery,
  FoodEntryUpdateBody,
} from '../schemas/food-entries.js';
import { tryNormalizeNutrients } from '../schemas/food-entries.js';

export type FoodEntryListResult = {
  data: PublicFoodEntry[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

function nutrientsFromBody(body: { micronutrients?: FoodEntryCreateBody['micronutrients'] }) {
  const result = tryNormalizeNutrients(body.micronutrients);
  if (!result.ok) {
    throw new AppError(400, 'VALIDATION_ERROR', result.message);
  }
  return result.value;
}

export class FoodEntryService {
  constructor(
    private readonly entries: FoodEntryRepository = foodEntryRepository,
    private readonly users: UserRepository = userRepository,
  ) {}

  async create(
    authenticatedUserId: string,
    body: FoodEntryCreateBody,
    clientUserId?: string,
  ): Promise<PublicFoodEntry> {
    const ownerId = resolveOwnerId(authenticatedUserId, clientUserId ?? body.userId);
    const created = await this.entries.create(ownerId, {
      mealType: body.mealType,
      foodName: body.foodName,
      quantity: body.quantity,
      quantityUnit: body.quantityUnit,
      calories: body.calories,
      protein: body.protein,
      carbs: body.carbs,
      fat: body.fat,
      consumedAt: body.consumedAt,
      micronutrients: nutrientsFromBody(body),
    });
    return toPublicFoodEntry(created);
  }

  async createMany(
    authenticatedUserId: string,
    bodies: FoodEntryCreateBody[],
  ): Promise<PublicFoodEntry[]> {
    const ownerId = resolveOwnerId(authenticatedUserId);
    const inputs = bodies.map((body) => ({
      mealType: body.mealType,
      foodName: body.foodName,
      quantity: body.quantity,
      quantityUnit: body.quantityUnit,
      calories: body.calories,
      protein: body.protein,
      carbs: body.carbs,
      fat: body.fat,
      consumedAt: body.consumedAt,
      micronutrients: nutrientsFromBody(body),
    }));
    const created = await this.entries.createMany(ownerId, inputs);
    return created.map(toPublicFoodEntry);
  }

  async getById(
    authenticatedUserId: string,
    id: string,
    clientUserId?: string,
  ): Promise<PublicFoodEntry> {
    const ownerId = resolveOwnerId(authenticatedUserId, clientUserId);
    const entry = await this.entries.findOwnedById(ownerId, id);
    if (!entry) {
      throw new AppError(404, 'NOT_FOUND', 'Resource not found');
    }
    return toPublicFoodEntry(entry);
  }

  async update(
    authenticatedUserId: string,
    id: string,
    body: FoodEntryUpdateBody,
    clientUserId?: string,
  ): Promise<PublicFoodEntry> {
    const ownerId = resolveOwnerId(authenticatedUserId, clientUserId ?? body.userId);
    const patch: Parameters<FoodEntryRepository['updateOwned']>[2] = {};

    if (body.mealType !== undefined) patch.mealType = body.mealType;
    if (body.foodName !== undefined) patch.foodName = body.foodName;
    if (body.quantity !== undefined) patch.quantity = body.quantity;
    if (body.quantityUnit !== undefined) patch.quantityUnit = body.quantityUnit;
    if (body.calories !== undefined) patch.calories = body.calories;
    if (body.protein !== undefined) patch.protein = body.protein;
    if (body.carbs !== undefined) patch.carbs = body.carbs;
    if (body.fat !== undefined) patch.fat = body.fat;
    if (body.consumedAt !== undefined) patch.consumedAt = body.consumedAt;
    if (body.micronutrients !== undefined) {
      patch.micronutrients = nutrientsFromBody(body);
    }

    const updated = await this.entries.updateOwned(ownerId, id, patch);
    if (!updated) {
      throw new AppError(404, 'NOT_FOUND', 'Resource not found');
    }
    return toPublicFoodEntry(updated);
  }

  async remove(authenticatedUserId: string, id: string, clientUserId?: string): Promise<void> {
    const ownerId = resolveOwnerId(authenticatedUserId, clientUserId);
    const deleted = await this.entries.deleteOwned(ownerId, id);
    if (!deleted) {
      throw new AppError(404, 'NOT_FOUND', 'Resource not found');
    }
  }

  async list(
    authenticatedUserId: string,
    query: FoodEntryListQuery,
    clientUserId?: string,
  ): Promise<FoodEntryListResult> {
    const ownerId = resolveOwnerId(authenticatedUserId, clientUserId ?? query.userId);
    const user = await this.users.findById(ownerId);
    const timeZone = resolveTimeZone(user?.timezone);

    const filter: FoodEntryListFilter = { userId: ownerId };
    if (query.mealType !== undefined) {
      filter.mealType = query.mealType;
    }
    if (query.startDate) {
      filter.consumedAtGte = calendarDayStartUtc(query.startDate, timeZone);
    }
    if (query.endDate) {
      filter.consumedAtLte = calendarDayEndUtc(query.endDate, timeZone);
    }

    const skip = (query.page - 1) * query.pageSize;
    const [rows, total] = await Promise.all([
      this.entries.listOwned(filter, skip, query.pageSize),
      this.entries.countOwned(filter),
    ]);

    return {
      data: rows.map(toPublicFoodEntry),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize),
      },
    };
  }
}
