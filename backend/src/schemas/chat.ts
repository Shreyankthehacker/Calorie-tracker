import { z } from 'zod';
import { dateOnlySchema, foodEntryCreateBodySchema, mealTypeSchema } from './food-entries.js';
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

export const logMealInputSchema = foodEntryCreateBodySchema.omit({ userId: true });

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
