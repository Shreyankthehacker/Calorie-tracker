const DEFAULT_API_BASE_URL = 'http://localhost:3001';

/** Backend origin only. Paths like `/api/v1/auth/login` are appended by callers. */
export function resolveApiBaseUrl(raw: string | undefined): string {
  const trimmed = raw?.trim() ?? '';
  if (!trimmed) {
    return DEFAULT_API_BASE_URL;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withProtocol.replace(/\/+$/, '');
}

export const API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
