import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { MealsPage } from './MealsPage';
import { ProtectedRoute } from '../routes/guards';
import { renderWithProviders } from '../test/render';
import { ApiError, type FoodEntry } from '../api/types';
import * as foodEntriesApi from '../api/food-entries';
import * as foodItemsApi from '../api/food-items';
import * as authApi from '../api/auth';
import { tokenStorage } from '../api/tokenStorage';

vi.mock('../api/food-entries');
vi.mock('../api/food-items');
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

const oatmeal: FoodEntry = {
  id: 'e1',
  mealType: 'BREAKFAST',
  foodName: 'Oatmeal',
  quantity: 1,
  quantityUnit: 'bowl',
  calories: 320,
  protein: 12,
  carbs: 54,
  fat: 6,
  consumedAt: '2026-09-12T08:00:00.000Z',
  createdAt: '2026-09-12T08:01:00.000Z',
  updatedAt: '2026-09-12T08:01:00.000Z',
  micronutrients: [{ nutrientKey: 'iron', amount: 2, unit: 'mg' }],
};

function listResponse(data: FoodEntry[], page = 1, totalPages = 1, total = data.length) {
  return {
    data,
    pagination: { page, pageSize: 10, total, totalPages },
  };
}

describe('MealsPage', () => {
  beforeEach(() => {
    tokenStorage.setTokens('access', 'refresh');
    vi.clearAllMocks();
    vi.mocked(authApi.getCurrentUser).mockResolvedValue(user);
    vi.mocked(foodItemsApi.listFoodItems).mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 },
    });
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
  });

  it('shows a loading state', () => {
    vi.mocked(foodEntriesApi.listFoodEntries).mockImplementation(
      () => new Promise(() => undefined),
    );
    renderWithProviders(<MealsPage />, { route: '/meals' });
    expect(screen.getByText(/loading meals/i)).toBeInTheDocument();
  });

  it('shows an empty state', async () => {
    vi.mocked(foodEntriesApi.listFoodEntries).mockResolvedValue(listResponse([]));
    renderWithProviders(<MealsPage />, { route: '/meals' });
    expect(await screen.findByText(/no meals recorded yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add your first meal/i })).toBeInTheDocument();
  });

  it('shows a day-specific empty state when a single date is filtered', async () => {
    vi.mocked(foodEntriesApi.listFoodEntries).mockResolvedValue(listResponse([]));
    renderWithProviders(<MealsPage />, { route: '/meals' });
    await screen.findByText(/no meals recorded yet/i);

    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2026-09-13' } });
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2026-09-13' } });

    expect(await screen.findByText(/no meals recorded for this day/i)).toBeInTheDocument();
    expect(screen.queryByText(/no meals recorded yet/i)).not.toBeInTheDocument();
  });

  it('shows an API error state', async () => {
    vi.mocked(foodEntriesApi.listFoodEntries).mockRejectedValue(
      new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Request failed'),
    );
    renderWithProviders(<MealsPage />, { route: '/meals' });
    expect(await screen.findByText(/unable to load meals/i)).toBeInTheDocument();
    expect(screen.queryByText(/no meals recorded/i)).not.toBeInTheDocument();
  });

  it('renders meals from the API response', async () => {
    vi.mocked(foodEntriesApi.listFoodEntries).mockResolvedValue(listResponse([oatmeal]));
    renderWithProviders(<MealsPage />, { route: '/meals' });
    expect(await screen.findByText('Oatmeal')).toBeInTheDocument();
    expect(screen.getAllByText(/320 kcal/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/iron 2mg/i)).toBeInTheDocument();
  });

  it('sends meal-type filters to the API and resets to page 1', async () => {
    const userEvt = userEvent.setup();
    vi.mocked(foodEntriesApi.listFoodEntries).mockResolvedValue(listResponse([oatmeal]));
    renderWithProviders(<MealsPage />, { route: '/meals' });
    await screen.findByText('Oatmeal');

    await userEvt.selectOptions(screen.getByLabelText(/meal type/i), 'LUNCH');
    await waitFor(() => {
      expect(foodEntriesApi.listFoodEntries).toHaveBeenCalledWith(
        expect.objectContaining({ mealType: 'LUNCH', page: 1 }),
      );
    });
  });

  it('validates the add meal form', async () => {
    const userEvt = userEvent.setup();
    vi.mocked(foodEntriesApi.listFoodEntries).mockResolvedValue(listResponse([]));
    renderWithProviders(<MealsPage />, { route: '/meals' });
    await userEvt.click(await screen.findByRole('button', { name: /add your first meal/i }));
    await userEvt.click(screen.getByRole('button', { name: /save meal/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/food name is required/i);
    expect(foodEntriesApi.createFoodEntry).not.toHaveBeenCalled();
  });

  it('creates a meal successfully', async () => {
    const userEvt = userEvent.setup();
    vi.mocked(foodEntriesApi.listFoodEntries).mockResolvedValue(listResponse([]));
    vi.mocked(foodEntriesApi.createFoodEntry).mockResolvedValue(oatmeal);

    renderWithProviders(<MealsPage />, { route: '/meals' });
    await userEvt.click(await screen.findByRole('button', { name: /add custom meal/i }));
    await userEvt.type(screen.getByLabelText(/^food$/i), 'Oatmeal');
    await userEvt.clear(screen.getByLabelText(/^calories/i));
    await userEvt.type(screen.getByLabelText(/^calories/i), '320');
    await userEvt.clear(screen.getByLabelText(/^protein/i));
    await userEvt.type(screen.getByLabelText(/^protein/i), '12');
    await userEvt.clear(screen.getByLabelText(/^carbs/i));
    await userEvt.type(screen.getByLabelText(/^carbs/i), '54');
    await userEvt.clear(screen.getByLabelText(/^fat/i));
    await userEvt.type(screen.getByLabelText(/^fat/i), '6');
    await userEvt.click(screen.getByRole('button', { name: /save meal/i }));

    await waitFor(() => {
      expect(foodEntriesApi.createFoodEntry).toHaveBeenCalled();
    });
    expect(await screen.findByText(/meal added/i)).toBeInTheDocument();
  });

  it('opens the edit form with existing values and saves updates', async () => {
    const userEvt = userEvent.setup();
    vi.mocked(foodEntriesApi.listFoodEntries).mockResolvedValue(listResponse([oatmeal]));
    vi.mocked(foodEntriesApi.updateFoodEntry).mockResolvedValue({
      ...oatmeal,
      foodName: 'Steel-cut oatmeal',
    });

    renderWithProviders(<MealsPage />, { route: '/meals' });
    await userEvt.click(await screen.findByRole('button', { name: /edit/i }));
    expect(screen.getByDisplayValue('Oatmeal')).toBeInTheDocument();
    expect(screen.getByDisplayValue('iron')).toBeInTheDocument();

    await userEvt.clear(screen.getByLabelText(/^food$/i));
    await userEvt.type(screen.getByLabelText(/^food$/i), 'Steel-cut oatmeal');
    await userEvt.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(foodEntriesApi.updateFoodEntry).toHaveBeenCalledWith(
        'e1',
        expect.objectContaining({ foodName: 'Steel-cut oatmeal' }),
      );
    });
    expect(await screen.findByText(/meal updated/i)).toBeInTheDocument();
  });

  it('confirms before deleting a meal', async () => {
    const userEvt = userEvent.setup();
    vi.mocked(foodEntriesApi.listFoodEntries).mockResolvedValue(listResponse([oatmeal]));
    vi.mocked(foodEntriesApi.deleteFoodEntry).mockResolvedValue(undefined);

    renderWithProviders(<MealsPage />, { route: '/meals' });
    await userEvt.click(await screen.findByRole('button', { name: /delete/i }));
    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(foodEntriesApi.deleteFoodEntry).toHaveBeenCalledWith('e1', expect.anything());
    });
    expect(await screen.findByText(/meal deleted/i)).toBeInTheDocument();
  });

  it('keeps the meals page behind authentication', async () => {
    tokenStorage.clear();
    renderWithProviders(
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/meals" element={<MealsPage />} />
        </Route>
        <Route path="/login" element={<p>Login screen</p>} />
      </Routes>,
      { route: '/meals' },
    );
    expect(await screen.findByText('Login screen')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Meals' })).not.toBeInTheDocument();
  });

  it('renders pagination controls', async () => {
    const userEvt = userEvent.setup();
    vi.mocked(foodEntriesApi.listFoodEntries).mockResolvedValue(listResponse([oatmeal], 1, 3, 25));
    renderWithProviders(<MealsPage />, { route: '/meals' });

    expect(await screen.findByText(/page 1 of 3/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
    await userEvt.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => {
      expect(foodEntriesApi.listFoodEntries).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, pageSize: 10 }),
      );
    });
  });
});
