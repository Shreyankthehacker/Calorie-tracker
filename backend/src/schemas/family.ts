import { z } from 'zod';

export const createFamilyBodySchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
});

export const joinFamilyBodySchema = z.object({
  familyId: z.string().trim().min(1).max(64),
});

export type CreateFamilyBody = z.infer<typeof createFamilyBodySchema>;
export type JoinFamilyBody = z.infer<typeof joinFamilyBodySchema>;
