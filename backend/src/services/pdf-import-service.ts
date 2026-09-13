import { AppError } from '../errors/app-error.js';
import { resolveTimeZone } from '../lib/calendar-date.js';
import { resolveOwnerId } from '../ownership/ownership.js';
import {
  foodEntryRepository,
  type FoodEntryRepository,
} from '../repositories/food-entry-repository.js';
import { userRepository, type UserRepository } from '../repositories/user-repository.js';
import type { FoodDiaryConfirmRecord } from '../schemas/pdf-import.js';
import { PDF_MAX_RECORDS } from '../schemas/pdf-import.js';
import { extractPdfTextBlocks, isPdfBuffer } from '../pdf/pdf-extractor.js';
import { normalizePdfBlocks } from '../pdf/text-normalizer.js';
import { reconstructRows } from '../pdf/row-reconstructor.js';
import { parseFoodDiary } from '../pdf/food-diary-parser.js';
import type { DiaryParseWarning, ParsedDiaryRecord } from '../pdf/types.js';
import { FoodEntryService } from './food-entry-service.js';

export type PreviewWarning = {
  code: string;
  message: string;
};

export type PreviewRecord = {
  id: string;
  foodName: string | null;
  quantity: number | null;
  quantityUnit: string | null;
  mealType: ParsedDiaryRecord['mealType'];
  consumedAt: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  micronutrients: Array<{ nutrientKey: string; amount: number; unit: string }>;
  status: ParsedDiaryRecord['status'];
  confidence: number;
  issues: string[];
  layout: ParsedDiaryRecord['layout'];
  duplicate: boolean;
};

export type PreviewResult = {
  filename: string;
  pageCount: number;
  records: PreviewRecord[];
  warnings: PreviewWarning[];
};

function duplicateKey(input: {
  foodName: string | null;
  mealType: string | null;
  quantity: number | null;
  calories: number | null;
  consumedAt: Date | string | null;
}): string | null {
  if (!input.foodName || !input.mealType || input.quantity === null || input.calories === null || !input.consumedAt) {
    return null;
  }
  const consumedAt = input.consumedAt instanceof Date ? input.consumedAt : new Date(input.consumedAt);
  if (Number.isNaN(consumedAt.getTime())) {
    return null;
  }
  return [
    input.foodName.trim().toLowerCase(),
    input.mealType,
    String(input.quantity),
    String(Math.round(input.calories * 10) / 10),
    String(consumedAt.getTime()),
  ].join('|');
}

export class PdfImportService {
  constructor(
    private readonly foodEntries: FoodEntryService = new FoodEntryService(),
    private readonly entries: FoodEntryRepository = foodEntryRepository,
    private readonly users: UserRepository = userRepository,
  ) {}

  async preview(
    authenticatedUserId: string,
    input: { buffer: Buffer; filename: string },
  ): Promise<PreviewResult> {
    const ownerId = resolveOwnerId(authenticatedUserId);
    if (!isPdfBuffer(input.buffer)) {
      throw new AppError(
        415,
        'UNSUPPORTED_MEDIA_TYPE',
        'Unsupported file type. Upload a PDF food diary',
      );
    }

    const extracted = await extractPdfTextBlocks(input.buffer);
    const blocks = normalizePdfBlocks(extracted.blocks);
    const warnings: PreviewWarning[] = [];

    if (blocks.length === 0) {
      return {
        filename: input.filename,
        pageCount: extracted.pageCount,
        records: [],
        warnings: [
          {
            code: 'NO_TEXT',
            message: 'Unable to extract text from this PDF. Scanned/image-only PDFs are not supported.',
          },
        ],
      };
    }

    const user = await this.users.findById(ownerId);
    const timeZone = resolveTimeZone(user?.timezone);
    const rows = reconstructRows(blocks);
    const parseWarnings: DiaryParseWarning[] = [];
    const parsed = parseFoodDiary(rows, timeZone, parseWarnings);
    for (const warning of parseWarnings) {
      warnings.push({
        code: warning.type,
        message: warning.message,
      });
    }
    if (parsed.length === 0) {
      warnings.push({
        code: 'NO_RECORDS',
        message: 'No food diary records could be parsed. This layout may be unsupported.',
      });
    }
    if (parsed.length > PDF_MAX_RECORDS) {
      warnings.push({
        code: 'TRUNCATED',
        message: `Only the first ${PDF_MAX_RECORDS} parsed meals are included in the preview.`,
      });
    }

    const limited = parsed.slice(0, PDF_MAX_RECORDS);
    const existingKeys = await this.existingDuplicateKeys(ownerId, limited);
    const records: PreviewRecord[] = limited.map((record, index) => {
      const issues = [...record.issues];
      const key = duplicateKey(record);
      const duplicate = Boolean(key && existingKeys.has(key));
      if (duplicate) {
        issues.push('Possible duplicate of an existing meal.');
      }
      return {
        id: `preview-${index + 1}`,
        foodName: record.foodName,
        quantity: record.quantity,
        quantityUnit: record.quantityUnit,
        mealType: record.mealType,
        consumedAt: record.consumedAt ? record.consumedAt.toISOString() : null,
        calories: record.calories,
        protein: record.protein,
        carbs: record.carbs,
        fat: record.fat,
        micronutrients: record.micronutrients,
        status: duplicate && record.status === 'valid' ? 'warning' : record.status,
        confidence: record.confidence,
        issues,
        layout: record.layout,
        duplicate,
      };
    });

    return {
      filename: input.filename,
      pageCount: extracted.pageCount,
      records,
      warnings,
    };
  }

  async confirm(authenticatedUserId: string, records: FoodDiaryConfirmRecord[]) {
    const created = await this.foodEntries.createMany(authenticatedUserId, records);
    return {
      importedCount: created.length,
      foodEntries: created,
    };
  }

  private async existingDuplicateKeys(userId: string, records: ParsedDiaryRecord[]): Promise<Set<string>> {
    const dates = records
      .map((record) => record.consumedAt)
      .filter((value): value is Date => value instanceof Date);
    if (dates.length === 0) {
      return new Set();
    }
    const min = new Date(Math.min(...dates.map((date) => date.getTime())));
    const max = new Date(Math.max(...dates.map((date) => date.getTime())));
    const existing = await this.entries.findOwnedBetween(userId, min, max);
    return new Set(
      existing
        .map((entry) =>
          duplicateKey({
            foodName: entry.foodName,
            mealType: entry.mealType,
            quantity: entry.quantity,
            calories: entry.calories,
            consumedAt: entry.consumedAt,
          }),
        )
        .filter((key): key is string => Boolean(key)),
    );
  }
}
