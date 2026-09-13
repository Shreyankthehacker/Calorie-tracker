import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error.js';

type ErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

type FastifyLikeError = {
  validation?: unknown;
  statusCode?: number;
  code?: string;
  message?: string;
};

const GENERIC_INTERNAL_ERROR: ErrorBody = {
  error: {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
  },
};

const FASTIFY_CLIENT_ERRORS: Record<string, { status: number; body: ErrorBody }> = {
  FST_ERR_CTP_INVALID_JSON_BODY: {
    status: 400,
    body: {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid JSON payload',
      },
    },
  },
  FST_ERR_CTP_EMPTY_JSON_BODY: {
    status: 400,
    body: {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request body is required',
      },
    },
  },
  FST_ERR_CTP_INVALID_MEDIA_TYPE: {
    status: 415,
    body: {
      error: {
        code: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Unsupported media type',
      },
    },
  },
  FST_REQ_FILE_TOO_LARGE: {
    status: 413,
    body: {
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Upload exceeds the maximum size of 5MB',
      },
    },
  },
  FST_ERR_CTP_BODY_TOO_LARGE: {
    status: 413,
    body: {
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request body is too large',
      },
    },
  },
};

function isFastifyLikeError(error: unknown): error is FastifyLikeError {
  return typeof error === 'object' && error !== null;
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setNotFoundHandler((_request, reply) => {
    return reply.status(404).send({
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
      },
    } satisfies ErrorBody);
  });

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

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2028') {
      return reply.status(503).send({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'The request timed out and no changes were saved. Please try again.',
        },
      } satisfies ErrorBody);
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

    if (isFastifyLikeError(error) && typeof error.code === 'string') {
      const mapped = FASTIFY_CLIENT_ERRORS[error.code];
      if (mapped) {
        return reply.status(mapped.status).send(mapped.body);
      }
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

    if (isFastifyLikeError(error) && error.statusCode === 413) {
      return reply.status(413).send({
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: 'Upload exceeds the maximum size of 5MB',
        },
      } satisfies ErrorBody);
    }

    if (isFastifyLikeError(error) && error.statusCode === 415) {
      return reply.status(415).send({
        error: {
          code: 'UNSUPPORTED_MEDIA_TYPE',
          message: 'Unsupported media type',
        },
      } satisfies ErrorBody);
    }

    if (isFastifyLikeError(error) && error.statusCode === 400) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request',
        },
      } satisfies ErrorBody);
    }

    app.log.error(error);
    return reply.status(500).send(GENERIC_INTERNAL_ERROR);
  });
}
