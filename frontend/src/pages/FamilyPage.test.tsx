import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FamilyPage } from './FamilyPage';
import { renderWithProviders } from '../test/render';
import * as familyApi from '../api/family';
import * as authApi from '../api/auth';
import { tokenStorage } from '../api/tokenStorage';

vi.mock('../api/family');
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
  familyId: 'fam-abc-123',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const family = {
  id: 'fam-abc-123',
  name: 'Household',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  members: [
    {
      id: 'u1',
      email: 'ada@example.com',
      timezone: 'UTC',
      createdAt: new Date().toISOString(),
      isCurrentUser: true,
      todayCalories: 400,
    },
  ],
};

describe('FamilyPage', () => {
  beforeEach(() => {
    tokenStorage.setTokens('access', 'refresh');
    vi.clearAllMocks();
    vi.mocked(authApi.getCurrentUser).mockResolvedValue(user);
    vi.mocked(familyApi.getFamily).mockResolvedValue(family);
  });

  it('opens a share window with the family ID copied to the clipboard', async () => {
    const userEvt = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    renderWithProviders(<FamilyPage />, { route: '/family' });

    await userEvt.click(await screen.findByRole('button', { name: /share family id/i }));

    const dialog = await screen.findByRole('dialog', { name: /share family id/i });
    expect(dialog).toHaveTextContent('fam-abc-123');
    expect(within(dialog).getByRole('status')).toHaveTextContent(/copied to clipboard/i);
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('fam-abc-123');
    });
  });

  it('copies again from the share window', async () => {
    const userEvt = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    renderWithProviders(<FamilyPage />, { route: '/family' });

    await userEvt.click(await screen.findByRole('button', { name: /invite family member/i }));
    await screen.findByRole('dialog', { name: /share family id/i });
    writeText.mockClear();

    await userEvt.click(screen.getByRole('button', { name: /copy id/i }));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('fam-abc-123');
    });
  });
});
