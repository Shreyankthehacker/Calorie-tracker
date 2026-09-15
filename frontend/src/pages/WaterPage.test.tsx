import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WaterPage } from './WaterPage';
import { renderWithProviders } from '../test/render';

describe('WaterPage', () => {
  it('shows today\'s glass count and logs another glass', async () => {
    const userEvt = userEvent.setup();
    renderWithProviders(<WaterPage />, { route: '/water' });

    expect(screen.getByRole('heading', { name: /water intake/i })).toBeInTheDocument();
    expect(screen.getByText(/you're 4 of 8 glasses today/i)).toBeInTheDocument();

    await userEvt.click(screen.getByRole('button', { name: /\+ log a glass/i }));
    expect(screen.getByText(/you're 5 of 8 glasses today/i)).toBeInTheDocument();
  });

  it('sets the count from a glass button and toggles a reminder', async () => {
    const userEvt = userEvent.setup();
    renderWithProviders(<WaterPage />, { route: '/water' });

    await userEvt.click(screen.getByRole('button', { name: 'Glass 2' }));
    expect(screen.getByText(/you're 2 of 8 glasses today/i)).toBeInTheDocument();

    const reminderToggles = screen.getAllByRole('button', { pressed: true });
    expect(reminderToggles).toHaveLength(2);
    await userEvt.click(reminderToggles[0]!);
    expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(1);
  });
});
