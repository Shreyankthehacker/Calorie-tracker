import type { FastifyPluginAsync } from 'fastify';
import { FamilyHandler } from '../handlers/family-handler.js';
import { createFamilyBodySchema, joinFamilyBodySchema } from '../schemas/family.js';
import { FamilyService } from '../services/family-service.js';

export const familyRoutes: FastifyPluginAsync = async (app) => {
  const familyService = new FamilyService();
  const handler = new FamilyHandler(familyService);

  app.addHook('preHandler', app.authenticate);

  app.get('/family', async (request, reply) => handler.get(request, reply));

  app.post('/family', async (request, reply) => {
    const body = createFamilyBodySchema.parse(request.body ?? {});
    return handler.create(body, request, reply);
  });

  app.post('/family/join', async (request, reply) => {
    const body = joinFamilyBodySchema.parse(request.body);
    return handler.join(body, request, reply);
  });

  app.post('/family/leave', async (request, reply) => handler.leave(request, reply));
};
