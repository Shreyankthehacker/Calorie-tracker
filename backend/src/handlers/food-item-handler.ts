import type { FastifyReply, FastifyRequest } from 'fastify';
import type { FoodItemListQuery, FoodItemLogBody } from '../schemas/food-items.js';
import type { FoodItemService } from '../services/food-item-service.js';

export class FoodItemHandler {
  constructor(private readonly foodItemService: FoodItemService) {}

  list = async (query: FoodItemListQuery, _request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.foodItemService.list(query);
    return reply.status(200).send(result);
  };

  getById = async (id: string, _request: FastifyRequest, reply: FastifyReply) => {
    const foodItem = await this.foodItemService.getById(id);
    return reply.status(200).send({ foodItem });
  };

  log = async (
    id: string,
    body: FoodItemLogBody,
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const foodEntry = await this.foodItemService.log(request.user.sub, id, body);
    return reply.status(201).send({ foodEntry });
  };
}
