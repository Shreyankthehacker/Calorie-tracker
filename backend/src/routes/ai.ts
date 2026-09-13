import type { FastifyPluginAsync } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import type { Env } from '../config/env.js';
import { GeminiNutritionProvider } from '../ai/gemini-nutrition-provider.js';
import type { NutritionExtractionProvider } from '../ai/nutrition-provider.js';
import { AIExtractionHandler } from '../handlers/ai-extraction-handler.js';
import { AIExtractionService } from '../services/ai-extraction-service.js';

export const aiExtractionRoutes: FastifyPluginAsync<{
  env: Env;
  nutritionProvider?: NutritionExtractionProvider;
}> = async (app, opts) => {
  await app.register(rateLimit, {
    max: opts.env.AI_RATE_LIMIT_MAX,
    timeWindow: opts.env.AI_RATE_LIMIT_TIME_WINDOW_MS,
  });

  const provider = opts.nutritionProvider ?? new GeminiNutritionProvider(opts.env);
  const service = new AIExtractionService(provider);
  const handler = new AIExtractionHandler(service, opts.env.AI_MAX_UPLOAD_BYTES);

  app.addHook('preHandler', app.authenticate);

  app.post('/ai/nutrition-extract', async (request, reply) => handler.extract(request, reply));
};
