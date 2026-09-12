import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AuthService } from '../services/auth-service.js';
import type { LoginBody, LogoutBody, RefreshBody, RegisterBody } from '../schemas/auth.js';

export class AuthHandler {
  constructor(private readonly authService: AuthService) {}

  register = async (body: RegisterBody, reply: FastifyReply) => {
    const result = await this.authService.register(body);
    return reply.status(201).send(result);
  };

  login = async (body: LoginBody, reply: FastifyReply) => {
    const result = await this.authService.login(body);
    return reply.status(200).send(result);
  };

  refresh = async (body: RefreshBody, reply: FastifyReply) => {
    const result = await this.authService.refresh(body);
    return reply.status(200).send(result);
  };

  logout = async (body: LogoutBody, reply: FastifyReply) => {
    await this.authService.logout(body);
    return reply.status(204).send();
  };

  me = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.sub;
    const query = request.query as { userId?: string };
    // Any client-supplied userId is ignored by resolveOwnerId inside the service.
    const user = await this.authService.getCurrentUser(userId, query.userId);
    return reply.status(200).send({ user });
  };
}
