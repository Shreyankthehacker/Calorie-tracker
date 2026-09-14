import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GoalsPage } from './GoalsPage';
import { renderWithProviders } from '../test/render';
import { ApiError } from '../api/types';
import * as goalsApi from '../api/goals';
import * as authApi from '../api/auth';
import { tokenStorage } from '../api/tokenStorage';

vi.mock('../api/goals');
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
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('GoalsPage', () => {
  beforeEach(() => {
    tokenStorage.setTokens('access', 'refresh');
    vi.clearAllMocks();
    vi.mocked(authApi.getCurrentUser).mockResolvedValue(user);
  });

  it('shows empty state when no goal exists', async () => {
    vi.mocked(goalsApi.getGoal).mockRejectedValue(
      new ApiError(404, 'NOT_FOUND', 'Resource not found'),
    );

    renderWithProviders(<GoalsPage />, { route: '/goals' });

    expect(await screen.findByText(/no nutrition goal set yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /set your goal/i })).toBeInTheDocument();
  });

  it('shows a loading state', () => {
    vi.mocked(goalsApi.getGoal).mockImplementation(() => new Promise(() => undefined));
    renderWithProviders(<GoalsPage />, { route: '/goals' });
    expect(screen.getByText(/loading goals/i)).toBeInTheDocument();
    expect(screen.queryByText(/no nutrition goal set yet/i)).not.toBeInTheDocument();
  });

  it('shows an API error when the goal cannot be loaded', async () => {
    vi.mocked(goalsApi.getGoal).mockRejectedValue(
      new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Request failed'),
    );

    renderWithProviders(<GoalsPage />, { route: '/goals' });
    expect(await screen.findByText(/unable to load your goal/i)).toBeInTheDocument();
    expect(screen.queryByText(/no nutrition goal set yet/i)).not.toBeInTheDocument();
  });

  it('loads and displays an existing goal', async () => {
    vi.mocked(goalsApi.getGoal).mockResolvedValue({
      id: 'g1',
      dailyCalorieTarget: 2200,
      proteinTarget: 140,
      carbTarget: 220,
      fatTarget: 70,
      weightGoal: 75,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    renderWithProviders(<GoalsPage />, { route: '/goals' });

    expect(await screen.findByText('2200')).toBeInTheDocument();
    expect(screen.getByText('140')).toBeInTheDocument();
  });

  it('submits goal creation from empty state', async () => {
    const userEvt = userEvent.setup();
    vi.mocked(goalsApi.getGoal).mockRejectedValue(
      new ApiError(404, 'NOT_FOUND', 'Resource not found'),
    );
    vi.mocked(goalsApi.createGoal).mockResolvedValue({
      id: 'g1',
      dailyCalorieTarget: 2000,
      proteinTarget: 120,
      carbTarget: 200,
      fatTarget: 60,
      weightGoal: 70,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    renderWithProviders(<GoalsPage />, { route: '/goals' });
    await userEvt.click(await screen.findByRole('button', { name: /set your goal/i }));

    await userEvt.type(screen.getByLabelText(/daily calories/i), '2000');
    await userEvt.type(screen.getByLabelText(/daily protein/i), '120');
    await userEvt.type(screen.getByLabelText(/daily carbohydrates/i), '200');
    await userEvt.type(screen.getByLabelText(/daily fat/i), '60');
    await userEvt.click(screen.getByRole('button', { name: /save goals/i }));

    await waitFor(() => {
      expect(goalsApi.createGoal).toHaveBeenCalledWith({
        dailyCalorieTarget: 2000,
        proteinTarget: 120,
        carbTarget: 200,
        fatTarget: 60,
        weightGoal: null,
      });
    });
  });

  it('shows API validation/error feedback on failed save', async () => {
    const userEvt = userEvent.setup();
    vi.mocked(goalsApi.getGoal).mockRejectedValue(
      new ApiError(404, 'NOT_FOUND', 'Resource not found'),
    );
    vi.mocked(goalsApi.createGoal).mockRejectedValue(
      new ApiError(400, 'VALIDATION_ERROR', 'Invalid request'),
    );

    renderWithProviders(<GoalsPage />, { route: '/goals' });
    await userEvt.click(await screen.findByRole('button', { name: /set your goal/i }));
    await userEvt.type(screen.getByLabelText(/daily calories/i), '2000');
    await userEvt.type(screen.getByLabelText(/daily protein/i), '120');
    await userEvt.type(screen.getByLabelText(/daily carbohydrates/i), '200');
    await userEvt.type(screen.getByLabelText(/daily fat/i), '60');
    await userEvt.click(screen.getByRole('button', { name: /save goals/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid request/i);
  });
});
