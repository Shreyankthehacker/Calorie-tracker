import { describe, expect, it } from 'vitest';
import { assessGoal, validateGoalForSave } from './goal-sanity';

describe('goal sanity', () => {
  it('flags a 23 kcal target and a 2434g protein target', () => {
    const result = assessGoal({
      dailyCalorieTarget: 23,
      proteinTarget: 2434,
      carbTarget: 10,
      fatTarget: 65,
    });
    expect(result.ok).toBe(false);
    expect(result.warnings.some((warning) => /23/.test(warning))).toBe(true);
    expect(result.warnings.some((warning) => /2434/.test(warning))).toBe(true);
  });

  it('rejects those values on save', () => {
    expect(
      validateGoalForSave({
        dailyCalorieTarget: 23,
        proteinTarget: 150,
        carbTarget: 200,
        fatTarget: 60,
      }),
    ).toMatch(/800/);
    expect(
      validateGoalForSave({
        dailyCalorieTarget: 2200,
        proteinTarget: 2434,
        carbTarget: 200,
        fatTarget: 60,
      }),
    ).toMatch(/300/);
  });
});
