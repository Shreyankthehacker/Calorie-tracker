import { AppError } from '../errors/app-error.js';
import { CatalogFoodSearchProvider } from '../ai/catalog-food-search.js';
import type { FoodSearchProvider } from '../ai/food-search-provider.js';
import { ZodError } from 'zod';
import {
  addCalendarDays,
  calendarDateInTimeZone,
  mondayOfContainingWeek,
  resolveTimeZone,
} from '../lib/calendar-date.js';
import { FoodEntryService } from '../services/food-entry-service.js';
import { GoalService } from '../services/goal-service.js';
import { ReportService } from '../services/report-service.js';
import { userRepository, type UserRepository } from '../repositories/user-repository.js';
import {
  getGoalsInputSchema,
  getNutritionSummaryInputSchema,
  getWeeklyReportInputSchema,
  listMealsInputSchema,
  logMealInputSchema,
  searchFoodInputSchema,
  type LogMealInput,
} from '../schemas/chat.js';
import type { MacroTotals } from '../repositories/report-repository.js';
import { CHAT_TOOL_NAME_SET } from './tool-definitions.js';

export type PendingMeal = {
  mealType: LogMealInput['mealType'];
  foodName: string;
  quantity: number;
  quantityUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  consumedAt: string;
  micronutrients: Array<{ nutrientKey: string; amount: number; unit: string }>;
};

