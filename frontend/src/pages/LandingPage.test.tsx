import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppRouter } from '../routes/AppRouter';
import { GetStartedPage } from './GetStartedPage';
import { TutorialPage } from './TutorialPage';
import { AboutPage } from './AboutPage';
import { renderWithProviders } from '../test/render';

describe('public landing and first sitting', () => {
  it('opens the landing page at / with sign in and start tracking', async () => {
    renderWithProviders(<AppRouter />, { route: '/' });
    expect(
      await screen.findByRole('heading', { name: /know what you're eating/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Sign in' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Start tracking' })[0]).toHaveAttribute(
      'href',
      '/register',
    );
    expect(screen.getByRole('link', { name: 'Open tutorial' })).toHaveAttribute('href', '/tutorial');
    expect(screen.getAllByRole('link', { name: 'About' })[0]).toHaveAttribute('href', '/about');
    expect(screen.getByRole('link', { name: 'Read about the product' })).toHaveAttribute('href', '/about');
    expect(screen.queryByRole('button', { name: /continue with google/i })).not.toBeInTheDocument();
  });

  it('walks the tutorial page with next', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TutorialPage />, { route: '/tutorial' });
    expect(screen.getByRole('heading', { name: /a first day, in five moves/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(
      await screen.findByRole('heading', { name: /catalog, photo, barcode/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /review nutrition/i }));
    expect(
      await screen.findByRole('heading', { name: /calories and macros on the meal/i }),
    ).toBeInTheDocument();
  });

  it('opens the about page with shipped features', () => {
    renderWithProviders(<AboutPage />, { route: '/about' });
    expect(screen.getByRole('heading', { name: /a tracker for meals you actually ate/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /personal health goals/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /photo nutrition extraction/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /sage chat/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /pdf food diary import/i })).toBeInTheDocument();
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
