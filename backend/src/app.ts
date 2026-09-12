import Fastify from 'fastify';
import cors from '@fastify/cors';
import type { Env } from './config/env.js';
import { authPlugin } from './plugins/auth.js';
import { registerErrorHandler } from './plugins/error-handler.js';
import { authRoutes } from './routes/auth.js';
import { foodEntryRoutes } from './routes/food-entries.js';
import { goalRoutes } from './routes/goals.js';
import { healthRoutes } from './routes/health.js';

export async function buildApp(env: Env) {
  const app = Fastify({
    logger: env.NODE_ENV !== 'test',
  });

  registerErrorHandler(app);

  await app.register(cors, {
    origin: env.CORS_ORIGIN,
  });

  await app.register(authPlugin, { env });
  await app.register(healthRoutes, { prefix: '/api/v1' });
  await app.register(authRoutes, { prefix: '/api/v1', env });
  await app.register(goalRoutes, { prefix: '/api/v1' });
  await app.register(foodEntryRoutes, { prefix: '/api/v1' });

  return app;
}
