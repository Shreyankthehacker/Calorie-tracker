type NutrientRange = {
  amount: number;
  unit: string;
  label: string;
};

const DAILY_RANGES: Record<string, NutrientRange> = {
  sodium: { amount: 2300, unit: 'mg', label: 'recommended daily limit' },
  fiber: { amount: 28, unit: 'g', label: 'recommended daily' },
  calcium: { amount: 1000, unit: 'mg', label: 'recommended daily' },
  iron: { amount: 18, unit: 'mg', label: 'recommended daily' },
  potassium: { amount: 3400, unit: 'mg', label: 'recommended daily' },
  vitamin_c: { amount: 90, unit: 'mg', label: 'recommended daily' },
  vitamin_d: { amount: 20, unit: 'mcg', label: 'recommended daily' },
};

export function dailyReferenceRange(nutrientKey: string): NutrientRange | null {
  return DAILY_RANGES[nutrientKey] ?? null;
}
