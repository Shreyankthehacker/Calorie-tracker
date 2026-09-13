export type PdfTextBlock = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
};

export type PdfExtractResult = {
  pageCount: number;
  blocks: PdfTextBlock[];
  characterCount: number;
};

export type ReconstructedCell = {
  text: string;
  x: number;
  y: number;
  width: number;
};

export type ReconstructedRow = {
  page: number;
  y: number;
  cells: ReconstructedCell[];
  text: string;
};

export type CanonicalField =
  | 'foodName'
  | 'quantity'
  | 'quantityUnit'
  | 'mealType'
  | 'consumedAt'
  | 'calories'
  | 'protein'
  | 'carbs'
  | 'fat'
  | 'micronutrients';

export type DiaryColumnKey = CanonicalField;

export type HeaderMatchType = 'exact' | 'alias' | 'pattern' | 'unknown';

export type HeaderMatch = {
  originalHeader: string;
  normalizedHeader: string;
  canonicalField: CanonicalField | null;
  confidence: number;
  matchType: HeaderMatchType;
};

export type DetectedColumn = {
  originalHeader: string;
  normalizedHeader: string;
  canonicalField: CanonicalField | null;
  confidence: number;
  matchType: HeaderMatchType;
  x: number;
};

export type DiaryParseWarning = {
  type: 'UNKNOWN_COLUMN' | 'UNPARSEABLE_VALUE' | 'DUPLICATE_COLUMN_MAPPING' | 'MISSING_COLUMN';
  message: string;
  column?: string;
  value?: string;
  fallback?: number;
  canonicalField?: CanonicalField;
  columns?: string[];
};

export type DiaryParseStatus = 'valid' | 'warning' | 'unparsed';

export type ParsedDiaryRecord = {
  foodName: string | null;
  quantity: number | null;
  quantityUnit: string | null;
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACKS' | null;
  consumedAt: Date | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  micronutrients: Array<{ nutrientKey: string; amount: number; unit: string }>;
  status: DiaryParseStatus;
  confidence: number;
  issues: string[];
  layout: 'table' | 'line' | 'mixed' | 'unknown';
};
