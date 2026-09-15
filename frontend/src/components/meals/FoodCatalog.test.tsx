import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FoodCatalog } from './FoodCatalog';
import { renderWithProviders } from '../../test/render';
import type { FoodEntry, FoodItem } from '../../api/types';
import * as foodItemsApi from '../../api/food-items';

vi.mock('../../api/food-items');

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
  mealTypes: ['BREAKFAST', 'LUNCH', 'SNACKS'],
  micronutrients: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const banana: FoodItem = {
  ...eggs,
  id: 'fi-banana',
  name: 'Banana',
  category: 'fruit',
  servingUnit: 'piece',
  calories: 105,
  protein: 1.3,
  carbs: 27,
  fat: 0.4,
  mealTypes: ['BREAKFAST', 'SNACKS'],
};

const loggedEntry: FoodEntry = {
  id: 'e-eggs',
  mealType: 'BREAKFAST',
  foodName: 'Eggs',
  quantity: 3,
  quantityUnit: 'egg',
  calories: 234,
  protein: 18.9,
  carbs: 1.8,
  fat: 15.9,
  consumedAt: '2026-09-13T08:00:00.000Z',
  createdAt: '2026-09-13T08:01:00.000Z',
  updatedAt: '2026-09-13T08:01:00.000Z',
  micronutrients: [],
};

function catalogResponse(data: FoodItem[]) {
  return {
    data,
    pagination: { page: 1, pageSize: 8, total: data.length, totalPages: 1 },
  };
}

describe('FoodCatalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(foodItemsApi.listFoodItems).mockResolvedValue(catalogResponse([eggs, banana]));
  });

  it('renders catalog cards and filters by meal tab', async () => {
    const userEvt = userEvent.setup();
    renderWithProviders(<FoodCatalog onLogged={vi.fn()} />, { route: '/meals', withAuth: false });

    expect(await screen.findByRole('button', { name: /eggs/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /banana/i })).toBeInTheDocument();

    await userEvt.click(screen.getByRole('tab', { name: 'Lunch' }));
    await waitFor(() => {
      expect(foodItemsApi.listFoodItems).toHaveBeenCalledWith(
        expect.objectContaining({ mealType: 'LUNCH', pageSize: 8 }),
      );
    });
  });

  it('searches the catalog', async () => {
    const userEvt = userEvent.setup();
    renderWithProviders(<FoodCatalog onLogged={vi.fn()} />, { route: '/meals', withAuth: false });
    await screen.findByRole('button', { name: /eggs/i });

    await userEvt.type(screen.getByLabelText(/search food/i), 'banana');
    await waitFor(() => {
      expect(foodItemsApi.listFoodItems).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'banana', pageSize: 8 }),
      );
    });
  });

  it('calculates quantity totals and logs a scaled food entry', async () => {
    const userEvt = userEvent.setup();
    const onLogged = vi.fn();
    vi.mocked(foodItemsApi.logFoodItem).mockResolvedValue(loggedEntry);

    renderWithProviders(<FoodCatalog onLogged={onLogged} />, { route: '/meals', withAuth: false });
    await userEvt.click(await screen.findByRole('button', { name: /eggs/i }));

    expect(screen.getByRole('heading', { name: 'Eggs' })).toBeInTheDocument();
    const quantity = screen.getByLabelText(/^quantity$/i);
    await userEvt.clear(quantity);
    await userEvt.type(quantity, '3');

    expect(screen.getByText(/total: 234 kcal/i)).toBeInTheDocument();
    expect(screen.getByText(/p 18\.9g/i)).toBeInTheDocument();

    await userEvt.click(screen.getByRole('button', { name: /add to breakfast/i }));
    await waitFor(() => {
      expect(foodItemsApi.logFoodItem).toHaveBeenCalledWith(
        'fi-eggs',
        expect.objectContaining({ quantity: 3, mealType: 'BREAKFAST' }),
      );
    });
    expect(onLogged).toHaveBeenCalled();
  });

  it('closes the food dialog from the top close button', async () => {
    const userEvt = userEvent.setup();
    renderWithProviders(<FoodCatalog onLogged={vi.fn()} />, { route: '/meals', withAuth: false });
    await userEvt.click(await screen.findByRole('button', { name: /eggs/i }));

    expect(screen.getByRole('dialog', { name: 'Eggs' })).toBeInTheDocument();
    await userEvt.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('dialog', { name: 'Eggs' })).not.toBeInTheDocument();
  });
});
