import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPage } from './ChatPage';
import { renderWithProviders } from '../test/render';
import { ApiError, type FoodEntry, type PendingMeal } from '../api/types';
import * as chatApi from '../api/chat';
import * as authApi from '../api/auth';
import { tokenStorage } from '../api/tokenStorage';

vi.mock('../api/chat');
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

const pendingMeal: PendingMeal = {
  mealType: 'BREAKFAST',
  foodName: '2 eggs',
  quantity: 2,
  quantityUnit: 'eggs',
  calories: 144,
  protein: 12.6,
  carbs: 0.8,
  fat: 9.6,
  consumedAt: '2026-09-13T08:00:00.000Z',
  micronutrients: [],
};

const savedEntry: FoodEntry = {
  id: 'e-chat-1',
  mealType: pendingMeal.mealType,
  foodName: pendingMeal.foodName,
  quantity: pendingMeal.quantity,
  quantityUnit: pendingMeal.quantityUnit,
  calories: pendingMeal.calories,
  protein: pendingMeal.protein,
  carbs: pendingMeal.carbs,
  fat: pendingMeal.fat,
  consumedAt: pendingMeal.consumedAt,
  createdAt: '2026-09-13T08:01:00.000Z',
  updatedAt: '2026-09-13T08:01:00.000Z',
  micronutrients: [],
};

describe('ChatPage', () => {
  beforeEach(() => {
    tokenStorage.setTokens('access', 'refresh');
    vi.clearAllMocks();
    vi.mocked(authApi.getCurrentUser).mockResolvedValue(user);
  });

  it('shows an empty state with suggestions', async () => {
    renderWithProviders(<ChatPage />, { route: '/chat' });
    expect(await screen.findByRole('heading', { name: 'Assistant' })).toBeInTheDocument();
    expect(screen.getByText(/no messages yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /how many calories have i eaten today/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /what did i eat this week/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /what are my nutrition goals/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /how did i do this week/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log mutton biryani for lunch/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  it('sends a message and shows the assistant response', async () => {
    const userEvt = userEvent.setup();
    vi.mocked(chatApi.sendChat).mockResolvedValue({
      message: "You've consumed 1033 kcal today.",
      pendingMeal: null,
    });
    renderWithProviders(<ChatPage />, { route: '/chat' });
    await userEvt.type(await screen.findByLabelText('Message'), 'How many calories have I eaten today?');
    await userEvt.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText("You've consumed 1033 kcal today.")).toBeInTheDocument();
    expect(screen.getByText('How many calories have I eaten today?')).toBeInTheDocument();
    expect(chatApi.sendChat).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'How many calories have I eaten today?',
      }),
      expect.anything(),
    );
  });

  it('shows a loading state and disables send while the request is pending', async () => {
    const userEvt = userEvent.setup();
    vi.mocked(chatApi.sendChat).mockImplementation(() => new Promise(() => undefined));
    renderWithProviders(<ChatPage />, { route: '/chat' });
    await userEvt.type(await screen.findByLabelText('Message'), 'What are my nutrition goals?');
    await userEvt.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByRole('status')).toHaveTextContent(/thinking/i);
    expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled();
    expect(screen.getByLabelText('Message')).toBeDisabled();
  });

  it('shows an API error', async () => {
    const userEvt = userEvent.setup();
    vi.mocked(chatApi.sendChat).mockRejectedValue(
      new ApiError(502, 'AI_PROVIDER_ERROR', 'AI provider failed'),
    );
    renderWithProviders(<ChatPage />, { route: '/chat' });
    await userEvt.type(await screen.findByLabelText('Message'), 'Hello');
    await userEvt.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('AI provider failed');
    expect(chatApi.confirmChatMeal).not.toHaveBeenCalled();
  });

  it('shows meal confirmation actions when a pending meal is returned', async () => {
    const userEvt = userEvent.setup();
    vi.mocked(chatApi.sendChat).mockResolvedValue({
      message: 'I can log 2 eggs for breakfast, approximately 144 kcal.',
      pendingMeal,
    });
    renderWithProviders(<ChatPage />, { route: '/chat' });
    await userEvt.click(await screen.findByRole('button', { name: /log mutton biryani for lunch/i }));
    expect(await screen.findByRole('button', { name: 'Save meal' })).toBeInTheDocument();
    expect(screen.getByText(/~144 kcal/i)).toBeInTheDocument();
    expect(screen.getByText(/protein: 12\.6g/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save meal' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(chatApi.confirmChatMeal).not.toHaveBeenCalled();
  });

  it('saves a pending meal only after explicit confirmation', async () => {
    const userEvt = userEvent.setup();
    vi.mocked(chatApi.sendChat).mockResolvedValue({
      message: 'I can log 2 eggs for breakfast. Save this meal?',
      pendingMeal,
    });
    vi.mocked(chatApi.confirmChatMeal).mockResolvedValue({
      message: 'Saved 2 eggs to breakfast.',
      foodEntry: savedEntry,
    });
    renderWithProviders(<ChatPage />, { route: '/chat' });
    await userEvt.click(await screen.findByRole('button', { name: /log mutton biryani for lunch/i }));
    await userEvt.click(await screen.findByRole('button', { name: 'Save meal' }));
    await waitFor(() => {
      expect(chatApi.confirmChatMeal).toHaveBeenCalledWith(pendingMeal, expect.anything());
    });
    expect(await screen.findByText('Saved 2 eggs to breakfast.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view it in your log/i })).toHaveAttribute('href', '/meals');
    expect(screen.queryByRole('button', { name: 'Save meal' })).not.toBeInTheDocument();
  });

  it('cancels a pending meal without calling confirm', async () => {
    const userEvt = userEvent.setup();
    vi.mocked(chatApi.sendChat).mockResolvedValue({
      message: 'I can log 2 eggs for breakfast. Save this meal?',
      pendingMeal,
    });
    renderWithProviders(<ChatPage />, { route: '/chat' });
    await userEvt.click(await screen.findByRole('button', { name: /log mutton biryani for lunch/i }));
    await userEvt.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(chatApi.confirmChatMeal).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Save meal' })).not.toBeInTheDocument();
    expect(screen.getByText('I can log 2 eggs for breakfast. Save this meal?')).toBeInTheDocument();
  });
});
