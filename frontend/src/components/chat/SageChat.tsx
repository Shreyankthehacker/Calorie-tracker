import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { confirmChatMeal, sendChat } from '../../api/chat';
import { getGoal } from '../../api/goals';
import { getTodayReport } from '../../api/reports';
import { ApiError, type PendingMeal } from '../../api/types';
import { isPlausibleDailyCalorieTarget } from '../../lib/goal-sanity';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  pendingMeal?: PendingMeal;
  viewLog?: boolean;
};

export const chatSuggestions = [
  'How many calories have I eaten today?',
  'What did I eat this week?',
  'What are my nutrition goals?',
  'How did I do this week?',
  'Log mutton biryani for lunch',
];

function newId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function mealSummary(meal: PendingMeal): string {
  return [
    meal.foodName,
    meal.mealType.charAt(0) + meal.mealType.slice(1).toLowerCase(),
    `${meal.quantity} ${meal.quantityUnit}`,
    `~${meal.calories} kcal`,
    `Protein: ${meal.protein}g`,
    `Carbs: ${meal.carbs}g`,
    `Fat: ${meal.fat}g`,
  ].join(', ');
}

function withoutPendingMeal(item: ChatMessage): ChatMessage {
  return {
    id: item.id,
    role: item.role,
    content: item.content,
  };
}

function PendingMealActions({
  meal,
  busy,
  saving,
  error,
  onSave,
  onCancel,
}: {
  meal: PendingMeal;
  busy: boolean;
  saving: boolean;
  error: string | null;
  onSave: (meal: PendingMeal) => void;
  onCancel: (meal: PendingMeal) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cardRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, []);

  return (
    <div className="pending-meal" ref={cardRef}>
      <p className="pending-meal-kicker">Not saved yet</p>
      <p className="pending-meal-title">{meal.foodName}</p>
      <p className="muted small">{mealSummary(meal)}</p>
      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}
      <div className="action-row">
        <button
          type="button"
          className="button button-primary pending-meal-save"
          disabled={busy}
          onClick={() => onSave(meal)}
        >
          {saving ? 'Saving…' : 'Save meal'}
        </button>
        <button type="button" className="button button-secondary" disabled={busy} onClick={() => onCancel(meal)}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export function useSageChat() {
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const todayQuery = useQuery({ queryKey: ['reports', 'today'], queryFn: getTodayReport });
  const goalQuery = useQuery({ queryKey: ['goals', 'current'], queryFn: getGoal, retry: false });

  const extraChips = useMemo(() => {
    const chips: string[] = [];
    const totals = todayQuery.data;
    const goal = goalQuery.data;
    if (!todayQuery.isSuccess) {
      return chips;
    }
    if (!totals || totals.calories === 0) {
      chips.push('What should I eat first today?');
    }
    if (goal && isPlausibleDailyCalorieTarget(goal.dailyCalorieTarget) && totals && totals.protein < goal.proteinTarget * 0.5) {
      chips.push('Am I low on protein today?');
    }
    if (goal && isPlausibleDailyCalorieTarget(goal.dailyCalorieTarget) && totals && totals.calories > goal.dailyCalorieTarget) {
      chips.push('Did I go over my calorie target today?');
    }
    return chips.slice(0, 3);
  }, [goalQuery.data, todayQuery.data, todayQuery.isSuccess]);

  const history = useMemo(
    () => messages.map((item) => ({ role: item.role, content: item.content })),
    [messages],
  );

  const chatMutation = useMutation({
    mutationFn: sendChat,
    onSuccess: (result) => {
      setError(null);
      const assistant: ChatMessage = {
        id: newId(),
        role: 'assistant',
        content: result.message,
        ...(result.pendingMeal ? { pendingMeal: result.pendingMeal } : {}),
      };
      setMessages((current) => [...current, assistant]);
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Unable to reach the assistant. Please try again.');
    },
  });

  const saveMutation = useMutation({
    mutationFn: confirmChatMeal,
    onSuccess: async (result, meal) => {
      setError(null);
      setMessages((current) => [
        ...current.map((item) => (item.pendingMeal === meal ? withoutPendingMeal(item) : item)),
        { id: newId(), role: 'assistant', content: result.message, viewLog: true },
      ]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['food-entries'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['reports'], refetchType: 'all' }),
      ]);
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Could not save meal.');
    },
  });

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || chatMutation.isPending || saveMutation.isPending) {
      return;
    }
    saveMutation.reset();
    const priorHistory = history;
    const userMessage: ChatMessage = { id: newId(), role: 'user', content: trimmed };
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setError(null);
    chatMutation.mutate({
      message: trimmed,
      ...(priorHistory.length > 0 ? { history: priorHistory } : {}),
    });
  }

  function handleCancel(meal: PendingMeal) {
    saveMutation.reset();
    setError(null);
    setMessages((current) =>
      current.map((item) => (item.pendingMeal === meal ? withoutPendingMeal(item) : item)),
    );
  }

  const busy = chatMutation.isPending || saveMutation.isPending;

  return {
    input,
    setInput,
    messages,
    extraChips,
    error,
    busy,
    chatPending: chatMutation.isPending,
    savePending: saveMutation.isPending,
    saveError: saveMutation.isError,
    send,
    handleCancel,
    saveMeal: (meal: PendingMeal) => {
      setError(null);
      saveMutation.mutate(meal);
    },
  };
}

