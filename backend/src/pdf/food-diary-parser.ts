import { calendarWallTimeUtc } from '../lib/calendar-date.js';
import { sanitizeFoodName } from '../lib/food-name.js';
import type { MealType } from '../schemas/food-entries.js';
import { assignCellsToColumns, detectColumns } from './column-detector.js';
import type { DiaryParseWarning, ParsedDiaryRecord, ReconstructedRow } from './types.js';

const MEAL_ALIASES: Array<{ value: MealType; aliases: string[] }> = [
  { value: 'BREAKFAST', aliases: ['breakfast', 'bfast', 'break fast'] },
  { value: 'LUNCH', aliases: ['lunch', 'lun'] },
  { value: 'DINNER', aliases: ['dinner', 'supper', 'din'] },
  { value: 'SNACKS', aliases: ['snack', 'snacks', 'snack time'] },
];

function parseNumberToken(raw: string): number | null {
  const match = raw.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return null;
  }
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}

function parseNutritionNumber(raw: string): number | null {
  const cleaned = raw
    .replace(/,/g, '')
    .replace(/\b(kcals?|calories?|grams?)\b/gi, '')
    .replace(/\bg\b/gi, '')
    .trim();
  if (!cleaned || /^(n\/?a|unknown|null|-|—|–|\.)$/i.test(cleaned)) {
    return null;
  }
  const value = parseNumberToken(cleaned);
  if (value === null || value < 0) {
    return null;
  }
  return value;
}

function nutritionOrZero(
  raw: string | undefined,
  present: boolean,
  label: string,
  originalHeader: string | undefined,
  issues: string[],
  warnings: DiaryParseWarning[],
): number {
  if (!present) {
    issues.push(`${label} was missing; defaulted to 0.`);
    return 0;
  }
  if (!raw || !raw.trim()) {
    issues.push(`${label} was empty; defaulted to 0.`);
    warnings.push({
      type: 'UNPARSEABLE_VALUE',
      column: originalHeader ?? label,
      value: raw ?? '',
      fallback: 0,
      message: `${label} could not be parsed; defaulted to 0.`,
    });
    return 0;
  }
  const parsed = parseNutritionNumber(raw);
  if (parsed === null) {
    issues.push(`Could not parse ${label} value "${raw}"; defaulted to 0.`);
    warnings.push({
      type: 'UNPARSEABLE_VALUE',
      column: originalHeader ?? label,
      value: raw,
      fallback: 0,
      message: `${label} could not be parsed; defaulted to 0.`,
    });
    return 0;
  }
  return parsed;
}

function applyMissingNutrition(
  calories: number | null,
  protein: number | null,
  carbs: number | null,
  fat: number | null,
  issues: string[],
): { calories: number; protein: number; carbs: number; fat: number } {
  const next = {
    calories: calories ?? 0,
    protein: protein ?? 0,
    carbs: carbs ?? 0,
    fat: fat ?? 0,
  };
  if (calories === null) issues.push('Calories were missing; defaulted to 0.');
  if (protein === null) issues.push('Protein was missing; defaulted to 0.');
  if (carbs === null) issues.push('Carbs were missing; defaulted to 0.');
  if (fat === null) issues.push('Fat was missing; defaulted to 0.');
  return next;
}

function parsePositive(raw: string | undefined): number | null {
  if (!raw) {
    return null;
  }
  const value = parseNumberToken(raw);
  if (value === null || value <= 0) {
    return null;
  }
  return value;
}

export function parseMealType(raw: string | undefined): MealType | null {
  if (!raw) {
    return null;
  }
  const normalized = raw.toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
  for (const entry of MEAL_ALIASES) {
    if (entry.aliases.includes(normalized)) {
      return entry.value;
    }
  }
  return null;
}

