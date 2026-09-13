import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { loadEnv } from '../src/config/env.js';
import { prisma } from '../src/db/prisma.js';
import {
  ProviderFailureError,
  ProviderTimeoutError,
  type NutritionExtractionProvider,
  type NutritionImageInput,
} from '../src/ai/nutrition-provider.js';

type AuthResponse = {
  user: { id: string; email: string };
  accessToken: string;
};

const validExtraction = {
  detected: true,
  foodName: 'Chicken rice bowl',
  quantity: 1,
  quantityUnit: 'serving',
  calories: 620,
  protein: 42,
  carbs: 65,
  fat: 18,
  micronutrients: [{ nutrientKey: 'Iron', amount: 3.2, unit: 'mg' }],
  confidence: 0.87,
  notes: 'Estimated from visible nutrition information.',
  source: 'label' as const,
  mealType: null,
};

function jpegBuffer(): Buffer {
  return Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
    0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
  ]);
}

function pngBuffer(): Buffer {
  return Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00]);
}

function multipart(
  file: { filename: string; contentType: string; body: Buffer },
  fieldName = 'image',
) {
  const boundary = '----VitestFormBoundary7MA4YWxkTrZu0gW';
  const payload = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${file.filename}"\r\nContent-Type: ${file.contentType}\r\n\r\n`,
    ),
    file.body,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return {
    headers: {
      'content-type': `multipart/form-data; boundary=${boundary}`,
    },
    payload,
  };
}

class ScriptedProvider implements NutritionExtractionProvider {
  readonly calls: NutritionImageInput[] = [];
  constructor(private readonly impl: (input: NutritionImageInput) => Promise<unknown>) {}
  extractFromImage(input: NutritionImageInput): Promise<unknown> {
    this.calls.push(input);
    return this.impl(input);
  }
}

