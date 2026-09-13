import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../errors/app-error.js';
import {
  detectImageMime,
  normalizeDeclaredImageMime,
  type AllowedImageMimeType,
} from '../ai/nutrition-provider.js';
import type { AIExtractionService } from '../services/ai-extraction-service.js';

export class AIExtractionHandler {
  constructor(
    private readonly extractionService: AIExtractionService,
    private readonly maxUploadBytes: number,
  ) {}

  extract = async (request: FastifyRequest, reply: FastifyReply) => {
    const file = await request.file();
    if (!file) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Image file is required');
    }

    const chunks: Buffer[] = [];
    for await (const chunk of file.file) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    if (file.file.truncated || buffer.byteLength > this.maxUploadBytes) {
      throw new AppError(413, 'PAYLOAD_TOO_LARGE', 'Image exceeds the maximum upload size of 5MB');
    }

    if (buffer.byteLength === 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Image file is required');
    }

    const declared = normalizeDeclaredImageMime(file.mimetype);
    if (!declared) {
      throw new AppError(
        415,
        'UNSUPPORTED_MEDIA_TYPE',
        'Unsupported image type. Upload a JPEG, PNG, or WebP file',
      );
    }

    const sniffed = detectImageMime(buffer);
    if (!sniffed || sniffed !== declared) {
      throw new AppError(
        415,
        'UNSUPPORTED_MEDIA_TYPE',
        'Unsupported image type. Upload a JPEG, PNG, or WebP file',
      );
    }

    const mimeType: AllowedImageMimeType = sniffed;
    const extraction = await this.extractionService.extractFromImage({
      buffer,
      mimeType,
      filename: file.filename || 'upload',
    });

    return reply.status(200).send({ extraction });
  };
}
