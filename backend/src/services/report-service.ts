import {
  calendarDateInTimeZone,
  calendarDayEndUtc,
  calendarDayStartUtc,
  eachCalendarDateInclusive,
  inclusiveDayCount,
  resolveTimeZone,
} from '../lib/calendar-date.js';
import { resolveOwnerId } from '../ownership/ownership.js';
import { goalRepository, type GoalRepository } from '../repositories/goal-repository.js';
import {
  reportRepository,
  type DailyMacroRow,
  type MacroTotals,
  type MicronutrientTotal,
  type ReportRepository,
} from '../repositories/report-repository.js';
import { userRepository, type UserRepository } from '../repositories/user-repository.js';

export type TodayReport = MacroTotals & {
  date: string;
  timezone: string;
};

export type CalorieTrendReport = {
  timezone: string;
  startDate: string;
  endDate: string;
  data: Array<{ date: string; calories: number }>;
  totals: { calories: number };
};

export type MacroTrendReport = {
  timezone: string;
  startDate: string;
  endDate: string;
  data: Array<{ date: string; protein: number; carbs: number; fat: number }>;
  totals: { protein: number; carbs: number; fat: number };
};

export type MicronutrientReport = {
  timezone: string;
  startDate: string;
  endDate: string;
  data: MicronutrientTotal[];
};

export type GoalVsActualReport = {
  timezone: string;
  startDate: string;
  endDate: string;
  dayCount: number;
  dailyGoal: MacroTotals | null;
  goal: MacroTotals | null;
  actual: MacroTotals;
};

function emptyMacros(): MacroTotals {
  return { calories: 0, protein: 0, carbs: 0, fat: 0 };
}

function fillDailySeries(
  startDate: string,
  endDate: string,
  rows: DailyMacroRow[],
): DailyMacroRow[] {
  const byDate = new Map(rows.map((row) => [row.date, row]));
  return eachCalendarDateInclusive(startDate, endDate).map((date) => {
    const row = byDate.get(date);
    return row ?? { date, ...emptyMacros() };
  });
}

function scaleGoal(
  daily: { dailyCalorieTarget: number; proteinTarget: number; carbTarget: number; fatTarget: number },
  dayCount: number,
): MacroTotals {
  return {
    calories: daily.dailyCalorieTarget * dayCount,
    protein: daily.proteinTarget * dayCount,
    carbs: daily.carbTarget * dayCount,
    fat: daily.fatTarget * dayCount,
  };
}

export class ReportService {
  constructor(
    private readonly reports: ReportRepository = reportRepository,
    private readonly users: UserRepository = userRepository,
    private readonly goals: GoalRepository = goalRepository,
  ) {}

  async getToday(authenticatedUserId: string, clientUserId?: string): Promise<TodayReport> {
    const { ownerId, timeZone } = await this.resolveOwner(authenticatedUserId, clientUserId);
    const date = calendarDateInTimeZone(new Date(), timeZone);
    const actual = await this.reports.sumMacros(
      ownerId,
      calendarDayStartUtc(date, timeZone),
      calendarDayEndUtc(date, timeZone),
    );
    return { date, timezone: timeZone, ...actual };
  }

  async getCalorieTrend(
    authenticatedUserId: string,
    startDate: string,
    endDate: string,
    clientUserId?: string,
  ): Promise<CalorieTrendReport> {
    const series = await this.dailySeries(authenticatedUserId, startDate, endDate, clientUserId);
    const data = series.days.map((row) => ({ date: row.date, calories: row.calories }));
    return {
      timezone: series.timeZone,
      startDate,
      endDate,
      data,
      totals: {
        calories: data.reduce((sum, row) => sum + row.calories, 0),
      },
    };
  }

  async getMacroTrend(
    authenticatedUserId: string,
    startDate: string,
    endDate: string,
    clientUserId?: string,
  ): Promise<MacroTrendReport> {
    const series = await this.dailySeries(authenticatedUserId, startDate, endDate, clientUserId);
    const data = series.days.map((row) => ({
      date: row.date,
      protein: row.protein,
      carbs: row.carbs,
      fat: row.fat,
    }));
    return {
      timezone: series.timeZone,
      startDate,
      endDate,
      data,
      totals: data.reduce(
        (acc, row) => ({
          protein: acc.protein + row.protein,
          carbs: acc.carbs + row.carbs,
          fat: acc.fat + row.fat,
        }),
        { protein: 0, carbs: 0, fat: 0 },
      ),
    };
  }

  async getMicronutrients(
    authenticatedUserId: string,
    startDate: string,
    endDate: string,
    clientUserId?: string,
  ): Promise<MicronutrientReport> {
    const { ownerId, timeZone, rangeStart, rangeEnd } = await this.resolveRange(
      authenticatedUserId,
      startDate,
      endDate,
      clientUserId,
    );
    const data = await this.reports.aggregateMicronutrients(ownerId, rangeStart, rangeEnd);
    return {
      timezone: timeZone,
      startDate,
      endDate,
      data,
    };
  }

  async getGoalVsActual(
    authenticatedUserId: string,
    startDate: string,
    endDate: string,
    clientUserId?: string,
  ): Promise<GoalVsActualReport> {
    const { ownerId, timeZone, rangeStart, rangeEnd } = await this.resolveRange(
      authenticatedUserId,
      startDate,
      endDate,
      clientUserId,
    );
    const dayCount = inclusiveDayCount(startDate, endDate);
    const [actual, goal] = await Promise.all([
      this.reports.sumMacros(ownerId, rangeStart, rangeEnd),
      this.goals.findByUserId(ownerId),
    ]);

    const dailyGoal = goal
      ? {
          calories: goal.dailyCalorieTarget,
          protein: goal.proteinTarget,
          carbs: goal.carbTarget,
          fat: goal.fatTarget,
        }
      : null;

    return {
      timezone: timeZone,
      startDate,
      endDate,
      dayCount,
      dailyGoal,
      goal: goal ? scaleGoal(goal, dayCount) : null,
      actual,
    };
  }

  private async resolveOwner(authenticatedUserId: string, clientUserId?: string) {
    const ownerId = resolveOwnerId(authenticatedUserId, clientUserId);
    const user = await this.users.findById(ownerId);
    return { ownerId, timeZone: resolveTimeZone(user?.timezone) };
  }

  private async resolveRange(
    authenticatedUserId: string,
    startDate: string,
    endDate: string,
    clientUserId?: string,
  ) {
    const { ownerId, timeZone } = await this.resolveOwner(authenticatedUserId, clientUserId);
    return {
      ownerId,
      timeZone,
      rangeStart: calendarDayStartUtc(startDate, timeZone),
      rangeEnd: calendarDayEndUtc(endDate, timeZone),
    };
  }

  private async dailySeries(
    authenticatedUserId: string,
    startDate: string,
    endDate: string,
    clientUserId?: string,
  ) {
    const { ownerId, timeZone, rangeStart, rangeEnd } = await this.resolveRange(
      authenticatedUserId,
      startDate,
      endDate,
      clientUserId,
    );
    const aggregated = await this.reports.aggregateDailyMacros(
      ownerId,
      timeZone,
      rangeStart,
      rangeEnd,
    );
    return {
      timeZone,
      days: fillDailySeries(startDate, endDate, aggregated),
    };
  }
}
