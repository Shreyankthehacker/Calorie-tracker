import type { Env } from '../config/env.js';
import {
  BarcodeProviderFailureError,
  BarcodeProviderTimeoutError,
  type BarcodeLookupProvider,
  type BarcodeProductLookup,
} from './barcode-provider.js';

type OffProduct = {
  product_name?: unknown;
  generic_name?: unknown;
  brands?: unknown;
  image_front_small_url?: unknown;
  image_url?: unknown;
  nutriments?: Record<string, unknown>;
};

type OffResponse = {
  status?: unknown;
  product?: OffProduct;
};

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function caloriesFromNutriments(nutriments: Record<string, unknown>): number | null {
  const kcal100g = asFiniteNumber(nutriments['energy-kcal_100g']);
  if (kcal100g != null && kcal100g >= 0) {
    return round1(kcal100g);
  }
  const kcal = asFiniteNumber(nutriments['energy-kcal']);
  if (kcal != null && kcal >= 0) {
    return round1(kcal);
  }
  const kj100g = asFiniteNumber(nutriments['energy-kj_100g']) ?? asFiniteNumber(nutriments.energy_100g);
  if (kj100g != null && kj100g >= 0) {
    return round1(kj100g / 4.184);
  }
  return null;
}

function microsFromNutriments(
  nutriments: Record<string, unknown>,
): Array<{ nutrientKey: string; amount: number; unit: string }> {
  const micros: Array<{ nutrientKey: string; amount: number; unit: string }> = [];
  const sodiumG = asFiniteNumber(nutriments.sodium_100g);
  if (sodiumG != null && sodiumG >= 0) {
    micros.push({ nutrientKey: 'sodium', amount: round1(sodiumG * 1000), unit: 'mg' });
  }
  const fiber = asFiniteNumber(nutriments.fiber_100g);
  if (fiber != null && fiber >= 0) {
    micros.push({ nutrientKey: 'fiber', amount: round1(fiber), unit: 'g' });
  }
  return micros;
}

export class OpenFoodFactsBarcodeProvider implements BarcodeLookupProvider {
  constructor(private readonly env: Env) {}

  async lookup(barcode: string): Promise<BarcodeProductLookup | null> {
    const abortSignal = AbortSignal.timeout(this.env.AI_PROVIDER_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'CalorieTracker/1.0 (personal calorie tracker; barcode lookup)',
        },
        signal: abortSignal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new BarcodeProviderTimeoutError();
      }
      throw new BarcodeProviderFailureError('Barcode provider failed');
    }

    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new BarcodeProviderFailureError('Barcode provider failed');
    }

    let payload: OffResponse;
    try {
      payload = (await response.json()) as OffResponse;
    } catch {
      throw new BarcodeProviderFailureError('Barcode provider returned malformed output');
    }

    if (payload.status !== 1 || !payload.product) {
      return null;
    }

    const nutriments = payload.product.nutriments ?? {};
    const calories = caloriesFromNutriments(nutriments);
    const protein = asFiniteNumber(nutriments.proteins_100g);
    const carbs = asFiniteNumber(nutriments.carbohydrates_100g);
    const fat = asFiniteNumber(nutriments.fat_100g);
    const name =
      asTrimmedString(payload.product.product_name) ?? asTrimmedString(payload.product.generic_name);

    if (!name || calories == null || protein == null || carbs == null || fat == null) {
      return null;
    }
    if (protein < 0 || carbs < 0 || fat < 0) {
      return null;
    }

    const imageUrl =
      asTrimmedString(payload.product.image_front_small_url) ?? asTrimmedString(payload.product.image_url);

    return {
      barcode,
      name,
      brand: asTrimmedString(payload.product.brands),
      quantity: 100,
      quantityUnit: 'g',
      calories,
      protein: round1(protein),
      carbs: round1(carbs),
      fat: round1(fat),
      micronutrients: microsFromNutriments(nutriments),
      imageUrl,
      source: 'open_food_facts',
    };
  }
}
