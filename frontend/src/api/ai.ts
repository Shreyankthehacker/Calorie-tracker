import { apiRequest } from './client';
import { AI_MAX_UPLOAD_BYTES, type NutritionExtractResponse, type NutritionExtraction } from './types';

export { AI_MAX_UPLOAD_BYTES };
export const AI_ACCEPTED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as const;

export function isSupportedAiImage(file: File): boolean {
  return (AI_ACCEPTED_MIME as readonly string[]).includes(file.type);
}

export function isAiImageOversized(file: File): boolean {
  return file.size > AI_MAX_UPLOAD_BYTES;
}

export async function extractNutrition(file: File): Promise<NutritionExtraction> {
  const body = new FormData();
  body.append('image', file);
  const result = await apiRequest<NutritionExtractResponse>('/api/v1/ai/nutrition-extract', {
    method: 'POST',
    body,
  });
  return result.extraction;
}
