import {
  foodItemRepository,
  type FoodItemRepository,
} from '../repositories/food-item-repository.js';
import type { FoodSearchHit, FoodSearchProvider } from './food-search-provider.js';

export class PrismaFoodSearchProvider implements FoodSearchProvider {
  constructor(private readonly items: FoodItemRepository = foodItemRepository) {}

  async search(query: string): Promise<FoodSearchHit[]> {
    const needle = query.trim();
    if (!needle) {
      return [];
    }

    const { items } = await this.items.list({
      q: needle,
      skip: 0,
      take: 5,
    });

    return items.map((item) => ({
      foodName: item.name,
      quantity: item.servingSize,
      quantityUnit: item.servingUnit,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      micronutrients: item.nutrients.map((nutrient) => ({
        nutrientKey: nutrient.nutrientKey,
        amount: nutrient.amount,
        unit: nutrient.unit,
      })),
      source: 'catalog_estimate',
      notes: `${item.name} catalog serving. Catalog estimate, not a lab measurement.`,
    }));
  }
}
