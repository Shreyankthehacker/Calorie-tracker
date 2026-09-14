import type { FastifyReply, FastifyRequest } from 'fastify';
import type { CreateFamilyBody, JoinFamilyBody } from '../schemas/family.js';
import type { FamilyService } from '../services/family-service.js';

export class FamilyHandler {
  constructor(private readonly familyService: FamilyService) {}

  get = async (request: FastifyRequest, reply: FastifyReply) => {
    const family = await this.familyService.get(request.user.sub);
    return reply.status(200).send({ family });
  };

  create = async (body: CreateFamilyBody, request: FastifyRequest, reply: FastifyReply) => {
    const family = await this.familyService.create(request.user.sub, body.name);
    return reply.status(201).send({ family });
  };

  join = async (body: JoinFamilyBody, request: FastifyRequest, reply: FastifyReply) => {
    const family = await this.familyService.join(request.user.sub, body.familyId);
    return reply.status(200).send({ family });
  };

  leave = async (request: FastifyRequest, reply: FastifyReply) => {
    await this.familyService.leave(request.user.sub);
    return reply.status(204).send();
  };
}
