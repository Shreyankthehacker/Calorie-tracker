import { describe, expect, it } from 'vitest';
import { matchHeaderKey, detectColumns, assignCellsToColumns } from '../src/pdf/column-detector.js';
import { matchHeader } from '../src/pdf/header-aliases.js';
import { reconstructRows } from '../src/pdf/row-reconstructor.js';
import { normalizePdfBlocks } from '../src/pdf/text-normalizer.js';
import { parseFoodDiary, parseDiaryDate, parseMealType } from '../src/pdf/food-diary-parser.js';
import type { PdfTextBlock } from '../src/pdf/types.js';

function block(text: string, x: number, y: number, page = 1): PdfTextBlock {
  return { text, x, y, width: Math.max(text.length * 5, 8), height: 10, page };
}

describe('PDF layout reconstruction', () => {
  it('normalizes whitespace without dropping coordinates', () => {
    const [normalized] = normalizePdfBlocks([block('  Oatmeal\u00a0bowl  ', 40, 200)]);
    expect(normalized?.text).toBe('Oatmeal bowl');
    expect(normalized?.x).toBe(40);
    expect(normalized?.y).toBe(200);
  });

  it('groups nearby Y coordinates into one row and preserves reading order', () => {
    const rows = reconstructRows([
      block('Oatmeal', 220, 500.2),
      block('Breakfast', 120, 499.4),
      block('320', 470, 500),
      block('09/12/26', 50, 501),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.text).toContain('Oatmeal');
    expect(rows[0]?.cells.map((cell) => cell.text)).toEqual(['09/12/26', 'Breakfast', 'Oatmeal', '320']);
  });

  it('keeps separate pages and vertical rows distinct', () => {
    const rows = reconstructRows([
      block('Page1', 50, 700, 1),
      block('Page2', 50, 700, 2),
      block('Lower', 50, 640, 1),
    ]);
    expect(rows).toHaveLength(3);
  });
});

describe('header aliases', () => {
  it('maps common calorie and macro headers', () => {
    expect(matchHeaderKey('Calories')).toBe('calories');
    expect(matchHeaderKey('kcal')).toBe('calories');
    expect(matchHeaderKey('Energy')).toBe('calories');
    expect(matchHeaderKey('Prot.')).toBe('protein');
    expect(matchHeaderKey('Protein (g)')).toBe('protein');
    expect(matchHeaderKey('CHO')).toBe('carbs');
    expect(matchHeaderKey('Carbohydrates')).toBe('carbs');
    expect(matchHeaderKey('Total Fat')).toBe('fat');
  });
});

describe('food diary parser', () => {
  it('parses a reconstructed table including header aliases and multiple meals', () => {
    const rows = reconstructRows([
      block('Date', 40, 700),
      block('Meal', 120, 700),
      block('Food', 220, 700),
      block('Qty', 360, 700),
      block('Calories', 430, 700),
      block('Protein', 520, 700),
      block('Carbs', 590, 700),
      block('Fat', 650, 700),
      block('09/12/26', 40, 680),
      block('Breakfast', 120, 680),
      block('2 Eggs', 220, 680),
      block('2', 360, 680),
      block('140', 430, 680),
      block('12', 520, 680),
      block('1', 590, 680),
      block('10', 650, 680),
      block('09/12/26', 40, 660),
      block('Lunch', 120, 660),
      block('Chicken Rice', 220, 660),
      block('1', 360, 660),
      block('520', 430, 660),
      block('38', 520, 660),
      block('45', 590, 660),
      block('12', 650, 660),
    ]);
    const detected = detectColumns(rows);
    expect(detected?.columns.some((column) => column.canonicalField === 'foodName')).toBe(true);
    const assigned = assignCellsToColumns(rows[1]!, detected!.columns);
    expect(assigned.foodName).toMatch(/Eggs/i);

    const parsed = parseFoodDiary(rows, 'UTC');
    expect(parsed.map((row) => row.foodName)).toEqual(expect.arrayContaining(['2 Eggs', 'Chicken Rice']));
    expect(parsed.map((row) => row.mealType)).toEqual(expect.arrayContaining(['BREAKFAST', 'LUNCH']));
    const eggs = parsed.find((row) => row.foodName === '2 Eggs');
    expect(eggs?.calories).toBe(140);
    expect(eggs?.protein).toBe(12);
    expect(eggs?.layout).toBe('table');
    expect(eggs?.confidence).toBeGreaterThan(0.7);
  });

  it('parses line-oriented diaries across dates', () => {
    const rows = reconstructRows([
      block('09/12/26', 50, 720),
      block('Breakfast', 50, 700),
      block('2 Eggs', 50, 680),
      block('140 kcal', 50, 660),
      block('12g protein', 50, 640),
      block('1g carbs', 50, 620),
      block('10g fat', 50, 600),
      block('2026-09-13', 50, 560),
      block('Dinner', 50, 540),
      block('Salmon', 50, 520),
      block('520 kcal', 50, 500),
      block('40g protein', 50, 480),
      block('0g carbs', 50, 460),
      block('22g fat', 50, 440),
    ]);
    const parsed = parseFoodDiary(rows, 'UTC');
    expect(parsed).toHaveLength(2);
    expect(parsed[0]?.foodName).toBe('2 Eggs');
    expect(parsed[0]?.mealType).toBe('BREAKFAST');
    expect(parsed[1]?.foodName).toBe('Salmon');
    expect(parsed[1]?.mealType).toBe('DINNER');
    expect(parsed[1]?.consumedAt?.toISOString().startsWith('2026-09-13')).toBe(true);
  });

  it('parses mixed dash-separated lines', () => {
    const rows = reconstructRows([
      block('2026-09-13', 40, 700),
      block('Breakfast', 40, 680),
      block('Oatmeal — 1 bowl — 320 kcal — 12g protein — 52g carbs — 8g fat', 40, 660),
    ]);
    const parsed = parseFoodDiary(rows, 'UTC');
    expect(parsed[0]?.foodName).toBe('Oatmeal');
    expect(parsed[0]?.quantity).toBe(1);
    expect(parsed[0]?.quantityUnit).toBe('bowl');
    expect(parsed[0]?.calories).toBe(320);
    expect(parsed[0]?.protein).toBe(12);
    expect(parsed[0]?.carbs).toBe(52);
    expect(parsed[0]?.fat).toBe(8);
    expect(parsed[0]?.layout).toBe('mixed');
  });

  it('defaults missing calories to 0 with a warning instead of inventing a non-zero value', () => {
    const rows = reconstructRows([
      block('09/12/26', 50, 700),
      block('Lunch', 50, 680),
      block('Mystery stew', 50, 660),
    ]);
    const parsed = parseFoodDiary(rows, 'UTC');
    expect(parsed[0]?.foodName).toBe('Mystery stew');
    expect(parsed[0]?.calories).toBe(0);
    expect(parsed[0]?.status).toBe('warning');
    expect(parsed[0]?.issues.some((issue) => /calories/i.test(issue))).toBe(true);
  });

  it('returns no records for unsupported prose', () => {
    const rows = reconstructRows([
      block('Chapter 1', 50, 700),
      block('It was a bright cold day in April and the clocks were striking thirteen.', 50, 680),
    ]);
    expect(parseFoodDiary(rows, 'UTC')).toEqual([]);
  });

  it('parses meal types and dates used in diaries', () => {
    expect(parseMealType('Snacks')).toBe('SNACKS');
    expect(parseDiaryDate('09/12/26')).toEqual({ year: 2026, month: 9, day: 12 });
    expect(parseDiaryDate('2026-09-13')).toEqual({ year: 2026, month: 9, day: 13 });
  });

  it('returns no records for empty reconstructed input', () => {
    expect(parseFoodDiary([], 'UTC')).toEqual([]);
  });

  it('defaults missing optional macros to 0 instead of leaving them null', () => {
    const rows = reconstructRows([
      block('Date', 40, 700),
      block('Meal', 120, 700),
      block('Food', 220, 700),
      block('Qty', 360, 700),
      block('Calories', 430, 700),
      block('Protein', 520, 700),
      block('Carbs', 590, 700),
      block('Fat', 650, 700),
      block('09/12/26', 40, 680),
      block('Breakfast', 120, 680),
      block('Toast', 220, 680),
      block('1', 360, 680),
      block('160', 430, 680),
    ]);
    const toast = parseFoodDiary(rows, 'UTC')[0];
    expect(toast?.foodName).toBe('Toast');
    expect(toast?.calories).toBe(160);
    expect(toast?.protein).toBe(0);
    expect(toast?.carbs).toBe(0);
    expect(toast?.fat).toBe(0);
    expect(toast?.status).toBe('warning');
    expect(toast?.confidence).toBeLessThan(0.8);
  });

  it('defaults a missing carbs/fat column to 0', () => {
    const rows = reconstructRows([
      block('Food', 40, 700),
      block('Calories', 200, 700),
      block('Protein', 320, 700),
      block('Chicken', 40, 680),
      block('300', 200, 680),
      block('20', 320, 680),
    ]);
    const parsed = parseFoodDiary(rows, 'UTC')[0];
    expect(parsed?.foodName).toBe('Chicken');
    expect(parsed?.calories).toBe(300);
    expect(parsed?.protein).toBe(20);
    expect(parsed?.carbs).toBe(0);
    expect(parsed?.fat).toBe(0);
  });

  it('defaults an unparseable carbs cell to 0', () => {
    const rows = reconstructRows([
      block('Food', 40, 700),
      block('Calories', 180, 700),
      block('Protein', 280, 700),
      block('Carbs', 380, 700),
      block('Fat', 480, 700),
      block('Chicken', 40, 680),
      block('450', 180, 680),
      block('40g', 280, 680),
      block('N/A', 380, 680),
      block('10', 480, 680),
    ]);
    const warnings: Array<{ type: string; value?: string; fallback?: number }> = [];
    const parsed = parseFoodDiary(rows, 'UTC', warnings)[0];
    expect(parsed?.carbs).toBe(0);
    expect(parsed?.calories).toBe(450);
    expect(parsed?.protein).toBe(40);
    expect(parsed?.fat).toBe(10);
    expect(warnings.some((warning) => warning.type === 'UNPARSEABLE_VALUE' && warning.value === 'N/A')).toBe(true);
  });

  it('defaults an empty protein cell to 0', () => {
    const rows = reconstructRows([
      block('Food', 40, 700),
      block('Calories', 180, 700),
      block('Protein', 280, 700),
      block('Carbs', 380, 700),
      block('Fat', 480, 700),
      block('Chicken', 40, 680),
      block('450', 180, 680),
      block('20', 380, 680),
      block('10', 480, 680),
    ]);
    const parsed = parseFoodDiary(rows, 'UTC')[0];
    expect(parsed?.protein).toBe(0);
    expect(parsed?.carbs).toBe(20);
  });

  it('defaults an invalid calories cell to 0 with a warning', () => {
    const rows = reconstructRows([
      block('Food', 40, 700),
      block('Calories', 180, 700),
      block('Protein', 280, 700),
      block('Carbs', 380, 700),
      block('Fat', 480, 700),
      block('Chicken', 40, 680),
      block('unknown', 180, 680),
      block('40', 280, 680),
      block('20', 380, 680),
      block('10', 480, 680),
    ]);
    const warnings: Array<{ type: string; fallback?: number }> = [];
    const parsed = parseFoodDiary(rows, 'UTC', warnings)[0];
    expect(parsed?.foodName).toBe('Chicken');
    expect(parsed?.calories).toBe(0);
    expect(parsed?.protein).toBe(40);
    expect(warnings.some((warning) => warning.type === 'UNPARSEABLE_VALUE' && warning.fallback === 0)).toBe(true);
  });

  it('leaves unknown columns unmapped and does not overwrite nutrition fields', () => {
    const rows = reconstructRows([
      block('Food', 40, 700),
      block('Calories', 180, 700),
      block('Protein', 280, 700),
      block('WeirdMetric', 420, 700),
      block('Chicken', 40, 680),
      block('450', 180, 680),
      block('40', 280, 680),
      block('99', 420, 680),
    ]);
    const warnings: Array<{ type: string; column?: string }> = [];
    const parsed = parseFoodDiary(rows, 'UTC', warnings)[0];
    expect(parsed?.calories).toBe(450);
    expect(parsed?.protein).toBe(40);
    expect(warnings.some((warning) => warning.type === 'UNKNOWN_COLUMN' && warning.column === 'WeirdMetric')).toBe(true);
  });

  it('does not replace a missing food name with 0', () => {
    const rows = reconstructRows([
      block('Food', 40, 700),
      block('Calories', 180, 700),
      block('Protein', 280, 700),
      block('450', 180, 680),
      block('40', 280, 680),
    ]);
    const parsed = parseFoodDiary(rows, 'UTC')[0];
    expect(parsed?.foodName).not.toBe('0');
    expect(parsed?.foodName == null || parsed.foodName === '').toBe(true);
    expect(parsed?.status).toBe('unparsed');
  });

  it('preserves original headers and prefers exact calories over Energy', () => {
    const rows = reconstructRows([
      block('Food', 40, 700),
      block('Calories', 180, 700),
      block('Energy', 300, 700),
      block('Protein', 420, 700),
      block('Chicken', 40, 680),
      block('450', 180, 680),
      block('999', 300, 680),
      block('40', 420, 680),
    ]);
    const detected = detectColumns(rows);
    const calories = detected?.columns.find((column) => column.originalHeader === 'Calories');
    const energy = detected?.columns.find((column) => column.originalHeader === 'Energy');
    expect(calories?.originalHeader).toBe('Calories');
    expect(calories?.normalizedHeader).toBe('calories');
    expect(energy?.canonicalField).toBe('calories');
    const warnings: Array<{ type: string; columns?: string[] }> = [];
    const parsed = parseFoodDiary(rows, 'UTC', warnings)[0];
    expect(parsed?.calories).toBe(450);
    expect(warnings.some((warning) => warning.type === 'DUPLICATE_COLUMN_MAPPING')).toBe(true);
  });

  it('maps Energy (kcal) and Prot. (g) headers after alias matching', () => {
    const rows = reconstructRows([
      block('Date', 40, 700),
      block('Meal', 110, 700),
      block('Food', 190, 700),
      block('Qty', 300, 700),
      block('Energy (kcal)', 380, 700),
      block('Prot. (g)', 500, 700),
      block('CHO (g)', 590, 700),
      block('Total Fat (g)', 680, 700),
      block('09/12/26', 40, 680),
      block('Breakfast', 110, 680),
      block('Oatmeal', 190, 680),
      block('1 bowl', 300, 680),
      block('320', 380, 680),
      block('12', 500, 680),
      block('52', 590, 680),
      block('8', 680, 680),
    ]);
    expect(matchHeader('Energy (kcal)')).toMatchObject({
      originalHeader: 'Energy (kcal)',
      canonicalField: 'calories',
    });
    const parsed = parseFoodDiary(rows, 'UTC')[0];
    expect(parsed?.foodName).toBe('Oatmeal');
    expect(parsed?.calories).toBe(320);
    expect(parsed?.protein).toBe(12);
    expect(parsed?.carbs).toBe(52);
    expect(parsed?.fat).toBe(8);
  });
});
