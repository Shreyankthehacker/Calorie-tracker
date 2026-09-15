import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { loadEnv } from '../src/config/env.js';
import { prisma } from '../src/db/prisma.js';
import { MAX_REPORT_RANGE_DAYS } from '../src/schemas/reports.js';

type AuthResponse = {
  user: { id: string; email: string };
  accessToken: string;
};

type MacroTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type TodayReport = MacroTotals & { date: string; timezone: string };

type CalorieReport = {
  timezone: string;
  startDate: string;
  endDate: string;
  data: Array<{ date: string; calories: number }>;
  totals: { calories: number };
};

type MacroReport = {
  data: Array<{ date: string; protein: number; carbs: number; fat: number }>;
  totals: { protein: number; carbs: number; fat: number };
};

type MicroReport = {
  data: Array<{ nutrientKey: string; amount: number; unit: string }>;
};

type GoalVsActualReport = {
  timezone: string;
  startDate: string;
  endDate: string;
  dayCount: number;
  dailyGoal: MacroTotals | null;
  goal: MacroTotals | null;
  actual: MacroTotals;
};

const snack = {
  mealType: 'SNACKS',
  foodName: 'Yogurt',
  quantity: 1,
  quantityUnit: 'cup',
  calories: 150,
  protein: 12,
  carbs: 18,
  fat: 4,
};

