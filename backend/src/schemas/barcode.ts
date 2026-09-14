import { z } from 'zod';
import { canonicalizeNutrientKey, nutrientInputSchema, positiveQuantity } from './food-entries.js';

const nonNegativeNumber = z
  .number({
    required_error: 'Value is required',
    invalid_type_error: 'Value must be a number',
  })
  .finite()
  .nonnegative();

export const barcodeLookupBodySchema = z.object({
  barcode: z
    .string()
    .trim()
    .regex(/^[0-9]{6,14}$/, 'Barcode must be 6–14 digits'),
});

export const barcodeProductSchema = z.object({
  barcode: z.string().trim().min(6).max(14),
  name: z.string().trim().min(1).max(200),
  brand: z.string().trim().max(200).nullable(),
  quantity: positiveQuantity,
  quantityUnit: z.string().trim().min(1).max(32),
  calories: nonNegativeNumber,
  protein: nonNegativeNumber,
  carbs: nonNegativeNumber,
  fat: nonNegativeNumber,
  micronutrients: z.array(nutrientInputSchema).max(40).default([]),
  imageUrl: z.string().nullable().optional(),
  source: z.literal('open_food_facts'),
});

export type BarcodeLookupBody = z.infer<typeof barcodeLookupBodySchema>;
export type BarcodeProduct = z.infer<typeof barcodeProductSchema>;

export function normalizeBarcodeNutrients(
  nutrients: Array<{ nutrientKey: string; amount: number; unit: string }>,
): { ok: true; value: Array<{ nutrientKey: string; amount: number; unit: string }> } | { ok: false; message: string } {
  const seen = new Set<string>();
  const value: Array<{ nutrientKey: string; amount: number; unit: string }> = [];
  for (const nutrient of nutrients) {
    const nutrientKey = canonicalizeNutrientKey(nutrient.nutrientKey);
    if (!nutrientKey) {
      return { ok: false, message: 'Barcode product had an invalid micronutrient key' };
    }
    if (seen.has(nutrientKey)) {
      continue;
    }
    seen.add(nutrientKey);
    value.push({
      nutrientKey,
      amount: nutrient.amount,
      unit: nutrient.unit.trim(),
    });
  }
  return { ok: true, value };
}
