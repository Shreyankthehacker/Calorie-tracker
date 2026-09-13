import { GoogleGenAI } from '@google/genai';
import type { Env } from '../config/env.js';
import { parseModelJson } from './parse-model-json.js';
import {
  ProviderFailureError,
  ProviderTimeoutError,
  type NutritionExtractionProvider,
  type NutritionImageInput,
} from './nutrition-provider.js';

const SYSTEM_INSTRUCTION = `You extract nutrition data from food photographs and nutrition labels for a calorie tracker.

Rules:
- Return JSON only, matching the schema. No markdown.
- Extract only information supported by the image. Do not invent micronutrients that are not visible or reasonably inferable.
- Prefer explicit nutrition-label numbers over visual estimates.
- For ordinary food photos, treat values as uncertain estimates.
- Never report negative calories, macros, quantity, or micronutrient amounts.
- Normalize nutrient names to canonical snake_case keys when possible (iron, calcium, vitamin_c, sodium, potassium, vitamin_d).
- If the image is not food and has no nutrition label, set detected to false and do not invent foodName or macros.
- Do not claim medical accuracy. Put uncertainty in notes and confidence (0-1).
- mealType is an optional suggestion only (BREAKFAST, LUNCH, DINNER, SNACKS) or null. Do not guess if unclear.
- source must be "label" when a nutrition facts label is the primary source, "photo_estimate" for food photos, or "unknown".`;

const USER_PROMPT = `Inspect the image. If a nutrition facts label is visible, use those printed values. If it is a plate of food, estimate a single serving only if the food is recognizable.

Respond with JSON:
{
  "detected": true,
  "foodName": "string",
  "quantity": 1,
  "quantityUnit": "serving",
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0,
  "micronutrients": [{"nutrientKey": "iron", "amount": 0, "unit": "mg"}],
  "confidence": 0.0,
  "notes": "string",
  "source": "label" | "photo_estimate" | "unknown",
  "mealType": null
}`;

export class GeminiNutritionProvider implements NutritionExtractionProvider {
  constructor(private readonly env: Env) {}

  async extractFromImage(input: NutritionImageInput): Promise<unknown> {
    if (!this.env.GEMINI_API_KEY) {
      throw new ProviderFailureError('AI extraction is not configured');
    }

    const ai = new GoogleGenAI({ apiKey: this.env.GEMINI_API_KEY });
    const abortSignal = AbortSignal.timeout(this.env.AI_PROVIDER_TIMEOUT_MS);

    try {
      const response = await ai.models.generateContent({
        model: this.env.GEMINI_MODEL,
        contents: [
          {
            inlineData: {
              mimeType: input.mimeType,
              data: input.buffer.toString('base64'),
            },
          },
          { text: USER_PROMPT },
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          temperature: 0.1,
          abortSignal,
        },
      });

      const text = response.text;
      if (!text) {
        throw new ProviderFailureError('AI provider returned an empty response');
      }
      return parseModelJson(text);
    } catch (error) {
      if (error instanceof ProviderFailureError || error instanceof ProviderTimeoutError) {
        throw error;
      }
      if (abortSignal.aborted || isAbortError(error)) {
        throw new ProviderTimeoutError();
      }
      console.error('[gemini]', sanitizeProviderError(error));
      throw classifyProviderError(error);
    }
  }
}

function sanitizeProviderError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'unknown error';
  return message
    .replace(/key=[^&\s]+/gi, 'key=REDACTED')
    .replace(/AIza[0-9A-Za-z_-]+/g, 'REDACTED');
}

function classifyProviderError(error: unknown): ProviderFailureError | ProviderTimeoutError {
  if (error instanceof ProviderFailureError || error instanceof ProviderTimeoutError) {
    return error;
  }
  if (error instanceof Error && error.message === 'invalid_model_json') {
    return new ProviderFailureError('AI provider returned malformed output');
  }
  const text = sanitizeProviderError(error).toLowerCase();
  if (text.includes('unable to process input image')) {
    return new ProviderFailureError(
      'Could not read that image. Try another JPEG, PNG, or WebP photo.',
    );
  }
  if (text.includes('api key') || text.includes('permission') || text.includes('unauthenticated')) {
    return new ProviderFailureError('AI provider rejected the API key');
  }
  if (text.includes('not found') || text.includes('not supported')) {
    return new ProviderFailureError('AI model is not available for this key');
  }
  return new ProviderFailureError('AI provider failed');
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name: string }).name === 'AbortError'
  );
}
