import { z } from 'zod';
import { dateOnlySchema, mealTypeSchema } from './food-entries.js';
import { sanitizeFoodName } from '../lib/food-name.js';
import { inclusiveDayCount } from '../lib/calendar-date.js';
import { MAX_REPORT_RANGE_DAYS } from './reports.js';

export const CHAT_MAX_MESSAGE_CHARS = 4000;
export const CHAT_MAX_HISTORY = 20;
export const CHAT_MAX_TOOL_ROUNDS = 5;

export const chatHistoryItemSchema = z
  .object({
    role: z.enum(['user', 'assistant']),
    content: z.string().trim().min(1).max(CHAT_MAX_MESSAGE_CHARS),
  })
  .strict();

export const chatRequestSchema = z
  .object({
    message: z.string().trim().min(1).max(CHAT_MAX_MESSAGE_CHARS),
    history: z.array(chatHistoryItemSchema).max(CHAT_MAX_HISTORY).optional(),
  })
  .strict();

const chatNonNegative = z.coerce.number().finite().nonnegative();
const chatPositive = z.coerce.number().finite().positive();
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const chatMealTypeSchema = z.preprocess((value) => {
  if (typeof value === 'string') {
    return value.trim().toUpperCase();
  }
  return value;
}, mealTypeSchema);

const chatNutrientSchema = z
  .object({
    nutrientKey: z.string().trim().min(1).max(64),
    amount: chatNonNegative,
    unit: z.string().trim().min(1).max(32),
  })
  .strip();

function parseConsumedAt(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const millis = value < 1e12 ? value * 1000 : value;
    const fromNumber = new Date(millis);
    if (!Number.isNaN(fromNumber.getTime())) {
      return fromNumber;
    }
  }
  if (typeof value === 'string' && value.trim()) {
    const fromString = new Date(value);
    if (!Number.isNaN(fromString.getTime())) {
      return fromString;
    }
  }
  return null;
}

function consumedAtOrNow(value: unknown): Date {
  const parsed = parseConsumedAt(value);
  const now = Date.now();
  if (!parsed) {
    return new Date(now);
  }
  const time = parsed.getTime();
  if (time < now - THIRTY_DAYS_MS || time > now + ONE_DAY_MS) {
    return new Date(now);
  }
  return parsed;
}

export const logMealInputSchema = z
  .object({
    mealType: chatMealTypeSchema,
    foodName: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .transform((value) => sanitizeFoodName(value)),
    quantity: chatPositive,
    quantityUnit: z.string().trim().min(1).max(64),
    calories: chatNonNegative,
    protein: chatNonNegative,
    carbs: chatNonNegative,
    fat: chatNonNegative,
    consumedAt: z.preprocess(consumedAtOrNow, z.date()),
    micronutrients: z.array(chatNutrientSchema).max(50).optional(),
  })
  .strip();

export const getGoalsInputSchema = z.object({}).strict();

export const getNutritionSummaryInputSchema = z
  .object({
    startDate: dateOnlySchema.optional(),
    endDate: dateOnlySchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (Boolean(value.startDate) !== Boolean(value.endDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'startDate and endDate must be provided together',
        path: ['startDate'],
      });
      return;
    }
    if (value.startDate && value.endDate) {
      if (value.startDate > value.endDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'startDate must be on or before endDate',
          path: ['startDate'],
        });
        return;
      }
      if (inclusiveDayCount(value.startDate, value.endDate) > MAX_REPORT_RANGE_DAYS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Report range cannot exceed ${MAX_REPORT_RANGE_DAYS} days`,
          path: ['endDate'],
        });
      }
    }
  });

export const getWeeklyReportInputSchema = z
  .object({
    startDate: dateOnlySchema.optional(),
  })
  .strict();

export const searchFoodInputSchema = z
  .object({
    query: z.string().trim().min(1).max(120),
  })
  .strict();

export const listMealsInputSchema = z
  .object({
    startDate: dateOnlySchema.optional(),
    endDate: dateOnlySchema.optional(),
    period: z.enum(['today', 'week']).optional(),
    mealType: mealTypeSchema.optional(),
    page: z.number().int().min(1).max(100).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (Boolean(value.startDate) !== Boolean(value.endDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'startDate and endDate must be provided together',
        path: ['startDate'],
      });
      return;
    }
    if (value.startDate && value.endDate) {
      if (value.startDate > value.endDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'startDate must be on or before endDate',
          path: ['startDate'],
        });
        return;
      }
      if (inclusiveDayCount(value.startDate, value.endDate) > MAX_REPORT_RANGE_DAYS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Report range cannot exceed ${MAX_REPORT_RANGE_DAYS} days`,
          path: ['endDate'],
        });
      }
    }
  });

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type LogMealInput = z.infer<typeof logMealInputSchema>;
export type GetNutritionSummaryInput = z.infer<typeof getNutritionSummaryInputSchema>;
export type GetWeeklyReportInput = z.infer<typeof getWeeklyReportInputSchema>;
export type SearchFoodInput = z.infer<typeof searchFoodInputSchema>;
export type ListMealsInput = z.infer<typeof listMealsInputSchema>;
