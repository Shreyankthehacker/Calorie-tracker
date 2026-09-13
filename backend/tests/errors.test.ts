import Fastify from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { buildApp } from '../src/app.js';
import { loadEnv } from '../src/config/env.js';
import { AppError } from '../src/errors/app-error.js';
import { registerErrorHandler } from '../src/plugins/error-handler.js';
import { prisma } from '../src/db/prisma.js';

describe('API error envelope', () => {
  const env = loadEnv({
    ...process.env,
    NODE_ENV: 'test',
  });

  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp(env);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('returns a consistent 404 envelope for unknown routes', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/does-not-exist',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
      },
    });
  });

  it('returns a 401 envelope without a token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error).toMatchObject({
      code: 'UNAUTHORIZED',
      message: expect.any(String),
    });
    expect(response.json().error.message).not.toMatch(/jwt|stack|prisma/i);
  });

  it('returns a validation envelope for invalid JSON', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: { 'content-type': 'application/json' },
      payload: '{not-json',
    });

    expect(response.statusCode).toBe(400);
    const body = response.json() as { error: { code: string; message: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(JSON.stringify(body)).not.toMatch(/Unexpected token|JSON\.parse|at Object/i);
  });

  it('includes structured details for schema validation errors', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'not-an-email', password: 'x' },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json() as {
      error: { code: string; message: string; details?: unknown };
    };
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details).toBeTruthy();
  });
});

describe('generic 500 responses', () => {
  it('does not expose internals to the client', async () => {
    const app = Fastify({ logger: false });
    registerErrorHandler(app);
    app.get('/boom', async () => {
      throw new Error(
        'prisma P1001 DATABASE_URL=postgres://secret@localhost/db GEMINI_API_KEY=AIzaSySecret stack',
      );
    });
    await app.ready();

    const response = await app.inject({ method: 'GET', url: '/boom' });
    const body = response.json() as { error: { code: string; message: string } };

    expect(response.statusCode).toBe(500);
    expect(body).toEqual({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
    expect(JSON.stringify(body)).not.toContain('postgres');
    expect(JSON.stringify(body)).not.toContain('prisma');
    expect(JSON.stringify(body)).not.toContain('AIza');
    expect(JSON.stringify(body)).not.toContain('stack');
    expect(JSON.stringify(body)).not.toContain('GEMINI');

    await app.close();
  });

  it('still returns AppError details for expected failures', async () => {
    const app = Fastify({ logger: false });
    registerErrorHandler(app);
    app.get('/missing', async () => {
      throw new AppError(404, 'NOT_FOUND', 'Resource not found');
    });
    await app.ready();

    const response = await app.inject({ method: 'GET', url: '/missing' });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
      },
    });

    await app.close();
  });

  it('maps Prisma transaction timeouts without leaking internals', async () => {
    const app = Fastify({ logger: false });
    registerErrorHandler(app);
    app.get('/timeout', async () => {
      throw new Prisma.PrismaClientKnownRequestError('Transaction already closed', {
        code: 'P2028',
        clientVersion: 'test',
      });
    });
    await app.ready();

    const response = await app.inject({ method: 'GET', url: '/timeout' });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'The request timed out and no changes were saved. Please try again.',
      },
    });
    expect(JSON.stringify(response.json())).not.toMatch(/prisma|transaction was 5000/i);

    await app.close();
  });
});
