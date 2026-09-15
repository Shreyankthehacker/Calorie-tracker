import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { PortionPage } from './PortionPage';
import { renderWithProviders } from '../test/render';

describe('PortionPage', () => {
  it('shows the suggested portion breakdown', () => {
    renderWithProviders(<PortionPage />, { route: '/portions' });
    expect(screen.getByRole('heading', { name: /portion auto-calculator/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Grilled salmon with rice')).toBeInTheDocument();
    expect(screen.getByText('210g salmon + 140g rice')).toBeInTheDocument();
    expect(screen.getByText('620 kcal')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /suggested split/i })).toBeInTheDocument();
  });

  it('sends the suggestion to the log meal page', async () => {
    const userEvt = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/portions" element={<PortionPage />} />
        <Route path="/log-meal" element={<p>Log meal screen</p>} />
      </Routes>,
      { route: '/portions' },
    );

    await userEvt.click(screen.getByRole('button', { name: /log this meal/i }));
    expect(await screen.findByText('Log meal screen')).toBeInTheDocument();
  });
});
