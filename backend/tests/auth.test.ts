import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { loadEnv } from '../src/config/env.js';
import { prisma } from '../src/db/prisma.js';

describe('auth API', () => {
  const env = loadEnv({
    ...process.env,
    NODE_ENV: 'test',
  });

  let app: FastifyInstance;
  const suffix = Date.now();
  const email = `phase1_${suffix}@example.com`;
  const password = 'secure-pass-123';
  let accessToken = '';
  let refreshToken = '';
  let userId = '';

  beforeAll(async () => {
    app = await buildApp(env);
    await app.ready();
  });

  afterAll(async () => {
    if (userId) {
      await prisma.refreshToken.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    await app.close();
    await prisma.$disconnect();
  });

  it('registers a new user', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email, password, timezone: 'UTC' },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json() as {
      user: { id: string; email: string };
      accessToken: string;
      refreshToken: string;
    };
    expect(body.user.email).toBe(email);
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();

    userId = body.user.id;
    accessToken = body.accessToken;
    refreshToken = body.refreshToken;
  });

  it('rejects duplicate registration', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email, password },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('CONFLICT');
  });

  it('rejects invalid login credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password: 'wrong-password' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('UNAUTHORIZED');
  });

  it('logs in with valid credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      user: { id: string };
      accessToken: string;
      refreshToken: string;
    };
    expect(body.user.id).toBe(userId);
    accessToken = body.accessToken;
    refreshToken = body.refreshToken;
  });

  it('rejects unauthenticated /auth/me', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('UNAUTHORIZED');
  });

  it('returns the authenticated user for /auth/me', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { user: { id: string; email: string } };
    expect(body.user.id).toBe(userId);
    expect(body.user.email).toBe(email);
  });

  it('ignores client-supplied userId on /auth/me', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me?userId=attacker-user-id',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { user: { id: string } };
    expect(body.user.id).toBe(userId);
    expect(body.user.id).not.toBe('attacker-user-id');
  });

  it('rotates refresh tokens', async () => {
    const oldRefresh = refreshToken;
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: oldRefresh },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { accessToken: string; refreshToken: string };
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
    expect(body.refreshToken).not.toBe(oldRefresh);

    accessToken = body.accessToken;
    refreshToken = body.refreshToken;

    const replay = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: oldRefresh },
    });
    expect(replay.statusCode).toBe(401);
  });

  it('logs out and invalidates the refresh token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      payload: { refreshToken },
    });

    expect(response.statusCode).toBe(204);

    const refreshAfterLogout = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken },
    });
    expect(refreshAfterLogout.statusCode).toBe(401);
  });
});
