import type { FastifyPluginAsync } from 'fastify';
import { FoodEntryHandler } from '../handlers/food-entry-handler.js';
import {
  foodEntryCreateBodySchema,
  foodEntryIdParamsSchema,
  foodEntryListQuerySchema,
  foodEntryUpdateBodySchema,
} from '../schemas/food-entries.js';
import { FoodEntryService } from '../services/food-entry-service.js';

export const foodEntryRoutes: FastifyPluginAsync = async (app) => {
  const foodEntryService = new FoodEntryService();
  const handler = new FoodEntryHandler(foodEntryService);

  app.addHook('preHandler', app.authenticate);

  app.get('/food-entries', async (request, reply) => {
    const query = foodEntryListQuerySchema.parse(request.query);
    return handler.list(query, request, reply);
  });

  app.post('/food-entries', async (request, reply) => {
    const body = foodEntryCreateBodySchema.parse(request.body);
    return handler.create(body, request, reply);
  });

  app.get('/food-entries/:id', async (request, reply) => {
    const { id } = foodEntryIdParamsSchema.parse(request.params);
    return handler.getById(id, request, reply);
  });

  app.put('/food-entries/:id', async (request, reply) => {
    const { id } = foodEntryIdParamsSchema.parse(request.params);
    const body = foodEntryUpdateBodySchema.parse(request.body);
    return handler.update(id, body, request, reply);
  });

  app.delete('/food-entries/:id', async (request, reply) => {
    const { id } = foodEntryIdParamsSchema.parse(request.params);
    return handler.remove(id, request, reply);
  });
};
