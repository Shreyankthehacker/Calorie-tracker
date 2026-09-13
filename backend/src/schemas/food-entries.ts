import { z } from 'zod';

export const mealTypeSchema = z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS']);

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

export const nutrientInputSchema = z.object({
  nutrientKey: z.string().trim().min(1).max(64),
  amount: nonNegativeNumber,
  unit: z.string().trim().min(1).max(32),
});

export function canonicalizeNutrientKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

export type NormalizedNutrient = {
  nutrientKey: string;
  amount: number;
  unit: string;
};

export function tryNormalizeNutrients(
  nutrients: Array<z.infer<typeof nutrientInputSchema>> | undefined,
): { ok: true; value: NormalizedNutrient[] } | { ok: false; message: string } {
  if (!nutrients || nutrients.length === 0) {
    return { ok: true, value: [] };
  }

  const seen = new Set<string>();
  const normalized: NormalizedNutrient[] = [];

  for (const nutrient of nutrients) {
    const nutrientKey = canonicalizeNutrientKey(nutrient.nutrientKey);
    if (!nutrientKey) {
      return { ok: false, message: 'Invalid nutrient key' };
    }
    if (seen.has(nutrientKey)) {
      return { ok: false, message: 'Duplicate nutrient keys are not allowed' };
    }
    seen.add(nutrientKey);
    normalized.push({
      nutrientKey,
      amount: nutrient.amount,
      unit: nutrient.unit.trim(),
    });
  }

  return { ok: true, value: normalized };
}

export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
  .refine((value) => {
    const [yearStr, monthStr, dayStr] = value.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
      return false;
    }
    const probe = new Date(Date.UTC(year, month - 1, day));
    return (
      probe.getUTCFullYear() === year &&
      probe.getUTCMonth() + 1 === month &&
      probe.getUTCDate() === day
    );
  }, 'Invalid calendar date');

export const foodEntryCreateBodySchema = z
  .object({
    mealType: mealTypeSchema,
    foodName: z.string().trim().min(1).max(200),
    quantity: positiveQuantity,
    quantityUnit: z.string().trim().min(1).max(32),
    calories: nonNegativeNumber,
    protein: nonNegativeNumber,
    carbs: nonNegativeNumber,
    fat: nonNegativeNumber,
    consumedAt: z.coerce.date({
      required_error: 'consumedAt is required',
      invalid_type_error: 'consumedAt must be a valid date-time',
    }),
    micronutrients: z.array(nutrientInputSchema).max(50).optional(),
    userId: z.string().optional(),
  })
  .strict();

export const foodEntryUpdateBodySchema = z
  .object({
    mealType: mealTypeSchema.optional(),
    foodName: z.string().trim().min(1).max(200).optional(),
    quantity: positiveQuantity.optional(),
    quantityUnit: z.string().trim().min(1).max(32).optional(),
    calories: nonNegativeNumber.optional(),
    protein: nonNegativeNumber.optional(),
    carbs: nonNegativeNumber.optional(),
    fat: nonNegativeNumber.optional(),
    consumedAt: z.coerce
      .date({
        invalid_type_error: 'consumedAt must be a valid date-time',
      })
      .optional(),
    micronutrients: z.array(nutrientInputSchema).max(50).optional(),
    userId: z.string().optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.mealType !== undefined ||
      value.foodName !== undefined ||
      value.quantity !== undefined ||
      value.quantityUnit !== undefined ||
      value.calories !== undefined ||
      value.protein !== undefined ||
      value.carbs !== undefined ||
      value.fat !== undefined ||
      value.consumedAt !== undefined ||
      value.micronutrients !== undefined,
    { message: 'At least one field is required' },
  );

export const foodEntryIdParamsSchema = z.object({
  id: z.string().trim().min(1).max(128),
});

export const foodEntryListQuerySchema = z
  .object({
    startDate: dateOnlySchema.optional(),
    endDate: dateOnlySchema.optional(),
    mealType: mealTypeSchema.optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
    userId: z.string().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.startDate && value.endDate && value.startDate > value.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'startDate must be on or before endDate',
        path: ['startDate'],
      });
    }
  });

export type MealType = z.infer<typeof mealTypeSchema>;
export type NutrientInput = z.infer<typeof nutrientInputSchema>;
export type FoodEntryCreateBody = z.infer<typeof foodEntryCreateBodySchema>;
export type FoodEntryUpdateBody = z.infer<typeof foodEntryUpdateBodySchema>;
export type FoodEntryListQuery = z.infer<typeof foodEntryListQuerySchema>;