describe('AI nutrition extraction API', () => {
  const env = loadEnv({
    ...process.env,
    NODE_ENV: 'test',
    AI_RATE_LIMIT_MAX: '1000',
    AI_MAX_UPLOAD_BYTES: String(5 * 1024 * 1024),
  });

  let app: FastifyInstance;
  const suffix = Date.now();
  const password = 'secure-pass-123';
  let userA: AuthResponse;
  let userB: AuthResponse;
  const provider = new ScriptedProvider(async () => validExtraction);

  async function register(label: string): Promise<AuthResponse> {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: `phase5_${label}_${suffix}@example.com`,
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

  async function extract(user: AuthResponse, file = { filename: 'food.jpg', contentType: 'image/jpeg', body: jpegBuffer() }) {
    const form = multipart(file);
    return app.inject({
      method: 'POST',
      url: '/api/v1/ai/nutrition-extract',
      headers: { ...form.headers, ...auth(user) },
      payload: form.payload,
    });
  }

  beforeAll(async () => {
    app = await buildApp(env, { nutritionProvider: provider });
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

  it('rejects unauthenticated extraction', async () => {
    const form = multipart({ filename: 'food.jpg', contentType: 'image/jpeg', body: jpegBuffer() });
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/nutrition-extract',
      headers: form.headers,
      payload: form.payload,
    });
    expect(response.statusCode).toBe(401);
  });

  it('rejects a missing image', async () => {
    const boundary = '----VitestFormBoundaryEmpty';
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/nutrition-extract',
      headers: {
        ...auth(userA),
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: `--${boundary}\r\nContent-Disposition: form-data; name="note"\r\n\r\nnothing\r\n--${boundary}--\r\n`,
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an unsupported MIME type', async () => {
    const response = await extract(userA, {
      filename: 'food.gif',
      contentType: 'image/gif',
      body: jpegBuffer(),
    });
    expect(response.statusCode).toBe(400);
    expect(provider.calls).toHaveLength(0);
  });

  it('rejects a declared JPEG that is not actually a JPEG', async () => {
    const response = await extract(userA, {
      filename: 'food.jpg',
      contentType: 'image/jpeg',
      body: Buffer.from('not-an-image'),
    });
    expect(response.statusCode).toBe(400);
    expect(provider.calls).toHaveLength(0);
  });

  it('rejects an oversized image', async () => {
    const tinyLimitEnv = loadEnv({
      ...process.env,
      NODE_ENV: 'test',
      AI_RATE_LIMIT_MAX: '1000',
      AI_MAX_UPLOAD_BYTES: '64',
    });
    const smallApp = await buildApp(tinyLimitEnv, { nutritionProvider: provider });
    await smallApp.ready();
    const form = multipart({
      filename: 'food.jpg',
      contentType: 'image/jpeg',
      body: Buffer.concat([jpegBuffer(), Buffer.alloc(200, 1)]),
    });
    const response = await smallApp.inject({
      method: 'POST',
      url: '/api/v1/ai/nutrition-extract',
      headers: { ...form.headers, ...auth(userA) },
      payload: form.payload,
    });
    expect(response.statusCode).toBe(400);
    await smallApp.close();
  });

  it('sends a valid image to the provider and returns structured extraction', async () => {
    const before = await prisma.foodEntry.count({ where: { userId: userA.user.id } });
    const response = await extract(userA);
    expect(response.statusCode).toBe(200);
    expect(provider.calls).toHaveLength(1);
    expect(provider.calls[0]?.mimeType).toBe('image/jpeg');
    expect(provider.calls[0]?.buffer.byteLength).toBeGreaterThan(0);

    const body = response.json() as { extraction: { foodName: string; calories: number; micronutrients: Array<{ nutrientKey: string }> } };
    expect(body.extraction.foodName).toBe('Chicken rice bowl');
    expect(body.extraction.calories).toBe(620);
    expect(body.extraction.micronutrients[0]?.nutrientKey).toBe('iron');

    const after = await prisma.foodEntry.count({ where: { userId: userA.user.id } });
    expect(after).toBe(before);
  });

  it('accepts PNG images', async () => {
    provider.calls.length = 0;
    const response = await extract(userA, {
      filename: 'food.png',
      contentType: 'image/png',
      body: pngBuffer(),
    });
    expect(response.statusCode).toBe(200);
    expect(provider.calls[0]?.mimeType).toBe('image/png');
  });

  it('rejects malformed provider output', async () => {
    const bad = new ScriptedProvider(async () => ({ foodName: 'x' }));
    const isolated = await buildApp(env, { nutritionProvider: bad });
    await isolated.ready();
    const form = multipart({ filename: 'food.jpg', contentType: 'image/jpeg', body: jpegBuffer() });
    const response = await isolated.inject({
      method: 'POST',
      url: '/api/v1/ai/nutrition-extract',
      headers: { ...form.headers, ...auth(userA) },
      payload: form.payload,
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
    await isolated.close();
  });

  it('rejects negative nutritional values without clamping', async () => {
    const bad = new ScriptedProvider(async () => ({ ...validExtraction, calories: -12 }));
    const isolated = await buildApp(env, { nutritionProvider: bad });
    await isolated.ready();
    const form = multipart({ filename: 'food.jpg', contentType: 'image/jpeg', body: jpegBuffer() });
    const response = await isolated.inject({
      method: 'POST',
      url: '/api/v1/ai/nutrition-extract',
      headers: { ...form.headers, ...auth(userA) },
      payload: form.payload,
    });
    expect(response.statusCode).toBe(400);
    await isolated.close();
  });

  it('rejects invalid micronutrient values', async () => {
    const bad = new ScriptedProvider(async () => ({
      ...validExtraction,
      micronutrients: [{ nutrientKey: 'iron', amount: -1, unit: 'mg' }],
    }));
    const isolated = await buildApp(env, { nutritionProvider: bad });
    await isolated.ready();
    const form = multipart({ filename: 'food.jpg', contentType: 'image/jpeg', body: jpegBuffer() });
    const response = await isolated.inject({
      method: 'POST',
      url: '/api/v1/ai/nutrition-extract',
      headers: { ...form.headers, ...auth(userA) },
      payload: form.payload,
    });
    expect(response.statusCode).toBe(400);
    await isolated.close();
  });

  it('handles provider failure without leaking internals', async () => {
    const bad = new ScriptedProvider(async () => {
      throw new ProviderFailureError('secret stack from gemini');
    });
    const isolated = await buildApp(env, { nutritionProvider: bad });
    await isolated.ready();
    const form = multipart({ filename: 'food.jpg', contentType: 'image/jpeg', body: jpegBuffer() });
    const response = await isolated.inject({
      method: 'POST',
      url: '/api/v1/ai/nutrition-extract',
      headers: { ...form.headers, ...auth(userA) },
      payload: form.payload,
    });
    expect(response.statusCode).toBe(502);
    expect(response.json().error.code).toBe('AI_PROVIDER_ERROR');
    expect(JSON.stringify(response.json())).not.toContain('secret stack');
    await isolated.close();
  });

  it('handles provider timeout', async () => {
    const bad = new ScriptedProvider(async () => {
      throw new ProviderTimeoutError();
    });
    const isolated = await buildApp(env, { nutritionProvider: bad });
    await isolated.ready();
    const form = multipart({ filename: 'food.jpg', contentType: 'image/jpeg', body: jpegBuffer() });
    const response = await isolated.inject({
      method: 'POST',
      url: '/api/v1/ai/nutrition-extract',
      headers: { ...form.headers, ...auth(userA) },
      payload: form.payload,
    });
    expect(response.statusCode).toBe(504);
    expect(response.json().error.message).toBe('AI provider timed out');
    await isolated.close();
  });

  it('returns a structured undetected result instead of inventing values', async () => {
    const empty = new ScriptedProvider(async () => ({ detected: false }));
    const isolated = await buildApp(env, { nutritionProvider: empty });
    await isolated.ready();
    const form = multipart({ filename: 'food.jpg', contentType: 'image/jpeg', body: jpegBuffer() });
    const response = await isolated.inject({
      method: 'POST',
      url: '/api/v1/ai/nutrition-extract',
      headers: { ...form.headers, ...auth(userA) },
      payload: form.payload,
    });
    expect(response.statusCode).toBe(422);
    expect(response.json().error.message).toMatch(/no nutrition information detected/i);
    await isolated.close();
  });

  it('does not create a FoodEntry', async () => {
    const before = await prisma.foodEntry.count();
    const response = await extract(userA);
    expect(response.statusCode).toBe(200);
    const after = await prisma.foodEntry.count();
    expect(after).toBe(before);
  });

  it('is stateless: another user cannot access extraction results and no shared extraction rows exist', async () => {
    const response = await extract(userB);
    expect(response.statusCode).toBe(200);
    expect(
      await prisma.foodEntry.count({
        where: { userId: { in: [userA.user.id, userB.user.id] } },
      }),
    ).toBe(0);
  });

  it('rate-limits the extraction endpoint', async () => {
    const limitedEnv = loadEnv({
      ...process.env,
      NODE_ENV: 'test',
      AI_RATE_LIMIT_MAX: '2',
      AI_RATE_LIMIT_TIME_WINDOW_MS: '60000',
    });
    const limited = await buildApp(limitedEnv, { nutritionProvider: provider });
    await limited.ready();
    const form = multipart({ filename: 'food.jpg', contentType: 'image/jpeg', body: jpegBuffer() });

    const first = await limited.inject({
      method: 'POST',
      url: '/api/v1/ai/nutrition-extract',
      headers: { ...form.headers, ...auth(userA) },
      payload: form.payload,
    });
    const second = await limited.inject({
      method: 'POST',
      url: '/api/v1/ai/nutrition-extract',
      headers: { ...form.headers, ...auth(userA) },
      payload: form.payload,
    });
    const third = await limited.inject({
      method: 'POST',
      url: '/api/v1/ai/nutrition-extract',
      headers: { ...form.headers, ...auth(userA) },
      payload: form.payload,
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(third.statusCode).toBe(429);
    expect(third.json().error.code).toBe('RATE_LIMITED');
    await limited.close();
  });
});
