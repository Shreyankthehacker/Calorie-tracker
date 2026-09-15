/**
 * Shared HTTP client. Authenticated calls send the access JWT and refresh once on 401.
 * The UI never talks to Gemini or the database directly.
 */
import { ApiError, type ApiErrorBody } from './types';
import { tokenStorage } from './tokenStorage';
import { API_BASE_URL } from './base-url';

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  retryOnUnauthorized?: boolean;
};

let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) {
    return false;
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    tokenStorage.clear();
    return false;
  }

  const data = (await response.json()) as { accessToken: string; refreshToken: string };
  tokenStorage.setTokens(data.accessToken, data.refreshToken);
  return true;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  if (options.body !== undefined && !isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.auth !== false) {
    const accessToken = tokenStorage.getAccessToken();
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    ...(options.body !== undefined
      ? { body: isFormData ? (options.body as FormData) : JSON.stringify(options.body) }
      : {}),
  });

  if (
    response.status === 401 &&
    options.auth !== false &&
    options.retryOnUnauthorized !== false
  ) {
    refreshInFlight ??= refreshAccessToken().finally(() => {
      refreshInFlight = null;
    });
    const refreshed = await refreshInFlight;
    if (refreshed) {
      return apiRequest<T>(path, { ...options, retryOnUnauthorized: false });
    }
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await readJsonBody(response);

  if (!response.ok) {
    const errorBody = payload as ApiErrorBody | null;
    throw new ApiError(
      response.status,
      errorBody?.error.code ?? 'INTERNAL_SERVER_ERROR',
      errorBody?.error.message ?? 'Request failed',
      errorBody?.error.details,
    );
  }

  return payload as T;
}

async function readJsonBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    if (!response.ok) {
      throw new ApiError(response.status, 'INTERNAL_SERVER_ERROR', 'Request failed');
    }
    throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'The server returned an invalid response.');
  }
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}
