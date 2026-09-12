import type { FastifyReply, FastifyRequest } from 'fastify';
import type { GoalBody } from '../schemas/goals.js';
import type { GoalService } from '../services/goal-service.js';

function clientUserIdFromQuery(request: FastifyRequest): string | undefined {
  const query = request.query as { userId?: string };
  return typeof query.userId === 'string' ? query.userId : undefined;
}

export class GoalHandler {
  constructor(private readonly goalService: GoalService) {}

  get = async (request: FastifyRequest, reply: FastifyReply) => {
    const goal = await this.goalService.getCurrent(
      request.user.sub,
      clientUserIdFromQuery(request),
    );
    return reply.status(200).send({ goal });
  };

  create = async (body: GoalBody, request: FastifyRequest, reply: FastifyReply) => {
    const goal = await this.goalService.create(
      request.user.sub,
      body,
      clientUserIdFromQuery(request),
    );
    return reply.status(201).send({ goal });
  };

  upsert = async (body: GoalBody, request: FastifyRequest, reply: FastifyReply) => {
    const goal = await this.goalService.upsert(
      request.user.sub,
      body,
      clientUserIdFromQuery(request),
    );
    return reply.status(200).send({ goal });
  };

  remove = async (request: FastifyRequest, reply: FastifyReply) => {
    await this.goalService.remove(request.user.sub, clientUserIdFromQuery(request));
    return reply.status(204).send();
  };
}
