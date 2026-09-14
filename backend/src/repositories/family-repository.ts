import type { Family } from '@prisma/client';
import { prisma } from '../db/prisma.js';

export class FamilyRepository {
  async create(name: string): Promise<Family> {
    return prisma.family.create({
      data: { name },
    });
  }

  async findById(id: string): Promise<Family | null> {
    return prisma.family.findUnique({ where: { id } });
  }

  async countMembers(id: string): Promise<number> {
    return prisma.user.count({ where: { familyId: id } });
  }

  async delete(id: string): Promise<void> {
    await prisma.family.delete({ where: { id } });
  }
}

export const familyRepository = new FamilyRepository();
