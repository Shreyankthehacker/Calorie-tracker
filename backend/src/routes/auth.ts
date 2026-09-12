import type { FastifyPluginAsync } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import type { Env } from '../config/env.js';
import { AuthHandler } from '../handlers/auth-handler.js';
import {
  loginBodySchema,
  logoutBodySchema,
  refreshBodySchema,
  registerBodySchema,
} from '../schemas/auth.js';
import { AuthService } from '../services/auth-service.js';

export const authRoutes: FastifyPluginAsync<{ env: Env }> = async (app, opts) => {
  await app.register(rateLimit, {
    max: opts.env.AUTH_RATE_LIMIT_MAX,
    timeWindow: opts.env.AUTH_RATE_LIMIT_TIME_WINDOW_MS,
  });

  const authService = new AuthService(app, opts.env);
  const handler = new AuthHandler(authService);

  app.post('/auth/register', async (request, reply) => {
    const body = registerBodySchema.parse(request.body);
    return handler.register(body, reply);
  });

  app.post('/auth/login', async (request, reply) => {
    const body = loginBodySchema.parse(request.body);
    return handler.login(body, reply);
  });

  app.post('/auth/refresh', async (request, reply) => {
    const body = refreshBodySchema.parse(request.body);
    return handler.refresh(body, reply);
  });

  app.post('/auth/logout', async (request, reply) => {
    const body = logoutBodySchema.parse(request.body);
    return handler.logout(body, reply);
  });

  app.get(
    '/auth/me',
    {
      preHandler: [app.authenticate],
    },
    async (request, reply) => handler.me(request, reply),
  );
};
