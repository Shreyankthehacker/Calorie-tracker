import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import type { Env } from './config/env.js';
import type { NutritionExtractionProvider } from './ai/nutrition-provider.js';
import type { FoodSearchProvider } from './ai/food-search-provider.js';
import type { LlmProvider } from './ai/llm-provider.js';
import { createCorsOriginDelegate, parseCorsOrigins } from './lib/cors.js';
import { authPlugin } from './plugins/auth.js';
import { registerErrorHandler } from './plugins/error-handler.js';
import { aiExtractionRoutes } from './routes/ai.js';
import { chatRoutes } from './routes/chat.js';
import { authRoutes } from './routes/auth.js';
import { foodEntryRoutes } from './routes/food-entries.js';
import { foodItemRoutes } from './routes/food-items.js';
import { goalRoutes } from './routes/goals.js';
import { healthRoutes } from './routes/health.js';
import { reportRoutes } from './routes/reports.js';
import { pdfImportRoutes } from './routes/pdf-import.js';

export type AppDependencies = {
  nutritionProvider?: NutritionExtractionProvider;
  llmProvider?: LlmProvider;
  foodSearchProvider?: FoodSearchProvider;
};

export async function buildApp(env: Env, deps: AppDependencies = {}) {
  const maxUploadBytes = Math.max(env.AI_MAX_UPLOAD_BYTES, env.PDF_MAX_UPLOAD_BYTES);
  const app = Fastify({
    logger: env.NODE_ENV !== 'test',
    bodyLimit: maxUploadBytes + 256 * 1024,
  });

  registerErrorHandler(app);

  await app.register(cors, {
    origin: createCorsOriginDelegate(parseCorsOrigins(env.CORS_ORIGIN)),
  });

  await app.register(multipart, {
    limits: {
      fileSize: maxUploadBytes,
      files: 1,
      fields: 4,
    },
  });

  await app.register(authPlugin, { env });
  await app.register(healthRoutes, { prefix: '/api/v1' });
  await app.register(authRoutes, { prefix: '/api/v1', env });
  await app.register(goalRoutes, { prefix: '/api/v1' });
  await app.register(foodEntryRoutes, { prefix: '/api/v1' });
  await app.register(foodItemRoutes, { prefix: '/api/v1' });
  await app.register(reportRoutes, { prefix: '/api/v1' });
  await app.register(aiExtractionRoutes, {
    prefix: '/api/v1',
    env,
    ...(deps.nutritionProvider ? { nutritionProvider: deps.nutritionProvider } : {}),
  });
  await app.register(chatRoutes, {
    prefix: '/api/v1',
    env,
    ...(deps.llmProvider ? { llmProvider: deps.llmProvider } : {}),
    ...(deps.foodSearchProvider ? { foodSearchProvider: deps.foodSearchProvider } : {}),
  });
  await app.register(pdfImportRoutes, { prefix: '/api/v1', env });

  return app;
}
