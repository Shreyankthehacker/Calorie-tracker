import type { FastifyPluginAsync } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import type { Env } from '../config/env.js';
import { OpenFoodFactsBarcodeProvider } from '../barcode/open-food-facts-provider.js';
import type { BarcodeLookupProvider } from '../barcode/barcode-provider.js';
import { BarcodeLookupHandler } from '../handlers/barcode-lookup-handler.js';
import { barcodeLookupBodySchema } from '../schemas/barcode.js';
import { BarcodeLookupService } from '../services/barcode-lookup-service.js';

export const barcodeLookupRoutes: FastifyPluginAsync<{
  env: Env;
  barcodeProvider?: BarcodeLookupProvider;
}> = async (app, opts) => {
  await app.register(rateLimit, {
    max: opts.env.AI_RATE_LIMIT_MAX,
    timeWindow: opts.env.AI_RATE_LIMIT_TIME_WINDOW_MS,
  });

  const provider = opts.barcodeProvider ?? new OpenFoodFactsBarcodeProvider(opts.env);
  const service = new BarcodeLookupService(provider);
  const handler = new BarcodeLookupHandler(service);

  app.addHook('preHandler', app.authenticate);

  app.post('/barcode/lookup', async (request, reply) => {
    const body = barcodeLookupBodySchema.parse(request.body);
    return handler.lookup(body, request, reply);
  });
};
