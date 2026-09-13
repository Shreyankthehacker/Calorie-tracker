import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { LoginPage } from '../pages/AuthPages';
import { ProtectedRoute } from '../routes/guards';
import { AppShell } from '../components/layout/AppShell';
import { renderWithProviders } from '../test/render';
import * as authApi from '../api/auth';
import { ApiError } from '../api/types';
import { tokenStorage } from '../api/tokenStorage';

vi.mock('../api/auth', async () => {
  const actual = await vi.importActual<typeof import('../api/auth')>('../api/auth');
  return {
    ...actual,
    login: vi.fn(),
    getCurrentUser: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
  };
});

describe('authentication UI', () => {
  beforeEach(() => {
    tokenStorage.clear();
    vi.clearAllMocks();
  });

  it('shows validation feedback on empty login submit', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />, { route: '/login' });

    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/email and password/i);
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it('submits login credentials', async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.login).mockResolvedValue({
      user: {
        id: 'u1',
        email: 'ada@example.com',
        timezone: 'UTC',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      accessToken: 'access',
      refreshToken: 'refresh',
    });

    renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<p>Dashboard ready</p>} />
      </Routes>,
      { route: '/login' },
    );

    await user.type(screen.getByLabelText(/email/i), 'ada@example.com');
    await user.type(screen.getByLabelText(/password/i), 'secure-pass-123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        email: 'ada@example.com',
        password: 'secure-pass-123',
      });
    });
  });

  it('redirects unauthenticated users away from protected routes', async () => {
    renderWithProviders(
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<p>Secret dashboard</p>} />
        </Route>
        <Route path="/login" element={<p>Login screen</p>} />
      </Routes>,
      { route: '/dashboard' },
    );

    expect(await screen.findByText('Login screen')).toBeInTheDocument();
    expect(screen.queryByText('Secret dashboard')).not.toBeInTheDocument();
  });

  it('shows an API error when login fails', async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.login).mockRejectedValue(
      new ApiError(401, 'UNAUTHORIZED', 'Invalid email or password'),
    );

    renderWithProviders(<LoginPage />, { route: '/login' });
    await user.type(screen.getByLabelText(/email/i), 'ada@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid email or password/i);
  });

  it('leaves protected pages after logout', async () => {
    const userEvt = userEvent.setup();
    tokenStorage.setTokens('access', 'refresh');
    vi.mocked(authApi.getCurrentUser).mockResolvedValue({
      id: 'u1',
      email: 'ada@example.com',
      timezone: 'UTC',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    vi.mocked(authApi.logout).mockImplementation(async () => {
      tokenStorage.clear();
    });

    renderWithProviders(
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<p>Secret dashboard</p>} />
          </Route>
        </Route>
        <Route path="/login" element={<p>Login screen</p>} />
      </Routes>,
      { route: '/dashboard' },
    );

    expect(await screen.findByText('Secret dashboard')).toBeInTheDocument();
    await userEvt.click(screen.getByRole('button', { name: /log out/i }));
    expect(await screen.findByText('Login screen')).toBeInTheDocument();
    expect(screen.queryByText('Secret dashboard')).not.toBeInTheDocument();
  });
});
