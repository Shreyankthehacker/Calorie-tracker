import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppRouter } from '../routes/AppRouter';
import { GetStartedPage } from './GetStartedPage';
import { renderWithProviders } from '../test/render';

describe('public landing and first sitting', () => {
  it('opens the landing page at / with sign in and get started', async () => {
    renderWithProviders(<AppRouter />, { route: '/' });
    expect(await screen.findByRole('heading', { name: /write down the meal/i })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Sign in' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Get started' })).toHaveAttribute('href', '/get-started');
    expect(screen.queryByRole('button', { name: /continue with google/i })).not.toBeInTheDocument();
  });

  it('walks through the table setting and offers an account at the end', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GetStartedPage />, { route: '/get-started' });
    expect(await screen.findByRole('heading', { name: /the table is set/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('heading', { name: /a meal is a line/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('heading', { name: /stack of receipts/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute('href', '/register');
    expect(screen.getAllByRole('link', { name: 'Sign in' }).length).toBeGreaterThan(0);
  });
});
