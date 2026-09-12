import { z } from 'zod';

const nonNegativeNumber = z
  .number({
    required_error: 'Value is required',
    invalid_type_error: 'Value must be a number',
  })
  .finite()
  .nonnegative();

export const goalBodySchema = z
  .object({
    dailyCalorieTarget: nonNegativeNumber,
    proteinTarget: nonNegativeNumber,
    carbTarget: nonNegativeNumber,
    fatTarget: nonNegativeNumber,
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
