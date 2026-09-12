import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { loadEnv } from '../src/config/env.js';
import { prisma } from '../src/db/prisma.js';

describe('GET /api/v1/health', () => {
  const env = loadEnv({
    ...process.env,
    NODE_ENV: 'test',
  });

  const appPromise = buildApp(env);

  beforeAll(async () => {
    await appPromise;
  });

  afterAll(async () => {
    const app = await appPromise;
    await app.close();
    await prisma.$disconnect();
  });

  it('returns health payload and reaches the database', async () => {
    const app = await appPromise;
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    });

    expect(response.statusCode).toBe(200);

    const body = response.json() as {
      status: string;
      database: string;
      timestamp: string;
    };

    expect(body.status).toBe('ok');
    expect(body.database).toBe('up');
    expect(typeof body.timestamp).toBe('string');
  });
});
