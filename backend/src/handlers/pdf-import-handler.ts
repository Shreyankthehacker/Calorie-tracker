import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../errors/app-error.js';
import type { FoodDiaryConfirmBody } from '../schemas/pdf-import.js';
import type { PdfImportService } from '../services/pdf-import-service.js';

const PDF_MIME = 'application/pdf';

function filenameLooksPdf(filename: string): boolean {
  return filename.toLowerCase().endsWith('.pdf');
}

function declaredPdfMime(mimetype: string): boolean {
  return mimetype.toLowerCase() === PDF_MIME;
}

export class PdfImportHandler {
  constructor(
    private readonly pdfImport: PdfImportService,
    private readonly maxUploadBytes: number,
  ) {}

  preview = async (request: FastifyRequest, reply: FastifyReply) => {
    const file = await request.file();
    if (!file) {
      throw new AppError(400, 'VALIDATION_ERROR', 'PDF file is required');
    }

    const chunks: Buffer[] = [];
    for await (const chunk of file.file) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    if (file.file.truncated || buffer.byteLength > this.maxUploadBytes) {
      throw new AppError(413, 'PAYLOAD_TOO_LARGE', 'PDF exceeds the maximum upload size of 5MB');
    }
    if (buffer.byteLength === 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'PDF file is required');
    }

    const filename = file.filename || 'upload.pdf';
    if (!declaredPdfMime(file.mimetype) || !filenameLooksPdf(filename)) {
      throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Unsupported file type. Upload a PDF food diary');
    }

    const result = await this.pdfImport.preview(request.user.sub, { buffer, filename });
    return reply.status(200).send(result);
  };

  confirm = async (body: FoodDiaryConfirmBody, request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.pdfImport.confirm(request.user.sub, body.records);
    return reply.status(201).send(result);
  };
}
