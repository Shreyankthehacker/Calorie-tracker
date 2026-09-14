import { AppError } from '../errors/app-error.js';
import {
  BarcodeProviderFailureError,
  BarcodeProviderTimeoutError,
  type BarcodeLookupProvider,
} from '../barcode/barcode-provider.js';
import {
  barcodeProductSchema,
  normalizeBarcodeNutrients,
  type BarcodeProduct,
} from '../schemas/barcode.js';

export class BarcodeLookupService {
  constructor(private readonly provider: BarcodeLookupProvider) {}

  async lookup(barcode: string): Promise<BarcodeProduct> {
    let raw: Awaited<ReturnType<BarcodeLookupProvider['lookup']>>;
    try {
      raw = await this.provider.lookup(barcode);
    } catch (error) {
      if (error instanceof BarcodeProviderTimeoutError) {
        throw new AppError(504, 'BARCODE_PROVIDER_ERROR', 'Barcode provider timed out');
      }
      if (error instanceof BarcodeProviderFailureError) {
        throw new AppError(502, 'BARCODE_PROVIDER_ERROR', 'Barcode lookup failed');
      }
      throw new AppError(502, 'BARCODE_PROVIDER_ERROR', 'Barcode lookup failed');
    }

    if (!raw) {
      throw new AppError(404, 'NOT_FOUND', 'No product found for that barcode');
    }

    const parsed = barcodeProductSchema.safeParse(raw);
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Barcode provider returned invalid nutrition data');
    }

    const nutrients = normalizeBarcodeNutrients(parsed.data.micronutrients);
    if (!nutrients.ok) {
      throw new AppError(400, 'VALIDATION_ERROR', nutrients.message);
    }

    return {
      ...parsed.data,
      micronutrients: nutrients.value,
      imageUrl: parsed.data.imageUrl ?? null,
    };
  }
}
