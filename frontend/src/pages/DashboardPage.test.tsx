import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { DashboardPage } from './DashboardPage';
import { renderWithProviders } from '../test/render';
import { ApiError, type FoodEntry, type Goal } from '../api/types';
import * as foodEntriesApi from '../api/food-entries';
import * as goalsApi from '../api/goals';
import * as reportsApi from '../api/reports';
import * as authApi from '../api/auth';
import { tokenStorage } from '../api/tokenStorage';

vi.mock('../api/food-entries');
vi.mock('../api/goals');
vi.mock('../api/reports');
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

const goal: Goal = {
  id: 'g1',
  dailyCalorieTarget: 2200,
  proteinTarget: 140,
  carbTarget: 220,
  fatTarget: 70,
  weightGoal: 70,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const oatmeal: FoodEntry = {
  id: 'e1',
  mealType: 'BREAKFAST',
  foodName: 'Oatmeal',
  quantity: 1,
  quantityUnit: 'bowl',
  calories: 650,
  protein: 24,
  carbs: 90,
  fat: 12,
  consumedAt: '2026-09-15T08:00:00.000Z',
  createdAt: '2026-09-15T08:01:00.000Z',
  updatedAt: '2026-09-15T08:01:00.000Z',
  micronutrients: [],
};

function listResponse(data: FoodEntry[]) {
  return {
    data,
    pagination: { page: 1, pageSize: 50, total: data.length, totalPages: 1 },
  };
}

describe('DashboardPage', () => {
  beforeEach(() => {
    tokenStorage.setTokens('access', 'refresh');
    vi.clearAllMocks();
    vi.mocked(authApi.getCurrentUser).mockResolvedValue(user);
    vi.mocked(goalsApi.getGoal).mockResolvedValue(goal);
    vi.mocked(reportsApi.getTodayReport).mockResolvedValue({
      date: '2026-09-15',
      timezone: 'UTC',
      calories: 650,
      protein: 24,
      carbs: 90,
      fat: 12,
    });
    vi.mocked(foodEntriesApi.listFoodEntries).mockResolvedValue(listResponse([]));
  });

  it('shows remaining calories against the daily target', async () => {
    renderWithProviders(<DashboardPage />, { route: '/' });
    expect(await screen.findByText(/1550 kcal remaining of your 2200 kcal target/i)).toBeInTheDocument();
    expect(screen.getByText(/kcal logged today/i)).toBeInTheDocument();
  });

  it('shows empty meal slots when nothing is logged', async () => {
    renderWithProviders(<DashboardPage />, { route: '/' });
    expect(await screen.findByText(/no meals logged today/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /breakfast/i })).toBeInTheDocument();
  });

  it('renders a logged breakfast card', async () => {
    vi.mocked(foodEntriesApi.listFoodEntries).mockResolvedValue(listResponse([oatmeal]));
    renderWithProviders(<DashboardPage />, { route: '/' });
    expect(await screen.findByText('Oatmeal')).toBeInTheDocument();
    expect(screen.getByText('650 kcal')).toBeInTheDocument();
  });

  it('does not invent a calorie budget when no goal exists', async () => {
    vi.mocked(goalsApi.getGoal).mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Resource not found'));
    renderWithProviders(<DashboardPage />, { route: '/' });
    expect(await screen.findByText(/no daily target set/i)).toBeInTheDocument();
  });

  it('shows a nutrition error when today\'s report fails', async () => {
    vi.mocked(reportsApi.getTodayReport).mockRejectedValue(
      new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Request failed'),
    );
    renderWithProviders(<DashboardPage />, { route: '/' });
    expect(await screen.findByText(/unable to load today's nutrition/i)).toBeInTheDocument();
  });

  it('navigates to goals from the set-target control', async () => {
    const userEvt = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/goals" element={<p>Goals screen</p>} />
      </Routes>,
      { route: '/' },
    );
    await userEvt.click(await screen.findByRole('button', { name: /set target/i }));
    expect(await screen.findByText('Goals screen')).toBeInTheDocument();
  });
});
