import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error.js';

type ErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

function isFastifyLikeError(
  error: unknown,
): error is { validation?: unknown; statusCode?: number; code?: string } {
  return typeof error === 'object' && error !== null;
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      const body: ErrorBody = {
        error: {
          code: error.code,
          message: error.message,
        },
      };
      if (error.details !== undefined) {
        body.error.details = error.details;
      }
      return reply.status(error.statusCode).send(body);
    }

    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request',
          details: error.flatten(),
        },
      } satisfies ErrorBody);
    }

    if (isFastifyLikeError(error) && error.validation) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request',
          details: error.validation,
        },
      } satisfies ErrorBody);
    }

    if (isFastifyLikeError(error) && error.statusCode === 429) {
      return reply.status(429).send({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests',
        },
      } satisfies ErrorBody);
    }

    if (isFastifyLikeError(error) && error.statusCode === 401) {
      return reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      } satisfies ErrorBody);
    }

    if (
      isFastifyLikeError(error) &&
      (error.statusCode === 413 ||
        (typeof error.code === 'string' &&
          ['FST_REQ_FILE_TOO_LARGE', 'FST_ERR_CTP_BODY_TOO_LARGE'].includes(error.code)))
    ) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Image exceeds the maximum upload size of 5MB',
        },
      } satisfies ErrorBody);
    }

    app.log.error(error);
    return reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    } satisfies ErrorBody);
  });
}
