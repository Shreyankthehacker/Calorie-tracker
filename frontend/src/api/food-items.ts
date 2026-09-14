import { apiRequest } from './client';
import type {
  FoodEntry,
  FoodItem,
  FoodItemListParams,
  FoodItemListResponse,
  FoodItemLogPayload,
} from './types';

function toQuery(params: FoodItemListParams): string {
  const search = new URLSearchParams();
  if (params.mealType) search.set('mealType', params.mealType);
  if (params.q) search.set('q', params.q);
  if (params.page) search.set('page', String(params.page));
  if (params.pageSize) search.set('pageSize', String(params.pageSize));
  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function listFoodItems(params: FoodItemListParams = {}): Promise<FoodItemListResponse> {
  return apiRequest<FoodItemListResponse>(`/api/v1/food-items${toQuery(params)}`);
}

export async function getFoodItem(id: string): Promise<FoodItem> {
  const result = await apiRequest<{ foodItem: FoodItem }>(`/api/v1/food-items/${id}`);
  return result.foodItem;
}

export async function logFoodItem(id: string, payload: FoodItemLogPayload): Promise<FoodEntry> {
  const result = await apiRequest<{ foodEntry: FoodEntry }>(`/api/v1/food-items/${id}/entries`, {
    method: 'POST',
    body: payload,
  });
  return result.foodEntry;
}
