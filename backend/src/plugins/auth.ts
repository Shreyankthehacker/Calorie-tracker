import fp from 'fastify-plugin';
import fjwt from '@fastify/jwt';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';

export type AccessTokenPayload = {
  sub: string;
  email: string;
};

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AccessTokenPayload;
    user: AccessTokenPayload;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

/**
 * JWT access-token verification.
 * Protected routes call `app.authenticate`; identity always comes from the token `sub`,
 * never from a client-supplied `userId`.
 */
export const authPlugin = fp(async (app, opts: { env: Env }) => {
  await app.register(fjwt, {
    secret: opts.env.JWT_ACCESS_SECRET,
  });

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    void reply;
    try {
      await request.jwtVerify();
    } catch {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    if (!request.user?.sub) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
    }
  });
});
