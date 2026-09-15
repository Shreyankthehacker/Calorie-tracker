import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test/render';
import { useAuth } from './AuthProvider';
import { tokenStorage } from '../api/tokenStorage';
import * as authApi from '../api/auth';

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

function SessionProbe() {
  const { isAuthenticated, user, isLoading } = useAuth();
  if (isLoading) {
    return <p>Loading session</p>;
  }
  return <p>{isAuthenticated ? `Signed in as ${user?.email}` : 'Guest'}</p>;
}

describe('AuthProvider session sharing', () => {
  beforeEach(() => {
    tokenStorage.clear();
    vi.clearAllMocks();
  });

  it('picks up tokens written by another tab', async () => {
    vi.mocked(authApi.getCurrentUser).mockResolvedValue({
      id: 'u1',
      email: 'ada@example.com',
      timezone: 'UTC',
      familyId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    renderWithProviders(<SessionProbe />, { route: '/' });
    expect(await screen.findByText('Guest')).toBeInTheDocument();

    tokenStorage.setTokens('access', 'refresh');
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'ct_access_token', newValue: 'access' }),
    );

    await waitFor(() => {
      expect(screen.getByText('Signed in as ada@example.com')).toBeInTheDocument();
    });
  });
});
