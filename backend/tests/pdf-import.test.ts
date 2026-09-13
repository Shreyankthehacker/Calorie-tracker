import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { loadEnv } from '../src/config/env.js';
import { prisma } from '../src/db/prisma.js';
import { extractPdfTextBlocks } from '../src/pdf/pdf-extractor.js';
import { reconstructRows } from '../src/pdf/row-reconstructor.js';
import { normalizePdfBlocks } from '../src/pdf/text-normalizer.js';
import { parseFoodDiary } from '../src/pdf/food-diary-parser.js';
import {
  emptyPdf,
  lineDiaryPdf,
  malformedPdf,
  missingCaloriesPdf,
  mixedDiaryPdf,
  multipartPdf,
  tableDiaryPdf,
  unsupportedPdf,
} from './fixtures/pdf-diaries.js';

type AuthResponse = {
  user: { id: string; email: string };
  accessToken: string;
};

describe('PDF food diary import API', () => {
  const env = loadEnv({
    ...process.env,
    NODE_ENV: 'test',
    PDF_RATE_LIMIT_MAX: '1000',
    AI_RATE_LIMIT_MAX: '1000',
  });

  let app: FastifyInstance;
  const suffix = Date.now();
  const password = 'secure-pass-123';
  let userA: AuthResponse;
  let userB: AuthResponse;
  let tablePdf: Buffer;
  let linePdf: Buffer;

  async function register(label: string): Promise<AuthResponse> {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: `bonus2_${label}_${suffix}@example.com`,
        password,
        timezone: 'UTC',
      },
    });
    expect(response.statusCode).toBe(201);
    return response.json() as AuthResponse;
  }

  function auth(user: AuthResponse) {
    return { authorization: `Bearer ${user.accessToken}` };
  }

  async function preview(user: AuthResponse, body: Buffer, filename = 'diary.pdf', contentType = 'application/pdf') {
    const form = multipartPdf({ filename, contentType, body });
    return app.inject({
      method: 'POST',
      url: '/api/v1/imports/food-diary/preview',
      headers: { ...form.headers, ...auth(user) },
      payload: form.payload,
    });
  }

  beforeAll(async () => {
    tablePdf = await tableDiaryPdf();
    linePdf = await lineDiaryPdf();
    app = await buildApp(env);
    await app.ready();
    userA = await register('a');
    userB = await register('b');
  });

  afterAll(async () => {
    const userIds = [userA?.user.id, userB?.user.id].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await app.close();
    await prisma.$disconnect();
  });

  it('extracts positioned text from a generated table PDF', async () => {
    const extracted = await extractPdfTextBlocks(tablePdf);
    expect(extracted.pageCount).toBe(1);
    expect(extracted.blocks.some((block) => block.page === 1 && block.text.includes('Oatmeal'))).toBe(true);
    expect(extracted.blocks.every((block) => block.page === 1)).toBe(true);
    const rows = reconstructRows(normalizePdfBlocks(extracted.blocks));
    const parsed = parseFoodDiary(rows, 'UTC');
    expect(parsed.map((row) => row.foodName)).toEqual(expect.arrayContaining(['Oatmeal', 'Chicken Rice']));
  });

  it('extracts no text blocks from an empty PDF', async () => {
    const extracted = await extractPdfTextBlocks(await emptyPdf());
    expect(extracted.pageCount).toBe(1);
    expect(extracted.blocks).toEqual([]);
  });

  it('rejects unauthenticated preview', async () => {
    const form = multipartPdf({ filename: 'diary.pdf', contentType: 'application/pdf', body: tablePdf });
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/imports/food-diary/preview',
      headers: form.headers,
      payload: form.payload,
    });
    expect(response.statusCode).toBe(401);
  });

  it('rejects a non-PDF upload', async () => {
    const response = await preview(userA, Buffer.from('not-a-pdf'), 'diary.pdf', 'application/pdf');
    expect(response.statusCode).toBe(415);
    expect(response.json().error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('rejects an invalid declared type', async () => {
    const response = await preview(userA, tablePdf, 'diary.txt', 'text/plain');
    expect(response.statusCode).toBe(415);
  });

  it('rejects an oversized PDF', async () => {
    const limitedEnv = loadEnv({
      ...process.env,
      NODE_ENV: 'test',
      PDF_MAX_UPLOAD_BYTES: '64',
      PDF_RATE_LIMIT_MAX: '1000',
    });
    const limited = await buildApp(limitedEnv);
    await limited.ready();
    const form = multipartPdf({ filename: 'diary.pdf', contentType: 'application/pdf', body: tablePdf });
    const response = await limited.inject({
      method: 'POST',
      url: '/api/v1/imports/food-diary/preview',
      headers: { ...form.headers, ...auth(userA) },
      payload: form.payload,
    });
    expect(response.statusCode).toBe(413);
    expect(response.json().error.code).toBe('PAYLOAD_TOO_LARGE');
    await limited.close();
  });

  it('previews a valid table PDF without creating FoodEntries', async () => {
    const before = await prisma.foodEntry.count({ where: { userId: userA.user.id } });
    const response = await preview(userA, tablePdf);
    expect(response.statusCode).toBe(200);
    const body = response.json() as { records: Array<{ foodName: string; status: string }>; filename: string };
    expect(body.filename).toBe('diary.pdf');
    expect(body.records.map((row) => row.foodName)).toEqual(expect.arrayContaining(['Oatmeal', 'Chicken Rice']));
    expect(body.records.every((row: { id: string }) => row.id.startsWith('preview-'))).toBe(true);
    expect(await prisma.foodEntry.count({ where: { userId: userA.user.id } })).toBe(before);
  });

  it('previews a line-oriented diary', async () => {
    const response = await preview(userA, linePdf);
    expect(response.statusCode).toBe(200);
    expect(response.json().records[0].foodName).toBe('Toast');
  });

  it('previews a mixed layout diary', async () => {
    const response = await preview(userA, await mixedDiaryPdf());
    expect(response.statusCode).toBe(200);
    expect(response.json().records[0]).toMatchObject({ foodName: 'Oatmeal', calories: 320 });
  });

  it('returns a warning for missing calories and defaults them to 0', async () => {
    const response = await preview(userA, await missingCaloriesPdf());
    expect(response.statusCode).toBe(200);
    expect(response.json().records[0].calories).toBe(0);
    expect(response.json().records[0].status).toBe('warning');
  });

  it('returns a scanned/empty PDF warning without fake meals', async () => {
    const response = await preview(userA, await emptyPdf());
    expect(response.statusCode).toBe(200);
    expect(response.json().records).toEqual([]);
    expect(response.json().warnings[0].message).toMatch(/scanned|text/i);
  });

  it('returns no invented records for an unsupported layout', async () => {
    const response = await preview(userA, await unsupportedPdf());
    expect(response.statusCode).toBe(200);
    expect(response.json().records).toEqual([]);
    expect(response.json().warnings[0].code).toBe('NO_RECORDS');
  });

  it('rejects a malformed PDF without leaking parser internals', async () => {
    const response = await preview(userA, await malformedPdf());
    expect([400, 200]).toContain(response.statusCode);
    const body = response.json() as { records?: unknown[]; error?: { message: string } };
    const serialized = JSON.stringify(body);
    expect(serialized).not.toMatch(/stack|pdf\.js|workerSrc|node_modules/i);
    if (response.statusCode === 200) {
      expect(body.records).toEqual([]);
    } else {
      expect(body.error?.message).toMatch(/could not be read|valid text-based PDF/i);
    }
  });

  it('creates FoodEntries only after confirm, atomically, for the authenticated user', async () => {
    const beforeA = await prisma.foodEntry.count({ where: { userId: userA.user.id } });
    const beforeB = await prisma.foodEntry.count({ where: { userId: userB.user.id } });
    const previewed = await preview(userA, tablePdf);
    const oatmeal = previewed.json().records.find((row: { foodName: string }) => row.foodName === 'Oatmeal');
    const chicken = previewed.json().records.find((row: { foodName: string }) => row.foodName === 'Chicken Rice');
    const confirm = await app.inject({
      method: 'POST',
      url: '/api/v1/imports/food-diary/confirm',
      headers: auth(userA),
      payload: {
        records: [oatmeal, chicken].map((row: {
          foodName: string;
          mealType: string;
          quantity: number;
          quantityUnit: string;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
          consumedAt: string;
        }) => ({
          foodName: row.foodName,
          mealType: row.mealType,
          quantity: row.quantity,
          quantityUnit: row.quantityUnit ?? 'serving',
          calories: row.calories,
          protein: row.protein,
          carbs: row.carbs,
          fat: row.fat,
          consumedAt: row.consumedAt,
        })),
      },
    });
    expect(confirm.statusCode).toBe(201);
    expect(confirm.json().importedCount).toBe(2);
    expect(await prisma.foodEntry.count({ where: { userId: userA.user.id } })).toBe(beforeA + 2);
    expect(await prisma.foodEntry.count({ where: { userId: userB.user.id } })).toBe(beforeB);
  });

  it('marks duplicates in preview after an import', async () => {
    const response = await preview(userA, tablePdf);
    expect(response.statusCode).toBe(200);
    expect(response.json().records.every((row: { duplicate: boolean }) => row.duplicate)).toBe(true);
  });

  it('rejects confirm without authentication', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/imports/food-diary/confirm',
      payload: { records: [] },
    });
    expect(response.statusCode).toBe(401);
  });

  it('rejects invalid confirmation records and does not import a partial batch', async () => {
    const before = await prisma.foodEntry.count({ where: { userId: userA.user.id } });
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/imports/food-diary/confirm',
      headers: auth(userA),
      payload: {
        records: [
          {
            foodName: 'Valid oatmeal',
            mealType: 'BREAKFAST',
            quantity: 1,
            quantityUnit: 'bowl',
            calories: 320,
            protein: 12,
            carbs: 52,
            fat: 8,
            consumedAt: '2026-09-13T08:00:00.000Z',
          },
          {
            foodName: 'Bad',
            mealType: 'LUNCH',
            quantity: 1,
            quantityUnit: 'bowl',
            calories: -5,
            protein: 0,
            carbs: 0,
            fat: 0,
            consumedAt: '2026-09-13T12:00:00.000Z',
          },
        ],
      },
    });
    expect(response.statusCode).toBe(400);
    expect(await prisma.foodEntry.count({ where: { userId: userA.user.id } })).toBe(before);
  });

  it('does not import when a later record fails nutrient validation', async () => {
    const before = await prisma.foodEntry.count({ where: { userId: userA.user.id } });
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/imports/food-diary/confirm',
      headers: auth(userA),
      payload: {
        records: [
          {
            foodName: 'First',
            mealType: 'BREAKFAST',
            quantity: 1,
            quantityUnit: 'bowl',
            calories: 100,
            protein: 1,
            carbs: 1,
            fat: 1,
            consumedAt: '2026-09-14T08:00:00.000Z',
          },
          {
            foodName: 'Second',
            mealType: 'LUNCH',
            quantity: 1,
            quantityUnit: 'bowl',
            calories: 100,
            protein: 1,
            carbs: 1,
            fat: 1,
            consumedAt: '2026-09-14T12:00:00.000Z',
            micronutrients: [
              { nutrientKey: 'iron', amount: 1, unit: 'mg' },
              { nutrientKey: 'iron', amount: 2, unit: 'mg' },
            ],
          },
        ],
      },
    });
    expect(response.statusCode).toBe(400);
    expect(await prisma.foodEntry.count({ where: { userId: userA.user.id } })).toBe(before);
  });

  it('rate-limits preview', async () => {
    const limitedEnv = loadEnv({
      ...process.env,
      NODE_ENV: 'test',
      PDF_RATE_LIMIT_MAX: '2',
      PDF_RATE_LIMIT_TIME_WINDOW_MS: '60000',
    });
    const limited = await buildApp(limitedEnv);
    await limited.ready();
    const first = await limited.inject({
      method: 'POST',
      url: '/api/v1/imports/food-diary/preview',
      headers: { ...multipartPdf({ filename: 'diary.pdf', contentType: 'application/pdf', body: tablePdf }).headers, ...auth(userA) },
      payload: multipartPdf({ filename: 'diary.pdf', contentType: 'application/pdf', body: tablePdf }).payload,
    });
    const second = await limited.inject({
      method: 'POST',
      url: '/api/v1/imports/food-diary/preview',
      headers: { ...multipartPdf({ filename: 'diary.pdf', contentType: 'application/pdf', body: tablePdf }).headers, ...auth(userA) },
      payload: multipartPdf({ filename: 'diary.pdf', contentType: 'application/pdf', body: tablePdf }).payload,
    });
    const third = await limited.inject({
      method: 'POST',
      url: '/api/v1/imports/food-diary/preview',
      headers: { ...multipartPdf({ filename: 'diary.pdf', contentType: 'application/pdf', body: tablePdf }).headers, ...auth(userA) },
      payload: multipartPdf({ filename: 'diary.pdf', contentType: 'application/pdf', body: tablePdf }).payload,
    });
    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(third.statusCode).toBe(429);
    await limited.close();
  });
});
