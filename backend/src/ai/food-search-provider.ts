export type FoodSearchHit = {
  foodName: string;
  quantity: number;
  quantityUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  micronutrients: Array<{ nutrientKey: string; amount: number; unit: string }>;
  source: 'catalog_estimate';
  notes: string;
};

export interface FoodSearchProvider {
  search(query: string): Promise<FoodSearchHit[]>;
}
