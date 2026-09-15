import { describe, expect, it } from 'vitest';
import { firstApiErrorMessage, toUserMessage } from './errors';
import { ApiError } from './types';

describe('toUserMessage', () => {
  it('prefers an API error message', () => {
    expect(toUserMessage(new ApiError(400, 'VALIDATION_ERROR', 'Invalid request'), 'Fallback')).toBe(
      'Invalid request',
    );
  });

  it('uses the fallback for unknown values', () => {
    expect(toUserMessage(null, 'Could not save meal.')).toBe('Could not save meal.');
  });
});

describe('firstApiErrorMessage', () => {
  it('returns the first API error in the list', () => {
    expect(
      firstApiErrorMessage(undefined, new Error('nope'), new ApiError(409, 'CONFLICT', 'Already joined')),
    ).toBe('Already joined');
  });
});
