export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export const DEFAULT_AI_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const MIME_BY_MAGIC: Array<{ mime: AllowedImageMimeType; test: (buffer: Buffer) => boolean }> = [
  {
    mime: 'image/jpeg',
    test: (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  },
  {
    mime: 'image/png',
    test: (buffer) =>
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a,
  },
  {
    mime: 'image/webp',
    test: (buffer) =>
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP',
  },
];

export function normalizeDeclaredImageMime(declared: string): AllowedImageMimeType | null {
  const value = declared.trim().toLowerCase();
  if (value === 'image/jpg') {
    return 'image/jpeg';
  }
  return (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(value)
    ? (value as AllowedImageMimeType)
    : null;
}

export function detectImageMime(buffer: Buffer): AllowedImageMimeType | null {
  for (const candidate of MIME_BY_MAGIC) {
    if (candidate.test(buffer)) {
      return candidate.mime;
    }
  }
  return null;
}

export type NutritionImageInput = {
  buffer: Buffer;
  mimeType: AllowedImageMimeType;
  filename: string;
};

/**
 * Vision providers return untrusted data. The application service must Zod-validate it.
 */
export interface NutritionExtractionProvider {
  extractFromImage(input: NutritionImageInput): Promise<unknown>;
}

export class ProviderTimeoutError extends Error {
  constructor(message = 'AI provider timed out') {
    super(message);
    this.name = 'ProviderTimeoutError';
  }
}

export class ProviderFailureError extends Error {
  constructor(message = 'AI provider failed') {
    super(message);
    this.name = 'ProviderFailureError';
  }
}
