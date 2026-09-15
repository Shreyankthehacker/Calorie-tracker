import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReportsPage } from './ReportsPage';
import { DashboardPage } from './DashboardPage';
import { renderWithProviders } from '../test/render';
import { ApiError, type CalorieTrendReport, type GoalVsActualReport, type MacroTrendReport, type MicronutrientReport, type TodayReport } from '../api/types';
import * as reportsApi from '../api/reports';
import * as foodEntriesApi from '../api/food-entries';
import * as goalsApi from '../api/goals';
import * as authApi from '../api/auth';
import { tokenStorage } from '../api/tokenStorage';

vi.mock('../api/reports');
vi.mock('../api/food-entries');
vi.mock('../api/goals');
vi.mock('../api/auth', async () => {
  const actual = await vi.importActual<typeof import('../api/auth')>('../api/auth');
  return {
    ...actual,
    getCurrentUser: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
  };
});

const user = {
  id: 'u1',
  email: 'ada@example.com',
  timezone: 'UTC',
  familyId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const calorieReport: CalorieTrendReport = {
  timezone: 'UTC',
  startDate: '2026-09-07',
  endDate: '2026-09-13',
  data: [
    { date: '2026-09-07', calories: 2100 },
    { date: '2026-09-08', calories: 1840 },
    { date: '2026-09-09', calories: 0 },
    { date: '2026-09-10', calories: 0 },
    { date: '2026-09-11', calories: 0 },
    { date: '2026-09-12', calories: 0 },
    { date: '2026-09-13', calories: 0 },
  ],
  totals: { calories: 3940 },
};

const macroReport: MacroTrendReport = {
  timezone: 'UTC',
  startDate: '2026-09-07',
  endDate: '2026-09-13',
  data: [
    { date: '2026-09-07', protein: 120, carbs: 210, fat: 65 },
    { date: '2026-09-08', protein: 112, carbs: 205, fat: 61 },
    { date: '2026-09-09', protein: 0, carbs: 0, fat: 0 },
    { date: '2026-09-10', protein: 0, carbs: 0, fat: 0 },
    { date: '2026-09-11', protein: 0, carbs: 0, fat: 0 },
    { date: '2026-09-12', protein: 0, carbs: 0, fat: 0 },
    { date: '2026-09-13', protein: 0, carbs: 0, fat: 0 },
  ],
  totals: { protein: 232, carbs: 415, fat: 126 },
};

const goalReport: GoalVsActualReport = {
  timezone: 'UTC',
  startDate: '2026-09-07',
  endDate: '2026-09-13',
  dayCount: 7,
  dailyGoal: { calories: 2200, protein: 140, carbs: 250, fat: 70 },
  goal: { calories: 15400, protein: 980, carbs: 1750, fat: 490 },
  actual: { calories: 3940, protein: 232, carbs: 415, fat: 126 },
};

const microReport: MicronutrientReport = {
  timezone: 'UTC',
  startDate: '2026-09-07',
  endDate: '2026-09-13',
  data: [
    { nutrientKey: 'iron', amount: 42.5, unit: 'mg' },
    { nutrientKey: 'calcium', amount: 840, unit: 'mg' },
  ],
};

const emptyCalories: CalorieTrendReport = {
  ...calorieReport,
  data: calorieReport.data.map((row) => ({ ...row, calories: 0 })),
  totals: { calories: 0 },
};

const emptyMacros: MacroTrendReport = {
  ...macroReport,
  data: macroReport.data.map((row) => ({ ...row, protein: 0, carbs: 0, fat: 0 })),
  totals: { protein: 0, carbs: 0, fat: 0 },
};

const todayReport: TodayReport = {
  date: '2026-09-13',
  timezone: 'UTC',
  calories: 1840,
  protein: 112,
  carbs: 205,
  fat: 61,
};

function mockReports(overrides?: {
  calories?: CalorieTrendReport;
  macros?: MacroTrendReport;
  goals?: GoalVsActualReport;
  micros?: MicronutrientReport;
}) {
  vi.mocked(reportsApi.getCalorieReport).mockResolvedValue(overrides?.calories ?? calorieReport);
  vi.mocked(reportsApi.getMacroReport).mockResolvedValue(overrides?.macros ?? macroReport);
  vi.mocked(reportsApi.getGoalVsActualReport).mockResolvedValue(overrides?.goals ?? goalReport);
  vi.mocked(reportsApi.getMicronutrientReport).mockResolvedValue(overrides?.micros ?? microReport);
}

describe('ReportsPage', () => {
  beforeEach(() => {
    tokenStorage.setTokens('access', 'refresh');
    vi.clearAllMocks();
    vi.mocked(authApi.getCurrentUser).mockResolvedValue(user);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-13T12:00:00.000Z'));
    vi.mocked(goalsApi.getGoal).mockResolvedValue({
      id: 'g1',
      dailyCalorieTarget: 2200,
      proteinTarget: 140,
      carbTarget: 250,
      fatTarget: 70,
      weightGoal: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a loading state', () => {
    vi.mocked(reportsApi.getCalorieReport).mockImplementation(() => new Promise(() => undefined));
    vi.mocked(reportsApi.getMacroReport).mockImplementation(() => new Promise(() => undefined));
    vi.mocked(reportsApi.getGoalVsActualReport).mockImplementation(() => new Promise(() => undefined));
    vi.mocked(reportsApi.getMicronutrientReport).mockImplementation(() => new Promise(() => undefined));

    renderWithProviders(<ReportsPage />, { route: '/reports' });
    expect(screen.getByText(/loading reports/i)).toBeInTheDocument();
  });

  it('shows an empty state when the period has no nutrition data', async () => {
    mockReports({
      calories: emptyCalories,
      macros: emptyMacros,
      micros: { ...microReport, data: [] },
      goals: { ...goalReport, actual: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
    });

    renderWithProviders(<ReportsPage />, { route: '/reports' });
    expect(await screen.findAllByText(/no nutrition data for this period/i)).not.toHaveLength(0);
    expect(screen.getByText(/no micronutrient data for this period/i)).toBeInTheDocument();
  });

  it('renders reports from the API', async () => {
    mockReports();
    renderWithProviders(<ReportsPage />, { route: '/reports' });

    expect(await screen.findByRole('heading', { name: 'Calories' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Macro intake' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Goal vs actual' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Micronutrients' })).toBeInTheDocument();
    expect(screen.getByText(/period total: 3940 kcal/i)).toBeInTheDocument();
  });

  it('exposes calorie chart data', async () => {
    mockReports();
    renderWithProviders(<ReportsPage />, { route: '/reports' });

    expect(
      await screen.findByRole('img', { name: /2026-09-07 2100 kcal/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /2026-09-08 1840 kcal/i })).toBeInTheDocument();
  });

  it('exposes macro chart data', async () => {
    mockReports();
    renderWithProviders(<ReportsPage />, { route: '/reports' });

    expect(
      await screen.findByRole('img', { name: /protein 120g carbs 210g fat 65g/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('232')).toBeInTheDocument();
    expect(screen.getByText('415')).toBeInTheDocument();
    expect(screen.getByText('126')).toBeInTheDocument();
  });

  it('renders goal vs actual comparison', async () => {
    mockReports();
    renderWithProviders(<ReportsPage />, { route: '/reports' });

    expect(await screen.findByText(/3940 kcal this period/)).toBeInTheDocument();
    expect(screen.getByText(/232g this period/)).toBeInTheDocument();
    expect(screen.getByText(/415g this period/)).toBeInTheDocument();
    expect(screen.getByText(/126g this period/)).toBeInTheDocument();
    expect(screen.getByText(/2200 kcal daily/)).toBeInTheDocument();
  });

  it('renders the micronutrient summary', async () => {
    mockReports();
    renderWithProviders(<ReportsPage />, { route: '/reports' });

    expect(await screen.findByText('Iron')).toBeInTheDocument();
    expect(screen.getByText(/42\.5 mg/)).toBeInTheDocument();
    expect(screen.getByText('Calcium')).toBeInTheDocument();
    expect(screen.getByText(/840 mg/)).toBeInTheDocument();
  });

  it('shows a no-goal state', async () => {
    mockReports({
      goals: { ...goalReport, goal: null, dailyGoal: null },
    });
    renderWithProviders(<ReportsPage />, { route: '/reports' });

    expect(await screen.findByText(/no goal set yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /set your goal/i })).toBeInTheDocument();
  });

  it('refetches when the date range changes', async () => {
    mockReports();
    const userEvt = userEvent.setup();
    renderWithProviders(<ReportsPage />, { route: '/reports' });

    await screen.findByRole('heading', { name: 'Calories' });
    expect(reportsApi.getCalorieReport).toHaveBeenCalledWith({
      startDate: '2026-09-07',
      endDate: '2026-09-13',
    });

    await userEvt.selectOptions(screen.getByLabelText(/period/i), 'today');

    await waitFor(() => {
      expect(reportsApi.getCalorieReport).toHaveBeenCalledWith({
        startDate: '2026-09-13',
        endDate: '2026-09-13',
      });
    });
  });

  it('shows an API error', async () => {
    vi.mocked(reportsApi.getCalorieReport).mockRejectedValue(
      new ApiError(500, 'INTERNAL_SERVER_ERROR', 'boom'),
    );
    vi.mocked(reportsApi.getMacroReport).mockResolvedValue(macroReport);
    vi.mocked(reportsApi.getGoalVsActualReport).mockResolvedValue(goalReport);
    vi.mocked(reportsApi.getMicronutrientReport).mockResolvedValue(microReport);

    renderWithProviders(<ReportsPage />, { route: '/reports' });
    expect(await screen.findByText(/unable to load reports/i)).toBeInTheDocument();
  });
});

describe('DashboardPage reports', () => {
  beforeEach(() => {
    tokenStorage.setTokens('access', 'refresh');
    vi.clearAllMocks();
    vi.mocked(authApi.getCurrentUser).mockResolvedValue(user);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-13T12:00:00.000Z'));
    vi.mocked(goalsApi.getGoal).mockResolvedValue({
      id: 'g1',
      dailyCalorieTarget: 2200,
      proteinTarget: 140,
      carbTarget: 250,
      fatTarget: 70,
      weightGoal: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    vi.mocked(foodEntriesApi.listFoodEntries).mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 },
    });
    vi.mocked(reportsApi.getTodayReport).mockResolvedValue(todayReport);
    vi.mocked(reportsApi.getInsightsReport).mockResolvedValue({
      timezone: 'UTC',
      startDate: '2026-09-07',
      endDate: '2026-09-13',
      dayCount: 7,
      averageCalories: 562.9,
      averageProtein: 33.1,
      averageCarbs: 59.3,
      averageFat: 18,
      daysTracked: 2,
      daysOnTarget: 2,
      daysOver: 0,
      currentStreak: 0,
      dailyGoal: { calories: 2200, protein: 140, carbs: 250, fat: 70 },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses today's report API for nutrition totals", async () => {
    renderWithProviders(<DashboardPage />, { route: '/dashboard' });

    expect((await screen.findAllByText(/1840/)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/112/).length).toBeGreaterThan(0);
    expect(reportsApi.getTodayReport).toHaveBeenCalled();
  });

  it('does not rely on a food-entry page to calculate totals', async () => {
    renderWithProviders(<DashboardPage />, { route: '/dashboard' });
    await screen.findAllByText(/1840/);

    expect(foodEntriesApi.listFoodEntries).toHaveBeenCalledWith({
      startDate: '2026-09-13',
      endDate: '2026-09-13',
      page: 1,
      pageSize: 50,
    });
  });

  it('shows an error instead of an empty meals state when recent meals fail', async () => {
    vi.mocked(foodEntriesApi.listFoodEntries).mockRejectedValue(
      new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Request failed'),
    );

    renderWithProviders(<DashboardPage />, { route: '/dashboard' });
    expect(await screen.findByText(/unable to load meals/i)).toBeInTheDocument();
    expect(screen.queryByText(/no meals logged today/i)).not.toBeInTheDocument();
  });
});
