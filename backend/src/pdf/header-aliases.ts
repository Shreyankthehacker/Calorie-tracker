import type { CanonicalField, HeaderMatch, HeaderMatchType } from './types.js';

export const CANONICAL_FIELDS = [
  'foodName',
  'quantity',
  'quantityUnit',
  'mealType',
  'consumedAt',
  'calories',
  'protein',
  'carbs',
  'fat',
  'micronutrients',
] as const satisfies readonly CanonicalField[];

const EXACT_LABELS: Record<CanonicalField, string> = {
  foodName: 'food name',
  quantity: 'quantity',
  quantityUnit: 'quantity unit',
  mealType: 'meal type',
  consumedAt: 'consumed at',
  calories: 'calories',
  protein: 'protein',
  carbs: 'carbs',
  fat: 'fat',
  micronutrients: 'micronutrients',
};

export const HEADER_ALIASES: Record<CanonicalField, string[]> = {
  calories: [
    'calories',
    'calorie',
    'cal',
    'cals',
    'energy',
    'energy kcal',
    'energy (kcal)',
    'kcal',
    'kcals',
    'calories kcal',
    'calories (kcal)',
  ],
  protein: [
    'protein',
    'protein g',
    'protein (g)',
    'prot',
    'prot.',
    'prot g',
    'prot. (g)',
    'protein grams',
  ],
  carbs: [
    'carbs',
    'carbohydrates',
    'carbohydrate',
    'cho',
    'total carbohydrate',
    'total carbohydrates',
    'carbohydrates g',
    'carbs g',
    'carbs (g)',
    'carbohydrate (g)',
    'carbohydrates (g)',
    'cho g',
    'cho (g)',
  ],
  fat: [
    'fat',
    'total fat',
    'fat g',
    'fat (g)',
    'total fat g',
    'total fat (g)',
    'lipids',
    'fats',
  ],
  foodName: [
    'food',
    'food name',
    'item',
    'item name',
    'meal item',
    'description',
    'food item',
  ],
  quantity: [
    'quantity',
    'qty',
    'amount',
    'servings',
    'serving',
    'count',
  ],
  quantityUnit: [
    'unit',
    'units',
    'serving unit',
    'quantity unit',
  ],
  mealType: [
    'meal',
    'meal type',
    'meal name',
    'occasion',
  ],
  consumedAt: [
    'date',
    'time',
    'datetime',
    'date time',
    'date/time',
    'consumed at',
    'consumption time',
    'timestamp',
    'day',
  ],
  micronutrients: [
    'micronutrients',
    'micros',
    'micronutrient',
  ],
};

export function normalizeHeaderForMatch(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/\u00a0/g, ' ')
    .toLowerCase()
    .replace(/[()[\]{}]/g, ' ')
    .replace(/[./\\|,;:_+\-–—]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const exactByNormalized = new Map<string, CanonicalField>();
const aliasByNormalized = new Map<string, CanonicalField>();

for (const field of CANONICAL_FIELDS) {
  exactByNormalized.set(EXACT_LABELS[field], field);
  for (const alias of HEADER_ALIASES[field]) {
    const normalized = normalizeHeaderForMatch(alias);
    if (!normalized || exactByNormalized.get(normalized) === field) {
      continue;
    }
    if (!aliasByNormalized.has(normalized) && !exactByNormalized.has(normalized)) {
      aliasByNormalized.set(normalized, field);
    }
  }
}

function matchControlledPattern(normalized: string): CanonicalField | null {
  if (/^(calories?|cals?|kcals?|energy)(\s+kcal)?$/.test(normalized)) {
    return 'calories';
  }
  if (/^(protein|prot)(\s+(g|grams))?$/.test(normalized)) {
    return 'protein';
  }
  if (/^(carb|carbs|carbohydrate|carbohydrates|cho)(\s+(g|grams))?$/.test(normalized)) {
    return 'carbs';
  }
  if (/^((total\s+)?fat|lipids)(\s+(g|grams))?$/.test(normalized)) {
    return 'fat';
  }
  if (/^(food(\s+(name|item))?|item(\s+name)?)$/.test(normalized)) {
    return 'foodName';
  }
  if (/^(qty|quantity|servings?|amount|count)$/.test(normalized)) {
    return 'quantity';
  }
  if (/^(meal(\s+(type|name))?|occasion)$/.test(normalized)) {
    return 'mealType';
  }
  if (/^(date(\s*\/?\s*time)?|time|datetime|consumed\s+at|consumption\s+time)$/.test(normalized)) {
    return 'consumedAt';
  }
  return null;
}

function confidenceFor(matchType: HeaderMatchType): number {
  if (matchType === 'exact') return 1;
  if (matchType === 'alias') return 0.95;
  if (matchType === 'pattern') return 0.8;
  return 0;
}

export function matchHeader(header: string): HeaderMatch {
  const originalHeader = header;
  const normalizedHeader = normalizeHeaderForMatch(header);
  if (!normalizedHeader) {
    return {
      originalHeader,
      normalizedHeader,
      canonicalField: null,
      confidence: 0,
      matchType: 'unknown',
    };
  }

  const exact = exactByNormalized.get(normalizedHeader);
  if (exact) {
    return {
      originalHeader,
      normalizedHeader,
      canonicalField: exact,
      confidence: confidenceFor('exact'),
      matchType: 'exact',
    };
  }

  const alias = aliasByNormalized.get(normalizedHeader);
  if (alias) {
    return {
      originalHeader,
      normalizedHeader,
      canonicalField: alias,
      confidence: confidenceFor('alias'),
      matchType: 'alias',
    };
  }

  const patterned = matchControlledPattern(normalizedHeader);
  if (patterned) {
    return {
      originalHeader,
      normalizedHeader,
      canonicalField: patterned,
      confidence: confidenceFor('pattern'),
      matchType: 'pattern',
    };
  }

  return {
    originalHeader,
    normalizedHeader,
    canonicalField: null,
    confidence: 0,
    matchType: 'unknown',
  };
}

export function matchHeaderKey(header: string): CanonicalField | null {
  return matchHeader(header).canonicalField;
}

export function countHeaderAliases(): number {
  return CANONICAL_FIELDS.reduce((total, field) => total + HEADER_ALIASES[field].length, 0);
}
