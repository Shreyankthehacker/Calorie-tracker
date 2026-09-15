import { z } from 'zod';

const nonNegativeNumber = z
  .number({
    required_error: 'Value is required',
    invalid_type_error: 'Value must be a number',
  })
  .finite()
  .nonnegative();

const dailyCalorieTarget = z
  .number({
    required_error: 'Value is required',
    invalid_type_error: 'Value must be a number',
  })
  .finite()
  .min(800, 'Daily calorie target must be at least 800 kcal')
  .max(6000, 'Daily calorie target must be at most 6000 kcal');

const proteinTarget = z
  .number({
    required_error: 'Value is required',
    invalid_type_error: 'Value must be a number',
  })
  .finite()
  .nonnegative()
  .max(300, 'Daily protein target must be 300g or less');

const carbTarget = z
  .number({
    required_error: 'Value is required',
    invalid_type_error: 'Value must be a number',
  })
  .finite()
  .nonnegative()
  .max(800, 'Daily carbohydrate target must be 800g or less');

const fatTarget = z
  .number({
    required_error: 'Value is required',
    invalid_type_error: 'Value must be a number',
  })
  .finite()
  .nonnegative()
  .max(250, 'Daily fat target must be 250g or less');

export const goalBodySchema = z
  .object({
    dailyCalorieTarget,
    proteinTarget,
    carbTarget,
    fatTarget,
    weightGoal: nonNegativeNumber.nullable().optional(),
    // Accepted only so it can be explicitly ignored — never used for ownership.
    userId: z.string().optional(),
  })
  .strict();

export type GoalBody = z.infer<typeof goalBodySchema>;

export type GoalWriteInput = {
  dailyCalorieTarget: number;
  proteinTarget: number;
  carbTarget: number;
  fatTarget: number;
  weightGoal: number | null;
};

export function toGoalWriteInput(body: GoalBody): GoalWriteInput {
  return {
    dailyCalorieTarget: body.dailyCalorieTarget,
    proteinTarget: body.proteinTarget,
    carbTarget: body.carbTarget,
    fatTarget: body.fatTarget,
    weightGoal: body.weightGoal === undefined ? null : body.weightGoal,
  };
}
