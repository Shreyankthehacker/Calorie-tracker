export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export type PublicUser = {
  id: string;
  email: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
};

export type Goal = {
  id: string;
  dailyCalorieTarget: number;
  proteinTarget: number;
  carbTarget: number;
  fatTarget: number;
  weightGoal: number | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthResponse = {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
};

export type GoalWritePayload = {
  dailyCalorieTarget: number;
  proteinTarget: number;
  carbTarget: number;
  fatTarget: number;
  weightGoal?: number | null;
};

export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACKS';

export type Micronutrient = {
  nutrientKey: string;
  amount: number;
  unit: string;
};

export type FoodEntry = {
  id: string;
  mealType: MealType;
  foodName: string;
  quantity: number;
  quantityUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  consumedAt: string;
  createdAt: string;
  updatedAt: string;
  micronutrients: Micronutrient[];
};

export type FoodEntryWritePayload = {
  mealType: MealType;
  foodName: string;
  quantity: number;
  quantityUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  consumedAt: string;
  micronutrients?: Micronutrient[];
};

export type FoodEntryUpdatePayload = Partial<FoodEntryWritePayload>;

export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type FoodEntryListResponse = {
  data: FoodEntry[];
  pagination: Pagination;
};

export type FoodEntryListParams = {
  startDate?: string;
  endDate?: string;
  mealType?: MealType;
  page?: number;
  pageSize?: number;
};

export type MacroTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type TodayReport = MacroTotals & {
  date: string;
  timezone: string;
};

export type CalorieTrendReport = {
  timezone: string;
  startDate: string;
  endDate: string;
  data: Array<{ date: string; calories: number }>;
  totals: { calories: number };
};

export type MacroTrendReport = {
  timezone: string;
  startDate: string;
  endDate: string;
  data: Array<{ date: string; protein: number; carbs: number; fat: number }>;
  totals: { protein: number; carbs: number; fat: number };
};

export type MicronutrientReport = {
  timezone: string;
  startDate: string;
  endDate: string;
  data: Array<{ nutrientKey: string; amount: number; unit: string }>;
};

export type GoalVsActualReport = {
  timezone: string;
  startDate: string;
  endDate: string;
  dayCount: number;
  dailyGoal: MacroTotals | null;
  goal: MacroTotals | null;
  actual: MacroTotals;
};

export type ReportRangeParams = {
  startDate: string;
  endDate: string;
};

export type ExtractionSource = 'label' | 'photo_estimate' | 'unknown';

export type NutritionExtraction = {
  foodName: string;
  quantity: number;
  quantityUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  micronutrients: Micronutrient[];
  confidence: number | null;
  notes: string | null;
  source: ExtractionSource;
  mealType: MealType | null;
};

export type NutritionExtractResponse = {
  extraction: NutritionExtraction;
};

export type ChatHistoryItem = {
  role: 'user' | 'assistant';
  content: string;
};

export type PendingMeal = {
  mealType: MealType;
  foodName: string;
  quantity: number;
  quantityUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  consumedAt: string;
  micronutrients: Micronutrient[];
};

export type ChatResponse = {
  message: string;
  pendingMeal: PendingMeal | null;
};

export type ConfirmMealResponse = {
  message: string;
  foodEntry: FoodEntry;
};

export const AI_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
