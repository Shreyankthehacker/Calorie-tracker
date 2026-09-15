import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { LogMealPage } from './LogMealPage';
import { renderWithProviders } from '../test/render';
import * as foodItemsApi from '../api/food-items';
import * as authApi from '../api/auth';
import { tokenStorage } from '../api/tokenStorage';

vi.mock('../api/food-items');
vi.mock('../api/food-entries');
vi.mock('../api/ai');
vi.mock('../api/barcode');
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

describe('LogMealPage', () => {
  beforeEach(() => {
    tokenStorage.setTokens('access', 'refresh');
    vi.clearAllMocks();
    vi.mocked(authApi.getCurrentUser).mockResolvedValue(user);
    vi.mocked(foodItemsApi.listFoodItems).mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 8, total: 0, totalPages: 0 },
    });
  });

  it('defaults to catalog search and manual entry', async () => {
    renderWithProviders(<LogMealPage />, { route: '/log-meal' });
    expect(await screen.findByRole('heading', { name: /log food intake/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /search/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { name: /manual entry/i })).toBeInTheDocument();
  });

  it('switches to photo, barcode, and PDF methods', async () => {
    const userEvt = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/log-meal" element={<LogMealPage />} />
        <Route path="/import" element={<p>Bulk logging screen</p>} />
      </Routes>,
      { route: '/log-meal' },
    );

    await userEvt.click(await screen.findByRole('tab', { name: /photo/i }));
    expect(screen.getByText(/estimate nutrition from a photo/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /choose image/i })).toBeInTheDocument();

    await userEvt.click(screen.getByRole('tab', { name: /barcode/i }));
    expect(screen.getByLabelText(/barcode/i)).toBeInTheDocument();

    await userEvt.click(screen.getByRole('tab', { name: /pdf/i }));
    await userEvt.click(screen.getByRole('link', { name: /open bulk logging/i }));
    expect(await screen.findByText('Bulk logging screen')).toBeInTheDocument();
  });
});
