import type { FastifyPluginAsync } from 'fastify';
import { FoodItemHandler } from '../handlers/food-item-handler.js';
import {
  foodItemIdParamsSchema,
  foodItemListQuerySchema,
  foodItemLogBodySchema,
} from '../schemas/food-items.js';
import { FoodItemService } from '../services/food-item-service.js';

export const foodItemRoutes: FastifyPluginAsync = async (app) => {
  const foodItemService = new FoodItemService();
  const handler = new FoodItemHandler(foodItemService);

  app.addHook('preHandler', app.authenticate);

  app.get('/food-items', async (request, reply) => {
    const query = foodItemListQuerySchema.parse(request.query);
    return handler.list(query, request, reply);
  });

  app.get('/food-items/:id', async (request, reply) => {
    const { id } = foodItemIdParamsSchema.parse(request.params);
    return handler.getById(id, request, reply);
  });

  app.post('/food-items/:id/entries', async (request, reply) => {
    const { id } = foodItemIdParamsSchema.parse(request.params);
    const body = foodItemLogBodySchema.parse(request.body);
    return handler.log(id, body, request, reply);
  });
};
