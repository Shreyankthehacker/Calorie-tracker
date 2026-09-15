import { describe, expect, it } from 'vitest';
import { tokenStorage } from './tokenStorage';

describe('tokenStorage', () => {
  it('keeps the session in localStorage so other tabs can read it', () => {
    tokenStorage.setTokens('access-1', 'refresh-1');
    expect(localStorage.getItem('ct_access_token')).toBe('access-1');
    expect(localStorage.getItem('ct_refresh_token')).toBe('refresh-1');
    expect(sessionStorage.getItem('ct_access_token')).toBeNull();
    expect(tokenStorage.hasSession()).toBe(true);
  });

  it('promotes a leftover tab-only session into localStorage', () => {
    sessionStorage.setItem('ct_access_token', 'old-access');
    sessionStorage.setItem('ct_refresh_token', 'old-refresh');
    expect(tokenStorage.getAccessToken()).toBe('old-access');
    expect(localStorage.getItem('ct_access_token')).toBe('old-access');
    expect(sessionStorage.getItem('ct_access_token')).toBeNull();
  });
});
