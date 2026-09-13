import { apiRequest } from './client';
import type {
  CalorieTrendReport,
  GoalVsActualReport,
  MacroTrendReport,
  MicronutrientReport,
  ReportRangeParams,
  TodayReport,
} from './types';

function toQuery(params: ReportRangeParams): string {
  const search = new URLSearchParams({
    startDate: params.startDate,
    endDate: params.endDate,
  });
  return `?${search.toString()}`;
}

export async function getTodayReport(): Promise<TodayReport> {
  return apiRequest<TodayReport>('/api/v1/reports/today');
}

export async function getCalorieReport(params: ReportRangeParams): Promise<CalorieTrendReport> {
  return apiRequest<CalorieTrendReport>(`/api/v1/reports/calories${toQuery(params)}`);
}

export async function getMacroReport(params: ReportRangeParams): Promise<MacroTrendReport> {
  return apiRequest<MacroTrendReport>(`/api/v1/reports/macros${toQuery(params)}`);
}

export async function getMicronutrientReport(
  params: ReportRangeParams,
): Promise<MicronutrientReport> {
  return apiRequest<MicronutrientReport>(`/api/v1/reports/micronutrients${toQuery(params)}`);
}

export async function getGoalVsActualReport(
  params: ReportRangeParams,
): Promise<GoalVsActualReport> {
  return apiRequest<GoalVsActualReport>(`/api/v1/reports/goals${toQuery(params)}`);
}
