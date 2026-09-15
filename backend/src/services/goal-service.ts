import { Prisma } from '@prisma/client';
import { AppError } from '../errors/app-error.js';
import { assertOwnedByUser, resolveOwnerId } from '../ownership/ownership.js';
import {
  goalRepository,
  toPublicGoal,
  type GoalRepository,
  type PublicGoal,
} from '../repositories/goal-repository.js';
import type { GoalBody } from '../schemas/goals.js';
import { toGoalWriteInput } from '../schemas/goals.js';

/**
 * Current nutrition goal (1:1 with user). Client `userId` cannot change the owner.
 */
export class GoalService {
  constructor(private readonly goals: GoalRepository = goalRepository) {}

  async getCurrent(authenticatedUserId: string, clientUserId?: string): Promise<PublicGoal> {
    const ownerId = resolveOwnerId(authenticatedUserId, clientUserId);
    const goal = await this.goals.findByUserId(ownerId);
    return toPublicGoal(assertOwnedByUser(goal, ownerId));
  }

  async create(
    authenticatedUserId: string,
    body: GoalBody,
    clientUserId?: string,
  ): Promise<PublicGoal> {
    const ownerId = resolveOwnerId(authenticatedUserId, clientUserId ?? body.userId);
    const input = toGoalWriteInput(body);

    const existing = await this.goals.findByUserId(ownerId);
    if (existing) {
      throw new AppError(409, 'CONFLICT', 'Goal already exists');
    }

    try {
      const created = await this.goals.create(ownerId, input);
      return toPublicGoal(assertOwnedByUser(created, ownerId));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppError(409, 'CONFLICT', 'Goal already exists');
      }
      throw error;
    }
  }

  async upsert(
    authenticatedUserId: string,
    body: GoalBody,
    clientUserId?: string,
  ): Promise<PublicGoal> {
    const ownerId = resolveOwnerId(authenticatedUserId, clientUserId ?? body.userId);
    const input = toGoalWriteInput(body);
    const saved = await this.goals.upsertForUser(ownerId, input);
    return toPublicGoal(assertOwnedByUser(saved, ownerId));
  }

  async remove(authenticatedUserId: string, clientUserId?: string): Promise<void> {
    const ownerId = resolveOwnerId(authenticatedUserId, clientUserId);
    const deleted = await this.goals.deleteForUser(ownerId);
    assertOwnedByUser(deleted, ownerId);
  }
}
