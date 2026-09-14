import type { Family, User } from '@prisma/client';
import { AppError } from '../errors/app-error.js';
import {
  calendarDateInTimeZone,
  calendarDayEndUtc,
  calendarDayStartUtc,
  resolveTimeZone,
} from '../lib/calendar-date.js';
import { familyRepository } from '../repositories/family-repository.js';
import { foodEntryRepository } from '../repositories/food-entry-repository.js';
import { userRepository } from '../repositories/user-repository.js';

export type PublicFamilyMember = {
  id: string;
  email: string;
  timezone: string;
  createdAt: Date;
  isCurrentUser: boolean;
  todayCalories: number;
};

export type PublicFamily = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  members: PublicFamilyMember[];
};

export class FamilyService {
  async get(userId: string): Promise<PublicFamily | null> {
    const user = await this.requireUser(userId);
    if (!user.familyId) {
      return null;
    }
    const family = await familyRepository.findById(user.familyId);
    if (!family) {
      return null;
    }
    return this.toPublicFamily(family, userId);
  }

  async create(userId: string, name?: string): Promise<PublicFamily> {
    const user = await this.requireUser(userId);
    if (user.familyId) {
      throw new AppError(409, 'CONFLICT', 'You already belong to a family');
    }
    const family = await familyRepository.create(name?.trim() || 'Household');
    await userRepository.setFamilyId(userId, family.id);
    return this.toPublicFamily(family, userId);
  }

  async join(userId: string, familyId: string): Promise<PublicFamily> {
    const user = await this.requireUser(userId);
    if (user.familyId) {
      throw new AppError(409, 'CONFLICT', 'Leave your current family before joining another');
    }
    const family = await familyRepository.findById(familyId);
    if (!family) {
      throw new AppError(404, 'NOT_FOUND', 'Family not found');
    }
    await userRepository.setFamilyId(userId, family.id);
    return this.toPublicFamily(family, userId);
  }

  async leave(userId: string): Promise<void> {
    const user = await this.requireUser(userId);
    if (!user.familyId) {
      throw new AppError(404, 'NOT_FOUND', 'You do not belong to a family');
    }
    const familyId = user.familyId;
    await userRepository.setFamilyId(userId, null);
    const remaining = await familyRepository.countMembers(familyId);
    if (remaining === 0) {
      await familyRepository.delete(familyId);
    }
  }

  private async requireUser(userId: string): Promise<User> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
    }
    return user;
  }

  private async toPublicFamily(family: Family, currentUserId: string): Promise<PublicFamily> {
    const members = await userRepository.findByFamilyId(family.id);
    const profiles = await Promise.all(
      members.map(async (member) => {
        const timezone = resolveTimeZone(member.timezone);
        const today = calendarDateInTimeZone(new Date(), timezone);
        const todayCalories = await foodEntryRepository.sumCalories(
          member.id,
          calendarDayStartUtc(today, timezone),
          calendarDayEndUtc(today, timezone),
        );
        return {
          id: member.id,
          email: member.email,
          timezone: member.timezone,
          createdAt: member.createdAt,
          isCurrentUser: member.id === currentUserId,
          todayCalories,
        };
      }),
    );

    return {
      id: family.id,
      name: family.name,
      createdAt: family.createdAt,
      updatedAt: family.updatedAt,
      members: profiles,
    };
  }
}
