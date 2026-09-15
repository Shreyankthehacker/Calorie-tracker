/**
 * Shared submit helper: prevent default, surface API errors, and reset pending state.
 */
import { useState, type FormEvent } from 'react';
import { toUserMessage } from '../api/errors';

export function useFormSubmit(onSubmit: () => Promise<void>): {
  submitting: boolean;
  error: string | null;
  handleSubmit: (event: FormEvent) => void;
  setError: (value: string | null) => void;
} {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    void onSubmit()
      .catch((err: unknown) => {
        setError(toUserMessage(err, 'Something went wrong. Please try again.'));
      })
      .finally(() => setSubmitting(false));
  }

  return { submitting, error, handleSubmit, setError };
}
