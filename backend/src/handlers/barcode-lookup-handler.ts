import type { FastifyReply, FastifyRequest } from 'fastify';
import type { BarcodeLookupBody } from '../schemas/barcode.js';
import type { BarcodeLookupService } from '../services/barcode-lookup-service.js';

export class BarcodeLookupHandler {
  constructor(private readonly barcodeLookupService: BarcodeLookupService) {}

  lookup = async (body: BarcodeLookupBody, _request: FastifyRequest, reply: FastifyReply) => {
    const product = await this.barcodeLookupService.lookup(body.barcode);
    return reply.status(200).send({ product });
  };
}
