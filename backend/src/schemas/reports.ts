import { z } from 'zod';
import { dateOnlySchema } from './food-entries.js';
import { inclusiveDayCount } from '../lib/calendar-date.js';

/** Inclusive maximum number of calendar days a report query may span. */
export const MAX_REPORT_RANGE_DAYS = 93;

/** Consecutive tracked days for `currentStreak` are counted from today backwards. */
export const STREAK_LOOKBACK_DAYS = 90;

const ignoredClientUserId = z.string().optional();

export const reportTodayQuerySchema = z
  .object({
    userId: ignoredClientUserId,
  })
  .strict();

export const reportRangeQuerySchema = z
  .object({
    startDate: dateOnlySchema,
    endDate: dateOnlySchema,
    userId: ignoredClientUserId,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.startDate > value.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'startDate must be on or before endDate',
        path: ['startDate'],
      });
      return;
    }

    const days = inclusiveDayCount(value.startDate, value.endDate);
    if (days > MAX_REPORT_RANGE_DAYS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Report range cannot exceed ${MAX_REPORT_RANGE_DAYS} days`,
        path: ['endDate'],
      });
    }
  });

export type ReportTodayQuery = z.infer<typeof reportTodayQuerySchema>;
export type ReportRangeQuery = z.infer<typeof reportRangeQuerySchema>;
