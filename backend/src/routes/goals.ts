import type { FastifyPluginAsync } from 'fastify';
import { GoalHandler } from '../handlers/goal-handler.js';
import { goalBodySchema } from '../schemas/goals.js';
import { GoalService } from '../services/goal-service.js';

export const goalRoutes: FastifyPluginAsync = async (app) => {
  const goalService = new GoalService();
  const handler = new GoalHandler(goalService);

  app.addHook('preHandler', app.authenticate);

  app.get('/goals', async (request, reply) => handler.get(request, reply));

  app.post('/goals', async (request, reply) => {
    const body = goalBodySchema.parse(request.body);
    return handler.create(body, request, reply);
  });

  app.put('/goals', async (request, reply) => {
    const body = goalBodySchema.parse(request.body);
    return handler.upsert(body, request, reply);
  });

  app.delete('/goals', async (request, reply) => handler.remove(request, reply));
};
