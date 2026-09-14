import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { loadEnv } from '../src/config/env.js';
import { prisma } from '../src/db/prisma.js';

type AuthResponse = {
  user: { id: string; email: string; familyId: string | null };
  accessToken: string;
};

type FamilyResponse = {
  family: {
    id: string;
    name: string;
    members: Array<{ id: string; email: string; isCurrentUser: boolean; todayCalories: number }>;
  } | null;
};

describe('family API', () => {
  const env = loadEnv({
    ...process.env,
    NODE_ENV: 'test',
  });

  let app: FastifyInstance;
  const suffix = Date.now();
  const password = 'secure-pass-123';
  const familyIds = new Set<string>();

  let userA: AuthResponse;
  let userB: AuthResponse;
  let userC: AuthResponse;

  async function register(label: string): Promise<AuthResponse> {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: `family_${label}_${suffix}@example.com`,
        password,
        timezone: 'UTC',
      },
    });
    expect(response.statusCode).toBe(201);
    return response.json() as AuthResponse;
  }

  beforeAll(async () => {
    app = await buildApp(env);
    await app.ready();
    userA = await register('a');
    userB = await register('b');
    userC = await register('c');
  });

  afterAll(async () => {
    const userIds = [userA?.user.id, userB?.user.id, userC?.user.id].filter(Boolean) as string[];
    if (userIds.length > 0) {
      await prisma.user.updateMany({ where: { id: { in: userIds } }, data: { familyId: null } });
      await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    if (familyIds.size > 0) {
      await prisma.family.deleteMany({ where: { id: { in: [...familyIds] } } });
    }
    await app.close();
    await prisma.$disconnect();
  });

  it('rejects unauthenticated family requests', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/family',
    });
    expect(response.statusCode).toBe(401);
  });

  it('returns null when the user has no family', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/family',
      headers: { authorization: `Bearer ${userA.accessToken}` },
    });
    expect(response.statusCode).toBe(200);
    expect((response.json() as FamilyResponse).family).toBeNull();
  });

  it('creates a family with a unique id and assigns the current user', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/family',
      headers: { authorization: `Bearer ${userA.accessToken}` },
      payload: {},
    });
    expect(response.statusCode).toBe(201);
    const body = response.json() as FamilyResponse;
    expect(body.family).not.toBeNull();
    expect(body.family?.id).toBeTruthy();
    expect(body.family?.members).toHaveLength(1);
    expect(body.family?.members[0]?.id).toBe(userA.user.id);
    expect(body.family?.members[0]?.isCurrentUser).toBe(true);
    if (body.family) {
      familyIds.add(body.family.id);
    }
  });

  it('lets another user join by family id and lists both members', async () => {
    const created = await app.inject({
      method: 'GET',
      url: '/api/v1/family',
      headers: { authorization: `Bearer ${userA.accessToken}` },
    });
    const familyId = (created.json() as FamilyResponse).family?.id;
    expect(familyId).toBeTruthy();

    const join = await app.inject({
      method: 'POST',
      url: '/api/v1/family/join',
      headers: { authorization: `Bearer ${userB.accessToken}` },
      payload: { familyId },
    });
    expect(join.statusCode).toBe(200);
    const body = join.json() as FamilyResponse;
    expect(body.family?.members.map((member) => member.id).sort()).toEqual(
      [userA.user.id, userB.user.id].sort(),
    );
  });

  it('rejects joining an unknown family', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/family/join',
      headers: { authorization: `Bearer ${userC.accessToken}` },
      payload: { familyId: 'does-not-exist' },
    });
    expect(response.statusCode).toBe(404);
  });

  it('rejects creating a second family while already a member', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/family',
      headers: { authorization: `Bearer ${userA.accessToken}` },
      payload: {},
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('CONFLICT');
  });

  it('lets a member leave while remaining members stay connected by the same id', async () => {
    const before = await app.inject({
      method: 'GET',
      url: '/api/v1/family',
      headers: { authorization: `Bearer ${userA.accessToken}` },
    });
    const familyId = (before.json() as FamilyResponse).family?.id;

    const leave = await app.inject({
      method: 'POST',
      url: '/api/v1/family/leave',
      headers: { authorization: `Bearer ${userB.accessToken}` },
    });
    expect(leave.statusCode).toBe(204);

    const after = await app.inject({
      method: 'GET',
      url: '/api/v1/family',
      headers: { authorization: `Bearer ${userA.accessToken}` },
    });
    const body = after.json() as FamilyResponse;
    expect(body.family?.id).toBe(familyId);
    expect(body.family?.members).toHaveLength(1);
    expect(body.family?.members[0]?.id).toBe(userA.user.id);
  });
});
