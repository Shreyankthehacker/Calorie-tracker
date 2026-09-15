import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { confirmChatMeal, sendChat } from '../api/chat';
import { getGoal } from '../api/goals';
import { getTodayReport } from '../api/reports';
import { ApiError, type PendingMeal } from '../api/types';
import { Alert } from '../components/layout/AppShell';
import { isPlausibleDailyCalorieTarget } from '../lib/goal-sanity';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  pendingMeal?: PendingMeal;
  viewLog?: boolean;
};

const suggestions = [
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
  onSave,
  onCancel,
}: {
  meal: PendingMeal;
  busy: boolean;
  saving: boolean;
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
      <div className="action-row">
        <button
          type="button"
          className="button button-primary"
          disabled={busy}
          onClick={() => onSave(meal)}
        >
          {saving ? 'Saving…' : 'Save meal'}
        </button>
        <button
          type="button"
          className="button button-secondary"
          disabled={busy}
          onClick={() => onCancel(meal)}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function ChatPage() {
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

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    send(input);
  }

  function handleCancel(meal: PendingMeal) {
    setMessages((current) =>
      current.map((item) => (item.pendingMeal === meal ? withoutPendingMeal(item) : item)),
    );
  }

  const busy = chatMutation.isPending || saveMutation.isPending;

  return (
    <div className="page-chat">
      <div className="main-inner">
        <div className="top-row">
          <div className="kicker">Sage assistant</div>
          <h1 className="sr-only">Assistant</h1>
          <h1 className="page-title">Chat with Sage</h1>
        </div>

        <div className="chat-shell">
          <div className="chat-panel">
            <div className="chat-log" aria-live="polite">
              {messages.length === 0 ? (
                <div className="msg sage">
                  <span className="tag">🐾 Sage</span>
                  No messages yet. Try a question to get started.
                </div>
              ) : (
                messages.map((item) => (
                  <div
                    key={item.id}
                    className={`chat-turn ${item.role === 'user' ? 'is-user' : 'is-sage'}`}
                  >
                    <div className={`msg ${item.role === 'user' ? 'user' : 'sage'}`}>
                      <span className="tag">{item.role === 'user' ? 'You' : '🐾 Sage'}</span>
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
                        busy={busy}
                        saving={saveMutation.isPending}
                        onSave={(meal) => saveMutation.mutate(meal)}
                        onCancel={handleCancel}
                      />
                    ) : null}
                  </div>
                ))
              )}
              {chatMutation.isPending ? (
                <div className="msg sage" role="status">
                  <span className="tag">🐾 Sage</span>
                  Thinking…
                </div>
              ) : null}
            </div>
            {error ? <Alert tone="error">{error}</Alert> : null}
            <form className="chat-input-row" onSubmit={handleSubmit}>
              <label className="sr-only" htmlFor="chat-message">
                Message
              </label>
              <input
                id="chat-message"
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                maxLength={4000}
                placeholder="Ask Sage about meals, swaps, or your numbers…"
                disabled={busy}
              />
              <button type="submit" className="btn-primary" disabled={busy || input.trim() === ''}>
                {chatMutation.isPending ? 'Sending…' : 'Send'}
              </button>
            </form>
          </div>

          <div>
            <div className="side-card">
              <div className="who">💬 Try asking</div>
              {extraChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className="suggest-chip"
                  disabled={busy}
                  onClick={() => send(chip)}
                >
                  {chip}
                </button>
              ))}
              {messages.length === 0
                ? suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="suggest-chip"
                      disabled={busy}
                      onClick={() => send(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))
                : null}
            </div>
            <div className="side-card">
              <div className="who">🐾 About Sage</div>
              <p>
                Sage reads logged meals, goals, and entries you actually saved. If there is not enough history for a
                trend, it should say so rather than invent one.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
