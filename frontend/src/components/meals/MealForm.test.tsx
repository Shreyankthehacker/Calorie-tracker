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

  it('scales successive quantity edits from the original base instead of compounding', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <MealForm initial={chicken} submitting={false} error={null} onSubmit={() => undefined} onCancel={() => undefined} />,
      { withAuth: false },
    );

    const quantity = screen.getByLabelText(/^quantity$/i);
    await user.clear(quantity);
    await user.type(quantity, '200');
    await user.clear(quantity);
    await user.type(quantity, '300');

    expect(screen.getByLabelText(/^calories/i)).toHaveValue(496);
    expect(screen.getByLabelText(/^protein/i)).toHaveValue(92);
  });

  it('does not rescale nutrition when only the unit changes', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <MealForm initial={chicken} submitting={false} error={null} onSubmit={() => undefined} onCancel={() => undefined} />,
      { withAuth: false },
    );

    const unit = screen.getByLabelText(/^unit$/i);
    await user.clear(unit);
    await user.type(unit, 'ml');

    expect(screen.getByLabelText(/^quantity$/i)).toHaveValue(150);
    expect(screen.getByLabelText(/^calories/i)).toHaveValue(248);
    expect(screen.getByLabelText(/^protein/i)).toHaveValue(46);
    expect(screen.getByLabelText(/^carbs/i)).toHaveValue(0);
    expect(screen.getByLabelText(/^fat/i)).toHaveValue(5);
  });

  it('keeps a manual micronutrient edit and scales it from that new baseline', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <MealForm
        initial={{
          ...chicken,
          micronutrients: [{ nutrientKey: 'iron', amount: 5, unit: 'mg' }],
        }}
        submitting={false}
        error={null}
        onSubmit={() => undefined}
        onCancel={() => undefined}
      />,
      { withAuth: false },
    );

    const iron = screen.getByLabelText(/^amount$/i);
    await user.clear(iron);
    await user.type(iron, '7');

    const quantity = screen.getByLabelText(/^quantity$/i);
    await user.clear(quantity);
    await user.type(quantity, '300');

    expect(screen.getByLabelText(/^amount$/i)).toHaveValue(14);
    expect(screen.getByLabelText(/^nutrient$/i)).toHaveValue('iron');
    expect(screen.getByLabelText(/^calories/i)).toHaveValue(496);
  });

  it('updates the live meal summary from the current form values', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <MealForm initial={chicken} submitting={false} error={null} onSubmit={() => undefined} onCancel={() => undefined} />,
      { withAuth: false },
    );

    const summary = screen.getByText(/this meal/i).closest('.meal-live');
    expect(summary).toHaveTextContent('248');
    expect(summary).toHaveTextContent('Protein 46g');

    const quantity = screen.getByLabelText(/^quantity$/i);
    await user.clear(quantity);
    await user.type(quantity, '200');

    expect(summary).toHaveTextContent('330.7');
    expect(summary).toHaveTextContent('Protein 61.3g');
    expect(summary).toHaveTextContent('Carbs 0g');
    expect(summary).toHaveTextContent('Fat 6.7g');
  });
});
