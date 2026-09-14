import { apiRequest } from './client';
import type { Family, FamilyResponse } from './types';

export async function getFamily(): Promise<Family | null> {
  const result = await apiRequest<FamilyResponse>('/api/v1/family');
  return result.family;
}

export async function createFamily(name?: string): Promise<Family> {
  const result = await apiRequest<{ family: Family }>('/api/v1/family', {
    method: 'POST',
    body: name ? { name } : {},
  });
  return result.family;
}

export async function joinFamily(familyId: string): Promise<Family> {
  const result = await apiRequest<{ family: Family }>('/api/v1/family/join', {
    method: 'POST',
    body: { familyId },
  });
  return result.family;
}

export async function leaveFamily(): Promise<void> {
  await apiRequest<void>('/api/v1/family/leave', { method: 'POST' });
}