function jsonSafe(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return { value };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function labeledNutrition(macros: MacroTotals) {
  return {
    caloriesKcal: round1(macros.calories),
    proteinG: round1(macros.protein),
    carbsG: round1(macros.carbs),
    fatG: round1(macros.fat),
  };
}

function formatNutrition(macros: { caloriesKcal: number; proteinG: number; carbsG: number; fatG: number }): string {
  return `${macros.caloriesKcal} kcal, ${macros.proteinG}g protein, ${macros.carbsG}g carbs, ${macros.fatG}g fat`;
}

function toPendingMeal(input: LogMealInput): PendingMeal {
  return {
    mealType: input.mealType,
    foodName: input.foodName,
    quantity: input.quantity,
    quantityUnit: input.quantityUnit,
    calories: input.calories,
    protein: input.protein,
    carbs: input.carbs,
    fat: input.fat,
    consumedAt: input.consumedAt.toISOString(),
    micronutrients: input.micronutrients ?? [],
  };
}

/**
 * Allowlisted chat tools. Each method calls an existing application service
 * so the model cannot invent SQL or skip ownership checks.
 */
export class ChatToolExecutor {
  constructor(
    private readonly goals: GoalService = new GoalService(),
    private readonly reports: ReportService = new ReportService(),
    private readonly foodEntries: FoodEntryService = new FoodEntryService(),
    private readonly foodSearch: FoodSearchProvider = new CatalogFoodSearchProvider(),
    private readonly users: UserRepository = userRepository,
  ) {}

  async execute(
    authenticatedUserId: string,
    name: string,
    rawArgs: unknown,
  ): Promise<{ ok: true; result: Record<string, unknown> } | { ok: false; result: Record<string, unknown> }> {
    if (!CHAT_TOOL_NAME_SET.has(name)) {
      return { ok: false, result: { error: 'Unknown tool' } };
    }

    try {
      if (name === 'logMeal') {
        return { ok: false, result: { error: 'logMeal cannot run without explicit user confirmation' } };
      }
      if (name === 'getGoals') {
        return { ok: true, result: jsonSafe(await this.getGoals(authenticatedUserId, rawArgs)) };
      }
      if (name === 'getNutritionSummary') {
        return { ok: true, result: jsonSafe(await this.getNutritionSummary(authenticatedUserId, rawArgs)) };
      }
      if (name === 'getWeeklyReport') {
        return { ok: true, result: jsonSafe(await this.getWeeklyReport(authenticatedUserId, rawArgs)) };
      }
      if (name === 'listMeals') {
        return { ok: true, result: jsonSafe(await this.listMeals(authenticatedUserId, rawArgs)) };
      }
      if (name === 'searchFood') {
        return { ok: true, result: jsonSafe(await this.searchFood(rawArgs)) };
      }
      return { ok: false, result: { error: 'Unknown tool' } };
    } catch (error) {
      if (error instanceof ZodError) {
        return { ok: false, result: { error: 'Invalid tool arguments', details: error.flatten() } };
      }
      if (error instanceof AppError) {
        return { ok: false, result: { error: error.message, code: error.code } };
      }
      throw error;
    }
  }

  proposeMeal(rawArgs: unknown): { ok: true; meal: PendingMeal } | { ok: false; result: Record<string, unknown> } {
    const parsed = logMealInputSchema.safeParse(rawArgs);
    if (!parsed.success) {
      return {
        ok: false,
        result: { error: 'Invalid meal proposal', details: parsed.error.flatten() },
      };
    }
    return { ok: true, meal: toPendingMeal(parsed.data) };
  }

  async logMeal(authenticatedUserId: string, rawArgs: unknown) {
    const parsed = logMealInputSchema.safeParse(rawArgs);
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request', parsed.error.flatten());
    }
    const foodEntry = await this.foodEntries.create(authenticatedUserId, parsed.data);
    return foodEntry;
  }

  private async resolveToday(authenticatedUserId: string): Promise<{ date: string; timeZone: string }> {
    const user = await this.users.findById(authenticatedUserId);
    const timeZone = resolveTimeZone(user?.timezone);
    return { date: calendarDateInTimeZone(new Date(), timeZone), timeZone };
  }

  private async getGoals(authenticatedUserId: string, rawArgs: unknown) {
    getGoalsInputSchema.parse(rawArgs ?? {});
    try {
      const goal = await this.goals.getCurrent(authenticatedUserId);
      const dailyTargets = {
        caloriesKcal: round1(goal.dailyCalorieTarget),
        proteinG: round1(goal.proteinTarget),
        carbsG: round1(goal.carbTarget),
        fatG: round1(goal.fatTarget),
      };
      return {
        period: 'daily',
        dailyTargets,
        weightGoalKg: goal.weightGoal,
        summaryText: `Daily goals: ${formatNutrition(dailyTargets)}.`,
      };
    } catch (error) {
      if (error instanceof AppError && error.code === 'NOT_FOUND') {
        return { goal: null, summaryText: 'No nutrition goal is set.' };
      }
      throw error;
    }
  }

  private async getNutritionSummary(authenticatedUserId: string, rawArgs: unknown) {
    const input = getNutritionSummaryInputSchema.parse(rawArgs ?? {});
    const today = await this.resolveToday(authenticatedUserId);
    const startDate = input.startDate ?? today.date;
    const endDate = input.endDate ?? today.date;
    const [goalVsActual, micros] = await Promise.all([
      this.reports.getGoalVsActual(authenticatedUserId, startDate, endDate),
      this.reports.getMicronutrients(authenticatedUserId, startDate, endDate),
    ]);
    const actualIntake = labeledNutrition(goalVsActual.actual);
    const dailyTargets = goalVsActual.dailyGoal ? labeledNutrition(goalVsActual.dailyGoal) : null;
    const periodTargets = goalVsActual.goal ? labeledNutrition(goalVsActual.goal) : null;
    return {
      timezone: goalVsActual.timezone,
      startDate,
      endDate,
      dayCount: goalVsActual.dayCount,
      actualIntake,
      dailyTargets,
      periodTargets,
      micronutrients: micros.data,
      summaryText: dailyTargets
        ? `${startDate} to ${endDate}: ate ${formatNutrition(actualIntake)}. Daily targets: ${formatNutrition(dailyTargets)}. Period targets (${goalVsActual.dayCount} day(s)): ${periodTargets ? formatNutrition(periodTargets) : 'none'}.`
        : `${startDate} to ${endDate}: ate ${formatNutrition(actualIntake)}. No nutrition goal is set.`,
    };
  }

  private async getWeeklyReport(authenticatedUserId: string, rawArgs: unknown) {
    const input = getWeeklyReportInputSchema.parse(rawArgs ?? {});
    const today = await this.resolveToday(authenticatedUserId);
    const monday = mondayOfContainingWeek(input.startDate ?? today.date);
    const sunday = addCalendarDays(monday, 6);
    const [calories, macros, goalVsActual] = await Promise.all([
      this.reports.getCalorieTrend(authenticatedUserId, monday, sunday),
      this.reports.getMacroTrend(authenticatedUserId, monday, sunday),
      this.reports.getGoalVsActual(authenticatedUserId, monday, sunday),
    ]);
    const actualIntake = labeledNutrition({
      calories: calories.totals.calories,
      protein: macros.totals.protein,
      carbs: macros.totals.carbs,
      fat: macros.totals.fat,
    });
    const dailyTargets = goalVsActual.dailyGoal ? labeledNutrition(goalVsActual.dailyGoal) : null;
    const weeklyTargets = goalVsActual.goal ? labeledNutrition(goalVsActual.goal) : null;
    return {
      timezone: calories.timezone,
      weekStartDate: monday,
      weekEndDate: sunday,
      dayCount: goalVsActual.dayCount,
      actualIntake,
      dailyTargets,
      weeklyTargets,
      dailyCalories: calories.data.map((row) => ({ date: row.date, caloriesKcal: round1(row.calories) })),
      summaryText: dailyTargets && weeklyTargets
        ? `Week ${monday} to ${sunday}: ate ${formatNutrition(actualIntake)}. Daily targets: ${formatNutrition(dailyTargets)}. Weekly targets (${goalVsActual.dayCount} days): ${formatNutrition(weeklyTargets)}.`
        : `Week ${monday} to ${sunday}: ate ${formatNutrition(actualIntake)}. No nutrition goal is set.`,
    };
  }

  private async listMeals(authenticatedUserId: string, rawArgs: unknown) {
    const input = listMealsInputSchema.parse(rawArgs ?? {});
    const today = await this.resolveToday(authenticatedUserId);
    let startDate = input.startDate ?? today.date;
    let endDate = input.endDate ?? today.date;
    if (!input.startDate && !input.endDate && input.period === 'week') {
      startDate = mondayOfContainingWeek(today.date);
      endDate = addCalendarDays(startDate, 6);
    }
    const page = input.page ?? 1;
    const pageSize = 50;
    const listed = await this.foodEntries.list(authenticatedUserId, {
      startDate,
      endDate,
      page,
      pageSize,
      ...(input.mealType ? { mealType: input.mealType } : {}),
    });
    const meals = listed.data.map((entry) => ({
      foodName: entry.foodName,
      mealType: entry.mealType,
      quantity: entry.quantity,
      quantityUnit: entry.quantityUnit,
      consumedAt: entry.consumedAt.toISOString(),
      caloriesKcal: round1(entry.calories),
      proteinG: round1(entry.protein),
      carbsG: round1(entry.carbs),
      fatG: round1(entry.fat),
    }));
    const hasMore = listed.pagination.page < listed.pagination.totalPages;
    return {
      timezone: today.timeZone,
      startDate,
      endDate,
      meals,
      mealCountReturned: meals.length,
      totalLogged: listed.pagination.total,
      page: listed.pagination.page,
      totalPages: listed.pagination.totalPages,
      hasMore,
      summaryText:
        meals.length === 0
          ? `No meals logged from ${startDate} to ${endDate}.`
          : `Logged ${listed.pagination.total} meal(s) from ${startDate} to ${endDate}: ${meals
              .map(
                (meal) =>
                  `${meal.foodName} (${meal.mealType.toLowerCase()}, ${meal.quantity} ${meal.quantityUnit}, ${meal.caloriesKcal} kcal)`,
              )
              .join('; ')}.${hasMore ? ' More meals exist on later pages.' : ''}`,
    };
  }

  private async searchFood(rawArgs: unknown) {
    const input = searchFoodInputSchema.parse(rawArgs);
    const matches = await this.foodSearch.search(input.query);
    return {
      query: input.query,
      source: 'catalog_estimate',
      matches,
      note:
        'Catalog estimates only. They are not a laboratory food database. If matches is empty, still propose logMeal with a typical homemade or restaurant serving and say it is an estimate.',
    };
  }
}
