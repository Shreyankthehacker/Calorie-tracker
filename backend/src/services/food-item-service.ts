import { AppError } from '../errors/app-error.js';
import {
  foodItemRepository,
  toPublicFoodItem,
  type FoodItemRepository,
  type PublicFoodItem,
} from '../repositories/food-item-repository.js';
import type { PublicFoodEntry } from '../repositories/food-entry-repository.js';
import type { FoodItemListQuery, FoodItemLogBody } from '../schemas/food-items.js';
import { FoodEntryService } from './food-entry-service.js';

export type FoodItemListResult = {
  data: PublicFoodItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export function scaleFromServing(
  perServing: number,
  quantity: number,
  servingSize: number,
): number {
  return Math.round(((perServing * quantity) / servingSize) * 10) / 10;
}

export class FoodItemService {
  constructor(
    private readonly items: FoodItemRepository = foodItemRepository,
    private readonly foodEntries: FoodEntryService = new FoodEntryService(),
  ) {}

  async list(query: FoodItemListQuery): Promise<FoodItemListResult> {
    const skip = (query.page - 1) * query.pageSize;
    const { total, items } = await this.items.list({
      ...(query.mealType ? { mealType: query.mealType } : {}),
      ...(query.q ? { q: query.q } : {}),
      skip,
      take: query.pageSize,
    });
    const totalPages = total === 0 ? 0 : Math.ceil(total / query.pageSize);
    return {
      data: items.map(toPublicFoodItem),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages,
      },
    };
  }

  async getById(id: string): Promise<PublicFoodItem> {
    const item = await this.items.findById(id);
    if (!item) {
      throw new AppError(404, 'NOT_FOUND', 'Resource not found');
    }
    return toPublicFoodItem(item);
  }

  async log(
    authenticatedUserId: string,
    foodItemId: string,
    body: FoodItemLogBody,
  ): Promise<PublicFoodEntry> {
    const item = await this.items.findById(foodItemId);
    if (!item) {
      throw new AppError(404, 'NOT_FOUND', 'Resource not found');
    }
    if (item.servingSize <= 0) {
      throw new AppError(500, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred');
    }

    const quantity = body.quantity;
    const servingSize = item.servingSize;

    return this.foodEntries.create(authenticatedUserId, {
      mealType: body.mealType,
      foodName: item.name,
      quantity,
      quantityUnit: item.servingUnit,
      calories: scaleFromServing(item.calories, quantity, servingSize),
      protein: scaleFromServing(item.protein, quantity, servingSize),
      carbs: scaleFromServing(item.carbs, quantity, servingSize),
      fat: scaleFromServing(item.fat, quantity, servingSize),
      consumedAt: body.consumedAt,
      micronutrients: item.nutrients.map((nutrient) => ({
        nutrientKey: nutrient.nutrientKey,
        amount: scaleFromServing(nutrient.amount, quantity, servingSize),
        unit: nutrient.unit,
      })),
    });
  }
}
