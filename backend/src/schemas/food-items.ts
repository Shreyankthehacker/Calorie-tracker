import { z } from 'zod';
import { mealTypeSchema, positiveQuantity } from './food-entries.js';

export const foodItemIdParamsSchema = z.object({
  id: z.string().trim().min(1).max(128),
});

export const foodItemListQuerySchema = z
  .object({
    mealType: mealTypeSchema.optional(),
    q: z.preprocess((value) => {
      if (typeof value !== 'string') return value;
      const trimmed = value.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    }, z.string().trim().min(1).max(100).optional()),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

export const foodItemLogBodySchema = z
  .object({
    quantity: positiveQuantity,
    mealType: mealTypeSchema,
    consumedAt: z.coerce.date({
      required_error: 'consumedAt is required',
      invalid_type_error: 'consumedAt must be a valid date-time',
    }),
  })
  .strict();

export type FoodItemListQuery = z.infer<typeof foodItemListQuerySchema>;
export type FoodItemLogBody = z.infer<typeof foodItemLogBodySchema>;
