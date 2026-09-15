import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BmiPage } from './BmiPage';
import { renderWithProviders } from '../test/render';
import * as authApi from '../api/auth';
import { tokenStorage } from '../api/tokenStorage';

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

describe('BmiPage', () => {
  beforeEach(() => {
    tokenStorage.setTokens('access', 'refresh');
    vi.clearAllMocks();
    vi.mocked(authApi.getCurrentUser).mockResolvedValue(user);
  });

  it('calculates BMI from the default metric inputs', async () => {
    renderWithProviders(<BmiPage />, { route: '/bmi' });
    expect(await screen.findByRole('heading', { name: /bmi info centre/i })).toBeInTheDocument();
    expect(screen.getByText('23.0')).toBeInTheDocument();
    expect(screen.getAllByText('Normal weight').length).toBeGreaterThan(0);
  });

  it('recalculates when weight changes', async () => {
    const userEvt = userEvent.setup();
    renderWithProviders(<BmiPage />, { route: '/bmi' });
    const weight = await screen.findByLabelText(/weight \(kg\)/i);
    await userEvt.clear(weight);
    await userEvt.type(weight, '100');
    expect(screen.getByText('33.8')).toBeInTheDocument();
    expect(screen.getAllByText('Obese').length).toBeGreaterThan(0);
  });

  it('switches to imperial inputs', async () => {
    const userEvt = userEvent.setup();
    renderWithProviders(<BmiPage />, { route: '/bmi' });
    await userEvt.click(await screen.findByRole('button', { name: /imperial/i }));
    expect(screen.getByLabelText(/weight \(lb\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/height inches/i)).toBeInTheDocument();
  });
});
