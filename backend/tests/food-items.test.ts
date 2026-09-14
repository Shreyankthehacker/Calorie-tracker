import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { loadEnv } from '../src/config/env.js';
import { prisma } from '../src/db/prisma.js';

type AuthResponse = {
  user: { id: string; email: string };
  accessToken: string;
};

type FoodEntry = {
  id: string;
  mealType: string;
  foodName: string;
  quantity: number;
  quantityUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  micronutrients: Array<{ nutrientKey: string; amount: number; unit: string }>;
};

type FoodItem = {
  id: string;
  name: string;
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealTypes: string[];
  micronutrients: Array<{ nutrientKey: string; amount: number; unit: string }>;
};

describe('food items catalog API', () => {
  const env = loadEnv({
    ...process.env,
    NODE_ENV: 'test',
  });

  let app: FastifyInstance;
  const suffix = Date.now();
  const password = 'secure-pass-123';
  let userA: AuthResponse;
  let userB: AuthResponse;
  let eggsId = '';
  let oatsId = '';
  let bananaId = '';
  const createdItemIds: string[] = [];

  async function register(label: string): Promise<AuthResponse> {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: `catalog_${label}_${suffix}@example.com`,
        password,
      },
    });
    expect(response.statusCode).toBe(201);
    return response.json() as AuthResponse;
  }

  function auth(user: AuthResponse) {
    return { authorization: `Bearer ${user.accessToken}` };
  }

  beforeAll(async () => {
    app = await buildApp(env);
    await app.ready();
    userA = await register('a');
    userB = await register('b');

    const eggs = await prisma.foodItem.create({
      data: {
        name: `Eggs ${suffix}`,
        category: 'protein',
        servingSize: 1,
        servingUnit: 'egg',
        calories: 78,
        protein: 6.3,
        carbs: 0.6,
        fat: 5.3,
        sourceType: 'SYSTEM',
        sourceReference: 'test',
        verified: true,
        mealTypes: {
          create: [{ mealType: 'BREAKFAST' }, { mealType: 'LUNCH' }, { mealType: 'SNACKS' }],
        },
      },
    });
    const oats = await prisma.foodItem.create({
      data: {
        name: `Oats ${suffix}`,
        category: 'grain',
        servingSize: 100,
        servingUnit: 'g',
        calories: 389,
        protein: 16.9,
        carbs: 66,
        fat: 6.9,
        sourceType: 'SYSTEM',
        sourceReference: 'test',
        verified: true,
        mealTypes: { create: [{ mealType: 'BREAKFAST' }] },
        nutrients: { create: [{ nutrientKey: 'iron', amount: 4.7, unit: 'mg' }] },
      },
    });
    const banana = await prisma.foodItem.create({
      data: {
        name: `Banana ${suffix}`,
        category: 'fruit',
        servingSize: 1,
        servingUnit: 'piece',
        calories: 105,
        protein: 1.3,
        carbs: 27,
        fat: 0.4,
        sourceType: 'SYSTEM',
        sourceReference: 'test',
        verified: true,
        mealTypes: { create: [{ mealType: 'BREAKFAST' }, { mealType: 'SNACKS' }] },
        nutrients: { create: [{ nutrientKey: 'potassium', amount: 422, unit: 'mg' }] },
      },
    });
    eggsId = eggs.id;
    oatsId = oats.id;
    bananaId = banana.id;
    createdItemIds.push(eggs.id, oats.id, banana.id);
  });

  afterAll(async () => {
    const userIds = [userA?.user.id, userB?.user.id].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    if (createdItemIds.length > 0) {
      await prisma.foodItem.deleteMany({ where: { id: { in: createdItemIds } } });
    }
    await app.close();
    await prisma.$disconnect();
  });

  it('rejects unauthenticated list, get, and log', async () => {
    const list = await app.inject({ method: 'GET', url: '/api/v1/food-items' });
    expect(list.statusCode).toBe(401);

    const get = await app.inject({ method: 'GET', url: `/api/v1/food-items/${eggsId}` });
    expect(get.statusCode).toBe(401);

    const log = await app.inject({
      method: 'POST',
      url: `/api/v1/food-items/${eggsId}/entries`,
      payload: {
        quantity: 3,
        mealType: 'BREAKFAST',
        consumedAt: '2026-09-13T08:00:00.000Z',
      },
    });
    expect(log.statusCode).toBe(401);
  });

  it('lists catalog items and filters by meal type and search', async () => {
    const all = await app.inject({
      method: 'GET',
      url: '/api/v1/food-items?pageSize=50',
      headers: auth(userA),
    });
    expect(all.statusCode).toBe(200);
    const allBody = all.json() as { data: FoodItem[]; pagination: { total: number } };
    expect(allBody.data.some((item) => item.id === eggsId)).toBe(true);

    const breakfast = await app.inject({
      method: 'GET',
      url: `/api/v1/food-items?mealType=BREAKFAST&q=Oats%20${suffix}`,
      headers: auth(userA),
    });
    expect(breakfast.statusCode).toBe(200);
    const breakfastBody = breakfast.json() as { data: FoodItem[] };
    expect(breakfastBody.data).toHaveLength(1);
    expect(breakfastBody.data[0]?.id).toBe(oatsId);
    expect(breakfastBody.data[0]?.mealTypes).toEqual(['BREAKFAST']);

    const lunch = await app.inject({
      method: 'GET',
      url: `/api/v1/food-items?mealType=LUNCH&q=${suffix}`,
      headers: auth(userA),
    });
    expect(lunch.statusCode).toBe(200);
    const lunchIds = (lunch.json() as { data: FoodItem[] }).data.map((item) => item.id);
    expect(lunchIds).toContain(eggsId);
    expect(lunchIds).not.toContain(oatsId);
    expect(lunchIds).not.toContain(bananaId);
  });

  it('returns a catalog item by id and 404 for unknown ids', async () => {
    const found = await app.inject({
      method: 'GET',
      url: `/api/v1/food-items/${bananaId}`,
      headers: auth(userA),
    });
    expect(found.statusCode).toBe(200);
    const item = (found.json() as { foodItem: FoodItem }).foodItem;
    expect(item.name).toBe(`Banana ${suffix}`);
    expect(item.micronutrients).toEqual([{ nutrientKey: 'potassium', amount: 422, unit: 'mg' }]);

    const missing = await app.inject({
      method: 'GET',
      url: '/api/v1/food-items/does-not-exist',
      headers: auth(userA),
    });
    expect(missing.statusCode).toBe(404);
  });

  it('scales catalog nutrition and creates a FoodEntry for the authenticated user', async () => {
    const logged = await app.inject({
      method: 'POST',
      url: `/api/v1/food-items/${eggsId}/entries`,
      headers: auth(userA),
      payload: {
        quantity: 3,
        mealType: 'BREAKFAST',
        consumedAt: '2026-09-13T08:00:00.000Z',
      },
    });
    expect(logged.statusCode).toBe(201);
    const entry = (logged.json() as { foodEntry: FoodEntry }).foodEntry;
    expect(entry.foodName).toBe(`Eggs ${suffix}`);
    expect(entry.quantity).toBe(3);
    expect(entry.quantityUnit).toBe('egg');
    expect(entry.mealType).toBe('BREAKFAST');
    expect(entry.calories).toBe(234);
    expect(entry.protein).toBe(18.9);
    expect(entry.carbs).toBe(1.8);
    expect(entry.fat).toBe(15.9);

    const owned = await app.inject({
      method: 'GET',
      url: `/api/v1/food-entries/${entry.id}`,
      headers: auth(userA),
    });
    expect(owned.statusCode).toBe(200);

    const other = await app.inject({
      method: 'GET',
      url: `/api/v1/food-entries/${entry.id}`,
      headers: auth(userB),
    });
    expect(other.statusCode).toBe(404);
  });

  it('copies nutrition into the entry so later catalog edits do not rewrite history', async () => {
    const logged = await app.inject({
      method: 'POST',
      url: `/api/v1/food-items/${oatsId}/entries`,
      headers: auth(userA),
      payload: {
        quantity: 50,
        mealType: 'BREAKFAST',
        consumedAt: '2026-09-13T08:30:00.000Z',
      },
    });
    expect(logged.statusCode).toBe(201);
    const entry = (logged.json() as { foodEntry: FoodEntry }).foodEntry;
    expect(entry.calories).toBe(194.5);
    expect(entry.protein).toBe(8.5);
    expect(entry.micronutrients).toEqual([{ nutrientKey: 'iron', amount: 2.4, unit: 'mg' }]);

    await prisma.foodItem.update({
      where: { id: oatsId },
      data: { calories: 400, protein: 20 },
    });

    const fetched = await app.inject({
      method: 'GET',
      url: `/api/v1/food-entries/${entry.id}`,
      headers: auth(userA),
    });
    expect(fetched.statusCode).toBe(200);
    const snapshot = (fetched.json() as { foodEntry: FoodEntry }).foodEntry;
    expect(snapshot.calories).toBe(194.5);
    expect(snapshot.protein).toBe(8.5);
  });

  it('rejects invalid quantity and unknown catalog items', async () => {
    const zero = await app.inject({
      method: 'POST',
      url: `/api/v1/food-items/${eggsId}/entries`,
      headers: auth(userA),
      payload: {
        quantity: 0,
        mealType: 'BREAKFAST',
        consumedAt: '2026-09-13T08:00:00.000Z',
      },
    });
    expect(zero.statusCode).toBe(400);

    const missing = await app.inject({
      method: 'POST',
      url: '/api/v1/food-items/does-not-exist/entries',
      headers: auth(userA),
      payload: {
        quantity: 1,
        mealType: 'DINNER',
        consumedAt: '2026-09-13T19:00:00.000Z',
      },
    });
    expect(missing.statusCode).toBe(404);
  });
});
