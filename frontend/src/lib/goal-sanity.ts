export const GOAL_LIMITS = {
  calories: { min: 800, max: 6000 },
  protein: { min: 0, max: 300 },
  carbs: { min: 0, max: 800 },
  fat: { min: 0, max: 250 },
} as const;

export type GoalMacros = {
  dailyCalorieTarget: number;
  proteinTarget: number;
  carbTarget: number;
  fatTarget: number;
};

export function macroCaloriePool(proteinG: number, carbsG: number, fatG: number): number {
  return proteinG * 4 + carbsG * 4 + fatG * 9;
}

export function isPlausibleDailyCalorieTarget(calories: number): boolean {
  return (
    Number.isFinite(calories) &&
    calories >= GOAL_LIMITS.calories.min &&
    calories <= GOAL_LIMITS.calories.max
  );
}

export function assessGoal(goal: GoalMacros): { ok: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const { dailyCalorieTarget, proteinTarget, carbTarget, fatTarget } = goal;

  if (dailyCalorieTarget < GOAL_LIMITS.calories.min) {
    warnings.push(
      `Daily calorie target (${dailyCalorieTarget} kcal) is below ${GOAL_LIMITS.calories.min} kcal. Check that this is not leftover calories or a decimal-place error.`,
    );
  } else if (dailyCalorieTarget > GOAL_LIMITS.calories.max) {
    warnings.push(
      `Daily calorie target (${dailyCalorieTarget} kcal) is above ${GOAL_LIMITS.calories.max} kcal.`,
    );
  }

  if (proteinTarget > GOAL_LIMITS.protein.max) {
    warnings.push(
      `Protein target (${proteinTarget}g) is above ${GOAL_LIMITS.protein.max}g. That many grams cannot fit a normal daily calorie budget.`,
    );
  }
  if (carbTarget > GOAL_LIMITS.carbs.max) {
    warnings.push(`Carbohydrate target (${carbTarget}g) is above ${GOAL_LIMITS.carbs.max}g.`);
  }
  if (fatTarget > GOAL_LIMITS.fat.max) {
    warnings.push(`Fat target (${fatTarget}g) is above ${GOAL_LIMITS.fat.max}g.`);
  }

  const pool = macroCaloriePool(proteinTarget, carbTarget, fatTarget);
  if (
    isPlausibleDailyCalorieTarget(dailyCalorieTarget) &&
    pool > 0 &&
    Math.abs(pool - dailyCalorieTarget) / dailyCalorieTarget > 0.2
  ) {
    warnings.push(
      `Macro grams add up to ${Math.round(pool)} kcal, which does not match the ${dailyCalorieTarget} kcal daily target (4 kcal/g protein, 4 kcal/g carbs, 9 kcal/g fat).`,
    );
  }

  if (warnings.length === 0 && pool > 0) {
    const carbPct = (carbTarget * 4) / pool;
    const fatPct = (fatTarget * 9) / pool;
    if (carbPct + fatPct < 0.35) {
      warnings.push(
        `Carbohydrate and fat targets are a combined ${Math.round((carbPct + fatPct) * 100)}% of the macro pool. That can be appropriate for some plans — confirm it matches how you actually eat.`,
      );
    }
  }

  return { ok: warnings.length === 0, warnings };
}

export function validateGoalForSave(goal: GoalMacros): string | null {
  const { dailyCalorieTarget, proteinTarget, carbTarget, fatTarget } = goal;
  if ([dailyCalorieTarget, proteinTarget, carbTarget, fatTarget].some((n) => Number.isNaN(n))) {
    return 'Enter valid numbers for all required fields.';
  }
  if (dailyCalorieTarget < GOAL_LIMITS.calories.min || dailyCalorieTarget > GOAL_LIMITS.calories.max) {
    return `Daily calories must be between ${GOAL_LIMITS.calories.min} and ${GOAL_LIMITS.calories.max} kcal.`;
  }
  if (proteinTarget > GOAL_LIMITS.protein.max) {
    return `Daily protein must be ${GOAL_LIMITS.protein.max}g or less.`;
  }
  if (carbTarget > GOAL_LIMITS.carbs.max) {
    return `Daily carbohydrates must be ${GOAL_LIMITS.carbs.max}g or less.`;
  }
  if (fatTarget > GOAL_LIMITS.fat.max) {
    return `Daily fat must be ${GOAL_LIMITS.fat.max}g or less.`;
  }
  if (proteinTarget < 0 || carbTarget < 0 || fatTarget < 0) {
    return 'Macro targets cannot be negative.';
  }
  return null;
}
