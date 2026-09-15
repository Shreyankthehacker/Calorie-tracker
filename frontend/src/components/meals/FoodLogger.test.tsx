import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FoodLogger } from './FoodLogger';
import { useLogFood } from './LogFoodProvider';
import { renderWithProviders } from '../../test/render';
import type { FoodItem, RecentFood } from '../../api/types';
import * as foodItemsApi from '../../api/food-items';
import * as foodEntriesApi from '../../api/food-entries';

vi.mock('../../api/food-items');
vi.mock('../../api/food-entries');

const eggs: FoodItem = {
  id: 'fi-eggs',
  name: 'Eggs',
  category: 'protein',
  servingSize: 1,
  servingUnit: 'egg',
  calories: 78,
  protein: 6.3,
  carbs: 0.6,
  fat: 5.3,
  imageUrl: null,
  sourceType: 'SYSTEM',
  sourceReference: 'system_seed',
  verified: true,
  mealTypes: ['BREAKFAST'],
  micronutrients: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const oatsRecent: RecentFood = {
  foodName: 'Overnight oats',
  mealType: 'BREAKFAST',
  quantity: 1,
  quantityUnit: 'bowl',
  calories: 340,
  protein: 12,
  carbs: 54,
  fat: 6,
  micronutrients: [],
  lastConsumedAt: '2026-09-11T08:00:00.000Z',
  timesLogged: 2,
};

describe('FoodLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(foodEntriesApi.listRecentFoods).mockResolvedValue({ data: [oatsRecent] });
    vi.mocked(foodItemsApi.listFoodItems).mockResolvedValue({
      data: [eggs],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
  });

  it('shows recent foods from the API and logs a scaled catalog item', async () => {
    const userEvt = userEvent.setup();
    const onLogged = vi.fn();
    vi.mocked(foodItemsApi.logFoodItem).mockResolvedValue({
      id: 'e1',
      mealType: 'BREAKFAST',
      foodName: 'Eggs',
      quantity: 2,
      quantityUnit: 'egg',
      calories: 156,
      protein: 12.6,
      carbs: 1.2,
      fat: 10.6,
      consumedAt: '2026-09-13T08:00:00.000Z',
      createdAt: '2026-09-13T08:00:00.000Z',
      updatedAt: '2026-09-13T08:00:00.000Z',
      micronutrients: [],
    });

    renderWithProviders(<FoodLogger onClose={vi.fn()} onLogged={onLogged} />, {
      route: '/dashboard',
      withAuth: false,
    });

    expect(await screen.findByText('Overnight oats')).toBeInTheDocument();

    await userEvt.type(screen.getByPlaceholderText(/search food/i), 'Eggs');
    expect(await screen.findByRole('button', { name: /eggs/i })).toBeInTheDocument();
    await userEvt.click(screen.getByRole('button', { name: /eggs/i }));
    await userEvt.click(screen.getByRole('button', { name: /increase quantity/i }));
    await userEvt.click(screen.getByRole('button', { name: /add to breakfast/i }));

    await waitFor(() => {
      expect(foodItemsApi.logFoodItem).toHaveBeenCalledWith(
        'fi-eggs',
        expect.objectContaining({ quantity: 2, mealType: 'BREAKFAST' }),
      );
    });
    expect(onLogged).toHaveBeenCalled();
  });

  it('opens from a click handler without treating the event as a meal type', async () => {
    const userEvt = userEvent.setup();
    function Trigger() {
      const { openLogFood } = useLogFood();
      return (
        <button type="button" onClick={openLogFood}>
          Log new item
        </button>
      );
    }

    renderWithProviders(<Trigger />, { route: '/dashboard', withAuth: false });
    await userEvt.click(screen.getByRole('button', { name: 'Log new item' }));
    expect(await screen.findByRole('dialog', { name: /log food/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add to breakfast/i })).toBeInTheDocument();
  });

  it('lets the user edit protein on a recent food before saving', async () => {
    const userEvt = userEvent.setup();
    const onLogged = vi.fn();
    vi.mocked(foodEntriesApi.createFoodEntry).mockResolvedValue({
      id: 'e2',
      mealType: 'BREAKFAST',
      foodName: 'Overnight oats',
      quantity: 1,
      quantityUnit: 'bowl',
      calories: 340,
      protein: 20,
      carbs: 54,
      fat: 6,
      consumedAt: '2026-09-13T08:00:00.000Z',
      createdAt: '2026-09-13T08:00:00.000Z',
      updatedAt: '2026-09-13T08:00:00.000Z',
      micronutrients: [],
    });

    renderWithProviders(<FoodLogger onClose={vi.fn()} onLogged={onLogged} />, {
      route: '/dashboard',
      withAuth: false,
    });

    await userEvt.click(await screen.findByRole('button', { name: /overnight oats/i }));
    const protein = screen.getByLabelText(/^protein$/i);
    await userEvt.clear(protein);
    await userEvt.type(protein, '20');
    await userEvt.click(screen.getByRole('button', { name: /add to breakfast/i }));

    await waitFor(() => {
      expect(foodEntriesApi.createFoodEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          foodName: 'Overnight oats',
          protein: 20,
          calories: 340,
        }),
      );
    });
    expect(foodItemsApi.logFoodItem).not.toHaveBeenCalled();
    expect(onLogged).toHaveBeenCalled();
  });

  it('keeps the editor open when quantity is cleared', async () => {
    const userEvt = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(<FoodLogger onClose={onClose} onLogged={vi.fn()} />, {
      route: '/dashboard',
      withAuth: false,
    });

    await userEvt.click(await screen.findByRole('button', { name: /overnight oats/i }));
    const quantity = screen.getByLabelText(/^quantity$/i);
    await userEvt.clear(quantity);

    expect(screen.getByRole('heading', { name: 'Overnight oats' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^meal$/i)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('uses the meal slot the user opened from Today', async () => {
    const userEvt = userEvent.setup();
    renderWithProviders(
      <FoodLogger initialMealType="DINNER" onClose={vi.fn()} onLogged={vi.fn()} />,
      { route: '/dashboard', withAuth: false },
    );

    await userEvt.click(await screen.findByRole('button', { name: /overnight oats/i }));
    expect(screen.getByLabelText(/^meal$/i)).toHaveTextContent('Dinner');
    expect(screen.getByRole('button', { name: /add to dinner/i })).toBeInTheDocument();
  });
});
