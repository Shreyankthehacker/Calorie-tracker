import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma.js';

export type MacroTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type DailyMacroRow = MacroTotals & {
  date: string;
};

export type MicronutrientTotal = {
  nutrientKey: string;
  amount: number;
  unit: string;
};

function asNumber(value: unknown): number {
  if (value == null) {
    return 0;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'bigint') {
    return Number(value);
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (
    typeof value === 'object' &&
    'toNumber' in value &&
    typeof (value as { toNumber: unknown }).toNumber === 'function'
  ) {
    const parsed = (value as { toNumber: () => number }).toNumber();
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export class ReportRepository {
  async sumMacros(
    userId: string,
    consumedAtGte: Date,
    consumedAtLte: Date,
  ): Promise<MacroTotals> {
    const result = await prisma.foodEntry.aggregate({
      where: {
        userId,
        consumedAt: {
          gte: consumedAtGte,
          lte: consumedAtLte,
        },
      },
      _sum: {
        calories: true,
        protein: true,
        carbs: true,
        fat: true,
      },
    });

    return {
      calories: result._sum.calories ?? 0,
      protein: result._sum.protein ?? 0,
      carbs: result._sum.carbs ?? 0,
      fat: result._sum.fat ?? 0,
    };
  }

  /**
   * Groups macros by the user's local calendar day in PostgreSQL.
   * `consumed_at` is Prisma `TIMESTAMP` (no time zone) storing UTC wall time,
   * so interpret as UTC first, then convert to the validated IANA zone.
   */
  async aggregateDailyMacros(
    userId: string,
    timeZone: string,
    consumedAtGte: Date,
    consumedAtLte: Date,
  ): Promise<DailyMacroRow[]> {
    const rows = await prisma.$queryRaw<
      Array<{ date: string; calories: unknown; protein: unknown; carbs: unknown; fat: unknown }>
    >(Prisma.sql`
      SELECT
        timezone(${timeZone}, timezone('UTC', fe.consumed_at))::date::text AS date,
        COALESCE(SUM(fe.calories), 0) AS calories,
        COALESCE(SUM(fe.protein), 0) AS protein,
        COALESCE(SUM(fe.carbs), 0) AS carbs,
        COALESCE(SUM(fe.fat), 0) AS fat
      FROM food_entries fe
      WHERE fe.user_id = ${userId}
        AND fe.consumed_at >= ${consumedAtGte}
        AND fe.consumed_at <= ${consumedAtLte}
      GROUP BY 1
      ORDER BY 1 ASC
    `);

    return rows.map((row) => ({
      date: row.date,
      calories: asNumber(row.calories),
      protein: asNumber(row.protein),
      carbs: asNumber(row.carbs),
      fat: asNumber(row.fat),
    }));
  }

  async aggregateMicronutrients(
    userId: string,
    consumedAtGte: Date,
    consumedAtLte: Date,
  ): Promise<MicronutrientTotal[]> {
    const rows = await prisma.$queryRaw<
      Array<{ nutrientKey: string; amount: unknown; unit: string }>
    >(Prisma.sql`
      SELECT
        n.nutrient_key AS "nutrientKey",
        n.unit AS unit,
        COALESCE(SUM(n.amount), 0) AS amount
      FROM food_entry_nutrients n
      INNER JOIN food_entries fe ON fe.id = n.food_entry_id
      WHERE fe.user_id = ${userId}
        AND fe.consumed_at >= ${consumedAtGte}
        AND fe.consumed_at <= ${consumedAtLte}
      GROUP BY n.nutrient_key, n.unit
      ORDER BY n.nutrient_key ASC, n.unit ASC
    `);

    return rows.map((row) => ({
      nutrientKey: row.nutrientKey,
      amount: asNumber(row.amount),
      unit: row.unit,
    }));
  }
}

export const reportRepository = new ReportRepository();
