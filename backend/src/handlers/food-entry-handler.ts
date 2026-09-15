import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  FoodEntryCreateBody,
  FoodEntryListQuery,
  FoodEntryRecentsQuery,
  FoodEntryUpdateBody,
} from '../schemas/food-entries.js';
import type { FoodEntryService } from '../services/food-entry-service.js';

function clientUserIdFromQuery(request: FastifyRequest): string | undefined {
  const query = request.query as { userId?: string };
  return typeof query.userId === 'string' ? query.userId : undefined;
}

/**
 * HTTP adapter only: map request/response. No Prisma here.
 * `userId` from query/body is passed through and ignored by `resolveOwnerId`.
 */
export class FoodEntryHandler {
  constructor(private readonly foodEntryService: FoodEntryService) {}

  create = async (body: FoodEntryCreateBody, request: FastifyRequest, reply: FastifyReply) => {
    const foodEntry = await this.foodEntryService.create(
      request.user.sub,
      body,
      clientUserIdFromQuery(request),
    );
    return reply.status(201).send({ foodEntry });
  };

  getById = async (id: string, request: FastifyRequest, reply: FastifyReply) => {
    const foodEntry = await this.foodEntryService.getById(
      request.user.sub,
      id,
      clientUserIdFromQuery(request),
    );
    return reply.status(200).send({ foodEntry });
  };

  update = async (
    id: string,
    body: FoodEntryUpdateBody,
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const foodEntry = await this.foodEntryService.update(
      request.user.sub,
      id,
      body,
      clientUserIdFromQuery(request),
    );
    return reply.status(200).send({ foodEntry });
  };

  remove = async (id: string, request: FastifyRequest, reply: FastifyReply) => {
    await this.foodEntryService.remove(request.user.sub, id, clientUserIdFromQuery(request));
    return reply.status(204).send();
  };

  list = async (query: FoodEntryListQuery, request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.foodEntryService.list(
      request.user.sub,
      query,
      clientUserIdFromQuery(request),
    );
    return reply.status(200).send(result);
  };

  recents = async (query: FoodEntryRecentsQuery, request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.foodEntryService.listRecent(
      request.user.sub,
      query,
      clientUserIdFromQuery(request),
    );
    return reply.status(200).send(result);
  };
}
