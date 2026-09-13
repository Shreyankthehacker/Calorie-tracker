import type { FastifyPluginAsync } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import type { Env } from '../config/env.js';
import { PdfImportHandler } from '../handlers/pdf-import-handler.js';
import { PdfImportService } from '../services/pdf-import-service.js';
import { foodDiaryConfirmBodySchema } from '../schemas/pdf-import.js';

export const pdfImportRoutes: FastifyPluginAsync<{ env: Env }> = async (app, opts) => {
  const handler = new PdfImportHandler(new PdfImportService(), opts.env.PDF_MAX_UPLOAD_BYTES);

  app.addHook('preHandler', app.authenticate);

  app.post('/imports/food-diary/confirm', async (request, reply) => {
    const body = foodDiaryConfirmBodySchema.parse(request.body);
    return handler.confirm(body, request, reply);
  });

  await app.register(async (scoped) => {
    await scoped.register(rateLimit, {
      max: opts.env.PDF_RATE_LIMIT_MAX,
      timeWindow: opts.env.PDF_RATE_LIMIT_TIME_WINDOW_MS,
    });
    scoped.post('/imports/food-diary/preview', async (request, reply) => handler.preview(request, reply));
  });
};
