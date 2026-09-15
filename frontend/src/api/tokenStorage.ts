const ACCESS_KEY = 'ct_access_token';
const REFRESH_KEY = 'ct_refresh_token';

function read(key: string): string | null {
  const fromLocal = localStorage.getItem(key);
  if (fromLocal) {
    return fromLocal;
  }
  const fromSession = sessionStorage.getItem(key);
  if (fromSession) {
    localStorage.setItem(key, fromSession);
    sessionStorage.removeItem(key);
    return fromSession;
  }
  return null;
}

export const tokenStorage = {
  getAccessToken(): string | null {
    return read(ACCESS_KEY);
  },
  getRefreshToken(): string | null {
    return read(REFRESH_KEY);
  },
  hasSession(): boolean {
    return Boolean(read(ACCESS_KEY) || read(REFRESH_KEY));
  },
  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
  },
  clear(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
  },
  isAuthKey(key: string | null): boolean {
    return key === null || key === ACCESS_KEY || key === REFRESH_KEY;
  },
};
