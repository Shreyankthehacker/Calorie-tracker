import { AppError } from '../errors/app-error.js';
import {
  ProviderFailureError,
  ProviderTimeoutError,
  type NutritionExtractionProvider,
  type NutritionImageInput,
} from '../ai/nutrition-provider.js';
import {
  aiExtractionOutputSchema,
  normalizeExtractedNutrients,
  undetectedExtractionSchema,
  type ExtractionSource,
} from '../schemas/ai-extraction.js';
import type { MealType } from '../schemas/food-entries.js';

const PUBLIC_PROVIDER_FAILURE_MESSAGES = new Set([
  'AI extraction is not configured',
  'AI extraction failed',
  'AI provider failed',
  'AI provider returned an empty response',
  'AI provider returned malformed output',
  'AI provider rejected the API key',
  'AI model is not available for this key',
  'Could not read that image. Try another JPEG, PNG, or WebP photo.',
]);

export type PublicNutritionExtraction = {
  foodName: string;
  quantity: number;
  quantityUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  micronutrients: Array<{ nutrientKey: string; amount: number; unit: string }>;
  confidence: number | null;
  notes: string | null;
  source: ExtractionSource;
  mealType: MealType | null;
};

/**
 * Image → provider → Zod validation. Never writes a FoodEntry.
 * The client shows a review form; saving uses POST /food-entries.
 */
export class AIExtractionService {
  constructor(private readonly provider: NutritionExtractionProvider) {}

  async extractFromImage(input: NutritionImageInput): Promise<PublicNutritionExtraction> {
    let raw: unknown;
    try {
      raw = await this.provider.extractFromImage(input);
    } catch (error) {
      if (error instanceof ProviderTimeoutError) {
        throw new AppError(504, 'AI_PROVIDER_ERROR', 'AI provider timed out');
      }
      if (error instanceof ProviderFailureError) {
        const message = PUBLIC_PROVIDER_FAILURE_MESSAGES.has(error.message)
          ? error.message
          : 'AI extraction failed';
        throw new AppError(502, 'AI_PROVIDER_ERROR', message);
      }
      throw new AppError(502, 'AI_PROVIDER_ERROR', 'AI extraction failed');
    }

    if (undetectedExtractionSchema.safeParse(raw).success) {
      throw new AppError(422, 'VALIDATION_ERROR', 'No nutrition information detected');
    }

    const parsed = aiExtractionOutputSchema.safeParse(raw);
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'AI returned invalid nutrition data');
    }

    const nutrients = normalizeExtractedNutrients(parsed.data.micronutrients);
    if (!nutrients.ok) {
      throw new AppError(400, 'VALIDATION_ERROR', nutrients.message);
    }

    return {
      foodName: parsed.data.foodName,
      quantity: parsed.data.quantity,
      quantityUnit: parsed.data.quantityUnit,
      calories: parsed.data.calories,
      protein: parsed.data.protein,
      carbs: parsed.data.carbs,
      fat: parsed.data.fat,
      micronutrients: nutrients.value,
      confidence: parsed.data.confidence ?? null,
      notes: parsed.data.notes?.trim() ? parsed.data.notes.trim() : null,
      source: parsed.data.source,
      mealType: parsed.data.mealType ?? null,
    };
  }
}