export function parseDiaryDate(raw: string | undefined): { year: number; month: number; day: number } | null {
  if (!raw) {
    return null;
  }
  const trimmed = raw.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    return toValidDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }
  const slash = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/);
  if (slash) {
    const first = Number(slash[1]);
    const second = Number(slash[2]);
    let year = Number(slash[3]);
    if (year < 100) {
      year += year >= 70 ? 1900 : 2000;
    }
    if (first > 12 && second <= 12) {
      return toValidDate(year, second, first);
    }
    return toValidDate(year, first, second);
  }
  return null;
}

function toValidDate(year: number, month: number, day: number) {
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() + 1 !== month || probe.getUTCDate() !== day) {
    return null;
  }
  return { year, month, day };
}

function mealHour(mealType: MealType | null): number {
  if (mealType === 'BREAKFAST') return 8;
  if (mealType === 'LUNCH') return 12;
  if (mealType === 'DINNER') return 18;
  return 15;
}

function consumedAtFrom(
  date: { year: number; month: number; day: number } | null,
  mealType: MealType | null,
  timeZone: string,
): Date | null {
  if (!date) {
    return null;
  }
  return calendarWallTimeUtc(date.year, date.month, date.day, mealHour(mealType), 0, 0, timeZone);
}

function extractNutritionFromText(text: string): {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  quantity: number | null;
  quantityUnit: string | null;
} {
  const calories = matchLabeledNumber(text, /(?:calories|kcal|kcals|cals|energy)\s*[:=]?\s*(\d+(?:\.\d+)?)/i)
    ?? matchLeadingNumber(text, /(\d+(?:\.\d+)?)\s*(?:kcal|kcals|calories)\b/i);
  const protein = matchGrams(text, 'protein') ?? matchGrams(text, 'prot');
  const carbs = matchGrams(text, 'carb(?:ohydrate)?s?') ?? matchGrams(text, 'cho');
  const fat = matchGrams(text, 'fat');
  const quantityMatch = text.match(/\b(\d+(?:\.\d+)?)\s*(bowl|bowls|cup|cups|slice|slices|egg|eggs|serving|servings|g|oz|piece|pieces)\b/i);
  return {
    calories,
    protein,
    carbs,
    fat,
    quantity: quantityMatch ? Number(quantityMatch[1]) : null,
    quantityUnit: quantityMatch?.[2]?.toLowerCase() ?? null,
  };
}

