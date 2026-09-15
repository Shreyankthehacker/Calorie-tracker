import type { FastifyPluginAsync } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import type { Env } from '../config/env.js';
import type { FoodSearchProvider } from '../ai/food-search-provider.js';
import { PrismaFoodSearchProvider } from '../ai/prisma-food-search.js';
import { GeminiLlmProvider } from '../ai/gemini-llm-provider.js';
import type { LlmProvider } from '../ai/llm-provider.js';
import { ChatHandler } from '../handlers/chat-handler.js';
import { chatRequestSchema, logMealInputSchema } from '../schemas/chat.js';
import { ChatService } from '../services/chat-service.js';
import { ChatToolExecutor } from '../chat/tool-executor.js';
import { FoodEntryService } from '../services/food-entry-service.js';
import { GoalService } from '../services/goal-service.js';
import { ReportService } from '../services/report-service.js';

export const chatRoutes: FastifyPluginAsync<{
  env: Env;
  llmProvider?: LlmProvider;
  foodSearchProvider?: FoodSearchProvider;
}> = async (app, opts) => {
  const llm = opts.llmProvider ?? new GeminiLlmProvider(opts.env);
  const foodSearch = opts.foodSearchProvider ?? new PrismaFoodSearchProvider();
  const tools = new ChatToolExecutor(
    new GoalService(),
    new ReportService(),
    new FoodEntryService(),
    foodSearch,
  );
  const service = new ChatService(opts.env, llm, tools);
  const handler = new ChatHandler(service);

  app.addHook('preHandler', app.authenticate);

  await app.register(async (limited) => {
    await limited.register(rateLimit, {
      max: opts.env.AI_RATE_LIMIT_MAX,
      timeWindow: opts.env.AI_RATE_LIMIT_TIME_WINDOW_MS,
    });
    limited.post('/ai/chat', async (request, reply) => {
      const body = chatRequestSchema.parse(request.body);
      return handler.chat(body, request, reply);
    });
  });

  app.post('/ai/chat/confirm-meal', async (request, reply) => {
    const body = logMealInputSchema.parse(request.body);
    return handler.confirmMeal(body, request, reply);
  });
};
