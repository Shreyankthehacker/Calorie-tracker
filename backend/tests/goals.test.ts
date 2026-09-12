import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { buildApp } from '../src/app.js';
import { loadEnv } from '../src/config/env.js';
import { prisma } from '../src/db/prisma.js';

type AuthResponse = {
  user: { id: string; email: string };
  accessToken: string;
  refreshToken: string;
};

type GoalResponse = {
  goal: {
    id: string;
    dailyCalorieTarget: number;
    proteinTarget: number;
    carbTarget: number;
    fatTarget: number;
    weightGoal: number | null;
  };
};

const validGoal = {
  dailyCalorieTarget: 2200,
  proteinTarget: 150,
  carbTarget: 220,
  fatTarget: 70,
  weightGoal: 75,
};

describe('goals API', () => {
  const env = loadEnv({
    ...process.env,
    NODE_ENV: 'test',
  });

  let app: FastifyInstance;
  const suffix = Date.now();
  const password = 'secure-pass-123';

  let userA: AuthResponse;
  let userB: AuthResponse;

  async function register(label: string): Promise<AuthResponse> {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: `phase2_${label}_${suffix}@example.com`,
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
  });

  afterAll(async () => {
    const userIds = [userA?.user.id, userB?.user.id].filter(Boolean) as string[];
    if (userIds.length > 0) {
      await prisma.goal.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await app.close();
    await prisma.$disconnect();
  });

  it('rejects unauthenticated goal requests', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/goals',
    });
    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('UNAUTHORIZED');
  });

  it('returns 404 when the authenticated user has no goal', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/goals',
      headers: { authorization: `Bearer ${userA.accessToken}` },
    });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('NOT_FOUND');
  });

  it('creates a goal for the authenticated user', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/goals',
      headers: { authorization: `Bearer ${userA.accessToken}` },
      payload: validGoal,
    });

    expect(response.statusCode).toBe(201);
    const body = response.json() as GoalResponse;
    expect(body.goal.dailyCalorieTarget).toBe(2200);
    expect(body.goal.proteinTarget).toBe(150);
    expect(body.goal.carbTarget).toBe(220);
    expect(body.goal.fatTarget).toBe(70);
    expect(body.goal.weightGoal).toBe(75);
  });

  it('retrieves the current goal', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/goals',
      headers: { authorization: `Bearer ${userA.accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as GoalResponse;
    expect(body.goal.dailyCalorieTarget).toBe(2200);
  });

  it('rejects duplicate goal creation with 409', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/goals',
      headers: { authorization: `Bearer ${userA.accessToken}` },
      payload: validGoal,
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('CONFLICT');
  });

  it('rejects negative nutrition targets', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/goals',
      headers: { authorization: `Bearer ${userA.accessToken}` },
      payload: {
        ...validGoal,
        proteinTarget: -10,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('updates the current goal via PUT', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/goals',
      headers: { authorization: `Bearer ${userA.accessToken}` },
      payload: {
        dailyCalorieTarget: 2000,
        proteinTarget: 160,
        carbTarget: 200,
        fatTarget: 65,
        weightGoal: 74,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as GoalResponse;
    expect(body.goal.dailyCalorieTarget).toBe(2000);
    expect(body.goal.proteinTarget).toBe(160);
  });

  it('ignores client-supplied userId and keeps ownership on the authenticated user', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/goals?userId=' + userB.user.id,
      headers: { authorization: `Bearer ${userA.accessToken}` },
      payload: {
        ...validGoal,
        dailyCalorieTarget: 2100,
        userId: userB.user.id,
      },
    });

    expect(response.statusCode).toBe(200);
    expect((response.json() as GoalResponse).goal.dailyCalorieTarget).toBe(2100);

    const userBGoal = await app.inject({
      method: 'GET',
      url: '/api/v1/goals',
      headers: { authorization: `Bearer ${userB.accessToken}` },
    });
    expect(userBGoal.statusCode).toBe(404);

    const userAGoal = await app.inject({
      method: 'GET',
      url: '/api/v1/goals',
      headers: { authorization: `Bearer ${userA.accessToken}` },
    });
    expect(userAGoal.statusCode).toBe(200);
    expect((userAGoal.json() as GoalResponse).goal.dailyCalorieTarget).toBe(2100);
  });

  it('prevents user B from reading or modifying user A goal values', async () => {
    const before = await app.inject({
      method: 'GET',
      url: '/api/v1/goals',
      headers: { authorization: `Bearer ${userA.accessToken}` },
    });
    const beforeGoal = (before.json() as GoalResponse).goal;

    const bGet = await app.inject({
      method: 'GET',
      url: '/api/v1/goals',
      headers: { authorization: `Bearer ${userB.accessToken}` },
    });
    expect(bGet.statusCode).toBe(404);

    const bPut = await app.inject({
      method: 'PUT',
      url: '/api/v1/goals',
      headers: { authorization: `Bearer ${userB.accessToken}` },
      payload: {
        dailyCalorieTarget: 9999,
        proteinTarget: 1,
        carbTarget: 1,
        fatTarget: 1,
        weightGoal: 1,
        userId: userA.user.id,
      },
    });
    expect(bPut.statusCode).toBe(200);

    const after = await app.inject({
      method: 'GET',
      url: '/api/v1/goals',
      headers: { authorization: `Bearer ${userA.accessToken}` },
    });
    const afterGoal = (after.json() as GoalResponse).goal;
    expect(afterGoal.dailyCalorieTarget).toBe(beforeGoal.dailyCalorieTarget);
    expect(afterGoal.id).toBe(beforeGoal.id);

    const bOwn = await app.inject({
      method: 'GET',
      url: '/api/v1/goals',
      headers: { authorization: `Bearer ${userB.accessToken}` },
    });
    expect(bOwn.statusCode).toBe(200);
    expect((bOwn.json() as GoalResponse).goal.dailyCalorieTarget).toBe(9999);
  });

  it('enforces the database 1:1 unique userId constraint', async () => {
    await expect(
      prisma.goal.create({
        data: {
          userId: userA.user.id,
          dailyCalorieTarget: 1000,
          proteinTarget: 10,
          carbTarget: 10,
          fatTarget: 10,
          weightGoal: null,
        },
      }),
    ).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);

    try {
      await prisma.goal.create({
        data: {
          userId: userA.user.id,
          dailyCalorieTarget: 1000,
          proteinTarget: 10,
          carbTarget: 10,
          fatTarget: 10,
          weightGoal: null,
        },
      });
    } catch (error) {
      expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
      expect((error as Prisma.PrismaClientKnownRequestError).code).toBe('P2002');
    }

    const count = await prisma.goal.count({ where: { userId: userA.user.id } });
    expect(count).toBe(1);
  });

  it('deletes only the authenticated user current goal', async () => {
    const deleteA = await app.inject({
      method: 'DELETE',
      url: '/api/v1/goals',
      headers: { authorization: `Bearer ${userA.accessToken}` },
    });
    expect(deleteA.statusCode).toBe(204);

    const getA = await app.inject({
      method: 'GET',
      url: '/api/v1/goals',
      headers: { authorization: `Bearer ${userA.accessToken}` },
    });
    expect(getA.statusCode).toBe(404);

    const getB = await app.inject({
      method: 'GET',
      url: '/api/v1/goals',
      headers: { authorization: `Bearer ${userB.accessToken}` },
    });
    expect(getB.statusCode).toBe(200);
  });
});
