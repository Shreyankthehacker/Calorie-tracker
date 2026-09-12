import { apiRequest } from './client';
import { tokenStorage } from './tokenStorage';
import type { AuthResponse, PublicUser } from './types';

export async function register(input: {
  email: string;
  password: string;
  timezone?: string;
}): Promise<AuthResponse> {
  const result = await apiRequest<AuthResponse>('/api/v1/auth/register', {
    method: 'POST',
    body: input,
    auth: false,
  });
  tokenStorage.setTokens(result.accessToken, result.refreshToken);
  return result;
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const result = await apiRequest<AuthResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: input,
    auth: false,
  });
  tokenStorage.setTokens(result.accessToken, result.refreshToken);
  return result;
}

export async function logout(): Promise<void> {
  const refreshToken = tokenStorage.getRefreshToken();
  try {
    if (refreshToken) {
      await apiRequest<void>('/api/v1/auth/logout', {
        method: 'POST',
        body: { refreshToken },
        auth: false,
        retryOnUnauthorized: false,
      });
    }
  } finally {
    tokenStorage.clear();
  }
}

export async function getCurrentUser(): Promise<PublicUser> {
  const result = await apiRequest<{ user: PublicUser }>('/api/v1/auth/me');
  return result.user;
}
