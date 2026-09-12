import type { Goal } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { ownedBy } from '../ownership/ownership.js';
import type { GoalWriteInput } from '../schemas/goals.js';

export type PublicGoal = {
  id: string;
  dailyCalorieTarget: number;
  proteinTarget: number;
  carbTarget: number;
  fatTarget: number;
  weightGoal: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export function toPublicGoal(goal: Goal): PublicGoal {
  return {
    id: goal.id,
    dailyCalorieTarget: goal.dailyCalorieTarget,
    proteinTarget: goal.proteinTarget,
    carbTarget: goal.carbTarget,
    fatTarget: goal.fatTarget,
    weightGoal: goal.weightGoal,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
  };
}

export class GoalRepository {
  async findByUserId(userId: string): Promise<Goal | null> {
    return prisma.goal.findUnique({
      where: ownedBy(userId),
    });
  }

  async create(userId: string, input: GoalWriteInput): Promise<Goal> {
    return prisma.goal.create({
      data: {
        userId,
        dailyCalorieTarget: input.dailyCalorieTarget,
        proteinTarget: input.proteinTarget,
        carbTarget: input.carbTarget,
        fatTarget: input.fatTarget,
        weightGoal: input.weightGoal,
      },
    });
  }

  async updateForUser(userId: string, input: GoalWriteInput): Promise<Goal> {
    return prisma.goal.update({
      where: ownedBy(userId),
      data: {
        dailyCalorieTarget: input.dailyCalorieTarget,
        proteinTarget: input.proteinTarget,
        carbTarget: input.carbTarget,
        fatTarget: input.fatTarget,
        weightGoal: input.weightGoal,
      },
    });
  }

  async upsertForUser(userId: string, input: GoalWriteInput): Promise<Goal> {
    return prisma.goal.upsert({
      where: ownedBy(userId),
      create: {
        userId,
        dailyCalorieTarget: input.dailyCalorieTarget,
        proteinTarget: input.proteinTarget,
        carbTarget: input.carbTarget,
        fatTarget: input.fatTarget,
        weightGoal: input.weightGoal,
      },
      update: {
        dailyCalorieTarget: input.dailyCalorieTarget,
        proteinTarget: input.proteinTarget,
        carbTarget: input.carbTarget,
        fatTarget: input.fatTarget,
        weightGoal: input.weightGoal,
      },
    });
  }

  async deleteForUser(userId: string): Promise<Goal | null> {
    const existing = await this.findByUserId(userId);
    if (!existing) {
      return null;
    }

    return prisma.goal.delete({
      where: ownedBy(userId),
    });
  }
}

export const goalRepository = new GoalRepository();
