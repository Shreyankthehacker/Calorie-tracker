import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { loadEnv } from '../src/config/env.js';
import { prisma } from '../src/db/prisma.js';
import {
  assertSafeCorsOrigins,
  createCorsOriginDelegate,
  parseCorsOrigins,
  resolveCorsOrigins,
} from '../src/lib/cors.js';

describe('CORS origin parsing', () => {
  it('parses a comma-separated allowlist', () => {
    expect(parseCorsOrigins('http://localhost:5173, https://app.example.com')).toEqual([
      'http://localhost:5173',
      'https://app.example.com',
    ]);
  });

  it('merges env origins with the local and Vercel defaults', () => {
    expect(resolveCorsOrigins('http://localhost:5173')).toEqual([
      'http://localhost:5173',
      'https://calorie-tracker-frontend-tau.vercel.app',
    ]);
    expect(resolveCorsOrigins('https://preview.example')).toContain('https://preview.example');
  });

  it('rejects wildcard origins', () => {
    expect(() => assertSafeCorsOrigins(['*'])).toThrow(/must not include \*/);
  });

  it('allows listed origins and rejects others', () => {
    const allow: boolean[] = [];
    const deny: boolean[] = [];
    const missing: boolean[] = [];
    const delegate = createCorsOriginDelegate(['http://localhost:5173']);

    delegate('http://localhost:5173', (_err, allowed) => {
      allow.push(allowed);
    });
    delegate('https://evil.example', (_err, allowed) => {
      deny.push(allowed);
    });
    delegate(undefined, (_err, allowed) => {
      missing.push(allowed);
    });

    expect(allow).toEqual([true]);
    expect(deny).toEqual([false]);
    expect(missing).toEqual([true]);
  });

  it('refuses CORS_ORIGIN=*', () => {
    expect(() =>
      loadEnv({
        ...process.env,
        NODE_ENV: 'test',
        CORS_ORIGIN: '*',
      }),
    ).toThrow(/CORS_ORIGIN/);
  });
});

describe('CORS headers', () => {
  const env = loadEnv({
    ...process.env,
    NODE_ENV: 'test',
    CORS_ORIGIN: 'http://localhost:5173,https://tracker.example',
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

  it('reflects an allowed frontend origin', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
      headers: { origin: 'http://localhost:5173' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('answers login preflight from the local Vite origin', async () => {
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/api/v1/auth/login',
      headers: {
        origin: 'http://localhost:5173',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type, authorization',
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(String(response.headers['access-control-allow-methods'])).toMatch(/POST/);
    expect(String(response.headers['access-control-allow-headers']).toLowerCase()).toMatch(
      /content-type/,
    );
    expect(String(response.headers['access-control-allow-headers']).toLowerCase()).toMatch(
      /authorization/,
    );
  });

  it('answers login preflight from the Vercel frontend even if CORS_ORIGIN is local-only', async () => {
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/api/v1/auth/login',
      headers: {
        origin: 'https://calorie-tracker-frontend-tau.vercel.app',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type, authorization',
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(
      'https://calorie-tracker-frontend-tau.vercel.app',
    );
  });

  it('allows a configured production origin', async () => {
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/api/v1/health',
      headers: {
        origin: 'https://tracker.example',
        'access-control-request-method': 'GET',
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('https://tracker.example');
  });

  it('does not allow an unexpected origin', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
      headers: { origin: 'https://evil.example' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