export function ChatPanel({
  inputId,
  compact = false,
  chat,
}: {
  inputId: string;
  compact?: boolean;
  chat: ReturnType<typeof useSageChat>;
}) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    chat.send(chat.input);
  }

  return (
    <div className={`chat-panel${compact ? ' is-compact' : ''}`}>
      <div className="chat-log" aria-live="polite">
        {chat.messages.length === 0 ? (
          <div className="msg sage">
            <span className="tag">Sage</span>
            No messages yet. Try a question to get started.
            {compact ? (
              <div className="sage-dock-chips">
                {chatSuggestions.slice(0, 3).map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="suggest-chip"
                    disabled={chat.busy}
                    onClick={() => chat.send(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          chat.messages.map((item) => (
            <div key={item.id} className={`chat-turn ${item.role === 'user' ? 'is-user' : 'is-sage'}`}>
              <div className={`msg ${item.role === 'user' ? 'user' : 'sage'}`}>
                <span className="tag">{item.role === 'user' ? 'You' : 'Sage'}</span>
                {item.content}
                {item.viewLog ? (
                  <p className="chat-followup">
                    <Link to="/meals">View it in your log</Link>
                  </p>
                ) : null}
              </div>
              {item.pendingMeal ? (
                <PendingMealActions
                  meal={item.pendingMeal}
                  busy={chat.busy}
                  saving={chat.savePending}
                  error={chat.saveError ? chat.error : null}
                  onSave={chat.saveMeal}
                  onCancel={chat.handleCancel}
                />
              ) : null}
            </div>
          ))
        )}
        {chat.chatPending ? (
          <div className="msg sage" role="status">
            <span className="tag">Sage</span>
            Thinking…
          </div>
        ) : null}
      </div>
      {chat.error && !chat.saveError ? (
        <p className="error-text" role="alert">
          {chat.error}
        </p>
      ) : null}
      <form className="chat-input-row" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor={inputId}>
          Message
        </label>
        <input
          id={inputId}
          type="text"
          value={chat.input}
          onChange={(event) => chat.setInput(event.target.value)}
          maxLength={4000}
          placeholder="Ask Sage about meals, swaps, or your numbers…"
          disabled={chat.busy}
        />
        <button type="submit" className="btn-primary" disabled={chat.busy || chat.input.trim() === ''}>
          {chat.chatPending ? 'Sending…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
