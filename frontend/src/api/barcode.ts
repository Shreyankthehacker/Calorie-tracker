import { apiRequest } from './client';
import type { BarcodeLookupResponse, BarcodeProduct } from './types';

export async function lookupBarcode(barcode: string): Promise<BarcodeProduct> {
  const result = await apiRequest<BarcodeLookupResponse>('/api/v1/barcode/lookup', {
    method: 'POST',
    body: { barcode },
  });
  return result.product;
}