function matchLabeledNumber(text: string, pattern: RegExp): number | null {
  const match = text.match(pattern);
  if (!match?.[1]) {
    return null;
  }
  const value = Number(match[1]);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function matchLeadingNumber(text: string, pattern: RegExp): number | null {
  return matchLabeledNumber(text, pattern);
}

function matchGrams(text: string, label: string): number | null {
  const labeled = text.match(new RegExp(`${label}\\s*[:=]?\\s*(\\d+(?:\\.\\d+)?)\\s*g?\\b`, 'i'));
  if (labeled?.[1]) {
    const value = Number(labeled[1]);
    return Number.isFinite(value) && value >= 0 ? value : null;
  }
  const trailing = text.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*g\\s*${label}\\b`, 'i'));
  if (trailing?.[1]) {
    const value = Number(trailing[1]);
    return Number.isFinite(value) && value >= 0 ? value : null;
  }
  return null;
}

function isDateRow(text: string): boolean {
  return Boolean(parseDiaryDate(text)) && text.trim().split(/\s+/).length <= 3;
}

function isMealRow(text: string): boolean {
  return Boolean(parseMealType(text)) && text.trim().split(/\s+/).length <= 3;
}

function isNutritionOnly(text: string): boolean {
  const nutrition = extractNutritionFromText(text);
  const hasNutrition = nutrition.calories !== null || nutrition.protein !== null || nutrition.carbs !== null || nutrition.fat !== null;
  const words = text.replace(/[\d.,%\-–—|/kcalg]+/gi, ' ').trim();
  return hasNutrition && words.split(/\s+/).filter(Boolean).length <= 4;
}

function isLikelyFoodNameLine(text: string): boolean {
  if (!/[a-zA-Z]/.test(text) || isNutritionOnly(text) || isDateRow(text) || isMealRow(text)) {
    return false;
  }
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 8) {
    return false;
  }
  if (/[.!?]/.test(text) && words.length > 3) {
    return false;
  }
  return true;
}

function scoreRecord(input: {
  foodName: string | null;
  mealType: MealType | null;
  consumedAt: Date | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  quantity: number | null;
  fromTable: boolean;
  issues: string[];
}): { confidence: number; status: ParsedDiaryRecord['status'] } {
  if (!input.foodName) {
    return { confidence: 0.2, status: 'unparsed' };
  }
  let confidence = 0.45;
  if (input.fromTable) confidence += 0.2;
  if (input.consumedAt) confidence += 0.1;
  if (input.mealType) confidence += 0.1;
  if (input.calories !== null) confidence += 0.1;
  if (input.protein !== null && input.carbs !== null && input.fat !== null) confidence += 0.05;
  if (input.quantity !== null) confidence += 0.05;
  confidence = Math.min(0.95, Math.round(confidence * 20) / 20);

  const missingRequired = !input.mealType || !input.consumedAt || input.quantity === null;
  if (missingRequired || input.issues.length > 0) {
    return { confidence: Math.min(confidence, 0.7), status: 'warning' };
  }
  return { confidence, status: confidence >= 0.8 ? 'valid' : 'warning' };
}

function toRecord(partial: Omit<ParsedDiaryRecord, 'status' | 'confidence' | 'micronutrients'> & {
  fromTable?: boolean;
}): ParsedDiaryRecord {
  const foodName = partial.foodName ? sanitizeFoodName(partial.foodName) : partial.foodName;
  const scored = scoreRecord({
    foodName,
    mealType: partial.mealType,
    consumedAt: partial.consumedAt,
    calories: partial.calories,
    protein: partial.protein,
    carbs: partial.carbs,
    fat: partial.fat,
    quantity: partial.quantity,
    fromTable: Boolean(partial.fromTable),
    issues: partial.issues,
  });
  return {
    foodName,
    quantity: partial.quantity,
    quantityUnit: partial.quantityUnit,
    mealType: partial.mealType,
    consumedAt: partial.consumedAt,
    calories: partial.calories,
    protein: partial.protein,
    carbs: partial.carbs,
    fat: partial.fat,
    micronutrients: [],
    status: scored.status,
    confidence: scored.confidence,
    issues: partial.issues,
    layout: partial.layout,
  };
}

function parseQuantityParts(raw: string | undefined): { quantity: number | null; quantityUnit: string | null } {
  if (!raw) {
    return { quantity: null, quantityUnit: null };
  }
  const match = raw.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z%]+)?/);
  if (!match) {
    return { quantity: parsePositive(raw), quantityUnit: null };
  }
  return {
    quantity: parsePositive(match[1]),
    quantityUnit: match[2] ? match[2].toLowerCase() : null,
  };
}

function parseTableRows(
  rows: ReconstructedRow[],
  timeZone: string,
  warnings: DiaryParseWarning[],
): ParsedDiaryRecord[] | null {
  const detected = detectColumns(rows);
  if (!detected) {
    return null;
  }
  warnings.push(...detected.warnings);
  for (const field of ['calories', 'protein', 'carbs', 'fat'] as const) {
    if (!detected.winners.has(field)) {
      warnings.push({
        type: 'MISSING_COLUMN',
        canonicalField: field,
        fallback: 0,
        message: `${field} column was missing; values default to 0.`,
      });
    }
  }
  const records: ParsedDiaryRecord[] = [];
  let currentDate = null as ReturnType<typeof parseDiaryDate>;
  let currentMeal: MealType | null = null;
  for (let index = detected.headerRowIndex + 1; index < rows.length; index += 1) {
    const row = rows[index];
    if (!row) {
      continue;
    }
    const mapped = assignCellsToColumns(row, detected.columns);
    if (parseDiaryDate(row.text) && !mapped.foodName && mapped.calories === undefined) {
      currentDate = parseDiaryDate(row.text);
      continue;
    }
    if (parseMealType(row.text) && !mapped.foodName && mapped.calories === undefined) {
      currentMeal = parseMealType(row.text);
      continue;
    }
    const foodName = mapped.foodName?.trim() || null;
    if (!foodName && mapped.calories === undefined && mapped.protein === undefined) {
      continue;
    }
    const date = parseDiaryDate(mapped.consumedAt) ?? currentDate;
    const mealType = parseMealType(mapped.mealType) ?? currentMeal;
    const qty = parseQuantityParts(mapped.quantity);
    const issues: string[] = [];
    if (!foodName) issues.push('Could not determine the food name.');
    if (!date) issues.push('Could not determine the date.');
    if (!mealType) issues.push('Could not determine the meal type.');
    const calories = nutritionOrZero(
      mapped.calories,
      detected.winners.has('calories'),
      'Calories',
      detected.winners.get('calories')?.originalHeader,
      issues,
      warnings,
    );
    const protein = nutritionOrZero(
      mapped.protein,
      detected.winners.has('protein'),
      'Protein',
      detected.winners.get('protein')?.originalHeader,
      issues,
      warnings,
    );
    const carbs = nutritionOrZero(
      mapped.carbs,
      detected.winners.has('carbs'),
      'Carbs',
      detected.winners.get('carbs')?.originalHeader,
      issues,
      warnings,
    );
    const fat = nutritionOrZero(
      mapped.fat,
      detected.winners.has('fat'),
      'Fat',
      detected.winners.get('fat')?.originalHeader,
      issues,
      warnings,
    );
    records.push(
      toRecord({
        foodName,
        quantity: qty.quantity ?? parsePositive(mapped.quantity),
        quantityUnit: qty.quantityUnit ?? mapped.quantityUnit?.toLowerCase() ?? (qty.quantity ? 'serving' : null),
        mealType,
        consumedAt: consumedAtFrom(date, mealType, timeZone),
        calories,
        protein,
        carbs,
        fat,
        issues,
        layout: 'table',
        fromTable: true,
      }),
    );
  }
  return records;
}

function parseMixedLine(
  text: string,
  currentDate: ReturnType<typeof parseDiaryDate>,
  currentMeal: MealType | null,
  timeZone: string,
): ParsedDiaryRecord | null {
  if (!/[—\-|]/.test(text) && !/(kcal|calories)/i.test(text)) {
    return null;
  }
  const parts = text.split(/\s*[—\-|]\s*/).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) {
    return null;
  }
  let foodName: string | null = null;
  let quantity: number | null = null;
  let quantityUnit: string | null = null;
  let calories: number | null = null;
  let protein: number | null = null;
  let carbs: number | null = null;
  let fat: number | null = null;
  let mealType = currentMeal;
  let date = currentDate;

  for (const part of parts) {
    const partDate = parseDiaryDate(part);
    if (partDate) {
      date = partDate;
      continue;
    }
    const partMeal = parseMealType(part);
    if (partMeal) {
      mealType = partMeal;
      continue;
    }
    const nutrition = extractNutritionFromText(part);
    const hasMacro =
      nutrition.calories !== null ||
      nutrition.protein !== null ||
      nutrition.carbs !== null ||
      nutrition.fat !== null;
    if (nutrition.calories !== null) calories = nutrition.calories;
    if (nutrition.protein !== null) protein = nutrition.protein;
    if (nutrition.carbs !== null) carbs = nutrition.carbs;
    if (nutrition.fat !== null) fat = nutrition.fat;
    if (!hasMacro && nutrition.quantity !== null) {
      quantity = nutrition.quantity;
      quantityUnit = nutrition.quantityUnit;
      continue;
    }
    if (hasMacro) {
      continue;
    }
    const qty = parseQuantityParts(part);
    if (qty.quantity !== null && /^(?:\d+(?:\.\d+)?)(?:\s*[a-zA-Z%]+)?$/.test(part)) {
      quantity = qty.quantity;
      quantityUnit = qty.quantityUnit;
      continue;
    }
    if (!foodName && /[a-zA-Z]/.test(part) && !isNutritionOnly(part)) {
      foodName = part;
    }
  }

  if (!foodName) {
    return null;
  }
  const issues: string[] = [];
  if (!date) issues.push('Could not determine the date.');
  if (!mealType) issues.push('Could not determine the meal type.');
  const nutrition = applyMissingNutrition(calories, protein, carbs, fat, issues);
  if (quantity === null) {
    quantity = 1;
    quantityUnit = quantityUnit ?? 'serving';
    issues.push('Quantity not found; defaulted to 1 serving.');
  }
  return toRecord({
    foodName,
    quantity,
    quantityUnit: quantityUnit ?? 'serving',
    mealType,
    consumedAt: consumedAtFrom(date, mealType, timeZone),
    calories: nutrition.calories,
    protein: nutrition.protein,
    carbs: nutrition.carbs,
    fat: nutrition.fat,
    issues,
    layout: 'mixed',
  });
}

function parseLineOriented(rows: ReconstructedRow[], timeZone: string): ParsedDiaryRecord[] {
  const records: ParsedDiaryRecord[] = [];
  let currentDate = null as ReturnType<typeof parseDiaryDate>;
  let currentMeal: MealType | null = null;
  let pending: {
    foodName: string;
    quantity: number | null;
    quantityUnit: string | null;
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    issues: string[];
  } | null = null;

  function flush() {
    if (!pending) {
      return;
    }
    const issues = [...pending.issues];
    if (!currentDate) issues.push('Could not determine the date.');
    if (!currentMeal) issues.push('Could not determine the meal type.');
    const nutrition = applyMissingNutrition(pending.calories, pending.protein, pending.carbs, pending.fat, issues);
    if (pending.quantity === null) {
      pending.quantity = 1;
      pending.quantityUnit = pending.quantityUnit ?? 'serving';
      issues.push('Quantity not found; defaulted to 1 serving.');
    }
    records.push(
      toRecord({
        foodName: pending.foodName,
        quantity: pending.quantity,
        quantityUnit: pending.quantityUnit ?? 'serving',
        mealType: currentMeal,
        consumedAt: consumedAtFrom(currentDate, currentMeal, timeZone),
        calories: nutrition.calories,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fat: nutrition.fat,
        issues,
        layout: 'line',
      }),
    );
    pending = null;
  }

  for (const row of rows) {
    const mixed = parseMixedLine(row.text, currentDate, currentMeal, timeZone);
    if (mixed) {
      flush();
      records.push(mixed);
      continue;
    }
    if (isDateRow(row.text)) {
      flush();
      currentDate = parseDiaryDate(row.text);
      continue;
    }
    if (isMealRow(row.text)) {
      flush();
      currentMeal = parseMealType(row.text);
      continue;
    }
    if (pending && isNutritionOnly(row.text)) {
      const nutrition = extractNutritionFromText(row.text);
      pending.calories = pending.calories ?? nutrition.calories;
      pending.protein = pending.protein ?? nutrition.protein;
      pending.carbs = pending.carbs ?? nutrition.carbs;
      pending.fat = pending.fat ?? nutrition.fat;
      continue;
    }
    if (isLikelyFoodNameLine(row.text)) {
      const inline = extractNutritionFromText(row.text);
      if (!currentDate && !currentMeal && inline.calories === null) {
        continue;
      }
      flush();
      const qty = inline;
      pending = {
        foodName: row.text.replace(/\s+\d+(?:\.\d+)?\s*(?:kcal|calories).*$/i, '').trim() || row.text,
        quantity: qty.quantity,
        quantityUnit: qty.quantityUnit,
        calories: qty.calories,
        protein: qty.protein,
        carbs: qty.carbs,
        fat: qty.fat,
        issues: [],
      };
    }
  }
  flush();
  return records;
}

export function parseFoodDiary(
  rows: ReconstructedRow[],
  timeZone: string,
  warnings: DiaryParseWarning[] = [],
): ParsedDiaryRecord[] {
  const table = parseTableRows(rows, timeZone, warnings);
  if (table) {
    return table;
  }
  return parseLineOriented(rows, timeZone);
}
