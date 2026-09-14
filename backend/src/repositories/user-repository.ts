import type { User } from '@prisma/client';
import { prisma } from '../db/prisma.js';

export type PublicUser = {
  id: string;
  email: string;
  timezone: string;
  familyId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    timezone: user.timezone,
    familyId: user.familyId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async create(input: {
    email: string;
    passwordHash: string;
    timezone: string;
  }): Promise<User> {
    return prisma.user.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
        timezone: input.timezone,
      },
    });
  }

  async setFamilyId(userId: string, familyId: string | null): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { familyId },
    });
  }

  async findByFamilyId(familyId: string): Promise<User[]> {
    return prisma.user.findMany({
      where: { familyId },
      orderBy: { createdAt: 'asc' },
    });
  }
}

export const userRepository = new UserRepository();
