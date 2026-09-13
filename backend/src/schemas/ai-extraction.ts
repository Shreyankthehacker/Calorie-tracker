import { z } from 'zod';
import {
  canonicalizeNutrientKey,
  mealTypeSchema,
  nutrientInputSchema,
} from './food-entries.js';

const nonNegativeNumber = z
  .number({
    required_error: 'Value is required',
    invalid_type_error: 'Value must be a number',
  })
  .finite()
  .nonnegative();

const positiveQuantity = z
  .number({
    required_error: 'Value is required',
    invalid_type_error: 'Value must be a number',
  })
  .finite()
  .positive();

export const extractionSourceSchema = z.enum(['label', 'photo_estimate', 'unknown']);

export const aiExtractionOutputSchema = z
  .object({
    detected: z.boolean().optional().default(true),
    foodName: z.string().trim().min(1).max(200),
    quantity: positiveQuantity,
    quantityUnit: z.string().trim().min(1).max(32),
    calories: nonNegativeNumber,
    protein: nonNegativeNumber,
    carbs: nonNegativeNumber,
    fat: nonNegativeNumber,
    micronutrients: z.array(nutrientInputSchema).max(50).optional().default([]),
    confidence: z.number().min(0).max(1).nullable().optional(),
    notes: z.string().trim().max(500).nullable().optional(),
    source: extractionSourceSchema.optional().default('unknown'),
    mealType: mealTypeSchema.nullable().optional(),
  })
  .strict();

export const undetectedExtractionSchema = z
  .object({
    detected: z.literal(false),
  })
  .passthrough();

export type AiExtractionOutput = z.infer<typeof aiExtractionOutputSchema>;
export type ExtractionSource = z.infer<typeof extractionSourceSchema>;

export function normalizeExtractedNutrients(
  nutrients: Array<z.infer<typeof nutrientInputSchema>>,
): { ok: true; value: Array<{ nutrientKey: string; amount: number; unit: string }> } | { ok: false; message: string } {
  const seen = new Set<string>();
  const normalized: Array<{ nutrientKey: string; amount: number; unit: string }> = [];

  for (const nutrient of nutrients) {
    if (nutrient.amount < 0) {
      return { ok: false, message: 'Micronutrient amounts must be zero or greater' };
    }
    const nutrientKey = canonicalizeNutrientKey(nutrient.nutrientKey);
    if (!nutrientKey) {
      return { ok: false, message: 'Invalid nutrient key' };
    }
    if (seen.has(nutrientKey)) {
      return { ok: false, message: 'Duplicate nutrient keys are not allowed' };
    }
    seen.add(nutrientKey);
    const unit = nutrient.unit.trim();
    if (!unit) {
      return { ok: false, message: 'Micronutrient unit is required' };
    }
    normalized.push({
      nutrientKey,
      amount: nutrient.amount,
      unit,
    });
  }

  return { ok: true, value: normalized };
}
