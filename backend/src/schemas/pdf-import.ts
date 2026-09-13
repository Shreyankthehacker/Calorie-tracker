import { z } from 'zod';
import { foodEntryCreateBodySchema } from './food-entries.js';

export const PDF_MAX_RECORDS = 100;

export const foodDiaryConfirmBodySchema = z
  .object({
    records: z.array(foodEntryCreateBodySchema.omit({ userId: true })).min(1).max(PDF_MAX_RECORDS),
  })
  .strict();

export type FoodDiaryConfirmBody = z.infer<typeof foodDiaryConfirmBodySchema>;
export type FoodDiaryConfirmRecord = FoodDiaryConfirmBody['records'][number];
