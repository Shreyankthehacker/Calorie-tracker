import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { confirmChatMeal, sendChat } from '../api/chat';
import { ApiError, type PendingMeal } from '../api/types';
import { Alert } from '../components/layout/AppShell';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  pendingMeal?: PendingMeal;
};

const suggestions = [
  'How many calories have I eaten today?',
  'What did I eat this week?',
  'What are my nutrition goals?',
  'How did I do this week?',
  'Log my breakfast',
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
  return (
    <div className="pending-meal">
      <p className="muted small">Save this meal?</p>
      <p>{mealSummary(meal)}</p>
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
        { id: newId(), role: 'assistant', content: result.message },
      ]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['food-entries'] }),
        queryClient.invalidateQueries({ queryKey: ['reports'] }),
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
    <section className="page chat-page">
      <header className="page-header">
        <h1>Assistant</h1>
        <p className="muted">Ask about goals, today&apos;s intake, or this week. Meals are saved only after you confirm.</p>
      </header>

      {messages.length === 0 ? (
        <div className="empty-panel">
          <p>No messages yet. Try a question to get started.</p>
          <div className="chat-suggestions">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="button button-secondary"
                disabled={busy}
                onClick={() => send(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="chat-thread" aria-live="polite">
          {messages.map((item) => (
            <article
              key={item.id}
              className={`chat-bubble ${item.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}`}
            >
              <p>{item.content}</p>
              {item.pendingMeal ? (
                <PendingMealActions
                  meal={item.pendingMeal}
                  busy={busy}
                  saving={saveMutation.isPending}
                  onSave={(meal) => saveMutation.mutate(meal)}
                  onCancel={handleCancel}
                />
              ) : null}
            </article>
          ))}
        </div>
      )}

      {chatMutation.isPending ? (
        <p className="muted" role="status">
          Thinking…
        </p>
      ) : null}
      {error ? <Alert tone="error">{error}</Alert> : null}

      <form className="chat-composer panel" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field-label">Message</span>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={3}
            maxLength={4000}
            placeholder="Ask about calories, goals, or logging a meal"
            disabled={busy}
          />
        </label>
        <button className="button button-primary" type="submit" disabled={busy || input.trim() === ''}>
          {chatMutation.isPending ? 'Sending…' : 'Send'}
        </button>
      </form>
    </section>
  );
}
