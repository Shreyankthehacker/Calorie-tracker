import { apiRequest } from './client';
import type { Goal, GoalWritePayload } from './types';

export async function getGoal(): Promise<Goal> {
  const result = await apiRequest<{ goal: Goal }>('/api/v1/goals');
  return result.goal;
}

export async function createGoal(payload: GoalWritePayload): Promise<Goal> {
  const result = await apiRequest<{ goal: Goal }>('/api/v1/goals', {
    method: 'POST',
    body: payload,
  });
  return result.goal;
}

export async function upsertGoal(payload: GoalWritePayload): Promise<Goal> {
  const result = await apiRequest<{ goal: Goal }>('/api/v1/goals', {
    method: 'PUT',
    body: payload,
  });
  return result.goal;
}

export async function deleteGoal(): Promise<void> {
  await apiRequest<void>('/api/v1/goals', { method: 'DELETE' });
}
