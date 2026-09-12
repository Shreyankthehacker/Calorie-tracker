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
