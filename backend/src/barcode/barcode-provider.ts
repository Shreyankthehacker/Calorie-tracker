export class BarcodeProviderTimeoutError extends Error {
  constructor(message = 'Barcode provider timed out') {
    super(message);
    this.name = 'BarcodeProviderTimeoutError';
  }
}

export class BarcodeProviderFailureError extends Error {
  constructor(message = 'Barcode provider failed') {
    super(message);
    this.name = 'BarcodeProviderFailureError';
  }
}

export type BarcodeProductLookup = {
  barcode: string;
  name: string;
  brand: string | null;
  quantity: number;
  quantityUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  micronutrients: Array<{ nutrientKey: string; amount: number; unit: string }>;
  imageUrl: string | null;
  source: 'open_food_facts';
};

export interface BarcodeLookupProvider {
  lookup(barcode: string): Promise<BarcodeProductLookup | null>;
}