describe('reports API', () => {
  const env = loadEnv({
    ...process.env,
    NODE_ENV: 'test',
  });

  let app: FastifyInstance;
  const suffix = Date.now();
  const password = 'secure-pass-123';
  let userA: AuthResponse;
  let userB: AuthResponse;
  let userNoGoal: AuthResponse;
  let userToday: AuthResponse;

  async function register(label: string, timezone = 'UTC'): Promise<AuthResponse> {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: `phase4_${label}_${suffix}@example.com`,
        password,
        timezone,
      },
    });
    expect(response.statusCode).toBe(201);
    return response.json() as AuthResponse;
  }

  function auth(user: AuthResponse) {
    return { authorization: `Bearer ${user.accessToken}` };
  }

  async function createEntry(
    user: AuthResponse,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/food-entries',
      headers: auth(user),
      payload: { ...snack, ...payload },
    });
    expect(response.statusCode).toBe(201);
  }

  beforeAll(async () => {
    app = await buildApp(env);
    await app.ready();
    userA = await register('a', 'UTC');
    userB = await register('b', 'Asia/Kolkata');
    userNoGoal = await register('nogoal', 'UTC');
    userToday = await register('today', 'UTC');

    const goal = await app.inject({
      method: 'POST',
      url: '/api/v1/goals',
      headers: auth(userA),
      payload: {
        dailyCalorieTarget: 2200,
        proteinTarget: 140,
        carbTarget: 250,
        fatTarget: 70,
      },
    });
    expect(goal.statusCode).toBe(201);

    const otherGoal = await app.inject({
      method: 'POST',
      url: '/api/v1/goals',
      headers: auth(userB),
      payload: {
        dailyCalorieTarget: 5800,
        proteinTarget: 280,
        carbTarget: 400,
        fatTarget: 180,
      },
    });
    expect(otherGoal.statusCode).toBe(201);

    await createEntry(userA, {
      foodName: 'Monday oats',
      calories: 2100,
      protein: 120,
      carbs: 210,
      fat: 65,
      consumedAt: '2026-09-07T12:00:00.000Z',
      micronutrients: [
        { nutrientKey: 'iron', amount: 12.5, unit: 'mg' },
        { nutrientKey: 'calcium', amount: 400, unit: 'mg' },
      ],
    });
    await createEntry(userA, {
      foodName: 'Tuesday bowl',
      calories: 1840,
      protein: 112,
      carbs: 205,
      fat: 61,
      consumedAt: '2026-09-08T12:00:00.000Z',
      micronutrients: [
        { nutrientKey: 'iron', amount: 30, unit: 'mg' },
        { nutrientKey: 'calcium', amount: 440, unit: 'mg' },
        { nutrientKey: 'vitamin_d', amount: 15, unit: 'mcg' },
      ],
    });
    await createEntry(userA, {
      foodName: 'Wednesday lunch',
      calories: 500,
      protein: 40,
      carbs: 20,
      fat: 10,
      consumedAt: '2026-09-09T12:00:00.000Z',
    });
    await createEntry(userA, {
      foodName: 'Vitamin D IU source',
      calories: 10,
      protein: 0,
      carbs: 0,
      fat: 0,
      consumedAt: '2026-09-08T15:00:00.000Z',
      micronutrients: [{ nutrientKey: 'vitamin_d', amount: 400, unit: 'IU' }],
    });

    await createEntry(userB, {
      foodName: 'B secret meal',
      calories: 8000,
      protein: 400,
      carbs: 400,
      fat: 400,
      consumedAt: '2026-09-08T12:00:00.000Z',
      micronutrients: [
        { nutrientKey: 'iron', amount: 900, unit: 'mg' },
        { nutrientKey: 'zinc', amount: 50, unit: 'mg' },
      ],
    });
    await createEntry(userB, {
      foodName: 'Kolkata next-day boundary',
      calories: 333,
      protein: 11,
      carbs: 22,
      fat: 9,
      consumedAt: '2026-09-12T23:30:00.000Z',
    });
  });

  afterAll(async () => {
    const userIds = [userA?.user.id, userB?.user.id, userNoGoal?.user.id, userToday?.user.id].filter(
      Boolean,
    );
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await app.close();
    await prisma.$disconnect();
  });

  it('rejects unauthenticated reports', async () => {
    const endpoints = [
      '/api/v1/reports/today',
      '/api/v1/reports/calories?startDate=2026-09-07&endDate=2026-09-08',
      '/api/v1/reports/macros?startDate=2026-09-07&endDate=2026-09-08',
      '/api/v1/reports/micronutrients?startDate=2026-09-07&endDate=2026-09-08',
      '/api/v1/reports/goals?startDate=2026-09-07&endDate=2026-09-08',
      '/api/v1/reports/insights?startDate=2026-09-07&endDate=2026-09-08',
    ];

    for (const url of endpoints) {
      const response = await app.inject({ method: 'GET', url });
      expect(response.statusCode, url).toBe(401);
    }
  });

  it("returns today's totals for the local calendar day", async () => {
    await prisma.foodEntry.create({
      data: {
        userId: userToday.user.id,
        mealType: 'BREAKFAST',
        foodName: 'Today apple',
        quantity: 1,
        quantityUnit: 'piece',
        calories: 95,
        protein: 0.5,
        carbs: 25,
        fat: 0.3,
        consumedAt: new Date(),
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/today',
      headers: auth(userToday),
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as TodayReport;
    expect(body.timezone).toBe('UTC');
    expect(body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(body.calories).toBeGreaterThanOrEqual(95);
  });

  it("includes more than 50 food entries in today's totals", async () => {
    const now = new Date();
    await prisma.foodEntry.createMany({
      data: Array.from({ length: 51 }, (_, index) => ({
        userId: userToday.user.id,
        mealType: 'SNACKS' as const,
        foodName: `Bulk snack ${index}`,
        quantity: 1,
        quantityUnit: 'piece',
        calories: 10,
        protein: 1,
        carbs: 1,
        fat: 1,
        consumedAt: now,
      })),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/today',
      headers: auth(userToday),
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as TodayReport;
    expect(body.calories).toBeGreaterThanOrEqual(510);
  });

  it('aggregates the calorie trend and fills zero days', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/calories?startDate=2026-09-07&endDate=2026-09-10',
      headers: auth(userA),
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as CalorieReport;
    expect(body.data.map((row) => row.date)).toEqual([
      '2026-09-07',
      '2026-09-08',
      '2026-09-09',
      '2026-09-10',
    ]);
    expect(body.data[0]?.calories).toBe(2100);
    expect(body.data[1]?.calories).toBe(1850);
    expect(body.data[2]?.calories).toBe(500);
    expect(body.data[3]?.calories).toBe(0);
    expect(body.totals.calories).toBe(4450);
  });

  it('aggregates daily macros', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/macros?startDate=2026-09-07&endDate=2026-09-08',
      headers: auth(userA),
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as MacroReport;
    expect(body.data).toHaveLength(2);
    expect(body.data[0]).toMatchObject({ date: '2026-09-07', protein: 120, carbs: 210, fat: 65 });
    expect(body.data[1]).toMatchObject({ date: '2026-09-08', protein: 112, carbs: 205, fat: 61 });
    expect(body.totals).toEqual({ protein: 232, carbs: 415, fat: 126 });
  });

  it('aggregates micronutrients by key and unit without mixing units', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/micronutrients?startDate=2026-09-07&endDate=2026-09-08',
      headers: auth(userA),
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as MicroReport;
    expect(body.data).toEqual(
      expect.arrayContaining([
        { nutrientKey: 'iron', amount: 42.5, unit: 'mg' },
        { nutrientKey: 'calcium', amount: 840, unit: 'mg' },
        { nutrientKey: 'vitamin_d', amount: 15, unit: 'mcg' },
        { nutrientKey: 'vitamin_d', amount: 400, unit: 'IU' },
      ]),
    );
    expect(body.data.find((row) => row.nutrientKey === 'zinc')).toBeUndefined();

    const alias = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/micros?startDate=2026-09-07&endDate=2026-09-08',
      headers: auth(userA),
    });
    expect(alias.statusCode).toBe(200);
    expect((alias.json() as MicroReport).data).toHaveLength(body.data.length);
  });

  it('compares goal vs actual for the requested period', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/goals?startDate=2026-09-08&endDate=2026-09-08',
      headers: auth(userA),
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as GoalVsActualReport;
    expect(body.dayCount).toBe(1);
    expect(body.dailyGoal).toEqual({ calories: 2200, protein: 140, carbs: 250, fat: 70 });
    expect(body.goal).toEqual({ calories: 2200, protein: 140, carbs: 250, fat: 70 });
    expect(body.actual.calories).toBe(1850);
    expect(body.actual.protein).toBe(112);
  });

  it('returns a clear no-goal response without inventing targets', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/goal-vs-actual?startDate=2026-09-07&endDate=2026-09-07',
      headers: auth(userNoGoal),
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as GoalVsActualReport;
    expect(body.goal).toBeNull();
    expect(body.dailyGoal).toBeNull();
    expect(body.actual).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  });

  it('returns zero series for an empty period', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/calories?startDate=2026-01-01&endDate=2026-01-03',
      headers: auth(userA),
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as CalorieReport;
    expect(body.data).toEqual([
      { date: '2026-01-01', calories: 0 },
      { date: '2026-01-02', calories: 0 },
      { date: '2026-01-03', calories: 0 },
    ]);
    expect(body.totals.calories).toBe(0);
  });

  it('represents days with no entries as zero in a continuous series', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/macros?startDate=2026-09-07&endDate=2026-09-10',
      headers: auth(userA),
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as MacroReport;
    expect(body.data[3]).toEqual({ date: '2026-09-10', protein: 0, carbs: 0, fat: 0 });
  });

  it('applies the startDate filter', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/calories?startDate=2026-09-08&endDate=2026-09-09',
      headers: auth(userA),
    });
    const body = response.json() as CalorieReport;
    expect(body.data[0]?.date).toBe('2026-09-08');
    expect(body.data.map((row) => row.calories)).not.toContain(2100);
    expect(body.data[0]?.calories).toBe(1850);
  });

  it('applies the endDate filter', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/calories?startDate=2026-09-07&endDate=2026-09-07',
      headers: auth(userA),
    });
    const body = response.json() as CalorieReport;
    expect(body.data).toEqual([{ date: '2026-09-07', calories: 2100 }]);
  });

  it('buckets a UTC timestamp into the next local calendar day', async () => {
    const local13 = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/calories?startDate=2026-09-13&endDate=2026-09-13',
      headers: auth(userB),
    });
    expect((local13.json() as CalorieReport).data[0]?.calories).toBe(333);

    const local12 = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/calories?startDate=2026-09-12&endDate=2026-09-12',
      headers: auth(userB),
    });
    expect((local12.json() as CalorieReport).data[0]?.calories).toBe(0);
  });

  it('isolates calorie, macro, micronutrient, and goal data across users', async () => {
    const calories = await app.inject({
      method: 'GET',
      url: `/api/v1/reports/calories?startDate=2026-09-08&endDate=2026-09-08&userId=${userB.user.id}`,
      headers: auth(userA),
    });
    expect((calories.json() as CalorieReport).totals.calories).toBe(1850);

    const macros = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/macros?startDate=2026-09-08&endDate=2026-09-08',
      headers: auth(userA),
    });
    expect((macros.json() as MacroReport).totals.protein).toBe(112);

    const micros = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/micronutrients?startDate=2026-09-07&endDate=2026-09-08',
      headers: auth(userA),
    });
    const microBody = micros.json() as MicroReport;
    expect(microBody.data.find((row) => row.nutrientKey === 'zinc')).toBeUndefined();
    expect(microBody.data.find((row) => row.nutrientKey === 'iron')?.amount).toBe(42.5);

    const goals = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/goals?startDate=2026-09-08&endDate=2026-09-08',
      headers: auth(userA),
    });
    expect((goals.json() as GoalVsActualReport).dailyGoal?.calories).toBe(2200);
    expect((goals.json() as GoalVsActualReport).actual.calories).not.toBe(8000);
  });

  it("never lets another user's food entries affect totals", async () => {
    const asB = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/calories?startDate=2026-09-08&endDate=2026-09-08',
      headers: auth(userB),
    });
    expect((asB.json() as CalorieReport).totals.calories).toBe(8000);

    const asA = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/calories?startDate=2026-09-08&endDate=2026-09-08',
      headers: auth(userA),
    });
    expect((asA.json() as CalorieReport).totals.calories).toBe(1850);
  });

  it("never lets another user's micronutrients affect totals", async () => {
    const asB = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/micronutrients?startDate=2026-09-08&endDate=2026-09-08',
      headers: auth(userB),
    });
    const data = (asB.json() as MicroReport).data;
    expect(data).toEqual(
      expect.arrayContaining([
        { nutrientKey: 'iron', amount: 900, unit: 'mg' },
        { nutrientKey: 'zinc', amount: 50, unit: 'mg' },
      ]),
    );
  });

  it("never lets another user's goal affect goal-vs-actual", async () => {
    const asB = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/goals?startDate=2026-09-08&endDate=2026-09-08',
      headers: auth(userB),
    });
    expect((asB.json() as GoalVsActualReport).dailyGoal?.calories).toBe(5800);
  });

  it('rejects an inverted date range', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/calories?startDate=2026-09-10&endDate=2026-09-07',
      headers: auth(userA),
    });
    expect(response.statusCode).toBe(400);
  });

  it('rejects an excessively large report range', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/reports/calories?startDate=2026-01-01&endDate=2026-04-05`,
      headers: auth(userA),
    });
    expect(response.statusCode).toBe(400);
    expect(MAX_REPORT_RANGE_DAYS).toBe(93);
  });

  it('rejects unbounded report queries missing dates', async () => {
    const missing = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/calories',
      headers: auth(userA),
    });
    expect(missing.statusCode).toBe(400);

    const partial = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/macros?startDate=2026-09-07',
      headers: auth(userA),
    });
    expect(partial.statusCode).toBe(400);
  });

  it('summarizes tracked days, averages, and on-target counts from persisted entries', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/insights?startDate=2026-09-07&endDate=2026-09-13',
      headers: auth(userA),
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      timezone: string;
      dayCount: number;
      averageCalories: number;
      averageProtein: number;
      daysTracked: number;
      daysOnTarget: number;
      daysOver: number;
      currentStreak: number;
      dailyGoal: { calories: number } | null;
    };
    expect(body.timezone).toBe('UTC');
    expect(body.dayCount).toBe(7);
    expect(body.averageCalories).toBe(635.7);
    expect(body.averageProtein).toBe(38.9);
    expect(body.daysTracked).toBe(3);
    expect(body.daysOnTarget).toBe(3);
    expect(body.daysOver).toBe(0);
    expect(body.dailyGoal?.calories).toBe(2200);
    expect(body.currentStreak).toBe(0);
  });

  it('counts a current streak from consecutive tracked days ending today', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    await createEntry(userNoGoal, {
      foodName: 'Streak yesterday',
      calories: 400,
      consumedAt: `${yesterday}T12:00:00.000Z`,
    });
    await createEntry(userNoGoal, {
      foodName: 'Streak today',
      calories: 350,
      consumedAt: `${today}T12:00:00.000Z`,
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/reports/insights?startDate=${yesterday}&endDate=${today}`,
      headers: auth(userNoGoal),
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as { currentStreak: number; daysTracked: number };
    expect(body.daysTracked).toBe(2);
    expect(body.currentStreak).toBeGreaterThanOrEqual(2);
  });
});
