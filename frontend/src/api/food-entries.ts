import { apiRequest } from './client';
import type {
  FoodEntry,
  FoodEntryListParams,
  FoodEntryListResponse,
  FoodEntryUpdatePayload,
  FoodEntryWritePayload,
} from './types';

function toQuery(params: FoodEntryListParams): string {
  const search = new URLSearchParams();
  if (params.startDate) search.set('startDate', params.startDate);
  if (params.endDate) search.set('endDate', params.endDate);
  if (params.mealType) search.set('mealType', params.mealType);
  if (params.page) search.set('page', String(params.page));
  if (params.pageSize) search.set('pageSize', String(params.pageSize));
  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function listFoodEntries(
  params: FoodEntryListParams = {},
): Promise<FoodEntryListResponse> {
  return apiRequest<FoodEntryListResponse>(`/api/v1/food-entries${toQuery(params)}`);
}

export async function getFoodEntry(id: string): Promise<FoodEntry> {
  const result = await apiRequest<{ foodEntry: FoodEntry }>(`/api/v1/food-entries/${id}`);
  return result.foodEntry;
}

export async function createFoodEntry(payload: FoodEntryWritePayload): Promise<FoodEntry> {
  const result = await apiRequest<{ foodEntry: FoodEntry }>('/api/v1/food-entries', {
    method: 'POST',
    body: payload,
  });
  return result.foodEntry;
}

export async function updateFoodEntry(
  id: string,
  payload: FoodEntryUpdatePayload,
): Promise<FoodEntry> {
  const result = await apiRequest<{ foodEntry: FoodEntry }>(`/api/v1/food-entries/${id}`, {
    method: 'PUT',
    body: payload,
  });
  return result.foodEntry;
}

export async function deleteFoodEntry(id: string): Promise<void> {
  await apiRequest<void>(`/api/v1/food-entries/${id}`, { method: 'DELETE' });
}
