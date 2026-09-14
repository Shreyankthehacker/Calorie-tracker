import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MealForm } from './MealForm';
import { renderWithProviders } from '../../test/render';
import type { FoodEntry } from '../../api/types';

const chicken: FoodEntry = {
  id: 'draft',
  mealType: 'LUNCH',
  foodName: 'Chicken',
  quantity: 150,
  quantityUnit: 'g',
  calories: 248,
  protein: 46,
  carbs: 0,
  fat: 5,
  consumedAt: '2026-09-14T12:00:00.000Z',
  createdAt: '2026-09-14T12:00:00.000Z',
  updatedAt: '2026-09-14T12:00:00.000Z',
  micronutrients: [],
};

describe('MealForm nutrition scaling', () => {
  it('scales macros from the original quantity when quantity changes', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <MealForm initial={chicken} submitting={false} error={null} onSubmit={() => undefined} onCancel={() => undefined} />,
      { withAuth: false },
    );

    const quantity = screen.getByLabelText(/^quantity$/i);
    await user.clear(quantity);
    await user.type(quantity, '200');

    expect(screen.getByLabelText(/^calories/i)).toHaveValue(330.7);
    expect(screen.getByLabelText(/^protein/i)).toHaveValue(61.3);
    expect(screen.getByLabelText(/^carbs/i)).toHaveValue(0);
    expect(screen.getByLabelText(/^fat/i)).toHaveValue(6.7);
  });

  it('rebases from a manual nutrient edit so later quantity changes keep the correction', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <MealForm initial={chicken} submitting={false} error={null} onSubmit={() => undefined} onCancel={() => undefined} />,
      { withAuth: false },
    );

    const protein = screen.getByLabelText(/^protein/i);
    await user.clear(protein);
    await user.type(protein, '50');

    const quantity = screen.getByLabelText(/^quantity$/i);
    await user.clear(quantity);
    await user.type(quantity, '300');

    expect(screen.getByLabelText(/^protein/i)).toHaveValue(100);
    expect(screen.getByLabelText(/^calories/i)).toHaveValue(496);
  });
});
