import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { AppError } from '../errors/app-error.js';
import type { PdfExtractResult, PdfTextBlock } from './types.js';

export const PDF_MAGIC = Buffer.from('%PDF-');
export const MAX_PDF_PAGES_DEFAULT = 30;
export const MAX_PDF_CHARS_DEFAULT = 200_000;

type PdfJsTextItem = {
  str?: unknown;
  transform?: unknown;
  width?: unknown;
  height?: unknown;
};

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function isPdfBuffer(buffer: Buffer): boolean {
  return buffer.length >= 5 && buffer.subarray(0, 5).equals(PDF_MAGIC);
}

export async function extractPdfTextBlocks(
  buffer: Buffer,
  options?: { maxPages?: number; maxChars?: number },
): Promise<PdfExtractResult> {
  const maxPages = options?.maxPages ?? MAX_PDF_PAGES_DEFAULT;
  const maxChars = options?.maxChars ?? MAX_PDF_CHARS_DEFAULT;
  let pdf;
  try {
    pdf = await getDocument({
      data: new Uint8Array(buffer),
      isEvalSupported: false,
      useSystemFonts: true,
      disableFontFace: true,
    }).promise;
  } catch {
    throw new AppError(400, 'VALIDATION_ERROR', 'The PDF could not be read. Upload a valid text-based PDF.');
  }

  try {
    if (pdf.numPages < 1) {
      throw new AppError(400, 'VALIDATION_ERROR', 'The PDF has no pages.');
    }
    if (pdf.numPages > maxPages) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        `PDF exceeds the maximum of ${maxPages} pages`,
      );
    }

    const blocks: PdfTextBlock[] = [];
    let characterCount = 0;
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      for (const raw of content.items) {
        const item = raw as PdfJsTextItem;
        const text = typeof item.str === 'string' ? item.str : '';
        if (!text.trim()) {
          continue;
        }
        const transform = Array.isArray(item.transform) ? item.transform : [];
        const x = asNumber(transform[4]);
        const y = asNumber(transform[5]);
        blocks.push({
          text,
          x,
          y,
          width: asNumber(item.width),
          height: asNumber(item.height, 10),
          page: pageNumber,
        });
        characterCount += text.length;
        if (characterCount > maxChars) {
          throw new AppError(400, 'VALIDATION_ERROR', 'PDF contains too much text to import safely.');
        }
      }
    }

    return { pageCount: pdf.numPages, blocks, characterCount };
  } finally {
    await pdf.destroy();
  }
}
