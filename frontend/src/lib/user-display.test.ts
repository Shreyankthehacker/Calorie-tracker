import { describe, expect, it } from 'vitest';
import { displayNameFromEmail, initialsFromEmail } from './user-display';

describe('displayNameFromEmail', () => {
  it('uses the local part of an email', () => {
    expect(displayNameFromEmail('ada.lovelace@example.com')).toBe('ada.lovelace');
  });
});

describe('initialsFromEmail', () => {
  it('takes two letters from dotted names', () => {
    expect(initialsFromEmail('ada.lovelace@example.com')).toBe('AL');
  });

  it('falls back to the first two characters', () => {
    expect(initialsFromEmail('ada@example.com')).toBe('AD');
  });
});
