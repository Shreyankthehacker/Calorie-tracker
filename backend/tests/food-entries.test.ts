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
  consumedAt: string;
  micronutrients: Array<{ nutrientKey: string; amount: number; unit: string }>;
};

const validEntry = {
  mealType: 'LUNCH',
  foodName: 'Chicken rice bowl',
  quantity: 1,
  quantityUnit: 'serving',
  calories: 620,
  protein: 42,
  carbs: 65,
  fat: 18,
  consumedAt: '2026-09-12T13:15:00.000Z',
};

describe('food entries API', () => {
  const env = loadEnv({
    ...process.env,
    NODE_ENV: 'test',
  });

  let app: FastifyInstance;
  const suffix = Date.now();
  const password = 'secure-pass-123';
  let userA: AuthResponse;
  let userB: AuthResponse;
  let createdId = '';

  async function register(label: string, timezone = 'UTC'): Promise<AuthResponse> {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: `phase3_${label}_${suffix}@example.com`,
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

  beforeAll(async () => {
    app = await buildApp(env);
    await app.ready();
    userA = await register('a');
    userB = await register('b', 'America/New_York');
  });

  afterAll(async () => {
    const userIds = [userA?.user.id, userB?.user.id].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await app.close();
    await prisma.$disconnect();
  });

  it('rejects unauthenticated list and create', async () => {
    const list = await app.inject({ method: 'GET', url: '/api/v1/food-entries' });
    expect(list.statusCode).toBe(401);

    const create = await app.inject({
      method: 'POST',
      url: '/api/v1/food-entries',
      payload: validEntry,
    });
    expect(create.statusCode).toBe(401);
  });

  it('creates, retrieves, updates, and deletes an owned food entry', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/food-entries',
      headers: auth(userA),
      payload: {
        ...validEntry,
        micronutrients: [
          { nutrientKey: 'Iron', amount: 3.2, unit: 'mg' },
          { nutrientKey: 'calcium', amount: 120, unit: 'mg' },
        ],
      },
    });
    expect(created.statusCode).toBe(201);
    const createdBody = created.json() as { foodEntry: FoodEntry };
    createdId = createdBody.foodEntry.id;
    expect(createdBody.foodEntry.foodName).toBe('Chicken rice bowl');
    expect(createdBody.foodEntry.micronutrients.map((n) => n.nutrientKey).sort()).toEqual([
      'calcium',
      'iron',
    ]);

    const fetched = await app.inject({
      method: 'GET',
      url: `/api/v1/food-entries/${createdId}`,
      headers: auth(userA),
    });
    expect(fetched.statusCode).toBe(200);
    expect((fetched.json() as { foodEntry: FoodEntry }).foodEntry.calories).toBe(620);

    const updated = await app.inject({
      method: 'PUT',
      url: `/api/v1/food-entries/${createdId}`,
      headers: auth(userA),
      payload: { calories: 640, foodName: 'Chicken rice bowl (large)' },
    });
    expect(updated.statusCode).toBe(200);
    const updatedEntry = (updated.json() as { foodEntry: FoodEntry }).foodEntry;
    expect(updatedEntry.calories).toBe(640);
    expect(updatedEntry.foodName).toBe('Chicken rice bowl (large)');
    expect(updatedEntry.protein).toBe(42);
    expect(updatedEntry.micronutrients).toHaveLength(2);
  });

  it('blocks cross-user get, update, and delete without leaking existence', async () => {
    const getOther = await app.inject({
      method: 'GET',
      url: `/api/v1/food-entries/${createdId}`,
      headers: auth(userB),
    });
    expect(getOther.statusCode).toBe(404);

    const updateOther = await app.inject({
      method: 'PUT',
      url: `/api/v1/food-entries/${createdId}`,
      headers: auth(userB),
      payload: { calories: 1, userId: userA.user.id },
    });
    expect(updateOther.statusCode).toBe(404);

    const deleteOther = await app.inject({
      method: 'DELETE',
      url: `/api/v1/food-entries/${createdId}`,
      headers: auth(userB),
    });
    expect(deleteOther.statusCode).toBe(404);

    const stillThere = await app.inject({
      method: 'GET',
      url: `/api/v1/food-entries/${createdId}`,
      headers: auth(userA),
    });
    expect(stillThere.statusCode).toBe(200);
  });

  it('ignores client-supplied userId on create', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/food-entries?userId=${userB.user.id}`,
      headers: auth(userA),
      payload: {
        ...validEntry,
        foodName: 'Owned by A despite userId',
        consumedAt: '2026-09-12T18:00:00.000Z',
        userId: userB.user.id,
      },
    });
    expect(response.statusCode).toBe(201);
    const id = (response.json() as { foodEntry: FoodEntry }).foodEntry.id;

    const asB = await app.inject({
      method: 'GET',
      url: `/api/v1/food-entries/${id}`,
      headers: auth(userB),
    });
    expect(asB.statusCode).toBe(404);

    const asA = await app.inject({
      method: 'GET',
      url: `/api/v1/food-entries/${id}`,
      headers: auth(userA),
    });
    expect(asA.statusCode).toBe(200);
  });

  it('rejects invalid mealType, negative macros, non-positive quantity, and invalid consumedAt', async () => {
    const headers = auth(userA);

    const mealType = await app.inject({
      method: 'POST',
      url: '/api/v1/food-entries',
      headers,
      payload: { ...validEntry, mealType: 'BRUNCH' },
    });
    expect(mealType.statusCode).toBe(400);

    for (const field of ['calories', 'protein', 'carbs', 'fat'] as const) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/food-entries',
        headers,
        payload: { ...validEntry, [field]: -1 },
      });
      expect(response.statusCode).toBe(400);
    }

    const zeroQuantity = await app.inject({
      method: 'POST',
      url: '/api/v1/food-entries',
      headers,
      payload: { ...validEntry, quantity: 0 },
    });
    expect(zeroQuantity.statusCode).toBe(400);

    const negativeQuantity = await app.inject({
      method: 'POST',
      url: '/api/v1/food-entries',
      headers,
      payload: { ...validEntry, quantity: -2 },
    });
    expect(negativeQuantity.statusCode).toBe(400);

    const badDate = await app.inject({
      method: 'POST',
      url: '/api/v1/food-entries',
      headers,
      payload: { ...validEntry, consumedAt: 'not-a-date' },
    });
    expect(badDate.statusCode).toBe(400);
  });

  it('rejects duplicate micronutrient keys and reconciles nutrients on update', async () => {
    const duplicate = await app.inject({
      method: 'POST',
      url: '/api/v1/food-entries',
      headers: auth(userA),
      payload: {
        ...validEntry,
        foodName: 'Duplicate micros',
        micronutrients: [
          { nutrientKey: 'iron', amount: 1, unit: 'mg' },
          { nutrientKey: 'Iron', amount: 2, unit: 'mg' },
        ],
      },
    });
    expect(duplicate.statusCode).toBe(400);

    const replaced = await app.inject({
      method: 'PUT',
      url: `/api/v1/food-entries/${createdId}`,
      headers: auth(userA),
      payload: {
        micronutrients: [{ nutrientKey: 'sodium', amount: 400, unit: 'mg' }],
      },
    });
    expect(replaced.statusCode).toBe(200);
    const micros = (replaced.json() as { foodEntry: FoodEntry }).foodEntry.micronutrients;
    expect(micros).toEqual([{ nutrientKey: 'sodium', amount: 400, unit: 'mg' }]);
  });

  it('lists only the authenticated user entries, sorted by consumedAt DESC', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/v1/food-entries',
      headers: auth(userB),
      payload: {
        ...validEntry,
        foodName: 'B breakfast',
        mealType: 'BREAKFAST',
        consumedAt: '2026-09-12T11:00:00.000Z',
      },
    });

    await app.inject({
      method: 'POST',
      url: '/api/v1/food-entries',
      headers: auth(userA),
      payload: {
        ...validEntry,
        foodName: 'A dinner',
        mealType: 'DINNER',
        consumedAt: '2026-09-12T23:00:00.000Z',
      },
    });
    await app.inject({
      method: 'POST',
      url: '/api/v1/food-entries',
      headers: auth(userA),
      payload: {
        ...validEntry,
        foodName: 'A snacks',
        mealType: 'SNACKS',
        consumedAt: '2026-09-11T20:00:00.000Z',
      },
    });

    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/food-entries?page=1&pageSize=20',
      headers: auth(userA),
    });
    expect(list.statusCode).toBe(200);
    const body = list.json() as { data: FoodEntry[]; pagination: { total: number } };
    expect(body.data.every((entry) => !entry.foodName.startsWith('B '))).toBe(true);
    expect(body.data[0]?.foodName).toBe('A dinner');
    const times = body.data.map((entry) => new Date(entry.consumedAt).getTime());
    const sorted = [...times].sort((a, b) => b - a);
    expect(times).toEqual(sorted);
  });

  it('filters by mealType and consumedAt date range', async () => {
    const dinner = await app.inject({
      method: 'GET',
      url: '/api/v1/food-entries?mealType=DINNER',
      headers: auth(userA),
    });
    expect(dinner.statusCode).toBe(200);
    const dinners = (dinner.json() as { data: FoodEntry[] }).data;
    expect(dinners.length).toBeGreaterThan(0);
    expect(dinners.every((entry) => entry.mealType === 'DINNER')).toBe(true);

    const start = await app.inject({
      method: 'GET',
      url: '/api/v1/food-entries?startDate=2026-09-12',
      headers: auth(userA),
    });
    const after = (start.json() as { data: FoodEntry[] }).data;
    expect(after.every((entry) => entry.consumedAt.slice(0, 10) >= '2026-09-12')).toBe(true);
    expect(after.some((entry) => entry.foodName === 'A snacks')).toBe(false);

    const end = await app.inject({
      method: 'GET',
      url: '/api/v1/food-entries?endDate=2026-09-11',
      headers: auth(userA),
    });
    const before = (end.json() as { data: FoodEntry[] }).data;
    expect(before.every((entry) => entry.consumedAt.slice(0, 10) <= '2026-09-11')).toBe(true);

    const combined = await app.inject({
      method: 'GET',
      url: '/api/v1/food-entries?startDate=2026-09-12&endDate=2026-09-12&mealType=LUNCH',
      headers: auth(userA),
    });
    const lunch = (combined.json() as { data: FoodEntry[] }).data;
    expect(lunch.every((entry) => entry.mealType === 'LUNCH')).toBe(true);
  });

  it('applies user timezone when filtering calendar dates', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/food-entries',
      headers: auth(userB),
      payload: {
        ...validEntry,
        foodName: 'NY late evening Aug 31',
        consumedAt: '2026-09-01T02:00:00.000Z',
      },
    });
    expect(created.statusCode).toBe(201);

    const sept1 = await app.inject({
      method: 'GET',
      url: '/api/v1/food-entries?startDate=2026-09-01&endDate=2026-09-01',
      headers: auth(userB),
    });
    const names = (sept1.json() as { data: FoodEntry[] }).data.map((entry) => entry.foodName);
    expect(names).not.toContain('NY late evening Aug 31');

    const aug31 = await app.inject({
      method: 'GET',
      url: '/api/v1/food-entries?startDate=2026-08-31&endDate=2026-08-31',
      headers: auth(userB),
    });
    const augNames = (aug31.json() as { data: FoodEntry[] }).data.map((entry) => entry.foodName);
    expect(augNames).toContain('NY late evening Aug 31');
  });

  it('paginates with metadata and enforces max pageSize', async () => {
    const tooBig = await app.inject({
      method: 'GET',
      url: '/api/v1/food-entries?pageSize=51',
      headers: auth(userA),
    });
    expect(tooBig.statusCode).toBe(400);

    const invalidPage = await app.inject({
      method: 'GET',
      url: '/api/v1/food-entries?page=0',
      headers: auth(userA),
    });
    expect(invalidPage.statusCode).toBe(400);

    const page1 = await app.inject({
      method: 'GET',
      url: '/api/v1/food-entries?page=1&pageSize=2',
      headers: auth(userA),
    });
    expect(page1.statusCode).toBe(200);
    const first = page1.json() as {
      data: FoodEntry[];
      pagination: { page: number; pageSize: number; total: number; totalPages: number };
    };
    expect(first.data).toHaveLength(2);
    expect(first.pagination.page).toBe(1);
    expect(first.pagination.pageSize).toBe(2);
    expect(first.pagination.total).toBeGreaterThanOrEqual(3);
    expect(first.pagination.totalPages).toBe(Math.ceil(first.pagination.total / 2));

    const page2 = await app.inject({
      method: 'GET',
      url: '/api/v1/food-entries?page=2&pageSize=2',
      headers: auth(userA),
    });
    const second = page2.json() as { data: FoodEntry[] };
    expect(second.data[0]?.id).not.toBe(first.data[0]?.id);
  });

  it('returns an empty paginated list and deletes owned entries', async () => {
    const empty = await app.inject({
      method: 'GET',
      url: '/api/v1/food-entries?startDate=2020-01-01&endDate=2020-01-02',
      headers: auth(userA),
    });
    expect(empty.statusCode).toBe(200);
    const body = empty.json() as {
      data: FoodEntry[];
      pagination: { total: number; totalPages: number; page: number };
    };
    expect(body.data).toEqual([]);
    expect(body.pagination.total).toBe(0);
    expect(body.pagination.totalPages).toBe(0);

    const removed = await app.inject({
      method: 'DELETE',
      url: `/api/v1/food-entries/${createdId}`,
      headers: auth(userA),
    });
    expect(removed.statusCode).toBe(204);

    const missing = await app.inject({
      method: 'GET',
      url: `/api/v1/food-entries/${createdId}`,
      headers: auth(userA),
    });
    expect(missing.statusCode).toBe(404);
  });
});
