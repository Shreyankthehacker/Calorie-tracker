import { apiRequest } from './client';
import { PDF_MAX_UPLOAD_BYTES, type FoodEntryWritePayload, type PdfConfirmResponse, type PdfPreviewResponse } from './types';

export { PDF_MAX_UPLOAD_BYTES };

export function isSupportedPdf(file: File): boolean {
  const nameOk = file.name.toLowerCase().endsWith('.pdf');
  if (!nameOk) {
    return false;
  }
  if (file.type && file.type !== 'application/pdf') {
    return false;
  }
  return true;
}

export function isPdfOversized(file: File): boolean {
  return file.size > PDF_MAX_UPLOAD_BYTES;
}

export async function previewFoodDiary(file: File): Promise<PdfPreviewResponse> {
  const body = new FormData();
  body.append('file', file);
  return apiRequest<PdfPreviewResponse>('/api/v1/imports/food-diary/preview', {
    method: 'POST',
    body,
  });
}

export async function confirmFoodDiary(records: FoodEntryWritePayload[]): Promise<PdfConfirmResponse> {
  return apiRequest<PdfConfirmResponse>('/api/v1/imports/food-diary/confirm', {
    method: 'POST',
    body: { records },
  });
}
