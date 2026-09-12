import Fastify from 'fastify';
import cors from '@fastify/cors';
import type { Env } from './config/env.js';
import { healthRoutes } from './routes/health.js';

export async function buildApp(env: Env) {
  const app = Fastify({
    logger: env.NODE_ENV !== 'test',
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN,
  });

  await app.register(healthRoutes, { prefix: '/api/v1' });

  return app;
}
