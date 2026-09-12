import { describe, expect, it } from 'vitest';
import { AppError } from '../src/errors/app-error.js';
import { assertOwnedByUser, ownedBy, resolveOwnerId } from '../src/ownership/ownership.js';

describe('ownership helpers', () => {
  it('resolveOwnerId always returns the authenticated user id', () => {
    expect(resolveOwnerId('auth-user', 'attacker-user')).toBe('auth-user');
    expect(resolveOwnerId('auth-user', undefined)).toBe('auth-user');
  });

  it('ownedBy scopes queries to the authenticated user', () => {
    expect(ownedBy('auth-user')).toEqual({ userId: 'auth-user' });
  });

  it('assertOwnedByUser rejects resources owned by another user', () => {
    expect(() =>
      assertOwnedByUser({ id: '1', userId: 'other-user' }, 'auth-user'),
    ).toThrow(AppError);

    try {
      assertOwnedByUser({ id: '1', userId: 'other-user' }, 'auth-user');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).statusCode).toBe(404);
      expect((error as AppError).code).toBe('NOT_FOUND');
    }
  });

  it('assertOwnedByUser returns the resource when ownership matches', () => {
    const resource = { id: '1', userId: 'auth-user' };
    expect(assertOwnedByUser(resource, 'auth-user')).toBe(resource);
  });
});
